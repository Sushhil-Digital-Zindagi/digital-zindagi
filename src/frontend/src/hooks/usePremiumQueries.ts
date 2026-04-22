/**
 * React Query hooks for the Likeup Premium subscription module.
 * All calls go through the ICP canister actor.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
        const data = (await asActor(
          actor,
        ).getMySubscription()) as UserSubscription | null;
        if (data) lsWrite("dz_premium_subscription", data);
        return data;
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
        const data = (await asActor(actor).isPremiumUser()) as boolean;
        lsWrite("dz_is_premium", data);
        return data;
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
        const data = (await asActor(actor).getPremiumPlans()) as
          | PremiumPlan[]
          | null;
        if (data && data.length > 0) return data;
        return DEFAULT_PREMIUM_PLANS;
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
        return (await asActor(
          actor,
        ).adminGetUpiPremiumRequests()) as UpiPremiumRequest[];
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
      return asActor(actor).activateStripePremium(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mySubscription"] });
      qc.invalidateQueries({ queryKey: ["isPremium"] });
      qc.invalidateQueries({ queryKey: ["chatProfile"] });
    },
  });
}

export function useSubmitUpiPremiumRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitUpiPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asActor(actor).submitUpiPremiumRequest(payload);
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
      planKey,
    }: {
      requestId: string;
      planKey: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return asActor(actor).adminApproveUpiPremium(requestId, planKey);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiPremiumRequests"] });
    },
  });
}

export function useAdminRejectPremium() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asActor(actor).adminRejectUpiPremium(requestId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiPremiumRequests"] });
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
      return asActor(actor).adminSetPremiumPrices(prices);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["premiumPlans"] });
    },
  });
}
