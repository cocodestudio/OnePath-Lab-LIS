/**
 * OnePath Lab LIS — Comprehensive Feature Unit Test Runner
 * Run with: npx tsx scripts/test-runner.ts
 */

import { getClinicalInterpretation, DEFAULT_INTERPRETATIONS } from "../src/lib/clinical-interpretations";
import { normalizeBillSettings, BillLayoutSettings } from "../src/lib/bill-settings";
import { resolvePackageTestIds, DEFAULT_PACKAGES } from "../src/lib/packages";
import { analyzeReportForSmartInsights, evaluateParamReference } from "../src/lib/smart-report-engine";
import { isSubscriptionExpired } from "../src/lib/subscription";

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
// Final Summary & Verification Report
// ==============================================================================
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
