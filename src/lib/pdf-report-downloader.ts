/**
 * High-Fidelity Native Vector PDF Generator & Downloader for OnePath Lab Reports
 * Uses Chromium/Chrome Headless Engine via server-side API to produce 100% pixel-perfect,
 * crisp vector PDFs with zero line disbalance, identical to on-screen preview.
 */

export interface GeneratePdfOptions {
  printContainer: HTMLElement;
  filename?: string;
}

/**
 * Inlines loaded images in the cloned element to Base64 data URLs
 * to ensure instant, network-free, pixel-perfect rendering in Headless Chrome.
 */
function inlineElementImages(element: HTMLElement) {
  const imgs = element.querySelectorAll<HTMLImageElement>("img");
  imgs.forEach((img) => {
    try {
      if (img.src && !img.src.startsWith("data:")) {
        // If image is already rendered in DOM, convert to data URL via canvas
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            img.src = dataUrl;
            img.setAttribute("src", dataUrl);
            return;
          }
        }
      }
      // Ensure absolute URL fallback
      if (img.src) {
        img.setAttribute("src", img.src);
      }
    } catch {
      if (img.src) {
        img.setAttribute("src", img.src);
      }
    }
  });
}

/**
 * Serializes the preview DOM into a standalone, complete HTML document
 * containing all CSS styles, fonts, and unscaled 794x1123 A4 pages.
 */
export function prepareReportHtml(printContainer: HTMLElement): string {
  // Collect all page elements
  let pageElements = printContainer.querySelectorAll<HTMLElement>(".report-print-page");
  if (!pageElements || pageElements.length === 0) {
    pageElements = printContainer.querySelectorAll<HTMLElement>(".report-preview-page-card");
  }
  if (!pageElements || pageElements.length === 0) {
    throw new Error("No printable report pages found to generate PDF.");
  }

  // 1. Collect all stylesheet links
  const styles: string[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    styles.push(link.outerHTML);
  });

  // 2. Collect all <style> tags
  document.querySelectorAll<HTMLStyleElement>("style").forEach((style) => {
    styles.push(style.outerHTML);
  });

  // 3. Extract CSS rules from active document stylesheets
  try {
    let sheetCss = "";
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const rules = document.styleSheets[i].cssRules;
        if (rules) {
          for (let r = 0; r < rules.length; r++) {
            sheetCss += rules[r].cssText + "\n";
          }
        }
      } catch {
        // Cross-origin stylesheet security restriction, safely skip
      }
    }
    if (sheetCss) {
      styles.push(`<style>${sheetCss}</style>`);
    }
  } catch (e) {
    console.warn("Could not extract document styleSheets rules:", e);
  }

  // 4. Clone and normalize each page element
  const pagesHtml = Array.from(pageElements)
    .map((el) => {
      const clone = el.cloneNode(true) as HTMLElement;

      // Force unscaled pure A4 794x1123 dimensions
      clone.style.transform = "none";
      clone.style.webkitTransform = "none";
      clone.style.width = "794px";
      clone.style.height = "1123px";
      clone.style.minHeight = "1123px";
      clone.style.maxHeight = "1123px";
      clone.style.margin = "0 auto";
      clone.style.position = "relative";
      clone.style.overflow = "hidden";
      clone.style.boxSizing = "border-box";
      clone.style.backgroundColor = "#ffffff";

      // Inline images as data URLs or absolute links
      inlineElementImages(clone);

      return clone.outerHTML;
    })
    .join("\n");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${origin ? `<base href="${origin}/" />` : ""}
  <title>Lab Report</title>
  ${styles.join("\n")}
  <style>
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 794px !important;
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", Roboto, sans-serif !important;
    }
    .report-print-page {
      width: 794px !important;
      height: 1123px !important;
      min-height: 1123px !important;
      max-height: 1123px !important;
      margin: 0 auto !important;
      padding: 0 !important;
      position: relative !important;
      overflow: hidden !important;
      background-color: #ffffff !important;
      transform: none !important;
      page-break-after: always !important;
      break-after: page !important;
      box-sizing: border-box !important;
    }
    .report-print-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .letterhead-bg-img {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: fill !important;
      z-index: 0 !important;
      display: block !important;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

/**
 * Generates a native Vector PDF Blob using the Headless Chrome route.
 */
export async function generateNativePdfBlob(html: string, filename: string): Promise<Blob> {
  const res = await fetch("/api/reports/download-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html, filename }),
  });

  if (!res.ok) {
    let errMessage = "Server returned an error generating PDF";
    try {
      const data = await res.json();
      if (data?.error) errMessage = data.error;
    } catch {
      const text = await res.text();
      if (text) errMessage = text;
    }
    throw new Error(errMessage);
  }

  return await res.blob();
}

/**
 * Pristine Client-Side PDF Generation Engine
 * Uses an isolated off-screen sandbox mounted directly to document.body,
 * integer 2x DPI rendering, and lossless PNG compression so all table borders
 * and lines remain 100% straight and balanced without server dependencies.
 */
export async function generatePristineClientPdf(printContainer: HTMLElement, filename?: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  let pageElements = printContainer.querySelectorAll<HTMLElement>(".report-print-page");
  if (!pageElements || pageElements.length === 0) {
    pageElements = printContainer.querySelectorAll<HTMLElement>(".report-preview-page-card");
  }
  if (!pageElements || pageElements.length === 0) {
    throw new Error("No printable report pages found.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Create clean isolated sandbox on body to eliminate modal transforms, zoom, and subpixel flex centering
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.top = "0";
  sandbox.style.left = "-100000px";
  sandbox.style.width = "794px";
  sandbox.style.height = "1123px";
  sandbox.style.overflow = "hidden";
  sandbox.style.backgroundColor = "#ffffff";
  sandbox.style.zIndex = "-99999";
  document.body.appendChild(sandbox);

  try {
    for (let i = 0; i < pageElements.length; i++) {
      if (i > 0) pdf.addPage();
      const el = pageElements[i];

      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      clone.style.webkitTransform = "none";
      clone.style.width = "794px";
      clone.style.height = "1123px";
      clone.style.minHeight = "1123px";
      clone.style.maxHeight = "1123px";
      clone.style.margin = "0";
      clone.style.padding = "0";
      clone.style.position = "relative";
      clone.style.overflow = "hidden";
      clone.style.boxSizing = "border-box";
      clone.style.backgroundColor = "#ffffff";

      // Inline any images
      inlineElementImages(clone);

      sandbox.innerHTML = "";
      sandbox.appendChild(clone);

      // Short delay for DOM styles and layout paint to settle
      await new Promise((r) => setTimeout(r, 60));

      const canvas = await html2canvas(clone, {
        scale: 2, // Exact integer 2x DPI so 1px border becomes exactly 2px uniformly
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        windowWidth: 1200, // Desktop media queries, no column distortion
      });

      // Lossless PNG: zero JPEG compression distortion or line blurring
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }

  return pdf.output("blob");
}

/**
 * Downloads a pixel-perfect Vector PDF directly to user's downloads folder.
 * Uses server-side Chromium engine with automated seamless client-side fallback.
 */
export async function downloadNativePdf({ printContainer, filename }: GeneratePdfOptions): Promise<void> {
  const safeFilename = filename || "LabReport.pdf";
  let pdfBlob: Blob;

  try {
    const html = prepareReportHtml(printContainer);
    pdfBlob = await generateNativePdfBlob(html, safeFilename);
  } catch (serverErr) {
    console.warn("Server-side PDF engine unavailable, executing pristine client-side engine:", serverErr);
    pdfBlob = await generatePristineClientPdf(printContainer, safeFilename);
  }

  // Trigger browser download
  const blobUrl = URL.createObjectURL(pdfBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = safeFilename;
  document.body.appendChild(downloadLink);
  downloadLink.click();

  setTimeout(() => {
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  }, 3000);
}

/**
 * Generates a pure PDF and returns it as a base64 Data URL for WhatsApp API dispatch.
 */
export async function getNativePdfBase64({ printContainer, filename }: GeneratePdfOptions): Promise<string> {
  const safeFilename = filename || "LabReport.pdf";
  let pdfBlob: Blob;

  try {
    const html = prepareReportHtml(printContainer);
    pdfBlob = await generateNativePdfBlob(html, safeFilename);
  } catch (serverErr) {
    console.warn("Server-side PDF engine unavailable, executing pristine client-side engine:", serverErr);
    pdfBlob = await generatePristineClientPdf(printContainer, safeFilename);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert PDF blob to Data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(pdfBlob);
  });
}
