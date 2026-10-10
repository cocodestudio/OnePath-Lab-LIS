"use client";

import QRCode from "qrcode";
import { type SubscriptionInvoiceData } from "@/components/subscription-tax-invoice";

export async function downloadSubscriptionTaxInvoicePdf(invoice: SubscriptionInvoiceData) {
  // 1. Calculations
  const isInterState =
    invoice.customer.state &&
    !invoice.customer.state.toLowerCase().includes("uttar pradesh") &&
    !invoice.customer.state.toLowerCase().includes("up");

  const isSixMonths =
    invoice.planDuration === "6_MONTHS" ||
    (invoice.description || "").toLowerCase().includes("6-month") ||
    (invoice.description || "").toLowerCase().includes("6 month") ||
    invoice.baseAmount === 3999 ||
    invoice.baseAmount === 2499;

  const base = invoice.baseAmount || (isSixMonths ? 3999.0 : 5999.0);
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

  // Order & Invoice Identifiers
  const rawId = invoice.customId || invoice.id.replace(/[^0-9]/g, "").slice(0, 10) || "224210950120";
  const orderId = `OD${rawId.padStart(18, "0")}`;
  const invNumber = invoice.invoiceNumber || `FAH4X4${rawId.slice(0, 8)}000${rawId.slice(-3)}`;

  // If invoiceDate is date-only or 00:00:00, use createdAt to obtain the exact purchase time
  const hasValidTime = (str?: string) => Boolean(str && !str.includes("00:00:00") && !str.endsWith("T00:00:00.000000Z") && !str.endsWith("T00:00:00Z"));
  const rawDateStr = hasValidTime(invoice.invoiceDate)
    ? invoice.invoiceDate
    : (invoice.createdAt || invoice.created_at || invoice.invoiceDate);
  const dateObj = rawDateStr ? new Date(rawDateStr) : new Date();
  const formattedDate = !isNaN(dateObj.getTime())
    ? `${String(dateObj.getDate()).padStart(2, "0")}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`
    : "07-09-2026, 05:42 PM";

  const productTitle = isSixMonths
    ? "OnePathLab LIS Software - 6 Months Semi-Annual License Plan"
    : "OnePathLab LIS Software - 1 Year Annual License Plan";

  const productDescription =
    "Complete Pathology Laboratory Information System (LIS) Software License with Unlimited Diagnostic Tests, Machine Interfacing & QR Patient Reports | SAC: 998314";

  // Clean Scan-Friendly Text for QR Code: strictly the Order ID text
  const qrText = orderId;

  // 2. Generate Ultra-Crisp Base64 PNG QR Code
  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(qrText, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch (e) {
    console.warn("QR code generation error:", e);
  }

  // 3. Load Signature Base64
  let signDataUrl = "/authorized-sign.png";
  try {
    const signRes = await fetch("/authorized-sign.png");
    if (signRes.ok) {
      const blob = await signRes.blob();
      signDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn("Signature loading fallback:", e);
  }

  // 4. Create In-DOM Printable Element
  const container = document.createElement("div");
  container.id = `temp-invoice-pdf-${Date.now()}`;
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "800px";
  container.style.zIndex = "-9999";
  container.style.opacity = "1";
  container.style.pointerEvents = "none";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#000000";
  container.style.fontFamily = "Arial, Helvetica, sans-serif";
  container.style.boxSizing = "border-box";

  container.innerHTML = `
    <div style="width: 800px; min-height: 1050px; background-color: #ffffff; color: #000000; padding: 36px 40px; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.35; box-sizing: border-box;">
      <!-- 1. Header Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px;">
        <div style="flex: 1; padding-right: 16px;">
          <h1 style="font-size: 16px; font-weight: bold; color: #000000; margin: 0 0 8px 0;">Tax Invoice</h1>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; font-size: 9.5px;">
            <div><span style="font-weight: 600;">Order id: </span><span style="font-weight: bold;">${orderId}</span></div>
            <div><span style="font-weight: 600;">Invoice No: </span><span style="font-weight: bold;">${invNumber}</span></div>
            <div><span style="font-weight: 600;">GSTIN: </span><span style="font-weight: bold;">09EAMPA2104K3ZT</span></div>
            <div><span style="font-weight: 600;">Order Date: </span><span>${formattedDate}</span></div>
            <div><span style="font-weight: 600;">Invoice Date: </span><span>${formattedDate}</span></div>
            <div><span style="font-weight: 600;">PAN: </span><span style="font-weight: bold;">EAMPA2104K</span></div>
          </div>
        </div>
        <div style="flex-shrink: 0; padding: 3px; border: 1px solid #000000; background: #ffffff;">
          ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 84px; height: 84px; display: block;" alt="QR" />` : `<div style="width: 84px; height: 84px;"></div>`}
        </div>
      </div>

      <!-- 2. Address 3-Column Block (Dynamic real user details) -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; border-top: 1px solid #000000; border-bottom: 1px solid #000000; padding: 10px 0; margin: 8px 0; font-size: 9.5px;">
        <div>
          <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 2px 0;">Sold By</p>
          <p style="font-weight: bold; margin: 0;">CoCode Studio,</p>
          <p style="margin: 0;">House No 213, Residential House,</p>
          <p style="margin: 0;">Tanshipur, Near Bilal Masjid, Nanhera Buddha Khera Aht,</p>
          <p style="margin: 0;">Nagal Saharanpur, Saharanpur,</p>
          <p style="margin: 0;">Uttar Pradesh - 247551, IN-UP</p>
          <p style="margin: 2px 0 0 0;"><span style="font-weight: 600;">GST:</span> 09EAMPA2104K3ZT</p>
        </div>

        <div>
          <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 2px 0;">Billing Address</p>
          <p style="font-weight: bold; margin: 0;">${invoice.customer.contactPerson || invoice.customer.name || "Authorized Customer"}</p>
          ${invoice.customer.name && invoice.customer.contactPerson ? `<p style="font-weight: 600; margin: 0;">${invoice.customer.name}</p>` : ""}
          ${invoice.customer.address ? `<p style="margin: 0;">${invoice.customer.address}</p>` : ""}
          ${invoice.customer.city ? `<p style="margin: 0;">${invoice.customer.city}</p>` : ""}
          <p style="margin: 0;">${invoice.customer.state || "Uttar Pradesh"}${invoice.customer.pincode ? ` - ${invoice.customer.pincode}` : ""}, IN-${isInterState ? "OS" : "UP"}</p>
          ${invoice.customer.gstin ? `<p style="margin: 2px 0 0 0;"><span style="font-weight: 600;">GSTIN:</span> ${invoice.customer.gstin}</p>` : ""}
          ${invoice.customer.phone ? `<p style="margin: 2px 0 0 0;"><span style="font-weight: 600;">Phone:</span> ${invoice.customer.phone}</p>` : ""}
        </div>

        <div>
          <p style="font-weight: bold; text-transform: uppercase; margin: 0 0 2px 0;">Shipping Address</p>
          <p style="font-weight: bold; margin: 0;">${invoice.customer.contactPerson || invoice.customer.name || "Authorized Customer"}</p>
          ${invoice.customer.name && invoice.customer.contactPerson ? `<p style="font-weight: 600; margin: 0;">${invoice.customer.name}</p>` : ""}
          ${invoice.customer.address ? `<p style="margin: 0;">${invoice.customer.address}</p>` : ""}
          ${invoice.customer.city ? `<p style="margin: 0;">${invoice.customer.city}</p>` : ""}
          <p style="margin: 0;">${invoice.customer.state || "Uttar Pradesh"}${invoice.customer.pincode ? ` - ${invoice.customer.pincode}` : ""}, IN-${isInterState ? "OS" : "UP"}</p>
          ${invoice.customer.phone ? `<p style="margin: 2px 0 0 0;"><span style="font-weight: 600;">Phone:</span> ${invoice.customer.phone}</p>` : ""}
        </div>
      </div>

      <!-- 3. Flipkart Table -->
      <div style="margin: 12px 0;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 9.5px;">
          <thead>
            <tr style="border-bottom: 1px solid #000000; background-color: #ffffff; font-weight: bold; text-align: center;">
              <th style="border-right: 1px solid #000000; padding: 6px; text-align: left; width: 32%;">Product</th>
              <th style="border-right: 1px solid #000000; padding: 6px; text-align: left; width: 24%;">Description</th>
              <th style="border-right: 1px solid #000000; padding: 6px; text-align: center; width: 5%;">Qty</th>
              <th style="border-right: 1px solid #000000; padding: 6px; text-align: right; width: 9%;">Gross Amount</th>
              <th style="border-right: 1px solid #000000; padding: 6px; text-align: right; width: 7%;">Discount</th>
              <th style="border-right: 1px solid #000000; padding: 6px; text-align: right; width: 9%;">Taxable Value</th>
              ${!isInterState ? `
                <th style="border-right: 1px solid #000000; padding: 6px; text-align: right; width: 7%;">CGST</th>
                <th style="border-right: 1px solid #000000; padding: 6px; text-align: right; width: 7%;">SGST/ UTGST</th>
              ` : `
                <th style="border-right: 1px solid #000000; padding: 6px; text-align: right; width: 14%;">IGST</th>
              `}
              <th style="padding: 6px; text-align: right; width: 10%;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #000000; vertical-align: top;">
              <td style="border-right: 1px solid #000000; padding: 8px;">
                <p style="font-weight: bold; color: #000000; margin: 0;">${productTitle}</p>
                <p style="font-size: 8.5px; color: #444444; margin: 2px 0 0 0;">${productDescription}</p>
              </td>
              <td style="border-right: 1px solid #000000; padding: 8px;">
                <p style="margin: 0;">HSN/SAC: <span style="font-weight: 600;">${invoice.sacCode || "998314"}</span></p>
                ${!isInterState ? `<p style="margin: 2px 0 0 0;">CGST: 9% | SGST: 9%</p>` : `<p style="margin: 2px 0 0 0;">IGST: 18%</p>`}
              </td>
              <td style="border-right: 1px solid #000000; padding: 8px; text-align: center; font-weight: bold;">1</td>
              <td style="border-right: 1px solid #000000; padding: 8px; text-align: right;">${base.toFixed(2)}</td>
              <td style="border-right: 1px solid #000000; padding: 8px; text-align: right;">${discount.toFixed(2)}</td>
              <td style="border-right: 1px solid #000000; padding: 8px; text-align: right;">${taxable.toFixed(2)}</td>
              ${!isInterState ? `
                <td style="border-right: 1px solid #000000; padding: 8px; text-align: right;">${cgstAmt.toFixed(2)}</td>
                <td style="border-right: 1px solid #000000; padding: 8px; text-align: right;">${sgstAmt.toFixed(2)}</td>
              ` : `
                <td style="border-right: 1px solid #000000; padding: 8px; text-align: right;">${igstAmt.toFixed(2)}</td>
              `}
              <td style="padding: 8px; text-align: right; font-weight: bold;">${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Total Strip -->
        <div style="border: 1px solid #000000; border-top: none; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: bold;">
          <div><span>TOTAL QTY: 1</span></div>
          <div style="text-align: right;">
            <span>TOTAL PRICE: ${total.toFixed(2)}</span>
            <p style="font-size: 8.5px; font-weight: normal; color: #555555; margin: 1px 0 0 0;">All values are in INR</p>
          </div>
        </div>
      </div>

      <!-- 4. Declaration -->
      <div style="font-size: 9px; line-height: 1.3; margin: 12px 0;">
        <p style="margin: 0 0 2px 0;"><span style="font-weight: bold;">Seller Registered Address: </span>CoCode Studio, House No 213, Residential House, Tanshipur, Near Bilal Masjid, Nanhera Buddha Khera Aht, Saharanpur, Uttar Pradesh - 247551.</p>
        <p style="margin: 0;"><span style="font-weight: bold;">Declaration: </span>The goods/services sold are intended for end user business consumption and not for resale.</p>
      </div>

      <!-- 5. Footer & Signature -->
      <div style="padding-top: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 9.5px; font-weight: bold;">E. & O.E.</div>

        <div style="text-align: center;">
          <p style="font-size: 9px; color: #555555; margin: 0 0 2px 0;">Ordered Through</p>
          <span style="font-weight: 800; font-size: 11px;">OnePath Lab</span>
        </div>

        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
          <div style="border: 1px solid #d1d5db; width: 112px; height: 56px; padding: 4px; display: flex; align-items: center; justify-content: center; background: #ffffff;">
            <img src="${signDataUrl}" style="max-height: 100%; max-width: 100%; object-fit: contain; display: block;" alt="Signature" />
          </div>
          <div style="margin-top: 4px; text-align: center; width: 112px;">
            <p style="font-weight: bold; font-size: 10px; color: #000000; margin: 0;">CoCode Studio</p>
            <p style="font-size: 8.5px; color: #555555; margin: 0;">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for images to load
    const images = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise((res) => {
            if (img.complete) res(true);
            else {
              img.onload = () => res(true);
              img.onerror = () => res(true);
            }
          })
      )
    );

    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 800,
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.96);
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    const pdfW = pdf.internal.pageSize.getWidth(); // 595.28 pt
    const pdfH = (canvas.height * pdfW) / canvas.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfW, Math.min(pdfH, pdf.internal.pageSize.getHeight()));
    pdf.save(`Tax_Invoice_${orderId}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    throw err;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
