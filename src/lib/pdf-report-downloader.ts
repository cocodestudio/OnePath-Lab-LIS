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
 * Asynchronously inlines all images in the cloned element to Base64 data URLs.
 * Uses canvas when possible, and falls back to fetch(src) -> Blob -> Base64
 * to bypass CORS canvas taint on remote letterheads and signatures.
 */
async function inlineElementImagesAsync(element: HTMLElement): Promise<void> {
  const imgs = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        const src = img.getAttribute("src") || img.src;
        if (!src || src.startsWith("data:")) return;

        // 1. Try canvas if image is already loaded and not tainted
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              if (dataUrl && dataUrl.startsWith("data:image/")) {
                img.src = dataUrl;
                img.setAttribute("src", dataUrl);
                return;
              }
            }
          } catch {
            // Tainted canvas on remote images, continue to fetch fallback
          }
        }

        // 2. Fetch as blob directly from the browser cache/network
        const res = await fetch(src, { cache: "force-cache" }).catch(() => null);
        if (res && res.ok) {
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (base64 && base64.startsWith("data:")) {
            img.src = base64;
            img.setAttribute("src", base64);
          }
        }
      } catch (err) {
        console.warn("Could not inline image to base64:", img.src, err);
      }
    })
  );
}

/**
 * Asynchronously serializes the preview DOM into a completely self-contained HTML document.
 * Inlines ALL compiled Next.js stylesheets as raw CSS <style> tags and all images as Base64 data URLs,
 * eliminating all network dependencies in Headless Chrome in production environments.
 */
export async function prepareReportHtmlAsync(printContainer: HTMLElement): Promise<string> {
  let pageElements = printContainer.querySelectorAll<HTMLElement>(".report-print-page");
  if (!pageElements || pageElements.length === 0) {
    pageElements = printContainer.querySelectorAll<HTMLElement>(".report-preview-page-card");
  }
  if (!pageElements || pageElements.length === 0) {
    throw new Error("No printable report pages found to generate PDF.");
  }

  const styles: string[] = [];

  // 1. Fetch and inline all external stylesheets directly from browser cache
  const linkElements = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  await Promise.all(
    linkElements.map(async (link) => {
      if (!link.href) return;
      try {
        const res = await fetch(link.href, { cache: "force-cache" });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0) {
            styles.push(`<style data-inlined="link" data-href="${link.href}">${text}</style>`);
            return;
          }
        }
      } catch {}
      styles.push(link.outerHTML);
    })
  );

  // 2. Collect all inline <style> tags
  document.querySelectorAll<HTMLStyleElement>("style").forEach((style) => {
    styles.push(style.outerHTML);
  });

  // 3. Extract CSS rules from active document stylesheets
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        const rules = sheet.cssRules || (sheet as any).rules;
        if (rules) {
          let sheetCss = "";
          for (let r = 0; r < rules.length; r++) {
            try {
              sheetCss += rules[r].cssText + "\n";
            } catch {}
          }
          if (sheetCss) {
            styles.push(`<style data-sheet="${i}">${sheetCss}</style>`);
          }
        }
      } catch {
        // Cross-origin stylesheet security restriction, safely skip
      }
    }
  } catch (e) {
    console.warn("Could not extract document styleSheets rules:", e);
  }

  // 4. Clone and normalize each page element with async base64 images
  const pageArray = Array.from(pageElements);
  const pagesHtml = await Promise.all(
    pageArray.map(async (el) => {
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

      // Inline all images as data URLs asynchronously
      await inlineElementImagesAsync(clone);

      return clone.outerHTML;
    })
  );

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
    table {
      border-collapse: collapse !important;
      table-layout: fixed !important;
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
  ${pagesHtml.join("\n")}
</body>
</html>`;
}

/**
 * Serializes the preview DOM into a standalone HTML document (synchronous fallback).
 */
export function prepareReportHtml(printContainer: HTMLElement): string {
  let pageElements = printContainer.querySelectorAll<HTMLElement>(".report-print-page");
  if (!pageElements || pageElements.length === 0) {
    pageElements = printContainer.querySelectorAll<HTMLElement>(".report-preview-page-card");
  }
  if (!pageElements || pageElements.length === 0) {
    throw new Error("No printable report pages found to generate PDF.");
  }

  const styles: string[] = [];
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    styles.push(link.outerHTML);
  });

  document.querySelectorAll<HTMLStyleElement>("style").forEach((style) => {
    styles.push(style.outerHTML);
  });

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
      } catch {}
    }
    if (sheetCss) {
      styles.push(`<style>${sheetCss}</style>`);
    }
  } catch (e) {
    console.warn("Could not extract document styleSheets rules:", e);
  }

  const pagesHtml = Array.from(pageElements)
    .map((el) => {
      const clone = el.cloneNode(true) as HTMLElement;

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
    table {
      border-collapse: collapse !important;
      table-layout: fixed !important;
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
 * Uses an isolated sandbox mounted directly to document.body,
 * integer 2x DPI rendering, and lossless PNG compression so all table borders
 * and lines remain 100% straight and balanced without server or network dependencies.
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

  // Clean isolated sandbox placed at origin behind page to eliminate modal transforms & subpixel offsets
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.top = "0";
  sandbox.style.left = "0";
  sandbox.style.width = "794px";
  sandbox.style.height = "1123px";
  sandbox.style.overflow = "hidden";
  sandbox.style.backgroundColor = "#ffffff";
  sandbox.style.zIndex = "-99999";
  sandbox.style.pointerEvents = "none";
  sandbox.style.opacity = "1";
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

      // Inline loaded images from original DOM element to guarantee 0 network latency and no missing bitmaps
      const origImgs = el.querySelectorAll<HTMLImageElement>("img");
      const cloneImgs = clone.querySelectorAll<HTMLImageElement>("img");
      origImgs.forEach((origImg, idx) => {
        const cloneImg = cloneImgs[idx];
        if (!cloneImg) return;
        try {
          if (origImg.complete && origImg.naturalWidth > 0) {
            const c = document.createElement("canvas");
            c.width = origImg.naturalWidth;
            c.height = origImg.naturalHeight;
            const ctx = c.getContext("2d");
            if (ctx) {
              ctx.drawImage(origImg, 0, 0);
              cloneImg.src = c.toDataURL("image/png");
            }
          }
        } catch {
          cloneImg.src = origImg.src;
        }
      });

      // Stabilize table borders so lines remain 100% straight and balanced
      clone.querySelectorAll<HTMLTableElement>("table").forEach((tbl) => {
        tbl.style.borderCollapse = "collapse";
      });

      sandbox.innerHTML = "";
      sandbox.appendChild(clone);

      // Short delay for layout paint
      await new Promise((r) => setTimeout(r, 60));

      const canvas = await html2canvas(clone, {
        scale: 2, // Exact integer 2x DPI so 1px borders stay uniform
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
      });

      // Lossless PNG: zero JPEG ringing or line blurring
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
 * Uses high-resolution Chromium server engine with full inlined CSS and images,
 * with seamless fallback to pristine client engine if the server ever encounters an issue.
 */
export async function downloadNativePdf({ printContainer, filename }: GeneratePdfOptions): Promise<void> {
  const safeFilename = filename || "LabReport.pdf";
  let pdfBlob: Blob;

  try {
    const html = await prepareReportHtmlAsync(printContainer);
    pdfBlob = await generateNativePdfBlob(html, safeFilename);
  } catch (serverErr) {
    console.warn("Server-side vector PDF engine unavailable or timed out, executing pristine client fallback:", serverErr);
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
    if (downloadLink.parentNode) {
      document.body.removeChild(downloadLink);
    }
    URL.revokeObjectURL(blobUrl);
  }, 3000);
}

/**
 * Generates a pure PDF and returns it as a base64 Data URL for WhatsApp API dispatch.
 * Uses full inlined HTML vector engine with seamless fallback to pristine client engine.
 */
export async function getNativePdfBase64({ printContainer, filename }: GeneratePdfOptions): Promise<string> {
  const safeFilename = filename || "LabReport.pdf";
  let pdfBlob: Blob;

  try {
    const html = await prepareReportHtmlAsync(printContainer);
    pdfBlob = await generateNativePdfBlob(html, safeFilename);
  } catch (serverErr) {
    console.warn("Server-side PDF engine unavailable for WhatsApp, executing pristine client fallback:", serverErr);
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
