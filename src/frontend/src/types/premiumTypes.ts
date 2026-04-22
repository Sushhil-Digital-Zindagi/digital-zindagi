/**
 * Premium subscription domain types for the Likeup chat module.
 */

export type PremiumPlanKey = "monthly" | "quarterly" | "annual";

export interface PremiumPlan {
  key: PremiumPlanKey;
  label: string;
  price: number;
  originalPrice?: number;
  durationDays: number;
  savings?: string;
}

export interface UserSubscription {
  userId: string;
  isPremium: boolean;
  planKey?: PremiumPlanKey;
  activatedAt?: number;
  expiresAt?: number;
  activatedVia?: "stripe" | "upi" | "admin";
}

export interface UpiPremiumRequest {
  id: string;
  userId: string;
  userName: string;
  planKey: PremiumPlanKey;
  amount: number;
  upiTransactionRef: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  resolvedAt?: number;
}

export interface ActivateStripePayload {
  sessionId: string;
  planKey: PremiumPlanKey;
}

export interface SubmitUpiPayload {
  planKey: PremiumPlanKey;
  amount: number;
  upiTransactionRef: string;
}
