var api = require("../../utils/api");
var storage = require("../../utils/storage");

Page({
  data: {
    messages: [],
    currentQuestion: null,
    answers: [],
    progress: "0/26",
    topics: [],
    summary: null,
    summaryReady: false,
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
    var topics = wx.getStorageSync("checkup_topics") || [];
    var summary = wx.getStorageSync("checkup_summary") || null;
    if (history.length > 0) {
      this.setData({ messages: history, answers: storage.load("checkup_answers", []), topics: topics, summary: summary, summaryReady: Boolean(summary) });
      this.ask({ resume: true });
    } else {
      this.setData({
        messages: [{ role: "assistant", text: "先说说：你为什么现在想了解保险？最近有没有发生什么事，或者你心里一直有个担心？可以从下面的方向选一个开始，也可以直接说。" }],
        topics: topics,
      });
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
    if (!this.data.currentQuestion) {
      this.ask({
        answer: { questionId: "opening", dimension: "family", field: "openingText", value: "free_text", freeText: text, skipped: false },
        lastMessage: text,
      });
      return;
    }
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
  onConfirmSummary: function () {
    this.goPreview(this.data.answers);
  },
  onSummaryNote: function () {
    var text = (this.data.inputValue || "").trim();
    if (!text) return;
    this.setData({ inputValue: "" });
    this.ask({
      answer: { questionId: "summary_note", dimension: "family", field: "summaryNote", value: "free_text", freeText: text, skipped: false },
      lastMessage: text,
    });
  },
  onTopic: function (e) {
    var topic = e.currentTarget.dataset.topic;
    if (!topic) return;
    this.setData({ messages: this.data.messages.concat([{ role: "user", text: topic }]) });
    this.ask({
      answer: { questionId: "opening", dimension: "family", field: "openingText", value: "free_text", freeText: topic, skipped: false },
      lastMessage: topic,
    });
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
      profile: wx.getStorageSync("checkup_profile") || null,
    }).then(function (res) {
      storage.save("checkup_answers", answers);
      storage.save(storage.HISTORY_KEY, self.data.messages);
      if (res.profile) wx.setStorageSync("checkup_profile", res.profile);
      if (res.summaryReady) {
        wx.setStorageSync("checkup_summary", res.summary);
        self.setData({ summary: res.summary, summaryReady: true, currentQuestion: null, progress: res.progress });
        return;
      }
      if (res.done) {
        self.goPreview(answers);
        return;
      }
      wx.setStorageSync("checkup_triage", res.triage);
      var nextMessages = self.data.messages.slice();
      if (!payload.resume) {
        if (res.ack) nextMessages.push({ role: "assistant", text: res.ack });
        nextMessages.push({ role: "assistant", text: res.question.prompt });
      }
      self.setData({
        answers: answers,
        currentQuestion: res.question,
        progress: res.progress,
        messages: nextMessages,
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
      profile: wx.getStorageSync("checkup_profile") || null,
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
