// mixins/chat-api.mo — Chat domain API module
// All functions accept injected state parameters; called directly from main.mo.
import Map       "mo:core/Map";
import List      "mo:core/List";
import Text      "mo:core/Text";
import Nat       "mo:core/Nat";
// Result not needed — using inline variants
import Time      "mo:core/Time";
import Types     "../types/chat";
import ChatLib   "../lib/chat";

module {

  // ── HTTP outcall types for Stripe API calls ───────────────────────────────

  type ApiHttpHeader = { name : Text; value : Text };
  type ApiManagementCanister = actor {
    http_request : {
      url               : Text;
      max_response_bytes : ?Nat64;
      headers           : [ApiHttpHeader];
      body              : ?Blob;
      method            : { #get; #post; #head };
      transform         : ?{ function : shared query ({ response : { status : Nat; headers : [ApiHttpHeader]; body : Blob }; context : Blob }) -> async { status : Nat; headers : [ApiHttpHeader]; body : Blob }; context : Blob };
    } -> async { status : Nat; headers : [ApiHttpHeader]; body : Blob };
  };

  // ── Type aliases re-exported for caller convenience ───────────────────────

  public type Messages      = ChatLib.Messages;
  public type Conversations = ChatLib.Conversations;
  public type Stories       = ChatLib.Stories;
  public type Shortcuts     = ChatLib.Shortcuts;
  public type Profiles      = ChatLib.Profiles;
  public type Points        = ChatLib.Points;
  public type Scheduled     = ChatLib.Scheduled;
  public type Vault         = ChatLib.Vault;
  public type Notes         = ChatLib.Notes;
  public type Payments      = ChatLib.Payments;

  // ── State bundle (passed by the actor into each call) ─────────────────────

  public type ChatState = {
    messages      : Messages;
    conversations : Conversations;
    stories       : Stories;
    shortcuts     : Shortcuts;
    profiles      : Profiles;
    points        : Points;
    scheduled     : Scheduled;
    vault         : Vault;
    notes         : Notes;
    adminSettings : List.List<Types.ChatAdminSettings>;
    payments      : Payments;
  };

  // ── Admin settings helpers ────────────────────────────────────────────────

  let defaultAdminSettings : Types.ChatAdminSettings = {
    chatEnabled         = true;
    ghostModeEnabled    = true;
    vanishModeEnabled   = true;
    storiesEnabled      = true;
    schedulingEnabled   = true;
    autoReplyEnabled    = true;
    voiceToTextEnabled  = true;
    shortcutsEnabled    = true;
    studyModeEnabled    = true;
    rewardPointsEnabled = true;
    referralEnabled     = true;
    broadcastEnabled    = true;
    pointsPerMessage    = 1;
    pointsPerLogin      = 10;
    pointsPerStory      = 5;
    pointsPerReferral   = 50;
    openAiApiKey        = "";
    payToUnlockEnabled  = false;
    stripePublishableKey = "";
    stripeSecretKey     = "";
  };

  public func getAdminSettings(store : List.List<Types.ChatAdminSettings>) : Types.ChatAdminSettings {
    switch (store.first()) {
      case null { defaultAdminSettings };
      case (?s) { s };
    };
  };

  public func setAdminSettings(store : List.List<Types.ChatAdminSettings>, s : Types.ChatAdminSettings) {
    if (store.isEmpty()) {
      store.add(s);
    } else {
      store.mapInPlace(func(_old : Types.ChatAdminSettings) : Types.ChatAdminSettings { s });
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Chat Messages
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(msgId), newNextMsgId)
  public func sendMessage(
    s              : ChatState,
    nextMsgId      : Nat,
    caller         : Principal,
    conversationId : Nat,
    content        : Text,
    messageType    : Types.MessageType,
    mediaUrl       : ?Text,
    replyToId      : ?Nat,
    isVanish       : Bool,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let now = Time.now();
    let (id, _msg) = ChatLib.createMessage(
      s.messages, nextMsgId, conversationId, caller,
      content, messageType, mediaUrl, replyToId, isVanish, null, now,
    );
    switch (s.conversations.get(conversationId)) {
      case null {};
      case (?c) {
        s.conversations.add(conversationId, { c with lastMessageId = ?id; lastMessageAt = now });
      };
    };
    let settings = getAdminSettings(s.adminSettings);
    if (settings.rewardPointsEnabled) {
      ignore ChatLib.awardPoints(s.points, caller, "message", settings.pointsPerMessage, now);
    };
    (#ok(id), nextMsgId + 1);
  };

  public func getConversationMessages(
    s              : ChatState,
    caller         : Principal,
    conversationId : Nat,
    limit          : Nat,
    before         : ?Nat,
  ) : [Types.ChatMessage] {
    ChatLib.getMessages(s.messages, conversationId, caller, limit, before);
  };

  public func markMessagesRead(
    s              : ChatState,
    caller         : Principal,
    conversationId : Nat,
  ) : Bool {
    let senderHasGhost = switch (s.profiles.get(caller)) {
      case null { false };
      case (?p) { p.ghostModeEnabled };
    };
    if (senderHasGhost) { return true };
    ChatLib.markRead(s.messages, conversationId, caller, Time.now());
  };

  public func deleteMessage(
    s                 : ChatState,
    caller            : Principal,
    messageId         : Nat,
    deleteForEveryone : Bool,
  ) : Bool {
    ChatLib.deleteMessage(s.messages, messageId, caller, deleteForEveryone, Time.now());
  };

  /// Returns (#ok(newMsgId), newNextMsgId)
  public func forwardMessage(
    s                : ChatState,
    nextMsgId        : Nat,
    caller           : Principal,
    messageId        : Nat,
    toConversationId : Nat,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.forwardMessage(s.messages, nextMsgId, messageId, toConversationId, caller, Time.now());
    switch (result) {
      case (#ok(_)) { (result, nextMsgId + 1) };
      case (#err(_)) { (result, nextMsgId) };
    };
  };

  public func reactToMessage(
    s         : ChatState,
    caller    : Principal,
    messageId : Nat,
    emoji     : Text,
  ) : Bool {
    ChatLib.reactToMessage(s.messages, messageId, caller, emoji);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Scheduled messages
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(id), newNextSchedId)
  public func scheduleMessage(
    s              : ChatState,
    nextSchedId    : Nat,
    caller         : Principal,
    conversationId : Nat,
    content        : Text,
    scheduledAt    : Int,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.scheduleMessage(s.scheduled, nextSchedId, caller, conversationId, content, scheduledAt);
    switch (result) {
      case (#ok(_)) { (result, nextSchedId + 1) };
      case (#err(_)) { (result, nextSchedId) };
    };
  };

  public func getScheduledMessages(
    s      : ChatState,
    caller : Principal,
  ) : [Types.ScheduledMessage] {
    ChatLib.getScheduledMessages(s.scheduled, caller);
  };

  public func cancelScheduledMessage(
    s      : ChatState,
    caller : Principal,
    id     : Nat,
  ) : Bool {
    ChatLib.cancelScheduledMessage(s.scheduled, id, caller);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Conversations
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(convId), newNextConvId)
  public func getOrCreateConversation(
    s           : ChatState,
    nextConvId  : Nat,
    caller      : Principal,
    otherUserId : Principal,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.getOrCreate(s.conversations, nextConvId, caller, otherUserId, Time.now());
    switch (result) {
      case (#ok(id)) {
        let newNext = if (id == nextConvId) { nextConvId + 1 } else { nextConvId };
        (result, newNext);
      };
      case (#err(_)) { (result, nextConvId) };
    };
  };

  public func getMyConversations(
    s      : ChatState,
    caller : Principal,
  ) : [Types.Conversation] {
    ChatLib.listConversations(s.conversations, caller);
  };

  /// Returns (#ok(convId), newNextConvId)
  public func createGroup(
    s          : ChatState,
    nextConvId : Nat,
    caller     : Principal,
    name       : Text,
    memberIds  : [Principal],
    photoUrl   : ?Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.createGroup(s.conversations, nextConvId, caller, name, memberIds, photoUrl, Time.now());
    switch (result) {
      case (#ok(_)) { (result, nextConvId + 1) };
      case (#err(_)) { (result, nextConvId) };
    };
  };

  public func addGroupMembers(
    s              : ChatState,
    caller         : Principal,
    conversationId : Nat,
    memberIds      : [Principal],
  ) : Bool {
    ChatLib.addGroupMembers(s.conversations, conversationId, caller, memberIds);
  };

  public func removeGroupMember(
    s              : ChatState,
    caller         : Principal,
    conversationId : Nat,
    memberId       : Principal,
  ) : Bool {
    ChatLib.removeGroupMember(s.conversations, conversationId, caller, memberId);
  };

  public func leaveGroup(
    s              : ChatState,
    caller         : Principal,
    conversationId : Nat,
  ) : Bool {
    ChatLib.leaveGroup(s.conversations, conversationId, caller);
  };

  public func updateGroupInfo(
    s              : ChatState,
    caller         : Principal,
    conversationId : Nat,
    name           : ?Text,
    photoUrl       : ?Text,
  ) : Bool {
    ChatLib.updateGroupInfo(s.conversations, conversationId, caller, name, photoUrl);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Stories
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(storyId), newNextStoryId)
  public func postStory(
    s           : ChatState,
    nextStoryId : Nat,
    caller      : Principal,
    mediaUrl    : ?Text,
    textContent : ?Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let now = Time.now();
    let result = ChatLib.postStory(s.stories, nextStoryId, caller, mediaUrl, textContent, now);
    switch (result) {
      case (#ok(_)) {
        let settings = getAdminSettings(s.adminSettings);
        if (settings.rewardPointsEnabled) {
          ignore ChatLib.awardPoints(s.points, caller, "story", settings.pointsPerStory, now);
        };
        (result, nextStoryId + 1);
      };
      case (#err(_)) { (result, nextStoryId) };
    };
  };

  public func getActiveStories(s : ChatState) : [Types.Story] {
    ChatLib.getActiveStories(s.stories, Time.now());
  };

  public func viewStory(s : ChatState, caller : Principal, storyId : Nat) : Bool {
    ChatLib.viewStory(s.stories, storyId, caller);
  };

  /// Returns (#ok(msgId), newNextMsgId, newNextConvId)
  public func replyToStory(
    s          : ChatState,
    nextMsgId  : Nat,
    nextConvId : Nat,
    caller     : Principal,
    storyId    : Nat,
    message    : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat, Nat) {
    switch (s.stories.get(storyId)) {
      case null { (#err("Story not found"), nextMsgId, nextConvId) };
      case (?story) {
        let now = Time.now();
        let convResult = ChatLib.getOrCreate(s.conversations, nextConvId, caller, story.authorId, now);
        let (convId, newConvNext) = switch (convResult) {
          case (#err(e)) { return (#err(e), nextMsgId, nextConvId) };
          case (#ok(id)) {
            let newNext = if (id == nextConvId) { nextConvId + 1 } else { nextConvId };
            (id, newNext);
          };
        };
        let (msgId, _) = ChatLib.createMessage(
          s.messages, nextMsgId, convId, caller,
          message, #text, null, null, false, null, now,
        );
        switch (s.conversations.get(convId)) {
          case null {};
          case (?c) {
            s.conversations.add(convId, { c with lastMessageId = ?msgId; lastMessageAt = now });
          };
        };
        (#ok(msgId), nextMsgId + 1, newConvNext);
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // User chat profile
  // ─────────────────────────────────────────────────────────────────────────

  public func getChatProfile(s : ChatState, caller : Principal) : ?Types.UserChatProfile {
    s.profiles.get(caller);
  };

  public func updateChatProfile(
    s               : ChatState,
    caller          : Principal,
    displayName     : ?Text,
    bio             : ?Text,
    city            : ?Text,
    profilePhotoUrl : ?Text,
  ) : Bool {
    ignore ChatLib.getOrCreateProfile(s.profiles, caller, Time.now());
    ChatLib.updateProfile(s.profiles, caller, displayName, bio, city, profilePhotoUrl);
  };

  public func setGhostMode(s : ChatState, caller : Principal, enabled : Bool) : Bool {
    ignore ChatLib.getOrCreateProfile(s.profiles, caller, Time.now());
    ChatLib.setGhostMode(s.profiles, caller, enabled);
  };

  public func setStudyMode(s : ChatState, caller : Principal, enabled : Bool, selectedChats : [Nat]) : Bool {
    ignore ChatLib.getOrCreateProfile(s.profiles, caller, Time.now());
    ChatLib.setStudyMode(s.profiles, caller, enabled, selectedChats);
  };

  public func setAutoReply(s : ChatState, caller : Principal, enabled : Bool, messages : [Text]) : Bool {
    ignore ChatLib.getOrCreateProfile(s.profiles, caller, Time.now());
    ChatLib.setAutoReply(s.profiles, caller, enabled, messages);
  };

  public func getUserChatProfile(s : ChatState, userId : Principal) : ?Types.UserChatProfile {
    s.profiles.get(userId);
  };

  public func searchChatUsers(s : ChatState, searchQuery : Text) : [Types.UserChatProfile] {
    ChatLib.searchUsers(s.profiles, searchQuery);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Shortcuts
  // ─────────────────────────────────────────────────────────────────────────

  public func getShortcuts(s : ChatState, caller : Principal) : [Types.ChatShortcut] {
    ChatLib.getShortcuts(s.shortcuts, caller);
  };

  /// Returns (#ok(id), newNextSCId)
  public func addPersonalShortcut(
    s        : ChatState,
    nextSCId : Nat,
    caller   : Principal,
    trigger  : Text,
    content  : Text,
    category : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.addPersonalShortcut(s.shortcuts, nextSCId, caller, trigger, content, category);
    switch (result) {
      case (#ok(_)) { (result, nextSCId + 1) };
      case (#err(_)) { (result, nextSCId) };
    };
  };

  public func deleteShortcut(s : ChatState, caller : Principal, id : Nat, isAdmin : Bool) : Bool {
    ChatLib.deleteShortcut(s.shortcuts, id, caller, isAdmin);
  };

  /// Returns (#ok(id), newNextSCId)
  public func adminAddShortcut(
    s        : ChatState,
    nextSCId : Nat,
    trigger  : Text,
    content  : Text,
    category : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let cat : Types.ShortcutCategory = switch (category) {
      case "greet"    { #greet };
      case "business" { #business };
      case "formula"  { #formula };
      case _          { #custom };
    };
    let sc : Types.ChatShortcut = {
      id        = nextSCId;
      category  = cat;
      trigger;
      content;
      createdBy = #admin;
      isGlobal  = true;
    };
    s.shortcuts.add(nextSCId, sc);
    (#ok(nextSCId), nextSCId + 1);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Vault (Private gallery)
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(id), newNextVaultId)
  public func addVaultItem(
    s           : ChatState,
    nextVaultId : Nat,
    caller      : Principal,
    mediaUrl    : Text,
    title       : Text,
    isViewOnce  : Bool,
    expiresAt   : ?Int,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.addVaultItem(s.vault, nextVaultId, caller, mediaUrl, title, isViewOnce, expiresAt, Time.now());
    switch (result) {
      case (#ok(_)) { (result, nextVaultId + 1) };
      case (#err(_)) { (result, nextVaultId) };
    };
  };

  public func getVaultItems(s : ChatState, caller : Principal) : [Types.VaultItem] {
    ChatLib.getVaultItems(s.vault, caller);
  };

  public func viewVaultItem(s : ChatState, caller : Principal, id : Nat) : ?Types.VaultItem {
    ChatLib.viewVaultItem(s.vault, id, caller, Time.now());
  };

  public func deleteVaultItem(s : ChatState, caller : Principal, id : Nat) : Bool {
    ChatLib.deleteVaultItem(s.vault, id, caller);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Notes (Study Mode)
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(id), newNextNoteId)
  public func saveNote(
    s          : ChatState,
    nextNoteId : Nat,
    caller     : Principal,
    title      : Text,
    content    : Text,
    subject    : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let result = ChatLib.saveNote(s.notes, nextNoteId, caller, title, content, subject, Time.now());
    switch (result) {
      case (#ok(_)) { (result, nextNoteId + 1) };
      case (#err(_)) { (result, nextNoteId) };
    };
  };

  public func getNotes(s : ChatState, caller : Principal) : [Types.Note] {
    ChatLib.getNotes(s.notes, caller);
  };

  public func updateNote(
    s       : ChatState,
    caller  : Principal,
    id      : Nat,
    title   : ?Text,
    content : ?Text,
    subject : ?Text,
  ) : Bool {
    ChatLib.updateNote(s.notes, id, caller, title, content, subject, Time.now());
  };

  public func deleteNote(s : ChatState, caller : Principal, id : Nat) : Bool {
    ChatLib.deleteNote(s.notes, id, caller);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Rewards & Referrals
  // ─────────────────────────────────────────────────────────────────────────

  public func getMyPoints(s : ChatState, caller : Principal) : Types.RewardPoints {
    ChatLib.getPoints(s.points, caller);
  };

  public func awardPoints(s : ChatState, caller : Principal, action : Text, points : Nat) : Bool {
    ChatLib.awardPoints(s.points, caller, action, points, Time.now());
  };

  public func getPointsLeaderboard(s : ChatState) : [Types.LeaderboardEntry] {
    ChatLib.getLeaderboard(s.points, s.profiles, 10);
  };

  public func getMyReferralCode(s : ChatState, caller : Principal) : Text {
    let profile = ChatLib.getOrCreateProfile(s.profiles, caller, Time.now());
    profile.referralCode;
  };

  public func getReferralStats(s : ChatState, caller : Principal) : Types.ReferralStats {
    let profile = ChatLib.getOrCreateProfile(s.profiles, caller, Time.now());
    let badgeText = switch (profile.badge) {
      case (#none)    { "None" };
      case (#bronze)  { "Bronze" };
      case (#silver)  { "Silver" };
      case (#gold)    { "Gold" };
      case (#diamond) { "Diamond" };
    };
    let earned = switch (s.points.get(caller)) {
      case null { 0 };
      case (?rp) {
        rp.history
          .filter(func(e : Types.PointsHistoryEntry) : Bool { e.action == "referral" })
          .foldLeft(0, func(acc : Nat, e : Types.PointsHistoryEntry) : Nat { acc + e.points });
      };
    };
    { code = profile.referralCode; count = profile.referralCount; badge = badgeText; pointsEarned = earned };
  };

  public func processReferralSignup(s : ChatState, caller : Principal, referralCode : Text) : Bool {
    ChatLib.processReferral(s.profiles, s.points, referralCode, caller, getAdminSettings(s.adminSettings).pointsPerReferral, Time.now());
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Admin chat controls
  // ─────────────────────────────────────────────────────────────────────────

  public func getChatAdminSettings(s : ChatState) : Types.ChatAdminSettings {
    getAdminSettings(s.adminSettings);
  };

  public func updateChatAdminSettings(s : ChatState, settings : Types.ChatAdminSettings) : Bool {
    setAdminSettings(s.adminSettings, settings);
    true;
  };

  /// Returns (success, newNextMsgId)
  public func adminBroadcastMessage(
    s         : ChatState,
    nextMsgId : Nat,
    caller    : Principal,
    content   : Text,
  ) : (Bool, Nat) {
    if (not getAdminSettings(s.adminSettings).broadcastEnabled) { return (false, nextMsgId) };
    let now = Time.now();
    var currentMsgId = nextMsgId;
    s.conversations.forEach(func(convId : Nat, _conv : Types.Conversation) {
      let (_, _) = ChatLib.createMessage(
        s.messages, currentMsgId, convId, caller,
        content, #text, null, null, false, null, now,
      );
      currentMsgId += 1;
    });
    (true, currentMsgId);
  };

  public func adminGetChatStats(s : ChatState) : Types.ChatStats {
    ChatLib.computeStats(s.profiles, s.conversations, s.messages, s.stories, Time.now());
  };

  /// Returns (success, newNextMsgId, newNextConvId, newNextStoryId, newNextSCId)
  public func adminSeedDemoData(
    s           : ChatState,
    nextMsgId   : Nat,
    nextConvId  : Nat,
    nextStoryId : Nat,
    nextSCId    : Nat,
    seeded      : Bool,
  ) : (Bool, Nat, Nat, Nat, Nat) {
    if (seeded) { return (false, nextMsgId, nextConvId, nextStoryId, nextSCId) };
    let now = Time.now();
    let nextIds = {
      var profileId      = 0 : Nat;
      var conversationId = nextConvId;
      var messageId      = nextMsgId;
      var storyId        = nextStoryId;
      var shortcutId     = nextSCId;
    };
    let result = ChatLib.seedDemoData(
      s.profiles, s.conversations, s.messages, s.stories, s.shortcuts,
      nextIds, now,
    );
    (result, nextIds.messageId, nextIds.conversationId, nextIds.storyId, nextIds.shortcutId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Key-Locker
  // ─────────────────────────────────────────────────────────────────────────

  /// Returns (#ok(messageId), newNextMsgId)
  public func sendLockedMessage(
    s              : ChatState,
    nextMsgId      : Nat,
    caller         : Principal,
    conversationId : Nat,
    fileUrl        : Text,
    lockType       : Types.LockType,
    passwordHash   : ?Text,
    task           : ?Types.LockedFileTask,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let now = Time.now();
    let result = ChatLib.sendLockedMessage(
      s.messages, nextMsgId, conversationId, caller,
      fileUrl, lockType, passwordHash, task, now,
    );
    switch (result) {
      case (#ok(_)) {
        switch (s.conversations.get(conversationId)) {
          case null {};
          case (?c) {
            s.conversations.add(conversationId, { c with lastMessageId = ?nextMsgId; lastMessageAt = now });
          };
        };
        (result, nextMsgId + 1);
      };
      case (#err(_)) { (result, nextMsgId) };
    };
  };

  public func unlockMessage(
    s         : ChatState,
    caller    : Principal,
    messageId : Nat,
    attempt   : Text,
  ) : { #ok : (); #err : Text } {
    ChatLib.unlockMessage(s.messages, messageId, caller, attempt);
  };

  public func getLockedFileUrl(
    s         : ChatState,
    caller    : Principal,
    messageId : Nat,
  ) : ?Text {
    ChatLib.getLockedFileUrl(s.messages, messageId, caller);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────

  public func cleanupExpiredStories(s : ChatState) : Nat {
    ChatLib.cleanupExpiredStories(s.stories, Time.now());
  };

  public func cleanupExpiredVaultItems(s : ChatState) : Nat {
    ChatLib.cleanupExpiredVaultItems(s.vault, Time.now());
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AI Chat Summary
  // ─────────────────────────────────────────────────────────────────────────

  /// Summarize recent messages in a conversation using OpenAI.
  /// Returns async #ok(summary) or #err(reason).
  public func summarizeChatMessages(
    s              : ChatState,
    conversationId : Nat,
    mode           : { #last50; #last24h },
  ) : async { #ok : Text; #err : Text } {
    let settings = getAdminSettings(s.adminSettings);
    if (settings.openAiApiKey == "") {
      return #err("OpenAI API key not configured by admin");
    };
    let now = Time.now();
    let cutoff : ?Int = switch (mode) {
      case (#last50)  { null };
      case (#last24h) { ?(now - 86_400_000_000_000) };
    };
    // Collect messages for this conversation
    let allMsgs = ChatLib.getMessages(s.messages, conversationId, Principal.fromText("2vxsx-fae"), 50, null);
    let filtered : [Types.ChatMessage] = switch (cutoff) {
      case null { allMsgs };
      case (?c) { allMsgs.filter(func(m : Types.ChatMessage) : Bool { m.createdAt >= c }) };
    };
    if (filtered.size() == 0) {
      return #err("No messages found to summarize");
    };
    // Build a plain-text transcript for the prompt
    var transcript = "";
    for (m in filtered.values()) {
      transcript := transcript # m.senderId.toText() # ": " # m.content # "\n";
    };
    let prompt = "Summarize the following chat conversation in 5-6 concise lines:\n\n" # transcript;
    let body = "{\"model\":\"gpt-3.5-turbo\",\"messages\":[{\"role\":\"user\",\"content\":\"" # prompt # "\"}],\"max_tokens\":200}";
    let bodyBlob = body.encodeUtf8();
    let mgmt : ApiManagementCanister = actor "aaaaa-aa";
    try {
      let response = await mgmt.http_request({
        url                = "https://api.openai.com/v1/chat/completions";
        max_response_bytes = ?(8000 : Nat64);
        headers            = [
          { name = "Content-Type";  value = "application/json" },
          { name = "Authorization"; value = "Bearer " # settings.openAiApiKey },
        ];
        body               = ?bodyBlob;
        method             = #post;
        transform          = null;
      });
      switch (response.body.decodeUtf8()) {
        case null { #err("Invalid OpenAI response") };
        case (?text) {
          // Extract content from JSON: "content":"<summary>"
          let marker = "\"content\":\"";
          var summary = "";
          var found = false;
          for (part in text.split(#text marker)) {
            if (found) {
              let sub = part.split(#char '\"');
              summary := switch (sub.next()) {
                case null  { "" };
                case (?s)  { s };
              };
              found := false;
            } else { found := true };
          };
          if (summary == "") { #err("Could not extract summary from OpenAI response") }
          else { #ok(summary) };
        };
      };
    } catch _e {
      #err("OpenAI API request failed")
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Pay-to-Unlock Messages
  // ─────────────────────────────────────────────────────────────────────────

  /// Create a pay-to-unlock message. Returns (#ok(msgId), newNextMsgId).
  public func sendPayToUnlockMessage(
    s              : ChatState,
    nextMsgId      : Nat,
    caller         : Principal,
    conversationId : Nat,
    content        : Text,
    lockPrice      : Nat,
    currency       : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    let now = Time.now();
    let result = ChatLib.createPayToUnlockMessage(
      s.messages, nextMsgId, conversationId, caller, content, lockPrice, currency, now,
    );
    switch (result) {
      case (#ok(id)) {
        // Update conversation last message
        switch (s.conversations.get(conversationId)) {
          case null {};
          case (?c) {
            s.conversations.add(conversationId, { c with lastMessageId = ?id; lastMessageAt = now });
          };
        };
        (#ok(id), nextMsgId + 1);
      };
      case (#err(_)) { (result, nextMsgId) };
    };
  };

  /// Create a Stripe PaymentIntent for a locked message.
  /// Returns (#ok(clientSecret), newNextPaymentId).
  /// The stripeSecretKey from admin settings is used server-side.
  /// NOTE: This performs an HTTP outcall to Stripe API.
  public func createUnlockPaymentIntent(
    s         : ChatState,
    nextPayId : Nat,
    caller    : Principal,
    messageId : Nat,
  ) : async ({ #ok : Text; #err : Text }, Nat) {
    switch (s.messages.get(messageId)) {
      case null { (#err("Message not found"), nextPayId) };
      case (?m) {
        if (not m.isLocked) { return (#err("Message is not pay-locked"), nextPayId) };
        let amount = switch (m.lockPrice) {
          case null    { return (#err("No lock price set"), nextPayId) };
          case (?price) { price };
        };
        let currency = switch (m.lockCurrency) {
          case null { "inr" };
          case (?c) { c.toLower() };
        };
        let settings = getAdminSettings(s.adminSettings);
        if (settings.stripeSecretKey == "") {
          return (#err("Stripe not configured by admin"), nextPayId);
        };
        let now = Time.now();
        // Create payment record (pending)
        let payId = ChatLib.createUnlockPayment(
          s.payments, nextPayId, messageId, caller, m.senderId, amount, currency, now,
        );
        // Call Stripe API to create PaymentIntent
        let bodyText = "amount=" # amount.toText() # "&currency=" # currency # "&payment_method_types[]=card";
        let bodyBlob = bodyText.encodeUtf8();
        let mgmt : ApiManagementCanister = actor "aaaaa-aa";
        try {
          let response = await mgmt.http_request({
            url                = "https://api.stripe.com/v1/payment_intents";
            max_response_bytes = ?(4000 : Nat64);
            headers            = [
              { name = "Content-Type";  value = "application/x-www-form-urlencoded" },
              { name = "Authorization"; value = "Bearer " # settings.stripeSecretKey },
            ];
            body               = ?bodyBlob;
            method             = #post;
            transform          = null;
          });
          switch (response.body.decodeUtf8()) {
            case null { (#err("Invalid Stripe response"), payId + 1) };
            case (?text) {
              // Extract client_secret from Stripe JSON response
              let marker = "\"client_secret\":\"";
              var clientSecret = "";
              var found = false;
              for (part in text.split(#text marker)) {
                if (found) {
                  // Extract up to first double-quote by splitting on it
                  let sub = part.split(#char '\"');
                  clientSecret := switch (sub.next()) {
                    case null  { "" };
                    case (?s)  { s };
                  };
                  found := false;
                } else { found := true };
              };
              // Also extract the PaymentIntent id
              let idMarker = "\"id\":\"";
              var piId = "";
              var foundId = false;
              for (part in text.split(#text idMarker)) {
                if (foundId) {
                  let sub = part.split(#char '\"');
                  piId := switch (sub.next()) {
                    case null  { "" };
                    case (?s)  { s };
                  };
                  foundId := false;
                } else { foundId := true };
              };
              if (piId != "") {
                ignore ChatLib.attachStripeIntent(s.payments, payId, piId);
              };
              if (clientSecret == "") {
                (#err("Stripe returned no client_secret"), payId + 1)
              } else {
                (#ok(clientSecret), payId + 1)
              }
            };
          };
        } catch _e {
          (#err("Stripe API request failed"), payId + 1)
        };
      };
    };
  };

  /// Submit a UPI transaction reference for admin approval.
  /// Returns (#ok(paymentId), newNextPaymentId).
  public func confirmUpiUnlock(
    s         : ChatState,
    nextPayId : Nat,
    caller    : Principal,
    messageId : Nat,
    upiTxnRef : Text,
  ) : ({ #ok : Nat; #err : Text }, Nat) {
    switch (s.messages.get(messageId)) {
      case null { (#err("Message not found"), nextPayId) };
      case (?m) {
        if (not m.isLocked) { return (#err("Message is not pay-locked"), nextPayId) };
        let amount = switch (m.lockPrice) {
          case null    { return (#err("No lock price set"), nextPayId) };
          case (?price) { price };
        };
        let currency = switch (m.lockCurrency) {
          case null { "INR" };
          case (?c) { c };
        };
        let now = Time.now();
        let payId = ChatLib.createUnlockPayment(
          s.payments, nextPayId, messageId, caller, m.senderId, amount, currency, now,
        );
        ignore ChatLib.attachUpiRef(s.payments, payId, upiTxnRef);
        (#ok(payId), payId + 1);
      };
    };
  };

  /// Verify a Stripe PaymentIntent and unlock the message if confirmed.
  /// Returns async #ok or #err.
  public func verifyStripeUnlock(
    s               : ChatState,
    caller          : Principal,
    messageId       : Nat,
    paymentIntentId : Text,
  ) : async { #ok; #err : Text } {
    let settings = getAdminSettings(s.adminSettings);
    if (settings.stripeSecretKey == "") {
      return #err("Stripe not configured by admin");
    };
    // Find the payment record for this message + buyer + intentId
    let paymentOpt = s.payments.values().find(func(p : Types.LockedMessagePayment) : Bool {
      p.messageId == messageId.toText()
      and Principal.equal(p.buyerId, caller)
      and p.stripePaymentIntentId == ?paymentIntentId
    });
    switch (paymentOpt) {
      case null { #err("Payment record not found") };
      case (?payment) {
        if (payment.status == #completed) { return #ok };
        // Verify with Stripe
        let mgmt : ApiManagementCanister = actor "aaaaa-aa";
        try {
          let response = await mgmt.http_request({
            url                = "https://api.stripe.com/v1/payment_intents/" # paymentIntentId;
            max_response_bytes = ?(4000 : Nat64);
            headers            = [
              { name = "Authorization"; value = "Bearer " # settings.stripeSecretKey },
            ];
            body               = null;
            method             = #get;
            transform          = null;
          });
          switch (response.body.decodeUtf8()) {
            case null { #err("Invalid Stripe response") };
            case (?text) {
              let succeeded = text.contains(#text "\"status\":\"succeeded\"");
              if (succeeded) {
                switch (ChatLib.completeUnlock(s.messages, s.payments, payment.id, caller, Time.now())) {
                  case (#ok)  { #ok };
                  case (#err(e)) { #err(e) };
                };
              } else {
                ignore ChatLib.failUnlock(s.payments, payment.id);
                #err("Payment not yet confirmed by Stripe")
              };
            };
          };
        } catch _e {
          #err("Stripe verification request failed")
        };
      };
    };
  };

  /// Return the caller's creator earnings.
  public func getCreatorEarnings(
    s      : ChatState,
    caller : Principal,
  ) : Types.CreatorEarningsSummary {
    ChatLib.getCreatorEarnings(s.payments, caller);
  };

  /// Return all pending UPI unlock requests — admin only.
  public func adminGetUpiUnlockRequests(s : ChatState) : [Types.LockedMessagePayment] {
    ChatLib.getPendingUpiUnlocks(s.payments);
  };

  /// Approve a UPI unlock request — admin only.
  /// Unlocks the message for the buyer.
  public func adminApproveUpiUnlock(
    s         : ChatState,
    paymentId : Nat,
  ) : { #ok; #err : Text } {
    switch (s.payments.get(paymentId)) {
      case null { #err("Payment not found") };
      case (?p) {
        ChatLib.completeUnlock(s.messages, s.payments, paymentId, p.buyerId, Time.now());
      };
    };
  };

  /// Reject a UPI unlock request — admin only.
  public func adminRejectUpiUnlock(
    s         : ChatState,
    paymentId : Nat,
  ) : { #ok; #err : Text } {
    if (ChatLib.failUnlock(s.payments, paymentId)) { #ok }
    else { #err("Payment not found") };
  };

};
