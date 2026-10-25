"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClinicalResultDropdown } from "@/components/clinical-result-dropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getCleanLetterheadUrl, getStoredUser } from "@/lib/api-client";
import {
  FlaskConical, ArrowLeft, Loader2, CheckCircle2, AlertTriangle,
  User, AlertCircle, TrendingUp, History, ExternalLink, ClipboardList, Plus, Trash2,
  Search, ChevronDown, ChevronRight, ChevronLeft, FileText, Eye, Edit, Pencil, Building2, Phone, Calendar, Receipt, Printer,
  MessageSquare, FileEdit, Sparkles, CheckCheck, Calculator, Zap, X, Check, Save,
  Shield, Mail, MapPin, Stethoscope, BadgeCheck, CreditCard, Clock, Hash, Activity, Boxes,
  Cpu, Radio, RefreshCw, HardDrive, Sliders
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { FullscreenPrintReportModal } from "@/components/fullscreen-print-report-modal";
import { getClinicalInterpretation } from "@/lib/clinical-interpretations";
import { getReportPackage } from "@/lib/packages";
import { compareClinicalTests, compareClinicalParameters, getClinicalTestPriority } from "@/lib/clinical-order";
import { isGenuineCustomEditorTest, isStandardAnalyteTest, getDefaultUnitForTest, getDefaultRangeForTest, getCustomEditorInitialTemplate } from "@/lib/clinical-test-helper";

// Clinical Categorized Predefined Units
const CATEGORIZED_UNITS: Record<string, string[]> = {
  "Hematology": ["g/dL", "cells/cumm", "/cumm", "10^3/µL", "10^6/µL", "mill/µL", "fl", "pg", "%", "mm/hr", "Seconds", "Ratio", "INR"],
  "Biochemistry": ["mg/dL", "g/dL", "U/L", "IU/L", "mmol/L", "µmol/L", "mEq/L", "ng/mL", "µg/dL", "mg/24h", "mL/min", "g/24h"],
  "Immunology & Hormones": ["µIU/mL", "mIU/mL", "pmol/L", "nmol/L", "ng/dL", "pg/mL", "copies/mL", "Index", "S/CO", "AU/mL", "BAU/mL"],
  "Urine & Microscopy": ["/HPF", "/LPF", "Epithelial Cells/HPF", "Pus Cells/HPF", "RBCs/HPF", "Casts/LPF", "Crystals/HPF"],
  "General / Others": ["%", "Ratio", "Index", "Sec", "Min", "Hours", "mg/L", "µg/mL", "Negative/Positive"]
};

import {
  type Test,
  type ReportTest,
  type Report,
  type CalculationResult,
  type FindParamOptions,
  getTestPriority,
  hasReportParam,
  canParamBeCalculatedInReport,
  isParamFormulaCalculated,
  findParamInResults,
  computeAutomatedFormulas
} from "@/lib/clinical-formulas/formula-engine";

const TipTapEditor = dynamic(
  () => import("@/components/tiptap-editor").then((mod) => mod.TipTapEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-md" />,
  }
);


// Global memory cache so investigations load instantly on browse
let globalAvailableTestsCache: Test[] | null = null;

function ResultEntryContent() {
  const router = useRouter();
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";
  const reportId = typeof rawId === "string" ? decodeURIComponent(rawId).trim() : "";
  const toast = useToast();

  const [report, setReport] = useState<Report | null>(null);

  // Sibling report sequence for fast "Previous" and "Save & Next" navigation
  const cachedReports = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("lis_cached_reports");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [reportId]);

  const { prevReportId, nextReportId } = useMemo(() => {
    let prevId: string | null = null;
    let nextId: string | null = null;

    if (cachedReports.length > 0) {
      const idx = cachedReports.findIndex(
        (r: any) => r.id === reportId || r.custom_id === reportId || r.customId === reportId
      );
      if (idx > 0) {
        prevId = cachedReports[idx - 1]?.id || null;
      }
      if (idx >= 0 && idx < cachedReports.length - 1) {
        nextId = cachedReports[idx + 1]?.id || null;
      }
    }

    // Fallback to backend sibling pointers
    if (!prevId) {
      prevId = report?.prev_id || (report as any)?.prevId || null;
    }
    if (!nextId) {
      nextId = report?.next_id || (report as any)?.nextId || null;
    }

    return { prevReportId: prevId, nextReportId: nextId };
  }, [cachedReports, reportId, report]);
  // Ref to always have latest report in async/closure contexts without stale state
  const reportRef = React.useRef<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"APPROVE" | "FINAL" | "IN_PROGRESS" | "APPROVE_NEXT" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const valuesRef = React.useRef<Record<string, string>>({});
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  // Tracks IDs where the user has manually typed a value overriding the auto-formula
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set<string>());
  const [abnormalOverrides, setAbnormalOverrides] = useState<Record<string, boolean>>({});
  const [paramRemarks, setParamRemarks] = useState<Record<string, string>>({});
  const [showParamRemark, setShowParamRemark] = useState<Record<string, boolean>>({});
  const [testNotes, setTestNotes] = useState<Record<string, { notes?: string; remarks?: string; advices?: string }>>({});
  const [generatingAiField, setGeneratingAiField] = useState<Record<string, boolean>>({});
  const [savingMasterTemplate, setSavingMasterTemplate] = useState<Record<string, boolean>>({});
  const [syncMasterOnSave, setSyncMasterOnSave] = useState<Record<string, boolean>>({});

  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<Report[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printedInterpretations, setPrintedInterpretations] = useState<string[]>([]);
  const [availableTests, setAvailableTests] = useState<Test[]>(() => globalAvailableTestsCache || []);
  const [modifyingTest, setModifyingTest] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isPatientDetailsOpen, setIsPatientDetailsOpen] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Memoized set of all calculated parameter IDs
  const calculatedParamIds = useMemo(() => {
    return computeAutomatedFormulas(values, report).calculatedIds;
  }, [values, report]);

  // Resolved Package Name (from backend report, meta, or localStorage mapping)
  const activePackageName = useMemo(() => {
    if (!report) return null;
    return (
      report.packageName ||
      report.package_name ||
      (report as any).meta?.packageName ||
      (report as any).meta?.package_name ||
      getReportPackage(report.id) ||
      getReportPackage(report.customId) ||
      getReportPackage(report.patient?.customId) ||
      null
    );
  }, [report]);

  // Edit Reference Range Modal State
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [editingRangeTest, setEditingRangeTest] = useState<Test | null>(null);
  const [rangeMode, setRangeMode] = useState<"numeric" | "TEXT">("numeric");
  const [rangeGenderType, setRangeGenderType] = useState("BOTH");
  const [rangeText, setRangeText] = useState("");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [rangeMinMale, setRangeMinMale] = useState("");
  const [rangeMaxMale, setRangeMaxMale] = useState("");
  const [rangeMinFemale, setRangeMinFemale] = useState("");
  const [rangeMaxFemale, setRangeMaxFemale] = useState("");
  const [rangeUnit, setRangeUnit] = useState("");
  const [savingRange, setSavingRange] = useState(false);

  // Machine Integration / Auto-Communication state
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineResults, setMachineResults] = useState<any[]>([]);
  const [loadingMachineResults, setLoadingMachineResults] = useState(false);
  const [isSimulatingMachine, setIsSimulatingMachine] = useState(false);

  const fetchMachineResults = async () => {
    try {
      setLoadingMachineResults(true);
      const data = await fetchFromLaravel("/instruments/results?per_page=20", { skipCache: true });
      if (data) {
        setMachineResults(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (err: any) {
      console.error("Failed to load machine results:", err);
    } finally {
      setLoadingMachineResults(false);
    }
  };

  const simulateMachineRun = async (type: "HAEMATOLOGY" | "BIOCHEMISTRY") => {
    try {
      setIsSimulatingMachine(true);
      const sampleId = report?.customId || report?.patient?.customId || `SMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetchFromLaravel("/instruments/simulate", {
        method: "POST",
        body: JSON.stringify({ type, sample_id: sampleId }),
      });
      if (res && res.result) {
        setMachineResults((prev) => [res.result, ...prev]);
        toast.success(
          "Simulator Completed",
          `Simulated ${type === "HAEMATOLOGY" ? "Aveacon CBC" : "Beacon Biochem"} test run generated!`
        );
      }
    } catch (err: any) {
      toast.error("Simulation Failed", err.message);
    } finally {
      setIsSimulatingMachine(false);
    }
  };

  const applyMachineRunToReport = async (run: any) => {
    if (!run || !run.parsed_parameters) return;
    const params = run.parsed_parameters;
    let filledCount = 0;

    const matchMachineParamToTest = (paramKey: string, testName: string): boolean => {
      const param = paramKey.trim().toUpperCase();
      const name = (testName || "").toLowerCase().trim();

      // Negative Exclusions to prevent false matches
      if (param === "HGB") {
        if (name.includes("mean corpuscular") || name.includes("mch") || name.includes("mchc") || name.includes("hba1c") || name.includes("glycated")) {
          return false;
        }
        return name.includes("haemoglobin") || name.includes("hemoglobin") || /\b(hgb|hb)\b/.test(name);
      }

      if (param === "PLT") {
        if (name.includes("volume") || name.includes("mpv") || name.includes("distribution") || name.includes("pdw") || name.includes("pct")) {
          return false;
        }
        return name.includes("platelet") || /\b(plt)\b/.test(name);
      }

      if (param === "MPV") {
        return name.includes("mpv") || (name.includes("mean platelet") && name.includes("volume"));
      }

      if (param === "MCH") {
        if (name.includes("mchc") || name.includes("concentration")) return false;
        return name.includes("mch") || (name.includes("mean corpuscular") && name.includes("hemoglobin"));
      }

      if (param === "MCHC") {
        return name.includes("mchc") || name.includes("corpuscular hb concentration") || name.includes("hemoglobin concentration");
      }

      if (param === "MCV") {
        return name.includes("mcv") || name.includes("mean corpuscular volume");
      }

      if (param === "WBC") {
        return name.includes("wbc") || name.includes("leucocyte") || name.includes("leukocyte") || name.includes("tlc") || name.includes("white blood cell");
      }

      if (param === "RBC") {
        if (name.includes("wbc") || name.includes("distribution") || name.includes("rdw")) return false;
        return name.includes("rbc") || name.includes("red blood cell") || name.includes("erythrocyte");
      }

      if (param === "HCT") {
        return name.includes("hct") || name.includes("pcv") || name.includes("packed cell") || name.includes("hematocrit");
      }

      if (param === "NEU%") {
        if (name.includes("absolute") || name.includes("anc") || name.includes("ratio") || name.includes("nlr")) return false;
        return name.includes("neutrophil") || name.includes("granulocyte") || name.includes("polymorph");
      }

      if (param === "LYM%") {
        if (name.includes("absolute") || name.includes("alc") || name.includes("ratio") || name.includes("nlr")) return false;
        return name.includes("lymphocyte");
      }

      if (param === "MON%") {
        if (name.includes("absolute") || name.includes("amc")) return false;
        return name.includes("monocyte");
      }

      if (param === "EOS%") {
        if (name.includes("absolute") || name.includes("aec")) return false;
        return name.includes("eosinophil");
      }

      if (param === "BAS%") {
        if (name.includes("absolute") || name.includes("abc")) return false;
        return name.includes("basophil");
      }

      if (param === "NEU#" || param === "ANC") {
        return name.includes("absolute") && (name.includes("neutrophil") || name.includes("granulocyte") || name.includes("anc"));
      }

      if (param === "LYM#" || param === "ALC") {
        return name.includes("absolute") && (name.includes("lymphocyte") || name.includes("alc"));
      }

      if (param === "MON#" || param === "AMC") {
        return name.includes("absolute") && (name.includes("monocyte") || name.includes("amc"));
      }

      if (param === "RDW-CV") {
        return name.includes("rdw-cv") || (name.includes("rdw") && !name.includes("sd")) || name.includes("red cell distribution");
      }

      if (param === "RDW-SD") {
        return name.includes("rdw-sd");
      }

      if (param === "GLU" || param === "GLUC") {
        return name.includes("glucose") || name.includes("sugar") || name.includes("fbs") || name.includes("rbs") || name.includes("ppbs");
      }

      if (param === "SGPT" || param === "ALT") {
        return name.includes("sgpt") || name.includes("alt") || name.includes("alanine amino");
      }

      if (param === "SGOT" || param === "AST") {
        return name.includes("sgot") || name.includes("ast") || name.includes("aspartate amino");
      }

      if (param === "BILI_TOTAL" || param === "BILT" || param === "TBIL") {
        return (name.includes("bilirubin") && name.includes("total")) || (name.includes("total") && name.includes("bilirubin")) || name.includes("bilt");
      }

      if (param === "BILI_DIRECT" || param === "BILD" || param === "DBIL") {
        return (name.includes("bilirubin") && name.includes("direct")) || (name.includes("direct") && name.includes("bilirubin")) || name.includes("bild");
      }

      if (param === "UREA" || param === "BUN") {
        return name.includes("urea") && !name.includes("uric");
      }

      if (param === "CREAT" || param === "CREA") {
        return name.includes("creatinine") || name.includes("serum creat");
      }

      if (param === "URIC" || param === "UA") {
        return name.includes("uric acid") || name.includes("serum uric") || name.includes("urate");
      }

      if (param === "CHOL" || param === "TCHOL") {
        if (name.includes("hdl") || name.includes("ldl") || name.includes("vldl")) return false;
        return name.includes("cholesterol") || name.includes("total chol");
      }

      if (param === "ALP") {
        return name.includes("alkaline phosphatase") || name.includes("alp") || name.includes("alk phos");
      }

      if (param === "AMY") {
        return name.includes("amylase") || name.includes("serum amylase");
      }

      if (param === "CAL") {
        return name.includes("calcium") || name.includes("serum calcium");
      }

      if (param === "HDLDI" || param === "HDL" || param === "HDL-C") {
        return name.includes("hdl") || name.includes("high density");
      }

      if (param === "LDLDI" || param === "LDL" || param === "LDL-C") {
        return name.includes("ldl") || name.includes("low density");
      }

      if (param === "TRIG" || param === "TG") {
        return name.includes("triglyceride") || name.includes("trig");
      }

      if (param === "TP" || param === "PROT") {
        return (name.includes("total") && name.includes("protein")) || name.includes("serum protein");
      }

      if (param === "ALB") {
        return name.includes("albumin") || name.includes("serum albumin");
      }

      if (param === "GLOB") {
        return name.includes("globulin") || name.includes("serum globulin");
      }

      if (param === "PHOS") {
        return name.includes("phosphorus") || name.includes("phosphate");
      }

      if (param === "NA") {
        return name.includes("sodium") || name.includes("serum sodium");
      }

      if (param === "K") {
        return name.includes("potassium") || name.includes("serum potassium");
      }

      if (param === "CL") {
        return name.includes("chloride") || name.includes("serum chloride");
      }

      return name.includes(param.toLowerCase());
    };

    const findMatchingValue = (testName: string, testUnit?: string) => {
      for (const [key, paramData] of Object.entries(params)) {
        const val = typeof paramData === "object" && paramData !== null ? (paramData as any).value : String(paramData);
        if (matchMachineParamToTest(key, testName) && val !== undefined && val !== null && String(val).trim() !== "") {
          let cleanVal = String(val).trim();
          const keyUpper = key.trim().toUpperCase();
          const nameLower = (testName || "").toLowerCase();

          // Platelet Lakhs/cumm normalization:
          // If machine sends PLT e.g. 345 or 245, format as 3.45 (Lakhs/cumm)
          if ((keyUpper === "PLT" || nameLower.includes("platelet")) && !nameLower.includes("volume") && !nameLower.includes("pdw")) {
            const numPlt = parseFloat(cleanVal);
            if (!isNaN(numPlt) && numPlt > 20) {
              cleanVal = (numPlt / 100).toFixed(2);
            }
          }

          // Total Leucocyte Count (WBC / TLC) normalization for Indian pathology standards:
          // If machine sends WBC as e.g. 4.6 or 8.6, format as 4600 or 8600 (/cumm)
          if (keyUpper === "WBC" || nameLower.includes("tlc") || (nameLower.includes("white blood") && !nameLower.includes("percent"))) {
            const numWbc = parseFloat(cleanVal);
            if (!isNaN(numWbc) && numWbc > 0 && numWbc < 100) {
              cleanVal = String(Math.round(numWbc * 1000));
            }
          }

          return cleanVal;
        }
      }
      return null;
    };

    const newValues: Record<string, string> = { ...values };
    const newAbnormals: Record<string, boolean> = { ...abnormalOverrides };
    const machineFilledIds = new Set<string>();

    const collectAllTests = (items: any[]): any[] => {
      let list: any[] = [];
      for (const item of items) {
        list.push(item);
        if (item.subTests && Array.isArray(item.subTests)) {
          list = list.concat(collectAllTests(item.subTests));
        }
      }
      return list;
    };

    const allItems = collectAllTests(report?.results || []);

    for (const item of allItems) {
      const test = item.test || item;
      if (!test || !test.name) continue;

      const matchedVal = findMatchingValue(test.name, test.unit);
      if (matchedVal !== null) {
        newValues[item.id] = matchedVal;
        machineFilledIds.add(item.id);
        filledCount++;

        const abCheck = isValueAbnormal(test, matchedVal);
        newAbnormals[item.id] = abCheck.abnormal;
      }
    }

    // Differential Leukocyte Count (DLC) 5-Part Auto-Balancing & Population:
    // When machine is a 3-part cell counter (Neutrophils, Lymphocytes, Mid cells),
    // intelligently populate Eosinophils, Monocytes, and Basophils to total strictly 100.0%
    let neuItem: any = null;
    let lymItem: any = null;
    let eosItem: any = null;
    let monItem: any = null;
    let basItem: any = null;

    for (const item of allItems) {
      const test = item.test || item;
      if (!test || !test.name) continue;
      const tName = (test.name || "").toLowerCase();
      if (tName.includes("absolute") || tName.includes("anc") || tName.includes("alc") || tName.includes("aec") || tName.includes("amc") || tName.includes("abc")) continue;

      if ((tName.includes("neutrophil") || tName.includes("granulocyte") || tName.includes("polymorph")) && !neuItem) neuItem = item;
      else if (tName.includes("lymphocyte") && !lymItem) lymItem = item;
      else if (tName.includes("eosinophil") && !eosItem) eosItem = item;
      else if (tName.includes("monocyte") && !monItem) monItem = item;
      else if (tName.includes("basophil") && !basItem) basItem = item;
    }

    const neuVal = neuItem ? parseFloat(newValues[neuItem.id] || "0") : 0;
    const lymVal = lymItem ? parseFloat(newValues[lymItem.id] || "0") : 0;

    if (neuVal > 0 && lymVal > 0) {
      const nlSum = neuVal + lymVal;
      const remainder = Math.max(0, Math.round((100 - nlSum) * 10) / 10);

      // Check if machine explicitly supplied separate EOS and BAS
      const hasMachineEos = !!params["EOS%"] && parseFloat(String((params["EOS%"] as any)?.value || params["EOS%"])) > 0;
      const hasMachineBas = !!params["BAS%"] && parseFloat(String((params["BAS%"] as any)?.value || params["BAS%"])) >= 0;

      let eosVal = hasMachineEos ? parseFloat(String((params["EOS%"] as any)?.value || params["EOS%"])) : 0;
      let basVal = hasMachineBas ? parseFloat(String((params["BAS%"] as any)?.value || params["BAS%"])) : 0;

      if (!hasMachineEos && eosItem) {
        if (remainder >= 6) {
          eosVal = 2.0;
        } else if (remainder >= 3) {
          eosVal = 1.5;
        } else if (remainder > 1) {
          eosVal = 1.0;
        } else {
          eosVal = Math.round((remainder / 3) * 10) / 10;
        }
        newValues[eosItem.id] = eosVal.toFixed(1);
        machineFilledIds.add(eosItem.id);
        filledCount++;
      }

      if (!hasMachineBas && basItem) {
        basVal = remainder >= 10 ? 1.0 : 0.0;
        newValues[basItem.id] = basVal.toFixed(1);
        machineFilledIds.add(basItem.id);
        filledCount++;
      }

      if (monItem) {
        const monVal = Math.max(0, Math.round((remainder - eosVal - basVal) * 10) / 10);
        newValues[monItem.id] = monVal.toFixed(1);
        machineFilledIds.add(monItem.id);
        filledCount++;
      }
    }

    // Safety balance pass across all DLC items so sum strictly equals 100.0%
    const dlcItems: { id: string; name: string; val: number }[] = [];
    for (const item of allItems) {
      const test = item.test || item;
      if (!test || !test.name) continue;
      const tName = (test.name || "").toLowerCase();
      if (
        (tName.includes("neutrophil") || tName.includes("polymorph") || tName.includes("lymphocyte") ||
          tName.includes("eosinophil") || tName.includes("monocyte") || tName.includes("basophil")) &&
        !tName.includes("absolute") && !tName.includes("anc") && !tName.includes("alc") &&
        (test.unit === "%" || !test.unit || test.unit === "")
      ) {
        if (newValues[item.id] !== undefined && newValues[item.id] !== "") {
          const num = parseFloat(newValues[item.id]);
          if (!isNaN(num) && num >= 0) {
            dlcItems.push({ id: item.id, name: tName, val: num });
          }
        }
      }
    }

    if (dlcItems.length >= 2) {
      const currentSum = dlcItems.reduce((acc, it) => acc + it.val, 0);
      if (Math.abs(currentSum - 100) > 0.05 && currentSum > 0) {
        let runningTotal = 0;
        dlcItems.forEach((it, idx) => {
          if (idx < dlcItems.length - 1) {
            const balancedVal = Math.round((it.val / currentSum) * 100 * 10) / 10;
            newValues[it.id] = balancedVal.toFixed(1);
            runningTotal += balancedVal;
          } else {
            const remainder = Math.round((100 - runningTotal) * 10) / 10;
            newValues[it.id] = Math.max(0, remainder).toFixed(1);
          }
        });
      }
    }

    // Trigger automated formulas from machine run data (MCV, MCH, MCHC, NLR, Absolute counts, etc.)
    const autoCalc = computeAutomatedFormulas(newValues, report, manualOverrides);
    for (const [calcId, calcVal] of Object.entries(autoCalc.calculatedValues)) {
      // If this field was already filled directly with the machine's genuine measured value,
      // preserve the machine's measured value! Only calculate for unsupplied fields (such as ANC, ALC, AEC, AMC, ABC, NLR)!
      if (!machineFilledIds.has(calcId)) {
        newValues[calcId] = calcVal;
      }
    }

    // Check abnormality for all items including auto-calculated parameters
    for (const item of allItems) {
      const test = item.test || item;
      if (!test || !test.name) continue;
      if (newValues[item.id] !== undefined && newAbnormals[item.id] === undefined) {
        const abCheck = isValueAbnormal(test, newValues[item.id]);
        newAbnormals[item.id] = abCheck.abnormal;
      }
    }

    setValues(newValues);
    setAbnormalOverrides(newAbnormals);
    setIsMachineModalOpen(false);

    toast.success(
      "Machine Results Auto-Filled",
      `${filledCount} parameter values successfully populated from ${run.instrument_name || "Analyzer"}!`
    );

    try {
      await fetchFromLaravel(`/instruments/results/${run.id}/apply`, {
        method: "POST",
        body: JSON.stringify({ report_id: report?.id }),
      });
    } catch (_) { }
  };

  const [loadingAvailableTests, setLoadingAvailableTests] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user && ["RECEPTIONIST", "COLLECTION_CENTER", "B2B"].includes(user.role)) {
      toast.error("Access Denied", "Clinical result entry and approval are restricted to central lab administration.");
      router.push("/dashboard/reports");
      return;
    }
    if (reportId) {
      setReport(null);
      reportRef.current = null;
      setValues({});
      valuesRef.current = {};
      setManualOverrides(new Set());
      setAbnormalOverrides({});
      setParamRemarks({});
      setShowParamRemark({});
      setTestNotes({});
      setError(null);
      setSuccess(null);
      fetchReport();
    }
    // Prefetch investigations catalog immediately in the background
    fetchAvailableTests();
  }, [reportId]);

  const fetchAvailableTests = async (force = false) => {
    if ((availableTests.length > 0 && !force) || loadingAvailableTests) return;
    try {
      setLoadingAvailableTests(true);
      const data = await fetchFromLaravel("/tests?compact=1", { skipCache: force });
      const list = Array.isArray(data) ? data : (data?.data || []);
      const filtered = list.filter((t: any) => t.fieldType === "Group" || (!t.parent && !t.parentId && !t.parent_id));
      globalAvailableTestsCache = filtered;
      setAvailableTests(filtered);
    } catch { } finally {
      setLoadingAvailableTests(false);
    }
  };

  const handleOpenAddTestModal = () => {
    if (availableTests.length === 0) {
      fetchAvailableTests();
    }
    setIsTestModalOpen(true);
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data: any = await fetchFromLaravel(`/reports/${reportId}`, { skipCache: true });
      const reportData: Report = {
        ...data,
        lab: data.lab ? {
          ...data.lab,
          printBgImage: getCleanLetterheadUrl(data.lab.printBgImage || data.lab.print_bg_image),
        } : data.lab,
      };
      reportRef.current = reportData;
      setReport(reportData);
      const initialVals: Record<string, string> = {};
      const initialAbnormal: Record<string, boolean> = {};
      const initialRemarks: Record<string, string> = {};
      const initialShowRemarks: Record<string, boolean> = {};

      const resultsList = Array.isArray(data?.results) ? data.results : [];
      resultsList.forEach((r: any) => {
        const fieldType = r.test?.fieldType || r.test?.field_type;
        let rawVal = (r.resultValue ?? r.result_value ?? "").trim();
        const isCustom = isGenuineCustomEditorTest(r.test);

        // Clean any accidental HTML tags leaking into non-custom standard parameters
        if (!isCustom && (rawVal.startsWith("<") || rawVal.includes("<div") || rawVal.includes("<table") || rawVal.includes("clinical-interpretation"))) {
          rawVal = "";
        }

        const isBlank = !rawVal || rawVal === "<p></p>" || rawVal === "<p><br></p>" || rawVal === "<p><br/></p>";
        const isPlainStatusVal = !rawVal.includes("<") && /^(normal(\s*[\/\-]\s*negative)?|negative|positive)$/i.test(rawVal.trim());
        let template = isCustom ? (r.test?.customLayout || (r.test as any)?.custom_layout || (r.test as any)?.custom_template || getCustomEditorInitialTemplate(r.test) || "") : "";
        if (isCustom && (!template || template === "<p></p>")) {
          const tNameLower = (r.test?.name || "").toLowerCase();
          const tCatLower = (r.test?.category || "").toLowerCase();
          if (tNameLower.includes("widal")) {
            template = `<table style="width:100%; border-collapse:collapse; margin-top:8px; margin-bottom:8px;"><thead><tr style="background-color:#f4f4f5; text-align:left;"><th style="border:1px solid #d4d4d8; padding:6px 10px; width:28%;">Antigen</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/20</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/40</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/80</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/160</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/320</th></tr></thead><tbody><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. TYPHI "O"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. TYPHI "H"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. PARATYPHI "AH"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. PARATYPHI "BH"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr></tbody></table><p>Result: <strong>Negative</strong></p>`;
          } else if (tNameLower.includes("biopsy") || tCatLower.includes("histopath")) {
            template = `<p><strong>SPECIMEN:</strong> Tissue Biopsy in 10% Neutral Buffered Formalin</p><p><strong>CLINICAL HISTORY / DIAGNOSIS:</strong> &lt;Clinical indication &amp; anatomical biopsy site&gt;</p><p><strong>GROSS EXAMINATION:</strong><br>Received single formalin-fixed tissue specimen measuring &lt;dimensions&gt; cm. Greyish-white to tan in appearance, firm in consistency. Representative sections submitted in Block A.</p><p><strong>MICROSCOPIC EXAMINATION:</strong><br>Sections studied show tissue fragment lined by epithelium. The underlying fibrovascular stroma shows mild to moderate chronic inflammatory infiltrate predominantly composed of lymphocytes and plasma cells. There is no evidence of nuclear atypia, dysplasia, granulomatous inflammation, or malignancy in the sections examined.</p><p><strong>IMPRESSION / DIAGNOSIS:</strong><br><strong>BIOPSY EXAMINATION CONSISTENT WITH: &lt;BENIGN / CHRONIC NON-SPECIFIC INFLAMMATION / SPECIFY DIAGNOSIS&gt;</strong></p><p style="font-size:10px; color:#71717a; margin-top:8px;"><em>Note: Histopathological impression must be clinically correlated with patient's radiological, clinical, and operative findings.</em></p>`;
          }
        }
        const isFreshReport = !data?.status || data.status === "NEW";
        const isCultureTest = (r.test?.name || "").toLowerCase().includes("culture");
        const isUnfilledCultureTable = isCultureTest && rawVal.includes("<table") && !rawVal.includes("Sensitive") && !rawVal.includes("Resistant") && !rawVal.includes("Moderate") && !rawVal.includes("Intermediate");
        if (isCustom && template && (isBlank || isPlainStatusVal || (isFreshReport && isUnfilledCultureTable))) {
          initialVals[r.id] = template;
        } else {
          initialVals[r.id] = rawVal;
        }
        initialAbnormal[r.id] = !!(r.isAbnormal || r.is_abnormal);
        if (r.remarks) {
          initialRemarks[r.id] = r.remarks;
          initialShowRemarks[r.id] = true;
        }
      });

      // Run automatic calculations on initial load
      const { calculatedValues } = computeAutomatedFormulas(initialVals, reportData);
      const autoComputedInit = { ...initialVals, ...calculatedValues };

      // Preserve currently filled in-memory results across updates
      // IMPORTANT: Don't let prev empty-string values overwrite fresh auto-calculated values
      setValues((prev) => {
        const merged: Record<string, string> = {};
        // Start with prev non-empty values (user's existing work)
        Object.entries(prev).forEach(([k, v]) => {
          if (v !== undefined && v !== "" && v !== "<p></p>" && v !== "<p><br></p>") {
            merged[k] = v;
          }
        });
        // Then overlay fresh auto-computed (DB values + formulas) — auto-calc wins for fields not yet touched
        Object.entries(autoComputedInit).forEach(([k, v]) => {
          if (!(k in merged) || merged[k] === "") {
            merged[k] = v;
          }
        });
        return merged;
      });

      setAbnormalOverrides((prev) => ({
        ...initialAbnormal,
        ...prev,
      }));

      setParamRemarks((prev) => ({
        ...initialRemarks,
        ...prev,
      }));

      setShowParamRemark((prev) => ({
        ...initialShowRemarks,
        ...prev,
      }));

      if (data.testNotes || data.test_notes) {
        try {
          const raw = data.testNotes || data.test_notes;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && typeof parsed === 'object') {
            setTestNotes((prev) => ({ ...parsed, ...prev }));
          }
        } catch (e) { }
      }

      const pId = data.patientId || data.patient_id;
      if (pId) fetchHistory(pId);

      // Initialize printed interpretations (Default to all tests that have interpretations if not explicitly unticked)
      const testsWithInterp = resultsList
        .map((r: any) => {
          const t = r.test;
          if (!t) return null;
          const mt = t.parent?.parent ? t.parent.parent : (t.parent ? t.parent : t);
          const rawInterp = mt?.interpretation || t.interpretation || (t.parent ? t.parent.interpretation : null);
          const interp = getClinicalInterpretation(mt?.name || t.name, rawInterp, t.category);
          const hasInterp = !!interp && interp.trim() !== '' && interp !== '<p><br></p>';
          return hasInterp ? mt.id : null;
        })
        .filter(Boolean) as string[];
      const defaultInterpIds = Array.from(new Set(testsWithInterp));

      if (data.printedInterpretations !== undefined && data.printedInterpretations !== null) {
        try {
          const raw = data.printedInterpretations;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setPrintedInterpretations(Array.isArray(parsed) ? parsed : defaultInterpIds);
        } catch (e) {
          setPrintedInterpretations(defaultInterpIds);
        }
      } else if (data.printed_interpretations !== undefined && data.printed_interpretations !== null) {
        try {
          const raw = data.printed_interpretations;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setPrintedInterpretations(Array.isArray(parsed) ? parsed : defaultInterpIds);
        } catch (e) {
          setPrintedInterpretations(defaultInterpIds);
        }
      } else {
        // By default, ALL tests with interpretation are checked/ticked!
        setPrintedInterpretations(defaultInterpIds);
      }
    } catch (err: any) {
      console.error("fetchReport error:", err);
      setError("Failed to retrieve report data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (patientId: string) => {
    try {
      setLoadingHistory(true);
      const data = await fetchFromLaravel(`/reports?patient_id=${encodeURIComponent(patientId)}`);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setHistory(list.filter((r: any) => (r.patientId === patientId || r.patient_id === patientId) && r.id !== reportId));
    } catch (err) {
      console.error("Error fetching patient history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleValueChange = (id: string, val: string) => {
    // Always use the ref for the latest report — avoids stale closure in setValues
    const currentReport = reportRef.current;
    // If the user is editing a field that is normally auto-calculated, mark it as manually overridden
    const { calculatedIds } = computeAutomatedFormulas(values, currentReport);
    let newOverrides = manualOverrides;
    if (calculatedIds.has(id)) {
      newOverrides = new Set(manualOverrides);
      if (val.trim() === "") {
        // Cleared — remove override so formula takes over again
        newOverrides.delete(id);
      } else {
        newOverrides.add(id);
      }
      setManualOverrides(newOverrides);
    }
    setValues((prev) => {
      const updated = { ...prev, [id]: val };
      const { calculatedValues } = computeAutomatedFormulas(updated, currentReport, newOverrides);
      return { ...updated, ...calculatedValues };
    });
  };

  const toggleParamRemark = (id: string) => {
    setShowParamRemark((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleParamRemarkChange = (id: string, val: string) => {
    setParamRemarks((prev) => ({ ...prev, [id]: val }));
  };

  const handleRemoveParamRemark = (id: string) => {
    setParamRemarks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setShowParamRemark((prev) => ({ ...prev, [id]: false }));
  };

  const toggleTestMeta = (testId: string, field: "notes" | "remarks" | "advices") => {
    setTestNotes((prev) => {
      const current = prev[testId] || {};
      if (current[field] !== undefined) {
        const next = { ...current };
        delete next[field];
        return { ...prev, [testId]: next };
      } else {
        return { ...prev, [testId]: { ...current, [field]: "" } };
      }
    });
  };

  const handleTestMetaChange = (testId: string, field: "notes" | "remarks" | "advices", val: string) => {
    setTestNotes((prev) => ({
      ...prev,
      [testId]: {
        ...(prev[testId] || {}),
        [field]: val,
      },
    }));
  };

  const removeTestMeta = (testId: string, field: "notes" | "remarks" | "advices") => {
    setTestNotes((prev) => {
      const current = { ...(prev[testId] || {}) };
      delete current[field];
      return { ...prev, [testId]: current };
    });
  };

  const handleAutoBalanceDlc = (sectionItems: any[]) => {
    const dlcItems: { id: string; name: string; val: number }[] = [];
    (sectionItems || []).forEach((item) => {
      const t = item.test || item;
      const tName = (t?.name || "").toLowerCase();
      if (
        (tName.includes("neutrophil") || tName.includes("polymorph") || tName.includes("lymphocyte") ||
          tName.includes("eosinophil") || tName.includes("monocyte") || tName.includes("basophil")) &&
        !tName.includes("absolute") && (t?.unit === "%" || !t?.unit || t?.unit === "")
      ) {
        const raw = (values[item.id] ?? "").toString().trim();
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) {
          dlcItems.push({ id: item.id, name: tName, val: num });
        }
      }
    });

    if (dlcItems.length < 2) {
      toast.error("Notice", "Need at least 2 DLC parameters entered to balance to 100%.");
      return;
    }

    const currentSum = dlcItems.reduce((acc, it) => acc + it.val, 0);
    if (currentSum <= 0) return;

    const newVals: Record<string, string> = { ...values };
    let runningTotal = 0;
    dlcItems.forEach((it, idx) => {
      if (idx < dlcItems.length - 1) {
        const balanced = Math.round((it.val / currentSum) * 100 * 10) / 10;
        newVals[it.id] = balanced.toFixed(1);
        runningTotal += balanced;
      } else {
        const remainder = Math.round((100 - runningTotal) * 10) / 10;
        newVals[it.id] = Math.max(0, remainder).toFixed(1);
      }
    });

    const currentReport = reportRef.current;
    const { calculatedValues } = computeAutomatedFormulas(newVals, currentReport, manualOverrides);
    const finalVals = { ...newVals, ...calculatedValues };
    valuesRef.current = finalVals;
    setValues(finalVals);
    toast.success("DLC Balanced", "Differential counts successfully balanced to exactly 100.0%.");
  };

  const handleGenerateAiSuggestion = async (
    mainTestId: string,
    fieldType: "remarks" | "advices" | "notes",
    group: any
  ) => {
    const fieldKey = `${mainTestId}_${fieldType}`;
    setGeneratingAiField((prev) => ({ ...prev, [fieldKey]: true }));

    try {
      // Gather test parameters from this group with their entered values
      const paramsList: Array<{
        name: string;
        value: string;
        unit: string;
        is_abnormal: boolean;
        ref_range: string;
      }> = [];

      (group.sections || []).forEach((sec: any) => {
        (sec.items || []).forEach((item: any) => {
          const val = values[item.id] || "";
          if (val && val.trim() !== "") {
            const { abnormal } = isValueAbnormal(item.test, val);
            const range = getRefRange(
              item.test,
              report?.patient?.gender || "Male",
              report?.patient?.age || 30
            );
            const rangeStr = formatRefRangeText(range);

            paramsList.push({
              name: item.test.name,
              value: val.trim(),
              unit: item.test.unit || "",
              is_abnormal: abnormal || !!abnormalOverrides[item.id],
              ref_range: rangeStr !== "—" ? rangeStr : "",
            });
          }
        });
      });

      const res = await fetchFromLaravel("/ai/suggest", {
        method: "POST",
        body: JSON.stringify({
          type: fieldType,
          test_name: group.mainTestName,
          parameters: paramsList,
          patient: {
            age: report?.patient?.age,
            gender: report?.patient?.gender,
            name: report?.patient?.name,
          },
        }),
      });

      if (res && res.suggestion) {
        setTestNotes((prev) => ({
          ...prev,
          [mainTestId]: {
            ...(prev[mainTestId] || {}),
            [fieldType]: res.suggestion,
          },
        }));

        const providerLabel =
          res.provider === "gemini"
            ? "Google Gemini"
            : res.provider === "groq"
              ? "Groq AI"
              : "Clinical Engine";

        toast.success(
          `AI ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Ready`,
          `Generated via ${providerLabel} based on patient test findings.`
        );
      } else {
        toast.error("Generation Failed", "Could not generate suggestion.");
      }
    } catch (err: any) {
      toast.error("AI Error", err.message || "Failed to generate AI suggestion.");
    } finally {
      setGeneratingAiField((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const getRefRange = (test: Test, patientGender: string, patientAge: number) => {
    const genderType = (test.genderRefType || test.gender_ref_type || "").toUpperCase();
    const gender = (patientGender || "Male").toLowerCase();

    const parseNum = (val: any): number | null => {
      if (val === null || val === undefined || val === "") return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const minDefault = parseNum(test.ref_range_min ?? test.refRangeMin);
    const maxDefault = parseNum(test.ref_range_max ?? test.refRangeMax);

    const minMale = parseNum(test.ref_range_min_male ?? test.refRangeMinMale) ?? minDefault;
    const maxMale = parseNum(test.ref_range_max_male ?? test.refRangeMaxMale) ?? maxDefault;

    const minFemale = parseNum(test.ref_range_min_female ?? test.refRangeMinFemale) ?? minDefault;
    const maxFemale = parseNum(test.ref_range_max_female ?? test.refRangeMaxFemale) ?? maxDefault;

    const minChild = parseNum(test.ref_range_min_child ?? test.refRangeMinChild) ?? minDefault;
    const maxChild = parseNum(test.ref_range_max_child ?? test.refRangeMaxChild) ?? maxDefault;

    const minNewborn = parseNum(test.ref_range_min_newborn ?? test.refRangeMinNewborn) ?? minDefault;
    const maxNewborn = parseNum(test.ref_range_max_newborn ?? test.refRangeMaxNewborn) ?? maxDefault;

    if (genderType === "NEWBORN" || (patientAge !== undefined && patientAge < 1)) {
      if (minNewborn !== null || maxNewborn !== null) return { min: minNewborn, max: maxNewborn };
    }

    if (genderType === "CHILDREN" || (patientAge !== undefined && patientAge < 12)) {
      if (minChild !== null || maxChild !== null) return { min: minChild, max: maxChild };
    }

    if (genderType === "GENDER_SPECIFIC" || genderType === "BY_GENDER" || genderType === "GENDER") {
      if (gender === "female") {
        return { min: minFemale, max: maxFemale };
      } else {
        return { min: minMale, max: maxMale };
      }
    }

    if (gender === "female" && (minFemale !== null || maxFemale !== null)) {
      return { min: minFemale, max: maxFemale };
    }

    if (minMale !== null || maxMale !== null) {
      return { min: minMale, max: maxMale };
    }

    return { min: minDefault, max: maxDefault };
  };

  const formatRefRangeText = (range: { min: number | null; max: number | null }) => {
    if (range.min !== null && range.max !== null) {
      return `${range.min} – ${range.max}`;
    }
    if (range.min !== null && range.max === null) {
      return `> ${range.min}`;
    }
    if (range.min === null && range.max !== null) {
      return `< ${range.max}`;
    }
    return "—";
  };

  const isValueAbnormal = (test: Test, currentVal: string) => {
    const vType = test.valueType || test.value_type;
    if (vType === "Custom") return { abnormal: false, flag: "NORMAL" };
    if (!currentVal || currentVal.trim() === "") return { abnormal: false, flag: "NORMAL" };
    const num = parseFloat(currentVal);
    if (isNaN(num)) return { abnormal: false, flag: "NORMAL" };
    const range = getRefRange(test, report?.patient.gender || "Male", report?.patient.age || 30);
    if (range.min !== null && num < range.min) return { abnormal: true, flag: "LOW" };
    if (range.max !== null && num > range.max) return { abnormal: true, flag: "HIGH" };
    return { abnormal: false, flag: "NORMAL" };
  };

  const toggleInterpretation = (testId: string) => {
    setPrintedInterpretations(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  const handleAddSelectedTests = async () => {
    if (selectedTests.length === 0) return;
    setModifyingTest(true);
    let successCount = 0;

    for (const testId of selectedTests) {
      try {
        await fetchFromLaravel(`/reports/${reportId}/tests`, {
          method: "POST",
          body: JSON.stringify({ test_id: testId, testId })
        });
        successCount++;
      } catch (err) {
        console.error("Failed to add test:", err);
      }
    }

    if (successCount > 0) {
      toast.success("Success", `${successCount} test(s) added successfully.`);
      await fetchReport();
    } else {
      toast.error("Failed", "Failed to add test to report.");
    }
    setIsTestModalOpen(false);
    setSelectedTests([]);
    setModifyingTest(false);
  };

  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const handleToggleTest = (testId: string) => {
    setSelectedTests((prev) => prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]);
  };

  const normalizeCat = (cat?: string) => {
    if (!cat) return "General Pathology";
    const trimmed = cat.trim();
    if (/^haematology$/i.test(trimmed) || /^hematology$/i.test(trimmed)) return "Hematology";
    return trimmed;
  };

  const groupedTests: Record<string, Test[]> = {};
  availableTests.forEach((test) => {
    const isInReport = report?.results.some(r => {
      const mt = r.test.parent?.parent ? r.test.parent.parent : (r.test.parent ? r.test.parent : r.test);
      return mt.id === test.id;
    });
    if (!isInReport) {
      const cat = normalizeCat(test.category);
      (groupedTests[cat] ||= []).push(test);
    }
  });

  const categories = Object.keys(groupedTests);

  const getFilteredGroupedTests = () => {
    const term = testSearch.toLowerCase().trim();
    const filtered: Record<string, Test[]> = {};
    Object.entries(groupedTests).forEach(([category, tests]) => {
      if (activeCategory !== "ALL" && normalizeCat(category) !== normalizeCat(activeCategory)) return;
      const matches = term
        ? tests.filter((t) => t.name.toLowerCase().includes(term) || (t.category || "").toLowerCase().includes(term))
        : tests;
      if (matches.length > 0) filtered[category] = matches;
    });
    return filtered;
  };
  const filteredGroups = getFilteredGroupedTests();

  const handleRemoveTest = async (mainTestId: string) => {
    if (!confirm("Are you sure you want to remove this test from the report?")) return;
    setModifyingTest(true);
    try {
      await fetchFromLaravel(`/reports/${reportId}/tests?mainTestId=${mainTestId}&main_test_id=${mainTestId}`, {
        method: "DELETE"
      });
      toast.success("Success", "Test removed successfully.");
      await fetchReport();
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to remove test");
    } finally {
      setModifyingTest(false);
    }
  };

  // Open Edit Reference Range Dialog
  const handleOpenEditRange = (test: Test) => {
    setEditingRangeTest(test);
    const isText = (test.rangeType || test.range_type) === "TEXT" || !!(test.textRefRange || test.text_ref_range);
    setRangeMode(isText ? "TEXT" : "numeric");
    setRangeText(test.text_ref_range || test.textRefRange || "");
    const gType = (test.gender_ref_type || test.genderRefType || "BOTH").toUpperCase();
    setRangeGenderType(gType === "GENDER_SPECIFIC" || gType === "BY_GENDER" ? "BY_GENDER" : gType);
    setRangeMin(test.ref_range_min?.toString() ?? test.refRangeMin?.toString() ?? "");
    setRangeMax(test.ref_range_max?.toString() ?? test.refRangeMax?.toString() ?? "");
    setRangeMinMale(test.ref_range_min_male?.toString() ?? test.refRangeMinMale?.toString() ?? "");
    setRangeMaxMale(test.ref_range_max_male?.toString() ?? test.refRangeMaxMale?.toString() ?? "");
    setRangeMinFemale(test.ref_range_min_female?.toString() ?? test.refRangeMinFemale?.toString() ?? "");
    setRangeMaxFemale(test.ref_range_max_female?.toString() ?? test.refRangeMaxFemale?.toString() ?? "");
    setRangeUnit(test.unit || "");
    setIsRangeModalOpen(true);
  };

  // Save Reference Range permanently to DB
  const handleSaveRange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRangeTest) return;
    setSavingRange(true);
    try {
      const payload: any = {
        unit: rangeUnit,
        range_type: rangeMode === "TEXT" ? "TEXT" : "numeric",
        rangeType: rangeMode === "TEXT" ? "TEXT" : "numeric",
      };

      if (rangeMode === "TEXT") {
        payload.text_ref_range = rangeText;
        payload.textRefRange = rangeText;
        payload.gender_ref_type = "BOTH";
        payload.genderRefType = "BOTH";
        payload.ref_range_min = null;
        payload.ref_range_max = null;
        payload.ref_range_min_male = null;
        payload.ref_range_max_male = null;
        payload.ref_range_min_female = null;
        payload.ref_range_max_female = null;
      } else {
        payload.text_ref_range = null;
        payload.textRefRange = null;
        payload.gender_ref_type = rangeGenderType;
        payload.genderRefType = rangeGenderType;

        if (rangeGenderType === "BY_GENDER" || rangeGenderType === "GENDER_SPECIFIC") {
          payload.ref_range_min_male = rangeMinMale !== "" ? parseFloat(rangeMinMale) : null;
          payload.ref_range_max_male = rangeMaxMale !== "" ? parseFloat(rangeMaxMale) : null;
          payload.ref_range_min_female = rangeMinFemale !== "" ? parseFloat(rangeMinFemale) : null;
          payload.ref_range_max_female = rangeMaxFemale !== "" ? parseFloat(rangeMaxFemale) : null;
          payload.ref_range_min = null;
          payload.ref_range_max = null;
        } else {
          payload.ref_range_min = rangeMin !== "" ? parseFloat(rangeMin) : null;
          payload.ref_range_max = rangeMax !== "" ? parseFloat(rangeMax) : null;
          payload.ref_range_min_male = null;
          payload.ref_range_max_male = null;
          payload.ref_range_min_female = null;
          payload.ref_range_max_female = null;
        }
      }

      await fetchFromLaravel(`/tests/${editingRangeTest.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      toast.success("Success", "Reference range updated permanently.");

      // Update in-memory report results so UI updates immediately
      setReport((prev) => {
        if (!prev) return prev;
        const newResults = prev.results.map((r) => {
          if (r.test.id === editingRangeTest.id) {
            return {
              ...r,
              test: {
                ...r.test,
                ...payload,
              },
            };
          }
          return r;
        });
        const updated = { ...prev, results: newResults };
        reportRef.current = updated; // keep ref in sync
        return updated;
      });

      setIsRangeModalOpen(false);
    } catch (err: any) {
      toast.error("Save Failed", err.message || "Failed to update reference range.");
    } finally {
      setSavingRange(false);
    }
  };

  // Save customized report layout / antibiotic table permanently to Test Master as default template
  const handleSaveAsDefaultTemplate = async (item: any) => {
    if (!isGenuineCustomEditorTest(item.test)) {
      toast.error("Not a Template Test", "Default templates are only applicable for Culture and Custom narrative layout tests.");
      return;
    }
    const currentVal = values[item.id] || "";
    if (!currentVal || currentVal === "<p></p>" || currentVal === "<p><br></p>") {
      toast.error("Template is empty", "Please add some content or arrange your table before saving as default template.");
      return;
    }

    const testId = item.test?.id;
    if (!testId) {
      toast.error("Error", "Could not identify test ID to update default template.");
      return;
    }

    setSavingMasterTemplate((prev) => ({ ...prev, [item.id]: true }));

    try {
      await fetchFromLaravel(`/tests/${testId}/report-layout`, {
        method: "POST",
        body: JSON.stringify({
          custom_layout: currentVal,
          field_type: "Custom Editor",
        }),
      });

      // Also update in-memory report test definition so UI reflects it immediately
      setReport((prev) => {
        if (!prev) return prev;
        const newResults = prev.results.map((r) => {
          if (r.id === item.id) {
            return {
              ...r,
              test: {
                ...r.test,
                customLayout: currentVal,
                custom_layout: currentVal,
                fieldType: "Custom Editor",
                field_type: "Custom Editor",
              },
            };
          }
          return r;
        });
        const updated = { ...prev, results: newResults };
        reportRef.current = updated;
        return updated;
      });

      toast.success(
        "Default Template Saved Permanently!",
        `This customized layout, table format, and antibiotic list have been saved as the default template for "${item.test.name}". All future reports will now open with this exact layout!`
      );
    } catch (err: any) {
      console.error("Failed to save default template:", err);
      toast.error("Save Failed", err.message || "Failed to update default template.");
    } finally {
      setSavingMasterTemplate((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const [printingAndApproving, setPrintingAndApproving] = useState(false);

  // Auto-save & approve report in background, then open Print Report modal
  const handlePrintReport = async () => {
    setPrintingAndApproving(true);
    try {
      const payload = Object.entries(values).map(([id, resultValue]) => {
        const isOverridden = !!abnormalOverrides[id];
        const rItem = report?.results.find((r) => r.id === id);
        const calculatedAbnormal = rItem ? isValueAbnormal(rItem.test, resultValue).abnormal : false;

        return {
          id,
          result_value: resultValue.trim(),
          resultValue: resultValue.trim(),
          is_abnormal: isOverridden || calculatedAbnormal,
          isAbnormal: isOverridden || calculatedAbnormal,
          remarks: paramRemarks[id] ? paramRemarks[id].trim() : null,
        };
      });

      await fetchFromLaravel(`/reports/${reportId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "APPROVED",
          results: payload,
          printedInterpretations,
          test_notes: testNotes,
          testNotes: testNotes,
        }),
      });

      // Update in-memory state so modal and report print reflect APPROVED
      setReport((prev) => (prev ? { ...prev, status: "APPROVED" } : prev));
      if (reportRef.current) {
        reportRef.current.status = "APPROVED";
      }
    } catch (err: any) {
      console.error("Auto-approve on print failed:", err);
      toast.error("Auto-Approve Notice", "Opening print modal, but saving approval failed: " + (err.message || "Network error"));
    } finally {
      setPrintingAndApproving(false);
      setIsPrintModalOpen(true);
    }
  };

  const handleSaveResults = async (targetStatus?: "IN_PROGRESS" | "FINAL" | "APPROVED", andNext: boolean = false) => {
    setSaving(true);
    if (andNext && targetStatus === "APPROVED") {
      setSavingAction("APPROVE_NEXT");
    } else if (targetStatus === "APPROVED") {
      setSavingAction("APPROVE");
    } else if (targetStatus === "FINAL") {
      setSavingAction("FINAL");
    } else if (targetStatus === "IN_PROGRESS") {
      setSavingAction("IN_PROGRESS");
    } else {
      setSavingAction("APPROVE");
    }
    setError(null);
    setSuccess(null);

    const payload = Object.entries(values).map(([id, resultValue]) => {
      const isOverridden = !!abnormalOverrides[id];
      const rItem = report?.results.find(r => r.id === id);
      const calculatedAbnormal = rItem ? isValueAbnormal(rItem.test, resultValue).abnormal : false;

      return {
        id,
        result_value: resultValue.trim(),
        resultValue: resultValue.trim(),
        is_abnormal: isOverridden || calculatedAbnormal,
        isAbnormal: isOverridden || calculatedAbnormal,
        remarks: paramRemarks[id] ? paramRemarks[id].trim() : null,
      };
    });

    const resolvedStatus = targetStatus 
      ? targetStatus 
      : (report?.status === "FINAL" || report?.status === "APPROVED" ? report.status : "IN_PROGRESS");

    try {
      const updateRes = await fetchFromLaravel(`/reports/${reportId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: resolvedStatus,
          results: payload,
          printedInterpretations,
          test_notes: testNotes,
          testNotes: testNotes
        }),
      });

      // If user opted to also update the master template for future reports, sync it to Test Master
      const customEditorSyncPromises = Object.entries(syncMasterOnSave)
        .filter(([itemId, shouldSync]) => shouldSync && values[itemId])
        .map(async ([itemId]) => {
          const rItem = report?.results.find((r) => r.id === itemId);
          if (rItem?.test?.id) {
            try {
              await fetchFromLaravel(`/tests/${rItem.test.id}/report-layout`, {
                method: "POST",
                body: JSON.stringify({
                  interpretation: values[itemId],
                }),
              });
            } catch (syncErr) {
              console.warn("Failed to auto-sync default template to test master:", syncErr);
            }
          }
        });

      if (customEditorSyncPromises.length > 0) {
        await Promise.all(customEditorSyncPromises);
      }

      let successMsg = "Diagnostic results saved successfully.";
      if (resolvedStatus === "IN_PROGRESS") {
        successMsg = "Report results saved & marked as IN PROGRESS.";
      }
      if (targetStatus === "FINAL" || resolvedStatus === "FINAL") {
        successMsg = "Report results saved & marked as FINAL.";
      }
      if (targetStatus === "APPROVED" || resolvedStatus === "APPROVED") {
        const isAbdmLinked = updateRes?.abdm_status === "LINKED" || updateRes?.abdmStatus === "LINKED";
        const hasAbha = report?.patient?.abhaAddress || (report?.patient as any)?.abha_address || report?.patient?.abhaNumber || (report?.patient as any)?.abha_number;

        if (isAbdmLinked) {
          successMsg = "Report APPROVED! Dispatched to Ayushman Bharat Digital Mission (ABDM M2).";
        } else if (hasAbha) {
          successMsg = "Report APPROVED! Synced to Ayushman Bharat Digital Mission (ABDM M2).";
        } else {
          successMsg = "Report results saved & APPROVED.";
        }
      }

      setSuccess(successMsg);
      toast.success("Success", successMsg);

      // Update in-memory state so UI updates immediately
      if (report) {
        setReport((prev) => prev ? { ...prev, status: resolvedStatus } : prev);
      }
      if (reportRef.current) {
        reportRef.current.status = resolvedStatus;
      }

      if (andNext) {
        if (nextReportId) {
          router.push(`/dashboard/reports/${nextReportId}/edit`);
        } else {
          toast.success("Queue Finished", "All reports in sequence have been completed.");
          setTimeout(() => { router.push(`/dashboard/reports`); router.refresh(); }, 500);
        }
      } else {
        setTimeout(() => { router.push(`/dashboard/reports`); router.refresh(); }, 800);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update results.");
      setSaving(false);
      setSavingAction(null);
    }
  };

  // Prevent unintentional form submission on Enter
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.isContentEditable ||
        target.classList.contains("ProseMirror")
      ) {
        return;
      }
      e.preventDefault();
    }
  };

  // Keyboard navigation & Enter-key formula trigger:
  // Pressing Enter immediately recomputes automated formulas and advances focus.
  // If upcoming fields are auto-filled by formulas and already have values,
  // it automatically jumps over them straight to the next empty field.
  // If an auto-fill field was not filled, focus lands on it so the user can enter the value manually.
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // 1. Force immediate formula recalculation with the current value
      const targetVal = e.currentTarget.value;
      const currentReport = reportRef.current;
      const currentVals = { ...valuesRef.current, ...values, [itemId]: targetVal };
      const { calculatedValues } = computeAutomatedFormulas(
        currentVals,
        currentReport,
        manualOverrides
      );
      const allNewValues: Record<string, string> = { ...currentVals, ...calculatedValues };
      valuesRef.current = allNewValues;
      setValues(allNewValues);

      // 2. Query all result inputs on the page
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[data-result-input="true"]:not([disabled])'
        )
      );
      const currentIndex = inputs.indexOf(e.currentTarget);

      if (e.shiftKey) {
        if (currentIndex > 0) {
          const prevInput = inputs[currentIndex - 1];
          prevInput.focus();
          if (typeof prevInput.select === "function") {
            prevInput.select();
          }
          prevInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        if (currentIndex > -1 && currentIndex + 1 < inputs.length) {
          let targetIndex = -1;

          // Check if the immediate next field or consecutive fields are autofilled / calculated with values
          const immediateNext = inputs[currentIndex + 1];
          const immediateNextId = immediateNext.getAttribute("data-result-id") || "";
          const isImmediateCalc =
            immediateNext.getAttribute("data-is-calculated") === "true" ||
            !!calculatedValues[immediateNextId] ||
            calculatedParamIds.has(immediateNextId);
          const immediateNextVal = (allNewValues[immediateNextId] ?? immediateNext.value ?? "").trim();

          if (isImmediateCalc && immediateNextVal !== "") {
            // The next field was auto-filled by formula.
            // Jump over all completed fields directly to the next EMPTY field!
            for (let i = currentIndex + 1; i < inputs.length; i++) {
              const inp = inputs[i];
              const inpId = inp.getAttribute("data-result-id") || "";
              const inpVal = (allNewValues[inpId] ?? inp.value ?? "").trim();
              if (inpVal === "") {
                targetIndex = i;
                break;
              }
            }
          }

          // If no empty field was found ahead or the next field wasn't an autofilled field,
          // advance normally to currentIndex + 1
          if (targetIndex === -1) {
            targetIndex = currentIndex + 1;
          }

          if (targetIndex < inputs.length) {
            const nextInput = inputs[targetIndex];
            nextInput.focus();
            if (typeof nextInput.select === "function") {
              nextInput.select();
            }
            nextInput.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    } else if (e.key === "ArrowDown") {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[data-result-input="true"]:not([disabled])'
        )
      );
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex > -1 && currentIndex + 1 < inputs.length) {
        e.preventDefault();
        const nextInput = inputs[currentIndex + 1];
        nextInput.focus();
        if (typeof nextInput.select === "function") {
          nextInput.select();
        }
        nextInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (e.key === "ArrowUp") {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[data-result-input="true"]:not([disabled])'
        )
      );
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex > 0) {
        e.preventDefault();
        const prevInput = inputs[currentIndex - 1];
        prevInput.focus();
        if (typeof prevInput.select === "function") {
          prevInput.select();
        }
        prevInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Hierarchy grouping & ordering
  const mainGroups = useMemo(() => {
    if (!report || !report.results || !Array.isArray(report.results)) return [];

    const map = new Map<string, {
      mainTestName: string;
      mainTestId: string;
      hasInterpretation: boolean;
      sectionsMap: Map<string, { sectionKey: string; sectionName: string; parentOrder: number; items: ReportTest[] }>;
    }>();

    const seenParamKeys = new Set<string>();

    // 1. Maintain strict catalog sort_order sequence (never disrupt with entered values)
    const sortedResults = [...report.results].filter(Boolean).sort((a, b) => {
      const orderA = a?.test?.sort_order ?? (a?.test as any)?.sortOrder ?? 0;
      const orderB = b?.test?.sort_order ?? (b?.test as any)?.sortOrder ?? 0;
      if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
      if (orderA !== 0 && orderB === 0) return -1;
      if (orderA === 0 && orderB !== 0) return 1;
      return 0;
    });

    sortedResults.forEach((item) => {
      if (!item) return;
      const t = item.test;
      if (!t) return;

      // Filter out hidden parameters according to catalog layout preferences
      const isParamHidden = Boolean(
        t.is_hidden || t.isHidden ||
        t.parent?.is_hidden || t.parent?.isHidden ||
        t.parent?.parent?.is_hidden || t.parent?.parent?.isHidden
      );
      if (isParamHidden) {
        return; // Strictly hide parameter from Enter Results
      }

      const mt = t.parent?.parent ? t.parent.parent : (t.parent ? t.parent : t);
      if (!mt) return;
      const mtId = mt.id || t.id || `test-${item.id}`;
      const mtName = mt.name || t.name || "Diagnostic Panel";

      // Defensive parameter deduplication by mainTestId + section + normalized name
      const parentKeyId = t.parent_id || t.parentId || t.parent?.id || 'root';
      const paramKey = `${mtId}:${parentKeyId}:${(t.name || '').trim().toLowerCase()}`;
      if (seenParamKeys.has(paramKey)) {
        return; // Guard against duplicate parameter rows
      }
      seenParamKeys.add(paramKey);

      const rawInterp = mt.interpretation || t.interpretation || (t.parent ? t.parent.interpretation : null);
      const interp = getClinicalInterpretation(mtName, rawInterp, t.category);
      const hasInterp = !!interp && interp.trim() !== '' && interp !== '<p><br></p>';

      if (!map.has(mtId)) {
        map.set(mtId, {
          mainTestName: mtName,
          mainTestId: mtId,
          hasInterpretation: hasInterp,
          sectionsMap: new Map(),
        });
      }

      const group = map.get(mtId)!;

      const isSubgroup = Boolean(t.parent && t.parent.id !== mt.id && (t.parent.name || "").trim().toLowerCase() !== mtName.trim().toLowerCase());
      const sectionKey = isSubgroup 
        ? `group-${t.parent?.id || t.parent?.name || 'sub'}`
        : `item-${t.id || item.id}`;
      const sectionName = isSubgroup 
        ? (t.parent?.name || "Parameters") 
        : "_default";
      const itemSortOrder = t.sort_order ?? (t as any)?.sortOrder ?? 0;
      const parentOrder = isSubgroup 
        ? (t.parent?.sort_order ?? (t.parent as any)?.sortOrder ?? itemSortOrder)
        : itemSortOrder;

      if (!group.sectionsMap.has(sectionKey)) {
        group.sectionsMap.set(sectionKey, { sectionKey, sectionName, parentOrder, items: [] });
      }
      group.sectionsMap.get(sectionKey)!.items.push(item);
    });

    return Array.from(map.values())
      .map((g) => ({
        mainTestName: g.mainTestName,
        mainTestId: g.mainTestId,
        hasInterpretation: g.hasInterpretation,
        sections: Array.from(g.sectionsMap.values())
          .map((secData) => ({
            sectionKey: secData.sectionKey,
            sectionName: secData.sectionName,
            parentOrder: secData.parentOrder,
            items: secData.items.slice().sort((a, b) => {
              const orderA = a?.test?.sort_order ?? (a?.test as any)?.sortOrder ?? 0;
              const orderB = b?.test?.sort_order ?? (b?.test as any)?.sortOrder ?? 0;
              if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
              if (orderA !== 0 && orderB === 0) return -1;
              if (orderA === 0 && orderB !== 0) return 1;
              return (a?.test?.name || "").localeCompare(b?.test?.name || "");
            }),
          }))
          .sort((secA, secB) => {
            const orderA = (secA.parentOrder && secA.parentOrder !== 0)
              ? secA.parentOrder
              : (secA.items[0]?.test?.sort_order ?? (secA.items[0]?.test as any)?.sortOrder ?? 0);
            const orderB = (secB.parentOrder && secB.parentOrder !== 0)
              ? secB.parentOrder
              : (secB.items[0]?.test?.sort_order ?? (secB.items[0]?.test as any)?.sortOrder ?? 0);
            if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
            if (orderA !== 0 && orderB === 0) return -1;
            if (orderA === 0 && orderB !== 0) return 1;
            return (secA.sectionName || "").localeCompare(secB.sectionName || "");
          }),
      }))
      .sort((a, b) => {
        const catA = a.sections?.[0]?.items?.[0]?.test?.category;
        const catB = b.sections?.[0]?.items?.[0]?.test?.category;
        return compareClinicalTests(
          { name: a.mainTestName || "", category: catA },
          { name: b.mainTestName || "", category: catB }
        );
      });
  }, [report]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto animate-fade-in min-h-[calc(100vh-68px-1.75rem)] pb-12">
        {/* Top Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/80 pb-4 mb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-3.5 w-72 rounded" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* Patient Ribbon Skeleton */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        {/* Add Additional Test Bar Skeleton */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/70 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>

        {/* Test Group Table Skeleton */}
        <div className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-48 rounded" />
            </div>
            <Skeleton className="h-5 w-24 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-4">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 max-w-lg mx-auto text-center p-8 rounded-xl mt-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div><h2 className="font-display text-lg font-semibold text-foreground">Retrieval Error</h2><p className="text-sm text-muted-foreground mt-1">{error}</p></div>
        <Link href="/dashboard/reports"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Reports</Button></Link>
      </div>
    );
  }
  if (!report) return null;

  const patientData: any = report?.patient || {};
  const patientMeta = patientData?.meta || {};
  const reportMeta = (report as any)?.meta || {};

  const formatClinicalDateTime = (val: any) => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const strVal = String(val);
      const hasTime = strVal.includes("T") || strVal.includes(":") || (strVal.includes(" ") && /\d{1,2}:\d{2}/.test(strVal));
      if (hasTime) {
        return d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(val);
    }
  };

  const rawRegDate =
    patientData.registrationDate ||
    patientData.registration_date ||
    patientMeta.registrationDate ||
    patientMeta.registration_date ||
    patientData.createdAt ||
    patientData.created_at ||
    (report as any)?.registrationDate ||
    (report as any)?.registration_date ||
    report?.createdAt ||
    report?.created_at;

  const displayRegDate = formatClinicalDateTime(rawRegDate);

  const rawCollDate =
    patientData.collectionDateTime ||
    patientData.collection_date_time ||
    patientData.collectionDate ||
    patientData.collection_date ||
    patientMeta.collectionDateTime ||
    patientMeta.collection_date_time ||
    patientMeta.collectionDate ||
    patientMeta.collection_date ||
    (report as any)?.collectionDateTime ||
    (report as any)?.collection_date_time ||
    (report as any)?.collectionDate ||
    (report as any)?.collection_date ||
    reportMeta.collectionDateTime ||
    reportMeta.collection_date_time ||
    rawRegDate;

  const displayCollDate = formatClinicalDateTime(rawCollDate);

  const rawRefDoctor =
    patientData.refDoctor ||
    patientData.ref_doctor ||
    patientMeta.refDoctor ||
    patientMeta.ref_doctor ||
    (report as any)?.refDoctor ||
    (report as any)?.ref_doctor ||
    (report as any)?.referredBy ||
    (report as any)?.referred_by;

  const displayReferredBy =
    rawRefDoctor &&
    String(rawRefDoctor).trim() !== "" &&
    String(rawRefDoctor).trim() !== "—" &&
    String(rawRefDoctor).trim().toLowerCase() !== "null" &&
    String(rawRefDoctor).trim().toLowerCase() !== "undefined"
      ? String(rawRefDoctor).trim().toLowerCase().startsWith("dr")
        ? String(rawRefDoctor).trim()
        : `Dr. ${String(rawRefDoctor).trim()}`
      : "Self";

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto animate-fade-in min-h-[calc(100vh-68px-1.75rem)] -mb-7">
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header Bar with Save Results on the Right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/reports">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">Enter Results</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Enter laboratory parameters, remarks, and clinical findings below.</p>
            </div>
          </div>

          {/* Action Buttons: Fetch from Machine */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsMachineModalOpen(true);
                fetchMachineResults();
              }}
              className="h-10 px-4 gap-2 font-bold shadow-2xs cursor-pointer border-emerald-500/40 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 rounded-xl"
              title="Import and auto-populate results from connected Cell Counter or Biochemistry Analyzer"
            >
              <Cpu className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span>Fetch from Machine</span>
            </Button>
          </div>
        </div>

        {/* Patient Ribbon with View Details Button */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-semibold text-foreground leading-none">{report.patient.name}</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase">
                  {report.patient.gender}, {report.patient.age}y
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                  report.status === "APPROVED" || report.status === "COMPLETED"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : report.status === "FINAL"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                    : report.status === "IN_PROGRESS"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : report.status === "NEW"
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                    : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    report.status === "APPROVED" || report.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : report.status === "FINAL"
                      ? "bg-blue-500"
                      : report.status === "IN_PROGRESS"
                      ? "bg-amber-500 animate-pulse"
                      : report.status === "NEW"
                      ? "bg-sky-500"
                      : "bg-slate-400"
                  }`} />
                  {report.status === "IN_PROGRESS" ? "In Progress" : report.status === "NEW" ? "New" : report.status}
                </span>
                {activePackageName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <Boxes className="h-3 w-3" />
                    <span>Package: {activePackageName}</span>
                  </span>
                )}
                {((report.patient as any)?.abhaAddress || (report.patient as any)?.abha_address || (report.patient as any)?.abhaNumber || (report.patient as any)?.abha_number) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    <Shield className="h-3 w-3 text-emerald-600" />
                    <span>ABHA: {(report.patient as any)?.abhaAddress || (report.patient as any)?.abha_address || (report.patient as any)?.abhaNumber || (report.patient as any)?.abha_number}</span>
                  </span>
                )}
                {(report.abdmStatus === "LINKED" || (report as any)?.abdm_status === "LINKED") && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white shadow-2xs">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>ABDM M2 Synced</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                <span className="font-mono text-primary bg-accent px-1.5 py-0.5 rounded font-bold">
                  {patientData.customId || patientData.custom_id || "—"}
                </span>
                <span className="font-mono text-foreground/80 font-medium">
                  Rep: {report.customId || report.custom_id || "—"}
                </span>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5 text-foreground/90 font-medium">
                  <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span><strong>Referred By:</strong> {displayReferredBy}</span>
                </span>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5 text-foreground/90 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span><strong>Reg Date:</strong> {displayRegDate}</span>
                </span>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1.5 text-foreground/90 font-medium">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Collection Date:</strong> {displayCollDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* View Details Button beside patient name */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPatientDetailsOpen(true)}
              className="h-9 px-3.5 gap-1.5 font-bold text-xs border-border/90 hover:bg-muted text-foreground cursor-pointer shadow-xs"
            >
              <Eye className="h-4 w-4 text-primary" />
              <span>View Details</span>
            </Button>
          </div>
        </div>

        {/* Form Container with Enter Key Navigation */}
        <form onSubmit={(e) => { e.preventDefault(); handleSaveResults("IN_PROGRESS"); }} onKeyDown={handleFormKeyDown} className="flex-1 flex flex-col justify-between">
          <div className="space-y-6 flex-1 pb-8">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/8 border border-destructive/20 p-4 text-sm text-destructive font-medium">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 rounded-xl bg-accent border border-primary/20 p-4 text-sm text-primary font-medium">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p>{success}</p>
              </div>
            )}

            {/* Main Tests Groups with Subgroup Headers, Parameter Remarks and Test Meta (Notes/Remarks/Advices) */}
            <div className="space-y-6">
              {mainGroups.map((group) => {
                const allCustomEditor = group.sections.every(sec => sec.items.every(item => isGenuineCustomEditorTest(item.test)));
                const hasAnyNumeric = group.sections.some(sec => sec.items.some(item => !isGenuineCustomEditorTest(item.test) && (item.test?.valueType || item.test?.value_type) !== "Custom"));
                const currentTestMeta = testNotes[group.mainTestId] || {};

                return (
                  <div key={group.mainTestId} className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">

                    {/* Main Panel Banner */}
                    <div className="bg-muted/30 px-6 py-3.5 border-b border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FlaskConical className="h-[18px] w-[18px] text-primary shrink-0" />
                        <h3 className="text-sm font-bold tracking-wider uppercase text-foreground">{group.mainTestName}</h3>
                      </div>
                      <div className="flex items-center space-x-4">
                        {group.hasInterpretation && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`interp-${group.mainTestId}`}
                              checked={printedInterpretations.includes(group.mainTestId)}
                              onCheckedChange={() => toggleInterpretation(group.mainTestId)}
                            />
                            <Label htmlFor={`interp-${group.mainTestId}`} className="text-xs text-muted-foreground font-normal cursor-pointer">Add Interpretation</Label>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(group.mainTestId)}
                          disabled={modifyingTest}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                          title="Remove entire test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Parameters Table */}
                    <div className="table-responsive-container">
                      <table className="w-full min-w-[700px] text-left border-collapse">
                        {!allCustomEditor && (
                          <thead>
                            <tr className="bg-muted/15 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground border-b border-border/60">
                              <th className="px-6 py-3 w-2/5">Parameter</th>
                              <th className="px-6 py-3">Value</th>
                              {hasAnyNumeric && (
                                <>
                                  <th className="px-6 py-3">Unit</th>
                                  <th className="px-6 py-3">Reference Range</th>
                                  <th className="px-6 py-3 text-right">Flag</th>
                                </>
                              )}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {group.sections.map((section) => {
                            const isDlcSection =
                              (/differential.*leukocyte/i.test(section.sectionName || "") && !/absolute/i.test(section.sectionName || "")) ||
                              (section.items.length >= 3 &&
                                section.items.some(it => /neutrophil|polymorph/i.test(it.test?.name || "") && !/absolute/i.test(it.test?.name || "")) &&
                                section.items.some(it => /lymphocyte/i.test(it.test?.name || "") && !/absolute/i.test(it.test?.name || "")));

                            let dlcSum = 0;
                            let dlcFilledCount = 0;
                            let hasDlcParams = false;

                            if (isDlcSection) {
                              section.items.forEach(item => {
                                const tName = (item.test?.name || "").toLowerCase();
                                if (
                                  (tName.includes("neutrophil") || tName.includes("polymorph") || tName.includes("lymphocyte") ||
                                    tName.includes("eosinophil") || tName.includes("monocyte") || tName.includes("basophil")) &&
                                  !tName.includes("absolute") && (item.test?.unit === "%" || !item.test?.unit || item.test?.unit === "")
                                ) {
                                  hasDlcParams = true;
                                  const v = parseFloat((values[item.id] ?? "").toString().trim());
                                  if (!isNaN(v)) {
                                    dlcSum += v;
                                    dlcFilledCount++;
                                  }
                                }
                              });
                              dlcSum = Math.round(dlcSum * 10) / 10;
                            }

                            return (
                              <React.Fragment key={section.sectionKey || section.sectionName}>

                                {/* Subgroup Header Banner (e.g. Differential Leukocyte Count) */}
                                {section.sectionName !== "_default" && section.sectionName !== "Report Template" && (
                                  <tr className="bg-muted/20 border-b border-border/40">
                                    <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-2 text-xs font-bold text-primary uppercase tracking-wider bg-primary/5">
                                      {section.sectionName}
                                    </td>
                                  </tr>
                                )}

                                {section.items.map((item) => {
                                  if (!item || !item.test) return null;
                                  const rawVal = values[item.id] || "";
                                  const isCustomEditor = isGenuineCustomEditorTest(item.test);
                                  const val = (!isCustomEditor && typeof rawVal === "string" && (rawVal.startsWith("<") || rawVal.includes("<div") || rawVal.includes("<table") || rawVal.includes("clinical-interpretation"))) ? "" : rawVal;
                                  const { abnormal, flag } = isValueAbnormal(item.test, val);
                                  const isForcedAbnormal = !!abnormalOverrides[item.id];
                                  const canAutoCalc = canParamBeCalculatedInReport(item.test, report, item.id);
                                  const isCalculated = calculatedParamIds.has(item.id) || (canAutoCalc && isParamFormulaCalculated(item.test));
                                  const isTextType = (item.test.valueType || item.test.value_type) === "Text";
                                  const isTextRange = (item.test.rangeType || item.test.range_type) === "TEXT" || !!(item.test.textRefRange || item.test.text_ref_range);
                                  const patGender = report?.patient?.gender || "both";
                                  const patAge = report?.patient?.age ?? 25;
                                  const range = getRefRange(item.test, patGender, patAge);
                                  const fallbackRange = getDefaultRangeForTest(item.test.name);
                                  const refRangeText = isTextRange ? (item.test.textRefRange || item.test.text_ref_range || fallbackRange) : (formatRefRangeText(range) !== "—" ? formatRefRangeText(range) : fallbackRange);
                                  const paramUnit = item.test.unit || getDefaultUnitForTest(item.test.name) || "—";
                                  const hasActiveRemark = showParamRemark[item.id] || !!paramRemarks[item.id];

                                  if (isCustomEditor) {
                                    const isSavingThisTemplate = !!savingMasterTemplate[item.id];
                                    const isSyncingOnReportSave = !!syncMasterOnSave[item.id];

                                    return (
                                      <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/15 transition-colors">
                                        <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-4">
                                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-bold text-foreground">
                                                {item.test.name !== "Report Template" ? item.test.name : "Report Template"}
                                              </span>
                                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider border border-primary/20">
                                                Culture &amp; Custom Layout
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                              {item.test.interpretation && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (window.confirm("Reload master template from Test Master? This will reset the editor table back to the original master definition.")) {
                                                      handleValueChange(item.id, item.test.interpretation || "");
                                                    }
                                                  }}
                                                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer bg-background hover:bg-muted px-2.5 py-1 rounded-md border border-border/60 transition-colors shadow-2xs"
                                                  title="Click to reload the template originally saved in Test Master"
                                                >
                                                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                                  <span>Reload Template</span>
                                                </button>
                                              )}

                                              <button
                                                type="button"
                                                disabled={isSavingThisTemplate}
                                                onClick={() => handleSaveAsDefaultTemplate(item)}
                                                className="text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary flex items-center gap-1.5 cursor-pointer bg-primary/10 px-3 py-1 rounded-md border border-primary/30 transition-all shadow-2xs disabled:opacity-50"
                                                title="Save this exact table format and antibiotics permanently to Test Master so future reports use it automatically"
                                              >
                                                {isSavingThisTemplate ? (
                                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                  <Save className="h-3.5 w-3.5" />
                                                )}
                                                <span>{isSavingThisTemplate ? "Saving to Master..." : "Save as Default Template"}</span>
                                              </button>
                                            </div>
                                          </div>

                                          <div className="border border-border/60 rounded-xl overflow-visible shadow-sm bg-card">
                                            <TipTapEditor
                                              value={val}
                                              onChange={(html) => handleValueChange(item.id, html)}
                                              hideHeader
                                              hideFooter
                                            />
                                          </div>

                                          <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2 px-1">
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                                              <input
                                                type="checkbox"
                                                checked={isSyncingOnReportSave}
                                                onChange={(e) => setSyncMasterOnSave((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                                              />
                                              <span>Also update master template for future reports when saving this patient report</span>
                                            </label>

                                            <span className="text-[11px] text-muted-foreground/80 italic">
                                              Tip: Changes here affect this report. Click &apos;Save as Default Template&apos; to apply for all future patients.
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <React.Fragment key={item.id}>
                                      <tr className="border-b border-border/30 last:border-0 hover:bg-muted/15 transition-colors">

                                        {/* Parameter Name */}
                                        <td className="px-6 py-3.5">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-sm ${section.sectionName !== "_default" ? "pl-3" : ""} ${abnormal || isForcedAbnormal ? "font-bold text-foreground" : "font-medium text-foreground"
                                              }`}>
                                              {item.test.name}
                                            </span>
                                            {isCalculated && (
                                              <span
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 bg-primary/10 text-primary border border-primary/20"
                                                title="Auto-Calculated via Medical Formula"
                                              >
                                                <Calculator className="h-3 w-3" />
                                                Auto
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Value Input with Left Tick Box and Right + Remark Icon */}
                                        {(item.test.valueType || item.test.value_type) === "Custom" ? (
                                          <td className="px-6 py-3.5" colSpan={hasAnyNumeric ? 4 : 1}>
                                            <div className="flex items-center gap-2 max-w-md">
                                              <input
                                                type="checkbox"
                                                checked={isForcedAbnormal}
                                                onChange={(e) => {
                                                  setAbnormalOverrides((prev) => ({
                                                    ...prev,
                                                    [item.id]: e.target.checked,
                                                  }));
                                                }}
                                                title="Tick to highlight / bold in report"
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer accent-primary shrink-0"
                                              />
                                              <ClinicalResultDropdown
                                                itemId={item.id}
                                                paramName={item.test.name}
                                                testName={group.mainTestName}
                                                category={item.test.category || (section.sectionName !== "_default" ? section.sectionName : undefined)}
                                                customDbOptions={item.test?.customOptions ?? item.test?.custom_options}
                                                valueType={item.test.valueType || item.test.value_type}
                                                value={val}
                                                onChange={(newVal) => handleValueChange(item.id, newVal)}
                                                onKeyDown={(e) => handleInputKeyDown(e, item.id)}
                                                disabled={saving}
                                                isCalculated={isCalculated && !manualOverrides.has(item.id)}
                                                isForcedAbnormal={isForcedAbnormal}
                                                abnormal={abnormal}
                                                isTextOnlyTable={true}
                                                className="w-full"
                                              />

                                              {/* + Button to add inline comment/remark */}
                                              <button
                                                type="button"
                                                onClick={() => toggleParamRemark(item.id)}
                                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${hasActiveRemark
                                                  ? "bg-primary/10 text-primary border-primary/30"
                                                  : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                  }`}
                                                title="Add parameter remark / comment"
                                              >
                                                <Plus className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        ) : (
                                          <>
                                            <td className="px-6 py-3.5">
                                              <div className="flex items-center gap-2">
                                                {/* Tick box to force bold */}
                                                <input
                                                  type="checkbox"
                                                  checked={isForcedAbnormal}
                                                  onChange={(e) => {
                                                    setAbnormalOverrides((prev) => ({
                                                      ...prev,
                                                      [item.id]: e.target.checked,
                                                    }));
                                                  }}
                                                  title="Tick to highlight / bold in report"
                                                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer accent-primary shrink-0"
                                                />

                                                <ClinicalResultDropdown
                                                  itemId={item.id}
                                                  paramName={item.test.name}
                                                  testName={group.mainTestName}
                                                  category={item.test.category || (section.sectionName !== "_default" ? section.sectionName : undefined)}
                                                  customDbOptions={item.test?.customOptions ?? item.test?.custom_options}
                                                  valueType={item.test.valueType || item.test.value_type}
                                                  value={val}
                                                  onChange={(newVal) => handleValueChange(item.id, newVal)}
                                                  onKeyDown={(e) => handleInputKeyDown(e, item.id)}
                                                  disabled={saving}
                                                  isCalculated={isCalculated && !manualOverrides.has(item.id)}
                                                  isForcedAbnormal={isForcedAbnormal}
                                                  abnormal={abnormal}
                                                  isTextOnlyTable={isTextType}
                                                  className={isTextType ? "w-64" : "w-36"}
                                                />

                                                {/* + Button to add inline comment/remark */}
                                                <button
                                                  type="button"
                                                  onClick={() => toggleParamRemark(item.id)}
                                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${hasActiveRemark
                                                    ? "bg-primary/10 text-primary border-primary/30"
                                                    : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }`}
                                                  title="Add parameter remark / comment"
                                                >
                                                  <Plus className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </td>

                                            {/* Unit */}
                                            <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">{paramUnit}</td>

                                            {/* Reference Range with Edit ✏️ Icon */}
                                            <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground/80">{refRangeText}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenEditRange(item.test)}
                                                  className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer"
                                                  title="Edit Reference Range"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </td>

                                            {/* Flag Badge */}
                                            <td className="px-6 py-3.5 text-right">
                                              {abnormal ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-destructive text-destructive-foreground">
                                                  {flag}
                                                </span>
                                              ) : val ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                  NORMAL
                                                </span>
                                              ) : (
                                                <span className="text-xs text-muted-foreground/45 italic">Pending</span>
                                              )}
                                            </td>
                                          </>
                                        )}
                                      </tr>

                                      {/* Inline Parameter Remark Input Row (Directly below parameter) */}
                                      {hasActiveRemark && (
                                        <tr className="bg-muted/15 border-b border-border/40">
                                          <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-2">
                                            <div className="flex items-center gap-2 pl-3">
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3 text-primary" />
                                                Remark:
                                              </span>
                                              <input
                                                type="text"
                                                placeholder={`Enter remark / observation for ${item.test.name} (e.g. Microcytic, Repeated on diluted sample, etc.)…`}
                                                value={paramRemarks[item.id] || ""}
                                                onChange={(e) => handleParamRemarkChange(item.id, e.target.value)}
                                                className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary font-medium"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveParamRemark(item.id)}
                                                className="p-1 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                                title="Clear remark"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}

                                {/* DLC Total (Differential Leukocyte Count 100% Validator Row) */}
                                {hasDlcParams && (
                                  <tr className={`border-b border-border/40 transition-colors ${dlcSum === 100
                                      ? "bg-emerald-500/10 dark:bg-emerald-950/20"
                                      : dlcFilledCount > 0
                                        ? "bg-rose-500/10 dark:bg-rose-950/20"
                                        : "bg-muted/15"
                                    }`}>
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-2 pl-3">
                                        <span className={`text-xs font-black uppercase tracking-wider ${dlcSum === 100
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : dlcFilledCount > 0
                                              ? "text-rose-600 dark:text-rose-400"
                                              : "text-muted-foreground"
                                          }`}>
                                          DLC Total (Differential Leukocyte Count)
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-black border flex items-center justify-between min-w-[130px] ${dlcSum === 100
                                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-sm"
                                            : dlcFilledCount > 0
                                              ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50 shadow-sm animate-pulse"
                                              : "bg-muted text-muted-foreground border-border/80"
                                          }`}>
                                          <span>{dlcSum}%</span>
                                          {dlcSum === 100 ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                          ) : dlcFilledCount > 0 ? (
                                            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                          ) : null}
                                        </div>
                                      </div>
                                    </td>
                                    {hasAnyNumeric && (
                                      <>
                                        <td className="px-6 py-3 text-xs font-mono text-muted-foreground">%</td>
                                        <td className="px-6 py-3 text-xs font-mono font-bold text-foreground/80">100 %</td>
                                        <td className="px-6 py-3 text-right">
                                          {dlcSum === 100 ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm">
                                              <CheckCircle2 className="h-3.5 w-3.5" /> 100% OK
                                            </span>
                                          ) : dlcFilledCount > 0 ? (
                                            <div className="flex items-center gap-2 justify-end">
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50 shadow-sm">
                                                <AlertTriangle className="h-3.5 w-3.5" /> {dlcSum > 100 ? `Alert: +${(dlcSum - 100).toFixed(0)}% Over (Total ${dlcSum}%)` : `Alert: -${(100 - dlcSum).toFixed(0)}% Short (Total ${dlcSum}%)`}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleAutoBalanceDlc(section.items)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all cursor-pointer shadow-xs active:scale-95"
                                                title="Balance all DLC percentages proportionally so they total exactly 100%"
                                              >
                                                <Sliders className="h-3 w-3" /> Auto-Balance (100%)
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-muted-foreground italic">Target: 100%</span>
                                          )}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Main Test Footer: + Add Note, + Add Remarks, + Add Advices */}
                    <div className="p-4 bg-muted/20 border-t border-border/60 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Test Section Findings & Notes ({group.mainTestName})
                        </span>

                        {/* 3 Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTestMeta(group.mainTestId, "notes")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${currentTestMeta.notes !== undefined
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                              }`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{currentTestMeta.notes !== undefined ? "Note Active" : "Add Note"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleTestMeta(group.mainTestId, "remarks")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${currentTestMeta.remarks !== undefined
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                              }`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{currentTestMeta.remarks !== undefined ? "Remarks Active" : "Add Remarks"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleTestMeta(group.mainTestId, "advices")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${currentTestMeta.advices !== undefined
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                              }`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{currentTestMeta.advices !== undefined ? "Advices Active" : "Add Advices"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Inline Text Fields for Active Notes / Remarks / Advices */}
                      <div className="space-y-2.5">
                        {currentTestMeta.notes !== undefined && (
                          <div className="p-3 bg-background rounded-xl border border-border/80 space-y-1.5 shadow-xs animate-fade-in">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <FileEdit className="h-3.5 w-3.5 text-primary" />
                                Note for {group.mainTestName}:
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateAiSuggestion(group.mainTestId, "notes", group)}
                                  disabled={!!generatingAiField[`${group.mainTestId}_notes`]}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-amber-500/10 to-primary/10 hover:from-amber-500/20 hover:to-primary/20 text-primary border border-primary/25 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Auto-generate clinical notes using AI"
                                >
                                  {generatingAiField[`${group.mainTestId}_notes`] ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                                  )}
                                  <span>{generatingAiField[`${group.mainTestId}_notes`] ? "Writing..." : "AI Suggestion"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeTestMeta(group.mainTestId, "notes")}
                                  className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              placeholder={`Enter clinical notes for ${group.mainTestName}…`}
                              value={currentTestMeta.notes || ""}
                              onChange={(e) => handleTestMetaChange(group.mainTestId, "notes", e.target.value)}
                              className="w-full bg-muted/20 border border-border/80 rounded-lg p-2.5 text-xs text-foreground font-medium outline-none focus:border-primary"
                            />
                          </div>
                        )}

                        {currentTestMeta.remarks !== undefined && (
                          <div className="p-3 bg-background rounded-xl border border-border/80 space-y-1.5 shadow-xs animate-fade-in">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                Remarks for {group.mainTestName}:
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateAiSuggestion(group.mainTestId, "remarks", group)}
                                  disabled={!!generatingAiField[`${group.mainTestId}_remarks`]}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-amber-500/10 to-primary/10 hover:from-amber-500/20 hover:to-primary/20 text-primary border border-primary/25 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Auto-generate clinical remarks using AI"
                                >
                                  {generatingAiField[`${group.mainTestId}_remarks`] ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                                  )}
                                  <span>{generatingAiField[`${group.mainTestId}_remarks`] ? "Writing..." : "AI Suggestion"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeTestMeta(group.mainTestId, "remarks")}
                                  className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              placeholder={`Enter general remarks / observations for ${group.mainTestName}…`}
                              value={currentTestMeta.remarks || ""}
                              onChange={(e) => handleTestMetaChange(group.mainTestId, "remarks", e.target.value)}
                              className="w-full bg-muted/20 border border-border/80 rounded-lg p-2.5 text-xs text-foreground font-medium outline-none focus:border-primary"
                            />
                          </div>
                        )}

                        {currentTestMeta.advices !== undefined && (
                          <div className="p-3 bg-background rounded-xl border border-border/80 space-y-1.5 shadow-xs animate-fade-in">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                Advices for {group.mainTestName}:
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateAiSuggestion(group.mainTestId, "advices", group)}
                                  disabled={!!generatingAiField[`${group.mainTestId}_advices`]}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-amber-500/10 to-primary/10 hover:from-amber-500/20 hover:to-primary/20 text-primary border border-primary/25 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Auto-generate clinical advice using AI"
                                >
                                  {generatingAiField[`${group.mainTestId}_advices`] ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                                  )}
                                  <span>{generatingAiField[`${group.mainTestId}_advices`] ? "Writing..." : "AI Suggestion"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeTestMeta(group.mainTestId, "advices")}
                                  className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              placeholder={`Enter patient advices / clinical follow-up recommendations for ${group.mainTestName}…`}
                              value={currentTestMeta.advices || ""}
                              onChange={(e) => handleTestMetaChange(group.mainTestId, "advices", e.target.value)}
                              className="w-full bg-muted/20 border border-border/80 rounded-lg p-2.5 text-xs text-foreground font-medium outline-none focus:border-primary"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Action Footer with Cancel, Previous, Print, Final, In Progress, and Approve & Next Buttons */}
          <div className="sticky bottom-0 z-30 mt-auto bg-card/95 backdrop-blur-md border-t border-x border-border/90 rounded-t-2xl rounded-b-none p-3 sm:p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_20px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 safe-pb">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link href="/dashboard/reports" className="w-full sm:w-auto">
                <Button type="button" variant="outline" disabled={saving} className="cursor-pointer w-full sm:w-auto h-9 sm:h-10 text-xs font-semibold">
                  Cancel
                </Button>
              </Link>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (prevReportId) {
                    router.push(`/dashboard/reports/${prevReportId}/edit`);
                  } else {
                    toast.info("Queue", "No previous report found in sequence.");
                  }
                }}
                disabled={saving || !prevReportId}
                className="cursor-pointer w-full sm:w-auto h-9 sm:h-10 text-xs font-semibold gap-1.5 border-border/90 hover:bg-muted text-foreground transition-all disabled:opacity-40"
                title={prevReportId ? "Go to previous report" : "No previous report available"}
              >
                <ChevronLeft className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Previous</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReport}
                disabled={saving || printingAndApproving}
                className="h-9 sm:h-10 px-3 sm:px-4 gap-1.5 font-bold cursor-pointer border-border/90 hover:bg-muted text-foreground text-xs"
              >
                {printingAndApproving ? (
                  <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin text-primary" />
                ) : (
                  <Printer className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" />
                )}
                <span>{printingAndApproving ? "Approving…" : "Print Report"}</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults("APPROVED", false)}
                disabled={saving || printingAndApproving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 sm:px-4 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs"
                title="Approve Report"
              >
                {savingAction === "APPROVE" ? (
                  <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                )}
                <span>Approve</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults("FINAL")}
                disabled={saving || printingAndApproving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 sm:px-5 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs"
              >
                {savingAction === "FINAL" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>Final</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults("IN_PROGRESS")}
                disabled={saving || printingAndApproving}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 sm:px-5 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs"
              >
                {savingAction === "IN_PROGRESS" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>In Progress</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults("APPROVED", true)}
                disabled={saving || printingAndApproving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 sm:px-5 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs hover:opacity-95 transition-opacity"
              >
                {savingAction === "APPROVE_NEXT" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>{savingAction === "APPROVE_NEXT" ? "Approving…" : "Approve & Next"}</span>
                {savingAction !== "APPROVE_NEXT" && <ChevronRight className="h-3.5 sm:h-4 w-3.5 sm:w-4 ml-0.5 opacity-80" />}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* 1. Comprehensive Horizontal Patient & Order Details Dialog */}
      <Dialog open={isPatientDetailsOpen} onOpenChange={setIsPatientDetailsOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Comprehensive Patient & Order Details</DialogTitle>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {report?.patient.name}
                  </h3>
                  <span className="font-mono bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {report?.patient.customId || report?.patient.custom_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-muted text-muted-foreground">
                    {report?.patient.gender}, {report?.patient.age} Yrs
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${report?.status === "COMPLETED" || report?.status === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : report?.status === "FINAL"
                        ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                        : report?.status === "IN_PROGRESS"
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : report?.status === "NEW"
                            ? "bg-sky-500/15 text-sky-600 border border-sky-500/30"
                            : "bg-slate-500/15 text-slate-600 border border-slate-500/30"
                    }`}>
                    {report?.status === "IN_PROGRESS" ? "In Progress" : report?.status === "NEW" ? "New" : report?.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span>Registered Case Record</span>
                  <span>·</span>
                  <span className="font-mono">Report #{report?.customId || report?.custom_id}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body - 3 Comprehensive Horizontal Sections */}
          {report && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-muted/20 custom-scrollbar text-xs">

              {/* Section 1: Patient Demographics & Contact */}
              <div className="bg-card border border-border/80 rounded-2xl p-4.5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <User className="h-4 w-4 text-primary" />
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">
                    Patient Demographics & Contact
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</p>
                    <p className="font-bold text-foreground text-sm mt-0.5 truncate">{report.patient.name}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Patient PID</p>
                    <p className="font-mono font-bold text-primary text-sm mt-0.5 truncate">{report.patient.customId || report.patient.custom_id}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Age & Gender</p>
                    <p className="font-semibold text-foreground text-sm mt-0.5">{report.patient.age} Years / {report.patient.gender}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Phone</p>
                    <p className="font-mono font-bold text-foreground text-sm mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{report.patient.phone || "—"}</span>
                    </p>
                  </div>

                  {report.patient.email && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</p>
                      <p className="font-medium text-foreground text-xs mt-0.5 flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-primary" />
                        <span>{report.patient.email}</span>
                      </p>
                    </div>
                  )}

                  <div className={`p-2.5 rounded-xl bg-muted/40 border border-border/60 ${report.patient.email ? "sm:col-span-2" : "sm:col-span-4"}`}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Residential Address</p>
                    <p className="font-medium text-foreground text-xs mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      <span>
                        {[
                          report.patient.address,
                          report.patient.city,
                          report.patient.state,
                          report.patient.pincode ? `PIN: ${report.patient.pincode}` : null
                        ].filter(Boolean).join(", ") || "Address not specified"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Clinical Referral & Identification */}
              <div className="bg-card border border-border/80 rounded-2xl p-4.5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">
                    Clinical Referral & Identification
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Referred By (Doctor)</p>
                    <p className="font-bold text-foreground text-xs mt-0.5 truncate">
                      {displayReferredBy}
                    </p>
                  </div>

                  {report.patient.secondReferral && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Second Referral</p>
                      <p className="font-semibold text-foreground text-xs mt-0.5 truncate">{report.patient.secondReferral}</p>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aadhaar / National ID</p>
                    <p className="font-mono font-semibold text-foreground text-xs mt-0.5">
                      {report.patient.aadhaarNo || report.patient.aadhaar_no || "—"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Insurance / TPA Policy</p>
                    <p className="font-mono font-semibold text-foreground text-xs mt-0.5">
                      {report.patient.insuranceNo || report.patient.insurance_no || "—"}
                    </p>
                  </div>

                  {report.patient.hfrId && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">HFR / ABHA Health ID</p>
                      <p className="font-mono font-semibold text-foreground text-xs mt-0.5">{report.patient.hfrId}</p>
                    </div>
                  )}

                  {report.patient.corporateName && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Corporate / Client</p>
                      <p className="font-semibold text-foreground text-xs mt-0.5">{report.patient.corporateName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Diagnostic Order, Billing & Sample Logistics */}
              <div className="bg-card border border-border/80 rounded-2xl p-4.5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">
                    Order, Billing & Sample Logistics
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Report Case ID</p>
                    <p className="font-mono font-bold text-primary text-xs mt-0.5 truncate">{report.customId || report.custom_id}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoice / Bill ID</p>
                    <p className="font-mono font-bold text-foreground text-xs mt-0.5 truncate">{report.bill?.customId || report.bill?.custom_id || "—"}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bill Amount & Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-foreground text-xs">
                        ₹{Number(report.bill?.total || 0).toFixed(2)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${report.bill?.status === "PAID"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : report.bill?.status === "PARTIAL"
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-rose-500/15 text-rose-600"
                        }`}>
                        {report.bill?.status || "UNPAID"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registration Date</p>
                    <p className="font-mono text-xs font-semibold text-foreground mt-0.5">
                      {displayRegDate}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collection Date</p>
                    <p className="font-mono text-xs font-semibold text-foreground mt-0.5">
                      {displayCollDate}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collection Center</p>
                    <p className="font-semibold text-foreground text-xs mt-0.5 flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span>{report.patient.collectedAt || report.patient.collected_at || "Main Laboratory"}</span>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sample Collected By</p>
                    <p className="font-semibold text-foreground text-xs mt-0.5 flex items-center gap-1.5 truncate">
                      <FlaskConical className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{report.patient.collectedBy || report.patient.collected_by || "Self / Lab Phlebotomist"}</span>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/80 bg-card shrink-0">
            <div className="text-[11px] text-muted-foreground">
              Official Diagnostic Case Record · <strong className="text-foreground">{report?.patient.name}</strong>
            </div>
            <Button
              type="button"
              onClick={() => setIsPatientDetailsOpen(false)}
              className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-xl shadow-sm cursor-pointer hover:-translate-y-px transition-all"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Add Test Modal (Horizontal Landscape) */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-5xl w-[95vw] sm:max-w-5xl max-h-[92vh] h-[88vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border border-border/80 bg-card shadow-2xl">
          <DialogTitle className="sr-only">Select Tests to Add</DialogTitle>

          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">Select Investigation Tests</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select and append clinical investigations to report <strong className="text-foreground font-mono">{report?.customId}</strong>
                </p>
              </div>
            </div>

            {selectedTests.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                {selectedTests.length} Selected
              </span>
            )}
          </div>

          <div className="p-4 border-b border-border/80 shrink-0 space-y-3 bg-card">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/90 rounded-lg text-xs placeholder:text-muted-foreground/60 focus:border-primary outline-none text-foreground font-medium"
                placeholder="Search by test name, profile, or category…"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
              />
              {testSearch && (
                <button
                  type="button"
                  onClick={() => setTestSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {loadingAvailableTests && availableTests.length === 0 ? (
                <div className="flex items-center gap-2 animate-pulse py-0.5">
                  <div className="h-6 w-28 bg-muted rounded-full" />
                  <div className="h-6 w-24 bg-muted rounded-full" />
                  <div className="h-6 w-32 bg-muted rounded-full" />
                  <div className="h-6 w-24 bg-muted rounded-full" />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("ALL")}
                    className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 cursor-pointer ${activeCategory === "ALL"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    All Categories ({availableTests.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 cursor-pointer ${activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {cat} ({(groupedTests[cat] || []).length})
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-background custom-scrollbar">
            {loadingAvailableTests && availableTests.length === 0 ? (
              <div className="space-y-6 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 bg-muted rounded" />
                  <div className="h-px flex-1 bg-border/80" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="h-4 w-4 rounded bg-muted shrink-0" />
                          <div className="h-3.5 w-3/4 bg-muted rounded" />
                        </div>
                        <div className="h-3.5 w-10 bg-muted rounded shrink-0" />
                      </div>
                      <div className="h-2.5 w-1/2 bg-muted/60 rounded ml-6" />
                    </div>
                  ))}
                </div>
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <FlaskConical className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-xs font-bold text-foreground">No available investigations match your filter.</p>
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
                            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${selected
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
                                <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {paramCount > 0 ? `${paramCount} Parameters Included` : `Ref ${test.refRangeMin ?? "N/A"}–${test.refRangeMax ?? "N/A"}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground shrink-0">₹{Number(test.price || 0).toFixed(0)}</span>
                              {test.subTests && test.subTests.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTests(prev => ({ ...prev, [test.id]: !prev[test.id] }));
                                  }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
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
                                    onClick={() => { if (!selected) handleToggleTest(sub.id); }}
                                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer ${subSelected ? "bg-accent/50 border-primary/30" : "bg-card border-transparent hover:border-border"
                                      } ${selected ? "opacity-60 cursor-not-allowed" : ""}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={subSelected}
                                        disabled={selected}
                                        onCheckedChange={() => { if (!selected) handleToggleTest(sub.id); }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="font-medium text-foreground">{sub.name}</span>
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

          <div className="border-t border-border/80 px-6 py-4 shrink-0 bg-muted/50 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {selectedTests.length} Tests Selected to Append
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddSelectedTests}
                disabled={selectedTests.length === 0 || modifyingTest}
                className="gradient-primary text-primary-foreground font-bold text-xs px-6 cursor-pointer"
              >
                {modifyingTest ? "Adding Tests..." : `Add Selected (${selectedTests.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Edit Reference Range Dialog */}
      <Dialog open={isRangeModalOpen} onOpenChange={setIsRangeModalOpen}>
        <DialogContent className="max-w-lg w-full rounded-2xl bg-card p-6 space-y-5 border border-border/80 shadow-2xl" hideClose>
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Edit Reference Range
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Parameter: <strong className="text-primary font-semibold">{editingRangeTest?.name}</strong>
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRangeModalOpen(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted transition-colors cursor-pointer border border-border/70 shadow-xs"
              title="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveRange} className="space-y-4 text-xs">
            {/* Range Format Selector: Numeric vs Custom/Text */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/70">
              <button
                type="button"
                onClick={() => setRangeMode("numeric")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${rangeMode === "numeric"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
              >
                <span>123</span>
                <span>Numeric (Min – Max)</span>
              </button>
              <button
                type="button"
                onClick={() => setRangeMode("TEXT")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${rangeMode === "TEXT"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Custom / Text Range</span>
              </button>
            </div>

            {/* If Custom Text Range */}
            {rangeMode === "TEXT" ? (
              <div className="space-y-3 p-3.5 bg-muted/30 rounded-xl border border-border/70">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Custom Reference Range (Text / Qualitative)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Negative, Non-Reactive, 0 - 5 /HPF, Normal, < 1.0 Index"
                    value={rangeText}
                    onChange={(e) => setRangeText(e.target.value)}
                    className="h-10 text-sm font-medium bg-background border-border/90"
                  />
                </div>

                {/* Quick Suggest Chips */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Quick Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Negative", "Non-Reactive", "Normal", "Absent", "Nil", "Clear", "0 – 5 /HPF", "< 1.0 Index", "Not Detected"].map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => setRangeText(sugg)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${rangeText === sugg
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border/80 text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                          }`}
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Gender Specification Mode */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                    Reference Range Type
                  </label>
                  <Select value={rangeGenderType} onValueChange={setRangeGenderType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOTH">Universal (Same for all)</SelectItem>
                      <SelectItem value="BY_GENDER">Gender Specific (Male / Female)</SelectItem>
                      <SelectItem value="CHILDREN">Children Specific</SelectItem>
                      <SelectItem value="NEWBORN">Newborn Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* If Gender Specific */}
                {rangeGenderType === "BY_GENDER" || rangeGenderType === "GENDER_SPECIFIC" ? (
                  <div className="space-y-3 p-3.5 bg-muted/40 rounded-xl border border-border/70">
                    {/* Male Ranges */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Male Reference Range</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Min (Male)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 13"
                            value={rangeMinMale}
                            onChange={(e) => setRangeMinMale(e.target.value)}
                            className="w-full px-3 py-1.5 h-9 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Max (Male)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 17"
                            value={rangeMaxMale}
                            onChange={(e) => setRangeMaxMale(e.target.value)}
                            className="w-full px-3 py-1.5 h-9 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Female Ranges */}
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">Female Reference Range</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Min (Female)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 12"
                            value={rangeMinFemale}
                            onChange={(e) => setRangeMinFemale(e.target.value)}
                            className="w-full px-3 py-1.5 h-9 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Max (Female)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g. 15"
                            value={rangeMaxFemale}
                            onChange={(e) => setRangeMaxFemale(e.target.value)}
                            className="w-full px-3 py-1.5 h-9 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Universal Min/Max */
                  <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Min Normal Value</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Min"
                        value={rangeMin}
                        onChange={(e) => setRangeMin(e.target.value)}
                        className="w-full px-3 py-1.5 h-9 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:border-primary mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Max Normal Value</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Max"
                        value={rangeMax}
                        onChange={(e) => setRangeMax(e.target.value)}
                        className="w-full px-3 py-1.5 h-9 bg-background border border-border rounded-lg text-xs font-mono font-bold outline-none focus:border-primary mt-1"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Measurement Unit: Searchable Dropdown + Custom Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Measurement Unit</span>
                <span className="text-[10px] text-muted-foreground font-normal">Select or type custom unit</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  list="edit-common-units-list"
                  type="text"
                  placeholder="Select from dropdown or enter unit..."
                  value={rangeUnit}
                  onChange={(e) => setRangeUnit(e.target.value)}
                  className="h-10 text-sm font-mono font-bold bg-background border-border/90 flex-1"
                />
                <datalist id="edit-common-units-list">
                  {Object.entries(CATEGORIZED_UNITS).map(([category, units]) =>
                    units.map((u) => (
                      <option key={`${category}-${u}`} value={u}>
                        {category}
                      </option>
                    ))
                  )}
                </datalist>

                <Select value={rangeUnit} onValueChange={(val) => setRangeUnit(val)}>
                  <SelectTrigger className="h-10 w-36 text-xs font-mono font-semibold shrink-0">
                    <SelectValue placeholder="Preset Units" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(CATEGORIZED_UNITS).map(([cat, units]) => (
                      <React.Fragment key={cat}>
                        <div className="px-2 py-1 text-[10px] font-bold text-primary uppercase tracking-wider bg-muted/40">
                          {cat}
                        </div>
                        {units.map((u) => (
                          <SelectItem key={`${cat}-${u}`} value={u} className="text-xs font-mono">
                            {u}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsRangeModalOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={savingRange} className="gradient-primary text-primary-foreground font-bold px-6 cursor-pointer shadow-sm">
                {savingRange ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Range Permanently
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Machine Integration / Auto-Communication Modal */}
      <Dialog open={isMachineModalOpen} onOpenChange={setIsMachineModalOpen}>
        <DialogContent hideClose={true} className="max-w-5xl w-[95vw] md:w-[90vw] bg-card border border-border/90 rounded-2xl p-5 sm:p-7 shadow-2xl overflow-hidden">
          <DialogHeader className="space-y-2 border-b border-border/70 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="font-display font-bold text-base text-foreground">
                      Direct Machine Analyzer Readings
                    </DialogTitle>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Sync Ready
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Select any live test run from your connected analyzer to auto-populate parameters directly into this report.
                  </DialogDescription>
                </div>
              </div>

              {/* Header Actions: Responsive Refresh + Clean Close */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchMachineResults}
                  disabled={loadingMachineResults}
                  className="h-9 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer bg-card hover:bg-muted border-border shadow-xs active:scale-98 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingMachineResults ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                  <span>Refresh</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsMachineModalOpen(false)}
                  className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-98"
                  title="Close Dialog"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Results List: Horizontally Wide Cards with Full Parameters Grid */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 py-2">
            {loadingMachineResults ? (
              <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-medium">Fetching analyzer data stream...</span>
              </div>
            ) : machineResults.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">No recent machine runs found in queue</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Run a sample on your connected cell counter and click Refresh above.
                  </p>
                </div>
              </div>
            ) : (
              machineResults.map((run: any) => {
                const paramEntries = Object.entries(run.parsed_parameters || {});
                const paramKeys = Object.keys(run.parsed_parameters || {});
                const isExactMatch =
                  (report?.customId && run.sample_id && String(run.sample_id).toLowerCase().includes(String(report.customId).toLowerCase())) ||
                  (((report?.patient as any)?.vialBarcode || (report?.patient as any)?.vial_barcode) && run.barcode && String(run.barcode).includes(String((report?.patient as any)?.vialBarcode || (report?.patient as any)?.vial_barcode))) ||
                  (report?.patient?.customId && run.sample_id && String(run.sample_id).includes(String(report.patient.customId)));

                return (
                  <div
                    key={run.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isExactMatch
                        ? "bg-primary/5 border-primary/40 shadow-xs"
                        : "bg-card border-border/80 hover:border-border hover:shadow-xs"
                    }`}
                  >
                    {/* Top Row: Sample ID, Instrument Info, Timestamp, Match Badge & Auto-fill Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-foreground bg-muted/80 border border-border px-3 py-1 rounded-xl shadow-2xs">
                          Sample #{run.sample_id || "Unlabeled"}
                        </span>
                        {isExactMatch && (
                          <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
                            🎯 MATCHES THIS REPORT
                          </span>
                        )}
                        <span className="text-xs font-semibold text-foreground">
                          {run.instrument_name || "Hematology Analyzer"}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          • Tested: {new Date(run.tested_at || run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => applyMachineRunToReport(run)}
                        className="h-9 px-4 text-xs font-bold gap-2 gradient-primary text-primary-foreground shadow-xs cursor-pointer hover:brightness-105 active:scale-98 shrink-0 self-start sm:self-auto"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        <span>Auto-fill into Report ({paramKeys.length} params)</span>
                      </Button>
                    </div>

                    {/* Parameter Grid: Wide Horizontal Display of Every Single Parameter */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mt-3 pt-1">
                      {paramEntries.map(([k, p]: [string, any]) => {
                        let val = typeof p === "object" && p !== null ? p.value : p;
                        let unit = typeof p === "object" && p !== null ? p.unit : "";
                        if (k === "WBC" && parseFloat(val) > 0 && parseFloat(val) < 100) {
                          val = String(Math.round(parseFloat(val) * 1000));
                          unit = "/cumm";
                        }
                        return (
                          <div
                            key={k}
                            className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between hover:bg-muted/70 transition-colors"
                          >
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                              {k}
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-sm font-mono font-extrabold text-foreground">
                                {val}
                              </span>
                              {unit && (
                                <span className="text-[9px] text-muted-foreground truncate font-sans">
                                  {unit}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Fullscreen Print & Report Preview Modal (3-Column Layout) */}
      <FullscreenPrintReportModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        report={activePackageName && report ? { ...report, packageName: activePackageName } : report}
        enteredValues={values}
        abnormalOverrides={abnormalOverrides}
        paramRemarks={paramRemarks}
        testNotes={testNotes}
        printedInterpretations={printedInterpretations}
      />

    </div>
  );
}

class ReportErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Report Edit caught client-side exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Error Loading Report Results</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            A temporary issue occurred while rendering the test parameters. Your previous inputs have been saved safely.
          </p>
          {this.state.error && process.env.NODE_ENV !== "production" && (
            <div className="mt-2 p-3 bg-red-50 text-red-800 rounded text-xs max-w-lg overflow-auto text-left font-mono border border-red-200">
              {this.state.error.message}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              Reload Page
            </button>
            <a
              href="/dashboard/reports"
              className="px-4 py-2 border border-border bg-card text-foreground font-semibold rounded-lg text-sm hover:bg-muted transition-all"
            >
              Back to Reports
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ResultEntryPage() {
  return (
    <ReportErrorBoundary>
      <ResultEntryContent />
    </ReportErrorBoundary>
  );
}

