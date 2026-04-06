/**
 * Google Sheets Hybrid Database
 * Fetches CSV data from Google Sheets and stores in localStorage
 * Columns: Platform, Category, Video_Link, Status, Ad_Link, Affiliate_Link
 */

export interface SheetRow {
  id: string;
  platform: string;
  category: string;
  videoLink: string;
  status: string;
  adLink: string;
  affiliateLink: string;
  source: "sheet" | "manual";
}

const SHEET_DATA_KEY = "dz_sheet_data";
const SHEET_URL_KEY = "dz_sheet_csv_url";
const SHEET_LAST_SYNC_KEY = "dz_sheet_last_sync";

export function getSheetCsvUrl(): string {
  return localStorage.getItem(SHEET_URL_KEY) ?? "";
}

export function setSheetCsvUrl(url: string): void {
  localStorage.setItem(SHEET_URL_KEY, url);
}

export function getSheetData(): SheetRow[] {
  try {
    const raw = localStorage.getItem(SHEET_DATA_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SheetRow[];
  } catch {
    return [];
  }
}

export function saveSheetData(rows: SheetRow[]): void {
  localStorage.setItem(SHEET_DATA_KEY, JSON.stringify(rows));
  localStorage.setItem(SHEET_LAST_SYNC_KEY, new Date().toISOString());
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(SHEET_LAST_SYNC_KEY);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Fetch and parse CSV from Google Sheets URL
 * The Sheet must be published: File > Share > Publish to Web > CSV format
 * Example URL: https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv
 */
export async function fetchSheetData(csvUrl: string): Promise<SheetRow[]> {
  if (!csvUrl) throw new Error("CSV URL set nahi ki gayi hai");

  // Support both direct CSV URLs and Google Sheets share links
  let fetchUrl = csvUrl;
  if (
    csvUrl.includes("docs.google.com/spreadsheets") &&
    !csvUrl.includes("export?format=csv")
  ) {
    // Convert share URL to CSV export URL
    const match = csvUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
  }

  const response = await fetch(fetchUrl, { mode: "cors", cache: "no-cache" });
  if (!response.ok) {
    throw new Error(
      `Sheet fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header row to find column positions
  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_"),
  );
  const colIdx = (name: string) => headers.indexOf(name);

  const platformIdx = colIdx("platform") !== -1 ? colIdx("platform") : 0;
  const categoryIdx = colIdx("category") !== -1 ? colIdx("category") : 1;
  const videoLinkIdx = colIdx("video_link") !== -1 ? colIdx("video_link") : 2;
  const statusIdx = colIdx("status") !== -1 ? colIdx("status") : 3;
  const adLinkIdx = colIdx("ad_link") !== -1 ? colIdx("ad_link") : 4;
  const affiliateLinkIdx =
    colIdx("affiliate_link") !== -1 ? colIdx("affiliate_link") : 5;

  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue; // Skip empty rows
    rows.push({
      id: `sheet_${i}_${Date.now()}`,
      platform: cols[platformIdx] ?? "",
      category: cols[categoryIdx] ?? "",
      videoLink: cols[videoLinkIdx] ?? "",
      status: cols[statusIdx] ?? "active",
      adLink: cols[adLinkIdx] ?? "",
      affiliateLink: cols[affiliateLinkIdx] ?? "",
      source: "sheet",
    });
  }

  return rows;
}

/**
 * Sync from sheet and merge with manual entries
 * Manual entries (source: 'manual') are preserved
 */
export async function syncFromSheet(): Promise<{
  added: number;
  error?: string;
}> {
  const url = getSheetCsvUrl();
  if (!url) return { added: 0, error: "CSV URL set nahi hai" };

  try {
    const sheetRows = await fetchSheetData(url);
    const existingData = getSheetData();
    const manualRows = existingData.filter((r) => r.source === "manual");

    // Merge: manual rows first, then sheet rows
    const merged = [...manualRows, ...sheetRows];
    saveSheetData(merged);

    return { added: sheetRows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { added: 0, error: msg };
  }
}

/**
 * Add a manual row via Admin Panel
 */
export function addManualRow(row: Omit<SheetRow, "id" | "source">): void {
  const existing = getSheetData();
  const newRow: SheetRow = {
    ...row,
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source: "manual",
  };
  existing.push(newRow);
  saveSheetData(existing);
}

/**
 * Delete a row by id
 */
export function deleteSheetRow(id: string): void {
  const existing = getSheetData();
  saveSheetData(existing.filter((r) => r.id !== id));
}
