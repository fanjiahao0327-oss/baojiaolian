var api = require("../../utils/api");

Page({
  data: { name: "", phone: "", timeWindow: "", question: "", submitting: false, done: false },
  onInput: function (e) {
    var key = e.currentTarget.dataset.key;
    var data = {};
    data[key] = e.detail.value;
    this.setData(data);
  },
  onSubmit: function () {
    var self = this;
    if (self.data.submitting) return;
    var name = String(self.data.name || "").trim();
    var phone = String(self.data.phone || "").trim();
    var timeWindow = String(self.data.timeWindow || "").trim();
    if (!name || !/^1\d{10}$/.test(phone) || !timeWindow) {
      wx.showToast({ title: "请填写称呼、手机号和方便时间", icon: "none" });
      return;
    }
    self.setData({ submitting: true });
    api.checkup.appointment({
      sessionToken: wx.getStorageSync("checkup_session"),
      name: name,
      phone: phone,
      timeWindow: timeWindow,
      question: String(self.data.question || "").trim(),
    }).then(function () {
      self.setData({ done: true });
    }).catch(function () {
      wx.showToast({ title: "提交失败，请重试", icon: "none" });
    }).then(function () {
      self.setData({ submitting: false });
    });
  },
  onService: function () {
    // 客服按钮使用小程序原生 open-type="contact"，此处无需额外逻辑。
  },
});
