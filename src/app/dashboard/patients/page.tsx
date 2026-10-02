"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, UserPlus, User, Eye, Edit2, Ban, AlertOctagon, Loader2, AlertCircle, Users, X,
  MapPin, Phone, Stethoscope, Building, UserCheck, CheckCircle2, RefreshCw,
  ChevronLeft, ChevronRight, Calendar, Tag, Lock, Barcode, Copy, Check, TestTube2,
  ShieldCheck, Mail, Activity, Scale, Ruler, Printer, Sparkles, Layers
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getStoredToken, getAuthBaseUrl, updateStoredUser } from "@/lib/api-client";
import { ALL_DESIGNATIONS } from "@/lib/report-settings";
import { BarcodeSVG } from "@/components/barcode-svg";
import { getTodayStr, getYesterdayStr, getRecordLocalDate, shiftDate as calcShiftDate } from "@/lib/date-utils";

interface Patient {
  id: string;
  custom_id?: string;
  customId?: string;
  name: string;
  designation?: string;
  age: number;
  gender: string;
  phone: string;
  vial_barcode?: string | null;
  vialBarcode?: string | null;
  meta?: any;
  email?: string | null;
  ref_doctor?: string;
  refDoctor?: string;
  second_referral?: string;
  secondReferral?: string;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  collected_at?: string;
  collectedAt?: string;
  collected_by?: string;
  collectedBy?: string;
  aadhaar_no?: string | null;
  aadhaarNo?: string | null;
  insurance_no?: string | null;
  insuranceNo?: string | null;
  tpa?: string | null;
  hfr_id?: string | null;
  hfrId?: string | null;
  uhid?: string | null;
  passport_number?: string | null;
  passportNumber?: string | null;
  corporate_name?: string | null;
  corporateName?: string | null;
  corporate_plan?: string | null;
  corporatePlan?: string | null;
  gov_panel?: string | null;
  govPanel?: string | null;
  height?: string | null;
  weight?: string | null;
  owner_name?: string | null;
  ownerName?: string | null;
  breed?: string | null;
  species?: string | null;
  abha_number?: string | null;
  abhaNumber?: string | null;
  abha_address?: string | null;
  abhaAddress?: string | null;
  is_abha_verified?: boolean;
  isAbhaVerified?: boolean;
  abha_profile_photo?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  [key: string]: any;
}

const defaultDoctors = [
  "Self",
  "Dr. A. K. Verma, MD",
  "Dr. Rajesh Gupta, MBBS",
  "Dr. Priya Sharma, MS",
  "Dr. Suresh Nair, MD",
  "Dr. Ananya Roy, DGO",
];

const defaultCollectionPoints = [
  "Main Lab",
  "City Collection Center",
  "North Wing Clinic",
  "Home Collection",
  "Emergency OPD",
];

const defaultPhlebotomists = [
  "Self / Lab Staff",
  "Rahul Kumar (Phlebo)",
  "Amit Sharma (Phlebo)",
  "Sunita Patel (Nurse)",
  "Vikram Singh (Staff)",
];

export interface TubeDisplayInfo {
  tubeType: string;
  code: string;
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

const TUBE_CONFIG: Record<string, {
  capColor: string;
  capName: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  title: string;
  specimenType: string;
  additive: string;
  department: string;
}> = {
  EDTA: {
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

function getPatientMeta(patient: any): Record<string, any> {
  if (!patient || !patient.meta) return {};
  if (typeof patient.meta === "object") return patient.meta;
  if (typeof patient.meta === "string") {
    try { return JSON.parse(patient.meta); } catch { return {}; }
  }
  return {};
}

function getPatientVialList(patient: any): TubeDisplayInfo[] {
  if (!patient) return [];
  const meta = getPatientMeta(patient);
  let vb = meta.vial_barcodes;
  if (typeof vb === "string") {
    try { vb = JSON.parse(vb); } catch { vb = {}; }
  }

  const result: TubeDisplayInfo[] = [];
  const seenBarcodes = new Set<string>();

  if (vb && typeof vb === "object" && Object.keys(vb).length > 0) {
    Object.entries(vb).forEach(([rawTube, codeVal]) => {
      const code = String(codeVal || "").trim();
      if (!code) return;
      const upperTube = rawTube.toUpperCase();
      const config = TUBE_CONFIG[upperTube] || {
        capColor: "#6366f1",
        capName: `${rawTube} Tube`,
        badgeBg: "bg-indigo-500/10",
        badgeBorder: "border-indigo-500/30",
        badgeText: "text-indigo-600 dark:text-indigo-400",
        title: `${rawTube} Vacutainer`,
        specimenType: "Laboratory Specimen",
        additive: "Standard Laboratory Prep",
        department: "Clinical Diagnostics",
      };
      result.push({
        tubeType: upperTube,
        code,
        ...config,
      });
      seenBarcodes.add(code);
    });
  }

  // Fallback: Check if vial_barcode column contains barcodes
  const rawBarcode = String(patient.vial_barcode || patient.vialBarcode || meta.vial_barcode || "").trim();
  if (rawBarcode) {
    const parts = rawBarcode.split(",").map(s => s.trim()).filter(Boolean);
    parts.forEach((code, idx) => {
      if (!seenBarcodes.has(code)) {
        const upper = code.toUpperCase();
        let matchedType = "";
        if (upper.includes("EDTA")) matchedType = "EDTA";
        else if (upper.includes("SST") || upper.includes("SERUM") || upper.includes("PLAIN")) matchedType = "SST";
        else if (upper.includes("FLUORIDE") || upper.includes("GLUCOSE")) matchedType = "FLUORIDE";
        else if (upper.includes("CITRATE") || upper.includes("COAG")) matchedType = "CITRATE";
        else if (upper.includes("URINE")) matchedType = "URINE";
        else if (upper.includes("STOOL")) matchedType = "STOOL";
        else {
          const fallbackTubes = ["EDTA", "SST", "FLUORIDE", "CITRATE", "URINE", "STOOL"];
          matchedType = parts.length === 1 ? "PRIMARY" : (fallbackTubes[idx] || `VIAL ${idx + 1}`);
        }

        const config = TUBE_CONFIG[matchedType] || {
          capColor: "#6366f1",
          capName: matchedType === "PRIMARY" ? "Primary Specimen Tube" : `${matchedType} Tube`,
          badgeBg: "bg-indigo-500/10",
          badgeBorder: "border-indigo-500/30",
          badgeText: "text-indigo-600 dark:text-indigo-400",
          title: matchedType === "PRIMARY" ? "Primary Specimen Vial" : `${matchedType} Specimen Tube`,
          specimenType: "Laboratory Specimen",
          additive: "Standard Collection Tube",
          department: "Laboratory Testing",
        };

        result.push({
          tubeType: matchedType,
          code,
          ...config,
        });
        seenBarcodes.add(code);
      }
    });
  }

  return result;
}

export default function PatientsPage() {
  const toast = useToast();
  const [patients, setPatients] = useState<Patient[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("lis_cached_patients");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(() => getTodayStr());
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("lis_cached_patients");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch {}
    }
    return true;
  });
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const uStr = localStorage.getItem("lis_user");
        if (uStr) return JSON.parse(uStr);
      } catch {}
    }
    return null;
  });

  const isB2B = currentUser?.role === "B2B" || currentUser?.role === "COLLECTION_CENTER" || currentUser?.role === "COLLECTION_CENTRE" || currentUser?.role === "RECEPTIONIST";
  const isCollectionCenter = currentUser?.role === "COLLECTION_CENTER" || currentUser?.role === "COLLECTION_CENTRE";

  const canEditDemographics = (() => {
    // If not a Collection Centre (e.g. Admin, Receptionist, etc.), keep existing edit rights
    if (!isCollectionCenter) return true;
    const perms = currentUser?.permissions;
    if (Array.isArray(perms)) {
      return perms.includes("can_edit_demographics");
    }
    if (typeof perms === "object" && perms !== null) {
      return Boolean(perms.can_edit_demographics);
    }
    return false;
  })();

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const authBase = getAuthBaseUrl();
      fetch(`${authBase}/user`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setCurrentUser(data.user);
          updateStoredUser(data.user);
        }
      })
      .catch(() => {});
    }
  }, []);

  const [barcodeModalPatient, setBarcodeModalPatient] = useState<Patient | null>(null);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  const handleCopyBarcode = (val: string) => {
    try {
      navigator.clipboard.writeText(val);
      setCopiedBarcode(val);
      setTimeout(() => setCopiedBarcode(null), 2000);
    } catch {}
  };

  const setPreset = (preset: "today" | "yesterday" | "all") => {
    setCurrentPage(1);
    if (preset === "all") { setFilterDate(""); return; }
    if (preset === "yesterday") { setFilterDate(getYesterdayStr()); return; }
    setFilterDate(getTodayStr());
  };

  // Referral & Collection Dropdown Lists
  const [doctorsList, setDoctorsList] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedDocs = localStorage.getItem("lis_referral_doctors");
        if (savedDocs) {
          const parsed = JSON.parse(savedDocs);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultDoctors;
  });
  const [collectionPoints, setCollectionPoints] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPoints = localStorage.getItem("lis_collection_points");
        if (savedPoints) {
          const parsed = JSON.parse(savedPoints);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultCollectionPoints;
  });
  const [phlebotomists, setPhlebotomists] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPhlebo = localStorage.getItem("lis_phlebotomists");
        if (savedPhlebo) {
          const parsed = JSON.parse(savedPhlebo);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultPhlebotomists;
  });

  const shiftDate = (days: number) => {
    setCurrentPage(1);
    setFilterDate((prev) => calcShiftDate(prev, days));
  };

  // View dialog state
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);

  // Edit dialog state (Full Demographics)
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editDesignation, setEditDesignation] = useState("Mr.");
  const [editName, setEditName] = useState("");
  const [editAgeYears, setEditAgeYears] = useState("");
  const [editAgeMonths, setEditAgeMonths] = useState("");
  const [editAgeDays, setEditAgeDays] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editPhone, setEditPhone] = useState("");
  const [editRefDoctor, setEditRefDoctor] = useState("Self");
  const [editCollectedAt, setEditCollectedAt] = useState("Main Lab");
  const [editCollectedBy, setEditCollectedBy] = useState("Self / Lab Staff");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [navigatingEditId, setNavigatingEditId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Reject sample dialog state
  const [rejectPatient, setRejectPatient] = useState<Patient | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Hemolyzed / Hemolytic Sample");
  const [customRejectReason, setCustomRejectReason] = useState<string>("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchPatients();

    const handleSync = () => {
      fetchPatients(true);
    };
    window.addEventListener("lis_online_sync", handleSync);
    return () => window.removeEventListener("lis_online_sync", handleSync);
  }, []);

  const fetchPatients = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    setIsFetching(true);
    try {
      if (patients.length === 0) {
        setLoading(true);
      }
      const data = await fetchFromLaravel("/patients?per_page=300&sort=created_at&direction=desc&order=desc", { skipCache: isForce });
      const list = Array.isArray(data) ? data : (data?.data || []);
      setPatients(list);
      try {
        localStorage.setItem("lis_cached_patients", JSON.stringify(list));
      } catch {}
    } catch (err) {
      console.error("Failed to fetch patients:", err);
      if (patients.length === 0) setPatients([]);
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      await fetchPatients(true);
      toast.success("Refreshed", "Patient list refreshed with latest data.");
    } catch (err: any) {
      toast.error("Refresh Failed", err?.message || "Could not refresh patient list.");
    }
  };

  const safePatients = Array.isArray(patients) ? patients : [];

  const filteredPatients = safePatients.filter((p: any) => {
    if (!p) return false;
    const patName = p.name || "";
    const patPhone = p.phone || "";
    const patId = p.custom_id || p.customId || "";
    const patDate = getRecordLocalDate(p.created_at || p.createdAt);

    const patAbhaAddress = p.abha_address || p.abhaAddress || "";
    const patAbhaNumber = p.abha_number || p.abhaNumber || "";

    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      patPhone.includes(search) ||
      patId.toLowerCase().includes(search.toLowerCase()) ||
      patAbhaAddress.toLowerCase().includes(search.toLowerCase()) ||
      patAbhaNumber.toLowerCase().includes(search.toLowerCase());

    const matchesDate = filterDate ? (patDate === filterDate || (p.meta?.sample_date && getRecordLocalDate(p.meta.sample_date) === filterDate)) : true;

    return matchesSearch && matchesDate;
  });

  const handleOpenEdit = (patient: any) => {
    setEditPatient(patient);
    setEditDesignation(patient.designation || "Mr.");
    setEditName(patient.name || "");
    setEditAgeYears((patient.age || 0).toString());
    setEditAgeMonths("0");
    setEditAgeDays("0");
    setEditGender(patient.gender || "Male");
    setEditPhone(patient.phone || "");
    
    const doc = patient.ref_doctor || patient.refDoctor || "Self";
    setEditRefDoctor(doc);
    if (doc && !doctorsList.includes(doc)) {
      setDoctorsList((prev) => [doc, ...prev]);
    }
    
    const coll = patient.collected_at || patient.collectedAt || "Main Lab (Self / Lab Staff)";
    const match = coll.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    const point = match && match[1] ? match[1].trim() : "Main Lab";
    const phlebo = match && match[2] ? match[2].trim() : "Self / Lab Staff";
    
    setEditCollectedAt(point);
    if (point && !collectionPoints.includes(point)) {
      setCollectionPoints((prev) => [point, ...prev]);
    }
    
    setEditCollectedBy(phlebo);
    if (phlebo && !phlebotomists.includes(phlebo)) {
      setPhlebotomists((prev) => [phlebo, ...prev]);
    }
    
    setEditAddress(patient.address || "");
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    setSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const calculatedAge = parseInt(editAgeYears) || (parseInt(editAgeMonths) > 0 ? 1 : 0) || 0;
      await fetchFromLaravel(`/patients/${editPatient.id}`, {
        method: "PUT",
        body: JSON.stringify({
          designation: editDesignation,
          name: editName.trim(),
          age: calculatedAge,
          gender: editGender,
          phone: editPhone.trim(),
          ref_doctor: editRefDoctor.trim() || "Self",
          address: editAddress.trim(),
          collected_at: `${editCollectedAt} (${editCollectedBy})`,
        }),
      });

      setEditSuccess("Patient record updated successfully.");
      await fetchPatients();
      setTimeout(() => setEditPatient(null), 800);
    } catch (err: any) {
      setEditError(err.message || "Failed to update patient.");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSample = async () => {
    if (!rejectPatient) return;
    setRejecting(true);
    try {
      const finalReason = rejectReason === "Other" ? (customRejectReason.trim() || "Sample Rejected") : rejectReason;
      await fetchFromLaravel(`/patients/${rejectPatient.id}/reject-sample`, {
        method: "POST",
        body: JSON.stringify({
          reason: finalReason,
          action: "REJECT"
        })
      });
      toast.success("Sample marked as REJECTED. Patient & billing records remain intact.");
      await fetchPatients();
      setRejectPatient(null);
    } catch (err: any) {
      console.error("Reject sample error:", err);
      toast.error(err.message || "Failed to reject sample");
    } finally {
      setRejecting(false);
    }
  };

  const sortedFilteredPatients = useMemo(() => {
    return [...filteredPatients].sort((a: any, b: any) => {
      const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeA - timeB; // Ascending: first registered patient shows first
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [filteredPatients]);

  const totalRows = sortedFilteredPatients.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedFilteredPatients.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Patients Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Directory of all registered laboratory patients & demographics.</p>
        </div>
        <Link href="/dashboard/patients/register">
          <Button size="sm" className="gradient-primary text-primary-foreground font-bold text-xs gap-2 shadow-xs cursor-pointer ring-inset-top">
            <UserPlus className="h-4 w-4" />
            <span>{currentUser?.role === "COLLECTION_CENTER" ? "Sample Entry" : "Register Patient"}</span>
          </Button>
        </Link>
      </div>

      {/* Filter / Search Ribbon */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card border border-border/80 p-3.5 rounded-xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, PID, or phone number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-9 text-xs bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Date Filters & Controls */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full sm:w-auto">
          {/* Date Filter with < > Arrow Buttons */}
          <div className="flex items-center bg-background border border-border/90 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="h-8 px-2 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
            />

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPreset("today")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              filterDate === getTodayStr()
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground hover:text-foreground border-border/90 hover:bg-muted"
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => setPreset("yesterday")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              filterDate === getYesterdayStr()
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground hover:text-foreground border-border/90 hover:bg-muted"
            }`}
          >
            Yesterday
          </button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isFetching || loading}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-border/90 bg-background hover:bg-muted transition-colors shadow-xs ml-auto sm:ml-0"
            title="Refresh Patient List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      {/* Patients Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="table-responsive-container">
          {loading || isFetching ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">PID / ID</th>
                    <th className="px-5 py-3.5">Barcode</th>
                    <th className="px-5 py-3.5">Referred By</th>
                    <th className="px-5 py-3.5">Collection Point</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <tr key={idx} className="animate-fade-in">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg shimmer-gradient shrink-0" />
                          <div className="space-y-1">
                            <div className="h-4 w-32 rounded shimmer-gradient" />
                            <div className="h-3 w-20 rounded shimmer-gradient" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-24 rounded shimmer-gradient" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-24 rounded shimmer-gradient" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-16 rounded shimmer-gradient" /></td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="h-7 w-20 rounded-lg shimmer-gradient ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : currentRows.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">
                {filterDate ? `No patients registered for ${filterDate === getTodayStr() ? "Today" : filterDate}.` : "No registered patients found."}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {safePatients.length > 0
                  ? `You have ${safePatients.length} patient records in your laboratory archive.`
                  : "No patient records exist yet. Click 'Register Patient' to create one."}
              </p>
              {safePatients.length > 0 && (filterDate || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterDate("");
                    setSearch("");
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-semibold transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Show All {safePatients.length} Patients</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">PID / ID</th>
                  <th className="px-5 py-3.5">Barcode</th>
                  <th className="px-5 py-3.5">Referred By</th>
                  <th className="px-5 py-3.5">Collection Point</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentRows.map((patient: any) => {
                  const patId = patient.custom_id || patient.customId || "N/A";
                  const patName = patient.name;
                  const patGender = patient.gender || "Male";
                  const patAge = patient.age;
                  const patBarcode = patient.vial_barcode || patient.vialBarcode || patient.meta?.vial_barcode || patient.custom_id || patient.customId || "—";
                  const patRef = patient.ref_doctor || patient.refDoctor || "Self";
                  const b2bCreatorName =
                    patient.creator?.role === "B2B" ? patient.creator?.name :
                    patient.meta?.created_by_role === "B2B" ? (patient.meta?.created_by_name || patient.meta?.b2b_name) :
                    patient.meta?.b2b_name || null;
                  const patColl = b2bCreatorName || patient.collected_at || patient.collectedAt || "Main Lab";
                  const regDate = patient.created_at || patient.createdAt;

                  return (
                    <tr key={patient.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {patName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-foreground">{patName}</p>
                              {patient.meta?.sample_status === 'REJECTED' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                  <AlertOctagon className="h-2.5 w-2.5" />
                                  Sample Rejected: {patient.meta?.rejection_reason || "Hemolytic"}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {patGender} · {patAge} Yrs
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <div className="font-bold text-primary">{patId}</div>
                        {(patient.is_abha_verified || patient.isAbhaVerified || patient.abha_number || patient.abhaNumber) && (
                          <div
                            className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 tracking-wide"
                            title={`Ayushman Bharat Health Account (ABHA): ${patient.abha_number || patient.abhaNumber || "Verified ABDM M1"}`}
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            <span>ABHA</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-mono">
                        {(() => {
                          const vialList = getPatientVialList(patient);
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setBarcodeModalPatient(patient)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold border border-primary/25 text-xs transition-all cursor-pointer shadow-2xs group shrink-0"
                                title="Click to view all specimen vial barcodes"
                              >
                                <Barcode className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                                <span>Show Barcodes</span>
                                {vialList.length > 0 && (
                                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-black">
                                    {vialList.length}
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-medium">
                        Dr. {patRef}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {patColl}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                        {regDate ? new Date(regDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setViewPatient(patient)}
                            title="View Patient Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {(() => {
                            // Hide edit button for Collection Centre unless Admin explicitly granted demographic edit access
                            if (isCollectionCenter && !canEditDemographics) {
                              return null;
                            }

                            const isReportApproved = Boolean(
                              (patient as any).reports?.some((r: any) => 
                                ["APPROVED", "FINAL", "COMPLETED"].includes(String(r.status || "").toUpperCase())
                              ) || 
                              patient.meta?.is_approved || 
                              patient.meta?.report_approved
                            );
                            const isLockedForB2B = isB2B && isReportApproved;

                            if (isLockedForB2B) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled
                                  className="h-8 w-8 text-amber-600 bg-amber-500/10 border border-amber-500/20 cursor-not-allowed hover:bg-amber-500/10"
                                  title="🔒 Locked: Diagnostic report has been approved by Central Lab. Editing is disabled."
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                </Button>
                              );
                            }

                            return (
                              <Link
                                href={`/dashboard/patients/register?edit=${patient.id}`}
                                onClick={() => {
                                  setNavigatingEditId(patient.id);
                                  try {
                                    sessionStorage.setItem(`edit_patient_cache_${patient.id}`, JSON.stringify(patient));
                                  } catch (_) {}
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer"
                                  title="Edit Patient Details & Tests"
                                  disabled={navigatingEditId === patient.id}
                                >
                                  {navigatingEditId === patient.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  ) : (
                                    <Edit2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </Link>
                            );
                          })()}
                          {!isB2B && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'admin' || !currentUser?.role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 cursor-pointer ${
                                patient.meta?.sample_status === 'REJECTED'
                                  ? 'text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
                                  : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10'
                              }`}
                              onClick={() => {
                                setRejectPatient(patient);
                                setRejectReason(patient.meta?.rejection_reason || "Hemolyzed / Hemolytic Sample");
                                setCustomRejectReason("");
                              }}
                              title={patient.meta?.sample_status === 'REJECTED' ? "Update Sample Rejection" : "Reject Laboratory Sample"}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalRows > 0 && (
          <div className="bg-muted/20 px-5 py-3 border-t border-border/60 flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{indexOfFirstRow + 1}</strong>–<strong className="text-foreground">{Math.min(indexOfLastRow, totalRows)}</strong> of <strong className="text-foreground">{totalRows}</strong> patients
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-semibold px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 2. COMPREHENSIVE VIEW PATIENT DETAILS MODAL */}
      <Dialog open={!!viewPatient} onOpenChange={() => setViewPatient(null)}>
        <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Patient Full Profile</DialogTitle>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-7 py-4 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
                {viewPatient?.name ? viewPatient.name.slice(0, 2).toUpperCase() : <User className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {viewPatient?.designation ? `${viewPatient.designation} ` : ""}{viewPatient?.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    VERIFIED PATIENT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Patient ID: <strong className="text-primary font-bold">{viewPatient?.custom_id || viewPatient?.customId}</strong>
                </p>
              </div>
            </div>
          </div>

          {viewPatient && (
            <div className="p-6 sm:p-7 space-y-6 text-xs bg-card">
              {/* Section 1: Demographics & Personal Profile */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <User className="h-4 w-4 text-primary" />
                  <span>Demographics & Personal Profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl border border-border/70 bg-background/60">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient ID (PID)</p>
                    <p className="font-mono font-bold text-primary text-sm mt-0.5">{viewPatient.custom_id || viewPatient.customId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {viewPatient.designation ? `${viewPatient.designation} ` : ""}{viewPatient.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Age / Gender</p>
                    <p className="font-bold text-foreground mt-0.5">{viewPatient.age} Yrs · {viewPatient.gender || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Phone Number</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{viewPatient.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</p>
                    <p className="font-medium text-foreground mt-0.5 truncate">{viewPatient.email || viewPatient.meta?.email || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Clinical & Government Identifiers */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Clinical & Government Identifiers</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl border border-border/70 bg-background/60">
                  <div className="sm:col-span-2 lg:col-span-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          ABHA Identity (Ayushman Bharat Digital Mission)
                        </span>
                        {(viewPatient.is_abha_verified || viewPatient.isAbhaVerified) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                            Verified M1
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                        <span className="font-mono font-bold text-foreground">
                          {(viewPatient.abha_number || viewPatient.abhaNumber)
                            ? (viewPatient.abha_number || viewPatient.abhaNumber)?.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4")
                            : "Not Linked"}
                        </span>
                        {(viewPatient.abha_address || viewPatient.abhaAddress) && (
                          <span className="font-mono text-muted-foreground">
                            ({viewPatient.abha_address || viewPatient.abhaAddress})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Aadhaar / National ID</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {viewPatient.aadhaar_no || viewPatient.aadhaarNo || viewPatient.meta?.aadhaar_no || viewPatient.meta?.aadhaarNo || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">UHID</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {viewPatient.uhid || viewPatient.meta?.uhid || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">HFR ID (Ayushman Registry)</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {viewPatient.hfr_id || viewPatient.hfrId || viewPatient.meta?.hfr_id || viewPatient.meta?.hfrId || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Health Insurance Policy No.</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {viewPatient.insurance_no || viewPatient.insuranceNo || viewPatient.meta?.insurance_no || viewPatient.meta?.insuranceNo || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">TPA (Third-Party Administrator)</p>
                    <p className="font-medium text-foreground mt-0.5">
                      {viewPatient.tpa || viewPatient.meta?.tpa || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Passport Number</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {viewPatient.passport_number || viewPatient.passportNumber || viewPatient.meta?.passport_number || viewPatient.meta?.passportNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Corporate Client</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {viewPatient.corporate_name || viewPatient.corporateName || viewPatient.meta?.corporate_name || viewPatient.meta?.corporateName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Corporate Plan</p>
                    <p className="font-medium text-foreground mt-0.5">
                      {viewPatient.corporate_plan || viewPatient.corporatePlan || viewPatient.meta?.corporate_plan || viewPatient.meta?.corporatePlan || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Government Panel</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {viewPatient.gov_panel || viewPatient.govPanel || viewPatient.meta?.gov_panel || viewPatient.meta?.govPanel || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Vitals & Body Measurements */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <Activity className="h-4 w-4 text-primary" />
                  <span>Clinical Vitals & Measurements</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-border/70 bg-background/60">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Height</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {(viewPatient.height || viewPatient.meta?.height) ? `${viewPatient.height || viewPatient.meta?.height} cm` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Weight</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {(viewPatient.weight || viewPatient.meta?.weight) ? `${viewPatient.weight || viewPatient.meta?.weight} kg` : "—"}
                    </p>
                  </div>
                  {(viewPatient.owner_name || viewPatient.ownerName || viewPatient.meta?.owner_name || viewPatient.breed || viewPatient.species) && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Owner Name (Vet)</p>
                        <p className="font-bold text-foreground mt-0.5">{viewPatient.owner_name || viewPatient.ownerName || viewPatient.meta?.owner_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Breed & Species (Vet)</p>
                        <p className="font-bold text-foreground mt-0.5">
                          {viewPatient.breed || viewPatient.meta?.breed || "—"} {viewPatient.species ? `(${viewPatient.species})` : ""}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Section 4: Clinical Referral & Logistics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <span>Clinical Referral & Logistics</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border border-border/70 bg-background/60">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Referring Doctor</p>
                    <p className="font-bold text-foreground mt-0.5">Dr. {viewPatient.ref_doctor || viewPatient.refDoctor || "Self"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Second Referral Doctor</p>
                    <p className="font-medium text-foreground mt-0.5">{viewPatient.second_referral || viewPatient.secondReferral || viewPatient.meta?.second_referral || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Collection Point / Center</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {(() => {
                        const b2bCreatorName =
                          viewPatient.creator?.role === "B2B" ? viewPatient.creator?.name :
                          viewPatient.meta?.created_by_role === "B2B" ? (viewPatient.meta?.created_by_name || viewPatient.meta?.b2b_name) :
                          viewPatient.meta?.b2b_name || null;
                        return b2bCreatorName || viewPatient.collected_at || viewPatient.collectedAt || "Main Lab";
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Phlebotomist / Collector</p>
                    <p className="font-medium text-foreground mt-0.5">{viewPatient.collected_by || viewPatient.collectedBy || viewPatient.meta?.collected_by || "Self / Lab Staff"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Intake Registration Date & Time</p>
                    <p className="font-medium text-foreground mt-0.5">
                      {(viewPatient.created_at || viewPatient.createdAt)
                        ? new Date((viewPatient.created_at || viewPatient.createdAt) as string).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5: Residential & Geographic Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Residential & Geographic Address</span>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-background/60 space-y-2">
                  <p className="text-foreground text-xs leading-relaxed font-medium">
                    {viewPatient.address && viewPatient.address.trim() !== ""
                      ? viewPatient.address
                      : "No physical street address recorded."}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">City / Town</span>
                      <span className="font-semibold text-foreground">{viewPatient.city || viewPatient.meta?.city || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">District</span>
                      <span className="font-semibold text-foreground">{viewPatient.district || viewPatient.meta?.district || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">State</span>
                      <span className="font-semibold text-foreground">{viewPatient.state || viewPatient.meta?.state || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Pincode</span>
                      <span className="font-mono font-semibold text-foreground">{viewPatient.pincode || viewPatient.meta?.pincode || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: Specimen Tubes & Vial Barcodes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                    <Barcode className="h-4 w-4 text-primary" />
                    <span>Specimen Tubes & Assigned Barcodes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const b = viewPatient.vial_barcode || viewPatient.vialBarcode || viewPatient.meta?.vial_barcode;
                      if (b) handleCopyBarcode(b);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedBarcode === (viewPatient.vial_barcode || viewPatient.vialBarcode) ? "Copied Primary!" : "Copy Primary Barcode"}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-background/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-card border border-border/80">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Primary Vial Barcode</span>
                      <p className="font-mono font-black text-sm text-primary tracking-wide">
                        {viewPatient.vial_barcode || viewPatient.vialBarcode || viewPatient.meta?.vial_barcode || "—"}
                      </p>
                    </div>
                    {viewPatient.vial_barcode && (
                      <button
                        type="button"
                        onClick={() => handleCopyBarcode(viewPatient.vial_barcode!)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-foreground font-bold text-[11px] flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                      >
                        {copiedBarcode === viewPatient.vial_barcode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>{copiedBarcode === viewPatient.vial_barcode ? "Copied!" : "Copy"}</span>
                      </button>
                    )}
                  </div>

                  {/* Multi-Vial Tube Breakdown */}
                  {(() => {
                    const vialList = getPatientVialList(viewPatient);
                    if (vialList.length === 0) return null;
                    return (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <TestTube2 className="h-3 w-3 text-primary" />
                          <span>Specimen Vacutainer Tubes ({vialList.length})</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {vialList.map((tube) => (
                            <div
                              key={tube.tubeType + tube.code}
                              className="p-3 rounded-xl border border-border/80 bg-card flex flex-col justify-between space-y-2 shadow-2xs"
                              style={{ borderLeftWidth: 3, borderLeftColor: tube.capColor }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-foreground flex items-center gap-1.5 truncate">
                                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: tube.capColor }} />
                                  {tube.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyBarcode(tube.code)}
                                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                                  title="Copy barcode"
                                >
                                  {copiedBarcode === tube.code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{tube.specimenType}</p>
                              <div className="bg-muted/40 p-1.5 rounded font-mono text-xs font-black text-foreground truncate select-all">
                                {tube.code}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. DEDICATED VIAL BARCODES POPUP MODAL (EXPANDED & RESPONSIVE HORIZONTAL LAYOUT) */}
      <Dialog open={!!barcodeModalPatient} onOpenChange={() => setBarcodeModalPatient(null)}>
        <DialogContent
          hideClose
          className="max-w-[96vw] sm:max-w-4xl lg:max-w-5xl w-full rounded-3xl bg-card border border-border/80 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <DialogTitle className="sr-only">Specimen Vial Barcodes</DialogTitle>
          
          {barcodeModalPatient && (() => {
            const vialList = getPatientVialList(barcodeModalPatient);
            const patMeta = getPatientMeta(barcodeModalPatient);
            const primaryCode = barcodeModalPatient.vial_barcode || barcodeModalPatient.vialBarcode || patMeta.vial_barcode || barcodeModalPatient.custom_id || barcodeModalPatient.customId || "—";
            const patientId = barcodeModalPatient.custom_id || barcodeModalPatient.customId || "";
            const patientName = barcodeModalPatient.name || "Patient";
            const patientGender = barcodeModalPatient.gender || "—";
            const patientAge = barcodeModalPatient.age ? `${barcodeModalPatient.age} Y` : "—";
            const refDoctor = barcodeModalPatient.ref_doctor || barcodeModalPatient.refDoctor || "Self";
            const collectionPoint = barcodeModalPatient.collected_at || barcodeModalPatient.collectedAt || "Main Lab";

            const handleCopyAll = () => {
              if (vialList.length === 0) return;
              const allCodes = vialList.map(v => `${v.tubeType}: ${v.code}`).join("\n");
              handleCopyBarcode(allCodes);
            };

            return (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Modal Header */}
                <div className="px-5 sm:px-7 py-4 border-b border-border/80 bg-gradient-to-r from-primary/10 via-card to-background flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-md ring-4 ring-primary/15 shrink-0">
                      <Barcode className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-display text-base font-bold text-foreground">Specimen Vial Barcodes</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-black border border-primary/25">
                          {vialList.length > 0 ? `${vialList.length} ${vialList.length === 1 ? "Specimen Tube" : "Specimen Tubes"} Registered` : "No Barcodes"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{patientName}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{patientGender}, {patientAge}</span>
                        {patientId && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="font-mono font-bold text-primary">{patientId}</span>
                          </>
                        )}
                        <span className="text-muted-foreground/50">·</span>
                        <span>Dr: <strong className="text-foreground/90">{refDoctor}</strong></span>
                        {collectionPoint && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span>Centre: <strong className="text-foreground/90">{collectionPoint}</strong></span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBarcodeModalPatient(null)}
                      className="rounded-full h-8 w-8 flex items-center justify-center text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground transition-all focus:outline-none cursor-pointer shadow-xs"
                      title="Close dialog"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Body (Scrollable with Horizontal Room) */}
                <div className="p-5 sm:p-7 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar">
                  {vialList.length > 1 && (
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <TestTube2 className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase text-foreground tracking-wider">
                          Registered Specimen Vacutainers &amp; Vials ({vialList.length})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyAll}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy All Barcodes</span>
                      </button>
                    </div>
                  )}

                  {vialList.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2 text-muted-foreground bg-muted/20 my-auto">
                      <TestTube2 className="h-10 w-10 mx-auto opacity-30 mb-2 text-primary" />
                      <p className="font-bold text-foreground text-sm">No Specimen Barcodes Registered</p>
                      <p className="text-xs max-w-md mx-auto">
                        No specimen vial barcodes were entered during patient registration. You can edit this patient to assign specimen vial barcodes.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vialList.map((tube, idx) => (
                        <div
                          key={tube.tubeType + tube.code + idx}
                          className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-background hover:bg-muted/15 transition-all flex flex-col justify-between space-y-3.5 shadow-xs relative overflow-hidden"
                          style={{ borderLeftWidth: 5, borderLeftColor: tube.capColor }}
                        >
                          {/* Card Top: Tube Cap Dot, Title, Tube Type Badge & Copy Button */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-3">
                              <span
                                className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs mt-0.5"
                                style={{ backgroundColor: tube.capColor }}
                              >
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-bold text-sm text-foreground leading-snug">{tube.title}</h5>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${tube.badgeBg} ${tube.badgeBorder} ${tube.badgeText}`}
                                  >
                                    {tube.tubeType}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                  {tube.capName} · <span className="italic">{tube.specimenType}</span>
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyBarcode(tube.code)}
                              className="px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                              title={`Copy ${tube.tubeType} Barcode`}
                            >
                              {copiedBarcode === tube.code ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Middle Specs: Additive & Department Tests */}
                          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-foreground/80">Additive:</span>
                              <span className="truncate">{tube.additive}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-foreground/80">Clinical:</span>
                              <span className="truncate">{tube.department}</span>
                            </div>
                          </div>

                          {/* Bottom: Barcode Number & High-Res Barcode SVG */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-border/80 shadow-2xs">
                            <div className="text-center sm:text-left min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tube Barcode</span>
                              <p className="font-mono font-black text-base text-foreground tracking-wider select-all mt-0.5 truncate">
                                {tube.code}
                              </p>
                            </div>

                            {tube.code && (
                              <div className="p-1.5 bg-white rounded-lg border border-zinc-200 shrink-0 shadow-2xs flex items-center justify-center">
                                <BarcodeSVG value={tube.code} width={1.15} height={28} fontSize={8} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer (Spacious Horizontal Controls) */}
                <div className="px-5 sm:px-7 py-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>All barcodes are synchronized for laboratory analyzer integration &amp; LIS tracking.</span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    {vialList.length > 1 && (
                      <button
                        type="button"
                        onClick={handleCopyAll}
                        className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Copy All ({vialList.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBarcodeModalPatient(null)}
                      className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md hover:brightness-105 transition-all cursor-pointer ring-inset-top"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 3. REJECT SAMPLE MODAL */}
      <Dialog open={!isB2B && !!rejectPatient} onOpenChange={() => setRejectPatient(null)}>
        <DialogContent className="max-w-md w-full rounded-2xl">
          <DialogTitle className="sr-only">Reject Laboratory Sample</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border/80 pb-3 text-amber-600">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Reject Laboratory Sample</h3>
                <p className="text-xs text-muted-foreground">Mark specimen as clinically rejected. Bills & audit records remain intact.</p>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-xl space-y-1 text-xs border border-border/60">
              <p className="text-muted-foreground">
                Patient: <strong className="text-foreground">{rejectPatient?.name}</strong>
              </p>
              <p className="text-muted-foreground">
                ID / Barcode: <span className="font-mono text-primary font-semibold">{rejectPatient?.custom_id || rejectPatient?.customId || "—"}</span> {rejectPatient?.vial_barcode ? `· ${rejectPatient.vial_barcode}` : ''}
              </p>
              {rejectPatient?.meta?.sample_status === 'REJECTED' && (
                <p className="text-rose-600 font-medium pt-1">
                  Current Status: Already Rejected ({rejectPatient?.meta?.rejection_reason || 'Hemolytic'})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Clinical Rejection Reason</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select clinical reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hemolyzed / Hemolytic Sample">Hemolyzed / Hemolytic Sample</SelectItem>
                  <SelectItem value="Clotted / Coagulated Specimen">Clotted / Coagulated Specimen</SelectItem>
                  <SelectItem value="Insufficient Sample Quantity (QNS)">Insufficient Sample Quantity (QNS)</SelectItem>
                  <SelectItem value="Wrong Collection Tube / Container">Wrong Collection Tube / Container</SelectItem>
                  <SelectItem value="Lipemic / Icteric Specimen">Lipemic / Icteric Specimen</SelectItem>
                  <SelectItem value="Contaminated / Leaked Specimen">Contaminated / Leaked Specimen</SelectItem>
                  <SelectItem value="Improper Storage / Cold Chain Broken">Improper Storage / Cold Chain Broken</SelectItem>
                  <SelectItem value="Other">Other (Specify below)</SelectItem>
                </SelectContent>
              </Select>

              {rejectReason === "Other" && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter custom rejection reason..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Financial & Audit Safety:
              </p>
              <p>
                Rejecting this sample will <strong>NOT</strong> delete the billing ledger or alter B2B wallet deductions. If this is a B2B client, they will be notified to register a fresh sample.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border/80">
              {rejectPatient?.meta?.sample_status === 'REJECTED' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!rejectPatient) return;
                    setRejecting(true);
                    try {
                      await fetchFromLaravel(`/patients/${rejectPatient.id}/reject-sample`, {
                        method: "POST",
                        body: JSON.stringify({ action: "RESTORE" })
                      });
                      toast.success("Sample restored to active status");
                      await fetchPatients();
                      setRejectPatient(null);
                    } catch (err: any) {
                      toast.error(err.message || "Failed to restore sample");
                    } finally {
                      setRejecting(false);
                    }
                  }}
                  disabled={rejecting}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Restore to Active
                </Button>
              ) : <div />}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRejectPatient(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRejectSample}
                  disabled={rejecting || (rejectReason === "Other" && !customRejectReason.trim())}
                  className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  <span>{rejectPatient?.meta?.sample_status === 'REJECTED' ? "Update Rejection" : "Confirm Rejection"}</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
