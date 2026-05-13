"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { KYCFormData, Message } from "@/types";
import KYCWizard from "@/components/KYCWizard";
import CoachPanel from "@/components/CoachPanel";
import ConversationList from "@/components/ConversationList";

function buildUserContent(formData: KYCFormData): string {
  const kv = (label: string, value: string) => `- ${label}：${value || "未填写"}`;
  const csv = (label: string, values: string[], other?: string) => {
    const parts = [...values];
    if (other) parts.push(`其他：${other}`);
    return `- ${label}：${parts.length > 0 ? parts.join(" / ") : "未填写"}`;
  };
  return `客户信息：

## 客户画像与生活状态
${kv("姓名", formData.clientName)}
${kv("性别", formData.gender === "male" ? "男" : formData.gender === "female" ? "女" : "")}
${kv("年龄", formData.age)}
${kv("籍贯", formData.hometown)}
${kv("工作&居住城市", formData.city)}
${kv("身体情况", formData.healthCondition)}
${kv("婚姻状况", formData.maritalStatus)}
${kv("子女详情", formData.childrenDetail)}
${kv("父母情况", formData.parentsDetail)}
${kv("性格特征", formData.personality)}
${kv("兴趣爱好", formData.hobbies)}
${kv("补充信息", formData.step1Notes)}

## 工作与收支
${kv("行业&公司", formData.clientIndustry)}
${kv("职责&职位", formData.clientPosition)}
${kv("职业发展空间", formData.careerDevelopment)}
${kv("家庭经济支柱", formData.breadwinner)}
${kv("配偶行业&公司", formData.spouseIndustry)}
${kv("配偶职责&职位", formData.spousePosition)}
${csv("主要收入来源", formData.incomeSources.filter(s => s !== "其他"), formData.incomeSources.includes("其他") ? formData.incomeSourcesOther : undefined)}
${kv("家庭年收入（万元）", formData.annualIncome)}
${kv("月度固定支出（万元）", formData.monthlyExpense)}
${kv("未来大额支出计划", formData.majorExpensePlan)}
${kv("补充信息", formData.step2Notes)}

## 资产情况
${kv("固定资产", formData.fixedAssets)}
${kv("流动资产合计（万元）", formData.liquidAssets)}
${kv("投资金额（万元）", formData.investmentAmount)}
${kv("投资偏好", formData.investmentStyle)}
${kv("风险承受能力", formData.riskTolerance)}
${kv("负债情况", formData.liabilities)}
${kv("支出压力感知", formData.expensePressure)}
${kv("近一年重大变化", formData.recentChanges)}
${kv("补充信息", formData.step3Notes)}

## 保障类保险
${kv("医疗险", formData.medicalInsurance)}
${kv("重疾险", formData.criticalIllnessInsurance)}
${kv("意外险", formData.accidentInsurance)}
${kv("定期寿险", formData.termLifeInsurance)}

## 理财类保险
${kv("年金险", formData.annuityInsurance)}
${kv("增额终身寿险", formData.increasingLifeInsurance)}

## 其他保险及态度
${kv("其他保险", formData.otherInsurance)}
${kv("对已购保险的态度", formData.insuranceAttitude)}
${kv("补充信息", formData.step4Notes)}

## 本次面谈入口
${kv("触发场景", formData.triggerScenario)}
${kv("客户原话或背景描述", formData.clientOriginalWords)}
${kv("历史互动摘要", formData.pastInteraction)}

## 当前卡点
${kv("客户提出的异议或卡点原话", formData.clientObjection)}
${kv("代理人当时的回应方式简述", formData.agentResponse)}

请给出：1. 卡点诊断 2. 推演方向 3. 建议话术`;
}

function parseSuggestedQuestions(content: string): string[] {
  const match = content.match(/\[SUGGESTED_QUESTIONS\]\s*([\s\S]*)$/);
  if (!match || !match[1].trim()) return [];
  const raw = match[1].trim();
  const numbered = raw.split(/\d+\.\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (numbered.length > 1) return numbered;
  return raw.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function stripSuggestedQuestions(content: string): string {
  return content.replace(/\n*\[SUGGESTED_QUESTIONS\][\s\S]*$/, "");
}

export default function Home() {
  const router = useRouter();
  const formDataRef = useRef<KYCFormData | null>(null);
  const clientIdRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [mobileTab, setMobileTab] = useState<"form" | "coach">("form");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [initialClientId, setInitialClientId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cid = sp.get("clientId");
    if (cid) {
      setInitialClientId(Number(cid));
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const doFetch = async (question: string, history: Message[] = []) => {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kycData: formDataRef.current,
        question,
        history,
        clientId: clientIdRef.current,
      }),
    });

    if (response.status === 401) {
      router.push("/login");
      throw new Error("未登录");
    }
    if (response.status === 402) {
      const goRecharge = confirm("积分不足，是否前往充值？");
      if (goRecharge) router.push("/points");
      throw new Error("积分不足");
    }
    if (!response.ok) throw new Error("请求失败");

    const cid = response.headers.get("X-Conversation-Id");
    if (cid) setConversationId(Number(cid));

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value);
        setCurrentStreamingContent(fullContent);
      }
    }
    return fullContent;
  };

  const handleSubmit = async (formData: KYCFormData, clientId: number | null) => {
    formDataRef.current = formData;
    clientIdRef.current = clientId;
    setIsLoading(true);
    setHasSubmitted(true);
    setMessages([]);
    setCurrentStreamingContent("");
    setSuggestedQuestions([]);
    setMobileTab("coach");

    const question = buildUserContent(formData);
    try {
      const content = await doFetch(question);
      const ts = Date.now();
      const displayContent = stripSuggestedQuestions(content);
      setMessages([
        { role: "user", content: question, timestamp: ts },
        { role: "coach", content: displayContent, timestamp: ts + 1 },
      ]);
      setSuggestedQuestions(parseSuggestedQuestions(content));
      setClientRefreshKey((k) => k + 1);
    } catch (e) {
      if ((e as Error).message === "积分不足" || (e as Error).message === "未登录") return;
      setMessages([{ role: "coach", content: "抱歉，发生了错误，请稍后重试。", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingContent("");
    }
  };

  const sendFollowUp = async (question: string) => {
    setIsLoading(true);
    setCurrentStreamingContent("");
    setSuggestedQuestions([]);

    const userMsg: Message = { role: "user", content: question, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const content = await doFetch(question, messages);
      const displayContent = stripSuggestedQuestions(content);
      setMessages((prev) => [...prev, { role: "coach", content: displayContent, timestamp: Date.now() }]);
      setSuggestedQuestions(parseSuggestedQuestions(content));
    } catch (e) {
      if ((e as Error).message === "积分不足" || (e as Error).message === "未登录") return;
      setMessages((prev) => [...prev, { role: "coach", content: "抱歉，发生了错误，请稍后重试。", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingContent("");
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim() || isLoading) return;
    const question = followUpQuestion.trim();
    setFollowUpQuestion("");
    await sendFollowUp(question);
  };

  const handleLoadHistory = (convId: number, msgs: Message[]) => {
    setConversationId(convId);
    setMessages(msgs);
    setHasSubmitted(true);
    setShowHistory(false);
    setSuggestedQuestions([]);
    setCurrentStreamingContent("");
    setMobileTab("coach");
  };

  return (
    <main className="flex flex-col h-full">
      {/* 移动端标签切换 */}
      <div className="md:hidden flex border-b border-gray-200 bg-white shrink-0 safe-bottom">
        <button
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-all relative ${
            mobileTab === "form"
              ? "text-brand-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          信息填写
          {mobileTab === "form" && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setMobileTab("coach")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-all relative ${
            mobileTab === "coach"
              ? "text-brand-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          教练指导
          {hasSubmitted && (
            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
          {mobileTab === "coach" && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
      </div>

      {/* 桌面端左右分栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：KYC 向导 */}
        <div className={`md:block md:w-1/2 ${mobileTab === "form" ? "block" : "hidden"} w-full h-full overflow-hidden`}>
          <KYCWizard
            onSubmit={handleSubmit}
            isLoading={isLoading}
            clientRefreshKey={clientRefreshKey}
            initialClientId={initialClientId}
          />
        </div>

        {/* 右侧：教练面板 */}
        <div className={`md:block md:w-1/2 ${mobileTab === "coach" ? "block" : "hidden"} w-full h-full overflow-hidden`}>
          <div className="h-full bg-warm-gradient p-3 md:p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                历史对话
              </button>
            </div>
            <CoachPanel
              messages={messages}
              currentStreamingContent={currentStreamingContent}
              followUpQuestion={followUpQuestion}
              onFollowUpChange={setFollowUpQuestion}
              onFollowUpSubmit={handleFollowUp}
              isLoading={isLoading}
              hasSubmitted={hasSubmitted}
              suggestedQuestions={suggestedQuestions}
              onSuggestedQuestionClick={(q) => sendFollowUp(q)}
              conversationId={conversationId}
            />
          </div>
        </div>
      </div>

      <ConversationList
        active={showHistory}
        onSelect={handleLoadHistory}
        onClose={() => setShowHistory(false)}
      />
    </main>
  );
}
