// migration.mo — Upgrade migration for Digital Zindagi backend
// Adds Key-Locker, Pay-to-Unlock, AI Summary, Marketplace, and Premium fields.
import Map  "mo:core/Map";
import List "mo:core/List";

module {

  // ── Old types (inline, from previous stable version) ─────────────────────

  type OldMessageReaction = { emoji : Text; userIds : [Principal] };

  type OldMessageType = {
    #text; #image; #file; #youtubeLink; #voiceText; #scheduledMessage; #reaction; #reply;
  };

  type OldMessageStatus = { #sent; #delivered; #read };

  type OldChatMessage = {
    id                   : Nat;
    conversationId       : Nat;
    senderId             : Principal;
    content              : Text;
    messageType          : OldMessageType;
    mediaUrl             : ?Text;
    replyToId            : ?Nat;
    reactions            : [OldMessageReaction];
    status               : OldMessageStatus;
    isVanish             : Bool;
    scheduledAt          : ?Int;
    createdAt            : Int;
    deletedForSenderAt   : ?Int;
    deletedForEveryoneAt : ?Int;
  };

  type OldChatAdminSettings = {
    chatEnabled         : Bool;
    ghostModeEnabled    : Bool;
    vanishModeEnabled   : Bool;
    storiesEnabled      : Bool;
    schedulingEnabled   : Bool;
    autoReplyEnabled    : Bool;
    voiceToTextEnabled  : Bool;
    shortcutsEnabled    : Bool;
    studyModeEnabled    : Bool;
    rewardPointsEnabled : Bool;
    referralEnabled     : Bool;
    broadcastEnabled    : Bool;
    pointsPerMessage    : Nat;
    pointsPerLogin      : Nat;
    pointsPerStory      : Nat;
    pointsPerReferral   : Nat;
  };

  // Shared sub-types used by both old ChatMessage variants and new
  type Conversation     = { id : Nat; participantIds : [Principal]; lastMessageId : ?Nat; lastMessageAt : Int; isGroup : Bool; groupName : ?Text; groupPhotoUrl : ?Text; adminIds : [Principal]; createdAt : Int };
  type Story            = { id : Nat; authorId : Principal; mediaUrl : ?Text; textContent : ?Text; viewerIds : [Principal]; createdAt : Int; expiresAt : Int };
  type ChatShortcut     = { id : Nat; category : { #greet; #business; #formula; #custom }; trigger : Text; content : Text; createdBy : { #user : Principal; #admin }; isGlobal : Bool };
  type ScheduledMessage = { id : Nat; conversationId : Nat; senderId : Principal; content : Text; scheduledAt : Int; status : { #pending; #sent; #cancelled } };
  type AutoReply        = { userId : Principal; isEnabled : Bool; messages : [Text] };
  type UserChatProfile  = { userId : Principal; username : ?Text; displayName : Text; bio : ?Text; city : ?Text; profilePhotoUrl : ?Text; ghostModeEnabled : Bool; studyModeEnabled : Bool; studyModeSelectedChats : [Nat]; pointsBalance : Nat; referralCode : Text; referralCount : Nat; badge : { #none; #bronze; #silver; #gold; #diamond }; autoReply : ?AutoReply; createdAt : Int };
  type PointsHistoryEntry = { action : Text; points : Nat; at : Int };
  type RewardPoints     = { userId : Principal; totalPoints : Nat; history : [PointsHistoryEntry] };
  type VaultItem        = { id : Nat; ownerId : Principal; mediaUrl : Text; title : Text; isViewOnce : Bool; viewedAt : ?Int; expiresAt : ?Int; createdAt : Int };
  type Note             = { id : Nat; ownerId : Principal; title : Text; content : Text; subject : Text; createdAt : Int; updatedAt : Int };

  // Old ChatState (as it was persisted in chatState let binding)
  type OldChatState = {
    messages      : Map.Map<Nat, OldChatMessage>;
    conversations : Map.Map<Nat, Conversation>;
    stories       : Map.Map<Nat, Story>;
    shortcuts     : Map.Map<Nat, ChatShortcut>;
    profiles      : Map.Map<Principal, UserChatProfile>;
    points        : Map.Map<Principal, RewardPoints>;
    scheduled     : Map.Map<Nat, ScheduledMessage>;
    vault         : Map.Map<Nat, VaultItem>;
    notes         : Map.Map<Nat, Note>;
    adminSettings : List.List<OldChatAdminSettings>;
  };

  // ── New types (matching current types/chat.mo) ────────────────────────────

  type NewMessageType = {
    #text; #image; #file; #youtubeLink; #voiceText; #scheduledMessage; #reaction; #reply; #locked;
  };

  // LockedFile type (all fields null/empty on migration)
  type LockedFileTask = { question : Text; answer : Text };
  type LockedFile = { fileUrl : Text; lockType : { #none; #password; #task }; passwordHash : ?Text; task : ?LockedFileTask; unlockedBy : [Principal] };

  // Pay-to-unlock
  type LockedMessageStatus  = { #pending; #completed; #failed };
  type LockedMessagePayment = { id : Nat; messageId : Text; buyerId : Principal; creatorId : Principal; amount : Nat; currency : Text; stripePaymentIntentId : ?Text; upiTxnRef : ?Text; status : LockedMessageStatus; createdAt : Int; unlockedAt : ?Int };

  type NewChatMessage = {
    id                   : Nat;
    conversationId       : Nat;
    senderId             : Principal;
    content              : Text;
    messageType          : NewMessageType;
    mediaUrl             : ?Text;
    replyToId            : ?Nat;
    reactions            : [OldMessageReaction];
    status               : OldMessageStatus;
    isVanish             : Bool;
    scheduledAt          : ?Int;
    createdAt            : Int;
    deletedForSenderAt   : ?Int;
    deletedForEveryoneAt : ?Int;
    lockedFile           : ?LockedFile;
    isLocked             : Bool;
    lockPrice            : ?Nat;
    lockCurrency         : ?Text;
    unlockedBy           : [Principal];
  };

  type NewChatAdminSettings = {
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
    openAiApiKey         : Text;
    payToUnlockEnabled   : Bool;
    stripePublishableKey : Text;
    stripeSecretKey      : Text;
  };

  // New ChatState (matches ChatApi.ChatState)
  type NewChatState = {
    messages      : Map.Map<Nat, NewChatMessage>;
    conversations : Map.Map<Nat, Conversation>;
    stories       : Map.Map<Nat, Story>;
    shortcuts     : Map.Map<Nat, ChatShortcut>;
    profiles      : Map.Map<Principal, UserChatProfile>;
    points        : Map.Map<Principal, RewardPoints>;
    scheduled     : Map.Map<Nat, ScheduledMessage>;
    vault         : Map.Map<Nat, VaultItem>;
    notes         : Map.Map<Nat, Note>;
    adminSettings : List.List<NewChatAdminSettings>;
    payments      : Map.Map<Nat, LockedMessagePayment>;
  };

  // ── Migration state types ─────────────────────────────────────────────────

  type OldActor = {
    chatMessages           : Map.Map<Nat, OldChatMessage>;
    chatAdminSettingsStore : List.List<OldChatAdminSettings>;
    chatState              : OldChatState;
  };

  type NewActor = {
    chatMessages           : Map.Map<Nat, NewChatMessage>;
    chatAdminSettingsStore : List.List<NewChatAdminSettings>;
    chatState              : NewChatState;
  };

  // ── Migration function ────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {

    // Migrate messages: add pay-to-unlock fields with defaults
    let chatMessages = old.chatMessages.map<Nat, OldChatMessage, NewChatMessage>(
      func(_id, m) {
        {
          m with
          messageType  = (m.messageType : NewMessageType);
          lockedFile   = null;
          isLocked     = false;
          lockPrice    = null;
          lockCurrency = null;
          unlockedBy   = [];
        }
      }
    );

    // Migrate admin settings: add AI/Pay-to-Unlock fields
    let chatAdminSettingsStore = List.empty<NewChatAdminSettings>();
    old.chatAdminSettingsStore.forEach(func(s : OldChatAdminSettings) {
      chatAdminSettingsStore.add({
        s with
        openAiApiKey         = "";
        payToUnlockEnabled   = false;
        stripePublishableKey = "";
        stripeSecretKey      = "";
      });
    });

    // Rebuild chatState with migrated data
    let chatState : NewChatState = {
      messages      = chatMessages;
      conversations = old.chatState.conversations;
      stories       = old.chatState.stories;
      shortcuts     = old.chatState.shortcuts;
      profiles      = old.chatState.profiles;
      points        = old.chatState.points;
      scheduled     = old.chatState.scheduled;
      vault         = old.chatState.vault;
      notes         = old.chatState.notes;
      adminSettings = chatAdminSettingsStore;
      payments      = Map.empty<Nat, LockedMessagePayment>();
    };

    { chatMessages; chatAdminSettingsStore; chatState };
  };

};
