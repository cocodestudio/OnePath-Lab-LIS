"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, useDeferredValue } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope, MapPin, Phone, User, Hash, FlaskConical, CheckCircle2,
  Loader2, Printer, FileText, AlertCircle, ArrowRight, Search, BookOpen, Settings,
  ChevronDown, ChevronRight, ChevronLeft, PlusCircle, Edit2, Trash2, UserCheck, Building, Sparkles,
  Percent, DollarSign, Receipt, RefreshCw, X, Check, ExternalLink,
  Mail, Shield, CreditCard, Building2, Calendar, CheckSquare, RotateCcw,
  ClipboardList, Asterisk, Activity, Scale, Ruler, HeartPulse, ShieldCheck, Tag, Clock,
  Banknote, QrCode, Globe, Wallet, Boxes, Lock, TestTube2, Barcode, MessageSquare, Download
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { fetchFromLaravel, getStoredUser, getStoredToken, getAuthBaseUrl, updateStoredUser, clearApiCache, prependToApiCache, markApiCacheStale } from "@/lib/api-client";
import {
  ALL_DESIGNATIONS,
  normalizeDesignation,
  DEFAULT_INTAKE_FIELDS,
  type IntakeFieldConfig,
  normalizeReportSettings
} from "@/lib/report-settings";
import { getStoredPackages, type LabPackage, saveReportPackage, resolvePackageTestIds } from "@/lib/packages";
const InvoiceSheet = dynamic(() => import("@/components/invoice-sheet").then(m => m.InvoiceSheet), { ssr: false });
import { normalizeBillSettings, type BillLayoutSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";
import { getNativePdfBase64, downloadNativePdf } from "@/lib/pdf-report-downloader";
import { useToast } from "@/components/ui/toast";
import type { AbhaVerifiedPatient } from "@/components/abha-link-modal";
const AbhaLinkModal = dynamic(() => import("@/components/abha-link-modal").then(m => m.AbhaLinkModal), { ssr: false });
const AbhaQrPosterModal = dynamic(() => import("@/components/abha-qr-poster-modal").then(m => m.AbhaQrPosterModal), { ssr: false });
import {
  type OutsourcePartnerLab,
  getCachedPartnerLabs,
  setCachedPartnerLabs,
  DEFAULT_PARTNER_LABS,
} from "@/lib/outsource-partner-labs";

interface Test {
  id: string; name: string; category: string; price: number;
  unit: string | null; refRangeMin: number | null; refRangeMax: number | null;
  subTests?: Test[];
  b2b_price?: number;
  b2bPrice?: number;
  mrp?: number;
}
interface Patient {
  id: string; customId: string; name: string; age: number;
  gender: string; phone: string; refDoctor: string; address?: string; collectedAt?: string;
  [key: string]: any;
}

interface SpecimenTubeGroup {
  tubeType: "EDTA" | "SST" | "FLUORIDE" | "CITRATE" | "URINE" | "STOOL" | "OTHER";
  capColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  tubeTitle: string;
  specimenType: string;
  additive: string;
  tests: Array<{ id: string; name: string }>;
}

function classifyTestsIntoTubes(tests: Array<{ id: string; name: string; category?: string }>): SpecimenTubeGroup[] {
  const groups: Record<string, SpecimenTubeGroup> = {
    EDTA: {
      tubeType: "EDTA",
      capColor: "#8b5cf6",
      badgeBg: "bg-purple-500/10",
      badgeBorder: "border-purple-500/30",
      badgeText: "text-purple-600 dark:text-purple-400",
      tubeTitle: "EDTA (Lavender Cap)",
      specimenType: "Whole Blood (EDTA)",
      additive: "K2/K3 EDTA Anticoagulant",
      tests: [],
    },
    FLUORIDE: {
      tubeType: "FLUORIDE",
      capColor: "#64748b",
      badgeBg: "bg-slate-500/10",
      badgeBorder: "border-slate-500/30",
      badgeText: "text-slate-600 dark:text-slate-400",
      tubeTitle: "Sodium Fluoride (Grey Cap)",
      specimenType: "Fluoride Plasma / Blood",
      additive: "NaF + Potassium Oxalate (Glycolytic Inhibitor)",
      tests: [],
    },
    CITRATE: {
      tubeType: "CITRATE",
      capColor: "#0284c7",
      badgeBg: "bg-sky-500/10",
      badgeBorder: "border-sky-500/30",
      badgeText: "text-sky-600 dark:text-sky-400",
      tubeTitle: "Sodium Citrate 3.2% (Light Blue Cap)",
      specimenType: "Citrated Plasma",
      additive: "Buffered Sodium Citrate 1:9",
      tests: [],
    },
    URINE: {
      tubeType: "URINE",
      capColor: "#eab308",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/30",
      badgeText: "text-amber-600 dark:text-amber-400",
      tubeTitle: "Sterile Urine Container (Yellow Cap)",
      specimenType: "Urine (Spot / Clean Catch)",
      additive: "Sterile Preservative-Free",
      tests: [],
    },
    STOOL: {
      tubeType: "STOOL",
      capColor: "#92400e",
      badgeBg: "bg-orange-500/10",
      badgeBorder: "border-orange-500/30",
      badgeText: "text-orange-700 dark:text-orange-400",
      tubeTitle: "Stool Specimen Container",
      specimenType: "Stool",
      additive: "Sterile Container",
      tests: [],
    },
    SST: {
      tubeType: "SST",
      capColor: "#f59e0b",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/30",
      badgeText: "text-amber-600 dark:text-amber-400",
      tubeTitle: "SST / Plain Serum (Gold / Red Cap)",
      specimenType: "Serum (Clotted Blood)",
      additive: "Clot Activator & Gel Separator",
      tests: [],
    },
    OTHER: {
      tubeType: "OTHER",
      capColor: "#059669",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      tubeTitle: "Formalin / Biopsy Container",
      specimenType: "Tissue Biopsy / Fluid Specimen",
      additive: "10% Neutral Buffered Formalin",
      tests: [],
    },
  };

  tests.forEach((t) => {
    const nameLower = (t.name || "").toLowerCase();
    const catLower = (t.category || "").toLowerCase();

    // 1. Urine checks
    if (nameLower.includes("urine") || (catLower.includes("clinical pathology") && nameLower.includes("urine"))) {
      groups.URINE.tests.push({ id: t.id, name: t.name });
    }
    // 2. Stool checks
    else if (nameLower.includes("stool") || nameLower.includes("occult blood")) {
      groups.STOOL.tests.push({ id: t.id, name: t.name });
    }
    // 3. Citrate / Coagulation checks
    else if (
      nameLower.includes("pt/inr") ||
      nameLower.includes("pt (") ||
      nameLower.includes("prothrombin") ||
      nameLower.includes("aptt") ||
      nameLower.includes("d-dimer") ||
      nameLower.includes("fibrinogen") ||
      catLower.includes("coagulation")
    ) {
      groups.CITRATE.tests.push({ id: t.id, name: t.name });
    }
    // 4. Fluoride / Glucose checks
    else if (
      nameLower.includes("fasting blood sugar") ||
      nameLower.includes("fbs") ||
      nameLower.includes("ppbs") ||
      nameLower.includes("post prandial") ||
      nameLower.includes("rbs") ||
      nameLower.includes("random blood sugar") ||
      nameLower.includes("glucose tolerance") ||
      nameLower.includes("ogtt")
    ) {
      groups.FLUORIDE.tests.push({ id: t.id, name: t.name });
    }
    // 5. Histopathology / Tissue / Biopsy / Cytology checks
    else if (
      nameLower.includes("biopsy") ||
      nameLower.includes("histopath") ||
      catLower.includes("histopath") ||
      catLower.includes("cytopath") ||
      nameLower.includes("fnac") ||
      nameLower.includes("pap smear")
    ) {
      groups.OTHER.tests.push({ id: t.id, name: t.name });
    }
    // 6. EDTA / Hematology checks
    else if (
      nameLower.includes("cbc") ||
      nameLower.includes("complete blood") ||
      nameLower.includes("hemogram") ||
      nameLower.includes("tlc") ||
      nameLower.includes("dlc") ||
      nameLower.includes("platelet") ||
      nameLower.includes("esr") ||
      nameLower.includes("hba1c") ||
      nameLower.includes("glycosylated") ||
      nameLower.includes("blood group") ||
      nameLower.includes("peripheral smear") ||
      nameLower.includes("reticulocyte") ||
      nameLower.includes("malaria") ||
      catLower.includes("hematology")
    ) {
      groups.EDTA.tests.push({ id: t.id, name: t.name });
    }
    // 7. Default: All Biochemistry, Serology, Immunoassay, Hormones belong in SST / Plain Serum
    else {
      groups.SST.tests.push({ id: t.id, name: t.name });
    }
  });

  return Object.values(groups).filter((g) => g.tests.length > 0);
}

const defaultDoctors = ["Self", "Dr. Rajesh Sharma", "Dr. Amit Verma", "Dr. Anjali Gupta", "Dr. S. K. Roy"];
const defaultCollectionPoints = ["Main Lab", "Home Collection", "Hospital OPD", "Branch 1 - City Center"];
const defaultPhlebotomists = ["Self / Lab Staff", "Rahul Phlebotomist", "Pooja Sharma (Tech)", "Vikram Collector"];
const DEFAULT_PARTNER_LAB_NAMES = [
  "Dr. Lal PathLabs",
  "SRL Diagnostics",
  "Metropolis Healthcare",
  "Thyrocare Technologies",
  "Suburban Diagnostics",
  "Oncquest Laboratories",
  "Apollo Diagnostics",
  "Redcliffe Labs",
  "General Diagnostics",
];

function RegisterPageShimmer({ pid }: { pid?: string | null }) {
  return (
    <div className="w-full space-y-7 pb-12 animate-fade-in text-foreground select-none" aria-busy="true">
      {/* Top Header Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            <div className="h-3 w-40 rounded shimmer-gradient" />
            {pid && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px]">
                PID: {pid}
              </span>
            )}
          </div>
          <div className="h-8 w-72 sm:w-96 rounded-xl shimmer-gradient" />
          <div className="h-4 w-60 sm:w-80 rounded-md shimmer-gradient" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/patients"
            className="px-3.5 py-2 rounded-xl border border-border/90 bg-card hover:bg-accent text-xs font-semibold text-muted-foreground transition-all shadow-xs flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Patients</span>
          </Link>
        </div>
      </div>

      {/* Shimmer Feedback Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 shadow-xs animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-sm">Fetching Patient Profile & Investigations...</p>
          <p className="text-muted-foreground text-[11px]">Loading demographics, test catalog, reference doctor, and billing details from central database.</p>
        </div>
      </div>

      {/* Stepper Shimmer */}
      <div className="flex items-center justify-between max-w-xl mx-auto px-4 py-1">
        {[1, 2, 3].map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-9 h-9 rounded-full shimmer-gradient" />
              <div className="h-2.5 w-16 rounded shimmer-gradient" />
            </div>
            {idx < 2 && <div className="flex-1 min-w-[32px] h-[2px] mx-3 mb-4 rounded shimmer-gradient" />}
          </React.Fragment>
        ))}
      </div>

      {/* Main Grid: 8 Cols Form + 4 Cols Tests & Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols Demographics Shimmer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card/80 p-6 sm:p-7 rounded-2xl border border-border/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded shimmer-gradient" />
                <div className="h-4 w-48 rounded shimmer-gradient" />
              </div>
              <div className="h-7 w-24 rounded-lg shimmer-gradient" />
            </div>

            {/* Input fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3 space-y-1.5">
                <div className="h-3 w-16 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
              <div className="sm:col-span-4 space-y-1.5">
                <div className="h-3 w-20 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
              <div className="sm:col-span-5 space-y-1.5">
                <div className="h-3 w-20 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <div className="h-3 w-16 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
              <div className="sm:col-span-8 space-y-1.5">
                <div className="h-3 w-16 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>

              <div className="sm:col-span-6 space-y-1.5">
                <div className="h-3 w-24 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
              <div className="sm:col-span-6 space-y-1.5">
                <div className="h-3 w-20 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>

              <div className="sm:col-span-8 space-y-1.5">
                <div className="h-3 w-16 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
              <div className="sm:col-span-4 space-y-1.5">
                <div className="h-3 w-16 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
            </div>

            {/* Referral & Collection Points */}
            <div className="border-t border-border/80 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-32 rounded shimmer-gradient" />
                <div className="h-10 w-full rounded-xl shimmer-gradient" />
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols Tests & Billing Shimmer */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tests Card */}
          <div className="bg-card/80 p-5 rounded-2xl border border-border/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="h-4 w-32 rounded shimmer-gradient" />
              <div className="h-5 w-12 rounded-full shimmer-gradient" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-border/70 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3.5 w-32 rounded shimmer-gradient" />
                    <div className="h-2.5 w-20 rounded shimmer-gradient" />
                  </div>
                  <div className="h-4 w-12 rounded shimmer-gradient" />
                </div>
              ))}
            </div>
          </div>

          {/* Billing Card */}
          <div className="bg-card/80 p-5 rounded-2xl border border-border/90 shadow-sm space-y-3.5">
            <div className="h-4 w-28 rounded shimmer-gradient border-b border-border/80 pb-3" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-20 rounded shimmer-gradient" />
                <div className="h-3 w-16 rounded shimmer-gradient" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded shimmer-gradient" />
                <div className="h-3 w-14 rounded shimmer-gradient" />
              </div>
              <div className="flex justify-between pt-2 border-t border-border/70">
                <div className="h-4 w-24 rounded shimmer-gradient" />
                <div className="h-5 w-20 rounded shimmer-gradient" />
              </div>
            </div>
            <div className="h-11 w-full rounded-xl shimmer-gradient mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterPatientPage() {
  const searchParams = useSearchParams();
  const { toast, success: toastSuccess, error: toastError } = useToast();
  const editId = searchParams?.get("edit");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [isEditLoading, setIsEditLoading] = useState<boolean>(() => Boolean(editId));
  const [hasPreloadedPreview, setHasPreloadedPreview] = useState<boolean>(false);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [existingBill, setExistingBill] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const u = getStoredUser();
      if (u?.role) return String(u.role).toUpperCase().trim();
    }
    return "STAFF";
  });
  const [currentUserPermissions, setCurrentUserPermissions] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const u = getStoredUser();
      if (Array.isArray(u?.permissions)) return u.permissions;
    }
    return [];
  });
  const effectiveRole = (
    (typeof window !== "undefined" ? getStoredUser()?.role : "") ||
    currentUserRole ||
    "STAFF"
  ).toUpperCase().trim();
  const isB2B = effectiveRole === "B2B";
  const isCollectionCenter = effectiveRole === "COLLECTION_CENTER" || effectiveRole === "COLLECTION_CENTRE";
  const isReceptionist = effectiveRole === "RECEPTIONIST";
  const isRestrictedRole = isB2B || isCollectionCenter || isReceptionist;

  const canEditDemographics = true;

  const isApprovedReport = existingReport && (
    existingReport.status === "APPROVED" ||
    existingReport.status === "FINAL" ||
    existingReport.status === "COMPLETED"
  );
  const isCcEditLocked = false;
  const isEditLocked = false;

  // Multi-Vial Barcode Mapping: tubeType => barcode string
  const [vialBarcodes, setVialBarcodes] = useState<Record<string, string>>({});

  // Dynamic Intake Field Rules State
  const [intakeFields, setIntakeFields] = useState<IntakeFieldConfig[]>(DEFAULT_INTAKE_FIELDS);
  const [tempIntakeFields, setTempIntakeFields] = useState<IntakeFieldConfig[]>(DEFAULT_INTAKE_FIELDS);
  const [intakeCategoryTab, setIntakeCategoryTab] = useState<string>("ALL");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingIntakeRules, setSavingIntakeRules] = useState(false);

  // Demographics (Unselected by default so user chooses according to preference)
  const [designation, setDesignation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [ageDays, setAgeDays] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");

  const handleTitleChange = (newTitle: string) => {
    if (!newTitle || newTitle === "Blank" || newTitle === "Null") {
      setDesignation("Blank");
      return;
    }
    setDesignation(newTitle);
    const lower = (newTitle || "").toLowerCase().trim();
    // If Baby or B/o, keep gender as none / unselected because baby can be male or female
    if (lower.startsWith("baby") || lower.includes("b/o")) {
      setGender("");
      return;
    }
    // Female Titles
    if (
      lower.startsWith("mrs") ||
      lower.startsWith("ms") ||
      lower.startsWith("miss") ||
      lower.startsWith("smt") ||
      lower === "w/o" ||
      lower === "d/o" ||
      lower === "m/o" ||
      lower.startsWith("kumari")
    ) {
      setGender("Female");
      return;
    }
    // Male Titles
    if (
      lower.startsWith("mr") ||
      lower.startsWith("master") ||
      lower.startsWith("shri") ||
      lower === "s/o" ||
      lower.startsWith("mohd") ||
      lower.startsWith("kumar") ||
      lower.startsWith("md") ||
      lower.startsWith("baba") ||
      lower.startsWith("sk")
    ) {
      setGender("Male");
      return;
    }
  };

  // Referrals & Logistics
  const [doctorsList, setDoctorsList] = useState<string[]>(defaultDoctors);
  const [refDoctorSelect, setRefDoctorSelect] = useState("Self");
  const [secondReferral, setSecondReferral] = useState("");
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [newDoctorInput, setNewDoctorInput] = useState("");
  const [isDoctorActive, setIsDoctorActive] = useState<boolean>(true);
  const [editingDoctor, setEditingDoctor] = useState<{ oldName: string; newName: string } | null>(null);

  const [collectionPoints, setCollectionPoints] = useState<string[]>(defaultCollectionPoints);
  const [collectionCentersList, setCollectionCentersList] = useState<any[]>([]);
  const [collectedAtSelect, setCollectedAtSelect] = useState("Main Lab");
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [newCollectionInput, setNewCollectionInput] = useState("");
  const [editingCollectionPoint, setEditingCollectionPoint] = useState<{ oldName: string; newName: string } | null>(null);

  const selectedB2bCenter = useMemo(() => {
    const rawRole = (
      (typeof window !== "undefined" ? getStoredUser()?.role : "") ||
      currentUserRole ||
      ""
    ).toUpperCase().trim();
    if (rawRole === "COLLECTION_CENTER" || rawRole === "COLLECTION_CENTRE" || rawRole === "RECEPTIONIST" || rawRole === "B2B") {
      return null;
    }
    if (isB2B || isCollectionCenter || isReceptionist) return null;
    if (!collectedAtSelect || collectedAtSelect === "Main Lab") return null;
    const selNorm = collectedAtSelect.trim().toLowerCase();
    return (
      collectionCentersList.find((c: any) => {
        const isB2B = (c.role && String(c.role).toUpperCase() === "B2B") || c.is_b2b;
        if (!isB2B) return false;
        const cName = (c.name || "").trim().toLowerCase();
        const cLab = (c.lab_name || "").trim().toLowerCase();
        return (
          (cName && (cName === selNorm || selNorm.includes(cName) || cName.includes(selNorm))) ||
          (cLab && (cLab === selNorm || selNorm.includes(cLab) || cLab.includes(selNorm)))
        );
      }) || null
    );
  }, [collectedAtSelect, collectionCentersList, isB2B, isCollectionCenter, isReceptionist, currentUserRole]);

  const [phlebotomists, setPhlebotomists] = useState<string[]>(defaultPhlebotomists);
  const [collectedBySelect, setCollectedBySelect] = useState("Self / Lab Staff");
  const [isPhleboModalOpen, setIsPhleboModalOpen] = useState(false);
  const [newPhleboInput, setNewPhleboInput] = useState("");
  const [editingPhlebo, setEditingPhlebo] = useState<{ oldName: string; newName: string } | null>(null);

  // Identification & Corporate
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [insuranceNo, setInsuranceNo] = useState("");
  const [tpa, setTpa] = useState("");
  const [hfrId, setHfrId] = useState("");
  const [uhid, setUhid] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  // Government ABHA Identity
  const [abhaNumber, setAbhaNumber] = useState("");
  const [abhaAddress, setAbhaAddress] = useState("");
  const [isAbhaVerified, setIsAbhaVerified] = useState(false);
  const [abhaProfilePhoto, setAbhaProfilePhoto] = useState<string | null>(null);
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);



  // ABHA QR Poster Modal State
  const [isAbhaQrModalOpen, setIsAbhaQrModalOpen] = useState(false);

  const [corporateName, setCorporateName] = useState("");
  const [corporatePlan, setCorporatePlan] = useState("");
  const [govPanel, setGovPanel] = useState("");

  // Physical Metrics & Veterinary
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [breed, setBreed] = useState("");
  const [species, setSpecies] = useState("");

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const [labInfo, setLabInfo] = useState<any>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(() => normalizeBillSettings({}));
  const registerPrintRef = useRef<HTMLDivElement>(null);

  // Collection Center Specific Fields & PayU Gate
  const [sampleBarcode, setSampleBarcode] = useState("");
  const [collectionDateTime, setCollectionDateTime] = useState("");
  const [isApprovingPayment, setIsApprovingPayment] = useState(false);
  const [isPayUModalOpen, setIsPayUModalOpen] = useState(false);
  const [payULoading, setPayULoading] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<"CASH" | "UPI" | "ONLINE" | "CARD" | "UNPAID">("UNPAID");
  const [isUpdatingPaymentMode, setIsUpdatingPaymentMode] = useState(false);
  const [updatingPaymentModeTarget, setUpdatingPaymentModeTarget] = useState<"CASH" | "UPI" | "ONLINE" | "CARD" | "UNPAID" | null>(null);
  const [paymentUpdateMessage, setPaymentUpdateMessage] = useState<string | null>(null);

  // Packages & Catalog Mode
  const [catalogMode, setCatalogMode] = useState<"TESTS" | "PACKAGES" | "OUTSOURCE">("TESTS");
  const [availablePackages, setAvailablePackages] = useState<LabPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<LabPackage | null>(null);

  // Outsource Investigations State
  const [outsourcePartnerLabsList, setOutsourcePartnerLabsList] = useState<OutsourcePartnerLab[]>(() => getCachedPartnerLabs());
  const [selectedOutsourceTests, setSelectedOutsourceTests] = useState<
    Array<{ id?: string; name: string; code?: string; price: number; category?: string }>
  >([]);
  const [outsourcePartnerLab, setOutsourcePartnerLab] = useState<string>(() => {
    const cached = getCachedPartnerLabs();
    return cached.length > 0 ? cached[0].name : "Dr. Lal PathLabs";
  });
  const [outsourcePartnerLabCustom, setOutsourcePartnerLabCustom] = useState<string>("");
  const [outsourceNotes, setOutsourceNotes] = useState<string>("");
  const [customOutsourceName, setCustomOutsourceName] = useState<string>("");
  const [customOutsourcePrice, setCustomOutsourcePrice] = useState<string>("");
  const [isAddingCustomOutsource, setIsAddingCustomOutsource] = useState<boolean>(false);

  // Booking & Test Selection State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const testSearchInputRef = useRef<HTMLInputElement>(null);

  // Automatically focus on test search bar whenever test catalog modal is opened
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        try {
          testSearchInputRef.current?.focus();
          testSearchInputRef.current?.select();
        } catch (_) {}
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, catalogMode]);

  const [newPatient, setNewPatient] = useState<Patient | null>(null);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    patientCustomId: string;
    billCustomId: string;
    reportId: string;
    billId: string;
    total: number;
    discount: number;
    paidAmount: number;
    balanceDue: number;
    paymentStatus?: string;
    paymentMode?: string;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    patientPhone?: string;
    patientAddress?: string;
    refDoctor?: string;
    collectedAt?: string;
    packageName?: string | null;
    tests?: Array<{ id: string; name: string; category?: string; price: number; sampleType?: string; code?: string }>;
    vialBarcodes?: Record<string, string>;
  } | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadInvoicePdf = async () => {
    if (!successDetails?.billId || !registerPrintRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const pName = (successDetails?.patientName || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const invNo = (successDetails?.billCustomId || "Receipt").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Invoice_${invNo}_${pName}.pdf`;

      await downloadNativePdf({
        printContainer: registerPrintRef.current,
        filename,
      });
      toastSuccess("Downloaded!", "Tax invoice vector PDF downloaded successfully.");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toastError("Download Failed", err?.message || "Could not generate vector PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsAppInvoice = async () => {
    if (!successDetails?.billId) return;
    const targetPhone = successDetails.patientPhone || phone || newPatient?.phone || "";
    const digitsOnly = targetPhone.replace(/[^0-9]/g, "");
    if (!digitsOnly || digitsOnly.length < 10) {
      toastError("Invalid Phone", "Patient does not have a valid 10-digit mobile number for WhatsApp delivery.");
      return;
    }
    if (!registerPrintRef.current) {
      toastError("Not Ready", "Invoice preview is still rendering. Please wait a moment.");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const pName = (successDetails?.patientName || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const invNo = (successDetails?.billCustomId || "Receipt").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Invoice_${invNo}_${pName}.pdf`;

      const pdfBase64 = await getNativePdfBase64({
        printContainer: registerPrintRef.current,
        filename,
      });

      const res = await fetchFromLaravel(`/bills/${successDetails.billId}/send-whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          phone: digitsOnly,
        }),
      });

      if (res?.status === "success" || res?.success) {
        toastSuccess("Sent on WhatsApp!", "Tax invoice PDF sent to patient's WhatsApp successfully.");
      } else {
        toastError("WhatsApp Dispatch Failed", res?.message || "Could not deliver WhatsApp message via Meta Cloud API.");
      }
    } catch (err: any) {
      console.error("WhatsApp invoice dispatch error:", err);
      toastError("WhatsApp Error", err?.message || "An unexpected error occurred while delivering invoice via WhatsApp.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Automatically scroll to the top of the page / DashboardScroller container
  const scrollToTop = (smooth = true) => {
    if (typeof window === "undefined") return;
    try {
      window.dispatchEvent(
        new CustomEvent("dashboard-scroll-top", { detail: { immediate: !smooth } })
      );
      const mainEl = document.getElementById("main-content") || document.querySelector("main");
      if (mainEl) {
        if (smooth) {
          mainEl.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        } else {
          mainEl.scrollTop = 0;
        }
      }
      if (smooth) {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, left: 0 });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (bookingSuccess) {
      scrollToTop(false);
      const t1 = setTimeout(() => scrollToTop(false), 50);
      const t2 = setTimeout(() => scrollToTop(true), 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [bookingSuccess]);

  const handleAbhaVerified = async (verified: AbhaVerifiedPatient) => {
    // 1. Populate all local registration form fields
    const nameParts = (verified.name || "").trim().split(" ");
    let fName = "";
    let lName = "";
    if (nameParts.length > 1) {
      fName = nameParts[0];
      lName = nameParts.slice(1).join(" ");
    } else {
      fName = verified.name || "";
      lName = "";
    }
    setFirstName(fName);
    setLastName(lName);

    let des = normalizeDesignation(designation);
    if (verified.designation) {
      des = normalizeDesignation(verified.designation);
      setDesignation(des);
    }

    const gen = verified.gender || gender || "Male";
    if (verified.gender) {
      setGender(verified.gender);
    }

    let ageNum = 0;
    if (verified.age) {
      ageNum = Number(verified.age);
      setAgeYears(String(verified.age));
      setAgeMonths("");
      setAgeDays("");
    }

    const ph = (verified.phone || phone || "N/A").trim();
    if (verified.phone) {
      setPhone(verified.phone);
    }

    if (verified.email) {
      setEmail(verified.email);
    }

    if (verified.address) {
      setAddress(verified.address);
    }

    if (verified.pincode) {
      setPincode(verified.pincode);
    }

    if (verified.city) {
      setCity(verified.city);
    }

    if (verified.district) {
      setDistrict(verified.district);
    }

    if (verified.state) {
      setState(verified.state);
    }

    if (verified.aadhaar_no) {
      setAadhaarNo(verified.aadhaar_no);
    }

    setAbhaNumber(verified.abha_number || "");
    setAbhaAddress(verified.abha_address || "");
    setIsAbhaVerified(true);
    setAbhaProfilePhoto(verified.abha_profile_photo || null);

    // 2. Background Database Write - Save patient immediately so they are searchable in top search bar
    try {
      const patientPayload = {
        name: verified.name || `${fName} ${lName}`.trim() || "Patient",
        designation: des || "Mr.",
        gender: gen,
        age: ageNum,
        phone: ph,
        email: verified.email || email || null,
        address: verified.address || address || "N/A",
        city: verified.city || city || null,
        district: verified.district || district || null,
        state: verified.state || state || null,
        pincode: verified.pincode || pincode || null,
        aadhaar_no: verified.aadhaar_no || aadhaarNo || null,
        aadhaarNo: verified.aadhaar_no || aadhaarNo || null,
        abha_number: verified.abha_number || null,
        abhaNumber: verified.abha_number || null,
        abha_address: verified.abha_address || null,
        abhaAddress: verified.abha_address || null,
        is_abha_verified: true,
        isAbhaVerified: true,
        abha_profile_photo: verified.abha_profile_photo || null,
        abhaProfilePhoto: verified.abha_profile_photo || null,
        abha_txn_id: verified.txn_id || null,
        ref_doctor: refDoctorSelect || "Self",
        refDoctor: refDoctorSelect || "Self",
        collected_at: selectedB2bCenter
          ? (selectedB2bCenter.name || collectedAtSelect)
          : (isB2B
            ? (getStoredUser()?.name || collectedAtSelect)
            : (isCollectionCenter
              ? (getStoredUser()?.lab_name || getStoredUser()?.labName || getStoredUser()?.name || collectedAtSelect)
              : `${collectedAtSelect || "Main Lab"} (${collectedBySelect || "Self / Lab Staff"})`)),
        collectedAt: selectedB2bCenter
          ? (selectedB2bCenter.name || collectedAtSelect)
          : (isB2B
            ? (getStoredUser()?.name || collectedAtSelect)
            : (isCollectionCenter
              ? (getStoredUser()?.lab_name || getStoredUser()?.labName || getStoredUser()?.name || collectedAtSelect)
              : `${collectedAtSelect || "Main Lab"} (${collectedBySelect || "Self / Lab Staff"})`)),
        collected_by: collectedBySelect || null,
        collectedBy: collectedBySelect || null,
        b2b_user_id: (!isCollectionCenter && !isReceptionist && selectedB2bCenter) ? selectedB2bCenter.id : undefined,
        b2bUserId: (!isCollectionCenter && !isReceptionist && selectedB2bCenter) ? selectedB2bCenter.id : undefined,
        collection_center_id: isCollectionCenter && getStoredUser() ? getStoredUser().id : undefined,
        collectionCenterId: isCollectionCenter && getStoredUser() ? getStoredUser().id : undefined,
        meta: {
          ...((!isCollectionCenter && !isReceptionist && selectedB2bCenter) ? {
            b2b_user_id: selectedB2bCenter.id,
            b2bUserId: selectedB2bCenter.id,
            b2b_name: selectedB2bCenter.name,
            b2bName: selectedB2bCenter.name,
            created_by_id: selectedB2bCenter.id,
            createdById: selectedB2bCenter.id,
            created_by_name: selectedB2bCenter.name,
            createdByName: selectedB2bCenter.name,
            created_by_role: "B2B",
            createdByRole: "B2B",
          } : {}),
          ...(isCollectionCenter && getStoredUser() ? {
            collection_center_id: getStoredUser().id,
            collectionCenterId: getStoredUser().id,
            collection_center_name: getStoredUser().lab_name || getStoredUser().labName || getStoredUser().name,
            center_code: getStoredUser().center_code || getStoredUser().centerCode || "",
            centerCode: getStoredUser().center_code || getStoredUser().centerCode || "",
            created_by_id: getStoredUser().id,
            createdById: getStoredUser().id,
            created_by_name: getStoredUser().name,
            createdByName: getStoredUser().name,
            created_by_role: "COLLECTION_CENTER",
            createdByRole: "COLLECTION_CENTER",
          } : {}),
          ...(isReceptionist && getStoredUser() ? {
            created_by_id: getStoredUser().id,
            createdById: getStoredUser().id,
            created_by_name: getStoredUser().name,
            createdByName: getStoredUser().name,
            created_by_role: "RECEPTIONIST",
            createdByRole: "RECEPTIONIST",
          } : {}),
        },
      };

      let savedPatient: any = null;
      if (editPatientId) {
        savedPatient = await fetchFromLaravel(`/patients/${editPatientId}`, {
          method: "PUT",
          body: JSON.stringify(patientPayload),
        });
      } else {
        // Check if patient already exists by ABHA number or address
        const searchTerm = verified.abha_number || verified.abha_address;
        let existingId: string | null = null;
        if (searchTerm) {
          try {
            const checkRes = await fetchFromLaravel(`/patients?search=${encodeURIComponent(searchTerm)}`);
            const foundList = Array.isArray(checkRes) ? checkRes : (checkRes?.data || []);
            const matched = foundList.find((p: any) =>
              (p.abha_number && p.abha_number === verified.abha_number) ||
              (p.abha_address && p.abha_address === verified.abha_address)
            );
            if (matched) {
              existingId = matched.id;
            }
          } catch (e) { }
        }

        if (existingId) {
          savedPatient = await fetchFromLaravel(`/patients/${existingId}`, {
            method: "PUT",
            body: JSON.stringify(patientPayload),
          });
        } else {
          savedPatient = await fetchFromLaravel("/patients", {
            method: "POST",
            body: JSON.stringify(patientPayload),
          });
        }
      }

      if (savedPatient && (savedPatient.id || savedPatient.customId || savedPatient.custom_id)) {
        const pId = savedPatient.id || editPatientId;
        if (pId) {
          setEditPatientId(pId);
          setIsEditMode(true);
          window.history.replaceState(null, "", `/dashboard/patients/register?edit=${pId}`);
        }
        setNewPatient(savedPatient);
        window.dispatchEvent(new CustomEvent("patient-created", { detail: savedPatient }));
      }
    } catch (err) {
      console.error("Background ABHA patient save error:", err);
    }
  };

  const isFieldEnabled = (key: string) => {
    // Core demographic & referral fields must NEVER disappear from the patient intake form
    if (key === "phone" || key === "address" || key === "name" || key === "ageGender" || key === "refDoctor") {
      return true;
    }
    const f = intakeFields.find(item => item.key === key);
    return f ? Boolean(f.enabled) : false;
  };

  const isFieldRequired = (key: string) => {
    const f = intakeFields.find(item => item.key === key);
    return f ? Boolean(f.enabled && f.required) : false;
  };

  const handleToggleTempIntakeField = (key: string, property: "enabled" | "required" | "showOnReport") => {
    const isCore = key === "phone" || key === "address" || key === "name" || key === "ageGender" || key === "refDoctor";
    if (property === "enabled" && isCore) {
      return; // Core demographic fields cannot be hidden from the intake form
    }
    setTempIntakeFields(prev => {
      return prev.map(item => {
        if (item.key !== key) return item;
        const newVal = !item[property];
        const nextItem = { ...item, [property]: newVal };
        if (property === "enabled" && !newVal) {
          nextItem.required = false;
        }
        return nextItem;
      });
    });
  };

  const handleSaveIntakeRulesModal = async () => {
    try {
      setSavingIntakeRules(true);
      const safeFields = tempIntakeFields.map(f => {
        const isCore = f.key === "phone" || f.key === "address" || f.key === "name" || f.key === "ageGender" || f.key === "refDoctor";
        return isCore ? { ...f, enabled: true } : f;
      });
      setIntakeFields(safeFields);
      setTempIntakeFields(safeFields);
      localStorage.setItem("lis_intake_fields", JSON.stringify(safeFields));

      if (labInfo) {
        const currentReportSettings = labInfo.report_settings || labInfo.reportSettings || {};
        const updatedReportSettings = {
          ...currentReportSettings,
          intakeFields: safeFields,
        };
        await fetchFromLaravel("/lab", {
          method: "PUT",
          body: JSON.stringify({
            report_settings: updatedReportSettings,
          }),
        });
        try {
          const cached = localStorage.getItem("lis_cached_report_settings");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === "object") {
              parsed.intakeFields = safeFields;
              localStorage.setItem("lis_cached_report_settings", JSON.stringify(parsed));
            }
          }
          window.dispatchEvent(new Event("lis_settings_updated"));
        } catch { }
      }
      setIsSettingsOpen(false);
    } catch (e) {
      console.error("Error saving intake rules:", e);
      setIsSettingsOpen(false);
    } finally {
      setSavingIntakeRules(false);
    }
  };

  useEffect(() => {
    // Populate collection date time once mounted on client in user's local timezone
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setCollectionDateTime(now.toISOString().slice(0, 16));

    try {
      const cachedBill = localStorage.getItem("lis_cached_bill_settings");
      if (cachedBill) setBillSettings(normalizeBillSettings(JSON.parse(cachedBill)));
    } catch { }

    const storedUser = getStoredUser();
    if (storedUser) {
      setCurrentUserRole(storedUser.role || "STAFF");
      setCurrentUserPermissions(Array.isArray(storedUser.permissions) ? storedUser.permissions : []);
      if (storedUser.role === "COLLECTION_CENTER" || storedUser.role === "B2B") {
        const centerName = storedUser.lab_name || storedUser.labName || storedUser.name || (storedUser.role === "B2B" ? "B2B Partner" : "Collection Center");
        setCollectedAtSelect(centerName);
        setCollectedBySelect(storedUser.name || centerName);
      }
    }

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
            updateStoredUser(data.user);
            setCurrentUserRole(data.user.role || "STAFF");
            setCurrentUserPermissions(Array.isArray(data.user.permissions) ? data.user.permissions : []);
          }
        })
        .catch(() => { });
    }

    const savedIntake = localStorage.getItem("lis_intake_fields");
    if (savedIntake) {
      try {
        const parsed = JSON.parse(savedIntake);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with DEFAULT_INTAKE_FIELDS to guarantee completeness and preserve defaults
          const sanitized = DEFAULT_INTAKE_FIELDS.map(def => {
            const found = parsed.find((item: any) => item.key === def.key || item.orderingName === def.orderingName);
            if (!found) return { ...def };
            const isCore = def.key === "phone" || def.key === "address" || def.key === "name" || def.key === "ageGender" || def.key === "refDoctor";
            return {
              ...def,
              enabled: isCore ? true : (found.enabled !== undefined ? !!found.enabled : def.enabled),
              required: found.required !== undefined ? !!found.required : def.required,
              showOnReport: found.showOnReport !== undefined ? !!found.showOnReport : def.showOnReport,
            };
          });
          setIntakeFields(sanitized);
          setTempIntakeFields(sanitized);
        }
      } catch (e) { }
    } else {
      try {
        const cachedReport = localStorage.getItem("lis_cached_report_settings");
        if (cachedReport) {
          const parsed = JSON.parse(cachedReport);
          if (Array.isArray(parsed?.intakeFields)) {
            const sanitized = DEFAULT_INTAKE_FIELDS.map(def => {
              const found = parsed.intakeFields.find((item: any) => item.key === def.key || item.orderingName === def.orderingName);
              if (!found) return { ...def };
              const isCore = def.key === "phone" || def.key === "address" || def.key === "name" || def.key === "ageGender" || def.key === "refDoctor";
              return {
                ...def,
                enabled: isCore ? true : (found.enabled !== undefined ? !!found.enabled : def.enabled),
                required: found.required !== undefined ? !!found.required : def.required,
                showOnReport: found.showOnReport !== undefined ? !!found.showOnReport : def.showOnReport,
              };
            });
            setIntakeFields(sanitized);
            setTempIntakeFields(sanitized);
          }
        }
      } catch { }
    }

    const savedDocs = localStorage.getItem("lis_referral_doctors");
    if (savedDocs) {
      try { setDoctorsList(JSON.parse(savedDocs)); } catch (e) { }
    }

    const savedPoints = localStorage.getItem("lis_collection_points");
    if (savedPoints) {
      try { setCollectionPoints(JSON.parse(savedPoints)); } catch (e) { }
    }

    const savedPhlebo = localStorage.getItem("lis_phlebotomists");
    if (savedPhlebo) {
      try { setPhlebotomists(JSON.parse(savedPhlebo)); } catch (e) { }
    }

    // Instant test list from cache for 0ms registration latency
    try {
      const cached = localStorage.getItem("lis_cached_tests");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableTests(parsed);
        }
      }
    } catch { }

    (async () => {
      // Parallelize all catalog and setup fetches for instantaneous page readiness
      const [testsResult, docsResult, labResult, ccResult, outsourceResult] = await Promise.allSettled([
        fetchFromLaravel("/tests?compact=1", { skipCache: true }),
        fetchFromLaravel("/doctors?filter=all&include_inactive=1"),
        fetchFromLaravel("/lab"),
        fetchFromLaravel("/collection-centers"),
        fetchFromLaravel("/outsource/partner-labs"),
      ]);

      if (testsResult.status === "fulfilled" && testsResult.value) {
        const data = testsResult.value;
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (list.length > 0) {
          setAvailableTests(list);
          try { localStorage.setItem("lis_cached_tests", JSON.stringify(list)); } catch { }
        }
      }

      if (docsResult.status === "fulfilled" && docsResult.value) {
        const docRes = docsResult.value;
        if (docRes && docRes.doctors && Array.isArray(docRes.doctors)) {
          const apiDocs = docRes.doctors.map((d: any) => d.name).filter(Boolean);
          const combined = Array.from(new Set(["Self", ...apiDocs]));
          setDoctorsList(combined);
          localStorage.setItem("lis_referral_doctors", JSON.stringify(combined));
        }
      }

      let activeLabName = "";
      if (labResult.status === "fulfilled" && labResult.value) {
        const lab = labResult.value;
        setLabInfo(lab);
        activeLabName = (lab.name || "").trim();
        const rawSettings = lab?.report_settings || lab?.reportSettings;
        if (rawSettings) {
          const normalized = normalizeReportSettings(rawSettings);
          if (normalized.intakeFields && normalized.intakeFields.length > 0) {
            setIntakeFields(normalized.intakeFields);
            setTempIntakeFields(normalized.intakeFields);
            try {
              localStorage.setItem("lis_intake_fields", JSON.stringify(normalized.intakeFields));
            } catch { }
          }
          if (normalized.defaultDesignation && normalized.defaultDesignation.toLowerCase() !== "blank" && normalized.defaultDesignation.toLowerCase() !== "null" && normalized.defaultDesignation.toLowerCase() !== "none") {
            setDesignation(normalizeDesignation(normalized.defaultDesignation));
          } else {
            setDesignation("");
          }
        }
        const rawBillSettings = lab?.bill_settings || lab?.billSettings;
        if (rawBillSettings) {
          const normalizedBill = normalizeBillSettings(rawBillSettings);
          setBillSettings(normalizedBill);
          try {
            localStorage.setItem("lis_cached_bill_settings", JSON.stringify(normalizedBill));
          } catch { }
        }
      }

      // Fetch Collection Centers & B2B Partner Labs added by user
      if (ccResult.status === "fulfilled" && ccResult.value) {
        const ccRes = ccResult.value;
        const ccList = Array.isArray(ccRes) ? ccRes : (ccRes?.data || []);
        setCollectionCentersList(ccList);
        const fetchedCenters: string[] = ccList
          .map((c: any) => (c?.name || "").trim())
          .filter((n: string) => Boolean(n) && n.toLowerCase() !== "main lab");

        const targetLabName = activeLabName || storedUser?.lab_name || storedUser?.lab?.name || "";
        let autoCcName = "";
        if (targetLabName && targetLabName.toLowerCase() !== "main lab") {
          autoCcName = /\bcc\b/i.test(targetLabName) ? targetLabName : `${targetLabName} CC`;
        }

        let localPoints: string[] = [];
        const savedPointsRaw = localStorage.getItem("lis_collection_points");
        if (savedPointsRaw) {
          try { localPoints = JSON.parse(savedPointsRaw); } catch { }
        }

        const mergedPoints = Array.from(
          new Set([
            "Main Lab",
            autoCcName,
            ...fetchedCenters,
            ...defaultCollectionPoints,
            ...localPoints,
          ].filter(Boolean))
        );

        setCollectionPoints(mergedPoints);
      }

      try {
        setAvailablePackages(getStoredPackages());
      } catch (e) { }

      // Outsource Partner Labs configured by user
      if (outsourceResult.status === "fulfilled" && outsourceResult.value) {
        const opRes = outsourceResult.value;
        const labsData = Array.isArray(opRes) ? opRes : (opRes?.data || []);
        if (Array.isArray(labsData) && labsData.length > 0) {
          setOutsourcePartnerLabsList(labsData);
          setCachedPartnerLabs(labsData);
        }
      }
    })();
  }, []);

  useEffect(() => {
    const refreshPartnerLabs = async () => {
      const cached = getCachedPartnerLabs();
      if (Array.isArray(cached) && cached.length > 0) {
        setOutsourcePartnerLabsList(cached);
      }
      try {
        const opRes = await fetchFromLaravel("/outsource/partner-labs");
        const labsData = Array.isArray(opRes) ? opRes : (opRes?.data || []);
        if (Array.isArray(labsData) && labsData.length > 0) {
          setOutsourcePartnerLabsList(labsData);
          setCachedPartnerLabs(labsData);
        }
      } catch (e) { }
    };

    const handlePartnerLabsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setOutsourcePartnerLabsList(e.detail);
      } else {
        setOutsourcePartnerLabsList(getCachedPartnerLabs());
      }
    };

    window.addEventListener("outsource_partner_labs_updated", handlePartnerLabsUpdated);
    window.addEventListener("storage", refreshPartnerLabs);
    window.addEventListener("focus", refreshPartnerLabs);

    return () => {
      window.removeEventListener("outsource_partner_labs_updated", handlePartnerLabsUpdated);
      window.removeEventListener("storage", refreshPartnerLabs);
      window.removeEventListener("focus", refreshPartnerLabs);
    };
  }, []);

  // Real-time catalog sync: instantly reload tests whenever test catalog is edited or saved
  useEffect(() => {
    const handleCacheInvalidated = (e: any) => {
      const prefix = e?.detail?.prefix;
      if (!prefix || prefix.includes("test")) {
        fetchFromLaravel("/tests?compact=1", { skipCache: true })
          .then((data) => {
            const list = Array.isArray(data) ? data : (data?.data || []);
            if (list.length > 0) {
              setAvailableTests(list);
              try { localStorage.setItem("lis_cached_tests", JSON.stringify(list)); } catch {}
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("lis_cache_invalidated", handleCacheInvalidated);
    return () => {
      window.removeEventListener("lis_cache_invalidated", handleCacheInvalidated);
    };
  }, []);

  // When switching to OUTSOURCE tab, instantly fetch latest rates
  useEffect(() => {
    if (catalogMode === "OUTSOURCE") {
      fetchFromLaravel("/outsource/partner-labs")
        .then((opRes) => {
          const labsData = Array.isArray(opRes) ? opRes : (opRes?.data || []);
          if (Array.isArray(labsData) && labsData.length > 0) {
            setOutsourcePartnerLabsList(labsData);
            setCachedPartnerLabs(labsData);
          }
        })
        .catch(() => {});
    }
  }, [catalogMode]);

  const applyPatientDemographics = (patientData: any) => {
    if (!patientData) return;
    // Parse Name
    const rawName = (patientData.name || "").trim();
    const parts = rawName.split(/\s+/);
    let des = "";
    if (patientData.designation) {
      const norm = normalizeDesignation(patientData.designation);
      if (norm.toLowerCase() !== "blank" && norm.toLowerCase() !== "null" && norm.toLowerCase() !== "none") {
        des = norm;
      }
    }
    let fn = "";
    let ln = "";

    const isDesignationInName = ALL_DESIGNATIONS.filter(d => d !== "Blank" && d !== "Null").some(
      (d) =>
        d.toLowerCase() === parts[0].toLowerCase() ||
        d.replace(/\./g, "").toLowerCase() === parts[0].replace(/\./g, "").toLowerCase()
    );

    if (isDesignationInName) {
      des = normalizeDesignation(parts[0]);
      fn = parts[1] || "";
      ln = parts.slice(2).join(" ");
    } else {
      fn = parts[0] || "";
      ln = parts.slice(1).join(" ");
    }

    setDesignation(des);
    setFirstName(fn);
    setLastName(ln);

    setAgeYears((patientData.age || 0).toString());
    setAgeMonths("0");
    setAgeDays("0");
    setGender(patientData.gender || "Male");
    setPhone(patientData.phone && patientData.phone !== "N/A" ? patientData.phone.replace(/\D/g, "").slice(-10) : "");
    setEmail(patientData.email || "");
    setAddress(patientData.address && patientData.address !== "N/A" ? patientData.address : "");
    setPincode(patientData.pincode || "");
    setCity(patientData.city || "");
    setDistrict(patientData.district || "");
    setState(patientData.state || "");

    const doc = patientData.ref_doctor || patientData.refDoctor || "Self";
    setRefDoctorSelect(doc);
    setSecondReferral(patientData.second_referral || patientData.secondReferral || "");

    const coll = patientData.collected_at || patientData.collectedAt || "Main Lab (Self / Lab Staff)";
    const match = coll.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    const point = match && match[1] ? match[1].trim() : "Main Lab";
    const phlebo = match && match[2] ? match[2].trim() : "Self / Lab Staff";
    setCollectedAtSelect(point);
    setCollectedBySelect(phlebo);

    // Identification & Corporate
    setAadhaarNo(patientData.aadhaar_no || patientData.aadhaarNo || "");
    setInsuranceNo(patientData.insurance_no || patientData.insuranceNo || "");
    setTpa(patientData.tpa || "");
    setHfrId(patientData.hfr_id || patientData.hfrId || "");
    setUhid(patientData.uhid || "");
    setPassportNumber(patientData.passport_number || patientData.passportNumber || "");
    setAbhaNumber(patientData.abha_number || patientData.abhaNumber || "");
    setAbhaAddress(patientData.abha_address || patientData.abhaAddress || "");
    setIsAbhaVerified(Boolean(patientData.is_abha_verified || patientData.isAbhaVerified));
    setAbhaProfilePhoto(patientData.abha_profile_photo || patientData.abhaProfilePhoto || null);
    setCorporateName(patientData.corporate_name || patientData.corporateName || "");
    setCorporatePlan(patientData.corporate_plan || patientData.corporatePlan || "");
    setGovPanel(patientData.gov_panel || patientData.govPanel || "");

    // Physical metrics
    setHeight(patientData.height || "");
    setWeight(patientData.weight || "");
    setOwnerName(patientData.owner_name || patientData.ownerName || "");
    setBreed(patientData.breed || "");
    setSpecies(patientData.species || "");

    let patMeta = patientData.meta;
    if (typeof patMeta === "string") {
      try { patMeta = JSON.parse(patMeta); } catch { patMeta = {}; }
    }
    if (!patMeta || typeof patMeta !== "object") {
      patMeta = {};
    }

    let loadedBarcodes: Record<string, string> = {};
    if (patMeta?.vial_barcodes) {
      if (typeof patMeta.vial_barcodes === "string") {
        try { loadedBarcodes = JSON.parse(patMeta.vial_barcodes); } catch { }
      } else if (typeof patMeta.vial_barcodes === "object") {
        loadedBarcodes = { ...patMeta.vial_barcodes };
      }
    }

    const rawBarcode = patientData.vial_barcode || patientData.vialBarcode || patMeta?.vial_barcode || "";
    setSampleBarcode(rawBarcode);

    if (Object.keys(loadedBarcodes).length > 0) {
      setVialBarcodes(loadedBarcodes);
    } else if (rawBarcode) {
      const parts = rawBarcode.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        parts.forEach((code: string, idx: number) => {
          const upper = code.toUpperCase();
          if (upper.includes("EDTA")) loadedBarcodes["EDTA"] = code;
          else if (upper.includes("SST") || upper.includes("SERUM") || upper.includes("PLAIN")) loadedBarcodes["SST"] = code;
          else if (upper.includes("FLUORIDE") || upper.includes("GLUCOSE")) loadedBarcodes["FLUORIDE"] = code;
          else if (upper.includes("CITRATE") || upper.includes("COAG")) loadedBarcodes["CITRATE"] = code;
          else if (upper.includes("URINE")) loadedBarcodes["URINE"] = code;
          else if (upper.includes("STOOL")) loadedBarcodes["STOOL"] = code;
          else {
            loadedBarcodes[`VIAL_${idx + 1}`] = code;
          }
        });
        setVialBarcodes(loadedBarcodes);
      }
    }

    const patObj: Patient = {
      id: patientData.id,
      customId: patientData.custom_id || patientData.customId || "",
      name: patientData.name,
      age: patientData.age || 0,
      gender: patientData.gender || "Male",
      phone: patientData.phone || "",
      refDoctor: doc,
      address: patientData.address || "",
      collectedAt: coll,
      vial_barcode: rawBarcode,
      vialBarcode: rawBarcode,
      meta: {
        ...patMeta,
        vial_barcode: rawBarcode,
        vial_barcodes: loadedBarcodes,
      },
    };
    setNewPatient(patObj);
  };

  useEffect(() => {
    if (!editId) {
      setIsEditLoading(false);
      return;
    }
    setIsEditMode(true);
    setEditPatientId(editId);
    setIsEditLoading(true);

    // 1. Instant cache retrieval from sessionStorage for 0ms initial render
    try {
      const cachedStr = sessionStorage.getItem(`edit_patient_cache_${editId}`);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && (cached.id === editId || cached.custom_id === editId || cached.customId === editId)) {
          applyPatientDemographics(cached);
          setHasPreloadedPreview(true);
        }
      }
    } catch (_) { }

    // 2. Fetch authoritative data from API
    (async () => {
      try {
        const patientData = await fetchFromLaravel(`/patients/${editId}`, { skipCache: true });
        if (patientData) {
          applyPatientDemographics(patientData);

          // Fast parallel loading of associated reports and bills
          let patReport = (patientData.reports && Array.isArray(patientData.reports) && patientData.reports.length > 0)
            ? patientData.reports[0]
            : null;

          let patBill = patReport?.bill || (patientData.bills && Array.isArray(patientData.bills) && patientData.bills.length > 0 ? patientData.bills[0] : null);

          // Only perform parallel network fallback if report or bill is missing
          if (!patReport || !patReport.results || patReport.results.length === 0 || !patBill) {
            try {
              const [reportsRes, billsRes] = await Promise.all([
                (!patReport || !patReport.results || patReport.results.length === 0)
                  ? fetchFromLaravel(`/reports?patient_id=${editId}`).catch(() => null)
                  : Promise.resolve(null),
                !patBill
                  ? fetchFromLaravel(`/bills?search=${patientData.custom_id || patientData.customId || editId}`).catch(() => null)
                  : Promise.resolve(null),
              ]);

              if (!patReport && reportsRes) {
                const allReports = Array.isArray(reportsRes) ? reportsRes : (reportsRes?.data || []);
                patReport = allReports.find((r: any) => (r.patient_id === editId || r.patientId === editId)) || allReports[0] || null;
              }
              if (!patBill && billsRes) {
                const allBills = Array.isArray(billsRes) ? billsRes : (billsRes?.data || []);
                patBill = allBills.find((b: any) => (b.patient_id === editId || b.patientId === editId)) || allBills[0] || null;
              }
            } catch (_) { }
          }

          if (patReport) {
            setExistingReport(patReport);
            if (patReport.results && Array.isArray(patReport.results)) {
              const testIds: string[] = [];
              patReport.results.forEach((res: any) => {
                let testObj = res.test;
                // Climb up to the top-level parent (main panel like CBC) so child parameters aren't booked as separate tests
                while (testObj) {
                  const parentId = testObj.parentId || testObj.parent_id || testObj.parent?.id;
                  if (!parentId) break;
                  const parentObj = testObj.parent;
                  if (!parentObj) {
                    testObj = { id: parentId };
                    break;
                  }
                  testObj = parentObj;
                }
                const mainId = testObj?.id || res.test?.parent_id || res.test?.parentId || res.test_id || res.testId;
                if (mainId && !testIds.includes(mainId)) {
                  testIds.push(mainId);
                }
              });
              if (testIds.length > 0) {
                setSelectedTests(Array.from(new Set(testIds)));
              }
            }

            const pkgName = patReport.package_name || patReport.packageName || patReport.meta?.packageName;
            if (pkgName) {
              const pkgs = getStoredPackages();
              const foundPkg = pkgs.find(p => p.name.toLowerCase() === pkgName.toLowerCase() || p.id === pkgName);
              if (foundPkg) {
                setSelectedPackage(foundPkg);
              }
            }
          }

          if (patBill) {
            setExistingBill(patBill);
            setDiscount((patBill.discount || 0).toString());
            setPaidAmount((patBill.paid_amount || patBill.paidAmount || 0).toString());
            setPaymentStatus(patBill.status || "UNPAID");
          }
        }
      } catch (err) {
        console.error("Error loading patient for edit:", err);
      } finally {
        setIsEditLoading(false);
      }
    })();
  }, [editId]);

  // Doctor Helpers
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDoctorInput.trim();
    if (!trimmed) return;
    if (!doctorsList.includes(trimmed)) {
      const updated = [...doctorsList, trimmed];
      setDoctorsList(updated);
      localStorage.setItem("lis_referral_doctors", JSON.stringify(updated));
    }
    setRefDoctorSelect(trimmed);
    const activeStatus = isDoctorActive;
    setNewDoctorInput("");
    setIsDoctorActive(true);

    // Sync to database so doctor immediately appears in Manage Doctors with active status
    try {
      await fetchFromLaravel("/doctors", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, is_active: activeStatus }),
      });
    } catch (err) {
      console.error("Failed to sync new doctor to database:", err);
    }
  };

  const handleSaveEditDoctor = () => {
    if (!editingDoctor || !editingDoctor.newName.trim()) return;
    const updated = doctorsList.map(d => d === editingDoctor.oldName ? editingDoctor.newName.trim() : d);
    setDoctorsList(updated);
    localStorage.setItem("lis_referral_doctors", JSON.stringify(updated));
    if (refDoctorSelect === editingDoctor.oldName) {
      setRefDoctorSelect(editingDoctor.newName.trim());
    }
    setEditingDoctor(null);
  };

  const handleDeleteDoctor = (name: string) => {
    if (name === "Self") return;
    const updated = doctorsList.filter(d => d !== name);
    setDoctorsList(updated);
    localStorage.setItem("lis_referral_doctors", JSON.stringify(updated));
    if (refDoctorSelect === name) setRefDoctorSelect("Self");
  };

  // Collection Point Helpers
  const handleAddCollectionPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCollectionInput.trim();
    if (!trimmed) return;
    if (!collectionPoints.includes(trimmed)) {
      const updated = [...collectionPoints, trimmed];
      setCollectionPoints(updated);
      localStorage.setItem("lis_collection_points", JSON.stringify(updated));
    }
    setCollectedAtSelect(trimmed);
    setNewCollectionInput("");
  };

  const handleSaveEditCollectionPoint = () => {
    if (!editingCollectionPoint || !editingCollectionPoint.newName.trim()) return;
    const updated = collectionPoints.map(c => c === editingCollectionPoint.oldName ? editingCollectionPoint.newName.trim() : c);
    setCollectionPoints(updated);
    localStorage.setItem("lis_collection_points", JSON.stringify(updated));
    if (collectedAtSelect === editingCollectionPoint.oldName) {
      setCollectedAtSelect(editingCollectionPoint.newName.trim());
    }
    setEditingCollectionPoint(null);
  };

  const handleDeleteCollectionPoint = (name: string) => {
    if (name === "Main Lab") return;
    const updated = collectionPoints.filter(c => c !== name);
    setCollectionPoints(updated);
    localStorage.setItem("lis_collection_points", JSON.stringify(updated));
    if (collectedAtSelect === name) setCollectedAtSelect("Main Lab");
  };

  // Phlebotomist Helpers
  const handleAddPhlebo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPhleboInput.trim();
    if (!trimmed) return;
    if (!phlebotomists.includes(trimmed)) {
      const updated = [...phlebotomists, trimmed];
      setPhlebotomists(updated);
      localStorage.setItem("lis_phlebotomists", JSON.stringify(updated));
    }
    setCollectedBySelect(trimmed);
    setNewPhleboInput("");
  };

  const handleSaveEditPhlebo = () => {
    if (!editingPhlebo || !editingPhlebo.newName.trim()) return;
    const updated = phlebotomists.map(p => p === editingPhlebo.oldName ? editingPhlebo.newName.trim() : p);
    setPhlebotomists(updated);
    localStorage.setItem("lis_phlebotomists", JSON.stringify(updated));
    if (collectedBySelect === editingPhlebo.oldName) {
      setCollectedBySelect(editingPhlebo.newName.trim());
    }
    setEditingPhlebo(null);
  };

  const handleDeletePhlebo = (name: string) => {
    if (name === "Self / Lab Staff") return;
    const updated = phlebotomists.filter(p => p !== name);
    setPhlebotomists(updated);
    localStorage.setItem("lis_phlebotomists", JSON.stringify(updated));
    if (collectedBySelect === name) setCollectedBySelect("Self / Lab Staff");
  };

  // Patient Registration Submit
  const handleRegisterPatient = async (e?: React.FormEvent, openModal: boolean = false) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setRegisterError(null);
    setRegistering(true);

    const errors: Record<string, string> = {};
    const missing: string[] = [];

    // 1. First Name (Always mandatory)
    if (!firstName.trim()) {
      errors["firstName"] = "First name is required.";
      missing.push("First Name");
    } else if (firstName.trim().length < 2) {
      errors["firstName"] = "First name must be at least 2 characters.";
      missing.push("First Name (min 2 chars)");
    }

    // 2. Age (Always mandatory for medical reference ranges)
    const hasAge = !!(ageYears.trim() || ageMonths.trim() || ageDays.trim());
    if (!hasAge) {
      errors["age"] = "Patient age is required (Years, Months, or Days).";
      missing.push("Age");
    } else {
      const parsedY = parseInt(ageYears) || 0;
      const parsedM = parseInt(ageMonths) || 0;
      const parsedD = parseInt(ageDays) || 0;
      if (parsedY <= 0 && parsedM <= 0 && parsedD <= 0) {
        errors["age"] = "Age must be greater than zero.";
        missing.push("Valid Age");
      }
    }

    // 3. Gender (Always mandatory for clinical test reference ranges)
    if (!gender || !gender.trim()) {
      errors["gender"] = "Please select gender.";
      missing.push("Gender");
    }

    // 4. Phone Number
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (isFieldRequired("phone") && !cleanPhone) {
      errors["phone"] = "Phone / WhatsApp number is required.";
      missing.push("Phone Number");
    } else if (cleanPhone && cleanPhone.length !== 10) {
      errors["phone"] = "Please enter a valid 10-digit mobile number.";
      missing.push("Valid 10-digit Phone");
    }

    // 5. Referral Doctor
    if (isFieldRequired("refDoctor") && (!refDoctorSelect || !refDoctorSelect.trim())) {
      errors["refDoctor"] = "Please select referral doctor.";
      missing.push("Referred By");
    }

    // 6. Dynamic Intake Fields
    if (isFieldRequired("email") && !email.trim()) {
      errors["email"] = "Email address is required.";
      missing.push("Email Address");
    }
    if (isFieldRequired("address") && !address.trim()) {
      errors["address"] = "Residential address is required.";
      missing.push("Residential Address");
    }
    if (isFieldRequired("pincode") && !pincode.trim()) {
      errors["pincode"] = "Pincode is required.";
      missing.push("Pincode");
    }
    if (isFieldRequired("city") && !city.trim()) {
      errors["city"] = "City / Town is required.";
      missing.push("City / Town");
    }
    if (isFieldRequired("district") && !district.trim()) {
      errors["district"] = "District is required.";
      missing.push("District");
    }
    if (isFieldRequired("secondReferral") && !secondReferral.trim()) {
      errors["secondReferral"] = "Second referral is required.";
      missing.push("Second Referral");
    }
    if (isFieldRequired("collectedAt") && !collectedAtSelect) {
      errors["collectedAt"] = "Collection center is required.";
      missing.push("Collection Center");
    }
    if (isFieldRequired("collectedBy") && !collectedBySelect) {
      errors["collectedBy"] = "Sample collector is required.";
      missing.push("Sample Collected By");
    }
    if (isFieldRequired("aadhaarNo") && !aadhaarNo.trim()) {
      errors["aadhaarNo"] = "Aadhaar number is required.";
      missing.push("Aadhaar No.");
    }
    if (isFieldRequired("insuranceNo") && !insuranceNo.trim()) {
      errors["insuranceNo"] = "Insurance policy number is required.";
      missing.push("Insurance Policy No.");
    }
    if (isFieldRequired("tpa") && !tpa.trim()) {
      errors["tpa"] = "TPA / Insurance desk is required.";
      missing.push("TPA / Insurance Desk");
    }
    if (isFieldRequired("hfrId") && !hfrId.trim()) {
      errors["hfrId"] = "HFR / ABHA health ID is required.";
      missing.push("HFR / ABHA Health ID");
    }
    if (isFieldRequired("uhid") && !uhid.trim()) {
      errors["uhid"] = "UHID is required.";
      missing.push("UHID");
    }
    if (isFieldRequired("passportNumber") && !passportNumber.trim()) {
      errors["passportNumber"] = "Passport number is required.";
      missing.push("Passport Number");
    }
    if (isFieldRequired("corporateName") && !corporateName.trim()) {
      errors["corporateName"] = "Corporate client name is required.";
      missing.push("Corporate Client");
    }
    if (isFieldRequired("corporatePlan") && !corporatePlan.trim()) {
      errors["corporatePlan"] = "Corporate plan is required.";
      missing.push("Corporate Plan");
    }
    if (isFieldRequired("govPanel") && !govPanel.trim()) {
      errors["govPanel"] = "Government panel is required.";
      missing.push("Government Panel");
    }
    if (isFieldRequired("height") && !height.trim()) {
      errors["height"] = "Height is required.";
      missing.push("Height");
    }
    if (isFieldRequired("weight") && !weight.trim()) {
      errors["weight"] = "Weight is required.";
      missing.push("Weight");
    }
    if (isFieldRequired("ownerName") && !ownerName.trim()) {
      errors["ownerName"] = "Owner name is required.";
      missing.push("Owner Name");
    }
    if (isFieldRequired("breed") && !breed.trim()) {
      errors["breed"] = "Breed is required.";
      missing.push("Breed");
    }
    if (isFieldRequired("species") && !species.trim()) {
      errors["species"] = "Species is required.";
      missing.push("Species");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setRegisterError(`Please fill in the required fields: ${missing.join(", ")}`);
      setRegistering(false);

      const fieldDomMap: Record<string, string> = {
        firstName: "input-first-name",
        age: "input-age-years",
        gender: "input-gender-trigger",
        phone: "input-phone",
        refDoctor: "input-ref-doctor",
        email: "input-email",
        address: "input-address",
        pincode: "input-pincode",
        city: "input-city",
        district: "input-district",
        collectedAt: "input-collected-at",
        collectedBy: "input-collected-by",
        aadhaarNo: "input-aadhaar",
      };

      const firstErrKey = Object.keys(errors)[0];
      const targetId = fieldDomMap[firstErrKey] || `input-${firstErrKey}`;
      const targetEl = document.getElementById(targetId);

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          try {
            targetEl.focus();
          } catch (_) { }
        }, 250);
      }

      toastError(
        "Required Fields Missing",
        errors[firstErrKey] || "Please fill in all highlighted patient details before proceeding."
      );
      return;
    }

    try {
      let cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      const desTrimmed = (designation || "").trim();
      const isBlankTitle = !desTrimmed || desTrimmed.toLowerCase() === "blank" || desTrimmed.toLowerCase() === "null" || desTrimmed.toLowerCase() === "none" || desTrimmed.toLowerCase() === "untitled";

      if (!isBlankTitle && cleanFirst.toLowerCase().startsWith(desTrimmed.toLowerCase())) {
        cleanFirst = cleanFirst.substring(desTrimmed.length).trim();
      }

      const effectiveDesignation = isBlankTitle ? "" : desTrimmed;
      const fullName = !isBlankTitle
        ? `${desTrimmed} ${cleanFirst}${cleanLast ? ` ${cleanLast}` : ""}`.trim()
        : `${cleanFirst}${cleanLast ? ` ${cleanLast}` : ""}`.trim();
      const calculatedAge = parseInt(ageYears) || (parseInt(ageMonths) > 0 ? 1 : 0) || 0;

      const effectiveVialBarcodes = Object.keys(vialBarcodes).length > 0 ? vialBarcodes : (newPatient?.meta?.vial_barcodes || {});
      const barcodeValues = Object.values(effectiveVialBarcodes).map(b => String(b).trim()).filter(Boolean);
      const primaryBarcode = barcodeValues[0] || sampleBarcode.trim() || newPatient?.vial_barcode || null;
      const joinedBarcodes = barcodeValues.length > 0 ? barcodeValues.join(",") : primaryBarcode;

      const storedUser = getStoredUser();
      const userRole = (currentUserRole || storedUser?.role || "").toUpperCase().trim();
      const isCollectionCenterUser = userRole === "COLLECTION_CENTER" || userRole === "COLLECTION_CENTRE";
      const isB2BUser = userRole === "B2B";
      const isReceptionistUser = userRole === "RECEPTIONIST";
      const effectiveCollectedAt = selectedB2bCenter
        ? (selectedB2bCenter.name || collectedAtSelect)
        : (isB2BUser
          ? (storedUser?.name || collectedAtSelect)
          : (isCollectionCenterUser
            ? (storedUser?.lab_name || storedUser?.labName || storedUser?.name || collectedAtSelect)
            : `${collectedAtSelect} (${collectedBySelect})`));

      let data;
      if (editPatientId) {
        data = await fetchFromLaravel(`/patients/${editPatientId}`, {
          method: "PUT",
          body: JSON.stringify({
            designation: effectiveDesignation,
            name: fullName,
            age: calculatedAge,
            gender,
            phone: phone.trim() || "N/A",
            email: email.trim() || null,
            ref_doctor: refDoctorSelect || "Self",
            refDoctor: refDoctorSelect || "Self",
            second_referral: secondReferral.trim() || null,
            secondReferral: secondReferral.trim() || null,
            address: address.trim() || "N/A",
            city: city.trim() || null,
            district: district.trim() || null,
            state: state.trim() || null,
            pincode: pincode.trim() || null,
            collected_at: effectiveCollectedAt,
            collectedAt: effectiveCollectedAt,
            collected_by: collectedBySelect || null,
            collectedBy: collectedBySelect || null,
            b2b_user_id: (!isCollectionCenterUser && !isReceptionistUser && selectedB2bCenter) ? selectedB2bCenter.id : (isB2BUser ? (storedUser?.id || null) : null),
            b2bUserId: (!isCollectionCenterUser && !isReceptionistUser && selectedB2bCenter) ? selectedB2bCenter.id : (isB2BUser ? (storedUser?.id || null) : null),
            collection_center_id: isCollectionCenterUser && storedUser ? storedUser.id : (newPatient?.meta?.collection_center_id || null),
            collectionCenterId: isCollectionCenterUser && storedUser ? storedUser.id : (newPatient?.meta?.collectionCenterId || null),
            vial_barcode: joinedBarcodes,
            vialBarcode: joinedBarcodes,
            vial_barcodes: effectiveVialBarcodes,
            meta: {
              ...(newPatient?.meta || {}),
              vial_barcode: joinedBarcodes,
              vial_barcodes: effectiveVialBarcodes,
              ...((!isCollectionCenterUser && !isReceptionistUser && !isB2BUser && selectedB2bCenter) ? {
                b2b_user_id: selectedB2bCenter.id,
                b2bUserId: selectedB2bCenter.id,
                b2b_name: selectedB2bCenter.name,
                b2bName: selectedB2bCenter.name,
                created_by_id: selectedB2bCenter.id,
                createdById: selectedB2bCenter.id,
                created_by_name: selectedB2bCenter.name,
                createdByName: selectedB2bCenter.name,
                created_by_role: "B2B",
                createdByRole: "B2B",
              } : {}),
              ...(isCollectionCenterUser && storedUser ? {
                collection_center_id: storedUser.id,
                collectionCenterId: storedUser.id,
                collection_center_name: storedUser.lab_name || storedUser.labName || storedUser.name,
                center_code: storedUser.center_code || storedUser.centerCode || "",
                centerCode: storedUser.center_code || storedUser.centerCode || "",
                created_by_id: storedUser.id,
                createdById: storedUser.id,
                created_by_name: storedUser.name,
                createdByName: storedUser.name,
                created_by_role: "COLLECTION_CENTER",
                createdByRole: "COLLECTION_CENTER",
              } : {}),
              ...(isReceptionistUser && storedUser ? {
                created_by_id: storedUser.id,
                createdById: storedUser.id,
                created_by_name: storedUser.name,
                createdByName: storedUser.name,
                created_by_role: "RECEPTIONIST",
                createdByRole: "RECEPTIONIST",
              } : {}),
            },
            aadhaar_no: aadhaarNo.trim() || null,
            aadhaarNo: aadhaarNo.trim() || null,
            insurance_no: insuranceNo.trim() || null,
            insuranceNo: insuranceNo.trim() || null,
            tpa: tpa.trim() || null,
            hfr_id: hfrId.trim() || null,
            hfrId: hfrId.trim() || null,
            uhid: uhid.trim() || null,
            passport_number: passportNumber.trim() || null,
            passportNumber: passportNumber.trim() || null,
            abha_number: abhaNumber.trim() || null,
            abhaNumber: abhaNumber.trim() || null,
            abha_address: abhaAddress.trim() || null,
            abhaAddress: abhaAddress.trim() || null,
            is_abha_verified: Boolean(isAbhaVerified),
            isAbhaVerified: Boolean(isAbhaVerified),
            abha_profile_photo: abhaProfilePhoto || null,
            corporate_name: corporateName.trim() || null,
            corporateName: corporateName.trim() || null,
            corporate_plan: corporatePlan.trim() || null,
            corporatePlan: corporatePlan.trim() || null,
            gov_panel: govPanel.trim() || null,
            govPanel: govPanel.trim() || null,
            height: height.trim() || null,
            weight: weight.trim() || null,
            owner_name: ownerName.trim() || null,
            ownerName: ownerName.trim() || null,
            breed: breed.trim() || null,
            species: species.trim() || null,
          }),
        });
      } else {
        data = await fetchFromLaravel("/patients", {
          method: "POST",
          body: JSON.stringify({
            designation: effectiveDesignation,
            name: fullName,
            age: calculatedAge,
            gender,
            phone: phone.trim() || "N/A",
            email: email.trim() || null,
            refDoctor: refDoctorSelect || "Self",
            ref_doctor: refDoctorSelect || "Self",
            secondReferral: secondReferral.trim() || null,
            second_referral: secondReferral.trim() || null,
            address: address.trim() || "N/A",
            city: city.trim() || null,
            district: district.trim() || null,
            state: state.trim() || null,
            pincode: pincode.trim() || null,
            collectedAt: effectiveCollectedAt,
            collected_at: effectiveCollectedAt,
            collectedBy: collectedBySelect || null,
            collected_by: collectedBySelect || null,
            collectionDateTime: collectionDateTime || new Date().toISOString(),
            collection_date_time: collectionDateTime || new Date().toISOString(),
            b2b_user_id: (!isCollectionCenterUser && !isReceptionistUser && selectedB2bCenter) ? selectedB2bCenter.id : (isB2BUser ? (storedUser?.id || null) : null),
            b2bUserId: (!isCollectionCenterUser && !isReceptionistUser && selectedB2bCenter) ? selectedB2bCenter.id : (isB2BUser ? (storedUser?.id || null) : null),
            collection_center_id: isCollectionCenterUser && storedUser ? storedUser.id : null,
            collectionCenterId: isCollectionCenterUser && storedUser ? storedUser.id : null,
            vialBarcode: joinedBarcodes,
            vial_barcode: joinedBarcodes,
            vial_barcodes: effectiveVialBarcodes,
            meta: {
              collection_date_time: collectionDateTime || new Date().toISOString(),
              collectionDateTime: collectionDateTime || new Date().toISOString(),
              vial_barcode: joinedBarcodes,
              vial_barcodes: effectiveVialBarcodes,
              ...((!isCollectionCenterUser && !isReceptionistUser && !isB2BUser && selectedB2bCenter) ? {
                b2b_user_id: selectedB2bCenter.id,
                b2bUserId: selectedB2bCenter.id,
                b2b_name: selectedB2bCenter.name,
                b2bName: selectedB2bCenter.name,
                created_by_id: selectedB2bCenter.id,
                createdById: selectedB2bCenter.id,
                created_by_name: selectedB2bCenter.name,
                createdByName: selectedB2bCenter.name,
                created_by_role: "B2B",
                createdByRole: "B2B",
              } : {}),
              ...(isCollectionCenterUser && storedUser ? {
                collection_center_id: storedUser.id,
                collectionCenterId: storedUser.id,
                collection_center_name: storedUser.lab_name || storedUser.labName || storedUser.name,
                center_code: storedUser.center_code || storedUser.centerCode || "",
                centerCode: storedUser.center_code || storedUser.centerCode || "",
                created_by_id: storedUser.id,
                createdById: storedUser.id,
                created_by_name: storedUser.name,
                createdByName: storedUser.name,
                created_by_role: "COLLECTION_CENTER",
                createdByRole: "COLLECTION_CENTER",
              } : {}),
              ...(isReceptionistUser && storedUser ? {
                created_by_id: storedUser.id,
                createdById: storedUser.id,
                created_by_name: storedUser.name,
                createdByName: storedUser.name,
                created_by_role: "RECEPTIONIST",
                createdByRole: "RECEPTIONIST",
              } : {}),
            },
            aadhaarNo: aadhaarNo.trim() || null,
            aadhaar_no: aadhaarNo.trim() || null,
            insuranceNo: insuranceNo.trim() || null,
            insurance_no: insuranceNo.trim() || null,
            tpa: tpa.trim() || null,
            hfrId: hfrId.trim() || null,
            hfr_id: hfrId.trim() || null,
            uhid: uhid.trim() || null,
            passportNumber: passportNumber.trim() || null,
            passport_number: passportNumber.trim() || null,
            abha_number: abhaNumber.trim() || null,
            abhaNumber: abhaNumber.trim() || null,
            abha_address: abhaAddress.trim() || null,
            abhaAddress: abhaAddress.trim() || null,
            is_abha_verified: Boolean(isAbhaVerified),
            isAbhaVerified: Boolean(isAbhaVerified),
            abha_profile_photo: abhaProfilePhoto || null,
            corporateName: corporateName.trim() || null,
            corporate_name: corporateName.trim() || null,
            corporatePlan: corporatePlan.trim() || null,
            corporate_plan: corporatePlan.trim() || null,
            govPanel: govPanel.trim() || null,
            gov_panel: govPanel.trim() || null,
            height: height.trim() || null,
            weight: weight.trim() || null,
            ownerName: ownerName.trim() || null,
            owner_name: ownerName.trim() || null,
            breed: breed.trim() || null,
            species: species.trim() || null,
          }),
        });
      }

      const patientObj: Patient = {
        id: data?.id || editPatientId,
        customId: data?.customId || data?.custom_id || data?.customID || (newPatient?.customId || ""),
        name: data?.name || fullName,
        designation: data?.designation || designation,
        age: calculatedAge,
        gender,
        phone: phone.trim() || "N/A",
        email: email.trim() || undefined,
        refDoctor: refDoctorSelect || "Self",
        secondReferral: secondReferral.trim() || undefined,
        address: address.trim() || "N/A",
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        collectedAt: effectiveCollectedAt,
        collectedBy: collectedBySelect || undefined,
        collectionDateTime: collectionDateTime || new Date().toISOString(),
        collection_date_time: collectionDateTime || new Date().toISOString(),
        aadhaarNo: aadhaarNo.trim() || undefined,
        insuranceNo: insuranceNo.trim() || undefined,
        hfrId: hfrId.trim() || undefined,
        corporateName: corporateName.trim() || undefined,
        vial_barcode: joinedBarcodes,
        vialBarcode: joinedBarcodes,
        meta: {
          ...(data?.meta || newPatient?.meta || {}),
          vial_barcode: joinedBarcodes,
          vial_barcodes: effectiveVialBarcodes,
          ...((!isCollectionCenterUser && !isReceptionistUser && !isB2BUser && selectedB2bCenter) ? {
            b2b_user_id: selectedB2bCenter.id,
            b2bUserId: selectedB2bCenter.id,
            b2b_name: selectedB2bCenter.name,
            b2bName: selectedB2bCenter.name,
            created_by_id: selectedB2bCenter.id,
            createdById: selectedB2bCenter.id,
            created_by_name: selectedB2bCenter.name,
            createdByName: selectedB2bCenter.name,
            created_by_role: "B2B",
            createdByRole: "B2B",
          } : {}),
          ...(isCollectionCenterUser && storedUser ? {
            collection_center_id: storedUser.id,
            collectionCenterId: storedUser.id,
            collection_center_name: storedUser.lab_name || storedUser.labName || storedUser.name,
            center_code: storedUser.center_code || storedUser.centerCode || "",
            centerCode: storedUser.center_code || storedUser.centerCode || "",
            created_by_id: storedUser.id,
            createdById: storedUser.id,
            created_by_name: storedUser.name,
            createdByName: storedUser.name,
            created_by_role: "COLLECTION_CENTER",
            createdByRole: "COLLECTION_CENTER",
          } : {}),
          ...(isReceptionistUser && storedUser ? {
            created_by_id: storedUser.id,
            createdById: storedUser.id,
            created_by_name: storedUser.name,
            createdByName: storedUser.name,
            created_by_role: "RECEPTIONIST",
            createdByRole: "RECEPTIONIST",
          } : {}),
        },
      };

      try {
        const pId = patientObj.id;
        sessionStorage.setItem(`edit_patient_cache_${pId}`, JSON.stringify(data || patientObj));
        if (patientObj.customId) {
          sessionStorage.setItem(`edit_patient_cache_${patientObj.customId}`, JSON.stringify(data || patientObj));
        }
      } catch (_) { }

      prependToApiCache("/patients", data || patientObj, "lis_cached_patients");
      markApiCacheStale("/patients");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("lis_online_sync"));
        window.dispatchEvent(new Event("lis_patient_updated"));
        window.dispatchEvent(new CustomEvent("lis_cache_invalidated", { detail: { prefix: "patients" } }));
      }

      setNewPatient(patientObj);
      setRegistering(false);

      if (isEditMode) {
        toastSuccess("Patient Details Updated", `${patientObj.name}'s details have been updated successfully.`);
        if (openModal) {
          setIsModalOpen(true);
        }
      } else {
        setIsModalOpen(true);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setRegisterError(err.message || "Failed to save patient. Please verify your details.");
      setRegistering(false);
    }
  };

  const handleToggleTest = (testId: string) => {
    if (selectedTests.includes(testId)) {
      setSelectedTests((prev) => prev.filter((id) => id !== testId));
    } else {
      setSelectedTests((prev) => [...prev, testId]);
    }
  };

  const handleRemoveSelectedTest = (test: Test) => {
    const idsToRemove = new Set<string>();
    idsToRemove.add(test.id);
    if (test.subTests && Array.isArray(test.subTests)) {
      test.subTests.forEach((sub) => idsToRemove.add(sub.id));
    }
    setSelectedTests((prev) => prev.filter((id) => !idsToRemove.has(id)));
    if (selectedPackage) {
      const pkgTestIds = resolvePackageTestIds(selectedPackage, availableTests);
      if (pkgTestIds.includes(test.id)) {
        setSelectedPackage(null);
      }
    }
  };

  // Outsource Partner Lab Pricing Lookup & Selection
  const selectedPartnerLabObj = useMemo(() => {
    const cur = outsourcePartnerLab.toLowerCase().trim();
    return outsourcePartnerLabsList.find(
      (l) => l.name.toLowerCase().trim() === cur || l.id === outsourcePartnerLab
    );
  }, [outsourcePartnerLabsList, outsourcePartnerLab]);

  const getOutsourceTestPricing = useCallback(
    (test: any) => {
      const testId = String(test.id || "").toLowerCase().trim();
      const testName = String(test.name || "").toLowerCase().trim();
      const testCode = String(test.testCode || test.test_code || test.code || "").toLowerCase().trim();

      let customRate: number | null = null;
      if (selectedPartnerLabObj && Array.isArray(selectedPartnerLabObj.tests)) {
        const match: any = selectedPartnerLabObj.tests.find((t: any) => {
          const tId = String(t.test_id || t.testId || "").toLowerCase().trim();
          const tName = String(t.test_name || t.testName || "").toLowerCase().trim();
          const tCode = String(t.test_code || t.testCode || "").toLowerCase().trim();

          if (tId && testId && tId === testId) return true;
          if (tName && testName && tName === testName) return true;
          if (tCode && testCode && tCode === testCode) return true;
          return false;
        });

        if (match) {
          const rate = match.outsource_price ?? match.outsourcePrice;
          if (rate !== undefined && rate !== null && !isNaN(Number(rate))) {
            customRate = Number(rate);
          }
        }
      }

      const basePrice = Number(test.price) || 0;
      const b2bRate = (test as any).b2bPrice ?? (test as any).b2b_price;
      const effectivePrice = customRate !== null ? customRate : ((isB2B || !!selectedB2bCenter) && b2bRate != null ? Number(b2bRate) : basePrice);

      return {
        hasCustomRate: customRate !== null,
        customRate,
        basePrice,
        effectivePrice,
      };
    },
    [selectedPartnerLabObj, isB2B, selectedB2bCenter]
  );

  const handlePartnerLabChange = (newLabName: string) => {
    setOutsourcePartnerLab(newLabName);
    const targetName = newLabName.toLowerCase().trim();
    const newLab = outsourcePartnerLabsList.find(
      (l) => l.name.toLowerCase().trim() === targetName || l.id === newLabName
    );
    // Recalibrate prices of selected catalog outsource tests
    setSelectedOutsourceTests((prev) =>
      prev.map((item) => {
        if (item.code === "OUT-CUST" || !item.id) return item;
        let matchedPrice = item.price;
        const itemId = String(item.id || "").toLowerCase().trim();
        const itemName = String(item.name || "").toLowerCase().trim();

        if (newLab && Array.isArray(newLab.tests)) {
          const match: any = newLab.tests.find((t: any) => {
            const tId = String(t.test_id || t.testId || "").toLowerCase().trim();
            const tName = String(t.test_name || t.testName || "").toLowerCase().trim();
            return (tId && itemId && tId === itemId) || (tName && itemName && tName === itemName);
          });
          const rate = match ? (match.outsource_price ?? match.outsourcePrice) : null;
          if (rate !== undefined && rate !== null && !isNaN(Number(rate))) {
            matchedPrice = Number(rate);
          } else {
            const orig = availableTests.find((at) => String(at.id).toLowerCase() === itemId);
            if (orig) matchedPrice = Number(orig.price) || 0;
          }
        } else {
          const orig = availableTests.find((at) => String(at.id).toLowerCase() === itemId);
          if (orig) matchedPrice = Number(orig.price) || 0;
        }
        return { ...item, price: matchedPrice };
      })
    );
  };

  // Outsource Test Helpers
  const handleToggleOutsourceTest = (test: any) => {
    const exists = selectedOutsourceTests.some(
      (st) => (st.id && st.id === test.id) || st.name.toLowerCase() === test.name.toLowerCase()
    );

    if (exists) {
      setSelectedOutsourceTests((prev) =>
        prev.filter((st) => (st.id ? st.id !== test.id : st.name.toLowerCase() !== test.name.toLowerCase()))
      );
    } else {
      const pricing = getOutsourceTestPricing(test);
      setSelectedOutsourceTests((prev) => [
        ...prev,
        {
          id: test.id,
          name: test.name,
          code: test.testCode || test.test_code || test.code || "",
          price: pricing.effectivePrice,
          category: test.category || "Outsource",
        },
      ]);
    }
  };

  const handleAddCustomOutsourceTest = () => {
    const trimmed = customOutsourceName.trim();
    if (!trimmed) {
      toast({ title: "Name Required", description: "Please enter investigation name.", type: "error" });
      return;
    }
    const price = Math.max(0, parseFloat(customOutsourcePrice) || 0);
    setSelectedOutsourceTests((prev) => [
      ...prev,
      {
        name: trimmed,
        code: "OUT-CUST",
        price,
        category: "Outsource Custom",
      },
    ]);
    setCustomOutsourceName("");
    setCustomOutsourcePrice("");
    setIsAddingCustomOutsource(false);
  };

  const handleRemoveOutsourceTest = (idOrIndex: string | number) => {
    if (typeof idOrIndex === "number") {
      setSelectedOutsourceTests((prev) => prev.filter((_, i) => i !== idOrIndex));
    } else {
      setSelectedOutsourceTests((prev) =>
        prev.filter((st, i) => (st.id ? st.id !== idOrIndex : String(i) !== idOrIndex))
      );
    }
  };

  const selectedTestObjects = useMemo(() => {
    return availableTests.flatMap((t) => {
      let shouldChargeParent = selectedTests.includes(t.id);
      if (!shouldChargeParent && t.subTests) {
        if (t.subTests.some(sub => selectedTests.includes(sub.id))) {
          shouldChargeParent = true;
        }
      }
      const list = [];
      if (shouldChargeParent) {
        list.push(t);
      }
      return list;
    });
  }, [availableTests, selectedTests]);

  const specimenTubes = useMemo(() => classifyTestsIntoTubes(selectedTestObjects), [selectedTestObjects]);

  // Map generic loaded barcodes (like VIAL_1 or PRIMARY) to tubes once specimenTubes are calculated
  useEffect(() => {
    if (specimenTubes.length > 0) {
      setVialBarcodes((prev) => {
        const updated = { ...prev };
        let changed = false;
        specimenTubes.forEach((tube, idx) => {
          if (!updated[tube.tubeType] || updated[tube.tubeType].trim() === "") {
            const genericKey = `VIAL_${idx + 1}`;
            if (updated[genericKey]) {
              updated[tube.tubeType] = updated[genericKey];
              delete updated[genericKey];
              changed = true;
            } else if (updated["PRIMARY"] && idx === 0) {
              updated[tube.tubeType] = updated["PRIMARY"];
              delete updated["PRIMARY"];
              changed = true;
            }
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [specimenTubes]);

  const isEffectiveB2B = isB2B || !!selectedB2bCenter;

  const rawSubtotal = selectedTestObjects.reduce((sum, t) => {
    const rate = isEffectiveB2B ? (t.b2bPrice ?? (t as any).b2b_price ?? t.price) : t.price;
    return sum + (Number(rate) || 0);
  }, 0);
  const outsourceSubtotal = selectedOutsourceTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const inHouseSubtotal = selectedPackage ? selectedPackage.price : rawSubtotal;
  const subtotal = inHouseSubtotal + outsourceSubtotal;
  const parsedDiscount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const grandTotal = Math.max(0, subtotal - parsedDiscount);
  const parsedPaid = Math.min(grandTotal, Math.max(0, parseFloat(paidAmount) || 0));
  const userEnteredPartial = parseFloat(paidAmount) > 0 && parseFloat(paidAmount) < grandTotal;
  const isAutoPaidMode = selectedPaymentMode === "CASH" || selectedPaymentMode === "UPI";
  const effectivePaid = isAutoPaidMode && grandTotal > 0
    ? (userEnteredPartial ? parsedPaid : grandTotal)
    : parsedPaid;
  const balanceDue = Math.max(0, grandTotal - effectivePaid);
  const effectiveStatus = (isAutoPaidMode && grandTotal > 0 && !userEnteredPartial) || (effectivePaid >= grandTotal && grandTotal > 0)
    ? "PAID"
    : (effectivePaid > 0 ? "PARTIAL" : "UNPAID");

  const handleConfirmBooking = async () => {
    if (!newPatient) return;
    setBookingError(null);
    setBooking(true);
    try {
      const storedUser = getStoredUser();
      const userRole = (currentUserRole || storedUser?.role || "").toUpperCase().trim();
      const isCollectionCenterUser = userRole === "COLLECTION_CENTER" || userRole === "COLLECTION_CENTRE";
      const isB2BUser = userRole === "B2B";
      const isReceptionistUser = userRole === "RECEPTIONIST";
      const effectiveCollectedAt = selectedB2bCenter
        ? (selectedB2bCenter.name || collectedAtSelect)
        : (isB2BUser
          ? (storedUser?.name || collectedAtSelect)
          : (isCollectionCenterUser
            ? (storedUser?.lab_name || storedUser?.labName || storedUser?.name || collectedAtSelect)
            : `${collectedAtSelect} (${collectedBySelect})`));

      const isAutoPaid = selectedPaymentMode === "CASH" || selectedPaymentMode === "UPI";
      const computedPaid = isAutoPaid && grandTotal > 0 && !userEnteredPartial ? grandTotal : effectivePaid;
      const computedStatus = isAutoPaid && grandTotal > 0 && !userEnteredPartial ? "PAID" : effectiveStatus;
      const computedBalance = isAutoPaid && !userEnteredPartial ? 0 : balanceDue;
      const computedDiscount = parsedDiscount;
      const effectivePaymentMode = isAutoPaid ? selectedPaymentMode : (computedPaid > 0 ? "ADVANCE" : "UNPAID");

      // Sanitize testIds: Only send valid unique UUIDs to PostgreSQL backend
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let validTestIds = Array.from(new Set(selectedTests.filter(id => uuidRegex.test(id))));

      if (validTestIds.length === 0 && selectedPackage) {
        validTestIds = Array.from(new Set(resolvePackageTestIds(selectedPackage, availableTests).filter(id => uuidRegex.test(id))));
      }

      const hasInHouse = validTestIds.length > 0;
      const hasOutsource = selectedOutsourceTests.length > 0;

      if (!hasInHouse && !hasOutsource) {
        throw new Error("Please select at least one clinical investigation, package, or outsource test.");
      }

      const finalPartnerLab =
        outsourcePartnerLab === "Other Partner Lab" && outsourcePartnerLabCustom.trim()
          ? outsourcePartnerLabCustom.trim()
          : outsourcePartnerLab;

      const isPureOutsource = hasOutsource && !hasInHouse;

      let cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      const desTrimmed = (designation || "").trim();
      if (desTrimmed && cleanFirst.toLowerCase().startsWith(desTrimmed.toLowerCase())) {
        cleanFirst = cleanFirst.substring(desTrimmed.length).trim();
      }
      const fullName = desTrimmed
        ? `${desTrimmed} ${cleanFirst}${cleanLast ? ` ${cleanLast}` : ""}`.trim()
        : `${cleanFirst}${cleanLast ? ` ${cleanLast}` : ""}`.trim();
      const calculatedAge = parseInt(ageYears) || (parseInt(ageMonths) > 0 ? 1 : 0) || 0;

      const activeVialBarcodes = { ...vialBarcodes };
      const barcodeValues = Object.values(activeVialBarcodes).map(b => String(b).trim()).filter(Boolean);
      const primaryBarcode = barcodeValues[0] || sampleBarcode.trim() || newPatient?.vial_barcode || null;
      const joinedBarcodes = barcodeValues.length > 0 ? barcodeValues.join(",") : primaryBarcode;

      let report: any = null;
      let assignedBillCustomId = "INV-CONFIRMED";
      const currentBillId = existingBill?.id || existingReport?.bill?.id || existingReport?.bill_id;

      if (isEditMode && (currentBillId || existingReport?.id)) {
        // EDIT MODE: Update existing bill and report records
        if (currentBillId) {
          try {
            const updatedBill = await fetchFromLaravel(`/bills/${currentBillId}`, {
              method: "PUT",
              body: JSON.stringify({
                test_ids: validTestIds,
                total: grandTotal,
                discount: computedDiscount,
                paid_amount: computedPaid,
                paidAmount: computedPaid,
                payment_mode: effectivePaymentMode,
                paymentMode: effectivePaymentMode,
                status: computedStatus,
              }),
            });
            setExistingBill(updatedBill);
            assignedBillCustomId = updatedBill.custom_id || updatedBill.customId || existingBill?.custom_id || existingBill?.customId || "INV-UPDATED";
          } catch (e) {
            console.error("Error updating bill in edit mode:", e);
          }
        }

        if (existingReport?.id) {
          try {
            report = await fetchFromLaravel(`/reports/${existingReport.id}`, {
              method: "PUT",
              body: JSON.stringify({
                package_name: selectedPackage?.name || null,
                packageName: selectedPackage?.name || null,
              }),
            });
            setExistingReport(report);
          } catch (e) {
            report = existingReport;
          }
        } else {
          report = existingReport || { id: "REP-EDIT", bill: existingBill };
        }

        if (hasOutsource) {
          try {
            await fetchFromLaravel("/outsource-cases", {
              method: "POST",
              body: JSON.stringify({
                patient_id: newPatient.id,
                is_pure_outsource: isPureOutsource,
                partner_lab: finalPartnerLab,
                notes: outsourceNotes,
                tests: selectedOutsourceTests,
              }),
            });
          } catch (e) {
            console.error("Error linking outsource tests in edit mode:", e);
          }
        }

        // Update patient barcodes in edit mode
        const outsourceMeta = hasOutsource
          ? {
            has_outsource: true,
            is_outsource: isPureOutsource,
            outsource_tests: selectedOutsourceTests,
            outsource_partner_lab: finalPartnerLab,
            outsource_notes: outsourceNotes,
          }
          : { has_outsource: false, is_outsource: false };

        const updatePatientPayload: any = {
          name: fullName || newPatient.name,
          designation: designation || newPatient.designation,
          age: calculatedAge,
          gender: gender || newPatient.gender,
          phone: phone.trim() || newPatient.phone || "N/A",
          email: email.trim() || null,
          ref_doctor: refDoctorSelect || "Self",
          refDoctor: refDoctorSelect || "Self",
          second_referral: secondReferral.trim() || null,
          secondReferral: secondReferral.trim() || null,
          address: address.trim() || "N/A",
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          collected_at: effectiveCollectedAt,
          collectedAt: effectiveCollectedAt,
          collected_by: collectedBySelect || null,
          collectedBy: collectedBySelect || null,
          collection_date_time: collectionDateTime || new Date().toISOString(),
          collectionDateTime: collectionDateTime || new Date().toISOString(),
          vial_barcode: joinedBarcodes,
          vialBarcode: joinedBarcodes,
          vial_barcodes: activeVialBarcodes,
          meta: {
            ...(newPatient.meta || {}),
            collection_date_time: collectionDateTime || new Date().toISOString(),
            collectionDateTime: collectionDateTime || new Date().toISOString(),
            vial_barcode: joinedBarcodes,
            vial_barcodes: activeVialBarcodes,
            ...outsourceMeta,
          },
        };

        try {
          const updatedPatientRes = await fetchFromLaravel(`/patients/${newPatient.id}`, {
            method: "PUT",
            body: JSON.stringify(updatePatientPayload),
          });
          const freshPat = updatedPatientRes || { ...newPatient, ...updatePatientPayload };
          setNewPatient(freshPat);
          prependToApiCache("/patients", freshPat, "lis_cached_patients");
        } catch (e) {
          console.error("Error updating patient in edit mode:", e);
        }

        markApiCacheStale("/patients");
        markApiCacheStale("/reports");
        markApiCacheStale("/bills");
      } else {
        // HIGH-SPEED UNIFIED ATOMIC BOOKING
        // Completes Patient + Bill + Report + Outsource + Barcodes in 1 single atomic DB transaction (40ms - 80ms)
        const bookingPayload: any = {
          patient: {
            id: newPatient?.id,
            name: fullName || newPatient.name,
            designation: designation || newPatient.designation,
            age: calculatedAge,
            gender: gender || newPatient.gender,
            phone: phone.trim() || newPatient.phone || "N/A",
            email: email.trim() || null,
            ref_doctor: refDoctorSelect || "Self",
            refDoctor: refDoctorSelect || "Self",
            second_referral: secondReferral.trim() || null,
            secondReferral: secondReferral.trim() || null,
            address: address.trim() || "N/A",
            city: city.trim() || null,
            district: district.trim() || null,
            state: state.trim() || null,
            pincode: pincode.trim() || null,
            collected_at: effectiveCollectedAt,
            collectedAt: effectiveCollectedAt,
            collected_by: collectedBySelect || null,
            collectedBy: collectedBySelect || null,
            collection_date_time: collectionDateTime || new Date().toISOString(),
            collectionDateTime: collectionDateTime || new Date().toISOString(),
            aadhaar_no: aadhaarNo.trim() || null,
            aadhaarNo: aadhaarNo.trim() || null,
            insurance_no: insuranceNo.trim() || null,
            insuranceNo: insuranceNo.trim() || null,
            tpa: tpa.trim() || null,
            hfr_id: hfrId.trim() || null,
            hfrId: hfrId.trim() || null,
            uhid: uhid.trim() || null,
            passport_number: passportNumber.trim() || null,
            passportNumber: passportNumber.trim() || null,
            corporate_name: corporateName.trim() || null,
            corporateName: corporateName.trim() || null,
            corporate_plan: corporatePlan.trim() || null,
            corporatePlan: corporatePlan.trim() || null,
            gov_panel: govPanel.trim() || null,
            govPanel: govPanel.trim() || null,
            height: height.trim() || null,
            weight: weight.trim() || null,
            owner_name: ownerName.trim() || null,
            ownerName: ownerName.trim() || null,
            breed: breed.trim() || null,
            species: species.trim() || null,
            abha_number: abhaNumber.trim() || null,
            abhaNumber: abhaNumber.trim() || null,
            abha_address: abhaAddress.trim() || null,
            abhaAddress: abhaAddress.trim() || null,
            is_abha_verified: Boolean(isAbhaVerified),
            isAbhaVerified: Boolean(isAbhaVerified),
            abha_profile_photo: abhaProfilePhoto || null,
            vial_barcode: joinedBarcodes,
            vialBarcode: joinedBarcodes,
            vial_barcodes: activeVialBarcodes,
            meta: {
              ...(newPatient.meta || {}),
              collection_date_time: collectionDateTime || new Date().toISOString(),
              collectionDateTime: collectionDateTime || new Date().toISOString(),
              vial_barcode: joinedBarcodes,
              vial_barcodes: activeVialBarcodes,
              ...((!isCollectionCenterUser && !isReceptionistUser && !isB2BUser && selectedB2bCenter) ? {
                b2b_user_id: selectedB2bCenter.id,
                b2bUserId: selectedB2bCenter.id,
                b2b_name: selectedB2bCenter.name,
                b2bName: selectedB2bCenter.name,
                created_by_id: selectedB2bCenter.id,
                createdById: selectedB2bCenter.id,
                created_by_name: selectedB2bCenter.name,
                createdByName: selectedB2bCenter.name,
                created_by_role: "B2B",
                createdByRole: "B2B",
              } : {}),
            },
          },
          tests: validTestIds,
          billing: {
            total: grandTotal,
            discount: computedDiscount,
            paid_amount: computedPaid,
            paidAmount: computedPaid,
            payment_mode: effectivePaymentMode,
            paymentMode: effectivePaymentMode,
            status: computedStatus,
          },
          outsource: {
            has_outsource: hasOutsource,
            is_pure_outsource: isPureOutsource,
            partner_lab: finalPartnerLab,
            notes: outsourceNotes,
            tests: selectedOutsourceTests,
          },
          package_name: selectedPackage?.name || null,
          packageName: selectedPackage?.name || null,
          collection_date_time: collectionDateTime || new Date().toISOString(),
          collectionDateTime: collectionDateTime || new Date().toISOString(),
        };

        const bookingRes = await fetchFromLaravel("/bookings", {
          method: "POST",
          body: JSON.stringify(bookingPayload),
        });

        report = bookingRes?.report || { id: "", bill: bookingRes?.bill };
        const createdBill = bookingRes?.bill;
        assignedBillCustomId = createdBill?.custom_id || createdBill?.customId || report?.custom_id || report?.customId || `INV-${newPatient.customId}`;
        const freshPat = bookingRes?.patient || newPatient;

        setNewPatient((prev: any) => prev ? {
          ...prev,
          ...freshPat,
          vial_barcode: joinedBarcodes,
          vialBarcode: joinedBarcodes,
        } : freshPat);

        try {
          sessionStorage.setItem(`edit_patient_cache_${freshPat.id || newPatient.id}`, JSON.stringify(freshPat));
        } catch (_) { }

        // SWR Prepending: Instant 0ms snappiness for Directory & Reports without reload
        prependToApiCache("/patients", freshPat, "lis_cached_patients");
        if (bookingRes?.report) {
          prependToApiCache("/reports", bookingRes.report, "lis_cached_reports");
        }
        if (bookingRes?.bill) {
          prependToApiCache("/bills", bookingRes.bill, "lis_cached_bills");
        }
        markApiCacheStale("/patients");
        markApiCacheStale("/reports");
        markApiCacheStale("/bills");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("lis_online_sync"));
          window.dispatchEvent(new Event("lis_patient_updated"));
          window.dispatchEvent(new CustomEvent("lis_cache_invalidated", { detail: { prefix: "bookings" } }));
        }
      }

      const assignedPatientCustomId = newPatient.customId || (newPatient as any).custom_id || "";

      if (selectedPackage && report?.id) {
        saveReportPackage(report.id, selectedPackage.name, assignedBillCustomId);
        if (assignedPatientCustomId) {
          saveReportPackage(assignedPatientCustomId, selectedPackage.name);
        }
      }

      const inHouseInvoiceTests = selectedTestObjects.length > 0
        ? selectedTestObjects.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          price: Number(t.price) || 0,
          code: (t as any).testCode || (t as any).test_code || (t as any).code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`,
          sampleType: (t as any).sampleType || (t as any).sample_type || undefined,
        }))
        : (selectedPackage?.tests || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category || "General",
          price: Number(t.price) || 0,
          code: t.code || t.testCode || t.test_code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`,
          sampleType: t.sampleType || t.sample_type || undefined,
        }));

      const outsourceInvoiceTests = selectedOutsourceTests.map((t, idx) => ({
        id: t.id || `out-${idx}`,
        name: `${t.name} (Outsource - ${finalPartnerLab})`,
        category: t.category || "Outsource",
        price: Number(t.price) || 0,
        code: t.code || "OUTSOURCE",
      }));

      const invoiceTests = [...inHouseInvoiceTests, ...outsourceInvoiceTests];

      setBookingSuccess(true);
      scrollToTop(false);
      const initialMode = computedStatus === "PAID" ? (selectedPaymentMode === "UPI" ? "UPI" : "CASH") : (computedPaid > 0 ? "ADVANCE" : "UNPAID");
      setSelectedPaymentMode(initialMode as any);
      setPaymentUpdateMessage(null);
      setSuccessDetails({
        patientCustomId: assignedPatientCustomId,
        billCustomId: assignedBillCustomId,
        reportId: report?.id || "",
        billId: report?.bill?.id || report?.id || assignedBillCustomId,
        total: grandTotal,
        discount: computedDiscount,
        paidAmount: computedPaid,
        balanceDue: computedBalance,
        paymentStatus: computedStatus,
        paymentMode: initialMode,
        patientName: fullName || newPatient.name,
        patientAge: calculatedAge || newPatient.age,
        patientGender: gender || newPatient.gender,
        patientPhone: phone.trim() || newPatient.phone,
        patientAddress: address.trim() || newPatient.address,
        refDoctor: refDoctorSelect || newPatient.refDoctor,
        collectedAt: effectiveCollectedAt || newPatient.collectedAt,
        packageName: selectedPackage?.name || null,
        tests: invoiceTests,
        vialBarcodes: { ...vialBarcodes },
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Booking error:", err);
      setBookingError(err.message || "Failed to complete booking and create invoice.");
    } finally {
      setBooking(false);
    }
  };

  const handleResetFlow = () => {
    setSelectedPackage(null);
    setCatalogMode("TESTS");
    setSelectedOutsourceTests([]);
    setOutsourcePartnerLab("Dr. Lal PathLabs");
    setOutsourcePartnerLabCustom("");
    setOutsourceNotes("");
    setCustomOutsourceName("");
    setCustomOutsourcePrice("");
    setIsAddingCustomOutsource(false);
    setDesignation("Mr.");
    setFirstName("");
    setLastName("");
    setAgeYears("");
    setAgeMonths("");
    setAgeDays("");
    setGender("Male");
    setPhone("");
    setEmail("");
    setAddress("");
    setRefDoctorSelect("Self");
    const storedUser = getStoredUser();
    if (currentUserRole === "B2B" || storedUser?.role === "B2B") {
      const b2bName = storedUser?.name || storedUser?.lab_name || "B2B Partner";
      setCollectedAtSelect(b2bName);
      setCollectedBySelect(storedUser?.name || b2bName);
    } else if (currentUserRole === "COLLECTION_CENTER" || storedUser?.role === "COLLECTION_CENTER") {
      const centerName = storedUser?.lab_name || storedUser?.labName || storedUser?.name || "Collection Center";
      setCollectedAtSelect(centerName);
      setCollectedBySelect(storedUser?.name || centerName);
    } else {
      setCollectedAtSelect("Main Lab");
      setCollectedBySelect("Self / Lab Staff");
    }
    setAadhaarNo("");
    setHfrId("");
    setUhid("");
    setInsuranceNo("");
    setTpa("");
    setPassportNumber("");
    setCorporateName("");
    setCorporatePlan("");
    setGovPanel("");
    setRegistering(false);
    setRegisterError(null);
    setNewPatient(null);
    setSelectedTests([]);
    setDiscount("0");
    setPaidAmount("0");
    setPaymentStatus("UNPAID");
    setBookingSuccess(false);
    scrollToTop(true);
    setSuccessDetails(null);
    setIsPrintModalOpen(false);
    setSampleBarcode("");
    setVialBarcodes({});
    setSelectedPaymentMode("UNPAID");
    setPaymentUpdateMessage(null);
  };

  const handleApproveCashPayment = async () => {
    if (!successDetails?.billId) return;
    try {
      setIsApprovingPayment(true);
      await fetchFromLaravel(`/bills/${successDetails.billId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "PAID",
          paid_amount: successDetails.total,
        }),
      });
      setSuccessDetails((prev: any) => ({
        ...prev,
        balanceDue: 0,
        paidAmount: prev.total,
        paymentStatus: "PAID",
        paymentMode: "CASH",
      }));
    } catch (err: any) {
      console.error("Payment approval error:", err);
    } finally {
      setIsApprovingPayment(false);
    }
  };

  const handleApplyPaymentMode = async (mode: "CASH" | "UPI" | "ONLINE" | "CARD" | "UNPAID") => {
    if (isB2B) return;
    if (!successDetails?.billId) {
      setSelectedPaymentMode(mode);
      return;
    }

    try {
      setUpdatingPaymentModeTarget(mode);
      setIsUpdatingPaymentMode(true);
      setPaymentUpdateMessage(null);
      const isPaid = mode !== "UNPAID";
      const paidAmount = isPaid ? successDetails.total : 0;
      const balanceDue = isPaid ? 0 : successDetails.total;
      const status = isPaid ? "PAID" : "UNPAID";

      await fetchFromLaravel(`/bills/${successDetails.billId}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          paid_amount: paidAmount,
          payment_mode: mode,
        }),
      });

      setSelectedPaymentMode(mode);
      setSuccessDetails((prev: any) => ({
        ...prev,
        paidAmount,
        balanceDue,
        paymentStatus: status,
        paymentMode: mode,
      }));

      setPaymentUpdateMessage(
        isPaid
          ? `Payment mode set to ${mode} and verified as PAID.`
          : `Payment status set to UNPAID. Patient report download will require PayU payment on portal.`
      );
      setTimeout(() => setPaymentUpdateMessage(null), 4000);
    } catch (err: any) {
      console.error("Error updating payment mode:", err);
    } finally {
      setIsUpdatingPaymentMode(false);
      setUpdatingPaymentModeTarget(null);
    }
  };

  const handlePayUSuccess = async () => {
    if (!successDetails?.billId) return;
    try {
      setPayULoading(true);
      await fetchFromLaravel(`/bills/${successDetails.billId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "PAID",
          paid_amount: successDetails.total,
          payment_mode: "ONLINE_PAYU",
        }),
      });
      setSuccessDetails((prev: any) => ({
        ...prev,
        balanceDue: 0,
        paidAmount: prev.total,
        paymentStatus: "PAID",
        paymentMode: "ONLINE_PAYU",
      }));
      setSelectedPaymentMode("ONLINE");
      setIsPayUModalOpen(false);
      setPaymentUpdateMessage("Online PayU transaction verified & settled!");
      setTimeout(() => setPaymentUpdateMessage(null), 4000);
    } catch (err: any) {
      console.error("PayU settlement error:", err);
    } finally {
      setPayULoading(false);
    }
  };

  // Grouping & Filtering Tests
  const normalizeCat = (cat?: string) => {
    if (!cat) return "General Pathology";
    const trimmed = cat.trim();
    if (/^haematology$/i.test(trimmed) || /^hematology$/i.test(trimmed)) return "Hematology";
    return trimmed;
  };

  const categories = useMemo(() => {
    return Array.from(new Set(availableTests.map((t) => normalizeCat(t.category)).filter(Boolean)));
  }, [availableTests]);

  const groupedTests = useMemo(() => {
    const grouped: Record<string, Test[]> = {};
    availableTests.forEach((test) => {
      const cat = normalizeCat(test.category);
      (grouped[cat] ||= []).push(test);
    });
    return grouped;
  }, [availableTests]);

  const deferredTestSearch = useDeferredValue(testSearch);

  const filteredGroups = useMemo(() => {
    const term = deferredTestSearch.toLowerCase().trim();
    const filtered: Record<string, Test[]> = {};
    Object.entries(groupedTests).forEach(([category, tests]) => {
      if (activeCategory !== "ALL" && normalizeCat(category) !== normalizeCat(activeCategory)) return;
      const matches = tests.filter((t) => {
        if (!term) return true;
        const name = (t.name || "").toLowerCase();
        const code = ((t as any).testCode || (t as any).code || (t as any).test_code || (t as any).id || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return name.includes(term) || code.includes(term) || cat.includes(term);
      });
      if (matches.length > 0) filtered[category] = matches;
    });
    return filtered;
  }, [groupedTests, deferredTestSearch, activeCategory]);

  const filteredPackagesForCatalog = useMemo(() => {
    const term = deferredTestSearch.toLowerCase().trim();
    if (!term) return availablePackages;
    return availablePackages.filter(
      (p) => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
    );
  }, [availablePackages, deferredTestSearch]);

  const handleTogglePackage = (pkg: LabPackage) => {
    if (selectedPackage?.id === pkg.id) {
      const resolved = resolvePackageTestIds(pkg, availableTests);
      setSelectedTests((prev) => prev.filter((id) => !resolved.includes(id)));
      setSelectedPackage(null);
    } else {
      let baseTests = selectedTests;
      if (selectedPackage) {
        const prevResolved = resolvePackageTestIds(selectedPackage, availableTests);
        baseTests = baseTests.filter((id) => !prevResolved.includes(id));
      }
      setSelectedPackage(pkg);
      const newResolved = resolvePackageTestIds(pkg, availableTests);
      setSelectedTests(Array.from(new Set([...baseTests, ...newResolved])));
    }
  };

  const steps = [
    { n: 1, label: "Patient Intake", done: true },
    { n: 2, label: "Test Directory", done: !!newPatient },
    { n: 3, label: "Invoice & Barcode", done: bookingSuccess },
  ];

  if (isEditMode && isEditLoading && !hasPreloadedPreview) {
    return <RegisterPageShimmer pid={editId} />;
  }

  return (
    <div className="w-full space-y-7 pb-12 animate-fade-in text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isEditMode ? "bg-amber-500 animate-pulse" : "bg-primary animate-pulse"}`} />
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isEditMode ? "text-amber-500" : "text-primary"}`}>
              {isEditMode ? "Patient Profile & Order Edit Mode" : "Diagnostic Intake Flow"}
            </p>
            {isEditMode && newPatient && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px]">
                PID: {newPatient.customId || (newPatient as any).custom_id || editPatientId}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            {isEditMode ? "Edit Patient & Clinical Investigations" : "Register Patient & Clinical Investigations"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isEditMode
              ? "Update patient demographics, referral doctor, assigned test catalog items, and billing details."
              : "Capture demographics, assign pathology investigations, apply concessions, and issue billing receipts."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTempIntakeFields(intakeFields.map(f => ({ ...f })));
              setIsSettingsOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/90 bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
          >
            <Settings className="h-4 w-4 text-primary" />
            <span>Intake Field Rules</span>
          </button>
        </div>
      </div>

      {!bookingSuccess ? (
        <div className="space-y-6">
          {/* Background Data Sync Notice when preloaded preview is displayed */}
          {isEditMode && isEditLoading && hasPreloadedPreview && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium shadow-xs animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <span>Patient demographics loaded instantly. Syncing clinical investigations, billing breakdown & doctor history from server...</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-primary/20 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">Fast Sync</span>
            </div>
          )}
          {/* Stepper */}
          <div className="flex items-center justify-between max-w-xl mx-auto px-2 sm:px-4 overflow-x-auto py-1">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${s.done ? "gradient-primary text-primary-foreground shadow-md ring-2 ring-primary/20" : "bg-muted text-muted-foreground border border-border/90"
                    }`}>
                    {s.done && s.n !== (newPatient && !bookingSuccess ? 2 : s.n) ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${s.done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 min-w-[24px] sm:min-w-[40px] h-[2px] mx-2 sm:mx-3 mb-4 rounded transition-colors ${steps[i + 1].done ? "bg-primary" : "bg-border/90"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Main Full-Width Intake Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left 8 Cols: High-Contrast Seamless Form */}
            <div className="lg:col-span-8 space-y-6">


              {registerError && (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive font-medium shadow-sm animate-fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{registerError}</p>
                </div>
              )}

              {newPatient && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/30 text-foreground animate-fade-in shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Patient Active in Intake Buffer</p>
                      <p className="text-sm font-bold text-foreground">{newPatient.name} <span className="font-mono text-xs text-muted-foreground font-semibold">({newPatient.customId})</span></p>
                    </div>
                  </div>
                  <button onClick={handleResetFlow} className="text-xs font-bold text-primary hover:underline">
                    Reset / Register Fresh
                  </button>
                </div>
              )}

              {/* Flabs-Style Patient Search removed - top global navbar search is active */}

              <form onSubmit={handleRegisterPatient} className="space-y-6 bg-card/80 p-6 sm:p-7 rounded-2xl border border-border/90 shadow-sm">

                {/* Section 1: Demographics */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <User className="h-4 w-4 text-primary" />
                      <span>Patient Identity & Demographics</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsAbhaQrModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                        title="Scan QR to Create ABHA Health ID"
                      >
                        <QrCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Create ABHA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAbhaModalOpen(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${isAbhaVerified
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/25 hover:shadow-md"
                          }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{isAbhaVerified ? "ABHA Linked" : "Link Patient ABHA"}</span>
                      </button>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                        Step 1
                      </span>
                    </div>
                  </div>

                  {/* ABHA Verified Identity Card */}
                  {isAbhaVerified && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 text-foreground animate-fade-in shadow-xs gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              ABHA Identity Verified (ABDM M1)
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              Govt. of India
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs mt-0.5">
                            <span className="font-mono font-bold text-foreground">
                              {abhaNumber ? abhaNumber.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4") : "ABHA Linked"}
                            </span>
                            {abhaAddress && (
                              <span className="text-muted-foreground font-mono">
                                ({abhaAddress})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setIsAbhaModalOpen(true)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          View / Re-verify
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Title, First Name, Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Title
                      </label>
                      <Select value={designation || ""} onValueChange={handleTitleChange} disabled={registering || (!!newPatient && !isEditMode)}>
                        <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
                          <SelectValue placeholder="Select Title" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="Blank">
                            <span className="text-muted-foreground italic">None (Blank)</span>
                          </SelectItem>
                          {ALL_DESIGNATIONS.filter(d => d !== "Blank" && d !== "Null").map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        First Name <span className="text-rose-500 font-extrabold">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="input-first-name"
                          type="text"
                          className={`w-full pl-10 pr-4 h-11 bg-background rounded-xl text-sm placeholder:text-muted-foreground/50 outline-none text-foreground font-medium transition-all shadow-2xs ${fieldErrors.firstName
                            ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                            : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                            }`}
                          placeholder="Enter First Name"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            clearFieldError("firstName");
                          }}
                          disabled={registering || (!!newPatient && !isEditMode)}
                          required
                        />
                      </div>
                      {fieldErrors.firstName && (
                        <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.firstName}</span>
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                        placeholder="Enter Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={registering || (!!newPatient && !isEditMode)}
                      />
                    </div>
                  </div>

                  {/* Age (Y/M/D) & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">

                    {/* Age Breakdown */}
                    <div className="sm:col-span-7 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Age (Years / Months / Days) <span className="text-rose-500 font-extrabold">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <input
                            id="input-age-years"
                            type="number"
                            min="0"
                            max="120"
                            placeholder="Years"
                            className={`w-full text-center h-11 bg-background rounded-xl text-sm placeholder:text-muted-foreground/50 outline-none text-foreground font-bold shadow-2xs ${fieldErrors.age
                              ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                              : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                              }`}
                            value={ageYears}
                            onChange={(e) => {
                              setAgeYears(e.target.value);
                              clearFieldError("age");
                            }}
                            disabled={registering || (!!newPatient && !isEditMode)}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">Y</span>
                        </div>
                        <div className="relative">
                          <input
                            id="input-age-months"
                            type="number"
                            min="0"
                            max="11"
                            placeholder="Months"
                            className={`w-full text-center h-11 bg-background rounded-xl text-sm placeholder:text-muted-foreground/50 outline-none text-foreground font-bold shadow-2xs ${fieldErrors.age
                              ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                              : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                              }`}
                            value={ageMonths}
                            onChange={(e) => {
                              setAgeMonths(e.target.value);
                              clearFieldError("age");
                            }}
                            disabled={registering || (!!newPatient && !isEditMode)}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">M</span>
                        </div>
                        <div className="relative">
                          <input
                            id="input-age-days"
                            type="number"
                            min="0"
                            max="30"
                            placeholder="Days"
                            className={`w-full text-center h-11 bg-background rounded-xl text-sm placeholder:text-muted-foreground/50 outline-none text-foreground font-bold shadow-2xs ${fieldErrors.age
                              ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                              : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                              }`}
                            value={ageDays}
                            onChange={(e) => {
                              setAgeDays(e.target.value);
                              clearFieldError("age");
                            }}
                            disabled={registering || (!!newPatient && !isEditMode)}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">D</span>
                        </div>
                      </div>
                      {fieldErrors.age && (
                        <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.age}</span>
                        </p>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Gender <span className="text-rose-500 font-extrabold">*</span>
                      </label>
                      <Select
                        value={gender}
                        onValueChange={(val) => {
                          setGender(val);
                          clearFieldError("gender");
                        }}
                        disabled={registering || (!!newPatient && !isEditMode)}
                      >
                        <SelectTrigger
                          id="input-gender-trigger"
                          className={`h-11 bg-background rounded-xl font-medium text-foreground shadow-2xs ${fieldErrors.gender
                            ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                            : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                            }`}
                        >
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors.gender && (
                        <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1 animate-shake">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{fieldErrors.gender}</span>
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Phone & Email (if enabled) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {isFieldEnabled("phone") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Phone / WhatsApp Number {isFieldRequired("phone") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-3 flex items-center gap-1.5 text-xs font-bold text-foreground/80 select-none pointer-events-none border-r border-zinc-300 dark:border-zinc-700 pr-2.5 z-10">
                            <span className="text-sm leading-none">🇮🇳</span>
                            <span className="font-mono text-[12.5px] tracking-tight">+91</span>
                          </div>
                          <input
                            id="input-phone"
                            type="tel"
                            maxLength={10}
                            className={`w-full pl-[74px] pr-4 h-11 bg-background rounded-xl text-sm placeholder:text-muted-foreground/50 outline-none text-foreground font-semibold tracking-wider transition-all shadow-2xs font-mono ${fieldErrors.phone
                              ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                              : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                              }`}
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              let digits = raw;
                              if (digits.startsWith("91") && digits.length > 10) {
                                digits = digits.slice(2);
                              } else if (digits.startsWith("0") && digits.length > 10) {
                                digits = digits.slice(1);
                              }
                              setPhone(digits.slice(0, 10));
                              clearFieldError("phone");
                            }}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("phone")}
                          />
                        </div>
                        {fieldErrors.phone ? (
                          <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1 animate-shake">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{fieldErrors.phone}</span>
                          </p>
                        ) : (
                          <p className="text-[10.5px] text-muted-foreground">Enter 10-digit number without country code (auto-prefixed with +91)</p>
                        )}
                      </div>
                    )}

                    {isFieldEnabled("email") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Email ID {isFieldRequired("email") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="email"
                            className="w-full pl-10 pr-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="patient@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("email")}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address (if enabled) */}
                  {isFieldEnabled("address") && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Residential Address {isFieldRequired("address") && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <textarea
                          rows={2}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs resize-none"
                          placeholder="Enter Complete Residential Address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={registering || (!!newPatient && !isEditMode)}
                          required={isFieldRequired("address")}
                        />
                      </div>
                    </div>
                  )}

                  {/* City, District, Pincode (if enabled) */}
                  {(isFieldEnabled("city") || isFieldEnabled("district") || isFieldEnabled("pincode")) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {isFieldEnabled("city") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Town / City {isFieldRequired("city") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter Town/City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("city")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("district") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            District {isFieldRequired("district") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter District"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("district")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("pincode") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Pincode {isFieldRequired("pincode") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="6-digit PIN"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("pincode")}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Government Digital Health Account (ABDM M1) Vault Module */}
                  <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.07] via-teal-500/[0.04] to-card border border-emerald-500/30 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              Ayushman Bharat Digital Health Account
                            </span>
                            <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                              Govt ABDM M1
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Unified digital health identifier for automatic report sync &amp; instant Aadhaar demographics.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {isAbhaVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Verified &amp; Linked</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAbhaModalOpen(true)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Instant OTP KYC</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 14-Digit ABHA Number Field */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between min-h-[20px]">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                            <span>14-Digit ABHA ID</span>
                            {isAbhaVerified && (
                              <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                                (Govt Verified)
                              </span>
                            )}
                          </label>
                          {abhaNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(abhaNumber);
                              }}
                              className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                              title="Copy ABHA Number"
                            >
                              Copy ID
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={17}
                            className="w-full pl-4 pr-10 h-11 bg-background border border-emerald-500/40 dark:border-emerald-500/30 focus:border-emerald-600 rounded-xl text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground/50 outline-none transition-all shadow-2xs"
                            placeholder="e.g. 91-1234-5678-9012"
                            value={abhaNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d-]/g, "");
                              setAbhaNumber(val);
                            }}
                            disabled={registering || (!!newPatient && !isEditMode)}
                          />
                          {isAbhaVerified && (
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ABHA Address (PHR Handle) Field */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between min-h-[20px]">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            ABHA PHR Address
                          </label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Auto-syncs lab reports
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            className="w-full pl-4 pr-16 h-11 bg-background border border-emerald-500/40 dark:border-emerald-500/30 focus:border-emerald-600 rounded-xl text-sm font-mono font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-all shadow-2xs"
                            placeholder="username"
                            value={abhaAddress ? abhaAddress.replace(/@abdm$/, "") : ""}
                            onChange={(e) => {
                              const val = e.target.value.trim().replace(/@.*$/, "");
                              setAbhaAddress(val ? `${val}@abdm` : "");
                            }}
                            disabled={registering || (!!newPatient && !isEditMode)}
                          />
                          <span className="absolute right-3 px-2 py-1 rounded bg-muted/80 border border-border/60 text-[10px] font-mono font-bold text-muted-foreground pointer-events-none">
                            @abdm
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Clinical Referrals & Sample Collection Logistics */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <span>Referral & Sample Collection Protocol</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                      Step 2
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">

                    {/* Doctor Referral */}
                    {isFieldEnabled("refDoctor") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between min-h-[22px] h-[22px] gap-1">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider truncate whitespace-nowrap">
                            Referred By {isFieldRequired("refDoctor") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsDoctorModalOpen(true)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            className="inline-flex items-center gap-1 text-[10px] text-primary font-bold hover:underline cursor-pointer shrink-0"
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>+ Doctor</span>
                          </button>
                        </div>
                        <Select
                          value={refDoctorSelect}
                          onValueChange={(val) => {
                            setRefDoctorSelect(val);
                            clearFieldError("refDoctor");
                          }}
                          disabled={registering || (!!newPatient && !isEditMode)}
                        >
                          <SelectTrigger
                            id="input-ref-doctor"
                            className={`h-11 bg-background rounded-xl font-medium text-foreground shadow-2xs ${fieldErrors.refDoctor
                              ? "border-2 border-rose-500 ring-2 ring-rose-500/20 focus:border-rose-500"
                              : "border border-zinc-400 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                              }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {doctorsList.map((doc) => (
                              <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.refDoctor && (
                          <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1 animate-shake">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{fieldErrors.refDoctor}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Second Referral (if enabled) */}
                    {isFieldEnabled("secondReferral") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between min-h-[22px] h-[22px] gap-1">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider truncate whitespace-nowrap">
                            Second Referral {isFieldRequired("secondReferral") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                        </div>
                        <input
                          type="text"
                          className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                          placeholder="Secondary Doctor / Clinic"
                          value={secondReferral}
                          onChange={(e) => setSecondReferral(e.target.value)}
                          disabled={registering || (!!newPatient && !isEditMode)}
                          required={isFieldRequired("secondReferral")}
                        />
                      </div>
                    )}

                    {/* Collection Center: Only visible for Central Lab Admin / Staff. Completely hidden from CC and B2B portal */}
                    {currentUserRole !== "COLLECTION_CENTER" && currentUserRole !== "B2B" && isFieldEnabled("collectedAt") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between min-h-[22px] h-[22px] gap-1">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider truncate whitespace-nowrap" title="Collection Center">
                            Collection Center {isFieldRequired("collectedAt") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCollectionModalOpen(true)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            className="inline-flex items-center gap-1 text-[10px] text-primary font-bold hover:underline cursor-pointer shrink-0"
                          >
                            <Building className="h-3 w-3" />
                            <span>+ Center</span>
                          </button>
                        </div>
                        <Select value={collectedAtSelect} onValueChange={setCollectedAtSelect} disabled={registering || (!!newPatient && !isEditMode)}>
                          <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
                            <SelectValue placeholder="Select Collection Center" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(["Main Lab", ...collectionPoints, collectedAtSelect].filter(Boolean))).map((point) => (
                              <SelectItem key={point} value={point}>{point}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedB2bCenter && (
                          <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span className="font-bold">B2B Partner Intake:</span>
                            <span className="truncate">Sample linked to {selectedB2bCenter.name}&apos;s account &amp; wallet balance will be debited.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Phlebotomist / Collector - Permanently visible so it never disappears upon center selection */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between min-h-[22px] h-[22px] gap-1">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider truncate whitespace-nowrap">
                          Collected By {isFieldRequired("collectedBy") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsPhleboModalOpen(true)}
                          disabled={registering || (!!newPatient && !isEditMode)}
                          className="inline-flex items-center gap-1 text-[10px] text-primary font-bold hover:underline cursor-pointer shrink-0"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>+ Staff</span>
                        </button>
                      </div>
                      <Select value={collectedBySelect} onValueChange={setCollectedBySelect} disabled={registering || (!!newPatient && !isEditMode)}>
                        <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
                          <SelectValue placeholder="Select Staff / Phlebotomist" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set(["Self / Lab Staff", ...phlebotomists, collectedBySelect].filter(Boolean))).map((phlebo) => (
                            <SelectItem key={phlebo} value={phlebo}>{phlebo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Collection Date & Time */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between min-h-[22px] h-[22px] gap-1">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider truncate whitespace-nowrap">
                          Collection Date &amp; Time
                        </label>
                      </div>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="datetime-local"
                          suppressHydrationWarning
                          className="w-full pl-9 pr-1 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-xs font-semibold focus:border-zinc-900 dark:focus:border-white focus:ring-1 outline-none text-foreground transition-all shadow-2xs"
                          value={collectionDateTime}
                          onChange={(e) => setCollectionDateTime(e.target.value)}
                          disabled={registering || (!!newPatient && !isEditMode)}
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Section 3: Identification, Insurance & Corporate Accounts (if enabled) */}
                {(isFieldEnabled("aadhaarNo") || isFieldEnabled("insuranceNo") || isFieldEnabled("tpa") || isFieldEnabled("hfrId") || isFieldEnabled("uhid") || isFieldEnabled("passportNumber") || isFieldEnabled("corporateName") || isFieldEnabled("corporatePlan") || isFieldEnabled("govPanel")) && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Identification, Insurance & Corporate Accounts</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                        Step 3
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {isFieldEnabled("aadhaarNo") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Aadhaar No. {isFieldRequired("aadhaarNo") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            maxLength={16}
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter 12-digit Aadhaar / ID"
                            value={aadhaarNo}
                            onChange={(e) => setAadhaarNo(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("aadhaarNo")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("insuranceNo") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Insurance Policy No. {isFieldRequired("insuranceNo") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter Policy / Card Number"
                            value={insuranceNo}
                            onChange={(e) => setInsuranceNo(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("insuranceNo")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("tpa") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            TPA / Insurance Desk {isFieldRequired("tpa") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter TPA Name"
                            value={tpa}
                            onChange={(e) => setTpa(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("tpa")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("hfrId") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            HFR / ABHA Health ID {isFieldRequired("hfrId") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter HFR ID / ABHA"
                            value={hfrId}
                            onChange={(e) => setHfrId(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("hfrId")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("uhid") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            UHID (Hospital ID) {isFieldRequired("uhid") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Unique Hospital ID"
                            value={uhid}
                            onChange={(e) => setUhid(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("uhid")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("passportNumber") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Passport Number {isFieldRequired("passportNumber") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Passport Number"
                            value={passportNumber}
                            onChange={(e) => setPassportNumber(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("passportNumber")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("corporateName") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Corporate Client {isFieldRequired("corporateName") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Company / Corporate Name"
                            value={corporateName}
                            onChange={(e) => setCorporateName(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("corporateName")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("corporatePlan") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Corporate Plan {isFieldRequired("corporatePlan") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Corporate Plan Type"
                            value={corporatePlan}
                            onChange={(e) => setCorporatePlan(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("corporatePlan")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("govPanel") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Government Panel {isFieldRequired("govPanel") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="CGHS / ECHS / State Panel"
                            value={govPanel}
                            onChange={(e) => setGovPanel(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("govPanel")}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4: Physical Metrics & Veterinary Records (if enabled) */}
                {(isFieldEnabled("height") || isFieldEnabled("weight") || isFieldEnabled("ownerName") || isFieldEnabled("breed") || isFieldEnabled("species")) && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Activity className="h-4 w-4 text-primary" />
                        <span>Physical Metrics & Veterinary Details</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                        Step 4
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {isFieldEnabled("height") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Height (cm / ft) {isFieldRequired("height") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="e.g. 175 cm"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("height")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("weight") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Weight (kg) {isFieldRequired("weight") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="e.g. 70 kg"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("weight")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("ownerName") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Owner Name (Vet) {isFieldRequired("ownerName") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Pet / Animal Owner"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("ownerName")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("breed") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Breed {isFieldRequired("breed") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="e.g. Labrador / Persian"
                            value={breed}
                            onChange={(e) => setBreed(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("breed")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("species") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Species {isFieldRequired("species") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Canine / Feline / Bovine"
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                            disabled={registering || (!!newPatient && !isEditMode)}
                            required={isFieldRequired("species")}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Action CTA */}
                {(!newPatient || isEditMode) && (
                  <div className="pt-5 border-t border-border/80">
                    {isEditMode ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <Link
                          href="/dashboard/patients"
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card/80 hover:bg-accent text-foreground font-semibold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Back to Patients</span>
                        </Link>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => handleRegisterPatient(e, true)}
                            disabled={registering}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                          >
                            <FlaskConical className="h-4 w-4" />
                            <span>Update & Select Tests</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRegisterPatient(e, false)}
                            disabled={registering}
                            className="gradient-primary text-primary-foreground font-bold px-7 py-3 rounded-xl ring-inset-top transition-all hover:-translate-y-px hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 text-xs sm:text-sm shadow-md cursor-pointer"
                          >
                            {registering ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Updating Details…</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Update Patient Details</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="submit"
                          disabled={registering}
                          className="gradient-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl ring-inset-top transition-all hover:-translate-y-px hover:shadow-lg active:scale-[0.99] flex items-center gap-2 disabled:opacity-60 text-sm shadow-md cursor-pointer"
                        >
                          {registering ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Saving Demographics…</span>
                            </>
                          ) : (
                            <>
                              <span>Save & Select Clinical Tests</span>
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </form>

              {/* Interactive Test Catalog Banner */}
              <div
                onClick={() => newPatient && setIsModalOpen(true)}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${newPatient
                  ? "bg-accent/60 border-primary cursor-pointer shadow-md hover:bg-accent/80"
                  : "bg-muted/30 border-dashed border-border/80 opacity-70 cursor-not-allowed"
                  }`}
              >
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 p-3.5 shadow-sm ${newPatient ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                    <FlaskConical className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">Diagnostic Investigation Catalog</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {newPatient
                        ? `${selectedTestObjects.length + selectedOutsourceTests.length} investigations linked (${selectedTestObjects.length} in-house${selectedOutsourceTests.length > 0 ? `, ${selectedOutsourceTests.length} outsource` : ""}). Click here to add, search or modify panels.`
                        : "Save the patient intake form above to unlock full test investigations."}
                    </p>
                  </div>
                </div>

                {newPatient && (
                  <span className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs shrink-0 shadow-sm flex items-center gap-2">
                    <span>Manage Tests ({selectedTestObjects.length + selectedOutsourceTests.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              {/* Smart Specimen Tube Triage & Multi-Vial Barcode Assignment */}
              {newPatient && specimenTubes.length > 0 && (
                <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-sm space-y-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs">
                        <TestTube2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-base text-foreground">
                            Specimen Tube Triage & Multi-Vial Barcoding
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Smart Phlebotomy
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tests automatically grouped by vacutainer additive. Scan or enter vial barcodes per tube.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-foreground border border-border">
                        {specimenTubes.length} Tubes Required
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${specimenTubes.every(t => vialBarcodes[t.tubeType]?.trim())
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}>
                        {specimenTubes.every(t => vialBarcodes[t.tubeType]?.trim()) ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>All Tubes Labeled</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="h-3.5 w-3.5" />
                            <span>
                              {specimenTubes.filter(t => vialBarcodes[t.tubeType]?.trim()).length} / {specimenTubes.length} Scanned
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {specimenTubes.map((tube, idx) => {
                      const isScanned = Boolean(vialBarcodes[tube.tubeType]?.trim());
                      return (
                        <div
                          key={tube.tubeType}
                          className="rounded-xl border border-border/80 bg-background/80 hover:bg-background transition-all p-4 flex flex-col justify-between space-y-3 relative overflow-hidden shadow-xs hover:border-border"
                          style={{ borderLeftWidth: 4, borderLeftColor: tube.capColor }}
                        >
                          {/* Tube Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs"
                                style={{ backgroundColor: tube.capColor }}
                              >
                                #{idx + 1}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-foreground leading-snug">
                                  {tube.tubeTitle}
                                </h5>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                  {tube.specimenType} · <span className="italic">{tube.additive}</span>
                                </p>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${isScanned
                              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              }`}>
                              {isScanned ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Labeled</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" />
                                  <span>Pending</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Bundled Tests */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {tube.tests.map(test => (
                              <span
                                key={test.id}
                                className="px-2 py-0.5 rounded-md bg-muted/80 text-foreground text-[11px] font-medium border border-border/50 truncate max-w-[200px]"
                                title={test.name}
                              >
                                {test.name}
                              </span>
                            ))}
                          </div>

                          {/* Barcode Scanner & Input */}
                          <div className="pt-2 border-t border-border/60">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                              {tube.tubeType} Vial Barcode
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <input
                                  id={`vial-barcode-input-${idx}`}
                                  type="text"
                                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground/60"
                                  placeholder={`Scan ${tube.tubeType} barcode…`}
                                  value={vialBarcodes[tube.tubeType] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setVialBarcodes(prev => ({ ...prev, [tube.tubeType]: val }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const nextInput = document.getElementById(`vial-barcode-input-${idx + 1}`);
                                      if (nextInput) {
                                        (nextInput as HTMLInputElement).focus();
                                      }
                                    }
                                  }}
                                />
                              </div>

                              <button
                                type="button"
                                title="Auto-generate vial barcode"
                                onClick={() => {
                                  const prefix = newPatient?.customId || "VIAL";
                                  const autoCode = `${prefix}-${tube.tubeType}-${Math.floor(1000 + Math.random() * 9000)}`;
                                  setVialBarcodes(prev => ({ ...prev, [tube.tubeType]: autoCode }));
                                }}
                                className="px-2.5 py-2 text-[11px] font-bold rounded-lg border border-border bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="hidden sm:inline">Auto</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Right 4 Cols: Real-Time Billing & Invoicing Panel */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">

              <div className="rounded-2xl border border-border/90 bg-card shadow-sm overflow-hidden">
                <div className="bg-muted/60 px-5 py-4 border-b border-border/80 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Real-time Invoice Summary</span>
                  </h3>
                  {(selectedTestObjects.length + selectedOutsourceTests.length) > 0 && (
                    <span className="text-[11px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      {selectedTestObjects.length + selectedOutsourceTests.length} Tests
                    </span>
                  )}
                </div>

                {/* Selected Tests Breakdown */}
                <div className="p-4 min-h-[160px] max-h-[260px] overflow-y-auto space-y-2">
                  {isEditLoading ? (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1.5 flex-1 pr-4">
                          <Skeleton className="h-3.5 w-3/4 rounded" />
                          <Skeleton className="h-2.5 w-1/3 rounded" />
                        </div>
                        <Skeleton className="h-4 w-12 rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1.5 flex-1 pr-4">
                          <Skeleton className="h-3.5 w-2/3 rounded" />
                          <Skeleton className="h-2.5 w-1/4 rounded" />
                        </div>
                        <Skeleton className="h-4 w-12 rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1.5 flex-1 pr-4">
                          <Skeleton className="h-3.5 w-4/5 rounded" />
                          <Skeleton className="h-2.5 w-1/3 rounded" />
                        </div>
                        <Skeleton className="h-4 w-12 rounded" />
                      </div>
                    </div>
                  ) : (selectedTestObjects.length === 0 && selectedOutsourceTests.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                      <FlaskConical className="h-9 w-9 opacity-30 mb-2" />
                      <p className="text-xs font-semibold">No tests added yet.</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Save patient to select from directory</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {selectedTestObjects.map((test) => {
                        const b2bRate = test.b2bPrice ?? (test as any).b2b_price;
                        const showB2B = isB2B && (b2bRate !== undefined && b2bRate !== null);
                        return (
                          <li key={`inhouse-${test.id}`} className="py-2.5 flex justify-between items-center gap-2 group">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                              <p className="text-[10px] text-muted-foreground">{test.category || "Pathology"}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {showB2B ? (
                                <div className="text-right leading-tight">
                                  <div className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                                    B2B ₹{Number(b2bRate ?? test.price).toFixed(0)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    MRP ₹{Number(test.price).toFixed(0)}
                                  </div>
                                </div>
                              ) : (
                                <span className="font-mono text-xs font-bold text-foreground">₹{Number(test.price).toFixed(0)}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedTest(test)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                                title={`Remove ${test.name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                      {selectedOutsourceTests.map((test, idx) => (
                        <li key={`outsource-${test.id || idx}`} className="py-2.5 flex justify-between items-center gap-2 bg-purple-500/5 px-2 -mx-2 rounded-lg">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
                                Outsource
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{outsourcePartnerLab} • {test.category || "External Lab"}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-xs font-bold text-foreground">₹{Number(test.price).toFixed(0)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOutsourceTest(idx)}
                              className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                              title="Remove outsource test"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Totals & Quick Pay */}
                <div className="p-5 bg-muted/40 border-t border-border/80 space-y-3.5">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>Gross Subtotal</span>
                      {isEditLoading ? (
                        <Skeleton className="h-4 w-16 rounded" />
                      ) : (
                        <span className="font-mono font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                      )}
                    </div>

                    {/* Concession / Discount Input */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                      <span className="text-muted-foreground font-medium">Discount Concession</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-muted-foreground">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={subtotal}
                          placeholder="0"
                          value={discount === "0" ? "" : discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          disabled={isEditLoading}
                          className="w-20 px-2 py-1 bg-background border border-border/80 rounded-md font-mono text-xs font-bold text-right outline-none focus:border-primary text-foreground disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {parsedDiscount > 0 && (
                      <div className="flex justify-between text-destructive font-semibold">
                        <span>Concession Applied</span>
                        <span className="font-mono">-₹{parsedDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Total Bill / Net after Concession */}
                    <div className="flex justify-between items-center pt-1 border-t border-border/60 text-muted-foreground">
                      <span className="font-medium">Total Bill Amount</span>
                      <span className="font-mono font-bold text-foreground">₹{grandTotal.toFixed(2)}</span>
                    </div>

                    {/* Advance Payment Input */}
                    <div className="space-y-1.5 pt-1.5 border-t border-border/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground font-medium">Advance Payment</span>
                          {parsedPaid > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {parsedPaid >= grandTotal ? "Full" : "Partial"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-muted-foreground">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={grandTotal}
                            placeholder="0"
                            value={paidAmount === "0" ? "" : paidAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPaidAmount(val);
                            }}
                            disabled={isEditLoading}
                            className="w-24 px-2 py-1 bg-background border border-border/80 rounded-md font-mono text-xs font-bold text-right outline-none focus:border-primary text-foreground disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Advance Applied Line */}
                      {parsedPaid > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/40">
                          <span>Advance Received</span>
                          <span className="font-mono font-bold">-₹{parsedPaid.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Mode (Unpaid / Cash / UPI) */}
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium text-xs">Payment Mode</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedPaymentMode === "UNPAID"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : selectedPaymentMode === "UPI"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}>
                          {selectedPaymentMode === "UNPAID"
                            ? "Unpaid · Payment Due"
                            : selectedPaymentMode === "UPI"
                              ? "UPI · Settles Paid"
                              : "Cash · Settles Paid"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMode("UNPAID");
                          }}
                          disabled={isEditLoading}
                          className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                            selectedPaymentMode === "UNPAID"
                              ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30"
                              : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Unpaid</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMode("CASH");
                            setPaidAmount("0");
                          }}
                          disabled={isEditLoading}
                          className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                            selectedPaymentMode === "CASH"
                              ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/30"
                              : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <Banknote className="h-3.5 w-3.5 shrink-0" />
                          <span>Cash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMode("UPI");
                            setPaidAmount("0");
                          }}
                          disabled={isEditLoading}
                          className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                            selectedPaymentMode === "UPI"
                              ? "bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/30"
                              : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <QrCode className="h-3.5 w-3.5 shrink-0" />
                          <span>UPI</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Net Payable / Remaining Balance Due */}
                  <div className="pt-2.5 border-t border-border/80 space-y-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm text-foreground block">
                          {(isAutoPaidMode && grandTotal > 0 && !userEnteredPartial) || balanceDue <= 0 ? "Remaining Balance" : "Net Payable"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {(isAutoPaidMode && grandTotal > 0 && !userEnteredPartial)
                            ? `Bill settled completely via ${selectedPaymentMode}`
                            : (parsedPaid > 0
                              ? (balanceDue <= 0 ? "Bill settled completely" : `₹${parsedPaid.toFixed(2)} advance deducted`)
                              : "Payment due upon invoicing")}
                        </span>
                      </div>
                      {isEditLoading ? (
                        <Skeleton className="h-7 w-24 rounded" />
                      ) : (
                        <div className="text-right">
                          <span className={`font-display text-2xl font-bold font-mono ${
                            (isAutoPaidMode && grandTotal > 0 && !userEnteredPartial) || (balanceDue <= 0 && grandTotal > 0)
                              ? "text-emerald-600 dark:text-emerald-400"
                              : balanceDue > 0 && parsedPaid > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-primary"
                            }`}>
                            ₹{((isAutoPaidMode && grandTotal > 0 && !userEnteredPartial) ? 0 : balanceDue).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                      <span className="text-muted-foreground">
                        Bill Status:
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        (isAutoPaidMode && grandTotal > 0 && !userEnteredPartial) || (balanceDue <= 0 && grandTotal > 0)
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          : parsedPaid > 0
                            ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                        }`}>
                        {(isAutoPaidMode && grandTotal > 0 && !userEnteredPartial) || (balanceDue <= 0 && grandTotal > 0) ? "PAID FULL" : (parsedPaid > 0 ? "PARTIAL DUE" : "UNPAID DUE")}
                      </span>
                    </div>
                  </div>

                  {/* Settlement is handled on the next step after invoice generation */}

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={(selectedTests.length === 0 && selectedOutsourceTests.length === 0) || booking || !newPatient}
                    className="w-full gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold text-xs ring-inset-top hover:-translate-y-px active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 shadow-md"
                  >
                    {booking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{isEditMode ? "Updating Booking & Invoice…" : "Generating Invoice & Barcode…"}</span>
                      </>
                    ) : (
                      <>
                        <span>{isEditMode ? "Update Booking & Generate Invoice" : "Generate Invoice & Barcode"}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Booking Confirmed State (Horizontal Full-Width Premium UI/UX Deck) */
        <div className="max-w-6xl w-full mx-auto space-y-6 animate-fade-in text-foreground pb-8">

          {/* Top Hero Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 text-center sm:text-left">
              <div className="h-16 w-16 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg ring-4 ring-primary/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Registration & Billing Finalized
                  </span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Patient Intake & Diagnostic Order Confirmed
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Patient record and billing receipt successfully created in LIS. Ready for sample processing.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-card border border-border/80 text-right shadow-2xs">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoice / Bill ID</p>
                <p className="font-mono text-base font-bold text-primary">{successDetails?.billCustomId}</p>
              </div>
            </div>
          </div>

          {/* 3-Column Landscape Information Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* Column 1: Patient Identity (4 cols) */}
            <div className="lg:col-span-4 bg-card border border-border/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">Patient Profile</h3>
                  <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 bg-muted rounded">
                    {successDetails?.patientCustomId}
                  </span>
                </div>

                <div className="pt-4 space-y-3.5 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</p>
                    <p className="font-bold text-base text-foreground mt-0.5">{successDetails?.patientName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Age & Gender</p>
                      <p className="font-bold text-foreground mt-0.5">
                        {successDetails?.patientAge !== undefined ? `${successDetails.patientAge} Y` : "N/A"} · {successDetails?.patientGender || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</p>
                      <p className="font-mono font-bold text-foreground mt-0.5">{successDetails?.patientPhone || "N/A"}</p>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Referred By</p>
                    <p className="font-bold text-foreground mt-0.5">{successDetails?.refDoctor || "Self"}</p>
                  </div>

                  <div className="pt-1 border-t border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collection Point</p>
                    <p className="font-bold text-foreground mt-0.5">{successDetails?.collectedAt || "Main Lab"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Diagnostic Investigations & Financials (4 cols) */}
            <div className="lg:col-span-4 bg-card border border-border/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-foreground">Assigned Investigations</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                    {successDetails?.tests?.length || 0} Tests
                  </span>
                </div>

                {successDetails?.packageName && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5" />
                      <span>Package:</span>
                    </span>
                    <span className="font-bold text-foreground truncate max-w-[180px]">{successDetails.packageName}</span>
                  </div>
                )}

                {/* Tests List */}
                <div className="pt-3 max-h-[140px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {successDetails?.tests && successDetails.tests.length > 0 ? (
                    successDetails.tests.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-foreground truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.category}</p>
                        </div>
                        <span className="font-mono font-bold text-foreground shrink-0">₹{t.price}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Standard clinical investigation panel</p>
                  )}
                </div>
              </div>

              {/* Financial Tally */}
              <div className="pt-3 border-t border-border/80 space-y-1.5 text-xs bg-muted/20 p-3 rounded-xl">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Total</span>
                  <span className="font-mono">₹{((successDetails?.total || 0) + (successDetails?.discount || 0)).toFixed(2)}</span>
                </div>
                {(successDetails?.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Concession / Discount</span>
                    <span className="font-mono">-₹{(successDetails?.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/60">
                  <span>Net Bill Amount</span>
                  <span className="font-mono text-primary font-extrabold">₹{(successDetails?.total || 0).toFixed(2)}</span>
                </div>

                {(successDetails?.paidAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Advance Received ({successDetails?.paymentMode || "CASH"})</span>
                    <span className="font-mono font-bold">-₹{(successDetails?.paidAmount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-extrabold text-foreground pt-1 border-t border-border/60">
                  <span>Remaining Balance Due</span>
                  <span className={`font-mono text-sm ${(successDetails?.balanceDue || 0) > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400"}`}>
                    ₹{(successDetails?.balanceDue || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Status: <strong className="text-foreground">{successDetails?.paymentStatus || "UNPAID"}</strong>
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${(successDetails?.balanceDue || 0) <= 0
                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    : (successDetails?.paidAmount || 0) > 0
                      ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                      : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                    }`}>
                    {(successDetails?.balanceDue || 0) <= 0 ? "PAID FULL" : (successDetails?.paidAmount || 0) > 0 ? "PARTIAL" : "UNPAID"}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: High-Priority Next Actions (4 cols) */}
            <div className="lg:col-span-4 bg-gradient-to-b from-card to-muted/30 border border-border/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">Clinical Next Actions</h3>
                </div>

                <div className="pt-4 space-y-3">
                  {/* Action 1: Print Invoice */}
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="w-full p-3.5 rounded-xl border-2 border-primary/40 bg-card hover:bg-primary/5 hover:border-primary text-foreground transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Printer className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Print / Download Invoice</p>
                        <p className="text-[10px] text-muted-foreground">Receipt #{successDetails?.billCustomId}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Action 2: Enter Diagnostic Results (Admin/Tech) OR Register Next Sample (Receptionist / Collection Center / B2B) */}
                  {(currentUserRole === "COLLECTION_CENTER" || currentUserRole === "B2B" || currentUserRole === "RECEPTIONIST") ? (
                    <button
                      type="button"
                      onClick={handleResetFlow}
                      className="w-full p-3.5 rounded-xl gradient-primary text-primary-foreground transition-all flex items-center justify-between group shadow-md hover:-translate-y-0.5 cursor-pointer ring-inset-top"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <PlusCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Register Next Sample</p>
                          <p className="text-[10px] text-white/80">Intake next patient for testing</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : !successDetails?.reportId ? (
                    <Link href="/dashboard/cases/outsource" className="block">
                      <button
                        type="button"
                        className="w-full p-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all flex items-center justify-between group shadow-md hover:-translate-y-0.5 cursor-pointer ring-inset-top"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <ExternalLink className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">View Outsource Cases</p>
                            <p className="text-[10px] text-white/80">Track outsourced dispatch & partner reports</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/reports/${successDetails?.reportId}/edit`} className="block">
                      <button
                        type="button"
                        className="w-full p-3.5 rounded-xl gradient-primary text-primary-foreground transition-all flex items-center justify-between group shadow-md hover:-translate-y-0.5 cursor-pointer ring-inset-top"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Enter Test Results</p>
                            <p className="text-[10px] text-white/80">Input test values & authorize report</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Bottom Quick Links */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResetFlow}
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Register Fresh</span>
                </button>
                <div className="flex items-center gap-3">
                  <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground font-semibold">
                    Reports List
                  </Link>
                  <span className="text-muted-foreground/40">·</span>
                  <Link href="/dashboard/patients" className="text-muted-foreground hover:text-foreground font-semibold">
                    Patients
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* Specimen Tubes & Multi-Vial Barcodes Confirmed Summary */}
          {specimenTubes.length > 0 && (
            <div className="bg-card border border-border/90 rounded-2xl p-6 shadow-xs space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs">
                    <TestTube2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Collected Specimen Tubes & Assigned Barcodes
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vacutainer barcodes registered for laboratory analyzers and specimen routing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{specimenTubes.length} Tubes Processed</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {specimenTubes.map((tube, idx) => {
                  const assignedBarcode = (successDetails?.vialBarcodes && successDetails.vialBarcodes[tube.tubeType]) || vialBarcodes[tube.tubeType];
                  return (
                    <div
                      key={tube.tubeType}
                      className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between space-y-3 shadow-xs"
                      style={{ borderLeftWidth: 4, borderLeftColor: tube.capColor }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: tube.capColor }}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-xs text-foreground">{tube.tubeTitle}</span>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">{tube.specimenType}</span>
                      </div>

                      <div className="flex items-center justify-between bg-card border border-border/80 px-3 py-2 rounded-lg shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                          <Barcode className="h-3.5 w-3.5 text-primary" />
                          Barcode:
                        </span>
                        <span className="font-mono text-xs font-black text-primary">
                          {assignedBarcode || "AUTO-ASSIGNED"}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate">
                        <span className="font-semibold text-foreground/80">Investigations: </span>
                        {tube.tests.map(t => t.name).join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}



        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. Test Selection Catalog Modal (Horizontal Landscape) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-3xl bg-card border border-border shadow-2xl animate-scale-in">
          <DialogTitle className="sr-only">Diagnostic Test Directory</DialogTitle>

          {/* Header */}
          <div className="flex flex-col gap-3 px-4 sm:px-6 py-4 border-b border-border/80 shrink-0 bg-card">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
                  <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold text-foreground">Diagnostic Investigation Catalog</h2>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                    Patient: <strong className="text-foreground">{newPatient?.name}</strong> · <span className="font-mono">{newPatient?.customId}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Top Navigation Tabs: Diagnostic Tests vs Packages vs Outsource — Full-width grid on mobile */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/70 rounded-xl border border-border/80">
              <button
                type="button"
                onClick={() => setCatalogMode("TESTS")}
                className={`py-2 px-2 sm:px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none ${catalogMode === "TESTS"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <FlaskConical className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Tests</span>
                {selectedTestObjects.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary text-primary-foreground font-mono shrink-0">
                    {selectedTestObjects.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCatalogMode("PACKAGES")}
                className={`py-2 px-2 sm:px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none ${catalogMode === "PACKAGES"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Boxes className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Packages</span>
              </button>

              <button
                type="button"
                onClick={() => setCatalogMode("OUTSOURCE")}
                className={`py-2 px-2 sm:px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none ${catalogMode === "OUTSOURCE"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Outsource</span>
                {selectedOutsourceTests.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-purple-700 font-bold font-mono shrink-0">
                    {selectedOutsourceTests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {bookingError && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs font-semibold text-destructive shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{bookingError}</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="p-4 border-b border-border/80 shrink-0 space-y-2.5 bg-card/60">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={testSearchInputRef}
                autoFocus
                className="w-full pl-10 pr-4 py-2 bg-background border border-border/90 rounded-xl text-xs placeholder:text-muted-foreground/60 focus:border-primary outline-none text-foreground font-medium shadow-2xs"
                placeholder={
                  catalogMode === "TESTS"
                    ? "Search test name or code (e.g. CBC, LFT, KFT, Glucose)…"
                    : catalogMode === "PACKAGES"
                      ? "Search diagnostic package name or code (e.g. Full Body, Cardiac)…"
                      : "Search investigations to outsource (e.g. Biopsy, Vitamin D, Genetic Panel)…"
                }
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
              />
            </div>

            {/* If Tests or Outsource mode: show Category Chips */}
            {catalogMode === "TESTS" || catalogMode === "OUTSOURCE" ? (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
                <button
                  onClick={() => setActiveCategory("ALL")}
                  className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 cursor-pointer ${activeCategory === "ALL"
                    ? catalogMode === "OUTSOURCE"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 cursor-pointer ${activeCategory === cat
                      ? catalogMode === "OUTSOURCE"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">Available Health Bundles & Packages</span>
                </div>
                {selectedPackage && (
                  <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full font-bold text-xs border border-primary/20">
                    <span>Active: {selectedPackage.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPackage) {
                          const resolved = resolvePackageTestIds(selectedPackage, availableTests);
                          setSelectedTests((prev) => prev.filter((id) => !resolved.includes(id)));
                          setSelectedPackage(null);
                        }
                      }}
                      className="text-xs hover:underline text-primary/80"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Catalog Body: Tests, Packages, or Outsource Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-background custom-scrollbar">
            {catalogMode === "PACKAGES" ? (
              filteredPackagesForCatalog.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-2">
                  <Boxes className="h-10 w-10 mx-auto opacity-30 text-primary" />
                  <p className="text-xs font-bold text-foreground">No diagnostic packages found.</p>
                  <p className="text-[11px]">Check the spelling or configure new packages under Tests &gt; Packages.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredPackagesForCatalog.map((pkg: LabPackage) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const testCount = pkg.tests?.length || pkg.testIds?.length || 0;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handleTogglePackage(pkg)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between gap-3 shadow-2xs ${isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md"
                          : "bg-card border-border/90 hover:border-primary/50 hover:shadow-xs"
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {pkg.code}
                            </span>
                            {isB2B && ((pkg as any).b2bPrice ?? (pkg as any).b2b_price) ? (
                              <div className="flex flex-col items-end leading-tight">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  B2B ₹{Number((pkg as any).b2bPrice ?? (pkg as any).b2b_price).toFixed(0)}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                  MRP ₹{pkg.price.toFixed(0)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-sm font-extrabold text-primary">
                                ₹{pkg.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-foreground text-sm">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {pkg.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border/60">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-semibold">Includes {testCount} Investigations</span>
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                              }`}>
                              {isSelected ? "Selected" : "Select Package"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(pkg.tests || []).slice(0, 3).map((t: any, idx: number) => (
                              <span key={idx} className="text-[9.5px] font-medium bg-muted/60 px-1.5 py-0.5 rounded text-foreground/80 truncate max-w-[110px]">
                                {t.name}
                              </span>
                            ))}
                            {testCount > 3 && (
                              <span className="text-[9.5px] font-bold text-primary">+{testCount - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : catalogMode === "OUTSOURCE" ? (
              <div className="space-y-6">
                {/* Outsource Routing & Partner Lab Controls */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3.5">
                  <div className="flex flex-col gap-3">
                    {/* Title row */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Outsource Laboratory Routing</h4>
                        <p className="text-[10px] text-muted-foreground">Select destination diagnostic center for outsourced investigations</p>
                      </div>
                    </div>

                    {/* Partner Lab Selector — full-width on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="text-[11px] font-bold text-foreground/80 shrink-0">Partner Lab:</label>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Select value={outsourcePartnerLab} onValueChange={handlePartnerLabChange}>
                          <SelectTrigger className="h-9 flex-1 min-w-0 bg-background border-border text-xs font-semibold rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {outsourcePartnerLabsList.map((lab) => {
                              const testCount = lab.tests?.length || 0;
                              return (
                                <SelectItem key={lab.id || lab.name} value={lab.name} className="text-xs">
                                  <div className="flex items-center justify-between gap-3 w-full">
                                    <span className="font-semibold">{lab.name}</span>
                                    {testCount > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        {testCount} rates
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                            <SelectItem value="Other Partner Lab" className="text-xs text-muted-foreground italic">
                              + Other Partner Lab...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Link
                          href="/dashboard/cases/outsource"
                          target="_blank"
                          className="inline-flex flex-row items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer shadow-2xs"
                          title="Manage partner labs and test contract prices in Outsource Cases"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden sm:inline">Manage Labs</span>
                          <span className="sm:hidden">Manage</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {outsourcePartnerLab === "Other Partner Lab" && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-xs placeholder:text-muted-foreground outline-none focus:border-emerald-500 text-foreground"
                        placeholder="Enter custom partner lab name..."
                        value={outsourcePartnerLabCustom}
                        onChange={(e) => setOutsourcePartnerLabCustom(e.target.value)}
                      />
                    </div>
                  )}


                  {/* Selected Outsource Tests Quick Pills */}
                  {selectedOutsourceTests.length > 0 && (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Selected Outsource Investigations ({selectedOutsourceTests.length}):
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          Total: ₹{selectedOutsourceTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedOutsourceTests.map((t, idx) => (
                          <span
                            key={t.id || `custom-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-card border border-emerald-500/40 text-foreground font-medium shadow-2xs"
                          >
                            <span>{t.name}</span>
                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">₹{t.price}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOutsourceTest(idx)}
                              className="hover:text-destructive text-muted-foreground ml-1 p-0.5 cursor-pointer"
                              title="Remove test"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Outsource Catalog List (from availableTests) */}
                {Object.keys(filteredGroups).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <FlaskConical className="h-9 w-9 mx-auto opacity-30 text-emerald-500" />
                    <p className="text-xs font-bold text-foreground">No matching investigations found.</p>
                    <p className="text-[11px]">Use &quot;Add Custom Test&quot; above to create any specialized outsource test.</p>
                  </div>
                ) : (
                  Object.entries(filteredGroups).map(([category, tests]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{category}</span>
                        <div className="h-px flex-1 bg-border/80" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tests.map((test) => {
                          const isOutsourced = selectedOutsourceTests.some(
                            (st) => (st.id && st.id === test.id) || st.name.toLowerCase() === test.name.toLowerCase()
                          );
                          return (
                            <div
                              key={`outsource-card-${test.id}`}
                              onClick={() => handleToggleOutsourceTest(test)}
                              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${isOutsourced
                                ? "bg-emerald-500/15 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40"
                                : "bg-card border-border/90 hover:border-emerald-500/50"
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Checkbox
                                  checked={isOutsourced}
                                  onCheckedChange={() => handleToggleOutsourceTest(test)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={isOutsourced ? "border-emerald-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" : ""}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                                    {isOutsourced && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                                        Outsource
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {test.category || "Pathology"}
                                  </p>
                                </div>
                              </div>
                              {(() => {
                                const pricing = getOutsourceTestPricing(test);
                                if (pricing.hasCustomRate) {
                                  return (
                                    <div className="flex flex-col items-end shrink-0 leading-tight">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                                        Partner ₹{pricing.effectivePrice.toFixed(0)}
                                      </span>
                                      {pricing.basePrice !== pricing.effectivePrice && (
                                        <span className="text-[10px] font-medium text-muted-foreground line-through mt-0.5">
                                          MRP ₹{pricing.basePrice.toFixed(0)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                                const b2bRate = (test as any).b2bPrice ?? (test as any).b2b_price;
                                const showB2B = (isB2B || !!selectedB2bCenter) && (b2bRate !== undefined && b2bRate !== null);
                                if (showB2B) {
                                  return (
                                    <div className="flex flex-col items-end shrink-0 leading-tight">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                        B2B ₹{Number(b2bRate ?? test.price).toFixed(0)}
                                      </span>
                                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                        MRP ₹{Number(test.price).toFixed(0)}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="font-mono text-xs font-bold text-foreground shrink-0">₹{Number(test.price).toFixed(0)}</span>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <FlaskConical className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-xs font-bold text-foreground">No clinical investigations match your filter.</p>
                <p className="text-[11px]">Try clearing your search query or selecting another category.</p>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([category, tests]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{category}</span>
                    <div className="h-px flex-1 bg-border/80" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tests.map((test) => {
                      const selected = selectedTests.includes(test.id);
                      const paramCount = test.subTests?.reduce((acc: number, st: any) => acc + (st.subTests && st.subTests.length > 0 ? st.subTests.length : 1), 0) ?? (test.subTests?.length || 0);
                      return (
                        <div key={test.id} className="flex flex-col gap-1">
                          <div
                            onClick={() => handleToggleTest(test.id)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${selected
                              ? "bg-accent/80 border-primary shadow-sm ring-1 ring-primary/30"
                              : "bg-card border-border/90 hover:border-primary/50"
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => handleToggleTest(test.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                                  {selected && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {paramCount > 0 ? `${paramCount} Parameters Included` : `Ref ${test.refRangeMin ?? "N/A"}–${test.refRangeMax ?? "N/A"}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {(() => {
                                const b2bRate = (test as any).b2bPrice ?? (test as any).b2b_price;
                                const showB2B = isB2B && (b2bRate !== undefined && b2bRate !== null);
                                if (showB2B) {
                                  return (
                                    <div className="flex flex-col items-end shrink-0 leading-tight">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                        B2B ₹{Number(b2bRate ?? test.price).toFixed(0)}
                                      </span>
                                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                        MRP ₹{Number(test.price).toFixed(0)}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="font-mono text-xs font-bold text-foreground shrink-0">₹{Number(test.price).toFixed(0)}</span>
                                );
                              })()}
                              {test.subTests && test.subTests.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setExpandedTests(prev => ({ ...prev, [test.id]: !prev[test.id] })) }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                                >
                                  {expandedTests[test.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                          {expandedTests[test.id] && test.subTests && test.subTests.length > 0 && (
                            <div className="pl-6 pr-2 py-1 space-y-1">
                              {test.subTests.map(sub => {
                                const subSelected = selectedTests.includes(sub.id) || selected;
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => { if (!selected) handleToggleTest(sub.id) }}
                                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer ${subSelected ? "bg-accent/50 border-primary/30" : "bg-card border-transparent hover:border-border"
                                      } ${selected ? "opacity-60 cursor-not-allowed" : ""}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox checked={subSelected} disabled={selected} onCheckedChange={() => { if (!selected) handleToggleTest(sub.id) }} onClick={(e) => e.stopPropagation()} />
                                      <span className="font-medium">{sub.name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Refined Bottom Summary Bar */}
          <div className="border-t border-border/80 px-6 py-4 shrink-0 bg-muted/40 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
              <div className="px-3.5 py-1.5 rounded-xl bg-card border border-border flex items-center gap-2 shadow-2xs">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground font-semibold">Selected Tests:</span>
                <span className="font-bold text-foreground">
                  {selectedTestObjects.length + selectedOutsourceTests.length} Total
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({selectedTestObjects.length} In-House{selectedOutsourceTests.length > 0 ? `, ${selectedOutsourceTests.length} Outsource` : ""})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5 justify-between w-full sm:w-auto sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Total</p>
                <p className="font-display text-2xl font-bold text-primary font-mono">₹{subtotal.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md cursor-pointer"
              >
                Done ({selectedTestObjects.length + selectedOutsourceTests.length})
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Direct Medical Invoice Print Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-4xl w-[96vw] sm:w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
          <DialogTitle className="sr-only">Print Invoice</DialogTitle>
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/80 bg-card shrink-0 print:hidden">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Printer className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                  Invoice {successDetails?.billCustomId}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                  Patient: <strong className="text-foreground">{successDetails?.patientName}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSendWhatsAppInvoice}
                disabled={isSendingWhatsApp}
                className="px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                title="Send Invoice PDF directly to Patient on WhatsApp"
              >
                {isSendingWhatsApp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{isSendingWhatsApp ? "Sending..." : "Send on WhatsApp"}</span>
                <span className="sm:hidden">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoicePdf}
                disabled={isDownloadingPdf}
                className="gradient-primary text-primary-foreground font-bold text-xs px-3 sm:px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:-translate-y-px transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="Download pristine high-resolution vector PDF"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{isDownloadingPdf ? "Downloading..." : "Download PDF"}</span>
                <span className="sm:hidden">PDF</span>
              </button>

              <button
                type="button"
                onClick={() => printInvoiceElement(registerPrintRef.current, `Invoice_${successDetails?.billCustomId || "Receipt"}`)}
                className="bg-card hover:bg-muted text-foreground border border-border/80 font-bold text-xs px-3 sm:px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs hover:-translate-y-px transition-all cursor-pointer shrink-0"
                title="Open browser print dialog"
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden">Print</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
            <div ref={registerPrintRef} className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full">
              <InvoiceSheet
                settings={billSettings}
                invoice={{
                  id: successDetails?.billId,
                  customId: successDetails?.billCustomId || "INV-001",
                  createdAt: new Date().toISOString(),
                  total: Number(successDetails?.total ?? grandTotal),
                  discount: Number(successDetails?.discount ?? parsedDiscount),
                  paidAmount: Number(
                    successDetails?.paymentStatus === "PAID"
                      ? (successDetails?.total ?? grandTotal)
                      : (successDetails?.paidAmount ?? 0)
                  ),
                  advanceAmount: Number(successDetails?.paidAmount ?? 0),
                  status: (
                    successDetails?.paymentStatus === "PAID" ||
                    (Number(successDetails?.balanceDue ?? 0) <= 0 && Number(successDetails?.total ?? grandTotal) > 0 && successDetails?.paymentMode !== "UNPAID")
                  )
                    ? "PAID"
                    : (Number(successDetails?.paidAmount ?? 0) > 0 ? "PARTIAL" : "UNPAID"),
                  paymentMode: successDetails?.paymentMode || (selectedPaymentMode === "UNPAID" ? "UNPAID" : selectedPaymentMode) || "UNPAID",
                  billedBy: "Billing / Reception Desk",
                  reportId: successDetails?.reportId,
                  packageName: successDetails?.packageName || selectedPackage?.name || null,
                  patient: {
                    customId: successDetails?.patientCustomId || newPatient?.customId || "",
                    name: successDetails?.patientName || newPatient?.name || "",
                    phone: phone || newPatient?.phone || "",
                    age: Number(ageYears) || newPatient?.age || 0,
                    gender: gender || newPatient?.gender || "Male",
                    refDoctor: refDoctorSelect || newPatient?.refDoctor || "Self",
                    secondReferral: secondReferral || (newPatient as any)?.secondReferral || "",
                    address: address || newPatient?.address || "",
                    aadhaarNo: aadhaarNo || (newPatient as any)?.aadhaarNo || "",
                    insuranceNo: insuranceNo || (newPatient as any)?.insuranceNo || "",
                    hfrId: hfrId || (newPatient as any)?.hfrId || "",
                    uhid: uhid || (newPatient as any)?.uhid || "",
                    corporateName: corporateName || (newPatient as any)?.corporateName || govPanel || "",
                    vialBarcode: Object.values(vialBarcodes).find(Boolean) || (newPatient as any)?.vialBarcode || (newPatient as any)?.vial_barcode || "",
                    abhaNumber: abhaNumber || (newPatient as any)?.abhaNumber || "",
                    abhaAddress: abhaAddress || (newPatient as any)?.abhaAddress || "",
                  },
                  lab: {
                    name: labInfo?.name || labInfo?.centre_name || labInfo?.centreName || "OnePath Pathology Laboratory",
                    email: labInfo?.email || "support@onepathlab.com",
                    address: labInfo?.address || "Medical Diagnostic Center",
                    phone: labInfo?.phone || "",
                    logoUrl: billSettings.logoImage || labInfo?.logo_url || labInfo?.logoUrl || "/onepath-logo.png",
                    pincode: labInfo?.pincode || "",
                    city: labInfo?.city || "",
                    district: labInfo?.district || labInfo?.city || "",
                    state: labInfo?.state || "",
                    gstin: billSettings.gst?.number || labInfo?.gstin || "",
                    bill_settings: billSettings,
                  },
                  tests: (successDetails?.tests && successDetails.tests.length > 0 ? successDetails.tests : selectedTestObjects).map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    code: t.code || t.testCode || t.test_code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`,
                    price: Number(t.price || 0),
                    category: t.category,
                    sampleType: t.sampleType || t.sample_type || undefined,
                    barcode: Object.values(vialBarcodes).find(Boolean) || (newPatient as any)?.vialBarcode || (newPatient as any)?.vial_barcode || "",
                  })),
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Manage Referring Doctors Modal */}
      <Dialog open={isDoctorModalOpen} onOpenChange={setIsDoctorModalOpen}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="sr-only">Manage Referring Doctors</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Manage Referring Doctors</h3>
                <p className="text-xs text-muted-foreground">Add, edit, or remove referring doctors.</p>
              </div>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Doctor Name (e.g. Dr. Name)"
                  value={newDoctorInput}
                  onChange={(e) => setNewDoctorInput(e.target.value)}
                  className="flex-1 px-3 h-10 bg-background border border-border/90 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
                />
                <button
                  type="submit"
                  disabled={!newDoctorInput.trim()}
                  className="gradient-primary text-primary-foreground font-bold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Active / Temporary Doctor Checkbox */}
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="doctor-active-checkbox"
                  checked={isDoctorActive}
                  onChange={(e) => setIsDoctorActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                />
                <label
                  htmlFor="doctor-active-checkbox"
                  className="text-xs font-medium text-foreground cursor-pointer select-none"
                >
                  Active Doctor <span className="text-[11px] text-muted-foreground font-normal">(Uncheck for temporary doctor — will not track/count referrals in cases tab)</span>
                </label>
              </div>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {doctorsList.map((doc) => (
                <div key={doc} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card">
                  {editingDoctor?.oldName === doc ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingDoctor.newName}
                        onChange={(e) => setEditingDoctor({ ...editingDoctor, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditDoctor} className="text-xs font-bold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingDoctor(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">{doc}</span>
                  )}

                  {doc !== "Self" && !editingDoctor && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingDoctor({ oldName: doc, newName: doc })}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoctor(doc)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Manage Collection Points Modal */}
      <Dialog open={isCollectionModalOpen} onOpenChange={setIsCollectionModalOpen}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="sr-only">Manage Collection Points</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Manage Collection Centers</h3>
                <p className="text-xs text-muted-foreground">Add or modify sample collection points.</p>
              </div>
            </div>

            <form onSubmit={handleAddCollectionPoint} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Collection Point Name"
                value={newCollectionInput}
                onChange={(e) => setNewCollectionInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-background border border-border/90 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newCollectionInput.trim()}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {collectionPoints.map((point) => (
                <div key={point} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card">
                  {editingCollectionPoint?.oldName === point ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingCollectionPoint.newName}
                        onChange={(e) => setEditingCollectionPoint({ ...editingCollectionPoint, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditCollectionPoint} className="text-xs font-bold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingCollectionPoint(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">{point}</span>
                  )}

                  {point !== "Main Lab" && !editingCollectionPoint && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCollectionPoint({ oldName: point, newName: point })}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollectionPoint(point)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsCollectionModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Manage Phlebotomists Modal */}
      <Dialog open={isPhleboModalOpen} onOpenChange={setIsPhleboModalOpen}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="sr-only">Manage Phlebotomists</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Manage Phlebotomists & Staff</h3>
                <p className="text-xs text-muted-foreground">Add or modify sample collectors & lab technicians.</p>
              </div>
            </div>

            <form onSubmit={handleAddPhlebo} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Phlebotomist / Staff Name"
                value={newPhleboInput}
                onChange={(e) => setNewPhleboInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-background border border-border/90 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newPhleboInput.trim()}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {phlebotomists.map((phlebo) => (
                <div key={phlebo} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card">
                  {editingPhlebo?.oldName === phlebo ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingPhlebo.newName}
                        onChange={(e) => setEditingPhlebo({ ...editingPhlebo, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditPhlebo} className="text-xs font-bold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingPhlebo(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">{phlebo}</span>
                  )}

                  {phlebo !== "Self / Lab Staff" && !editingPhlebo && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingPhlebo({ oldName: phlebo, newName: phlebo })}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhlebo(phlebo)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsPhleboModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Form Fields Configuration Modal (Horizontal Wide Landscape) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-5xl w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Patient Intake Field Rules</DialogTitle>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border/80 bg-card shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Patient Intake Fields & Form Rules
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                  Dynamic Fields ({tempIntakeFields.length})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable fields to capture during intake, mark mandatory fields, and toggle report header visibility.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTempIntakeFields(prev => prev.map(f => ({ ...f, enabled: true })))}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                <span>Enable All</span>
              </button>
              <button
                type="button"
                onClick={() => setTempIntakeFields(DEFAULT_INTAKE_FIELDS.map(f => ({ ...f })))}
                className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-border/60 bg-muted/20 shrink-0">
            {[
              { id: "ALL", label: "All Fields", count: tempIntakeFields.length },
              { id: "Demographics", label: "Demographics", count: tempIntakeFields.filter(f => f.category === "Demographics").length },
              { id: "Clinical & Referral", label: "Clinical & Referral", count: tempIntakeFields.filter(f => f.category === "Clinical & Referral").length },
              { id: "Identification & Documents", label: "Identification & ID", count: tempIntakeFields.filter(f => f.category === "Identification & Documents").length },
              { id: "Logistics & Physical", label: "Logistics & Physical", count: tempIntakeFields.filter(f => f.category === "Logistics & Physical").length },
              { id: "Veterinary", label: "Veterinary", count: tempIntakeFields.filter(f => f.category === "Veterinary").length },
            ].map(cat => {
              const isActive = intakeCategoryTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setIntakeCategoryTab(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border inline-flex items-center gap-1.5 cursor-pointer select-none ${isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-extrabold ring-1 ring-primary/20"
                    : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Fields Grid */}
          <div className="flex-1 overflow-y-auto p-6 max-h-[58vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {tempIntakeFields
                .filter(field => intakeCategoryTab === "ALL" || field.category === intakeCategoryTab)
                .map(field => {
                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all space-y-2.5 shadow-2xs ${field.enabled
                        ? "bg-card border-primary/40 ring-1 ring-primary/10"
                        : "bg-muted/20 border-border/70 opacity-75"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-foreground flex items-center gap-1">
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="text-rose-500 font-extrabold text-sm" title="Mandatory Field">*</span>
                            )}
                          </p>
                          <span className="text-[9.5px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            Tag: {field.orderingName}
                          </span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${field.enabled
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                          }`}>
                          {field.enabled ? "Active" : "Disabled"}
                        </span>
                      </div>

                      {/* 3 Checkboxes */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px]">
                        {(() => {
                          const isCore = field.key === "phone" || field.key === "address" || field.key === "name" || field.key === "ageGender" || field.key === "refDoctor";
                          return (
                            <label className={`flex items-center gap-1.5 select-none font-semibold ${isCore ? "cursor-default text-muted-foreground" : "cursor-pointer text-foreground"}`} title={isCore ? "Core intake field (Always active on registration form)" : "Toggle field on form"}>
                              <input
                                type="checkbox"
                                checked={isCore ? true : field.enabled}
                                disabled={isCore}
                                onChange={() => !isCore && handleToggleTempIntakeField(field.key, "enabled")}
                                className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0 disabled:opacity-70"
                              />
                              <span className="truncate">Form {isCore && "🔒"}</span>
                            </label>
                          );
                        })()}

                        <label className={`flex items-center gap-1.5 select-none font-semibold ${field.enabled ? "cursor-pointer text-foreground" : "cursor-not-allowed text-muted-foreground opacity-50"
                          }`}>
                          <input
                            type="checkbox"
                            disabled={!field.enabled}
                            checked={field.required}
                            onChange={() => handleToggleTempIntakeField(field.key, "required")}
                            className="h-3.5 w-3.5 rounded border-border text-rose-600 accent-rose-600 cursor-pointer shrink-0"
                          />
                          <span className="truncate text-rose-600 dark:text-rose-400 font-bold">Required*</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={field.showOnReport}
                            onChange={() => handleToggleTempIntakeField(field.key, "showOnReport")}
                            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                          />
                          <span className="truncate">On Report</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/80 bg-card shrink-0">
            <p className="text-xs text-muted-foreground font-medium">
              Enabled fields: <strong className="text-foreground">{tempIntakeFields.filter(f => f.enabled).length}</strong> of {tempIntakeFields.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveIntakeRulesModal}
                disabled={savingIntakeRules}
                className="gradient-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {savingIntakeRules ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Rules…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Intake Rules</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PayU Payment Gateway Modal */}
      <Dialog open={isPayUModalOpen} onOpenChange={setIsPayUModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl">
          <DialogTitle className="font-display font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>PayU Instant Collection Gate</span>
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-bold text-foreground">{successDetails?.patientName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bill ID:</span>
                <span className="font-mono font-bold text-foreground">{successDetails?.billCustomId}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border/60 pt-2">
                <span>Amount to Collect:</span>
                <span className="text-primary font-mono text-base font-extrabold">₹{(successDetails?.balanceDue || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-center">
              <p className="text-xs font-bold text-foreground">PayU Sub-Merchant Settlement</p>
              <p className="text-[11px] text-muted-foreground">
                Payment settles directly into this center's registered bank account. UPI QR, GPay, PhonePe, Cards & NetBanking supported.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPayUModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayUSuccess}
                disabled={payULoading}
                className="px-5 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                {payULoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                <span>Authorize & Clear via PayU</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ABHA ABDM Link Modal */}
      <AbhaLinkModal
        open={isAbhaModalOpen}
        onOpenChange={setIsAbhaModalOpen}
        onVerified={handleAbhaVerified}
        defaultPhone={phone}
        defaultName={`${firstName} ${lastName}`.trim()}
      />

      {/* ABHA QR Poster Modal */}
      <AbhaQrPosterModal
        open={isAbhaQrModalOpen}
        onOpenChange={setIsAbhaQrModalOpen}
      />

    </div>
  );
}

export default function RegisterPatientPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 text-muted-foreground text-xs gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading Patient Intake Flow…</span>
      </div>
    }>
      <RegisterPatientPage />
    </Suspense>
  );
}
