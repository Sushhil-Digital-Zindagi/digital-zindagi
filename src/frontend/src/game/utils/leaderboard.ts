/**
 * Leaderboard — localStorage-backed, weekly reset.
 */

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  wave: number;
  level: number;
  timestamp: number;
  weekKey: string;
}

const LEADERBOARD_KEY = "dz_ws_leaderboard";
const MAX_WEEKLY = 10;
const MAX_TOTAL = 50;

export function getWeekKey(ts?: number): string {
  const d = ts ? new Date(ts) : new Date();
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.toLocaleString("en-IN", { month: "short" })} ${d.getDate()}`;
  return { start: fmt(mon), end: fmt(sun) };
}

export const getCurrentWeekRange = getWeekRange;

function genId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function genPlayerName(): string {
  return `DZ_${Math.floor(Math.random() * 9000) + 1000}`;
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

export function getLeaderboard(): LeaderboardEntry[] {
  const currentWeek = getWeekKey();
  return readAll()
    .filter((e) => e.weekKey === currentWeek)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_WEEKLY);
}

export function addScore(
  score: number,
  wave: number,
  level = 1,
  playerName?: string,
): LeaderboardEntry {
  const entry: LeaderboardEntry = {
    id: genId(),
    playerName: playerName ?? genPlayerName(),
    score,
    wave,
    level,
    timestamp: Date.now(),
    weekKey: getWeekKey(),
  };
  const all = readAll();
  all.push(entry);
  const trimmed =
    all.length > MAX_TOTAL
      ? all.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_TOTAL)
      : all;
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch {}
  return entry;
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch {}
}

export function isHighScore(score: number): boolean {
  if (score <= 0) return false;
  const board = getLeaderboard();
  if (board.length < MAX_WEEKLY) return true;
  return score > board[board.length - 1].score;
}

export function rankMedal(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `#${position}`;
}
