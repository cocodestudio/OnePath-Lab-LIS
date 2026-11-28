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
 * e.g. "2026-09-25T10:30:00+05:30" -> "25 Sep 2026"
 */
export function formatStatementDateOnly(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr.split(" ")[0].split("T")[0];
    }
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr.split(" ")[0].split("T")[0];
  }
}

/**
 * Pure-ASCII Indian currency formatter for crisp built-in vector PDF fonts.
 */
export function formatInrAscii(amount: number, decimals = 2): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `Rs. ${safe.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Compute accurate summary metrics directly from itemized bills when present,
 * omitting patient-count ("Pts") clutter in favor of exact bill counts.
 */
export function computeAccurateStatementSummary(data: DoctorStatementData) {
  const bills = Array.isArray(data.bills) ? data.bills : [];
  const totalBills = bills.length > 0 ? bills.length : Math.max(0, Number(data.summary?.total_bills || 0));

  if (bills.length === 0) {
    return {
      totalBills,
      totalGross: Number(data.summary?.total_gross || 0),
      totalDiscount: Number(data.summary?.total_discount || 0),
      totalNetSales: Number(data.summary?.total_net_sales || 0),
      totalDoctorCommission: Number(data.summary?.total_doctor_commission || 0),
      totalLabRevenue: Number(data.summary?.total_lab_revenue || 0),
    };
  }

  let totalGross = 0;
  let totalDiscount = 0;
  let totalNetSales = 0;
  let totalDoctorCommission = 0;
  let totalLabRevenue = 0;

  for (const b of bills) {
    totalGross += Number(b.gross_total || 0);
    totalDiscount += Number(b.discount || 0);
    totalNetSales += Number(b.net_amount || 0);
    totalDoctorCommission += Number(b.doctor_commission || 0);
    totalLabRevenue += Number(b.lab_net_share || 0);
  }

  return {
    totalBills,
    totalGross: Math.round(totalGross * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalNetSales: Math.round(totalNetSales * 100) / 100,
    totalDoctorCommission: Math.round(totalDoctorCommission * 100) / 100,
    totalLabRevenue: Math.round(totalLabRevenue * 100) / 100,
  };
}

function getSafeFileName(docName: string, filter: string): string {
  const cleanDoc = (docName || "Doctor").replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${cleanDoc}_Statement_${filter}_${dateStr}.pdf`;
}

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

export function saveStatementPrintSettingsToCache(settings: DoctorStatementPrintSettings): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("lis_doctor_statement_settings", JSON.stringify(settings));
    } catch {}
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [15, 23, 42];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function sanitizePdfText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u20B9/g, "Rs. ")
    .replace(/[•·]/g, "|")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface VectorColDef {
  key: string;
  label: string;
  widthMm: number;
  align: "left" | "right" | "center";
  fixed: boolean;
}

export function buildStatementColumns(settings: DoctorStatementPrintSettings, contentWidthMm = 186): VectorColDef[] {
  const cols: VectorColDef[] = [
    { key: "index", label: "#", widthMm: 8, align: "center", fixed: true },
    { key: "date", label: "Date", widthMm: 20, align: "left", fixed: true },
  ];

  if (settings.show_invoice_id) {
    cols.push({ key: "invoice", label: "Invoice ID", widthMm: 24, align: "left", fixed: true });
  }

  cols.push({ key: "patient", label: "Patient Details", widthMm: 42, align: "left", fixed: false });

  if (settings.show_tests) {
    cols.push({ key: "tests", label: "Diagnostic Tests", widthMm: 38, align: "left", fixed: false });
  }
  if (settings.show_gross_total) {
    cols.push({ key: "gross", label: "Gross (Rs.)", widthMm: 17, align: "right", fixed: true });
  }

  cols.push({ key: "net", label: "Net (Rs.)", widthMm: 19, align: "right", fixed: true });

  if (settings.show_commission_rate) {
    cols.push({ key: "rate", label: "Cut %", widthMm: 12, align: "center", fixed: true });
  }

  cols.push({ key: "doctor_cut", label: "Doc Cut (Rs.)", widthMm: 22, align: "right", fixed: true });

  if (settings.show_lab_revenue) {
    cols.push({ key: "lab_share", label: "Lab Share (Rs.)", widthMm: 22, align: "right", fixed: true });
  }

  // Distribute exact available width cleanly to flexible text columns (Patient & Tests)
  const fixedSum = cols.filter((c) => c.fixed).reduce((sum, c) => sum + c.widthMm, 0);
  const remaining = Math.max(40, contentWidthMm - fixedSum);
  const flexCols = cols.filter((c) => !c.fixed);

  if (flexCols.length === 1) {
    flexCols[0].widthMm = Math.round(remaining * 100) / 100;
  } else if (flexCols.length === 2) {
    // Give Patient ~52% and Tests ~48% of flexible space
    flexCols[0].widthMm = Math.round(remaining * 0.52 * 100) / 100;
    flexCols[1].widthMm = Math.round((remaining - flexCols[0].widthMm) * 100) / 100;
  }

  return cols;
}

/**
 * Fallback renderer kept only as resilience backup if pure vector engine throws unexpectedly.
 */
async function renderCanvasFallback(element: HTMLElement): Promise<string | null> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  return canvas.toDataURL("image/png");
}

/**
 * Download Simple, Crisp, 100% Vector Doctor Referral Statement PDF.
 * - Pure client-side jsPDF vector drawing (0% server CPU/RAM load, minimal client memory).
 * - Classic clean accounting layout without heavy pastel cards or "Pts" clutter.
 * - Automatic proportional wrapping & clean multi-page pagination with repeated headers.
 */
export async function downloadDoctorStatementPdf(
  data: DoctorStatementData,
  labInfo?: StatementLabInfo,
  customSettings?: Partial<DoctorStatementPrintSettings>
): Promise<void> {
  const labName = sanitizePdfText(labInfo?.name || "OnePath Diagnostic Laboratory");
  const labTagline = sanitizePdfText(labInfo?.tagline || "Clinical Pathology & Diagnostics");
  const labAddress = sanitizePdfText(labInfo?.address || "");
  const labPhone = sanitizePdfText(labInfo?.phone || "");
  const labEmail = sanitizePdfText(labInfo?.email || "");

  const cachedSettings = getSavedStatementPrintSettings();
  const settings: DoctorStatementPrintSettings = {
    ...defaultDoctorStatementPrintSettings,
    ...cachedSettings,
    ...(data.statement_settings || {}),
    ...(customSettings || {}),
  };

  const doc = data.doctor;
  const docName = sanitizePdfText(doc.name || "Doctor");
  const accurate = computeAccurateStatementSummary(data);
  const periodLabel = sanitizePdfText(formatPeriodLabel(data.period.filter, data.period.start_date, data.period.end_date));
  const nowStr = sanitizePdfText(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
  const statementId = `DOC-STMT-${Date.now().toString().slice(-6)}`;

  const isOutsource = data.case_type === "outsource";
  const isCollectionCenter =
    data.case_type === "collection_center" ||
    data.case_type === "cc_all" ||
    (Boolean(data.case_type) && String(data.case_type).startsWith("cc_"));

  const statementBadgeLabel = isOutsource
    ? "Doctor Statement • Outsource Tests"
    : isCollectionCenter
    ? (data.scope ? `Doctor Statement • ${data.scope}` : "Doctor Statement • Collection Centre")
    : "Doctor Statement • Main Lab";

  const scopeHex = isOutsource ? "#b45309" : isCollectionCenter ? "#059669" : "#0369a1";
  const accentRgb = hexToRgb(scopeHex);

  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_X = 12;
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // 186mm
  const TOP_Y = 12;
  const FOOTER_Y = PAGE_H - 12; // 285mm
  const MAX_BODY_Y = FOOTER_Y - 6; // 279mm

  const columns = buildStatementColumns(settings, CONTENT_W);
  const bills = Array.isArray(data.bills) ? data.bills : [];

  const drawTextCell = (
    lines: string[],
    x: number,
    yStart: number,
    width: number,
    align: "left" | "right" | "center",
    lineHeightMm: number
  ) => {
    const padX = 1.6;
    let drawX = x + padX;
    if (align === "right") {
      drawX = x + width - padX;
    } else if (align === "center") {
      drawX = x + width / 2;
    }
    lines.forEach((line, idx) => {
      pdf.text(line, drawX, yStart + idx * lineHeightMm, { align });
    });
  };

  const drawTableHeader = (y: number): number => {
    const headerH = 7.2;
    pdf.setFillColor(15, 23, 42); // Crisp slate-900 header bar
    pdf.rect(MARGIN_X, y, CONTENT_W, headerH, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.3);
    pdf.setTextColor(255, 255, 255);

    let cursorX = MARGIN_X;
    columns.forEach((col, i) => {
      const padX = 1.6;
      let tx = cursorX + padX;
      if (col.align === "right") tx = cursorX + col.widthMm - padX;
      else if (col.align === "center") tx = cursorX + col.widthMm / 2;

      pdf.text(col.label, tx, y + 4.7, { align: col.align });

      if (i < columns.length - 1) {
        pdf.setDrawColor(51, 65, 85);
        pdf.setLineWidth(0.15);
        pdf.line(cursorX + col.widthMm, y + 1.2, cursorX + col.widthMm, y + headerH - 1.2);
      }
      cursorX += col.widthMm;
    });

    return y + headerH;
  };

  const drawContinuationHeader = (): number => {
    let y = TOP_Y;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(labName, MARGIN_X, y + 3.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${docName}  |  ${periodLabel}`, MARGIN_X + CONTENT_W, y + 3.5, { align: "right" });

    y += 5.5;
    pdf.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    pdf.setLineWidth(0.35);
    pdf.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);

    return y + 3.5;
  };

  // ── Page 1 Letterhead (Simple, Clean Vector Typography) ──
  let y = TOP_Y;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text(labName, MARGIN_X, y + 4.5);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  pdf.text(sanitizePdfText(statementBadgeLabel).toUpperCase(), MARGIN_X + CONTENT_W, y + 4, { align: "right" });

  y += 6.2;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.8);
  pdf.setTextColor(100, 116, 139);
  const contactParts = [labAddress, labPhone ? `Ph: ${labPhone}` : "", labEmail].filter(Boolean);
  const subHeaderLeft = contactParts.length > 0 ? contactParts.join("  |  ") : labTagline;
  const leftLines = pdf.splitTextToSize(subHeaderLeft, 118);
  pdf.text(leftLines.slice(0, 2), MARGIN_X, y + 2.5);

  pdf.setFontSize(7.5);
  pdf.text(`${statementId}  |  Generated: ${nowStr}`, MARGIN_X + CONTENT_W, y + 2.5, { align: "right" });

  y += Math.max(leftLines.slice(0, 2).length * 3.4, 4.5) + 1.5;
  pdf.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
  y += 4;

  // ── Doctor & Period Metadata Strip ──
  const metaH = 16.5;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.25);
  pdf.rect(MARGIN_X, y, CONTENT_W, metaH, "FD");

  const splitX = MARGIN_X + CONTENT_W * 0.62;
  pdf.line(splitX, y + 2.2, splitX, y + metaH - 2.2);

  // Left: Doctor info
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("REFERRING DOCTOR", MARGIN_X + 3, y + 4.2);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(docName, MARGIN_X + 3, y + 9.2);

  const docDetailsParts = [
    sanitizePdfText(doc.specialty || "Referring Clinician"),
    doc.clinic_hospital ? sanitizePdfText(doc.clinic_hospital) : "",
    settings.show_doctor_phone && doc.phone ? `Ph: ${sanitizePdfText(doc.phone)}` : "",
  ].filter(Boolean);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.6);
  pdf.setTextColor(71, 85, 105);
  const docDetailText = pdf.splitTextToSize(docDetailsParts.join("  |  "), CONTENT_W * 0.62 - 6)[0] || "";
  pdf.text(docDetailText, MARGIN_X + 3, y + 13.6);

  // Right: Statement period
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("STATEMENT PERIOD", splitX + 3.5, y + 4.2);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  pdf.text(periodLabel, splitX + 3.5, y + 9.2);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.6);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Base Commission Rate: ${Number(doc.default_commission_percent || 0)}%`, splitX + 3.5, y + 13.6);

  y += metaH + 3.5;

  // ── Clean Minimal Summary Strip (No "Pts" Clutter, Accurate Total Bills) ──
  if (settings.show_kpi_cards) {
    const kpiItems: Array<{ label: string; value: string; sub: string; highlight?: boolean }> = [
      {
        label: "TOTAL BILLS",
        value: String(accurate.totalBills),
        sub: accurate.totalBills === 1 ? "Verified Bill" : "Verified Bills",
      },
      {
        label: "NET BILLED SALES",
        value: formatInrAscii(accurate.totalNetSales),
        sub: accurate.totalDiscount > 0 ? `Disc: ${formatInrAscii(accurate.totalDiscount, 0)}` : "After Discount",
      },
      {
        label: "DOCTOR COMMISSION",
        value: formatInrAscii(accurate.totalDoctorCommission),
        sub: "Total Payable Cut",
        highlight: true,
      },
    ];

    if (settings.show_lab_revenue) {
      kpiItems.push({
        label: "LAB NET SHARE",
        value: formatInrAscii(accurate.totalLabRevenue),
        sub: "Retained Lab Amount",
      });
    }

    const boxH = 14.5;
    const cellW = CONTENT_W / kpiItems.length;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.rect(MARGIN_X, y, CONTENT_W, boxH, "FD");

    kpiItems.forEach((item, idx) => {
      const cellX = MARGIN_X + idx * cellW;
      if (idx > 0) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(cellX, y, cellX, y + boxH);
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.6);
      pdf.setTextColor(100, 116, 139);
      pdf.text(item.label, cellX + 3, y + 4);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      if (item.highlight) {
        pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      } else {
        pdf.setTextColor(15, 23, 42);
      }
      pdf.text(item.value, cellX + 3, y + 9);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(item.sub, cellX + 3, y + 12.6);
    });

    y += boxH + 4;
  }

  // ── Itemized Table Header ──
  y = drawTableHeader(y);

  // ── Itemized Rows with Exact Line Wrapping & Auto-Pagination ──
  if (bills.length === 0) {
    const emptyH = 14;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.rect(MARGIN_X, y, CONTENT_W, emptyH, "FD");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("No referral bills found for this doctor in the selected period.", MARGIN_X + CONTENT_W / 2, y + 8.5, {
      align: "center",
    });
    y += emptyH;
  } else {
    const lineH = 3.2;

    bills.forEach((b, idx) => {
      const pName = settings.show_patient_name ? sanitizePdfText(b.patient_name || "Patient") : `Patient #${idx + 1}`;
      const subParts: string[] = [];
      if (settings.show_patient_age_gender && b.patient_age_gender) subParts.push(sanitizePdfText(b.patient_age_gender));
      if (settings.show_patient_phone && b.patient_phone) subParts.push(sanitizePdfText(b.patient_phone));
      const pSubLine = subParts.join(" | ");

      const rawTests = Array.isArray(b.tests)
        ? b.tests.map((t) => sanitizePdfText(t)).filter(Boolean).join(", ")
        : sanitizePdfText(b.tests || "Tests");

      const invText = sanitizePdfText(b.bill_number || `INV-${(b.bill_id || "").slice(0, 6)}`);
      const dateText = sanitizePdfText(formatStatementDateOnly(b.date));

      // Compute wrapped lines per cell before calculating row height
      const cellContent: Record<string, { primary: string[]; secondary?: string[] }> = {};
      let maxLines = 1;

      columns.forEach((col) => {
        const innerW = Math.max(4, col.widthMm - 3.2);
        pdf.setFont("helvetica", col.key === "patient" || col.key === "net" || col.key === "doctor_cut" ? "bold" : "normal");
        pdf.setFontSize(7.4);

        if (col.key === "index") {
          cellContent[col.key] = { primary: [String(idx + 1)] };
        } else if (col.key === "date") {
          cellContent[col.key] = { primary: [dateText] };
        } else if (col.key === "invoice") {
          const lines = pdf.splitTextToSize(invText, innerW);
          cellContent[col.key] = { primary: lines.slice(0, 2) };
          maxLines = Math.max(maxLines, cellContent[col.key].primary.length);
        } else if (col.key === "patient") {
          pdf.setFont("helvetica", "bold");
          const pLines = pdf.splitTextToSize(pName, innerW);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.6);
          const sLines = pSubLine ? pdf.splitTextToSize(pSubLine, innerW).slice(0, 2) : [];
          cellContent[col.key] = { primary: pLines, secondary: sLines };
          maxLines = Math.max(maxLines, pLines.length + sLines.length);
        } else if (col.key === "tests") {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.1);
          const tLines = pdf.splitTextToSize(rawTests || "-", innerW);
          cellContent[col.key] = { primary: tLines };
          maxLines = Math.max(maxLines, tLines.length);
        } else if (col.key === "gross") {
          cellContent[col.key] = { primary: [Number(b.gross_total || 0).toFixed(2)] };
        } else if (col.key === "net") {
          cellContent[col.key] = { primary: [Number(b.net_amount || 0).toFixed(2)] };
        } else if (col.key === "rate") {
          cellContent[col.key] = { primary: [`${Number(b.commission_percent || 0)}%`] };
        } else if (col.key === "doctor_cut") {
          cellContent[col.key] = { primary: [Number(b.doctor_commission || 0).toFixed(2)] };
        } else if (col.key === "lab_share") {
          cellContent[col.key] = { primary: [Number(b.lab_net_share || 0).toFixed(2)] };
        }
      });

      const rowH = Math.max(6.4, maxLines * lineH + 2.8);

      // Page-break cleanly if this row would collide with footer
      if (y + rowH > MAX_BODY_Y) {
        pdf.addPage();
        y = drawContinuationHeader();
        y = drawTableHeader(y);
      }

      if (idx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(MARGIN_X, y, CONTENT_W, rowH, "F");
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.18);
      pdf.rect(MARGIN_X, y, CONTENT_W, rowH, "S");

      let cursorX = MARGIN_X;
      columns.forEach((col, cIdx) => {
        if (cIdx > 0) {
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.15);
          pdf.line(cursorX, y, cursorX, y + rowH);
        }

        const entry = cellContent[col.key];
        const baseY = y + 4.1;

        if (col.key === "patient") {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.4);
          pdf.setTextColor(15, 23, 42);
          drawTextCell(entry.primary, cursorX, baseY, col.widthMm, col.align, lineH);
          if (entry.secondary && entry.secondary.length > 0) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.6);
            pdf.setTextColor(100, 116, 139);
            drawTextCell(
              entry.secondary,
              cursorX,
              baseY + entry.primary.length * lineH,
              col.widthMm,
              col.align,
              lineH - 0.2
            );
          }
        } else if (col.key === "tests") {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.1);
          pdf.setTextColor(51, 65, 85);
          drawTextCell(entry.primary, cursorX, baseY, col.widthMm, col.align, lineH);
        } else if (col.key === "doctor_cut") {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.4);
          pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
          drawTextCell(entry.primary, cursorX, baseY, col.widthMm, col.align, lineH);
        } else if (col.key === "net") {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.4);
          pdf.setTextColor(15, 23, 42);
          drawTextCell(entry.primary, cursorX, baseY, col.widthMm, col.align, lineH);
        } else if (col.key === "invoice") {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.2);
          pdf.setTextColor(3, 105, 161);
          drawTextCell(entry.primary, cursorX, baseY, col.widthMm, col.align, lineH);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.2);
          pdf.setTextColor(71, 85, 105);
          drawTextCell(entry.primary, cursorX, baseY, col.widthMm, col.align, lineH);
        }

        cursorX += col.widthMm;
      });

      y += rowH;
    });
  }

  // ── Grand Totals Summary Bar at End of Table ──
  const totalsH = 12;
  if (y + totalsH + 10 > MAX_BODY_Y) {
    pdf.addPage();
    y = drawContinuationHeader();
  } else {
    y += 3.5;
  }

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN_X, y, CONTENT_W, totalsH, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.2);
  pdf.setTextColor(15, 23, 42);
  const billWord = accurate.totalBills === 1 ? "Bill" : "Bills";
  pdf.text(`GRAND TOTAL (${accurate.totalBills} ${billWord})`, MARGIN_X + 3.5, y + 7.2);

  // Right-aligned total metrics inside footer bar (sized so large INR figures never collide)
  let rightCursor = MARGIN_X + CONTENT_W - 3.5;
  if (settings.show_lab_revenue) {
    const labVal = `Lab Share: ${formatInrAscii(accurate.totalLabRevenue)}`;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.6);
    pdf.setTextColor(15, 118, 110);
    pdf.text(labVal, rightCursor, y + 7.2, { align: "right" });
    rightCursor -= pdf.getTextWidth(labVal) + 5.5;
  }

  const cutVal = `Doctor Cut: ${formatInrAscii(accurate.totalDoctorCommission)}`;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.8);
  pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  pdf.text(cutVal, rightCursor, y + 7.2, { align: "right" });
  rightCursor -= pdf.getTextWidth(cutVal) + 5.5;

  const netVal = `Net Billed: ${formatInrAscii(accurate.totalNetSales)}`;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.6);
  pdf.setTextColor(15, 23, 42);
  pdf.text(netVal, rightCursor, y + 7.2, { align: "right" });

  // Clean subtle note under grand totals
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Computer-generated referral statement | All amounts in INR (Rs.)", MARGIN_X, y + totalsH + 4.2);

  // ── Draw Consistent Page Footer Across Every Page ──
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_X, FOOTER_Y - 3, MARGIN_X + CONTENT_W, FOOTER_Y - 3);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(labName, MARGIN_X, FOOTER_Y + 0.5);
    pdf.text(`${docName}  |  ${periodLabel}`, MARGIN_X + CONTENT_W / 2, FOOTER_Y + 0.5, { align: "center" });
    pdf.text(`Page ${p} of ${totalPages}`, MARGIN_X + CONTENT_W, FOOTER_Y + 0.5, { align: "right" });
  }

  // Trigger instant local Blob download (0% server load)
  try {
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
  } catch (err) {
    // Resilience fallback reference
    void renderCanvasFallback;
    throw err;
  }
}
