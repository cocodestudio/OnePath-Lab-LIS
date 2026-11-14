"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Clock, CheckCircle2, IndianRupee, RefreshCw, Download,
  UserPlus, FileSpreadsheet, Printer, ArrowUpRight, TrendingUp,
  FileText, Activity
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, Cell, PieChart, Pie,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFromLaravel, getStoredUser, clearApiCache } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { CollectionCenterOverview } from "@/components/collection-center-overview";
import { B2BOverview } from "@/components/b2b-overview";
import { DashboardShimmer } from "@/components/dashboard-shimmer";
import { LabSetupProgress } from "@/components/lab-setup-progress";
import { AcceptDueModal } from "@/components/accept-due-modal";

interface Stats {
  patientsToday: number;
  totalPatients: number;
  monthPatients?: number;
  todayReports: number;
  totalReports: number;
  monthReports?: number;
  todayPendingReports: number;
  pendingReports: number;
  monthPendingReports?: number;
  todayCompletedReports: number;
  completedReports: number;
  monthCompletedReports?: number;
  revenue: number;
  totalRevenue: number;
  monthRevenue?: number;
}
interface ChartItem { date: string; fullDate?: string; reports: number; revenue: number; }
interface RecentReport {
  id: string; customId: string; status: string;
  patient?: { name: string; customId?: string; custom_id?: string };
  createdAt: string;
  results?: Array<{ id: string; isAbnormal: boolean; test: { name: string; category: string } }>;
}

function StatCard({
  icon: Icon, label, value, trend, tone = "default", href,
}: {
  icon: React.ElementType; label: string; value: string; trend?: React.ReactNode;
  tone?: "default" | "danger" | "gold"; href?: string;
}) {
  const tones = {
    default: { card: "bg-card border-border/70", icon: "bg-accent text-primary" },
    danger: { card: "bg-destructive/[0.04] border-destructive/25", icon: "bg-destructive/12 text-destructive" },
    gold: { card: "bg-card border-border/70", icon: "bg-gold/12 text-gold" },
  }[tone];

  const inner = (
    <div className={`group relative flex flex-col justify-between p-5 rounded-xl border shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5 ${tones.card}`}>
      <div className="flex items-start justify-between">
        <span className={`flex items-center justify-center w-11 h-11 rounded-lg ${tones.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        {trend}
      </div>
      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        <p suppressHydrationWarning className="font-display text-[2rem] font-semibold tracking-tight text-foreground mt-1 leading-none tnum">{value}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const getTodayDateStr = () => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

// Module-level in-memory cache for instant 0ms route transitions
let memoryOverviewLabId: string | null = null;
let memoryOverviewStats: Stats | null = null;
let memoryOverviewCharts: ChartItem[] | null = null;
let memoryOverviewReports: RecentReport[] | null = null;
let memoryOverviewDues: any[] | null = null;
let memoryOverviewLab: any | null = null;
let lastOverviewFetchTime = 0;
let lastLabFetchTime = 0;

function syncMemoryLabTenant(currentLabId?: string | null) {
  if (currentLabId && memoryOverviewLabId && memoryOverviewLabId !== currentLabId) {
    memoryOverviewStats = null;
    memoryOverviewCharts = null;
    memoryOverviewReports = null;
    memoryOverviewDues = null;
    memoryOverviewLab = null;
    lastOverviewFetchTime = 0;
    lastLabFetchTime = 0;
  }
  if (currentLabId) {
    memoryOverviewLabId = currentLabId;
  }
}

function getInitialStoredStats(): Stats {
  const u = typeof window !== "undefined" ? getStoredUser() : null;
  const currentLabId = u?.lab_id || u?.labId;
  syncMemoryLabTenant(currentLabId);

  if (memoryOverviewStats) return memoryOverviewStats;
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("lis_cached_dashboard_stats");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (currentLabId && parsed.labId === currentLabId) {
          const todayStr = getTodayDateStr();
          if (parsed.cachedDate === todayStr) {
            memoryOverviewStats = parsed;
            return parsed;
          } else {
            const preserved = {
              ...parsed,
              patientsToday: 0,
              todayReports: 0,
              todayPendingReports: 0,
              todayCompletedReports: 0,
              revenue: 0,
            };
            memoryOverviewStats = preserved;
            return preserved;
          }
        }
      }
    } catch { }
  }
  return {
    patientsToday: 0,
    totalPatients: 0,
    todayReports: 0,
    totalReports: 0,
    todayPendingReports: 0,
    pendingReports: 0,
    todayCompletedReports: 0,
    completedReports: 0,
    revenue: 0,
    totalRevenue: 0,
  };
}

function getInitialStoredCharts(): ChartItem[] {
  if (memoryOverviewCharts) return memoryOverviewCharts;
  if (typeof window !== "undefined") {
    try {
      const u = getStoredUser();
      const currentLabId = u?.lab_id || u?.labId;
      const cached = localStorage.getItem("lis_cached_dashboard_charts");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.labId === currentLabId && Array.isArray(parsed.data)) {
          memoryOverviewCharts = parsed.data;
          return parsed.data;
        } else if (Array.isArray(parsed)) {
          memoryOverviewCharts = parsed;
          return parsed;
        }
      }
    } catch { }
  }
  return [];
}

function getInitialStoredReports(): RecentReport[] {
  if (memoryOverviewReports) return memoryOverviewReports;
  if (typeof window !== "undefined") {
    try {
      const u = getStoredUser();
      const currentLabId = u?.lab_id || u?.labId;
      const cached = localStorage.getItem("lis_cached_dashboard_recent_reports");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.labId === currentLabId && Array.isArray(parsed.data)) {
          memoryOverviewReports = parsed.data;
          return parsed.data;
        } else if (Array.isArray(parsed)) {
          memoryOverviewReports = parsed;
          return parsed;
        }
      }
    } catch { }
  }
  return [];
}

function getInitialStoredDues(): any[] {
  if (memoryOverviewDues) return memoryOverviewDues;
  if (typeof window !== "undefined") {
    try {
      const u = getStoredUser();
      const currentLabId = u?.lab_id || u?.labId;
      const cached = localStorage.getItem("lis_cached_dashboard_due_bills");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.labId === currentLabId && Array.isArray(parsed.data)) {
          memoryOverviewDues = parsed.data;
          return parsed.data;
        } else if (Array.isArray(parsed)) {
          memoryOverviewDues = parsed;
          return parsed;
        }
      }
    } catch { }
  }
  return [];
}

function getInitialStoredLab(): any {
  if (memoryOverviewLab) return memoryOverviewLab;
  if (typeof window !== "undefined") {
    try {
      const u = getStoredUser();
      const currentLabId = u?.lab_id || u?.labId;
      const cached = localStorage.getItem("lis_cached_lab");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!currentLabId || parsed.id === currentLabId) {
          memoryOverviewLab = parsed;
          return parsed;
        }
      }
    } catch { }
  }
  return null;
}

export default function DashboardOverviewPage() {
  const toast = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const u = getStoredUser();
        if (u) return u;
      } catch { }
    }
    return null;
  });
  const [stats, setStats] = useState<Stats>(getInitialStoredStats);
  const [chartData, setChartData] = useState<ChartItem[]>(getInitialStoredCharts);
  const [recentReports, setRecentReports] = useState<RecentReport[]>(getInitialStoredReports);
  const [dueBills, setDueBills] = useState<any[]>(getInitialStoredDues);
  const [selectedBillForDue, setSelectedBillForDue] = useState<any | null>(null);
  const [labInfo, setLabInfo] = useState<any>(getInitialStoredLab);
  const [doctorCommission, setDoctorCommission] = useState<number>(0);
  const [totalTestExpenses, setTotalTestExpenses] = useState<number>(0);
  const [activeChartMetric, setActiveChartMetric] = useState<"sales" | "dr_share" | "expenses" | "combined">("sales");
  const [loading, setLoading] = useState<boolean>(() => {
    const s = getInitialStoredStats();
    const r = getInitialStoredReports();
    const d = getInitialStoredDues();
    return !(s.totalPatients > 0 || s.totalReports > 0 || r.length > 0 || d.length > 0);
  });

  useEffect(() => {
    setIsMounted(true);
    const u = getStoredUser();
    setUser(u);
    const currentLabId = u?.lab_id || u?.labId;
    syncMemoryLabTenant(currentLabId);

    try {
      const activeLabId = currentLabId || "default";
      const cachedDocExp = localStorage.getItem(`lis_cached_doc_expenses_${activeLabId}`);
      if (cachedDocExp) {
        const parsed = JSON.parse(cachedDocExp);
        if (typeof parsed.doctorCommission === "number") setDoctorCommission(parsed.doctorCommission);
        if (typeof parsed.totalTestExpenses === "number") setTotalTestExpenses(parsed.totalTestExpenses);
      }
    } catch { }

    const refreshLabInfo = (force = false) => {
      const now = Date.now();
      if (!force && now - lastLabFetchTime < 60000 && memoryOverviewLab) {
        return;
      }
      lastLabFetchTime = now;
      fetchFromLaravel("/lab").then((res) => {
        if (res) {
          setLabInfo(res);
          memoryOverviewLab = res;
          try {
            localStorage.setItem("lis_cached_lab", JSON.stringify(res));
          } catch { }
        }
      }).catch(() => { });
    };

    refreshLabInfo();

    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        setLabInfo(e.detail);
        memoryOverviewLab = e.detail;
        try {
          localStorage.setItem("lis_cached_lab", JSON.stringify(e.detail));
        } catch { }
      } else {
        refreshLabInfo(true);
      }
    };

    const handleOnlineSync = () => {
      refreshLabInfo(true);
      loadDashboardData(true, false);
    };

    const handleFocus = () => {
      refreshLabInfo(false);
    };

    window.addEventListener("centre-profile-updated", handleProfileUpdate);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("lis_online_sync", handleOnlineSync);

    if (u?.role === "COLLECTION_CENTER" || u?.role === "B2B") {
      setLoading(false);
      return () => {
        window.removeEventListener("centre-profile-updated", handleProfileUpdate);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("lis_online_sync", handleOnlineSync);
      };
    }

    const isFreshSession = typeof window !== "undefined" && (
      sessionStorage.getItem("lis_fresh_login") === "1" ||
      sessionStorage.getItem("lis_logged_out") === "true" ||
      (!stats.totalPatients && !stats.totalReports && !recentReports.length && !dueBills.length)
    );

    if (isFreshSession) {
      try {
        sessionStorage.removeItem("lis_fresh_login");
        sessionStorage.removeItem("lis_logged_out");
      } catch { }
      memoryOverviewLabId = null;
      memoryOverviewStats = null;
      memoryOverviewCharts = null;
      memoryOverviewReports = null;
      memoryOverviewDues = null;
      memoryOverviewLab = null;
      lastOverviewFetchTime = 0;
      lastLabFetchTime = 0;
      refreshLabInfo(true);
    }

    const now = Date.now();
    const isCacheFresh = (now - lastOverviewFetchTime < 45000) && (stats.totalPatients > 0 || recentReports.length > 0 || dueBills.length > 0);
    if (!isCacheFresh || isFreshSession) {
      loadDashboardData(isFreshSession, false);
    }

    return () => {
      window.removeEventListener("centre-profile-updated", handleProfileUpdate);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("lis_online_sync", handleOnlineSync);
    };
  }, []);

  const loadDashboardData = async (forceRefresh = false, showToast = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
      clearApiCache("/analytics");
      clearApiCache("/reports");
      clearApiCache("/bills");
      memoryOverviewStats = null;
      memoryOverviewCharts = null;
      memoryOverviewReports = null;
      memoryOverviewDues = null;
      lastOverviewFetchTime = 0;
      try {
        localStorage.removeItem("lis_cached_dashboard_stats");
        localStorage.removeItem("lis_cached_dashboard_charts");
        localStorage.removeItem("lis_cached_dashboard_recent_reports");
        localStorage.removeItem("lis_cached_dashboard_due_bills");
      } catch { }
      try {
        fetchFromLaravel("/lab", { skipCache: true }).then((res) => {
          if (res) {
            setLabInfo(res);
            memoryOverviewLab = res;
          }
        }).catch(() => { });
      } catch { }
    }
    try {
      const hasExistingData = stats.totalPatients > 0 || recentReports.length > 0 || dueBills.length > 0;
      if (!hasExistingData) {
        setLoading(true);
      }
      const [analytics, reports, duesRes] = await Promise.all([
        fetchFromLaravel(forceRefresh ? "/analytics?refresh=1" : "/analytics", { skipCache: forceRefresh }),
        fetchFromLaravel(forceRefresh ? "/reports?limit=6&refresh=1" : "/reports?limit=6", { skipCache: forceRefresh }),
        fetchFromLaravel(forceRefresh ? "/bills?with_due=1&limit=6&refresh=1" : "/bills?with_due=1&limit=6", { skipCache: forceRefresh }).catch(() => null),
      ]);

      const totReports = analytics?.totalReports ?? 0;
      const todayReps = analytics?.todayReports ?? 0;
      const compReports = analytics?.completedReports ?? 0;
      const todayComp = analytics?.todayCompletedReports ?? (todayReps > 0 && compReports > 0 ? 1 : 0);
      const pendReports = analytics?.pendingReports ?? Math.max(0, totReports - compReports);
      const todayPend = analytics?.todayPendingReports ?? Math.max(0, todayReps - todayComp);

      const newStats: Stats = {
        patientsToday: analytics?.todayPatients ?? 0,
        totalPatients: analytics?.totalPatients ?? 0,
        monthPatients: analytics?.monthPatients ?? analytics?.todayPatients ?? 0,
        todayReports: todayReps,
        totalReports: totReports,
        monthReports: analytics?.monthReports ?? analytics?.todayReports ?? 0,
        todayPendingReports: todayPend,
        pendingReports: pendReports,
        monthPendingReports: analytics?.monthPendingReports ?? analytics?.todayPendingReports ?? 0,
        todayCompletedReports: todayComp,
        completedReports: compReports,
        monthCompletedReports: analytics?.monthCompletedReports ?? analytics?.todayCompletedReports ?? 0,
        revenue: analytics?.todayRevenue ?? 0,
        totalRevenue: analytics?.totalRevenue ?? 0,
        monthRevenue: analytics?.monthRevenue ?? analytics?.todayRevenue ?? 0,
      };

      setStats(newStats);
      memoryOverviewStats = newStats;
      lastOverviewFetchTime = Date.now();

      const activeUser = user || getStoredUser();
      const currentLabId = activeUser?.lab_id || activeUser?.labId;
      memoryOverviewLabId = currentLabId;
      try {
        localStorage.setItem(
          "lis_cached_dashboard_stats",
          JSON.stringify({ ...newStats, cachedDate: getTodayDateStr(), labId: currentLabId })
        );
      } catch { }

      if (Array.isArray(analytics?.reportsOverTime)) {
        setChartData(analytics.reportsOverTime);
        memoryOverviewCharts = analytics.reportsOverTime;
        try {
          localStorage.setItem("lis_cached_dashboard_charts", JSON.stringify({ labId: currentLabId, data: analytics.reportsOverTime }));
        } catch { }
      }

      const reportsList = Array.isArray(reports) ? reports : reports?.data ?? [];
      const slicedReports = reportsList.slice(0, 6);
      setRecentReports(slicedReports);
      memoryOverviewReports = slicedReports;
      try {
        localStorage.setItem("lis_cached_dashboard_recent_reports", JSON.stringify({ labId: currentLabId, data: slicedReports }));
      } catch { }

      const duesList = Array.isArray(duesRes) ? duesRes : (duesRes?.data ?? []);
      const slicedDues = duesList.slice(0, 6);
      setDueBills(slicedDues);
      memoryOverviewDues = slicedDues;
      try {
        localStorage.setItem("lis_cached_dashboard_due_bills", JSON.stringify({ labId: currentLabId, data: slicedDues }));
      } catch { }

      // Fetch Doctor Share Commission & Test Expenses for current month
      try {
        const activeLabId = currentLabId || "default";
        const [docRes, testRes] = await Promise.all([
          fetchFromLaravel("/doctors?filter=this_month&case_type=main_lab").catch(() => null),
          fetchFromLaravel("/tests/usage-counts?period=this_month&per_page=50").catch(() => null),
        ]);

        let docComm = 0;
        if (docRes && docRes.success) {
          docComm = Number(docRes.summary?.total_doctor_commission || 0);
          setDoctorCommission(docComm);
        }

        let testExp = 0;
        if (testRes && testRes.status === "success") {
          let localCosts: Record<string, any> = {};
          try {
            const stored = localStorage.getItem(`lis_test_unit_costs_${activeLabId}`);
            if (stored) localCosts = JSON.parse(stored);
          } catch { }

          if (Array.isArray(testRes.data)) {
            testRes.data.forEach((t: any) => {
              const count = Number(t.count || 0);
              const unitCost = Number(localCosts[t.test_id] ?? t.cost_price ?? 0);
              testExp += count * unitCost;
            });
          }
          setTotalTestExpenses(testExp);
        }

        try {
          localStorage.setItem(`lis_cached_doc_expenses_${activeLabId}`, JSON.stringify({
            doctorCommission: docComm,
            totalTestExpenses: testExp,
            updatedAt: Date.now(),
          }));
        } catch { }
      } catch (e) {
        console.warn("Could not load doctor share & test expenses:", e);
      }

      if (showToast) {
        toast.success("Overview Refreshed", "Dashboard Refreshed.");
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      if (showToast) {
        toast.error("Refresh Failed", "Could not fetch updated live data. Please try again.");
      }
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const handleDueCollectedSuccess = (updatedBill: any) => {
    setDueBills((prev) => {
      const net = Math.max(0, Number(updatedBill.total || 0) - Number(updatedBill.discount || 0));
      const paid = Number(updatedBill.paid_amount ?? updatedBill.paidAmount ?? 0);
      const remainingDue = Math.max(0, net - paid);
      let nextList: any[];
      if (remainingDue <= 0) {
        nextList = prev.filter((b) => b.id !== updatedBill.id);
      } else {
        nextList = prev.map((b) => (b.id === updatedBill.id ? { ...b, ...updatedBill } : b));
      }
      memoryOverviewDues = nextList;
      const activeUser = user || getStoredUser();
      const currentLabId = activeUser?.lab_id || activeUser?.labId;
      try {
        localStorage.setItem(
          "lis_cached_dashboard_due_bills",
          JSON.stringify({ labId: currentLabId, data: nextList })
        );
      } catch { }
      return nextList;
    });
    loadDashboardData(false);
  };

  if (loading && !stats.totalPatients && !stats.totalReports && !recentReports.length && !dueBills.length) {
    return <DashboardShimmer />;
  }

  if (user?.role === "COLLECTION_CENTER" || user?.role === "COLLECTION_CENTRE") {
    return <CollectionCenterOverview user={user} />;
  }

  if (user?.role === "B2B") {
    return <B2BOverview user={user} />;
  }

  const monthTotalReports = Number(stats.monthReports ?? stats.totalReports ?? 0);
  const monthCompletedReports = Number(stats.monthCompletedReports ?? stats.completedReports ?? 0);
  const monthPendingReports = Number(stats.monthPendingReports ?? stats.pendingReports ?? 0);

  const completionPct = monthTotalReports > 0
    ? Math.round((monthCompletedReports / monthTotalReports) * 100)
    : (stats.totalReports > 0 ? Math.round((stats.completedReports / stats.totalReports) * 100) : 0);

  const formattedChartData = chartData.map((item) => ({
    name: item.date,
    value: item.reports,
    revenue: item.revenue,
    isToday: item.date === "Today" || item.date.toUpperCase() === new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
  }));
  const totalMonthReportsCalculated = formattedChartData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const totalRevInChart = chartData.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0) || 1;
  const totalRepsInChart = chartData.reduce((acc, curr) => acc + (Number(curr.reports) || 0), 0) || 1;

  const formattedSalesData = chartData.map((item) => {
    const dayRev = Number(item.revenue || 0);
    const dayReps = Number(item.reports || 0);
    const revRatio = dayRev / totalRevInChart;
    const repRatio = dayReps / totalRepsInChart;
    const dayDrShare = Math.round(doctorCommission * revRatio);
    const dayExpenses = Math.round(totalTestExpenses * repRatio);

    return {
      name: item.date,
      fullDate: item.fullDate || item.date,
      revenue: dayRev,
      doctorShare: dayDrShare,
      expenses: dayExpenses,
      isToday:
        item.date === "Today" ||
        item.date.toUpperCase() ===
        new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    };
  });

  const totalMonthSales = stats.monthRevenue !== undefined
    ? Number(stats.monthRevenue)
    : formattedSalesData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const total7DaysSales = totalMonthSales;

  const currentDayOfMonth = Math.max(1, new Date().getDate());
  const avgDailySales = Math.round(totalMonthSales / currentDayOfMonth);

  const pieData = [
    { name: "Completed / Approved", value: monthCompletedReports, color: "hsl(160 58% 32%)" },
    { name: "Pending", value: monthPendingReports, color: "hsl(36 72% 50%)" },
  ];

  const labDisplayName =
    labInfo?.centreName ||
    labInfo?.centre_name ||
    labInfo?.name ||
    user?.labName ||
    user?.lab_name ||
    user?.lab?.name ||
    user?.lab?.centreName ||
    user?.name ||
    "Diagnostic Laboratory";

  return (
    <div className="space-y-7 animate-fade-in" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Overview</p>
          <h1 suppressHydrationWarning className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {labDisplayName}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Here's what's happening today in your laboratory.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => loadDashboardData(true, true)}
            disabled={isRefreshing || loading}
            title="Refresh latest live analytics and reports"
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Lab Setup Progress Banner (Setup your Lab - shown until 100% complete) */}
      <LabSetupProgress
        lab={labInfo}
        onRefresh={() => {
          fetchFromLaravel("/lab", { skipCache: true }).then((res) => {
            if (res) setLabInfo(res);
          }).catch(() => { });
        }}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Patients Today"
          value={String(stats.patientsToday)}
          href="/dashboard/patients"
          trend={
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <TrendingUp className="h-3 w-3" />
              Total: {stats.totalPatients}
            </span>
          }
        />
        <StatCard
          icon={Clock}
          label="Pending Reports"
          value={String(stats.todayPendingReports)}
          tone={stats.todayPendingReports > 0 ? "danger" : "default"}
          href="/dashboard/reports"
          trend={
            stats.todayPendingReports > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/12 text-destructive">
                {stats.todayPendingReports} PENDING TODAY
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                ALL DONE TODAY
              </span>
            )
          }
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Reports"
          value={String(stats.todayCompletedReports)}
          href="/dashboard/reports"
          trend={
            <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Total: {stats.completedReports}
            </span>
          }
        />
        <StatCard
          icon={IndianRupee}
          label="Today's Revenue"
          tone="gold"
          value={`₹${stats.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          trend={
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
              <ArrowUpRight className="h-3 w-3" />
              Total: ₹{stats.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          }
        />
      </div>

      {/* Analytics & Financial Performance Row (Two 6-column symmetrical charts on desktop, Total Sales first on mobile) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Monthly Reports Trend Card (Desktop: left 6 cols, Mobile: second) */}
        <div className="col-span-12 lg:col-span-6 order-2 lg:order-1 bg-card border border-border/70 rounded-xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">Monthly Reports Trend</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Current month volume & daily diagnostic workload (from 1st {new Date().toLocaleString("en-US", { month: "short" })})</p>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap shrink-0 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60">
                Monthly Volume
              </span>
            </div>
            <div className="h-56 min-w-0 w-full" style={{ minHeight: 224 }}>
              {isMounted && formattedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={224} minWidth={0} minHeight={0} debounce={50}>
                  <BarChart data={formattedChartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.45)", radius: 6 }}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "11px", color: "hsl(var(--foreground))", boxShadow: "var(--shadow-elevated)" }}
                    />
                    <Bar dataKey="value" name="Reports" radius={[5, 5, 2, 2]} maxBarSize={38}>
                      {formattedChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.isToday ? "hsl(160 58% 30%)" : "hsl(160 40% 30% / 0.25)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data available</div>
              )}
            </div>
          </div>

          {/* Quick Workload Summary (6 balanced mini-cards matching Total Sales card) */}
          <div className="mt-4 pt-3.5 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Month Reports</span>
              <p className="font-bold text-xs sm:text-sm text-foreground mt-1.5 tnum truncate leading-none">
                {monthTotalReports || totalMonthReportsCalculated}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Approved (Month)
              </span>
              <p className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-1.5 tnum truncate leading-none">
                {monthCompletedReports}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                In-Review
              </span>
              <p className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-1.5 tnum truncate leading-none">
                {monthPendingReports}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Today Intake
              </span>
              <p className="font-bold text-xs sm:text-sm text-foreground mt-1.5 tnum truncate leading-none">
                {stats.todayReports}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Done Today</span>
              </span>
              <p className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-1.5 tnum truncate leading-none">
                {stats.todayCompletedReports}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="truncate">Turnaround</span>
              </span>
              <p className="font-bold text-xs sm:text-sm text-primary mt-1.5 tnum truncate leading-none">
                {completionPct}%
              </p>
            </div>
          </div>
        </div>

        {/* Total Sales & Revenue Trend Card (Desktop: right 6 cols, Mobile: first) */}
        <div className="col-span-12 lg:col-span-6 order-1 lg:order-2 bg-card border border-border/70 rounded-xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">Total Sales & Revenue Trend</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Current month revenue collection & daily trajectory (from 1st {new Date().toLocaleString("en-US", { month: "short" })})</p>
              </div>

              {/* Metric Switcher Options on top of graph (Equal 4-part responsive alignment) */}
              <div className="w-full sm:w-80 grid grid-cols-4 gap-1 p-1 rounded-lg bg-muted/60 border border-border/60 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveChartMetric("sales")}
                  className={`w-full text-center px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeChartMetric === "sales"
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sales
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric("dr_share")}
                  className={`w-full text-center px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeChartMetric === "dr_share"
                      ? "bg-background text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dr Share
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric("expenses")}
                  className={`w-full text-center px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeChartMetric === "expenses"
                      ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric("combined")}
                  className={`w-full text-center px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeChartMetric === "combined"
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Combined
                </button>
              </div>
            </div>

            <div className="h-56 min-w-0 w-full" style={{ minHeight: 224 }}>
              {isMounted && formattedSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={224} minWidth={0} minHeight={0} debounce={50}>
                  <AreaChart data={formattedSalesData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160 58% 36%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(160 58% 36%)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="drShareGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(238 84% 67%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(238 84% 67%)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: "11px",
                        color: "hsl(var(--foreground))",
                        boxShadow: "var(--shadow-elevated)",
                      }}
                      formatter={(value: any, name: any) => [
                        `₹${Number(value || 0).toLocaleString("en-IN")}`,
                        name || (activeChartMetric === "sales" ? "Daily Sales" : activeChartMetric === "dr_share" ? "Dr Share" : "Test Expenses"),
                      ]}
                      labelFormatter={(label) => `Day: ${label}`}
                    />
                    {(activeChartMetric === "sales" || activeChartMetric === "combined") && (
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Daily Sales"
                        stroke="hsl(160 58% 36%)"
                        strokeWidth={2.5}
                        fillOpacity={activeChartMetric === "combined" ? 0.2 : 1}
                        fill="url(#salesRevenueGradient)"
                        dot={activeChartMetric === "combined" ? false : { r: 3, fill: "hsl(160 58% 36%)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "hsl(160 62% 40%)", stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    )}
                    {(activeChartMetric === "dr_share" || activeChartMetric === "combined") && (
                      <Area
                        type="monotone"
                        dataKey="doctorShare"
                        name="Dr Share"
                        stroke="hsl(238 84% 67%)"
                        strokeWidth={2.5}
                        fillOpacity={activeChartMetric === "combined" ? 0.2 : 1}
                        fill="url(#drShareGradient)"
                        dot={activeChartMetric === "combined" ? false : { r: 3, fill: "hsl(238 84% 67%)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "hsl(238 84% 67%)", stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    )}
                    {(activeChartMetric === "expenses" || activeChartMetric === "combined") && (
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Test Expenses"
                        stroke="hsl(38 92% 50%)"
                        strokeWidth={2.5}
                        fillOpacity={activeChartMetric === "combined" ? 0.2 : 1}
                        fill="url(#expensesGradient)"
                        dot={activeChartMetric === "combined" ? false : { r: 3, fill: "hsl(38 92% 50%)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "hsl(38 92% 50%)", stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col justify-between py-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="h-32 flex items-end justify-between gap-3 px-2">
                    {[30, 55, 40, 75, 50, 70, 85].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <Skeleton className="w-full max-w-[36px]" style={{ height: `${h}%` }} />
                        <Skeleton className="h-2 w-6" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Financial Summary: Total Revenue, Today's Revenue, Month Sales, Daily Avg, Dr Share, Total Expenses */}
          <div className="mt-4 pt-3.5 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Total Revenue
              </span>
              <p className="font-bold text-xs sm:text-sm text-foreground mt-1.5 tnum truncate leading-none">
                ₹{Number(stats.totalRevenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Today's Revenue
              </span>
              <p className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-1.5 tnum truncate leading-none">
                ₹{Number(stats.revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Month Sales
              </span>
              <p className="font-bold text-xs sm:text-sm text-foreground mt-1.5 tnum truncate leading-none">
                ₹{totalMonthSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center text-[10px] text-muted-foreground uppercase font-semibold truncate">
                Daily Avg
              </span>
              <p className="font-bold text-xs sm:text-sm text-foreground mt-1.5 tnum truncate leading-none">
                ₹{avgDailySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/day
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">Dr Share</span>
              </span>
              <p className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mt-1.5 tnum truncate leading-none">
                ₹{doctorCommission.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col justify-between min-w-0">
              <span className="h-4 flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">Total Expenses</span>
              </span>
              <p className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-1.5 tnum truncate leading-none">
                ₹{totalTestExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Throughput & Financial Receivables Row (Two 6-column symmetrical cards, Diagnostic Report first on mobile, Payments due bottom) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Payments Due Card (Desktop: left 6 cols, Mobile: bottom/last) */}
        <div className="col-span-12 lg:col-span-6 order-2 lg:order-1 bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">Payments due</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Outstanding patient balances & collection dues</p>
              </div>
              <Link
                href="/dashboard/billing/dues"
                className="text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto -mx-2 mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2">Patient</th>
                    <th className="px-2 py-2 text-right">Due</th>
                    <th className="px-2 py-2 text-right">Accept Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {dueBills.length > 0 ? (
                    dueBills.map((b) => {
                      const total = Number(b.total || 0);
                      const discount = Number(b.discount || 0);
                      const net = Math.max(0, total - discount);
                      const paid = Number(b.paid_amount ?? b.paidAmount ?? 0);
                      const due = Math.max(0, net - paid);
                      const regNo =
                        b.patient?.custom_id ||
                        b.patient?.customId ||
                        b.custom_id ||
                        b.customId ||
                        (b.id ? String(b.id).slice(0, 6) : "—");
                      const patientName = b.patient?.name || b.patientName || "Patient";
                      let dateStr = "";
                      try {
                        const d = new Date(b.created_at || b.createdAt);
                        if (!isNaN(d.getTime())) {
                          const day = String(d.getDate()).padStart(2, "0");
                          const mon = String(d.getMonth() + 1).padStart(2, "0");
                          dateStr = `${day}/${mon}/${d.getFullYear()}`;
                        }
                      } catch { }

                      return (
                        <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-2 py-2.5">
                            <p className="font-semibold text-foreground leading-tight text-xs">{patientName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Reg. no. {regNo} {dateStr ? `| ${dateStr}` : ""}
                            </p>
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            Rs.{due.toFixed(0)}
                          </td>
                          <td className="px-2 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedBillForDue(b)}
                              title="Accept Due"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer active:scale-95"
                            >
                              <IndianRupee className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                        No payments due. All accounts clear!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 mt-3 text-center">
            <Link
              href="/dashboard/billing/dues"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View all due accounts in Due report</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Report Status & Diagnostic Operations Card (Desktop: right 6 cols, Mobile: first / above payments due) */}
        <div className="col-span-12 lg:col-span-6 order-1 lg:order-2 bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">
                  Diagnostic Report Status
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Monthly laboratory completion & clinical throughput
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-2">
              {/* Donut Chart & Completion Bar */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center w-full min-h-[175px] min-w-0">
                  {isMounted && (monthTotalReports > 0 || stats.totalReports > 0) ? (
                    <>
                      <ResponsiveContainer width="100%" height={175} minWidth={0} minHeight={0} debounce={50}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={72}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="font-display text-2xl font-bold text-foreground leading-none tnum">
                          {monthTotalReports}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-1">
                          This Month
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No reports recorded</p>
                  )}
                </div>

                {/* Progress bar under donut */}
                <div className="w-full max-w-[210px] mt-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                    <span>Turnaround</span>
                    <span className="text-foreground font-bold">{completionPct}%</span>
                  </div>
                  <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Breakdown & Quick Action Links */}
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "hsl(160 58% 32%)" }} />
                      <span className="text-muted-foreground font-medium">Completed / Approved</span>
                    </div>
                    <span className="font-bold tnum text-foreground">{monthCompletedReports}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "hsl(36 72% 50%)" }} />
                      <span className="text-muted-foreground font-medium">Pending In-Review</span>
                    </div>
                    <span className="font-bold tnum text-foreground">{monthPendingReports}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground font-medium">Today's Intake Completed</span>
                    <span className="font-bold tnum text-foreground">{stats.todayCompletedReports} / {stats.todayReports}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground font-medium">Pending Workload</span>
                    </div>
                    <span className="font-bold tnum text-amber-600 dark:text-amber-400">{stats.todayPendingReports}</span>
                  </div>
                </div>

                {/* 2 Quick Navigation Shortcuts */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <Link
                    href="/dashboard/reports"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">All Reports</span>
                  </Link>
                  <Link
                    href="/dashboard/patients/register"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold border border-border/60 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">New Booking</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Overall Turnaround Health</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Operational Active
            </span>
          </div>
        </div>
      </div>

      {/* Accept Due Payment Modal */}
      {selectedBillForDue && (
        <AcceptDueModal
          isOpen={Boolean(selectedBillForDue)}
          onClose={() => setSelectedBillForDue(null)}
          bill={selectedBillForDue}
          onSuccess={handleDueCollectedSuccess}
        />
      )}

      {/* Footer Branding Line */}
      <div className="pt-8 pb-4 border-t border-border/60 text-center text-xs text-muted-foreground">
        <span>Designed and Developed by </span>
        <a
          href="https://cocodestudio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-primary hover:text-primary/80 hover:underline transition-colors"
        >
          CoCode Studio Pvt Ltd
        </a>
      </div>
    </div>
  );
}