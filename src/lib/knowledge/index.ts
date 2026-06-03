export type { KnowledgeMode, KnowledgeModule, KnowledgeTopic, ModuleTier } from "./types";
export { CORE_MODULES, REFERENCE_MODULES } from "./core";
export { METHOD_MODULES } from "./methods";
export { CRITICAL_ILLNESS_MODULES } from "./products-critical-illness";
export { SAVINGS_DIVIDEND_MODULES } from "./products-savings-dividend";
export { OBJECTION_MODULES } from "./objections";
export { CASE_MODULES } from "./cases";
export { detectKnowledgeTopics, selectModules, selectModulesForFollowUp } from "./selector";

import { CORE_MODULES, REFERENCE_MODULES } from "./core";
import { METHOD_MODULES } from "./methods";
import { CRITICAL_ILLNESS_MODULES } from "./products-critical-illness";
import { SAVINGS_DIVIDEND_MODULES } from "./products-savings-dividend";
import { OBJECTION_MODULES } from "./objections";
import { CASE_MODULES } from "./cases";

export const ALL_MODULES = [
  ...CORE_MODULES,
  ...METHOD_MODULES,
  ...REFERENCE_MODULES,
  ...CRITICAL_ILLNESS_MODULES,
  ...SAVINGS_DIVIDEND_MODULES,
  ...OBJECTION_MODULES,
  ...CASE_MODULES,
];

export const COACH_KNOWLEDGE_BASE = ALL_MODULES.map((m) => m.content).join("\n---\n");
