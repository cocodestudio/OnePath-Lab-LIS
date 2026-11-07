import { AnalyzerModel, getAnalyzerById, ANALYZER_CATALOG } from "./analyzer-catalog";

export interface SimulatorParsedResult {
  analyzerId: string;
  analyzerName: string;
  protocol: string;
  category: string;
  connectionType: string;
  sampleId: string;
  parameters: Record<string, { value: string; unit: string; flag: string }>;
  histograms: Record<string, string>;
  rawPacket: string;
  isControl: boolean;
  timestamp: string;
}

/**
 * Standard default clinical reference values for virtual simulation packets
 */
export const DEFAULT_CLINICAL_VALUES: Record<string, { value: string; unit: string }> = {
  // Biochemistry
  GLU: { value: "95.5", unit: "mg/dL" },
  FBS: { value: "92.0", unit: "mg/dL" },
  PPBS: { value: "128.0", unit: "mg/dL" },
  UREA: { value: "28.5", unit: "mg/dL" },
  BUN: { value: "13.3", unit: "mg/dL" },
  CREAT: { value: "1.05", unit: "mg/dL" },
  SGOT: { value: "26.0", unit: "U/L" },
  SGPT: { value: "29.0", unit: "U/L" },
  ALP: { value: "85.0", unit: "U/L" },
  BILT: { value: "0.85", unit: "mg/dL" },
  BILD: { value: "0.22", unit: "mg/dL" },
  CHOL: { value: "178.0", unit: "mg/dL" },
  TRIG: { value: "135.0", unit: "mg/dL" },
  HDLDI: { value: "48.0", unit: "mg/dL" },
  LDLDI: { value: "103.0", unit: "mg/dL" },
  TP: { value: "7.1", unit: "g/dL" },
  ALB: { value: "4.3", unit: "g/dL" },
  URIC: { value: "5.2", unit: "mg/dL" },
  CAL: { value: "9.4", unit: "mg/dL" },

  // Haematology (5-Part / 3-Part CBC)
  WBC: { value: "7200", unit: "/cumm" },
  RBC: { value: "4.85", unit: "10^12/L" },
  HGB: { value: "14.2", unit: "g/dL" },
  HCT: { value: "42.5", unit: "%" },
  MCV: { value: "87.6", unit: "fL" },
  MCH: { value: "29.3", unit: "pg" },
  MCHC: { value: "33.4", unit: "g/dL" },
  PLT: { value: "245000", unit: "/cumm" },
  "NEU%": { value: "62.5", unit: "%" },
  "LYM%": { value: "28.4", unit: "%" },
  "MON%": { value: "6.1", unit: "%" },
  "EOS%": { value: "2.4", unit: "%" },
  "BAS%": { value: "0.6", unit: "%" },
  "MID%": { value: "6.5", unit: "%" },
  "RDW-CV": { value: "13.2", unit: "%" },
  MPV: { value: "9.6", unit: "fL" },

  // Immunology & Hormones
  TSH: { value: "2.35", unit: "µIU/mL" },
  T3: { value: "125.0", unit: "ng/dL" },
  T4: { value: "8.2", unit: "µg/dL" },
  FT3: { value: "3.2", unit: "pg/mL" },
  FT4: { value: "1.25", unit: "ng/dL" },
  VITD: { value: "34.5", unit: "ng/mL" },
  B12: { value: "480.0", unit: "pg/mL" },
  FERRITIN: { value: "92.0", unit: "ng/mL" },
  FERR: { value: "92.0", unit: "ng/mL" },
  PSA: { value: "1.15", unit: "ng/mL" },
  BHCG: { value: "<2.0", unit: "mIU/mL" },

  // Electrolytes
  NA: { value: "139.0", unit: "mmol/L" },
  K: { value: "4.2", unit: "mmol/L" },
  CL: { value: "102.0", unit: "mmol/L" },
  ICA: { value: "1.18", unit: "mmol/L" },
  LI: { value: "0.72", unit: "mmol/L" },
  PH: { value: "7.40", unit: "pH" },

  // Coagulation
  PT: { value: "12.6", unit: "sec" },
  INR: { value: "1.04", unit: "ratio" },
  APTT: { value: "29.8", unit: "sec" },
  FIB: { value: "285.0", unit: "mg/dL" },
  TT: { value: "15.2", unit: "sec" },
  DDIMER: { value: "0.22", unit: "mg/L" },

  // Urinalysis
  URO: { value: "Normal", unit: "" },
  BIL: { value: "Negative", unit: "" },
  KET: { value: "Negative", unit: "" },
  BLD: { value: "Negative", unit: "" },
  PRO: { value: "Nil", unit: "" },
  NIT: { value: "Negative", unit: "" },
  LEU: { value: "Negative", unit: "" },
  SG: { value: "1.020", unit: "" },
};

/**
 * Normalizes machine-specific short codes into standard canonical LIS codes
 */
export function normalizeBiochemCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === "GLUC" || c === "FBS" || c === "RBS" || c === "PPBS") return "GLU";
  if (c === "ALT" || c === "GPT") return "SGPT";
  if (c === "AST" || c === "GOT") return "SGOT";
  if (c === "TBIL" || c === "T-BIL" || c === "BILI-T" || c === "BILI_TOTAL") return "BILT";
  if (c === "DBIL" || c === "D-BIL" || c === "BILI-D" || c === "BILI_DIRECT") return "BILD";
  if (c === "CREA" || c === "CR") return "CREAT";
  if (c === "UA") return "URIC";
  if (c === "TCHOL" || c === "T-CHOL") return "CHOL";
  if (c === "TG") return "TRIG";
  if (c === "HDL" || c === "HDL-C") return "HDLDI";
  if (c === "LDL" || c === "LDL-C") return "LDLDI";
  if (c === "PROT" || c === "TOTAL_PROTEIN") return "TP";
  if (c === "ALBUMIN") return "ALB";
  if (c === "AKP" || c === "ALKP") return "ALP";
  if (c === "CA" || c === "CALCIUM") return "CAL";
  return c;
}

/**
 * Generates an authentic ASTM E1394 packet for Beacon UNIKON 230 / B200 Automated Chemistry.
 */
export function generateUnikon230Packet(sampleId = "SMP-UNIKON-101"): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const lines = [
    `H|\\^&|||Beacon UNIKON 230||||||||1.0|${ts}`,
    `P|1||||Sharma^Amit||19850615|M`,
    `O|1|${sampleId}||^^^SERUM|R|${ts}|||||A`,
    `R|1|^^^GLU^1|98.4|mg/dL||N||F`,
    `R|2|^^^SGPT^1|34.2|U/L||N||F`,
    `R|3|^^^SGOT^1|29.1|U/L||N||F`,
    `R|4|^^^BILT^1|0.82|mg/dL||N||F`,
    `R|5|^^^BILD^1|0.21|mg/dL||N||F`,
    `R|6|^^^UREA^1|27.8|mg/dL||N||F`,
    `R|7|^^^CREAT^1|1.02|mg/dL||N||F`,
    `R|8|^^^URIC^1|5.3|mg/dL||N||F`,
    `R|9|^^^CHOL^1|172.0|mg/dL||N||F`,
    `R|10|^^^TRIG^1|138.0|mg/dL||N||F`,
    `R|11|^^^ALP^1|88.0|U/L||N||F`,
    `R|12|^^^CAL^1|9.3|mg/dL||N||F`,
    `L|1|N`,
  ];
  return lines.join("\r") + "\r";
}

/**
 * Generates an authentic HL7 v2.3.1 MLLP packet for Mindray BC-5000 5-Part Hematology.
 */
export function generateMindrayBc5000Packet(sampleId = "SMP-MINDRAY-501"): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const lines = [
    `\x0bMSH|^~\\&|Mindray|BC-5000|||${ts}||ORU^R01|10001|P|2.3.1`,
    `PID|1||||Verma^Sunita||19920412|F`,
    `OBR|1||${sampleId}||||${ts}`,
    `OBX|1|NM|6690-2^WBC^LN||7.4|10^9/L|4.0-10.0||||F`,
    `OBX|2|NM|789-8^RBC^LN||4.80|10^12/L|3.8-5.5||||F`,
    `OBX|3|NM|718-7^HGB^LN||142|g/L|115-160||||F`,
    `OBX|4|NM|4544-3^HCT^LN||43.0|%|36.0-48.0||||F`,
    `OBX|5|NM|787-2^MCV^LN||89.5|fL|80.0-100.0||||F`,
    `OBX|6|NM|785-6^MCH^LN||29.6|pg|27.0-33.0||||F`,
    `OBX|7|NM|786-4^MCHC^LN||330|g/L|320-360||||F`,
    `OBX|8|NM|777-3^PLT^LN||245|10^9/L|150-450||||F`,
    `OBX|9|NM|10030^NEU%^LN||62.8|%|40.0-75.0||||F`,
    `OBX|10|NM|736-9^LYM%^LN||28.2|%|20.0-45.0||||F`,
    `OBX|11|NM|10029^MON%^LN||6.0|%|2.0-10.0||||F`,
    `OBX|12|NM|10028^EOS%^LN||2.4|%|1.0-6.0||||F`,
    `OBX|13|NM|10027^BAS%^LN||0.6|%|0.0-1.0||||F`,
    `OBX|14|NM|788-0^RDW-CV^LN||13.1|%|11.0-16.0||||F`,
    `OBX|15|NM|32623-1^MPV^LN||9.7|fL|6.5-12.0||||F\r\x1c\r`,
  ];
  return lines.join("\r");
}

/**
 * Universal packet generator: takes ANY analyzer from the 211 catalog and
 * generates a realistic packet formatted for its protocol (ASTM or HL7).
 */
export function generateVirtualPacketForAnalyzer(
  analyzer: AnalyzerModel,
  sampleId = "SMP-TEST-001"
): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const mappings = analyzer.parameter_mappings || {};
  const isHl7 = analyzer.protocol.includes("HL7");

  if (isHl7) {
    const lines = [
      `\x0bMSH|^~\\&|${analyzer.brand}|${analyzer.model}|||${ts}||ORU^R01|1001|P|2.3.1`,
      `PID|1||||Test^Patient||19900101|M`,
      `OBR|1||${sampleId}||||${ts}`,
    ];

    let seq = 1;
    for (const [code] of Object.entries(mappings)) {
      const defaultInfo = DEFAULT_CLINICAL_VALUES[code.toUpperCase()] || { value: "10.0", unit: "" };
      lines.push(`OBX|${seq}|NM|0000^${code}^LIS||${defaultInfo.value}|${defaultInfo.unit}|||||F`);
      seq++;
    }

    lines.push(`\x1c\r`);
    return lines.join("\r");
  }

  // ASTM E1394 Standard
  const lines = [
    `H|\\^&|||${analyzer.brand} ${analyzer.model}||||||||1.0|${ts}`,
    `P|1||||Test^Patient||19900101|M`,
    `O|1|${sampleId}||^^^SERUM|R|${ts}|||||A`,
  ];

  let seq = 1;
  for (const [code] of Object.entries(mappings)) {
    const defaultInfo = DEFAULT_CLINICAL_VALUES[code.toUpperCase()] || { value: "10.0", unit: "" };
    lines.push(`R|${seq}|^^^${code}^1|${defaultInfo.value}|${defaultInfo.unit}||N||F`);
    seq++;
  }

  lines.push(`L|1|N`);
  return lines.join("\r") + "\r";
}

/**
 * Standalone parser simulator: executes the exact same AST/HL7 packet extraction
 * logic as `onepath-bridge.js` in-memory.
 */
export function parseSimulatorPacket(
  rawPacket: string,
  analyzerId = "beacon-unikon-230"
): SimulatorParsedResult {
  const analyzer = getAnalyzerById(analyzerId) || ANALYZER_CATALOG[0];
  let sampleId = "UNKNOWN";
  const parameters: Record<string, { value: string; unit: string; flag: string }> = {};
  const histograms: Record<string, string> = {};

  const lines = rawPacket.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 1. HL7 OBR / PID for Sample ID
    if (line.startsWith("OBR|")) {
      const parts = line.split("|");
      const sid = parts[2] || parts[3] || "";
      if (sid.trim()) {
        sampleId = sid.trim().replace(/^\^+/, "").replace(/\^.*$/, "");
      }
    }

    // 2. HL7 OBX Result Line
    if (line.startsWith("OBX|")) {
      const parts = line.split("|");
      if (parts.length >= 6) {
        const idTokens = (parts[3] || "").split("^");
        const loinc = (idTokens[0] || "").trim();
        const nameToken = (idTokens[1] || idTokens[0] || "").trim().toUpperCase();

        let code = "";
        if (loinc === "6690-2" || nameToken === "WBC") code = "WBC";
        else if (loinc === "789-8" || nameToken === "RBC") code = "RBC";
        else if (loinc === "718-7" || nameToken === "HGB" || nameToken === "HB") code = "HGB";
        else if (loinc === "4544-3" || nameToken === "HCT") code = "HCT";
        else if (loinc === "787-2" || nameToken === "MCV") code = "MCV";
        else if (loinc === "785-6" || nameToken === "MCH") code = "MCH";
        else if (loinc === "786-4" || nameToken === "MCHC") code = "MCHC";
        else if (loinc === "777-3" || nameToken === "PLT") code = "PLT";
        else if (loinc === "10030" || nameToken === "NEU%" || nameToken === "GRAN%") code = "NEU%";
        else if (loinc === "736-9" || nameToken === "LYM%" || nameToken === "LYMPH%") code = "LYM%";
        else if (loinc === "10029" || nameToken === "MON%" || nameToken === "MID%") code = "MON%";
        else if (loinc === "10028" || nameToken === "EOS%") code = "EOS%";
        else if (loinc === "10027" || nameToken === "BAS%") code = "BAS%";
        else if (loinc === "788-0" || nameToken === "RDW-CV") code = "RDW-CV";
        else if (loinc === "32623-1" || nameToken === "MPV") code = "MPV";
        else if (nameToken) code = normalizeBiochemCode(nameToken);

        let value = parts[5] ? parts[5].trim() : "";
        let unit = parts[6] ? parts[6].trim() : "";
        const flag = parts[8] ? parts[8].trim() : "N";

        if (code === "WBC" && parseFloat(value) > 0 && parseFloat(value) < 100) {
          value = String(Math.round(parseFloat(value) * 1000));
          unit = "/cumm";
        }
        if (code === "HGB" && unit.toLowerCase() === "g/l" && parseFloat(value) > 30) {
          value = (parseFloat(value) / 10).toFixed(1);
          unit = "g/dL";
        }
        if (code === "MCHC" && unit.toLowerCase() === "g/l" && parseFloat(value) > 100) {
          value = (parseFloat(value) / 10).toFixed(1);
          unit = "g/dL";
        }

        if (code && value !== "") {
          parameters[code] = { value, unit, flag };
        }
      }
    }

    // 3. ASTM Order Record
    if (line.startsWith("O|")) {
      const parts = line.split("|");
      const sid = parts[2] || parts[3] || "";
      if (sid.trim()) {
        sampleId = sid.trim().replace(/^\^+/, "").replace(/\^.*$/, "");
      }
    }

    // 4. ASTM Result Record
    if (line.startsWith("R|")) {
      const parts = line.split("|");
      if (parts.length >= 4) {
        const rawId = parts[2] || "";
        let code = "";
        if (rawId.includes("^")) {
          const idTokens = rawId.split("^").map((t) => t.trim().toUpperCase()).filter(Boolean);
          const alphaToken = idTokens.find((t) => /^[A-Z][A-Z0-9_\-%]+$/.test(t) && !/^\d+$/.test(t));
          code = alphaToken || idTokens[idTokens.length - 1] || "";
        } else {
          code = rawId.trim().toUpperCase();
        }

        code = normalizeBiochemCode(code);

        let value = parts[3] ? parts[3].trim() : "";
        let unit = parts[4] ? parts[4].trim() : "";
        const flag = parts[6] ? parts[6].trim() : "N";

        if (code === "WBC" && parseFloat(value) > 0 && parseFloat(value) < 100) {
          value = String(Math.round(parseFloat(value) * 1000));
          unit = "/cumm";
        }

        if (code && value !== "" && value !== "*****" && value !== "----") {
          parameters[code] = { value, unit, flag };
        }
      }
    }
  }

  const isBiochem = Object.keys(parameters).some((k) =>
    [
      "ALP", "AMY", "BILT", "BILD", "CAL", "CHOL", "HDLDI", "LDLDI",
      "GLU", "CREAT", "UREA", "BUN", "SGOT", "SGPT", "TP", "ALB",
      "GLOB", "TRIG", "URIC", "PHOS", "NA", "K", "CL"
    ].includes(k.toUpperCase())
  );

  const isControl = /^(QC|CAL|BLANK|STD|CTRL)/i.test(sampleId.trim());

  return {
    analyzerId: analyzer.id,
    analyzerName: `${analyzer.brand} ${analyzer.model}`,
    protocol: analyzer.protocol,
    category: isBiochem ? "Biochemistry" : analyzer.category,
    connectionType: analyzer.connection_type,
    sampleId,
    parameters,
    histograms,
    rawPacket,
    isControl,
    timestamp: new Date().toISOString(),
  };
}
