export type TransactionType = "expense" | "income";
export type TransactionScope = "personal" | "shared";
export type PrivacyLevel = "visible" | "private";

export interface HouseholdSummary {
  id: string;
  name: string;
  role: "owner" | "member";
}

export interface Category {
  id: string;
  name: string;
  kind: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: "bank" | "card" | "cash" | "joint" | "savings" | "investment";
  current_balance_cents: number;
  is_shared: boolean;
}

export interface TransactionView {
  id: string;
  created_by: string | null;
  paid_by: string | null;
  type: TransactionType;
  amount_cents: number;
  currency: string;
  description: string;
  scope: TransactionScope;
  privacy: PrivacyLevel;
  transaction_date: string;
  category: { name: string; color: string | null } | null;
  account: { name: string } | null;
  creator: { display_name: string | null } | null;
}
