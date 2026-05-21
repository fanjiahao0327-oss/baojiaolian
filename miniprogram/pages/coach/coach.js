const api = require("../../utils/api");

var DRAFT_KEY = "coach_form_draft";
var DRAFT_DEBOUNCE = 3000;

// 基于 GB/T 4754-2017 国民经济行业分类 20 大门类
const INDUSTRY_OPTIONS = [
  "互联网/IT/通信", "金融/保险/证券", "教育/培训", "医疗/健康/医药",
  "制造业", "汽车/机械", "房地产/建筑/装修", "零售/电商/贸易",
  "餐饮/旅游/酒店", "政府/事业单位/公务员", "能源/电力/采矿/化工",
  "物流/运输/交通", "文化/传媒/广告", "体育/健身/娱乐",
  "农业/林业/渔业", "法律/咨询/审计", "科研/技术服务",
  "家政/居民服务", "水利/环境/公共设施", "其他",
];

const SECTIONS = [
  {
    title: "客户画像与生活状态",
    fields: [
      { key: "clientName", label: "名称", type: "text", required: true, priority: "recommended", placeholder: "例如：张先生、李姐、王总" },
      { key: "gender", label: "性别", type: "radio", required: true, priority: "recommended", options: ["male", "female"] },
      { key: "age", label: "年龄", type: "number", required: true, priority: "recommended", placeholder: "年龄决定生命周期定位：青年积累期 / 中年责任期 / 退休传承期" },
      { key: "city", label: "所在城市", type: "text", required: true, priority: "recommended", placeholder: "例如：上海" },
      { key: "healthCondition", label: "身体情况", type: "textarea", priority: "recommended", placeholder: "直接影响核保与投保优先级，例如：健康 / 有高血压/糖尿病 / 曾患XX已康复" },
      { key: "maritalStatus", label: "婚姻状况", type: "radio", required: true, priority: "recommended", options: ["未婚", "已婚", "离异", "丧偶", "再婚"] },
      { key: "childrenDetail", label: "子女详情", type: "textarea", priority: "recommended", placeholder: "子女数量/年龄/就读阶段，例如：儿子/8岁/公立小学；女儿/3岁/未入学 / 无" },
      { key: "parentsDetail", label: "父母情况", type: "textarea", priority: "optional", placeholder: "是否健在、是否同住、赡养责任，例如：父母健在/同住/需赡养 / 父亲已故/母亲独居有退休金" },
      { key: "personality", label: "性格特征", type: "textarea", priority: "optional", placeholder: "MBTI/性格色彩/沟通偏好，例如：ISTJ 重视数据细节，需用条款佐证 / ENFP 关注愿景感受" },
      { key: "hobbies", label: "兴趣爱好", type: "textarea", priority: "optional", placeholder: "反映客户愿投入时间金钱的领域，例如：全球旅行、马拉松、收藏红酒、高尔夫" },
      { key: "step1Notes", label: "如有补充", type: "textarea", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "工作与收支",
    fields: [
      { key: "clientIndustry", label: "行业", type: "select", priority: "recommended", options: INDUSTRY_OPTIONS },
      { key: "clientCompany", label: "公司", type: "text", priority: "recommended", placeholder: "公司名称，例如：字节跳动、新东方" },
      { key: "clientPosition", label: "职责&职位", type: "text", priority: "recommended", placeholder: "例如：技术专家/负责核心算法研发、企业主/独立经营" },
      { key: "careerDevelopment", label: "职业发展空间", type: "select", priority: "recommended", options: ["稳定或上升期", "瓶颈期或面临裁员", "创业或自雇，生意波动较大", "已退休或全职家庭"] },
      { key: "breadwinner", label: "家庭经济支柱", type: "select", priority: "recommended", options: ["客户本人", "配偶", "夫妻共同", "父母"] },
      { key: "incomeSources", label: "主要收入来源", type: "checkbox-group", priority: "recommended", options: ["工资收入", "经营收入", "房租收入", "投资分红", "其他"] },
      { key: "annualIncome", label: "家庭年收入（万元）", type: "number", priority: "recommended", placeholder: "例如：30（填大概数字即可）" },
      { key: "spouseIndustry", label: "配偶行业", type: "select", priority: "optional", options: INDUSTRY_OPTIONS },
      { key: "spouseCompany", label: "配偶公司", type: "text", priority: "optional", placeholder: "例如：字节跳动、新东方、全职家庭主妇/夫" },
      { key: "spousePosition", label: "配偶职责&职位", type: "text", priority: "optional", placeholder: "例如：中层管理/负责运营团队、技术专家" },
      { key: "monthlyExpense", label: "月度固定支出（万元）", type: "number", priority: "optional", placeholder: "含房贷/车贷/生活开支，例如：1.5" },
      { key: "majorExpensePlan", label: "未来大额支出计划", type: "textarea", priority: "recommended", placeholder: "购房/子女教育/医疗/养老，例如：3年内换房需200万首付、孩子5年后留学需100万" },
      { key: "step2Notes", label: "如有补充", type: "textarea", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "资产情况",
    fields: [
      { key: "fixedAssets", label: "固定资产", type: "textarea", priority: "recommended", placeholder: "例如：自住房1套、投资房1套、汽车1辆 — 高房产占比可能意味着流动性不足" },
      { key: "liquidAssets", label: "流动资产合计（万元）", type: "number", priority: "recommended", placeholder: "现金+存款+短期理财，例如：50" },
      { key: "liabilities", label: "负债情况", type: "textarea", priority: "recommended", placeholder: "流动负债+长期负债，例如：房贷200万/月供1.2万、信用卡5万、其他无" },
      { key: "investmentAmount", label: "投资金额（万元）", type: "number", priority: "optional", placeholder: "含股票/基金/股权等，例如：20" },
      { key: "investmentStyle", label: "投资偏好", type: "select", priority: "optional", options: ["保守型（存款为主）", "稳健型（基金理财为主）", "进取型（股票/股权为主）"] },
      { key: "riskTolerance", label: "风险承受能力", type: "select", priority: "optional", options: ["低（不愿承担本金损失）", "中（可接受小幅波动）", "高（追求高收益）"] },
      { key: "expensePressure", label: "支出压力感知", type: "select", priority: "optional", options: ["无明显经济压力", "有房贷或房租压力", "子女教育开销较大", "日常消费高难以存下钱"] },
      { key: "step3Notes", label: "如有补充", type: "textarea", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "已有保障",
    fields: [
      { key: "protectionInsurance", label: "保障类保险", type: "textarea", priority: "recommended", placeholder: "例如：百万医疗/年交500元；重疾险50万保额/年交8000元；意外险100万/年交300元；定期寿险200万/保至60岁" },
      { key: "savingsInsurance", label: "储蓄类保险", type: "textarea", priority: "recommended", placeholder: "例如：年金险年交5万×10年/60岁起领；增额终身寿年交10万×5年/资产传承" },
      { key: "insuranceAttitude", label: "对保险的态度", type: "select", priority: "recommended", options: ["满意，配置比较全面", "买了但不太清楚保障内容", "觉得保额不够想补充", "没买过商业保险", "对保险持怀疑或排斥态度"] },
      { key: "otherInsurance", label: "其他保险", type: "text", priority: "optional", placeholder: "例如：企业团体险、惠民保等" },
      { key: "step4Notes", label: "如有补充", type: "textarea", priority: "optional", placeholder: "代理人自行补充的其他信息" },
    ],
  },
  {
    title: "面谈入口",
    fields: [
      { key: "triggerScenario", label: "触发场景", type: "select", required: true, priority: "recommended", options: ["客户主动咨询（有明确原话）", "非主动咨询（代理人通过社交激活话题）"] },
      { key: "clientOriginalWords", label: "客户原话或背景描述", type: "textarea", required: true, priority: "recommended", placeholder: "例如：主动咨询-我想买个保险，你帮我看看 / 非主动咨询-聊到孩子教育，客户说想送孩子出国读书" },
      { key: "pastInteraction", label: "历史互动摘要", type: "textarea", priority: "optional", placeholder: "例如：之前买过医疗险，参加过去年答谢会，朋友圈互动较多" },
    ],
  },
  {
    title: "当前卡点",
    fields: [
      { key: "clientObjection", label: "客户提出的异议或卡点原话", type: "textarea", priority: "recommended", placeholder: "例如：我再考虑考虑 / 太贵了 / 回去跟家里人商量下" },
      { key: "agentResponse", label: "代理人当时的回应方式简述", type: "textarea", priority: "recommended", placeholder: "例如：我介绍了产品的保障范围 / 我没有直接回应，转移了话题" },
    ],
  },
];

// 预排序 sections：recommended 优先，optional 在后
var SORTED_SECTIONS = SECTIONS.map(function (section) {
  var sorted = section.fields.slice().sort(function (a, b) {
    var pa = a.priority || (a.required ? "recommended" : "optional");
    var pb = b.priority || (b.required ? "recommended" : "optional");
    if (pa === "optional" && pb !== "optional") return 1;
    if (pa !== "optional" && pb === "optional") return -1;
    return 0;
  });
  var dividerIdx = -1;
  for (var i = 0; i < sorted.length; i++) {
    var p = sorted[i].priority || (sorted[i].required ? "recommended" : "optional");
    if (p === "optional") { dividerIdx = i; break; }
  }
  return {
    title: section.title,
    recommended: dividerIdx >= 0 ? sorted.slice(0, dividerIdx) : sorted,
    optional: dividerIdx >= 0 ? sorted.slice(dividerIdx) : [],
    hasOptional: dividerIdx >= 0,
    allFields: section.fields, // keep original for validation
  };
});

var EMPTY_FORM = {};
SECTIONS.forEach(function (s) {
  s.fields.forEach(function (f) {
    if (f.type === "checkbox-group") {
      EMPTY_FORM[f.key] = [];
    } else {
      EMPTY_FORM[f.key] = "";
    }
  });
});
EMPTY_FORM.incomeSourcesOther = "";

var LOADING_STAGES = [
  "正在解读客户档案…",
  "正在调取展业知识库…",
  "正在生成诊断建议…",
  "正在整理输出格式…",
];

Page({
  data: {
    tab: "form",
    clients: [],
    selectedClientId: null,
    formData: JSON.parse(JSON.stringify(EMPTY_FORM)),
    sortedSections: SORTED_SECTIONS,
    currentStep: 0,
    messages: [],
    followUp: "",
    isLoading: false,
    hasSubmitted: false,
    conversationId: null,
    showClientPicker: false,
    chatScrollHeight: 400,
    scrollToBottom: false,
    scrollIntoView: "",
    loadingText: LOADING_STAGES[0],
    isLoggedIn: false,
    needBindPhone: false,
    logining: false,
    expandedSections: {},
    balance: -1,
    suggestedQuestions: [],
  },

  onLoad() {
    this._loadingTimer = null;
    this._draftTimer = null;
    this._stageIndex = 0;
    this.checkLoginState();
    this.calcChatHeight();
    this.restoreDraft();
  },

  restoreDraft() {
    try {
      var draft = wx.getStorageSync(DRAFT_KEY);
      if (draft && draft.formData && draft.clientId === undefined) {
        var restored = JSON.parse(JSON.stringify(EMPTY_FORM));
        for (var k in draft.formData) {
          if (draft.formData.hasOwnProperty(k)) restored[k] = draft.formData[k];
        }
        if (!Array.isArray(restored.incomeSources)) restored.incomeSources = [];
        this.setData({ formData: restored });
      }
    } catch (e) { /* ignore */ }
  },

  saveDraft() {
    var self = this;
    if (self._draftTimer) clearTimeout(self._draftTimer);
    self._draftTimer = setTimeout(function () {
      try {
        wx.setStorageSync(DRAFT_KEY, {
          formData: self.data.formData,
          clientId: self.data.selectedClientId || null,
        });
      } catch (e) { /* ignore */ }
    }, DRAFT_DEBOUNCE);
  },

  clearDraft() {
    try { wx.removeStorageSync(DRAFT_KEY); } catch (e) { /* ignore */ }
  },

  onShow() {
    this.checkLoginState();
    var app = getApp();
    if (app.globalData.continueClientId) {
      var id = app.globalData.continueClientId;
      app.globalData.continueClientId = null;
      this.selectClientById(id);
    }
  },

  checkLoginState() {
    var app = getApp();
    this.setData({
      isLoggedIn: app.globalData.isLogin,
      needBindPhone: app.globalData.needBindPhone,
    });
    if (app.globalData.isLogin && app.globalData.loginReady) {
      this.loadClients();
      this.loadBalance();
    } else if (!app.globalData.loginReady) {
      var self = this;
      var check = setInterval(function () {
        if (getApp().globalData.loginReady) {
          clearInterval(check);
          self.checkLoginState();
        }
      }, 100);
    }
  },

  handleWechatLogin() {
    var self = this;
    self.setData({ logining: true });
    var app = getApp();
    app.wechatLogin().then(function () {
      self.setData({
        isLoggedIn: true,
        needBindPhone: app.globalData.needBindPhone,
        logining: false,
      });
      self.loadClients();
      self.loadBalance();
    }).catch(function () {
      self.setData({ logining: false });
      wx.showToast({ title: "登录失败，请重试", icon: "none" });
    });
  },

  onGetPhoneNumber(e) {
    var self = this;
    var _e = e;
    var code = _e.detail.code;
    var encryptedData = _e.detail.encryptedData;
    var iv = _e.detail.iv;
    if (!code && !encryptedData) {
      wx.showToast({ title: "授权已取消", icon: "none" });
      return;
    }
    wx.showLoading({ title: "绑定中", mask: true });
    var body = code ? { code: code } : { encryptedData: encryptedData, iv: iv };
    api.post("/api/auth/bind-phone", body).then(function () {
      getApp().globalData.needBindPhone = false;
      self.setData({ needBindPhone: false });
      wx.showToast({ title: "已绑定", icon: "success" });
    }).catch(function (err) {
      console.error("[coach] bindPhone:", err);
      wx.showToast({ title: "绑定失败，请重试", icon: "none" });
    }).finally(function () {
      wx.hideLoading();
    });
  },

  calcChatHeight() {
    var info = wx.getSystemInfoSync();
    var h = info.windowHeight - 48 - 48;
    this.setData({ chatScrollHeight: Math.max(h, 300) });
  },

  // 折叠/展开可选字段
  toggleExpand(e) {
    var step = e.currentTarget.dataset.step;
    var expanded = this.data.expandedSections;
    var newExpanded = {};
    for (var k in expanded) { newExpanded[k] = expanded[k]; }
    newExpanded[step] = !newExpanded[step];
    this.setData({ expandedSections: newExpanded });
  },

  // picker 选择
  onSelectChange(e) {
    var key = e.currentTarget.dataset.key;
    var idx = e.detail.value;
    // 找到对应 field 的 options
    var options = null;
    SECTIONS.forEach(function (s) {
      s.fields.forEach(function (f) {
        if (f.key === key) options = f.options;
      });
    });
    if (options && idx >= 0 && idx < options.length) {
      var data = {};
      data["formData." + key] = options[idx];
      this.setData(data);
      this.saveDraft();
    }
  },

  // checkbox-group 切换
  onCheckboxToggle(e) {
    var key = e.currentTarget.dataset.key;
    var val = e.currentTarget.dataset.val;
    var current = this.data.formData[key] || [];
    var next;
    if (current.indexOf(val) >= 0) {
      next = current.filter(function (v) { return v !== val; });
    } else {
      next = current.concat([val]);
    }
    var data = {};
    data["formData." + key] = next;
    this.setData(data);
    this.saveDraft();
  },

  loadClientAndHistory(id) {
    var self = this;
    api.get("/api/clients/" + id + "?_=" + Date.now()).then(function (client) {
      var snapshot = client.kyc_snapshot;
      if (typeof snapshot === "string") {
        try { snapshot = JSON.parse(snapshot); } catch (e) { snapshot = {}; }
      }
      // 合并 snapshot 到 EMPTY_FORM，保留数组类型字段
      var merged = JSON.parse(JSON.stringify(EMPTY_FORM));
      if (snapshot) {
        for (var k in snapshot) {
          if (snapshot.hasOwnProperty(k)) merged[k] = snapshot[k];
        }
      }
      // 确保 checkbox-group 字段是数组
      if (!Array.isArray(merged.incomeSources)) merged.incomeSources = [];
      self.setData({
        selectedClientId: Number(id),
        formData: merged,
        showClientPicker: false,
      });
      return api.get("/api/conversations?client_id=" + id);
    }).then(function (convs) {
      if (convs && convs.length > 0) {
        return api.get("/api/conversations/" + convs[0].id);
      }
      return null;
    }).then(function (conv) {
      if (conv && conv.messages) {
        self.setData({
          messages: conv.messages,
          hasSubmitted: true,
          conversationId: conv.id,
          tab: "coach",
        });
      } else {
        self.setData({
          messages: [],
          hasSubmitted: false,
          conversationId: null,
          tab: "form",
        });
      }
    }).catch(function (e) {
      console.error("[coach] loadClientAndHistory:", e);
    });
  },

  selectClientById(id) {
    this.loadClientAndHistory(id);
  },

  loadClients() {
    api.get("/api/clients").then(function (list) {
      this.setData({ clients: list || [] });
    }.bind(this)).catch(function () {});
  },

  loadBalance() {
    api.get("/api/points").then(function (res) {
      this.setData({ balance: res.balance || 0 });
    }.bind(this)).catch(function () {});
  },

  toggleClientPicker() {
    this.setData({ showClientPicker: !this.data.showClientPicker });
  },

  _formHasData() {
    var fd = this.data.formData;
    for (var i = 0; i < SECTIONS.length; i++) {
      var fields = SECTIONS[i].fields;
      for (var j = 0; j < fields.length; j++) {
        var v = fd[fields[j].key];
        if (Array.isArray(v) ? v.length > 0 : (v && String(v).trim())) return true;
      }
    }
    return false;
  },

  _confirmSwitchClient(id) {
    var self = this;
    if (!id) {
      self.setData({
        selectedClientId: null,
        formData: JSON.parse(JSON.stringify(EMPTY_FORM)),
        messages: [],
        hasSubmitted: false,
        conversationId: null,
        showClientPicker: false,
        tab: "form",
      });
      self.clearDraft();
      return;
    }
    self.loadClientAndHistory(id);
  },

  selectClient(e) {
    var self = this;
    var id = e.currentTarget.dataset.id;
    if (self._formHasData()) {
      self.setData({ showClientPicker: false });
      wx.showModal({
        title: "切换客户",
        content: "切换客户会丢失当前填写内容，是否继续？",
        success: function (res) {
          if (res.confirm) self._confirmSwitchClient(id);
        },
      });
    } else {
      self._confirmSwitchClient(id);
    }
  },

  onFieldChange(e) {
    var key = e.currentTarget.dataset.key;
    var val = e.detail.value !== undefined ? e.detail.value : e.currentTarget.dataset.val;
    var data = {};
    data["formData." + key] = val;
    this.setData(data);
    this.saveDraft();
  },

  nextStep() {
    var currentStep = this.data.currentStep;
    var section = SECTIONS[currentStep];
    var formData = this.data.formData;
    var missing = null;
    for (var i = 0; i < section.fields.length; i++) {
      var f = section.fields[i];
      if (!f.required) continue;
      var v = formData[f.key];
      if (Array.isArray(v) ? v.length === 0 : !v) {
        missing = f;
        break;
      }
    }
    if (missing) {
      wx.showToast({ title: "请填写：" + missing.label, icon: "none" });
      return;
    }
    if (currentStep < SECTIONS.length - 1) {
      this.setData({ currentStep: currentStep + 1 });
      wx.pageScrollTo({ scrollTop: 0, duration: 200 });
    }
  },

  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({ currentStep: this.data.currentStep - 1 });
      wx.pageScrollTo({ scrollTop: 0, duration: 200 });
    }
  },

  submitForm() {
    var self = this;
    var formData = self.data.formData;
    var missing = null;
    for (var si = 0; si < SECTIONS.length; si++) {
      var fields = SECTIONS[si].fields;
      for (var fi = 0; fi < fields.length; fi++) {
        var f = fields[fi];
        if (!f.required) continue;
        var v = formData[f.key];
        if (Array.isArray(v) ? v.length === 0 : !v) {
          missing = f;
          break;
        }
      }
      if (missing) break;
    }
    if (missing) {
      wx.showToast({ title: "请填写：" + missing.label, icon: "none" });
      return;
    }
    self.setData({ isLoading: true });
    self._startLoadingText();

    api.post("/api/coach", {
      kycData: formData,
      question: self.buildUserContent(),
      history: [],
      clientId: self.data.selectedClientId,
      noStream: true,
    }).then(function (res) {
      self._stopLoadingText();
      self.clearDraft();
      var msg = { role: "user", content: self.buildUserContent(), timestamp: Date.now() };
      var reply = { role: "coach", content: res.content, timestamp: Date.now() + 1 };
      self.setData({
        hasSubmitted: true,
        tab: "coach",
        messages: [msg, reply],
        conversationId: res.conversationId,
        isLoading: false,
        suggestedQuestions: res.suggestedQuestions || [],
      });
      setTimeout(function () { self.scrollChatToBottom(); }, 300);
    }).catch(function () {
      self._stopLoadingText();
      wx.showToast({ title: "提交失败，请重试", icon: "none" });
      self.setData({ isLoading: false });
    });
  },

  buildUserContent() {
    var d = this.data.formData;
    function incomeText() {
      var sources = d.incomeSources || [];
      if (sources.length === 0) return "未填写";
      if (sources.indexOf("其他") >= 0 && d.incomeSourcesOther) {
        return sources.join("、") + "（" + d.incomeSourcesOther + "）";
      }
      return sources.join("、");
    }
    var kv = function (label, val) { return "- " + label + "：" + (val || "未填写"); };
    return "客户信息：\n\n" +
      "## 客户画像与生活状态\n" +
      kv("名称", d.clientName) + "\n" +
      kv("性别", d.gender === "male" ? "男" : d.gender === "female" ? "女" : "") + "\n" +
      kv("年龄", d.age) + "\n" +
      kv("所在城市", d.city) + "\n" +
      kv("身体情况", d.healthCondition) + "\n" +
      kv("婚姻状况", d.maritalStatus) + "\n" +
      kv("子女详情", d.childrenDetail) + "\n" +
      kv("父母情况", d.parentsDetail) + "\n" +
      kv("性格特征", d.personality) + "\n" +
      kv("兴趣爱好", d.hobbies) + "\n" +
      kv("补充信息", d.step1Notes) + "\n\n" +
      "## 工作与收支\n" +
      kv("行业", d.clientIndustry) + "\n" +
      kv("公司", d.clientCompany) + "\n" +
      kv("职责&职位", d.clientPosition) + "\n" +
      kv("职业发展空间", d.careerDevelopment) + "\n" +
      kv("家庭经济支柱", d.breadwinner) + "\n" +
      kv("主要收入来源", incomeText()) + "\n" +
      kv("家庭年收入（万元）", d.annualIncome) + "\n" +
      kv("配偶行业", d.spouseIndustry) + "\n" +
      kv("配偶公司", d.spouseCompany) + "\n" +
      kv("配偶职责&职位", d.spousePosition) + "\n" +
      kv("月度固定支出（万元）", d.monthlyExpense) + "\n" +
      kv("未来大额支出计划", d.majorExpensePlan) + "\n" +
      kv("补充信息", d.step2Notes) + "\n\n" +
      "## 资产情况\n" +
      kv("固定资产", d.fixedAssets) + "\n" +
      kv("流动资产合计（万元）", d.liquidAssets) + "\n" +
      kv("负债情况", d.liabilities) + "\n" +
      kv("投资金额（万元）", d.investmentAmount) + "\n" +
      kv("投资偏好", d.investmentStyle) + "\n" +
      kv("风险承受能力", d.riskTolerance) + "\n" +
      kv("支出压力感知", d.expensePressure) + "\n" +
      kv("补充信息", d.step3Notes) + "\n\n" +
      "## 已有保障\n" +
      kv("保障类保险", d.protectionInsurance) + "\n" +
      kv("储蓄类保险", d.savingsInsurance) + "\n" +
      kv("对保险的态度", d.insuranceAttitude) + "\n" +
      kv("其他保险", d.otherInsurance) + "\n" +
      kv("补充信息", d.step4Notes) + "\n\n" +
      "## 本次面谈入口\n" +
      kv("触发场景", d.triggerScenario) + "\n" +
      kv("客户原话或背景描述", d.clientOriginalWords) + "\n" +
      kv("历史互动摘要", d.pastInteraction) + "\n\n" +
      "## 当前卡点\n" +
      kv("客户提出的异议或卡点原话", d.clientObjection) + "\n" +
      kv("代理人当时的回应方式简述", d.agentResponse) + "\n\n" +
      "请给出：1. 卡点诊断 2. 推演方向 3. 建议话术";
  },

  onFollowUpInput(e) {
    this.setData({ followUp: e.detail.value });
  },

  sendFollowUp() {
    var self = this;
    var question = (self.data.followUp || "").trim();
    if (!question || self.data.isLoading) return;

    self.setData({ followUp: "", isLoading: true });
    self._startLoadingText();
    var userMsg = { role: "user", content: question, timestamp: Date.now() };
    var prevMessages = self.data.messages;
    var messages = prevMessages.concat([userMsg]);
    self.setData({ messages: messages });

    api.post("/api/coach", {
      kycData: {},
      question: question,
      history: prevMessages,
      clientId: self.data.selectedClientId,
      noStream: true,
    }).then(function (res) {
      self._stopLoadingText();
      var reply = { role: "coach", content: res.content, timestamp: Date.now() };
      self.setData({
        messages: self.data.messages.concat([reply]),
        isLoading: false,
        conversationId: res.conversationId,
        suggestedQuestions: res.suggestedQuestions || [],
      });
      setTimeout(function () { self.scrollChatToBottom(); }, 300);
    }).catch(function () {
      self._stopLoadingText();
      var errMsg = { role: "coach", content: "抱歉，发生了错误，请稍后重试。", timestamp: Date.now() };
      self.setData({
        messages: self.data.messages.concat([errMsg]),
        isLoading: false,
      });
    });
  },

  _startLoadingText() {
    var self = this;
    self._stageIndex = 0;
    self.setData({ loadingText: LOADING_STAGES[0] });
    self._loadingTimer = setInterval(function () {
      self._stageIndex = (self._stageIndex + 1) % LOADING_STAGES.length;
      self.setData({ loadingText: LOADING_STAGES[self._stageIndex] });
    }, 1500);
  },

  _stopLoadingText() {
    if (this._loadingTimer) {
      clearInterval(this._loadingTimer);
      this._loadingTimer = null;
    }
  },

  onChatScroll(e) {
    var scrollTop = e.detail.scrollTop;
    var scrollHeight = e.detail.scrollHeight;
    var threshold = 200;
    var nearBottom = scrollTop + this.data.chatScrollHeight >= scrollHeight - threshold;
    if (this.data.scrollToBottom === nearBottom) {
      this.setData({ scrollToBottom: !nearBottom });
    }
  },

  scrollChatToBottom() {
    this.setData({ scrollToBottom: false });
    var lastIdx = this.data.messages.length - 1;
    if (lastIdx >= 0) {
      this.setData({ scrollIntoView: "msg-" + lastIdx });
    }
  },

  copyCoachMsg(e) {
    var idx = e.currentTarget.dataset.idx;
    var msg = this.data.messages[idx];
    if (msg && msg.content) {
      wx.setClipboardData({
        data: msg.content.replace(/<[^>]+>/g, ""),
        success: function () {
          wx.showToast({ title: "已复制", icon: "success", duration: 1500 });
        },
      });
    }
  },

  tapSuggestedQuestion(e) {
    var q = e.currentTarget.dataset.q;
    if (!q || this.data.isLoading) return;
    this.setData({ followUp: q });
    this.sendFollowUp();
  },

  goToPoints() {
    wx.switchTab({ url: "/pages/points/points" });
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ tab: tab });
    if (tab === "coach") {
      this.calcChatHeight();
      setTimeout(function () { this.scrollChatToBottom(); }.bind(this), 300);
    }
  },
});
