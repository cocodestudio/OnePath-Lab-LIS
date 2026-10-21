"use client";


export interface DoctorStatementPrintSettings {
  show_patient_name: boolean;
  show_invoice_id: boolean;
  show_patient_age_gender: boolean;
  show_patient_phone: boolean;
  show_tests: boolean;
  show_lab_revenue: boolean;
  show_gross_total: boolean;
  show_discount: boolean;
  show_commission_rate: boolean;
  show_kpi_cards: boolean;
  show_doctor_phone: boolean;
}

export const defaultDoctorStatementPrintSettings: DoctorStatementPrintSettings = {
  show_patient_name: true,
  show_invoice_id: true,
  show_patient_age_gender: true,
  show_patient_phone: true,
  show_tests: true,
  show_lab_revenue: true,
  show_gross_total: true,
  show_discount: true,
  show_commission_rate: true,
  show_kpi_cards: true,
  show_doctor_phone: true,
};

export interface DoctorStatementData {
  doctor: {
    id?: string;
    name: string;
    specialty?: string | null;
    clinic_hospital?: string | null;
    phone?: string | null;
    email?: string | null;
    default_commission_percent?: number;
  };
  period: {
    filter: string;
    start_date?: string | null;
    end_date?: string | null;
  };
  summary: {
    total_patients: number;
    total_bills: number;
    total_gross: number;
    total_discount: number;
    total_net_sales: number;
    total_paid: number;
    total_due: number;
    total_doctor_commission: number;
    total_lab_revenue: number;
  };
  case_type?: string;
  scope?: string;
  statement_title?: string;
  statement_settings?: Partial<DoctorStatementPrintSettings> | null;
  bills: Array<{
    bill_id: string;
    bill_number?: string;
    date: string;
    patient_id?: string;
    patient_code?: string;
    patient_name: string;
    patient_phone?: string;
    patient_age_gender?: string;
    tests: string[] | string;
    gross_total: number;
    discount: number;
    net_amount: number;
    paid_amount: number;
    due_amount: number;
    commission_percent: number;
    doctor_commission: number;
    lab_net_share: number;
    status: string;
  }>;
}

export interface StatementLabInfo {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

/**
 * Format filter code into human-friendly label.
 */
export function formatPeriodLabel(filter: string, startDate?: string | null, endDate?: string | null): string {
  switch (filter) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "last_month":
      return "Last Month";
    case "this_year":
      return "This Year";
    case "custom":
      if (startDate && endDate) {
        return `${startDate} to ${endDate}`;
      }
      return "Custom Period";
    case "all":
    default:
      return "All Time";
  }
}

/**
 * Format a date string/value to show only the date (no time).
 * e.g. "2026-09-25T10:30:00+05:30" → "25 Sep 2026"
 */
function formatDateOnly(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Fallback: strip any time portion from plain strings like "2026-09-25 10:30"
      return dateStr.split(" ")[0].split("T")[0];
    }
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr.split(" ")[0].split("T")[0];
  }
}

/**
 * Get safe file name for PDF.
 */
function getSafeFileName(docName: string, filter: string): string {
  const cleanDoc = (docName || "Doctor").replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${cleanDoc}_Statement_${filter}_${dateStr}.pdf`;
}

/**
 * Retrieve cached or default print settings.
 */
export function getSavedStatementPrintSettings(): DoctorStatementPrintSettings {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("lis_doctor_statement_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...defaultDoctorStatementPrintSettings, ...parsed };
      }
    } catch {}
  }
  return { ...defaultDoctorStatementPrintSettings };
}

/**
 * Save print settings to localStorage cache.
 */
export function saveStatementPrintSettingsToCache(settings: DoctorStatementPrintSettings): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("lis_doctor_statement_settings", JSON.stringify(settings));
    } catch {}
  }
}

/**
 * Download Clean, Simple & Professional Medical PDF Statement
 * Fully respects user print settings (hide/show patient list, tests, invoice ID, lab revenue, etc.)
 * Without signatures, clean modern layout.
 */
export async function downloadDoctorStatementPdf(
  data: DoctorStatementData,
  labInfo?: StatementLabInfo,
  customSettings?: Partial<DoctorStatementPrintSettings>
): Promise<void> {
  const labName = labInfo?.name || "OnePath Diagnostic Laboratory";
  const labTagline = labInfo?.tagline || "Advanced Pathology & Molecular Diagnostics";
  const labAddress = labInfo?.address || "Main Centre, City Health Boulevard";
  const labPhone = labInfo?.phone || "+91 98765 43210";
  const labEmail = labInfo?.email || "contact@onepathlab.com";

  // Merge print settings priority: customSettings > data.statement_settings > localStorage > default
  const cachedSettings = getSavedStatementPrintSettings();
  const settings: DoctorStatementPrintSettings = {
    ...defaultDoctorStatementPrintSettings,
    ...cachedSettings,
    ...(data.statement_settings || {}),
    ...(customSettings || {}),
  };

  const doc = data.doctor;
  const summary = data.summary;
  const periodLabel = formatPeriodLabel(data.period.filter, data.period.start_date, data.period.end_date);
  const nowStr = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const statementId = `DOC-STMT-${Date.now().toString().slice(-6)}`;

  // Multi-page slicing:
  // With signatures removed, Page 1 fits ~11 rows comfortably. Subsequent pages fit ~18 rows.
  const allBills = data.bills;
  const pagesData: Array<{
    pageNumber: number;
    isFirst: boolean;
    isLast: boolean;
    bills: typeof allBills;
    startIndex: number;
  }> = [];

  const PAGE1_ROW_LIMIT = settings.show_kpi_cards ? 12 : 16;
  const SUBSEQUENT_PAGE_ROW_LIMIT = 20;

  if (allBills.length === 0) {
    pagesData.push({ pageNumber: 1, isFirst: true, isLast: true, bills: [], startIndex: 0 });
  } else if (allBills.length <= PAGE1_ROW_LIMIT) {
    pagesData.push({ pageNumber: 1, isFirst: true, isLast: true, bills: allBills, startIndex: 0 });
  } else {
    pagesData.push({
      pageNumber: 1,
      isFirst: true,
      isLast: false,
      bills: allBills.slice(0, PAGE1_ROW_LIMIT),
      startIndex: 0,
    });

    let currentIdx = PAGE1_ROW_LIMIT;
    let pageNum = 2;

    while (currentIdx < allBills.length) {
      const remaining = allBills.length - currentIdx;
      const count = Math.min(SUBSEQUENT_PAGE_ROW_LIMIT, remaining);
      const isLast = currentIdx + count >= allBills.length;
      pagesData.push({
        pageNumber: pageNum,
        isFirst: false,
        isLast,
        bills: allBills.slice(currentIdx, currentIdx + count),
        startIndex: currentIdx,
      });
      currentIdx += count;
      pageNum++;
    }
  }

  const totalPages = pagesData.length;

  // Ensure all web fonts are fully rendered before canvas rasterization
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 400)),
      ]);
    } catch {}
  }

  // Create isolated sandbox BEHIND viewport (negative z-index) identical to Report PDF downloader
  const sandbox = document.createElement("div");
  sandbox.style.setProperty("position", "fixed", "important");
  sandbox.style.setProperty("top", "0px", "important");
  sandbox.style.setProperty("left", "0px", "important");
  sandbox.style.setProperty("width", "794px", "important");
  sandbox.style.setProperty("height", "1123px", "important");
  sandbox.style.setProperty("min-width", "794px", "important");
  sandbox.style.setProperty("min-height", "1123px", "important");
  sandbox.style.setProperty("overflow", "hidden", "important");
  sandbox.style.setProperty("background-color", "#ffffff", "important");
  sandbox.style.setProperty("z-index", "-99999", "important");
  sandbox.style.setProperty("pointer-events", "none", "important");
  sandbox.style.setProperty("opacity", "1", "important");
  sandbox.style.setProperty("margin", "0px", "important");
  sandbox.style.setProperty("padding", "0px", "important");
  sandbox.style.setProperty("border", "none", "important");
  document.body.appendChild(sandbox);

  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  // Standard A4 in millimeters (210 x 297 mm) — exactly like report PDF generator
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Proportional Column Sizing System (strictly 100% width, zero table distortion)
  interface ColDef {
    key: string;
    label: string;
    widthPercent: number;
    align: "left" | "right" | "center";
  }

  const columns: ColDef[] = [
    { key: "index", label: "#", widthPercent: 4, align: "center" },
    { key: "date", label: "Date", widthPercent: 9.5, align: "left" },
  ];
  if (settings.show_invoice_id) {
    columns.push({ key: "invoice", label: "Invoice / ID", widthPercent: 11, align: "left" });
  }
  columns.push({
    key: "patient",
    label: "Patient Details",
    widthPercent: settings.show_tests ? 20 : 28,
    align: "left",
  });
  if (settings.show_tests) {
    columns.push({ key: "tests", label: "Diagnostic Tests", widthPercent: 20, align: "left" });
  }
  if (settings.show_gross_total) {
    columns.push({ key: "gross", label: "Gross (₹)", widthPercent: 8, align: "right" });
  }
  columns.push({ key: "net", label: "Net (₹)", widthPercent: 8.5, align: "right" });
  if (settings.show_commission_rate) {
    columns.push({ key: "rate", label: "Cut %", widthPercent: 5.5, align: "center" });
  }
  columns.push({ key: "doctor_cut", label: "Doctor Cut (₹)", widthPercent: 11, align: "right" });
  if (settings.show_lab_revenue) {
    columns.push({ key: "lab_share", label: "Lab Share (₹)", widthPercent: 10, align: "right" });
  }

  // Normalize column percentages so the sum strictly equals 100%
  const totalW = columns.reduce((acc, c) => acc + c.widthPercent, 0);
  columns.forEach((c) => {
    c.widthPercent = Math.round((c.widthPercent / totalW) * 1000) / 10;
  });
  const sumW = columns.reduce((acc, c) => acc + c.widthPercent, 0);
  if (columns.length > 0) {
    columns[columns.length - 1].widthPercent += Math.round((100 - sumW) * 10) / 10;
  }

  const isOutsource = data.case_type === "outsource";

  try {
    for (let pIdx = 0; pIdx < pagesData.length; pIdx++) {
      const pageInfo = pagesData[pIdx];
      const pageEl = document.createElement("div");
      pageEl.className = "smart-report-a4-page";
      pageEl.style.setProperty("transform", "none", "important");
      pageEl.style.setProperty("-webkit-transform", "none", "important");
      pageEl.style.setProperty("width", "794px", "important");
      pageEl.style.setProperty("height", "1123px", "important");
      pageEl.style.setProperty("min-height", "1123px", "important");
      pageEl.style.setProperty("max-height", "1123px", "important");
      pageEl.style.setProperty("box-sizing", "border-box", "important");
      pageEl.style.setProperty("padding", "32px 36px", "important");
      pageEl.style.setProperty("background-color", "#ffffff", "important");
      pageEl.style.setProperty("color", "#0f172a", "important");
      pageEl.style.setProperty("position", "relative", "important");
      pageEl.style.setProperty("display", "flex", "important");
      pageEl.style.setProperty("flex-direction", "column", "important");
      pageEl.style.setProperty("overflow", "hidden", "important");
      pageEl.style.setProperty("margin", "0px", "important");
      pageEl.style.setProperty("box-shadow", "none", "important");
      pageEl.style.setProperty("font-family", "Arial, 'Helvetica Neue', Helvetica, 'Segoe UI', Roboto, sans-serif", "important");

      let contentHtml = `<div style="flex: 1 1 auto; display: flex; flex-direction: column;">`;

      if (pageInfo.isFirst) {
        // ── Clean & Professional Vector Letterhead ──
        contentHtml += `
          <div style="border-bottom: 2.5px solid ${isOutsource ? "#d97706" : "#0284c7"}; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: ${isOutsource ? "#92400e" : "#0369a1"}; letter-spacing: -0.3px;">${labName}</h1>
              </div>
              <p style="margin: 2px 0 0 0; font-size: 10.5px; font-weight: 600; color: #64748b;">${labTagline}</p>
              <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569;">${labAddress} • Phone: ${labPhone} • Email: ${labEmail}</p>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: ${isOutsource ? "#fef3c7" : "#e0f2fe"}; color: ${isOutsource ? "#92400e" : "#0369a1"}; font-weight: 800; font-size: 9.5px; padding: 3px 9px; border-radius: 6px; border: 1.5px solid ${isOutsource ? "#fde68a" : "#bae6fd"}; text-transform: uppercase; letter-spacing: 0.3px;">
                ${isOutsource ? "Doctor Statement • Outsource Tests" : "Doctor Statement • Main Lab"}
              </div>
              <p style="margin: 4px 0 0 0; font-size: 9px; font-family: monospace; font-weight: 700; color: #0f172a;">${statementId}</p>
              <p style="margin: 1px 0 0 0; font-size: 8.5px; color: #64748b;">Generated: ${nowStr}</p>
            </div>
          </div>

          <!-- Doctor & Period Details Card -->
          <div style="display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 10px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px;">
            <div>
              <p style="margin: 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Referral Clinician</p>
              <h2 style="margin: 2px 0 0 0; font-size: 15px; font-weight: 800; color: #0f172a;">${doc.name}</h2>
              <p style="margin: 1px 0 0 0; font-size: 9.5px; color: #334155;">
                ${doc.specialty || "Referring Clinician"} ${doc.clinic_hospital ? `• ${doc.clinic_hospital}` : ""}
              </p>
              ${settings.show_doctor_phone && doc.phone ? `<p style="margin: 1px 0 0 0; font-size: 9px; font-family: monospace; color: #475569;">Phone: ${doc.phone}</p>` : ""}
            </div>
            <div style="border-left: 1px solid #cbd5e1; padding-left: 10px; display: flex; flex-direction: column; justify-content: center;">
              <p style="margin: 0; font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Statement Period</p>
              <p style="margin: 1px 0 0 0; font-size: 12px; font-weight: 800; color: ${isOutsource ? "#b45309" : "#0284c7"};">${periodLabel}</p>
              <p style="margin: 1px 0 0 0; font-size: 9px; color: #475569;">
                Base Incentive Rate: <strong style="color: #4f46e5;">${doc.default_commission_percent || 0}%</strong>
              </p>
            </div>
          </div>
        `;

        // ── 4 or 3 KPI Summary Cards ──
        if (settings.show_kpi_cards) {
          const cardGridCols = settings.show_lab_revenue ? "repeat(4, 1fr)" : "repeat(3, 1fr)";
          contentHtml += `
            <div style="display: grid; grid-template-columns: ${cardGridCols}; gap: 8px; margin-bottom: 12px;">
              <!-- Card 1: Total Referrals -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 7px; padding: 7px 9px;">
                <p style="margin: 0; font-size: 7.5px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Referrals</p>
                <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #14532d; font-family: monospace;">
                  ${summary.total_patients} <span style="font-size: 9px; font-weight: 600; color: #15803d;">Pts</span>
                </p>
                <p style="margin: 1px 0 0 0; font-size: 8px; color: #166534;">${summary.total_bills} Total Bills</p>
              </div>

              <!-- Card 2: Net Sales -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 7px 9px;">
                <p style="margin: 0; font-size: 7.5px; font-weight: 700; color: #475569; text-transform: uppercase;">Net Billed Sales</p>
                <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #0f172a; font-family: monospace;">
                  ₹${summary.total_net_sales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p style="margin: 1px 0 0 0; font-size: 8px; color: #64748b;">${summary.total_discount > 0 ? `Disc: ₹${summary.total_discount.toFixed(0)}` : "Gross Billed"}</p>
              </div>

              <!-- Card 3: Doctor Commission (Highlight) -->
              <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 7px; padding: 7px 9px;">
                <p style="margin: 0; font-size: 7.5px; font-weight: 800; color: #4338ca; text-transform: uppercase;">Doctor Commission</p>
                <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 900; color: #4338ca; font-family: monospace;">
                  ₹${summary.total_doctor_commission.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p style="margin: 1px 0 0 0; font-size: 8px; color: #4338ca; font-weight: 600;">Net Payout Amount</p>
              </div>

              ${settings.show_lab_revenue ? `
                <!-- Card 4: Lab Margin Share -->
                <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 7px; padding: 7px 9px;">
                  <p style="margin: 0; font-size: 7.5px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Lab Margin Share</p>
                  <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #115e59; font-family: monospace;">
                    ₹${summary.total_lab_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style="margin: 1px 0 0 0; font-size: 8px; color: #0f766e;">Retained Gross</p>
                </div>
              ` : ""}
            </div>
          `;
        }
      } else {
        // Compact Header for continuation pages
        contentHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
            <div>
              <span style="font-size: 11px; font-weight: 800; color: ${isOutsource ? "#92400e" : "#0284c7"};">${labName}</span>
              <span style="font-size: 10px; color: #64748b; margin-left: 8px;">• Doctor Referral Statement (${isOutsource ? "Outsource" : "Main Lab"})</span>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #0f172a;">
              <span>${doc.name}</span>
              <span style="color: #64748b; margin-left: 6px;">(${periodLabel})</span>
            </div>
          </div>
        `;
      }

      // ── Build Dynamic Itemized Table with colgroup for strict vector column freeze ──
      contentHtml += `
        <table style="width: 100% !important; border-collapse: collapse !important; font-size: 8.5px; table-layout: fixed !important; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 10px; background: #ffffff;">
          <colgroup>
            ${columns.map((col) => `<col style="width: ${col.widthPercent}%;" />`).join("")}
          </colgroup>
          <thead>
            <tr style="background: #0f172a; color: #ffffff;">
              ${columns.map((col, idx) => `
                <th style="padding: 7px 6px; text-align: ${col.align}; width: ${col.widthPercent}%; max-width: ${col.widthPercent}%; box-sizing: border-box; font-weight: 700; font-size: 8px; letter-spacing: 0.2px; vertical-align: middle; ${idx < columns.length - 1 ? "border-right: 1px solid #334155;" : ""}">
                  ${col.label}
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
      `;

      if (pageInfo.bills.length === 0) {
        contentHtml += `
          <tr>
            <td colspan="${columns.length}" style="padding: 24px; text-align: center; color: #64748b; font-size: 10px; border: 1px solid #e2e8f0;">
              No referral patient records or diagnostic invoices found for this period.
            </td>
          </tr>
        `;
      } else {
        pageInfo.bills.forEach((b, rIdx) => {
          const actualIdx = pageInfo.startIndex + rIdx + 1;
          const bg = rIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
          const testStr = Array.isArray(b.tests)
            ? b.tests.slice(0, 3).join(", ") + (b.tests.length > 3 ? ` +${b.tests.length - 3}` : "")
            : (b.tests || "Tests");

          const pNameDisplay = settings.show_patient_name ? (b.patient_name || "Patient") : `Patient #${actualIdx}`;
          const pSubDetails: string[] = [];
          if (settings.show_patient_age_gender && b.patient_age_gender) pSubDetails.push(b.patient_age_gender);
          if (settings.show_patient_phone && b.patient_phone) pSubDetails.push(b.patient_phone);

          let cIdx = 0;
          contentHtml += `
            <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
              <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 4px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0; vertical-align: middle;">${actualIdx}</td>
              <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; color: #334155; font-size: 8px; border-right: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatDateOnly(b.date)}</td>
              ${settings.show_invoice_id ? `
                <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; font-family: monospace; font-weight: 700; color: #0284c7; border-right: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${b.bill_number || `INV-${b.bill_id?.slice(0, 6)}`}
                  ${b.patient_code ? `<span style="font-size: 7px; color: #64748b; margin-left: 2px;">(${b.patient_code})</span>` : ""}
                </td>
              ` : ""}
              <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; border-right: 1px solid #e2e8f0; vertical-align: middle;">
                <div style="font-weight: 700; color: #0f172a; font-size: 8.5px; line-height: 1.25; word-break: break-word;">${pNameDisplay}</div>
                ${pSubDetails.length > 0 ? `<div style="font-size: 7.5px; color: #64748b; line-height: 1.2; margin-top: 2px;">${pSubDetails.join(" • ")}</div>` : ""}
              </td>
              ${settings.show_tests ? `
                <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; color: #334155; font-size: 8px; border-right: 1px solid #e2e8f0; vertical-align: middle; word-break: break-word;" title="${testStr}">
                  ${testStr}
                </td>
              ` : ""}
              ${settings.show_gross_total ? `
                <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; text-align: right; color: #64748b; font-family: monospace; font-size: 8px; border-right: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap;">
                  ₹${b.gross_total.toFixed(0)}
                </td>
              ` : ""}
              <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; text-align: right; font-weight: 700; font-family: monospace; color: #0f172a; font-size: 8px; border-right: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap;">
                ₹${b.net_amount.toFixed(2)}
              </td>
              ${settings.show_commission_rate ? `
                <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 3px; text-align: center; border-right: 1px solid #e2e8f0; vertical-align: middle;">
                  <span style="display: inline-block; padding: 1.5px 4px; font-size: 7.5px; font-weight: 700; border-radius: 3px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;">
                    ${b.commission_percent}%
                  </span>
                </td>
              ` : ""}
              <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; text-align: right; font-weight: 800; font-family: monospace; color: #4338ca; font-size: 8px; border-right: 1px solid #e2e8f0; vertical-align: middle; white-space: nowrap;">
                ₹${b.doctor_commission.toFixed(2)}
              </td>
              ${settings.show_lab_revenue ? `
                <td style="width: ${columns[cIdx++].widthPercent}%; max-width: ${columns[cIdx - 1].widthPercent}%; box-sizing: border-box; padding: 6px 6px; text-align: right; font-weight: 700; font-family: monospace; color: #0f766e; font-size: 8px; vertical-align: middle; white-space: nowrap;">
                  ₹${b.lab_net_share.toFixed(2)}
                </td>
              ` : ""}
            </tr>
          `;
        });
      }

      contentHtml += `
          </tbody>
        </table>
      `;

      // ── Last Page: Grand Totals Row ──
      if (pageInfo.isLast) {
        contentHtml += `
          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 7px; padding: 10px 14px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
              Grand Totals (${summary.total_patients} Patients • ${summary.total_bills} Invoices)
            </div>
            <div style="display: flex; gap: 16px; font-family: monospace; font-size: 10.5px;">
              <div>
                <span style="color: #64748b; font-size: 8px; font-weight: 700; text-transform: uppercase;">Net Billed:</span>
                <strong style="color: #0f172a; margin-left: 3px;">₹${summary.total_net_sales.toFixed(2)}</strong>
              </div>
              <div>
                <span style="color: #4338ca; font-size: 8px; font-weight: 700; text-transform: uppercase;">Doctor Cut:</span>
                <strong style="color: #4338ca; margin-left: 3px; font-size: 11px;">₹${summary.total_doctor_commission.toFixed(2)}</strong>
              </div>
              ${settings.show_lab_revenue ? `
                <div>
                  <span style="color: #0f766e; font-size: 8px; font-weight: 700; text-transform: uppercase;">Lab Margin:</span>
                  <strong style="color: #0f766e; margin-left: 3px;">₹${summary.total_lab_revenue.toFixed(2)}</strong>
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Clean Notice Footer -->
          <div style="margin-top: 10px; padding: 6px 10px; background: #fafafa; border: 1px dashed #e2e8f0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; color: #64748b;">
            <span>Confidential Referral Incentive Statement • Computer generated by OnePath Lab LIS.</span>
            <span>All amounts in INR (₹)</span>
          </div>
        `;
      }

      contentHtml += `</div>`; // Close main content container

      // Page numbering footer pinned to bottom of A4 sheet
      contentHtml += `
        <div style="position: absolute; bottom: 24px; left: 36px; right: 36px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8px; color: #64748b;">
          <span>${labName}</span>
          <span>Doctor: <strong>${doc.name}</strong> • ${periodLabel}</span>
          <span>Page <strong>${pageInfo.pageNumber}</strong> of <strong>${totalPages}</strong></span>
        </div>
      `;

      pageEl.innerHTML = contentHtml;
      sandbox.innerHTML = "";
      sandbox.appendChild(pageEl);

      // Brief delay for complete layout paint before rasterization
      await new Promise((r) => setTimeout(r, 20));

      // Fast, 2x integer DPI rasterization strictly using desktop 1200px viewport identical to report engine
      const canvas = await html2canvas(pageEl, {
        scale: 2, // Integer 2x DPI for crisp, razor-sharp 1588x2246 resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        height: 1123,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200, // Forces pure desktop styles, eliminates mobile media query collapse
        windowHeight: 1123,
      });

      // Lossless high-speed PNG data generation
      const imgData = canvas.toDataURL("image/png");
      if (pIdx > 0) pdf.addPage();
      // Exact A4 dimensions in millimeters (210 x 297 mm) with zero margin drift
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      sandbox.removeChild(pageEl);
    }

    // Trigger browser download via native Blob URL identical to report downloader
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = getSafeFileName(doc.name, data.period.filter);
    document.body.appendChild(downloadLink);
    downloadLink.click();

    setTimeout(() => {
      if (downloadLink.parentNode) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobUrl);
    }, 3000);
  } finally {
    if (sandbox.parentNode) {
      document.body.removeChild(sandbox);
    }
  }
}
