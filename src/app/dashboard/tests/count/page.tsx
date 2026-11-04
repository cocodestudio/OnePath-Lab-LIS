"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Search,
  RefreshCw,
  TrendingUp,
  Award,
  FlaskConical,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Activity,
  Layers,
  IndianRupee,
  Download,
  Calculator
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TestUsageItem {
  test_id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  count: number;
  percentage: number;
}

interface UsageSummary {
  period: string;
  total_tests_conducted: number;
  unique_tests_used: number;
  total_catalog_tests: number;
  top_test: TestUsageItem | null;
  data: TestUsageItem[];
}

export default function TestsCountPage() {
  const [period, setPeriod] = useState<"today" | "this_week" | "this_month" | "this_year" | "all" | "custom">("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Per-test cost configured by the laboratory, persisted in localStorage per lab tenant
  const [testCosts, setTestCosts] = useState<Record<string, number | string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const u = getStoredUser();
        const k = "lis_test_unit_costs_" + (u?.lab_id || "default");
        const stored = localStorage.getItem(k);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  const [summary, setSummary] = useState<UsageSummary>({
    period: "this_month",
    total_tests_conducted: 0,
    unique_tests_used: 0,
    total_catalog_tests: 0,
    top_test: null,
    data: [],
  });

  const fetchUsageData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams({
        period,
        page: String(page),
        per_page: "15",
      });

      if (period === "custom") {
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetchFromLaravel(`/tests/usage-counts?${params.toString()}`, {
        skipCache: true,
      });

      if (res && res.status === "success") {
        setSummary({
          period: res.period || period,
          total_tests_conducted: Number(res.total_tests_conducted || 0),
          unique_tests_used: Number(res.unique_tests_used || 0),
          total_catalog_tests: Number(res.total_catalog_tests || 0),
          top_test: res.top_test || null,
          data: Array.isArray(res.data) ? res.data : [],
        });
        if (res.pagination) {
          setPagination({
            current_page: Number(res.pagination.current_page || 1),
            per_page: Number(res.pagination.per_page || 15),
            total: Number(res.pagination.total || 0),
            last_page: Number(res.pagination.last_page || 1),
          });
        }
      }
    } catch (err) {
      console.error("Failed to load test usage counts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, fromDate, toDate, search, page]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  // Handle lab editing per-test cost
  const handleCostChange = (testId: string, val: string) => {
    setTestCosts((prev) => {
      const next = { ...prev, [testId]: val };
      if (typeof window !== "undefined") {
        try {
          const u = getStoredUser();
          const k = "lis_test_unit_costs_" + (u?.lab_id || "default");
          localStorage.setItem(k, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const filteredList = summary.data;

  // Calculate Page and Overall Cost
  const pageTotalCost = useMemo(() => {
    return filteredList.reduce((acc, item) => {
      const rawCost = testCosts[item.test_id];
      const unitCost = Number(rawCost !== undefined && rawCost !== "" ? rawCost : 0);
      return acc + (item.count || 0) * unitCost;
    }, 0);
  }, [filteredList, testCosts]);

  const pageTotalCount = useMemo(() => {
    return filteredList.reduce((acc, item) => acc + (item.count || 0), 0);
  }, [filteredList]);

  // Export CSV Report with Costing Columns
  const handleExportCSV = () => {
    if (!filteredList || filteredList.length === 0) return;

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows: string[] = [];
    csvRows.push([
      escapeCsv("Rank"),
      escapeCsv("Test Name"),
      escapeCsv("Code"),
      escapeCsv("Category"),
      escapeCsv("Booked Count"),
      escapeCsv("Cost per Test (INR)"),
      escapeCsv("Total Cost (INR)"),
    ].join(","));

    filteredList.forEach((item, idx) => {
      const rawCost = testCosts[item.test_id];
      const unitCost = Number(rawCost !== undefined && rawCost !== "" ? rawCost : 0);
      const totalCost = (item.count || 0) * unitCost;

      csvRows.push([
        escapeCsv(idx + 1),
        escapeCsv(item.name),
        escapeCsv(item.code),
        escapeCsv(item.category),
        escapeCsv(item.count),
        escapeCsv(unitCost.toFixed(2)),
        escapeCsv(totalCost.toFixed(2)),
      ].join(","));
    });

    // Summary Row
    csvRows.push([
      escapeCsv("TOTAL"),
      escapeCsv("Page Summary"),
      escapeCsv(""),
      escapeCsv(""),
      escapeCsv(pageTotalCount),
      escapeCsv(""),
      escapeCsv(pageTotalCost.toFixed(2)),
    ].join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Test_Counts_Costing_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-20 animate-fade-in text-foreground px-2.5 sm:px-4 md:px-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                <span>Tests Usage &amp; Cost Analytics</span>
                <span className="text-xs font-semibold text-primary tracking-normal">
                  · Live Costing
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                Monitor laboratory test volume, configure cost per test, and analyze total production expenses across bookings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || filteredList.length === 0}
            className="flex-1 sm:flex-initial h-9 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl border-border hover:bg-muted"
            title="Download CSV report with costing breakdown"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsageData(true)}
            disabled={loading || refreshing}
            className="flex-1 sm:flex-initial h-9 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl border-border hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards: Volume, Total Cost, Most Ordered */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Tests Ordered */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Tests Ordered
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-foreground">
            {loading ? "..." : summary.total_tests_conducted.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Tests registered in selected period</span>
          </div>
        </div>

        {/* Total Cost for Period */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Cost for Period
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
            {loading ? "..." : `₹${pageTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Calculated from per-test costs &amp; volumes</span>
          </div>
        </div>

        {/* Most Ordered Test */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Most Ordered Test
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-lg font-bold text-foreground truncate" title={summary.top_test?.name || "None"}>
            {loading ? "..." : summary.top_test ? summary.top_test.name : "No orders yet"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
            {summary.top_test ? (
              <>
                <span className="font-bold text-primary font-mono">{summary.top_test.count} Bookings</span>
                <span>·</span>
                <span className="text-muted-foreground">({summary.top_test.percentage}% of all)</span>
              </>
            ) : (
              <span>Rank 1 investigation</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Deck */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Period Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full -mx-1 px-1">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Period:
            </span>
            <Button
              variant={period === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("today");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer shrink-0 rounded-lg"
            >
              Today
            </Button>
            <Button
              variant={period === "this_week" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("this_week");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer shrink-0 rounded-lg"
            >
              Weekly
            </Button>
            <Button
              variant={period === "this_month" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("this_month");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer shrink-0 rounded-lg"
            >
              Monthly
            </Button>
            <Button
              variant={period === "this_year" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("this_year");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer shrink-0 rounded-lg"
            >
              Yearly
            </Button>
            <Button
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("all");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer shrink-0 rounded-lg"
            >
              All Time
            </Button>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("custom");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer shrink-0 rounded-lg"
            >
              Custom
            </Button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search test name or code..."
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {period === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/60 flex-wrap text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
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
                }}
                className="h-8 text-xs text-muted-foreground cursor-pointer"
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tests Usage & Cost Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs w-full">
        <div className="p-3.5 sm:p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FlaskConical className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-bold text-xs sm:text-sm text-foreground">
              Investigation Usage &amp; Cost Ranking
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              ({filteredList.length} Tests)
            </span>
          </div>
          <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Enter per-test cost to calculate volume expenses</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-4 w-12 rounded shimmer-gradient" />
                <div className="h-4 w-48 rounded shimmer-gradient flex-1" />
                <div className="h-4 w-24 rounded shimmer-gradient" />
                <div className="h-4 w-16 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <FlaskConical className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No test usage records found</p>
            <p className="text-xs text-muted-foreground">
              {search ? "No test matches your search keywords" : "No patient registrations found in this time period."}
            </p>
          </div>
        ) : (
          <div className="table-responsive-container w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[520px] sm:min-w-full">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  <th className="py-2.5 sm:py-3 px-2 sm:px-3 w-10 sm:w-14 text-center">#</th>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-4">Test Name</th>
                  <th className="py-2.5 sm:py-3 px-3 hidden sm:table-cell">Code &amp; Category</th>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-3 text-center w-20 sm:w-28">Count</th>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-3 w-28 sm:w-36 text-right">Cost / Test (₹)</th>
                  <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-28 sm:w-36 text-right">Total Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredList.map((item, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3 && item.count > 0;
                  const rawCost = testCosts[item.test_id];
                  const unitCost = Number(rawCost !== undefined && rawCost !== "" ? rawCost : 0);
                  const rowTotalCost = (item.count || 0) * unitCost;

                  return (
                    <tr
                      key={item.test_id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center">
                        {rank === 1 && item.count > 0 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] sm:text-[11px] shadow-xs">
                            🥇
                          </span>
                        ) : rank === 2 && item.count > 0 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-slate-400/15 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] sm:text-[11px]">
                            🥈
                          </span>
                        ) : rank === 3 && item.count > 0 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-extrabold text-[10px] sm:text-[11px]">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-muted-foreground text-[10px] sm:text-[11px]">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Test Name */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                        <div className="font-bold text-foreground text-xs leading-snug line-clamp-2">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 sm:hidden text-[10px] text-muted-foreground">
                          <span className="font-mono font-semibold text-foreground">{item.code}</span>
                          <span>·</span>
                          <span className="truncate max-w-[120px]">{item.category}</span>
                        </div>
                      </td>

                      {/* Code & Category (Tablet/Desktop) */}
                      <td className="py-2.5 sm:py-3 px-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/80 text-foreground border border-border/70">
                            {item.code}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.category}
                          </span>
                        </div>
                      </td>

                      {/* Booked Count */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center">
                        <span className="font-mono font-extrabold text-xs sm:text-sm text-foreground">
                          {item.count.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Cost per Test (Editable price/cost setting) */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right">
                        <div className="relative inline-flex items-center w-full max-w-[95px] sm:max-w-[120px] ml-auto">
                          <span className="absolute left-2 text-muted-foreground font-semibold text-xs pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={testCosts[item.test_id] ?? ""}
                            onChange={(e) => handleCostChange(item.test_id, e.target.value)}
                            className="w-full h-7 sm:h-8 pl-5 sm:pl-6 pr-2 text-right rounded-lg border border-border bg-background text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"
                            title="Set test cost for your laboratory"
                          />
                        </div>
                      </td>

                      {/* Total Cost (Count * Cost per Test) */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-xs sm:text-sm">
                          {rowTotalCost > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                              ₹{rowTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">₹0.00</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Total Count & Total Cost - Responsive column parity */}
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-bold text-xs text-foreground">
                  {/* Mobile: 2 columns for label */}
                  <td colSpan={2} className="py-2.5 sm:py-3 px-2 sm:px-4 uppercase tracking-wider font-extrabold text-[10px] sm:hidden">
                    Total
                  </td>
                  {/* Desktop: 3 columns for label */}
                  <td colSpan={3} className="py-2.5 sm:py-3 px-4 uppercase tracking-wider font-extrabold text-[11px] hidden sm:table-cell">
                    Page Summary Total
                  </td>
                  {/* Booked Count */}
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-mono font-extrabold text-xs sm:text-sm">
                    {pageTotalCount.toLocaleString("en-IN")}
                  </td>
                  {/* Cost / Test column header in footer */}
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                    Total:
                  </td>
                  {/* Total Cost value */}
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    ₹{pageTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.total > 0 && (
          <div className="p-3.5 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
            <div>
              Showing{" "}
              <span className="font-bold text-foreground">
                {(pagination.current_page - 1) * pagination.per_page + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-foreground">
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
              </span>{" "}
              of <span className="font-bold text-foreground">{pagination.total}</span> tests
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={pagination.current_page <= 1 || loading}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <span className="px-2 text-xs font-semibold text-foreground">
                Page {pagination.current_page} of {pagination.last_page}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(pagination.last_page, prev + 1))}
                disabled={pagination.current_page >= pagination.last_page || loading}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
