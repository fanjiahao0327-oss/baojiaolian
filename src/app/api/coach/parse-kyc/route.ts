import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAIClient } from "@/lib/ai-client";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const rl = rateLimit(`parse-kyc:${session.userId}`, "coach");
  if (!rl.allowed) {
    return NextResponse.json({ error: `请求过于频繁，请 ${rl.resetIn} 秒后再试` }, { status: 429 });
  }

  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return NextResponse.json({ error: "语音内容太短" }, { status: 400 });
    }

    const prompt = `你是一个保险客户信息提取助手。从代理人的口述中提取以下字段（如果没提到的字段留空或不输出该字段）：

可提取的字段列表：
- clientName: 客户称呼（如"张先生""李姐"）
- age: 客户年龄（数字）
- gender: 性别（"male"或"female"）
- city: 所在城市
- maritalStatus: 婚姻状况（未婚/已婚/离异/丧偶/再婚）
- childrenDetail: 子女详情（如"儿子/8岁/公立小学"）
- healthCondition: 身体情况
- clientIndustry: 行业
- clientCompany: 公司
- clientPosition: 职位
- careerDevelopment: 职业发展（稳定上升期/瓶颈期面临裁员/创业自雇波动大/已退休全职家庭）
- breadwinner: 家庭经济支柱（客户本人/配偶/夫妻共同/父母）
- annualIncome: 家庭年收入（万元，只填数字）
- monthlyExpense: 月度支出（万元，只填数字）
- majorExpensePlan: 未来大额支出计划
- fixedAssets: 固定资产
- liquidAssets: 流动资产（万元）
- investmentAmount: 投资金额（万元）
- investmentStyle: 投资偏好（保守型/稳健型/进取型）
- riskTolerance: 风险承受能力（低/中/高）
- expensePressure: 支出压力（无明显经济压力/有房贷或房租压力/子女教育开销较大/日常消费高难以存下钱）
- protectionInsurance: 保障类保险（如"百万医疗/年交500元"）
- savingsInsurance: 储蓄类保险
- insuranceAttitude: 对保险的态度（满意配置全面/买了但不太清楚保障内容/觉得保额不够想补充/没买过商业保险/对保险持怀疑或排斥态度）
- triggerScenario: 触发场景（客户主动咨询有明确原话/非主动咨询代理人通过社交激活话题）
- clientOriginalWords: 客户原话或背景描述
- clientObjection: 客户异议或卡点
- agentResponse: 代理人当时的回应
- pastInteraction: 历史互动摘要
- personality: 性格特征
- hobbies: 兴趣爱好
- parentsDetail: 父母情况

规则：
1. 只提取代理人明确提到的信息，不要推测或编造
2. 如果同一信息有多个版本，取最明确的
3. 数字字段去掉单位，只保留数字
4. 以 JSON 格式输出，key 用英文字段名，value 用中文

代理人原话：
${text}

请输出 JSON：`;

    const completion = await getAIClient().chat.completions.create({
      model: "deepseek-v4-pro",
      temperature: 0.1,
      messages: [
        { role: "system", content: "你是一个精确的信息提取工具。只输出 JSON，不要任何解释。" },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      stream: false,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let fields: Record<string, string> = {};
    try {
      fields = JSON.parse(raw);
    } catch {
      // 尝试提取 JSON
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { fields = JSON.parse(match[0]); } catch {}
      }
    }

    return NextResponse.json({ fields });
  } catch (e) {
    console.error("[parse-kyc]", e);
    return NextResponse.json({ error: "解析失败" }, { status: 500 });
  }
}
