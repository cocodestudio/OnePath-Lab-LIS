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

/**
 * Formats any ISO, SQL, or custom date/time representation into YYYY-MM-DDTHH:mm
 * strictly suitable for <input type="datetime-local">.
 * Preserves exact local Indian Standard Time (Asia/Kolkata).
 */
export function formatToDateTimeLocal(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "";
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(dateInput);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    let hour = map.hour ?? "00";
    if (hour === "24") hour = "00";
    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
  }

  const s = String(dateInput).trim();
  if (!s) return "";
  // Already in valid datetime-local format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
  // SQL datetime without tz: 2026-11-01 10:30:00 -> 2026-11-01T10:30
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.slice(0, 16).replace(/\s+/, "T");
  // Date only: 2026-11-01 -> 2026-11-01T00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;

  try {
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return s.slice(0, 16).replace(" ", "T");
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(dt);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    let hour = map.hour ?? "00";
    if (hour === "24") hour = "00";
    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
  } catch {
    return s.slice(0, 16).replace(" ", "T");
  }
}

