import { ALL_MODULES as LEGACY_MODULES } from "./legacy";
import { withLegacyMetadata } from "./core";
import type { KnowledgeModule, LegacyKnowledgeModule } from "./types";

export const OBJECTION_MODULES: KnowledgeModule[] = LEGACY_MODULES
  .filter((module) => ["objection_handling", "drg_medical"].includes(module.id))
  .map((module) => {
    const enriched = withLegacyMetadata(module as LegacyKnowledgeModule);
    return {
      ...enriched,
      tier: "objection",
      topics: module.id === "drg_medical"
        ? ["medical", "critical_illness", "objection"]
        : ["objection", "critical_illness", "medical", "savings"],
    };
  });
