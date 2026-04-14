import { Loader2, Lock } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { SUPER_ADMIN_EMAIL } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { useVerifyUnlockKey } from "../hooks/useQueries";
import type { ContentLockerConfig, LockedFeature } from "../types/appTypes";

// ─── sessionStorage helpers ────────────────────────────────────────────────────

const SS_KEY = "dz_unlocked_features";

function getUnlockedFeatures(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function addUnlockedFeature(featureName: string): void {
  try {
    const current = getUnlockedFeatures();
    if (!current.includes(featureName)) {
      sessionStorage.setItem(SS_KEY, JSON.stringify([...current, featureName]));
    }
  } catch {
    /* ignore */
  }
}

// ─── ContentLockerOverlay ──────────────────────────────────────────────────────

interface ContentLockerOverlayProps {
  featureName: string;
  config: ContentLockerConfig | null | undefined;
  children: React.ReactNode;
}

export default function ContentLockerOverlay({
  featureName,
  config,
  children,
}: ContentLockerOverlayProps) {
  const { user } = useAuth();

  // Super Admin always bypasses content locker
  const isSuperAdmin =
    user?.isSuperAdmin === true ||
    (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  if (isSuperAdmin) return <>{children}</>;

  // Fail-open: if config is missing / not yet loaded, render children normally
  if (!config) return <>{children}</>;

  // Check session unlock
  const unlocked = getUnlockedFeatures().includes(featureName);
  if (unlocked) return <>{children}</>;

  // Find feature in config
  const feature = config.features.find(
    (f) => f.featureName === featureName && f.isLocked,
  );

  // Not locked — render children normally (zero visual impact)
  if (!feature) return <>{children}</>;

  // Feature IS locked and NOT yet unlocked in session → show overlay gate
  return (
    <LockerGate
      featureName={featureName}
      feature={feature}
      onUnlocked={() => {
        // After unlock, re-render triggers children normally (state forced via reload)
        window.location.reload();
      }}
    />
  );
}

// ─── LockerGate ────────────────────────────────────────────────────────────────

interface LockerGateProps {
  featureName: string;
  feature: LockedFeature;
  onUnlocked: () => void;
}

function LockerGate({ featureName, feature, onUnlocked }: LockerGateProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const verifyMutation = useVerifyUnlockKey();
  const cpaLink = feature?.cpaOfferLink ?? "";

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError("Key khali hai — secret key daalen.");
      return;
    }
    setError("");
    verifyMutation.mutate(
      { featureName, userKey: key.trim() },
      {
        onSuccess: (isCorrect) => {
          if (isCorrect) {
            addUnlockedFeature(featureName);
            onUnlocked();
          } else {
            setError("Galat key. Try again.");
          }
        },
        onError: () => {
          setError("Verification fail hua. Dobara try karein.");
        },
      },
    );
  };

  const verifying = verifyMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      data-ocid="content_locker.overlay"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #0d1f1a 0%, #0a1520 100%)",
          border: "1px solid rgba(16,185,129,0.3)",
        }}
      >
        {/* Lock Icon */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #065f46, #10b981)",
              boxShadow: "0 8px 24px rgba(16,185,129,0.4)",
            }}
          >
            <Lock size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl leading-tight">
              यह Feature Locked है
            </h2>
            <p className="text-white/60 text-sm mt-1.5 leading-relaxed">
              Admin ने इस feature को lock किया है।
            </p>
          </div>
        </div>

        {/* CPA Offer link (optional) */}
        {cpaLink && (
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            <p className="text-emerald-300 text-sm font-semibold mb-2">
              Unlock करने के लिए पहले यह offer देखें:
            </p>
            <a
              href={cpaLink}
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="content_locker.offer_link"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              🔗 Offer Dekhein
            </a>
          </div>
        )}

        {/* Key Input Form */}
        <form onSubmit={handleUnlock} className="space-y-3">
          <label
            htmlFor="locker-key-input"
            className="block text-xs font-semibold text-white/50 uppercase tracking-widest"
          >
            Secret Unlock Key
          </label>
          <input
            id="locker-key-input"
            type="password"
            autoComplete="off"
            placeholder="Secret Unlock Key डालें"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              if (error) setError("");
            }}
            disabled={verifying}
            data-ocid="content_locker.key_input"
            className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors disabled:opacity-50 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: error
                ? "1px solid rgba(239,68,68,0.7)"
                : "1px solid rgba(255,255,255,0.12)",
            }}
          />

          {error && (
            <p
              className="text-red-400 text-sm bg-red-900/30 border border-red-700/40 rounded-xl px-3 py-2"
              data-ocid="content_locker.error_msg"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying || !key.trim()}
            data-ocid="content_locker.unlock_button"
            className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50"
            style={{
              background:
                verifying || !key.trim()
                  ? "rgba(60,60,60,0.5)"
                  : "linear-gradient(135deg, #065f46, #10b981)",
              boxShadow:
                verifying || !key.trim()
                  ? "none"
                  : "0 6px 20px rgba(16,185,129,0.4)",
              cursor: verifying || !key.trim() ? "not-allowed" : "pointer",
            }}
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Verify हो रहा है...
              </span>
            ) : (
              "🔓 Unlock करें"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
