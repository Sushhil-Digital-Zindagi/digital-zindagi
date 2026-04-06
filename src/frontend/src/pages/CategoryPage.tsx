import { LocateFixed, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ProviderCard from "../components/ProviderCard";
import { useProvidersByCategory } from "../hooks/useQueries";
import { useUserLocation } from "../hooks/useUserLocation";
import { useNavigate, useParams } from "../lib/router";
import { getDistanceKm } from "../utils/locationUtils";
import { OrderModal } from "./OrdersPage";

const CATEGORY_EMOJIS: Record<string, string> = {
  Scrap: "♻️",
  Doctor: "🏥",
  Market: "🛒",
  Labor: "👷",
  Electronics: "📱",
  Plumber: "🔧",
  Carpenter: "🪩",
  Tutor: "📚",
  Electrician: "⚡",
  Painter: "🎨",
  Tailor: "✂️",
  Salon: "💇",
};

export default function CategoryPage() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const { data: providers, isLoading } = useProvidersByCategory(
    categoryName ?? "",
  );
  const { location: userLocation, status: locationStatus } = useUserLocation();
  const emoji = CATEGORY_EMOJIS[categoryName ?? ""] ?? "🏻";
  const navigate = useNavigate();

  // Filter providers by GPS radius
  const filteredProviders = useMemo(() => {
    if (!providers || providers.length === 0)
      return { list: [], radiusUsed: 0, locationUsed: false };
    if (!userLocation)
      return { list: providers, radiusUsed: 0, locationUsed: false };

    let lsProviders: Array<{ mobile?: string; lat?: number; lng?: number }> =
      [];
    try {
      lsProviders = JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
    } catch {}

    const enriched = providers.map((p) => {
      const match = lsProviders.find(
        (lp) => lp.lat !== undefined && lp.lng !== undefined,
      );
      return { ...p, lat: match?.lat, lng: match?.lng };
    });

    for (const radius of [2, 5, 10]) {
      const nearby = enriched
        .filter((p) => p.lat !== undefined && p.lng !== undefined)
        .map((p) => ({
          ...p,
          distanceKm: getDistanceKm(
            userLocation.lat,
            userLocation.lng,
            p.lat!,
            p.lng!,
          ),
        }))
        .filter((p) => p.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      if (nearby.length > 0) {
        return { list: nearby, radiusUsed: radius, locationUsed: true };
      }
    }
    return { list: providers, radiusUsed: 0, locationUsed: true };
  }, [providers, userLocation]);

  const {
    list: displayProviders,
    radiusUsed,
    locationUsed,
  } = filteredProviders;

  const [orderModal, setOrderModal] = useState<{
    open: boolean;
    providerId: string;
    providerName: string;
  }>({ open: false, providerId: "", providerName: "" });

  const isScrap = categoryName === "Scrap";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="bg-emerald-header text-white px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-2xl">
                {emoji} {categoryName} Providers
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {locationStatus === "granted" && userLocation ? (
                  <span className="flex items-center gap-1">
                    <LocateFixed size={12} /> GPS चालू — आस-पास की दुकानें
                  </span>
                ) : (
                  "Is category ke sare approved providers"
                )}
              </p>
            </div>

            {/* Scrap Calculator shortcut button */}
            {isScrap && (
              <button
                type="button"
                data-ocid="category.secondary_button"
                onClick={() => navigate("/scrap-calculator")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-white/50 text-white text-sm font-semibold hover:bg-white/15 hover:border-white transition-colors"
              >
                ♻️ Scrap Calculator
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {isLoading ? (
          <div
            data-ocid="category.loading_state"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {Array.from({ length: 6 }, (_, i) => `skel-${i}`).map((sk) => (
              <div
                key={sk}
                className="h-40 bg-gray-100 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : displayProviders && displayProviders.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {locationUsed && radiusUsed > 2 && (
              <div className="col-span-full mb-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700 font-medium">
                2KM में कोई दुकान नहीं मिली — {radiusUsed}KM तक की दुकानें दिख रही हैं
              </div>
            )}
            {displayProviders.map((p, i) => (
              <div key={p.userId.toString()} className="relative">
                <ProviderCard
                  profile={p}
                  index={i + 1}
                  distanceKm={
                    "distanceKm" in p
                      ? (p as { distanceKm: number }).distanceKm
                      : undefined
                  }
                  shopLat={"lat" in p ? (p as { lat?: number }).lat : undefined}
                  shopLng={"lng" in p ? (p as { lng?: number }).lng : undefined}
                />
                <button
                  type="button"
                  data-ocid={`category.primary_button.${i + 1}`}
                  onClick={() =>
                    setOrderModal({
                      open: true,
                      providerId: p.userId.toString(),
                      providerName: p.shopName || p.category,
                    })
                  }
                  className="absolute bottom-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md hover:opacity-90 transition-opacity"
                >
                  <ShoppingBag size={12} /> Order
                </button>
              </div>
            ))}
          </motion.div>
        ) : (
          <div
            data-ocid="category.empty_state"
            className="text-center py-20 text-muted-foreground"
          >
            <p className="text-5xl mb-4">{emoji}</p>
            <p className="font-semibold text-lg">Koi result nahi mila</p>
            <p className="text-sm mt-1">
              {categoryName} category mein abhi koi provider nahi hai
            </p>
          </div>
        )}
      </main>

      <OrderModal
        open={orderModal.open}
        onClose={() => setOrderModal((prev) => ({ ...prev, open: false }))}
        providerId={orderModal.providerId}
        providerName={orderModal.providerName}
      />

      <Footer />
    </div>
  );
}
