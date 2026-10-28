import { buildCoachMessages } from "@/lib/coach-prompt";
import { getAIClient, noThinkingConfig, thinkingMaxConfig } from "@/lib/ai-client";
import { ensureCoachResponseCompliance } from "@/lib/coach-compliance";
import { buildObjectionFollowupQuestion } from "@/lib/objection-followup";
import { buildPreMeetingPrepQuestion } from "@/lib/pre-meeting-prep";
import type { CoachMode } from "@/types";
import type { EvalCase, EvalCategory } from "./types";

interface CoachRequest {
  mode: CoachMode;
  question: string;
}

function modeForCategory(category: EvalCategory): CoachMode {
  if (category === "pre_meeting") return "pre_meeting_prep";
  if (category === "objection_handling") return "objection_followup";
  return "diagnosis";
}

export function buildCoachRequestForCase(
  evalCase: Pick<EvalCase, "category" | "user_input">,
): CoachRequest {
  const mode = modeForCategory(evalCase.category);
  if (mode === "pre_meeting_prep") {
    return {
      mode,
      question: buildPreMeetingPrepQuestion({
        meetingPurpose: "first_meeting",
        meetingBackground: evalCase.user_input,
        knownCustomerInfo: "",
        worryPoint: "",
        desiredOutcome: "discover_needs",
      }),
    };
  }
  if (mode === "objection_followup") {
    return {
      mode,
      question: buildObjectionFollowupQuestion({
        customerWords: evalCase.user_input,
        scenario: "after_meeting",
        customerBackground: "",
        agentReply: "",
        nextGoal: "wechat",
      }),
    };
  }
  return { mode, question: evalCase.user_input };
}

export async function generateCoachAnswer(evalCase: EvalCase): Promise<string> {
  const request = buildCoachRequestForCase(evalCase);
  const { messages, moduleIds } = buildCoachMessages({
    mode: request.mode,
    question: request.question,
    kycData: {
      triggerScenario: evalCase.category,
      clientOriginalWords: evalCase.user_input,
      clientObjection: evalCase.user_input,
    },
  });
  console.log(`[eval:${evalCase.case_id}] coach modules=${moduleIds.join(",")}`);

  const completion = await getAIClient().chat.completions.create({
    ...thinkingMaxConfig(),
    messages,
    stream: false,
  });
  const answer = completion.choices[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("AI 保险教练未返回内容");
  }

  const complianceResult = await ensureCoachResponseCompliance(
    answer,
    async (rewritePrompt) => {
      const rewriteCompletion = await getAIClient().chat.completions.create({
        ...noThinkingConfig(),
        max_tokens: 8192,
        messages: [
          ...messages,
          { role: "assistant", content: answer },
          { role: "user", content: rewritePrompt },
        ],
        stream: false,
      });
      return rewriteCompletion.choices[0]?.message?.content?.trim() || "";
    },
  );
  return complianceResult.content;
}
