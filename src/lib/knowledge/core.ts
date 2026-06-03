import { ALL_MODULES as LEGACY_MODULES } from "./legacy";
import type { KnowledgeModule, KnowledgeTopic, LegacyKnowledgeModule, ModuleTier } from "./types";

const LEGACY_TOPIC_BY_ID: Record<string, KnowledgeTopic[]> = {
  flow: ["flow"],
  role: ["role"],
  market_shift: ["market"],
  client_tier: ["client_tier", "critical_illness", "savings"],
  social_activation: ["social"],
  call_invite: ["call_invite"],
  savings_risk: ["savings", "retirement", "inheritance"],
};

function normalizeTier(tier: LegacyKnowledgeModule["tier"]): ModuleTier {
  return tier;
}

export function withLegacyMetadata(module: LegacyKnowledgeModule): KnowledgeModule {
  return {
    ...module,
    tier: normalizeTier(module.tier),
    topics: LEGACY_TOPIC_BY_ID[module.id] || ["market"],
    modes: ["all"],
    sourceRefs: [`legacy:${module.id}`],
  };
}

const legacy = LEGACY_MODULES.map((module) => withLegacyMetadata(module as LegacyKnowledgeModule));

export const CORE_MODULES: KnowledgeModule[] = legacy.filter((module) =>
  module.id === "flow" || module.id === "role"
);

export const REFERENCE_MODULES: KnowledgeModule[] = legacy.filter((module) =>
  [
    "market_shift",
    "client_tier",
    "social_activation",
    "call_invite",
    "savings_risk",
  ].includes(module.id)
);
