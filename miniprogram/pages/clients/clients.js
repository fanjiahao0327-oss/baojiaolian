const api = require("../../utils/api");

const KYC_DISPLAY_SECTIONS = [
  {
    title: "客户画像与生活状态",
    fields: ["clientName", "gender", "age", "city", "maritalStatus", "healthCondition", "childrenDetail", "parentsDetail", "personality", "hobbies", "step1Notes"],
    labels: { clientName: "名称", gender: "性别", age: "年龄", city: "所在城市", maritalStatus: "婚姻", healthCondition: "身体情况", childrenDetail: "子女详情", parentsDetail: "父母情况", personality: "性格特征", hobbies: "兴趣爱好", step1Notes: "补充信息" },
  },
  {
    title: "工作与收支",
    fields: ["clientIndustry", "clientCompany", "clientPosition", "careerDevelopment", "breadwinner", "spouseIndustry", "spouseCompany", "spousePosition", "annualIncome", "monthlyExpense", "majorExpensePlan", "step2Notes"],
    labels: { clientIndustry: "行业", clientCompany: "公司", clientPosition: "职责&职位", careerDevelopment: "职业发展", breadwinner: "经济支柱", spouseIndustry: "配偶行业", spouseCompany: "配偶公司", spousePosition: "配偶职责", annualIncome: "家庭年收入（万）", monthlyExpense: "月度固定支出（万）", majorExpensePlan: "未来大额支出", step2Notes: "补充信息" },
  },
  {
    title: "资产情况",
    fields: ["fixedAssets", "liquidAssets", "liabilities", "investmentAmount", "investmentStyle", "riskTolerance", "expensePressure", "step3Notes"],
    labels: { fixedAssets: "固定资产", liquidAssets: "流动资产（万）", liabilities: "负债情况", investmentAmount: "投资金额（万）", investmentStyle: "投资偏好", riskTolerance: "风险承受能力", expensePressure: "支出压力", step3Notes: "补充信息" },
  },
  {
    title: "已有保障",
    fields: ["protectionInsurance", "savingsInsurance", "insuranceAttitude", "otherInsurance", "step4Notes"],
    labels: { protectionInsurance: "保障类保险", savingsInsurance: "储蓄类保险", insuranceAttitude: "对保险的态度", otherInsurance: "其他保险", step4Notes: "补充信息" },
  },
  {
    title: "面谈入口",
    fields: ["triggerScenario", "clientOriginalWords", "pastInteraction"],
    labels: { triggerScenario: "触发场景", clientOriginalWords: "客户原话", pastInteraction: "历史互动" },
  },
  {
    title: "当前卡点",
    fields: ["clientObjection", "agentResponse"],
    labels: { clientObjection: "客户异议/卡点", agentResponse: "代理人回应" },
  },
];

// 长文本字段（编辑时用 textarea）
const LONG_TEXT_FIELDS = new Set([
  "healthCondition", "childrenDetail", "parentsDetail", "personality", "hobbies",
  "step1Notes", "majorExpensePlan", "step2Notes",
  "fixedAssets", "liabilities", "step3Notes",
  "protectionInsurance", "savingsInsurance", "step4Notes",
  "clientOriginalWords", "pastInteraction", "clientObjection", "agentResponse",
]);
// 数字字段
const NUMBER_FIELDS = new Set([
  "age", "annualIncome", "monthlyExpense", "liquidAssets", "investmentAmount",
]);

Page({
  data: {
    clients: [],
    loading: true,
    selected: null,
    sections: [],
    editData: {},
    editing: false,
    collapsedSections: {},
  },

  onLoad() { this.loadClients(); },
  onShow() { this.loadClients(); },

  onPullDownRefresh() {
    var self = this;
    this.loadClients().then(function () {
      wx.stopPullDownRefresh();
    }).catch(function () {
      wx.stopPullDownRefresh();
    });
  },

  loadClients() {
    this.setData({ loading: true });
    return api.get("/api/clients").then((list) => {
      const formatted = (list || []).map((c) => ({
        ...c,
        updated_at: c.updated_at ? this.formatTime(c.updated_at) : "",
      }));
      this.setData({ clients: formatted, loading: false });
    }).catch(() => this.setData({ loading: false }));
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

  async viewClient(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: "加载中" });
    try {
      const data = await api.get(`/api/clients/${id}`);
      let kyc = {};
      try {
        kyc = typeof data.kyc_snapshot === "string" ? JSON.parse(data.kyc_snapshot) : (data.kyc_snapshot || {});
      } catch { kyc = {}; }
      data.kyc_snapshot = kyc;
      const sections = this.buildSections(kyc);
      const editData = {};
      Object.entries(kyc).forEach(([k, v]) => { if (v !== undefined && v !== null) editData[k] = v; });
      this.setData({ selected: data, sections, editData, collapsedSections: {}, editing: false });
    } catch (e) { console.error("[clients]", e); }
    wx.hideLoading();
  },

  buildSections(kyc) {
    return KYC_DISPLAY_SECTIONS.map((sec) => ({
      title: sec.title,
      items: sec.fields.map((key) => {
        const val = this.formatVal(key, kyc[key]);
        const truncated = val && val.length > 40;
        return {
          key,
          label: sec.labels[key] || key,
          value: val,
          _truncated: truncated,
          _expanded: false,
          _isLong: LONG_TEXT_FIELDS.has(key),
          _isNumber: NUMBER_FIELDS.has(key),
        };
      }).filter((it) => it.value),
    }));
  },

  formatVal(key, val) {
    if (Array.isArray(val)) return val.join("、");
    if (val === "" || val === null || val === undefined) return "";
    if (key === "gender") return val === "male" ? "男" : val === "female" ? "女" : String(val);
    return String(val);
  },

  toggleValueExpand(e) {
    const { key, idx } = e.currentTarget.dataset;
    const sections = [...this.data.sections];
    const items = sections[idx].items;
    const item = items.find((it) => it.key === key);
    if (item) item._expanded = !item._expanded;
    this.setData({ sections });
  },

  enterEdit() {
    const editData = {};
    Object.entries(this.data.selected.kyc_snapshot || {}).forEach(([k, v]) => {
      editData[k] = Array.isArray(v) ? v.join("、") : (v !== undefined && v !== null ? String(v) : "");
    });
    this.setData({ editing: true, editData, collapsedSections: {} });
  },

  cancelEdit() { this.setData({ editing: false }); },

  onEditField(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [`editData.${key}`]: e.detail.value });
  },

  async saveKyc() {
    wx.showLoading({ title: "保存中" });
    try {
      const kycSnapshot = { ...this.data.selected.kyc_snapshot };
      Object.keys(kycSnapshot).forEach((k) => {
        if (this.data.editData[k] !== undefined) kycSnapshot[k] = this.data.editData[k];
      });
      Object.entries(this.data.editData).forEach(([k, v]) => {
        if (!(k in kycSnapshot) && v) kycSnapshot[k] = v;
      });
      await api.put(`/api/clients/${this.data.selected.id}`, { kycSnapshot });
      const sections = this.buildSections(kycSnapshot);
      this.setData({
        selected: { ...this.data.selected, kyc_snapshot: kycSnapshot },
        sections,
        editing: false,
      });
      wx.showToast({ title: "保存成功", icon: "success" });
      this.loadClients();
    } catch (e) { console.error("[clients] saveKyc:", e); }
    wx.hideLoading();
  },

  continueCoach() {
    const app = getApp();
    app.globalData.continueClientId = this.data.selected.id;
    wx.switchTab({ url: "/pages/coach/coach" });
  },

  toggleSection(e) {
    const idx = e.currentTarget.dataset.idx;
    const collapsed = { ...this.data.collapsedSections };
    if (collapsed[idx]) delete collapsed[idx];
    else collapsed[idx] = true;
    this.setData({ collapsedSections: collapsed });
  },

  goBack() { this.setData({ selected: null }); },
});
