import fs from "fs";
import path from "path";

const cwd = process.cwd();
const checks = [];

// 1. Check api-client.ts for SWR stale fix
const apiClient = fs.readFileSync(path.join(cwd, "src/lib/api-client.ts"), "utf-8");
checks.push(["SWR stale fix - isStale flag set in markApiCacheStale", apiClient.includes("entry.isStale = true")]);
checks.push(["SWR stale fix - staleTimestamp present", apiClient.includes("staleTimestamp")]);
checks.push(["SWR stale fix - fresh GETs reset isStale:false", apiClient.includes("isStale: false")]);
checks.push(["SWR stale fix - isExplicitlyStale check in fetchFromLaravel", apiClient.includes("isExplicitlyStale")]);

// 2. Check formula-engine.ts exists and exports are clean
const formulaPath = path.join(cwd, "src/lib/clinical-formulas/formula-engine.ts");
const formulaExists = fs.existsSync(formulaPath);
checks.push(["formula-engine.ts exists", formulaExists]);
if (formulaExists) {
  const formulaEngine = fs.readFileSync(formulaPath, "utf-8");
  checks.push(["formula-engine exports computeAutomatedFormulas", formulaEngine.includes("export function computeAutomatedFormulas")]);
  checks.push(["formula-engine exports canParamBeCalculatedInReport", formulaEngine.includes("export function canParamBeCalculatedInReport")]);
  checks.push(["formula-engine exports isParamFormulaCalculated", formulaEngine.includes("export function isParamFormulaCalculated")]);
  checks.push(["formula-engine exports findParamInResults", formulaEngine.includes("export function findParamInResults")]);
  checks.push(["formula-engine exports hasReportParam", formulaEngine.includes("export function hasReportParam")]);
  checks.push(["formula-engine exports types (Test, Report, etc.)", formulaEngine.includes("export interface Test")]);
}

// 3. Check edit/page.tsx modularization
const editPage = fs.readFileSync(path.join(cwd, "src/app/dashboard/reports/[id]/edit/page.tsx"), "utf-8");
checks.push(["edit/page imports from formula-engine", editPage.includes("@/lib/clinical-formulas/formula-engine")]);
checks.push(["edit/page imports isParamFormulaCalculated", editPage.includes("isParamFormulaCalculated")]);
checks.push(["edit/page uses next/dynamic import", editPage.includes("import dynamic from")]);
checks.push(["edit/page NO longer contains function computeAutomatedFormulas inline", !editPage.includes("function computeAutomatedFormulas(")]);
checks.push(["edit/page NO longer contains interface CalculationResult inline", !editPage.includes("interface CalculationResult {")]);
// Critical regression checks
checks.push(["edit/page still has handleSaveResults APPROVED", editPage.includes('handleSaveResults("APPROVED", false)')]);
checks.push(["edit/page still has savingAction === APPROVE", editPage.includes('savingAction === "APPROVE"')]);
checks.push(["edit/page still has skipCache:true fetch", editPage.includes("skipCache: true")]);
checks.push(["edit/page still has isParamHidden filter", editPage.includes("const isParamHidden = Boolean(")]);
checks.push(["edit/page still has sort_order sorting", editPage.includes("const orderA = a?.test?.sort_order")]);

// 4. Check settings/page.tsx 0ms hydration
const settingsPage = fs.readFileSync(path.join(cwd, "src/app/dashboard/settings/page.tsx"), "utf-8");
checks.push(["settings uses lazy initializer for isLoading (no shimmer)", settingsPage.includes("useState<boolean>(() =>")]);
checks.push(["settings uses lazy initializer for print settings", settingsPage.includes("useState<ExtendedPrintSettings>(() =>")]);
checks.push(["settings uses lazy initializer for layoutSettings", settingsPage.includes("useState<ReportLayoutSettings>(() =>")]);
checks.push(["settings uses lazy initializer for billSettings", settingsPage.includes("useState<BillLayoutSettings>(() =>")]);
checks.push(["settings reads from lis_cached_print_settings in initializer", settingsPage.includes('"lis_cached_print_settings"')]);

// 5. Check register/page.tsx dedup fix
const registerPage = fs.readFileSync(path.join(cwd, "src/app/dashboard/patients/register/page.tsx"), "utf-8");
checks.push(["register page prevents re-fetching partner labs if already loaded", registerPage.includes("outsourcePartnerLabsList.length === 0")]);

// 6. Check pdf-report-downloader.ts
const pdfDownloader = fs.readFileSync(path.join(cwd, "src/lib/pdf-report-downloader.ts"), "utf-8");
checks.push(["pdf-report-downloader has printVectorPdfInIframe function", pdfDownloader.includes("printVectorPdfInIframe")]);

// 7. Check download-pdf route.ts
const routeTs = fs.readFileSync(path.join(cwd, "src/app/api/reports/download-pdf/route.ts"), "utf-8");
checks.push(["download-pdf route has getSharedBrowser singleton", routeTs.includes("getSharedBrowser")]);
checks.push(["download-pdf route has ConcurrencySemaphore queue", routeTs.includes("ConcurrencySemaphore")]);

// Report
let passed = 0, failed = 0;
console.log("\n=== OnePath Lab LIMS - Performance Overhaul Code Audit ===\n");
for (const [label, result] of checks) {
  if (result) { console.log("  ✓ PASS:", label); passed++; }
  else { console.log("  ✗ FAIL:", label); failed++; }
}
console.log("\n==========================================================");
console.log(`Code Audit: ${passed}/${passed + failed} checks passed. ${failed === 0 ? "ALL CLEAN ✅" : `${failed} FAILED ❌`}`);
if (failed > 0) process.exit(1);
