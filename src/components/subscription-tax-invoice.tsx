"use client";

import React, { useRef } from "react";
import { Download, Printer } from "lucide-react";
import { printInvoiceElement } from "@/lib/print-invoice";
import { QRCodeSVG } from "qrcode.react";

export interface SubscriptionInvoiceData {
  id: string;
  customId?: string;
  invoiceNumber?: string;
  orderId?: string;
  invoiceDate?: string;
  orderDate?: string;
  planName: string;
  planDuration?: "1_YEAR" | "6_MONTHS" | string;
  description?: string;
  sacCode?: string;
  baseAmount: number;
  discount?: number;
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
  const isInterState =
    invoice.customer.state &&
    !invoice.customer.state.toLowerCase().includes("uttar pradesh") &&
    !invoice.customer.state.toLowerCase().includes("up");

  // Pricing calculations
  const base = invoice.baseAmount || 4999.0;
  const discount = invoice.discount || 0.0;
  const taxable = base - discount;

  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;

  if (isInterState) {
    igstAmt = Math.round(taxable * 0.18 * 100) / 100;
  } else {
    cgstAmt = Math.round(taxable * 0.09 * 100) / 100;
    sgstAmt = Math.round(taxable * 0.09 * 100) / 100;
  }

  const calculatedTotal = taxable + cgstAmt + sgstAmt + igstAmt;
  const total = invoice.totalAmount || calculatedTotal;

  // Invoice & Order Identifiers (Flipkart Exact Styling)
  const rawId = invoice.customId || invoice.id.replace(/[^0-9]/g, "").slice(0, 10) || "224210950120";
  const orderId = invoice.orderId || `OD${rawId.padStart(18, "0")}`;
  const invNumber = invoice.invoiceNumber || `FAH4X4${rawId.slice(0, 8)}000${rawId.slice(-3)}`;

  // Formatting Dates (e.g. 19-02-2026, 12:34 PM)
  const dateObj = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();
  const formattedDate = !isNaN(dateObj.getTime())
    ? `${String(dateObj.getDate()).padStart(2, "0")}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
    : "19-02-2026, 12:34 PM";

  const handlePrint = () => {
    printInvoiceElement(printRef.current, `Tax_Invoice_${orderId}`);
  };

  const qrData = `TAX INVOICE | Order ID: ${orderId} | Inv No: ${invNumber} | Date: ${formattedDate} | Seller GSTIN: 09EAMPA2104K3ZT | Total: INR ${total.toFixed(2)}`;

  return (
    <div className="flex flex-col bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
      {/* ── Top Modal Action Toolbar (Hidden on print) ── */}
      <div className="flex items-center justify-between p-3.5 px-6 bg-slate-900 text-white print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            ₹
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wide flex items-center gap-2">
              <span>Flipkart Standard Tax Invoice</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {orderId}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">GST Portal &amp; Income Tax Compliant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 text-blue-400" />
            <span>Print Invoice</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* ── Printable Flipkart Tax Invoice Sheet ── */}
      <div className="overflow-x-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
        <div
          ref={printRef}
          className="flipkart-invoice-sheet w-[800px] min-h-[1050px] bg-white text-black p-8 sm:p-10 font-sans text-[10px] leading-[1.35] border border-slate-300"
          style={{ boxSizing: "border-box", color: "#000000", fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {/* ================= 1. HEADER SECTION (Flipkart Exact Header) ================= */}
          <div className="flex justify-between items-start pb-4">
            {/* Left: Tax Invoice Title & Metadata */}
            <div className="flex-1 pr-4">
              <h1 className="text-base font-bold text-black tracking-tight mb-2">
                Tax Invoice
              </h1>

              <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[9.5px]">
                <div>
                  <span className="font-semibold">Order id: </span>
                  <span className="font-bold">{orderId}</span>
                </div>
                <div>
                  <span className="font-semibold">Invoice No: </span>
                  <span className="font-bold">{invNumber}</span>
                </div>
                <div>
                  <span className="font-semibold">GSTIN: </span>
                  <span className="font-bold">09EAMPA2104K3ZT</span>
                </div>

                <div>
                  <span className="font-semibold">Order Date: </span>
                  <span>{formattedDate}</span>
                </div>
                <div>
                  <span className="font-semibold">Invoice Date: </span>
                  <span>{formattedDate}</span>
                </div>
                <div>
                  <span className="font-semibold">PAN: </span>
                  <span className="font-bold">EAMPA2104K</span>
                </div>
              </div>
            </div>

            {/* Right: Square QR Code */}
            <div className="shrink-0 flex items-center justify-center p-1 border border-black bg-white">
              <QRCodeSVG value={qrData} size={88} level="M" />
            </div>
          </div>

          {/* ================= 2. THREE-COLUMN ADDRESS BLOCK ================= */}
          <div className="grid grid-cols-3 gap-4 border-t border-b border-black py-2.5 my-2 text-[9.5px]">
            {/* Col 1: Sold By */}
            <div>
              <p className="font-bold text-black uppercase mb-0.5">Sold By</p>
              <p className="font-bold">CoCode Studio,</p>
              <p>House No 213, Residential House,</p>
              <p>Tanshipur, Near Bilal Masjid, Nanhera Buddha Khera Aht,</p>
              <p>Nagal Saharanpur, Saharanpur,</p>
              <p>Uttar Pradesh - 247551, IN-UP</p>
              <p className="mt-0.5"><span className="font-semibold">GST:</span> 09EAMPA2104K3ZT</p>
            </div>

            {/* Col 2: Billing Address */}
            <div>
              <p className="font-bold text-black uppercase mb-0.5">Billing Address</p>
              <p className="font-bold">
                {invoice.customer.contactPerson || invoice.customer.name || "Authorized Customer"}
              </p>
              {invoice.customer.name && invoice.customer.contactPerson && (
                <p className="font-semibold">{invoice.customer.name}</p>
              )}
              {invoice.customer.address && <p>{invoice.customer.address}</p>}
              {invoice.customer.city && <p>{invoice.customer.city}</p>}
              <p>{invoice.customer.state || "Uttar Pradesh"}{invoice.customer.pincode ? ` - ${invoice.customer.pincode}` : ""}, IN-{isInterState ? "OS" : "UP"}</p>
              {invoice.customer.gstin && (
                <p className="mt-0.5"><span className="font-semibold">GSTIN:</span> {invoice.customer.gstin}</p>
              )}
              {invoice.customer.phone && (
                <p className="mt-0.5"><span className="font-semibold">Phone:</span> {invoice.customer.phone}</p>
              )}
            </div>

            {/* Col 3: Shipping Address */}
            <div>
              <p className="font-bold text-black uppercase mb-0.5">Shipping Address</p>
              <p className="font-bold">
                {invoice.customer.contactPerson || invoice.customer.name || "Authorized Customer"}
              </p>
              {invoice.customer.name && invoice.customer.contactPerson && (
                <p className="font-semibold">{invoice.customer.name}</p>
              )}
              {invoice.customer.address && <p>{invoice.customer.address}</p>}
              {invoice.customer.city && <p>{invoice.customer.city}</p>}
              <p>{invoice.customer.state || "Uttar Pradesh"}{invoice.customer.pincode ? ` - ${invoice.customer.pincode}` : ""}, IN-{isInterState ? "OS" : "UP"}</p>
              {invoice.customer.phone && (
                <p className="mt-0.5"><span className="font-semibold">Phone:</span> {invoice.customer.phone}</p>
              )}
            </div>
          </div>

          {/* ================= 3. FLIPKART BORDERED TABLE ================= */}
          <div className="my-3">
            <table className="w-full border-collapse border border-black text-[9.5px]">
              <thead>
                <tr className="border-b border-black bg-white font-bold text-center">
                  <th className="border-r border-black p-1.5 text-left w-[32%]">Product</th>
                  <th className="border-r border-black p-1.5 text-left w-[24%]">Description</th>
                  <th className="border-r border-black p-1.5 text-center w-[5%]">Qty</th>
                  <th className="border-r border-black p-1.5 text-right w-[9%]">Gross Amount</th>
                  <th className="border-r border-black p-1.5 text-right w-[7%]">Discount</th>
                  <th className="border-r border-black p-1.5 text-right w-[9%]">Taxable Value</th>
                  {!isInterState ? (
                    <>
                      <th className="border-r border-black p-1.5 text-right w-[7%]">CGST</th>
                      <th className="border-r border-black p-1.5 text-right w-[7%]">SGST/ UTGST</th>
                    </>
                  ) : (
                    <th className="border-r border-black p-1.5 text-right w-[14%]">IGST</th>
                  )}
                  <th className="p-1.5 text-right w-[10%]">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black align-top">
                  <td className="border-r border-black p-2 font-medium">
                    <p className="font-bold text-black">
                      {invoice.planName || "OnePath LIS Platform - 1 Year Subscription Plan"}
                    </p>
                    <p className="text-[8.5px] text-zinc-700 mt-0.5">
                      Includes Unlimited Tests, Machine Integration &amp; Patient QR Reports | SAC: 998314
                    </p>
                  </td>
                  <td className="border-r border-black p-2">
                    <p>
                      HSN/SAC: <span className="font-semibold">{invoice.sacCode || "998314"}</span>
                    </p>
                    {!isInterState ? (
                      <p>CGST: 9% | SGST: 9%</p>
                    ) : (
                      <p>IGST: 18%</p>
                    )}
                  </td>
                  <td className="border-r border-black p-2 text-center font-bold">1</td>
                  <td className="border-r border-black p-2 text-right">{base.toFixed(2)}</td>
                  <td className="border-r border-black p-2 text-right">{discount.toFixed(2)}</td>
                  <td className="border-r border-black p-2 text-right">{taxable.toFixed(2)}</td>
                  {!isInterState ? (
                    <>
                      <td className="border-r border-black p-2 text-right">{cgstAmt.toFixed(2)}</td>
                      <td className="border-r border-black p-2 text-right">{sgstAmt.toFixed(2)}</td>
                    </>
                  ) : (
                    <td className="border-r border-black p-2 text-right">{igstAmt.toFixed(2)}</td>
                  )}
                  <td className="p-2 text-right font-bold">{total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Total Summary Strip */}
            <div className="border border-t-0 border-black p-1.5 px-3 flex justify-between items-center text-[10px] font-bold">
              <div>
                <span>TOTAL QTY: 1</span>
              </div>
              <div className="text-right">
                <span>TOTAL PRICE: {total.toFixed(2)}</span>
                <p className="text-[8.5px] font-normal text-zinc-600">All values are in INR</p>
              </div>
            </div>
          </div>

          {/* ================= 4. SELLER REGISTERED ADDRESS & DECLARATION ================= */}
          <div className="text-[9px] leading-tight space-y-1 my-3">
            <p>
              <span className="font-bold">Seller Registered Address: </span>
              CoCode Studio, House No 213, Residential House, Tanshipur, Near Bilal Masjid, Nanhera Buddha Khera Aht, Saharanpur, Uttar Pradesh - 247551.
            </p>
            <p>
              <span className="font-bold">Declaration: </span>
              The goods/services sold are intended for end user business consumption and not for resale.
            </p>
          </div>

          {/* ================= 5. FOOTER & AUTHORIZED SIGNATURE (Flipkart Exact Layout) ================= */}
          <div className="pt-8 grid grid-cols-3 items-end">
            {/* Left: E. & O.E. */}
            <div className="text-[9.5px] font-bold">
              E. &amp; O.E.
            </div>

            {/* Center: Ordered Through OnePath Lab */}
            <div className="text-center">
              <p className="text-[9px] text-zinc-600">Ordered Through</p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <img
                  src="/onepath-logo.png"
                  alt="OnePath Lab"
                  className="h-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="font-extrabold text-[11px] tracking-tight">OnePath Lab</span>
              </div>
            </div>

            {/* Right: Signature Box & Authorized Signatory */}
            <div className="text-right flex flex-col items-end">
              <div className="border border-slate-300 w-28 h-14 p-1 flex items-center justify-center bg-white">
                <img
                  src="/authorized-sign.png"
                  alt="Moh Abuzar Signature"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-1 text-center w-28">
                <p className="font-bold text-[10px] text-black">CoCode Studio</p>
                <p className="text-[8.5px] text-zinc-600">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
