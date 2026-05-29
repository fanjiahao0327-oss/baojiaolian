/**
 * DeepSeek V4 全局 AI 客户端
 *
 * V4 Pro 规格：1M 输入上下文 / 384K 最大输出（默认 4096）
 * 思考模式：默认开启，reasoning_effort 支持 high/max
 * 上下文缓存：自动启用（磁盘 KV Cache），公共前缀自动命中，无需额外配置
 *
 * 官方文档：https://api-docs.deepseek.com/zh-cn/
 */
import OpenAI from "openai";

// ============================================================
// 全局配置常量
// ============================================================

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEFAULT_MODEL = "deepseek-v4-pro" as const;

/** 非思考模式参数 — V4 官方默认 temperature=1.0/top_p=1.0，教练场景需更稳定输出 */
export const NON_THINKING_PARAMS = {
  temperature: 0.7,
  top_p: 0.92,
} as const;

export const REASONING_EFFORT = { HIGH: "high", MAX: "max" } as const;

/**
 * 思考模式最大输出 token 数。
 * V4 Pro 默认仅 4096，教练诊断输出可达 8-12K，设 16K 留有余量。
 */
const THINKING_MAX_TOKENS = 16384;

// ============================================================
// 定价（2026-05 永久生效，已含 75% 折扣，单位：USD/百万 tokens）
// ============================================================

export const PRICING = {
  /** 输入 — 缓存命中（prefix match） */
  INPUT_CACHE_HIT: 0.003625,
  /** 输入 — 缓存未命中（新前缀） */
  INPUT_CACHE_MISS: 0.435,
  /** 输出（含思考 token，同价） */
  OUTPUT: 0.87,
} as const;

// ============================================================
// 上下文缓存说明
// ============================================================
//
// DeepSeek V4 默认为所有用户启用磁盘 KV Cache（兼容 OpenAI 的自动缓存行为）。
// 缓存命中条件：后续请求的前缀（从第一条消息开始）必须与已持久化的缓存前缀完全匹配。
// 持久化时机：请求边界 / 公共前缀检测 / 固定 token 间隔。
//
// 本项目的缓存优化策略：
// 1. System prompt 中 CORE + METHOD 模块始终在最前面（~6500 token），
//    且内容固定不变，多用户多请求间共享为公共前缀，≈ 100% 缓存命中。
// 2. Reference 模块紧随其后（~2000 token），因按 KYC 动态选择而经常变化。
// 3. 传入 user_id 参数可隔离不同用户的缓存，避免相互污染。
// 4. 追问模式下 system prompt 仅含 CORE 模块（~2500 token），缓存命中率更高。

// ============================================================
// 单例客户端
// ============================================================

let _openai: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      baseURL: DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return _openai;
}

// ============================================================
// 预置模式
// ============================================================

/** 非思考模式 — 通用对话、简单任务 */
export function noThinkingConfig(opts?: { userId?: number }) {
  return {
    model: DEFAULT_MODEL,
    ...NON_THINKING_PARAMS,
    ...(opts?.userId != null ? { user_id: String(opts.userId) } : {}),
    extra_body: { thinking: { type: "disabled" } },
  } as const;
}

/** 思考模式 high — 中等复杂度（调试、设计、规划） */
export function thinkingHighConfig(opts?: { userId?: number }) {
  return {
    model: DEFAULT_MODEL,
    max_tokens: THINKING_MAX_TOKENS,
    ...(opts?.userId != null ? { user_id: String(opts.userId) } : {}),
    extra_body: { reasoning_effort: REASONING_EFFORT.HIGH },
  } as const;
}

/** 思考模式 max — 复杂 Agent 场景（教练诊断、多维度分析） */
export function thinkingMaxConfig(opts?: { userId?: number }) {
  return {
    model: DEFAULT_MODEL,
    max_tokens: THINKING_MAX_TOKENS,
    ...(opts?.userId != null ? { user_id: String(opts.userId) } : {}),
    extra_body: { reasoning_effort: REASONING_EFFORT.MAX },
  } as const;
}

// ============================================================
// Token 用量 & 成本计算
// ============================================================

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

export interface CostBreakdown {
  inputCacheHitCost: number;
  inputCacheMissCost: number;
  outputCost: number;
  totalCost: number;
  cacheHitRate: number;
}

/**
 * 根据 DeepSeek 返回的 usage 计算实际成本（USD）。
 * 兼容流式模式的 usage chunk（仅含 prompt_tokens/completion_tokens）。
 */
export function calcCost(usage: TokenUsage): CostBreakdown {
  const hitTokens = usage.prompt_cache_hit_tokens ?? 0;
  const missTokens = usage.prompt_cache_miss_tokens ?? 0;
  const totalInput = usage.prompt_tokens;

  // 如果 API 返回了分项数据则用分项，否则假设全部为 miss（保守估计）
  const effectiveMiss = hitTokens + missTokens > 0
    ? missTokens
    : totalInput;
  const effectiveHit = hitTokens + missTokens > 0
    ? hitTokens
    : 0;

  const inputCacheHitCost = (effectiveHit / 1_000_000) * PRICING.INPUT_CACHE_HIT;
  const inputCacheMissCost = (effectiveMiss / 1_000_000) * PRICING.INPUT_CACHE_MISS;
  const outputCost = (usage.completion_tokens / 1_000_000) * PRICING.OUTPUT;

  return {
    inputCacheHitCost,
    inputCacheMissCost,
    outputCost,
    totalCost: inputCacheHitCost + inputCacheMissCost + outputCost,
    cacheHitRate: totalInput > 0 ? effectiveHit / totalInput : 0,
  };
}

/** 生成简洁的成本日志行 */
export function formatCostLog(
  conversationId: number,
  usage: TokenUsage,
  deduct: number,
): string {
  const cost = calcCost(usage);
  const parts = [
    `conv=${conversationId}`,
    `in=${usage.prompt_tokens}/${usage.completion_tokens}out`,
  ];
  if (usage.prompt_cache_hit_tokens != null) {
    parts.push(`cache=${cost.cacheHitRate.toFixed(0)}%`);
  }
  parts.push(`$${cost.totalCost.toFixed(5)}`, `pts=${deduct}`);
  return `[coach] ${parts.join(" ")}`;
}

// ============================================================
// History 清理工具
// ============================================================

/**
 * 移除消息中的 reasoning_content。
 * DeepSeek V4 禁止在多轮对话中传入 reasoning_content，否则 400 错误。
 */
export function stripReasoningContent(
  messages: Array<{ role: string; content: string; reasoning_content?: string }>
): Array<{ role: string; content: string }> {
  return messages.map(({ content, role }) => ({ role, content }));
}

// ============================================================
// 对话消息构建
// ============================================================

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildMessages(params: {
  systemPrompt: string;
  history?: Array<{ role: string; content: string }>;
  currentQuestion: string;
  injectBeforeUser?: string;
}): AIMessage[] {
  const msgs: AIMessage[] = [{ role: "system", content: params.systemPrompt }];

  if (params.history?.length) {
    const cleaned = stripReasoningContent(params.history as any[]);
    for (const h of cleaned) {
      if (h.role === "user") msgs.push({ role: "user", content: h.content });
      else if (h.role === "assistant" || h.role === "coach")
        msgs.push({ role: "assistant", content: h.content });
    }
    if (params.injectBeforeUser) {
      msgs.push({ role: "user", content: params.injectBeforeUser });
    }
  }

  msgs.push({ role: "user", content: params.currentQuestion });
  return msgs;
}

// ============================================================
// 流式 chunk 解析
// ============================================================

export interface StreamTextChunk { type: "text"; content: string; }
export interface StreamReasoningChunk { type: "reasoning"; content: string; }
export type ParsedStreamChunk = StreamTextChunk | StreamReasoningChunk;

export function parseStreamChunk(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk
): ParsedStreamChunk | null {
  const delta = chunk.choices?.[0]?.delta as Record<string, unknown> | undefined;
  if (!delta) return null;
  if (delta.reasoning_content) {
    return { type: "reasoning", content: delta.reasoning_content as string };
  }
  if (delta.content) {
    return { type: "text", content: delta.content as string };
  }
  return null;
}
