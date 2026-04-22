/**
 * Marketplace domain types for the Likeup chat module.
 */

export enum MarketCategory {
  all = "all",
  mobile = "mobile",
  vehicles = "vehicles",
  property = "property",
  jobs = "jobs",
  services = "services",
  electronics = "electronics",
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  photoUrl?: string;
  category: string;
  city: string;
  whatsapp: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  createdBy: string;
}

export interface CreateListingPayload {
  title: string;
  description: string;
  price: number;
  photoUrl?: string;
  category: string;
  city: string;
  whatsapp: string;
}
