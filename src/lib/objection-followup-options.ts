import type { ObjectionFollowupGoal, ObjectionFollowupScenario } from "@/types";

export const OBJECTION_SCENARIO_LABELS: Record<ObjectionFollowupScenario, string> = {
  after_meeting: "面谈后复盘",
  before_wechat: "微信跟进前",
  before_call: "电话跟进前",
  before_next_meeting: "下次见面前",
};

export const OBJECTION_GOAL_LABELS: Record<ObjectionFollowupGoal, string> = {
  wechat: "发微信",
  call: "打电话",
  next_meeting: "约下次见面",
  pause: "暂缓观察",
};
