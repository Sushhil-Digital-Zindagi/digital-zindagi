/**
 * MarketplacePage — Local buy/sell marketplace inside the Likeup chat module.
 * City filter, category pills, 2-col listing grid, create listing modal, news tab.
 */

import {
  ChevronLeft,
  MapPin,
  MessageCircle,
  Newspaper,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";
import { ChatProvider } from "../contexts/ChatContext";
import {
  useAdminAddNews,
  useAdminDeleteNews,
  useCreateListing,
  useDeleteListing,
  useListings,
  useMyListings,
  useNewsItems,
} from "../hooks/useMarketplaceQueries";
import { useNavigate } from "../lib/router";
import type { CreateListingPayload } from "../types/marketplaceTypes";
import type { MarketListing } from "../types/marketplaceTypes";
import type { NewsItem } from "../types/marketplaceTypes";
import { MarketCategory } from "../types/marketplaceTypes";

// ---- Category config ----
const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: MarketCategory.all, label: "All", emoji: "🏪" },
  { key: MarketCategory.mobile, label: "Mobile", emoji: "📱" },
  { key: MarketCategory.vehicles, label: "Vehicles", emoji: "🚗" },
  { key: MarketCategory.property, label: "Property", emoji: "🏠" },
  { key: MarketCategory.jobs, label: "Jobs", emoji: "💼" },
  { key: MarketCategory.services, label: "Services", emoji: "🛠️" },
  { key: MarketCategory.electronics, label: "Electronics", emoji: "💻" },
];

const PAGE_SIZE = 20;

// ---- Listing Card ----
function ListingCard({
  listing,
  onDelete,
  isOwner,
}: {
  listing: MarketListing;
  onDelete?: () => void;
  isOwner?: boolean;
}) {
  const waLink = `https://wa.me/${listing.whatsapp?.replace(/\D/g, "")}`;

  return (
    <div
      data-ocid="market.item"
      className={`bg-card rounded-2xl overflow-hidden shadow-sm border ${
        listing.isFeatured
          ? "border-yellow-400 ring-1 ring-yellow-300"
          : "border-border"
      } flex flex-col`}
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {listing.photoUrl ? (
          <img
            src={listing.photoUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={32} className="text-muted-foreground/40" />
          </div>
        )}
        {listing.isFeatured && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            <Star size={10} className="fill-yellow-900" /> Featured
          </span>
        )}
        {isOwner && onDelete && (
          <button
            type="button"
            aria-label="Delete listing"
            data-ocid="market.delete_button"
            onClick={onDelete}
            className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
          {listing.title}
        </p>
        <p className="text-primary font-bold text-base">
          ₹{listing.price.toLocaleString("en-IN")}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={11} className="flex-shrink-0" />
          <span className="truncate">{listing.city}</span>
        </div>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="market.button"
          className="mt-auto flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs font-semibold py-2 rounded-xl hover:bg-green-600 active:scale-[0.98] transition-all"
        >
          <MessageCircle size={13} /> WhatsApp
        </a>
      </div>
    </div>
  );
}

// ---- News Card ----
function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div
      data-ocid="market.news.item"
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-36 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-sm mb-1">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.content}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          {new Date(item.createdAt).toLocaleDateString("hi-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

// ---- Create Listing Modal ----
function CreateListingModal({ onClose }: { onClose: () => void }) {
  const createListing = useCreateListing();
  const [form, setForm] = useState<CreateListingPayload>({
    title: "",
    description: "",
    price: 0,
    photoUrl: "",
    category: MarketCategory.mobile,
    city: "",
    whatsapp: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.city.trim() || !form.whatsapp.trim()) {
      toast.error("Title, city aur WhatsApp number zaroori hai.");
      return;
    }
    if (form.price <= 0) {
      toast.error("Valid price daalo.");
      return;
    }
    setSubmitting(true);
    try {
      await createListing.mutateAsync({
        ...form,
        photoUrl: form.photoUrl?.trim() || undefined,
      });
      toast.success("Listing add ho gayi! ✅");
      onClose();
    } catch {
      toast.error("Listing add nahi ho saki. Dobara try karein.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      data-ocid="market.create_listing_modal"
    >
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-safe">
        <div className="sticky top-0 bg-card flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="font-bold text-foreground text-base">New Listing</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-ocid="market.create_listing_modal.close_button"
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label
              htmlFor="ml-title"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Title *
            </label>
            <input
              id="ml-title"
              data-ocid="market.title_input"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. iPhone 14, Honda City 2020..."
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>

          <div>
            <label
              htmlFor="ml-desc"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Description
            </label>
            <textarea
              id="ml-desc"
              data-ocid="market.textarea"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Item ki details likhein..."
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ml-price"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Price (₹) *
              </label>
              <input
                id="ml-price"
                data-ocid="market.price_input"
                type="number"
                min="0"
                value={form.price || ""}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                placeholder="0"
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
              />
            </div>
            <div>
              <label
                htmlFor="ml-cat"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Category
              </label>
              <select
                id="ml-cat"
                data-ocid="market.category_select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
              >
                {CATEGORIES.filter((c) => c.key !== MarketCategory.all).map(
                  (c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="ml-city"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              City *
            </label>
            <input
              id="ml-city"
              data-ocid="market.city_input"
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Lucknow, Delhi, Mumbai..."
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>

          <div>
            <label
              htmlFor="ml-wa"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              WhatsApp Number *
            </label>
            <input
              id="ml-wa"
              data-ocid="market.whatsapp_input"
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="91XXXXXXXXXX"
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>

          <div>
            <label
              htmlFor="ml-photo"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Photo URL (optional)
            </label>
            <input
              id="ml-photo"
              data-ocid="market.photo_input"
              type="url"
              value={form.photoUrl ?? ""}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              placeholder="https://res.cloudinary.com/..."
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>

          <button
            type="button"
            data-ocid="market.submit_button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {submitting ? (
              <span className="animate-pulse">Adding...</span>
            ) : (
              <>
                <Plus size={16} /> Post Listing
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Skeleton Grid ----
function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 gap-3 p-4"
      data-ocid="market.loading_state"
    >
      {Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((k) => (
        <div
          key={k}
          className="bg-card rounded-2xl overflow-hidden border border-border"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Inner Page ----
type TabKey = "browse" | "mine" | "news";

function MarketplacePageInner() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("browse");
  const [category, setCategory] = useState(MarketCategory.all);
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  const catFilter = category === MarketCategory.all ? undefined : category;
  const { data: listings = [], isLoading } = useListings(
    city || undefined,
    catFilter,
  );
  const { data: myListings = [], isLoading: myLoading } = useMyListings();
  const { data: newsItems = [], isLoading: newsLoading } = useNewsItems();
  const deleteListing = useDeleteListing();

  const filtered = listings.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > paginated.length;

  const handleDelete = async (listingId: string) => {
    try {
      await deleteListing.mutateAsync(listingId);
      toast.success("Listing delete ho gayi.");
    } catch {
      toast.error("Delete nahi ho saka.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-emerald-header text-white sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/chat")}
            aria-label="Back"
            data-ocid="market.back_button"
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag size={18} className="text-white/90" />
            <h1 className="font-bold text-base">Local Marketplace</h1>
          </div>
          <button
            type="button"
            data-ocid="market.premium_button"
            onClick={() => navigate("/chat/premium")}
            className="text-yellow-300 text-xs font-bold flex items-center gap-1"
          >
            <Star size={13} className="fill-yellow-300" /> Premium
          </button>
        </div>

        {/* Search + City row */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="market.search_input"
              className="w-full bg-white/15 text-white placeholder:text-white/60 pl-9 pr-4 py-2 rounded-xl text-sm border border-white/20 focus:outline-none focus:bg-white/20"
            />
          </div>
          <div className="relative">
            <MapPin
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              placeholder="City"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              data-ocid="market.city_filter_input"
              className="w-28 bg-white/15 text-white placeholder:text-white/60 pl-8 pr-3 py-2 rounded-xl text-sm border border-white/20 focus:outline-none focus:bg-white/20"
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-white/10">
          {(
            [
              { key: "browse", label: "🛒 Browse" },
              { key: "mine", label: "👤 My Listings" },
              { key: "news", label: "📰 Local News" },
            ] as { key: TabKey; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              data-ocid={`market.${t.key}_tab`}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === t.key
                  ? "text-white border-b-2 border-white"
                  : "text-white/60 border-b-2 border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Category Pills — only on Browse tab */}
      {tab === "browse" && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b border-border">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              data-ocid="market.category.tab"
              onClick={() => {
                setCategory(c.key as MarketCategory);
                setPage(1);
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === c.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        {/* Browse tab */}
        {tab === "browse" && isLoading && <SkeletonGrid />}
        {tab === "browse" && !isLoading && filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 px-6"
            data-ocid="market.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Koi listing nahi mili
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Pehle listing add karo ya filter change karo
              </p>
            </div>
            <button
              type="button"
              data-ocid="market.add_listing_button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} /> Listing Add Karo
            </button>
          </div>
        )}
        {tab === "browse" && !isLoading && filtered.length > 0 && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {paginated.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            {hasMore && (
              <button
                type="button"
                data-ocid="market.load_more_button"
                onClick={() => setPage((p) => p + 1)}
                className="w-full mt-4 py-3 text-sm font-semibold text-primary border border-primary/30 rounded-2xl hover:bg-primary/5 transition-colors"
              >
                Load More ({filtered.length - paginated.length} baki hain)
              </button>
            )}
          </div>
        )}

        {/* My Listings tab */}
        {tab === "mine" && myLoading && <SkeletonGrid />}
        {tab === "mine" && !myLoading && myListings.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 px-6"
            data-ocid="market.mine_empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Aapki koi listing nahi hai
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Neeche + button se listing add karein
              </p>
            </div>
          </div>
        )}
        {tab === "mine" && !myLoading && myListings.length > 0 && (
          <div className="p-4 grid grid-cols-2 gap-3">
            {myListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isOwner
                onDelete={() => handleDelete(listing.id)}
              />
            ))}
          </div>
        )}

        {/* Local News tab */}
        {tab === "news" && (
          <div className="p-4 space-y-4">
            {newsLoading ? (
              <div data-ocid="market.news_loading_state" className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => `n-${i}`).map((k) => (
                  <Skeleton key={k} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : newsItems.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 gap-3"
                data-ocid="market.news_empty_state"
              >
                <Newspaper size={36} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center">
                  Abhi koi local news nahi hai.
                  <br />
                  Admin panel se news add karein.
                </p>
              </div>
            ) : (
              newsItems.map((item) => <NewsCard key={item.id} item={item} />)
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      {(tab === "browse" || tab === "mine") && (
        <button
          type="button"
          data-ocid="market.add_listing_fab"
          onClick={() => setShowCreate(true)}
          aria-label="Add listing"
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-20"
        >
          <Plus size={22} className="text-primary-foreground" />
        </button>
      )}

      {showCreate && (
        <CreateListingModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <ChatProvider>
      <MarketplacePageInner />
    </ChatProvider>
  );
}
