import * as React from "react";
import Image from "next/image";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { BarcodeSVG } from "./barcode-svg";
import { type BillLayoutSettings, defaultBillLayoutSettings, normalizeBillSettings } from "@/lib/bill-settings";

export interface InvoiceData {
  id?: string;
  customId: string;
  createdAt: string;
  total: number;
  discount: number;
  paidAmount: number;
  status: string;
  paymentMode?: string;
  dayWiseId?: string;
  billedBy?: string;
  sampleCollectedBy?: string;
  collectionCenter?: string;
  reportId?: string;
  packageName?: string | null;
  patient: {
    id?: string;
    customId: string;
    name: string;
    phone: string;
    age: number;
    gender: string;
    refDoctor?: string;
    secondReferral?: string;
    address?: string;
    aadhaarNo?: string;
    insuranceNo?: string;
    hfrId?: string;
    ownerName?: string;
    corporateName?: string;
    vialBarcode?: string | null;
    abhaNumber?: string | null;
    abhaAddress?: string | null;
    uhid?: string | null;
    govPanel?: string | null;
  };
  lab: {
    name: string;
    email: string;
    address: string;
    phone?: string;
    logoUrl: string | null;
    pincode?: string;
    city?: string;
    district?: string;
    state?: string;
    gstin?: string;
    bill_settings?: BillLayoutSettings;
  };
  tests: Array<{
    id: string;
    name: string;
    price: number;
    code?: string;
    category?: string;
    sampleType?: string;
    parent?: any;
    subTests?: Array<{ id: string; name: string }>;
  }>;
}

export function resolveSampleType(testObj: any): string {
  // If explicitly specified as something other than generic "Blood" or empty
  const rawSample = (testObj?.sampleType || testObj?.sample_type || testObj?.specimen || "").toString().trim();
  if (rawSample && !/^blood$/i.test(rawSample) && !/^pathology$/i.test(rawSample)) {
    return rawSample;
  }

  const name = String(testObj?.name || "").toLowerCase();
  const cat = String(testObj?.category || "").toLowerCase();

  // 1. Urine
  if (
    name.includes("urine") || cat.includes("urine") ||
    name.includes("upt") || name.includes("microalbumin") ||
    name.includes("bence jones")
  ) {
    return "Urine";
  }

  // 2. Stool
  if (name.includes("stool") || cat.includes("stool") || name.includes("occult blood")) {
    return "Stool";
  }

  // 3. Sputum / Swab / Semen / Body Fluids / Biopsy / Pap
  if (name.includes("sputum") || cat.includes("sputum")) return "Sputum";
  if (name.includes("semen") || cat.includes("semen") || name.includes("seminal")) return "Semen";
  if (name.includes("swab") || cat.includes("swab") || name.includes("throat") || name.includes("nasal") || name.includes("covid") || name.includes("rt-pcr")) return "Nasopharyngeal Swab";
  if (name.includes("pap") || name.includes("cervical")) return "Cervical Smear";
  if (name.includes("biopsy") || name.includes("histopath") || cat.includes("histopathology")) return "Tissue Specimen";
  if (name.includes("fluid") || cat.includes("csf") || name.includes("csf") || name.includes("ascitic") || name.includes("pleural") || name.includes("synovial") || name.includes("peritoneal")) return "Body Fluid";

  // 4. Citrated Plasma (Coagulation)
  if (
    name.includes("pt/inr") || name.includes("pt-inr") || name.includes("prothrombin") ||
    name.includes("inr") || name.includes("aptt") || name.includes("ptt") ||
    name.includes("d-dimer") || name.includes("ddimer") || name.includes("fibrinogen") ||
    cat.includes("coagulation")
  ) {
    return "Citrated Plasma";
  }

  // 5. Fluoride Plasma (Blood Glucose / Sugar specific)
  if (
    name.includes("fbs") || name.includes("ppbs") || name.includes("rbs") ||
    name.includes("fasting blood sugar") || name.includes("post prandial") ||
    name.includes("glucose tolerance") || name.includes("gtt")
  ) {
    return "Fluoride Plasma / Serum";
  }

  // 6. EDTA Whole Blood (Hematology)
  if (
    name.includes("cbc") || name.includes("hemogram") || name.includes("complete blood") ||
    name.includes("hemoglobin") || name.includes("haemoglobin") || name.startsWith("hb ") || name === "hb" ||
    name.includes("esr") || name.includes("tlc") || name.includes("dlc") ||
    name.includes("platelet") || name.includes("edta") || name.includes("blood group") ||
    name.includes("rh factor") || name.includes("rh typing") || name.includes("abo") ||
    name.includes("peripheral") || name.includes("ps for") || name.includes("blood smear") ||
    name.includes("malaria") || name.includes("mp ") || name.includes("mp card") ||
    name.includes("hba1c") || name.includes("glycated") || name.includes("glycosylated") ||
    name.includes("sickling") || name.includes("reticulocyte") || name.includes("aec") ||
    cat.includes("haematology") || cat.includes("hematology")
  ) {
    return "EDTA Whole Blood";
  }

  // 7. Serum (Biochemistry, Serology, Hormones, Immunology, Liver, Kidney, Lipid, Electrolytes, Vitamins, etc.)
  if (
    // Categories
    cat.includes("biochemistry") || cat.includes("serology") || cat.includes("immunology") ||
    cat.includes("hormone") || cat.includes("endocrinology") || cat.includes("cardiac") ||
    cat.includes("clinical pathology") || cat.includes("microbiology") || cat.includes("special chemistry") ||
    // Liver / LFT
    name.includes("lft") || name.includes("liver") || name.includes("bilirubin") ||
    name.includes("sgot") || name.includes("sgpt") || name.includes("alt") || name.includes("ast") ||
    name.includes("alkaline phosphatase") || name.includes("alp") || name.includes("albumin") ||
    name.includes("globulin") || name.includes("ggt") || name.includes("protein") ||
    // Kidney / KFT / RFT
    name.includes("kft") || name.includes("rft") || name.includes("renal") || name.includes("kidney") ||
    name.includes("creatinine") || name.includes("urea") || name.includes("uric") || name.includes("bun") ||
    // Lipids / Heart
    name.includes("lipid") || name.includes("cholesterol") || name.includes("triglyceride") ||
    name.includes("hdl") || name.includes("ldl") || name.includes("vldl") ||
    name.includes("troponin") || name.includes("ck-mb") || name.includes("cpk") ||
    // Thyroid & Hormones
    name.includes("thyroid") || name.includes("tsh") || name.includes("t3") || name.includes("t4") ||
    name.includes("ft3") || name.includes("ft4") || name.includes("beta hcg") || name.includes("hcg") ||
    name.includes("prolactin") || name.includes("testosterone") || name.includes("fsh") ||
    name.includes("lh") || name.includes("estrogen") || name.includes("cortisol") ||
    name.includes("insulin") || name.includes("amh") ||
    // Glucose / Sugar general
    name.includes("glucose") || name.includes("sugar") ||
    // Electrolytes & Minerals
    name.includes("electrolyte") || name.includes("sodium") || name.includes("potassium") ||
    name.includes("chloride") || name.includes("calcium") || name.includes("phosphorus") ||
    name.includes("magnesium") ||
    // Vitamins & Iron
    name.includes("vitamin") || name.includes("vit ") || name.includes("vit-") ||
    name.includes("b12") || name.includes("d3") || name.includes("25-oh") ||
    name.includes("ferritin") || name.includes("iron") || name.includes("tibc") ||
    // Serology & Infections
    name.includes("crp") || name.includes("c-reactive") || name.includes("ra factor") ||
    name.includes("rheumatoid") || name.includes("rf") || name.includes("aso") ||
    name.includes("widal") || name.includes("typhoid") || name.includes("typhidot") ||
    name.includes("dengue") || name.includes("ns1") || name.includes("chikungunya") ||
    name.includes("hiv") || name.includes("hbsag") || name.includes("hcv") ||
    name.includes("vdrl") || name.includes("tpha") || name.includes("syphilis") ||
    name.includes("procalcitonin") || name.includes("amylase") || name.includes("lipase")
  ) {
    return "Serum";
  }

  // 8. Default fallback for medical pathology is Serum
  return rawSample || "Serum";
}

export const InvoiceSheet = React.forwardRef<
  HTMLDivElement,
  { invoice: InvoiceData; settings?: BillLayoutSettings; scale?: number }
>(({ invoice, settings: propSettings, scale }, ref) => {
  const lab = (invoice.lab || {}) as any;
  const billSettings = propSettings || normalizeBillSettings(lab.bill_settings || lab.billSettings);
  const patient = (invoice.patient || {}) as any;

  // Active logo determination: user uploaded bill logo takes priority, fallback to lab logo
  const billLogo = billSettings.logoImage || lab.logoUrl || lab.logo_url || lab.logo || null;
  const showLogo = billSettings.showLogo !== false && Boolean(billLogo);
  const showLabAddress = billSettings.showLabAddress !== false;
  const logoWidth = billSettings.logoWidth || 64;

  const labName = lab.name || lab.centre_name || lab.centreName || "OnePath Pathology Laboratory";
  const labAddress = [lab.address, lab.city, lab.state, lab.pincode].filter(Boolean).join(", ") || lab.address || "Medical Diagnostic Center";
  const labPhone = lab.phone || "";
  const labEmail = lab.email || "";
  const labGstin = billSettings.gst?.number || lab.gstin || "";

  const invoiceCustomId = invoice.customId || (invoice as any).custom_id || (invoice.id ? `OPL-INV-${String(invoice.id).substring(0, 6).toUpperCase()}` : "—");
  const patientCustomId = patient.customId || patient.custom_id || patient.customID || (patient.id ? `PID-${String(patient.id).substring(0, 6).toUpperCase()}` : "—");
  const patientName = patient.name || patient.patient_name || "—";
  const patientAge = patient.age !== undefined && patient.age !== null ? patient.age : "—";
  const patientGender = patient.gender || "—";
  const patientDoctor = patient.refDoctor || patient.ref_doctor || "Self";
  const patientPhone = patient.phone || "—";
  const patientAddress = patient.address || "—";

  const isPaid = invoice.status === "PAID";
  const effectivePaidAmount = isPaid ? (invoice.total || 0) : (invoice.paidAmount || 0);
  const balance = isPaid ? 0 : Math.max(0, (invoice.total || 0) - (invoice.paidAmount || 0));
  const isA5 = billSettings.size === "A5";

  const groupedTests = React.useMemo(() => {
    const map = new Map<string, { mainTest: any; subTests: any[] }>();
    (invoice.tests || []).forEach(test => {
      let mainTest = test;
      if (test.parent) {
        if (test.parent.parent) {
          mainTest = test.parent.parent;
        } else {
          mainTest = test.parent;
        }
      }
      
      const key = mainTest.id || mainTest.name;
      if (!map.has(key)) {
        map.set(key, { mainTest, subTests: [] });
      }
      
      if (test.id !== mainTest.id && test.name !== "Report Template") {
        map.get(key)!.subTests.push(test);
      }
    });
    return Array.from(map.values());
  }, [invoice.tests]);

  const billDateStr = (() => {
    try {
      const d = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
      return isNaN(d.getTime()) ? invoice.createdAt : format(d, "dd MMM yyyy, hh:mm a");
    } catch {
      return invoice.createdAt || "";
    }
  })();

  const rawAbha = patient.abhaAddress || patient.abhaNumber || patient.abha_address || patient.abha_number || patient.meta?.abha_address || patient.meta?.abha_number || "";
  const rawVial = patient.vialBarcode || patient.vial_barcode || patient.meta?.vial_barcode || "";

  const allBillFieldsMap: Record<string, { label: string; value: React.ReactNode }> = {
    "Bill ID": { label: "Bill / Inv No:", value: <span className="font-mono font-bold text-black">{invoiceCustomId}</span> },
    "Day wise ID": { label: "Day ID:", value: <span className="font-mono font-semibold">{invoice.dayWiseId || "—"}</span> },
    "Bill Date": { label: "Date & Time:", value: <span>{billDateStr}</span> },
    "Patient ID": { label: "Patient ID (PID):", value: <span className="font-mono font-bold text-black">{patientCustomId}</span> },
    "UHID": { label: "UHID:", value: <span className="font-mono font-semibold text-black">{patient.uhid || patient.meta?.uhid || "—"}</span> },
    "Name": { label: "Patient Name:", value: <span className="font-bold text-black uppercase">{patientName}</span> },
    "Age/Gender": { label: "Age / Gender:", value: <span>{patientAge} Y / {patientGender}</span> },
    "Contact No.": { label: "Contact No:", value: <span className="font-mono">{patientPhone}</span> },
    "ABHA ID": {
      label: "ABHA ID:",
      value: rawAbha ? (
        <span className="font-mono font-bold text-blue-700 dark:text-blue-600">{rawAbha}</span>
      ) : (
        <span>—</span>
      ),
    },
    "Vial Barcode": {
      label: "Vial Barcode:",
      value: rawVial ? (
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-black">{rawVial}</span>
          <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-zinc-200 text-zinc-800">VIAL</span>
        </div>
      ) : (
        <span className="font-mono text-zinc-500 font-bold">N/A</span>
      ),
    },
    "Aadhaar no.": { label: "Aadhaar No:", value: <span className="font-mono">{patient.aadhaarNo || "—"}</span> },
    "Insurance no.": { label: "Insurance No:", value: <span className="font-mono">{patient.insuranceNo || "—"}</span> },
    "Address": { label: "Address:", value: <span className="truncate">{patientAddress}</span> },
    "HFR ID": { label: "HFR ID:", value: <span className="font-mono">{patient.hfrId || "—"}</span> },
    "Pincode": { label: "Pincode:", value: <span>{lab.pincode || patient.pincode || "—"}</span> },
    "District": { label: "District:", value: <span>{lab.district || lab.city || patient.district || "—"}</span> },
    "Town": { label: "Town/City:", value: <span>{lab.city || patient.city || "—"}</span> },
    "Referred By": { label: "Referred By:", value: <span className="font-medium text-black">Dr. {patientDoctor}</span> },
    "Second Referral": { label: "2nd Referral:", value: <span>{patient.secondReferral || "—"}</span> },
    "Corporate / Panel": { label: "Corporate:", value: <span>{patient.corporateName || patient.corporate_name || patient.govPanel || "—"}</span> },
    "GSTIN": { label: "Lab GSTIN:", value: <span className="font-mono font-semibold">{labGstin || "—"}</span> },
    "Payment Mode": { label: "Payment Mode:", value: <span className="font-semibold uppercase">{invoice.paymentMode || "CASH / UPI"}</span> },
    "Collection Center": { label: "Center:", value: <span>{invoice.collectionCenter || "Main Lab"}</span> },
    "Owner Name": { label: "Owner Name:", value: <span>{patient.ownerName || "—"}</span> },
  };

  const activeFields: { label: string; value: React.ReactNode }[] = [];
  (billSettings.fieldOrdering || []).forEach(key => {
    if (allBillFieldsMap[key]) {
      activeFields.push(allBillFieldsMap[key]);
    }
  });

  const upiLink = billSettings.upi?.upiId
    ? `upi://pay?pa=${encodeURIComponent(billSettings.upi.upiId)}&pn=${encodeURIComponent(labName)}&am=${balance.toFixed(2)}&cu=INR`
    : "";

  // Dynamic QR Code encoding: when scanned, displays Invoice number, Patient name, Net amount, and Verify link
  const dynamicQrValue = invoiceCustomId && invoiceCustomId !== "—"
    ? `INVOICE NO: ${invoiceCustomId}\nPATIENT: ${patientName} (PID: ${patientCustomId})\nDATE: ${billDateStr}\nAMOUNT: ₹${Number(invoice.total || 0).toFixed(2)}\nSTATUS: ${invoice.status || "CONFIRMED"}\nLAB: ${labName}\nVERIFY: https://lis.onepathlab.com/track-report?inv=${encodeURIComponent(invoiceCustomId)}`
    : "https://lis.onepathlab.com";

  // Calculations for safe background overlay
  const letterheadBg = billSettings.bgImage || (lab.print_with_letterhead ? (lab.print_bg_image || lab.printBgImage) : null);
  const hasBg = Boolean(letterheadBg);
  const hasHeaderBanner = Boolean(billSettings.headerImage);
  const hasFooterBanner = Boolean(billSettings.footerImage);

  const effectiveHeaderHeight = (hasHeaderBanner || hasBg) ? (billSettings.headerHeight || 110) : (billSettings.margins?.top || 16);
  const effectiveFooterHeight = (hasFooterBanner || hasBg) ? (billSettings.footerHeight || 70) : (billSettings.margins?.bottom || 16);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${isA5 ? "A5 portrait" : "A4 portrait"};
                margin: 0mm !important;
              }
              .invoice-print-sheet {
                width: ${isA5 ? "559px" : "794px"} !important;
                min-height: ${isA5 ? "794px" : "1123px"} !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />
      <div
        ref={ref}
        className={`bg-white text-black mx-auto relative invoice-print-sheet shadow-xs overflow-hidden ${
          isA5 ? "w-[559px] min-h-[794px]" : "w-[794px] min-h-[1123px]"
        } print:max-w-none print:w-full print:min-h-0 flex flex-col justify-between`}
        style={{
          boxSizing: "border-box",
          fontFamily: 'Arial, "Segoe UI", Roboto, sans-serif',
          position: "relative",
          paddingLeft: `${billSettings.margins?.left ?? 24}px`,
          paddingRight: `${billSettings.margins?.right ?? 24}px`,
          paddingTop: `${effectiveHeaderHeight}px`,
          paddingBottom: `${effectiveFooterHeight}px`,
          transform: scale ? `scale(${scale})` : undefined,
          transformOrigin: scale ? "top center" : undefined,
        }}
      >
        {/* ── BACKGROUND LAYER: Full Letterhead Stationery (if enabled) ── */}
        {hasBg && (
          <img
            src={letterheadBg!}
            alt="Letterhead Background"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 print:block"
          />
        )}

        {/* ── HEADER BANNER LAYER: Absolute Top Overlay ── */}
        {hasHeaderBanner && (
          <div
            className="absolute top-0 left-0 right-0 w-full pointer-events-none z-0 overflow-hidden"
            style={{ height: `${billSettings.headerHeight || 110}px` }}
          >
            <img
              src={billSettings.headerImage!}
              alt="Bill Header"
              className="w-full h-full object-fill"
            />
          </div>
        )}

        {/* ── FOOTER BANNER LAYER: Absolute Bottom Overlay ── */}
        {hasFooterBanner && (
          <div
            className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-0 overflow-hidden"
            style={{ height: `${billSettings.footerHeight || 70}px` }}
          >
            <img
              src={billSettings.footerImage!}
              alt="Bill Footer"
              className="w-full h-full object-fill"
            />
          </div>
        )}

        {/* ── FOREGROUND CONTENT (Floats cleanly over background & margins) ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            {/* ── 1. HEADER SECTION (STANDARD LOGO & BRANDING WHEN NO BANNER IS PRESENT) ── */}
            {!hasHeaderBanner && !hasBg && (
              <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  {showLogo && (
                    <div
                      className="relative rounded overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ width: `${logoWidth}px` }}
                    >
                      <img src={billLogo!} alt="Lab Logo" className="w-full h-auto max-h-16 object-contain" />
                    </div>
                  )}

                  {showLabAddress && (
                    <div>
                      <h1 className="text-xl font-black text-black tracking-tight uppercase leading-none">{labName}</h1>
                      <p className="text-[11px] text-zinc-700 leading-tight mt-1">{labAddress}</p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono mt-0.5">
                        {labPhone && <span>Ph: {labPhone}</span>}
                        {labEmail && <span>Email: {labEmail}</span>}
                        {billSettings.gst?.show && labGstin && (
                          <span className="font-bold text-zinc-900">GSTIN: {labGstin}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <h2 className="text-sm font-extrabold text-zinc-900 tracking-wider uppercase bg-zinc-100 px-2.5 py-1 rounded border border-zinc-300 inline-block">
                    {billSettings.heading || "Invoice-cum-receipt"}
                  </h2>
                  <div className="text-[10px] text-zinc-700 mt-1 space-y-0.5">
                    <p><span className="font-bold text-zinc-900">Bill No:</span> <span className="font-mono font-bold text-black">{invoiceCustomId}</span></p>
                    <p><span className="font-semibold text-zinc-600">Status:</span> <span className={`font-bold ${invoice.status === "PAID" ? "text-emerald-700" : invoice.status === "PARTIAL" ? "text-amber-700" : "text-rose-700"}`}>{invoice.status}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* When header banner or bg is active, render small right-aligned bill indicator tag */}
            {(hasHeaderBanner || hasBg) && (
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-zinc-300 text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-700 text-[11px]">
                  {billSettings.heading || "Invoice-cum-receipt"}
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span><strong className="text-zinc-900">Bill No:</strong> <span className="font-mono font-bold">{invoiceCustomId}</span></span>
                  <span><strong className="text-zinc-600">Status:</strong> <span className={`font-bold ${invoice.status === "PAID" ? "text-emerald-700" : invoice.status === "PARTIAL" ? "text-amber-700" : "text-rose-700"}`}>{invoice.status}</span></span>
                </div>
              </div>
            )}

            {/* ── 2. PATIENT / BILL DETAILS BOX ── */}
            <div 
              className="border border-zinc-300 rounded p-2.5 bg-zinc-50/50 text-[11px] leading-[1.35] text-zinc-900 shadow-2xs"
              style={{ marginBottom: `${billSettings.margins?.patientDetailsBottomSpacing || 8}px` }}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Dynamic 2-Column Info Grid */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {activeFields.map((field, idx) => (
                      <div key={idx} className={`flex items-start ${idx % 2 === 1 ? "border-l border-zinc-200 pl-2.5" : ""}`}>
                        <span className="w-24 text-zinc-600 font-bold shrink-0">{field.label}</span>
                        <div className="flex-1 min-w-0">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic QR Code on Right (if enabled) */}
                {billSettings.showQrCode && (
                  <div className="shrink-0 flex flex-col items-center justify-center border-l border-zinc-200 pl-2.5 min-w-[70px]">
                    <div className="bg-white p-1 rounded border border-zinc-300 shadow-2xs">
                      <QRCodeSVG
                        value={dynamicQrValue}
                        size={52}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-wider block mt-1">Invoice QR</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2.5 HEALTH PACKAGE BANNER (Prominently displays package name if booked) ── */}
            {billSettings.showPackageName && invoice.packageName && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-blue-700 text-white uppercase tracking-wider">
                    PACKAGE
                  </span>
                  <span className="font-bold text-xs text-blue-950 font-display uppercase tracking-wide">
                    {invoice.packageName}
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 font-semibold">
                  Comprehensive Diagnostic Profile
                </span>
              </div>
            )}

            {/* ── 3. TEST INVESTIGATION CHARGES TABLE ── */}
            <div className="mb-4">
              <table className="w-full text-left border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-extrabold text-zinc-900 uppercase tracking-wider">
                    <th className="py-2 px-2.5 w-10 text-center border-r border-zinc-300">#</th>
                    {billSettings.showTestCode && <th className="py-2 px-2.5 w-20 border-r border-zinc-300">Code</th>}
                    <th className="py-2 px-2.5 border-r border-zinc-300">Investigation / Package Name</th>
                    {billSettings.showSampleColumn && <th className="py-2 px-2.5 w-28 border-r border-zinc-300">Sample Type</th>}
                    {(billSettings.showBarcode || billSettings.showVialBarcode) && (
                      <th className="py-2 px-2 w-36 text-center border-r border-zinc-300">Specimen Barcode</th>
                    )}
                    <th className="py-2 px-2.5 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-[11px]">
                  {groupedTests.map((group, idx) => {
                    const testObj = group.mainTest;
                    const hasSub = billSettings.showPackageTests && group.subTests.length > 0;
                    const sampleTypeLabel = resolveSampleType(testObj);
                    const rowBarcode = String((testObj as any).barcode || (testObj as any).vialBarcode || rawVial || "").trim();

                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-zinc-50/50">
                          <td className="py-2 px-2.5 text-center font-mono text-zinc-500 border-r border-zinc-200">{idx + 1}</td>
                          {billSettings.showTestCode && (
                            <td className="py-2 px-2.5 font-mono text-zinc-700 font-semibold border-r border-zinc-200">
                              {testObj.code || testObj.testCode || testObj.test_code || testObj.custom_id || `T-${(testObj.name || "").substring(0, 3).toUpperCase()}`}
                            </td>
                          )}
                          <td className="py-2 px-2.5 font-bold text-zinc-900 border-r border-zinc-200">
                            <span>{testObj.name}</span>
                            {testObj.category && (
                              <span className="text-[9.5px] font-normal text-zinc-500 ml-2">({testObj.category})</span>
                            )}
                          </td>
                          {billSettings.showSampleColumn && (
                            <td className="py-2 px-2.5 text-zinc-700 text-[10.5px] border-r border-zinc-200">
                              <span className="font-semibold px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] inline-block">
                                {sampleTypeLabel}
                              </span>
                            </td>
                          )}
                          {(billSettings.showBarcode || billSettings.showVialBarcode) && (
                            <td className="py-1.5 px-2 text-center border-r border-zinc-200">
                              {rowBarcode ? (
                                <div className="flex flex-col items-center justify-center">
                                  <BarcodeSVG value={rowBarcode} width={0.7} height={14} fontSize={7} />
                                  <span className="text-[7.5px] font-mono font-bold text-zinc-800 tracking-wider">
                                    {rowBarcode}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono font-bold text-zinc-400">
                                  N/A
                                </span>
                              )}
                            </td>
                          )}
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-zinc-900">
                            ₹{Number(testObj.price || 0).toFixed(2)}
                          </td>
                        </tr>

                        {/* Optional Sub-test breakdown for Packages */}
                        {hasSub && (
                          <tr className="bg-zinc-50/70">
                            <td colSpan={(billSettings.showTestCode ? 1 : 0) + (billSettings.showSampleColumn ? 1 : 0) + (billSettings.showBarcode || billSettings.showVialBarcode ? 1 : 0) + 3} className="py-1 px-4 text-[9.5px] text-zinc-600 italic">
                              <span className="font-semibold text-zinc-700 not-italic">Includes: </span>
                              {group.subTests.map(st => st.name).join(", ")}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 4. PAYMENT BREAKDOWN & UPI QR SECTION ── */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start border-t border-b border-zinc-300 py-3 mb-3">
              {/* Left Side: UPI Payment QR & Logistics */}
              <div className="sm:col-span-7 space-y-2">
                {billSettings.upi?.show && (billSettings.upi.qrImageUrl || (billSettings.upi.upiId && balance > 0)) && (
                  <div className="flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg w-fit">
                    {billSettings.upi.qrImageUrl ? (
                      <div
                        className="rounded overflow-hidden bg-white border border-emerald-300 shrink-0 flex items-center justify-center"
                        style={{ width: `${billSettings.upi.qrWidth || 76}px`, height: `${billSettings.upi.qrHeight || 76}px` }}
                      >
                        <img
                          src={billSettings.upi.qrImageUrl}
                          alt="UPI QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <QRCodeSVG
                        value={upiLink}
                        size={billSettings.upi.qrWidth || 72}
                        level="M"
                        includeMargin={false}
                      />
                    )}
                    <div className="text-[10px] text-emerald-900">
                      <span className="font-bold block text-emerald-950 uppercase tracking-wider text-[10.5px]">Scan & Pay via UPI</span>
                      {billSettings.upi.upiId && (
                        <span className="font-mono text-[9px] text-emerald-800 block">UPI: {billSettings.upi.upiId}</span>
                      )}
                      {balance > 0 && (
                        <span className="font-bold text-emerald-900 block mt-0.5">Due Amount: ₹{balance.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-zinc-600 space-y-0.5">
                  {billSettings.showBilledBy && (
                    <p><span className="font-bold text-zinc-800">Billed By:</span> {invoice.billedBy || "Reception / Accounts Desk"}</p>
                  )}
                  {billSettings.showSampleCollectedBy && (
                    <p><span className="font-bold text-zinc-800">Sample Collected By:</span> {invoice.sampleCollectedBy || "Lab Phlebotomist"}</p>
                  )}
                </div>
              </div>

              {/* Right Side: Financial Calculation Table */}
              <div className="sm:col-span-5 space-y-1 text-xs">
                {billSettings.showPaymentBreakdown && (
                  <>
                    <div className="flex justify-between text-zinc-600 py-0.5">
                      <span>Gross Total:</span>
                      <span className="font-mono font-semibold text-zinc-900">₹{((invoice.total || 0) + (invoice.discount || 0)).toFixed(2)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-rose-600 py-0.5">
                        <span>Discount Concession:</span>
                        <span className="font-mono font-semibold">- ₹{invoice.discount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between font-extrabold text-zinc-950 text-sm border-t border-zinc-300 pt-1">
                  <span>Net Payable:</span>
                  <span className="font-mono">₹{(invoice.total || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-bold py-0.5">
                  <span>Paid Amount:</span>
                  <span className="font-mono">₹{effectivePaidAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-extrabold text-zinc-900 border-t border-zinc-300 pt-1">
                  <span>Balance Due:</span>
                  <span className={`font-mono ${balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    ₹{balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. TERMS & CONDITIONS AND SIGNATURES ── */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-2">
            {/* Terms & Conditions */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider mb-1">Terms & Conditions:</p>
              <p className="text-[9px] text-zinc-500 whitespace-pre-line leading-relaxed">
                {billSettings.termsAndConditions}
              </p>
            </div>

            {/* Signatures List */}
            <div className="shrink-0 flex items-center gap-6 text-center">
              {(billSettings.signatures && billSettings.signatures.length > 0
                ? billSettings.signatures
                : [{ id: "def", name: "Authorized Signatory", designation: "Cashier / Staff" }]
              ).map((sig) => (
                <div key={sig.id} className="min-w-[120px]">
                  {sig.imageUrl ? (
                    <div className="h-10 w-24 mx-auto mb-1 flex items-center justify-center">
                      <img src={sig.imageUrl} alt={sig.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-8" />
                  )}
                  <div className="border-t border-zinc-400 pt-1">
                    <p className="text-[10px] font-bold text-zinc-900">{sig.name}</p>
                    <p className="text-[8.5px] text-zinc-500">{sig.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

InvoiceSheet.displayName = "InvoiceSheet";
