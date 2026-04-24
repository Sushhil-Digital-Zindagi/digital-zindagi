/**
 * React Query hooks for the Likeup chat module.
 * All data is stored in the ICP canister (qoab5-iyaaa-aaaad-aggsq-cai).
 * localStorage is used as a fast read-through cache only.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ChatAdminSettings,
  ChatMessage,
  ChatShortcut,
  ChatUserProfile,
  Conversation,
  CreateGroupPayload,
  LeaderboardEntry,
  Note,
  PostStoryPayload,
  ReferralStats,
  RewardPoints,
  ScheduledMessage,
  SendMessagePayload,
  Story,
  VaultItem,
} from "../types/chatTypes";
import { MessageType } from "../types/chatTypes";
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

// Typed chat actor accessor
function asChatActor(
  actor: unknown,
): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return actor as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

// Safely convert string ID to bigint
function toBigInt(id: string | bigint | number | null | undefined): bigint {
  if (id == null) return 0n;
  if (typeof id === "bigint") return id;
  try {
    return BigInt(id);
  } catch {
    return 0n;
  }
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
        const data = await asChatActor(actor).getMyChatConversations();
        const result = (data ?? []) as Conversation[];
        lsWrite("dz_chat_conversations", result);
        return result;
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
        // Backend: getConversationMessages(conversationId: bigint, limit: bigint, before: bigint | null)
        const data = await asChatActor(actor).getConversationMessages(
          toBigInt(conversationId),
          50n,
          null,
        );
        const result = (data ?? []) as ChatMessage[];
        lsWrite(cacheKey, result);
        return result;
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
        const data = await asChatActor(actor).getMyChatProfile();
        if (data) lsWrite("dz_chat_profile", data);
        return (data ?? null) as ChatUserProfile | null;
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
        const data = await asChatActor(actor).getActiveChatStories();
        const result = (data ?? []) as Story[];
        lsWrite("dz_chat_stories", result);
        return result;
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
        const data = await asChatActor(actor).getMyChatPoints();
        if (data) lsWrite("dz_chat_points", data);
        return (data ?? null) as RewardPoints | null;
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
        const data = await asChatActor(actor).getChatPointsLeaderboard();
        const result = (data ?? []) as LeaderboardEntry[];
        lsWrite("dz_chat_leaderboard", result);
        return result;
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
        const data = await asChatActor(actor).getMyChatReferralStats();
        if (data) lsWrite("dz_chat_referral", data);
        return (data ?? null) as ReferralStats | null;
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
        const data = await asChatActor(actor).getChatAdminSettings();
        const merged = { ...defaults, ...(data as object) };
        lsWrite("dz_chat_admin_settings", merged);
        return merged as ChatAdminSettings;
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
        const data = await asChatActor(actor).getChatShortcuts();
        const result = (data ?? []) as ChatShortcut[];
        lsWrite("dz_chat_shortcuts", result);
        return result;
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
        const data = await asChatActor(actor).getChatScheduledMessages();
        const result = (data ?? []) as ScheduledMessage[];
        lsWrite("dz_chat_scheduled", result);
        return result;
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
        const data = await asChatActor(actor).getChatVaultItems();
        const result = (data ?? []) as VaultItem[];
        lsWrite("dz_chat_vault", result);
        return result;
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
        const data = await asChatActor(actor).getChatNotes();
        const result = (data ?? []) as Note[];
        lsWrite("dz_chat_notes", result);
        return result;
      } catch {
        return lsRead<Note[]>("dz_chat_notes", []);
      }
    },
    enabled: !isFetching,
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
      // Backend: sendMessage(conversationId: bigint, content: string, messageType: MessageType, mediaUrl: string | null, replyToId: bigint | null, isVanish: boolean)
      const result = await asChatActor(actor).sendMessage(
        toBigInt(payload.conversationId),
        payload.content,
        (payload.type ?? MessageType.text) as unknown,
        payload.mediaUrl ?? null,
        payload.replyToId ? toBigInt(payload.replyToId) : null,
        payload.isVanish ?? false,
      );
      return result as ChatMessage;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
    onError: () => {
      toast.error("Message send नहीं हुआ, दोबारा try करें");
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
      // Backend: createChatGroup(name: string, memberIds: Principal[], photoUrl: string | null)
      const result = await asChatActor(actor).createChatGroup(
        payload.name,
        payload.memberIds as unknown[],
        payload.photoUrl ?? null,
      );
      return result as Conversation;
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
      // Backend: getOrCreateChatConversation(otherUserId: Principal)
      const result = await asChatActor(actor).getOrCreateChatConversation(
        targetUserId as unknown,
      );
      // Result is bigint (conversation ID) or Result<bigint, string>
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; ok?: unknown; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Failed");
        return String(r.ok);
      }
      return String(result);
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
      // Backend: postChatStory(mediaUrl: string | null, textContent: string | null)
      const result = await asChatActor(actor).postChatStory(
        payload.mediaUrl ?? null,
        payload.content ?? null,
      );
      return result as Story;
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
      // Backend: markMessagesRead(conversationId: bigint)
      return asChatActor(actor).markMessagesRead(toBigInt(conversationId));
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
      // Backend: deleteChatMessage(messageId: bigint, deleteForEveryone: boolean)
      return asChatActor(actor).deleteChatMessage(
        toBigInt(messageId),
        forEveryone,
      );
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
      // Backend: reactToChatMessage(messageId: bigint, emoji: string)
      return asChatActor(actor).reactToChatMessage(toBigInt(messageId), emoji);
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
      // Backend: updateMyChatProfile(displayName: string | null, bio: string | null, city: string | null, profilePhotoUrl: string | null)
      return asChatActor(actor).updateMyChatProfile(
        updates.name ?? null,
        updates.bio ?? null,
        updates.city ?? null,
        updates.photoUrl ?? null,
      );
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
      // Backend: scheduleChatMessage(conversationId: bigint, content: string, scheduledAt: bigint)
      const result = await asChatActor(actor).scheduleChatMessage(
        toBigInt(payload.conversationId),
        payload.content,
        BigInt(payload.scheduledAt),
      );
      return result as ScheduledMessage;
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
      // Backend: cancelChatScheduledMessage(id: bigint)
      return asChatActor(actor).cancelChatScheduledMessage(
        toBigInt(scheduledMessageId),
      );
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
      // Backend: addChatVaultItem(mediaUrl: string, title: string, isViewOnce: boolean, expiresAt: bigint | null)
      const result = await asChatActor(actor).addChatVaultItem(
        item.fileUrl ?? "",
        item.fileName ?? "",
        item.isViewOnce ?? false,
        item.autoDeleteAt ? BigInt(item.autoDeleteAt) : null,
      );
      return result as VaultItem;
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
      // Backend: saveChatNote(title: string, content: string, subject: string)
      const result = await asChatActor(actor).saveChatNote(
        note.title,
        note.content,
        note.subject ?? "",
      );
      return result as Note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatNotes"] });
    },
  });
}

/** Update chat admin settings (admin only). */
export function useUpdateChatAdminSettings() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: updateChatAdminSettings(settings: ChatAdminSettings)
      return asChatActor(actor).updateChatAdminSettings(settings as unknown);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatAdminSettings"] });
      toast.success("Settings Updated Successfully ✅");
    },
    onError: () => {
      toast.error("Settings save नहीं हो सकी। फिर try करें।");
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
      const { LockType } = await import("../types/chatTypes");
      // Backend: sendLockedMessage(conversationId: bigint, fileUrl: string, lockType: LockType, passwordHash: string | null, task: LockedFileTask | null)
      const isPassword = payload.lockType === LockType.password;
      const isTask = payload.lockType === LockType.task;
      const result = await asChatActor(actor).sendLockedMessage(
        toBigInt(payload.conversationId),
        payload.fileUrl,
        payload.lockType as unknown,
        isPassword ? payload.lockValue : null,
        isTask ? { question: payload.lockValue, answer: "" } : null,
      );
      return result as ChatMessage;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
    onError: () => {
      toast.error("Locked file send नहीं हुई।");
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
      // Backend: unlockMessage(messageId: bigint, attempt: string)
      const result = await asChatActor(actor).unlockMessage(
        toBigInt(messageId),
        attempt,
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Incorrect key");
      }
      return result;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["lockedFileUrl", vars.messageId] });
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : "Incorrect key. Try again.";
      toast.error(msg);
    },
  });
}

/** Get the download URL for an unlocked file. */
export function useGetLockedFileUrl(
  messageId: string | null,
  _conversationId: string,
) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["lockedFileUrl", messageId],
    queryFn: async () => {
      if (!actor || !messageId) return null;
      try {
        // Backend: getLockedFileUrl(messageId: bigint)
        const result = await asChatActor(actor).getLockedFileUrl(
          toBigInt(messageId),
        );
        return (result ?? null) as string | null;
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
    mutationFn: async (payload: SummarizePayload): Promise<string> => {
      if (!actor) throw new Error("Actor not available");
      // Backend: summarizeChatMessages(conversationId: bigint, mode: Variant_last50_last24h)
      const result = await asChatActor(actor).summarizeChatMessages(
        toBigInt(payload.conversationId),
        payload.mode as unknown,
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; ok?: string; err?: string };
        if (r.__kind__ === "err") {
          throw new Error(r.err ?? "Summary failed");
        }
        return r.ok ?? "";
      }
      return String(result ?? "");
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
      // Backend: sendPayToUnlockMessage(conversationId: bigint, content: string, lockPrice: bigint, currency: string)
      const result = await asChatActor(actor).sendPayToUnlockMessage(
        toBigInt(payload.conversationId),
        payload.content,
        BigInt(Math.round(payload.unlockPrice * 100)), // paise
        "INR",
      );
      return result as ChatMessage;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["chatConversations"] });
    },
    onError: () => {
      toast.error("Locked message send नहीं हुई।");
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
      // Backend: confirmUpiUnlock(messageId: bigint, upiTxnRef: string)
      const result = await asChatActor(actor).confirmUpiUnlock(
        toBigInt(payload.messageId),
        payload.txnRef,
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; err?: string };
        if (r.__kind__ === "err") throw new Error(r.err ?? "Submit failed");
      }
      return result;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chatMessages", vars.conversationId] });
      toast.success("Payment submitted! Admin verification pending.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Submit failed.");
    },
  });
}

/** Create a payment intent for unlocking a monetized message. */
export function useCreateUnlockPaymentIntent() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      messageId,
    }: { messageId: string; conversationId: string; method?: string }) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: createUnlockPaymentIntent(messageId: bigint)
      const result = await asChatActor(actor).createUnlockPaymentIntent(
        toBigInt(messageId),
      );
      if (result && typeof result === "object" && "__kind__" in result) {
        const r = result as { __kind__: string; ok?: string; err?: string };
        if (r.__kind__ === "err")
          throw new Error(r.err ?? "Failed to create payment intent");
        return r.ok ?? "";
      }
      return String(result ?? "");
    },
  });
}

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
      if (!actor) return [];
      try {
        const data = await asChatActor(actor).adminGetUpiUnlockRequests();
        return (data ?? []) as unknown[];
      } catch {
        return [];
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
    mutationFn: async (paymentId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminApproveUpiUnlock(paymentId: bigint)
      return asChatActor(actor).adminApproveUpiUnlock(paymentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiUnlockRequests"] });
      toast.success("Unlock request approved ✅");
    },
    onError: () => {
      toast.error("Approve नहीं हो सका।");
    },
  });
}

/** Admin: reject a UPI unlock request. */
export function useAdminRejectUpiUnlock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      // Backend: adminRejectUpiUnlock(paymentId: bigint)
      return asChatActor(actor).adminRejectUpiUnlock(paymentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUpiUnlockRequests"] });
      toast.success("Unlock request rejected.");
    },
    onError: () => {
      toast.error("Reject नहीं हो सका।");
    },
  });
}
