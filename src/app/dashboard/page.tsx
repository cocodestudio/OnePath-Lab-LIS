"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Clock, CheckCircle2, IndianRupee, RefreshCw, Download,
  UserPlus, FileSpreadsheet, Printer, ArrowUpRight, TrendingUp, Building2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie,
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
  todayReports: number;
  totalReports: number;
  todayPendingReports: number;
  pendingReports: number;
  todayCompletedReports: number;
  completedReports: number;
  revenue: number;
  totalRevenue: number;
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
    } catch {}
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
    } catch {}
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
    } catch {}
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
    } catch {}
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
    } catch {}
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
      } catch {}
    }
    return null;
  });
  const [stats, setStats] = useState<Stats>(getInitialStoredStats);
  const [chartData, setChartData] = useState<ChartItem[]>(getInitialStoredCharts);
  const [recentReports, setRecentReports] = useState<RecentReport[]>(getInitialStoredReports);
  const [dueBills, setDueBills] = useState<any[]>(getInitialStoredDues);
  const [selectedBillForDue, setSelectedBillForDue] = useState<any | null>(null);
  const [labInfo, setLabInfo] = useState<any>(getInitialStoredLab);
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
          } catch {}
        }
      }).catch(() => {});
    };

    refreshLabInfo();

    const handleProfileUpdate = (e: any) => {
      if (e?.detail) {
        setLabInfo(e.detail);
        memoryOverviewLab = e.detail;
        try {
          localStorage.setItem("lis_cached_lab", JSON.stringify(e.detail));
        } catch {}
      } else {
        refreshLabInfo(true);
      }
    };

    const handleOnlineSync = () => {
      refreshLabInfo(true);
      loadDashboardData(true);
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

    const now = Date.now();
    const isCacheFresh = (now - lastOverviewFetchTime < 45000) && (stats.totalPatients > 0 || recentReports.length > 0 || dueBills.length > 0);
    if (!isCacheFresh) {
      loadDashboardData(false);
    }

    return () => {
      window.removeEventListener("centre-profile-updated", handleProfileUpdate);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("lis_online_sync", handleOnlineSync);
    };
  }, []);

  const loadDashboardData = async (forceRefresh = false) => {
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
      } catch {}
      try {
        fetchFromLaravel("/lab", { skipCache: true }).then((res) => {
          if (res) {
            setLabInfo(res);
            memoryOverviewLab = res;
          }
        }).catch(() => {});
      } catch {}
    }
    try {
      const hasExistingData = stats.totalPatients > 0 || recentReports.length > 0 || dueBills.length > 0;
      if (forceRefresh && !hasExistingData) {
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
        todayReports: todayReps,
        totalReports: totReports,
        todayPendingReports: todayPend,
        pendingReports: pendReports,
        todayCompletedReports: todayComp,
        completedReports: compReports,
        revenue: analytics?.todayRevenue ?? 0,
        totalRevenue: analytics?.totalRevenue ?? 0,
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
      } catch {}

      if (Array.isArray(analytics?.reportsOverTime)) {
        setChartData(analytics.reportsOverTime);
        memoryOverviewCharts = analytics.reportsOverTime;
        try {
          localStorage.setItem("lis_cached_dashboard_charts", JSON.stringify({ labId: currentLabId, data: analytics.reportsOverTime }));
        } catch {}
      }

      const reportsList = Array.isArray(reports) ? reports : reports?.data ?? [];
      const slicedReports = reportsList.slice(0, 6);
      setRecentReports(slicedReports);
      memoryOverviewReports = slicedReports;
      try {
        localStorage.setItem("lis_cached_dashboard_recent_reports", JSON.stringify({ labId: currentLabId, data: slicedReports }));
      } catch {}

      const duesList = Array.isArray(duesRes) ? duesRes : (duesRes?.data ?? []);
      const slicedDues = duesList.slice(0, 6);
      setDueBills(slicedDues);
      memoryOverviewDues = slicedDues;
      try {
        localStorage.setItem("lis_cached_dashboard_due_bills", JSON.stringify({ labId: currentLabId, data: slicedDues }));
      } catch {}

      if (forceRefresh) {
        toast.success("Overview Refreshed", "Dashboard metrics and reports updated with latest live data.");
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      if (forceRefresh) {
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
      } catch {}
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

  const completionPct = stats.totalReports > 0 ? Math.round((stats.completedReports / stats.totalReports) * 100) : 0;
  const formattedChartData = chartData.map((item) => ({
    name: item.date,
    value: item.reports,
    revenue: item.revenue,
    isToday: item.date === "Today" || item.date.toUpperCase() === new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
  }));

  const pieData = [
    { name: "Completed / Approved", value: stats.completedReports, color: "hsl(160 58% 32%)" },
    { name: "Pending", value: stats.pendingReports, color: "hsl(36 72% 50%)" },
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
          <h1 suppressHydrationWarning className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {labDisplayName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening today in your laboratory.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
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
          }).catch(() => {});
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

      {/* Middle row */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 bg-card border border-border/70 rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Weekly Reports Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days volume</p>
            </div>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-muted/60 text-muted-foreground border border-border/60">Weekly</span>
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

        <div className="col-span-12 lg:col-span-4 bg-card border border-border/70 rounded-xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg font-semibold text-foreground">Payments due</h3>
              <Link
                href="/dashboard/billing/dues"
                className="text-[11px] font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-3.5">For all time</p>

            <div className="overflow-x-auto -mx-2">
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
                      } catch {}

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

          {dueBills.length > 0 && (
            <div className="pt-3 border-t border-border/50 mt-3 text-center">
              <Link
                href="/dashboard/billing/dues"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                View all due accounts in Due report <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <h3 className="font-display text-lg font-semibold text-foreground">Recent Patients & Reports</h3>
            <Link href="/dashboard/reports" className="text-[11px] font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="table-responsive-container">
            <table className="w-full min-w-[580px] text-left">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Patient ID", "Name", "Test Type", "Status", ""].map((h) => (
                    <th key={h} className="px-4 sm:px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.length > 0 ? recentReports.map((rep) => {
                  const hasAbnormal = rep.results?.some((r) => r.isAbnormal);
                  const testTypeString = rep.results?.map((r) => r.test?.name || "Test").filter(Boolean).join(", ") || "Diagnostic Panel";
                  let pill = "bg-accent text-accent-foreground";
                  let statusLabel = rep.status === "PENDING" ? "In Review" : (rep.status === "FINAL" ? "Final" : (rep.status === "APPROVED" ? "Approved" : rep.status));
                  if (rep.status === "PENDING") pill = "bg-gold/15 text-gold";
                  if (rep.status === "APPROVED" || rep.status === "FINAL") pill = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                  if (hasAbnormal) { pill = "bg-destructive/12 text-destructive"; statusLabel = "Critical"; }
                  const pid = rep.patient?.customId || (rep.patient as any)?.custom_id || "—";
                  const pName = rep.patient?.name || "Unknown Patient";

                  return (
                    <tr key={rep.id} className="border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{pid}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">{pName}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">{testTypeString}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className={`inline-block whitespace-nowrap px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${pill}`}>{statusLabel}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <Link href={`/dashboard/reports/${rep.id}/edit`} className="text-[11px] font-semibold text-primary hover:text-secondary transition-colors">Open</Link>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="text-center py-12 text-xs text-muted-foreground">No recent intakes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-card border border-border/70 rounded-xl p-6 shadow-card flex flex-col">
          <h3 className="font-display text-lg font-semibold text-foreground">Report Status</h3>
          <p className="text-xs text-muted-foreground mb-4">Completion overview</p>
          <div className="relative flex-1 flex items-center justify-center min-h-[150px] min-w-0">
            {isMounted && stats.totalReports > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0} debounce={50}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={66} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display text-2xl font-semibold text-foreground leading-none tnum">{stats.totalReports}</span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-1">Total</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No reports</p>
            )}
          </div>
          <div className="mt-4 space-y-2.5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-semibold tnum text-foreground">{d.value}</span>
              </div>
            ))}
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