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
  Layers
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
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

  const filteredList = summary.data;

  const maxCount = useMemo(() => {
    if (!summary.data || summary.data.length === 0) return 1;
    return Math.max(...summary.data.map((d) => d.count), 1);
  }, [summary.data]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Tests Usage &amp; Booking Counts</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Live Analytics
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitor laboratory test frequencies, popularity rankings, and investigation volume across all patient bookings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsageData(true)}
            disabled={loading || refreshing}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Test Types
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-foreground">
            {loading ? "..." : `${summary.unique_tests_used} / ${summary.total_catalog_tests}`}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Distinct investigations used</span>
          </div>
        </div>
      </div>

      {/* Filter Deck */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Period Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Period:
            </span>
            <Button
              variant={period === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("today");
                setPage(1);
              }}
              className="text-xs h-8 px-3 cursor-pointer"
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
              className="text-xs h-8 px-3 cursor-pointer"
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
              className="text-xs h-8 px-3 cursor-pointer"
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
              className="text-xs h-8 px-3 cursor-pointer"
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
              className="text-xs h-8 px-3 cursor-pointer"
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
              className="text-xs h-8 px-3 cursor-pointer"
            >
              Custom Date
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

      {/* Tests Count Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              Investigation Usage Ranking
            </h3>
            <span className="text-xs bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full font-mono">
              {filteredList.length} Tests
            </span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Ranked by booking frequency (+1 per registration &amp; update)
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
          <div className="table-responsive-container">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Code &amp; Category</th>
                  <th className="py-3 px-4 w-48">Usage Frequency</th>
                  <th className="py-3 px-4 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredList.map((item, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3 && item.count > 0;
                  const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                  return (
                    <tr
                      key={item.test_id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center">
                        {rank === 1 && item.count > 0 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] shadow-xs">
                            🥇
                          </span>
                        ) : rank === 2 && item.count > 0 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-400/15 text-slate-600 dark:text-slate-300 font-extrabold text-[11px]">
                            🥈
                          </span>
                        ) : rank === 3 && item.count > 0 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-extrabold text-[11px]">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-muted-foreground text-[11px]">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Test Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-xs">
                          {item.name}
                        </div>
                      </td>

                      {/* Code & Category */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/80 text-foreground border border-border/70">
                            {item.code}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.category}
                          </span>
                        </div>
                      </td>

                      {/* Visual Bar */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rank === 1 && item.count > 0
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600"
                                  : isTop3
                                  ? "bg-gradient-to-r from-primary to-primary/80"
                                  : "bg-muted-foreground/40"
                              }`}
                              style={{ width: `${Math.max(barWidth, item.count > 0 ? 3 : 0)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {item.percentage}% of all investigations
                          </div>
                        </div>
                      </td>

                      {/* Count Value */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 font-mono font-extrabold text-sm text-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/80">
                          <span>{item.count.toLocaleString("en-IN")}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
