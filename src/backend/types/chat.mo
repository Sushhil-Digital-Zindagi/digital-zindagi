// types/chat.mo — Chat domain type definitions for Digital Zindagi
// All types are shared-safe (no var fields, no mutable containers).
module {

  // ── Shared variant / enum types ───────────────────────────────────────────

  public type MessageType = {
    #text;
    #image;
    #file;
    #youtubeLink;
    #voiceText;
    #scheduledMessage;
    #reaction;
    #reply;
    #locked;
  };

  public type MessageStatus = {
    #sent;
    #delivered;
    #read;
  };

  public type ShortcutCategory = {
    #greet;
    #business;
    #formula;
    #custom;
  };

  public type ShortcutCreator = {
    #user : Principal;
    #admin;
  };

  public type ScheduledMessageStatus = {
    #pending;
    #sent;
    #cancelled;
  };

  public type Badge = {
    #none;
    #bronze;
    #silver;
    #gold;
    #diamond;
  };

  // ── Key-Locker types (defined before ChatMessage which references LockedFile)

  public type LockType = {
    #none;
    #password;
    #task;
  };

  public type LockedFileTask = {
    question : Text;
    answer   : Text;   // stored as plain text; comparison is case-insensitive
  };

  public type LockedFile = {
    fileUrl      : Text;
    lockType     : LockType;
    passwordHash : ?Text;           // sha256 hex or any client-chosen hash
    task         : ?LockedFileTask;
    unlockedBy   : [Principal];     // principals who have unlocked this message
  };

  // ── Pay-to-unlock payment status ─────────────────────────────────────────

  public type LockedMessageStatus = {
    #pending;
    #completed;
    #failed;
  };

  // ── Pay-to-unlock payment record ─────────────────────────────────────────

  public type LockedMessagePayment = {
    id                    : Nat;
    messageId             : Text;      // stringified Nat message id
    buyerId               : Principal;
    creatorId             : Principal;
    amount                : Nat;       // price in paise (smallest unit)
    currency              : Text;      // "INR" or "USD"
    stripePaymentIntentId : ?Text;
    upiTxnRef             : ?Text;
    status                : LockedMessageStatus;
    createdAt             : Int;
    unlockedAt            : ?Int;
  };

  // ── Message reaction ──────────────────────────────────────────────────────

  public type MessageReaction = {
    emoji   : Text;
    userIds : [Principal];
  };

  // ── Core message type ─────────────────────────────────────────────────────

  public type ChatMessage = {
    id                     : Nat;
    conversationId         : Nat;
    senderId               : Principal;
    content                : Text;
    messageType            : MessageType;
    mediaUrl               : ?Text;
    replyToId              : ?Nat;
    reactions              : [MessageReaction];
    status                 : MessageStatus;
    isVanish               : Bool;
    scheduledAt            : ?Int;
    createdAt              : Int;
    deletedForSenderAt     : ?Int;
    deletedForEveryoneAt   : ?Int;
    lockedFile             : ?LockedFile;   // null for normal messages (Key-Locker)
    // Pay-to-unlock fields (monetary payment gate)
    isLocked               : Bool;
    lockPrice              : ?Nat;          // price in paise; null = not pay-gated
    lockCurrency           : ?Text;         // "INR" or "USD"
    unlockedBy             : [Principal];   // principals who paid to unlock
  };

  // ── Conversation (1-to-1 or group) ───────────────────────────────────────

  public type Conversation = {
    id             : Nat;
    participantIds : [Principal];
    lastMessageId  : ?Nat;
    lastMessageAt  : Int;
    isGroup        : Bool;
    groupName      : ?Text;
    groupPhotoUrl  : ?Text;
    adminIds       : [Principal];
    createdAt      : Int;
  };

  // ── Story (24-hour auto-delete) ───────────────────────────────────────────

  public type Story = {
    id          : Nat;
    authorId    : Principal;
    mediaUrl    : ?Text;
    textContent : ?Text;
    viewerIds   : [Principal];
    createdAt   : Int;
    expiresAt   : Int; // createdAt + 86_400 * 1_000_000_000
  };

  // ── Chat shortcut (@trigger system) ──────────────────────────────────────

  public type ChatShortcut = {
    id        : Nat;
    category  : ShortcutCategory;
    trigger   : Text;
    content   : Text;
    createdBy : ShortcutCreator;
    isGlobal  : Bool;
  };

  // ── Scheduled message ─────────────────────────────────────────────────────

  public type ScheduledMessage = {
    id             : Nat;
    conversationId : Nat;
    senderId       : Principal;
    content        : Text;
    scheduledAt    : Int;
    status         : ScheduledMessageStatus;
  };

  // ── Auto-reply configuration ──────────────────────────────────────────────

  public type AutoReply = {
    userId    : Principal;
    isEnabled : Bool;
    messages  : [Text];
  };

  // ── Private vault item ────────────────────────────────────────────────────

  public type VaultItem = {
    id         : Nat;
    ownerId    : Principal;
    mediaUrl   : Text;
    title      : Text;
    isViewOnce : Bool;
    viewedAt   : ?Int;
    expiresAt  : ?Int;
    createdAt  : Int;
  };

  // ── User chat profile ─────────────────────────────────────────────────────

  public type UserChatProfile = {
    userId                  : Principal;
    username                : ?Text;
    displayName             : Text;
    bio                     : ?Text;
    city                    : ?Text;
    profilePhotoUrl         : ?Text;
    ghostModeEnabled        : Bool;
    studyModeEnabled        : Bool;
    studyModeSelectedChats  : [Nat];
    pointsBalance           : Nat;
    referralCode            : Text;
    referralCount           : Nat;
    badge                   : Badge;
    autoReply               : ?AutoReply;
    createdAt               : Int;
  };

  // ── Reward points history entry ───────────────────────────────────────────

  public type PointsHistoryEntry = {
    action : Text;
    points : Nat;
    at     : Int;
  };

  public type RewardPoints = {
    userId      : Principal;
    totalPoints : Nat;
    history     : [PointsHistoryEntry];
  };

  // ── Chat-specific admin settings ──────────────────────────────────────────

  public type ChatAdminSettings = {
    chatEnabled          : Bool;
    ghostModeEnabled     : Bool;
    vanishModeEnabled    : Bool;
    storiesEnabled       : Bool;
    schedulingEnabled    : Bool;
    autoReplyEnabled     : Bool;
    voiceToTextEnabled   : Bool;
    shortcutsEnabled     : Bool;
    studyModeEnabled     : Bool;
    rewardPointsEnabled  : Bool;
    referralEnabled      : Bool;
    broadcastEnabled     : Bool;
    pointsPerMessage     : Nat;
    pointsPerLogin       : Nat;
    pointsPerStory       : Nat;
    pointsPerReferral    : Nat;
    // AI Chat Summary — admin configures OpenAI API key
    openAiApiKey         : Text;
    // Pay-to-unlock
    payToUnlockEnabled   : Bool;
    stripePublishableKey : Text;
    stripeSecretKey      : Text;
  };

  // ── Study-mode note ───────────────────────────────────────────────────────

  public type Note = {
    id        : Nat;
    ownerId   : Principal;
    title     : Text;
    content   : Text;
    subject   : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  // ── Leaderboard entry (shared-safe summary) ───────────────────────────────

  public type LeaderboardEntry = {
    userId      : Principal;
    displayName : Text;
    points      : Nat;
  };

  // ── Referral stats summary ────────────────────────────────────────────────

  public type ReferralStats = {
    code         : Text;
    count        : Nat;
    badge        : Text;
    pointsEarned : Nat;
  };

  // ── Chat stats summary (admin) ────────────────────────────────────────────

  public type ChatStats = {
    totalUsers    : Nat;
    activeChats   : Nat;
    totalMessages : Nat;
    storiesPosted : Nat;
  };

  // ── Creator earnings summary ──────────────────────────────────────────────

  public type CreatorEarningsSummary = {
    totalEarnings  : Nat;
    pendingPayouts : Nat;
    payments       : [LockedMessagePayment];
  };

};
