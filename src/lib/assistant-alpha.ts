export type ClientStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const CLIENT_STAGE_LABELS: Record<ClientStage, string> = {
  1: "待激活关系",
  2: "已恢复联系",
  3: "初步了解",
  4: "需求探索",
  5: "需求明确",
  6: "方案准备",
  7: "方案沟通",
  8: "决策跟进",
  9: "已成交并持续服务",
  10: "暂缓或停止推进",
};

export type MemoryStatus = "proposed" | "confirmed" | "rejected";
export type MemoryScope = "agent" | "client" | "global";
export type TaskPriority = "must" | "suggested" | "long_term";
export type TaskStatus = "open" | "done" | "dismissed" | "delayed";

export type AssistantTaskType =
  | "explicit_followup"
  | "ai_suggested_followup"
  | "profile_setup"
  | "content_plan"
  | "daily_review"
  | "weekly_review"
  | "coach_training";

export type AssistantMode =
  | "agent_blueprint"
  | "client_quick_help"
  | "daily_review"
  | "content_idea";

export interface TodayTask {
  id: number;
  title: string;
  taskType: AssistantTaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  clientName?: string | null;
}

export interface TodaySections {
  mustDo: TodayTask[];
  suggested: TodayTask[];
  longTerm: TodayTask[];
}

export const RATING_REASON_TAGS = [
  "natural",
  "actionable",
  "personalized",
  "professional",
  "too_salesy",
  "not_accurate",
  "too_generic",
  "privacy_concern",
] as const;

export function getClientStageLabel(stage: number): string {
  return CLIENT_STAGE_LABELS[stage as ClientStage] ?? "未知阶段";
}

export function canUseMemoryInLongTermContext(status: string): boolean {
  return status === "confirmed";
}

export function buildTodaySections(tasks: TodayTask[]): TodaySections {
  const openTasks = tasks.filter((task) => task.status === "open");
  return {
    mustDo: openTasks.filter((task) => task.priority === "must"),
    suggested: openTasks.filter((task) => task.priority === "suggested"),
    longTerm: openTasks.filter((task) => task.priority === "long_term"),
  };
}

export function normalizeRatingInput(input: {
  taskType: string;
  score: number;
  reasonTags?: string[];
  comment?: string;
}) {
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error("评分必须是 1 到 5");
  }

  const allowed = new Set<string>(RATING_REASON_TAGS);
  return {
    taskType: String(input.taskType || "unknown").slice(0, 64),
    score: input.score,
    reasonTags: (input.reasonTags || []).filter((tag) => allowed.has(tag)),
    comment: String(input.comment || "").slice(0, 500),
  };
}
