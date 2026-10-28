var api = require("../../utils/api");
var storage = require("../../utils/storage");

Page({
  data: {
    messages: [],
    currentQuestion: null,
    answers: [],
    progress: "0/12",
    loading: false,
    inputValue: "",
    canRetry: false,
  },
  onLoad: function () {
    var token = wx.getStorageSync("checkup_session");
    if (!token) {
      wx.redirectTo({ url: "/pages/index/index" });
      return;
    }
    var history = storage.load(storage.HISTORY_KEY, []);
    if (history.length > 0) {
      this.setData({ messages: history, answers: storage.load("checkup_answers", []) });
      this.ask({ resume: true });
    } else {
      this.setData({ messages: [{ role: "assistant", text: "你家现在最让你不踏实的是什么？可以先随便说几句，不用想得很完整。" }] });
    }
  },
  onInput: function (e) { this.setData({ inputValue: e.detail.value }); },
  onSendText: function () {
    var text = (this.data.inputValue || "").trim();
    if (!text) return;
    this.setData({
      messages: this.data.messages.concat([{ role: "user", text: text }]),
      inputValue: "",
    });
    this.ask({ lastMessage: text, freeText: text });
  },
  onOption: function (e) {
    var option = e.currentTarget.dataset.option;
    var question = this.data.currentQuestion;
    if (!question) return;
    this.setData({ messages: this.data.messages.concat([{ role: "user", text: option.label }]) });
    var answer = { questionId: question.id, dimension: question.dimension, field: question.field, value: option.value, skipped: false };
    this.ask({ answer: answer });
  },
  onSkip: function () {
    var question = this.data.currentQuestion;
    if (!question) return;
    this.setData({ messages: this.data.messages.concat([{ role: "user", text: "这个先跳过" }]) });
    this.ask({ answer: { questionId: question.id, dimension: question.dimension, field: question.field, value: "skip", skipped: true } });
  },
  onReportNow: function () {
    this.ask({ customerWantsReport: true });
  },
  ask: function (payload) {
    var self = this;
    if (self.data.loading) return;
    self.setData({ loading: true });
    var answers = self.data.answers.slice();
    if (payload.answer) answers.push(payload.answer);
    api.checkup.answer({
      sessionToken: wx.getStorageSync("checkup_session"),
      answers: answers,
      lastMessage: payload.lastMessage || "",
      customerWantsReport: Boolean(payload.customerWantsReport),
      triage: wx.getStorageSync("checkup_triage") || null,
    }).then(function (res) {
      storage.save("checkup_answers", answers);
      storage.save(storage.HISTORY_KEY, self.data.messages);
      if (res.done) {
        self.goPreview(answers);
        return;
      }
      wx.setStorageSync("checkup_triage", res.triage);
      self.setData({
        answers: answers,
        currentQuestion: res.question,
        progress: res.progress,
        messages: payload.resume
          ? self.data.messages
          : self.data.messages.concat([{ role: "assistant", text: res.question.prompt }]),
      });
      storage.save(storage.HISTORY_KEY, self.data.messages);
    }).catch(function () {
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
      self.setData({ canRetry: true });
    }).then(function () {
      self.setData({ loading: false });
    });
  },
  goPreview: function (answers) {
    var self = this;
    api.checkup.preview({
      sessionToken: wx.getStorageSync("checkup_session"),
      answers: answers,
      indexInput: self.buildIndexInput(answers),
    }).then(function (res) {
      storage.save(storage.PREVIEW_KEY, res.report);
      wx.navigateTo({ url: "/pages/report/report" });
    }).catch(function () {
      wx.showToast({ title: "生成报告失败，请重试", icon: "none" });
    });
  },
  buildIndexInput: function (answers) {
    // 只从客户主动提供的区间题里取中位数；缺失就留空，报告标「信息不足」
    var ranges = {
      under30: 25, "30_60": 45, "60_100": 80, over100: 120,
      under10: 8, "10_30": 20, "30_50": 40, over50: 60,
      under50: 40, "50_100": 75, "100_300": 200, over300: 400,
      none: 0,
    };
    var get = function (id) {
      var a = answers.filter(function (x) { return x.questionId === id; })[0];
      return a && !a.skipped ? ranges[a.value] : null;
    };
    return { annualIncome: get("cashflow_income_range"), annualExpense: get("cashflow_expense_range") };
  },
});
