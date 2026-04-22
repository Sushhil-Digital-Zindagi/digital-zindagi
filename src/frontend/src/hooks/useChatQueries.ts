/**
 * React Query hooks for the Likeup chat module.
 * All data is stored in the ICP canister (qoab5-iyaaa-aaaad-aggsq-cai).
 * localStorage is used as a fast read-through cache only.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatAdminSettings,
  ChatMessage,
  ChatShortcut,
  ChatUserProfile,
  Conversation,
  CreateGroupPayload,
  CreateMarketListingPayload,
  LeaderboardEntry,
  MarketListing,
  Note,
  PostStoryPayload,
  ReferralStats,
  RewardPoints,
  ScheduledMessage,
  SendMessagePayload,
  Story,
  VaultItem,
} from "../types/chatTypes";
import { useActor } from "./useActor";

// ---- localStorage helpers (cache layer) ----
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
    /* ignore storage quota */
  }
}

// Typed chat actor accessor — backend methods are called via unknown cast
// since chat methods will be added in a future canister deployment.
function asChatActor(
  actor: unknown,
): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return actor as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

// =====================================================================
// READ HOOKS
// =====================================================================

/**
 * All conversations for the current user.
 * Polls every 3 seconds for near-real-time feel.
 */
export function useMyConversations() {
  const { actor, isFetching } = useActor();
  return useQuery<Conversation[]>({
    queryKey: ["chatConversations"],
    queryFn: async () => {
      if (!actor) return lsRead<Conversation[]>("dz_chat_conversations", []);
      try {
        const data = (await asChatActor(
          actor,
        ).getMyChatConversations()) as Conversation[];
        lsWrite("dz_chat_conversations", data);
        return data;
      } catch {
        return lsRead<Conversation[]>("dz_chat_conversations", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

/**
 * Messages for a single conversation.
 * Polls every 3 seconds when actively in a conversation.
 */
export function useConversationMessages(conversationId: string | null) {
  const { actor, isFetching } = useActor();
  const cacheKey = `dz_chat_msgs_${conversationId}`;
  return useQuery<ChatMessage[]>({
    queryKey: ["chatMessages", conversationId],
    queryFn: async () => {
      if (!actor || !conversationId) return lsRead<ChatMessage[]>(cacheKey, []);
      try {
        const data = (await asChatActor(actor).getConversationMessages(
          conversationId,
        )) as ChatMessage[];
        lsWrite(cacheKey, data);
        return data;
      } catch {
        return lsRead<ChatMessage[]>(cacheKey, []);
      }
    },
    enabled: !!conversationId && !isFetching,
    refetchInterval: 3000,
    staleTime: 1000,
  });
}

/** Current user's chat profile. */
export function useChatProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<ChatUserProfile | null>({
    queryKey: ["chatProfile"],
    queryFn: async () => {
      if (!actor)
        return lsRead<ChatUserProfile | null>("dz_chat_profile", null);
      try {
        const data = (await asChatActor(
          actor,
        ).getMyChatProfile()) as ChatUserProfile | null;
        if (data) lsWrite("dz_chat_profile", data);
        return data;
      } catch {
        return lsRead<ChatUserProfile | null>("dz_chat_profile", null);
      }
    },
    enabled: !isFetching,
    staleTime: 5000,
  });
}

/** All active stories (last 24h). */
export function useActiveStories() {
  const { actor, isFetching } = useActor();
  return useQuery<Story[]>({
    queryKey: ["chatStories"],
    queryFn: async () => {
      if (!actor) return lsRead<Story[]>("dz_chat_stories", []);
      try {
        const data = (await asChatActor(
          actor,
        ).getActiveChatStories()) as Story[];
        lsWrite("dz_chat_stories", data);
        return data;
      } catch {
        return lsRead<Story[]>("dz_chat_stories", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 10000,
    staleTime: 8000,
  });
}

/** Current user's reward points. */
export function useMyPoints() {
  const { actor, isFetching } = useActor();
  return useQuery<RewardPoints | null>({
    queryKey: ["chatPoints"],
    queryFn: async () => {
      if (!actor) return lsRead<RewardPoints | null>("dz_chat_points", null);
      try {
        const data = (await asChatActor(
          actor,
        ).getMyChatPoints()) as RewardPoints | null;
        if (data) lsWrite("dz_chat_points", data);
        return data;
      } catch {
        return lsRead<RewardPoints | null>("dz_chat_points", null);
      }
    },
    enabled: !isFetching,
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/** Weekly leaderboard. */
export function usePointsLeaderboard() {
  const { actor, isFetching } = useActor();
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["chatLeaderboard"],
    queryFn: async () => {
      if (!actor) return lsRead<LeaderboardEntry[]>("dz_chat_leaderboard", []);
      try {
        const data = (await asChatActor(
          actor,
        ).getChatPointsLeaderboard()) as LeaderboardEntry[];
        lsWrite("dz_chat_leaderboard", data);
        return data;
      } catch {
        return lsRead<LeaderboardEntry[]>("dz_chat_leaderboard", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 30000,
    staleTime: 25000,
  });
}

/** Referral stats for the current user. */
export function useReferralStats() {
  const { actor, isFetching } = useActor();
  return useQuery<ReferralStats | null>({
    queryKey: ["chatReferralStats"],
    queryFn: async () => {
      if (!actor) return lsRead<ReferralStats | null>("dz_chat_referral", null);
      try {
        const data = (await asChatActor(
          actor,
        ).getMyChatReferralStats()) as ReferralStats | null;
        if (data) lsWrite("dz_chat_referral", data);
        return data;
      } catch {
        return lsRead<ReferralStats | null>("dz_chat_referral", null);
      }
    },
    enabled: !isFetching,
    staleTime: 30000,
  });
}

/** Chat admin settings (enabled toggles, points config, etc.). */
export function useChatAdminSettings() {
  const { actor, isFetching } = useActor();
  return useQuery<ChatAdminSettings>({
    queryKey: ["chatAdminSettings"],
    queryFn: async () => {
      const defaults: ChatAdminSettings = {
        chatEnabled: true,
        storiesEnabled: true,
        marketplaceEnabled: true,
        rewardsEnabled: true,
        premiumEnabled: true,
        maxFileSizeMb: 20,
        pointsPerMessage: 1,
        pointsPerDailyLogin: 10,
        pointsPerStory: 5,
        pointsPerReferral: 50,
        premiumPriceMonthly: 49,
        premiumPriceYearly: 399,
      };
      if (!actor)
        return lsRead<ChatAdminSettings>("dz_chat_admin_settings", defaults);
      try {
        const data = (await asChatActor(
          actor,
        ).getChatAdminSettings()) as ChatAdminSettings;
        const merged = { ...defaults, ...data };
        lsWrite("dz_chat_admin_settings", merged);
        return merged;
      } catch {
        return lsRead<ChatAdminSettings>("dz_chat_admin_settings", defaults);
      }
    },
    enabled: !isFetching,
    refetchInterval: 10000,
    staleTime: 8000,
  });
}

/** All chat shortcuts (global + user-defined). */
export function useChatShortcuts() {
  const { actor, isFetching } = useActor();
  return useQuery<ChatShortcut[]>({
    queryKey: ["chatShortcuts"],
    queryFn: async () => {
      if (!actor) return lsRead<ChatShortcut[]>("dz_chat_shortcuts", []);
      try {
        const data = (await asChatActor(
          actor,
        ).getChatShortcuts()) as ChatShortcut[];
        lsWrite("dz_chat_shortcuts", data);
        return data;
      } catch {
        return lsRead<ChatShortcut[]>("dz_chat_shortcuts", []);
      }
    },
    enabled: !isFetching,
    staleTime: 30000,
  });
}

/** Scheduled messages for the current user. */
export function useScheduledMessages() {
  const { actor, isFetching } = useActor();
  return useQuery<ScheduledMessage[]>({
    queryKey: ["chatScheduled"],
    queryFn: async () => {
      if (!actor) return lsRead<ScheduledMessage[]>("dz_chat_scheduled", []);
      try {
        const data = (await asChatActor(
          actor,
        ).getChatScheduledMessages()) as ScheduledMessage[];
        lsWrite("dz_chat_scheduled", data);
        return data;
      } catch {
        return lsRead<ScheduledMessage[]>("dz_chat_scheduled", []);
      }
    },
    enabled: !isFetching,
    staleTime: 10000,
  });
}

/** Private vault items for the current user. */
export function useVaultItems() {
  const { actor, isFetching } = useActor();
  return useQuery<VaultItem[]>({
    queryKey: ["chatVault"],
    queryFn: async () => {
      if (!actor) return lsRead<VaultItem[]>("dz_chat_vault", []);
      try {
        const data = (await asChatActor(
          actor,
        ).getChatVaultItems()) as VaultItem[];
        lsWrite("dz_chat_vault", data);
        return data;
      } catch {
        return lsRead<VaultItem[]>("dz_chat_vault", []);
      }
    },
    enabled: !isFetching,
    staleTime: 15000,
  });
}

/** Study mode notes for the current user. */
export function useMyNotes() {
  const { actor, isFetching } = useActor();
  return useQuery<Note[]>({
    queryKey: ["chatNotes"],
    queryFn: async () => {
      if (!actor) return lsRead<Note[]>("dz_chat_notes", []);
      try {
        const data = (await asChatActor(actor).getChatNotes()) as Note[];
        lsWrite("dz_chat_notes", data);
        return data;
      } catch {
        return lsRead<Note[]>("dz_chat_notes", []);
      }
    },
    enabled: !isFetching,
    staleTime: 10000,
  });
}

/** Marketplace listings with optional city/category filter. */
export function useMarketListings(city?: string, category?: string) {
  const { actor, isFetching } = useActor();
  return useQuery<MarketListing[]>({
    queryKey: ["chatMarket", city, category],
    queryFn: async () => {
      if (!actor) return lsRead<MarketListing[]>("dz_chat_market", []);
      try {
        const data = (await asChatActor(actor).getMarketListings(
          city ?? "",
          category ?? "",
        )) as MarketListing[];
        lsWrite("dz_chat_market", data);
        return data;
      } catch {
        return lsRead<MarketListing[]>("dz_chat_market", []);
      }
    },
    enabled: !isFetching,
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

// =====================================================================
// MUTATION HOOKS
// =====================================================================

/** Send a chat message (text, image, file, etc.). */
export function useSendMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).sendMessage(payload) as Promise<ChatMessage>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
  });
}

/** Create a new group conversation. */
export function useCreateGroup() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGroupPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).createChatGroup(
        payload,
      ) as Promise<Conversation>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
  });
}

/** Start or get a direct conversation with another user. */
export function useStartConversation() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).getOrCreateChatConversation(
        targetUserId,
      ) as Promise<Conversation>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
  });
}

/** Post a new story (auto-expires after 24h). */
export function usePostStory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PostStoryPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).postChatStory(payload) as Promise<Story>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatStories"] });
    },
  });
}

/** Mark all messages in a conversation as read. */
export function useMarkConversationRead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).markMessagesRead(conversationId);
    },
    onSuccess: (_data, conversationId) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
  });
}

/** Delete a message (for self or everyone). */
export function useDeleteMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId: _cid,
      forEveryone,
    }: {
      messageId: string;
      conversationId: string;
      forEveryone: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).deleteChatMessage(messageId, forEveryone);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
    },
  });
}

/** React to a message with an emoji. */
export function useReactToMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId: _cid2,
      emoji,
    }: {
      messageId: string;
      conversationId: string;
      emoji: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).reactToChatMessage(messageId, emoji);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
    },
  });
}

/** Update user's chat profile settings. */
export function useUpdateChatProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<ChatUserProfile>) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).updateMyChatProfile(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatProfile"] });
    },
  });
}

/** Schedule a message to send later. */
export function useScheduleMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: SendMessagePayload & { scheduledAt: number },
    ) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).scheduleChatMessage(
        payload,
      ) as Promise<ScheduledMessage>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatScheduled"] });
    },
  });
}

/** Cancel a scheduled message. */
export function useCancelScheduledMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scheduledMessageId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).cancelChatScheduledMessage(scheduledMessageId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatScheduled"] });
    },
  });
}

/** Add item to private vault. */
export function useAddVaultItem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      item: Omit<VaultItem, "id" | "userId" | "createdAt">,
    ) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).addChatVaultItem(item) as Promise<VaultItem>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatVault"] });
    },
  });
}

/** Create a new note in Study Mode. */
export function useCreateNote() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      note: Omit<Note, "id" | "userId" | "createdAt" | "updatedAt">,
    ) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).saveChatNote(note) as Promise<Note>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatNotes"] });
    },
  });
}

/** Create a marketplace listing. */
export function useCreateMarketListing() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMarketListingPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).createMarketListing(
        payload,
      ) as Promise<MarketListing>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatMarket"] });
    },
  });
}

/** Update chat admin settings (admin only). */
export function useUpdateChatAdminSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<ChatAdminSettings>) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).updateChatAdminSettings(settings);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatAdminSettings"] });
    },
  });
}

// =====================================================================
// KEY-LOCKER HOOKS
// =====================================================================

interface SendLockedMessagePayload {
  conversationId: string;
  fileUrl: string;
  fileName: string;
  lockType: import("../types/chatTypes").LockType;
  lockValue: string;
}

/** Send a locked file message. */
export function useSendLockedMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendLockedMessagePayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).sendLockedMessage(
        payload,
      ) as Promise<ChatMessage>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
  });
}

/** Unlock a locked file message with an attempt (password or task answer). */
export function useUnlockMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId: _cid,
      attempt,
    }: {
      messageId: string;
      conversationId: string;
      attempt: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).unlockMessage(messageId, attempt);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["lockedFileUrl", vars.messageId] });
    },
  });
}

/** Get the download URL for an unlocked file. */
export function useGetLockedFileUrl(
  messageId: string | null,
  conversationId: string,
) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["lockedFileUrl", messageId],
    queryFn: async () => {
      if (!actor || !messageId) return null;
      try {
        return (await asChatActor(actor).getLockedFileUrl(
          messageId,
          conversationId,
        )) as string | null;
      } catch {
        return null;
      }
    },
    enabled: !!messageId && !isFetching,
    staleTime: 60_000,
  });
}

// =====================================================================
// AI SUMMARY HOOKS
// =====================================================================

interface SummarizePayload {
  conversationId: string;
  mode: "last50" | "last24h";
}

/** Summarize recent messages in a conversation using AI. */
export function useSummarizeChatMessages() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (payload: SummarizePayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).summarizeChatMessages(
        payload.conversationId,
        payload.mode,
      );
    },
  });
}

// =====================================================================
// PAY-TO-UNLOCK HOOKS
// =====================================================================

interface SendPayToUnlockPayload {
  conversationId: string;
  content: string;
  unlockPrice: number;
}

/** Send a pay-to-unlock message. */
export function useSendPayToUnlockMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendPayToUnlockPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).sendPayToUnlockMessage(
        payload,
      ) as Promise<ChatMessage>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
  });
}

interface CreateUnlockIntentPayload {
  messageId: string;
  conversationId: string;
  method: "stripe" | "upi";
}

/** Create a payment intent for unlocking a monetized message. */
export function useCreateUnlockPaymentIntent() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (payload: CreateUnlockIntentPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).createUnlockPaymentIntent(payload);
    },
  });
}

interface ConfirmUpiUnlockPayload {
  messageId: string;
  conversationId: string;
  txnRef: string;
}

/** Submit a UPI transaction reference for admin to verify. */
export function useConfirmUpiUnlock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConfirmUpiUnlockPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).confirmUpiUnlock(payload);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
    },
  });
}

interface VerifyStripeUnlockPayload {
  messageId: string;
  conversationId: string;
  sessionId: string;
}

/** Verify a Stripe checkout session and unlock a message. */
export function useVerifyStripeUnlock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VerifyStripeUnlockPayload) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).verifyStripeUnlock(payload);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
    },
  });
}

/** Creator earnings from pay-to-unlock messages. */
export function useCreatorEarnings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["creatorEarnings"],
    queryFn: async () => {
      if (!actor) return lsRead("dz_creator_earnings", null);
      try {
        const data = await asChatActor(actor).getCreatorEarnings();
        lsWrite("dz_creator_earnings", data);
        return data;
      } catch {
        return lsRead("dz_creator_earnings", null);
      }
    },
    enabled: !isFetching,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

// =====================================================================
// ADMIN — UPI UNLOCK REQUESTS
// =====================================================================

/** Admin: all pending UPI unlock payment requests. */
export function useAdminUpiUnlockRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["adminUpiUnlockRequests"],
    queryFn: async () => {
      if (!actor) return lsRead("dz_admin_upi_requests", []);
      try {
        const data = await asChatActor(actor).adminGetUpiUnlockRequests();
        lsWrite("dz_admin_upi_requests", data);
        return data;
      } catch {
        return lsRead("dz_admin_upi_requests", []);
      }
    },
    enabled: !isFetching,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/** Admin: approve a UPI unlock request. */
export function useAdminApproveUpiUnlock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).adminApproveUpiUnlock(requestId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiUnlockRequests"] });
    },
  });
}

/** Admin: reject a UPI unlock request. */
export function useAdminRejectUpiUnlock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!actor) throw new Error("Actor not available");
      return asChatActor(actor).adminRejectUpiUnlock(requestId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiUnlockRequests"] });
    },
  });
}
