"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ReportSheet, type ReportSheetData } from "@/components/report-sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Printer, ChevronLeft, ChevronRight, Edit3, AlertTriangle,
  Filter, X, Eye, Plus, Loader2, Clock, Wallet, CheckCircle2, Sparkles, IndianRupee, RefreshCw, Ban, Shield
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FullscreenPrintReportModal } from "@/components/fullscreen-print-report-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { getTodayStr, getYesterdayStr, getRecordLocalDate, shiftDate as calcShiftDate } from "@/lib/date-utils";

interface Test { 
  name: string; 
  category: string; 
  fieldType?: string;
  parentId?: string | null;
  parent?: Test | null;
}
interface ReportTest { id: string; resultValue: string | null; isAbnormal: boolean; test: Test; }
interface Report {
  id: string; customId: string; status: string; createdAt: string;
  patient: { name: string; customId: string; phone: string; age: number; gender: string; abha_number?: string; abha_address?: string };
  bill: { customId: string; total: number; status: string };
  results: ReportTest[];
  is_b2b_paid?: boolean;
  isB2bPaid?: boolean;
  b2b_price?: number;
  b2bPrice?: number;
  abdm_status?: string;
  abdmStatus?: string;
  abdm_care_context_id?: string;
  abdmCareContextId?: string;
}

const DEFAULT_LAB = { name: "OnePath Lab Main", email: "info@onepathlab.com", address: "123 Healthcare Blvd, Medical District, Delhi", logoUrl: "/onepath-logo.png" };

export default function ReportsListPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("lis_cached_reports");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [outstandingLock, setOutstandingLock] = useState<{
    isLocked: boolean;
    outstandingBalance: number;
    message?: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState(() => getTodayStr());
  const [sortOrder, setSortOrder] = useState<"oldest" | "recent">("recent");

  const isB2B = currentUser?.role === "B2B";
  const isCollectionCenter = currentUser?.role === "COLLECTION_CENTER" || currentUser?.role === "COLLECTION_CENTRE";
  const isReceptionist = currentUser?.role === "RECEPTIONIST";
  const isPartnerOrCC = isCollectionCenter || isB2B || isReceptionist;

  const shiftDate = (days: number) => {
    setCurrentPage(1);
    setFilterDate((prev) => calcShiftDate(prev, days));
  };

  const setPreset = (preset: "today" | "yesterday" | "all") => {
    setCurrentPage(1);
    if (preset === "all") { setFilterDate(""); return; }
    if (preset === "yesterday") { setFilterDate(getYesterdayStr()); return; }
    setFilterDate(getTodayStr());
  };

  const [printReport, setPrintReport] = useState<any | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [insufficientBalanceModal, setInsufficientBalanceModal] = useState<{
    open: boolean;
    cost?: number;
    balance?: number;
    deficit?: number;
    repCode?: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("lis_cached_reports");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch {}
    }
    return true;
  });
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    fetchReports();

    const handleSync = () => {
      fetchReports(true);
    };
    window.addEventListener("lis_online_sync", handleSync);
    return () => window.removeEventListener("lis_online_sync", handleSync);
  }, []);

  useEffect(() => {
    const handleWalletUpdated = () => {
      fetchReports(true);
    };
    window.addEventListener("b2b_wallet_updated", handleWalletUpdated);
    return () => window.removeEventListener("b2b_wallet_updated", handleWalletUpdated);
  }, []);

  const fetchReports = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    setIsFetching(true);
    try {
      if (reports.length === 0) {
        setLoading(true);
      }
      const data = await fetchFromLaravel(`/reports?limit=300&sort=${sortOrder}`, { skipCache: isForce });
      if (data?.is_outstanding_locked) {
        setOutstandingLock({
          isLocked: true,
          outstandingBalance: Number(data.outstanding_balance || 0),
          message: data.message,
        });
        // Still show reports even when outstanding — don't clear the list
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        if (list.length > 0) {
          setReports(list);
          try { localStorage.setItem("lis_cached_reports", JSON.stringify(list)); } catch {}
        }
      } else {
        setOutstandingLock(null);
        const list = Array.isArray(data) ? data : (data?.data || []);
        setReports(list);
        try {
          localStorage.setItem("lis_cached_reports", JSON.stringify(list));
        } catch {}
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      if (reports.length === 0) setReports([]);
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  const triggerPrint = async (rep: any) => {
    const isFinal = rep.status === "FINAL" || rep.status === "APPROVED" || rep.status === "COMPLETED";
    if (isPartnerOrCC && !isFinal) {
      toast({
        variant: "info",
        title: "Report Not Finalized",
        description: `Report #${rep.custom_id || rep.customId || "Pending"} has not been finalized by the central lab yet. Printing is locked until final approval.`
      });
      return;
    }

    try {
      setPrintingId(rep.id);

      // Enforce B2B wallet deduction on report print (only for B2B; Collection Center never requires payment)
      if (isB2B) {
        try {
          const authRes = await fetchFromLaravel(`/b2b/reports/${rep.id}/deduct-and-print`, {
            method: "POST"
          });

          if (authRes) {
            if (authRes.deducted) {
              toast({
                variant: "success",
                title: "Report Unlocked",
                description: `₹${Number(authRes.amount_deducted).toLocaleString("en-IN", { minimumFractionDigits: 2 })} debited from B2B wallet. Report opened for printing.`
              });
              setReports((prev: any[]) =>
                prev.map((r) =>
                  r.id === rep.id ? { ...r, is_b2b_paid: true, isB2bPaid: true } : r
                )
              );
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("b2b_wallet_updated", { detail: authRes }));
              }
            }
          }
        } catch (authErr: any) {
          console.error("B2B print authorization failed:", authErr);
          const errorMsg = authErr.message || authErr.error || "Print authorization failed";
          const isInsufficient =
            authErr.error_code === "INSUFFICIENT_BALANCE" ||
            authErr.error_code === "OUTSTANDING_LOCKED" ||
            errorMsg.toLowerCase().includes("insufficient") ||
            errorMsg.toLowerCase().includes("outstanding");

          if (isInsufficient) {
            setInsufficientBalanceModal({
              open: true,
              cost: authErr.report_cost || rep.b2b_price || rep.b2bPrice || 0,
              balance: authErr.current_balance ?? 0,
              deficit: authErr.deficit ?? Math.max(0, (authErr.report_cost || 0) - (authErr.current_balance || 0)),
              repCode: rep.custom_id || rep.customId || rep.id,
            });
            return;
          }

          toast({
            variant: "error",
            title: "Print Authorization Failed",
            description: errorMsg,
          });
          return;
        }
      }

      const data = await fetchFromLaravel(`/reports/${rep.id}`);
      setPrintReport({ ...data, lab: data.lab || DEFAULT_LAB });
      setShowPrintOptions(true);
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Could not load report",
        description: err.message || "Failed to fetch report data for printing."
      });
    } finally {
      setPrintingId(null);
    }
  };

  const safeReports = Array.isArray(reports) ? reports : [];

  const categories = Array.from(
    new Set(
      safeReports.flatMap((r: any) =>
        Array.isArray(r.results)
          ? r.results.map((res: any) => res.test?.category).filter(Boolean)
          : []
      )
    )
  );

  const filteredReports = safeReports.filter((r: any) => {
    if (!r) return false;
    const patName = r.patient?.name || "";
    const patId = r.patient?.custom_id || r.patient?.customId || "";
    const repId = r.custom_id || r.customId || "";
    const repDate = getRecordLocalDate(r.createdAt || r.created_at);

    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      patId.toLowerCase().includes(search.toLowerCase()) ||
      repId.toLowerCase().includes(search.toLowerCase());

    const isRepRejected = r.status === "REJECTED" || r.meta?.sample_status === "REJECTED" || r.patient?.meta?.sample_status === "REJECTED";

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "REJECTED" && isRepRejected) ||
      (!isRepRejected && (
        statusFilter === "NEW"
          ? r.status === "NEW" || r.status === "PENDING"
          : statusFilter === "IN_PROGRESS"
          ? r.status === "IN_PROGRESS"
          : statusFilter === "FINAL"
          ? r.status === "FINAL"
          : statusFilter === "APPROVED"
          ? r.status === "COMPLETED" || r.status === "APPROVED"
          : r.status === statusFilter
      ));
    const resultsList = Array.isArray(r.results) ? r.results : [];
    const matchesCategory =
      categoryFilter === "ALL" ||
      resultsList.some((res: any) => res.test?.category === categoryFilter);
    const matchesDate = filterDate ? repDate === filterDate : true;

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a: any, b: any) => {
      const dateA = a.created_at || a.createdAt || "";
      const dateB = b.created_at || b.createdAt || "";
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;

      if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
        return sortOrder === "oldest" ? timeA - timeB : timeB - timeA;
      }

      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idA !== idB) {
        return sortOrder === "oldest" ? idA - idB : idB - idA;
      }

      return 0;
    });
  }, [filteredReports, sortOrder]);

  const totalRows = sortedReports.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedReports.slice(indexOfFirstRow, indexOfLastRow);

  const isAllCurrentPageSelected =
    currentRows.length > 0 &&
    currentRows.every((r: any) => selectedIds.includes(r.id));

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIdSet = new Set(currentRows.map((r: any) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const newSet = new Set(selectedIds);
      currentRows.forEach((r: any) => newSet.add(r.id));
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectReport = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenBatchPrint = () => {
    if (selectedIds.length === 0) return;
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("lis_batch_print_ids", JSON.stringify(selectedIds));
      }
    } catch {}
    const url = `/dashboard/reports/batch-print?ids=${selectedIds.join(",")}`;
    window.open(url, "_blank");
  };

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, categoryFilter, filterDate, sortOrder]);

  const clearFilters = () => { setSearch(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); setFilterDate(""); setSortOrder("oldest"); };
  const hasFilters = search || statusFilter !== "ALL" || categoryFilter !== "ALL" || filterDate || sortOrder !== "oldest";

  const selectClass = "w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">
            {isCollectionCenter ? "Diagnostic Archives" : isReceptionist ? "Patient Reports" : "Diagnostics"}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isCollectionCenter || isReceptionist
              ? "View authorized clinical reports and print diagnostic sheets for your patients."
              : "Enter test results, review findings, and issue diagnostic patient reports."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports(true)}
            disabled={isFetching}
            className="h-9 px-3 gap-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            title="Refresh latest reports from server"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {outstandingLock?.isLocked && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Outstanding Balance Pending</p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                ₹{outstandingLock.outstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} due — reports are visible but printing requires wallet recharge.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setInsufficientBalanceModal({
              open: true,
              cost: outstandingLock.outstandingBalance,
              balance: -outstandingLock.outstandingBalance,
              deficit: outstandingLock.outstandingBalance,
              repCode: "Clear Outstanding",
            })}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-lg shrink-0 gap-1.5 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            Recharge Wallet
          </Button>
        </div>
      )}

      <>
          {/* Filters */}
          <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card">
        <div className="flex flex-col sm:flex-row flex-wrap items-start gap-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input placeholder="Patient, ID, report…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          
          <div className="space-y-1.5 w-full sm:w-auto">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filter Date</label>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center bg-background border border-border/90 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <input 
                  type="date" 
                  className="h-8 px-2 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
                  value={filterDate} 
                  onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} 
                />

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset("today")}
                className={`h-10 px-3 text-xs font-bold cursor-pointer transition-all ${
                  filterDate === getTodayStr()
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset("yesterday")}
                className={`h-10 px-3 text-xs font-bold cursor-pointer transition-all ${
                  filterDate === getYesterdayStr()
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yesterday
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setPreset("all")} 
                className={`h-10 text-xs px-2.5 cursor-pointer font-bold transition-all ${
                  !filterDate
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Dates
              </Button>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="space-y-1.5 w-full sm:w-[170px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              Status
            </label>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
              <SelectTrigger className="h-10 w-full rounded-xl bg-background border border-border/80 font-medium text-xs hover:border-primary/50 transition-all shadow-xs focus:ring-2 focus:ring-primary/20 cursor-pointer">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border/70 shadow-lg bg-popover/95 backdrop-blur-md p-1">
                <SelectItem value="ALL" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    All Statuses
                  </span>
                </SelectItem>
                <SelectItem value="NEW" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    New
                  </span>
                </SelectItem>
                <SelectItem value="IN_PROGRESS" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    In Progress
                  </span>
                </SelectItem>
                <SelectItem value="FINAL" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Final
                  </span>
                </SelectItem>
                <SelectItem value="APPROVED" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Approved
                  </span>
                </SelectItem>
                <SelectItem value="REJECTED" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Sample Rejected
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department Dropdown */}
          <div className="space-y-1.5 w-full sm:w-[190px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              Department
            </label>
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
              <SelectTrigger className="h-10 w-full rounded-xl bg-background border border-border/80 font-medium text-xs hover:border-primary/50 transition-all shadow-xs focus:ring-2 focus:ring-primary/20 cursor-pointer">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border/70 shadow-lg bg-popover/95 backdrop-blur-md p-1 max-h-72">
                <SelectItem value="ALL" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    All Departments
                  </span>
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      {c}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By Dropdown */}
          <div className="space-y-1.5 w-full sm:w-[160px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              Sort By
            </label>
            <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as "oldest" | "recent")}>
              <SelectTrigger className="h-10 w-full rounded-xl bg-background border border-border/80 font-medium text-xs hover:border-primary/50 transition-all shadow-xs focus:ring-2 focus:ring-primary/20 cursor-pointer">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border/70 shadow-lg bg-popover/95 backdrop-blur-md p-1">
                <SelectItem value="recent" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  Recent First
                </SelectItem>
                <SelectItem value="oldest" className="rounded-lg text-xs font-semibold py-2 cursor-pointer">
                  Oldest First
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={clearFilters} variant="outline" className="h-10 text-xs gap-1.5">
                <X className="h-4 w-4" /> Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {selectedIds.length} {selectedIds.length === 1 ? "Report" : "Reports"} Selected
              </p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Print all selected patient reports together in one continuous printer queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sortedReports.length > currentRows.length && selectedIds.length < sortedReports.length && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(sortedReports.map((r: any) => r.id))}
                className="h-9 text-xs text-primary hover:text-primary font-semibold cursor-pointer"
              >
                Select all {sortedReports.length} reports
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenBatchPrint}
              className="h-9 px-4 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md gap-2 cursor-pointer hover:opacity-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print Selected Reports ({selectedIds.length})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
        <div className="table-responsive-container">
          {loading || isFetching ? (
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60">
                  <th className="w-12 px-4 py-3.5 text-center">
                    <div className="h-4 w-4 rounded bg-muted/60 mx-auto" />
                  </th>
                  {["Report ID", "Patient", "Received", "Tests", "Status", ""].map((h, i) => (
                    <th key={h + i} className={`px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap ${i === 2 || i === 3 ? "hidden lg:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    <td className="w-12 px-4 py-4 text-center"><div className="h-4 w-4 rounded shimmer-gradient mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="h-4 w-36 rounded shimmer-gradient" />
                      <div className="h-3 w-20 rounded shimmer-gradient" />
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-24 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-36 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 rounded-full shimmer-gradient" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-7 w-24 rounded-lg shimmer-gradient ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : sortedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2 px-4 text-center">
              <Filter className="h-10 w-10 opacity-25 mb-1" />
              {filterDate && safeReports.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    No reports found for {filterDate === getTodayStr() ? "Today" : filterDate}.
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    You have {safeReports.length} total diagnostic reports in your archive. Click below to view all past reports.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterDate("")}
                    className="mt-2 text-xs font-semibold"
                  >
                    Show All {safeReports.length} Reports
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">No reports match your criteria.</p>
                  <p className="text-xs text-muted-foreground/70">Try clearing filters or starting a new registration.</p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                      Clear All Filters
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60">
                  <th className="w-12 px-4 py-3.5 text-center">
                    <Checkbox
                      checked={isAllCurrentPageSelected}
                      onCheckedChange={toggleSelectAllCurrentPage}
                      aria-label="Select all reports on this page"
                    />
                  </th>
                  {["Report ID", "Patient", "Received", "Tests", "Status", ""].map((h, i) => (
                    <th key={h + i} className={`px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap ${i === 2 || i === 3 ? "hidden lg:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((rep: any) => {
                  const isSelected = selectedIds.includes(rep.id);
                  const resultsList = Array.isArray(rep.results) ? rep.results : [];
                  const abnormalCount = resultsList.filter((r: any) => r.isAbnormal || r.is_abnormal).length;
                  const patName = rep.patient?.name || "Patient";
                  const patId = rep.patient?.custom_id || rep.patient?.customId || "N/A";
                  const patAge = rep.patient?.age || "N/A";
                  const patGender = rep.patient?.gender || "N/A";
                  const repId = rep.custom_id || rep.customId || "REP";
                  const repDate = rep.created_at || rep.createdAt;

                  return (
                    <tr
                      key={rep.id}
                      className={`border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors ${
                        isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectReport(rep.id)}
                          aria-label={`Select report ${repId}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{repId}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground text-sm">{patName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{patId} · {patAge}y/{patGender}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs hidden lg:table-cell whitespace-nowrap">
                        {repDate ? new Date(repDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                          {resultsList.slice(0, 4).map((r: any) => {
                            const testObj = r.test || {};
                            const name = testObj.fieldType === "Custom Editor" && testObj.name === "Report Template" && testObj.parent ? testObj.parent.name : (testObj.name || "Test");
                            const isAbn = r.isAbnormal || r.is_abnormal;
                            return (
                              <span key={r.id} className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isAbn ? "bg-destructive/8 text-destructive border-destructive/20" : "bg-accent text-accent-foreground border-transparent"}`}>{name}</span>
                            );
                          })}
                          {resultsList.length > 4 && <span className="text-[10px] text-muted-foreground font-medium px-1 py-0.5">+{resultsList.length - 4}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {(() => {
                            const isRejected = rep.status === "REJECTED" || rep.meta?.sample_status === "REJECTED" || rep.patient?.meta?.sample_status === "REJECTED";
                            const rejectionReason = rep.meta?.rejection_reason || rep.patient?.meta?.rejection_reason || "Sample Rejected";

                            if (isRejected) {
                              return (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                    Sample Rejected
                                  </span>
                                  <p className="text-[10px] font-medium text-rose-600 leading-tight">
                                    {rejectionReason}
                                  </p>
                                  {isB2B && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                      Fresh sample required
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            if (rep.status === "APPROVED" || rep.status === "COMPLETED") {
                              return (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  APPROVED
                                </span>
                              );
                            }

                            if (rep.status === "FINAL") {
                              return (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  FINAL
                                </span>
                              );
                            }

                            if (rep.status === "IN_PROGRESS") {
                              return (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  IN PROGRESS
                                </span>
                              );
                            }

                            return (
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                NEW
                              </span>
                            );
                          })()}
                          {rep.status !== "REJECTED" && !rep.meta?.sample_status && (rep.status === "APPROVED" || rep.status === "COMPLETED" || rep.status === "FINAL") && abnormalCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[9px] font-bold text-destructive uppercase tracking-wide whitespace-nowrap">
                              <AlertTriangle className="h-3 w-3" /> {abnormalCount} abnormal
                            </span>
                          )}
                          {(rep.abdm_status === "LINKED" || rep.abdmStatus === "LINKED") && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 px-2 py-0.5 text-[9px] font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wide border border-teal-500/25 whitespace-nowrap" title="ABDM M2 Care Context Linked & FHIR Record Pushed">
                              <Shield className="h-3 w-3 text-teal-600 dark:text-teal-400" /> ABDM M2 Synced
                            </span>
                          )}
                          {isB2B && rep.status !== "REJECTED" && (rep.status === "APPROVED" || rep.status === "COMPLETED" || rep.status === "FINAL") && (
                            rep.is_b2b_paid || rep.isB2bPaid ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 uppercase tracking-wide border border-emerald-500/20 whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3" /> Paid & Unlocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-600 border border-purple-500/20 whitespace-nowrap">
                                Rate: ₹{Number(rep.b2b_price ?? rep.b2bPrice ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {(() => {
                          const isRejected = rep.status === "REJECTED" || rep.meta?.sample_status === "REJECTED" || rep.patient?.meta?.sample_status === "REJECTED";
                          if (isRejected) {
                            return (
                              <div className="flex flex-col items-end gap-1 min-w-[125px]">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 w-full justify-center">
                                  <Ban className="h-3.5 w-3.5" /> Sample Rejected
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col items-end gap-1.5 min-w-[125px]">
                              {!isPartnerOrCC && (
                                <Link href={`/dashboard/reports/${rep.id}/edit`} className="w-full">
                                  <Button size="sm" className="h-8 gap-1.5 w-full font-bold text-xs">
                                    <Edit3 className="h-3.5 w-3.5" /> Enter Results
                                  </Button>
                                </Link>
                              )}
                              <Button 
                                type="button"
                                variant={isPartnerOrCC ? "default" : "outline"} 
                                size="sm" 
                                onClick={() => triggerPrint(rep)} 
                                disabled={printingId === rep.id}
                                className={`h-8 gap-1.5 w-full font-bold text-xs rounded-xl cursor-pointer ${
                                  isPartnerOrCC ? "gradient-primary text-primary-foreground shadow-xs ring-inset-top" : "border border-border/80 hover:bg-muted text-foreground"
                                }`}
                                title={isPartnerOrCC && !(rep.status === "FINAL" || rep.status === "APPROVED" || rep.status === "COMPLETED") ? "Report is awaiting final approval from central lab" : "Print report"}
                              >
                                {printingId === rep.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Printer className="h-3.5 w-3.5" />
                                )}
                                <span>
                                  {isB2B
                                    ? rep.is_b2b_paid || rep.isB2bPaid
                                      ? "Print Report"
                                      : (rep.status === "FINAL" || rep.status === "APPROVED" || rep.status === "COMPLETED")
                                      ? `Print (₹${Number(rep.b2b_price ?? rep.b2bPrice ?? 0).toLocaleString("en-IN")})`
                                      : "Awaiting Approval"
                                    : isCollectionCenter
                                    ? (rep.status === "FINAL" || rep.status === "APPROVED" || rep.status === "COMPLETED")
                                      ? "Print Report"
                                      : "Awaiting Approval"
                                    : "Print Report"}
                                </span>
                              </Button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalRows > 0 && (
          <div className="bg-muted/20 px-6 py-3.5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{indexOfFirstRow + 1}</span>–<span className="font-semibold text-foreground">{Math.min(indexOfLastRow, totalRows)}</span> of <span className="font-semibold text-foreground">{totalRows}</span> reports
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page:</span>
                <Select value={String(rowsPerPage)} onValueChange={(val) => { setRowsPerPage(Number(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-16 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs font-semibold text-foreground px-2">{currentPage} / {totalPages}</span>
                <Button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>

      <FullscreenPrintReportModal 
        open={showPrintOptions} 
        onOpenChange={(open) => {
          setShowPrintOptions(open);
          if (!open) fetchReports();
        }} 
        report={printReport} 
      />

      {/* Insufficient Wallet Balance Modal */}
      {insufficientBalanceModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-destructive/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {insufficientBalanceModal.repCode === "Clear Outstanding" ? "Outstanding Balance Pending" : "Insufficient Wallet Balance"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {insufficientBalanceModal.repCode === "Clear Outstanding" ? "Recharge required to clear dues and view reports" : "Recharge required to print patient report"}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Report ID:</span>
                <span className="font-mono font-bold text-foreground">{insufficientBalanceModal.repCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Report Fee:</span>
                <span className="font-bold text-foreground">
                  ₹{Number(insufficientBalanceModal.cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-bold text-destructive">
                  ₹{Number(insufficientBalanceModal.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="font-bold text-foreground">Minimum Recharge Needed:</span>
                <span className="font-black text-purple-600 text-sm">
                  ₹{Number(insufficientBalanceModal.deficit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              As per laboratory policy, report printing is debited directly from your B2B wallet balance. Please add funds to unlock this report.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInsufficientBalanceModal(null)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </Button>
              <Link href="/dashboard/wallet">
                <Button
                  size="sm"
                  className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md gap-2 cursor-pointer"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Recharge Wallet</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
