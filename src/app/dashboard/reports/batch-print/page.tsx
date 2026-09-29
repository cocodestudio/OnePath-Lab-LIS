"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import {
  Printer, ArrowLeft, X, Loader2, CheckCircle2, AlertTriangle, FileText,
  ZoomIn, ZoomOut, Check, SlidersHorizontal, Sparkles, User, Calendar,
  RefreshCw, Search, ChevronRight
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

function normalizeReportSheet(rep: any, liveLab?: any): ReportSheetData {
  const lab = liveLab || rep.lab || {};
  return {
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
    results: (rep.results || []).map((r: any) => ({
      id: r.id,
      resultValue: r.resultValue ?? r.result_value ?? null,
      isAbnormal: Boolean(r.isAbnormal || r.is_abnormal),
      remarks: r.remarks || null,
      test: {
        id: r.test?.id,
        name: r.test?.name || "Investigation",
        category: r.test?.category || "General",
        fieldType: r.test?.fieldType || r.test?.field_type || "Numeric",
        unit: r.test?.unit || null,
        refRangeMin: r.test?.refRangeMin ?? r.test?.ref_range_min ?? null,
        refRangeMax: r.test?.refRangeMax ?? r.test?.ref_range_max ?? null,
        interpretation: r.test?.interpretation || null,
        parent: r.test?.parent || null,
        ...(r.test || {}),
      },
    })),
    lab: {
      name: lab.name || "OnePath Laboratory",
      email: lab.email || "info@onepathlab.com",
      address: lab.address || "Main Laboratory Center",
      phone: lab.phone || "",
      logoUrl: lab.logoUrl || lab.logo_url || "/onepath-logo.png",
      printBgImage: lab.printBgImage || lab.print_bg_image || null,
      printHeaderHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 185,
      printFooterHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 95,
      printMarginLeft: lab.printMarginLeft ?? lab.print_margin_left ?? 32,
      printMarginRight: lab.printMarginRight ?? lab.print_margin_right ?? 32,
      reportSettings: lab.reportSettings || lab.report_settings || {},
      ...(lab || {}),
    },
    printedInterpretations: rep.printedInterpretations || rep.printed_interpretations || null,
    testNotes: rep.testNotes || rep.test_notes || null,
    packageName: rep.packageName || rep.package_name || null,
  };
}

function BatchPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [liveLab, setLiveLab] = useState<any>(null);
  const [printWithHeaderFooter, setPrintWithHeaderFooter] = useState(false);
  const [autoFitToFooter, setAutoFitToFooter] = useState(true);
  const [zoomScale, setZoomScale] = useState(0.75);
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const [queueSearch, setQueueSearch] = useState("");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

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

  // Fetch report data and live lab configuration
  useEffect(() => {
    if (targetReportIds.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        // 1. Fetch live lab letterhead and margin preferences
        const labData = await fetchFromLaravel("/lab?include_letterhead=1", { skipCache: true }).catch(() => null);
        if (isMounted && labData) setLiveLab(labData);

        // 2. Read any cached reports from localStorage
        const cachedMap: Record<string, any> = {};
        if (typeof window !== "undefined") {
          try {
            const rawCached = localStorage.getItem("lis_cached_reports");
            if (rawCached) {
              const list = JSON.parse(rawCached);
              if (Array.isArray(list)) {
                list.forEach((r) => {
                  if (r.id) cachedMap[r.id] = r;
                });
              }
            }
          } catch {}
        }

        // 3. Fetch full report details for each selected ID
        const loadedList: any[] = [];
        for (const id of targetReportIds) {
          const cached = cachedMap[id];
          if (cached && Array.isArray(cached.results) && cached.results.length > 0 && cached.patient?.name) {
            loadedList.push(cached);
          } else {
            try {
              const fullData = await fetchFromLaravel(`/reports/${id}`);
              loadedList.push(fullData);
            } catch (e) {
              console.error(`Failed to load report ${id}:`, e);
            }
          }
        }

        if (isMounted) {
          setReports(loadedList);
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

  // Normalized active queue reports (excluding any toggled off)
  const preparedReports: ReportSheetData[] = useMemo(() => {
    return reports
      .filter((r) => !excludedIds.has(r.id))
      .map((r) => normalizeReportSheet(r, liveLab));
  }, [reports, liveLab, excludedIds]);

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

  // 1-Click Continuous Batch Print Trigger
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `OnePath_Batch_Reports_${new Date().toISOString().slice(0, 10)}`,
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

  const toggleExcludeReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden select-none animate-fade-in">
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP APP BAR: Status, Letterhead Toggle, Zoom, Actions
      ═══════════════════════════════════════════════════════════════ */}
      <header className="no-print h-14 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer rounded-xl border border-border/60"
            title="Return to reports list"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline font-semibold">Reports</span>
          </Button>

          <div className="h-5 w-px bg-border/80 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-sm sm:text-base font-bold text-foreground">
                  Batch Print Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                  {preparedReports.length} Queued
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pre-printed Letterhead Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={printWithHeaderFooter}
              onCheckedChange={(c) => setPrintWithHeaderFooter(Boolean(c))}
            />
            <span className="hidden md:inline">Include Pre-printed Letterhead</span>
            <span className="md:hidden">Letterhead</span>
          </label>

          {/* Zoom Controls */}
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
            className="gradient-primary text-primary-foreground font-bold h-9 px-4 sm:px-5 gap-2 text-xs shadow-md cursor-pointer hover:opacity-95 rounded-xl"
            title="Press Ctrl + P to print"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>Print All ({preparedReports.length})</span>
            <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded text-white">
              Ctrl+P
            </kbd>
          </Button>

          {/* Close Window Button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close Tab"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          2. WORKSPACE BODY: Sidebar Queue List + Continuous Print Viewport
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar Queue Navigation */}
        <aside className="no-print w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border bg-card/60 flex flex-col shrink-0 max-h-[32vh] md:max-h-none overflow-hidden">
          {/* Search inside queue */}
          <div className="p-3 border-b border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Selected Queue</span>
              <span>{preparedReports.length} / {reports.length} Active</span>
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

          {/* List of queued reports */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
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
                const resultsCount = Array.isArray(rep.results) ? rep.results.length : 0;

                return (
                  <div
                    key={rep.id || idx}
                    onClick={() => {
                      if (isExcluded) return;
                      setActiveReportIndex(idx);
                      const el = document.getElementById(`batch-rep-${rep.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isExcluded
                        ? "opacity-40 bg-muted/10 border-dashed border-border"
                        : isCurrent
                        ? "bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20"
                        : "bg-card border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
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
                        />
                        <span className="font-mono text-xs font-bold text-primary">
                          #{idx + 1} · {repCustomId}
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
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
                      <span className="text-muted-foreground text-[11px]">
                        {patGender.slice(0, 1)}, {patAge}y
                      </span>
                    </div>

                    <div className="mt-1 pl-6 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{resultsCount} Tests</span>
                      <span>
                        {new Date(rep.created_at || rep.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Canvas: Sequential A4 Sheets Preview */}
        <main className="flex-1 overflow-auto bg-slate-900/10 dark:bg-black/50 p-4 sm:p-8 flex justify-center items-start custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-base font-semibold text-foreground">Preparing Batch Diagnostic Sheets...</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Assembling high-fidelity paginated A4 medical sheets for uninterrupted continuous physical printing.
              </p>
            </div>
          ) : preparedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground gap-3">
              <AlertTriangle className="h-10 w-10 text-amber-500 opacity-60" />
              <p className="text-base font-semibold text-foreground">No Reports in Active Queue</p>
              <p className="text-xs text-muted-foreground">
                All selected reports have been excluded. Check the boxes in the left queue to include reports for printing.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center pb-12">
              {/* Continuous Print Viewport containing all A4 report pages */}
              <div ref={printRef} className="batch-print-viewport flex flex-col items-center gap-8">
                {preparedReports.map((rep, idx) => (
                  <div
                    key={rep.id || idx}
                    id={`batch-rep-${rep.id}`}
                    className="batch-report-page shadow-2xl rounded-xl overflow-hidden transition-transform duration-150"
                    style={{
                      pageBreakAfter: "always",
                      breakAfter: "page",
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
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. CSS PRINT DIRECTIVES: High Precision Sequential Page Breaks
      ═══════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .batch-print-viewport {
            gap: 0 !important;
            display: block !important;
            width: 100% !important;
          }
          .batch-report-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .batch-report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
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
