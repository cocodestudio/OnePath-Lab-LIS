"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase, FlaskConical, Users, CheckCircle2, Clock, IndianRupee,
  RefreshCw, PlusCircle, ArrowRight, Printer, Search, ShieldCheck,
  Tag, Copy, Check, FileText, ChevronRight, Activity, Sparkles,
  TrendingUp, Layers, AlertCircle, ArrowUpRight, BarChart3, Receipt,
  Building2, Percent, Wallet, CreditCard, ArrowDownLeft
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie
} from "recharts";
import { fetchFromLaravel } from "@/lib/api-client";

interface Props {
  user: any;
}

export function B2BOverviewShimmer() {
  return (
    <div className="space-y-7 animate-fade-in select-none" aria-busy="true" aria-label="Loading B2B Overview">
      {/* Top Header Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded shimmer-gradient" />
          <div className="h-8 w-64 rounded-lg shimmer-gradient" />
          <div className="h-4 w-80 rounded shimmer-gradient" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-24 rounded-xl shimmer-gradient shrink-0" />
          <div className="h-10 w-36 rounded-xl shimmer-gradient shrink-0" />
        </div>
      </div>

      {/* 4 Stat Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs shimmer-card-pulse flex flex-col justify-between min-h-[145px]"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-32 rounded shimmer-gradient" />
              <div className="w-10 h-10 rounded-xl shimmer-gradient shrink-0" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-8 w-24 rounded-md shimmer-gradient" />
              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <div className="h-3 w-24 rounded shimmer-gradient" />
                <div className="h-3 w-12 rounded shimmer-gradient" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Quick Links Banner Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/80 shadow-2xs shimmer-card-pulse"
          >
            <div className="w-10 h-10 rounded-lg shimmer-gradient shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded shimmer-gradient" />
              <div className="h-3 w-48 rounded shimmer-gradient" />
            </div>
            <div className="w-4 h-4 rounded shimmer-gradient shrink-0" />
          </div>
        ))}
      </div>

      {/* 3 Visual Telemetry Cards Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: 7-Day Intake Trend Bar Chart */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs shimmer-card-pulse flex flex-col justify-between min-h-[290px]">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <div className="h-4 w-28 rounded shimmer-gradient" />
              <div className="h-3 w-36 rounded shimmer-gradient" />
            </div>
            <div className="h-5 w-14 rounded-md shimmer-gradient" />
          </div>
          <div className="h-40 flex items-end justify-between gap-2 px-2 pb-2 border-b border-border/40">
            {[35, 60, 45, 80, 50, 70, 90].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full max-w-[28px] rounded-t-md shimmer-gradient transition-all"
                  style={{ height: `${h}%` }}
                />
                <div className="h-2.5 w-6 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
            <div className="h-3 w-20 rounded shimmer-gradient" />
            <div className="h-3 w-16 rounded shimmer-gradient" />
          </div>
        </div>

        {/* Card 2: Credit Ledger & Balance Donut Chart */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs shimmer-card-pulse flex flex-col justify-between min-h-[290px]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 w-36 rounded shimmer-gradient" />
              <div className="h-3 w-40 rounded shimmer-gradient" />
            </div>
            <div className="h-5 w-16 rounded-md shimmer-gradient" />
          </div>
          <div className="h-40 flex items-center justify-center relative my-2">
            <div className="w-32 h-32 rounded-full border-[14px] border-muted/50 relative flex items-center justify-center shimmer-gradient">
              <div className="w-16 h-16 rounded-full bg-card flex flex-col items-center justify-center space-y-1">
                <div className="h-4 w-10 rounded shimmer-gradient" />
                <div className="h-2 w-8 rounded shimmer-gradient" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded shimmer-gradient" />
              <div className="h-3 w-16 rounded shimmer-gradient" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded shimmer-gradient" />
              <div className="h-3 w-16 rounded shimmer-gradient" />
            </div>
          </div>
        </div>

        {/* Card 3: Specimen Progress Stages Donut Chart */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs shimmer-card-pulse flex flex-col justify-between min-h-[290px]">
          <div className="space-y-1">
            <div className="h-4 w-40 rounded shimmer-gradient" />
            <div className="h-3 w-44 rounded shimmer-gradient" />
          </div>
          <div className="h-40 flex items-center justify-center relative my-2">
            <div className="w-32 h-32 rounded-full border-[14px] border-muted/50 relative flex items-center justify-center shimmer-gradient">
              <div className="w-16 h-16 rounded-full bg-card flex flex-col items-center justify-center space-y-1">
                <div className="h-5 w-8 rounded shimmer-gradient" />
                <div className="h-2 w-6 rounded shimmer-gradient" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded shimmer-gradient" />
              <div className="h-3 w-8 rounded shimmer-gradient" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded shimmer-gradient" />
              <div className="h-3 w-8 rounded shimmer-gradient" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function B2BOverview({ user }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [walletSummary, setWalletSummary] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      else setRefreshing(true);

      const [reportsData, patientsData, walletData] = await Promise.all([
        fetchFromLaravel("/reports", { skipCache: !isInitial }).catch(() => []),
        fetchFromLaravel("/patients", { skipCache: !isInitial }).catch(() => []),
        fetchFromLaravel("/b2b/wallet/summary", { skipCache: !isInitial }).catch(() => null),
      ]);

      const repList = Array.isArray(reportsData) ? reportsData : (reportsData?.data || []);
      const patList = Array.isArray(patientsData) ? patientsData : (patientsData?.data || []);
      setReports(repList);
      setPatients(patList);
      setWalletSummary(walletData);
    } catch (err) {
      console.error("Error loading B2B partner overview:", err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Real-time update listeners: custom event and window focus
    const handleWalletUpdated = () => {
      loadData(false);
    };

    const handleFocus = () => {
      loadData(false);
    };

    window.addEventListener("b2b_wallet_updated", handleWalletUpdated);
    window.addEventListener("focus", handleFocus);

    // Real-time polling every 20s for live telemetry & balance updates
    const interval = setInterval(() => {
      loadData(false);
    }, 20000);

    return () => {
      window.removeEventListener("b2b_wallet_updated", handleWalletUpdated);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Requisition Telemetry
  const totalRequisitions = reports.length;
  const finalizedReports = reports.filter((r) => r.status === "FINAL" || r.status === "APPROVED" || r.status === "COMPLETED").length;
  const inProcessing = reports.filter((r) => r.status === "IN_TRANSIT" || r.status === "PROCESSING").length;
  const pendingIntake = reports.filter((r) => r.status === "PENDING" || !r.status).length;

  // Wallet Telemetry
  const walletBalance = Number(walletSummary?.wallet_balance) || 0;
  const totalCredited = Number(walletSummary?.total_credited) || 0;
  const totalDebited = Number(walletSummary?.total_debited) || 0;

  // 7-day intake trend
  const weeklyIntakeData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = i === 0 ? "Today" : days[d.getDay()];

      const count = reports.filter((r) => {
        const repDate = (r.created_at || r.createdAt || "").split("T")[0];
        return repDate === dateStr;
      }).length;

      result.push({ day: dayName, count, isToday: i === 0 });
    }
    return result;
  }, [reports]);

  // Stage distribution donut
  const stagePieData = useMemo(() => {
    if (totalRequisitions === 0) {
      return [{ name: "Awaiting Requisitions", value: 1, color: "hsl(var(--muted)/0.5)" }];
    }
    return [
      { name: "Finalized / Approved", value: finalizedReports, color: "#10b981" },
      { name: "In Lab Testing", value: inProcessing, color: "#8b5cf6" },
      { name: "Specimen Intake / Pending", value: pendingIntake, color: "#f59e0b" },
    ].filter(item => item.value > 0);
  }, [totalRequisitions, finalizedReports, inProcessing, pendingIntake]);

  // Credit Ledger Donut Data
  const creditDonutData = useMemo(() => {
    if (walletBalance <= 0 && totalDebited <= 0) {
      return [{ name: "Awaiting Recharge", value: 1, color: "#e2e8f0" }];
    }
    return [
      { name: "Remaining Balance", value: Math.max(0, walletBalance), color: "#10b981" },
      { name: "Report Deductions", value: Math.max(0, totalDebited), color: "#8b5cf6" },
    ].filter(item => item.value > 0);
  }, [walletBalance, totalDebited]);

  if (initialLoading) {
    return <B2BOverviewShimmer />;
  }

  return (
    <div className="space-y-7 animate-fade-in pb-10">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-[0.2em] mb-1.5">B2B Partner Overview</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Welcome, {user?.name || "Partner Lab"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnostic console & specimen telemetry for <span className="font-semibold text-foreground">{user?.email || "B2B Terminal"}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-purple-600" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>
          <Link
            href="/dashboard/patients/register"
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md hover:-translate-y-px active:scale-[0.98] transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Requisition</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requisitions */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Requisitions</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">{totalRequisitions}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Patients Registered:</span>
            <span className="font-bold text-foreground">{patients.length}</span>
          </div>
        </div>

        {/* Card 2: In Lab Testing */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">In Lab Testing</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">{inProcessing + pendingIntake}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Specimens In Transit:</span>
            <span className="font-bold text-blue-600">{inProcessing}</span>
          </div>
        </div>

        {/* Card 3: Reports Finalized */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reports Finalized</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">{finalizedReports}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Ready for Download:</span>
            <span className="font-bold text-emerald-600">{finalizedReports}</span>
          </div>
        </div>

        {/* Card 4: Prepaid Wallet Balance */}
        <Link href="/dashboard/wallet" className="bg-gradient-to-br from-purple-500/15 via-card to-card border border-purple-300/80 dark:border-purple-800 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Wallet Balance</span>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Recharge / Passbook:</span>
            <span className="font-bold text-purple-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">Top-up &rarr;</span>
          </div>
        </Link>
      </div>

      {/* ── Quick Links Banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/today-samples"
          className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/80 hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-purple-600 group-hover:bg-purple-50">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Today's Specimen Batch</p>
            <p className="text-[11px] text-muted-foreground truncate">Track tubes & logistics to central lab</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/reports"
          className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/80 hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-blue-600 group-hover:bg-blue-50">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Diagnostic Reports Viewer</p>
            <p className="text-[11px] text-muted-foreground truncate">View & print finalized patient reports</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/wallet"
          className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/80 hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Wallet Recharge & Ledger</p>
            <p className="text-[11px] text-muted-foreground truncate">PayU, Dynamic UPI QR & passbook</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* ── Visual Telemetry Row (Requisitions, Credit Ledger Donut, and Specimen Stages) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: 7-Day Intake Trend */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">7-Day Volume</h3>
              <p className="text-xs text-muted-foreground">Specimens referred to reference hub</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              Weekly
            </span>
          </div>

          <div className="h-44 w-full my-2" style={{ minHeight: 176 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height={176} minWidth={0} minHeight={0} debounce={50}>
                <BarChart data={weeklyIntakeData}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(139, 92, 246, 0.06)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs shadow-md">
                            <p className="font-bold">{payload[0].payload.day}</p>
                            <p className="text-purple-300">{payload[0].value} requisitions</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {weeklyIntakeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isToday ? "#8b5cf6" : "#c4b5fd"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
            <span>Weekly Total:</span>
            <span className="font-bold text-foreground">{weeklyIntakeData.reduce((s, d) => s + d.count, 0)} Samples</span>
          </div>
        </div>

        {/* Card 2: Credit Ledger Donut Chart (User Requirement) */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Credit Ledger & Balance</h3>
              <p className="text-xs text-muted-foreground">Prepaid testing credits overview</p>
            </div>
            <Link
              href="/dashboard/wallet"
              className="px-2 py-0.5 rounded-lg text-xs font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1 transition-colors"
            >
              <span>Full View</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="h-44 relative my-2" style={{ minHeight: 176 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height={176} minWidth={0} minHeight={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={creditDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {creditDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-foreground">
                ₹{walletBalance.toLocaleString("en-IN")}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Balance</span>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Remaining Balance:
              </span>
              <span className="font-bold text-foreground">₹{walletBalance.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Total Debited (Used):
              </span>
              <span className="font-bold text-foreground">₹{totalDebited.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50">
            <Link
              href="/dashboard/wallet"
              className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>View Full Payment & Recharge</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Specimen Progress Stages */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Specimen Progress Stages</h3>
            <p className="text-xs text-muted-foreground">Status of referred test requisitions</p>
          </div>

          <div className="h-44 relative my-2" style={{ minHeight: 176 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height={176} minWidth={0} minHeight={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={stagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stagePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-foreground">{totalRequisitions}</span>
              <span className="text-[9px] uppercase font-bold text-muted-foreground">Total</span>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ready / Finalized
              </span>
              <span className="font-bold text-foreground">{finalizedReports}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> In Testing
              </span>
              <span className="font-bold text-foreground">{inProcessing}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending Sample
              </span>
              <span className="font-bold text-foreground">{pendingIntake}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
