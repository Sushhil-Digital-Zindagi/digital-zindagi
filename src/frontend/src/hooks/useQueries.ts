import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminConfig,
  Banner,
  Category,
  CustomCode,
  JobItem,
  NewsItem,
  Order,
  ProviderProfile,
  ScrapRate,
  SubscriptionPlan,
  SubscriptionPricing,
  User,
  VideoItem,
} from "../types/appTypes";
import { useActor } from "./useActor";

// ---- localStorage helpers (fallback when canister unavailable) ----
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

// =====================================================================
// REAL-TIME POLLING HOOKS (2-second interval, localStorage fallback)
// =====================================================================

export function useCategories() {
  const { actor, isFetching } = useActor();
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      if (!actor) return lsRead<Category[]>("dz_canister_categories", []);
      try {
        const data = await (
          actor as unknown as { getCategories(): Promise<Category[]> }
        ).getCategories();
        lsWrite("dz_canister_categories", data);
        return data;
      } catch {
        return lsRead<Category[]>("dz_canister_categories", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

export function useNews() {
  const { actor, isFetching } = useActor();
  return useQuery<NewsItem[]>({
    queryKey: ["news"],
    queryFn: async () => {
      if (!actor) return lsRead<NewsItem[]>("dz_canister_news", []);
      try {
        const data = await (
          actor as unknown as { getNews(): Promise<NewsItem[]> }
        ).getNews();
        lsWrite("dz_canister_news", data);
        return data;
      } catch {
        return lsRead<NewsItem[]>("dz_canister_news", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

export function useJobs() {
  const { actor, isFetching } = useActor();
  return useQuery<JobItem[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      if (!actor) return lsRead<JobItem[]>("dz_canister_jobs", []);
      try {
        const data = await (
          actor as unknown as { getJobs(): Promise<JobItem[]> }
        ).getJobs();
        lsWrite("dz_canister_jobs", data);
        return data;
      } catch {
        return lsRead<JobItem[]>("dz_canister_jobs", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

export function useCustomCodes() {
  const { actor, isFetching } = useActor();
  return useQuery<CustomCode[]>({
    queryKey: ["custom-codes"],
    queryFn: async () => {
      if (!actor) return lsRead<CustomCode[]>("dz_canister_custom_codes", []);
      try {
        const data = await (
          actor as unknown as { getCustomCodes(): Promise<CustomCode[]> }
        ).getCustomCodes();
        lsWrite("dz_canister_custom_codes", data);
        return data;
      } catch {
        return lsRead<CustomCode[]>("dz_canister_custom_codes", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

export function useScrapRates() {
  const { actor, isFetching } = useActor();
  return useQuery<ScrapRate[]>({
    queryKey: ["scrap-rates"],
    queryFn: async () => {
      if (!actor) return lsRead<ScrapRate[]>("dz_canister_scrap_rates", []);
      try {
        const data = await (
          actor as unknown as { getScrapRates(): Promise<ScrapRate[]> }
        ).getScrapRates();
        lsWrite("dz_canister_scrap_rates", data);
        return data;
      } catch {
        return lsRead<ScrapRate[]>("dz_canister_scrap_rates", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

export function useVideos() {
  const { actor, isFetching } = useActor();
  return useQuery<VideoItem[]>({
    queryKey: ["videos"],
    queryFn: async () => {
      if (!actor) return lsRead<VideoItem[]>("dz_canister_videos", []);
      try {
        const data = await (
          actor as unknown as { getVideos(): Promise<VideoItem[]> }
        ).getVideos();
        lsWrite("dz_canister_videos", data);
        return data;
      } catch {
        return lsRead<VideoItem[]>("dz_canister_videos", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

// ---- Category mutations ----
export function useAddCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      emoji,
      color,
    }: { name: string; emoji: string; color: string }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addCategory(n: string, e: string, c: string): Promise<void>;
        }
      ).addCategory(name, emoji, color);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      emoji,
      color,
      enabled,
    }: {
      id: number;
      name: string;
      emoji: string;
      color: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateCategory(
            id: number,
            n: string,
            e: string,
            c: string,
            en: boolean,
          ): Promise<void>;
        }
      ).updateCategory(id, name, emoji, color, enabled);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as { deleteCategory(id: number): Promise<void> }
      ).deleteCategory(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// ---- News mutations ----
export function useAddNews() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      summary,
      imageUrl,
      link,
      category,
    }: {
      title: string;
      summary: string;
      imageUrl: string;
      link: string;
      category: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addNews(
            t: string,
            s: string,
            i: string,
            l: string,
            c: string,
          ): Promise<void>;
        }
      ).addNews(title, summary, imageUrl, link, category);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}

export function useUpdateNews() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      summary,
      imageUrl,
      link,
      category,
      enabled,
    }: {
      id: number;
      title: string;
      summary: string;
      imageUrl: string;
      link: string;
      category: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateNews(
            id: number,
            t: string,
            s: string,
            i: string,
            l: string,
            c: string,
            en: boolean,
          ): Promise<void>;
        }
      ).updateNews(id, title, summary, imageUrl, link, category, enabled);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}

export function useDeleteNews() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as { deleteNews(id: number): Promise<void> }
      ).deleteNews(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}

// ---- Job mutations ----
export function useAddJob() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      department,
      location,
      lastDate,
      applyLink,
      category,
    }: {
      title: string;
      department: string;
      location: string;
      lastDate: string;
      applyLink: string;
      category: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addJob(
            t: string,
            d: string,
            l: string,
            ld: string,
            al: string,
            c: string,
          ): Promise<void>;
        }
      ).addJob(title, department, location, lastDate, applyLink, category);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useUpdateJob() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      department,
      location,
      lastDate,
      applyLink,
      category,
      enabled,
    }: {
      id: number;
      title: string;
      department: string;
      location: string;
      lastDate: string;
      applyLink: string;
      category: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateJob(
            id: number,
            t: string,
            d: string,
            l: string,
            ld: string,
            al: string,
            c: string,
            en: boolean,
          ): Promise<void>;
        }
      ).updateJob(
        id,
        title,
        department,
        location,
        lastDate,
        applyLink,
        category,
        enabled,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useDeleteJob() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as { deleteJob(id: number): Promise<void> }
      ).deleteJob(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

// ---- Custom Code mutations ----
export function useAddCustomCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      code,
      btnLabel,
      icon,
      placement,
    }: {
      name: string;
      code: string;
      btnLabel: string;
      icon: string;
      placement: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addCustomCode(
            n: string,
            c: string,
            l: string,
            i: string,
            p: string,
          ): Promise<void>;
        }
      ).addCustomCode(name, code, btnLabel, icon, placement);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-codes"] }),
  });
}

export function useUpdateCustomCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      code,
      btnLabel,
      icon,
      placement,
      enabled,
    }: {
      id: number;
      name: string;
      code: string;
      btnLabel: string;
      icon: string;
      placement: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateCustomCode(
            id: number,
            n: string,
            c: string,
            l: string,
            i: string,
            p: string,
            en: boolean,
          ): Promise<void>;
        }
      ).updateCustomCode(id, name, code, btnLabel, icon, placement, enabled);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-codes"] }),
  });
}

export function useDeleteCustomCode() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as { deleteCustomCode(id: number): Promise<void> }
      ).deleteCustomCode(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-codes"] }),
  });
}

// ---- Scrap Rate mutations ----
export function useAddScrapRate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemName,
      ratePerKg,
      ratePerGram,
    }: { itemName: string; ratePerKg: number; ratePerGram: number }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addScrapRate(n: string, kg: number, g: number): Promise<void>;
        }
      ).addScrapRate(itemName, ratePerKg, ratePerGram);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scrap-rates"] }),
  });
}

export function useUpdateScrapRate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      itemName,
      ratePerKg,
      ratePerGram,
      enabled,
    }: {
      id: number;
      itemName: string;
      ratePerKg: number;
      ratePerGram: number;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateScrapRate(
            id: number,
            n: string,
            kg: number,
            g: number,
            en: boolean,
          ): Promise<void>;
        }
      ).updateScrapRate(id, itemName, ratePerKg, ratePerGram, enabled);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scrap-rates"] }),
  });
}

export function useDeleteScrapRate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as { deleteScrapRate(id: number): Promise<void> }
      ).deleteScrapRate(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scrap-rates"] }),
  });
}

// ---- Video mutations ----
export function useAddVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      videoUrl,
      thumbnailUrl,
      platform,
      category,
    }: {
      title: string;
      videoUrl: string;
      thumbnailUrl: string;
      platform: string;
      category: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addVideo(
            t: string,
            v: string,
            th: string,
            p: string,
            c: string,
          ): Promise<void>;
        }
      ).addVideo(title, videoUrl, thumbnailUrl, platform, category);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      videoUrl,
      thumbnailUrl,
      platform,
      category,
      enabled,
    }: {
      id: number;
      title: string;
      videoUrl: string;
      thumbnailUrl: string;
      platform: string;
      category: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateVideo(
            id: number,
            t: string,
            v: string,
            th: string,
            p: string,
            c: string,
            en: boolean,
          ): Promise<void>;
        }
      ).updateVideo(
        id,
        title,
        videoUrl,
        thumbnailUrl,
        platform,
        category,
        enabled,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as { deleteVideo(id: number): Promise<void> }
      ).deleteVideo(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}
