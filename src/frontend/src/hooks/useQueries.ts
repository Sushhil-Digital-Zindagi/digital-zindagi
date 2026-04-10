import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminConfig,
  Banner,
  Category,
  CustomCode,
  CustomSection,
  JobItem,
  NewsItem,
  Order,
  ProviderProfile,
  ScrapRate,
  SubscriptionPlan,
  SubscriptionPricing,
  UdhaarCustomer,
  UdhaarTransaction,
  User,
  VideoItem,
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
