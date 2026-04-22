/**
 * Chat domain types for the Likeup chat module.
 * All types mirror the backend canister data structures.
 */

// ---- Enums ----

export enum MessageType {
  text = "text",
  image = "image",
  file = "file",
  voiceNote = "voiceNote",
  videoLink = "videoLink",
  sticker = "sticker",
  system = "system",
}

export enum MessageStatus {
  sending = "sending",
  sent = "sent",
  delivered = "delivered",
  read = "read",
  failed = "failed",
}

export enum ConversationType {
  direct = "direct",
  group = "group",
}

export enum Badge {
  bronze = "bronze",
  silver = "silver",
  gold = "gold",
  diamond = "diamond",
}

export enum StoryType {
  photo = "photo",
  text = "text",
  videoLink = "videoLink",
}

export enum LockType {
  password = "password",
  task = "task",
  none = "none",
}

// ---- Core Message Types ----

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface LockedFile {
  blobId: string;
  fileName: string;
  fileSize: number;
  lockType: LockType;
  lockValue: string; // password or task question
  isUnlocked: boolean;
}

export interface ScheduledSend {
  scheduledAt: number; // unix ms timestamp
  isSent: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  lockedFile?: LockedFile;
  reactions: MessageReaction[];
  status: MessageStatus;
  replyToId?: string;
  replyToContent?: string;
  isDeleted: boolean;
  isVanish: boolean;
  vanishAt?: number;
  isStarred: boolean;
  isForwarded: boolean;
  isMoneytized: boolean;
  unlockPrice?: number;
  isUnlocked?: boolean;
  scheduledSend?: ScheduledSend;
  createdAt: number;
  updatedAt: number;
}

// ---- Conversation Types ----

export interface ConversationParticipant {
  userId: string;
  name: string;
  photoUrl?: string;
  role: "admin" | "member";
  isMuted: boolean;
  joinedAt: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  photoUrl?: string;
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage;
  lastMessageAt: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  createdAt: number;
  createdBy: string;
}

// ---- User Chat Profile ----

export interface ChatUserProfile {
  userId: string;
  name: string;
  username?: string;
  mobile?: string;
  city?: string;
  photoUrl?: string;
  bio?: string;
  isPremium: boolean;
  premiumTill?: number;
  points: number;
  referralCode: string;
  badge?: Badge;
  isPublicMode: boolean;
  ghostModeEnabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyText: string;
  studyModeEnabled: boolean;
  studyModeChats: string[];
  createdAt: number;
}

// ---- Stories ----

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  type: StoryType;
  content: string;
  mediaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  viewers: string[];
  viewerNames: string[];
  expiresAt: number;
  createdAt: number;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

// ---- Shortcuts ----

export interface ChatShortcut {
  id: string;
  trigger: string; // e.g. "@greet"
  category: "formula" | "greet" | "business" | "custom";
  title: string;
  content: string;
  isGlobal: boolean; // admin-defined vs user-defined
  createdBy: string;
  createdAt: number;
}

// ---- Scheduled Messages ----

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  scheduledAt: number;
  isSent: boolean;
  cancelledAt?: number;
  createdAt: number;
}

// ---- Private Vault ----

export interface VaultItem {
  id: string;
  userId: string;
  type: "photo" | "file" | "note";
  fileName: string;
  fileUrl?: string;
  content?: string;
  isViewOnce: boolean;
  viewedAt?: number;
  autoDeleteAt?: number;
  createdAt: number;
}

// ---- Study Mode Notes ----

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  subject?: string;
  isStarred: boolean;
  createdAt: number;
  updatedAt: number;
}

// ---- Reward Points ----

export interface RewardPoints {
  userId: string;
  total: number;
  breakdown: {
    fromMessages: number;
    fromDailyLogin: number;
    fromStories: number;
    fromReferrals: number;
    fromStudyMode: number;
  };
  lastActivity: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  photoUrl?: string;
  points: number;
  badge?: Badge;
}

// ---- Referral Stats ----

export interface ReferralStats {
  userId: string;
  referralCode: string;
  referralLink: string;
  directReferrals: number;
  totalEarned: number;
  pendingBonus: number;
  badge?: Badge;
}

// ---- Chat Admin Settings ----

export interface ChatAdminSettings {
  chatEnabled: boolean;
  storiesEnabled: boolean;
  marketplaceEnabled: boolean;
  rewardsEnabled: boolean;
  premiumEnabled: boolean;
  maxFileSizeMb: number;
  pointsPerMessage: number;
  pointsPerDailyLogin: number;
  pointsPerStory: number;
  pointsPerReferral: number;
  premiumPriceMonthly: number;
  premiumPriceYearly: number;
}

// ---- Marketplace Types ----

export enum MarketplaceCategory {
  mobile = "mobile",
  vehicles = "vehicles",
  property = "property",
  jobs = "jobs",
  services = "services",
  electronics = "electronics",
  other = "other",
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  title: string;
  description: string;
  price: number;
  photoUrl?: string;
  category: MarketplaceCategory;
  city: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

// ---- API Payloads ----

export interface SendMessagePayload {
  conversationId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  replyToId?: string;
  isVanish?: boolean;
  lockedFile?: Omit<LockedFile, "isUnlocked">;
  scheduledAt?: number;
}

export interface CreateGroupPayload {
  name: string;
  photoUrl?: string;
  memberIds: string[];
}

export interface PostStoryPayload {
  type: StoryType;
  content: string;
  mediaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface CreateMarketListingPayload {
  title: string;
  description: string;
  price: number;
  photoUrl?: string;
  category: MarketplaceCategory;
  city: string;
}
