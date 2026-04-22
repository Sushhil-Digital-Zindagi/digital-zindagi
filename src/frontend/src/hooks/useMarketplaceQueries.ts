/**
 * React Query hooks for the Likeup Marketplace module.
 * All calls go through the ICP canister actor (same pattern as useChatQueries).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateListingPayload,
  MarketListing,
  NewsItem,
} from "../types/marketplaceTypes";
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

// ---- Read Hooks ----

export function useListings(city?: string, category?: string) {
  const { actor, isFetching } = useActor();
  const cacheKey = `dz_market_listings_${city}_${category}`;
  return useQuery<MarketListing[]>({
    queryKey: ["marketListings", city, category],
    queryFn: async () => {
      if (!actor) return lsRead<MarketListing[]>(cacheKey, []);
      try {
        const data = (await asActor(actor).getListings(
          city ?? "",
          category ?? "",
        )) as MarketListing[];
        lsWrite(cacheKey, data);
        return data;
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
        const data = (await asActor(actor).getMyListings()) as MarketListing[];
        lsWrite("dz_my_listings", data);
        return data;
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
        const data = (await asActor(actor).getNewsItems()) as NewsItem[];
        lsWrite("dz_market_news", data);
        return data;
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
      return asActor(actor).createListing(payload) as Promise<MarketListing>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketListings"] });
      qc.invalidateQueries({ queryKey: ["myMarketListings"] });
    },
  });
}

export function useDeleteListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asActor(actor).deleteListing(listingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketListings"] });
      qc.invalidateQueries({ queryKey: ["myMarketListings"] });
    },
  });
}

export function useFeatureListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listingId,
      featured,
    }: {
      listingId: string;
      featured: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return asActor(actor).featureListing(listingId, featured);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketListings"] });
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
      return asActor(actor).adminAddNewsItem(payload) as Promise<NewsItem>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketNews"] });
    },
  });
}

export function useAdminDeleteNews() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newsId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asActor(actor).adminDeleteNewsItem(newsId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketNews"] });
    },
  });
}
