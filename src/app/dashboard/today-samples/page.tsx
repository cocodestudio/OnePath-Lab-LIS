"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock, FlaskConical, Search, PlusCircle, RefreshCw, CheckCircle2,
  Copy, Check, FileText, ArrowRight, ShieldCheck, IndianRupee,
  Filter, AlertCircle, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, User,
  Barcode, Edit2, Lock, Printer, Receipt, X, Loader2, SlidersHorizontal, Sparkles, CheckCheck, Plus,
  TestTube2, Send, Tag, Building2, Trash2, Activity
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { getTodayStr, getRecordLocalDate } from "@/lib/date-utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

  const isDateToday = (dateStr?: string | number | null) => {
    if (!dateStr) return false;
    try {
      const today = getTodayStr();
      const str = String(dateStr).trim();
      if (str.startsWith(today)) return true;
      const recDate = getRecordLocalDate(str);
      return recDate === today;
    } catch {
      return false;
    }
  };

  const isReportFromToday = (r: any) => {
    if (!r) return false;
    const p = r?.patient || {};
    const meta = (p && typeof p.meta === "object" && p.meta !== null) ? p.meta : {};
    const repMeta = (r && typeof r.meta === "object" && r.meta !== null) ? r.meta : {};

    const rawDates = [
      r?.createdAt,
      r?.created_at,
      p?.createdAt,
      p?.created_at,
      meta?.collectedTime,
      meta?.collected_time,
      meta?.registeredAt,
      meta?.registered_at,
      repMeta?.collectedTime,
      repMeta?.collected_time,
    ].filter(Boolean);

    if (rawDates.length === 0) return true;
    return rawDates.some((dateVal) => isDateToday(String(dateVal)));
  };

  const isReportPermittedForRole = (r: any, role: string, user: any) => {
    if (!r) return false;
    const normalizedRole = String(role || user?.role || "").toUpperCase();
    if (!user) return true;

    // For ADMIN / SUPER_ADMIN / OWNER / STAFF: everything is permitted
    if (["ADMIN", "SUPER_ADMIN", "OWNER", "STAFF"].includes(normalizedRole)) return true;

    const p = r?.patient || {};
    const meta = (p && typeof p.meta === "object" && p.meta !== null) ? p.meta : {};
    const repMeta = (r && typeof r.meta === "object" && r.meta !== null) ? r.meta : {};
    const userIdStr = String(user?.id || user?.user_id || "");

    const creatorRole = String(
      repMeta?.created_by_role ||
      repMeta?.createdByRole ||
      meta?.created_by_role ||
      meta?.createdByRole ||
      r?.creator?.role ||
      p?.creator?.role ||
      ""
    ).toUpperCase();

    const isReceptionistEntry = Boolean(
      creatorRole === "RECEPTIONIST" ||
      String(r?.creator?.role || "").toUpperCase() === "RECEPTIONIST" ||
      String(p?.creator?.role || "").toUpperCase() === "RECEPTIONIST"
    );

    const isCCEntry = Boolean(
      creatorRole === "COLLECTION_CENTER" ||
      creatorRole === "COLLECTION_CENTRE" ||
      String(r?.creator?.role || "").toUpperCase() === "COLLECTION_CENTER" ||
      String(r?.creator?.role || "").toUpperCase() === "COLLECTION_CENTRE" ||
      String(p?.creator?.role || "").toUpperCase() === "COLLECTION_CENTER" ||
      String(p?.creator?.role || "").toUpperCase() === "COLLECTION_CENTRE" ||
      meta?.collection_center_id ||
      meta?.collectionCenterId ||
      repMeta?.collection_center_id ||
      repMeta?.collectionCenterId
    );

    const isB2BEntry = Boolean(
      !isReceptionistEntry &&
      !isCCEntry &&
      (
        creatorRole === "B2B" ||
        String(r?.creator?.role || "").toUpperCase() === "B2B" ||
        String(p?.creator?.role || "").toUpperCase() === "B2B" ||
        meta?.b2b_user_id ||
        meta?.b2bUserId ||
        repMeta?.b2b_user_id ||
        repMeta?.b2bUserId
      )
    );

    // 1. B2B role: Must ONLY see their own B2B samples (strictly isolated)
    if (normalizedRole === "B2B") {
      if (isCCEntry || isReceptionistEntry) return false;
      const b2bId = String(meta?.b2b_user_id || meta?.b2bUserId || repMeta?.b2b_user_id || repMeta?.b2bUserId || "");
      const createdBy = String(r?.createdById || r?.created_by_id || p?.createdById || p?.created_by_id || repMeta?.created_by_id || repMeta?.createdById || meta?.created_by_id || meta?.createdById || "");
      return Boolean(userIdStr && (b2bId === userIdStr || createdBy === userIdStr));
    }

    // 2. RECEPTIONIST role: Can see regular lab entries & CC entries, but NEVER B2B
    if (normalizedRole === "RECEPTIONIST") {
      if (isB2BEntry) return false;
      return true;
    }

    // 3. COLLECTION CENTER role: Can see own CC entries + Receptionist entries, but NEVER B2B
    if (normalizedRole === "COLLECTION_CENTER" || normalizedRole === "COLLECTION_CENTRE") {
      if (isB2BEntry) return false;
      if (isReceptionistEntry) return true;

      // Check if belongs to this CC
      const reportCreatedById = String(r?.createdById || r?.created_by_id || repMeta?.createdById || repMeta?.created_by_id || "");
      const patientCreatedById = String(p?.createdById || p?.created_by_id || meta?.createdById || meta?.created_by_id || "");
      if (userIdStr && (reportCreatedById === userIdStr || patientCreatedById === userIdStr)) return true;

      const reportCcId = String(repMeta?.collectionCenterId || repMeta?.collection_center_id || "");
      const patientCcId = String(meta?.collectionCenterId || meta?.collection_center_id || "");
      if (userIdStr && (reportCcId === userIdStr || patientCcId === userIdStr)) return true;

      const centerCode = (user?.center_code || user?.centerCode || "").toLowerCase().trim();
      const repCenterCode = String(repMeta?.centerCode || repMeta?.center_code || "").toLowerCase().trim();
      const patCenterCode = String(meta?.centerCode || meta?.center_code || "").toLowerCase().trim();
      const collectedAt = String(p?.collectedAt || p?.collected_at || meta?.collectedAt || meta?.collected_at || "").toLowerCase();

      if (centerCode && (centerCode === repCenterCode || centerCode === patCenterCode || collectedAt.includes(centerCode))) return true;

      const userName = (user?.name || "").toLowerCase().trim();
      const centerLabName = (user?.lab_name || user?.labName || "").toLowerCase().trim();
      if (userName && collectedAt.includes(userName)) return true;
      if (centerLabName && !["onepath laboratory", "onepath lab", "main lab", "my laboratory"].includes(centerLabName) && collectedAt.includes(centerLabName)) return true;

      return false;
    }

    return true;
  };

  useEffect(() => {
    let parsedUser: any = null;
    try {
      const uStr = localStorage.getItem("lis_user");
      if (uStr) {
        parsedUser = JSON.parse(uStr);
        setCurrentUserRole(parsedUser.role || "");
      }
      const cached = localStorage.getItem("lis_cached_today_samples");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const todayOnly = parsed
            .filter(isReportFromToday)
            .filter((r) => isReportPermittedForRole(r, parsedUser?.role || "", parsedUser));
          todayOnly.sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
            const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
            return timeB - timeA;
          });
          if (todayOnly.length > 0) {
            setReports(todayOnly);
            setLoading(false);
          }
        }
      }
    } catch (e) {}

    loadData(true, parsedUser);

    const handleCacheInvalidated = () => {
      loadData(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData(true);
      }
    };
    window.addEventListener("lis_cache_invalidated", handleCacheInvalidated);
    window.addEventListener("storage", handleCacheInvalidated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("lis_cache_invalidated", handleCacheInvalidated);
      window.removeEventListener("storage", handleCacheInvalidated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadData = async (forceRefresh?: boolean | any, userOverride?: any) => {
    const isForce = forceRefresh === true;
    try {
      if (isForce || reports.length === 0) {
        setLoading(true);
      }
      let activeUser = userOverride;
      if (!activeUser && typeof window !== "undefined") {
        try {
          const uStr = localStorage.getItem("lis_user");
          if (uStr) activeUser = JSON.parse(uStr);
        } catch {}
      }

      const res = await fetchFromLaravel("/reports?today=true&limit=100", { skipCache: isForce }).catch(() => []);
      const repList = Array.isArray(res) ? res : (res?.data || []);
      
      // Strictly show only today's samples on the Today Samples page and filter out admin portal entries for Collection Center
      const finalReports = repList
        .filter(isReportFromToday)
        .filter((r: any) => isReportPermittedForRole(r, activeUser?.role || currentUserRole, activeUser));
      finalReports.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeB - timeA;
      });
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

  const handleAutoFillAllBarcodes = () => {
    const p = statusModalReport?.patient || {};
    const pid = String(p.custom_id || p.customId || statusModalReport?.custom_id || "OPL").replace(/[^a-zA-Z0-9]/g, "");
    const updated = { ...tubeBarcodeInputs };
    activeTubeTypes.forEach((tubeKey) => {
      if (!updated[tubeKey] || !updated[tubeKey].trim()) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        updated[tubeKey] = `${pid}-${tubeKey}-${randomNum}`;
      }
    });
    setTubeBarcodeInputs(updated);
    toast.success("Barcodes Generated", "Auto-generated barcodes for all active vacutainer tubes.");
  };

  const handleRemoveTubeType = (tubeKey: string) => {
    setActiveTubeTypes((prev) => prev.filter((t) => t !== tubeKey));
    setTubeBarcodeInputs((prev) => {
      const next = { ...prev };
      delete next[tubeKey];
      return next;
    });
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

          <Link
            href="/dashboard/patients/register"
            className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 ring-inset-top cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Sample Entry</span>
          </Link>
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

      {/* ── State of the Art Status & Specimen Barcoding Window (Horizontal Full-Width Premium UI/UX) ── */}
      <Dialog open={!!statusModalReport} onOpenChange={() => setStatusModalReport(null)}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-3xl bg-card border border-border/90 shadow-2xl animate-scale-in">
          <DialogTitle className="sr-only">Specimen Status &amp; Tube Barcoding Station</DialogTitle>

          {statusModalReport && (() => {
            const isModalApproved = Boolean(isReportApproved(statusModalReport));

            return (
              <form onSubmit={handleSaveStatusAndBarcodes} className="flex flex-col h-full max-h-[92vh] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-border/80 bg-card flex items-center justify-between pr-14 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-foreground">
                          Specimen Status &amp; Vacutainer Barcoding Station
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          LIS Triage
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tag physical color vacutainers, scan vial barcodes, and advance specimen processing stage.
                      </p>
                    </div>
                  </div>

                  {/* Header quick patient pill */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/70 text-xs">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-foreground">{statusModalReport.patient?.name || "Patient"}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-mono text-muted-foreground text-[11px] font-bold">
                      {statusModalReport.patient?.custom_id || statusModalReport.patient?.customId || "PID"}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-mono text-primary text-[11px] font-bold">
                      {statusModalReport.custom_id || statusModalReport.customId}
                    </span>
                  </div>
                </div>

                {/* Modal Scrollable Body - Horizontal 2-Column Split */}
                <div className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ── Left Column (5 Cols): Patient Profile & Specimen Stage Controls ── */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Patient & Clinical Profile Card */}
                      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{statusModalReport.patient?.name || "Patient"}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                PID: {statusModalReport.patient?.custom_id || statusModalReport.patient?.customId || "PID-—"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            #{statusModalReport.custom_id || statusModalReport.customId}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Age &amp; Gender</span>
                            <span className="font-bold text-foreground mt-0.5 block">
                              {statusModalReport.patient?.age ? `${statusModalReport.patient.age} Y` : "N/A"} · {statusModalReport.patient?.gender || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Phone</span>
                            <span className="font-mono font-bold text-foreground mt-0.5 block">
                              {statusModalReport.patient?.phone || "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 text-xs">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ref Doctor</span>
                          <span className="font-bold text-foreground mt-0.5 block">
                            {statusModalReport.patient?.ref_doctor || statusModalReport.patient?.refDoctor || "Self"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-border/60 space-y-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Assigned Investigations
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                            {(statusModalReport.results || []).map((r: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-muted/80 border border-border/70 text-[10px] font-medium text-foreground truncate max-w-[200px]"
                              >
                                {r.test?.name || "Test"}
                              </span>
                            ))}
                            {statusModalReport.package_name && (
                              <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-[10px] font-bold text-primary">
                                Package: {statusModalReport.package_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Report Approved Lockdown Banner */}
                      {isModalApproved && (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1.5 shadow-xs animate-fade-in">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <h4 className="font-bold text-xs text-foreground">
                              Report Finalized &amp; Authorized
                            </h4>
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-mono font-extrabold uppercase">
                              {statusModalReport.status || "APPROVED"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            This report has already been verified and signed off by the central pathologist. Further specimen stage changes are locked.
                          </p>
                        </div>
                      )}

                      {/* Specimen Lifecycle Stage Controller */}
                      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-primary" />
                              <span>Specimen Collection Stage</span>
                            </h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Advance collection stage as samples move through triage.
                            </p>
                          </div>
                          {isModalApproved && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                              Locked
                            </span>
                          )}
                        </div>

                        {/* Premium Stage Dropdown (Radix Select) */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 flex items-center justify-between">
                            <span>Stage Selector</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              modalStage === "COLLECTED"
                                ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
                                : modalStage === "IN_TRANSIT"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }`}>
                              {modalStage}
                            </span>
                          </label>

                          <Select
                            value={modalStage}
                            onValueChange={(val: any) => !isModalApproved && setModalStage(val)}
                            disabled={isModalApproved}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-background border-border text-xs font-semibold shadow-2xs hover:border-primary/50 transition-colors cursor-pointer">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-w-md">
                              <SelectItem value="REGISTERED" className="text-xs py-2.5 cursor-pointer">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                  <div>
                                    <p className="font-bold text-foreground">1. Registered (Reception Intake)</p>
                                    <p className="text-[10px] text-muted-foreground">Default intake logged; phlebotomy tube draw pending</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="COLLECTED" className="text-xs py-2.5 cursor-pointer">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                                  <div>
                                    <p className="font-bold text-foreground">2. Collected (Phlebotomy Complete)</p>
                                    <p className="text-[10px] text-muted-foreground">Sample drawn &amp; tagged with container barcodes</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="IN_TRANSIT" className="text-xs py-2.5 cursor-pointer">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                  <div>
                                    <p className="font-bold text-foreground">3. Central Hub / In Transit</p>
                                    <p className="text-[10px] text-muted-foreground">Dispatched in cooler box to Central Pathology Lab</p>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Visual Step Progress Cards */}
                        <div className={`grid grid-cols-3 gap-2 ${isModalApproved ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}>
                          {/* Step 1: Registered */}
                          <div
                            onClick={() => setModalStage("REGISTERED")}
                            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between gap-1 text-center ${
                              modalStage === "REGISTERED"
                                ? "bg-amber-500/15 border-amber-500 shadow-2xs ring-1 ring-amber-500/40"
                                : "bg-muted/30 border-border/70 hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <span className={`w-2 h-2 rounded-full ${modalStage === "REGISTERED" ? "bg-amber-500" : "bg-muted-foreground"}`} />
                            </div>
                            <p className="text-[11px] font-bold text-foreground">1. Registered</p>
                            <span className="text-[9px] text-muted-foreground">Intake</span>
                          </div>

                          {/* Step 2: Collected */}
                          <div
                            onClick={() => setModalStage("COLLECTED")}
                            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between gap-1 text-center ${
                              modalStage === "COLLECTED"
                                ? "bg-sky-500/15 border-sky-500 shadow-2xs ring-1 ring-sky-500/40"
                                : "bg-muted/30 border-border/70 hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <span className={`w-2 h-2 rounded-full ${modalStage === "COLLECTED" ? "bg-sky-500" : "bg-muted-foreground"}`} />
                            </div>
                            <p className="text-[11px] font-bold text-foreground">2. Collected</p>
                            <span className="text-[9px] text-muted-foreground">Phlebotomy</span>
                          </div>

                          {/* Step 3: In Transit */}
                          <div
                            onClick={() => setModalStage("IN_TRANSIT")}
                            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between gap-1 text-center ${
                              modalStage === "IN_TRANSIT"
                                ? "bg-blue-500/15 border-blue-500 shadow-2xs ring-1 ring-blue-500/40"
                                : "bg-muted/30 border-border/70 hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <span className={`w-2 h-2 rounded-full ${modalStage === "IN_TRANSIT" ? "bg-blue-500" : "bg-muted-foreground"}`} />
                            </div>
                            <p className="text-[11px] font-bold text-foreground">3. Central Hub</p>
                            <span className="text-[9px] text-muted-foreground">Testing</span>
                          </div>
                        </div>

                        {/* Quick 1-Click Action Buttons */}
                        {!isModalApproved && (
                          <div className="flex items-center gap-2 pt-1">
                            {modalStage !== "COLLECTED" && (
                              <button
                                type="button"
                                onClick={() => setModalStage("COLLECTED")}
                                className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>Mark Collected</span>
                              </button>
                            )}
                            {modalStage !== "IN_TRANSIT" && (
                              <button
                                type="button"
                                onClick={() => setModalStage("IN_TRANSIT")}
                                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Dispatch to Hub</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Right Column (7 Cols): Vacutainers & Multi-Vial Barcode Management ── */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Vacutainers Header & Controls */}
                      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                            <TestTube2 className="h-4 w-4 text-primary" />
                            <span>Specimen Vacutainers &amp; Barcodes ({activeTubeTypes.length})</span>
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Color vacutainers triage. Scan vial barcodes or auto-generate.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Add Vacutainer Select Dropdown */}
                          <Select
                            value=""
                            onValueChange={(val) => {
                              if (val && !activeTubeTypes.includes(val)) {
                                setActiveTubeTypes((prev) => [...prev, val]);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground shadow-2xs hover:border-primary/50 cursor-pointer">
                              <div className="flex items-center gap-1.5">
                                <Plus className="h-3.5 w-3.5 text-primary" />
                                <span>Add Tube</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {Object.keys(TUBE_CONFIG).map((k) => {
                                const t = TUBE_CONFIG[k];
                                const isAdded = activeTubeTypes.includes(k);
                                return (
                                  <SelectItem key={k} value={k} disabled={isAdded} className="text-xs py-2 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-white/50"
                                        style={{ backgroundColor: t.capColor }}
                                      />
                                      <span className="font-bold">{t.title}</span>
                                      <span className="text-[10px] text-muted-foreground">({t.capName})</span>
                                      {isAdded && (
                                        <span className="text-[10px] font-semibold text-muted-foreground ml-auto">Added</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {/* Auto Fill All Barcodes Button */}
                          <button
                            type="button"
                            onClick={handleAutoFillAllBarcodes}
                            className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Auto-fill barcodes for all empty vacutainer tubes"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Auto Fill All</span>
                          </button>
                        </div>
                      </div>

                      {/* 2-Column Grid of Vacutainer Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                              className="bg-card border border-border/80 rounded-2xl p-4 space-y-3 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
                            >
                              {/* Tube Card Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/80 dark:ring-zinc-800"
                                    style={{
                                      backgroundColor: tube.capColor,
                                      boxShadow: `0 2px 4px ${tube.capColor}40`,
                                    }}
                                  />
                                  <div>
                                    <h5 className="font-bold text-xs text-foreground leading-tight">
                                      {tube.title}
                                    </h5>
                                    <span className="text-[10px] text-muted-foreground">
                                      {tube.capName} · {tube.specimenType}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${tube.badgeBg} ${tube.badgeBorder} ${tube.badgeText}`}>
                                    {tube.tubeType}
                                  </span>
                                  {activeTubeTypes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTubeType(tubeKey)}
                                      className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                                      title="Remove tube"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Specs Pill */}
                              <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-[10px] text-muted-foreground flex items-center justify-between gap-2">
                                <span className="truncate">Additive: <strong className="text-foreground/80">{tube.additive}</strong></span>
                                <span className="truncate max-w-[120px] text-right font-medium">{tube.department}</span>
                              </div>

                              {/* Barcode Input & Auto Generate */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-foreground">
                                    Barcode Number
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
                                    className="pl-9 pr-8 h-9 text-xs font-mono font-bold bg-background"
                                  />
                                  {currentBarcodeVal && (
                                    <button
                                      type="button"
                                      onClick={() => setTubeBarcodeInputs((prev) => ({ ...prev, [tubeKey]: "" }))}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Live SVG Barcode Preview */}
                              {currentBarcodeVal ? (
                                <div className="p-2.5 bg-white rounded-xl border border-zinc-200 shadow-2xs flex flex-col items-center justify-center">
                                  <BarcodeSVG value={currentBarcodeVal} width={1.05} height={24} fontSize={8} />
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl border border-dashed border-border/80 text-center text-[10px] text-muted-foreground">
                                  Awaiting tube scan for {tube.tubeType}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="px-6 py-4 border-t border-border/80 bg-muted/30 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border shadow-2xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        modalStage === "COLLECTED" ? "bg-sky-500 animate-pulse" : modalStage === "IN_TRANSIT" ? "bg-blue-500 animate-pulse" : "bg-amber-500 animate-pulse"
                      }`} />
                      <span className="text-muted-foreground font-semibold">Active Stage:</span>
                      <span className="font-bold text-foreground">
                        {modalStage === "COLLECTED" ? "Sample Collected" : modalStage === "IN_TRANSIT" ? "Central Hub Transit" : "Registered"}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{Object.values(tubeBarcodeInputs).filter(Boolean).length} / {activeTubeTypes.length} tubes barcoded</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStatusModalReport(null)}
                      className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingStatusModal || isModalApproved}
                      className={`h-10 px-6 rounded-xl font-bold text-xs gap-2 shadow-md ring-inset-top ${
                        isModalApproved
                          ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                          : "gradient-primary text-primary-foreground cursor-pointer hover:-translate-y-px active:scale-95 transition-all"
                      }`}
                    >
                      {savingStatusModal ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isModalApproved ? (
                        <Lock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <span>{isModalApproved ? "Status Locked (Report Approved)" : "Save Barcodes & Update Stage"}</span>
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
