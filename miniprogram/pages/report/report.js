var api = require("../../utils/api");
var storage = require("../../utils/storage");

// 与对话页保持一致：只从客户主动提供的区间题里取中位数，缺失就留空
var RANGE_VALUES = {
  under30: 25, "30_60": 45, "60_100": 80, over100: 120,
  under10: 8, "10_30": 20, "30_50": 40, over50: 60,
  under50: 40, "50_100": 75, "100_300": 200, over300: 400,
  none: 0,
};

function isLocalDev() {
  var app = getApp();
  var base = (app && app.globalData && app.globalData.apiBase) || "";
  return base.indexOf("127.0.0.1") !== -1 || base.indexOf("localhost") !== -1;
}

function buildIndices(report) {
  var indices = report && report.wealthIndices ? report.wealthIndices : [];
  return indices.map(function (item) {
    return {
      name: item.name,
      level: item.level || "unknown",
      scoreText: item.score === null || item.score === undefined ? "信息不足" : item.score + " 分",
    };
  });
}

function buildBudgetText(budget) {
  if (!budget || typeof budget.min !== "number" || typeof budget.max !== "number") {
    return "信息不足";
  }
  return budget.min + "–" + budget.max + " 元/年";
}

function buildBudgetBasis(budget) {
  if (!budget || !budget.basis || budget.basis === "信息不足") return "";
  return budget.basis;
}

function readRange(answers, questionId) {
  for (var i = 0; i < answers.length; i += 1) {
    var answer = answers[i];
    if (answer && answer.questionId === questionId && !answer.skipped) {
      return Object.prototype.hasOwnProperty.call(RANGE_VALUES, answer.value)
        ? RANGE_VALUES[answer.value]
        : null;
    }
  }
  return null;
}

Page({
  data: {
    report: null,
    full: false,
    paying: false,
    orderNo: "",
    empty: false,
    indices: [],
    budgetText: "",
    budgetBasis: "",
  },
  onLoad: function () {
    var fullReport = storage.load(storage.FULL_KEY, null);
    var preview = storage.load(storage.PREVIEW_KEY, null);
    var report = fullReport || preview;
    if (!report) {
      this.setData({ empty: true });
      wx.showToast({ title: "报告数据已失效，请重新测评", icon: "none" });
      this.redirectTimer = setTimeout(function () {
        wx.navigateBack({
          fail: function () { wx.reLaunch({ url: "/pages/index/index" }); },
        });
      }, 1200);
      return;
    }
    this.setData({
      report: report,
      full: Boolean(fullReport),
      indices: buildIndices(report),
      budgetText: buildBudgetText(report.budgetRange),
      budgetBasis: buildBudgetBasis(report.budgetRange),
    });
  },
  onUnload: function () {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.stopPoll();
  },
  onPay: function () {
    var self = this;
    if (self.data.paying || self.data.full || !self.data.report) return;
    self.setData({ paying: true });
    api.checkup.createOrder({
      sessionToken: wx.getStorageSync("checkup_session"),
      mock: isLocalDev(),
    }).then(function (res) {
      self.setData({ orderNo: res.orderNo });
      if (isLocalDev() || res.mock) {
        // 仅本地开发：跳过真实商户调起，直接通知后端把订单标记为已支付
        return api.checkup.mockPay(res.orderNo).then(function () {
          self.pollOrder(res.orderNo);
        }).catch(function () {
          self.setData({ paying: false });
          wx.showToast({ title: "模拟支付失败，请重试", icon: "none" });
        });
      }
      wx.requestPayment({
        timeStamp: res.payParams.timeStamp,
        nonceStr: res.payParams.nonceStr,
        package: res.payParams.package,
        signType: res.payParams.signType,
        paySign: res.payParams.paySign,
        success: function () { self.pollOrder(res.orderNo); },
        fail: function () {
          self.setData({ paying: false });
          wx.showToast({ title: "支付未完成", icon: "none" });
        },
      });
    }).catch(function () {
      self.setData({ paying: false });
      wx.showToast({ title: "下单失败，请重试", icon: "none" });
    });
  },
  pollOrder: function (orderNo) {
    var self = this;
    self.stopPoll();
    var tries = 0;
    self.pollTimer = setInterval(function () {
      tries += 1;
      api.checkup.orderStatus(orderNo).then(function (res) {
        if (res.status === "paid") {
          self.stopPoll();
          self.unlock(orderNo);
        } else if (tries > 10) {
          self.stopPoll();
          self.setData({ paying: false });
          wx.showToast({ title: "支付确认中，请稍后重试", icon: "none" });
        }
      }).catch(function () {
        if (tries > 10) {
          self.stopPoll();
          self.setData({ paying: false });
          wx.showToast({ title: "支付确认中，请稍后重试", icon: "none" });
        }
      });
    }, 1500);
  },
  stopPoll: function () {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },
  unlock: function (orderNo) {
    var self = this;
    var answers = storage.load("checkup_answers", []);
    api.checkup.unlock({
      sessionToken: wx.getStorageSync("checkup_session"),
      orderNo: orderNo,
      answers: answers,
      indexInput: self.buildIndexInput(answers),
    }).then(function (res) {
      var report = res.report;
      storage.save(storage.FULL_KEY, report);
      self.setData({
        report: report,
        full: true,
        paying: false,
        indices: buildIndices(report),
        budgetText: buildBudgetText(report && report.budgetRange),
        budgetBasis: buildBudgetBasis(report && report.budgetRange),
      });
      wx.showToast({ title: "完整报告已解锁", icon: "success" });
    }).catch(function () {
      self.setData({ paying: false });
      wx.showToast({ title: "解锁失败，请重试", icon: "none" });
    });
  },
  onCopy: function () {
    var text = this.reportText();
    if (!text) {
      wx.showToast({ title: "暂无可复制的报告", icon: "none" });
      return;
    }
    wx.setClipboardData({ data: text });
  },
  reportText: function () {
    var report = this.data.report;
    if (!report) return "";
    var lines = [
      "AI家庭风险测评报告",
      "",
      "家庭画像：" + ((report.profile && report.profile.summary) || ""),
      "",
    ];
    (this.data.indices || []).forEach(function (index) {
      lines.push(index.name + "：" + index.scoreText);
    });
    lines.push("", this.data.full ? "Top 5 风险" : "Top 3 风险摘要");
    (report.topRisks || []).forEach(function (risk) {
      lines.push("· " + risk.title);
      var details = [];
      if (risk.phenomenon) details.push(risk.phenomenon);
      if (risk.ifIgnored) details.push("如果忽视：" + risk.ifIgnored);
      if (risk.suggestedAction) details.push("建议：" + risk.suggestedAction);
      if (details.length > 0) lines.push("  " + details.join(" "));
    });
    if (this.data.full && this.data.budgetText) {
      lines.push("", "家庭保障预算参考：" + this.data.budgetText);
      if (this.data.budgetBasis) lines.push(this.data.budgetBasis);
    }
    lines.push("", report.disclaimer || "");
    return lines.join("\n");
  },
  onBook: function () {
    wx.navigateTo({
      url: "/pages/booking/booking",
      fail: function () { wx.showToast({ title: "预约页面即将上线", icon: "none" }); },
    });
  },
  buildIndexInput: function (answers) {
    return {
      annualIncome: readRange(answers, "cashflow_income_range"),
      annualExpense: readRange(answers, "cashflow_expense_range"),
    };
  },
});
