export interface KYCFormData {
  clientName: string;
  age: string;
  gender: string;
  city: string;
  maritalStatus: string;
  childrenDetail: string;
  personality: string;
  healthCondition: string;
  hobbies: string;
  parentsDetail: string;
  clientIndustry: string;
  clientPosition: string;
  careerDevelopment: string;
  breadwinner: string;
  spouseIndustry: string;
  spousePosition: string;
  monthlyExpense: string;
  majorExpensePlan: string;
  incomeSources: string[];
  incomeSourcesOther: string;
  fixedAssets: string;
  annualIncome: string;
  liquidAssets: string;
  investmentAmount: string;
  investmentStyle: string;
  riskTolerance: string;
  liabilities: string;
  expensePressure: string;
  protectionInsurance: string;
  savingsInsurance: string;
  otherInsurance: string;
  insuranceAttitude: string;
  step1Notes: string;
  step2Notes: string;
  step3Notes: string;
  step4Notes: string;
  triggerScenario: string;
  clientOriginalWords: string;
  clientObjection: string;
  agentResponse: string;
  pastInteraction: string;
}

export type ArrayField = "incomeSources";

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
