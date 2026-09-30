"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2, FlaskConical, Users, CheckCircle2, Clock, IndianRupee,
  RefreshCw, PlusCircle, ArrowRight, Printer, Search, ShieldCheck,
  Tag, Copy, Check, FileText, ChevronRight, Activity, Sparkles,
  TrendingUp, Layers, AlertCircle, ArrowUpRight, BarChart3
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie
} from "recharts";
import { fetchFromLaravel } from "@/lib/api-client";

interface Props {
  user: any;
}

export function CollectionCenterOverview({ user }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, patientsData] = await Promise.all([
        fetchFromLaravel("/reports").catch(() => []),
        fetchFromLaravel("/patients").catch(() => []),
      ]);

      const repList = Array.isArray(reportsData) ? reportsData : (reportsData?.data || []);
      const patList = Array.isArray(patientsData) ? patientsData : (patientsData?.data || []);
      setReports(repList);
      setPatients(patList);
    } catch (err) {
      console.error("Error loading collection center overview:", err);
    } finally {
      setLoading(false);
    }
  };

  // 100% Dynamic metrics from active reports
  const totalSamples = reports.length;
  const completedSamples = reports.filter((r) => r.status === "COMPLETED" || r.status === "READY").length;
  const inTransitSamples = reports.filter((r) => r.status === "IN_TRANSIT" || r.status === "PROCESSING").length;
  const newCollectedSamples = reports.filter((r) => r.status !== "COMPLETED" && r.status !== "READY" && r.status !== "IN_TRANSIT" && r.status !== "PROCESSING").length;

  const totalCollectedRevenue = reports.reduce((sum, r) => sum + (Number(r.bill?.paid_amount || r.bill?.paidAmount) || 0), 0);
  const totalDueRevenue = reports.reduce((sum, r) => {
    const total = Number(r.bill?.total || r.bill?.totalAmount || 0);
    const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount || 0);
    return sum + Math.max(0, total - paid);
  }, 0);

  // 100% Dynamic 7-day intake chart data based on actual report created_at
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

  // Donut 1: Sample Processing Stages (Dynamic)
  const stagePieData = useMemo(() => {
    if (totalSamples === 0) {
      return [{ name: "Awaiting Samples", value: 1, color: "hsl(var(--muted)/0.5)" }];
    }
    return [
      { name: "Ready / Approved", value: completedSamples, color: "#10b981" },
      { name: "Central Hub Testing", value: inTransitSamples, color: "#3b82f6" },
      { name: "Sample Collected", value: newCollectedSamples, color: "#f59e0b" },
    ].filter(item => item.value > 0);
  }, [totalSamples, completedSamples, inTransitSamples, newCollectedSamples]);

  // Donut 2: Billing & Counter Payment Ratio (Dynamic)
  const paymentPieData = useMemo(() => {
    if (totalCollectedRevenue === 0 && totalDueRevenue === 0) {
      return [{ name: "No Billing Data", value: 1, color: "hsl(var(--muted)/0.5)" }];
    }
    return [
      { name: "Paid at Counter", value: totalCollectedRevenue, color: "#10b981" },
      { name: "Due / Online Pay Later", value: totalDueRevenue, color: "#f43f5e" },
    ].filter(item => item.value > 0);
  }, [totalCollectedRevenue, totalDueRevenue]);

  return (
    <div className="space-y-7 animate-fade-in pb-10">
      {/* ── Top Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/80 p-6 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Center Active</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-mono">{user?.email || "Branch Node"}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {user?.name || "Collection Center Overview"}
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Official satellite sample collection point for{" "}
              <strong className="text-foreground">{user?.lab_name || user?.lab?.name || "OnePath Central Pathology Laboratory"}</strong>.
              Register patients, enter sample barcodes, and collect diagnostic counter fees.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-xs hover:bg-muted/60 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/dashboard/patients/register"
              className="px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md ring-inset-top hover:-translate-y-px active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Sample Entry</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4 Key Metric Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FlaskConical className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> Real-time
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Samples</p>
            <p className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5 font-mono">{totalSamples}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Patient samples logged</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Hub Transit
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">In Transit / Testing</p>
            <p className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5 font-mono">{inTransitSamples}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting Central Lab sign-off</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Ready
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reports Approved</p>
            <p className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5 font-mono">{completedSamples}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Authorized by Pathologist</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
              Counter
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Counter Collections</p>
            <p className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5 font-mono">
              ₹{totalCollectedRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              ₹{totalDueRevenue.toLocaleString("en-IN")} Due online
            </p>
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Bar Chart + 2 Donut Charts) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Bar Chart of Sample Intake (7 Columns) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Sample Collection Volume (Last 7 Days)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time daily intake of patient vials from this center</p>
            </div>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
              Dynamic Intake
            </span>
          </div>

          <div className="h-[250px] w-full pt-2" style={{ minHeight: 240 }}>
            {isMounted && (
              <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0} debounce={50}>
                <BarChart data={weeklyIntakeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border p-2.5 rounded-xl shadow-xl text-xs">
                            <p className="font-bold text-foreground">{payload[0].payload.day}</p>
                            <p className="text-primary font-extrabold mt-0.5">{payload[0].value} Samples Logged</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {weeklyIntakeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--primary)/0.4)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Dual Donut Breakdown (5 Columns) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Sample Status & Billing Breakdown</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time processing lifecycle and clearance</p>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            {/* Donut 1: Processing Stages */}
            <div className="flex flex-col items-center text-center">
              <div className="h-[130px] w-[130px] relative">
                {isMounted && (
                  <ResponsiveContainer width={130} height={130} minWidth={0} minHeight={0} debounce={50}>
                    <PieChart>
                      <Pie
                        data={stagePieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={58}
                        paddingAngle={3}
                      >
                        {stagePieData.map((entry, idx) => (
                          <Cell key={`donut1-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-extrabold text-foreground">{totalSamples}</span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Vials</span>
                </div>
              </div>
              <p className="text-[11px] font-bold text-foreground mt-2">Lifecycle Status</p>
              <span className="text-[10px] text-muted-foreground">{completedSamples} Approved</span>
            </div>

            {/* Donut 2: Payment Clearance Ratio */}
            <div className="flex flex-col items-center text-center">
              <div className="h-[130px] w-[130px] relative">
                {isMounted && (
                  <ResponsiveContainer width={130} height={130} minWidth={0} minHeight={0} debounce={50}>
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={58}
                        paddingAngle={3}
                      >
                        {paymentPieData.map((entry, idx) => (
                          <Cell key={`donut2-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {totalCollectedRevenue + totalDueRevenue > 0
                      ? `${Math.round((totalCollectedRevenue / (totalCollectedRevenue + totalDueRevenue)) * 100)}%`
                      : "0%"}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Paid</span>
                </div>
              </div>
              <p className="text-[11px] font-bold text-foreground mt-2">Counter Clearance</p>
              <span className="text-[10px] text-rose-500 font-semibold">₹{totalDueRevenue.toLocaleString("en-IN")} Due</span>
            </div>
          </div>

          {/* Mini Legend */}
          <div className="pt-3 border-t border-border/70 grid grid-cols-3 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground truncate">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground truncate">Central Hub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground truncate">Due (PayU Lock)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
