/**
 * Utility for processing and optimizing doctor digital signatures:
 * - Canvas-based automatic white/paper background removal
 * - Smooth anti-aliased edge fading
 * - Auto-cropping excess transparent whitespace
 * - High quality PNG compression
 */

export interface SignatureProcessOptions {
  removeBackground?: boolean;
  threshold?: number; // 0-255, default 210
  cropWhitespace?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export function processSignatureImage(
  fileOrDataUrl: File | string,
  options: SignatureProcessOptions = {}
): Promise<string> {
  const {
    removeBackground = true,
    threshold = 210,
    cropWhitespace = true,
    maxWidth = 800,
    maxHeight = 400,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = (err) => reject(new Error("Failed to load signature image"));

    img.onload = () => {
      try {
        // 1. Initial Scale down if excessively large (e.g. 48MP phone camera upload)
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          return resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : "");
        }

        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // 2. Automatic White / Paper Background Removal
        if (removeBackground) {
          const softRamp = 35; // smooth anti-aliased transition
          const lowerBound = Math.max(0, threshold - softRamp);

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            // Perceptual brightness calculation
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            if (brightness >= threshold) {
              // Completely paper background
              data[i + 3] = 0;
            } else if (brightness > lowerBound) {
              // Smooth semi-transparent edge for anti-aliasing
              const factor = (brightness - lowerBound) / (threshold - lowerBound);
              const newAlpha = Math.round(a * (1 - factor));
              data[i + 3] = newAlpha;
            }
          }

          ctx.putImageData(imgData, 0, 0);
        }

        // 3. Auto Crop excess transparent padding
        if (cropWhitespace) {
          const croppedCanvas = cropTransparentEdges(canvas);
          return resolve(croppedCanvas.toDataURL("image/png"));
        }

        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Signature processing error:", e);
        reject(e);
      }
    };

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Trim transparent borders from canvas so the signature fills its bounds tightly
 */
function cropTransparentEdges(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let foundPixel = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 15) { // non-transparent pixel
        foundPixel = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If entire canvas is empty or tiny, return original
  if (!foundPixel || minX >= maxX || minY >= maxY) {
    return sourceCanvas;
  }

  // Add 4px breathing padding
  const padding = 4;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(w, maxX + padding);
  maxY = Math.min(h, maxY + padding);

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) return sourceCanvas;

  croppedCtx.drawImage(
    sourceCanvas,
    minX, minY, cropW, cropH,
    0, 0, cropW, cropH
  );

  return croppedCanvas;
}
