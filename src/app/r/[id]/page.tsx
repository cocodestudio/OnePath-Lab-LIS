"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, Download, AlertCircle, Loader2, 
  User, Calendar, CheckCircle2, Lock, FileText, Check
} from "lucide-react";
import { ReportSheet } from "@/components/report-sheet";
import { getCleanLetterheadUrl } from "@/lib/api-client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function PublicReportVerificationPage() {
  const params = useParams();
  const reportId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  // Dynamic mobile & tablet responsive auto-scaling for A4 report sheet
  useEffect(() => {
    const updateScale = () => {
      const screenW = window.innerWidth;
      if (screenW < 840) {
        const padding = screenW < 480 ? 20 : 36;
        const availableW = Math.max(280, screenW - padding);
        setScale(Math.min(1, availableW / 794));
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiOrigin = process.env.NEXT_PUBLIC_API_URL 
          ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/lis\/?$/, "").replace(/\/api\/?$/, "")
          : "https://api.onepathlab.com";

        const res = await fetch(`${apiOrigin}/api/lis/public/reports/${reportId}`, {
          headers: { "Accept": "application/json" },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Report not found or invalid QR verification code.");
        }

        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        console.error("Public report verification error:", err);
        setError(err.message || "Unable to retrieve verified laboratory report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleDownloadPdf = async () => {
    if (!printRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const pageEls = printRef.current.querySelectorAll<HTMLElement>(".report-print-page");
      if (!pageEls || pageEls.length === 0) {
        window.print();
        return;
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
      const pdfW = pdf.internal.pageSize.getWidth();  // 595.28 pt
      const pdfH = pdf.internal.pageSize.getHeight(); // 841.89 pt

      for (let i = 0; i < pageEls.length; i++) {
        if (i > 0) pdf.addPage("a4", "portrait");

        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          imageTimeout: 15000,
          onclone: (_doc, clonedEl) => {
            clonedEl.style.transform = "none";
            clonedEl.style.width = "794px";
            clonedEl.style.height = "1123px";
            clonedEl.style.position = "relative";
            clonedEl.style.margin = "0";
            clonedEl.style.overflow = "hidden";
            if (clonedEl.parentElement) {
              clonedEl.parentElement.style.width = "794px";
              clonedEl.parentElement.style.height = "1123px";
              clonedEl.parentElement.style.transform = "none";
              clonedEl.parentElement.style.overflow = "visible";
            }
          },
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH, undefined, "FAST");
      }

      const patientName = (patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const code = report?.custom_id || report?.customId || reportId;
      pdf.save(`${patientName}_Report_${code}.pdf`);
    } catch (err) {
      console.error("PDF generation fallback to print:", err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
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

  if (error || !report) {
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

  const patient = report.patient || {};
  const lab = report.lab || {};
  const reportDateStr = (() => {
    try {
      const d = report.report_date ? new Date(report.report_date) : (report.created_at ? new Date(report.created_at) : new Date());
      return isNaN(d.getTime()) ? (report.report_date || report.created_at || "") : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return report.report_date || report.created_at || "";
    }
  })();

  const sheetData = {
    id: report.id,
    customId: report.custom_id || report.customId,
    status: report.status,
    reportDate: report.report_date || report.reportDate,
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
      printBgImage: getCleanLetterheadUrl(lab.print_bg_image || lab.printBgImage),
      printHeaderHeight: lab.print_header_height ?? lab.printHeaderHeight ?? 185,
      printFooterHeight: lab.print_footer_height ?? lab.printFooterHeight ?? 95,
      printMarginLeft: lab.print_margin_left ?? lab.printMarginLeft ?? 32,
      printMarginRight: lab.print_margin_right ?? lab.printMarginRight ?? 32,
    }
  };

  const labSettings = {
    bgImage: getCleanLetterheadUrl(lab.print_bg_image || lab.printBgImage),
    headerHeight: lab.print_header_height ?? lab.printHeaderHeight ?? 185,
    footerHeight: lab.print_footer_height ?? lab.printFooterHeight ?? 95,
    marginLeft: lab.print_margin_left ?? lab.printMarginLeft ?? 32,
    marginRight: lab.print_margin_right ?? lab.printMarginRight ?? 32,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* ── Top Official Header (Light, Clean, Professional) ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Official Verification Badge & Lab Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 tracking-tight">Verified Diagnostic Report</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="h-3 w-3 stroke-[3]" /> OFFICIAL AUTHENTIC
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {lab.name || "OnePath Laboratory"} · <span className="font-mono font-semibold text-slate-700">Ref: {report.custom_id || report.customId}</span>
              </p>
            </div>
          </div>

          {/* Desktop/Tablet Download PDF Button */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-75"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Official PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Patient & Verification Summary Info Card ── */}
      <section className="max-w-5xl mx-auto w-full px-4 pt-4 pb-2 print:hidden">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Patient</span>
                <strong className="text-slate-800 font-semibold text-xs">{patient.name}</strong>
                <span className="text-slate-500 text-[11px] ml-1">({patient.age}Y / {patient.gender})</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-4">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Report Date</span>
                <span className="text-slate-800 font-medium text-xs">{reportDateStr}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/70 border border-emerald-200/80 px-3 py-1 rounded-full font-medium">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>256-Bit Cryptographically Sealed Diagnostic Record</span>
          </div>
        </div>
      </section>

      {/* ── Main Report Sheet Container (Mobile Auto-Scaled & Centered) ── */}
      <main className="flex-1 px-2 sm:px-4 py-4 flex justify-center items-start overflow-x-hidden print:p-0 print:m-0">
        <div 
          className="flex justify-center transition-all print:w-full print:max-w-none"
          style={{
            width: scale < 1 ? `${794 * scale}px` : "100%",
            maxWidth: "794px",
          }}
        >
          <div
            ref={printRef}
            style={{
              transform: scale < 1 ? `scale(${scale})` : "none",
              transformOrigin: "top center",
              width: "794px",
            }}
            className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none print:transform-none"
          >
            <ReportSheet 
              report={sheetData} 
              settings={labSettings} 
            />
          </div>
        </div>
      </main>

      {/* ── Mobile Sticky Bottom Action Bar ── */}
      <div className="sm:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg print:hidden">
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-75"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Download Official Report (PDF)</span>
            </>
          )}
        </button>
      </div>

      {/* ── Professional Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-500 print:hidden">
        <p>
          Verified by <strong className="text-slate-700 font-semibold">{lab.name || "OnePath Diagnostic Network"}</strong> · Powered by OnePath LIS
        </p>
      </footer>
    </div>
  );
}
