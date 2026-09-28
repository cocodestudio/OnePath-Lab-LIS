const fs = require('fs');

// Full formula engine matching logic to be tested
function findParamInResults(results, currentValues, opts) {
  const { exactCodes = [], exactNames = [], patterns = [], excludePatterns = [] } = opts;
  for (const r of results) {
    const rawName = (r.test?.name || "").trim();
    const rawCode = (r.test?.testCode || r.test?.test_code || "").trim();
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

function computeAutomatedFormulas(currentValues, report, manualOverrideIds) {
  const calculatedValues = {};
  const calculatedIds = new Set();

  if (!report || !report.results || !Array.isArray(report.results)) {
    return { calculatedValues, calculatedIds };
  }

  const results = report.results;
  const fp = (opts) => findParamInResults(results, currentValues, opts);

  const findAllParams = (opts) => {
    const { exactCodes = [], exactNames = [], patterns = [], excludePatterns = [] } = opts;
    const matches = [];
    for (const r of results) {
      const rawName = (r.test?.name || "").trim();
      const rawCode = (r.test?.testCode || r.test?.test_code || "").trim();
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

  const setCalc = (target, value) => {
    if (!target || !target.id) return;
    calculatedIds.add(target.id);
    if (manualOverrideIds && manualOverrideIds.has(target.id)) return;
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
    exactNames: ["Mean Corpuscular Hemoglobin (MCH)", "MCH", "Mean Corpuscular Haemoglobin (MCH)", "Mean Cell Haemoglobin, MCH", "Mean Cell Hemoglobin"],
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
    exactNames: ["Neutrophil Lymphocyte Ratio (NLR)", "NLR", "Neutrophil Lymphocyte Ratio", "Neutrophil to Lymphocyte Ratio", "Neutrophil / Lymphocyte Ratio"],
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
    const calcAbs = (diffParam) => {
      if (!diffParam || isNaN(diffParam.num)) return null;
      return tlc.num > 50
        ? Math.round((tlc.num * diffParam.num) / 100)
        : parseFloat(((tlc.num * diffParam.num) / 100).toFixed(2));
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
    exactNames: ["Bilirubin Total", "Total Bilirubin", "Serum Bilirubin", "Bilirubin, Total", "Serum Bilirubin (Total)", "S. Bilirubin Total"],
    patterns: [/\b(total\s+bilirubin|bilirubin\s+total|t\.?\s*bili)\b/i, /^serum bilirubin(\s*\(total\))?$/i],
    excludePatterns: [/(?<!in)direct/i, /indirect/i, /conjugated/i, /unconjugated/i],
  });
  const dbili = fp({
    exactCodes: [
      "LFT_BIL_DIR", "LFT_DBILI", "BIO_DBILI",
      "BIO_LFT_PANEL_LFT_BIL_DIR", "SYS_LFT_BILI_DIR",
      "BIO_SBIL_DIRECT", "DBILI",
    ],
    exactNames: ["Bilirubin Direct", "Direct Bilirubin", "Conjugated Bilirubin", "Bilirubin Direct (Conjugated)", "Serum Bilirubin (Direct)", "S. Bilirubin Direct"],
    patterns: [/\b(direct\s+bilirubin|bilirubin\s+direct|d\.?\s*bili|conjugated\s+bilirubin)\b/i],
    excludePatterns: [/indirect/i, /total/i, /unconjugated/i],
  });
  const tprot = fp({
    exactCodes: [
      "LFT_TOT_PROT", "LFT_TOTAL_PROTEIN", "BIO_TOTAL_PROTEIN",
      "BIO_LFT_PANEL_LFT_TOT_PROT", "SYS_LFT_TOT_PROT", "TOTAL_PROTEIN",
    ],
    exactNames: ["Total Protein", "Serum Protein Total", "Serum Total Protein", "Protein Total", "S. Protein Total"],
    patterns: [/\b(total\s+protein|protein\s+total|t\.?\s*prot)\b/i],
    excludePatterns: [/albumin/i, /globulin/i, /ratio/i],
  });
  const alb = fp({
    exactCodes: [
      "LFT_ALBUMIN", "BIO_ALBUMIN",
      "BIO_LFT_PANEL_LFT_ALBUMIN", "SYS_LFT_ALB",
      "BIO_053_ALB", "ALBUMIN",
    ],
    exactNames: ["Albumin", "Serum Albumin", "S. Albumin"],
    patterns: [/^(serum\s+)?albumin$/i],
    excludePatterns: [/ratio/i, /\ba\s*[:\/]\s*g\b/i, /globulin/i, /creatinine/i, /urine/i, /micro/i],
  });
  const sgot = fp({
    exactCodes: [
      "LFT_SGOT", "BIO_SGOT",
      "BIO_LFT_PANEL_LFT_SGOT", "SYS_LFT_SGOT", "SYS_LFT_01_SGOT",
      "BIO_051_SGOT", "SGOT", "AST",
    ],
    exactNames: ["SGOT / AST", "SGOT", "AST", "Aspartate Aminotransferase", "SGOT (AST)", "SGOT / AST (Aspartate Aminotransferase)"],
    patterns: [/^sgot$/i, /^ast$/i, /aspartate\s+aminotransferase/i, /^sgot\s*[\/\(]\s*ast/i],
    excludePatterns: [/ratio/i, /\balt\b/i, /\bsgpt\b/i, /de\s+ritis/i, /sgot\/sgpt/i],
  });
  const sgpt = fp({
    exactCodes: [
      "LFT_SGPT", "BIO_SGPT",
      "BIO_LFT_PANEL_LFT_SGPT", "SYS_LFT_SGPT", "SYS_LFT_01_SGPT",
      "BIO_050_SGPT", "SGPT", "ALT",
    ],
    exactNames: ["SGPT / ALT", "SGPT", "ALT", "Alanine Aminotransferase", "SGPT (ALT)", "SGPT / ALT (Alanine Aminotransferase)"],
    patterns: [/^sgpt$/i, /^alt$/i, /alanine\s+aminotransferase/i, /^sgpt\s*[\/\(]\s*alt/i],
    excludePatterns: [/ratio/i, /\bast\b/i, /\bsgot\b/i, /de\s+ritis/i, /sgot\/sgpt/i],
  });

  const ibiliTarget = fp({
    exactCodes: [
      "LFT_BIL_INDIR", "LFT_IBILI", "BIO_IBILI",
      "BIO_LFT_PANEL_LFT_BIL_INDIR", "SYS_LFT_BILI_IND",
      "BIO_SBIL_INDIRECT", "IBILI",
    ],
    exactNames: ["Bilirubin Indirect", "Indirect Bilirubin", "Unconjugated Bilirubin", "Bilirubin Indirect (Unconjugated)", "Serum Bilirubin (Indirect)"],
    patterns: [/\b(indirect\s+bilirubin|bilirubin\s+indirect|unconjugated\s+bilirubin|i\.?\s*bili)\b/i],
    excludePatterns: [/\b(direct|conjugated)\b/i, /total/i],
  });
  if (ibiliTarget && tbili && dbili) {
    calculatedIds.add(ibiliTarget.id);
    if (!isNaN(tbili.num) && !isNaN(dbili.num))
      setCalc(ibiliTarget, Math.max(0, tbili.num - dbili.num).toFixed(2));
  }

  const globTarget = fp({
    exactCodes: [
      "LFT_GLOBULIN", "BIO_GLOBULIN", "SYS_LFT_GLOB", "BIO_078_GLOB", "GLOBULIN",
    ],
    exactNames: ["Globulin", "Serum Globulin", "S. Globulin"],
    patterns: [/^(serum\s+)?globulin$/i],
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

  const agTarget = fp({
    exactCodes: ["LFT_AG_RATIO", "BIO_AG_RATIO", "BIO_077_AG_RATIO", "AG_RATIO"],
    exactNames: ["A : G Ratio", "A/G Ratio", "Albumin / Globulin Ratio", "A:G Ratio"],
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

  const sgotSgptTarget = fp({
    exactCodes: ["LFT_AST_ALT_RATIO", "BIO_AST_ALT_RATIO", "BIO_134_DERITIS", "AST_ALT_RATIO"],
    exactNames: ["SGOT / SGPT Ratio", "AST / ALT Ratio", "De Ritis Ratio", "SGOT / SGPT", "AST / ALT"],
    patterns: [/sgot\s*[\/:]\s*sgpt/i, /ast\s*[\/:]\s*alt/i, /de\s*ritis/i],
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
    exactNames: ["Blood Urea", "Serum Urea", "Urea", "S. Urea"],
    patterns: [/\bblood\s+urea\b/i, /^urea$/i, /^serum\s+urea$/i],
    excludePatterns: [/nitrogen/i, /\bbun\b/i, /ratio/i, /creatinine/i],
  });
  const creat = fp({
    exactCodes: [
      "KFT_CREAT", "BIO_CREAT",
      "BIO_KFT_PANEL_KFT_CREAT", "SYS_KFT_01_CREA", "SYS_KFT_CREAT",
      "BIO_042_CREAT", "BIO_EGFR_CREAT", "BIO_148_EGFR_PANEL_BIO_EGFR_CREAT", "CREAT",
    ],
    exactNames: ["Serum Creatinine", "Creatinine", "S. Creatinine"],
    patterns: [/serum\s+creatinine/i, /^creatinine$/i],
    excludePatterns: [/ratio/i, /bun/i, /clearance/i, /egfr/i, /urine/i],
  });

  const bunTarget = fp({
    exactCodes: [
      "KFT_BUN", "BIO_BUN",
      "BIO_KFT_PANEL_KFT_BUN", "SYS_KFT_BUN", "BIO_065_BUN", "BUN",
    ],
    exactNames: ["Blood Urea Nitrogen (BUN)", "BUN", "Blood Urea Nitrogen"],
    patterns: [/\bblood\s+urea\s+nitrogen\b/i, /\bbun\b/i],
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

  const bunCreatTarget = fp({
    exactCodes: ["KFT_BUN_CREAT_RATIO", "BIO_BUN_CREAT_RATIO", "BIO_066_BUN_CR_RATIO"],
    exactNames: ["BUN / Creatinine Ratio", "BUN/Creatinine Ratio", "BUN / Creatinine"],
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

  const ureaCreatTarget = fp({
    exactCodes: ["BIO_067_UREA_CR_RATIO", "KFT_UREA_CREAT_RATIO"],
    exactNames: ["Urea / Creatinine Ratio", "Urea/Creatinine Ratio", "Urea / Creatinine"],
    patterns: [/\burea\s*[\/:]\s*creat/i, /\burea.*creat.*ratio/i],
    excludePatterns: [],
  });
  if (ureaCreatTarget && urea && creat) {
    calculatedIds.add(ureaCreatTarget.id);
    if (!isNaN(urea.num) && !isNaN(creat.num) && creat.num > 0) {
      setCalc(ureaCreatTarget, (urea.num / creat.num).toFixed(1));
    }
  }

  // eGFR (CKD-EPI 2021)
  const egfrTarget = fp({
    exactCodes: [
      "KFT_EGFR", "BIO_EGFR", "BIO_EGFR_CALC",
      "BIO_148_EGFR_PANEL_BIO_EGFR_CALC", "SYS_KFT_EGFR", "BIO_126_EGFR_PANEL",
    ],
    exactNames: ["eGFR (Estimated GFR)", "Calculated eGFR", "eGFR", "Estimated Glomerular Filtration Rate"],
    patterns: [/\begfr\b/i, /estimated\s+gfr/i, /estimated\s+glomerular/i, /calculated\s+egfr/i],
    excludePatterns: [/stage/i, /category/i, /kdigo/i, /creatinine/i],
  });
  const gfrStageTarget = fp({
    exactCodes: [
      "KFT_GFR_STAGE", "BIO_GFR_STAGE",
      "BIO_148_EGFR_PANEL_BIO_GFR_STAGE",
    ],
    exactNames: ["GFR Category (KDIGO)", "GFR Stage", "GFR Category"],
    patterns: [/gfr category/i, /gfr stage/i, /kdigo.*gfr/i],
    excludePatterns: [],
  });

  if (egfrTarget && creat) calculatedIds.add(egfrTarget.id);
  if (gfrStageTarget && creat) calculatedIds.add(gfrStageTarget.id);

  if (creat && !isNaN(creat?.num || NaN) && (creat?.num || 0) > 0) {
    const scr = creat.num;
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

  // 4. LIPID FORMULAS
  const tchol = fp({
    exactCodes: [
      "LIPID_CHOL", "BIO_055_CHOL", "BIO_LIPID_PANEL_LIPID_CHOL", "LIPID_TOTAL_CHOL", "BIO_TOTAL_CHOL",
      "SYS_LIPID_CHOL", "SYS_LIP_01_CHOL", "CHOL", "CHOLESTEROL",
    ],
    exactNames: ["Total Cholesterol", "Cholesterol Total", "Cholesterol, Total", "Serum Cholesterol", "Cholesterol", "S. Cholesterol", "Total Cholestrol"],
    patterns: [/\b(total\s+cholesterol|cholesterol\s+total|serum\s+cholesterol|s\.?\s*cholesterol)\b/i, /^cholesterol$/i],
    excludePatterns: [/\//, /ratio/i, /\bhdl\b/i, /\bldl\b/i, /\bvldl\b/i, /non.?hdl/i, /\bester\b/i, /free/i],
  });
  const tg = fp({
    exactCodes: [
      "LIPID_TRIG", "BIO_056_TG", "BIO_LIPID_PANEL_LIPID_TRIG", "LIPID_TRIGLYCERIDES", "BIO_TRIGLYCERIDES",
      "SYS_LIPID_TRIG", "SYS_LIP_01_TRIG", "TRIG", "TG",
    ],
    exactNames: ["Triglycerides", "Triglyceride", "Serum Triglycerides", "Serum Triglyceride", "S. Triglycerides", "TG"],
    patterns: [/\b(serum\s+)?triglycerides?\b/i, /^tg$/i, /\btrig\b/i],
    excludePatterns: [/\//, /ratio/i, /thyroglobulin/i, /\bhdl\b/i],
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

// =================== RUN TESTS ===================
console.log("=== RUNNING ALL MEDICAL FORMULA UNIT TESTS ===");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
  }
}

// Test 1: Lipid Profile
console.log("\n[Test 1] Lipid Profile:");
const lipidReport = {
  patient: { gender: "Male", age: 45 },
  results: [
    { id: "chol", test: { name: "Total Cholesterol", testCode: "SYS_LIPID_CHOL" } },
    { id: "tg", test: { name: "Serum Triglycerides", testCode: "SYS_LIPID_TRIG" } },
    { id: "hdl", test: { name: "HDL Cholesterol (Direct)", testCode: "SYS_LIPID_HDL" } },
    { id: "vldl", test: { name: "VLDL Cholesterol", testCode: "SYS_LIPID_VLDL" } },
    { id: "ldl", test: { name: "LDL Cholesterol (Calculated)", testCode: "SYS_LIPID_LDL" } },
    { id: "nonhdl", test: { name: "Non-HDL Cholesterol", testCode: "SYS_LIPID_NON_HDL" } },
    { id: "tc_hdl", test: { name: "Total Cholesterol / HDL Ratio", testCode: "SYS_LIPID_CHOL_HDL_RATIO" } },
    { id: "ldl_hdl", test: { name: "LDL / HDL Ratio", testCode: "SYS_LIPID_LDL_HDL_RATIO" } },
    { id: "tg_hdl", test: { name: "TG / HDL Ratio", testCode: "SYS_LIPID_TG_HDL_RATIO" } },
  ]
};
const lipidVals = { chol: "200", tg: "150", hdl: "40" };
const lipidRes = computeAutomatedFormulas(lipidVals, lipidReport);
assert(lipidRes.calculatedValues["vldl"] === "30.0", `VLDL calculated correctly: ${lipidRes.calculatedValues["vldl"]}`);
assert(lipidRes.calculatedValues["ldl"] === "130.0", `LDL calculated correctly: ${lipidRes.calculatedValues["ldl"]}`);
assert(lipidRes.calculatedValues["nonhdl"] === "160.0", `Non-HDL calculated correctly: ${lipidRes.calculatedValues["nonhdl"]}`);
assert(lipidRes.calculatedValues["tc_hdl"] === "5.00", `TC/HDL calculated correctly: ${lipidRes.calculatedValues["tc_hdl"]}`);
assert(lipidRes.calculatedValues["ldl_hdl"] === "3.25", `LDL/HDL calculated correctly: ${lipidRes.calculatedValues["ldl_hdl"]}`);
assert(lipidRes.calculatedValues["tg_hdl"] === "3.75", `TG/HDL calculated correctly: ${lipidRes.calculatedValues["tg_hdl"]}`);

// Test 2: CBC
console.log("\n[Test 2] Complete Blood Count (CBC):");
const cbcReport = {
  patient: { gender: "Female", age: 28 },
  results: [
    { id: "hb", test: { name: "Hemoglobin (Hb)", testCode: "CBC_HB" } },
    { id: "rbc", test: { name: "Total RBC Count", testCode: "CBC_RBC" } },
    { id: "pcv", test: { name: "Packed Cell Volume (PCV / Hematocrit)", testCode: "CBC_PCV" } },
    { id: "tlc", test: { name: "Total Leucocyte Count (TLC / WBC)", testCode: "CBC_TLC" } },
    { id: "neu", test: { name: "Neutrophils (Segmented)", testCode: "CBC_NEU" } },
    { id: "lym", test: { name: "Lymphocytes", testCode: "CBC_LYM" } },
    { id: "eos", test: { name: "Eosinophils", testCode: "CBC_EOS" } },
    { id: "mon", test: { name: "Monocytes", testCode: "CBC_MON" } },
    { id: "bas", test: { name: "Basophils", testCode: "CBC_BAS" } },
    { id: "mcv", test: { name: "Mean Corpuscular Volume (MCV)", testCode: "CBC_MCV" } },
    { id: "mch", test: { name: "Mean Corpuscular Hemoglobin (MCH)", testCode: "CBC_MCH" } },
    { id: "mchc", test: { name: "Mean Corpuscular Hb Concentration (MCHC)", testCode: "CBC_MCHC" } },
    { id: "nlr", test: { name: "Neutrophil Lymphocyte Ratio (NLR)", testCode: "CBC_NLR" } },
    { id: "anc", test: { name: "Absolute Neutrophil Count (ANC)", testCode: "CBC_ANC" } },
    { id: "alc", test: { name: "Absolute Lymphocyte Count (ALC)", testCode: "CBC_ALC" } },
    { id: "aec", test: { name: "Absolute Eosinophil Count (AEC)", testCode: "CBC_AEC" } },
    { id: "amc", test: { name: "Absolute Monocyte Count (AMC)", testCode: "CBC_AMC" } },
    { id: "abc", test: { name: "Absolute Basophil Count (ABC)", testCode: "CBC_ABC" } },
  ]
};
const cbcVals = {
  hb: "14.0", rbc: "4.5", pcv: "42.0", tlc: "8000",
  neu: "60", lym: "30", eos: "5", mon: "4", bas: "1"
};
const cbcRes = computeAutomatedFormulas(cbcVals, cbcReport);
assert(cbcRes.calculatedValues["mcv"] === "93.3", `MCV: ${cbcRes.calculatedValues["mcv"]}`);
assert(cbcRes.calculatedValues["mch"] === "31.1", `MCH: ${cbcRes.calculatedValues["mch"]}`);
assert(cbcRes.calculatedValues["mchc"] === "33.3", `MCHC: ${cbcRes.calculatedValues["mchc"]}`);
assert(cbcRes.calculatedValues["nlr"] === "2.00", `NLR: ${cbcRes.calculatedValues["nlr"]}`);
assert(cbcRes.calculatedValues["anc"] === "4800", `ANC: ${cbcRes.calculatedValues["anc"]}`);
assert(cbcRes.calculatedValues["alc"] === "2400", `ALC: ${cbcRes.calculatedValues["alc"]}`);
assert(cbcRes.calculatedValues["aec"] === "400", `AEC: ${cbcRes.calculatedValues["aec"]}`);
assert(cbcRes.calculatedValues["amc"] === "320", `AMC: ${cbcRes.calculatedValues["amc"]}`);
assert(cbcRes.calculatedValues["abc"] === "80", `ABC: ${cbcRes.calculatedValues["abc"]}`);

// Test 2B: CBC with ESR (SYS_CBC_01 codes)
console.log("\n[Test 2B] Complete Blood Count with DLC & ESR (SYS_CBC_01):");
const cbcWithEsrReport = {
  patient: { gender: "Male", age: 35 },
  results: [
    { id: "esr_hb", test: { name: "Hemoglobin (Hb)", testCode: "CBC_HB_SYS_CBC_01" } },
    { id: "esr_rbc", test: { name: "Total RBC Count", testCode: "CBC_RBC_SYS_CBC_01" } },
    { id: "esr_pcv", test: { name: "Packed Cell Volume (PCV / Hematocrit)", testCode: "CBC_PCV_SYS_CBC_01" } },
    { id: "esr_tlc", test: { name: "Total Leucocyte Count (TLC / WBC)", testCode: "CBC_TLC_SYS_CBC_01" } },
    { id: "esr_neu", test: { name: "Neutrophils (Segmented)", testCode: "CBC_NEU_SYS_CBC_01" } },
    { id: "esr_lym", test: { name: "Lymphocytes", testCode: "CBC_LYM_SYS_CBC_01" } },
    { id: "esr_eos", test: { name: "Eosinophils", testCode: "CBC_EOS_SYS_CBC_01" } },
    { id: "esr_mon", test: { name: "Monocytes", testCode: "CBC_MON_SYS_CBC_01" } },
    { id: "esr_bas", test: { name: "Basophils", testCode: "CBC_BAS_SYS_CBC_01" } },
    { id: "esr_mcv", test: { name: "Mean Corpuscular Volume (MCV)", testCode: "CBC_MCV_SYS_CBC_01" } },
    { id: "esr_mch", test: { name: "Mean Corpuscular Hemoglobin (MCH)", testCode: "CBC_MCH_SYS_CBC_01" } },
    { id: "esr_mchc", test: { name: "Mean Corpuscular Hb Concentration (MCHC)", testCode: "CBC_MCHC_SYS_CBC_01" } },
    { id: "esr_nlr", test: { name: "Neutrophil Lymphocyte Ratio (NLR)", testCode: "CBC_NLR_SYS_CBC_01" } },
    { id: "esr_anc", test: { name: "Absolute Neutrophil Count (ANC)", testCode: "CBC_ANC_SYS_CBC_01" } },
    { id: "esr_alc", test: { name: "Absolute Lymphocyte Count (ALC)", testCode: "CBC_ALC_SYS_CBC_01" } },
    { id: "esr_aec", test: { name: "Absolute Eosinophil Count (AEC)", testCode: "CBC_AEC_SYS_CBC_01" } },
    { id: "esr_amc", test: { name: "Absolute Monocyte Count (AMC)", testCode: "CBC_AMC_SYS_CBC_01" } },
    { id: "esr_abc", test: { name: "Absolute Basophil Count (ABC)", testCode: "CBC_ABC_SYS_CBC_01" } },
    { id: "esr_val", test: { name: "Erythrocyte Sedimentation Rate (ESR)", testCode: "HAEM_ESR" } },
  ]
};
const cbcWithEsrVals = {
  esr_hb: "13.5", esr_rbc: "4.8", esr_pcv: "40.5", esr_tlc: "9500",
  esr_neu: "65", esr_lym: "25", esr_eos: "6", esr_mon: "3", esr_bas: "1",
  esr_val: "15"
};
const cbcWithEsrRes = computeAutomatedFormulas(cbcWithEsrVals, cbcWithEsrReport);
assert(cbcWithEsrRes.calculatedValues["esr_mcv"] === "84.4", `CBC w/ ESR MCV: ${cbcWithEsrRes.calculatedValues["esr_mcv"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_mch"] === "28.1", `CBC w/ ESR MCH: ${cbcWithEsrRes.calculatedValues["esr_mch"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_mchc"] === "33.3", `CBC w/ ESR MCHC: ${cbcWithEsrRes.calculatedValues["esr_mchc"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_nlr"] === "2.60", `CBC w/ ESR NLR: ${cbcWithEsrRes.calculatedValues["esr_nlr"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_anc"] === "6175", `CBC w/ ESR ANC: ${cbcWithEsrRes.calculatedValues["esr_anc"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_alc"] === "2375", `CBC w/ ESR ALC: ${cbcWithEsrRes.calculatedValues["esr_alc"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_aec"] === "570", `CBC w/ ESR AEC: ${cbcWithEsrRes.calculatedValues["esr_aec"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_amc"] === "285", `CBC w/ ESR AMC: ${cbcWithEsrRes.calculatedValues["esr_amc"]}`);
assert(cbcWithEsrRes.calculatedValues["esr_abc"] === "95", `CBC w/ ESR ABC: ${cbcWithEsrRes.calculatedValues["esr_abc"]}`);

// Test 2C: Standalone CBC (HAEM_CBC_STANDALONE) with Absolute Counts placed BEFORE DLC in array
console.log("\n[Test 2C] Standalone CBC (HAEM_CBC_STANDALONE with Absolute counts group preceding DLC):");
const cbcStandaloneReport = {
  patient: { gender: "Male", age: 42 },
  results: [
    { id: "sa_hb", test: { name: "Hemoglobin (Hb)", testCode: "CBC_HB_HAEM_CBC_STANDALONE" } },
    { id: "sa_rbc", test: { name: "Total RBC Count", testCode: "CBC_RBC_HAEM_CBC_STANDALONE" } },
    { id: "sa_pcv", test: { name: "Packed Cell Volume (PCV / Hematocrit)", testCode: "CBC_PCV_HAEM_CBC_STANDALONE" } },
    { id: "sa_tlc", test: { name: "Total Leucocyte Count (TLC / WBC)", testCode: "CBC_TLC_HAEM_CBC_STANDALONE" } },
    // Notice: Absolute counts appear FIRST in the array (exact case from database)
    { id: "sa_anc", test: { name: "Absolute Neutrophil Count (ANC)", testCode: "CBC_ANC_HAEM_CBC_STANDALONE" } },
    { id: "sa_alc", test: { name: "Absolute Lymphocyte Count (ALC)", testCode: "CBC_ALC_HAEM_CBC_STANDALONE" } },
    { id: "sa_aec", test: { name: "Absolute Eosinophil Count (AEC)", testCode: "CBC_AEC_HAEM_CBC_STANDALONE" } },
    { id: "sa_amc", test: { name: "Absolute Monocyte Count (AMC)", testCode: "CBC_AMC_HAEM_CBC_STANDALONE" } },
    { id: "sa_abc", test: { name: "Absolute Basophil Count (ABC)", testCode: "CBC_ABC_HAEM_CBC_STANDALONE" } },
    // DLC follows
    { id: "sa_neu", test: { name: "Neutrophils (Segmented)", testCode: "CBC_NEU_HAEM_CBC_STANDALONE" } },
    { id: "sa_lym", test: { name: "Lymphocytes", testCode: "CBC_LYM_HAEM_CBC_STANDALONE" } },
    { id: "sa_eos", test: { name: "Eosinophils", testCode: "CBC_EOS_HAEM_CBC_STANDALONE" } },
    { id: "sa_mon", test: { name: "Monocytes", testCode: "CBC_MON_HAEM_CBC_STANDALONE" } },
    { id: "sa_bas", test: { name: "Basophils", testCode: "CBC_BAS_HAEM_CBC_STANDALONE" } },
    { id: "sa_nlr", test: { name: "Neutrophil Lymphocyte Ratio (NLR)", testCode: "CBC_NLR_HAEM_CBC_STANDALONE" } },
  ]
};
const cbcStandaloneVals = {
  sa_hb: "15.0", sa_rbc: "5.0", sa_pcv: "45.0", sa_tlc: "7000",
  sa_neu: "70", sa_lym: "20", sa_eos: "5", sa_mon: "4", sa_bas: "1"
};
const cbcStandaloneRes = computeAutomatedFormulas(cbcStandaloneVals, cbcStandaloneReport);
assert(cbcStandaloneRes.calculatedValues["sa_anc"] === "4900", `Standalone CBC ANC: ${cbcStandaloneRes.calculatedValues["sa_anc"]}`);
assert(cbcStandaloneRes.calculatedValues["sa_alc"] === "1400", `Standalone CBC ALC: ${cbcStandaloneRes.calculatedValues["sa_alc"]}`);
assert(cbcStandaloneRes.calculatedValues["sa_aec"] === "350", `Standalone CBC AEC: ${cbcStandaloneRes.calculatedValues["sa_aec"]}`);
assert(cbcStandaloneRes.calculatedValues["sa_amc"] === "280", `Standalone CBC AMC: ${cbcStandaloneRes.calculatedValues["sa_amc"]}`);
assert(cbcStandaloneRes.calculatedValues["sa_abc"] === "70", `Standalone CBC ABC: ${cbcStandaloneRes.calculatedValues["sa_abc"]}`);
assert(cbcStandaloneRes.calculatedValues["sa_nlr"] === "3.50", `Standalone CBC NLR: ${cbcStandaloneRes.calculatedValues["sa_nlr"]}`);

// Test 3: LFT
console.log("\n[Test 3] Liver Function Test (LFT):");
const lftReport = {
  patient: { gender: "Male", age: 35 },
  results: [
    { id: "tb", test: { name: "Bilirubin Total", testCode: "BIO_LFT_PANEL_LFT_BIL_TOT" } },
    { id: "db", test: { name: "Bilirubin Direct", testCode: "BIO_LFT_PANEL_LFT_BIL_DIR" } },
    { id: "ib", test: { name: "Bilirubin Indirect", testCode: "BIO_LFT_PANEL_LFT_BIL_INDIR" } },
    { id: "tp", test: { name: "Total Protein", testCode: "BIO_LFT_PANEL_LFT_TOT_PROT" } },
    { id: "alb", test: { name: "Albumin", testCode: "BIO_LFT_PANEL_LFT_ALBUMIN" } },
    { id: "glob", test: { name: "Globulin", testCode: "BIO_LFT_PANEL_LFT_GLOBULIN" } },
    { id: "ag", test: { name: "A : G Ratio", testCode: "BIO_LFT_PANEL_LFT_AG_RATIO" } },
    { id: "sgot", test: { name: "SGOT / AST", testCode: "BIO_LFT_PANEL_LFT_SGOT" } },
    { id: "sgpt", test: { name: "SGPT / ALT", testCode: "BIO_LFT_PANEL_LFT_SGPT" } },
    { id: "ast_alt", test: { name: "SGOT / SGPT Ratio", testCode: "BIO_LFT_PANEL_LFT_AST_ALT_RATIO" } },
  ]
};
const lftVals = { tb: "1.8", db: "0.5", tp: "7.2", alb: "4.2", sgot: "35", sgpt: "25" };
const lftRes = computeAutomatedFormulas(lftVals, lftReport);
assert(lftRes.calculatedValues["ib"] === "1.30", `Indirect Bilirubin: ${lftRes.calculatedValues["ib"]}`);
assert(lftRes.calculatedValues["glob"] === "3.00", `Globulin: ${lftRes.calculatedValues["glob"]}`);
assert(lftRes.calculatedValues["ag"] === "1.40", `A:G Ratio: ${lftRes.calculatedValues["ag"]}`);
assert(lftRes.calculatedValues["ast_alt"] === "1.40", `AST/ALT Ratio: ${lftRes.calculatedValues["ast_alt"]}`);

// Test 4: KFT
console.log("\n[Test 4] Kidney Function Test (KFT):");
const kftReport = {
  patient: { gender: "Male", age: 50 },
  results: [
    { id: "urea", test: { name: "Blood Urea", testCode: "KFT_UREA" } },
    { id: "creat", test: { name: "Serum Creatinine", testCode: "KFT_CREAT" } },
    { id: "bun", test: { name: "Blood Urea Nitrogen (BUN)", testCode: "KFT_BUN" } },
    { id: "bun_cr", test: { name: "BUN / Creatinine Ratio", testCode: "KFT_BUN_CREAT_RATIO" } },
    { id: "urea_cr", test: { name: "Urea / Creatinine Ratio", testCode: "BIO_067_UREA_CR_RATIO" } },
    { id: "egfr", test: { name: "eGFR (Estimated GFR)", testCode: "KFT_EGFR" } },
    { id: "gfr_stage", test: { name: "GFR Category (KDIGO)", testCode: "KFT_GFR_STAGE" } },
  ]
};
const kftVals = { urea: "30", creat: "1.0" };
const kftRes = computeAutomatedFormulas(kftVals, kftReport);
assert(kftRes.calculatedValues["bun"] === "14.0", `BUN: ${kftRes.calculatedValues["bun"]}`);
assert(kftRes.calculatedValues["bun_cr"] === "14.0", `BUN/Creatinine: ${kftRes.calculatedValues["bun_cr"]}`);
assert(kftRes.calculatedValues["urea_cr"] === "30.0", `Urea/Creatinine: ${kftRes.calculatedValues["urea_cr"]}`);
assert(parseInt(kftRes.calculatedValues["egfr"]) > 0, `eGFR: ${kftRes.calculatedValues["egfr"]}`);
assert(typeof kftRes.calculatedValues["gfr_stage"] === "string", `GFR Stage: ${kftRes.calculatedValues["gfr_stage"]}`);

// Test 5: Coagulation PT/INR & APTT
console.log("\n[Test 5] Coagulation PT/INR & APTT:");
const coagReport = {
  patient: { gender: "Male", age: 30 },
  results: [
    { id: "pt_pat", test: { name: "PT (Patient)", testCode: "SYS_COAG_PT_PAT" } },
    { id: "pt_ctrl", test: { name: "PT (Control)", testCode: "SYS_COAG_PT_CTRL" } },
    { id: "inr", test: { name: "INR (International Normalized Ratio)", testCode: "HAEM_PT_INR" } },
    { id: "aptt_pat", test: { name: "APTT (Patient)", testCode: "SYS_COAG_APTT_PAT" } },
    { id: "aptt_ctrl", test: { name: "APTT (Control)", testCode: "SYS_COAG_APTT_CTRL" } },
    { id: "aptt_ratio", test: { name: "Ratio (Patient / Control)", testCode: "HAEM_APTT_RATIO" } },
  ]
};
const coagVals = { pt_pat: "13.5", pt_ctrl: "12.0", aptt_pat: "33.0", aptt_ctrl: "30.0" };
const coagRes = computeAutomatedFormulas(coagVals, coagReport);
assert(coagRes.calculatedValues["inr"] === "1.13", `INR: ${coagRes.calculatedValues["inr"]}`);
assert(coagRes.calculatedValues["aptt_ratio"] === "1.10", `APTT Ratio: ${coagRes.calculatedValues["aptt_ratio"]}`);

// Test 6: HbA1c
console.log("\n[Test 6] HbA1c & eAG:");
const hba1cReport = {
  patient: { gender: "Male", age: 40 },
  results: [
    { id: "hba1c", test: { name: "HbA1c Glycated Hemoglobin", testCode: "HBA1C_VAL" } },
    { id: "eag", test: { name: "Estimated Average Glucose (eAG)", testCode: "HBA1C_EAG" } },
  ]
};
const hba1cVals = { hba1c: "7.0" };
const hba1cRes = computeAutomatedFormulas(hba1cVals, hba1cReport);
assert(hba1cRes.calculatedValues["eag"] === "154", `eAG: ${hba1cRes.calculatedValues["eag"]}`);

// Test 7: Iron Studies
console.log("\n[Test 7] Iron Studies:");
const ironReport = {
  patient: { gender: "Female", age: 24 },
  results: [
    { id: "iron", test: { name: "Serum Iron", testCode: "SYS_IRON_SERUM" } },
    { id: "tibc", test: { name: "Total Iron Binding Capacity (TIBC)", testCode: "SYS_IRON_TIBC" } },
    { id: "uibc", test: { name: "Unsaturated Iron Binding Capacity (UIBC)", testCode: "SYS_IRON_UIBC" } },
    { id: "sat", test: { name: "Transferrin Saturation", testCode: "IRON_SATURATION" } },
  ]
};
const ironVals = { iron: "80", tibc: "320" };
const ironRes = computeAutomatedFormulas(ironVals, ironReport);
assert(ironRes.calculatedValues["uibc"] === "240.0", `UIBC: ${ironRes.calculatedValues["uibc"]}`);
assert(ironRes.calculatedValues["sat"] === "25.0", `Transferrin Saturation: ${ironRes.calculatedValues["sat"]}`);

// Test 8: Semen Analysis
console.log("\n[Test 8] Semen Analysis:");
const semReport = {
  patient: { gender: "Male", age: 32 },
  results: [
    { id: "vol", test: { name: "Volume", testCode: "SEMEN_VOLUME" } },
    { id: "count", test: { name: "Total Sperm Count", testCode: "SEM_SPERM_COUNT" } },
    { id: "ejac", test: { name: "Total Sperm Count per Ejaculate", testCode: "SEMEN_EJACULATE_COUNT" } },
    { id: "prog", test: { name: "Progressive Motile", testCode: "SEMEN_PROG_MOTILE" } },
    { id: "nonprog", test: { name: "Non-Progressive", testCode: "SEMEN_NON_PROG_MOTILE" } },
    { id: "mot", test: { name: "Total Motility", testCode: "SEMEN_TOTAL_MOTILITY" } },
  ]
};
const semVals = { vol: "3.0", count: "50", prog: "45", nonprog: "15" };
const semRes = computeAutomatedFormulas(semVals, semReport);
assert(semRes.calculatedValues["ejac"] === "150.0", `Total Ejaculate: ${semRes.calculatedValues["ejac"]}`);
assert(semRes.calculatedValues["mot"] === "60.0", `Total Motility: ${semRes.calculatedValues["mot"]}`);

console.log(`\n===========================================`);
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log(`===========================================`);
if (passed === total) {
  console.log("ALL UNIT TESTS PASSED WITH 100% ACCURACY!");
} else {
  process.exit(1);
}
