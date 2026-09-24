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
import {
  analyzeReportForSmartInsights,
  evaluateParamReference,
  type SmartReportAnalysis,
  type OrganHealthScore,
  type AbnormalParameterAnalysis,
} from "@/lib/smart-report-engine";
import { useReactToPrint } from "react-to-print";
import { getNativePdfBase64 } from "@/lib/pdf-report-downloader";

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

  // WhatsApp state
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isPhonePromptOpen, setIsPhonePromptOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [savePhoneToProfile, setSavePhoneToProfile] = useState(true);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Auto adjust zoom for viewport
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) setZoomScale(0.44);
      else if (window.innerWidth < 1200) setZoomScale(0.65);
      else setZoomScale(0.85);
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
              } catch {}
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
        } catch {}
      }
    },
    onAfterPrint: () => {
      toast.success("Ready", "Smart Report sent to print / Save as PDF.");
    },
  });

  const handleDownloadPdf = () => {
    handlePrint();
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
  const handleWhatsApp = async (overridePhone?: string) => {
    const rawTarget = overridePhone || customPhone || report?.patient?.phone || "";
    const cleanPhone = rawTarget.replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      setIsPhonePromptOpen(true);
      return;
    }

    setIsSendingWhatsApp(true);
    toast.info("Preparing WhatsApp", "Compiling smart clinical intelligence report...");

    try {
      let pdfBase64: string | null = null;
      if (reportContainerRef.current) {
        try {
          pdfBase64 = await getNativePdfBase64({
            printContainer: reportContainerRef.current,
            filename: `AI_SmartReport_${report?.customId || "Report"}.pdf`,
          });
        } catch {}
      }

      const res = await fetchFromLaravel(`/reports/${report.id}/send-whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          phone: cleanPhone,
          save_phone: savePhoneToProfile,
          message_type: "smart_report",
        }),
      });

      if (res?.status === "success" || res?.success) {
        toast.success("Sent on WhatsApp!", `AI Smart Report delivered to +91 ${cleanPhone} successfully!`);
      } else {
        openWhatsAppDirectLink(cleanPhone);
      }
    } catch (err: any) {
      console.warn("Backend WhatsApp dispatch failed, opening direct link:", err);
      openWhatsAppDirectLink(cleanPhone);
    } finally {
      setIsSendingWhatsApp(false);
    }
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
        {/* Glow backgrounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-600/30 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-[480px] p-8 rounded-3xl bg-zinc-900/95 border border-indigo-500/40 shadow-2xl text-center flex flex-col items-center overflow-hidden">
          {/* Top Shimmer Bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500 animate-pulse" />

          {/* AI Glowing Orb Animation */}
          <div className="relative mb-6 flex items-center justify-center">
            {/* Outer Pulsing Ring */}
            <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/25 via-indigo-500/20 to-purple-500/25 animate-ping opacity-60 pointer-events-none" />

            {/* Rotating Gradient Spinner */}
            <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 border-t-cyan-400 border-r-indigo-400 animate-spin" />

            {/* Inner Glowing Core */}
            <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Sparkles className="h-7 w-7 text-amber-300 animate-pulse" />
            </div>
          </div>

          {/* Heading & Details */}
          <div className="space-y-1.5 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>OnePath AI Clinical Intelligence</span>
            </div>

            <h3 className="text-xl font-extrabold text-white tracking-tight pt-1">
              Synthesizing Smart Report
            </h3>

            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Correlating biochemical parameters, calculating organ wellness matrix, and assembling multi-page visual lab dossier...
            </p>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full space-y-2 mb-4">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold">
              <span className="text-zinc-400">Clinical Synthesis</span>
              <span className="text-cyan-400 animate-pulse">Processing Biomarkers...</span>
            </div>

            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/60 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-pulse transition-all duration-300 shadow-sm shadow-cyan-400/50"
                style={{ width: "85%" }}
              />
            </div>
          </div>

          {/* Current Live Step */}
          <div className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center gap-2.5 text-left text-xs text-zinc-300 shadow-inner">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="truncate font-medium text-xs">
              Formulating clinical impressions &amp; multi-page diagnostic pages...
            </span>
          </div>
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
      return name !== "Report Template" && t.fieldType !== "Custom Editor";
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
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm no-print">
        
        {/* Left: Back & Patient Details */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9 px-3 rounded-xl border-border/80 hover:bg-muted text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="h-5 w-px bg-border hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-foreground leading-none">
                {patient.name || "Patient Report"}
              </h1>
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs"
                style={{
                  backgroundColor: `${themeColor}18`,
                  color: themeColor,
                }}
              >
                <Sparkles className="h-3 w-3" />
                <span>AI Smart Report</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              File: <span className="font-mono font-medium">{report.customId}</span> · {patient.age ? `${patient.age} Y` : ""} {patient.gender || ""}
            </p>
          </div>
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

        {/* Right: STRICTLY 2 BUTTONS (1. Send on WhatsApp, 2. Download PDF) */}
        <div className="flex items-center gap-2.5">
          {/* Action 1: Send on WhatsApp */}
          <Button
            type="button"
            onClick={() => handleWhatsApp()}
            disabled={isSendingWhatsApp}
            className="h-10 px-4 gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm rounded-xl transition-all"
          >
            {isSendingWhatsApp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Send on WhatsApp</span>
              </>
            )}
          </Button>

          {/* Action 2: Download PDF / Print (Approach 1) */}
          <Button
            type="button"
            onClick={() => handlePrint()}
            className="h-10 px-4 gap-2 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-md rounded-xl transition-all"
            title="Download PDF or Print (Ctrl+P)"
          >
            <Printer className="h-4 w-4" />
            <span>Download PDF / Print</span>
            <span className="text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded font-mono font-medium hidden sm:inline">
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
      <div className="flex justify-center items-start pt-6 sm:pt-8 px-2 sm:px-4 overflow-auto custom-scrollbar">
        <div
          ref={reportContainerRef}
          className="report-print-canvas flex flex-col items-center gap-8 origin-top transition-transform duration-200"
          style={{
            transform: `scale(${zoomScale})`,
            width: 794,
          }}
        >

          {/* ─────────────────────────────────────────────────────────────
              PAGE 1: SMART REPORT COVER PAGE
          ───────────────────────────────────────────────────────────── */}
          <div
            className="smart-report-a4-page w-[794px] h-[1123px] bg-white text-zinc-900 shadow-2xl relative flex flex-col justify-between overflow-hidden rounded-xl"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Design Accents based on coverDesign */}
            {isClassic && (
              <>
                <div
                  className="absolute top-12 right-12 text-6xl font-black select-none pointer-events-none opacity-20"
                  style={{ color: themeColor }}
                >
                  +
                </div>
                <div
                  className="absolute top-44 left-10 text-5xl font-black select-none pointer-events-none opacity-20"
                  style={{ color: themeColor }}
                >
                  +
                </div>
                <div
                  className="absolute bottom-48 right-16 text-7xl font-black select-none pointer-events-none opacity-15"
                  style={{ color: themeColor }}
                >
                  +
                </div>
              </>
            )}

            {isModern && (
              <div
                className="absolute top-0 right-0 w-[460px] h-[460px] rounded-bl-full opacity-10 pointer-events-none"
                style={{ backgroundColor: themeColor }}
              />
            )}

            {isTech && (
              <div className="absolute top-0 left-0 right-0 h-3" style={{ backgroundColor: themeColor }} />
            )}

            {isWellness && (
              <div
                className="absolute top-0 left-0 right-0 h-32 opacity-15"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}, transparent)`,
                }}
              />
            )}

            {isGradient && (
              <div
                className="absolute top-0 left-0 right-0 h-72 opacity-15 pointer-events-none"
                style={{ background: `linear-gradient(180deg, ${themeColor}, transparent)` }}
              />
            )}

            {isMinimal && (
              <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: themeColor }} />
            )}

            {/* Header: Lab Logo & AI Tag */}
            <div className="pt-10 px-12 flex items-center justify-between z-10">
              {smartSettings.showLogo && smartSettings.logoUrl ? (
                <img
                  src={smartSettings.logoUrl}
                  alt="Lab Logo"
                  className="h-14 max-w-[280px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-xs"
                    style={{ backgroundColor: themeColor }}
                  >
                    +
                  </div>
                  <div>
                    <span className="font-extrabold text-base tracking-wide text-zinc-900 block leading-tight">
                      {smartSettings.labName || "ONEPATH LABORATORY"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">Diagnostic &amp; Pathology Intelligence</span>
                  </div>
                </div>
              )}

              {(smartSettings.aiGeneratedTag || smartSettings.showAiTag) && (
                <div
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border tracking-wide uppercase shadow-2xs"
                  style={{
                    backgroundColor: `${themeColor}12`,
                    borderColor: `${themeColor}40`,
                    color: themeColor,
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Powered Health Intelligence</span>
                </div>
              )}
            </div>

            {/* Center Content: Title, Doctor Graphic, Patient Info */}
            <div className="my-auto px-12 text-center flex flex-col items-center z-10 space-y-6">
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-[0.25em] block mb-2"
                  style={{ color: themeColor }}
                >
                  Advanced Diagnostic Evaluation
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                  SMART<br />HEALTH REPORT
                </h1>
              </div>

              {/* Template Doctor / Diagnostic Visual Art */}
              <div className="relative my-3">
                {isClassic ? (
                  <div className="relative">
                    <div
                      className="absolute -inset-4 opacity-15 rounded-3xl"
                      style={{ backgroundColor: themeColor }}
                    />
                    <div className="w-60 h-68 mx-auto rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative shadow-md">
                      <Stethoscope
                        className="h-24 w-24 opacity-30 stroke-[1.5]"
                        style={{ color: themeColor }}
                      />
                      <div className="absolute bottom-4 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-bold text-zinc-800 shadow-2xs flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Verified Pathologist Review</span>
                      </div>
                    </div>
                  </div>
                ) : isModern ? (
                  <div className="w-60 h-64 mx-auto rounded-3xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-50 to-white shadow-xs">
                    <Activity className="h-20 w-20 mb-2" style={{ color: themeColor }} />
                    <span className="text-sm font-bold text-zinc-800">Biomarker Analytics Matrix</span>
                    <span className="text-xs text-zinc-500 mt-1">Multi-Organ Health Profiling</span>
                  </div>
                ) : isTech ? (
                  <div className="w-68 h-60 mx-auto rounded-2xl bg-zinc-900 text-white p-6 flex flex-col justify-between text-left shadow-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-sky-400">HIGH-TECH DIAGNOSTIC MATRIX</span>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-xl font-bold block">Biochemical Profiling</span>
                      <span className="text-xs text-zinc-400">Cellular Biomarker Health Evaluation</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full w-4/5 rounded-full" style={{ backgroundColor: themeColor }} />
                    </div>
                  </div>
                ) : isWellness ? (
                  <div className="w-64 h-60 mx-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-md flex flex-col items-center justify-center text-center">
                    <HeartPulse className="h-20 w-20 mb-2" style={{ color: themeColor }} />
                    <span className="text-base font-bold text-zinc-800">Preventive Wellness Index</span>
                    <span className="text-xs text-zinc-500 mt-1">Holistic Health Biomarkers</span>
                  </div>
                ) : isGradient ? (
                  <div
                    className="w-64 h-60 mx-auto rounded-3xl flex flex-col items-center justify-center text-white shadow-xl p-6"
                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
                  >
                    <Sparkles className="h-16 w-16 mb-3 opacity-90" />
                    <span className="font-black text-xl tracking-wide">Health Intelligence</span>
                    <span className="text-xs opacity-80 mt-1">AI-Powered Precision Diagnostics</span>
                  </div>
                ) : (
                  <div className="w-64 h-56 mx-auto rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between text-left">
                    <div className="flex gap-2 items-center">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                      <span className="text-xs font-bold text-zinc-700">Minimalist Clinical Report</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="h-1 bg-zinc-100 rounded w-full" />
                      <div className="h-1 bg-zinc-100 rounded w-5/6" />
                      <div className="h-1 bg-zinc-100 rounded w-2/3" />
                    </div>
                    <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: themeColor }} />
                  </div>
                )}
              </div>

              {/* Patient Information Box */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 w-full max-w-lg text-left shadow-2xs">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Patient Name</span>
                    <span className="font-extrabold text-zinc-800 text-base">{patient.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Patient ID / File</span>
                    <span className="font-mono font-bold text-zinc-800 text-sm">{report.customId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Age / Gender</span>
                    <span className="font-semibold text-zinc-700">{patient.age ? `${patient.age} Y` : "N/A"} / {patient.gender || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Report Date</span>
                    <span className="font-semibold text-zinc-700">
                      {new Date(report.reportDate || report.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {patient.refDoctor && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Referred By</span>
                      <span className="font-semibold text-zinc-700">{patient.refDoctor}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: Lab Branding & Address */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/70 text-center text-xs space-y-1.5 z-10">
              <p className="font-extrabold text-zinc-800 tracking-wide uppercase text-sm">
                {smartSettings.labName || "ONEPATH LABORATORY"}
              </p>
              <p className="text-zinc-500 text-xs max-w-lg mx-auto">
                {smartSettings.labAddress || "Main Bazar, Connaught Place, New Delhi"}
              </p>
              {(smartSettings.email || smartSettings.emailAddress) && (
                <p className="font-semibold text-xs" style={{ color: themeColor }}>
                  {smartSettings.email || smartSettings.emailAddress}
                </p>
              )}
              {smartSettings.footerText && (
                <p className="text-[10.5px] text-zinc-400 italic pt-1">
                  {smartSettings.footerText}
                </p>
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PAGE 2: EXECUTIVE SUMMARY & ORGAN HEALTH MATRIX
          ───────────────────────────────────────────────────────────── */}
          <div
            className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-zinc-900 shadow-2xl relative p-10 flex flex-col justify-between rounded-xl ${
              isInteriorAccent ? "border-l-[8px]" : ""
            }`}
            style={{
              fontFamily: "'Inter', sans-serif",
              borderColor: isInteriorAccent ? themeColor : undefined,
            }}
          >
            <div>
              {/* Lab Mini Header */}
              <div
                className={`flex items-center justify-between pb-4 mb-5 ${
                  isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                }`}
                style={{ borderColor: themeColor }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {isInteriorPremium && (
                      <span className="h-5 w-1 rounded-full" style={{ backgroundColor: themeColor }} />
                    )}
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                      {smartSettings.labName || "ONEPATH LABORATORY"}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{smartSettings.labAddress}</p>
                </div>
                <div className="text-right text-xs text-zinc-600">
                  <span className="font-bold text-zinc-800 block">AI Smart Health Summary</span>
                  <span>{smartSettings.email || smartSettings.emailAddress}</span>
                </div>
              </div>

              {/* Patient Banner */}
              <div
                className={`flex justify-between items-center text-xs mb-6 ${
                  isInteriorCard
                    ? "bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 shadow-xs"
                    : isInteriorPremium
                    ? "bg-amber-50/30 border-y border-amber-200/60 p-3.5"
                    : "bg-slate-50 border border-slate-200 rounded-xl p-3.5"
                }`}
              >
                <div>
                  <span className="font-extrabold text-zinc-900 text-sm">{patient.name || "Patient"}</span>
                  <span className="text-zinc-500 ml-2">
                    {patient.age ? `${patient.age} Y` : ""} / {patient.gender || ""} {patient.refDoctor ? `· Ref: ${patient.refDoctor}` : ""}
                  </span>
                </div>
                <div className="font-mono text-xs font-semibold text-zinc-700">
                  ID: {report.customId} · {new Date().toLocaleDateString("en-IN")}
                </div>
              </div>

              {/* Executive Summary */}
              {smartSettings.showExecutiveSummary && (
                <div
                  className={`p-5 mb-6 text-xs ${
                    isInteriorCard
                      ? "rounded-2xl border shadow-xs"
                      : isInteriorPremium
                      ? "rounded-xl border-l-4"
                      : "rounded-2xl border"
                  }`}
                  style={{
                    backgroundColor: `${themeColor}08`,
                    borderColor: `${themeColor}35`,
                    borderLeftColor: isInteriorPremium ? themeColor : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="h-4 w-4" style={{ color: themeColor }} />
                    <h3 className="font-extrabold text-sm text-zinc-900 tracking-tight">
                      Executive Clinical Summary
                    </h3>
                  </div>

                  <div className="space-y-2 text-zinc-700 text-xs leading-relaxed">
                    {analysis.executiveSummary.map((paragraph: string, idx: number) => (
                      <p key={idx} className="text-zinc-700 leading-relaxed text-[11.5px]">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Overall Health Vitality Banner */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-700">Overall Physiological Health Index:</span>
                      <span
                        className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${themeColor}15`,
                          color: themeColor,
                        }}
                      >
                        {analysis.overallStatusLabel}
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-zinc-800">
                      Score: <span className="text-sm font-black" style={{ color: themeColor }}>{analysis.overallHealthScore}</span> / 100
                    </div>
                  </div>
                </div>
              )}

              {/* Organ Health Gauges */}
              {(smartSettings.showOrganHealth || smartSettings.showOrganHealthGauges) && (
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                      <Activity className="h-4 w-4" style={{ color: themeColor }} />
                      <span>Organ Health Systems Scorecard</span>
                    </h3>
                    <span className="text-[10.5px] font-mono text-zinc-400">Biological Score (0 - 100)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {analysis.organScores.map((org: OrganHealthScore) => {
                      const badgeColor = org.color || "#10b981";

                      return (
                        <div
                          key={org.id}
                          className={`p-3.5 flex flex-col justify-between ${
                            isInteriorCard
                              ? "border border-slate-200/90 rounded-2xl bg-white shadow-2xs"
                              : "border border-slate-200 rounded-xl bg-slate-50/60 shadow-2xs"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-xs font-bold text-zinc-800 line-clamp-1">{org.name}</span>
                              <span
                                className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-sm shrink-0 uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${badgeColor}18`,
                                  color: badgeColor,
                                }}
                              >
                                {org.statusLabel}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{org.summary}</p>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="text-2xl font-black text-zinc-900">{org.score}</span>
                              <span className="text-[10px] font-mono text-zinc-400">/ 100</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${org.score}%`,
                                  backgroundColor: badgeColor,
                                }}
                              />
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
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 mb-4">
                  <Stethoscope className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-xs">Recommended Specialist Review:</span>
                    <span className="text-[11.5px] text-amber-800/90 leading-snug">
                      Based on your biological parameters, consultation with a <strong>{analysis.recommendedSpecialist}</strong> is advised for comprehensive clinical correlation.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Page 2 Footer */}
            <div className={`border-t pt-3 text-[10px] text-zinc-400 flex justify-between items-center ${isInteriorPremium ? "border-double border-t-2" : ""}`}>
              <span>{smartSettings.footerText || "OnePath Pathology Laboratory"}</span>
              <span className="font-mono">Page 2 of {totalPages}</span>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PAGES 3+: COMPLETE DIAGNOSTIC INVESTIGATION RESULTS TABLE
          ───────────────────────────────────────────────────────────── */}
          {resultPages.map((pageResults, pageIdx) => {
            const pageNum = 3 + pageIdx;

            return (
              <div
                key={`result-page-${pageIdx}`}
                className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-zinc-900 shadow-2xl relative p-10 flex flex-col justify-between rounded-xl overflow-hidden ${
                  isInteriorAccent ? "border-l-[8px]" : ""
                }`}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  borderColor: isInteriorAccent ? themeColor : undefined,
                }}
              >
                <div>
                  {/* Lab Mini Header */}
                  <div
                    className={`flex items-center justify-between pb-3.5 mb-4 ${
                      isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                    }`}
                    style={{ borderColor: themeColor }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {isInteriorPremium && (
                          <span className="h-5 w-1 rounded-full" style={{ backgroundColor: themeColor }} />
                        )}
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                          {smartSettings.labName || "ONEPATH LABORATORY"}
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{smartSettings.labAddress}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-600">
                      <span className="font-bold text-zinc-800 block">Diagnostic Investigations</span>
                      <span>{patient.name} · {report.customId}</span>
                    </div>
                  </div>

                  {/* Patient Demographics Strip */}
                  <div
                    className={`flex justify-between items-center text-xs mb-4 ${
                      isInteriorCard
                        ? "bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 shadow-xs"
                        : isInteriorPremium
                        ? "bg-amber-50/30 border-y border-amber-200/60 p-2.5"
                        : "bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    }`}
                  >
                    <div>
                      <span className="font-extrabold text-zinc-900 text-sm">{patient.name || "Patient"}</span>
                      <span className="text-zinc-500 ml-2">
                        {patient.age ? `${patient.age} Y` : ""} / {patient.gender || ""} {patient.refDoctor ? `· Ref: ${patient.refDoctor}` : ""}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-zinc-700">
                      File {report.customId} · {new Date().toLocaleDateString("en-IN")}
                    </div>
                  </div>

                  {/* Section Heading Banner */}
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" style={{ color: themeColor }} />
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                        Laboratory Investigation Parameters &amp; Quantitative Values
                      </h3>
                    </div>
                    <span className="text-[10.5px] font-mono text-zinc-500 font-semibold">
                      Page {pageIdx + 1} of {resultPages.length} (Results)
                    </span>
                  </div>

                  {/* Diagnostic Results Table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: "38%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "14%" }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-black uppercase text-zinc-700 tracking-wider">
                          <th className="py-2.5 px-3">Investigation / Biomarker</th>
                          <th className="py-2.5 px-3 text-center">Observed Result</th>
                          <th className="py-2.5 px-3">Reference Interval</th>
                          <th className="py-2.5 px-2.5 text-center">Unit</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pageResults.map((item: any, rIdx: number) => {
                          const isHigh = item.flag === "HIGH";
                          const isLow = item.flag === "LOW";

                          return (
                            <tr
                              key={item.id || rIdx}
                              className={`transition-colors ${
                                isHigh
                                  ? "bg-rose-50/50"
                                  : isLow
                                  ? "bg-amber-50/50"
                                  : rIdx % 2 === 1
                                  ? "bg-slate-50/60"
                                  : "bg-white"
                              }`}
                            >
                              <td className="py-2.5 px-3 font-semibold text-zinc-900">
                                <div className="flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {item.category && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-zinc-500 font-normal">
                                      {item.category}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-zinc-900">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold ${
                                    isHigh
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : isLow
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "text-zinc-900"
                                  }`}
                                >
                                  {item.result}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600">
                                {item.refRange}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-zinc-500">
                                {item.unit || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isHigh ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    ▲ High
                                  </span>
                                ) : isLow ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    ▼ Low
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3" /> Normal
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Page Footer */}
                <div
                  className={`border-t pt-3 text-[10px] text-zinc-400 flex justify-between items-center ${
                    isInteriorPremium ? "border-double border-t-2" : ""
                  }`}
                >
                  <span>{smartSettings.footerText || "OnePath Pathology Laboratory · Official Diagnostic Results"}</span>
                  <span className="font-mono">
                    Page {pageNum} of {totalPages}
                  </span>
                </div>
              </div>
            );
          })}

          {/* ─────────────────────────────────────────────────────────────
              BIOMARKER INTELLIGENCE & ABNORMAL DEEP DIVE (PAGINATED MAX 3 CARDS PER PAGE)
          ───────────────────────────────────────────────────────────── */}
          {abnormalPages.map((pageCards, pageIdx) => {
            const currentAbnormalPageNum = biomarkerStartPage + pageIdx;
            const isLastAbnormalPage = pageIdx === abnormalPages.length - 1;

            return (
              <div
                key={`abnormal-page-${pageIdx}`}
                className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-zinc-900 shadow-2xl relative p-10 flex flex-col justify-between rounded-xl overflow-hidden ${
                  isInteriorAccent ? "border-l-[8px]" : ""
                }`}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  borderColor: isInteriorAccent ? themeColor : undefined,
                }}
              >
                <div>
                  {/* Lab Mini Header */}
                  <div
                    className={`flex items-center justify-between pb-4 mb-4 ${
                      isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                    }`}
                    style={{ borderColor: themeColor }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {isInteriorPremium && (
                          <span className="h-5 w-1 rounded-full" style={{ backgroundColor: themeColor }} />
                        )}
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                          {smartSettings.labName || "ONEPATH LABORATORY"}
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{smartSettings.labAddress}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-600">
                      <span className="font-bold text-zinc-800 block">Biomarker Deep-Dive</span>
                      <span>{patient.name} · {report.customId}</span>
                    </div>
                  </div>

                  {/* Header Status Legend */}
                  <div className="flex items-center justify-between border-b pb-2 mb-3.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                        Detailed Parameter Health Insights
                      </h3>
                      {abnormalPages.length > 1 && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-zinc-600">
                          Part {pageIdx + 1} of {abnormalPages.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Normal
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Borderline
                      </span>
                      <span className="flex items-center gap-1 text-rose-600">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> Abnormal / Action
                      </span>
                    </div>
                  </div>

                  {/* Abnormal & Borderline Deep-Dive Cards (Strictly Max 3 per page) */}
                  <div className="space-y-3 mb-4">
                    {pageCards.length > 0 ? (
                      pageCards.map((param: AbnormalParameterAnalysis) => {
                        const isRed = param.flag === "HIGH" || param.flag === "LOW";
                        const statusColor = isRed ? "#e11d48" : "#f59e0b";

                        return (
                          <div
                            key={param.id}
                            className={`p-3.5 bg-white space-y-2 ${
                              isInteriorCard
                                ? "rounded-2xl border shadow-xs"
                                : "rounded-xl border shadow-2xs"
                            }`}
                            style={{
                              borderColor: isRed ? "#fecdd3" : "#fef3c7",
                            }}
                          >
                            {/* Title Bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: statusColor }}
                                />
                                <div>
                                  <span className="font-bold text-xs text-zinc-900 block leading-tight">{param.name}</span>
                                  <span className="text-[10px] text-zinc-400 font-medium">{param.organ}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-zinc-800">
                                  {param.result} {param.unit}
                                </span>
                                <span
                                  className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-sm border uppercase"
                                  style={{
                                    backgroundColor: `${statusColor}14`,
                                    borderColor: `${statusColor}40`,
                                    color: statusColor,
                                  }}
                                >
                                  {param.flag}
                                </span>
                              </div>
                            </div>

                            {/* Reference Range Bar */}
                            <div className="text-[10.5px] text-zinc-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                              <span>
                                Biological Reference Interval: <strong>{param.referenceRange}</strong>
                              </span>
                              <span className="italic text-zinc-500 text-[10px]">
                                {param.flag === "HIGH" ? "Elevated above normal limits" : "Decreased below optimal range"}
                              </span>
                            </div>

                            {/* Reasons & Impact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-0.5">
                              <div className="pl-3 border-l-2" style={{ borderColor: statusColor }}>
                                <span className="font-bold text-zinc-800 text-[10.5px] block">Common Root Causes:</span>
                                <p className="text-zinc-600 text-[10.5px] leading-snug mt-0.5">
                                  {param.commonReasons?.join(", ") || "Clinical variation requiring dietary or medical assessment."}
                                </p>
                              </div>
                              <div className="pl-3 border-l-2 border-slate-300">
                                <span className="font-bold text-zinc-800 text-[10.5px] block">Impact On Body:</span>
                                <p className="text-zinc-600 text-[10.5px] leading-snug mt-0.5">
                                  {param.impactOnBody}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                        <h4 className="font-bold text-sm text-emerald-900">All Biomarkers Within Reference Limits!</h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          No parameters were flagged as abnormal or requiring acute clinical intervention in this test battery.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Normal Parameters Count Summary (Rendered on last abnormal page) */}
                  {isLastAbnormalPage && analysis.totalNormal > 0 && (
                    <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-[11.5px]">
                          {analysis.totalNormal} parameters within healthy standard biological ranges
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-700">
                        {Math.round((analysis.totalNormal / analysis.totalTested) * 100)}% Normal
                      </span>
                    </div>
                  )}
                </div>

                {/* Biomarker Deep-Dive Footer */}
                <div className={`border-t pt-3 text-[10px] text-zinc-400 flex justify-between items-center ${isInteriorPremium ? "border-double border-t-2" : ""}`}>
                  <span>{smartSettings.footerText || "OnePath Pathology Laboratory"}</span>
                  <span className="font-mono">Page {currentAbnormalPageNum} of {totalPages}</span>
                </div>
              </div>
            );
          })}

          {/* ─────────────────────────────────────────────────────────────
              PAGE 4: PERSONALIZED DIET, LIFESTYLE & CLINICAL DISCLAIMER
          ───────────────────────────────────────────────────────────── */}
          <div
            className={`smart-report-a4-page w-[794px] h-[1123px] bg-white text-zinc-900 shadow-2xl relative p-10 flex flex-col justify-between rounded-xl ${
              isInteriorAccent ? "border-l-[8px]" : ""
            }`}
            style={{
              fontFamily: "'Inter', sans-serif",
              borderColor: isInteriorAccent ? themeColor : undefined,
            }}
          >
            <div>
              {/* Lab Mini Header */}
              <div
                className={`flex items-center justify-between pb-4 mb-5 ${
                  isInteriorPremium ? "border-b-4 border-double" : "border-b-2"
                }`}
                style={{ borderColor: themeColor }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {isInteriorPremium && (
                      <span className="h-5 w-1 rounded-full" style={{ backgroundColor: themeColor }} />
                    )}
                    <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                      {smartSettings.labName || "ONEPATH LABORATORY"}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{smartSettings.labAddress}</p>
                </div>
                <div className="text-right text-xs text-zinc-600">
                  <span className="font-bold text-zinc-800 block">Personalized Nutrition &amp; Wellness</span>
                  <span>{smartSettings.email || smartSettings.emailAddress}</span>
                </div>
              </div>

              {/* Diet & Lifestyle Guidance */}
              {(smartSettings.showDietTips || smartSettings.showDietLifestyleTips) && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Apple className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-extrabold text-sm text-zinc-900">
                      Personalized Nutrition &amp; Lifestyle Plan
                    </h3>
                  </div>

                  {/* Dietary Recommendations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Foods to Include */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 text-xs space-y-2">
                      <span className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Foods to Prioritize &amp; Add</span>
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-zinc-700 pl-4 list-disc">
                        {analysis.lifestyleDietAdvice.foodsToInclude.map((food: string, i: number) => (
                          <li key={i}>{food}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Foods to Limit */}
                    <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 text-xs space-y-2">
                      <span className="font-extrabold text-rose-900 flex items-center gap-1.5 text-xs">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Foods to Moderate &amp; Avoid</span>
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-zinc-700 pl-4 list-disc">
                        {analysis.lifestyleDietAdvice.foodsToLimit.map((food: string, i: number) => (
                          <li key={i}>{food}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Lifestyle Habits */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                    <span className="font-extrabold text-zinc-800 flex items-center gap-1.5 text-xs">
                      <HeartPulse className="h-3.5 w-3.5" style={{ color: themeColor }} />
                      <span>Recommended Daily Physical Habits &amp; Wellness</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {analysis.lifestyleDietAdvice.lifestyleTips.map((rec: string, i: number) => (
                        <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200/70 text-[11px] text-zinc-700">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Legal & Clinical Disclaimer */}
              <div
                className={`p-4 text-zinc-600 space-y-2 mb-6 ${
                  isInteriorCard
                    ? "bg-slate-50/90 border border-slate-200/90 rounded-2xl shadow-xs"
                    : "bg-slate-50 border border-slate-200/90 rounded-xl"
                }`}
              >
                <span className="font-bold text-zinc-800 text-xs block uppercase tracking-wider">
                  Clinical Use &amp; Regulatory Disclaimer
                </span>
                <div
                  className="text-[10px] leading-relaxed space-y-1 text-zinc-600 prose prose-xs max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      smartSettings.disclaimerText ||
                      smartSettings.disclaimer ||
                      analysis.clinicalDisclaimer ||
                      "",
                  }}
                />
              </div>
            </div>

            {/* Nutrition & Disclaimer Footer */}
            <div className={`border-t pt-3 text-[10px] text-zinc-400 flex justify-between items-center ${isInteriorPremium ? "border-double border-t-2" : ""}`}>
              <span>{smartSettings.footerText || "OnePath Pathology Laboratory"}</span>
              <span className="font-mono">Page {guidancePageNum} of {totalPages}</span>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PAGE 5: OPTIONAL BACK COVER / EXTERIOR DESIGN
          ───────────────────────────────────────────────────────────── */}
          {hasExterior && (
            <div
              className="smart-report-a4-page w-[794px] h-[1123px] bg-white text-zinc-900 shadow-2xl relative flex flex-col justify-between overflow-hidden rounded-xl"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {smartSettings.exteriorDesign === "exterior-gradient" && (
                <>
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${themeColor}, #1e1b4b)` }} />
                  <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-16 gap-6">
                    <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight">Thank You</h2>
                    <p className="text-lg opacity-90 font-medium max-w-md">Your Health &amp; Precision Diagnostics Are Our Highest Priority</p>
                    <div className="w-24 h-1 bg-white/40 rounded-full my-2" />
                    <div className="space-y-1 text-sm opacity-80">
                      <p className="font-bold text-base text-white">{smartSettings.labName || "OnePath Laboratory"}</p>
                      <p>{smartSettings.labAddress}</p>
                      {(smartSettings.email || smartSettings.emailAddress) && <p>{smartSettings.email || smartSettings.emailAddress}</p>}
                    </div>
                    {smartSettings.footerText && (
                      <p className="text-xs opacity-60 italic max-w-sm mt-4 border-t border-white/20 pt-4">
                        {smartSettings.footerText}
                      </p>
                    )}
                  </div>
                  <div className="relative z-10 p-6 text-center text-xs text-white/50 border-t border-white/10">
                    Page {exteriorPageNum} of {totalPages} · Official Diagnostic Document
                  </div>
                </>
              )}

              {smartSettings.exteriorDesign === "exterior-qr" && (
                <div className="flex flex-col justify-between h-full p-16 text-center">
                  <div className="pt-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 block mb-1">Authentic Laboratory Record</span>
                    <h2 className="text-2xl font-black text-zinc-900">{smartSettings.labName || "OnePath Laboratory"}</h2>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-5 my-auto">
                    <div className="p-6 bg-slate-50 border-2 rounded-3xl shadow-sm flex flex-col items-center gap-3" style={{ borderColor: themeColor }}>
                      <QrCode className="h-32 w-32" style={{ color: themeColor }} />
                      <span className="text-xs font-bold text-zinc-700">Scan to Verify Report Authenticity</span>
                    </div>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      Each diagnostic report contains an encrypted cryptographic hash verifying the authenticity of laboratory results.
                    </p>
                  </div>

                  <div className="border-t pt-6 space-y-1.5 text-xs text-zinc-500">
                    <p className="font-bold text-zinc-800">{smartSettings.labAddress}</p>
                    <p>{smartSettings.email || smartSettings.emailAddress}</p>
                    {smartSettings.footerText && <p className="text-zinc-400 italic text-[11px] pt-1">{smartSettings.footerText}</p>}
                    <p className="text-[10px] text-zinc-400 font-mono pt-2">Page {exteriorPageNum} of {totalPages}</p>
                  </div>
                </div>
              )}

              {smartSettings.exteriorDesign === "exterior-minimal" && (
                <div className="flex flex-col justify-between h-full p-16">
                  <div className="pt-8">
                    <div className="h-1.5 w-16 rounded-full mb-6" style={{ backgroundColor: themeColor }} />
                    <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{smartSettings.labName || "ONEPATH LABORATORY"}</h2>
                    <p className="text-xs text-zinc-500 mt-1">Quality Healthcare &amp; Clinical Pathology</p>
                  </div>

                  <div className="space-y-4 my-auto max-w-md">
                    <p className="text-sm text-zinc-700 leading-relaxed">
                      Thank you for choosing {smartSettings.labName || "OnePath Laboratory"} for your diagnostic evaluation. For any clinical queries, second opinions, or test interpretation, please reach out to our team of consultant pathologists.
                    </p>
                    <div className="p-4 bg-slate-50 border rounded-xl text-xs space-y-1">
                      <span className="font-bold text-zinc-800 block">Laboratory Contact &amp; Support:</span>
                      <p className="text-zinc-600">{smartSettings.labAddress}</p>
                      <p className="text-zinc-600">{smartSettings.email || smartSettings.emailAddress}</p>
                    </div>
                  </div>

                  <div className="border-t pt-6 flex justify-between items-center text-xs text-zinc-400">
                    <span>{smartSettings.footerText || "OnePath AI Diagnostics"}</span>
                    <span className="font-mono">Page {exteriorPageNum} of {totalPages}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          WHATSAPP NUMBER PROMPT MODAL
      ═════════════════════════════════════════════════════════════════ */}
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
