/**
 * Shared type stubs for frontend-only type references.
 * These types match the actual usage throughout the app pages.
 */

export enum UserRole {
  customer = "customer",
  provider = "provider",
  admin = "admin",
  manager = "manager",
}

export enum ApprovalStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
}

export enum PlanType {
  subscription = "subscription",
  ads = "ads",
  free = "free",
  premium = "premium",
  pending = "pending",
}

export enum SubscriptionStatus {
  active = "active",
  inactive = "inactive",
  expired = "expired",
}

export enum SubscriptionPlan {
  oneMonth = "oneMonth",
  threeMonths = "threeMonths",
  sixMonths = "sixMonths",
  twelveMonths = "twelveMonths",
  oneYear = "oneYear",
  lifetime = "lifetime",
}

/** Minimal interface matching ExternalBlob used for QR codes / screenshots. */
export interface BlobRef {
  getDirectURL(): string;
}

export interface Banner {
  id: bigint;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  isActive?: boolean;
  active?: boolean;
  order?: number;
  displayOrder?: bigint;
}

export interface User {
  id: bigint;
  email?: string;
  mobile?: string;
  name: string;
  role: UserRole;
  createdAt: bigint;
  securityQuestion?: string;
}

export interface ServiceRate {
  id?: string;
  name: string;
  description?: string;
  price: bigint;
  unit?: string;
}

export interface ProviderProfile {
  userId: bigint;
  businessName?: string;
  shopName?: string;
  category: string;
  description: string;
  phone?: string;
  mobile?: string;
  address: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  upiId?: string;
  qrCodeBlobId?: string | null;
  planType: PlanType;
  approvalStatus: ApprovalStatus;
  subscriptionStatus?: SubscriptionStatus | string;
  subscriptionPlan?: SubscriptionPlan | string;
  subscriptionExpiry?: bigint | null;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  paymentScreenshotBlobId?: string | null;
  photos?: string[];
  serviceRates?: ServiceRate[];
}

export interface Order {
  id: bigint;
  customerId: bigint;
  providerId: bigint;
  customerName?: string;
  orderType?: string;
  description?: string;
  imageUrl?: string | null;
  status: string;
  totalAmount: number;
  createdAt: bigint;
  items: { name: string; price: number; qty: number }[];
  address: string;
  phone: string;
}

export interface SubscriptionPricing {
  monthly?: number;
  quarterly?: number;
  yearly?: number;
  oneMonthPrice?: number;
  threeMonthPrice?: number;
  twelveMonthPrice?: number;
}

export interface AdminConfig {
  key?: string;
  value?: string;
  adminName?: string;
  mobile?: string;
  email?: string;
  upiId?: string;
  qrCodeBlobId?: BlobRef | null;
}

// ---- New canister-backed content types ----

export interface Category {
  id: number;
  name: string;
  emoji: string;
  color: string;
  enabled: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  imageUrl: string;
  link: string;
  category: string;
  enabled: boolean;
  createdAt: number;
}

export interface JobItem {
  id: number;
  title: string;
  department: string;
  location: string;
  lastDate: string;
  applyLink: string;
  category: string;
  enabled: boolean;
  createdAt: number;
}

export interface CustomCode {
  id: number;
  name: string;
  code: string;
  btnLabel: string;
  icon: string;
  placement: string;
  enabled: boolean;
}

export interface ScrapRate {
  id: number;
  itemName: string;
  ratePerKg: number;
  ratePerGram: number;
  enabled: boolean;
}

export interface VideoItem {
  id: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  platform: string;
  category: string;
  enabled: boolean;
  createdAt: number;
}

/** Extended actor interface covering all methods called directly by pages. */
export interface BackendActorMethods {
  // Auth
  login(mobile: string, passwordHash: string): Promise<User>;
  verifyAdminPin(hash: string): Promise<boolean>;
  getUserByMobile(mobile: string): Promise<User | null>;
  forgotPassword(
    mobile: string,
    answer: string,
    newHash: string,
  ): Promise<void>;

  // Banners
  getActiveBanners(): Promise<Banner[]>;
  addBanner(
    title: string,
    subtitle: string,
    imageUrl: string,
    linkUrl: string,
    order: bigint,
  ): Promise<void>;
  deleteBanner(id: bigint): Promise<void>;

  // Providers
  getActiveProviders(): Promise<ProviderProfile[]>;
  getProvidersByCategory(category: string): Promise<ProviderProfile[]>;
  getProviderProfile(userId: bigint): Promise<ProviderProfile | null>;
  getProvidersPendingApproval(): Promise<ProviderProfile[]>;
  getAllProviders(): Promise<ProviderProfile[]>;
  approveProvider(
    userId: bigint,
    plan: SubscriptionPlan | string,
  ): Promise<void>;
  rejectProvider(userId: bigint): Promise<void>;
  setPlanType(userId: bigint, planType: PlanType | string): Promise<void>;
  updateProviderProfileFull(
    userId: bigint,
    shopName: string,
    description: string,
    address: string,
    category: string,
    upiId: string,
    qrCodeBlobId: unknown,
  ): Promise<void>;
  addServiceRate(userId: bigint, rate: ServiceRate): Promise<void>;
  deleteServiceRate(userId: bigint, name: string): Promise<void>;
  addShopPhoto(userId: bigint, blobId: string): Promise<void>;
  removeShopPhoto(userId: bigint, blobId: string): Promise<void>;
  uploadPaymentScreenshot(userId: bigint, blobId: string): Promise<void>;

  // Users
  getUserById(userId: bigint): Promise<User | null>;
  getRecentUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;

  // Orders
  getProviderOrders(userId: bigint): Promise<Order[]>;
  updateOrderStatus(orderId: bigint, status: string): Promise<void>;

  // Admin
  getAdminConfig(): Promise<AdminConfig | null>;
  updateAdminConfig(config: Partial<AdminConfig>): Promise<void>;
  getAllToggles(): Promise<[string, boolean][]>;
  updateToggle(name: string, value: boolean): Promise<void>;

  // Subscription
  getSubscriptionPricing(): Promise<SubscriptionPricing | null>;
  updateSubscriptionPricing(pricing: {
    oneMonthPrice: number;
    threeMonthPrice: number;
    twelveMonthPrice: number;
  }): Promise<void>;

  // Categories (canister-backed)
  getCategories(): Promise<Category[]>;
  addCategory(name: string, emoji: string, color: string): Promise<void>;
  updateCategory(
    id: number,
    name: string,
    emoji: string,
    color: string,
    enabled: boolean,
  ): Promise<void>;
  deleteCategory(id: number): Promise<void>;

  // News (canister-backed)
  getNews(): Promise<NewsItem[]>;
  addNews(
    title: string,
    summary: string,
    imageUrl: string,
    link: string,
    category: string,
  ): Promise<void>;
  updateNews(
    id: number,
    title: string,
    summary: string,
    imageUrl: string,
    link: string,
    category: string,
    enabled: boolean,
  ): Promise<void>;
  deleteNews(id: number): Promise<void>;

  // Jobs (canister-backed)
  getJobs(): Promise<JobItem[]>;
  addJob(
    title: string,
    department: string,
    location: string,
    lastDate: string,
    applyLink: string,
    category: string,
  ): Promise<void>;
  updateJob(
    id: number,
    title: string,
    department: string,
    location: string,
    lastDate: string,
    applyLink: string,
    category: string,
    enabled: boolean,
  ): Promise<void>;
  deleteJob(id: number): Promise<void>;

  // Custom Codes (canister-backed)
  getCustomCodes(): Promise<CustomCode[]>;
  addCustomCode(
    name: string,
    code: string,
    label: string,
    icon: string,
    placement: string,
  ): Promise<void>;
  updateCustomCode(
    id: number,
    name: string,
    code: string,
    label: string,
    icon: string,
    placement: string,
    enabled: boolean,
  ): Promise<void>;
  deleteCustomCode(id: number): Promise<void>;

  // Scrap Rates (canister-backed)
  getScrapRates(): Promise<ScrapRate[]>;
  addScrapRate(
    itemName: string,
    ratePerKg: number,
    ratePerGram: number,
  ): Promise<void>;
  updateScrapRate(
    id: number,
    itemName: string,
    ratePerKg: number,
    ratePerGram: number,
    enabled: boolean,
  ): Promise<void>;
  deleteScrapRate(id: number): Promise<void>;

  // Videos (canister-backed)
  getVideos(): Promise<VideoItem[]>;
  addVideo(
    title: string,
    videoUrl: string,
    thumbnailUrl: string,
    platform: string,
    category: string,
  ): Promise<void>;
  updateVideo(
    id: number,
    title: string,
    videoUrl: string,
    thumbnailUrl: string,
    platform: string,
    category: string,
    enabled: boolean,
  ): Promise<void>;
  deleteVideo(id: number): Promise<void>;

  // App Settings (canister-backed JSON blob)
  getAppSettings(): Promise<string>;
  updateAppSettings(json: string): Promise<void>;
}
