import { ALL_MODULES as LEGACY_MODULES } from "./legacy";
import { withLegacyMetadata } from "./core";
import type { KnowledgeModule, LegacyKnowledgeModule } from "./types";

export const METHOD_MODULES: KnowledgeModule[] = LEGACY_MODULES
  .filter((module) => ["need_discovery", "need_intensify", "solution_gap"].includes(module.id))
  .map((module) => withLegacyMetadata(module as LegacyKnowledgeModule));
