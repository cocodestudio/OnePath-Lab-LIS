export interface OrganHealthScore {
  id: string;
  name: string;
  icon: string;
  score: number; // 0 to 100
  status: "OPTIMAL" | "ATTENTION" | "HIGH_RISK";
  statusLabel: string;
  color: string;
  testedCount: number;
  abnormalCount: number;
  summary: string;
}

export interface AbnormalParameterAnalysis {
  id: string;
  name: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: "HIGH" | "LOW" | "NORMAL";
  organ: string;
  commonReasons: string[];
  impactOnBody: string;
  dietaryAction: string;
}

export interface SmartReportAnalysis {
  overallHealthScore: number; // 0 - 100
  overallStatus: "OPTIMAL" | "ATTENTION" | "HIGH_RISK";
  overallStatusLabel: string;
  totalTested: number;
  totalNormal: number;
  totalAbnormal: number;
  executiveSummary: string[];
  organScores: OrganHealthScore[];
  abnormalAnalyses: AbnormalParameterAnalysis[];
  lifestyleDietAdvice: {
    foodsToInclude: string[];
    foodsToLimit: string[];
    lifestyleTips: string[];
  };
  recommendedSpecialist: string;
  clinicalDisclaimer: string;
}

// ── Medical Parameter Knowledge Base ──────────────────────────────
interface ParameterMetadata {
  organ: string;
  organId: string;
  highReasons: string[];
  lowReasons: string[];
  highImpact: string;
  lowImpact: string;
  highDiet: string;
  lowDiet: string;
}

const PARAMETER_KNOWLEDGE_BASE: Record<string, ParameterMetadata> = {
  hemoglobin: {
    organ: "Blood & Immunity (Hemogram)",
    organId: "blood",
    highReasons: ["Chronic smoking", "High altitude living", "Dehydration", "Polycythemia"],
    lowReasons: ["Iron deficiency", "Vitamin B12 deficiency", "Blood loss", "Chronic disease"],
    highImpact: "Increases blood viscosity and puts extra pumping workload on the cardiovascular system.",
    lowImpact: "Reduces oxygen carrying capacity to organs, leading to persistent fatigue, weakness, and dizziness.",
    highDiet: "Maintain optimal hydration (2.5-3L water daily); limit excessive red meat.",
    lowDiet: "Consume iron-rich foods (spinach, beetroot, pomegranate, lentils, dates) paired with Vitamin C.",
  },
  hb: {
    organ: "Blood & Immunity (Hemogram)",
    organId: "blood",
    highReasons: ["Chronic smoking", "Dehydration", "Polycythemia"],
    lowReasons: ["Nutritional iron deficiency", "Microcytic anemia", "Excessive blood loss"],
    highImpact: "Elevated blood thickness requiring cardiac monitoring.",
    lowImpact: "Tissue hypoxia causing pale complexion, fast pulse, and early exertion exhaustion.",
    highDiet: "Hydrate well; reduce iron-heavy fortified supplements unless prescribed.",
    lowDiet: "Incorporate dark green leafy vegetables, jaggery, amla, and soaked raisins.",
  },
  wbc: {
    organ: "Blood & Immunity (Hemogram)",
    organId: "blood",
    highReasons: ["Active bacterial or viral infection", "Physical trauma", "Systemic inflammation", "Allergic reaction"],
    lowReasons: ["Viral illness recovery (dengue, typhoid)", "Bone marrow suppression", "Autoimmune response"],
    highImpact: "Reflects acute immune activation or systemic inflammatory mobilization.",
    lowImpact: "Temporarily weakens frontline immune defense against common seasonal infections.",
    highDiet: "Consume antioxidant-rich citrus fruits, turmeric water, and garlic for cellular recovery.",
    lowDiet: "Focus on clean protein, cooked broths, zinc-rich seeds, and strictly hygienic foods.",
  },
  tlc: {
    organ: "Blood & Immunity (Hemogram)",
    organId: "blood",
    highReasons: ["Acute infection", "Tissue inflammation", "Severe stress", "Medication reaction"],
    lowReasons: ["Post-viral suppression", "Nutritional depletion", "Bone marrow underactivity"],
    highImpact: "Signs of active immunological response attempting to neutralize infection.",
    lowImpact: "Reduced circulating leukocytes requiring infection prevention protocols.",
    highDiet: "Increase berries, green tea, and ginger infusions to support natural immunity.",
    lowDiet: "Prioritize freshly prepared warm foods, almonds, and probiotic curd.",
  },
  platelets: {
    organ: "Blood & Immunity (Hemogram)",
    organId: "blood",
    highReasons: ["Essential thrombocytosis", "Post-splenectomy", "Iron deficiency rebound", "Chronic inflammation"],
    lowReasons: ["Dengue / viral fever", "Vitamin B12 deficiency", "Immune thrombocytopenia", "Liver congestion"],
    highImpact: "Elevates risk of unwarranted clot formation in microvascular beds.",
    lowImpact: "Increases tendency for easy skin bruising, gum bleeding, and delayed clotting.",
    highDiet: "Drink tender coconut water; avoid smoking and saturated fats.",
    lowDiet: "Papaya leaf extract, kiwi, beetroot juice, and pumpkin seeds support platelet production.",
  },
  sgpt: {
    organ: "Liver Function (Hepatic)",
    organId: "liver",
    highReasons: ["Fatty liver (NAFLD)", "Alcoholic overload", "Hepatotoxic medications", "Viral hepatitis"],
    lowReasons: ["Generally normal / indicates no active hepatocellular injury"],
    highImpact: "Leakage of intracellular enzymes indicates ongoing hepatic cellular stress or inflammation.",
    lowImpact: "Optimal baseline liver parenchymal integrity.",
    highDiet: "Strictly minimize fried fast foods, refined sugars, and alcohol; drink warm lemon water.",
    lowDiet: "Maintain a balanced, whole-food diet with cruciferous vegetables.",
  },
  alt: {
    organ: "Liver Function (Hepatic)",
    organId: "liver",
    highReasons: ["Hepatic steatosis (Fatty liver)", "Metabolic syndrome", "Over-the-counter painkiller overuse"],
    lowReasons: ["Healthy liver status"],
    highImpact: "Sign of active liver cell turnover or early metabolic liver irritation.",
    lowImpact: "No liver injury detected.",
    highDiet: "Switch to olive oil, eat steamed broccoli, walnuts, and green tea.",
    lowDiet: "Continue clean lifestyle.",
  },
  sgot: {
    organ: "Liver Function (Hepatic)",
    organId: "liver",
    highReasons: ["Strenuous exercise", "Muscle injury", "Liver strain", "Alcohol consumption"],
    lowReasons: ["Healthy baseline"],
    highImpact: "Enzymatic elevation from liver hepatocytes or skeletal muscle fibers.",
    lowImpact: "Normal tissue integrity.",
    highDiet: "Reduce processed carbohydrates; avoid alcohol and hepatotoxic drugs.",
    lowDiet: "Healthy dietary balance.",
  },
  bilirubin: {
    organ: "Liver Function (Hepatic)",
    organId: "liver",
    highReasons: ["Biliary duct sluggishness", "Hemolysis", "Gilbert's syndrome", "Sluggish liver metabolism"],
    lowReasons: ["Generally optimal / non-pathological"],
    highImpact: "Impaired bile secretion can cause yellowing of sclera (jaundice), itching, and dark urine.",
    lowImpact: "Effective hepatic bilirubin conjugation and excretion.",
    highDiet: "Drink radish juice, sugarcane juice, coconut water; avoid oily gravies.",
    lowDiet: "Maintain balanced nutrition.",
  },
  creatinine: {
    organ: "Kidney Function (Renal)",
    organId: "kidney",
    highReasons: ["Dehydration", "High protein/creatine intake", "Hypertension", "Reduced renal filtration"],
    lowReasons: ["Low muscle mass", "Severe malnutrition", "Pregnancy"],
    highImpact: "Indicates impaired glomerular filtration and accumulation of nitrogenous waste.",
    lowImpact: "Generally non-critical; check for age-appropriate muscle mass.",
    highDiet: "Hydrate with 2.5L water daily; moderate animal protein and limit excessive sodium.",
    lowDiet: "Ensure adequate protein intake with paneer, eggs, pulses, and nuts.",
  },
  urea: {
    organ: "Kidney Function (Renal)",
    organId: "kidney",
    highReasons: ["Dehydration", "High protein diet", "Upper GI bleed", "Renal filtration compromise"],
    lowReasons: ["Low protein intake", "Overhydration", "Severe liver disease"],
    highImpact: "Excess blood urea leads to nausea, metabolic fatigue, and kidney strain.",
    lowImpact: "Generally safe; ensure protein needs are met.",
    highDiet: "Drink plenty of water; reduce concentrated red meats and processed jerky.",
    lowDiet: "Incorporate balanced lentils, sprouts, and dairy.",
  },
  uric_acid: {
    organ: "Kidney Function (Renal)",
    organId: "kidney",
    highReasons: ["Purine-rich diet (organ meat, beer)", "Kidney under-excretion", "Metabolic syndrome"],
    lowReasons: ["Low purine diet", "Wilson's disease", "Overhydration"],
    highImpact: "Crystallizes in joint spaces (especially big toe/knees) causing acute painful gout and kidney stones.",
    lowImpact: "Low clinical concern.",
    highDiet: "Avoid beer, seafood, and high-fructose syrups; eat cherries, cucumbers, and drink lemon water.",
    lowDiet: "Balanced diet.",
  },
  glucose: {
    organ: "Metabolism & Blood Sugar",
    organId: "metabolism",
    highReasons: ["Insulin resistance", "Type 2 Diabetes", "Pancreatic stress", "High carbohydrate intake"],
    lowReasons: ["Prolonged fasting", "Excessive insulin/diabetic medicine", "Strenuous workout"],
    highImpact: "Sustained hyperglycemia damages vascular lining, kidneys, retinas, and peripheral nerves.",
    lowImpact: "Hypoglycemia causes trembling, diaphoresis, cognitive clouding, and fainting risks.",
    highDiet: "Eliminate refined sugar, white bread, and sweetened drinks; adopt high-fiber whole grains (millets/oats).",
    lowDiet: "Keep fast-acting glucose or fruit handy; never skip scheduled meals.",
  },
  sugar: {
    organ: "Metabolism & Blood Sugar",
    organId: "metabolism",
    highReasons: ["Impaired glucose tolerance", "Diabetes Mellitus", "Acute emotional or physical stress"],
    lowReasons: ["Medication overdose", "Starvation", "Reactive hypoglycemia"],
    highImpact: "Systemic endothelial damage and glycation of vital tissues.",
    lowImpact: "Risk of neuroglycopenia requiring urgent carbohydrate intake.",
    highDiet: "Eat bitter gourd (karela), fenugreek (methi) seeds, and low-glycemic vegetables.",
    lowDiet: "Regular small-interval meals.",
  },
  hba1c: {
    organ: "Metabolism & Blood Sugar",
    organId: "metabolism",
    highReasons: ["Chronic uncontrolled blood sugar over past 3 months", "Poor glycemic response"],
    lowReasons: ["Hemolytic anemia", "Frequent hypoglycemic episodes"],
    highImpact: "Elevates long-term risk of cardiovascular disease, diabetic nephropathy, and neuropathy.",
    lowImpact: "May reflect rapid red blood cell turnover; evaluate clinically.",
    highDiet: "Strict low-carb, high-protein lifestyle with daily 40-minute brisk walk.",
    lowDiet: "Review with treating physician.",
  },
  cholesterol: {
    organ: "Heart & Lipid Health",
    organId: "heart",
    highReasons: ["Excess dietary saturated/trans fats", "Genetic hyperlipidemia", "Sedentary lifestyle", "Hypothyroidism"],
    lowReasons: ["Malabsorption", "Hyperthyroidism", "Severe liver failure"],
    highImpact: "Contributes to arterial atheroma formation, narrowing coronary arteries and increasing heart attack risk.",
    lowImpact: "Generally desirable unless accompanied by severe malnutrition.",
    highDiet: "Avoid deep-fried snacks, butter, and processed palm oils; consume garlic, oats, and flaxseeds.",
    lowDiet: "Maintain healthy fats like ghee in moderation.",
  },
  triglycerides: {
    organ: "Heart & Lipid Health",
    organId: "heart",
    highReasons: ["Excess simple carbohydrates", "Alcohol intake", "Untreated diabetes", "Sedentary habits"],
    lowReasons: ["Very low fat diet", "Malnutrition"],
    highImpact: "Associated with pancreatitis, liver steatosis, and atherosclerotic cardiovascular risk.",
    lowImpact: "Optimal metabolic lipid clearance.",
    highDiet: "Cut bakery items, alcohol, and carbonated beverages; exercise regularly.",
    lowDiet: "Include walnuts, chia seeds, and healthy monounsaturated oils.",
  },
  tsh: {
    organ: "Thyroid & Endocrine",
    organId: "thyroid",
    highReasons: ["Primary Hypothyroidism (Underactive thyroid)", "Hashimoto's thyroiditis", "Iodine deficiency"],
    lowReasons: ["Hyperthyroidism (Overactive thyroid)", "Thyroiditis", "Excess thyroid medication"],
    highImpact: "Underactive thyroid slows metabolism, causing unexplained weight gain, dry skin, fatigue, and cold intolerance.",
    lowImpact: "Overactive thyroid accelerates heart rate, causing tremors, anxiety, weight loss, and heat intolerance.",
    highDiet: "Avoid raw goitrogenic vegetables (cabbage, cauliflower); consume iodized salt and Brazil nuts.",
    lowDiet: "Consult an endocrinologist; avoid excess kelp/seaweed supplements.",
  },
  vitamin_d: {
    organ: "Bone & Mineral Health",
    organId: "bone",
    highReasons: ["Over-supplementation of Vitamin D3"],
    lowReasons: ["Lack of direct sun exposure", "Indoor lifestyle", "Dark skin pigmentation", "Malabsorption"],
    highImpact: "Hypercalcemia and calcium deposition in renal tissue.",
    lowImpact: "Compromised bone density (osteopenia), chronic body ache, back pain, and weakened immunity.",
    highDiet: "Stop extra D3 supplements; maintain hydration.",
    lowDiet: "20 minutes morning sun exposure; fortified milk, mushrooms, and physician-guided D3 supplements.",
  },
  calcium: {
    organ: "Bone & Mineral Health",
    organId: "bone",
    highReasons: ["Hyperparathyroidism", "Excess vitamin D", "Dehydration"],
    lowReasons: ["Vitamin D deficiency", "Hypoparathyroidism", "Poor dietary calcium"],
    highImpact: "May cause renal calculi, abdominal groans, and cardiac conduction variations.",
    lowImpact: "Muscle cramps, tingling in fingertips, brittle nails, and dental weakening.",
    highDiet: "Hydrate extensively; consult doctor for parathyroid review.",
    lowDiet: "Incorporate ragi, sesame seeds, paneer, and fortified curd into daily diet.",
  },
};

// ── Match Parameter Name to Knowledge Base ────────────────────────
function findParamKnowledge(name: string): ParameterMetadata | null {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const key of Object.keys(PARAMETER_KNOWLEDGE_BASE)) {
    if (clean.includes(key) || key.includes(clean)) {
      return PARAMETER_KNOWLEDGE_BASE[key];
    }
  }
  return null;
}

// ── Parameter Evaluation Engine ──────────────────────────────────
export function evaluateParamReference(
  item: any,
  patientAge: number = 25,
  patientGender: string = "male"
): {
  refRange: string;
  flag: "HIGH" | "LOW" | "NORMAL";
  isAbnormal: boolean;
} {
  const t = item?.test || {};
  const rawVal = item?.resultValue ?? item?.result_value ?? item?.result ?? item?.value ?? "";
  const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
  const numVal = parseFloat(valStr.replace(/[^0-9.-]/g, ""));
  const isNumeric = !isNaN(numVal) && valStr !== "";

  let refRange = "—";
  let min: number | undefined = undefined;
  let max: number | undefined = undefined;
  const isTextRange = t.rangeType === "TEXT" || t.range_type === "TEXT";

  if (isTextRange) {
    refRange = (t.textRefRange || t.text_ref_range || "—").trim();
  } else if (t.rangeType === "AGE_BASED" || t.range_type === "AGE_BASED") {
    const ageRanges = t.ageRanges || t.age_ranges;
    if (Array.isArray(ageRanges) && ageRanges.length > 0 && !isNaN(patientAge)) {
      const match = ageRanges.find((r: any) => {
        const minA = r.minAge ?? r.min_age ?? 0;
        const maxA = r.maxAge ?? r.max_age ?? 999;
        return patientAge >= minA && patientAge <= maxA;
      });
      if (match) {
        min = match.minVal !== undefined && match.minVal !== null ? Number(match.minVal) : match.min_val !== undefined && match.min_val !== null ? Number(match.min_val) : undefined;
        max = match.maxVal !== undefined && match.maxVal !== null ? Number(match.maxVal) : match.max_val !== undefined && match.max_val !== null ? Number(match.max_val) : undefined;
        if (min !== undefined && max !== undefined) {
          refRange = `${min} - ${max}`;
        }
      }
    }
  } else if (t.genderRefType === "CHILD_SPECIFIC" && patientAge < 12) {
    min = t.refRangeMinChild !== undefined && t.refRangeMinChild !== null ? Number(t.refRangeMinChild) : t.ref_range_min_child !== undefined && t.ref_range_min_child !== null ? Number(t.ref_range_min_child) : undefined;
    max = t.refRangeMaxChild !== undefined && t.refRangeMaxChild !== null ? Number(t.refRangeMaxChild) : t.ref_range_max_child !== undefined && t.ref_range_max_child !== null ? Number(t.ref_range_max_child) : undefined;
    if (min !== undefined && max !== undefined) {
      refRange = `${min} - ${max}`;
    }
  } else if (
    t.genderRefType === "GENDER_SPECIFIC" ||
    t.genderRefType === "BY_GENDER" ||
    t.gender_ref_type === "GENDER_SPECIFIC" ||
    t.gender_ref_type === "BY_GENDER"
  ) {
    const gender = (patientGender || "male").toLowerCase();
    if (gender === "female") {
      min = t.refRangeMinFemale !== undefined && t.refRangeMinFemale !== null ? Number(t.refRangeMinFemale) : t.ref_range_min_female !== undefined && t.ref_range_min_female !== null ? Number(t.ref_range_min_female) : undefined;
      max = t.refRangeMaxFemale !== undefined && t.refRangeMaxFemale !== null ? Number(t.refRangeMaxFemale) : t.ref_range_max_female !== undefined && t.ref_range_max_female !== null ? Number(t.ref_range_max_female) : undefined;
    } else {
      min = t.refRangeMinMale !== undefined && t.refRangeMinMale !== null ? Number(t.refRangeMinMale) : t.ref_range_min_male !== undefined && t.ref_range_min_male !== null ? Number(t.ref_range_min_male) : undefined;
      max = t.refRangeMaxMale !== undefined && t.refRangeMaxMale !== null ? Number(t.refRangeMaxMale) : t.ref_range_max_male !== undefined && t.ref_range_max_male !== null ? Number(t.ref_range_max_male) : undefined;
    }
    if (min !== undefined && max !== undefined) {
      refRange = `${min} - ${max}`;
    }
  }

  // Default fallback to standard min/max
  if (min === undefined && max === undefined) {
    const rawMin = t.refRangeMin ?? t.ref_range_min ?? item?.refRangeMin ?? item?.ref_range_min;
    const rawMax = t.refRangeMax ?? t.ref_range_max ?? item?.refRangeMax ?? item?.ref_range_max;
    if (rawMin !== undefined && rawMin !== null && rawMin !== "") min = Number(rawMin);
    if (rawMax !== undefined && rawMax !== null && rawMax !== "") max = Number(rawMax);
    if (min !== undefined && max !== undefined && (min !== 0 || max !== 0)) {
      refRange = `${min} - ${max}`;
    }
  }

  if (refRange === "—" && (t.textRefRange || t.text_ref_range || t.refRange || item?.refRange)) {
    refRange = String(t.textRefRange || t.text_ref_range || t.refRange || item?.refRange).trim();
  }

  // Determine Flag
  let flag: "HIGH" | "LOW" | "NORMAL" = "NORMAL";
  let isAbnormal = false;

  const rawFlag = String(item?.flag || "").toUpperCase().trim();
  if (rawFlag === "HIGH" || rawFlag === "H") {
    flag = "HIGH";
    isAbnormal = true;
  } else if (rawFlag === "LOW" || rawFlag === "L") {
    flag = "LOW";
    isAbnormal = true;
  } else if (rawFlag === "NORMAL" || rawFlag === "N") {
    flag = "NORMAL";
    isAbnormal = false;
  } else if (item?.isAbnormal === false || item?.is_abnormal === false) {
    flag = "NORMAL";
    isAbnormal = false;
  } else if (isNumeric && !isTextRange) {
    if (min !== undefined && numVal < min) {
      flag = "LOW";
      isAbnormal = true;
    } else if (max !== undefined && max > 0 && numVal > max) {
      flag = "HIGH";
      isAbnormal = true;
    } else if (min !== undefined && max !== undefined && numVal >= min && numVal <= max) {
      flag = "NORMAL";
      isAbnormal = false;
    }
  }

  if (!isAbnormal && (item?.isAbnormal || item?.is_abnormal)) {
    isAbnormal = true;
    if (flag === "NORMAL") flag = "HIGH";
  }

  return { refRange, flag, isAbnormal };
}

// ── Main Clinical AI Intelligence Analyzer ────────────────────────
export function analyzeReportForSmartInsights(
  report: any,
  patientAge?: number,
  patientGender?: string
): SmartReportAnalysis {
  const results = report?.results || report?.test_results || report?.testResults || [];
  const abnormalAnalyses: AbnormalParameterAnalysis[] = [];
  const organMap = new Map<string, {
    name: string;
    icon: string;
    total: number;
    abnormal: number;
    color: string;
  }>();

  const resolvedAge = patientAge !== undefined ? Number(patientAge) : Number(report?.patient?.age || 25);
  const resolvedGender = patientGender || report?.patient?.gender || "male";

  // Initialize Default Organ Systems
  const defaultOrgans = [
    { id: "blood", name: "Blood & Immunity (Hemogram)", icon: "🩸", color: "#ef4444" },
    { id: "liver", name: "Liver Function (Hepatic)", icon: "🫁", color: "#f59e0b" },
    { id: "kidney", name: "Kidney Function (Renal)", icon: "🫘", color: "#3b82f6" },
    { id: "metabolism", name: "Metabolism & Blood Sugar", icon: "⚡", color: "#10b981" },
    { id: "heart", name: "Heart & Lipid Health", icon: "❤️", color: "#ec4899" },
    { id: "thyroid", name: "Thyroid & Endocrine", icon: "🦋", color: "#8b5cf6" },
    { id: "bone", name: "Bone & Mineral Health", icon: "🦴", color: "#6366f1" },
  ];

  defaultOrgans.forEach(o => {
    organMap.set(o.id, {
      name: o.name,
      icon: o.icon,
      total: 0,
      abnormal: 0,
      color: o.color,
    });
  });

  let totalTested = 0;
  let totalAbnormal = 0;

  results.forEach((r: any) => {
    const testName = r.test?.name || r.name || "Test";
    if (testName === "Report Template" || r.test?.fieldType === "Custom Editor") return;

    totalTested++;
    const valRaw = r.resultValue ?? r.result_value ?? r.result ?? r.value;
    const valStr = valRaw !== undefined && valRaw !== null ? String(valRaw).trim() : "";

    const evalRes = evaluateParamReference(r, resolvedAge, resolvedGender);
    const isAbnormal = evalRes.isAbnormal;
    const flagType = evalRes.flag;

    const kb = findParamKnowledge(testName);
    const organId = kb?.organId || "blood";

    if (organMap.has(organId)) {
      const org = organMap.get(organId)!;
      org.total++;
      if (isAbnormal) org.abnormal++;
    }

    if (isAbnormal) {
      totalAbnormal++;
      const commonReasons = flagType === "HIGH"
        ? (kb?.highReasons || ["Elevated due to metabolic variation", "Requires clinical correlation"])
        : (kb?.lowReasons || ["Sub-optimal physiological level", "Dietary or nutritional deficiency"]);

      const impactOnBody = flagType === "HIGH"
        ? (kb?.highImpact || "Indicates biochemical strain or increased metabolic activity in the target organ system.")
        : (kb?.lowImpact || "May lead to reduced vitality, cellular fatigue, or slowed biological recovery.");

      const dietaryAction = flagType === "HIGH"
        ? (kb?.highDiet || "Adopt balanced hydration and avoid excessive saturated foods.")
        : (kb?.lowDiet || "Incorporate essential micro-nutrients and foods rich in natural vitamins.");

      abnormalAnalyses.push({
        id: r.id || `${testName}-${Math.random()}`,
        name: testName,
        result: valStr || "—",
        unit: r.test?.unit || r.unit || "",
        referenceRange: evalRes.refRange,
        flag: flagType,
        organ: kb?.organ || "General Health",
        commonReasons,
        impactOnBody,
        dietaryAction,
      });
    }
  });

  const totalNormal = Math.max(0, totalTested - totalAbnormal);

  // Calculate Organ Health Scores
  const organScores: OrganHealthScore[] = [];
  organMap.forEach((val, id) => {
    if (val.total > 0) {
      const ratio = val.abnormal / val.total;
      let score = 100 - Math.round(ratio * 70);
      let status: "OPTIMAL" | "ATTENTION" | "HIGH_RISK" = "OPTIMAL";
      let statusLabel = "Healthy & Optimal";

      if (val.abnormal > 0) {
        if (ratio >= 0.5) {
          status = "HIGH_RISK";
          statusLabel = "Clinical Attention Advised";
          score = Math.max(45, 100 - Math.round(ratio * 60));
        } else {
          status = "ATTENTION";
          statusLabel = "Mild Variations Observed";
          score = Math.max(68, 100 - Math.round(ratio * 40));
        }
      }

      organScores.push({
        id,
        name: val.name,
        icon: val.icon,
        score,
        status,
        statusLabel,
        color: val.color,
        testedCount: val.total,
        abnormalCount: val.abnormal,
        summary: val.abnormal === 0
          ? `All ${val.total} evaluated biological markers are well within standard physiological reference ranges.`
          : `${val.abnormal} of ${val.total} markers require medical lifestyle or therapeutic attention.`,
      });
    }
  });

  // Calculate Overall Health Score
  let overallScore = 95;
  if (totalTested > 0) {
    const penalty = (totalAbnormal / totalTested) * 55;
    overallScore = Math.max(48, Math.min(99, Math.round(98 - penalty)));
  }

  let overallStatus: "OPTIMAL" | "ATTENTION" | "HIGH_RISK" = "OPTIMAL";
  let overallStatusLabel = "Optimal Vitality";
  if (totalAbnormal > 0) {
    if (totalAbnormal >= 3 || (totalTested > 0 && totalAbnormal / totalTested >= 0.35)) {
      overallStatus = "HIGH_RISK";
      overallStatusLabel = "Clinical Correlation Recommended";
    } else {
      overallStatus = "ATTENTION";
      overallStatusLabel = "Mild Borderline Observations";
    }
  }

  // Generate Executive Summary
  const executiveSummary: string[] = [];
  if (totalAbnormal === 0) {
    executiveSummary.push("Great news! All investigated laboratory parameters are well balanced and within normal reference limits.");
    executiveSummary.push("Your vital organ markers demonstrate good physiological homeostasis and metabolic stability.");
    executiveSummary.push("Continue your healthy lifestyle, routine physical activity, and well-balanced nutritional habits.");
  } else {
    executiveSummary.push(
      `Out of ${totalTested} clinical parameters evaluated, ${totalAbnormal} ${totalAbnormal === 1 ? "marker shows" : "markers show"} variation outside standard limits.`
    );
    const affectedOrgans = Array.from(new Set(abnormalAnalyses.map(a => a.organ)));
    if (affectedOrgans.length > 0) {
      executiveSummary.push(
        `Variations are concentrated primarily around ${affectedOrgans.slice(0, 2).join(" and ")} markers.`
      );
    }
    executiveSummary.push(
      "Early lifestyle, dietary adjustments, and primary care physician review can comfortably restore these parameters to optimal ranges."
    );
    executiveSummary.push(
      "Review the parameter-specific insights below for tailored dietary guidance and consult your healthcare provider."
    );
  }

  // Curated Lifestyle & Diet Advice
  const foodsToInclude: string[] = [];
  const foodsToLimit: string[] = [];
  const lifestyleTips: string[] = [];

  if (totalAbnormal === 0) {
    foodsToInclude.push("Fresh seasonal fruits, citrus, and raw salads", "Whole grains, oats, and high-fiber millets", "Adequate water intake (2.5 - 3 Litres daily)");
    foodsToLimit.push("Refined sugars, carbonated soft drinks", "Excess sodium and packaged deep-fried snacks", "Trans-fats and processed bakery goods");
    lifestyleTips.push("Aim for 150 minutes of moderate aerobic exercise (brisk walking/cycling) per week.", "Maintain 7 to 8 hours of quality, uninterrupted nocturnal sleep.", "Schedule annual routine preventive health checkups.");
  } else {
    abnormalAnalyses.forEach(a => {
      if (a.dietaryAction && !foodsToInclude.includes(a.dietaryAction)) {
        foodsToInclude.push(a.dietaryAction);
      }
    });

    foodsToInclude.push("Nutrient-dense green leafy vegetables and antioxidant-rich berries", "Clean lean proteins (sprouts, lentils, eggs, or paneer)");
    foodsToLimit.push("Excess saturated fats, red meats, and commercial street food", "High-glycemic bakery goods and added refined sugars", "Alcohol consumption and excessive sodium (pickles, papads)");
    lifestyleTips.push("Track your daily water intake — ensure at least 2.5 litres of clean water.", "Engage in daily 30-minute light-to-moderate walks to improve circulation and metabolic rate.", "Repeat relevant monitoring tests after 6 to 12 weeks upon doctor's advice.");
  }

  // Determine Specialist Recommendation
  let recommendedSpecialist = "General Physician / Family Doctor";
  const organNames = abnormalAnalyses.map(a => a.organ.toLowerCase());
  if (organNames.some(o => o.includes("heart") || o.includes("lipid"))) {
    recommendedSpecialist = "Cardiologist or Consultant Physician";
  } else if (organNames.some(o => o.includes("metabolism") || o.includes("sugar"))) {
    recommendedSpecialist = "Diabetologist or Endocrinologist";
  } else if (organNames.some(o => o.includes("liver"))) {
    recommendedSpecialist = "Gastroenterologist / Hepatologist";
  } else if (organNames.some(o => o.includes("kidney"))) {
    recommendedSpecialist = "Nephrologist / Consultant Physician";
  } else if (organNames.some(o => o.includes("thyroid"))) {
    recommendedSpecialist = "Endocrinologist";
  }

  return {
    overallHealthScore: overallScore,
    overallStatus,
    overallStatusLabel,
    totalTested,
    totalNormal,
    totalAbnormal,
    executiveSummary,
    organScores,
    abnormalAnalyses,
    lifestyleDietAdvice: {
      foodsToInclude: Array.from(new Set(foodsToInclude)).slice(0, 4),
      foodsToLimit: Array.from(new Set(foodsToLimit)).slice(0, 4),
      lifestyleTips: Array.from(new Set(lifestyleTips)).slice(0, 4),
    },
    recommendedSpecialist,
    clinicalDisclaimer: `1. Clinical Use Only
• This report is intended for informational and analytical purposes only.
• It should be used by qualified healthcare professionals for clinical correlation.
• It is not a substitute for formal medical consultation, diagnosis, or treatment.

2. No Diagnostic Claim
• Information in this report, including AI-based insights and trend analyses, is suggestive in nature.
• It must not be solely relied upon for diagnosis or treatment decisions.
• Always consult a registered medical practitioner.`,
  };
}
