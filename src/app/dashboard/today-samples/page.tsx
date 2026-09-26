"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock, FlaskConical, Search, PlusCircle, RefreshCw, CheckCircle2,
  Copy, Check, FileText, ArrowRight, ShieldCheck, IndianRupee,
  Filter, AlertCircle, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, User,
  Barcode, Edit2, Lock, Printer, Receipt, X, Loader2, SlidersHorizontal, Sparkles, CheckCheck, Plus
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { BarcodeSVG } from "@/components/barcode-svg";

interface TubeConfigItem {
  tubeType: string;
  capColor: string;
  capName: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  title: string;
  specimenType: string;
  additive: string;
  department: string;
}

const TUBE_CONFIG: Record<string, TubeConfigItem> = {
  EDTA: {
    tubeType: "EDTA",
    capColor: "#8b5cf6",
    capName: "Lavender / Purple Top",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-600 dark:text-purple-400",
    title: "EDTA Vacutainer",
    specimenType: "Whole Blood (EDTA)",
    additive: "K2/K3 EDTA Anticoagulant",
    department: "Hematology (CBC, ESR, HbA1c, Blood Group)",
  },
  SST: {
    tubeType: "SST",
    capColor: "#f59e0b",
    capName: "Gold / Red Top",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-600 dark:text-amber-400",
    title: "SST / Plain Serum Vacutainer",
    specimenType: "Serum (Clotted Blood)",
    additive: "Clot Activator & Gel Separator",
    department: "Biochemistry & Serology (LFT, KFT, Lipids)",
  },
  FLUORIDE: {
    tubeType: "FLUORIDE",
    capColor: "#64748b",
    capName: "Grey Top",
    badgeBg: "bg-slate-500/10",
    badgeBorder: "border-slate-500/30",
    badgeText: "text-slate-600 dark:text-slate-400",
    title: "Sodium Fluoride Vacutainer",
    specimenType: "Fluoride Plasma / Blood",
    additive: "Sodium Fluoride + Pot. Oxalate",
    department: "Glucose / Sugar (FBS, PPBS, GTT)",
  },
  CITRATE: {
    tubeType: "CITRATE",
    capColor: "#0284c7",
    capName: "Light Blue Top",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-600 dark:text-sky-400",
    title: "Sodium Citrate 3.2% Vacutainer",
    specimenType: "Citrated Plasma",
    additive: "Buffered Sodium Citrate 1:9",
    department: "Coagulation Studies (PT/INR, APTT)",
  },
  URINE: {
    tubeType: "URINE",
    capColor: "#eab308",
    capName: "Yellow Container",
    badgeBg: "bg-yellow-500/10",
    badgeBorder: "border-yellow-500/30",
    badgeText: "text-yellow-600 dark:text-yellow-400",
    title: "Sterile Urine Container",
    specimenType: "Clean Catch Spot Urine",
    additive: "Sterile Preservative-Free",
    department: "Clinical Pathology (Routine & Microscopy)",
  },
  STOOL: {
    tubeType: "STOOL",
    capColor: "#92400e",
    capName: "Brown Container",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
    badgeText: "text-orange-700 dark:text-orange-400",
    title: "Stool Specimen Container",
    specimenType: "Stool Specimen",
    additive: "Sterile Container",
    department: "Parasitology & Occult Blood",
  },
};

function detectTubesForReport(report: any): string[] {
  const detected = new Set<string>();
  const p = report.patient || {};
  let meta = p.meta || {};
  if (typeof meta === "string") {
    try { meta = JSON.parse(meta); } catch {}
  }
  let vb = meta.vial_barcodes || {};
  if (typeof vb === "string") {
    try { vb = JSON.parse(vb); } catch {}
  }
  if (vb && typeof vb === "object") {
    Object.keys(vb).forEach((k) => {
      const up = k.toUpperCase();
      if (TUBE_CONFIG[up]) detected.add(up);
    });
  }

  // Scan tests
  const tests = report.results?.map((r: any) => r.test?.name?.toLowerCase() || "").filter(Boolean) || [];
  tests.forEach((tName: string) => {
    if (tName.includes("cbc") || tName.includes("esr") || tName.includes("hba1c") || tName.includes("hemoglobin") || tName.includes("blood group") || tName.includes("malar")) {
      detected.add("EDTA");
    }
    if (tName.includes("lft") || tName.includes("kft") || tName.includes("rft") || tName.includes("lipid") || tName.includes("bilirubin") || tName.includes("thyroid") || tName.includes("tsh") || tName.includes("vitamin") || tName.includes("crp") || tName.includes("calcium") || tName.includes("uric") || tName.includes("widal") || tName.includes("dengue") || tName.includes("hiv") || tName.includes("hbsag") || tName.includes("electrolyte")) {
      detected.add("SST");
    }
    if (tName.includes("sugar") || tName.includes("glucose") || tName.includes("fbs") || tName.includes("ppbs") || tName.includes("gtt")) {
      detected.add("FLUORIDE");
    }
    if (tName.includes("pt") || tName.includes("inr") || tName.includes("aptt") || tName.includes("coag") || tName.includes("dimer")) {
      detected.add("CITRATE");
    }
    if (tName.includes("urine") || tName.includes("upt") || tName.includes("microalbumin")) {
      detected.add("URINE");
    }
    if (tName.includes("stool") || tName.includes("occult")) {
      detected.add("STOOL");
    }
  });

  if (detected.size === 0) {
    detected.add("EDTA");
    detected.add("SST");
  }

  return Array.from(detected);
}

export default function TodaySamplesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"ALL" | "REGISTERED" | "COLLECTED" | "TRANSIT" | "READY" | "PAID" | "DUE">("ALL");
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // Status & Barcoding Modal State
  const [statusModalReport, setStatusModalReport] = useState<any | null>(null);
  const [modalStage, setModalStage] = useState<"REGISTERED" | "COLLECTED" | "IN_TRANSIT">("REGISTERED");
  const [activeTubeTypes, setActiveTubeTypes] = useState<string[]>([]);
  const [tubeBarcodeInputs, setTubeBarcodeInputs] = useState<Record<string, string>>({});
  const [savingStatusModal, setSavingStatusModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const isDateToday = (dateStr?: string) => {
    if (!dateStr) return false;
    let d: Date;
    if (dateStr.includes(" ") && !dateStr.includes("T")) {
      d = new Date(dateStr.replace(" ", "T"));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) {
      const todayIso = new Date().toISOString().split("T")[0];
      return dateStr.startsWith(todayIso);
    }
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isReportFromToday = (r: any) => {
    if (!r) return false;
    const p = r.patient || {};
    const meta = typeof p.meta === "object" ? p.meta : {};
    const repMeta = typeof r.meta === "object" ? r.meta : {};

    const rawDates = [
      r.created_at,
      r.createdAt,
      p.created_at,
      p.createdAt,
      meta.collected_time,
      meta.registered_at,
      repMeta.collected_time,
    ].filter(Boolean);

    if (rawDates.length === 0) return false;
    return rawDates.some((dateVal) => isDateToday(String(dateVal)));
  };

  useEffect(() => {
    try {
      const uStr = localStorage.getItem("lis_user");
      if (uStr) {
        const u = JSON.parse(uStr);
        setCurrentUserRole(u.role || "");
      }
      const cached = localStorage.getItem("lis_cached_today_samples");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const todayOnly = parsed.filter(isReportFromToday);
          if (todayOnly.length > 0) {
            setReports(todayOnly);
            setLoading(false);
          }
        }
      }
    } catch (e) {}
    loadData();
  }, []);

  const loadData = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    try {
      if (isForce || reports.length === 0) {
        setLoading(true);
      }
      const res = await fetchFromLaravel("/reports?today=true&limit=100", { skipCache: isForce }).catch(() => []);
      const repList = Array.isArray(res) ? res : (res?.data || []);
      
      // Strictly show only today's samples on the Today Samples page
      const finalReports = repList.filter(isReportFromToday);
      setReports(finalReports);
      try {
        localStorage.setItem("lis_cached_today_samples", JSON.stringify(finalReports));
      } catch {}
    } catch (err) {
      console.error("Error loading today's samples:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyBarcode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBarcode(code);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // Helper functions for statuses
  const isReportRejected = (r: any) =>
    r.status === "REJECTED" ||
    r.meta?.sample_status === "REJECTED" ||
    r.patient?.meta?.sample_status === "REJECTED";

  const isReportApproved = (r: any) =>
    !isReportRejected(r) &&
    (r.status === "APPROVED" || r.status === "FINAL" || r.status === "COMPLETED" || r.status === "READY");

  const isReportTransit = (r: any) =>
    !isReportRejected(r) &&
    !isReportApproved(r) &&
    (r.status === "IN_TRANSIT" || r.status === "PROCESSING");

  const isReportCollected = (r: any) =>
    !isReportRejected(r) &&
    !isReportApproved(r) &&
    !isReportTransit(r) &&
    (r.status === "COLLECTED" || r.meta?.sample_status === "COLLECTED" || r.patient?.meta?.sample_status === "COLLECTED");

  const isReportRegistered = (r: any) =>
    !isReportRejected(r) &&
    !isReportApproved(r) &&
    !isReportTransit(r) &&
    !isReportCollected(r);

  // Counts
  const totalCount = reports.length;
  const registeredCount = reports.filter(isReportRegistered).length;
  const collectedCount = reports.filter(isReportCollected).length;
  const transitCount = reports.filter(isReportTransit).length;
  const readyCount = reports.filter(isReportApproved).length;

  const paidCount = reports.filter((r) => {
    const isB2B = currentUserRole === "B2B";
    const b2bPrice = r.b2b_price !== undefined ? Number(r.b2b_price) : (r.b2bPrice !== undefined ? Number(r.b2bPrice) : null);
    if (isB2B && b2bPrice !== null) {
      return r.is_b2b_paid || r.isB2bPaid || (Number(r.bill?.paid_amount || 0) >= b2bPrice && b2bPrice > 0);
    }
    const total = Number(r.bill?.total || r.bill?.totalAmount || 0);
    const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount || 0);
    return total > 0 && paid >= total;
  }).length;
  const dueCount = Math.max(0, totalCount - paidCount);

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return reports.filter((r) => {
      const pName = r.patient?.name || "";
      const phone = r.patient?.phone || "";
      const id = r.custom_id || r.customId || "";
      const query = search.toLowerCase();
      const matchesSearch = pName.toLowerCase().includes(query) || phone.toLowerCase().includes(query) || id.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      const isB2B = currentUserRole === "B2B";
      const b2bPrice = r.b2b_price !== undefined ? Number(r.b2b_price) : (r.b2bPrice !== undefined ? Number(r.b2bPrice) : null);
      const isPaid = (isB2B && b2bPrice !== null)
        ? Boolean(r.is_b2b_paid || r.isB2bPaid || (Number(r.bill?.paid_amount || 0) >= b2bPrice && b2bPrice > 0))
        : Boolean(Number(r.bill?.total || 0) > 0 && Number(r.bill?.paid_amount || 0) >= Number(r.bill?.total || 0));

      if (stageFilter === "REGISTERED") return isReportRegistered(r);
      if (stageFilter === "COLLECTED") return isReportCollected(r);
      if (stageFilter === "TRANSIT") return isReportTransit(r);
      if (stageFilter === "READY") return isReportApproved(r);
      if (stageFilter === "PAID") return isPaid;
      if (stageFilter === "DUE") return !isPaid;
      return true;
    });
  }, [reports, search, stageFilter, currentUserRole]);

  // Reset to first page whenever search query or stage filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter]);

  // Safe pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredSamples.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSamples = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredSamples.slice(start, start + pageSize);
  }, [filteredSamples, safeCurrentPage, pageSize]);

  // Open the Status & Barcoding Window
  const handleOpenStatusModal = (rep: any) => {
    setStatusModalReport(rep);
    const p = rep.patient || {};
    let meta = p.meta || {};
    if (typeof meta === "string") {
      try { meta = JSON.parse(meta); } catch {}
    }
    let vb = meta.vial_barcodes || {};
    if (typeof vb === "string") {
      try { vb = JSON.parse(vb); } catch {}
    }

    const repStatus = String(rep.status || "").toUpperCase();
    const sampleStatus = String(meta?.sample_status || "").toUpperCase();
    let currentStage: "REGISTERED" | "COLLECTED" | "IN_TRANSIT" = "REGISTERED";
    if (repStatus === "IN_TRANSIT" || repStatus === "PROCESSING") {
      currentStage = "IN_TRANSIT";
    } else if (sampleStatus === "COLLECTED" || repStatus === "COLLECTED") {
      currentStage = "COLLECTED";
    } else {
      currentStage = "REGISTERED";
    }
    setModalStage(currentStage);

    const tubes = detectTubesForReport(rep);
    setActiveTubeTypes(tubes);

    const barcodeMap: Record<string, string> = {};
    tubes.forEach((t) => {
      barcodeMap[t] = String(vb[t] || vb[t.toLowerCase()] || "");
    });

    const singleVial = String(p.vial_barcode || p.vialBarcode || meta.vial_barcode || "").trim();
    if (singleVial && tubes.length > 0 && !Object.values(barcodeMap).some(Boolean)) {
      barcodeMap[tubes[0]] = singleVial.split(",")[0].trim();
    }

    setTubeBarcodeInputs(barcodeMap);
  };

  const handleAutoGenerateTubeBarcode = (tubeType: string) => {
    const p = statusModalReport?.patient || {};
    const pid = String(p.custom_id || p.customId || statusModalReport?.custom_id || "OPL").replace(/[^a-zA-Z0-9]/g, "");
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generated = `${pid}-${tubeType}-${randomNum}`;
    setTubeBarcodeInputs((prev) => ({ ...prev, [tubeType]: generated }));
  };

  const handleSaveStatusAndBarcodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalReport?.patient?.id) return;
    
    if (isReportApproved(statusModalReport)) {
      toast.error(
        "Status Update Locked",
        "This diagnostic report has already been approved and verified by the central laboratory. Status updates are locked."
      );
      return;
    }

    const patId = statusModalReport.patient.id;
    const repId = statusModalReport.id;

    try {
      setSavingStatusModal(true);
      const cleanedBarcodes: Record<string, string> = {};
      Object.entries(tubeBarcodeInputs).forEach(([k, v]) => {
        if (v && v.trim()) cleanedBarcodes[k] = v.trim();
      });
      const joinedBarcodeString = Object.values(cleanedBarcodes).join(",");

      // 1. Update Patient Demographics & Barcodes
      await fetchFromLaravel(`/patients/${patId}`, {
        method: "PUT",
        body: JSON.stringify({
          vial_barcode: joinedBarcodeString || null,
          vial_barcodes: cleanedBarcodes,
          meta: {
            vial_barcodes: cleanedBarcodes,
            vial_barcode: joinedBarcodeString || null,
            sample_status: modalStage,
            collected_at: "Collection Center Station",
            collected_time: new Date().toISOString(),
          },
        }),
      });

      // 2. Update Report Status if moving to COLLECTED or IN_TRANSIT
      if (modalStage !== "REGISTERED") {
        await fetchFromLaravel(`/reports/${repId}`, {
          method: "PUT",
          body: JSON.stringify({
            status: modalStage,
          }),
        }).catch(() => {});
      }

      toast.success(
        "Status & Barcodes Synchronized",
        `Sample stage set to ${modalStage} with ${Object.keys(cleanedBarcodes).length} container barcode(s) attached.`
      );

      // Refresh list
      await loadData(true);
      setStatusModalReport(null);
    } catch (err: any) {
      toast.error("Failed to update status", err.message || "An error occurred");
    } finally {
      setSavingStatusModal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ── Header Deck ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Collection Center Intake
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Today's Intake: {totalCount} Samples
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Sample Intake &amp; Phlebotomy Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receive receptionist-registered patients, tag color vacutainer barcodes, and update sample collection stage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-xs hover:bg-muted/60 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>

          {currentUserRole !== "COLLECTION_CENTER" && (
            <Link
              href="/dashboard/patients/register"
              className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 ring-inset-top cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Sample Entry</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Filter Pills & Search Row ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          <button
            type="button"
            onClick={() => setStageFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("REGISTERED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "REGISTERED"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Registered ({registeredCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("COLLECTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "COLLECTED"
                ? "bg-sky-500 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Collected ({collectedCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("TRANSIT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "TRANSIT"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Central Hub ({transitCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("READY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "READY"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Approved ({readyCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("PAID")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "PAID"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Paid ({paidCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("DUE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "DUE"
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Due ({dueCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, barcode, phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:border-primary outline-none shadow-xs"
          />
        </div>
      </div>

      {/* ── Samples Table ── */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
        <div className="table-responsive-container">
          <table className="w-full min-w-[780px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-5">Vial Barcode / ID</th>
                <th className="py-3.5 px-4">Patient Demographics</th>
                <th className="py-3.5 px-4">Tests Booked</th>
                <th className="py-3.5 px-4">Collection Time</th>
                <th className="py-3.5 px-4">Processing Stage</th>
                <th className="py-3.5 px-4">Payment Clearance</th>
                <th className="py-3.5 px-5 text-right">Status &amp; Barcodes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs font-medium">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    <td className="py-4 px-5">
                      <div className="h-4 w-28 rounded shimmer-gradient mb-1.5" />
                      <div className="h-3 w-16 rounded shimmer-gradient" />
                    </td>
                    <td className="py-4 px-4 space-y-1">
                      <div className="h-4 w-32 rounded shimmer-gradient" />
                      <div className="h-3 w-20 rounded shimmer-gradient" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-40 rounded shimmer-gradient" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 rounded shimmer-gradient" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 w-24 rounded-full shimmer-gradient" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 w-16 rounded-full shimmer-gradient" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-7 w-28 rounded-xl shimmer-gradient ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <FlaskConical className="h-9 w-9 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground text-sm">No samples found</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                      {search ? `No samples matching "${search}"` : "No intake samples available."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSamples.map((item: any, idx: number) => {
                  const sampleBarcode = item.custom_id || item.customId || `OP-${item.id.slice(0, 8)}`;
                  const p = item.patient || {};
                  const testsStr = item.tests || (Array.isArray(item.results) ? item.results.map((r: any) => r.test?.name).filter(Boolean).join(", ") : "Diagnostic Test Panel");
                  const isRejected = isReportRejected(item);
                  const isApproved = isReportApproved(item);
                  const isTransit = isReportTransit(item);
                  const isCollected = isReportCollected(item);

                  const isB2BUser = currentUserRole === "B2B";
                  const rawB2bPrice = item.b2b_price !== undefined ? Number(item.b2b_price) : (item.b2bPrice !== undefined ? Number(item.b2bPrice) : null);
                  const billTotal = Number(item.bill?.total || item.bill?.totalAmount || 0);
                  const billPaid = Number(item.bill?.paid_amount || item.bill?.paidAmount || 0);
                  const billDue = Math.max(0, billTotal - billPaid);
                  const isPaid = billDue <= 0 && billTotal > 0;
                  const isB2bCleared = Boolean(item.is_b2b_paid || item.isB2bPaid || isPaid);
                  const displayB2bAmount = rawB2bPrice !== null ? rawB2bPrice : billTotal;

                  const colTime = item.created_at || item.createdAt
                    ? new Date(item.created_at || item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "Just now";

                  return (
                    <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                      {/* Barcode & ID */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-muted/60 px-2.5 py-1 rounded-lg border border-border text-foreground">
                            {sampleBarcode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyBarcode(sampleBarcode)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copy Barcode"
                          >
                            {copiedBarcode === sampleBarcode ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-4 px-4">
                        <p className="font-bold text-foreground">{p.name || "Patient"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.age ? `${p.age}y` : ""} {p.gender ? `· ${p.gender}` : ""} {p.phone ? `· ${p.phone}` : ""}
                        </p>
                      </td>

                      {/* Tests */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-medium text-foreground truncate">{testsStr || "General Panel"}</p>
                        <span className="text-[10px] text-muted-foreground">Standard Investigation</span>
                      </td>

                      {/* Collection Time */}
                      <td suppressHydrationWarning className="py-4 px-4 text-muted-foreground text-[11px]">
                        {colTime}
                      </td>

                      {/* Sample Stage Badge (Dynamic: Default Registered -> Collected -> Central Lab -> Approved) */}
                      <td className="py-4 px-4">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertCircle className="h-3 w-3" /> Sample Rejected
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                        ) : isTransit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Clock className="h-3 w-3" /> Central Hub
                          </span>
                        ) : isCollected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <FlaskConical className="h-3 w-3" /> Collected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" /> Registered
                          </span>
                        )}
                      </td>

                      {/* Payment Clearance / Status Badge */}
                      <td className="py-4 px-4">
                        {isB2BUser ? (
                          isB2bCleared ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="B2B Assigned Rate Cleared">
                              ₹{displayB2bAmount.toFixed(0)} Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" title="Assigned B2B Rate">
                              ₹{displayB2bAmount.toFixed(0)} B2B Rate
                            </span>
                          )
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            ₹{billTotal} PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" title="Report Locked for PayU">
                            ₹{billDue} DUE 🔒
                          </span>
                        )}
                      </td>

                      {/* Status & Barcode Action Button (Replaced old Actions Column) */}
                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(item)}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer group"
                          title="Open Specimen Status & Tube Barcode Window"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
                          <span>Status / Barcodes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Deck ── */}
        {!loading && filteredSamples.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/80 bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-lg bg-card border border-border text-foreground font-semibold outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page · Total {filteredSamples.length} samples</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-medium">
                Page <strong className="text-foreground">{safeCurrentPage}</strong> of <strong className="text-foreground">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-8 px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && safeCurrentPage > 3) {
                      pageNum = safeCurrentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                          safeCurrentPage === pageNum
                            ? "gradient-primary text-primary-foreground shadow-xs ring-1 ring-primary/30"
                            : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── State of the Art Status & Specimen Barcoding Window (Best UI/UX) ── */}
      <Dialog open={!!statusModalReport} onOpenChange={() => setStatusModalReport(null)}>
        <DialogContent className="max-w-3xl w-full rounded-2xl bg-card border border-border/80 shadow-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Specimen Status &amp; Tube Barcoding</DialogTitle>
          
          {statusModalReport && (() => {
            const isModalApproved = Boolean(isReportApproved(statusModalReport));

            return (
            <form onSubmit={handleSaveStatusAndBarcodes} className="flex flex-col max-h-[85vh]">
              {/* Modal Header (Clean single close button) */}
              <div className="px-6 py-4 border-b border-border/80 bg-muted/20 flex items-center justify-between pr-14">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Specimen Status &amp; Tube Barcoding
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tag physical color vacutainer barcodes and advance specimen processing stage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {/* 1. Patient Summary Card */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {statusModalReport.patient?.name || "Patient"}
                      </span>
                      <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded border border-border text-foreground">
                        {statusModalReport.patient?.custom_id || statusModalReport.patient?.customId || "PID-—"}
                      </span>
                      {statusModalReport.patient?.gender && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {statusModalReport.patient?.age ? `${statusModalReport.patient.age}y` : ""} · {statusModalReport.patient.gender}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ref Doctor: <strong className="text-foreground">{statusModalReport.patient?.ref_doctor || "Self"}</strong> · Sample ID: <span className="font-mono">{statusModalReport.custom_id || statusModalReport.customId}</span>
                    </p>
                  </div>

                  <div className="text-right sm:self-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                      Investigation Panel
                    </span>
                    <span className="text-xs font-semibold text-foreground max-w-xs truncate block">
                      {statusModalReport.results?.map((r: any) => r.test?.name).filter(Boolean).join(", ") || statusModalReport.package_name || "Diagnostic Panel"}
                    </span>
                  </div>
                </div>

                {/* Report Approved Lockdown Banner */}
                {isModalApproved && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-start gap-3 shadow-xs animate-fade-in">
                    <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1 text-xs">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>Report Approved & Finalized — Status Update Locked</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-extrabold uppercase">
                          {statusModalReport.status || "APPROVED"}
                        </span>
                      </h4>
                      <p className="leading-relaxed text-muted-foreground">
                        This patient&apos;s diagnostic investigation report has already been reviewed, approved, and authorized by the central laboratory. Further specimen stage modifications are locked.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Processing Stage Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span>Specimen Collection Stage</span>
                        {isModalApproved && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                            Locked
                          </span>
                        )}
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        {isModalApproved 
                          ? "Status is finalized and locked by Central Lab administration." 
                          : "By default registered by front-desk receptionist. Advance to Collected once phlebotomy is finished."}
                      </p>
                    </div>

                    {/* Quick Button to Mark Collected (only if not approved) */}
                    {!isModalApproved && modalStage !== "COLLECTED" && (
                      <button
                        type="button"
                        onClick={() => setModalStage("COLLECTED")}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Quick Mark as Collected</span>
                      </button>
                    )}
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${isModalApproved ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}>
                    {/* Stage 1: REGISTERED */}
                    <div
                      onClick={() => setModalStage("REGISTERED")}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        modalStage === "REGISTERED"
                          ? "bg-amber-500/10 border-amber-500 shadow-xs"
                          : "bg-card border-border/80 hover:bg-muted/40 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">1. Registered</span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          modalStage === "REGISTERED" ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
                        }`}>
                          {modalStage === "REGISTERED" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Default reception registration; awaiting tube draw.
                      </p>
                    </div>

                    {/* Stage 2: COLLECTED */}
                    <div
                      onClick={() => setModalStage("COLLECTED")}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        modalStage === "COLLECTED"
                          ? "bg-sky-500/10 border-sky-500 shadow-xs"
                          : "bg-card border-border/80 hover:bg-muted/40 hover:border-sky-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-400">2. Collected</span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          modalStage === "COLLECTED" ? "border-sky-500 bg-sky-500" : "border-muted-foreground"
                        }`}>
                          {modalStage === "COLLECTED" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Phlebotomy drawn &amp; labeled with barcode.
                      </p>
                    </div>

                    {/* Stage 3: IN_TRANSIT */}
                    <div
                      onClick={() => setModalStage("IN_TRANSIT")}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        modalStage === "IN_TRANSIT"
                          ? "bg-blue-500/10 border-blue-500 shadow-xs"
                          : "bg-card border-border/80 hover:bg-muted/40 hover:border-blue-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">3. Central Testing</span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          modalStage === "IN_TRANSIT" ? "border-blue-500 bg-blue-500" : "border-muted-foreground"
                        }`}>
                          {modalStage === "IN_TRANSIT" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Dispatched to central testing laboratory.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Color-Coded Vacutainers & Barcode Inputs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Color-Coded Specimen Vacutainers &amp; Barcodes
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        Scan physical tube stickers or type barcodes for each diagnostic container.
                      </p>
                    </div>

                    {/* Add extra tube button */}
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !activeTubeTypes.includes(val)) {
                            setActiveTubeTypes((prev) => [...prev, val]);
                          }
                          e.target.value = "";
                        }}
                        className="text-xs font-bold bg-muted/60 border border-border rounded-xl px-2.5 py-1 text-foreground outline-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>+ Add Tube Type</option>
                        {Object.keys(TUBE_CONFIG).map((k) => (
                          <option key={k} value={k} disabled={activeTubeTypes.includes(k)}>
                            {TUBE_CONFIG[k].title} ({TUBE_CONFIG[k].capName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeTubeTypes.map((tubeKey) => {
                      const tube = TUBE_CONFIG[tubeKey] || {
                        tubeType: tubeKey,
                        capColor: "#6366f1",
                        capName: `${tubeKey} Tube`,
                        badgeBg: "bg-indigo-500/10",
                        badgeBorder: "border-indigo-500/30",
                        badgeText: "text-indigo-600 dark:text-indigo-400",
                        title: `${tubeKey} Vacutainer`,
                        specimenType: "Lab Specimen",
                        additive: "Standard Container",
                        department: "Diagnostic Testing",
                      };

                      const currentBarcodeVal = tubeBarcodeInputs[tubeKey] || "";

                      return (
                        <div
                          key={tubeKey}
                          className="bg-card border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs hover:border-primary/30 transition-all"
                        >
                          {/* Tube Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white dark:ring-zinc-900"
                                style={{ backgroundColor: tube.capColor }}
                              />
                              <div>
                                <h4 className="font-bold text-xs text-foreground leading-tight">
                                  {tube.title}
                                </h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {tube.capName} · {tube.specimenType}
                                </span>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${tube.badgeBg} ${tube.badgeBorder} ${tube.badgeText}`}>
                              {tube.tubeType}
                            </span>
                          </div>

                          {/* Tube Specs info */}
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-[10px] text-muted-foreground flex items-center justify-between gap-2">
                            <span className="truncate">Additive: <strong className="text-foreground/80">{tube.additive}</strong></span>
                            <span className="truncate max-w-[140px] text-right font-medium">{tube.department}</span>
                          </div>

                          {/* Barcode Input & Auto Generate */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-foreground">
                                Tube Barcode Number
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAutoGenerateTubeBarcode(tubeKey)}
                                className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="h-2.5 w-2.5" /> Auto Fill
                              </button>
                            </div>

                            <div className="relative">
                              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="text"
                                value={currentBarcodeVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTubeBarcodeInputs((prev) => ({ ...prev, [tubeKey]: val }));
                                }}
                                placeholder="Scan with barcode gun or type..."
                                className="pl-9 pr-8 h-9 text-xs font-mono font-bold"
                              />
                              {currentBarcodeVal && (
                                <button
                                  type="button"
                                  onClick={() => setTubeBarcodeInputs((prev) => ({ ...prev, [tubeKey]: "" }))}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Live SVG Barcode Preview */}
                          {currentBarcodeVal ? (
                            <div className="p-2 bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center">
                              <BarcodeSVG value={currentBarcodeVal} width={1.05} height={24} fontSize={8} />
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl border border-dashed border-border/80 text-center text-[10px] text-muted-foreground">
                              Awaiting barcode scan for {tube.tubeType}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="px-6 py-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Real-time LIS analyzer and tracking synchronization</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusModalReport(null)}
                    className="text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingStatusModal || isModalApproved}
                    className={`font-bold text-xs gap-1.5 shadow-md ring-inset-top ${
                      isModalApproved
                        ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                        : "gradient-primary text-primary-foreground cursor-pointer"
                    }`}
                  >
                    {savingStatusModal ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isModalApproved ? (
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>{isModalApproved ? "Status Locked (Report Approved)" : "Save Barcodes & Update Status"}</span>
                  </Button>
                </div>
              </div>
            </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
