"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Stethoscope,
  IndianRupee,
  Users,
  TrendingUp,
  ArrowUpRight,
  FlaskConical,
  Receipt,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";

interface DoctorShareExpensesWidgetProps {
  monthRevenue?: number;
  chartData?: Array<{ date: string; fullDate?: string; reports: number; revenue: number }>;
  isMounted?: boolean;
  labId?: string;
}

interface DoctorItem {
  id: string;
  name: string;
  patient_count: number;
  doctor_commission: number;
  gross_sales: number;
}

export function DoctorShareExpensesWidget({
  monthRevenue = 0,
  chartData = [],
  isMounted = true,
  labId,
}: DoctorShareExpensesWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Doctor referral metrics
  const [doctorCommission, setDoctorCommission] = useState<number>(0);
  const [doctorReferralsCount, setDoctorReferralsCount] = useState<number>(0);
  const [topDoctors, setTopDoctors] = useState<DoctorItem[]>([]);

  // Test costing expenses metrics
  const [totalTestExpenses, setTotalTestExpenses] = useState<number>(0);
  const [totalConductedCount, setTotalConductedCount] = useState<number>(0);
  const [topCostTests, setTopCostTests] = useState<Array<{ name: string; count: number; unitCost: number; totalCost: number }>>([]);

  // Restore cached snapshot for instant 0ms cold-start rendering
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const activeLabId = labId || getStoredUser()?.lab_id || "default";
      const cached = localStorage.getItem(`lis_cached_doc_expenses_${activeLabId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          if (typeof parsed.doctorCommission === "number") setDoctorCommission(parsed.doctorCommission);
          if (typeof parsed.doctorReferralsCount === "number") setDoctorReferralsCount(parsed.doctorReferralsCount);
          if (Array.isArray(parsed.topDoctors)) setTopDoctors(parsed.topDoctors);
          if (typeof parsed.totalTestExpenses === "number") setTotalTestExpenses(parsed.totalTestExpenses);
          if (typeof parsed.totalConductedCount === "number") setTotalConductedCount(parsed.totalConductedCount);
          if (Array.isArray(parsed.topCostTests)) setTopCostTests(parsed.topCostTests);
        }
      }
    } catch {}
  }, [labId]);

  // Load live monthly metrics asynchronously
  const fetchMonthlyAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeLabId = labId || getStoredUser()?.lab_id || "default";

      // 1. Fetch Doctor commission & referrals for current month
      const docPromise = fetchFromLaravel("/doctors?filter=this_month&case_type=main_lab").catch(() => null);

      // 2. Fetch Test usage counts & per-test costs for current month
      const testPromise = fetchFromLaravel("/tests/usage-counts?period=this_month&per_page=50").catch(() => null);

      const [docRes, testRes] = await Promise.all([docPromise, testPromise]);

      let docComm = 0;
      let docRefs = 0;
      let topDocs: DoctorItem[] = [];

      if (docRes && docRes.success) {
        docComm = Number(docRes.summary?.total_doctor_commission || 0);
        docRefs = Number(docRes.summary?.total_patients || 0);
        if (Array.isArray(docRes.doctors)) {
          topDocs = docRes.doctors
            .filter((d: any) => d.id !== "self_referral" && (d.doctor_commission > 0 || d.patient_count > 0))
            .slice(0, 5)
            .map((d: any) => ({
              id: String(d.id),
              name: String(d.name || "Unknown Doctor"),
              patient_count: Number(d.patient_count || 0),
              doctor_commission: Number(d.doctor_commission || 0),
              gross_sales: Number(d.gross_sales || 0),
            }));
        }
        setDoctorCommission(docComm);
        setDoctorReferralsCount(docRefs);
        setTopDoctors(topDocs);
      }

      let testExp = 0;
      let conductedCount = 0;
      let costTests: Array<{ name: string; count: number; unitCost: number; totalCost: number }> = [];

      if (testRes && testRes.status === "success") {
        conductedCount = Number(testRes.total_tests_conducted || 0);

        // Fetch local unit cost overrides if any
        let localCosts: Record<string, any> = {};
        try {
          const stored = localStorage.getItem(`lis_test_unit_costs_${activeLabId}`);
          if (stored) localCosts = JSON.parse(stored);
        } catch {}

        if (Array.isArray(testRes.data)) {
          testRes.data.forEach((t: any) => {
            const count = Number(t.count || 0);
            const unitCost = Number(localCosts[t.test_id] ?? t.cost_price ?? 0);
            const lineTotal = count * unitCost;
            testExp += lineTotal;

            if (count > 0 && unitCost > 0) {
              costTests.push({
                name: String(t.name || t.code || "Test"),
                count,
                unitCost,
                totalCost: lineTotal,
              });
            }
          });

          costTests.sort((a, b) => b.totalCost - a.totalCost);
          costTests = costTests.slice(0, 5);
        }

        setTotalTestExpenses(testExp);
        setTotalConductedCount(conductedCount);
        setTopCostTests(costTests);
      }

      // Persist snapshot to localStorage
      try {
        localStorage.setItem(
          `lis_cached_doc_expenses_${activeLabId}`,
          JSON.stringify({
            doctorCommission: docComm,
            doctorReferralsCount: docRefs,
            topDoctors: topDocs,
            totalTestExpenses: testExp,
            totalConductedCount: conductedCount,
            topCostTests: costTests,
            updatedAt: Date.now(),
          })
        );
      } catch {}
    } catch (err) {
      console.warn("Could not load monthly doctor share & expenses:", err);
    } finally {
      setIsLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    fetchMonthlyAnalytics();
  }, [fetchMonthlyAnalytics]);

  // Net Lab Margin after deducting Test Costing Expenses and Doctor Incentives
  const netMargin = Math.max(0, Number(monthRevenue || 0) - totalTestExpenses - doctorCommission);
  const netMarginPercent = monthRevenue > 0 ? Math.round((netMargin / monthRevenue) * 100) : 0;

  // Synthesize monthly day-by-day trajectory data matching parent's chart
  const monthlyTimelineData = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return [];
    }

    const totalRevInChart = chartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0) || 1;
    const totalRepsInChart = chartData.reduce((acc, curr) => acc + (curr.reports || 0), 0) || 1;

    return chartData.map((item) => {
      const dayRev = Number(item.revenue || 0);
      const dayReps = Number(item.reports || 0);

      // Distribute doctor share proportional to daily revenue/activity
      const revRatio = dayRev / totalRevInChart;
      const dayDrShare = Math.round(doctorCommission * revRatio);

      // Distribute test expenses proportional to daily report volume
      const repRatio = dayReps / totalRepsInChart;
      const dayExpenses = Math.round(totalTestExpenses * repRatio);

      // Estimated referrals proportional to daily report ratio
      const dayReferrals = Math.round(doctorReferralsCount * repRatio);

      const dayNet = Math.max(0, dayRev - dayExpenses - dayDrShare);

      return {
        date: item.date,
        fullDate: item.fullDate || item.date,
        revenue: dayRev,
        expenses: dayExpenses,
        doctorShare: dayDrShare,
        referrals: dayReferrals,
        netMargin: dayNet,
      };
    });
  }, [chartData, doctorCommission, totalTestExpenses, doctorReferralsCount]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }, []);

  return (
    <div className="col-span-12 lg:col-span-6 bg-card border border-border/70 rounded-xl p-4 sm:p-6 shadow-card flex flex-col justify-between h-full">
      <div className="flex flex-col flex-1">
        {/* Header & Clear Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Stethoscope className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">
                Doctor Share & Expenses Ledger
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Monthly doctor incentives, per-test cost expenses & referral volume ({currentMonthName})
            </p>
          </div>

          {/* Clean Visual Legend Indicators */}
          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />
              <span className="text-foreground font-semibold">Dr. Share</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
              <span className="text-foreground font-semibold">Test Costs</span>
            </span>
          </div>
        </div>

        {/* 3 Core Monthly KPI Badges - Responsive across Mobile and Desktop */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {/* 1. Total Expenses (Test count * per test cost) */}
          <div className="p-2 sm:p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 truncate">
                Total Expenses
              </span>
              <FlaskConical className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
            </div>
            <p className="font-display text-xs sm:text-base font-bold text-foreground tnum truncate">
              ₹{Number(totalTestExpenses || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate block mt-0.5">
              {totalConductedCount > 0 ? `${totalConductedCount} tests` : "Cost basis"}
            </span>
          </div>

          {/* 2. Doctor Share (Total doctor incentives) */}
          <div className="p-2 sm:p-3 rounded-xl border bg-indigo-500/5 border-indigo-500/20 text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 truncate">
                Dr. Share
              </span>
              <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-500 shrink-0" />
            </div>
            <p className="font-display text-xs sm:text-base font-bold text-indigo-600 dark:text-indigo-400 tnum truncate">
              ₹{Number(doctorCommission || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate block mt-0.5">
              Incentives
            </span>
          </div>

          {/* 3. Total Doctor Referrals */}
          <div className="p-2 sm:p-3 rounded-xl border bg-teal-500/5 border-teal-500/20 text-teal-900 dark:text-teal-200">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 truncate">
                Dr. Referrals
              </span>
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-500 shrink-0" />
            </div>
            <p className="font-display text-xs sm:text-base font-bold text-foreground tnum truncate">
              {Number(doctorReferralsCount || 0).toLocaleString("en-IN")}
              <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-0.5 sm:ml-1">Cases</span>
            </p>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate block mt-0.5">
              Referred
            </span>
          </div>
        </div>

        {/* Dynamic Full-Height Chart Area (fills card cleanly without extra bottom space) */}
        <div className="flex-1 w-full min-h-[250px] sm:min-h-[275px] flex flex-col justify-center">
          {isMounted && monthlyTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={275} minWidth={0} minHeight={0} debounce={50}>
              <AreaChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="widgetDrShareGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(238 84% 67%)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="hsl(238 84% 67%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="widgetExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                  }}
                  formatter={(val: any, name: any) => [
                    `₹${Number(val || 0).toLocaleString("en-IN")}`,
                    name === "doctorShare" ? "Dr. Share (Incentives)" : name === "expenses" ? "Test Cost Expenses" : "Revenue",
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#widgetExpenseGrad)"
                  name="expenses"
                />
                <Area
                  type="monotone"
                  dataKey="doctorShare"
                  stroke="hsl(238 84% 67%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#widgetDrShareGrad)"
                  name="doctorShare"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/20 border border-dashed border-border/60">
              <Sparkles className="h-5 w-5 text-muted-foreground/60 mb-1" />
              <p className="text-xs font-semibold text-foreground">Monthly Ledger Engine Ready</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Data accumulates automatically as tests and doctor referrals are registered.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation & Net Margin */}
      <div className="pt-3 border-t border-border/50 mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
          <span className="font-semibold text-foreground">Net Margin:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 tnum">
            ₹{Number(netMargin || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
          {netMarginPercent > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
              {netMarginPercent}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/tests/count"
            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>Test Costs Ledger</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/doctors"
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>Doctor Share Ledger</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
