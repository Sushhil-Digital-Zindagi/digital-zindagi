import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminConfig,
  Banner,
  Order,
  ProviderProfile,
  SubscriptionPlan,
  SubscriptionPricing,
  User,
} from "../types/appTypes";
import { useActor } from "./useActor";

export function useActiveBanners() {
  const { actor, isFetching } = useActor();
  return useQuery<Banner[]>({
    queryKey: ["activeBanners"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveBanners();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useActiveProviders() {
  const { actor, isFetching } = useActor();
  return useQuery<ProviderProfile[]>({
    queryKey: ["activeProviders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveProviders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllToggles() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, boolean][]>({
    queryKey: ["allToggles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllToggles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useProvidersByCategory(category: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ProviderProfile[]>({
    queryKey: ["providersByCategory", category],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProvidersByCategory(category);
    },
    enabled: !!actor && !isFetching && !!category,
  });
}

export function useProviderProfile(userId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ProviderProfile | null>({
    queryKey: ["providerProfile", userId?.toString()],
    queryFn: async () => {
      if (!actor || userId === null) return null;
      return actor.getProviderProfile(userId);
    },
    enabled: !!actor && !isFetching && userId !== null,
  });
}

export function useUserById(userId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<User | null>({
    queryKey: ["userById", userId?.toString()],
    queryFn: async () => {
      if (!actor || userId === null) return null;
      return actor.getUserById(userId);
    },
    enabled: !!actor && !isFetching && userId !== null,
  });
}

export function useAdminConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<AdminConfig | null>({
    queryKey: ["adminConfig"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAdminConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubscriptionPricing() {
  const { actor, isFetching } = useActor();
  return useQuery<SubscriptionPricing | null>({
    queryKey: ["subscriptionPricing"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSubscriptionPricing();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRecentUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ["recentUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUsersByRole(role: string) {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ["usersByRole", role],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUsersByRole(role);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSearchUsers(text: string) {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ["searchUsers", text],
    queryFn: async () => {
      if (!actor || !text.trim()) return [];
      return actor.searchUsers(text);
    },
    enabled: !!actor && !isFetching && text.trim().length > 0,
  });
}

export function useProvidersPendingApproval() {
  const { actor, isFetching } = useActor();
  return useQuery<ProviderProfile[]>({
    queryKey: ["providersPendingApproval"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProvidersPendingApproval();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllProviders() {
  const { actor, isFetching } = useActor();
  return useQuery<ProviderProfile[]>({
    queryKey: ["allProviders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProviders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateToggle() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, value }: { name: string; value: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateToggle(name, value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allToggles"] }),
  });
}

export function useApproveProvider() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      plan,
    }: { userId: bigint; plan: SubscriptionPlan }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveProvider(userId, plan);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["providersPendingApproval"] }),
  });
}

export function useRejectProvider() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectProvider(userId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["providersPendingApproval"] }),
  });
}

export function useProviderOrders(userId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["providerOrders", userId?.toString()],
    queryFn: async () => {
      if (!actor || userId === null) return [];
      return actor.getProviderOrders(userId);
    },
    enabled: !!actor && !isFetching && userId !== null,
  });
}

export function useUpdateOrderStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: { orderId: bigint; status: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateOrderStatus(orderId, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providerOrders"] }),
  });
}
