var api = require("../../utils/api");

var PREVIOUS_KEYS = [
  "checkup_answers",
  "checkup_history",
  "checkup_report_preview",
  "checkup_report_full",
];

function clearPreviousData() {
  PREVIOUS_KEYS.forEach(function (key) {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      /* ignore */
    }
  });
}

Page({
  data: { starting: false },
  onStart: function () {
    var self = this;
    if (self.data.starting) return;
    self.setData({ starting: true });
    api.checkup.start().then(function (res) {
      clearPreviousData();
      wx.setStorageSync("checkup_session", res.sessionToken);
      wx.setStorageSync("checkup_triage", null);
      wx.navigateTo({ url: "/pages/chat/chat" });
    }).catch(function () {
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
    }).then(function () {
      self.setData({ starting: false });
    });
  },
  onAbout: function () {
    wx.navigateTo({ url: "/pages/about/about" });
  },
});
