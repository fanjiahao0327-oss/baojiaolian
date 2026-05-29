const api = require("../../utils/api");

// 价格套餐从服务端获取，避免价格双写不一致
var PACKAGES = [];

Page({
  data: {
    user: null,
    phone: "",
    balance: 0,
    packages: [],
    selectedIdx: -1,
    loading: true,
    transactions: [],
    avatarText: "👤",
    displayPhone: "未绑定手机号",
    paying: false,
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    // 从服务端获取最新价格套餐
    if (PACKAGES.length === 0) {
      try {
        var pkgs = await api.get("/api/payment/packages");
        PACKAGES = pkgs.map(function (p) {
          return {
            points: p.points,
            price: (p.amountCents / 100).toFixed(2),
            amountCents: p.amountCents,
            perPoint: "≈" + (p.amountCents / 100 / p.points).toFixed(2) + "元/分",
            popular: p.popular,
          };
        });
      } catch (e) {
        // 兜底：服务端不可用时使用默认套餐
        if (PACKAGES.length === 0) {
          PACKAGES = [
            { points: 50, price: "6.90", amountCents: 690, perPoint: "≈0.14元/分" },
            { points: 150, price: "16.90", amountCents: 1690, perPoint: "≈0.11元/分" },
            { points: 400, price: "36.90", amountCents: 3690, perPoint: "≈0.09元/分" },
            { points: 800, price: "59.90", amountCents: 5990, perPoint: "≈0.07元/分" },
          ];
        }
      }
    }

    // 等待 autoLogin 完成，避免 401
    var app = getApp();
    if (!app.globalData.loginReady) {
      var self = this;
      await new Promise(function (resolve) {
        var check = setInterval(function () {
          if (getApp().globalData.loginReady) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }
    try {
      const [userRes, pointsRes] = await Promise.allSettled([
        api.get("/api/auth/me"),
        api.get("/api/points"),
      ]);

      const user = userRes.status === "fulfilled" ? userRes.value : null;
      const points = pointsRes.status === "fulfilled" ? pointsRes.value : null;

      this.setData({
        user,
        phone: (user && user.phone) || "",
        balance: (points && points.balance) || 0,
        packages: PACKAGES,
        loading: false,
        displayPhone: this.formatPhone(user && user.phone),
        avatarText: this.getAvatarText(user && user.phone),
        transactions: ((points && points.transactions) || []).slice(0, 5).map((t) => ({
          ...t,
          timeText: this.formatTime(t.created_at),
          amount: Number(t.amount),
        })),
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  formatPhone(phone) {
    if (!phone) return "未绑定手机号";
    return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  },

  getAvatarText(phone) {
    if (phone) return phone.slice(-2);
    return "👤";
  },

  formatTime(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = now - d;
      if (diff < 60000) return "刚刚";
      if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
      if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
      if (diff < 604800000) return Math.floor(diff / 86400000) + " 天前";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch { return iso || ""; }
  },

  // 手机号绑定（兼容新旧两种授权方式）
  async onGetPhoneNumber(e) {
    const { code, encryptedData, iv } = e.detail;
    if (!code && !encryptedData) {
      wx.showToast({ title: "授权已取消", icon: "none" });
      return;
    }
    wx.showLoading({ title: "绑定中" });
    try {
      const body = code ? { code } : { encryptedData, iv };
      const res = await api.post("/api/auth/bind-phone", body);
      this.setData({
        phone: res.phone,
        displayPhone: this.formatPhone(res.phone),
        avatarText: this.getAvatarText(res.phone),
      });
      const app = getApp();
      app.globalData.needBindPhone = false;
      wx.showToast({ title: "已绑定", icon: "success" });
    } catch (e) {
      wx.showToast({ title: "绑定失败，请重试", icon: "none" });
    }
    wx.hideLoading();
  },

  selectPackage(e) {
    var idx = e.currentTarget.dataset.idx;
    var pkg = PACKAGES[idx];
    this.setData({ selectedIdx: Number(idx) });
    this.startPay(pkg);
  },

  // 微信 JSAPI 支付
  async startPay(pkg) {
    if (!pkg) {
      wx.showToast({ title: "请选择套餐", icon: "none" });
      return;
    }
    var self = this;
    self.setData({ paying: true });

    try {
      var res = await api.post("/api/payment/prepay", {
        points: pkg.points,
      });

      if (!res.payParams) {
        // 微信支付未配置，走手动支付兜底
        self.setData({ paying: false });
        wx.showModal({
          title: "支付提示",
          content: res.message || "微信支付暂未开通，请通过网页端 baojiaolian.com.cn 进行充值，或联系作者。",
          showCancel: false,
        });
        return;
      }

      await wx.requestPayment({
        timeStamp: res.payParams.timeStamp,
        nonceStr: res.payParams.nonceStr,
        package: res.payParams.package,
        signType: res.payParams.signType,
        paySign: res.payParams.paySign,
      });

      // 主动向服务器确认支付
      wx.showLoading({ title: "确认支付中", mask: true });
      try {
        await api.post("/api/payment/verify", { orderNo: res.orderNo });
      } catch (e) {
        console.error("[points] verify:", e);
        try {
          await new Promise(function (r) { setTimeout(r, 2000); });
          await api.post("/api/payment/verify", { orderNo: res.orderNo });
        } catch (e2) { console.error("[points] verify retry:", e2); }
      }
      wx.hideLoading();
      wx.showToast({ title: "支付成功", icon: "success" });
      self.setData({ paying: false, selectedIdx: -1 });
      self.loadData();
    } catch (e) {
      self.setData({ paying: false });
      if (e.errMsg && e.errMsg.includes("cancel")) {
        // 用户取消支付，静默
      } else {
        console.error("[points] startPay:", e);
        wx.showToast({ title: "支付失败，请重试", icon: "none" });
      }
    }
  },
});
