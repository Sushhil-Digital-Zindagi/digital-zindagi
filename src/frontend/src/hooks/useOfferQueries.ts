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
import { getAdminToken } from "./useAdminSession";

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

/**
 * Waits for actor to become non-null, polling every 500ms.
 * Resolves with the actor once ready, or rejects after maxWaitMs.
 * Used before registration to prevent race conditions at page load.
 */
async function waitForActor(
  actorRef: { current: unknown },
  maxWaitMs = 10_000,
): Promise<AnyActor> {
  const interval = 500;
  const maxAttempts = Math.ceil(maxWaitMs / interval);
  for (let i = 0; i < maxAttempts; i++) {
    if (actorRef.current) return actorRef.current as AnyActor;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(
    "Server se connect nahi ho paa raha. Thodi der baad try karein.",
  );
}

/** Maps a raw error to a clean Hindi/English user-facing message. Never exposes raw backend strings. */
function mapRegistrationError(err: unknown): string {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();

  // Business errors — specific clean messages
  if (raw === "already_registered" || lower.includes("already_registered"))
    return "Yeh email pehle se registered hai. Login karein.";
  if (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("registered")
  )
    return "Yeh email pehle se registered hai. Login karein.";
  if (
    lower.includes("invalid_email") ||
    (lower.includes("invalid") && lower.includes("email"))
  )
    return "Email sahi nahin hai. Check karein.";
  if (
    lower.includes("password_too_short") ||
    (lower.includes("password") && lower.includes("short"))
  )
    return "Password kam se kam 6 characters ka hona chahiye.";

  // Actor/server not ready
  if (
    lower.includes("server se connect nahi") ||
    lower.includes("thodi der baad")
  )
    return raw; // already user-friendly

  // Network errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error")
  )
    return "Connection slow hai. Thodi der baad try karein.";
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Connection slow hai. Thodi der baad try karein.";

  // Raw IC / canister jargon — never show these
  if (
    lower.includes("ic0.trap") ||
    lower.includes("reject code") ||
    lower.includes("canister trapped") ||
    lower.includes("trapped explicitly") ||
    /-[a-z0-9]+-cai/i.test(raw)
  )
    return "Account banana fail hua. Dobara try karein.";

  if (lower.includes("method not found") || lower.includes("no update method"))
    return "Server se connect nahi ho paa raha. Thodi der baad try karein.";

  if (lower.includes("actor") || lower.includes("canister"))
    return "Server se connect nahi ho paa raha. Thodi der baad try karein.";

  // Generic fallback
  return "Account banana fail hua. Dobara try karein.";
}

/** Returns true for "business" errors that should NOT be retried. */
function isBusinessError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("already_registered") ||
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("registered") ||
    lower.includes("invalid_email") ||
    lower.includes("password_too_short") ||
    lower.includes("password kam se kam")
  );
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
// Offer Portal Config — uses public endpoint for non-admins.
// Admin gets full config via getOfferPortalConfigFull (Result<T,E>).
// Non-admin gets getOfferPortalConfigPublic (always succeeds).
// ============================================================
export function useOfferPortalConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<OfferPortalConfig>({
    queryKey: ["offerPortalConfig"],
    queryFn: async (): Promise<OfferPortalConfig> => {
      const defaultConfig: OfferPortalConfig = {
        isEnabled: true,
        cpaLeadWebhookSecret: "",
        cpagripApiKey: "",
        adminProfitPct: 60n,
        userProfitPct: 40n,
      };
      if (!actor) return defaultConfig;

      // Always start with the public config (never traps)
      try {
        const pub = await (actor as AnyActor).getOfferPortalConfigPublic();
        const base: OfferPortalConfig = {
          isEnabled: pub.isEnabled,
          cpaLeadWebhookSecret: "",
          cpagripApiKey: "",
          adminProfitPct: pub.adminProfitPct,
          userProfitPct: pub.userProfitPct,
        };

        // Try to get full admin config — only succeeds for admin
        try {
          const fullResult = await (
            actor as AnyActor
          ).getOfferPortalConfigFull();
          if (fullResult && fullResult.__kind__ === "ok" && fullResult.ok) {
            const full = fullResult.ok;
            return {
              isEnabled: full.isEnabled,
              cpaLeadWebhookSecret: full.cpaLeadWebhookSecret ?? "",
              cpagripApiKey: full.cpagripApiKey ?? "",
              cpagripWebhookSecret: full.cpagripWebhookSecret ?? "",
              cpagripOfferWallName: full.cpagripOfferWallName ?? "",
              adminProfitPct: full.adminProfitPct,
              userProfitPct: full.userProfitPct,
            };
          }
        } catch {
          // Non-admin — just return public info
        }
        return base;
      } catch {
        return defaultConfig;
      }
    },
    enabled: !isFetching,
    refetchInterval: 60_000,
    staleTime: 30_000,
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
        tier1Earnings: 0n,
        tier2Earnings: 0n,
        tier3Earnings: 0n,
        tier4Earnings: 0n,
        tier5Earnings: 0n,
      };
      if (!actor || offerUserId == null) return empty;
      try {
        const raw =
          await requireActor(actor).getOfferEarningsSummary(offerUserId);
        return {
          totalEarnings: raw.totalEarnings,
          pendingEarnings: raw.pendingEarnings,
          referralCode: raw.referralCode,
          tier1Earnings: raw.tier1Earnings ?? 0n,
          tier2Earnings: raw.tier2Earnings ?? 0n,
          tier3Earnings: raw.tier3Earnings ?? 0n,
          tier4Earnings: raw.tier4Earnings ?? 0n,
          tier5Earnings: raw.tier5Earnings ?? 0n,
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
// Register — with actor-wait, retry, and clean error messages
// ============================================================
export function useRegisterOfferUser() {
  const actorResult = useActor();
  // Keep a ref so waitForActor can poll without stale closure
  const actorRef = { current: actorResult.actor as unknown };
  actorRef.current = actorResult.actor;

  const { login } = useOfferAuth();
  const qc = useQueryClient();

  // Expose a status setter so the UI can show step messages
  // We store it in the mutation context via onMutate / onSettled
  return useMutation({
    mutationFn: async ({
      email,
      password,
      referralCode,
      mobile,
      onStatusChange,
    }: {
      email: string;
      password: string;
      referralCode?: string;
      mobile?: string;
      onStatusChange?: (msg: string) => void;
    }): Promise<OfferUser> => {
      const setStatus = onStatusChange ?? (() => {});

      // Step 0: Wait for actor to be ready (up to 10s)
      setStatus("Connecting to server...");
      const a = await waitForActor(actorRef, 10_000);

      const hash = await sha256hex(password);
      // Normalize referral: empty string → null
      const refCode =
        referralCode && referralCode.trim().length > 0
          ? referralCode.trim()
          : null;
      // Normalize mobile: empty string → undefined (not passed to backend)
      const mobileVal =
        mobile && mobile.trim().length > 0 ? mobile.trim() : undefined;

      setStatus("Account bana rahe hain...");

      // Inner registration call — tries 4-arg then 3-arg fallback
      async function doRegister(): Promise<unknown> {
        try {
          if (mobileVal) {
            return await a.registerOfferUser(email, hash, refCode, mobileVal);
          }
          return await a.registerOfferUser(email, hash, refCode);
        } catch (firstErr) {
          const msg =
            (firstErr as Error)?.message ??
            (typeof firstErr === "string" ? firstErr : "");
          // If it's a business error, don't retry with different arity
          if (isBusinessError(msg)) throw firstErr;
          // Method arity mismatch — try 3-arg
          try {
            return await a.registerOfferUser(email, hash, refCode);
          } catch {
            throw firstErr; // surface original error
          }
        }
      }

      let regResult: unknown;
      try {
        regResult = await doRegister();
      } catch (firstAttemptErr) {
        const firstMsg =
          (firstAttemptErr as Error)?.message ??
          (typeof firstAttemptErr === "string" ? firstAttemptErr : "");

        // Business errors → never retry, throw immediately with clean message
        if (isBusinessError(firstMsg)) {
          throw new Error(mapRegistrationError(firstAttemptErr));
        }

        // Network / transient errors → retry once after 2s
        setStatus("Dobara try kar rahe hain...");
        await new Promise((r) => setTimeout(r, 2_000));
        try {
          regResult = await doRegister();
        } catch (retryErr) {
          throw new Error(mapRegistrationError(retryErr));
        }
      }

      // Handle Result<OfferUser, String> variant from backend
      if (
        regResult &&
        typeof regResult === "object" &&
        "__kind__" in regResult
      ) {
        const kind = (regResult as { __kind__: string }).__kind__;
        if (kind === "err") {
          const errMsg = (regResult as unknown as { err: string }).err ?? "";
          throw new Error(mapRegistrationError(new Error(errMsg)));
        }
        // kind === "ok" → registration succeeded, fall through to login
      }

      // Step 2: Auto-login with same credentials
      setStatus("Login ho rahe hain...");
      try {
        const loginResult = await a.loginOfferUser(email, hash);
        if (
          loginResult &&
          typeof loginResult === "object" &&
          "__kind__" in loginResult
        ) {
          if ((loginResult as { __kind__: string }).__kind__ === "ok") {
            return mapBackendOfferUser(
              (loginResult as { ok: Parameters<typeof mapBackendOfferUser>[0] })
                .ok,
            );
          }
          throw new Error(
            (loginResult as { err: string }).err ?? "Auto-login failed",
          );
        }
        // Fallback: backend returned user directly (legacy format)
        return mapBackendOfferUser(
          loginResult as Parameters<typeof mapBackendOfferUser>[0],
        );
      } catch (err) {
        throw new Error(mapOfferLoginError(err));
      }
    },
    onSuccess: (user) => {
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

/** Maps any raw backend error to a clean user-friendly message */
function mapOfferLoginError(err: unknown): string {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();

  if (
    lower.includes("ic0.trap") ||
    lower.includes("reject code: 5") ||
    lower.includes("reject code 5") ||
    lower.includes("canister trapped") ||
    lower.includes("trapped explicitly") ||
    lower.includes("wrong") ||
    lower.includes("galat") ||
    lower.includes("invalid") ||
    lower.includes("incorrect") ||
    lower.includes("password") ||
    lower.includes("mismatch")
  ) {
    return "Email ya password galat hai. Dobara try karein.";
  }

  if (
    lower.includes("not found") ||
    lower.includes("no user") ||
    lower.includes("does not exist")
  ) {
    return "Yeh email register nahi hai. Pehle sign up karein.";
  }

  if (/-[a-z0-9]+-cai/i.test(raw)) {
    return "Connection error, please try again";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error")
  ) {
    return "Backend se connect nahi ho pa raha — thoda wait karein";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Connection timeout — please try again";
  }

  if (
    lower.includes("actor") ||
    lower.includes("canister") ||
    lower.includes("method not found")
  ) {
    return "Service temporarily unavailable. Please try again.";
  }

  // Last resort — never show raw technical strings
  return "Email ya password galat hai. Dobara try karein.";
}

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
      try {
        const result = await a.loginOfferUser(email, hash);
        // Handle Result<OfferUser, String> variant from backend
        if (result && typeof result === "object" && "__kind__" in result) {
          if ((result as { __kind__: string }).__kind__ === "ok") {
            return mapBackendOfferUser(
              (result as { ok: Parameters<typeof mapBackendOfferUser>[0] }).ok,
            );
          }
          // err variant — map to clean message
          throw new Error((result as { err: string }).err ?? "Login failed");
        }
        // Fallback: backend returned the user directly (legacy format)
        return mapBackendOfferUser(
          result as Parameters<typeof mapBackendOfferUser>[0],
        );
      } catch (err) {
        // Map all raw errors to user-friendly messages before re-throwing
        throw new Error(mapOfferLoginError(err));
      }
    },
    onSuccess: (user) => {
      login(user);
    },
    onError: (err) => {
      const msg = mapOfferLoginError(err);
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
// Admin: Update offer portal config — sends ALL 7 fields atomically
// including cpagripApiKey, webhookSecret and offerWallName
// ============================================================
export function useUpdateOfferPortalConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isEnabled,
      cpaLeadWebhookSecret,
      cpagripApiKey,
      adminProfitPct,
      userProfitPct,
      newWebhookSecret,
      newOfferWallName,
    }: {
      isEnabled: boolean;
      cpaLeadWebhookSecret: string;
      cpagripApiKey: string;
      adminProfitPct: bigint;
      userProfitPct: bigint;
      newWebhookSecret?: string;
      newOfferWallName?: string;
    }): Promise<boolean> => {
      if (!actor)
        throw new Error(
          "Backend se connect nahi ho pa raha — thoda wait karein",
        );
      try {
        const result = await (actor as AnyActor).updateOfferPortalConfig(
          getAdminToken(),
          isEnabled,
          cpaLeadWebhookSecret,
          cpagripApiKey,
          adminProfitPct,
          userProfitPct,
          newWebhookSecret ?? "",
          newOfferWallName ?? "",
        );
        if (result && typeof result === "object" && "__kind__" in result) {
          if ((result as { __kind__: string }).__kind__ === "err") {
            throw new Error(String((result as { err: string }).err));
          }
          return true;
        }
        return Boolean(result);
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        const lower = msg.toLowerCase();
        if (lower.includes("method not found"))
          throw new Error("Service is updating. Please refresh the page.");
        if (lower.includes("unauthorized"))
          throw new Error("Admin permission required.");
        if (lower.includes("ic0.trap") || lower.includes("reject code"))
          throw new Error("Something went wrong. Please try again.");
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offerPortalConfig"] });
      toast.success("Settings Updated Successfully ✅");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Config save karne mein error hua",
      );
    },
  });
}

// ============================================================
// Admin: Get CPAGrip settings
// ============================================================
export function useGetCpagripSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<{
    apiKey: string;
    webhookSecret: string;
    offerWallName: string;
  }>({
    queryKey: ["cpagripSettings"],
    queryFn: async () => {
      const empty = {
        apiKey: "",
        webhookSecret: "",
        offerWallName: "Digital Zindagi Offers",
      };
      if (!actor) return empty;
      try {
        const data = await (actor as AnyActor).getCpagripSettings(
          getAdminToken(),
        );
        return {
          apiKey: data.apiKey ?? "",
          webhookSecret: data.webhookSecret ?? "",
          offerWallName: data.offerWallName ?? "Digital Zindagi Offers",
        };
      } catch {
        // Method not available or not admin — return empty defaults
        return empty;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    retry: false,
  });
}

// ============================================================
// Admin: Save CPAGrip keys atomically via saveCPAGripKeys
// ============================================================
export function useSaveCPAGripKeys() {
  const { actor } = useActor();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      apiKey,
      webhookSecret,
      offerWallName,
    }: {
      apiKey: string;
      webhookSecret: string;
      offerWallName: string;
    }): Promise<void> => {
      if (!actor)
        throw new Error(
          "Backend se connect nahi ho pa raha — thoda wait karein",
        );
      try {
        const result = await (
          actor as unknown as {
            saveCPAGripKeys(
              adminToken: string | null,
              a: string,
              w: string,
              n: string,
            ): Promise<
              { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
            >;
          }
        ).saveCPAGripKeys(
          getAdminToken(),
          apiKey.trim(),
          webhookSecret.trim(),
          offerWallName.trim(),
        );
        if (result && typeof result === "object") {
          if (
            "__kind__" in result &&
            (result as { __kind__: string }).__kind__ === "err"
          ) {
            throw new Error((result as { err: string }).err ?? "Save failed");
          }
        }
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        const lower = msg.toLowerCase();
        if (lower.includes("method not found"))
          throw new Error("Service is updating. Please refresh the page.");
        if (lower.includes("unauthorized"))
          throw new Error("Admin permission required.");
        if (
          lower.includes("canister") ||
          lower.includes("actor") ||
          lower.includes("fetch")
        ) {
          throw new Error(
            "Backend se connect nahi ho pa raha — thoda wait karein",
          );
        }
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offerPortalConfig"] });
      qc.invalidateQueries({ queryKey: ["cpagripSettings"] });
      toast.success("Settings Updated Successfully ✅");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save. Please try again.",
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
// Forgot Password: Request OTP (sends via Fast2SMS to registered mobile)
// ============================================================
export function useRequestOfferPasswordReset() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ email }: { email: string }): Promise<void> => {
      const a = requireActor(actor);
      try {
        const result = await a.requestOfferPasswordReset(email);
        if (result && typeof result === "object" && "__kind__" in result) {
          if ((result as { __kind__: string }).__kind__ === "err") {
            const errMsg = (result as { err: string }).err ?? "";
            const lower = errMsg.toLowerCase();
            if (
              lower.includes("not found") ||
              lower.includes("no user") ||
              lower.includes("does not exist")
            ) {
              throw new Error(
                "Yeh email register nahi hai. Pehle sign up karein.",
              );
            }
            throw new Error(
              errMsg || "OTP bhejne mein problem hua. Dobara try karein.",
            );
          }
        }
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        const lower = msg.toLowerCase();
        if (
          lower.includes("method not found") ||
          lower.includes("no update method")
        ) {
          // Backend method not yet available — still show friendly message
          throw new Error(
            "OTP service abhi available nahi hai. Admin se contact karein.",
          );
        }
        if (
          lower.includes("not found") ||
          lower.includes("no user") ||
          lower.includes("does not exist")
        ) {
          throw new Error("Yeh email register nahi hai. Pehle sign up karein.");
        }
        if (lower.includes("actor") || lower.includes("canister")) {
          throw new Error("Service temporarily unavailable. Please try again.");
        }
        throw err;
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "OTP request fail hua. Dobara try karein.",
      );
    },
  });
}

// ============================================================
// Forgot Password: Reset with OTP
// ============================================================
export function useResetOfferPassword() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      email,
      otp,
      newPasswordHash,
    }: {
      email: string;
      otp: string;
      newPasswordHash: string;
    }): Promise<void> => {
      const a = requireActor(actor);
      try {
        const result = await a.resetOfferPassword(email, otp, newPasswordHash);
        if (result && typeof result === "object" && "__kind__" in result) {
          if ((result as { __kind__: string }).__kind__ === "err") {
            const errMsg = (result as { err: string }).err ?? "";
            const lower = errMsg.toLowerCase();
            if (lower.includes("expired") || lower.includes("expire")) {
              throw new Error("OTP expire ho gaya, dobara request karein");
            }
            if (
              lower.includes("invalid") ||
              lower.includes("wrong") ||
              lower.includes("mismatch") ||
              lower.includes("incorrect")
            ) {
              throw new Error("OTP galat hai, fir koshish karein");
            }
            if (
              lower.includes("too many") ||
              lower.includes("limit") ||
              lower.includes("attempts")
            ) {
              throw new Error("Bahut zyada koshish, naya OTP request karein");
            }
            throw new Error(
              errMsg || "Password reset fail hua. Dobara try karein.",
            );
          }
        }
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        const lower = msg.toLowerCase();
        if (
          lower.includes("method not found") ||
          lower.includes("no update method")
        ) {
          throw new Error(
            "Reset service abhi available nahi hai. Admin se contact karein.",
          );
        }
        if (lower.includes("expired") || lower.includes("expire")) {
          throw new Error("OTP expire ho gaya, dobara request karein");
        }
        if (
          lower.includes("invalid") ||
          lower.includes("wrong") ||
          lower.includes("mismatch") ||
          lower.includes("incorrect")
        ) {
          throw new Error("OTP galat hai, fir koshish karein");
        }
        if (
          lower.includes("too many") ||
          lower.includes("limit") ||
          lower.includes("attempts")
        ) {
          throw new Error("Bahut zyada koshish, naya OTP request karein");
        }
        throw err;
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Password reset fail hua. Dobara try karein.",
      );
    },
  });
}

// ============================================================
// Admin: Reset any offer user's password directly
// ============================================================
export function useAdminResetOfferUserPassword() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      targetEmail,
      newPasswordHash,
    }: {
      targetEmail: string;
      newPasswordHash: string;
    }): Promise<void> => {
      if (!actor)
        throw new Error(
          "Backend se connect nahi ho pa raha — thoda wait karein",
        );
      try {
        const result = await (actor as AnyActor).adminResetOfferPassword(
          getAdminToken(),
          targetEmail,
          newPasswordHash,
        );
        if (result && typeof result === "object" && "__kind__" in result) {
          if ((result as { __kind__: string }).__kind__ === "err") {
            const errMsg = (result as { err: string }).err ?? "";
            const lower = errMsg.toLowerCase();
            if (lower.includes("unauthorized"))
              throw new Error("Admin permission required.");
            if (lower.includes("not found")) throw new Error("User nahi mila.");
            throw new Error(errMsg || "Password reset fail hua.");
          }
        }
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        const lower = msg.toLowerCase();
        if (
          lower.includes("method not found") ||
          lower.includes("no update method")
        ) {
          throw new Error(
            "Admin reset service abhi available nahi hai. Canister upgrade karein.",
          );
        }
        if (lower.includes("unauthorized"))
          throw new Error("Admin permission required.");
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      toast.success("Password reset ho gaya ✅");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Password reset fail hua. Dobara try karein.",
      );
    },
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
