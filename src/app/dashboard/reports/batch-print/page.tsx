"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import {
  Printer, ArrowLeft, X, Loader2, CheckCircle2, AlertTriangle, FileText,
  ZoomIn, ZoomOut, Check, SlidersHorizontal, Sparkles, User, Calendar,
  RefreshCw, Search, ChevronRight, ChevronDown, CheckSquare, Square,
  Layers, Filter, Eye, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  PaginatedReportPreview,
  type PrintSettings,
  type ReportSheetData,
} from "@/components/report-sheet";
import { fetchFromLaravel, getCleanLetterheadUrl } from "@/lib/api-client";
import { getReportPackage } from "@/lib/packages";

interface MainTestItem {
  name: string;
  count: number;
  category?: string;
}

/**
 * Extracts distinct top-level test groups/names from a report's results
 */
function extractMainTestsFromReport(report: any): MainTestItem[] {
  if (!report || !Array.isArray(report.results)) return [];
  const map = new Map<string, { count: number; category?: string }>();

  report.results.forEach((r: any) => {
    let mainName = r.test?.name || "Test";
    if (r.test?.parent?.parent?.name) {
      mainName = r.test.parent.parent.name;
    } else if (r.test?.parent?.name) {
      mainName = r.test.parent.name;
    }
    const cat = r.test?.category || "General";
    const curr = map.get(mainName);
    if (curr) {
      curr.count += 1;
    } else {
      map.set(mainName, { count: 1, category: cat });
    }
  });

  return Array.from(map.entries()).map(([name, item]) => ({
    name,
    count: item.count,
    category: item.category,
  }));
}

function normalizeReportSheet(rep: any, liveLab?: any): ReportSheetData {
  const lab = liveLab || rep.lab || {};
  const currentLab = { ...lab };
  const rawLabSettings = currentLab?.reportSettings ?? currentLab?.report_settings;
  let labReportSettings: any = {};
  if (typeof rawLabSettings === "string") {
    try {
      labReportSettings = JSON.parse(rawLabSettings || "{}");
    } catch {
      labReportSettings = {};
    }
  } else if (rawLabSettings && typeof rawLabSettings === "object") {
    labReportSettings = { ...rawLabSettings };
  }

  // Fallback for doctor signatures if not in live settings
  if (
    !labReportSettings.doctorSignatures &&
    !labReportSettings.doctor_signatures &&
    !labReportSettings.doctorSignature &&
    !labReportSettings.doctor_signature
  ) {
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("lis_cached_report_settings");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            labReportSettings = { ...parsed, ...labReportSettings };
          }
        }
      }
    } catch {}
  }

  currentLab.reportSettings = labReportSettings;
  currentLab.report_settings = labReportSettings;

  const resolvedPackageName =
    rep.packageName ||
    rep.package_name ||
    rep.meta?.packageName ||
    rep.meta?.package_name ||
    getReportPackage(rep.id) ||
    getReportPackage(rep.customId || rep.custom_id) ||
    getReportPackage(rep.patient?.customId || rep.patient?.custom_id);

  return {
    ...rep,
    id: rep.id,
    customId: rep.custom_id || rep.customId || "REP",
    status: rep.status,
    createdAt: rep.created_at || rep.createdAt,
    reportDate: rep.reportDate || rep.report_date || rep.created_at || rep.createdAt,
    patient: {
      name: rep.patient?.name || "Patient",
      age: Number(rep.patient?.age || 0),
      gender: rep.patient?.gender || "Male",
      phone: rep.patient?.phone || "",
      refDoctor: rep.patient?.refDoctor || rep.patient?.ref_doctor || "Self",
      customId: rep.patient?.customId || rep.patient?.custom_id || "PAT",
      address: rep.patient?.address || null,
      email: rep.patient?.email || null,
      aadhaarNo: rep.patient?.aadhaarNo || rep.patient?.aadhaar_no || null,
      insuranceNo: rep.patient?.insuranceNo || rep.patient?.insurance_no || null,
      ...(rep.patient || {}),
    },
    results: (rep.results || []).map((r: any) => {
      const t = r.test || {};
      return {
        ...r,
        id: r.id,
        resultValue: r.resultValue ?? r.result_value ?? null,
        isAbnormal: Boolean(r.isAbnormal || r.is_abnormal),
        remarks: r.remarks || null,
        test: {
          ...t,
          id: t.id,
          name: t.name || "Investigation",
          category: t.category || "General",
          fieldType: t.fieldType || t.field_type || "Numeric",
          field_type: t.fieldType || t.field_type || "Numeric",
          unit: t.unit ?? null,
          refRangeMin: t.refRangeMin ?? t.ref_range_min ?? null,
          ref_range_min: t.refRangeMin ?? t.ref_range_min ?? null,
          refRangeMax: t.refRangeMax ?? t.ref_range_max ?? null,
          ref_range_max: t.refRangeMax ?? t.ref_range_max ?? null,
          genderRefType: t.genderRefType || t.gender_ref_type || null,
          gender_ref_type: t.genderRefType || t.gender_ref_type || null,
          refRangeMinMale: t.refRangeMinMale ?? t.ref_range_min_male ?? null,
          ref_range_min_male: t.refRangeMinMale ?? t.ref_range_min_male ?? null,
          refRangeMaxMale: t.refRangeMaxMale ?? t.ref_range_max_male ?? null,
          ref_range_max_male: t.refRangeMaxMale ?? t.ref_range_max_male ?? null,
          refRangeMinFemale: t.refRangeMinFemale ?? t.ref_range_min_female ?? null,
          ref_range_min_female: t.refRangeMinFemale ?? t.ref_range_min_female ?? null,
          refRangeMaxFemale: t.refRangeMaxFemale ?? t.ref_range_max_female ?? null,
          ref_range_max_female: t.refRangeMaxFemale ?? t.ref_range_max_female ?? null,
          refRangeMinChild: t.refRangeMinChild ?? t.ref_range_min_child ?? null,
          ref_range_min_child: t.refRangeMinChild ?? t.ref_range_min_child ?? null,
          refRangeMaxChild: t.refRangeMaxChild ?? t.ref_range_max_child ?? null,
          ref_range_max_child: t.refRangeMaxChild ?? t.ref_range_max_child ?? null,
          rangeType: t.rangeType || t.range_type || null,
          range_type: t.rangeType || t.range_type || null,
          textRefRange: t.textRefRange || t.text_ref_range || null,
          text_ref_range: t.textRefRange || t.text_ref_range || null,
          ageRanges: t.ageRanges || t.age_ranges || null,
          age_ranges: t.ageRanges || t.age_ranges || null,
          customOptions: t.customOptions || t.custom_options || null,
          custom_options: t.customOptions || t.custom_options || null,
          interpretation: t.interpretation || null,
          method: t.method || null,
          notes: t.notes || null,
          parent: t.parent || null,
        },
      };
    }),
    lab: {
      name: currentLab.name || "OnePath Laboratory",
      email: currentLab.email || "info@onepathlab.com",
      address: currentLab.address || "Main Laboratory Center",
      phone: currentLab.phone || "",
      logoUrl: currentLab.logoUrl || currentLab.logo_url || "/onepath-logo.png",
      printBgImage: currentLab.printBgImage || currentLab.print_bg_image || null,
      printHeaderHeight: currentLab.printHeaderHeight ?? currentLab.print_header_height ?? 185,
      printFooterHeight: currentLab.printFooterHeight ?? currentLab.print_footer_height ?? 95,
      printMarginLeft: currentLab.printMarginLeft ?? currentLab.print_margin_left ?? 32,
      printMarginRight: currentLab.printMarginRight ?? currentLab.print_margin_right ?? 32,
      reportSettings: labReportSettings,
      report_settings: labReportSettings,
      ...(currentLab || {}),
    },
    printedInterpretations: rep.printedInterpretations || rep.printed_interpretations || null,
    testNotes: rep.testNotes || rep.test_notes || null,
    test_notes: rep.testNotes || rep.test_notes || null,
    packageName: resolvedPackageName,
    package_name: resolvedPackageName,
  };
}

function BatchPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Synchronous cache bootstrap: Instant load in < 10ms
  const [reports, setReports] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("lis_batch_print_initial_data");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("lis_batch_print_initial_data");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch {}
    }
    return true;
  });

  const [liveLab, setLiveLab] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedLab = localStorage.getItem("lis_cached_lab_info");
        if (cachedLab) return JSON.parse(cachedLab);
      } catch {}
    }
    return null;
  });

  const [printWithHeaderFooter, setPrintWithHeaderFooter] = useState(false);
  const [autoFitToFooter, setAutoFitToFooter] = useState(true);
  const [zoomScale, setZoomScale] = useState(0.75);
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const [queueSearch, setQueueSearch] = useState("");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Individual test exclusion per report ID: { [reportId]: ["Test Name 1", ...] }
  // By default, map is empty, meaning 100% of tests are selected!
  const [excludedTestsMap, setExcludedTestsMap] = useState<Record<string, string[]>>({});

  // Which patient cards have their test checklists expanded in the left queue
  const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(new Set());

  // Mobile layout tab switcher: "preview" vs "controls"
  const [mobileTab, setMobileTab] = useState<"preview" | "controls">("preview");

  // Determine report IDs from URL query params or sessionStorage
  const targetReportIds = useMemo(() => {
    const fromQuery = searchParams.get("ids");
    if (fromQuery) {
      return fromQuery.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("lis_batch_print_ids");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  }, [searchParams]);

  // Adjust default zoom based on screen width
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        setZoomScale(0.42);
      } else if (window.innerWidth < 1280) {
        setZoomScale(0.65);
      }
    }
  }, []);

  // Fetch report data and live lab configuration in background with non-blocking hydration
  useEffect(() => {
    if (targetReportIds.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    if (reports.length === 0) {
      setLoading(true);
    }

    const loadData = async () => {
      try {
        // 1. Fetch live lab letterhead and margin preferences in background
        fetchFromLaravel("/lab?include_letterhead=1")
          .then((labData) => {
            if (isMounted && labData) setLiveLab(labData);
          })
          .catch(() => {});

        // 2. Fetch fresh, complete report details for each selected ID in parallel
        const loadedList = await Promise.all(
          targetReportIds.map(async (id) => {
            try {
              const fullData = await fetchFromLaravel(`/reports/${id}`);
              return fullData;
            } catch (e) {
              console.error(`Failed to load full report ${id}:`, e);
              return null;
            }
          })
        );

        if (isMounted) {
          const valid = loadedList.filter(Boolean);
          if (valid.length > 0) {
            setReports(valid);
          }
        }
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Error Loading Reports",
          description: err.message || "Failed to load selected reports for batch printing.",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [targetReportIds]);

  // Normalized print settings
  const printSettings: PrintSettings = useMemo(() => {
    const lab = liveLab || (reports[0]?.lab || {});
    const rawBg = lab.printBgImage || lab.print_bg_image || null;
    const hasBg = Boolean(rawBg && rawBg !== "null" && rawBg !== "undefined" && rawBg !== "none");
    const bgImage = printWithHeaderFooter && hasBg ? getCleanLetterheadUrl(rawBg) : null;

    return {
      bgImage,
      headerHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 185,
      footerHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 95,
      marginLeft: lab.printMarginLeft ?? lab.print_margin_left ?? 32,
      marginRight: lab.printMarginRight ?? lab.print_margin_right ?? 32,
    };
  }, [liveLab, reports, printWithHeaderFooter]);

  // Normalized active queue reports (excluding toggled off reports and filtering excluded tests per report)
  const preparedReports: ReportSheetData[] = useMemo(() => {
    return reports
      .filter((r) => !excludedIds.has(r.id))
      .map((r) => {
        const excludedForThisRep = excludedTestsMap[r.id] || [];
        if (excludedForThisRep.length === 0) {
          return normalizeReportSheet(r, liveLab);
        }

        // Filter out results belonging to any unselected test
        const filteredResults = (r.results || []).filter((item: any) => {
          let mainName = item.test?.name || "Test";
          if (item.test?.parent?.parent?.name) {
            mainName = item.test.parent.parent.name;
          } else if (item.test?.parent?.name) {
            mainName = item.test.parent.name;
          }
          return !excludedForThisRep.includes(mainName);
        });

        return normalizeReportSheet({ ...r, results: filteredResults }, liveLab);
      });
  }, [reports, liveLab, excludedIds, excludedTestsMap]);

  // Filtered queue for sidebar navigation
  const sidebarFilteredReports = useMemo(() => {
    if (!queueSearch.trim()) return reports;
    const q = queueSearch.toLowerCase();
    return reports.filter((r) => {
      const name = (r.patient?.name || "").toLowerCase();
      const patId = (r.patient?.custom_id || r.patient?.customId || "").toLowerCase();
      const repId = (r.custom_id || r.customId || "").toLowerCase();
      return name.includes(q) || patId.includes(q) || repId.includes(q);
    });
  }, [reports, queueSearch]);

  // Active Report in focus for the Right-Side test manager panel
  const activeReport = preparedReports[activeReportIndex] || preparedReports[0];
  const activeReportRaw = reports.find((r) => r.id === activeReport?.id) || reports[activeReportIndex] || reports[0];
  const activeReportMainTests = useMemo(() => {
    return extractMainTestsFromReport(activeReportRaw);
  }, [activeReportRaw]);

  // Toggle specific test selection for a report
  const toggleReportTest = (reportId: string, testName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExcludedTestsMap((prev) => {
      const currentList = prev[reportId] || [];
      const isCurrentlyExcluded = currentList.includes(testName);
      const nextList = isCurrentlyExcluded
        ? currentList.filter((t) => t !== testName)
        : [...currentList, testName];

      return {
        ...prev,
        [reportId]: nextList,
      };
    });
  };

  // Select all tests for a report
  const selectAllTestsForReport = (reportId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExcludedTestsMap((prev) => {
      const copy = { ...prev };
      delete copy[reportId];
      return copy;
    });
  };

  // Deselect all tests for a report
  const deselectAllTestsForReport = (reportId: string, allTests: string[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExcludedTestsMap((prev) => ({
      ...prev,
      [reportId]: [...allTests],
    }));
  };

  // Toggle accordion expansion for a report in the left sidebar
  const toggleExpandReport = (reportId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  // 1-Click Continuous Batch Print Trigger
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `OnePath_Batch_Reports_${new Date().toISOString().slice(0, 10)}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0mm !important;
      }
      @media print {
        *, *:before, *:after {
          box-sizing: border-box !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          width: 100% !important;
        }
        .batch-print-viewport {
          gap: 0 !important;
          row-gap: 0 !important;
          column-gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          width: 100% !important;
        }
        .batch-report-page {
          box-shadow: none !important;
          border-radius: 0 !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          display: block !important;
          width: 100% !important;
        }
        .batch-report-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .report-preview-page-card {
          width: 794px !important;
          height: 1120px !important;
          min-height: 1120px !important;
          max-height: 1120px !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          overflow: hidden !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .report-preview-page-card:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .report-print-page {
          width: 794px !important;
          height: 1120px !important;
          max-height: 1120px !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          position: relative !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
        }
      }
    `,
    onAfterPrint: async () => {
      toast({
        variant: "success",
        title: "Print Job Dispatched",
        description: `${preparedReports.length} reports successfully sent to the physical printer.`,
      });

      // Advance FINAL reports to APPROVED automatically
      for (const rep of preparedReports) {
        if (rep.status === "FINAL") {
          try {
            await fetchFromLaravel(`/reports/${rep.id}`, {
              method: "PUT",
              body: JSON.stringify({ status: "APPROVED" }),
            });
          } catch {}
        }
      }
    },
  });

  // Ctrl + P Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (!loading && preparedReports.length > 0) {
          handlePrint();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrint, loading, preparedReports]);

  const handleClose = () => {
    if (typeof window !== "undefined") {
      if (window.opener) {
        window.close();
      } else {
        router.push("/dashboard/reports");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden select-none animate-fade-in text-foreground">
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP APP BAR: Status, Letterhead Toggle, Zoom, Actions
          (Fully Mobile Responsive with Single-Line Text Labels)
      ═══════════════════════════════════════════════════════════════ */}
      <header className="no-print border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-6 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0 z-20 shadow-2xs">
        {/* Top Line / Mobile Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer rounded-xl border border-border/60 shrink-0"
              title="Return to reports list"
            >
              <ArrowLeft className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden sm:inline font-semibold">Reports</span>
            </Button>

            <div className="h-5 w-px bg-border/80 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 sm:h-8 w-7 sm:w-8 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs shrink-0">
                <Printer className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <h1 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                  Batch Print Studio
                </h1>
                {/* Single line text label (Replacing pill shape badge for clean mobile fit) */}
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  ({preparedReports.length} Queued)
                </span>
              </div>
            </div>
          </div>

          {/* Close button on mobile right */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close Tab"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center / Right Action Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {/* Pre-printed Letterhead Toggle */}
          <label className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors shrink-0">
            <Checkbox
              checked={printWithHeaderFooter}
              onCheckedChange={(c) => setPrintWithHeaderFooter(Boolean(c))}
            />
            <span className="hidden md:inline text-xs">Print with Letterhead</span>
            <span className="md:hidden text-[11px]">Letterhead</span>
          </label>

          {/* Zoom Controls (Hidden on mobile for maximum clean space) */}
          <div className="hidden sm:flex items-center gap-1 border border-border rounded-xl px-2 py-1 bg-muted/20 text-xs">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.35, Number((z - 0.05).toFixed(2))))}
              className="p-1 hover:text-foreground text-muted-foreground cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-12 text-center font-mono font-semibold text-[11px]">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(1.2, Number((z + 0.05).toFixed(2))))}
              className="p-1 hover:text-foreground text-muted-foreground cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Print Button */}
          <Button
            type="button"
            onClick={() => handlePrint()}
            disabled={loading || preparedReports.length === 0}
            className="gradient-primary text-primary-foreground font-bold h-8 sm:h-9 px-3.5 sm:px-5 gap-1.5 sm:gap-2 text-xs shadow-md cursor-pointer hover:opacity-95 rounded-xl shrink-0"
            title="Press Ctrl + P to print"
          >
            {loading ? (
              <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin" />
            ) : (
              <Printer className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            )}
            <span>Print ({preparedReports.length})</span>
            <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded text-white">
              Ctrl+P
            </kbd>
          </Button>

          {/* Desktop Close Window Button */}
          <button
            type="button"
            onClick={handleClose}
            className="hidden sm:flex p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="Close Tab"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Mobile Tab Switcher on Small Screens (Preview Canvas vs Queue & Tests) ── */}
        <div className="flex md:hidden items-center bg-muted/60 p-1 rounded-xl border border-border w-full mt-0.5">
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mobileTab === "preview"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preview Canvas
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("controls")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mobileTab === "controls"
                ? "bg-background text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Queue &amp; Tests ({preparedReports.length})
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          2. WORKSPACE BODY:
             - Left Queue Sidebar with Per-Patient Test Selection
             - Center Continuous Print Viewport (Sequential A4 Sheets)
             - Right Dedicated Test Selection Panel for Active Patient
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar Queue Navigation with Per-Patient Test Checklists */}
        <aside
          className={`no-print w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border bg-card/60 flex-col shrink-0 overflow-hidden ${
            mobileTab === "controls" ? "flex flex-1 max-h-full" : "hidden md:flex"
          }`}
        >
          {/* Search inside queue */}
          <div className="p-3 border-b border-border/70 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Selected Queue</span>
              <span>
                {preparedReports.length} / {reports.length} Active
              </span>
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search queued patient..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border/80 rounded-lg text-xs outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>

          {/* List of queued reports with per-report test tick marks */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {loading && reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Assembling batch queue...</p>
              </div>
            ) : sidebarFilteredReports.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No matching reports found in queue.
              </div>
            ) : (
              sidebarFilteredReports.map((rep, idx) => {
                const isExcluded = excludedIds.has(rep.id);
                const isCurrent = idx === activeReportIndex;
                const repCustomId = rep.custom_id || rep.customId || "REP";
                const patName = rep.patient?.name || "Patient";
                const patGender = rep.patient?.gender || "N/A";
                const patAge = rep.patient?.age || "0";

                // Extract all main test groups for this patient
                const mainTests = extractMainTestsFromReport(rep);
                const excludedForThisRep = excludedTestsMap[rep.id] || [];
                const activeTestsCount = mainTests.length - excludedForThisRep.length;
                const isExpanded = expandedReportIds.has(rep.id) || isCurrent;

                return (
                  <div
                    key={rep.id || idx}
                    onClick={() => {
                      if (isExcluded) return;
                      setActiveReportIndex(idx);
                      const el = document.getElementById(`batch-rep-${rep.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                      isExcluded
                        ? "opacity-45 bg-muted/10 border-dashed border-border"
                        : isCurrent
                        ? "bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20"
                        : "bg-card border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {/* Patient Card Header */}
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={!isExcluded}
                            onCheckedChange={() => {
                              setExcludedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(rep.id)) next.delete(rep.id);
                                else next.add(rep.id);
                                return next;
                              });
                            }}
                            aria-label={`Toggle report ${repCustomId}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-mono text-xs font-bold text-primary truncate">
                            #{idx + 1} · {repCustomId}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0 ${
                            rep.status === "APPROVED" || rep.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>

                      <div className="mt-1.5 pl-6 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[170px]">
                          {patName}
                        </span>
                        <span className="text-muted-foreground text-[11px] shrink-0">
                          {patGender.slice(0, 1)}, {patAge}y
                        </span>
                      </div>

                      {/* Test Selection Counter & Accordion Trigger */}
                      <div className="mt-2 pl-6 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              activeTestsCount === mainTests.length
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : activeTestsCount > 0
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                          >
                            {activeTestsCount} / {mainTests.length} Tests
                          </span>
                        </div>

                        {mainTests.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpandReport(rep.id, e)}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors"
                          >
                            <span>Tests</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Per-Patient Test Tick Marks List */}
                    {!isExcluded && isExpanded && mainTests.length > 0 && (
                      <div
                        className="border-t border-border/70 bg-muted/20 px-3 py-2 space-y-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-1 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
                          <span>Include Tests:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => selectAllTestsForReport(rep.id, e)}
                              className="text-primary hover:underline cursor-pointer"
                            >
                              All
                            </button>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={(e) =>
                                deselectAllTestsForReport(
                                  rep.id,
                                  mainTests.map((t) => t.name),
                                  e
                                )
                              }
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              None
                            </button>
                          </div>
                        </div>

                        {mainTests.map((testItem) => {
                          const isTestChecked = !excludedForThisRep.includes(testItem.name);
                          return (
                            <label
                              key={testItem.name}
                              className={`flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isTestChecked
                                  ? "hover:bg-primary/5 text-foreground"
                                  : "opacity-50 text-muted-foreground hover:opacity-80"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={isTestChecked}
                                  onCheckedChange={() => toggleReportTest(rep.id, testItem.name)}
                                />
                                <span className="truncate font-medium text-[11px]">
                                  {testItem.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                {testItem.count} param{testItem.count > 1 ? "s" : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Canvas: Sequential A4 Sheets Preview */}
        <main
          className={`flex-1 overflow-auto bg-slate-900/10 dark:bg-black/50 p-3 sm:p-6 lg:p-8 justify-center items-start custom-scrollbar ${
            mobileTab === "preview" ? "flex" : "hidden md:flex"
          }`}
        >
          {loading && reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center text-muted-foreground gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-base font-semibold text-foreground">
                Preparing Batch Diagnostic Sheets...
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Assembling high-fidelity paginated A4 medical sheets for uninterrupted continuous physical printing.
              </p>
            </div>
          ) : preparedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center text-muted-foreground gap-3">
              <AlertTriangle className="h-10 w-10 text-amber-500 opacity-60" />
              <p className="text-base font-semibold text-foreground">No Reports in Active Queue</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                All selected reports have been excluded. Check the boxes in the left queue to include reports for printing.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center pb-12">
              {/* Continuous Print Viewport containing all A4 report pages */}
              <div ref={printRef} className="batch-print-viewport flex flex-col items-center gap-6 sm:gap-8">
                {preparedReports.map((rep, idx) => {
                  const isLast = idx === preparedReports.length - 1;
                  return (
                    <div
                      key={rep.id || idx}
                      id={`batch-rep-${rep.id}`}
                      className="batch-report-page shadow-2xl rounded-xl overflow-hidden transition-transform duration-150"
                      style={{
                        pageBreakAfter: isLast ? "avoid" : "always",
                        breakAfter: isLast ? "avoid" : "page",
                      }}
                    >
                      <PaginatedReportPreview
                        report={rep}
                        settings={printSettings}
                        scale={zoomScale}
                        hideInterpretation={false}
                        autoFitToFooter={autoFitToFooter}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* ═══════════════════════════════════════════════════════════════
            3. RIGHT SIDEBAR: Tick Marks for Active Patient's Tests
               (Allows quick desktop test inclusion/exclusion with instant live preview)
        ═══════════════════════════════════════════════════════════════ */}
        {activeReport && activeReportMainTests.length > 0 && (
          <aside className="no-print hidden lg:flex flex-col w-72 shrink-0 border-l border-border bg-card/75 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="p-3.5 border-b border-border/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  <span>Tests to Print</span>
                </span>
                <span className="text-[10px] font-mono text-primary font-bold">
                  {activeReport.customId}
                </span>
              </div>
              <h3 className="text-xs font-bold text-foreground truncate">
                {activeReport.patient?.name || "Patient"}
              </h3>
            </div>

            {/* Quick Actions */}
            <div className="px-3.5 py-2 border-b border-border/50 flex items-center justify-between text-xs bg-muted/20">
              <span className="text-[11px] text-muted-foreground">
                {(activeReportMainTests.length - (excludedTestsMap[activeReport.id]?.length || 0))} of {activeReportMainTests.length} Selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAllTestsForReport(activeReport.id)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() =>
                    deselectAllTestsForReport(
                      activeReport.id,
                      activeReportMainTests.map((t) => t.name)
                    )
                  }
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Tests Checklist with Tick Marks */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
              {activeReportMainTests.map((testItem) => {
                const excludedForThisRep = excludedTestsMap[activeReport.id] || [];
                const isChecked = !excludedForThisRep.includes(testItem.name);

                return (
                  <label
                    key={testItem.name}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? "bg-background border-border/80 shadow-2xs hover:border-primary/50"
                        : "bg-muted/10 border-dashed border-border/60 opacity-55 hover:opacity-80"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleReportTest(activeReport.id, testItem.name)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {testItem.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {testItem.count}
                        </span>
                      </div>
                      {testItem.category && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {testItem.category}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Footer Tip */}
            <div className="p-3 border-t border-border/70 bg-muted/10 text-[10px] text-muted-foreground leading-relaxed">
              💡 Unchecked tests are omitted from this patient&apos;s physical printout while keeping other tests intact.
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. CSS PRINT DIRECTIVES: High Precision Sequential Page Breaks
      ═══════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          *, *:before, *:after {
            box-sizing: border-box !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .batch-print-viewport {
            gap: 0 !important;
            row-gap: 0 !important;
            column-gap: 0 !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .batch-report-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .batch-report-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .report-preview-page-card {
            width: 794px !important;
            height: 1120px !important;
            min-height: 1120px !important;
            max-height: 1120px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .report-preview-page-card:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .report-print-page {
            width: 794px !important;
            height: 1120px !important;
            max-height: 1120px !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            position: relative !important;
            overflow: hidden !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BatchPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-semibold text-foreground">Loading Batch Print Studio...</p>
        </div>
      }
    >
      <BatchPrintContent />
    </Suspense>
  );
}
