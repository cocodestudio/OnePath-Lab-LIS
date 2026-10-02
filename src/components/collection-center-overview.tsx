"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2, FlaskConical, Users, CheckCircle2, Clock,
  RefreshCw, PlusCircle, ArrowRight, Printer, Search, ShieldCheck,
  Tag, Copy, Check, FileText, ChevronRight, Activity, Sparkles,
  TrendingUp, Layers, AlertCircle, ArrowUpRight, BarChart3
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie
} from "recharts";
import { fetchFromLaravel } from "@/lib/api-client";
import { getTodayStr, shiftDate, getRecordLocalDate } from "@/lib/date-utils";

interface Props {
  user: any;
}

export function CollectionCenterOverviewShimmer() {
  return (
    <div className="space-y-7 animate-fade-in select-none pb-10" aria-busy="true" aria-label="Loading Collection Center Overview">
      {/* Top Hero Banner Shimmer */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 p-6 sm:p-7 shadow-xs shimmer-card-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="h-6 w-44 rounded-full shimmer-gradient" />
            <div className="h-8 w-72 rounded-xl shimmer-gradient" />
            <div className="h-4 w-96 max-w-full rounded shimmer-gradient" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-24 rounded-xl shimmer-gradient" />
            <div className="h-10 w-32 rounded-xl shimmer-gradient" />
          </div>
        </div>
      </div>

      {/* 3 Metric Cards Shimmer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between min-h-[140px] shimmer-card-pulse">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl shimmer-gradient" />
              <div className="h-5 w-20 rounded-full shimmer-gradient" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-28 rounded shimmer-gradient" />
              <div className="h-8 w-16 rounded-md shimmer-gradient" />
              <div className="h-3 w-36 rounded shimmer-gradient" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border/80 shadow-xs space-y-5 shimmer-card-pulse flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-60 rounded-md shimmer-gradient" />
              <div className="h-3 w-48 rounded shimmer-gradient" />
            </div>
            <div className="h-6 w-24 rounded-lg shimmer-gradient" />
          </div>
          <div className="h-[210px] flex items-end justify-between gap-3 pt-4 px-2">
            {[40, 65, 30, 85, 55, 90, 75].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full max-w-[42px] rounded-t-lg shimmer-gradient" style={{ height: `${h}%` }} />
                <div className="h-3 w-8 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-5 shimmer-card-pulse">
          <div className="space-y-1.5">
            <div className="h-5 w-52 rounded-md shimmer-gradient" />
            <div className="h-3 w-40 rounded shimmer-gradient" />
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="w-36 h-36 rounded-full border-[14px] border-muted/50 relative flex items-center justify-center shimmer-gradient">
              <div className="w-16 h-16 rounded-full bg-card" />
            </div>
          </div>
          <div className="pt-3 border-t border-border/70 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shimmer-gradient" />
                  <div className="h-3 w-28 rounded shimmer-gradient" />
                </div>
                <div className="h-3.5 w-8 rounded shimmer-gradient" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollectionCenterOverview({ user }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [cachedOverview, setCachedOverview] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("lis_cached_cc_overview");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState(() => !cachedOverview);
  const [stats, setStats] = useState<any>(() => cachedOverview?.stats || {
    total_samples: 0,
    completed_samples: 0,
    in_transit_samples: 0,
    new_collected_samples: 0,
    total_patients: 0,
  });
  const [weeklyIntake, setWeeklyIntake] = useState<any[]>(() => cachedOverview?.weekly_intake || []);

  useEffect(() => {
    setIsMounted(true);
    loadData();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener("lis_cache_invalidated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("lis_cache_invalidated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const loadData = async () => {
    try {
      if (!stats.total_samples && weeklyIntake.length === 0) {
        setLoading(true);
      }
      
      // Fast path: dedicated overview stats endpoint (15ms SQL)
      let overviewData: any = null;
      try {
        overviewData = await fetchFromLaravel("/collection-centers/overview-stats", { skipCache: true });
      } catch (e) {
        overviewData = null;
      }

      if (overviewData && overviewData.stats) {
        setStats(overviewData.stats);
        if (Array.isArray(overviewData.weekly_intake)) {
          setWeeklyIntake(overviewData.weekly_intake);
        }
        try {
          localStorage.setItem("lis_cached_cc_overview", JSON.stringify(overviewData));
        } catch {}
      } else {
        // Fallback path: compute from /reports and /patients
        const [reportsData, patientsData] = await Promise.all([
          fetchFromLaravel("/reports?limit=150&sort=recent", { skipCache: true }).catch(() => []),
          fetchFromLaravel("/patients?per_page=150&order=desc", { skipCache: true }).catch(() => []),
        ]);

        const repList = Array.isArray(reportsData) ? reportsData : (reportsData?.data || []);
        const patList = Array.isArray(patientsData) ? patientsData : (patientsData?.data || []);

        const userIdStr = String(user?.id || user?.user_id || "");
        const userName = (user?.name || "").toLowerCase().trim();
        const centerLabName = (user?.lab_name || user?.labName || "").toLowerCase().trim();
        const centerCode = (user?.center_code || user?.centerCode || "").toLowerCase().trim();

        const scopedReports = repList.filter((r: any) => {
          const p = r?.patient || {};
          const meta = (p && typeof p.meta === "object" && p.meta !== null) ? p.meta : {};
          const repMeta = (r && typeof r.meta === "object" && r.meta !== null) ? r.meta : {};
          const collectedAt = String(p?.collectedAt || p?.collected_at || meta?.collectedAt || meta?.collected_at || "").toLowerCase();

          const createdById = String(r?.createdById || r?.created_by_id || p?.createdById || p?.created_by_id || repMeta?.createdById || repMeta?.created_by_id || meta?.createdById || meta?.created_by_id || "");
          const collectionCenterId = String(repMeta?.collectionCenterId || repMeta?.collection_center_id || meta?.collectionCenterId || meta?.collection_center_id || "");
          const metaCenterCode = String(repMeta?.centerCode || repMeta?.center_code || meta?.centerCode || meta?.center_code || "").toLowerCase().trim();
          const collCenterName = String(meta?.collection_center_name || meta?.collectionCenterName || repMeta?.centerName || "").toLowerCase();

          const isMine = Boolean(userIdStr && (createdById === userIdStr || collectionCenterId === userIdStr));
          const isAssigned =
            (userName && collectedAt.includes(userName)) ||
            (centerLabName && !["onepath laboratory", "onepath lab", "main lab", "my laboratory"].includes(centerLabName) && collectedAt.includes(centerLabName)) ||
            (centerLabName && collCenterName.includes(centerLabName)) ||
            (centerCode && (collectedAt.includes(centerCode) || metaCenterCode === centerCode));

          return isMine || isAssigned;
        });

        const totalSamples = scopedReports.length;
        const completedSamples = scopedReports.filter((r: any) => r.status === "COMPLETED" || r.status === "READY" || r.status === "APPROVED" || r.status === "FINAL").length;
        const inTransitSamples = scopedReports.filter((r: any) => r.status === "IN_TRANSIT" || r.status === "PROCESSING").length;
        const newCollectedSamples = Math.max(0, totalSamples - completedSamples - inTransitSamples);

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const todayStr = getTodayStr();
        const intakeArr = [];

        for (let i = 6; i >= 0; i--) {
          const dateStr = shiftDate(todayStr, -i);
          const [y, m, d] = dateStr.split("-").map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();
          const dayName = i === 0 ? "Today" : days[dayOfWeek];

          const count = scopedReports.filter((r: any) => {
            const rawDate = r.created_at || r.createdAt || "";
            const repDate = getRecordLocalDate(rawDate);
            return repDate === dateStr;
          }).length;

          intakeArr.push({ day: dayName, count, isToday: i === 0 });
        }

        const fallbackObj = {
          stats: {
            total_samples: totalSamples,
            completed_samples: completedSamples,
            in_transit_samples: inTransitSamples,
            new_collected_samples: newCollectedSamples,
            total_patients: patList.length,
          },
          weekly_intake: intakeArr,
        };

        setStats(fallbackObj.stats);
        setWeeklyIntake(intakeArr);

        try {
          localStorage.setItem("lis_cached_cc_overview", JSON.stringify(fallbackObj));
        } catch {}
      }
    } catch (err) {
      console.error("Error loading collection center overview:", err);
    } finally {
      setLoading(false);
    }
  };

  // 100% Dynamic metrics from active overview stats
  const totalSamples = Number(stats?.total_samples || 0);
  const completedSamples = Number(stats?.completed_samples || 0);
  const inTransitSamples = Number(stats?.in_transit_samples || 0);
  const newCollectedSamples = Number(stats?.new_collected_samples || 0);

  // Dynamic 7-day intake chart data
  const chartData = useMemo(() => {
    if (Array.isArray(weeklyIntake) && weeklyIntake.length > 0) {
      return weeklyIntake;
    }
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    return Array.from({ length: 7 }, (_, idx) => {
      const i = 6 - idx;
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return {
        day: i === 0 ? "Today" : days[d.getDay()],
        count: 0,
        isToday: i === 0,
      };
    });
  }, [weeklyIntake]);

  // Donut: Sample Processing Lifecycle Stages (Dynamic)
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

  if (!isMounted || (loading && totalSamples === 0 && weeklyIntake.length === 0)) {
    return <CollectionCenterOverviewShimmer />;
  }

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
              Register patients, enter sample barcodes, and monitor sample transit in real-time.
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

      {/* ── 3 Key Metric Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* ── Charts Grid (Bar Chart + Donut Chart) ── */}
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
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    {chartData.map((entry, index) => (
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

        {/* Chart 2: Sample Lifecycle Stages Donut Breakdown (5 Columns) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Sample Processing Lifecycle</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time status of collected patient specimens</p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-3">
            <div className="h-[155px] w-[155px] relative">
              {isMounted && (
                <ResponsiveContainer width={155} height={155} minWidth={0} minHeight={0} debounce={50}>
                  <PieChart>
                    <Pie
                      data={stagePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={46}
                      outerRadius={72}
                      paddingAngle={4}
                    >
                      {stagePieData.map((entry, idx) => (
                        <Cell key={`donut1-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-foreground">{totalSamples}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Vials</span>
              </div>
            </div>
          </div>

          {/* Detailed Status Breakdown */}
          <div className="pt-3 border-t border-border/70 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">Ready / Approved</span>
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{completedSamples}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-medium text-foreground">Central Hub Testing</span>
              </div>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{inTransitSamples}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-foreground">Sample Collected</span>
              </div>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{newCollectedSamples}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
