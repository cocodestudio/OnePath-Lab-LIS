import JsBarcode from "jsbarcode";

export interface PrintableBarcodeLabel {
  code: string;
  tubeType?: string;
  specimenType?: string;
  title?: string;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientId?: string;
  refDoctor?: string;
  collectionCenter?: string;
  date?: string;
  labName?: string;
}

export interface PrintBarcodeOptions {
  labels: PrintableBarcodeLabel[];
  copiesPerLabel?: number;
  sheetTitle?: string;
}

/**
 * Generates pure vector SVG markup for a Code 128 barcode using JsBarcode.
 */
export function generateBarcodeSvgString(
  code: string,
  width = 1.15,
  height = 26
): string {
  if (typeof document === "undefined") {
    return `<div style="font-family:monospace;font-size:11px;font-weight:bold;text-align:center;">${code}</div>`;
  }

  const cleanCode = (code || "").trim();
  if (!cleanCode) return "";

  try {
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svgNode, cleanCode, {
      format: "CODE128",
      width,
      height,
      displayValue: false, // We render custom crisp typographic text below
      margin: 0,
      background: "transparent",
      lineColor: "#000000",
    });
    return new XMLSerializer().serializeToString(svgNode);
  } catch (err) {
    console.error("JsBarcode SVG generation error:", err);
    return `<div style="font-family:monospace;font-size:11px;font-weight:bold;text-align:center;letter-spacing:1px;">${cleanCode}</div>`;
  }
}

/**
 * High-precision laboratory specimen barcode label printing.
 * Formats stickers to ~62mm x 28mm so exactly 3 barcode labels fit horizontally across an A4 sheet.
 * Printed via an isolated iframe with 0% dashboard UI bleed or margin waste.
 */
export function printBarcodeLabels({
  labels,
  copiesPerLabel = 1,
  sheetTitle = "Specimen Barcode Labels",
}: PrintBarcodeOptions): void {
  if (typeof window === "undefined" || !labels || labels.length === 0) return;

  const validLabels = labels.filter((l) => l && l.code && l.code.trim() !== "");
  if (validLabels.length === 0) return;

  // Flatten copies
  const allStickers: PrintableBarcodeLabel[] = [];
  validLabels.forEach((label) => {
    const count = Math.max(1, copiesPerLabel);
    for (let i = 0; i < count; i++) {
      allStickers.push(label);
    }
  });

  // Prepare iframe
  const existingIframe = document.getElementById("lis-barcode-print-iframe");
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "lis-barcode-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Build HTML for each sticker
  const stickersHtml = allStickers
    .map((item) => {
      const pName = (item.patientName || "Patient").trim();
      const pAge = item.patientAge ? `${item.patientAge}Y` : "";
      const pGender = item.patientGender ? item.patientGender.charAt(0).toUpperCase() : "";
      const pAgeGender = [pAge, pGender].filter(Boolean).join("/");
      const pId = item.patientId || "";
      const tube = item.tubeType || "SPECIMEN";
      const specimen = item.specimenType || "";
      const lab = item.labName || "OnePath Lab";
      const barcodeSvg = generateBarcodeSvgString(item.code, 1.15, 24);

      return `
      <div class="sticker">
        <div class="header-row">
          <span class="patient-name">${escapeHtml(pName)}</span>
          <span class="patient-demog">${escapeHtml(pAgeGender)}</span>
        </div>

        <div class="sub-row">
          <span class="pid">${pId ? `PID: ${escapeHtml(pId)}` : ""}</span>
          <span class="tube-badge">${escapeHtml(tube)}</span>
        </div>

        <div class="barcode-container">
          ${barcodeSvg}
        </div>

        <div class="barcode-number">
          ${escapeHtml(item.code)}
        </div>

        <div class="footer-row">
          <span class="specimen-label">${escapeHtml(specimen || lab)}</span>
          <span class="timestamp">${currentDate} ${currentTime}</span>
        </div>
      </div>
    `;
    })
    .join("");

  const pageHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(sheetTitle)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 7mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .grid-container {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 4mm 5mm;
            width: 100%;
            max-width: 196mm; /* 210mm A4 minus margins allows exactly 3 stickers across */
          }
          .sticker {
            width: 62mm;
            height: 28mm;
            max-width: 62mm;
            max-height: 28mm;
            padding: 1.8mm 2.2mm;
            border: 0.5px dashed #b0b0b0;
            border-radius: 1.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #ffffff;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2mm;
            line-height: 1.1;
          }
          .patient-name {
            font-size: 7.5pt;
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 44mm;
            color: #000000;
            text-transform: capitalize;
          }
          .patient-demog {
            font-size: 7pt;
            font-weight: 800;
            color: #111111;
            white-space: nowrap;
            shrink: 0;
          }
          .sub-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 6pt;
            font-weight: 700;
            color: #444444;
            line-height: 1;
            margin-top: 0.5mm;
          }
          .tube-badge {
            font-size: 6pt;
            font-weight: 800;
            background: #f0f0f0;
            padding: 0.2mm 1.2mm;
            border-radius: 0.8mm;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 12mm;
            margin: 0.4mm 0;
            overflow: hidden;
          }
          .barcode-container svg {
            max-width: 100%;
            height: 12mm !important;
            display: block;
          }
          .barcode-number {
            font-family: "Courier New", Courier, monospace;
            font-size: 6.8pt;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1px;
            color: #000000;
            line-height: 1;
          }
          .footer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 5.5pt;
            font-weight: 600;
            color: #666666;
            line-height: 1;
            margin-top: 0.4mm;
          }
          .specimen-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 35mm;
          }
          .timestamp {
            white-space: nowrap;
          }
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${stickersHtml}
        </div>
      </body>
    </html>
  `;

  iframeDoc.open();
  iframeDoc.write(pageHtml);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Barcode print execution error, falling back to window.print():", e);
      window.print();
    }
  }, 100);
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
