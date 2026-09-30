"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Stethoscope, Users, Calendar, ArrowLeft,
  Building2, Phone, BadgePercent, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientRecord {
  id: string;
  custom_id: string;
  name: string;
  age?: number | string | null;
  gender?: string | null;
  phone?: string | null;
  ref_doctor?: string | null;
  created_at: string | null;
  date_formatted: string;
  bill?: {
    id: string;
    custom_id: string;
    total: number;
    discount: number;
    net: number;
    paid: number;
    due: number;
    status: string;
  } | null;
  tests: string[];
  tests_summary: string;
  status: string;
}

interface DoctorProfile {
  id?: string;
  name: string;
  specialty?: string | null;
  clinic_hospital?: string | null;
  phone?: string | null;
  email?: string | null;
  default_commission_percent?: number;
}

function getPeriodLabel(filterKey: string, start?: string, end?: string): string {
  switch (filterKey) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "last_month":
      return "Last Month";
    case "this_year":
      return "This Year";
    case "custom":
      return start && end ? `${start} to ${end}` : "Custom Date Range";
    case "all":
      return "All Time";
    default:
      return filterKey
        ? filterKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "All Time";
  }
}

function DoctorPatientsContent() {
  const toast = useToast();
  const searchParams = useSearchParams();

  // Inherited params from Referral Overview page
  const doctorId = searchParams.get("doctor_id") || "";
  const doctorNameParam = searchParams.get("doctor_name") || "";
  const inheritedFilter = searchParams.get("filter") || "all";
  const customStart = searchParams.get("start_date") || "";
  const customEnd = searchParams.get("end_date") || "";

  // Data states
  const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(true);
  const [patientList, setPatientList] = useState<PatientRecord[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [patientStats, setPatientStats] = useState({
    total_patients: 0,
    total_billed: 0,
    total_paid: 0,
    total_due: 0,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
  });

  const [perPage, setPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch Patients strictly matching the inherited date filter
  const fetchPatients = useCallback(async () => {
    const docIdentifier = doctorId && !doctorId.startsWith("unreg_")
      ? doctorId
      : doctorNameParam;

    if (!docIdentifier) {
      setIsLoadingPatients(false);
      return;
    }

    setIsLoadingPatients(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("per_page", String(perPage));
      params.append("filter", inheritedFilter);
      if (inheritedFilter === "custom" && customStart && customEnd) {
        params.append("start_date", customStart);
        params.append("end_date", customEnd);
      }
      if (doctorNameParam) {
        params.append("doctor_name", doctorNameParam);
      }

      const res = await fetchFromLaravel(
        `/doctors/${encodeURIComponent(docIdentifier)}/patients?${params.toString()}`,
        { skipCache: true }
      );

      if (res && res.success) {
        setPatientList(res.patients?.data || []);
        setDoctorProfile(res.doctor || null);
        setPatientStats(
          res.summary || {
            total_patients: 0,
            total_billed: 0,
            total_paid: 0,
            total_due: 0,
          }
        );
        setPagination({
          current_page: res.patients?.current_page || 1,
          last_page: res.patients?.last_page || 1,
          total: res.patients?.total || 0,
          per_page: res.patients?.per_page || 15,
        });
      } else {
        toast.error("Error", res?.message || "Failed to load doctor's patients");
      }
    } catch (err: any) {
      console.error("Failed to fetch doctor patients:", err);
      toast.error("Network Error", err.message || "Failed to load patients data");
    } finally {
      setIsLoadingPatients(false);
    }
  }, [
    doctorId,
    doctorNameParam,
    currentPage,
    perPage,
    inheritedFilter,
    customStart,
    customEnd,
    toast,
  ]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const displayDoctorName = doctorProfile?.name || doctorNameParam || "Referring Doctor";
  const periodLabel = useMemo(
    () => getPeriodLabel(inheritedFilter, customStart, customEnd),
    [inheritedFilter, customStart, customEnd]
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-fade-in pb-20">
      {/* ── Page Header (Clean back button and title, no switcher/refresh/referrals buttons) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3.5">
          <Link href="/dashboard/doctors">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 rounded-xl border-border hover:bg-muted text-foreground cursor-pointer shrink-0 transition-colors gap-2 shadow-2xs"
              title="Back to Doctor Referrals"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-semibold text-xs">Back to Referrals</span>
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {displayDoctorName}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Calendar className="h-3 w-3" />
                <span>Period: {periodLabel}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Patients referred by this clinician during the selected filter period
            </p>
          </div>
        </div>
      </div>

      {/* ── Doctor Profile & Inherited Period KPIs ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 relative overflow-hidden">
        {/* Doctor Info */}
        <div className="flex items-center gap-4">
          <div className="h-13 w-13 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-base shrink-0 uppercase shadow-2xs">
            {displayDoctorName.replace(/^(dr\.?|mr\.?|mrs\.?)\s+/i, "").slice(0, 2) || "DR"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {displayDoctorName}
              </h2>
              {doctorProfile?.specialty && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                  {doctorProfile.specialty}
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2.5 flex-wrap mt-1">
              {doctorProfile?.clinic_hospital && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {doctorProfile.clinic_hospital}
                </span>
              )}
              {doctorProfile?.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3" />
                    {doctorProfile.phone}
                  </span>
                </>
              )}
              {doctorProfile?.default_commission_percent !== undefined && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BadgePercent className="h-3 w-3 text-primary" />
                    Commission: <strong className="text-foreground">{doctorProfile.default_commission_percent}%</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4 KPI Metric Cards (Strictly for this inherited period) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[560px]">
          {/* Total Patients */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Patients
            </span>
            <div className="text-xl font-extrabold text-foreground font-mono mt-1">
              {patientStats.total_patients}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">{periodLabel}</span>
          </div>

          {/* Gross Billed */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Gross Billed
            </span>
            <div className="text-xl font-extrabold text-foreground font-mono mt-1">
              ₹{patientStats.total_billed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Net bill sales</span>
          </div>

          {/* Total Paid */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Paid
            </span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              ₹{patientStats.total_paid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Collected revenue</span>
          </div>

          {/* Balance Due */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Outstanding Due
            </span>
            <div className={`text-xl font-extrabold font-mono mt-1 ${
              patientStats.total_due > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              ₹{patientStats.total_due.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Unpaid balance</span>
          </div>
        </div>
      </div>

      {/* ── Patients Table (Clean, Stable, Responsive, No Actions/Bill Report) ── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Subheader */}
        <div className="p-4 sm:px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>Patient Registrations</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">
                ({pagination.total} Total)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Itemized patient list for referring doctor <strong className="text-foreground">{displayDoctorName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border/70 px-2.5 py-1 rounded-lg shadow-2xs">
              <span className="text-muted-foreground">Period:</span>
              <span className="font-semibold text-foreground">{periodLabel}</span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Rows:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-card border border-border/80 rounded-lg px-2 py-1 text-xs font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[220px]">Patient Details</th>
                <th className="py-3.5 px-4 min-w-[160px]">Date Registered</th>
                <th className="py-3.5 px-4 min-w-[220px]">Prescribed Tests</th>
                <th className="py-3.5 px-4 text-right min-w-[110px]">Net Bill</th>
                <th className="py-3.5 px-4 text-right min-w-[110px]">Paid Amount</th>
                <th className="py-3.5 px-4 text-right min-w-[110px]">Due Balance</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {isLoadingPatients ? (
                // Shimmer Skeletons matching exact 8 columns
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4 text-center">
                      <Skeleton className="h-4 w-4 mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-28 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-40 rounded" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-4 w-16 rounded ml-auto" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-4 w-16 rounded ml-auto" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-4 w-16 rounded ml-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Skeleton className="h-5 w-16 rounded-full mx-auto" />
                    </td>
                  </tr>
                ))
              ) : patientList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground/60">
                      <Users className="h-7 w-7" />
                    </div>
                    <p className="font-bold text-base text-foreground">No referred patients found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      There are no patient visits or bills recorded for {displayDoctorName} during {periodLabel.toLowerCase()}.
                    </p>
                    <Link href="/dashboard/doctors">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 text-xs font-semibold rounded-xl border-border cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                        Back to Referral Overview
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                patientList.map((pat, idx) => (
                  <tr key={pat.id} className="hover:bg-muted/30 transition-colors group">
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center text-muted-foreground font-mono text-xs">
                      {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                    </td>

                    {/* Patient Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase shadow-2xs">
                          {pat.name.slice(0, 2) || "PT"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{pat.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {pat.custom_id && (
                              <span className="font-mono text-primary font-medium">{pat.custom_id}</span>
                            )}
                            {(pat.age || pat.gender) && (
                              <>
                                <span>•</span>
                                <span>{pat.age ? `${pat.age}y` : ""}{pat.gender ? ` (${pat.gender})` : ""}</span>
                              </>
                            )}
                            {pat.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono flex items-center gap-0.5">
                                  <Phone className="h-2.5 w-2.5" />
                                  {pat.phone}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date Registered */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                        <span>{pat.date_formatted}</span>
                      </div>
                    </td>

                    {/* Prescribed Tests */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <span
                        className="text-foreground truncate block font-medium text-xs"
                        title={pat.tests?.join(", ") || pat.tests_summary}
                      >
                        {pat.tests_summary}
                      </span>
                    </td>

                    {/* Net Bill */}
                    <td className="py-3.5 px-4 text-right">
                      {pat.bill ? (
                        <div className="font-bold text-foreground font-mono">
                          ₹{pat.bill.net.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {pat.bill ? (
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{pat.bill.paid.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Due Balance */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {pat.bill ? (
                        pat.bill.due > 0 ? (
                          <div className="font-bold text-amber-600 dark:text-amber-400">
                            ₹{pat.bill.due.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ₹0.00
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Payment Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          pat.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : pat.status === "PARTIAL"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : pat.status === "NO_BILL"
                            ? "bg-muted text-muted-foreground border border-border"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {pat.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Bar ── */}
        {!isLoadingPatients && pagination.total > 0 && (
          <div className="p-3.5 px-4 sm:px-6 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Showing <span className="font-bold text-foreground">{(pagination.current_page - 1) * pagination.per_page + 1}</span> to{" "}
              <span className="font-bold text-foreground">
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
              </span>{" "}
              of <span className="font-bold text-foreground">{pagination.total}</span> patients
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page <= 1}
                className="h-8 px-2.5 rounded-lg border-border text-xs cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>

              <div className="px-2 text-xs font-mono font-bold text-foreground">
                {pagination.current_page} / {pagination.last_page}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page >= pagination.last_page}
                className="h-8 px-2.5 rounded-lg border-border text-xs cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorPatientsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <DoctorPatientsContent />
    </React.Suspense>
  );
}
