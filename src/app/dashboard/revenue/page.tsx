"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, Calendar, DollarSign, IndianRupee, ArrowDownRight,
  ArrowUpRight, Download, RefreshCw, FileText, CheckCircle2,
  Clock, AlertCircle, Filter, ChevronDown, Layers, Building2,
  Percent, ArrowLeft, Search, Eye, Sparkles, X, ShieldCheck,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type DateFilterType = "SPECIFIC_DATE" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export default function B2BRevenuePage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [labInfo, setLabInfo] = useState<any>(null);
  const [b2bRateData, setB2bRateData] = useState<any>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>("MONTHLY");
  const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination for Financial Ledger Table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsRes, labRes, testsRes, myRateListRes] = await Promise.all([
        fetchFromLaravel("/reports").catch(() => []),
        fetchFromLaravel("/lab").catch(() => null),
        fetchFromLaravel("/tests").catch(() => []),
        fetchFromLaravel("/rate-lists/my-rate-list").catch(() => null),
      ]);
      const repList = Array.isArray(reportsRes) ? reportsRes : (reportsRes?.data || []);
      setReports(repList);
      if (labRes) setLabInfo(labRes);
      const testList = Array.isArray(testsRes) ? testsRes : (testsRes?.data || []);
      setTests(testList);
      if (myRateListRes?.status === "success" && myRateListRes?.data) {
        setB2bRateData(myRateListRes.data);
      }
    } catch (err) {
      console.error("Failed to load revenue telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  // Map tests for rapid lookup
  const testsMap = useMemo(() => {
    const map = new Map<string, any>();
    tests.forEach((t: any) => {
      if (t.id) map.set(t.id.toString(), t);
      if (t.test_code) map.set(t.test_code.toLowerCase(), t);
      if (t.name) map.set(t.name.toLowerCase(), t);
    });
    return map;
  }, [tests]);

  // Map assigned B2B rate list (custom rates & standard MRPs) for accurate financial audit
  const b2bRateMap = useMemo(() => {
    const map = new Map<string, { mrp: number; b2b_price: number; name: string }>();
    if (b2bRateData?.tests && Array.isArray(b2bRateData.tests)) {
      b2bRateData.tests.forEach((t: any) => {
        const item = {
          mrp: Number(t.mrp || 0),
          b2b_price: Number(t.b2b_price || 0),
          name: t.name || "",
        };
        if (t.id) map.set(t.id.toString(), item);
        if (t.test_code) map.set(t.test_code.toLowerCase().trim(), item);
        if (t.name) map.set(t.name.toLowerCase().trim(), item);
      });
    }
    if (b2bRateData?.packages && Array.isArray(b2bRateData.packages)) {
      b2bRateData.packages.forEach((p: any) => {
        const item = {
          mrp: Number(p.mrp || 0),
          b2b_price: Number(p.b2b_price || 0),
          name: p.name || "",
        };
        if (p.id) map.set(p.id.toString(), item);
        if (p.name) map.set(p.name.toLowerCase().trim(), item);
      });
    }
    return map;
  }, [b2bRateData]);

  // Helper to compute test-level wholesale cost & partner margin based on admin's ratelist
  const getTestFinancials = (t: any, partnerTier?: string) => {
    const mrp = Number(t?.price || 0);
    const low = Number(t?.b2b_price_low ?? t?.b2bPriceLow ?? 0);
    const med = Number(t?.b2b_price_medium ?? t?.b2bPriceMedium ?? t?.b2b_price ?? t?.b2bPrice ?? 0);
    const high = Number(t?.b2b_price_high ?? t?.b2bPriceHigh ?? 0);
    const generalB2b = Number(t?.b2b_price ?? t?.b2bPrice ?? 0);

    const tier = (partnerTier || "HIGH").toUpperCase();
    let labRate = 0;
    if (tier === "LOW" && low > 0) labRate = low;
    else if (tier === "MEDIUM" && med > 0) labRate = med;
    else if (tier === "HIGH" && high > 0) labRate = high;
    else if (generalB2b > 0) labRate = generalB2b;
    else if (med > 0) labRate = med;
    else if (high > 0) labRate = high;
    else if (low > 0) labRate = low;
    else {
      // Default standard lab wholesale margin if test not specifically priced in B2B tier
      labRate = Math.round(mrp * (tier === "LOW" ? 0.5 : tier === "MEDIUM" ? 0.6 : 0.7));
    }

    labRate = Math.min(mrp, Math.max(0, labRate));
    const b2bMargin = Math.max(0, mrp - labRate);

    return { mrp, labRate, b2bMargin };
  };

  // Compute financial breakdown for a single report
  const getReportBreakdown = (r: any) => {
    const billTotal = Number(r.bill?.total || r.bill?.totalAmount || 0);
    const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount || 0);
    const partnerTier = currentUser?.rate_tier || currentUser?.rateTier;

    let calculatedTestMrp = 0;
    let calculatedLabRate = 0;

    // 1. Check if the report has an explicit package assigned
    const pkgName = r.package_name || r.patient?.meta?.package_name || r.patient?.meta?.selected_package;
    if (pkgName && b2bRateMap.has(pkgName.toLowerCase().trim())) {
      const pkgInfo = b2bRateMap.get(pkgName.toLowerCase().trim())!;
      calculatedTestMrp = pkgInfo.mrp;
      calculatedLabRate = pkgInfo.b2b_price;
    } else {
      // 2. Aggregate unique top-level tests (profiles or standalone tests)
      const uniqueTopTests = new Map<string, any>();
      if (Array.isArray(r.results) && r.results.length > 0) {
        r.results.forEach((res: any) => {
          const parent = res.test?.parent;
          if (parent && parent.id) {
            uniqueTopTests.set(String(parent.id), parent);
          } else if (res.test && res.test.id) {
            if (!res.test.parent_id) {
              uniqueTopTests.set(String(res.test.id), res.test);
            }
          } else if (res.test_id) {
            uniqueTopTests.set(String(res.test_id), { id: res.test_id });
          }
        });
      }

      uniqueTopTests.forEach((t) => {
        let itemMrp = 0;
        let itemLab = 0;

        // Check assigned B2B rate list first
        const b2bItem = b2bRateMap.get(String(t.id))
          || (t.name ? b2bRateMap.get(t.name.toLowerCase().trim()) : null)
          || (t.test_code ? b2bRateMap.get(t.test_code.toLowerCase().trim()) : null);

        if (b2bItem && (b2bItem.mrp > 0 || b2bItem.b2b_price > 0)) {
          itemMrp = b2bItem.mrp;
          itemLab = b2bItem.b2b_price;
        } else {
          // Fallback to test catalog & standard partner tier
          const catalogTest = testsMap.get(String(t.id))
            || (t.name ? testsMap.get(t.name.toLowerCase().trim()) : null)
            || t;
          const tf = getTestFinancials(catalogTest, partnerTier);
          itemMrp = tf.mrp;
          itemLab = tf.labRate;
        }

        calculatedTestMrp += itemMrp;
        calculatedLabRate += itemLab;
      });
    }

    // Lab Margin is the wholesale tariff that the B2B partner owes the Central Lab
    // For test bookings, billTotal is that exact rate
    const labMargin = billTotal > 0 ? billTotal : calculatedLabRate;

    // Total MRP is the true retail patient MRP from admin catalog
    let totalMrp = calculatedTestMrp > 0 ? calculatedTestMrp : labMargin;
    if (totalMrp < labMargin) {
      totalMrp = labMargin;
    }

    // B2B Centre Margin is the retained earnings for the B2B center
    const b2bMargin = Math.max(0, totalMrp - labMargin);

    // Settlement due: payable wholesale fee minus what has been paid
    const due = Math.max(0, labMargin - paid);

    return {
      gross: totalMrp,
      totalMrp,
      paid,
      labMargin,
      b2bMargin,
      due,
    };
  };

  // Date filtering logic
  const filteredReports = useMemo(() => {
    const now = new Date();
    return reports.filter((r) => {
      const rawDate = r.created_at || r.createdAt;
      if (!rawDate) return false;
      const repDate = new Date(rawDate);
      const repDateString = repDate.toISOString().split("T")[0];

      // Period filter
      if (dateFilter === "SPECIFIC_DATE") {
        if (specificDate && repDateString !== specificDate) return false;
      } else if (dateFilter === "WEEKLY") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (repDate < weekAgo) return false;
      } else if (dateFilter === "MONTHLY") {
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        if (repDate < monthAgo) return false;
      } else if (dateFilter === "YEARLY") {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        if (repDate < yearAgo) return false;
      } else if (dateFilter === "CUSTOM") {
        if (customStartDate && new Date(customStartDate) > repDate) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (repDate > end) return false;
        }
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const customId = (r.custom_id || r.customId || "").toLowerCase();
        const patName = (r.patient?.name || "").toLowerCase();
        const patId = (r.patient?.custom_id || r.patient?.customId || "").toLowerCase();
        if (!customId.includes(q) && !patName.includes(q) && !patId.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (r.status !== statusFilter) return false;
      }

      return true;
    });
  }, [reports, dateFilter, specificDate, customStartDate, customEndDate, searchTerm, statusFilter]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, specificDate, customStartDate, customEndDate, searchTerm, statusFilter]);

  // Pagination slice
  const totalItems = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReports.slice(startIndex, startIndex + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // Aggregate Financial Calculations using actual Admin Ratelist configuration
  const { grossB2BVolume, totalLabMargin, totalB2BCentreMargin, totalPaid } = useMemo(() => {
    let grossSum = 0;
    let labSum = 0;
    let b2bSum = 0;
    let paidSum = 0;

    filteredReports.forEach((r) => {
      const fin = getReportBreakdown(r);
      grossSum += fin.totalMrp;
      labSum += fin.labMargin;
      b2bSum += fin.b2bMargin;
      paidSum += fin.paid;
    });

    return {
      grossB2BVolume: grossSum,
      totalLabMargin: labSum,
      totalB2BCentreMargin: b2bSum,
      totalPaid: paidSum,
    };
  }, [filteredReports, testsMap, b2bRateMap, currentUser]);

  const totalDue = Math.max(0, totalLabMargin - totalPaid);

  // Date range display string
  const periodLabel = useMemo(() => {
    if (dateFilter === "SPECIFIC_DATE") {
      return specificDate
        ? new Date(specificDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "Specific Date";
    }
    if (dateFilter === "WEEKLY") return "Last 7 Days (Weekly)";
    if (dateFilter === "MONTHLY") return "Last 30 Days (Monthly)";
    if (dateFilter === "YEARLY") return "Past 1 Year (Annual)";
    return `${customStartDate || "Start"} to ${customEndDate || "End"}`;
  }, [dateFilter, specificDate, customStartDate, customEndDate]);

  // Clean, professional CSV / Excel Table Export (Pure tabular format, without bill layout)
  const handleDownloadB2BStatementCSV = () => {
    if (filteredReports.length === 0) {
      toast.warning("No Data Found", "No requisitions found for the selected period to generate statement.");
      return;
    }

    // Helper to sanitize CSV cells
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];

    // Row 1: Clean, professional table headers
    rows.push([
      escapeCsv("S.No."),
      escapeCsv("Requisition ID"),
      escapeCsv("Date"),
      escapeCsv("Patient Name"),
      escapeCsv("Patient ID"),
      escapeCsv("Phone Number"),
      escapeCsv("Tests / Investigation"),
      escapeCsv("Total MRP (INR)"),
      escapeCsv("Advance / Paid (INR)"),
      escapeCsv("Due / Unpaid (INR)"),
      escapeCsv("Lab Margin (INR)"),
      escapeCsv("B2B Centre Margin (INR)"),
      escapeCsv("Payment Status"),
      escapeCsv("Report Status"),
    ].join(","));

    // Itemized Rows
    filteredReports.forEach((r, idx) => {
      const fin = getReportBreakdown(r);
      const repDate = r.created_at || r.createdAt
        ? new Date(r.created_at || r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "N/A";
      const patName = r.patient?.name || "Patient";
      const patId = r.patient?.custom_id || r.patient?.customId || "N/A";
      const patPhone = r.patient?.phone || "N/A";
      const testsStr = Array.isArray(r.results)
        ? r.results.map((res: any) => res.test?.name).filter(Boolean).join(" | ") || `${r.results.length} tests`
        : "Standard Panel";
      const isPaid = fin.paid >= fin.labMargin && fin.labMargin > 0;
      const payStatus = isPaid ? "PAID" : fin.paid > 0 ? "PARTIAL" : "UNPAID";

      rows.push([
        escapeCsv(idx + 1),
        escapeCsv(r.custom_id || r.customId || "REQ"),
        escapeCsv(repDate),
        escapeCsv(patName),
        escapeCsv(patId),
        escapeCsv(patPhone),
        escapeCsv(testsStr),
        escapeCsv(fin.totalMrp.toFixed(2)),
        escapeCsv(fin.paid.toFixed(2)),
        escapeCsv(fin.due.toFixed(2)),
        escapeCsv(fin.labMargin.toFixed(2)),
        escapeCsv(fin.b2bMargin.toFixed(2)),
        escapeCsv(payStatus),
        escapeCsv(r.status || "PENDING"),
      ].join(","));
    });

    // Summary Totals Row
    rows.push([
      escapeCsv("TOTAL"),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(`Total Patients: ${filteredReports.length}`),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(grossB2BVolume.toFixed(2)),
      escapeCsv(totalPaid.toFixed(2)),
      escapeCsv(totalDue.toFixed(2)),
      escapeCsv(totalLabMargin.toFixed(2)),
      escapeCsv(totalB2BCentreMargin.toFixed(2)),
      escapeCsv(""),
      escapeCsv(""),
    ].join(","));

    // Create UTF-8 BOM CSV File Blob
    const csvContent = "\uFEFF" + rows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSlug = periodLabel.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `B2B_Statement_${dateSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7 animate-fade-in pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span>B2B Commercial Ledger & Settlements</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Revenue & Financial Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit of Total MRP volume, central lab wholesale margin, and partner B2B centre margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-xs hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            <span>Sync Ledger</span>
          </button>

          {/* User Requested: "Generate B2B Statement" button with instant CSV/Excel download */}
          <Button
            onClick={handleDownloadB2BStatementCSV}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md gap-2 cursor-pointer hover:-translate-y-px active:scale-[0.98] transition-all"
            title="Download formatted .csv file in Excel format for the selected period"
          >
            <Download className="h-4 w-4" />
            <span>Generate B2B Statement</span>
          </Button>
        </div>
      </div>

      {/* ── Period Filter Selector Toolbar ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Date Switcher Buttons (Specific Date, Weekly, Monthly, Yearly, Custom) */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 self-start flex-wrap">
            <button
              type="button"
              onClick={() => setDateFilter("SPECIFIC_DATE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "SPECIFIC_DATE"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Specific Date
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("WEEKLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "WEEKLY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly (7d)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("MONTHLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "MONTHLY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly (30d)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("YEARLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "YEARLY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly (12m)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("CUSTOM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "CUSTOM"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        {/* Specific Date Picker */}
        {dateFilter === "SPECIFIC_DATE" && (
          <div className="pt-2 border-t border-border/50 flex items-center gap-3 animate-fade-in text-xs">
            <span className="text-muted-foreground font-medium">Select Specific Date:</span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background font-mono text-xs text-foreground focus:border-purple-600 outline-none"
            />
            <span className="text-muted-foreground text-[11px] italic">
              {filteredReports.length} requisitions on this day
            </span>
          </div>
        )}

        {/* Custom Date Pickers */}
        {dateFilter === "CUSTOM" && (
          <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background font-mono text-xs text-foreground focus:border-purple-600 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background font-mono text-xs text-foreground focus:border-purple-600 outline-none"
              />
            </div>
            <span className="text-muted-foreground text-[11px] italic">
              Filtered to {filteredReports.length} requisitions
            </span>
          </div>
        )}
      </div>

      {/* ── Financial KPI Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted/80 rounded" />
                <div className="w-10 h-10 rounded-xl bg-muted/60" />
              </div>
              <div className="h-8 w-36 bg-muted/80 rounded mt-2" />
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="h-3 w-20 bg-muted/60 rounded" />
                <div className="h-3 w-16 bg-muted/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total MRP */}
          <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total MRP</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
              ₹{grossB2BVolume.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Requisitions:</span>
              <span className="font-bold text-foreground">{filteredReports.length} orders</span>
            </div>
          </div>

          {/* Card 2: Lab Margin */}
          <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lab Margin</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
              ₹{totalLabMargin.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Payable to Central Lab</span>
              <span className="font-bold text-blue-600">Wholesale Tariff</span>
            </div>
          </div>

          {/* Card 3: B2B Centre Margin */}
          <div className="bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-200 dark:border-purple-900/50 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">B2B Centre Margin</span>
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 mt-3 tracking-tight">
              ₹{totalB2BCentreMargin.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Centre Earnings</span>
              <span className="font-bold text-purple-600">Retained Margin</span>
            </div>
          </div>

          {/* Card 4: Outstanding Due vs Paid */}
          <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Settlement Balance</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                totalDue > 0
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200/60 dark:border-amber-800/40"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40"
              }`}>
                {totalDue > 0 ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
            </div>
            <p className={`text-3xl font-extrabold mt-3 tracking-tight ${totalDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              ₹{totalDue.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Collected / Paid:</span>
              <span className="font-bold text-emerald-600">₹{totalPaid.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Status Filters for Ledger Table ── */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Requisition ID or Patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-purple-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="FINAL">Final</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="IN_TRANSIT">In Transit</option>
          </select>
        </div>
      </div>

      {/* ── Requisition Ledger Table with Pagination ── */}
      <div className="bg-card border border-border/70 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">B2B Requisition Financial Ledger</h3>
            <p className="text-xs text-muted-foreground">Showing {filteredReports.length} records for {periodLabel}</p>
          </div>
          <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full">
            Ledger Active
          </span>
        </div>

        <div className="table-responsive-container">
          {loading ? (
            <div className="p-6 space-y-3 animate-fade-in">
              <div className="h-9 w-full shimmer-gradient rounded-lg mb-2" />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between py-3.5 border-b border-border/30 last:border-0 gap-4">
                  <div className="h-4 w-24 shimmer-gradient rounded" />
                  <div className="h-4 w-20 shimmer-gradient rounded" />
                  <div className="space-y-1 flex-1 max-w-[180px]">
                    <div className="h-4 w-32 shimmer-gradient rounded" />
                    <div className="h-3 w-20 shimmer-gradient rounded" />
                  </div>
                  <div className="h-5 w-16 shimmer-gradient rounded-md" />
                  <div className="h-4 w-16 shimmer-gradient rounded ml-auto" />
                  <div className="h-4 w-16 shimmer-gradient rounded" />
                  <div className="h-4 w-16 shimmer-gradient rounded" />
                  <div className="h-5 w-14 shimmer-gradient rounded-full" />
                  <div className="h-5 w-20 shimmer-gradient rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <FileText className="h-10 w-10 mx-auto opacity-30 text-purple-500" />
              <p className="text-xs font-semibold">No requisitions match the selected criteria.</p>
              <button
                onClick={() => { setDateFilter("YEARLY"); setSearchTerm(""); setStatusFilter("ALL"); }}
                className="text-xs font-bold text-purple-600 underline"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60 text-muted-foreground">
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Requisition ID</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Patient</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Tests</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px] text-right">Total MRP</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px] text-right">Lab Margin</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px] text-right">B2B Centre Margin</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Payment</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Report Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedReports.map((r) => {
                  const fin = getReportBreakdown(r);
                  const isPaid = fin.paid >= fin.labMargin && fin.labMargin > 0;
                  const isFinal = r.status === "FINAL" || r.status === "APPROVED" || r.status === "COMPLETED";

                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-purple-600">
                        {r.custom_id || r.customId || "REQ"}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                        {r.created_at || r.createdAt ? new Date(r.created_at || r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-foreground">{r.patient?.name || "Patient"}</p>
                        <p className="text-[11px] text-muted-foreground">{r.patient?.custom_id || r.patient?.customId || "ID: N/A"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-foreground">
                          {Array.isArray(r.results) ? `${r.results.length} tests` : "Standard Panel"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-foreground">
                        ₹{fin.totalMrp.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-muted-foreground">
                        ₹{fin.labMargin.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-purple-600">
                        ₹{fin.b2bMargin.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : fin.paid > 0
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}>
                          {isPaid ? "Paid" : fin.paid > 0 ? "Partial" : "Due"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isFinal
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isFinal ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {r.status || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Table Pagination Bar ── */}
        {filteredReports.length > 0 && (
          <div className="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Showing</span>
              <span className="font-bold text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </span>
              <span>to</span>
              <span className="font-bold text-foreground">
                {Math.min(currentPage * pageSize, filteredReports.length)}
              </span>
              <span>of</span>
              <span className="font-bold text-foreground">{filteredReports.length}</span>
              <span>requisitions</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 rounded-lg bg-card border border-border text-xs font-bold text-foreground outline-none focus:border-purple-600 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                >
                  Previous
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-card border border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
