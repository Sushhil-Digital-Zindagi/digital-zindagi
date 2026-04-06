import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import UserApproval "user-approval/approval";
import Storage "blob-storage/Storage";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Principal "mo:core/Principal";


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

  // Include prefabricated components
  include MixinStorage();
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
};
