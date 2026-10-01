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
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { CollectionCenterOverview } from "@/components/collection-center-overview";
import { B2BOverview } from "@/components/b2b-overview";
import { DashboardShimmer } from "@/components/dashboard-shimmer";
import { LabSetupProgress } from "@/components/lab-setup-progress";

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
        <p className="font-display text-[2rem] font-semibold tracking-tight text-foreground mt-1 leading-none tnum">{value}</p>
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

export default function DashboardOverviewPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const u = getStoredUser();
        if (u) return u;
      } catch {}
    }
    return null;
  });
  const [stats, setStats] = useState<Stats>({
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
  });
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [labInfo, setLabInfo] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const u = getStoredUser();
    setUser(u);

    // Read client-side cached data on mount safely with date matching
    try {
      const todayStr = getTodayDateStr();
      const cachedStats = localStorage.getItem("lis_cached_dashboard_stats");
      if (cachedStats) {
        const parsed = JSON.parse(cachedStats);
        if (parsed.cachedDate === todayStr) {
          setStats(parsed);
          setLoading(false);
        } else {
          // If from previous day, preserve lifetime totals but zero-out today's metrics
          setStats({
            ...parsed,
            patientsToday: 0,
            todayReports: 0,
            todayPendingReports: 0,
            todayCompletedReports: 0,
            revenue: 0,
          });
        }
      }
      const cachedCharts = localStorage.getItem("lis_cached_dashboard_charts");
      if (cachedCharts) setChartData(JSON.parse(cachedCharts));
      const cachedReports = localStorage.getItem("lis_cached_dashboard_recent_reports");
      if (cachedReports) setRecentReports(JSON.parse(cachedReports));
      const cachedLab = localStorage.getItem("lis_cached_lab");
      if (cachedLab) setLabInfo(JSON.parse(cachedLab));
    } catch {}

    const refreshLabInfo = () => {
      fetchFromLaravel("/lab").then((res) => {
        if (res) {
          setLabInfo(res);
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
        try {
          localStorage.setItem("lis_cached_lab", JSON.stringify(e.detail));
        } catch {}
      } else {
        refreshLabInfo();
      }
    };

    const handleOnlineSync = () => {
      refreshLabInfo();
      loadDashboardData(true);
    };

    window.addEventListener("centre-profile-updated", handleProfileUpdate);
    window.addEventListener("focus", refreshLabInfo);
    window.addEventListener("lis_online_sync", handleOnlineSync);

    if (u?.role === "COLLECTION_CENTER" || u?.role === "B2B") {
      setLoading(false);
      return () => {
        window.removeEventListener("centre-profile-updated", handleProfileUpdate);
        window.removeEventListener("focus", refreshLabInfo);
        window.removeEventListener("lis_online_sync", handleOnlineSync);
      };
    }
    loadDashboardData();

    return () => {
      window.removeEventListener("centre-profile-updated", handleProfileUpdate);
      window.removeEventListener("focus", refreshLabInfo);
      window.removeEventListener("lis_online_sync", handleOnlineSync);
    };
  }, []);

  const loadDashboardData = async (forceRefresh = false) => {
    try {
      const hasExistingData = stats.totalPatients > 0 || recentReports.length > 0;
      if (forceRefresh && !hasExistingData) {
        setLoading(true);
      }
      const [analytics, reports] = await Promise.all([
        fetchFromLaravel("/analytics", { skipCache: forceRefresh }),
        fetchFromLaravel("/reports", { skipCache: forceRefresh }),
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
      try {
        localStorage.setItem(
          "lis_cached_dashboard_stats",
          JSON.stringify({ ...newStats, cachedDate: getTodayDateStr() })
        );
      } catch {}

      if (Array.isArray(analytics?.reportsOverTime)) {
        setChartData(analytics.reportsOverTime);
        try {
          localStorage.setItem("lis_cached_dashboard_charts", JSON.stringify(analytics.reportsOverTime));
        } catch {}
      }

      const reportsList = Array.isArray(reports) ? reports : reports?.data ?? [];
      const slicedReports = reportsList.slice(0, 6);
      setRecentReports(slicedReports);
      try {
        localStorage.setItem("lis_cached_dashboard_recent_reports", JSON.stringify(slicedReports));
      } catch {}
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted || (loading && !stats.totalPatients && !stats.totalReports && !recentReports.length)) {
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
    <div className="space-y-7 animate-fade-in">
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
          <button onClick={() => loadDashboardData(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
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

        <div className="col-span-12 lg:col-span-4 bg-card border border-border/70 rounded-xl p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-5">Quick Actions</h3>
          <div className="space-y-2.5">
            {[
              { href: "/dashboard/patients/register", icon: UserPlus, label: "Add Patient", sub: "Register a new patient", tone: "bg-accent text-primary" },
              { href: "/dashboard/reports", icon: FileSpreadsheet, label: "Enter Results", sub: "Enter pending test values", tone: "bg-gold/12 text-gold" },
              { href: "/dashboard/reports", icon: Printer, label: "Print Reports", sub: "View and print completed reports", tone: "bg-muted text-muted-foreground" },
            ].map(({ href, icon: Icon, label, sub, tone }) => (
              <Link key={label} href={href}
                className="flex items-center gap-3.5 p-3.5 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-accent/40 transition-all group">
                <span className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${tone}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 ml-auto text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            ))}
          </div>
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
                      <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{pid}</td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">{pName}</td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">{testTypeString}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-block whitespace-nowrap px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${pill}`}>{statusLabel}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
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