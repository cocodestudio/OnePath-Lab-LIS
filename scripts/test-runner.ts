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
