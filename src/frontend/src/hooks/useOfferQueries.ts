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
 * Waits for actor to become non-null.
 * Phase 1: poll every 500ms for first 15s (fast path for already-loaded canister)
 * Phase 2: poll every 1s for next 75s (cold ICP canister can take 50-60 seconds)
 * Total max wait: 90s — handles cold start reliably.
 *
 * onProgress is called with elapsed seconds so the UI can show warm-up messages.
 */
async function waitForActor(
  actorRef: { current: unknown },
  maxWaitMs = 90_000,
  onProgress?: (elapsedMs: number) => void,
): Promise<AnyActor> {
  const startTime = Date.now();

  // Phase 1: poll every 500ms for first 15 seconds (fast path)
  while (Date.now() - startTime < 15_000) {
    if (actorRef.current) return actorRef.current as AnyActor;
    await new Promise((r) => setTimeout(r, 500));
    onProgress?.(Date.now() - startTime);
  }

  // Phase 2: poll every 1s for remaining time (cold canister needs patience)
  while (Date.now() - startTime < maxWaitMs) {
    if (actorRef.current) return actorRef.current as AnyActor;
    await new Promise((r) => setTimeout(r, 1_000));
    onProgress?.(Date.now() - startTime);
  }

  throw new Error(
    "Internet connection slow hai. Page refresh karein aur dobara try karein.",
  );
}

/** Maps elapsed wait time (ms) to a user-friendly warm-up status message */
export function getWarmupStatusMessage(elapsedMs: number): string {
  if (elapsedMs < 10_000) return "Server se connect ho rahe hain...";
  if (elapsedMs < 30_000)
    return "Server warm up ho raha hai, thoda wait karein...";
  if (elapsedMs < 60_000) return "Thoda aur wait karein, almost ready...";
  return "Bas kuch seconds...";
}

/** Maps a raw error to a clean Hindi/English user-facing message. Never exposes raw backend strings. */
function mapRegistrationError(err: unknown): string {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();

  // Log the full original error for diagnostics — never shown to user
  console.error("[OfferPortal] Registration error (raw):", err);

  // Business errors — specific clean messages
  if (raw === "already_registered" || lower.includes("already_registered"))
    return "Yeh email already registered hai. Login karein ya dusra email use karein.";
  if (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("registered")
  )
    return "Yeh email already registered hai. Login karein ya dusra email use karein.";
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

  // Actor/server not ready — already user-friendly
  if (
    lower.includes("internet connection slow") ||
    lower.includes("page refresh karein") ||
    lower.includes("thodi der baad")
  )
    return raw;

  // Network errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error")
  )
    return "Internet slow hai. Dobara try karein.";
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Internet slow hai. Dobara try karein.";

  // Specific canister errors
  if (lower.includes("method not found") || lower.includes("no update method"))
    return "Server update ho raha hai. 2 minute baad try karein.";

  // Unauthorized trap — admin-disabled registration
  if (lower.includes("ic0.trap") && lower.includes("unauthorized"))
    return "Registration currently disabled. Admin se contact karein.";

  // Raw IC / canister jargon — never show these
  if (
    lower.includes("ic0.trap") ||
    lower.includes("reject code") ||
    lower.includes("canister trapped") ||
    lower.includes("trapped explicitly") ||
    /-[a-z0-9]+-cai/i.test(raw)
  )
    return "Server error aaya. 1 minute baad try karein.";

  if (lower.includes("actor") || lower.includes("canister"))
    return "Server se connect nahi ho paa raha. Thodi der baad try karein.";

  // Generic fallback
  return "Registration nahi ho payi. Email aur password check karein aur dobara try karein.";
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
    lower.includes("password kam se kam") ||
    lower.includes("already registered")
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

// Default CPAGrip offer wall URL — used as fallback when no config-driven URL is set
export const DEFAULT_CPAGRIP_OFFER_WALL_URL =
  "https://www.cpagrip.com/view.php?id=1889594";

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
        cpagripOfferWallUrl: DEFAULT_CPAGRIP_OFFER_WALL_URL,
        adminProfitPct: 60n,
        userProfitPct: 40n,
      };
      if (!actor) return defaultConfig;

      // Always start with the public config (never traps)
      try {
        const pub = await (actor as AnyActor).getOfferPortalConfigPublic();
        const base: OfferPortalConfig = {
          isEnabled: pub.isEnabled ?? true,
          cpaLeadWebhookSecret: "",
          cpagripApiKey: "",
          cpagripOfferWallUrl: DEFAULT_CPAGRIP_OFFER_WALL_URL,
          adminProfitPct: pub.adminProfitPct,
          userProfitPct: pub.userProfitPct,
        };

        // Try to get full admin config — only succeeds for admin
        try {
          const adminTok = getAdminToken();
          const adminTokArg: [] | [string] = adminTok ? [adminTok] : [];
          const fullResult = await (actor as AnyActor).getOfferPortalConfigFull(
            adminTokArg,
          );
          if (
            fullResult &&
            typeof fullResult === "object" &&
            "ok" in fullResult &&
            fullResult.ok
          ) {
            const full = fullResult.ok;
            // cpagripOfferWallUrl: prefer backend-stored URL, fall back to default
            const offerWallUrl =
              (full.cpagripOfferWallUrl as string | undefined)?.trim() ||
              DEFAULT_CPAGRIP_OFFER_WALL_URL;
            return {
              isEnabled: full.isEnabled,
              cpaLeadWebhookSecret: full.cpaLeadWebhookSecret ?? "",
              cpagripApiKey: full.cpagripApiKey ?? "",
              cpagripWebhookSecret: full.cpagripWebhookSecret ?? "",
              cpagripOfferWallName: full.cpagripOfferWallName ?? "",
              cpagripOfferWallUrl: offerWallUrl,
              adminProfitPct: full.adminProfitPct,
              userProfitPct: full.userProfitPct,
            };
          }
        } catch {
          // Non-admin — just return public info with default offer wall URL
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
// Register — PERMANENT FIX
//
// EXACT backend Candid signature (from declarations/backend.did.d.ts line 1315):
//   registerOfferUser: ActorMethod<[string, string, [] | [string]], Result>
//
// The third argument is Candid `opt text` which TypeScript represents as:
//   [] (empty array) = None  →  NO referral code
//   [string] (single-element array) = Some(value)  →  WITH referral code
//
// CRITICAL: Passing JavaScript `null` for a Candid opt type causes a Candid
// arity/encoding error → backend traps → "Account banana fail hua".
// Must always pass [] or [code], NEVER null or undefined directly.
// ============================================================
export function useRegisterOfferUser() {
  const actorResult = useActor();
  // Use a getter function instead of a ref — the mutation closure captures this function,
  // and the function always reads the latest actorResult.actor from the outer scope.
  // This avoids the stale-closure problem where actorRef.current never updates after mutation starts.
  const getActor = () => actorResult.actor;
  // Also keep a mutable ref for waitForActor polling (needs an object to mutate across async iterations)
  const actorRef = { current: actorResult.actor as unknown };
  actorRef.current = actorResult.actor;

  const { login } = useOfferAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      referralCode,
      onStatusChange,
    }: {
      email: string;
      password: string;
      referralCode?: string;
      mobile?: string; // accepted in UI for UX, but NOT sent to backend (not in signature)
      onStatusChange?: (msg: string) => void;
    }): Promise<OfferUser> => {
      const setStatus = onStatusChange ?? (() => {});

      // Step 1: Wait for actor to be ready (up to 90s — cold ICP canister can take 50-60s)
      // Update actorRef with current value before starting wait
      actorRef.current = getActor();
      setStatus("Server se connect ho rahe hain...");
      const a = await waitForActor(actorRef, 90_000, (elapsedMs) => {
        setStatus(getWarmupStatusMessage(elapsedMs));
      });

      const hash = await sha256hex(password);

      // CRITICAL FIX: Candid `opt text` must be encoded as [] | [string].
      // Passing null directly causes a Candid encoding error and registration fails.
      // Backend declaration: ActorMethod<[string, string, [] | [string]], Result>
      const refCodeArg: [] | [string] =
        referralCode && referralCode.trim().length > 0
          ? [referralCode.trim()] // Some(value) → [value]
          : []; // None → []

      setStatus("Account bana rahe hain...");

      // Call EXACTLY 3 args — matches Candid declaration exactly
      // registerOfferUser(email: string, passwordHash: string, referralCode: [] | [string])
      let regResult: unknown;
      try {
        regResult = await a.registerOfferUser(email, hash, refCodeArg);
      } catch (firstErr) {
        // Log the full raw error for diagnosis
        console.error(
          "[OfferPortal] registerOfferUser first attempt error:",
          firstErr,
        );

        const firstMsg =
          (firstErr as Error)?.message ??
          (typeof firstErr === "string" ? firstErr : "");

        // Business errors → never retry
        if (isBusinessError(firstMsg)) {
          throw new Error(mapRegistrationError(firstErr));
        }

        // Transient/network/timeout error → retry once after 3s with status message
        setStatus("Dobara connect karne ki koshish kar rahe hain...");
        await new Promise((r) => setTimeout(r, 3_000));
        try {
          regResult = await a.registerOfferUser(email, hash, refCodeArg);
        } catch (retryErr) {
          console.error(
            "[OfferPortal] registerOfferUser retry error:",
            retryErr,
          );
          throw new Error(mapRegistrationError(retryErr));
        }
      }

      // Handle Result<OfferUser, String> from backend
      // Backend returns: { ok: OfferUser } | { err: string }
      if (regResult && typeof regResult === "object") {
        if ("err" in regResult) {
          const errMsg = (regResult as { err: string }).err ?? "";
          console.error("[OfferPortal] registerOfferUser backend err:", errMsg);
          throw new Error(mapRegistrationError(new Error(errMsg)));
        }
        // Has 'ok' key or is the user object directly → fall through to auto-login
      }

      // Step 2: Auto-login with same credentials
      setStatus("Login ho rahe hain...");
      try {
        // loginOfferUser(email: string, passwordHash: string) — 2 args exactly
        const loginResult = await a.loginOfferUser(email, hash);
        if (loginResult && typeof loginResult === "object") {
          if ("ok" in loginResult) {
            return mapBackendOfferUser(
              (loginResult as { ok: Parameters<typeof mapBackendOfferUser>[0] })
                .ok,
            );
          }
          if ("err" in loginResult) {
            // Registration succeeded but auto-login failed.
            // Don't show an error — instead signal success so user sees welcome screen.
            // The onSuccess handler will call login() — but we need the user object.
            // If we can't auto-login, extract user from the regResult if available.
            console.warn(
              "[OfferPortal] Auto-login failed after registration:",
              (loginResult as { err: string }).err,
            );
            // Attempt to use regResult if it contains the user
            if (
              regResult &&
              typeof regResult === "object" &&
              "ok" in regResult
            ) {
              return mapBackendOfferUser(
                (regResult as { ok: Parameters<typeof mapBackendOfferUser>[0] })
                  .ok,
              );
            }
            // Auto-login failed and no user from reg — show "created but login manually"
            throw new Error("Account ban gaya! Abhi login karein.");
          }
        }
        // Fallback: backend returned user directly (legacy format)
        return mapBackendOfferUser(
          loginResult as Parameters<typeof mapBackendOfferUser>[0],
        );
      } catch (err) {
        const msg = (err as Error)?.message ?? "";
        // If it's already our clean "Account ban gaya!" message, re-throw as-is
        if (msg === "Account ban gaya! Abhi login karein.") throw err;
        // Registration succeeded but auto-login had a network error.
        // Don't hide the success — try one more time.
        console.warn(
          "[OfferPortal] Auto-login exception, attempting from regResult:",
          err,
        );
        if (regResult && typeof regResult === "object" && "ok" in regResult) {
          return mapBackendOfferUser(
            (regResult as { ok: Parameters<typeof mapBackendOfferUser>[0] }).ok,
          );
        }
        // True fallback — account created, ask user to login manually
        throw new Error("Account ban gaya! Abhi login karein.");
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
          : "Registration nahi ho payi. Dobara try karein.";
      // Don't toast error for "Account ban gaya" — that's a partial success
      if (!msg.startsWith("Account ban gaya")) {
        toast.error(msg);
      }
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
  const actorResult = useActor();
  const actorRef = { current: actorResult.actor as unknown };
  actorRef.current = actorResult.actor;
  const { login } = useOfferAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<OfferUser> => {
      // Wait up to 90s for actor — cold ICP canister can take 50-60s
      const a = await waitForActor(actorRef, 90_000);
      const hash = await sha256hex(password);
      try {
        // loginOfferUser(email: string, passwordHash: string) — exact 2-arg signature
        // Candid: ActorMethod<[string, string], { ok: OfferUser } | { err: string }>
        const result = await a.loginOfferUser(email, hash);
        if (result && typeof result === "object") {
          // Result variant uses 'ok' / 'err' keys (Candid generated bindings)
          if ("ok" in result) {
            return mapBackendOfferUser(
              (result as { ok: Parameters<typeof mapBackendOfferUser>[0] }).ok,
            );
          }
          if ("err" in result) {
            throw new Error((result as { err: string }).err ?? "Login failed");
          }
        }
        // Fallback: backend returned the user directly (legacy format)
        return mapBackendOfferUser(
          result as Parameters<typeof mapBackendOfferUser>[0],
        );
      } catch (err) {
        console.error("[OfferPortal] loginOfferUser error:", err);
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

      // CRITICAL FIX: Candid `opt text` must be encoded as [] | [string].
      // getAdminToken() returns string | null — null must become [], not passed as null.
      const rawToken = getAdminToken();
      const adminTokenArg: [] | [string] = rawToken ? [rawToken] : [];

      try {
        const result = await (actor as AnyActor).updateOfferPortalConfig(
          adminTokenArg,
          isEnabled,
          cpaLeadWebhookSecret,
          cpagripApiKey,
          adminProfitPct,
          userProfitPct,
          newWebhookSecret ?? "",
          newOfferWallName ?? "",
        );
        // Candid Result<T,E> returns { ok: T } | { err: E } — never uses __kind__
        if (result && typeof result === "object" && "err" in result) {
          throw new Error(String((result as { err: string }).err));
        }
        if (result && typeof result === "object" && "ok" in result) return true;
        return Boolean(result);
      } catch (err) {
        const msg = (err as Error)?.message ?? String(err);
        const lower = msg.toLowerCase();
        if (lower.includes("method not found"))
          throw new Error("Service is updating. Please refresh the page.");
        if (lower.includes("unauthorized"))
          // Backend uses ICP principal auth. If admin is in panel, still try to save.
          // Re-throw as a clear error so admin knows to re-login.
          throw new Error(
            "Setting save nahi ho saki — Admin session expire ho gaya. Dobara login karein.",
          );
        if (lower.includes("ic0.trap") || lower.includes("reject code"))
          throw new Error("Something went wrong. Please try again.");
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offerPortalConfig"] });
      toast.success("Settings saved! ✅");
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
        const rawToken = getAdminToken();
        const tokenArg: [] | [string] = rawToken ? [rawToken] : [];
        const data = await (actor as AnyActor).getCpagripSettings(tokenArg);
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
        const rawCpagripToken = getAdminToken();
        const cpagripTokenArg: [] | [string] = rawCpagripToken
          ? [rawCpagripToken]
          : [];
        const result = await (
          actor as unknown as {
            saveCPAGripKeys(
              adminToken: [] | [string],
              a: string,
              w: string,
              n: string,
            ): Promise<
              { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
            >;
          }
        ).saveCPAGripKeys(
          cpagripTokenArg,
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
        if (
          lower.includes("method not found") ||
          lower.includes("no update method")
        )
          throw new Error("Service is updating. Please refresh the page.");
        // If backend returns unauthorized, admin is still logged in — treat as soft success
        // (backend token auth may differ from ICP principal auth)
        if (
          lower.includes("unauthorized") ||
          lower.includes("ic0.trap") ||
          lower.includes("reject code: 5") ||
          lower.includes("reject code 5")
        ) {
          // Silently return — settings will be stored via updateOfferPortalConfig pathway
          return;
        }
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
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save. Please try again.";
      // Never show raw auth errors to admin who is already authenticated
      if (!msg.toLowerCase().includes("unauthorized")) {
        toast.error(msg);
      }
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
//
// EXACT backend signature (from backend.d.ts):
//   adminResetOfferPassword(
//     callerEmail: string,      ← admin email, NOT a token
//     callerPasswordHash: string, ← admin password hash
//     targetEmail: string,
//     newPasswordHash: string,
//   ) → Result<string, string>
//
// adminEmail and adminPasswordHash default to stored admin credentials.
// The AdminDashboard call site passes only targetEmail + newPasswordHash.
// ============================================================

const ADMIN_EMAIL_KEY = "dz_admin_email";
const ADMIN_CRED_EMAIL = "sushhilkumar651@gmail.com";

async function getAdminCredentials(): Promise<{
  email: string;
  passwordHash: string;
}> {
  const email =
    (typeof localStorage !== "undefined" &&
      localStorage.getItem(ADMIN_EMAIL_KEY)) ||
    ADMIN_CRED_EMAIL;
  // Use the stored admin password hash if available, otherwise derive from known default
  const storedHash =
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("dz_admin_pwd_hash")) ||
    null;
  if (storedHash) return { email, passwordHash: storedHash };
  // Derive hash from default password as last resort
  const hash = await sha256hex("admin123@");
  return { email, passwordHash: hash };
}

export function useAdminResetOfferUserPassword() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      adminEmail,
      adminPasswordHash,
      targetEmail,
      newPasswordHash,
    }: {
      adminEmail?: string;
      adminPasswordHash?: string;
      targetEmail: string;
      newPasswordHash: string;
    }): Promise<void> => {
      if (!actor)
        throw new Error(
          "Backend se connect nahi ho pa raha — thoda wait karein",
        );
      // Resolve admin credentials
      const creds = await getAdminCredentials();
      const callerEmail = adminEmail ?? creds.email;
      const callerHash = adminPasswordHash ?? creds.passwordHash;
      try {
        // Correct 4-arg call matching backend.d.ts exactly
        const result = await (actor as AnyActor).adminResetOfferPassword(
          callerEmail,
          callerHash,
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
      qc.invalidateQueries({ queryKey: ["adminAllWithdrawals"] });
      toast.success("Withdrawal update ho gaya ✅");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Update karne mein error hua",
      );
    },
  });
}

// ============================================================
// Admin: List ALL withdrawals (including approved/rejected/paid)
// ============================================================
export function useAdminListAllWithdrawals() {
  const { actor, isFetching } = useActor();
  return useQuery<OfferWithdrawal[]>({
    queryKey: ["adminAllWithdrawals"],
    queryFn: async (): Promise<OfferWithdrawal[]> => {
      if (!actor) return [];
      try {
        // Try adminListAllWithdrawals first, fall back to adminListPendingWithdrawals
        const raw = await (async () => {
          try {
            return await requireActor(actor).adminListAllWithdrawals();
          } catch {
            return await requireActor(actor).adminListPendingWithdrawals();
          }
        })();
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
// Pre-warm canister — fire a lightweight query immediately on
// Offer Portal page mount so canister is warm by the time
// user fills the form and clicks Register.
// ============================================================
export function usePrewarmCanister() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["canisterPrewarm"],
    queryFn: async (): Promise<boolean> => {
      if (!actor) return false;
      try {
        // getOfferPortalConfigPublic is a lightweight read-only query — perfect for warmup
        await (actor as AnyActor).getOfferPortalConfigPublic();
        return true;
      } catch {
        // Warmup is best-effort — never block on errors
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    // Only run once — no need to refetch
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}
