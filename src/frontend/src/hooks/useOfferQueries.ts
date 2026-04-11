// ============================================================
// Offer Portal React-Query hooks
// All calls go through the backend actor — no mock/localStorage primary.
// ============================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { backendInterface } from "../backend.d.ts";
import type {
  OfferEarningsSummary,
  OfferTransaction,
  OfferTxStatus,
  OfferTxType,
  OfferUser,
  OfferWithdrawal,
  OfferWithdrawalStatus,
} from "../types/offerTypes";
import { useActor } from "./useActor";

// ---------- typed actor helpers ----------
type OfferActor = Pick<
  backendInterface,
  | "registerOfferUser"
  | "loginOfferUser"
  | "getOfferEarningsSummary"
  | "getMyOfferTransactions"
  | "getMyOfferWithdrawals"
  | "getOfferPortalConfig"
  | "requestOfferWithdrawal"
>;

function asOfferActor(actor: unknown): OfferActor {
  return actor as OfferActor;
}

// ---------- variant normalizers ----------
function normalizeTxType(raw: unknown): OfferTxType {
  const v = String(raw);
  if (v === "cpalead") return "cpalead";
  if (v === "referralBonus") return "referralBonus";
  return "manualCredit";
}

function normalizeTxStatus(raw: unknown): OfferTxStatus {
  const v = String(raw);
  if (v === "credited") return "credited";
  if (v === "reversed") return "reversed";
  return "pending";
}

function normalizeWithdrawalStatus(raw: unknown): OfferWithdrawalStatus {
  const v = String(raw);
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  if (v === "paid") return "paid";
  return "pending";
}

function mapBackendOfferUser(raw: {
  id: bigint;
  userId: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  totalEarnings: bigint;
  pendingEarnings: bigint;
  createdAt: bigint;
  passwordHash: string;
}): OfferUser {
  return {
    id: raw.id,
    userId: raw.userId,
    email: raw.email,
    referralCode: raw.referralCode,
    referredBy: raw.referredBy,
    totalEarnings: raw.totalEarnings,
    pendingEarnings: raw.pendingEarnings,
    createdAt: raw.createdAt,
  };
}

// ---------- password hash util ----------
async function sha256hex(pwd: string): Promise<string> {
  const data = new TextEncoder().encode(pwd);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
// Offer Portal Config — polled every 30s (rarely changes)
// ============================================================
export function useOfferPortalConfig() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["offerPortalConfig"],
    queryFn: async () => {
      if (!actor) return null;
      return asOfferActor(actor).getOfferPortalConfig();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

// ============================================================
// Earnings summary — polled every 5 seconds
// ============================================================
export function useOfferEarningsSummary(offerUserId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<OfferEarningsSummary>({
    queryKey: ["offerEarningsSummary", offerUserId?.toString()],
    queryFn: async () => {
      const empty: OfferEarningsSummary = {
        totalEarnings: 0n,
        pendingEarnings: 0n,
        referralCode: "",
      };
      if (!actor || offerUserId === null) return empty;
      const raw =
        await asOfferActor(actor).getOfferEarningsSummary(offerUserId);
      return {
        totalEarnings: raw.totalEarnings,
        pendingEarnings: raw.pendingEarnings,
        referralCode: raw.referralCode,
      };
    },
    enabled: !!actor && !isFetching && offerUserId !== null,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

// ============================================================
// My transactions — polled every 10 seconds
// ============================================================
export function useMyOfferTransactions(offerUserId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<OfferTransaction[]>({
    queryKey: ["myOfferTransactions", offerUserId?.toString()],
    queryFn: async () => {
      if (!actor || offerUserId === null) return [];
      const raw = await asOfferActor(actor).getMyOfferTransactions(offerUserId);
      return raw.map((t) => ({
        id: t.id,
        offerUserId: t.offerUserId,
        txType: normalizeTxType(t.txType),
        amount: t.amount,
        description: t.description,
        createdAt: t.createdAt,
        status: normalizeTxStatus(t.status),
      }));
    },
    enabled: !!actor && !isFetching && offerUserId !== null,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

// ============================================================
// My withdrawals — polled every 10 seconds
// ============================================================
export function useMyOfferWithdrawals(offerUserId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<OfferWithdrawal[]>({
    queryKey: ["myOfferWithdrawals", offerUserId?.toString()],
    queryFn: async () => {
      if (!actor || offerUserId === null) return [];
      const raw = await asOfferActor(actor).getMyOfferWithdrawals(offerUserId);
      return raw.map((w) => ({
        id: w.id,
        offerUserId: w.offerUserId,
        upiId: w.upiId,
        amount: w.amount,
        status: normalizeWithdrawalStatus(w.status),
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        adminNote: w.adminNote,
      }));
    },
    enabled: !!actor && !isFetching && offerUserId !== null,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

// ============================================================
// Mutations
// ============================================================

export function useRegisterOfferUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      password,
      referralCode,
    }: {
      email: string;
      password: string;
      referralCode?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const hash = await sha256hex(password);
      const id = await asOfferActor(actor).registerOfferUser(
        email,
        hash,
        referralCode ?? null,
      );
      return id as bigint;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offerPortalConfig"] });
    },
  });
}

export function useLoginOfferUser() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<OfferUser> => {
      if (!actor) throw new Error("Actor not available");
      const hash = await sha256hex(password);
      const raw = await asOfferActor(actor).loginOfferUser(email, hash);
      return mapBackendOfferUser(raw);
    },
  });
}

export function useRequestOfferWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      offerUserId,
      upiId,
      amount,
    }: {
      offerUserId: bigint;
      upiId: string;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return asOfferActor(actor).requestOfferWithdrawal(
        offerUserId,
        upiId,
        amount,
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["myOfferWithdrawals", vars.offerUserId.toString()],
      });
      qc.invalidateQueries({
        queryKey: ["offerEarningsSummary", vars.offerUserId.toString()],
      });
    },
  });
}
