/**
 * Global Leaderboard — localStorage-backed, weekly reset.
 * Each entry has a weekKey; getLeaderboard() returns only current week, top 10.
 * Full history preserved (up to 50 total entries).
 */

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  wave: number;
  timestamp: number;
  weekKey: string;
}

const LEADERBOARD_KEY = "dz_game_leaderboard";
const MAX_WEEKLY = 10;
const MAX_TOTAL = 50;

/** Returns ISO week key "YYYY-WW" for a given timestamp (default: now) */
export function getWeekKey(ts?: number): string {
  const d = ts ? new Date(ts) : new Date();
  // ISO week: Monday-based
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7; // 1=Mon ... 7=Sun
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** { start, end } date strings for the current ISO week (Mon–Sun) */
export function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.toLocaleString("en-IN", { month: "short" })} ${d.getDate()}`;
  return { start: fmt(mon), end: fmt(sun) };
}

/** Alias kept for legacy callers */
export const getCurrentWeekRange = getWeekRange;

function genId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function genPlayerName(): string {
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `DZ_Player_${suffix}`;
}

function readAll(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

/** Read leaderboard — only current week, sorted by score desc, top 10 */
export function getLeaderboard(): LeaderboardEntry[] {
  const currentWeek = getWeekKey();
  const all = readAll();
  return all
    .filter((e) => e.weekKey === currentWeek)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_WEEKLY);
}

/**
 * Add a score to the leaderboard.
 * @param score     Final score value
 * @param wave      Wave reached
 * @param playerName Optional display name (auto-generated if not provided)
 * @returns The new LeaderboardEntry
 */
export function addScore(
  score: number,
  wave: number,
  playerName?: string,
): LeaderboardEntry {
  const entry: LeaderboardEntry = {
    id: genId(),
    playerName: playerName ?? genPlayerName(),
    score,
    wave,
    timestamp: Date.now(),
    weekKey: getWeekKey(),
  };

  const all = readAll();
  all.push(entry);

  // Keep only the latest MAX_TOTAL entries across all weeks
  const trimmed =
    all.length > MAX_TOTAL
      ? all.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_TOTAL)
      : all;

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch {}

  return entry;
}

/** Clear all leaderboard entries */
export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch {}
}

/** Returns true if score qualifies for current week's top 10 */
export function isHighScore(score: number): boolean {
  if (score <= 0) return false;
  const board = getLeaderboard();
  if (board.length < MAX_WEEKLY) return true;
  return score > board[board.length - 1].score;
}

/** Rank medal emoji for position (1-based) */
export function rankMedal(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `#${position}`;
}
