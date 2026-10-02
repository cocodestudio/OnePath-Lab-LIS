"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Building2, Calendar, ChevronLeft, ChevronRight, Loader2, Clock,
  RefreshCw, X, Eye, Receipt, Stethoscope, CheckCircle2, AlertCircle,
  FileText, ArrowRight, PlusCircle, Paperclip, Upload, Trash2, ExternalLink,
  Search, Plus, Check, User, Phone, DollarSign, Printer, ChevronDown,
  Boxes, FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InvoiceSheet, type InvoiceData } from "@/components/invoice-sheet";
import { type BillLayoutSettings, defaultBillLayoutSettings, normalizeBillSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";

interface OutsourceCase {
  id: string;
  reg_no: string;
  date: string;
  created_at: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    custom_id: string;
    designation?: string;
  };
  doctor: string;
  partner_lab?: string;
  notes?: string;
  investigations: string;
  tests: Array<{
    id?: string;
    name: string;
    code?: string;
    price?: number;
    category?: string;
  }>;
  bill?: {
    id?: string;
    custom_id?: string;
    total: number;
    paid_amount: number;
    discount?: number;
    due: number;
    status: string;
    payment_mode?: string;
  } | null;
  status: string;
  is_due: boolean;
  due_amount: number;
  has_attached_report?: boolean;
  attached_report_url?: string | null;
  attached_report_filename?: string | null;
  attached_report_filesize?: number | null;
  attached_report_at?: string | null;
  is_report_sent?: boolean;
}

const PARTNER_LABS = [
  "Dr. Lal PathLabs",
  "SRL Diagnostics",
  "Metropolis Healthcare",
  "Thyrocare Technologies",
  "Redcliffe Labs",
  "Pathkind Labs",
  "Max Healthcare Labs",
  "Apollo Diagnostics",
  "Other Partner Lab",
];

function getStorageFileUrl(path?: string | null): string {
  if (!path) return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const urlObj = new URL(baseUrl);
    baseUrl = urlObj.origin;
  } catch {
    baseUrl = baseUrl.replace(/\/api(\/lis)?\/?$/, "");
  }
  
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export default function OutsourceCasesPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<OutsourceCase[]>([]);
  const [doctorStats, setDoctorStats] = useState<Record<string, number>>({});
  const [selectedDoctor, setSelectedDoctor] = useState("ALL");
  const [dateFilterMode, setDateFilterMode] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS" | "CUSTOM">("30DAYS");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPage, setPerPage] = useState(15);

  // Lab Info & Bill Settings for official medical invoice printing
  const [labInfo, setLabInfo] = useState<any>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(() => defaultBillLayoutSettings);

  // Official Medical Invoice Sheet Modal State
  const [selectedBillCase, setSelectedBillCase] = useState<OutsourceCase | null>(null);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  // PDF Upload state
  const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadCaseId, setTargetUploadCaseId] = useState<string | null>(null);

  // Load lab settings for official bill & invoice preview
  useEffect(() => {
    (async () => {
      try {
        const lab = await fetchFromLaravel("/lab?include_letterhead=1", { skipCache: true });
        if (lab) {
          setLabInfo(lab);
          const rawBill = lab?.bill_settings || lab?.billSettings;
          if (rawBill) {
            setBillSettings(normalizeBillSettings(rawBill));
          }
        }
      } catch (err) {
        console.error("Error fetching lab details:", err);
      }
    })();
  }, []);

  // Fetch Outsource Cases
  const fetchCases = async (skipCache = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", String(perPage));
      if (selectedDoctor !== "ALL") params.set("doctor", selectedDoctor);

      if (dateFilterMode !== "ALL") {
        if (fromDate) params.set("from_date", fromDate);
        if (toDate) params.set("to_date", toDate);
      }

      const res = await fetchFromLaravel(`/outsource-cases?${params.toString()}`, { skipCache });
      if (res) {
        setCases(Array.isArray(res.data) ? res.data : []);
        setTotalRecords(res.total || 0);
        if (res.doctor_stats) setDoctorStats(res.doctor_stats);
      }
    } catch (err: any) {
      console.error("Error fetching outsource cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [currentPage, perPage, selectedDoctor, fromDate, toDate, dateFilterMode]);

  // Handle Preset Date Filter
  const handleDatePreset = (mode: "ALL" | "TODAY" | "7DAYS" | "30DAYS") => {
    setDateFilterMode(mode);
    const today = new Date().toISOString().split("T")[0];
    if (mode === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (mode === "7DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else if (mode === "30DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else {
      setFromDate("");
      setToDate("");
    }
    setIsDatePickerOpen(false);
    setCurrentPage(1);
  };

  // Formatted display date range
  const dateRangeLabel = useMemo(() => {
    if (dateFilterMode === "ALL" || (!fromDate && !toDate)) return "All Dates";
    if (fromDate && toDate) {
      const f = fromDate.split("-").reverse().join("/");
      const t = toDate.split("-").reverse().join("/");
      return `${f} - ${t}`;
    }
    return fromDate ? `From ${fromDate}` : `To ${toDate}`;
  }, [dateFilterMode, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));

  // ═════════════════════════════════════════════════════════════════════
  // ATTACH REPORT PDF FLOW
  // ═════════════════════════════════════════════════════════════════════
  const triggerReportUpload = (caseId: string) => {
    setTargetUploadCaseId(caseId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadCaseId) return;

    // Validate PDF format strictly
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "Invalid Document",
        description: "Please select a PDF report only (.pdf format).",
        type: "error",
      });
      return;
    }

    setUploadingCaseId(targetUploadCaseId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetchFromLaravel(
        `/outsource-cases/${targetUploadCaseId}/attach-report`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res && res.success) {
        const uploadedUrl = res.report_url || res.meta?.outsource_report_url || null;
        const uploadedFilename = res.filename || res.meta?.outsource_report_filename || file.name;

        // Immediately update cases state so UI reflects the uploaded report in 0ms without waiting or refreshing!
        setCases((prevCases) =>
          prevCases.map((c) =>
            c.id === targetUploadCaseId
              ? {
                  ...c,
                  has_attached_report: true,
                  attached_report_url: uploadedUrl,
                  attached_report_filename: uploadedFilename,
                  attached_report_filesize: file.size,
                  attached_report_at: new Date().toISOString(),
                }
              : c
          )
        );

        toast({
          title: "Report Attached",
          description: `PDF report attached successfully for this patient.`,
          type: "success",
        });

        fetchCases(true);
      } else {
        throw new Error(res?.message || "Failed to attach report.");
      }
    } catch (err: any) {
      console.error("Error attaching report:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Could not upload the PDF report. Please try again.",
        type: "error",
      });
    } finally {
      setUploadingCaseId(null);
      setTargetUploadCaseId(null);
    }
  };

  const handleDetachReport = async (caseId: string) => {
    if (!confirm("Are you sure you want to remove this attached report?")) return;
    try {
      const res = await fetchFromLaravel(`/outsource-cases/${caseId}/detach-report`, {
        method: "DELETE",
      });
      if (res && res.success) {
        // Immediately update cases state so UI reflects detachment in 0ms without refreshing!
        setCases((prevCases) =>
          prevCases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  has_attached_report: false,
                  attached_report_url: null,
                  attached_report_filename: null,
                  attached_report_filesize: null,
                  attached_report_at: null,
                }
              : c
          )
        );

        toast({
          title: "Report Removed",
          description: "Attached PDF has been detached.",
          type: "success",
        });
        fetchCases(true);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove attached report.",
        type: "error",
      });
    }
  };



  // ═════════════════════════════════════════════════════════════════════
  // OFFICIAL INVOICE BUILDER (Matches main reports & billing engine)
  // ═════════════════════════════════════════════════════════════════════
  const buildInvoiceData = (c: OutsourceCase): InvoiceData => {
    const testsList = (c.tests && c.tests.length > 0)
      ? c.tests.map((t, idx) => ({
          id: t.id || `out-t-${idx}`,
          name: t.name,
          price: Number(t.price || 0),
          code: t.code || "OUT",
          category: t.category || "Outsource",
        }))
      : (c.investigations || "Outsource Investigation").split(",").map((s, idx) => ({
          id: `out-t-${idx}`,
          name: s.trim(),
          price: Number(c.bill?.total || 0) / Math.max(1, (c.investigations || "1").split(",").length),
          code: "OUT",
          category: "Outsource",
        }));

    return {
      id: c.id,
      customId: c.bill?.custom_id || `INV-${c.reg_no}`,
      createdAt: c.created_at || c.date || new Date().toISOString(),
      total: Number(c.bill?.total || 0),
      discount: Number(c.bill?.discount || 0),
      paidAmount: c.bill?.status === "PAID"
        ? Number(c.bill?.total || 0)
        : Number(c.bill?.paid_amount ?? 0),
      status: c.bill?.status || (c.is_due ? "UNPAID" : "PAID"),
      paymentMode: c.bill?.payment_mode || "CASH / UPI",
      billedBy: "Accounts / Outsource Desk",
      packageName: c.partner_lab ? `Outsourced to: ${c.partner_lab}` : null,
      patient: {
        customId: c.reg_no,
        name: c.patient?.name || "",
        phone: c.patient?.phone || "",
        age: c.patient?.age || 0,
        gender: c.patient?.gender || "",
        refDoctor: c.doctor || "Self",
      },
      lab: {
        name: labInfo?.name || labInfo?.centre_name || "OnePath Pathology Laboratory",
        email: labInfo?.email || "support@onepathlab.com",
        address: labInfo?.address || "Main Laboratory Diagnostic Center",
        phone: labInfo?.phone || "",
        logoUrl: billSettings.logoImage || labInfo?.logo_url || labInfo?.logoUrl || "/onepath-logo.png",
        pincode: labInfo?.pincode,
        city: labInfo?.city,
        district: labInfo?.district || labInfo?.city,
        state: labInfo?.state,
        gstin: billSettings.gst?.number || labInfo?.gstin,
        bill_settings: billSettings,
      },
      tests: testsList,
    };
  };

  const handlePrintInvoice = () => {
    if (invoicePrintRef.current && selectedBillCase) {
      printInvoiceElement(
        invoicePrintRef.current,
        `Invoice_${selectedBillCase.bill?.custom_id || selectedBillCase.reg_no}`
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Hidden file input for report attachment (PDF Only) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        className="hidden"
      />

      {/* ═══════════════════════════════════════════════════════════════
          PAGE HEADER (Full Edge-to-edge width & Responsive Layout)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              External Diagnostic Dispatch
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mt-1">
            Outsource Cases
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage outsourced patient investigations, dispatch to partner labs, and view generated bills.
          </p>
        </div>


      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILTER CONTROLS BAR (Date Range Box + Doctor Referral Filter)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* 1. Date Range Picker Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer shadow-2xs"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <span>{dateRangeLabel}</span>
              </button>

              {/* Date Filter Dropdown Popover */}
              {isDatePickerOpen && (
                <div className="absolute left-0 top-12 z-30 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 animate-scale-in">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Select Date Window</span>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDatePreset("TODAY")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "TODAY" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("7DAYS")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "7DAYS" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("30DAYS")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "30DAYS" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("ALL")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      All Time
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Custom Date Range</span>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setDateFilterMode("CUSTOM");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setDateFilterMode("CUSTOM");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDatePickerOpen(false);
                      setCurrentPage(1);
                      fetchCases();
                    }}
                    className="w-full h-8 text-xs rounded-xl gradient-primary text-primary-foreground font-bold cursor-pointer"
                  >
                    Apply Range
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDatePreset("TODAY")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "TODAY"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("7DAYS")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "7DAYS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("30DAYS")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "30DAYS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("ALL")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* 2. Referral Doctor Filter */}
          <div className="w-full lg:w-auto min-w-[240px]">
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:border-primary outline-none cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Referral Doctors ({totalRecords} samples)</option>
              {Object.entries(doctorStats).map(([doc, count]) => (
                <option key={doc} value={doc}>
                  {doc} ({count} {count === 1 ? "sample" : "samples"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TABLE DISPLAY (Edge-to-edge, responsive patient list)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/70 rounded-2xl shadow-card overflow-hidden w-full">
        <div className="table-responsive-container w-full">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Reg no.
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Date
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Investigations & Lab
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Attached Report
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    <td className="px-6 py-4"><div className="h-4 w-16 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="h-4 w-32 rounded shimmer-gradient" />
                      <div className="h-3 w-16 rounded shimmer-gradient" />
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-48 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-7 w-28 rounded-xl shimmer-gradient mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 w-20 rounded-full shimmer-gradient mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-20 rounded-xl shimmer-gradient ml-auto" /></td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto opacity-30 text-primary mb-2" />
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Outsource investigations booked during patient intake will appear here with external lab dispatch and attached PDF reports.
                    </p>
                    <Link href="/dashboard/patients/register" className="inline-block mt-4">
                      <Button
                        size="sm"
                        className="h-9 px-4 rounded-xl gradient-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Go to Patient Registration</span>
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const patName = c.patient?.name || "Patient";
                  const patAge = c.patient?.age ? `${c.patient.age} YRS` : "";
                  const patGender = c.patient?.gender ? c.patient.gender.slice(0, 1).toUpperCase() : "";
                  const patSubtitle = [patAge, patGender].filter(Boolean).join("/");

                  const investigationsList = c.investigations
                    ? c.investigations.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];

                  const isUploadingThis = uploadingCaseId === c.id;
                  const reportFileUrl = getStorageFileUrl(c.attached_report_url);
                  const reportFileName = c.attached_report_filename || `Report_${c.reg_no}.pdf`;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                    >
                      {/* 1. Reg no. */}
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                        {c.reg_no}
                      </td>

                      {/* 2. Date */}
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {c.date}
                      </td>

                      {/* 3. Patient */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sm text-foreground">{patName}</p>
                        <p className="text-xs text-muted-foreground">
                          {patSubtitle || "N/A"}{c.patient?.phone ? ` · ${c.patient.phone}` : ""}
                        </p>
                      </td>

                      {/* 4. Outsourced Investigations & Partner Lab */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-md">
                          <div className="flex flex-wrap gap-1.5">
                            {investigationsList.slice(0, 3).map((testName, i) => (
                              <span
                                key={i}
                                className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              >
                                {testName}
                              </span>
                            ))}
                            {investigationsList.length > 3 && (
                              <span className="text-[11px] text-muted-foreground font-semibold px-1 py-0.5">
                                +{investigationsList.length - 3} more
                              </span>
                            )}
                          </div>
                          {c.partner_lab && (
                            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-purple-500 shrink-0" />
                              <span>{c.partner_lab}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. Attached Report (PDF Only - Direct Open in New Tab & Download, No dialogbox!) */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {isUploadingThis ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading PDF…</span>
                          </div>
                        ) : c.has_attached_report && c.attached_report_url ? (
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                            {/* Direct Open in New Tab (View Report) */}
                            <a
                              href={reportFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-2xs cursor-pointer select-none"
                              title="Click to view attached PDF report in a new tab"
                            >
                              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>View Report</span>
                              <ExternalLink className="h-3 w-3 opacity-70 shrink-0" />
                            </a>

                            {/* Replace attached PDF */}
                            <button
                              type="button"
                              onClick={() => triggerReportUpload(c.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Replace attached PDF"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>

                            {/* Detach PDF */}
                            <button
                              type="button"
                              onClick={() => handleDetachReport(c.id)}
                              className="p-1.5 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Remove attached PDF"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => triggerReportUpload(c.id)}
                            className="h-8 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground border-border/80 gap-1.5 cursor-pointer shadow-2xs hover:bg-muted/50"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-primary" />
                            <span>Attach Report</span>
                          </Button>
                        )}
                      </td>

                      {/* 6. Status (No due / Due: Rs.X) */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {c.is_due ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            {c.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            No due
                          </span>
                        )}
                      </td>

                      {/* 7. Action: View bill (Exact Official Invoice Sheet Engine) */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBillCase(c)}
                          className="h-8 px-3 rounded-xl text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 cursor-pointer transition-colors"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>View bill</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PAGINATION BAR
        ═══════════════════════════════════════════════════════════════ */}
        {totalRecords > 0 && (
          <div className="border-t border-border/80 px-6 py-3.5 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Showing{" "}
              <strong className="text-foreground">
                {Math.min(totalRecords, (currentPage - 1) * perPage + 1)}–
                {Math.min(totalRecords, currentPage * perPage)}
              </strong>{" "}
              of <strong className="text-foreground">{totalRecords}</strong> cases
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-mono font-semibold text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>


      {/* ═══════════════════════════════════════════════════════════════
          OFFICIAL INVOICE MODAL (Exact Same Medical Invoice Sheet Engine)
      ═══════════════════════════════════════════════════════════════ */}
      {selectedBillCase && (
        <Dialog open={Boolean(selectedBillCase)} onOpenChange={() => setSelectedBillCase(null)}>
          <DialogContent className="max-w-4xl w-[96vw] sm:w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
            <DialogTitle className="sr-only">Print Invoice</DialogTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border/80 bg-card shrink-0 gap-3 print:hidden">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                      Tax Invoice Preview
                    </h3>
                    <span className="font-mono bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {selectedBillCase.bill?.custom_id || `INV-${selectedBillCase.reg_no}`}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                    Patient: <strong className="text-foreground">{selectedBillCase.patient?.name}</strong> · Reg No:{" "}
                    <span className="font-mono">{selectedBillCase.reg_no}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="gradient-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-px transition-all cursor-pointer w-full sm:w-auto mr-0 sm:mr-6"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Download PDF</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
              <div
                ref={invoicePrintRef}
                className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full"
              >
                <InvoiceSheet
                  settings={billSettings}
                  invoice={buildInvoiceData(selectedBillCase)}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
