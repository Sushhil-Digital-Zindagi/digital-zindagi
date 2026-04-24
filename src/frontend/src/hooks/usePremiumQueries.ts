/**
 * React Query hooks for the Likeup Premium subscription module.
 * All calls go through the ICP canister actor.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ActivateStripePayload,
  PremiumPlan,
  SubmitUpiPayload,
  UpiPremiumRequest,
  UserSubscription,
} from "../types/premiumTypes";
import { useActor } from "./useActor";

function asActor(
  actor: unknown,
): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return actor as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function lsWrite<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// Default plans (overridden by backend if available)
export const DEFAULT_PREMIUM_PLANS: PremiumPlan[] = [
  {
    key: "monthly",
    label: "Monthly",
    price: 99,
    durationDays: 30,
  },
  {
    key: "quarterly",
    label: "Quarterly",
    price: 249,
    originalPrice: 297,
    durationDays: 90,
    savings: "Save 16%",
  },
  {
    key: "annual",
    label: "Annual",
    price: 799,
    originalPrice: 1188,
    durationDays: 365,
    savings: "Save 33%",
  },
];

// ---- Read Hooks ----

export function useMySubscription() {
  const { actor, isFetching } = useActor();
  return useQuery<UserSubscription | null>({
    queryKey: ["mySubscription"],
    queryFn: async () => {
      if (!actor)
        return lsRead<UserSubscription | null>("dz_premium_subscription", null);
      try {
        // Backend: getMySubscription() -> PremiumSubscription | null
        const data = await asActor(actor).getMySubscription();
        if (!data) return null;
        const sub = data as {
          userId: unknown;
          plan: string;
          startedAt: bigint;
          expiresAt: bigint;
          isActive: boolean;
          paymentMethod: string;
        };
        const result: UserSubscription = {
          userId: String(sub.userId ?? ""),
          isPremium: sub.isActive,
          planKey: sub.plan as "monthly" | "quarterly" | "annual",
          activatedAt: Number(sub.startedAt ?? 0n) / 1_000_000,
          expiresAt: Number(sub.expiresAt ?? 0n) / 1_000_000,
          activatedVia: sub.paymentMethod === "stripe" ? "stripe" : "upi",
        };
        lsWrite("dz_premium_subscription", result);
        return result;
      } catch {
        return lsRead<UserSubscription | null>("dz_premium_subscription", null);
      }
    },
    enabled: !isFetching,
    staleTime: 10_000,
  });
}

export function useIsPremiumUser() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isPremium"],
    queryFn: async () => {
      if (!actor) return lsRead<boolean>("dz_is_premium", false);
      try {
        // Backend: isPremiumUser(userId: Principal | null) -> boolean
        const data = await asActor(actor).isPremiumUser(null);
        const result = Boolean(data);
        lsWrite("dz_is_premium", result);
        return result;
      } catch {
        return lsRead<boolean>("dz_is_premium", false);
      }
    },
    enabled: !isFetching,
    staleTime: 10_000,
  });
}

export function usePremiumPlans() {
  const { actor, isFetching } = useActor();
  return useQuery<PremiumPlan[]>({
    queryKey: ["premiumPlans"],
    queryFn: async () => {
      if (!actor) return DEFAULT_PREMIUM_PLANS;
      try {
        // Backend: getPremiumPlans() -> PremiumPrices {monthly, quarterly, annual}
        const raw = await asActor(actor).getPremiumPlans();
        if (!raw) return DEFAULT_PREMIUM_PLANS;
        const prices = raw as {
          monthly: bigint;
          quarterly: bigint;
          annual: bigint;
        };
        return [
          {
            key: "monthly" as const,
            label: "Monthly",
            price: Number(prices.monthly ?? 9900n) / 100,
            durationDays: 30,
          },
          {
            key: "quarterly" as const,
            label: "Quarterly",
            price: Number(prices.quarterly ?? 24900n) / 100,
            originalPrice:
              Math.round(Number(prices.monthly ?? 9900n) / 100) * 3,
            durationDays: 90,
            savings: "Save 16%",
          },
          {
            key: "annual" as const,
            label: "Annual",
            price: Number(prices.annual ?? 79900n) / 100,
            originalPrice:
              Math.round(Number(prices.monthly ?? 9900n) / 100) * 12,
            durationDays: 365,
            savings: "Save 33%",
          },
        ];
      } catch {
        return DEFAULT_PREMIUM_PLANS;
      }
    },
    enabled: !isFetching,
    staleTime: 60_000,
  });
}

export function useAdminUpiPremiumRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<UpiPremiumRequest[]>({
    queryKey: ["adminUpiPremiumRequests"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // Backend: adminGetUpiPremiumRequests() -> UpiPaymentRequest[]
        const data = await asActor(actor).adminGetUpiPremiumRequests();
        const raw = (data ?? []) as Array<{
          id: bigint;
          userId: unknown;
          plan: string;
          upiTxnRef: string;
          amount: bigint;
          status: string;
          createdAt: bigint;
        }>;
        return raw.map((r) => ({
          id: String(r.id),
          userId: String(r.userId ?? ""),
          userName: String(r.userId ?? ""),
          planKey: r.plan as "monthly" | "quarterly" | "annual",
          amount: Number(r.amount ?? 0n) / 100,
          upiTransactionRef: r.upiTxnRef ?? "",
          status: r.status as "pending" | "approved" | "rejected",
          submittedAt: Number(r.createdAt ?? 0n) / 1_000_000,
        }));
      } catch {
        return [];
      }
    },
    enabled: !isFetching,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

// ---- Mutation Hooks ----

export function useActivateStripePremium() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ActivateStripePayload) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: activateStripePremium(plan: PremiumPlan, stripeSubscriptionId: string)
      const result = await asActor(actor).activateStripePremium(
        payload.planKey as unknown,
        payload.sessionId,
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Activation failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySubscription"] });
      qc.invalidateQueries({ queryKey: ["isPremium"] });
      qc.invalidateQueries({ queryKey: ["chatProfile"] });
      toast.success("Premium activated! ✅");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Activation failed.");
    },
  });
}

export function useSubmitUpiPremiumRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitUpiPayload) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: submitUpiPremiumRequest(plan: PremiumPlan, upiTxnRef: string, amount: bigint)
      const result = await asActor(actor).submitUpiPremiumRequest(
        payload.planKey as unknown,
        payload.upiTransactionRef,
        BigInt(Math.round(payload.amount * 100)), // convert to paise
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Submit failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySubscription"] });
    },
  });
}

export function useAdminApprovePremium() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
    }: {
      requestId: string;
      planKey?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminApproveUpiPremium(requestId: bigint)
      const result = await asActor(actor).adminApproveUpiPremium(
        BigInt(requestId),
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Approve failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiPremiumRequests"] });
      toast.success("Premium approved ✅");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Approve failed.");
    },
  });
}

export function useAdminRejectPremium() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminRejectUpiPremium(requestId: bigint)
      const result = await asActor(actor).adminRejectUpiPremium(
        BigInt(requestId),
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Reject failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiPremiumRequests"] });
      toast.success("Premium request rejected.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Reject failed.");
    },
  });
}

export function useAdminSetPremiumPrices() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prices: {
      monthly: number;
      quarterly: number;
      annual: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminSetPremiumPrices(monthly: bigint, quarterly: bigint, annual: bigint)
      const result = await asActor(actor).adminSetPremiumPrices(
        BigInt(Math.round(prices.monthly * 100)),
        BigInt(Math.round(prices.quarterly * 100)),
        BigInt(Math.round(prices.annual * 100)),
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Update failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["premiumPlans"] });
      toast.success("Premium prices updated ✅");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    },
  });
}
