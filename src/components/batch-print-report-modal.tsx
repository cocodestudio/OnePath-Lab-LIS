"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Printer, X, Loader2, CheckCircle2, AlertTriangle, FileText, ChevronRight,
  ZoomIn, ZoomOut, Check, SlidersHorizontal, Sparkles, User, Calendar
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

interface BatchPrintReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportIds: string[];
  initialReports?: any[];
  onComplete?: () => void;
}

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

export function BatchPrintReportModal({
  open,
  onOpenChange,
  reportIds,
  initialReports = [],
  onComplete,
}: BatchPrintReportModalProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadedReports, setLoadedReports] = useState<any[]>([]);
  const [liveLab, setLiveLab] = useState<any>(null);
  const [printWithHeaderFooter, setPrintWithHeaderFooter] = useState(false);
  const [zoomScale, setZoomScale] = useState(0.65);
  const [activeReportIndex, setActiveReportIndex] = useState(0);

  // Responsive default zoom
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setZoomScale(0.38);
    }
  }, []);

  // Fetch full details of all selected reports and lab settings
  useEffect(() => {
    if (!open || reportIds.length === 0) {
      setLoadedReports([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadAll = async () => {
      try {
        // 1. Fetch live lab letterhead & margin settings
        const labData = await fetchFromLaravel("/lab?include_letterhead=1", { skipCache: true }).catch(() => null);
        if (isMounted && labData) setLiveLab(labData);

        // 2. Fetch full report details for any report that lacks results
        const fetchedList: any[] = [];
        for (const id of reportIds) {
          const existing = initialReports.find(
            (r) => r.id === id && Array.isArray(r.results) && r.results.length > 0 && r.patient?.name
          );
          if (existing && existing.results && existing.results.length > 0) {
            fetchedList.push(existing);
          } else {
            try {
              const fullData = await fetchFromLaravel(`/reports/${id}`);
              fetchedList.push(fullData);
            } catch (e) {
              console.error(`Failed to load report ${id} for batch printing:`, e);
            }
          }
        }

        if (isMounted) {
          setLoadedReports(fetchedList);
        }
      } catch (err: any) {
        toast({
          variant: "error",
          title: "Error Loading Batch Reports",
          description: err.message || "Failed to load selected reports for printing.",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();

    return () => {
      isMounted = false;
    };
  }, [open, reportIds]);

  // Normalized print settings
  const printSettings: PrintSettings = useMemo(() => {
    const lab = liveLab || (loadedReports[0]?.lab || {});
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
  }, [liveLab, loadedReports, printWithHeaderFooter]);

  // Normalized Report Sheet data array
  const preparedReports: ReportSheetData[] = useMemo(() => {
    return loadedReports.map((r) => normalizeReportSheet(r, liveLab));
  }, [loadedReports, liveLab]);

  // 1-Click Batch Print Trigger
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Batch_Reports_${new Date().toISOString().slice(0, 10)}`,
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
        title: "Batch Print Sent",
        description: `${preparedReports.length} reports successfully queued to the printer.`,
      });

      // Automatically advance status of any FINAL reports to APPROVED
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

      onOpenChange(false);
      if (onComplete) onComplete();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div className="bg-card border border-border w-full h-full sm:h-[94vh] sm:max-w-7xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-border bg-card/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Batch Print Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                  {preparedReports.length} {preparedReports.length === 1 ? "Report" : "Reports"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All selected patient reports queued for continuous 1-click physical printing
              </p>
            </div>
          </div>

          {/* Header Controls: Letterhead Toggle, Zoom, Print All & Close */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Letterhead Checkbox */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={printWithHeaderFooter}
                onCheckedChange={(c) => setPrintWithHeaderFooter(Boolean(c))}
              />
              <span>Letterhead Background</span>
            </label>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 border border-border rounded-xl px-2 py-1 bg-muted/20 text-xs">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.35, z - 0.05))}
                className="p-1 hover:text-foreground text-muted-foreground cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center font-mono font-semibold text-[11px]">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(1.0, z + 0.05))}
                className="p-1 hover:text-foreground text-muted-foreground cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Print All Queue Button */}
            <Button
              type="button"
              onClick={() => handlePrint()}
              disabled={loading || preparedReports.length === 0}
              className="gradient-primary text-primary-foreground font-bold h-10 px-4 sm:px-5 gap-2 text-xs shadow-md cursor-pointer hover:opacity-95 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              <span>Print All Queue ({preparedReports.length})</span>
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Left Sidebar Queue + Right Live Print Canvas) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Sidebar: Reports Queue List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border bg-muted/15 flex flex-col shrink-0 max-h-[30vh] md:max-h-none overflow-hidden">
            <div className="p-3 border-b border-border/80 flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Selected Queue</span>
              <span>{preparedReports.length} Total</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {loading && preparedReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs font-medium">Assembling report queue...</p>
                </div>
              ) : preparedReports.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No reports selected.
                </div>
              ) : (
                preparedReports.map((rep, idx) => {
                  const isCurrent = idx === activeReportIndex;
                  return (
                    <div
                      key={rep.id || idx}
                      onClick={() => {
                        setActiveReportIndex(idx);
                        const el = document.getElementById(`batch-rep-${rep.id}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-primary/10 border-primary/40 shadow-xs"
                          : "bg-card border-border/60 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          #{idx + 1} · {rep.customId}
                        </span>
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

                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[170px]">
                          {rep.patient.name}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {rep.patient.gender?.slice(0, 1)}, {rep.patient.age}y
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{rep.results?.length || 0} Investigations</span>
                        <span>{new Date(rep.reportDate || rep.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Live Print Canvas (Rendered with forwarded printRef!) */}
          <div className="flex-1 overflow-auto bg-slate-900/10 dark:bg-black/40 p-4 sm:p-8 flex justify-center items-start custom-scrollbar">
            {loading && preparedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-semibold text-foreground">Loading Diagnostic Sheets...</p>
                <p className="text-xs text-muted-foreground">Preparing high-precision A4 formats for physical queue printing</p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                {/* Print Container holding all queued reports */}
                <div ref={printRef} className="batch-print-viewport flex flex-col items-center gap-8">
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
                          autoFitToFooter={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CSS for Enforcing Clean Sequential Page Breaks Across All Printers */}
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
    </div>
  );
}
