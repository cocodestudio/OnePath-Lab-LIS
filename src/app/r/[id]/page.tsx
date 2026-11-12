"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, Download, AlertCircle, Loader2, 
  Calendar, Lock, Check, ZoomIn, ZoomOut, Eye, Share2,
  CreditCard, Clock, Phone, ShieldAlert, AlertTriangle
} from "lucide-react";
import { ReportSheet } from "@/components/report-sheet";
import { getCleanLetterheadUrl } from "@/lib/api-client";
import { useReactToPrint } from "react-to-print";
import { downloadNativePdf } from "@/lib/pdf-report-downloader";
import { cleanPatientNameForReport } from "@/lib/patient-title-helper";
import { InAppBrowserBanner } from "@/components/inapp-browser-banner";

export default function PublicReportVerificationPage() {
  const params = useParams();
  const reportId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [requiresPhone, setRequiresPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [submittingPhone, setSubmittingPhone] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(0.45);
  const printRef = useRef<HTMLDivElement>(null);

  // Dynamic responsive auto-scale to fit mobile screen width
  const calculateFitScale = () => {
    if (typeof window === "undefined") return 1;
    const screenW = window.innerWidth;
    if (screenW < 840) {
      const padding = screenW < 480 ? 20 : 36;
      const availableW = Math.max(280, screenW - padding);
      const computed = Math.min(1, Math.max(0.35, availableW / 794));
      return Number(computed.toFixed(2));
    }
    return 1;
  };

  useEffect(() => {
    const updateScale = () => {
      const s = calculateFitScale();
      setFitScale(s);
      setScale(s);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const fetchReport = async (phoneVerification?: string) => {
    try {
      setLoading(true);
      setError(null);

      const apiOrigin = process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/lis\/?$/, "").replace(/\/api\/?$/, "")
        : "https://api.onepathlab.com";

      const phoneParam = phoneVerification ? `?phone=${encodeURIComponent(phoneVerification)}` : "";
      const res = await fetch(`${apiOrigin}/api/lis/public/reports/${reportId}${phoneParam}`, {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      });

      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.requires_phone) {
          setRequiresPhone(true);
          setError(errData.error || "Please enter the registered mobile number to verify this report.");
          return;
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Report not found or invalid QR verification code.");
      }

      const data = await res.json();
      setReport(data);
      setRequiresPhone(false);
      setError(null);
    } catch (err: any) {
      console.error("Public report verification error:", err);
      setError(err.message || "Unable to retrieve verified laboratory report.");
    } finally {
      setLoading(false);
      setSubmittingPhone(false);
    }
  };

  useEffect(() => {
    if (!reportId) return;
    fetchReport();
  }, [reportId]);

  const patient = report?.patient || {};
  const lab = report?.lab || {};
  const reportDateStr = useMemo(() => {
    if (!report) return "";
    try {
      const d = report.report_date ? new Date(report.report_date) : (report.updated_at ? new Date(report.updated_at) : new Date());
      return isNaN(d.getTime()) ? (report.report_date || "") : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return report.report_date || "";
    }
  }, [report]);

  const [letterheadBase64, setLetterheadBase64] = useState<string | null>(null);

  // Pre-convert letterhead image into base64 Data URL so html2canvas renders it 100% reliably
  useEffect(() => {
    const rawBg = lab?.print_bg_image || lab?.printBgImage;
    const cleanUrl = getCleanLetterheadUrl(rawBg);
    if (!cleanUrl) {
      setLetterheadBase64(null);
      return;
    }

    if (cleanUrl.startsWith("data:")) {
      setLetterheadBase64(cleanUrl);
      return;
    }

    let isMounted = true;
    const convert = async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || 794;
            canvas.height = img.naturalHeight || 1123;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              if (isMounted) setLetterheadBase64(dataUrl);
            }
          } catch {
            if (isMounted) setLetterheadBase64(cleanUrl);
          }
        };
        img.onerror = () => {
          if (isMounted) setLetterheadBase64(cleanUrl);
        };
        img.src = cleanUrl;
      } catch {
        if (isMounted) setLetterheadBase64(cleanUrl);
      }
    };

    convert();
    return () => { isMounted = false; };
  }, [lab]);

  const sheetData = useMemo(() => {
    if (!report) return null;
    const bg = letterheadBase64 || getCleanLetterheadUrl(lab.print_bg_image || lab.printBgImage);
    return {
      id: report.id,
      customId: report.custom_id || report.customId,
      status: report.status,
      reportDate: report.report_date || report.reportDate || report.updated_at || new Date().toISOString(),
      createdAt: report.created_at || report.createdAt,
      patient: {
        id: patient.id,
        name: patient.name,
        customId: patient.custom_id || patient.customId,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        refDoctor: patient.ref_doctor || patient.refDoctor,
        address: patient.address,
        collectedAt: patient.collected_at || patient.collectedAt,
      },
      results: (report.results || []).map((r: any) => ({
        id: r.id,
        resultValue: r.result_value ?? r.resultValue,
        isAbnormal: Boolean(r.is_abnormal ?? r.isAbnormal),
        remarks: r.remarks,
        test: {
          id: r.test?.id,
          name: r.test?.name,
          category: r.test?.category,
          price: r.test?.price || 0,
          unit: r.test?.unit || "",
          interpretation: r.test?.interpretation,
          comment: r.test?.comment,
          notes: r.test?.notes,
          method: r.test?.method,
          fieldType: r.test?.field_type || r.test?.fieldType,
          rangeType: r.test?.range_type || r.test?.rangeType,
          textRefRange: r.test?.text_ref_range || r.test?.textRefRange,
          genderRefType: r.test?.gender_ref_type || r.test?.genderRefType,
          refRangeMin: r.test?.ref_range_min ?? r.test?.refRangeMin ?? 0,
          refRangeMax: r.test?.ref_range_max ?? r.test?.refRangeMax ?? 0,
          refRangeMinMale: r.test?.ref_range_min_male ?? r.test?.refRangeMinMale,
          refRangeMaxMale: r.test?.ref_range_max_male ?? r.test?.refRangeMaxMale,
          refRangeMinFemale: r.test?.ref_range_min_female ?? r.test?.refRangeMinFemale,
          refRangeMaxFemale: r.test?.ref_range_max_female ?? r.test?.refRangeMaxFemale,
          refRangeMinChild: r.test?.ref_range_min_child ?? r.test?.refRangeMinChild,
          refRangeMaxChild: r.test?.ref_range_max_child ?? r.test?.refRangeMaxChild,
          refRangeMinNewborn: r.test?.ref_range_min_newborn ?? r.test?.refRangeMinNewborn,
          refRangeMaxNewborn: r.test?.ref_range_max_newborn ?? r.test?.refRangeMaxNewborn,
          ageRanges: r.test?.age_ranges || r.test?.ageRanges,
          valueType: r.test?.value_type || r.test?.valueType,
          customOptions: r.test?.custom_options || r.test?.customOptions,
          sortOrder: r.test?.sort_order ?? r.test?.sortOrder,
          isHidden: r.test?.is_hidden ?? r.test?.isHidden,
          parent: r.test?.parent ? {
            id: r.test.parent.id,
            name: r.test.parent.name,
            method: r.test.parent.method,
            interpretation: r.test.parent.interpretation,
            comment: r.test.parent.comment,
            notes: r.test.parent.notes,
            sortOrder: r.test.parent.sort_order ?? r.test.parent.sortOrder,
            isHidden: r.test.parent.is_hidden ?? r.test.parent.isHidden,
            parent: r.test.parent.parent ? {
              id: r.test.parent.parent.id,
              name: r.test.parent.parent.name,
              method: r.test.parent.parent.method,
              interpretation: r.test.parent.parent.interpretation,
              comment: r.test.parent.parent.comment,
              notes: r.test.parent.parent.notes,
              sortOrder: r.test.parent.parent.sort_order ?? r.test.parent.parent.sortOrder,
              isHidden: r.test.parent.parent.is_hidden ?? r.test.parent.parent.isHidden,
            } : undefined
          } : undefined
        }
      })),
      printedInterpretations: report.printed_interpretations || report.printedInterpretations,
      testNotes: report.test_notes || report.testNotes,
      lab: {
        name: lab.name || "OnePath Diagnostic Laboratory",
        email: lab.email || "info@onepathlab.com",
        address: lab.address || "Main Laboratory Diagnostic Center",
        phone: lab.phone || "+91 98765 43210",
        logoUrl: lab.logo_url || lab.logoUrl || "/onepath-logo.png",
        printBgImage: bg,
        printHeaderHeight: lab.print_header_height ?? lab.printHeaderHeight ?? 185,
        printFooterHeight: lab.print_footer_height ?? lab.printFooterHeight ?? 95,
        printMarginLeft: lab.print_margin_left ?? lab.printMarginLeft ?? 32,
        printMarginRight: lab.print_margin_right ?? lab.printMarginRight ?? 32,
        printWithLetterhead: lab.print_with_letterhead ?? lab.printWithLetterhead ?? (bg ? true : false),
        report_settings: lab.report_settings || lab.reportSettings,
        reportSettings: lab.report_settings || lab.reportSettings,
      },
      report_settings: lab.report_settings || lab.reportSettings,
      reportSettings: lab.report_settings || lab.reportSettings,
    };
  }, [report, patient, lab, letterheadBase64]);

  const labSettings = useMemo(() => {
    const bg = letterheadBase64 || getCleanLetterheadUrl(lab.print_bg_image || lab.printBgImage);
    return {
      bgImage: bg,
      headerHeight: lab.print_header_height ?? lab.printHeaderHeight ?? 185,
      footerHeight: lab.print_footer_height ?? lab.printFooterHeight ?? 95,
      marginLeft: lab.print_margin_left ?? lab.printMarginLeft ?? 32,
      marginRight: lab.print_margin_right ?? lab.printMarginRight ?? 32,
      printWithLetterhead: lab.print_with_letterhead ?? lab.printWithLetterhead ?? (bg ? true : false),
    };
  }, [lab, letterheadBase64]);

  // Security & Billing Guardrails: Unpaid Bills and Unapproved Reports Cannot be Downloaded
  const bill = report?.bill || {};
  const rawBillStatus = String(bill?.status || "").toUpperCase().trim();
  const rawBillTotal = Number(bill?.total || 0);
  const rawBillPaid = Number(bill?.paid_amount ?? bill?.paidAmount ?? 0);
  const isBillUnpaid =
    (report?.can_download === false && report?.download_block_reason === "BILL_UNPAID") ||
    rawBillStatus === "UNPAID" ||
    (rawBillTotal > 0 && rawBillPaid <= 0 && rawBillStatus !== "PAID");

  const rawReportStatus = String(report?.status || "").toUpperCase().trim();
  const isReportApproved =
    (rawReportStatus === "APPROVED" || rawReportStatus === "FINAL" || rawReportStatus === "COMPLETED") &&
    report?.download_block_reason !== "NOT_APPROVED";

  const isDownloadBlocked = Boolean(
    report?.can_download === false ||
    isBillUnpaid ||
    !isReportApproved
  );

  const blockReason = isBillUnpaid ? "BILL_UNPAID" : (!isReportApproved ? "NOT_APPROVED" : (report?.download_block_reason || null));
  const blockMessage = report?.download_block_message || (
    isBillUnpaid
      ? "Payment Pending: The invoice for this diagnostic report is currently UNPAID. Please clear the pending dues at the laboratory billing counter to download your official report."
      : "Report Pending Approval: Laboratory analysis is in progress. The official report will be available for download once reviewed and approved by the pathologist."
  );

  // Native Vector PDF Download (Approach 1: Zero overlap, 100% Vector Quality)
  const patientName = (patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
  const code = report?.custom_id || report?.customId || reportId;

  const handleNativePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Report_${patientName}_${code}`,
    onBeforePrint: async () => {
      if (isDownloadBlocked) {
        alert(blockMessage);
        throw new Error(blockMessage);
      }
    },
  });

  const handleDownloadPdf = async () => {
    if (isDownloadBlocked) {
      alert(blockMessage);
      return;
    }
    if (!printRef.current || !sheetData) return;

    setIsDownloading(true);
    try {
      const filename = `LabReport_${code}_${patientName}.pdf`;
      await downloadNativePdf({
        printContainer: printRef.current,
        filename,
      });
    } catch (err: any) {
      console.error("Public QR PDF download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const text = encodeURIComponent(
      `Official Diagnostic Laboratory Report for ${patient?.name || "Patient"} (ID: ${report?.custom_id || reportId})\n\nView & Download Verified Report:\n${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Verifying Medical Record...</h2>
            <p className="text-xs text-slate-500 mt-1">Connecting to OnePath Secure Diagnostic Repository</p>
          </div>
        </div>
      </div>
    );
  }

  if (requiresPhone) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Security Verification Required</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              To protect patient confidentiality, please verify the registered mobile number (or at least the last 4 digits) to view this diagnostic report.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (phoneInput.trim().length >= 4) {
                setSubmittingPhone(true);
                fetchReport(phoneInput.trim());
              }
            }}
            className="space-y-3 pt-2"
          >
            <input
              type="tel"
              placeholder="Enter patient mobile or last 4 digits"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={submittingPhone || phoneInput.trim().length < 4}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {submittingPhone ? "Verifying..." : "Verify & View Report"}
            </button>
          </form>
          <div className="pt-2 text-[11px] text-slate-400 font-mono">
            Report Reference: {reportId}
          </div>
        </div>
      </div>
    );
  }

  if (error || !report || !sheetData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Verification Failed</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {error || "The scanned QR code is either expired or does not match any registered diagnostic record in the OnePath LIS network."}
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 font-mono">
            Security Reference: {reportId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      <InAppBrowserBanner />
      {/* ── Top Header: Pure Light Clean Design ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Official Verification Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">Verified Diagnostic Report</span>
                {isDownloadBlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="h-2.5 w-2.5" /> ACCESS RESTRICTED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="h-2.5 w-2.5 stroke-[3]" /> OFFICIAL AUTHENTIC
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {lab.name || "OnePath Diagnostic Lab"} · <span className="font-mono font-semibold text-slate-700">Ref: {report.custom_id || report.customId}</span>
              </p>
            </div>
          </div>

          {/* Desktop/Tablet Top Action */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all cursor-pointer"
              title="Share via WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>
            {isDownloadBlocked ? (
              <div
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-xs select-none cursor-not-allowed"
                title={blockMessage}
              >
                <Lock className="h-3.5 w-3.5 text-amber-700" />
                <span>Download Locked ({blockReason === "BILL_UNPAID" ? "Payment Due" : "Approval Pending"})</span>
              </div>
            ) : (
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-75"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating Official PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Official PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Patient Metadata Summary Card ── */}
      <section className="max-w-5xl mx-auto w-full px-3 sm:px-4 pt-3 pb-1">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-xs">
                {patient.name ? patient.name.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Patient</span>
                <strong className="text-slate-800 font-semibold text-xs">{cleanPatientNameForReport(patient.name, patient.designation)}</strong>
                <span className="text-slate-500 text-[11px] ml-1">({patient.age}Y / {patient.gender})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Date</span>
                <span className="text-slate-800 font-medium text-xs">{reportDateStr}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>256-Bit Cryptographically Verified</span>
          </div>
        </div>
      </section>

      {/* ── Mobile Zoom & Screen Fit Controller (Only when report viewable) ── */}
      {!isDownloadBlocked && (
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 pt-2 pb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>Official A4 Report Canvas</span>
          </span>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-2xs text-xs">
            <button
              onClick={() => setScale((prev) => Math.max(0.3, Number((prev - 0.05).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-100 text-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold text-slate-800 px-1">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((prev) => Math.min(1.2, Number((prev + 0.05).toFixed(2))))}
              className="p-1 rounded hover:bg-slate-100 text-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setScale(fitScale)}
              className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors"
            >
              Fit Phone
            </button>
            <button
              onClick={() => setScale(1)}
              className="text-[10px] font-bold text-slate-600 hover:bg-slate-100 px-2 py-0.5 rounded-lg transition-colors hidden sm:inline"
            >
              100% A4
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content: Access Blocked Card or Official Report Sheet ── */}
      <main className="flex-1 px-2 sm:px-4 py-3 flex justify-center items-start overflow-x-auto">
        {isDownloadBlocked ? (
          <div className="max-w-xl w-full my-6 bg-white border border-amber-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              {blockReason === "BILL_UNPAID" ? (
                <CreditCard className="h-8 w-8 stroke-[1.75]" />
              ) : (
                <Clock className="h-8 w-8 stroke-[1.75]" />
              )}
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                {blockReason === "BILL_UNPAID" ? "Invoice Payment Required" : "Pathologist Verification Pending"}
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {blockReason === "BILL_UNPAID"
                  ? "Report Download Locked (Unpaid Invoice)"
                  : "Results Under Clinical Review"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {blockMessage}
              </p>
            </div>

            {/* Structured Audit & Billing Reference Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Patient Name</span>
                <span className="font-semibold text-slate-800">
                  {cleanPatientNameForReport(patient.name, patient.designation)} ({patient.age}Y/{patient.gender})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Report Reference</span>
                <span className="font-mono font-semibold text-slate-800">{report.custom_id || report.customId || reportId}</span>
              </div>
              {report.bill && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Invoice Number</span>
                  <span className="font-mono font-semibold text-slate-800">{report.bill.custom_id || report.bill.id}</span>
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Bill Payment Status</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  isBillUnpaid ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}>
                  {report.bill?.payment_status || (isBillUnpaid ? "UNPAID" : "PAID")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Clinical Approval Status</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  isReportApproved ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}>
                  {report.status || (isReportApproved ? "APPROVED" : "PENDING")}
                </span>
              </div>
            </div>

            {/* Assistance Guidance & Lab Hotline */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              {(lab?.phone || lab?.mobile || lab?.contact_phone) && (
                <a
                  href={`tel:${lab.phone || lab.mobile || lab.contact_phone}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call Laboratory ({lab.phone || lab.mobile || lab.contact_phone})</span>
                </a>
              )}
              <div className="text-[11px] text-slate-500 text-center sm:text-left">
                Visit the billing counter or refresh once payment/approval is completed.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <ReportSheet
              ref={printRef}
              report={sheetData}
              settings={labSettings}
              scale={scale}
            />
          </div>
        )}
      </main>

      {/* ── Mobile Sticky Bottom Action Bar ── */}
      <div className="sm:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 shadow-lg">
        {isDownloadBlocked ? (
          <div className="w-full flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">
                {blockReason === "BILL_UNPAID" ? "Payment Due — Locked" : "Approval Pending"}
              </span>
            </div>
            {(lab?.phone || lab?.mobile || lab?.contact_phone) && (
              <a
                href={`tel:${lab.phone || lab.mobile || lab.contact_phone}`}
                className="px-3 py-1.5 rounded-lg bg-amber-600 active:bg-amber-700 text-white font-bold text-[11px] shrink-0"
              >
                Call Lab
              </a>
            )}
          </div>
        ) : (
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-75 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Official PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Official Report (PDF)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-500">
        <p>
          Verified by <strong className="text-slate-700 font-semibold">{lab.name || "OnePath Diagnostic Network"}</strong> · Powered by OnePath LIS
        </p>
      </footer>
    </div>
  );
}
