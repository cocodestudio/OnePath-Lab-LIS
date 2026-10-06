"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Briefcase, Users, TrendingUp, FlaskConical, Search, RefreshCw,
  Calendar, Clock, Check, Copy, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Building, Phone, Mail, Wallet,
  ShieldCheck, ArrowRight, X, Filter, Sparkles, PlusCircle, IndianRupee,
  Receipt, Download, Printer, Loader2, MessageSquare, ChevronDown, Store, Building2
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InvoiceSheet, type InvoiceData } from "@/components/invoice-sheet";
import { normalizeBillSettings, defaultBillLayoutSettings, type BillLayoutSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";
import { getNativePdfBase64, downloadNativePdf } from "@/lib/pdf-report-downloader";
import { useToast } from "@/components/ui/toast";

interface B2bClient {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  lab_name: string;
  status: string;
  rate_tier: string;
  rate_list_id?: number | null;
  rate_list_name?: string | null;
  wallet_balance: number;
  credit_limit: number;
  total_patients: number;
  today_patients: number;
  month_patients: number;
  total_sales: number;
  today_sales: number;
  month_sales: number;
  created_at?: string;
}

interface PatientRecord {
  id: string;
  custom_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  vial_barcode?: string;
  b2b_user?: {
    id: number | string;
    name: string;
    lab_name: string;
    phone?: string;
    rate_tier: string;
    rate_list_id?: number | null;
    rate_list_name?: string | null;
  };
  tests: string[];
  tests_count: number;
  bill_amount: number;
  paid_amount: number;
  payment_status: string;
  sample_status: string;
  rejection_reason?: string;
  created_at: string;
  ref_doctor?: string;
  address?: string;
  bill_id?: string | null;
  bill_custom_id?: string | null;
  bill?: any;
  mrp_amount?: number;
  rate_type?: "B2B" | "MRP";
  is_collection_center?: boolean;
}

export default function B2bSalesPage() {
  const [partnerType, setPartnerType] = useState<"B2B" | "COLLECTION_CENTER">("B2B");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const [clients, setClients] = useState<B2bClient[]>([]);
  const [selectedB2bId, setSelectedB2bId] = useState<string>("");
  const [period, setPeriod] = useState<"all" | "today" | "this_month" | "custom">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);

  const [summary, setSummary] = useState({
    total_sales: 0,
    total_mrp: 0,
    total_patients: 0,
    total_tests: 0,
  });
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Lab profile & bill styling
  const toast = useToast();
  const [labProfile, setLabProfile] = useState<any>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(defaultBillLayoutSettings);
  const [selectedPatientForInvoice, setSelectedPatientForInvoice] = useState<PatientRecord | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  // Outside click handler for type dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePartnerTypeChange = (newType: "B2B" | "COLLECTION_CENTER") => {
    setPartnerType(newType);
    setSelectedB2bId("");
    setPage(1);
    setIsTypeDropdownOpen(false);
  };

  // Fetch lab profile for invoice header
  useEffect(() => {
    const fetchLab = async () => {
      try {
        const res = await fetchFromLaravel("/lab");
        if (res && res.data) {
          setLabProfile(res.data);
          if (res.data.bill_settings) {
            setBillSettings(normalizeBillSettings(res.data.bill_settings));
          }
        } else if (res && res.name) {
          setLabProfile(res);
          if (res.bill_settings) {
            setBillSettings(normalizeBillSettings(res.bill_settings));
          }
        }
      } catch (e) {
        console.error("Failed to load lab profile:", e);
      }
    };
    fetchLab();
  }, []);

  // Fetch clients belonging to this LIS Diagnostic Lab (B2B or Collection Centers)
  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const res = await fetchFromLaravel(`/b2b/clients?type=${partnerType}`, { skipCache: true });
      if (res && res.status === "success" && Array.isArray(res.data)) {
        setClients(res.data);
      } else if (Array.isArray(res)) {
        setClients(res);
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [partnerType]);

  // Fetch sales records & summary metrics
  const fetchSales = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const params = new URLSearchParams({
        type: partnerType,
        period,
        page: String(page),
        per_page: String(perPage),
      });

      if (selectedB2bId) params.append("b2b_user_id", selectedB2bId);
      if (period === "custom") {
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
      }
      if (search.trim()) params.append("search", search.trim());

      const res = await fetchFromLaravel(`/b2b/sales?${params.toString()}`, { skipCache: true });
      if (res && res.status === "success") {
        setSummary(res.summary || { total_sales: 0, total_mrp: 0, total_patients: 0, total_tests: 0 });
        if (res.patients) {
          setPatients(res.patients.data || []);
          setPagination({
            current_page: res.patients.current_page || 1,
            last_page: res.patients.last_page || 1,
            total: res.patients.total || 0,
            per_page: res.patients.per_page || perPage,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setIsLoadingSales(false);
    }
  }, [partnerType, selectedB2bId, period, fromDate, toDate, search, page, perPage]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePeriodChange = (newPeriod: "all" | "today" | "this_month" | "custom") => {
    setPeriod(newPeriod);
    setPage(1);
    if (newPeriod === "today") {
      const today = new Date().toISOString().split("T")[0];
      setFromDate(today);
      setToDate(today);
    } else if (newPeriod === "this_month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(today);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const handleOpenBillInvoice = (patient: PatientRecord) => {
    setSelectedPatientForInvoice(patient);
    setIsInvoiceModalOpen(true);
  };

  const handlePrintWindow = () => {
    if (invoicePrintRef.current) {
      const invNo = selectedPatientForInvoice?.bill?.custom_id || selectedPatientForInvoice?.bill_custom_id || selectedPatientForInvoice?.custom_id || "Invoice";
      printInvoiceElement(invoicePrintRef.current, `Invoice_${invNo}`);
    } else {
      window.print();
    }
  };

  const handleDownloadInvoicePdf = async () => {
    if (!selectedPatientForInvoice || !invoicePrintRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const pName = (selectedPatientForInvoice.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const invNo = (selectedPatientForInvoice.bill?.custom_id || selectedPatientForInvoice.bill_custom_id || selectedPatientForInvoice.custom_id).replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Invoice_${invNo}_${pName}.pdf`;

      await downloadNativePdf({
        printContainer: invoicePrintRef.current,
        filename,
      });
      toast.success("Downloaded!", "Invoice PDF downloaded successfully.");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error("Download Failed", "Failed to generate invoice PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsAppInvoice = async () => {
    if (!selectedPatientForInvoice) return;
    const phone = selectedPatientForInvoice.phone;
    const digitsOnly = phone ? phone.replace(/[^0-9]/g, "") : "";
    if (!digitsOnly || digitsOnly.length < 10) {
      toast.error("Invalid Phone", "Patient does not have a valid mobile number for WhatsApp.");
      return;
    }
    if (!invoicePrintRef.current) {
      toast.error("Not Ready", "Invoice preview is still rendering. Please wait a moment.");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const pName = (selectedPatientForInvoice.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const invNo = (selectedPatientForInvoice.bill?.custom_id || selectedPatientForInvoice.bill_custom_id || selectedPatientForInvoice.custom_id).replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Invoice_${invNo}_${pName}.pdf`;

      const pdfBase64 = await getNativePdfBase64({
        printContainer: invoicePrintRef.current,
        filename,
      });

      const billId = selectedPatientForInvoice.bill?.id || selectedPatientForInvoice.bill_id;
      if (billId) {
        const res = await fetchFromLaravel(`/bills/${billId}/send-whatsapp`, {
          method: "POST",
          body: JSON.stringify({
            pdf_base64: pdfBase64,
            phone: digitsOnly,
          }),
        });

        if (res?.status === "success" || res?.success) {
          toast.success("Sent on WhatsApp!", "Invoice PDF sent to patient's WhatsApp successfully.");
        } else {
          toast.error("WhatsApp Dispatch Failed", res?.message || "Could not deliver WhatsApp message.");
        }
      } else {
        toast.error("Bill ID Missing", "This patient does not have an attached bill record.");
      }
    } catch (err: any) {
      console.error("WhatsApp invoice dispatch error:", err);
      toast.error("WhatsApp Error", err?.message || "An unexpected error occurred while sending WhatsApp.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const invoiceData: InvoiceData | null = useMemo(() => {
    if (!selectedPatientForInvoice) return null;

    const b = selectedPatientForInvoice.bill;
    const isPaid = selectedPatientForInvoice.payment_status === "PAID" || b?.status === "PAID";
    const billTotal = Number(
      b?.total ??
      (partnerType === "COLLECTION_CENTER"
        ? (selectedPatientForInvoice as any).mrp_amount || selectedPatientForInvoice.bill_amount
        : selectedPatientForInvoice.bill_amount) ??
      0
    );
    const paidAmt = isPaid ? billTotal : Number(b?.paid_amount ?? selectedPatientForInvoice.paid_amount ?? 0);

    const testItems = (b?.tests && Array.isArray(b.tests) && b.tests.length > 0)
      ? b.tests.map((t: any) => ({
          id: String(t.id || t.name),
          name: t.name,
          price: Number(t.price || 0),
          code: t.code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`,
          category: t.category || "Pathology",
        }))
      : (selectedPatientForInvoice.tests && selectedPatientForInvoice.tests.length > 0)
      ? selectedPatientForInvoice.tests.map((testName: string, idx: number) => ({
          id: `t-${idx}`,
          name: testName,
          price: Number(billTotal / (selectedPatientForInvoice.tests.length || 1)),
          code: `T-${testName.substring(0, 3).toUpperCase()}`,
          category: "Pathology",
        }))
      : [{
          id: "std-1",
          name: "Standard Diagnostic Profile",
          price: billTotal,
          code: "PKG-01",
          category: "Pathology",
        }];

    return {
      id: b?.id || selectedPatientForInvoice.bill_id || selectedPatientForInvoice.id,
      customId: b?.custom_id || selectedPatientForInvoice.bill_custom_id || `INV-${selectedPatientForInvoice.custom_id}`,
      createdAt: b?.created_at || selectedPatientForInvoice.created_at || new Date().toISOString(),
      total: billTotal,
      discount: Number(b?.discount ?? 0),
      paidAmount: paidAmt,
      advanceAmount: paidAmt,
      status: isPaid ? "PAID" : (selectedPatientForInvoice.payment_status || b?.status || "UNPAID"),
      paymentMode: b?.payment_mode || (partnerType === "COLLECTION_CENTER" ? "COLLECTION CENTER" : "B2B ACCOUNT"),
      billedBy: selectedPatientForInvoice.b2b_user?.lab_name || selectedPatientForInvoice.b2b_user?.name || (partnerType === "COLLECTION_CENTER" ? "Collection Centre Portal" : "B2B Partner Portal"),
      collectionCenter: selectedPatientForInvoice.b2b_user?.lab_name || selectedPatientForInvoice.b2b_user?.name || undefined,
      patient: {
        id: selectedPatientForInvoice.id,
        customId: selectedPatientForInvoice.custom_id,
        name: selectedPatientForInvoice.name,
        phone: selectedPatientForInvoice.phone || "",
        age: selectedPatientForInvoice.age || 0,
        gender: selectedPatientForInvoice.gender || "",
        refDoctor: selectedPatientForInvoice.ref_doctor || "Self",
        address: selectedPatientForInvoice.address || "",
        vialBarcode: selectedPatientForInvoice.vial_barcode || "",
      },
      lab: {
        name: labProfile?.name || labProfile?.centre_name || "OnePath Pathology Laboratory",
        email: labProfile?.email || "support@onepathlab.com",
        address: labProfile?.address || "Medical Diagnostic Center",
        phone: labProfile?.phone || "",
        logoUrl: billSettings.logoImage || labProfile?.logo_url || labProfile?.logoUrl || "/onepath-logo.png",
        pincode: labProfile?.pincode || "",
        city: labProfile?.city || "",
        district: labProfile?.district || labProfile?.city || "",
        state: labProfile?.state || "",
        gstin: billSettings.gst?.number || labProfile?.gstin || "",
        bill_settings: billSettings,
      },
      tests: testItems,
    };
  }, [selectedPatientForInvoice, labProfile, billSettings, partnerType]);

  const selectedClient = clients.find((c) => String(c.id) === String(selectedB2bId));

  const totalAllSales = clients.reduce((acc, c) => acc + (Number(c.total_sales) || 0), 0);
  const totalAllTodaySales = clients.reduce((acc, c) => acc + (Number(c.today_sales) || 0), 0);
  const totalAllPatients = clients.reduce((acc, c) => acc + (Number(c.total_patients) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
              {partnerType === "COLLECTION_CENTER" ? <Store className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {partnerType === "COLLECTION_CENTER" ? "Collection Centres & Sales" : "B2B Clients & Sales"}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {partnerType === "COLLECTION_CENTER"
              ? "Overview of all your registered collection centres, patient investigations, daily/monthly volumes, and MRP billing records."
              : "Overview of all your registered B2B clients, assigned rate tiers, today's and monthly sales volumes, and patient investigations."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Partner Type Dropdown (B2B Partners vs Collection Centers) */}
          <div className="relative" ref={typeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground text-xs font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-expanded={isTypeDropdownOpen}
            >
              {partnerType === "B2B" ? (
                <>
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>B2B Partners</span>
                </>
              ) : (
                <>
                  <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Collection Centres</span>
                </>
              )}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => handlePartnerTypeChange("B2B")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    partnerType === "B2B"
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-muted font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">B2B Partners</div>
                      <div className="text-[10px] text-muted-foreground">Wholesale rate tiers & labs</div>
                    </div>
                  </div>
                  {partnerType === "B2B" && <Check className="h-4 w-4 text-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => handlePartnerTypeChange("COLLECTION_CENTER")}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer mt-1 ${
                    partnerType === "COLLECTION_CENTER"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "text-foreground hover:bg-muted font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Store className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Collection Centres</div>
                      <div className="text-[10px] text-muted-foreground">Direct collection branches & MRP</div>
                    </div>
                  </div>
                  {partnerType === "COLLECTION_CENTER" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchClients();
              fetchSales();
            }}
            disabled={isLoadingSales || isLoadingClients}
            className="gap-2 text-xs font-semibold rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSales || isLoadingClients ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {selectedClient
                ? `${selectedClient.lab_name || selectedClient.name} Sales`
                : partnerType === "COLLECTION_CENTER"
                ? "Total Collection Centre Sales"
                : "Total All B2B Sales"}{" "}
              ({period === "all" ? "All Time" : period === "today" ? "Today" : period === "this_month" ? "This Month" : "Custom"})
            </span>
            {isLoadingSales ? (
              <div className="h-8 w-32 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {formatCurrency(summary.total_sales)}
              </div>
            )}
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3" />
              <span>
                {selectedClient
                  ? partnerType === "COLLECTION_CENTER" ? "Centre MRP rates realized" : `Tier: ${selectedClient.rate_tier || "HIGH"} Rate Applied`
                  : partnerType === "COLLECTION_CENTER" ? "Collection centre volume realized" : "Assigned B2B rates realized"}
              </span>
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Total Patients */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {selectedClient ? "Client's Patients" : "Total Patients Intake"}
            </span>
            {isLoadingSales ? (
              <div className="h-8 w-16 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {summary.total_patients}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {selectedClient
                ? `Registered by ${selectedClient.lab_name || selectedClient.name}`
                : partnerType === "COLLECTION_CENTER" ? "Registered by collection centres" : "Registered by B2B clients"}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Total MRP */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total MRP
            </span>
            {isLoadingSales ? (
              <div className="h-8 w-28 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {formatCurrency(summary.total_mrp || 0)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Cumulative catalog MRP
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        {/* Active Partners / Centres */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {partnerType === "COLLECTION_CENTER" ? "Active Collection Centres" : "Active B2B Partners"}
            </span>
            {isLoadingClients ? (
              <div className="h-8 w-14 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {clients.length}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Associated with your lab
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            {partnerType === "COLLECTION_CENTER" ? <Store className="h-5 w-5" /> : <Building className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* ── Client / Center Selector Carousel / Strip ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            {partnerType === "COLLECTION_CENTER" ? (
              <>
                <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Select Collection Centre to Inspect Sales:</span>
              </>
            ) : (
              <>
                <Building className="h-3.5 w-3.5 text-primary" />
                <span>Select B2B Partner to Inspect Sales:</span>
              </>
            )}
          </h3>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {isLoadingClients ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="min-w-[240px] max-w-[280px] p-3.5 rounded-2xl border border-border/80 bg-card shimmer-card-pulse flex flex-col justify-between shrink-0 min-h-[175px]"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-20 rounded-full shimmer-gradient" />
                    <div className="h-4 w-16 rounded-full shimmer-gradient" />
                  </div>
                  <div className="h-4 w-36 rounded shimmer-gradient mt-2.5" />
                  <div className="h-3 w-24 rounded shimmer-gradient" />
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded shimmer-gradient" />
                    <div className="h-3 w-16 rounded shimmer-gradient" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-18 rounded shimmer-gradient" />
                    <div className="h-3 w-14 rounded shimmer-gradient" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded shimmer-gradient" />
                    <div className="h-3 w-8 rounded shimmer-gradient" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {/* All Partners / Centers Card */}
              <button
                onClick={() => {
                  setSelectedB2bId("");
                  setPage(1);
                }}
                className={`min-w-[240px] max-w-[280px] text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shrink-0 ${
                  selectedB2bId === ""
                    ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-card border-border/80 hover:bg-muted/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {partnerType === "COLLECTION_CENTER" ? "All Centres" : "All Partners"}
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      {clients.length} {partnerType === "COLLECTION_CENTER" ? "Centres" : "Clients"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-2">
                    {partnerType === "COLLECTION_CENTER" ? "All Centres Combined" : "All B2B Combined"}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {partnerType === "COLLECTION_CENTER" ? "Consolidated MRP & patients" : "Consolidated sales & patients"}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Total Sales:</span>
                    <span className="font-bold text-foreground font-mono">
                      {formatCurrency(totalAllSales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Today Sales:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(totalAllTodaySales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Total Patients:</span>
                    <span className="font-semibold text-foreground">{totalAllPatients}</span>
                  </div>
                </div>
              </button>

              {/* Individual B2B Client Cards */}
              {clients.map((c) => {
                const isSelected = String(c.id) === String(selectedB2bId);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedB2bId(String(c.id));
                      setPage(1);
                    }}
                    className={`min-w-[240px] max-w-[280px] text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shrink-0 ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20"
                        : "bg-card border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          c.rate_list_name
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : c.rate_tier === "LOW"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : c.rate_tier === "MEDIUM"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        }`}>
                          {c.rate_list_name ? c.rate_list_name : `Tier: ${c.rate_tier || "HIGH"}`}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                          ₹{c.today_sales || 0} today
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-foreground mt-2 truncate" title={c.lab_name || c.name}>
                        {c.lab_name || c.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.name} {c.phone ? `· ${c.phone}` : ""}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/60 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-semibold">Wallet Balance:</span>
                        <span className={`font-bold font-mono ${
                          Number(c.wallet_balance) <= 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {formatCurrency(c.wallet_balance || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-semibold">Total Sales:</span>
                        <span className="font-bold text-foreground font-mono">{formatCurrency(c.total_sales || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Month Sales:</span>
                        <span className="font-bold text-foreground font-mono">{formatCurrency(c.month_sales || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Total Patients:</span>
                        <span className="font-semibold text-foreground">{c.total_patients || 0}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Filters & Search Deck ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Period:
            </span>
            <Button
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("all")}
              className="text-xs h-8 px-3"
            >
              All Time
            </Button>
            <Button
              variant={period === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("today")}
              className="text-xs h-8 px-3"
            >
              Today
            </Button>
            <Button
              variant={period === "this_month" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("this_month")}
              className="text-xs h-8 px-3"
            >
              This Month
            </Button>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("custom")}
              className="text-xs h-8 px-3"
            >
              Custom Range
            </Button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search patient, phone, barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {period === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/60 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs w-36"
              />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Patient Investigations & Sales Table ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              {partnerType === "COLLECTION_CENTER" ? "Collection Centre Patient Bills & Investigations" : "B2B Patient Bills & Investigations"}
            </h3>
            {selectedClient && (
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                {selectedClient.lab_name || selectedClient.name}
              </span>
            )}
            <span className="text-xs bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full font-mono">
              {pagination.total} Records
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            {partnerType === "COLLECTION_CENTER"
              ? "Showing standard MRP rates per collection centre investigation"
              : "Showing rates calculated per partner rate tier"}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                <th className="py-2.5 px-3">Patient Name</th>
                <th className="py-2.5 px-3">Patient ID &amp; Barcode</th>
                <th className="py-2.5 px-3">{partnerType === "COLLECTION_CENTER" ? "Collection Centre" : "B2B Partner & Tier"}</th>
                <th className="py-2.5 px-3">Test Parameters Ordered</th>
                <th className="py-2.5 px-3">Registration Date</th>
                <th className="py-2.5 px-3 text-right">{partnerType === "COLLECTION_CENTER" ? "MRP Amount" : "B2B Bill Rate"}</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoadingSales ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    {/* Patient Name */}
                    <td className="py-3 px-3">
                      <div className="h-4 w-28 rounded shimmer-gradient" />
                    </td>
                    {/* Custom ID & Barcode */}
                    <td className="py-3 px-3">
                      <div className="h-4 w-20 rounded shimmer-gradient" />
                    </td>
                    {/* Partner & Tier */}
                    <td className="py-3 px-3">
                      <div className="h-4 w-24 rounded shimmer-gradient" />
                    </td>
                    {/* Test Ordered */}
                    <td className="py-3 px-3">
                      <div className="h-4 w-28 rounded shimmer-gradient" />
                    </td>
                    {/* Registration Date */}
                    <td className="py-3 px-3">
                      <div className="h-3.5 w-16 rounded shimmer-gradient" />
                    </td>
                    {/* Rate / MRP */}
                    <td className="py-3 px-3 text-right">
                      <div className="h-4 w-14 rounded shimmer-gradient ml-auto" />
                    </td>
                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <div className="h-7 w-16 rounded-lg shimmer-gradient mx-auto" />
                    </td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">
                      {partnerType === "COLLECTION_CENTER"
                        ? "No collection centre patient investigations found"
                        : "No B2B patient investigations found"}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {search
                        ? "Try adjusting your search criteria"
                        : partnerType === "COLLECTION_CENTER"
                        ? "When collection centres register patients, they will appear here."
                        : "When B2B clients register patients, they will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      {/* Patient Name Only */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-foreground text-xs block truncate max-w-[160px]" title={p.name}>
                          {p.name}
                        </span>
                      </td>

                      {/* ID & Barcode */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/80 text-[11px]">
                            {p.custom_id}
                          </span>
                          {p.vial_barcode && p.vial_barcode !== p.custom_id && (
                            <button
                              type="button"
                              onClick={() => handleCopy(p.vial_barcode!)}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 bg-muted px-1.5 py-0.5 rounded cursor-pointer"
                              title="Copy barcode"
                            >
                              {copiedCode === p.vial_barcode ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                              <span>{p.vial_barcode}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* B2B Partner / Collection Centre */}
                      <td className="py-2.5 px-3">
                        {p.b2b_user ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate max-w-[130px]" title={p.b2b_user.lab_name || p.b2b_user.name}>
                              {p.b2b_user.lab_name || p.b2b_user.name}
                            </span>
                            {partnerType === "B2B" && (
                              <span className="inline-block text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-muted/80 text-muted-foreground shrink-0">
                                {p.b2b_user.rate_tier || "HIGH"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            {partnerType === "COLLECTION_CENTER" ? "Lab Branch" : "Direct"}
                          </span>
                        )}
                      </td>

                      {/* Tests */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {p.tests && p.tests.length > 0 ? (
                            p.tests.slice(0, 2).map((testName, i) => (
                              <span
                                key={i}
                                className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground truncate max-w-[100px] shrink-0"
                                title={testName}
                              >
                                {testName}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Standard</span>
                          )}
                          {p.tests && p.tests.length > 2 && (
                            <span className="inline-block px-1 py-0.5 rounded bg-muted/70 text-[9.5px] font-bold text-muted-foreground shrink-0">
                              +{p.tests.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-muted-foreground text-[11px] whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>

                      {/* Rate / MRP */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {partnerType === "COLLECTION_CENTER" ? (
                          <div>
                            <span className="font-bold text-foreground font-mono text-xs">
                              ₹{Number((p as any).mrp_amount || (p as any).mrp || p.bill_amount || 0).toFixed(0)}
                            </span>
                            <div className="text-[9.5px] text-muted-foreground">
                              MRP
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-foreground font-mono text-xs">
                              ₹{Number(p.bill_amount || 0).toFixed(0)}
                            </span>
                            <div className="text-[9.5px] text-muted-foreground">
                              B2B
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action - View Bill */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenBillInvoice(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold shadow-xs hover:border-primary/50 hover:text-primary transition-all cursor-pointer"
                          title="View & Download Invoice"
                        >
                          <Receipt className="h-3 w-3 text-primary" />
                          <span>View Bill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Deck ── */}
        {pagination.total > 0 && (
          <div className="p-3.5 px-4 bg-muted/20 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              Showing{" "}
              <strong className="text-foreground">
                {(pagination.current_page - 1) * pagination.per_page + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.total}</strong> B2B patients
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page <= 1 || isLoadingSales}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <span className="text-xs font-semibold px-2">
                Page {pagination.current_page} of {pagination.last_page}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page >= pagination.last_page || isLoadingSales}
                className="h-8 gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* ── High-End Printable Medical Invoice Modal ── */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-4xl w-[96vw] sm:w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
          <DialogTitle className="sr-only">B2B Tax Invoice Preview</DialogTitle>

          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-7 py-3 sm:py-4 border-b border-border/80 bg-card shrink-0 gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                    B2B Tax Invoice Preview
                  </h3>
                  <span className="font-mono bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {selectedPatientForInvoice?.bill?.custom_id || selectedPatientForInvoice?.bill_custom_id || `INV-${selectedPatientForInvoice?.custom_id}`}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  Patient: <strong className="text-foreground">{selectedPatientForInvoice?.name}</strong> · PID: <span className="font-mono">{selectedPatientForInvoice?.custom_id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mr-0 sm:mr-6 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSendWhatsAppInvoice}
                disabled={isSendingWhatsApp}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Send Invoice PDF directly to Patient on WhatsApp"
              >
                {isSendingWhatsApp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                <span>{isSendingWhatsApp ? "Sending..." : "Send on WhatsApp"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoicePdf}
                disabled={isDownloadingPdf}
                className="gradient-primary text-primary-foreground font-bold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-px transition-all cursor-pointer disabled:opacity-50"
                title="Download pristine high-resolution vector PDF"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{isDownloadingPdf ? "Downloading..." : "Download PDF"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintWindow}
                className="bg-card hover:bg-muted text-foreground border border-border/80 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs hover:-translate-y-px transition-all cursor-pointer"
                title="Open browser print dialog"
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Printable Invoice Sheet Body */}
          <div className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
            {invoiceData && (
              <div ref={invoicePrintRef} className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full">
                <InvoiceSheet
                  settings={billSettings}
                  invoice={invoiceData}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
