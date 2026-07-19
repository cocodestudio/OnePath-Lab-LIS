"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Clock, CheckCircle2, IndianRupee, RefreshCw, Download,
  UserPlus, FileSpreadsheet, Printer, ArrowUpRight, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFromLaravel } from "@/lib/api-client";
import { getStoredUser } from "@/lib/api-client";

interface Stats { patientsToday: number; totalReports: number; pendingReports: number; revenue: number; }
interface ChartItem { date: string; reports: number; revenue: number; }
interface RecentReport {
  id: string; customId: string; status: string;
  patient: { name: string; customId: string };
  createdAt: string;
  results: Array<{ id: string; isAbnormal: boolean; test: { name: string; category: string } }>;
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

export default function DashboardOverviewPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({ patientsToday: 0, totalReports: 0, pendingReports: 0, revenue: 0 });
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analytics, reports] = await Promise.all([
        fetchFromLaravel("/analytics"),
        fetchFromLaravel("/reports"),
      ]);

      setStats({
        patientsToday: analytics.todayPatients ?? 0,
        totalReports: analytics.totalReports ?? 0,
        pendingReports: (analytics.totalReports ?? 0) - (analytics.completedReports ?? 0),
        revenue: analytics.todayRevenue ?? analytics.totalRevenue ?? 0,
      });
      setChartData(analytics.reportsOverTime ?? []);

      const reportsList = Array.isArray(reports) ? reports : reports.data ?? [];
      setRecentReports(reportsList.slice(0, 5));
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  const completedReports = Math.max(0, stats.totalReports - stats.pendingReports);
  const completionPct = stats.totalReports > 0 ? Math.round((completedReports / stats.totalReports) * 100) : 0;
  const formattedChartData = chartData.map((item) => ({
    name: item.date,
    value: item.reports,
    isToday: item.date.toUpperCase() === new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() || item.date === "Today",
  }));
  const pieData = [
    { name: "Completed", value: completedReports, color: "hsl(160 58% 32%)" },
    { name: "Pending", value: stats.pendingReports, color: "hsl(36 72% 50%)" },
  ];

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Overview</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Doctor"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening today.</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={loadDashboardData}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-all">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Patients Today" value={String(stats.patientsToday)}
          trend={<span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary"><TrendingUp className="h-3 w-3" />+12.5%</span>} />
        <StatCard icon={Clock} label="Pending Reports" value={String(stats.pendingReports)} tone="danger" href="/dashboard/reports"
          trend={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/12 text-destructive">URGENT</span>} />
        <StatCard icon={CheckCircle2} label="Completed" value={String(completedReports)}
          trend={<span className="text-[11px] font-semibold text-muted-foreground">{completionPct}% done</span>} />
        <StatCard icon={IndianRupee} label="Today's Revenue" tone="gold"
          value={`₹${stats.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          trend={<span className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground"><ArrowUpRight className="h-3 w-3" />₹14k</span>} />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 bg-card border border-border/70 rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Patients Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-muted/60 text-muted-foreground border border-border/60">Weekly</span>
          </div>
          <div className="h-56">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={formattedChartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.45)", radius: 6 }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "11px", color: "hsl(var(--foreground))", boxShadow: "var(--shadow-elevated)" }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 2, 2]} maxBarSize={38}>
                    {formattedChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.isToday ? "hsl(160 58% 30%)" : "hsl(160 40% 30% / 0.18)"} />
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
          <h3 className="font-display text-lg font-semibold text-foreground mb-5">Shortcuts</h3>
          <div className="space-y-2.5">
            {[
              { href: "/dashboard/patients/register", icon: UserPlus, label: "Add Patient", sub: "Register a new patient", tone: "bg-accent text-primary" },
              { href: "/dashboard/reports", icon: FileSpreadsheet, label: "Add Results", sub: "Enter pending test values", tone: "bg-gold/12 text-gold" },
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
            <h3 className="font-display text-lg font-semibold text-foreground">Recent Patients</h3>
            <Link href="/dashboard/reports" className="text-[11px] font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Patient ID", "Name", "Test Type", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.length > 0 ? recentReports.map((rep) => {
                  const hasAbnormal = rep.results?.some((r) => r.isAbnormal);
                  const testTypeString = rep.results?.map((r) => r.test.name).join(", ") || "Diagnostic Panel";
                  let pill = "bg-accent text-accent-foreground";
                  let statusLabel = rep.status === "PENDING" ? "In Review" : rep.status;
                  if (rep.status === "PENDING") pill = "bg-gold/15 text-gold";
                  if (hasAbnormal) { pill = "bg-destructive/12 text-destructive"; statusLabel = "Critical"; }
                  return (
                    <tr key={rep.id} className="border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{rep.patient.customId}</td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-foreground whitespace-nowrap">{rep.patient.name}</td>
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
          <div className="relative flex-1 flex items-center justify-center min-h-[150px]">
            {stats.totalReports > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
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
    </div>
  );
}