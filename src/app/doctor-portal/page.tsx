"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope, FileText, Download, Calendar, Search,
  CheckCircle2, Clock, Lock, Building2, ShieldCheck,
  X, Loader2, ArrowLeft, ChevronLeft, ChevronRight
} from "lucide-react";
import { PaginatedReportPreview, PrintSettings } from "@/components/report-sheet";
import { downloadNativePdf } from "@/lib/pdf-report-downloader";
import { getCleanLetterheadUrl } from "@/lib/api-client";

function getDoctorPortalApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Production domain mapping
    if (host.includes("onepathlab.com")) {
      return "https://api.onepathlab.com/api/doctor-portal";
    }
    // Remote mobile testing on same LAN IP (e.g. 192.168.x.x)
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.protocol}//${host}:8000/api/doctor-portal`;
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) return "http://localhost:8000/api/doctor-portal";
  const clean = envUrl.replace(/\/+$/, "");
  const base = clean.replace(/\/api\/lis$/, "").replace(/\/api$/, "").replace(/\/lis$/, "");
  return `${base}/api/doctor-portal`;
}

function DoctorPortalContent() {
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const router = useRouter();

  // Resolve token from query param ?token=... or route param [token]
  const rawToken =
    (searchParams.get("token") as string) ||
    (routeParams?.token as string) ||
    "";
  const token = rawToken ? rawToken.trim() : "";

  // Doctor & Lab Profile
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [labInfo, setLabInfo] = useState<any>(null);

  // Pagination state for rapid loading
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);
  const [pagination, setPagination] = useState<{
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  // Reports & Filters
  const [reports, setReports] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total_patients: 0,
    total_reports: 0,
    ready_reports: 0,
    pending_reports: 0,
  });
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Date Range Filtering
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Single Direct PDF Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [renderReportData, setRenderReportData] = useState<any | null>(null);
  const offscreenPrintRef = useRef<HTMLDivElement>(null);

  const apiBase = useMemo(() => getDoctorPortalApiBase(), []);

  // Strict Token Verification on mount: No leak of other doctors
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setAuthError("No access token provided. Please click the personal 1-click link sent to your WhatsApp by the laboratory.");
      return;
    }

    let isMounted = true;
    const verifyToken = async () => {
      try {
        setIsVerifying(true);
        setAuthError(null);
        const res = await fetch(`${apiBase}/verify?token=${encodeURIComponent(token)}`, {
          headers: { "Accept": "application/json" },
        });
        const data = await res.json();

        if (isMounted) {
          if (res.ok && data.success) {
            setDoctorInfo(data.doctor);
            setLabInfo(data.lab);
          } else {
            throw new Error(data.error || "Invalid or expired Doctor Portal access link. Please request a fresh link from your laboratory.");
          }
        }
      } catch (err: any) {
        console.error("Token verification failed:", err);
        if (isMounted) {
          setAuthError(err.message || "Failed to verify access link. Please request a fresh link from your diagnostic lab.");
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, apiBase]);

  // Fetch Reports with server-side pagination & filtering
  const fetchReports = useCallback(async () => {
    if (!token || authError) return;

    try {
      setIsLoadingReports(true);
      const url = new URL(`${apiBase}/reports`);
      url.searchParams.set("token", token);
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("per_page", String(perPage));

      if (selectedFilter === "custom") {
        if (customStartDate && customEndDate) {
          url.searchParams.set("filter", "custom");
          url.searchParams.set("start_date", customStartDate);
          url.searchParams.set("end_date", customEndDate);
        } else {
          url.searchParams.set("filter", "all");
        }
      } else if (selectedFilter !== "all") {
        url.searchParams.set("filter", selectedFilter);
      }

      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }

      const res = await fetch(url.toString(), {
        headers: { "Accept": "application/json" },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setReports(data.reports || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to load doctor reports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  }, [token, authError, selectedFilter, customStartDate, customEndDate, searchQuery, currentPage, perPage, apiBase]);

  useEffect(() => {
    if (!isVerifying && !authError && doctorInfo) {
      fetchReports();
    }
  }, [isVerifying, authError, doctorInfo, fetchReports]);

  // Print settings resolved cleanly from report lab settings or labInfo
  const resolvedPrintSettings: PrintSettings = useMemo(() => {
    const lab = (renderReportData?.lab || labInfo || {}) as any;
    const rawBg = lab.printBgImage || lab.print_bg_image || lab.letterhead_url || lab.letterheadUrl || null;
    const hasBg = Boolean(rawBg && rawBg !== "null" && rawBg !== "undefined" && rawBg !== "none");
    const bgImage = hasBg ? getCleanLetterheadUrl(rawBg) : null;

    return {
      bgImage,
      headerHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 185,
      footerHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 95,
      marginLeft: lab.printMarginLeft ?? lab.print_margin_left ?? 32,
      marginRight: lab.printMarginRight ?? lab.print_margin_right ?? 32,
    };
  }, [renderReportData, labInfo]);

  // Formatted report with normalized lab report_settings for PaginatedReportPreview
  const formattedReportData = useMemo(() => {
    if (!renderReportData) return null;
    const lab = renderReportData.lab || labInfo || {};
    let labReportSettings: any = {};
    const rawSettings = lab.report_settings ?? lab.reportSettings;
    if (typeof rawSettings === "string") {
      try {
        labReportSettings = JSON.parse(rawSettings || "{}");
      } catch {
        labReportSettings = {};
      }
    } else if (rawSettings && typeof rawSettings === "object") {
      labReportSettings = { ...rawSettings };
    }

    return {
      ...renderReportData,
      customId: renderReportData.custom_id ?? renderReportData.customId ?? "Report",
      custom_id: renderReportData.custom_id ?? renderReportData.customId ?? "Report",
      lab: {
        ...lab,
        report_settings: labReportSettings,
        reportSettings: labReportSettings,
      },
    };
  }, [renderReportData, labInfo]);

  // 1-Click Direct Automatic Browser PDF Download (Exact same engine & vector graphics as Print Report page)
  const handleDownloadReportPdf = async (rep: any) => {
    const repId = rep.id || rep.custom_id;
    try {
      setDownloadingId(repId);

      // 1. Fetch full clinical report payload
      const res = await fetch(`${apiBase}/reports/${repId}?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.report) {
        throw new Error(data.error || "Could not retrieve report data.");
      }

      const fullReport = data.report;
      setRenderReportData(fullReport);

      // 2. Wait 350ms for React to mount PaginatedReportPreview and complete block height measurements
      await new Promise((r) => setTimeout(r, 350));

      if (!offscreenPrintRef.current) {
        throw new Error("Report rendering container not ready.");
      }

      // 3. Compose clean, safe clinical filename
      const pat = fullReport.patient || rep.patient || {};
      const patName = (pat.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const code = (fullReport.custom_id || fullReport.customId || rep.custom_id || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `LabReport_${code}_${patName}.pdf`;

      // 4. Generate high-precision vector PDF identical to Print Report page (zero server load)
      await downloadNativePdf({
        printContainer: offscreenPrintRef.current,
        filename,
      });
    } catch (err: any) {
      console.error("PDF download error:", err);
      alert(err?.message || "Failed to download PDF. Please try again.");
    } finally {
      setDownloadingId(null);
      setRenderReportData(null);
    }
  };

  // ── Auth Error Screen (for external visitors with missing or invalid token) ──
  if (!isVerifying && authError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border/80 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Doctor Portal Access Required</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">{authError}</p>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-left text-xs space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Strict Privacy & Patient Data Security</span>
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Diagnostic patient reports are protected by clinical confidentiality protocols. Each referring clinician is assigned a personalized, tamper-proof WhatsApp portal link.
            </p>
            <p className="text-muted-foreground text-[11px]">
              Please open the link sent directly to your registered mobile WhatsApp, or contact your laboratory administration to issue a fresh link.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-xs text-primary hover:underline font-semibold"
            >
              Diagnostic Laboratory Staff Sign In →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading Screen ──
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-semibold text-foreground">Verifying Doctor Access Link...</p>
        <p className="text-xs text-muted-foreground mt-1">Connecting to laboratory records</p>
      </div>
    );
  }

  const doctorName = doctorInfo?.name || "Doctor";
  const doctorDegree = doctorInfo?.degree;
  const doctorClinic = doctorInfo?.clinic_hospital;
  const labName = labInfo?.name || "Diagnostic Laboratory";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-20">
      {/* ── Top Header Navigation (Call Lab & Refresh Removed as requested) ── */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          {/* Lab & Doctor Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                  {labName}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Clinician Access</span>
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">
                {doctorName}
                {doctorDegree && <span className="font-normal text-muted-foreground ml-1.5 text-xs">({doctorDegree})</span>}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* Clinician Welcome Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Doctor Access Portal</span>
              {doctorClinic && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  · <Building2 className="w-3 h-3" /> {doctorClinic}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-bold text-foreground mt-1">
              Referral Patients & Verified Diagnostic Reports
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live laboratory feed for patients referred by your clinic. Download official PDF reports with letterhead instantly.
            </p>
          </div>

          {/* KPI Counters (Responsive for both Mobile & PC) */}
          <div className="grid grid-cols-3 gap-2 sm:border-l sm:border-border/60 sm:pl-4 shrink-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-card border border-border/80 text-center min-w-[64px] sm:min-w-[72px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total</span>
              <span className="text-base sm:text-lg font-bold font-mono text-foreground">{summary.total_reports}</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[64px] sm:min-w-[72px]">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Ready</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{summary.ready_reports}</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center min-w-[64px] sm:min-w-[72px]">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Pending</span>
              <span className="text-base sm:text-lg font-bold font-mono text-amber-700 dark:text-amber-400">{summary.pending_reports}</span>
            </div>
          </div>
        </div>

        {/* ── Search & Date Filter Ribbon ── */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by patient name, phone, or PID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Records" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "custom", label: "Date Range" },
            ].map((f) => {
              const active = selectedFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFilter(f.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.id === "custom" ? (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{customStartDate && customEndDate ? `${customStartDate} → ${customEndDate}` : "Date Range"}</span>
                    </span>
                  ) : (
                    f.label
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Custom Date Range Inline Panel ── */}
        {selectedFilter === "custom" && (
          <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/30 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Select Range:</span>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchReports}
                disabled={!customStartDate || !customEndDate || isLoadingReports}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                Apply Range
              </button>
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setSelectedFilter("all");
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs text-muted-foreground transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Reports List ── */}
        {isLoadingReports ? (
          <div className="p-12 text-center rounded-3xl border border-border/80 bg-card">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-muted-foreground font-semibold mt-3">Loading referral reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-bold text-foreground mt-3">No Reports Found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || selectedFilter !== "all"
                ? "No patient reports matched your search or selected date filter. Try selecting 'All Records'."
                : "No referral reports have been registered for your clinic yet. As soon as a patient is registered, their report will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => {
              const pat = rep.patient || {};
              const isReady = rep.is_ready;
              const isDownloading = downloadingId === (rep.id || rep.custom_id);

              return (
                <div
                  key={rep.id || rep.custom_id}
                  className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/40 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Patient Demographics & Tests */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm shadow-xs ${
                        isReady
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {pat.name ? pat.name.charAt(0).toUpperCase() : "P"}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground truncate">{pat.name || "Patient"}</h3>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({pat.age ? `${pat.age}Y` : "Age N/A"} / {pat.gender || "Gender N/A"})
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                          PID: {pat.custom_id || "N/A"}
                        </span>
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Report Ready</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>In Process</span>
                          </span>
                        )}
                      </div>

                      {/* Date & Test Names */}
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-muted-foreground/70" />
                          <span>{rep.date || "Date N/A"}</span>
                        </span>
                        {rep.tests && rep.tests.length > 0 && (
                          <span className="text-foreground font-medium truncate max-w-md">
                            Tests: {rep.tests.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action: Single Direct Automatic Download Report Button */}
                  <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadReportPdf(rep)}
                      disabled={isDownloading}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      title="Download official PDF report with lab letterhead directly"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Downloading PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-xs text-xs text-muted-foreground mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Showing{" "}
                    <strong className="text-foreground">
                      {Math.min(pagination.total, (pagination.current_page - 1) * pagination.per_page + 1)}
                    </strong>
                    {" "}-{" "}
                    <strong className="text-foreground">
                      {Math.min(pagination.total, pagination.current_page * pagination.per_page)}
                    </strong>
                    {" "}of{" "}
                    <strong className="text-foreground">{pagination.total}</strong> reports
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoadingReports}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Page {pagination.current_page} of {Math.max(1, pagination.last_page)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                    disabled={currentPage >= pagination.last_page || isLoadingReports}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Pristine Off-Screen PDF Container (strictly hidden behind viewport) ── */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0px",
          width: "794px",
          zIndex: -9999,
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        {formattedReportData && (
          <PaginatedReportPreview
            ref={offscreenPrintRef}
            report={formattedReportData}
            settings={resolvedPrintSettings}
            scale={1}
            autoFitToFooter={true}
          />
        )}
      </div>
    </div>
  );
}

interface NextPageProps {
  params?: Promise<any> | any;
  searchParams?: Promise<any> | any;
}

export default function DoctorPortalPage(_props: NextPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
          <p className="text-sm font-semibold text-foreground">Loading Doctor Portal...</p>
        </div>
      }
    >
      <DoctorPortalContent />
    </Suspense>
  );
}
