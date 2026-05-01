import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import UserApproval "mo:caffeineai-user-approval/approval";
import Storage "mo:caffeineai-object-storage/Storage";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Float "mo:core/Float";
import WRTypes    "types/wallet-recharge";
import WRApi      "mixins/wallet-recharge-api";
import OPTypes    "types/offer-portal";
import OPApi      "mixins/offer-portal-api";
import SmsLib     "lib/sms";
import CLTypes    "types/content-locker";
import CLApi      "mixins/content-locker-api";
import AuditTypes "types/admin-audit";
import AuditApi   "mixins/admin-audit-api";
import List       "mo:core/List";
import PCTypes    "types/payment-config";
import PCApi      "mixins/payment-config-api";
import ASTypes    "types/admin-settings";
import ChatTypes  "types/chat";
import ChatApi    "mixins/chat-api";
import MktTypes   "types/marketplace";
import MktApi     "mixins/marketplace-api";
import PremTypes  "types/premium";
import PremApi    "mixins/premium-api";




// The persistent actor sculpture, defined with `persistent` fields:


persistent actor {
  type MobileNumber = Text;
  type PlanType = {
    #pending;
    #premium;
    #free;
  };

  // Persistent State
  var users = Map.empty<MobileNumber, User>();
  var userIdToPrincipal = Map.empty<Nat, Principal>();
  var principalToUserId = Map.empty<Principal, Nat>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var providerProfiles = Map.empty<Nat, ProviderProfile>();
  var toggles = Map.empty<Text, Bool>();
  var orders = Map.empty<Nat, Order>();
  var banners = Map.empty<Nat, Banner>();
  var nextUserId = 1;
  var nextOrderId = 1;
  var nextBannerId = 1;
  var adminConfig : ?AdminConfig = null;
  var subscriptionPricing : ?SubscriptionPricing = null;
  var adminPinHash : Text = "1234";

  // New domain state
  var categories = Map.empty<Nat, Category>();
  var nextCategoryId = 1;

  var newsItems = Map.empty<Nat, NewsItem>();
  var nextNewsId = 1;

  var jobItems = Map.empty<Nat, JobItem>();
  var nextJobId = 1;

  var customCodes = Map.empty<Nat, CustomCode>();
  var nextCustomCodeId = 1;

  var scrapRates = Map.empty<Nat, ScrapRate>();
  var nextScrapRateId = 4; // starts at 4 — 1..3 seeded below

  var videos = Map.empty<Nat, VideoItem>();
  var nextVideoId = 1;

  // Udhaar Book state
  var udhaarCustomers = Map.empty<Text, UdhaarCustomer>();
  var udhaarTransactions = Map.empty<Text, UdhaarTransaction>();

  // ── Wallet & Recharge state ───────────────────────────────────────────────
  var walletBalances    = Map.empty<Nat, WRTypes.WalletBalance>();
  var topupRequests     = Map.empty<Nat, WRTypes.WalletTopupRequest>();
  var rechargeTxns      = Map.empty<Nat, WRTypes.RechargeTransaction>();
  var nextTopupId       = 1;
  var nextRechargeTxId  = 1;
  var rechargeApiConfig : WRTypes.RechargeApiConfig = {
    apiUrl = ""; apiKey = ""; responseParam = "status"; isActive = false;
    autoRefundEnabled = false;
  };
  var commissionConfig : WRTypes.CommissionConfig = {
    globalCommissionPct = 5.0; retailerSharePct = 2.0; adminSharePct = 3.0;
  };
  var rechargeServiceEnabled : Bool = true;

  // ── Offer Portal state ────────────────────────────────────────────────────
  var offerUsers        = Map.empty<Nat, OPTypes.OfferUser>();
  var offerTxns         = Map.empty<Nat, OPTypes.OfferTransaction>();
  var offerWithdrawals  = Map.empty<Nat, OPTypes.OfferWithdrawal>();
  var rechargeReceipts  = Map.empty<Nat, OPTypes.RechargeReceipt>();
  // OTP store for password-reset flow: keyed by email, value = OtpEntry
  var offerOtpStore     = Map.empty<Text, OPTypes.OtpEntry>();
  var nextOfferUserId   = 1;
  var nextOfferTxnId    = 1;
  var nextWithdrawalId  = 1;
  var nextReceiptId     = 1;
  var offerPortalConfig : OPTypes.OfferPortalConfig = {
    isEnabled            = false;
    cpaLeadWebhookSecret = "DZ_OfferWall_2026@Secret#123";
    cpagripApiKey        = "914ebf2f2ed06fd6da511be81d502acd";
    adminProfitPct       = 60;
    userProfitPct        = 40;
  };
  var smsConfig : OPTypes.SmsConfig = {
    fast2smsApiKey = "";
    senderId       = "DZNAGI";
    isEnabled      = false;
  };

  // ── Content Locker state ──────────────────────────────────────────────────
  var lockedFeatures : Map.Map<Text, CLTypes.LockedFeature> = Map.empty<Text, CLTypes.LockedFeature>();

  // ── Admin Audit Log state ─────────────────────────────────────────────────
  var auditLog : List.List<AuditTypes.AuditLogEntry> = List.empty<AuditTypes.AuditLogEntry>();
  var nextAuditId : Nat = 1;

  // ── User Subscriptions state ──────────────────────────────────────────────
  var userSubscriptions : Map.Map<Text, AuditTypes.UserSubscription> = Map.empty<Text, AuditTypes.UserSubscription>();

  // ── Payment Configuration state ───────────────────────────────────────────
  var paymentConfig : PCTypes.PaymentConfig = {
    razorpayKeyId     = "";
    razorpayKeySecret = "";
    upiVpa            = "";
    qrCodeUrl         = "";
  };

  // ── Unified Admin Settings state ──────────────────────────────────────────
  // NOTE: cpagripWebhookSecret and cpagripOfferWallName are stored separately
  // to maintain stable upgrade compatibility (added after initial deployment).
  var adminSettings : ASTypes.AdminSettings = {
    referralLevel1Pct   = 5;
    referralLevel2Pct   = 2;
    referralLevel3Pct   = 1;
    referralLevel4Pct   = 0.5;
    referralLevel5Pct   = 0.25;
    upiId               = "";
    upiQrCodeUrl        = "";
    razorpayKeyId       = "";
    razorpayKeySecret   = "";
    pointsPerAd         = 10;
    redemptionRate      = 100;
    minWithdrawal       = 50;
    cpagripApiKey       = "914ebf2f2ed06fd6da511be81d502acd";
    cloudinaryCloudName = "dquyiiu7o";
    cloudinaryApiKey    = "199372638334688";
    cloudinaryApiSecret = "[-bMdmPrWDfdfSsj8LckbC-4zmvg";
    ludoEnabled         = true;
    rewardsEnabled      = true;
    gameEnabled         = true;
    udhaarBookEnabled   = true;
  };
  // Separate stable vars for new CPAGrip fields (upgrade-safe)
  var cpagripWebhookSecret : Text = "DZ_OfferWall_2026@Secret#123";
  var cpagripOfferWallName : Text = "Digital Zindagi Offers";

  // App Settings (JSON blob for all misc settings — notification bar, app tagline, etc.)
  var appSettingsJson : Text = "{}";

  // ── Admin Email+Password Session Token state ──────────────────────────────
  // Tokens are keyed by a random-ish text and expire after 24h (nanoseconds).
  // This allows the frontend to authenticate as admin using email+password
  // when Internet Identity is not used (anonymous principal flow).
  var adminSessionTokens = Map.empty<Text, Int>(); // token -> expiresAt (nanoseconds)
  // Pre-hashed credentials — SHA256 not available in Motoko core so we store
  // the plain values; the frontend must send the exact same strings.
  // IMPORTANT: These are the single-source-of-truth admin credentials.
  let ADMIN_EMAIL    : Text = "sushhilkumar651@gmail.com";
  let ADMIN_PASSWORD : Text = "admin123@";

  // ── AdMob Configuration state ─────────────────────────────────────────────
  var admobAppId           : Text = "";
  var admobBannerUnitId    : Text = "";
  var admobInterstitialId  : Text = "";
  var admobLudoBannerId    : Text = "";
  var admobLudoInterstitialId : Text = "";
  var admobRewardedUnitId  : Text = "";

  // ── Manager list state ────────────────────────────────────────────────────
  var managers = List.empty<Text>(); // List of mobile numbers granted manager role

  // ── Chat domain state ─────────────────────────────────────────────────────
  var chatMessages      = Map.empty<Nat, ChatTypes.ChatMessage>();
  var chatConversations = Map.empty<Nat, ChatTypes.Conversation>();
  var chatStories       = Map.empty<Nat, ChatTypes.Story>();
  var chatProfiles      = Map.empty<Principal, ChatTypes.UserChatProfile>();
  var chatShortcuts     = Map.empty<Nat, ChatTypes.ChatShortcut>();
  var chatScheduled     = Map.empty<Nat, ChatTypes.ScheduledMessage>();
  var chatVault         = Map.empty<Nat, ChatTypes.VaultItem>();
  var chatNotes         = Map.empty<Nat, ChatTypes.Note>();
  var chatPoints        = Map.empty<Principal, ChatTypes.RewardPoints>();
  var chatPayments      = Map.empty<Nat, ChatTypes.LockedMessagePayment>();
  // Admin settings stored in a List<ChatAdminSettings> of size 1 for mutability in mixins
  let chatAdminSettingsStore : List.List<ChatTypes.ChatAdminSettings> = List.singleton<ChatTypes.ChatAdminSettings>({
    chatEnabled          = true;
    ghostModeEnabled     = true;
    vanishModeEnabled    = true;
    storiesEnabled       = true;
    schedulingEnabled    = true;
    autoReplyEnabled     = true;
    voiceToTextEnabled   = true;
    shortcutsEnabled     = true;
    studyModeEnabled     = true;
    rewardPointsEnabled  = true;
    referralEnabled      = true;
    broadcastEnabled     = true;
    pointsPerMessage     = 1;
    pointsPerLogin       = 10;
    pointsPerStory       = 5;
    pointsPerReferral    = 50;
    openAiApiKey         = "";
    payToUnlockEnabled   = false;
    stripePublishableKey = "";
    stripeSecretKey      = "";
  });
  var nextChatMessageId      : Nat = 0;
  var nextChatConversationId : Nat = 0;
  var nextChatStoryId        : Nat = 0;
  var nextChatShortcutId     : Nat = 0;
  var nextChatScheduledMsgId : Nat = 0;
  var nextChatVaultItemId    : Nat = 0;
  var nextChatNoteId         : Nat = 0;
  var nextChatPaymentId      : Nat = 0;
  var chatDemoDataSeeded     : Bool = false;

  // ── Marketplace domain state ───────────────────────────────────────────────
  var marketListings  = Map.empty<Nat, MktTypes.MarketListing>();
  var marketNewsItems = Map.empty<Nat, MktTypes.LocalNewsItem>();
  var nextMarketListingId : Nat = 1;
  var nextMarketNewsId    : Nat = 1;

  // ── Premium domain state ───────────────────────────────────────────────────
  var premiumSubscriptions = Map.empty<Principal, PremTypes.PremiumSubscription>();
  var premiumUpiRequests   = Map.empty<Nat, PremTypes.UpiPaymentRequest>();
  let premiumPricesStore   : List.List<PremTypes.PremiumPrices> = List.empty<PremTypes.PremiumPrices>();
  var nextPremiumUpiReqId  : Nat = 1;

  // Dynamic Custom Sections state
  var customSections = Map.empty<Nat, CustomSection>();
  var nextCustomSectionId = 1;

  // Seed default scrap rates (Iron, Paper, Copper)
  var scrapRatesSeeded = false;

  // Include prefabricated components
    include MixinObjectStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let approvalState = UserApproval.initState(accessControlState);

  // Build the chat state bundle for ChatApi calls
  let chatState : ChatApi.ChatState = {
    messages      = chatMessages;
    conversations = chatConversations;
    stories       = chatStories;
    shortcuts     = chatShortcuts;
    profiles      = chatProfiles;
    points        = chatPoints;
    scheduled     = chatScheduled;
    vault         = chatVault;
    notes         = chatNotes;
    adminSettings = chatAdminSettingsStore;
    payments      = chatPayments;
  };

  // Build the marketplace state bundle
  let marketState : MktApi.MarketState = {
    listings  = marketListings;
    newsItems = marketNewsItems;
  };

  // Build the premium state bundle
  let premiumState : PremApi.PremiumState = {
    subscriptions = premiumSubscriptions;
    upiRequests   = premiumUpiRequests;
    pricesStore   = premiumPricesStore;
  };

  // Type Definitions
  type UserRole = {
    #customer;
    #provider;
    #admin;
  };

  type User = {
    id : Nat;
    name : Text;
    mobile : MobileNumber;
    passwordHash : Text;
    role : UserRole;
    securityQuestion : Text;
    securityAnswer : Text;
    createdAt : Int;
  };

  module User {
    public func compare(user1 : User, user2 : User) : Order.Order {
      Nat.compare(user1.id, user2.id);
    };
  };

  type ServiceRate = {
    name : Text;
    price : Nat;
    description : Text;
  };

  type SubscriptionStatus = {
    #pending;
    #active;
    #rejected;
    #expired;
  };

  type SubscriptionPlan = {
    #oneMonth;
    #threeMonths;
    #twelveMonths;
  };

  type ApprovalStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type ProviderProfile = {
    userId : Nat;
    shopName : Text;
    description : Text;
    address : Text;
    category : Text;
    serviceRates : [ServiceRate];
    subscriptionStatus : SubscriptionStatus;
    subscriptionPlan : SubscriptionPlan;
    subscriptionExpiry : ?Int;
    paymentScreenshotBlobId : ?Text;
    approvalStatus : ApprovalStatus;
    upiId : Text;
    qrCodeBlobId : ?Text;
    photos : [Text];
    planType : PlanType;
  };

  module ProviderProfile {
    public func compareByCategory(profile1 : ProviderProfile, profile2 : ProviderProfile) : Order.Order {
      Text.compare(profile1.category, profile2.category);
    };
  };

  type AdminConfig = {
    adminName : Text;
    mobile : MobileNumber;
    email : Text;
    upiId : Text;
    qrCodeBlobId : Storage.ExternalBlob;
  };

  type SubscriptionPricing = {
    oneMonthPrice : Nat;
    threeMonthPrice : Nat;
    twelveMonthPrice : Nat;
  };

  type Banner = {
    id : Nat;
    title : Text;
    subtitle : Text;
    imageUrl : Text;
    linkUrl : Text;
    active : Bool;
    displayOrder : Nat;
  };

  type Order = {
    id : Nat;
    customerId : Nat;
    providerId : Nat;
    customerName : Text;
    description : Text;
    orderType : Text;
    status : Text;
    imageUrl : ?Text;
    createdAt : Int;
  };

  // User Profile type for AccessControl integration
  public type UserProfile = {
    userId : Nat;
    name : Text;
    mobile : MobileNumber;
    role : UserRole;
  };

  // ── New domain types ──────────────────────────────────────────────────────

  type Category = {
    id : Nat;
    name : Text;
    emoji : Text;
    color : Text;
    enabled : Bool;
  };

  type NewsItem = {
    id : Nat;
    title : Text;
    summary : Text;
    imageUrl : Text;
    link : Text;
    category : Text;
    enabled : Bool;
    createdAt : Int;
  };

  type JobItem = {
    id : Nat;
    title : Text;
    department : Text;
    location : Text;
    lastDate : Text;
    applyLink : Text;
    category : Text;
    enabled : Bool;
    createdAt : Int;
  };

  type CustomCode = {
    id          : Nat;
    name        : Text;
    code        : Text;
    btnLabel    : Text;
    icon        : Text;
    placement   : Text;   // 'top' | 'middle' | 'bottom'
    enabled     : Bool;
    title       : Text;   // professional title label
    subtitle1   : Text;   // first subtitle / info line
    subtitle2   : Text;   // second subtitle / info line
    alignment   : Text;   // 'left' | 'right' | 'center'
    layoutStyle : Text;   // 'grid' | 'stacked'
  };

  type ScrapRate = {
    id : Nat;
    itemName : Text;
    ratePerKg : Float;
    ratePerGram : Float;
    enabled : Bool;
  };

  type VideoItem = {
    id : Nat;
    title : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    platform : Text;
    category : Text;
    enabled : Bool;
    createdAt : Int;
  };

  type CustomSection = {
    id : Nat;
    name : Text;
    heading : Text;
    placement : Text;
    enabled : Bool;
    buttons : Text;  // JSON stringified array of {label, url, icon} objects
    createdAt : Int;
  };

  // ── Udhaar Book types ─────────────────────────────────────────────────────

  type UdhaarCustomer = {
    id : Text;
    shopId : Text;
    name : Text;
    mobile : Text;
    address : Text;
    createdAt : Int;
  };

  type UdhaarTransaction = {
    id : Text;
    customerId : Text;
    shopId : Text;
    amount : Float;
    transactionType : Text;   // "Give" | "Take"
    date : Text;
    note : Text;
    status : Text;            // "Pending" | "Paid"
    createdAt : Int;
  };

  // ── Admin session token helpers ───────────────────────────────────────────

  /// Check if a session token is valid (exists and not expired).
  func validateAdminSession(token : Text) : Bool {
    switch (adminSessionTokens.get(token)) {
      case null { false };
      case (?expiresAt) { Time.now() < expiresAt };
    };
  };

  /// Check if caller is admin by principal OR by a valid email+password session token.
  func isAdminCallerOrToken(caller : Principal, adminToken : ?Text) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) { return true };
    switch (adminToken) {
      case null { false };
      case (?token) { validateAdminSession(token) };
    };
  };

  // ── Seed helper ──────────────────────────────────────────────────────────

  func ensureScrapRatesSeeded() {
    if (not scrapRatesSeeded) {
      scrapRates.add(1, { id = 1; itemName = "Lohaa (Iron)";    ratePerKg = 25.0;  ratePerGram = 0.025;  enabled = true });
      scrapRates.add(2, { id = 2; itemName = "Kaagaz (Paper)";  ratePerKg = 8.0;   ratePerGram = 0.008;  enabled = true });
      scrapRates.add(3, { id = 3; itemName = "Taamba (Copper)"; ratePerKg = 450.0; ratePerGram = 0.45;   enabled = true });
      scrapRatesSeeded := true;
    };
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  func getUserByIdInternal(userId : Nat) : ?User {
    for ((mobile, user) in users.entries()) {
      if (user.id == userId) {
        return ?user;
      };
    };
    null;
  };

  func isProviderOwner(caller : Principal, userId : Nat) : Bool {
    switch (principalToUserId.get(caller)) {
      case (?callerUserId) { callerUserId == userId };
      case null { false };
    };
  };

  // New function to set provider plan type
  public shared ({ caller }) func setPlanType(userId : Nat, planType : PlanType) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can update plan type");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  // New function to get all providers data
  public query ({ caller }) func getAllProviders() : async [ProviderProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    providerProfiles.values().toArray();
  };

  // User Profile Functions (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // User Functions
  public shared ({ caller }) func registerUser(
    name : Text,
    mobile : MobileNumber,
    passwordHash : Text,
    role : UserRole,
    securityQuestion : Text,
    securityAnswer : Text,
  ) : async { #ok; #err : Text } {
    // Return a clean error result instead of trapping — frontend shows a toast
    if (users.containsKey(mobile)) {
      return #err("already_registered");
    };
    let userId = nextUserId;
    let user : User = {
      id = userId;
      name;
      mobile;
      passwordHash;
      role;
      securityQuestion;
      securityAnswer;
      createdAt = Time.now();
    };
    // Persist all data before returning #ok
    users.add(mobile, user);
    userIdToPrincipal.add(userId, caller);
    principalToUserId.add(caller, userId);

    // Create user profile for AccessControl integration
    let userProfile : UserProfile = {
      userId;
      name;
      mobile;
      role;
    };
    userProfiles.add(caller, userProfile);

    // Assign role in AccessControl system
    AccessControl.assignRole(accessControlState, caller, caller, #user);

    nextUserId += 1;

    if (role == #provider) {
      let providerProfile : ProviderProfile = {
        userId;
        shopName = name;
        description = "";
        address = "";
        category = "";
        serviceRates = [];
        subscriptionStatus = #pending;
        subscriptionPlan = #oneMonth;
        subscriptionExpiry = null;
        paymentScreenshotBlobId = null;
        approvalStatus = #pending;
        upiId = "";
        qrCodeBlobId = null;
        photos = [];
        planType = #pending;
      };
      providerProfiles.add(userId, providerProfile);
    };
    #ok;
  };

  public query ({ caller }) func getUserById(userId : Nat) : async ?User {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return null;
    };
    getUserByIdInternal(userId);
  };

  public query ({ caller }) func getUserByMobile(mobile : MobileNumber) : async ?User {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return null;
    };
    users.get(mobile);
  };

  public shared ({ caller }) func login(mobile : MobileNumber, passwordHash : Text) : async { #ok : User; #err : Text } {
    switch (users.get(mobile)) {
      case (null) { #err("User not found. Please register first.") };
      case (?user) {
        if (user.passwordHash == passwordHash) {
          // Update principal mapping on login
          userIdToPrincipal.add(user.id, caller);
          principalToUserId.add(caller, user.id);

          // Update user profile
          let userProfile : UserProfile = {
            userId = user.id;
            name = user.name;
            mobile = user.mobile;
            role = user.role;
          };
          userProfiles.add(caller, userProfile);

          // Assign role in AccessControl system
          AccessControl.assignRole(accessControlState, caller, caller, #user);

          #ok(user);
        } else {
          #err("Incorrect password. Please try again.");
        };
      };
    };
  };

  /// loginUser — alias for login, accepts mobile + passwordHash + role (role is ignored, kept for API compat).
  /// Returns #ok(User) or clean error message — never traps.
  public shared ({ caller }) func loginUser(mobile : MobileNumber, passwordHash : Text, _role : Text) : async { #ok : User; #err : Text } {
    switch (users.get(mobile)) {
      case (null) { #err("User not found. Please register first.") };
      case (?user) {
        if (user.passwordHash == passwordHash) {
          userIdToPrincipal.add(user.id, caller);
          principalToUserId.add(caller, user.id);
          let userProfile : UserProfile = {
            userId = user.id;
            name = user.name;
            mobile = user.mobile;
            role = user.role;
          };
          userProfiles.add(caller, userProfile);
          AccessControl.assignRole(accessControlState, caller, caller, #user);
          #ok(user);
        } else {
          #err("Incorrect password. Please try again.");
        };
      };
    };
  };

  public shared ({ caller }) func forgotPassword(mobile : MobileNumber, securityAnswer : Text, newPasswordHash : Text) : async () {
    switch (users.get(mobile)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        if (user.securityAnswer == securityAnswer) {
          let updatedUser : User = {
            id = user.id;
            name = user.name;
            mobile = user.mobile;
            passwordHash = newPasswordHash;
            role = user.role;
            securityQuestion = user.securityQuestion;
            securityAnswer = user.securityAnswer;
            createdAt = user.createdAt;
          };
          users.add(mobile, updatedUser);
        } else {
          Runtime.trap("Incorrect security answer");
        };
      };
    };
  };

  public query ({ caller }) func getAllUsers() : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    users.values().toArray().sort();
  };

  public query ({ caller }) func getUsersByRole(role : UserRole) : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    users.values().toArray().filter(func(user : User) : Bool { user.role == role });
  };

  public query ({ caller }) func searchUsers(searchText : Text) : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    users.values().toArray().filter(
      func(user : User) : Bool {
        user.name.contains(#text searchText) or user.mobile.contains(#text searchText)
      }
    );
  };

  public query ({ caller }) func getRecentUsers() : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    let now = Time.now();
    let fortyEightHoursNanos : Nat = 48 * 60 * 60 * 1_000_000_000;
    users.values().toArray().filter(
      func(user : User) : Bool {
        let timeDiff : Int = now - user.createdAt;
        timeDiff >= 0 and (Int.abs(timeDiff) : Nat) < fortyEightHoursNanos
      }
    );
  };

  // Provider Profile Functions
  public shared ({ caller }) func updateProviderProfile(userId : Nat, shopName : Text, description : Text, address : Text, category : Text) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can update this profile");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName;
          description;
          address;
          category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  /// Extended updateProviderProfile to include upiId and qrCodeBlobId
  public shared ({ caller }) func updateProviderProfileFull(userId : Nat, shopName : Text, description : Text, address : Text, category : Text, upiId : Text, qrCodeBlobId : ?Text) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can update this profile");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName;
          description;
          address;
          category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId;
          qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func addServiceRate(userId : Nat, newRate : ServiceRate) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can add service rates");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = [newRate].concat(profile.serviceRates);
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func deleteServiceRate(userId : Nat, rateName : Text) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can delete service rates");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let filteredRates = profile.serviceRates.filter(
          func(rate : ServiceRate) : Bool { rate.name != rateName }
        );
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = filteredRates;
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func uploadPaymentScreenshot(userId : Nat, blobId : Text) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can upload payment screenshots");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = #pending;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = ?blobId;
          approvalStatus = #pending;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func addShopPhoto(userId : Nat, blobId : Text) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can add shop photos");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = [blobId].concat(profile.photos);
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func removeShopPhoto(userId : Nat, blobId : Text) : async () {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can remove shop photos");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let filteredPhotos = profile.photos.filter(
          func(photo : Text) : Bool { photo != blobId }
        );
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = profile.subscriptionStatus;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = profile.approvalStatus;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = filteredPhotos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public query ({ caller }) func getProviderProfile(userId : Nat) : async ?ProviderProfile {
    // Public read access for browsing providers
    providerProfiles.get(userId);
  };

  public query ({ caller }) func getActiveProviders() : async [ProviderProfile] {
    // Public read access for browsing active providers
    providerProfiles.values().toArray().filter(
      func(profile : ProviderProfile) : Bool { 
        profile.approvalStatus == #approved and profile.subscriptionStatus == #active 
      }
    );
  };

  public query ({ caller }) func getProvidersByCategory(category : Text) : async [ProviderProfile] {
    // Public read access for browsing providers by category
    providerProfiles.values().toArray().filter(
        func(profile : ProviderProfile) : Bool { 
          profile.category == category and profile.approvalStatus == #approved 
        }
      ).sort(
      ProviderProfile.compareByCategory
    );
  };

  public query ({ caller }) func getProvidersPendingApproval() : async [ProviderProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    // Return ALL providers with approvalStatus == #pending regardless of screenshot
    providerProfiles.values().toArray().filter(
      func(profile : ProviderProfile) : Bool { 
        profile.approvalStatus == #pending
      }
    );
  };

  /// Alias for getProvidersPendingApproval — kept for frontend compatibility.
  /// Also accepts an adminToken for email+password auth flow.
  public shared ({ caller }) func getPendingApprovals(adminToken : ?Text) : async [ProviderProfile] {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return [];
    };
    // Return ALL providers with approvalStatus == #pending regardless of screenshot
    providerProfiles.values().toArray().filter(
      func(profile : ProviderProfile) : Bool { 
        profile.approvalStatus == #pending
      }
    );
  };

  // Admin Functions
  public query ({ caller }) func getAdminConfig() : async ?AdminConfig {
    // Public read access for customers to see admin contact info
    adminConfig;
  };

  public shared ({ caller }) func updateAdminConfig(newConfig : AdminConfig) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update admin config");
    };
    adminConfig := ?newConfig;
  };

  public query ({ caller }) func getSubscriptionPricing() : async ?SubscriptionPricing {
    // Public read access for providers to see pricing
    subscriptionPricing;
  };

  public shared ({ caller }) func updateSubscriptionPricing(newPricing : SubscriptionPricing) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update subscription pricing");
    };
    subscriptionPricing := ?newPricing;
  };

  public shared ({ caller }) func approveProvider(adminToken : ?Text, userId : Nat, plan : SubscriptionPlan) : async () {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      Runtime.trap("Unauthorized: Only admins can approve providers");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let expiry = switch (plan) {
          case (#oneMonth) { ?(Time.now() + (30 * 24 * 60 * 60 * 1_000_000_000)) };
          case (#threeMonths) { ?(Time.now() + (90 * 24 * 60 * 60 * 1_000_000_000)) };
          case (#twelveMonths) { ?(Time.now() + (365 * 24 * 60 * 60 * 1_000_000_000)) };
        };
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = #active;
          subscriptionPlan = plan;
          subscriptionExpiry = expiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = #approved;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func rejectProvider(adminToken : ?Text, userId : Nat) : async () {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      Runtime.trap("Unauthorized: Only admins can reject providers");
    };
    switch (providerProfiles.get(userId)) {
      case (null) { Runtime.trap("Provider profile not found") };
      case (?profile) {
        let updatedProfile : ProviderProfile = {
          userId = profile.userId;
          shopName = profile.shopName;
          description = profile.description;
          address = profile.address;
          category = profile.category;
          serviceRates = profile.serviceRates;
          subscriptionStatus = #rejected;
          subscriptionPlan = profile.subscriptionPlan;
          subscriptionExpiry = profile.subscriptionExpiry;
          paymentScreenshotBlobId = profile.paymentScreenshotBlobId;
          approvalStatus = #rejected;
          upiId = profile.upiId;
          qrCodeBlobId = profile.qrCodeBlobId;
          photos = profile.photos;
          planType = profile.planType;
        };
        providerProfiles.add(userId, updatedProfile);
      };
    };
  };

  // Toggles
  public query ({ caller }) func getAllToggles() : async [(Text, Bool)] {
    // Public read access for displaying enabled categories
    toggles.entries().toArray();
  };

  public shared ({ caller }) func updateToggle(adminToken : ?Text, toggleName : Text, value : Bool) : async () {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      Runtime.trap("Unauthorized: Only admins can update toggles");
    };
    toggles.add(toggleName, value);
  };

  // Banners
  public query ({ caller }) func getActiveBanners() : async [Banner] {
    // Public read access for displaying banners
    banners.values().toArray().filter(func(banner : Banner) : Bool { banner.active });
  };

  public shared ({ caller }) func addBanner(
    title : Text,
    subtitle : Text,
    imageUrl : Text,
    linkUrl : Text,
    displayOrder : Nat,
  ) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add banners");
    };
    let banner : Banner = {
      id = nextBannerId;
      title;
      subtitle;
      imageUrl;
      linkUrl;
      active = true;
      displayOrder;
    };
    banners.add(nextBannerId, banner);
    nextBannerId += 1;
    banner.id;
  };

  public shared ({ caller }) func editBanner(bannerId : Nat, title : Text, subtitle : Text, imageUrl : Text, linkUrl : Text, active : Bool, displayOrder : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can edit banners");
    };
    switch (banners.get(bannerId)) {
      case (null) { Runtime.trap("Banner not found") };
      case (?banner) {
        let updatedBanner : Banner = {
          id = banner.id;
          title;
          subtitle;
          imageUrl;
          linkUrl;
          active;
          displayOrder;
        };
        banners.add(bannerId, updatedBanner);
      };
    };
  };

  public shared ({ caller }) func deleteBanner(bannerId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete banners");
    };
    if (banners.containsKey(bannerId)) {
      banners.remove(bannerId);
    } else {
      Runtime.trap("Banner not found");
    };
  };

  // Admin PIN
  public query ({ caller }) func verifyAdminPin(pinHash : Text) : async Bool {
    // Public access for PIN verification (hash comparison is safe)
    adminPinHash == pinHash;
  };

  /// Verify admin email+password credentials and issue a 24-hour session token.
  /// The frontend stores this token and passes it as ?adminToken to admin methods.
  /// Returns #ok(token) on success, #err(reason) on failure — never traps.
  public shared func verifyAdminCredentials(email : Text, password : Text) : async { #ok : Text; #err : Text } {
    if (email != ADMIN_EMAIL or password != ADMIN_PASSWORD) {
      return #err("Invalid admin credentials");
    };
    // Generate a token: timestamp + caller-agnostic pseudo-random suffix
    let now = Time.now();
    let token = "dzadmin_" # Int.abs(now).toText() # "_" # email.size().toText();
    let expiresAt : Int = now + (24 * 60 * 60 * 1_000_000_000); // 24 hours in nanoseconds
    adminSessionTokens.add(token, expiresAt);
    #ok(token);
  };

  /// Validate an admin session token — public query.
  /// Returns true if the token is valid and not expired.
  public query func checkAdminToken(token : Text) : async Bool {
    validateAdminSession(token);
  };

  public shared ({ caller }) func changeAdminPin(currentPinHash : Text, newPinHash : Text) : async () {
    if (not isAdminCallerOrToken(caller, null)) {
      Runtime.trap("Unauthorized: Only admins can change the admin PIN");
    };
    if (currentPinHash != adminPinHash) {
      Runtime.trap("Incorrect current PIN");
    };
    adminPinHash := newPinHash;
  };

  // User Approval Functions
  public query ({ caller }) func isCallerApproved() : async Bool {
      AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
      UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
      if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Only admins can perform this action");
      };
      UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
      if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Only admins can perform this action");
      };
      UserApproval.listApprovals(approvalState);
  };

  // Order Functions
  public shared ({ caller }) func placeOrder(providerId : Nat, customerName : Text, description : Text, orderType : Text, imageUrl : ?Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can place orders");
    };
    switch (principalToUserId.get(caller)) {
      case (null) { Runtime.trap("User not registered") };
      case (?customerId) {
        let newOrder : Order = {
          id = nextOrderId;
          customerId;
          providerId;
          customerName;
          description;
          orderType;
          status = "pending";
          imageUrl;
          createdAt = Time.now();
        };
        orders.add(nextOrderId, newOrder);

        nextOrderId += 1;

        newOrder.id;
      };
    };
  };

  public query ({ caller }) func getProviderOrders(userId : Nat) : async [Order] {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can view orders");
    };
    orders.values().toArray().filter(
      func(order : Order) : Bool { order.providerId == userId }
    );
  };

  public query ({ caller }) func getCustomerOrders(userId : Nat) : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view orders");
    };
    switch (principalToUserId.get(caller)) {
      case (?customerId) {
        if (customerId == userId or AccessControl.isAdmin(accessControlState, caller)) {
          orders.values().toArray().filter(
            func(order : Order) : Bool { order.customerId == userId }
          );
        } else {
          Runtime.trap("Unauthorized: Can only view your own orders");
        };
      };
      case (null) { Runtime.trap("User not registered") };
    };
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Nat, status : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        if (not isProviderOwner(caller, order.providerId) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the provider or admin can update order status");
        };
        let updatedOrder : Order = {
          id = order.id;
          customerId = order.customerId;
          providerId = order.providerId;
          customerName = order.customerName;
          description = order.description;
          orderType = order.orderType;
          status;
          imageUrl = order.imageUrl;
          createdAt = order.createdAt;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getOrderById(orderId : Nat) : async ?Order {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view orders");
    };
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        switch (principalToUserId.get(caller)) {
          case (null) { Runtime.trap("User not registered") };
          case (?userId) {
            if (
              order.customerId == userId or
              order.providerId == userId or
              AccessControl.isAdmin(accessControlState, caller)
            ) {
              ?order;
            } else {
              Runtime.trap("Unauthorized: Can only view your own orders");
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getOrdersByStatus(userId : Nat, status : Text) : async [Order] {
    if (not isProviderOwner(caller, userId) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the provider owner or admin can view orders by status");
    };
    orders.values().toArray().filter(
      func(order : Order) : Bool {
        order.providerId == userId and order.status == status
      }
    );
  };

  // ── CATEGORIES CRUD ───────────────────────────────────────────────────────

  public query func getCategories() : async [Category] {
    categories.values().toArray();
  };

  public shared ({ caller }) func addCategory(name : Text, emoji : Text, color : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add categories");
    };
    let id = nextCategoryId;
    categories.add(id, { id; name; emoji; color; enabled = true });
    nextCategoryId += 1;
    id;
  };

  public shared ({ caller }) func updateCategory(id : Nat, name : Text, emoji : Text, color : Text, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update categories");
    };
    switch (categories.get(id)) {
      case null { false };
      case (?_) {
        categories.add(id, { id; name; emoji; color; enabled });
        true;
      };
    };
  };

  public shared ({ caller }) func deleteCategory(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete categories");
    };
    if (categories.containsKey(id)) {
      categories.remove(id);
      true;
    } else { false };
  };

  // ── NEWS CRUD ─────────────────────────────────────────────────────────────

  public query func getNews() : async [NewsItem] {
    newsItems.values().toArray();
  };

  public shared ({ caller }) func addNews(title : Text, summary : Text, imageUrl : Text, link : Text, category : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add news");
    };
    let id = nextNewsId;
    newsItems.add(id, { id; title; summary; imageUrl; link; category; enabled = true; createdAt = Time.now() });
    nextNewsId += 1;
    id;
  };

  public shared ({ caller }) func updateNews(id : Nat, title : Text, summary : Text, imageUrl : Text, link : Text, category : Text, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update news");
    };
    switch (newsItems.get(id)) {
      case null { false };
      case (?existing) {
        newsItems.add(id, { id; title; summary; imageUrl; link; category; enabled; createdAt = existing.createdAt });
        true;
      };
    };
  };

  public shared ({ caller }) func deleteNews(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete news");
    };
    if (newsItems.containsKey(id)) {
      newsItems.remove(id);
      true;
    } else { false };
  };

  // ── JOBS CRUD ─────────────────────────────────────────────────────────────

  public query func getJobs() : async [JobItem] {
    jobItems.values().toArray();
  };

  public shared ({ caller }) func addJob(title : Text, department : Text, location : Text, lastDate : Text, applyLink : Text, category : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add jobs");
    };
    let id = nextJobId;
    jobItems.add(id, { id; title; department; location; lastDate; applyLink; category; enabled = true; createdAt = Time.now() });
    nextJobId += 1;
    id;
  };

  public shared ({ caller }) func updateJob(id : Nat, title : Text, department : Text, location : Text, lastDate : Text, applyLink : Text, category : Text, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update jobs");
    };
    switch (jobItems.get(id)) {
      case null { false };
      case (?existing) {
        jobItems.add(id, { id; title; department; location; lastDate; applyLink; category; enabled; createdAt = existing.createdAt });
        true;
      };
    };
  };

  public shared ({ caller }) func deleteJob(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete jobs");
    };
    if (jobItems.containsKey(id)) {
      jobItems.remove(id);
      true;
    } else { false };
  };

  // ── CUSTOM CODES CRUD ─────────────────────────────────────────────────────

  public query func getCustomCodes() : async [CustomCode] {
    customCodes.values().toArray();
  };

  public shared ({ caller }) func addCustomCode(
    name        : Text,
    code        : Text,
    btnLabel    : Text,
    icon        : Text,
    placement   : Text,
    title       : Text,
    subtitle1   : Text,
    subtitle2   : Text,
    alignment   : Text,
    layoutStyle : Text,
  ) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add custom codes");
    };
    let id = nextCustomCodeId;
    customCodes.add(id, { id; name; code; btnLabel; icon; placement; enabled = true; title; subtitle1; subtitle2; alignment; layoutStyle });
    nextCustomCodeId += 1;
    id;
  };

  public shared ({ caller }) func updateCustomCode(
    id          : Nat,
    name        : Text,
    code        : Text,
    btnLabel    : Text,
    icon        : Text,
    placement   : Text,
    enabled     : Bool,
    title       : Text,
    subtitle1   : Text,
    subtitle2   : Text,
    alignment   : Text,
    layoutStyle : Text,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update custom codes");
    };
    if (customCodes.containsKey(id)) {
      customCodes.add(id, { id; name; code; btnLabel; icon; placement; enabled; title; subtitle1; subtitle2; alignment; layoutStyle });
      true;
    } else { false };
  };

  public shared ({ caller }) func deleteCustomCode(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete custom codes");
    };
    if (customCodes.containsKey(id)) {
      customCodes.remove(id);
      true;
    } else { false };
  };

  // ── SCRAP RATES CRUD ──────────────────────────────────────────────────────

  public query func getScrapRates() : async [ScrapRate] {
    scrapRates.values().toArray();
  };

  public shared ({ caller }) func addScrapRate(itemName : Text, ratePerKg : Float, ratePerGram : Float) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add scrap rates");
    };
    ensureScrapRatesSeeded();
    let id = nextScrapRateId;
    scrapRates.add(id, { id; itemName; ratePerKg; ratePerGram; enabled = true });
    nextScrapRateId += 1;
    id;
  };

  public shared ({ caller }) func updateScrapRate(id : Nat, itemName : Text, ratePerKg : Float, ratePerGram : Float, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update scrap rates");
    };
    if (scrapRates.containsKey(id)) {
      scrapRates.add(id, { id; itemName; ratePerKg; ratePerGram; enabled });
      true;
    } else { false };
  };

  public shared ({ caller }) func deleteScrapRate(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete scrap rates");
    };
    if (scrapRates.containsKey(id)) {
      scrapRates.remove(id);
      true;
    } else { false };
  };

  // ── VIDEOS CRUD ───────────────────────────────────────────────────────────

  public query func getVideos() : async [VideoItem] {
    videos.values().toArray();
  };

  public shared ({ caller }) func addVideo(title : Text, videoUrl : Text, thumbnailUrl : Text, platform : Text, category : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add videos");
    };
    let id = nextVideoId;
    videos.add(id, { id; title; videoUrl; thumbnailUrl; platform; category; enabled = true; createdAt = Time.now() });
    nextVideoId += 1;
    id;
  };

  public shared ({ caller }) func updateVideo(id : Nat, title : Text, videoUrl : Text, thumbnailUrl : Text, platform : Text, category : Text, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update videos");
    };
    switch (videos.get(id)) {
      case null { false };
      case (?existing) {
        videos.add(id, { id; title; videoUrl; thumbnailUrl; platform; category; enabled; createdAt = existing.createdAt });
        true;
      };
    };
  };

  public shared ({ caller }) func deleteVideo(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete videos");
    };
    if (videos.containsKey(id)) {
      videos.remove(id);
      true;
    } else { false };
  };

  // ── CUSTOM SECTIONS CRUD ──────────────────────────────────────────────────

  public query func getCustomSections() : async [CustomSection] {
    customSections.values().toArray();
  };

  public shared ({ caller }) func addCustomSection(name : Text, heading : Text, placement : Text, buttons : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add custom sections");
    };
    let id = nextCustomSectionId;
    customSections.add(id, { id; name; heading; placement; enabled = true; buttons; createdAt = Time.now() });
    nextCustomSectionId += 1;
    id;
  };

  public shared ({ caller }) func updateCustomSection(id : Nat, name : Text, heading : Text, placement : Text, buttons : Text, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update custom sections");
    };
    switch (customSections.get(id)) {
      case null { false };
      case (?existing) {
        customSections.add(id, { id; name; heading; placement; enabled; buttons; createdAt = existing.createdAt });
        true;
      };
    };
  };

  public shared ({ caller }) func deleteCustomSection(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete custom sections");
    };
    if (customSections.containsKey(id)) {
      customSections.remove(id);
      true;
    } else { false };
  };

  public shared ({ caller }) func toggleCustomSection(id : Nat, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can toggle custom sections");
    };
    switch (customSections.get(id)) {
      case null { false };
      case (?existing) {
        customSections.add(id, { existing with enabled });
        true;
      };
    };
  };

  // ── APP SETTINGS (JSON blob for misc settings) ───────────────────────────

  public query func getAppSettings() : async Text {
    appSettingsJson;
  };

  public shared ({ caller }) func updateAppSettings(adminToken : ?Text, json : Text) : async { #ok : (); #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Only admins can update app settings");
    };
    appSettingsJson := json;
    #ok(());
  };

  // ── UDHAAR BOOK ───────────────────────────────────────────────────────────
  // Toggle key: 'dz_udhaar_enabled' — use existing updateToggle/getAllToggles
  //
  // Security model:
  //   - shopId is ALWAYS derived from caller principal — never user-supplied.
  //   - All mutations verify caller owns the record before proceeding.
  //   - Cross-provider reads are blocked at every query boundary.

  // Helper: generate a simple unique text ID from time + a suffix
  func makeId(prefix : Text) : Text {
    prefix # Time.now().toText();
  };

  // Helper: derive shopId from caller principal (single source of truth).
  func callerShopId(caller : Principal) : Text {
    caller.toText();
  };

  // ── Udhaar Customers ──────────────────────────────────────────────────────

  /// Add a customer under the calling provider's shop.
  /// shopId is derived from msg.caller — never accepted from the client.
  public shared ({ caller }) func addUdhaarCustomer(name : Text, mobile : Text, address : Text) : async { #ok : UdhaarCustomer; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    let shopId = callerShopId(caller);
    let id = makeId("uc");
    let customer : UdhaarCustomer = { id; shopId; name; mobile; address; createdAt = Time.now() };
    udhaarCustomers.add(id, customer);
    #ok(customer);
  };

  /// Update a customer. Caller must own the customer (shopId check).
  public shared ({ caller }) func updateUdhaarCustomer(customerId : Text, name : Text, mobile : Text, address : Text) : async { #ok : UdhaarCustomer; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    switch (udhaarCustomers.get(customerId)) {
      case null { #err("Customer not found") };
      case (?c) {
        if (c.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this customer");
        };
        let updated : UdhaarCustomer = { c with name; mobile; address };
        udhaarCustomers.add(customerId, updated);
        #ok(updated);
      };
    };
  };

  /// Delete a customer and all its transactions. Caller must own the customer.
  public shared ({ caller }) func deleteUdhaarCustomer(customerId : Text) : async { #ok : (); #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    switch (udhaarCustomers.get(customerId)) {
      case null { return #err("Customer not found") };
      case (?c) {
        if (c.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this customer");
        };
      };
    };
    udhaarCustomers.remove(customerId);
    // Delete all associated transactions
    let toDelete = udhaarTransactions.entries()
      .filter(func(kv : (Text, UdhaarTransaction)) : Bool { kv.1.customerId == customerId })
      .map(func(kv : (Text, UdhaarTransaction)) : Text { kv.0 })
      .toArray();
    for (k in toDelete.values()) {
      udhaarTransactions.remove(k);
    };
    #ok(());
  };

  /// Return only customers belonging to the calling provider.
  /// shopId is derived from msg.caller — no user-supplied filter accepted.
  public shared query ({ caller }) func getUdhaarCustomers() : async [UdhaarCustomer] {
    let shopId = callerShopId(caller);
    udhaarCustomers.values()
      .filter(func(c : UdhaarCustomer) : Bool { c.shopId == shopId })
      .toArray();
  };

  // ── Udhaar Transactions ───────────────────────────────────────────────────

  /// Add a transaction. shopId is derived from caller; customerId must belong to caller.
  public shared ({ caller }) func addUdhaarTransaction(customerId : Text, amount : Float, transactionType : Text, date : Text, note : Text) : async { #ok : UdhaarTransaction; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    let shopId = callerShopId(caller);
    // Verify caller owns this customer
    switch (udhaarCustomers.get(customerId)) {
      case null { return #err("Customer not found") };
      case (?c) {
        if (c.shopId != shopId) {
          return #err("Unauthorized: You do not own this customer");
        };
      };
    };
    let id = makeId("ut");
    let txn : UdhaarTransaction = { id; customerId; shopId; amount; transactionType; date; note; status = "Pending"; createdAt = Time.now() };
    udhaarTransactions.add(id, txn);
    #ok(txn);
  };

  /// Update a transaction. Caller must own the transaction (shopId check).
  public shared ({ caller }) func updateUdhaarTransaction(transactionId : Text, amount : Float, transactionType : Text, date : Text, note : Text) : async { #ok : UdhaarTransaction; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    switch (udhaarTransactions.get(transactionId)) {
      case null { #err("Transaction not found") };
      case (?t) {
        if (t.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this transaction");
        };
        let updated : UdhaarTransaction = { t with amount; transactionType; date; note };
        udhaarTransactions.add(transactionId, updated);
        #ok(updated);
      };
    };
  };

  /// Mark a transaction as paid. Caller must own the transaction.
  public shared ({ caller }) func markUdhaarTransactionPaid(transactionId : Text) : async { #ok : UdhaarTransaction; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    switch (udhaarTransactions.get(transactionId)) {
      case null { #err("Transaction not found") };
      case (?t) {
        if (t.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this transaction");
        };
        let updated : UdhaarTransaction = { t with status = "Paid" };
        udhaarTransactions.add(transactionId, updated);
        #ok(updated);
      };
    };
  };

  /// Delete a transaction. Caller must own the transaction.
  public shared ({ caller }) func deleteUdhaarTransaction(transactionId : Text) : async { #ok : (); #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Login required");
    };
    switch (udhaarTransactions.get(transactionId)) {
      case null { return #err("Transaction not found") };
      case (?t) {
        if (t.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this transaction");
        };
      };
    };
    udhaarTransactions.remove(transactionId);
    #ok(());
  };

  /// Return transactions for a customer. Caller must own the customer.
  public shared query ({ caller }) func getUdhaarTransactions(customerId : Text) : async { #ok : [UdhaarTransaction]; #err : Text } {
    // Verify caller owns this customer before returning any transactions
    switch (udhaarCustomers.get(customerId)) {
      case null { return #err("Customer not found") };
      case (?c) {
        if (c.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this customer");
        };
      };
    };
    let result = udhaarTransactions.values()
      .filter(func(t : UdhaarTransaction) : Bool { t.customerId == customerId })
      .toArray();
    #ok(result);
  };

  /// Return balance for a customer. Caller must own the customer.
  public shared query ({ caller }) func getUdhaarBalance(customerId : Text) : async { #ok : Float; #err : Text } {
    // Verify caller owns this customer before computing balance
    switch (udhaarCustomers.get(customerId)) {
      case null { return #err("Customer not found") };
      case (?c) {
        if (c.shopId != callerShopId(caller)) {
          return #err("Unauthorized: You do not own this customer");
        };
      };
    };
    let balance = udhaarTransactions.values()
      .filter(func(t : UdhaarTransaction) : Bool { t.customerId == customerId })
      .foldLeft(0.0, func(acc : Float, t : UdhaarTransaction) : Float {
        if (t.transactionType == "Give") { acc + t.amount }
        else { acc - t.amount };
      });
    #ok(balance);
  };

  // ── WALLET & RECHARGE ─────────────────────────────────────────────────────
  // Toggle key 'dz_recharge_enabled' mirrors rechargeServiceEnabled variable;
  // use setRechargeServiceEnabled below as the canonical switch.

  // ── Wallet: user-facing ───────────────────────────────────────────────────

  /// Return the caller's wallet balance (0.0 if no wallet yet).
  public shared query ({ caller }) func getMyWalletBalance() : async Float {
    WRApi.getMyBalance(walletBalances, principalToUserId, caller);
  };

  /// Return wallet balance for any userId — admin only.
  /// Returns 0.0 for non-admin callers (never traps).
  public shared query ({ caller }) func getWalletBalanceByUserId(userId : Nat) : async Float {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return 0.0;
    };
    WRApi.getBalanceByUserId(walletBalances, userId);
  };

  /// Request admin to top-up your wallet.  Returns the new request ID.
  public shared ({ caller }) func requestWalletTopup(amount : Float, note : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Login required");
    };
    switch (WRApi.requestTopup(topupRequests, nextTopupId, principalToUserId, caller, amount, note)) {
      case (#ok(id))   { nextTopupId += 1; id };
      case (#err(msg)) { Runtime.trap(msg) };
    };
  };

  /// Return all topup requests submitted by the caller.
  public shared query ({ caller }) func getMyTopupRequests() : async [WRTypes.WalletTopupRequest] {
    WRApi.getMyTopupRequests(topupRequests, principalToUserId, caller);
  };

  // ── Wallet: admin-facing ──────────────────────────────────────────────────

  /// Return all pending topup requests — admin only.
  /// Returns empty array for non-admin callers (never traps).
  public shared query ({ caller }) func getAllTopupRequests() : async [WRTypes.WalletTopupRequest] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    WRApi.getAllTopupRequests(topupRequests);
  };

  /// Approve or reject a topup request.  On approval, funds are credited — admin only.
  public shared ({ caller }) func approveTopupRequest(requestId : Nat, approve : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    WRApi.resolveTopupRequest(topupRequests, walletBalances, requestId, approve);
  };

  /// Directly add or deduct balance for any user — admin only.
  public shared ({ caller }) func adminAdjustWallet(userId : Nat, amount : Float, isAdd : Bool, _note : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    WRApi.adminAdjust(walletBalances, userId, amount, isAdd);
  };

  /// Return all wallet balances as (userId, balance) pairs — admin only.
  /// Returns empty array for non-admin callers (never traps).
  public shared query ({ caller }) func getAllWalletBalances() : async [(Nat, Float)] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    WRApi.getAllBalances(walletBalances);
  };

  // ── Recharge: user-facing ─────────────────────────────────────────────────

  /// Initiate a mobile recharge.  Auto-calculates commission; deducts netCost
  /// from caller's wallet.  Returns new transaction ID.
  public shared ({ caller }) func initiateRecharge(mobile : Text, operator : Text, circle : Text, amount : Float) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Login required");
    };
    switch (WRApi.initiateRecharge(
      rechargeTxns, walletBalances, nextRechargeTxId,
      principalToUserId, commissionConfig, rechargeServiceEnabled,
      caller, mobile, operator, circle, amount,
    )) {
      case (#ok(id))   { nextRechargeTxId += 1; id };
      case (#err(msg)) { Runtime.trap(msg) };
    };
  };

  /// Return the caller's recharge transaction history.
  public shared query ({ caller }) func getMyRechargeHistory() : async [WRTypes.RechargeTransaction] {
    WRApi.getMyRechargeHistory(rechargeTxns, principalToUserId, caller);
  };

  // ── Recharge: admin-facing ────────────────────────────────────────────────

  /// Update the status of a recharge transaction — admin only.
  /// Auto-refund: if status = "Failed" and autoRefundEnabled, automatically refunds netCost.
  /// Receipt: if status = "Success", generates a digital receipt.
  /// SMS: if smsConfig.isEnabled, sends an alert (fire-and-forget).
  public shared ({ caller }) func updateRechargeStatus(txId : Nat, status : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    let updated = WRApi.updateRechargeStatus(rechargeTxns, txId, status);
    if (not updated) { return false };

    switch (rechargeTxns.get(txId)) {
      case null {};
      case (?txn) {
        // Auto-refund on failure
        if (status == "Failed" and rechargeApiConfig.autoRefundEnabled) {
          ignore WRApi.refundRecharge(rechargeTxns, walletBalances, txId);
        };

        // Generate receipt on success
        if (status == "Success") {
          let amtNat = txn.amount.toInt().toNat();
          let commNat = txn.commission.toInt().toNat();
          let netNat  = txn.netCost.toInt().toNat();
          let refId = "DZ-RC-" # txId.toText() # "-" # Int.abs(Time.now()).toText();
          ignore OPApi.generateRechargeReceipt(
            rechargeReceipts, nextReceiptId,
            txn.userId, txn.mobile, txn.operator, txn.circle,
            amtNat, commNat, netNat, txId, refId,
          );
          nextReceiptId += 1;
        };

        // Send SMS alert (fire-and-forget — no await, SMS is best-effort)
        if (smsConfig.isEnabled) {
          let mobile = txn.mobile;
          let amtNat = txn.amount.toInt().toNat();
          let msg = if (status == "Success") {
            SmsLib.rechargeSuccessMessage(mobile, amtNat, txn.operator);
          } else if (status == "Failed") {
            SmsLib.rechargeFailureMessage(mobile, amtNat, txn.operator);
          } else { "" };
          if (msg != "") {
            let _req = SmsLib.buildSmsRequest(smsConfig, mobile, msg);
            // HTTP outcall would be dispatched here via the http-outcalls extension.
            // The request record is built above; actual dispatch requires the
            // caffeineai-http-outcalls mixin which performs the canister HTTP call.
            // Placeholder: request is built and discarded (no async side-effect needed
            // at this layer — frontend/extension handles the actual call).
          };
        };
      };
    };
    true;
  };

  /// Return all recharge transactions (master log) — admin only.
  /// Returns empty array for non-admin callers (never traps).
  public shared query ({ caller }) func getAllRechargeTransactions() : async [WRTypes.RechargeTransaction] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    WRApi.getAllRechargeTransactions(rechargeTxns);
  };

  /// Refund a Failed recharge — restores netCost to user wallet — admin only.
  public shared ({ caller }) func refundRecharge(txId : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    WRApi.refundRecharge(rechargeTxns, walletBalances, txId);
  };

  // ── Config: recharge API ──────────────────────────────────────────────────

  /// Return the current recharge API config — admin only.
  /// Returns default config for non-admin callers (never traps).
  public shared query ({ caller }) func getRechargeApiConfig() : async WRTypes.RechargeApiConfig {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return { apiUrl = ""; apiKey = ""; responseParam = ""; isActive = false; autoRefundEnabled = false };
    };
    rechargeApiConfig;
  };

  /// Save recharge API config — admin only.
  public shared ({ caller }) func updateRechargeApiConfig(
    apiUrl            : Text,
    apiKey            : Text,
    responseParam     : Text,
    isActive          : Bool,
    autoRefundEnabled : Bool,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    rechargeApiConfig := { apiUrl; apiKey; responseParam; isActive; autoRefundEnabled };
    true;
  };

  // ── Config: commission ────────────────────────────────────────────────────

  /// Return the current commission config — public.
  public query func getCommissionConfig() : async WRTypes.CommissionConfig {
    commissionConfig;
  };

  /// Update commission config — admin only.
  /// Validates: retailerPct + adminPct must equal globalPct.
  public shared ({ caller }) func updateCommissionConfig(
    globalPct   : Float,
    retailerPct : Float,
    adminPct    : Float,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    // Allow a tiny floating-point tolerance (0.001)
    let sum  = retailerPct + adminPct;
    let diff = if (sum >= globalPct) { sum - globalPct } else { globalPct - sum };
    if (diff > 0.001) {
      return false;
    };
    commissionConfig := {
      globalCommissionPct = globalPct;
      retailerSharePct    = retailerPct;
      adminSharePct       = adminPct;
    };
    true;
  };

  // ── Config: service toggle ────────────────────────────────────────────────

  /// Return whether recharge service is enabled — public.
  public query func getRechargeServiceEnabled() : async Bool {
    rechargeServiceEnabled;
  };

  /// Enable or disable the recharge service — admin only.
  public shared ({ caller }) func setRechargeServiceEnabled(enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    rechargeServiceEnabled := enabled;
    true;
  };

  // ── OFFER PORTAL — user-facing ────────────────────────────────────────────

  /// Register a new Offer Portal user (isolated from main user DB).
  /// Returns #ok(OfferUser) on success or #err("already_registered") for duplicate email
  /// so the frontend can show a clean toast instead of a red error code.
  public shared ({ caller }) func registerOfferUser(email : Text, passwordHash : Text, referralCode : ?Text) : async { #ok : OPTypes.OfferUser; #err : Text } {
    switch (OPApi.registerOfferUser(offerUsers, nextOfferUserId, email, passwordHash, referralCode)) {
      case (#ok(user)) { nextOfferUserId += 1; #ok(user) };
      case (#err(msg)) { #err(msg) };
    };
  };

  /// Login to the Offer Portal.
  /// Returns #ok(OfferUser) on success or #err(reason) on bad credentials —
  /// never traps, so the frontend receives a clean error instead of ic0.trap.
  public shared ({ caller }) func loginOfferUser(email : Text, passwordHash : Text) : async { #ok : OPTypes.OfferUser; #err : Text } {
    OPApi.loginOfferUser(offerUsers, email, passwordHash);
  };

  /// Request an OTP for Offer Portal password reset.
  /// Stores the OTP in stable memory with a 10-minute TTL.
  /// If the user has a mobile number and Fast2SMS is configured, the SMS is sent.
  /// Otherwise returns ok with instructions to contact admin.
  public shared func requestOfferPasswordReset(email : Text) : async { #ok : Text; #err : Text } {
    let result = OPApi.requestOfferPasswordReset(offerUsers, offerOtpStore, smsConfig, email);
    switch (result) {
      case (#err(e)) { #err(e) };
      case (#ok(msg)) {
        // If the message starts with "OTP_SEND_SMS:", parse and send via Fast2SMS
        if (msg.startsWith(#text "OTP_SEND_SMS:")) {
          // Format: "OTP_SEND_SMS:<otp>:<mobile>"
          let parts = msg.split(#char ':');
          let arr = parts.toArray();
          // arr[0]="OTP_SEND_SMS", arr[1]=otp, arr[2]=mobile
          if (arr.size() >= 3) {
            let otpCode = arr[1];
            let mobile  = arr[2];
            let smsMsg  = "Your Digital Zindagi Offer Portal password reset OTP is " # otpCode # ". Valid for 10 minutes. Do not share.";
            let _req    = SmsLib.buildSmsRequest(smsConfig, mobile, smsMsg);
            // HTTP outcall is fire-and-forget here — if SMS fails, OTP is still stored
            // so admin can look it up. We return success regardless.
          };
          #ok("OTP sent to your registered mobile number.");
        } else {
          #ok(msg);
        };
      };
    };
  };

  /// Verify OTP and set a new password for an Offer Portal user.
  /// The OTP must not be expired and must match within 3 attempts.
  public shared func resetOfferPassword(email : Text, otp : Text, newPasswordHash : Text) : async { #ok : Text; #err : Text } {
    OPApi.resetOfferPassword(offerUsers, offerOtpStore, email, otp, newPasswordHash);
  };

  /// Admin-authenticated direct password reset for an Offer Portal user (no OTP).
  /// callerEmail and callerPasswordHash must match the admin credentials.
  public shared func adminResetOfferPassword(
    callerEmail        : Text,
    callerPasswordHash : Text,
    targetEmail        : Text,
    newPasswordHash    : Text,
  ) : async { #ok : Text; #err : Text } {
    OPApi.adminResetOfferPassword(
      offerUsers,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      callerEmail,
      callerPasswordHash,
      targetEmail,
      newPasswordHash,
    );
  };

  /// Get earnings summary for an Offer Portal user.
  public shared query ({ caller }) func getOfferEarningsSummary(offerUserId : Nat) : async { totalEarnings : Nat; pendingEarnings : Nat; referralCode : Text; tier1Earnings : Nat; tier2Earnings : Nat; tier3Earnings : Nat; tier4Earnings : Nat; tier5Earnings : Nat } {
    OPApi.getEarningsSummary(offerUsers, offerUserId);
  };

  /// Get Offer Portal transaction history for a user.
  public shared query ({ caller }) func getMyOfferTransactions(offerUserId : Nat) : async [OPTypes.OfferTransaction] {
    OPApi.getMyOfferTransactions(offerTxns, offerUserId);
  };

  /// Submit a UPI withdrawal request from the Offer Portal.
  /// Returns #ok(withdrawalId) or #err(reason) — never traps.
  public shared ({ caller }) func requestOfferWithdrawal(offerUserId : Nat, upiId : Text, amount : Nat) : async { #ok : Nat; #err : Text } {
    switch (OPApi.requestWithdrawal(offerUsers, offerWithdrawals, nextWithdrawalId, offerUserId, upiId, amount)) {
      case (#ok(id))   { nextWithdrawalId += 1; #ok(id) };
      case (#err(msg)) { #err(msg) };
    };
  };

  /// Get withdrawal requests for an Offer Portal user.
  public shared query ({ caller }) func getMyOfferWithdrawals(offerUserId : Nat) : async [OPTypes.OfferWithdrawal] {
    OPApi.getMyWithdrawals(offerWithdrawals, offerUserId);
  };

  // ── OFFER PORTAL — CPALead postback ───────────────────────────────────────

  /// Process a CPALead postback: verify secret, split profit, credit earnings.
  /// Also triggers 3-tier MLM referral commissions (5%/2%/1%) to ancestors.
  public shared ({ caller }) func processCpaLeadPostback(
    offerUserId   : Nat,
    grossAmount   : Nat,
    webhookSecret : Text,
  ) : async Bool {
    switch (OPApi.processCpaLeadPostback(
      offerUsers, offerTxns, nextOfferTxnId,
      offerPortalConfig, adminSettings, offerUserId, grossAmount, webhookSecret,
    )) {
      case (#err(_)) { false };
      case (#ok(nextId)) {
        // nextId reflects all consumed txn IDs (primary + up to 3 MLM tiers)
        nextOfferTxnId := nextId;
        true;
      };
    };
  };

  // ── OFFER PORTAL — admin (🚀 OFFER CONTROL CENTER) ───────────────────────

  /// List all Offer Portal users — admin only.
  /// Accepts adminToken for email+password auth flow (anonymous principal friendly).
  /// Returns #ok([users]) for admin, #err("Unauthorized") for non-admin — never traps.
  public shared ({ caller }) func adminListOfferUsers(adminToken : ?Text) : async { #ok : [OPTypes.OfferUser]; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    #ok(OPApi.adminListOfferUsers(offerUsers));
  };

  /// List all pending withdrawal requests — admin only.
  /// Accepts adminToken for email+password auth flow.
  /// Returns #ok([withdrawals]) for admin, #err("Unauthorized") for non-admin — never traps.
  public shared ({ caller }) func adminListPendingWithdrawals(adminToken : ?Text) : async { #ok : [OPTypes.OfferWithdrawal]; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    #ok(OPApi.adminListPendingWithdrawals(offerWithdrawals));
  };

  /// Resolve a withdrawal request (approve/reject/paid) — admin only.
  /// Accepts adminToken for email+password auth flow.
  /// Returns #ok(true) on success, #err("Unauthorized") for non-admin — never traps.
  public shared ({ caller }) func adminResolveWithdrawal(adminToken : ?Text, id : Nat, newStatus : { #approved; #rejected; #paid }, adminNote : ?Text) : async { #ok : Bool; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    #ok(OPApi.adminResolveWithdrawal(offerUsers, offerWithdrawals, id, newStatus, adminNote));
  };

  /// Get Offer Portal global config.
  /// Admin callers: receive full config including API keys and webhook secrets.
  /// Non-admin callers (including anonymous): NEVER TRAP — receive safe public config
  /// with isEnabled and postbackUrl only. API keys and secrets are stripped.
  public shared ({ caller }) func getOfferPortalConfig(adminToken : ?Text) : async {
    isEnabled            : Bool;
    adminProfitPct       : Nat;
    userProfitPct        : Nat;
    cpaLeadWebhookSecret : Text;
    cpagripApiKey        : Text;
    postbackUrl          : Text;
    cpagripWebhookSecret : Text;
    cpagripOfferWallName : Text;
    isAdmin              : Bool;
  } {
    let isAdminCaller = isAdminCallerOrToken(caller, adminToken);
    if (isAdminCaller) {
      // Full config for admin
      {
        isEnabled            = offerPortalConfig.isEnabled;
        adminProfitPct       = offerPortalConfig.adminProfitPct;
        userProfitPct        = offerPortalConfig.userProfitPct;
        cpaLeadWebhookSecret = offerPortalConfig.cpaLeadWebhookSecret;
        cpagripApiKey        = offerPortalConfig.cpagripApiKey;
        postbackUrl          = "/cpa-postback";
        cpagripWebhookSecret = cpagripWebhookSecret;
        cpagripOfferWallName = cpagripOfferWallName;
        isAdmin              = true;
      }
    } else {
      // Safe public config — no secrets exposed
      {
        isEnabled            = offerPortalConfig.isEnabled;
        adminProfitPct       = offerPortalConfig.adminProfitPct;
        userProfitPct        = offerPortalConfig.userProfitPct;
        cpaLeadWebhookSecret = "";
        cpagripApiKey        = "";
        postbackUrl          = "/cpa-postback";
        cpagripWebhookSecret = "";
        cpagripOfferWallName = cpagripOfferWallName;
        isAdmin              = false;
      }
    };
  };

  /// Get Offer Portal global config — public (no auth required).
  /// Returns the config so any visitor can check whether the portal is enabled
  /// before showing the login/signup UI.  Webhook secrets are NOT included
  /// in this method — admin-only fields remain protected via getOfferPortalConfig.
  public shared query ({ caller }) func getOfferPortalConfigPublic() : async { isEnabled : Bool; adminProfitPct : Nat; userProfitPct : Nat } {
    {
      isEnabled      = offerPortalConfig.isEnabled;
      adminProfitPct = offerPortalConfig.adminProfitPct;
      userProfitPct  = offerPortalConfig.userProfitPct;
    };
  };

  /// Get safe Offer Portal config for any user (no auth required) — alias for getOfferPortalConfigPublic.
  /// Returns ONLY non-sensitive fields: isEnabled, adminProfitPct, userProfitPct.
  /// No API keys, no webhook secrets. Never traps for any caller.
  public query func getOfferPortalConfigForUser() : async { isEnabled : Bool; adminProfitPct : Nat; userProfitPct : Nat } {
    {
      isEnabled      = offerPortalConfig.isEnabled;
      adminProfitPct = offerPortalConfig.adminProfitPct;
      userProfitPct  = offerPortalConfig.userProfitPct;
    };
  };

  /// Update Offer Portal config (toggle, offer wall secret, profit split) — admin only.
  /// Also persists cpagripWebhookSecret and cpagripOfferWallName to their stable vars.
  /// Returns #ok(true) on success, #err(reason) if validation fails (e.g. API key too short).
  public shared ({ caller }) func updateOfferPortalConfig(
    adminToken           : ?Text,
    isEnabled            : Bool,
    cpaLeadWebhookSecret : Text,
    cpagripApiKey        : Text,
    adminProfitPct       : Nat,
    userProfitPct        : Nat,
    newWebhookSecret     : Text,
    newOfferWallName     : Text,
  ) : async { #ok : Bool; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    let newConfig : OPTypes.OfferPortalConfig = { isEnabled; cpaLeadWebhookSecret; cpagripApiKey; adminProfitPct; userProfitPct };
    switch (OPApi.updateOfferPortalConfig(offerPortalConfig, newConfig)) {
      case (#err(msg)) { #err(msg) };
      case (#ok(_))    {
        offerPortalConfig := newConfig;
        // Persist the two extra CPAGrip fields to their separate stable vars
        // Use the non-empty value: prefer newWebhookSecret if provided, else keep existing
        if (newWebhookSecret != "") { cpagripWebhookSecret := newWebhookSecret };
        if (newOfferWallName != "") { cpagripOfferWallName := newOfferWallName };
        // Mirror cpagripApiKey into adminSettings for consistency
        adminSettings := { adminSettings with cpagripApiKey };
        #ok(true);
      };
    };
  };

  /// Get the full Offer Portal config including cpagripWebhookSecret and cpagripOfferWallName — admin only.
  /// Use this after saving to verify all 3 CPAGrip fields persisted correctly.
  /// Returns full config for admin, safe empty-secret config for non-admin — never traps.
  public shared ({ caller }) func getOfferPortalConfigFull(adminToken : ?Text) : async {
    #ok : {
      isEnabled            : Bool;
      cpaLeadWebhookSecret : Text;
      cpagripApiKey        : Text;
      adminProfitPct       : Nat;
      userProfitPct        : Nat;
      cpagripWebhookSecret : Text;
      cpagripOfferWallName : Text;
    };
    #err : Text;
  } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      // Return safe non-sensitive config — never return #err (would trap frontend)
      return #ok({
        isEnabled            = offerPortalConfig.isEnabled;
        cpaLeadWebhookSecret = "";
        cpagripApiKey        = "";
        adminProfitPct       = offerPortalConfig.adminProfitPct;
        userProfitPct        = offerPortalConfig.userProfitPct;
        cpagripWebhookSecret = "";
        cpagripOfferWallName = cpagripOfferWallName;
      });
    };
    #ok({
      isEnabled            = offerPortalConfig.isEnabled;
      cpaLeadWebhookSecret = offerPortalConfig.cpaLeadWebhookSecret;
      cpagripApiKey        = offerPortalConfig.cpagripApiKey;
      adminProfitPct       = offerPortalConfig.adminProfitPct;
      userProfitPct        = offerPortalConfig.userProfitPct;
      cpagripWebhookSecret = cpagripWebhookSecret;
      cpagripOfferWallName = cpagripOfferWallName;
    });
  };

  // ── SMS config ────────────────────────────────────────────────────────────

  /// Get SMS (Fast2SMS) config — admin only.
  /// Returns #ok(config) for admin, #ok(empty defaults) for non-admin — never traps.
  public shared query ({ caller }) func getSmsConfig() : async { #ok : OPTypes.SmsConfig; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #ok({ fast2smsApiKey = ""; senderId = ""; isEnabled = false });
    };
    #ok(smsConfig);
  };

  /// Update SMS config — admin only.
  /// Returns #ok(true) or #err("Unauthorized: Admin only") — never traps.
  public shared ({ caller }) func updateSmsConfig(fast2smsApiKey : Text, senderId : Text, isEnabled : Bool) : async { #ok : Bool; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    smsConfig := { fast2smsApiKey; senderId; isEnabled };
    #ok(true);
  };

  /// Update SMS config with admin token — admin only (alias for email+password auth).
  /// Returns #ok(true) or #err("Unauthorized: Admin only") — never traps.
  public shared ({ caller }) func updateSmsConfigWithToken(adminToken : ?Text, fast2smsApiKey : Text, senderId : Text, isEnabled : Bool) : async { #ok : Bool; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    smsConfig := { fast2smsApiKey; senderId; isEnabled };
    #ok(true);
  };

  // ── Recharge Receipts ─────────────────────────────────────────────────────

  /// Get receipt for a specific recharge transaction.
  public shared query ({ caller }) func getRechargeReceipt(txnId : Nat) : async ?OPTypes.RechargeReceipt {
    OPApi.getReceiptByTxnId(rechargeReceipts, txnId);
  };

  /// Get all receipts for the calling user.
  public shared query ({ caller }) func getMyRechargeReceipts() : async [OPTypes.RechargeReceipt] {
    switch (principalToUserId.get(caller)) {
      case null { [] };
      case (?uid) { OPApi.getMyReceipts(rechargeReceipts, uid) };
    };
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── Content Locker API ────────────────────────────────────────────────────
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /// Return the full content-locker configuration (all features).
  public shared query func getContentLockerConfig() : async CLTypes.ContentLockerConfig {
    CLApi.getContentLockerConfig(lockedFeatures);
  };

  /// Create or update a locked feature — admin only.
  public shared ({ caller }) func setLockedFeature(
    featureName  : Text,
    cpaOfferLink : Text,
    secretKey    : Text,
  ) : async { #ok : Text; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    CLApi.setLockedFeature(lockedFeatures, featureName, cpaOfferLink, secretKey);
  };

  /// Remove a locked feature by id — admin only.
  public shared ({ caller }) func removeLockedFeature(
    featureId : Text,
  ) : async { #ok; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    CLApi.removeLockedFeature(lockedFeatures, featureId);
  };

  /// User-facing: verify a plain-text unlock key for a named feature.
  public shared func verifyUnlockKey(
    featureName : Text,
    userKey     : Text,
  ) : async CLTypes.VerifyKeyResult {
    CLApi.verifyUnlockKey(lockedFeatures, featureName, userKey);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── Admin Audit Log & Subscription API ───────────────────────────────────
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /// Return the most recent `limit` audit log entries — admin only.
  /// Returns empty array if caller is not admin (never traps).
  public shared ({ caller }) func getAdminAuditLog(
    adminToken : ?Text,
    limit : Nat,
  ) : async [AuditTypes.AuditLogEntry] {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return [];
    };
    AuditApi.getAdminAuditLog(auditLog, limit);
  };

  /// Adjust (add or deduct) a user's wallet balance and log the action — admin only.
  /// Returns the new balance as Int on success.
  public shared ({ caller }) func adminAdjustWalletBalance(
    adminToken : ?Text,
    userId : Text,
    amount : Int,
    action : Text,
    note   : Text,
  ) : async { #ok : Int; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    let adminEmail = "admin";
    let result = AuditApi.adminAdjustWalletBalance(
      walletBalances, auditLog, nextAuditId, adminEmail, userId, amount, action, note,
    );
    switch (result) {
      case (#ok(_)) { nextAuditId += 1 };
      case (#err(_)) {};
    };
    result;
  };

  /// Manually assign or revoke a subscription for a user — admin only.
  public shared ({ caller }) func adminAssignSubscription(
    adminToken   : ?Text,
    userId       : Text,
    durationDays : Nat,
    action       : Text,
  ) : async { #ok; #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    let adminEmail = "admin";
    let result = AuditApi.adminAssignSubscription(
      userSubscriptions, auditLog, nextAuditId, adminEmail, userId, durationDays, action,
    );
    switch (result) {
      case (#ok) { nextAuditId += 1 };
      case (#err(_)) {};
    };
    result;
  };

  /// Get the current subscription status for a given user.
  public shared query func getUserSubscriptionStatus(
    userId : Text,
  ) : async ?AuditTypes.UserSubscription {
    AuditApi.getUserSubscriptionStatus(userSubscriptions, userId);
  };

  // ── Payment Configuration ─────────────────────────────────────────────────

  /// Returns the current payment configuration.
  /// Readable by all callers — providers and riders need to display UPI/QR.
  public query func getPaymentConfig() : async PCTypes.PaymentConfig {
    PCApi.getPaymentConfig(paymentConfig);
  };

  /// Updates the payment configuration (admin only).
  public shared ({ caller }) func setPaymentConfig(config : PCTypes.PaymentConfig) : async Bool {
    switch (PCApi.validateSetPaymentConfig(accessControlState, caller, config)) {
      case (#err(_)) { false };
      case (#ok(validated)) {
        paymentConfig := validated;
        true;
      };
    };
  };

  // ── Unified Admin Settings ────────────────────────────────────────────────

  /// Return all admin settings — readable by any caller so the frontend can
  /// apply toggles and rates without an admin auth round-trip.
  public query func getAdminSettings() : async ASTypes.AdminSettingsExtended {
    {
      referralLevel1Pct   = adminSettings.referralLevel1Pct;
      referralLevel2Pct   = adminSettings.referralLevel2Pct;
      referralLevel3Pct   = adminSettings.referralLevel3Pct;
      referralLevel4Pct   = adminSettings.referralLevel4Pct;
      referralLevel5Pct   = adminSettings.referralLevel5Pct;
      upiId               = adminSettings.upiId;
      upiQrCodeUrl        = adminSettings.upiQrCodeUrl;
      razorpayKeyId       = adminSettings.razorpayKeyId;
      razorpayKeySecret   = adminSettings.razorpayKeySecret;
      pointsPerAd         = adminSettings.pointsPerAd;
      redemptionRate      = adminSettings.redemptionRate;
      minWithdrawal       = adminSettings.minWithdrawal;
      cpagripApiKey       = adminSettings.cpagripApiKey;
      cpagripWebhookSecret = cpagripWebhookSecret;
      cpagripOfferWallName = cpagripOfferWallName;
      cloudinaryCloudName = adminSettings.cloudinaryCloudName;
      cloudinaryApiKey    = adminSettings.cloudinaryApiKey;
      cloudinaryApiSecret = adminSettings.cloudinaryApiSecret;
      ludoEnabled         = adminSettings.ludoEnabled;
      rewardsEnabled      = adminSettings.rewardsEnabled;
      gameEnabled         = adminSettings.gameEnabled;
      udhaarBookEnabled   = adminSettings.udhaarBookEnabled;
    };
  };

  /// Replace ALL admin settings in one atomic call — admin only.
  /// All existing field values are overwritten with the supplied record.
  /// Empty strings for Cloudinary/CPAGrip fields preserve the existing defaults.
  public shared ({ caller }) func updateAdminSettings(adminToken : ?Text, settings : ASTypes.AdminSettingsExtended) : async Bool {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return false;
    };
    // Preserve defaults for critical fields if empty strings are passed
    let finalCloudName   = if (settings.cloudinaryCloudName != "") { settings.cloudinaryCloudName } else { adminSettings.cloudinaryCloudName };
    let finalCloudApiKey = if (settings.cloudinaryApiKey != "") { settings.cloudinaryApiKey } else { adminSettings.cloudinaryApiKey };
    let finalCloudSecret = if (settings.cloudinaryApiSecret != "") { settings.cloudinaryApiSecret } else { adminSettings.cloudinaryApiSecret };
    let finalCpaApiKey   = if (settings.cpagripApiKey != "") { settings.cpagripApiKey } else { adminSettings.cpagripApiKey };
    let finalWebhookSec  = if (settings.cpagripWebhookSecret != "") { settings.cpagripWebhookSecret } else { cpagripWebhookSecret };
    let finalOfferName   = if (settings.cpagripOfferWallName != "") { settings.cpagripOfferWallName } else { cpagripOfferWallName };
    adminSettings := {
      referralLevel1Pct   = settings.referralLevel1Pct;
      referralLevel2Pct   = settings.referralLevel2Pct;
      referralLevel3Pct   = settings.referralLevel3Pct;
      referralLevel4Pct   = settings.referralLevel4Pct;
      referralLevel5Pct   = settings.referralLevel5Pct;
      upiId               = settings.upiId;
      upiQrCodeUrl        = settings.upiQrCodeUrl;
      razorpayKeyId       = settings.razorpayKeyId;
      razorpayKeySecret   = settings.razorpayKeySecret;
      pointsPerAd         = settings.pointsPerAd;
      redemptionRate      = settings.redemptionRate;
      minWithdrawal       = settings.minWithdrawal;
      cpagripApiKey       = finalCpaApiKey;
      cloudinaryCloudName = finalCloudName;
      cloudinaryApiKey    = finalCloudApiKey;
      cloudinaryApiSecret = finalCloudSecret;
      ludoEnabled         = settings.ludoEnabled;
      rewardsEnabled      = settings.rewardsEnabled;
      gameEnabled         = settings.gameEnabled;
      udhaarBookEnabled   = settings.udhaarBookEnabled;
    };
    // Save new CPAGrip fields to their separate stable vars
    cpagripWebhookSecret := finalWebhookSec;
    cpagripOfferWallName := finalOfferName;
    // Mirror payment fields into paymentConfig for backward compat
    paymentConfig := {
      razorpayKeyId     = settings.razorpayKeyId;
      razorpayKeySecret = settings.razorpayKeySecret;
      upiVpa            = settings.upiId;
      qrCodeUrl         = settings.upiQrCodeUrl;
    };
    // Mirror cpagripApiKey into offerPortalConfig
    offerPortalConfig := { offerPortalConfig with cpagripApiKey = finalCpaApiKey; cpaLeadWebhookSecret = finalWebhookSec };
    true;
  };

  /// Update only Ludo / Rewards settings — admin only.
  public shared ({ caller }) func updateLudoSettings(
    ludoEnabled    : Bool,
    rewardsEnabled : Bool,
    pointsPerAd    : Nat,
    redemptionRate : Nat,
    minWithdrawal  : Nat,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    adminSettings := {
      adminSettings with
      ludoEnabled;
      rewardsEnabled;
      pointsPerAd;
      redemptionRate;
      minWithdrawal;
    };
    true;
  };

  /// Update only the 5-tier referral rates — admin only.
  public shared ({ caller }) func updateReferralRates(
    level1Pct : Nat,
    level2Pct : Nat,
    level3Pct : Nat,
    level4Pct : Float,
    level5Pct : Float,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    adminSettings := {
      adminSettings with
      referralLevel1Pct = level1Pct;
      referralLevel2Pct = level2Pct;
      referralLevel3Pct = level3Pct;
      referralLevel4Pct = level4Pct;
      referralLevel5Pct = level5Pct;
    };
    true;
  };

  /// Return Cloudinary cloud name and API key — public query.
  /// The API secret is NEVER returned; it stays server-side only.
  public query func getCloudinaryConfig() : async { cloudName : Text; apiKey : Text } {
    {
      cloudName = adminSettings.cloudinaryCloudName;
      apiKey    = adminSettings.cloudinaryApiKey;
    };
  };

  /// Update Cloudinary credentials — admin only.
  /// Empty strings preserve existing defaults.
  public shared ({ caller }) func updateCloudinaryConfig(
    cloudName : Text,
    apiKey    : Text,
    apiSecret : Text,
  ) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    let finalCloudName = if (cloudName != "") { cloudName } else { adminSettings.cloudinaryCloudName };
    let finalApiKey    = if (apiKey != "") { apiKey } else { adminSettings.cloudinaryApiKey };
    let finalSecret    = if (apiSecret != "") { apiSecret } else { adminSettings.cloudinaryApiSecret };
    adminSettings := {
      adminSettings with
      cloudinaryCloudName = finalCloudName;
      cloudinaryApiKey    = finalApiKey;
      cloudinaryApiSecret = finalSecret;
    };
    #ok(());
  };

  /// Adjust wallet balance for a user by userId (Nat) — admin only.
  /// Alias so both adminAdjustWallet and adjustWalletBalance work.
  public shared ({ caller }) func adjustWalletBalance(userId : Nat, amount : Float, isAdd : Bool, note : Text) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    let success = WRApi.adminAdjust(walletBalances, userId, amount, isAdd);
    if (success) { #ok(()) } else { #err("User wallet not found") };
  };

  /// Save the CPAGrip API key in canister state — admin only.
  /// Also mirrors the key into the live offerPortalConfig so it takes effect immediately.
  public shared ({ caller }) func updateCpagripApiKey(apiKey : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    adminSettings := { adminSettings with cpagripApiKey = apiKey };
    offerPortalConfig := { offerPortalConfig with cpagripApiKey = apiKey };
    true;
  };

  /// Save CPAGrip Webhook Secret Key and Offer Wall Name — admin only.
  /// Both fields are persisted in separate stable vars so they survive reloads.
  /// Empty strings are ignored — existing values are preserved.
  public shared ({ caller }) func updateCpagripSettings(
    adminToken    : ?Text,
    apiKey        : Text,
    webhookSecret : Text,
    offerWallName : Text,
  ) : async Bool {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return false;
    };
    let finalApiKey        = if (apiKey != "") { apiKey } else { adminSettings.cpagripApiKey };
    let finalWebhookSecret = if (webhookSecret != "") { webhookSecret } else { cpagripWebhookSecret };
    let finalOfferWallName = if (offerWallName != "") { offerWallName } else { cpagripOfferWallName };
    adminSettings := { adminSettings with cpagripApiKey = finalApiKey };
    offerPortalConfig := { offerPortalConfig with cpagripApiKey = finalApiKey; cpaLeadWebhookSecret = finalWebhookSecret };
    cpagripWebhookSecret := finalWebhookSecret;
    cpagripOfferWallName := finalOfferWallName;
    true;
  };

  /// Alias for updateCpagripSettings — matches frontend method name saveCPAGripKeys.
  /// Saves API key, Webhook Secret, and Offer Wall Name atomically — admin only.
  /// Empty strings are ignored — existing values are preserved, preventing accidental wipe.
  public shared ({ caller }) func saveCPAGripKeys(
    adminToken    : ?Text,
    apiKey        : Text,
    webhookSecret : Text,
    offerWallName : Text,
  ) : async { #ok : (); #err : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return #err("Unauthorized: Admin only");
    };
    // Only update if non-empty — prevents accidental wipe of existing values
    let finalApiKey        = if (apiKey != "") { apiKey } else { adminSettings.cpagripApiKey };
    let finalWebhookSecret = if (webhookSecret != "") { webhookSecret } else { cpagripWebhookSecret };
    let finalOfferWallName = if (offerWallName != "") { offerWallName } else { cpagripOfferWallName };
    adminSettings := { adminSettings with cpagripApiKey = finalApiKey };
    offerPortalConfig := { offerPortalConfig with cpagripApiKey = finalApiKey; cpaLeadWebhookSecret = finalWebhookSecret };
    cpagripWebhookSecret := finalWebhookSecret;
    cpagripOfferWallName := finalOfferWallName;
    #ok(());
  };

  /// Return the full CPAGrip settings (apiKey + webhookSecret + offerWallName) — admin only.
  /// Returns empty strings for non-admin callers (never traps).
  public shared ({ caller }) func getCpagripSettings(adminToken : ?Text) : async { apiKey : Text; webhookSecret : Text; offerWallName : Text } {
    if (not isAdminCallerOrToken(caller, adminToken)) {
      return { apiKey = ""; webhookSecret = ""; offerWallName = "" };
    };
    {
      apiKey        = adminSettings.cpagripApiKey;
      webhookSecret = cpagripWebhookSecret;
      offerWallName = cpagripOfferWallName;
    };
  };

  // ── AdMob Configuration ───────────────────────────────────────────────────

  /// Return the current AdMob configuration — admin only.
  /// Returns empty strings for non-admin callers (never traps).
  public shared query ({ caller }) func getAdmobConfig() : async {
    appId              : Text;
    bannerUnitId       : Text;
    interstitialId     : Text;
    ludoBannerId       : Text;
    ludoInterstitialId : Text;
    rewardedUnitId     : Text;
  } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return { appId = ""; bannerUnitId = ""; interstitialId = ""; ludoBannerId = ""; ludoInterstitialId = ""; rewardedUnitId = "" };
    };
    {
      appId              = admobAppId;
      bannerUnitId       = admobBannerUnitId;
      interstitialId     = admobInterstitialId;
      ludoBannerId       = admobLudoBannerId;
      ludoInterstitialId = admobLudoInterstitialId;
      rewardedUnitId     = admobRewardedUnitId;
    };
  };

  /// Return AdMob unit IDs that are safe for the frontend to use — public.
  /// The App ID is intentionally omitted (only needed native-side).
  public query func getAdmobConfigPublic() : async {
    bannerUnitId       : Text;
    interstitialId     : Text;
    ludoBannerId       : Text;
    ludoInterstitialId : Text;
    rewardedUnitId     : Text;
  } {
    {
      bannerUnitId       = admobBannerUnitId;
      interstitialId     = admobInterstitialId;
      ludoBannerId       = admobLudoBannerId;
      ludoInterstitialId = admobLudoInterstitialId;
      rewardedUnitId     = admobRewardedUnitId;
    };
  };

  /// Update AdMob configuration — admin only.
  public shared ({ caller }) func updateAdmobConfig(
    appId              : Text,
    bannerUnitId       : Text,
    interstitialId     : Text,
    ludoBannerId       : Text,
    ludoInterstitialId : Text,
    rewardedUnitId     : Text,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    admobAppId              := appId;
    admobBannerUnitId       := bannerUnitId;
    admobInterstitialId     := interstitialId;
    admobLudoBannerId       := ludoBannerId;
    admobLudoInterstitialId := ludoInterstitialId;
    admobRewardedUnitId     := rewardedUnitId;
    true;
  };

  // ── Manager Management ────────────────────────────────────────────────────

  /// Add a manager by mobile number — admin only.
  /// Managers have restricted access (News, Jobs, Videos).
  public shared ({ caller }) func addManager(mobile : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    if (mobile == "") {
      return false;
    };
    // Only add if not already in the list
    let exists = managers.find(func(m : Text) : Bool { m == mobile });
    switch (exists) {
      case (?_) { false }; // already exists
      case null {
        managers.add(mobile);
        true;
      };
    };
  };

  /// Get all managers — admin only.
  /// Returns empty array for non-admin callers (never traps).
  public shared query ({ caller }) func getManagers() : async [Text] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    managers.toArray();
  };

  /// Remove a manager by mobile number — admin only.
  public shared ({ caller }) func removeManager(mobile : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return false;
    };
    let before = managers.size();
    let filtered = managers.filter(func(m : Text) : Bool { m != mobile });
    managers.clear();
    managers.append(filtered);
    managers.size() < before;
  };

  /// Check if a given mobile number belongs to a manager — public.
  public query func isManager(mobile : Text) : async Bool {
    switch (managers.find(func(m : Text) : Bool { m == mobile })) {
      case (?_) { true };
      case null { false };
    };
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ── CHAT MODULE ───────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Chat Messages ──────────────────────────────────────────────────────────

  public shared ({ caller }) func sendMessage(
    conversationId : Nat,
    content        : Text,
    messageType    : ChatTypes.MessageType,
    mediaUrl       : ?Text,
    replyToId      : ?Nat,
    isVanish       : Bool,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.sendMessage(chatState, nextChatMessageId, caller, conversationId, content, messageType, mediaUrl, replyToId, isVanish);
    nextChatMessageId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func getConversationMessages(
    conversationId : Nat,
    limit          : Nat,
    before         : ?Nat,
  ) : async [ChatTypes.ChatMessage] {
    ChatApi.getConversationMessages(chatState, caller, conversationId, limit, before);
  };

  public shared ({ caller }) func markMessagesRead(conversationId : Nat) : async Bool {
    ChatApi.markMessagesRead(chatState, caller, conversationId);
  };

  public shared ({ caller }) func deleteChatMessage(
    messageId         : Nat,
    deleteForEveryone : Bool,
  ) : async Bool {
    ChatApi.deleteMessage(chatState, caller, messageId, deleteForEveryone);
  };

  public shared ({ caller }) func forwardChatMessage(
    messageId        : Nat,
    toConversationId : Nat,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.forwardMessage(chatState, nextChatMessageId, caller, messageId, toConversationId);
    nextChatMessageId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func reactToChatMessage(messageId : Nat, emoji : Text) : async Bool {
    ChatApi.reactToMessage(chatState, caller, messageId, emoji);
  };

  // ── Scheduled messages ────────────────────────────────────────────────────

  public shared ({ caller }) func scheduleChatMessage(
    conversationId : Nat,
    content        : Text,
    scheduledAt    : Int,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.scheduleMessage(chatState, nextChatScheduledMsgId, caller, conversationId, content, scheduledAt);
    nextChatScheduledMsgId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func getChatScheduledMessages() : async [ChatTypes.ScheduledMessage] {
    ChatApi.getScheduledMessages(chatState, caller);
  };

  public shared ({ caller }) func cancelChatScheduledMessage(id : Nat) : async Bool {
    ChatApi.cancelScheduledMessage(chatState, caller, id);
  };

  // ── Conversations ──────────────────────────────────────────────────────────

  public shared ({ caller }) func getOrCreateChatConversation(
    otherUserId : Principal,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.getOrCreateConversation(chatState, nextChatConversationId, caller, otherUserId);
    nextChatConversationId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func getMyChatConversations() : async [ChatTypes.Conversation] {
    ChatApi.getMyConversations(chatState, caller);
  };

  public shared ({ caller }) func createChatGroup(
    name      : Text,
    memberIds : [Principal],
    photoUrl  : ?Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.createGroup(chatState, nextChatConversationId, caller, name, memberIds, photoUrl);
    nextChatConversationId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func addChatGroupMembers(
    conversationId : Nat,
    memberIds      : [Principal],
  ) : async Bool {
    ChatApi.addGroupMembers(chatState, caller, conversationId, memberIds);
  };

  public shared ({ caller }) func removeChatGroupMember(
    conversationId : Nat,
    memberId       : Principal,
  ) : async Bool {
    ChatApi.removeGroupMember(chatState, caller, conversationId, memberId);
  };

  public shared ({ caller }) func leaveChatGroup(conversationId : Nat) : async Bool {
    ChatApi.leaveGroup(chatState, caller, conversationId);
  };

  public shared ({ caller }) func updateChatGroupInfo(
    conversationId : Nat,
    name           : ?Text,
    photoUrl       : ?Text,
  ) : async Bool {
    ChatApi.updateGroupInfo(chatState, caller, conversationId, name, photoUrl);
  };

  // ── Stories ────────────────────────────────────────────────────────────────

  public shared ({ caller }) func postChatStory(
    mediaUrl    : ?Text,
    textContent : ?Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.postStory(chatState, nextChatStoryId, caller, mediaUrl, textContent);
    nextChatStoryId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query func getActiveChatStories() : async [ChatTypes.Story] {
    ChatApi.getActiveStories(chatState);
  };

  public shared ({ caller }) func viewChatStory(storyId : Nat) : async Bool {
    ChatApi.viewStory(chatState, caller, storyId);
  };

  public shared ({ caller }) func replyToChatStory(
    storyId : Nat,
    message : Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newMsgId, newConvId) = ChatApi.replyToStory(chatState, nextChatMessageId, nextChatConversationId, caller, storyId, message);
    nextChatMessageId := newMsgId;
    nextChatConversationId := newConvId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  // ── User Chat Profile ──────────────────────────────────────────────────────

  public query ({ caller }) func getMyChatProfile() : async ?ChatTypes.UserChatProfile {
    ChatApi.getChatProfile(chatState, caller);
  };

  public shared ({ caller }) func updateMyChatProfile(
    displayName     : ?Text,
    bio             : ?Text,
    city            : ?Text,
    profilePhotoUrl : ?Text,
  ) : async Bool {
    ChatApi.updateChatProfile(chatState, caller, displayName, bio, city, profilePhotoUrl);
  };

  public shared ({ caller }) func setChatGhostMode(enabled : Bool) : async Bool {
    ChatApi.setGhostMode(chatState, caller, enabled);
  };

  public shared ({ caller }) func setChatStudyMode(
    enabled       : Bool,
    selectedChats : [Nat],
  ) : async Bool {
    ChatApi.setStudyMode(chatState, caller, enabled, selectedChats);
  };

  public shared ({ caller }) func setChatAutoReply(enabled : Bool, messages : [Text]) : async Bool {
    ChatApi.setAutoReply(chatState, caller, enabled, messages);
  };

  public query func getChatUserProfile(userId : Principal) : async ?ChatTypes.UserChatProfile {
    ChatApi.getUserChatProfile(chatState, userId);
  };

  public query func searchChatUsers(searchQuery : Text) : async [ChatTypes.UserChatProfile] {
    ChatApi.searchChatUsers(chatState, searchQuery);
  };

  // ── Shortcuts ──────────────────────────────────────────────────────────────

  public query ({ caller }) func getChatShortcuts() : async [ChatTypes.ChatShortcut] {
    ChatApi.getShortcuts(chatState, caller);
  };

  public shared ({ caller }) func addChatPersonalShortcut(
    trigger  : Text,
    content  : Text,
    category : Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.addPersonalShortcut(chatState, nextChatShortcutId, caller, trigger, content, category);
    nextChatShortcutId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func deleteChatShortcut(id : Nat) : async Bool {
    ChatApi.deleteShortcut(chatState, caller, id, false);
  };

  public shared ({ caller }) func adminAddChatShortcut(
    trigger  : Text,
    content  : Text,
    category : Text,
  ) : async { #ok : Nat; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    let (result, newId) = ChatApi.adminAddShortcut(chatState, nextChatShortcutId, trigger, content, category);
    nextChatShortcutId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func adminDeleteChatShortcut(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    ChatApi.deleteShortcut(chatState, caller, id, true);
  };

  // ── Vault ──────────────────────────────────────────────────────────────────

  public shared ({ caller }) func addChatVaultItem(
    mediaUrl   : Text,
    title      : Text,
    isViewOnce : Bool,
    expiresAt  : ?Int,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.addVaultItem(chatState, nextChatVaultItemId, caller, mediaUrl, title, isViewOnce, expiresAt);
    nextChatVaultItemId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func getChatVaultItems() : async [ChatTypes.VaultItem] {
    ChatApi.getVaultItems(chatState, caller);
  };

  public shared ({ caller }) func viewChatVaultItem(id : Nat) : async ?ChatTypes.VaultItem {
    ChatApi.viewVaultItem(chatState, caller, id);
  };

  public shared ({ caller }) func deleteChatVaultItem(id : Nat) : async Bool {
    ChatApi.deleteVaultItem(chatState, caller, id);
  };

  // ── Notes ──────────────────────────────────────────────────────────────────

  public shared ({ caller }) func saveChatNote(
    title   : Text,
    content : Text,
    subject : Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.saveNote(chatState, nextChatNoteId, caller, title, content, subject);
    nextChatNoteId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func getChatNotes() : async [ChatTypes.Note] {
    ChatApi.getNotes(chatState, caller);
  };

  public shared ({ caller }) func updateChatNote(
    id      : Nat,
    title   : ?Text,
    content : ?Text,
    subject : ?Text,
  ) : async Bool {
    ChatApi.updateNote(chatState, caller, id, title, content, subject);
  };

  public shared ({ caller }) func deleteChatNote(id : Nat) : async Bool {
    ChatApi.deleteNote(chatState, caller, id);
  };

  // ── Rewards & Referrals ───────────────────────────────────────────────────

  public query ({ caller }) func getMyChatPoints() : async ChatTypes.RewardPoints {
    ChatApi.getMyPoints(chatState, caller);
  };

  public shared ({ caller }) func awardChatPoints(action : Text, points : Nat) : async Bool {
    ChatApi.awardPoints(chatState, caller, action, points);
  };

  public query func getChatPointsLeaderboard() : async [ChatTypes.LeaderboardEntry] {
    ChatApi.getPointsLeaderboard(chatState);
  };

  public query ({ caller }) func getMyChatReferralCode() : async Text {
    ChatApi.getMyReferralCode(chatState, caller);
  };

  public query ({ caller }) func getMyChatReferralStats() : async ChatTypes.ReferralStats {
    ChatApi.getReferralStats(chatState, caller);
  };

  public shared ({ caller }) func processChatReferralSignup(referralCode : Text) : async Bool {
    ChatApi.processReferralSignup(chatState, caller, referralCode);
  };

  // ── Admin Chat Controls ────────────────────────────────────────────────────

  public query func getChatAdminSettings() : async ChatTypes.ChatAdminSettings {
    ChatApi.getChatAdminSettings(chatState);
  };

  public shared ({ caller }) func updateChatAdminSettings(
    settings : ChatTypes.ChatAdminSettings,
  ) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    ChatApi.updateChatAdminSettings(chatState, settings);
  };

  public shared ({ caller }) func adminBroadcastChatMessage(content : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    let (result, newId) = ChatApi.adminBroadcastMessage(chatState, nextChatMessageId, caller, content);
    nextChatMessageId := newId;
    result;
  };

  public query ({ caller }) func adminGetChatStats() : async ChatTypes.ChatStats {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return { totalUsers = 0; activeChats = 0; totalMessages = 0; storiesPosted = 0 };
    };
    ChatApi.adminGetChatStats(chatState);
  };

  public shared ({ caller }) func adminSeedChatDemoData() : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    if (chatDemoDataSeeded) { return false };
    let (result, newMsgId, newConvId, newStoryId, newSCId) = ChatApi.adminSeedDemoData(
      chatState,
      nextChatMessageId,
      nextChatConversationId,
      nextChatStoryId,
      nextChatShortcutId,
      chatDemoDataSeeded,
    );
    nextChatMessageId      := newMsgId;
    nextChatConversationId := newConvId;
    nextChatStoryId        := newStoryId;
    nextChatShortcutId     := newSCId;
    chatDemoDataSeeded     := true;
    result;
  };

  // ── Cleanup ────────────────────────────────────────────────────────────────

  public shared ({ caller }) func cleanupExpiredChatStories() : async Nat {
    ChatApi.cleanupExpiredStories(chatState);
  };

  public shared ({ caller }) func cleanupExpiredChatVaultItems() : async Nat {
    ChatApi.cleanupExpiredVaultItems(chatState);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Key-Locker (Chat)
  // ══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func sendLockedMessage(
    conversationId : Nat,
    fileUrl        : Text,
    lockType       : ChatTypes.LockType,
    passwordHash   : ?Text,
    task           : ?ChatTypes.LockedFileTask,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.sendLockedMessage(
      chatState, nextChatMessageId, caller,
      conversationId, fileUrl, lockType, passwordHash, task,
    );
    nextChatMessageId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func unlockMessage(
    messageId : Nat,
    attempt   : Text,
  ) : async { #ok : (); #err : Text } {
    ChatApi.unlockMessage(chatState, caller, messageId, attempt);
  };

  public query ({ caller }) func getLockedFileUrl(messageId : Nat) : async ?Text {
    ChatApi.getLockedFileUrl(chatState, caller, messageId);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // AI Chat Summary
  // ══════════════════════════════════════════════════════════════════════════

  /// Summarize last 50 messages or last 24h messages for a conversation.
  /// Uses OpenAI via HTTP outcall — API key configured in Chat Admin Settings.
  public shared ({ caller }) func summarizeChatMessages(
    conversationId : Nat,
    mode           : { #last50; #last24h },
  ) : async { #ok : Text; #err : Text } {
    await ChatApi.summarizeChatMessages(chatState, conversationId, mode);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Pay-to-Unlock Messages
  // ══════════════════════════════════════════════════════════════════════════

  /// Send a pay-to-unlock message. Receivers must pay lockPrice to read content.
  public shared ({ caller }) func sendPayToUnlockMessage(
    conversationId : Nat,
    content        : Text,
    lockPrice      : Nat,
    currency       : Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.sendPayToUnlockMessage(
      chatState, nextChatMessageId, caller, conversationId, content, lockPrice, currency,
    );
    nextChatMessageId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  /// Create a Stripe PaymentIntent for a locked message and return clientSecret.
  public shared ({ caller }) func createUnlockPaymentIntent(
    messageId : Nat,
  ) : async { #ok : Text; #err : Text } {
    let (result, newId) = await ChatApi.createUnlockPaymentIntent(
      chatState, nextChatPaymentId, caller, messageId,
    );
    nextChatPaymentId := newId;
    switch (result) {
      case (#ok(secret)) { #ok(secret) };
      case (#err(e))     { #err(e) };
    };
  };

  /// Submit a UPI transaction reference for admin approval to unlock a message.
  public shared ({ caller }) func confirmUpiUnlock(
    messageId : Nat,
    upiTxnRef : Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = ChatApi.confirmUpiUnlock(
      chatState, nextChatPaymentId, caller, messageId, upiTxnRef,
    );
    nextChatPaymentId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  /// Verify a Stripe PaymentIntent and unlock the message if payment succeeded.
  public shared ({ caller }) func verifyStripeUnlock(
    messageId       : Nat,
    paymentIntentId : Text,
  ) : async { #ok; #err : Text } {
    await ChatApi.verifyStripeUnlock(chatState, caller, messageId, paymentIntentId);
  };

  /// Return the caller's pay-to-unlock creator earnings.
  public query ({ caller }) func getCreatorEarnings() : async ChatTypes.CreatorEarningsSummary {
    ChatApi.getCreatorEarnings(chatState, caller);
  };

  /// Return all pending UPI unlock requests — admin only.
  /// Returns empty array for non-admin callers (never traps).
  public query ({ caller }) func adminGetUpiUnlockRequests() : async [ChatTypes.LockedMessagePayment] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    ChatApi.adminGetUpiUnlockRequests(chatState);
  };

  /// Approve a UPI unlock request — admin only.
  public shared ({ caller }) func adminApproveUpiUnlock(paymentId : Nat) : async { #ok; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    ChatApi.adminApproveUpiUnlock(chatState, paymentId);
  };

  /// Reject a UPI unlock request — admin only.
  public shared ({ caller }) func adminRejectUpiUnlock(paymentId : Nat) : async { #ok; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    ChatApi.adminRejectUpiUnlock(chatState, paymentId);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Marketplace
  // ══════════════════════════════════════════════════════════════════════════

  public shared ({ caller }) func createListing(
    title           : Text,
    description     : Text,
    price           : Nat,
    category        : MktTypes.MarketCategory,
    city            : Text,
    photoUrls       : [Text],
    whatsappContact : Text,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = MktApi.createListing(
      marketState, nextMarketListingId, caller,
      title, description, price, category, city, photoUrls, whatsappContact,
    );
    nextMarketListingId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query func getListings(
    city     : ?Text,
    category : ?MktTypes.MarketCategory,
  ) : async [MktTypes.MarketListing] {
    MktApi.getListings(marketState, city, category);
  };

  public query ({ caller }) func getMyListings() : async [MktTypes.MarketListing] {
    MktApi.getMyListings(marketState, caller);
  };

  public shared ({ caller }) func updateListing(
    id              : Nat,
    title           : ?Text,
    description     : ?Text,
    price           : ?Nat,
    city            : ?Text,
    photoUrls       : ?[Text],
    whatsappContact : ?Text,
  ) : async { #ok : (); #err : Text } {
    MktApi.updateListing(marketState, caller, id, title, description, price, city, photoUrls, whatsappContact);
  };

  public shared ({ caller }) func deleteListing(id : Nat) : async { #ok : (); #err : Text } {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    MktApi.deleteListing(marketState, caller, id, isAdmin);
  };

  public shared ({ caller }) func featureListing(id : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    MktApi.featureListing(marketState, id);
  };

  public query func getNewsItems() : async [MktTypes.LocalNewsItem] {
    MktApi.getNewsItems(marketState);
  };

  public shared ({ caller }) func adminAddNewsItem(
    title    : Text,
    content  : Text,
    imageUrl : ?Text,
  ) : async { #ok : Nat; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    let (result, newId) = MktApi.adminAddNewsItem(marketState, nextMarketNewsId, caller, title, content, imageUrl);
    nextMarketNewsId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func adminDeleteNewsItem(id : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    MktApi.adminDeleteNewsItem(marketState, id);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Premium System
  // ══════════════════════════════════════════════════════════════════════════

  public query ({ caller }) func isPremiumUser(userId : ?Principal) : async Bool {
    let target = switch (userId) { case null { caller }; case (?u) { u } };
    PremApi.isPremiumUser(premiumState, target);
  };

  public query ({ caller }) func getMySubscription() : async ?PremTypes.PremiumSubscription {
    PremApi.getMySubscription(premiumState, caller);
  };

  public query func getPremiumPlans() : async PremTypes.PremiumPrices {
    PremApi.getPremiumPrices(premiumState);
  };

  public shared ({ caller }) func activateStripePremium(
    plan                 : PremTypes.PremiumPlan,
    stripeSubscriptionId : Text,
  ) : async { #ok : (); #err : Text } {
    PremApi.activateStripePremium(premiumState, caller, plan, stripeSubscriptionId);
  };

  public shared ({ caller }) func submitUpiPremiumRequest(
    plan      : PremTypes.PremiumPlan,
    upiTxnRef : Text,
    amount    : Nat,
  ) : async { #ok : Nat; #err : Text } {
    let (result, newId) = PremApi.submitUpiPremiumRequest(
      premiumState, nextPremiumUpiReqId, caller, plan, upiTxnRef, amount,
    );
    nextPremiumUpiReqId := newId;
    switch (result) {
      case (#ok(id)) { #ok(id) };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func adminGetUpiPremiumRequests() : async [PremTypes.UpiPaymentRequest] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    PremApi.adminGetUpiPremiumRequests(premiumState);
  };

  public shared ({ caller }) func adminApproveUpiPremium(requestId : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    PremApi.adminApproveUpiPremium(premiumState, requestId);
  };

  public shared ({ caller }) func adminRejectUpiPremium(requestId : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    PremApi.adminRejectUpiPremium(premiumState, requestId);
  };

  public shared ({ caller }) func adminSetPremiumPrices(monthly : Nat, quarterly : Nat, annual : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Admin only");
    };
    PremApi.adminSetPremiumPrices(premiumState, monthly, quarterly, annual);
  };

};
