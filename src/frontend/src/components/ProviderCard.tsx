import { MapPin, MessageCircle, Navigation, Phone, Star } from "lucide-react";
import { Link } from "../lib/router";
import type { ProviderProfile, User } from "../types/appTypes";
import { getGoogleMapsDirectionsUrl } from "../utils/locationUtils";

interface Props {
  profile: ProviderProfile;
  user?: User | null;
  index?: number;
  distanceKm?: number;
  /** If provided, enables Get Directions button */
  shopLat?: number;
  shopLng?: number;
}

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

const STAR_RATINGS = [0, 1, 2, 3, 4];

export default function ProviderCard({
  profile,
  user,
  index = 1,
  distanceKm,
  shopLat,
  shopLng,
}: Props) {
  const emoji = CATEGORY_EMOJIS[profile.category] ?? "🏪";
  const initials = (
    user?.name ??
    profile.shopName ??
    profile.businessName ??
    "DZ"
  )
    .slice(0, 2)
    .toUpperCase();
  const mobile = user?.mobile ?? "";

  // Also try to get lat/lng from localStorage provider data
  const getShopCoords = (): { lat: number; lng: number } | null => {
    if (shopLat !== undefined && shopLng !== undefined) {
      return { lat: shopLat, lng: shopLng };
    }
    try {
      const providers: Array<{
        id?: string;
        mobile?: string;
        lat?: number;
        lng?: number;
      }> = JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
      const match = providers.find(
        (p) =>
          p.mobile === mobile && p.lat !== undefined && p.lng !== undefined,
      );
      if (match && match.lat !== undefined && match.lng !== undefined) {
        return { lat: match.lat, lng: match.lng };
      }
    } catch {
      // ignore
    }
    return null;
  };

  const coords = getShopCoords();

  return (
    <div
      data-ocid={`providers.item.${index}`}
      className="bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">
            {profile.shopName}
          </h3>
          <p className="text-xs text-muted-foreground">
            {emoji} {profile.category}
          </p>
          <div className="flex items-center gap-0.5 mt-0.5">
            {STAR_RATINGS.map((v) => (
              <Star
                key={v}
                size={10}
                className={
                  v < 4
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200 fill-gray-200"
                }
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              (12 reviews)
            </span>
          </div>
        </div>
        {/* Distance badge */}
        {distanceKm !== undefined && (
          <span className="flex-shrink-0 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
            📍{" "}
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m`
              : `${distanceKm.toFixed(1)}km`}
          </span>
        )}
      </div>

      {profile.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {profile.description}
        </p>
      )}

      {profile.address && (
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <MapPin size={10} className="flex-shrink-0" /> {profile.address}
        </p>
      )}

      <div className="flex gap-2 mt-auto flex-wrap">
        {mobile && (
          <a
            href={`https://wa.me/91${mobile.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid={`providers.button.${index}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
        <Link
          to={`/provider/${profile.userId}`}
          data-ocid={`providers.link.${index}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full border-2 border-primary/30 text-primary text-xs font-semibold hover:bg-accent transition-colors"
        >
          <Phone size={13} /> Contact
        </Link>
        {coords && (
          <a
            href={getGoogleMapsDirectionsUrl(coords.lat, coords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid={`providers.directions.${index}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
          >
            <Navigation size={13} /> Directions
          </a>
        )}
      </div>
    </div>
  );
}
