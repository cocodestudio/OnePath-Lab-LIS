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

  // 2. Culture & Sensitivity tests are ALWAYS Custom Editor
  if (name.includes("culture")) {
    return true;
  }

  // 3. Widal Slide Method uses the 4-dilution antigen matrix table
  const fieldType = test.fieldType || test.field_type;
  if (name.includes("widal") && (name.includes("slide") || fieldType === "Custom Editor")) {
    return true;
  }

  // 4. Histopathology, Cytology, FNAC, Biopsy narrative templates
  if (
    category.includes("histopath") ||
    category.includes("cytopath") ||
    name.includes("biopsy") ||
    name.includes("fnac") ||
    name.includes("histopath") ||
    name.includes("cytology") ||
    name.includes("pap smear")
  ) {
    return true;
  }

  // 5. Explicit Custom Editor fieldType
  if (fieldType === "Custom Editor") {
    return true;
  }

  // 6. Tests with standard numeric units or reference ranges are parameter tests
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

  return false;
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

export const DEFAULT_CULTURE_TEMPLATE = `<p>Sterile after 48 Hours. Incubation at 37°C.</p><p><strong>Date of Sample Collection:</strong><br><strong>Date of Reporting:</strong></p><p><strong>Sample Type:</strong><br><strong>Organism Isolated:</strong><br><strong>Colony Count:</strong> &lt;count&gt; Cfu/ml.</p><table style="width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px;"><thead><tr><th style="width: 60px; text-align: left; border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9;"><strong>S. No.</strong></th><th style="text-align: left; border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9;"><strong>Antibiotic Name</strong></th><th style="width: 160px; text-align: center; border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9;"><strong>Sensitivity (S / I / R)</strong></th></tr></thead><tbody><tr><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">1</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">AMOXYCLAV (AMC)</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;"></td></tr><tr><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">2</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">AMIKACIN (AK)</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;"></td></tr><tr><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">3</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">CEFTRIAXONE (CTR)</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;"></td></tr><tr><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">4</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">CIPROFLOXACIN (CIP)</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;"></td></tr><tr><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">5</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px;">MEROPENEM (MRP)</td><td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;"></td></tr></tbody></table>`;

export const DEFAULT_WIDAL_TEMPLATE = `<table style="width:100%; border-collapse:collapse; margin-top:8px; margin-bottom:8px;"><thead><tr style="background-color:#f4f4f5; text-align:left;"><th style="border:1px solid #d4d4d8; padding:6px 10px; width:28%;">Antigen</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/20</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/40</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/80</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/160</th><th style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">1/320</th></tr></thead><tbody><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. TYPHI "O"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. TYPHI "H"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. PARATYPHI "AH"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr><tr><td style="border:1px solid #d4d4d8; padding:6px 10px; font-weight:bold;">S. PARATYPHI "BH"</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td><td style="border:1px solid #d4d4d8; padding:6px 10px; text-align:center;">-</td></tr></tbody></table><p>Result: <strong>Negative</strong></p>`;

export const DEFAULT_BIOPSY_TEMPLATE = `<p><strong>SPECIMEN:</strong> Tissue Biopsy in 10% Neutral Buffered Formalin</p><p><strong>CLINICAL HISTORY / DIAGNOSIS:</strong> &lt;Clinical indication &amp; anatomical biopsy site&gt;</p><p><strong>GROSS EXAMINATION:</strong><br>Received single formalin-fixed tissue specimen measuring &lt;dimensions&gt; cm. Greyish-white to tan in appearance, firm in consistency. Representative sections submitted in Block A.</p><p><strong>MICROSCOPIC EXAMINATION:</strong><br>Sections studied show tissue fragment lined by epithelium. The underlying fibrovascular stroma shows mild to moderate chronic inflammatory infiltrate predominantly composed of lymphocytes and plasma cells. There is no evidence of nuclear atypia, dysplasia, granulomatous inflammation, or malignancy in the sections examined.</p><p><strong>IMPRESSION / DIAGNOSIS:</strong><br><strong>BIOPSY EXAMINATION CONSISTENT WITH: &lt;BENIGN / CHRONIC NON-SPECIFIC INFLAMMATION / SPECIFY DIAGNOSIS&gt;</strong></p><p style="font-size:10px; color:#71717a; margin-top:8px;"><em>Note: Histopathological impression must be clinically correlated with patient's radiological, clinical, and operative findings.</em></p>`;

export function getCustomEditorInitialTemplate(test: any): string {
  if (!test) return "<p>Clinical and microscopic evaluation within normal reference limits.</p>";
  if (test.customLayout && typeof test.customLayout === "string" && test.customLayout.trim()) {
    return test.customLayout;
  }
  if (test.custom_layout && typeof test.custom_layout === "string" && test.custom_layout.trim()) {
    return test.custom_layout;
  }

  const rawName = test.name || test.testName || "";
  const name = rawName.trim().toLowerCase();
  const category = (test.category || "").trim().toLowerCase();

  if (name.includes("culture")) {
    return DEFAULT_CULTURE_TEMPLATE;
  }
  if (name.includes("widal")) {
    return DEFAULT_WIDAL_TEMPLATE;
  }
  if (
    name.includes("biopsy") ||
    category.includes("histopath") ||
    category.includes("cytopath") ||
    name.includes("fnac") ||
    name.includes("pap smear")
  ) {
    return DEFAULT_BIOPSY_TEMPLATE;
  }

  return "<p>Clinical and microscopic evaluation within normal reference limits.</p>";
}

