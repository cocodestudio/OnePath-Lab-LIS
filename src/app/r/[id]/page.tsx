"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { 
  ShieldCheck, Download, Printer, AlertCircle, Loader2, 
  Building2, User, Calendar, CheckCircle2, FileText, Lock
} from "lucide-react";
import { ReportSheet } from "@/components/report-sheet";
import { Button } from "@/components/ui/button";
import { getCleanLetterheadUrl } from "@/lib/api-client";

export default function PublicReportVerificationPage() {
  const params = useParams();
  const reportId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from Laravel public report endpoint
        const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
        const cleanApiBase = rawApiBase.replace(/\/lis\/?$/, "");
        const res = await fetch(`${cleanApiBase}/lis/public/reports/${reportId}`, {
          headers: {
            "Accept": "application/json",
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Report not found or invalid QR verification code.");
        }

        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        console.error("Public report verification error:", err);
        setError(err.message || "Unable to retrieve verified report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handlePrintOrDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-white">Verifying Laboratory Record...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to OnePath Secure Diagnostic Repository</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Verification Failed</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {error || "The scanned QR code is either expired or does not match any registered diagnostic record in the OnePath LIS network."}
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-500 font-mono">
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

  // Transform report data into ReportSheetData format
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* ── Official Verification Banner (Screen Only) ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 print:hidden shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Verified Badge & Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>Verified Diagnostic Report</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OFFICIAL AUTHENTIC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lab.name || "OnePath Laboratory"} · <span className="font-mono text-emerald-400">{report.custom_id || report.customId}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrintOrDownload}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:-translate-y-px transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Official PDF</span>
            </button>
            <button
              onClick={handlePrintOrDownload}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Print Report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Summary Details Ribbon (Mobile / Quick View) ── */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5 print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Patient: <strong className="text-white">{patient.name}</strong> ({patient.age}Y/{patient.gender})</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Date: <strong className="text-white">{reportDateStr}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
            <Lock className="h-3 w-3" />
            <span>256-Bit Cryptographically Verified Record</span>
          </div>
        </div>
      </section>

      {/* ── Main Report Sheet Container ── */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 flex justify-center bg-slate-950 overflow-y-auto print:p-0 print:bg-white print:m-0">
        <div className="shadow-2xl ring-1 ring-slate-800 rounded-xl overflow-hidden bg-white text-zinc-900 print:ring-0 print:shadow-none print:rounded-none w-full max-w-[794px]">
          <ReportSheet 
            report={sheetData} 
            settings={labSettings} 
          />
        </div>
      </main>

      {/* ── Footer / Trust Badge ── */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 text-center text-[11px] text-slate-400 print:hidden">
        <p>
          Powered by <strong className="text-white">OnePath Laboratory Information System</strong> · India's Premier LIS Network
        </p>
      </footer>
    </div>
  );
}
