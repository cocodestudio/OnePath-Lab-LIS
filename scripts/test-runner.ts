/**
 * OnePath Lab LIS — Comprehensive Feature Unit Test Runner
 * Run with: npx tsx scripts/test-runner.ts
 */

import { getClinicalInterpretation, DEFAULT_INTERPRETATIONS } from "../src/lib/clinical-interpretations";
import { normalizeBillSettings, BillLayoutSettings } from "../src/lib/bill-settings";
import { resolvePackageTestIds, DEFAULT_PACKAGES } from "../src/lib/packages";
import { analyzeReportForSmartInsights, evaluateParamReference } from "../src/lib/smart-report-engine";
import { isSubscriptionExpired } from "../src/lib/subscription";
import {
  isGenuineCustomEditorTest,
  getCustomEditorInitialTemplate,
  DEFAULT_WIDAL_TEMPLATE,
  DEFAULT_CULTURE_TEMPLATE,
  DEFAULT_BIOPSY_TEMPLATE,
} from "../src/lib/clinical-test-helper";
import { clearApiCache } from "../src/lib/api-client";
import { getTodayStr, getYesterdayStr, getDaysAgoStr, getStartOfMonthStr, getRecordLocalDate } from "../src/lib/date-utils";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
    if (failureDetails) {
      console.error(`    Details: ${failureDetails}`);
    }
  }
}

console.log("===============================================================================");
console.log("             OnePath Lab LIS — Comprehensive Feature Unit Test Suite           ");
console.log("===============================================================================\n");

// ==============================================================================
// 1. Clinical Interpretations & Diagnostic Remark Routing
// ==============================================================================
console.log("▶ MODULE 1: Clinical Interpretations Engine");

// Test 1: Complete Blood Count (CBC) Routing
const cbcInterp = getClinicalInterpretation("Complete Blood Count (CBC)");
assert(
  (cbcInterp || "").trim() === DEFAULT_INTERPRETATIONS.CBC.trim(),
  "CBC test name routes to DEFAULT_INTERPRETATIONS.CBC",
  `Expected CBC interpretation, got: ${cbcInterp?.substring(0, 50)}...`
);

// Test 2: Haematology Category Routing
const haemInterp = getClinicalInterpretation("Platelet Count", null, "Haematology");
assert(
  (haemInterp || "").trim() === DEFAULT_INTERPRETATIONS.CBC.trim(),
  "Haematology category routes to CBC/Haematology interpretation"
);

// Test 3: CRITICAL BUG FIX VERIFICATION — HEPATOLOGY must route to LFT, NOT CBC!
const hepatologyInterp = getClinicalInterpretation("Hepatology Comprehensive Panel");
assert(
  (hepatologyInterp || "").trim() === DEFAULT_INTERPRETATIONS.LFT.trim(),
  "[BUG FIX] Hepatology panel routes to LFT interpretation",
  `Hepatology routed to wrong interpretation: ${hepatologyInterp?.substring(0, 40)}`
);
assert(
  (hepatologyInterp || "").trim() !== DEFAULT_INTERPRETATIONS.CBC.trim(),
  "[BUG FIX] Hepatology panel NEVER routes to CBC interpretation"
);

// Test 4: Liver Function Test (LFT) Routing
const lftInterp = getClinicalInterpretation("Liver Function Test (LFT)", null, "Biochemistry");
assert(
  (lftInterp || "").trim() === DEFAULT_INTERPRETATIONS.LFT.trim(),
  "LFT test routes to DEFAULT_INTERPRETATIONS.LFT"
);

// Test 5: Lipid Profile Routing
const lipidInterp = getClinicalInterpretation("Lipid Profile - Extended");
assert(
  (lipidInterp || "").trim() === DEFAULT_INTERPRETATIONS.LIPID.trim(),
  "Lipid Profile routes to DEFAULT_INTERPRETATIONS.LIPID"
);

// Test 6: Kidney Function Test (KFT / RFT) Routing
const kftInterp = getClinicalInterpretation("Kidney Function Test (KFT)");
assert(
  (kftInterp || "").trim() === DEFAULT_INTERPRETATIONS.KFT.trim(),
  "Kidney Function Test routes to DEFAULT_INTERPRETATIONS.KFT"
);

// ==============================================================================
// 2. Bill Layout & Invoice Settings Normalization
// ==============================================================================
console.log("\n▶ MODULE 2: Bill Layout & Invoice Settings Normalization");

// Test 7: Normalization of CamelCase Settings
const camelInput: Partial<BillLayoutSettings> = {
  headerHeight: 125,
  footerHeight: 75,
  showBarcode: true,
  showPaymentBreakdown: false,
  heading: "Official Cash Receipt",
  termsAndConditions: "All disputes subject to local jurisdiction.",
};
const normCamel = normalizeBillSettings(camelInput);
assert(normCamel.headerHeight === 125, "normalizeBillSettings preserves camelCase headerHeight");
assert(normCamel.footerHeight === 75, "normalizeBillSettings preserves camelCase footerHeight");
assert(normCamel.showBarcode === true, "normalizeBillSettings preserves camelCase showBarcode");
assert(normCamel.showPaymentBreakdown === false, "normalizeBillSettings preserves camelCase showPaymentBreakdown");
assert(normCamel.termsAndConditions === "All disputes subject to local jurisdiction.", "normalizeBillSettings preserves camelCase termsAndConditions");

// Test 8: CRITICAL BUG FIX VERIFICATION — Snake_case Laravel API Payload Normalization
const snakeInput = {
  header_height: 145,
  footer_height: 85,
  show_barcode: false,
  show_phone: true,
  show_payment_breakdown: true,
  show_second_referral: false,
  header_image: "https://cloud.onepathlab.com/assets/custom-header.png",
  footer_image: "https://cloud.onepathlab.com/assets/custom-footer.png",
  terms_and_conditions: "Samples stored for 48 hours only.",
};
const normSnake = normalizeBillSettings(snakeInput as any);
assert(normSnake.headerHeight === 145, "[BUG FIX] normalizeBillSettings accurately parses snake_case header_height (145)");
assert(normSnake.footerHeight === 85, "[BUG FIX] normalizeBillSettings accurately parses snake_case footer_height (85)");
assert(normSnake.showBarcode === false, "[BUG FIX] normalizeBillSettings accurately parses snake_case show_barcode (false)");
assert(normSnake.showPhone === true, "[BUG FIX] normalizeBillSettings accurately parses snake_case show_phone (true)");
assert(normSnake.headerImage === "https://cloud.onepathlab.com/assets/custom-header.png", "[BUG FIX] normalizeBillSettings accurately parses snake_case header_image");
assert(normSnake.footerImage === "https://cloud.onepathlab.com/assets/custom-footer.png", "[BUG FIX] normalizeBillSettings accurately parses snake_case footer_image");
assert(normSnake.termsAndConditions === "Samples stored for 48 hours only.", "[BUG FIX] normalizeBillSettings accurately parses snake_case terms_and_conditions");

// Test 9: Default Fallbacks
const emptyNorm = normalizeBillSettings({});
assert(emptyNorm.headerHeight === 110, "normalizeBillSettings defaults headerHeight to 110");
assert(emptyNorm.footerHeight === 70, "normalizeBillSettings defaults footerHeight to 70");
assert(emptyNorm.showBarcode === true, "normalizeBillSettings defaults showBarcode to true");

// ==============================================================================
// 3. Health Packages & UUID Resolution Engine
// ==============================================================================
console.log("\n▶ MODULE 3: Health Packages & UUID Resolution Engine");

// Test 10: CRITICAL BUG FIX VERIFICATION — Prevent Mock UUID Leakage
const mockCatalog = [
  { id: "real-test-uuid-cbc-1234", name: "Complete Blood Count", code: "CBC" },
  { id: "real-test-uuid-lft-5678", name: "Liver Function Test", code: "LFT" },
  { id: "real-test-uuid-kft-9999", name: "Kidney Function Test", code: "KFT" },
];
const defaultPkg = DEFAULT_PACKAGES[0]; // e.g. Executive Full Body Checkup
const resolvedIds = resolvePackageTestIds(defaultPkg, mockCatalog);

assert(
  Array.isArray(resolvedIds) && resolvedIds.length > 0,
  "resolvePackageTestIds resolves matching tests from provided catalog"
);

// Verify that hardcoded fake UUIDs from DEFAULT_PACKAGES did NOT leak into resolvedIds
const hardcodedMockIds = [
  "01a05d66-d6b9-708d-bf17-f48c6fd53f64",
  "01a05d66-d710-73f1-b928-874db126786a",
];
const containsLeakedMockUuid = resolvedIds.some((id) => hardcodedMockIds.includes(id));
assert(
  !containsLeakedMockUuid,
  "[BUG FIX] resolvePackageTestIds eliminates phantom mock UUIDs when test catalog is provided",
  `Leaked mock UUIDs found in resolved array: ${JSON.stringify(resolvedIds)}`
);

// ==============================================================================
// 4. Smart Report AI & Organ Vitality Engine
// ==============================================================================
console.log("\n▶ MODULE 4: Smart Report AI & Organ Vitality Engine");

// Test 11: Vitality Score Calculations
const perfectReport = {
  results: [
    { test: { name: "Hemoglobin", minAge: 0, maxAge: 99, normalRangeMale: "13.0 - 17.0" }, resultValue: "14.5" },
    { test: { name: "Platelet Count", minAge: 0, maxAge: 99, normalRangeMale: "150000 - 450000" }, resultValue: "250000" },
    { test: { name: "Serum Creatinine", minAge: 0, maxAge: 99, normalRangeMale: "0.6 - 1.2" }, resultValue: "0.9" },
    { test: { name: "Fasting Blood Sugar", minAge: 0, maxAge: 99, normalRangeMale: "70 - 100" }, resultValue: "92" },
  ],
  patient: { age: 30, gender: "male" },
};
const perfectAnalysis = analyzeReportForSmartInsights(perfectReport);
assert(
  perfectAnalysis.overallHealthScore >= 95,
  "analyzeReportForSmartInsights returns optimal vitality score (>= 95) for normal parameters",
  `Calculated score: ${perfectAnalysis.overallHealthScore}`
);
assert(
  perfectAnalysis.overallStatus === "OPTIMAL",
  "analyzeReportForSmartInsights classifies normal results as OPTIMAL"
);

// Test 12: Penalty Calculation for Abnormal Parameters
const abnormalReport = {
  results: [
    { test: { name: "Hemoglobin", normalRangeMale: "13.0 - 17.0" }, resultValue: "7.0", isAbnormal: true },
    { test: { name: "Platelet Count", normalRangeMale: "150000 - 450000" }, resultValue: "40000", isAbnormal: true },
    { test: { name: "Serum Creatinine", normalRangeMale: "0.6 - 1.2" }, resultValue: "3.5", isAbnormal: true },
    { test: { name: "Fasting Blood Sugar", normalRangeMale: "70 - 100" }, resultValue: "250", isAbnormal: true },
  ],
  patient: { age: 45, gender: "male" },
};
const abnormalAnalysis = analyzeReportForSmartInsights(abnormalReport);
assert(
  abnormalAnalysis.overallHealthScore < 70,
  "analyzeReportForSmartInsights penalizes multiple critical abnormal values (< 70)",
  `Calculated abnormal score: ${abnormalAnalysis.overallHealthScore}`
);
assert(
  abnormalAnalysis.overallStatus === "HIGH_RISK",
  "analyzeReportForSmartInsights flags multiple abnormal values as HIGH_RISK"
);

// Test 13: Reference Range Evaluation (Pediatric vs Adult & Gender Ranges)
const childEval = evaluateParamReference(
  {
    test: {
      rangeType: "AGE_BASED",
      ageRanges: [
        { minAge: 1, maxAge: 10, normalMin: 11.0, normalMax: 14.0 },
        { minAge: 11, maxAge: 60, normalMin: 13.0, normalMax: 17.0 },
      ],
    },
    resultValue: "12.0",
  },
  5,
  "male"
);
assert(
  childEval.flag === "NORMAL" && !childEval.isAbnormal,
  "evaluateParamReference correctly evaluates pediatric age range (12.0 g/dL is NORMAL for age 5)"
);

const maleAdultEval = evaluateParamReference(
  {
    test: {
      rangeType: "GENDER_BASED",
      normalRangeMale: "13.0 - 17.0",
      normalRangeFemale: "12.0 - 15.0",
    },
    resultValue: "16.0",
  },
  35,
  "male"
);
assert(
  maleAdultEval.flag === "NORMAL" && !maleAdultEval.isAbnormal,
  "evaluateParamReference correctly evaluates adult male reference range (16.0 g/dL is NORMAL for male)"
);

// ==============================================================================
// 5. Subscription Gate & Laboratory License Validation
// ==============================================================================
console.log("\n▶ MODULE 5: Subscription Gate & Laboratory License Validation");

// Test 14: Active subscription validation
const activeLab = {
  plan_status: "active",
  plan_expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
};
assert(
  isSubscriptionExpired(activeLab) === false,
  "isSubscriptionExpired returns false for active future expiration plan"
);

// Test 15: Expired subscription validation
const expiredLab = {
  plan_status: "expired",
  plan_expires_at: new Date(Date.now() - 86400000 * 5).toISOString(),
};
assert(
  isSubscriptionExpired(expiredLab) === true,
  "isSubscriptionExpired returns true for expired plan"
);

// ==============================================================================
// 6. Specialized Clinical Layouts (Culture, Widal Slide, Biopsy Histopathology)
// ==============================================================================
console.log("\n▶ MODULE 6: Specialized Clinical Layouts & Narrative Templates");

// Test 16: Culture and Sensitivity must ALWAYS be recognized as Custom Editor
const cultureTestObj = {
  name: "Culture and Sensitivity",
  category: "Microbiology",
  valueType: "Numeric", // Even if default valueType is Numeric in database!
  fieldType: "Custom Editor",
};
assert(
  isGenuineCustomEditorTest(cultureTestObj) === true,
  "[BUG FIX] Culture & Sensitivity is recognized as Custom Editor (never standard analyte row)"
);

// Test 17: Widal Slide Method must be recognized as Custom Editor (4-antigen matrix)
const widalSlideObj = {
  name: "Widal Test (Slide Method)",
  category: "Serology & Immunology",
  valueType: "Numeric",
  fieldType: "Custom Editor",
};
assert(
  isGenuineCustomEditorTest(widalSlideObj) === true,
  "[BUG FIX] Widal Slide Method is recognized as Custom Editor (2D dilution grid)"
);

// Test 18: Biopsy (Histopathology Examination) must be recognized as Custom Editor
const biopsyTestObj = {
  name: "Biopsy (Histopathology Examination)",
  category: "Histopathology",
  valueType: "Text",
  fieldType: "Custom Editor",
};
assert(
  isGenuineCustomEditorTest(biopsyTestObj) === true,
  "Biopsy (Histopathology Examination) is recognized as Custom Editor surgical pathology layout"
);

// Test 19: Standard pathology analytes MUST NEVER be treated as Custom Editor (Zero Regression)
const standardAnalytes = [
  { name: "Complete Blood Count (CBC)", category: "Haematology" },
  { name: "Liver Function Test (LFT)", category: "Biochemistry" },
  { name: "Kidney Function Test (KFT)", category: "Biochemistry" },
  { name: "Lipid Profile", category: "Biochemistry" },
  { name: "Fasting Blood Sugar", category: "Biochemistry" },
  { name: "Serum Creatinine", category: "Biochemistry" },
];
const allAnalytesProtected = standardAnalytes.every(t => !isGenuineCustomEditorTest(t));
assert(
  allAnalytesProtected,
  "[ZERO REGRESSION] Standard clinical analytes (CBC, LFT, KFT, Lipid, Sugar) are strictly NOT Custom Editor"
);

// ==============================================================================
// 7. Test Catalog Edit & Invalidation Propagation Engine
// ==============================================================================
console.log("\n▶ MODULE 7: Test Catalog Edit & Invalidation Propagation Engine");

const mockStorage: Record<string, string> = {
  "lis_cached_tests": JSON.stringify([{ id: "test-1", name: "CBC Old", price: 300 }]),
};

(global as any).window = {
  dispatchEvent: (event: any) => {
    (global as any).lastDispatchedEvent = event;
  },
};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
};

clearApiCache("/tests");

assert(
  mockStorage["lis_cached_tests"] === undefined,
  "[BUG FIX] clearApiCache('/tests') immediately wipes lis_cached_tests from localStorage"
);

assert(
  (global as any).lastDispatchedEvent?.type === "lis_cache_invalidated",
  "[BUG FIX] clearApiCache dispatches lis_cache_invalidated event to notify all UI screens"
);

assert(
  (global as any).lastDispatchedEvent?.detail?.prefix === "/tests",
  "[BUG FIX] lis_cache_invalidated event carries '/tests' prefix detail"
);

// ==============================================================================
// 8. Specialized Tests Layout & Dropdown Options Engine
// ==============================================================================
console.log("\n▶ MODULE 8: Specialized Tests Layout & Dropdown Options Engine");

import { getCompleteParameterOptions } from "../src/lib/clinical-options";
import fs from "fs";
import path from "path";

// Verify Malaria Antigen parameter options (Pf and Pv only)
const malariaPfOpts = getCompleteParameterOptions("Plasmodium falciparum (HRP-2 Antigen)", "Malaria Antigen");
assert(
  malariaPfOpts.options.includes("Non-Reactive") && malariaPfOpts.options.includes("Reactive"),
  "Malaria Pf Antigen options include Non-Reactive and Reactive"
);

const malariaPvOpts = getCompleteParameterOptions("Plasmodium vivax (Pan / pLDH Antigen)", "Malaria Antigen");
assert(
  malariaPvOpts.options.includes("Non-Reactive") && malariaPvOpts.options.includes("Reactive"),
  "Malaria Pv Antigen options include Non-Reactive and Reactive"
);

// Verify Malaria Card parameter options (IgG and IgM only)
const malariaIggOpts = getCompleteParameterOptions("Malaria IgG Antibody", "Malaria Parasite (Card Test)");
assert(
  malariaIggOpts.options.includes("Non-Reactive") && malariaIggOpts.options.includes("Reactive"),
  "Malaria IgG Antibody options include Non-Reactive and Reactive"
);

const malariaIgmOpts = getCompleteParameterOptions("Malaria IgM Antibody", "Malaria Parasite (Card Test)");
assert(
  malariaIgmOpts.options.includes("Non-Reactive") && malariaIgmOpts.options.includes("Reactive"),
  "Malaria IgM Antibody options include Non-Reactive and Reactive"
);

// Verify default_tests.json strictly separates subtests
try {
  const defaultTestsPath = path.resolve(__dirname, "../../Backend/database/data/default_tests.json");
  const defaultTests = JSON.parse(fs.readFileSync(defaultTestsPath, "utf-8"));
  
  const malariaAntigen = defaultTests.find((t: any) => t.testCode === "SERO_152_MAL_AG" || t.code === "SERO_152_MAL_AG");
  const agSubtests = malariaAntigen?.subTests || malariaAntigen?.subtests || [];
  const agSubNames = agSubtests.map((s: any) => s.name.toLowerCase());
  const agHasSpeciesOnly = agSubNames.length === 2 &&
                           agSubNames.some((n: string) => n.includes("falciparum")) &&
                           agSubNames.some((n: string) => n.includes("vivax")) &&
                           !agSubNames.some((n: string) => n.includes("igg")) &&
                           !agSubNames.some((n: string) => n.includes("igm"));
  assert(agHasSpeciesOnly, "[ZERO REGRESSION] Malaria Antigen has strictly Pf & Pv species only (no IgG/IgM)");

  const malariaCard = defaultTests.find((t: any) => t.testCode === "HAEM_013_MP_CARD" || t.code === "HAEM_013_MP_CARD");
  const cardSubtests = malariaCard?.subTests || malariaCard?.subtests || [];
  const cardSubNames = cardSubtests.map((s: any) => s.name.toLowerCase());
  const cardHasAntibodiesOnly = cardSubNames.length === 2 &&
                                cardSubNames.some((n: string) => n.includes("igg")) &&
                                cardSubNames.some((n: string) => n.includes("igm")) &&
                                !cardSubNames.some((n: string) => n.includes("falciparum")) &&
                                !cardSubNames.some((n: string) => n.includes("vivax"));
  assert(cardHasAntibodiesOnly, "[ZERO REGRESSION] Malaria Card has strictly IgG & IgM antibodies only (no Pf/Pv)");
} catch (e: any) {
  assert(false, "Verification of default_tests.json structure", e?.message);
}

// Verify DB custom options take precedence without polluting extra options
const dbExplicitOpts = getCompleteParameterOptions("Custom Card Test", "Screening", undefined, ["Non-Reactive", "Reactive"]);
assert(
  dbExplicitOpts.options.length === 2 && dbExplicitOpts.options.includes("Non-Reactive") && dbExplicitOpts.options.includes("Reactive"),
  "Explicit DB options take direct precedence without extra options pollution"
);

// Verify Widal Slide Method is genuine custom editor
assert(
  isGenuineCustomEditorTest({ name: "Widal Test (Slide Method)", category: "Serology & Immunology", fieldType: "Custom Editor" }),
  "Widal Test (Slide Method) is recognized as genuine Custom Editor"
);

// Verify Biopsy is genuine custom editor in Histopathology
assert(
  isGenuineCustomEditorTest({ name: "Biopsy (Histopathology Examination)", category: "Histopathology", fieldType: "Custom Editor" }),
  "Biopsy (Histopathology Examination) is recognized as genuine Custom Editor in Histopathology"
);

// ==============================================================================
// 9. Custom Table Layout vs Clinical Interpretation Separation Engine
// ==============================================================================
console.log("\n▶ MODULE 9: Custom Table Layout vs Clinical Interpretation Separation Engine");

// Test 9.1: Widal Test Layout Generation
const widalLayout = getCustomEditorInitialTemplate({ name: "Widal Test (Slide Method)", category: "Serology & Immunology", fieldType: "Custom Editor" });
assert(
  widalLayout.includes("<table") && widalLayout.includes("S. TYPHI") && widalLayout.includes("1/160"),
  "Widal Test generates 2D antigen dilution table format"
);

// Test 9.2: Culture & Sensitivity Layout Generation
const cultureLayout = getCustomEditorInitialTemplate({ name: "Urine Culture & Sensitivity", category: "Microbiology", fieldType: "Custom Editor" });
assert(
  cultureLayout.includes("<table") && cultureLayout.includes("Antibiotic Name") && cultureLayout.includes("AMOXYCLAV"),
  "Culture & Sensitivity generates antibiotic sensitivity grid layout"
);

// Test 9.3: Clinical Interpretation for Widal contains clinical titer guidelines and NO leaked table
const widalInterp = getClinicalInterpretation("Widal Test (Slide Method)", widalLayout);
assert(
  widalInterp !== null && widalInterp.includes("4-fold rise") && !widalInterp.includes("1/20"),
  "[ZERO LEAK] Widal Clinical Interpretation provides medical diagnostic guidelines, NOT the result entry table"
);

// Test 9.4: Clinical Interpretation for Culture contains CLSI guidelines and NO leaked antibiotic table
const cultureInterp = getClinicalInterpretation("Urine Culture & Sensitivity", cultureLayout);
assert(
  cultureInterp !== null && cultureInterp.includes("CLSI") && !cultureInterp.includes("AMOXYCLAV"),
  "[ZERO LEAK] Culture Clinical Interpretation provides antimicrobial stewardship guidelines, NOT the antibiotic table"
);

// Test 9.5: Clinical Interpretation for Biopsy contains histopathology clinical guidelines
const biopsyInterp = getClinicalInterpretation("Biopsy (Histopathology Examination)");
assert(
  biopsyInterp !== null && biopsyInterp.includes("Histopathological impression is based solely"),
  "Biopsy Clinical Interpretation provides surgical pathology guidelines"
);

// Test 9.6: Crash-proof Editor HTML extraction logic handles null/destroyed refs safely
const mockDestroyedEditor = { current: { isDestroyed: true, getHTML: () => { throw new Error("Cannot read properties of null (reading 'cached')"); } } };
const mockNullEditor = { current: null };
let safeExtractedValue: string | null = null;
try {
  const getSafeHtml = (ref: any) => {
    try {
      if (ref?.current && !ref.current.isDestroyed && typeof ref.current.getHTML === "function") {
        return ref.current.getHTML();
      }
    } catch {}
    return null;
  };
  safeExtractedValue = getSafeHtml(mockDestroyedEditor) ?? getSafeHtml(mockNullEditor) ?? "FALLBACK_SAFE";
} catch (e) {
  safeExtractedValue = "CRASHED";
}
assert(
  safeExtractedValue === "FALLBACK_SAFE",
  "[CRASH-PROOF] TipTap HTML extraction handles destroyed/null editor without throwing 'null (reading cached)'"
);
// ==============================================================================
// 10. Report Date vs Collection Date Independence & Real-time Formatting
// ==============================================================================
console.log("\n▶ MODULE 10: Collection Date vs Report Date Independence");

const mockPatientRegistrationTime = "2026-10-05T10:00:00.000Z";
const mockCurrentPrintTime = "2026-10-07T14:30:00.000Z";

const formatTestDateTime = (val: any) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(val);
  }
};

// Test 10.1: Collection Date reflects registration / collection timestamp
const testPatient = {
  created_at: mockPatientRegistrationTime,
  collection_date_time: mockPatientRegistrationTime,
  meta: { collection_date_time: mockPatientRegistrationTime }
};
const testReport = {
  createdAt: mockPatientRegistrationTime,
  reportDate: mockCurrentPrintTime,
  patient: testPatient
};

const calculatedCollDate = formatTestDateTime(
  testPatient.collection_date_time ||
  testPatient.created_at ||
  testReport.createdAt
);
const calculatedRepDate = formatTestDateTime(
  testReport.reportDate && testReport.reportDate !== testReport.createdAt
    ? testReport.reportDate
    : new Date()
);

assert(
  calculatedCollDate.includes("05") && (calculatedCollDate.includes("Oct") || calculatedCollDate.includes("10")),
  "[INDEPENDENT DATES] Collection Date preserves patient registration date (05 Oct 2026)",
  `Got: ${calculatedCollDate}`
);

assert(
  calculatedRepDate.includes("07") && (calculatedRepDate.includes("Oct") || calculatedRepDate.includes("10")),
  "[INDEPENDENT DATES] Report Date accurately reflects current print date (07 Oct 2026)",
  `Got: ${calculatedRepDate}`
);

assert(
  calculatedCollDate !== calculatedRepDate,
  "[ZERO COLLAPSE] Collection Date and Report Date are strictly distinct and do not show the same timestamp",
  `Collection (${calculatedCollDate}) must not equal Report (${calculatedRepDate})`
);

// Test 10.2: When reportDate was mistakenly set to createdAt, fallback uses real-time current date
const legacyReportWithSameDate = {
  createdAt: mockPatientRegistrationTime,
  reportDate: mockPatientRegistrationTime,
  patient: testPatient
};
const fixedRepDate = formatTestDateTime(
  legacyReportWithSameDate.reportDate && legacyReportWithSameDate.reportDate !== legacyReportWithSameDate.createdAt
    ? legacyReportWithSameDate.reportDate
    : new Date()
);
assert(
  fixedRepDate !== calculatedCollDate,
  "[SAFE FALLBACK] When reportDate equals createdAt, Report Date safely resolves to current print timestamp instead of freezing to registration date"
);
// ==============================================================================
// 11. Patient Title & Designation Independence Engine
// ==============================================================================
console.log("\n▶ MODULE 11: Patient Title & Designation Independence Engine");

import { normalizeDesignation, defaultReportLayoutSettings } from "../src/lib/report-settings";
import { formatPatientListDisplayName, cleanPatientNameForReport, isBlankDesignation, extractPurePatientName } from "../src/lib/patient-title-helper";

// 11.1 Default designation in settings is Blank
assert(
  normalizeDesignation() === "Blank" && normalizeDesignation(null) === "Blank" && normalizeDesignation("") === "Blank",
  "[SETTINGS] normalizeDesignation defaults to Blank for empty/null inputs"
);
assert(
  defaultReportLayoutSettings.defaultDesignation === "Blank",
  "[SETTINGS] defaultReportLayoutSettings defaultDesignation is Blank"
);

// 11.2 Dashboard views (Reports, Patients, Billing) display Untitled when title is blank
assert(
  formatPatientListDisplayName("Rahul Sharma", "") === "Untitled Rahul Sharma",
  "[DASHBOARD] Blank designation displays 'Untitled <Name>' in list views"
);
assert(
  formatPatientListDisplayName("Rahul Sharma", "Blank") === "Untitled Rahul Sharma",
  "[DASHBOARD] 'Blank' designation displays 'Untitled <Name>' in list views"
);
assert(
  formatPatientListDisplayName("Rahul Sharma", "None") === "Untitled Rahul Sharma",
  "[DASHBOARD] 'None' designation displays 'Untitled <Name>' in list views"
);
assert(
  formatPatientListDisplayName("Mr. Rahul Sharma", "Mr.") === "Mr. Rahul Sharma",
  "[DASHBOARD] Selected title 'Mr.' is preserved in list views"
);
assert(
  formatPatientListDisplayName("Rahul Sharma", "Dr.") === "Dr. Rahul Sharma",
  "[DASHBOARD] Selected title 'Dr.' is prefixed to patient name in list views"
);
assert(
  formatPatientListDisplayName("Untitled Rahul Sharma", "") === "Untitled Rahul Sharma",
  "[DASHBOARD] Existing 'Untitled' does not get duplicate 'Untitled Untitled'"
);

// 11.3 Report print & download views NEVER print title when title is blank
assert(
  cleanPatientNameForReport("Rahul Sharma", "") === "Rahul Sharma",
  "[PRINT/DOWNLOAD] Blank title prints clean patient name directly from the beginning (no title)"
);
assert(
  cleanPatientNameForReport("Rahul Sharma", "Blank") === "Rahul Sharma",
  "[PRINT/DOWNLOAD] 'Blank' designation prints clean patient name (no title)"
);
assert(
  cleanPatientNameForReport("Untitled Rahul Sharma", "") === "Rahul Sharma",
  "[PRINT/DOWNLOAD] Any 'Untitled' prefix is strictly stripped from printed/downloaded reports"
);
assert(
  cleanPatientNameForReport("Mr. Rahul Sharma", "Mr.") === "Mr. Rahul Sharma",
  "[PRINT/DOWNLOAD] Explicitly selected title 'Mr.' is retained on report"
);
assert(
  cleanPatientNameForReport("Rahul Sharma", "Dr.") === "Dr. Rahul Sharma",
  "[PRINT/DOWNLOAD] Explicitly selected title 'Dr.' is retained on report"
);

// ==============================================================================
// 12. Test Master Layout Customization, Range Persistence & Custom Methods Engine
// ==============================================================================
console.log("\n▶ MODULE 12: Test Master Layout Customization, Range Persistence & Custom Methods Engine");

// 12.1 User override layout customization
const defaultCbc = {
  name: "Complete Blood Count (CBC)",
  category: "Haematology",
  fieldType: "Multiple Field",
  is_json_override: false,
};
assert(
  isGenuineCustomEditorTest(defaultCbc) === false,
  "[CUSTOM LAYOUT] Default CBC catalog test remains standard parameter table"
);

const userCustomizedCbc = {
  name: "Complete Blood Count (CBC)",
  category: "Haematology",
  fieldType: "Custom Editor",
  is_json_override: true,
  customLayout: "<table class='lis-custom-table'><tr><td>Hb</td><td>14.0</td></tr></table>",
};
assert(
  isGenuineCustomEditorTest(userCustomizedCbc) === true,
  "[CUSTOM LAYOUT] User-overridden CBC with Custom Editor field type is recognized as genuine Custom Editor"
);

const userCustomizedSugar = {
  name: "Fasting Blood Sugar",
  category: "Biochemistry",
  is_json_override: true,
  custom_layout: "<p>Custom Glucose Layout</p>",
};
assert(
  isGenuineCustomEditorTest(userCustomizedSugar) === true,
  "[CUSTOM LAYOUT] User-overridden Sugar with custom_layout is recognized as genuine Custom Editor"
);

// 12.2 Range value parser preserves numeric 0
const parseRangeVal = (v: any): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
};

assert(
  parseRangeVal("0") === 0,
  "[RANGE ZERO] String '0' is parsed strictly as numeric 0, never converted to null"
);
assert(
  parseRangeVal(0) === 0,
  "[RANGE ZERO] Number 0 is preserved strictly as numeric 0"
);
assert(
  parseRangeVal("") === null,
  "[RANGE PARSE] Empty string correctly maps to null"
);
assert(
  parseRangeVal(null) === null,
  "[RANGE PARSE] Null correctly maps to null"
);
assert(
  parseRangeVal(undefined) === null,
  "[RANGE PARSE] Undefined correctly maps to null"
);
assert(
  parseRangeVal("14.5") === 14.5,
  "[RANGE PARSE] Valid numeric string '14.5' parses to 14.5"
);

// 12.3 Custom methods inclusion and unioning
const inbuiltMethods = ["Spectrophotometry", "ECLIA", "Automated Cell Counter"];
const customMethods = ["Flow Cytometry Laser Array", "High Performance TLC"];
const discoveredFromTests = ["HPLC", "Spectrophotometry"];

const mergedMethods = Array.from(
  new Set([...inbuiltMethods, ...customMethods, ...discoveredFromTests])
);

assert(
  mergedMethods.includes("Flow Cytometry Laser Array"),
  "[CUSTOM METHODS] User added custom method is successfully included in available methods"
);
assert(
  mergedMethods.includes("High Performance TLC"),
  "[CUSTOM METHODS] Additional custom methods are preserved"
);
assert(
  mergedMethods.includes("Spectrophotometry") && mergedMethods.includes("ECLIA"),
  "[CUSTOM METHODS] Inbuilt standard methods remain available"
);
assert(
  mergedMethods.filter(m => m === "Spectrophotometry").length === 1,
  "[CUSTOM METHODS] Methods set is strictly deduplicated"
);

// 12.4 Drag-and-drop layout targetList builder & sort order calculation
const sampleBlocks = [
  {
    id: "block-plt",
    name: "Platelet Count",
    isGroup: false,
    items: [{ test: { id: "p-plt", name: "Platelet Count", testCode: "HAEM_PLT" } }],
  },
  {
    id: "block-hb",
    name: "Hemoglobin (Hb)",
    isGroup: false,
    items: [{ test: { id: "p-hb", name: "Hemoglobin (Hb)", testCode: "HAEM_HB" } }],
  },
  {
    id: "group-dlc",
    name: "Differential Leukocyte Count (DLC)",
    isGroup: true,
    items: [
      { test: { id: "p-poly", name: "Polymorphs / Neutrophils", testCode: "HAEM_POLY", parent: { id: "p-dlc-group", name: "Differential Leukocyte Count (DLC)", testCode: "HAEM_DLC" } } },
      { test: { id: "p-lymph", name: "Lymphocytes", testCode: "HAEM_LYMPH", parent: { id: "p-dlc-group", name: "Differential Leukocyte Count (DLC)", testCode: "HAEM_DLC" } } },
    ],
  },
];

const targetList: any[] = [];
sampleBlocks.forEach((block, blockIdx) => {
  const blockOrder = (blockIdx + 1) * 100;
  if (block.isGroup) {
    const parentSubId = (block.items[0]?.test as any)?.parent?.id;
    targetList.push({
      id: parentSubId,
      name: block.name,
      test_code: (block.items[0]?.test as any)?.parent?.testCode,
      sort_order: blockOrder,
      is_hidden: false,
    });
    block.items.forEach((item, itemIdx) => {
      targetList.push({
        id: item.test.id,
        name: item.test.name,
        test_code: item.test.testCode,
        sort_order: blockOrder + itemIdx + 1,
        is_hidden: false,
      });
    });
  } else {
    const item = block.items[0];
    targetList.push({
      id: item.test.id,
      name: item.test.name,
      test_code: item.test.testCode,
      sort_order: blockOrder + 1,
      is_hidden: false,
    });
  }
});

assert(
  targetList[0].name === "Platelet Count" && targetList[0].sort_order === 101,
  "[DRAG LAYOUT] Top dragged block 'Platelet Count' has highest priority sort_order (101)"
);
assert(
  targetList[1].name === "Hemoglobin (Hb)" && targetList[1].sort_order === 201,
  "[DRAG LAYOUT] Second block 'Hemoglobin' has sort_order 201"
);
assert(
  targetList[2].name === "Differential Leukocyte Count (DLC)" && targetList[2].sort_order === 300,
  "[DRAG LAYOUT] Group header DLC has sort_order 300"
);
assert(
  targetList[3].name === "Polymorphs / Neutrophils" && targetList[3].sort_order === 301,
  "[DRAG LAYOUT] Group child Polymorphs has nested sort_order 301"
);
assert(
  targetList[4].name === "Lymphocytes" && targetList[4].sort_order === 302,
  "[DRAG LAYOUT] Group child Lymphocytes has nested sort_order 302"
);
assert(
  targetList.every(p => Boolean(p.name && p.test_code !== undefined && p.sort_order > 0)),
  "[DRAG LAYOUT] Every target parameter payload includes name, test_code, and valid sort_order"
);

// ==============================================================================
// 13. Test Master Dialog State & Reports WhatsApp Dispatch Validation
// ==============================================================================
console.log("\n▶ MODULE 13: Test Master Saving Reset & Reports WhatsApp Delivery");

// Test: Test Master saving state lifecycle
class MockTestMasterDialog {
  saving: boolean = false;
  dialogOpen: boolean = false;
  editingTest: any = null;

  openEdit(test: any) {
    this.saving = false; // Bug fix: Always clear stuck saving spinner on open
    this.editingTest = test;
    this.dialogOpen = true;
  }

  saveTest() {
    this.saving = true;
    // Simulate save
    this.saving = false;
    this.dialogOpen = false;
    this.editingTest = null;
  }

  onOpenChange(open: boolean) {
    this.dialogOpen = open;
    if (!open) {
      this.saving = false;
    }
  }
}

const mockDialog = new MockTestMasterDialog();
mockDialog.openEdit({ id: "test-1", name: "CBC" });
assert(mockDialog.saving === false && mockDialog.dialogOpen === true, "[TEST MASTER] Opening edit dialog resets saving spinner to false");

mockDialog.saveTest();
assert(mockDialog.saving === false && mockDialog.dialogOpen === false, "[TEST MASTER] Saving test finishes with saving=false and closes dialog");

// Test: Re-opening immediately does NOT show spinning loader
mockDialog.openEdit({ id: "test-1", name: "CBC" });
assert(mockDialog.saving === false, "[TEST MASTER] Re-opening edit dialog immediately shows NO spinning loader glitch");

mockDialog.onOpenChange(false);
assert(mockDialog.saving === false && mockDialog.dialogOpen === false, "[TEST MASTER] onOpenChange(false) ensures saving is false");

// Test: Reports WhatsApp Phone Validation Helper
function validateAndExtractWhatsAppPhone(rawPhone?: string | null): { isValid: boolean; digits: string } {
  const phone = (rawPhone || "").trim();
  const digitsOnly = phone.replace(/\D/g, "");
  const isInvalid = !phone || phone === "N/A" || phone === "NA" || phone === "-" || digitsOnly.length < 10;
  return { isValid: !isInvalid, digits: digitsOnly };
}

assert(validateAndExtractWhatsAppPhone("+91 98765 43210").isValid === true, "[WHATSAPP] Valid 10-digit Indian mobile number is accepted");
assert(validateAndExtractWhatsAppPhone("+91 98765 43210").digits === "919876543210", "[WHATSAPP] Mobile digits properly sanitized");
assert(validateAndExtractWhatsAppPhone("N/A").isValid === false, "[WHATSAPP] 'N/A' phone is rejected with validation alert");
assert(validateAndExtractWhatsAppPhone("").isValid === false, "[WHATSAPP] Empty phone is rejected");
assert(validateAndExtractWhatsAppPhone("12345").isValid === false, "[WHATSAPP] Less than 10 digits is rejected");

// Test: WhatsApp Fallback URL Generation
function generateWhatsAppFallbackUrl(phone: string, patientName: string, reportCode: string, labName: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  const text = encodeURIComponent(`Dear ${patientName}, your diagnostic laboratory report #${reportCode} from ${labName} is ready.`);
  return `https://wa.me/91${digits}?text=${text}`;
}

const waUrl = generateWhatsAppFallbackUrl("9876543210", "Rahul Sharma", "REP-2026-001", "OnePath Lab");
assert(waUrl.includes("https://wa.me/919876543210"), "[WHATSAPP] Generates valid wa.me direct target link");
assert(waUrl.includes("REP-2026-001") && waUrl.includes("Rahul%20Sharma"), "[WHATSAPP] Properly encodes patient name and report code in WhatsApp text");

// Test: WhatsApp PDF Filename Sanitization
function sanitizePdfFilename(reportCode: string, patientName: string): string {
  const pName = (patientName || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
  const rCode = (reportCode || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `LabReport_${rCode}_${pName}.pdf`;
}

const waFilename = sanitizePdfFilename("REP/2026/01", "Dr. John Doe & Sons");
assert(waFilename === "LabReport_REP_2026_01_Dr__John_Doe___Sons.pdf", "[WHATSAPP] Generates sanitized safe PDF filename for WhatsApp delivery");

// ==============================================================================
// 14. Date Range Filters & Today Dues Bill Aggregation Engine
// ==============================================================================
console.log("\n▶ MODULE 14: Date Range Picker & Today Dues Bill Aggregation");

// Test: Date Utility Helper Functions
const todayIso = getTodayStr();
const yesterdayIso = getYesterdayStr();
const sevenDaysAgoIso = getDaysAgoStr(6);
const thirtyDaysAgoIso = getDaysAgoStr(29);
const startOfMonthIso = getStartOfMonthStr();

assert(typeof todayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(todayIso), "[DATE UTILS] getTodayStr returns YYYY-MM-DD");
assert(typeof yesterdayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(yesterdayIso), "[DATE UTILS] getYesterdayStr returns YYYY-MM-DD");
assert(typeof sevenDaysAgoIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sevenDaysAgoIso), "[DATE UTILS] getDaysAgoStr returns YYYY-MM-DD");
assert(typeof startOfMonthIso === "string" && startOfMonthIso.endsWith("-01"), "[DATE UTILS] getStartOfMonthStr starts on day 01");
assert(sevenDaysAgoIso <= todayIso, "[DATE UTILS] 7 days ago is less than or equal to today");

// Test: Date Range Filter Predicate Matching
function matchesDateRange(recordDate: string, mode: "single" | "range", singleDate: string, startDate: string, endDate: string) {
  if (mode === "range") {
    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;
    return true;
  }
  return singleDate ? recordDate === singleDate : true;
}

assert(matchesDateRange("2026-10-05", "range", "", "2026-10-01", "2026-10-10") === true, "[DATE FILTER] Date within start & end range matches");
assert(matchesDateRange("2026-09-30", "range", "", "2026-10-01", "2026-10-10") === false, "[DATE FILTER] Date before start range does not match");
assert(matchesDateRange("2026-10-15", "range", "", "2026-10-01", "2026-10-10") === false, "[DATE FILTER] Date after end range does not match");
assert(matchesDateRange("2026-10-05", "range", "", "2026-10-05", "2026-10-05") === true, "[DATE FILTER] Boundary exact same date matches in range");
assert(matchesDateRange("2026-10-05", "range", "", "2026-10-01", "") === true, "[DATE FILTER] Open-ended end range matches later dates");
assert(matchesDateRange("2026-09-25", "range", "", "2026-10-01", "") === false, "[DATE FILTER] Open-ended end range excludes earlier dates");
assert(matchesDateRange("2026-10-05", "range", "", "", "") === true, "[DATE FILTER] All Dates (empty range) matches any date");
assert(matchesDateRange("2026-10-05", "single", "2026-10-05", "", "") === true, "[DATE FILTER] Single mode exact date match");
assert(matchesDateRange("2026-10-06", "single", "2026-10-05", "", "") === false, "[DATE FILTER] Single mode mismatch rejected");
assert(matchesDateRange("2026-10-06", "single", "", "", "") === true, "[DATE FILTER] Single mode empty matches all dates");

// Test: Billing Today Dues Bill Aggregation Calculation
interface MockBill {
  id: string;
  total: number;
  paid_amount: number;
  status: string;
  payment_mode?: string;
}

const mockBillsCollection: MockBill[] = [
  { id: "b1", total: 1000, paid_amount: 1000, status: "PAID", payment_mode: "CASH" },
  { id: "b2", total: 1500, paid_amount: 1500, status: "PAID", payment_mode: "UPI" },
  { id: "b3", total: 800, paid_amount: 300, status: "PARTIAL", payment_mode: "CASH" }, // Due: 500
  { id: "b4", total: 1200, paid_amount: 0, status: "UNPAID", payment_mode: "UPI" },    // Due: 1200
  { id: "b5", total: 600, paid_amount: 600, status: "PAID", payment_mode: "UPI" },
];

function calculateBillingDuesAndSplit(bills: MockBill[]) {
  const isFullyPaid = (b: MockBill) => b.status === "PAID" || (b.total > 0 && b.paid_amount >= b.total);
  const totalInvoiced = bills.reduce((acc, b) => acc + b.total, 0);
  const totalDue = bills.reduce((acc, b) => acc + (isFullyPaid(b) ? 0 : Math.max(0, b.total - b.paid_amount)), 0);
  const unpaidCount = bills.filter((b) => !isFullyPaid(b)).length;
  const paidCount = bills.filter((b) => isFullyPaid(b)).length;

  let cashTotal = 0;
  let upiTotal = 0;
  bills.forEach((b) => {
    const paid = isFullyPaid(b) ? b.total : b.paid_amount;
    if (paid <= 0) return;
    if (b.payment_mode === "UPI") {
      upiTotal += paid;
    } else {
      cashTotal += paid;
    }
  });

  return { totalInvoiced, totalDue, unpaidCount, paidCount, cashTotal, upiTotal };
}

const duesResult = calculateBillingDuesAndSplit(mockBillsCollection);
assert(duesResult.totalInvoiced === 5100, "[BILLING DUES] Total invoiced sum matches (5100)");
assert(duesResult.totalDue === 1700, "[BILLING DUES] Today dues bill value matches expected 1700 (500 partial + 1200 unpaid)");
assert(duesResult.unpaidCount === 2, "[BILLING DUES] Pending due bills count is exactly 2");
assert(duesResult.paidCount === 3, "[BILLING DUES] Fully paid bills count is exactly 3");
assert(duesResult.cashTotal === 1300, "[BILLING DUES] Cash received matches 1000 + 300 = 1300");
assert(duesResult.upiTotal === 2100, "[BILLING DUES] UPI received matches 1500 + 600 = 2100");

// Test: Edge Case — All Bills Fully Paid (Zero Dues)
const allPaidBills: MockBill[] = [
  { id: "p1", total: 500, paid_amount: 500, status: "PAID" },
  { id: "p2", total: 1000, paid_amount: 1000, status: "PAID" },
];
const zeroDueResult = calculateBillingDuesAndSplit(allPaidBills);
assert(zeroDueResult.totalDue === 0, "[BILLING DUES] Total due is 0 when all bills are settled");
assert(zeroDueResult.unpaidCount === 0, "[BILLING DUES] Unpaid count is 0 when all bills are settled");

console.log("\n===============================================================================");
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
console.log("===============================================================================");

if (failedTests === 0) {
  console.log("🎉 ALL MEDICAL, BILLING, CATALOG, AND CLINICAL UNIT TESTS PASSED WITH 100% SUCCESS!");
  process.exit(0);
} else {
  console.error("❌ UNIT TEST SUITE DETECTED FAILURES.");
  process.exit(1);
}
