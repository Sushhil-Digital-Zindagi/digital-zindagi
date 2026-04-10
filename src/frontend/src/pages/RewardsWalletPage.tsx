import { ArrowLeft, Gift, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import InterstitialAd from "../components/InterstitialAd";
import {
  useAddLudoPoints,
  useAddLudoRedemptionRequest,
  useGetUserRedemptionRequests,
  useLudoPoints,
} from "../hooks/useQueries";
import { useNavigate } from "../lib/router";
import type { LudoRedemptionRequest } from "../types/appTypes";

interface PointsEntry {
  id: number;
  date: string;
  source: string;
  points: number;
}

function getPointsHistory(userId: string): PointsEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`dz_ludo_history_${userId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function addPointsHistory(userId: string, entry: Omit<PointsEntry, "id">) {
  const history = getPointsHistory(userId);
  history.unshift({ ...entry, id: Date.now() });
  localStorage.setItem(
    `dz_ludo_history_${userId}`,
    JSON.stringify(history.slice(0, 50)),
  );
}

function readRewardConfig() {
  return {
    pointsPerAd:
      Number.parseInt(
        localStorage.getItem("dz_ludo_points_per_ad") ?? "10",
        10,
      ) || 10,
    redemptionRate:
      Number.parseInt(
        localStorage.getItem("dz_ludo_redemption_rate") ?? "100",
        10,
      ) || 100,
    minWithdrawal:
      Number.parseInt(
        localStorage.getItem("dz_ludo_min_withdrawal") ?? "100",
        10,
      ) || 100,
  };
}

export default function RewardsWalletPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("dz_user_id") ?? "guest";
  const rewardsEnabled =
    localStorage.getItem("dz_ludo_rewards_enabled") !== "false";

  // Dynamic reward config — read from localStorage, updated via events
  const [rewardConfig, setRewardConfig] = useState(readRewardConfig);
  const { pointsPerAd, redemptionRate, minWithdrawal } = rewardConfig;

  // Listen for admin real-time updates (same tab via CustomEvent, cross-tab via storage)
  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const ev = e as CustomEvent<{ key: string; value: unknown }>;
      if (
        ["pointsPerAd", "redemptionRate", "minWithdrawal"].includes(
          ev.detail?.key,
        )
      ) {
        setRewardConfig(readRewardConfig());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "dz_ludo_points_per_ad" ||
        e.key === "dz_ludo_redemption_rate" ||
        e.key === "dz_ludo_min_withdrawal"
      ) {
        setRewardConfig(readRewardConfig());
      }
    };
    window.addEventListener("dz_settings_update", handleSettingsUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("dz_settings_update", handleSettingsUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Backend hooks
  const { data: backendPoints, refetch: refetchPoints } = useLudoPoints(userId);
  const addPointsMutation = useAddLudoPoints();
  const addRedemptionMutation = useAddLudoRedemptionRequest();
  const { data: backendRequests, refetch: refetchRequests } =
    useGetUserRedemptionRequests(userId);

  const [points, setPoints] = useState<number>(
    () =>
      backendPoints ??
      (Number.parseInt(
        localStorage.getItem(`dz_ludo_points_${userId}`) ?? "0",
        10,
      ) ||
        0),
  );
  const [history, setHistory] = useState<PointsEntry[]>(() =>
    getPointsHistory(userId),
  );
  const [requests, setRequests] = useState<LudoRedemptionRequest[]>(
    () => backendRequests ?? [],
  );
  const [upiId, setUpiId] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");
  const [showAd, setShowAd] = useState(false);
  const [adPending, setAdPending] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Sync from backend when data arrives
  useEffect(() => {
    if (backendPoints !== undefined && backendPoints > 0) {
      setPoints(backendPoints);
    }
  }, [backendPoints]);

  useEffect(() => {
    if (backendRequests) {
      setRequests(backendRequests);
    }
  }, [backendRequests]);

  const refreshState = useCallback(() => {
    const localPts =
      Number.parseInt(
        localStorage.getItem(`dz_ludo_points_${userId}`) ?? "0",
        10,
      ) || 0;
    setPoints(localPts);
    setHistory(getPointsHistory(userId));
    refetchPoints();
    refetchRequests();
  }, [userId, refetchPoints, refetchRequests]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleWatchAd = useCallback(() => {
    setAdPending(true);
    setShowAd(true);
  }, []);

  const handleAdClose = useCallback(async () => {
    setShowAd(false);
    if (adPending) {
      const EARN = pointsPerAd;
      try {
        await addPointsMutation.mutateAsync({ userId, points: EARN });
      } catch {
        // localStorage update already happened inside the mutation
      }
      addPointsHistory(userId, {
        date: new Date().toLocaleString("hi-IN"),
        source: "Rewarded Ad",
        points: EARN,
      });
      setHistory(getPointsHistory(userId));
      // Update local display from localStorage (mutation already updated it)
      const updated =
        Number.parseInt(
          localStorage.getItem(`dz_ludo_points_${userId}`) ?? "0",
          10,
        ) || 0;
      setPoints(updated);
      setAdPending(false);
      refetchPoints();
    }
  }, [adPending, userId, addPointsMutation, refetchPoints, pointsPerAd]);

  const handleRedeem = useCallback(async () => {
    setRedeemError("");
    setRedeemSuccess("");
    const pts = Number.parseInt(redeemPoints, 10);
    if (!upiId.trim() || !upiId.includes("@")) {
      setRedeemError("Valid UPI ID dalein (jaise user@upi)");
      return;
    }
    if (Number.isNaN(pts) || pts < minWithdrawal) {
      setRedeemError(
        `Minimum ${minWithdrawal} points chahiye redeem karne ke liye`,
      );
      return;
    }
    if (pts > points) {
      setRedeemError("Aapke paas itne points nahi hain");
      return;
    }

    setRedeemLoading(true);
    const userName = localStorage.getItem("dz_user_name") ?? "User";
    const amountInr = Math.floor(pts / redemptionRate);

    try {
      await addRedemptionMutation.mutateAsync({
        userId,
        userName,
        upiId: upiId.trim(),
        pointsRequested: pts,
        amountInr,
      });
    } catch {
      // Falls back to localStorage inside the mutation
    }

    // Deduct points
    try {
      await addPointsMutation.mutateAsync({ userId, points: -pts });
    } catch {
      const cur =
        Number.parseInt(
          localStorage.getItem(`dz_ludo_points_${userId}`) ?? "0",
          10,
        ) || 0;
      localStorage.setItem(
        `dz_ludo_points_${userId}`,
        String(Math.max(0, cur - pts)),
      );
    }
    addPointsHistory(userId, {
      date: new Date().toLocaleString("hi-IN"),
      source: "Redemption Request",
      points: -pts,
    });

    const newPts = Math.max(
      0,
      Number.parseInt(
        localStorage.getItem(`dz_ludo_points_${userId}`) ?? "0",
        10,
      ) || 0,
    );
    setPoints(newPts);
    setHistory(getPointsHistory(userId));
    setUpiId("");
    setRedeemPoints("");
    setRedeemSuccess(
      `✅ Request submit ho gayi! Admin se approval milne par ₹${amountInr} transfer honge.`,
    );
    setRedeemLoading(false);
    refetchPoints();
    refetchRequests();
  }, [
    upiId,
    redeemPoints,
    points,
    userId,
    addRedemptionMutation,
    addPointsMutation,
    refetchPoints,
    refetchRequests,
    minWithdrawal,
    redemptionRate,
  ]);

  const statusIcon = (s: LudoRedemptionRequest["status"]) => {
    if (s === "approved") return "✅";
    if (s === "rejected") return "❌";
    return "🕐";
  };
  const statusColor = (s: LudoRedemptionRequest["status"]) => {
    if (s === "approved") return "text-emerald-400";
    if (s === "rejected") return "text-red-400";
    return "text-yellow-400";
  };

  if (!rewardsEnabled) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{
          background:
            "linear-gradient(160deg, #0a2e1a 0%, #0d1f0e 40%, #051208 100%)",
        }}
      >
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-white text-xl font-bold mb-2">
          Rewards System Disabled
        </h2>
        <p className="text-emerald-400/70 text-sm mb-6">
          Rewards system abhi Admin ne band kar rakha hai.
        </p>
        <button
          type="button"
          onClick={() => navigate("/game")}
          className="flex items-center gap-2 text-emerald-400 hover:text-white transition-colors py-2 px-4 rounded-xl border border-emerald-700 hover:bg-emerald-800/40"
        >
          <ArrowLeft size={16} /> Wapas Jaao
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #0a2e1a 0%, #0d1f0e 40%, #051208 100%)",
      }}
      data-ocid="rewards.wallet_page"
    >
      {showAd && (
        <InterstitialAd
          phase="post"
          adBlocked={false}
          customAds={[]}
          onClose={handleAdClose}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b border-emerald-900/50"
        style={{ background: "rgba(6,95,70,0.15)" }}
      >
        <button
          type="button"
          onClick={() => navigate("/game")}
          className="text-emerald-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5"
          aria-label="Go back"
          data-ocid="rewards.back_btn"
        >
          <ArrowLeft size={20} />
        </button>
        <Wallet size={22} className="text-yellow-400" />
        <h1 className="text-white font-bold text-lg flex-1">Rewards Wallet</h1>
        <span className="text-yellow-400 font-black text-xl">{points}</span>
        <span className="text-emerald-400 text-sm">pts</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Points Balance Card */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
            boxShadow: "0 8px 32px rgba(16,185,129,0.25)",
          }}
          data-ocid="rewards.balance_card"
        >
          <p className="text-emerald-200 text-sm mb-1">Aapke Total Points</p>
          <p className="text-white font-black text-6xl">{points}</p>
          <p className="text-yellow-300 text-sm mt-1">
            = ₹{(points / redemptionRate).toFixed(2)} ({redemptionRate} pts =
            ₹1)
          </p>
        </div>

        {/* Watch Ad for Points */}
        <button
          type="button"
          onClick={handleWatchAd}
          disabled={showAd}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
            boxShadow: "0 4px 16px rgba(217,119,6,0.4)",
          }}
          data-ocid="rewards.watch_ad_btn"
        >
          <span className="text-2xl">📺</span>
          <span className="text-white">Watch Ad for {pointsPerAd} Points</span>
          <Gift size={20} className="text-yellow-200" />
        </button>

        {/* Redeem Form */}
        <div
          className="rounded-2xl p-5 border border-emerald-800/50"
          style={{ background: "rgba(6,78,59,0.3)" }}
        >
          <h2 className="text-yellow-400 font-bold text-base mb-4 flex items-center gap-2">
            💸 Points Redeem Karein
          </h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="upi-input"
                className="text-emerald-300 text-xs mb-1 block"
              >
                UPI ID (jaise user@upi)
              </label>
              <input
                id="upi-input"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="w-full bg-black/30 border border-emerald-700/50 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                data-ocid="rewards.upi_input"
              />
            </div>
            <div>
              <label
                htmlFor="redeem-points-input"
                className="text-emerald-300 text-xs mb-1 block"
              >
                Points to Redeem (min {minWithdrawal})
              </label>
              <input
                id="redeem-points-input"
                type="number"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                placeholder={String(minWithdrawal)}
                min={minWithdrawal}
                max={points}
                className="w-full bg-black/30 border border-emerald-700/50 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                data-ocid="rewards.redeem_points_input"
              />
              {redeemPoints &&
                Number.parseInt(redeemPoints) >= minWithdrawal && (
                  <p className="text-emerald-400 text-xs mt-1">
                    = ₹
                    {(Number.parseInt(redeemPoints) / redemptionRate).toFixed(
                      2,
                    )}{" "}
                    transfer honga
                  </p>
                )}
            </div>
            {redeemError && (
              <p className="text-red-400 text-sm">{redeemError}</p>
            )}
            {redeemSuccess && (
              <p className="text-emerald-400 text-sm">{redeemSuccess}</p>
            )}
            <button
              type="button"
              onClick={handleRedeem}
              disabled={redeemLoading}
              className="w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #065f46, #10b981)",
              }}
              data-ocid="rewards.redeem_submit_btn"
            >
              {redeemLoading ? "Submitting..." : "Redeem Request Submit Karein"}
            </button>
          </div>
        </div>

        {/* Redemption Requests */}
        {requests.length > 0 && (
          <div
            className="rounded-2xl p-5 border border-emerald-800/50"
            style={{ background: "rgba(6,78,59,0.2)" }}
          >
            <h2 className="text-yellow-400 font-bold text-base mb-4">
              📋 Redemption Requests
            </h2>
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="bg-black/30 rounded-xl p-3 flex items-start justify-between gap-3"
                  data-ocid="rewards.request_item"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {r.upiId}
                    </p>
                    <p className="text-emerald-400/70 text-xs">
                      {r.pointsRequested} pts → ₹{r.amountInr}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString("hi-IN")}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold whitespace-nowrap ${statusColor(r.status)}`}
                  >
                    {statusIcon(r.status)}{" "}
                    {r.status === "pending"
                      ? "Pending"
                      : r.status === "approved"
                        ? "Approved"
                        : "Rejected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points History */}
        {history.length > 0 && (
          <div
            className="rounded-2xl p-5 border border-emerald-800/50"
            style={{ background: "rgba(6,78,59,0.2)" }}
          >
            <h2 className="text-yellow-400 font-bold text-base mb-4">
              🕐 Points History
            </h2>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-2"
                  data-ocid="rewards.history_item"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{h.source}</p>
                    <p className="text-white/40 text-xs">{h.date}</p>
                  </div>
                  <span
                    className={`font-bold text-sm ${h.points > 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {h.points > 0 ? "+" : ""}
                    {h.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && requests.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center border border-emerald-800/30"
            style={{ background: "rgba(6,78,59,0.15)" }}
            data-ocid="rewards.empty_state"
          >
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-white font-semibold">Koi activity nahi abhi</p>
            <p className="text-emerald-400/60 text-sm mt-1">
              Game khelo ya ad dekho — points kamaao!
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-3 text-center border-t border-emerald-900/40">
        <p className="text-white/25 text-xs">© 2026 Digital Zindagi</p>
      </div>
    </div>
  );
}
