"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getCleanLetterheadUrl, getStoredUser } from "@/lib/api-client";
import {
  FlaskConical, ArrowLeft, Loader2, CheckCircle2, AlertTriangle,
  User, AlertCircle, TrendingUp, History, ExternalLink, ClipboardList, Plus, Trash2,
  Search, ChevronDown, ChevronRight, FileText, Eye, Edit, Pencil, Building2, Phone, Calendar, Receipt, Printer,
  MessageSquare, FileEdit, Sparkles, CheckCheck, Calculator, Zap, X, Check, Save,
  Shield, Mail, MapPin, Stethoscope, BadgeCheck, CreditCard, Clock, Hash, Activity, Boxes,
  Cpu, Radio, RefreshCw, HardDrive
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TipTapEditor } from "@/components/tiptap-editor";
import { FullscreenPrintReportModal } from "@/components/fullscreen-print-report-modal";
import { getClinicalInterpretation } from "@/lib/clinical-interpretations";
import { getReportPackage } from "@/lib/packages";

// Clinical Categorized Predefined Units
const CATEGORIZED_UNITS: Record<string, string[]> = {
  "Hematology": ["g/dL", "cells/cumm", "/cumm", "10^3/µL", "10^6/µL", "mill/µL", "fl", "pg", "%", "mm/hr", "Seconds", "Ratio", "INR"],
  "Biochemistry": ["mg/dL", "g/dL", "U/L", "IU/L", "mmol/L", "µmol/L", "mEq/L", "ng/mL", "µg/dL", "mg/24h", "mL/min", "g/24h"],
  "Immunology & Hormones": ["µIU/mL", "mIU/mL", "pmol/L", "nmol/L", "ng/dL", "pg/mL", "copies/mL", "Index", "S/CO", "AU/mL", "BAU/mL"],
  "Urine & Microscopy": ["/HPF", "/LPF", "Epithelial Cells/HPF", "Pus Cells/HPF", "RBCs/HPF", "Casts/LPF", "Crystals/HPF"],
  "General / Others": ["%", "Ratio", "Index", "Sec", "Min", "Hours", "mg/L", "µg/mL", "Negative/Positive"]
};

interface Test {
  id: string;
  name: string;
  testCode?: string;
  test_code?: string;
  category?: string;
  price?: number;
  unit?: string | null;
  interpretation?: string | null;
  fieldType?: string;
  field_type?: string;
  genderRefType?: string;
  gender_ref_type?: string;
  refRangeMin?: number | null;
  ref_range_min?: number | null;
  refRangeMax?: number | null;
  ref_range_max?: number | null;
  refRangeMinMale?: number | null;
  ref_range_min_male?: number | null;
  refRangeMaxMale?: number | null;
  ref_range_max_male?: number | null;
  refRangeMinFemale?: number | null;
  ref_range_min_female?: number | null;
  refRangeMaxFemale?: number | null;
  ref_range_max_female?: number | null;
  refRangeMinChild?: number | null;
  ref_range_min_child?: number | null;
  refRangeMaxChild?: number | null;
  ref_range_max_child?: number | null;
  refRangeMinNewborn?: number | null;
  ref_range_min_newborn?: number | null;
  refRangeMaxNewborn?: number | null;
  ref_range_max_newborn?: number | null;
  valueType?: string;
  value_type?: string;
  rangeType?: string | null;
  range_type?: string | null;
  textRefRange?: string | null;
  text_ref_range?: string | null;
  customOptions?: string | null;
  custom_options?: string | null;
  sortOrder?: number;
  sort_order?: number;
  subTests?: Test[];
  sub_tests?: Test[];
  parent?: any;
}
interface ReportTest {
  id: string;
  resultValue: string | null;
  result_value?: string | null;
  isAbnormal: boolean;
  is_abnormal?: boolean;
  remarks?: string | null;
  test: Test;
}
interface Report {
  id: string;
  customId: string;
  custom_id?: string;
  status: string;
  createdAt: string;
  created_at?: string;
  patientId: string;
  patient_id?: string;
  packageName?: string | null;
  package_name?: string | null;
  patient: {
    id?: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    email?: string;
    refDoctor?: string;
    ref_doctor?: string;
    secondReferral?: string;
    second_referral?: string;
    customId: string;
    custom_id?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    aadhaarNo?: string;
    aadhaar_no?: string;
    insuranceNo?: string;
    insurance_no?: string;
    hfrId?: string;
    hfr_id?: string;
    corporateName?: string;
    corporate_name?: string;
    collectedAt?: string;
    collected_at?: string;
    collectedBy?: string;
    collected_by?: string;
    created_at?: string;
    createdAt?: string;
    abhaNumber?: string;
    abha_number?: string;
    abhaAddress?: string;
    abha_address?: string;
    isAbhaVerified?: boolean;
    is_abha_verified?: boolean;
  };
  bill?: {
    id?: string;
    customId?: string;
    custom_id?: string;
    total?: number;
    discount?: number;
    paidAmount?: number;
    paid_amount?: number;
    status?: string;
    paymentMode?: string;
    payment_mode?: string;
  };
  results: ReportTest[];
  testNotes?: Record<string, { notes?: string; remarks?: string; advices?: string }> | string | null;
  test_notes?: Record<string, { notes?: string; remarks?: string; advices?: string }> | string | null;
  lab?: any;
  abdmStatus?: string;
  abdm_status?: string;
  abdmCareContextId?: string;
  abdm_care_context_id?: string;
  abdmSyncedAt?: string;
  abdm_synced_at?: string;
  abdmError?: string;
  abdm_error?: string;
}

interface CalculationResult {
  calculatedValues: Record<string, string>;
  calculatedIds: Set<string>;
}

function getTestPriority(mainTestName: string, category?: string): number {
  const name = (mainTestName || "").trim().toLowerCase();
  const cat = (category || "").trim().toLowerCase();

  // 1. CBC Top Priority
  if (name.includes("complete blood count") || name.includes("cbc") || name.includes("hemogram") || name.includes("haemogram")) {
    return 10;
  }

  // 2. ESR
  if (name.includes("erythrocyte sedimentation rate") || name.includes("esr")) {
    return 20;
  }

  // 3. Other Haematology / Hematology
  if (cat.includes("haemat") || cat.includes("hemat") || name.includes("blood group") || name.includes("coagulation") || name.includes("pt/inr") || name.includes("prothrombin") || name.includes("smear") || name.includes("platelet") || name.includes("bleeding time") || name.includes("clotting time")) {
    return 30;
  }

  // 4. Biochemistry (LFT, KFT, Lipids, Sugar, HbA1c, Electrolytes, Calcium, etc.)
  if (cat.includes("bio") || cat.includes("chem") || name.includes("liver") || name.includes("lft") || name.includes("kidney") || name.includes("kft") || name.includes("renal") || name.includes("rft") || name.includes("lipid") || name.includes("glucose") || name.includes("sugar") || name.includes("hba1c") || name.includes("electrolyte") || name.includes("calcium") || name.includes("cardiac") || name.includes("amylase") || name.includes("lipase") || name.includes("iron profile") || name.includes("iron studies")) {
    return 40;
  }

  // 5. Serology & Immunology & Hormones
  if (cat.includes("serol") || cat.includes("immun") || cat.includes("hormone") || cat.includes("endocrin") || name.includes("widal") || name.includes("dengue") || name.includes("typhoid") || name.includes("hiv") || name.includes("hbsag") || name.includes("hcv") || name.includes("vdrl") || name.includes("crp") || name.includes("ra factor") || name.includes("thyroid") || name.includes("tft") || name.includes("vitamin")) {
    return 50;
  }

  // 6. Microbiology / Clinical Pathology / Urine / Semen / Stool
  if (cat.includes("micro") || cat.includes("path") || cat.includes("urine") || cat.includes("semen") || cat.includes("stool") || name.includes("urine") || name.includes("semen") || name.includes("stool") || name.includes("culture") || name.includes("sputum") || name.includes("swab")) {
    return 60;
  }

  // 7. General / Others
  return 70;
}

function hasReportParam(patterns: (string | RegExp)[], report: Report | null, excludeId?: string): boolean {
  if (!report || !report.results || !Array.isArray(report.results)) return false;
  return report.results.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    const name = (r.test?.name || "").trim().toLowerCase();
    const code = (r.test?.testCode || (r.test as any)?.test_code || "").trim().toUpperCase();
    return patterns.some((pat) => {
      if (typeof pat === "string") {
        return name === pat.toLowerCase() || code === pat.toUpperCase() || name.includes(pat.toLowerCase());
      } else if (pat instanceof RegExp) {
        return pat.test(name) || pat.test(code);
      }
      return false;
    });
  });
}

function canParamBeCalculatedInReport(test: Test, report: Report | null, currentResultId?: string): boolean {
  if (!test || !report) return false;
  const name = (test?.name || "").trim().toLowerCase();
  const code = (test?.testCode || (test as any)?.test_code || "").trim().toUpperCase();

  // EXCLUDE Calcium, minerals and electrolytes from auto calculation
  if (name.includes("calcium") || code.includes("CALCIUM") || code.includes("CALC")) return false;
  if (name.includes("phosphorus") || code.includes("PHOS")) return false;
  if (name.includes("uric acid") || code.includes("URIC")) return false;
  if (name.includes("sodium") || code.includes("SODIUM") || name.includes("potassium") || code.includes("POTASSIUM") || name.includes("chloride") || code.includes("CHLORIDE")) return false;

  // CBC Absolute counts (AEC, ANC, ALC, AMC, ABC) - require TLC AND respective differential parameter in report
  const hasTlc = hasReportParam([/\btlc\b|\bwbc\b|total leucocyte|total leukocyte/i, "CBC_TLC", "CBC_WBC", "HAEM_TLC"], report, currentResultId);
  if (/\baec\b|absolute eosinophil/i.test(name) || /(^|_|-)AEC($|_|-)/.test(code)) {
    const hasEosino = hasReportParam([/\beosinophil/i, "CBC_EOSINOPHILS", "HAEM_EOSINOPHILS"], report, currentResultId);
    return hasTlc && hasEosino;
  }
  if (/\banc\b|absolute neutrophil/i.test(name) || /(^|_|-)ANC($|_|-)/.test(code)) {
    const hasNeutro = hasReportParam([/\bneutrophil/i, "CBC_NEUTROPHILS", "HAEM_NEUTROPHILS"], report, currentResultId);
    return hasTlc && hasNeutro;
  }
  if (/\balc\b|absolute lymphocyte/i.test(name) || /(^|_|-)ALC($|_|-)/.test(code)) {
    const hasLympho = hasReportParam([/\blymphocyte/i, "CBC_LYMPHOCYTES", "HAEM_LYMPHOCYTES"], report, currentResultId);
    return hasTlc && hasLympho;
  }
  if (/\bamc\b|absolute monocyte/i.test(name) || /(^|_|-)AMC($|_|-)/.test(code)) {
    const hasMono = hasReportParam([/\bmonocyte/i, "CBC_MONOCYTES", "HAEM_MONOCYTES"], report, currentResultId);
    return hasTlc && hasMono;
  }
  if (/\babc\b|absolute basophil/i.test(name) || /(^|_|-)ABC($|_|-)/.test(code)) {
    const hasBaso = hasReportParam([/\bbasophil/i, "CBC_BASOPHILS", "HAEM_BASOPHILS"], report, currentResultId);
    return hasTlc && hasBaso;
  }

  // NLR - requires Neutrophil AND Lymphocyte in report
  if (/\bnlr\b|neutrophil.*lymphocyte.*ratio/i.test(name) || /(^|_|-)NLR($|_|-)/.test(code)) {
    const hasNeutro = hasReportParam([/\bneutrophil/i, "CBC_NEUTROPHILS", "HAEM_NEUTROPHILS"], report, currentResultId);
    const hasLympho = hasReportParam([/\blymphocyte/i, "CBC_LYMPHOCYTES", "HAEM_LYMPHOCYTES"], report, currentResultId);
    return hasNeutro && hasLympho;
  }

  // MCV, MCH, MCHC - require RBC AND (PCV or Hb)
  const hasRbc = hasReportParam([/\brbc\b|red blood|erythrocyte/i, "CBC_RBC", "HAEM_RBC"], report, currentResultId);
  const hasHb = hasReportParam([/\bhb\b|h[ae]moglobin/i, "CBC_HB", "HAEM_HB"], report, currentResultId);
  const hasPcv = hasReportParam([/\bpcv\b|\bhct\b|packed cell|h[ae]matocrit/i, "CBC_PCV", "CBC_HCT", "HAEM_HCT"], report, currentResultId);

  if (/\bmcv\b|mean corpuscular volume|mean cell volume/i.test(name) || /(^|_|-)MCV($|_|-)/.test(code)) {
    return hasRbc && (hasPcv || hasHb);
  }
  if (/\bmch\b|mean corpuscular h[ae]moglobin|mean cell h[ae]moglobin/i.test(name) || (/(^|_|-)MCH($|_|-)/.test(code) && !code.includes("MCHC"))) {
    return hasRbc && hasHb;
  }
  if (/\bmchc\b|mean corpuscular h[ae]moglobin conc|mean cell h[ae]moglobin con|m\.c\.h\.c/i.test(name) || /(^|_|-)MCHC($|_|-)/.test(code)) {
    return (hasHb && hasPcv) || (hasRbc && hasHb);
  }

  // LFT
  if (/\bindirect bilirubin\b|\bbilirubin indirect\b|\bunconjugated\b/i.test(name) || /(^|_|-)IBILI($|_|-)/.test(code)) {
    const hasTbili = hasReportParam([/\btotal bilirubin\b|\bbilirubin total\b|\bt\.?bili\b/i, "LFT_TBILI", "BIO_TBILI"], report, currentResultId);
    const hasDbili = hasReportParam([/\bdirect bilirubin\b|\bbilirubin direct\b|\bd\.?bili\b/i, "LFT_DBILI", "BIO_DBILI"], report, currentResultId);
    return hasTbili && hasDbili;
  }
  if (/\bglobulin\b/i.test(name) || /(^|_|-)GLOBULIN($|_|-)/.test(code)) {
    const hasTprot = hasReportParam([/\btotal protein\b|\bprotein total\b|\bt\.?prot\b/i, "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN"], report, currentResultId);
    const hasAlb = hasReportParam([/\balbumin\b/i, "LFT_ALBUMIN", "BIO_ALBUMIN"], report, currentResultId);
    return hasTprot && hasAlb;
  }
  if (/\ba\s*:\s*g\b|\ba\s*\/\s*g\b|albumin.*globulin.*ratio/i.test(name) || /(^|_|-)AG_RATIO($|_|-)/.test(code)) {
    const hasAlb = hasReportParam([/\balbumin\b/i, "LFT_ALBUMIN", "BIO_ALBUMIN"], report, currentResultId);
    const hasTprot = hasReportParam([/\btotal protein\b|\bprotein total\b|\bt\.?prot\b/i, "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN"], report, currentResultId);
    const hasGlob = hasReportParam([/\bglobulin\b/i, "LFT_GLOBULIN", "BIO_GLOBULIN"], report, currentResultId);
    return hasAlb && (hasGlob || hasTprot);
  }
  if (/\bsgot\s*\/\s*sgpt\b|\bast\s*\/\s*alt\b|de ritis/i.test(name) || /(^|_|-)AST_ALT($|_|-)/.test(code)) {
    const hasSgot = hasReportParam([/\bsgot\b|\bast\b|aspartate/i, "LFT_SGOT", "BIO_SGOT"], report, currentResultId);
    const hasSgpt = hasReportParam([/\bsgpt\b|\balt\b|alanine/i, "LFT_SGPT", "BIO_SGPT"], report, currentResultId);
    return hasSgot && hasSgpt;
  }

  // KFT
  const hasUrea = hasReportParam([/\bblood urea\b|\burea\b/i, "KFT_UREA", "BIO_UREA"], report, currentResultId);
  const hasCreat = hasReportParam([/\bserum creatinine\b|\bcreatinine\b/i, "KFT_CREAT", "BIO_CREAT"], report, currentResultId);

  if (/\bblood urea nitrogen\b|\bbun\b/i.test(name) || (/(^|_|-)BUN($|_|-)/.test(code) && !code.includes("CREAT"))) {
    return hasUrea;
  }
  if (/\bbun\s*\/\s*creatinine\b|\bbun.*creat.*ratio/i.test(name) || /(^|_|-)BUN_CREAT($|_|-)/.test(code)) {
    return (hasUrea || hasReportParam([/\bbun\b/i, "KFT_BUN"], report, currentResultId)) && hasCreat;
  }
  if (/\begfr\b|estimated gfr/i.test(name) || /(^|_|-)EGFR($|_|-)/.test(code)) {
    return hasCreat;
  }
  if (/\bgfr category\b|\bgfr stage\b|kdigo.*gfr/i.test(name) || /(^|_|-)GFR_STAGE($|_|-)/.test(code)) {
    return hasCreat;
  }

  // Lipid
  const hasTchol = hasReportParam([/\btotal cholesterol\b|\bcholesterol total\b|\bcholesterol\b/i, "LIPID_TOTAL_CHOL", "BIO_TOTAL_CHOL"], report, currentResultId);
  const hasTg = hasReportParam([/\btriglycerides\b|\btriglyceride\b|\btg\b/i, "LIPID_TRIGLYCERIDES", "BIO_TRIGLYCERIDES"], report, currentResultId);
  const hasHdl = hasReportParam([/\bhdl cholesterol\b|\bhdl\b/i, "LIPID_HDL", "BIO_HDL"], report, currentResultId);

  if (/\bvldl cholesterol\b|\bvldl\b/i.test(name) || /(^|_|-)VLDL($|_|-)/.test(code)) {
    return hasTg;
  }
  if (/\bldl cholesterol\b|\bldl\b/i.test(name) || (/(^|_|-)LDL($|_|-)/.test(code) && !code.includes("HDL"))) {
    return hasTchol && hasHdl;
  }
  if (/\bnon-hdl cholesterol\b|\bnon hdl\b/i.test(name) || /(^|_|-)NON_HDL($|_|-)/.test(code)) {
    return hasTchol && hasHdl;
  }
  if (/\btotal chol.*hdl ratio\b|\btc\s*\/\s*hdl\b|\bcholesterol\s*\/\s*hdl\b/i.test(name) || /(^|_|-)CHOL_HDL($|_|-)/.test(code)) {
    return hasTchol && hasHdl;
  }
  if (/\bldl\s*\/\s*hdl\b|\bldl.*hdl ratio\b/i.test(name) || /(^|_|-)LDL_HDL($|_|-)/.test(code)) {
    return hasHdl && (hasTchol || hasReportParam([/\bldl\b/i, "LIPID_LDL"], report, currentResultId));
  }

  // HbA1c
  if (/\bestimated average glucose\b|\beag\b/i.test(name) || /(^|_|-)EAG($|_|-)/.test(code)) {
    return hasReportParam([/\bglycated hemoglobin\b|\bglycosylated hemoglobin\b|\bhba1c\b/i, "HBA1C_VALUE", "BIO_HBA1C"], report, currentResultId);
  }

  // Iron
  if (/\bunsaturated iron binding capacity\b|\buibc\b/i.test(name) || /(^|_|-)UIBC($|_|-)/.test(code)) {
    const hasIron = hasReportParam([/\bserum iron\b|\biron, serum\b|\biron\b/i, "IRON_SERUM"], report, currentResultId);
    const hasTibc = hasReportParam([/\btotal iron binding capacity\b|\btibc\b/i, "IRON_TIBC"], report, currentResultId);
    return hasIron && hasTibc;
  }
  if (/\btransferrin saturation\b|\biron saturation\b/i.test(name) || /(^|_|-)SATURATION($|_|-)/.test(code)) {
    const hasIron = hasReportParam([/\bserum iron\b|\biron, serum\b|\biron\b/i, "IRON_SERUM"], report, currentResultId);
    const hasTibc = hasReportParam([/\btotal iron binding capacity\b|\btibc\b/i, "IRON_TIBC"], report, currentResultId);
    return hasIron && hasTibc;
  }

  // Semen
  if (/total sperm count per ejaculate/i.test(name) || /(^|_|-)EJACULATE($|_|-)/.test(code)) {
    const hasSemVol = hasReportParam([/\bvolume\b|\bquantity\b/i, "SEMEN_VOLUME"], report, currentResultId);
    const hasSemCount = hasReportParam([/\btotal sperm count\b|\bsperm concentration/i, "SEMEN_TOTAL_COUNT"], report, currentResultId);
    return hasSemVol && hasSemCount;
  }
  if (/total motile|total motility/i.test(name) || /(^|_|-)TOTAL_MOTILITY($|_|-)/.test(code)) {
    const hasSemProg = hasReportParam([/\bprogressive motile\b|motility \(progressive\)/i, "SEMEN_PROG_MOTILE"], report, currentResultId);
    const hasSemNonProg = hasReportParam([/\bnon-progressive\b|\bnon progressive\b/i, "SEMEN_NON_PROG_MOTILE"], report, currentResultId);
    return hasSemProg && hasSemNonProg;
  }

  return false;
}

function isParamFormulaCalculated(test: Test): boolean {
  const name = (test?.name || "").trim().toLowerCase();
  const code = (test?.testCode || (test as any)?.test_code || "").trim().toUpperCase();

  // EXCLUDE Calcium, minerals and electrolytes from auto calculation
  if (name.includes("calcium") || code.includes("CALCIUM") || code.includes("CALC")) {
    return false;
  }
  if (name.includes("phosphorus") || code.includes("PHOS")) {
    return false;
  }
  if (name.includes("uric acid") || code.includes("URIC")) {
    return false;
  }
  if (name.includes("sodium") || code.includes("SODIUM") || name.includes("potassium") || code.includes("POTASSIUM") || name.includes("chloride") || code.includes("CHLORIDE")) {
    return false;
  }

  // CBC (MCV, MCH, MCHC, NLR, Absolute counts)
  if (/\bmcv\b|mean corpuscular volume|mean cell volume/i.test(name) || /(^|_|-)MCV($|_|-)/.test(code)) return true;
  if (/\bmch\b|mean corpuscular h[ae]moglobin|mean cell h[ae]moglobin/i.test(name) || (/(^|_|-)MCH($|_|-)/.test(code) && !code.includes("MCHC"))) return true;
  if (/\bmchc\b|mean corpuscular h[ae]moglobin conc|mean cell h[ae]moglobin con|m\.c\.h\.c/i.test(name) || /(^|_|-)MCHC($|_|-)/.test(code)) return true;
  if (/\bnlr\b|neutrophil.*lymphocyte.*ratio/i.test(name) || /(^|_|-)NLR($|_|-)/.test(code)) return true;
  if (/\banc\b|absolute neutrophil/i.test(name) || /(^|_|-)ANC($|_|-)/.test(code)) return true;
  if (/\balc\b|absolute lymphocyte/i.test(name) || /(^|_|-)ALC($|_|-)/.test(code)) return true;
  if (/\baec\b|absolute eosinophil/i.test(name) || /(^|_|-)AEC($|_|-)/.test(code)) return true;
  if (/\bamc\b|absolute monocyte/i.test(name) || /(^|_|-)AMC($|_|-)/.test(code)) return true;
  if (/\babc\b|absolute basophil/i.test(name) || /(^|_|-)ABC($|_|-)/.test(code)) return true;

  // LFT
  if (/\bindirect bilirubin\b|\bbilirubin indirect\b|\bunconjugated\b/i.test(name) || /(^|_|-)IBILI($|_|-)/.test(code)) return true;
  if (/\bglobulin\b/i.test(name) || /(^|_|-)GLOBULIN($|_|-)/.test(code)) return true;
  if (/\ba\s*:\s*g\b|\ba\s*\/\s*g\b|albumin.*globulin.*ratio/i.test(name) || /(^|_|-)AG_RATIO($|_|-)/.test(code)) return true;
  if (/\bsgot\s*\/\s*sgpt\b|\bast\s*\/\s*alt\b|de ritis/i.test(name) || /(^|_|-)AST_ALT($|_|-)/.test(code)) return true;

  // KFT
  if (/\bblood urea nitrogen\b|\bbun\b/i.test(name) || (/(^|_|-)BUN($|_|-)/.test(code) && !code.includes("CREAT"))) return true;
  if (/\bbun\s*\/\s*creatinine\b|\bbun.*creat.*ratio/i.test(name) || /(^|_|-)BUN_CREAT($|_|-)/.test(code)) return true;
  if (/\begfr\b|estimated gfr/i.test(name) || /(^|_|-)EGFR($|_|-)/.test(code)) return true;
  if (/\bgfr category\b|\bgfr stage\b|kdigo.*gfr/i.test(name) || /(^|_|-)GFR_STAGE($|_|-)/.test(code)) return true;

  // Lipid
  if (/\bvldl cholesterol\b|\bvldl\b/i.test(name) || /(^|_|-)VLDL($|_|-)/.test(code)) return true;
  if (/\bldl cholesterol\b|\bldl\b/i.test(name) || (/(^|_|-)LDL($|_|-)/.test(code) && !code.includes("HDL"))) return true;
  if (/\bnon-hdl cholesterol\b|\bnon hdl\b/i.test(name) || /(^|_|-)NON_HDL($|_|-)/.test(code)) return true;
  if (/\btotal chol.*hdl ratio\b|\btc\s*\/\s*hdl\b|\bcholesterol\s*\/\s*hdl\b/i.test(name) || /(^|_|-)CHOL_HDL($|_|-)/.test(code)) return true;
  if (/\bldl\s*\/\s*hdl\b|\bldl.*hdl ratio\b/i.test(name) || /(^|_|-)LDL_HDL($|_|-)/.test(code)) return true;

  // HbA1c
  if (/\bestimated average glucose\b|\beag\b/i.test(name) || /(^|_|-)EAG($|_|-)/.test(code)) return true;

  // Iron
  if (/\bunsaturated iron binding capacity\b|\buibc\b/i.test(name) || /(^|_|-)UIBC($|_|-)/.test(code)) return true;
  if (/\btransferrin saturation\b|\biron saturation\b/i.test(name) || /(^|_|-)SATURATION($|_|-)/.test(code)) return true;

  // Semen
  if (/total sperm count per ejaculate/i.test(name) || /(^|_|-)EJACULATE($|_|-)/.test(code)) return true;
  if (/total motile|total motility/i.test(name) || /(^|_|-)TOTAL_MOTILITY($|_|-)/.test(code)) return true;

  return false;
}

function computeAutomatedFormulas(
  currentValues: Record<string, string>,
  report: Report | null
): CalculationResult {
  const calculatedValues: Record<string, string> = {};
  const calculatedIds = new Set<string>();

  if (!report || !report.results || !Array.isArray(report.results)) {
    return { calculatedValues, calculatedIds };
  }

  // Helper to find parameter by regex or code
  const findParam = (patterns: (string | RegExp)[]): { id: string; num: number; raw: string; name: string } | null => {
    for (const r of report.results) {
      const name = (r.test?.name || "").trim().toLowerCase();
      const code = (r.test?.testCode || (r.test as any)?.test_code || "").trim().toUpperCase();
      for (const pat of patterns) {
        if (typeof pat === "string") {
          if (name === pat.toLowerCase() || code === pat.toUpperCase() || name.includes(pat.toLowerCase())) {
            const raw = (currentValues[r.id] ?? "").toString().trim();
            const num = parseFloat(raw);
            return { id: r.id, num: isNaN(num) ? NaN : num, raw, name: r.test?.name || "" };
          }
        } else if (pat instanceof RegExp) {
          if (pat.test(name) || pat.test(code)) {
            const raw = (currentValues[r.id] ?? "").toString().trim();
            const num = parseFloat(raw);
            return { id: r.id, num: isNaN(num) ? NaN : num, raw, name: r.test?.name || "" };
          }
        }
      }
    }
    return null;
  };

  // Helper to register calculated value
  const setCalc = (target: { id: string } | null, value: string | number) => {
    if (!target || !target.id) return;
    calculatedIds.add(target.id);
    calculatedValues[target.id] = value.toString();
  };

  // 1. CBC FORMULAS
  const hb = findParam([/\bhb\b|h[ae]moglobin/i, "CBC_HB", "HAEM_HB"]);
  const rbc = findParam([/\brbc\b|red blood|erythrocyte/i, "CBC_RBC", "HAEM_RBC"]);
  const pcv = findParam([/\bpcv\b|\bhct\b|packed cell|h[ae]matocrit/i, "CBC_PCV", "CBC_HCT", "HAEM_HCT"]);
  const tlc = findParam([/\btlc\b|\bwbc\b|total leucocyte|total leukocyte/i, "CBC_TLC", "CBC_WBC", "HAEM_TLC"]);
  const neutro = findParam([/\bneutrophil/i, "CBC_NEUTROPHILS", "HAEM_NEUTROPHILS"]);
  const lympho = findParam([/\blymphocyte/i, "CBC_LYMPHOCYTES", "HAEM_LYMPHOCYTES"]);
  const eosino = findParam([/\beosinophil/i, "CBC_EOSINOPHILS", "HAEM_EOSINOPHILS"]);
  const mono = findParam([/\bmonocyte/i, "CBC_MONOCYTES", "HAEM_MONOCYTES"]);
  const baso = findParam([/\bbasophil/i, "CBC_BASOPHILS", "HAEM_BASOPHILS"]);

  // Estimated or actual PCV
  const pcvVal = !isNaN(pcv?.num || NaN) && (pcv?.num || 0) > 0 
    ? pcv!.num 
    : (!isNaN(hb?.num || NaN) && (hb?.num || 0) > 0 ? hb!.num * 3 : NaN);

  // MCV = (PCV * 10) / RBC
  const mcvTarget = findParam([/\bmcv\b|mean corpuscular volume|mean cell volume/i, "CBC_MCV", "HAEM_MCV"]);
  let calculatedMcv = 0;
  if (mcvTarget && rbc && (pcv || hb)) {
    calculatedIds.add(mcvTarget.id);
    if (!isNaN(pcvVal) && !isNaN(rbc?.num || NaN) && (rbc?.num || 0) > 0) {
      calculatedMcv = (pcvVal * 10) / rbc!.num;
      setCalc(mcvTarget, calculatedMcv.toFixed(1));
    }
  }

  // MCH = (Hb * 10) / RBC
  const mchTarget = findParam([/\bmch\b|mean corpuscular h[ae]moglobin|mean cell h[ae]moglobin/i, "CBC_MCH", "HAEM_MCH"]);
  let calculatedMch = 0;
  if (mchTarget && rbc && hb) {
    calculatedIds.add(mchTarget.id);
    if (!isNaN(hb?.num || NaN) && !isNaN(rbc?.num || NaN) && (rbc?.num || 0) > 0) {
      calculatedMch = (hb!.num * 10) / rbc!.num;
      setCalc(mchTarget, calculatedMch.toFixed(1));
    }
  }

  // MCHC = (Hb * 100) / PCV  (or (MCH / MCV) * 100)
  const mchcTarget = findParam([/\bmchc\b|mean corpuscular h[ae]moglobin conc|mean cell h[ae]moglobin con|m\.c\.h\.c/i, "CBC_MCHC", "HAEM_MCHC"]);
  if (mchcTarget && hb && (pcv || rbc)) {
    calculatedIds.add(mchcTarget.id);
    if (!isNaN(hb?.num || NaN) && (hb?.num || 0) > 0) {
      if (!isNaN(pcvVal) && pcvVal > 0) {
        setCalc(mchcTarget, ((hb!.num * 100) / pcvVal).toFixed(1));
      } else if (calculatedMch > 0 && calculatedMcv > 0) {
        setCalc(mchcTarget, ((calculatedMch / calculatedMcv) * 100).toFixed(1));
      }
    }
  }

  // NLR = Neutrophils / Lymphocytes
  const nlrTarget = findParam([/\bnlr\b|neutrophil.*lymphocyte.*ratio/i, "CBC_NLR", "HAEM_NLR"]);
  if (nlrTarget && neutro && lympho) {
    calculatedIds.add(nlrTarget.id);
    if (!isNaN(neutro?.num || NaN) && !isNaN(lympho?.num || NaN) && (lympho?.num || 0) > 0) {
      setCalc(nlrTarget, (neutro!.num / lympho!.num).toFixed(2));
    }
  }

  // Absolute Differential Leukocyte Counts - only calculate if TLC AND the differential test exist in the report!
  if (tlc && !isNaN(tlc?.num || NaN) && (tlc?.num || 0) > 0) {
    const ancTarget = findParam([/\banc\b|absolute neutrophil/i, "CBC_ANC", "HAEM_ANC"]);
    if (ancTarget && neutro) {
      calculatedIds.add(ancTarget.id);
      if (!isNaN(neutro?.num || NaN)) setCalc(ancTarget, Math.round((tlc!.num * neutro!.num) / 100));
    }
    const alcTarget = findParam([/\balc\b|absolute lymphocyte/i, "CBC_ALC", "HAEM_ALC"]);
    if (alcTarget && lympho) {
      calculatedIds.add(alcTarget.id);
      if (!isNaN(lympho?.num || NaN)) setCalc(alcTarget, Math.round((tlc!.num * lympho!.num) / 100));
    }
    const aecTarget = findParam([/\baec\b|absolute eosinophil/i, "CBC_AEC", "HAEM_AEC"]);
    if (aecTarget && eosino) {
      calculatedIds.add(aecTarget.id);
      if (!isNaN(eosino?.num || NaN)) setCalc(aecTarget, Math.round((tlc!.num * eosino!.num) / 100));
    }
    const amcTarget = findParam([/\bamc\b|absolute monocyte/i, "CBC_AMC", "HAEM_AMC"]);
    if (amcTarget && mono) {
      calculatedIds.add(amcTarget.id);
      if (!isNaN(mono?.num || NaN)) setCalc(amcTarget, Math.round((tlc!.num * mono!.num) / 100));
    }
    const abcTarget = findParam([/\babc\b|absolute basophil/i, "CBC_ABC", "HAEM_ABC"]);
    if (abcTarget && baso) {
      calculatedIds.add(abcTarget.id);
      if (!isNaN(baso?.num || NaN)) setCalc(abcTarget, Math.round((tlc!.num * baso!.num) / 100));
    }
  }

  // 2. LFT FORMULAS
  const tbili = findParam([/\btotal bilirubin\b|\bbilirubin total\b|\bt\.?bili\b/i, "LFT_TBILI", "BIO_TBILI"]);
  const dbili = findParam([/\bdirect bilirubin\b|\bbilirubin direct\b|\bd\.?bili\b/i, "LFT_DBILI", "BIO_DBILI"]);
  const tprot = findParam([/\btotal protein\b|\bprotein total\b|\bt\.?prot\b/i, "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN"]);
  const alb = findParam([/\balbumin\b/i, "LFT_ALBUMIN", "BIO_ALBUMIN"]);
  const sgot = findParam([/\bsgot\b|\bast\b|aspartate/i, "LFT_SGOT", "BIO_SGOT"]);
  const sgpt = findParam([/\bsgpt\b|\balt\b|alanine/i, "LFT_SGPT", "BIO_SGPT"]);

  // Indirect Bilirubin = Total Bilirubin - Direct Bilirubin
  const ibiliTarget = findParam([/\bindirect bilirubin\b|\bbilirubin indirect\b|\bunconjugated\b|\bi\.?bili\b/i, "LFT_IBILI", "BIO_IBILI"]);
  if (ibiliTarget && tbili && dbili) {
    calculatedIds.add(ibiliTarget.id);
    if (!isNaN(tbili?.num || NaN) && !isNaN(dbili?.num || NaN)) {
      setCalc(ibiliTarget, Math.max(0, tbili!.num - dbili!.num).toFixed(2));
    }
  }

  // Globulin = Total Protein - Albumin
  const globTarget = findParam([/\bglobulin\b/i, "LFT_GLOBULIN", "BIO_GLOBULIN"]);
  let calculatedGlob = 0;
  if (globTarget && tprot && alb) {
    calculatedIds.add(globTarget.id);
    if (!isNaN(tprot?.num || NaN) && !isNaN(alb?.num || NaN)) {
      calculatedGlob = Math.max(0, tprot!.num - alb!.num);
      setCalc(globTarget, calculatedGlob.toFixed(2));
    }
  }

  // A : G Ratio = Albumin / Globulin
  const agTarget = findParam([/\ba\s*:\s*g\b|\ba\s*\/\s*g\b|albumin.*globulin.*ratio/i, "LFT_AG_RATIO", "BIO_AG_RATIO"]);
  if (agTarget && alb && (globTarget || tprot)) {
    calculatedIds.add(agTarget.id);
    if (!isNaN(alb?.num || NaN)) {
      const globVal = calculatedGlob > 0 ? calculatedGlob : (globTarget ? parseFloat(currentValues[globTarget.id]) : (!isNaN(tprot?.num || NaN) ? tprot!.num - alb!.num : NaN));
      if (!isNaN(globVal) && globVal > 0) {
        setCalc(agTarget, (alb!.num / globVal).toFixed(2));
      }
    }
  }

  // SGOT / SGPT Ratio
  const sgotSgptTarget = findParam([/\bsgot\s*\/\s*sgpt\b|\bast\s*\/\s*alt\b|de ritis/i, "LFT_AST_ALT_RATIO", "BIO_AST_ALT_RATIO"]);
  if (sgotSgptTarget && sgot && sgpt) {
    calculatedIds.add(sgotSgptTarget.id);
    if (!isNaN(sgot?.num || NaN) && !isNaN(sgpt?.num || NaN) && (sgpt?.num || 0) > 0) {
      setCalc(sgotSgptTarget, (sgot!.num / sgpt!.num).toFixed(2));
    }
  }

  // 3. KFT FORMULAS
  const urea = findParam([/\bblood urea\b|\burea\b/i, "KFT_UREA", "BIO_UREA"]);
  const creat = findParam([/\bserum creatinine\b|\bcreatinine\b/i, "KFT_CREAT", "BIO_CREAT"]);

  // BUN = Blood Urea / 2.14
  const bunTarget = findParam([/\bblood urea nitrogen\b|\bbun\b/i, "KFT_BUN", "BIO_BUN"]);
  let calculatedBun = 0;
  if (bunTarget && urea) {
    calculatedIds.add(bunTarget.id);
    if (!isNaN(urea?.num || NaN) && (urea?.num || 0) > 0) {
      calculatedBun = urea!.num / 2.14;
      setCalc(bunTarget, calculatedBun.toFixed(1));
    }
  }

  // BUN / Creatinine Ratio
  const bunCreatTarget = findParam([/\bbun\s*\/\s*creatinine\b|\bbun.*creat.*ratio/i, "KFT_BUN_CREAT_RATIO", "BIO_BUN_CREAT_RATIO"]);
  if (bunCreatTarget && (urea || bunTarget) && creat) {
    calculatedIds.add(bunCreatTarget.id);
    if (!isNaN(creat?.num || NaN) && (creat?.num || 0) > 0) {
      const bunVal = calculatedBun > 0 ? calculatedBun : (bunTarget ? parseFloat(currentValues[bunTarget.id]) : (!isNaN(urea?.num || NaN) ? urea!.num / 2.14 : NaN));
      if (!isNaN(bunVal) && bunVal > 0) {
        setCalc(bunCreatTarget, (bunVal / creat!.num).toFixed(1));
      }
    }
  }

  // eGFR (CKD-EPI 2021) & GFR Category (KDIGO)
  const egfrTarget = findParam([/\begfr\b|estimated gfr/i, "KFT_EGFR", "BIO_EGFR"]);
  const gfrStageTarget = findParam([/\bgfr category\b|\bgfr stage\b|kdigo.*gfr/i, "KFT_GFR_STAGE", "BIO_GFR_STAGE"]);

  if (egfrTarget && creat) calculatedIds.add(egfrTarget.id);
  if (gfrStageTarget && creat) calculatedIds.add(gfrStageTarget.id);

  if (creat && !isNaN(creat?.num || NaN) && (creat?.num || 0) > 0) {
    const scr = creat!.num;
    const age = (report.patient?.age && report.patient.age > 0) ? report.patient.age : 40;
    const isFemale = (report.patient?.gender || "").toLowerCase().startsWith("f");
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const sexFactor = isFemale ? 1.012 : 1.0;
    const scrRatio = scr / kappa;
    const minVal = Math.min(scrRatio, 1);
    const maxVal = Math.max(scrRatio, 1);
    const calculatedEgfr = 142 * Math.pow(minVal, alpha) * Math.pow(maxVal, -1.200) * Math.pow(0.9938, age) * sexFactor;
    const egfrNumber = Math.round(calculatedEgfr);

    if (egfrTarget) {
      setCalc(egfrTarget, egfrNumber);
    }

    if (gfrStageTarget) {
      let stageText = "G1 - Normal or High (≥90)";
      if (egfrNumber >= 90) stageText = "G1 - Normal or High (≥90)";
      else if (egfrNumber >= 60) stageText = "G2 - Mildly Decreased (60-89)";
      else if (egfrNumber >= 45) stageText = "G3a - Mild to Moderately Decreased (45-59)";
      else if (egfrNumber >= 30) stageText = "G3b - Moderately to Severely Decreased (30-44)";
      else if (egfrNumber >= 15) stageText = "G4 - Severely Decreased (15-29)";
      else stageText = "G5 - Kidney Failure (<15)";

      setCalc(gfrStageTarget, stageText);
    }
  }

  // 4. LIPID PROFILE FORMULAS
  const tchol = findParam([/\btotal cholesterol\b|\bcholesterol total\b|\bcholesterol\b/i, "LIPID_TOTAL_CHOL", "BIO_TOTAL_CHOL"]);
  const tg = findParam([/\btriglycerides\b|\btriglyceride\b|\btg\b/i, "LIPID_TRIGLYCERIDES", "BIO_TRIGLYCERIDES"]);
  const hdl = findParam([/\bhdl cholesterol\b|\bhdl\b/i, "LIPID_HDL", "BIO_HDL"]);

  // VLDL = Triglycerides / 5
  const vldlTarget = findParam([/\bvldl cholesterol\b|\bvldl\b/i, "LIPID_VLDL", "BIO_VLDL"]);
  let calculatedVldl = 0;
  if (vldlTarget && tg) {
    calculatedIds.add(vldlTarget.id);
    if (!isNaN(tg?.num || NaN) && (tg?.num || 0) > 0) {
      calculatedVldl = tg!.num / 5;
      setCalc(vldlTarget, calculatedVldl.toFixed(1));
    }
  }

  // LDL = Total Cholesterol - HDL - VLDL (Friedewald)
  const ldlTarget = findParam([/\bldl cholesterol\b|\bldl\b/i, "LIPID_LDL", "BIO_LDL"]);
  let calculatedLdl = 0;
  if (ldlTarget && tchol && hdl) {
    calculatedIds.add(ldlTarget.id);
    if (!isNaN(tchol?.num || NaN) && !isNaN(hdl?.num || NaN)) {
      const vldlVal = calculatedVldl > 0 ? calculatedVldl : (!isNaN(tg?.num || NaN) ? tg!.num / 5 : (vldlTarget ? parseFloat(currentValues[vldlTarget.id]) || 0 : 0));
      calculatedLdl = Math.max(0, tchol!.num - hdl!.num - vldlVal);
      setCalc(ldlTarget, calculatedLdl.toFixed(1));
    }
  }

  // Non-HDL Cholesterol = Total Cholesterol - HDL
  const nonHdlTarget = findParam([/\bnon-hdl cholesterol\b|\bnon hdl\b/i, "LIPID_NON_HDL", "BIO_NON_HDL"]);
  if (nonHdlTarget && tchol && hdl) {
    calculatedIds.add(nonHdlTarget.id);
    if (!isNaN(tchol?.num || NaN) && !isNaN(hdl?.num || NaN)) {
      setCalc(nonHdlTarget, Math.max(0, tchol!.num - hdl!.num).toFixed(1));
    }
  }

  // Total Cholesterol / HDL Ratio
  const cholHdlTarget = findParam([/\btotal chol.*hdl ratio\b|\btc\s*\/\s*hdl\b|\bcholesterol\s*\/\s*hdl\b/i, "LIPID_CHOL_HDL_RATIO"]);
  if (cholHdlTarget && tchol && hdl) {
    calculatedIds.add(cholHdlTarget.id);
    if (!isNaN(tchol?.num || NaN) && !isNaN(hdl?.num || NaN) && (hdl?.num || 0) > 0) {
      setCalc(cholHdlTarget, (tchol!.num / hdl!.num).toFixed(2));
    }
  }

  // LDL / HDL Ratio
  const ldlHdlTarget = findParam([/\bldl\s*\/\s*hdl\b|\bldl.*hdl ratio\b/i, "LIPID_LDL_HDL_RATIO"]);
  if (ldlHdlTarget && hdl && (tchol || ldlTarget)) {
    calculatedIds.add(ldlHdlTarget.id);
    if (!isNaN(hdl?.num || NaN) && (hdl?.num || 0) > 0) {
      const ldlVal = calculatedLdl > 0 ? calculatedLdl : (ldlTarget ? parseFloat(currentValues[ldlTarget.id]) : NaN);
      if (!isNaN(ldlVal) && ldlVal > 0) {
        setCalc(ldlHdlTarget, (ldlVal / hdl!.num).toFixed(2));
      }
    }
  }

  // 5. HbA1c -> eAG
  const hba1c = findParam([/\bglycated hemoglobin\b|\bglycosylated hemoglobin\b|\bhba1c\b/i, "HBA1C_VALUE", "BIO_HBA1C"]);
  const eagTarget = findParam([/\bestimated average glucose\b|\beag\b/i, "HBA1C_EAG"]);
  if (eagTarget && hba1c) {
    calculatedIds.add(eagTarget.id);
    if (!isNaN(hba1c?.num || NaN) && (hba1c?.num || 0) > 0) {
      const eagVal = Math.round((28.7 * hba1c!.num) - 46.7);
      if (eagVal > 0) setCalc(eagTarget, eagVal);
    }
  }

  // 6. IRON STUDIES
  const iron = findParam([/\bserum iron\b|\biron, serum\b|\biron\b/i, "IRON_SERUM"]);
  const tibc = findParam([/\btotal iron binding capacity\b|\btibc\b/i, "IRON_TIBC"]);

  const uibcTarget = findParam([/\bunsaturated iron binding capacity\b|\buibc\b/i, "IRON_UIBC"]);
  if (uibcTarget && iron && tibc) {
    calculatedIds.add(uibcTarget.id);
    if (!isNaN(tibc?.num || NaN) && !isNaN(iron?.num || NaN)) {
      setCalc(uibcTarget, Math.max(0, tibc!.num - iron!.num).toFixed(1));
    }
  }

  const transSatTarget = findParam([/\btransferrin saturation\b|\biron saturation\b/i, "IRON_SATURATION"]);
  if (transSatTarget && iron && tibc) {
    calculatedIds.add(transSatTarget.id);
    if (!isNaN(iron?.num || NaN) && !isNaN(tibc?.num || NaN) && (tibc?.num || 0) > 0) {
      setCalc(transSatTarget, ((iron!.num / tibc!.num) * 100).toFixed(1));
    }
  }

  // 7. SEMEN ANALYSIS
  const semVol = findParam([/\bvolume\b|\bquantity\b/i, "SEMEN_VOLUME"]);
  const semCount = findParam([/\btotal sperm count\b|\bsperm concentration/i, "SEMEN_TOTAL_COUNT"]);
  const semProg = findParam([/\bprogressive motile\b|motility \(progressive\)/i, "SEMEN_PROG_MOTILE"]);
  const semNonProg = findParam([/\bnon-progressive\b|\bnon progressive\b/i, "SEMEN_NON_PROG_MOTILE"]);

  const semEjacTarget = findParam([/total sperm count per ejaculate/i, "SEMEN_EJACULATE_COUNT"]);
  if (semEjacTarget && semVol && semCount) {
    calculatedIds.add(semEjacTarget.id);
    if (!isNaN(semVol?.num || NaN) && !isNaN(semCount?.num || NaN)) {
      setCalc(semEjacTarget, (semVol!.num * semCount!.num).toFixed(1));
    }
  }

  const semMotTarget = findParam([/total motile|total motility/i, "SEMEN_TOTAL_MOTILITY"]);
  if (semMotTarget && semProg && semNonProg) {
    calculatedIds.add(semMotTarget.id);
    if (!isNaN(semProg?.num || NaN) && !isNaN(semNonProg?.num || NaN)) {
      setCalc(semMotTarget, (semProg!.num + semNonProg!.num).toFixed(1));
    }
  }

  return { calculatedValues, calculatedIds };
}

// Global memory cache so investigations load instantly on browse
let globalAvailableTestsCache: Test[] | null = null;

export default function ResultEntryPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const toast = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [abnormalOverrides, setAbnormalOverrides] = useState<Record<string, boolean>>({});
  const [paramRemarks, setParamRemarks] = useState<Record<string, string>>({});
  const [showParamRemark, setShowParamRemark] = useState<Record<string, boolean>>({});
  const [testNotes, setTestNotes] = useState<Record<string, { notes?: string; remarks?: string; advices?: string }>>({});
  const [generatingAiField, setGeneratingAiField] = useState<Record<string, boolean>>({});

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

      if (param === "RDW-CV") {
        return name.includes("rdw-cv") || (name.includes("rdw") && !name.includes("sd")) || name.includes("red cell distribution");
      }

      if (param === "RDW-SD") {
        return name.includes("rdw-sd");
      }

      if (param === "GLU") {
        return name.includes("glucose") || name.includes("sugar") || name.includes("fbs") || name.includes("rbs");
      }

      if (param === "SGPT") {
        return name.includes("sgpt") || name.includes("alt") || name.includes("alanine amino");
      }

      if (param === "SGOT") {
        return name.includes("sgot") || name.includes("ast") || name.includes("aspartate amino");
      }

      if (param === "BILI_TOTAL") {
        return (name.includes("bilirubin") && name.includes("total")) || (name.includes("total") && name.includes("bilirubin"));
      }

      if (param === "BILI_DIRECT") {
        return (name.includes("bilirubin") && name.includes("direct")) || (name.includes("direct") && name.includes("bilirubin"));
      }

      if (param === "UREA") {
        return name.includes("urea") && !name.includes("uric");
      }

      if (param === "CREAT") {
        return name.includes("creatinine") || name.includes("serum creat");
      }

      if (param === "URIC") {
        return name.includes("uric acid") || name.includes("serum uric");
      }

      if (param === "CHOL") {
        if (name.includes("hdl") || name.includes("ldl") || name.includes("vldl")) return false;
        return name.includes("cholesterol") || name.includes("total chol");
      }

      return name.includes(param.toLowerCase());
    };

    const findMatchingValue = (testName: string) => {
      for (const [key, paramData] of Object.entries(params)) {
        const val = typeof paramData === "object" && paramData !== null ? (paramData as any).value : String(paramData);
        if (matchMachineParamToTest(key, testName) && val !== undefined && val !== null && String(val).trim() !== "") {
          return String(val).trim();
        }
      }
      return null;
    };

    const newValues: Record<string, string> = { ...values };
    const newAbnormals: Record<string, boolean> = { ...abnormalOverrides };

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

      const matchedVal = findMatchingValue(test.name);
      if (matchedVal !== null) {
        newValues[item.id] = matchedVal;
        filledCount++;

        const abCheck = isValueAbnormal(test, matchedVal);
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
    } catch (_) {}
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
      fetchReport();
    }
    // Prefetch investigations catalog immediately in the background
    fetchAvailableTests();
  }, [reportId]);

  const fetchAvailableTests = async (force = false) => {
    if ((availableTests.length > 0 && !force) || loadingAvailableTests) return;
    try {
      setLoadingAvailableTests(true);
      const data = await fetchFromLaravel("/tests");
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
      const data: any = await fetchFromLaravel(`/reports/${reportId}`);
      setReport({
        ...data,
        lab: data.lab ? {
          ...data.lab,
          printBgImage: getCleanLetterheadUrl(data.lab.printBgImage || data.lab.print_bg_image),
        } : data.lab,
      });
      const initialVals: Record<string, string> = {};
      const initialAbnormal: Record<string, boolean> = {};
      const initialRemarks: Record<string, string> = {};
      const initialShowRemarks: Record<string, boolean> = {};

      const resultsList = Array.isArray(data?.results) ? data.results : [];
      resultsList.forEach((r: any) => {
        const fieldType = r.test?.fieldType || r.test?.field_type;
        if (!r.resultValue && !r.result_value && fieldType === "Custom Editor" && r.test?.interpretation) {
          initialVals[r.id] = r.test.interpretation;
        } else {
          initialVals[r.id] = r.resultValue || r.result_value || "";
        }
        initialAbnormal[r.id] = !!(r.isAbnormal || r.is_abnormal);
        if (r.remarks) {
          initialRemarks[r.id] = r.remarks;
          initialShowRemarks[r.id] = true;
        }
      });

      // Run automatic calculations on initial load
      const { calculatedValues } = computeAutomatedFormulas(initialVals, data);
      const autoComputedInit = { ...initialVals, ...calculatedValues };

      // Preserve currently filled in-memory results across updates
      setValues((prev) => {
        const merged: Record<string, string> = { ...autoComputedInit };
        Object.entries(prev).forEach(([k, v]) => {
          if (v !== undefined && v !== "") {
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
      const data = await fetchFromLaravel("/reports");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setHistory(list.filter((r: any) => (r.patientId === patientId || r.patient_id === patientId) && r.id !== reportId));
    } catch (err) {
      console.error("Error fetching patient history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleValueChange = (id: string, val: string) => {
    setValues((prev) => {
      const updated = { ...prev, [id]: val };
      const { calculatedValues } = computeAutomatedFormulas(updated, report);
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
        return { ...prev, results: newResults };
      });

      setIsRangeModalOpen(false);
    } catch (err: any) {
      toast.error("Save Failed", err.message || "Failed to update reference range.");
    } finally {
      setSavingRange(false);
    }
  };

  const handleSaveResults = async (targetStatus?: "PENDING" | "FINAL" | "APPROVED") => {
    setSaving(true);
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

    const resolvedStatus = targetStatus || report?.status || "PENDING";

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

      let successMsg = "Diagnostic results saved successfully.";
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
      setTimeout(() => { router.push(`/dashboard/reports`); router.refresh(); }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to update results.");
      setSaving(false);
    }
  };

  // Keyboard navigation: Pressing Enter moves focus to next input field & smoothly auto-scrolls to keep it centered
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

      const form = e.currentTarget;
      const focusable = Array.from(
        form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          'input:not([type="hidden"]):not([type="checkbox"]):not([disabled]):not([readonly]), select:not([disabled])'
        )
      );
      const index = focusable.indexOf(target as any);

      if (e.shiftKey) {
        if (index > 0) {
          const prevInput = focusable[index - 1];
          prevInput.focus();
          if (typeof (prevInput as HTMLInputElement).select === "function") {
            (prevInput as HTMLInputElement).select();
          }
          prevInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        if (index > -1 && index + 1 < focusable.length) {
          const nextInput = focusable[index + 1];
          nextInput.focus();
          if (typeof (nextInput as HTMLInputElement).select === "function") {
            (nextInput as HTMLInputElement).select();
          }
          nextInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  };

  // Hierarchy grouping & ordering
  const mainGroups = useMemo(() => {
    if (!report || !report.results) return [];

    const map = new Map<string, {
      mainTestName: string;
      mainTestId: string;
      hasInterpretation: boolean;
      sectionsMap: Map<string, { parentOrder: number; items: ReportTest[] }>;
    }>();

    report.results.forEach((item) => {
      const t = item.test;
      const mt = t.parent?.parent ? t.parent.parent : (t.parent ? t.parent : t);
      const mtId = mt.id;
      const mtName = mt.name;
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

      let sectionName = "_default";
      let parentOrder = 0;
      if (t.parent && t.parent.id !== mt.id) {
        sectionName = t.parent.name;
        parentOrder = t.parent.sort_order ?? (t.parent as any).sortOrder ?? 0;
      }

      if (!group.sectionsMap.has(sectionName)) {
        group.sectionsMap.set(sectionName, { parentOrder, items: [] });
      }
      group.sectionsMap.get(sectionName)!.items.push(item);
    });

    return Array.from(map.values())
      .map((g) => ({
        mainTestName: g.mainTestName,
        mainTestId: g.mainTestId,
        hasInterpretation: g.hasInterpretation,
        sections: Array.from(g.sectionsMap.entries())
          .map(([secName, secData]) => ({
            sectionName: secName,
            parentOrder: secData.parentOrder,
            items: secData.items.slice().sort((a, b) => {
              const orderA = a.test.sort_order ?? (a.test as any).sortOrder ?? 0;
              const orderB = b.test.sort_order ?? (b.test as any).sortOrder ?? 0;
              if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
              if (orderA !== 0 && orderB === 0) return -1;
              if (orderA === 0 && orderB !== 0) return 1;
              return 0;
            }),
          }))
          .sort((secA, secB) => {
            const orderA = secA.items[0]?.test?.sort_order ?? (secA.items[0]?.test as any)?.sortOrder ?? secA.parentOrder;
            const orderB = secB.items[0]?.test?.sort_order ?? (secB.items[0]?.test as any)?.sortOrder ?? secB.parentOrder;
            if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
            if (secA.sectionName === "_default") return -1;
            if (secB.sectionName === "_default") return 1;
            return 0;
          }),
      }))
      .sort((a, b) => {
        const catA = a.sections[0]?.items[0]?.test?.category;
        const catB = b.sections[0]?.items[0]?.test?.category;
        const pA = getTestPriority(a.mainTestName, catA);
        const pB = getTestPriority(b.mainTestName, catB);
        if (pA !== pB) return pA - pB;
        return a.mainTestName.localeCompare(b.mainTestName);
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

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto animate-fade-in min-h-[calc(100vh-68px-1.75rem)] -mb-7">
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header Bar with Save Results on the Right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 cursor-pointer shrink-0"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/dashboard/reports");
                }
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">Enter Results</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Enter laboratory parameters, remarks, and clinical findings below.</p>
            </div>
          </div>

          {/* Action Buttons: Fetch from Machine + Save Results */}
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

            <Button
              type="button"
              onClick={() => handleSaveResults()}
              disabled={saving}
              className="h-10 px-5 gap-2 font-bold shadow-sm cursor-pointer gradient-primary text-primary-foreground hover:-translate-y-px transition-all rounded-xl w-full sm:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving…" : "Save Results"}</span>
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="font-mono text-primary bg-accent px-1.5 py-0.5 rounded font-bold">{report.patient.customId}</span>
                <span>Ref: Dr. {report.patient.refDoctor || "Self"}</span>
                <span>·</span>
                <span className="font-mono">Rep: {report.customId}</span>
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
        <form onSubmit={(e) => { e.preventDefault(); handleSaveResults("PENDING"); }} onKeyDown={handleFormKeyDown} className="flex-1 flex flex-col justify-between">
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

          {/* Add Additional Test Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-sm">
            <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0"><Plus className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Add Additional Test</h3>
              <p className="text-xs text-muted-foreground">Select a test from the catalog to append to this patient report.</p>
            </div>
            <div className="w-full sm:w-[240px]">
              <Button type="button" onClick={handleOpenAddTestModal} disabled={modifyingTest} className="w-full cursor-pointer font-bold text-xs">
                Browse Test Catalog
              </Button>
            </div>
          </div>

          {/* Main Tests Groups with Subgroup Headers, Parameter Remarks and Test Meta (Notes/Remarks/Advices) */}
          <div className="space-y-6">
            {mainGroups.map((group) => {
              const allCustomEditor = group.sections.every(sec =>
                sec.items.every(item => (item.test.fieldType || item.test.field_type) === "Custom Editor")
              );
              const hasAnyNumeric = group.sections.some(sec =>
                sec.items.some(item => (item.test.fieldType || item.test.field_type) !== "Custom Editor" && (item.test.valueType || item.test.value_type) !== "Custom")
              );
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
                            (/differential.*leukocyte/i.test(section.sectionName) && !/absolute/i.test(section.sectionName)) ||
                            (section.items.length >= 3 && 
                             section.items.some(it => /neutrophil|polymorph/i.test(it.test.name) && !/absolute/i.test(it.test.name)) && 
                             section.items.some(it => /lymphocyte/i.test(it.test.name) && !/absolute/i.test(it.test.name)));

                          let dlcSum = 0;
                          let dlcFilledCount = 0;
                          let hasDlcParams = false;

                          if (isDlcSection) {
                            section.items.forEach(item => {
                              const tName = (item.test.name || "").toLowerCase();
                              if (
                                (tName.includes("neutrophil") || tName.includes("polymorph") || tName.includes("lymphocyte") || 
                                 tName.includes("eosinophil") || tName.includes("monocyte") || tName.includes("basophil")) &&
                                !tName.includes("absolute") && (item.test.unit === "%" || !item.test.unit || item.test.unit === "")
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
                            <React.Fragment key={section.sectionName}>

                              {/* Subgroup Header Banner (e.g. Differential Leukocyte Count) */}
                              {section.sectionName !== "_default" && section.sectionName !== "Report Template" && (
                                <tr className="bg-muted/20 border-b border-border/40">
                                  <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-2 text-xs font-bold text-primary uppercase tracking-wider bg-primary/5">
                                    {section.sectionName}
                                  </td>
                                </tr>
                              )}

                              {section.items.map((item) => {
                                const val = values[item.id] || "";
                                const { abnormal, flag } = isValueAbnormal(item.test, val);
                                const isForcedAbnormal = !!abnormalOverrides[item.id];
                                const isCustomEditor = (item.test.fieldType || item.test.field_type) === "Custom Editor";
                                const canAutoCalc = canParamBeCalculatedInReport(item.test, report, item.id);
                                const isCalculated = canAutoCalc && (isParamFormulaCalculated(item.test) || calculatedParamIds.has(item.id));
                                const isTextType = (item.test.valueType || item.test.value_type) === "Text";
                                const isTextRange = (item.test.rangeType || item.test.range_type) === "TEXT" || !!(item.test.textRefRange || item.test.text_ref_range);
                                const range = getRefRange(item.test, report.patient.gender, report.patient.age);
                                const refRangeText = isTextRange ? (item.test.textRefRange || item.test.text_ref_range || "—") : formatRefRangeText(range);
                                const hasActiveRemark = showParamRemark[item.id] || !!paramRemarks[item.id];

                                if (isCustomEditor) {
                                  return (
                                    <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/15 transition-colors">
                                      <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-4">
                                        <div className="mb-2 flex items-center justify-between">
                                          <span className="text-sm font-semibold text-foreground">
                                            {item.test.name !== "Report Template" ? item.test.name : ""}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">Custom Layout</span>
                                          </div>
                                        </div>
                                        <div className="mt-3 border border-border/60 rounded-xl overflow-hidden shadow-sm">
                                          <TipTapEditor
                                            value={val}
                                            onChange={(html) => handleValueChange(item.id, html)}
                                            hideHeader
                                            hideFooter
                                          />
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
                                            <Input
                                              list={`options-${item.id}`}
                                              placeholder={isCalculated ? "Auto" : "Select or enter result..."}
                                              value={val}
                                              readOnly={isCalculated}
                                              onChange={(e) => handleValueChange(item.id, e.target.value)}
                                              disabled={saving}
                                              className={`w-full h-9 text-sm text-foreground ${isCalculated
                                                  ? "bg-primary/5 border-primary/30 font-bold text-primary cursor-default"
                                                  : isForcedAbnormal || abnormal
                                                    ? "font-extrabold border-border/90"
                                                    : "font-medium"
                                                }`}
                                            />
                                            {item.test.customOptions && (
                                              <datalist id={`options-${item.id}`}>
                                                {JSON.parse(item.test.customOptions).map((opt: string, i: number) => (
                                                  <option key={i} value={opt} />
                                                ))}
                                              </datalist>
                                            )}

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

                                              <Input
                                                placeholder={isCalculated ? "Auto" : "—"}
                                                value={val}
                                                readOnly={isCalculated}
                                                onChange={(e) => handleValueChange(item.id, e.target.value)}
                                                disabled={saving}
                                                className={`${isTextType ? "w-64" : "w-32"} h-9 font-mono text-sm text-foreground transition-all ${isCalculated
                                                    ? "bg-primary/5 border-primary/30 font-bold text-primary cursor-default"
                                                    : isForcedAbnormal || abnormal
                                                      ? "font-extrabold border-border/90 bg-muted/20"
                                                      : "font-semibold"
                                                  }`}
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
                                          <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">{item.test.unit || "—"}</td>

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
                                <tr className={`border-b border-border/40 transition-colors ${
                                  dlcSum === 100
                                    ? "bg-emerald-500/10 dark:bg-emerald-950/20"
                                    : dlcFilledCount > 0
                                    ? "bg-rose-500/10 dark:bg-rose-950/20"
                                    : "bg-muted/15"
                                }`}>
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2 pl-3">
                                      <span className={`text-xs font-black uppercase tracking-wider ${
                                        dlcSum === 100
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
                                      <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-black border flex items-center justify-between min-w-[130px] ${
                                        dlcSum === 100
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
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50 shadow-sm">
                                            <AlertTriangle className="h-3.5 w-3.5" /> {dlcSum > 100 ? `Alert: +${(dlcSum - 100).toFixed(0)}% Over (Total ${dlcSum}%)` : `Alert: -${(100 - dlcSum).toFixed(0)}% Short (Total ${dlcSum}%)`}
                                          </span>
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

          {/* Sticky Bottom Action Footer with Cancel, Print, Final, Approve, and Save Buttons */}
          <div className="sticky bottom-0 z-30 mt-auto bg-card/95 backdrop-blur-md border-t border-x border-border/90 rounded-t-2xl rounded-b-none p-3 sm:p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_20px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 safe-pb">
            <Link href="/dashboard/reports" className="w-full sm:w-auto">
              <Button type="button" variant="outline" disabled={saving} className="cursor-pointer w-full sm:w-auto h-9 sm:h-10 text-xs font-semibold">
                Cancel
              </Button>
            </Link>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPrintModalOpen(true)}
                className="h-9 sm:h-10 px-3 sm:px-4 gap-1.5 font-bold cursor-pointer border-border/90 hover:bg-muted text-foreground text-xs"
              >
                <Printer className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" />
                <span>Print Report</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults("FINAL")}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 sm:px-5 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>Final</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults("APPROVED")}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 sm:px-5 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>
                  {saving
                    ? "Saving…"
                    : ((report?.patient as any)?.abhaAddress || (report?.patient as any)?.abha_address || (report?.patient as any)?.abhaNumber || (report?.patient as any)?.abha_number)
                    ? "Approve & Sync ABDM"
                    : "Approve"}
                </span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSaveResults()}
                disabled={saving}
                className="gradient-primary text-primary-foreground font-bold px-3 sm:px-5 h-9 sm:h-10 gap-1.5 cursor-pointer shadow-sm rounded-xl text-xs"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                <span>{saving ? "Saving…" : "Save"}</span>
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    report?.status === "COMPLETED" || report?.status === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : report?.status === "FINAL"
                      ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                      : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                  }`}>
                    {report?.status}
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
                      Dr. {report.patient.refDoctor || report.patient.ref_doctor || "Self"}
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
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                        report.bill?.status === "PAID"
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
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Order Date</p>
                    <p className="font-mono text-xs font-semibold text-foreground mt-0.5">
                      {(report.createdAt || report.created_at)
                        ? new Date((report.createdAt || report.created_at) as string).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })
                        : "—"}
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
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rangeMode === "numeric"
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
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rangeMode === "TEXT"
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
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                          rangeText === sugg
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
        <DialogContent className="max-w-2xl bg-card border border-border/80 rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="font-display font-bold text-foreground flex items-center gap-2">
                <Cpu className="h-5 w-5 text-emerald-600" />
                <span>Analyzer Results Queue</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchMachineResults}
                  disabled={loadingMachineResults}
                  className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingMachineResults ? "animate-spin text-primary" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Select any live test run from your connected <strong>Aveacon</strong>, <strong>Mindray</strong>, or <strong>Beacon</strong> analyzer to auto-populate matching parameters directly into this report.
            </DialogDescription>
          </DialogHeader>

          {/* Instant Simulators inside dialog */}
          <div className="p-3 bg-muted/50 border border-border/60 rounded-xl flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span>Test Simulator:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => simulateMachineRun("HAEMATOLOGY")}
                disabled={isSimulatingMachine}
                className="h-7 text-[11px] gap-1 cursor-pointer bg-background hover:bg-muted"
              >
                {isSimulatingMachine ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-amber-500" />}
                <span>Simulate CBC Run</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => simulateMachineRun("BIOCHEMISTRY")}
                disabled={isSimulatingMachine}
                className="h-7 text-[11px] gap-1 cursor-pointer bg-background hover:bg-muted"
              >
                <Activity className="h-3 w-3 text-blue-500" />
                <span>Simulate Biochem Run</span>
              </Button>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {loadingMachineResults ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Fetching analyzer data stream...</span>
              </div>
            ) : machineResults.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <HardDrive className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs font-semibold">No recent machine runs found in queue.</p>
                <p className="text-[11px]">Run a sample on your cell counter or click &quot;Simulate CBC Run&quot; above to test!</p>
              </div>
            ) : (
              machineResults.map((run: any) => {
                const paramKeys = Object.keys(run.parsed_parameters || {});
                const isExactMatch =
                  (report?.customId && run.sample_id && String(run.sample_id).toLowerCase().includes(String(report.customId).toLowerCase())) ||
                  (((report?.patient as any)?.vialBarcode || (report?.patient as any)?.vial_barcode) && run.barcode && String(run.barcode).includes(String((report?.patient as any)?.vialBarcode || (report?.patient as any)?.vial_barcode))) ||
                  (report?.patient?.customId && run.sample_id && String(run.sample_id).includes(String(report.patient.customId)));

                return (
                  <div
                    key={run.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isExactMatch
                        ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                        : "bg-background border-border/70 hover:border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                            {run.sample_id || "Unlabeled Sample"}
                          </span>
                          {isExactMatch && (
                            <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                              🎯 MATCHES THIS REPORT
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground font-medium">
                            {run.instrument_name || "Hematology Analyzer"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                          Tested: {new Date(run.tested_at || run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => applyMachineRunToReport(run)}
                        className="h-8 px-3.5 text-xs font-bold gap-1.5 gradient-primary text-primary-foreground shadow-2xs cursor-pointer shrink-0"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Auto-fill ({paramKeys.length})</span>
                      </Button>
                    </div>

                    {/* Parameter Pills */}
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {paramKeys.slice(0, 8).map((k) => {
                        const p = run.parsed_parameters[k];
                        const val = typeof p === "object" && p !== null ? p.value : p;
                        return (
                          <span
                            key={k}
                            className="bg-muted/80 text-foreground px-2 py-0.5 rounded font-mono border border-border/50"
                          >
                            <strong>{k}:</strong> {val}
                          </span>
                        );
                      })}
                      {paramKeys.length > 8 && (
                        <span className="text-[10px] text-muted-foreground px-1 py-0.5 font-semibold">
                          +{paramKeys.length - 8} more
                        </span>
                      )}
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
