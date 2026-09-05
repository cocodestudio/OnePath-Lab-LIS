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

export const InvoiceSheet = React.forwardRef<
  HTMLDivElement,
  { invoice: InvoiceData; settings?: BillLayoutSettings }
>(({ invoice, settings: propSettings }, ref) => {
  const lab = (invoice.lab || {}) as any;
  const billSettings = propSettings || normalizeBillSettings(lab.bill_settings || lab.billSettings);
  const patient = (invoice.patient || {}) as any;

  const labLogo = lab.logoUrl || lab.logo_url || lab.logo || null;
  const labName = lab.name || lab.centre_name || lab.centreName || "OnePath Pathology Laboratory";
  const labAddress = [lab.address, lab.city, lab.state, lab.pincode].filter(Boolean).join(", ") || lab.address || "Medical Diagnostic Center";
  const labPhone = lab.phone || "";
  const labEmail = lab.email || "";
  const labGstin = billSettings.gst.number || lab.gstin || "";

  const patientCustomId = patient.customId || patient.custom_id || patient.customID || (patient.id ? `PID-${String(patient.id).substring(0, 6).toUpperCase()}` : "—");
  const patientName = patient.name || patient.patient_name || "—";
  const patientAge = patient.age !== undefined && patient.age !== null ? patient.age : "—";
  const patientGender = patient.gender || "—";
  const patientDoctor = patient.refDoctor || patient.ref_doctor || "Self";
  const patientPhone = patient.phone || "—";
  const patientAddress = patient.address || "—";

  const balance = Math.max(0, (invoice.total || 0) + (invoice.discount || 0) - (invoice.paidAmount || 0));
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

  const allBillFieldsMap: Record<string, { label: string; value: React.ReactNode }> = {
    "Bill ID": { label: "Bill / Inv No:", value: <span className="font-mono font-bold text-black">{invoice.customId || "—"}</span> },
    "Day wise ID": { label: "Day ID:", value: <span className="font-mono font-semibold">{invoice.dayWiseId || "—"}</span> },
    "Bill Date": { label: "Date & Time:", value: <span>{billDateStr}</span> },
    "Patient ID": { label: "Patient ID (PID):", value: <span className="font-mono font-bold text-black">{patientCustomId}</span> },
    "Name": { label: "Patient Name:", value: <span className="font-bold text-black uppercase">{patientName}</span> },
    "Age/Gender": { label: "Age / Gender:", value: <span>{patientAge} Y / {patientGender}</span> },
    "Owner Name": { label: "Owner Name:", value: <span>{patient.ownerName || "—"}</span> },
    "Contact No.": { label: "Contact No:", value: <span className="font-mono">{patientPhone}</span> },
    "Aadhaar no.": { label: "Aadhaar No:", value: <span className="font-mono">{patient.aadhaarNo || "—"}</span> },
    "Insurance no.": { label: "Insurance No:", value: <span className="font-mono">{patient.insuranceNo || "—"}</span> },
    "Address": { label: "Address:", value: <span className="truncate">{patientAddress}</span> },
    "HFR ID": { label: "HFR ID:", value: <span className="font-mono">{patient.hfrId || "—"}</span> },
    "Pincode": { label: "Pincode:", value: <span>{lab.pincode || patient.pincode || "—"}</span> },
    "District": { label: "District:", value: <span>{lab.district || lab.city || patient.district || "—"}</span> },
    "Town": { label: "Town/City:", value: <span>{lab.city || patient.city || "—"}</span> },
    "Referred By": { label: "Referred By:", value: <span className="font-medium text-black">Dr. {patientDoctor}</span> },
    "Second Referral": { label: "2nd Referral:", value: <span>{patient.secondReferral || "—"}</span> },
    "Corporate Name": { label: "Corporate:", value: <span>{patient.corporateName || "—"}</span> },
    "GSTIN": { label: "Lab GSTIN:", value: <span className="font-mono font-semibold">{labGstin || "—"}</span> },
    "Payment Mode": { label: "Payment Mode:", value: <span className="font-semibold uppercase">{invoice.paymentMode || "CASH / UPI"}</span> },
    "Collection Center": { label: "Center:", value: <span>{invoice.collectionCenter || "Main Lab"}</span> },
  };

  const activeFields: { label: string; value: React.ReactNode }[] = [];
  (billSettings.fieldOrdering || []).forEach(key => {
    if (allBillFieldsMap[key]) {
      activeFields.push(allBillFieldsMap[key]);
    }
  });

  const upiLink = billSettings.upi.upiId
    ? `upi://pay?pa=${encodeURIComponent(billSettings.upi.upiId)}&pn=${encodeURIComponent(labName)}&am=${balance.toFixed(2)}&cu=INR`
    : "";

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
                min-height: auto !important;
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
        className={`bg-white text-black mx-auto relative invoice-print-sheet shadow-xs ${
          isA5 ? "w-[559px] min-h-[794px]" : "w-[794px] min-h-[1123px]"
        } print:max-w-none print:w-full print:min-h-0`}
        style={{
          boxSizing: "border-box",
          fontFamily: 'Arial, "Segoe UI", Roboto, sans-serif',
          paddingLeft: `${billSettings.margins.left || 20}px`,
          paddingRight: `${billSettings.margins.right || 20}px`,
          paddingTop: "16px",
          paddingBottom: "16px",
        }}
      >
      {/* ── 1. HEADER SECTION (BANNER OR TEXT BRANDING) ── */}
      {billSettings.headerImage ? (
        <div 
          className="w-full mb-3 rounded overflow-hidden flex items-center justify-center bg-zinc-50 border border-zinc-200"
          style={{ height: `${billSettings.headerHeight || 100}px` }}
        >
          <img
            src={billSettings.headerImage}
            alt="Bill Header"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-3 mb-3">
          <div className="flex items-center gap-3">
            {labLogo && (
              <div className="relative w-14 h-14 rounded border border-zinc-200 overflow-hidden bg-white shrink-0">
                <img src={labLogo} alt="Lab Logo" className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">{labName}</h1>
              <p className="text-[11px] text-zinc-700 leading-tight mt-0.5">{labAddress}</p>
              <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono mt-0.5">
                {labPhone && <span>Ph: {labPhone}</span>}
                {labEmail && <span>Email: {labEmail}</span>}
                {billSettings.gst.show && labGstin && (
                  <span className="font-bold text-zinc-900">GSTIN: {labGstin}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <h2 className="text-sm font-extrabold text-zinc-900 tracking-wider uppercase bg-zinc-100 px-2.5 py-1 rounded border border-zinc-300 inline-block">
              {billSettings.heading || "Invoice-cum-receipt"}
            </h2>
            <div className="text-[10px] text-zinc-700 mt-1 space-y-0.5">
              <p><span className="font-bold text-zinc-900">Bill No:</span> <span className="font-mono font-bold">{invoice.customId}</span></p>
              <p><span className="font-semibold text-zinc-600">Status:</span> <span className={`font-bold ${invoice.status === "PAID" ? "text-emerald-700" : invoice.status === "PARTIAL" ? "text-amber-700" : "text-rose-700"}`}>{invoice.status}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PATIENT / BILL DETAILS BOX ── */}
      <div 
        className="border border-zinc-300 rounded p-2 bg-zinc-50/50 text-[11px] leading-[1.35] text-zinc-900"
        style={{ marginBottom: `${billSettings.margins.patientDetailsBottomSpacing || 8}px` }}
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

            {/* Barcode under left details */}
            {billSettings.showBarcode && (
              <div className="mt-1.5 flex items-center gap-2">
                <BarcodeSVG value={invoice.customId || "INV-001"} width={1.0} height={16} fontSize={7.5} />
                <span className="text-[7.5px] font-mono text-zinc-400 font-semibold tracking-wider">ACCREDITED INVOICE</span>
              </div>
            )}
          </div>

          {/* QR Code on Right (if enabled) */}
          {billSettings.showQrCode && (
            <div className="shrink-0 flex flex-col items-center justify-center border-l border-zinc-200 pl-2.5 min-w-[65px]">
              <div className="bg-white p-0.5 rounded border border-zinc-300 shadow-2xs">
                <QRCodeSVG
                  value={invoice.reportId ? `https://lis.onepathlab.com/r/${invoice.reportId}` : `https://lis.onepathlab.com`}
                  size={46}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <span className="text-[6.5px] font-bold text-zinc-600 uppercase tracking-tighter block mt-0.5">Report QR</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. TEST INVESTIGATION CHARGES TABLE ── */}
      <div className="mb-4">
        <table className="w-full text-left border-collapse border border-zinc-300">
          <thead>
            <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-extrabold text-zinc-900 uppercase tracking-wider">
              <th className="py-2 px-2.5 w-12 text-center border-r border-zinc-300">#</th>
              {billSettings.showTestCode && <th className="py-2 px-2.5 w-24 border-r border-zinc-300">Code</th>}
              <th className="py-2 px-2.5 border-r border-zinc-300">Investigation / Package Name</th>
              {billSettings.showSampleColumn && <th className="py-2 px-2.5 w-28 border-r border-zinc-300">Sample</th>}
              <th className="py-2 px-2.5 text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-[11px]">
            {groupedTests.map((group, idx) => {
              const testObj = group.mainTest;
              const hasSub = billSettings.showPackageTests && group.subTests.length > 0;

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
                      <td className="py-2 px-2.5 text-zinc-600 text-[10px] border-r border-zinc-200">
                        {testObj.sampleType || "Blood"}
                      </td>
                    )}
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-zinc-900">
                      ₹{Number(testObj.price || 0).toFixed(2)}
                    </td>
                  </tr>

                  {/* Optional Sub-test breakdown for Packages */}
                  {hasSub && (
                    <tr className="bg-zinc-50/70">
                      <td colSpan={billSettings.showTestCode ? (billSettings.showSampleColumn ? 5 : 4) : (billSettings.showSampleColumn ? 4 : 3)} className="py-1 px-4 text-[9.5px] text-zinc-600 italic">
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
          {billSettings.upi.show && (billSettings.upi.qrImageUrl || (billSettings.upi.upiId && balance > 0)) && (
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
              <p><span className="font-bold text-zinc-800">Billed By:</span> {invoice.billedBy || "Reception / Accounts"}</p>
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
            <span className="font-mono">₹{(invoice.paidAmount || 0).toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-extrabold text-zinc-900 border-t border-zinc-300 pt-1">
            <span>Balance Due:</span>
            <span className={`font-mono ${balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              ₹{balance.toFixed(2)}
            </span>
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

      {/* ── 6. FOOTER BANNER GRAPHIC (IF CONFIGURED) ── */}
      {billSettings.footerImage && (
        <div 
          className="w-full mt-4 rounded overflow-hidden flex items-center justify-center bg-zinc-50 border border-zinc-200"
          style={{ height: `${billSettings.footerHeight || 60}px` }}
        >
          <img
            src={billSettings.footerImage}
            alt="Bill Footer"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
    </>
  );
});

InvoiceSheet.displayName = "InvoiceSheet";
