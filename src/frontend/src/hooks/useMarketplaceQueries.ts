/**
 * React Query hooks for the Likeup Marketplace module.
 * All calls go through the ICP canister actor.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MarketCategory as MarketCategoryType } from "../backend.d";
import type {
  CreateListingPayload,
  MarketListing,
  NewsItem,
} from "../types/marketplaceTypes";
import { MarketCategory } from "../types/marketplaceTypes";
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

// Map frontend category key to backend MarketCategory enum
function mapCategory(category: string | undefined): MarketCategoryType | null {
  if (!category || category === MarketCategory.all) return null;
  return category as MarketCategoryType;
}

// ---- Read Hooks ----

export function useListings(city?: string, category?: string) {
  const { actor, isFetching } = useActor();
  const cacheKey = `dz_market_listings_${city}_${category}`;
  return useQuery<MarketListing[]>({
    queryKey: ["marketListings", city, category],
    queryFn: async () => {
      if (!actor) return lsRead<MarketListing[]>(cacheKey, []);
      try {
        // Backend: getListings(city: string | null, category: MarketCategory | null)
        const data = await asActor(actor).getListings(
          city?.trim() ? city.trim() : null,
          mapCategory(category),
        );
        const result = (data ?? []) as MarketListing[];
        lsWrite(cacheKey, result);
        return result;
      } catch {
        return lsRead<MarketListing[]>(cacheKey, []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useMyListings() {
  const { actor, isFetching } = useActor();
  return useQuery<MarketListing[]>({
    queryKey: ["myMarketListings"],
    queryFn: async () => {
      if (!actor) return lsRead<MarketListing[]>("dz_my_listings", []);
      try {
        // Backend: getMyListings()
        const data = await asActor(actor).getMyListings();
        const result = (data ?? []) as MarketListing[];
        lsWrite("dz_my_listings", result);
        return result;
      } catch {
        return lsRead<MarketListing[]>("dz_my_listings", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useNewsItems() {
  const { actor, isFetching } = useActor();
  return useQuery<NewsItem[]>({
    queryKey: ["marketNews"],
    queryFn: async () => {
      if (!actor) return lsRead<NewsItem[]>("dz_market_news", []);
      try {
        // Backend: getNewsItems()
        const data = await asActor(actor).getNewsItems();
        const result = (data ?? []) as NewsItem[];
        lsWrite("dz_market_news", result);
        return result;
      } catch {
        return lsRead<NewsItem[]>("dz_market_news", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 60_000,
    staleTime: 50_000,
  });
}

// ---- Mutation Hooks ----

export function useCreateListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateListingPayload) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: createListing(title, description, price: bigint, category: MarketCategory, city, photoUrls: string[], whatsappContact)
      const result = await asActor(actor).createListing(
        payload.title,
        payload.description,
        BigInt(Math.round(payload.price * 100)), // convert to paisa
        mapCategory(payload.category) ??
          ("other" as unknown as MarketCategoryType),
        payload.city,
        payload.photoUrl ? [payload.photoUrl] : [],
        payload.whatsapp,
      );
      // Handle Result<bigint, string>
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Create failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketListings"] });
      qc.invalidateQueries({ queryKey: ["myMarketListings"] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Listing add nahi ho saki.",
      );
    },
  });
}

export function useDeleteListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: deleteListing(id: bigint)
      const result = await asActor(actor).deleteListing(BigInt(listingId));
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Delete failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketListings"] });
      qc.invalidateQueries({ queryKey: ["myMarketListings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete nahi ho saka.");
    },
  });
}

export function useFeatureListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
    }: {
      listingId: string;
      featured: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: featureListing(id: bigint)
      const result = await asActor(actor).featureListing(BigInt(listingId));
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Feature failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketListings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Feature नहीं हो सका।");
    },
  });
}

export function useAdminAddNews() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      imageUrl?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminAddNewsItem(title: string, content: string, imageUrl: string | null)
      const result = await asActor(actor).adminAddNewsItem(
        payload.title,
        payload.content,
        payload.imageUrl ?? null,
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Add failed");
      }
      return result as NewsItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketNews"] });
      toast.success("News added ✅");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "News add नहीं हुई।");
    },
  });
}

export function useAdminDeleteNews() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newsId: string) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminDeleteNewsItem(id: bigint)
      const result = await asActor(actor).adminDeleteNewsItem(BigInt(newsId));
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Delete failed");
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketNews"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete नहीं हो सका।");
    },
  });
}
