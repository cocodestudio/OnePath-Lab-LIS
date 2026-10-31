"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Search, User, FileText, CheckCircle2, Clock, AlertTriangle,
  Printer, Download, MoreVertical, Edit3, Edit, Receipt, Copy, Check,
  Loader2, AlertCircle, X
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import { FullscreenPrintReportModal } from "@/components/fullscreen-print-report-modal";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { printInvoiceElement } from "@/lib/print-invoice";
import { formatPatientListDisplayName } from "@/lib/patient-title-helper";

export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const rawId = (params?.id as string) || "";

  // User & Role State
  const [currentUser, setCurrentUser] = useState<any>(() => getStoredUser());
  useEffect(() => {
    const u = getStoredUser();
    if (u) setCurrentUser(u);
  }, []);
  const userRole = String(currentUser?.role || "").toUpperCase();
  const isCollectionCenter = userRole === "COLLECTION_CENTER" || userRole === "COLLECTION_CENTRE";

  // Patient & Loading state
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [labData, setLabData] = useState<any>(null);
  const [copiedPid, setCopiedPid] = useState(false);

  // History filtering & sorting
  const [searchFilter, setSearchFilter] = useState("");
  const [sortField, setSortField] = useState<"date" | "billId" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Report Print Modal state
  const [selectedReportForPrint, setSelectedReportForPrint] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [loadingPrintId, setLoadingPrintId] = useState<string | null>(null);

  // Bill Invoice Modal state
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null);
  const [activeRowAction, setActiveRowAction] = useState<{
    rowId: string;
    action: "bill" | "result" | "edit";
  } | null>(null);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  // 1. Instant Cache Hydration & Initial Fetch
  useEffect(() => {
    if (!rawId) return;

    // Zero-cold-start cache lookup (< 10ms perceived latency)
    try {
      const cached = sessionStorage.getItem(`patient_detail_cache_${rawId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPatient(parsed);
        setLoading(false);
      }
    } catch (_) {}

    loadPatientData();
    fetchLabDetails();
  }, [rawId]);

  const fetchLabDetails = async () => {
    try {
      const res = await fetchFromLaravel("/lab");
      if (res) setLabData(res);
    } catch (_) {}
  };

  const loadPatientData = async () => {
    try {
      const data = await fetchFromLaravel(`/patients/${rawId}`, { skipCache: true });
      if (data) {
        setPatient(data);
        try {
          sessionStorage.setItem(`patient_detail_cache_${rawId}`, JSON.stringify(data));
        } catch (_) {}
      }
    } catch (err: any) {
      console.error("Failed to load patient history:", err);
      toast.error("Fetch Error", err?.message || "Could not retrieve patient history.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPid = () => {
    const pid = patient?.custom_id || patient?.customId || patient?.uhid || rawId;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pid);
    }
    setCopiedPid(true);
    setTimeout(() => setCopiedPid(false), 2000);
  };

  // 2. Open Report for Printing
  const handleOpenReport = async (reportId: string) => {
    setLoadingPrintId(reportId);
    try {
      const reportData = await fetchFromLaravel(`/reports/${reportId}`);
      if (!reportData) {
        toast.error("Report Unavailable", "Could not fetch report details for printing.");
        return;
      }
      setSelectedReportForPrint(reportData);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      toast.error("Print Error", err?.message || "Failed to load report.");
    } finally {
      setLoadingPrintId(null);
    }
  };

  // 3. Open Bill Invoice
  const handleOpenBill = async (billId: string) => {
    setLoadingBillId(billId);
    try {
      const billData = await fetchFromLaravel(`/bills/${billId}`);
      if (!billData) {
        toast.error("Bill Unavailable", "Could not fetch bill details.");
        return;
      }
      setSelectedBillForInvoice(billData);
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      toast.error("Bill Error", err?.message || "Failed to load invoice.");
    } finally {
      setLoadingBillId(null);
    }
  };

  // 4. Robust Date Formatter (DD-MM-YYYY)
  const formatDateDisplay = (dateVal?: any) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        // If string is already DD-MM-YYYY or similar
        return String(dateVal).slice(0, 10);
      }
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return String(dateVal || "—");
    }
  };

  // 5. Consolidated Lab Report History items with resilient date resolution
  const historyItems = useMemo(() => {
    if (!patient) return [];

    const items: any[] = [];
    const patientFallbackDate =
      patient.createdAt ||
      patient.created_at ||
      patient.registered_at ||
      patient.date ||
      new Date().toISOString();

    // A. Parse from patient.reports
    if (Array.isArray(patient.reports)) {
      patient.reports.forEach((rep: any) => {
        if (!rep || !rep.id) return;

        const repResults = Array.isArray(rep.results) ? rep.results : [];
        const testNames = repResults
          .map((r: any) => r.test?.name || r.name)
          .filter(Boolean)
          .join(", ") || rep.package_name || "Diagnostic Panel";

        const bill = rep.bill || {};
        const billId = bill.custom_id || bill.customId || (rep.bill_id ? `BILL-${rep.bill_id.slice(0, 8)}` : `REP-${rep.id.slice(0, 8)}`);

        // Check every possible date key (camelCase, snake_case, bill, report, patient)
        const billDateRaw =
          bill.createdAt ||
          bill.created_at ||
          bill.date ||
          rep.createdAt ||
          rep.created_at ||
          rep.date ||
          patientFallbackDate;

        const totalAmt = Number(bill.total ?? bill.grand_total ?? 0);
        const paidAmt = Number(bill.paid_amount ?? 0);
        const dueAmt = Math.max(0, totalAmt - paidAmt);

        const statusRaw = String(rep.status || bill.status || "Completed").toUpperCase();
        const displayStatus = statusRaw === "COMPLETED" || statusRaw === "APPROVED" || statusRaw === "VERIFIED"
          ? "Completed"
          : statusRaw === "PARTIAL" || statusRaw === "IN_PROGRESS"
          ? "In Progress"
          : "Pending";

        items.push({
          id: rep.id,
          reportId: rep.id,
          billId: billId,
          billDbId: bill.id || rep.bill_id,
          dateRaw: billDateRaw,
          tests: testNames,
          referral: patient.ref_doctor || patient.refDoctor || bill.meta?.ref_doctor || "DR. SELF",
          amount: totalAmt,
          due: dueAmt,
          status: displayStatus,
          reportObj: rep,
          billObj: bill,
        });
      });
    }

    // B. Parse any bills without reports
    if (Array.isArray(patient.bills)) {
      patient.bills.forEach((bill: any) => {
        if (!bill || !bill.id) return;
        const billCovered = items.some((it) => it.billDbId === bill.id);
        if (!billCovered) {
          const totalAmt = Number(bill.total ?? bill.grand_total ?? 0);
          const paidAmt = Number(bill.paid_amount ?? 0);
          const dueAmt = Math.max(0, totalAmt - paidAmt);
          const statusRaw = String(bill.status || "Unpaid").toUpperCase();
          const displayStatus = statusRaw === "PAID" ? "Completed" : "Pending";

          const billDateRaw =
            bill.createdAt ||
            bill.created_at ||
            bill.date ||
            patientFallbackDate;

          items.push({
            id: bill.id,
            reportId: bill.reports?.[0]?.id || null,
            billId: bill.custom_id || bill.customId || `INV-${bill.id.slice(0, 8)}`,
            billDbId: bill.id,
            dateRaw: billDateRaw,
            tests: bill.reports?.[0]?.package_name || "Diagnostic Invoice",
            referral: patient.ref_doctor || patient.refDoctor || "DR. SELF",
            amount: totalAmt,
            due: dueAmt,
            status: displayStatus,
            reportObj: bill.reports?.[0] || null,
            billObj: bill,
          });
        }
      });
    }

    // Sort items
    return items.sort((a, b) => {
      if (sortField === "amount") {
        return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortField === "billId") {
        return sortDirection === "asc"
          ? String(a.billId).localeCompare(String(b.billId))
          : String(b.billId).localeCompare(String(a.billId));
      }
      // Default: date sorting
      const timeA = new Date(a.dateRaw || 0).getTime();
      const timeB = new Date(b.dateRaw || 0).getTime();
      return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [patient, sortField, sortDirection]);

  // Filtered History items by test name or referral doctor
  const filteredHistory = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return historyItems;
    return historyItems.filter((item) => {
      const testMatch = String(item.tests || "").toLowerCase().includes(q);
      const doctorMatch = String(item.referral || "").toLowerCase().includes(q);
      const billMatch = String(item.billId || "").toLowerCase().includes(q);
      const statusMatch = String(item.status || "").toLowerCase().includes(q);
      return testMatch || doctorMatch || billMatch || statusMatch;
    });
  }, [historyItems, searchFilter]);

  const toggleSort = (field: "date" | "billId" | "amount") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Safe patient title resolution (Eliminates duplicate "Mr. Mr")
  const formattedPatientName = formatPatientListDisplayName(
    patient?.name || "Patient",
    patient?.designation || patient?.title
  );

  const patCustomId = patient?.custom_id || patient?.customId || patient?.uhid || rawId.slice(0, 8);
  const patAge = patient?.age ? `${patient.age} Year` : "—";
  const patGender = patient?.gender || "Female";
  const patPhone = patient?.phone && patient.phone !== "N/A" ? patient.phone : "—";
  const patAddress = patient?.address || "";

  if (loading && !patient) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-muted rounded-lg" />
        <div className="h-32 bg-card border border-border/70 rounded-2xl p-6" />
        <div className="h-96 bg-card border border-border/70 rounded-2xl p-6" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      
      {/* 1. Header & Navigation Ribbon (Clean Back Button + Title Only) */}
      <div className="flex items-center gap-3 pt-1">
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition-all shadow-xs cursor-pointer"
          title="Back to Patients Registry"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Patient History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diagnostic reports & billing records for #{patCustomId}
          </p>
        </div>
      </div>

      {/* 2. Top Patient Card (Exact Minimal Match to Reference Layout) */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          
          {/* Avatar Circle */}
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted/80 border-2 border-border/80 flex items-center justify-center shrink-0 text-muted-foreground shadow-inner">
            <User className="h-8 w-8 sm:h-10 sm:w-10 opacity-70" />
          </div>

          {/* Demographics Columns */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-10 flex-wrap flex-1 min-w-0">
            {/* Patient Name & PID */}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight uppercase">
                {formattedPatientName}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-xs text-muted-foreground">
                  {patCustomId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPid}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Copy Patient ID"
                >
                  {copiedPid ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Age / Gender */}
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                Age/Gender
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                {patAge} / {patGender}
              </span>
            </div>

            {/* Phone Number */}
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                Phone Number
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground font-mono">
                {patPhone}
              </span>
            </div>

            {/* Referred By */}
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                Referred By
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                {patient?.ref_doctor || patient?.refDoctor || "DR. SELF"}
              </span>
            </div>

            {/* Address (If Available) */}
            {patAddress && (
              <div className="max-w-xs">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block">
                  Address
                </span>
                <span className="text-xs font-medium text-foreground truncate block">
                  {patAddress}
                </span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Lab Report History Section */}
      <div className="space-y-3.5">
        <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
          Lab Report History
        </h3>

        {/* Search by Test or Doctor */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by Test or Doctor"
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-card border-border/80 shadow-2xs"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* History Table */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => toggleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Bill Date</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => toggleSort("billId")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Bill Id</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Tests</th>
                  <th className="px-5 py-3.5">Referral</th>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-foreground transition-colors select-none"
                    onClick={() => toggleSort("amount")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Due</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground space-y-2">
                      <FileText className="h-8 w-8 mx-auto opacity-30" />
                      <p className="text-xs font-semibold text-foreground">
                        {searchFilter ? `No report matched "${searchFilter}"` : "No lab report history found."}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Patient does not have any diagnostic tests or invoices recorded yet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      {/* Bill Date */}
                      <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">
                        {formatDateDisplay(row.dateRaw)}
                      </td>

                      {/* Bill Id */}
                      <td className="px-5 py-4 font-mono font-bold text-foreground whitespace-nowrap">
                        {row.billId}
                      </td>

                      {/* Tests */}
                      <td className="px-5 py-4 max-w-xs font-medium text-foreground truncate" title={row.tests}>
                        {row.tests}
                      </td>

                      {/* Referral */}
                      <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">
                        {row.referral}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">
                        ₹ {row.amount.toLocaleString("en-IN")}
                      </td>

                      {/* Due */}
                      <td className="px-5 py-4 whitespace-nowrap font-medium">
                        {row.due > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            ₹ {row.due.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ₹ 0
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {row.status === "Completed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3 w-3" />
                            Completed
                          </span>
                        ) : row.status === "In Progress" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Clock className="h-3 w-3" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertCircle className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action: [Report] + 3-Dots */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.reportId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReport(row.reportId)}
                              disabled={loadingPrintId === row.reportId}
                              className="h-8 px-3 gap-1.5 rounded-lg border-border/80 text-xs font-semibold hover:bg-muted cursor-pointer shadow-2xs"
                            >
                              {loadingPrintId === row.reportId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              ) : (
                                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span>{loadingPrintId === row.reportId ? "Loading..." : "Report"}</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-8 px-3 gap-1.5 rounded-lg border-border/80 text-xs font-semibold opacity-50"
                            >
                              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Report</span>
                            </Button>
                          )}

                          {/* 3-Dots Dropdown Menu (Hidden for COLLECTION_CENTER role) */}
                          {!isCollectionCenter && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer data-[state=open]:bg-muted"
                                  title="Actions"
                                >
                                  {activeRowAction?.rowId === row.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 p-1 rounded-xl shadow-xl">
                                {/* 1. View Bill */}
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2 py-2 text-xs font-medium"
                                  disabled={activeRowAction?.rowId === row.id && activeRowAction?.action === "bill"}
                                  onClick={async () => {
                                    setActiveRowAction({ rowId: row.id, action: "bill" });
                                    try {
                                      if (row.billDbId) {
                                        await handleOpenBill(row.billDbId);
                                      } else {
                                        router.push(`/dashboard/billing?search=${encodeURIComponent(row.billId)}`);
                                      }
                                    } finally {
                                      setActiveRowAction(null);
                                    }
                                  }}
                                >
                                  {activeRowAction?.rowId === row.id && activeRowAction?.action === "bill" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  ) : (
                                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <span>
                                    {activeRowAction?.rowId === row.id && activeRowAction?.action === "bill"
                                      ? "Loading Bill..."
                                      : "View Bill"}
                                  </span>
                                </DropdownMenuItem>

                                {/* 2. Enter Result */}
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2 py-2 text-xs font-medium"
                                  disabled={activeRowAction?.rowId === row.id && activeRowAction?.action === "result"}
                                  onClick={() => {
                                    setActiveRowAction({ rowId: row.id, action: "result" });
                                    if (row.reportId) {
                                      router.push(`/dashboard/reports/${row.reportId}/edit`);
                                    } else {
                                      router.push(`/dashboard/reports?search=${encodeURIComponent(patCustomId)}`);
                                    }
                                  }}
                                >
                                  {activeRowAction?.rowId === row.id && activeRowAction?.action === "result" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  ) : (
                                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <span>
                                    {activeRowAction?.rowId === row.id && activeRowAction?.action === "result"
                                      ? "Opening Editor..."
                                      : "Enter Result"}
                                  </span>
                                </DropdownMenuItem>

                                {/* 3. Edit Patient */}
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2 py-2 text-xs font-medium"
                                  disabled={activeRowAction?.rowId === row.id && activeRowAction?.action === "edit"}
                                  onClick={() => {
                                    setActiveRowAction({ rowId: row.id, action: "edit" });
                                    router.push(`/dashboard/patients/register?edit=${patient?.id || rawId}`);
                                  }}
                                >
                                  {activeRowAction?.rowId === row.id && activeRowAction?.action === "edit" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  ) : (
                                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <span>
                                    {activeRowAction?.rowId === row.id && activeRowAction?.action === "edit"
                                      ? "Loading Patient..."
                                      : "Edit Patient"}
                                  </span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Fullscreen Print Report Modal */}
      {selectedReportForPrint && (
        <FullscreenPrintReportModal
          open={isPrintModalOpen}
          onOpenChange={(open) => {
            setIsPrintModalOpen(open);
            if (!open) setSelectedReportForPrint(null);
          }}
          report={selectedReportForPrint}
        />
      )}

      {/* 5. View Bill Invoice Sheet Dialog */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Patient Invoice Preview</DialogTitle>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Invoice {selectedBillForInvoice?.custom_id || selectedBillForInvoice?.customId || "Details"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Patient: {formattedPatientName} · Total: ₹{Number(selectedBillForInvoice?.total ?? selectedBillForInvoice?.grand_total ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (invoicePrintRef.current) {
                    printInvoiceElement(invoicePrintRef.current, `Invoice_${selectedBillForInvoice?.custom_id || "Bill"}`);
                  } else {
                    window.print();
                  }
                }}
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Print Bill</span>
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-muted/10 overflow-y-auto">
            {selectedBillForInvoice && (
              <div ref={invoicePrintRef} className="bg-background shadow-xs border border-border/80 rounded-xl p-4">
                <InvoiceSheet
                  invoice={{
                    id: selectedBillForInvoice.id,
                    customId: selectedBillForInvoice.custom_id || selectedBillForInvoice.customId || "—",
                    createdAt: selectedBillForInvoice.created_at || new Date().toISOString(),
                    total: Number(selectedBillForInvoice.total ?? selectedBillForInvoice.grand_total ?? 0),
                    discount: Number(selectedBillForInvoice.discount ?? 0),
                    paidAmount: Number(selectedBillForInvoice.paid_amount ?? 0),
                    status: selectedBillForInvoice.status || "UNPAID",
                    patient: {
                      customId: patCustomId,
                      name: formattedPatientName,
                      phone: patPhone,
                      age: patient?.age || 0,
                      gender: patGender,
                      refDoctor: patient?.ref_doctor || patient?.refDoctor || "Self",
                      address: patAddress,
                    },
                    lab: {
                      name: labData?.name || labData?.centre_name || "OnePath Pathology Laboratory",
                      email: labData?.email || "support@onepathlab.com",
                      address: labData?.address || "Medical Diagnostic Center",
                      phone: labData?.phone || "",
                      logoUrl: labData?.logo_url || "/onepath-logo.png",
                    },
                    tests: (selectedBillForInvoice.reports || []).map((r: any) => ({
                      id: r.id,
                      name: r.package_name || r.name || "Diagnostic Test",
                      price: Number(selectedBillForInvoice.total || 0),
                    })),
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
