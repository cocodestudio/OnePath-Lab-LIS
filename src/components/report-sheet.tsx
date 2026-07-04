import * as React from "react";
import { FileText, Check, ArrowUp, ArrowDown } from "lucide-react";

interface Test { 
  id: string; name: string; category: string; price: number; unit: string; 
  interpretation?: string | null; fieldType?: string;
  genderRefType?: string; refRangeMin: number; refRangeMax: number; 
  refRangeMinMale?: number | null; refRangeMaxMale?: number | null; 
  refRangeMinFemale?: number | null; refRangeMaxFemale?: number | null;
  refRangeMinChild?: number | null; refRangeMaxChild?: number | null;
  refRangeMinNewborn?: number | null; refRangeMaxNewborn?: number | null;
  valueType?: string; customOptions?: string | null;
  parent?: { id: string; name: string; interpretation?: string; parent?: { id: string; name: string; interpretation?: string } };
}
export interface ReportTest { id: string; resultValue: string | null; isAbnormal: boolean; test: Test; }
export interface PrintSettings {
  bgImage: string | null;
  headerHeight: number;
  footerHeight: number;
  marginLeft: number;
  marginRight: number;
}

export interface ReportSheetData {
  id: string; customId: string; status: string; createdAt: string;
  patient: { name: string; age: number; gender: string; phone: string; refDoctor: string; customId: string; address: string | null };
  results: ReportTest[];
  lab: { name: string; email: string; address: string; logoUrl: string | null; printBgImage?: string | null };
  printedInterpretations?: string | null;
}

const EMERALD_DARK = "hsl(160 58% 22%)";
const EMERALD_MID = "hsl(160 58% 30%)";

const A4_W = 794;
const A4_H = 1123;

/* ─────────────────────────────────────────────────────────
   Block builder — produces the report content as a flat list
   of self-contained blocks. Used by BOTH the print ReportSheet
   (wrapped in a table so thead/tfoot repeat per printed page)
   and the paginated on-screen preview.
   ───────────────────────────────────────────────────────── */
export interface ReportBlock { key: string; node: React.ReactNode; }

export function buildReportBlocks(
  report: ReportSheetData,
  opts?: { hidePatientBlock?: boolean }
): ReportBlock[] {
  const blocks: ReportBlock[] = [];

  const groupedTests: Record<string, Record<string, Record<string, ReportTest[]>>> = {};
  report.results.forEach((item) => {
    const cat = item.test.category;
    if (!groupedTests[cat]) groupedTests[cat] = {};

    let mainTestName = item.test.name;
    let paramName = "_default";

    if (item.test.parent) {
      if (item.test.parent.parent) {
        mainTestName = item.test.parent.parent.name;
        paramName = item.test.parent.name;
      } else {
        mainTestName = item.test.parent.name;
      }
    }

    if (!groupedTests[cat][mainTestName]) groupedTests[cat][mainTestName] = {};
    if (!groupedTests[cat][mainTestName][paramName]) groupedTests[cat][mainTestName][paramName] = [];
    groupedTests[cat][mainTestName][paramName].push(item);
  });

  const getRefRangeStr = (test: Test, patientGender: string, patientAge: number) => {
    if (test.genderRefType === "NEWBORN") {
      return `${test.refRangeMinNewborn ?? test.refRangeMin} - ${test.refRangeMaxNewborn ?? test.refRangeMax}`;
    }
    if (test.genderRefType === "CHILDREN") {
      return `${test.refRangeMinChild ?? test.refRangeMin} - ${test.refRangeMaxChild ?? test.refRangeMax}`;
    }
    if (test.genderRefType === "GENDER_SPECIFIC") {
      if (patientGender.toLowerCase() === "female") {
        return `${test.refRangeMinFemale ?? test.refRangeMin} - ${test.refRangeMaxFemale ?? test.refRangeMax}`;
      } else {
        return `${test.refRangeMinMale ?? test.refRangeMin} - ${test.refRangeMaxMale ?? test.refRangeMax}`;
      }
    }
    return `${test.refRangeMin} - ${test.refRangeMax}`;
  };

  const getFlag = (item: ReportTest, patientGender: string, patientAge: number) => {
    if (!item.resultValue) return null;
    const val = parseFloat(item.resultValue);
    if (isNaN(val)) return item.isAbnormal ? "H" : "N";

    let minRange = item.test.refRangeMin;
    let maxRange = item.test.refRangeMax;

    if (item.test.genderRefType === "NEWBORN") {
      minRange = item.test.refRangeMinNewborn ?? minRange;
      maxRange = item.test.refRangeMaxNewborn ?? maxRange;
    } else if (item.test.genderRefType === "CHILDREN") {
      minRange = item.test.refRangeMinChild ?? minRange;
      maxRange = item.test.refRangeMaxChild ?? maxRange;
    } else if (item.test.genderRefType === "GENDER_SPECIFIC") {
      const gender = patientGender.toLowerCase();
      if (gender === "female") {
        minRange = item.test.refRangeMinFemale ?? minRange;
        maxRange = item.test.refRangeMaxFemale ?? maxRange;
      } else {
        minRange = item.test.refRangeMinMale ?? minRange;
        maxRange = item.test.refRangeMaxMale ?? maxRange;
      }
    }

    if (val < minRange) return "L";
    if (val > maxRange) return "H";
    return "N";
  };

  // Patient block
  if (!opts?.hidePatientBlock) {
    blocks.push({
      key: "patient",
      node: (
        <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6 text-xs text-zinc-700">
          <div className="space-y-1.5 border-r border-zinc-200 pr-4">
            <p><strong>Patient Name:</strong> <span className="text-sm font-extrabold text-zinc-900">{report.patient.name}</span></p>
            <p><strong>Age / Gender:</strong> {report.patient.age} Y / {report.patient.gender}</p>
            <p><strong>Phone:</strong> {report.patient.phone}</p>
            {report.patient.address && <p className="truncate"><strong>Address:</strong> {report.patient.address}</p>}
          </div>
          <div className="space-y-1.5 pl-4">
            <p><strong>Patient ID:</strong> <span className="font-bold text-zinc-900">{report.patient.customId}</span></p>
            <p><strong>Report Ref:</strong> <span className="font-bold text-zinc-900">{report.customId}</span></p>
            <p><strong>Referred By:</strong> {report.patient.refDoctor}</p>
            <p><strong>Received:</strong> {new Date(report.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      ),
    });
  }

  if (report.status !== "COMPLETED") {
    blocks.push({
      key: "pending",
      node: (
        <div className="text-center py-10 border border-dashed border-zinc-300 rounded-lg text-zinc-400">
          <FileText className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
          <p className="text-sm font-semibold">Results pending compilation…</p>
        </div>
      ),
    });
    return blocks;
  }

  let printedInterps: string[] = [];
  try {
    if (report.printedInterpretations) {
      const parsed = JSON.parse(report.printedInterpretations);
      printedInterps = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {}

  Object.entries(groupedTests).forEach(([category, mainTests]) => {
    blocks.push({
      key: `cat-${category}`,
      node: (
        <h3 className="text-sm text-center font-bold uppercase tracking-widest border-b border-zinc-200 pb-1.5 mb-5 mt-2" style={{ color: EMERALD_DARK }}>{category} Report</h3>
      ),
    });

    Object.entries(mainTests).forEach(([mainTestName, paramsObj]) => {
      const firstParamKey = Object.keys(paramsObj)[0];
      const firstTestObj = paramsObj[firstParamKey][0].test;
      const mainTestObj = firstTestObj.parent?.parent ? firstTestObj.parent.parent : (firstTestObj.parent ? firstTestObj.parent : firstTestObj);
      
      const allCustomEditor = Object.values(paramsObj).flat().every(item => item.test.fieldType === "Custom Editor");
      const hasAnyNumeric = Object.values(paramsObj).flat().some(item => item.test.fieldType !== "Custom Editor" && item.test.valueType !== "Custom");

      blocks.push({
        key: `main-${category}-${mainTestName}`,
        node: (
          <div className="mb-4" style={{ paddingBottom: "1.5rem" }}>
            <h4 className="text-xs font-bold text-zinc-800 mb-2 uppercase">{mainTestName}</h4>
            <table className="w-full text-left text-xs border-collapse">
              {!allCustomEditor && (
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200">
                    <th className="p-2.5 font-bold text-zinc-800 uppercase w-2/5">Test</th>
                    <th className="p-2.5 font-bold text-zinc-800 uppercase">Result</th>
                    {hasAnyNumeric && (
                      <>
                        <th className="p-2.5 font-bold text-zinc-800 uppercase">Flag</th>
                        <th className="p-2.5 font-bold text-zinc-800 uppercase">Reference</th>
                        <th className="p-2.5 font-bold text-zinc-800 uppercase">Unit</th>
                      </>
                    )}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-zinc-100">
                {Object.entries(paramsObj).map(([paramName, items]) => (
                  <React.Fragment key={paramName}>
                    {paramName !== "_default" && paramName !== "Report Template" && (
                      <tr className="bg-zinc-50">
                        <td colSpan={hasAnyNumeric ? 5 : 2} className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{paramName}</td>
                      </tr>
                    )}
                    {items.map((item) => {
                      if (item.test.fieldType === "Custom Editor") {
                        return (
                          <tr key={item.id}>
                            <td colSpan={hasAnyNumeric ? 5 : 2} className="py-3">
                              {item.test.name !== "Report Template" && (
                                <h5 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">{item.test.name}</h5>
                              )}
                              <div className="text-xs text-zinc-800 leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_table]:my-3 [&_td]:border-[1.5px] [&_td]:border-zinc-500 [&_td]:p-2 [&_th]:border-[1.5px] [&_th]:border-zinc-500 [&_th]:p-2 [&_th]:bg-zinc-100" dangerouslySetInnerHTML={{ __html: item.resultValue || '' }} />
                            </td>
                          </tr>
                        );
                      }
                      
                      const isCustom = item.test.valueType === "Custom";
                      const flag = isCustom ? null : getFlag(item, report.patient.gender, report.patient.age);
                      
                      if (isCustom) {
                        return (
                          <tr key={item.id}>
                            <td className={`p-2.5 font-medium text-zinc-800 ${paramName !== "_default" ? "pl-5" : ""}`}>{item.test.name}</td>
                            <td className="p-2.5 text-zinc-800 font-bold" colSpan={hasAnyNumeric ? 4 : 1}>{item.resultValue}</td>
                          </tr>
                        );
                      }
                      
                      return (
                        <tr key={item.id} className={item.isAbnormal ? "bg-red-50/60" : ""}>
                          <td className={`p-2.5 font-medium text-zinc-800 ${paramName !== "_default" ? "pl-5" : ""}`}>{item.test.name}</td>
                          <td className={`p-2.5 ${item.isAbnormal ? "text-red-600 font-extrabold" : "text-zinc-800 font-bold"}`}>{item.resultValue}</td>
                          <td className="p-2.5 font-bold">
                            {flag === "H" && <span className="inline-flex items-center gap-0.5 text-red-600"><ArrowUp className="h-3 w-3 stroke-[3]" /> H</span>}
                            {flag === "L" && <span className="inline-flex items-center gap-0.5 text-red-600"><ArrowDown className="h-3 w-3 stroke-[3]" /> L</span>}
                            {flag === "N" && <span className="inline-flex items-center gap-0.5" style={{ color: EMERALD_MID }}><Check className="h-3 w-3 stroke-[3]" /> N</span>}
                          </td>
                          <td className="p-2.5 text-zinc-500 font-semibold">{getRefRangeStr(item.test, report.patient.gender, report.patient.age)}</td>
                          <td className="p-2.5 text-zinc-500 font-semibold">{item.test.unit}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {printedInterps.includes(mainTestObj.id) && mainTestObj.interpretation && (
              <div className="mt-4 pt-3 border-t border-dashed border-zinc-300">
                <h5 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Interpretation: {mainTestName}</h5>
                <div className="text-xs text-zinc-700 leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_table]:my-3 [&_td]:border-[2px] [&_td]:border-black [&_td]:p-1.5 [&_th]:border-[3px] [&_th]:border-black [&_th]:p-1.5 [&_th]:bg-zinc-100" dangerouslySetInnerHTML={{ __html: mainTestObj.interpretation }} />
              </div>
            )}
          </div>
        ),
      });
    });
  });

  return blocks;
}

/** A4-styled printable clinical report. Always white for paper output.
 *  Print path: a single table whose thead/tfoot repeat header/footer margins
 *  on every printed page (handled natively by the browser during print). */
export const ReportSheet = React.forwardRef<HTMLDivElement, { report: ReportSheetData; settings?: PrintSettings; hidePatientBlock?: boolean; transparentBg?: boolean; screenMode?: boolean }>(
  ({ report, settings, hidePatientBlock, transparentBg, screenMode }, ref) => {
    const blocks = buildReportBlocks(report, { hidePatientBlock });
    const padL = settings ? `${settings.marginLeft}px` : "40px";
    const padR = settings ? `${settings.marginRight}px` : "40px";

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: "@media print { @page { margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }" }} />
        <div
          ref={ref}
          className={`text-zinc-900 mx-auto relative w-[794px] max-w-[794px] min-h-[1123px] print:max-w-none print:w-full print:min-h-0 shadow-sm ${transparentBg ? '' : 'bg-white'}`}
          style={{ boxSizing: "border-box" }}
        >
          {settings?.bgImage && (
            <div
              className="absolute inset-0 z-0 pointer-events-none opacity-100 print:fixed print:inset-0"
              style={{
                backgroundImage: `url('${settings.bgImage}')`,
                backgroundSize: '100% 1123px',
                backgroundPosition: 'top center',
                backgroundRepeat: 'repeat-y',
              }}
            />
          )}

          <table className={`w-full relative z-10 ${screenMode ? '' : 'h-[1123px]'} print:h-auto`} style={{ borderCollapse: "collapse" }}>
            <thead className="table-header-group">
              <tr><td><div style={{ height: settings ? `${settings.headerHeight}px` : '40px' }} /></td></tr>
            </thead>
            <tbody className="table-row-group">
              {blocks.map((b) => (
                <tr key={b.key}>
                  <td colSpan={100} style={{ paddingLeft: padL, paddingRight: padR, verticalAlign: "top" }}>
                    {b.node}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-footer-group">
              <tr><td className="align-bottom"><div style={{ height: settings ? `${settings.footerHeight}px` : '40px' }} /></td></tr>
            </tfoot>
          </table>
        </div>
      </>
    );
  }
);
ReportSheet.displayName = "ReportSheet";

/* ─────────────────────────────────────────────────────────
   PaginatedReportPreview — faithful on-screen preview.
   Measures each block, packs blocks into pages so none is split,
   and renders every page as a real A4 card with its own
   header/footer margins + the letterhead background.
   ───────────────────────────────────────────────────────── */
export function PaginatedReportPreview({
  report,
  settings,
  scale,
  hidePatientBlock,
  onPageCount,
}: {
  report: ReportSheetData;
  settings: PrintSettings;
  scale: number;
  hidePatientBlock?: boolean;
  onPageCount?: (n: number) => void;
}) {
  const blocks = React.useMemo(() => buildReportBlocks(report, { hidePatientBlock }), [report, hidePatientBlock]);
  const measureRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [heights, setHeights] = React.useState<number[]>([]);

  const contentWidth = A4_W - settings.marginLeft - settings.marginRight;
  const usableH = A4_H - settings.headerHeight - settings.footerHeight;

  // Measure block heights at natural (unscaled) content width
  React.useLayoutEffect(() => {
    const next = blocks.map((_, i) => measureRefs.current[i]?.offsetHeight ?? 0);
    setHeights(next);
    // re-measure once more after fonts/images settle
    const t = setTimeout(() => {
      setHeights(blocks.map((_, i) => measureRefs.current[i]?.offsetHeight ?? 0));
    }, 60);
    return () => clearTimeout(t);
  }, [blocks, contentWidth]);

  // Pack blocks into pages (greedy, never split a block)
  const pages = React.useMemo(() => {
    if (heights.length !== blocks.length) return [blocks.map((_, i) => i)];
    const result: number[][] = [];
    let current: number[] = [];
    let used = 0;
    blocks.forEach((_, i) => {
      const h = heights[i] || 0;
      if (current.length > 0 && used + h > usableH) {
        result.push(current);
        current = [];
        used = 0;
      }
      current.push(i);
      used += h;
    });
    if (current.length) result.push(current);
    return result.length ? result : [[]];
  }, [blocks, heights, usableH]);

  React.useEffect(() => { onPageCount?.(pages.length); }, [pages.length, onPageCount]);

  return (
    <>
      {/* Hidden measurer: blocks rendered at natural content width */}
      <div style={{ position: "fixed", top: 0, left: -99999, width: contentWidth, visibility: "hidden", pointerEvents: "none" }} aria-hidden>
        {blocks.map((b, i) => (
          <div key={b.key} ref={(el) => { measureRefs.current[i] = el; }} className="text-zinc-900">
            {b.node}
          </div>
        ))}
      </div>

      {/* Page cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        {pages.map((pageBlockIdxs, pi) => (
          <div
            key={pi}
            style={{
              width: A4_W * scale,
              height: A4_H * scale,
              flexShrink: 0,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              position: "relative",
              background: "white",
              overflow: "hidden",
            }}
          >
            <div style={{ width: A4_W, height: A4_H, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative" }}>
              {/* Letterhead — full image per page */}
              {settings.bgImage && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url('${settings.bgImage}')`,
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                  zIndex: 0,
                }} />
              )}
              {/* Content within header/footer margins */}
              <div
                className="text-zinc-900"
                style={{
                  position: "absolute",
                  top: settings.headerHeight,
                  left: settings.marginLeft,
                  width: contentWidth,
                  height: usableH,
                  overflow: "hidden",
                  zIndex: 1,
                }}
              >
                {pageBlockIdxs.map((bi) => (
                  <div key={blocks[bi].key}>{blocks[bi].node}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
