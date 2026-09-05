import * as React from "react";
import { FileText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getCleanLetterheadUrl } from "@/lib/api-client";
import { BarcodeSVG } from "@/components/barcode-svg";
import { normalizeReportSettings, type ReportLayoutSettings, defaultReportLayoutSettings, resolveSignatureUrl } from "@/lib/report-settings";
import { getClinicalInterpretation } from "@/lib/clinical-interpretations";

interface Test { 
  id: string; name: string; category: string; price: number; unit: string; 
  interpretation?: string | null; comment?: string | null; notes?: string | null;
  method?: string | null; fieldType?: string;
  rangeType?: string | null; range_type?: string | null;
  textRefRange?: string | null; text_ref_range?: string | null;
  genderRefType?: string; refRangeMin: number; refRangeMax: number; 
  refRangeMinMale?: number | null; refRangeMaxMale?: number | null; 
  refRangeMinFemale?: number | null; refRangeMaxFemale?: number | null; 
  refRangeMinChild?: number | null; refRangeMaxChild?: number | null; 
  refRangeMinNewborn?: number | null; refRangeMaxNewborn?: number | null; 
  ageRanges?: any[] | null; age_ranges?: any[] | null;
  valueType?: string; customOptions?: string | null;
  sort_order?: number | null; sortOrder?: number | null;
  is_hidden?: boolean | null; isHidden?: boolean | null;
  parent?: { 
    id: string; name: string; method?: string; interpretation?: string; comment?: string; notes?: string;
    sort_order?: number | null; sortOrder?: number | null; is_hidden?: boolean | null; isHidden?: boolean | null;
    parent?: { id: string; name: string; method?: string; interpretation?: string; comment?: string; notes?: string; sort_order?: number | null; sortOrder?: number | null; is_hidden?: boolean | null; isHidden?: boolean | null; } 
  };
}

export interface ReportTest { 
  id: string; 
  resultValue: string | null; 
  isAbnormal: boolean; 
  remarks?: string | null;
  test: Test; 
}

export interface PrintSettings {
  bgImage: string | null;
  headerHeight: number;
  footerHeight: number;
  marginLeft: number;
  marginRight: number;
}

export interface ReportSheetData {
  id: string; customId: string; status: string; createdAt: string;
  reportDate?: string;
  patient: { 
    name: string; 
    age: number; 
    gender: string; 
    phone: string; 
    refDoctor: string; 
    customId: string; 
    address: string | null;
    email?: string | null;
    aadhaarNo?: string | null;
    aadhaar_no?: string | null;
    insuranceNo?: string | null;
    insurance_no?: string | null;
    height?: string | number | null;
    weight?: string | number | null;
  };
  results: ReportTest[];
  lab: { 
    name: string; 
    email: string; 
    address: string; 
    phone?: string;
    city?: string;
    state?: string;
    pincode?: string;
    logoUrl: string | null; 
    printBgImage?: string | null;
    printHeaderHeight?: number;
    printFooterHeight?: number;
    printMarginLeft?: number;
    printMarginRight?: number;
    reportSettings?: any;
    report_settings?: any;
    default_designation?: string;
  };
  printedInterpretations?: string | null;
  testNotes?: Record<string, { notes?: string; remarks?: string; advices?: string }> | string | null;
  test_notes?: Record<string, { notes?: string; remarks?: string; advices?: string }> | string | null;
}

export const A4_W = 794;
export const A4_H = 1123;

export interface ReportBlock { key: string; node: React.ReactNode; }

export function PatientInfoBlock({ report }: { report: ReportSheetData }) {
  const patient = report.patient || ({} as any);
  const lab = (report.lab || {}) as any;
  const reportSettings = normalizeReportSettings(lab.report_settings || lab.reportSettings || (report as any).report_settings || (report as any).reportSettings);

  const regDateStr = (() => {
    try {
      const d = report.reportDate ? new Date(report.reportDate) : (report.createdAt ? new Date(report.createdAt) : new Date());
      return isNaN(d.getTime()) ? (report.reportDate || report.createdAt || "") : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return report.reportDate || report.createdAt || "";
    }
  })();

  const hasRefDoctor = Boolean(patient.refDoctor && patient.refDoctor.trim() !== "" && patient.refDoctor.trim() !== "—" && patient.refDoctor.trim() !== "N/A" && patient.refDoctor.trim() !== "null");
  const doctorName = hasRefDoctor ? (patient.refDoctor?.startsWith("Dr") ? patient.refDoctor : `Dr. ${patient.refDoctor}`) : "Self";

  const allMap: Record<string, { label: string; value: React.ReactNode }> = {
    "Name": { label: "Patient Name:", value: <span className="font-extrabold text-[11.5px] text-black uppercase">{patient.name || "—"}</span> },
    "Age/Gender": { 
      label: "Age / Gender:", 
      value: (
        <span className="font-semibold">
          {patient.age !== undefined && patient.age !== null ? `${patient.age} Y` : ""}
          {patient.age !== undefined && patient.gender ? " / " : ""}
          {patient.gender || ""}
        </span>
      )
    },
    "Referred By": { label: "Referred By:", value: <span className="font-semibold text-zinc-900">{doctorName}</span> },
    "Email ID": { label: "Email ID:", value: <span className="font-mono text-[10px]">{patient.email || (report as any).patient?.email || "—"}</span> },
    "Insurance No.": { label: "Insurance No:", value: <span className="font-mono">{patient.insuranceNo || patient.insurance_no || "—"}</span> },
    "Report ID": { label: "Report ID:", value: <span className="font-bold text-black font-mono">{report.customId || "—"}</span> },
    "Report Date": { label: "Report Date:", value: <span>{regDateStr}</span> },
    "Registration Date": { label: "Reg. Date:", value: <span>{regDateStr}</span> },
    "Phone No.": { label: "Contact No:", value: <span className="font-mono">{reportSettings.fieldsToShow.phoneNumber ? (patient.phone || "—") : "—"}</span> },
    "Aadhaar No.": { label: "Aadhaar No:", value: <span className="font-mono">{patient.aadhaarNo || patient.aadhaar_no || "—"}</span> },
    "Patient ID": { label: "Patient ID (PID):", value: <span className="font-bold text-black font-mono">{patient.customId || "—"}</span> },
    "Address": { label: "Address:", value: <span className="break-words font-medium">{patient.address || "—"}</span> },
    "Collected At": { label: "Collected At:", value: <span>{(report as any).collectedAt || "Main Lab"}</span> },
    "UHID": { label: "UHID:", value: <span className="font-mono font-bold">{patient.customId || "—"}</span> },
    "Passport Number": { label: "Passport No:", value: <span className="font-mono">{(patient as any).passportNumber || (patient as any).passport_no || "—"}</span> },
    "Owner Name": { label: "Owner Name:", value: <span>{(patient as any).ownerName || "—"}</span> },
    "Breed": { label: "Breed:", value: <span>{(patient as any).breed || "—"}</span> },
    "Species": { label: "Species:", value: <span>{(patient as any).species || "—"}</span> },
    "Referring Lab": { label: "Referring Lab:", value: <span>{(report as any).referringLab || "—"}</span> },
    "Received Date": { label: "Received Date:", value: <span>{regDateStr}</span> },
    "Company": { label: "Company:", value: <span>{(report as any).company || lab.name || "—"}</span> },
    "Report Status": { label: "Status:", value: <span className="font-bold uppercase text-emerald-700 text-[10px]">{report.status || "COMPLETED"}</span> },
    "Barcode": { label: "Barcode:", value: <BarcodeSVG value={report.customId || report.id} width={0.9} height={18} fontSize={7} /> },
    "Referring Hospital": { label: "Referring Hosp:", value: <span>{(report as any).referringHospital || "—"}</span> },
    "Second Referral": { label: "2nd Referral:", value: <span>{(report as any).secondReferral || "—"}</span> },
    "Government Panel": { label: "Govt Panel:", value: <span>{(report as any).govPanel || "—"}</span> },
    "Collection Date": { label: "Collection Date:", value: <span>{regDateStr}</span> },
    "B2B Address": { label: "B2B Address:", value: <span>{lab.address || "—"}</span> },
    "Custom ID": { label: "Custom ID:", value: <span className="font-mono">{report.customId || "—"}</span> },
    "B2B Phone Number": { label: "Lab Phone:", value: <span className="font-mono">{lab.phone || "—"}</span> },
    "B2B Email": { label: "Lab Email:", value: <span>{lab.email || "—"}</span> },
    "TPA": { label: "TPA:", value: <span>{(report as any).tpa || "—"}</span> },
    "Corporate Client": { label: "Corporate:", value: <span>{(report as any).corporateClient || "—"}</span> },
    "Corporate Plan": { label: "Corp Plan:", value: <span>{(report as any).corporatePlan || "—"}</span> },
    "Processed At": { label: "Processed At:", value: <span>{(report as any).processedAt || "Main Lab"}</span> },
    "Pincode": { label: "Pincode:", value: <span>{lab.pincode || "—"}</span> },
    "District": { label: "District:", value: <span>{lab.city || "—"}</span> },
    "Town": { label: "Town:", value: <span>{lab.city || "—"}</span> },
    "Collection Center": { label: "Center:", value: <span>{(report as any).collectionCenter || "Main Branch"}</span> },
    "HFR ID": { label: "HFR ID:", value: <span>{(report as any).hfrId || "—"}</span> },
    "Investigation": { label: "Investigation:", value: <span>{report.results?.[0]?.test?.category || "General Pathology"}</span> },
    "Height": { label: "Height:", value: <span>{patient.height ? `${patient.height} cm` : "—"}</span> },
    "Weight": { label: "Weight:", value: <span>{patient.weight ? `${patient.weight} kg` : "—"}</span> },
  };

  const activeOrder = reportSettings.patientDetailsOrder && reportSettings.patientDetailsOrder.length > 0
    ? reportSettings.patientDetailsOrder
    : ["Name", "Patient ID", "Age/Gender", "Report ID", "Phone No.", "Referred By", "Address", "Report Date"];

  const items: { label: string; value: React.ReactNode }[] = [];
  activeOrder.forEach((key) => {
    if (allMap[key]) {
      items.push(allMap[key]);
    }
  });

  const baseUrl = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://app.onepathlab.com";
  const reportIdentifier = report.id || report.customId || "";
  const qrValue = `${baseUrl}/r/${reportIdentifier}`;

  return (
    <div 
      className="border border-zinc-300 rounded-xs px-2.5 py-1.5 mb-2 text-[11px] leading-[1.3] text-zinc-900 bg-white"
      style={{ fontFamily: 'Arial, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Dynamic 2-Column Info Grid based on Custom Sequence Ordering */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-x-5 gap-y-0.5">
            {items.map((item, idx) => (
              <div key={idx} className={`flex items-start ${idx % 2 === 1 ? "border-l border-zinc-200 pl-3" : ""}`}>
                <span className="w-24 text-zinc-600 font-bold shrink-0">{item.label}</span>
                <div className="flex-1 min-w-0">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Scannable Barcode tightly placed under left info with 0 extra whitespace */}
          {reportSettings.typography.showBarcode && (
            <div className="mt-1 flex items-center gap-2">
              <BarcodeSVG value={report.customId || report.id} width={1.0} height={16} fontSize={7.5} />
              <span className="text-[7.5px] font-mono text-zinc-400 font-semibold tracking-wider">LAB ACCREDITED</span>
            </div>
          )}
        </div>

        {/* Dynamic QR Code Verification Stamp */}
        <div className="shrink-0 flex flex-col items-center justify-center border-l border-zinc-200 pl-3 min-w-[68px]">
          <div className="bg-white p-0.5 rounded border border-zinc-300 shadow-2xs">
            <QRCodeSVG
              value={qrValue}
              size={48}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="mt-0.5 text-center leading-none">
            <span className="text-[7px] font-bold text-zinc-700 uppercase tracking-tighter block">Scan to Verify</span>
            <span className="text-[6px] font-semibold text-emerald-700 uppercase tracking-tighter block mt-0.5">& Download</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDepartmentPriority(category: string): number {
  const cat = (category || "").trim().toLowerCase();
  if (cat.includes("haemat") || cat.includes("hemat") || cat.includes("blood")) return 10;
  if (cat.includes("bio") || cat.includes("chem")) return 20;
  if (cat.includes("serol") || cat.includes("immun") || cat.includes("hormone") || cat.includes("endocrin")) return 30;
  if (cat.includes("micro") || cat.includes("path") || cat.includes("urine") || cat.includes("stool") || cat.includes("semen")) return 40;
  return 50;
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

export function buildReportBlocks(
  report: ReportSheetData,
  opts?: { hidePatientBlock?: boolean; hideInterpretation?: boolean }
): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const lab = (report.lab || {}) as any;
  const reportSettings = normalizeReportSettings(lab.report_settings || lab.reportSettings || (report as any).report_settings || (report as any).reportSettings);
  const typo = reportSettings.typography;
  const flagsConf = reportSettings.flags;
  const sp = reportSettings.spacing;
  const cw = reportSettings.columnWidth;
  const cl = reportSettings.columnLabels;
  const interpConf = reportSettings.interpretation;
  const noteConf = reportSettings.noteComment;
  const endConf = reportSettings.endingLine;

  const groupedTests: Record<string, Record<string, ReportTest[]>> = {};
  (report.results || []).forEach((item) => {
    const cat = item.test.category || "General Pathology";
    if (!groupedTests[cat]) groupedTests[cat] = {};

    let mainTestName = item.test.name;
    if (item.test.parent) {
      if (item.test.parent.parent) {
        mainTestName = item.test.parent.parent.name;
      } else {
        mainTestName = item.test.parent.name;
      }
    }

    if (!groupedTests[cat][mainTestName]) groupedTests[cat][mainTestName] = [];
    groupedTests[cat][mainTestName].push(item);
  });

  const patientAge = report.patient.age || 25;
  const patientGender = report.patient.gender || "male";

  const getRefRange = (item: ReportTest): string => {
    const t = item.test;
    if (t.rangeType === "TEXT" || t.range_type === "TEXT") {
      return (t.textRefRange || t.text_ref_range || "—").trim();
    }

    if (t.rangeType === "AGE_BASED" || t.range_type === "AGE_BASED") {
      const ageRanges = t.ageRanges || t.age_ranges;
      if (Array.isArray(ageRanges) && ageRanges.length > 0 && !isNaN(patientAge)) {
        const match = ageRanges.find((r: any) => {
          const minA = r.minAge ?? r.min_age ?? 0;
          const maxA = r.maxAge ?? r.max_age ?? 999;
          return patientAge >= minA && patientAge <= maxA;
        });
        if (match) {
          const minVal = match.minVal ?? match.min_val;
          const maxVal = match.maxVal ?? match.max_val;
          if (minVal !== undefined && maxVal !== undefined) {
            return `${minVal} - ${maxVal}`;
          }
        }
      }
    }

    if (t.genderRefType === "CHILD_SPECIFIC" && patientAge < 12) {
      if (t.refRangeMinChild !== undefined && t.refRangeMaxChild !== undefined) {
        return `${t.refRangeMinChild} - ${t.refRangeMaxChild}`;
      }
    }

    if (t.genderRefType === "GENDER_SPECIFIC" || t.genderRefType === "BY_GENDER") {
      const gender = patientGender.toLowerCase();
      if (gender === "female" && t.refRangeMinFemale !== undefined && t.refRangeMaxFemale !== undefined) {
        return `${t.refRangeMinFemale} - ${t.refRangeMaxFemale}`;
      }
      if (gender === "male" && t.refRangeMinMale !== undefined && t.refRangeMaxMale !== undefined) {
        return `${t.refRangeMinMale} - ${t.refRangeMaxMale}`;
      }
    }

    if (t.refRangeMin !== undefined && t.refRangeMax !== undefined && (t.refRangeMin !== 0 || t.refRangeMax !== 0)) {
      return `${t.refRangeMin} - ${t.refRangeMax}`;
    }

    return "—";
  };

  const getFlag = (valStr: string | null, item: ReportTest): { flag: "H" | "L" | null; label: string; color: string } => {
    if (!flagsConf.enabled || !valStr) return { flag: null, label: "", color: "#000000" };
    const val = parseFloat(valStr);
    if (isNaN(val)) return { flag: null, label: "", color: "#000000" };

    let minRange: number | undefined = item.test.refRangeMin;
    let maxRange: number | undefined = item.test.refRangeMax;

    if (item.test.genderRefType === "CHILD_SPECIFIC" && patientAge < 12) {
      minRange = item.test.refRangeMinChild ?? minRange;
      maxRange = item.test.refRangeMaxChild ?? maxRange;
    } else if (item.test.genderRefType === "GENDER_SPECIFIC" || item.test.genderRefType === "BY_GENDER") {
      const gender = patientGender.toLowerCase();
      if (gender === "female") {
        minRange = item.test.refRangeMinFemale ?? minRange;
        maxRange = item.test.refRangeMaxFemale ?? maxRange;
      } else {
        minRange = item.test.refRangeMinMale ?? minRange;
        maxRange = item.test.refRangeMaxMale ?? maxRange;
      }
    }

    if (minRange !== undefined && val < minRange) {
      const label = flagsConf.showArrows ? "▼ L" : "L";
      return { flag: "L", label, color: flagsConf.lowColor || "#000000" };
    }
    if (maxRange !== undefined && maxRange > 0 && val > maxRange) {
      const label = flagsConf.showArrows ? "▲ H" : "H";
      return { flag: "H", label, color: flagsConf.highColor || "#000000" };
    }
    return { flag: null, label: "", color: "#000000" };
  };

  if (!report.results || report.results.length === 0) {
    blocks.push({
      key: "pending-status-block",
      node: (
        <div className="text-center py-8 border border-dashed border-zinc-300 rounded text-zinc-400 my-4">
          <FileText className="h-7 w-7 mx-auto mb-2 text-zinc-300" />
          <p className="text-xs font-semibold">No investigations or results recorded for this report.</p>
        </div>
      ),
    });
    return blocks;
  }

  let printedInterps: string[] = [];
  let hasExplicitInterpSetting = false;
  try {
    const raw = report.printedInterpretations ?? (report as any).printed_interpretations;
    if (raw !== undefined && raw !== null) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        hasExplicitInterpSetting = true;
        printedInterps = parsed;
      }
    }
  } catch (e) {}

  let parsedTestNotes: Record<string, { notes?: string; remarks?: string; advices?: string }> = {};
  try {
    const rawNotes = report.testNotes || report.test_notes;
    if (typeof rawNotes === "string") {
      parsedTestNotes = JSON.parse(rawNotes);
    } else if (typeof rawNotes === "object" && rawNotes !== null) {
      parsedTestNotes = rawNotes;
    }
  } catch (e) {}

  // Render Tests by Department and Test Panels in Medical Priority Order
  const sortedCategories = Object.entries(groupedTests).sort(([catA], [catB]) => {
    const pA = getDepartmentPriority(catA);
    const pB = getDepartmentPriority(catB);
    if (pA !== pB) return pA - pB;
    return catA.localeCompare(catB);
  });

  sortedCategories.forEach(([category, mainTests]) => {
    // 1. Department Header
    if (reportSettings.fieldsToShow.departmentName !== false) {
      blocks.push({
        key: `department-header-${category}`,
        node: (
          <div 
            className={`font-extrabold text-zinc-900 uppercase tracking-widest pb-1 mb-1 border-b border-zinc-300 ${
              typo.departmentNameAlignment === "Left" ? "text-left" : "text-center"
            }`}
            style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: `${typo.departmentFontSize || 13}px`,
              paddingTop: `${sp.department || 2}px`,
            }}
          >
            {category}
          </div>
        ),
      });
    }

    const sortedMainTests = Object.entries(mainTests).sort(([nameA], [nameB]) => {
      const pA = getTestPriority(nameA, category);
      const pB = getTestPriority(nameB, category);
      if (pA !== pB) return pA - pB;
      return nameA.localeCompare(nameB);
    });

    sortedMainTests.forEach(([mainTestName, itemsList]) => {
      if (!itemsList || itemsList.length === 0) return;

      const firstTestObj = itemsList[0].test;
      const mainTestObj = firstTestObj.parent?.parent ? firstTestObj.parent.parent : (firstTestObj.parent ? firstTestObj.parent : firstTestObj);
      const allCustomEditor = itemsList.every(item => item.test.fieldType === "Custom Editor");

      // 2. Test Panel Title Header (e.g. * COMPLETE BLOOD COUNT (CBC))
      blocks.push({
        key: `header-${category}-${mainTestName}`,
        node: (
          <div 
            className={`border-b border-zinc-800 pb-0.5 flex items-baseline ${
              typo.testNameAlignment === "Middle" ? "justify-center" : "justify-between"
            }`}
            style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif',
              marginTop: `${sp.testName || 7}px`,
              marginBottom: `${typo.spacingBetweenTests || 6}px`,
            }}
          >
            <span 
              className="font-extrabold text-zinc-950 uppercase tracking-wide"
              style={{ fontSize: `${typo.testNameFontSize || 12}px` }}
            >
              * {mainTestName}
            </span>
            {reportSettings.fieldsToShow.testMethod && mainTestObj.method && (
              <span 
                className="font-semibold italic ml-2"
                style={{ 
                  fontSize: `${typo.testMethodFontSize || 8}px`,
                  color: typo.testMethodColor || "#71717a",
                  marginTop: `${sp.testMethod || -2}px`,
                }}
              >
                Method: {mainTestObj.method}
              </span>
            )}
          </div>
        ),
      });

      // 3. Custom Editor or Table Rows
      if (allCustomEditor) {
        itemsList.forEach((item) => {
          blocks.push({
            key: `custom-editor-${item.id}`,
            node: (
              <div 
                className="my-1.5 p-2 bg-white rounded leading-relaxed text-zinc-900"
                style={{ 
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: `${typo.testParameterFontSize || 11}px`,
                  textAlign: typo.testBodyImageAlignment === "Left" ? "left" : typo.testBodyImageAlignment === "Right" ? "right" : "center",
                }}
                dangerouslySetInnerHTML={{ __html: item.resultValue || "<p class='text-zinc-400 italic text-xs'>No content recorded.</p>" }}
              />
            ),
          });
        });
      } else {
        // Table Header
        const col4Width = sp.interchangeColumns ? `${cw.unit}%` : `${cw.refRange}%`;
        const col5Width = sp.interchangeColumns ? `${cw.refRange}%` : `${cw.unit}%`;
        const col4Label = sp.interchangeColumns ? cl.unit : cl.refRange;
        const col5Label = sp.interchangeColumns ? cl.refRange : cl.unit;

        blocks.push({
          key: `tblhead-${category}-${mainTestName}`,
          node: (
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: `${typo.columnHeadingFontSize || 10}px`,
                fontWeight: "bold",
                backgroundColor: "#f4f4f5",
                borderBottom: typo.removeLineAtEndOfTest ? "none" : "2px solid #18181b",
                marginBottom: "1px",
              }}
            >
              <colgroup>
                <col style={{ width: `${cw.testDescription}%` }} />
                <col style={{ width: `${cw.result}%` }} />
                <col style={{ width: `${cw.flag}%` }} />
                <col style={{ width: col4Width }} />
                <col style={{ width: col5Width }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ padding: `${sp.columnHeader || 4}px 6px ${sp.columnHeader || 4}px 4px`, textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cl.testDescription}</th>
                  <th style={{ padding: `${sp.columnHeader || 4}px 4px`, textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cl.result}</th>
                  <th style={{ padding: `${sp.columnHeader || 4}px 2px`, textAlign: "center", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cl.flag}</th>
                  <th style={{ padding: `${sp.columnHeader || 4}px 4px ${sp.columnHeader || 4}px 16px`, textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{col4Label}</th>
                  <th style={{ padding: `${sp.columnHeader || 4}px 4px ${sp.columnHeader || 4}px 12px`, textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{col5Label}</th>
                </tr>
              </thead>
            </table>
          ),
        });

        // Group and order items/subgroups sequentially
        type RenderUnit = 
          | { type: "item"; item: ReportTest; sortOrder: number }
          | { type: "subgroup"; title: string; items: ReportTest[]; sortOrder: number };

        const renderUnits: RenderUnit[] = [];
        const subGroupMap: Record<string, { items: ReportTest[]; sortOrder: number }> = {};

        itemsList.forEach((item) => {
          if (item.test.parent && item.test.parent.parent && item.test.parent.name !== mainTestName) {
            const subName = item.test.parent.name;
            const parentOrder = item.test.parent.sort_order ?? (item.test.parent as any)?.sortOrder ?? item.test.sort_order ?? 0;
            if (!subGroupMap[subName]) {
              subGroupMap[subName] = { items: [], sortOrder: parentOrder };
            }
            subGroupMap[subName].items.push(item);
          } else {
            const itemOrder = item.test.sort_order ?? (item.test as any)?.sortOrder ?? 0;
            renderUnits.push({ type: "item", item, sortOrder: itemOrder });
          }
        });

        // Add subgroups to renderUnits
        Object.entries(subGroupMap).forEach(([subName, data]) => {
          // Sort items within subgroup
          data.items.sort((a, b) => {
            const orderA = a.test.sort_order ?? (a.test as any)?.sortOrder ?? 0;
            const orderB = b.test.sort_order ?? (b.test as any)?.sortOrder ?? 0;
            if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
            return 0;
          });
          const minOrder = data.items[0]?.test.sort_order ?? data.sortOrder;
          renderUnits.push({ type: "subgroup", title: subName, items: data.items, sortOrder: minOrder || data.sortOrder });
        });

        // Sort all render units by sortOrder
        renderUnits.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder && a.sortOrder !== 0 && b.sortOrder !== 0) {
            return a.sortOrder - b.sortOrder;
          }
          if (a.sortOrder !== 0 && b.sortOrder === 0) return -1;
          if (a.sortOrder === 0 && b.sortOrder !== 0) return 1;
          return 0;
        });

        const vAlign = (typo.rowAlignment as string) === "Top" ? "top" : "middle";

        const renderSingleRow = (item: ReportTest, isIndented = false) => {
          const refRange = getRefRange(item);
          const flagInfo = getFlag(item.resultValue, item);
          const isHighOrLow = flagInfo.flag === "H" || flagInfo.flag === "L";
          const isAbnormal = item.isAbnormal || isHighOrLow;

          const paramName = typo.properCaseTestNames
            ? item.test.name.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())
            : item.test.name;

          const paramPad = `${sp.testParameters || 2}px`;

          const col4Content = sp.interchangeColumns ? (item.test.unit || "") : refRange;
          const col5Content = sp.interchangeColumns ? refRange : (item.test.unit || "");

          return (
            <table
              key={item.id}
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                fontFamily: 'Arial, Helvetica, sans-serif',
                borderBottom: typo.lineBelowEachParameterRow ? "1px solid #e4e4e7" : "none",
              }}
            >
              <colgroup>
                <col style={{ width: `${cw.testDescription}%` }} />
                <col style={{ width: `${cw.result}%` }} />
                <col style={{ width: `${cw.flag}%` }} />
                <col style={{ width: col4Width }} />
                <col style={{ width: col5Width }} />
              </colgroup>
              <tbody>
                <tr style={{ verticalAlign: vAlign }}>
                  <td 
                    style={{ 
                      padding: `${paramPad} 6px ${paramPad} 4px`, 
                      fontSize: `${typo.testParameterFontSize || 10.5}px`, 
                      lineHeight: "1.4", 
                      fontWeight: flagsConf.boldOnlyResultAndFlag ? (typo.boldMultiTypeParameter ? "700" : "500") : (isAbnormal ? "700" : "500"), 
                      color: "#000" 
                    }}
                  >
                    {isIndented && !typo.leftAlignSubParameters ? (
                      <span style={{ paddingLeft: "10px", display: "block", fontSize: `${(typo.testParameterFontSize || 10.5) - 0.5}px` }}>
                        {paramName}
                      </span>
                    ) : (
                      paramName
                    )}
                    {reportSettings.fieldsToShow.testMethod && item.test.method && item.test.method !== mainTestObj.method && (
                      <div 
                        style={{ 
                          fontSize: `${typo.testMethodFontSize || 8.5}px`, 
                          color: typo.testMethodColor || "#71717a", 
                          fontStyle: "italic", 
                          fontWeight: "400", 
                          marginTop: `${sp.testMethod || -2}px`, 
                        }}
                      >
                        Method: {item.test.method}
                      </div>
                    )}
                  </td>
                  {/* VALUE */}
                  <td 
                    style={{ 
                      padding: `${paramPad} 4px`, 
                      fontSize: `${(typo.testParameterFontSize || 10.5) + 0.5}px`, 
                      lineHeight: "1.4", 
                      fontFamily: "monospace", 
                      fontWeight: isAbnormal ? "700" : "400", 
                      color: isHighOrLow ? flagInfo.color : "#000", 
                      textAlign: "left", 
                      verticalAlign: vAlign 
                    }}
                  >
                    {item.resultValue || "—"}
                  </td>
                  {/* FLAG */}
                  <td 
                    style={{ 
                      padding: `${paramPad} 2px`, 
                      fontSize: `${typo.testParameterFontSize || 10.5}px`, 
                      lineHeight: "1.4", 
                      fontWeight: "800", 
                      color: flagInfo.color, 
                      textAlign: "center", 
                      verticalAlign: vAlign 
                    }}
                  >
                    {flagInfo.label}
                  </td>
                  {/* COL 4 (REF RANGE OR UNIT) */}
                  <td 
                    style={{ 
                      padding: `${paramPad} 4px ${paramPad} 16px`, 
                      fontSize: `${typo.testParameterFontSize || 10.5}px`, 
                      lineHeight: "1.4", 
                      fontFamily: sp.interchangeColumns ? "inherit" : "monospace", 
                      color: sp.interchangeColumns ? "#52525b" : "#3f3f46", 
                      textAlign: "left", 
                      verticalAlign: vAlign 
                    }}
                  >
                    {col4Content}
                  </td>
                  {/* COL 5 (UNIT OR REF RANGE) */}
                  <td 
                    style={{ 
                      padding: `${paramPad} 4px ${paramPad} 12px`, 
                      fontSize: `${(typo.testParameterFontSize || 10.5) - (sp.interchangeColumns ? 0 : 0.5)}px`, 
                      lineHeight: "1.4", 
                      fontFamily: sp.interchangeColumns ? "monospace" : "inherit",
                      color: sp.interchangeColumns ? "#3f3f46" : "#52525b", 
                      textAlign: "left", 
                      verticalAlign: vAlign 
                    }}
                  >
                    {col5Content}
                  </td>
                </tr>
                {item.remarks && item.remarks.trim() !== "" && (
                  <tr>
                    <td colSpan={5} style={{ padding: `${sp.parameterComment || 2}px 4px ${sp.parameterComment || 2}px 8px`, fontSize: `${typo.parameterCommentFontSize || 9.5}px`, color: "#52525b", fontStyle: "italic", borderLeft: "2px solid #a78bfa" }}>
                      <span style={{ fontWeight: "600", fontStyle: "normal", color: "#3f3f46" }}>Remark: </span>
                      {item.remarks}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        };

        // Render each unit in exact sequential sorted order
        renderUnits.forEach((unit) => {
          if (unit.type === "item") {
            blocks.push({
              key: `row-${unit.item.id}`,
              node: renderSingleRow(unit.item, false),
            });
          } else {
            blocks.push({
              key: `subgroup-title-${mainTestName}-${unit.title}`,
              node: (
                <div 
                  className="pt-2 pb-0.5 font-bold text-[10.5px] text-zinc-900 uppercase tracking-wide border-b border-zinc-300 mt-1 mb-0.5"
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  {unit.title}
                </div>
              ),
            });

            unit.items.forEach((subItem) => {
              blocks.push({
                key: `row-${subItem.id}`,
                node: renderSingleRow(subItem, true),
              });
            });
          }
        });
      }

      // Test Section Findings: Notes, Remarks, Advices
      const activeTestNotes = parsedTestNotes[mainTestObj.id] || parsedTestNotes[mainTestName] || {};
      const hasSectionFindings = activeTestNotes.notes || activeTestNotes.remarks || activeTestNotes.advices;

      if (hasSectionFindings) {
        blocks.push({
          key: `findings-${category}-${mainTestName}`,
          node: (
            <div 
              className="mt-2 p-2 bg-zinc-50 border border-zinc-200 rounded text-[10px] space-y-1"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', pageBreakInside: 'avoid' }}
            >
              {activeTestNotes.notes && (
                <div>
                  <span className="font-bold text-zinc-900 uppercase" style={{ fontSize: `${noteConf.headingFontSize || 10}px` }}>Note: </span>
                  <span className="text-zinc-800 font-semibold" style={{ fontSize: `${noteConf.contentFontSize || 10}px` }}>{activeTestNotes.notes}</span>
                </div>
              )}
              {activeTestNotes.remarks && (
                <div>
                  <span className="font-bold text-zinc-900 uppercase" style={{ fontSize: `${noteConf.headingFontSize || 10}px` }}>Remarks: </span>
                  <span className="text-zinc-800 font-semibold" style={{ fontSize: `${noteConf.contentFontSize || 10}px` }}>{activeTestNotes.remarks}</span>
                </div>
              )}
              {activeTestNotes.advices && (
                <div>
                  <span className="font-bold text-zinc-900 uppercase" style={{ fontSize: `${noteConf.headingFontSize || 10}px` }}>Advices: </span>
                  <span className="text-zinc-800 font-semibold" style={{ fontSize: `${noteConf.contentFontSize || 10}px` }}>{activeTestNotes.advices}</span>
                </div>
              )}
            </div>
          ),
        });
      }

      // Clinical Interpretation
      const directInterp = mainTestObj.interpretation || firstTestObj.interpretation || itemsList.find(i => i.test?.interpretation)?.test?.interpretation;
      const interpContent = getClinicalInterpretation(mainTestName, directInterp, category);
      const hasInterpText = Boolean(interpContent && interpContent.trim() !== "" && interpContent !== "<p><br></p>");

      const isInterpEnabled = !opts?.hideInterpretation && hasInterpText && (
        !hasExplicitInterpSetting ||
        printedInterps.length === 0 ||
        printedInterps.includes(mainTestObj.id) ||
        printedInterps.includes(firstTestObj.id) ||
        printedInterps.includes(itemsList[0]?.test?.id) ||
        printedInterps.includes("ALL") ||
        mainTestName.toUpperCase().includes("CBC") ||
        mainTestName.toUpperCase().includes("COMPLETE BLOOD")
      );

      if (isInterpEnabled) {
        blocks.push({
          key: `interp-${category}-${mainTestName}`,
          node: (
            <div 
              className="mt-2.5 pt-2 border-t border-dashed border-zinc-400 text-zinc-700 leading-snug"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', pageBreakInside: 'avoid', fontSize: `${interpConf.contentFontSize || 10}px` }}
            >
              <p className={`text-zinc-900 uppercase tracking-wider mb-1.5 ${interpConf.boldHeading ? "font-bold" : "font-semibold"}`} style={{ fontSize: `${interpConf.headingFontSize || 10}px` }}>
                Clinical Notes & Interpretation ({mainTestName}):
              </p>
              <div 
                className="[&_table]:border-collapse [&_table]:w-full [&_table]:my-1.5 [&_table]:border [&_table]:border-zinc-300 [&_th]:border [&_th]:border-zinc-300 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:bg-zinc-100 [&_th]:font-bold [&_th]:text-[10px] [&_th]:text-left [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-[9.5px] [&_td]:leading-relaxed text-zinc-800" 
                dangerouslySetInnerHTML={{ __html: interpContent || "" }} 
              />
            </div>
          ),
        });
      }
    });
  });

  // End of report & Doctor Signatures Footer
  const doctorSignatures = Array.isArray(reportSettings.doctorSignatures) && reportSettings.doctorSignatures.length > 0
    ? reportSettings.doctorSignatures
    : (reportSettings.doctorSignature ? [reportSettings.doctorSignature] : []);

  const enabledSignatures = doctorSignatures.filter(s => s.enabled);

  // Group into rows of 2 (pairs): Left & Right
  const signatureRows: Array<[typeof enabledSignatures[0], typeof enabledSignatures[0] | undefined]> = [];
  for (let i = 0; i < enabledSignatures.length; i += 2) {
    signatureRows.push([enabledSignatures[i], enabledSignatures[i + 1]]);
  }

  blocks.push({
    key: "report-signatures-footer",
    node: (
      <div 
        className="mt-4 pt-2 text-zinc-700 select-none"
        style={{ 
          fontFamily: 'Arial, "Segoe UI", Roboto, sans-serif',
          pageBreakInside: 'avoid' 
        }}
      >
        <div 
          className="text-center font-bold text-zinc-400 uppercase tracking-widest pb-3"
          style={{ fontSize: `${endConf.fontSize || 9}px` }}
        >
          {endConf.text || "*** END OF REPORT ***"}
        </div>

        {/* Dynamic Multi-Doctor Signatures Grid (2 per row: Left & Right) */}
        {enabledSignatures.length > 0 && (
          <div className="pt-2 space-y-4">
            {signatureRows.map((pair, rowIdx) => {
              const leftSig = pair[0];
              const rightSig = pair[1];

              // If only 1 signature in total, respect its alignment
              if (enabledSignatures.length === 1 && leftSig) {
                const align = leftSig.alignment || "right";
                const resolvedUrl = resolveSignatureUrl(leftSig.imageUrl);
                const vertOffset = (leftSig.marginTop || 0) - (leftSig.marginBottom || 0);
                const horizOffset = (leftSig.marginLeft || 0) - (leftSig.marginRight || 0);

                return (
                  <div 
                    key={rowIdx} 
                    className={`flex px-2 text-[10px] ${
                      align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end"
                    }`}
                  >
                    <div 
                      style={{
                        position: "relative",
                        marginTop: `${vertOffset}px`,
                        left: `${horizOffset}px`,
                        textAlign: align,
                      }}
                    >
                      {resolvedUrl ? (
                        <div 
                          className="inline-block"
                          style={{
                            width: `${leftSig.width || 130}px`,
                            marginBottom: "2px",
                          }}
                        >
                          <img
                            src={resolvedUrl}
                            alt={leftSig.name || "Doctor Signature"}
                            style={{
                              width: "100%",
                              height: "auto",
                              maxHeight: "75px",
                              objectFit: "contain",
                              display: "block",
                              marginLeft: align === "center" ? "auto" : (align === "right" ? "auto" : "0"),
                              marginRight: align === "center" ? "auto" : (align === "right" ? "0" : "auto"),
                            }}
                          />
                        </div>
                      ) : (
                        <div className={`w-32 border-b border-dashed border-zinc-400 mb-1 ${align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : "mr-auto"}`} />
                      )}

                      <p className="font-bold text-zinc-900 leading-tight text-[10px]">
                        {leftSig.name}
                      </p>
                      <p className="text-[8.5px] text-zinc-600 leading-tight">
                        {leftSig.designation}
                      </p>
                      {leftSig.registrationNo && (
                        <p className="text-[7.5px] text-zinc-400 font-mono leading-tight">
                          {leftSig.registrationNo}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={rowIdx} className="flex items-start justify-between px-2 text-[10px]">
                  {/* Left Signature */}
                  {leftSig ? (() => {
                    const resolvedUrl = resolveSignatureUrl(leftSig.imageUrl);
                    const align = leftSig.alignment || "left";
                    const vertOffset = (leftSig.marginTop || 0) - (leftSig.marginBottom || 0);
                    const horizOffset = (leftSig.marginLeft || 0) - (leftSig.marginRight || 0);
                    return (
                      <div 
                        style={{
                          position: "relative",
                          marginTop: `${vertOffset}px`,
                          left: `${horizOffset}px`,
                          textAlign: align,
                        }}
                      >
                        {resolvedUrl ? (
                          <div 
                            className="inline-block"
                            style={{
                              width: `${leftSig.width || 130}px`,
                              marginBottom: "2px",
                            }}
                          >
                            <img
                              src={resolvedUrl}
                              alt={leftSig.name || "Doctor Signature"}
                              style={{
                                width: "100%",
                                height: "auto",
                                maxHeight: "75px",
                                objectFit: "contain",
                                display: "block",
                                marginLeft: align === "center" ? "auto" : (align === "right" ? "auto" : "0"),
                                marginRight: align === "center" ? "auto" : (align === "right" ? "0" : "auto"),
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`w-32 border-b border-dashed border-zinc-400 mb-1 ${align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : "mr-auto"}`} />
                        )}

                        <p className="font-bold text-zinc-900 leading-tight text-[10px]">
                          {leftSig.name}
                        </p>
                        <p className="text-[8.5px] text-zinc-600 leading-tight">
                          {leftSig.designation}
                        </p>
                        {leftSig.registrationNo && (
                          <p className="text-[7.5px] text-zinc-400 font-mono leading-tight">
                            {leftSig.registrationNo}
                          </p>
                        )}
                      </div>
                    );
                  })() : <div />}

                  {/* Right Signature */}
                  {rightSig ? (() => {
                    const resolvedUrl = resolveSignatureUrl(rightSig.imageUrl);
                    const align = rightSig.alignment || "right";
                    const vertOffset = (rightSig.marginTop || 0) - (rightSig.marginBottom || 0);
                    const horizOffset = (rightSig.marginLeft || 0) - (rightSig.marginRight || 0);
                    return (
                      <div 
                        style={{
                          position: "relative",
                          marginTop: `${vertOffset}px`,
                          left: `${horizOffset}px`,
                          textAlign: align,
                        }}
                      >
                        {resolvedUrl ? (
                          <div 
                            className="inline-block"
                            style={{
                              width: `${rightSig.width || 130}px`,
                              marginBottom: "2px",
                            }}
                          >
                            <img
                              src={resolvedUrl}
                              alt={rightSig.name || "Doctor Signature"}
                              style={{
                                width: "100%",
                                height: "auto",
                                maxHeight: "75px",
                                objectFit: "contain",
                                display: "block",
                                marginLeft: align === "center" ? "auto" : (align === "right" ? "auto" : "0"),
                                marginRight: align === "center" ? "auto" : (align === "right" ? "0" : "auto"),
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`w-32 border-b border-dashed border-zinc-400 mb-1 ${align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : "mr-auto"}`} />
                        )}

                        <p className="font-bold text-zinc-900 leading-tight text-[10px]">
                          {rightSig.name}
                        </p>
                        <p className="text-[8.5px] text-zinc-600 leading-tight">
                          {rightSig.designation}
                        </p>
                        {rightSig.registrationNo && (
                          <p className="text-[7.5px] text-zinc-400 font-mono leading-tight">
                            {rightSig.registrationNo}
                          </p>
                        )}
                      </div>
                    );
                  })() : <div />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )
  });

  return blocks;
}

/* ─────────────────────────────────────────────────────────
   PaginatedReportPreview — Complete multi-page report engine.
   Used for live preview, browser printing, and PDF export!
   ───────────────────────────────────────────────────────── */
export const PaginatedReportPreview = React.forwardRef<
  HTMLDivElement,
  {
    report: ReportSheetData;
    settings?: PrintSettings;
    scale?: number;
    hidePatientBlock?: boolean;
    hideInterpretation?: boolean;
    onPageCount?: (n: number) => void;
  }
>(({ report, settings, scale = 1, hidePatientBlock, hideInterpretation, onPageCount }, ref) => {
  const blocks = React.useMemo(
    () => buildReportBlocks(report, { hidePatientBlock, hideInterpretation }),
    [report, hidePatientBlock, hideInterpretation]
  );
  const measureRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const patientMeasureRef = React.useRef<HTMLDivElement | null>(null);
  const [heights, setHeights] = React.useState<number[]>([]);
  const [patientH, setPatientH] = React.useState<number>(105);

  const effectiveSettings: PrintSettings = React.useMemo(() => {
    if (settings) {
      return {
        ...settings,
        bgImage: settings.bgImage ? getCleanLetterheadUrl(settings.bgImage) : null,
      };
    }
    const lab = (report.lab || {}) as any;
    const rawBg = lab.printBgImage || lab.print_bg_image || null;
    return {
      bgImage: getCleanLetterheadUrl(rawBg),
      headerHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 185,
      footerHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 95,
      marginLeft: lab.printMarginLeft ?? lab.print_margin_left ?? 32,
      marginRight: lab.printMarginRight ?? lab.print_margin_right ?? 32,
    };
  }, [settings, report]);

  const contentWidth = A4_W - effectiveSettings.marginLeft - effectiveSettings.marginRight;
  const usableH = A4_H - effectiveSettings.headerHeight - effectiveSettings.footerHeight;
  const effectiveUsableH = usableH - (hidePatientBlock ? 0 : patientH);
  const bgImage = effectiveSettings.bgImage || null;

  // Measure block heights at natural (unscaled) content width
  React.useLayoutEffect(() => {
    const next = blocks.map((_, i) => measureRefs.current[i]?.offsetHeight ?? 0);
    setHeights(next);
    if (patientMeasureRef.current) setPatientH(patientMeasureRef.current.offsetHeight);
    const t = setTimeout(() => {
      setHeights(blocks.map((_, i) => measureRefs.current[i]?.offsetHeight ?? 0));
      if (patientMeasureRef.current) setPatientH(patientMeasureRef.current.offsetHeight);
    }, 60);
    return () => clearTimeout(t);
  }, [blocks, contentWidth]);

  // Extract enabled signatures to compute max user margin for smart pagination
  const enabledSignaturesList = React.useMemo(() => {
    const lab = (report.lab || {}) as any;
    const reportSettings = normalizeReportSettings(
      lab.report_settings || lab.reportSettings || (report as any).report_settings || (report as any).reportSettings
    );
    const sigs = Array.isArray(reportSettings.doctorSignatures) && reportSettings.doctorSignatures.length > 0
      ? reportSettings.doctorSignatures
      : (reportSettings.doctorSignature ? [reportSettings.doctorSignature] : []);
    return sigs.filter((s: any) => s.enabled);
  }, [report]);

  const maxUserMarginTop = React.useMemo(() => {
    if (!enabledSignaturesList.length) return 0;
    return Math.max(0, ...enabledSignaturesList.map((s: any) => Number(s.marginTop || 0)));
  }, [enabledSignaturesList]);

  // Pack blocks into pages with Patient Block room on every page
  const pages = React.useMemo(() => {
    if (heights.length !== blocks.length) return [blocks.map((_, i) => i)];
    const result: number[][] = [];
    let current: number[] = [];
    let used = 0;

    blocks.forEach((b, i) => {
      const isSig = b.key === "report-signatures-footer";
      const measuredH = heights[i] || 0;
      // For signature footer, calculate base physical content height without user's large top margin
      // so user can push signature to the footer without falsely creating a 2nd empty page!
      const h = isSig
        ? Math.max(75, measuredH - maxUserMarginTop)
        : measuredH;

      if (current.length > 0 && used + h > effectiveUsableH) {
        result.push(current);
        current = [];
        used = 0;
      }
      current.push(i);
      used += h;
    });

    if (current.length) result.push(current);
    return result.length ? result : [[]];
  }, [blocks, heights, effectiveUsableH, maxUserMarginTop]);

  React.useEffect(() => {
    onPageCount?.(pages.length);
  }, [pages.length, onPageCount]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .report-preview-page-card {
                width: 794px !important;
                height: 1123px !important;
                min-height: 1123px !important;
                max-height: 1123px !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              .report-preview-page-card:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              .report-print-page {
                width: 794px !important;
                height: 1123px !important;
                transform: none !important;
                position: relative !important;
                overflow: hidden !important;
                background-color: #ffffff !important;
              }
            }
          `,
        }}
      />

      {/* Hidden measurer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: -99999,
          width: contentWidth,
          visibility: "hidden",
          pointerEvents: "none",
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", Roboto, sans-serif',
        }}
        aria-hidden
      >
        <div ref={patientMeasureRef}>
          <PatientInfoBlock report={report} />
        </div>
        {blocks.map((b, i) => (
          <div
            key={b.key}
            ref={(el) => {
              measureRefs.current[i] = el;
            }}
            className="text-zinc-900"
          >
            {b.node}
          </div>
        ))}
      </div>

      {/* Pages Container with Forwarded Ref */}
      <div ref={ref} className="flex flex-col gap-4 items-center print:gap-0 print:block">
        {pages.map((pageBlockIdxs, pi) => (
          <div
            key={pi}
            className="report-preview-page-card relative bg-white overflow-hidden shadow-2xl rounded-sm print:rounded-none print:shadow-none"
            style={{
              width: scale === 1 ? A4_W : A4_W * scale,
              height: scale === 1 ? A4_H : A4_H * scale,
              flexShrink: 0,
            }}
          >
            <div
              className="report-print-page"
              style={{
                width: A4_W,
                height: A4_H,
                transform: scale === 1 ? undefined : `scale(${scale})`,
                transformOrigin: "top left",
                position: "relative",
                backgroundColor: "#ffffff",
              }}
            >
              {/* Letterhead Background */}
              {effectiveSettings.bgImage && (
                <img
                  src={effectiveSettings.bgImage}
                  alt="Letterhead Background"
                  aria-hidden
                  crossOrigin="anonymous"
                  className="letterhead-bg-img"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "fill",
                    zIndex: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                    display: "block",
                  }}
                />
              )}

              {/* Content area */}
              <div
                className="text-zinc-900"
                style={{
                  position: "absolute",
                  top: effectiveSettings.headerHeight,
                  left: effectiveSettings.marginLeft,
                  width: contentWidth,
                  height: usableH,
                  overflow: "visible",
                  zIndex: 1,
                  fontFamily: 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {!hidePatientBlock && <PatientInfoBlock report={report} />}
                {pageBlockIdxs.map((bi) => (
                  <div key={blocks[bi].key}>{blocks[bi].node}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
});
PaginatedReportPreview.displayName = "PaginatedReportPreview";

/** Legacy ReportSheet wrapper forwarding to PaginatedReportPreview */
export const ReportSheet = PaginatedReportPreview;
