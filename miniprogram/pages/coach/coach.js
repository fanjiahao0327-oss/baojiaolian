const api = require("../../utils/api");
const auth = require("../../utils/auth");

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
      { key: "incomeSources", label: "主要收入来源", type: "text", priority: "recommended", placeholder: "例如：工资收入、经营收入、房租收入、投资分红" },
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

var LOADING_STAGES = [
  "正在分析客户情况…",
  "AI 教练生成诊断中…",
];

var QUICK_FIELDS = ["clientName", "age", "gender", "clientIndustry", "annualIncome", "childrenDetail", "protectionInsurance", "triggerScenario", "clientOriginalWords", "clientObjection"];

Page({
  data: {
    tab: "form",
    quickMode: false,
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
    hidePhoneBanner: false,
    logining: false,
    lastPointCost: null,
    showGuide: false,
    // 语音录入
    recording: false,
    voiceText: "",
    voiceParsingKyc: false,
    expandedSections: {},
    balance: -1,
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
    // 新用户首次引导
    try {
      if (!wx.getStorageSync("coach_guide_seen")) {
        this.setData({ showGuide: true });
        wx.setStorageSync("coach_guide_seen", true);
      }
    } catch (_) {}

    this.checkLoginState();
    var app = getApp();
    if (app.globalData.continueClientId) {
      var id = app.globalData.continueClientId;
      app.globalData.continueClientId = null;
      this.selectClientById(id);
    }
  },

  dismissGuide() {
    this.setData({ showGuide: false });
  },

  onHide() {
    // 切页面时自动停止录音
    if (this._voiceManager && this.data.recording) {
      this._voiceManager.stop();
      this.setData({ recording: false });
    }
  },

  // ===== 语音录入 =====
  startVoiceInput() {
    var self = this;
    if (self.data.recording) return; // 防止重复点击
    
    // 先获取录音权限
    wx.authorize({ scope: "scope.record" }).then(function () {
      return self._doStartVoice();
    }).catch(function () {
      wx.showModal({
        title: "需要录音权限",
        content: "请在设置中开启麦克风权限",
        confirmText: "去设置",
        success: function (res) {
          if (res.confirm) wx.openSetting();
        }
      });
    });
  },

  _doStartVoice() {
    var self = this;
    // 初始化语音识别管理器（WeChatSI 插件）
    var plugin = requirePlugin("WechatSI");
    if (!plugin || !plugin.getRecordRecognitionManager) {
      wx.showToast({ title: "语音插件未加载，请重启小程序", icon: "none" });
      return;
    }
    if (self._voiceManager) {
      // 已有管理器实例，直接使用
    } else {
      self._voiceManager = plugin.getRecordRecognitionManager();
      self._voiceManager.onRecognize = function (res) {
        // 实时识别结果
        self.setData({ voiceText: res.result });
      };
      self._voiceManager.onStop = function (res) {
        self.setData({ recording: false });
        if (res.result) {
          self.setData({ voiceText: res.result });
          // 自动调用 AI 解析
          self._parseVoiceText(res.result);
        }
      };
      self._voiceManager.onError = function (res) {
        self.setData({ recording: false });
        wx.showToast({ title: "识别失败: " + (res.msg || "请重试"), icon: "none" });
      };
      self._voiceManager.onStart = function () {
        self.setData({ recording: true, voiceText: "" });
      };
    }
    self._voiceManager.start({ duration: 60000 });
  },

  stopVoiceInput() {
    if (this._voiceManager) {
      this._voiceManager.stop();
    }
  },

  cancelVoiceInput() {
    if (this._voiceManager) {
      this._voiceManager.stop();
    }
    this.setData({ recording: false, voiceText: "" });
  },

  // AI 解析语音文本，自动提取 KYC 信息
  async _parseVoiceText(text) {
    if (!text || text.trim().length < 5) return;
    var self = this;
    self.setData({ voiceParsingKyc: true });
    try {
      var res = await api.post("/api/coach/parse-kyc", { text: text });
      if (res && res.fields) {
        var count = Object.keys(res.fields).filter(function (k) { return res.fields[k]; }).length;
        if (count > 0) {
          var updated = {};
          // 浅拷贝 formData
          var fd = self.data.formData;
          for (var key in fd) { updated[key] = fd[key]; }
          Object.keys(res.fields).forEach(function (k) {
            if (res.fields[k]) updated[k] = res.fields[k];
          });
          self.setData({ formData: updated });
          wx.showToast({ title: "已解析 " + count + " 个字段", icon: "success" });
        } else {
          wx.showToast({ title: "未识别到关键信息，请手动填写", icon: "none" });
        }
      }
      self.setData({ voiceParsingKyc: false });
    } catch (e) {
      self.setData({ voiceParsingKyc: false });
      console.warn("[voice] parseKyc failed:", e && e.message);
      // 解析失败，语音文本保留供手动参考
      wx.showToast({ title: "AI 解析暂不可用，可手动填写", icon: "none", duration: 2000 });
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
        hidePhoneBanner: false,
        logining: false,
    lastPointCost: null,
    showGuide: false,
    // 语音录入
    recording: false,
    voiceText: "",
    voiceParsingKyc: false,
      });
      self.loadClients();
      self.loadBalance();
    }).catch(function () {
      self.setData({ logining: false });
      wx.showToast({ title: "登录失败，请重试", icon: "none" });
    });
  },

  closePhoneBanner() {
    this.setData({ hidePhoneBanner: true });
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

  // 流式请求 AI 教练（逐字输出）
  streamCoachRequest(params) {
    var self = this;
    var { kycData, question, history, clientId } = params;

    return new Promise(function (resolve, reject) {
      var buffer = "";
      var accumulatedText = "";

      var reqTask = wx.request({
        url: getApp().globalData.apiBase + "/api/coach",
        method: "POST",
        enableChunked: true,
        timeout: 180000,
        header: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + auth.getToken(),
        },
        data: {
          kycData: kycData || {},
          question: question,
          history: history || [],
          clientId: clientId || null,
          noStream: false,
          format: "jsonl",
        },
        success: function (res) {
          // 如果 onChunkReceived 没有触发（降级），用完整响应兜底
          if (!accumulatedText && res.data) {
            try {
              var fallback = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
              var lines = fallback.split("\n");
              for (var j = 0; j < lines.length; j++) {
                var line = lines[j].trim();
                if (!line) continue;
                try {
                  var fb = JSON.parse(line);
                  if (fb.type === "text" && fb.c) accumulatedText += fb.c;
                  else if (fb.type === "done") {
                    var fmsgs2 = self.data.messages;
                    if (fmsgs2.length > 0) {
                      var flast2 = fmsgs2[fmsgs2.length - 1];
                      if (flast2.role === "coach" && flast2.streaming) {
                        flast2.content = accumulatedText;
                        flast2.contentHtml = fb.html || accumulatedText;
                        delete flast2.streaming;
                      }
                    }
                    self._stopLoadingText();
                    self.setData({ messages: fmsgs2, isLoading: false, conversationId: fb.cid, lastPointCost: fb.pointCost });
                    resolve({ conversationId: fb.cid });
                    return;
                  }
                } catch (_) {}
              }
            } catch (_) {}
          }
          if (!accumulatedText) {
            self._stopLoadingText();
            var fmsgs = self.data.messages;
            if (fmsgs.length > 0) {
              var flast = fmsgs[fmsgs.length - 1];
              if (flast.role === "coach" && flast.streaming) {
                flast.content = "抱歉，服务未返回结果，请重试。";
                delete flast.streaming;
              }
            }
            self.setData({ messages: fmsgs, isLoading: false });
            reject(new Error("No response received"));
            return;
          }
          // 收到了分块内容但没收到 done 消息：兜底结束流式状态
          var fmsgs = self.data.messages;
          if (fmsgs.length > 0) {
            var flast = fmsgs[fmsgs.length - 1];
            if (flast.role === "coach" && flast.streaming) {
              delete flast.streaming;
            }
          }
          self._stopLoadingText();
          self.setData({ messages: fmsgs, isLoading: false });
          resolve({ conversationId: null });
        },
        fail: function (err) {
          self._stopLoadingText();
          // 移除流式占位消息，替换为错误提示
          var fmsgs = self.data.messages;
          if (fmsgs.length > 0) {
            var flast = fmsgs[fmsgs.length - 1];
            if (flast.role === "coach" && flast.streaming) {
              flast.content = "抱歉，连接中断，请重试。";
              delete flast.streaming;
            }
          }
          self.setData({ messages: fmsgs, isLoading: false });
          reject(err);
        },
      });

      reqTask.onChunkReceived(function (res) {
        try {
          var chunk = res.data;
          if (chunk instanceof ArrayBuffer) {
            chunk = new TextDecoder("utf-8").decode(new Uint8Array(chunk));
          }
          if (typeof chunk !== "string") return;

          buffer += chunk;
          // 处理完整的 JSON 行
          var lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            try {
              var msg = JSON.parse(line);

              if (msg.type === "text" && msg.c) {
                accumulatedText += msg.c;
                var msgs = self.data.messages;
                if (msgs.length > 0) {
                  var lastMsg = msgs[msgs.length - 1];
                  if (lastMsg.role === "coach" && lastMsg.streaming) {
                    lastMsg.content = accumulatedText;
                    self.setData({ messages: msgs });
                    // 滚动到底部
                    setTimeout(function () { self.scrollChatToBottom(); }, 50);
                  }
                }
              } else if (msg.type === "done") {
                var msgs = self.data.messages;
                if (msgs.length > 0) {
                  var lastMsg = msgs[msgs.length - 1];
                  if (lastMsg.role === "coach" && lastMsg.streaming) {
                    lastMsg.content = accumulatedText;
                    lastMsg.contentHtml = msg.html || accumulatedText;
                    delete lastMsg.streaming;
                  }
                }
                self._stopLoadingText();
                self.setData({
                  messages: msgs,
                  isLoading: false,
                  conversationId: msg.cid,
                  lastPointCost: msg.pointCost,
                });
                setTimeout(function () { self.scrollChatToBottom(); }, 300);
                resolve({ conversationId: msg.cid });
              } else if (msg.type === "error") {
                self._stopLoadingText();
                self.setData({ isLoading: false });
                reject(new Error(msg.msg || "服务错误"));
              }
            } catch (_) {
              // 不完整的 JSON 行，继续累积
            }
          }
        } catch (_) {
          // 解析异常，忽略
        }
      });
    });
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
    }.bind(this)).catch(function (e) { console.warn("[coach] loadClients failed:", e); });
  },

  loadBalance() {
    api.get("/api/points").then(function (res) {
      this.setData({ balance: res.balance || 0 });
    }.bind(this)).catch(function (e) { console.warn("[coach] loadBalance failed:", e); });
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

  ensureLogin() {
    var self = this;
    var app = getApp();
    if (app.globalData.isLogin) {
      return Promise.resolve();
    }
    self.setData({ logining: true });
    return app.wechatLogin().then(function () {
      self.setData({
        isLoggedIn: true,
        needBindPhone: app.globalData.needBindPhone,
        hidePhoneBanner: false,
        logining: false,
    lastPointCost: null,
    showGuide: false,
    // 语音录入
    recording: false,
    voiceText: "",
    voiceParsingKyc: false,
      });
      self.loadClients();
      self.loadBalance();
    }).catch(function (err) {
      self.setData({ logining: false });
      throw err;
    });
  },

  submitForm() {
    var self = this;
    var formData = self.data.formData;
    var missing = null;

    if (self.data.quickMode) {
      // 快速模式：仅校验 5 个核心字段
      for (var i = 0; i < QUICK_FIELDS.length; i++) {
        var key = QUICK_FIELDS[i];
        var v = formData[key];
        if (!v) {
          for (var si = 0; si < SECTIONS.length; si++) {
            for (var fi = 0; fi < SECTIONS[si].fields.length; fi++) {
              if (SECTIONS[si].fields[fi].key === key) {
                missing = SECTIONS[si].fields[fi];
                break;
              }
            }
            if (missing) break;
          }
          break;
        }
      }
    } else {
      // 完整模式：校验所有必填字段
      for (var si = 0; si < SECTIONS.length; si++) {
        var fields = SECTIONS[si].fields;
        for (var fi = 0; fi < fields.length; fi++) {
          var f = fields[fi];
          if (!f.required) continue;
          var v2 = formData[f.key];
          if (Array.isArray(v2) ? v2.length === 0 : !v2) {
            missing = f;
            break;
          }
        }
        if (missing) break;
      }
    }
    if (missing) {
      wx.showToast({ title: "请填写：" + missing.label, icon: "none" });
      return;
    }

    // 先确保登录，再提交
    self.ensureLogin().then(function () {
      return self._doSubmit();
    }).catch(function () {
      wx.showToast({ title: "登录失败，请重试", icon: "none" });
    });
  },

  _doSubmit() {
    var self = this;
    var formData = self.data.formData;
    var userContent = self.data.quickMode
      ? self.buildQuickUserContent()
      : self.buildUserContent();

    var kycData = self.data.quickMode
      ? self._pickQuickKycFields(formData)
      : formData;

    // 快速模式未选客户时：先用名称自动创建客户，避免与完整模式的对话混到同一个客户下
    if (self.data.quickMode && !self.data.selectedClientId) {
      var clientName = (formData.clientName || "").trim() || "快速诊断客户";
      api.post("/api/clients", {
        name: clientName,
        kycSnapshot: kycData
      }).then(function (res) {
        self.setData({ selectedClientId: res.id });
        self._doSubmitCore(userContent, kycData);
      }).catch(function () {
        wx.showToast({ title: "创建客户失败，请重试", icon: "none" });
        self.setData({ isLoading: false });
        self._stopLoadingText();
      });
      return;
    }

    self._doSubmitCore(userContent, kycData);
  },

  _doSubmitCore(userContent, kycData) {
    var self = this;
    var userMsg = { role: "user", content: userContent, timestamp: Date.now() };
    var placeholderMsg = { role: "coach", content: "", timestamp: Date.now() + 1, streaming: true };

    self.setData({
      isLoading: true,
      hasSubmitted: true,
      tab: "coach",
      messages: [userMsg, placeholderMsg],
      conversationId: null,
    });
    self._startLoadingText();
    self.clearDraft();

    self.streamCoachRequest({
      kycData: kycData,
      question: userContent,
      history: [],
      clientId: self.data.selectedClientId,
    }).then(function () {
      // 已在 onChunkReceived 中处理完成
    }).catch(function () {
      self._stopLoadingText();
      // 流式传输中断时，尝试从服务端恢复最新对话（AI 可能已在服务端完成处理）
      api.get("/api/conversations?limit=1").then(function (list) {
        if (list && list.length > 0 && list[0].id) {
          wx.showLoading({ title: "加载中" });
          return api.get("/api/conversations/" + list[0].id);
        }
        return null;
      }).then(function (detail) {
        if (detail && detail.messages && detail.messages.length > 1) {
          // 找到未完成的流式占位消息，替换为完整内容
          var recovered = detail.messages.map(function (m) {
            if (m.role === "coach" && m.contentHtml) {
              return { role: "coach", content: m.content || m.contentHtml, contentHtml: m.contentHtml, timestamp: m.timestamp };
            }
            return m;
          });
          self.setData({ messages: recovered, isLoading: false, conversationId: detail.id });
          setTimeout(function () { self.scrollChatToBottom(); }, 300);
        } else {
          wx.showToast({ title: "提交失败，请重试", icon: "none" });
          self.setData({ isLoading: false });
        }
      }).catch(function () {
        wx.showToast({ title: "提交失败，请重试", icon: "none" });
        self.setData({ isLoading: false });
      }).finally(function () { wx.hideLoading(); });
    });
  },

  buildUserContent() {
    var d = this.data.formData;
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
      kv("主要收入来源", d.incomeSources) + "\n" +
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

  buildQuickUserContent() {
    var d = this.data.formData;
    var kv = function (label, val) { return "- " + label + "：" + (val || "未填写"); };
    var genderLabel = d.gender === "male" ? "男" : d.gender === "female" ? "女" : "";
    return "快速诊断模式：\n\n" +
      "## 客户画像\n" +
      kv("名称", d.clientName) + "\n" +
      kv("年龄", d.age) + "\n" +
      kv("性别", genderLabel) + "\n" +
      kv("行业", d.clientIndustry) + "\n" +
      kv("子女详情", d.childrenDetail) + "\n\n" +
      "## 财务与保障\n" +
      kv("家庭年收入（万元）", d.annualIncome) + "\n" +
      kv("保障类保险", d.protectionInsurance) + "\n\n" +
      "## 面谈信息\n" +
      kv("触发场景", d.triggerScenario) + "\n" +
      kv("客户原话或背景描述", d.clientOriginalWords) + "\n" +
      kv("客户异议/卡点", d.clientObjection) + "\n\n" +
      "请基于以上信息给出：1. 卡点诊断 2. 推演方向 3. 建议话术（话术可含待确认信息的提问方式）";
  },

  _pickQuickKycFields(formData) {
    var picked = {};
    for (var i = 0; i < QUICK_FIELDS.length; i++) {
      var k = QUICK_FIELDS[i];
      if (formData[k] !== undefined && formData[k] !== "") {
        picked[k] = formData[k];
      }
    }
    return picked;
  },

  onFollowUpInput(e) {
    this.setData({ followUp: e.detail.value });
  },

  sendFollowUp() {
    var self = this;
    var question = (self.data.followUp || "").trim();
    if (!question || self.data.isLoading) return;

    self.setData({ followUp: "" });
    self.ensureLogin().then(function () {
      return self._doSendFollowUp(question);
    }).catch(function () {
      wx.showToast({ title: "登录失败，请重试", icon: "none" });
    });
  },

  _doSendFollowUp(question) {
    var self = this;
    self.setData({ isLoading: true });
    self._startLoadingText();
    var userMsg = { role: "user", content: question, timestamp: Date.now() };
    var prevMessages = self.data.messages;
    var placeholderMsg = { role: "coach", content: "", timestamp: Date.now() + 1, streaming: true };
    var messages = prevMessages.concat([userMsg, placeholderMsg]);
    self.setData({ messages: messages });

    self.streamCoachRequest({
      kycData: {},
      question: question,
      history: prevMessages,
      clientId: self.data.selectedClientId,
    }).then(function () {
      // 已在 onChunkReceived 中处理完成
    }).catch(function () {
      self._stopLoadingText();
      var errMsg = { role: "coach", content: "抱歉，发生了错误，请稍后重试。", timestamp: Date.now() };
      var currentMessages = self.data.messages;
      if (currentMessages.length > 0) {
        var lastMsg = currentMessages[currentMessages.length - 1];
        if (lastMsg.role === "coach" && lastMsg.streaming) {
          currentMessages[currentMessages.length - 1] = errMsg;
        } else {
          currentMessages.push(errMsg);
        }
      } else {
        currentMessages.push(errMsg);
      }
      self.setData({ messages: currentMessages, isLoading: false });
    });
  },

  _startLoadingText() {
    var self = this;
    self._stageIndex = 0;
    self.setData({ loadingText: LOADING_STAGES[0] });
    self._loadingTimer = setInterval(function () {
      self._stageIndex = (self._stageIndex + 1) % LOADING_STAGES.length;
      self.setData({ loadingText: LOADING_STAGES[self._stageIndex] });
    }, 2500);
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

  onFeedback(e) {
    var self = this;
    var idx = e.currentTarget.dataset.idx;
    var rating = e.currentTarget.dataset.rating;
    var msgs = self.data.messages;
    var msg = msgs[idx];
    if (!msg || msg.role !== "coach" || msg.feedback) return;

    // 乐观更新 UI
    msg.feedback = rating;
    self.setData({ messages: msgs });

    api.post("/api/feedback", {
      conversationId: self.data.conversationId,
      messageIdx: idx,
      rating: rating,
    }).catch(function () {
      msg.feedback = null;
      self.setData({ messages: msgs });
    });
  },

  goToPoints() {
    wx.switchTab({ url: "/pages/points/points" });
  },

  toggleQuickMode() {
    var newMode = !this.data.quickMode;
    this.setData({ quickMode: newMode, currentStep: 0 });
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
