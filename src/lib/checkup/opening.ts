import { getAIClient, noThinkingConfig } from "@/lib/ai-client";
import { CHECKUP_MODULES, selectModuleIds, type ModuleId } from "./modules";
import type { IntakeProfile } from "./profile";
import type { Question } from "./types";

const DIRECTION_SOURCE = "一丁统一 KYC·阶段二“围绕客户刚谈到的主题”；陈庚预咨询“先接住、不马上盘问”";

function topicIds(profile: IntakeProfile): ModuleId[] {
  return selectModuleIds(profile).filter((id) => id !== "family" && id !== "financial");
}

function labelOf(id: ModuleId): string {
  return CHECKUP_MODULES[id].title;
}

/** 开场之后先给 3–4 个方向，不直接进入模块题海。 */
export function buildDirectionQuestion(profile: IntakeProfile): Question {
  const topics = topicIds(profile);
  const options: Array<{ value: string; label: string }> = [];
  const shown = topics.slice(0, 3);
  if (shown.length >= 3) {
    for (const id of shown) options.push({ value: id, label: `先聊${labelOf(id)}` });
    options.push({ value: "both", label: "都聊，按顺序来" });
  } else if (shown.length === 2) {
    options.push({ value: shown[0], label: `先聊${labelOf(shown[0])}` });
    options.push({ value: shown[1], label: `先聊${labelOf(shown[1])}` });
    options.push({ value: "both", label: "两块都想聊，按顺序来" });
    options.push({ value: "family", label: "我先补充家庭情况" });
  } else if (shown.length === 1) {
    options.push({ value: shown[0], label: `先聊${labelOf(shown[0])}` });
    options.push({ value: "family", label: "先补家庭情况" });
    options.push({ value: "both", label: "都行，你按顺序问" });
  } else {
    options.push({ value: "family", label: "先聊家庭结构" });
    options.push({ value: "care", label: "先聊已有保障" });
    options.push({ value: "both", label: "按你的顺序来" });
  }

  const topicText = shown.length ? shown.map(labelOf).join("、") + (topics.length > 3 ? "等" : "") : "家庭和保障";
  return {
    id: "direction",
    dimension: "family",
    field: "direction",
    prompt: `你刚才提到${topicText}。我们先把哪一块聊透？`,
    options,
    allowFreeText: true,
    required: false,
    weight: 1,
    hint: "选一个方向就行；也可以直接打字补充，或者选“按你的顺序来”。",
    source: DIRECTION_SOURCE,
    purpose: "让客户自己决定先聊哪一块，避免我按题库顺序硬推",
  };
}

const FALLBACK: Record<string, string> = {
  medical:
    "你刚才提到医疗。能多说一点吗：如果现在要花一笔大钱，你最担心的是治疗费、医院和医生选择，还是收入中断？",
  retirement:
    "你刚才提到养老。你希望退休后每个月大概有多少钱进来？现在最没底的是哪一笔：日常生活、看病照护，还是给孩子的钱？",
  inheritance:
    "你刚才提到传承。你最想照顾的是谁？你希望这笔钱在什么时候、以什么方式给到他？",
  marriage:
    "你刚才提到婚姻。你更担心婚前/婚内财产边界，还是配偶的债务会影响家庭？",
  business:
    "你刚才提到企业。企业如果出问题，你最担心的是家庭资产被牵连，还是将来没人接班？",
  education:
    "你刚才提到孩子教育。你希望孩子未来走国内还是出国？大概哪一年要用这笔钱？",
  family:
    "你刚才说的情况里，家里现在最需要你照顾的是谁？孩子多大、父母那边需要你们支持吗？",
};

function fallbackQuestion(direction: string, profile: IntakeProfile): Question {
  const key = (FALLBACK[direction] ? direction : profile.concerns[0] ?? "family") as string;
  const prompt = FALLBACK[key] ?? FALLBACK.family;
  return {
    id: "opening_followup",
    dimension: "family",
    field: "openingFollowup",
    prompt,
    options: [],
    allowFreeText: true,
    required: false,
    weight: 1,
    openOnly: true,
    hint: "可以多说一点，想到哪说到哪；不想说也可以跳过。",
    guidance: "比如：最近发生了什么、你最担心谁、最怕出现什么结果、家里大概几口人。",
    source: "苏颖 KYC→UYC“信息联想→待确认”；一丁 KYC 阶段二“一次只解决当前判断”",
    purpose: "基于客户自己的原话和选择，补一个真正会改变判断的开放信息",
  };
}

/**
 * 客户选完方向后，用模型基于他的原话生成一个开放追问；失败时退回固定问法。
 * 文本只在内存里使用，不落库、不写日志。
 */
export async function buildOpeningFollowUp(
  profile: IntakeProfile,
  direction: string,
  openingText: string,
): Promise<Question> {
  const fallback = fallbackQuestion(direction, profile);
  const clean = openingText.trim().slice(0, 1200);
  if (!clean || !process.env.DEEPSEEK_API_KEY) return fallback;

  const directionLabel =
    direction === "both" || direction === "family"
      ? "客户想先补家庭/按顺序来"
      : CHECKUP_MODULES[direction as ModuleId]?.title ?? "客户提到的方向";

  try {
    const completion = await getAIClient().chat.completions.create({
      ...noThinkingConfig(),
      max_tokens: 260,
      messages: [
        {
          role: "system",
          content:
            "你是家庭风险测评的顾问。请基于客户原话，生成一个开放式追问，只输出 JSON：{\"question\":\"这一句问题\"}。不要给选项、不要下结论、不要推销。要求：一次只问一个问题；围绕客户提到的方向或明显缺口；让客户能用自己的话回答；30-70 个中文字；不要出现产品名、公司名、收益承诺。",
        },
        {
          role: "user",
          content: `客户开场原话：${clean}\n客户选择先聊：${directionLabel}\n请生成一个开放追问。`,
        },
      ],
      response_format: { type: "json_object" },
    } as never);
    const content = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content) as { question?: string };
    const text = String(parsed.question || "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 8 || text.length > 220 || /[ABCD][.．、]/.test(text)) return fallback;
    return {
      ...fallback,
      prompt: text,
      source: "模型基于客户原话生成；规则出处：苏颖 KYC→UYC、一丁 KYC 阶段二",
    };
  } catch {
    return fallback;
  }
}
