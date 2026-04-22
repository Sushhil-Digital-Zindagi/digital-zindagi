/**
 * PremiumUpgradeModal — Compact prompt shown when a free user hits a premium feature gate.
 */
import { CheckCircle, Star, X } from "lucide-react";
import { useNavigate } from "../../lib/router";

const PREMIUM_FEATURES = [
  "Watermark-free sharing",
  "Unlimited file storage (up to 20MB)",
  "Advanced Ghost Mode",
  "Priority AI Chat Summary",
  "Unlimited scheduled messages",
];

interface Props {
  onClose: () => void;
}

export default function PremiumUpgradeModal({ onClose }: Props) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate("/chat/premium");
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
      data-ocid="premium_upgrade.dialog"
    >
      <div className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pb-safe">
        {/* Header gradient */}
        <div className="bg-emerald-header px-5 pt-5 pb-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-ocid="premium_upgrade.close_button"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-yellow-400/20 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Upgrade to Premium
              </h2>
              <p className="text-white/70 text-xs">
                Yeh feature Premium users ke liye hai
              </p>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="px-5 py-4 space-y-2.5">
          {PREMIUM_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <CheckCircle size={16} className="text-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* Plans teaser */}
        <div className="px-5 mb-4">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Shuru karo sirf</p>
              <p className="text-xl font-bold text-primary">₹99/month</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground line-through">₹199</p>
              <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                50% OFF
              </span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            type="button"
            data-ocid="premium_upgrade.confirm_button"
            onClick={handleUpgrade}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Star size={16} className="fill-current" /> Upgrade Now ⚡
          </button>
          <button
            type="button"
            data-ocid="premium_upgrade.cancel_button"
            onClick={onClose}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
