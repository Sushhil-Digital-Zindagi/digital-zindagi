// ============================================================
// Offer Portal — frontend types
// These are isolated from the main app types.
// ============================================================

export interface OfferUser {
  id: bigint;
  userId: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  totalEarnings: bigint;
  pendingEarnings: bigint;
  createdAt: bigint;
}

export interface OfferEarningsSummary {
  totalEarnings: bigint;
  pendingEarnings: bigint;
  /** referralCode is returned by the backend summary endpoint */
  referralCode: string;
}

export type OfferTxType = "cpalead" | "referralBonus" | "manualCredit";
export type OfferTxStatus = "pending" | "credited" | "reversed";

export interface OfferTransaction {
  id: bigint;
  offerUserId: bigint;
  txType: OfferTxType;
  amount: bigint;
  description: string;
  createdAt: bigint;
  status: OfferTxStatus;
}

export type OfferWithdrawalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid";

export interface OfferWithdrawal {
  id: bigint;
  offerUserId: bigint;
  upiId: string;
  amount: bigint;
  status: OfferWithdrawalStatus;
  requestedAt: bigint;
  processedAt?: bigint;
  adminNote?: string;
}

export interface OfferPortalConfig {
  isEnabled: boolean;
  cpaLeadWebhookSecret: string;
  adminProfitPct: bigint;
  userProfitPct: bigint;
}
