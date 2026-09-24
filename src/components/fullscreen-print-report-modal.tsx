"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  X, Calendar, Printer, Download,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, RotateCcw, FileText, Loader2, Phone, Send,
  Sparkles,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  PaginatedReportPreview,
  type PrintSettings,
  type ReportSheetData,
} from "@/components/report-sheet";
import { WhatsAppQrDialog } from "@/components/whatsapp-qr-dialog";
import { AiReportGenerationModal } from "@/components/ai-report-generation-modal";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getCleanLetterheadUrl } from "@/lib/api-client";
import { getReportPackage } from "@/lib/packages";
import { downloadNativePdf, getNativePdfBase64 } from "@/lib/pdf-report-downloader";

interface FullscreenPrintReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
  enteredValues?: Record<string, string>;
  abnormalOverrides?: Record<string, boolean>;
  paramRemarks?: Record<string, string>;
  testNotes?: Record<string, { notes?: string; remarks?: string; advices?: string }>;
  printedInterpretations?: string[];
}

function getTestPriority(mainTestName: string, category?: string): number {
  const name = (mainTestName || "").trim().toLowerCase();
  const cat = (category || "").trim().toLowerCase();

  // 1. CBC Top Priority
  if (name.includes("complete blood count") || name.includes("cbc") || name.includes("hemogram") || name.includes("haemogram")) {
    return 10;
  }

  // 2. ESR
  if (name.includes("erythrocyte sedimentation rate") || name.includes("esr")) {
    return 20;
  }

  // 3. Other Haematology / Hematology
  if (cat.includes("haemat") || cat.includes("hemat") || name.includes("blood group") || name.includes("coagulation") || name.includes("pt/inr") || name.includes("prothrombin") || name.includes("smear") || name.includes("platelet") || name.includes("bleeding time") || name.includes("clotting time")) {
    return 30;
  }

  // 4. Biochemistry (LFT, KFT, Lipids, Sugar, HbA1c, Electrolytes, Calcium, etc.)
  if (cat.includes("bio") || cat.includes("chem") || name.includes("liver") || name.includes("lft") || name.includes("kidney") || name.includes("kft") || name.includes("renal") || name.includes("rft") || name.includes("lipid") || name.includes("glucose") || name.includes("sugar") || name.includes("hba1c") || name.includes("electrolyte") || name.includes("calcium") || name.includes("cardiac") || name.includes("amylase") || name.includes("lipase") || name.includes("iron profile") || name.includes("iron studies")) {
    return 40;
  }

  // 5. Serology & Immunology & Hormones
  if (cat.includes("serol") || cat.includes("immun") || cat.includes("hormone") || cat.includes("endocrin") || name.includes("widal") || name.includes("dengue") || name.includes("typhoid") || name.includes("hiv") || name.includes("hbsag") || name.includes("hcv") || name.includes("vdrl") || name.includes("crp") || name.includes("ra factor") || name.includes("thyroid") || name.includes("tft") || name.includes("vitamin")) {
    return 50;
  }

  // 6. Microbiology / Clinical Pathology / Urine / Semen / Stool
  if (cat.includes("micro") || cat.includes("path") || cat.includes("urine") || cat.includes("semen") || cat.includes("stool") || name.includes("urine") || name.includes("semen") || name.includes("stool") || name.includes("culture") || name.includes("sputum") || name.includes("swab")) {
    return 60;
  }

  // 7. General / Others
  return 70;
}

export function FullscreenPrintReportModal({
  open,
  onOpenChange,
  report,
  enteredValues,
  abnormalOverrides,
  paramRemarks,
  testNotes,
  printedInterpretations,
}: FullscreenPrintReportModalProps) {
  const router = useRouter();
  const toast = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────
  const [selectedMainTestIds, setSelectedMainTestIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [printWithHeaderFooter, setPrintWithHeaderFooter] = useState(false);
  const [separatePagePerTest, setSeparatePagePerTest] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(0.80);
  const [totalPages, setTotalPages] = useState(1);
  const [liveLab, setLiveLab] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<"preview" | "tests" | "actions">("preview");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isPhonePromptOpen, setIsPhonePromptOpen] = useState(false);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [savePhoneToProfile, setSavePhoneToProfile] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setZoomScale(0.42);
    }
  }, []);

  // ── Extract distinct Main Tests ───────────────────────
  const mainTests = useMemo(() => {
    if (!report?.results || !Array.isArray(report.results)) return [];
    const map = new Map<string, { id: string; name: string; category?: string }>();
    report.results.forEach((item: any) => {
      const t = item.test;
      const mt = t.parent?.parent ? t.parent.parent : (t.parent ? t.parent : t);
      if (!map.has(mt.id)) map.set(mt.id, { id: mt.id, name: mt.name, category: t.category });
    });
    return Array.from(map.values()).sort((a, b) => {
      const pA = getTestPriority(a.name, a.category);
      const pB = getTestPriority(b.name, b.category);
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  }, [report]);

  // ── Sync on modal open & Fetch Latest Lab Settings ────
  useEffect(() => {
    if (open) {
      const initialSetting = Boolean(
        report?.lab?.report_settings?.separatePagePerTest ??
        (typeof report?.lab?.report_settings === "string" ? JSON.parse(report?.lab?.report_settings || "{}")?.separatePagePerTest : false)
      );
      setSeparatePagePerTest(initialSetting);

      fetchFromLaravel("/lab?include_letterhead=1", { skipCache: true })
        .then((fresh) => {
          if (fresh) {
            setLiveLab(fresh);
            const freshRaw = fresh.reportSettings ?? fresh.report_settings;
            const raw = typeof freshRaw === 'string' ? JSON.parse(freshRaw || '{}') : freshRaw;
            if (raw && typeof raw.separatePagePerTest === 'boolean') {
              setSeparatePagePerTest(raw.separatePagePerTest);
            }
          }
        })
        .catch(() => {});
    }
  }, [open, report]);

  useEffect(() => {
    if (open && report) {
      setSelectedMainTestIds(mainTests.map((m) => m.id));
      const ds = report.reportDate || report.createdAt;
      if (ds) {
        const d = new Date(ds);
        setSelectedDate(isNaN(d.getTime()) ? new Date() : d);
      } else {
        setSelectedDate(new Date());
      }
    }
  }, [open, report, mainTests]);


  // ── Print Settings ────────────────────────────────────
  // Margins & heights ALWAYS come from saved lab settings.
  // Only bgImage toggles on/off based on printWithHeaderFooter.
  const printSettings: PrintSettings = useMemo(() => {
    const lab = (liveLab || report?.lab || {}) as any;
    const rawBg = lab.printBgImage || lab.print_bg_image || null;
    const hasBg = Boolean(rawBg && rawBg !== "null" && rawBg !== "undefined" && rawBg !== "none");
    const bgImage = printWithHeaderFooter && hasBg ? getCleanLetterheadUrl(rawBg) : null;

    return {
      bgImage,
      headerHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 185,
      footerHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 95,
      marginLeft:   lab.printMarginLeft  ?? lab.print_margin_left  ?? 32,
      marginRight:  lab.printMarginRight ?? lab.print_margin_right ?? 32,
    };
  }, [report, liveLab, printWithHeaderFooter]);

  // ── Active Report Data ────────────────────────────────
  const activeReportData: ReportSheetData | null = useMemo(() => {
    if (!report) return null;
    const currentLab = liveLab || report.lab;
    const filteredResults = (report.results || [])
      .filter((item: any) => {
        const t = item.test;
        const mt = t.parent?.parent ? t.parent.parent : (t.parent ? t.parent : t);
        return selectedMainTestIds.includes(mt.id);
      })
      .map((item: any) => ({
        ...item,
        resultValue: enteredValues?.[item.id] ?? item.resultValue,
        isAbnormal: abnormalOverrides?.[item.id] ?? item.isAbnormal,
        remarks: paramRemarks?.[item.id] ?? item.remarks,
      }));

    const resolvedPackageName =
      report.packageName ||
      report.package_name ||
      report.meta?.packageName ||
      report.meta?.package_name ||
      getReportPackage(report.id) ||
      getReportPackage(report.customId) ||
      getReportPackage(report.patient?.customId);

    const rawLabSettings = currentLab?.reportSettings ?? currentLab?.report_settings;
    let labReportSettings: any = {};
    if (typeof rawLabSettings === 'string') {
      try {
        labReportSettings = JSON.parse(rawLabSettings || '{}');
      } catch {
        labReportSettings = {};
      }
    } else if (rawLabSettings && typeof rawLabSettings === 'object') {
      labReportSettings = { ...rawLabSettings };
    }

    // If live lab settings are missing doctor signatures, check localStorage fallback
    if (!labReportSettings.doctorSignatures && !labReportSettings.doctor_signatures && !labReportSettings.doctorSignature && !labReportSettings.doctor_signature) {
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

    const updatedLab = currentLab ? {
      ...currentLab,
      report_settings: {
        ...labReportSettings,
        separatePagePerTest,
      },
      reportSettings: {
        ...labReportSettings,
        separatePagePerTest,
      },
    } : currentLab;

    return {
      ...report,
      packageName: resolvedPackageName,
      package_name: resolvedPackageName,
      lab: updatedLab,
      reportDate: selectedDate.toISOString(),
      results: filteredResults,
      printedInterpretations: JSON.stringify(printedInterpretations ?? (typeof report.printedInterpretations === 'string' ? JSON.parse(report.printedInterpretations || '[]') : (report.printedInterpretations ?? report.printed_interpretations ?? []))),
      testNotes: testNotes || report.testNotes || report.test_notes,
      test_notes: testNotes || report.test_notes || report.testNotes,
    };
  }, [report, liveLab, selectedMainTestIds, enteredValues, abnormalOverrides, paramRemarks, testNotes, printedInterpretations, selectedDate, separatePagePerTest]);

  // ── Date & Time Helpers ───────────────────────────────
  const adj = (fn: (d: Date) => void) =>
    setSelectedDate((prev) => {
      const d = new Date(prev);
      fn(d);
      return d;
    });

  const adjustDay = (n: number) => adj((d) => d.setDate(d.getDate() + n));
  const adjustHour = (n: number) => adj((d) => d.setHours(d.getHours() + n));
  const adjustMinute = (n: number) => adj((d) => d.setMinutes(d.getMinutes() + n));
  const adjustSecond = (n: number) => adj((d) => d.setSeconds(d.getSeconds() + n));
  const toggleAmPm = () => adj((d) => d.setHours((d.getHours() + 12) % 24));

  const dateInputVal = useMemo(() => {
    try {
      const tz = selectedDate.getTimezoneOffset() * 60000;
      return new Date(selectedDate.getTime() - tz).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }, [selectedDate]);

  const hours12 = selectedDate.getHours() % 12 || 12;
  const isPm = selectedDate.getHours() >= 12;

  // ── Native Browser Print ──────────────────────────────
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Report_${report?.customId || "Patient"}_${report?.patient?.name || ""}`,
    onAfterPrint: async () => {
      toast.success("Printed", "Print job sent to printer. Status updated to APPROVED.");
      if (report?.id) {
        try {
          await fetchFromLaravel(`/reports/${report.id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "APPROVED" }),
          });
        } catch (e) {
          console.error("Failed to update report status to APPROVED on print:", e);
        }
      }
    },
  });

  // ── Intercept Ctrl+P / Cmd+P to trigger Clean Report Print ──
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, handlePrint]);

  // ── Direct Pixel-Perfect High-Resolution Native Vector PDF Download (Option A) ──────
  const handleDirectDownloadPdf = async () => {
    if (!printRef.current || !activeReportData) {
      toast.error("Not Ready", "Report preview is still rendering. Please wait a moment.");
      return;
    }

    setIsDownloadingPdf(true);
    toast.info("Preparing PDF", "Generating exact high-resolution vector PDF...");

    try {
      const pName = (report?.patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const rCode = (report?.customId || report?.id || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `LabReport_${rCode}_${pName}.pdf`;

      await downloadNativePdf({
        printContainer: printRef.current,
        filename,
      });

      toast.success("Downloaded", `${filename} downloaded successfully!`);
    } catch (err: any) {
      console.error("Direct PDF download error:", err);
      toast.error("Download Error", err?.message || "Failed to generate report PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // ── Automated WhatsApp Dispatch via Meta Cloud API ──────────────────
  const handleWhatsApp = async (overridePhone?: string | unknown) => {
    const phone = (typeof overridePhone === "string" ? overridePhone : (report?.patient?.phone || "")).trim();
    if (!phone) {
      setCustomPhone("");
      setIsPhonePromptOpen(true);
      return;
    }

    if (!printRef.current || !activeReportData) {
      toast.error("Not Ready", "Report preview is still rendering. Please wait a moment.");
      return;
    }

    setIsSendingWhatsApp(true);
    const displayPhone = phone.replace(/\D/g, "");
    toast.info("Preparing WhatsApp", "Rendering crisp native PDF report...");

    try {
      const pName = (report?.patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const rCode = (report?.customId || report?.id || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `LabReport_${rCode}_${pName}.pdf`;

      const pdfBase64 = await getNativePdfBase64({
        printContainer: printRef.current,
        filename,
      });

      toast.info("Sending via WhatsApp...", `Delivering official PDF report to +${displayPhone}...`);

      const res = await fetchFromLaravel(`/reports/${report.id}/send-whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          phone: phone,
          save_phone: savePhoneToProfile,
        }),
      });

      if (res?.status === "success" || res?.success) {
        toast.success("Sent on WhatsApp!", `Official report PDF sent to +${displayPhone} successfully!`);
        if (report?.patient) {
          report.patient.phone = phone;
        }
      } else {
        toast.error("Dispatch Failed", res?.message || "Could not deliver WhatsApp message via Meta Cloud API.");
      }
    } catch (err: any) {
      console.error("WhatsApp dispatch error:", err);
      toast.error("WhatsApp Error", err?.message || "An unexpected error occurred while preparing the report.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!report || !activeReportData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh] p-0 m-0 border border-border/80 rounded-3xl overflow-hidden flex flex-col bg-background shadow-2xl [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Print & Preview Report</DialogTitle>

        {/* Mobile View Switcher Tabs (< lg) */}
        <div className="flex lg:hidden items-center justify-between border-b border-border/80 bg-card p-2 gap-1 shrink-0 print:hidden">
          <div className="flex items-center gap-1 flex-1">
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mobileTab === "preview"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-muted/40"
              }`}
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("tests")}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mobileTab === "tests"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-muted/40"
              }`}
            >
              Tests ({selectedMainTestIds.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("actions")}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mobileTab === "actions"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-muted/40"
              }`}
            >
              Settings
            </button>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Main 3-Column Layout ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          
          {/* ═══════════════════════════════════════════════════════════════
              1. LEFT SIDEBAR: Tests List (~260px)
          ═══════════════════════════════════════════════════════════════ */}
          <div className={`w-full lg:w-[260px] bg-card border-r border-border/80 flex-col shrink-0 overflow-hidden print:hidden ${mobileTab === "tests" ? "flex flex-1" : "hidden lg:flex"}`}>
            <div className="p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Tests List</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {selectedMainTestIds.length}/{mainTests.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <div className="pb-2 border-b border-border/60">
                <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer select-none">
                  <Checkbox
                    checked={selectedMainTestIds.length === mainTests.length && mainTests.length > 0}
                    onCheckedChange={() =>
                      setSelectedMainTestIds(
                        selectedMainTestIds.length === mainTests.length ? [] : mainTests.map((m) => m.id)
                      )
                    }
                  />
                  <span className="text-xs font-bold text-foreground">Select All Tests</span>
                </label>
              </div>

              <div className="space-y-1.5">
                {mainTests.map((mt) => {
                  const isSelected = selectedMainTestIds.includes(mt.id);
                  return (
                    <label
                      key={mt.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-accent/70 border-primary/40 text-foreground font-semibold shadow-2xs"
                          : "bg-card border-border/70 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          setSelectedMainTestIds((prev) =>
                            prev.includes(mt.id) ? prev.filter((id) => id !== mt.id) : [...prev, mt.id]
                          )
                        }
                      />
                      <span className="text-xs truncate">{mt.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ✨ Generate AI Smart Report Button (Bottom Left) */}
            <div className="p-3 border-t border-border/80 bg-background/50 shrink-0">
              <Button
                type="button"
                onClick={() => {
                  if (report?.id) {
                    setIsGeneratingAiReport(true);
                  }
                }}
                disabled={isGeneratingAiReport}
                className="w-full h-11 relative overflow-hidden gap-2 font-bold text-xs bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-700 hover:via-indigo-700 hover:to-purple-700 text-white cursor-pointer shadow-md rounded-xl transition-all group disabled:opacity-75"
              >
                {isGeneratingAiReport ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
                )}
                <span className="tracking-tight">
                  {isGeneratingAiReport ? "Synthesizing AI Smart Report..." : "✨ Generate AI Smart Report"}
                </span>
              </Button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              2. CENTER PANEL: Live Canvas Viewport
          ═══════════════════════════════════════════════════════════════ */}
          <div className={`flex-1 flex-col bg-zinc-900/95 dark:bg-zinc-950 overflow-hidden relative print:bg-white print:overflow-visible print:p-0 ${mobileTab === "preview" ? "flex" : "hidden lg:flex"}`}>
            {/* Top Toolbar */}
            <div className="h-12 bg-zinc-800/90 border-b border-zinc-700/80 px-4 flex items-center justify-between text-zinc-200 shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-200 font-mono">
                  {report.patient?.name || "Patient Report"}
                </span>
                <span className="text-zinc-500">·</span>
                <span className="text-xs font-mono text-zinc-400 font-bold bg-zinc-700/60 px-2 py-0.5 rounded">
                  {report.customId}
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-xs font-bold text-zinc-300 font-mono">
                  Page 1 / {totalPages}
                </span>
              </div>

              {/* Zoom & Action Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomScale((p) => Math.max(0.4, Number((p - 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono font-bold w-12 text-center text-zinc-300">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((p) => Math.min(1.4, Number((p + 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(0.84)}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer ml-1"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <div className="h-4 w-px bg-zinc-700 mx-2" />

                <button
                  type="button"
                  onClick={() => handleDirectDownloadPdf()}
                  disabled={isDownloadingPdf}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Download PDF"
                >
                  {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Print Report"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Live Center Sheet Viewport (Rendered with forwarded printRef!) */}
            <div className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 flex justify-center items-start custom-scrollbar">
              <div className="rounded-xl overflow-hidden shadow-2xl">
                <PaginatedReportPreview
                  ref={printRef}
                  report={activeReportData}
                  settings={printSettings}
                  scale={zoomScale}
                  hideInterpretation={false}
                  onPageCount={setTotalPages}
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              3. RIGHT SIDEBAR: Settings & Actions (~320px)
          ═══════════════════════════════════════════════════════════════ */}
          <div className={`w-full lg:w-[320px] bg-card border-l border-border/80 flex-col shrink-0 overflow-hidden print:hidden ${mobileTab === "actions" ? "flex flex-1" : "hidden lg:flex"}`}>
            <div className="p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Settings</h3>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">
              {/* Date & Time Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Report Date & Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(new Date())}
                    className="text-[10.5px] text-primary hover:underline font-bold cursor-pointer"
                  >
                    Set Current (Now)
                  </button>
                </div>

                {/* Day Navigation */}
                <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => adjustDay(-1)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                    title="Previous Day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <input
                    type="date"
                    value={dateInputVal}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        adj((prev) => {
                          prev.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                        });
                      }
                    }}
                    className="flex-1 bg-background border border-border/70 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-foreground text-center outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => adjustDay(1)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                    title="Next Day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Time Steppers: Hour, Min, Sec, AM/PM */}
                <div className="grid grid-cols-4 gap-1.5 bg-muted/30 p-2 rounded-xl border border-border/80">
                  {[
                    { label: "Hr", value: hours12.toString().padStart(2, "0"), up: () => adjustHour(1), down: () => adjustHour(-1) },
                    { label: "Min", value: selectedDate.getMinutes().toString().padStart(2, "0"), up: () => adjustMinute(1), down: () => adjustMinute(-1) },
                    { label: "Sec", value: selectedDate.getSeconds().toString().padStart(2, "0"), up: () => adjustSecond(5), down: () => adjustSecond(-5) },
                  ].map(({ label, value, up, down }) => (
                    <div key={label} className="flex flex-col items-center bg-background p-1.5 rounded-lg border border-border/70">
                      <button type="button" onClick={up} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-mono font-bold text-foreground my-0.5">{value}</span>
                      <button type="button" onClick={down} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <span className="text-[8.5px] font-bold text-muted-foreground uppercase">{label}</span>
                    </div>
                  ))}

                  <div className="flex flex-col items-center justify-center bg-background p-1.5 rounded-lg border border-border/70">
                    <button
                      type="button"
                      onClick={toggleAmPm}
                      className="w-full h-full flex flex-col items-center justify-center gap-0.5 hover:bg-muted rounded text-primary font-bold text-xs cursor-pointer transition-colors"
                    >
                      <span className="font-bold text-xs">{isPm ? "PM" : "AM"}</span>
                      <span className="text-[8.5px] text-muted-foreground font-semibold">Toggle</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Header & Footer Toggle */}
              <div className="pt-2 border-t border-border/60">
                <label className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/80 cursor-pointer hover:bg-muted/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">Print with Header & Footer</span>
                    <span className="text-[10px] text-muted-foreground block">Uncheck for pre-printed letterhead paper</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={printWithHeaderFooter}
                    onChange={(e) => setPrintWithHeaderFooter(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors mt-2">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-foreground block">1 Test Per Page (Separate)</span>
                    <span className="text-[10px] text-muted-foreground block">Print each test on a separate fresh page</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={separatePagePerTest}
                    onChange={(e) => setSeparatePagePerTest(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer accent-primary"
                  />
                </label>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-4 border-t border-border/80 bg-muted/20 space-y-2.5">
              <Button
                type="button"
                onClick={() => handleDirectDownloadPdf()}
                disabled={isDownloadingPdf}
                className="w-full h-11 gap-2 font-extrabold text-sm bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-md rounded-xl transition-all"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => handlePrint()}
                className="w-full h-11 gap-2 font-extrabold text-sm bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-md rounded-xl transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Print Report</span>
                <span className="text-[10.5px] bg-primary-foreground/20 px-2 py-0.5 rounded-md font-mono font-medium tracking-tight">
                  Ctrl+P
                </span>
              </Button>

              <Button
                type="button"
                onClick={() => handleWhatsApp()}
                disabled={isSendingWhatsApp}
                className="w-full h-11 relative overflow-hidden gap-2 font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm rounded-xl transition-all"
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Sending to WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>Send WhatsApp Report</span>
                  </>
                )}
              </Button>
            </div>

          </div>

        </div>

        {/* WhatsApp QR Pairing Dialog Modal */}
        <WhatsAppQrDialog
          open={isQrModalOpen}
          onOpenChange={setIsQrModalOpen}
          onConnected={() => handleWhatsApp()}
        />

        {/* WhatsApp Phone Number Input Prompt Dialog */}
        <Dialog open={isPhonePromptOpen} onOpenChange={setIsPhonePromptOpen}>
          <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">WhatsApp Number Required</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Enter patient&apos;s mobile number to send the official PDF report.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-xl border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-semibold">{report?.patient?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report ID:</span>
                  <span className="font-mono font-medium">{report?.customId || report?.id}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Mobile / WhatsApp Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none">+91</span>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="9045757272"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-11 h-11 text-sm font-medium tracking-wide rounded-xl"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Enter 10-digit Indian WhatsApp mobile number</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="savePhoneFullscreen"
                  checked={savePhoneToProfile}
                  onCheckedChange={(c) => setSavePhoneToProfile(!!c)}
                />
                <label htmlFor="savePhoneFullscreen" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Save mobile number to patient profile permanently
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPhonePromptOpen(false)}
                className="rounded-xl h-10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const cleaned = customPhone.replace(/\D/g, "");
                  if (cleaned.length < 10) {
                    toast.error("Invalid Number", "Please enter a valid 10-digit mobile number.");
                    return;
                  }
                  setIsPhonePromptOpen(false);
                  handleWhatsApp(cleaned);
                }}
                disabled={customPhone.replace(/\D/g, "").length < 10 || isSendingWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-semibold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send WhatsApp Report</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>

      <AiReportGenerationModal
        isOpen={isGeneratingAiReport}
        patientName={report?.patient?.name}
        customId={report?.customId || report?.custom_id}
        onComplete={() => {
          router.push(`/dashboard/reports/${report.id}/smart-report`);
        }}
      />
    </Dialog>
  );
}
