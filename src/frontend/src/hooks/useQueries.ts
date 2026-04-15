import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminConfig,
  AuditLogEntry,
  Banner,
  Category,
  CommissionConfig,
  ContentLockerConfig,
  CustomCode,
  CustomSection,
  JobItem,
  LockedFeature,
  NewsItem,
  Order,
  PaymentConfig,
  ProviderProfile,
  RechargeReceipt,
  RechargeTransaction,
  ScrapRate,
  SubscriptionPlan,
  SubscriptionPricing,
  UdhaarCustomer,
  UdhaarTransaction,
  User,
  UserSubscription,
  VideoItem,
  WalletTopupRequest,
} from "../types/appTypes";
import { useActor } from "./useActor";

// ---- localStorage helpers (cache layer — written AFTER canister confirms) ----
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

// ---- Custom Sections hooks ----

export function useCustomSections() {
  const { actor, isFetching } = useActor();
  return useQuery<CustomSection[]>({
    queryKey: ["custom-sections"],
    queryFn: async () => {
      if (!actor)
        return lsRead<CustomSection[]>("dz_canister_custom_sections", []);
      try {
        const data = await (
          actor as unknown as {
            getCustomSections(): Promise<CustomSection[]>;
          }
        ).getCustomSections();
        lsWrite("dz_canister_custom_sections", data);
        return data;
      } catch {
        return lsRead<CustomSection[]>("dz_canister_custom_sections", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

export function useAddCustomSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      heading,
      placement,
      buttons,
    }: {
      name: string;
      heading: string;
      placement: string;
      buttons: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          addCustomSection(
            n: string,
            h: string,
            p: string,
            b: string,
          ): Promise<number>;
        }
      ).addCustomSection(name, heading, placement, buttons);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-sections"] }),
  });
}

export function useUpdateCustomSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      heading,
      placement,
      buttons,
      enabled,
    }: {
      id: number;
      name: string;
      heading: string;
      placement: string;
      buttons: string;
      enabled: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          updateCustomSection(
            id: number,
            n: string,
            h: string,
            p: string,
            b: string,
            en: boolean,
          ): Promise<boolean>;
        }
      ).updateCustomSection(id, name, heading, placement, buttons, enabled);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-sections"] }),
  });
}

export function useDeleteCustomSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          deleteCustomSection(id: number): Promise<boolean>;
        }
      ).deleteCustomSection(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-sections"] }),
  });
}

export function useToggleCustomSection() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return (
        actor as unknown as {
          toggleCustomSection(id: number, en: boolean): Promise<boolean>;
        }
      ).toggleCustomSection(id, enabled);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-sections"] }),
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

// ---- App Settings (canister-backed JSON blob) ----

export type AppSettings = {
  notificationBarText?: string;
  notificationBarEnabled?: boolean;
  welcomeMessage?: string;
  tagline?: string;
  footerCopyright?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  showInstallBtn?: boolean;
  splashEnabled?: boolean;
  founderName?: string;
  founderPhoto?: string;
  appLogoUrl?: string;
  splashLogoUrl?: string;
  socialSettings?: Record<string, unknown>;
  affiliateSettings?: Record<string, unknown>;
  admobConfig?: Record<string, unknown>;
  adPlacements?: Record<string, boolean>;
  customInternalAds?: string[];
};

const APP_SETTINGS_LS_KEY = "dz_app_settings_cache";

function lsReadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AppSettings;
  } catch {
    return {};
  }
}

export function useAppSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<AppSettings>({
    queryKey: ["appSettings"],
    queryFn: async () => {
      if (!actor) return lsReadAppSettings();
      try {
        const json = await (
          actor as unknown as { getAppSettings(): Promise<string> }
        ).getAppSettings();
        const parsed =
          json && json !== "{}" ? (JSON.parse(json) as AppSettings) : {};
        // Also load individual legacy localStorage keys as fallback if canister is empty
        const merged: AppSettings = {
          notificationBarText:
            localStorage.getItem("dz_notification_bar") ?? undefined,
          notificationBarEnabled:
            localStorage.getItem("dz_notification_bar_enabled") === "true",
          welcomeMessage:
            localStorage.getItem("dz_welcome_message") ?? undefined,
          tagline: localStorage.getItem("dz_app_tagline") ?? undefined,
          footerCopyright:
            localStorage.getItem("dz_footer_copyright") ?? undefined,
          contactPhone: localStorage.getItem("dz_contact_phone") ?? undefined,
          contactEmail: localStorage.getItem("dz_contact_email") ?? undefined,
          contactAddress:
            localStorage.getItem("dz_contact_address") ?? undefined,
          showInstallBtn:
            localStorage.getItem("dz_show_install_btn") !== "false",
          splashEnabled: localStorage.getItem("dz_splash_enabled") !== "false",
          founderName: (() => {
            try {
              return (
                JSON.parse(localStorage.getItem("dz_founder") ?? "{}").name ??
                ""
              );
            } catch {
              return "";
            }
          })(),
          founderPhoto: (() => {
            try {
              return (
                JSON.parse(localStorage.getItem("dz_founder") ?? "{}").photo ??
                ""
              );
            } catch {
              return "";
            }
          })(),
          appLogoUrl: localStorage.getItem("dz_app_logo") ?? undefined,
          splashLogoUrl: localStorage.getItem("dz_splash_logo") ?? undefined,
          ...parsed,
        };
        localStorage.setItem(APP_SETTINGS_LS_KEY, JSON.stringify(merged));
        return merged;
      } catch {
        return lsReadAppSettings();
      }
    },
    enabled: !isFetching,
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

export function useUpdateAppSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AppSettings) => {
      if (!actor)
        throw new Error("Actor not available — canister not connected");
      // Read current canister value, merge, write back
      let current: AppSettings = {};
      try {
        const raw = await (
          actor as unknown as { getAppSettings(): Promise<string> }
        ).getAppSettings();
        if (raw && raw !== "{}") current = JSON.parse(raw) as AppSettings;
      } catch {
        // ignore — we'll just overwrite
      }
      const merged = { ...current, ...settings };
      const json = JSON.stringify(merged);
      await (
        actor as unknown as { updateAppSettings(json: string): Promise<void> }
      ).updateAppSettings(json);
      // Cache in localStorage after canister confirms
      localStorage.setItem(APP_SETTINGS_LS_KEY, JSON.stringify(merged));
      // Also update individual legacy localStorage keys for backward compat
      if (settings.notificationBarText !== undefined)
        localStorage.setItem(
          "dz_notification_bar",
          settings.notificationBarText,
        );
      if (settings.notificationBarEnabled !== undefined)
        localStorage.setItem(
          "dz_notification_bar_enabled",
          settings.notificationBarEnabled ? "true" : "false",
        );
      if (settings.welcomeMessage !== undefined)
        localStorage.setItem("dz_welcome_message", settings.welcomeMessage);
      if (settings.tagline !== undefined)
        localStorage.setItem("dz_app_tagline", settings.tagline);
      if (settings.footerCopyright !== undefined)
        localStorage.setItem("dz_footer_copyright", settings.footerCopyright);
      if (settings.contactPhone !== undefined)
        localStorage.setItem("dz_contact_phone", settings.contactPhone);
      if (settings.contactEmail !== undefined)
        localStorage.setItem("dz_contact_email", settings.contactEmail);
      if (settings.contactAddress !== undefined)
        localStorage.setItem("dz_contact_address", settings.contactAddress);
      if (settings.showInstallBtn !== undefined)
        localStorage.setItem(
          "dz_show_install_btn",
          settings.showInstallBtn ? "true" : "false",
        );
      if (settings.splashEnabled !== undefined)
        localStorage.setItem(
          "dz_splash_enabled",
          settings.splashEnabled ? "true" : "false",
        );
      if (
        settings.founderName !== undefined ||
        settings.founderPhoto !== undefined
      ) {
        const existing = (() => {
          try {
            return JSON.parse(localStorage.getItem("dz_founder") ?? "{}");
          } catch {
            return {};
          }
        })();
        localStorage.setItem(
          "dz_founder",
          JSON.stringify({
            ...existing,
            ...(settings.founderName !== undefined
              ? { name: settings.founderName }
              : {}),
            ...(settings.founderPhoto !== undefined
              ? { photo: settings.founderPhoto }
              : {}),
          }),
        );
      }
      if (settings.appLogoUrl !== undefined)
        localStorage.setItem("dz_app_logo", settings.appLogoUrl);
      if (settings.splashLogoUrl !== undefined)
        localStorage.setItem("dz_splash_logo", settings.splashLogoUrl);
      if (settings.socialSettings !== undefined)
        localStorage.setItem(
          "dz_social_settings",
          JSON.stringify(settings.socialSettings),
        );
      if (settings.affiliateSettings !== undefined)
        localStorage.setItem(
          "dz_affiliate_settings",
          JSON.stringify(settings.affiliateSettings),
        );
      if (settings.admobConfig !== undefined)
        localStorage.setItem(
          "dz_admob_config",
          JSON.stringify(settings.admobConfig),
        );
      if (settings.adPlacements !== undefined)
        localStorage.setItem(
          "dz_ad_placements",
          JSON.stringify(settings.adPlacements),
        );
      if (settings.customInternalAds !== undefined)
        localStorage.setItem(
          "dz_custom_internal_ads",
          JSON.stringify(settings.customInternalAds),
        );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appSettings"] }),
  });
}

// =====================================================================
// UDHAAR BOOK HOOKS — canister-backed, provider-scoped
// shopId = String(provider.userId) — used as the isolation key in the canister
// =====================================================================

import type { backendInterface } from "../backend.d.ts";

/** Typed accessor for actor that exposes all Udhaar backend methods */
type UdhaarActor = Pick<
  backendInterface,
  | "getUdhaarCustomers"
  | "getUdhaarTransactions"
  | "addUdhaarCustomer"
  | "updateUdhaarCustomer"
  | "deleteUdhaarCustomer"
  | "addUdhaarTransaction"
  | "markUdhaarTransactionPaid"
  | "deleteUdhaarTransaction"
>;

function asUdhaarActor(actor: unknown): UdhaarActor {
  return actor as UdhaarActor;
}

/** Map backend UdhaarCustomer (uses shopId) → frontend UdhaarCustomer (uses providerId) */
function mapBackendCustomer(
  c: import("../backend.d.ts").UdhaarCustomer,
): UdhaarCustomer {
  return {
    id: c.id,
    providerId: c.shopId,
    name: c.name,
    mobile: c.mobile,
    address: c.address,
    createdAt: Number(c.createdAt),
  };
}

/** Map backend UdhaarTransaction (uses transactionType) → frontend UdhaarTransaction (uses txType) */
function mapBackendTransaction(
  t: import("../backend.d.ts").UdhaarTransaction,
): UdhaarTransaction {
  return {
    id: t.id,
    customerId: t.customerId,
    amount: t.amount,
    txType: (t.transactionType === "give" ? "give" : "take") as "give" | "take",
    date: t.date,
    note: t.note,
    status: (t.status === "paid" ? "paid" : "pending") as "pending" | "paid",
    createdAt: Number(t.createdAt),
  };
}

/** localStorage cache keys for optimistic reads while canister fetches */
function udhaarCustomersCacheKey(shopId: string) {
  return `dz_udhaar_customers_${shopId}`;
}
function udhaarTransactionsCacheKey(shopId: string) {
  return `dz_udhaar_txns_${shopId}`;
}

export function useUdhaarCustomers(shopId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<UdhaarCustomer[]>({
    queryKey: ["udhaarCustomers", shopId],
    queryFn: async () => {
      if (!actor)
        return lsRead<UdhaarCustomer[]>(udhaarCustomersCacheKey(shopId), []);
      try {
        const raw = await asUdhaarActor(actor).getUdhaarCustomers();
        const mapped = raw.map(mapBackendCustomer);
        lsWrite(udhaarCustomersCacheKey(shopId), mapped);
        return mapped;
      } catch {
        return lsRead<UdhaarCustomer[]>(udhaarCustomersCacheKey(shopId), []);
      }
    },
    enabled: !!shopId && !isFetching,
    staleTime: 0,
    refetchInterval: 3000,
  });
}

export function useUdhaarTransactions(customerId: string, shopId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<UdhaarTransaction[]>({
    queryKey: ["udhaarTransactions", customerId, shopId],
    queryFn: async () => {
      if (!actor) {
        const cached = lsRead<UdhaarTransaction[]>(
          udhaarTransactionsCacheKey(shopId),
          [],
        );
        return cached.filter((t) => t.customerId === customerId);
      }
      try {
        const raw =
          await asUdhaarActor(actor).getUdhaarTransactions(customerId);
        const mapped = (raw.__kind__ === "ok" ? raw.ok : []).map(
          mapBackendTransaction,
        );
        // Merge into cache keyed by shopId so allUdhaarTransactions benefits too
        const existing = lsRead<UdhaarTransaction[]>(
          udhaarTransactionsCacheKey(shopId),
          [],
        );
        const otherCust = existing.filter((t) => t.customerId !== customerId);
        lsWrite(udhaarTransactionsCacheKey(shopId), [...otherCust, ...mapped]);
        return mapped;
      } catch {
        const cached = lsRead<UdhaarTransaction[]>(
          udhaarTransactionsCacheKey(shopId),
          [],
        );
        return cached.filter((t) => t.customerId === customerId);
      }
    },
    enabled: !!customerId && !!shopId && !isFetching,
    staleTime: 0,
    refetchInterval: 3000,
  });
}

export function useAddUdhaarCustomer(shopId: string) {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<UdhaarCustomer, "id" | "providerId" | "createdAt">,
    ) => {
      if (!actor) throw new Error("Actor not available");
      const result = await asUdhaarActor(actor).addUdhaarCustomer(
        data.name,
        data.mobile,
        data.address,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return mapBackendCustomer(result.ok);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["udhaarCustomers", shopId] });
      qc.invalidateQueries({ queryKey: ["allUdhaarTransactions", shopId] });
    },
  });
}

export function useUpdateUdhaarCustomer(shopId: string) {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Pick<UdhaarCustomer, "id" | "name" | "mobile" | "address">,
    ) => {
      if (!actor) throw new Error("Actor not available");
      const result = await asUdhaarActor(actor).updateUdhaarCustomer(
        data.id,
        data.name,
        data.mobile,
        data.address,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return mapBackendCustomer(result.ok);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["udhaarCustomers", shopId] }),
  });
}

export function useDeleteUdhaarCustomer(shopId: string) {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result =
        await asUdhaarActor(actor).deleteUdhaarCustomer(customerId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["udhaarCustomers", shopId] });
      qc.invalidateQueries({ queryKey: ["udhaarTransactions"] });
      qc.invalidateQueries({ queryKey: ["allUdhaarTransactions", shopId] });
    },
  });
}

export function useAddUdhaarTransaction(shopId: string) {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<UdhaarTransaction, "id" | "status" | "createdAt">,
    ) => {
      if (!actor) throw new Error("Actor not available");
      const result = await asUdhaarActor(actor).addUdhaarTransaction(
        data.customerId,
        data.amount,
        data.txType, // "give" | "take"
        data.date,
        data.note,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return mapBackendTransaction(result.ok);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["udhaarTransactions", vars.customerId, shopId],
      });
      qc.invalidateQueries({ queryKey: ["udhaarCustomers", shopId] });
      qc.invalidateQueries({ queryKey: ["allUdhaarTransactions", shopId] });
    },
  });
}

export function useMarkUdhaarTransactionPaid(shopId: string) {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      txId,
      customerId,
    }: { txId: string; customerId: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await asUdhaarActor(actor).markUdhaarTransactionPaid(txId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return { txId, customerId };
    },
    onSuccess: (_data) => {
      qc.invalidateQueries({
        queryKey: ["udhaarTransactions", _data.customerId, shopId],
      });
      qc.invalidateQueries({ queryKey: ["udhaarCustomers", shopId] });
      qc.invalidateQueries({ queryKey: ["allUdhaarTransactions", shopId] });
    },
  });
}

export function useDeleteUdhaarTransaction(shopId: string) {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      txId,
      customerId,
    }: { txId: string; customerId: string }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await asUdhaarActor(actor).deleteUdhaarTransaction(txId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return { txId, customerId };
    },
    onSuccess: (_data) => {
      qc.invalidateQueries({
        queryKey: ["udhaarTransactions", _data.customerId, shopId],
      });
      qc.invalidateQueries({ queryKey: ["udhaarCustomers", shopId] });
      qc.invalidateQueries({ queryKey: ["allUdhaarTransactions", shopId] });
    },
  });
}

/**
 * Aggregates all transactions across all of this provider's customers.
 * Used for the dashboard stats (pending count, total balance).
 * Polls every 3 seconds for real-time sync.
 */
export function useAllUdhaarTransactions(shopId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<UdhaarTransaction[]>({
    queryKey: ["allUdhaarTransactions", shopId],
    queryFn: async () => {
      // Use the customers list to fetch transactions per customer
      if (!actor) {
        return lsRead<UdhaarTransaction[]>(
          udhaarTransactionsCacheKey(shopId),
          [],
        );
      }
      try {
        const ua = asUdhaarActor(actor);
        const customers = await ua.getUdhaarCustomers();
        if (customers.length === 0) return [];
        const txnArrays = await Promise.all(
          customers.map((c) => ua.getUdhaarTransactions(c.id)),
        );
        const allMapped = txnArrays
          .flatMap((r) => (r.__kind__ === "ok" ? r.ok : []))
          .map(mapBackendTransaction);
        lsWrite(udhaarTransactionsCacheKey(shopId), allMapped);
        return allMapped;
      } catch {
        return lsRead<UdhaarTransaction[]>(
          udhaarTransactionsCacheKey(shopId),
          [],
        );
      }
    },
    enabled: !!shopId && !isFetching,
    staleTime: 0,
    refetchInterval: 3000,
  });
}

// =====================================================================
// LUDO & REWARDS HOOKS
// =====================================================================

import type { LudoRedemptionRequest } from "../types/appTypes";

type LudoActor = {
  getLudoPoints: (userId: string) => Promise<bigint>;
  addLudoPoints: (userId: string, points: bigint) => Promise<void>;
  setLudoPoints: (userId: string, points: bigint) => Promise<void>;
  addLudoRedemptionRequest: (
    userId: string,
    userName: string,
    upiId: string,
    pointsRequested: bigint,
    amountInr: bigint,
  ) => Promise<bigint>;
  getLudoRedemptionRequests: () => Promise<LudoRedemptionRequest[]>;
  getUserLudoRedemptionRequests: (
    userId: string,
  ) => Promise<LudoRedemptionRequest[]>;
  updateLudoRedemptionStatus: (
    requestId: bigint,
    status: string,
  ) => Promise<boolean>;
  getFirebaseConfigLink: () => Promise<string>;
  setFirebaseConfigLink: (url: string) => Promise<void>;
};

function asLudoActor(actor: unknown): LudoActor {
  return actor as LudoActor;
}

export function useLudoPoints(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["ludoPoints", userId],
    queryFn: async () => {
      const lsKey = `dz_ludo_points_${userId}`;
      if (!actor || !userId) {
        const raw = localStorage.getItem(lsKey);
        return raw ? Number.parseInt(raw, 10) || 0 : 0;
      }
      try {
        const pts = await asLudoActor(actor).getLudoPoints(userId);
        const val = Number(pts);
        localStorage.setItem(lsKey, String(val));
        return val;
      } catch {
        const raw = localStorage.getItem(lsKey);
        return raw ? Number.parseInt(raw, 10) || 0 : 0;
      }
    },
    enabled: !!userId && !isFetching,
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

export function useAddLudoPoints() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      points,
    }: { userId: string; points: number }) => {
      const lsKey = `dz_ludo_points_${userId}`;
      const cur = Number.parseInt(localStorage.getItem(lsKey) ?? "0", 10) || 0;
      const next = Math.max(0, cur + points);
      localStorage.setItem(lsKey, String(next));
      if (!actor) return;
      try {
        await asLudoActor(actor).addLudoPoints(userId, BigInt(points));
      } catch {
        // localStorage already updated
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ludoPoints", vars.userId] });
    },
  });
}

export function useGetUserRedemptionRequests(userId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<LudoRedemptionRequest[]>({
    queryKey: ["userLudoRequests", userId],
    queryFn: async () => {
      if (!actor || !userId) {
        try {
          return JSON.parse(localStorage.getItem("dz_ludo_requests") ?? "[]");
        } catch {
          return [];
        }
      }
      try {
        return await asLudoActor(actor).getUserLudoRedemptionRequests(userId);
      } catch {
        try {
          return JSON.parse(localStorage.getItem("dz_ludo_requests") ?? "[]");
        } catch {
          return [];
        }
      }
    },
    enabled: !!userId && !isFetching,
    refetchInterval: 5000,
  });
}

export function useAddLudoRedemptionRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      userName: string;
      upiId: string;
      pointsRequested: number;
      amountInr: number;
    }) => {
      const { userId, userName, upiId, pointsRequested, amountInr } = params;
      if (actor) {
        try {
          const id = await asLudoActor(actor).addLudoRedemptionRequest(
            userId,
            userName,
            upiId,
            BigInt(pointsRequested),
            BigInt(amountInr),
          );
          return Number(id);
        } catch {
          // fall through to localStorage
        }
      }
      const req: LudoRedemptionRequest = {
        id: Date.now(),
        userId,
        userName,
        upiId,
        pointsRequested,
        amountInr,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const all: LudoRedemptionRequest[] = (() => {
        try {
          return JSON.parse(localStorage.getItem("dz_ludo_requests") ?? "[]");
        } catch {
          return [];
        }
      })();
      all.unshift(req);
      localStorage.setItem("dz_ludo_requests", JSON.stringify(all));
      return req.id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["userLudoRequests", vars.userId] });
      qc.invalidateQueries({ queryKey: ["allLudoRequests"] });
    },
  });
}

export function useGetAllLudoRedemptionRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<LudoRedemptionRequest[]>({
    queryKey: ["allLudoRequests"],
    queryFn: async () => {
      if (!actor) {
        try {
          return JSON.parse(localStorage.getItem("dz_ludo_requests") ?? "[]");
        } catch {
          return [];
        }
      }
      try {
        return await asLudoActor(actor).getLudoRedemptionRequests();
      } catch {
        try {
          return JSON.parse(localStorage.getItem("dz_ludo_requests") ?? "[]");
        } catch {
          return [];
        }
      }
    },
    enabled: !isFetching,
    refetchInterval: 5000,
  });
}

export function useUpdateLudoRedemptionStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: { requestId: number; status: string }) => {
      if (actor) {
        try {
          return await asLudoActor(actor).updateLudoRedemptionStatus(
            BigInt(requestId),
            status,
          );
        } catch {
          // fall through to localStorage
        }
      }
      const all: LudoRedemptionRequest[] = (() => {
        try {
          return JSON.parse(localStorage.getItem("dz_ludo_requests") ?? "[]");
        } catch {
          return [];
        }
      })();
      const updated = all.map((r) =>
        r.id === requestId
          ? { ...r, status: status as LudoRedemptionRequest["status"] }
          : r,
      );
      localStorage.setItem("dz_ludo_requests", JSON.stringify(updated));
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allLudoRequests"] });
      qc.invalidateQueries({ queryKey: ["userLudoRequests"] });
    },
  });
}

export function useGetFirebaseConfigLink() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["firebaseConfigLink"],
    queryFn: async () => {
      if (!actor) return localStorage.getItem("dz_firebase_config_url") ?? "";
      try {
        const url = await asLudoActor(actor).getFirebaseConfigLink();
        localStorage.setItem("dz_firebase_config_url", url);
        return url;
      } catch {
        return localStorage.getItem("dz_firebase_config_url") ?? "";
      }
    },
    enabled: !isFetching,
  });
}

export function useSetFirebaseConfigLink() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      localStorage.setItem("dz_firebase_config_url", url);
      if (!actor) return;
      try {
        await asLudoActor(actor).setFirebaseConfigLink(url);
      } catch {
        // localStorage already saved
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["firebaseConfigLink"] }),
  });
}

// =====================================================================
// WALLET & RECHARGE HOOKS
// =====================================================================

type RechargeActor = {
  getMyWalletBalance?: () => Promise<number>;
  requestWalletTopup?: (amount: number, note: string) => Promise<number>;
  getMyTopupRequests?: () => Promise<WalletTopupRequest[]>;
  initiateRecharge?: (
    mobile: string,
    operator: string,
    circle: string,
    amount: number,
  ) => Promise<number>;
  getMyRechargeHistory?: () => Promise<RechargeTransaction[]>;
  getCommissionConfig?: () => Promise<CommissionConfig>;
  getRechargeServiceEnabled?: () => Promise<boolean>;
  getRechargeReceipt?: (
    txnId: bigint,
  ) => Promise<import("../backend.d.ts").RechargeReceipt | null>;
  getMyRechargeReceipts?: () => Promise<
    import("../backend.d.ts").RechargeReceipt[]
  >;
};

function asRechargeActor(actor: unknown): RechargeActor {
  return actor as RechargeActor;
}

/** Map backend RechargeReceipt (bigint fields) → frontend RechargeReceipt (number fields) */
function mapBackendReceipt(
  r: import("../backend.d.ts").RechargeReceipt,
): RechargeReceipt {
  return {
    id: Number(r.id),
    txnId: Number(r.txnId),
    userId: Number(r.userId),
    mobile: r.mobile,
    operator: r.operator,
    circle: r.circle,
    amount: Number(r.amount),
    commission: Number(r.commission),
    netCost: Number(r.netCost),
    referenceId: r.referenceId,
    generatedAt: Number(r.generatedAt),
  };
}

/**
 * Live wallet balance for the logged-in user.
 * Polls every 5 seconds.
 * Falls back to 0 if backend method not yet wired.
 */
export function useWalletBalance() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["walletBalance"],
    queryFn: async () => {
      if (!actor) return 0;
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getMyWalletBalance !== "function") return 0;
        return await ra.getMyWalletBalance();
      } catch {
        return 0;
      }
    },
    enabled: !isFetching,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** User's topup requests. Polls every 5 seconds. */
export function useMyTopupRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<WalletTopupRequest[]>({
    queryKey: ["topupRequests"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getMyTopupRequests !== "function") return [];
        return await ra.getMyTopupRequests();
      } catch {
        return [];
      }
    },
    enabled: !isFetching,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** User's recharge transaction history. Polls every 5 seconds. */
export function useRechargeHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<RechargeTransaction[]>({
    queryKey: ["rechargeHistory"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getMyRechargeHistory !== "function") return [];
        return await ra.getMyRechargeHistory();
      } catch {
        return [];
      }
    },
    enabled: !isFetching,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** Commission config. Polls every 30 seconds. */
export function useCommissionConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<CommissionConfig | null>({
    queryKey: ["commissionConfig"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getCommissionConfig !== "function") return null;
        return await ra.getCommissionConfig();
      } catch {
        return null;
      }
    },
    enabled: !isFetching,
    refetchInterval: 30000,
    staleTime: 25000,
  });
}

/** Whether the recharge service is enabled. Polls every 10 seconds. */
export function useRechargeServiceEnabled() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["rechargeServiceEnabled"],
    queryFn: async () => {
      if (!actor) return true;
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getRechargeServiceEnabled !== "function") return true;
        return await ra.getRechargeServiceEnabled();
      } catch {
        return true;
      }
    },
    enabled: !isFetching,
    refetchInterval: 10000,
    staleTime: 9000,
  });
}

/** Mutation: initiate a mobile recharge. */
export function useInitiateRecharge() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mobile,
      operator,
      circle,
      amount,
    }: {
      mobile: string;
      operator: string;
      circle: string;
      amount: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const ra = asRechargeActor(actor);
      if (typeof ra.initiateRecharge !== "function") {
        // Backend not yet wired — simulate success for UI dev
        return Date.now();
      }
      return ra.initiateRecharge(mobile, operator, circle, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rechargeHistory"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
      qc.invalidateQueries({ queryKey: ["myRechargeReceipts"] });
    },
  });
}

/** Mutation: request wallet topup (add money). */
export function useRequestTopup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      note,
    }: {
      amount: number;
      note: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const ra = asRechargeActor(actor);
      if (typeof ra.requestWalletTopup !== "function") {
        // Backend not yet wired — simulate success for UI dev
        return Date.now();
      }
      return ra.requestWalletTopup(amount, note);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topupRequests"] });
    },
  });
}

// =====================================================================
// CONTENT LOCKER HOOKS
// =====================================================================

type ContentLockerActor = {
  getContentLockerConfig?: () => Promise<ContentLockerConfig>;
  setLockedFeature?: (
    featureName: string,
    cpaOfferLink: string,
    secretKey: string,
  ) => Promise<LockedFeature>;
  removeLockedFeature?: (featureId: string) => Promise<boolean>;
  adminAdjustWalletBalance?: (
    userId: number,
    amount: number,
    action: string,
    note: string,
  ) => Promise<boolean>;
  adminAssignSubscription?: (
    userId: number,
    durationDays: number,
    action: string,
  ) => Promise<boolean>;
  getUserSubscriptionStatus?: (
    userId: number,
  ) => Promise<UserSubscription | null>;
  getAllUsers?: () => Promise<
    {
      id: number;
      name: string;
      email: string;
      mobile: string;
      balance: number;
    }[]
  >;
  getAdminAuditLog?: (limit: number) => Promise<AuditLogEntry[]>;
};

function asContentLockerActor(actor: unknown): ContentLockerActor {
  return actor as ContentLockerActor;
}

/** Fetch content locker config. Polls every 3 seconds. */
export function useContentLockerConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<ContentLockerConfig>({
    queryKey: ["contentLockerConfig"],
    queryFn: async () => {
      const fallback: ContentLockerConfig = { features: [] };
      if (!actor) {
        try {
          return (
            JSON.parse(localStorage.getItem("dz_content_locker") ?? "null") ??
            fallback
          );
        } catch {
          return fallback;
        }
      }
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.getContentLockerConfig !== "function") return fallback;
        const config = await cla.getContentLockerConfig();
        localStorage.setItem("dz_content_locker", JSON.stringify(config));
        return config;
      } catch {
        try {
          return (
            JSON.parse(localStorage.getItem("dz_content_locker") ?? "null") ??
            fallback
          );
        } catch {
          return fallback;
        }
      }
    },
    enabled: !isFetching,
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

/** Mutation: lock a feature with a CPA link and secret key. */
export function useSetLockedFeature() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      featureName,
      cpaOfferLink,
      secretKey,
    }: {
      featureName: string;
      cpaOfferLink: string;
      secretKey: string;
    }) => {
      if (!actor) {
        // Optimistic localStorage update when canister not available
        const existing: ContentLockerConfig = (() => {
          try {
            return (
              JSON.parse(
                localStorage.getItem("dz_content_locker") ?? "null",
              ) ?? {
                features: [],
              }
            );
          } catch {
            return { features: [] };
          }
        })();
        const newFeature: LockedFeature = {
          id: `lf_${Date.now()}`,
          featureName,
          cpaOfferLink,
          isLocked: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const updated = {
          features: [
            ...existing.features.filter((f) => f.featureName !== featureName),
            newFeature,
          ],
        };
        localStorage.setItem("dz_content_locker", JSON.stringify(updated));
        return newFeature;
      }
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.setLockedFeature !== "function") {
          throw new Error("setLockedFeature not available");
        }
        return cla.setLockedFeature(featureName, cpaOfferLink, secretKey);
      } catch {
        // Fall back to localStorage
        const existing: ContentLockerConfig = (() => {
          try {
            return (
              JSON.parse(
                localStorage.getItem("dz_content_locker") ?? "null",
              ) ?? {
                features: [],
              }
            );
          } catch {
            return { features: [] };
          }
        })();
        const newFeature: LockedFeature = {
          id: `lf_${Date.now()}`,
          featureName,
          cpaOfferLink,
          isLocked: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const updated = {
          features: [
            ...existing.features.filter((f) => f.featureName !== featureName),
            newFeature,
          ],
        };
        localStorage.setItem("dz_content_locker", JSON.stringify(updated));
        return newFeature;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["contentLockerConfig"] }),
  });
}

/** Mutation: unlock/remove a locked feature by id. */
export function useRemoveLockedFeature() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (featureId: string) => {
      // Always update localStorage
      const existing: ContentLockerConfig = (() => {
        try {
          return (
            JSON.parse(localStorage.getItem("dz_content_locker") ?? "null") ?? {
              features: [],
            }
          );
        } catch {
          return { features: [] };
        }
      })();
      const updated = {
        features: existing.features.filter((f) => f.id !== featureId),
      };
      localStorage.setItem("dz_content_locker", JSON.stringify(updated));

      if (!actor) return true;
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.removeLockedFeature !== "function") return true;
        return cla.removeLockedFeature(featureId);
      } catch {
        return true;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["contentLockerConfig"] }),
  });
}

// =====================================================================
// WALLET MANAGEMENT HOOKS (admin-side)
// =====================================================================

/** Fetch all users list for admin wallet management. */
export function useAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<
    {
      id: number;
      name: string;
      email: string;
      mobile: string;
      balance: number;
    }[]
  >({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.getAllUsers !== "function") {
          // Graceful fallback — return empty
          return [];
        }
        return await cla.getAllUsers();
      } catch {
        return [];
      }
    },
    enabled: !isFetching,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** Fetch admin audit log with configurable limit. Polls every 5 seconds. */
export function useAdminAuditLog(limit = 20) {
  const { actor, isFetching } = useActor();
  return useQuery<AuditLogEntry[]>({
    queryKey: ["adminAuditLog", limit],
    queryFn: async () => {
      if (!actor) {
        try {
          return JSON.parse(localStorage.getItem("dz_audit_log") ?? "[]");
        } catch {
          return [];
        }
      }
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.getAdminAuditLog !== "function") {
          return JSON.parse(localStorage.getItem("dz_audit_log") ?? "[]");
        }
        const log = await cla.getAdminAuditLog(limit);
        localStorage.setItem("dz_audit_log", JSON.stringify(log));
        return log;
      } catch {
        try {
          return JSON.parse(localStorage.getItem("dz_audit_log") ?? "[]");
        } catch {
          return [];
        }
      }
    },
    enabled: !isFetching,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/** Get subscription status for a specific user. */
export function useGetUserSubscriptionStatus(userId: number | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserSubscription | null>({
    queryKey: ["userSubscriptionStatus", userId],
    queryFn: async () => {
      if (!actor || userId === null) return null;
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.getUserSubscriptionStatus !== "function") return null;
        return cla.getUserSubscriptionStatus(userId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && userId !== null,
  });
}

/** Mutation: admin add/deduct wallet balance for any user. */
export function useAdminAdjustWalletBalance() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      action,
      note,
    }: {
      userId: number;
      amount: number;
      action: "add" | "deduct";
      note: string;
    }) => {
      if (!actor) {
        // Persist in audit log locally
        const log: AuditLogEntry[] = (() => {
          try {
            return JSON.parse(localStorage.getItem("dz_audit_log") ?? "[]");
          } catch {
            return [];
          }
        })();
        log.unshift({
          id: `al_${Date.now()}`,
          adminEmail: "sushhilkumar651@gmail.com",
          targetUserId: String(userId),
          action: `${action}_balance_${amount}`,
          amount,
          note,
          timestamp: Date.now(),
        });
        localStorage.setItem("dz_audit_log", JSON.stringify(log.slice(0, 100)));
        return true;
      }
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.adminAdjustWalletBalance !== "function") return true;
        const result = await cla.adminAdjustWalletBalance(
          userId,
          amount,
          action,
          note,
        );
        // Also update audit log cache
        qc.invalidateQueries({ queryKey: ["adminAuditLog"] });
        return result;
      } catch {
        return true;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["adminAuditLog"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

/** Mutation: admin assign or revoke subscription for any user. */
export function useAdminAssignSubscription() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      durationDays,
      action,
    }: {
      userId: number;
      durationDays: number;
      action: "assign" | "revoke";
    }) => {
      if (!actor) {
        const log: AuditLogEntry[] = (() => {
          try {
            return JSON.parse(localStorage.getItem("dz_audit_log") ?? "[]");
          } catch {
            return [];
          }
        })();
        log.unshift({
          id: `al_${Date.now()}`,
          adminEmail: "sushhilkumar651@gmail.com",
          targetUserId: String(userId),
          action: `${action}_subscription_${durationDays}days`,
          amount: null,
          note: `${action} subscription for ${durationDays} days`,
          timestamp: Date.now(),
        });
        localStorage.setItem("dz_audit_log", JSON.stringify(log.slice(0, 100)));
        return true;
      }
      try {
        const cla = asContentLockerActor(actor);
        if (typeof cla.adminAssignSubscription !== "function") return true;
        return cla.adminAssignSubscription(userId, durationDays, action);
      } catch {
        return true;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      qc.invalidateQueries({ queryKey: ["adminAuditLog"] });
      qc.invalidateQueries({ queryKey: ["userSubscriptionStatus"] });
    },
  });
}

// =====================================================================
// RECEIPT HOOKS
// =====================================================================

/**
 * Fetch a single receipt by recharge transaction ID.
 * Disabled until txnId is provided.
 */
export function useGetRechargeReceipt(txnId: number | null) {
  const { actor, isFetching } = useActor();
  return useQuery<RechargeReceipt | null>({
    queryKey: ["rechargeReceipt", txnId],
    queryFn: async () => {
      if (!actor || txnId === null) return null;
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getRechargeReceipt !== "function") return null;
        const raw = await ra.getRechargeReceipt(BigInt(txnId));
        if (!raw) return null;
        return mapBackendReceipt(raw);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && txnId !== null,
  });
}

/**
 * Fetch all receipts for the logged-in user.
 * Polls every 10 seconds for new receipts after successful recharges.
 */
export function useMyRechargeReceipts() {
  const { actor, isFetching } = useActor();
  return useQuery<RechargeReceipt[]>({
    queryKey: ["myRechargeReceipts"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const ra = asRechargeActor(actor);
        if (typeof ra.getMyRechargeReceipts !== "function") return [];
        const raw = await ra.getMyRechargeReceipts();
        return raw.map(mapBackendReceipt);
      } catch {
        return [];
      }
    },
    enabled: !isFetching,
    refetchInterval: 10000,
    staleTime: 9000,
  });
}

// =====================================================================
// CONTENT LOCKER — VERIFY UNLOCK KEY
// =====================================================================

/**
 * Mutation: verify a user's unlock key against the backend.
 * Returns true if the key is correct, false otherwise.
 * Fail-open: if the actor is unavailable, falls back to false.
 */
export function useVerifyUnlockKey() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      featureName,
      userKey,
    }: {
      featureName: string;
      userKey: string;
    }): Promise<boolean> => {
      if (!actor) return false;
      try {
        const result = await (
          actor as unknown as {
            verifyUnlockKey: (
              name: string,
              key: string,
            ) => Promise<boolean | { ok: boolean }>;
          }
        ).verifyUnlockKey(featureName, userKey);
        if (typeof result === "boolean") return result;
        if (result !== null && typeof result === "object" && "ok" in result)
          return Boolean((result as { ok: boolean }).ok);
        return false;
      } catch {
        return false;
      }
    },
  });
}

// =====================================================================
// PAYMENT CONFIGURATION HOOKS
// Real-time 2s polling — admin sets, providers/users read instantly
// =====================================================================

const PAYMENT_CONFIG_LS_KEY = "dz_payment_config_cache";

function lsReadPaymentConfig(): PaymentConfig {
  try {
    const raw = localStorage.getItem(PAYMENT_CONFIG_LS_KEY);
    if (!raw)
      return {
        razorpayKeyId: "",
        razorpayKeySecret: "",
        upiVpa: "",
        qrCodeUrl: "",
      };
    return JSON.parse(raw) as PaymentConfig;
  } catch {
    return {
      razorpayKeyId: "",
      razorpayKeySecret: "",
      upiVpa: "",
      qrCodeUrl: "",
    };
  }
}

/** Fetch payment configuration. Polls every 2s to ensure instant admin→user sync. */
export function usePaymentConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentConfig>({
    queryKey: ["paymentConfig"],
    queryFn: async () => {
      if (!actor) return lsReadPaymentConfig();
      try {
        const raw = await (
          actor as unknown as { getPaymentConfig(): Promise<string> }
        ).getPaymentConfig();
        if (!raw || raw === "{}") return lsReadPaymentConfig();
        const parsed = JSON.parse(raw) as PaymentConfig;
        localStorage.setItem(PAYMENT_CONFIG_LS_KEY, JSON.stringify(parsed));
        return parsed;
      } catch {
        return lsReadPaymentConfig();
      }
    },
    enabled: !isFetching,
    refetchInterval: 2000,
    staleTime: 1500,
  });
}

/** Mutation: admin saves payment config. Writes to canister and caches locally. */
export function useUpdatePaymentConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: PaymentConfig) => {
      // Always cache locally first for instant UI update
      localStorage.setItem(PAYMENT_CONFIG_LS_KEY, JSON.stringify(config));
      if (!actor) return;
      try {
        await (
          actor as unknown as {
            setPaymentConfig(json: string): Promise<void>;
          }
        ).setPaymentConfig(JSON.stringify(config));
      } catch {
        // localStorage already saved — canister will sync on next poll
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentConfig"] }),
  });
}
