/**
 * OnePath Lab - Standard Clinical Investigation & Parameter Sequencing Engine
 * 
 * Enforces traditional pathology sequencing across:
 * 1. Result Entry (/reports/[id]/edit)
 * 2. Report Sheet & PDF (/components/report-sheet)
 * 3. Fullscreen Print Preview (/components/fullscreen-print-report-modal)
 */

export function getClinicalTestPriority(mainTestName: string, category?: string): number {
  const name = (mainTestName || "").trim().toLowerCase();
  const cat = (category || "").trim().toLowerCase();

  // 1. Hematology - Complete Blood Count (CBC) / Hemogram Top Priority
  if (
    name.includes("complete blood count") ||
    name.includes("cbc") ||
    name.includes("hemogram") ||
    name.includes("haemogram") ||
    name.includes("complete hemogram")
  ) {
    return 10;
  }

  // 2. Absolute Leukocyte / Differential Count / Smear
  if (
    name.includes("differential leukocyte") ||
    name.includes("peripheral smear") ||
    name.includes("blood smear") ||
    name.includes("pbs")
  ) {
    return 15;
  }

  // 3. ESR (Erythrocyte Sedimentation Rate)
  if (
    name.includes("erythrocyte sedimentation rate") ||
    name.includes("esr")
  ) {
    return 20;
  }

  // 4. Blood Grouping & Rh Typing
  if (
    name.includes("blood group") ||
    name.includes("rh factor") ||
    name.includes("abo & rh") ||
    name.includes("abo and rh")
  ) {
    return 25;
  }

  // 5. Coagulation / Hemostasis Profile
  if (
    name.includes("prothrombin") ||
    name.includes("pt/inr") ||
    name.includes("pt-inr") ||
    name.includes("aptt") ||
    name.includes("coagulation") ||
    name.includes("bleeding time") ||
    name.includes("clotting time") ||
    name.includes("d-dimer") ||
    name.includes("fibrinogen")
  ) {
    return 30;
  }

  // 6. Other General Hematology
  if (
    cat.includes("haemat") ||
    cat.includes("hemat") ||
    name.includes("platelet") ||
    name.includes("reticulocyte") ||
    name.includes("malarial parasite") ||
    name.includes("mp smear")
  ) {
    return 35;
  }

  // 7. Glucose & Diabetes Panel (Strict Traditional Medical Order: Fasting -> 1hr -> PP -> Random -> HbA1c)
  // Fasting Sugar MUST ALWAYS COME FIRST
  if (
    name.includes("fasting blood sugar") ||
    name.includes("fasting blood glucose") ||
    name.includes("fasting glucose") ||
    name.includes("sugar fasting") ||
    name.includes("glucose fasting") ||
    name.includes("blood sugar (fasting)") ||
    name.includes("fbs")
  ) {
    return 41;
  }

  // 1/2 Hour or 1 Hour Glucose (GTT / Pregnancy screening)
  if (
    name.includes("1 hour blood sugar") ||
    name.includes("1/2 hour blood sugar") ||
    name.includes("1.5 hour blood sugar") ||
    name.includes("1 hour glucose") ||
    name.includes("1-hour")
  ) {
    return 43;
  }

  // Post Prandial Sugar (PPBS) MUST ALWAYS COME AFTER FASTING
  if (
    name.includes("post prandial") ||
    name.includes("blood sugar pp") ||
    name.includes("sugar pp") ||
    name.includes("pp blood sugar") ||
    name.includes("ppbs") ||
    name.includes("glucose pp") ||
    name.includes("blood glucose pp") ||
    name.includes("blood sugar (pp)") ||
    name.includes("2 hour blood sugar") ||
    name.includes("2 hour glucose")
  ) {
    return 45;
  }

  // Random Blood Sugar (RBS)
  if (
    name.includes("random blood sugar") ||
    name.includes("random blood glucose") ||
    name.includes("random glucose") ||
    name.includes("blood sugar random") ||
    name.includes("rbs")
  ) {
    return 46;
  }

  // HbA1c (Glycosylated Hemoglobin)
  if (
    name.includes("hba1c") ||
    name.includes("glycated hemoglobin") ||
    name.includes("glycosylated hemoglobin")
  ) {
    return 47;
  }

  // Average Blood Glucose (eAG)
  if (name.includes("eag") || name.includes("estimated average glucose")) {
    return 48;
  }

  // Glucose Tolerance Test (GTT)
  if (name.includes("glucose tolerance") || name.includes("gtt")) {
    return 49;
  }

  // 8. Liver Function Test (LFT) / Hepatic Panel
  if (
    name.includes("liver function") ||
    name.includes("lft") ||
    name.includes("hepatic") ||
    name.includes("liver panel")
  ) {
    return 50;
  }

  // 9. Kidney / Renal Function Test (KFT / RFT)
  if (
    name.includes("kidney function") ||
    name.includes("kft") ||
    name.includes("renal function") ||
    name.includes("rft") ||
    name.includes("renal panel")
  ) {
    return 55;
  }

  // 10. Electrolytes Panel (Serum Electrolytes)
  if (
    name.includes("electrolyte") ||
    name.includes("sodium potassium") ||
    name.includes("serum electrolytes")
  ) {
    return 60;
  }

  // 11. Lipid Profile / Cardiovascular Risk Panel
  if (
    name.includes("lipid") ||
    name.includes("cholesterol") ||
    name.includes("lipid profile")
  ) {
    return 65;
  }

  // 12. Cardiac Markers (Troponin, CK-MB, CPK, LDH, Myoglobin)
  if (
    name.includes("troponin") ||
    name.includes("ck-mb") ||
    name.includes("ck mb") ||
    name.includes("cpk") ||
    name.includes("cardiac") ||
    name.includes("ldh")
  ) {
    return 70;
  }

  // 13. Thyroid Profile / Endocrine Axis (T3, T4, TSH)
  if (
    name.includes("thyroid") ||
    name.includes("tft") ||
    name.includes("t3 t4 tsh") ||
    name.includes("tsh")
  ) {
    return 75;
  }

  // 14. Reproductive & Hormonal Diagnostics (FSH, LH, Prolactin, Testosterone, Beta-hCG, AMH)
  if (
    name.includes("beta hcg") ||
    name.includes("beta-hcg") ||
    name.includes("prolactin") ||
    name.includes("fsh") ||
    name.includes("lh") ||
    name.includes("testosterone") ||
    name.includes("amh") ||
    name.includes("estrogen") ||
    name.includes("progesterone") ||
    name.includes("cortisol") ||
    name.includes("insulin") ||
    cat.includes("hormone") ||
    cat.includes("endocrin")
  ) {
    return 80;
  }

  // 15. Vitamins & Minerals (Vitamin D, B12, Calcium, Phosphorus, Iron Studies, Ferritin)
  if (
    name.includes("vitamin d") ||
    name.includes("vitamin b12") ||
    name.includes("vit d") ||
    name.includes("vit b12") ||
    name.includes("iron profile") ||
    name.includes("iron studies") ||
    name.includes("ferritin") ||
    name.includes("calcium") ||
    name.includes("phosphorus") ||
    name.includes("magnesium") ||
    name.includes("zinc")
  ) {
    return 85;
  }

  // 16. Pancreatic & Other Special Biochemistry
  if (
    name.includes("amylase") ||
    name.includes("lipase") ||
    cat.includes("bio") ||
    cat.includes("chem")
  ) {
    return 88;
  }

  // 17. Infectious Disease & Fever Serology (Widal, Typhoid, Dengue, Chikungunya, Malaria)
  if (
    name.includes("widal") ||
    name.includes("typhoid") ||
    name.includes("typhidot") ||
    name.includes("dengue") ||
    name.includes("chikungunya") ||
    name.includes("malaria antigen")
  ) {
    return 90;
  }

  // 18. Viral & Transmissible Serology (HIV, HBsAg, HCV, VDRL, Syphilis)
  if (
    name.includes("hiv") ||
    name.includes("hbsag") ||
    name.includes("hcv") ||
    name.includes("vdrl") ||
    name.includes("rpr") ||
    name.includes("tpha")
  ) {
    return 95;
  }

  // 19. Inflammatory, Autoimmune & Rheumatology (CRP, RA Factor, ASO Titre, ANA)
  if (
    name.includes("crp") ||
    name.includes("c-reactive protein") ||
    name.includes("ra factor") ||
    name.includes("rheumatoid") ||
    name.includes("aso titre") ||
    name.includes("aso") ||
    name.includes("ana") ||
    cat.includes("serol") ||
    cat.includes("immun")
  ) {
    return 100;
  }

  // 20. Urine Routine & Microscopy
  if (
    name.includes("urine routine") ||
    name.includes("urine examination") ||
    name.includes("complete urine") ||
    name.includes("urinalysis") ||
    name.includes("urine r/e") ||
    name.includes("urine r/m")
  ) {
    return 110;
  }

  // 21. Stool Routine & Occult Blood
  if (
    name.includes("stool routine") ||
    name.includes("stool examination") ||
    name.includes("stool occult") ||
    name.includes("stool r/e")
  ) {
    return 120;
  }

  // 22. Semen Analysis
  if (name.includes("semen analysis") || name.includes("seminal fluid")) {
    return 130;
  }

  // 23. Microbiology / Cultures & Sensitivity
  if (
    name.includes("culture") ||
    name.includes("sensitivity") ||
    name.includes("gram stain") ||
    name.includes("afb") ||
    name.includes("sputum") ||
    name.includes("swab") ||
    cat.includes("micro")
  ) {
    return 140;
  }

  // 24. Other Clinical Pathology
  if (cat.includes("path") || cat.includes("clinical")) {
    return 150;
  }

  // 25. General / Unspecified
  return 200;
}

/**
 * Parameter-level clinical sequencing for subtests inside panels.
 * Ensures Fasting Sugar appears before Post Prandial Sugar,
 * Hemoglobin appears at top of CBC, Bilirubin Total at top of LFT, etc.
 */
export function getClinicalParameterPriority(paramName: string): number {
  const name = (paramName || "").trim().toLowerCase();

  // Glucose Parameters
  if (name.includes("fasting") || name.includes("fbs")) return 10;
  if (name.includes("1/2 hour") || name.includes("1 hour")) return 12;
  if (name.includes("1.5 hour")) return 14;
  if (name.includes("post prandial") || name.includes("pp") || name.includes("2 hour") || name.includes("ppbs")) return 20;
  if (name.includes("random") || name.includes("rbs")) return 25;
  if (name.includes("hba1c") || name.includes("glycated")) return 30;
  if (name.includes("eag")) return 32;

  // CBC Parameters
  if (name.includes("hemoglobin") || name.includes("haemoglobin") || name.includes("hb")) return 100;
  if (name.includes("rbc count") || name.includes("total rbc") || name.includes("red blood cell count")) return 102;
  if (name.includes("pcv") || name.includes("packed cell") || name.includes("hematocrit") || name.includes("hct")) return 104;
  if (name.includes("mcv") || name.includes("mean corpuscular volume")) return 106;
  if (name.includes("mchc")) return 110; // Check MCHC before MCH
  if (name.includes("mch") || name.includes("mean corpuscular hemoglobin")) return 108;
  if (name.includes("rdw-cv") || name.includes("rdw cv") || (name.includes("rdw") && !name.includes("sd"))) return 112;
  if (name.includes("rdw-sd") || name.includes("rdw sd")) return 114;

  if (name.includes("total leukocyte count") || name.includes("tlc") || name.includes("wbc count") || name.includes("white blood cell")) return 120;
  
  // Differential Counts (%)
  if (name.includes("neutrophil") || name.includes("polymorph")) return 130;
  if (name.includes("lymphocyte")) return 132;
  if (name.includes("monocyte")) return 134;
  if (name.includes("eosinophil")) return 136;
  if (name.includes("basophil")) return 138;

  // Absolute Counts
  if (name.includes("anc") || name.includes("absolute neutrophil")) return 140;
  if (name.includes("alc") || name.includes("absolute lymphocyte")) return 142;
  if (name.includes("amc") || name.includes("absolute monocyte")) return 144;
  if (name.includes("aec") || name.includes("absolute eosinophil")) return 146;
  if (name.includes("abc") || name.includes("absolute basophil")) return 148;
  if (name.includes("nlr") || name.includes("ratio")) return 150;

  // Platelets
  if (name.includes("platelet count") || name.includes("platelets")) return 160;
  if (name.includes("mpv") || name.includes("mean platelet")) return 162;
  if (name.includes("pct") || name.includes("plateletcrit")) return 164;

  // LFT Parameters
  if (name.includes("bilirubin") && name.includes("total")) return 200;
  if (name.includes("bilirubin") && name.includes("direct")) return 202;
  if (name.includes("bilirubin") && (name.includes("indirect") || name.includes("unconjugated"))) return 204;
  if (name.includes("sgot") || name.includes("ast") || name.includes("aspartate")) return 210;
  if (name.includes("sgpt") || name.includes("alt") || name.includes("alanine")) return 212;
  if (name.includes("sgot/sgpt") || name.includes("ast/alt") || name.includes("de ritis")) return 214;
  if (name.includes("alkaline phosphatase") || name.includes("alp")) return 220;
  if (name.includes("total protein") || name.includes("protein, total")) return 230;
  if (name.includes("albumin")) return 232;
  if (name.includes("globulin")) return 234;
  if (name.includes("a:g") || name.includes("a/g") || name.includes("albumin/globulin")) return 236;
  if (name.includes("ggtp") || name.includes("ggt") || name.includes("gamma")) return 240;

  // KFT Parameters
  if (name.includes("blood urea") || name.includes("urea")) return 300;
  if (name.includes("bun") || name.includes("urea nitrogen")) return 302;
  if (name.includes("creatinine") || name.includes("serum creat")) return 310;
  if (name.includes("bun/creatinine") || name.includes("bun : creatinine")) return 312;
  if (name.includes("uric acid") || name.includes("serum uric")) return 320;
  if (name.includes("egfr") || name.includes("estimated gfr")) return 330;
  if (name.includes("gfr stage") || name.includes("gfr category")) return 332;

  // Lipid Parameters
  if (name.includes("cholesterol") && name.includes("total")) return 400;
  if (name.includes("triglyceride")) return 402;
  if (name.includes("hdl")) return 404;
  if (name.includes("ldl") && !name.includes("hdl")) return 406;
  if (name.includes("vldl")) return 408;
  if (name.includes("non-hdl") || name.includes("non hdl")) return 410;
  if (name.includes("chol/hdl") || name.includes("total cholesterol/hdl")) return 412;
  if (name.includes("ldl/hdl") || name.includes("ldl : hdl")) return 414;

  // Thyroid Parameters
  if (name.includes("total t3") || (name.includes("t3") && !name.includes("free"))) return 500;
  if (name.includes("total t4") || (name.includes("t4") && !name.includes("free"))) return 502;
  if (name.includes("tsh")) return 504;
  if (name.includes("free t3") || name.includes("ft3")) return 506;
  if (name.includes("free t4") || name.includes("ft4")) return 508;

  // Default fallback
  return 1000;
}

export type ClinicalTestItem = string | { name: string; category?: string };

/**
 * Standard comparator to sort main tests cleanly across results entry & report printing.
 */
export function compareClinicalTests(
  itemA: ClinicalTestItem,
  itemB: ClinicalTestItem,
  catA?: string,
  catB?: string
): number {
  const nameA = typeof itemA === "string" ? itemA : (itemA?.name || "");
  const nameB = typeof itemB === "string" ? itemB : (itemB?.name || "");
  const categoryA = typeof itemA === "object" ? itemA?.category : catA;
  const categoryB = typeof itemB === "object" ? itemB?.category : catB;

  const pA = getClinicalTestPriority(nameA, categoryA);
  const pB = getClinicalTestPriority(nameB, categoryB);
  if (pA !== pB) return pA - pB;
  return (nameA || "").localeCompare(nameB || "");
}

/**
 * Standard comparator for parameters within a test or subgroup.
 */
export function compareClinicalParameters(itemA: any, itemB: any): number {
  const testA = itemA?.test || itemA;
  const testB = itemB?.test || itemB;

  const orderA = testA?.sort_order ?? testA?.sortOrder ?? 0;
  const orderB = testB?.sort_order ?? testB?.sortOrder ?? 0;

  // If explicit distinct sort_order exists, respect it
  if (orderA !== orderB && orderA !== 0 && orderB !== 0) {
    return orderA - orderB;
  }

  // Clinical priority fallback (ensures Fasting Sugar is before PP, Hb before TLC, etc.)
  const prioA = getClinicalParameterPriority(testA?.name || "");
  const prioB = getClinicalParameterPriority(testB?.name || "");
  if (prioA !== prioB) {
    return prioA - prioB;
  }

  if (orderA !== 0 && orderB === 0) return -1;
  if (orderA === 0 && orderB !== 0) return 1;

  return (testA?.name || "").localeCompare(testB?.name || "");
}
