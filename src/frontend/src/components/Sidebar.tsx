import {
  Briefcase,
  Gamepad2,
  Globe,
  Home,
  LogIn,
  LogOut,
  Settings,
  Share2,
  ShoppingBag,
  Smartphone,
  Store,
  User,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useRechargeServiceEnabled } from "../hooks/useQueries";
import { Link, useNavigate } from "../lib/router";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  // Game visibility — controlled by Admin toggle (dz_game_visible) AND dz_ludo_enabled
  const [showGame, setShowGame] = useState<boolean>(() => {
    const gameVisible = localStorage.getItem("dz_game_visible");
    const ludoEnabled = localStorage.getItem("dz_ludo_enabled");
    return (
      (gameVisible === null || gameVisible === "true") &&
      ludoEnabled !== "false"
    );
  });

  useEffect(() => {
    const syncVisibility = () => {
      const gameVal = localStorage.getItem("dz_game_visible");
      const ludoVal = localStorage.getItem("dz_ludo_enabled");
      setShowGame(
        (gameVal === null || gameVal === "true") && ludoVal !== "false",
      );
    };

    // Listen to real-time broadcast from Admin Panel
    window.addEventListener("settings-sync", syncVisibility);
    // Fallback: listen to raw storage event (cross-tab)
    window.addEventListener("storage", syncVisibility);

    return () => {
      window.removeEventListener("settings-sync", syncVisibility);
      window.removeEventListener("storage", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/");
  };

  const handleShareApp = async () => {
    const appUrl = window.location.origin;
    const shareData = {
      title: "Digital Zindagi",
      text: "Apke sheher ka digital bazaar — providers aur customers ek jagah!",
      url: appUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error — fallback to clipboard
      }
    } else {
      try {
        await navigator.clipboard.writeText(appUrl);
        toast.success("App ka link copy ho gaya! 📋", {
          description: appUrl,
        });
      } catch {
        toast.error("Link copy nahi ho saka");
      }
    }
    onClose();
  };

  const isManager = user?.role === "manager";
  const { data: rechargeEnabled = true } = useRechargeServiceEnabled();

  const navLinks = [
    { to: "/", label: t("home"), icon: <Home size={18} /> },
    ...(showGame
      ? [{ to: "/game", label: "🎮 Game", icon: <Gamepad2 size={18} /> }]
      : []),
    ...(user
      ? [
          user.role === "provider"
            ? {
                to: "/provider/dashboard",
                label: t("myShop"),
                icon: <Store size={18} />,
              }
            : { to: "/", label: "Mera Profile", icon: <User size={18} /> },
          {
            to: "/orders",
            label: t("myOrders"),
            icon: <ShoppingBag size={18} />,
          },
          // Mobile Recharge — visible for all logged-in users, hidden if service is OFF
          ...(rechargeEnabled
            ? [
                {
                  to: "/recharge",
                  label: "📱 Mobile Recharge",
                  icon: <Smartphone size={18} />,
                },
              ]
            : []),
          // Wallet Transactions — always visible for logged-in users
          {
            to: "/wallet-transactions",
            label: "💰 Wallet Transactions",
            icon: <Wallet size={18} />,
          },
          // Admin Panel link for admin AND manager roles
          ...(user.role === "admin" || isManager
            ? [
                {
                  to: "/admin",
                  label: isManager ? "Manager Panel" : t("adminPanel"),
                  icon: <Settings size={18} />,
                },
              ]
            : []),
        ]
      : [
          { to: "/login", label: t("loginBtn"), icon: <LogIn size={18} /> },
          {
            to: "/signup?role=provider",
            label: t("providerSignup"),
            icon: <Briefcase size={18} />,
          },
        ]),
  ];

  const langOptions: {
    value: "hinglish" | "hindi" | "english";
    label: string;
  }[] = [
    { value: "hinglish", label: "Hinglish" },
    { value: "hindi", label: "हिंदी" },
    { value: "english", label: "English" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-emerald-header flex flex-col"
            style={{ height: "100dvh", maxHeight: "100dvh" }}
            data-ocid="sidebar.panel"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-5 border-b border-white/10"
              style={{ flexShrink: 0 }}
            >
              <div className="flex items-center gap-2">
                <img
                  src="/assets/generated/dz-logo-premium.dim_512x512.png"
                  alt="Digital Zindagi"
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                    borderRadius: "50%",
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/logo.png";
                  }}
                />
                <span className="font-heading font-bold text-white text-lg">
                  Digital Zindagi
                </span>
              </div>
              <button
                type="button"
                data-ocid="sidebar.close_button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {user && (
              <div
                className="px-5 py-4 border-b border-white/10"
                style={{ flexShrink: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {user.name}
                    </p>
                    <p className="text-white/60 text-xs capitalize">
                      {isManager ? "Manager" : user.role}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable nav area */}
            <nav
              className="p-4 space-y-1"
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: 0,
              }}
              aria-label="Sidebar navigation"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to + link.label}
                  to={link.to}
                  data-ocid="sidebar.link"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}

              {/* Share App Button */}
              <button
                type="button"
                data-ocid="sidebar.share_button"
                onClick={handleShareApp}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium w-full text-left"
              >
                <Share2 size={18} />
                Share App
              </button>

              {user && (
                <button
                  type="button"
                  data-ocid="sidebar.button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium w-full text-left"
                >
                  <LogOut size={18} />
                  {t("logout")}
                </button>
              )}
            </nav>

            {/* Language switcher at bottom */}
            <div
              className="p-4 border-t border-white/10"
              style={{ flexShrink: 0 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-white/60" />
                <span className="text-white/60 text-xs font-medium">
                  {t("language")}
                </span>
              </div>
              <div className="flex gap-1.5">
                {langOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    data-ocid="sidebar.toggle"
                    onClick={() => setLang(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      lang === opt.value
                        ? "bg-white text-emerald-800"
                        : "bg-white/15 text-white/80 hover:bg-white/25"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 pb-4 text-center" style={{ flexShrink: 0 }}>
              <p className="text-white/40 text-xs">
                Digital Zindagi &copy; {new Date().getFullYear()}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
