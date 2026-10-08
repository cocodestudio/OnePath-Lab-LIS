import * as React from "react";
import { FileText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getCleanLetterheadUrl } from "@/lib/api-client";
import { BarcodeSVG } from "@/components/barcode-svg";
import { normalizeReportSettings, type ReportLayoutSettings, defaultReportLayoutSettings, resolveSignatureUrl, type DoctorSignatureConfig } from "@/lib/report-settings";
import { getClinicalInterpretation } from "@/lib/clinical-interpretations";
import { getReportPackage } from "@/lib/packages";
import { compareClinicalTests, compareClinicalParameters, getClinicalTestPriority } from "@/lib/clinical-order";
import { isGenuineCustomEditorTest, getDefaultUnitForTest, getDefaultRangeForTest, getCustomEditorInitialTemplate } from "@/lib/clinical-test-helper";
import { sanitizeHtml } from "@/lib/sanitize";
import { cleanPatientNameForReport } from "@/lib/patient-title-helper";

interface Test { 
  id: string; name: string; category: string; price: number; unit: string; 
  interpretation?: string | null; comment?: string | null; notes?: string | null;
  method?: string | null; fieldType?: string; field_type?: string;
  rangeType?: string | null; range_type?: string | null;
  textRefRange?: string | null; text_ref_range?: string | null;
  genderRefType?: string; gender_ref_type?: string;
  refRangeMin: number; refRangeMax: number; 
  ref_range_min?: number | null; ref_range_max?: number | null;
  refRangeMinMale?: number | null; refRangeMaxMale?: number | null; 
  ref_range_min_male?: number | null; ref_range_max_male?: number | null; 
  refRangeMinFemale?: number | null; refRangeMaxFemale?: number | null; 
  ref_range_min_female?: number | null; ref_range_max_female?: number | null; 
  refRangeMinChild?: number | null; refRangeMaxChild?: number | null; 
  ref_range_min_child?: number | null; ref_range_max_child?: number | null; 
  refRangeMinNewborn?: number | null; refRangeMaxNewborn?: number | null; 
  ref_range_min_newborn?: number | null; ref_range_max_newborn?: number | null; 
  ageRanges?: any[] | null; age_ranges?: any[] | null;
  valueType?: string; value_type?: string; customOptions?: string | null;
  sort_order?: number | null; sortOrder?: number | null;
  is_hidden?: boolean | null; isHidden?: boolean | null;
  parent?: { 
    id: string; name: string; method?: string; interpretation?: string; comment?: string; notes?: string;
    sort_order?: number | null; sortOrder?: number | null; is_hidden?: boolean | null; isHidden?: boolean | null;
    parent?: { id: string; name: string; method?: string; interpretation?: string; comment?: string; notes?: string; sort_order?: number | null; sortOrder?: number | null; is_hidden?: boolean | null; isHidden?: boolean | null; } 
  };
  [key: string]: any;
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
    [key: string]: any;
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
  packageName?: string | null;
  package_name?: string | null;
  healthPackage?: { id?: string | number; name?: string } | null;
  health_package?: { id?: string | number; name?: string } | null;
  testId?: string | number;
  mainTestId?: string | number;
}

export const A4_W = 794;
export const A4_H = 1123;

export interface ReportBlock { key: string; node: React.ReactNode; isTestStart?: boolean; }

export function PatientInfoBlock({ report }: { report: ReportSheetData }) {
  const patient: any = report.patient || {};
  const lab = (report.lab || {}) as any;
  const reportSettings = normalizeReportSettings(lab.report_settings || lab.reportSettings || (report as any).report_settings || (report as any).reportSettings);

  const patMeta = patient.meta || {};

  const formatDateTime = (val: any) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(val);
    }
  };

  // 1. Collection Date & Time:
  // Strictly reflects the exact registration / sample collection date & time from Add Patient
  const rawCollectionDate =
    patient.collection_date_time ||
    patient.collectionDateTime ||
    patMeta.collection_date_time ||
    patMeta.collectionDateTime ||
    (report as any).collection_date_time ||
    (report as any).collectionDateTime ||
    (report as any).meta?.collection_date_time ||
    (report as any).meta?.collectionDateTime ||
    patient.created_at ||
    patient.createdAt ||
    report.createdAt ||
    (report as any).created_at;

  const collDateStr = formatDateTime(rawCollectionDate) || formatDateTime(new Date());

  // 2. Registration Date
  const rawRegDate =
    patient.created_at ||
    patient.createdAt ||
    report.createdAt ||
    (report as any).created_at ||
    rawCollectionDate;

  const regDateStr = formatDateTime(rawRegDate) || collDateStr;

  // 3. Report Date & Time:
  // Strictly reflects the real-time timestamp when report is printed, downloaded, or reported
  const rawReportDate = (() => {
    if (report.reportDate && String(report.reportDate).trim() !== "" && report.reportDate !== report.createdAt) {
      return report.reportDate;
    }
    if ((report as any).reportedAt) return (report as any).reportedAt;
    if ((report as any).reported_at) return (report as any).reported_at;
    return new Date();
  })();

  const reportDateStr = formatDateTime(rawReportDate);

  const hasRefDoctor = Boolean(patient.refDoctor && patient.refDoctor.trim() !== "" && patient.refDoctor.trim() !== "—" && patient.refDoctor.trim() !== "N/A" && patient.refDoctor.trim() !== "null");
  const doctorName = hasRefDoctor ? (patient.refDoctor?.startsWith("Dr") ? patient.refDoctor : `Dr. ${patient.refDoctor}`) : "Self";

  const packageName = (report as any).packageName || (report as any).package_name || (report as any).meta?.packageName || (report as any).meta?.package_name || getReportPackage(report.id) || getReportPackage(report.customId) || getReportPackage(patient.customId);

  const allMap: Record<string, { label: string; value: React.ReactNode }> = {
    "Name": { label: "Patient Name:", value: <span className="font-extrabold text-[11.5px] text-black uppercase">{cleanPatientNameForReport(patient.name, patient.designation) || "—"}</span> },
    "Package": { label: "Package:", value: <span className="font-extrabold text-[11px] text-zinc-900">{packageName || "—"}</span> },
    "Package Name": { label: "Package:", value: <span className="font-extrabold text-[11px] text-zinc-900">{packageName || "—"}</span> },
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
    "Email ID": { label: "Email ID:", value: <span className="font-mono text-[10px]">{patient.email || (report as any).patient?.email || patMeta.email || "—"}</span> },
    "Insurance No.": { label: "Insurance No:", value: <span className="font-mono">{patient.insuranceNo || patient.insurance_no || patMeta.insuranceNo || patMeta.insurance_no || "—"}</span> },
    "Report ID": { label: "Report ID:", value: <span className="font-bold text-black font-mono">{report.customId || "—"}</span> },
    "Report Date": { label: "Report Date:", value: <span>{reportDateStr}</span> },
    "Report Date & Time": { label: "Report Date:", value: <span>{reportDateStr}</span> },
    "Reported Date": { label: "Report Date:", value: <span>{reportDateStr}</span> },
    "Registration Date": { label: "Reg. Date:", value: <span>{regDateStr}</span> },
    "Phone No.": { label: "Contact No:", value: <span className="font-mono">{reportSettings.fieldsToShow.phoneNumber ? (patient.phone || patMeta.phone || "—") : "—"}</span> },
    "Aadhaar No.": { label: "Aadhaar No:", value: <span className="font-mono">{patient.aadhaarNo || patient.aadhaar_no || patMeta.aadhaarNo || patMeta.aadhaar_no || "—"}</span> },
    "Patient ID": { label: "Patient ID (PID):", value: <span className="font-bold text-black font-mono">{patient.customId || "—"}</span> },
    "Address": { label: "Address:", value: <span className="break-words font-medium">{patient.address || patMeta.address || "—"}</span> },
    "Collected At": { label: "Collected At:", value: <span>{patient.collectedAt || patient.collected_at || patMeta.collectedAt || patMeta.collected_at || (report as any).collectedAt || "Main Lab"}</span> },
    "UHID": { label: "UHID:", value: <span className="font-mono font-bold">{patient.uhid || patMeta.uhid || patient.customId || "—"}</span> },
    "Passport Number": { label: "Passport No:", value: <span className="font-mono">{patient.passportNumber || patient.passport_number || patMeta.passportNumber || patMeta.passport_number || "—"}</span> },
    "Owner Name": { label: "Owner Name:", value: <span>{patient.ownerName || patient.owner_name || patMeta.ownerName || patMeta.owner_name || "—"}</span> },
    "Breed": { label: "Breed:", value: <span>{patient.breed || patMeta.breed || "—"}</span> },
    "Species": { label: "Species:", value: <span>{patient.species || patMeta.species || "—"}</span> },
    "Referring Lab": { label: "Referring Lab:", value: <span>{(report as any).referringLab || patMeta.referringLab || "—"}</span> },
    "Received Date": { label: "Received Date:", value: <span>{collDateStr || regDateStr}</span> },
    "Company": { label: "Company:", value: <span>{(report as any).company || lab.name || "—"}</span> },
    "Report Status": { label: "Status:", value: <span className="font-bold uppercase text-emerald-700 text-[10px]">{report.status || "COMPLETED"}</span> },
    "Barcode": { label: "Barcode:", value: <BarcodeSVG value={patient.vialBarcode || patient.vial_barcode || patMeta.vial_barcode || report.customId || report.id} width={0.9} height={18} fontSize={7} /> },
    "Referring Hospital": { label: "Referring Hosp:", value: <span>{(report as any).referringHospital || patMeta.referringHospital || "—"}</span> },
    "Second Referral": { label: "2nd Referral:", value: <span>{patient.secondReferral || patient.second_referral || patMeta.secondReferral || patMeta.second_referral || (report as any).secondReferral || "—"}</span> },
    "Government Panel": { label: "Govt Panel:", value: <span>{patient.govPanel || patient.gov_panel || patMeta.govPanel || patMeta.gov_panel || (report as any).govPanel || "—"}</span> },
    "Collection Date": { label: "Collection Date:", value: <span>{collDateStr}</span> },
    "Collection Date & Time": { label: "Collection Date:", value: <span>{collDateStr}</span> },
    "Collected Date": { label: "Collection Date:", value: <span>{collDateStr}</span> },
    "B2B Address": { label: "B2B Address:", value: <span>{lab.address || "—"}</span> },
    "Custom ID": { label: "Custom ID:", value: <span className="font-mono">{report.customId || "—"}</span> },
    "B2B Phone Number": { label: "Lab Phone:", value: <span className="font-mono">{lab.phone || "—"}</span> },
    "B2B Email": { label: "Lab Email:", value: <span>{lab.email || "—"}</span> },
    "TPA": { label: "TPA:", value: <span>{patient.tpa || patMeta.tpa || (report as any).tpa || "—"}</span> },
    "Corporate Client": { label: "Corporate:", value: <span>{patient.corporateName || patient.corporate_name || patMeta.corporateName || patMeta.corporate_name || (report as any).corporateClient || "—"}</span> },
    "Corporate Plan": { label: "Corp Plan:", value: <span>{patient.corporatePlan || patient.corporate_plan || patMeta.corporatePlan || patMeta.corporate_plan || (report as any).corporatePlan || "—"}</span> },
    "Processed At": { label: "Processed At:", value: <span>{(report as any).processedAt || "Main Lab"}</span> },
    "Pincode": { label: "Pincode:", value: <span>{patient.pincode || patMeta.pincode || lab.pincode || "—"}</span> },
    "District": { label: "District:", value: <span>{patient.district || patMeta.district || lab.city || "—"}</span> },
    "Town": { label: "Town:", value: <span>{patient.city || patMeta.city || lab.city || "—"}</span> },
    "Collection Center": { label: "Center:", value: <span>{patient.collectedAt || patient.collected_at || patMeta.collectedAt || (report as any).collectionCenter || "Main Branch"}</span> },
    "HFR ID": { label: "HFR ID:", value: <span>{patient.hfrId || patient.hfr_id || patMeta.hfrId || patMeta.hfr_id || (report as any).hfrId || "—"}</span> },
    "Investigation": { label: "Investigation:", value: <span>{report.results?.[0]?.test?.category || "General Pathology"}</span> },
    "Height": { label: "Height:", value: <span>{patient.height || patMeta.height ? `${patient.height || patMeta.height} cm` : "—"}</span> },
    "Weight": { label: "Weight:", value: <span>{patient.weight || patMeta.weight ? `${patient.weight || patMeta.weight} kg` : "—"}</span> },
  };

  // Build sets of explicitly enabled and explicitly disabled intake fields
  const enabledIntakeSet = new Set<string>();
  const disabledIntakeSet = new Set<string>();

  if (Array.isArray(reportSettings.intakeFields)) {
    reportSettings.intakeFields.forEach((f) => {
      const isShown = Boolean(f.showOnReport);
      if (isShown) {
        if (f.orderingName) enabledIntakeSet.add(f.orderingName);
        if (f.label) enabledIntakeSet.add(f.label);
        if (f.key) enabledIntakeSet.add(f.key);
      } else {
        if (f.orderingName) disabledIntakeSet.add(f.orderingName);
        if (f.label) disabledIntakeSet.add(f.label);
        if (f.key) disabledIntakeSet.add(f.key);
      }
    });
  }

  // Determine active display order
  const baseOrder = reportSettings.patientDetailsOrder && reportSettings.patientDetailsOrder.length > 0
    ? [...reportSettings.patientDetailsOrder]
    : ["Name", "Patient ID", "Age/Gender", "Report ID", "Phone No.", "Referred By", "Address", "Report Date"];

  // If user enabled an intake field with showOnReport: true, ensure it is added to the report order
  if (Array.isArray(reportSettings.intakeFields)) {
    reportSettings.intakeFields.forEach((f) => {
      if (f.showOnReport && f.orderingName && !baseOrder.includes(f.orderingName)) {
        baseOrder.push(f.orderingName);
      }
    });
  }

  const items: { label: string; value: React.ReactNode }[] = [];
  const addedKeys = new Set<string>();

  baseOrder.forEach((key) => {
    if (addedKeys.has(key)) return;
    if (key === "Package" || key === "Package Name") return;
    if (key === "Phone No." && reportSettings.fieldsToShow.phoneNumber === false) return;
    // Strictly omit if user has unchecked it from intake fields
    if (disabledIntakeSet.has(key)) return;

    if (allMap[key]) {
      addedKeys.add(key);
      items.push(allMap[key]);
    }
  });

  const baseUrl = "https://lis.onepathlab.com";
  const reportIdentifier = report.id || report.customId || (report as any).custom_id || "";
  const qrValue = `${baseUrl}/r/${reportIdentifier}`;

  return (
    <div 
      className="border border-zinc-300 rounded-xs px-2 py-1 mb-1.5 text-[11px] leading-[1.25] text-zinc-900 bg-white"
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
            <div className="mt-0.5 flex items-center gap-2">
              <BarcodeSVG value={report.customId || report.id} width={1.0} height={15} fontSize={7} />
              <span className="text-[7px] font-mono text-zinc-400 font-semibold tracking-wider">LAB ACCREDITED</span>
            </div>
          )}
        </div>

        {/* Dynamic QR Code Verification Stamp */}
        <div className="shrink-0 flex flex-col items-center justify-center border-l border-zinc-200 pl-3 min-w-[64px]">
          <div className="bg-white p-0.5 rounded border border-zinc-300 shadow-2xs">
            <QRCodeSVG
              value={qrValue}
              size={44}
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

function getDepartmentOrderIndex(category: string, orderList: string[]): number {
  if (!orderList || orderList.length === 0) return 999;
  const name = (category || "").trim().toLowerCase();

  // 1. Direct exact match
  const exactIdx = orderList.findIndex(d => d.trim().toLowerCase() === name);
  if (exactIdx !== -1) return exactIdx;

  // 2. Keyword/substring match
  const matchIdx = orderList.findIndex(d => {
    const dLower = d.trim().toLowerCase();
    return name.includes(dLower) || dLower.includes(name);
  });
  if (matchIdx !== -1) return matchIdx;

  // 3. Fallback normalized tokens match
  for (let i = 0; i < orderList.length; i++) {
    const dLower = orderList[i].trim().toLowerCase();
    if (
      ((name.includes("haemat") || name.includes("hemat")) && (dLower.includes("haemat") || dLower.includes("hemat"))) ||
      ((name.includes("bio") || name.includes("chem")) && (dLower.includes("bio") || dLower.includes("chem"))) ||
      ((name.includes("serol") || name.includes("immun")) && (dLower.includes("serol") || dLower.includes("immun"))) ||
      (name.includes("micro") && dLower.includes("micro")) ||
      ((name.includes("urine") || name.includes("path")) && (dLower.includes("urine") || dLower.includes("path"))) ||
      ((name.includes("hormon") || name.includes("endocrin")) && (dLower.includes("hormon") || dLower.includes("endocrin"))) ||
      (name.includes("molecul") && dLower.includes("molecul")) ||
      ((name.includes("histo") || name.includes("cyto")) && (dLower.includes("histo") || dLower.includes("cyto")))
    ) {
      return i;
    }
  }

  return 900 + getDepartmentPriority(category);
}

function getTestPriority(mainTestName: string, category?: string): number {
  return getClinicalTestPriority(mainTestName, category);
}

export function renderDoctorSignature(
  sig: DoctorSignatureConfig,
  globalShowSignatureOnly: boolean,
  defaultAlign: "left" | "right" | "center" = "left",
  ignoreMarginTop = false
) {
  const align = sig.alignment || defaultAlign;
  const resolvedUrl = resolveSignatureUrl(sig.imageUrl);
  const vertOffset = ignoreMarginTop ? 0 : ((sig.marginTop || 0) - (sig.marginBottom || 0));
  const horizOffset = (sig.marginLeft || 0) - (sig.marginRight || 0);
  const isImageOnly = Boolean(globalShowSignatureOnly || sig.showSignatureOnly);

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
            width: `${sig.width || 130}px`,
            marginBottom: "2px",
          }}
        >
          <img
            src={resolvedUrl}
            alt={sig.name || "Doctor Signature"}
            crossOrigin="anonymous"
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

      {!isImageOnly && (
        <>
          <p className="font-bold text-zinc-900 leading-tight text-[10px]">
            {sig.name}
          </p>
          <p className="text-[8.5px] text-zinc-600 leading-tight">
            {sig.designation}
          </p>
          {sig.registrationNo && (
            <p className="text-[7.5px] text-zinc-400 font-mono leading-tight">
              {sig.registrationNo}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function renderSignaturesGrid(
  signatureRows: Array<[DoctorSignatureConfig, DoctorSignatureConfig | undefined]>,
  enabledSignatures: DoctorSignatureConfig[],
  globalShowSignatureOnly: boolean,
  ignoreMarginTop = false
) {
  if (enabledSignatures.length === 0) return null;

  if (enabledSignatures.length === 1 && signatureRows[0]?.[0]) {
    const singleSig = signatureRows[0][0];
    const align = singleSig.alignment || "right";
    return (
      <div 
        className={`flex px-2 text-[10px] ${
          align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end"
        }`}
      >
        {renderDoctorSignature(singleSig, globalShowSignatureOnly, align, ignoreMarginTop)}
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-4">
      {signatureRows.map((pair, rowIdx) => {
        const leftSig = pair[0];
        const rightSig = pair[1];
        return (
          <div key={rowIdx} className="flex items-start justify-between px-2 text-[10px]">
            {leftSig ? renderDoctorSignature(leftSig, globalShowSignatureOnly, "left", ignoreMarginTop) : <div />}
            {rightSig ? renderDoctorSignature(rightSig, globalShowSignatureOnly, "right", ignoreMarginTop) : <div />}
          </div>
        );
      })}
    </div>
  );
}

export function buildReportBlocks(
  report: ReportSheetData,
  opts?: { hidePatientBlock?: boolean; hideInterpretation?: boolean; autoFitToFooter?: boolean }
): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  let isFirstMainTestPushed = false;
  let pendingPageBreakForNextBlock = false;

  const pushBlock = (block: ReportBlock) => {
    if (pendingPageBreakForNextBlock) {
      block.isTestStart = true;
      pendingPageBreakForNextBlock = false;
    }
    blocks.push(block);
  };

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

  const isDeptGroupingEnabled = !!reportSettings.groupByDepartment;
  const isSampleOrTemplate = Boolean(
    report.id?.startsWith?.("sample-") ||
    report.id === "sample-report" ||
    report.id?.startsWith?.("dummy-")
  );

  const isBlankValue = (val: any) => {
    if (val === 0 || val === "0") return false;
    if (val === null || val === undefined) return true;
    const s = String(val).trim();
    if (s === "" || s === "—" || s === "-") return true;
    if (s === "<p></p>" || s === "<p><br></p>" || s === "<p><br/></p>") return true;
    return false;
  };

  // Only include parameters with entered results (blank ones are hidden from the final report)
  const activeResults = (report.results || []).filter((item) => {
    if (!item || !item.test) return false;
    if (isSampleOrTemplate) return true;
    const val = item.resultValue ?? (item as any).result_value;
    return !isBlankValue(val);
  });

  const groupedTests: Record<string, Record<string, ReportTest[]>> = {};
  activeResults.forEach((item) => {
    let cat = item.test.category || "General Pathology";
    if (isDeptGroupingEnabled) {
      let rootTest: any = item.test;
      if (item.test.parent) {
        if (item.test.parent.parent) {
          rootTest = item.test.parent.parent;
        } else {
          rootTest = item.test.parent;
        }
      }
      cat = rootTest.category || item.test.category || "General Pathology";
    }
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
    if (t.rangeType === "TEXT" || t.range_type === "TEXT" || (!t.refRangeMin && !t.ref_range_min && (t.textRefRange || t.text_ref_range))) {
      const txt = (t.textRefRange || t.text_ref_range || "").trim();
      if (txt) return txt;
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

    const genderRefType = t.genderRefType || t.gender_ref_type;
    if (genderRefType === "CHILD_SPECIFIC" && patientAge < 12) {
      const minChild = t.refRangeMinChild ?? t.ref_range_min_child;
      const maxChild = t.refRangeMaxChild ?? t.ref_range_max_child;
      if (minChild !== undefined && maxChild !== undefined) {
        return `${minChild} - ${maxChild}`;
      }
    }

    if (genderRefType === "GENDER_SPECIFIC" || genderRefType === "BY_GENDER") {
      const gender = patientGender.toLowerCase();
      const minF = t.refRangeMinFemale ?? t.ref_range_min_female;
      const maxF = t.refRangeMaxFemale ?? t.ref_range_max_female;
      if (gender === "female" && minF !== undefined && maxF !== undefined) {
        return `${minF} - ${maxF}`;
      }
      const minM = t.refRangeMinMale ?? t.ref_range_min_male;
      const maxM = t.refRangeMaxMale ?? t.ref_range_max_male;
      if (gender === "male" && minM !== undefined && maxM !== undefined) {
        return `${minM} - ${maxM}`;
      }
    }

    const rMin = t.refRangeMin ?? t.ref_range_min;
    const rMax = t.refRangeMax ?? t.ref_range_max;
    if (rMin !== undefined && rMax !== undefined && rMin !== null && rMax !== null && (rMin !== 0 || rMax !== 0)) {
      return `${rMin} - ${rMax}`;
    }

    if (t.textRefRange || t.text_ref_range) {
      return (t.textRefRange || t.text_ref_range || "—").trim();
    }

    return getDefaultRangeForTest(t.name) || "—";
  };

  const getFlag = (valStr: string | null, item: ReportTest): { flag: "H" | "L" | null; label: string; color: string } => {
    if (!flagsConf.enabled || !valStr) return { flag: null, label: "", color: "#000000" };
    const val = parseFloat(valStr);
    if (isNaN(val)) return { flag: null, label: "", color: "#000000" };

    let minRange: number | undefined = item.test.refRangeMin ?? item.test.ref_range_min;
    let maxRange: number | undefined = item.test.refRangeMax ?? item.test.ref_range_max;

    const gRef = item.test.genderRefType || item.test.gender_ref_type;
    if (gRef === "CHILD_SPECIFIC" && patientAge < 12) {
      minRange = item.test.refRangeMinChild ?? item.test.ref_range_min_child ?? minRange;
      maxRange = item.test.refRangeMaxChild ?? item.test.ref_range_max_child ?? maxRange;
    } else if (gRef === "GENDER_SPECIFIC" || gRef === "BY_GENDER") {
      const gender = patientGender.toLowerCase();
      if (gender === "female") {
        minRange = item.test.refRangeMinFemale ?? item.test.ref_range_min_female ?? minRange;
        maxRange = item.test.refRangeMaxFemale ?? item.test.ref_range_max_female ?? maxRange;
      } else {
        minRange = item.test.refRangeMinMale ?? item.test.ref_range_min_male ?? minRange;
        maxRange = item.test.refRangeMaxMale ?? item.test.ref_range_max_male ?? maxRange;
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

  if (!activeResults || activeResults.length === 0) {
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

  const resolvedPackageName =
    (report as any).packageName ||
    (report as any).package_name ||
    (report as any).meta?.packageName ||
    (report as any).meta?.package_name ||
    getReportPackage(report.id) ||
    getReportPackage(report.customId) ||
    (report.patient?.customId ? getReportPackage(report.patient.customId) : "");

  const customDeptOrder = reportSettings.departmentOrder;

  // Render Tests by Department and Test Panels in Configured / Medical Priority Order
  const sortedCategories = Object.entries(groupedTests).sort(([catA], [catB]) => {
    if (isDeptGroupingEnabled && customDeptOrder && Array.isArray(customDeptOrder) && customDeptOrder.length > 0) {
      const idxA = getDepartmentOrderIndex(catA, customDeptOrder);
      const idxB = getDepartmentOrderIndex(catB, customDeptOrder);
      if (idxA !== idxB) return idxA - idxB;
    }
    const pA = getDepartmentPriority(catA);
    const pB = getDepartmentPriority(catB);
    if (pA !== pB) return pA - pB;
    return catA.localeCompare(catB);
  });

  sortedCategories.forEach(([category, mainTests], catIdx) => {
    if (reportSettings.separatePagePerTest && catIdx > 0 && isFirstMainTestPushed) {
      pendingPageBreakForNextBlock = true;
    }

    const buildDepartmentHeaderNode = (suffix: string, isSeparateTest = false): ReportBlock | null => {
      if (reportSettings.fieldsToShow.departmentName === false) return null;
      const alignVal = String(typo.departmentNameAlignment || "").toLowerCase();
      const deptAlign = alignVal === "left" 
        ? "text-left" 
        : alignVal === "right" 
          ? "text-right" 
          : "text-center";

      return {
        key: `department-header-${category}-${suffix}`,
        node: (
          <div 
            className={`font-extrabold text-zinc-900 uppercase tracking-widest pb-0.5 mb-0.5 border-b border-zinc-300 ${deptAlign} ${
              isSeparateTest ? "mt-1.5" : ""
            }`}
            style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: `${Math.min(12, typo.departmentFontSize || 12)}px`,
              paddingTop: `${Math.min(2, sp.department || 2)}px`,
            }}
          >
            {category}
          </div>
        ),
      };
    };

    // When department-wise grouping is OFF (default), show department header once per category
    if (!isDeptGroupingEnabled) {
      const headerBlock = buildDepartmentHeaderNode("group");
      if (headerBlock) pushBlock(headerBlock);

      // Health Package display directly under Department Header on the left
      if (resolvedPackageName && catIdx === 0) {
        pushBlock({
          key: `package-header-${category}`,
          node: (
            <div className="text-left mb-1 mt-0.5 flex items-center gap-1.5 select-none">
              <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider">Health Package:</span>
              <span className="font-extrabold text-[10.5px] text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                {resolvedPackageName}
              </span>
            </div>
          ),
        });
      }
    }

    const sortedMainTests = Object.entries(mainTests).sort(([nameA], [nameB]) => {
      return compareClinicalTests(nameA, nameB, category, category);
    });

    sortedMainTests.forEach(([mainTestName, itemsList], testIdx) => {
      if (!itemsList || itemsList.length === 0) return;

      if (reportSettings.separatePagePerTest && testIdx > 0 && isFirstMainTestPushed) {
        pendingPageBreakForNextBlock = true;
      } else if (!isFirstMainTestPushed) {
        isFirstMainTestPushed = true;
      }

      // When department-wise grouping is ON, show department header before EACH test in this department!
      if (isDeptGroupingEnabled) {
        const headerBlock = buildDepartmentHeaderNode(`test-${testIdx}-${mainTestName}`, testIdx > 0 || catIdx > 0);
        if (headerBlock) pushBlock(headerBlock);

        // Health Package display under the very first department header
        if (resolvedPackageName && catIdx === 0 && testIdx === 0) {
          pushBlock({
            key: `package-header-${category}`,
            node: (
              <div className="text-left mb-1 mt-0.5 flex items-center gap-1.5 select-none">
                <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider">Health Package:</span>
                <span className="font-extrabold text-[10.5px] text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                  {resolvedPackageName}
                </span>
              </div>
            ),
          });
        }
      }

      const firstTestObj = itemsList[0].test;
      const mainTestObj = firstTestObj.parent?.parent ? firstTestObj.parent.parent : (firstTestObj.parent ? firstTestObj.parent : firstTestObj);
      const allCustomEditor = itemsList.every(item => isGenuineCustomEditorTest(item.test));

      const testAlignVal = String(typo.testNameAlignment || "").toLowerCase();
      const isTestNameCenter = testAlignVal === "middle" || testAlignVal === "center";
      const formattedMainTestName = typo.properCaseTestNames
        ? mainTestName.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())
        : mainTestName;

      // 2. Test Panel Title Header (e.g. * COMPLETE BLOOD COUNT (CBC))
      pushBlock({
        key: `header-${category}-${mainTestName}`,
        node: (
          <div 
            className={`border-b border-zinc-800 pb-0.5 flex items-baseline ${
              isTestNameCenter ? "justify-center relative" : "justify-between"
            }`}
            style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif',
              marginTop: `${Math.min(4, sp.testName || 4)}px`,
              marginBottom: `${Math.min(3, typo.spacingBetweenTests || 3)}px`,
            }}
          >
            <span 
              className={`font-extrabold text-zinc-950 tracking-wide ${typo.properCaseTestNames ? "capitalize" : "uppercase"}`}
              style={{ fontSize: `${Math.min(12, typo.testNameFontSize || 12)}px` }}
            >
              * {formattedMainTestName}
            </span>
            {reportSettings.fieldsToShow.testMethod && mainTestObj.method && (
              <span 
                className={`font-semibold italic ${isTestNameCenter ? "absolute right-0" : "ml-2"}`}
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
          const rawVal = (item.resultValue || (item as any).result_value || "").trim();
          const isBlank = !rawVal || rawVal === "<p></p>" || rawVal === "<p><br></p>" || rawVal === "<p><br/></p>";
          const isPlainStatusVal = !rawVal.includes("<") && /^(normal(\s*[\/\-]\s*negative)?|negative|positive)$/i.test(rawVal.trim());
          const initialTemplate = getCustomEditorInitialTemplate(item.test);
          const content = (!isBlank && !isPlainStatusVal)
            ? rawVal
            : (initialTemplate || "<p class='text-zinc-400 italic text-xs'>No content recorded.</p>");

          // Check if content has a multi-row table (e.g. Culture & Sensitivity with 39 rows) that needs multi-page pagination
          let isMultiPageTable = false;
          let preTableHtml = "";
          let theadHtml = "";
          let colgroupHtml = "";
          let trNodes: string[] = [];
          let postTableHtml = "";

          if (content.includes("<table")) {
            const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);
            if (tableMatch) {
              const tableHtml = tableMatch[0];
              const tableIdx = content.indexOf(tableHtml);
              preTableHtml = content.substring(0, tableIdx);
              postTableHtml = content.substring(tableIdx + tableHtml.length);

              const theadMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/i);
              theadHtml = theadMatch ? theadMatch[0] : "";

              const colgroupMatch = tableHtml.match(/<colgroup[\s\S]*?<\/colgroup>/i);
              colgroupHtml = colgroupMatch ? colgroupMatch[0] : `<colgroup><col style="width:10%" /><col style="width:55%" /><col style="width:35%" /></colgroup>`;

              const tbodyMatch = tableHtml.match(/<tbody[\s\S]*?<\/tbody>/i);
              const tbodyContent = tbodyMatch ? tbodyMatch[0] : tableHtml;

              const trMatches = tbodyContent.match(/<tr[\s\S]*?<\/tr>/gi);
              if (trMatches && trMatches.length > 6) {
                isMultiPageTable = true;
                trNodes = trMatches;
              }
            }
          }

          if (isMultiPageTable) {
            // 1. Intro block (sterile note, collection date, sample type, organism, colony count)
            if (preTableHtml) {
              pushBlock({
                key: `custom-editor-intro-${item.id}`,
                node: (
                  <div 
                    className="my-1 text-zinc-900 report-custom-editor-content"
                    style={{ 
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: `${typo.testParameterFontSize || 10.5}px`,
                      textAlign: "left",
                      lineHeight: 1.35,
                    }}
                    dangerouslySetInnerHTML={{ __html: preTableHtml }}
                  />
                ),
              });
            }

            // 2. Chunked table rows in slices of 2 rows each
            const chunkSize = 2;
            for (let rIdx = 0; rIdx < trNodes.length; rIdx += chunkSize) {
              const chunkSlice = trNodes.slice(rIdx, rIdx + chunkSize);
              const rowsHtml = chunkSlice.join("");
              const isFirstChunk = (rIdx === 0);

              const contHeader = theadHtml ? (
                <div className="report-custom-editor-content" style={{ marginTop: "2px", marginBottom: "0px" }}>
                  <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", margin: 0 }}>
                    <colgroup dangerouslySetInnerHTML={{ __html: colgroupHtml }} />
                    <thead dangerouslySetInnerHTML={{ __html: theadHtml }} />
                  </table>
                </div>
              ) : null;

              pushBlock({
                key: `custom-editor-row-${item.id}-${rIdx}`,
                continuationHeader: contHeader,
                node: (
                  <div className="report-custom-editor-content">
                    <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", margin: 0 }}>
                      <colgroup dangerouslySetInnerHTML={{ __html: colgroupHtml }} />
                      {isFirstChunk && theadHtml && (
                        <thead dangerouslySetInnerHTML={{ __html: theadHtml }} />
                      )}
                      <tbody dangerouslySetInnerHTML={{ __html: rowsHtml }} />
                    </table>
                  </div>
                ),
              } as any);
            }

            // 3. Post-table block if any
            if (postTableHtml) {
              pushBlock({
                key: `custom-editor-post-${item.id}`,
                node: (
                  <div 
                    className="my-1.5 p-1 text-zinc-900 report-custom-editor-content"
                    style={{ 
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: `${typo.testParameterFontSize || 10.5}px`,
                      textAlign: "left",
                    }}
                    dangerouslySetInnerHTML={{ __html: postTableHtml }}
                  />
                ),
              });
            }
          } else {
            pushBlock({
              key: `custom-editor-${item.id}`,
              node: (
                <div 
                  className="my-1.5 p-1 bg-white rounded leading-relaxed text-zinc-900 report-custom-editor-content"
                  style={{ 
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: `${typo.testParameterFontSize || 11}px`,
                    textAlign: "left",
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                />
              ),
            });
          }
        });
      } else {
        // Table Header
        const col4Width = sp.interchangeColumns ? `${cw.unit}%` : `${cw.refRange}%`;
        const col5Width = sp.interchangeColumns ? `${cw.refRange}%` : `${cw.unit}%`;
        const col4Label = sp.interchangeColumns ? cl.unit : cl.refRange;
        const col5Label = sp.interchangeColumns ? cl.refRange : cl.unit;

        pushBlock({
          key: `tblhead-${category}-${mainTestName}`,
          node: (
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                borderSpacing: 0,
                margin: 0,
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
                  <th style={{ width: `${cw.testDescription}%`, padding: "2.5px 6px 2.5px 4px", textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em", boxSizing: "border-box" }}>{cl.testDescription}</th>
                  <th style={{ width: `${cw.result}%`, padding: "2.5px 4px", textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em", boxSizing: "border-box" }}>{cl.result}</th>
                  <th style={{ width: `${cw.flag}%`, padding: "2.5px 2px", textAlign: "center", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em", boxSizing: "border-box" }}>{cl.flag}</th>
                  <th style={{ width: col4Width, padding: "2.5px 4px 2.5px 16px", textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em", boxSizing: "border-box" }}>{col4Label}</th>
                  <th style={{ width: col5Width, padding: "2.5px 4px 2.5px 12px", textAlign: "left", color: "#18181b", textTransform: "uppercase", letterSpacing: "0.05em", boxSizing: "border-box" }}>{col5Label}</th>
                </tr>
              </thead>
            </table>
          ),
        });

        // Group and order items/subgroups sequentially
        type RenderUnit = 
          | { type: "item"; item: ReportTest; sortOrder: number; arrayIndex: number }
          | { type: "subgroup"; title: string; items: ReportTest[]; sortOrder: number; arrayIndex: number };

        const renderUnits: RenderUnit[] = [];
        const subGroupMap: Record<string, { type: "subgroup"; title: string; items: ReportTest[]; sortOrder: number; arrayIndex: number }> = {};

        itemsList.forEach((item, arrIdx) => {
          const isSubgroup = Boolean(
            item.test.parent && 
            item.test.parent.name && 
            item.test.parent.name.trim().toLowerCase() !== mainTestName.trim().toLowerCase()
          );

          if (isSubgroup) {
            const subName = item.test.parent!.name;
            const parentOrder = item.test.parent?.sort_order ?? (item.test.parent as any)?.sortOrder ?? item.test.sort_order ?? ((arrIdx + 1) * 100);
            if (!subGroupMap[subName]) {
              const subUnit: RenderUnit = {
                type: "subgroup",
                title: subName,
                items: [item],
                sortOrder: parentOrder,
                arrayIndex: arrIdx,
              };
              subGroupMap[subName] = subUnit;
              renderUnits.push(subUnit);
            } else {
              subGroupMap[subName].items.push(item);
            }
          } else {
            const itemOrder = item.test.sort_order ?? (item.test as any)?.sortOrder ?? ((arrIdx + 1) * 100);
            renderUnits.push({ type: "item", item, sortOrder: itemOrder, arrayIndex: arrIdx });
          }
        });

        // Sort items within each subgroup by sort_order
        Object.values(subGroupMap).forEach((unit) => {
          unit.items.sort((a, b) => {
            const ordA = a.test.sort_order ?? (a.test as any)?.sortOrder ?? 0;
            const ordB = b.test.sort_order ?? (b.test as any)?.sortOrder ?? 0;
            if (ordA !== ordB && ordA !== 0 && ordB !== 0) return ordA - ordB;
            return 0;
          });
          // If parent sortOrder wasn't explicitly set, use the minimum of its items
          if (!unit.sortOrder && unit.items[0]) {
            unit.sortOrder = unit.items[0].test.sort_order ?? (unit.items[0].test as any)?.sortOrder ?? unit.sortOrder;
          }
        });

        // Sort all render units by sortOrder; if equal/0, maintain their exact arrayIndex order!
        renderUnits.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder && a.sortOrder !== 0 && b.sortOrder !== 0) {
            return a.sortOrder - b.sortOrder;
          }
          if (a.sortOrder !== 0 && b.sortOrder === 0) return -1;
          if (a.sortOrder === 0 && b.sortOrder !== 0) return 1;
          return a.arrayIndex - b.arrayIndex;
        });

        const vAlign = (typo.rowAlignment as string) === "Top" ? "top" : "middle";
        const isCompactPanel = itemsList.length >= 10;
        const isAutoFit = opts?.autoFitToFooter ?? true;
        const paramPad = isAutoFit && isCompactPanel ? "1px" : `${Math.min(3, sp.testParameters ?? 3)}px`;
        const paramFontSize = typo.testParameterFontSize || 11;
        const paramLineHeight = isAutoFit && isCompactPanel ? "1.24" : "1.32";

        const renderSingleRow = (item: ReportTest, isIndented = false) => {
          const refRange = getRefRange(item);
          const flagInfo = getFlag(item.resultValue, item);
          const isHighOrLow = flagInfo.flag === "H" || flagInfo.flag === "L";
          const isAbnormal = item.isAbnormal || isHighOrLow;

          const paramName = typo.properCaseTestNames
            ? item.test.name.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())
            : item.test.name;

          const itemUnit = item.test.unit || getDefaultUnitForTest(item.test.name) || "";
          const col4Content = sp.interchangeColumns ? itemUnit : refRange;
          const col5Content = sp.interchangeColumns ? refRange : itemUnit;

          return (
            <table
              key={item.id}
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                borderSpacing: 0,
                margin: 0,
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
                      width: `${cw.testDescription}%`,
                      padding: `${paramPad} 6px ${paramPad} 4px`, 
                      fontSize: `${paramFontSize}px`, 
                      lineHeight: paramLineHeight, 
                      fontWeight: flagsConf.boldOnlyResultAndFlag ? (typo.boldMultiTypeParameter ? "700" : "500") : (isAbnormal ? "700" : "500"), 
                      color: "#000",
                      boxSizing: "border-box",
                      wordBreak: "break-word"
                    }}
                  >
                    {isIndented && !typo.leftAlignSubParameters ? (
                      <span style={{ paddingLeft: "10px", display: "block", fontSize: `${paramFontSize - 0.5}px` }}>
                        {paramName}
                      </span>
                    ) : (
                      paramName
                    )}
                    {reportSettings.fieldsToShow.testMethod && item.test.method && item.test.method !== mainTestObj.method && (
                      <div 
                        style={{ 
                          fontSize: `${typo.testMethodFontSize || 8}px`, 
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
                      width: `${cw.result}%`,
                      padding: `${paramPad} 4px`, 
                      fontSize: `${paramFontSize + 0.5}px`, 
                      lineHeight: paramLineHeight, 
                      fontFamily: "monospace", 
                      fontWeight: isAbnormal ? "700" : "400", 
                      color: isHighOrLow ? flagInfo.color : "#000", 
                      textAlign: "left", 
                      verticalAlign: vAlign,
                      boxSizing: "border-box",
                      wordBreak: "break-word"
                    }}
                  >
                    {item.resultValue || "—"}
                  </td>
                  {/* FLAG */}
                  <td 
                    style={{ 
                      width: `${cw.flag}%`,
                      padding: `${paramPad} 2px`, 
                      fontSize: `${paramFontSize}px`, 
                      lineHeight: paramLineHeight, 
                      fontWeight: "800", 
                      color: flagInfo.color, 
                      textAlign: "center", 
                      verticalAlign: vAlign,
                      boxSizing: "border-box"
                    }}
                  >
                    {flagInfo.label}
                  </td>
                  {/* COL 4 (REF RANGE OR UNIT) */}
                  <td 
                    style={{ 
                      width: col4Width,
                      padding: `${paramPad} 4px ${paramPad} 16px`, 
                      fontSize: `${paramFontSize}px`, 
                      lineHeight: paramLineHeight, 
                      fontFamily: sp.interchangeColumns ? "inherit" : "monospace", 
                      color: sp.interchangeColumns ? "#52525b" : "#3f3f46", 
                      textAlign: "left", 
                      verticalAlign: vAlign,
                      boxSizing: "border-box",
                      wordBreak: "break-word"
                    }}
                  >
                    {col4Content}
                  </td>
                  {/* COL 5 (UNIT OR REF RANGE) */}
                  <td 
                    style={{ 
                      width: col5Width,
                      padding: `${paramPad} 4px ${paramPad} 12px`, 
                      fontSize: `${paramFontSize - (sp.interchangeColumns ? 0 : 0.5)}px`, 
                      lineHeight: paramLineHeight, 
                      fontFamily: sp.interchangeColumns ? "monospace" : "inherit", 
                      color: sp.interchangeColumns ? "#3f3f46" : "#52525b", 
                      textAlign: "left", 
                      verticalAlign: vAlign,
                      boxSizing: "border-box",
                      wordBreak: "break-word"
                    }}
                  >
                    {col5Content}
                  </td>
                </tr>
                {item.remarks && item.remarks.trim() !== "" && (
                  <tr>
                    <td colSpan={5} style={{ padding: `${sp.parameterComment || 1.5}px 4px ${sp.parameterComment || 1.5}px 8px`, fontSize: `${typo.parameterCommentFontSize || 9}px`, color: "#52525b", fontStyle: "italic", borderLeft: "2px solid #a78bfa" }}>
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
            pushBlock({
              key: `row-${unit.item.id}`,
              node: renderSingleRow(unit.item, false),
            });
          } else {
            pushBlock({
              key: `subgroup-title-${mainTestName}-${unit.title}`,
              node: (
                <div 
                  className="pt-0.5 pb-0.5 font-bold text-[10px] text-zinc-900 uppercase tracking-wide border-b border-zinc-200 mt-0.5 mb-0.5"
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif', pageBreakInside: 'avoid' }}
                >
                  {unit.title}
                </div>
              ),
            });

            unit.items.forEach((subItem) => {
              pushBlock({
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
        pushBlock({
          key: `findings-${category}-${mainTestName}`,
          node: (
            <div 
              className="mt-1.5 p-1.5 bg-zinc-50 border border-zinc-200 rounded text-[9.5px] space-y-0.5"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', pageBreakInside: 'avoid' }}
            >
              {activeTestNotes.notes && (
                <div>
                  <span className="font-bold text-zinc-900 uppercase" style={{ fontSize: `${noteConf.headingFontSize || 9.5}px` }}>Note: </span>
                  <span className="text-zinc-800 font-semibold" style={{ fontSize: `${noteConf.contentFontSize || 9.5}px` }}>{activeTestNotes.notes}</span>
                </div>
              )}
              {activeTestNotes.remarks && (
                <div>
                  <span className="font-bold text-zinc-900 uppercase" style={{ fontSize: `${noteConf.headingFontSize || 9.5}px` }}>Remarks: </span>
                  <span className="text-zinc-800 font-semibold" style={{ fontSize: `${noteConf.contentFontSize || 9.5}px` }}>{activeTestNotes.remarks}</span>
                </div>
              )}
              {activeTestNotes.advices && (
                <div>
                  <span className="font-bold text-zinc-900 uppercase" style={{ fontSize: `${noteConf.headingFontSize || 9.5}px` }}>Advices: </span>
                  <span className="text-zinc-800 font-semibold" style={{ fontSize: `${noteConf.contentFontSize || 9.5}px` }}>{activeTestNotes.advices}</span>
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
        reportSettings.fieldsToShow.interpretation !== false
      ) && (
        !hasExplicitInterpSetting ||
        printedInterps.length === 0 ||
        printedInterps.includes(mainTestObj.id) ||
        printedInterps.includes(firstTestObj.id) ||
        printedInterps.includes(itemsList[0]?.test?.id) ||
        printedInterps.includes("ALL")
      );

      if (isInterpEnabled) {
        pushBlock({
          key: `interp-${category}-${mainTestName}`,
          node: (
            <div 
              className="mt-2 pt-1.5 border-t border-dashed border-zinc-400 text-zinc-700 leading-snug"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', pageBreakInside: 'avoid', fontSize: `${interpConf.contentFontSize || 9.5}px` }}
            >
              <p className={`text-zinc-900 uppercase tracking-wider mb-1 ${interpConf.boldHeading ? "font-bold" : "font-semibold"}`} style={{ fontSize: `${interpConf.headingFontSize || 9.5}px` }}>
                Clinical Notes & Interpretation ({mainTestName}):
              </p>
              <div 
                className="[&_table]:border-collapse [&_table]:w-full [&_table]:my-1 [&_table]:border [&_table]:border-zinc-300 [&_th]:border [&_th]:border-zinc-300 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-zinc-100 [&_th]:font-bold [&_th]:text-[9.5px] [&_th]:text-left [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 [&_td]:text-[9px] [&_td]:leading-snug text-zinc-800" 
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(interpContent || "") }} 
              />
            </div>
          ),
        });
      }

      // End of test divider line if removeLineAtEndOfTest is false
      if (!typo.removeLineAtEndOfTest) {
        pushBlock({
          key: `endline-${category}-${mainTestName}`,
          node: (
            <div 
              className="w-full my-1 border-b border-zinc-300"
              style={{ pageBreakInside: 'avoid' }}
            />
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

  const printOnEveryPage = Boolean(
    reportSettings.signatureSettings?.printOnEveryPage || reportSettings.signaturePrintOnEveryPage
  );
  const globalShowSignatureOnly = Boolean(
    reportSettings.signatureSettings?.showSignatureOnly || reportSettings.showSignatureOnly
  );
  const isFixedSig = reportSettings.signatureSettings?.positionMode !== "flow";

  if (printOnEveryPage || isFixedSig) {
    // If printing signatures on every page or using static fixed positioning, push only the end of report line into blocks flow
    blocks.push({
      key: "report-end-of-report-line",
      node: (
        <div 
          className="mt-3 pt-2 text-center font-bold text-zinc-400 uppercase tracking-widest pb-1 select-none"
          style={{ fontSize: `${endConf.fontSize || 9}px`, pageBreakInside: 'avoid' }}
        >
          {endConf.text || "*** END OF REPORT ***"}
        </div>
      ),
    });
  } else {
    // When in flow mode, signatures appear only on the last page at the end of report
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

          {enabledSignatures.length > 0 && renderSignaturesGrid(signatureRows, enabledSignatures, globalShowSignatureOnly)}
        </div>
      )
    });
  }

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
    autoFitToFooter?: boolean;
    onPageCount?: (n: number) => void;
    showMarginGuides?: boolean;
  }
>(({ report, settings, scale = 1, hidePatientBlock, hideInterpretation, autoFitToFooter = true, onPageCount, showMarginGuides }, ref) => {
  const blocks = React.useMemo(
    () => buildReportBlocks(report, { hidePatientBlock, hideInterpretation, autoFitToFooter }),
    [report, hidePatientBlock, hideInterpretation, autoFitToFooter]
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
  const bgImage = effectiveSettings.bgImage || null;

  // Extract report settings and enabled signatures
  const reportSettings = React.useMemo(() => {
    const lab = (report.lab || {}) as any;
    return normalizeReportSettings(
      lab.report_settings || lab.reportSettings || (report as any).report_settings || (report as any).reportSettings
    );
  }, [report]);

  const enabledSignaturesList = React.useMemo(() => {
    const sigs = Array.isArray(reportSettings.doctorSignatures) && reportSettings.doctorSignatures.length > 0
      ? reportSettings.doctorSignatures
      : (reportSettings.doctorSignature ? [reportSettings.doctorSignature] : []);
    return sigs.filter((s: any) => s.enabled);
  }, [reportSettings]);

  const printOnEveryPage = Boolean(
    reportSettings.signatureSettings?.printOnEveryPage || reportSettings.signaturePrintOnEveryPage
  );
  const globalShowSignatureOnly = Boolean(
    reportSettings.signatureSettings?.showSignatureOnly || reportSettings.showSignatureOnly
  );

  const signatureRows = React.useMemo(() => {
    const rows: Array<[typeof enabledSignaturesList[0], typeof enabledSignaturesList[0] | undefined]> = [];
    for (let i = 0; i < enabledSignaturesList.length; i += 2) {
      rows.push([enabledSignaturesList[i], enabledSignaturesList[i + 1]]);
    }
    return rows;
  }, [enabledSignaturesList]);

  const sigMeasureRef = React.useRef<HTMLDivElement | null>(null);
  const [sigH, setSigH] = React.useState<number>(85);

  const maxUserMarginTop = React.useMemo(() => {
    if (!enabledSignaturesList.length) return 0;
    return Math.max(0, ...enabledSignaturesList.map((s: any) => Number(s.marginTop || 0)));
  }, [enabledSignaturesList]);

  // Estimated fallback height to prevent clipping on initial frame or slow networks
  const getEstimatedBlockHeight = (block: ReportBlock): number => {
    const k = block.key || "";
    if (k.startsWith("tblhead-")) return 20;
    if (k.startsWith("header-")) return 22;
    if (k.startsWith("department-header-")) return 20;
    if (k.startsWith("subgroup-title-")) return 16;
    if (k.startsWith("row-")) return 18;
    if (k.startsWith("custom-editor-intro-")) return 80;
    if (k.startsWith("custom-editor-row-")) return 38;
    if (k.startsWith("custom-editor-post-")) return 40;
    if (k.startsWith("custom-editor-")) return 250;
    if (k.startsWith("interp-")) return 160;
    if (k.startsWith("findings-")) return 35;
    if (k.startsWith("report-end-of-report-line")) return 16;
    if (k.startsWith("report-signatures-footer")) return 65;
    if (k.startsWith("endline-")) return 6;
    return 18;
  };

  // Measure block heights at natural (unscaled) content width including margins with loop guard
  React.useLayoutEffect(() => {
    const measureHeights = () => {
      const next = blocks.map((_, i) => {
        const el = measureRefs.current[i];
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        let totalH = rect.height;
        try {
          const style = window.getComputedStyle(el);
          const mt = parseFloat(style.marginTop) || 0;
          const mb = parseFloat(style.marginBottom) || 0;
          totalH += (mt + mb);
        } catch {}
        return Math.ceil(totalH);
      });
      setHeights(prev => {
        if (prev.length === next.length && prev.every((v, idx) => Math.abs(v - next[idx]) < 1)) {
          return prev;
        }
        return next;
      });
      if (patientMeasureRef.current) {
        const el = patientMeasureRef.current;
        const rect = el.getBoundingClientRect();
        let totalPh = rect.height;
        try {
          const style = window.getComputedStyle(el);
          const mt = parseFloat(style.marginTop) || 0;
          const mb = parseFloat(style.marginBottom) || 0;
          totalPh += (mt + mb);
        } catch {}
        const ph = Math.ceil(totalPh);
        if (ph > 0) setPatientH(prev => Math.abs(prev - ph) < 1 ? prev : ph);
      }
      if (sigMeasureRef.current) {
        const el = sigMeasureRef.current;
        const rect = el.getBoundingClientRect();
        let totalMh = rect.height;
        try {
          const style = window.getComputedStyle(el);
          const mt = parseFloat(style.marginTop) || 0;
          const mb = parseFloat(style.marginBottom) || 0;
          totalMh += (mt + mb);
        } catch {}
        const mh = Math.ceil(totalMh);
        if (mh > 0) setSigH(prev => Math.abs(prev - mh) < 1 ? prev : mh);
      }
    };

    measureHeights();
    const t1 = setTimeout(measureHeights, 60);
    const t2 = setTimeout(measureHeights, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [blocks, contentWidth]);

  const isFixedSig = reportSettings.signatureSettings?.positionMode !== "flow";
  const sigBottomOffset = typeof reportSettings.signatureSettings?.bottomOffset === "number"
    ? reportSettings.signatureSettings.bottomOffset
    : 45;
  const sigAlign = reportSettings.signatureSettings?.horizontalAlign || "right";
  const sigHorizontalOffset = typeof reportSettings.signatureSettings?.horizontalOffset === "number"
    ? reportSettings.signatureSettings.horizontalOffset
    : 35;

  // The content area extends strictly down to the user-configured footer line
  const contentAreaHeight = Math.max(120, A4_H - effectiveSettings.headerHeight - effectiveSettings.footerHeight);

  // Exact usable height for blocks on each page up to the footer line
  const getPageUsableHeight = React.useCallback(
    (isLastPage: boolean): number => {
      const patientBlockRoom = hidePatientBlock ? 0 : patientH;
      let sigReservation = 0;
      const hasSigs = enabledSignaturesList.length > 0;
      const showSigOnThisPage = hasSigs && (printOnEveryPage || isLastPage);

      if (showSigOnThisPage) {
        const netSigH = Math.max(45, Math.min(85, sigH - maxUserMarginTop));
        if (!isFixedSig) {
          // Flow mode: signature rendered inside the content div at bottom
          sigReservation = netSigH + 2;
        } else {
          // Fixed mode: signature at bottom: sigBottomOffset
          // Only reserve space if the top of the signature extends above the footer boundary
          const sigTopFromBottom = sigBottomOffset + netSigH;
          if (sigTopFromBottom > effectiveSettings.footerHeight) {
            sigReservation = Math.max(0, sigTopFromBottom - effectiveSettings.footerHeight);
          }
        }
      }

      // 1px minimal safety buffer: content fills strictly right down to the footer line!
      return Math.max(60, contentAreaHeight - patientBlockRoom - sigReservation - 1);
    },
    [contentAreaHeight, hidePatientBlock, patientH, enabledSignaturesList.length, printOnEveryPage, isFixedSig, sigH, maxUserMarginTop, sigBottomOffset, effectiveSettings.footerHeight]
  );

  const pages = React.useMemo(() => {
    if (!blocks.length) return [[]];

    const getH = (b: ReportBlock, idx: number) => {
      const isSig = b.key === "report-signatures-footer";
      const measured = heights[idx];
      const measuredH = (measured && measured > 3)
        ? Math.ceil(measured)
        : Math.ceil(getEstimatedBlockHeight(b));
      return isSig ? Math.max(65, measuredH - maxUserMarginTop) : measuredH;
    };

    const result: number[][] = [];
    let current: number[] = [];
    let used = 0;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const h = getH(b, i);

      const shouldForceNewPage = Boolean(
        reportSettings.separatePagePerTest &&
        b.isTestStart &&
        current.length > 0
      );

      // Usable height for standard page filling up to the user-configured footer line
      const currentUsable = getPageUsableHeight(false);

      // Orphan prevention: if this block is a table header, test header, department header, or subgroup title,
      // make sure its required children will fit on the same page!
      let lookAheadH = 0;
      if (
        (b.key.startsWith("tblhead-") || b.key.startsWith("subgroup-title-")) &&
        i + 1 < blocks.length
      ) {
        lookAheadH = Math.min(45, getH(blocks[i + 1], i + 1));
      } else if (b.key.startsWith("header-") && i + 1 < blocks.length) {
        const nextH = getH(blocks[i + 1], i + 1);
        const secondH = (i + 2 < blocks.length) ? getH(blocks[i + 2], i + 2) : 0;
        lookAheadH = Math.min(65, nextH + secondH);
      } else if (b.key.startsWith("department-header-") && i + 1 < blocks.length) {
        const nextH = getH(blocks[i + 1], i + 1);
        const secondH = (i + 2 < blocks.length) ? getH(blocks[i + 2], i + 2) : 0;
        lookAheadH = Math.min(85, nextH + secondH);
      }

      if (
        (current.length > 0 && (used + h + lookAheadH > currentUsable)) ||
        shouldForceNewPage
      ) {
        result.push(current);
        current = [];
        used = 0;
      }

      current.push(i);
      used += h;
    }

    if (current.length) {
      result.push(current);
    }

    return result.length ? result : [[]];
  }, [blocks, heights, getPageUsableHeight, maxUserMarginTop, reportSettings.separatePagePerTest]);

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
              table, tr, td {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .report-preview-page-card {
                width: 794px !important;
                height: 1120px !important;
                min-height: 1120px !important;
                max-height: 1120px !important;
                margin: 0 auto !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                overflow: hidden !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .report-preview-page-card:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              .report-print-page {
                width: 794px !important;
                height: 1120px !important;
                max-height: 1120px !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
                position: relative !important;
                overflow: hidden !important;
                background-color: #ffffff !important;
              }
            }
            .report-custom-editor-content table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 1px !important;
              margin-bottom: 1px !important;
              font-size: 10px !important;
            }
            .report-custom-editor-content th,
            .report-custom-editor-content td {
              border: 1px solid #d4d4d8 !important;
              padding: 2.5px 6px !important;
              line-height: 1.25 !important;
            }
            .report-custom-editor-content th {
              background-color: #f4f4f5 !important;
              font-weight: bold !important;
              color: #18181b !important;
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
          opacity: 0,
          zIndex: -100,
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
        {printOnEveryPage && enabledSignaturesList.length > 0 && (
          <div ref={sigMeasureRef} className="text-zinc-900 pt-2">
            {renderSignaturesGrid(signatureRows, enabledSignaturesList, globalShowSignatureOnly, true)}
          </div>
        )}
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

              {/* Content area strictly bounded between header and footer */}
              <div
                className="text-zinc-900 flex flex-col justify-between"
                style={{
                  position: "absolute",
                  top: effectiveSettings.headerHeight,
                  left: effectiveSettings.marginLeft,
                  width: contentWidth,
                  height: contentAreaHeight,
                  maxHeight: contentAreaHeight,
                  overflow: "hidden",
                  zIndex: 1,
                  fontFamily: 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", Roboto, sans-serif',
                }}
              >
                <div className="flex-1 min-h-0">
                  {!hidePatientBlock && <PatientInfoBlock report={report} />}
                  {pageBlockIdxs.map((bi, bIdx) => {
                    const block = blocks[bi] as any;
                    const prevBi = bIdx > 0 ? pageBlockIdxs[bIdx - 1] : null;
                    const prevKey = prevBi !== null ? blocks[prevBi]?.key : "";
                    const isRowContinuation =
                      block.key?.startsWith("custom-editor-row-") &&
                      !block.key?.endsWith("-0") &&
                      (!prevKey || !prevKey.startsWith("custom-editor-row-"));

                    return (
                      <div key={block.key}>
                        {isRowContinuation && block.continuationHeader}
                        {block.node}
                      </div>
                    );
                  })}
                </div>

                {/* If printOnEveryPage is true AND in flow mode, render signatures at bottom of EVERY page in flow */}
                {!isFixedSig && printOnEveryPage && enabledSignaturesList.length > 0 && (
                  <div className="mt-auto pt-2 shrink-0 select-none" style={{ pageBreakInside: 'avoid' }}>
                    {renderSignaturesGrid(signatureRows, enabledSignaturesList, globalShowSignatureOnly)}
                  </div>
                )}
              </div>

              {/* Static Fixed Position Doctor Signature (Static on last page or every page) */}
              {isFixedSig && enabledSignaturesList.length > 0 && (printOnEveryPage || pi === pages.length - 1) && (
                <div
                  className="report-static-signature-container select-none print:select-none"
                  style={{
                    position: "absolute",
                    bottom: `${sigBottomOffset}px`,
                    left: `${effectiveSettings.marginLeft}px`,
                    width: `${contentWidth}px`,
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {renderSignaturesGrid(signatureRows, enabledSignaturesList, globalShowSignatureOnly, true)}
                </div>
              )}

              {/* Visual Margin Guides for Designer & Settings Live Preview (Hidden on Print) */}
              {showMarginGuides && (
                <div className="absolute inset-0 pointer-events-none print:hidden z-20 select-none">
                  {/* Top Header Boundary */}
                  <div
                    style={{ top: effectiveSettings.headerHeight }}
                    className="absolute inset-x-0 border-b-2 border-dashed border-blue-500/80 flex items-center justify-end px-3 pointer-events-none"
                  >
                    <span className="text-[10px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded shadow-xs -translate-y-1/2">
                      Header: {effectiveSettings.headerHeight}px
                    </span>
                  </div>

                  {/* Bottom Footer Content Boundary (Strict line where content stops) */}
                  <div
                    style={{ bottom: effectiveSettings.footerHeight }}
                    className="absolute inset-x-0 border-t-2 border-dashed border-rose-500/80 flex items-center justify-end px-3 pointer-events-none"
                  >
                    <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded shadow-xs translate-y-1/2">
                      Footer Stop Line: {effectiveSettings.footerHeight}px
                    </span>
                  </div>

                  {/* Left Margin Boundary */}
                  <div
                    style={{
                      left: effectiveSettings.marginLeft,
                      top: effectiveSettings.headerHeight,
                      height: contentAreaHeight,
                    }}
                    className="absolute border-l-2 border-dashed border-amber-500/70"
                  />

                  {/* Right Margin Boundary */}
                  <div
                    style={{
                      right: effectiveSettings.marginRight,
                      top: effectiveSettings.headerHeight,
                      height: contentAreaHeight,
                    }}
                    className="absolute border-r-2 border-dashed border-amber-500/70"
                  />

                  {/* Static Signature Guide (if fixed mode) */}
                  {isFixedSig && enabledSignaturesList.length > 0 && (
                    <div
                      style={{
                        bottom: `${sigBottomOffset}px`,
                        left: sigAlign === "left"
                          ? `${sigHorizontalOffset}px`
                          : (sigAlign === "center" ? "50%" : undefined),
                        right: sigAlign === "right"
                          ? `${sigHorizontalOffset}px`
                          : undefined,
                        transform: sigAlign === "center" ? "translateX(-50%)" : undefined,
                      }}
                      className="absolute border border-indigo-500/50 bg-indigo-500/10 rounded px-2 py-0.5 flex items-center gap-1 pointer-events-none z-30"
                    >
                      <span className="text-[9px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white/90 dark:bg-zinc-900/90 px-1 py-0.2 rounded shadow-2xs">
                        Fixed Signature ({sigBottomOffset}px)
                      </span>
                    </div>
                  )}
                </div>
              )}
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
