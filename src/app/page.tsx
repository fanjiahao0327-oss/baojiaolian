"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { KYCFormData, Message } from "@/types";
import KYCWizard from "@/components/KYCWizard";
import CoachPanel from "@/components/CoachPanel";
import { useAuth } from "@/components/UserProvider";
import ConfirmModal from "@/components/ConfirmModal";

function buildUserContent(formData: KYCFormData): string {
  const kv = (label: string, value: string) => `- ${label}：${value || "未填写"}`;
  const csv = (label: string, values: string[], other?: string) => {
    const parts = [...values];
    if (other) parts.push(`其他：${other}`);
    return `- ${label}：${parts.length > 0 ? parts.join(" / ") : "未填写"}`;
  };
  return `客户信息：

## 客户画像与生活状态
${kv("名称", formData.clientName)}
${kv("性别", formData.gender === "male" ? "男" : formData.gender === "female" ? "女" : "")}
${kv("年龄", formData.age)}
${kv("所在城市", formData.city)}
${kv("身体情况", formData.healthCondition)}
${kv("婚姻状况", formData.maritalStatus)}
${kv("子女详情", formData.childrenDetail)}
${kv("父母情况", formData.parentsDetail)}
${kv("性格特征", formData.personality)}
${kv("兴趣爱好", formData.hobbies)}
${kv("补充信息", formData.step1Notes)}

## 工作与收支
${kv("行业", formData.clientIndustry)}
${kv("公司", formData.clientCompany)}
${kv("职责&职位", formData.clientPosition)}
${kv("职业发展空间", formData.careerDevelopment)}
${kv("家庭经济支柱", formData.breadwinner)}
${kv("配偶行业", formData.spouseIndustry)}
${kv("配偶公司", formData.spouseCompany)}
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
${kv("补充信息", formData.step3Notes)}

## 已有保障
${kv("保障类保险", formData.protectionInsurance)}
${kv("储蓄类保险", formData.savingsInsurance)}
${kv("其他保险", formData.otherInsurance)}
${kv("对保险的态度", formData.insuranceAttitude)}
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
  // 剔除末尾的合规免责声明
  const raw = match[1]
    .replace(/> ⚠️ .*$/m, "")
    .replace(/⚠️\s*以上内容为 AI 生成的销售沟通参考建议[\s\S]*$/, "")
    .trim();
  if (!raw) return [];
  const numbered = raw.split(/\d+\.\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (numbered.length > 1) return numbered;
  return raw.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function stripSuggestedQuestions(content: string): string {
  // 先移除 [SUGGESTED_QUESTIONS] 及之后所有内容（包含免责声明）
  let cleaned = content.replace(/\n*\[SUGGESTED_QUESTIONS\][\s\S]*$/, "");
  // 再移除可能残留的合规免责声明行
  cleaned = cleaned.replace(/\n*> ⚠️ 以上内容为 AI 生成的销售沟通参考建议[\s\S]*$/, "");
  return cleaned;
}

function parseKycUpdate(content: string): Record<string, string> | null {
  const match = content.match(/\[KYC_UPDATE\]\s*(\{[\s\S]*?\})\s*(?=\[SUGGESTED_QUESTIONS\]|$)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (typeof parsed === "object" && parsed !== null && Object.keys(parsed).length > 0) {
      return parsed;
    }
  } catch { /* JSON 解析失败 */ }
  return null;
}

function stripKycUpdate(content: string): string {
  return content.replace(/\n*\[KYC_UPDATE\]\s*\{[\s\S]*?\}\s*(?=\[SUGGESTED_QUESTIONS\]|$)/, "");
}

async function saveKycUpdate(clientId: number, updates: Record<string, string>) {
  await fetch(`/api/clients/${clientId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kycSnapshot: updates }),
  });
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const formDataRef = useRef<KYCFormData | null>(null);
  const clientIdRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState("");
  const [mobileTab, setMobileTab] = useState<"form" | "coach">("form");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [initialClientId, setInitialClientId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [kycUpdateMsg, setKycUpdateMsg] = useState("");
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cid = sp.get("clientId");
    const vid = sp.get("convId");
    if (cid) {
      const numCid = Number(cid);
      setInitialClientId(numCid);
      clientIdRef.current = numCid;
      // 从 API 拉取最新客户档案写入 formDataRef，确保追问时发送最新数据
      fetch(`/api/clients/${numCid}?_=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((client) => {
          if (client?.kyc_snapshot) {
            formDataRef.current = client.kyc_snapshot;
          }
        })
        .catch(() => {});
    }

    const loadConv = async (convId: number) => {
      try {
        const res = await fetch(`/api/conversations/${convId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.messages?.length) {
          setConversationId(data.id);
          setMessages(data.messages);
          setHasSubmitted(true);
          setMobileTab("coach");
          // 如果 URL 中没有 clientId，从对话记录中恢复
          if (!clientIdRef.current && data.clientId) {
            clientIdRef.current = data.clientId;
            fetch(`/api/clients/${data.clientId}?_=${Date.now()}`, { cache: "no-store" })
              .then((r) => r.ok ? r.json() : null)
              .then((client) => {
                if (client?.kyc_snapshot) {
                  formDataRef.current = client.kyc_snapshot;
                }
              })
              .catch(() => {});
          }
        }
      } catch { /* 静默 */ }
    };

    if (vid) {
      loadConv(Number(vid));
    } else if (cid) {
      // 没有指定对话 → 自动加载该客户的最新对话
      fetch(`/api/conversations?client_id=${cid}`)
        .then((r) => r.ok ? r.json() : [])
        .then((list: { id: number }[]) => {
          if (list.length > 0) loadConv(list[0].id);
        })
        .catch(() => {});
    }
    if (cid || vid) window.history.replaceState({}, "", "/");
  }, []);

  const doFetch = async (question: string, history: Message[] = []) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
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
      setShowRechargeModal(true);
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

  const processResponse = async (content: string) => {
    // 提取并保存 KYC 更新
    const kycUpdate = parseKycUpdate(content);
    if (kycUpdate && clientIdRef.current) {
      try {
        await saveKycUpdate(clientIdRef.current, kycUpdate);
        const fields = Object.keys(kycUpdate).map((k) => {
          const labels: Record<string, string> = {
            clientName: "名称", gender: "性别", age: "年龄", city: "所在城市",
            maritalStatus: "婚姻", childrenDetail: "子女详情", healthCondition: "身体情况",
            parentsDetail: "父母情况", personality: "性格特征", hobbies: "兴趣爱好",
            clientIndustry: "行业", clientCompany: "公司", clientPosition: "职责&职位",
            careerDevelopment: "职业发展", breadwinner: "经济支柱",
            spouseIndustry: "配偶行业", spouseCompany: "配偶公司", spousePosition: "配偶职责&职位",
            annualIncome: "家庭年收入", monthlyExpense: "月度固定支出", majorExpensePlan: "未来大额支出",
            fixedAssets: "固定资产", liquidAssets: "流动资产", liabilities: "负债情况",
            investmentAmount: "投资金额", investmentStyle: "投资偏好", riskTolerance: "风险承受能力",
            expensePressure: "支出压力",
            protectionInsurance: "保障类保险", savingsInsurance: "储蓄类保险",
            insuranceAttitude: "对保险的态度", otherInsurance: "其他保险",
            triggerScenario: "触发场景", clientOriginalWords: "客户原话",
            clientObjection: "客户异议", agentResponse: "代理人回应", pastInteraction: "历史互动",
            step1Notes: "补充信息", step2Notes: "补充信息", step3Notes: "补充信息", step4Notes: "补充信息",
          };
          return labels[k] || k;
        });
        setKycUpdateMsg(`已自动更新客户档案：${fields.join("、")}`);
        setTimeout(() => setKycUpdateMsg(""), 5000);
      } catch { /* 静默 */ }
    }
    return stripKycUpdate(stripSuggestedQuestions(content));
  };

  const stopGeneration = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setCurrentStreamingContent("");
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
      const displayContent = await processResponse(content);
      setMessages([
        { role: "user", content: question, timestamp: ts },
        { role: "coach", content: displayContent, timestamp: ts + 1 },
      ]);
      setSuggestedQuestions(parseSuggestedQuestions(content));
      setClientRefreshKey((k) => k + 1);
      // 提交成功后清除草稿
      if (user) localStorage.removeItem(`kyc_draft_${user.userId}`);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
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
      const displayContent = await processResponse(content);
      setMessages((prev) => [...prev, { role: "coach", content: displayContent, timestamp: Date.now() }]);
      setSuggestedQuestions(parseSuggestedQuestions(content));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
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
            {kycUpdateMsg && (
              <div className="mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2 animate-fade-in">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {kycUpdateMsg}
              </div>
            )}
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
              onStopGeneration={stopGeneration}
              conversationId={conversationId}
            />
          </div>
        </div>
      </div>

      {showRechargeModal && (
        <ConfirmModal
          message="积分不足，是否前往充值？"
          confirmLabel="去充值"
          onConfirm={() => { setShowRechargeModal(false); router.push("/points"); }}
          onCancel={() => setShowRechargeModal(false)}
        />
      )}

    </main>
  );
}
