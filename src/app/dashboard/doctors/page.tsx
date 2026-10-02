"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Stethoscope, Users, TrendingUp, Search, RefreshCw,
  Calendar, Clock, Check, Copy, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Building2, Phone, Mail, Wallet,
  ShieldCheck, ArrowRight, X, Filter, Sparkles, PlusCircle,
  FileText, Percent, IndianRupee, Eye,
  SlidersHorizontal, Award, ArrowUpRight, BadgePercent, ChevronDown,
  Printer, Loader2, ExternalLink
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadDoctorStatementPdf } from "@/lib/download-doctor-statement";

interface DoctorStat {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  clinic_hospital?: string | null;
  address?: string | null;
  default_commission_percent: number;
  custom_commission_percent?: number | null;
  is_using_global_rate?: boolean;
  test_commissions?: Record<string, any>;
  is_active: boolean;
  is_registered: boolean;
  patient_count: number;
  bills_count: number;
  gross_sales: number;
  discount_total: number;
  net_sales: number;
  paid_total: number;
  due_balance: number;
  commission_percent: number;
  doctor_commission: number;
  lab_net_share: number;
}

export default function DoctorsOverviewPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<string>("this_month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [doctors, setDoctors] = useState<DoctorStat[]>([]);
  const [summary, setSummary] = useState({
    total_sales: 0,
    total_doctor_commission: 0,
    total_lab_revenue: 0,
    total_patients: 0,
    active_doctors: 0,
    total_registered_doctors: 0,
  });

  // Pagination for Doctor list
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Statement Download & Lab State
  const [labInfo, setLabInfo] = useState<any>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Fetch Lab Details for statement letterhead branding
  useEffect(() => {
    fetchFromLaravel("/lab")
      .then((res) => {
        if (res) setLabInfo(res);
      })
      .catch((err) => console.warn("Could not fetch lab info for statements:", err));
  }, []);

  // Statement Download Handler (PDF Direct 1-Click)
  const handleDownloadStatement = async (doc: DoctorStat) => {
    setDownloadingDocId(doc.id);
    try {
      const params = new URLSearchParams();
      params.append("filter", filter);
      if (filter === "custom" && customStart && customEnd) {
        params.append("start_date", customStart);
        params.append("end_date", customEnd);
      }
      params.append("doctor_name", doc.name);

      const docIdentifier = doc.id && !doc.id.startsWith("unreg_") ? doc.id : doc.name;
      const res = await fetchFromLaravel(`/doctors/${encodeURIComponent(docIdentifier)}/statement?${params.toString()}`, {
        skipCache: true,
      });

      if (!res || !res.success) {
        throw new Error(res?.message || res?.error || "Failed to retrieve doctor statement data");
      }

      const statementLab = {
        name: labInfo?.name || "OnePath Diagnostic Laboratory",
        tagline: labInfo?.tagline || "Advanced Pathology & Diagnostics",
        address: labInfo?.address || (labInfo?.city ? `${labInfo?.city}, ${labInfo?.state || ""}` : undefined),
        phone: labInfo?.phone,
        email: labInfo?.email,
        website: labInfo?.website,
      };

      await downloadDoctorStatementPdf(res, statementLab);
      toast.success("Statement Downloaded", `PDF statement for ${doc.name} generated successfully.`);
    } catch (err: any) {
      console.error("Statement download failed:", err);
      toast.error("Download Failed", err.message || "Failed to generate doctor statement");
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Fetch doctors overview data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("filter", filter);
      if (filter === "custom" && customStart && customEnd) {
        params.append("start_date", customStart);
        params.append("end_date", customEnd);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetchFromLaravel(`/doctors?${params.toString()}`, { skipCache: true });
      if (res && res.success) {
        const fetched = Array.isArray(res.doctors) ? res.doctors.filter((d: any) => d.is_active !== false) : [];
        setDoctors(fetched);
        setSummary(res.summary || {
          total_sales: 0,
          total_doctor_commission: 0,
          total_lab_revenue: 0,
          total_patients: 0,
          active_doctors: 0,
          total_registered_doctors: 0,
        });
        setCurrentPage(1);
      } else {
        toast.error("Error", res?.message || "Failed to load doctor analytics");
      }
    } catch (err: any) {
      console.error("Failed to load doctor referral data:", err);
      toast.error("Network Error", err.message || "Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  }, [filter, customStart, customEnd, search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered doctors list
  const filteredDoctors = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.toLowerCase().trim();
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.specialty && d.specialty.toLowerCase().includes(q)) ||
        (d.clinic_hospital && d.clinic_hospital.toLowerCase().includes(q)) ||
        (d.phone && d.phone.includes(q))
    );
  }, [doctors, search]);

  // Paginated Doctors
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / pageSize));
  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDoctors.slice(start, start + pageSize);
  }, [filteredDoctors, currentPage, pageSize]);

  const labMarginPercent = summary.total_sales > 0
    ? Math.round((summary.total_lab_revenue / summary.total_sales) * 100)
    : 100;

  // Generate URL to doctor's patients page passing active period filter
  const getDoctorPatientsUrl = (doc: DoctorStat) => {
    const params = new URLSearchParams();
    params.set("doctor_id", doc.id);
    params.set("doctor_name", doc.name);
    params.set("filter", filter);
    if (filter === "custom" && customStart && customEnd) {
      params.set("start_date", customStart);
      params.set("end_date", customEnd);
    }
    return `/dashboard/doctors/patients?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-fade-in pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs shrink-0">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Doctor Referrals & Revenue
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                LIS Analytics
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Monitor doctor sales performance, commission payouts, and net laboratory revenue
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2 h-9 rounded-xl border-border hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/dashboard/doctors/manage">
            <Button
              size="sm"
              className="gap-2 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Manage & Discounts</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filter & Search Toolbar (Responsive & Clean) ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-card border border-border/80 rounded-2xl p-3 sm:p-3.5 shadow-xs">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0">
          {[
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "This Week", value: "this_week" },
            { label: "This Month", value: "this_month" },
            { label: "This Year", value: "this_year" },
            { label: "All Time", value: "all" },
            { label: "Custom", value: "custom" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFilter(item.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === item.value
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers & Responsive Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {filter === "custom" && (
            <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border/80 justify-between sm:justify-start">
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-mono font-medium outline-none focus:border-primary text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-mono font-medium outline-none focus:border-primary text-foreground"
              />
            </div>
          )}

          {/* Search Input with non-overlapping padding */}
          <div className="relative w-full sm:w-72 md:w-80 lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search doctor, specialty, clinic, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
              className="h-9.5 text-xs rounded-xl bg-background border-border/80 focus:border-primary shadow-2xs w-full transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-full hover:bg-muted transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Referral Sales */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Sales
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
              ₹{summary.total_sales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Net billed sales from referrals
            </div>
          </div>
        </div>

        {/* Doctor Commission */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Doctor Share
            </span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BadgePercent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              ₹{summary.total_doctor_commission.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Total clinician commission cut
            </div>
          </div>
        </div>

        {/* Lab Net Revenue */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Lab Net Share
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{summary.total_lab_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                {labMarginPercent}%
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Net retained in laboratory
            </div>
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Patients
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
              {summary.total_patients}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Total referred registrations
            </div>
          </div>
        </div>

        {/* Active Doctors */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Referring Doctors
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
              {summary.active_doctors}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Active clinicians in this period
            </div>
          </div>
        </div>
      </div>

      {/* ── Doctors Table ── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>Doctor Revenue Breakdown</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">
                ({filteredDoctors.length} Clinicians)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Itemized sales and commission shares by referring doctor
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground font-mono">
              Period: <span className="font-semibold text-foreground capitalize">{filter.replace("_", " ")}</span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="w-full min-w-[780px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Doctor Details</th>
                <th className="py-3 px-3 text-center">Patients</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-3 text-center">Comm. %</th>
                <th className="py-3 px-4 text-right">Doctor Cut</th>
                <th className="py-3 px-4 text-right">Lab Net Revenue</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {isLoading ? (
                // Shimmer Effect Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-48 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <Skeleton className="h-5 w-8 rounded-full mx-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-20 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <Skeleton className="h-5 w-12 rounded-lg mx-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-16 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-16 rounded ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Skeleton className="h-7 w-16 rounded-lg" />
                        <Skeleton className="h-7 w-7 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="font-semibold text-sm">No referral doctors or sales found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try selecting a broader date range or clear search filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDoctors.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Doctor Details */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                          {doc.name.replace(/^(dr\.?|mr\.?|mrs\.?)\s+/i, "").slice(0, 2) || "DR"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground truncate block">
                              {doc.name}
                            </span>
                            {!doc.is_registered && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                                Historical
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                            {doc.specialty && <span>{doc.specialty}</span>}
                            {doc.specialty && doc.clinic_hospital && <span>•</span>}
                            {doc.clinic_hospital && <span>{doc.clinic_hospital}</span>}
                            {doc.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{doc.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Patients Count (Link to separate patient registry) */}
                    <td className="py-3.5 px-3 text-center">
                      <Link
                        href={getDoctorPatientsUrl(doc)}
                      >
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title={`View all ${doc.patient_count} patients referred by ${doc.name}`}
                        >
                          <Users className="h-3 w-3" />
                          <span>{doc.patient_count}</span>
                        </span>
                      </Link>
                    </td>

                    {/* Total Sales */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-foreground font-mono">
                        ₹{doc.net_sales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {doc.discount_total > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Gross: ₹{doc.gross_sales.toFixed(0)} | Disc: ₹{doc.discount_total.toFixed(0)}
                        </div>
                      )}
                    </td>

                    {/* Commission % */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono border border-indigo-200/50 dark:border-indigo-800/50">
                          {doc.commission_percent}%
                        </span>
                        {doc.is_using_global_rate && (
                          <span className="text-[9px] text-muted-foreground mt-0.5">Global</span>
                        )}
                      </div>
                    </td>

                    {/* Doctor Commission */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        ₹{doc.doctor_commission.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Lab Net Revenue */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{doc.lab_net_share.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Actions: View Patients (Separate Page) + Set Rates + Print Statement */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Patients Separate Page Link */}
                        <Link
                          href={getDoctorPatientsUrl(doc)}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-foreground cursor-pointer transition-colors"
                            title={`Open separate patient registry for ${doc.name}`}
                          >
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden xl:inline">View Patients</span>
                            <span className="xl:hidden">Patients</span>
                          </Button>
                        </Link>

                        <Link href={`/dashboard/doctors/manage?selected_doctor=${encodeURIComponent(doc.name)}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 border-border hover:bg-muted/80 text-foreground cursor-pointer transition-colors"
                            title="Configure Rates & Discounts for this Doctor"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                            <span>Set Rates</span>
                          </Button>
                        </Link>

                        {/* Direct 1-Click Print PDF Statement */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadStatement(doc)}
                          disabled={Boolean(downloadingDocId)}
                          className={`h-8 w-8 p-0 rounded-lg border-border hover:bg-muted/80 text-foreground cursor-pointer transition-colors ${
                            downloadingDocId === doc.id ? "opacity-75 pointer-events-none" : ""
                          }`}
                          title="Download Official PDF Statement"
                        >
                          {downloadingDocId === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <Printer className="h-3.5 w-3.5 text-foreground/80 hover:text-foreground" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Bar ── */}
        {!isLoading && filteredDoctors.length > 0 && (
          <div className="p-3.5 px-4 sm:px-6 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-foreground">
                {Math.min(currentPage * pageSize, filteredDoctors.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{filteredDoctors.length}</span> doctors
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 rounded-lg border-border text-xs cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>

              <div className="px-2 text-xs font-mono font-bold text-foreground">
                {currentPage} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
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
