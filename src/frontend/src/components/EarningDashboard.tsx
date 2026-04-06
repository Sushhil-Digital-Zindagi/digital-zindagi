import { motion } from "motion/react";
import { useState } from "react";
import {
  type DailyEarningSummary,
  computeTotals,
  getAllSummaries,
  getSummariesForPeriod,
  recordEarningEvent,
} from "../utils/earningAnalytics";

type Period = "24h" | "7d" | "30d" | "6m" | "1y" | "lifetime";

const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "24 Hours" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "lifetime", label: "Lifetime" },
];

function formatRs(v: number) {
  return `₹${v.toFixed(2)}`;
}

// Simple bar chart using divs (no external chart lib needed)
function MiniBarChart({
  data,
  maxBars = 14,
}: { data: DailyEarningSummary[]; maxBars?: number }) {
  const recent = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-maxBars);

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-muted-foreground text-xs">
        Koi data nahi hai is period mein
      </div>
    );
  }

  const maxRev = Math.max(
    ...recent.map((d) => d.admobRevenue + d.customAdRevenue),
    0.01,
  );
  const maxClicks = Math.max(
    ...recent.map((d) => d.admobClicks + d.customAdClicks),
    1,
  );

  return (
    <div className="space-y-1">
      {/* Revenue bars */}
      <p className="text-xs text-muted-foreground font-medium mb-2">
        ₹ Revenue per Day
      </p>
      <div className="flex items-end gap-1 h-24">
        {recent.map((d) => {
          const rev = d.admobRevenue + d.customAdRevenue;
          const h = Math.max(4, Math.round((rev / maxRev) * 88));
          const dateLabel = d.date.slice(5); // MM-DD
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-0.5"
              title={`${d.date}: ${formatRs(rev)}`}
            >
              <div
                className="w-full rounded-t-sm bg-emerald-500 transition-all"
                style={{ height: `${h}px` }}
              />
              {recent.length <= 7 && (
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                  {dateLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Clicks bars */}
      <p className="text-xs text-muted-foreground font-medium mb-2 mt-3">
        📱 Clicks per Day
      </p>
      <div className="flex items-end gap-1 h-16">
        {recent.map((d) => {
          const clicks = d.admobClicks + d.customAdClicks;
          const h = Math.max(4, Math.round((clicks / maxClicks) * 60));
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-0.5"
              title={`${d.date}: ${clicks} clicks`}
            >
              <div
                className="w-full rounded-t-sm bg-blue-400 transition-all"
                style={{ height: `${h}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EarningDashboard() {
  const [period, setPeriod] = useState<Period>("7d");
  const data = getSummariesForPeriod(period);
  const totals = computeTotals(data);

  const allData = getAllSummaries();
  const lifetimeTotals = computeTotals(allData);

  // Seed demo data button (for testing)
  const seedDemoData = () => {
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      const rand = () => Math.floor(Math.random() * 20);
      const existingData = getAllSummaries();
      if (!existingData.find((s) => s.date === dStr)) {
        for (let j = 0; j < rand() + 5; j++) {
          recordEarningEvent("admobClick", Math.random() * 0.05);
        }
        for (let j = 0; j < rand(); j++) {
          recordEarningEvent("customAdClick", Math.random() * 0.1);
        }
        for (let j = 0; j < rand() + 20; j++) {
          recordEarningEvent("pageView");
        }
      }
    }
    window.location.reload();
  };

  const statCards = [
    {
      label: "Total Revenue",
      value: formatRs(totals.totalRevenue),
      icon: "💰",
      color: "bg-emerald-50 border-emerald-200",
      textColor: "text-emerald-700",
    },
    {
      label: "AdMob Revenue",
      value: formatRs(totals.admobRevenue),
      icon: "📱",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
    },
    {
      label: "Custom Ads Revenue",
      value: formatRs(totals.customAdRevenue),
      icon: "🎨",
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
    },
    {
      label: "Total Ad Clicks",
      value: (totals.admobClicks + totals.customAdClicks).toString(),
      icon: "👆",
      color: "bg-amber-50 border-amber-200",
      textColor: "text-amber-700",
    },
    {
      label: "Page Views",
      value: totals.pageViews.toString(),
      icon: "👁️",
      color: "bg-gray-50 border-gray-200",
      textColor: "text-gray-700",
    },
    {
      label: "Lifetime Revenue",
      value: formatRs(lifetimeTotals.totalRevenue),
      icon: "⭐",
      color: "bg-yellow-50 border-yellow-200",
      textColor: "text-yellow-700",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h2 className="font-heading font-bold text-lg text-foreground">
            Earning Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            AdMob + Custom Ads ka breakdown
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              period === p.key
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-foreground border-border hover:border-emerald-400"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 ${card.color}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{card.icon}</span>
              <span className="text-xs text-muted-foreground font-medium">
                {card.label}
              </span>
            </div>
            <p className={`font-heading font-bold text-xl ${card.textColor}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Traffic & Revenue Chart (
          {period === "24h"
            ? "Today"
            : period === "7d"
              ? "Last 7 Days"
              : period}
          )
        </p>
        <MiniBarChart
          data={data}
          maxBars={
            period === "6m" || period === "1y" || period === "lifetime"
              ? 30
              : 14
          }
        />
      </div>

      {/* Daily Breakdown Table */}
      {data.length > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Daily Summary
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                    AdMob ₹
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                    Custom ₹
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                    Clicks
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                    Views
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...data]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 30)
                  .map((row) => (
                    <tr
                      key={row.date}
                      className="border-t border-border hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 font-medium text-foreground">
                        {row.date}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700">
                        {row.admobRevenue.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-700">
                        {row.customAdRevenue.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-700">
                        {row.admobClicks + row.customAdClicks}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {row.pageViews}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-10 bg-white rounded-2xl border border-border">
          <span className="text-3xl block mb-2">📊</span>
          <p className="text-sm text-muted-foreground">
            Is period mein koi earning data nahi hai
          </p>
          <button
            type="button"
            onClick={seedDemoData}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Demo data load karein (testing ke liye)
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs text-blue-700 font-medium">
          💡 Data Optimization: Sirf daily aggregated summaries store hoti hain
          — har click log nahi hota. Firebase/storage usage nearly ZERO rehta
          hai.
        </p>
      </div>
    </motion.div>
  );
}
