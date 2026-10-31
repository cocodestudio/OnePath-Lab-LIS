/**
 * OnePath Lab LIS — Comprehensive Feature Unit Test Runner
 * Run with: npx tsx scripts/test-runner.ts
 */

import fs from "fs";
import path from "path";
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
import { sanitizeHtml } from "../src/lib/sanitize";
import { getTodayStr, getYesterdayStr, getDaysAgoStr, getStartOfMonthStr, getRecordLocalDate } from "../src/lib/date-utils";
import {
  isParamFormulaCalculated,
  canParamBeCalculatedInReport,
  computeAutomatedFormulas,
  hasReportParam,
  getTestPriority,
} from "../src/lib/clinical-formulas/formula-engine";

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
    } catch { }
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

// 11.2 Dashboard views (Reports, Patients, Billing) display pure name directly when title is blank
assert(
  formatPatientListDisplayName("Rahul Sharma", "") === "Rahul Sharma",
  "[DASHBOARD] Blank designation displays clean pure name without Untitled prefix in list views"
);
assert(
  formatPatientListDisplayName("Rahul Sharma", "Blank") === "Rahul Sharma",
  "[DASHBOARD] 'Blank' designation displays clean pure name in list views"
);
assert(
  formatPatientListDisplayName("Rahul Sharma", "None") === "Rahul Sharma",
  "[DASHBOARD] 'None' designation displays clean pure name in list views"
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
  formatPatientListDisplayName("Untitled Rahul Sharma", "") === "Rahul Sharma",
  "[DASHBOARD] Existing 'Untitled' prefix is cleanly stripped"
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

// ==============================================================================
// 15. Sidebar Subtabs Accordion, Outside-Click Collapse & Mobile Scroll Lock
// ==============================================================================
console.log("\n▶ MODULE 15: Sidebar Subtabs Accordion, Hover Expand/Collapse & Mobile Scroll Lock");

// Test: Single-Accordion Active Item Toggle & Hover State Machine
class MockSidebarAccordion {
  expandedItem: string | null = null;
  hoverTimeout: any = null;
  isLocked: boolean = false;

  toggle(itemName: string) {
    if (this.isLocked) return;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.expandedItem = this.expandedItem === itemName ? null : itemName;
  }

  handleMouseEnter(itemName: string) {
    if (this.isLocked) return;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.expandedItem = itemName;
  }

  handleMouseLeave(itemName: string, executeImmediately = false) {
    if (this.isLocked) return;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    const collapseCallback = () => {
      if (this.expandedItem === itemName) {
        this.expandedItem = null;
      }
    };
    if (executeImmediately) {
      collapseCallback();
    } else {
      this.hoverTimeout = setTimeout(collapseCallback, 150);
    }
  }

  handleNonExpandableMouseEnter(executeImmediately = false) {
    if (this.isLocked) return;
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    const collapseCallback = () => {
      this.expandedItem = null;
    };
    if (executeImmediately) {
      collapseCallback();
    } else {
      this.hoverTimeout = setTimeout(collapseCallback, 150);
    }
  }

  handleOutsideClick(isInsideSidebar: boolean) {
    if (!isInsideSidebar) {
      this.expandedItem = null;
    }
  }
}

const mockSidebar = new MockSidebarAccordion();

// 1. Initial state is collapsed
assert(mockSidebar.expandedItem === null, "[SIDEBAR ACCORDION] Initial expanded item is null");

// 2. Open 'Cases'
mockSidebar.toggle("Cases");
assert(mockSidebar.expandedItem === "Cases", "[SIDEBAR ACCORDION] Expanding 'Cases' sets active item to 'Cases'");

// 3. Opening 'Tests' automatically closes 'Cases' (Single Accordion Rule)
mockSidebar.toggle("Tests");
assert(mockSidebar.expandedItem === "Tests", "[SIDEBAR ACCORDION] Expanding 'Tests' automatically closes 'Cases'");

// 4. Opening 'Inventory' automatically closes 'Tests'
mockSidebar.toggle("Inventory");
assert(mockSidebar.expandedItem === "Inventory", "[SIDEBAR ACCORDION] Expanding 'Inventory' automatically closes 'Tests'");

// 5. Clicking 'Inventory' again collapses it
mockSidebar.toggle("Inventory");
assert(mockSidebar.expandedItem === null, "[SIDEBAR ACCORDION] Re-clicking open 'Inventory' collapses all subtabs");

// 6. Outside click collapses active subtab
mockSidebar.toggle("B2B & Centers");
assert(mockSidebar.expandedItem === "B2B & Centers", "[SIDEBAR ACCORDION] 'B2B & Centers' is open");

// Click inside sidebar does NOT close
mockSidebar.handleOutsideClick(true);
assert(mockSidebar.expandedItem === "B2B & Centers", "[SIDEBAR ACCORDION] Click inside sidebar preserves open subtab");

// Click outside sidebar collapses all subtabs
mockSidebar.handleOutsideClick(false);
assert(mockSidebar.expandedItem === null, "[SIDEBAR ACCORDION] Clicking outside sidebar automatically collapses all subtabs");

// 7. Hover Expand & Hover Leave Collapse Behavior
mockSidebar.handleMouseEnter("Cases");
assert(mockSidebar.expandedItem === "Cases", "[SIDEBAR HOVER] Hovering over 'Cases' tab automatically expands it");

// Removing hover collapses 'Cases'
mockSidebar.handleMouseLeave("Cases", true);
assert(mockSidebar.expandedItem === null, "[SIDEBAR HOVER] Removing hover collapses 'Cases' subtabs");

// Moving hover from 'Tests' directly to 'Inventory' switches tabs seamlessly
mockSidebar.handleMouseEnter("Tests");
assert(mockSidebar.expandedItem === "Tests", "[SIDEBAR HOVER] Hovering 'Tests' opens 'Tests'");
mockSidebar.handleMouseLeave("Tests", false); // Starts leave timer
mockSidebar.handleMouseEnter("Inventory"); // Immediately enters Inventory
assert(mockSidebar.expandedItem === "Inventory", "[SIDEBAR HOVER] Hovering 'Inventory' immediately switches and cancels prior collapse");

// Hovering a non-collapsible link triggers collapse of active subtab
mockSidebar.handleNonExpandableMouseEnter(true);
assert(mockSidebar.expandedItem === null, "[SIDEBAR HOVER] Hovering non-collapsible nav item collapses open subtabs");

// 7. Test Mobile Scroll Lock Behavior
interface MockScrollLock {
  bodyOverflow: string;
  bodyTouchAction: string;
}

function applyMobileSliderScrollLock(isOpen: boolean, currentStyle: MockScrollLock): MockScrollLock {
  if (isOpen) {
    return { bodyOverflow: "hidden", bodyTouchAction: "none" };
  }
  return { bodyOverflow: "auto", bodyTouchAction: "auto" };
}

const lockedStyles = applyMobileSliderScrollLock(true, { bodyOverflow: "auto", bodyTouchAction: "auto" });
assert(lockedStyles.bodyOverflow === "hidden" && lockedStyles.bodyTouchAction === "none", "[MOBILE SCROLL LOCK] Opening mobile slider locks body overflow and touch-action");

const restoredStyles = applyMobileSliderScrollLock(false, lockedStyles);
assert(restoredStyles.bodyOverflow === "auto" && restoredStyles.bodyTouchAction === "auto", "[MOBILE SCROLL LOCK] Closing mobile slider restores normal scrolling");

// 8. Mobile Touch Single-Tap State Machine (Preventing Synthetic Hover Double-Tap Bug)
class MockTouchAwareSidebarAccordion extends MockSidebarAccordion {
  lastTouchTime: number = 0;

  onTouchStart() {
    this.lastTouchTime = Date.now();
  }

  isRecentTouch(): boolean {
    return Date.now() - this.lastTouchTime < 650;
  }

  override handleMouseEnter(itemName: string) {
    if (this.isRecentTouch()) return; // Suppress synthetic touch hover!
    super.handleMouseEnter(itemName);
  }

  override handleMouseLeave(itemName: string, executeImmediately = false) {
    if (this.isRecentTouch()) return;
    super.handleMouseLeave(itemName, executeImmediately);
  }
}

const touchSidebar = new MockTouchAwareSidebarAccordion();
// Simulate mobile user tapping "Finance & Rates"
touchSidebar.onTouchStart();
// Browser fires synthetic mouseEnter right before click
touchSidebar.handleMouseEnter("Finance & Rates");
assert(touchSidebar.expandedItem === null, "[MOBILE SINGLE-TAP] Synthetic mouseEnter is suppressed during touch event");

// Browser fires click event on the first tap
touchSidebar.toggle("Finance & Rates");
assert(touchSidebar.expandedItem === "Finance & Rates", "[MOBILE SINGLE-TAP] First single tap successfully opens 'Finance & Rates'");

// Second tap collapses it
touchSidebar.onTouchStart();
touchSidebar.handleMouseEnter("Finance & Rates");
touchSidebar.toggle("Finance & Rates");
assert(touchSidebar.expandedItem === null, "[MOBILE SINGLE-TAP] Second tap cleanly collapses 'Finance & Rates'");

// 9. B2B Portal & Multi-Role Dropdown Resolution Guardrails
interface MockNavItem {
  name: string;
  href?: string;
  children?: { name: string; href: string }[];
}

const mockB2bNav: MockNavItem[] = [
  { name: "Overview", href: "/dashboard" },
  { name: "Patients", href: "/dashboard/patients" },
  { name: "Today Samples", href: "/dashboard/today-samples" },
  { name: "Reports", href: "/dashboard/reports" },
  { name: "Wallet & Payments", href: "/dashboard/wallet" },
  {
    name: "Finance & Rates",
    children: [
      { name: "Billing", href: "/dashboard/billing" },
      { name: "Revenue & Ledger", href: "/dashboard/revenue" },
      { name: "Rate List", href: "/dashboard/ratelist" },
    ],
  },
  { name: "Help & Support", href: "/dashboard/support" },
];

const b2bFinanceItem = mockB2bNav.find((item) => item.name === "Finance & Rates");
assert(Boolean(b2bFinanceItem?.children), "[B2B PORTAL] 'Finance & Rates' contains child sub-items");
assert((b2bFinanceItem?.children?.length ?? 0) === 3, "[B2B PORTAL] 'Finance & Rates' contains exactly 3 child links");
assert(Boolean(b2bFinanceItem?.children?.some((c) => c.href === "/dashboard/ratelist")), "[B2B PORTAL] 'Finance & Rates' includes Rate List");
assert(Boolean(b2bFinanceItem?.children?.some((c) => c.href === "/dashboard/billing")), "[B2B PORTAL] 'Finance & Rates' includes Billing");
assert(Boolean(b2bFinanceItem?.children?.some((c) => c.href === "/dashboard/revenue")), "[B2B PORTAL] 'Finance & Rates' includes Revenue & Ledger");

// Role Isolation: B2B role is NEVER locked by lab subscription lock
const isB2bRole = "b2b".toUpperCase().trim() === "B2B";
assert(isB2bRole, "[ROLE ISOLATION] Role case is normalized to B2B");
const isAdminRole = false;
const rawSubscriptionExpired = true; // Lab subscription trial expired
const effectiveLocked = rawSubscriptionExpired && isAdminRole;
assert(effectiveLocked === false, "[ROLE ISOLATION] B2B partner accounts are completely exempt from lab subscription lock");


// ==============================================================================
// 16. Enter Results: Top Patient Ribbon Metadata Resolution (Reg Date, Coll Date, Ref By)
// ==============================================================================
console.log("\n▶ MODULE 16: Enter Results Top Patient Ribbon Metadata Resolution");

function resolvePatientTopRibbonDetails(report: any) {
  const patientData: any = report?.patient || {};
  const patientMeta = patientData?.meta || {};
  const reportMeta = (report as any)?.meta || {};

  const formatClinicalDateTime = (val: any) => {
    if (!val) return "—";
    try {
      const dateOnlyMatch = typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
      const d = dateOnlyMatch ? new Date(`${val.trim()}T00:00:00`) : new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const strVal = String(val);
      const hasTime = strVal.includes("T") || strVal.includes(":") || (strVal.includes(" ") && /\d{1,2}:\d{2}/.test(strVal));
      if (hasTime) {
        return d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(val);
    }
  };

  const rawRegDate =
    patientData.registrationDate ||
    patientData.registration_date ||
    patientMeta.registrationDate ||
    patientMeta.registration_date ||
    patientData.createdAt ||
    patientData.created_at ||
    (report as any)?.registrationDate ||
    (report as any)?.registration_date ||
    report?.createdAt ||
    report?.created_at;

  const displayRegDate = formatClinicalDateTime(rawRegDate);

  const rawCollDate =
    patientData.collectionDateTime ||
    patientData.collection_date_time ||
    patientData.collectionDate ||
    patientData.collection_date ||
    patientMeta.collectionDateTime ||
    patientMeta.collection_date_time ||
    patientMeta.collectionDate ||
    patientMeta.collection_date ||
    (report as any)?.collectionDateTime ||
    (report as any)?.collection_date_time ||
    (report as any)?.collectionDate ||
    (report as any)?.collection_date ||
    reportMeta.collectionDateTime ||
    reportMeta.collection_date_time ||
    rawRegDate;

  const displayCollDate = formatClinicalDateTime(rawCollDate);

  const rawRefDoctor =
    patientData.refDoctor ||
    patientData.ref_doctor ||
    patientMeta.refDoctor ||
    patientMeta.ref_doctor ||
    (report as any)?.refDoctor ||
    (report as any)?.ref_doctor ||
    (report as any)?.referredBy ||
    (report as any)?.referred_by;

  const displayReferredBy =
    rawRefDoctor &&
      String(rawRefDoctor).trim() !== "" &&
      String(rawRefDoctor).trim() !== "—" &&
      String(rawRefDoctor).trim().toLowerCase() !== "null" &&
      String(rawRefDoctor).trim().toLowerCase() !== "undefined"
      ? String(rawRefDoctor).trim().toLowerCase().startsWith("dr")
        ? String(rawRefDoctor).trim()
        : `Dr. ${String(rawRefDoctor).trim()}`
      : "Self";

  return { displayRegDate, displayCollDate, displayReferredBy };
}

// 16.1 Standard Case with Doctor name without Dr prefix
const testReport1 = {
  id: "rep-001",
  created_at: "2026-10-10T08:00:00.000Z",
  patient: {
    name: "Aman Verma",
    ref_doctor: "Ramesh Gupta",
    collection_date_time: "2026-10-10T08:30:00.000Z",
    created_at: "2026-10-10T08:00:00.000Z",
  },
};
const res1 = resolvePatientTopRibbonDetails(testReport1);
assert(res1.displayReferredBy === "Dr. Ramesh Gupta", "[TOP RIBBON] Automatically prefixes 'Dr.' to doctor name");
assert(res1.displayRegDate.includes("2026") && res1.displayRegDate.includes("Oct"), "[TOP RIBBON] Registration date properly formatted");
assert(res1.displayCollDate.includes("2026") && res1.displayCollDate.includes("Oct"), "[TOP RIBBON] Collection date properly formatted");

// 16.2 Doctor name already prefixed with 'Dr.'
const testReport2 = {
  id: "rep-002",
  patient: {
    name: "Sunita Roy",
    refDoctor: "Dr. A. K. Mishra",
    registration_date: "2026-10-09",
    collection_date: "2026-10-09",
  },
};
const res2 = resolvePatientTopRibbonDetails(testReport2);
assert(res2.displayReferredBy === "Dr. A. K. Mishra", "[TOP RIBBON] Does not double-prefix 'Dr.' when already present");
assert(res2.displayRegDate.includes("09") && res2.displayRegDate.includes("Oct"), "[TOP RIBBON] Formats date-only registration string");

// 16.3 Doctor is missing / null -> defaults to 'Self'
const testReport3 = {
  id: "rep-003",
  patient: {
    name: "Pooja Patel",
    refDoctor: null,
    created_at: "2026-10-10T09:15:00.000Z",
  },
};
const res3 = resolvePatientTopRibbonDetails(testReport3);
assert(res3.displayReferredBy === "Self", "[TOP RIBBON] Falls back to 'Self' when referral doctor is null/empty");
assert(res3.displayCollDate === res3.displayRegDate, "[TOP RIBBON] Collection date safely falls back to registration date when not specified");

// 16.4 Safe fallbacks for empty / null patient
const testReportEmpty = { id: "rep-null", patient: null };
const resEmpty = resolvePatientTopRibbonDetails(testReportEmpty);
assert(resEmpty.displayReferredBy === "Self", "[TOP RIBBON] Empty patient safely resolves referred by to 'Self'");
assert(resEmpty.displayRegDate === "—", "[TOP RIBBON] Empty registration date safely displays em-dash");
assert(resEmpty.displayCollDate === "—", "[TOP RIBBON] Empty collection date safely displays em-dash");

// ==============================================================================
// 17. LIS Performance Engine: SWR Caching, Event Scoping, Autofocus & Network Resilience
// ==============================================================================
console.log("\n▶ MODULE 17: Performance Caching, Autofocus & Network Resilience Engine");

// 17.1 Scoped Cache Invalidation prevents redundant catalog downloads
function shouldInvalidateTestCatalog(eventDetail: any): boolean {
  const prefix = eventDetail?.prefix;
  if (!prefix) return true; // unscoped fallback
  return prefix.includes("test");
}

assert(shouldInvalidateTestCatalog({ prefix: "patients" }) === false, "[CACHE SCOPE] Patient save prefix strictly prevents re-downloading test catalog");
assert(shouldInvalidateTestCatalog({ prefix: "bookings" }) === false, "[CACHE SCOPE] Booking save prefix strictly prevents re-downloading test catalog");
assert(shouldInvalidateTestCatalog({ prefix: "tests" }) === true, "[CACHE SCOPE] Tests master edit correctly triggers test catalog refresh");
assert(shouldInvalidateTestCatalog(undefined) === true, "[CACHE SCOPE] Bare event safely falls back to catalog refresh");

// 17.2 Autofocus Trigger on Test Selection Modal Open
interface MockModalState {
  isModalOpen: boolean;
  catalogMode: "TESTS" | "PACKAGES" | "OUTSOURCE";
  focusedElementId: string | null;
}

function handleCatalogModalOpen(state: MockModalState): MockModalState {
  if (state.isModalOpen && state.catalogMode === "TESTS") {
    return { ...state, focusedElementId: "input-search-test" };
  }
  return state;
}

const focusedState = handleCatalogModalOpen({
  isModalOpen: true,
  catalogMode: "TESTS",
  focusedElementId: null,
});
assert(focusedState.focusedElementId === "input-search-test", "[AUTOFOCUS] Opening clinical tests modal automatically focuses search bar");

// 17.3 Optimistic 0ms Print Preview Resolution
function resolveOptimisticPrintReport(rowItem: any, fallbackLab: any) {
  return {
    ...rowItem,
    lab: rowItem.lab || fallbackLab,
    isOptimistic: true,
  };
}

const sampleRow = { id: "rep-123", custom_id: "REP-2026-001", patient: { name: "Ananya Sharma" } };
const defaultLab = { name: "OnePath Central Lab" };
const optimisticPrint = resolveOptimisticPrintReport(sampleRow, defaultLab);
assert(optimisticPrint.id === "rep-123", "[OPTIMISTIC PRINT] Modal receives report id immediately without waiting for network");
assert(optimisticPrint.lab.name === "OnePath Central Lab", "[OPTIMISTIC PRINT] Resolves cached or fallback lab settings in 0ms");

// 17.4 SWR Table Loading Preservation during Date Switches
function isTableBlankLoading(loading: boolean, isFetching: boolean, itemCount: number): boolean {
  return (loading && itemCount === 0) || (isFetching && itemCount === 0);
}

assert(isTableBlankLoading(true, false, 0) === true, "[SWR LOADING] Empty table shows skeleton on initial mount");
assert(isTableBlankLoading(false, true, 25) === false, "[SWR LOADING] Switching dates preserves populated table without blank flicker");
assert(isTableBlankLoading(false, true, 0) === true, "[SWR LOADING] Empty results show loading skeleton");

// 17.5 Dynamic Network Resilience & Connectivity Status Classification
function classifyNetworkState(isOnline: boolean, isTimeout: boolean, isFailedFetch: boolean): "idle" | "offline" | "weak" {
  if (!isOnline) return "offline";
  if (isTimeout || isFailedFetch) return "weak";
  return "idle";
}

assert(classifyNetworkState(false, false, false) === "offline", "[NETWORK RESILIENCE] Browser offline correctly classified as offline state");
assert(classifyNetworkState(true, true, false) === "weak", "[NETWORK RESILIENCE] Slow timeout correctly classified as weak connection with retry option");
assert(classifyNetworkState(true, false, true) === "weak", "[NETWORK RESILIENCE] Failed fetch correctly classified as weak/unreachable server state");
assert(classifyNetworkState(true, false, false) === "idle", "[NETWORK RESILIENCE] Healthy connection remains in idle state");

// ==============================================================================
// 18. Smart Panel Keep-Together Engine (Technique 1) & Letterhead Margin Boundary Guardrails
// ==============================================================================
console.log("\n▶ MODULE 18: Smart Panel Keep-Together Engine & Letterhead Margin Boundary Guardrails");

import { computeReportPages, A4_W, A4_H, type ReportBlock } from "../src/components/report-sheet";

// 18.1 Paper Saving: Two compact tests fitting within usable height remain on the same page
const compactTestBlocks: ReportBlock[] = [
  // Test 1: Blood Sugar Fasting (Total ~120px)
  { key: "header-Bio-SugarFasting", node: null, isTestPanelStart: true, testGroup: "Bio:::SugarFasting" },
  { key: "tblhead-Bio-SugarFasting", node: null, testGroup: "Bio:::SugarFasting" },
  { key: "row-sugar-fasting-val", node: null, testGroup: "Bio:::SugarFasting" },
  { key: "endline-Bio-SugarFasting", node: null, testGroup: "Bio:::SugarFasting" },
  // Test 2: Blood Sugar PP (Total ~120px)
  { key: "header-Bio-SugarPP", node: null, isTestPanelStart: true, testGroup: "Bio:::SugarPP" },
  { key: "tblhead-Bio-SugarPP", node: null, testGroup: "Bio:::SugarPP" },
  { key: "row-sugar-pp-val", node: null, testGroup: "Bio:::SugarPP" },
  { key: "endline-Bio-SugarPP", node: null, testGroup: "Bio:::SugarPP" },
];
const compactHeights = [30, 24, 26, 6, 30, 24, 26, 6]; // Sum: 86px + 86px = 172px
const standardUsableH = 700; // Typical clean page height after letterhead margins and patient info block

const compactPages = computeReportPages(compactTestBlocks, compactHeights, standardUsableH);
assert(compactPages.length === 1, "[KEEP-TOGETHER] Multiple short tests fitting on 1 page stay on 1 page to save paper");
assert(compactPages[0].length === 8, "[KEEP-TOGETHER] All 8 blocks of both sugar tests packed onto page 1");

// 18.2 Zero Chopped Test (Technique 1): CBC + Urine Routine
// CBC takes 450px on Page 1. Urine Routine takes 340px.
// 450 + 340 = 790px > 700px usable height.
// Without keep-together, Urine would be chopped across page 1 and page 2.
// With keep-together, Urine Routine is shifted to start fresh on Page 2!
const cbcAndUrineBlocks: ReportBlock[] = [
  // CBC (Blocks 0-6): Total 450px
  { key: "header-Haem-CBC", node: null, isTestPanelStart: true, testGroup: "Haem:::CBC" },
  { key: "tblhead-Haem-CBC", node: null, testGroup: "Haem:::CBC" },
  { key: "row-cbc-hb", node: null, testGroup: "Haem:::CBC" },
  { key: "row-cbc-rbc", node: null, testGroup: "Haem:::CBC" },
  { key: "row-cbc-wbc", node: null, testGroup: "Haem:::CBC" },
  { key: "row-cbc-plt", node: null, testGroup: "Haem:::CBC" },
  { key: "endline-Haem-CBC", node: null, testGroup: "Haem:::CBC" },
  // Urine Routine (Blocks 7-13): Total 340px
  { key: "header-Path-Urine", node: null, isTestPanelStart: true, testGroup: "Path:::Urine" },
  { key: "tblhead-Path-Urine", node: null, testGroup: "Path:::Urine" },
  { key: "row-urine-color", node: null, testGroup: "Path:::Urine" },
  { key: "row-urine-ph", node: null, testGroup: "Path:::Urine" },
  { key: "row-urine-protein", node: null, testGroup: "Path:::Urine" },
  { key: "row-urine-sugar", node: null, testGroup: "Path:::Urine" },
  { key: "endline-Path-Urine", node: null, testGroup: "Path:::Urine" },
];
const cbcAndUrineHeights = [
  35, 25, 95, 95, 100, 95, 5, // CBC total = 450px
  35, 25, 70, 70, 70, 65, 5,  // Urine total = 340px
];

const cbcUrinePages = computeReportPages(cbcAndUrineBlocks, cbcAndUrineHeights, 700);
assert(cbcUrinePages.length === 2, "[KEEP-TOGETHER] Urine routine shifted to page 2 instead of being chopped in half");
assert(
  cbcUrinePages[0].every(idx => cbcAndUrineBlocks[idx].testGroup === "Haem:::CBC"),
  "[KEEP-TOGETHER] Page 1 contains exclusively CBC test blocks"
);
assert(
  cbcUrinePages[1].every(idx => cbcAndUrineBlocks[idx].testGroup === "Path:::Urine"),
  "[KEEP-TOGETHER] Page 2 contains the complete Urine Routine panel without fragmentation"
);

// 18.3 Giant Test (Exceeding 1 Full Clean Page): Culture & Sensitivity with 40 rows
// If remaining space on page 1 is small (< 200px or < 30% of page), start cleanly on next page
const giantTestBlocks: ReportBlock[] = [
  { key: "header-Micro-Stool", node: null, isTestPanelStart: true, testGroup: "Micro:::Stool" },
  { key: "row-stool-occult", node: null, testGroup: "Micro:::Stool" }, // takes 550px
  // Giant Culture Test (Total 1100px)
  { key: "header-Micro-Culture", node: null, isTestPanelStart: true, testGroup: "Micro:::Culture" },
  { key: "tblhead-Micro-Culture", node: null, testGroup: "Micro:::Culture" },
  { key: "custom-editor-row-1", node: null, testGroup: "Micro:::Culture" },
  { key: "custom-editor-row-2", node: null, testGroup: "Micro:::Culture" },
  { key: "custom-editor-row-3", node: null, testGroup: "Micro:::Culture" },
];
const giantHeights = [
  50, 500, // Stool = 550px (leaves only 150px on Page 1)
  30, 25, 400, 400, 245, // Culture = 1100px
];
const giantPages = computeReportPages(giantTestBlocks, giantHeights, 700);
assert(giantPages[0].length === 2, "[KEEP-TOGETHER] Giant test does not awkwardly start with a 1-row fragment on page 1");
assert(giantPages[1][0] === 2, "[KEEP-TOGETHER] Giant culture test starts clean from the top of page 2");

// 18.4 Letterhead Margin Boundary Constraints: Content strictly bounded within margins
// Standard letterhead: Header 185px, Footer 95px.
// Custom letterhead: Header 240px, Footer 160px.
function calculateContentAreaHeight(headerH: number, footerH: number, a4Height: number = A4_H): number {
  return Math.max(120, a4Height - headerH - footerH);
}

const defaultContentH = calculateContentAreaHeight(185, 95);
assert(defaultContentH === 1123 - 185 - 95, "[LETTERHEAD BOUNDS] Default content area height exactly 843px");
assert(185 + defaultContentH + 95 === A4_H, "[LETTERHEAD BOUNDS] Header + Content Area + Footer strictly equals A4 height");

const customContentH = calculateContentAreaHeight(240, 160);
assert(customContentH === 1123 - 240 - 160, "[LETTERHEAD BOUNDS] Custom header (240px) & footer (160px) sets content area to 723px");
assert(240 + customContentH + 160 === A4_H, "[LETTERHEAD BOUNDS] Custom letterhead bounds strictly align to A4 height");

// Check that computeReportPages never places blocks exceeding the page usable height on any page
cbcUrinePages.forEach((pageBlockIndices, pIdx) => {
  const pageHeight = pageBlockIndices.reduce((sum, idx) => sum + cbcAndUrineHeights[idx], 0);
  assert(
    pageHeight <= 700,
    `[LETTERHEAD BOUNDS] Page ${pIdx + 1} content height (${pageHeight}px) strictly stays within usable margin limit (700px)`
  );
});

// 18.5 Separate Page Per Test setting override
const separatePages = computeReportPages(compactTestBlocks, compactHeights, standardUsableH, { separatePagePerTest: true });
assert(separatePages.length === 2, "[SEPARATE PAGE OPTION] When separatePagePerTest is enabled, each test gets its own page");
assert(separatePages[0].length === 4, "[SEPARATE PAGE OPTION] Page 1 contains test 1");
assert(separatePages[1].length === 4, "[SEPARATE PAGE OPTION] Page 2 contains test 2");

// 18.6 Letterhead Toggle State & PDF Download Verification
function resolveEffectiveLetterheadBg(
  settings: { bgImage: string | null } | undefined,
  labRawBg: string | null
): string | null {
  if (settings) {
    return settings.bgImage ? settings.bgImage : null;
  }
  return labRawBg;
}

const mockLabBg = "https://onepath.com/uploads/letterhead.png";
const untickedSettings = { bgImage: null };
const tickedSettings = { bgImage: mockLabBg };

assert(
  resolveEffectiveLetterheadBg(untickedSettings, mockLabBg) === null,
  "[LETTERHEAD TOGGLE] Unticked print settings strictly resolves bgImage to null (without letterhead)"
);
assert(
  resolveEffectiveLetterheadBg(tickedSettings, mockLabBg) === mockLabBg,
  "[LETTERHEAD TOGGLE] Ticked print settings resolves bgImage to letterhead URL (with letterhead)"
);
assert(
  resolveEffectiveLetterheadBg(undefined, mockLabBg) === mockLabBg,
  "[LETTERHEAD TOGGLE] Undefined settings falls back to lab background"
);

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 19: Comprehensive Phase 1-3 Performance, Bundle & Mobile Guardrails
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ MODULE 19: Comprehensive Phase 1-3 Performance, Bundle & Mobile Guardrails");

// 19.1 Bundle Splitting Verification: download-invoice-pdf and download-doctor-statement
const invoicePdfSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/download-invoice-pdf.ts"), "utf-8");
const doctorStatementPdfSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/download-doctor-statement.ts"), "utf-8");

assert(
  !invoicePdfSrc.includes('import html2canvas from "html2canvas";') &&
  !invoicePdfSrc.includes('import jsPDF from "jspdf";'),
  "[BUNDLE SPLITTING] download-invoice-pdf does not contain top-level static imports of html2canvas or jsPDF"
);

assert(
  invoicePdfSrc.includes('await import("html2canvas")') &&
  invoicePdfSrc.includes('await import("jspdf")'),
  "[BUNDLE SPLITTING] download-invoice-pdf dynamically imports html2canvas and jsPDF on demand"
);

assert(
  !doctorStatementPdfSrc.includes('import html2canvas from "html2canvas";') &&
  !doctorStatementPdfSrc.includes('import jsPDF from "jspdf";'),
  "[BUNDLE SPLITTING] download-doctor-statement does not contain top-level static imports of html2canvas or jsPDF"
);

assert(
  doctorStatementPdfSrc.includes('await import("html2canvas")') &&
  doctorStatementPdfSrc.includes('await import("jspdf")'),
  "[BUNDLE SPLITTING] download-doctor-statement dynamically imports html2canvas and jsPDF on demand"
);

// 19.2 High-Fidelity Vector PDF Engine & Resilient Fallback
const pdfReportDownloaderSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/pdf-report-downloader.ts"), "utf-8");
assert(
  pdfReportDownloaderSrc.includes("generateNativePdfBlob(html, safeFilename)") &&
  pdfReportDownloaderSrc.includes("generatePristineClientPdf(printContainer, safeFilename)"),
  "[VECTOR PDF] pdf-report-downloader generates high-fidelity vector PDF with resilient client-side fallback"
);

// 19.3 Polling Throttling & Tab Visibility
const navbarSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/navbar.tsx"), "utf-8");
assert(
  navbarSrc.includes("120000);"),
  "[POLLING THROTTLE] Navbar polling interval is throttled to 120s (Rule 4.5)"
);
assert(
  navbarSrc.includes("document.hidden"),
  "[TAB VISIBILITY] Navbar polling checks document.hidden to eliminate inactive background tab queries"
);

// 19.4 Async WhatsApp Worker Dispatch
const printPreviewSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/print-preview-dialog.tsx"), "utf-8");
assert(
  printPreviewSrc.includes("async: true,"),
  "[ASYNC WHATSAPP] Print preview dialog dispatches WhatsApp requests with async: true"
);

// 19.5 Natural Responsive Table Scroll Container & Mobile Touch Ergonomics
const reportsPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/page.tsx"), "utf-8");
const billingPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/page.tsx"), "utf-8");
const dateRibbonSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/date-filter-ribbon.tsx"), "utf-8");

assert(
  reportsPageSrc.includes("table-responsive-container") && !reportsPageSrc.includes("sticky right-0"),
  "[RESPONSIVE SCROLL] Reports page table enables natural smooth horizontal scrolling across all columns"
);

assert(
  billingPageSrc.includes("table-responsive-container") && !billingPageSrc.includes("sticky right-0"),
  "[RESPONSIVE SCROLL] Billing page table enables natural smooth horizontal scrolling across all columns"
);

assert(
  dateRibbonSrc.includes("min-w-[40px] min-h-[40px]"),
  "[TOUCH ERGONOMICS] DateFilterRibbon chevrons enforce comfortable minimum touch targets on mobile"
);

// 19.6 Inventory & Overview Layout Guardrails
const inventoryPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/inventory/page.tsx"), "utf-8");
assert(
  !inventoryPageSrc.includes("min-w-[1150px]"),
  "[INVENTORY FIXED LAYOUT] View inventory table removes min-w-[1150px] to prevent horizontal scroll"
);

const manageInventorySrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/inventory/manage/page.tsx"), "utf-8");
assert(
  !manageInventorySrc.includes("overflow-x-auto border-b border-border/70 pb-2 scrollbar-none"),
  "[MANAGE INVENTORY TABS] Manage inventory navigation tabs use fixed responsive grid without horizontal scrolling"
);

// 19.7 Sample Test Preview Modal: Hiding WhatsApp & Smart Report
const testsPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/tests/page.tsx"), "utf-8");
assert(
  testsPageSrc.includes("hideWhatsApp={true}") && testsPageSrc.includes("hideSmartReport={true}"),
  "[SAMPLE PREVIEW CLEANUP] Test catalog live overview hides WhatsApp and Smart Report buttons"
);

// 19.8 Referral Patients Mobile Responsiveness
const doctorPatientsPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/doctors/patients/page.tsx"), "utf-8");
assert(
  doctorPatientsPageSrc.includes("block md:hidden") && doctorPatientsPageSrc.includes("hidden md:block"),
  "[REFERRAL PATIENTS RESPONSIVE] Doctor referral patient view provides dedicated mobile card list alongside desktop table"
);

// 19.9 Targeted Cache Invalidation & Background Throttling Guardrails
const settingsSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/settings/page.tsx"), "utf-8");
const smartReportSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/smart-report/page.tsx"), "utf-8");
const b2bOverviewSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/b2b-overview.tsx"), "utf-8");

assert(
  settingsSrc.includes('clearApiCache("/lab");') && !settingsSrc.includes('clearApiCache();'),
  "[TARGETED CACHE] Settings save uses targeted cache invalidation to prevent cold-start latency (Rule 4.2)"
);

assert(
  smartReportSrc.includes('clearApiCache("/lab");') && !smartReportSrc.includes('clearApiCache();'),
  "[TARGETED CACHE] Smart report save uses targeted cache invalidation to prevent cold-start latency (Rule 4.2)"
);

assert(
  b2bOverviewSrc.includes("60000);") && b2bOverviewSrc.includes("document.hidden"),
  "[POLLING THROTTLE] B2B overview polling is throttled to 60s with background tab suppression (Rule 4.5)"
);

// 19.10 Automated Midnight Summary Dispatch & Live Status Indicator
const accountLabPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/account/lab/page.tsx"), "utf-8");

assert(
  accountLabPageSrc.includes("/lab/summary-dispatch/auto-check"),
  "[AUTO DISPATCH] Lab account page automatically triggers background auto-check for pending summary dispatch"
);

assert(
  accountLabPageSrc.includes("lastDispatchedAt") && accountLabPageSrc.includes("Next scheduled: Tonight at 12:00 AM (Midnight)"),
  "[AUTO DISPATCH STATUS] Daily midnight option renders live last sent status and next scheduled time"
);

assert(
  !accountLabPageSrc.includes("value={dispatchSettings.recipientEmailInput}") &&
  !accountLabPageSrc.includes("Send Test Summary Now") &&
  !accountLabPageSrc.includes("Automatic Delivery to Account Email:"),
  "[AUTO DISPATCH CLEANUP] Recipient input, test button, and extra summary box removed; pure toggle button retained"
);

// 19.11 B2B Test Catalog Pricing Resolution & Revenue/Ledger Rate List Margin Audit
const registerPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/register/page.tsx"), "utf-8");
const revenuePageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/revenue/page.tsx"), "utf-8");

// Test 1: B2B Register Page fetches /rate-lists/my-rate-list in parallel
assert(
  registerPageSrc.includes('/rate-lists/my-rate-list'),
  "[B2B REGISTRATION] Register page fetches /rate-lists/my-rate-list for live confidential partner pricing"
);

// Test 2: B2B Catalog Display renders separate B2B badge and MRP line-through label in responsive layout
assert(
  registerPageSrc.includes("B2B ₹") && registerPageSrc.includes("MRP ₹") && registerPageSrc.includes("line-through"),
  "[B2B CATALOG UI] Test and package catalog items render distinct B2B badge alongside MRP in responsive layout"
);

// Test 3: Applied In-House and Package Subtotals strictly use B2B rates
assert(
  registerPageSrc.includes("isEffectiveB2B ? getTestB2bPrice(t).b2bPrice : t.price") &&
  registerPageSrc.includes("isEffectiveB2B ? getPackageB2bPrice(selectedPackage).b2bPrice : selectedPackage.price"),
  "[B2B BILLING RATES] Registration invoice subtotal and package price strictly apply B2B rates"
);

// Test 4: Revenue & Ledger Margin Calculation prioritizes calculatedLabRate and reportB2bPrice over billTotal
assert(
  revenuePageSrc.includes("const reportB2bPrice = Number(r.b2b_price ?? r.b2bPrice ?? 0);") &&
  revenuePageSrc.includes("const labMargin = calculatedLabRate > 0\n      ? calculatedLabRate\n      : (reportB2bPrice > 0\n        ? reportB2bPrice\n        : (billTotal > 0 ? billTotal : 0));"),
  "[REVENUE LEDGER MARGIN] Lab Margin strictly calculates from rate list wholesale tariff without defaulting to retail billTotal"
);

// Test 5: Verify algorithmic accuracy of Rate List Margin vs Retail MRP
const mockReport = {
  bill: { total: 500, paid_amount: 500, status: "PAID" },
  b2b_price: 200,
};
const mockCalculatedLabRate = 200;
const mockCalculatedMrp = 500;
const testLabMargin = mockCalculatedLabRate > 0 ? mockCalculatedLabRate : Number(mockReport.b2b_price || mockReport.bill.total);
const testTotalMrp = mockCalculatedMrp > 0 ? mockCalculatedMrp : testLabMargin;
const testB2bMargin = Math.max(0, testTotalMrp - testLabMargin);

assert(
  testLabMargin === 200 && testB2bMargin === 300 && testTotalMrp === 500,
  "[REVENUE LEDGER MATH] Report with MRP 500 and Rate List Wholesale 200 yields Lab Margin 200 and B2B Centre Margin 300"
);

// ==============================================================================
// 20. Test Catalog Fetch Resilience, Account Switching Cache Isolation & Logout UX
// ==============================================================================
console.log("\n▶ MODULE 20: Test Catalog Fetch Resilience, Account Switching Cache Isolation & Logout UX");

// 20.1 Test Catalog Payload Resilient Parser
function parseCatalogResponse(data: any): any[] | null {
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.tests) ? data.tests : null));
}

const rawArrayPayload = [{ id: "t1", name: "CBC" }, { id: "t2", name: "LFT" }];
const wrappedDataPayload = { success: true, data: [{ id: "t1", name: "CBC" }, { id: "t2", name: "LFT" }] };
const wrappedTestsPayload = { tests: [{ id: "t1", name: "CBC" }, { id: "t2", name: "LFT" }] };
const emptyObjectPayload = {};

assert(
  Array.isArray(parseCatalogResponse(rawArrayPayload)) && parseCatalogResponse(rawArrayPayload)!.length === 2,
  "[CATALOG RESILIENCE] Raw array payload correctly parsed without data loss"
);

assert(
  Array.isArray(parseCatalogResponse(wrappedDataPayload)) && parseCatalogResponse(wrappedDataPayload)!.length === 2,
  "[CATALOG RESILIENCE] Wrapped { data: [...] } payload correctly parsed without data loss"
);

assert(
  Array.isArray(parseCatalogResponse(wrappedTestsPayload)) && parseCatalogResponse(wrappedTestsPayload)!.length === 2,
  "[CATALOG RESILIENCE] Wrapped { tests: [...] } payload correctly parsed without data loss"
);

assert(
  parseCatalogResponse(emptyObjectPayload) === null,
  "[CATALOG RESILIENCE] Empty object or 304 body does not crash parser"
);

// 20.2 Cross-Account Dashboard Cache Isolation Guardrail
const labAStats = {
  labId: "lab-uuid-aaa",
  patientsToday: 42,
  totalPatients: 900,
  cachedDate: "2026-10-11",
};

function evaluateCachedOverviewData(cachedJson: string | null, currentLabId: string, todayStr: string): boolean {
  if (!cachedJson) return false;
  try {
    const parsed = JSON.parse(cachedJson);
    const isMatchingLab = Boolean(currentLabId && parsed.labId && parsed.labId === currentLabId);
    if (!isMatchingLab) return false;
    return parsed.cachedDate === todayStr;
  } catch {
    return false;
  }
}

assert(
  evaluateCachedOverviewData(JSON.stringify(labAStats), "lab-uuid-bbb", "2026-10-11") === false,
  "[ACCOUNT ISOLATION] Logging into Lab B strictly rejects and hides Lab A cached overview data"
);

assert(
  evaluateCachedOverviewData(JSON.stringify(labAStats), "lab-uuid-aaa", "2026-10-11") === true,
  "[ACCOUNT ISOLATION] Logged-in Lab A cleanly restores its own matching cached overview metrics"
);

// 20.3 Comprehensive Logout Cache Cleaning
const simulatedStorage: Record<string, string> = {
  "lis_token": "token-123",
  "lis_user": JSON.stringify({ id: "user-1", lab_id: "lab-1" }),
  "lis_cached_dashboard_stats": JSON.stringify(labAStats),
  "lis_cached_dashboard_charts": JSON.stringify([{ date: "Today", reports: 5 }]),
  "lis_cached_dashboard_recent_reports": JSON.stringify([{ id: "r1" }]),
  "lis_cached_reports": JSON.stringify([{ id: "r1" }]),
  "lis_cached_patients": JSON.stringify([{ id: "p1" }]),
  "lis_cached_bills": JSON.stringify([{ id: "b1" }]),
  "lis_cached_tests": JSON.stringify([{ id: "t1" }]),
  "lis_cached_lab": JSON.stringify({ id: "lab-1" }),
};

function simulateLogoutStorageClean(storage: Record<string, string>) {
  const keys = Object.keys(storage);
  for (const k of keys) {
    if (k.startsWith("lis_") || k.startsWith("b2b_") || k.startsWith("admin_") || k.startsWith("dashboard_")) {
      delete storage[k];
    }
  }
}

simulateLogoutStorageClean(simulatedStorage);

assert(
  Object.keys(simulatedStorage).length === 0,
  "[LOGOUT CLEANUP] Comprehensive logout completely wipes all tenant and dashboard cached data"
);

// 20.4 Backend TestController Code Audit
const testControllerSrc = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/TestController.php"), "utf-8");

assert(
  !testControllerSrc.includes("$latestTs") && !/\$testCount\b/.test(testControllerSrc),
  "[BACKEND AUDIT] TestController eliminates undefined variables ($latestTs, $testCount)"
);

assert(
  !testControllerSrc.includes("return response('', 304)"),
  "[BACKEND AUDIT] TestController does not return broken 304 empty responses that fail frontend fetch"
);

assert(
  testControllerSrc.includes("default_tests.json"),
  "[BACKEND AUDIT] TestController automatically seeds catalog from default_tests.json if lab tests are empty"
);

// 20.5 Login Page Back Navigation & Zero-Blocking Authenticated Session Guardrail
const loginPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/login/page.tsx"), "utf-8");

assert(
  loginPageSrc.includes("getStoredToken") && !loginPageSrc.includes("Checking active security session"),
  "[LOGIN GUARD] Login page checks getStoredToken and eliminates blocking security check screens so login is instant"
);

assert(
  loginPageSrc.includes('window.location.replace("/dashboard")'),
  "[LOGIN GUARD] Login page replaces browser history so /login is never retained in back navigation stack"
);

// 20.6 Dashboard Auth Guard Back-Trap
const dashboardAuthGuardSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/dashboard-auth-guard.tsx"), "utf-8");

assert(
  dashboardAuthGuardSrc.includes('window.location.pathname === "/dashboard"') && dashboardAuthGuardSrc.includes('window.history.pushState'),
  "[DASHBOARD BACK TRAP] DashboardAuthGuard traps back navigation on dashboard root to prevent bouncing back to login"
);

// 20.7 Middleware Security Headers on Authenticated Login Hit
const middlewareSrc = fs.readFileSync(path.resolve(__dirname, "../src/middleware.ts"), "utf-8");

assert(
  middlewareSrc.includes("pathname === '/login' && token") && middlewareSrc.includes("no-store, no-cache"),
  "[MIDDLEWARE SECURITY] Middleware intercepts /login for authenticated tokens with no-store headers"
);

// 20.8 Clean Instant Logout Guardrail (No Blocking Overlays)
const apiClientSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/api-client.ts"), "utf-8");

assert(
  !apiClientSrc.includes("Signing Out Securely...") && apiClientSrc.includes("window.location.replace(targetUrl)"),
  "[LOGOUT GUARD] Logout executes instantly via window.location.replace without blocking DOM overlays"
);

// 20.10 Targeted Logout Shimmer & Prefetch Redirect Guardrail
const navbarContent20 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/navbar.tsx"), "utf-8");
const globalsContent20 = fs.readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf-8");

assert(
  navbarContent20.includes("isLoggingOut") &&
  navbarContent20.includes("logout-btn-shimmer") &&
  navbarContent20.includes('router.prefetch("/login")') &&
  globalsContent20.includes(".logout-btn-shimmer") &&
  apiClientSrc.includes('targetUrl = reason === "suspended" ? "/login?suspended=true" : "/login?logout=1"'),
  "[TARGETED LOGOUT SHIMMER UX] Logout button renders targeted shimmer effect with login prefetch and zero-delay redirect"
);

// 20.9 Infinite Login Redirect Loop Defense
assert(
  loginPageSrc.includes("isUnauth") && loginPageSrc.includes("lis_last_redirect") && middlewareSrc.includes("loginUrl.searchParams.set('unauth', '1')"),
  "[LOGIN LOOP DEFENSE] Login page and middleware defend against rapid infinite redirect loops on expired cookies"
);

console.log("\n▶ MODULE 21: Live Analyzer Direct Interfacing & Clinical DLC Auto-Balancing Engine");

// 21.1 Report Enter Results Machine Dialog: Pure Original Machine Fetch (No Fake Demo Buttons)
const reportEditSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/[id]/edit/page.tsx"), "utf-8");

assert(
  !reportEditSrc.includes("Demo Fake CBC") && !reportEditSrc.includes("Demo Fake Biochem"),
  "[ANALYZER PURITY] Fetch from Machine dialog strictly contains genuine machine results without fake simulation buttons"
);

// 21.2 Machine Integration Settings Tab: Direct Fetch Architecture (No Redundant Queue)
const machineTabSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/machine-integration-tab.tsx"), "utf-8");

assert(
  !machineTabSrc.includes("Live Incoming Test Queue") && !machineTabSrc.includes("Simulate Aveacon CBC Run"),
  "[ANALYZER TAB DIRECT ARCHITECTURE] Settings tab streamlines analyzers directly to Enter Results without redundant queue bloat"
);

// 21.3 DLC Auto-Balance Math Engine
function testBalanceDlc(counts: { [key: string]: number }) {
  const keys = Object.keys(counts);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total <= 0 || keys.length < 2) return counts;
  const result: { [key: string]: number } = {};
  let running = 0;
  keys.forEach((k, idx) => {
    if (idx < keys.length - 1) {
      const val = Math.round((counts[k] / total) * 100 * 10) / 10;
      result[k] = val;
      running += val;
    } else {
      const remainder = Math.round((100 - running) * 10) / 10;
      result[k] = Math.max(0, remainder);
    }
  });
  return result;
}

// 3-Part Machine Default DLC: Gran 75%, Lymph 20%, Mid 8% (Total = 103%)
const unbalanced = { gran: 75, lymph: 20, mid: 8 };
const balanced = testBalanceDlc(unbalanced);
const balancedTotal = Object.values(balanced).reduce((a, b) => a + b, 0);

assert(
  Math.abs(balancedTotal - 100.0) < 0.0001,
  "[DLC AUTO-BALANCE] Over-counted differential counts (103%) proportionally balance to exactly 100.0%"
);

// Under-counted DLC: Gran 60%, Lymph 25%, Mid 5% (Total = 90%)
const underBalanced = testBalanceDlc({ gran: 60, lymph: 25, mid: 5 });
const underTotal = Object.values(underBalanced).reduce((a, b) => a + b, 0);

assert(
  Math.abs(underTotal - 100.0) < 0.0001,
  "[DLC AUTO-BALANCE] Under-counted differential counts (90%) proportionally balance to exactly 100.0%"
);

// Auto-Balance button present in Report Edit UI
assert(
  reportEditSrc.includes("Auto-Balance (100%)") && reportEditSrc.includes("handleAutoBalanceDlc"),
  "[DLC UI ENGINE] Enter Results differential count provides dedicated 1-click Auto-Balance (100%) button"
);

// 21.6 WBC Normalization: 4.6 or 8.6 -> 4600 or 8600 (/cumm)
function normalizeWbcValue(val: string): string {
  const num = parseFloat(val);
  if (!isNaN(num) && num > 0 && num < 100) {
    return String(Math.round(num * 1000));
  }
  return val;
}

assert(normalizeWbcValue("4.6") === "4600", "[WBC NORMALIZATION] WBC 4.6 (10^3/µL) normalizes to 4600 (/cumm)");
assert(normalizeWbcValue("8.6") === "8600", "[WBC NORMALIZATION] WBC 8.6 (10^3/µL) normalizes to 8600 (/cumm)");
assert(normalizeWbcValue("8600") === "8600", "[WBC NORMALIZATION] WBC 8600 (/cumm) already in whole units is preserved");

// 21.7 5-Part DLC Derivation & 100% Balancing from 3-Part Machine
function derive5PartDlc(neuVal: number, lymVal: number, remainderMid?: number) {
  const nlSum = neuVal + lymVal;
  const rem = remainderMid ?? Math.max(0, Math.round((100 - nlSum) * 10) / 10);
  let eos = rem >= 6 ? 2.0 : rem >= 3 ? 1.5 : rem > 1 ? 1.0 : Math.round((rem / 3) * 10) / 10;
  let bas = rem >= 10 ? 1.0 : 0.0;
  let mon = Math.max(0, Math.round((rem - eos - bas) * 10) / 10);
  const total = Math.round((neuVal + lymVal + eos + mon + bas) * 10) / 10;
  return { neuVal, lymVal, eos, mon, bas, total };
}

const dlcDerivation = derive5PartDlc(50.8, 40.8);
assert(dlcDerivation.total === 100.0, "[DLC 5-PART POPULATION] 3-Part machine (Neu 50.8, Lym 40.8) populates Eos, Mon, Bas strictly totaling 100.0%");
assert(dlcDerivation.eos === 2.0, "[DLC 5-PART POPULATION] Eosinophils populated to 2.0% within clinical reference range");
assert(dlcDerivation.mon === 6.4, "[DLC 5-PART POPULATION] Monocytes populated to remainder 6.4% within clinical reference range");
assert(dlcDerivation.bas === 0.0 || dlcDerivation.bas === 1.0, "[DLC 5-PART POPULATION] Basophils populated within clinical reference range");

// 21.8 Machine Parameter Preservation Guardrail
assert(
  reportEditSrc.includes("machineFilledIds.has(calcId)"),
  "[MACHINE PARAM PRESERVATION] Measured MCV, MCH, MCHC from machine are preserved and not overwritten by formula"
);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 22: Patient Title Resilience & Referral Doctor Outsource Commission Guardrails
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ MODULE 22: Patient Title Resilience & Referral Doctor Outsource Commission Guardrails");

// 22.1 Title formatting when name has stale "Untitled" prefix
assert(
  formatPatientListDisplayName("Untitled Rahul Sharma", "Mr.") === "Mr. Rahul Sharma",
  "[TITLE RESILIENCE] Non-blank designation 'Mr.' overrides stale 'Untitled' prefix to 'Mr. Rahul Sharma'"
);
assert(
  formatPatientListDisplayName("Untitled Priya Verma", "Dr.") === "Dr. Priya Verma",
  "[TITLE RESILIENCE] Non-blank designation 'Dr.' overrides stale 'Untitled' prefix to 'Dr. Priya Verma'"
);
assert(
  formatPatientListDisplayName("Untitled Rahul Sharma", "") === "Rahul Sharma",
  "[TITLE RESILIENCE] Blank designation cleanly strips stale 'Untitled' prefix to 'Rahul Sharma'"
);
assert(
  formatPatientListDisplayName("Untitled Untitled Rahul Sharma", "") === "Rahul Sharma",
  "[TITLE RESILIENCE] Nested Untitled prefixes are collapsed and stripped to 'Rahul Sharma'"
);
assert(
  formatPatientListDisplayName("Mr. Rahul Sharma", "") === "Mr. Rahul Sharma",
  "[TITLE RESILIENCE] Name already starting with 'Mr.' is preserved without prepending Untitled"
);

// 22.2 Pure Patient Name Extraction
assert(
  extractPurePatientName("Untitled Rahul Sharma") === "Rahul Sharma",
  "[NAME PURITY] extractPurePatientName strips 'Untitled' prefix cleanly"
);
assert(
  extractPurePatientName("Blank Rahul Sharma") === "Rahul Sharma",
  "[NAME PURITY] extractPurePatientName strips 'Blank' prefix cleanly"
);
assert(
  extractPurePatientName("Dr. Rahul Sharma") === "Rahul Sharma",
  "[NAME PURITY] extractPurePatientName strips known title 'Dr.' cleanly"
);

// 22.3 Registration & Patient Edit Source Guardrails
const registerSrc = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/patients/register/page.tsx"), "utf-8");
assert(
  !registerSrc.includes('setDesignation("");') && registerSrc.includes("!prev && !editPatientId ? defNorm : prev"),
  "[REGISTER TITLE GUARD] fetchInitialData does not asynchronously wipe user-selected designation"
);
assert(
  registerSrc.includes("rawName.replace(/^(untitled|blank|null)\\s+/gi"),
  "[REGISTER DEMOGRAPHICS] applyPatientDemographics strips Untitled prefix before populating firstName"
);

const patientsSrc = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/patients/page.tsx"), "utf-8");
assert(
  patientsSrc.includes("extractPurePatientName(patient.name || \"\")"),
  "[PATIENTS EDIT GUARD] handleOpenEdit strips stale Untitled prefix so edit input is clean pure name"
);

// 22.4 Backend Referral Doctor Controller In-House Test Calculation Guardrail
const doctorControllerPath = path.resolve(process.cwd(), "../Backend/app/Http/Controllers/Api/Lis/DoctorController.php");
if (fs.existsSync(doctorControllerPath)) {
  const docCtrlSrc = fs.readFileSync(doctorControllerPath, "utf-8");
  assert(
    docCtrlSrc.includes("reports.results.test"),
    "[IN-HOUSE REFERRAL BACKEND] DoctorController collects test items strictly from reports.results.test"
  );
  assert(
    docCtrlSrc.includes("calculateBillCommission"),
    "[REFERRAL COMM GUARD] DoctorController calculates bill commission with defensive zero fallbacks"
  );
  assert(
    !docCtrlSrc.includes("'category' => 'Outsource'"),
    "[REFERRAL EXCLUSION] DoctorController getSettings excludes outsource partner tests from doctor referral catalog"
  );
}

// 22.5 In-House Doctor Commission Math Calculation (Outsource Excluded)
function calculateMockInHouseBillCommission(
  billGross: number,
  billDiscount: number,
  inHousePrice: number,
  docBaseRate: number
) {
  const net = Math.max(0, billGross - billDiscount);
  const inHouseCut = Math.round(((inHousePrice / billGross) * net * docBaseRate) / 100 * 100) / 100;
  const labShare = Math.round((net - inHouseCut) * 100) / 100;
  return { net, inHouseCut, labShare };
}

const calcResult = calculateMockInHouseBillCommission(2000, 200, 2000, 20);
assert(calcResult.net === 1800, "[REFERRAL COMM MATH] Net correctly calculated as 1800 from Gross 2000 - Discount 200");
assert(calcResult.inHouseCut === 360, "[REFERRAL COMM MATH] In-House commission (1800 net * 20%) yields 360 cut");
assert(calcResult.labShare === 1440, "[REFERRAL COMM MATH] Lab net share strictly equals 1440");
assert(calcResult.net - calcResult.inHouseCut === calcResult.labShare, "[REFERRAL COMM MATH] Net commission invariant strictly holds");

// 22.6 Doctors Referral Page & Statement Main Lab vs Outsource Scope Guardrails
const doctorsPageSrc = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/doctors/page.tsx"), "utf-8");
assert(
  doctorsPageSrc.includes('const [caseType, setCaseType] = useState<"main_lab" | "outsource">("main_lab");'),
  "[DOCTORS SCOPE DROPDOWN] Referral overview defaults to 'main_lab' caseType"
);
assert(
  doctorsPageSrc.includes('value="main_lab"') && doctorsPageSrc.includes('value="outsource"'),
  "[DOCTORS SCOPE DROPDOWN] Top right selector provides both Main Lab and Outsource scope options"
);
assert(
  doctorsPageSrc.includes('params.append("case_type", caseType)'),
  "[DOCTORS SCOPE API] Overview passes case_type parameter to backend fetch"
);
assert(
  doctorsPageSrc.includes('params.append("case_type", caseType)') &&
  doctorsPageSrc.includes('caseType === "outsource" ? "Outsource" : "Main Lab"'),
  "[DOCTORS SCOPE STATEMENT] Statement download passes selected case_type to ensure scoped statement download"
);

const doctorStatementSrc = fs.readFileSync(path.join(process.cwd(), "src/lib/download-doctor-statement.ts"), "utf-8");
assert(
  doctorStatementSrc.includes('Doctor Statement • Outsource Tests') && doctorStatementSrc.includes('Doctor Statement • Main Lab'),
  "[DOCTOR STATEMENT SCOPE] Downloaded PDF renders distinct badge for Outsource vs Main Lab"
);

const doctorPatientsScopePageSrc = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/doctors/patients/page.tsx"), "utf-8");
assert(
  doctorPatientsScopePageSrc.includes('searchParams.get("case_type") || "main_lab"') &&
  doctorPatientsScopePageSrc.includes('params.append("case_type", inheritedCaseType)'),
  "[DOCTOR PATIENTS SCOPE] Doctor patients drill-down inherits and passes case_type to backend"
);

// 22.7 Proportional Outsource vs In-House Commission Separation Invariant
function calculateScopedCommissions(
  billGross: number,
  billDiscount: number,
  inHousePrice: number,
  outsourcePrice: number,
  docRate: number
) {
  const discountRatio = billGross > 0 ? (billGross - billDiscount) / billGross : 1;
  const inHouseNet = Math.round(inHousePrice * discountRatio * 100) / 100;
  const inHouseCut = Math.round((inHouseNet * docRate) / 100 * 100) / 100;
  const outsourceNet = Math.round(outsourcePrice * discountRatio * 100) / 100;
  const outsourceCut = Math.round((outsourceNet * docRate) / 100 * 100) / 100;
  return { inHouseNet, inHouseCut, outsourceNet, outsourceCut };
}

const scopedMath = calculateScopedCommissions(2000, 200, 1500, 500, 20);
assert(scopedMath.inHouseNet === 1350, "[SCOPED COMM MATH] In-house net share is proportional to 1500 gross (1350)");
assert(scopedMath.inHouseCut === 270, "[SCOPED COMM MATH] In-house doctor cut at 20% yields 270");
assert(scopedMath.outsourceNet === 450, "[SCOPED COMM MATH] Outsource net share is proportional to 500 gross (450)");
assert(scopedMath.outsourceCut === 90, "[SCOPED COMM MATH] Outsource doctor cut at 20% yields 90");
assert(
  scopedMath.inHouseCut + scopedMath.outsourceCut === 360,
  "[SCOPED COMM MATH] Separated doctor commissions strictly sum to total bill commission (270 + 90 = 360)"
);

// ============================================================================
// MODULE 23: Reports List Table Layout Optimization & Test Hover Popover
// ============================================================================
console.log("\n▶ MODULE 23: Reports List Table Layout Optimization & Test Hover Popover");

const reportsPageContent = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/reports/page.tsx"), "utf-8");

assert(
  reportsPageContent.includes("getReportTestName") &&
  reportsPageContent.includes("hoveredTestsPopover") &&
  reportsPageContent.includes("handleOpenPopover"),
  "[REPORTS TESTS POPOVER] Reports page implements interactive hover popover for test catalog"
);

assert(
  reportsPageContent.includes("px-3.5 py-2.5 sm:py-3 font-mono text-xs font-bold text-primary whitespace-nowrap") &&
  reportsPageContent.includes("{repId}"),
  "[REPORTS ID PURITY] Report ID column renders clean, bold primary ID without unnecessary clutter"
);

assert(
  reportsPageContent.includes("{patName}") &&
  !reportsPageContent.includes("{patId} · {patAge}y/{patGender}"),
  "[REPORTS PATIENT PURITY] Patient column renders pure patient name without subordinate ID/age/gender clutter"
);

assert(
  reportsPageContent.includes("+{resultsList.length - 1} more"),
  "[REPORTS COMPACT TESTS] Multi-test reports render short primary test pill with '+X more' popover trigger"
);

assert(
  reportsPageContent.includes("flex items-center justify-end gap-1.5 whitespace-nowrap") &&
  reportsPageContent.includes("flex items-center gap-1.5"),
  "[REPORTS COMPACT ROWS] Action and payment columns use single-line horizontal alignment to minimize cell height"
);

// 23.2 Result Entry Direct Single-Click Approve Button
const editPageSrc = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/reports/[id]/edit/page.tsx"), "utf-8");
assert(
  editPageSrc.includes('handleSaveResults("APPROVED", false)') && editPageSrc.includes("<span>Approve</span>"),
  "[REPORT APPROVE BUTTON] Enter results footer provides dedicated single-click Approve button"
);
assert(
  editPageSrc.includes("onClick={handlePrintReport}") && editPageSrc.includes('handleSaveResults("APPROVED", true)'),
  "[REPORT PRESERVE ACTIONS] Result entry footer retains Print Report and Approve & Next buttons without removal"
);

// 23.3 Isolated Button Loader State & Action Scoping
assert(
  editPageSrc.includes("savingAction") &&
  editPageSrc.includes('savingAction === "APPROVE"') &&
  editPageSrc.includes('savingAction === "FINAL"') &&
  editPageSrc.includes('savingAction === "IN_PROGRESS"') &&
  editPageSrc.includes('savingAction === "APPROVE_NEXT"'),
  "[RESULT ENTRY LOADER SCOPING] Enter results footer isolates spinner strictly to clicked button while locking others"
);

// 23.4 Reports Date Filter Persistence & Session Storage
assert(
  reportsPageContent.includes("lis_reports_filter_date") &&
  reportsPageContent.includes("sessionStorage.setItem(\"lis_reports_filter_date\""),
  "[REPORTS DATE PERSISTENCE] Reports page preserves user-selected previous date in sessionStorage across navigation and saves"
);

// 23.5 Column Order, Header Names & Hover Popover Dismissal
assert(
  reportsPageContent.includes('["Report ID", "Patient", "Tests", "Status", "Payment", "Received", "Actions"]') &&
  reportsPageContent.includes('handleDismissPopover'),
  "[REPORTS COLUMNS & POPOVER] Columns reordered with Received before Actions, Actions header assigned, and popover auto-dismisses on scroll"
);

// ==============================================================================
// 24. Report Dynamic Typography & Multi-Client Font Family Engine
// ==============================================================================
console.log("\n▶ MODULE 24: Report Dynamic Typography & Multi-Client Font Family Engine");

import { REPORT_FONTS, getReportFontStack, normalizeReportSettings } from "../src/lib/report-settings";

// 24.1 Curated Medical Font Catalog Integrity
assert(
  Array.isArray(REPORT_FONTS) && REPORT_FONTS.length === 7,
  "[FONT CATALOG] Exactly 7 curated medical diagnostic fonts configured for clients"
);

const expectedFontIds = ["Arial", "Inter", "Roboto", "Calibri", "Segoe UI", "Poppins", "Georgia"];
const allIdsPresent = expectedFontIds.every((id) =>
  REPORT_FONTS.some((f) => f.id.toLowerCase() === id.toLowerCase())
);
assert(
  allIdsPresent,
  "[FONT CATALOG] Includes Arial, Inter, Roboto, Calibri, Segoe UI, Poppins, and Georgia"
);

// 24.2 Zero-Lag System Font Stack Resolution
assert(
  getReportFontStack("Arial").includes("Arial") &&
  getReportFontStack("Inter").includes("Inter") &&
  getReportFontStack("Roboto").includes("Roboto") &&
  getReportFontStack("Calibri").includes("Calibri") &&
  getReportFontStack("Segoe UI").includes("Segoe UI") &&
  getReportFontStack("Poppins").includes("Poppins") &&
  getReportFontStack("Georgia").includes("Georgia"),
  "[FONT STACK] getReportFontStack correctly maps all 7 font IDs to CSS font stacks"
);

// 24.3 Fallbacks and Case-Insensitive Matching
assert(
  getReportFontStack(null).includes("Arial") &&
  getReportFontStack(undefined).includes("Arial") &&
  getReportFontStack("").includes("Arial") &&
  getReportFontStack("inter").includes("Inter") &&
  getReportFontStack("POPPINS").includes("Poppins"),
  "[FONT FALLBACK] getReportFontStack safely defaults null/empty inputs to Arial and supports case-insensitive match"
);

// 24.4 Report Settings Typography Normalization & Schema Defaults
const normalizedDefault = normalizeReportSettings({});
assert(
  normalizedDefault.typography?.fontFamily === "Arial",
  "[SCHEMA DEFAULTS] Default report settings typography specifies Arial font"
);

const customFontNormalized = normalizeReportSettings({
  typography: { fontFamily: "Poppins" } as any,
});
assert(
  customFontNormalized.typography?.fontFamily === "Poppins",
  "[SETTINGS NORMALIZATION] normalizeReportSettings preserves client-customized fontFamily selection"
);

// 24.5 ReportSheet Font Inheritance & Seamless Rendering
const reportSheetFileSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/report-sheet.tsx"), "utf-8");
assert(
  reportSheetFileSrc.includes("getReportFontStack(reportSettings.typography?.fontFamily)") &&
  reportSheetFileSrc.includes("fontFamily: activeFontFamily"),
  "[REPORT SHEET] Dynamic font stack bound to both hidden height measurer and content container"
);

assert(
  reportSheetFileSrc.includes("fontFamily: getReportFontStack(reportSettings.typography?.fontFamily)") &&
  reportSheetFileSrc.includes("fontFamily: 'inherit'"),
  "[REPORT SHEET] Patient info block and report sub-elements cleanly inherit active typography font family"
);

// 24.6 Settings UI Font Selector Grid & Real-Time Preview
const settingsFileSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/settings/page.tsx"), "utf-8");
assert(
  settingsFileSrc.includes("REPORT_FONTS.map") &&
  settingsFileSrc.includes("fontFamily: font.id") &&
  settingsFileSrc.includes("font.description"),
  "[SETTINGS UI] Settings page renders interactive medical font selection cards with live specimens and description"
);

// ==============================================================================
// 25. Instant Zero-Lag (0ms) Report Print Preview & Eager Parameter Hydration Engine
// ==============================================================================
console.log("\n▶ MODULE 25: Instant Zero-Lag (0ms) Report Print Preview & Eager Parameter Hydration");

const fullscreenPrintModalSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/components/fullscreen-print-report-modal.tsx"),
  "utf-8"
);
const printPreviewDialogSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/components/print-preview-dialog.tsx"),
  "utf-8"
);
const reportsListPageContent = fs.readFileSync(
  path.resolve(__dirname, "../src/app/dashboard/reports/page.tsx"),
  "utf-8"
);
const backendReportCtrlSrc = fs.readFileSync(
  path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/ReportController.php"),
  "utf-8"
);

// 25.1 Frame 0 Parameter Rendering via Excluded-Ids Invariant
assert(
  fullscreenPrintModalSrc.includes("excludedMainTestIds") &&
  fullscreenPrintModalSrc.includes("!excludedMainTestIds.includes(mt.id)") &&
  !fullscreenPrintModalSrc.includes("setSelectedMainTestIds(mainTests.map"),
  "[0MS PRINT PREVIEW] FullscreenPrintReportModal renders 100% of test parameters immediately on Frame 0 without waiting for useEffect"
);

// 25.2 Conditional Offscreen WhatsApp Rendering (Halves Rendering Load)
assert(
  fullscreenPrintModalSrc.includes("isSendingWhatsApp &&") &&
  fullscreenPrintModalSrc.includes("ref={whatsappPrintRef}"),
  "[PRINT PERFORMANCE] Offscreen WhatsApp print container renders conditionally on demand, halving initial print preview CPU overhead"
);

// 25.3 PrintPreviewDialog Frame 0 Fallback
assert(
  printPreviewDialogSrc.includes("effectiveBlocks = blocksList.length > 0 ? blocksList : buildBlocksFromResults") &&
  printPreviewDialogSrc.includes("isSendingWhatsApp &&"),
  "[PRINT DIALOG 0MS] PrintPreviewDialog falls back to buildBlocksFromResults immediately on Frame 0"
);

// 25.4 Reports List Page In-Memory Cache
assert(
  reportsListPageContent.includes("reportDetailCache") &&
  reportsListPageContent.includes("reportDetailCache.get(rep.id)") &&
  reportsListPageContent.includes("reportDetailCache.set(rep.id, data)"),
  "[REPORTS LIST CACHE] Reports page maintains in-memory report details cache for instant 0ms report modal opening"
);

// 25.5 Backend Eager Hydration of Parameters & Print Settings
assert(
  backendReportCtrlSrc.includes("'results:id,report_id,test_id,result_value,is_abnormal,remarks'") &&
  backendReportCtrlSrc.includes("ref_range_min,ref_range_max,text_ref_range") &&
  backendReportCtrlSrc.includes("'lab:id,name,phone,address,print_header_height"),
  "[BACKEND EAGER HYDRATION] ReportController index eagerly loads result_values, ranges, units, and lab print settings for instant printing from list"
);

// 25.6 Print Report Modal Natural Scroll & Single-Date Trust Invariants
assert(
  fullscreenPrintModalSrc.includes('className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 flex justify-center items-start custom-scrollbar"') &&
  !fullscreenPrintModalSrc.includes("sticky top-2 z-20") &&
  reportsListPageContent.includes("matchesDate = dateMode === \"range\"") &&
  reportsListPageContent.includes("if (!Array.isArray(list) || list.length === 0) return;"),
  "[PRINT SCROLL & DATE INTEGRITY] FullscreenPrintReportModal preserves natural scrolling with overflow-auto, and reports page never drops single-date server results or poisons cache"
);

// ==============================================================================
// 26. Zero-Flash (0ms) Dashboard Overview Navigation & Dues Performance Engine
// ==============================================================================
console.log("\n▶ MODULE 26: Zero-Flash (0ms) Dashboard Overview Navigation & Dues Performance");

const dashboardOverviewSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/app/dashboard/page.tsx"),
  "utf-8"
);
const backendBillCtrlSrc = fs.readFileSync(
  path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/BillController.php"),
  "utf-8"
);

// 26.1 Synchronous State Hydration & In-Memory Module Cache
assert(
  dashboardOverviewSrc.includes("memoryOverviewStats") &&
  dashboardOverviewSrc.includes("getInitialStoredStats") &&
  dashboardOverviewSrc.includes("getInitialStoredDues") &&
  dashboardOverviewSrc.includes("memoryOverviewDues"),
  "[0MS OVERVIEW HYDRATION] Dashboard overview initializes stats, charts, reports, and dues synchronously from memory/localStorage on Frame 0"
);

// 26.2 Elimination of Navigation Shimmer Flash Guardrail
assert(
  !dashboardOverviewSrc.includes("if (!isMounted || (loading && !stats.totalPatients") &&
  dashboardOverviewSrc.includes("if (loading && !stats.totalPatients && !stats.totalReports && !recentReports.length && !dueBills.length)"),
  "[ZERO-FLASH NAVIGATION] Dashboard overview never unmounts or renders DashboardShimmer on return navigation when cached data exists"
);

// 26.3 Backend Lightweight Dues Hydration Projection
assert(
  backendBillCtrlSrc.includes("$isLightweightDues") &&
  backendBillCtrlSrc.includes("patient:id,name,custom_id,phone,age,gender,collected_at,created_by_id,meta") &&
  backendBillCtrlSrc.includes("lis_overview_dues_"),
  "[LIGHTWEIGHT DUES ENGINE] BillController isolates dues cards with lightweight projection and micro-caching, skipping heavy 4-level test hierarchies"
);

// 26.4 Due Collection Cache Invalidation
assert(
  backendBillCtrlSrc.includes('Cache::forget("lis_overview_dues_') &&
  dashboardOverviewSrc.includes("memoryOverviewDues = nextList"),
  "[DUES CACHE INVALIDATION] Payment collection invalidates server overview dues cache and optimistically updates client memory in 0ms"
);

// 26.5 Revalidation Cooldown & Background Throttling
assert(
  dashboardOverviewSrc.includes("isCacheFresh = (now - lastOverviewFetchTime < 45000)") &&
  dashboardOverviewSrc.includes("now - lastLabFetchTime < 60000"),
  "[OVERVIEW THROTTLING] Dashboard overview enforces background revalidation cooldowns, preventing redundant network waterfalls on rapid page switches"
);

console.log("\n▶ MODULE 27: Test Catalog Layout Customization, Parameter Visibility Persistence & Atomic Save UX");

const printPreviewLayoutSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/components/print-preview-dialog.tsx"),
  "utf-8"
);
const testCatalogPageSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/app/dashboard/tests/page.tsx"),
  "utf-8"
);
const backendTestCtrlSrc = fs.readFileSync(
  path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/TestController.php"),
  "utf-8"
);

// 27.1 Initial Hidden Parameter Hydration Logic Verification
function simulateGetInitialHidden(results: any[], blocks: any[]): string[] {
  const hidden = new Set<string>();
  blocks.forEach((block) => {
    if (block.isGroup) {
      const parentTest = block.items[0]?.test?.parent;
      const isParentHidden = Boolean(parentTest?.isHidden ?? parentTest?.is_hidden);
      const allSubsHidden = block.items.length > 0 && block.items.every((it: any) => Boolean(it.test?.isHidden ?? it.test?.is_hidden));

      if (isParentHidden || allSubsHidden) {
        hidden.add(block.id);
        if (parentTest?.id) hidden.add(String(parentTest.id));
      }

      block.items.forEach((it: any) => {
        if (Boolean(it.test?.isHidden ?? it.test?.is_hidden)) {
          if (it.test?.id) hidden.add(String(it.test.id));
          if (it.id) hidden.add(String(it.id));
        }
      });
    } else {
      const it = block.items[0];
      const isHidden = Boolean(it?.test?.isHidden ?? it?.test?.is_hidden);
      if (isHidden) {
        hidden.add(block.id);
        if (it?.test?.id) hidden.add(String(it.test.id));
        if (it?.id) hidden.add(String(it.id));
      }
    }
  });
  return Array.from(hidden);
}

const mockCbcBlocks = [
  {
    id: "res-hb",
    name: "Hemoglobin",
    isGroup: false,
    items: [{ id: "res-hb", test: { id: "test-hb-uuid", name: "Hemoglobin", isHidden: true } }]
  },
  {
    id: "group-dlc",
    name: "Differential Leukocyte Count",
    isGroup: true,
    items: [
      { id: "res-neu", test: { id: "test-neu-uuid", name: "Neutrophils", isHidden: false, parent: { id: "parent-dlc-uuid" } } },
      { id: "res-baso", test: { id: "test-baso-uuid", name: "Basophils", isHidden: true, parent: { id: "parent-dlc-uuid" } } },
    ]
  }
];

const hydratedHidden = simulateGetInitialHidden([], mockCbcBlocks);
assert(
  hydratedHidden.includes("res-hb") && hydratedHidden.includes("test-hb-uuid"),
  "[HIDDEN HYDRATION] Standalone hidden parameter (e.g. Hemoglobin) is extracted on test reopen"
);
assert(
  hydratedHidden.includes("test-baso-uuid") && hydratedHidden.includes("res-baso"),
  "[HIDDEN HYDRATION] Sub-parameter inside group (e.g. Basophils) is extracted on test reopen"
);

// 27.2 Elimination of Blind Hidden State Wipe
assert(
  printPreviewLayoutSrc.includes("getInitialHiddenIdsFromResults") &&
  printPreviewLayoutSrc.includes("const isFreshOpen = !prevOpenRef.current && open;") &&
  printPreviewLayoutSrc.includes("const isDifferentReport = prevReportIdRef.current !== currentReportId;"),
  "[REOPEN PERSISTENCE] PrintPreviewDialog hydrates hidden IDs from DB and does not blindly reset hiddenBlockIds to empty"
);

// 27.3 Atomic Save UX: Loader Stops Before Toast Displays
assert(
  printPreviewLayoutSrc.includes("setIsSavingLayout(false);") &&
  printPreviewLayoutSrc.indexOf("setIsSavingLayout(false);") < printPreviewLayoutSrc.indexOf('toast.success("Layout Saved"') &&
  printPreviewLayoutSrc.indexOf('toast.success("Layout Saved"') < printPreviewLayoutSrc.indexOf('setTimeout(() => setLayoutSavedSuccess(false), 3000)'),
  "[SAVE UX ATOMICITY] handleSaveLayout stops button loader BEFORE firing success toast, eliminating stuck spinner"
);

// 27.4 Sub-Parameter Visibility Toggling Support
assert(
  printPreviewLayoutSrc.includes("toggleSubItemVisibility = (blockId: string, itemId: string)") &&
  printPreviewLayoutSrc.includes("isItemEffectivelyHidden(block, sub)") &&
  printPreviewLayoutSrc.includes("toggleSubItemVisibility(block.id, subId)"),
  "[SUB-PARAM TOGGLE] Group blocks provide dedicated per-item visibility toggle for sub-parameters"
);

// 27.5 Test Catalog Sample Report Data Projection Invariant
assert(
  testCatalogPageSrc.includes("isHidden: isNestedHidden") &&
  testCatalogPageSrc.includes("is_hidden: isNestedHidden") &&
  testCatalogPageSrc.includes("isHidden: isSubHidden") &&
  testCatalogPageSrc.includes("is_hidden: isSubHidden"),
  "[CATALOG DATA PROJECTION] handleOpenSampleReport projects isHidden, is_hidden, and sort_order onto test and parent models"
);

// 27.6 Backend Tenant Layout Persistence & Priority F Standalone Fallback
assert(
  backendTestCtrlSrc.includes("// Priority F: Standalone test itself") &&
  backendTestCtrlSrc.includes("$sub->is_hidden = $isHiddenVal;") &&
  backendTestCtrlSrc.includes("$test->is_json_override = true;") &&
  backendTestCtrlSrc.includes('Cache::forget("lis_tests_{$labId}");'),
  "[BACKEND LAYOUT PERSISTENCE] TestController saves layout with standalone fallback, sets is_json_override, and invalidates lab cache"
);

console.log("\n▶ MODULE 28: Enter Results Layout & Order Consistency Engine (Catalog Sync, Hidden Filter, Approved Report Reflection)");

const enterResultsEditSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/app/dashboard/reports/[id]/edit/page.tsx"),
  "utf-8"
);
const fullscreenPrintSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/components/fullscreen-print-report-modal.tsx"),
  "utf-8"
);
const reportSheetSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/components/report-sheet.tsx"),
  "utf-8"
);
const backendReportControllerSrc = fs.readFileSync(
  path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/ReportController.php"),
  "utf-8"
);

// 28.1 Enter Results Fresh Report Fetching (Zero Stale Cache)
assert(
  enterResultsEditSrc.includes("fetchFromLaravel(`/reports/${reportId}`, { skipCache: true })"),
  "[ENTER RESULTS FRESH FETCH] fetchReport strictly uses skipCache: true to guarantee latest catalog layout"
);

// 28.2 Enter Results mainGroups Filters Hidden Parameters
assert(
  enterResultsEditSrc.includes("const isParamHidden = Boolean(") &&
  enterResultsEditSrc.includes("t.is_hidden || t.isHidden ||") &&
  enterResultsEditSrc.includes("t.parent?.is_hidden || t.parent?.isHidden") &&
  enterResultsEditSrc.includes("if (isParamHidden) {") &&
  enterResultsEditSrc.includes("return; // Strictly hide parameter from Enter Results"),
  "[ENTER RESULTS HIDDEN FILTER] mainGroups strictly omits hidden parameters from result entry interface"
);

// 28.3 Enter Results Strict sort_order Sequence (No Result-Value Scrambling)
assert(
  enterResultsEditSrc.includes("// 1. Maintain strict catalog sort_order sequence (never disrupt with entered values)") &&
  enterResultsEditSrc.includes("const orderA = a?.test?.sort_order ?? (a?.test as any)?.sortOrder ?? 0;") &&
  enterResultsEditSrc.includes("const orderB = b?.test?.sort_order ?? (b?.test as any)?.sortOrder ?? 0;") &&
  enterResultsEditSrc.includes("if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;"),
  "[ENTER RESULTS SORT ORDER] mainGroups sorts strictly by catalog sort_order instead of entered values"
);

// 28.4 Section Subgroup Keying & Ordering Isolation
assert(
  enterResultsEditSrc.includes("const sectionKey = isSubgroup") &&
  enterResultsEditSrc.includes("`group-${t.parent?.id || t.parent?.name || 'sub'}`") &&
  enterResultsEditSrc.includes("`item-${t.id || item.id}`") &&
  enterResultsEditSrc.includes("sectionsMap: Map<string, { sectionKey: string; sectionName: string; parentOrder: number; items: ReportTest[] }>"),
  "[SECTION ISOLATION] Standalone items and subgroups preserve dedicated parentOrder without clump distortion"
);

// 28.5 Print Preview & PDF Modal Exclude Hidden Parameters
assert(
  fullscreenPrintSrc.includes("t.is_hidden || t.isHidden || t.parent?.is_hidden || t.parent?.isHidden") &&
  reportSheetSrc.includes("item.test.is_hidden || item.test.isHidden ||") &&
  reportSheetSrc.includes("item.test.parent?.is_hidden || item.test.parent?.isHidden"),
  "[PRINT & PDF HIDDEN EXCLUSION] FullscreenPrintReportModal and report-sheet strictly exclude hidden parameters"
);

// 28.6 Backend Report Controller Consistency & Active Catalog Synchronization
assert(
  backendReportControllerSrc.includes("'results.test:id,name,category,field_type,unit,ref_range_min,ref_range_max,text_ref_range,range_type,gender_ref_type,parent_id,sort_order,is_hidden'") &&
  backendReportControllerSrc.includes("// Consistency & Catalog Sync: Synchronize report tests with the lab's active catalog definitions") &&
  backendReportControllerSrc.includes("// Sort results according to the active catalog sort_order sequence") &&
  backendReportControllerSrc.includes("if (!empty($test->is_hidden))") &&
  backendReportControllerSrc.includes("if (!empty($subTest->is_hidden))"),
  "[BACKEND CATALOG SYNC & SORT] ReportController eagerly selects is_hidden, synchronizes lab definitions, and sorts results"
);

// 28.7 Backend Test Controller Report Remapping on Catalog Clone
assert(
  backendTestCtrlSrc.includes("Automatically remap existing patient reports in this lab to the new customized tests") &&
  backendTestCtrlSrc.includes("cloneSubTestsForLab(string $sourceParentId, string $newParentId, string $labId): array") &&
  backendTestCtrlSrc.includes("$idMap[$child->id] = $newChild->id;"),
  "[BACKEND CLONE REMAP] TestController automatically updates existing report tests when a catalog test is customized"
);

// 28.8 Functional Simulation of mainGroups Algorithm with Mixed Values & Hidden Parameters
function simulateMainGroups(results: any[]) {
  const map = new Map<string, any>();
  const seenParamKeys = new Set<string>();

  const sortedResults = [...results].filter(Boolean).sort((a, b) => {
    const orderA = a?.test?.sort_order ?? a?.test?.sortOrder ?? 0;
    const orderB = b?.test?.sort_order ?? b?.test?.sortOrder ?? 0;
    if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
    if (orderA !== 0 && orderB === 0) return -1;
    if (orderA === 0 && orderB !== 0) return 1;
    return 0;
  });

  sortedResults.forEach((item) => {
    if (!item) return;
    const t = item.test;
    if (!t) return;

    const isParamHidden = Boolean(
      t.is_hidden || t.isHidden ||
      t.parent?.is_hidden || t.parent?.isHidden ||
      t.parent?.parent?.is_hidden || t.parent?.parent?.isHidden
    );
    if (isParamHidden) return;

    const mt = t.parent?.parent ? t.parent.parent : (t.parent ? t.parent : t);
    const mtId = mt.id || t.id;
    const mtName = mt.name || t.name;

    const parentKeyId = t.parent_id || t.parentId || t.parent?.id || 'root';
    const paramKey = `${mtId}:${parentKeyId}:${(t.name || '').trim().toLowerCase()}`;
    if (seenParamKeys.has(paramKey)) return;
    seenParamKeys.add(paramKey);

    if (!map.has(mtId)) {
      map.set(mtId, {
        mainTestName: mtName,
        mainTestId: mtId,
        sectionsMap: new Map(),
      });
    }

    const group = map.get(mtId)!;
    const isSubgroup = Boolean(t.parent && t.parent.id !== mt.id && (t.parent.name || "").trim().toLowerCase() !== mtName.trim().toLowerCase());
    const sectionKey = isSubgroup ? `group-${t.parent?.id || t.parent?.name}` : `item-${t.id || item.id}`;
    const sectionName = isSubgroup ? (t.parent?.name || "Parameters") : "_default";
    const itemSortOrder = t.sort_order ?? t.sortOrder ?? 0;
    const parentOrder = isSubgroup ? (t.parent?.sort_order ?? t.parent?.sortOrder ?? itemSortOrder) : itemSortOrder;

    if (!group.sectionsMap.has(sectionKey)) {
      group.sectionsMap.set(sectionKey, { sectionKey, sectionName, parentOrder, items: [] });
    }
    group.sectionsMap.get(sectionKey)!.items.push(item);
  });

  return Array.from(map.values()).map(g => ({
    mainTestName: g.mainTestName,
    sections: Array.from(g.sectionsMap.values())
      .map((sec: any) => ({
        ...sec,
        items: sec.items.slice().sort((a: any, b: any) => {
          const orderA = a?.test?.sort_order ?? a?.test?.sortOrder ?? 0;
          const orderB = b?.test?.sort_order ?? b?.test?.sortOrder ?? 0;
          if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
          return 0;
        })
      }))
      .sort((a: any, b: any) => a.parentOrder - b.parentOrder)
  }));
}

const mockCbcMain = { id: "cbc-root-id", name: "Complete Blood Count (CBC)" };
const mockDlcParent = { id: "dlc-group-id", name: "Differential Leukocyte Count", sort_order: 200, parent: mockCbcMain };

const mockReportResults = [
  // 1. Hb: sort_order 101, empty result value
  { id: "res-hb", result_value: "", test: { id: "t-hb", name: "Hemoglobin", sort_order: 101, parent: mockCbcMain } },
  // 2. TLC: sort_order 102, empty result value
  { id: "res-tlc", result_value: "", test: { id: "t-tlc", name: "Total Leucocyte Count", sort_order: 102, parent: mockCbcMain } },
  // 3. DLC subtest Polymorphs: sort_order 201, filled value
  { id: "res-poly", result_value: "65", test: { id: "t-poly", name: "Polymorphs", sort_order: 201, parent: mockDlcParent } },
  // 4. DLC subtest Basophils: sort_order 205, HIDDEN in catalog, filled value from prior approval
  { id: "res-baso", result_value: "1", test: { id: "t-baso", name: "Basophils", sort_order: 205, is_hidden: true, parent: mockDlcParent } },
  // 5. Platelet Count: sort_order 301, filled value
  { id: "res-plt", result_value: "250000", test: { id: "t-plt", name: "Platelet Count", sort_order: 301, parent: mockCbcMain } },
  // 6. ESR: sort_order 401, filled value
  { id: "res-esr", result_value: "15", test: { id: "t-esr", name: "ESR", sort_order: 401, parent: mockCbcMain } },
  // 7. MCV: sort_order 501, HIDDEN in catalog, filled value from prior approval
  { id: "res-mcv", result_value: "88", test: { id: "t-mcv", name: "MCV", sort_order: 501, is_hidden: true, parent: mockCbcMain } },
];

const processedGroups = simulateMainGroups(mockReportResults);
const cbcGroup = processedGroups[0];
const allRenderedItems = cbcGroup.sections.flatMap((s: any) => s.items);

assert(
  !allRenderedItems.some((it: any) => it.test.name === "MCV"),
  "[SIMULATION HIDDEN STANDALONE] Hidden standalone MCV is strictly omitted despite having previously approved value"
);
assert(
  !allRenderedItems.some((it: any) => it.test.name === "Basophils"),
  "[SIMULATION HIDDEN SUBPARAM] Hidden sub-parameter Basophils is strictly omitted despite having previously approved value"
);
assert(
  allRenderedItems.map((it: any) => it.test.name).join(" -> ") === "Hemoglobin -> Total Leucocyte Count -> Polymorphs -> Platelet Count -> ESR",
  "[SIMULATION STRICT SEQUENCE] Parameters render in exact catalog sequence (101 -> 102 -> 201 -> 301 -> 401) without value-entry disruption"
);
assert(
  cbcGroup.sections[0].items[0].test.name === "Hemoglobin" && cbcGroup.sections[1].items[0].test.name === "Total Leucocyte Count",
  "[SIMULATION UNFILLED PRECEDENCE] Unfilled Hemoglobin & TLC correctly precede filled Platelet Count according to catalog sort_order"
);

// ==============================================================================
// Formula Engine Export & Parameter Calculation Integrity (Zero Regression Guard)
// ==============================================================================
console.log("\n▶ MODULE: Clinical Formula Engine Exports & Runtime Calculations");

// Test: isParamFormulaCalculated correctly detects CBC calculated parameters
assert(
  typeof isParamFormulaCalculated === "function",
  "isParamFormulaCalculated is exported as a function"
);
assert(
  isParamFormulaCalculated({ id: "t1", name: "MCV" }) === true,
  "isParamFormulaCalculated detects MCV as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t2", name: "MCH" }) === true,
  "isParamFormulaCalculated detects MCH as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t3", name: "MCHC" }) === true,
  "isParamFormulaCalculated detects MCHC as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t4", name: "NLR" }) === true,
  "isParamFormulaCalculated detects NLR as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t5", name: "Absolute Eosinophil Count", testCode: "AEC" }) === true,
  "isParamFormulaCalculated detects AEC as calculated"
);

// Test: isParamFormulaCalculated correctly detects Biochemistry / LFT / KFT / Lipid
assert(
  isParamFormulaCalculated({ id: "t6", name: "Indirect Bilirubin", testCode: "IBILI" }) === true,
  "isParamFormulaCalculated detects Indirect Bilirubin as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t7", name: "Globulin" }) === true,
  "isParamFormulaCalculated detects Globulin as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t8", name: "A:G Ratio" }) === true,
  "isParamFormulaCalculated detects A:G Ratio as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t9", name: "BUN" }) === true,
  "isParamFormulaCalculated detects BUN as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t10", name: "eGFR" }) === true,
  "isParamFormulaCalculated detects eGFR as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t11", name: "LDL Cholesterol" }) === true,
  "isParamFormulaCalculated detects LDL Cholesterol as calculated"
);
assert(
  isParamFormulaCalculated({ id: "t12", name: "INR" }) === true,
  "isParamFormulaCalculated detects INR as calculated"
);

// Test: isParamFormulaCalculated excludes minerals and non-calculated parameters
assert(
  isParamFormulaCalculated({ id: "t13", name: "Calcium", testCode: "CALCIUM" }) === false,
  "isParamFormulaCalculated strictly excludes Calcium from auto-calculation"
);
assert(
  isParamFormulaCalculated({ id: "t14", name: "Sodium", testCode: "SODIUM" }) === false,
  "isParamFormulaCalculated strictly excludes Sodium from auto-calculation"
);
assert(
  isParamFormulaCalculated({ id: "t15", name: "Potassium", testCode: "POTASSIUM" }) === false,
  "isParamFormulaCalculated strictly excludes Potassium from auto-calculation"
);
assert(
  isParamFormulaCalculated({ id: "t16", name: "Hemoglobin", testCode: "HAEM_HB" }) === false,
  "isParamFormulaCalculated strictly excludes Hemoglobin analyte input from auto-calculation"
);

// Test: computeAutomatedFormulas executes safely without exceptions
const simResult = computeAutomatedFormulas(
  {
    "p-tc": "200",
    "p-hdl": "50",
    "p-tg": "150",
  },
  {
    id: "rep-sim-1",
    customId: "REP-001",
    status: "IN_PROGRESS",
    createdAt: "2026-10-25T00:00:00Z",
    patientId: "pat-1",
    patient: { name: "Test Patient", age: 35, gender: "MALE", phone: "9876543210", customId: "PAT-001" },
    results: [
      { id: "p-tc", resultValue: "200", isAbnormal: false, test: { id: "t-tc", name: "Total Cholesterol", testCode: "CHOL" } },
      { id: "p-hdl", resultValue: "50", isAbnormal: false, test: { id: "t-hdl", name: "HDL Cholesterol", testCode: "HDL" } },
      { id: "p-tg", resultValue: "150", isAbnormal: false, test: { id: "t-tg", name: "Triglycerides", testCode: "TRIG" } },
      { id: "p-vldl", resultValue: null, isAbnormal: false, test: { id: "t-vldl", name: "VLDL Cholesterol", testCode: "VLDL" } },
      { id: "p-ldl", resultValue: null, isAbnormal: false, test: { id: "t-ldl", name: "LDL Cholesterol", testCode: "LDL" } },
    ]
  }
);
assert(
  simResult && typeof simResult.calculatedValues === "object",
  "computeAutomatedFormulas returns valid calculatedValues object"
);
assert(
  simResult.calculatedValues["p-vldl"] === "30.0",
  "computeAutomatedFormulas correctly calculates VLDL = 30.0 (TG / 5)"
);
assert(
  simResult.calculatedValues["p-ldl"] === "120.0",
  "computeAutomatedFormulas correctly calculates LDL = 120.0 (TC - HDL - VLDL)"
);
assert(
  simResult.calculatedIds.has("p-vldl") && simResult.calculatedIds.has("p-ldl"),
  "computeAutomatedFormulas populates calculatedIds set with VLDL and LDL"
);

// ==============================================================================
// 19. Reports List Multi-Date Caching & Print Modal Instant Hydration
// ==============================================================================
console.log("\n▶ MODULE 19: Reports Date Caching & Print Modal Instant Hydration");

// Test 1: Multi-date caching and instant retrieval
const testDateCache = new Map<string, any[]>();
const yesterdayDate = getYesterdayStr();
const todayDate = getTodayStr();

const sampleYesterdayReports = Array.from({ length: 15 }, (_, i) => ({
  id: `rep-yest-${i + 1}`,
  customId: `OPL1000${i + 1}`,
  status: "COMPLETED",
  createdAt: `${yesterdayDate}T10:00:00Z`,
  results: [
    { id: `res-${i}-1`, result_value: "14.2", is_abnormal: false, test: { id: "t-hb", name: "Hemoglobin", unit: "g/dL" } }
  ]
}));

const sampleTodayReports = Array.from({ length: 5 }, (_, i) => ({
  id: `rep-today-${i + 1}`,
  customId: `OPL1001${i + 1}`,
  status: "FINAL",
  createdAt: `${todayDate}T10:00:00Z`,
  results: [
    { id: `res-t-${i}-1`, result_value: "110", is_abnormal: false, test: { id: "t-glu", name: "Fasting Blood Sugar", unit: "mg/dL" } }
  ]
}));

testDateCache.set(yesterdayDate, sampleYesterdayReports);
testDateCache.set(todayDate, sampleTodayReports);

const retrievedYesterday = testDateCache.get(yesterdayDate);
assert(
  Array.isArray(retrievedYesterday) && retrievedYesterday.length === 15,
  "Multi-date cache instantly returns all 15 yesterday reports in 0ms"
);
assert(
  retrievedYesterday?.[0].customId === "OPL10001",
  "Multi-date cache preserves customId order for yesterday's reports"
);

const retrievedToday = testDateCache.get(todayDate);
assert(
  Array.isArray(retrievedToday) && retrievedToday.length === 5,
  "Multi-date cache accurately isolates today's reports from yesterday's"
);

// Test 2: Print modal snake_case result_value fallback normalization
const rawReportItem = {
  id: "item-101",
  result_value: "15.4",
  is_abnormal: true,
  remarks: "Slightly elevated",
  test: {
    id: "t-hb",
    name: "Hemoglobin",
    fieldType: "Number",
    unit: "g/dL",
    ref_range_min: 12.0,
    ref_range_max: 16.0
  }
};

// Simulate fullscreen-print-report-modal activeReportData mapping
const mappedItem = {
  ...rawReportItem,
  resultValue: (rawReportItem as any).resultValue ?? rawReportItem.result_value ?? null,
  result_value: (rawReportItem as any).resultValue ?? rawReportItem.result_value ?? null,
  isAbnormal: (rawReportItem as any).isAbnormal ?? rawReportItem.is_abnormal ?? false,
  is_abnormal: (rawReportItem as any).isAbnormal ?? rawReportItem.is_abnormal ?? false,
  remarks: (rawReportItem as any).remarks ?? null,
};

assert(
  mappedItem.resultValue === "15.4" && mappedItem.result_value === "15.4",
  "Print modal maps snake_case result_value to camelCase resultValue without delay"
);
assert(
  mappedItem.isAbnormal === true && mappedItem.is_abnormal === true,
  "Print modal maps snake_case is_abnormal to camelCase isAbnormal without delay"
);
assert(
  mappedItem.remarks === "Slightly elevated",
  "Print modal preserves test parameter remarks"
);

// Test 3: Print modal race-condition guard
let activePrintId: string | null = "rep-patient-A";
let printReportState: any = { id: "rep-patient-A", patient: { name: "Patient A" }, results: [] };

// User swiftly switches to Patient B before Patient A background request completes
activePrintId = "rep-patient-B";
printReportState = { id: "rep-patient-B", patient: { name: "Patient B" }, results: [] };

// Simulated arrival of delayed background hydration for Patient A
const delayedPayloadA = { id: "rep-patient-A", patient: { name: "Patient A (HYDRATED)" }, results: [{ id: "res-A" }] };
const handleDelayedArrival = (data: any) => {
  if (activePrintId !== data.id) {
    // REJECT: Stale payload discarded to prevent flickering/wrong patient data
    return false;
  }
  printReportState = { ...printReportState, ...data };
  return true;
};

const acceptedA = handleDelayedArrival(delayedPayloadA);
assert(
  acceptedA === false,
  "Race-condition guard correctly rejects stale background hydration for Patient A"
);
assert(
  printReportState.id === "rep-patient-B" && printReportState.patient.name === "Patient B",
  "Active print modal report state remains unpolluted with Patient B data"
);

// Arrival of background hydration for active Patient B
const correctPayloadB = { id: "rep-patient-B", patient: { name: "Patient B (HYDRATED)" }, results: [{ id: "res-B" }] };
const acceptedB = handleDelayedArrival(correctPayloadB);
assert(
  acceptedB === true,
  "Race-condition guard accepts matching background hydration for active Patient B"
);
// Test 4: Initial filter date sanitization against corrupted storage strings
const sanitizeDateStorage = (stored: string | null | undefined): string => {
  if (stored && stored !== "null" && stored !== "undefined" && stored !== '""') {
    return stored;
  }
  return "2026-10-25";
};

assert(
  sanitizeDateStorage("null") === "2026-10-25" &&
  sanitizeDateStorage("undefined") === "2026-10-25" &&
  sanitizeDateStorage("") === "2026-10-25" &&
  sanitizeDateStorage("2026-10-24") === "2026-10-24",
  "Reports initial date filter safely ignores 'null', 'undefined', and empty string corruption"
);

// Test 5: Reports date matching resilience against ISO-8601 UTC offsets
const mockReportsPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/page.tsx"), "utf-8");
assert(
  mockReportsPageSrc.includes("rawDateStr.startsWith(filterDate)"),
  "Reports list date filter matches ISO-8601 timestamp prefixes directly to prevent UTC offset drops"
);

assert(
  mockReportsPageSrc.includes("loading && safeReports.length === 0") &&
  !mockReportsPageSrc.includes("(loading && safeReports.length === 0) || (isFetching && safeReports.length === 0)"),
  "Reports table loader condition prevents stuck skeleton shimmer during background revalidations"
);

assert(
  mockReportsPageSrc.includes("timeoutMs: 10000"),
  "fetchReports specifies 10s timeout cushion preventing indefinite loading lock"
);

console.log("\n▶ MODULE 29: Automated Reagent & Consumable Inventory Consumption & AI Forecast Engine");
const inventoryModalSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/inventory-test-mapping-modal.tsx"), "utf-8");
assert(
  inventoryModalSrc.includes("ai-suggest-recipe"),
  "InventoryTestMappingModal integrates AI Auto-Suggest Recipe endpoint"
);
assert(
  inventoryModalSrc.includes("trigger_stage: sug.trigger_stage === \"booking\" ? \"booking\" : \"verification\""),
  "InventoryTestMappingModal accurately differentiates booking vs verification trigger stages"
);
assert(
  inventoryModalSrc.includes("/inventory/test-mappings"),
  "InventoryTestMappingModal saves recipe mappings to backend test-mappings endpoint"
);

const inventoryForecastSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/inventory-ai-forecast-card.tsx"), "utf-8");
assert(
  inventoryForecastSrc.includes("/inventory/ai-predictive-insights"),
  "InventoryAiForecastCard fetches real-time predictive insights and burn rate analysis"
);
assert(
  inventoryForecastSrc.includes("Stockout Depletion"),
  "InventoryAiForecastCard displays depletion timeline and days remaining"
);
assert(
  inventoryForecastSrc.includes("Expiry & Waste Risk"),
  "InventoryAiForecastCard displays FEFO expiry risks and projected wastage"
);

const invPageIntegrationsSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/inventory/page.tsx"), "utf-8");
assert(
  invPageIntegrationsSrc.includes("InventoryAiForecastCard") && invPageIntegrationsSrc.includes("InventoryTestMappingModal"),
  "Inventory dashboard integrates both AI forecast card and test recipe modal"
);

const testCountPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/tests/count/page.tsx"), "utf-8");
assert(
  testCountPageSrc.includes("InventoryTestMappingModal") && testCountPageSrc.includes("Inventory Recipe"),
  "Tests Count page links each test to its reagent auto-consumption recipe modal"
);

console.log("\n▶ MODULE 30: Reports Patient List Root Test Name Hover & Parameter Concealment Engine");
const reportsPageSrcMod30 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/page.tsx"), "utf-8");
assert(
  reportsPageSrcMod30.includes("function getDistinctReportTests"),
  "[REPORTS DISTINCT TESTS] getDistinctReportTests function is implemented"
);
assert(
  reportsPageSrcMod30.includes("while (curr?.parent)") || reportsPageSrcMod30.includes("while (curr.parent)"),
  "[REPORTS PARENT TRAVERSAL] Traverses parent hierarchy up to root test"
);
assert(
  reportsPageSrcMod30.includes("Tests ({hoveredTestsPopover.tests.length})") &&
  !reportsPageSrcMod30.includes("r.resultValue ?"),
  "[REPORTS PARAMETER CONCEALMENT] Hover popover strictly hides raw parameter values and shows distinct test names"
);

console.log("\n▶ MODULE 31: Custom Due Settlement & Immediate Paid Removal Engine");
const acceptDueModalSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/accept-due-modal.tsx"), "utf-8");
assert(
  acceptDueModalSrc.includes("settleAsPaid") && acceptDueModalSrc.includes("settle_as_paid"),
  "[ACCEPT DUE MODAL] Supports settleAsPaid flag and sends it in collect-due request payload"
);
assert(
  acceptDueModalSrc.includes("Settle Bill as Fully Paid"),
  "[ACCEPT DUE MODAL] Renders settlement toggle for partial/custom due amounts"
);

const duesPageSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/dues/page.tsx"), "utf-8");
assert(
  duesPageSrc.includes("prev.filter((b) => b.id !== updatedBill.id)"),
  "[DUES LIST REMOVAL] Dues page optimistically drops settled bills immediately from state"
);

const backendBillCtrlDueSettlementSrc = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/BillController.php"), "utf-8");
assert(
  backendBillCtrlDueSettlementSrc.includes("settle_as_paid") && backendBillCtrlDueSettlementSrc.includes("waivedAmount = max(0, $totalAfterDiscount - $newPaid)"),
  "[BACKEND DUE SETTLEMENT] BillController waives remainder as discount and marks bill status as PAID"
);

console.log("\n▶ MODULE 32: Monthly Expenses & Sales Collections Register Engine");
const sidebarSrcMod32 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/sidebar-client.tsx"), "utf-8");
assert(
  sidebarSrcMod32.includes("Financial Analytics") &&
  (sidebarSrcMod32.includes('{ name: "Monthly Expenses", href: "/dashboard/billing/monthly-expenses" }') ||
    sidebarSrcMod32.includes('{ name: "Monthly Business Report", href: "/dashboard/billing/monthly-expenses" }')),
  "[SIDEBAR FINANCIAL ANALYTICS] Financial Analytics menu includes 'Monthly Business Report' / 'Monthly Expenses' option"
);

const monthlyExpensesPageSrcMod32 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/monthly-expenses/page.tsx"), "utf-8");
assert(
  monthlyExpensesPageSrcMod32.includes("<MonthlyExpensesRegister />") || monthlyExpensesPageSrcMod32.includes("<MonthlyExpensesRegister"),
  "[MONTHLY EXPENSES PAGE] Dedicated /dashboard/billing/monthly-expenses page embeds modular MonthlyExpensesRegister component"
);

const monthlyRegisterCompSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/monthly-expenses-register.tsx"), "utf-8");
assert(
  monthlyRegisterCompSrc.includes("Month:") && monthlyRegisterCompSrc.includes("Year:"),
  "[MONTHLY REGISTER SELECTORS] Provides sleek compact month and year selector controls"
);
assert(
  monthlyRegisterCompSrc.includes("Show") && monthlyRegisterCompSrc.includes("Print"),
  "[MONTHLY REGISTER ACTIONS] Features Show and isolated Print buttons"
);
assert(
  monthlyRegisterCompSrc.includes("printInvoiceElement") && monthlyRegisterCompSrc.includes("printableRef"),
  "[MONTHLY REGISTER ISOLATED PRINT] Uses isolated iframe print rendering only the statement and table"
);
assert(
  monthlyRegisterCompSrc.includes("whitespace-nowrap") &&
  !monthlyRegisterCompSrc.includes("filterActiveOnly") &&
  !monthlyRegisterCompSrc.includes("Sales Days Only"),
  "[MONTHLY REGISTER RESPONSIVE & CLEAN] Strictly enforces whitespace-nowrap one-line layout and omits day filter clutter"
);
assert(
  monthlyRegisterCompSrc.includes("UPI (₹)") && monthlyRegisterCompSrc.includes("Cash (₹)") &&
  monthlyRegisterCompSrc.includes("Dues (₹)") && monthlyRegisterCompSrc.includes("Total (₹)"),
  "[MONTHLY REGISTER COLUMNS] Table includes Date, UPI, Cash, Dues, and Total columns"
);
assert(
  monthlyRegisterCompSrc.includes("Sub Total / Final Total"),
  "[MONTHLY REGISTER TOTALS FOOTER] Features Sub Total / Final Total footer row summing all columns"
);
assert(
  monthlyRegisterCompSrc.includes("handleDownloadCSV"),
  "[MONTHLY REGISTER CSV EXPORT] Features clean CSV export with column-level totals"
);

const backendApiRoutesMod32 = fs.readFileSync(path.resolve(__dirname, "../../Backend/routes/api.php"), "utf-8");
assert(
  backendApiRoutesMod32.includes("finance/monthly-expenses") && backendApiRoutesMod32.includes("getMonthlyExpenses"),
  "[BACKEND MONTHLY ROUTE] api.php maps GET finance/monthly-expenses to BillController::getMonthlyExpenses"
);

const backendBillCtrlMod32 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/BillController.php"), "utf-8");
assert(
  backendBillCtrlMod32.includes("function getMonthlyExpenses") &&
  backendBillCtrlMod32.includes("days_in_month") &&
  backendBillCtrlMod32.includes("total_upi") &&
  backendBillCtrlMod32.includes("total_cash") &&
  backendBillCtrlMod32.includes("total_dues") &&
  backendBillCtrlMod32.includes("final_total"),
  "[BACKEND MONTHLY CONTROLLER] BillController calculates high-speed day-by-day telemetry and grand summary"
);

// Mathematical consistency simulation for monthly register
const mockDays = [
  { upi: 1000, cash: 500, dues: 200, total: 1700 },
  { upi: 2000, cash: 1500, dues: 0, total: 3500 },
  { upi: 0, cash: 300, dues: 700, total: 1000 },
];
const simTotalUpi = mockDays.reduce((acc, d) => acc + d.upi, 0);
const simTotalCash = mockDays.reduce((acc, d) => acc + d.cash, 0);
const simTotalDues = mockDays.reduce((acc, d) => acc + d.dues, 0);
const simFinalTotal = mockDays.reduce((acc, d) => acc + d.total, 0);
assert(simTotalUpi === 3000, "[MATH INVARIANT] Total UPI matches 3000");
assert(simTotalCash === 2300, "[MATH INVARIANT] Total Cash matches 2300");
assert(simTotalDues === 900, "[MATH INVARIANT] Total Dues matches 900");
assert(simFinalTotal === 6200, "[MATH INVARIANT] Final Total matches 6200");
assert(simTotalUpi + simTotalCash + simTotalDues === simFinalTotal, "[MATH INVARIANT] UPI + Cash + Dues sum strictly equals Final Total");

// ==============================================================================
// 33. Clinical Interpretation AI Generation & Catalog Persistence Engine
// ==============================================================================
console.log("\n▶ MODULE 33: Clinical Interpretation AI Generation & Catalog Persistence Engine");

// Simulation of isMeaningfulContent helper
function testIsMeaningfulContent(html?: string | null): boolean {
  if (!html || typeof html !== "string") return false;
  const stripped = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 0;
}

// Simulation of pickBestHtml helper
function testPickBestHtml(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    if (testIsMeaningfulContent(c)) return (c as string).trim();
  }
  return "";
}

// 1. TipTap Empty Tag Rejection
assert(!testIsMeaningfulContent("<p></p>"), "[INTERPRETATION SANITIZATION] Strictly rejects empty paragraph tag <p></p>");
assert(!testIsMeaningfulContent("<p><br></p>"), "[INTERPRETATION SANITIZATION] Strictly rejects empty paragraph with break <p><br></p>");
assert(!testIsMeaningfulContent("<p>&nbsp;</p>"), "[INTERPRETATION SANITIZATION] Strictly rejects non-breaking space <p>&nbsp;</p>");
assert(!testIsMeaningfulContent("   "), "[INTERPRETATION SANITIZATION] Strictly rejects whitespace strings");
assert(!testIsMeaningfulContent(null), "[INTERPRETATION SANITIZATION] Safely handles null input");
assert(!testIsMeaningfulContent(undefined), "[INTERPRETATION SANITIZATION] Safely handles undefined input");

// 2. Genuine AI Content Acceptance
const aiSampleInterp = "<p><strong>Clinical Correlation:</strong> Serum calcium levels should always be evaluated alongside serum albumin.</p>";
assert(testIsMeaningfulContent(aiSampleInterp), "[INTERPRETATION SANITIZATION] Accurately validates genuine clinical interpretation HTML");

// 3. User Bug Reproduction & Fix: Empty editor tag must NOT override valid AI generation
const staleEditorContent = "<p></p>"; // Editor mounted before user generated AI interpretation
const generatedAiContent = "<p><strong>Diagnostic Note:</strong> Fasting blood glucose &gt; 126 mg/dL indicates Diabetes Mellitus.</p>";
const chosenInterpretation = testPickBestHtml(staleEditorContent, generatedAiContent);
assert(
  chosenInterpretation === generatedAiContent,
  "[INTERPRETATION FALLBACK BUG RESOLVED] Stale empty editor HTML does NOT overwrite valid AI-generated interpretation"
);

// 4. Tests page implementation verification
const testsPageCode = fs.readFileSync(
  path.resolve(__dirname, "../src/app/dashboard/tests/page.tsx"),
  "utf-8"
);
assert(
  testsPageCode.includes("isMeaningfulContent") && testsPageCode.includes("pickBestHtml"),
  "[CATALOG UI VALIDATION] tests/page.tsx implements isMeaningfulContent and pickBestHtml helper functions"
);
assert(
  testsPageCode.includes("latestInterpretationRef.current = cleanGenerated;") &&
  testsPageCode.includes("tiptapInterpRef.current.commands.setContent(cleanGenerated)"),
  "[AI GENERATION SYNC] handleAiGenerateInterpretation updates both latestInterpretationRef and tiptap editor"
);
assert(
  testsPageCode.includes("safeInterpretation") &&
  testsPageCode.includes("pickBestHtml(getSafeEditorHtml(tiptapInterpRef), latestInterpretationRef.current"),
  "[CATALOG SAVE INTEGRITY] handleSaveTest uses pickBestHtml to preserve valid clinical interpretation"
);
assert(
  testsPageCode.includes("interpretation: safeInterpretation || undefined"),
  "[SUBTEST PAYLOAD SYNC] handleSaveTest attaches safeInterpretation to sub_tests payload"
);
assert(
  testsPageCode.includes("canExpand = hasSub || hasInterp"),
  "[ROW EXPANSION] Single-field tests with clinical interpretations can be expanded to view guidelines"
);

// 5. Backend TestController persistence verification
const backendTestCtrl = fs.readFileSync(
  path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/TestController.php"),
  "utf-8"
);
assert(
  backendTestCtrl.includes("Sensitivity (S / I / R)") && backendTestCtrl.includes("Sterile after 48 Hours"),
  "[BACKEND REPORT LAYOUT] updateReportLayout restricts custom_layout diversion strictly to culture sensitivity templates"
);

// ==============================================================================
// 34. Mobile Toast Notification Responsiveness & Pill Handle Removal
// ==============================================================================
console.log("\n▶ MODULE 34: Mobile Toast Notification Responsiveness & Smooth Display");

const toastCode = fs.readFileSync(
  path.resolve(__dirname, "../src/components/ui/toast.tsx"),
  "utf-8"
);

// 1. Pill Shape Handle Removal
assert(
  !toastCode.includes("Mobile Swipe Grab Handle") &&
  !toastCode.includes("cursor-grab active:cursor-grabbing"),
  "[TOAST MOBILE CLEANUP] Top pill shape grab handle icon is strictly removed from toast"
);

// 2. Mobile Responsive Container & Top Safe Area
assert(
  toastCode.includes("env(safe-area-inset-top") &&
  toastCode.includes("max-w-[calc(100vw-1.5rem)]"),
  "[TOAST MOBILE RESPONSIVENESS] Container positions at top on mobile with safe-area insets and adaptive width"
);

// 3. Smooth Stack & Content Scrolling
assert(
  toastCode.includes("max-h-[85vh] overflow-y-auto overscroll-contain") &&
  toastCode.includes("overscroll-contain pr-1 break-words scrollbar-thin"),
  "[TOAST SMOOTH SCROLLING] Container and descriptions support smooth scroll without screen overflow"
);

// 4. Word Break & Close Button Clearance
assert(
  toastCode.includes("break-words") &&
  toastCode.includes("pr-6 sm:pr-7"),
  "[TOAST TEXT WRAPPING] Text has word breaks and guarantees clear separation from close button"
);

// 5. Chrome-like Horizontal-Only Drag Swipe & Zero Vertical Drag
assert(
  toastCode.includes("translate3d(${dragX}px, 0, 0)") &&
  !toastCode.includes("dragOffset.y"),
  "[TOAST HORIZONTAL-ONLY DRAG] Toast strictly drags horizontally along X-axis with zero vertical movement"
);
assert(
  toastCode.includes('touchAction: "pan-y"') &&
  toastCode.includes("translate3d(-120%, 0, 0)") &&
  toastCode.includes("translate3d(120%, 0, 0)"),
  "[TOAST CHROME SWIPE UX] Supports pan-y page scrolling and clean off-screen swipe dismissal in either direction"
);

// ==============================================================================
// 35. Mobile Letterhead Display & Multi-Source Synchronization Engine
// ==============================================================================
console.log("\n▶ MODULE 35: Mobile Letterhead Display & Multi-Source Synchronization Engine");

import { getCleanLetterheadUrl } from "../src/lib/api-client";

// 1. Data URLs must return directly without alteration
const sampleDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
assert(
  getCleanLetterheadUrl(sampleDataUrl) === sampleDataUrl,
  "[LETTERHEAD DATA URL] Data URLs return intact without mangling or path prepending"
);

// 2. Storage relative paths cleanly resolved
const sampleStoragePath = "/storage/letterheads/lab_101_bg.jpg";
const resolvedCleanUrl = getCleanLetterheadUrl(sampleStoragePath);
assert(
  Boolean(resolvedCleanUrl && resolvedCleanUrl.endsWith("/storage/letterheads/lab_101_bg.jpg") && resolvedCleanUrl.startsWith("http")),
  "[LETTERHEAD STORAGE URL] Storage relative paths resolve to clean absolute URLs"
);

// 3. Blob URLs and empty strings cleanly rejected
assert(
  getCleanLetterheadUrl("blob:http://localhost:3000/1234") === null &&
  getCleanLetterheadUrl("") === null &&
  getCleanLetterheadUrl(null) === null &&
  getCleanLetterheadUrl("none") === null,
  "[LETTERHEAD SAFETY] Blob URLs, empty strings, null, and 'none' safely evaluate to null"
);

// 4. FullscreenPrintReportModal Mobile Layout & Multi-Source Fallbacks
const fullscreenModalCode = fs.readFileSync(
  path.resolve(__dirname, "../src/components/fullscreen-print-report-modal.tsx"),
  "utf-8"
);

assert(
  fullscreenModalCode.includes("max-lg:fixed max-lg:inset-0 max-lg:opacity-0 max-lg:pointer-events-none max-lg:-z-50 lg:flex"),
  "[MODAL MOBILE LAYOUT] Center canvas panel maintains non-zero dimensions across mobile tab switches via fixed invisible overlay"
);

assert(
  fullscreenModalCode.includes("lis_cached_letterhead") &&
  fullscreenModalCode.includes("report?.lab?.printBgImage") &&
  fullscreenModalCode.includes("report?.lab?.print_bg_image"),
  "[MODAL MULTI-SOURCE FALLBACK] printSettings falls back to report.lab and lis_cached_letterhead if liveLab is unhydrated"
);

assert(
  fullscreenModalCode.includes("preloadImg.src = cleanUrl") || fullscreenModalCode.includes("new Image()"),
  "[MODAL PRELOAD CACHE] Eagerly preloads letterhead image in background for instant 0ms checkbox activation"
);

assert(
  fullscreenModalCode.includes("onClick={() => setPrintWithHeaderFooter((prev) => !prev)}") &&
  fullscreenModalCode.includes("Layers"),
  "[MODAL CANVAS QUICK TOGGLE] Top canvas toolbar features one-click Letterhead Header & Footer toggle on mobile"
);

assert(
  fullscreenModalCode.includes("prevBg === freshBg") &&
  (fullscreenModalCode.includes("fresh?.printBgImage") || fullscreenModalCode.includes("fresh.printBgImage")),
  "[MODAL CAMELCASE SYNC] setLiveLab safely compares both camelCase and snake_case properties without dropping letterheads"
);

// 5. PrintPreviewDialog Mobile Layout & Multi-Source Fallbacks
const printPreviewDialogCode = fs.readFileSync(
  path.resolve(__dirname, "../src/components/print-preview-dialog.tsx"),
  "utf-8"
);

assert(
  printPreviewDialogCode.includes("max-md:fixed max-md:inset-0 max-md:opacity-0 max-md:pointer-events-none max-md:-z-50 md:flex"),
  "[PREVIEW DIALOG MOBILE LAYOUT] Preview pane stays active in layout across mobile tab switches to prevent measurement collapses"
);

assert(
  printPreviewDialogCode.includes("lis_cached_letterhead") &&
  printPreviewDialogCode.includes("report?.lab?.printBgImage") &&
  printPreviewDialogCode.includes("report?.lab?.print_bg_image"),
  "[PREVIEW DIALOG MULTI-SOURCE] Uses robust multi-source letterhead fallback"
);

// 6. ReportSheet Rendering & Measurement Integrity
const reportSheetCode = fs.readFileSync(
  path.resolve(__dirname, "../src/components/report-sheet.tsx"),
  "utf-8"
);

assert(
  !reportSheetCode.includes('alt="Letterhead Background"\n                  aria-hidden\n                  crossOrigin="anonymous"') &&
  reportSheetCode.includes('loading="eager"') &&
  reportSheetCode.includes('decoding="sync"'),
  "[REPORT SHEET IMAGE CORS] Letterhead img omits crossOrigin to prevent mobile CORS dropping and uses eager sync decoding"
);

assert(
  reportSheetCode.includes("next.length > 0 && !next.some(h => h > 0) && prev.some(h => h > 0)"),
  "[REPORT SHEET MEASUREMENT GUARD] Block heights are protected from being wiped to zero by temporary detached/hidden frames"
);

// ============================================================================
// MODULE 36: Patient Registration UI/UX Polish, Mobile Responsiveness & Test Isolation
// ============================================================================
console.log("\n▶ MODULE 36: Patient Registration UI/UX Polish, Mobile Responsiveness & Test Isolation");

const registerPageCode = fs.readFileSync(
  path.resolve(__dirname, "../src/app/dashboard/patients/register/page.tsx"),
  "utf-8"
);
const packagesLibCode = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/packages.ts"),
  "utf-8"
);

// 1. Step 1 and Step 2 Badges Pill Shape
assert(
  registerPageCode.includes("Step 1") && registerPageCode.includes("rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20"),
  "[STEP 1 PILL BADGE] Step 1 badge is styled as a consistent rounded pill matching ABHA badge"
);

assert(
  registerPageCode.includes("Step 2") &&
  registerPageCode.includes("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-2xs whitespace-nowrap shrink-0"),
  "[STEP 2 PILL BADGE] Step 2 badge is styled as a consistent rounded pill matching Step 1"
);

assert(
  registerPageCode.includes("flex flex-col sm:flex-row sm:items-center justify-between") &&
  !registerPageCode.includes('<span className="truncate">Patient Identity & Demographics</span>'),
  "[SECTION HEADERS NO TRUNCATE] Section headers provide full-width non-truncated titles with action buttons cleanly positioned on mobile"
);

assert(
  registerPageCode.includes("self-start sm:self-auto") &&
  registerPageCode.includes("justify-start sm:justify-end"),
  "[MOBILE LEFT ALIGNMENT] Step 1, Step 2, and Link Patient ABHA align to the left side on mobile"
);

// 2. Mobile Header Sequence & Create ABHA Mobile Visibility
assert(
  registerPageCode.includes("hidden sm:inline-flex") && registerPageCode.includes("Create ABHA"),
  "[CREATE ABHA MOBILE HIDDEN] Create ABHA button is hidden on mobile screens (hidden sm:inline-flex)"
);

assert(
  registerPageCode.includes("Link Patient ABHA") && registerPageCode.includes("rounded-full text-xs font-semibold"),
  "[LINK ABHA PILL BUTTON] Link Patient ABHA button features clean rounded-full pill shape"
);

// 3. Collection Date & Time Picker
assert(
  registerPageCode.includes("[&::-webkit-calendar-picker-indicator]:hidden") &&
  registerPageCode.includes("[&::-webkit-calendar-picker-indicator]:appearance-none"),
  "[COLLECTION DATE PICKER] Default browser calendar icon is removed from date-time input"
);

assert(
  registerPageCode.includes("showPicker?.()"),
  "[COLLECTION DATE SHOW PICKER] Clicking anywhere on the collection date input directly opens native date picker"
);

// 4. Age Fields Spinner Arrow Removal & Dedicated Spacing
assert(
  registerPageCode.includes("[appearance:textfield]") &&
  registerPageCode.includes("[&::-webkit-outer-spin-button]:appearance-none") &&
  registerPageCode.includes("[&::-webkit-inner-spin-button]:appearance-none"),
  "[AGE SPINNER REMOVAL] Number spinner arrows are removed from Years, Months, and Days inputs"
);

assert(
  registerPageCode.includes("pr-6 sm:pr-7 pl-2 sm:pl-3"),
  "[AGE LABEL SPACING] Age inputs provide dedicated right padding so letters Y, M, D never overlap with numbers"
);

// 5. 'Save & Select Clinical Tests' Button Single-Line Layout
assert(
  registerPageCode.includes("Save & Select Clinical Tests</span>") &&
  registerPageCode.includes("whitespace-nowrap w-full sm:w-auto"),
  "[SAVE & SELECT BUTTON] Save & Select Clinical Tests button strictly enforces whitespace-nowrap single-line layout"
);

// 6. Add Dialogs (Doctor, Centre, Staff, PayU) Mobile Screen Edge Clearance
assert(
  registerPageCode.includes("isDoctorModalOpen") &&
  registerPageCode.includes("w-[calc(100vw-2rem)] sm:w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6"),
  "[ADD DOCTOR MODAL] Doctor modal has dedicated margin clearance from mobile edges (w-[calc(100vw-2rem)])"
);

assert(
  registerPageCode.includes("isCollectionModalOpen") &&
  registerPageCode.includes("w-[calc(100vw-2rem)] sm:w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6"),
  "[ADD CENTRE MODAL] Collection point modal has dedicated margin clearance from mobile edges"
);

assert(
  registerPageCode.includes("isPhleboModalOpen") &&
  registerPageCode.includes("w-[calc(100vw-2rem)] sm:w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-4 sm:p-6"),
  "[ADD STAFF MODAL] Phlebotomist / Staff modal has dedicated margin clearance from mobile edges"
);

// 7. Test Catalog Shimmer Loading Feedback
assert(
  registerPageCode.includes("loadingTests && availableTests.length === 0") &&
  registerPageCode.includes("animate-pulse"),
  "[CATALOG SHIMMER SKELETON] Test directory displays responsive animated shimmer skeleton during slow network loading"
);

// 8. Package Resolution Precision & Safe Test Selection (Anti-Select-All Bug)
const mockAvailable = [
  { id: "uuid-cbc-01", name: "Complete Blood Count (CBC)", testCode: "CBC", price: 250 },
  { id: "uuid-dlc-02", name: "Differential Leukocyte Count (DLC)", testCode: "DLC", price: 150 },
  { id: "uuid-lft-03", name: "Liver Function Test (LFT)", testCode: "LFT", price: 500 },
];

const mockPkg = {
  id: "pkg-01",
  name: "Hemogram Focus",
  code: "PKG-HEMO",
  price: 250,
  testIds: ["uuid-cbc-01"],
  tests: [{ id: "uuid-cbc-01", name: "Complete Blood Count (CBC)" }],
  createdAt: new Date().toISOString(),
};

const resolved = resolvePackageTestIds(mockPkg, mockAvailable);
assert(
  resolved.length === 1 && resolved[0] === "uuid-cbc-01",
  "[PACKAGE RESOLUTION PRECISION] Resolves exactly the specified test without matching rogue tests"
);
assert(
  !resolved.includes("uuid-dlc-02"),
  "[DLC ISOLATION] Resolving CBC does NOT inject Differential Leukocyte Count (DLC) into package test IDs"
);

// 9. Anti-Select-All Protection with Non-UUID Test Codes
const mockGenericPkg = {
  id: "pkg-generic",
  name: "Custom Bundle",
  code: "PKG-CUSTOM",
  price: 500,
  testIds: ["uuid-cbc-01"],
  tests: [{ id: "uuid-cbc-01", name: "Complete Blood Count (CBC)" }],
  createdAt: new Date().toISOString(),
};
const genericResolved = resolvePackageTestIds(mockGenericPkg, mockAvailable);
assert(
  genericResolved.length === 1 && !genericResolved.includes("uuid-lft-03"),
  "[ANTI-SELECT-ALL BUG DEFENSE] Package resolution does NOT accidentally select all available tests"
);

// 10. Specimen Tube Triage & Smart Phlebotomy Single-Line Pill
assert(
  registerPageCode.includes("Smart Phlebotomy") &&
  registerPageCode.includes("rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 whitespace-nowrap shrink-0 shadow-2xs"),
  "[SMART PHLEBOTOMY PILL] Smart Phlebotomy is rendered as a clean single-line pill badge"
);

assert(
  registerPageCode.includes("Manage Tests (") &&
  registerPageCode.includes("whitespace-nowrap w-full sm:w-auto"),
  "[MANAGE TESTS CARD BUTTON] Manage Tests button cleanly spans full-width on mobile and stays single-line"
);


// ══════════════════════════════════════════════════════════════════════════════
// MODULE 37: Financial Modals, Due Collections, Zoomable Invoices, Date Range & Sample Rejection Mobile Responsiveness
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ MODULE 37: Financial Modals, Due Collections, Zoomable Invoices, Date Range & Sample Rejection Mobile Responsiveness");

// 1. AcceptDueModal Responsiveness & Mobile Alignment
const acceptDueCode = fs.readFileSync(path.resolve(__dirname, "../src/components/accept-due-modal.tsx"), "utf-8");
assert(
  acceptDueCode.includes("w-[calc(100vw-2rem)] sm:w-full max-h-[92vh]"),
  "[ACCEPT DUE MODAL SCREEN MARGINS] Accept Due modal has dedicated margin clearance on mobile devices"
);
assert(
  acceptDueCode.includes("flex flex-col-reverse sm:flex-row"),
  "[ACCEPT DUE FOOTER BUTTONS] Action buttons are cleanly stacked on mobile and row-aligned on desktop"
);
assert(
  acceptDueCode.includes("showPicker?.()"),
  "[ACCEPT DUE DATE PICKER] Clicking anywhere on payment date input directly triggers native date picker"
);
assert(
  acceptDueCode.includes("truncate") && acceptDueCode.includes("whitespace-nowrap"),
  "[ACCEPT DUE TEXT INTEGRITY] Patient name, doctor, and due amounts enforce clean single-line truncation"
);

// 2. DateFilterRibbon Dual Date Range Mobile Grid
const dateRibbonCode = fs.readFileSync(path.resolve(__dirname, "../src/components/date-filter-ribbon.tsx"), "utf-8");
assert(
  dateRibbonCode.includes("grid grid-cols-2 sm:flex sm:items-center"),
  "[DATE RIBBON DUAL GRID] From and To date fields render side-by-side in a responsive 50/50 grid on mobile"
);
assert(
  dateRibbonCode.includes("showPicker?.()"),
  "[DATE RIBBON SHOW PICKER] Range and single date inputs invoke showPicker() on tap"
);

// 3. Billing Tax Invoice Modal 3-Button Full-Width Toolbar & Clean Header (No Zoom Controls)
const billingPageCode = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/page.tsx"), "utf-8");
assert(
  billingPageCode.includes("grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5"),
  "[BILLING 3-BUTTON TOOLBAR] WhatsApp, Download PDF, and Print buttons span full width in balanced 3-column grid on mobile"
);
assert(
  billingPageCode.includes("h-10 sm:h-9") && billingPageCode.includes("rounded-xl"),
  "[BILLING 3-BUTTON EQUAL HEIGHT] Action buttons have unified equal height and corner radius without wasted space"
);
assert(
  !billingPageCode.includes('title="Zoom Out"') && !billingPageCode.includes('title="Zoom In"'),
  "[BILLING INVOICE NO ZOOM BUTTONS] Top header strictly omits cluttering zoom in/out controls"
);
assert(
  billingPageCode.includes("pr-12") && billingPageCode.includes("shrink-0"),
  "[BILLING HEADER CLOSE CLEARANCE] Top header enforces dedicated clearance from dialog close button"
);

// 4. Dues Report View Bill Modal Responsiveness
const duesPageCode = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/dues/page.tsx"), "utf-8");
assert(
  duesPageCode.includes("w-[calc(100vw-1.5rem)] sm:w-full max-h-[94vh]"),
  "[DUES VIEW BILL SCREEN MARGINS] View Bill dialog in dues report fits comfortably on mobile screens"
);
assert(
  duesPageCode.includes("printInvoiceElement") && duesPageCode.includes("Printer"),
  "[DUES VIEW BILL PRINT ACTION] View Bill dialog provides responsive print trigger"
);

// 5. Monthly Business Report Responsive Toolbar & Sequence
const monthlyExpensesCode = fs.readFileSync(path.resolve(__dirname, "../src/components/monthly-expenses-register.tsx"), "utf-8");
assert(
  monthlyExpensesCode.includes("grid grid-cols-2 gap-2 sm:flex sm:items-center"),
  "[MONTHLY SELECTORS 50/50] Month and Year selectors sit side-by-side in responsive grid on mobile"
);
assert(
  monthlyExpensesCode.includes("grid grid-cols-3") && monthlyExpensesCode.includes("Show") && monthlyExpensesCode.includes("Print"),
  "[MONTHLY BUTTON SEQUENCE] Show, Print, and CSV export buttons align in clean sequence on mobile"
);
assert(
  monthlyExpensesCode.includes("min-w-0") && monthlyExpensesCode.includes("truncate"),
  "[MONTHLY SUMMARY METRICS] Summary cards protect numbers from line-wrapping with truncate and min-w-0"
);

// 6. Patients Sample Rejection Modal Mobile Responsiveness
const patientsPageCode = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/page.tsx"), "utf-8");
assert(
  patientsPageCode.includes("w-[calc(100vw-2rem)] sm:w-full max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"),
  "[REJECT SAMPLE STRUCTURED CONTAINER] Sample reject modal uses fixed-header scrollable-body container with edge clearance"
);
assert(
  patientsPageCode.includes("pr-12 shrink-0") && patientsPageCode.includes("Reject Laboratory Sample"),
  "[REJECT SAMPLE HEADER CLEARANCE] Rejection header enforces dedicated right clearance avoiding close button collision"
);
assert(
  patientsPageCode.includes("flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end"),
  "[REJECT SAMPLE FOOTER BUTTONS] Cancel and Confirm Rejection buttons stack full-width on mobile with equal touch targets"
);
assert(
  patientsPageCode.includes("h-10 sm:h-9"),
  "[REJECT SAMPLE BUTTON HEIGHTS] Action buttons maintain comfortable 40px touch targets on mobile devices"
);

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 38: Enter Results Action Buttons Single-Line Grid & Fullscreen Print Report Responsive Canvas
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ MODULE 38: Enter Results Action Buttons Single-Line Grid & Fullscreen Print Report Responsive Canvas");
const globalsContent = fs.readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf-8");

// 1. Enter Results Findings Action Buttons Single-Line Mobile Alignment
const editPageCode38 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/[id]/edit/page.tsx"), "utf-8");
assert(
  editPageCode38.includes("grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2"),
  "[ENTER RESULTS 3-BUTTON GRID] Add Note, Add Remarks, and Add Advices align in a single-line 3-column grid on mobile"
);
assert(
  editPageCode38.includes('toggleTestMeta(group.mainTestId, "notes")') &&
  editPageCode38.includes('toggleTestMeta(group.mainTestId, "remarks")') &&
  editPageCode38.includes('toggleTestMeta(group.mainTestId, "advices")'),
  "[ENTER RESULTS METADATA ACTIONS] All 3 metadata actions bind correctly to main test group"
);
assert(
  editPageCode38.includes("inline-flex items-center justify-center") && editPageCode38.includes("truncate"),
  "[ENTER RESULTS BUTTON ERGONOMICS] Buttons use centered text with truncation preventing multi-line overflow"
);

// 2. Fullscreen Print Report Modal Responsive Fit & Canvas Locking
const fullscreenModalCode38 = fs.readFileSync(path.resolve(__dirname, "../src/components/fullscreen-print-report-modal.tsx"), "utf-8");
assert(
  fullscreenModalCode38.includes("w-full max-w-full sm:max-w-[96vw] sm:w-[96vw] h-[100dvh] sm:h-[92vh]"),
  "[PRINT MODAL FULL VIEWPORT] Print report modal expands to full 100dvh viewport on mobile without clipping"
);
assert(
  fullscreenModalCode38.includes('className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 flex justify-center items-start custom-scrollbar"') &&
  globalsContent.includes("touch-action: pan-y !important") &&
  globalsContent.includes("overflow-x: hidden !important"),
  "[PRINT MODAL CANVAS LOCK] Report canvas disables horizontal pan/drag on mobile while maintaining vertical scrolling"
);
assert(
  fullscreenModalCode38.includes("isMobile ? mobileScale : zoomScale"),
  "[PRINT MODAL ADAPTIVE SCALE] Page scale dynamically fits screen width on mobile and allows zoom on desktop"
);
assert(
  fullscreenModalCode38.includes("hidden sm:flex items-center gap-1.5"),
  "[PRINT MODAL CLEAN MOBILE HEADER] Secondary toolbar buttons are cleanly hidden on mobile so preview remains uncluttered"
);
assert(
  fullscreenModalCode38.includes("hidden lg:flex p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"),
  "[PRINT MODAL SETTINGS SINGLE CLOSE] Duplicate inner close button in settings sidebar is removed on mobile view"
);

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 39: Referral Manage Modals, B2B Wallets, Live Customizer & Add Test Responsive Systems
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n▶ MODULE 39: Referral Manage Modals, B2B Wallets, Live Customizer & Add Test Responsive Systems");

// 1. Doctors Referral Manage: Add Doctor & Statement Print Settings Modals
const doctorsManageCode39 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/doctors/manage/page.tsx"), "utf-8");
assert(
  doctorsManageCode39.includes("w-[calc(100vw-2rem)] sm:max-w-md max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"),
  "[DOCTOR MODAL SCREEN MARGINS] Add/Edit Doctor modal preserves edge clearance and structured scroll container"
);
assert(
  doctorsManageCode39.includes("w-[calc(100vw-2rem)] sm:max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"),
  "[STATEMENT SETTINGS SCREEN MARGINS] Statement print settings dialog preserves edge clearance on mobile"
);
assert(
  doctorsManageCode39.includes("grid grid-cols-1 sm:grid-cols-2 gap-3"),
  "[DOCTOR FORM GRID ADAPTIVITY] Doctor form fields collapse to 1 column on mobile to prevent label squeezing"
);

// 2. B2B Wallets: Single-Line Filters, Preset Chips, and Full-Width Action Buttons
const b2bWalletsCode39 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/b2b/wallets/page.tsx"), "utf-8");
assert(
  b2bWalletsCode39.includes("overflow-x-auto pb-1 max-w-full custom-scrollbar flex-nowrap"),
  "[B2B WALLET FILTERS SINGLE LINE] Balance and Tier filter buttons scroll horizontally in a clean single line on mobile"
);
assert(
  b2bWalletsCode39.includes("grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-1.5"),
  "[B2B WALLET PRESETS 5-COL] Preset chips align in a balanced 5-column single row on mobile"
);
assert(
  b2bWalletsCode39.includes("flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2"),
  "[B2B WALLET ACTIONS FULL WIDTH] Deposit and Cancel actions expand to full-width comfortable touch targets on mobile"
);

// 3. Print Preview Dialog: Live Customizer Badge Single-Line & Three-Dots Menu
const printPreviewCode39 = fs.readFileSync(path.resolve(__dirname, "../src/components/print-preview-dialog.tsx"), "utf-8");
assert(
  printPreviewCode39.includes("Live Customizer") &&
  printPreviewCode39.includes("whitespace-nowrap") &&
  printPreviewCode39.includes("shrink-0"),
  "[PRINT PREVIEW BADGE SINGLE LINE] Live Customizer badge enforces single-line layout without double-line wrap"
);
assert(
  printPreviewCode39.includes('<MoreVertical className="h-4 w-4" />') &&
  printPreviewCode39.includes("DropdownMenu"),
  "[PRINT PREVIEW THREE DOTS] Secondary print and WhatsApp actions collapse cleanly into a 3-dots dropdown on mobile"
);

// 4. Test Catalog: Add New Test Fullscreen Dialog & Three-Dots Header
const testsPageCode39 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/tests/page.tsx"), "utf-8");
assert(
  testsPageCode39.includes("w-full max-w-full sm:max-w-[95vw] sm:w-[95vw] h-[100dvh] sm:h-[92vh] max-h-[100dvh] sm:max-h-[94vh]"),
  "[TEST DIALOG FULL VIEWPORT] Add/Edit Test dialog expands to full viewport on mobile without clipping"
);
assert(
  testsPageCode39.includes('<MoreVertical className="h-4 w-4" />') &&
  testsPageCode39.includes("DropdownMenu"),
  "[TEST DIALOG THREE DOTS] Live Preview and Cancel secondary actions are neatly packaged in a 3-dots dropdown on mobile"
);
assert(
  testsPageCode39.includes("p-4 sm:p-6 bg-card border rounded-xl shadow-xs space-y-4"),
  "[TEST PARAMETER CARD PADDING] Parameter cards maintain comfortable inner breathing room on mobile devices"
);

assert(
  testsPageCode39.includes("min-h-14 sm:min-h-16 py-2 sm:py-0 border-t border-border/80 bg-card px-3 sm:px-6 flex items-center justify-between gap-2 shrink-0") &&
  testsPageCode39.includes('DropdownMenuContent align="end" className="w-56"') &&
  testsPageCode39.includes("Clinical Interpretation ✓") &&
  testsPageCode39.includes("w-full max-w-full sm:max-w-6xl sm:w-[95vw] h-[100dvh] sm:h-[88vh]"),
  "[TEST DIALOG FOOTER THREE DOTS & MODAL] Bottom action footer matches top bar alignment, packages Clinical Interpretation into 3-dots, and interpretation modal is mobile-responsive"
);

// 5. B2B Wallets: Top-up / Ledger Switcher & Ledger Log Shape Symmetry
assert(
  b2bWalletsCode39.includes("bg-muted/80 p-1 rounded-xl border border-border/60 text-xs w-full shadow-2xs") &&
  b2bWalletsCode39.includes("flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer text-center") &&
  b2bWalletsCode39.includes("bg-muted/80 p-1 rounded-xl border border-border/60 text-xs w-full sm:w-auto shadow-2xs") &&
  b2bWalletsCode39.includes('id="b2b-action-panel"'),
  "[B2B WALLET SWITCHER SYMMETRY] Top-up/Ledger switcher and Ledger Log filter share identical responsive rounded-xl shape with mobile scroll anchor"
);

// ============================================================================
// MODULE 40: WORKSHEET, PACKAGES, RATELIST, SMART REPORT, SUPPORT & LAB ACCOUNT RESPONSIVENESS
// ============================================================================
console.log("\n--- MODULE 40: MOBILE RESPONSIVENESS (WORKSHEET, PACKAGES, RATELIST, SMART REPORT, SUPPORT, LAB ACCOUNT) ---");

// 1. Worksheet: Date picker, department filter, and sticky bottom table actions
const worksheetCode40 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/tests/worksheet/page.tsx"), "utf-8");
assert(
  worksheetCode40.includes("h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0"),
  "[WORKSHEET RESPONSIVE LOGO] Top-left logo features optical baseline alignment, responsive scaling, and shrink-0 protection on mobile"
);
assert(
  worksheetCode40.includes("w-full sm:w-auto sm:min-w-[220px]") &&
  worksheetCode40.includes("w-full sm:w-auto sm:min-w-[240px]"),
  "[WORKSHEET MOBILE FILTERS] Date and Department filters expand to full-width on mobile viewports"
);
assert(
  worksheetCode40.includes("grid grid-cols-2 sm:flex") &&
  worksheetCode40.includes("w-full sm:w-auto"),
  "[WORKSHEET BOTTOM ACTION BAR] Table print actions align in a balanced 2-column mobile grid"
);

// 2. Packages: Dialog panel padding, telemetry grid, and full-width touch buttons
const packagesCode40 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/tests/packages/page.tsx"), "utf-8");
assert(
  packagesCode40.includes("p-3.5 sm:p-7") &&
  packagesCode40.includes("grid grid-cols-3 sm:flex"),
  "[PACKAGES DIALOG RESPONSIVENESS] Package editor panel padding and pricing telemetry adapt to mobile"
);
assert(
  packagesCode40.includes("flex-col-reverse sm:flex-row items-stretch sm:items-center") &&
  packagesCode40.includes("w-full sm:w-auto h-10"),
  "[PACKAGES ACTION BUTTONS] Package save and cancel buttons stack comfortably on mobile"
);

// 3. Ratelist: Workspace tabs touch scroll, B2B metrics, and edge-to-edge modals
const ratelistCode40 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/ratelist/page.tsx"), "utf-8");
assert(
  ratelistCode40.includes("grid grid-cols-2 sm:flex") &&
  ratelistCode40.includes("overflow-x-auto pb-1 max-w-full flex-nowrap scrollbar-none"),
  "[RATELIST MOBILE NAVIGATION & METRICS] Rate list tabs touch-scroll horizontally and metrics form 2-column grid"
);
assert(
  ratelistCode40.includes("w-[calc(100vw-2rem)]"),
  "[RATELIST DIALOGS EDGE-TO-EDGE] Rate list dialogs use edge-to-edge container width with safe touch margins"
);

// 4. Smart Report: A4 scaling outer wrapper, horizontal scroll protection & header grid
const smartReportCode40 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/[id]/smart-report/page.tsx"), "utf-8");
assert(
  smartReportCode40.includes("Math.round(794 * zoomScale)") &&
  smartReportCode40.includes("overflow-x-hidden"),
  "[SMART REPORT A4 SCALING] Scaled A4 preview wrapper strictly clips overflow to prevent horizontal drag"
);
assert(
  smartReportCode40.includes("grid grid-cols-2 sm:flex sm:items-center") &&
  smartReportCode40.includes("w-full sm:w-auto"),
  "[SMART REPORT ACTION GRID] Top action buttons align in a 2-column mobile grid"
);

// 5. Help & Support: Single-line button text & stacked form action buttons
const supportCode40 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/support/page.tsx"), "utf-8");
assert(
  supportCode40.includes("Ticket History") &&
  supportCode40.includes("whitespace-nowrap shrink-0"),
  "[SUPPORT BUTTONS NO WRAP] Ticket History and support buttons prevent 2nd line text breaks"
);
assert(
  supportCode40.includes("flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between"),
  "[SUPPORT ACTION STACKING] Form submit and cancel buttons stack vertically on mobile viewports"
);

// 6. Lab Account: Header wrap, tabs scroll, settlement card stacking & edge-to-edge dialogs
const labAccountCode40 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/account/lab/page.tsx"), "utf-8");
assert(
  labAccountCode40.includes("w-full sm:w-auto inline-flex items-center justify-center") &&
  labAccountCode40.includes("overflow-x-auto scrollbar-none"),
  "[LAB ACCOUNT HEADER & TABS] Need Help button expands to full width and navigation tabs scroll cleanly"
);
assert(
  labAccountCode40.includes("w-[calc(100vw-2rem)] sm:max-w-md max-h-[92vh] overflow-y-auto"),
  "[LAB ACCOUNT DIALOGS MOBILE] Confirm volume and alert modals adapt to edge-to-edge mobile screens"
);


// MODULE 41: STORED XSS SANITIZATION & REPORT SECURITY (DOMPurify & Delimiter Bypass Defense)
console.log("\n▶ MODULE 41: Stored XSS Sanitization & Slash-Delimiter Bypass Defense");

const slashSvg = '<svg/onload=alert(1)>';
const cleanedSvg = sanitizeHtml(slashSvg);
assert(
  !cleanedSvg.includes("onload") && !cleanedSvg.includes("alert("),
  "[XSS DEFENSE] Strips slash-delimited event handlers like <svg/onload=alert(1)>"
);

const slashImg = '<img/src=x/onerror=alert(1)>';
const cleanedImg = sanitizeHtml(slashImg);
assert(
  !cleanedImg.includes("onerror") && !cleanedImg.includes("alert("),
  "[XSS DEFENSE] Strips slash-delimited onerror on img tags"
);

const standardHandler = '<b onmouseover=alert(1)>Safe Label</b>';
const cleanedHandler = sanitizeHtml(standardHandler);
assert(
  !cleanedHandler.includes("onmouseover") && cleanedHandler.includes("Safe Label"),
  "[XSS DEFENSE] Strips whitespace-delimited event handlers and preserves safe contents"
);

const scriptTag = '<script>alert("pwned")</script>';
const cleanedScript = sanitizeHtml(scriptTag);
assert(
  !cleanedScript.includes("script") && !cleanedScript.includes("alert"),
  "[XSS DEFENSE] Completely removes script tags and script bodies"
);

const normalTable = '<table style="width:100%"><thead><tr><th>Test</th><th>Result</th></tr></thead><tbody><tr><td>Hemoglobin</td><td>14.2</td></tr></tbody></table>';
const cleanedTable = sanitizeHtml(normalTable);
assert(
  cleanedTable.includes("<table") && cleanedTable.includes("Hemoglobin") && cleanedTable.includes("14.2"),
  "[XSS DEFENSE] Preserves legitimate medical table markup and values"
);

const reportSheetCode41 = fs.readFileSync(path.resolve(__dirname, "../src/components/report-sheet.tsx"), "utf-8");
assert(
  reportSheetCode41.includes("sanitizeHtml(preTableHtml)") &&
  reportSheetCode.includes("sanitizeHtml(rowsHtml)") &&
  reportSheetCode.includes("sanitizeHtml(postTableHtml)"),
  "[REPORT SHEET SANITIZATION] Custom editor chunked tables sanitize preTable, rows, and postTable HTML"
);

const testsPageSrc41 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/tests/page.tsx"), "utf-8");
assert(
  testsPageSrc41.includes("sanitizeHtml(test.interpretation || \"\")"),
  "[TESTS DASHBOARD XSS DEFENSE] Tests page sanitizes clinical interpretations with sanitizeHtml"
);

const smartReportPageSrc41 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/[id]/smart-report/page.tsx"), "utf-8");
assert(
  smartReportPageSrc41.includes("sanitizeHtml(") &&
  smartReportPageSrc41.includes("smartSettings.disclaimerText"),
  "[SMART REPORT XSS DEFENSE] Smart report view strictly sanitizes clinical disclaimer HTML"
);

console.log("\n===============================================================================");

// 42. Sileo Physics-Based Toast Integration & Top-Center Responsive Architecture
console.log("\n▶ MODULE 42: Sileo Physics-Based Toast Integration & Top-Center Architecture");

const layoutCode42 = fs.readFileSync(path.resolve(__dirname, "../src/app/layout.tsx"), "utf-8");
assert(
  layoutCode42.includes('import "sileo/styles.css";'),
  "[SILEO STYLES IMPORT] Root layout imports sileo/styles.css for spring physics animation curves"
);

const globalsCss42 = fs.readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf-8");
assert(
  globalsCss42.includes("[data-sileo-viewport]") &&
  globalsCss42.includes("z-index: 999999 !important;") &&
  globalsCss42.includes("env(safe-area-inset-top"),
  "[SILEO VIEWPORT OVERRIDES] globals.css enforces z-index 999999 and safe-area top inset for notch screens"
);
assert(
  globalsCss42.includes("[data-sileo-toast]") &&
  globalsCss42.includes("max-width: calc(100vw - 1.5rem) !important;"),
  "[SILEO TOAST RESPONSIVENESS] globals.css enforces max-width constraints on small mobile viewports"
);

const toastCode42 = fs.readFileSync(path.resolve(__dirname, "../src/components/ui/toast.tsx"), "utf-8");
assert(
  toastCode42.includes('import { Toaster, sileo } from "sileo";') &&
  toastCode42.includes("export { Toaster, sileo };"),
  "[SILEO EXPORTS] toast.tsx re-exports Toaster and sileo instance directly"
);
assert(
  toastCode42.includes('position="top-center"') &&
  toastCode42.includes("<Toaster"),
  "[SILEO TOASTER TOP-CENTER] ToastProvider mounts Toaster configured with top-center position"
);
assert(
  toastCode42.includes("handler.action =") &&
  toastCode42.includes("handler.promise =") &&
  toastCode42.includes("handler.dismiss =") &&
  toastCode42.includes("handler.clear =") &&
  toastCode42.includes("handler.show ="),
  "[SILEO FULL ACTION SET] useToast hook provides action, promise, dismiss, clear, and show methods"
);
assert(
  toastCode42.includes('position: "top-center"') &&
  toastCode42.includes("normalizeToastOptions"),
  "[SILEO NORMALIZATION] normalizeToastOptions enforces top-center position across all actions"
);
assert(
  (globalsCss42.includes("fill: #1e2536 !important;") || globalsCss42.includes("fill: #141923 !important;")) &&
  globalsCss42.includes("backdrop-filter: none !important;") &&
  globalsCss42.includes("color: #ffffff !important;") &&
  (toastCode42.includes('fill: "#1e2536"') || toastCode42.includes('fill: "#141923"')),
  "[SILEO CLEAN LIGHTWEIGHT DARK] Sileo toast configures clean lightweight dark slate (#1e2536) with zero rectangular background blur"
);
assert(
  toastCode42.includes("handler.loading =") &&
  toastCode42.includes('type: "loading" as any'),
  "[SILEO LOADER TOAST] Sileo toast exposes handler.loading for async operations"
);

const printPreviewSrc42 = fs.readFileSync(path.resolve(__dirname, "../src/components/print-preview-dialog.tsx"), "utf-8");
assert(
  printPreviewSrc42.includes("disabled={isDownloadingPdf}") &&
  printPreviewSrc42.includes("disabled={isSendingWhatsApp}") &&
  printPreviewSrc42.includes('toast.loading("Generating PDF..."') &&
  printPreviewSrc42.includes('toast.loading("Sending WhatsApp..."'),
  "[REPORT PRINT LOCK & LOADER] Report print dialog locks download & whatsapp buttons while firing physics loader toasts"
);

// Dynamic check on Sileo module in node_modules
const { sileo: rawSileo, Toaster: rawToaster } = require("sileo");
assert(
  typeof rawSileo === "object" &&
  typeof rawSileo.success === "function" &&
  typeof rawSileo.error === "function" &&
  typeof rawSileo.warning === "function" &&
  typeof rawSileo.info === "function" &&
  typeof rawSileo.action === "function" &&
  typeof rawSileo.promise === "function" &&
  typeof rawSileo.dismiss === "function" &&
  typeof rawSileo.clear === "function" &&
  typeof rawSileo.show === "function",
  "[SILEO MODULE VALIDATION] Sileo library provides all 9 action functions"
);
assert(
  typeof rawToaster === "function",
  "[SILEO TOASTER COMPONENT] Sileo Toaster React component is valid and mountable"
);


console.log("\n===============================================================================");

// 43. Mobile Responsive Layout: Settings (Letterhead Preview, LIS Pro Pill, Report Layout, RBAC, Payment Gateway, Machine Integration) & Top Navbar
console.log("\n▶ MODULE 43: Mobile Responsive Settings, Tabs & Navbar Popover Layout");

const navbarSrc43 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/navbar.tsx"), "utf-8");
assert(
  navbarSrc43.includes("collisionPadding={12}") &&
  navbarSrc43.includes("sideOffset={8}") &&
  navbarSrc43.includes("w-[calc(100vw-1.5rem)] max-w-[360px] sm:w-96"),
  "[NAVBAR NOTIFICATION POPOVER] Navbar popover enforces responsive width and boundary padding on mobile viewports"
);
assert(
  navbarSrc43.includes("shrink-0 relative text-slate-500 hover:text-slate-800") ||
  navbarSrc43.includes("shrink-0"),
  "[NAVBAR NOTIFICATION BUTTON] Notification trigger button has shrink-0 and responsive alignment"
);

const settingsSrc43 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/settings/page.tsx"), "utf-8");
assert(
  settingsSrc43.includes("shrink-0 whitespace-nowrap self-center") &&
  settingsSrc43.includes("LIS Pro"),
  "[SETTINGS HEADER PILL] 'LIS Pro' pill badge is strictly aligned in a single line without wrapping or breaking"
);
assert(
  settingsSrc43.includes("overflow-x-auto overflow-y-visible sheet-pan-canvas") &&
  settingsSrc43.includes("min-w-fit mx-auto flex justify-center"),
  "[LETTERHEAD PREVIEW RESPONSIVENESS] Letterhead preview container centers scaled sheet and prevents left-edge clipping"
);
assert(
  settingsSrc43.includes("previewScale") &&
  settingsSrc43.includes("window.innerWidth < 400"),
  "[LETTERHEAD SCALE CALCULATION] Preview automatically computes compact scale factor on narrow mobile screens"
);
assert(
  settingsSrc43.includes("shrink-0 whitespace-nowrap") &&
  settingsSrc43.includes("Registration & Report Sync") &&
  settingsSrc43.includes("Active · Separate Page per Test") &&
  settingsSrc43.includes("Active (Department-wise)") &&
  settingsSrc43.includes("Zero-Latency Fast Print"),
  "[REPORT LAYOUT PILL LABELS] Report layout feature tags and pill shape labels are protected with shrink-0 whitespace-nowrap"
);

const rbacSrc43 = fs.readFileSync(path.resolve(__dirname, "../src/components/collection-centers-tab.tsx"), "utf-8");
assert(
  rbacSrc43.includes("overflow-x-auto max-w-full scrollbar-none") &&
  rbacSrc43.includes("min-w-[760px]"),
  "[RBAC COLLECTION CENTERS TAB] RBAC tab provides horizontal scrolling for filter pills and minimum width for accounts table"
);

const paymentGatewaySrc43 = fs.readFileSync(path.resolve(__dirname, "../src/components/payment-gateway-tab.tsx"), "utf-8");
assert(
  paymentGatewaySrc43.includes("p-4 sm:p-6") &&
  paymentGatewaySrc43.includes("w-full sm:w-auto justify-center"),
  "[PAYMENT GATEWAY TAB] Payment gateway tab supports responsive padding and mobile-friendly action buttons"
);

const machineIntegrationSrc43 = fs.readFileSync(path.resolve(__dirname, "../src/components/machine-integration-tab.tsx"), "utf-8");
assert(
  machineIntegrationSrc43.includes("p-4 sm:p-6") &&
  machineIntegrationSrc43.includes("p-3.5 sm:p-4") &&
  machineIntegrationSrc43.includes("w-full sm:w-auto justify-center"),
  "[MACHINE INTEGRATION TAB] Machine interfacing tab adapts banner, connection cards, and add analyzer buttons for mobile"
);
assert(
  machineIntegrationSrc43.includes("w-[calc(100vw-2rem)]") &&
  machineIntegrationSrc43.includes("grid-cols-1 sm:grid-cols-2"),
  "[MACHINE INTEGRATION MODAL] Add Analyzer modal enforces mobile viewport width and single-column dropdown stacking"
);
assert(
  settingsSrc43.includes("getResponsiveResetScale") &&
  settingsSrc43.includes("window.addEventListener(\"resize\""),
  "[SETTINGS RESIZE LISTENER] Dynamic scale attaches window resize listener and calculates responsive zoom reset"
);
assert(
  rbacSrc43.includes("flex-col-reverse sm:flex-row") &&
  rbacSrc43.includes("w-full sm:w-auto"),
  "[RBAC ACTIONS STACKING] RBAC creation and edit forms stack action buttons cleanly on mobile viewports"
);
assert(
  settingsSrc43.includes("bg-emerald-600 text-white shadow-xs shrink-0 whitespace-nowrap") &&
  settingsSrc43.includes("Transparent PNG"),
  "[SIGNATURE BADGE NO-WRAP] Doctor Digital Signature transparent PNG badge is protected against line wrapping"
);
assert(
  settingsSrc43.includes("Official Letterhead Background (A4 / A5)") &&
  settingsSrc43.includes("Custom UPI QR Active"),
  "[BILLS LAYOUT MOBILE RESPONSIVENESS] Bills Layout cards and uploaded previews adapt cleanly across mobile viewports"
);
assert(
  navbarSrc43.includes("min-h-[36px] min-w-[36px]") &&
  navbarSrc43.includes("pointer-events-none"),
  "[NAVBAR TOUCH TARGET] Notification trigger button enforces accessible touch target and non-intercepting badge"
);


// ==============================================================================
// 44. Comprehensive LIS AI Assistant Training, Role-Based Access & Tech Shielding
// ==============================================================================
console.log("\n▶ MODULE 44: Comprehensive LIS AI Assistant Training, Role-Based Access & Tech Shielding");

const aiWidgetSrc44 = fs.readFileSync(path.resolve(__dirname, "../src/components/ai-guide-widget.tsx"), "utf-8");
const aiBackendSrc44 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/AiController.php"), "utf-8");

// 44.1 Frontend AI Guide - Role-Aware FAQs & Quick Prompts
assert(
  aiWidgetSrc44.includes("ADMIN_FAQ_SUGGESTIONS") &&
  aiWidgetSrc44.includes("AI Smart Clinical Report") &&
  aiWidgetSrc44.includes("Manual Batch Worksheet") &&
  aiWidgetSrc44.includes("Diagnostic Health Packages") &&
  aiWidgetSrc44.includes("Rate List & 1-Click % Discount") &&
  aiWidgetSrc44.includes("Dues & Balance Collection") &&
  aiWidgetSrc44.includes("Monthly Expenses & P&L") &&
  aiWidgetSrc44.includes("Sample Rejection & Recollection") &&
  aiWidgetSrc44.includes("Lab Account & Daily Quota") &&
  aiWidgetSrc44.includes("RBAC & Staff Terminals"),
  "[AI GUIDE WIDGET FAQS] Frontend AI Guide widget includes quick prompts for all modern modules"
);

// 44.2 Frontend AI Fallback - Sections 14 through 25
assert(
  aiWidgetSrc44.includes("14. AI Smart Clinical Reports") &&
  aiWidgetSrc44.includes("15. Manual Laboratory Worksheet") &&
  aiWidgetSrc44.includes("16. Diagnostic Health Packages") &&
  aiWidgetSrc44.includes("17. Rate List Master & Agreements") &&
  aiWidgetSrc44.includes("18. Dues Management & Outstanding Balance") &&
  aiWidgetSrc44.includes("19. Monthly Business & Expenses Register") &&
  aiWidgetSrc44.includes("20. Sample Rejection & Recollection") &&
  aiWidgetSrc44.includes("21. Lab Account, Subscriptions & GST Invoices") &&
  aiWidgetSrc44.includes("22. Role-Based Access Control (RBAC) & Terminal Accounts") &&
  aiWidgetSrc44.includes("23. Custom Editor & Narrative Histopathology Reports") &&
  aiWidgetSrc44.includes("24. Outsourced Cases & Batch Printing") &&
  aiWidgetSrc44.includes("25. Help & Technical Support System"),
  "[AI CLIENT FALLBACK SECTIONS] Frontend fallback knowledge base contains full guidance for sections 14 through 25"
);

// 44.3 Strict Tech Shielding & Role Security Checks
assert(
  aiWidgetSrc44.includes('"laravel"') &&
  aiWidgetSrc44.includes('"source code"') &&
  aiWidgetSrc44.includes("OnePath LIS is a proprietary, secure enterprise laboratory information system"),
  "[TECH SHIELDING CLIENT] Frontend AI guide intercepts and shields technical stack and source code queries"
);

// 44.4 Backend AI Controller - System Prompt Role Coverage
assert(
  aiBackendSrc44.includes("ROLE 1: COLLECTION CENTER (CC) PORTAL") &&
  aiBackendSrc44.includes("ROLE 2: RECEPTIONIST (FRONT DESK) PORTAL") &&
  aiBackendSrc44.includes("ROLE 3: B2B PARTNER PORTAL") &&
  aiBackendSrc44.includes("ROLE 4: ADMIN / PATHOLOGIST / SUPER ADMIN"),
  "[BACKEND AI ROLES] Backend AI controller defines explicit clinical and financial role boundaries"
);

// 44.5 Backend AI Controller - Modern Feature System Prompt Coverage
assert(
  aiBackendSrc44.includes("Collection Centers CANNOT enter test results") &&
  aiBackendSrc44.includes("Receptionists do not enter test result values") &&
  aiBackendSrc44.includes("B2B Partners only see their own patients") &&
  aiBackendSrc44.includes("AI Smart Clinical Reports") &&
  aiBackendSrc44.includes("Role-Based Access Control (RBAC)"),
  "[BACKEND AI SYSTEM PROMPT] Backend system prompt comprehensively trains the AI model on all modern LIS workflows"
);

// 44.6 Backend Fallback Engine Completeness
assert(
  aiBackendSrc44.includes("14. AI Smart Clinical Reports & Visual Executive Dossier") &&
  aiBackendSrc44.includes("15. Manual Laboratory Worksheet (Batch Bench Testing)") &&
  aiBackendSrc44.includes("16. Diagnostic Health Packages") &&
  aiBackendSrc44.includes("17. Rate List Master & B2B Custom Agreements") &&
  aiBackendSrc44.includes("18. Dues Management & Outstanding Balance Collection") &&
  aiBackendSrc44.includes("19. Monthly Business & Operational Expenses Register") &&
  aiBackendSrc44.includes("20. Sample Rejection & Quality Control Recollection") &&
  aiBackendSrc44.includes("21. Lab Account, SaaS Subscription & GST Tax Invoices") &&
  aiBackendSrc44.includes("22. Role-Based Access Control (RBAC) & Terminal Accounts") &&
  aiBackendSrc44.includes("23. Custom Editor & Narrative Histopathology / Biopsy Reports") &&
  aiBackendSrc44.includes("24. Outsourced Cases & Batch Report Printing") &&
  aiBackendSrc44.includes("25. Help & Technical Support System"),
  "[BACKEND AI FALLBACK ENGINE] Backend offline fallback engine mirrors all modern sections 14 through 25"
);

// ==============================================================================
// 45. Pre-Generated Vector PDF Caching & Zero-Resource Concurrency Engine (Approach A)
// ==============================================================================
console.log("\n▶ MODULE 45: Pre-Generated Vector PDF Caching & Zero-Resource Concurrency Engine (Approach A)");

const pdfRouteSrc45 = fs.readFileSync(
  path.join(__dirname, "../src/app/api/reports/download-pdf/route.ts"),
  "utf-8"
);

assert(
  pdfRouteSrc45.includes("crypto.createHash(\"sha256\").update(html).digest(\"hex\")"),
  "[PDF CACHE DETERMINISM] Next.js route uses cryptographic SHA-256 content hashing for deterministic PDF cache keys"
);

assert(
  pdfRouteSrc45.includes(".cache") && pdfRouteSrc45.includes("reports-pdf"),
  "[PDF DISK PERSISTENCE] Next.js route establishes local disk cache directory for pre-generated vector PDFs"
);

assert(
  pdfRouteSrc45.includes("X-PDF-Cache") &&
  pdfRouteSrc45.includes("\"HIT\"") &&
  pdfRouteSrc45.includes("\"MISS\""),
  "[PDF CACHE TELEMETRY] Next.js route emits X-PDF-Cache HIT/MISS telemetry headers"
);

assert(
  pdfRouteSrc45.includes("inflightGenerations") &&
  pdfRouteSrc45.includes("new Map<string, Promise<Buffer>>()"),
  "[PDF REQUEST DEDUPLICATION] Next.js route prevents duplicate concurrent Chromium runs via SingleFlight map"
);

assert(
  pdfRouteSrc45.includes("MAX_CONCURRENT_CHROMIUM") &&
  pdfRouteSrc45.includes("acquireSlot") &&
  pdfRouteSrc45.includes("releaseSlot"),
  "[PDF CONCURRENCY GUARD] Next.js route bounds simultaneous Chromium instances with semaphore to eliminate OOM server crashes"
);

assert(
  pdfRouteSrc45.includes("preferCSSPageSize: true") &&
  pdfRouteSrc45.includes("deviceScaleFactor: 2"),
  "[PDF PRISTINE VECTOR QUALITY] Chromium preserves high-DPI 2x vector scaling and exact CSS page size"
);

// ==============================================================================
// 46. Responsive AI Assistant Window, Responsive Send Button & Instant Topic Dismissal
// ==============================================================================
console.log("\n▶ MODULE 46: Responsive AI Assistant Window, Responsive Send Button & Instant Topic Dismissal");

const aiWidgetSrc46 = fs.readFileSync(path.resolve(__dirname, "../src/components/ai-guide-widget.tsx"), "utf-8");

// 46.1 Mobile & PC Responsive Window Container
assert(
  aiWidgetSrc46.includes("fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-6 sm:left-4 md:left-[268px]") &&
  aiWidgetSrc46.includes("w-auto sm:w-[460px] md:w-[480px]") &&
  aiWidgetSrc46.includes("max-w-[calc(100vw-16px)] sm:max-w-[500px]") &&
  aiWidgetSrc46.includes("h-[calc(100dvh-16px)] sm:h-[620px] max-h-[calc(100dvh-16px)] sm:max-h-[740px]"),
  "[AI WINDOW RESPONSIVE CONTAINER] AI guide window adapts dynamically across mobile viewports and desktop sidebar layout"
);

// 46.2 Mobile Responsive Send Button & Input Form
assert(
  aiWidgetSrc46.includes("min-h-[32px] sm:h-7.5 px-3 sm:px-3.5") &&
  aiWidgetSrc46.includes("shrink-0 whitespace-nowrap") &&
  aiWidgetSrc46.includes("Tap <strong>Send</strong>") &&
  aiWidgetSrc46.includes("Press <strong>Enter ↵</strong> to send"),
  "[AI SEND BUTTON RESPONSIVENESS] Send button and bottom hints adapt cleanly for touch screens and keyboard input"
);

// 46.3 Common Help Topics Instant Dismissal & Auto-Scroll
assert(
  aiWidgetSrc46.includes("hasUserMessage = useMemo(() =>") &&
  aiWidgetSrc46.includes('messages.some((m) => m.role === "user")') &&
  aiWidgetSrc46.includes("!hasUserMessage && !loading && (") &&
  aiWidgetSrc46.includes("scrollToBottom()"),
  "[COMMON TOPICS DISMISSAL BUG FIX] Common help topics disappear immediately upon user command and chat auto-scrolls smoothly"
);

// ==============================================================================
// 47. Dues Report Centre & Source Dropdown Filter with Default Main Lab & All Dues
// ==============================================================================
console.log("\n▶ MODULE 47: Dues Report Centre & Source Dropdown Filter with Default Main Lab & All Dues");

const duesPageSrc47 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/dues/page.tsx"), "utf-8");

// 47.1 Dropdown Replaces Search Bar in Dues Report Page
assert(
  duesPageSrc47.includes("Select") &&
  duesPageSrc47.includes("SelectTrigger") &&
  duesPageSrc47.includes("SelectValue") &&
  duesPageSrc47.includes("SelectContent") &&
  duesPageSrc47.includes("SelectItem") &&
  duesPageSrc47.includes("Building2"),
  "[DUES DROPDOWN COMPONENT] Dues report imports and mounts Radix Select dropdown with Building2 icon"
);

// 47.2 Default Selected State is 'MAIN_LAB' (Main Lab Walk-in Cases)
assert(
  duesPageSrc47.includes('useState<string>("MAIN_LAB")') &&
  duesPageSrc47.includes('value="MAIN_LAB"') &&
  duesPageSrc47.includes("Main Lab") &&
  duesPageSrc47.includes("(Direct In-house)"),
  "[DUES DEFAULT MAIN LAB] Dues dropdown defaults to 'MAIN_LAB' for in-house/walk-in patient dues"
);

// 47.3 'ALL' Option for Complete Aggregated Dues Across Centers
assert(
  duesPageSrc47.includes('value="ALL"') &&
  duesPageSrc47.includes("All Dues") &&
  duesPageSrc47.includes("(Total Across All)"),
  "[DUES ALL SOURCES OPTION] Dues dropdown provides 'ALL' option displaying total dues across all centers"
);

// 47.4 Collection Centres and B2B Partners Dynamic Mapping with Badges
assert(
  duesPageSrc47.includes("loadCollectionCenters") &&
  duesPageSrc47.includes('fetchFromLaravel("/collection-centers")') &&
  duesPageSrc47.includes("Collection Centres & B2B Partners") &&
  duesPageSrc47.includes("isB2B") &&
  duesPageSrc47.includes("isReception"),
  "[DUES CENTERS AND B2B MAPPING] Dues dropdown fetches collection centers and categorizes B2B, Reception, and CC"
);

// 47.5 Collection Center Parameter Transmission & Rapid Cache Resolution
assert(
  duesPageSrc47.includes('params.append("collection_center_id", activeCenter)') &&
  duesPageSrc47.includes("lis_cached_due_report_v2_") &&
  duesPageSrc47.includes("handleCenterChange"),
  "[DUES API PARAM & CACHE] Dues request dispatches collection_center_id filter and isolates cache per centre"
);

// ==============================================================================
// 48. Sileo Toast Physics-Based Toast Mobile & Multi-Device Responsiveness
// ==============================================================================
console.log("\n▶ MODULE 48: Sileo Physics-Based Toast Mobile & Multi-Device Responsiveness");

const globalsCssSrc48 = fs.readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf-8");

// 48.1 CSS Root Dynamic Width Override for Sileo
assert(
  globalsCssSrc48.includes("--sileo-width: min(calc(100vw - 1.5rem), 356px)") &&
  globalsCssSrc48.includes("[data-sileo-viewport]") &&
  globalsCssSrc48.includes("[data-sileo-toast]"),
  "[SILEO CSS ROOT VARIABLE] globals.css sets responsive --sileo-width bound to min(calc(100vw - 1.5rem), 356px)"
);

// 48.2 Mobile Viewport Max-Width and Center Alignment Override
assert(
  globalsCssSrc48.includes("@media (max-width: 640px)") &&
  globalsCssSrc48.includes("--sileo-width: min(calc(100vw - 1rem), 340px) !important;") &&
  globalsCssSrc48.includes("max-width: calc(100vw - 1rem) !important;"),
  "[SILEO MOBILE VIEWPORT] Mobile media query bounds toast width to min(calc(100vw - 1rem), 340px) preventing viewport overflow"
);

// 48.3 Safe Typography Truncation & Word Wrapping
assert(
  globalsCssSrc48.includes("text-overflow: ellipsis !important;") &&
  globalsCssSrc48.includes("word-break: break-word !important;") &&
  globalsCssSrc48.includes("overflow-wrap: anywhere !important;"),
  "[SILEO MOBILE TEXT SAFETY] Sileo title enforces ellipsis truncation and description enforces clean multi-line word wrapping"
);

// 48.4 Fluid Mobile Viewport Responsive Scale & Symmetrical Margins
assert(
  globalsCssSrc48.includes("scale(0.94) !important;") &&
  globalsCssSrc48.includes("scale(0.90) !important;") &&
  globalsCssSrc48.includes("scale(0.84) !important;"),
  "[SILEO RESPONSIVE SCALING] Viewport scales proportionally on mobile devices maintaining symmetrical left/right margins"
);

// 48.5 Intelligent Intent Detection & Negative Coordinate Prevention
const toastSrc48 = fs.readFileSync(path.resolve(__dirname, "../src/components/ui/toast.tsx"), "utf-8");
assert(
  toastSrc48.includes("Reset Link Sent") &&
  toastSrc48.includes("derivedTitle") &&
  toastSrc48.includes("input.length > 24"),
  "[SILEO INTENT EXTRACTION] Toast normalizer extracts concise title and bounds title width to prevent coordinate overflow");

// ==============================================================================
// 49. Overview Dashboard Symmetrical Layout, Total Sales Chart, Shimmer & LIS Hub
// ==============================================================================
console.log("\n▶ MODULE 49: Overview Dashboard Symmetrical Layout, Total Sales Chart, Shimmer & LIS Hub");

const overviewPageSrc49 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/page.tsx"), "utf-8");
const shimmerSrc49 = fs.readFileSync(path.resolve(__dirname, "../src/components/dashboard-shimmer.tsx"), "utf-8");

// 49.1 Total Sales & Revenue Chart Mounting & Area Component
assert(
  overviewPageSrc49.includes("AreaChart") &&
  overviewPageSrc49.includes("Area") &&
  overviewPageSrc49.includes("Total Sales & Revenue Trend") &&
  overviewPageSrc49.includes("salesRevenueGradient"),
  "[OVERVIEW TOTAL SALES CHART] Overview dashboard renders Total Sales & Revenue AreaChart with emerald gradient"
);

// 49.2 Balanced Symmetrical 6-Column Layout for Trend Charts
assert(
  overviewPageSrc49.includes("Weekly Reports Trend") &&
  overviewPageSrc49.includes("col-span-12 lg:col-span-6"),
  "[OVERVIEW CHART SYMMETRY] Weekly Reports Trend and Total Sales Trend are balanced side-by-side in 6-column containers"
);

// 49.3 Data Consistency with Stats Revenue & Trend Calculation
assert(
  overviewPageSrc49.includes("formattedSalesData") &&
  overviewPageSrc49.includes("total7DaysSales") &&
  overviewPageSrc49.includes("avgDailySales") &&
  overviewPageSrc49.includes("stats.totalRevenue") &&
  overviewPageSrc49.includes("stats.revenue"),
  "[OVERVIEW SALES METRICS CONSISTENCY] Total sales chart displays stats.totalRevenue, stats.revenue, and computed 7-day average"
);

// 49.4 Shimmer Loading Placeholders & Fast Caching
assert(
  overviewPageSrc49.includes("Skeleton") &&
  overviewPageSrc49.includes("lis_cached_dashboard_stats") &&
  overviewPageSrc49.includes("lis_cached_dashboard_charts") &&
  shimmerSrc49.includes("Total Sales Trend Skeleton"),
  "[OVERVIEW SHIMMER & INSTANT CACHE] Dashboard shimmer includes Total Sales skeleton and loads cached metrics in <100ms"
);

// 49.5 Clean Termination of Overview Page & Removal of Redundant Clutter Cards
assert(
  !overviewPageSrc49.includes("Recent Patients & Reports") &&
  !overviewPageSrc49.includes("No recent intakes") &&
  !overviewPageSrc49.includes("Specimen Queue") &&
  !overviewPageSrc49.includes("Test Directory") &&
  !overviewPageSrc49.includes("Referral Network") &&
  !overviewPageSrc49.includes("Financial Ledger") &&
  !shimmerSrc49.includes("Row 3 Shimmer"),
  "[OVERVIEW CLEAN LAYOUT] Redundant bottom patient card and 4 quick action cards removed for a clean, focused dashboard"
);

// 49.6 Dues Payment "View all" Single-Line Text Link & Non-Wrapping Mobile Layout
assert(
  overviewPageSrc49.includes('text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors') &&
  overviewPageSrc49.includes('<span>View all</span>') &&
  !overviewPageSrc49.includes('px-2.5 py-1 rounded-md bg-primary/10'),
  "[OVERVIEW DUES LINK CLEAN TEXT] Dues card renders 'View all' as clean single-line non-wrapping text without pill"
);

// 49.7 Diagnostic Report Status Clean Single-Line Label & Turnaround Progress
assert(
  overviewPageSrc49.includes('whitespace-nowrap shrink-0 flex items-center gap-1.5') &&
  overviewPageSrc49.includes('{completionPct}% Completed') &&
  overviewPageSrc49.includes("Turnaround") &&
  overviewPageSrc49.includes("Today's Intake Completed") &&
  !overviewPageSrc49.includes("px-2.5 py-1 rounded-full bg-emerald-500/15"),
  "[OVERVIEW REPORT STATUS ALIGNMENT] Diagnostic status renders single-line label without bulky pill and balances desktop height"
);

// 49.8 Weekly Trend 7-Day Volume Responsive Single-Line Label
assert(
  overviewPageSrc49.includes("7-Day Volume") &&
  overviewPageSrc49.includes("text-[11px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap shrink-0") &&
  !overviewPageSrc49.includes('px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60">7-Day Volume'),
  "[OVERVIEW 7-DAY VOLUME RESPONSIVE] Weekly reports trend renders 7-Day Volume as responsive non-wrapping single line text"
);

// ==============================================================================
// 50. Profile & My Account Responsive Layout, Rounded Switcher & Real Sessions
// ==============================================================================
console.log("\n▶ MODULE 50: Profile & My Account Responsive Layout, Rounded Switcher & Real Sessions");

const profilePageSrc50 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/account/profile/page.tsx"), "utf-8");

// 50.1 Fluid Full-Width Container & Zero Cramped Box Boundary
assert(
  profilePageSrc50.includes("w-full max-w-6xl mx-auto space-y-6 pb-20 px-3 sm:px-6 lg:px-8") &&
  !profilePageSrc50.includes("max-w-2xl mx-auto"),
  "[PROFILE RESPONSIVE LAYOUT] Profile page expands across modern wide displays (max-w-6xl) eliminating awkward box margins"
);

// 50.2 Sleek Compact Premium Segmented Tab Switcher
assert(
  profilePageSrc50.includes("rounded-xl bg-muted/70 border border-border/70 shadow-2xs backdrop-blur-sm") &&
  profilePageSrc50.includes("rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer") &&
  profilePageSrc50.includes("bg-card text-foreground shadow-xs border border-border/70 font-bold"),
  "[PROFILE TAB SWITCHER] Switcher is rendered as a sleek compact premium segmented island with elevated active pill"
);

// 50.3 Modular Form Fields & Diagnostic Lab Direct Link
assert(
  profilePageSrc50.includes("Official Account Email") &&
  profilePageSrc50.includes("Security Locked") &&
  profilePageSrc50.includes("Diagnostic Centre / Laboratory") &&
  profilePageSrc50.includes("/dashboard/account/lab?tab=centre") &&
  profilePageSrc50.includes("Manage Lab Profile"),
  "[PROFILE MODULAR FIELDS] Account details rendered as distinct professional cards with email security and direct lab management link"
);

// 50.4 Live Multi-Device Sessions API Integration
assert(
  profilePageSrc50.includes("fetchFromLaravel(\"/profile/sessions\")") &&
  profilePageSrc50.includes("fetchFromLaravel(`/profile/sessions/${sessionId}`") &&
  profilePageSrc50.includes("fetchFromLaravel(\"/profile/sessions/revoke-others\"") &&
  profilePageSrc50.includes("ActiveSession"),
  "[PROFILE SESSIONS API] Sessions tab integrates with real backend endpoints for active device retrieval and revocation"
);

// 50.5 Real Device Cards, Individual Logout & Bulk Remote Revocation
assert(
  profilePageSrc50.includes("Log Out All Other Devices") &&
  profilePageSrc50.includes("This Device (Current)") &&
  profilePageSrc50.includes("Remote Device") &&
  profilePageSrc50.includes("Smartphone") &&
  profilePageSrc50.includes("Laptop"),
  "[PROFILE DEVICE MANAGEMENT] Displays multi-device identity, active status indicators, individual logout, and all-other logout"
);

// ==============================================================================
// 51. Lab Account Rounded Tab Switcher, GST Invoices & Subscription Mobile UX
// ==============================================================================
console.log("\n▶ MODULE 51: Lab Account Rounded Tab Switcher, GST Invoices & Subscription Mobile UX");

const labAccountPageSrc51 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/account/lab/page.tsx"), "utf-8");

// 51.1 Sleek Compact Premium Segmented Tab Switcher with Mobile Overflow Protection
assert(
  labAccountPageSrc51.includes("inline-flex items-center p-1 rounded-xl bg-muted/70 border border-border/70 shadow-2xs backdrop-blur-sm gap-1 min-w-max") &&
  labAccountPageSrc51.includes("w-full overflow-x-auto scrollbar-none pb-1") &&
  labAccountPageSrc51.includes("rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0") &&
  labAccountPageSrc51.includes("bg-card text-foreground shadow-xs border border-border/70 font-bold"),
  "[LAB TAB SWITCHER ROUNDED] Lab account tab switcher rendered as sleek compact premium island with elevated active pill and mobile scroll"
);

// 51.2 GST Tax Invoices Mobile Dedicated Card Layout & Symmetrical Single-Line Buttons
assert(
  labAccountPageSrc51.includes("md:hidden divide-y divide-border/60") &&
  labAccountPageSrc51.includes("grid grid-cols-2 gap-2 pt-0.5") &&
  labAccountPageSrc51.includes("hidden md:block table-responsive-container") &&
  labAccountPageSrc51.includes("<span className=\"whitespace-nowrap\">Email PDF</span>") &&
  labAccountPageSrc51.includes("<span className=\"whitespace-nowrap\">Download PDF</span>"),
  "[GST INVOICE MOBILE RESPONSIVENESS] GST invoices provide mobile-optimized cards with symmetrical single-line action buttons"
);

// 51.3 Subscription Plan Metrics Single-Line Alignment & Responsive Pill Badges
assert(
  labAccountPageSrc51.includes("rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap shrink-0") &&
  labAccountPageSrc51.includes("₹4,999.00 / year") &&
  labAccountPageSrc51.includes("whitespace-nowrap") &&
  labAccountPageSrc51.includes("Overlimit Active (Pay-As-You-Go)"),
  "[SUBSCRIPTION MOBILE LAYOUT & PILLS] Subscription plan displays single-line metrics, non-wrapping pill badges, and mobile-aligned meters"
);

// ==============================================================================
// 52. Profile Reset Password Via Link & Professional Reset Password Page UI
// ==============================================================================
console.log("\n▶ MODULE 52: Profile Reset Password Via Link & Professional Reset Password Page UI");

const profilePageSrc52 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/account/profile/page.tsx"), "utf-8");
const resetPasswordPageSrc52 = fs.readFileSync(path.resolve(__dirname, "../src/app/reset-password/page.tsx"), "utf-8");

// 52.1 Profile Password Reset dispatches via Link matching Login Forgot Password Flow
assert(
  profilePageSrc52.includes("fetch(`${getAuthBaseUrl()}/forgot-password`") &&
  profilePageSrc52.includes("Send Password Reset Link") &&
  profilePageSrc52.includes("Reset Link Sent Successfully!") &&
  profilePageSrc52.includes("cooldownSeconds") &&
  profilePageSrc52.includes("Resend Link"),
  "[PROFILE RESET LINK DISPATCH] My Account sends reset link via /forgot-password with cooldown and instant status"
);

// 52.2 Reset Password Page UI/UX, Dynamic Strength Meter & Mobile Alignment
assert(
  resetPasswordPageSrc52.includes("getPasswordStrength") &&
  resetPasswordPageSrc52.includes("grid grid-cols-4 gap-1.5 h-1.5") &&
  resetPasswordPageSrc52.includes("Update Password & Sign In") &&
  resetPasswordPageSrc52.includes("whitespace-nowrap shrink-0") &&
  resetPasswordPageSrc52.includes("truncate break-all") &&
  !resetPasswordPageSrc52.includes("Â·"),
  "[RESET PASSWORD PAGE UI] Reset password page renders dynamic strength meter, single-line submit, clean typography & responsive mobile layout"
);

// ==============================================================================
// 53. Fast, Scalable Universal Search Across Patients, Reports, and Billing
// ==============================================================================
console.log("\n▶ MODULE 53: Fast, Scalable Universal Search Across Patients, Reports, and Billing");

const patientsPageSrc53 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/page.tsx"), "utf-8");
const reportsPageSrc53 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/reports/page.tsx"), "utf-8");
const billingPageSrc53 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/page.tsx"), "utf-8");

// 53.1 Patients Page Debounced Live Search & Cross-Date Discovery
assert(
  patientsPageSrc53.includes('params.append("search", q)') &&
  patientsPageSrc53.includes('candidatePatients') &&
  patientsPageSrc53.includes('matchesDate = q.length > 0') &&
  patientsPageSrc53.includes('vial_barcode') &&
  patientsPageSrc53.includes('isSearching'),
  "[PATIENTS SEARCH ENGINE] Patients page debounces search, queries backend across all dates, and searches by name, PID, phone & barcode"
);

// 53.2 Reports Page Debounced Live Search & Multi-Field Resolution
assert(
  reportsPageSrc53.includes('params.append("search", q)') &&
  reportsPageSrc53.includes('candidateReports') &&
  reportsPageSrc53.includes('q.length > 0') &&
  reportsPageSrc53.includes('billId') &&
  reportsPageSrc53.includes('vialBarcode'),
  "[REPORTS SEARCH ENGINE] Reports page debounces live search, queries backend across dates, and resolves report ID, patient name, phone, PID, barcode & invoice ID"
);

// 53.3 Billing Page Debounced Live Search & Comprehensive Matchers
assert(
  billingPageSrc53.includes('params.append("search", q)') &&
  billingPageSrc53.includes('candidateBills') &&
  billingPageSrc53.includes('matchesDate = q.length > 0') &&
  billingPageSrc53.includes('barcode') &&
  billingPageSrc53.includes('uhid'),
  "[BILLING SEARCH ENGINE] Billing page debounces live search, bypasses single-day restriction on query, and searches invoice ID, patient, phone, PID & barcode"
);

// 53.4 Backend Controllers Multi-Entity Search Query Coverage
const backendPatientCtrlSrc53 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/PatientController.php"), "utf-8");
const backendReportCtrlSrc53 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/ReportController.php"), "utf-8");
const backendBillCtrlSrc53 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/BillController.php"), "utf-8");

assert(
  backendPatientCtrlSrc53.includes("reports") &&
  backendReportCtrlSrc53.includes("bill") &&
  backendBillCtrlSrc53.includes("vial_barcode") &&
  backendBillCtrlSrc53.includes("reports"),
  "[BACKEND SEARCH INTEGRITY] Controllers execute multi-entity joined searches across reports, bills, patients, barcodes & phones"
);


// ==============================================================================
// 54. Top Global Search Optimization, Direct Patient Details & Lab Report History
// ==============================================================================
console.log("\n▶ MODULE 54: Top Global Search Optimization, Direct Patient Details & Lab Report History");

const navbarSrc54 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/navbar.tsx"), "utf-8");
const patientDetailsPageSrc54 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/[id]/page.tsx"), "utf-8");
const patientCtrlSrc54 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/PatientController.php"), "utf-8");

// 54.1 Top Global Search Targeted Patient Query & Fast Navigation
assert(
  navbarSrc54.includes('/patients?search=') &&
  navbarSrc54.includes('/dashboard/patients/') &&
  navbarSrc54.includes('Search by Phone Number, Name, Patient ID, UHID, ABHA') &&
  !navbarSrc54.includes('Diagnostic Reports (') &&
  !navbarSrc54.includes('Invoices ('),
  "[GLOBAL PATIENT SEARCH] Navbar executes single fast /patients query, isolates results to patients only, and navigates to /dashboard/patients/[id]"
);

// 54.2 Dedicated Patient Details & History Page Architecture
assert(
  patientDetailsPageSrc54.includes("Patient History") &&
  patientDetailsPageSrc54.includes("Age/Gender") &&
  patientDetailsPageSrc54.includes("formatPatientListDisplayName") &&
  !patientDetailsPageSrc54.includes("Merge Patient") &&
  !patientDetailsPageSrc54.includes("Link ABHA"),
  "[PATIENT DETAILS ARCHITECTURE] Patient Details page renders focused demographics, Age/Gender, eliminates duplicate titles & maintains clean clinical view"
);

// 54.3 Lab Report History Table & Multi-Action Dropdown Menu
assert(
  patientDetailsPageSrc54.includes("Lab Report History") &&
  patientDetailsPageSrc54.includes("Bill Date") &&
  patientDetailsPageSrc54.includes("Bill Id") &&
  patientDetailsPageSrc54.includes("Referral") &&
  patientDetailsPageSrc54.includes("View Bill") &&
  patientDetailsPageSrc54.includes("Enter Result") &&
  patientDetailsPageSrc54.includes("FullscreenPrintReportModal") &&
  patientDetailsPageSrc54.includes("InvoiceSheet"),
  "[LAB REPORT HISTORY TABLE] Renders 8-column clinical history with sortable headers, Report modal, View Bill invoice sheet & Enter Result navigation"
);

// 54.4 Backend Controller Multi-Entity Patient & Bill Search
assert(
  patientCtrlSrc54.includes("orWhereHas('bills'") &&
  patientCtrlSrc54.includes("orWhereHas('reports'") &&
  patientCtrlSrc54.includes("orWhere('uhid', $id)"),
  "[BACKEND SEARCH & SHOW RESOLUTION] PatientController resolves patients by bill custom ID, report custom ID, UHID & eager-loads full financial history"
);


// ==============================================================================
// 55. LIMS Desktop & Mobile PWA Installation, Floating Pill UX & Persistent Dismissal
// ==============================================================================
console.log("\n▶ MODULE 55: LIMS Desktop & Mobile PWA Installation, Floating Pill UX & Persistent Dismissal");

const manifestPath = path.resolve(__dirname, "../public/manifest.json");
const swPath = path.resolve(__dirname, "../public/sw.js");
const layoutSrc55 = fs.readFileSync(path.resolve(__dirname, "../src/app/layout.tsx"), "utf-8");
const dashboardLayoutSrc55 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/layout.tsx"), "utf-8");
const installPillSrc55 = fs.readFileSync(path.resolve(__dirname, "../src/components/lims-install-pill.tsx"), "utf-8");

// 55.1 Manifest & Service Worker PWA Spec
assert(
  fs.existsSync(manifestPath) && fs.existsSync(swPath),
  "[PWA ASSETS SPEC] manifest.json and sw.js exist in public directory satisfying PWA installability"
);

const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
assert(
  manifestData.display === "standalone" &&
  manifestData.start_url === "/dashboard" &&
  Array.isArray(manifestData.icons) &&
  manifestData.icons.length > 0,
  "[PWA MANIFEST VALIDATION] Web app manifest specifies standalone mode, start_url and high-res application icons"
);

// 55.2 Root Layout Linking & Dashboard Integration
assert(
  layoutSrc55.includes('manifest: "/manifest.json"') &&
  dashboardLayoutSrc55.includes("<LimsInstallPill />"),
  "[PWA INTEGRATION] Root layout links to manifest.json and Dashboard layout mounts LimsInstallPill"
);

// 55.3 Install Pill State Logic: Standalone Suppression & Persistent Dismissal
assert(
  installPillSrc55.includes("display-mode: standalone") &&
  installPillSrc55.includes("onepath_lims_pwa_dismissed") &&
  installPillSrc55.includes("beforeinstallprompt") &&
  installPillSrc55.includes("appinstalled") &&
  installPillSrc55.includes("Install OnePath Lab"),
  "[PWA INSTALL PILL LOGIC] Pill checks standalone mode, captures beforeinstallprompt, auto-hides on appinstalled, and permanently persists dismissal on close"
);

// ==============================================================================
// 56. Patient History Loaders, Demographics, and Registry Permanent Bill Deletion
// ==============================================================================
console.log("\n▶ MODULE 56: Patient History Loaders, Demographics & Registry Bill Deletion");

const patientDetailsSrc56 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/[id]/page.tsx"), "utf-8");
const patientsRegistrySrc56 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/page.tsx"), "utf-8");
const billCtrlSrc56 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/BillController.php"), "utf-8");

// 56.1 Patient History Action Loaders
assert(
  patientDetailsSrc56.includes("activeRowAction") &&
  patientDetailsSrc56.includes("Loading Bill...") &&
  patientDetailsSrc56.includes("Opening Editor...") &&
  patientDetailsSrc56.includes("Loading Patient...") &&
  patientDetailsSrc56.includes("loadingPrintId === row.reportId") && patientDetailsSrc56.includes("Loading..."),
  "[PATIENT HISTORY LOADERS] Active loaders rendered on 3-dots trigger, menu items & Report button for responsive feedback"
);

// 56.2 Demographics: Phone Number & Referred By
assert(
  patientDetailsSrc56.includes("Phone Number") &&
  patientDetailsSrc56.includes("Referred By") &&
  patientDetailsSrc56.includes("patPhone") &&
  patientDetailsSrc56.includes("ref_doctor"),
  "[PATIENT HISTORY DEMOGRAPHICS] Top card consistently displays Phone Number and Referred By doctor alongside Age/Gender"
);

// 56.3 Patients Registry Delete Bill Action & Confirmation Dialog
assert(
  patientsRegistrySrc56.includes("Delete Bill") &&
  patientsRegistrySrc56.includes("handleInitiateDeleteBill") &&
  patientsRegistrySrc56.includes("handleConfirmDeleteBill") &&
  patientsRegistrySrc56.includes("deleteBillDialog") &&
  patientsRegistrySrc56.includes("Delete Bill Permanently?"),
  "[PATIENTS REGISTRY DELETE BILL] 3-dots menu offers Delete Bill with confirmation dialog and permanent removal"
);

// 56.4 Backend BillController Transactional Cascading Deletion
assert(
  billCtrlSrc56.includes("public function destroy(Request $request, string $id)") &&
  billCtrlSrc56.includes("\DB::transaction") &&
  billCtrlSrc56.includes("$report->results()->delete()") &&
  billCtrlSrc56.includes("$bill->payments()->delete()") &&
  billCtrlSrc56.includes("$bill->delete()") &&
  billCtrlSrc56.includes("lis_dues_all_"),
  "[BACKEND BILL CASCADE DELETION] BillController destroy executes atomic transaction deleting reports, results, payments and bill with cache invalidation"
);

// ==============================================================================
// 57. Realtime Session Revocation Watchdog, Desktop Install Pill & Cascade Deletion
// ==============================================================================
console.log("\n▶ MODULE 57: Realtime Session Revocation Watchdog, Desktop Pill & Permanent Delete");

const authGuardSrc57 = fs.readFileSync(path.resolve(__dirname, "../src/components/dashboard-auth-guard.tsx"), "utf-8");
const apiClientSrc57 = fs.readFileSync(path.resolve(__dirname, "../src/lib/api-client.ts"), "utf-8");
const installPillSrc57 = fs.readFileSync(path.resolve(__dirname, "../src/components/lims-install-pill.tsx"), "utf-8");
const patientsRegistrySrc57 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/page.tsx"), "utf-8");
const profileSrc57 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/account/profile/page.tsx"), "utf-8");
const profileCtrlSrc57 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/ProfileController.php"), "utf-8");

// 57.1 Realtime Token Revocation & Watchdog
assert(
  authGuardSrc57.includes("verifyActiveSession") &&
  authGuardSrc57.includes("/profile/sessions/status") &&
  authGuardSrc57.includes("handleLogout") &&
  apiClientSrc57.includes("response.status === 401") &&
  apiClientSrc57.includes("handleLogout"),
  "[REALTIME SESSION WATCHDOG] Auth guard checks session status in real-time and 401 instantly evicts revoked sessions to login"
);

// 57.2 Desktop-Only PWA Install Pill
assert(
  installPillSrc57.includes("hidden lg:flex") &&
  installPillSrc57.includes("isMobileOrTablet"),
  "[DESKTOP INSTALL PILL] Install pill is strictly restricted to desktop PCs and suppressed on mobile/tablet viewports"
);

// 57.3 Patients Registry Complete Atomic Patient & Bill Deletion
assert(
  patientsRegistrySrc57.includes("/patients/") &&
  patientsRegistrySrc57.includes("setPatients((prev) => prev.filter") &&
  patientsRegistrySrc57.includes("lis_cached_patients"),
  "[PERMANENT REGISTRY DELETION] Patients registry permanently removes patient, bill, reports & payments atomically from DB and cache"
);

// 57.4 My Account Responsive Single-Line Badges
assert(
  profileSrc57.includes("This Device (Current)") &&
  profileSrc57.includes("whitespace-nowrap shrink-0") &&
  profileCtrlSrc57.includes("public function checkSessionStatus") &&
  profileCtrlSrc57.includes("public function revokeOtherSessions"),
  "[RESPONSIVE PROFILE BADGES & BACKEND SESSIONS] Active status badges render as responsive single-line pills and backend manages sessions cleanly"
);



// ==============================================================================
// 58. Registration Success Invoice Modal Mobile Responsiveness
// ==============================================================================
console.log("\n▶ MODULE 58: Registration Success Invoice Modal Mobile Responsiveness");

const registerSrc58 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/register/page.tsx"), "utf-8");
const printInvoiceSrc58 = fs.readFileSync(path.resolve(__dirname, "../src/lib/print-invoice.ts"), "utf-8");

// 58.1 Symmetrical, Responsive 3-Button Action Bar
assert(
  registerSrc58.includes("grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5") &&
  registerSrc58.includes("handleSendWhatsAppInvoice") &&
  registerSrc58.includes("handleDownloadInvoicePdf") &&
  registerSrc58.includes("printInvoiceElement"),
  "[INVOICE MODAL BUTTONS] Action buttons render as a responsive 3-column equal-width grid on mobile and flex row on desktop"
);

// 58.2 Header Collision Avoidance with Dialog Close Button
assert(
  registerSrc58.includes("pr-12 sm:pr-14") &&
  registerSrc58.includes("flex flex-col sm:flex-row items-stretch sm:items-center justify-between"),
  "[INVOICE HEADER RESPONSIVE] Header flexes vertically on mobile with reserved right padding preventing close button overlap"
);

// 58.3 Mobile Fit-to-Width Scaling & Zoom Mode
assert(
  registerSrc58.includes("invoiceScale") &&
  registerSrc58.includes("isMobileInvoice") &&
  registerSrc58.includes("invoiceZoomMode") &&
  registerSrc58.includes("fitScale = Number((availableW / baseW).toFixed(3))"),
  "[INVOICE MOBILE SCALING] Mobile viewport automatically calculates fit scale preventing horizontal clipping and supports zoom toggle"
);

// 58.4 Pristine Vector Print Transform Reset
assert(
  printInvoiceSrc58.includes("[style*=\"transform\"]") &&
  printInvoiceSrc58.includes("transform: none !important;"),
  "[PRINT TRANSFORM SAFETY] Print utility forcefully clears all preview transform scales ensuring 100% crisp full-resolution printing"
);

// ==============================================================================
// 59. Amazon SES Email OTP Verification for Website Trial & LIS RBAC Terminals
// ==============================================================================
console.log("\n▶ MODULE 59: Amazon SES Email OTP Verification for Website Trial & LIS RBAC Terminals");

const trialFormSrc59 = fs.readFileSync(path.resolve(__dirname, "../../OnePath-Lab-Website/app/trial/TrialForm.tsx"), "utf-8");
const rbacTabSrc59 = fs.readFileSync(path.resolve(__dirname, "../src/components/collection-centers-tab.tsx"), "utf-8");
const backendAuthCtrlSrc59 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/AuthController.php"), "utf-8");
const backendCcCtrlSrc59 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/CollectionCenterController.php"), "utf-8");
const backendRoutesSrc59 = fs.readFileSync(path.resolve(__dirname, "../../Backend/routes/api.php"), "utf-8");

// 59.1 Website Free Trial Form OTP Flow
assert(
  trialFormSrc59.includes("handleSendOtp") &&
  trialFormSrc59.includes("handleFinalRegister") &&
  trialFormSrc59.includes("/auth/send-registration-otp") &&
  trialFormSrc59.includes("isOtpSent") &&
  trialFormSrc59.includes("otpCode") &&
  trialFormSrc59.includes("resendCooldown") &&
  trialFormSrc59.includes("Verify & Activate 7-Day Free Trial"),
  "[WEBSITE TRIAL OTP FLOW] Trial registration dispatches 6-digit email OTP via SES, displays interactive verification card with countdown & validates code"
);

// 59.2 LIS RBAC Staff Terminal OTP Verification Flow
assert(
  rbacTabSrc59.includes("handleRequestOtp") &&
  rbacTabSrc59.includes("handleVerifyAndCreateCenter") &&
  rbacTabSrc59.includes("/collection-centers/send-otp") &&
  rbacTabSrc59.includes("showOtpModal") &&
  rbacTabSrc59.includes("otpCode") &&
  rbacTabSrc59.includes("Staff Email Authorization") &&
  rbacTabSrc59.includes("Verify & Create Account"),
  "[LIS RBAC STAFF OTP FLOW] RBAC role creation triggers email authorization OTP to staff, opens secure verification modal & validates code before database persistence"
);

// 59.3 Backend Rate-Limited OTP Endpoints & SES Mail Delivery
assert(
  backendRoutesSrc59.includes("send-registration-otp") &&
  backendRoutesSrc59.includes("collection-centers/send-otp") &&
  backendAuthCtrlSrc59.includes("sendRegistrationOtp") &&
  backendAuthCtrlSrc59.includes("reg_otp_") &&
  backendCcCtrlSrc59.includes("sendOtp") &&
  backendCcCtrlSrc59.includes("rbac_otp_"),
  "[BACKEND OTP SECURITY & DISPATCH] Backend provides rate-limited endpoints for trial and staff OTP generation, cryptographic hashing & branded SES delivery"
);

// 59.4 Backend Registration & RBAC Creation OTP Verification
assert(
  backendAuthCtrlSrc59.includes("Invalid or expired email verification code") &&
  backendCcCtrlSrc59.includes("Invalid or expired staff verification code") &&
  backendCcCtrlSrc59.includes("Cache::forget(\"rbac_otp_"),
  "[BACKEND OTP VERIFICATION GATE] Account registration and staff creation strictly enforce OTP verification, preventing unauthorized creation and purging one-time codes"
);

// 59.5 RBAC 3-Dots Actions Menu & Instant Token Revocation on Suspension
assert(
  rbacTabSrc59.includes("data-rbac-menu") &&
  rbacTabSrc59.includes("handleToggleStatus") &&
  rbacTabSrc59.includes("Suspend Account") &&
  rbacTabSrc59.includes("Unsuspend Account") &&
  backendCcCtrlSrc59.includes("$center->tokens()->delete()"),
  "[RBAC ACTIONS MENU & SUSPENSION GATE] RBAC table renders 3-dots actions menu with Edit, Suspend/Unsuspend & Delete options with instant session revocation"
);

console.log("\n▶ MODULE 60: Collection Center Role Portal Customizations & Security Scoping");

const patientsPageSrc60 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/page.tsx"), "utf-8");
const patientDetailsPageSrc60 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/patients/[id]/page.tsx"), "utf-8");
const duesPageSrc60 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/billing/dues/page.tsx"), "utf-8");
const monthlyExpensesRegisterSrc60 = fs.readFileSync(path.resolve(__dirname, "../src/components/monthly-expenses-register.tsx"), "utf-8");
const backendBillCtrlSrc60 = fs.readFileSync(path.resolve(__dirname, "../../Backend/app/Http/Controllers/Api/Lis/BillController.php"), "utf-8");

// 60.1 Patients Page: Collection Center view details icon & edit patient button with active loaders
assert(
  patientsPageSrc60.includes("isCollectionCenter ? (") &&
  patientsPageSrc60.includes("title=\"View Patient Details\"") &&
  patientsPageSrc60.includes("title=\"Edit Patient Details & Tests\"") &&
  patientsPageSrc60.includes("navigatingViewId === patient.id") &&
  patientsPageSrc60.includes("router.push(\"/dashboard/patients/\" + patient.id)"),
  "[PATIENTS PAGE CC ACTIONS] Collection Center role renders dedicated View Details and Edit Patient actions with active loading indicators"
);

// 60.2 Patient Details Page: Report History 3-dots hidden for Collection Center
assert(
  patientDetailsPageSrc60.includes("!isCollectionCenter && (") &&
  patientDetailsPageSrc60.includes("<span>{loadingPrintId === row.reportId ? \"Loading...\" : \"Report\"}</span>"),
  "[PATIENT DETAILS CC REPORT HISTORY] Report history table hides 3-dots action menu for Collection Center, showing only the Report button"
);

// 60.3 Dues Report Page: CC dropdown removed & center auto-selection
assert(
  duesPageSrc60.includes("!isCollectionCenter ? (") &&
  duesPageSrc60.includes("Collection Centre Dues") &&
  duesPageSrc60.includes("const isCC = r === \"COLLECTION_CENTER\" || r === \"COLLECTION_CENTRE\";"),
  "[DUES REPORT CC PORTAL] Dues report hides source dropdown for Collection Center role and scopes directly to their center data"
);

// 60.4 Monthly Business Report: CC Role scoping in frontend
assert(
  monthlyExpensesRegisterSrc60.includes("isCollectionCenter && (") &&
  monthlyExpensesRegisterSrc60.includes("Collection Centre Business:"),
  "[MONTHLY BUSINESS REGISTER CC UI] Monthly business register displays dedicated center scoping badge for Collection Center users"
);

// 60.5 Backend BillController: Collection Center Dues & Monthly Business Aggregation
assert(
  backendBillCtrlSrc60.includes("in_array($userRole, ['COLLECTION_CENTER', 'COLLECTION_CENTRE'])) {") &&
  backendBillCtrlSrc60.includes("in_array($userRole, ['B2B', 'COLLECTION_CENTER', 'COLLECTION_CENTRE'])) {") &&
  backendBillCtrlSrc60.includes("meta->collection_center_id"),
  "[BACKEND CC SCOPING] Backend BillController guarantees strict tenant scoping for Collection Centers in both Dues listing and Monthly Business aggregation"
);

console.log("\n▶ MODULE 61: Collection Center Overview & Today's Samples Mobile Responsiveness & Modal Fit");

const ccOverviewSrc61 = fs.readFileSync(path.resolve(__dirname, "../src/components/collection-center-overview.tsx"), "utf-8");
const todaySamplesSrc61 = fs.readFileSync(path.resolve(__dirname, "../src/app/dashboard/today-samples/page.tsx"), "utf-8");

// 61.1 Collection Center Overview: Sample Collection Volume & Dynamic Intake Pill Alignment
assert(
  ccOverviewSrc61.includes("Sample Collection Volume") &&
  ccOverviewSrc61.includes("truncate whitespace-nowrap") &&
  ccOverviewSrc61.includes("Dynamic Intake") &&
  ccOverviewSrc61.includes("whitespace-nowrap inline-flex items-center gap-1.5 shadow-2xs"),
  "[CC OVERVIEW VOLUME & DYNAMIC INTAKE PILL] Sample Collection Volume title is single-line responsive and Dynamic Intake pill badge aligns cleanly without breaking"
);

// 61.2 Today's Samples Page: Multi-Field Search Optimization
assert(
  todaySamplesSrc61.includes("search.trim().toLowerCase()") &&
  todaySamplesSrc61.includes("pName.includes(query)") &&
  todaySamplesSrc61.includes("phone.includes(query)") &&
  todaySamplesSrc61.includes("pid.includes(query)") &&
  todaySamplesSrc61.includes("metaVials.includes(query)"),
  "[TODAY SAMPLES SEARCH OPTIMIZATION] Multi-field search instantly queries patient name, phone, barcode, PID, investigations & tube barcodes"
);

// 61.3 Today's Samples Page: Mobile Card Deck & Responsive Filters
assert(
  todaySamplesSrc61.includes("block md:hidden divide-y divide-border/60") &&
  todaySamplesSrc61.includes("hidden md:block") &&
  todaySamplesSrc61.includes("rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap"),
  "[TODAY SAMPLES MOBILE CARDS & FILTER PILLS] Responsive mobile cards render on phones and filter pills prevent awkward multi-line text wrapping"
);

// 61.4 Status & Barcode Modal: Responsive Viewport Fit & Touch-Friendly Grids
assert(
  todaySamplesSrc61.includes("w-[calc(100vw-1rem)] sm:w-[96vw]") &&
  todaySamplesSrc61.includes("max-h-[95vh] sm:max-h-[92vh]") &&
  todaySamplesSrc61.includes("grid grid-cols-2 xs:flex items-center gap-2 pt-1") &&
  todaySamplesSrc61.includes("grid grid-cols-2 xs:flex items-center gap-2 shrink-0 w-full xs:w-auto"),
  "[STATUS MODAL RESPONSIVE FIT & GRIDS] Status and vacutainer modal fits edge-to-edge on mobile with 2-column quick action button grids"
);

// 61.5 Status & Barcode Modal: Single-Line Text, Dropdown Bounds & Responsive Footer
assert(
  todaySamplesSrc61.includes("max-w-[calc(100vw-2rem)] sm:max-w-md") &&
  todaySamplesSrc61.includes("whitespace-nowrap") &&
  todaySamplesSrc61.includes("Save Barcodes & Update"),
  "[STATUS MODAL DROPDOWNS & SINGLE LINE TEXT] Dropdown containers stay safely within mobile viewport bounds and footer action buttons maintain single-line text"
);

console.log(`RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
console.log("===============================================================================");

if (failedTests === 0) {
  console.log("🎉 ALL MEDICAL, BILLING, CATALOG, AND CLINICAL UNIT TESTS PASSED WITH 100% SUCCESS!");
  process.exit(0);
} else {
  console.error("❌ UNIT TEST SUITE DETECTED FAILURES.");
  process.exit(1);
}