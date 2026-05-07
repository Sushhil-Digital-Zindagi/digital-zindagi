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
export interface LeaderboardEntry {
    displayName: string;
    userId: Principal;
    points: bigint;
}
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
export interface AdminConfig {
    email: string;
    adminName: string;
    upiId: string;
    mobile: MobileNumber;
    qrCodeBlobId: ExternalBlob;
}
export interface CryptoCoin {
    id: string;
    isListed: boolean;
    name: string;
    createdAt: bigint;
    coinGeckoId: string;
    logoUrl: string;
    symbol: string;
}
export interface ReferralStats {
    code: string;
    count: bigint;
    pointsEarned: bigint;
    badge: string;
}
export interface CreatorEarningsSummary {
    payments: Array<LockedMessagePayment>;
    pendingPayouts: bigint;
    totalEarnings: bigint;
}
export interface ChatStats {
    totalMessages: bigint;
    storiesPosted: bigint;
    activeChats: bigint;
    totalUsers: bigint;
}
export interface AutoReply {
    messages: Array<string>;
    userId: Principal;
    isEnabled: boolean;
}
export interface UpiEntry {
    id: string;
    isActive: boolean;
    upiName: string;
    upiId: string;
}
export interface QrEntry {
    id: string;
    qrUrl: string;
    isActive: boolean;
    qrLabel: string;
}
export type ShortcutCreator = {
    __kind__: "admin";
    admin: null;
} | {
    __kind__: "user";
    user: Principal;
};
export interface DepositRequest {
    id: string;
    status: ApprovalStatus;
    userId: string;
    screenshotUrl?: string;
    createdAt: bigint;
    rejectionReason?: string;
    adminNote?: string;
    utrNumber: string;
    amount: number;
    resolvedAt?: bigint;
}
export interface ChatMessage {
    id: bigint;
    lockPrice?: bigint;
    status: MessageStatus;
    content: string;
    unlockedBy: Array<Principal>;
    deletedForEveryoneAt?: bigint;
    lockedFile?: LockedFile;
    createdAt: bigint;
    deletedForSenderAt?: bigint;
    mediaUrl?: string;
    messageType: MessageType;
    conversationId: bigint;
    lockCurrency?: string;
    isVanish: boolean;
    isLocked: boolean;
    replyToId?: bigint;
    reactions: Array<MessageReaction>;
    senderId: Principal;
    scheduledAt?: bigint;
}
export interface CryptoTransaction {
    id: string;
    status: TxStatus;
    priceAtTime?: number;
    feeAmount?: number;
    netAmount: number;
    userId: string;
    createdAt: bigint;
    coinSymbol?: string;
    adminNote?: string;
    updatedAt: bigint;
    totalAmount: number;
    quantity?: number;
    feePercent?: number;
    txType: TxType;
    coinId?: string;
}
export interface Note {
    id: bigint;
    title: string;
    content: string;
    subject: string;
    ownerId: Principal;
    createdAt: bigint;
    updatedAt: bigint;
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
export interface LockedFileTask {
    question: string;
    answer: string;
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
export interface CryptoWallet {
    dailyRewardStreak: bigint;
    mpinHash: string;
    referralCode: string;
    balance: number;
    mpinLockedUntil: bigint;
    userId: string;
    mpinFailedAttempts: bigint;
    createdAt: bigint;
    lastDailyRewardClaimed: bigint;
    updatedAt: bigint;
    hasCompletedFirstTrade: boolean;
    totalWithdrawn: number;
    totalDeposited: number;
    mpinSetAt: bigint;
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
export interface MarketListing {
    id: bigint;
    title: string;
    photoUrls: Array<string>;
    expiresAt?: bigint;
    city: string;
    createdAt: bigint;
    description: string;
    isActive: boolean;
    whatsappContact: string;
    isFeatured: boolean;
    category: MarketCategory;
    sellerId: Principal;
    price: bigint;
}
export interface Story {
    id: bigint;
    expiresAt: bigint;
    viewerIds: Array<Principal>;
    authorId: Principal;
    createdAt: bigint;
    mediaUrl?: string;
    textContent?: string;
}
export interface StopLossRule {
    id: string;
    quantityToSell: number;
    userId: string;
    createdAt: bigint;
    coinSymbol: string;
    limitPriceInr: number;
    isActive: boolean;
    triggeredAt?: bigint;
    coinId: string;
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
export interface PointsHistoryEntry {
    at: bigint;
    action: string;
    points: bigint;
}
export interface ChatAdminSettings {
    voiceToTextEnabled: boolean;
    storiesEnabled: boolean;
    payToUnlockEnabled: boolean;
    chatEnabled: boolean;
    vanishModeEnabled: boolean;
    referralEnabled: boolean;
    autoReplyEnabled: boolean;
    pointsPerMessage: bigint;
    stripeSecretKey: string;
    pointsPerLogin: bigint;
    shortcutsEnabled: boolean;
    pointsPerReferral: bigint;
    pointsPerStory: bigint;
    rewardPointsEnabled: boolean;
    ghostModeEnabled: boolean;
    stripePublishableKey: string;
    schedulingEnabled: boolean;
    studyModeEnabled: boolean;
    openAiApiKey: string;
    broadcastEnabled: boolean;
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
export interface LockedMessagePayment {
    id: bigint;
    status: LockedMessageStatus;
    unlockedAt?: bigint;
    messageId: string;
    createdAt: bigint;
    creatorId: Principal;
    upiTxnRef?: string;
    currency: string;
    buyerId: Principal;
    stripePaymentIntentId?: string;
    amount: bigint;
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
export interface Conversation {
    id: bigint;
    lastMessageAt: bigint;
    lastMessageId?: bigint;
    isGroup: boolean;
    adminIds: Array<Principal>;
    createdAt: bigint;
    groupPhotoUrl?: string;
    participantIds: Array<Principal>;
    groupName?: string;
}
export interface UserProfile {
    userId: bigint;
    name: string;
    role: UserRole;
    mobile: MobileNumber;
}
export type MobileNumber = string;
export interface VaultItem {
    id: bigint;
    isViewOnce: boolean;
    title: string;
    expiresAt?: bigint;
    ownerId: Principal;
    createdAt: bigint;
    mediaUrl: string;
    viewedAt?: bigint;
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
export interface LocalNewsItem {
    id: bigint;
    title: string;
    postedBy: Principal;
    content: string;
    createdAt: bigint;
    imageUrl?: string;
}
export interface UserChatProfile {
    bio?: string;
    referralCode: string;
    username?: string;
    displayName: string;
    city?: string;
    userId: Principal;
    createdAt: bigint;
    referralCount: bigint;
    ghostModeEnabled: boolean;
    badge: Badge;
    studyModeEnabled: boolean;
    pointsBalance: bigint;
    profilePhotoUrl?: string;
    autoReply?: AutoReply;
    studyModeSelectedChats: Array<bigint>;
}
export interface AdminSettingsExtended {
    pointsPerAd: bigint;
    cpagripOfferWallName: string;
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
    cpagripWebhookSecret: string;
    redemptionRate: bigint;
    udhaarBookEnabled: boolean;
    cloudinaryApiSecret: string;
}
export interface ScrapRate {
    id: bigint;
    ratePerKg: number;
    enabled: boolean;
    ratePerGram: number;
    itemName: string;
}
export interface CryptoWithdrawal {
    id: string;
    status: ApprovalStatus;
    userEmail: string;
    userId: string;
    createdAt: bigint;
    adminNote?: string;
    upiId: string;
    amount: number;
    resolvedAt?: bigint;
}
export interface PremiumSubscription {
    startedAt: bigint;
    paymentMethod: PaymentMethod;
    expiresAt: bigint;
    stripeSubscriptionId?: string;
    userId: Principal;
    plan: PremiumPlan;
    isActive: boolean;
}
export interface Category {
    id: bigint;
    name: string;
    color: string;
    emoji: string;
    enabled: boolean;
}
export interface SupportTicket {
    id: string;
    status: TicketStatus;
    userEmail: string;
    subject: string;
    userId: string;
    createdAt: bigint;
    description: string;
    updatedAt: bigint;
    category: TicketCategory;
    priority: TicketPriority;
}
export interface PaymentConfig {
    razorpayKeyId: string;
    razorpayKeySecret: string;
    upiVpa: string;
    qrCodeUrl: string;
}
export interface TicketReply {
    id: string;
    authorId: string;
    createdAt: bigint;
    authorRole: Variant_admin_user;
    ticketId: string;
    message: string;
}
export interface ChatShortcut {
    id: bigint;
    isGlobal: boolean;
    content: string;
    trigger: string;
    createdBy: ShortcutCreator;
    category: ShortcutCategory;
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
export interface UpiPaymentRequest {
    id: bigint;
    status: ApprovalStatus;
    userId: Principal;
    createdAt: bigint;
    plan: PremiumPlan;
    upiTxnRef: string;
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
export interface ScheduledMessage {
    id: bigint;
    status: ScheduledMessageStatus;
    content: string;
    conversationId: bigint;
    senderId: Principal;
    scheduledAt: bigint;
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
export interface MessageReaction {
    userIds: Array<Principal>;
    emoji: string;
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
    mobile?: string;
    tier1Earnings: bigint;
}
export interface RewardPoints {
    userId: Principal;
    history: Array<PointsHistoryEntry>;
    totalPoints: bigint;
}
export interface CryptoInvestConfig {
    buyFeePercent: number;
    highRiskThreshold: number;
    isEnabled: boolean;
    referralBonusAmount: number;
    maxWithdrawal: number;
    minWithdrawal: number;
    upiId: string;
    referralBonusEnabled: boolean;
    qrCodeUrl: string;
    sellFeePercent: number;
    dailyRewardAmount: number;
    isDailyRewardEnabled: boolean;
}
export interface PortfolioHolding {
    id: string;
    userId: string;
    coinSymbol: string;
    totalCost: number;
    updatedAt: bigint;
    coinName: string;
    quantity: number;
    coinId: string;
    avgBuyPrice: number;
}
export interface PremiumPrices {
    annual: bigint;
    quarterly: bigint;
    monthly: bigint;
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
export interface LockedFile {
    unlockedBy: Array<Principal>;
    task?: LockedFileTask;
    lockType: LockType;
    passwordHash?: string;
    fileUrl: string;
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
export enum Badge {
    bronze = "bronze",
    gold = "gold",
    none = "none",
    diamond = "diamond",
    silver = "silver"
}
export enum LockType {
    password = "password",
    none = "none",
    task = "task"
}
export enum LockedMessageStatus {
    pending = "pending",
    completed = "completed",
    failed = "failed"
}
export enum MarketCategory {
    vehicles = "vehicles",
    other = "other",
    jobs = "jobs",
    property = "property",
    mobile = "mobile",
    services = "services",
    electronics = "electronics"
}
export enum MessageStatus {
    read = "read",
    sent = "sent",
    delivered = "delivered"
}
export enum MessageType {
    voiceText = "voiceText",
    youtubeLink = "youtubeLink",
    file = "file",
    text = "text",
    locked = "locked",
    scheduledMessage = "scheduledMessage",
    image = "image",
    reply = "reply",
    reaction = "reaction"
}
export enum PaymentMethod {
    upi = "upi",
    stripe = "stripe"
}
export enum PlanType {
    pending = "pending",
    premium = "premium",
    free = "free"
}
export enum PremiumPlan {
    annual = "annual",
    quarterly = "quarterly",
    monthly = "monthly"
}
export enum ScheduledMessageStatus {
    cancelled = "cancelled",
    pending = "pending",
    sent = "sent"
}
export enum ShortcutCategory {
    custom = "custom",
    greet = "greet",
    business = "business",
    formula = "formula"
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
export enum TicketCategory {
    coinInquiry = "coinInquiry",
    general = "general",
    withdrawalQuery = "withdrawalQuery",
    bugReport = "bugReport"
}
export enum TicketPriority {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum TicketStatus {
    resolved = "resolved",
    open = "open",
    inProgress = "inProgress"
}
export enum TxStatus {
    pending = "pending",
    completed = "completed",
    pendingApproval = "pendingApproval",
    approved = "approved",
    rejected = "rejected",
    failed = "failed"
}
export enum TxType {
    buy = "buy",
    sell = "sell",
    deposit = "deposit",
    withdrawal = "withdrawal",
    dailyReward = "dailyReward"
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
export enum Variant_admin_user {
    admin = "admin",
    user = "user"
}
export enum Variant_last50_last24h {
    last50 = "last50",
    last24h = "last24h"
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
    activateStripePremium(plan: PremiumPlan, stripeSubscriptionId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addBanner(title: string, subtitle: string, imageUrl: string, linkUrl: string, displayOrder: bigint): Promise<bigint>;
    addCategory(name: string, emoji: string, color: string): Promise<bigint>;
    addChatGroupMembers(conversationId: bigint, memberIds: Array<Principal>): Promise<boolean>;
    addChatPersonalShortcut(trigger: string, content: string, category: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addChatVaultItem(mediaUrl: string, title: string, isViewOnce: boolean, expiresAt: bigint | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addCoin(adminToken: string | null, name: string, symbol: string, coinGeckoId: string, logoUrl: string): Promise<{
        __kind__: "ok";
        ok: CryptoCoin;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addCustomCode(name: string, code: string, btnLabel: string, icon: string, placement: string, title: string, subtitle1: string, subtitle2: string, alignment: string, layoutStyle: string): Promise<bigint>;
    addCustomSection(name: string, heading: string, placement: string, buttons: string): Promise<bigint>;
    addJob(title: string, department: string, location: string, lastDate: string, applyLink: string, category: string): Promise<bigint>;
    /**
     * / Add a manager by mobile number — admin only.
     * / Managers have restricted access (News, Jobs, Videos).
     */
    addManager(mobile: string): Promise<boolean>;
    addNews(title: string, summary: string, imageUrl: string, link: string, category: string): Promise<bigint>;
    addQrEntry(adminToken: string | null, qrUrl: string, qrLabel: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
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
    addUpiEntry(adminToken: string | null, upiId: string, upiName: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addVideo(title: string, videoUrl: string, thumbnailUrl: string, platform: string, category: string): Promise<bigint>;
    /**
     * / Adjust wallet balance for a user by userId (Nat) — admin only.
     * / Alias so both adminAdjustWallet and adjustWalletBalance work.
     */
    adjustWalletBalance(userId: bigint, amount: number, isAdd: boolean, note: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminAddChatShortcut(trigger: string, content: string, category: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminAddNewsItem(title: string, content: string, imageUrl: string | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Directly add or deduct balance for any user — admin only.
     */
    adminAdjustWallet(userId: bigint, amount: number, isAdd: boolean, _note: string): Promise<boolean>;
    /**
     * / Adjust (add or deduct) a user's wallet balance and log the action — admin only.
     * / Returns the new balance as Int on success.
     */
    adminAdjustWalletBalance(adminToken: string | null, userId: string, amount: bigint, action: string, note: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminApproveCryptoWithdrawal(adminToken: string | null, withdrawalId: string, adminNote: string | null): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminApproveDeposit(adminToken: string | null, depositId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminApproveUpiPremium(requestId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Approve a UPI unlock request — admin only.
     */
    adminApproveUpiUnlock(paymentId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Manually assign or revoke a subscription for a user — admin only.
     */
    adminAssignSubscription(adminToken: string | null, userId: string, durationDays: bigint, action: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminBroadcastChatMessage(content: string): Promise<boolean>;
    adminDeleteChatShortcut(id: bigint): Promise<boolean>;
    adminDeleteNewsItem(id: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminGetAllCryptoUsers(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<CryptoWallet>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminGetAllStopLossRules(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<StopLossRule>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminGetAllTickets(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<SupportTicket>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminGetAllWithdrawals(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<CryptoWithdrawal>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminGetChatStats(): Promise<ChatStats>;
    adminGetCryptoStats(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: {
            totalCommissions: number;
            totalVolume: number;
            totalUsers: bigint;
            totalBalance: number;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminGetUpiPremiumRequests(): Promise<Array<UpiPaymentRequest>>;
    /**
     * / Return all pending UPI unlock requests — admin only.
     * / Returns empty array for non-admin callers (never traps).
     */
    adminGetUpiUnlockRequests(): Promise<Array<LockedMessagePayment>>;
    /**
     * / List all Offer Portal users — admin only.
     * / Accepts adminToken for email+password auth flow (anonymous principal friendly).
     * / Returns #ok([users]) for admin, #err("Unauthorized") for non-admin — never traps.
     */
    adminListOfferUsers(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<OfferUser>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / List all pending withdrawal requests — admin only.
     * / Accepts adminToken for email+password auth flow.
     * / Returns #ok([withdrawals]) for admin, #err("Unauthorized") for non-admin — never traps.
     */
    adminListPendingWithdrawals(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<OfferWithdrawal>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminRejectCryptoWithdrawal(adminToken: string | null, withdrawalId: string, adminNote: string | null): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminRejectDeposit(adminToken: string | null, depositId: string, adminNote: string | null): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminRejectUpiPremium(requestId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Reject a UPI unlock request — admin only.
     */
    adminRejectUpiUnlock(paymentId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminResetMpin(adminToken: string | null, userId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin-authenticated direct password reset for an Offer Portal user (no OTP).
     * / callerEmail and callerPasswordHash must match the admin credentials.
     */
    adminResetOfferPassword(callerEmail: string, callerPasswordHash: string, targetEmail: string, newPasswordHash: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Resolve a withdrawal request (approve/reject/paid) — admin only.
     * / Accepts adminToken for email+password auth flow.
     * / Returns #ok(true) on success, #err("Unauthorized") for non-admin — never traps.
     */
    adminResolveWithdrawal(adminToken: string | null, id: bigint, newStatus: Variant_paid_approved_rejected, adminNote: string | null): Promise<{
        __kind__: "ok";
        ok: boolean;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSeedChatDemoData(): Promise<boolean>;
    adminSetPremiumPrices(monthly: bigint, quarterly: bigint, annual: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    approveProvider(adminToken: string | null, userId: bigint, plan: SubscriptionPlan): Promise<void>;
    /**
     * / Approve or reject a topup request.  On approval, funds are credited — admin only.
     */
    approveTopupRequest(requestId: bigint, approve: boolean): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    awardChatPoints(action: string, points: bigint): Promise<boolean>;
    blockCryptoUser(adminToken: string | null, userId: string, isBlocked: boolean, reason: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    buyCoin(userId: string, coinId: string, amountInFunds: number, currentPrice: number, mpin: string): Promise<{
        __kind__: "ok";
        ok: CryptoTransaction;
    } | {
        __kind__: "err";
        err: string;
    }>;
    cancelChatScheduledMessage(id: bigint): Promise<boolean>;
    changeAdminPin(currentPinHash: string, newPinHash: string): Promise<void>;
    changeMpin(userId: string, currentMpin: string, newMpin: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Validate an admin session token — public query.
     * / Returns true if the token is valid and not expired.
     */
    checkAdminToken(token: string): Promise<boolean>;
    /**
     * / Called from frontend when a coin price update arrives.
     * / Finds all active stop-loss rules for the coin where limitPrice >= currentPrice,
     * / executes a sell for each (without MPIN — system-triggered), and marks rules as triggered.
     */
    checkAndExecuteStopLoss(coinId: string, currentPrice: number): Promise<{
        triggered: bigint;
    }>;
    claimDailyReward(userId: string): Promise<{
        __kind__: "ok";
        ok: number;
    } | {
        __kind__: "err";
        err: string;
    }>;
    cleanupExpiredChatStories(): Promise<bigint>;
    cleanupExpiredChatVaultItems(): Promise<bigint>;
    /**
     * / Submit a UPI transaction reference for admin approval to unlock a message.
     */
    confirmUpiUnlock(messageId: bigint, upiTxnRef: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createChatGroup(name: string, memberIds: Array<Principal>, photoUrl: string | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createListing(title: string, description: string, price: bigint, category: MarketCategory, city: string, photoUrls: Array<string>, whatsappContact: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createSupportTicket(userId: string, userEmail: string, subject: string, description: string, priority: string, category: string): Promise<{
        __kind__: "ok";
        ok: SupportTicket;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Create a Stripe PaymentIntent for a locked message and return clientSecret.
     */
    createUnlockPaymentIntent(messageId: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteBanner(bannerId: bigint): Promise<void>;
    deleteCategory(id: bigint): Promise<boolean>;
    deleteChatMessage(messageId: bigint, deleteForEveryone: boolean): Promise<boolean>;
    deleteChatNote(id: bigint): Promise<boolean>;
    deleteChatShortcut(id: bigint): Promise<boolean>;
    deleteChatVaultItem(id: bigint): Promise<boolean>;
    deleteCoin(adminToken: string | null, id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteCustomCode(id: bigint): Promise<boolean>;
    deleteCustomSection(id: bigint): Promise<boolean>;
    deleteJob(id: bigint): Promise<boolean>;
    deleteListing(id: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteNews(id: bigint): Promise<boolean>;
    deleteScrapRate(id: bigint): Promise<boolean>;
    deleteServiceRate(userId: bigint, rateName: string): Promise<void>;
    deleteStopLossRule(userId: string, ruleId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
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
    featureListing(id: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    forgotPassword(mobile: MobileNumber, securityAnswer: string, newPasswordHash: string): Promise<void>;
    forwardChatMessage(messageId: bigint, toConversationId: bigint): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    freezeCryptoUser(adminToken: string | null, userId: string, isFrozen: boolean, reason: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getActiveBanners(): Promise<Array<Banner>>;
    getActiveChatStories(): Promise<Array<Story>>;
    /**
     * / Public query — no auth required. Returns the currently active UPI ID, name, and QR URL.
     */
    getActivePaymentInfo(): Promise<{
        qrUrl: string;
        upiName: string;
        upiId: string;
    }>;
    getActiveProviders(): Promise<Array<ProviderProfile>>;
    /**
     * / Return the most recent `limit` audit log entries — admin only.
     * / Returns empty array if caller is not admin (never traps).
     */
    getAdminAuditLog(adminToken: string | null, limit: bigint): Promise<Array<AuditLogEntry>>;
    getAdminConfig(): Promise<AdminConfig | null>;
    /**
     * / Return all admin settings — readable by any caller so the frontend can
     * / apply toggles and rates without an admin auth round-trip.
     */
    getAdminSettings(): Promise<AdminSettingsExtended>;
    /**
     * / Return the current AdMob configuration — admin only.
     * / Returns empty strings for non-admin callers (never traps).
     */
    getAdmobConfig(): Promise<{
        rewardedUnitId: string;
        appId: string;
        ludoBannerId: string;
        ludoInterstitialId: string;
        interstitialId: string;
        bannerUnitId: string;
    }>;
    /**
     * / Return AdMob unit IDs that are safe for the frontend to use — public.
     * / The App ID is intentionally omitted (only needed native-side).
     */
    getAdmobConfigPublic(): Promise<{
        rewardedUnitId: string;
        ludoBannerId: string;
        ludoInterstitialId: string;
        interstitialId: string;
        bannerUnitId: string;
    }>;
    getAllCoins(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<CryptoCoin>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAllProviders(): Promise<Array<ProviderProfile>>;
    /**
     * / Return all recharge transactions (master log) — admin only.
     * / Returns empty array for non-admin callers (never traps).
     */
    getAllRechargeTransactions(): Promise<Array<RechargeTransaction>>;
    getAllToggles(): Promise<Array<[string, boolean]>>;
    /**
     * / Return all pending topup requests — admin only.
     * / Returns empty array for non-admin callers (never traps).
     */
    getAllTopupRequests(): Promise<Array<WalletTopupRequest>>;
    getAllUsers(): Promise<Array<User>>;
    /**
     * / Return all wallet balances as (userId, balance) pairs — admin only.
     * / Returns empty array for non-admin callers (never traps).
     */
    getAllWalletBalances(): Promise<Array<[bigint, number]>>;
    getAppSettings(): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getCategories(): Promise<Array<Category>>;
    getChatAdminSettings(): Promise<ChatAdminSettings>;
    getChatNotes(): Promise<Array<Note>>;
    getChatPointsLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getChatScheduledMessages(): Promise<Array<ScheduledMessage>>;
    getChatShortcuts(): Promise<Array<ChatShortcut>>;
    getChatUserProfile(userId: Principal): Promise<UserChatProfile | null>;
    getChatVaultItems(): Promise<Array<VaultItem>>;
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
    getConversationMessages(conversationId: bigint, limit: bigint, before: bigint | null): Promise<Array<ChatMessage>>;
    /**
     * / Return the full CPAGrip settings (apiKey + webhookSecret + offerWallName) — admin only.
     * / Returns empty strings for non-admin callers (never traps).
     */
    getCpagripSettings(adminToken: string | null): Promise<{
        webhookSecret: string;
        offerWallName: string;
        apiKey: string;
    }>;
    /**
     * / Return the caller's pay-to-unlock creator earnings.
     */
    getCreatorEarnings(): Promise<CreatorEarningsSummary>;
    getCryptoConfig(adminToken: string | null): Promise<CryptoInvestConfig>;
    getCryptoConfigPublic(): Promise<{
        isEnabled: boolean;
    }>;
    getCustomCodes(): Promise<Array<CustomCode>>;
    getCustomSections(): Promise<Array<CustomSection>>;
    getCustomerOrders(userId: bigint): Promise<Array<Order>>;
    getDepositRequests(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<DepositRequest>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getJobs(): Promise<Array<JobItem>>;
    getListedCoins(): Promise<Array<CryptoCoin>>;
    getListings(city: string | null, category: MarketCategory | null): Promise<Array<MarketListing>>;
    getLockedFileUrl(messageId: bigint): Promise<string | null>;
    /**
     * / Get all managers — admin only.
     * / Returns empty array for non-admin callers (never traps).
     */
    getManagers(): Promise<Array<string>>;
    getMyChatConversations(): Promise<Array<Conversation>>;
    getMyChatPoints(): Promise<RewardPoints>;
    getMyChatProfile(): Promise<UserChatProfile | null>;
    getMyChatReferralCode(): Promise<string>;
    getMyChatReferralStats(): Promise<ReferralStats>;
    getMyListings(): Promise<Array<MarketListing>>;
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
    getMySubscription(): Promise<PremiumSubscription | null>;
    /**
     * / Return all topup requests submitted by the caller.
     */
    getMyTopupRequests(): Promise<Array<WalletTopupRequest>>;
    /**
     * / Return the caller's wallet balance (0.0 if no wallet yet).
     */
    getMyWalletBalance(): Promise<number>;
    getNews(): Promise<Array<NewsItem>>;
    getNewsItems(): Promise<Array<LocalNewsItem>>;
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
     * / Get Offer Portal global config.
     * / Admin callers: receive full config including API keys and webhook secrets.
     * / Non-admin callers (including anonymous): NEVER TRAP — receive safe public config
     * / with isEnabled and postbackUrl only. API keys and secrets are stripped.
     */
    getOfferPortalConfig(adminToken: string | null): Promise<{
        cpaLeadWebhookSecret: string;
        cpagripOfferWallName: string;
        cpagripApiKey: string;
        postbackUrl: string;
        adminProfitPct: bigint;
        isEnabled: boolean;
        isAdmin: boolean;
        cpagripWebhookSecret: string;
        userProfitPct: bigint;
    }>;
    /**
     * / Get safe Offer Portal config for any user (no auth required) — alias for getOfferPortalConfigPublic.
     * / Returns ONLY non-sensitive fields: isEnabled, adminProfitPct, userProfitPct.
     * / No API keys, no webhook secrets. Never traps for any caller.
     */
    getOfferPortalConfigForUser(): Promise<{
        adminProfitPct: bigint;
        isEnabled: boolean;
        userProfitPct: bigint;
    }>;
    /**
     * / Get the full Offer Portal config including cpagripWebhookSecret and cpagripOfferWallName — admin only.
     * / Use this after saving to verify all 3 CPAGrip fields persisted correctly.
     * / Returns full config for admin, safe empty-secret config for non-admin — never traps.
     */
    getOfferPortalConfigFull(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: {
            cpaLeadWebhookSecret: string;
            cpagripOfferWallName: string;
            cpagripApiKey: string;
            adminProfitPct: bigint;
            isEnabled: boolean;
            cpagripWebhookSecret: string;
            userProfitPct: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Get Offer Portal global config — public (no auth required).
     * / Returns only non-sensitive fields: isEnabled, cpagripOfferWallUrl, and offerWallName.
     * / Never traps for any caller — safe for anonymous/regular users.
     */
    getOfferPortalConfigPublic(): Promise<{
        offerWallName: string;
        isEnabled: boolean;
        cpagripOfferWallUrl: string;
    }>;
    getOrCreateChatConversation(otherUserId: Principal): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
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
     * / Also accepts an adminToken for email+password auth flow.
     */
    getPendingApprovals(adminToken: string | null): Promise<Array<ProviderProfile>>;
    getPremiumPlans(): Promise<PremiumPrices>;
    getProviderOrders(userId: bigint): Promise<Array<Order>>;
    getProviderProfile(userId: bigint): Promise<ProviderProfile | null>;
    getProvidersByCategory(category: string): Promise<Array<ProviderProfile>>;
    getProvidersPendingApproval(): Promise<Array<ProviderProfile>>;
    /**
     * / getPublicOfferPortalConfig — FIX 8: public query returning isEnabled + offerWallUrl + offerWallName.
     * / This is the canonical method for portal open/closed check — no admin token required.
     * / Never traps for any caller (anonymous, regular user, admin).
     */
    getPublicOfferPortalConfig(): Promise<{
        offerWallName: string;
        isEnabled: boolean;
        offerWallUrl: string;
    }>;
    getQrList(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<QrEntry>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getRecentUsers(): Promise<Array<User>>;
    /**
     * / Return the current recharge API config — admin only.
     * / Returns default config for non-admin callers (never traps).
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
     * / Returns #ok(config) for admin, #ok(empty defaults) for non-admin — never traps.
     */
    getSmsConfig(): Promise<{
        __kind__: "ok";
        ok: SmsConfig;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getSubscriptionPricing(): Promise<SubscriptionPricing | null>;
    getTicketReplies(ticketId: string): Promise<Array<TicketReply>>;
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
    getUpiList(adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: Array<UpiEntry>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getUserById(userId: bigint): Promise<User | null>;
    getUserByMobile(mobile: MobileNumber): Promise<User | null>;
    getUserCryptoTransactions(userId: string): Promise<Array<CryptoTransaction>>;
    getUserCryptoWallet(userId: string): Promise<CryptoWallet>;
    getUserCryptoWithdrawals(userId: string): Promise<Array<CryptoWithdrawal>>;
    getUserDepositRequests(userId: string): Promise<Array<DepositRequest>>;
    getUserPortfolio(userId: string): Promise<Array<PortfolioHolding>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStopLossRules(userId: string): Promise<Array<StopLossRule>>;
    /**
     * / Get the current subscription status for a given user.
     */
    getUserSubscriptionStatus(userId: string): Promise<UserSubscription | null>;
    getUserTickets(userId: string): Promise<Array<SupportTicket>>;
    getUsersByRole(role: UserRole): Promise<Array<User>>;
    getVideos(): Promise<Array<VideoItem>>;
    /**
     * / Return wallet balance for any userId — admin only.
     * / Returns 0.0 for non-admin callers (never traps).
     */
    getWalletBalanceByUserId(userId: bigint): Promise<number>;
    /**
     * / Initiate a mobile recharge.  Auto-calculates commission; deducts netCost
     * / from caller's wallet.  Returns new transaction ID.
     */
    initiateRecharge(mobile: string, operator: string, circle: string, amount: number): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    /**
     * / Check if a given mobile number belongs to a manager — public.
     */
    isManager(mobile: string): Promise<boolean>;
    isPremiumUser(userId: Principal | null): Promise<boolean>;
    leaveChatGroup(conversationId: bigint): Promise<boolean>;
    /**
     * / Link an Offer Portal referral code to a crypto wallet so that
     * / when the user completes their first trade the referrer gets a bonus.
     */
    linkCryptoReferral(userId: string, referralCode: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    login(mobile: MobileNumber, passwordHash: string): Promise<{
        __kind__: "ok";
        ok: User;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Login to the Offer Portal.
     * / Returns #ok(OfferUser) on success or #err(reason) on bad credentials —
     * / never traps, so the frontend receives a clean error instead of ic0.trap.
     */
    loginOfferUser(email: string, passwordHash: string): Promise<{
        __kind__: "ok";
        ok: OfferUser;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / loginUser — alias for login, accepts mobile + passwordHash + role (role is ignored, kept for API compat).
     * / Returns #ok(User) or clean error message — never traps.
     */
    loginUser(mobile: MobileNumber, passwordHash: string, _role: string): Promise<{
        __kind__: "ok";
        ok: User;
    } | {
        __kind__: "err";
        err: string;
    }>;
    markMessagesRead(conversationId: bigint): Promise<boolean>;
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
    postChatStory(mediaUrl: string | null, textContent: string | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    processChatReferralSignup(referralCode: string): Promise<boolean>;
    /**
     * / Process a CPALead postback: verify secret, split profit, credit earnings.
     * / Also triggers 3-tier MLM referral commissions (5%/2%/1%) to ancestors.
     */
    processCpaLeadPostback(offerUserId: bigint, grossAmount: bigint, webhookSecret: string): Promise<boolean>;
    reactToChatMessage(messageId: bigint, emoji: string): Promise<boolean>;
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
    registerUser(name: string, mobile: MobileNumber, passwordHash: string, role: UserRole, securityQuestion: string, securityAnswer: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    rejectProvider(adminToken: string | null, userId: bigint): Promise<void>;
    removeChatGroupMember(conversationId: bigint, memberId: Principal): Promise<boolean>;
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
    /**
     * / Remove a manager by mobile number — admin only.
     */
    removeManager(mobile: string): Promise<boolean>;
    removeQrEntry(adminToken: string | null, entryId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    removeShopPhoto(userId: bigint, blobId: string): Promise<void>;
    removeUpiEntry(adminToken: string | null, entryId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    replyToChatStory(storyId: bigint, message: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    replyToTicket(userId: string, ticketId: string, message: string, isAdmin: boolean, adminToken: string | null): Promise<{
        __kind__: "ok";
        ok: TicketReply;
    } | {
        __kind__: "err";
        err: string;
    }>;
    requestApproval(): Promise<void>;
    requestCryptoWithdrawal(userId: string, userEmail: string, amount: number, upiId: string, mpin: string): Promise<{
        __kind__: "ok";
        ok: CryptoWithdrawal;
    } | {
        __kind__: "err";
        err: string;
    }>;
    requestDeposit(userId: string, amount: number, utrNumber: string, screenshotUrl: string | null): Promise<{
        __kind__: "ok";
        ok: DepositRequest;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Request an OTP for Offer Portal password reset.
     * / Stores the OTP in stable memory with a 10-minute TTL.
     * / If the user has a mobile number and Fast2SMS is configured, the SMS is sent.
     * / Otherwise returns ok with instructions to contact admin.
     */
    requestOfferPasswordReset(email: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Submit a UPI withdrawal request from the Offer Portal.
     * / Returns #ok(withdrawalId) or #err(reason) — never traps.
     */
    requestOfferWithdrawal(offerUserId: bigint, upiId: string, amount: bigint): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Request admin to top-up your wallet.  Returns the new request ID.
     */
    requestWalletTopup(amount: number, note: string): Promise<bigint>;
    /**
     * / Verify OTP and set a new password for an Offer Portal user.
     * / The OTP must not be expired and must match within 3 attempts.
     */
    resetOfferPassword(email: string, otp: string, newPasswordHash: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Alias for updateCpagripSettings — matches frontend method name saveCPAGripKeys.
     * / Saves API key, Webhook Secret, and Offer Wall Name atomically — admin only.
     * / Empty strings are ignored — existing values are preserved, preventing accidental wipe.
     */
    saveCPAGripKeys(adminToken: string | null, apiKey: string, webhookSecret: string, offerWallName: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveChatNote(title: string, content: string, subject: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    scheduleChatMessage(conversationId: bigint, content: string, scheduledAt: bigint): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    searchChatUsers(searchQuery: string): Promise<Array<UserChatProfile>>;
    searchUsers(searchText: string): Promise<Array<User>>;
    sellCoin(userId: string, coinId: string, quantity: number, currentPrice: number, mpin: string): Promise<{
        __kind__: "ok";
        ok: CryptoTransaction;
    } | {
        __kind__: "err";
        err: string;
    }>;
    sendLockedMessage(conversationId: bigint, fileUrl: string, lockType: LockType, passwordHash: string | null, task: LockedFileTask | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    sendMessage(conversationId: bigint, content: string, messageType: MessageType, mediaUrl: string | null, replyToId: bigint | null, isVanish: boolean): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Send a pay-to-unlock message. Receivers must pay lockPrice to read content.
     */
    sendPayToUnlockMessage(conversationId: bigint, content: string, lockPrice: bigint, currency: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setActiveQr(adminToken: string | null, entryId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setActiveUpi(adminToken: string | null, entryId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setChatAutoReply(enabled: boolean, messages: Array<string>): Promise<boolean>;
    setChatGhostMode(enabled: boolean): Promise<boolean>;
    setChatStudyMode(enabled: boolean, selectedChats: Array<bigint>): Promise<boolean>;
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
    setMpin(userId: string, mpin: string): Promise<{
        __kind__: "ok";
        ok: null;
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
    setStopLossRule(userId: string, coinId: string, coinSymbol: string, quantityToSell: number, limitPriceInr: number): Promise<{
        __kind__: "ok";
        ok: StopLossRule;
    } | {
        __kind__: "err";
        err: string;
    }>;
    submitUpiPremiumRequest(plan: PremiumPlan, upiTxnRef: string, amount: bigint): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Summarize last 50 messages or last 24h messages for a conversation.
     * / Uses OpenAI via HTTP outcall — API key configured in Chat Admin Settings.
     */
    summarizeChatMessages(conversationId: bigint, mode: Variant_last50_last24h): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    toggleCustomSection(id: bigint, enabled: boolean): Promise<boolean>;
    unlockMessage(messageId: bigint, attempt: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateAdminConfig(newConfig: AdminConfig): Promise<void>;
    /**
     * / Replace ALL admin settings in one atomic call — admin only.
     * / All existing field values are overwritten with the supplied record.
     * / Empty strings for Cloudinary/CPAGrip fields preserve the existing defaults.
     */
    updateAdminSettings(adminToken: string | null, settings: AdminSettingsExtended): Promise<boolean>;
    /**
     * / Update AdMob configuration — admin only.
     */
    updateAdmobConfig(appId: string, bannerUnitId: string, interstitialId: string, ludoBannerId: string, ludoInterstitialId: string, rewardedUnitId: string): Promise<boolean>;
    updateAppSettings(adminToken: string | null, json: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCategory(id: bigint, name: string, emoji: string, color: string, enabled: boolean): Promise<boolean>;
    updateChatAdminSettings(settings: ChatAdminSettings): Promise<boolean>;
    updateChatGroupInfo(conversationId: bigint, name: string | null, photoUrl: string | null): Promise<boolean>;
    updateChatNote(id: bigint, title: string | null, content: string | null, subject: string | null): Promise<boolean>;
    /**
     * / Update Cloudinary credentials — admin only.
     * / Empty strings preserve existing defaults.
     */
    updateCloudinaryConfig(cloudName: string, apiKey: string, apiSecret: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCoin(adminToken: string | null, id: string, isListed: boolean): Promise<{
        __kind__: "ok";
        ok: CryptoCoin;
    } | {
        __kind__: "err";
        err: string;
    }>;
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
    /**
     * / Save CPAGrip Webhook Secret Key and Offer Wall Name — admin only.
     * / Both fields are persisted in separate stable vars so they survive reloads.
     * / Empty strings are ignored — existing values are preserved.
     */
    updateCpagripSettings(adminToken: string | null, apiKey: string, webhookSecret: string, offerWallName: string): Promise<boolean>;
    updateCryptoConfig(adminToken: string | null, config: CryptoInvestConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCustomCode(id: bigint, name: string, code: string, btnLabel: string, icon: string, placement: string, enabled: boolean, title: string, subtitle1: string, subtitle2: string, alignment: string, layoutStyle: string): Promise<boolean>;
    updateCustomSection(id: bigint, name: string, heading: string, placement: string, buttons: string, enabled: boolean): Promise<boolean>;
    updateJob(id: bigint, title: string, department: string, location: string, lastDate: string, applyLink: string, category: string, enabled: boolean): Promise<boolean>;
    updateListing(id: bigint, title: string | null, description: string | null, price: bigint | null, city: string | null, photoUrls: Array<string> | null, whatsappContact: string | null): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Update only Ludo / Rewards settings — admin only.
     */
    updateLudoSettings(ludoEnabled: boolean, rewardsEnabled: boolean, pointsPerAd: bigint, redemptionRate: bigint, minWithdrawal: bigint): Promise<boolean>;
    updateMyChatProfile(displayName: string | null, bio: string | null, city: string | null, profilePhotoUrl: string | null): Promise<boolean>;
    updateNews(id: bigint, title: string, summary: string, imageUrl: string, link: string, category: string, enabled: boolean): Promise<boolean>;
    /**
     * / Update Offer Portal config (toggle, offer wall secret, profit split) — admin only.
     * / Also persists cpagripWebhookSecret and cpagripOfferWallName to their stable vars.
     * / Returns #ok(true) on success, #err(reason) if validation fails (e.g. API key too short).
     */
    updateOfferPortalConfig(adminToken: string | null, isEnabled: boolean, cpaLeadWebhookSecret: string, cpagripApiKey: string, adminProfitPct: bigint, userProfitPct: bigint, newWebhookSecret: string, newOfferWallName: string): Promise<{
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
     * / Returns #ok(true) or #err("Unauthorized: Admin only") — never traps.
     */
    updateSmsConfig(fast2smsApiKey: string, senderId: string, isEnabled: boolean): Promise<{
        __kind__: "ok";
        ok: boolean;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Update SMS config with admin token — admin only (alias for email+password auth).
     * / Returns #ok(true) or #err("Unauthorized: Admin only") — never traps.
     */
    updateSmsConfigWithToken(adminToken: string | null, fast2smsApiKey: string, senderId: string, isEnabled: boolean): Promise<{
        __kind__: "ok";
        ok: boolean;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateSubscriptionPricing(newPricing: SubscriptionPricing): Promise<void>;
    updateTicketStatus(adminToken: string | null, ticketId: string, status: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateToggle(adminToken: string | null, toggleName: string, value: boolean): Promise<void>;
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
    /**
     * / Verify admin email+password credentials and issue a 24-hour session token.
     * / The frontend stores this token and passes it as ?adminToken to admin methods.
     * / Returns #ok(token) on success, #err(reason) on failure — never traps.
     */
    verifyAdminCredentials(email: string, password: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    verifyAdminPin(pinHash: string): Promise<boolean>;
    /**
     * / Verify a Stripe PaymentIntent and unlock the message if payment succeeded.
     */
    verifyStripeUnlock(messageId: bigint, paymentIntentId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / User-facing: verify a plain-text unlock key for a named feature.
     */
    verifyUnlockKey(featureName: string, userKey: string): Promise<VerifyKeyResult>;
    viewChatStory(storyId: bigint): Promise<boolean>;
    viewChatVaultItem(id: bigint): Promise<VaultItem | null>;
}
