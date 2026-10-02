"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Edit2, Trash2, FlaskConical, AlertTriangle,
  Loader2, ChevronDown, ChevronRight, ChevronUp, ChevronLeft,
  FileText, ArrowLeft, Sliders, Check, GripVertical,
  Calendar, Sparkles, CornerDownRight, Eye, X
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getCleanLetterheadUrl } from "@/lib/api-client";
import { TipTapEditor } from "@/components/tiptap-editor";
import { PrintPreviewDialog } from "@/components/print-preview-dialog";
import type { ReportSheetData, ReportTest } from "@/components/report-sheet";
import { normalizeReportSettings } from "@/lib/report-settings";

// Clinical Categorized Predefined Units
const CATEGORIZED_UNITS: Record<string, string[]> = {
  "Hematology": ["g/dL", "cells/cumm", "/cumm", "10^3/µL", "10^6/µL", "mill/µL", "fl", "pg", "%", "mm/hr", "Seconds", "Ratio", "INR"],
  "Biochemistry": ["mg/dL", "g/dL", "U/L", "IU/L", "mmol/L", "µmol/L", "mEq/L", "ng/mL", "µg/dL", "mg/24h", "mL/min", "g/24h"],
  "Immunology & Hormones": ["µIU/mL", "mIU/mL", "pmol/L", "nmol/L", "ng/dL", "pg/mL", "copies/mL", "Index", "S/CO", "AU/mL", "BAU/mL"],
  "Urine & Microscopy": ["/HPF", "/LPF", "Epithelial Cells/HPF", "Pus Cells/HPF", "RBCs/HPF", "Casts/LPF", "Crystals/HPF"],
  "General / Others": ["%", "Ratio", "Index", "Sec", "Min", "Hours", "mg/L", "µg/mL", "Negative/Positive"]
};

// Predefined Inbuilt Laboratory Methods
const INBUILT_METHODS = [
  "Automated Cell Counter (Impedance & Flow Cytometry)",
  "Cyanmethemoglobin Photometric Method",
  "Enzymatic Colorimetric (GOD-POD)",
  "Hexokinase Enzymatic Method",
  "Chemiluminescence Immunoassay (CLIA)",
  "Enzyme-Linked Immunosorbent Assay (ELISA)",
  "High Performance Liquid Chromatography (HPLC)",
  "Ion Selective Electrode (ISE)",
  "Real-Time Reverse Transcription PCR (RT-PCR)",
  "Jaffe's Kinetic Method (Without Deproteinization)",
  "IFCC with Pyridoxal-5-Phosphate",
  "Westergren Modified Method (ESR)",
  "Latex Enhanced Immunoturbidimetry",
  "Reflectance Photometry / Dry Chemistry Strip",
  "Brightfield Optical Microscopy (40x/100x)",
  "Immunochromatographic Rapid Card Assay",
  "Turbidimetric Immunoassay",
  "Atomic Absorption Spectrophotometry",
  "Capillary Zone Electrophoresis",
  "Fluorescence Polarization Immunoassay (FPIA)"
];

// Qualitative Custom Options Templates
const QUICK_OPTION_PRESETS: { title: string; desc: string; options: string[] }[] = [
  {
    title: "Positive / Negative",
    desc: "Standard screening tests (VDRL, Dengue NS1, Malaria, Widal)",
    options: ["Negative", "Positive", "Equivocal / Borderline"]
  },
  {
    title: "Reactive / Non-Reactive",
    desc: "Viral serology & immunology (HIV, HBsAg, HCV, Syphilis)",
    options: ["Non-Reactive", "Reactive", "Weakly Reactive"]
  },
  {
    title: "Present / Absent",
    desc: "Microscopic findings, urine crystals, casts & parasites",
    options: ["Absent", "Present", "Few", "Moderate", "Plenty"]
  },
  {
    title: "Normal / Abnormal",
    desc: "Clinical cytology, histology & functional examinations",
    options: ["Normal", "Abnormal", "Indeterminate"]
  },
  {
    title: "Urine Transparency / Clarity",
    desc: "Physical examination of fluid samples",
    options: ["Clear", "Slightly Hazy", "Hazy", "Turbid", "Flocculent"]
  },
  {
    title: "Semi-Quantitative (Trace to 4+)",
    desc: "Urine protein, sugar, acetone & ketones",
    options: ["Negative", "Trace", "1+ (30 mg/dL)", "2+ (100 mg/dL)", "3+ (300 mg/dL)", "4+ (1000 mg/dL)"]
  },
  {
    title: "Urine / Fluid Appearance",
    desc: "Colorimetric physical observations",
    options: ["Pale Yellow", "Straw / Normal", "Dark Yellow", "Amber", "Reddish / Bloody", "Cloudy White"]
  },
  {
    title: "Sample Adequacy",
    desc: "Biopsy, pap smear & specimen triage",
    options: ["Satisfactory for evaluation", "Unsatisfactory / Inadequate cellularity", "Limited by drying artifact"]
  }
];

function getPaginationRange(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export interface AgeRangeBand {
  id: string;
  stageName: string;
  minAge: number;
  maxAge: number;
  ageUnit: "days" | "months" | "years";
  gender: "BOTH" | "MALE" | "FEMALE";
  rangeType: "numeric" | "text";
  refMin?: number | string;
  refMax?: number | string;
  textRange?: string;
}

export interface Test {
  id: string;
  name: string;
  testCode?: string;
  category: string;
  fieldType: string;
  type: string;
  price: number;
  interpretation?: string;
  comment?: string;
  notes?: string;
  method?: string;
  unit: string | null;
  genderRefType: string;
  rangeType?: "numeric" | "text";
  textRefRange?: string;
  refRangeMin: number | null;
  refRangeMax: number | null;
  refRangeMinMale: number | null;
  refRangeMaxMale: number | null;
  refRangeMinFemale: number | null;
  refRangeMaxFemale: number | null;
  refRangeMinChild?: number | null;
  refRangeMaxChild?: number | null;
  refRangeMinNewborn?: number | null;
  refRangeMaxNewborn?: number | null;
  ageRanges?: AgeRangeBand[];
  valueType?: string;
  customOptions?: string;
  subTests?: Test[];
}

export interface SubTestState {
  id?: string;
  name: string;
  method?: string;
  unit: string;
  genderRefType: string;
  rangeType: "numeric" | "text";
  textRefRange: string;
  refRangeMin: string;
  refRangeMax: string;
  refRangeMinMale: string;
  refRangeMaxMale: string;
  refRangeMinFemale: string;
  refRangeMaxFemale: string;
  refRangeMinChild: string;
  refRangeMaxChild: string;
  refRangeMinNewborn: string;
  refRangeMaxNewborn: string;
  ageRanges?: AgeRangeBand[];
  fieldType?: string;
  valueType?: string;
  customOptions?: string[];
  subTests?: SubTestState[];
}

export default function TestMasterPage() {
  const toast = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Main Test Form State
  const [name, setName] = useState("");
  const [testCode, setTestCode] = useState("");
  const [category, setCategory] = useState("Hematology");
  const [customCategory, setCustomCategory] = useState("");
  const [type, setType] = useState("Pathology");
  const [price, setPrice] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [comment, setComment] = useState("");
  const [notes, setNotes] = useState("");

  const [subTests, setSubTests] = useState<SubTestState[]>([]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Modals
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [generatingAiInterpretation, setGeneratingAiInterpretation] = useState(false);
  const [activeNotesTab, setActiveNotesTab] = useState<"INTERPRETATION" | "COMMENT" | "NOTES">("INTERPRETATION");

  // Custom Options Modal State (Horizontal Landscape)
  const [customOptionsModalOpen, setCustomOptionsModalOpen] = useState(false);
  const [activeCustomOptionsLocation, setActiveCustomOptionsLocation] = useState<{ parentIdx: number; subIdx?: number } | null>(null);
  const [tempCustomOptions, setTempCustomOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");

  // Age Ranges Modal State (Horizontal Landscape)
  const [ageRangeModalOpen, setAgeRangeModalOpen] = useState(false);
  const [activeAgeRangeLocation, setActiveAgeRangeLocation] = useState<{ parentIdx: number; subIdx?: number } | null>(null);
  const [tempAgeRanges, setTempAgeRanges] = useState<AgeRangeBand[]>([]);

  // Unit Search Popover / Dropdown State
  const [activeUnitDropdownId, setActiveUnitDropdownId] = useState<string | null>(null);

  // Method Search / Dropdown State
  const [activeMethodDropdownId, setActiveMethodDropdownId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const subtestsEndRef = useRef<HTMLDivElement>(null);

  // Sample Report Preview State
  const [labProfile, setLabProfile] = useState<any>(null);
  const [sampleReportData, setSampleReportData] = useState<ReportSheetData | null>(null);
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false);

  // Only pathology-relevant departments (exclude Radiology, Ultrasound, X-Ray, etc.)
  const PATHOLOGY_DEPARTMENTS = [
    "Hematology",
    "Biochemistry",
    "Clinical Pathology",
    "Serology & Immunology",
    "Microbiology",
    "Histopathology & Cytology",
    "Endocrinology & Hormones",
    "Molecular Biology",
  ];

  const dynamicCategories = useMemo(() => {
    return Array.from(
      new Set(
        tests
          .map((t) => t.category?.trim())
          .filter((cat): cat is string => Boolean(cat) && !/radiology|x-ray|xray|ultrasound|usg|ct scan|mri|ecg|echo/i.test(cat))
      )
    );
  }, [tests]);

  const standardCategories = useMemo(() => {
    const combined = new Set([...dynamicCategories, ...PATHOLOGY_DEPARTMENTS]);
    return Array.from(combined);
  }, [dynamicCategories]);

  useEffect(() => { 
    // 1. Instant cache load on client mount (0ms)
    try {
      const cached = localStorage.getItem("lis_cached_tests");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTests(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // 2. Silent revalidation from server in background (no Ctrl+F5 needed)
    fetchTests(true); 

    fetchFromLaravel("/lab")
      .then(data => setLabProfile(data))
      .catch(() => {});
  }, []);

  const fetchTests = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    try {
      if (isForce && tests.length === 0) {
        setLoading(true);
      }
      const data = await fetchFromLaravel("/tests", { skipCache: true });
      if (Array.isArray(data)) {
        setTests(data);
        try {
          localStorage.setItem("lis_cached_tests", JSON.stringify(data));
        } catch {}
      } else if (isForce && tests.length === 0) {
        setTests([]);
      }
    } catch (err) {
      console.error("Failed to fetch tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSampleReport = (test: Test) => {
    const currentLab = labProfile;
    let cachedSettings: any = null;
    let cachedLetterhead: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("lis_cached_report_settings");
        if (raw) cachedSettings = JSON.parse(raw);
        cachedLetterhead = localStorage.getItem("lis_cached_letterhead");
      } catch {}
    }

    const results: ReportTest[] = [];

    // Helper to generate typical physiological sample value
    const generateSampleValue = (item: any): { value: string; isAbnormal: boolean } => {
      const name = (item.name || "").toLowerCase();

      // Realistic values for standard CBC & haematology parameters matching doctor LIS reports
      if (/hemoglobin|haemoglobin/i.test(name)) return { value: "12.9", isAbnormal: false };
      if (/total leukocyte|tlc|total wbc/i.test(name)) return { value: "8,300", isAbnormal: false };
      if (/neutrophil/i.test(name) && !/absolute/i.test(name)) return { value: "57", isAbnormal: false };
      if (/lymphocyte/i.test(name) && !/absolute/i.test(name)) return { value: "36", isAbnormal: false };
      if (/eosinophil/i.test(name) && !/absolute/i.test(name)) return { value: "03", isAbnormal: false };
      if (/monocyte/i.test(name) && !/absolute/i.test(name)) return { value: "04", isAbnormal: false };
      if (/basophil/i.test(name) && !/absolute/i.test(name)) return { value: "00", isAbnormal: false };
      if (/platelet count/i.test(name)) return { value: "1.74", isAbnormal: false };
      if (/total rbc/i.test(name)) return { value: "5.19", isAbnormal: false };
      if (/hematocrit|hct|pcv/i.test(name)) return { value: "46.6", isAbnormal: false };
      if (/\bmcv\b|mean corpuscular volume/i.test(name)) return { value: "89.8", isAbnormal: false };
      if (/\bmch\b|mean cell haemoglobin$/i.test(name)) return { value: "24.9", isAbnormal: true }; // Low flag L
      if (/\bmchc\b|mean cell haemoglobin con/i.test(name)) return { value: "27.7", isAbnormal: true }; // Low flag L
      if (/rdw|r\.d\.w/i.test(name)) return { value: "12.7", isAbnormal: false };
      if (/\bmpv\b|mean platelet volume/i.test(name)) return { value: "12.5", isAbnormal: true }; // High flag H
      if (/absolute neutrophil|anc/i.test(name)) return { value: "4.73", isAbnormal: false };
      if (/absolute lymphocyte|alc/i.test(name)) return { value: "2.99", isAbnormal: false };
      if (/absolute eosinophil|aec/i.test(name)) return { value: "0.25", isAbnormal: false };
      if (/absolute monocyte|amc/i.test(name)) return { value: "0.33", isAbnormal: false };
      if (/neutrophil lymphocyte ratio|nlr/i.test(name)) return { value: "1.58", isAbnormal: false };
      if (/esr|erythrocyte sedimentation/i.test(name)) return { value: "12", isAbnormal: false };

      if (item.valueType === "Select" || item.rangeType === "CUSTOM_OPTIONS" || item.rangeType === "custom_options") {
        let opts: string[] = [];
        if (Array.isArray(item.customOptions)) opts = item.customOptions;
        else if (typeof item.customOptions === "string") {
          try { opts = JSON.parse(item.customOptions); } catch { opts = []; }
        }
        if (opts.length > 0) {
          const normalOpt = opts.find(o => /normal|negative|non-reactive|nil|clear|absent/i.test(o)) || opts[0];
          return { value: normalOpt, isAbnormal: false };
        }
        return { value: "Negative / Normal", isAbnormal: false };
      }

      if (item.fieldType === "Custom Editor" || (item as any).field_type === "Custom Editor") {
        return { 
          value: item.interpretation || "<p>Clinical and microscopic evaluation within normal reference limits.</p>", 
          isAbnormal: false 
        };
      }

      const minVal = item.refRangeMinMale ?? item.refRangeMin ?? item.ref_range_min_male ?? item.ref_range_min;
      const maxVal = item.refRangeMaxMale ?? item.refRangeMax ?? item.ref_range_max_male ?? item.ref_range_max;

      const min = minVal != null ? Number(minVal) : null;
      const max = maxVal != null ? Number(maxVal) : null;

      if (min !== null && max !== null && max > min) {
        const mid = (min + max) / 2;
        const formatted = max < 10 ? mid.toFixed(2) : (max < 100 ? mid.toFixed(1) : Math.round(mid).toString());
        return { value: formatted, isAbnormal: false };
      } else if (max !== null && max > 0) {
        const val = max * 0.7;
        const formatted = max < 10 ? val.toFixed(2) : (max < 100 ? val.toFixed(1) : Math.round(val).toString());
        return { value: formatted, isAbnormal: false };
      } else if (min !== null && min > 0) {
        const val = min * 1.3;
        const formatted = min < 10 ? val.toFixed(2) : (min < 100 ? val.toFixed(1) : Math.round(val).toString());
        return { value: formatted, isAbnormal: false };
      }

      if (item.textRefRange || item.text_ref_range) {
        return { value: "Normal / Negative", isAbnormal: false };
      }

      return { value: "Normal", isAbnormal: false };
    };

    const subTestList = test.subTests || (test as any).sub_tests;
    const hasSub = subTestList && subTestList.length > 0;

    if (hasSub) {
      subTestList.forEach((sub: any) => {
        const nestedList = sub.subTests || sub.sub_tests;
        const hasNested = nestedList && nestedList.length > 0;
        if (hasNested) {
          nestedList.forEach((nested: any) => {
            const { value, isAbnormal } = generateSampleValue(nested);
            results.push({
              id: `res-${nested.id || nested.testCode || nested.test_code || Math.random()}`,
              resultValue: value,
              isAbnormal,
              test: {
                ...nested,
                unit: nested.unit || "",
                category: nested.category || sub.category || test.category,
                parent: {
                  id: sub.id || sub.testCode || sub.test_code,
                  name: sub.name,
                  method: sub.method,
                  interpretation: sub.interpretation,
                  comment: sub.comment,
                  notes: sub.notes,
                  parent: {
                    id: test.id || test.testCode || (test as any).test_code,
                    name: test.name,
                    method: test.method,
                    interpretation: test.interpretation,
                    comment: test.comment,
                    notes: test.notes,
                  }
                }
              } as any
            });
          });
        } else {
          const { value, isAbnormal } = generateSampleValue(sub);
          results.push({
            id: `res-${sub.id || sub.testCode || sub.test_code || Math.random()}`,
            resultValue: value,
            isAbnormal,
            test: {
              ...sub,
              unit: sub.unit || "",
              category: sub.category || test.category,
              parent: {
                id: test.id || test.testCode || (test as any).test_code,
                name: test.name,
                method: test.method,
                interpretation: test.interpretation,
                comment: test.comment,
                notes: test.notes,
              }
            } as any
          });
        }
      });
    } else {
      const { value, isAbnormal } = generateSampleValue(test);
      results.push({
        id: `res-${test.id || test.testCode || (test as any).test_code || Math.random()}`,
        resultValue: (test.fieldType === "Custom Editor" || (test as any).field_type === "Custom Editor")
          ? (test.interpretation || value)
          : value,
        isAbnormal,
        test: {
          ...test,
          unit: test.unit || "",
          category: test.category,
          parent: undefined
        } as any
      });
    }

    const buildSampleReport = (labData: any): ReportSheetData => {
      const rawSettings = labData?.reportSettings || labData?.report_settings || cachedSettings;
      const normalizedSettings = normalizeReportSettings(rawSettings);

      const rawBg = labData?.printBgImage || labData?.print_bg_image || cachedLetterhead;
      const cleanBg = getCleanLetterheadUrl(rawBg);

      const headerH = labData?.printHeaderHeight ?? labData?.print_header_height ?? (cleanBg ? 185 : 40);
      const footerH = labData?.printFooterHeight ?? labData?.print_footer_height ?? (cleanBg ? 95 : 40);
      const marginL = labData?.printMarginLeft ?? labData?.print_margin_left ?? (cleanBg ? 32 : 40);
      const marginR = labData?.printMarginRight ?? labData?.print_margin_right ?? (cleanBg ? 32 : 40);
      const withLetterhead = Boolean(
        labData?.printWithLetterhead ?? labData?.print_with_letterhead ?? Boolean(cleanBg)
      );

      return {
        id: `sample-${test.id}`,
        testId: test.id,
        mainTestId: test.id,
        customId: `SAMPLE-${test.testCode || "TEST"}`,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        patient: {
          name: "Rahul Sharma (Sample Patient)",
          age: 32,
          gender: "MALE",
          phone: "+91 98765 43210",
          refDoctor: "Dr. A. K. Verma, MD (Consultant Physician)",
          customId: "PID-2026-9081",
          address: "Civil Lines, New Delhi"
        },
        lab: {
          name: labData?.name || "OnePath Diagnostic Reference Laboratory",
          email: labData?.email || "info@onepathlab.com",
          address: labData?.address || "Medical Enclave, Main Road, New Delhi",
          phone: labData?.phone || "+91 98123 45678",
          city: labData?.city || "New Delhi",
          state: labData?.state || "Delhi",
          pincode: labData?.pincode || "110001",
          logoUrl: labData?.logoUrl || labData?.logo_url || "/onepath-logo.png",
          printBgImage: cleanBg,
          printHeaderHeight: headerH,
          printFooterHeight: footerH,
          printMarginLeft: marginL,
          printMarginRight: marginR,
          printWithLetterhead: withLetterhead,
          report_settings: normalizedSettings,
          reportSettings: normalizedSettings,
          default_designation: labData?.default_designation || labData?.defaultDesignation || normalizedSettings.defaultDesignation || "Mr.",
        } as any,
        printedInterpretations: JSON.stringify([test.id, test.testCode || "", "ALL"]),
        testNotes: {
          [test.id]: {
            notes: test.notes || "",
            remarks: test.comment || "",
          }
        },
        results,
      };
    };

    // Open instantly with currentLab or cached data (no lag on slow network)
    setSampleReportData(buildSampleReport(currentLab));
    setSamplePreviewOpen(true);

    // Refresh lab in background if needed
    fetchFromLaravel("/lab")
      .then(fresh => {
        if (fresh) {
          setLabProfile(fresh);
          setSampleReportData(buildSampleReport(fresh));
        }
      })
      .catch(() => {});
  };

  const handleOpenAddDialog = () => {
    setEditingTest(null);
    setName("");
    setTestCode("TEST-" + Math.floor(1000 + Math.random() * 9000));
    setCategory(standardCategories[0] || "Hematology");
    setCustomCategory("");
    setType("Pathology");
    setPrice("");
    setInterpretation("");
    setComment("");
    setNotes("");
    setSubTests([{
      name: "",
      method: "",
      unit: "",
      genderRefType: "BOTH",
      rangeType: "numeric",
      textRefRange: "",
      refRangeMin: "",
      refRangeMax: "",
      refRangeMinMale: "",
      refRangeMaxMale: "",
      refRangeMinFemale: "",
      refRangeMaxFemale: "",
      refRangeMinChild: "",
      refRangeMaxChild: "",
      refRangeMinNewborn: "",
      refRangeMaxNewborn: "",
      ageRanges: [],
      fieldType: "Single Field",
      valueType: "Numeric",
      customOptions: [],
      subTests: []
    }]);
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (test: Test) => {
    setEditingTest(test);
    setName(test.name);
    setTestCode(test.testCode || "");
    setCategory(standardCategories.includes(test.category) ? test.category : "Other");
    setCustomCategory(standardCategories.includes(test.category) ? "" : test.category);
    setType(test.type || "Pathology");
    setPrice(test.price ? test.price.toString() : "");
    setInterpretation(test.interpretation || "");
    setComment(test.comment || "");
    setNotes(test.notes || "");

    const isCustom = test.fieldType === "Custom Editor" || (test as any).field_type === "Custom Editor" || (test.name || "").toLowerCase().includes("culture and sensitivity");

    if (isCustom) {
      setSubTests([]);
    } else if (test.subTests && test.subTests.length > 0) {
      setSubTests(test.subTests.map(sub => ({
        id: sub.id,
        name: sub.name,
        method: sub.method || "",
        unit: sub.unit || "",
        genderRefType: sub.genderRefType || "BOTH",
        rangeType: (sub.rangeType as "numeric" | "text") || "numeric",
        textRefRange: sub.textRefRange || "",
        refRangeMin: sub.refRangeMin?.toString() || "",
        refRangeMax: sub.refRangeMax?.toString() || "",
        refRangeMinMale: sub.refRangeMinMale?.toString() || "",
        refRangeMaxMale: sub.refRangeMaxMale?.toString() || "",
        refRangeMinFemale: sub.refRangeMinFemale?.toString() || "",
        refRangeMaxFemale: sub.refRangeMaxFemale?.toString() || "",
        refRangeMinChild: sub.refRangeMinChild?.toString() || "",
        refRangeMaxChild: sub.refRangeMaxChild?.toString() || "",
        refRangeMinNewborn: sub.refRangeMinNewborn?.toString() || "",
        refRangeMaxNewborn: sub.refRangeMaxNewborn?.toString() || "",
        ageRanges: Array.isArray(sub.ageRanges) ? sub.ageRanges : [],
        fieldType: sub.fieldType || "Single Field",
        valueType: sub.valueType || "Numeric",
        customOptions: sub.customOptions ? (typeof sub.customOptions === "string" ? JSON.parse(sub.customOptions) : sub.customOptions) : [],
        subTests: sub.subTests ? sub.subTests.map(ss => ({
          id: ss.id,
          name: ss.name,
          method: ss.method || "",
          unit: ss.unit || "",
          genderRefType: ss.genderRefType || "BOTH",
          rangeType: (ss.rangeType as "numeric" | "text") || "numeric",
          textRefRange: ss.textRefRange || "",
          refRangeMin: ss.refRangeMin?.toString() || "",
          refRangeMax: ss.refRangeMax?.toString() || "",
          refRangeMinMale: ss.refRangeMinMale?.toString() || "",
          refRangeMaxMale: ss.refRangeMaxMale?.toString() || "",
          refRangeMinFemale: ss.refRangeMinFemale?.toString() || "",
          refRangeMaxFemale: ss.refRangeMaxFemale?.toString() || "",
          refRangeMinChild: ss.refRangeMinChild?.toString() || "",
          refRangeMaxChild: ss.refRangeMaxChild?.toString() || "",
          refRangeMinNewborn: ss.refRangeMinNewborn?.toString() || "",
          refRangeMaxNewborn: ss.refRangeMaxNewborn?.toString() || "",
          ageRanges: Array.isArray(ss.ageRanges) ? ss.ageRanges : [],
          fieldType: "Single Field",
          valueType: ss.valueType || "Numeric",
          customOptions: ss.customOptions ? (typeof ss.customOptions === "string" ? JSON.parse(ss.customOptions) : ss.customOptions) : [],
        })) : []
      })));
    } else {
      setSubTests([{
        name: test.name,
        method: test.method || "",
        unit: test.unit || "",
        genderRefType: test.genderRefType || "BOTH",
        rangeType: (test.rangeType as "numeric" | "text") || "numeric",
        textRefRange: test.textRefRange || "",
        refRangeMin: test.refRangeMin?.toString() || "",
        refRangeMax: test.refRangeMax?.toString() || "",
        refRangeMinMale: test.refRangeMinMale?.toString() || "",
        refRangeMaxMale: test.refRangeMaxMale?.toString() || "",
        refRangeMinFemale: test.refRangeMinFemale?.toString() || "",
        refRangeMaxFemale: test.refRangeMaxFemale?.toString() || "",
        refRangeMinChild: test.refRangeMinChild?.toString() || "",
        refRangeMaxChild: test.refRangeMaxChild?.toString() || "",
        refRangeMinNewborn: test.refRangeMinNewborn?.toString() || "",
        refRangeMaxNewborn: test.refRangeMaxNewborn?.toString() || "",
        ageRanges: Array.isArray(test.ageRanges) ? test.ageRanges : [],
        fieldType: "Single Field",
        valueType: test.valueType || "Numeric",
        customOptions: test.customOptions ? (typeof test.customOptions === "string" ? JSON.parse(test.customOptions) : test.customOptions) : [],
        subTests: []
      }]);
    }

    setError(null);
    setDialogOpen(true);
  };

  const handleAiGenerateInterpretation = async () => {
    if (!name.trim()) {
      toast.error("Test Name Required", "Please enter a test name first to generate clinical interpretation.");
      return;
    }
    setGeneratingAiInterpretation(true);
    try {
      const paramList = subTests
        .map((st) => ({
          name: st.name?.trim(),
          unit: st.unit || "",
          ref_range:
            st.rangeType === "numeric"
              ? st.refRangeMin && st.refRangeMax
                ? `${st.refRangeMin} - ${st.refRangeMax}`
                : ""
              : st.textRefRange || "",
        }))
        .filter((p) => p.name);

      const res = await fetchFromLaravel("/ai/generate-interpretation", {
        method: "POST",
        body: JSON.stringify({
          test_name: name.trim(),
          category: category === "Other" && customCategory ? customCategory : category,
          parameters: paramList,
        }),
      });

      if (res && res.interpretation) {
        setInterpretation(res.interpretation);
        const providerLabel =
          res.provider === "gemini"
            ? "Google Gemini"
            : res.provider === "groq"
            ? "Groq AI"
            : "Pathology Engine";

        toast.success(
          "Clinical Interpretation Ready",
          `Generated via ${providerLabel} with diagnostic reference table.`
        );
      } else {
        toast.error("Generation Failed", "Could not generate clinical interpretation.");
      }
    } catch (err: any) {
      toast.error("AI Error", err.message || "Failed to generate clinical interpretation.");
    } finally {
      setGeneratingAiInterpretation(false);
    }
  };

  const handleAddSubTest = () => {
    setSubTests(prev => [...prev, {
      name: "",
      method: "",
      unit: "",
      genderRefType: "BOTH",
      rangeType: "numeric",
      textRefRange: "",
      refRangeMin: "",
      refRangeMax: "",
      refRangeMinMale: "",
      refRangeMaxMale: "",
      refRangeMinFemale: "",
      refRangeMaxFemale: "",
      refRangeMinChild: "",
      refRangeMaxChild: "",
      refRangeMinNewborn: "",
      refRangeMaxNewborn: "",
      ageRanges: [],
      fieldType: "Single Field",
      valueType: "Numeric",
      customOptions: [],
      subTests: []
    }]);
    setTimeout(() => {
      subtestsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleRemoveSubTest = (index: number) => {
    if (subTests.length === 1) {
      toast.error("A test panel must have at least one parameter.");
      return;
    }
    setSubTests(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubTestChange = (index: number, field: keyof SubTestState, val: any) => {
    setSubTests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Re-order drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setSubTests(prev => {
      const list = [...prev];
      const [moved] = list.splice(draggedIndex, 1);
      list.splice(targetIndex, 0, moved);
      return list;
    });
    setDraggedIndex(null);
  };

  const moveParameterUp = (index: number) => {
    if (index === 0) return;
    setSubTests(prev => {
      const list = [...prev];
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      return list;
    });
  };

  const moveParameterDown = (index: number) => {
    if (index === subTests.length - 1) return;
    setSubTests(prev => {
      const list = [...prev];
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      return list;
    });
  };

  // Sub-parameter (nested parameter) handlers
  const handleAddNestedSubTest = (parentIndex: number) => {
    setSubTests(prev => {
      const updated = [...prev];
      const currentSubs = updated[parentIndex].subTests || [];
      updated[parentIndex] = {
        ...updated[parentIndex],
        fieldType: "Multiple Field",
        subTests: [
          ...currentSubs,
          {
            name: "",
            method: updated[parentIndex].method || "",
            unit: updated[parentIndex].unit || "",
            genderRefType: "BOTH",
            rangeType: "numeric",
            textRefRange: "",
            refRangeMin: "",
            refRangeMax: "",
            refRangeMinMale: "",
            refRangeMaxMale: "",
            refRangeMinFemale: "",
            refRangeMaxFemale: "",
            refRangeMinChild: "",
            refRangeMaxChild: "",
            refRangeMinNewborn: "",
            refRangeMaxNewborn: "",
            ageRanges: [],
            fieldType: "Single Field",
            valueType: "Numeric",
            customOptions: [],
          }
        ]
      };
      return updated;
    });
  };

  const handleNestedSubTestChange = (parentIndex: number, subIndex: number, field: keyof SubTestState, val: any) => {
    setSubTests(prev => {
      const updated = [...prev];
      const currentSubs = [...(updated[parentIndex].subTests || [])];
      currentSubs[subIndex] = { ...currentSubs[subIndex], [field]: val };
      updated[parentIndex] = { ...updated[parentIndex], subTests: currentSubs };
      return updated;
    });
  };

  const handleRemoveNestedSubTest = (parentIndex: number, subIndex: number) => {
    setSubTests(prev => {
      const updated = [...prev];
      const currentSubs = (updated[parentIndex].subTests || []).filter((_, i) => i !== subIndex);
      updated[parentIndex] = { ...updated[parentIndex], subTests: currentSubs };
      return updated;
    });
  };

  // Custom Options Modal Handlers
  const handleOpenCustomOptions = (parentIdx: number, subIdx?: number) => {
    setActiveCustomOptionsLocation({ parentIdx, subIdx });
    let existing: string[] = [];
    if (subIdx !== undefined) {
      existing = subTests[parentIdx]?.subTests?.[subIdx]?.customOptions || [];
    } else {
      existing = subTests[parentIdx]?.customOptions || [];
    }
    setTempCustomOptions([...existing]);
    setNewOptionInput("");
    setCustomOptionsModalOpen(true);
  };

  const handleAddCustomOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (tempCustomOptions.includes(trimmed)) {
      toast.error("Option already exists");
      return;
    }
    setTempCustomOptions(prev => [...prev, trimmed]);
    setNewOptionInput("");
  };

  const handleApplyPreset = (options: string[]) => {
    setTempCustomOptions([...options]);
  };

  const handleSaveCustomOptions = () => {
    if (activeCustomOptionsLocation) {
      const { parentIdx, subIdx } = activeCustomOptionsLocation;
      if (subIdx !== undefined) {
        handleNestedSubTestChange(parentIdx, subIdx, "customOptions", tempCustomOptions);
      } else {
        handleSubTestChange(parentIdx, "customOptions", tempCustomOptions);
      }
    }
    setCustomOptionsModalOpen(false);
  };

  // Age Ranges Modal Handlers
  const handleOpenAgeRanges = (parentIdx: number, subIdx?: number) => {
    setActiveAgeRangeLocation({ parentIdx, subIdx });
    let existing: AgeRangeBand[] = [];
    if (subIdx !== undefined) {
      existing = subTests[parentIdx]?.subTests?.[subIdx]?.ageRanges || [];
    } else {
      existing = subTests[parentIdx]?.ageRanges || [];
    }

    if (existing.length > 0) {
      setTempAgeRanges(JSON.parse(JSON.stringify(existing)));
    } else {
      // Auto-load standard stages automatically by default
      const standardStages: AgeRangeBand[] = [
        { id: "stage_newborn", stageName: "Newborn", minAge: 0, maxAge: 28, ageUnit: "days", gender: "BOTH", rangeType: "numeric", refMin: "14.0", refMax: "24.0", textRange: "" },
        { id: "stage_infant", stageName: "Infant", minAge: 1, maxAge: 12, ageUnit: "months", gender: "BOTH", rangeType: "numeric", refMin: "11.0", refMax: "15.0", textRange: "" },
        { id: "stage_child", stageName: "Child", minAge: 1, maxAge: 12, ageUnit: "years", gender: "BOTH", rangeType: "numeric", refMin: "11.5", refMax: "15.5", textRange: "" },
        { id: "stage_adult_m", stageName: "Adult Male", minAge: 13, maxAge: 60, ageUnit: "years", gender: "MALE", rangeType: "numeric", refMin: "13.8", refMax: "17.2", textRange: "" },
        { id: "stage_adult_f", stageName: "Adult Female", minAge: 13, maxAge: 60, ageUnit: "years", gender: "FEMALE", rangeType: "numeric", refMin: "12.1", refMax: "15.1", textRange: "" },
        { id: "stage_senior", stageName: "Senior Citizen", minAge: 61, maxAge: 120, ageUnit: "years", gender: "BOTH", rangeType: "numeric", refMin: "12.0", refMax: "16.0", textRange: "" },
      ];
      setTempAgeRanges(standardStages);
    }
    setAgeRangeModalOpen(true);
  };

  const handleLoadStandardAgeStages = () => {
    const standardStages: AgeRangeBand[] = [
      { id: "stage_newborn", stageName: "Newborn", minAge: 0, maxAge: 28, ageUnit: "days", gender: "BOTH", rangeType: "numeric", refMin: "14.0", refMax: "24.0", textRange: "" },
      { id: "stage_infant", stageName: "Infant", minAge: 1, maxAge: 12, ageUnit: "months", gender: "BOTH", rangeType: "numeric", refMin: "11.0", refMax: "15.0", textRange: "" },
      { id: "stage_child", stageName: "Child", minAge: 1, maxAge: 12, ageUnit: "years", gender: "BOTH", rangeType: "numeric", refMin: "11.5", refMax: "15.5", textRange: "" },
      { id: "stage_adult_m", stageName: "Adult Male", minAge: 13, maxAge: 60, ageUnit: "years", gender: "MALE", rangeType: "numeric", refMin: "13.8", refMax: "17.2", textRange: "" },
      { id: "stage_adult_f", stageName: "Adult Female", minAge: 13, maxAge: 60, ageUnit: "years", gender: "FEMALE", rangeType: "numeric", refMin: "12.1", refMax: "15.1", textRange: "" },
      { id: "stage_senior", stageName: "Senior Citizen", minAge: 61, maxAge: 120, ageUnit: "years", gender: "BOTH", rangeType: "numeric", refMin: "12.0", refMax: "16.0", textRange: "" },
    ];
    setTempAgeRanges(standardStages);
  };

  const handleSaveAgeRanges = () => {
    if (activeAgeRangeLocation) {
      const { parentIdx, subIdx } = activeAgeRangeLocation;
      if (subIdx !== undefined) {
        handleNestedSubTestChange(parentIdx, subIdx, "ageRanges", tempAgeRanges);
      } else {
        handleSubTestChange(parentIdx, "ageRanges", tempAgeRanges);
      }
    }
    setAgeRangeModalOpen(false);
  };

  const handleOpenLivePreview = () => {
    const finalCategory = category === "Other" && customCategory.trim() ? customCategory.trim() : category;
    const currentFormTest: any = {
      id: editingTest?.id || "preview-temp-id",
      name: name.trim() || "Diagnostic Test Panel",
      testCode: testCode || "PREVIEW",
      category: finalCategory,
      type: type,
      price: parseFloat(price) || 0,
      interpretation: interpretation.trim() || undefined,
      comment: comment.trim() || undefined,
      notes: notes.trim() || undefined,
      subTests: subTests.map((sub, sIdx) => ({
        id: sub.id || `preview-sub-${sIdx}`,
        name: sub.name.trim() || `Parameter #${sIdx + 1}`,
        method: sub.method,
        unit: sub.unit,
        genderRefType: sub.genderRefType,
        rangeType: sub.rangeType,
        textRefRange: sub.textRefRange,
        refRangeMin: sub.refRangeMin ? parseFloat(sub.refRangeMin) : null,
        refRangeMax: sub.refRangeMax ? parseFloat(sub.refRangeMax) : null,
        refRangeMinMale: sub.refRangeMinMale ? parseFloat(sub.refRangeMinMale) : null,
        refRangeMaxMale: sub.refRangeMaxMale ? parseFloat(sub.refRangeMaxMale) : null,
        refRangeMinFemale: sub.refRangeMinFemale ? parseFloat(sub.refRangeMinFemale) : null,
        refRangeMaxFemale: sub.refRangeMaxFemale ? parseFloat(sub.refRangeMaxFemale) : null,
        valueType: sub.valueType,
        sortOrder: sIdx + 1,
        sort_order: sIdx + 1,
        subTests: sub.subTests?.map((ss, ssIdx) => ({
          id: ss.id || `preview-ss-${sIdx}-${ssIdx}`,
          name: ss.name.trim() || `Sub-param #${ssIdx + 1}`,
          method: ss.method,
          unit: ss.unit,
          genderRefType: ss.genderRefType,
          rangeType: ss.rangeType,
          textRefRange: ss.textRefRange,
          refRangeMin: ss.refRangeMin ? parseFloat(ss.refRangeMin) : null,
          refRangeMax: ss.refRangeMax ? parseFloat(ss.refRangeMax) : null,
          refRangeMinMale: ss.refRangeMinMale ? parseFloat(ss.refRangeMinMale) : null,
          refRangeMaxMale: ss.refRangeMaxMale ? parseFloat(ss.refRangeMaxMale) : null,
          refRangeMinFemale: ss.refRangeMinFemale ? parseFloat(ss.refRangeMinFemale) : null,
          refRangeMaxFemale: ss.refRangeMaxFemale ? parseFloat(ss.refRangeMaxFemale) : null,
          valueType: ss.valueType,
          sortOrder: ssIdx + 1,
          sort_order: ssIdx + 1,
        }))
      }))
    };
    handleOpenSampleReport(currentFormTest);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a valid Test Name.");
      return;
    }
    const isCustomEditor = editingTest?.fieldType === "Custom Editor" || (editingTest as any)?.field_type === "Custom Editor" || (name || "").toLowerCase().includes("culture and sensitivity");

    if (!isCustomEditor && subTests.some(s => !s.name.trim())) {
      setError("Every parameter must have a name.");
      return;
    }

    setSaving(true);
    setError(null);

    const finalCategory = category === "Other" && customCategory.trim() ? customCategory.trim() : category;

    // Main Test payload
    const isSingleField = !isCustomEditor && subTests.length === 1 && (!subTests[0].subTests || subTests[0].subTests.length === 0);
    const primarySub = subTests[0];

    const payload: any = {
      name: name.trim(),
      test_code: testCode.trim() || undefined,
      category: finalCategory,
      type,
      price: parseFloat(price) || 0,
      interpretation: interpretation || undefined,
      comment: comment.trim() || undefined,
      notes: notes.trim() || undefined,
      field_type: isCustomEditor ? "Custom Editor" : (isSingleField ? "Single Field" : "Multiple Field"),
    };

    if (isCustomEditor) {
      payload.sub_tests = [];
    } else {
      // If single field, apply parameter ranges & method to main test record too
      if (isSingleField && primarySub) {
      payload.method = primarySub.method?.trim() || undefined;
      payload.unit = primarySub.unit.trim() || null;
      payload.gender_ref_type = primarySub.genderRefType;
      payload.range_type = primarySub.rangeType;
      payload.text_ref_range = primarySub.textRefRange || null;
      payload.value_type = primarySub.valueType;
      payload.custom_options = primarySub.customOptions;
      payload.age_ranges = primarySub.ageRanges;

      if (primarySub.rangeType === "numeric") {
        payload.ref_range_min = primarySub.refRangeMin ? parseFloat(primarySub.refRangeMin) : null;
        payload.ref_range_max = primarySub.refRangeMax ? parseFloat(primarySub.refRangeMax) : null;
        payload.ref_range_min_male = primarySub.refRangeMinMale ? parseFloat(primarySub.refRangeMinMale) : null;
        payload.ref_range_max_male = primarySub.refRangeMaxMale ? parseFloat(primarySub.refRangeMaxMale) : null;
        payload.ref_range_min_female = primarySub.refRangeMinFemale ? parseFloat(primarySub.refRangeMinFemale) : null;
        payload.ref_range_max_female = primarySub.refRangeMaxFemale ? parseFloat(primarySub.refRangeMaxFemale) : null;
        payload.ref_range_min_child = primarySub.refRangeMinChild ? parseFloat(primarySub.refRangeMinChild) : null;
        payload.ref_range_max_child = primarySub.refRangeMaxChild ? parseFloat(primarySub.refRangeMaxChild) : null;
        payload.ref_range_min_newborn = primarySub.refRangeMinNewborn ? parseFloat(primarySub.refRangeMinNewborn) : null;
        payload.ref_range_max_newborn = primarySub.refRangeMaxNewborn ? parseFloat(primarySub.refRangeMaxNewborn) : null;
      }
    }

    // Map sub tests (supporting nested sub-tests with sequential sort_order)
    payload.sub_tests = subTests.map((sub, sIdx) => {
      const mappedSub: any = {
        name: sub.name.trim(),
        category: finalCategory,
        type: type,
        method: sub.method?.trim() || undefined,
        unit: sub.unit.trim() || null,
        gender_ref_type: sub.genderRefType,
        range_type: sub.rangeType,
        text_ref_range: sub.textRefRange || null,
        ref_range_min: sub.refRangeMin ? parseFloat(sub.refRangeMin) : null,
        ref_range_max: sub.refRangeMax ? parseFloat(sub.refRangeMax) : null,
        ref_range_min_male: sub.refRangeMinMale ? parseFloat(sub.refRangeMinMale) : null,
        ref_range_max_male: sub.refRangeMaxMale ? parseFloat(sub.refRangeMaxMale) : null,
        ref_range_min_female: sub.refRangeMinFemale ? parseFloat(sub.refRangeMinFemale) : null,
        ref_range_max_female: sub.refRangeMaxFemale ? parseFloat(sub.refRangeMaxFemale) : null,
        ref_range_min_child: sub.refRangeMinChild ? parseFloat(sub.refRangeMinChild) : null,
        ref_range_max_child: sub.refRangeMaxChild ? parseFloat(sub.refRangeMaxChild) : null,
        ref_range_min_newborn: sub.refRangeMinNewborn ? parseFloat(sub.refRangeMinNewborn) : null,
        ref_range_max_newborn: sub.refRangeMaxNewborn ? parseFloat(sub.refRangeMaxNewborn) : null,
        age_ranges: sub.ageRanges,
        field_type: (sub.subTests && sub.subTests.length > 0) ? "Multiple Field" : "Single Field",
        value_type: sub.valueType,
        custom_options: sub.customOptions,
        sort_order: sIdx + 1,
      };

      if (sub.subTests && sub.subTests.length > 0) {
        mappedSub.sub_tests = sub.subTests.map((ss, ssIdx) => ({
          name: ss.name.trim(),
          category: finalCategory,
          type: type,
          method: ss.method?.trim() || undefined,
          unit: ss.unit.trim() || null,
          gender_ref_type: ss.genderRefType,
          range_type: ss.rangeType,
          text_ref_range: ss.textRefRange || null,
          ref_range_min: ss.refRangeMin ? parseFloat(ss.refRangeMin) : null,
          ref_range_max: ss.refRangeMax ? parseFloat(ss.refRangeMax) : null,
          ref_range_min_male: ss.refRangeMinMale ? parseFloat(ss.refRangeMinMale) : null,
          ref_range_max_male: ss.refRangeMaxMale ? parseFloat(ss.refRangeMaxMale) : null,
          ref_range_min_female: ss.refRangeMinFemale ? parseFloat(ss.refRangeMinFemale) : null,
          ref_range_max_female: ss.refRangeMaxFemale ? parseFloat(ss.refRangeMaxFemale) : null,
          ref_range_min_child: ss.refRangeMinChild ? parseFloat(ss.refRangeMinChild) : null,
          ref_range_max_child: ss.refRangeMaxChild ? parseFloat(ss.refRangeMaxChild) : null,
          ref_range_min_newborn: ss.refRangeMinNewborn ? parseFloat(ss.refRangeMinNewborn) : null,
          ref_range_max_newborn: ss.refRangeMaxNewborn ? parseFloat(ss.refRangeMaxNewborn) : null,
          age_ranges: ss.ageRanges,
          field_type: "Single Field",
          value_type: ss.valueType,
          custom_options: ss.customOptions,
          sort_order: ssIdx + 1,
        }));
      }

      return mappedSub;
    });
    }

    try {
      if (editingTest) {
        const testIdentifier = editingTest.id || editingTest.testCode;
        await fetchFromLaravel(`/tests/${testIdentifier}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Test updated successfully in database!");
      } else {
        await fetchFromLaravel("/tests", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("New test created successfully!");
      }
      setDialogOpen(false);
      setEditingTest(null);
      await fetchTests(true);
    } catch (err: any) {
      console.error("Save test error:", err);
      setError(err.message || "Failed to save test. Please check all fields.");
      toast.error(err.message || "Failed to save test");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchFromLaravel(`/tests/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchTests(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete test");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, pageSize]);

  const filteredTests = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return tests.filter(t => {
      const nameMatch = !q || (t.name || "").toLowerCase().includes(q);
      const codeMatch = !q || Boolean(t.testCode && t.testCode.toLowerCase().includes(q));
      const subMatch = !q || Boolean(t.subTests && t.subTests.some(s => (s.name || "").toLowerCase().includes(q)));
      const matchQuery = nameMatch || codeMatch || subMatch;

      const testCat = (t.category || "").trim().toLowerCase();
      const matchCat = selectedCategory === "ALL" || testCat === selectedCategory.toLowerCase();
      return matchQuery && matchCat;
    });
  }, [tests, search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / pageSize));
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2.5">
            <FlaskConical className="h-6 w-6 text-primary" />
            <span>Test Master & Medical Catalog</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure laboratory tests, age-graded reference ranges, multiple parameters, methods, and clinical interpretations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenAddDialog}
            className="rounded-lg px-4 py-2 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Test</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-card border border-border/80 p-3.5 rounded-xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test name, test code, or parameter..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills Dropdown */}
        <div className="w-full md:w-64">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-10 rounded-lg text-xs font-semibold bg-background border-border">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-lg text-xs">
              <SelectItem value="ALL">All Categories ({tests.length})</SelectItem>
              {standardCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tests Table */}
      {loading ? (
        <div className="bg-card border border-border/90 rounded-xl shadow-xs overflow-hidden">
          <div className="hidden md:block table-responsive-container">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/80">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4 font-bold">TEST NAME</th>
                  <th className="py-3 px-4 font-bold">CODE</th>
                  <th className="py-3 px-4 font-bold">CATEGORY</th>
                  <th className="py-3 px-4 font-bold">PARAMETERS</th>
                  <th className="py-3 px-4 font-bold">PRICE</th>
                  <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-fade-in">
                    <td className="py-3.5 px-4"><div className="h-4 w-4 rounded shimmer-gradient" /></td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-44 rounded shimmer-gradient mb-1.5" />
                      <div className="h-3 w-28 rounded shimmer-gradient" />
                    </td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 rounded shimmer-gradient" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-24 rounded-full shimmer-gradient" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 rounded shimmer-gradient" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-14 rounded shimmer-gradient" /></td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-7 w-7 rounded-md shimmer-gradient" />
                        <div className="h-7 w-7 rounded-md shimmer-gradient" />
                        <div className="h-7 w-7 rounded-md shimmer-gradient" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-border/70 space-y-2 bg-background/50">
                <div className="h-4 w-40 rounded shimmer-gradient" />
                <div className="h-3 w-24 rounded shimmer-gradient" />
                <div className="flex justify-between items-center pt-2 border-t border-border/40">
                  <div className="h-4 w-14 rounded shimmer-gradient" />
                  <div className="h-6 w-20 rounded-md shimmer-gradient" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="py-20 text-center bg-card border border-border/80 rounded-xl p-8 space-y-3">
          <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
          <h3 className="font-display text-base font-bold text-foreground">No matching tests found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your search keywords or click "+ Add New Test" to create a custom diagnostic test panel.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/90 rounded-xl shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block table-responsive-container">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/80">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4 font-bold">TEST NAME</th>
                  <th className="py-3 px-4 font-bold">CODE</th>
                  <th className="py-3 px-4 font-bold">CATEGORY</th>
                  <th className="py-3 px-4 font-bold">PARAMETERS</th>
                  <th className="py-3 px-4 font-bold">PRICE</th>
                  <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedTests.map(test => {
                  const hasSub = test.subTests && test.subTests.length > 0;
                  const isExpanded = !!expandedRows[test.id];

                  return (
                    <React.Fragment key={test.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-3 text-center">
                          {hasSub && (
                            <button
                              onClick={() => setExpandedRows(prev => ({ ...prev, [test.id]: !prev[test.id] }))}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{test.name}</span>
                            {test.interpretation && (
                              <span title="Has clinical interpretation" className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.2 rounded font-bold">
                                📝 Interp
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {test.testCode || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-muted border border-border/80 text-foreground">
                            {test.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-muted-foreground">
                          {hasSub ? `${test.subTests!.length} Parameters` : "Single Field"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          ₹{Number(test.price || 0).toFixed(0)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenSampleReport(test)}
                              className="p-1.5 rounded-md border border-border/80 bg-background text-primary hover:bg-primary/10 transition-colors cursor-pointer shadow-xs"
                              title="View Sample Report (Live Preview)"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditDialog(test)}
                              className="p-1.5 rounded-md border border-border/80 bg-background text-foreground hover:bg-accent cursor-pointer shadow-xs"
                              title="Edit test"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(test)}
                              className="p-1.5 rounded-md border border-border/80 bg-background text-destructive hover:bg-destructive/10 cursor-pointer shadow-xs"
                              title="Delete test"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-tests row */}
                      {isExpanded && hasSub && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="py-3 px-8">
                            <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Test Parameters ({test.subTests!.length})
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {test.subTests!.map((sub, sIdx) => (
                                  <div key={sIdx} className="p-2.5 rounded-md border border-border/60 bg-background text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-foreground">{sub.name}</span>
                                      <span className="font-mono text-[10px] text-muted-foreground">{sub.unit || "No Unit"}</span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {sub.rangeType === "text" ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-mono">{sub.textRefRange || "Text Range"}</span>
                                      ) : sub.genderRefType === "GENDER_SPECIFIC" ? (
                                        <span>M: {sub.refRangeMinMale || 0}-{sub.refRangeMaxMale || 0} | F: {sub.refRangeMinFemale || 0}-{sub.refRangeMaxFemale || 0}</span>
                                      ) : (
                                        <span>Range: {sub.refRangeMin || 0} - {sub.refRangeMax || 0}</span>
                                      )}
                                    </div>
                                    {sub.method && (
                                      <div className="text-[10px] text-muted-foreground italic truncate">
                                        Method: {sub.method}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Optimized for small screens) */}
          <div className="block md:hidden divide-y divide-border/60">
            {paginatedTests.map(test => {
              const hasSub = test.subTests && test.subTests.length > 0;
              const isExpanded = !!expandedRows[test.id];

              return (
                <div key={test.id} className="p-4 space-y-2.5 bg-card hover:bg-muted/10 transition-colors">
                  {/* Top row: Name & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground break-words">{test.name}</span>
                        {test.interpretation && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                            📝 Interp
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {test.testCode || "—"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted border border-border/80 text-foreground">
                          {test.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenSampleReport(test)}
                        className="p-1.5 rounded-md border border-border/80 bg-background text-primary hover:bg-primary/10 transition-colors cursor-pointer shadow-xs"
                        title="Live Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditDialog(test)}
                        className="p-1.5 rounded-md border border-border/80 bg-background text-foreground hover:bg-accent cursor-pointer shadow-xs"
                        title="Edit test"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(test)}
                        className="p-1.5 rounded-md border border-border/80 bg-background text-destructive hover:bg-destructive/10 cursor-pointer shadow-xs"
                        title="Delete test"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Middle row: Price & Parameter count */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">
                      {hasSub ? `${test.subTests!.length} Parameters` : "Single Field"}
                    </span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      ₹{Number(test.price || 0).toFixed(0)}
                    </span>
                  </div>

                  {/* Expand Sub-tests Button (Mobile) */}
                  {hasSub && (
                    <div>
                      <button
                        onClick={() => setExpandedRows(prev => ({ ...prev, [test.id]: !prev[test.id] }))}
                        className="flex items-center justify-between w-full py-1.5 px-2.5 rounded-md bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-muted-foreground transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Parameters" : `View ${test.subTests!.length} Parameters`}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pl-1">
                          {test.subTests!.map((sub, sIdx) => (
                            <div key={sIdx} className="p-2 rounded border border-border/60 bg-background text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{sub.name}</span>
                                <span className="font-mono text-[10px] text-muted-foreground">{sub.unit || "No Unit"}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {sub.rangeType === "text" ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-mono">{sub.textRefRange || "Text"}</span>
                                ) : sub.genderRefType === "GENDER_SPECIFIC" ? (
                                  <span>M: {sub.refRangeMinMale || 0}-{sub.refRangeMaxMale || 0} | F: {sub.refRangeMinFemale || 0}-{sub.refRangeMaxFemale || 0}</span>
                                ) : (
                                  <span>Range: {sub.refRangeMin || 0} - {sub.refRangeMax || 0}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="border-t border-border/80 px-4 py-3 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
              <span>
                Showing <strong className="text-foreground font-semibold">{filteredTests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-foreground font-semibold">
                  {Math.min(currentPage * pageSize, filteredTests.length)}
                </strong>{" "}
                of <strong className="text-foreground font-semibold">{filteredTests.length}</strong> tests
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 px-2 rounded-md bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 justify-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded-md border border-border/80 bg-background text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted cursor-pointer transition-colors"
                title="First Page"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-border/80 bg-background text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted cursor-pointer transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Page indicator buttons */}
              <div className="flex items-center gap-1 mx-1">
                {getPaginationRange(currentPage, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground font-mono">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`h-7 min-w-[28px] px-2 rounded-md font-mono font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === p
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border/80 bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-border/80 bg-background text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted cursor-pointer transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded-md border border-border/80 bg-background text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted cursor-pointer transition-colors"
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAJESTIC FULL-WIDTH DIALOG WINDOW (w-[95vw] h-[92vh] max-w-[95vw])
      ========================================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw] h-[92vh] max-h-[94vh] p-0 gap-0 overflow-hidden rounded-2xl border border-border/90 bg-card shadow-2xl flex flex-col" hideClose>
          {/* Top Bar with Back Arrow & Actions (No redundant X cross icon) */}
          <div className="min-h-16 py-2.5 sm:py-0 border-b border-border/80 bg-card px-3 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg border border-border/80 bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <ArrowLeft className="h-4 w-4 text-primary" />
                <span>Back</span>
              </button>

              <div className="h-5 w-px bg-border/80 hidden sm:block" />

              <div className="min-w-0">
                <DialogTitle className="font-display text-sm sm:text-base font-bold text-foreground flex items-center gap-2 truncate">
                  <span className="truncate">{editingTest ? `Edit Test: ${editingTest.name}` : "Create Diagnostic Test Panel"}</span>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] sm:text-[11px] font-mono font-bold shrink-0">
                    {testCode || "NEW"}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground hidden sm:block">
                  Configure clinical parameters, units, age/gender intervals, methods, and interpretations.
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 justify-end">
              <button
                type="button"
                onClick={handleOpenLivePreview}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer shadow-xs"
                title="Open live report layout preview and parameter manager"
              >
                <Eye className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-emerald-500" />
                <span>Live Preview</span>
              </button>


              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg px-3 sm:px-4 h-8 sm:h-10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSaveTest}
                disabled={saving}
                className="rounded-lg px-4 sm:px-6 h-8 sm:h-10 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin" /> : <Check className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>{editingTest ? "Save Changes" : "Create Test"}</span>
              </Button>
            </div>
          </div>

          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-xs bg-muted/10">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2.5 shadow-xs">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Master Overview Card (Clean Standard 4-Column Grid with Comfortable Height) */}
            <div className="p-6 bg-card border border-border/80 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
                    1. Test Classification & Overview
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">General test panel metadata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Test Name */}
                <div className="space-y-2">
                  <label className="font-bold text-xs text-foreground block">Test / Panel Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Complete Blood Count (CBC) or Lipid Profile"
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-semibold focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all shadow-xs"
                  />
                </div>

                {/* 2. Test Code */}
                <div className="space-y-2">
                  <label className="font-bold text-xs text-foreground block">Test Code *</label>
                  <input
                    type="text"
                    required
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SYS_CBC_01"
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-primary font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all shadow-xs"
                  />
                </div>

                {/* 3. Category */}
                <div className="space-y-2">
                  <label className="font-bold text-xs text-foreground block">Category / Department *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-medium focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all shadow-xs"
                  >
                    {standardCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Price */}
                <div className="space-y-2">
                  <label className="font-bold text-xs text-foreground block">Standard Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-muted-foreground font-bold text-sm">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="350"
                      className="w-full h-11 pl-9 pr-4 rounded-lg border border-border bg-background text-foreground font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Custom Category if other */}
                {category === "Other" && (
                  <div className="lg:col-span-2 space-y-2">
                    <label className="font-bold text-xs text-foreground block">Specify Department</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom department"
                      className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground outline-none text-sm shadow-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic Parameters Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-xs">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <span>2. Diagnostic Parameters & Reference Intervals ({subTests.length})</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Drag <GripVertical className="inline h-3.5 w-3.5 text-muted-foreground" /> or use arrows to re-order. Click "+ Sub-param" to create nested group parameters.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleAddSubTest}
                  className="rounded-lg px-4 py-2.5 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Parameter</span>
                </Button>
              </div>

              {/* Parameter Cards with Drag & Drop & Sub-Parameters */}
              <div className="space-y-4">
                {subTests.map((sub, sIdx) => {
                  const isTextRange = sub.rangeType === "text";
                  const isCustomOptions = sub.valueType === "Custom Options";
                  const hasNested = sub.subTests && sub.subTests.length > 0;

                  return (
                    <div
                      key={sIdx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sIdx)}
                      onDragOver={(e) => handleDragOver(e, sIdx)}
                      onDrop={(e) => handleDrop(e, sIdx)}
                      className={`p-6 bg-card border border-border/90 rounded-xl shadow-xs space-y-4 hover:border-primary/50 transition-all relative ${
                        draggedIndex === sIdx ? "opacity-40 border-dashed border-primary" : ""
                      }`}
                    >
                      {/* Row 1: Drag handle, Reorder Arrows, Number, Name, Unit, Value Type, Range Mode, Sub-param CTA, Delete */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
                        {/* Drag Handle & Parameter Name */}
                        <div className="lg:col-span-5 flex items-center gap-2.5">
                          <div className="flex items-center gap-0.5 text-muted-foreground">
                            <span className="cursor-grab active:cursor-grabbing p-1.5 hover:text-foreground" title="Drag to reorder">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={sIdx === 0}
                                onClick={() => moveParameterUp(sIdx)}
                                className="p-0.5 hover:text-foreground disabled:opacity-30 cursor-pointer"
                                title="Move up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={sIdx === subTests.length - 1}
                                onClick={() => moveParameterDown(sIdx)}
                                className="p-0.5 hover:text-foreground disabled:opacity-30 cursor-pointer"
                                title="Move down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            #{sIdx + 1}
                          </span>

                          <input
                            type="text"
                            required
                            value={sub.name}
                            onChange={(e) => handleSubTestChange(sIdx, "name", e.target.value)}
                            placeholder="Parameter Name (e.g. Hemoglobin / Differential Count)"
                            className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-semibold text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-xs"
                          />
                        </div>

                        {/* Unit Picker with Popover */}
                        <div className="lg:col-span-2 relative">
                          <input
                            type="text"
                            value={sub.unit}
                            onChange={(e) => handleSubTestChange(sIdx, "unit", e.target.value)}
                            placeholder="Unit (g/dL)"
                            className="w-full h-11 px-3.5 pr-8 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveUnitDropdownId(activeUnitDropdownId === `p_${sIdx}` ? null : `p_${sIdx}`)}
                            className="absolute right-2.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>

                          {/* Unit Popover */}
                          {activeUnitDropdownId === `p_${sIdx}` && (
                            <div className="absolute z-50 right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-2xl p-3 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between border-b border-border pb-1.5">
                                <span className="font-bold text-xs text-foreground">Select Clinical Unit</span>
                                <button onClick={() => setActiveUnitDropdownId(null)} className="text-xs text-muted-foreground">✕</button>
                              </div>
                              <div className="max-h-52 overflow-y-auto space-y-2.5 text-xs">
                                {Object.entries(CATEGORIZED_UNITS).map(([catName, unitList]) => (
                                  <div key={catName} className="space-y-1">
                                    <p className="font-bold text-[10px] uppercase text-muted-foreground">{catName}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {unitList.map(u => (
                                        <button
                                          key={u}
                                          type="button"
                                          onClick={() => {
                                            handleSubTestChange(sIdx, "unit", u);
                                            setActiveUnitDropdownId(null);
                                          }}
                                          className="px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary text-[11px] font-mono transition-colors cursor-pointer"
                                        >
                                          {u}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Value Input Type */}
                        <div className="lg:col-span-2">
                          <select
                            value={sub.valueType}
                            onChange={(e) => handleSubTestChange(sIdx, "valueType", e.target.value)}
                            className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-foreground font-medium text-xs focus:ring-2 focus:ring-primary/20 outline-none shadow-xs"
                          >
                            <option value="Numeric">Numeric Input</option>
                            <option value="Custom Options">Custom Options</option>
                            <option value="Text">Free Text / Paragraph</option>
                          </select>
                        </div>

                        {/* Range Mode Switch (Numeric vs Text) */}
                        <div className="lg:col-span-2 flex items-center bg-muted/60 p-1 rounded-lg border border-border/70 h-11">
                          <button
                            type="button"
                            onClick={() => handleSubTestChange(sIdx, "rangeType", "numeric")}
                            className={`flex-1 h-9 rounded-md text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
                              !isTextRange ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                            }`}
                          >
                            Numeric
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubTestChange(sIdx, "rangeType", "text")}
                            className={`flex-1 h-9 rounded-md text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
                              isTextRange ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                            }`}
                          >
                            Text
                          </button>
                        </div>

                        {/* Delete */}
                        <div className="lg:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveSubTest(sIdx)}
                            className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Delete parameter"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Method Selector & Action Buttons (Age bands, Custom Choices, Sub-param) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 pt-3 border-t border-border/50 text-xs items-center">
                        {/* Parameter Specific Method Selector with Dropdown */}
                        <div className={`${isCustomOptions ? "lg:col-span-4" : "lg:col-span-6"} sm:col-span-2 relative`}>
                          <input
                            type="text"
                            value={sub.method || ""}
                            onChange={(e) => handleSubTestChange(sIdx, "method", e.target.value)}
                            placeholder="Method / Analytical Technique (e.g. Automated Flow Cytometry / GOD-POD / CLIA)"
                            className="w-full h-11 px-4 pr-9 rounded-lg border border-border bg-background text-foreground text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-xs placeholder:text-muted-foreground/60"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveMethodDropdownId(activeMethodDropdownId === `m_${sIdx}` ? null : `m_${sIdx}`)}
                            className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>

                          {/* Method Dropdown */}
                          {activeMethodDropdownId === `m_${sIdx}` && (
                            <div className="absolute z-50 left-0 right-0 top-12 bg-card border border-border rounded-xl shadow-2xl max-h-56 overflow-y-auto p-1.5 space-y-0.5 animate-fade-in">
                              {INBUILT_METHODS.map(m => (
                                <div
                                  key={m}
                                  onClick={() => {
                                    handleSubTestChange(sIdx, "method", m);
                                    setActiveMethodDropdownId(null);
                                  }}
                                  className="p-2.5 rounded-md hover:bg-muted cursor-pointer text-xs font-medium text-foreground transition-colors"
                                >
                                  {m}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Custom Options Trigger if applicable */}
                        {isCustomOptions && (
                          <div className="lg:col-span-3 sm:col-span-1">
                            <button
                              type="button"
                              onClick={() => handleOpenCustomOptions(sIdx)}
                              className="w-full h-11 px-4 rounded-lg border border-primary/40 bg-primary/10 text-primary font-bold hover:bg-primary/20 flex items-center justify-between cursor-pointer transition-colors shadow-xs text-xs"
                            >
                              <span>Configure Choices ({(sub.customOptions || []).length})</span>
                              <Sliders className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Age Bands Button */}
                        <div className={`${isCustomOptions ? "lg:col-span-3" : "lg:col-span-3"} sm:col-span-1`}>
                          <button
                            type="button"
                            onClick={() => handleOpenAgeRanges(sIdx)}
                            className={`w-full h-11 px-4 rounded-lg border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs ${
                              (sub.ageRanges || []).length > 0
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-border bg-background text-foreground hover:bg-muted/60"
                            }`}
                          >
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Age Intervals ({(sub.ageRanges || []).length})</span>
                          </button>
                        </div>

                        {/* Sub-param Add Button */}
                        <div className={`${isCustomOptions ? "lg:col-span-2" : "lg:col-span-3"} sm:col-span-1`}>
                          <button
                            type="button"
                            onClick={() => handleAddNestedSubTest(sIdx)}
                            className="w-full h-11 px-4 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                            title="Add sub-parameter under this parameter"
                          >
                            <Plus className="h-4 w-4" />
                            <span>+ Add Sub-param</span>
                          </button>
                        </div>
                      </div>

                      {/* Row 3: Reference Intervals / Criteria */}
                      <div className="pt-3 border-t border-border/50">
                        {isTextRange ? (
                          /* Text / Paragraph Normal Range */
                          <div className="space-y-2">
                            <label className="font-bold text-foreground text-xs block">
                              Text / Paragraph Normal Reference Criteria (e.g. "&lt; 200 mg/dL (Desirable)", "Non-Reactive for Antibodies", "Negative")
                            </label>
                            <textarea
                              rows={2}
                              value={sub.textRefRange}
                              onChange={(e) => handleSubTestChange(sIdx, "textRefRange", e.target.value)}
                              placeholder="Enter multi-line descriptive normal range criteria..."
                              className="w-full p-3.5 rounded-lg border border-border bg-background text-foreground font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                            />
                          </div>
                        ) : (
                          /* Numeric Reference Intervals */
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="font-bold text-foreground text-xs">
                                Standard Reference Interval ({sub.unit || "unit"})
                              </label>
                              {/* Gender Specific Switch */}
                              <div className="flex items-center gap-4 text-xs font-semibold">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`fs_gender_${sIdx}`}
                                    checked={sub.genderRefType === "BOTH"}
                                    onChange={() => handleSubTestChange(sIdx, "genderRefType", "BOTH")}
                                  />
                                  <span>General (Both)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`fs_gender_${sIdx}`}
                                    checked={sub.genderRefType === "GENDER_SPECIFIC"}
                                    onChange={() => handleSubTestChange(sIdx, "genderRefType", "GENDER_SPECIFIC")}
                                  />
                                  <span>Gender-Specific (Male / Female)</span>
                                </label>
                              </div>
                            </div>

                            {sub.genderRefType === "BOTH" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                                <div className="space-y-1.5">
                                  <span className="text-xs text-muted-foreground font-bold">Min Normal</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sub.refRangeMin}
                                    onChange={(e) => handleSubTestChange(sIdx, "refRangeMin", e.target.value)}
                                    placeholder="e.g. 13.0"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-mono text-sm font-semibold outline-none shadow-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-xs text-muted-foreground font-bold">Max Normal</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sub.refRangeMax}
                                    onChange={(e) => handleSubTestChange(sIdx, "refRangeMax", e.target.value)}
                                    placeholder="e.g. 17.0"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-mono text-sm font-semibold outline-none shadow-xs"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                                <div className="space-y-1.5">
                                  <span className="text-xs text-blue-600 font-bold">Male Min</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sub.refRangeMinMale}
                                    onChange={(e) => handleSubTestChange(sIdx, "refRangeMinMale", e.target.value)}
                                    placeholder="13.8"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-mono text-sm font-semibold outline-none shadow-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-xs text-blue-600 font-bold">Male Max</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sub.refRangeMaxMale}
                                    onChange={(e) => handleSubTestChange(sIdx, "refRangeMaxMale", e.target.value)}
                                    placeholder="17.2"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-mono text-sm font-semibold outline-none shadow-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-xs text-pink-600 font-bold">Female Min</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sub.refRangeMinFemale}
                                    onChange={(e) => handleSubTestChange(sIdx, "refRangeMinFemale", e.target.value)}
                                    placeholder="12.1"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-mono text-sm font-semibold outline-none shadow-xs"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <span className="text-xs text-pink-600 font-bold">Female Max</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={sub.refRangeMaxFemale}
                                    onChange={(e) => handleSubTestChange(sIdx, "refRangeMaxFemale", e.target.value)}
                                    placeholder="15.1"
                                    className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground font-mono text-sm font-semibold outline-none shadow-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Nested Sub-parameters List if any */}
                      {hasNested && (
                        <div className="mt-4 pt-4 border-t-2 border-primary/20 pl-4 sm:pl-8 space-y-3 bg-muted/20 p-4 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <CornerDownRight className="h-4 w-4 text-primary" />
                              <span>Sub-Parameters of {sub.name || `Parameter #${sIdx + 1}`} ({sub.subTests!.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddNestedSubTest(sIdx)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>+ Add Sub-parameter</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            {sub.subTests!.map((nested, nIdx) => (
                              <div key={nIdx} className="p-4 rounded-lg bg-card border border-border shadow-xs space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                  <div className="sm:col-span-4 flex items-center gap-2">
                                    <span className="px-2 py-1 rounded bg-muted text-xs font-mono font-bold text-muted-foreground">
                                      {sIdx + 1}.{nIdx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      required
                                      value={nested.name}
                                      onChange={(e) => handleNestedSubTestChange(sIdx, nIdx, "name", e.target.value)}
                                      placeholder="Sub-param Name (e.g. Neutrophils)"
                                      className="w-full h-10 px-3.5 rounded-lg border border-border bg-background text-sm font-semibold shadow-xs"
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={nested.unit}
                                      onChange={(e) => handleNestedSubTestChange(sIdx, nIdx, "unit", e.target.value)}
                                      placeholder="Unit (%)"
                                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-mono shadow-xs"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <input
                                      type="text"
                                      value={nested.method || ""}
                                      onChange={(e) => handleNestedSubTestChange(sIdx, nIdx, "method", e.target.value)}
                                      placeholder="Method (Optional)"
                                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs shadow-xs"
                                    />
                                  </div>

                                  <div className="sm:col-span-2 flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="any"
                                      value={nested.refRangeMin}
                                      onChange={(e) => handleNestedSubTestChange(sIdx, nIdx, "refRangeMin", e.target.value)}
                                      placeholder="Min"
                                      className="w-full h-10 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-center shadow-xs"
                                    />
                                    <span>-</span>
                                    <input
                                      type="number"
                                      step="any"
                                      value={nested.refRangeMax}
                                      onChange={(e) => handleNestedSubTestChange(sIdx, nIdx, "refRangeMax", e.target.value)}
                                      placeholder="Max"
                                      className="w-full h-10 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-center shadow-xs"
                                    />
                                  </div>

                                  <div className="sm:col-span-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveNestedSubTest(sIdx, nIdx)}
                                      className="p-2 text-muted-foreground hover:text-destructive cursor-pointer"
                                      title="Delete sub-parameter"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={subtestsEndRef} />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer Bar */}
          <div className="p-4 px-6 sm:px-8 border-t border-border bg-background/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">{subTests.length} Parameter{subTests.length !== 1 ? "s" : ""}</span>
              <span>•</span>
              <span className="font-semibold text-foreground">Category: {category === "Other" && customCategory ? customCategory : category}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="rounded-xl px-5 h-11 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>

              <button
                type="button"
                onClick={() => setNotesModalOpen(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 h-11 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Interpretation</span>
              </button>

              <Button
                type="button"
                onClick={handleSaveTest}
                disabled={saving}
                className="rounded-xl px-8 h-11 gradient-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{saving ? "Saving to Database..." : (editingTest ? "Save Changes" : "Create Test")}</span>
              </Button>
            </div>
          </div>

          {/* Saving Progress Overlay */}
          {saving && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-50 animate-fade-in">
              <div className="p-6 bg-card border border-border shadow-2xl rounded-2xl flex flex-col items-center gap-3 max-w-xs text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Saving Test Changes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Updating parameters and database records...</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          HORIZONTAL / LANDSCAPE CUSTOM OPTIONS MODAL DIALOG
      ========================================================================= */}
      <Dialog open={customOptionsModalOpen} onOpenChange={setCustomOptionsModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-card" hideClose>
          <div className="p-4 px-6 border-b border-border/80 bg-card flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <span>Configure Qualitative Dropdown Options</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select pre-built clinical choice sets or define custom qualitative values.
              </DialogDescription>
            </div>
            <button
              onClick={() => setCustomOptionsModalOpen(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted transition-colors cursor-pointer border border-border/70 shadow-xs"
              title="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto">
            {/* Left Pane: Quick Pre-built Packs */}
            <div className="md:col-span-6 space-y-3 border-r border-border/70 pr-4">
              <p className="font-bold text-xs text-foreground uppercase tracking-wider">
                ⚡ Quick Clinical Preset Packs
              </p>
              <div className="space-y-2">
                {QUICK_OPTION_PRESETS.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    onClick={() => handleApplyPreset(p.options)}
                    className="p-3 rounded-lg border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        {p.title}
                      </span>
                      <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Apply &rarr;
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.options.map(opt => (
                        <span key={opt} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Pane: Active Selected Choices */}
            <div className="md:col-span-6 space-y-4">
              <div>
                <p className="font-bold text-xs text-foreground uppercase tracking-wider">
                  Active Options List ({tempCustomOptions.length})
                </p>
                <p className="text-xs text-muted-foreground">
                  These choices will be displayed as a dropdown when entering results.
                </p>
              </div>

              {/* Add custom input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomOption(); } }}
                  placeholder="Type new option (e.g. 2+ (100 mg/dL))..."
                  className="flex-1 h-10 px-3.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  type="button"
                  onClick={handleAddCustomOption}
                  className="rounded-lg px-4 h-10 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  Add
                </Button>
              </div>

              {/* Active Badges */}
              <div className="min-h-[140px] p-3 rounded-lg bg-muted/30 border border-border/70 flex flex-wrap gap-1.5 items-start content-start">
                {tempCustomOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic m-auto">No options added yet. Click a preset pack or type above.</p>
                ) : (
                  tempCustomOptions.map((opt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border shadow-xs text-xs font-semibold text-foreground"
                    >
                      <span>{opt}</span>
                      <button
                        type="button"
                        onClick={() => setTempCustomOptions(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-4 px-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomOptionsModalOpen(false)}
              className="rounded-lg px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustomOptions}
              className="rounded-lg px-6 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Save Options
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          HORIZONTAL / LANDSCAPE AGE-BASED REFERENCE RANGES DIALOG
      ========================================================================= */}
      <Dialog open={ageRangeModalOpen} onOpenChange={setAgeRangeModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-card" hideClose>
          <div className="p-4 px-6 border-b border-border/80 bg-card flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Age-Graded Reference Ranges (Newborn, Child, Adult, Senior)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Standard age intervals automatically pre-configured. Edit values or adjust age spans.
              </DialogDescription>
            </div>
            <button
              onClick={() => setAgeRangeModalOpen(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted transition-colors cursor-pointer border border-border/70 shadow-xs"
              title="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleLoadStandardAgeStages}
                className="rounded-lg px-3.5 py-2 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Reset to Standard Stages (0-120 Yrs)</span>
              </Button>

              <span className="text-xs text-muted-foreground font-medium">
                {tempAgeRanges.length} Age Stages Active
              </span>
            </div>

            <div className="space-y-2.5">
              {tempAgeRanges.map((band, bIdx) => (
                <div key={band.id || bIdx} className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Stage Name */}
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="font-bold text-[11px] text-muted-foreground uppercase">Stage / Name</label>
                      <input
                        type="text"
                        value={band.stageName}
                        onChange={(e) => {
                          const updated = [...tempAgeRanges];
                          updated[bIdx].stageName = e.target.value;
                          setTempAgeRanges(updated);
                        }}
                        placeholder="e.g. Newborn"
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background font-bold text-xs shadow-xs"
                      />
                    </div>

                    {/* Age Span */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="font-bold text-[11px] text-muted-foreground uppercase">Age Span (From - To)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={band.minAge}
                          onChange={(e) => {
                            const updated = [...tempAgeRanges];
                            updated[bIdx].minAge = Number(e.target.value);
                            setTempAgeRanges(updated);
                          }}
                          className="w-16 h-10 px-2.5 rounded-lg border border-border bg-background font-mono text-center text-xs shadow-xs"
                        />
                        <span className="text-muted-foreground font-semibold">to</span>
                        <input
                          type="number"
                          min="0"
                          value={band.maxAge}
                          onChange={(e) => {
                            const updated = [...tempAgeRanges];
                            updated[bIdx].maxAge = Number(e.target.value);
                            setTempAgeRanges(updated);
                          }}
                          className="w-16 h-10 px-2.5 rounded-lg border border-border bg-background font-mono text-center text-xs shadow-xs"
                        />
                        <select
                          value={band.ageUnit}
                          onChange={(e) => {
                            const updated = [...tempAgeRanges];
                            updated[bIdx].ageUnit = e.target.value as any;
                            setTempAgeRanges(updated);
                          }}
                          className="h-10 px-3 rounded-lg border border-border bg-background text-xs font-semibold shadow-xs"
                        >
                          <option value="days">Days</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="font-bold text-[11px] text-muted-foreground uppercase">Gender</label>
                      <select
                        value={band.gender}
                        onChange={(e) => {
                          const updated = [...tempAgeRanges];
                          updated[bIdx].gender = e.target.value as any;
                          setTempAgeRanges(updated);
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs font-medium shadow-xs"
                      >
                        <option value="BOTH">Both (M/F)</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>

                    {/* Range Min & Max */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="font-bold text-[11px] text-muted-foreground uppercase">Ref Range</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={band.refMin || ""}
                          onChange={(e) => {
                            const updated = [...tempAgeRanges];
                            updated[bIdx].refMin = e.target.value;
                            setTempAgeRanges(updated);
                          }}
                          placeholder="Min"
                          className="w-16 h-10 px-2 rounded-lg border border-border bg-background font-mono text-xs text-center shadow-xs"
                        />
                        <span className="font-bold text-muted-foreground">-</span>
                        <input
                          type="text"
                          value={band.refMax || ""}
                          onChange={(e) => {
                            const updated = [...tempAgeRanges];
                            updated[bIdx].refMax = e.target.value;
                            setTempAgeRanges(updated);
                          }}
                          placeholder="Max"
                          className="w-16 h-10 px-2 rounded-lg border border-border bg-background font-mono text-xs text-center shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => setTempAgeRanges(prev => prev.filter((_, i) => i !== bIdx))}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 px-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAgeRangeModalOpen(false)}
              className="rounded-lg px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAgeRanges}
              className="rounded-lg px-6 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Save Age Intervals
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          RICH TIPTAP CLINICAL INTERPRETATION MODAL
      ========================================================================= */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-card">
          <div className="p-4 px-6 border-b border-border/80 bg-card flex items-center justify-between shrink-0">
            <div>
              <DialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Clinical Interpretation: {name || "Main Test"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Diagnostic guidelines, biological reference intervals, and pathological interpretation printed on patient reports.
              </DialogDescription>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto bg-muted/10">
            <div className="space-y-2 h-full flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <label className="font-bold text-xs text-foreground block">
                  Diagnostic Significance &amp; Pathological Guidelines:
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Reference tables and clinical remarks will appear directly in patient reports
                </span>
              </div>
              <div className="bg-white dark:bg-zinc-950 rounded-xl border border-border overflow-hidden flex-1 shadow-sm">
                <TipTapEditor
                  value={interpretation}
                  onChange={(html) => setInterpretation(html)}
                  hideHeader={true}
                />
              </div>
            </div>
          </div>

          <div className="p-4 px-6 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-muted-foreground">
              Clinical interpretation is automatically appended to patient diagnostic reports when enabled.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAiGenerateInterpretation}
                disabled={generatingAiInterpretation}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-500/40 bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate comprehensive clinical interpretation with reference table using AI"
              >
                {generatingAiInterpretation ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                )}
                <span>{generatingAiInterpretation ? "Generating Interpretation..." : "AI Generate Interpretation"}</span>
              </button>
              <Button
                type="button"
                onClick={async () => {
                  setNotesModalOpen(false);
                  if (editingTest) {
                    try {
                      const testIdentifier = editingTest.id || editingTest.testCode;
                      await fetchFromLaravel(`/tests/${testIdentifier}`, {
                        method: "PUT",
                        body: JSON.stringify({
                          interpretation: interpretation,
                          field_type: (editingTest.fieldType === "Custom Editor" || (editingTest as any).field_type === "Custom Editor" || (editingTest.name || "").toLowerCase().includes("culture")) ? "Custom Editor" : undefined,
                        }),
                      });
                      toast.success("Interpretation & Layout saved to test master!");
                      await fetchTests(true);
                    } catch (e: any) {
                      console.error("Auto save interpretation error:", e);
                    }
                  }
                }}
                className="rounded-xl px-7 h-10 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
              >
                Done / Save Layout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md w-full p-6 rounded-xl">
          <DialogTitle className="font-display text-lg font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Confirm Test Deletion</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteTest}
              className="rounded-lg text-xs font-bold cursor-pointer"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          LIVE SAMPLE PATIENT REPORT PREVIEW MODAL
      ========================================================================= */}
      {sampleReportData && (
        <PrintPreviewDialog
          open={samplePreviewOpen}
          onOpenChange={setSamplePreviewOpen}
          report={sampleReportData}
          onLayoutSaved={() => fetchTests(true)}
        />
      )}
    </div>
  );
}
