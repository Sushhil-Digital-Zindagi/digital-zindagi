import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface AdMobConfig {
  appId?: string;
  bannerId?: string;
  bannerEnabled?: boolean;
}

function getAdMobConfig(): AdMobConfig {
  try {
    const raw = localStorage.getItem("dz_admob_config");
    if (raw) return JSON.parse(raw) as AdMobConfig;
  } catch {
    // ignore
  }
  return {};
}

export default function AdMobBanner() {
  const [config, setConfig] = useState<AdMobConfig>(getAdMobConfig);
  const { user, isFullAdmin } = useAuth();

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dz_admob_config") {
        setConfig(getAdMobConfig());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Suppress ads for admin and manager roles
  const isAdminOrManager = isFullAdmin || user?.role === "manager";

  // Suppress ads for approved premium providers
  const isPremiumApproved = (() => {
    if (!user || user.role !== "provider") return false;
    const planType = localStorage.getItem(
      `dz_provider_plantype_${user.userId}`,
    );
    return planType === "premium";
  })();

  if (isAdminOrManager || isPremiumApproved) return null;

  if (!config.bannerEnabled || !config.bannerId) return null;

  const shortId =
    config.bannerId.length > 24
      ? `...${config.bannerId.slice(-20)}`
      : config.bannerId;

  return (
    <div
      data-ocid="admob.banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: "50px",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Inner ad slot \u2014 320px wide, 50px tall */}
      <div
        style={{
          width: "320px",
          height: "50px",
          position: "relative",
          overflow: "hidden",
          borderRadius: "4px",
          background:
            "linear-gradient(90deg, #1e3a2f 0%, #14532d 50%, #1e3a2f 100%)",
          border: "1px solid rgba(6,95,70,0.4)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 10px",
        }}
      >
        {/* Ad badge */}
        <span
          style={{
            backgroundColor: "rgba(16,185,129,0.25)",
            border: "1px solid rgba(16,185,129,0.5)",
            color: "#6ee7b7",
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 5px",
            borderRadius: "3px",
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          AD
        </span>

        {/* Ad placeholder text */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <p
            style={{
              color: "#d1fae5",
              fontSize: "11px",
              fontWeight: 600,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Advertisement
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "8px",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {shortId}
          </p>
        </div>

        {/* Subtle shimmer overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "adShimmer 3s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      </div>

      <style>{`
        @keyframes adShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/** Hook: returns true when the AdMob banner is currently visible */
export function useAdMobBannerVisible(): boolean {
  const [visible, setVisible] = useState(() => {
    const cfg = getAdMobConfig();
    return !!(cfg.bannerEnabled && cfg.bannerId);
  });

  useEffect(() => {
    const sync = () => {
      const cfg = getAdMobConfig();
      setVisible(!!(cfg.bannerEnabled && cfg.bannerId));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return visible;
}
