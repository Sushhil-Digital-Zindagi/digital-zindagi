// ============================================================
// Offer Portal React-Query hooks
// All calls go through the backend actor — no mock/localStorage primary.
// Actor readiness pattern: never throws "Actor not available" to the user.
// ============================================================
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOfferAuth } from "../contexts/OfferAuthContext";
import type {
  OfferEarningsSummary,
  OfferPortalConfig,
  OfferTransaction,
  OfferTxStatus,
  OfferTxType,
  OfferUser,
  OfferWithdrawal,
  OfferWithdrawalStatus,
} from "../types/offerTypes";
import { useActor } from "./useActor";

// ---------- actor safety ----------
// We cast the actor to `any` internally so we're not constrained by the
// BackendActorMethods stub — the real canister actor exposes all methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyActor = any;

/**
 * Returns the actor or throws a user-friendly message if not yet available.
 * Never exposes "Actor not available" — always shows a friendly wait message.
 */
function requireActor(actor: unknown): AnyActor {
  if (!actor)
    throw new Error("Portal abhi load ho raha hai, ek moment wait karein...");
  return actor as AnyActor;
}

// ---------- password hash util ----------
async function sha256hex(pwd: string): Promise<string> {
  const data = new TextEncoder().encode(pwd);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    passwordHash: raw.passwordHash ?? "",
    referralCode: raw.referralCode,
    referredBy: raw.referredBy,
    totalEarnings: raw.totalEarnings,
    pendingEarnings: raw.pendingEarnings,
    createdAt: raw.createdAt,
  };
}

// ============================================================
// Offer Portal Config — admin only, but we handle failure gracefully
// If the actor is not admin or call fails, we default to isEnabled:true
// so the portal is visible to regular users.
// ============================================================
export function useOfferPortalConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<OfferPortalConfig>({
    queryKey: ["offerPortalConfig"],
    queryFn: async (): Promise<OfferPortalConfig> => {
      if (!actor) {
        // Actor not ready yet — return undefined-ish default (isLoading stays true)
        return {
          isEnabled: true,
          cpaLeadWebhookSecret: "",
          cpagripApiKey: "",
          adminProfitPct: 60n,
          userProfitPct: 40n,
        };
      }
      try {
        const raw = await (actor as AnyActor).getOfferPortalConfig();
        return {
          isEnabled: raw.isEnabled,
          cpaLeadWebhookSecret: raw.cpaLeadWebhookSecret,
          cpagripApiKey: raw.cpagripApiKey ?? "",
          adminProfitPct: raw.adminProfitPct,
          userProfitPct: raw.userProfitPct,
        };
      } catch {
        // Non-admin users get a permission error — default to enabled so portal shows
        return {
          isEnabled: true,
          cpaLeadWebhookSecret: "",
          cpagripApiKey: "",
          adminProfitPct: 60n,
          userProfitPct: 40n,
        };
      }
    },
    enabled: !isFetching,
    refetchInterval: 60_000,
    staleTime: 30_000,
    // Never propagate errors to the UI
    retry: false,
  });
}

// Alias used in some files
export { useOfferPortalConfig as useOfferPortalConfigPublic };

// ============================================================
// Earnings summary — polled every 10s when user is logged in
// ============================================================
export function useOfferEarningsSummary(
  offerUserId: bigint | null | undefined,
) {
  const { actor, isFetching } = useActor();
  const enabled = !!actor && !isFetching && offerUserId != null;
  return useQuery<OfferEarningsSummary>({
    queryKey: ["offerEarningsSummary", offerUserId?.toString()],
    queryFn: async (): Promise<OfferEarningsSummary> => {
      const empty: OfferEarningsSummary = {
        totalEarnings: 0n,
        pendingEarnings: 0n,
        referralCode: "",
      };
      if (!actor || offerUserId == null) return empty;
      try {
        const raw =
          await requireActor(actor).getOfferEarningsSummary(offerUserId);
        return {
          totalEarnings: raw.totalEarnings,
          pendingEarnings: raw.pendingEarnings,
          referralCode: raw.referralCode,
        };
      } catch {
        return empty;
      }
    },
    enabled,
    refetchInterval: enabled ? 10_000 : false,
    staleTime: 8_000,
  });
}

// ============================================================
// My transactions — polled every 15s
// ============================================================
export function useMyOfferTransactions(offerUserId: bigint | null | undefined) {
  const { actor, isFetching } = useActor();
  const enabled = !!actor && !isFetching && offerUserId != null;
  return useQuery<OfferTransaction[]>({
    queryKey: ["myOfferTransactions", offerUserId?.toString()],
    queryFn: async (): Promise<OfferTransaction[]> => {
      if (!actor || offerUserId == null) return [];
      try {
        const raw =
          await requireActor(actor).getMyOfferTransactions(offerUserId);
        return raw.map((t) => ({
          id: t.id,
          offerUserId: t.offerUserId,
          txType: normalizeTxType(t.txType),
          amount: t.amount,
          description: t.description,
          createdAt: t.createdAt,
          status: normalizeTxStatus(t.status),
        }));
      } catch {
        return [];
      }
    },
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    staleTime: 10_000,
  });
}

// ============================================================
// My withdrawals — polled every 15s
// ============================================================
export function useMyOfferWithdrawals(offerUserId: bigint | null | undefined) {
  const { actor, isFetching } = useActor();
  const enabled = !!actor && !isFetching && offerUserId != null;
  return useQuery<OfferWithdrawal[]>({
    queryKey: ["myOfferWithdrawals", offerUserId?.toString()],
    queryFn: async (): Promise<OfferWithdrawal[]> => {
      if (!actor || offerUserId == null) return [];
      try {
        const raw =
          await requireActor(actor).getMyOfferWithdrawals(offerUserId);
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
      } catch {
        return [];
      }
    },
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    staleTime: 10_000,
  });
}

// ============================================================
// Register — backend returns bigint (user ID), then auto-login
// ============================================================
export function useRegisterOfferUser() {
  const { actor } = useActor();
  const { login } = useOfferAuth();
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
    }): Promise<OfferUser> => {
      const a = requireActor(actor);
      const hash = await sha256hex(password);

      // Step 1: Register — returns new user's bigint ID
      await a.registerOfferUser(email, hash, referralCode ?? null);

      // Step 2: Immediately login with same credentials (backend returns full user)
      const raw = await a.loginOfferUser(email, hash);
      return mapBackendOfferUser(raw);
    },
    onSuccess: (user) => {
      // Auto-login the user after successful registration
      login(user);
      qc.invalidateQueries({ queryKey: ["offerPortalConfig"] });
    },
    onError: (err) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Account banana fail hua. Dobara try karein.";
      toast.error(msg);
    },
  });
}

// ============================================================
// Login
// ============================================================
export function useLoginOfferUser() {
  const { actor } = useActor();
  const { login } = useOfferAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<OfferUser> => {
      const a = requireActor(actor);
      const hash = await sha256hex(password);
      const raw = await a.loginOfferUser(email, hash);
      return mapBackendOfferUser(raw);
    },
    onSuccess: (user) => {
      login(user);
    },
    onError: (err) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Email ya password galat hai / Wrong credentials";
      toast.error(msg);
    },
  });
}

// ============================================================
// Request withdrawal
// ============================================================
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
    }): Promise<bigint> => {
      return requireActor(actor).requestOfferWithdrawal(
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

// ============================================================
// Admin: Update offer portal config
// ============================================================
export function useUpdateOfferPortalConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isEnabled,
      cpaLeadWebhookSecret,
      adminProfitPct,
      userProfitPct,
    }: {
      isEnabled: boolean;
      cpaLeadWebhookSecret: string;
      adminProfitPct: bigint;
      userProfitPct: bigint;
    }): Promise<boolean> => {
      const result = await requireActor(actor).updateOfferPortalConfig(
        isEnabled,
        cpaLeadWebhookSecret,
        adminProfitPct,
        userProfitPct,
      );
      // Handle either boolean or Result-like {err: string}
      if (typeof result === "object" && result !== null && "err" in result) {
        throw new Error(String((result as { err: string }).err));
      }
      return Boolean(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offerPortalConfig"] });
      toast.success("Offer Portal config save ho gaya ✅");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Config save karne mein error hua",
      );
    },
  });
}

// ============================================================
// Admin: List all offer users
// ============================================================
export function useAdminListOfferUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<OfferUser[]>({
    queryKey: ["adminOfferUsers"],
    queryFn: async (): Promise<OfferUser[]> => {
      if (!actor) return [];
      try {
        const raw = await requireActor(actor).adminListOfferUsers();
        return raw.map(mapBackendOfferUser);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

// ============================================================
// Admin: List pending withdrawals
// ============================================================
export function useAdminListPendingWithdrawals() {
  const { actor, isFetching } = useActor();
  return useQuery<OfferWithdrawal[]>({
    queryKey: ["adminPendingWithdrawals"],
    queryFn: async (): Promise<OfferWithdrawal[]> => {
      if (!actor) return [];
      try {
        const raw = await requireActor(actor).adminListPendingWithdrawals();
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
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

// ============================================================
// Admin: Resolve a withdrawal (approve/reject/paid)
// ============================================================
export function useAdminResolveWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  // Import the needed enum at runtime via the actor
  return useMutation({
    mutationFn: async ({
      id,
      newStatus,
      adminNote,
    }: {
      id: bigint;
      newStatus: "paid" | "approved" | "rejected";
      adminNote?: string;
    }): Promise<boolean> => {
      // The backend expects the Variant_paid_approved_rejected enum
      // At runtime on ICP this is passed as a variant object; cast via unknown
      return requireActor(actor).adminResolveWithdrawal(
        id,
        newStatus as unknown,
        adminNote ?? null,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminPendingWithdrawals"] });
      toast.success("Withdrawal update ho gaya ✅");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Update karne mein error hua",
      );
    },
  });
}
