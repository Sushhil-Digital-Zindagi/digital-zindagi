import {
  Loader2,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useLanguage } from "../contexts/LanguageContext";
import {
  useAdminConfig,
  useProviderProfile,
  useUserById,
} from "../hooks/useQueries";
import { Link, useParams } from "../lib/router";

const CATEGORY_EMOJIS: Record<string, string> = {
  Scrap: "♻️",
  Doctor: "🏥",
  Market: "🛒",
  Labor: "👷",
  Electronics: "📱",
  Plumber: "🔧",
  Carpenter: "🪚",
  Tutor: "📚",
  Electrician: "⚡",
  Painter: "🎨",
  Tailor: "✂️",
  Salon: "💇",
};

const STAR_VALS = [0, 1, 2, 3, 4];

export default function ProviderProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const numUserId = userId ? BigInt(userId) : null;
  const { data: profile, isLoading: profileLoading } =
    useProviderProfile(numUserId);
  const { data: user, isLoading: userLoading } = useUserById(numUserId);
  const { data: config } = useAdminConfig();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const { t } = useLanguage();

  const loading = profileLoading || userLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div
          className="flex-1 flex items-center justify-center"
          data-ocid="profile.loading_state"
        >
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div
          className="flex-1 flex items-center justify-center"
          data-ocid="profile.error_state"
        >
          <div className="text-center">
            <p className="text-4xl mb-3">💭</p>
            <p className="font-semibold text-foreground">{t("noProvider")}</p>
            <Link
              to="/"
              className="text-primary text-sm hover:underline mt-2 block"
            >
              {t("backHome")}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const emoji = CATEGORY_EMOJIS[profile.category] ?? "🏪";
  const mobile = user?.mobile ?? "";
  const initials = profile.shopName.slice(0, 2).toUpperCase();
  const profilePhoto = profile.photos.length > 0 ? profile.photos[0] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-emerald-hero text-white px-4 py-8">
          <div className="max-w-4xl mx-auto flex items-start gap-5">
            {/* Profile Photo or Initials Avatar */}
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={profile.shopName}
                className="w-20 h-20 rounded-full object-cover border-2 border-white/40 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-heading font-bold text-2xl">
                {profile.shopName}
              </h1>
              <p className="text-white/80 text-sm">
                {emoji} {profile.category}
              </p>
              {profile.address && (
                <p className="text-white/70 text-sm flex items-center gap-1 mt-1">
                  <MapPin size={13} /> {profile.address}
                </p>
              )}
              {mobile && (
                <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                  <Phone size={13} /> {mobile}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2">
                {STAR_VALS.map((v) => (
                  <Star
                    key={v}
                    size={13}
                    className={
                      v < 4
                        ? "fill-amber-400 text-amber-400"
                        : "text-white/30 fill-white/30"
                    }
                  />
                ))}
                <span className="text-white/70 text-xs ml-1">
                  4.0 (12 reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-3 flex-wrap"
          >
            {mobile && (
              <>
                <a
                  href={`tel:${mobile}`}
                  data-ocid="profile.button"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:opacity-90 text-white font-bold transition-colors shadow-md"
                >
                  <Phone size={18} /> {t("callNow")}
                </a>
                <a
                  href={`https://wa.me/91${mobile.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ocid="profile.button"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors"
                >
                  <MessageCircle size={18} /> {t("whatsapp")}
                </a>
              </>
            )}
            {profile.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                data-ocid="profile.button"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-accent transition-colors"
              >
                <MapIcon size={18} /> {t("navigateMaps")}
              </a>
            )}
            {/* Share Buttons */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${profile.shopName} - ${profile.category} Service | Digital Zindagi par dekhein: ${window.location.href}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="profile.whatsapp_share"
              className="flex items-center gap-2 bg-green-500 text-white font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              <MessageCircle size={16} />
              WhatsApp Share
            </a>
            <button
              type="button"
              data-ocid="profile.copy_link"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copy ho gaya!");
              }}
              className="flex items-center gap-2 bg-white border border-border text-foreground font-bold px-5 py-3 rounded-xl hover:bg-muted transition-colors text-sm"
            >
              Share Karein
            </button>
          </motion.div>

          {profile.description && (
            <div className="bg-white rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground mb-2">
                Hamare Baare Mein
              </h3>
              <p className="text-sm text-muted-foreground">
                {profile.description}
              </p>
            </div>
          )}

          {profile.photos.length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground mb-3">
                Shop Photos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.photos.map((url, i) => (
                  <button
                    key={`photo-${url}`}
                    type="button"
                    onClick={() => setSelectedPhoto(i)}
                    className={`aspect-square overflow-hidden rounded-xl border transition-all ${
                      selectedPhoto === i
                        ? "border-primary border-2"
                        : "border-border"
                    }`}
                    aria-label={`Dukaan ki tasveer ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Dukaan ki tasveer ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {profile.serviceRates.length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground mb-3">
                Service Rates
              </h3>
              <div className="space-y-2">
                {profile.serviceRates.map((rate, i) => (
                  <div
                    key={rate.name}
                    data-ocid={`profile.item.${i + 1}`}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {rate.name}
                      </p>
                      {rate.description && (
                        <p className="text-xs text-muted-foreground">
                          {rate.description}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-primary">
                      ₹{rate.price.toString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPI QR Section */}
          {config?.qrCodeBlobId && (
            <div className="bg-white rounded-2xl border border-border shadow-card p-5">
              <h3 className="font-semibold text-foreground mb-3">
                UPI Payment
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <img
                  src={config.qrCodeBlobId.getDirectURL()}
                  alt="UPI QR Code"
                  className="w-36 h-36 object-contain border border-border rounded-xl"
                />
                <div>
                  {config.upiId && (
                    <p className="font-bold text-foreground text-lg mb-1">
                      {config.upiId}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Is QR code se direct payment karein
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
