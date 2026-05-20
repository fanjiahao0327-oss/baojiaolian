const api = require("../../utils/api");

const PACKAGES = [
  { points: 50, price: "6.90", amountCents: 690, perPoint: "≈0.14元/分" },
  { points: 150, price: "16.90", amountCents: 1690, perPoint: "≈0.11元/分" },
  { points: 400, price: "36.90", amountCents: 3690, perPoint: "≈0.09元/分" },
  { points: 800, price: "59.90", amountCents: 5990, perPoint: "≈0.07元/分" },
];

Page({
  data: {
    user: null,
    phone: "",
    balance: 0,
    packages: PACKAGES,
    selectedIdx: -1,
    showPayModal: false,
    selectedPkg: null,
    paying: false,
    loading: true,
    transactions: [],
    avatarText: "👤",
    displayPhone: "未绑定手机号",
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
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
    this.setData({ selectedIdx: Number(idx), selectedPkg: PACKAGES[idx] });
    this.startPay();
  },

  // 微信支付
  async startPay() {
    const { selectedPkg } = this.data;
    if (!selectedPkg) {
      wx.showToast({ title: "请选择套餐", icon: "none" });
      return;
    }
    this.setData({ paying: true });

    try {
      const res = await api.post("/api/payment/prepay", {
        points: selectedPkg.points,
      });

      const { payParams } = res;
      await wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
      });

      wx.showToast({ title: "支付成功", icon: "success" });
      this.setData({ paying: false, selectedIdx: -1 });
      this.loadData();
    } catch (e) {
    this.setData({ paying: false });
      if (e.errMsg && e.errMsg.includes("cancel")) {
        // 用户取消支付，静默
      } else {
        console.error("[points] startPay:", e);
        wx.showToast({ title: "支付失败，请重试", icon: "none" });
      }
    }
  },

  closePayModal() {
    this.setData({ showPayModal: false });
  },
});
