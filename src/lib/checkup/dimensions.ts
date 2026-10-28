import type { CheckupDimensionId, DimensionDefinition } from "./types";

export const DIMENSIONS: DimensionDefinition[] = [
  { id: "family", label: "家庭结构", fields: ["ageStage", "maritalStatus", "children", "parents", "siblings", "careDependents", "businessInvolvement"], askPolicy: "must", weight: 3 },
  { id: "protection", label: "已有保障", fields: ["socialInsurance", "medicalInsurance", "criticalIllness", "lifeInsurance", "accidentInsurance"], askPolicy: "must", weight: 3 },
  { id: "inheritance", label: "传承安排", fields: ["childrenMarriage", "assetOwnership", "inheritanceIntent", "will", "trust", "insuranceBeneficiary"], askPolicy: "main_domain", weight: 3 },
  { id: "cashflow", label: "收支", fields: ["incomeSources", "annualIncomeRange", "annualExpenseRange", "annualSurplusRange", "passiveIncomeRange"], askPolicy: "mentioned_only", weight: 2 },
  { id: "assets", label: "资产与负债", fields: ["liquidAssetsRange", "fixedAssets", "totalAssetsRange", "totalDebtRange", "mortgageRange", "guarantees"], askPolicy: "mentioned_only", weight: 2 },
  { id: "health", label: "健康", fields: ["checkupAbnormalities", "preExistingConditions", "familyHistory"], askPolicy: "mentioned_only", weight: 2 },
  { id: "education", label: "教育", fields: ["childrenEducationStage", "studyAbroadPlan"], askPolicy: "mentioned_only", weight: 2 },
  { id: "retirement", label: "养老", fields: ["retirementAge", "pension", "retirementPlan"], askPolicy: "mentioned_only", weight: 2 },
  { id: "business", label: "企业", fields: ["businessOwnership", "equity", "familyBusinessMix", "succession"], askPolicy: "mentioned_only", weight: 2 },
  { id: "marriage", label: "婚姻", fields: ["maritalStatus", "preMaritalAssets", "spouseDebt"], askPolicy: "mentioned_only", weight: 2 },
];

export function getDimension(id: CheckupDimensionId): DimensionDefinition {
  const dimension = DIMENSIONS.find((item) => item.id === id);
  if (!dimension) throw new Error(`Unknown dimension: ${id}`);
  return dimension;
}

export function getMustAskDimensions(): DimensionDefinition[] {
  return DIMENSIONS.filter((item) => item.askPolicy === "must");
}

export function getMentionedOnlyDimensions(): DimensionDefinition[] {
  return DIMENSIONS.filter((item) => item.askPolicy === "mentioned_only");
}
