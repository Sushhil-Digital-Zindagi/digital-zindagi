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

  // App Settings (JSON blob for all misc settings — notification bar, app tagline, etc.)
  var appSettingsJson : Text = "{}";

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
    id : Nat;
    name : Text;
    code : Text;
    btnLabel : Text;
    icon : Text;
    placement : Text;
    enabled : Bool;
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
      Runtime.trap("Unauthorized: Only admins can view all provider data");
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
  ) : async () {
    if (users.containsKey(mobile)) {
      Runtime.trap("User already exists");
    };
    let user : User = {
      id = nextUserId;
      name;
      mobile;
      passwordHash;
      role;
      securityQuestion;
      securityAnswer;
      createdAt = Time.now();
    };
    users.add(mobile, user);
    userIdToPrincipal.add(nextUserId, caller);
    principalToUserId.add(caller, nextUserId);

    // Create user profile for AccessControl integration
    let userProfile : UserProfile = {
      userId = nextUserId;
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
        userId = user.id;
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
      providerProfiles.add(user.id, providerProfile);
    };
  };

  public query ({ caller }) func getUserById(userId : Nat) : async ?User {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can access user data by ID");
    };
    getUserByIdInternal(userId);
  };

  public query ({ caller }) func getUserByMobile(mobile : MobileNumber) : async ?User {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can access user data by mobile");
    };
    users.get(mobile);
  };

  public shared ({ caller }) func login(mobile : MobileNumber, passwordHash : Text) : async User {
    switch (users.get(mobile)) {
      case (null) { Runtime.trap("User not found") };
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

          user;
        } else {
          Runtime.trap("Incorrect password");
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
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    users.values().toArray().sort();
  };

  public query ({ caller }) func getUsersByRole(role : UserRole) : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list users by role");
    };
    users.values().toArray().filter(func(user : User) : Bool { user.role == role });
  };

  public query ({ caller }) func searchUsers(searchText : Text) : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can search users");
    };
    users.values().toArray().filter(
      func(user : User) : Bool {
        user.name.contains(#text searchText) or user.mobile.contains(#text searchText)
      }
    );
  };

  public query ({ caller }) func getRecentUsers() : async [User] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view recent users");
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
      Runtime.trap("Unauthorized: Only admins can view pending approvals");
    };
    providerProfiles.values().toArray().filter(
      func(profile : ProviderProfile) : Bool { 
        profile.paymentScreenshotBlobId != null and profile.subscriptionStatus == #pending 
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

  public shared ({ caller }) func approveProvider(userId : Nat, plan : SubscriptionPlan) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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

  public shared ({ caller }) func rejectProvider(userId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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

  // Toggles
  public query ({ caller }) func getAllToggles() : async [(Text, Bool)] {
    // Public read access for displaying enabled categories
    toggles.entries().toArray();
  };

  public shared ({ caller }) func updateToggle(toggleName : Text, value : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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

  public shared ({ caller }) func changeAdminPin(currentPinHash : Text, newPinHash : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
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

  public shared ({ caller }) func addCustomCode(name : Text, code : Text, btnLabel : Text, icon : Text, placement : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add custom codes");
    };
    let id = nextCustomCodeId;
    customCodes.add(id, { id; name; code; btnLabel; icon; placement; enabled = true });
    nextCustomCodeId += 1;
    id;
  };

  public shared ({ caller }) func updateCustomCode(id : Nat, name : Text, code : Text, btnLabel : Text, icon : Text, placement : Text, enabled : Bool) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update custom codes");
    };
    if (customCodes.containsKey(id)) {
      customCodes.add(id, { id; name; code; btnLabel; icon; placement; enabled });
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

  public shared ({ caller }) func updateAppSettings(json : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update app settings");
    };
    appSettingsJson := json;
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
};
