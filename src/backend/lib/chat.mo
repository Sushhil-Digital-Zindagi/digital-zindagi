// lib/chat.mo — Chat domain logic (stateless, all state injected via parameters)
import Map       "mo:core/Map";
import List      "mo:core/List";
import Array     "mo:core/Array";
import Types     "../types/chat";
// Result not needed — using inline variants
import Principal "mo:core/Principal";
import Text      "mo:core/Text";
import Nat       "mo:core/Nat";
import Int       "mo:core/Int";

module {

  // ── Type aliases for injected state containers ────────────────────────────

  public type Messages      = Map.Map<Nat, Types.ChatMessage>;
  public type Conversations = Map.Map<Nat, Types.Conversation>;
  public type Stories       = Map.Map<Nat, Types.Story>;
  public type Shortcuts     = Map.Map<Nat, Types.ChatShortcut>;
  public type Profiles      = Map.Map<Principal, Types.UserChatProfile>;
  public type Points        = Map.Map<Principal, Types.RewardPoints>;
  public type Scheduled     = Map.Map<Nat, Types.ScheduledMessage>;
  public type Vault         = Map.Map<Nat, Types.VaultItem>;
  public type Notes         = Map.Map<Nat, Types.Note>;

  // 24 hours in nanoseconds (86_400 seconds * 1_000_000_000 ns/s)
  let TWENTY_FOUR_HOURS_NS : Int = 86_400_000_000_000;

  // ── Referral code generator (deterministic from principal) ────────────────

  func makeReferralCode(userId : Principal) : Text {
    let raw = userId.toText();
    // Take last 8 chars and uppercase
    let size = raw.size();
    if (size <= 8) { raw.toUpper() }
    else {
      let arr = raw.toArray();
      let slice = Array.tabulate(8, func(i) { arr[size - 8 + i] });
      Text.fromArray(slice).toUpper()
    };
  };

  // ── Badge tier from referral count ───────────────────────────────────────

  func badgeFromCount(count : Nat) : Types.Badge {
    if (count >= 50) { #diamond }
    else if (count >= 20) { #gold }
    else if (count >= 10) { #silver }
    else if (count >= 5)  { #bronze }
    else                  { #none }
  };

  // ── Category text → variant ───────────────────────────────────────────────

  func categoryFromText(cat : Text) : Types.ShortcutCategory {
    switch (cat) {
      case "greet"    { #greet };
      case "business" { #business };
      case "formula"  { #formula };
      case _          { #custom };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Chat Message logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Create a new chat message and return its assigned id.
  public func createMessage(
    messages       : Messages,
    nextId         : Nat,
    conversationId : Nat,
    senderId       : Principal,
    content        : Text,
    messageType    : Types.MessageType,
    mediaUrl       : ?Text,
    replyToId      : ?Nat,
    isVanish       : Bool,
    scheduledAt    : ?Int,
    now            : Int,
  ) : (Nat, Types.ChatMessage) {
    let msg : Types.ChatMessage = {
      id                   = nextId;
      conversationId;
      senderId;
      content;
      messageType;
      mediaUrl;
      replyToId;
      reactions            = [];
      status               = #sent;
      isVanish;
      scheduledAt;
      createdAt            = now;
      deletedForSenderAt   = null;
      deletedForEveryoneAt = null;
      lockedFile           = null;
      isLocked             = false;
      lockPrice            = null;
      lockCurrency         = null;
      unlockedBy           = [];
    };
    messages.add(nextId, msg);
    (nextId, msg);
  };

  /// Retrieve messages for a conversation, newest-first, with pagination.
  public func getMessages(
    messages       : Messages,
    conversationId : Nat,
    callerId       : Principal,
    limit          : Nat,
    before         : ?Nat,
  ) : [Types.ChatMessage] {
    let filtered = messages.values()
      .filter(func(m : Types.ChatMessage) : Bool {
        if (m.conversationId != conversationId) { return false };
        // Skip messages deleted for everyone
        if (m.deletedForEveryoneAt != null) { return false };
        // Skip messages deleted for this sender
        if (m.senderId == callerId and m.deletedForSenderAt != null) { return false };
        switch (before) {
          case null { true };
          case (?b) { m.id < b };
        };
      })
      .toArray();
    // Sort descending by id, then take limit
    let sorted = filtered.sort(func(a : Types.ChatMessage, b : Types.ChatMessage) : { #less; #equal; #greater } {
      Nat.compare(b.id, a.id)
    });
    let cap = if (limit == 0 or limit > sorted.size()) { sorted.size() } else { limit };
    Array.tabulate<Types.ChatMessage>(cap, func(i) { sorted[i] });
  };

  /// Mark all unread messages in a conversation as read for the caller.
  public func markRead(
    messages       : Messages,
    conversationId : Nat,
    callerId       : Principal,
    _now           : Int,
  ) : Bool {
    var changed = false;
    messages.forEach(func(id : Nat, m : Types.ChatMessage) {
      if (m.conversationId == conversationId and m.senderId != callerId and m.status != #read) {
        messages.add(id, { m with status = #read });
        changed := true;
      };
    });
    changed;
  };

  /// Soft-delete a message (for sender only or for everyone).
  public func deleteMessage(
    messages          : Messages,
    messageId         : Nat,
    callerId          : Principal,
    deleteForEveryone : Bool,
    now               : Int,
  ) : Bool {
    switch (messages.get(messageId)) {
      case null { false };
      case (?m) {
        if (m.senderId != callerId) { return false };
        let updated : Types.ChatMessage = if (deleteForEveryone) {
          { m with deletedForEveryoneAt = ?now }
        } else {
          { m with deletedForSenderAt = ?now }
        };
        messages.add(messageId, updated);
        true;
      };
    };
  };

  /// Copy a message to another conversation and return the new message id.
  public func forwardMessage(
    messages         : Messages,
    nextId           : Nat,
    messageId        : Nat,
    toConversationId : Nat,
    callerId         : Principal,
    now              : Int,
  ) : { #ok : Nat; #err : Text } {
    switch (messages.get(messageId)) {
      case null { #err("Message not found") };
      case (?m) {
        let fwd : Types.ChatMessage = {
          id                   = nextId;
          conversationId       = toConversationId;
          senderId             = callerId;
          content              = m.content;
          messageType          = m.messageType;
          mediaUrl             = m.mediaUrl;
          replyToId            = null;
          reactions            = [];
          status               = #sent;
          isVanish             = false;
          scheduledAt          = null;
          createdAt            = now;
          deletedForSenderAt   = null;
          deletedForEveryoneAt = null;
          lockedFile           = null;
          isLocked             = false;
          lockPrice            = null;
          lockCurrency         = null;
          unlockedBy           = [];
        };
        messages.add(nextId, fwd);
        #ok(nextId);
      };
    };
  };

  /// Toggle an emoji reaction on a message; returns true on success.
  public func reactToMessage(
    messages  : Messages,
    messageId : Nat,
    callerId  : Principal,
    emoji     : Text,
  ) : Bool {
    switch (messages.get(messageId)) {
      case null { false };
      case (?m) {
        // Find existing reaction for this emoji
        let existing = m.reactions.find(func(r : Types.MessageReaction) : Bool { r.emoji == emoji });
        let newReactions : [Types.MessageReaction] = switch (existing) {
          case null {
            // Add new reaction entry
            [{ emoji; userIds = [callerId] }].concat(m.reactions)
          };
          case (?r) {
            // Toggle: if caller already reacted, remove; else add
            let alreadyReacted = r.userIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
            m.reactions.map<Types.MessageReaction, Types.MessageReaction>(func(react) {
              if (react.emoji != emoji) { react }
              else if (alreadyReacted) {
                { react with userIds = react.userIds.filter(func(p : Principal) : Bool { not Principal.equal(p, callerId) }) }
              } else {
                { react with userIds = [callerId].concat(react.userIds) }
              }
            });
          };
        };
        messages.add(messageId, { m with reactions = newReactions });
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Conversation logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Return existing 1-to-1 conversation id or create a new one.
  public func getOrCreate(
    conversations : Conversations,
    nextId        : Nat,
    callerId      : Principal,
    otherId       : Principal,
    now           : Int,
  ) : { #ok : Nat; #err : Text } {
    // Search for existing direct conversation
    let existing = conversations.values().find(func(c : Types.Conversation) : Bool {
      if (c.isGroup) { return false };
      let hasMe    = c.participantIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
      let hasOther = c.participantIds.find(func(p : Principal) : Bool { Principal.equal(p, otherId) }) != null;
      hasMe and hasOther and c.participantIds.size() == 2;
    });
    switch (existing) {
      case (?c) { #ok(c.id) };
      case null {
        let conv : Types.Conversation = {
          id             = nextId;
          participantIds = [callerId, otherId];
          lastMessageId  = null;
          lastMessageAt  = now;
          isGroup        = false;
          groupName      = null;
          groupPhotoUrl  = null;
          adminIds       = [];
          createdAt      = now;
        };
        conversations.add(nextId, conv);
        #ok(nextId);
      };
    };
  };

  /// Return all conversations the caller participates in.
  public func listConversations(
    conversations : Conversations,
    callerId      : Principal,
  ) : [Types.Conversation] {
    let all = conversations.values()
      .filter(func(c : Types.Conversation) : Bool {
        c.participantIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null
      })
      .toArray();
    all.sort(func(a : Types.Conversation, b : Types.Conversation) : { #less; #equal; #greater } {
      Int.compare(b.lastMessageAt, a.lastMessageAt)
    });
  };

  /// Create a new group conversation and return its id.
  public func createGroup(
    conversations : Conversations,
    nextId        : Nat,
    callerId      : Principal,
    name          : Text,
    memberIds     : [Principal],
    photoUrl      : ?Text,
    now           : Int,
  ) : { #ok : Nat; #err : Text } {
    if (name == "") { return #err("Group name cannot be empty") };
    // Ensure caller is in memberIds
    let allMembers : [Principal] = if (memberIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null) {
      memberIds
    } else {
      [callerId].concat(memberIds)
    };
    let conv : Types.Conversation = {
      id             = nextId;
      participantIds = allMembers;
      lastMessageId  = null;
      lastMessageAt  = now;
      isGroup        = true;
      groupName      = ?name;
      groupPhotoUrl  = photoUrl;
      adminIds       = [callerId];
      createdAt      = now;
    };
    conversations.add(nextId, conv);
    #ok(nextId);
  };

  /// Add members to a group; caller must be an admin of the group.
  public func addGroupMembers(
    conversations  : Conversations,
    conversationId : Nat,
    callerId       : Principal,
    memberIds      : [Principal],
  ) : Bool {
    switch (conversations.get(conversationId)) {
      case null { false };
      case (?c) {
        if (not c.isGroup) { return false };
        let isAdmin = c.adminIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
        if (not isAdmin) { return false };
        var updated = c.participantIds;
        for (m in memberIds.values()) {
          if (updated.find(func(p : Principal) : Bool { Principal.equal(p, m) }) == null) {
            updated := [m].concat(updated);
          };
        };
        conversations.add(conversationId, { c with participantIds = updated });
        true;
      };
    };
  };

  /// Remove a single member from a group; caller must be an admin.
  public func removeGroupMember(
    conversations  : Conversations,
    conversationId : Nat,
    callerId       : Principal,
    memberId       : Principal,
  ) : Bool {
    switch (conversations.get(conversationId)) {
      case null { false };
      case (?c) {
        if (not c.isGroup) { return false };
        let isAdmin = c.adminIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
        if (not isAdmin) { return false };
        let updated = c.participantIds.filter(func(p : Principal) : Bool { not Principal.equal(p, memberId) });
        conversations.add(conversationId, { c with participantIds = updated });
        true;
      };
    };
  };

  /// Let the caller leave a group conversation.
  public func leaveGroup(
    conversations  : Conversations,
    conversationId : Nat,
    callerId       : Principal,
  ) : Bool {
    switch (conversations.get(conversationId)) {
      case null { false };
      case (?c) {
        if (not c.isGroup) { return false };
        let updated = c.participantIds.filter(func(p : Principal) : Bool { not Principal.equal(p, callerId) });
        let newAdmins = c.adminIds.filter(func(p : Principal) : Bool { not Principal.equal(p, callerId) });
        conversations.add(conversationId, { c with participantIds = updated; adminIds = newAdmins });
        true;
      };
    };
  };

  /// Update group name or photo; caller must be an admin.
  public func updateGroupInfo(
    conversations  : Conversations,
    conversationId : Nat,
    callerId       : Principal,
    name           : ?Text,
    photoUrl       : ?Text,
  ) : Bool {
    switch (conversations.get(conversationId)) {
      case null { false };
      case (?c) {
        if (not c.isGroup) { return false };
        let isAdmin = c.adminIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
        if (not isAdmin) { return false };
        let newName = switch (name) { case null { c.groupName }; case (?n) { ?n } };
        let newPhoto = switch (photoUrl) { case null { c.groupPhotoUrl }; case (?u) { ?u } };
        conversations.add(conversationId, { c with groupName = newName; groupPhotoUrl = newPhoto });
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Stories logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Create a new story and return its id.
  public func postStory(
    stories     : Stories,
    nextId      : Nat,
    callerId    : Principal,
    mediaUrl    : ?Text,
    textContent : ?Text,
    now         : Int,
  ) : { #ok : Nat; #err : Text } {
    if (mediaUrl == null and textContent == null) {
      return #err("Story must have media or text");
    };
    let story : Types.Story = {
      id          = nextId;
      authorId    = callerId;
      mediaUrl;
      textContent;
      viewerIds   = [];
      createdAt   = now;
      expiresAt   = now + TWENTY_FOUR_HOURS_NS;
    };
    stories.add(nextId, story);
    #ok(nextId);
  };

  /// Return all stories that have not yet expired.
  public func getActiveStories(
    stories : Stories,
    now     : Int,
  ) : [Types.Story] {
    stories.values()
      .filter(func(s : Types.Story) : Bool { s.expiresAt > now })
      .toArray();
  };

  /// Record the caller as a viewer of the story; returns true on success.
  public func viewStory(
    stories  : Stories,
    storyId  : Nat,
    callerId : Principal,
  ) : Bool {
    switch (stories.get(storyId)) {
      case null { false };
      case (?s) {
        let alreadyViewed = s.viewerIds.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
        if (not alreadyViewed) {
          stories.add(storyId, { s with viewerIds = [callerId].concat(s.viewerIds) });
        };
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // User chat profile logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Retrieve or lazily create a profile for the caller.
  public func getOrCreateProfile(
    profiles : Profiles,
    userId   : Principal,
    now      : Int,
  ) : Types.UserChatProfile {
    switch (profiles.get(userId)) {
      case (?p) { p };
      case null {
        let refCode = makeReferralCode(userId);
        let profile : Types.UserChatProfile = {
          userId;
          username               = null;
          displayName            = "User";
          bio                    = null;
          city                   = null;
          profilePhotoUrl        = null;
          ghostModeEnabled       = false;
          studyModeEnabled       = false;
          studyModeSelectedChats = [];
          pointsBalance          = 0;
          referralCode           = refCode;
          referralCount          = 0;
          badge                  = #none;
          autoReply              = null;
          createdAt              = now;
        };
        profiles.add(userId, profile);
        profile;
      };
    };
  };

  /// Apply partial updates to the caller's profile.
  public func updateProfile(
    profiles        : Profiles,
    callerId        : Principal,
    displayName     : ?Text,
    bio             : ?Text,
    city            : ?Text,
    profilePhotoUrl : ?Text,
  ) : Bool {
    switch (profiles.get(callerId)) {
      case null { false };
      case (?p) {
        let newDisplayName = switch (displayName) { case null { p.displayName }; case (?n) { n } };
        let newBio         = switch (bio)          { case null { p.bio };         case (?b) { ?b } };
        let newCity        = switch (city)         { case null { p.city };        case (?c) { ?c } };
        let newPhoto       = switch (profilePhotoUrl) { case null { p.profilePhotoUrl }; case (?u) { ?u } };
        profiles.add(callerId, { p with displayName = newDisplayName; bio = newBio; city = newCity; profilePhotoUrl = newPhoto });
        true;
      };
    };
  };

  /// Toggle ghost mode on/off for the caller.
  public func setGhostMode(
    profiles : Profiles,
    callerId : Principal,
    enabled  : Bool,
  ) : Bool {
    switch (profiles.get(callerId)) {
      case null { false };
      case (?p) {
        profiles.add(callerId, { p with ghostModeEnabled = enabled });
        true;
      };
    };
  };

  /// Toggle study mode and save selected chat ids for the caller.
  public func setStudyMode(
    profiles      : Profiles,
    callerId      : Principal,
    enabled       : Bool,
    selectedChats : [Nat],
  ) : Bool {
    switch (profiles.get(callerId)) {
      case null { false };
      case (?p) {
        profiles.add(callerId, { p with studyModeEnabled = enabled; studyModeSelectedChats = selectedChats });
        true;
      };
    };
  };

  /// Update auto-reply configuration for the caller.
  public func setAutoReply(
    profiles : Profiles,
    callerId : Principal,
    enabled  : Bool,
    messages : [Text],
  ) : Bool {
    switch (profiles.get(callerId)) {
      case null { false };
      case (?p) {
        let ar : Types.AutoReply = { userId = callerId; isEnabled = enabled; messages };
        profiles.add(callerId, { p with autoReply = ?ar });
        true;
      };
    };
  };

  /// Full-text search over chat profiles by displayName / username.
  public func searchUsers(
    profiles     : Profiles,
    searchQuery  : Text,
  ) : [Types.UserChatProfile] {
    if (searchQuery == "") { return [] };
    let lower = searchQuery.toLower();
    profiles.values()
      .filter(func(p : Types.UserChatProfile) : Bool {
        let nameMatch = p.displayName.toLower().contains(#text lower);
        let usernameMatch = switch (p.username) {
          case null { false };
          case (?u) { u.toLower().contains(#text lower) };
        };
        nameMatch or usernameMatch;
      })
      .toArray();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Shortcuts logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Return global shortcuts plus the caller's personal shortcuts.
  public func getShortcuts(
    shortcuts : Shortcuts,
    callerId  : Principal,
  ) : [Types.ChatShortcut] {
    shortcuts.values()
      .filter(func(s : Types.ChatShortcut) : Bool {
        if (s.isGlobal) { return true };
        switch (s.createdBy) {
          case (#user(uid)) { Principal.equal(uid, callerId) };
          case (#admin)     { false };
        };
      })
      .toArray();
  };

  /// Add a personal shortcut for the caller and return its id.
  public func addPersonalShortcut(
    shortcuts : Shortcuts,
    nextId    : Nat,
    callerId  : Principal,
    trigger   : Text,
    content   : Text,
    category  : Text,
  ) : { #ok : Nat; #err : Text } {
    if (trigger == "") { return #err("Trigger cannot be empty") };
    let sc : Types.ChatShortcut = {
      id        = nextId;
      category  = categoryFromText(category);
      trigger;
      content;
      createdBy = #user(callerId);
      isGlobal  = false;
    };
    shortcuts.add(nextId, sc);
    #ok(nextId);
  };

  /// Delete a shortcut owned by the caller (or any shortcut if caller is admin).
  public func deleteShortcut(
    shortcuts : Shortcuts,
    id        : Nat,
    callerId  : Principal,
    isAdmin   : Bool,
  ) : Bool {
    switch (shortcuts.get(id)) {
      case null { false };
      case (?s) {
        let canDelete = isAdmin or (switch (s.createdBy) {
          case (#user(uid)) { Principal.equal(uid, callerId) };
          case (#admin)     { false };
        });
        if (canDelete) {
          shortcuts.remove(id);
          true;
        } else { false };
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Vault logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Store a new vault item and return its id.
  public func addVaultItem(
    vault      : Vault,
    nextId     : Nat,
    callerId   : Principal,
    mediaUrl   : Text,
    title      : Text,
    isViewOnce : Bool,
    expiresAt  : ?Int,
    now        : Int,
  ) : { #ok : Nat; #err : Text } {
    if (mediaUrl == "") { return #err("Media URL cannot be empty") };
    let item : Types.VaultItem = {
      id         = nextId;
      ownerId    = callerId;
      mediaUrl;
      title;
      isViewOnce;
      viewedAt   = null;
      expiresAt;
      createdAt  = now;
    };
    vault.add(nextId, item);
    #ok(nextId);
  };

  /// Return all vault items owned by the caller.
  public func getVaultItems(
    vault    : Vault,
    callerId : Principal,
  ) : [Types.VaultItem] {
    vault.values()
      .filter(func(v : Types.VaultItem) : Bool { Principal.equal(v.ownerId, callerId) })
      .toArray();
  };

  /// Retrieve a vault item; stamps viewedAt if it is view-once.
  public func viewVaultItem(
    vault    : Vault,
    id       : Nat,
    callerId : Principal,
    now      : Int,
  ) : ?Types.VaultItem {
    switch (vault.get(id)) {
      case null { null };
      case (?item) {
        if (not Principal.equal(item.ownerId, callerId)) { return null };
        if (item.isViewOnce and item.viewedAt == null) {
          let updated = { item with viewedAt = ?now };
          vault.add(id, updated);
          ?updated;
        } else { ?item };
      };
    };
  };

  /// Delete a vault item owned by the caller.
  public func deleteVaultItem(
    vault    : Vault,
    id       : Nat,
    callerId : Principal,
  ) : Bool {
    switch (vault.get(id)) {
      case null { false };
      case (?item) {
        if (not Principal.equal(item.ownerId, callerId)) { return false };
        vault.remove(id);
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Notes logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Create a new study note and return its id.
  public func saveNote(
    notes    : Notes,
    nextId   : Nat,
    callerId : Principal,
    title    : Text,
    content  : Text,
    subject  : Text,
    now      : Int,
  ) : { #ok : Nat; #err : Text } {
    if (title == "") { return #err("Title cannot be empty") };
    let note : Types.Note = {
      id        = nextId;
      ownerId   = callerId;
      title;
      content;
      subject;
      createdAt = now;
      updatedAt = now;
    };
    notes.add(nextId, note);
    #ok(nextId);
  };

  /// Return all notes owned by the caller.
  public func getNotes(
    notes    : Notes,
    callerId : Principal,
  ) : [Types.Note] {
    notes.values()
      .filter(func(n : Types.Note) : Bool { Principal.equal(n.ownerId, callerId) })
      .toArray();
  };

  /// Apply partial updates to a note owned by the caller.
  public func updateNote(
    notes    : Notes,
    id       : Nat,
    callerId : Principal,
    title    : ?Text,
    content  : ?Text,
    subject  : ?Text,
    now      : Int,
  ) : Bool {
    switch (notes.get(id)) {
      case null { false };
      case (?n) {
        if (not Principal.equal(n.ownerId, callerId)) { return false };
        let newTitle   = switch (title)   { case null { n.title };   case (?t) { t } };
        let newContent = switch (content) { case null { n.content }; case (?c) { c } };
        let newSubject = switch (subject) { case null { n.subject }; case (?s) { s } };
        notes.add(id, { n with title = newTitle; content = newContent; subject = newSubject; updatedAt = now });
        true;
      };
    };
  };

  /// Delete a note owned by the caller.
  public func deleteNote(
    notes    : Notes,
    id       : Nat,
    callerId : Principal,
  ) : Bool {
    switch (notes.get(id)) {
      case null { false };
      case (?n) {
        if (not Principal.equal(n.ownerId, callerId)) { return false };
        notes.remove(id);
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reward points logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Return the caller's reward points record, creating one if absent.
  public func getPoints(
    points   : Points,
    callerId : Principal,
  ) : Types.RewardPoints {
    switch (points.get(callerId)) {
      case (?p) { p };
      case null {
        let rp : Types.RewardPoints = { userId = callerId; totalPoints = 0; history = [] };
        points.add(callerId, rp);
        rp;
      };
    };
  };

  /// Append an award entry to the caller's points history.
  public func awardPoints(
    points : Points,
    userId : Principal,
    action : Text,
    amount : Nat,
    now    : Int,
  ) : Bool {
    let existing = switch (points.get(userId)) {
      case (?p) { p };
      case null { { userId; totalPoints = 0; history = [] } };
    };
    let entry : Types.PointsHistoryEntry = { action; points = amount; at = now };
    let updated : Types.RewardPoints = {
      userId;
      totalPoints = existing.totalPoints + amount;
      history     = [entry].concat(existing.history);
    };
    points.add(userId, updated);
    true;
  };

  /// Return top-N users sorted by total points descending.
  public func getLeaderboard(
    points   : Points,
    profiles : Profiles,
    topN     : Nat,
  ) : [Types.LeaderboardEntry] {
    let sorted = points.values()
      .toArray()
      .sort(func(a : Types.RewardPoints, b : Types.RewardPoints) : { #less; #equal; #greater } {
        Nat.compare(b.totalPoints, a.totalPoints)
      });
    let cap = if (topN == 0 or topN > sorted.size()) { sorted.size() } else { topN };
    Array.tabulate<Types.LeaderboardEntry>(cap, func(i) {
      let rp = sorted[i];
      let name = switch (profiles.get(rp.userId)) {
        case null { rp.userId.toText() };
        case (?p) { p.displayName };
      };
      { userId = rp.userId; displayName = name; points = rp.totalPoints };
    });
  };

  /// Process a referral signup: credit referrer and bump referral count.
  public func processReferral(
    profiles     : Profiles,
    points       : Points,
    referralCode : Text,
    newUserId    : Principal,
    pointsReward : Nat,
    now          : Int,
  ) : Bool {
    // Find profile with matching referral code
    let referrer = profiles.values().find(func(p : Types.UserChatProfile) : Bool { p.referralCode == referralCode });
    switch (referrer) {
      case null { false };
      case (?ref) {
        // Award points to referrer
        ignore awardPoints(points, ref.userId, "referral", pointsReward, now);
        // Increment referral count and update badge
        let newCount = ref.referralCount + 1;
        profiles.add(ref.userId, { ref with referralCount = newCount; badge = badgeFromCount(newCount) });
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Scheduled messages logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Queue a scheduled message and return its id.
  public func scheduleMessage(
    scheduled      : Scheduled,
    nextId         : Nat,
    callerId       : Principal,
    conversationId : Nat,
    content        : Text,
    scheduledAt    : Int,
  ) : { #ok : Nat; #err : Text } {
    if (content == "") { return #err("Content cannot be empty") };
    let msg : Types.ScheduledMessage = {
      id             = nextId;
      conversationId;
      senderId       = callerId;
      content;
      scheduledAt;
      status         = #pending;
    };
    scheduled.add(nextId, msg);
    #ok(nextId);
  };

  /// Return the caller's pending scheduled messages.
  public func getScheduledMessages(
    scheduled : Scheduled,
    callerId  : Principal,
  ) : [Types.ScheduledMessage] {
    scheduled.values()
      .filter(func(m : Types.ScheduledMessage) : Bool {
        Principal.equal(m.senderId, callerId) and m.status == #pending
      })
      .toArray();
  };

  /// Cancel a pending scheduled message owned by the caller.
  public func cancelScheduledMessage(
    scheduled : Scheduled,
    id        : Nat,
    callerId  : Principal,
  ) : Bool {
    switch (scheduled.get(id)) {
      case null { false };
      case (?m) {
        if (not Principal.equal(m.senderId, callerId)) { return false };
        if (m.status != #pending) { return false };
        scheduled.add(id, { m with status = #cancelled });
        true;
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup helpers
  // ─────────────────────────────────────────────────────────────────────────

  /// Delete all expired stories; returns the count removed.
  public func cleanupExpiredStories(
    stories : Stories,
    now     : Int,
  ) : Nat {
    let toRemove = stories.entries()
      .filter(func(kv : (Nat, Types.Story)) : Bool { kv.1.expiresAt <= now })
      .map(func(kv : (Nat, Types.Story)) : Nat { kv.0 })
      .toArray();
    for (id in toRemove.values()) {
      stories.remove(id);
    };
    toRemove.size();
  };

  /// Delete all expired vault items (view-once viewed + timer-expired); returns count.
  public func cleanupExpiredVaultItems(
    vault : Vault,
    now   : Int,
  ) : Nat {
    let toRemove = vault.entries()
      .filter(func(kv : (Nat, Types.VaultItem)) : Bool {
        let item = kv.1;
        // View-once already viewed
        let viewOnceDone = item.isViewOnce and item.viewedAt != null;
        // Timer expired
        let timerExpired = switch (item.expiresAt) {
          case null { false };
          case (?exp) { exp <= now };
        };
        viewOnceDone or timerExpired;
      })
      .map(func(kv : (Nat, Types.VaultItem)) : Nat { kv.0 })
      .toArray();
    for (id in toRemove.values()) {
      vault.remove(id);
    };
    toRemove.size();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Admin helpers
  // ─────────────────────────────────────────────────────────────────────────

  /// Compute aggregate chat statistics for the admin dashboard.
  public func computeStats(
    profiles      : Profiles,
    conversations : Conversations,
    messages      : Messages,
    stories       : Stories,
    now           : Int,
  ) : Types.ChatStats {
    {
      totalUsers    = profiles.size();
      activeChats   = conversations.size();
      totalMessages = messages.size();
      storiesPosted = stories.values().filter(func(s : Types.Story) : Bool { s.expiresAt > now }).toArray().size();
    };
  };

  /// Seed demo users, conversations, and messages for first-launch experience.
  public func seedDemoData(
    profiles      : Profiles,
    conversations : Conversations,
    messages      : Messages,
    stories       : Stories,
    shortcuts     : Shortcuts,
    nextIds       : {
      var profileId      : Nat;
      var conversationId : Nat;
      var messageId      : Nat;
      var storyId        : Nat;
      var shortcutId     : Nat;
    },
    now : Int,
  ) : Bool {
    // Demo principals (derived from well-known text IDs)
    let demoUsers : [(Text, Text)] = [
      ("aaaaa-aa", "Arjun"),
      ("2vxsx-fae", "Priya"),
      ("aaaaa-ab", "Rahul"),
      ("aaaaa-ac", "Sunita"),
      ("aaaaa-ad", "Vikram"),
    ];

    // Create demo profiles
    for ((pidText, name) in demoUsers.values()) {
      let pid = Principal.fromText(pidText);
      let refCode = "DEMO" # name.toUpper();
      let profile : Types.UserChatProfile = {
        userId                 = pid;
        username               = ?name.toLower();
        displayName            = name;
        bio                    = ?("Hi, I'm " # name);
        city                   = ?"India";
        profilePhotoUrl        = null;
        ghostModeEnabled       = false;
        studyModeEnabled       = false;
        studyModeSelectedChats = [];
        pointsBalance          = 100;
        referralCode           = refCode;
        referralCount          = 0;
        badge                  = #bronze;
        autoReply              = null;
        createdAt              = now;
      };
      profiles.add(pid, profile);
    };

    // Create 3 demo 1-to-1 conversations
    let p0 = Principal.fromText("aaaaa-aa");
    let p1 = Principal.fromText("2vxsx-fae");
    let p2 = Principal.fromText("aaaaa-ab");

    let conv1 : Types.Conversation = {
      id = nextIds.conversationId; participantIds = [p0, p1];
      lastMessageId = null; lastMessageAt = now; isGroup = false;
      groupName = null; groupPhotoUrl = null; adminIds = []; createdAt = now;
    };
    conversations.add(nextIds.conversationId, conv1);
    let cid1 = nextIds.conversationId;
    nextIds.conversationId += 1;

    let conv2 : Types.Conversation = {
      id = nextIds.conversationId; participantIds = [p0, p2];
      lastMessageId = null; lastMessageAt = now; isGroup = false;
      groupName = null; groupPhotoUrl = null; adminIds = []; createdAt = now;
    };
    conversations.add(nextIds.conversationId, conv2);
    let cid2 = nextIds.conversationId;
    nextIds.conversationId += 1;

    // Create demo group
    let p3 = Principal.fromText("aaaaa-ac");
    let conv3 : Types.Conversation = {
      id = nextIds.conversationId;
      participantIds = [p0, p1, p2, p3];
      lastMessageId = null; lastMessageAt = now; isGroup = true;
      groupName = ?"Digital Zindagi Chat";
      groupPhotoUrl = null; adminIds = [p0]; createdAt = now;
    };
    conversations.add(nextIds.conversationId, conv3);
    let cid3 = nextIds.conversationId;
    nextIds.conversationId += 1;

    // Add demo messages to conv1
    let msgs1 : [(Principal, Text)] = [
      (p0, "Namaste! Kya haal hai?"),
      (p1, "Sab theek hai, aap batao?"),
      (p0, "Main Digital Zindagi use kar raha hoon"),
      (p1, "Bahut accha app hai!"),
      (p0, "Haan, features bahut achhe hain"),
    ];
    for ((sender, text) in msgs1.values()) {
      let msg : Types.ChatMessage = {
        id = nextIds.messageId; conversationId = cid1; senderId = sender;
        content = text; messageType = #text; mediaUrl = null; replyToId = null;
        reactions = []; status = #read; isVanish = false; scheduledAt = null;
        createdAt = now; deletedForSenderAt = null; deletedForEveryoneAt = null;
        lockedFile = null; isLocked = false; lockPrice = null; lockCurrency = null; unlockedBy = [];
      };
      messages.add(nextIds.messageId, msg);
      nextIds.messageId += 1;
    };

    // Add demo messages to conv2
    let msgs2 : [(Principal, Text)] = [
      (p2, "Hello Arjun!"),
      (p0, "Hello Rahul bhai!"),
      (p2, "Kab milte hain?"),
      (p0, "Kal shaam ko?"),
      (p2, "Theek hai!"),
    ];
    for ((sender, text) in msgs2.values()) {
      let msg : Types.ChatMessage = {
        id = nextIds.messageId; conversationId = cid2; senderId = sender;
        content = text; messageType = #text; mediaUrl = null; replyToId = null;
        reactions = []; status = #delivered; isVanish = false; scheduledAt = null;
        createdAt = now; deletedForSenderAt = null; deletedForEveryoneAt = null;
        lockedFile = null; isLocked = false; lockPrice = null; lockCurrency = null; unlockedBy = [];
      };
      messages.add(nextIds.messageId, msg);
      nextIds.messageId += 1;
    };

    // Add demo global shortcuts
    let defaultShortcuts : [(Text, Text, Types.ShortcutCategory)] = [
      ("@greet", "Namaste! Kaise hain aap?", #greet),
      ("@bye", "Alvida! Phir milenge!", #greet),
      ("@busy", "Main abhi busy hoon, baad mein reply karunga.", #business),
      ("@thanks", "Bahut bahut shukriya!", #greet),
    ];
    for ((trigger, content, category) in defaultShortcuts.values()) {
      let sc : Types.ChatShortcut = {
        id = nextIds.shortcutId; category; trigger; content;
        createdBy = #admin; isGlobal = true;
      };
      shortcuts.add(nextIds.shortcutId, sc);
      nextIds.shortcutId += 1;
    };

    true;
  };
  // ─────────────────────────────────────────────────────────────────────────
  // Key-Locker logic
  // ─────────────────────────────────────────────────────────────────────────

  /// Send a message with a locked file attachment; returns (#ok newMessageId).
  public func sendLockedMessage(
    messages       : Messages,
    nextId         : Nat,
    conversationId : Nat,
    senderId       : Principal,
    fileUrl        : Text,
    lockType       : Types.LockType,
    passwordHash   : ?Text,
    task           : ?Types.LockedFileTask,
    now            : Int,
  ) : { #ok : Nat; #err : Text } {
    if (fileUrl == "") { return #err("File URL cannot be empty") };
    switch (lockType) {
      case (#password) {
        if (passwordHash == null) { return #err("Password hash required for password lock") };
      };
      case (#task) {
        if (task == null) { return #err("Task required for task lock") };
      };
      case (#none) {};
    };
    let lf : Types.LockedFile = {
      fileUrl;
      lockType;
      passwordHash;
      task;
      unlockedBy = [];
    };
    let msg : Types.ChatMessage = {
      id                   = nextId;
      conversationId;
      senderId;
      content              = "[Locked File]";
      messageType          = #file;
      mediaUrl             = null;
      replyToId            = null;
      reactions            = [];
      status               = #sent;
      isVanish             = false;
      scheduledAt          = null;
      createdAt            = now;
      deletedForSenderAt   = null;
      deletedForEveryoneAt = null;
      lockedFile           = ?lf;
      isLocked             = false;
      lockPrice            = null;
      lockCurrency         = null;
      unlockedBy           = [];
    };
    messages.add(nextId, msg);
    #ok(nextId);
  };

  /// Attempt to unlock a locked message for the caller.
  /// `attempt` is either the password hash or the task answer.
  public func unlockMessage(
    messages       : Messages,
    messageId      : Nat,
    callerId       : Principal,
    attempt        : Text,
  ) : { #ok : (); #err : Text } {
    switch (messages.get(messageId)) {
      case null { #err("Message not found") };
      case (?m) {
        switch (m.lockedFile) {
          case null { #err("Message is not locked") };
          case (?lf) {
            // Already unlocked for this user
            let alreadyUnlocked = lf.unlockedBy.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
            if (alreadyUnlocked) { return #ok(()) };
            // Verify the attempt
            let valid : Bool = switch (lf.lockType) {
              case (#none)     { true };
              case (#password) {
                switch (lf.passwordHash) {
                  case null     { false };
                  case (?hash)  { hash == attempt };
                };
              };
              case (#task) {
                switch (lf.task) {
                  case null    { false };
                  case (?t)    { t.answer.toLower() == attempt.toLower() };
                };
              };
            };
            if (not valid) { return #err("Incorrect unlock attempt") };
            // Record caller as unlocked
            let updatedLf : Types.LockedFile = { lf with unlockedBy = [callerId].concat(lf.unlockedBy) };
            messages.add(messageId, { m with lockedFile = ?updatedLf });
            #ok(());
          };
        };
      };
    };
  };

  /// Return the file URL only if the caller has unlocked it (or is the sender).
  public func getLockedFileUrl(
    messages  : Messages,
    messageId : Nat,
    callerId  : Principal,
  ) : ?Text {
    switch (messages.get(messageId)) {
      case null { null };
      case (?m) {
        switch (m.lockedFile) {
          case null { m.mediaUrl };
          case (?lf) {
            let isSender    = Principal.equal(m.senderId, callerId);
            let isUnlocked  = lf.unlockedBy.find(func(p : Principal) : Bool { Principal.equal(p, callerId) }) != null;
            let noLock      = lf.lockType == #none;
            if (isSender or isUnlocked or noLock) { ?lf.fileUrl } else { null };
          };
        };
      };
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Pay-to-Unlock — Payments state type and helpers
  // ─────────────────────────────────────────────────────────────────────────

  public type Payments = Map.Map<Nat, Types.LockedMessagePayment>;

  /// Create a pay-to-unlock message (isLocked = true). Returns (#ok id).
  public func createPayToUnlockMessage(
    messages       : Messages,
    nextId         : Nat,
    conversationId : Nat,
    senderId       : Principal,
    content        : Text,
    lockPrice      : Nat,
    currency       : Text,
    now            : Int,
  ) : { #ok : Nat; #err : Text } {
    if (content == "") { return #err("Content cannot be empty") };
    let msg : Types.ChatMessage = {
      id                   = nextId;
      conversationId;
      senderId;
      content;
      messageType          = #locked;
      mediaUrl             = null;
      replyToId            = null;
      reactions            = [];
      status               = #sent;
      isVanish             = false;
      scheduledAt          = null;
      createdAt            = now;
      deletedForSenderAt   = null;
      deletedForEveryoneAt = null;
      lockedFile           = null;
      isLocked             = true;
      lockPrice            = ?lockPrice;
      lockCurrency         = ?currency;
      unlockedBy           = [];
    };
    messages.add(nextId, msg);
    #ok(nextId);
  };

  /// Record a new pending payment for a locked message. Returns the payment id.
  public func createUnlockPayment(
    payments  : Payments,
    nextId    : Nat,
    messageId : Nat,
    buyerId   : Principal,
    creatorId : Principal,
    amount    : Nat,
    currency  : Text,
    now       : Int,
  ) : Nat {
    let payment : Types.LockedMessagePayment = {
      id                    = nextId;
      messageId             = messageId.toText();
      buyerId;
      creatorId;
      amount;
      currency;
      stripePaymentIntentId = null;
      upiTxnRef             = null;
      status                = #pending;
      createdAt             = now;
      unlockedAt            = null;
    };
    payments.add(nextId, payment);
    nextId;
  };

  /// Attach a Stripe PaymentIntent id to an existing payment record.
  public func attachStripeIntent(
    payments          : Payments,
    paymentId         : Nat,
    paymentIntentId   : Text,
  ) : Bool {
    switch (payments.get(paymentId)) {
      case null { false };
      case (?p) {
        payments.add(paymentId, { p with stripePaymentIntentId = ?paymentIntentId });
        true;
      };
    };
  };

  /// Attach a UPI transaction reference to an existing payment record.
  public func attachUpiRef(
    payments  : Payments,
    paymentId : Nat,
    upiTxnRef : Text,
  ) : Bool {
    switch (payments.get(paymentId)) {
      case null { false };
      case (?p) {
        payments.add(paymentId, { p with upiTxnRef = ?upiTxnRef });
        true;
      };
    };
  };

  /// Mark a payment as completed and unlock the message for the buyer.
  public func completeUnlock(
    messages  : Messages,
    payments  : Payments,
    paymentId : Nat,
    buyerId   : Principal,
    now       : Int,
  ) : { #ok; #err : Text } {
    switch (payments.get(paymentId)) {
      case null { #err("Payment not found") };
      case (?p) {
        if (p.status == #completed) { return #ok };
        payments.add(paymentId, { p with status = #completed; unlockedAt = ?now });
        // Unlock the message for the buyer
        let msgIdOpt = Nat.fromText(p.messageId);
        switch (msgIdOpt) {
          case null {};
          case (?msgId) {
            switch (messages.get(msgId)) {
              case null {};
              case (?m) {
                let alreadyUnlocked = m.unlockedBy.find(func(u : Principal) : Bool { Principal.equal(u, buyerId) }) != null;
                if (not alreadyUnlocked) {
                  messages.add(msgId, { m with unlockedBy = [buyerId].concat(m.unlockedBy) });
                };
              };
            };
          };
        };
        #ok;
      };
    };
  };

  /// Mark a payment as failed.
  public func failUnlock(
    payments  : Payments,
    paymentId : Nat,
  ) : Bool {
    switch (payments.get(paymentId)) {
      case null { false };
      case (?p) {
        payments.add(paymentId, { p with status = #failed });
        true;
      };
    };
  };

  /// Return earnings summary for a creator principal.
  public func getCreatorEarnings(
    payments  : Payments,
    creatorId : Principal,
  ) : Types.CreatorEarningsSummary {
    let creatorPayments = payments.values()
      .filter(func(p : Types.LockedMessagePayment) : Bool {
        Principal.equal(p.creatorId, creatorId)
      })
      .toArray();
    var totalEarnings  = 0;
    var pendingPayouts = 0;
    for (p in creatorPayments.values()) {
      if (p.status == #completed) {
        totalEarnings += p.amount;
      } else if (p.status == #pending) {
        pendingPayouts += p.amount;
      };
    };
    { totalEarnings; pendingPayouts; payments = creatorPayments };
  };

  /// Return all pending UPI unlock requests (for admin approval).
  public func getPendingUpiUnlocks(payments : Payments) : [Types.LockedMessagePayment] {
    payments.values()
      .filter(func(p : Types.LockedMessagePayment) : Bool {
        p.status == #pending and p.upiTxnRef != null
      })
      .toArray();
  };

};



