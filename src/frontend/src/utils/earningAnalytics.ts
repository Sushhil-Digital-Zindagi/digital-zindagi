/**
 * Earning Analytics utility.
 * Stores DAILY aggregated summaries only — near-zero storage usage.
 * Structure: { date: "YYYY-MM-DD", admobClicks: n, admobRevenue: n, customAdClicks: n, customAdRevenue: n, pageViews: n }
 */

export interface DailyEarningSummary {
  date: string; // "YYYY-MM-DD"
  admobClicks: number;
  admobRevenue: number;
  customAdClicks: number;
  customAdRevenue: number;
  pageViews: number;
}

const KEY = "dz_earning_summaries";

export function getAllSummaries(): DailyEarningSummary[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSummaries(data: DailyEarningSummary[]): void {
  // Keep only last 365 days to prevent storage bloat
  const sorted = data
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 365);
  localStorage.setItem(KEY, JSON.stringify(sorted));
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Record a single event — aggregated into today's summary */
export function recordEarningEvent(
  type: "admobClick" | "customAdClick" | "pageView",
  revenue = 0,
): void {
  const summaries = getAllSummaries();
  const today = todayStr();
  let entry = summaries.find((s) => s.date === today);
  if (!entry) {
    entry = {
      date: today,
      admobClicks: 0,
      admobRevenue: 0,
      customAdClicks: 0,
      customAdRevenue: 0,
      pageViews: 0,
    };
    summaries.push(entry);
  }
  if (type === "admobClick") {
    entry.admobClicks += 1;
    entry.admobRevenue += revenue;
  } else if (type === "customAdClick") {
    entry.customAdClicks += 1;
    entry.customAdRevenue += revenue;
  } else if (type === "pageView") {
    entry.pageViews += 1;
  }
  saveSummaries(summaries);
}

/** Filter summaries by period */
export function getSummariesForPeriod(
  period: "24h" | "7d" | "30d" | "6m" | "1y" | "lifetime",
): DailyEarningSummary[] {
  const all = getAllSummaries();
  const now = new Date();
  if (period === "lifetime") return all;

  const days = { "24h": 1, "7d": 7, "30d": 30, "6m": 182, "1y": 365 }[period];
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return all.filter((s) => s.date >= cutoffStr);
}

export function computeTotals(summaries: DailyEarningSummary[]) {
  return summaries.reduce(
    (acc, s) => ({
      admobClicks: acc.admobClicks + s.admobClicks,
      admobRevenue: acc.admobRevenue + s.admobRevenue,
      customAdClicks: acc.customAdClicks + s.customAdClicks,
      customAdRevenue: acc.customAdRevenue + s.customAdRevenue,
      pageViews: acc.pageViews + s.pageViews,
      totalRevenue: acc.totalRevenue + s.admobRevenue + s.customAdRevenue,
    }),
    {
      admobClicks: 0,
      admobRevenue: 0,
      customAdClicks: 0,
      customAdRevenue: 0,
      pageViews: 0,
      totalRevenue: 0,
    },
  );
}
