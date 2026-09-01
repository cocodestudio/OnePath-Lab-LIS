/**
 * High-precision medical invoice printing utility.
 * Renders the invoice sheet into an isolated printable frame ensuring:
 * - 0% dialog chrome, background, or scrollbars
 * - 100% crisp fonts, tables, lab logos, and UPI QR codes
 * - Images are fully loaded before trigger
 */

export function printInvoiceElement(element: HTMLElement | null, pageTitle = "Medical Invoice") {
  if (!element) {
    window.print();
    return;
  }

  // Check if an existing print iframe exists and clean it up
  const existingIframe = document.getElementById("lis-print-iframe");
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "lis-print-iframe";
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

  // Clone head styles and stylesheets
  const headElements = document.querySelectorAll("style, link[rel='stylesheet']");
  let stylesHtml = "";
  headElements.forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const contentHtml = element.outerHTML;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${pageTitle}</title>
        ${stylesHtml}
        <style>
          @page {
            size: auto;
            margin: 8mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: Arial, "Segoe UI", Roboto, sans-serif !important;
          }
          .invoice-print-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 794px !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; display: flex; justify-content: center; background: #ffffff;">
          ${contentHtml}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for all images inside iframe to complete loading before printing
  const images = Array.from(iframeDoc.images);
  const imagePromises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  });

  Promise.all(imagePromises).then(() => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print error, falling back to window.print():", err);
        window.print();
      }
    }, 150);
  });
}
