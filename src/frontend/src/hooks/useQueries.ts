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
