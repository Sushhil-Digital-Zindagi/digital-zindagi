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
export interface Category {
    id: bigint;
    name: string;
    color: string;
    emoji: string;
    enabled: boolean;
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
export interface CustomCode {
    id: bigint;
    placement: string;
    code: string;
    icon: string;
    name: string;
    enabled: boolean;
    btnLabel: string;
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
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
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
export interface ScrapRate {
    id: bigint;
    ratePerKg: number;
    enabled: boolean;
    ratePerGram: number;
    itemName: string;
}
export interface AdminConfig {
    email: string;
    adminName: string;
    upiId: string;
    mobile: MobileNumber;
    qrCodeBlobId: ExternalBlob;
}
export interface SubscriptionPricing {
    threeMonthPrice: bigint;
    twelveMonthPrice: bigint;
    oneMonthPrice: bigint;
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
export interface backendInterface {
    addBanner(title: string, subtitle: string, imageUrl: string, linkUrl: string, displayOrder: bigint): Promise<bigint>;
    addCategory(name: string, emoji: string, color: string): Promise<bigint>;
    addCustomCode(name: string, code: string, btnLabel: string, icon: string, placement: string): Promise<bigint>;
    addJob(title: string, department: string, location: string, lastDate: string, applyLink: string, category: string): Promise<bigint>;
    addNews(title: string, summary: string, imageUrl: string, link: string, category: string): Promise<bigint>;
    addScrapRate(itemName: string, ratePerKg: number, ratePerGram: number): Promise<bigint>;
    addServiceRate(userId: bigint, newRate: ServiceRate): Promise<void>;
    addShopPhoto(userId: bigint, blobId: string): Promise<void>;
    addVideo(title: string, videoUrl: string, thumbnailUrl: string, platform: string, category: string): Promise<bigint>;
    approveProvider(userId: bigint, plan: SubscriptionPlan): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    changeAdminPin(currentPinHash: string, newPinHash: string): Promise<void>;
    deleteBanner(bannerId: bigint): Promise<void>;
    deleteCategory(id: bigint): Promise<boolean>;
    deleteCustomCode(id: bigint): Promise<boolean>;
    deleteJob(id: bigint): Promise<boolean>;
    deleteNews(id: bigint): Promise<boolean>;
    deleteScrapRate(id: bigint): Promise<boolean>;
    deleteServiceRate(userId: bigint, rateName: string): Promise<void>;
    deleteVideo(id: bigint): Promise<boolean>;
    editBanner(bannerId: bigint, title: string, subtitle: string, imageUrl: string, linkUrl: string, active: boolean, displayOrder: bigint): Promise<void>;
    forgotPassword(mobile: MobileNumber, securityAnswer: string, newPasswordHash: string): Promise<void>;
    getActiveBanners(): Promise<Array<Banner>>;
    getActiveProviders(): Promise<Array<ProviderProfile>>;
    getAdminConfig(): Promise<AdminConfig | null>;
    getAllProviders(): Promise<Array<ProviderProfile>>;
    getAllToggles(): Promise<Array<[string, boolean]>>;
    getAllUsers(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getCategories(): Promise<Array<Category>>;
    getCustomCodes(): Promise<Array<CustomCode>>;
    getCustomerOrders(userId: bigint): Promise<Array<Order>>;
    getJobs(): Promise<Array<JobItem>>;
    getNews(): Promise<Array<NewsItem>>;
    getOrderById(orderId: bigint): Promise<Order | null>;
    getOrdersByStatus(userId: bigint, status: string): Promise<Array<Order>>;
    getProviderOrders(userId: bigint): Promise<Array<Order>>;
    getProviderProfile(userId: bigint): Promise<ProviderProfile | null>;
    getProvidersByCategory(category: string): Promise<Array<ProviderProfile>>;
    getProvidersPendingApproval(): Promise<Array<ProviderProfile>>;
    getRecentUsers(): Promise<Array<User>>;
    getScrapRates(): Promise<Array<ScrapRate>>;
    getSubscriptionPricing(): Promise<SubscriptionPricing | null>;
    getUserById(userId: bigint): Promise<User | null>;
    getUserByMobile(mobile: MobileNumber): Promise<User | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUsersByRole(role: UserRole): Promise<Array<User>>;
    getVideos(): Promise<Array<VideoItem>>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    login(mobile: MobileNumber, passwordHash: string): Promise<User>;
    placeOrder(providerId: bigint, customerName: string, description: string, orderType: string, imageUrl: string | null): Promise<bigint>;
    registerUser(name: string, mobile: MobileNumber, passwordHash: string, role: UserRole, securityQuestion: string, securityAnswer: string): Promise<void>;
    rejectProvider(userId: bigint): Promise<void>;
    removeShopPhoto(userId: bigint, blobId: string): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsers(searchText: string): Promise<Array<User>>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setPlanType(userId: bigint, planType: PlanType): Promise<void>;
    updateAdminConfig(newConfig: AdminConfig): Promise<void>;
    updateCategory(id: bigint, name: string, emoji: string, color: string, enabled: boolean): Promise<boolean>;
    updateCustomCode(id: bigint, name: string, code: string, btnLabel: string, icon: string, placement: string, enabled: boolean): Promise<boolean>;
    updateJob(id: bigint, title: string, department: string, location: string, lastDate: string, applyLink: string, category: string, enabled: boolean): Promise<boolean>;
    updateNews(id: bigint, title: string, summary: string, imageUrl: string, link: string, category: string, enabled: boolean): Promise<boolean>;
    updateOrderStatus(orderId: bigint, status: string): Promise<void>;
    updateProviderProfile(userId: bigint, shopName: string, description: string, address: string, category: string): Promise<void>;
    /**
     * / Extended updateProviderProfile to include upiId and qrCodeBlobId
     */
    updateProviderProfileFull(userId: bigint, shopName: string, description: string, address: string, category: string, upiId: string, qrCodeBlobId: string | null): Promise<void>;
    updateScrapRate(id: bigint, itemName: string, ratePerKg: number, ratePerGram: number, enabled: boolean): Promise<boolean>;
    updateSubscriptionPricing(newPricing: SubscriptionPricing): Promise<void>;
    updateToggle(toggleName: string, value: boolean): Promise<void>;
    updateVideo(id: bigint, title: string, videoUrl: string, thumbnailUrl: string, platform: string, category: string, enabled: boolean): Promise<boolean>;
    uploadPaymentScreenshot(userId: bigint, blobId: string): Promise<void>;
    verifyAdminPin(pinHash: string): Promise<boolean>;
}
