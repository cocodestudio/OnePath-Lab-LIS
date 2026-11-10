"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Receipt,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  CreditCard,
  Building2,
  Copy,
  Check,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Phone,
  Stethoscope,
  Banknote,
  QrCode,
  FileSpreadsheet
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { AcceptDueModal } from "@/components/accept-due-modal";
import { normalizeBillSettings, type BillLayoutSettings, defaultBillLayoutSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";
import { formatPatientListDisplayName } from "@/lib/patient-title-helper";

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

function formatINR(val: number | undefined | null): string {
  const num = Number(val || 0);
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DueBillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const rawId = (params?.id as string) || "";

  // Data states
  const [bill, setBill] = useState<any | null>(null);
  const [labData, setLabData] = useState<any | null>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(defaultBillLayoutSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Printable reference for header print
  const printableRef = useRef<HTMLDivElement>(null);

  // Accept Due Payment Modal state
  const [isAcceptDueOpen, setIsAcceptDueOpen] = useState<boolean>(false);

  // Role detection
  const [currentUser, setCurrentUser] = useState<any>(() => getStoredUser());
  useEffect(() => {
    const u = getStoredUser();
    if (u) setCurrentUser(u);
  }, []);
  const userRole = String(currentUser?.role || "").toUpperCase();
  const isCollectionCenter = userRole === "COLLECTION_CENTER" || userRole === "COLLECTION_CENTRE";

  const loadBillData = async () => {
    if (!rawId) return;
    try {
      setLoading(true);
      const [billRes, labRes] = await Promise.allSettled([
        fetchFromLaravel(`/bills/${encodeURIComponent(rawId)}`, { skipCache: true }),
        fetchFromLaravel("/lab", { skipCache: true }),
      ]);

      if (billRes.status === "fulfilled" && billRes.value) {
        setBill(billRes.value);
      } else {
        toast.error("Not Found", "Unable to load bill details or bill was removed.");
      }

      if (labRes.status === "fulfilled" && labRes.value) {
        setLabData(labRes.value);
        if (labRes.value.bill_settings) {
          setBillSettings(normalizeBillSettings(labRes.value.bill_settings));
        }
      }
    } catch (err: any) {
      console.error("Error loading bill details:", err);
      toast.error("Error", err.message || "Failed to load bill invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillData();
  }, [rawId]);

  // Copy invoice ID
  const handleCopyId = () => {
    const textToCopy = bill?.custom_id || bill?.customId || bill?.id || rawId;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(true);
      toast.success("Copied", `Invoice #${textToCopy} copied to clipboard.`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Direct print
  const handlePrint = () => {
    const printEl = printableRef.current || document.getElementById("invoice-bill-container");
    const invNo = bill?.custom_id || bill?.customId || "Invoice";
    if (printEl) {
      printInvoiceElement(printEl, `Invoice_${invNo}`);
    } else {
      window.print();
    }
  };

  // Calculations
  const totalAmount = Number(bill?.total || 0);
  const discountAmount = Number(bill?.discount || 0);
  const netPayable = Math.max(0, totalAmount - discountAmount);
  const paidAmount = Number(bill?.paid_amount ?? bill?.paidAmount ?? 0);
  const dueAmount = Math.max(0, netPayable - paidAmount);

  const status = useMemo(() => {
    if (dueAmount <= 0) return "PAID";
    if (paidAmount > 0) return "PARTIAL";
    return "UNPAID";
  }, [dueAmount, paidAmount]);

  const invoiceNo = bill?.custom_id || bill?.customId || `OPL-INV-${String(bill?.id || rawId).slice(-6).toUpperCase()}`;
  const patient = bill?.patient || {};
  const patientName = formatPatientListDisplayName(
    patient?.name || patient?.patient_name || patient?.patientName || "",
    patient?.designation || patient?.title || patient?.salutation
  );
  const regNo = patient?.custom_id || patient?.customId || "—";
  const refDoctor = patient?.ref_doctor || "Self / Direct";
  const collectionPoint = patient?.collected_at || patient?.meta?.collection_center_name || (isCollectionCenter ? currentUser?.name : "Main Lab (In-House)");

  // Extract mapped tests for invoice sheet preview
  const mappedTests = useMemo(() => {
    if (!bill) return [];
    const list: any[] = [];
    if (Array.isArray(bill.reports) && bill.reports.length > 0) {
      bill.reports.forEach((r: any, idx: number) => {
        if (r.package_name) {
          list.push({
            id: r.id || `rep-${idx}`,
            name: r.package_name,
            price: totalAmount / Math.max(1, bill.reports.length),
          });
        } else if (Array.isArray(r.results) && r.results.length > 0) {
          r.results.forEach((res: any, rIdx: number) => {
            const t = res.test;
            if (t) {
              list.push({
                id: t.id || `test-${idx}-${rIdx}`,
                name: t.name || "Diagnostic Test",
                price: Number(t.price || 0),
              });
            }
          });
        } else {
          list.push({
            id: r.id || `rep-${idx}`,
            name: r.name || "Diagnostic Panel",
            price: totalAmount / Math.max(1, bill.reports.length),
          });
        }
      });
    }
    if (list.length === 0) {
      list.push({
        id: "diag-service",
        name: "Pathology & Diagnostic Investigations",
        price: totalAmount,
      });
    }
    return list;
  }, [bill, totalAmount]);

  // Invoice object for InvoiceSheet component
  const invoiceData = useMemo(() => {
    if (!bill) return null;
    return {
      id: bill.id,
      customId: invoiceNo,
      createdAt: bill.created_at || bill.createdAt,
      total: totalAmount,
      discount: discountAmount,
      paidAmount: paidAmount,
      status: status,
      paymentMode: bill.payment_mode || "CASH",
      patient: {
        name: patientName,
        customId: regNo,
        phone: patient.phone || "—",
        age: patient.age || 0,
        gender: patient.gender || "Male",
        refDoctor: refDoctor,
        address: patient.address || "—",
      },
      lab: {
        name: labData?.centreName || labData?.name || "OnePath Diagnostic Laboratory",
        email: labData?.email || "lab@onepath.com",
        address: labData?.address || "Main Diagnostic Center",
        phone: labData?.phone,
        logoUrl: labData?.logoUrl || labData?.logo_url || null,
        bill_settings: billSettings,
      },
      tests: mappedTests,
    };
  }, [bill, invoiceNo, totalAmount, discountAmount, paidAmount, status, patientName, regNo, patient, refDoctor, labData, billSettings, mappedTests]);

  // Payments / Transaction Ledger list
  const transactions = useMemo(() => {
    if (!bill) return [];
    const list = Array.isArray(bill.payments) ? [...bill.payments] : [];

    // Sort ascending by date so chronological flow is clear
    list.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    return list;
  }, [bill]);

  if (loading) {
    return (
      <div className="w-full max-w-full space-y-6 pb-20 animate-fade-in text-foreground">
        {/* Shimmer Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-5 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 w-36 bg-muted/80 rounded" />
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted/60 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-muted/80 rounded-lg" />
            <div className="h-9 w-28 bg-muted/80 rounded-lg" />
          </div>
        </div>

        {/* Shimmer KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs animate-pulse space-y-2">
              <div className="h-3 w-24 bg-muted/70 rounded" />
              <div className="h-7 w-28 bg-muted rounded" />
              <div className="h-2.5 w-20 bg-muted/60 rounded" />
            </div>
          ))}
        </div>



        {/* Shimmer Transaction Ledger */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden animate-pulse">
          <div className="px-6 py-4 border-b border-border/70 flex justify-between items-center bg-muted/30">
            <div className="h-4 w-56 bg-muted/80 rounded" />
          </div>
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border/40">
                <div className="h-4 w-32 bg-muted/70 rounded" />
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-4 w-28 bg-muted/80 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Bill Record Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The requested invoice or due bill could not be found. It may have been settled or removed.
        </p>
        <Link href="/dashboard/billing/dues">
          <Button variant="outline" className="gap-2 cursor-pointer mt-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Due Reports</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 pb-20 animate-fade-in text-foreground">
      {/* ── Top Breadcrumb & Action Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/billing/dues"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Due Reports</span>
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-mono font-bold text-primary">{invoiceNo}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span>Bill &amp; Dues Ledger</span>
            </h1>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${
                status === "PAID"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : status === "PARTIAL"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
              }`}
            >
              {status === "PAID" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{status}</span>
            </span>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer"
              title="Copy Invoice ID"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{invoiceNo}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">
            Patient: <strong className="font-semibold text-foreground">{patientName}</strong> · PID: <span className="font-mono">{regNo}</span> · Billed: {formatDisplayDate(bill.created_at)}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end shrink-0">
          {dueAmount > 0 && (
            <Button
              onClick={() => setIsAcceptDueOpen(true)}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Accept Due ({formatINR(dueAmount)})</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-9 px-3.5 rounded-xl border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-2xs gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Print Invoice</span>
          </Button>
        </div>
      </div>

      {/* ── Patient Demographics & Financial KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoiced */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Total Invoiced
          </span>
          <div className="text-base sm:text-xl font-bold font-mono text-foreground mt-1 truncate">
            {formatINR(totalAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Gross booking fee
          </p>
        </div>

        {/* Discount / Concession */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Discount / Waived
          </span>
          <div className="text-base sm:text-xl font-bold font-mono text-muted-foreground mt-1 truncate">
            {formatINR(discountAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Net: {formatINR(netPayable)}
          </p>
        </div>

        {/* Total Collected */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs min-w-0">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Total Collected
          </span>
          <div className="text-base sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            {formatINR(paidAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {transactions.length} payment transaction{transactions.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Remaining Due */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs min-w-0">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Balance Due
          </span>
          <div className={`text-base sm:text-xl font-bold font-mono mt-1 truncate ${dueAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {formatINR(dueAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {dueAmount > 0 ? "Outstanding balance" : "Fully settled & paid"}
          </p>
        </div>
      </div>

      {/* ── Patient Context Banner (Clean Clinical Meta) ── */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-y-2 gap-x-5">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground">{patientName}</span>
            <span className="text-muted-foreground">({patient.gender || "—"}, {patient.age ? `${patient.age}y` : "—"})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{patient.phone || "No phone"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Ref: <strong className="text-foreground">{refDoctor}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Centre: <strong className="text-foreground">{collectionPoint}</strong></span>
          </div>
        </div>
      </div>

      {/* Hidden printable invoice container for the header 'Print Invoice' button */}
      <div className="hidden print:block" id="invoice-bill-container" ref={printableRef}>
        {invoiceData && (
          <InvoiceSheet invoice={invoiceData} settings={billSettings} />
        )}
      </div>

      {/* ── Payment & Dues Transaction Ledger (Date-Wise Received Dues) ── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Ledger Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/70 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                Payment &amp; Dues Transaction Ledger
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                {transactions.length} Entry{transactions.length === 1 ? "" : "ies"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detailed chronological record of advance payment, dues received date-by-date, and collection settlements.
            </p>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div className="overflow-x-auto w-full">
          {transactions.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-muted-foreground">
              <Receipt className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs font-semibold">No payment transactions recorded for this bill.</p>
              <p className="text-[11px]">Full amount is pending collection.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border/70 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6 whitespace-nowrap">#</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date &amp; Time Received</th>
                  <th className="py-3 px-4 whitespace-nowrap">Transaction Ref</th>
                  <th className="py-3 px-4 whitespace-nowrap">Transaction Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payment Mode</th>
                  <th className="py-3 px-4 whitespace-nowrap">Collected By</th>
                  <th className="py-3 px-4 min-w-[180px]">Remarks / Note</th>
                  <th className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx: any, idx: number) => {
                  const txDate = tx.created_at || tx.createdAt || bill.created_at;
                  const mode = String(tx.payment_type || tx.gateway || bill.payment_mode || "CASH").toUpperCase();
                  const txnid = tx.txnid || `TXN-${String(tx.id || idx).slice(-6).toUpperCase()}`;
                  const isDueCollect = tx.metadata?.is_due_collection || String(txnid).startsWith("DUE-");
                  const isAdvance = String(txnid).startsWith("ADV-") || (!isDueCollect && idx === 0);
                  const collectedBy = tx.metadata?.collected_by || (isCollectionCenter ? currentUser?.name : "Main Lab Front Desk");
                  const note = tx.metadata?.note || (isAdvance ? "Advance payment collected at patient intake" : isDueCollect ? "Due balance payment collected" : "Payment received");

                  return (
                    <tr key={tx.id || idx} className="hover:bg-muted/20 transition-colors">
                      {/* Index */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-muted-foreground text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{formatDisplayDate(txDate)}</span>
                        </div>
                      </td>

                      {/* Txn ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-primary font-semibold">
                          {txnid}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            isAdvance
                              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                              : isDueCollect
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                              : "bg-muted text-muted-foreground border-border/60"
                          }`}
                        >
                          {isAdvance ? "Advance Booking" : isDueCollect ? "Dues Received" : "Payment"}
                        </span>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-semibold text-[11px] border border-border/60">
                          {mode === "UPI" ? (
                            <QrCode className="w-3 h-3 text-emerald-600" />
                          ) : mode === "CARD" ? (
                            <CreditCard className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <Banknote className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{mode}</span>
                        </span>
                      </td>

                      {/* Collected By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-medium">
                        {collectedBy}
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        {note}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                          + {formatINR(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Ledger Summary Footer */}
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-border font-semibold text-xs">
                  <td colSpan={6} className="py-3 px-4 sm:px-6 text-muted-foreground">
                    <span>Total Payments Collected Date-Wise:</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-right">
                    <span>Total Received:</span>
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatINR(paidAmount)}
                  </td>
                </tr>
                {dueAmount > 0 && (
                  <tr className="bg-rose-500/5 border-t border-rose-500/20 text-xs">
                    <td colSpan={7} className="py-2.5 px-4 sm:px-6 text-rose-700 dark:text-rose-300 font-bold">
                      Outstanding Dues Balance Remaining:
                    </td>
                    <td className="py-2.5 px-4 sm:px-6 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {formatINR(dueAmount)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ── Accept Due Collection Modal ── */}
      {isAcceptDueOpen && (
        <AcceptDueModal
          isOpen={isAcceptDueOpen}
          onClose={() => setIsAcceptDueOpen(false)}
          bill={bill}
          onSuccess={(updatedBill) => {
            setIsAcceptDueOpen(false);
            toast.success("Due Payment Received", "The dues payment was successfully collected and recorded in the ledger.");
            loadBillData();
          }}
        />
      )}
    </div>
  );
}
