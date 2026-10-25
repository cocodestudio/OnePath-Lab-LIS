// Clinical Formula Engine - Extracted for High Performance & Zero Monolith
import { getClinicalTestPriority } from "@/lib/clinical-order";

export interface Test {
  id: string;
  name: string;
  testCode?: string;
  test_code?: string;
  category?: string;
  price?: number;
  unit?: string | null;
  interpretation?: string | null;
  customLayout?: string | null;
  custom_layout?: string | null;
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
  customOptions?: string | string[] | any;
  custom_options?: string | string[] | any;
  sortOrder?: number;
  sort_order?: number;
  isHidden?: boolean;
  is_hidden?: boolean;
  isJsonOverride?: boolean;
  is_json_override?: boolean;
  subTests?: Test[];
  sub_tests?: Test[];
  parentId?: string | null;
  parent_id?: string | null;
  parent?: any;
}
export interface ReportTest {
  id: string;
  resultValue: string | null;
  result_value?: string | null;
  isAbnormal: boolean;
  is_abnormal?: boolean;
  remarks?: string | null;
  test: Test;
}
export interface Report {
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
    collectionDateTime?: string;
    collection_date_time?: string;
    collectionDate?: string;
    collection_date?: string;
    registrationDate?: string;
    registration_date?: string;
    meta?: any;
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
  prev_id?: string | null;
  prevId?: string | null;
  next_id?: string | null;
  nextId?: string | null;
}

export interface CalculationResult {
  calculatedValues: Record<string, string>;
  calculatedIds: Set<string>;
}

export function getTestPriority(mainTestName: string, category?: string): number {
  return getClinicalTestPriority(mainTestName, category);
}

export function hasReportParam(patterns: (string | RegExp)[], report: Report | null, excludeId?: string): boolean {
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

export function canParamBeCalculatedInReport(test: Test, report: Report | null, currentResultId?: string): boolean {
  if (!test || !report) return false;
  const name = (test?.name || "").trim().toLowerCase();
  const code = (test?.testCode || (test as any)?.test_code || "").trim().toUpperCase();

  // EXCLUDE Calcium, minerals and electrolytes from auto calculation (do NOT match CALC generally!)
  if (name.includes("calcium") || /(^|_|-)CALCIUM($|_|-)/i.test(code)) return false;
  if (name.includes("phosphorus") || /(^|_|-)PHOS/i.test(code)) return false;
  if (name.includes("uric acid") || /(^|_|-)URIC/i.test(code)) return false;
  if (name.includes("sodium") || /(^|_|-)SODIUM/i.test(code) || name.includes("potassium") || /(^|_|-)POTASSIUM/i.test(code) || name.includes("chloride") || /(^|_|-)CHLORIDE/i.test(code)) return false;

  // CBC Absolute counts (AEC, ANC, ALC, AMC, ABC)
  const hasTlc = hasReportParam([
    /\btlc\b|\bwbc\b|total leucocyte|total leukocyte/i,
    "CBC_TLC", "CBC_WBC", "HAEM_TLC",
    "CBC_TLC_HAEM_CBC_STANDALONE", "CBC_TLC_SYS_CBC_01",
    "SYS_CBC_TLC", "SYS_CBC_01_WBC", "HAEM_026_WBC", "TLC", "WBC"
  ], report, currentResultId);

  if (/\baec\b|absolute eosinophil/i.test(name) || /(^|_|-)AEC($|_|-)/.test(code)) {
    const hasEosino = hasReportParam([
      /\beosinophils?\b/i,
      "CBC_EOS", "HAEM_DLC_EOS", "CBC_EOSINOPHILS", "HAEM_EOSINOPHILS",
      "CBC_EOS_HAEM_CBC_STANDALONE", "CBC_EOS_SYS_CBC_01", "SYS_CBC_EOS", "EOS"
    ], report, currentResultId);
    return hasTlc && hasEosino;
  }
  if (/\banc\b|absolute neutrophil|absolute polymorph/i.test(name) || /(^|_|-)ANC($|_|-)/.test(code)) {
    const hasNeutro = hasReportParam([
      /\bneutrophils?\b/i, /\bpolymorphs?\b/i, /\bsegmented\s+neutrophils?\b/i,
      "CBC_NEU", "HAEM_DLC_NEU", "CBC_NEUTROPHILS", "HAEM_NEUTROPHILS",
      "CBC_NEU_HAEM_CBC_STANDALONE", "CBC_NEU_SYS_CBC_01", "SYS_CBC_NEU", "NEU"
    ], report, currentResultId);
    return hasTlc && hasNeutro;
  }
  if (/\balc\b|absolute lymphocyte/i.test(name) || /(^|_|-)ALC($|_|-)/.test(code)) {
    const hasLympho = hasReportParam([
      /\blymphocytes?\b/i,
      "CBC_LYM", "HAEM_DLC_LYM", "CBC_LYMPHOCYTES", "HAEM_LYMPHOCYTES",
      "CBC_LYM_HAEM_CBC_STANDALONE", "CBC_LYM_SYS_CBC_01", "SYS_CBC_LYM", "LYM"
    ], report, currentResultId);
    return hasTlc && hasLympho;
  }
  if (/\bamc\b|absolute monocyte/i.test(name) || /(^|_|-)AMC($|_|-)/.test(code)) {
    const hasMono = hasReportParam([
      /\bmonocytes?\b/i,
      "CBC_MON", "HAEM_DLC_MON", "CBC_MONOCYTES", "HAEM_MONOCYTES",
      "CBC_MON_HAEM_CBC_STANDALONE", "CBC_MON_SYS_CBC_01", "SYS_CBC_MON", "MON"
    ], report, currentResultId);
    return hasTlc && hasMono;
  }
  if (/\babc\b|absolute basophil/i.test(name) || /(^|_|-)ABC($|_|-)/.test(code)) {
    const hasBaso = hasReportParam([
      /\bbasophils?\b/i,
      "CBC_BAS", "HAEM_DLC_BAS", "CBC_BASOPHILS", "HAEM_BASOPHILS",
      "CBC_BAS_HAEM_CBC_STANDALONE", "CBC_BAS_SYS_CBC_01", "SYS_CBC_BAS", "BAS"
    ], report, currentResultId);
    return hasTlc && hasBaso;
  }

  // NLR
  if (/\bnlr\b|neutrophil.*lymphocyte.*ratio/i.test(name) || /(^|_|-)NLR($|_|-)/.test(code)) {
    const hasNeutro = hasReportParam([
      /\bneutrophils?\b/i, /\bpolymorphs?\b/i, /\bsegmented\s+neutrophils?\b/i,
      "CBC_NEU", "HAEM_DLC_NEU", "CBC_NEUTROPHILS", "HAEM_NEUTROPHILS",
      "CBC_NEU_HAEM_CBC_STANDALONE", "CBC_NEU_SYS_CBC_01", "SYS_CBC_NEU", "NEU"
    ], report, currentResultId);
    const hasLympho = hasReportParam([
      /\blymphocytes?\b/i,
      "CBC_LYM", "HAEM_DLC_LYM", "CBC_LYMPHOCYTES", "HAEM_LYMPHOCYTES",
      "CBC_LYM_HAEM_CBC_STANDALONE", "CBC_LYM_SYS_CBC_01", "SYS_CBC_LYM", "LYM"
    ], report, currentResultId);
    return hasNeutro && hasLympho;
  }

  // MCV, MCH, MCHC
  const hasRbc = hasReportParam([/\brbc\b|red blood|erythrocyte/i, "CBC_RBC", "HAEM_RBC", "SYS_CBC_RBC"], report, currentResultId);
  const hasHb = hasReportParam([/\bhb\b|h[ae]moglobin/i, "CBC_HB", "HAEM_HB", "SYS_CBC_HB", "CBC_HGB"], report, currentResultId);
  const hasPcv = hasReportParam([/\bpcv\b|\bhct\b|packed cell|h[ae]matocrit/i, "CBC_PCV", "CBC_HCT", "HAEM_HCT", "HAEM_PCV"], report, currentResultId);

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
  if (/\bindirect bilirubin\b|\bbilirubin indirect\b|\bunconjugated\b/i.test(name) || /(^|_|-)IBILI($|_|-)/.test(code) || /(^|_|-)BIL_INDIR($|_|-)/.test(code) || code.includes("SBIL_INDIRECT")) {
    const hasTbili = hasReportParam([/\btotal bilirubin\b|\bbilirubin total\b|\bt\.?bili\b|serum bilirubin \(total\)/i, "LFT_TBILI", "BIO_TBILI", "LFT_BIL_TOT", "SYS_LFT_BILI_TOT", "BIO_SBIL_TOTAL", "TBILI"], report, currentResultId);
    const hasDbili = hasReportParam([/\bdirect bilirubin\b|\bbilirubin direct\b|\bd\.?bili\b|conjugated bilirubin/i, "LFT_DBILI", "BIO_DBILI", "LFT_BIL_DIR", "SYS_LFT_BILI_DIR", "BIO_SBIL_DIRECT", "DBILI"], report, currentResultId);
    return hasTbili && hasDbili;
  }
  if (/\bglobulin\b/i.test(name) || /(^|_|-)GLOBULIN($|_|-)/.test(code) || /(^|_|-)GLOB($|_|-)/.test(code)) {
    const hasTprot = hasReportParam([/\btotal protein\b|\bprotein total\b|\bt\.?prot\b/i, "LFT_TOT_PROT", "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN"], report, currentResultId);
    const hasAlb = hasReportParam([/\balbumin\b/i, "LFT_ALBUMIN", "BIO_ALBUMIN", "SYS_LFT_ALB"], report, currentResultId);
    return hasTprot && hasAlb;
  }
  if (/\ba\s*:\s*g\b|\ba\s*[\/:]\s*g\b|albumin.*globulin.*ratio/i.test(name) || /(^|_|-)AG_RATIO($|_|-)/.test(code)) {
    const hasAlb = hasReportParam([/\balbumin\b/i, "LFT_ALBUMIN", "BIO_ALBUMIN", "SYS_LFT_ALB"], report, currentResultId);
    const hasTprot = hasReportParam([/\btotal protein\b|\bprotein total\b|\bt\.?prot\b/i, "LFT_TOT_PROT", "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN"], report, currentResultId);
    const hasGlob = hasReportParam([/\bglobulin\b/i, "LFT_GLOBULIN", "BIO_GLOBULIN", "SYS_LFT_GLOB"], report, currentResultId);
    return hasAlb && (hasGlob || hasTprot);
  }
  if (/\bsgot\s*[\/:]\s*sgpt\b|\bast\s*[\/:]\s*alt\b|de ritis/i.test(name) || /(^|_|-)AST_ALT($|_|-)/.test(code)) {
    const hasSgot = hasReportParam([/\bsgot\b|\bast\b|aspartate/i, "LFT_SGOT", "BIO_SGOT", "SYS_LFT_SGOT"], report, currentResultId);
    const hasSgpt = hasReportParam([/\bsgpt\b|\balt\b|alanine/i, "LFT_SGPT", "BIO_SGPT", "SYS_LFT_SGPT"], report, currentResultId);
    return hasSgot && hasSgpt;
  }

  // KFT
  const hasUrea = hasReportParam([/\bblood urea\b|\bserum urea\b|^urea$/i, "KFT_UREA", "BIO_UREA", "SYS_KFT_UREA", "BIO_043_UREA", "UREA"], report, currentResultId);
  const hasCreat = hasReportParam([/\bserum creatinine\b|^creatinine$/i, "KFT_CREAT", "BIO_CREAT", "SYS_KFT_CREAT", "BIO_042_CREAT", "CREAT", "CREATININE"], report, currentResultId);

  if (/\bblood urea nitrogen\b|\bbun\b/i.test(name) || (/(^|_|-)BUN($|_|-)/.test(code) && !code.includes("CREAT")) || code.includes("065_BUN")) {
    return hasUrea;
  }
  if (/\bbun\s*[\/:]\s*creatinine\b|\bbun.*creat.*ratio/i.test(name) || /(^|_|-)BUN_CREAT($|_|-)/.test(code)) {
    return (hasUrea || hasReportParam([/\bbun\b/i, "KFT_BUN"], report, currentResultId)) && hasCreat;
  }
  if (/\burea\s*[\/:]\s*creatinine\b|\burea.*creat.*ratio/i.test(name) || /(^|_|-)UREA_CREAT($|_|-)/.test(code)) {
    return hasUrea && hasCreat;
  }
  if (/\begfr\b|estimated gfr|calculated egfr/i.test(name) || /(^|_|-)EGFR($|_|-)/.test(code) || code.includes("EGFR")) {
    return hasCreat;
  }
  if (/\bgfr category\b|\bgfr stage\b|kdigo.*gfr/i.test(name) || /(^|_|-)GFR_STAGE($|_|-)/.test(code)) {
    return hasCreat;
  }

  // Lipid
  const hasTchol = hasReportParam([/\btotal cholesterol\b|\bcholesterol total\b|\bserum cholesterol\b|^cholesterol$/i, "LIPID_CHOL", "BIO_055_CHOL", "SYS_LIPID_CHOL", "LIPID_TOTAL_CHOL", "BIO_TOTAL_CHOL"], report, currentResultId);
  const hasTg = hasReportParam([/\btriglycerides?\b/i, "LIPID_TRIG", "BIO_056_TG", "SYS_LIPID_TRIG", "LIPID_TRIGLYCERIDES", "BIO_TRIGLYCERIDES"], report, currentResultId);
  const hasHdl = hasReportParam([/\bhdl(\s*-\s*|\s+)cholesterol\b/i, /^hdl(\s+direct)?$/i, /\bhigh\s+density\s+lipoprotein\b/i, "LIPID_HDL", "BIO_057_HDL", "SYS_LIPID_HDL"], report, currentResultId);

  if (/\bvldl(\s*-\s*|\s+)?(cholesterol)?\b/i.test(name) || /(^|_|-)VLDL($|_|-)/.test(code)) {
    return hasTg;
  }
  if (/\bldl(\s*-\s*|\s+)?cholesterol\b/i.test(name) || (/(^|_|-)LDL($|_|-)/.test(code) && !code.includes("HDL"))) {
    return hasTchol && hasHdl;
  }
  if (/\bnon[\s\-_]*hdl(\s+cholesterol)?\b/i.test(name) || /(^|_|-)NON_HDL($|_|-)/.test(code)) {
    return hasTchol && hasHdl;
  }
  if (/\b(total\s+chol(esterol)?|tc)\s*[\/:]\s*hdl\b/i.test(name) || /\bchol(esterol)?\s*[\/:]\s*hdl/i.test(name) || /(^|_|-)CHOL_HDL($|_|-)/.test(code)) {
    return hasTchol && hasHdl;
  }
  if (/\bldl\s*[\/:]\s*hdl\b/i.test(name) || /(^|_|-)LDL_HDL($|_|-)/.test(code)) {
    return hasHdl && (hasTchol || hasReportParam([/\bldl\b/i, "LIPID_LDL", "SYS_LIPID_LDL"], report, currentResultId));
  }
  if (/\btg\s*[\/:]\s*hdl\b|\btriglycerides?\s*[\/:]\s*hdl\b/i.test(name) || /(^|_|-)TG_HDL($|_|-)/.test(code)) {
    return hasTg && hasHdl;
  }

  // Coagulation
  if (/\binr\b|prothrombin time.*inr|pt.*inr/i.test(name) || /(^|_|-)INR($|_|-)/.test(code)) {
    const hasPtTest = hasReportParam([/\bpt\b|prothrombin time/i, "COAG_PT", "COAG_001_PT"], report, currentResultId);
    return hasPtTest;
  }
  if (/\baptt\s*ratio\b|aptt.*ratio/i.test(name) || /(^|_|-)APTT_RATIO($|_|-)/.test(code)) {
    const hasApttTest = hasReportParam([/\baptt\b|activated partial/i, "COAG_APTT", "COAG_002_APTT"], report, currentResultId);
    return hasApttTest;
  }

  // HbA1c
  if (/\bestimated average glucose\b|\beag\b/i.test(name) || /(^|_|-)EAG($|_|-)/.test(code)) {
    return hasReportParam([/\bglycated hemoglobin\b|\bglycosylated hemoglobin\b|\bhba1c\b/i, "HBA1C_VALUE", "BIO_HBA1C", "HBA1C_VAL", "SYS_HBA1C_VAL"], report, currentResultId);
  }

  // Iron
  if (/\bunsaturated iron binding capacity\b|\buibc\b/i.test(name) || /(^|_|-)UIBC($|_|-)/.test(code)) {
    const hasIron = hasReportParam([/\bserum iron\b|\biron, serum\b|^iron$/i, "IRON_SERUM", "SYS_IRON_SERUM", "BIO_121_IRON"], report, currentResultId);
    const hasTibc = hasReportParam([/\btotal iron binding capacity\b|\btibc\b/i, "IRON_TIBC", "SYS_IRON_TIBC", "BIO_122_TIBC"], report, currentResultId);
    return hasIron && hasTibc;
  }
  if (/\btransferrin saturation\b|\biron saturation\b/i.test(name) || /(^|_|-)SATURATION($|_|-)/.test(code)) {
    const hasIron = hasReportParam([/\bserum iron\b|\biron, serum\b|^iron$/i, "IRON_SERUM", "SYS_IRON_SERUM", "BIO_121_IRON"], report, currentResultId);
    const hasTibc = hasReportParam([/\btotal iron binding capacity\b|\btibc\b/i, "IRON_TIBC", "SYS_IRON_TIBC", "BIO_122_TIBC"], report, currentResultId);
    return hasIron && hasTibc;
  }

  // Semen
  if (/total sperm.*ejaculate|sperm number.*ejaculate/i.test(name) || /(^|_|-)EJACULATE($|_|-)/.test(code)) {
    const hasSemVol = hasReportParam([/\bvolume\b|\bquantity\b/i, "SEMEN_VOLUME", "SEM_VOLUME"], report, currentResultId);
    const hasSemCount = hasReportParam([/\btotal sperm count\b|\bsperm concentration/i, "SEMEN_TOTAL_COUNT", "SEM_SPERM_COUNT"], report, currentResultId);
    return hasSemVol && hasSemCount;
  }
  if (/total motile|total motility/i.test(name) || /(^|_|-)TOTAL_MOTILITY($|_|-)/.test(code)) {
    const hasSemProg = hasReportParam([/\bprogressive motile\b|motility \(progressive\)/i, "SEMEN_PROG_MOTILE"], report, currentResultId);
    const hasSemNonProg = hasReportParam([/\bnon-progressive\b|\bnon progressive\b/i, "SEMEN_NON_PROG_MOTILE"], report, currentResultId);
    return hasSemProg && hasSemNonProg;
  }

  return false;
}

export function isParamFormulaCalculated(test: Test): boolean {
  const name = (test?.name || "").trim().toLowerCase();
  const code = (test?.testCode || (test as any)?.test_code || "").trim().toUpperCase();

  // EXCLUDE Calcium, minerals and electrolytes from auto calculation
  if (name.includes("calcium") || /(^|_|-)CALCIUM($|_|-)/i.test(code)) return false;
  if (name.includes("phosphorus") || /(^|_|-)PHOS/i.test(code)) return false;
  if (name.includes("uric acid") || /(^|_|-)URIC/i.test(code)) return false;
  if (name.includes("sodium") || /(^|_|-)SODIUM/i.test(code) || name.includes("potassium") || /(^|_|-)POTASSIUM/i.test(code) || name.includes("chloride") || /(^|_|-)CHLORIDE/i.test(code)) return false;

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
  if (/\bindirect bilirubin\b|\bbilirubin indirect\b|\bunconjugated\b/i.test(name) || /(^|_|-)IBILI($|_|-)/.test(code) || /(^|_|-)BIL_INDIR($|_|-)/.test(code) || code.includes("SBIL_INDIRECT")) return true;
  if (/\bglobulin\b/i.test(name) || /(^|_|-)GLOBULIN($|_|-)/.test(code) || /(^|_|-)GLOB($|_|-)/.test(code)) return true;
  if (/\ba\s*:\s*g\b|\ba\s*[\/:]\s*g\b|albumin.*globulin.*ratio/i.test(name) || /(^|_|-)AG_RATIO($|_|-)/.test(code)) return true;
  if (/\bsgot\s*[\/:]\s*sgpt\b|\bast\s*[\/:]\s*alt\b|de ritis/i.test(name) || /(^|_|-)AST_ALT($|_|-)/.test(code)) return true;

  // KFT
  if (/\bblood urea nitrogen\b|\bbun\b/i.test(name) || (/(^|_|-)BUN($|_|-)/.test(code) && !code.includes("CREAT")) || code.includes("065_BUN")) return true;
  if (/\bbun\s*[\/:]\s*creatinine\b|\bbun.*creat.*ratio/i.test(name) || /(^|_|-)BUN_CREAT($|_|-)/.test(code)) return true;
  if (/\burea\s*[\/:]\s*creatinine\b|\burea.*creat.*ratio/i.test(name) || /(^|_|-)UREA_CREAT($|_|-)/.test(code)) return true;
  if (/\begfr\b|estimated gfr|calculated egfr/i.test(name) || /(^|_|-)EGFR($|_|-)/.test(code) || code.includes("EGFR")) return true;
  if (/\bgfr category\b|\bgfr stage\b|kdigo.*gfr/i.test(name) || /(^|_|-)GFR_STAGE($|_|-)/.test(code)) return true;

  // Lipid
  if (/\bvldl(\s*-\s*|\s+)?(cholesterol)?\b/i.test(name) || /(^|_|-)VLDL($|_|-)/.test(code)) return true;
  if (/\bldl(\s*-\s*|\s+)?cholesterol\b/i.test(name) || (/(^|_|-)LDL($|_|-)/.test(code) && !code.includes("HDL"))) return true;
  if (/\bnon[\s\-_]*hdl(\s+cholesterol)?\b/i.test(name) || /(^|_|-)NON_HDL($|_|-)/.test(code)) return true;
  if (/\b(total\s+chol(esterol)?|tc)\s*[\/:]\s*hdl\b/i.test(name) || /\bchol(esterol)?\s*[\/:]\s*hdl/i.test(name) || /(^|_|-)CHOL_HDL($|_|-)/.test(code)) return true;
  if (/\bldl\s*[\/:]\s*hdl\b/i.test(name) || /(^|_|-)LDL_HDL($|_|-)/.test(code)) return true;
  if (/\btg\s*[\/:]\s*hdl\b|\btriglycerides?\s*[\/:]\s*hdl\b/i.test(name) || /(^|_|-)TG_HDL($|_|-)/.test(code)) return true;

  // Coagulation
  if (/\binr\b|prothrombin time.*inr|pt.*inr/i.test(name) || /(^|_|-)INR($|_|-)/.test(code)) return true;
  if (/\baptt\s*ratio\b|aptt.*ratio/i.test(name) || /(^|_|-)APTT_RATIO($|_|-)/.test(code)) return true;

  // HbA1c
  if (/\bestimated average glucose\b|\beag\b/i.test(name) || /(^|_|-)EAG($|_|-)/.test(code)) return true;

  // Iron
  if (/\bunsaturated iron binding capacity\b|\buibc\b/i.test(name) || /(^|_|-)UIBC($|_|-)/.test(code)) return true;
  if (/\btransferrin saturation\b|\biron saturation\b/i.test(name) || /(^|_|-)SATURATION($|_|-)/.test(code)) return true;

  // Semen
  if (/total sperm.*ejaculate|sperm number.*ejaculate/i.test(name) || /(^|_|-)EJACULATE($|_|-)/.test(code)) return true;
  if (/total motile|total motility/i.test(name) || /(^|_|-)TOTAL_MOTILITY($|_|-)/.test(code)) return true;

  return false;
}

// ─── Robust multi-criteria parameter finder with exclusion support ───────────
// Used inside computeAutomatedFormulas. exactCodes and exactNames checked first (highest priority),
// then excludePatterns are verified, and finally regex patterns are checked.
export type FindParamOptions = {
  exactCodes?: string[];
  exactNames?: string[];
  patterns?: RegExp[];
  excludePatterns?: RegExp[];
};

export function findParamInResults(
  results: ReportTest[],
  currentValues: Record<string, string>,
  opts: FindParamOptions
): { id: string; num: number; raw: string; name: string } | null {
  const { exactCodes = [], exactNames = [], patterns = [], excludePatterns = [] } = opts;
  for (const r of results) {
    const rawName = (r.test?.name || "").trim();
    const rawCode = (r.test?.testCode || (r.test as any)?.test_code || "").trim();
    const name = rawName.toLowerCase();
    const code = rawCode.toUpperCase();

    const parseVal = () => {
      const raw = (currentValues[r.id] ?? "").toString().trim();
      const n = parseFloat(raw);
      return { id: r.id, num: isNaN(n) ? NaN : n, raw, name: rawName };
    };

    // 1. Exact code match (Highest precedence)
    if (exactCodes.some((ec) => code === ec.toUpperCase())) {
      return parseVal();
    }

    // 2. Exact name match (normalised, highest precedence)
    const normName = name.replace(/[\-_/]/g, " ").replace(/\s+/g, " ").trim();
    if (exactNames.some((en) => normName === en.toLowerCase().replace(/[\-_/]/g, " ").replace(/\s+/g, " ").trim())) {
      return parseVal();
    }

    // 3. Exclusions check
    if (excludePatterns.some((p) => p.test(rawName) || p.test(rawCode))) {
      continue;
    }

    // 4. Regex pattern match
    if (patterns.some((p) => p.test(rawName) || p.test(rawCode))) {
      return parseVal();
    }
  }
  return null;
}

export function computeAutomatedFormulas(
  currentValues: Record<string, string>,
  report: Report | null,
  manualOverrideIds?: Set<string>
): CalculationResult {
  const calculatedValues: Record<string, string> = {};
  const calculatedIds = new Set<string>();

  if (!report || !report.results || !Array.isArray(report.results)) {
    return { calculatedValues, calculatedIds };
  }

  const results = report.results;
  const fp = (opts: FindParamOptions) => findParamInResults(results, currentValues, opts);

  const findAllParams = (opts: FindParamOptions): { id: string; num: number; raw: string; name: string }[] => {
    const { exactCodes = [], exactNames = [], patterns = [], excludePatterns = [] } = opts;
    const matches: { id: string; num: number; raw: string; name: string }[] = [];
    for (const r of results) {
      const rawName = (r.test?.name || "").trim();
      const rawCode = (r.test?.testCode || (r.test as any)?.test_code || "").trim();
      const name = rawName.toLowerCase();
      const code = rawCode.toUpperCase();

      const parseVal = () => {
        const raw = (currentValues[r.id] ?? "").toString().trim();
        const n = parseFloat(raw);
        return { id: r.id, num: isNaN(n) ? NaN : n, raw, name: rawName };
      };

      if (exactCodes.some((ec) => code === ec.toUpperCase())) {
        matches.push(parseVal());
        continue;
      }

      const normName = name.replace(/[\-_/]/g, " ").replace(/\s+/g, " ").trim();
      if (exactNames.some((en) => normName === en.toLowerCase().replace(/[\-_/]/g, " ").replace(/\s+/g, " ").trim())) {
        matches.push(parseVal());
        continue;
      }

      if (excludePatterns.some((p) => p.test(rawName) || p.test(rawCode))) {
        continue;
      }

      if (patterns.some((p) => p.test(rawName) || p.test(rawCode))) {
        matches.push(parseVal());
      }
    }
    return matches;
  };

  // Helper to register a calculated value (skips if user has manually overridden it)
  const setCalc = (target: { id: string } | null, value: string | number) => {
    if (!target || !target.id) return;
    calculatedIds.add(target.id);
    if (manualOverrideIds?.has(target.id)) return; // user overrode – don't touch
    calculatedValues[target.id] = value.toString();
  };

  // 1. CBC FORMULAS
  const hb = fp({
    exactCodes: [
      "CBC_HB", "HAEM_HB", "CBC_HGB", "HAEM_HGB",
      "CBC_HB_HAEM_CBC_STANDALONE", "CBC_HB_SYS_CBC_01",
      "SYS_CBC_HB", "HAEM_001_HB", "SYS_CBC_01_HB", "HB", "HEMOGLOBIN",
    ],
    exactNames: ["Hemoglobin (Hb)", "Hemoglobin", "Haemoglobin (Hb)", "Haemoglobin", "Hb", "Hemoglobin (HGB)", "S. Hemoglobin"],
    patterns: [/\bh[ae]moglobin(\s*\(hb\))?\b/i, /^hb$/i],
    excludePatterns: [/\bmch\b/i, /\bmchc\b/i, /corpuscular/i, /glycat/i, /hba1c/i, /hplc/i, /fetal/i, /hbsag/i, /variant/i],
  });
  const rbc = fp({
    exactCodes: [
      "CBC_RBC", "HAEM_RBC",
      "CBC_RBC_HAEM_CBC_STANDALONE", "CBC_RBC_SYS_CBC_01",
      "SYS_CBC_RBC", "HAEM_016_RBC", "RBC",
    ],
    exactNames: ["Total RBC Count", "RBC Count", "Red Blood Cell Count", "Erythrocyte Count", "RBC"],
    patterns: [/\b(total\s+)?rbc(\s+count)?\b/i, /red blood.*count/i, /erythrocyte.*count/i],
    excludePatterns: [/rdw/i, /width/i, /morphology/i, /indices/i],
  });
  const pcv = fp({
    exactCodes: [
      "CBC_PCV", "CBC_HCT", "HAEM_HCT", "HAEM_PCV",
      "CBC_PCV_HAEM_CBC_STANDALONE", "CBC_PCV_SYS_CBC_01", "SYS_CBC_PCV", "PCV", "HCT",
    ],
    exactNames: ["Packed Cell Volume (PCV / Hematocrit)", "Packed Cell Volume", "PCV", "Hematocrit", "Haematocrit", "HCT"],
    patterns: [/\b(pcv|hct|packed\s+cell(\s+volume)?|h[ae]matocrit)\b/i],
    excludePatterns: [],
  });
  const tlc = fp({
    exactCodes: [
      "CBC_TLC", "CBC_WBC", "HAEM_TLC",
      "CBC_TLC_HAEM_CBC_STANDALONE", "CBC_TLC_SYS_CBC_01",
      "SYS_CBC_TLC", "SYS_CBC_01_WBC", "HAEM_026_WBC", "TLC", "WBC",
    ],
    exactNames: ["Total Leucocyte Count (TLC / WBC)", "Total Leucocyte Count", "Total Leukocyte Count", "TLC", "WBC Count", "Total Leucocyte Count (WBC)", "WBC"],
    patterns: [/\b(total\s+)?(tlc|wbc)(\s+count)?\b/i, /total\s+leuko?cyte(\s+count)?/i],
    excludePatterns: [/differential/i, /\bdlc\b/i, /morphology/i],
  });
  const neutro = fp({
    exactCodes: [
      "CBC_NEU", "HAEM_DLC_NEU", "CBC_NEUTROPHILS", "HAEM_NEUTROPHILS",
      "CBC_NEU_HAEM_CBC_STANDALONE", "CBC_NEU_SYS_CBC_01", "SYS_CBC_NEU",
      "HAEM_003_DLC_HAEM_DLC_NEU", "HAEM_035_LEUK_DLC_HAEM_LEUK_SEG", "HAEM_LEUK_SEG", "NEU",
    ],
    exactNames: ["Neutrophils (Segmented)", "Neutrophils", "Polymorphs", "Granulocytes", "Segmented Neutrophils"],
    patterns: [/\bneutrophils?\b/i, /\bpolymorphs?\b/i, /\bsegmented\s+neutrophils?\b/i],
    excludePatterns: [/absolute/i, /\banc\b/i, /ratio/i, /\bnlr\b/i],
  });
  const lympho = fp({
    exactCodes: [
      "CBC_LYM", "HAEM_DLC_LYM", "CBC_LYMPHOCYTES", "HAEM_LYMPHOCYTES",
      "CBC_LYM_HAEM_CBC_STANDALONE", "CBC_LYM_SYS_CBC_01", "SYS_CBC_LYM",
      "HAEM_004_DLC_HAEM_DLC_LYM", "LYM",
    ],
    exactNames: ["Lymphocytes", "Lymphocyte"],
    patterns: [/\blymphocytes?\b/i],
    excludePatterns: [/absolute/i, /\balc\b/i, /ratio/i, /\bnlr\b/i],
  });
  const eosino = fp({
    exactCodes: [
      "CBC_EOS", "HAEM_DLC_EOS", "CBC_EOSINOPHILS", "HAEM_EOSINOPHILS",
      "CBC_EOS_HAEM_CBC_STANDALONE", "CBC_EOS_SYS_CBC_01", "SYS_CBC_EOS", "EOS",
    ],
    exactNames: ["Eosinophils", "Eosinophil"],
    patterns: [/\beosinophils?\b/i],
    excludePatterns: [/absolute/i, /\baec\b/i],
  });
  const mono = fp({
    exactCodes: [
      "CBC_MON", "HAEM_DLC_MON", "CBC_MONOCYTES", "HAEM_MONOCYTES",
      "CBC_MON_HAEM_CBC_STANDALONE", "CBC_MON_SYS_CBC_01", "SYS_CBC_MON", "MON",
    ],
    exactNames: ["Monocytes", "Monocyte"],
    patterns: [/\bmonocytes?\b/i],
    excludePatterns: [/absolute/i, /\bamc\b/i],
  });
  const baso = fp({
    exactCodes: [
      "CBC_BAS", "HAEM_DLC_BAS", "CBC_BASOPHILS", "HAEM_BASOPHILS",
      "CBC_BAS_HAEM_CBC_STANDALONE", "CBC_BAS_SYS_CBC_01", "SYS_CBC_BAS", "BAS",
    ],
    exactNames: ["Basophils", "Basophil"],
    patterns: [/\bbasophils?\b/i],
    excludePatterns: [/absolute/i, /\babc\b/i],
  });

  const pcvVal = (pcv && !isNaN(pcv.num) && pcv.num > 0)
    ? pcv.num
    : (hb && !isNaN(hb.num) && hb.num > 0 ? hb.num * 3 : NaN);

  // MCV = (PCV * 10) / RBC   [Reference: Wintrobe, Clinical Hematology]
  const mcvTargets = findAllParams({
    exactCodes: [
      "CBC_MCV", "HAEM_MCV",
      "CBC_MCV_HAEM_CBC_STANDALONE", "CBC_MCV_SYS_CBC_01",
      "SYS_CBC_MCV", "HAEM_IND_MCV", "HAEM_036_RBC_IND_HAEM_IND_MCV", "HAEM_018_MCV", "MCV",
    ],
    exactNames: ["Mean Corpuscular Volume (MCV)", "MCV", "Mean Corpuscular Volume, MCV", "Mean Cell Volume"],
    patterns: [/\bmcv\b/i, /mean corpuscular volume/i, /mean cell volume/i],
    excludePatterns: [/\bmch\b/i],
  });
  let calculatedMcv = 0;
  if (mcvTargets.length > 0 && rbc && (pcv || hb)) {
    mcvTargets.forEach((t) => calculatedIds.add(t.id));
    if (!isNaN(pcvVal) && rbc && !isNaN(rbc.num) && rbc.num > 0) {
      calculatedMcv = (pcvVal * 10) / rbc.num;
      mcvTargets.forEach((t) => setCalc(t, calculatedMcv.toFixed(1)));
    }
  }

  // MCH = (Hb * 10) / RBC   [Reference: Wintrobe]
  const mchTargets = findAllParams({
    exactCodes: [
      "CBC_MCH", "HAEM_MCH",
      "CBC_MCH_HAEM_CBC_STANDALONE", "CBC_MCH_SYS_CBC_01",
      "SYS_CBC_MCH", "HAEM_IND_MCH", "HAEM_036_RBC_IND_HAEM_IND_MCH", "HAEM_019_MCH", "MCH",
    ],
    exactNames: ["Mean Corpuscular Hemoglobin (MCH)", "MCH", "Mean Corpuscular Haemoglobin (MCH)", "Mean Cell Haemoglobin, MCH"],
    patterns: [/\bmch\b/i, /mean corpuscular h[ae]moglobin\b/i, /mean cell h[ae]moglobin/i],
    excludePatterns: [/\bmchc\b/i, /concentration/i, /con,/i],
  });
  let calculatedMch = 0;
  if (mchTargets.length > 0 && rbc && hb) {
    mchTargets.forEach((t) => calculatedIds.add(t.id));
    if (!isNaN(hb.num) && !isNaN(rbc.num) && rbc.num > 0) {
      calculatedMch = (hb.num * 10) / rbc.num;
      mchTargets.forEach((t) => setCalc(t, calculatedMch.toFixed(1)));
    }
  }

  // MCHC = (Hb * 100) / PCV  [Reference: Wintrobe]
  const mchcTargets = findAllParams({
    exactCodes: [
      "CBC_MCHC", "HAEM_MCHC",
      "CBC_MCHC_HAEM_CBC_STANDALONE", "CBC_MCHC_SYS_CBC_01",
      "SYS_CBC_MCHC", "HAEM_IND_MCHC", "HAEM_036_RBC_IND_HAEM_IND_MCHC", "HAEM_020_MCHC", "MCHC",
    ],
    exactNames: ["Mean Corpuscular Hb Concentration (MCHC)", "MCHC", "Mean Corpuscular Haemoglobin Concentration (MCHC)", "Mean Cell Haemoglobin CON, MCHC"],
    patterns: [/\bmchc\b/i, /mean corpuscular h[ae]moglobin conc/i, /m\.c\.h\.c/i, /mean cell h[ae]moglobin con/i],
    excludePatterns: [],
  });
  if (mchcTargets.length > 0 && hb && (pcv || rbc)) {
    mchcTargets.forEach((t) => calculatedIds.add(t.id));
    if (hb && !isNaN(hb.num) && hb.num > 0) {
      if (!isNaN(pcvVal) && pcvVal > 0) {
        const mchcVal = ((hb.num * 100) / pcvVal).toFixed(1);
        mchcTargets.forEach((t) => setCalc(t, mchcVal));
      } else if (calculatedMch > 0 && calculatedMcv > 0) {
        const mchcVal = ((calculatedMch / calculatedMcv) * 100).toFixed(1);
        mchcTargets.forEach((t) => setCalc(t, mchcVal));
      }
    }
  }

  // NLR = Neutrophils% / Lymphocytes%
  const nlrTargets = findAllParams({
    exactCodes: [
      "CBC_NLR", "HAEM_NLR",
      "CBC_NLR_HAEM_CBC_STANDALONE", "CBC_NLR_SYS_CBC_01",
      "HAEM_031_NLR", "SYS_CBC_NLR", "NLR",
    ],
    exactNames: ["Neutrophil Lymphocyte Ratio (NLR)", "NLR", "Neutrophil Lymphocyte Ratio", "Neutrophil to Lymphocyte Ratio"],
    patterns: [/\bnlr\b/i, /neutrophil.*lymphocyte.*ratio/i, /neutrophil.*to.*lymphocyte/i],
    excludePatterns: [],
  });
  if (neutro && lympho) {
    nlrTargets.forEach((t) => {
      calculatedIds.add(t.id);
      if (!isNaN(neutro.num) && !isNaN(lympho.num) && lympho.num > 0) {
        setCalc(t, (neutro.num / lympho.num).toFixed(2));
      }
    });
  }

  // Absolute DLC counts — require TLC > 0
  if (tlc && !isNaN(tlc?.num || NaN) && (tlc?.num || 0) > 0) {
    const calcAbs = (diffParam: { num: number } | null) => {
      if (!diffParam || isNaN(diffParam.num)) return null;
      return tlc!.num > 50
        ? Math.round((tlc!.num * diffParam.num) / 100)
        : parseFloat(((tlc!.num * diffParam.num) / 100).toFixed(2));
    };

    const ancTargets = findAllParams({
      exactCodes: [
        "CBC_ANC", "HAEM_ABS_ANC", "ANC",
        "CBC_ANC_HAEM_CBC_STANDALONE", "CBC_ANC_SYS_CBC_01", "SYS_CBC_ANC"
      ],
      exactNames: [
        "Absolute Neutrophil Count (ANC)", "ANC", "Absolute Neutrophil Count",
        "Absolute Neutrophils", "Absolute Polymorph Count"
      ],
      patterns: [/\banc\b/i, /absolute\s+neutrophil/i, /absolute\s+polymorph/i],
      excludePatterns: [],
    });
    if (neutro) {
      const ancVal = calcAbs(neutro);
      ancTargets.forEach((t) => {
        calculatedIds.add(t.id);
        if (ancVal !== null) setCalc(t, ancVal);
      });
    }

    const alcTargets = findAllParams({
      exactCodes: [
        "CBC_ALC", "HAEM_ABS_ALC", "ALC",
        "CBC_ALC_HAEM_CBC_STANDALONE", "CBC_ALC_SYS_CBC_01", "SYS_CBC_ALC"
      ],
      exactNames: [
        "Absolute Lymphocyte Count (ALC)", "ALC", "Absolute Lymphocyte Count",
        "Absolute Lymphocytes"
      ],
      patterns: [/\balc\b/i, /absolute\s+lymphocyte/i],
      excludePatterns: [],
    });
    if (lympho) {
      const alcVal = calcAbs(lympho);
      alcTargets.forEach((t) => {
        calculatedIds.add(t.id);
        if (alcVal !== null) setCalc(t, alcVal);
      });
    }

    const aecTargets = findAllParams({
      exactCodes: [
        "CBC_AEC", "HAEM_ABS_AEC", "AEC",
        "CBC_AEC_HAEM_CBC_STANDALONE", "CBC_AEC_SYS_CBC_01", "SYS_CBC_AEC"
      ],
      exactNames: [
        "Absolute Eosinophil Count (AEC)", "AEC", "Absolute Eosinophil Count",
        "Absolute Eosinophils"
      ],
      patterns: [/\baec\b/i, /absolute\s+eosinophil/i],
      excludePatterns: [],
    });
    if (eosino) {
      const aecVal = calcAbs(eosino);
      aecTargets.forEach((t) => {
        calculatedIds.add(t.id);
        if (aecVal !== null) setCalc(t, aecVal);
      });
    }

    const amcTargets = findAllParams({
      exactCodes: [
        "CBC_AMC", "HAEM_ABS_AMC", "AMC",
        "CBC_AMC_HAEM_CBC_STANDALONE", "CBC_AMC_SYS_CBC_01", "SYS_CBC_AMC"
      ],
      exactNames: [
        "Absolute Monocyte Count (AMC)", "AMC", "Absolute Monocyte Count",
        "Absolute Monocytes"
      ],
      patterns: [/\bamc\b/i, /absolute\s+monocyte/i],
      excludePatterns: [],
    });
    if (mono) {
      const amcVal = calcAbs(mono);
      amcTargets.forEach((t) => {
        calculatedIds.add(t.id);
        if (amcVal !== null) setCalc(t, amcVal);
      });
    }

    const abcTargets = findAllParams({
      exactCodes: [
        "CBC_ABC", "HAEM_ABS_ABC", "ABC",
        "CBC_ABC_HAEM_CBC_STANDALONE", "CBC_ABC_SYS_CBC_01", "SYS_CBC_ABC"
      ],
      exactNames: [
        "Absolute Basophil Count (ABC)", "ABC", "Absolute Basophil Count",
        "Absolute Basophils"
      ],
      patterns: [/\babc\b/i, /absolute\s+basophil/i],
      excludePatterns: [],
    });
    if (baso) {
      const abcVal = calcAbs(baso);
      abcTargets.forEach((t) => {
        calculatedIds.add(t.id);
        if (abcVal !== null) setCalc(t, abcVal);
      });
    }
  }

  // 2. LFT FORMULAS
  const tbili = fp({
    exactCodes: [
      "LFT_BIL_TOT", "LFT_TBILI", "BIO_TBILI",
      "BIO_LFT_PANEL_LFT_BIL_TOT", "SYS_LFT_BILI_TOT",
      "BIO_SERUM_BILIRUBIN", "BIO_SBIL_TOTAL", "TBILI",
    ],
    exactNames: ["Bilirubin Total", "Total Bilirubin", "Serum Bilirubin", "Bilirubin, Total", "Serum Bilirubin (Total)"],
    patterns: [/\btotal bilirubin\b/i, /\bbilirubin total\b/i, /\bt\.?bili\b/i, /^serum bilirubin$/i],
    excludePatterns: [/direct/i, /indirect/i, /unconjugated/i],
  });
  const dbili = fp({
    exactCodes: [
      "LFT_BIL_DIR", "LFT_DBILI", "BIO_DBILI",
      "BIO_LFT_PANEL_LFT_BIL_DIR", "SYS_LFT_BILI_DIR",
      "BIO_SBIL_DIRECT", "DBILI",
    ],
    exactNames: ["Bilirubin Direct", "Direct Bilirubin", "Conjugated Bilirubin", "Bilirubin Direct (Conjugated)", "Serum Bilirubin (Direct)"],
    patterns: [/\bdirect bilirubin\b/i, /\bbilirubin direct\b/i, /\bd\.?bili\b/i, /conjugated bilirubin/i],
    excludePatterns: [/indirect/i, /unconjugated/i],
  });
  const tprot = fp({
    exactCodes: [
      "LFT_TOT_PROT", "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN",
      "BIO_LFT_PANEL_LFT_TOT_PROT", "SYS_LFT_TOT_PROT", "TPROT",
    ],
    exactNames: ["Total Protein", "Serum Protein Total", "Serum Total Protein"],
    patterns: [/\btotal protein\b/i, /\bprotein total\b/i, /\bt\.?prot\b/i],
    excludePatterns: [/albumin/i, /globulin/i, /ratio/i],
  });
  const alb = fp({
    exactCodes: [
      "LFT_ALBUMIN", "BIO_ALBUMIN",
      "BIO_LFT_PANEL_LFT_ALBUMIN", "SYS_LFT_ALB",
      "BIO_053_ALB", "ALB",
    ],
    exactNames: ["Albumin", "Serum Albumin"],
    patterns: [/^albumin$/i, /^serum albumin$/i],
    excludePatterns: [/ratio/i, /\ba\s*[:\/]\s*g\b/i, /globulin/i, /creatinine/i, /urine/i, /micro/i],
  });
  const sgot = fp({
    exactCodes: [
      "LFT_SGOT", "BIO_SGOT",
      "BIO_LFT_PANEL_LFT_SGOT", "SYS_LFT_SGOT", "SYS_LFT_01_SGOT",
      "BIO_051_SGOT", "SGOT", "AST",
    ],
    exactNames: ["SGOT / AST", "SGOT", "AST", "Aspartate Aminotransferase", "SGOT (AST)", "SGOT / AST (Aspartate Aminotransferase)"],
    patterns: [/\bsgot\b/i, /\bast\b/i, /aspartate aminotransferase/i],
    excludePatterns: [/ratio/i, /\balt\b/i, /\bsgpt\b/i, /de ritis/i, /sgot\/sgpt/i],
  });
  const sgpt = fp({
    exactCodes: [
      "LFT_SGPT", "BIO_SGPT",
      "BIO_LFT_PANEL_LFT_SGPT", "SYS_LFT_SGPT", "SYS_LFT_01_SGPT",
      "BIO_050_SGPT", "SGPT", "ALT",
    ],
    exactNames: ["SGPT / ALT", "SGPT", "ALT", "Alanine Aminotransferase", "SGPT (ALT)", "SGPT / ALT (Alanine Aminotransferase)"],
    patterns: [/\bsgpt\b/i, /\balt\b/i, /alanine aminotransferase/i],
    excludePatterns: [/ratio/i, /\bast\b/i, /\bsgot\b/i, /de ritis/i, /sgot\/sgpt/i],
  });

  // Indirect Bilirubin = Total − Direct
  const ibiliTarget = fp({
    exactCodes: [
      "LFT_BIL_INDIR", "LFT_IBILI", "BIO_IBILI",
      "BIO_LFT_PANEL_LFT_BIL_INDIR", "SYS_LFT_BILI_IND",
      "BIO_SBIL_INDIRECT", "IBILI",
    ],
    exactNames: ["Bilirubin Indirect", "Indirect Bilirubin", "Unconjugated Bilirubin", "Bilirubin Indirect (Unconjugated)", "Serum Bilirubin (Indirect)"],
    patterns: [/\bindirect bilirubin\b/i, /\bbilirubin indirect\b/i, /\bunconjugated bilirubin\b/i, /\bi\.?bili\b/i],
    excludePatterns: [/\bconjugated bilirubin\b/i],
  });
  if (ibiliTarget && tbili && dbili) {
    calculatedIds.add(ibiliTarget.id);
    if (!isNaN(tbili.num) && !isNaN(dbili.num))
      setCalc(ibiliTarget, Math.max(0, tbili.num - dbili.num).toFixed(2));
  }

  // Globulin = Total Protein − Albumin
  const globTarget = fp({
    exactCodes: [
      "LFT_GLOBULIN", "BIO_GLOBULIN",
      "SYS_LFT_GLOB", "GLOBULIN",
    ],
    exactNames: ["Globulin", "Serum Globulin"],
    patterns: [/^globulin$/i, /^serum globulin$/i],
    excludePatterns: [/ratio/i, /\ba\s*[:\/]\s*g\b/i],
  });
  let calculatedGlob = 0;
  if (globTarget && tprot && alb) {
    calculatedIds.add(globTarget.id);
    if (!isNaN(tprot.num) && !isNaN(alb.num)) {
      calculatedGlob = Math.max(0, tprot.num - alb.num);
      setCalc(globTarget, calculatedGlob.toFixed(2));
    }
  }

  // A : G Ratio = Albumin / Globulin
  const agTarget = fp({
    exactCodes: ["LFT_AG_RATIO", "BIO_AG_RATIO", "AG_RATIO"],
    exactNames: ["A : G Ratio", "A/G Ratio", "Albumin / Globulin Ratio"],
    patterns: [/\ba\s*[:\/]\s*g\b/i, /albumin.*globulin.*ratio/i],
    excludePatterns: [],
  });
  if (agTarget && alb && (globTarget || tprot)) {
    calculatedIds.add(agTarget.id);
    if (!isNaN(alb.num)) {
      const globVal = calculatedGlob > 0 ? calculatedGlob
        : (globTarget ? parseFloat(currentValues[globTarget.id] ?? "")
          : (tprot && !isNaN(tprot.num) ? tprot.num - alb.num : NaN));
      if (!isNaN(globVal) && globVal > 0) setCalc(agTarget, (alb.num / globVal).toFixed(2));
    }
  }

  // SGOT / SGPT Ratio (De Ritis Ratio)
  const sgotSgptTarget = fp({
    exactCodes: ["LFT_AST_ALT_RATIO", "BIO_AST_ALT_RATIO", "AST_ALT_RATIO"],
    exactNames: ["SGOT / SGPT Ratio", "AST / ALT Ratio", "De Ritis Ratio"],
    patterns: [/sgot\s*[\/:]\s*sgpt/i, /ast\s*[\/:]\s*alt/i, /de ritis/i],
    excludePatterns: [],
  });
  if (sgotSgptTarget && sgot && sgpt) {
    calculatedIds.add(sgotSgptTarget.id);
    if (!isNaN(sgot.num) && !isNaN(sgpt.num) && sgpt.num > 0)
      setCalc(sgotSgptTarget, (sgot.num / sgpt.num).toFixed(2));
  }

  // 3. KFT FORMULAS
  const urea = fp({
    exactCodes: [
      "KFT_UREA", "BIO_UREA",
      "BIO_KFT_PANEL_KFT_UREA", "SYS_KFT_01_UREA", "SYS_KFT_UREA",
      "BIO_043_UREA", "UREA",
    ],
    exactNames: ["Blood Urea", "Serum Urea", "Urea"],
    patterns: [/\bblood urea\b/i, /^urea$/i, /^serum urea$/i],
    excludePatterns: [/nitrogen/i, /\bbun\b/i, /ratio/i, /creatinine/i],
  });
  const creat = fp({
    exactCodes: [
      "KFT_CREAT", "BIO_CREAT",
      "BIO_KFT_PANEL_KFT_CREAT", "SYS_KFT_01_CREA", "SYS_KFT_CREAT",
      "BIO_042_CREAT", "BIO_EGFR_CREAT", "BIO_148_EGFR_PANEL_BIO_EGFR_CREAT", "CREAT", "CREATININE",
    ],
    exactNames: ["Serum Creatinine", "Creatinine"],
    patterns: [/serum creatinine/i, /^creatinine$/i],
    excludePatterns: [/ratio/i, /bun/i, /clearance/i, /egfr/i, /urine/i],
  });

  // BUN = Blood Urea / 2.14   [WHO standard conversion]
  const bunTarget = fp({
    exactCodes: [
      "KFT_BUN", "BIO_BUN", "BIO_065_BUN",
      "BIO_KFT_PANEL_KFT_BUN", "SYS_KFT_BUN", "SYS_065_BUN", "BUN",
    ],
    exactNames: ["Blood Urea Nitrogen (BUN)", "BUN", "Blood Urea Nitrogen"],
    patterns: [/\bblood urea nitrogen\b/i, /\bbun\b/i],
    excludePatterns: [/ratio/i, /creatinine/i],
  });
  let calculatedBun = 0;
  if (bunTarget && urea) {
    calculatedIds.add(bunTarget.id);
    if (!isNaN(urea.num) && urea.num > 0) {
      calculatedBun = urea.num / 2.14;
      setCalc(bunTarget, calculatedBun.toFixed(1));
    }
  }

  // BUN / Creatinine Ratio
  const bunCreatTarget = fp({
    exactCodes: ["KFT_BUN_CREAT_RATIO", "BIO_BUN_CREAT_RATIO", "BUN_CREAT_RATIO"],
    exactNames: ["BUN / Creatinine Ratio", "BUN/Creatinine Ratio"],
    patterns: [/bun\s*[\/:]\s*creatinine/i, /bun.*creat.*ratio/i],
    excludePatterns: [],
  });
  if (bunCreatTarget && (urea || bunTarget) && creat) {
    calculatedIds.add(bunCreatTarget.id);
    if (!isNaN(creat.num) && creat.num > 0) {
      const bunVal = calculatedBun > 0 ? calculatedBun
        : (bunTarget ? parseFloat(currentValues[bunTarget.id] ?? "")
          : (urea && !isNaN(urea.num) ? urea.num / 2.14 : NaN));
      if (!isNaN(bunVal) && bunVal > 0) setCalc(bunCreatTarget, (bunVal / creat.num).toFixed(1));
    }
  }

  // Urea / Creatinine Ratio
  const ureaCreatTarget = fp({
    exactCodes: ["KFT_UREA_CREAT_RATIO", "BIO_UREA_CREAT_RATIO", "UREA_CREAT_RATIO"],
    exactNames: ["Urea / Creatinine Ratio", "Urea/Creatinine Ratio"],
    patterns: [/urea\s*[\/:]\s*creatinine/i, /urea.*creat.*ratio/i],
    excludePatterns: [/bun/i],
  });
  if (ureaCreatTarget && urea && creat) {
    calculatedIds.add(ureaCreatTarget.id);
    if (!isNaN(urea.num) && !isNaN(creat.num) && creat.num > 0) {
      setCalc(ureaCreatTarget, (urea.num / creat.num).toFixed(1));
    }
  }

  // eGFR (CKD-EPI 2021) & GFR Category (KDIGO)
  const egfrTarget = fp({
    exactCodes: [
      "KFT_EGFR", "BIO_EGFR", "BIO_EGFR_CALC",
      "BIO_148_EGFR_PANEL_BIO_EGFR_CALC", "SYS_KFT_EGFR", "EGFR",
    ],
    exactNames: ["eGFR (Estimated GFR)", "Calculated eGFR", "eGFR", "Estimated GFR"],
    patterns: [/\begfr\b/i, /estimated gfr/i, /estimated glomerular/i, /calculated egfr/i],
    excludePatterns: [/stage/i, /category/i, /kdigo/i, /creatinine/i],
  });
  const gfrStageTarget = fp({
    exactCodes: [
      "KFT_GFR_STAGE", "BIO_GFR_STAGE",
      "BIO_148_EGFR_PANEL_BIO_GFR_STAGE", "GFR_STAGE",
    ],
    exactNames: ["GFR Category (KDIGO)", "GFR Stage", "GFR Category"],
    patterns: [/gfr category/i, /gfr stage/i, /kdigo.*gfr/i],
    excludePatterns: [],
  });

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
    if (egfrTarget) setCalc(egfrTarget, egfrNumber);
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
  const tchol = fp({
    exactCodes: [
      "LIPID_CHOL", "BIO_055_CHOL", "BIO_LIPID_PANEL_LIPID_CHOL", "LIPID_TOTAL_CHOL", "BIO_TOTAL_CHOL",
      "SYS_LIPID_CHOL", "CHOL", "CHOLESTEROL", "TOTAL_CHOLESTEROL",
    ],
    exactNames: ["Total Cholesterol", "Cholesterol Total", "Cholesterol, Total", "Serum Cholesterol", "Cholesterol", "S. Cholesterol", "S. Total Cholesterol"],
    patterns: [/\btotal cholesterol\b/i, /\bcholesterol total\b/i, /^cholesterol$/i, /^serum cholesterol$/i, /^s\.?\s*cholesterol$/i],
    excludePatterns: [/\//, /ratio/i, /\bhdl\b/i, /\bldl\b/i, /\bvldl\b/i, /non.?hdl/i, /free cholesterol/i],
  });
  const tg = fp({
    exactCodes: [
      "LIPID_TRIG", "BIO_056_TG", "BIO_LIPID_PANEL_LIPID_TRIG", "LIPID_TRIGLYCERIDES", "BIO_TRIGLYCERIDES",
      "SYS_LIPID_TRIG", "TRIG", "TG",
    ],
    exactNames: ["Triglycerides", "Triglyceride", "Serum Triglycerides", "S. Triglycerides", "Triglycerides, Serum"],
    patterns: [/\btriglycerides?\b/i, /^tg$/i],
    excludePatterns: [/\//, /ratio/i, /thyroglobulin/i],
  });
  const hdl = fp({
    exactCodes: [
      "LIPID_HDL", "BIO_057_HDL", "BIO_LIPID_PANEL_LIPID_HDL",
      "SYS_LIPID_HDL", "SYS_LIP_01_HDL", "HDL",
    ],
    exactNames: ["HDL Cholesterol", "HDL - Cholesterol", "HDL Cholesterol (Direct)", "HDL - Cholesterol (Direct)", "Cholesterol, HDL", "HDL Direct", "HDL", "Serum HDL", "S. HDL Cholesterol"],
    patterns: [/\bhdl(\s*-\s*|\s+)cholesterol\b/i, /^hdl(\s+direct)?$/i, /\bhigh\s+density\s+lipoprotein\b/i],
    excludePatterns: [/\//, /ratio/i, /non.?hdl/i, /\bldl\b/i, /\bvldl\b/i, /\bchol.*\/.*hdl\b/i],
  });

  // VLDL = Triglycerides / 5   [Friedewald 1972]
  const vldlTarget = fp({
    exactCodes: [
      "LIPID_VLDL", "BIO_059_VLDL", "BIO_LIPID_PANEL_LIPID_VLDL",
      "SYS_LIPID_VLDL", "VLDL",
    ],
    exactNames: ["VLDL Cholesterol", "VLDL - Cholesterol", "VLDL", "Serum VLDL"],
    patterns: [/\bvldl(\s*-\s*|\s+)?(cholesterol)?\b/i],
    excludePatterns: [/\//, /ratio/i],
  });
  let calculatedVldl = 0;
  if (vldlTarget && tg) {
    calculatedIds.add(vldlTarget.id);
    if (!isNaN(tg.num) && tg.num > 0) {
      calculatedVldl = tg.num / 5;
      setCalc(vldlTarget, calculatedVldl.toFixed(1));
    }
  }

  // LDL = Total Cholesterol − HDL − VLDL   [Friedewald equation]
  const ldlTarget = fp({
    exactCodes: [
      "LIPID_LDL", "BIO_058_LDL", "BIO_LIPID_PANEL_LIPID_LDL",
      "SYS_LIPID_LDL", "SYS_LIP_01_LDL", "LDL",
    ],
    exactNames: ["LDL Cholesterol", "LDL Cholesterol (Calculated)", "LDL - Cholesterol", "LDL - Cholesterol (Calculated)", "Cholesterol, LDL", "LDL", "Serum LDL"],
    patterns: [/\bldl(\s*-\s*|\s+)?cholesterol(\s*\([a-z\s]+\))?\b/i, /^ldl(\s*\([a-z\s]+\))?$/i],
    excludePatterns: [/\//, /ratio/i, /\bvldl\b/i, /\bhdl\b/i],
  });
  let calculatedLdl = 0;
  if (ldlTarget && tchol && hdl) {
    calculatedIds.add(ldlTarget.id);
    if (!isNaN(tchol.num) && !isNaN(hdl.num)) {
      const vldlVal = calculatedVldl > 0 ? calculatedVldl
        : (tg && !isNaN(tg.num) ? tg.num / 5
          : (vldlTarget ? parseFloat(currentValues[vldlTarget.id] ?? "") || 0 : 0));
      calculatedLdl = Math.max(0, tchol.num - hdl.num - vldlVal);
      setCalc(ldlTarget, calculatedLdl.toFixed(1));
    }
  }

  // Non-HDL = Total Cholesterol − HDL
  const nonHdlTarget = fp({
    exactCodes: [
      "LIPID_NON_HDL", "BIO_124_NONHDL", "BIO_LIPID_PANEL_LIPID_NON_HDL",
      "SYS_LIPID_NON_HDL",
    ],
    exactNames: ["Non-HDL Cholesterol", "Non HDL Cholesterol", "Non-HDL", "Non HDL", "Non-HDL cholesterol", "Non HDL cholesterol"],
    patterns: [/\bnon[\s\-_]*hdl(\s+cholesterol)?\b/i],
    excludePatterns: [/\//, /ratio/i],
  });
  if (nonHdlTarget && tchol && hdl) {
    calculatedIds.add(nonHdlTarget.id);
    if (!isNaN(tchol.num) && !isNaN(hdl.num))
      setCalc(nonHdlTarget, Math.max(0, tchol.num - hdl.num).toFixed(1));
  }

  // Total Chol / HDL Ratio
  const cholHdlTarget = fp({
    exactCodes: [
      "LIPID_CHOL_HDL_RATIO", "BIO_061_CHOL_HDL", "BIO_LIPID_PANEL_LIPID_CHOL_HDL_RATIO",
      "SYS_LIPID_CHOL_HDL_RATIO",
    ],
    exactNames: ["Total Chol / HDL Ratio", "Total Cholesterol / HDL", "TC / HDL Ratio", "Total Cholesterol / HDL Ratio", "Cholesterol / HDL Ratio", "Total Chol / HDL", "TC/HDL"],
    patterns: [/\b(total\s+chol(esterol)?|tc)\s*[\/:]\s*hdl\b/i, /\bchol(esterol)?\s*[\/:]\s*hdl\s*(ratio)?\b/i],
    excludePatterns: [/\bldl\b/i],
  });
  if (cholHdlTarget && tchol && hdl) {
    calculatedIds.add(cholHdlTarget.id);
    if (!isNaN(tchol.num) && !isNaN(hdl.num) && hdl.num > 0)
      setCalc(cholHdlTarget, (tchol.num / hdl.num).toFixed(2));
  }

  // LDL / HDL Ratio
  const ldlHdlTarget = fp({
    exactCodes: [
      "LIPID_LDL_HDL_RATIO", "BIO_060_LDL_HDL", "BIO_LIPID_PANEL_LIPID_LDL_HDL_RATIO",
      "SYS_LIPID_LDL_HDL_RATIO",
    ],
    exactNames: ["LDL / HDL Ratio", "LDL / HDL", "LDL/HDL Ratio", "LDL/HDL"],
    patterns: [/\bldl\s*[\/:]\s*hdl\b/i, /\bldl.*hdl.*ratio\b/i],
    excludePatterns: [],
  });
  if (ldlHdlTarget && hdl && (tchol || ldlTarget)) {
    calculatedIds.add(ldlHdlTarget.id);
    if (!isNaN(hdl.num) && hdl.num > 0) {
      const ldlVal = calculatedLdl > 0 ? calculatedLdl : (ldlTarget ? parseFloat(currentValues[ldlTarget.id] ?? "") : NaN);
      if (!isNaN(ldlVal) && ldlVal > 0) setCalc(ldlHdlTarget, (ldlVal / hdl.num).toFixed(2));
    }
  }

  // TG / HDL Ratio
  const tgHdlTarget = fp({
    exactCodes: [
      "BIO_062_TG_HDL", "LIPID_TG_HDL_RATIO",
      "SYS_LIPID_TG_HDL_RATIO",
    ],
    exactNames: ["TG / HDL", "TG/HDL Ratio", "TG / HDL Ratio", "Triglycerides / HDL", "Triglycerides / HDL Ratio", "TG/HDL"],
    patterns: [/\b(tg|triglycerides?)\s*[\/:]\s*hdl\b/i],
    excludePatterns: [],
  });
  if (tgHdlTarget && tg && hdl) {
    calculatedIds.add(tgHdlTarget.id);
    if (!isNaN(tg.num) && !isNaN(hdl.num) && hdl.num > 0)
      setCalc(tgHdlTarget, (tg.num / hdl.num).toFixed(2));
  }

  // 5. COAGULATION (PT / INR & APTT RATIO)
  const ptPat = fp({
    exactCodes: ["HAEM_PT_PAT", "SYS_COAG_PT_PAT", "COAG_PT_PAT"],
    exactNames: ["PT (Patient)", "PT", "Prothrombin Time (Patient)", "Prothrombin Time"],
    patterns: [/\bpt\s*\(patient\)/i, /^prothrombin\s+time(\s*\(patient\))?$/i],
    excludePatterns: [/control/i, /inr/i, /ratio/i],
  });
  const ptCtrl = fp({
    exactCodes: ["HAEM_PT_CTRL", "SYS_COAG_PT_CTRL", "COAG_PT_CTRL"],
    exactNames: ["PT (Control)", "Control PT", "Prothrombin Time (Control)"],
    patterns: [/\bpt\s*\(control\)/i, /control.*pt/i],
    excludePatterns: [/inr/i, /ratio/i],
  });
  const inrTarget = fp({
    exactCodes: ["HAEM_PT_INR", "COAG_INR", "SYS_COAG_INR"],
    exactNames: ["INR (International Normalized Ratio)", "INR", "International Normalized Ratio"],
    patterns: [/\binr\b/i, /international\s+normalized\s+ratio/i],
    excludePatterns: [],
  });
  if (inrTarget && ptPat && ptCtrl) {
    calculatedIds.add(inrTarget.id);
    if (!isNaN(ptPat.num) && !isNaN(ptCtrl.num) && ptCtrl.num > 0) {
      setCalc(inrTarget, (ptPat.num / ptCtrl.num).toFixed(2));
    }
  }

  const apttPat = fp({
    exactCodes: ["HAEM_APTT_PAT", "SYS_COAG_APTT_PAT", "COAG_APTT_PAT"],
    exactNames: ["APTT (Patient)", "APTT", "Activated Partial Thromboplastin Time"],
    patterns: [/\baptt\s*\(patient\)/i, /^aptt$/i],
    excludePatterns: [/control/i, /ratio/i],
  });
  const apttCtrl = fp({
    exactCodes: ["HAEM_APTT_CTRL", "SYS_COAG_APTT_CTRL", "COAG_APTT_CTRL"],
    exactNames: ["APTT (Control)", "Control APTT"],
    patterns: [/\baptt\s*\(control\)/i, /control.*aptt/i],
    excludePatterns: [/ratio/i],
  });
  const apttRatioTarget = fp({
    exactCodes: ["HAEM_APTT_RATIO", "COAG_APTT_RATIO", "SYS_COAG_APTT_RATIO"],
    exactNames: ["Ratio (Patient / Control)", "APTT Ratio", "APTT Ratio (Patient / Control)"],
    patterns: [/aptt\s*ratio/i, /ratio\s*\(patient\s*[\/:]\s*control\)/i],
    excludePatterns: [],
  });
  if (apttRatioTarget && apttPat && apttCtrl) {
    calculatedIds.add(apttRatioTarget.id);
    if (!isNaN(apttPat.num) && !isNaN(apttCtrl.num) && apttCtrl.num > 0) {
      setCalc(apttRatioTarget, (apttPat.num / apttCtrl.num).toFixed(2));
    }
  }

  // 6. HbA1c
  const hba1c = fp({
    exactCodes: [
      "HBA1C_VAL", "BIO_HBA1C_VAL", "BIO_HBA1C", "HBA1C_VALUE",
      "BIO_076_HBA1C_BIO_HBA1C_VAL", "BIO_HBA1C_HBA1C_VAL",
      "BIO_076_HBA1C", "SYS_HBA1C_VAL", "HBA1C",
    ],
    exactNames: ["HbA1c Glycated Hemoglobin", "HbA1c (Glycosylated Hemoglobin)", "HbA1c", "Glycated Hemoglobin", "HbA1c (Glycated Hemoglobin)", "Glycated Hemoglobin (HbA1c)"],
    patterns: [/\bhba1c\b/i, /glycated h[ae]moglobin/i, /glycosylated h[ae]moglobin/i],
    excludePatterns: [/eag/i, /average glucose/i],
  });
  const eagTarget = fp({
    exactCodes: [
      "HBA1C_EAG", "BIO_HBA1C_EAG", "SYS_HBA1C_01_EAG", "EAG",
    ],
    exactNames: ["Estimated Average Glucose (eAG)", "eAG", "Estimated Average Glucose"],
    patterns: [/estimated average glucose/i, /\beag\b/i],
    excludePatterns: [],
  });
  if (eagTarget && hba1c) {
    calculatedIds.add(eagTarget.id);
    if (!isNaN(hba1c.num) && hba1c.num > 0) {
      const eagVal = Math.round((28.7 * hba1c.num) - 46.7);
      if (eagVal > 0) setCalc(eagTarget, eagVal);
    }
  }

  // 7. IRON STUDIES
  const iron = fp({
    exactCodes: ["SYS_IRON_SERUM", "BIO_121_IRON", "IRON_SERUM", "IRON"],
    exactNames: ["Serum Iron", "Iron", "Iron, Serum"],
    patterns: [/^serum iron$/i, /^iron$/i],
    excludePatterns: [/tibc/i, /uibc/i, /binding/i, /saturation/i, /ferritin/i],
  });
  const tibc = fp({
    exactCodes: ["SYS_IRON_TIBC", "BIO_122_TIBC", "IRON_TIBC", "TIBC"],
    exactNames: ["Total Iron Binding Capacity (TIBC)", "TIBC", "Total Iron Binding Capacity"],
    patterns: [/total iron binding capacity/i, /\btibc\b/i],
    excludePatterns: [/unsaturated/i, /\buibc\b/i, /saturation/i],
  });

  const uibcTarget = fp({
    exactCodes: ["SYS_IRON_UIBC", "IRON_UIBC", "BIO_125_UIBC", "UIBC"],
    exactNames: ["Unsaturated Iron Binding Capacity (UIBC)", "UIBC", "Unsaturated Iron Binding Capacity"],
    patterns: [/unsaturated iron binding/i, /\buibc\b/i],
    excludePatterns: [],
  });
  if (uibcTarget && iron && tibc) {
    calculatedIds.add(uibcTarget.id);
    if (!isNaN(tibc.num) && !isNaN(iron.num))
      setCalc(uibcTarget, Math.max(0, tibc.num - iron.num).toFixed(1));
  }

  const transSatTarget = fp({
    exactCodes: ["IRON_SATURATION", "BIO_123_TSAT", "TSAT"],
    exactNames: ["Transferrin Saturation", "Iron Saturation", "% Transferrin Saturation"],
    patterns: [/transferrin saturation/i, /iron saturation/i],
    excludePatterns: [],
  });
  if (transSatTarget && iron && tibc) {
    calculatedIds.add(transSatTarget.id);
    if (!isNaN(iron.num) && !isNaN(tibc.num) && tibc.num > 0)
      setCalc(transSatTarget, ((iron.num / tibc.num) * 100).toFixed(1));
  }

  // 8. URINE RATIOS
  const uProt = fp({
    exactCodes: ["BIO_138_UPCR_PROT", "URINE_PROTEIN", "URINE_PROT"],
    exactNames: ["Urine Protein", "Protein, Urine"],
    patterns: [/\burine\s+protein\b/i],
    excludePatterns: [/creatinine/i, /ratio/i],
  });
  const uAlb = fp({
    exactCodes: ["BIO_081_UACR_ALB", "URINE_MICROALBUMIN", "URINE_ALBUMIN"],
    exactNames: ["Urine Albumin", "Microalbumin, Urine", "Urine Microalbumin"],
    patterns: [/\burine\s+(micro)?albumin\b/i],
    excludePatterns: [/creatinine/i, /ratio/i],
  });
  const uCreat = fp({
    exactCodes: ["BIO_138_UPCR_CREAT", "URINE_CREATININE", "BIO_081_UACR_CREAT"],
    exactNames: ["Urine Creatinine", "Creatinine, Urine"],
    patterns: [/\burine\s+creatinine\b/i],
    excludePatterns: [/protein/i, /albumin/i, /ratio/i],
  });
  const upcrTarget = fp({
    exactCodes: ["BIO_138_UPCR", "URINE_PCR_RATIO"],
    exactNames: ["Urine Protein Creatinine Ratio", "Protein / Creatinine Ratio (UPCR)", "Protein / Creatinine Ratio"],
    patterns: [/urine\s+protein\s+creatinine\s+ratio/i, /protein\s*[\/:]\s*creatinine\s*ratio/i, /\bupcr\b/i],
    excludePatterns: [],
  });
  if (upcrTarget && uProt && uCreat) {
    calculatedIds.add(upcrTarget.id);
    if (!isNaN(uProt.num) && !isNaN(uCreat.num) && uCreat.num > 0) {
      setCalc(upcrTarget, (uProt.num / uCreat.num).toFixed(2));
    }
  }

  const uacrTarget = fp({
    exactCodes: ["BIO_UACR_RATIO", "BIO_081_UACR", "URINE_ACR_RATIO"],
    exactNames: ["Albumin / Creatinine Ratio (UACR)", "Microalbumin Creatinine Ratio", "Albumin / Creatinine Ratio"],
    patterns: [/albumin\s*[\/:]\s*creatinine\s*ratio/i, /\buacr\b/i, /microalbumin\s*[\/:]\s*creatinine/i],
    excludePatterns: [],
  });
  if (uacrTarget && uAlb && uCreat) {
    calculatedIds.add(uacrTarget.id);
    if (!isNaN(uAlb.num) && !isNaN(uCreat.num) && uCreat.num > 0) {
      setCalc(uacrTarget, (uAlb.num / uCreat.num).toFixed(2));
    }
  }

  // 9. SEMEN ANALYSIS
  const semVol = fp({
    exactCodes: ["SEMEN_VOLUME", "SEM_VOLUME"],
    exactNames: ["Volume", "Semen Volume", "Quantity"],
    patterns: [/^volume$/i, /semen volume/i, /^quantity$/i],
    excludePatterns: [/sperm/i, /count/i],
  });
  const semCount = fp({
    exactCodes: ["SEM_SPERM_COUNT", "SEMEN_TOTAL_COUNT"],
    exactNames: ["Total Sperm Count", "Sperm Concentration"],
    patterns: [/total sperm count$/i, /sperm concentration/i],
    excludePatterns: [/ejaculate/i, /number/i],
  });
  const semProg = fp({
    exactCodes: ["SEMEN_PROG_MOTILE"],
    exactNames: ["Progressive Motile", "Motility (Progressive)"],
    patterns: [/progressive motile/i, /motility.*progressive/i],
    excludePatterns: [/non/i, /total/i],
  });
  const semNonProg = fp({
    exactCodes: ["SEMEN_NON_PROG_MOTILE"],
    exactNames: ["Non-Progressive", "Non Progressive", "Non-Progressive Motility"],
    patterns: [/non.progressive/i],
    excludePatterns: [/total/i],
  });

  const semEjacTarget = fp({
    exactCodes: ["CP_SEM_TOT_NUM", "SEMEN_EJACULATE_COUNT"],
    exactNames: ["Total Sperm Number / Ejaculate", "Total Sperm Count per Ejaculate"],
    patterns: [/total sperm.*ejaculate/i, /sperm number.*ejaculate/i],
    excludePatterns: [],
  });
  if (semEjacTarget && semVol && semCount) {
    calculatedIds.add(semEjacTarget.id);
    if (!isNaN(semVol.num) && !isNaN(semCount.num))
      setCalc(semEjacTarget, (semVol.num * semCount.num).toFixed(1));
  }

  const semMotTarget = fp({
    exactCodes: ["SEMEN_TOTAL_MOTILITY"],
    exactNames: ["Total Motile", "Total Motility"],
    patterns: [/total motile/i, /total motility/i],
    excludePatterns: [],
  });
  if (semMotTarget && semProg && semNonProg) {
    calculatedIds.add(semMotTarget.id);
    if (!isNaN(semProg.num) && !isNaN(semNonProg.num))
      setCalc(semMotTarget, (semProg.num + semNonProg.num).toFixed(1));
  }

  return { calculatedValues, calculatedIds };
}
