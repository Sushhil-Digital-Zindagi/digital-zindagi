/**
 * RewardsDashboard — Points balance, weekly leaderboard, and activity breakdown.
 */
import { Loader2, TrendingUp, Trophy, Zap } from "lucide-react";
import { useChatContext } from "../../contexts/ChatContext";
import { useMyPoints, usePointsLeaderboard } from "../../hooks/useChatQueries";
import type { LeaderboardEntry } from "../../types/chatTypes";
import { Badge as BadgeEnum } from "../../types/chatTypes";

// ---- Badge icon helper ----
function badgeIcon(badge?: BadgeEnum) {
  if (!badge) return "";
  const icons: Record<BadgeEnum, string> = {
    [BadgeEnum.bronze]: "🥉",
    [BadgeEnum.silver]: "🥈",
    [BadgeEnum.gold]: "🥇",
    [BadgeEnum.diamond]: "💎",
  };
  return icons[badge] ?? "";
}

// ---- Activity Row ----
function ActivityRow({
  label,
  points,
  icon,
}: {
  label: string;
  points: number;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold text-primary">+{points} pts</span>
    </div>
  );
}

// ---- Leaderboard Row ----
function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}) {
  return (
    <div
      data-ocid={`chat_rewards.item.${entry.rank}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
        isCurrentUser
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="w-7 text-center font-bold text-sm text-muted-foreground">
        {entry.rank <= 3
          ? ["🥇", "🥈", "🥉"][entry.rank - 1]
          : `#${entry.rank}`}
      </div>
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
        {entry.photoUrl ? (
          <img
            src={entry.photoUrl}
            alt={entry.name}
            className="w-full h-full object-cover"
          />
        ) : (
          entry.name[0]?.toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
          {entry.name}
          {entry.badge && <span>{badgeIcon(entry.badge)}</span>}
          {isCurrentUser && (
            <span className="text-xs text-primary font-bold ml-1">(You)</span>
          )}
        </p>
      </div>
      <span className="text-sm font-bold text-primary flex-shrink-0">
        {entry.points.toLocaleString("en-IN")}
      </span>
    </div>
  );
}

export default function RewardsDashboard({
  currentUserId,
}: { currentUserId?: string }) {
  const { data: myPoints, isLoading: pointsLoading } = useMyPoints();
  const { data: leaderboard, isLoading: lbLoading } = usePointsLeaderboard();
  const { adminSettings } = useChatContext();

  if (pointsLoading) {
    return (
      <div
        data-ocid="chat_rewards.loading_state"
        className="flex justify-center py-16"
      >
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const breakdown = myPoints?.breakdown;

  return (
    <div className="space-y-4">
      {/* Total Points Card */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-white/80 text-sm font-medium mb-1 flex items-center gap-1.5">
          <Zap size={14} /> Total Points
        </p>
        <p className="text-4xl font-black font-heading">
          {(myPoints?.total ?? 0).toLocaleString("en-IN")}
          <span className="text-white/60 text-xl ml-1">pts</span>
        </p>
        <div className="mt-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-white/70" />
          <span className="text-white/70 text-xs">
            Last activity:{" "}
            {myPoints?.lastActivity
              ? new Date(myPoints.lastActivity).toLocaleDateString("en-IN")
              : "—"}
          </span>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
          📊 Points Breakdown
        </h3>
        <ActivityRow
          label="Messages Bheje"
          points={breakdown?.fromMessages ?? 0}
          icon="💬"
        />
        <ActivityRow
          label="Daily Login"
          points={breakdown?.fromDailyLogin ?? 0}
          icon="🔑"
        />
        <ActivityRow
          label="Stories Post"
          points={breakdown?.fromStories ?? 0}
          icon="📸"
        />
        <ActivityRow
          label="Referrals"
          points={breakdown?.fromReferrals ?? 0}
          icon="👥"
        />
        <ActivityRow
          label="Study Mode"
          points={breakdown?.fromStudyMode ?? 0}
          icon="📚"
        />
      </div>

      {/* How to Earn */}
      <div className="bg-muted/40 border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-3 text-sm">
          🎯 Points Kaise Kamaayein
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Message bhejo",
              pts: adminSettings.pointsPerMessage,
              icon: "💬",
            },
            {
              label: "Daily login",
              pts: adminSettings.pointsPerDailyLogin,
              icon: "🔑",
            },
            {
              label: "Story post karo",
              pts: adminSettings.pointsPerStory,
              icon: "📸",
            },
            {
              label: "Referral karo",
              pts: adminSettings.pointsPerReferral,
              icon: "👥",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card rounded-xl p-3 flex items-center gap-2 border border-border"
            >
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-primary">
                  +{item.pts} pts
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem Section */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-2 text-sm">
          🎁 Redeem Karein
        </h3>
        <p className="text-xs text-muted-foreground">
          Points se premium features unlock karein ya redeem karein — Admin se
          contact karein for withdrawal.
        </p>
        <button
          type="button"
          data-ocid="chat_rewards.button"
          className="mt-3 w-full py-2.5 bg-primary/10 text-primary font-semibold text-sm rounded-xl hover:bg-primary/20 transition-colors"
        >
          🎁 Redeem Request Bhejein
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Trophy size={16} className="text-yellow-500" />
          <h3 className="font-semibold text-foreground text-sm">
            Weekly Leaderboard
          </h3>
        </div>
        {lbLoading ? (
          <div
            data-ocid="chat_rewards.loading_state"
            className="flex justify-center py-8"
          >
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <div
            data-ocid="chat_rewards.empty_state"
            className="text-center py-8 text-muted-foreground text-sm px-4"
          >
            Abhi koi data nahi hai. Shuru karein!
          </div>
        ) : (
          <div className="px-2 pb-4 space-y-1">
            {leaderboard.slice(0, 10).map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={entry.userId === currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
