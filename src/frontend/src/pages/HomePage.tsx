import {
  Calculator,
  Download,
  Facebook,
  Instagram,
  LocateFixed,
  ShoppingCart,
  X,
  Youtube,
} from "lucide-react";
import { motion } from "motion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import CategoryGrid, { ALL_CATEGORIES } from "../components/CategoryGrid";
import Footer from "../components/Footer";
import Header from "../components/Header";
import HeroCarousel from "../components/HeroCarousel";
import ProviderCard from "../components/ProviderCard";
import VideoGallery from "../components/VideoGallery";
import { useLanguage } from "../contexts/LanguageContext";
import {
  useActiveBanners,
  useActiveProviders,
  useAllToggles,
  useCustomCodes,
  useCustomSections,
} from "../hooks/useQueries";
import { useUserLocation } from "../hooks/useUserLocation";
import { Link, useNavigate } from "../lib/router";
import type { CustomSection } from "../types/appTypes";
import { getDistanceKm } from "../utils/locationUtils";
import { useSettingsListener } from "../utils/settingsSync";

function readHomeSectionToggles() {
  const keys = [
    "dz_section_news",
    "dz_section_jobs",
    "dz_section_image_resizer",
    "dz_section_ai_enhancer",
    "dz_section_age_calculator",
    "dz_section_percentage_calculator",
  ];
  const result: Record<string, boolean> = {};
  for (const k of keys) {
    const val = localStorage.getItem(k);
    result[k] = val === null ? true : val === "true";
  }
  return result;
}

interface CustomSocialPlatform {
  key: string;
  label: string;
  icon: string;
}

interface SocialSettings {
  facebook: boolean;
  instagram: boolean;
  whatsapp: boolean;
  youtube: boolean;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  youtubeUrl: string;
  _customPlatforms?: CustomSocialPlatform[];
}

interface AffiliateLink {
  id: string;
  title: string;
  url: string;
  emoji: string;
}

interface AffiliateSettings {
  enabled: boolean;
  title: string;
  description: string;
  link: string;
  affiliateLinks: AffiliateLink[];
}

function readSocialSettings(): SocialSettings {
  try {
    const raw = localStorage.getItem("dz_social_settings");
    if (!raw)
      return {
        facebook: false,
        instagram: false,
        whatsapp: false,
        youtube: false,
        facebookUrl: "",
        instagramUrl: "",
        whatsappUrl: "",
        youtubeUrl: "",
      };
    const parsed = JSON.parse(raw);
    return {
      facebook: parsed.facebook ?? false,
      instagram: parsed.instagram ?? false,
      whatsapp: parsed.whatsapp ?? false,
      youtube: parsed.youtube ?? false,
      facebookUrl: parsed.facebookUrl ?? "",
      instagramUrl: parsed.instagramUrl ?? "",
      whatsappUrl: parsed.whatsappUrl ?? "",
      youtubeUrl: parsed.youtubeUrl ?? "",
      _customPlatforms: parsed._customPlatforms ?? [],
    };
  } catch {
    return {
      facebook: false,
      instagram: false,
      whatsapp: false,
      youtube: false,
      facebookUrl: "",
      instagramUrl: "",
      whatsappUrl: "",
      youtubeUrl: "",
    };
  }
}

function readAffiliateSettings(): AffiliateSettings {
  try {
    const raw = localStorage.getItem("dz_affiliate_settings");
    if (!raw)
      return {
        enabled: false,
        title: "Affiliate Marketing",
        description: "Paisa kamao Digital Zindagi se!",
        link: "",
        affiliateLinks: [],
      };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled ?? false,
      title: parsed.title ?? "Affiliate Marketing",
      description: parsed.description ?? "Paisa kamao Digital Zindagi se!",
      link: parsed.link ?? "",
      affiliateLinks: parsed.affiliateLinks ?? [],
    };
  } catch {
    return {
      enabled: false,
      title: "Affiliate Marketing",
      description: "Paisa kamao Digital Zindagi se!",
      link: "",
      affiliateLinks: [],
    };
  }
}

interface EBook {
  id: string;
  title: string;
  coverUrl: string;
  price: string;
  downloadLink: string;
  description: string;
  createdAt: string;
}

interface EBookPurchase {
  id: string;
  bookId: string;
  bookTitle: string;
  buyerName: string;
  buyerMobile: string;
  screenshotBase64: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

function readEbooksHome(): EBook[] {
  try {
    return JSON.parse(localStorage.getItem("dz_ebooks") ?? "[]");
  } catch {
    return [];
  }
}

function readEbookPurchasesHome(): EBookPurchase[] {
  try {
    return JSON.parse(localStorage.getItem("dz_ebook_purchases") ?? "[]");
  } catch {
    return [];
  }
}

function readHomepageSettings() {
  return {
    ebookStoreEnabled:
      localStorage.getItem("dz_ebook_store_enabled") === "true",
    showRateCalculator:
      localStorage.getItem("dz_show_rate_calculator") !== "false",
    showHeroCarousel: localStorage.getItem("dz_show_hero_carousel") !== "false",
    showCategoryGrid: localStorage.getItem("dz_show_category_grid") !== "false",
    showProviders: localStorage.getItem("dz_show_providers") !== "false",
    showRegisterBanner:
      localStorage.getItem("dz_show_register_banner") !== "false",
    tagline:
      localStorage.getItem("dz_app_tagline") ??
      "डिजिटल जिंदगी से जुड़ो और लोकल सर्विस का फायदा उठाओ",
    announcementEnabled:
      localStorage.getItem("dz_announcement_enabled") === "true",
    announcementText: localStorage.getItem("dz_announcement") ?? "",
  };
}

// ---- eBook Buy Modal ----
function EbookBuyModal({
  book,
  onClose,
}: {
  book: EBook;
  onClose: () => void;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState(
    () => localStorage.getItem("dz_buyer_mobile") ?? "",
  );
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!buyerName.trim()) {
      toast.error("Apna naam likhein");
      return;
    }
    if (!/^[0-9]{10}$/.test(buyerMobile.trim())) {
      toast.error("10-digit mobile number likhein");
      return;
    }
    if (!screenshotBase64) {
      toast.error("Payment screenshot upload karein");
      return;
    }
    setSubmitting(true);
    const purchases: EBookPurchase[] = (() => {
      try {
        return JSON.parse(localStorage.getItem("dz_ebook_purchases") ?? "[]");
      } catch {
        return [];
      }
    })();
    const newPurchase: EBookPurchase = {
      id: Date.now().toString(),
      bookId: book.id,
      bookTitle: book.title,
      buyerName: buyerName.trim(),
      buyerMobile: buyerMobile.trim(),
      screenshotBase64,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    purchases.push(newPurchase);
    localStorage.setItem("dz_ebook_purchases", JSON.stringify(purchases));
    localStorage.setItem("dz_buyer_mobile", buyerMobile.trim());
    toast.success(
      "Payment screenshot bhej diya! Admin approve hone par download unlock hoga. 📚",
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      data-ocid="ebook.modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25 }}
        className="bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-emerald-header text-white px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex gap-3 items-start">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-12 h-12 object-cover rounded-xl flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📚</span>
              </div>
            )}
            <div>
              <p className="font-heading font-bold text-base leading-tight">
                {book.title}
              </p>
              {book.price && (
                <p className="text-white/80 text-sm mt-0.5">₹{book.price}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            data-ocid="ebook.close_button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-base">
            Payment Details Bharein
          </h3>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="buyer-name"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1"
              >
                Aapka Naam *
              </label>
              <input
                id="buyer-name"
                data-ocid="ebook.input"
                type="text"
                placeholder="Naam likhein"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="buyer-mobile"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1"
              >
                Mobile Number *
              </label>
              <input
                id="buyer-mobile"
                data-ocid="ebook.input"
                type="tel"
                placeholder="10-digit mobile number"
                value={buyerMobile}
                onChange={(e) => setBuyerMobile(e.target.value)}
                maxLength={10}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="payment-screenshot"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1"
              >
                Payment Screenshot *
              </label>
              <label
                htmlFor="payment-screenshot"
                data-ocid="ebook.upload_button"
                className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-emerald-300 rounded-xl px-4 py-3 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                {screenshotBase64 ? (
                  <img
                    src={screenshotBase64}
                    alt="Screenshot preview"
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📸</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {screenshotBase64
                      ? "Screenshot ready ✅"
                      : "Gallery se screenshot choose karein"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    UPI/Bank payment ka screenshot
                  </p>
                </div>
                <input
                  id="payment-screenshot"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            data-ocid="ebook.submit_button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
          >
            {submitting
              ? "Sending..."
              : "📤 Send Screenshot & Request Download"}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            Screenshot bhejne ke baad Admin verify karenge — approve hone par
            download link unlock ho jaayega.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

interface CustomCodeEntry {
  id: string | number;
  label?: string;
  name?: string;
  code: string;
  placement: "top" | "middle" | "bottom" | string;
  enabled: boolean;
  createdAt?: number;
}

interface AdPlacementsSettings {
  header: boolean;
  middle: boolean;
  footer: boolean;
}

function readAdPlacements(): AdPlacementsSettings {
  try {
    return JSON.parse(
      localStorage.getItem("dz_ad_placements") ??
        '{"header":false,"middle":true,"footer":false}',
    );
  } catch {
    return { header: false, middle: true, footer: false };
  }
}

function sanitizeHtml(html: string): string {
  // Basic XSS filter: remove javascript: in href/src, keep admin-trusted code otherwise
  return html
    .replace(/(<[^>]+\s+on\w+\s*=\s*["'][^"']*["'])/gi, (m) =>
      m.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ""),
    )
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
}

function CustomCodeBlock({ entry }: { entry: CustomCodeEntry }) {
  const ref = React.useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when code changes
  React.useEffect(() => {
    if (!ref.current) return;
    // Delay script injection by 100ms to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!ref.current) return;
      const scripts = ref.current.querySelectorAll("script");
      for (const oldScript of Array.from(scripts)) {
        const newScript = document.createElement("script");
        if ((oldScript as HTMLScriptElement).src) {
          newScript.src = (oldScript as HTMLScriptElement).src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
        oldScript.remove();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [entry.code]);
  return (
    <div
      ref={ref}
      id={`dz-custom-code-${entry.id}`}
      className="custom-code-block w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled code
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.code) }}
    />
  );
}

function AdBanners({ position }: { position: "header" | "middle" | "footer" }) {
  const adsEnabled =
    localStorage.getItem("dz_admob_config") !== null
      ? (() => {
          try {
            return (
              JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}")
                .masterEnabled !== false
            );
          } catch {
            return true;
          }
        })()
      : true;
  if (!adsEnabled) return null;

  const placements = readAdPlacements();
  if (!placements[position]) return null;

  const customAds: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("dz_custom_internal_ads") ?? "[]");
    } catch {
      return [];
    }
  })();

  if (customAds.length === 0) return null;

  // Show a random custom ad
  const ad = customAds[Math.floor(Math.random() * customAds.length)];
  return (
    <div className="w-full px-4 py-2 max-w-7xl mx-auto">
      <img
        src={ad}
        alt="Advertisement"
        className="w-full rounded-xl object-cover max-h-24"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

// ─── Dynamic Custom Section renderer ─────────────────────────────────────────

interface SectionButton {
  label: string;
  url: string;
  icon: string;
}

function CustomSectionBlock({ section }: { section: CustomSection }) {
  let buttons: SectionButton[] = [];
  try {
    buttons = JSON.parse(section.buttons || "[]") as SectionButton[];
  } catch {
    buttons = [];
  }
  if (buttons.length === 0) {
    return (
      <div className="mx-4 my-3 p-3 border border-dashed border-emerald-300 rounded-lg">
        <h2 className="text-lg font-bold text-emerald-700">
          {section.heading}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          No buttons added yet. Add buttons from Admin Panel.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-4 my-3 max-w-7xl">
      <h2 className="text-lg font-bold text-emerald-700 mb-2">
        {section.heading}
      </h2>
      <div className="flex flex-wrap gap-2">
        {buttons.map((btn, i) => (
          <a
            // biome-ignore lint/suspicious/noArrayIndexKey: static buttons from admin
            key={i}
            href={btn.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            {btn.icon && <span>{btn.icon}</span>}
            {btn.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// WhatsApp icon as SVG since lucide doesn't have it
function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.14.564 4.148 1.55 5.88L0 24l6.335-1.524A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.092-1.424l-.364-.217-3.768.906.952-3.673-.237-.377A9.779 9.779 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
    </svg>
  );
}

export default function HomePage() {
  const { data: banners, isLoading: bannersLoading } = useActiveBanners();
  const { data: providers, isLoading: providersLoading } = useActiveProviders();
  const { data: toggles, isLoading: togglesLoading } = useAllToggles();
  const { data: canisterCustomCodes } = useCustomCodes();
  const { data: customSections } = useCustomSections();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { location: userLocation, status: locationStatus } = useUserLocation();

  const [socialSettings, setSocialSettings] =
    useState<SocialSettings>(readSocialSettings);
  const [affiliateSettings, setAffiliateSettings] = useState<AffiliateSettings>(
    readAffiliateSettings,
  );
  const [ebooks, setEbooks] = useState<EBook[]>(readEbooksHome);
  const [buyModalBook, setBuyModalBook] = useState<EBook | null>(null);
  const [homepageSettings, setHomepageSettings] =
    useState(readHomepageSettings);

  const [sectionToggles, setSectionToggles] = useState(readHomeSectionToggles);

  // Merge canister custom codes with localStorage fallback
  const customCodes: CustomCodeEntry[] = useMemo(() => {
    if (canisterCustomCodes && canisterCustomCodes.length > 0) {
      return canisterCustomCodes.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.btnLabel,
        code: c.code,
        placement: c.placement as "top" | "middle" | "bottom",
        enabled: c.enabled,
      }));
    }
    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem("dz_custom_codes") ?? "[]");
    } catch {
      return [];
    }
  }, [canisterCustomCodes]);

  const reloadSettings = useCallback(() => {
    setSocialSettings(readSocialSettings());
    setAffiliateSettings(readAffiliateSettings());
    setEbooks(readEbooksHome());
    setHomepageSettings(readHomepageSettings());
    setSectionToggles(readHomeSectionToggles());
  }, []);

  // Re-read settings on focus (in case admin changed them)
  useEffect(() => {
    window.addEventListener("focus", reloadSettings);
    return () => window.removeEventListener("focus", reloadSettings);
  }, [reloadSettings]);

  // Real-time sync listener
  useSettingsListener(reloadSettings);

  // GPS-based filtering: 2KM primary, fallback to 5KM then 10KM
  const getLocalProviders = () => {
    if (!providers || providers.length === 0)
      return { list: [], radiusUsed: 0, hasLocation: false };
    if (!userLocation) {
      return { list: providers.slice(0, 6), radiusUsed: 0, hasLocation: false };
    }
    type LsProvider = { mobile?: string; lat?: number; lng?: number };
    type EnrichedProvider = (typeof providers)[0] & {
      lat?: number;
      lng?: number;
      distanceKm?: number;
    };
    let lsProviders: LsProvider[] = [];
    try {
      lsProviders = JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
    } catch {}

    const enriched: EnrichedProvider[] = providers.map((p) => {
      const pAny = p as unknown as { mobile?: string };
      const match = lsProviders.find(
        (lp) =>
          lp.mobile === pAny.mobile &&
          lp.lat !== undefined &&
          lp.lng !== undefined,
      );
      if (!match) return { ...p } as EnrichedProvider;
      return { ...p, lat: match.lat, lng: match.lng } as EnrichedProvider;
    });

    for (const radius of [2, 5, 10]) {
      const nearby = enriched
        .filter((p) => p.lat !== undefined && p.lng !== undefined)
        .map((p) => ({
          ...p,
          distanceKm: getDistanceKm(
            userLocation.lat,
            userLocation.lng,
            p.lat as number,
            p.lng as number,
          ),
        }))
        .filter((p) => p.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 6);
      if (nearby.length > 0) {
        return { list: nearby, radiusUsed: radius, hasLocation: true };
      }
    }
    return { list: providers.slice(0, 6), radiusUsed: 0, hasLocation: true };
  };

  const {
    list: featuredProviders,
    radiusUsed,
    hasLocation: locationUsed,
  } = getLocalProviders();

  const lowestPrice = useMemo(() => {
    const prices = ALL_CATEGORIES.flatMap((cat) => {
      try {
        const d = JSON.parse(
          localStorage.getItem(`dz_cat_row_${cat.name}`) ?? "{}",
        );
        return d.m1 ? [Number(d.m1)] : [];
      } catch {
        return [];
      }
    });
    return prices.length > 0 ? Math.min(...prices) : null;
  }, []);

  const enabledSocialPlatforms = [
    {
      key: "facebook",
      enabled: socialSettings.facebook,
      url: socialSettings.facebookUrl,
      icon: <Facebook size={22} />,
      color: "bg-blue-600",
      label: "Facebook",
    },
    {
      key: "instagram",
      enabled: socialSettings.instagram,
      url: socialSettings.instagramUrl,
      icon: <Instagram size={22} />,
      color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
      label: "Instagram",
    },
    {
      key: "whatsapp",
      enabled: socialSettings.whatsapp,
      url: socialSettings.whatsappUrl,
      icon: <WhatsAppIcon size={22} />,
      color: "bg-green-500",
      label: "WhatsApp",
    },
    {
      key: "youtube",
      enabled: socialSettings.youtube,
      url: socialSettings.youtubeUrl,
      icon: <Youtube size={22} />,
      color: "bg-red-600",
      label: "YouTube",
    },
  ].filter((p) => p.enabled);

  const customSocialPlatforms = (socialSettings._customPlatforms ?? [])
    .filter((p) => socialSettings[p.key as keyof SocialSettings])
    .map((p) => ({
      key: p.key,
      enabled: true,
      url:
        (socialSettings[`${p.key}Url` as keyof SocialSettings] as string) ?? "",
      icon: <span style={{ fontSize: "22px" }}>{p.icon}</span>,
      color: "bg-muted-foreground",
      label: p.label,
    }));

  const allEnabledSocialPlatforms = [
    ...enabledSocialPlatforms,
    ...customSocialPlatforms,
  ];

  const hasTopSection =
    sectionToggles.dz_section_news ||
    sectionToggles.dz_section_jobs ||
    sectionToggles.dz_section_image_resizer ||
    sectionToggles.dz_section_ai_enhancer ||
    sectionToggles.dz_section_age_calculator ||
    sectionToggles.dz_section_percentage_calculator;

  // Mirror dz-container-* content to legacy alias IDs so external scripts targeting
  // home-top-container / home-middle-container / home-bottom-container still work.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — re-mirror whenever codes/sections change
  useEffect(() => {
    const pairs: [string, string][] = [
      ["dz-container-top", "home-top-container"],
      ["dz-container-middle", "home-middle-container"],
      ["dz-container-bottom", "home-bottom-container"],
    ];
    for (const [srcId, aliasId] of pairs) {
      const src = document.getElementById(srcId);
      const alias = document.getElementById(aliasId);
      if (src && alias && alias !== src) {
        alias.innerHTML = src.innerHTML;
      }
    }
  }, [customCodes, customSections]);

  // Direct DOM injection fallback: ensures custom codes appear even if React
  // rendering is delayed or missed (e.g. async data load after first paint).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — re-inject when codes change
  useEffect(() => {
    if (!customCodes || customCodes.length === 0) return;
    const timer = setTimeout(() => {
      for (const placement of ["top", "middle", "bottom"] as const) {
        const containerId =
          placement === "top"
            ? "dz-container-top"
            : placement === "middle"
              ? "dz-container-middle"
              : "dz-container-bottom";
        const el = document.getElementById(containerId);
        if (!el) continue;
        const codes = customCodes.filter(
          (c) => c.enabled && c.placement === placement,
        );
        for (const entry of codes) {
          if (el.querySelector(`#dz-custom-code-${entry.id}`)) continue;
          const wrapper = document.createElement("div");
          wrapper.id = `dz-custom-code-${entry.id}`;
          wrapper.className = "custom-code-block w-full";
          wrapper.innerHTML = sanitizeHtml(entry.code);
          const scripts = wrapper.querySelectorAll("script");
          for (const oldScript of Array.from(scripts)) {
            const newScript = document.createElement("script");
            if ((oldScript as HTMLScriptElement).src) {
              newScript.src = (oldScript as HTMLScriptElement).src;
            } else {
              newScript.textContent = oldScript.textContent;
            }
            document.body.appendChild(newScript);
            oldScript.remove();
          }
          el.appendChild(wrapper);
        }
        // Mirror to alias after injection
        const aliasId =
          placement === "top"
            ? "home-top-container"
            : placement === "middle"
              ? "home-middle-container"
              : "home-bottom-container";
        const alias = document.getElementById(aliasId);
        if (alias) alias.innerHTML = el.innerHTML;
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customCodes]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* ── TOP CONTAINER ─────────────────────────────────────────── */}
        <div id="dz-container-top" style={{ minHeight: 1 }}>
          {/* Custom Code — TOP placement */}
          {customCodes
            .filter((c) => c.enabled && c.placement === "top")
            .map((entry) => (
              <CustomCodeBlock key={entry.id} entry={entry} />
            ))}
          {/* Dynamic Custom Sections — TOP placement */}
          {(customSections ?? [])
            .filter((s) => s.enabled && s.placement === "top")
            .map((section) => (
              <CustomSectionBlock key={section.id} section={section} />
            ))}
        </div>
        {/* Legacy alias for external scripts targeting home-top-container */}
        <div
          id="home-top-container"
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {/* Ad Banner — Header position */}
        <AdBanners position="header" />

        {/* Hero Section */}
        {homepageSettings.showHeroCarousel && (
          <section className="bg-emerald-hero px-4 py-4 overflow-hidden w-full">
            <div className="max-w-7xl mx-auto">
              <HeroCarousel banners={banners} loading={bannersLoading} />
            </div>
          </section>
        )}

        {/* Tagline Banner */}
        <section className="bg-emerald-header px-4 py-3">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-white font-semibold text-base sm:text-lg tracking-wide">
              {homepageSettings.tagline}
            </p>
          </div>
        </section>

        {/* Announcement Marquee */}
        {homepageSettings.announcementEnabled &&
          homepageSettings.announcementText && (
            <div className="bg-amber-50 border-y border-amber-200 px-4 py-2 overflow-hidden">
              <p className="text-amber-800 text-sm font-medium animate-marquee whitespace-nowrap">
                📢 {homepageSettings.announcementText}
              </p>
            </div>
          )}

        {/* Search Bar */}
        <section className="bg-card border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = (
                  e.currentTarget.elements.namedItem("q") as HTMLInputElement
                ).value;
                if (q.trim())
                  navigate(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
              className="flex gap-2"
            >
              <input
                name="q"
                data-ocid="home.search_input"
                type="text"
                placeholder={t("search")}
                className="flex-1 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
                aria-label="Search"
              />
              <button
                type="submit"
                data-ocid="home.submit_button"
                className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("searchBtn")}
              </button>
            </form>
          </div>
        </section>

        {/* Rate Calculator + Udhaar Khata + Delivery row */}
        {homepageSettings.showRateCalculator && (
          <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex gap-2"
            >
              {/* Rate Calculator — 50% width */}
              <button
                type="button"
                onClick={() => navigate("/scrap-calculator")}
                data-ocid="home.rate_calculator_button"
                className="w-1/2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-600 transition-all active:scale-[0.99]"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calculator size={26} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-bold text-sm">
                    🧭 Rate Calculator
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    Scrap ka sahi daam
                  </p>
                </div>
              </button>

              {/* Udhaar Khata — 50% width, shown when dz_udhaar_enabled is ON */}
              {(() => {
                const udhaarEnabled =
                  localStorage.getItem("dz_udhaar_enabled") !== "false";
                if (!udhaarEnabled) return null;
                return (
                  <button
                    type="button"
                    onClick={() => navigate("/udhaar-book")}
                    data-ocid="home.udhaar_button"
                    className="w-1/2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-4 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-indigo-600 transition-all active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📒</span>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-sm">
                        उधार खाता
                      </p>
                      <p className="text-white/80 text-xs mt-0.5">
                        ग्राहक हिसाब
                      </p>
                    </div>
                  </button>
                );
              })()}

              {/* Delivery — shown only if delivery enabled AND no udhaar card (avoid 3-card overflow) */}
              {(() => {
                const udhaarEnabled =
                  localStorage.getItem("dz_udhaar_enabled") !== "false";
                if (udhaarEnabled) return null; // udhaar card already occupies the second slot
                try {
                  const ds = JSON.parse(
                    localStorage.getItem("dz_delivery_settings") || "{}",
                  );
                  if (!ds.serviceEnabled) return null;
                } catch {
                  return null;
                }
                return (
                  <button
                    type="button"
                    onClick={() => navigate("/delivery-order")}
                    data-ocid="home.delivery_button"
                    className="w-1/2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🚵</span>
                    </div>
                    <div className="text-center">
                      <p className="font-heading font-bold text-sm">
                        🚗 Delivery
                      </p>
                      <p className="text-white/80 text-xs mt-0.5">
                        Fast local delivery
                      </p>
                    </div>
                  </button>
                );
              })()}
            </motion.div>
          </section>
        )}

        {/* Quick Navigation Cards: News, Jobs, Student Tools */}
        {hasTopSection && (
          <section className="max-w-7xl mx-auto px-4 pt-2 pb-2">
            <div className="grid grid-cols-2 gap-2">
              {sectionToggles.dz_section_news && (
                <button
                  type="button"
                  onClick={() => navigate("/news")}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📰</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">
                      Latest News
                    </p>
                    <p className="text-white/75 text-xs">Taza khabar</p>
                  </div>
                </button>
              )}
              {sectionToggles.dz_section_jobs && (
                <button
                  type="button"
                  onClick={() => navigate("/jobs")}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-white p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💼</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">
                      Sarkari Jobs
                    </p>
                    <p className="text-white/75 text-xs">Naukri dhundho</p>
                  </div>
                </button>
              )}
              {sectionToggles.dz_section_image_resizer && (
                <button
                  type="button"
                  onClick={() => navigate("/image-resizer")}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 text-white p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🖼️</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">
                      Image Resizer
                    </p>
                    <p className="text-white/75 text-xs">Photo compress</p>
                  </div>
                </button>
              )}
              {sectionToggles.dz_section_ai_enhancer && (
                <button
                  type="button"
                  onClick={() => navigate("/ai-enhancer")}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 text-white p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">✨</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">
                      AI Enhancer
                    </p>
                    <p className="text-white/75 text-xs">Photo clear karo</p>
                  </div>
                </button>
              )}
              {sectionToggles.dz_section_age_calculator && (
                <button
                  type="button"
                  onClick={() => navigate("/age-calculator")}
                  className="rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🎂</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">
                      Age Calculator
                    </p>
                    <p className="text-white/75 text-xs">Saal/Mahine/Din</p>
                  </div>
                </button>
              )}
              {sectionToggles.dz_section_percentage_calculator && (
                <button
                  type="button"
                  onClick={() => navigate("/percentage-calculator")}
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold">%</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm">
                      % Calculator
                    </p>
                    <p className="text-white/75 text-xs">Marks, Change</p>
                  </div>
                </button>
              )}
            </div>
          </section>
        )}

        {/* eBook Store Section */}
        {homepageSettings.ebookStoreEnabled && ebooks.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 pt-2 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-heading font-bold text-2xl text-foreground">
                  📚 Digital eBook Store
                </h2>
                <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                  New
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ebooks.map((book) => {
                  const purchases = readEbookPurchasesHome();
                  const buyerMobile =
                    localStorage.getItem("dz_buyer_mobile") ?? "";
                  const myPurchase = purchases.find(
                    (p) =>
                      p.bookId === book.id &&
                      (!buyerMobile || p.buyerMobile === buyerMobile),
                  );
                  return (
                    <div
                      key={book.id}
                      data-ocid="ebook.card"
                      className="bg-card rounded-2xl border border-border shadow-card overflow-hidden flex flex-col"
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-36 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                          <span className="text-5xl">📚</span>
                        </div>
                      )}
                      <div className="p-3 flex flex-col flex-1 gap-2">
                        <p className="font-semibold text-foreground text-sm line-clamp-2 leading-snug">
                          {book.title}
                        </p>
                        {book.price && (
                          <span className="self-start bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            ₹{book.price}
                          </span>
                        )}
                        <div className="mt-auto pt-1">
                          {myPurchase?.status === "approved" ? (
                            <a
                              href={book.downloadLink || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-ocid="ebook.primary_button"
                              className="flex items-center justify-center gap-1.5 w-full bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                            >
                              <Download size={13} /> Download PDF
                            </a>
                          ) : myPurchase?.status === "pending" ? (
                            <div
                              data-ocid="ebook.loading_state"
                              className="flex items-center justify-center w-full bg-yellow-100 text-yellow-700 text-xs font-semibold py-2 rounded-xl"
                            >
                              ⏳ Approval Pending
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-ocid="ebook.primary_button"
                              onClick={() => setBuyModalBook(book)}
                              className="flex items-center justify-center gap-1.5 w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-xl hover:opacity-90 transition-opacity"
                            >
                              <ShoppingCart size={13} /> Buy Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </section>
        )}

        {/* Buy Now Modal */}
        {buyModalBook && (
          <EbookBuyModal
            book={buyModalBook}
            onClose={() => setBuyModalBook(null)}
          />
        )}

        {homepageSettings.showCategoryGrid && (
          <section className="max-w-7xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading font-bold text-2xl text-foreground">
                  {t("popularServices")}
                </h2>
              </div>
              <CategoryGrid toggles={toggles} loading={togglesLoading} />
            </motion.div>
          </section>
        )}

        {/* ── MIDDLE CONTAINER ──────────────────────────────────────── */}
        <div id="dz-container-middle" style={{ minHeight: 1 }}>
          {/* Custom Code — MIDDLE placement (after CategoryGrid, before providers) */}
          {customCodes
            .filter((c) => c.enabled && c.placement === "middle")
            .map((entry) => (
              <CustomCodeBlock key={entry.id} entry={entry} />
            ))}
          {/* Dynamic Custom Sections — MIDDLE placement */}
          {(customSections ?? [])
            .filter((s) => s.enabled && s.placement === "middle")
            .map((section) => (
              <CustomSectionBlock key={section.id} section={section} />
            ))}
        </div>
        {/* Legacy alias for external scripts targeting home-middle-container */}
        <div
          id="home-middle-container"
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {/* Ad Banner — Middle position */}
        <AdBanners position="middle" />

        {homepageSettings.showProviders && (
          <section className="max-w-7xl mx-auto px-4 py-8 border-t border-border">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="font-heading font-bold text-2xl text-foreground">
                    {t("featuredProviders")} ⭐
                  </h2>
                  {locationStatus === "granted" && userLocation ? (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                      <LocateFixed size={11} /> GPS चालू है — आस-पास की दुकानें दिख
                      रही हैं
                    </p>
                  ) : locationStatus === "denied" ? (
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      📍 Location Permission नहीं मिली — सभी दुकानें दिख रही हैं
                    </p>
                  ) : locationStatus === "requesting" ? (
                    <p className="text-xs text-amber-500 font-medium mt-0.5">
                      📍 Location ढूंढ रहे हैं...
                    </p>
                  ) : null}
                </div>
                <Link
                  to="/search"
                  data-ocid="home.link"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  {t("viewAll")} &rarr;
                </Link>
              </div>

              {/* Radius fallback message */}
              {locationUsed && radiusUsed > 2 && (
                <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700 font-medium">
                  आपके पास अभी 2KM में कोई दुकान नहीं है, दायरा बढ़ा रहे हैं... (
                  {radiusUsed}KM तक की दुकानें दिख रही हैं)
                </div>
              )}

              {providersLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }, (_, i) => `skel-${i}`).map(
                    (sk) => (
                      <div
                        key={sk}
                        className="h-40 bg-muted animate-pulse rounded-2xl"
                      />
                    ),
                  )}
                </div>
              ) : featuredProviders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredProviders.map((p, i) => (
                    <ProviderCard
                      key={p.userId.toString()}
                      profile={p}
                      index={i + 1}
                      distanceKm={
                        "distanceKm" in p
                          ? (p as { distanceKm: number }).distanceKm
                          : undefined
                      }
                      shopLat={
                        "lat" in p ? (p as { lat?: number }).lat : undefined
                      }
                      shopLng={
                        "lng" in p ? (p as { lng?: number }).lng : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <div
                  data-ocid="providers.empty_state"
                  className="text-center py-12 text-muted-foreground"
                >
                  <p className="text-4xl mb-3">🏪</p>
                  <p className="font-medium">Abhi koi provider nahi hai</p>
                  <p className="text-sm mt-1">
                    Provider ban-o aur pehle list mein aao!
                  </p>
                  <Link
                    to="/signup"
                    data-ocid="providers.primary_button"
                    className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    {t("providerSignup")}
                  </Link>
                </div>
              )}
            </motion.div>
          </section>
        )}

        {/* Video Gallery Section */}
        <VideoGallery />

        {homepageSettings.showRegisterBanner && (
          <section className="px-4 mb-8">
            <div className="bg-emerald-header max-w-7xl mx-auto rounded-2xl">
              <div className="px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-bold text-white text-xl mb-1">
                    {t("registerBusiness")}
                  </h3>
                  <p className="text-white/75 text-sm">
                    {lowestPrice != null
                      ? `Sirf ₹${lowestPrice}/maah mein apna digital shop shuru karein!`
                      : "Register karo aur hazaro customers tak pahuncho. Bilkul free!"}
                  </p>
                </div>
                <Link
                  to="/signup"
                  data-ocid="home.primary_button"
                  className="bg-card text-emerald-800 font-bold px-8 py-3 rounded-full hover:bg-emerald-50 transition-colors whitespace-nowrap"
                >
                  {t("registerNow")}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Affiliate Marketing Banner */}
        {affiliateSettings.enabled && (
          <section className="px-4 mb-6 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">💰</span>
                    <h3 className="font-heading font-bold text-white text-xl">
                      {affiliateSettings.title}
                    </h3>
                  </div>
                  <p className="text-white/85 text-sm">
                    {affiliateSettings.description}
                  </p>
                </div>
                {affiliateSettings.affiliateLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    {affiliateSettings.affiliateLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-ocid="home.primary_button"
                        className="flex-shrink-0 bg-card text-emerald-700 font-bold px-4 py-2 rounded-full hover:bg-emerald-50 transition-colors text-sm shadow-md"
                      >
                        {link.emoji} {link.title}
                      </a>
                    ))}
                  </div>
                ) : affiliateSettings.link ? (
                  <a
                    href={affiliateSettings.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="home.primary_button"
                    className="flex-shrink-0 bg-card text-emerald-700 font-bold px-7 py-2.5 rounded-full hover:bg-emerald-50 transition-colors text-sm shadow-md"
                  >
                    Join Now &rarr;
                  </a>
                ) : null}
              </div>
            </motion.div>
          </section>
        )}

        {/* Social Media Icons */}
        {allEnabledSocialPlatforms.length > 0 && (
          <section className="px-4 pb-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-card"
            >
              <p className="text-center text-sm font-semibold text-muted-foreground mb-4">
                Hamare Social Media par Follow Karein
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {allEnabledSocialPlatforms.map((platform) => (
                  <a
                    key={platform.key}
                    href={platform.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="home.link"
                    aria-label={platform.label}
                    className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform ${platform.color}`}
                  >
                    {platform.icon}
                  </a>
                ))}
              </div>
            </motion.div>
          </section>
        )}
      </main>

      {/* ── BOTTOM CONTAINER ──────────────────────────────────────── */}
      <div id="dz-container-bottom" style={{ minHeight: 1 }}>
        {/* Custom Code — BOTTOM placement (before Footer) */}
        {customCodes
          .filter((c) => c.enabled && c.placement === "bottom")
          .map((entry) => (
            <CustomCodeBlock key={entry.id} entry={entry} />
          ))}
        {/* Dynamic Custom Sections — BOTTOM placement */}
        {(customSections ?? [])
          .filter((s) => s.enabled && s.placement === "bottom")
          .map((section) => (
            <CustomSectionBlock key={section.id} section={section} />
          ))}
      </div>
      {/* Legacy alias for external scripts targeting home-bottom-container */}
      <div
        id="home-bottom-container"
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* Ad Banner — Footer position */}
      <AdBanners position="footer" />

      {/* ── OFFER PORTAL SECTION ─────────────────────────────────── */}
      {(() => {
        const offerEnabled =
          localStorage.getItem("dz_section_offer_portal") !== "false" &&
          localStorage.getItem("dz_offer_enabled") !== "false";
        if (!offerEnabled) return null;
        return (
          <section
            className="px-4 pb-6 max-w-7xl mx-auto"
            data-ocid="offer_portal.section"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative overflow-hidden rounded-2xl border-2 border-amber-400/60 shadow-xl"
              style={{
                background:
                  "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #1a1a2e 100%)",
              }}
            >
              {/* Decorative glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at top right, rgba(251,191,36,0.18) 0%, transparent 60%)",
                }}
              />
              {/* Gold shimmer top border */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #f59e0b, #fbbf24, #f59e0b, transparent)",
                }}
              />

              <div className="relative px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-5">
                {/* Left — text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-3xl leading-none" aria-hidden>
                      🚀
                    </span>
                    <h3 className="font-heading font-extrabold text-white text-xl tracking-tight">
                      Digital Zindagi Offer
                    </h3>
                    <span className="inline-flex items-center bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                      LIVE
                    </span>
                  </div>
                  <p className="text-white/75 text-sm leading-snug max-w-xs">
                    Kamaao ghar se!{" "}
                    <span className="text-amber-300 font-semibold">60%</span> to
                    you on every conversion — 1% referral bonus bhi milega!
                  </p>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                      CPALead Powered
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <span>💸</span>
                      UPI Withdrawal
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <span>👥</span>
                      Refer &amp; Earn 1%
                    </div>
                  </div>
                </div>

                {/* Right — CTA */}
                <button
                  type="button"
                  data-ocid="offer_portal.cta_button"
                  onClick={() => navigate("/offer-portal")}
                  className="flex-shrink-0 relative group overflow-hidden bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-emerald-900 font-extrabold px-7 py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.97] text-sm whitespace-nowrap"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Join &amp; Earn
                    <span aria-hidden>→</span>
                  </span>
                  {/* Shine sweep */}
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    aria-hidden
                  />
                </button>
              </div>

              {/* Bottom decorative border */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #f59e0b, #fbbf24, #f59e0b, transparent)",
                }}
              />
            </motion.div>
          </section>
        );
      })()}

      <Footer />
    </div>
  );
}
