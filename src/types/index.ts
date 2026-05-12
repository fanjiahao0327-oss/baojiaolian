export interface KYCFormData {
  clientName: string;
  age: string;
  gender: string;
  city: string;
  maritalStatus: string;
  childrenCount: string;
  childrenDetail: string;
  clientIndustry: string;
  clientPosition: string;
  clientWorkYears: string;
  spouseIndustry: string;
  spousePosition: string;
  careerStatus: string;
  incomeSources: string[];
  assets: string[];
  expensePressure: string;
  annualIncome: string;
  stockAmount: string;
  savingsAmount: string;
  medicalInsurance: string;
  criticalIllnessInsurance: string;
  accidentInsurance: string;
  termLifeInsurance: string;
  annuityInsurance: string;
  increasingLifeInsurance: string;
  otherInsurance: string;
  insuranceAttitude: string;
  triggerScenario: string;
  clientOriginalWords: string;
  clientObjection: string;
  agentResponse: string;
  pastInteraction: string;
  recentChanges: string;
}

export type ArrayField = "incomeSources" | "assets";

export interface Message {
  role: "user" | "coach";
  content: string;
  timestamp: number;
}

export type FieldType = "text" | "number" | "radio" | "select" | "checkbox-group" | "textarea";

export interface FieldConfig {
  key: keyof KYCFormData;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface SectionConfig {
  title: string;
  fields: FieldConfig[];
}

export interface UserInfo {
  userId: number;
  phone: string;
  balance: number;
}

export interface PointTransaction {
  id: number;
  amount: number;
  type: "charge" | "consume";
  description: string;
  created_at: string;
}

export interface ClientSummary {
  id: number;
  name: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  preview: string;
  created_at: string;
  client_name?: string;
  status?: "active" | "won" | "lost";
}

export interface ConversationDetail {
  id: number;
  title: string;
  messages: Message[];
  created_at: string;
}
