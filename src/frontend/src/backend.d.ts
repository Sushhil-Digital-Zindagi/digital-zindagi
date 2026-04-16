import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface ServiceRate {
    name: string;
    description: string;
    price: bigint;
}
export type MobileNumber = string;
export interface ContentLockerConfig {
    features: Array<LockedFeature>;
}
export interface SmsConfig {
    fast2smsApiKey: string;
    isEnabled: boolean;
    senderId: string;
}
export type VerifyKeyResult = {
    __kind__: "ok";
    ok: boolean;
} | {
    __kind__: "err";
    err: string;
};
export interface RechargeApiConfig {
    autoRefundEnabled: boolean;
    isActive: boolean;
    responseParam: string;
    apiKey: string;
    apiUrl: string;
}
export interface OfferWithdrawal {
    id: bigint;
    status: Variant_pending_paid_approved_rejected;
    offerUserId: bigint;
    processedAt?: bigint;
    adminNote?: string;
    upiId: string;
    amount: bigint;
    requestedAt: bigint;
}
export interface CustomCode {
    id: bigint;
    title: string;
    placement: string;
    layoutStyle: string;
    code: string;
    icon: string;
    name: string;
    enabled: boolean;
    btnLabel: string;
    alignment: string;
    subtitle1: string;
    subtitle2: string;
}
export interface OfferPortalConfig {
    cpaLeadWebhookSecret: string;
    cpagripApiKey: string;
    adminProfitPct: bigint;
    isEnabled: boolean;
    userProfitPct: bigint;
}
export interface NewsItem {
    id: bigint;
    title: string;
    link: string;
    createdAt: bigint;
    enabled: boolean;
    summary: string;
    imageUrl: string;
    category: string;
}
export interface ScrapRate {
    id: bigint;
    ratePerKg: number;
    enabled: boolean;
    ratePerGram: number;
    itemName: string;
}
export interface Category {
    id: bigint;
    name: string;
    color: string;
    emoji: string;
    enabled: boolean;
}
export interface PaymentConfig {
    razorpayKeyId: string;
    razorpayKeySecret: string;
    upiVpa: string;
    qrCodeUrl: string;
}
export interface JobItem {
    id: bigint;
    title: string;
    applyLink: string;
    createdAt: bigint;
    enabled: boolean;
    category: string;
    department: string;
    lastDate: string;
    location: string;
}
export interface RechargeReceipt {
    id: bigint;
    txnId: bigint;
    netCost: bigint;
    userId: bigint;
    operator: string;
    generatedAt: bigint;
    circle: string;
    referenceId: string;
    commission: bigint;
    mobile: string;
    amount: bigint;
}
export interface WalletTopupRequest {
    id: bigint;
    status: string;
    userId: bigint;
    note: string;
    amount: number;
    requestedAt: bigint;
    resolvedAt?: bigint;
}
export interface User {
    id: bigint;
    name: string;
    createdAt: bigint;
    role: UserRole;
    securityQuestion: string;
    securityAnswer: string;
    passwordHash: string;
    mobile: MobileNumber;
}
export interface VideoItem {
    id: bigint;
    title: string;
    thumbnailUrl: string;
    createdAt: bigint;
    platform: string;
    enabled: boolean;
    category: string;
    videoUrl: string;
}
export interface UdhaarTransaction {
    id: string;
    status: string;
    transactionType: string;
    shopId: string;
    date: string;
    note: string;
    createdAt: bigint;
    customerId: string;
    amount: number;
}
export interface UdhaarCustomer {
    id: string;
    shopId: string;
    name: string;
    createdAt: bigint;
    address: string;
    mobile: string;
}
export interface Order {
    id: bigint;
    customerName: string;
    status: string;
    createdAt: bigint;
    description: string;
    orderType: string;
    imageUrl?: string;
    customerId: bigint;
    providerId: bigint;
}
export interface OfferTransaction {
    id: bigint;
    status: Variant_pending_reversed_credited;
    offerUserId: bigint;
    createdAt: bigint;
    description: string;
    txType: Variant_manualCredit_referralBonus_cpalead;
    amount: bigint;
}
export interface LockedFeature {
    id: string;
    createdAt: bigint;
    secretKeyHash: string;
    cpaOfferLink: string;
    updatedAt: bigint;
    isLocked: boolean;
    featureName: string;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface RechargeTransaction {
    id: bigint;
    status: string;
    netCost: number;
    userId: bigint;
    operator: string;
    createdAt: bigint;
    circle: string;
    commission: number;
    mobile: string;
    amount: number;
}
export interface Banner {
    id: bigint;
    title: string;
    active: boolean;
    linkUrl: string;
    displayOrder: bigint;
    imageUrl: string;
    subtitle: string;
}
export interface AuditLogEntry {
    id: string;
    action: AuditAction;
    note: string;
    timestamp: bigint;
    adminEmail: string;
    amount?: bigint;
    targetUserId: string;
}
export interface OfferUser {
    id: bigint;
    tier5Earnings: bigint;
    referralCode: string;
    tier4Earnings: bigint;
    userId: string;
    createdAt: bigint;
    pendingEarnings: bigint;
    tier3Earnings: bigint;
    email: string;
    referredBy?: string;
    tier2Earnings: bigint;
    passwordHash: string;
    totalEarnings: bigint;
    tier1Earnings: bigint;
}
export interface AdminSettings {
    pointsPerAd: bigint;
    cloudinaryApiKey: string;
    cpagripApiKey: string;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    gameEnabled: boolean;
    referralLevel1Pct: bigint;
    referralLevel2Pct: bigint;
    referralLevel3Pct: bigint;
    referralLevel4Pct: number;
    referralLevel5Pct: number;
    minWithdrawal: bigint;
    upiQrCodeUrl: string;
    rewardsEnabled: boolean;
    upiId: string;
    cloudinaryCloudName: string;
    ludoEnabled: boolean;
    redemptionRate: bigint;
    udhaarBookEnabled: boolean;
    cloudinaryApiSecret: string;
}
export interface CustomSection {
    id: bigint;
    placement: string;
    name: string;
    createdAt: bigint;
    heading: string;
    enabled: boolean;
    buttons: string;
}
export interface CommissionConfig {
    retailerSharePct: number;
    adminSharePct: number;
    globalCommissionPct: number;
}
export interface UserSubscription {
    status: string;
    assignedByAdmin: boolean;
    endDate: bigint;
    userId: string;
    startDate: bigint;
}
export interface SubscriptionPricing {
    threeMonthPrice: bigint;
    twelveMonthPrice: bigint;
    oneMonthPrice: bigint;
}
export interface AdminConfig {
    email: string;
    adminName: string;
    upiId: string;
    mobile: MobileNumber;
    qrCodeBlobId: ExternalBlob;
}
export interface UserProfile {
    userId: bigint;
    name: string;
    role: UserRole;
    mobile: MobileNumber;
}
export interface ProviderProfile {
    userId: bigint;
    subscriptionExpiry?: bigint;
    subscriptionPlan: SubscriptionPlan;
    description: string;
    approvalStatus: ApprovalStatus;
    subscriptionStatus: SubscriptionStatus;
    paymentScreenshotBlobId?: string;
    address: string;
    serviceRates: Array<ServiceRate>;
    upiId: string;
    shopName: string;
    category: string;
    qrCodeBlobId?: string;
    planType: PlanType;
    photos: Array<string>;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum AuditAction {
    SubscriptionRevoke = "SubscriptionRevoke",
    WalletDeduct = "WalletDeduct",
    ProviderReject = "ProviderReject",
    SubscriptionAssign = "SubscriptionAssign",
    WalletAdd = "WalletAdd",
    ProviderApprove = "ProviderApprove",
    FeatureUnlock = "FeatureUnlock",
    FeatureLock = "FeatureLock"
}
export enum PlanType {
    pending = "pending",
    premium = "premium",
    free = "free"
}
export enum SubscriptionPlan {
    twelveMonths = "twelveMonths",
    threeMonths = "threeMonths",
    oneMonth = "oneMonth"
}
export enum SubscriptionStatus {
    active = "active",
    expired = "expired",
    pending = "pending",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    provider = "provider",
    customer = "customer"
}
export enum UserRole__1 {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_manualCredit_referralBonus_cpalead {
    manualCredit = "manualCredit",
    referralBonus = "referralBonus",
    cpalead = "cpalead"
}
export enum Variant_paid_approved_rejected {
    paid = "paid",
    approved = "approved",
    rejected = "rejected"
}
export enum Variant_pending_paid_approved_rejected {
    pending = "pending",
    paid = "paid",
    approved = "approved",
    rejected = "rejected"
}
export enum Variant_pending_reversed_credited {
    pending = "pending",
    reversed = "reversed",
    credited = "credited"
}
export interface backendInterface {
    addBanner(title: string, subtitle: string, imageUrl: string, linkUrl: string, displayOrder: bigint): Promise<bigint>;
    addCategory(name: string, emoji: string, color: string): Promise<bigint>;
    addCustomCode(name: string, code: string, btnLabel: string, icon: string, placement: string, title: string, subtitle1: string, subtitle2: string, alignment: string, layoutStyle: string): Promise<bigint>;
    addCustomSection(name: string, heading: string, placement: string, buttons: string): Promise<bigint>;
    addJob(title: string, department: string, location: string, lastDate: string, applyLink: string, category: string): Promise<bigint>;
    addNews(title: string, summary: string, imageUrl: string, link: string, category: string): Promise<bigint>;
    addScrapRate(itemName: string, ratePerKg: number, ratePerGram: number): Promise<bigint>;
    addServiceRate(userId: bigint, newRate: ServiceRate): Promise<void>;
    addShopPhoto(userId: bigint, blobId: string): Promise<void>;
    /**
     * / Add a customer under the calling provider's shop.
     * / shopId is derived from msg.caller — never accepted from the client.
     */
    addUdhaarCustomer(name: string, mobile: string, address: string): Promise<{
        __kind__: "ok";
        ok: UdhaarCustomer;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Add a transaction. shopId is derived from caller; customerId must belong to caller.
     */
    addUdhaarTransaction(customerId: string, amount: number, transactionType: string, date: string, note: string): Promise<{
        __kind__: "ok";
        ok: UdhaarTransaction;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addVideo(title: string, videoUrl: string, thumbnailUrl: string, platform: string, category: string): Promise<bigint>;
    /**
     * / Directly add or deduct balance for any user — admin only.
     */
    adminAdjustWallet(userId: bigint, amount: number, isAdd: boolean, _note: string): Promise<boolean>;
    /**
     * / Adjust (add or deduct) a user's wallet balance and log the action — admin only.
     * / Returns the new balance as Int on success.
     */
    adminAdjustWalletBalance(userId: string, amount: bigint, action: string, note: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Manually assign or revoke a subscription for a user — admin only.
     */
    adminAssignSubscription(userId: string, durationDays: bigint, action: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / List all Offer Portal users — admin only.
     */
    adminListOfferUsers(): Promise<Array<OfferUser>>;
    /**
     * / List all pending withdrawal requests — admin only.
     */
    adminListPendingWithdrawals(): Promise<Array<OfferWithdrawal>>;
    /**
     * / Resolve a withdrawal request (approve/reject/paid) — admin only.
     */
    adminResolveWithdrawal(id: bigint, newStatus: Variant_paid_approved_rejected, adminNote: string | null): Promise<boolean>;
    approveProvider(userId: bigint, plan: SubscriptionPlan): Promise<void>;
    /**
     * / Approve or reject a topup request.  On approval, funds are credited — admin only.
     */
    approveTopupRequest(requestId: bigint, approve: boolean): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    changeAdminPin(currentPinHash: string, newPinHash: string): Promise<void>;
    deleteBanner(bannerId: bigint): Promise<void>;
    deleteCategory(id: bigint): Promise<boolean>;
    deleteCustomCode(id: bigint): Promise<boolean>;
    deleteCustomSection(id: bigint): Promise<boolean>;
    deleteJob(id: bigint): Promise<boolean>;
    deleteNews(id: bigint): Promise<boolean>;
    deleteScrapRate(id: bigint): Promise<boolean>;
    deleteServiceRate(userId: bigint, rateName: string): Promise<void>;
    /**
     * / Delete a customer and all its transactions. Caller must own the customer.
     */
    deleteUdhaarCustomer(customerId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Delete a transaction. Caller must own the transaction.
     */
    deleteUdhaarTransaction(transactionId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteVideo(id: bigint): Promise<boolean>;
    editBanner(bannerId: bigint, title: string, subtitle: string, imageUrl: string, linkUrl: string, active: boolean, displayOrder: bigint): Promise<void>;
    forgotPassword(mobile: MobileNumber, securityAnswer: string, newPasswordHash: string): Promise<void>;
    getActiveBanners(): Promise<Array<Banner>>;
    getActiveProviders(): Promise<Array<ProviderProfile>>;
    /**
     * / Return the most recent `limit` audit log entries — admin only.
     */
    getAdminAuditLog(limit: bigint): Promise<Array<AuditLogEntry>>;
    getAdminConfig(): Promise<AdminConfig | null>;
    /**
     * / Return all admin settings — readable by any caller so the frontend can
     * / apply toggles and rates without an admin auth round-trip.
     */
    getAdminSettings(): Promise<AdminSettings>;
    getAllProviders(): Promise<Array<ProviderProfile>>;
    /**
     * / Return all recharge transactions (master log) — admin only.
     */
    getAllRechargeTransactions(): Promise<Array<RechargeTransaction>>;
    getAllToggles(): Promise<Array<[string, boolean]>>;
    /**
     * / Return all pending topup requests — admin only.
     */
    getAllTopupRequests(): Promise<Array<WalletTopupRequest>>;
    getAllUsers(): Promise<Array<User>>;
    /**
     * / Return all wallet balances as (userId, balance) pairs — admin only.
     */
    getAllWalletBalances(): Promise<Array<[bigint, number]>>;
    getAppSettings(): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getCategories(): Promise<Array<Category>>;
    /**
     * / Return Cloudinary cloud name and API key — public query.
     * / The API secret is NEVER returned; it stays server-side only.
     */
    getCloudinaryConfig(): Promise<{
        cloudName: string;
        apiKey: string;
    }>;
    /**
     * / Return the current commission config — public.
     */
    getCommissionConfig(): Promise<CommissionConfig>;
    /**
     * / Return the full content-locker configuration (all features).
     */
    getContentLockerConfig(): Promise<ContentLockerConfig>;
    getCustomCodes(): Promise<Array<CustomCode>>;
    getCustomSections(): Promise<Array<CustomSection>>;
    getCustomerOrders(userId: bigint): Promise<Array<Order>>;
    getJobs(): Promise<Array<JobItem>>;
    /**
     * / Get Offer Portal transaction history for a user.
     */
    getMyOfferTransactions(offerUserId: bigint): Promise<Array<OfferTransaction>>;
    /**
     * / Get withdrawal requests for an Offer Portal user.
     */
    getMyOfferWithdrawals(offerUserId: bigint): Promise<Array<OfferWithdrawal>>;
    /**
     * / Return the caller's recharge transaction history.
     */
    getMyRechargeHistory(): Promise<Array<RechargeTransaction>>;
    /**
     * / Get all receipts for the calling user.
     */
    getMyRechargeReceipts(): Promise<Array<RechargeReceipt>>;
    /**
     * / Return all topup requests submitted by the caller.
     */
    getMyTopupRequests(): Promise<Array<WalletTopupRequest>>;
    /**
     * / Return the caller's wallet balance (0.0 if no wallet yet).
     */
    getMyWalletBalance(): Promise<number>;
    getNews(): Promise<Array<NewsItem>>;
    /**
     * / Get earnings summary for an Offer Portal user.
     */
    getOfferEarningsSummary(offerUserId: bigint): Promise<{
        tier5Earnings: bigint;
        referralCode: string;
        tier4Earnings: bigint;
        pendingEarnings: bigint;
        tier3Earnings: bigint;
        tier2Earnings: bigint;
        totalEarnings: bigint;
        tier1Earnings: bigint;
    }>;
    /**
     * / Get Offer Portal global config — admin only.
     */
    getOfferPortalConfig(): Promise<OfferPortalConfig>;
    /**
     * / Get Offer Portal global config — public (no auth required).
     * / Returns the config so any visitor can check whether the portal is enabled
     * / before showing the login/signup UI.  Webhook secrets are NOT included
     * / in this method — admin-only fields remain protected via getOfferPortalConfig.
     */
    getOfferPortalConfigPublic(): Promise<{
        adminProfitPct: bigint;
        isEnabled: boolean;
        userProfitPct: bigint;
    }>;
    getOrderById(orderId: bigint): Promise<Order | null>;
    getOrdersByStatus(userId: bigint, status: string): Promise<Array<Order>>;
    /**
     * / Returns the current payment configuration.
     * / Readable by all callers — providers and riders need to display UPI/QR.
     */
    getPaymentConfig(): Promise<PaymentConfig>;
    /**
     * / Alias for getProvidersPendingApproval — kept for frontend compatibility.
     */
    getPendingApprovals(): Promise<Array<ProviderProfile>>;
    getProviderOrders(userId: bigint): Promise<Array<Order>>;
    getProviderProfile(userId: bigint): Promise<ProviderProfile | null>;
    getProvidersByCategory(category: string): Promise<Array<ProviderProfile>>;
    getProvidersPendingApproval(): Promise<Array<ProviderProfile>>;
    getRecentUsers(): Promise<Array<User>>;
    /**
     * / Return the current recharge API config — admin only.
     */
    getRechargeApiConfig(): Promise<RechargeApiConfig>;
    /**
     * / Get receipt for a specific recharge transaction.
     */
    getRechargeReceipt(txnId: bigint): Promise<RechargeReceipt | null>;
    /**
     * / Return whether recharge service is enabled — public.
     */
    getRechargeServiceEnabled(): Promise<boolean>;
    getScrapRates(): Promise<Array<ScrapRate>>;
    /**
     * / Get SMS (Fast2SMS) config — admin only.
     */
    getSmsConfig(): Promise<SmsConfig>;
    getSubscriptionPricing(): Promise<SubscriptionPricing | null>;
    /**
     * / Return balance for a customer. Caller must own the customer.
     */
    getUdhaarBalance(customerId: string): Promise<{
        __kind__: "ok";
        ok: number;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Return only customers belonging to the calling provider.
     * / shopId is derived from msg.caller — no user-supplied filter accepted.
     */
    getUdhaarCustomers(): Promise<Array<UdhaarCustomer>>;
    /**
     * / Return transactions for a customer. Caller must own the customer.
     */
    getUdhaarTransactions(customerId: string): Promise<{
        __kind__: "ok";
        ok: Array<UdhaarTransaction>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getUserById(userId: bigint): Promise<User | null>;
    getUserByMobile(mobile: MobileNumber): Promise<User | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    /**
     * / Get the current subscription status for a given user.
     */
    getUserSubscriptionStatus(userId: string): Promise<UserSubscription | null>;
    getUsersByRole(role: UserRole): Promise<Array<User>>;
    getVideos(): Promise<Array<VideoItem>>;
    /**
     * / Return wallet balance for any userId — admin only.
     */
    getWalletBalanceByUserId(userId: bigint): Promise<number>;
    /**
     * / Initiate a mobile recharge.  Auto-calculates commission; deducts netCost
     * / from caller's wallet.  Returns new transaction ID.
     */
    initiateRecharge(mobile: string, operator: string, circle: string, amount: number): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    login(mobile: MobileNumber, passwordHash: string): Promise<User>;
    /**
     * / Login to the Offer Portal.
     */
    loginOfferUser(email: string, passwordHash: string): Promise<OfferUser>;
    /**
     * / Mark a transaction as paid. Caller must own the transaction.
     */
    markUdhaarTransactionPaid(transactionId: string): Promise<{
        __kind__: "ok";
        ok: UdhaarTransaction;
    } | {
        __kind__: "err";
        err: string;
    }>;
    placeOrder(providerId: bigint, customerName: string, description: string, orderType: string, imageUrl: string | null): Promise<bigint>;
    /**
     * / Process a CPALead postback: verify secret, split profit, credit earnings.
     * / Also triggers 3-tier MLM referral commissions (5%/2%/1%) to ancestors.
     */
    processCpaLeadPostback(offerUserId: bigint, grossAmount: bigint, webhookSecret: string): Promise<boolean>;
    /**
     * / Refund a Failed recharge — restores netCost to user wallet — admin only.
     */
    refundRecharge(txId: bigint): Promise<boolean>;
    /**
     * / Register a new Offer Portal user (isolated from main user DB).
     * / Returns #ok(OfferUser) on success or #err("already_registered") for duplicate email
     * / so the frontend can show a clean toast instead of a red error code.
     */
    registerOfferUser(email: string, passwordHash: string, referralCode: string | null): Promise<{
        __kind__: "ok";
        ok: OfferUser;
    } | {
        __kind__: "err";
        err: string;
    }>;
    registerUser(name: string, mobile: MobileNumber, passwordHash: string, role: UserRole, securityQuestion: string, securityAnswer: string): Promise<void>;
    rejectProvider(userId: bigint): Promise<void>;
    /**
     * / Remove a locked feature by id — admin only.
     */
    removeLockedFeature(featureId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    removeShopPhoto(userId: bigint, blobId: string): Promise<void>;
    requestApproval(): Promise<void>;
    /**
     * / Submit a UPI withdrawal request from the Offer Portal.
     */
    requestOfferWithdrawal(offerUserId: bigint, upiId: string, amount: bigint): Promise<bigint>;
    /**
     * / Request admin to top-up your wallet.  Returns the new request ID.
     */
    requestWalletTopup(amount: number, note: string): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsers(searchText: string): Promise<Array<User>>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    /**
     * / Create or update a locked feature — admin only.
     */
    setLockedFeature(featureName: string, cpaOfferLink: string, secretKey: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Updates the payment configuration (admin only).
     */
    setPaymentConfig(config: PaymentConfig): Promise<boolean>;
    setPlanType(userId: bigint, planType: PlanType): Promise<void>;
    /**
     * / Enable or disable the recharge service — admin only.
     */
    setRechargeServiceEnabled(enabled: boolean): Promise<boolean>;
    toggleCustomSection(id: bigint, enabled: boolean): Promise<boolean>;
    updateAdminConfig(newConfig: AdminConfig): Promise<void>;
    /**
     * / Replace ALL admin settings in one atomic call — admin only.
     * / All existing field values are overwritten with the supplied record.
     */
    updateAdminSettings(settings: AdminSettings): Promise<boolean>;
    updateAppSettings(json: string): Promise<void>;
    updateCategory(id: bigint, name: string, emoji: string, color: string, enabled: boolean): Promise<boolean>;
    /**
     * / Update commission config — admin only.
     * / Validates: retailerPct + adminPct must equal globalPct.
     */
    updateCommissionConfig(globalPct: number, retailerPct: number, adminPct: number): Promise<boolean>;
    /**
     * / Save the CPAGrip API key in canister state — admin only.
     * / Also mirrors the key into the live offerPortalConfig so it takes effect immediately.
     */
    updateCpagripApiKey(apiKey: string): Promise<boolean>;
    updateCustomCode(id: bigint, name: string, code: string, btnLabel: string, icon: string, placement: string, enabled: boolean, title: string, subtitle1: string, subtitle2: string, alignment: string, layoutStyle: string): Promise<boolean>;
    updateCustomSection(id: bigint, name: string, heading: string, placement: string, buttons: string, enabled: boolean): Promise<boolean>;
    updateJob(id: bigint, title: string, department: string, location: string, lastDate: string, applyLink: string, category: string, enabled: boolean): Promise<boolean>;
    /**
     * / Update only Ludo / Rewards settings — admin only.
     */
    updateLudoSettings(ludoEnabled: boolean, rewardsEnabled: boolean, pointsPerAd: bigint, redemptionRate: bigint, minWithdrawal: bigint): Promise<boolean>;
    updateNews(id: bigint, title: string, summary: string, imageUrl: string, link: string, category: string, enabled: boolean): Promise<boolean>;
    /**
     * / Update Offer Portal config (toggle, offer wall secret, profit split) — admin only.
     * / Returns #ok(true) on success, #err(reason) if validation fails (e.g. API key too short).
     */
    updateOfferPortalConfig(isEnabled: boolean, cpaLeadWebhookSecret: string, cpagripApiKey: string, adminProfitPct: bigint, userProfitPct: bigint): Promise<{
        __kind__: "ok";
        ok: boolean;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateOrderStatus(orderId: bigint, status: string): Promise<void>;
    updateProviderProfile(userId: bigint, shopName: string, description: string, address: string, category: string): Promise<void>;
    /**
     * / Extended updateProviderProfile to include upiId and qrCodeBlobId
     */
    updateProviderProfileFull(userId: bigint, shopName: string, description: string, address: string, category: string, upiId: string, qrCodeBlobId: string | null): Promise<void>;
    /**
     * / Save recharge API config — admin only.
     */
    updateRechargeApiConfig(apiUrl: string, apiKey: string, responseParam: string, isActive: boolean, autoRefundEnabled: boolean): Promise<boolean>;
    /**
     * / Update the status of a recharge transaction — admin only.
     * / Auto-refund: if status = "Failed" and autoRefundEnabled, automatically refunds netCost.
     * / Receipt: if status = "Success", generates a digital receipt.
     * / SMS: if smsConfig.isEnabled, sends an alert (fire-and-forget).
     */
    updateRechargeStatus(txId: bigint, status: string): Promise<boolean>;
    /**
     * / Update only the 5-tier referral rates — admin only.
     */
    updateReferralRates(level1Pct: bigint, level2Pct: bigint, level3Pct: bigint, level4Pct: number, level5Pct: number): Promise<boolean>;
    updateScrapRate(id: bigint, itemName: string, ratePerKg: number, ratePerGram: number, enabled: boolean): Promise<boolean>;
    /**
     * / Update SMS config — admin only.
     */
    updateSmsConfig(fast2smsApiKey: string, senderId: string, isEnabled: boolean): Promise<boolean>;
    updateSubscriptionPricing(newPricing: SubscriptionPricing): Promise<void>;
    updateToggle(toggleName: string, value: boolean): Promise<void>;
    /**
     * / Update a customer. Caller must own the customer (shopId check).
     */
    updateUdhaarCustomer(customerId: string, name: string, mobile: string, address: string): Promise<{
        __kind__: "ok";
        ok: UdhaarCustomer;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Update a transaction. Caller must own the transaction (shopId check).
     */
    updateUdhaarTransaction(transactionId: string, amount: number, transactionType: string, date: string, note: string): Promise<{
        __kind__: "ok";
        ok: UdhaarTransaction;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateVideo(id: bigint, title: string, videoUrl: string, thumbnailUrl: string, platform: string, category: string, enabled: boolean): Promise<boolean>;
    uploadPaymentScreenshot(userId: bigint, blobId: string): Promise<void>;
    verifyAdminPin(pinHash: string): Promise<boolean>;
    /**
     * / User-facing: verify a plain-text unlock key for a named feature.
     */
    verifyUnlockKey(featureName: string, userKey: string): Promise<VerifyKeyResult>;
}
