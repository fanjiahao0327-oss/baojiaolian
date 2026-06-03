import { ALL_MODULES as LEGACY_MODULES } from "./legacy";
import { withLegacyMetadata } from "./core";
import type { KnowledgeModule, LegacyKnowledgeModule } from "./types";

export const CASE_MODULES: KnowledgeModule[] = LEGACY_MODULES
  .filter((module) => module.id === "case_review")
  .map((module) => {
    const enriched = withLegacyMetadata(module as LegacyKnowledgeModule);
    return {
      ...enriched,
      tier: "case",
      topics: ["case_review", "need_discovery", "objection"],
      modes: ["meeting_review", "objection_followup", "diagnosis"],
    };
  });
