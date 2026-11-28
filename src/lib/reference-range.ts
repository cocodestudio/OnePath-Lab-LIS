/**
 * Pure Clinical Reference Range & Report Column Utilities for OnePath Lab LIS
 * Zero UI dependencies — fully unit-testable across Enter Results, Print Report, and AI Smart Report.
 */

export type ReportColumnKey = "testDescription" | "result" | "flag" | "refRange" | "unit";

export const DEFAULT_REPORT_COLUMN_ORDER: ReportColumnKey[] = [
  "testDescription",
  "result",
  "flag",
  "refRange",
  "unit",
];

export const REPORT_COLUMN_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  order: ReportColumnKey[];
}> = [
  {
    id: "default",
    label: "Standard (Test · Value · Flag · Range · Unit)",
    description: "Default clinical layout",
    order: ["testDescription", "result", "flag", "refRange", "unit"],
  },
  {
    id: "value_unit_flag_range",
    label: "Unit Near Value (Test · Value · Unit · Flag · Range)",
    description: "Shows unit directly beside result value, followed by flag & normal range",
    order: ["testDescription", "result", "unit", "flag", "refRange"],
  },
  {
    id: "unit_last_swapped",
    label: "Swapped Unit & Range (Test · Value · Flag · Unit · Range)",
    description: "Legacy swapped unit & reference range order",
    order: ["testDescription", "result", "flag", "unit", "refRange"],
  },
  {
    id: "value_range_flag_unit",
    label: "Range Near Value (Test · Value · Range · Flag · Unit)",
    description: "Reference range next to result value",
    order: ["testDescription", "result", "refRange", "flag", "unit"],
  },
];

const VALID_COLUMN_KEYS = new Set<ReportColumnKey>([
  "testDescription",
  "result",
  "flag",
  "refRange",
  "unit",
]);

/**
 * Resolves a safe 5-column order starting with testDescription.
 * Maintains backwards compatibility with legacy `spacing.interchangeColumns`.
 */
export function resolveReportColumnOrder(
  columnOrder?: string[] | null,
  interchangeColumns?: boolean
): ReportColumnKey[] {
  if (Array.isArray(columnOrder) && columnOrder.length === 5) {
    const typed = columnOrder.filter((k): k is ReportColumnKey =>
      VALID_COLUMN_KEYS.has(k as ReportColumnKey)
    );
    const unique = Array.from(new Set(typed));
    if (unique.length === 5) {
      return unique;
    }
  }
  if (interchangeColumns) {
    return ["testDescription", "result", "flag", "unit", "refRange"];
  }
  return [...DEFAULT_REPORT_COLUMN_ORDER];
}

export interface AgeRangeBandInput {
  id?: string;
  stageName?: string;
  minAge?: number | string | null;
  min_age?: number | string | null;
  maxAge?: number | string | null;
  max_age?: number | string | null;
  ageUnit?: "days" | "months" | "years" | string | null;
  age_unit?: "days" | "months" | "years" | string | null;
  gender?: "BOTH" | "MALE" | "FEMALE" | string | null;
  rangeType?: "numeric" | "text" | string | null;
  range_type?: "numeric" | "text" | string | null;
  refMin?: number | string | null;
  ref_min?: number | string | null;
  refMax?: number | string | null;
  ref_max?: number | string | null;
  minVal?: number | string | null;
  min_val?: number | string | null;
  maxVal?: number | string | null;
  max_val?: number | string | null;
  textRange?: string | null;
  text_range?: string | null;
}

export interface PatientAgeContext {
  ageYears: number;
  ageMonths: number;
  ageDays: number;
  gender: string;
}

/**
 * Extracts normalized years/months/days + gender from any patient payload shape.
 */
export function extractPatientAgeContext(patient: any): PatientAgeContext {
  if (!patient || typeof patient !== "object") {
    return { ageYears: 30, ageMonths: 0, ageDays: 0, gender: "Male" };
  }
  let meta = patient.meta;
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  if (!meta || typeof meta !== "object") meta = {};

  const rawYears = Number(patient.age ?? 0);
  const rawMonths = Number(patient.age_months ?? patient.ageMonths ?? meta.age_months ?? meta.ageMonths ?? 0);
  const rawDays = Number(patient.age_days ?? patient.ageDays ?? meta.age_days ?? meta.ageDays ?? 0);

  return {
    ageYears: Number.isFinite(rawYears) ? Math.max(0, rawYears) : 0,
    ageMonths: Number.isFinite(rawMonths) ? Math.max(0, rawMonths) : 0,
    ageDays: Number.isFinite(rawDays) ? Math.max(0, rawDays) : 0,
    gender: String(patient.gender || "Male"),
  };
}

function toAgeInDays(value: number, unit?: string | null): number {
  const u = String(unit || "years").toLowerCase().trim();
  if (u === "days" || u === "day" || u === "d") return value;
  if (u === "months" || u === "month" || u === "m") return value * 30.4375;
  return value * 365.25;
}

function parseOptionalNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Matches a patient's age (in days/months/years) and gender against configured ageRanges.
 * Prefers exact gender match (MALE/FEMALE) over BOTH, and finer unit precision (days > months > years).
 */
export function findMatchingAgeRangeBand(
  ageRanges: AgeRangeBandInput[] | null | undefined,
  ctx: PatientAgeContext
): AgeRangeBandInput | null {
  if (!Array.isArray(ageRanges) || ageRanges.length === 0) return null;

  // Compute total age in days. Note: if patient only has ageYears=1 and ageMonths=0, ageDays=0,
  // patientDays = 365.25. If ageYears=0, ageMonths=0, ageDays=10, patientDays = 10.
  const patientTotalDays =
    ctx.ageYears * 365.25 + ctx.ageMonths * 30.4375 + ctx.ageDays;
  const patientGenderNorm = (ctx.gender || "male").toLowerCase().trim() === "female" ? "FEMALE" : "MALE";

  const unitPriority = (unit?: string | null): number => {
    const u = String(unit || "years").toLowerCase().trim();
    if (u.startsWith("d")) return 3;
    if (u.startsWith("m")) return 2;
    return 1;
  };

  const candidates = ageRanges
    .map((band, idx) => {
      const minA = parseOptionalNumber(band.minAge ?? band.min_age) ?? 0;
      const maxA = parseOptionalNumber(band.maxAge ?? band.max_age) ?? 150;
      const unit = band.ageUnit ?? band.age_unit ?? "years";
      const minDays = unit.toLowerCase().startsWith("m") && minA > 0 ? Math.max(0, minA * 30) : toAgeInDays(minA, unit);
      const maxDays = toAgeInDays(maxA, unit);
      const bandGender = String(band.gender || "BOTH").toUpperCase().trim();
      const genderMatch =
        bandGender === patientGenderNorm ? 2 : bandGender === "BOTH" || bandGender === "" ? 1 : 0;

      const inAgeRange = patientTotalDays >= minDays && patientTotalDays <= maxDays;
      return {
        band,
        idx,
        inAgeRange,
        genderMatch,
        unitPrio: unitPriority(unit),
        spanDays: maxDays - minDays,
      };
    })
    .filter((c) => c.inAgeRange && c.genderMatch > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.genderMatch !== a.genderMatch) return b.genderMatch - a.genderMatch;
    if (b.unitPrio !== a.unitPrio) return b.unitPrio - a.unitPrio;
    if (a.spanDays !== b.spanDays) return a.spanDays - b.spanDays;
    return a.idx - b.idx;
  });

  return candidates[0].band;
}

export interface ResolvedRefRange {
  min: number | null;
  max: number | null;
  text: string;
  matchedStage?: string;
}

/**
 * Resolves the authoritative reference range (min, max, display text) for any test & patient context.
 * Priority:
 *  1. Text-only range (if rangeType === "TEXT" / "text")
 *  2. Age-graded intervals (ageRanges / age_ranges) matching age (days/months/years) + gender
 *  3. Legacy Child-specific (< 12y) / Newborn (< 1y)
 *  4. Gender-specific Male / Female bounds
 *  5. Standard numeric min / max
 *  6. Text fallback or clinical default range
 */
export function resolveTestReferenceRange(
  test: any,
  patientOrCtx: any,
  fallbackDefaultRange?: string
): ResolvedRefRange {
  if (!test || typeof test !== "object") {
    return { min: null, max: null, text: fallbackDefaultRange || "—" };
  }

  const ctx: PatientAgeContext =
    patientOrCtx && typeof patientOrCtx.ageYears === "number"
      ? patientOrCtx
      : extractPatientAgeContext(patientOrCtx);

  const rangeTypeUpper = String(test.rangeType || test.range_type || "").toUpperCase();
  const textRangeRaw = String(test.textRefRange || test.text_ref_range || "").trim();

  const rawMinDefault = parseOptionalNumber(test.refRangeMin ?? test.ref_range_min);
  const rawMaxDefault = parseOptionalNumber(test.refRangeMax ?? test.ref_range_max);

  if (
    rangeTypeUpper === "TEXT" ||
    (rawMinDefault === null && rawMaxDefault === null && textRangeRaw.length > 0 && !(Array.isArray(test.ageRanges || test.age_ranges) && (test.ageRanges || test.age_ranges).length > 0))
  ) {
    if (textRangeRaw) {
      return { min: null, max: null, text: textRangeRaw };
    }
  }

  // 2. Check Age-Graded Reference Ranges (works regardless of whether rangeType is "numeric" or "AGE_BASED")
  const ageRanges = test.ageRanges || test.age_ranges;
  const matchedBand = findMatchingAgeRangeBand(ageRanges, ctx);
  if (matchedBand) {
    const bandRangeType = String(matchedBand.rangeType ?? matchedBand.range_type ?? "numeric").toLowerCase();
    const bandText = String(matchedBand.textRange ?? matchedBand.text_range ?? "").trim();
    if (bandRangeType === "text" && bandText) {
      return { min: null, max: null, text: bandText, matchedStage: matchedBand.stageName };
    }
    const bMin = parseOptionalNumber(matchedBand.refMin ?? matchedBand.ref_min ?? matchedBand.minVal ?? matchedBand.min_val);
    const bMax = parseOptionalNumber(matchedBand.refMax ?? matchedBand.ref_max ?? matchedBand.maxVal ?? matchedBand.max_val);
    if (bMin !== null && bMax !== null) {
      return { min: bMin, max: bMax, text: `${bMin} - ${bMax}`, matchedStage: matchedBand.stageName };
    }
    if (bMin !== null) {
      return { min: bMin, max: null, text: `> ${bMin}`, matchedStage: matchedBand.stageName };
    }
    if (bMax !== null) {
      return { min: null, max: bMax, text: `< ${bMax}`, matchedStage: matchedBand.stageName };
    }
    if (bandText) {
      return { min: null, max: null, text: bandText, matchedStage: matchedBand.stageName };
    }
  }

  // 3. Legacy Newborn / Child overrides
  const genderType = String(test.genderRefType || test.gender_ref_type || "").toUpperCase();
  const minChild = parseOptionalNumber(test.refRangeMinChild ?? test.ref_range_min_child);
  const maxChild = parseOptionalNumber(test.refRangeMaxChild ?? test.ref_range_max_child);
  const minNewborn = parseOptionalNumber(test.refRangeMinNewborn ?? test.ref_range_min_newborn);
  const maxNewborn = parseOptionalNumber(test.refRangeMaxNewborn ?? test.ref_range_max_newborn);

  const totalYears = ctx.ageYears + ctx.ageMonths / 12 + ctx.ageDays / 365.25;
  if ((genderType === "NEWBORN" || totalYears < 1) && (minNewborn !== null || maxNewborn !== null)) {
    const m1 = minNewborn ?? rawMinDefault;
    const m2 = maxNewborn ?? rawMaxDefault;
    if (m1 !== null && m2 !== null) return { min: m1, max: m2, text: `${m1} - ${m2}` };
    if (m1 !== null) return { min: m1, max: null, text: `> ${m1}` };
    if (m2 !== null) return { min: null, max: m2, text: `< ${m2}` };
  }

  if ((genderType === "CHILD_SPECIFIC" || genderType === "CHILDREN" || totalYears < 12) && (minChild !== null || maxChild !== null)) {
    const c1 = minChild ?? rawMinDefault;
    const c2 = maxChild ?? rawMaxDefault;
    if (c1 !== null && c2 !== null) return { min: c1, max: c2, text: `${c1} - ${c2}` };
    if (c1 !== null) return { min: c1, max: null, text: `> ${c1}` };
    if (c2 !== null) return { min: null, max: c2, text: `< ${c2}` };
  }

  // 4. Gender-specific bounds
  const isFemale = ctx.gender.toLowerCase().trim() === "female";
  const minMale = parseOptionalNumber(test.refRangeMinMale ?? test.ref_range_min_male);
  const maxMale = parseOptionalNumber(test.refRangeMaxMale ?? test.ref_range_max_male);
  const minFemale = parseOptionalNumber(test.refRangeMinFemale ?? test.ref_range_min_female);
  const maxFemale = parseOptionalNumber(test.refRangeMaxFemale ?? test.ref_range_max_female);

  if (genderType === "GENDER_SPECIFIC" || genderType === "BY_GENDER" || genderType === "GENDER") {
    const gMin = (isFemale ? minFemale : minMale) ?? rawMinDefault;
    const gMax = (isFemale ? maxFemale : maxMale) ?? rawMaxDefault;
    if (gMin !== null && gMax !== null) return { min: gMin, max: gMax, text: `${gMin} - ${gMax}` };
    if (gMin !== null) return { min: gMin, max: null, text: `> ${gMin}` };
    if (gMax !== null) return { min: null, max: gMax, text: `< ${gMax}` };
  }

  // 5. Standard numeric min / max (allow 0 when paired with non-zero max, e.g. 0 - 5)
  if (rawMinDefault !== null && rawMaxDefault !== null && (rawMinDefault !== 0 || rawMaxDefault !== 0)) {
    return { min: rawMinDefault, max: rawMaxDefault, text: `${rawMinDefault} - ${rawMaxDefault}` };
  }
  if (rawMinDefault !== null && rawMinDefault !== 0) {
    return { min: rawMinDefault, max: null, text: `> ${rawMinDefault}` };
  }
  if (rawMaxDefault !== null && rawMaxDefault !== 0) {
    return { min: null, max: rawMaxDefault, text: `< ${rawMaxDefault}` };
  }

  // Implicit gender fallback if standard default wasn't set
  if (isFemale && (minFemale !== null || maxFemale !== null)) {
    const f1 = minFemale;
    const f2 = maxFemale;
    if (f1 !== null && f2 !== null) return { min: f1, max: f2, text: `${f1} - ${f2}` };
  }
  if (!isFemale && (minMale !== null || maxMale !== null)) {
    const m1 = minMale;
    const m2 = maxMale;
    if (m1 !== null && m2 !== null) return { min: m1, max: m2, text: `${m1} - ${m2}` };
  }

  if (textRangeRaw) {
    return { min: null, max: null, text: textRangeRaw };
  }

  return { min: null, max: null, text: fallbackDefaultRange || "—" };
}
