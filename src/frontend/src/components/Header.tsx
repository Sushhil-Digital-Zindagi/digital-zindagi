import { Download, Globe, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "../lib/router";
import Sidebar from "./Sidebar";

// Admin credentials — both emails supported
const ADMIN_EMAILS = [
  "sushhilkumar651@gmail.com",
  "sushilkumar12022@gmail.com",
];
const ADMIN_PASSWORD = "123456";
const ADMIN_PIN = "12345";

declare global {
  interface Window {
    __dzInstallPrompt?: BeforeInstallPromptEvent;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
}

function LogoImage() {
  // Use admin-customized logo if set, otherwise fall back to /logo.png
  const [src, setSrc] = useState(
    () => localStorage.getItem("dz_app_logo") || "/logo.png",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const handler = () => {
      const customLogo = localStorage.getItem("dz_app_logo");
      if (customLogo) setSrc(customLogo);
    };
    window.addEventListener("dz_settings_changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dz_settings_changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (failed) {
    return (
      <div
        style={{
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
        }}
      >
        🌿
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Digital Zindagi"
      style={{
        width: "40px",
        height: "40px",
        objectFit: "contain",
        display: "block",
        borderRadius: "50%",
        padding: "2px",
        filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))",
      }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

export default function Header() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langDropOpen, setLangDropOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const langRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // PWA Install state — read from global capture in index.html
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(
      () => (window.__dzInstallPrompt as BeforeInstallPromptEvent) ?? null,
    );
  const [isInstalled, setIsInstalled] = useState(() => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true ||
      document.referrer.includes("android-app://")
    );
  });

  useEffect(() => {
    if (window.__dzInstallPrompt && !installPrompt) {
      setInstallPrompt(window.__dzInstallPrompt as BeforeInstallPromptEvent);
    }

    const promptHandler = () => {
      if (window.__dzInstallPrompt) {
        setInstallPrompt(window.__dzInstallPrompt as BeforeInstallPromptEvent);
      }
    };
    window.addEventListener("dz_installprompt_ready", promptHandler);

    const installedHandler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      window.__dzInstallPrompt = undefined;
    };
    window.addEventListener("appinstalled", installedHandler);
    window.addEventListener("dz_app_installed", installedHandler);

    const mqHandler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", mqHandler);

    return () => {
      window.removeEventListener("dz_installprompt_ready", promptHandler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("dz_app_installed", installedHandler);
      mq.removeEventListener("change", mqHandler);
    };
  }, [installPrompt]);

  async function handleInstall() {
    // Try to get prompt from state or global variable
    const prompt =
      installPrompt ??
      (window.__dzInstallPrompt as BeforeInstallPromptEvent | undefined) ??
      null;

    if (prompt) {
      try {
        // Must be called from user gesture (click handler) — this is correct
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          toast.success(
            "Digital Zindagi install ho gaya! App List mein dikh raha hai.",
            { duration: 4000 },
          );
          setInstallPrompt(null);
          setIsInstalled(true);
          window.__dzInstallPrompt = undefined;
        } else {
          toast.info(
            "Install cancel kar diya. Baad mein phir try kar sakte hain.",
            { duration: 4000 },
          );
          // Keep prompt for next attempt
        }
      } catch (err) {
        console.warn("[DZ Install] prompt() failed:", err);
        // Prompt may have already been used — clear and show manual instructions
        window.__dzInstallPrompt = undefined;
        setInstallPrompt(null);
        showManualInstructions();
      }
    } else {
      // No prompt available — check if already in standalone mode
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone
      ) {
        setIsInstalled(true);
        return;
      }
      showManualInstructions();
    }
  }

  function showManualInstructions() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isAndroid) {
      toast.info(
        'Chrome mein upar ke 3-dot menu > "Add to Home screen" ya "App install karein" par tap karein',
        { duration: 6000 },
      );
    } else if (isIOS) {
      toast.info(
        'Safari mein Share button > "Add to Home Screen" par tap karein',
        { duration: 6000 },
      );
    } else {
      toast.info(
        'Browser address bar mein install icon dhundein ya menu mein "Install" option',
        { duration: 6000 },
      );
    }
  }

  // 5-tap secret admin entry
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [popupEmail, setPopupEmail] = useState("");
  const [popupPin, setPopupPin] = useState("");
  const [popupError, setPopupError] = useState("");

  function handleLogoTap() {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setShowAdminPopup(true);
      setPopupEmail("");
      setPopupPin("");
      setPopupError("");
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  }

  function handleAdminLogin() {
    const storedEmail = localStorage.getItem("dz_admin_email");
    const storedPassword =
      localStorage.getItem("dz_admin_password") ?? ADMIN_PASSWORD;
    const storedPin = localStorage.getItem("dz_admin_pin") ?? ADMIN_PIN;

    const enteredEmail = popupEmail.trim().toLowerCase();
    const validEmails = [...ADMIN_EMAILS];
    if (storedEmail) validEmails.push(storedEmail.toLowerCase());

    const emailOk = validEmails.includes(enteredEmail);
    const pinOk = popupPin.trim() === storedPin;
    const passwordOk = popupPin.trim() === storedPassword;

    if (emailOk && (pinOk || passwordOk)) {
      sessionStorage.setItem("adminVerified", "true");
      setShowAdminPopup(false);
      toast.success("एडमिन पैनल में आपका स्वागत है!");
      navigate("/admin");
    } else {
      setPopupError("ईमेल या PIN गलत है। दोबारा कोशिश करें।");
    }
  }

  const langOptions: {
    value: "hinglish" | "hindi" | "english";
    label: string;
  }[] = [
    { value: "hinglish", label: "Hinglish" },
    { value: "hindi", label: "हिंदी" },
    { value: "english", label: "English" },
  ];

  void t;
  void langRef;

  return (
    <>
      <header className="sticky top-0 z-40 bg-emerald-header shadow-emerald">
        <div className="max-w-7xl mx-auto px-3 h-16 flex items-center gap-2">
          {/* Left: Hamburger Menu */}
          <button
            type="button"
            data-ocid="header.open_modal_button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Menu kholein"
          >
            <Menu size={22} />
          </button>

          {/* Center: Logo + Name — 5-tap secret admin entry */}
          <button
            type="button"
            data-ocid="header.logo_tap"
            onClick={handleLogoTap}
            className="font-heading font-bold text-white text-base whitespace-nowrap flex-1 flex items-center gap-2 min-w-0 bg-transparent border-0 cursor-pointer p-0 text-left"
            aria-label="Digital Zindagi"
          >
            <div
              style={{
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1.5px solid rgba(212,175,55,0.6)",
                boxShadow: "0 0 8px rgba(212,175,55,0.3)",
                overflow: "hidden",
                background: "rgba(6,68,32,0.6)",
              }}
            >
              <LogoImage />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="text-white font-bold leading-tight truncate"
                style={{ fontSize: "15px" }}
              >
                Digital Zindagi
              </span>
              <span
                style={{
                  color: "rgba(212,175,55,0.85)",
                  fontSize: "10px",
                  lineHeight: "1",
                  fontWeight: 400,
                }}
              >
                डिजिटल जिंदगी से जुड़ो
              </span>
            </div>
          </button>

          {/* Install Button — visible when not installed, shows native Android install prompt */}
          {!isInstalled && (
            <button
              type="button"
              data-ocid="header.install_button"
              onClick={handleInstall}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: "rgba(212,175,55,0.95)",
                color: "#064420",
                border: "1px solid rgba(212,175,55,0.5)",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(212,175,55,0.4)",
              }}
              title="Digital Zindagi Install Karen — Mobile ki App List mein add karo"
            >
              <Download size={12} />
              <span>Install</span>
            </button>
          )}

          {/* Language Switcher */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              data-ocid="header.toggle"
              onClick={() => setLangDropOpen((v) => !v)}
              className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
              aria-label="Language"
              aria-expanded={langDropOpen}
            >
              <Globe size={18} />
            </button>
            {langDropOpen && (
              <div
                className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border py-1 min-w-[120px] z-50"
                role="menu"
              >
                {langOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    data-ocid="header.button"
                    onClick={() => {
                      setLang(opt.value);
                      setLangDropOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent ${
                      lang === opt.value
                        ? "text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Secret Admin Login Popup */}
      {showAdminPopup && (
        <div
          role="presentation"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdminPopup(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowAdminPopup(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw]">
            <div className="flex flex-col items-center mb-4">
              <div
                style={{
                  background: "linear-gradient(135deg, #064420, #0a6e35)",
                  borderRadius: "50%",
                  padding: "3px",
                  width: "70px",
                  height: "70px",
                  boxShadow:
                    "0 0 0 2.5px #d4af37, 0 4px 20px rgba(6,68,32,0.4)",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Digital Zindagi"
                  style={{
                    width: "64px",
                    height: "64px",
                    objectFit: "contain",
                    borderRadius: "50%",
                    padding: "2px",
                  }}
                  onError={(e) => {
                    // Hide broken image, show text fallback via parent
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              </div>
              <h2 className="text-lg font-bold text-gray-800">एडमिन लॉगिन</h2>
              <p className="text-xs text-gray-500 mt-1">
                Digital Zindagi Admin
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="admin-popup-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ईमेल
                </label>
                <input
                  id="admin-popup-email"
                  type="email"
                  value={popupEmail}
                  onChange={(e) => setPopupEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                />
              </div>
              <div>
                <label
                  htmlFor="admin-popup-pin"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  PIN
                </label>
                <input
                  id="admin-popup-pin"
                  type="password"
                  value={popupPin}
                  onChange={(e) => setPopupPin(e.target.value)}
                  placeholder="12345"
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                />
              </div>

              {popupError && (
                <p className="text-red-500 text-xs text-center">{popupError}</p>
              )}

              <button
                type="button"
                onClick={handleAdminLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                एडमिन पैनल खोलें
              </button>
              <button
                type="button"
                onClick={() => setShowAdminPopup(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors text-sm"
              >
                रद्द करें
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
