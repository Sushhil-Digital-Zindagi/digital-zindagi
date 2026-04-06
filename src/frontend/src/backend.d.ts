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
export interface UserProfile {
    userId: bigint;
    name: string;
    role: UserRole;
    mobile: MobileNumber;
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
    addServiceRate(userId: bigint, newRate: ServiceRate): Promise<void>;
    addShopPhoto(userId: bigint, blobId: string): Promise<void>;
    approveProvider(userId: bigint, plan: SubscriptionPlan): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    changeAdminPin(currentPinHash: string, newPinHash: string): Promise<void>;
    deleteBanner(bannerId: bigint): Promise<void>;
    deleteServiceRate(userId: bigint, rateName: string): Promise<void>;
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
    getCustomerOrders(userId: bigint): Promise<Array<Order>>;
    getOrderById(orderId: bigint): Promise<Order | null>;
    getOrdersByStatus(userId: bigint, status: string): Promise<Array<Order>>;
    getProviderOrders(userId: bigint): Promise<Array<Order>>;
    getProviderProfile(userId: bigint): Promise<ProviderProfile | null>;
    getProvidersByCategory(category: string): Promise<Array<ProviderProfile>>;
    getProvidersPendingApproval(): Promise<Array<ProviderProfile>>;
    getRecentUsers(): Promise<Array<User>>;
    getSubscriptionPricing(): Promise<SubscriptionPricing | null>;
    getUserById(userId: bigint): Promise<User | null>;
    getUserByMobile(mobile: MobileNumber): Promise<User | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUsersByRole(role: UserRole): Promise<Array<User>>;
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
    updateOrderStatus(orderId: bigint, status: string): Promise<void>;
    updateProviderProfile(userId: bigint, shopName: string, description: string, address: string, category: string): Promise<void>;
    /**
     * / Extended updateProviderProfile to include upiId and qrCodeBlobId
     */
    updateProviderProfileFull(userId: bigint, shopName: string, description: string, address: string, category: string, upiId: string, qrCodeBlobId: string | null): Promise<void>;
    updateSubscriptionPricing(newPricing: SubscriptionPricing): Promise<void>;
    updateToggle(toggleName: string, value: boolean): Promise<void>;
    uploadPaymentScreenshot(userId: bigint, blobId: string): Promise<void>;
    verifyAdminPin(pinHash: string): Promise<boolean>;
}
