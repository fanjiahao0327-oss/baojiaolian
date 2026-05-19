const api = require("../../utils/api");

// KYC 表单字段配置（与 Web 版保持一致）
const SECTIONS = [
  {
    title: "客户画像与生活状态",
    fields: [
      { key: "clientName", label: "客户名称", type: "text", required: true, placeholder: "例如：张先生、李姐" },
      { key: "gender", label: "性别", type: "radio", required: true, options: ["male", "female"] },
      { key: "age", label: "年龄", type: "number", required: true, placeholder: "年龄决定生命周期定位" },
      { key: "city", label: "所在城市", type: "text", required: true, placeholder: "例如：上海" },
      { key: "healthCondition", label: "身体情况", type: "textarea", placeholder: "例如：健康 / 有高血压/糖尿病" },
      { key: "maritalStatus", label: "婚姻状况", type: "radio", required: true, options: ["未婚", "已婚", "离异", "丧偶", "再婚"] },
      { key: "childrenDetail", label: "子女详情", type: "textarea", placeholder: "子女数量/年龄/就读阶段" },
      { key: "parentsDetail", label: "父母情况", type: "textarea", placeholder: "是否健在、是否同住、赡养责任" },
      { key: "personality", label: "性格特征", type: "textarea", placeholder: "MBTI/性格色彩/沟通偏好" },
      { key: "hobbies", label: "兴趣爱好", type: "textarea", placeholder: "反映客户愿投入时间金钱的领域" },
      { key: "step1Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "工作与收支",
    fields: [
      { key: "clientIndustry", label: "行业", type: "text", placeholder: "例如：互联网/IT、金融、教育" },
      { key: "clientCompany", label: "公司", type: "text", placeholder: "例如：字节跳动" },
      { key: "clientPosition", label: "职责&职位", type: "text", placeholder: "例如：技术专家/企业主" },
      { key: "careerDevelopment", label: "职业发展", type: "text", placeholder: "稳定上升期 / 瓶颈期 / 创业波动 / 已退休" },
      { key: "breadwinner", label: "经济支柱", type: "text", placeholder: "客户本人 / 配偶 / 夫妻共同 / 父母" },
      { key: "spouseIndustry", label: "配偶行业", type: "text" },
      { key: "spouseCompany", label: "配偶公司", type: "text" },
      { key: "spousePosition", label: "配偶职责", type: "text" },
      { key: "annualIncome", label: "家庭年收入（万元）", type: "number", placeholder: "例如：30" },
      { key: "monthlyExpense", label: "月度固定支出（万元）", type: "number", placeholder: "含房贷/车贷/生活开支" },
      { key: "majorExpensePlan", label: "未来大额支出", type: "textarea", placeholder: "购房/子女教育/医疗/养老" },
      { key: "step2Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "资产情况",
    fields: [
      { key: "fixedAssets", label: "固定资产", type: "textarea", placeholder: "例如：自住房1套、投资房1套" },
      { key: "liquidAssets", label: "流动资产（万元）", type: "number", placeholder: "现金+存款+短期理财" },
      { key: "liabilities", label: "负债情况", type: "textarea", placeholder: "例如：房贷200万/月供1.2万" },
      { key: "investmentAmount", label: "投资金额（万元）", type: "number" },
      { key: "investmentStyle", label: "投资偏好", type: "text", placeholder: "保守型 / 稳健型 / 进取型" },
      { key: "riskTolerance", label: "风险承受能力", type: "text" },
      { key: "expensePressure", label: "支出压力", type: "text" },
      { key: "step3Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "已有保障",
    fields: [
      { key: "protectionInsurance", label: "保障类保险", type: "textarea", placeholder: "例如：百万医疗/年交500元；重疾险50万保额" },
      { key: "savingsInsurance", label: "储蓄类保险", type: "textarea", placeholder: "例如：年金险年交5万×10年" },
      { key: "insuranceAttitude", label: "对保险的态度", type: "text", placeholder: "满意 / 不太清楚 / 保额不够 / 没买过" },
      { key: "otherInsurance", label: "其他保险", type: "text" },
      { key: "step4Notes", label: "补充信息", type: "textarea" },
    ],
  },
  {
    title: "面谈入口",
    fields: [
      { key: "triggerScenario", label: "触发场景", type: "text", required: true, placeholder: "主动咨询 / 非主动咨询（社交激活）" },
      { key: "clientOriginalWords", label: "客户原话或背景描述", type: "textarea", required: true, placeholder: "客户具体说了什么、在什么场景下" },
      { key: "pastInteraction", label: "历史互动摘要", type: "textarea" },
    ],
  },
  {
    title: "当前卡点",
    fields: [
      { key: "clientObjection", label: "客户异议/卡点", type: "textarea", placeholder: "例如：我再考虑考虑 / 太贵了" },
      { key: "agentResponse", label: "代理人回应", type: "textarea", placeholder: "例如：我介绍了产品的保障范围" },
    ],
  },
];

const EMPTY_FORM = {};
SECTIONS.forEach((s) => s.fields.forEach((f) => { EMPTY_FORM[f.key] = ""; }));

const LOADING_STAGES = [
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
    formData: { ...EMPTY_FORM },
    sections: SECTIONS,
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
    // 登录状态
    isLoggedIn: false,
    needBindPhone: false,
    logining: false,
  },

  onLoad() {
    this._loadingTimer = null;
    this._stageIndex = 0;
    this.checkLoginState();
    this.calcChatHeight();
  },

  onShow() {
    this.checkLoginState();
    const app = getApp();
    if (app.globalData.continueClientId) {
      const id = app.globalData.continueClientId;
      app.globalData.continueClientId = null;
      this.selectClientById(id);
    }
  },

  checkLoginState() {
    const app = getApp();
    this.setData({
      isLoggedIn: app.globalData.isLogin,
      needBindPhone: app.globalData.needBindPhone,
    });
    if (app.globalData.isLogin) {
      this.loadClients();
    }
  },

  // 微信一键登录
  async handleWechatLogin() {
    this.setData({ logining: true });
    try {
      const app = getApp();
      await app.wechatLogin();
      this.setData({
        isLoggedIn: true,
        needBindPhone: app.globalData.needBindPhone,
        logining: false,
      });
      this.loadClients();
    } catch (e) {
      this.setData({ logining: false });
      wx.showToast({ title: "登录失败，请重试", icon: "none" });
    }
  },

  // 手机号绑定（coach 页内置）
  async onGetPhoneNumber(e) {
    const { code, encryptedData, iv } = e.detail;
    if (!code && !encryptedData) {
      wx.showToast({ title: "授权已取消", icon: "none" });
      return;
    }
    wx.showLoading({ title: "绑定中", mask: true });
    try {
      const body = code ? { code } : { encryptedData, iv };
      await api.post("/api/auth/bind-phone", body);
      const app = getApp();
      app.globalData.needBindPhone = false;
      this.setData({ needBindPhone: false });
      wx.showToast({ title: "已绑定", icon: "success" });
    } catch (err) {
      console.error("[coach] bindPhone:", err);
      wx.showToast({ title: "绑定失败，请重试", icon: "none" });
    }
    wx.hideLoading();
  },

  calcChatHeight() {
    const info = wx.getSystemInfoSync();
    // windowHeight 已排除导航栏和 tabBar，只需减顶栏+输入栏
    const h = info.windowHeight - 48 - 48;
    this.setData({ chatScrollHeight: Math.max(h, 300) });
  },

  async loadClientAndHistory(id) {
    try {
      const client = await api.get(`/api/clients/${id}?_=${Date.now()}`);
      let snapshot = client.kyc_snapshot;
      if (typeof snapshot === "string") {
        try { snapshot = JSON.parse(snapshot); } catch { snapshot = {}; }
      }
      this.setData({
        selectedClientId: Number(id),
        formData: { ...EMPTY_FORM, ...(snapshot || {}) },
        showClientPicker: false,
      });
      const convs = await api.get(`/api/conversations?client_id=${id}`);
      if (convs && convs.length > 0) {
        const conv = await api.get(`/api/conversations/${convs[0].id}`);
        if (conv && conv.messages) {
          this.setData({ messages: conv.messages, hasSubmitted: true, conversationId: conv.id, tab: "coach" });
        }
      }
    } catch (e) {
      console.error("[coach] loadClientAndHistory:", e);
    }
  },

  async selectClientById(id) {
    await this.loadClientAndHistory(id);
  },

  loadClients() {
    api.get("/api/clients").then((list) => {
      this.setData({ clients: list || [] });
    }).catch(() => {});
  },

  // 客户选择
  toggleClientPicker() {
    this.setData({ showClientPicker: !this.data.showClientPicker });
  },

  async selectClient(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      this.setData({ selectedClientId: null, formData: { ...EMPTY_FORM }, showClientPicker: false });
      return;
    }
    await this.loadClientAndHistory(id);
  },

  // 表单输入
  onFieldChange(e) {
    const { key } = e.currentTarget.dataset;
    const val = e.detail.value !== undefined ? e.detail.value : e.currentTarget.dataset.val;
    this.setData({ [`formData.${key}`]: val });
  },

  // 步骤导航
  nextStep() {
    const { currentStep } = this.data;
    const section = SECTIONS[currentStep];
    const missing = section.fields.filter((f) => f.required && !this.data.formData[f.key]);
    if (missing.length > 0) {
      wx.showToast({ title: `请填写：${missing[0].label}`, icon: "none" });
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

  // 提交 KYC 表单
  async submitForm() {
    const missing = SECTIONS.flatMap((s) => s.fields.filter((f) => f.required && !this.data.formData[f.key]));
    if (missing.length > 0) {
      wx.showToast({ title: `请填写：${missing[0].label}`, icon: "none" });
      return;
    }
    this.setData({ isLoading: true });
    this._startLoadingText();

    try {
      const res = await api.post("/api/coach", {
        kycData: this.data.formData,
        question: this.buildUserContent(),
        history: [],
        clientId: this.data.selectedClientId,
        noStream: true,
      });

      this._stopLoadingText();
      const msg = { role: "user", content: this.buildUserContent(), timestamp: Date.now() };
      const reply = { role: "coach", content: res.content, timestamp: Date.now() + 1 };
      this.setData({
        hasSubmitted: true,
        tab: "coach",
        messages: [msg, reply],
        conversationId: res.conversationId,
        isLoading: false,
      });
      setTimeout(() => this.scrollChatToBottom(), 300);
    } catch (e) {
      this._stopLoadingText();
      wx.showToast({ title: "提交失败，请重试", icon: "none" });
      this.setData({ isLoading: false });
    }
  },

  buildUserContent() {
    const d = this.data.formData;
    const kv = (label, val) => `- ${label}：${val || "未填写"}`;
    return `客户信息：

## 客户画像与生活状态
${kv("名称", d.clientName)}
${kv("性别", d.gender === "male" ? "男" : d.gender === "female" ? "女" : "")}
${kv("年龄", d.age)}
${kv("所在城市", d.city)}
${kv("身体情况", d.healthCondition)}
${kv("婚姻状况", d.maritalStatus)}
${kv("子女详情", d.childrenDetail)}
${kv("父母情况", d.parentsDetail)}
${kv("性格特征", d.personality)}
${kv("兴趣爱好", d.hobbies)}
${kv("补充信息", d.step1Notes)}

## 工作与收支
${kv("行业", d.clientIndustry)}
${kv("公司", d.clientCompany)}
${kv("职责&职位", d.clientPosition)}
${kv("职业发展空间", d.careerDevelopment)}
${kv("家庭经济支柱", d.breadwinner)}
${kv("配偶行业", d.spouseIndustry)}
${kv("配偶公司", d.spouseCompany)}
${kv("配偶职责&职位", d.spousePosition)}
${kv("家庭年收入（万元）", d.annualIncome)}
${kv("月度固定支出（万元）", d.monthlyExpense)}
${kv("未来大额支出计划", d.majorExpensePlan)}
${kv("补充信息", d.step2Notes)}

## 资产情况
${kv("固定资产", d.fixedAssets)}
${kv("流动资产合计（万元）", d.liquidAssets)}
${kv("负债情况", d.liabilities)}
${kv("投资金额（万元）", d.investmentAmount)}
${kv("投资偏好", d.investmentStyle)}
${kv("风险承受能力", d.riskTolerance)}
${kv("支出压力感知", d.expensePressure)}
${kv("补充信息", d.step3Notes)}

## 已有保障
${kv("保障类保险", d.protectionInsurance)}
${kv("储蓄类保险", d.savingsInsurance)}
${kv("对保险的态度", d.insuranceAttitude)}
${kv("其他保险", d.otherInsurance)}
${kv("补充信息", d.step4Notes)}

## 本次面谈入口
${kv("触发场景", d.triggerScenario)}
${kv("客户原话或背景描述", d.clientOriginalWords)}
${kv("历史互动摘要", d.pastInteraction)}

## 当前卡点
${kv("客户提出的异议或卡点原话", d.clientObjection)}
${kv("代理人当时的回应方式简述", d.agentResponse)}

请给出：1. 卡点诊断 2. 推演方向 3. 建议话术`;
  },

  // 追问
  onFollowUpInput(e) {
    this.setData({ followUp: e.detail.value });
  },

  async sendFollowUp() {
    const question = this.data.followUp.trim();
    if (!question || this.data.isLoading) return;

    this.setData({ followUp: "", isLoading: true });
    this._startLoadingText();
    const userMsg = { role: "user", content: question, timestamp: Date.now() };
    const prevMessages = this.data.messages;
    const messages = [...prevMessages, userMsg];
    this.setData({ messages });

    try {
      const res = await api.post("/api/coach", {
        kycData: {},
        question,
        history: prevMessages,
        clientId: this.data.selectedClientId,
        noStream: true,
      });

      this._stopLoadingText();
      const reply = { role: "coach", content: res.content, timestamp: Date.now() };
      this.setData({ messages: [...this.data.messages, reply], isLoading: false, conversationId: res.conversationId });
      setTimeout(() => this.scrollChatToBottom(), 300);
    } catch (e) {
      this._stopLoadingText();
      const errMsg = { role: "coach", content: "抱歉，发生了错误，请稍后重试。", timestamp: Date.now() };
      this.setData({ messages: [...this.data.messages, errMsg], isLoading: false });
    }
  },

  // 加载动画文案轮播
  _startLoadingText() {
    this._stageIndex = 0;
    this.setData({ loadingText: LOADING_STAGES[0] });
    this._loadingTimer = setInterval(() => {
      this._stageIndex = (this._stageIndex + 1) % LOADING_STAGES.length;
      this.setData({ loadingText: LOADING_STAGES[this._stageIndex] });
    }, 1500);
  },

  _stopLoadingText() {
    if (this._loadingTimer) {
      clearInterval(this._loadingTimer);
      this._loadingTimer = null;
    }
  },

  // 滚动监听
  onChatScroll(e) {
    const { scrollTop, scrollHeight } = e.detail;
    const threshold = 200;
    const nearBottom = scrollTop + this.data.chatScrollHeight >= scrollHeight - threshold;
    if (this.data.scrollToBottom === nearBottom) {
      this.setData({ scrollToBottom: !nearBottom });
    }
  },

  scrollChatToBottom() {
    this.setData({ scrollToBottom: false });
    // 用 scroll-into-view 跳到最后一条消息
    const lastIdx = this.data.messages.length - 1;
    if (lastIdx >= 0) {
      this.setData({ scrollIntoView: `msg-${lastIdx}` });
    }
  },

  // Tab 切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === "coach") {
      this.calcChatHeight();
      // 切到教练页时自动滚到底部
      setTimeout(() => this.scrollChatToBottom(), 300);
    }
  },
});
