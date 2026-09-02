"use client";

import React, { useRef } from "react";
import { Download, Printer, CheckCircle2, Shield, QrCode } from "lucide-react";
import { printInvoiceElement } from "@/lib/print-invoice";
import { QRCodeSVG } from "qrcode.react";

export interface SubscriptionInvoiceData {
  id: string;
  customId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  billingPeriodFrom?: string;
  billingPeriodTo?: string;
  planName: string;
  planDuration?: "1_YEAR" | "6_MONTHS" | string;
  description?: string;
  sacCode?: string;
  baseAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  totalAmount: number;
  status: "PAID" | "PENDING" | string;
  paymentMethod?: string;
  transactionId?: string;
  // Billed To (Customer Lab)
  customer: {
    name: string;
    contactPerson?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    stateCode?: string;
    gstin?: string;
    phone?: string;
    email?: string;
  };
}

// Convert numbers into Indian Currency Words
function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return "Zero Rupees Only";

  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const twoDigits = [
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tensMultiple = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertBelowThousand(num: number): string {
    let str = "";
    if (num >= 100) {
      str += singleDigits[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 10 && num <= 19) {
      str += twoDigits[num - 10] + " ";
    } else if (num >= 20) {
      str += tensMultiple[Math.floor(num / 10)] + " ";
      if (num % 10 > 0) {
        str += singleDigits[num % 10] + " ";
      }
    } else if (num > 0) {
      str += singleDigits[num] + " ";
    }
    return str;
  }

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;

  let result = "";
  if (crore > 0) result += convertBelowThousand(crore) + "Crore ";
  if (lakh > 0) result += convertBelowThousand(lakh) + "Lakh ";
  if (thousand > 0) result += convertBelowThousand(thousand) + "Thousand ";
  if (remainder > 0) result += convertBelowThousand(remainder);

  return `INR ${result.trim()} Only`;
}

export function SubscriptionTaxInvoiceSheet({
  invoice,
  onClose,
}: {
  invoice: SubscriptionInvoiceData;
  onClose?: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  // Determine State Code
  const sellerStateCode = "09"; // Uttar Pradesh
  const customerState = invoice.customer.state || "Uttar Pradesh";
  const isInterState = invoice.customer.state && !invoice.customer.state.toLowerCase().includes("uttar pradesh");

  // Calculations
  const base = invoice.baseAmount || 4999;
  const isGstApplicable = true;
  
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;

  if (isInterState) {
    igstAmt = Math.round(base * 0.18 * 100) / 100;
  } else {
    cgstAmt = Math.round(base * 0.09 * 100) / 100;
    sgstAmt = Math.round(base * 0.09 * 100) / 100;
  }

  const calculatedTotal = base + cgstAmt + sgstAmt + igstAmt;
  const total = invoice.totalAmount || calculatedTotal;
  const totalInWords = numberToWordsINR(total);

  const invNumber = invoice.invoiceNumber || invoice.customId || `CCS/2026-27/${invoice.id.slice(0, 6).toUpperCase()}`;
  const invDateStr = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const handlePrint = () => {
    printInvoiceElement(printRef.current, `Tax_Invoice_${invNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
  };

  return (
    <div className="flex flex-col bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
      {/* ── Top Modal Action Toolbar (Hidden during browser print) ── */}
      <div className="flex items-center justify-between p-4 px-6 bg-slate-900 text-white print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
            GST
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wide flex items-center gap-2">
              <span>Official GST Tax Invoice</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                {invNumber}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">CoCode Studio · Compliant with GST Portal Uploads</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* ── Printable A4 Invoice Sheet (Flipkart / SaaS Style Pure Clean Design) ── */}
      <div className="overflow-x-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
        <div
          ref={printRef}
          className="w-[794px] min-h-[1050px] bg-white text-slate-900 p-10 space-y-6 shadow-sm font-sans text-xs border border-slate-300"
          style={{ boxSizing: "border-box" }}
        >
          {/* 1. Header: Brand Logo & Tax Invoice Title */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <img
                  src="/onepath-logo.png"
                  alt="OnePath Lab"
                  className="h-9 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div>
                  <h1 className="text-xl font-extrabold text-slate-950 tracking-tight leading-none">
                    OnePath Lab
                  </h1>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block mt-0.5">
                    Pathology Laboratory Information System (LIS)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <h2 className="text-lg font-black text-slate-950 tracking-wide uppercase">
                TAX INVOICE
              </h2>
              <span className="inline-block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Original For Recipient
              </span>
            </div>
          </div>

          {/* 2. Top Meta Grid: Seller vs Invoice Details */}
          <div className="grid grid-cols-2 gap-6 border-b border-slate-200 pb-5">
            {/* Service Provider (Sold By) */}
            <div className="space-y-1 text-[11px] leading-relaxed">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                SOLD BY / SERVICE PROVIDER:
              </span>
              <p className="text-sm font-extrabold text-slate-900">CoCode Studio</p>
              <p className="text-slate-600 font-medium">
                <strong className="text-slate-700">Proprietor:</strong> MOH ABUZAR
              </p>
              <p className="text-slate-600">
                House No 213, Residential House, Tanshipur, Near Bilal Masjid,<br />
                Nanhera Buddha Khera Aht, Saharanpur, Uttar Pradesh - 247551
              </p>
              <p className="text-slate-700 font-semibold pt-1">
                GSTIN: <span className="font-mono font-bold text-slate-950">09EAMPA2104K3ZT</span>
              </p>
              <p className="text-slate-600">
                State: <strong className="text-slate-800">Uttar Pradesh (Code: 09)</strong> · Email: billing@cocodestudio.com
              </p>
            </div>

            {/* Invoice & Order Identifiers */}
            <div className="space-y-1.5 text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-950 text-xs">{invNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Invoice Date:</span>
                <span className="font-medium text-slate-900">{invDateStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Place of Supply:</span>
                <span className="font-semibold text-slate-900">
                  {invoice.customer.state || "Uttar Pradesh"} ({isInterState ? "Inter-State" : "09"})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Reverse Charge (RCM):</span>
                <span className="font-medium text-slate-900">No</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Payment Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 stroke-[3]" /> PAID
                </span>
              </div>
            </div>
          </div>

          {/* 3. Billed To (Customer Details) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-[11px]">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                BILLED TO / RECIPIENT:
              </span>
              <p className="text-sm font-bold text-slate-950">
                {invoice.customer.name || "Authorized Pathology Laboratory"}
              </p>
              {invoice.customer.contactPerson && (
                <p className="text-slate-600">
                  Attn: <strong className="text-slate-800">{invoice.customer.contactPerson}</strong>
                </p>
              )}
              <p className="text-slate-600">
                {invoice.customer.address || "Main Diagnostic Center Address"}, {invoice.customer.city || ""}{" "}
                {invoice.customer.state ? `· ${invoice.customer.state}` : ""} {invoice.customer.pincode ? `- ${invoice.customer.pincode}` : ""}
              </p>
              {invoice.customer.phone && (
                <p className="text-slate-600">Phone: {invoice.customer.phone}</p>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                CLIENT TAX & BILLING INFO:
              </span>
              <p className="text-slate-700">
                GSTIN: <span className="font-mono font-bold text-slate-900">{invoice.customer.gstin || "URP (Unregistered Customer)"}</span>
              </p>
              <p className="text-slate-600">
                Category: <strong>Pathology Laboratory Diagnostic Center</strong>
              </p>
              <p className="text-slate-600">
                Payment Mode: <strong className="text-slate-800">{invoice.paymentMethod || "Online (UPI / Razorpay / NetBanking)"}</strong>
              </p>
              {invoice.transactionId && (
                <p className="font-mono text-[10px] text-slate-500">
                  Txn ID: {invoice.transactionId}
                </p>
              )}
            </div>
          </div>

          {/* 4. Itemized GST Line Items Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-300">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Service & Subscription Description</th>
                  <th className="py-2.5 px-3 text-center">SAC Code</th>
                  <th className="py-2.5 px-3 text-center">Qty / Period</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value (₹)</th>
                  <th className="py-2.5 px-3 text-right">GST Rate</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3 text-center font-bold text-slate-500">1</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">
                      {invoice.description || `${invoice.planName} - Pathology LIS Cloud License`}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Includes Multi-department reporting, Automated machine integration, QR verification portal, and 24/7 technical support.
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                    {invoice.sacCode || "998314"}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-800">
                    {invoice.planDuration === "6_MONTHS" ? "6 Months" : "1 Year"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                    {base.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-700">
                    18.00%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                    {total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Tax Breakdown & Calculations Box */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left Col: Amount in Words & QR code */}
            <div className="col-span-7 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  AMOUNT IN WORDS:
                </span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">
                  {totalInWords}
                </p>
              </div>

              {/* GST Tax Breakdown Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-[10.5px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px]">
                    <tr>
                      <th className="py-1.5 px-2.5">Tax Type</th>
                      <th className="py-1.5 px-2.5 text-right">Taxable (₹)</th>
                      <th className="py-1.5 px-2.5 text-right">Rate</th>
                      <th className="py-1.5 px-2.5 text-right">Tax Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                    {isInterState ? (
                      <tr>
                        <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-700">Integrated Tax (IGST)</td>
                        <td className="py-1.5 px-2.5 text-right">{base.toFixed(2)}</td>
                        <td className="py-1.5 px-2.5 text-right font-sans">18%</td>
                        <td className="py-1.5 px-2.5 text-right font-bold">{igstAmt.toFixed(2)}</td>
                      </tr>
                    ) : (
                      <>
                        <tr>
                          <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Central Tax (CGST)</td>
                          <td className="py-1 px-2.5 text-right">{base.toFixed(2)}</td>
                          <td className="py-1 px-2.5 text-right font-sans">9%</td>
                          <td className="py-1 px-2.5 text-right font-bold">{cgstAmt.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">State Tax (SGST)</td>
                          <td className="py-1 px-2.5 text-right">{base.toFixed(2)}</td>
                          <td className="py-1 px-2.5 text-right font-sans">9%</td>
                          <td className="py-1 px-2.5 text-right font-bold">{sgstAmt.toFixed(2)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-slate-50 font-bold font-sans text-[10px] text-slate-900 border-t border-slate-200">
                      <td className="py-1.5 px-2.5">Total Tax:</td>
                      <td colSpan={2} className="py-1.5 px-2.5 text-right"></td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                        ₹{(cgstAmt + sgstAmt + igstAmt).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Col: Grand Total Summary */}
            <div className="col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900">₹{base.toFixed(2)}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9.0%):</span>
                    <span className="font-mono font-semibold text-slate-900">+ ₹{cgstAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9.0%):</span>
                    <span className="font-mono font-semibold text-slate-900">+ ₹{sgstAmt.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (18.0%):</span>
                  <span className="font-mono font-semibold text-slate-900">+ ₹{igstAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline font-bold text-sm text-slate-950">
                <span>Invoice Total:</span>
                <span className="font-mono text-base text-emerald-700">₹{total.toFixed(2)}</span>
              </div>
              <p className="text-[9.5px] text-slate-400 text-right">Inclusive of all applicable GST taxes</p>
            </div>
          </div>

          {/* 6. Signatory & Official Verification Footer */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-2 items-end">
            {/* Left: GST Compliance Note & QR */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <QRCodeSVG
                  value={`https://onepathlab.com/verify-invoice?inv=${invNumber}&gst=09EAMPA2104K3ZT&total=${total}`}
                  size={54}
                  level="M"
                />
              </div>
              <div className="space-y-0.5 text-[10px] text-slate-500 leading-tight">
                <p className="font-bold text-slate-700">Digitally Verified &amp; Signed</p>
                <p>HSN / SAC Code: 998314</p>
                <p>GSTIN: 09EAMPA2104K3ZT (CoCode Studio)</p>
              </div>
            </div>

            {/* Right: Signature of Moh Abuzar */}
            <div className="text-right space-y-1">
              <p className="text-[11px] font-extrabold text-slate-900 tracking-wide">
                For CoCode Studio
              </p>
              <div className="flex justify-end py-1">
                <img
                  src="/authorized-sign.png"
                  alt="Moh Abuzar Signature"
                  className="h-12 w-auto object-contain max-w-[150px]"
                />
              </div>
              <div className="w-48 ml-auto border-t border-slate-900 pt-1">
                <p className="text-xs font-black text-slate-950">MOH ABUZAR</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>

          {/* 7. Bottom Legal Notice */}
          <div className="pt-3 border-t border-slate-200 text-center text-[9.5px] text-slate-400">
            <p>
              This is a legally valid computer-generated Tax Invoice issued in accordance with Section 31 of the CGST Act, 2017.
            </p>
            <p className="mt-0.5">
              CoCode Studio · Registered Office: Saharanpur, UP 247551 · Support: +91 90457 57272 · support@onepathlab.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
