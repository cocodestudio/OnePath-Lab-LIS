"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search, RefreshCw, CheckCircle2, AlertCircle, Printer, FileText,
  User, Phone, ShieldCheck, Check, Copy, TestTube2, X, ExternalLink,
  Clock, ArrowRight, Loader2, Filter
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { FullscreenPrintReportModal } from "@/components/fullscreen-print-report-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TubeInfo {
  tubeType: string;
  code: string;
  capColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  specimenType: string;
}

const TUBE_CONFIG: Record<string, { capColor: string; badgeBg: string; badgeBorder: string; badgeText: string; specimenType: string }> = {
  EDTA: {
    capColor: "#8b5cf6",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-600 dark:text-purple-400",
    specimenType: "EDTA Whole Blood",
  },
  SST: {
    capColor: "#f59e0b",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-600 dark:text-amber-400",
    specimenType: "Serum Clot Activator",
  },
  FLUORIDE: {
    capColor: "#64748b",
    badgeBg: "bg-slate-500/10",
    badgeBorder: "border-slate-500/30",
    badgeText: "text-slate-600 dark:text-slate-400",
    specimenType: "Fluoride Plasma",
  },
  CITRATE: {
    capColor: "#0284c7",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-600 dark:text-sky-400",
    specimenType: "Citrated Plasma",
  },
  URINE: {
    capColor: "#eab308",
    badgeBg: "bg-yellow-500/10",
    badgeBorder: "border-yellow-500/30",
    badgeText: "text-yellow-600 dark:text-yellow-400",
    specimenType: "Spot Urine",
  },
  STOOL: {
    capColor: "#92400e",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
    badgeText: "text-orange-700 dark:text-orange-400",
    specimenType: "Stool Specimen",
  },
};

const SEARCH_CRITERIA = [
  { value: "all", label: "All Fields", placeholder: "Search across all patient & sample details..." },
  { value: "patient_name", label: "Patient Name", placeholder: "Enter patient full name..." },
  { value: "phone", label: "Phone Number", placeholder: "Enter mobile phone number..." },
  { value: "patient_id", label: "Patient ID (PID)", placeholder: "Enter Patient ID (e.g. PID-1002)..." },
  { value: "report_id", label: "Report ID", placeholder: "Enter Report ID (e.g. REP-1001)..." },
  { value: "barcode", label: "Barcode", placeholder: "Enter or scan vial/tube barcode..." },
  { value: "abha", label: "ABHA ID", placeholder: "Enter ABHA number or address..." },
];

export default function TrackSamplesPage() {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [fullscreenReport, setFullscreenReport] = useState<any | null>(null);

  // High-performance client-side cache to minimize server requests
  const queryCache = useRef<Map<string, any[]>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const activePlaceholder = useMemo(() => {
    return SEARCH_CRITERIA.find((c) => c.value === searchType)?.placeholder || "Search sample...";
  }, [searchType]);

  const executeFetch = useCallback(async (query: string, type: string, force = false) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const cacheKey = `${type}:${trimmed.toLowerCase()}`;
    if (!force && queryCache.current.has(cacheKey)) {
      setSearchResults(queryCache.current.get(cacheKey)!);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const url = `/reports?search=${encodeURIComponent(trimmed)}&search_type=${encodeURIComponent(type)}`;
      const res = await fetchFromLaravel(url, { cacheTtlMs: 30000 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      queryCache.current.set(cacheKey, list);
      setSearchResults(list);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced live fetch when user types or changes criteria
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      executeFetch(search, searchType);
    }, 320);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, searchType, executeFetch]);

  const handleManualSearch = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    executeFetch(search, searchType, true);
  };

  const copyText = (val: string) => {
    try {
      navigator.clipboard.writeText(val);
      setCopiedCode(val);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  // Helper to extract specimen tubes for a sample
  const getSampleTubes = (rep: any): TubeInfo[] => {
    const patient = rep.patient || {};
    const meta = typeof patient.meta === "object" ? patient.meta : {};
    const tubes: TubeInfo[] = [];
    const seen = new Set<string>();

    let vb = meta.vial_barcodes || {};
    if (typeof vb === "string") {
      try { vb = JSON.parse(vb); } catch {}
    }

    if (vb && typeof vb === "object") {
      Object.entries(vb).forEach(([type, code]) => {
        const c = String(code).trim();
        const upperType = type.toUpperCase();
        if (c && !seen.has(c)) {
          const conf = TUBE_CONFIG[upperType] || {
            capColor: "#6366f1",
            badgeBg: "bg-indigo-500/10",
            badgeBorder: "border-indigo-500/30",
            badgeText: "text-indigo-600 dark:text-indigo-400",
            specimenType: "Lab Specimen",
          };
          tubes.push({ tubeType: upperType, code: c, ...conf });
          seen.add(c);
        }
      });
    }

    const rawBarcode = String(patient.vial_barcode || patient.vialBarcode || meta.vial_barcode || "").trim();
    if (rawBarcode) {
      rawBarcode.split(",").map((s) => s.trim()).filter(Boolean).forEach((code, i) => {
        if (!seen.has(code)) {
          const fallbackType = ["EDTA", "SST", "FLUORIDE", "CITRATE", "URINE"][i] || "VIAL";
          const conf = TUBE_CONFIG[fallbackType] || {
            capColor: "#6366f1",
            badgeBg: "bg-indigo-500/10",
            badgeBorder: "border-indigo-500/30",
            badgeText: "text-indigo-600 dark:text-indigo-400",
            specimenType: "Lab Specimen",
          };
          tubes.push({ tubeType: fallbackType, code, ...conf });
          seen.add(code);
        }
      });
    }

    return tubes;
  };

  // Stage calculation for each sample
  const getSampleStage = (rep: any) => {
    const repStatus = String(rep.status || "").toUpperCase();
    const patientMeta = typeof rep.patient?.meta === "object" ? rep.patient.meta : {};
    const sampleStatus = String(patientMeta?.sample_status || "").toUpperCase();

    if (repStatus === "REJECTED" || sampleStatus === "REJECTED") {
      return { stage: "REJECTED", step: 0, label: "Sample Rejected", badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    }
    if (["APPROVED", "FINAL", "COMPLETED", "READY"].includes(repStatus)) {
      return { stage: "APPROVED", step: 4, label: "Report Approved", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    }
    if (["IN_TRANSIT", "PROCESSING"].includes(repStatus)) {
      return { stage: "PROCESSING", step: 3, label: "Testing in Progress", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    }
    if (sampleStatus === "COLLECTED" || repStatus === "COLLECTED") {
      return { stage: "COLLECTED", step: 2, label: "Sample Collected", badgeClass: "bg-sky-500/10 text-sky-600 border-sky-500/20" };
    }
    // Default: Sample Registered at Front Desk
    return { stage: "REGISTERED", step: 1, label: "Sample Registered", badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header Deck (Consistent with Dashboard & Patients Registry) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Track Samples
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time specimen lifecycle tracking, phlebotomy status &amp; report verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualSearch}
            disabled={isSearching}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSearching ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Search Bar with Dropdown (Full Width, Zero Conflicting Results) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
        {/* Dropdown for Search Criteria */}
        <div className="sm:w-56 shrink-0">
          <Select
            value={searchType}
            onValueChange={(val) => {
              setSearchType(val);
              if (search.trim()) {
                executeFetch(search, val);
              }
            }}
          >
            <SelectTrigger className="h-11 bg-card border-border text-xs font-semibold shadow-xs rounded-xl">
              <SelectValue placeholder="Search by..." />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_CRITERIA.map((crit) => (
                <SelectItem key={crit.value} value={crit.value} className="text-xs font-medium cursor-pointer">
                  {crit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualSearch();
            }}
            placeholder={activePlaceholder}
            className="w-full pl-10 pr-10 h-11 text-sm bg-card border-border shadow-xs rounded-xl"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchResults([]);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Instant Search Button */}
        <Button
          type="button"
          onClick={handleManualSearch}
          disabled={isSearching || !search.trim()}
          className="h-11 px-5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>Search</span>
        </Button>
      </div>

      {/* ── State 1: Search Empty (Minimal, Clean Placeholder) ── */}
      {!search.trim() ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-foreground">
              Search to Track Sample
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Select a search criteria (Name, Phone, PID, Barcode, etc.) and enter details above to track the sample journey.
            </p>
          </div>
        </div>
      ) : isSearching ? (
        /* Loading state */
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3 shadow-xs">
          <Loader2 className="h-7 w-7 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">
            Searching for &ldquo;{search}&rdquo;...
          </p>
        </div>
      ) : searchResults.length === 0 ? (
        /* ── State 2: No Results Found ── */
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-foreground">
              No matching diagnostic samples found
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              No sample matched &ldquo;{search}&rdquo; under {SEARCH_CRITERIA.find((c) => c.value === searchType)?.label}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setSearchResults([]);
            }}
            className="text-xs cursor-pointer"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        /* ── State 3: Results Found (Clean, Structured Details with Stepper & Print) ── */
        <div className="space-y-6">
          <div className="text-xs font-semibold text-muted-foreground px-1">
            Showing {searchResults.length} matching result{searchResults.length !== 1 ? "s" : ""}:
          </div>

          {searchResults.map((rep) => {
            const p = rep.patient || {};
            const pMeta = typeof p.meta === "object" ? p.meta : {};
            const tubes = getSampleTubes(rep);
            const stageInfo = getSampleStage(rep);
            const currentStep = stageInfo.step;
            const isApproved = stageInfo.stage === "APPROVED";
            const isRejected = stageInfo.stage === "REJECTED";

            const primaryBarcode = p.vial_barcode || p.vialBarcode || pMeta.vial_barcode || rep.custom_id || rep.customId || "—";
            const abhaNumber = p.abha_number || p.abhaNumber || pMeta.abha_number;
            const abhaAddress = p.abha_address || p.abhaAddress || pMeta.abha_address;

            const registeredDateStr = (rep.created_at || rep.createdAt || p.created_at || p.createdAt)
              ? new Date((rep.created_at || rep.createdAt || p.created_at || p.createdAt) as string).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Registered Today";

            return (
              <div
                key={rep.id}
                className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden space-y-6 p-6"
              >
                {/* 1. Patient Header & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                      {p.name ? p.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-foreground">
                          {p.designation ? `${p.designation} ` : ""}{p.name || "Patient"}
                        </h2>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground">
                          {p.custom_id || p.customId || "PID-—"}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stageInfo.badgeClass}`}>
                          {stageInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{p.age ? `${p.age} Yrs` : "Age N/A"}</span>
                        <span>·</span>
                        <span>{p.gender || "Gender N/A"}</span>
                        <span>·</span>
                        <span>Registered: <strong suppressHydrationWarning className="text-foreground font-medium">{registeredDateStr}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Actions: Print Report Button */}
                  <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setFullscreenReport(rep)}
                      className={`text-xs font-bold gap-2 cursor-pointer shadow-xs ${
                        isApproved
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "gradient-primary text-primary-foreground"
                      }`}
                    >
                      <Printer className="h-4 w-4" />
                      <span>{isApproved ? "Print Approved Report" : "Print / Preview Report"}</span>
                    </Button>

                    <Link
                      href={`/dashboard/reports/${rep.id}`}
                      target="_blank"
                      className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Open full report in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* 2. 4-Step Animated Progress Stepper */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Sample Processing Lifecycle
                    </span>
                    <span className="text-xs font-mono font-semibold text-primary">
                      Stage {isRejected ? "Rejected" : `${currentStep} of 4`}
                    </span>
                  </div>

                  {isRejected ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex items-start gap-2.5 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                      <div>
                        <strong className="font-bold">Sample Rejected: </strong>
                        <span>{pMeta.rejection_reason || rep.meta?.rejection_reason || "Sample hemolyzed or insufficient quantity."}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="relative">
                        {/* Background line */}
                        <div className="absolute top-4 left-6 right-6 h-1 bg-muted rounded-full" />

                        {/* Active line */}
                        <div
                          className="absolute top-4 left-6 h-1 bg-primary rounded-full transition-all duration-500"
                          style={{
                            width: currentStep === 1 ? "0%" : currentStep === 2 ? "33%" : currentStep === 3 ? "66%" : "100%",
                          }}
                        />

                        {/* 4 Steps */}
                        <div className="relative z-10 grid grid-cols-4 gap-2">
                          {/* Step 1 */}
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 1
                                  ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {currentStep > 1 ? <Check className="h-4 w-4 stroke-[2.5]" /> : "1"}
                            </div>
                            <span className="text-[11px] font-bold text-foreground">Registered</span>
                            <span className="text-[10px] text-muted-foreground hidden sm:block">Front Desk</span>
                          </div>

                          {/* Step 2 */}
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 2
                                  ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {currentStep > 2 ? <Check className="h-4 w-4 stroke-[2.5]" /> : "2"}
                            </div>
                            <span className="text-[11px] font-bold text-foreground">Collected</span>
                            <span className="text-[10px] text-muted-foreground hidden sm:block">Phlebotomy</span>
                          </div>

                          {/* Step 3 */}
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 3
                                  ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {currentStep > 3 ? <Check className="h-4 w-4 stroke-[2.5]" /> : "3"}
                            </div>
                            <span className="text-[11px] font-bold text-foreground">Testing</span>
                            <span className="text-[10px] text-muted-foreground hidden sm:block">Lab Processing</span>
                          </div>

                          {/* Step 4 */}
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 4
                                  ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {currentStep >= 4 ? <CheckCircle2 className="h-4 w-4" /> : "4"}
                            </div>
                            <span className="text-[11px] font-bold text-foreground">Approved</span>
                            <span className="text-[10px] text-muted-foreground hidden sm:block">Pathologist Verified</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Patient Details & Specimen Tubes Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/70">
                  {/* Left: Demographics & Medical Info */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                    <span className="text-xs font-bold text-foreground block border-b border-border/50 pb-1.5">
                      Demographics &amp; Contact Info
                    </span>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Phone</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-foreground font-mono">{p.phone || "—"}</span>
                          {p.phone && (
                            <button
                              type="button"
                              onClick={() => copyText(p.phone)}
                              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedCode === p.phone ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block">Referred By</span>
                        <span className="font-semibold text-foreground mt-0.5 block truncate">
                          Dr. {p.ref_doctor || p.refDoctor || "Self"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block">Collection Centre</span>
                        <span className="font-semibold text-foreground mt-0.5 block truncate">
                          {p.collected_at || p.collectedAt || "Main Lab"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block">Report ID</span>
                        <span className="font-mono font-semibold text-primary mt-0.5 block truncate">
                          {rep.custom_id || rep.customId || "REP-—"}
                        </span>
                      </div>

                      {(abhaNumber || abhaAddress) && (
                        <div className="col-span-2 p-2 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[9px] font-bold uppercase text-primary block">ABHA ID</span>
                            <span className="font-mono font-semibold text-foreground">{abhaNumber || abhaAddress}</span>
                          </div>
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Tests Ordered & Specimen Tubes */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                    <span className="text-xs font-bold text-foreground block border-b border-border/50 pb-1.5">
                      Diagnostic Tests &amp; Specimen Tubes
                    </span>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Tests Ordered</span>
                        <p className="text-xs font-semibold text-foreground mt-0.5 line-clamp-2">
                          {rep.results?.map((r: any) => r.test?.name).filter(Boolean).join(", ") || rep.package_name || "Diagnostic Panel"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">
                          Specimen Tubes &amp; Barcodes
                        </span>

                        {tubes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {tubes.map((tube) => (
                              <div
                                key={tube.code + tube.tubeType}
                                className="px-2.5 py-1 rounded-lg bg-card border border-border flex items-center gap-1.5 text-xs shadow-2xs"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: tube.capColor }}
                                />
                                <span className="font-bold text-[10px] text-foreground">{tube.tubeType}:</span>
                                <span className="font-mono text-[10px] text-muted-foreground font-semibold">{tube.code}</span>
                                <button
                                  type="button"
                                  onClick={() => copyText(tube.code)}
                                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer ml-0.5"
                                  title="Copy Tube Barcode"
                                >
                                  {copiedCode === tube.code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-muted-foreground bg-card p-1.5 rounded-lg border border-border inline-block">
                            Barcode: <strong className="text-foreground">{primaryBarcode}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fullscreen Print Report Modal ── */}
      {fullscreenReport && (
        <FullscreenPrintReportModal
          open={!!fullscreenReport}
          onOpenChange={(open) => {
            if (!open) setFullscreenReport(null);
          }}
          report={fullscreenReport}
        />
      )}
    </div>
  );
}
