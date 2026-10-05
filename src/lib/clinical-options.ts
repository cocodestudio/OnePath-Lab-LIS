/**
 * OnePath Lab - Standard Clinical Parameter Result Options Engine
 * 
 * Provides predefined, standardized medical options for qualitative & semi-quantitative
 * laboratory tests across Clinical Pathology, Biochemistry, Microbiology, Serology,
 * Hematology, Cytology, and Body Fluid Analysis.
 * 
 * Includes persistent local storage capability so laboratories can add custom options
 * on-the-fly directly from the UI dropdown.
 */

export interface ClinicalOptionDef {
  key: string;
  namePatterns: string[];
  options: string[];
  category?: string;
  isColorParam?: boolean;
}

export const CLINICAL_PARAM_DICTIONARY: ClinicalOptionDef[] = [
  // ── 1. URINE ROUTINE & MICROSCOPY ──
  {
    key: "urine_color",
    namePatterns: ["color", "colour", "urine color", "urine colour"],
    isColorParam: true,
    options: [
      "Pale Yellow",
      "Yellow",
      "Dark Yellow",
      "Straw",
      "Amber",
      "Reddish",
      "Brown",
      "Orange",
      "Clear Yellow",
      "Cloudy Red",
      "Colorless",
      "Greenish",
      "Smoky Brown",
    ],
  },
  {
    key: "urine_transparency",
    namePatterns: ["transparency", "appearance", "clarity", "urine appearance", "urine clarity"],
    options: [
      "Clear",
      "Slightly Hazy",
      "Hazy",
      "Turbid",
      "Cloudy",
      "Smoky",
      "Milky",
      "Faintly Turbid",
    ],
  },
  {
    key: "urine_sp_gravity",
    namePatterns: ["specific gravity", "sp. gravity", "sp gravity", "sp.gr", "sg"],
    options: [
      "1.005",
      "1.010",
      "1.015",
      "1.020",
      "1.025",
      "1.030",
      "1.002",
      "1.008",
      "1.012",
      "1.018",
      "1.022",
      "1.028",
    ],
  },
  {
    key: "urine_reaction_ph",
    namePatterns: ["reaction", "ph", "reaction / ph", "reaction (ph)", "reaction/ph", "urine ph", "urine reaction"],
    options: [
      "5.0",
      "5.5",
      "6.0",
      "6.5",
      "7.0",
      "7.5",
      "8.0",
      "8.5",
      "Acidic",
      "Alkaline",
      "Neutral",
      "Slightly Acidic",
    ],
  },
  {
    key: "urine_protein",
    namePatterns: ["urine protein", "urine albumin", "protein (albumin)", "protein/albumin", "urine protein / albumin", "albumin (urine)"],
    options: [
      "Nil",
      "Negative",
      "Trace",
      "+",
      "++",
      "+++",
      "++++",
      "Positive",
      "30 mg/dL (1+)",
      "100 mg/dL (2+)",
      "300 mg/dL (3+)",
      "1000 mg/dL (4+)",
    ],
  },
  {
    key: "urine_sugar",
    namePatterns: ["urine sugar", "urine glucose", "sugar (glucose)", "sugar/glucose", "urine sugar / glucose", "reducing sugar (urine)", "glucose (sugar)"],
    options: [
      "Nil",
      "Negative",
      "Trace",
      "+",
      "++",
      "+++",
      "++++",
      "Positive",
      "0.5% (1+)",
      "1% (2+)",
      "2% (3+)",
      ">2% (4+)",
    ],
  },
  {
    key: "urine_ketones",
    namePatterns: ["ketone", "ketones", "ketone bodies", "acetone", "urine ketone", "urine ketones", "urine acetone", "ketones (acetone)"],
    options: [
      "Negative",
      "Nil",
      "Trace",
      "+",
      "++",
      "+++",
      "++++",
      "Positive",
      "Small",
      "Moderate",
      "Large",
    ],
  },
  {
    key: "urine_bile_salts",
    namePatterns: ["bile salt", "bile salts", "urine bile salt", "urine bile salts"],
    options: [
      "Negative",
      "Nil",
      "+",
      "++",
      "+++",
      "Positive",
      "Present",
      "Absent",
    ],
  },
  {
    key: "urine_bile_pigments",
    namePatterns: ["bile pigment", "bile pigments", "bilirubin (urine)", "urine bilirubin", "bilirubin (bile pigments)"],
    options: [
      "Negative",
      "Nil",
      "+",
      "++",
      "+++",
      "Positive",
      "Present",
      "Absent",
    ],
  },
  {
    key: "urine_urobilinogen",
    namePatterns: ["urobilinogen", "urine urobilinogen"],
    options: [
      "Normal",
      "Normal (0.2 - 1.0 mg/dL)",
      "Negative",
      "Increased (+)",
      "Increased (++)",
      "Increased (+++)",
      "Absent",
    ],
  },
  {
    key: "urine_blood",
    namePatterns: ["urine blood", "occult blood (urine)", "blood (urine)", "chemical blood", "blood (hemoglobin)", "urine hemoglobin"],
    options: [
      "Negative",
      "Nil",
      "Trace",
      "+",
      "++",
      "+++",
      "++++",
      "Positive",
    ],
  },
  {
    key: "urine_nitrite",
    namePatterns: ["nitrite", "urine nitrite"],
    options: [
      "Negative",
      "Positive",
    ],
  },
  {
    key: "urine_leukocyte_esterase",
    namePatterns: ["leukocyte esterase", "leucocyte esterase", "leukocytes (esterase)", "leukocytes esterase"],
    options: [
      "Negative",
      "Trace",
      "+",
      "++",
      "+++",
      "Positive",
    ],
  },
  {
    key: "pus_cells",
    namePatterns: ["pus cell", "pus cells", "pus cells / hpf", "pus cells/hpf", "wbc / hpf", "wbcs / hpf", "wbc/hpf", "wbcs/hpf"],
    options: [
      "Nil /HPF",
      "0-2 /HPF",
      "1-2 /HPF",
      "2-4 /HPF",
      "3-5 /HPF",
      "4-6 /HPF",
      "6-8 /HPF",
      "8-10 /HPF",
      "10-15 /HPF",
      "15-20 /HPF",
      "20-25 /HPF",
      "25-30 /HPF",
      "Plenty /HPF",
      "Full Field /HPF",
    ],
  },
  {
    key: "rbc_microscopic",
    namePatterns: ["rbc / hpf", "rbcs / hpf", "rbc/hpf", "rbcs/hpf", "red blood cells / hpf", "red cells / hpf", "rbc (microscopic)", "red blood cells (microscopic)", "rbc's"],
    options: [
      "Nil /HPF",
      "0-1 /HPF",
      "1-2 /HPF",
      "2-4 /HPF",
      "4-6 /HPF",
      "6-8 /HPF",
      "8-10 /HPF",
      "10-15 /HPF",
      "Plenty /HPF",
      "Dysmorphic RBCs Seen",
    ],
  },
  {
    key: "epithelial_cells",
    namePatterns: ["epithelial cell", "epithelial cells", "epithelial cells / hpf", "epithelial cells/hpf"],
    options: [
      "Few /HPF",
      "1-2 /HPF",
      "2-4 /HPF",
      "4-6 /HPF",
      "6-8 /HPF",
      "Moderate /HPF",
      "Plenty /HPF",
      "Nil /HPF",
    ],
  },
  {
    key: "casts",
    namePatterns: ["cast", "casts", "urinary casts", "casts / lpf", "casts/lpf"],
    options: [
      "Nil Seen",
      "Occasional Hyaline Casts",
      "Hyaline Casts (0-1 /LPF)",
      "Granular Casts Seen",
      "WBC Casts Seen",
      "RBC Casts Seen",
      "Fatty Casts Seen",
      "Waxy Casts Seen",
    ],
  },
  {
    key: "crystals",
    namePatterns: ["crystal", "crystals", "urinary crystals"],
    options: [
      "Nil Seen",
      "Calcium Oxalate (Few)",
      "Calcium Oxalate (Moderate)",
      "Triple Phosphate Crystals",
      "Uric Acid Crystals",
      "Amorphous Urates",
      "Amorphous Phosphates",
      "Calcium Carbonate",
      "Cholesterol Crystals",
    ],
  },
  {
    key: "bacteria",
    namePatterns: ["bacteria", "bacterial flora", "bacteria / hpf", "bacteria/hpf"],
    options: [
      "Nil",
      "Absent",
      "Few",
      "Moderate",
      "Present (+)",
      "Present (++)",
      "Present (+++)",
      "Plenty",
    ],
  },
  {
    key: "yeast_cells",
    namePatterns: ["yeast", "yeast cell", "yeast cells", "fungi", "fungal elements"],
    options: [
      "Nil",
      "Absent",
      "Few Seen",
      "Budding Yeast Cells Seen",
      "Budding Yeast Cells with Pseudohyphae Seen",
      "Present (+)",
    ],
  },
  {
    key: "trichomonas",
    namePatterns: ["trichomonas", "trichomonas vaginalis"],
    options: [
      "Nil",
      "Absent",
      "Present",
      "Motile Trichomonads Seen",
    ],
  },
  {
    key: "mucus_threads",
    namePatterns: ["mucus", "mucus threads", "mucous", "mucous threads"],
    options: [
      "Nil",
      "Absent",
      "Few",
      "Present (+)",
      "Moderate",
      "Plenty",
    ],
  },
  {
    key: "deposit_sediment",
    namePatterns: ["deposit", "sediment", "urine deposit"],
    options: [
      "Nil",
      "Absent",
      "Slight",
      "Moderate",
      "Heavy",
      "Present",
    ],
  },
  {
    key: "amorphous_material",
    namePatterns: ["amorphous", "amorphous material", "amorphous urates / phosphates"],
    options: [
      "Nil",
      "Absent",
      "Present (Few)",
      "Present (Moderate)",
      "Present (Heavy)",
    ],
  },

  // ── 2. STOOL EXAMINATION ──
  {
    key: "stool_color",
    namePatterns: ["stool color", "stool colour"],
    isColorParam: true,
    options: [
      "Brown",
      "Yellowish Brown",
      "Dark Brown",
      "Yellow",
      "Clay / Pale",
      "Greenish",
      "Black / Tar-like",
      "Reddish / Bloody",
    ],
  },
  {
    key: "stool_consistency",
    namePatterns: ["consistency", "stool consistency"],
    options: [
      "Formed",
      "Semi-formed",
      "Soft",
      "Loose",
      "Watery",
      "Hard",
    ],
  },
  {
    key: "stool_ova",
    namePatterns: ["ova", "stool ova", "helminthic ova"],
    options: [
      "None Seen",
      "Nil",
      "Ascaris lumbricoides",
      "Ancylostoma duodenale (Hookworm)",
      "Trichuris trichiura",
      "Taenia species",
      "Hymenolepis nana",
      "Enterobius vermicularis",
    ],
  },
  {
    key: "stool_cysts",
    namePatterns: ["cyst", "cysts", "protozoal cysts", "stool cysts"],
    options: [
      "None Seen",
      "Nil",
      "Entamoeba histolytica Cyst",
      "Giardia lamblia Cyst",
      "Entamoeba coli Cyst",
      "Blastocystis hominis",
    ],
  },
  {
    key: "stool_trophozoites",
    namePatterns: ["trophozoite", "trophozoites", "stool trophozoites"],
    options: [
      "None Seen",
      "Nil",
      "Entamoeba histolytica Trophozoites",
      "Giardia lamblia Trophozoites",
    ],
  },
  {
    key: "reducing_substances",
    namePatterns: ["reducing substance", "reducing substances", "stool reducing substances"],
    options: [
      "Nil",
      "Negative",
      "< 0.25%",
      "0.25% - 0.5%",
      "0.5% - 1.0%",
      "> 1.0%",
    ],
  },
  {
    key: "occult_blood",
    namePatterns: ["occult blood", "stool occult blood", "obt", "fobt"],
    options: [
      "Negative",
      "Positive",
      "Weakly Positive",
    ],
  },

  // ── 3. SEMEN ANALYSIS ──
  {
    key: "collection_examination_time",
    namePatterns: ["time of collection", "time of examination", "collection time", "examination time", "sample collection time", "sem coll time", "sem exam time"],
    options: [
      "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
      "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
      "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
      "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM",
      "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
    ],
  },
  {
    key: "semen_liquefaction",
    namePatterns: ["liquefaction", "liquefaction time", "semen liquefaction"],
    options: [
      "15 mins",
      "20 mins",
      "30 mins",
      "45 mins",
      "60 mins",
      "Within 15 minutes",
      "Within 20 minutes",
      "Within 30 minutes",
      "Within 45 minutes",
      "Within 60 minutes",
      "Delayed (> 60 mins)",
    ],
  },
  {
    key: "semen_viscosity",
    namePatterns: ["viscosity", "semen viscosity"],
    options: [
      "Normal",
      "Low",
      "Increased / High",
      "Viscid",
      "String < 2 cm",
      "String > 2 cm",
    ],
  },
  {
    key: "semen_fructose",
    namePatterns: ["fructose", "semen fructose"],
    options: [
      "Positive",
      "Present",
      "Negative",
      "Absent",
    ],
  },
  {
    key: "semen_agglutination",
    namePatterns: ["agglutination", "sperm agglutination"],
    options: [
      "Nil",
      "Absent",
      "Present (Head to Head)",
      "Present (Tail to Tail)",
      "Mixed Agglutination",
    ],
  },
  {
    key: "semen_motility_prog",
    namePatterns: ["rapid progressive", "slow progressive", "non progressive", "immotile", "progressive motility"],
    options: [
      "Rapid Progressive (Grade A)",
      "Slow Progressive (Grade B)",
      "Non-Progressive (Grade C)",
      "Immotile (Grade D)",
    ],
  },

  // ── 4. BLOOD GROUPING & RH TYPING ──
  {
    key: "blood_group",
    namePatterns: ["blood group", "abo blood group", "abo grouping", "blood group (abo)"],
    options: [
      "A Positive (A +ve)",
      "B Positive (B +ve)",
      "O Positive (O +ve)",
      "AB Positive (AB +ve)",
      "A Negative (A -ve)",
      "B Negative (B -ve)",
      "O Negative (O -ve)",
      "AB Negative (AB -ve)",
      "A",
      "B",
      "AB",
      "O",
    ],
  },
  {
    key: "rh_factor",
    namePatterns: ["rh factor", "rh typing", "rh type", "rh (d) factor", "rhesus factor"],
    options: [
      "Positive (+ve)",
      "Negative (-ve)",
    ],
  },
  {
    key: "coombs_test",
    namePatterns: ["coomb", "coombs", "direct coombs", "indirect coombs", "dct", "ict"],
    options: [
      "Negative",
      "Positive (+1)",
      "Positive (+2)",
      "Positive (+3)",
      "Positive (+4)",
    ],
  },

  // ── 5. SEROLOGY, IMMUNOLOGY & INFECTION SCREENING ──
  {
    key: "widal_titre",
    namePatterns: ["s. typhi 'o'", "s. typhi 'h'", "s. paratyphi 'ah'", "s. paratyphi 'bh'", "s. typhi o", "s. typhi h", "typhi o", "typhi h", "paratyphi ah", "paratyphi bh"],
    options: [
      "< 1:20",
      "1:20",
      "1:40",
      "1:80",
      "1:160",
      "1:320",
      "Non-Reactive",
    ],
  },
  {
    key: "dengue_ns1",
    namePatterns: ["dengue ns1", "ns1 antigen", "dengue ns1 antigen"],
    options: [
      "Negative",
      "Positive",
      "Equivocal",
    ],
  },
  {
    key: "dengue_antibodies",
    namePatterns: ["dengue igm", "dengue igg", "dengue antibody", "dengue serology"],
    options: [
      "Negative",
      "Positive",
      "Equivocal",
    ],
  },
  {
    key: "malaria_antigen",
    namePatterns: ["malaria antigen", "malaria card", "malaria rapid", "malaria parasite (rapid)"],
    options: [
      "Negative for Malaria Parasite",
      "Positive for Plasmodium vivax (Pv)",
      "Positive for Plasmodium falciparum (Pf)",
      "Positive for both Pf & Pv",
    ],
  },
  {
    key: "malaria_smear",
    namePatterns: ["malaria smear", "mp smear", "blood smear for mp", "peripheral smear for mp"],
    options: [
      "No Malarial Parasite Seen (NMP)",
      "Plasmodium vivax trophozoites seen",
      "Plasmodium falciparum ring forms seen",
      "Gametocytes seen",
    ],
  },
  {
    key: "upt_pregnancy",
    namePatterns: ["pregnancy test", "upt", "urine pregnancy test", "hcg (urine)"],
    options: [
      "Negative",
      "Positive",
      "Weakly Positive",
      "Invalid",
    ],
  },
  {
    key: "viral_markers",
    namePatterns: ["hiv", "hiv 1 & 2", "hbsag", "hcv", "vdrl", "rpr", "syphilis", "australia antigen", "hepatitis c", "hepatitis b", "anti hcv"],
    options: [
      "Non-Reactive",
      "Reactive",
    ],
  },
  {
    key: "rheumatology_qualitative",
    namePatterns: ["ra factor", "ra qualitative", "rheumatoid factor (qualitative)", "aso", "aso qualitative", "crp qualitative", "c-reactive protein (qualitative)"],
    options: [
      "Negative",
      "Positive",
      "Weakly Positive",
      "Negative (< 6 mg/L)",
      "Positive (> 6 mg/L)",
      "Negative (< 8 IU/mL)",
      "Positive (> 8 IU/mL)",
      "Negative (< 200 IU/mL)",
      "Positive (> 200 IU/mL)",
    ],
  },
  {
    key: "tuberculin_dose",
    namePatterns: [
      "tuberculin ppd dose",
      "tuberculin dose",
      "ppd dose",
      "dose of tuberculin",
      "tuberculin units",
      "ppd tuberculin dose"
    ],
    options: [
      "5 TU (0.1 mL PPD RT-23)",
      "10 TU (0.1 mL PPD)",
      "5 TU",
      "10 TU",
      "2 TU (0.1 mL PPD RT-23)",
      "1 TU (0.1 mL PPD RT-23)",
      "2 TU",
      "1 TU",
    ],
  },
  {
    key: "mantoux_site",
    namePatterns: [
      "site of injection",
      "injection site",
      "mantoux site",
      "site of tuberculin injection"
    ],
    options: [
      "Left Volar Forearm",
      "Right Volar Forearm",
      "Left Forearm",
      "Right Forearm",
    ],
  },
  {
    key: "mantoux_duration",
    namePatterns: [
      "reading duration",
      "reading time",
      "mantoux duration",
      "duration after injection",
      "reading after"
    ],
    options: [
      "After 48 Hours",
      "After 72 Hours",
      "48 - 72 Hours",
    ],
  },
  {
    key: "mantoux",
    namePatterns: [
      "mantoux test result",
      "mantoux result",
      "tuberculin test result",
      "tuberculin skin test result",
      "mantoux reaction",
      "mantoux interpretation"
    ],
    options: [
      "Negative (< 5 mm Induration)",
      "Positive (>= 10 mm Induration)",
      "Positive High Risk (>= 5 mm Induration)",
      "Strongly Positive (>= 15 mm Induration)",
      "0 mm (No Induration)",
      "Negative",
      "Positive",
    ],
  },

  // ── 6. MICROBIOLOGY & SMEARS ──
  {
    key: "gram_stain",
    namePatterns: ["gram stain", "gram's stain", "gram smear"],
    options: [
      "No Organisms Seen",
      "Gram-Positive Cocci in clusters seen",
      "Gram-Positive Cocci in pairs and chains seen",
      "Gram-Negative Bacilli seen",
      "Gram-Positive Bacilli seen",
      "Pus cells seen with Gram-negative intracellular diplococci",
      "Gram-Negative Coccobacilli seen",
    ],
  },
  {
    key: "afb_stain",
    namePatterns: ["afb", "afb stain", "zn stain", "sputum for afb", "acid fast bacilli"],
    options: [
      "Negative for AFB (No Acid Fast Bacilli Seen)",
      "Positive for AFB (1+)",
      "Positive for AFB (2+)",
      "Positive for AFB (3+)",
      "Scanty AFB seen (1-9 bacilli/100 fields)",
    ],
  },
  {
    key: "fungal_smear",
    namePatterns: ["fungal smear", "koh mount", "koh preparation"],
    options: [
      "No Fungal Elements Seen",
      "Budding Yeast Cells and Pseudohyphae Seen (Candida)",
      "Septate Fungal Hyphae Seen",
      "Aseptate Fungal Hyphae Seen",
    ],
  },
  {
    key: "culture_growth",
    namePatterns: ["culture", "culture & sensitivity", "growth after 24 hrs", "growth after 48 hrs"],
    options: [
      "Sterile after 48 hours of aerobic incubation at 37°C",
      "No bacterial growth after 24 hours of incubation",
      "Heavy growth of Escherichia coli",
      "Growth of Klebsiella pneumoniae",
      "Growth of Staphylococcus aureus",
      "Growth of Pseudomonas aeruginosa",
      "Growth of Enterococcus faecalis",
      "Growth of Proteus mirabilis",
      "Growth of Acinetobacter baumannii",
    ],
  },
  {
    key: "sensitivity_interpretation",
    namePatterns: ["sensitivity", "susceptibility", "interpretation"],
    options: [
      "Sensitive (S)",
      "Resistant (R)",
      "Intermediate (I)",
    ],
  },

  // ── 7. PERIPHERAL BLOOD SMEAR (PBS) ──
  {
    key: "pbs_rbc_morphology",
    namePatterns: ["rbc morphology", "red cells morphology", "rbc series"],
    options: [
      "Normocytic Normochromic",
      "Microcytic Hypochromic",
      "Dimorphic Red Cells",
      "Macrocytic",
      "Anisopoikilocytosis Seen",
      "Mild Anisopoikilocytosis",
      "Target cells and Ovalocytes seen",
    ],
  },
  {
    key: "pbs_wbc_morphology",
    namePatterns: ["wbc morphology", "leukocyte morphology", "wbc series"],
    options: [
      "Normal in morphology and distribution",
      "Shift to left seen",
      "Toxic granules seen in neutrophils",
      "Atypical lymphocytes seen",
      "Eosinophilia seen",
      "Immature cells / Blast cells seen",
    ],
  },
  {
    key: "pbs_platelets",
    namePatterns: ["platelets on smear", "platelet morphology", "platelets series"],
    options: [
      "Adequate on smear",
      "Reduced on smear",
      "Increased on smear",
      "Clumped platelets seen",
      "Giant platelets seen",
    ],
  },
];

/**
 * Universal fallback options for qualitative result parameters
 */
export const GENERIC_QUALITATIVE_OPTIONS = [
  "Normal",
  "Negative",
  "Positive",
  "Non-Reactive",
  "Reactive",
  "Not Detected",
  "Detected",
  "Nil",
  "Present",
  "Absent",
  "Trace",
];

/**
 * Normalizes text to facilitate loose matching
 */
function normalizeParamName(str: any): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[_\-\(\)\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retrieves predefined standard clinical options for a given parameter name.
 */
export function getClinicalOptionsForParameter(
  paramName: string,
  testName?: string,
  category?: string
): { options: string[]; key: string; isColorParam?: boolean } | null {
  if (!paramName) return null;

  const normalized = normalizeParamName(paramName);
  const normalizedTest = normalizeParamName(testName || "");
  const normalizedCat = normalizeParamName(category || "");

  // ── CLINICAL GUARDS: Prevent quantitative tests from receiving qualitative dropdowns ──
  const isBloodOrSerumTest =
    normalizedTest.includes("lft") ||
    normalizedTest.includes("liver") ||
    normalizedTest.includes("kft") ||
    normalizedTest.includes("kidney") ||
    normalizedTest.includes("rft") ||
    normalizedTest.includes("renal") ||
    normalizedTest.includes("lipid") ||
    normalizedTest.includes("cbc") ||
    normalizedTest.includes("hemogram") ||
    normalizedTest.includes("blood sugar") ||
    normalizedTest.includes("glucose") ||
    normalizedCat.includes("biochemistry") ||
    normalizedCat.includes("hematology");

  // 1. KFT Parameters: Blood Urea, BUN, Creatinine, Uric Acid, eGFR, Ratios
  if (
    normalized.includes("urea") ||
    normalized.includes("bun") ||
    normalized.includes("creatinine") ||
    normalized.includes("uric acid") ||
    normalized.includes("egfr")
  ) {
    return null;
  }

  // 2. LFT Bilirubin (Total, Direct, Indirect, Serum Bilirubin, Unconjugated, etc.)
  // Only qualitative if explicitly designated as urine examination
  if (
    normalized.includes("bilirubin") &&
    !normalized.includes("urine") &&
    !normalizedTest.includes("urine")
  ) {
    return null;
  }

  // 3. LFT Enzymes & Serum Proteins
  if (
    normalized.includes("sgot") ||
    normalized.includes("ast") ||
    normalized.includes("sgpt") ||
    normalized.includes("alt") ||
    normalized.includes("alkaline phosphatase") ||
    normalized.includes("alp") ||
    normalized.includes("ggt") ||
    normalized.includes("ggtp") ||
    normalized.includes("total protein") ||
    normalized.includes("serum protein") ||
    normalized.includes("plasma protein") ||
    normalized.includes("globulin") ||
    normalized.includes("a/g ratio") ||
    normalized.includes("ag ratio") ||
    normalized.includes("crp") ||
    normalized.includes("c reactive") ||
    (normalized.includes("albumin") && !normalized.includes("urine") && !normalized.includes("micro"))
  ) {
    return null;
  }

  // 4. Lipid Profile Parameters
  if (
    normalized.includes("cholesterol") ||
    normalized.includes("triglyceride") ||
    normalized.includes("hdl") ||
    normalized.includes("ldl") ||
    normalized.includes("vldl") ||
    normalized.includes("apolipoprotein") ||
    normalized.includes("apo a") ||
    normalized.includes("apo b")
  ) {
    return null;
  }

  // 5. Electrolytes & Minerals
  if (
    normalized.includes("sodium") ||
    normalized.includes("potassium") ||
    normalized.includes("chloride") ||
    normalized.includes("bicarbonate") ||
    normalized.includes("calcium") ||
    normalized.includes("phosphorus") ||
    normalized.includes("magnesium") ||
    normalized.includes("lithium")
  ) {
    return null;
  }

  // 6. Blood Glucose & Sugar Parameters
  if (
    (normalized.includes("blood sugar") ||
      normalized.includes("fasting") ||
      normalized.includes("post prandial") ||
      normalized.includes("ppbs") ||
      normalized.includes("rbs") ||
      normalized.includes("fbs") ||
      normalized.includes("serum glucose") ||
      normalized.includes("plasma glucose") ||
      normalized.includes("hba1c") ||
      normalized.includes("random blood sugar") ||
      normalized.includes("glucose") ||
      normalized.includes("sugar")) &&
    !normalized.includes("urine") &&
    !normalizedTest.includes("urine")
  ) {
    return null;
  }

  // 7. CBC / Hematology Counts & Indices
  if (
    normalized === "wbc" ||
    normalized === "total wbc" ||
    normalized === "total count" ||
    normalized === "tlc" ||
    normalized === "rbc" ||
    normalized === "total rbc" ||
    normalized === "red blood cell count" ||
    normalized === "platelet count" ||
    normalized === "platelets" ||
    normalized.includes("hemoglobin") ||
    normalized.includes("haemoglobin") ||
    normalized.includes("pcv") ||
    normalized.includes("hematocrit") ||
    normalized.includes("haematocrit") ||
    normalized.includes("mcv") ||
    normalized.includes("mch") ||
    normalized.includes("mchc") ||
    normalized.includes("rdw") ||
    normalized.includes("mpv") ||
    normalized.includes("pct") ||
    normalized.includes("pdw") ||
    normalized.includes("esr") ||
    normalized.includes("absolute neutrophil") ||
    normalized.includes("absolute lymphocyte") ||
    normalized.includes("absolute eosinophil") ||
    normalized.includes("absolute monocyte") ||
    normalized.includes("absolute basophil") ||
    (isBloodOrSerumTest &&
      (normalized.includes("neutrophil") ||
        normalized.includes("lymphocyte") ||
        normalized.includes("eosinophil") ||
        normalized.includes("monocyte") ||
        normalized.includes("basophil")))
  ) {
    return null;
  }

  // 8. Thyroid, Hormones, Vitamins & Cardiac Markers
  if (
    normalized.includes("tsh") ||
    normalized.includes("t3") ||
    normalized.includes("t4") ||
    normalized.includes("thyroxine") ||
    normalized.includes("triiodothyronine") ||
    normalized.includes("vitamin b12") ||
    normalized.includes("vitamin d") ||
    normalized.includes("ferritin") ||
    normalized.includes("iron") ||
    normalized.includes("tibc") ||
    normalized.includes("uibc") ||
    normalized.includes("transferrin") ||
    normalized.includes("troponin") ||
    normalized.includes("ck mb") ||
    normalized.includes("cpk") ||
    normalized.includes("d dimer") ||
    normalized.includes("amylase") ||
    normalized.includes("lipase")
  ) {
    return null;
  }

  // ── STEP 1: Exact pattern match (Highest Precedence) ──
  for (const def of CLINICAL_PARAM_DICTIONARY) {
    for (const pattern of def.namePatterns) {
      if (normalized === normalizeParamName(pattern)) {
        if (def.key === "urine_color" && (normalizedTest.includes("stool") || normalizedCat.includes("stool"))) {
          const stoolColorDef = CLINICAL_PARAM_DICTIONARY.find(d => d.key === "stool_color");
          if (stoolColorDef) return { options: stoolColorDef.options, key: stoolColorDef.key, isColorParam: true };
        }
        if (def.key === "urine_color" && (normalizedTest.includes("semen") || normalizedCat.includes("semen"))) {
          return {
            options: ["Greyish White", "Pearly White", "Pale Yellow", "Yellowish", "Reddish Brown"],
            key: "semen_color",
            isColorParam: true,
          };
        }
        return { options: def.options, key: def.key, isColorParam: def.isColorParam };
      }
    }
  }

  // ── STEP 2: Partial pattern match ──
  for (const def of CLINICAL_PARAM_DICTIONARY) {
    for (const pattern of def.namePatterns) {
      const np = normalizeParamName(pattern);
      if (np.length >= 4 && (normalized.includes(np) || np.includes(normalized))) {
        if (def.key === "urine_color" && (normalizedTest.includes("stool") || normalizedCat.includes("stool"))) {
          const stoolColorDef = CLINICAL_PARAM_DICTIONARY.find(d => d.key === "stool_color");
          if (stoolColorDef) return { options: stoolColorDef.options, key: stoolColorDef.key, isColorParam: true };
        }
        if (def.key === "urine_color" && (normalizedTest.includes("semen") || normalizedCat.includes("semen"))) {
          return {
            options: ["Greyish White", "Pearly White", "Pale Yellow", "Yellowish", "Reddish Brown"],
            key: "semen_color",
            isColorParam: true,
          };
        }
        return { options: def.options, key: def.key, isColorParam: def.isColorParam };
      }
    }
  }

  // ── STEP 3: Generic qualitative fields ──
  if (
    normalized === "result" ||
    normalized === "findings" ||
    normalized === "impression" ||
    normalized === "interpretation" ||
    normalized.endsWith(" result") ||
    normalized.startsWith("result of")
  ) {
    return { options: GENERIC_QUALITATIVE_OPTIONS, key: "generic_qualitative" };
  }

  return null;
}

/**
 * Local storage key helper for user-customized options
 */
function getStorageKey(paramKey: string): string {
  const safeKey = typeof paramKey === "string" ? paramKey : String(paramKey || "");
  return `lis_custom_options_${safeKey.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
}

/**
 * Retrieves custom lab options persisted by users in localStorage.
 */
export function getSavedCustomOptions(paramKey: string): string[] {
  if (typeof window === "undefined" || !paramKey) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(paramKey));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
          .filter(Boolean);
      }
    }
  } catch {}
  return [];
}

/**
 * Persists a new custom option added by user for a specific parameter.
 */
export function saveCustomOption(paramKey: string, newOption: string): string[] {
  if (typeof window === "undefined" || !newOption) return [];
  const trimmed = typeof newOption === "string" ? newOption.trim() : String(newOption || "").trim();
  if (!trimmed) return [];
  const current = getSavedCustomOptions(paramKey);
  if (!current.includes(trimmed)) {
    const updated = [trimmed, ...current];
    try {
      localStorage.setItem(getStorageKey(paramKey), JSON.stringify(updated));
    } catch {}
    return updated;
  }
  return current;
}

/**
 * Deletes a previously added custom option.
 */
export function deleteCustomOption(paramKey: string, optionToDelete: string): string[] {
  if (typeof window === "undefined") return [];
  const current = getSavedCustomOptions(paramKey);
  const updated = current.filter(o => o !== optionToDelete);
  try {
    localStorage.setItem(getStorageKey(paramKey), JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Master Resolver: Combines dictionary options + database options + custom user-added options.
 */
export function getCompleteParameterOptions(
  paramName: string,
  testName?: string,
  category?: string,
  customDbOptions?: string | string[] | any
): { options: string[]; key: string; isColorParam?: boolean; hasDropdown: boolean } {
  try {
    if (!paramName) {
      return { options: [], key: "", isColorParam: false, hasDropdown: false };
    }

    const safeParamName = typeof paramName === "string" ? paramName : String(paramName || "");
    const safeTestName = testName ? (typeof testName === "string" ? testName : String(testName)) : undefined;
    const safeCategory = category ? (typeof category === "string" ? category : String(category)) : undefined;

    const clinicalDef = getClinicalOptionsForParameter(safeParamName, safeTestName, safeCategory);

    // Parse any database-provided options (from test model customOptions or custom_options)
    let dbOptionsList: string[] = [];
    if (customDbOptions) {
      if (Array.isArray(customDbOptions)) {
        dbOptionsList = customDbOptions
          .map((opt: any) => (typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()))
          .filter(Boolean);
      } else if (typeof customDbOptions === "string") {
        const trimmed = customDbOptions.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              dbOptionsList = parsed
                .map((opt: any) => (typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()))
                .filter(Boolean);
            } else {
              dbOptionsList = [trimmed];
            }
          } catch {
            dbOptionsList = trimmed
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } else {
          dbOptionsList = trimmed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } else if (typeof customDbOptions === "object" && customDbOptions !== null) {
        try {
          dbOptionsList = Object.values(customDbOptions)
            .map((opt: any) => (typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()))
            .filter(Boolean);
        } catch {
          dbOptionsList = [];
        }
      }
    }

    // Override limited 7-item times with full day times
    const normalizedP = normalizeParamName(safeParamName);
    if (
      normalizedP.includes("time of collection") ||
      normalizedP.includes("time of examination") ||
      normalizedP.includes("collection time") ||
      normalizedP.includes("examination time")
    ) {
      dbOptionsList = [];
    }

    if (!clinicalDef && dbOptionsList.length === 0) {
      return { options: [], key: "", isColorParam: false, hasDropdown: false };
    }

    const effectiveKey = clinicalDef?.key || normalizedP.replace(/\s+/g, "_");
    const userCustomOptions = getSavedCustomOptions(effectiveKey);

    const set = new Set<string>();
    // User custom options first
    if (Array.isArray(userCustomOptions)) {
      userCustomOptions.forEach(opt => {
        if (typeof opt === "string" && opt.trim()) set.add(opt.trim());
      });
    }

    // If specific clinical definition exists, add clinical options
    if (clinicalDef && clinicalDef.key !== "generic_qualitative") {
      if (Array.isArray(clinicalDef.options)) {
        clinicalDef.options.forEach(opt => {
          if (typeof opt === "string" && opt.trim()) set.add(opt.trim());
        });
      }
      // Also include DB options if any
      dbOptionsList.forEach(opt => {
        if (typeof opt === "string" && opt.trim()) set.add(opt.trim());
      });
    } else if (dbOptionsList.length > 0) {
      // If DB provided options, use them directly without adding generic qualitative options
      dbOptionsList.forEach(opt => {
        if (typeof opt === "string" && opt.trim()) set.add(opt.trim());
      });
    } else if (clinicalDef && Array.isArray(clinicalDef.options)) {
      // Generic qualitative fallback
      clinicalDef.options.forEach(opt => {
        if (typeof opt === "string" && opt.trim()) set.add(opt.trim());
      });
    }

    const finalOptions = Array.from(set);

    return {
      options: finalOptions,
      key: effectiveKey,
      isColorParam: Boolean(clinicalDef?.isColorParam),
      hasDropdown: finalOptions.length > 0,
    };
  } catch (err) {
    console.error("Clinical Options: error in getCompleteParameterOptions:", err);
    return { options: [], key: "", isColorParam: false, hasDropdown: false };
  }
}
