import type { CoachMode } from "@/types";

export type ModuleTier = "core" | "method" | "product" | "objection" | "case" | "reference";

export type KnowledgeTopic =
  | "flow"
  | "role"
  | "market"
  | "client_tier"
  | "social"
  | "call_invite"
  | "need_discovery"
  | "need_intensify"
  | "solution_gap"
  | "critical_illness"
  | "medical"
  | "savings"
  | "dividend"
  | "education"
  | "retirement"
  | "inheritance"
  | "objection"
  | "case_review";

export type KnowledgeMode = CoachMode | "all";

export interface KnowledgeModule {
  id: string;
  title: string;
  tier: ModuleTier;
  topics: KnowledgeTopic[];
  modes: KnowledgeMode[];
  sourceRefs: string[];
  content: string;
}

export interface LegacyKnowledgeModule {
  id: string;
  title: string;
  tier: "core" | "method" | "reference";
  content: string;
}
