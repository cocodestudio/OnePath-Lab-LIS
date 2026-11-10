/**
 * OnePath Lab LIS — Patient Title & Salutation Helper
 * 
 * Provides centralized formatting rules:
 * 1. formatPatientListDisplayName(name, designation):
 *    Used across dashboard tables & lists (Reports tab, Patients tab, Billing tab).
 *    When patient title is blank/unselected, displays "Untitled <Name>".
 * 
 * 2. cleanPatientNameForReport(name, designation):
 *    Used across all report print, PDF generation & download views.
 *    When title is blank, strips any "Untitled" or "Blank" prefix and starts directly
 *    with patient name without any title.
 */

import { ALL_DESIGNATIONS } from "./report-settings";

const BLANK_DESIGNATION_VALUES = new Set(["", "blank", "null", "none", "untitled", "unselected"]);

export function isBlankDesignation(designation?: string | null): boolean {
  if (!designation) return true;
  return BLANK_DESIGNATION_VALUES.has(designation.trim().toLowerCase());
}

/**
 * Returns clean name without any leading designation / salutation / "Untitled" / "Blank".
 */
export function extractPurePatientName(name?: string | null): string {
  if (!name) return "";
  let clean = name.trim();

  // Strip leading "Untitled" or "Blank" (including repeated occurrences)
  clean = clean.replace(/^((untitled|blank|null)\s+)+/i, "").trim();

  // Strip any known title from ALL_DESIGNATIONS if present at start
  for (const d of ALL_DESIGNATIONS) {
    if (d.toLowerCase() === "blank" || d.toLowerCase() === "null") continue;
    const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escaped}\\s+`, "i");
    if (regex.test(clean)) {
      clean = clean.replace(regex, "").trim();
      break;
    }
  }

  return clean;
}

/**
 * Format patient name for dashboard views: Reports Tab, Patients Tab, Billing Tab.
 * If title is blank, displays clean patient name without any "Untitled" prefix.
 * Fully defensive against object inputs (e.g. patient entity object) or non-string values.
 */
export function formatPatientListDisplayName(name?: any, designation?: any): string {
  if (typeof name === "object" && name !== null) {
    designation = designation ?? name.designation ?? name.title ?? name.salutation;
    name = name.name ?? name.patient_name ?? name.patientName ?? "";
  }

  if (typeof name !== "string" || !name.trim()) return "—";

  const trimmedName = name.trim();
  const safeDes = typeof designation === "string" ? designation.trim() : "";

  // If a valid designation was provided and is not blank, it ALWAYS takes precedence
  if (safeDes && !isBlankDesignation(safeDes)) {
    const pure = extractPurePatientName(trimmedName);
    return `${safeDes} ${pure || trimmedName}`.trim();
  }

  // Check if name already starts with a recognized title like "Mr.", "Mrs.", "Dr.", etc.
  const hasKnownTitle = ALL_DESIGNATIONS.some((d) => {
    if (d.toLowerCase() === "blank" || d.toLowerCase() === "null") return false;
    const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}\\s+`, "i").test(trimmedName);
  });

  if (hasKnownTitle) {
    return trimmedName;
  }

  // Title is blank -> show clean pure name directly without "Untitled" prefix
  const pureName = extractPurePatientName(trimmedName);
  return pureName || trimmedName;
}

/**
 * Format patient name for Report Print & Download (Report Sheet, Fullscreen Modal, Batch Print, PDF, Public link).
 * When title is blank, NO title is displayed. Name starts cleanly from the beginning.
 * Fully defensive against object inputs or non-string values.
 */
export function cleanPatientNameForReport(name?: any, designation?: any): string {
  if (typeof name === "object" && name !== null) {
    designation = designation ?? name.designation ?? name.title ?? name.salutation;
    name = name.name ?? name.patient_name ?? name.patientName ?? "";
  }

  if (typeof name !== "string" || !name.trim()) return "—";

  const trimmedName = name.trim();
  const safeDes = typeof designation === "string" ? designation.trim() : "";

  // If title is blank / unselected, strip any "Untitled" and any leading title
  if (isBlankDesignation(safeDes)) {
    const pure = extractPurePatientName(trimmedName);
    return pure || trimmedName;
  }

  // If a valid designation exists, format properly
  const des = designation!.trim();
  if (trimmedName.toLowerCase().startsWith(des.toLowerCase())) {
    return trimmedName;
  }
  const pure = extractPurePatientName(trimmedName);
  return `${des} ${pure || trimmedName}`.trim();
}
