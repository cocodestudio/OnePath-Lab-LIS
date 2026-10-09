/**
 * Standardized Date Utilities for OnePath LIS
 * Strictly anchored to Asia/Kolkata (Indian Standard Time, UTC+5:30)
 * Prevents UTC off-by-one errors across morning, night, and midnight shifts.
 */

export function getTodayStr(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export function getYesterdayStr(): string {
  try {
    const todayStr = getTodayStr();
    const [y, m, d] = todayStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, "0");
    const dStr = String(dt.getDate()).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  } catch {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
}

export function getRecordLocalDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return String(dateStr).slice(0, 10);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

export function shiftDate(currentDateStr: string, days: number): string {
  try {
    const baseStr = currentDateStr || getTodayStr();
    const [y, m, d] = baseStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, "0");
    const dStr = String(dt.getDate()).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}`;
  } catch {
    const base = currentDateStr ? new Date(currentDateStr) : new Date();
    base.setDate(base.getDate() + days);
    return base.toISOString().split("T")[0];
  }
}

export function getDaysAgoStr(days: number): string {
  return shiftDate(getTodayStr(), -Math.abs(days));
}

export function getStartOfMonthStr(): string {
  try {
    const todayStr = getTodayStr();
    const [y, m] = todayStr.split("-");
    return `${y}-${m}-01`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
}
