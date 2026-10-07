/**
 * Clinical Test Helper & Category Validator
 * 
 * Accurately classifies clinical laboratory investigations:
 * - Prevents standard quantitative/analyte parameters (Glucose, Bilirubin, Lipids, CBC, etc.)
 *   from ever being erroneously flagged as "Custom Editor" or "Culture Layout".
 * - Ensures genuine narrative templates (Microbiology Culture & Sensitivity, Widal Slide,
 *   Histopathology, Cytology, FNAC) retain their rich-text / custom-table editors.
 */

const STANDARD_ANALYTE_KEYWORDS = [
  // Carbohydrate metabolism / Diabetes
  "sugar",
  "glucose",
  "fbs",
  "ppbs",
  "rbs",
  "gtt",
  "pgtt",
  "ogtt",
  "hba1c",
  "glycated",
  "insulin",
  "c-peptide",
  "c peptide",

  // Lipid profile
  "lipid",
  "cholesterol",
  "triglyceride",
  "hdl",
  "ldl",
  "vldl",

  // Liver function
  "bilirubin",
  "sgot",
  "sgpt",
  "ast",
  "alt",
  "alkaline phosphatase",
  "alp",
  "protein",
  "albumin",
  "globulin",
  "a:g ratio",
  "ggt",
  "lft",

  // Kidney function & Electrolytes
  "urea",
  "bun",
  "creatinine",
  "uric acid",
  "kft",
  "rft",
  "sodium",
  "potassium",
  "chloride",
  "calcium",
  "phosphorus",
  "magnesium",
  "electrolyte",

  // Hematology & Hemogram
  "complete blood count",
  "cbc",
  "hemogram",
  "haemogram",
  "hemoglobin",
  "haemoglobin",
  "hb",
  "tlc",
  "dlc",
  "wbc",
  "rbc",
  "platelet",
  "pcv",
  "hematocrit",
  "mcv",
  "mch",
  "mchc",
  "rdw",
  "esr",
  "reticulocyte",
  "bleeding time",
  "clotting time",
  "pt/inr",
  "aptt",

  // Thyroid & Endocrine
  "thyroid",
  "tsh",
  "t3",
  "t4",
  "ft3",
  "ft4",
  "psa",
  "prolactin",
  "ferritin",
  "vitamin",

  // Serology & Infectious (standard rapid/quantitative)
  "crp",
  "c-reactive",
  "ra factor",
  "aso",
  "vdrl",
  "rpr",
  "hiv",
  "hbsag",
  "hcv",
  "dengue",
  "malaria",
  "typhoid",
  "widal test (tube",
  "widal tube",

  // Routine Urine & Stool
  "urine routine",
  "stool routine",
  "pregnancy",
  "upt",
  "blood group",
  "rh type",
];

/**
 * Checks if a test name represents a standard clinical pathology/biochemistry analyte parameter
 */
export function isStandardAnalyteTest(name: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return STANDARD_ANALYTE_KEYWORDS.some((kw) => n.includes(kw));
}

/**
 * Robustly determines if a test is a genuine custom editor / narrative / culture test.
 * Standard analytes (FBS, PPBS, RBS, Lipid, CBC, LFT, KFT) are GUARANTEED to return false.
 */
export function isGenuineCustomEditorTest(test: any): boolean {
  if (!test) return false;

  const rawName = test.name || test.testName || "";
  const name = rawName.trim().toLowerCase();
  const category = (test.category || "").trim().toLowerCase();

  // 1. Absolute rule: Standard pathology / biochemistry tests are NEVER Custom Editor
  if (isStandardAnalyteTest(name)) {
    return false;
  }

  // 2. Tests with standard numeric units or reference ranges are parameter tests
  const unit = test.unit || test.unit_name;
  if (unit && typeof unit === "string" && unit.trim() !== "") {
    return false;
  }
  if (test.refRangeMin != null || test.ref_range_min != null || test.refRangeMax != null || test.ref_range_max != null) {
    return false;
  }
  const valType = test.valueType || test.value_type;
  if (valType === "Numeric") {
    return false;
  }

  // 3. Culture & Sensitivity tests are ALWAYS Custom Editor
  if (name.includes("culture")) {
    return true;
  }

  // 4. Widal Slide Method uses the 4-dilution antigen matrix table
  if (name.includes("widal") && name.includes("slide")) {
    return true;
  }

  // 5. Histopathology, Cytology, FNAC, Biopsy narrative templates
  if (
    category.includes("histopath") ||
    category.includes("cytopath") ||
    name.includes("biopsy") ||
    name.includes("fnac") ||
    name.includes("histopathology") ||
    name.includes("cytology") ||
    name.includes("pap smear")
  ) {
    return true;
  }

  // 6. Explicit Custom Editor fieldType (only if no analyte keyword matched)
  const fieldType = test.fieldType || test.field_type;
  return fieldType === "Custom Editor";
}

/**
 * Default fallback measurement units for common investigations if omitted in database
 */
export function getDefaultUnitForTest(testName: string): string {
  if (!testName) return "";
  const n = testName.toLowerCase();

  if (n.includes("sugar") || n.includes("glucose") || n.includes("fbs") || n.includes("ppbs") || n.includes("rbs")) {
    return "mg/dL";
  }
  if (n.includes("cholesterol") || n.includes("triglyceride") || n.includes("lipid") || n.includes("hdl") || n.includes("ldl") || n.includes("vldl")) {
    return "mg/dL";
  }
  if (n.includes("bilirubin") || n.includes("creatinine") || n.includes("uric acid")) {
    return "mg/dL";
  }
  if (n.includes("urea") || n.includes("bun")) {
    return "mg/dL";
  }
  if (n.includes("hemoglobin") || n.includes("haemoglobin") || n.includes("hb") || n.includes("protein") || n.includes("albumin") || n.includes("globulin")) {
    return "g/dL";
  }
  if (n.includes("tlc") || n.includes("wbc")) {
    return "/cumm";
  }
  if (n.includes("platelet")) {
    return "Lakhs/cumm";
  }
  if (n.includes("rbc")) {
    return "mil/cumm";
  }
  if (n.includes("esr")) {
    return "mm/1st hr";
  }
  if (n.includes("hba1c") || n.includes("neutrophil") || n.includes("lymphocyte") || n.includes("eosinophil") || n.includes("monocyte") || n.includes("basophil") || n.includes("pcv")) {
    return "%";
  }
  if (n.includes("tsh")) {
    return "uIU/mL";
  }
  if (n.includes("sgot") || n.includes("sgpt") || n.includes("ast") || n.includes("alt") || n.includes("alkaline") || n.includes("alp")) {
    return "U/L";
  }

  return "";
}

/**
 * Default standard reference range text for common investigations if omitted in database
 */
export function getDefaultRangeForTest(testName: string): string {
  if (!testName) return "—";
  const n = testName.toLowerCase();

  if (n.includes("fasting") && (n.includes("sugar") || n.includes("glucose") || n.includes("fbs"))) {
    return "70 – 99";
  }
  if ((n.includes("pp") || n.includes("post prandial")) && (n.includes("sugar") || n.includes("glucose") || n.includes("ppbs"))) {
    return "70 – 140";
  }
  if (n.includes("random") && (n.includes("sugar") || n.includes("glucose") || n.includes("rbs"))) {
    return "70 – 140";
  }
  if (n.includes("hba1c")) {
    return "4.0 – 5.6";
  }
  if (n.includes("creatinine")) {
    return "0.7 – 1.4";
  }
  if (n.includes("urea")) {
    return "15 – 40";
  }
  if (n.includes("uric acid")) {
    return "3.5 – 7.2";
  }
  if (n.includes("bilirubin") && n.includes("total")) {
    return "0.2 – 1.2";
  }
  if (n.includes("cholesterol") && (n.includes("total") || !n.includes("hdl"))) {
    return "125 – 200";
  }

  return "—";
}
