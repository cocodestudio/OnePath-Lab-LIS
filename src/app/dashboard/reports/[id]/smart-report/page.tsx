"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Phone,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity,
  HeartPulse,
  Apple,
  ShieldAlert,
  Stethoscope,
  QrCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";
import {
  type SmartReportSettings,
  defaultSmartReportSettings,
  normalizeReportSettings,
} from "@/lib/report-settings";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  analyzeReportForSmartInsights,
  evaluateParamReference,
  type SmartReportAnalysis,
  type OrganHealthScore,
  type AbnormalParameterAnalysis,
} from "@/lib/smart-report-engine";
import { useReactToPrint } from "react-to-print";
import { downloadNativePdf, getNativePdfBase64 } from "@/lib/pdf-report-downloader";
import { isGenuineCustomEditorTest } from "@/lib/clinical-test-helper";

export default function SmartReportGeneratedPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [analysis, setAnalysis] = useState<SmartReportAnalysis | null>(null);
  const [smartSettings, setSmartSettings] = useState<SmartReportSettings>(defaultSmartReportSettings);

  // Zoom & Preview state
  const [zoomScale, setZoomScale] = useState<number>(0.85);

  // PDF download state
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // WhatsApp state
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isPhonePromptOpen, setIsPhonePromptOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [savePhoneToProfile, setSavePhoneToProfile] = useState(true);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Auto adjust zoom for viewport
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        if (window.innerWidth < 480) setZoomScale(0.38);
        else if (window.innerWidth < 768) setZoomScale(0.48);
        else if (window.innerWidth < 1024) setZoomScale(0.62);
        else if (window.innerWidth < 1440) setZoomScale(0.75);
        else setZoomScale(0.85);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Fetch report data & load settings
  useEffect(() => {
    const fetchReportData = async () => {
      if (!reportId) return;
      try {
        setIsLoading(true);
        const data = await fetchFromLaravel(`/reports/${reportId}`);
        if (data) {
          setReport(data);

          // Run clinical intelligence engine on the report with patient demographics
          const pAge = data.patient?.age ? Number(data.patient.age) : 25;
          const pGender = data.patient?.gender || "male";
          const clinicalAnalysis = analyzeReportForSmartInsights(data, pAge, pGender);
          setAnalysis(clinicalAnalysis);

          // Resolve smart report settings
          let settingsToUse = defaultSmartReportSettings;
          const labSettings = data.lab?.report_settings || data.lab?.reportSettings;
          if (labSettings) {
            const normalized = normalizeReportSettings(labSettings);
            if (normalized.smartReport) {
              settingsToUse = { ...defaultSmartReportSettings, ...normalized.smartReport };
            }
          } else if (typeof window !== "undefined") {
            const cached = localStorage.getItem("lis_cached_report_settings");
            if (cached) {
              try {
                const parsed = normalizeReportSettings(JSON.parse(cached));
                if (parsed.smartReport) {
                  settingsToUse = { ...defaultSmartReportSettings, ...parsed.smartReport };
                }
              } catch { }
            }
          }

          // Merge lab metadata if available
          setSmartSettings({
            ...settingsToUse,
            labName: settingsToUse.labName || data.lab?.name || "OnePath Pathology Laboratory",
            labAddress: settingsToUse.labAddress || data.lab?.address || "Main Bazar, Connaught Place, New Delhi",
            email: settingsToUse.email || settingsToUse.emailAddress || data.lab?.email || "support@onepathlab.com",
            emailAddress: settingsToUse.emailAddress || settingsToUse.email || data.lab?.email || "support@onepathlab.com",
            logoUrl: settingsToUse.logoUrl || data.lab?.logoUrl || data.lab?.logo_url || null,
          });

          // Set phone for WhatsApp
          if (data.patient?.phone) {
            setCustomPhone(data.patient.phone.replace(/\D/g, "").slice(-10));
          }
        }
      } catch (err: any) {
        console.error("Failed to load report:", err);
        toast.error("Error", "Could not load report details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [reportId]);

  // ── Approach 1: Native High-Fidelity Vector Print & "Save as PDF" Engine ──
  const patientSafeName = (report?.patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
  const reportSafeCode = (report?.customId || report?.id || "SmartReport").replace(/[^a-zA-Z0-9_-]/g, "_");
  const documentPdfTitle = `AI_SmartReport_${reportSafeCode}_${patientSafeName}`;

  const handlePrint = useReactToPrint({
    contentRef: reportContainerRef,
    documentTitle: documentPdfTitle,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0 !important;
      }
      @media print {
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          width: 210mm !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
        .report-print-canvas {
          transform: none !important;
          -webkit-transform: none !important;
          margin: 0 auto !important;
          padding: 0 !important;
          gap: 0 !important;
          width: 210mm !important;
        }
        .smart-report-a4-page {
          box-sizing: border-box !important;
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          border: none !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .smart-report-a4-page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    `,
    onBeforePrint: async () => {
      if (typeof document !== "undefined" && document.fonts) {
        try {
          await document.fonts.ready;
        } catch { }
      }
    },
    onAfterPrint: () => {
      toast.success("Ready", "Smart Report sent to print / Save as PDF.");
    },
  });

  const handleDownloadPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsDownloadingPdf(true);
    const toastId = (toast as any).loading?.("Generating PDF...", "Rendering exact high-resolution vector PDF...")
      || toast.show({ title: "Generating PDF...", description: "Rendering exact high-resolution vector PDF...", type: "loading" as any });

    try {
      const pName = (report?.patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const rCode = (report?.customId || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `AI_SmartReport_${rCode}_${pName}.pdf`;

      await downloadNativePdf({
        printContainer: reportContainerRef.current,
        filename,
      });

      toast.dismiss(toastId);
      toast.success("Downloaded", `${filename} downloaded successfully!`);
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("Smart Report direct PDF download error:", err);
      toast.error("Download Error", err?.message || "Failed to generate report PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Intercept Ctrl+P / Cmd+P to trigger Clean Report Print (Approach 1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handlePrint]);

  // Handle WhatsApp Dispatch
  const handleWhatsApp = (overridePhone?: string) => {
    const rawTarget = overridePhone || customPhone || report?.patient?.phone || "";
    const cleanPhone = rawTarget.replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      setIsPhonePromptOpen(true);
      return;
    }

    setIsPhonePromptOpen(false);

    // Instant Success Popup (Optimistic Instant Response)
    toast.success("Sent on WhatsApp!", `AI Smart Report is being delivered to +91 ${cleanPhone}`);

    // Run PDF generation & delivery in background without blocking user
    (async () => {
      try {
        let pdfBase64: string | null = null;
        if (reportContainerRef.current) {
          try {
            pdfBase64 = await getNativePdfBase64({
              printContainer: reportContainerRef.current,
              filename: `AI_SmartReport_${report?.customId || "Report"}.pdf`,
            });
          } catch { }
        }

        const res = await fetchFromLaravel(`/reports/${report.id}/send-whatsapp`, {
          method: "POST",
          body: JSON.stringify({
            pdf_base64: pdfBase64,
            phone: cleanPhone,
            save_phone: savePhoneToProfile,
            message_type: "smart_report",
            async: true,
          }),
        });

        if (res && (res.status === "error" || res.error)) {
          openWhatsAppDirectLink(cleanPhone);
        }
      } catch (err: any) {
        console.warn("Backend WhatsApp dispatch failed, opening direct link:", err);
        openWhatsAppDirectLink(cleanPhone);
      }
    })();
  };

  const openWhatsAppDirectLink = (phone: string) => {
    const patientName = report?.patient?.name || "Patient";
    const labName = smartSettings.labName || "OnePath Pathology Laboratory";
    const reportCode = report?.customId || report?.id;
    const summaryText = analysis?.executiveSummary?.[0]
      ? `\n\n*Clinical Overview:* ${analysis.executiveSummary[0].slice(0, 140)}...`
      : "";

    const text = encodeURIComponent(
      `Hello ${patientName},\n\nYour *AI Smart Health Report* from *${labName}* (ID: ${reportCode}) is ready.${summaryText}\n\nPlease review your complete health analytics and organ wellness indicators.\n\nThank you!`
    );

    window.open(`https://wa.me/91${phone}?text=${text}`, "_blank");
    toast.success("WhatsApp Opened", `Redirected to chat with +91 ${phone}`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm">
        <div className="relative w-full max-w-[440px] p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-sky-600 dark:text-sky-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 block">
                Clinical Intelligence Dossier
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                Preparing Diagnostic Health Report
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300 mb-5 border-y border-zinc-100 dark:border-zinc-800 py-4">
            <div className="flex items-center justify-between">
              <span>Quantitative biomarker evaluation</span>
              <span className="font-mono text-[11px] text-emerald-600 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Organ systems profile &amp; reference intervals</span>
              <span className="font-mono text-[11px] text-sky-600 font-semibold">Syncing</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Multi-page A4 clinical pagination</span>
              <span className="font-mono text-[11px] text-zinc-400">Queued</span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-4/5 bg-sky-600 rounded-full animate-pulse" />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2.5">
            Formatting A4 print dossier and reference interval comparisons...
          </p>
        </div>
      </div>
    );
  }

  if (!report || !analysis) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 text-center bg-card border rounded-2xl shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1">Report Not Found</h2>
        <p className="text-xs text-muted-foreground mb-4">Could not load the requested test results.</p>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const patient = report.patient || {};
  const themeColor = smartSettings.themeColor || "#0284c7";

  const cd = smartSettings.coverDesign || "cover-classic";
  const isClassic = cd === "cover-classic" || cd === "template-1";
  const isModern = cd === "cover-modern" || cd === "template-2";
  const isTech = cd === "cover-tech" || cd === "template-3";
  const isWellness = cd === "cover-wellness" || cd === "template-4";
  const isGradient = cd === "cover-gradient";
  const isMinimal = cd === "cover-minimal";

  const interiorDesign = smartSettings.interiorDesign || "interior-clean";
  const isInteriorPremium = interiorDesign === "interior-premium";
  const isInteriorAccent = interiorDesign === "interior-accent";
  const isInteriorCard = interiorDesign === "interior-card";

  const hasExterior = Boolean(smartSettings.exteriorDesign && smartSettings.exteriorDesign !== "exterior-none");

  // Extract and process all valid diagnostic test results
  const rawResults = Array.isArray(report.results) ? report.results : [];
  const patientAge = patient.age ? Number(patient.age) : 25;
  const patientGender = patient.gender || "male";

  const validResults = rawResults
    .filter((r: any) => {
      const t = r.test || {};
      const name = t.name || r.name || "";
      return name !== "Report Template" && !isGenuineCustomEditorTest(t);
    })
    .map((r: any) => {
      const t = r.test || {};
      const rawVal = r.resultValue ?? r.result_value ?? r.result ?? r.value;
      const resultStr =
        rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ""
          ? String(rawVal).trim()
          : "—";

      let category = "General Pathology";
      if (t.parent?.parent?.name) {
        category = t.parent.parent.name;
      } else if (t.parent?.name) {
        category = t.parent.name;
      } else if (t.category) {
        category = t.category;
      }

      const evalRes = evaluateParamReference(r, patientAge, patientGender);

      return {
        id: r.id || r.test_id || `${t.name || r.name}-${Math.random()}`,
        name: t.name || r.name || "Investigation Parameter",
        category,
        result: resultStr,
        unit: t.unit || r.unit || "",
        refRange: evalRes.refRange,
        flag: evalRes.flag,
      };
    });

  // Paginate diagnostic results into chunks of 10 per page so no A4 page overflows
  const RESULTS_PER_PAGE = 10;
  const resultPages: any[][] = [];
  if (validResults.length > 0) {
    for (let i = 0; i < validResults.length; i += RESULTS_PER_PAGE) {
      resultPages.push(validResults.slice(i, i + RESULTS_PER_PAGE));
    }
  }

  // Paginate abnormal parameter deep-dive cards into chunks of max 3 per page so NO card is sliced
  const ABNORMAL_PER_PAGE = 3;
  const abnormalPages: AbnormalParameterAnalysis[][] = [];
  if (analysis.abnormalAnalyses.length > 0) {
    for (let i = 0; i < analysis.abnormalAnalyses.length; i += ABNORMAL_PER_PAGE) {
      abnormalPages.push(analysis.abnormalAnalyses.slice(i, i + ABNORMAL_PER_PAGE));
    }
  } else {
    abnormalPages.push([]); // Single page for "All Biomarkers Within Reference Limits"
  }

  // Calculate dynamic total pages:
  // Cover (1) + Summary & Organs (1) + Result Pages (N) + Abnormal Insights (M) + Nutrition & Disclaimer (1) + Exterior (0 or 1)
  const numResultPages = resultPages.length;
  const numAbnormalPages = abnormalPages.length;
  const totalPages = 1 + 1 + numResultPages + numAbnormalPages + 1 + (hasExterior ? 1 : 0);
  const biomarkerStartPage = 2 + numResultPages + 1;
  const guidancePageNum = 2 + numResultPages + numAbnormalPages + 1;
  const exteriorPageNum = totalPages;

  return (
    <div className="min-h-screen bg-zinc-900/95 dark:bg-zinc-950 text-foreground pb-16 print:bg-white print:p-0 print:m-0">

      {/* ═════════════════════════════════════════════════════════════════
          TOP ACTION BAR: STRICTLY 2 MAIN ACTION OPTIONS (no-print)
      ═════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/80 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 shadow-sm no-print">

        {/* Left: Back & Patient Details */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="h-9 px-2.5 sm:px-3 rounded-xl border-border/80 hover:bg-muted text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="h-5 w-px bg-border hidden sm:block shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-base font-bold text-foreground leading-none truncate max-w-[140px] sm:max-w-none">
                  {patient.name || "Patient Report"}
                </h1>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                  style={{
                    backgroundColor: `${themeColor}10`,
                    borderColor: `${themeColor}35`,
                    color: themeColor,
                  }}
                >
                  Smart Health Report
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                File: <span className="font-mono font-medium">{report.customId}</span> · {patient.age ? `${patient.age} Y` : ""} {patient.gender || ""}
              </p>
            </div>
          </div>

          {/* Quick Print Button on Mobile Header */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePrint()}
            className="sm:hidden h-9 w-9 rounded-xl border-border/80 text-primary hover:bg-muted shrink-0 cursor-pointer"
            title="Print Report"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Zoom Controls (Screen Only) */}
        <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setZoomScale((p) => Math.max(0.4, Number((p - 0.05).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-bold w-12 text-center text-foreground">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomScale((p) => Math.min(1.2, Number((p + 0.05).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale(0.85)}
            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Action Buttons (WhatsApp, Download PDF, Print) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Action 1: Send on WhatsApp */}
          <Button
            type="button"
            onClick={() => handleWhatsApp()}
            disabled={isSendingWhatsApp}
            className="h-10 px-3 sm:px-4 gap-1.5 sm:gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm rounded-xl transition-all justify-center flex-1 sm:flex-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Send on WhatsApp</span>
          </Button>

          {/* Action 2: Download PDF (Direct Native Vector Engine) */}
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="h-10 px-3 sm:px-4 gap-1.5 sm:gap-2 font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-md rounded-xl transition-all justify-center flex-1 sm:flex-none disabled:opacity-60 disabled:cursor-not-allowed"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
            <span className="truncate">Download</span>
          </Button>

          {/* Action 3: Print Report (Hidden on mobile row since top row has icon) */}
          <Button
            type="button"
            onClick={() => handlePrint()}
            className="hidden sm:inline-flex h-10 px-3.5 gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-md rounded-xl transition-all"
            title="Print Report (Ctrl+P)"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
            <span className="text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded font-mono font-medium hidden md:inline">
              Ctrl+P
            </span>
          </Button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          PRINT STYLES FOR CRISP VECTOR MULTI-PAGE PRINTING (APPROACH 1)
      ═════════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .report-print-canvas {
            transform: none !important;
            -webkit-transform: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            gap: 0 !important;
            width: 210mm !important;
          }
          .smart-report-a4-page {
            box-sizing: border-box !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .smart-report-a4-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* ═════════════════════════════════════════════════════════════════
          A4 MULTI-PAGE CANVAS CONTAINER
      ═════════════════════════════════════════════════════════════════ */}
      <div className="flex justify-center items-start pt-4 sm:pt-8 px-1 sm:px-4 overflow-x-hidden overflow-y-auto custom-scrollbar w-full">
        <div
          style={{
            width: Math.round(794 * zoomScale),
            overflow: "visible",
            flexShrink: 0,
          }}
        >
          <div
            ref={reportContainerRef}
            className="report-print-canvas flex flex-col items-center gap-8 origin-top transition-transform duration-200"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: "top left",
              width: 794,
            }}
          >

            {/* ─────────────────────────────────────────────────────────────
              PAGE 1: CLINICAL HEALTH DOSSIER COVER PAGE
          ───────────────────────────────────────────────────────────── */}
            <div
              className="smart-report-a4-page w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between overflow-hidden rounded-xl"
              style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
            >
              {/* Architectural Cover Trim by Template */}
              {isClassic && (
                <div className="absolute top-0 bottom-0 left-0 w-2.5" style={{ backgroundColor: themeColor }} />
              )}
              {isModern && (
                <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: themeColor }} />
              )}
              {isTech && (
                <div className="absolute top-0 left-0 right-0 h-[310px] bg-slate-900" />
              )}
              {isWellness && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: themeColor }} />
                  <div className="absolute inset-5 border border-slate-200 pointer-events-none" />
                </>
              )}
              {isGradient && (
                <div
                  className="absolute top-0 left-0 right-0 h-[280px]"
                  style={{ background: `linear-gradient(135deg, #0f172a 0%, ${themeColor} 100%)` }}
                />
              )}
              {isMinimal && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ backgroundColor: themeColor }} />
              )}

              {/* Cover Top Header */}
              <div className={`pt-11 px-14 flex items-start justify-between z-10 ${isTech || isGradient ? "text-white" : "text-slate-900"}`}>
                {smartSettings.showLogo && smartSettings.logoUrl ? (
                  <div className={isTech || isGradient ? "bg-white px-3 py-1.5 rounded-lg" : ""}>
                    <img
                      src={smartSettings.logoUrl}
                      alt="Lab Logo"
                      className="h-12 max-w-[260px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg text-white shrink-0"
                      style={{ backgroundColor: isTech || isGradient ? "rgba(255,255,255,0.16)" : themeColor }}
                    >
                      +
                    </div>
                    <div>
                      <span className="font-bold text-base tracking-tight block leading-tight">
                        {smartSettings.labName || "OnePath Diagnostic Laboratory"}
                      </span>
                      <span className={`text-[11px] block mt-0.5 ${isTech || isGradient ? "text-slate-300" : "text-slate-500"}`}>
                        Clinical Pathology &amp; Diagnostic Medicine
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.16em] block ${isTech || isGradient ? "text-slate-300" : "text-slate-500"}`}
                  >
                    Diagnostic Health Dossier
                  </span>
                  <span className="font-mono text-xs font-bold block mt-0.5">
                    {report.customId || "DOC-REPORT"}
                  </span>
                  {(smartSettings.aiGeneratedTag || smartSettings.showAiTag) && (
                    <span
                      className="inline-block mt-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold border"
                      style={{
                        backgroundColor: isTech || isGradient ? "rgba(255,255,255,0.12)" : `${themeColor}0f`,
                        borderColor: isTech || isGradient ? "rgba(255,255,255,0.28)" : `${themeColor}35`,
                        color: isTech || isGradient ? "#ffffff" : themeColor,
                      }}
                    >
                      Clinical Analytics Edition
                    </span>
                  )}
                </div>
              </div>

              {/* Cover Hero Title & Structured Snapshot */}
              <div className="px-14 z-10 flex-1 flex flex-col justify-center">
                <div className={`${isTech || isGradient ? "mb-12" : "mb-10"}`}>
                  <div
                    className="h-0.5 w-14 mb-4"
                    style={{ backgroundColor: isTech || isGradient ? "#ffffff" : themeColor }}
                  />
                  <h1 className={`text-[36px] font-bold tracking-tight leading-[1.15] max-w-xl ${isTech || isGradient ? "text-white" : "text-slate-900"}`}>
                    Comprehensive Health &amp; Biomarker Report
                  </h1>
                  <p className={`text-sm mt-3 max-w-lg leading-relaxed ${isTech || isGradient ? "text-slate-200" : "text-slate-600"}`}>
                    Structured clinical evaluation, quantitative laboratory findings, organ system profiling, and dietary guidance prepared for physician review.
                  </p>
                </div>

                {/* Patient Demographics Ledger Box */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs mb-6">
                  <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Patient Record Details
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Reported:{" "}
                      {new Date(report.reportDate || report.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 text-xs">
                    <div className="px-5 py-3.5">
                      <span className="text-[10.5px] text-slate-500 block">Patient Name</span>
                      <span className="font-bold text-slate-900 text-sm mt-0.5 block">{patient.name || "N/A"}</span>
                    </div>
                    <div className="px-5 py-3.5">
                      <span className="text-[10.5px] text-slate-500 block">Patient ID / Lab File</span>
                      <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{report.customId || report.id}</span>
                    </div>
                    <div className="px-5 py-3.5">
                      <span className="text-[10.5px] text-slate-500 block">Age / Gender</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {patient.age ? `${patient.age} Years` : "N/A"} &middot; {patient.gender || "N/A"}
                      </span>
                    </div>
                    <div className="px-5 py-3.5">
                      <span className="text-[10.5px] text-slate-500 block">Referring Clinician</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{patient.refDoctor || "Self / Direct"}</span>
                    </div>
                  </div>
                </div>

                {/* Real Clinical Summary Strip & Dossier Index */}
                <div className="grid grid-cols-4 border border-slate-200 rounded-lg divide-x divide-slate-200 bg-slate-50/70 mb-6">
                  <div className="px-4 py-3">
                    <span className="text-[10px] text-slate-500 font-medium block">Biomarkers Tested</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">{analysis.totalTested}</span>
                  </div>
                  <div className="px-4 py-3">
                    <span className="text-[10px] text-slate-500 font-medium block">Within Reference</span>
                    <span className="text-lg font-bold text-teal-700 tabular-nums mt-0.5 block">{analysis.totalNormal}</span>
                  </div>
                  <div className="px-4 py-3">
                    <span className="text-[10px] text-slate-500 font-medium block">Flagged for Review</span>
                    <span className={`text-lg font-bold tabular-nums mt-0.5 block ${analysis.totalAbnormal > 0 ? "text-rose-700" : "text-slate-800"}`}>
                      {analysis.totalAbnormal}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <span className="text-[10px] text-slate-500 font-medium block">Health Index</span>
                    <span className="text-lg font-bold tabular-nums mt-0.5 block" style={{ color: themeColor }}>
                      {analysis.overallHealthScore}/100
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <span className="text-[10.5px] font-semibold text-slate-500 block mb-2">Included Sections</span>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Executive Clinical Summary &amp; Organ Profile</span>
                      <span className="font-mono text-slate-400">Page 2</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Quantitative Investigation Results</span>
                      <span className="font-mono text-slate-400">
                        {numResultPages > 0 ? `Page ${numResultPages === 1 ? "3" : `3–${2 + numResultPages}`}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Biomarker Clinical Insights</span>
                      <span className="font-mono text-slate-400">Page {biomarkerStartPage}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Nutrition, Lifestyle &amp; Regulatory Notice</span>
                      <span className="font-mono text-slate-400">Page {guidancePageNum}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Footer */}
              <div className="px-14 py-6 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs z-10">
                <div>
                  <p className="font-bold text-slate-900">{smartSettings.labName || "OnePath Diagnostic Laboratory"}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{smartSettings.labAddress || "Clinical Pathology Division"}</p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  {(smartSettings.email || smartSettings.emailAddress) && (
                    <p className="font-medium text-slate-700">{smartSettings.email || smartSettings.emailAddress}</p>
                  )}
                  {smartSettings.footerText && <p className="text-slate-400 mt-0.5">{smartSettings.footerText}</p>}
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
              PAGE 2: EXECUTIVE SUMMARY & ORGAN HEALTH MATRIX
          ───────────────────────────────────────────────────────────── */}
            <div
              className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative px-11 py-9 flex flex-col justify-between rounded-xl ${
                isInteriorAccent ? "border-l-[6px]" : ""
              }`}
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                borderColor: isInteriorAccent ? themeColor : undefined,
              }}
            >
              <div>
                {/* Lab Interior Header */}
                <div
                  className={`flex items-end justify-between pb-3 mb-4 ${
                    isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                  }`}
                  style={{ borderColor: themeColor }}
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {smartSettings.labName || "OnePath Diagnostic Laboratory"}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">{smartSettings.labAddress}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <span className="font-bold text-slate-900 block">Clinical Summary &amp; Organ Profile</span>
                    <span>{smartSettings.email || smartSettings.emailAddress}</span>
                  </div>
                </div>

                {/* Patient Metadata Strip */}
                <div
                  className={`flex justify-between items-center text-xs mb-5 px-3.5 py-2.5 border border-slate-200 ${
                    isInteriorCard ? "rounded-lg bg-slate-50/70" : "bg-slate-50/50"
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900">{patient.name || "Patient"}</span>
                    <span className="text-slate-500 ml-2">
                      {patient.age ? `${patient.age} Y` : ""} / {patient.gender || ""}
                      {patient.refDoctor ? `  |  Ref: ${patient.refDoctor}` : ""}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-slate-700">
                    ID: {report.customId} &middot; {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>

                {/* Executive Summary */}
                {smartSettings.showExecutiveSummary && (
                  <div
                    className="pl-4 border-l-[3px] mb-6"
                    style={{ borderColor: themeColor }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-slate-900">
                        Clinical Assessment Summary
                      </h3>
                      <div className="flex items-center gap-2.5 text-xs">
                        <span className="font-semibold text-slate-600">{analysis.overallStatusLabel}</span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-900 tabular-nums">
                          Index: {analysis.overallHealthScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-slate-700 leading-relaxed">
                      {analysis.executiveSummary.map((paragraph: string, idx: number) => (
                        <p key={idx} className="text-[11.5px]">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organ Health Scorecard */}
                {(smartSettings.showOrganHealth || smartSettings.showOrganHealthGauges) && (
                  <div className="space-y-2.5 mb-5">
                    <div className="flex justify-between items-baseline border-b border-slate-200 pb-1.5">
                      <h3 className="text-xs font-bold text-slate-900">
                        Organ Systems Profile
                      </h3>
                      <span className="text-[10.5px] font-mono text-slate-500">Physiological Score (0–100)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {analysis.organScores.map((org: OrganHealthScore) => {
                        const badgeColor = org.color || "#0f766e";

                        return (
                          <div
                            key={org.id}
                            className={`p-3 border border-slate-200 bg-white flex flex-col justify-between ${
                              isInteriorCard ? "rounded-lg" : "rounded"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{org.name}</span>
                                <span className="text-[10.5px] text-slate-500 block mt-0.5">{org.summary}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                                  {org.score}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">/100</span>
                              </div>
                            </div>

                            <div className="mt-2.5">
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${org.score}%`,
                                    backgroundColor: badgeColor,
                                  }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-500">
                                  {org.testedCount} tested{org.abnormalCount > 0 ? `, ${org.abnormalCount} flagged` : ""}
                                </span>
                                <span className="font-semibold" style={{ color: badgeColor }}>
                                  {org.statusLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specialist Guidance */}
                {analysis.recommendedSpecialist && (
                  <div className="border border-slate-200 border-l-[3px] border-l-amber-600 bg-white p-3.5 text-xs flex items-start gap-2.5">
                    <Stethoscope className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Recommended Clinical Consultation</span>
                      <span className="text-[11.5px] text-slate-600 leading-snug">
                        Based on the observed profile, follow-up with a <strong className="text-slate-900">{analysis.recommendedSpecialist}</strong> is recommended for clinical correlation.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Page 2 Footer */}
              <div className={`border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex justify-between items-center ${isInteriorPremium ? "border-double border-t-2" : ""}`}>
                <span>{smartSettings.footerText || "OnePath Diagnostic Laboratory"}</span>
                <span className="font-mono">Page 2 of {totalPages}</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
              PAGES 3+: QUANTITATIVE DIAGNOSTIC INVESTIGATION RESULTS
          ───────────────────────────────────────────────────────────── */}
            {resultPages.map((pageResults, pageIdx) => {
              const pageNum = 3 + pageIdx;

              return (
                <div
                  key={`result-page-${pageIdx}`}
                  className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative px-11 py-9 flex flex-col justify-between rounded-xl overflow-hidden ${
                    isInteriorAccent ? "border-l-[6px]" : ""
                  }`}
                  style={{
                    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                    borderColor: isInteriorAccent ? themeColor : undefined,
                  }}
                >
                  <div>
                    {/* Lab Header */}
                    <div
                      className={`flex items-end justify-between pb-3 mb-4 ${
                        isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                      }`}
                      style={{ borderColor: themeColor }}
                    >
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          {smartSettings.labName || "OnePath Diagnostic Laboratory"}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">{smartSettings.labAddress}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-600">
                        <span className="font-bold text-slate-900 block">Laboratory Investigation Findings</span>
                        <span>{patient.name} &middot; {report.customId}</span>
                      </div>
                    </div>

                    {/* Patient Strip */}
                    <div className="flex justify-between items-center text-xs mb-4 px-3.5 py-2 border border-slate-200 bg-slate-50/50">
                      <div>
                        <span className="font-bold text-slate-900">{patient.name || "Patient"}</span>
                        <span className="text-slate-500 ml-2">
                          {patient.age ? `${patient.age} Y` : ""} / {patient.gender || ""}
                          {patient.refDoctor ? `  |  Ref: ${patient.refDoctor}` : ""}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-600">
                        Results Sheet {pageIdx + 1} of {resultPages.length}
                      </div>
                    </div>

                    {/* Crisp Clinical Table */}
                    <table className="w-full text-left text-xs border-collapse table-fixed border-y border-slate-300">
                      <colgroup>
                        <col style={{ width: "38%" }} />
                        <col style={{ width: "17%" }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "12%" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b-2 border-slate-900 bg-slate-50 text-[11px] font-bold text-slate-700">
                          <th className="py-2.5 px-3">Investigation</th>
                          <th className="py-2.5 px-3 text-right">Observed Value</th>
                          <th className="py-2.5 px-3">Reference Interval</th>
                          <th className="py-2.5 px-2 text-center">Unit</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pageResults.map((item: any, rIdx: number) => {
                          const isHigh = item.flag === "HIGH";
                          const isLow = item.flag === "LOW";

                          return (
                            <tr
                              key={item.id || rIdx}
                              className={rIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}
                              style={{
                                boxShadow: isHigh
                                  ? "inset 3px 0 0 #be123c"
                                  : isLow
                                    ? "inset 3px 0 0 #b45309"
                                    : undefined,
                              }}
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 leading-tight">{item.name}</div>
                                {item.category && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">{item.category}</div>
                                )}
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right font-mono text-xs tabular-nums ${
                                  isHigh
                                    ? "font-bold text-rose-700"
                                    : isLow
                                      ? "font-bold text-amber-700"
                                      : "font-semibold text-slate-900"
                                }`}
                              >
                                {item.result}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 tabular-nums">
                                {item.refRange}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                                {item.unit || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right text-[11px]">
                                {isHigh ? (
                                  <span className="font-bold text-rose-700">High</span>
                                ) : isLow ? (
                                  <span className="font-bold text-amber-700">Low</span>
                                ) : (
                                  <span className="font-medium text-teal-700">Normal</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Page Footer */}
                  <div
                    className={`border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex justify-between items-center ${
                      isInteriorPremium ? "border-double border-t-2" : ""
                    }`}
                  >
                    <span>{smartSettings.footerText || "OnePath Diagnostic Laboratory"}</span>
                    <span className="font-mono">Page {pageNum} of {totalPages}</span>
                  </div>
                </div>
              );
            })}

            {/* ─────────────────────────────────────────────────────────────
              BIOMARKER CLINICAL INTERPRETATION PAGES
          ───────────────────────────────────────────────────────────── */}
            {abnormalPages.map((pageCards, pageIdx) => {
              const currentAbnormalPageNum = biomarkerStartPage + pageIdx;
              const isLastAbnormalPage = pageIdx === abnormalPages.length - 1;

              return (
                <div
                  key={`abnormal-page-${pageIdx}`}
                  className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative px-11 py-9 flex flex-col justify-between rounded-xl overflow-hidden ${
                    isInteriorAccent ? "border-l-[6px]" : ""
                  }`}
                  style={{
                    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                    borderColor: isInteriorAccent ? themeColor : undefined,
                  }}
                >
                  <div>
                    {/* Lab Header */}
                    <div
                      className={`flex items-end justify-between pb-3 mb-4 ${
                        isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                      }`}
                      style={{ borderColor: themeColor }}
                    >
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                          {smartSettings.labName || "OnePath Diagnostic Laboratory"}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">{smartSettings.labAddress}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-600">
                        <span className="font-bold text-slate-900 block">Biomarker Clinical Interpretation</span>
                        <span>{patient.name} &middot; {report.customId}</span>
                      </div>
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                      <h3 className="text-xs font-bold text-slate-900">
                        Flagged Parameter Review{" "}
                        {abnormalPages.length > 1 ? `(${pageIdx + 1} of ${abnormalPages.length})` : ""}
                      </h3>
                      <div className="flex items-center gap-4 text-[10.5px] text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-teal-600" /> Normal
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-600" /> Low / Borderline
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-700" /> High / Review
                        </span>
                      </div>
                    </div>

                    {/* Clean Clinical Flag Cards */}
                    <div className="space-y-3.5 mb-4">
                      {pageCards.length > 0 ? (
                        pageCards.map((param: AbnormalParameterAnalysis) => {
                          const isHigh = param.flag === "HIGH";
                          const statusColor = isHigh ? "#be123c" : "#b45309";

                          return (
                            <div
                              key={param.id}
                              className="p-4 bg-white border border-slate-200 border-l-[3px] rounded-r-lg space-y-2.5"
                              style={{ borderLeftColor: statusColor }}
                            >
                              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                                <div>
                                  <span className="font-bold text-xs text-slate-900 block">{param.name}</span>
                                  <span className="text-[10.5px] text-slate-500">{param.organ}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                                    {param.result} {param.unit}{" "}
                                    <span className="ml-1.5 font-bold" style={{ color: statusColor }}>
                                      ({param.flag})
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                                    Reference: {param.referenceRange}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-semibold text-slate-900 text-[11px] block">Possible Clinical Factors</span>
                                  <p className="text-slate-600 text-[11px] leading-snug mt-0.5">
                                    {param.commonReasons?.join(", ") || "Physiological or dietary variation requiring review."}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 text-[11px] block">Clinical Relevance</span>
                                  <p className="text-slate-600 text-[11px] leading-snug mt-0.5">
                                    {param.impactOnBody}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 border border-slate-200 border-l-[3px] border-l-teal-700 rounded-r-lg bg-slate-50/40">
                          <h4 className="font-bold text-sm text-slate-900">All Tested Biomarkers Within Reference Limits</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            All quantitative parameters evaluated in this panel fall within expected biological reference intervals. Continue routine preventive follow-ups as advised by your physician.
                          </p>
                        </div>
                      )}
                    </div>

                    {isLastAbnormalPage && analysis.totalNormal > 0 && (
                      <div className="px-4 py-2.5 border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-700">
                        <span className="font-medium">
                          {analysis.totalNormal} of {analysis.totalTested} evaluated parameters fall within reference limits
                        </span>
                        <span className="font-mono font-bold text-teal-700 tabular-nums">
                          {Math.round((analysis.totalNormal / analysis.totalTested) * 100)}% Normal
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Biomarker Footer */}
                  <div className={`border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex justify-between items-center ${isInteriorPremium ? "border-double border-t-2" : ""}`}>
                    <span>{smartSettings.footerText || "OnePath Diagnostic Laboratory"}</span>
                    <span className="font-mono">Page {currentAbnormalPageNum} of {totalPages}</span>
                  </div>
                </div>
              );
            })}

            {/* ─────────────────────────────────────────────────────────────
              GUIDANCE PAGE: NUTRITION, LIFESTYLE & REGULATORY NOTICE
          ───────────────────────────────────────────────────────────── */}
            <div
              className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative px-11 py-9 flex flex-col justify-between rounded-xl ${
                isInteriorAccent ? "border-l-[6px]" : ""
              }`}
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                borderColor: isInteriorAccent ? themeColor : undefined,
              }}
            >
              <div>
                {/* Lab Header */}
                <div
                  className={`flex items-end justify-between pb-3 mb-5 ${
                    isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                  }`}
                  style={{ borderColor: themeColor }}
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {smartSettings.labName || "OnePath Diagnostic Laboratory"}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">{smartSettings.labAddress}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-600">
                    <span className="font-bold text-slate-900 block">Nutrition, Habits &amp; Disclaimer</span>
                    <span>{smartSettings.email || smartSettings.emailAddress}</span>
                  </div>
                </div>

                {/* Diet & Lifestyle Guidance */}
                {(smartSettings.showDietTips || smartSettings.showDietLifestyleTips) && (
                  <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                      Dietary &amp; Lifestyle Recommendations
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Foods to Prioritize */}
                      <div className="border border-slate-200 border-t-[3px] border-t-teal-700 bg-white p-4 text-xs space-y-2">
                        <span className="font-bold text-slate-900 block text-xs">
                          Foods to Include
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-slate-700 pl-4 list-disc">
                          {analysis.lifestyleDietAdvice.foodsToInclude.map((food: string, i: number) => (
                            <li key={i}>{food}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Foods to Moderate */}
                      <div className="border border-slate-200 border-t-[3px] border-t-rose-700 bg-white p-4 text-xs space-y-2">
                        <span className="font-bold text-slate-900 block text-xs">
                          Foods to Limit or Avoid
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-slate-700 pl-4 list-disc">
                          {analysis.lifestyleDietAdvice.foodsToLimit.map((food: string, i: number) => (
                            <li key={i}>{food}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Daily Habits */}
                    <div className="border border-slate-200 bg-slate-50/40 p-4 text-xs space-y-2.5">
                      <span className="font-bold text-slate-900 block text-xs">
                        Daily Preventive Habits
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        {analysis.lifestyleDietAdvice.lifestyleTips.map((rec: string, i: number) => (
                          <div key={i} className="bg-white p-3 border border-slate-200 text-[11px] text-slate-700">
                            <span className="font-mono text-[10px] font-bold block mb-1" style={{ color: themeColor }}>
                              0{i + 1}
                            </span>
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Legal & Clinical Disclaimer */}
                <div className="p-4 border border-slate-200 bg-slate-50/50 text-slate-600 space-y-2 mb-6">
                  <span className="font-bold text-slate-900 text-xs block">
                    Clinical Use &amp; Regulatory Disclaimer
                  </span>
                  <div
                    className="text-[10.5px] leading-relaxed space-y-1 text-slate-600 prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        smartSettings.disclaimerText ||
                        smartSettings.disclaimer ||
                        analysis.clinicalDisclaimer ||
                        ""
                      ),
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={`border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex justify-between items-center ${isInteriorPremium ? "border-double border-t-2" : ""}`}>
                <span>{smartSettings.footerText || "OnePath Diagnostic Laboratory"}</span>
                <span className="font-mono">Page {guidancePageNum} of {totalPages}</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
              OPTIONAL BACK COVER PAGE
          ───────────────────────────────────────────────────────────── */}
            {hasExterior && (
              <div
                className="smart-report-a4-page w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between overflow-hidden rounded-xl"
                style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
              >
                {smartSettings.exteriorDesign === "exterior-gradient" && (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(160deg, #0f172a 0%, ${themeColor} 140%)` }}
                    />
                    <div className="relative z-10 flex flex-col items-start justify-center h-full text-white px-16 gap-5">
                      <div className="h-1 w-16 bg-white/70" />
                      <h2 className="text-3xl font-bold tracking-tight">Thank You for Trusting Us</h2>
                      <p className="text-sm text-slate-200 max-w-md leading-relaxed">
                        Precision diagnostic analytics, quality-controlled laboratory methodology, and structured patient health dossiers.
                      </p>
                      <div className="border-t border-white/20 pt-5 mt-2 space-y-1 text-xs text-slate-200">
                        <p className="font-bold text-sm text-white">{smartSettings.labName || "OnePath Diagnostic Laboratory"}</p>
                        <p>{smartSettings.labAddress}</p>
                        {(smartSettings.email || smartSettings.emailAddress) && <p>{smartSettings.email || smartSettings.emailAddress}</p>}
                      </div>
                      {smartSettings.footerText && (
                        <p className="text-xs text-slate-300 mt-2">{smartSettings.footerText}</p>
                      )}
                    </div>
                    <div className="relative z-10 px-16 py-6 flex justify-between text-xs text-slate-300 border-t border-white/15">
                      <span>Official Clinical Report Dossier</span>
                      <span className="font-mono">Page {exteriorPageNum} of {totalPages}</span>
                    </div>
                  </>
                )}

                {smartSettings.exteriorDesign === "exterior-qr" && (
                  <div className="flex flex-col justify-between h-full p-14 text-center">
                    <div className="pt-6 border-b border-slate-200 pb-4">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">Verified Laboratory Document</span>
                      <h2 className="text-2xl font-bold text-slate-900">{smartSettings.labName || "OnePath Diagnostic Laboratory"}</h2>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4 my-auto">
                      <div className="p-6 bg-white border border-slate-300 rounded-xl flex flex-col items-center gap-3">
                        <QrCode className="h-32 w-32 text-slate-900" />
                        <span className="text-xs font-semibold text-slate-700">Scan to Verify Report Authenticity</span>
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                        Each laboratory report carries an encrypted record identifier for digital verification.
                      </p>
                    </div>

                    <div className="border-t border-slate-200 pt-5 space-y-1 text-xs text-slate-500">
                      <p className="font-semibold text-slate-800">{smartSettings.labAddress}</p>
                      <p>{smartSettings.email || smartSettings.emailAddress}</p>
                      {smartSettings.footerText && <p className="text-slate-400 text-[11px] pt-1">{smartSettings.footerText}</p>}
                      <p className="text-[10px] text-slate-400 font-mono pt-2">Page {exteriorPageNum} of {totalPages}</p>
                    </div>
                  </div>
                )}

                {smartSettings.exteriorDesign === "exterior-minimal" && (
                  <div className="flex flex-col justify-between h-full p-14">
                    <div className="pt-8">
                      <div className="h-1 w-14 mb-5" style={{ backgroundColor: themeColor }} />
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{smartSettings.labName || "OnePath Diagnostic Laboratory"}</h2>
                      <p className="text-xs text-slate-500 mt-1">Clinical Pathology &amp; Preventive Diagnostics</p>
                    </div>

                    <div className="space-y-4 my-auto max-w-md">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Thank you for choosing {smartSettings.labName || "OnePath Diagnostic Laboratory"} for your diagnostic evaluation. For clinical queries or test interpretation, please contact our pathology team.
                      </p>
                      <div className="p-4 bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">Laboratory Contact Details</span>
                        <p className="text-slate-600">{smartSettings.labAddress}</p>
                        <p className="text-slate-600">{smartSettings.email || smartSettings.emailAddress}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-5 flex justify-between items-center text-xs text-slate-500">
                      <span>{smartSettings.footerText || "OnePath Diagnostic Laboratory"}</span>
                      <span className="font-mono">Page {exteriorPageNum} of {totalPages}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          WHATSAPP NUMBER PROMPT MODAL
      ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={isPhonePromptOpen} onOpenChange={setIsPhonePromptOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[420px] p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">WhatsApp Number Required</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Enter patient&apos;s mobile number to send the AI Smart Report.
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
                  placeholder="9876543210"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-11 h-11 text-sm font-medium tracking-wide rounded-xl"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Enter 10-digit Indian mobile number</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="savePhoneSmart"
                checked={savePhoneToProfile}
                onCheckedChange={(c) => setSavePhoneToProfile(!!c)}
              />
              <label htmlFor="savePhoneSmart" className="text-xs text-muted-foreground cursor-pointer select-none">
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
              <span>Send AI Smart Report</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
