/**
 * ReferralPanel — Referral program with code, badge progress, and stats.
 */
import { ClipboardCopy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useReferralStats } from "../../hooks/useChatQueries";
import { Badge as BadgeEnum } from "../../types/chatTypes";

// ---- Badge thresholds ----
const BADGE_TIERS = [
  {
    badge: BadgeEnum.bronze,
    min: 5,
    max: 9,
    icon: "🥉",
    label: "Bronze",
    gradient: "from-amber-700 via-amber-500 to-amber-700",
  },
  {
    badge: BadgeEnum.silver,
    min: 10,
    max: 24,
    icon: "🥈",
    label: "Silver",
    gradient: "from-slate-400 via-slate-200 to-slate-500",
  },
  {
    badge: BadgeEnum.gold,
    min: 25,
    max: 49,
    icon: "🥇",
    label: "Gold",
    gradient: "from-yellow-500 via-yellow-300 to-yellow-600",
  },
  {
    badge: BadgeEnum.diamond,
    min: 50,
    max: Number.POSITIVE_INFINITY,
    icon: "💎",
    label: "Diamond",
    gradient: "from-cyan-400 via-blue-200 to-purple-400",
  },
];

function getBadgeTier(count: number) {
  return BADGE_TIERS.find((t) => count >= t.min && count <= t.max) ?? null;
}

function getNextTier(count: number) {
  return BADGE_TIERS.find((t) => count < t.min) ?? null;
}

export default function ReferralPanel() {
  const { data: stats, isLoading } = useReferralStats();

  const handleCopyCode = () => {
    const code = stats?.referralCode ?? "";
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success("Referral code copy ho gaya! ✅"));
  };

  const handleShareLink = async () => {
    const link =
      stats?.referralLink ??
      `${window.location.origin}?ref=${stats?.referralCode ?? ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Likeup par Join Karein!",
          text: "Likeup – best chat app! Mujhse join karo aur dono ko bonus milega 🎉",
          url: link,
        });
      } catch {
        navigator.clipboard
          .writeText(link)
          .then(() => toast.success("Link copy ho gaya!"));
      }
    } else {
      navigator.clipboard
        .writeText(link)
        .then(() => toast.success("Invite link copy ho gaya!"));
    }
  };

  if (isLoading) {
    return (
      <div
        data-ocid="chat_referral.loading_state"
        className="flex justify-center py-16"
      >
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const count = stats?.directReferrals ?? 0;
  const currentTier = getBadgeTier(count);
  const nextTier = getNextTier(count);
  const progressToNext = nextTier
    ? Math.min((count / nextTier.min) * 100, 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Referral Code */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-white/80 text-sm font-medium mb-2">
          Aapka Referral Code
        </p>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-black font-mono tracking-widest flex-1 truncate">
            {stats?.referralCode ?? "—"}
          </p>
          <button
            type="button"
            data-ocid="chat_referral.button"
            onClick={handleCopyCode}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            <ClipboardCopy size={18} />
          </button>
        </div>
        <button
          type="button"
          data-ocid="chat_referral.button"
          onClick={handleShareLink}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 text-sm font-semibold transition-colors"
        >
          <Share2 size={16} /> Share Invite Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Friends Invited", value: count, icon: "👥" },
          {
            label: "Total Earned",
            value: `₹${stats?.totalEarned ?? 0}`,
            icon: "💰",
          },
          {
            label: "Pending Bonus",
            value: `₹${stats?.pendingBonus ?? 0}`,
            icon: "⏳",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            data-ocid="chat_referral.card"
            className="bg-card border border-border rounded-2xl p-3 text-center"
          >
            <p className="text-xl">{stat.icon}</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {stat.value}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Badge Progress */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-4 text-sm">
          🏅 Badge Progress
        </h3>

        {/* Current Badge */}
        {currentTier ? (
          <div
            className={`bg-gradient-to-r ${currentTier.gradient} rounded-xl p-4 flex items-center gap-3 mb-4`}
          >
            <span className="text-3xl">{currentTier.icon}</span>
            <div>
              <p className="text-white font-bold">
                {currentTier.label} Badge Mila! 🎉
              </p>
              <p className="text-white/80 text-xs">
                {count} referrals complete
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-muted rounded-xl p-4 flex items-center gap-3 mb-4">
            <span className="text-3xl">🌱</span>
            <div>
              <p className="text-foreground font-semibold">
                Abhi koi badge nahi
              </p>
              <p className="text-muted-foreground text-xs">
                5 referrals karo Bronze Badge paane ke liye
              </p>
            </div>
          </div>
        )}

        {/* Progress to next tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{count} referrals</span>
              <span>
                {nextTier.icon} {nextTier.label}: {nextTier.min} needed
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {nextTier.min - count} aur referrals chahiye {nextTier.icon}{" "}
              {nextTier.label} ke liye
            </p>
          </div>
        )}

        {/* All badge tiers */}
        <div className="mt-4 space-y-2">
          {BADGE_TIERS.map((tier) => {
            const earned = count >= tier.min;
            return (
              <div
                key={tier.badge}
                data-ocid={`chat_referral.item.${tier.badge}`}
                className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                  earned
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <span className="text-xl">{tier.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {tier.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tier.min} referrals required
                  </p>
                </div>
                {earned && (
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                    ✓ Earned
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-muted/40 border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-3 text-sm">
          ℹ️ Kaise Kaam Karta Hai
        </h3>
        <ul className="space-y-2">
          {[
            "Apna code share karo 👆",
            "Dost aapke code se join karein 👥",
            "Dono ko 50 points milenge 🎉",
            "5+ referrals → Bronze Badge 🥉",
            "10+ → Silver, 25+ → Gold, 50+ → Diamond 💎",
          ].map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
