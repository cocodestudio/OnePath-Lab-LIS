"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  IndianRupee, Calendar, Search, RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
  Printer, Clock, CheckCircle2, User, Stethoscope, AlertCircle,
  FileText, ArrowLeft, X, Building2
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { AcceptDueModal } from "@/components/accept-due-modal";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { normalizeBillSettings, type BillLayoutSettings, defaultBillLayoutSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function formatDateOnly(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DueReportsPage() {
  const toast = useToast();

  // Date range defaults: All Time by default so all outstanding dues across centres are immediately visible
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Pagination State for high performance
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(25);
  const [paginationInfo, setPaginationInfo] = useState<{
    total: number;
    last_page: number;
    current_page: number;
  }>({
    total: 0,
    last_page: 1,
    current_page: 1,
  });

  // Modals state
  const [selectedBillForDue, setSelectedBillForDue] = useState<any | null>(null);
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<any | null>(null);
  const [labData, setLabData] = useState<any>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(defaultBillLayoutSettings);

  // Collection Center Filter State (default to Main Lab)
  const [selectedCenter, setSelectedCenter] = useState<string>("MAIN_LAB");
  const [collectionCenters, setCollectionCenters] = useState<any[]>([]);
  const [isLoadingCenters, setIsLoadingCenters] = useState<boolean>(false);

  const loadCollectionCenters = useCallback(async () => {
    try {
      setIsLoadingCenters(true);
      // Instant cache read for zero perceived latency
      const cached = localStorage.getItem("lis_cached_collection_centers");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((c: any) => c && (c.id || c.name));
            if (valid.length > 0) {
              setCollectionCenters(valid);
            }
          }
        } catch {}
      }

      const res = await fetchFromLaravel("/collection-centers");
      const list = Array.isArray(res) ? res : (res?.data || []);
      const validCenters = (Array.isArray(list) ? list : []).filter((c: any) => c && (c.id || c.name));
      setCollectionCenters(validCenters);
      try {
        localStorage.setItem("lis_cached_collection_centers", JSON.stringify(validCenters));
      } catch {}
    } catch (err) {
      console.error("Failed to load collection centers for dues filter:", err);
    } finally {
      setIsLoadingCenters(false);
    }
  }, []);

  const loadDueBills = useCallback(async (
    force = false,
    pageToLoad?: number,
    limitToLoad?: number,
    centerToFilter?: string,
    overrideStart?: string,
    overrideEnd?: string
  ) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    const activePage = pageToLoad ?? currentPage;
    const activeLimit = limitToLoad ?? perPage;
    const activeCenter = centerToFilter ?? selectedCenter;
    const activeStart = overrideStart !== undefined ? overrideStart : startDate;
    const activeEnd = overrideEnd !== undefined ? overrideEnd : endDate;

    try {
      const params = new URLSearchParams();
      params.append("with_due", "1");
      params.append("include_b2b", "1");
      params.append("page", String(activePage));
      params.append("limit", String(activeLimit));
      if (activeCenter) {
        params.append("collection_center_id", activeCenter);
      }
      if (activeStart) params.append("start_date", activeStart);
      if (activeEnd) params.append("end_date", activeEnd);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetchFromLaravel(`/bills?${params.toString()}`, { skipCache: force });
      const rawList = Array.isArray(res) ? res : (res?.data || []);
      setBills(rawList);

      if (res && typeof res.total === "number") {
        setPaginationInfo({
          total: res.total,
          last_page: res.last_page ?? 1,
          current_page: res.current_page ?? activePage,
        });
      } else {
        setPaginationInfo({
          total: rawList.length,
          last_page: 1,
          current_page: activePage,
        });
      }

      // Cache client-side for rapid reload
      if (datePreset === "30days" && activePage === 1 && !searchQuery) {
        try {
          localStorage.setItem(`lis_cached_due_report_v2_${activeCenter}`, JSON.stringify({
            data: rawList,
            total: res?.total ?? rawList.length,
            last_page: res?.last_page ?? 1,
          }));
        } catch {}
      }

      if (force) {
        toast.success("Updated", "Latest due records refreshed.");
      }
    } catch (err) {
      console.error("Failed to load due bills:", err);
      toast.error("Error", "Could not fetch due records.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate, datePreset, searchQuery, currentPage, perPage, selectedCenter, toast]);

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const today = new Date();
    let s = "";
    let e = "";
    if (preset === "today") {
      s = formatDateOnly(today);
      e = formatDateOnly(today);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      s = formatDateOnly(y);
      e = formatDateOnly(y);
    } else if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      s = formatDateOnly(d);
      e = formatDateOnly(today);
    } else if (preset === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      s = formatDateOnly(d);
      e = formatDateOnly(today);
    } else if (preset === "all") {
      s = "";
      e = "";
    }
    setStartDate(s);
    setEndDate(e);
    loadDueBills(true, 1, undefined, selectedCenter, s, e);
  };

  const handleCenterChange = (newCenter: string) => {
    setSelectedCenter(newCenter);
    setCurrentPage(1);

    // Instant cache switch
    let foundCache = false;
    try {
      const cached = localStorage.getItem(`lis_cached_due_report_v2_${newCenter}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const list = Array.isArray(parsed) ? parsed : (parsed?.data || []);
        if (Array.isArray(list)) {
          setBills(list);
          foundCache = true;
          if (parsed && typeof parsed.total === "number") {
            setPaginationInfo({
              total: parsed.total,
              last_page: parsed.last_page || 1,
              current_page: 1,
            });
          }
        }
      }
    } catch {}

    if (!foundCache) {
      // Clear previous center data immediately so no incorrect dues flash on screen
      setBills([]);
      setPaginationInfo({ total: 0, last_page: 1, current_page: 1 });
    }

    loadDueBills(true, 1, undefined, newCenter);
  };

  // Read cache on mount ONLY for instant zero-latency display of default Main Lab view
  useEffect(() => {
    try {
      const cached =
        localStorage.getItem("lis_cached_due_report_v2_MAIN_LAB") ||
        localStorage.getItem("lis_cached_due_report_MAIN_LAB");
      if (cached) {
        const parsed = JSON.parse(cached);
        const list = Array.isArray(parsed) ? parsed : (parsed?.data || []);
        if (Array.isArray(list) && list.length > 0) {
          setBills(list);
          if (parsed && typeof parsed.total === "number") {
            setPaginationInfo({
              total: parsed.total,
              last_page: parsed.last_page || 1,
              current_page: 1,
            });
          }
          setLoading(false);
        }
      }
      const cachedLab = localStorage.getItem("lis_cached_lab");
      if (cachedLab) {
        const parsedLab = JSON.parse(cachedLab);
        setLabData(parsedLab);
        if (parsedLab.bill_settings || parsedLab.billSettings) {
          setBillSettings(normalizeBillSettings(parsedLab.bill_settings || parsedLab.billSettings));
        }
      }
    } catch {}

    loadCollectionCenters();
    loadDueBills(false, 1, undefined, "MAIN_LAB");

    // Background fetch lab profile
    fetchFromLaravel("/lab").then((lab) => {
      if (lab) {
        setLabData(lab);
        if (lab.bill_settings || lab.billSettings) {
          setBillSettings(normalizeBillSettings(lab.bill_settings || lab.billSettings));
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute Dues Data
  const processedBills = useMemo(() => {
    return bills.map((b) => {
      const total = Number(b.total || 0);
      const discount = Number(b.discount || 0);
      const netTotal = Math.max(0, total - discount);
      const paid = Number(b.paid_amount ?? b.paidAmount ?? 0);
      const due = Math.max(0, netTotal - paid);
      const regNo =
        b.patient?.custom_id ||
        b.patient?.customId ||
        b.custom_id ||
        b.customId ||
        (b.id ? String(b.id).slice(0, 8) : "—");
      const patientName = b.patient?.name || b.patientName || "Unknown Patient";
      const refDoctor = b.patient?.ref_doctor || b.patient?.refDoctor || "Dr. Self";

      return {
        ...b,
        calcTotal: total,
        calcDiscount: discount,
        calcNetTotal: netTotal,
        calcPaid: paid,
        calcDue: due,
        regNo,
        patientName,
        refDoctor,
      };
    });
  }, [bills]);

  // Filter by search query
  const filteredBills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return processedBills;
    return processedBills.filter((b) => {
      return (
        b.patientName.toLowerCase().includes(q) ||
        String(b.regNo).toLowerCase().includes(q) ||
        (b.patient?.phone && b.patient.phone.includes(q)) ||
        b.refDoctor.toLowerCase().includes(q)
      );
    });
  }, [processedBills, searchQuery]);

  // Totals KPI
  const { totalDueSum, totalBilledSum, totalPaidSum } = useMemo(() => {
    return filteredBills.reduce(
      (acc, b) => {
        acc.totalDueSum += b.calcDue;
        acc.totalBilledSum += b.calcNetTotal;
        acc.totalPaidSum += b.calcPaid;
        return acc;
      },
      { totalDueSum: 0, totalBilledSum: 0, totalPaidSum: 0 }
    );
  }, [filteredBills]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDueCollectedSuccess = (updatedBill: any) => {
    setBills((prev) =>
      prev.map((b) => (b.id === updatedBill.id ? { ...b, ...updatedBill } : b))
    );
    loadDueBills(false);
  };

  return (
    <div className="w-full space-y-6 pb-16 animate-fade-in text-foreground">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/billing" className="hover:text-primary transition-colors">
          Billing
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Due report</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em]">
              Accounts Receivable
            </p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Due report
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Complete statement of patients with unpaid diagnostic balances and overdue payments.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Collection Centre Dropdown Filter */}
          <div className="min-w-[190px] sm:w-60">
            <Select
              value={selectedCenter}
              onValueChange={handleCenterChange}
              disabled={loading && !bills.length}
            >
              <SelectTrigger className="h-9 text-xs bg-card border-border/90 shadow-2xs">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Select Centre" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="MAIN_LAB">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Main Lab</span>
                    <span className="text-[10px] text-muted-foreground">(Direct In-house)</span>
                  </div>
                </SelectItem>

                {collectionCenters.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 border-t border-border/40 mt-1">
                      Collection Centres & Partners ({collectionCenters.length})
                    </div>
                    {collectionCenters.map((cc) => {
                      const displayName = cc.name || cc.center_name || cc.centerName || cc.lab_name || cc.email || `Centre #${cc.id}`;
                      const isB2B = String(cc.role || "").toUpperCase() === "B2B";
                      const isReception = String(cc.role || "").toUpperCase() === "RECEPTIONIST";
                      return (
                        <SelectItem key={cc.id} value={String(cc.id)}>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="truncate">{displayName}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isB2B && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  B2B
                                </span>
                              )}
                              {isReception && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  Reception
                                </span>
                              )}
                              {cc.phone && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {cc.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => loadDueBills(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Dues */}
        <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Outstanding Due
            </p>
            <p className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 mt-1">
              ₹{totalDueSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {filteredBills.filter((b) => b.calcDue > 0).length} cases with unpaid balances
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Invoiced (Selected Cases)
            </p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              ₹{totalBilledSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {filteredBills.length} patient bills
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Advance / Partial Collected
            </p>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{totalPaidSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Received advance towards these bills
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Date Filter & Search Controls */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "Last 7 Days" },
              { id: "30days", label: "Last 30 Days" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patient, reg no, doctor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers (Matching Screenshot 1) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground">Date Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {(startDate || endDate) && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground ml-auto">
              {startDate ? formatDisplayDate(startDate).split(" ")[0] : "Beginning"} — {endDate ? formatDisplayDate(endDate).split(" ")[0] : "Present"}
            </span>
          )}
        </div>
      </div>

      {/* Main Container: Fixed Layout on Desktop (No Horizontal Scroll), Clean Responsive Cards on Mobile */}
      <div className="border border-border/80 rounded-xl bg-card shadow-card overflow-hidden">
        {loading && bills.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            <span>Loading due reports...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Zero Outstanding Dues</p>
              <p className="text-xs max-w-sm">
                All patient bills in the selected date range have been fully settled.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Desktop Table View: fixed column layout that strictly fits 100% width without horizontal scroll */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full table-fixed text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="w-9 px-2 py-3 text-center"></th>
                    <th className="w-24 px-3 py-3">Reg. No.</th>
                    <th className="w-36 px-3 py-3">Date</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="w-36 px-3 py-3">Referred By</th>
                    <th className="w-20 px-3 py-3 text-right">Total</th>
                    <th className="w-20 px-3 py-3 text-right">Paid</th>
                    <th className="w-28 px-3 py-3 text-center">Status</th>
                    <th className="w-36 px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredBills.map((b) => {
                    const isExpanded = Boolean(expandedRows[b.id]);
                    return (
                      <React.Fragment key={b.id}>
                        <tr className="hover:bg-muted/30 transition-colors">
                          {/* Expand Icon */}
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(b.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Toggle details"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>

                          {/* Reg. No. */}
                          <td className="px-3 py-3 font-mono font-semibold text-foreground truncate">
                            {b.regNo}
                          </td>

                          {/* Date */}
                          <td className="px-3 py-3 text-muted-foreground text-[11px] truncate">
                            {formatDisplayDate(b.created_at || b.createdAt)}
                          </td>

                          {/* Patient Name */}
                          <td className="px-4 py-3 min-w-0">
                            <p className="font-semibold text-foreground truncate">{b.patientName}</p>
                            {b.patient?.phone && (
                              <p className="text-[10px] text-muted-foreground font-mono truncate">
                                {b.patient.phone}
                              </p>
                            )}
                          </td>

                          {/* Referred By */}
                          <td className="px-3 py-3 text-muted-foreground truncate" title={b.refDoctor}>
                            {b.refDoctor}
                          </td>

                          {/* Total */}
                          <td className="px-3 py-3 text-right font-mono font-medium text-foreground">
                            Rs.{b.calcTotal.toFixed(0)}
                          </td>

                          {/* Paid */}
                          <td className="px-3 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            Rs.{b.calcPaid.toFixed(0)}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 text-center">
                            {b.calcDue > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-bold font-mono bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                Due: Rs.{b.calcDue.toFixed(0)}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-bold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                Paid Full
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {b.calcDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBillForDue(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                                >
                                  <IndianRupee className="w-3 h-3" />
                                  <span>Accept</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedBillForInvoice(b)}
                                className="text-primary hover:text-primary/80 font-semibold text-xs hover:underline cursor-pointer shrink-0"
                              >
                                View bill
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row Detail */}
                        {isExpanded && (
                          <tr className="bg-muted/15 border-b border-border/80">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                                  <span className="text-xs font-bold text-foreground">
                                    Diagnostic Test Details & Payment Ledger
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    Bill ID: {b.id} {b.calcDiscount > 0 ? `· Discount: Rs.${b.calcDiscount.toFixed(0)}` : ""}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Included Tests */}
                                  <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
                                      Tests & Panels
                                    </p>
                                    {Array.isArray(b.reports) && b.reports.length > 0 ? (
                                      <div className="space-y-1">
                                        {b.reports.map((r: any, idx: number) => (
                                          <div
                                            key={r.id || idx}
                                            className="p-2 rounded bg-card border border-border/60 flex items-center justify-between text-xs"
                                          >
                                            <span className="font-medium text-foreground">
                                              {r.package_name || r.packageName || "Diagnostic Panel"}
                                            </span>
                                            <span className="font-mono text-muted-foreground">
                                              {r.custom_id || r.customId || ""}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        Standard pathology investigations
                                      </p>
                                    )}
                                  </div>

                                  {/* Previous Payments Breakdown */}
                                  <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">
                                      Payment Transactions
                                    </p>
                                    {Array.isArray(b.payments) && b.payments.length > 0 ? (
                                      <div className="space-y-1">
                                        {b.payments.map((p: any) => (
                                          <div
                                            key={p.id}
                                            className="p-2 rounded bg-card border border-border/60 flex items-center justify-between text-xs font-mono"
                                          >
                                            <div>
                                              <span className="font-bold text-emerald-600">
                                                + ₹{Number(p.amount || 0).toFixed(2)}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground ml-2">
                                                ({p.payment_type || p.gateway || "CASH"})
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                              {formatDisplayDate(p.created_at)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        No advance payments recorded. Full amount pending.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Card List View: Dedicated ergonomic cards with ZERO horizontal scroll */}
            <div className="block md:hidden divide-y divide-border/60 p-3 space-y-3">
              {filteredBills.map((b) => {
                const isExpanded = Boolean(expandedRows[b.id]);
                return (
                  <div key={b.id} className="pt-3 first:pt-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-foreground">{b.patientName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          Reg #{b.regNo} · {formatDisplayDate(b.created_at || b.createdAt)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Ref: <span className="font-medium text-foreground">{b.refDoctor}</span>
                        </p>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        Due: Rs.{b.calcDue.toFixed(0)}
                      </span>
                    </div>

                    {/* Financial Summary Strip */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/40 border border-border/50 text-center font-mono text-xs">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Total</span>
                        <span className="font-bold text-foreground">Rs.{b.calcTotal.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Paid</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs.{b.calcPaid.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Remaining</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">Rs.{b.calcDue.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Actions Strip */}
                    <div className="flex items-center gap-2 pt-1">
                      {b.calcDue > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedBillForDue(b)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>Accept Due</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedBillForInvoice(b)}
                        className="px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-xs text-foreground transition-all cursor-pointer"
                      >
                        View bill
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(b.id)}
                        className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Toggle details"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Mobile Expanded Details */}
                    {isExpanded && (
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs space-y-2 mt-2">
                        <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                          Tests & Panel Items
                        </p>
                        {Array.isArray(b.reports) && b.reports.length > 0 ? (
                          <div className="space-y-1">
                            {b.reports.map((r: any, idx: number) => (
                              <div key={r.id || idx} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-foreground">{r.package_name || r.packageName || "Diagnostic Panel"}</span>
                                <span className="font-mono text-muted-foreground text-[10px]">{r.custom_id || r.customId || ""}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Standard pathology panel</p>
                        )}
                        {b.calcDiscount > 0 && (
                          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                            Discount given: <span className="font-mono font-bold text-foreground">Rs.{b.calcDiscount.toFixed(0)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {paginationInfo.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border bg-card/60 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Showing{" "}
                    <strong className="text-foreground">
                      {Math.min(paginationInfo.total, (paginationInfo.current_page - 1) * perPage + 1)}
                    </strong>
                    {" "}-{" "}
                    <strong className="text-foreground">
                      {Math.min(paginationInfo.total, (paginationInfo.current_page - 1) * perPage + bills.length)}
                    </strong>
                    {" "}of{" "}
                    <strong className="text-foreground">{paginationInfo.total}</strong> due bills
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        setPerPage(newLimit);
                        setCurrentPage(1);
                        loadDueBills(false, 1, newLimit);
                      }}
                      className="px-2 py-1 rounded-md border border-border bg-background text-foreground text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1);
                      setCurrentPage(newPage);
                      loadDueBills(false, newPage);
                    }}
                    disabled={currentPage <= 1 || loading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/20">
                    Page {paginationInfo.current_page} of {Math.max(1, paginationInfo.last_page)}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const newPage = Math.min(paginationInfo.last_page, currentPage + 1);
                      setCurrentPage(newPage);
                      loadDueBills(false, newPage);
                    }}
                    disabled={currentPage >= paginationInfo.last_page || loading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Accept Due Modal */}
      {selectedBillForDue && (
        <AcceptDueModal
          isOpen={Boolean(selectedBillForDue)}
          onClose={() => setSelectedBillForDue(null)}
          bill={selectedBillForDue}
          onSuccess={handleDueCollectedSuccess}
        />
      )}

      {/* View Bill Invoice Modal (Using clean Radix Dialog with translucent soft overlay) */}
      <Dialog
        open={Boolean(selectedBillForInvoice)}
        onOpenChange={(open) => !open && setSelectedBillForInvoice(null)}
      >
        <DialogContent className="max-w-4xl w-[96vw] sm:w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
          <DialogTitle className="sr-only">Tax Invoice Preview</DialogTitle>

          {/* Top Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/80 bg-card shrink-0 gap-2 print:hidden pr-12">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                  Tax Invoice Preview · {selectedBillForInvoice?.regNo}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Patient: <strong className="text-foreground">{selectedBillForInvoice?.patientName}</strong> · PID: <span className="font-mono">{selectedBillForInvoice?.regNo}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("invoice-print-container");
                  if (el) printInvoiceElement(el);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
            {selectedBillForInvoice && (
              <div
                id="invoice-print-container"
                className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full"
              >
                <InvoiceSheet
                  invoice={{
                    id: selectedBillForInvoice.id,
                    customId: selectedBillForInvoice.regNo,
                    createdAt: selectedBillForInvoice.created_at || selectedBillForInvoice.createdAt,
                    total: selectedBillForInvoice.calcTotal,
                    discount: selectedBillForInvoice.calcDiscount,
                    paidAmount: selectedBillForInvoice.calcPaid,
                    status: selectedBillForInvoice.calcDue > 0 ? "PARTIAL" : "PAID",
                    paymentMode: selectedBillForInvoice.payment_mode || "CASH",
                    patient: {
                      name: selectedBillForInvoice.patientName,
                      customId: selectedBillForInvoice.regNo,
                      phone: selectedBillForInvoice.patient?.phone || "—",
                      age: selectedBillForInvoice.patient?.age || 25,
                      gender: selectedBillForInvoice.patient?.gender || "Male",
                      refDoctor: selectedBillForInvoice.refDoctor,
                      address: selectedBillForInvoice.patient?.address || "—",
                    },
                    lab: {
                      name: labData?.centreName || labData?.name || "OnePath Diagnostic Laboratory",
                      email: labData?.email || "lab@onepath.com",
                      address: labData?.address || "Main Diagnostic Center",
                      phone: labData?.phone || "—",
                      logoUrl: labData?.logo_url || null,
                      bill_settings: billSettings,
                    },
                    tests: (selectedBillForInvoice.reports || []).map((r: any, i: number) => ({
                      id: r.id || `T-${i}`,
                      name: r.package_name || r.packageName || "Diagnostic Panel",
                      price: selectedBillForInvoice.calcTotal,
                    })),
                  }}
                  settings={billSettings}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
