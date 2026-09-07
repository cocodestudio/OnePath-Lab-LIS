"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase, FlaskConical, Users, CheckCircle2, Clock, IndianRupee,
  RefreshCw, PlusCircle, ArrowRight, Printer, Search, ShieldCheck,
  Tag, Copy, Check, FileText, ChevronRight, Activity, Sparkles,
  TrendingUp, Layers, AlertCircle, ArrowUpRight, BarChart3, Receipt,
  Building2, Percent
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie
} from "recharts";
import { fetchFromLaravel } from "@/lib/api-client";

interface Props {
  user: any;
}

export function B2BOverview({ user }: Props) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
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
      console.error("Error loading B2B partner overview:", err);
    } finally {
      setLoading(false);
    }
  };

  // Requisition Telemetry
  const totalRequisitions = reports.length;
  const finalizedReports = reports.filter((r) => r.status === "FINAL" || r.status === "APPROVED" || r.status === "COMPLETED").length;
  const inProcessing = reports.filter((r) => r.status === "IN_TRANSIT" || r.status === "PROCESSING").length;
  const pendingIntake = reports.filter((r) => r.status === "PENDING" || !r.status).length;

  // Financial Telemetry (Estimated wholesale margin: 30% standard B2B commission)
  const totalGrossBilled = reports.reduce((sum, r) => sum + (Number(r.bill?.total || r.bill?.totalAmount) || 0), 0);
  const totalPaid = reports.reduce((sum, r) => sum + (Number(r.bill?.paid_amount || r.bill?.paidAmount) || 0), 0);
  const totalDue = Math.max(0, totalGrossBilled - totalPaid);
  const estimatedPartnerMargin = Math.round(totalGrossBilled * 0.3);

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
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
            <span>Refresh</span>
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

        {/* Card 4: Partner Margin / Commission */}
        <Link href="/dashboard/revenue" className="bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-200 dark:border-purple-900/50 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Partner Margin (Est.)</span>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">₹{estimatedPartnerMargin.toLocaleString("en-IN")}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Gross Requisitions:</span>
            <span className="font-bold text-foreground">₹{totalGrossBilled.toLocaleString("en-IN")} →</span>
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
          href="/dashboard/revenue"
          className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/80 hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Revenue & Tax Invoices</p>
            <p className="text-[11px] text-muted-foreground truncate">B2B statements, wholesale cost & margins</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* ── Visual Telemetry Row (7-Day Requisitions & Stage Donut) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Chart: 7-Day Intake Trend */}
        <div className="lg:col-span-2 bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">7-Day Requisition Volume</h3>
              <p className="text-xs text-muted-foreground">Specimens referred to reference hub</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              Weekly Activity
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyIntakeData}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(139, 92, 246, 0.06)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-md">
                          <p className="font-bold">{payload[0].payload.day}</p>
                          <p className="text-purple-300">{payload[0].value} requisitions</p>
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
                      fill={entry.isToday ? "#8b5cf6" : "#c4b5fd"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Donut: Processing Stages */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Specimen Progress Stages</h3>
            <p className="text-xs text-muted-foreground">Status of referred test requisitions</p>
          </div>

          <div className="h-44 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stagePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stagePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-foreground">{totalRequisitions}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
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
