import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function findChromeExecutable(): string {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";

    const candidates = [
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (process.platform === "linux") {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (process.platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  throw new Error("No compatible Chrome, Chromium, or Edge executable found on the host system.");
}

// In-memory cache for compiled static CSS so disk is not read on every download request
let cachedStaticCss: string | null = null;
function getLocalStaticCss(): string {
  if (cachedStaticCss !== null) {
    return cachedStaticCss;
  }

  try {
    const candidates = [
      path.join(process.cwd(), ".next", "static", "css"),
      path.join(process.cwd(), "..", ".next", "static", "css"),
    ];

    for (const cssDir of candidates) {
      if (fs.existsSync(cssDir)) {
        let combined = "";
        const readDirRecursive = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              readDirRecursive(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".css")) {
              try {
                combined += fs.readFileSync(fullPath, "utf-8") + "\n";
              } catch {}
            }
          }
        };
        readDirRecursive(cssDir);
        if (combined.trim().length > 0) {
          cachedStaticCss = combined;
          return combined;
        }
      }
    }
  } catch (e) {
    console.warn("Could not read local static CSS directory:", e);
  }
  cachedStaticCss = "";
  return "";
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Disk Cache Directory for pre-generated vector PDFs (Approach A)
const CACHE_DIR = path.join(process.cwd(), ".cache", "reports-pdf");
function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch {}
}

// In-memory deduplication map: prevents concurrent duplicate renders for the same report
const inflightGenerations = new Map<string, Promise<Buffer>>();

// Concurrency Semaphore: Limits max concurrent Chromium instances to prevent Out-Of-Memory server spikes
const MAX_CONCURRENT_CHROMIUM = 2;
let activeChromiumSlots = 0;
const waitingSlots: (() => void)[] = [];

async function acquireSlot(): Promise<() => void> {
  if (activeChromiumSlots < MAX_CONCURRENT_CHROMIUM) {
    activeChromiumSlots++;
    return () => releaseSlot();
  }
  await new Promise<void>((resolve) => waitingSlots.push(resolve));
  activeChromiumSlots++;
  return () => releaseSlot();
}

function releaseSlot() {
  activeChromiumSlots = Math.max(0, activeChromiumSlots - 1);
  const next = waitingSlots.shift();
  if (next) {
    next();
  }
}

// Warm Chromium Instance Pool: Keeps browser hot for instant page generation, auto-closes after 90s idle
let warmBrowser: any = null;
let warmBrowserIdleTimer: NodeJS.Timeout | null = null;

function resetWarmBrowserTimer() {
  if (warmBrowserIdleTimer) {
    clearTimeout(warmBrowserIdleTimer);
  }
  // Auto-close after 90 seconds of inactivity to release all RAM (0 MB idle footprint)
  warmBrowserIdleTimer = setTimeout(async () => {
    if (warmBrowser) {
      try {
        await warmBrowser.close();
      } catch {}
      warmBrowser = null;
    }
  }, 90000);
}

async function getOrLaunchBrowser(): Promise<any> {
  if (warmBrowser && warmBrowser.isConnected && warmBrowser.isConnected()) {
    resetWarmBrowserTimer();
    return warmBrowser;
  }

  if (warmBrowser) {
    try {
      await warmBrowser.close();
    } catch {}
    warmBrowser = null;
  }

  let chromePath: string | undefined;
  let launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-zygote",
    "--font-render-hinting=none",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-default-apps",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-breakpad",
    "--disable-component-extensions-with-background-pages",
    "--disable-ipc-flooding-protection",
    "--mute-audio",
    "--hide-scrollbars",
  ];

  try {
    chromePath = findChromeExecutable();
  } catch (e) {
    try {
      const chromium = (await import("@sparticuz/chromium")).default;
      const arch = process.arch === "arm64" ? "arm64" : "x64";
      const packUrl = `https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.${arch}.tar`;
      chromePath = await chromium.executablePath(packUrl);
      launchArgs = [...chromium.args, "--font-render-hinting=none"];
    } catch (e2: any) {
      console.error("Sparticuz chromium launch error:", e2);
      throw new Error(e2?.message || "No compatible Chrome, Chromium, or Edge executable found on the host system.");
    }
  }

  warmBrowser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: launchArgs,
  });

  resetWarmBrowserTimer();
  return warmBrowser;
}

/**
 * Isolated Chromium Vector PDF Renderer.
 * Preserves 100% of pristine A4 typography, borders, logos, and vector alignment.
 */
async function renderPdfWithChrome(html: string): Promise<Buffer> {
  const release = await acquireSlot();
  let page: any = null;

  try {
    const browser = await getOrLaunchBrowser();
    page = await browser.newPage();

    // Emulate crisp high-DPI A4 screen viewport
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });

    // Load full HTML content with fast DOM stabilization (all assets already inlined)
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 12000,
    });

    // Ensure all compiled Next.js styles from local server disk are injected
    const localCss = getLocalStaticCss();
    if (localCss) {
      await page.addStyleTag({ content: localCss });
    }

    // Fast font readiness check without arbitrary artificial delays
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.status !== "loaded") {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 150)),
          ]);
        } catch {}
      }
    });

    // Export pure vector PDF matching A4 exactly (210mm x 297mm)
    const rawBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
      preferCSSPageSize: true,
    });

    return Buffer.from(rawBuffer);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {}
    }
    release();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { html, filename } = body;

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "Missing required 'html' in request body" },
        { status: 400 }
      );
    }

    // Input payload size defense (max 10MB)
    if (html.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Report HTML payload exceeds maximum permitted size" },
        { status: 413 }
      );
    }

    ensureCacheDir();

    // Deterministic cryptographic SHA-256 hash representing exact report state
    const contentHash = crypto.createHash("sha256").update(html).digest("hex");
    const cachedFilePath = path.join(CACHE_DIR, `${contentHash}.pdf`);
    const safeFilename = (filename || "LabReport.pdf").replace(/[^a-zA-Z0-9_.-]/g, "_");

    // 1. Instant Disk Cache Hit (0% CPU, 0 MB RAM, < 10ms execution)
    if (fs.existsSync(cachedFilePath)) {
      try {
        const cachedBuffer = fs.readFileSync(cachedFilePath);
        if (cachedBuffer && cachedBuffer.length > 500) {
          return new NextResponse(new Uint8Array(cachedBuffer), {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${safeFilename}"`,
              "Content-Length": String(cachedBuffer.length),
              "X-PDF-Cache": "HIT",
              "ETag": `"${contentHash}"`,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      } catch (readErr) {
        console.warn("Failed reading cached PDF from disk, regenerating:", readErr);
      }
    }

    // 2. Request Deduplication (SingleFlight pattern): Multiple concurrent requests await single render
    let generationPromise = inflightGenerations.get(contentHash);
    if (!generationPromise) {
      generationPromise = (async () => {
        try {
          const buffer = await renderPdfWithChrome(html);
          // Persist to disk cache atomically
          try {
            const tempFile = `${cachedFilePath}.tmp.${Date.now()}`;
            fs.writeFileSync(tempFile, buffer);
            fs.renameSync(tempFile, cachedFilePath);
          } catch (writeErr) {
            console.warn("Could not save PDF to disk cache:", writeErr);
          }
          return buffer;
        } finally {
          inflightGenerations.delete(contentHash);
        }
      })();
      inflightGenerations.set(contentHash, generationPromise);
    }

    const pdfBuffer = await generationPromise;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(pdfBuffer.length),
        "X-PDF-Cache": "MISS",
        "ETag": `"${contentHash}"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    console.error("Puppeteer PDF generation error:", err);

    return NextResponse.json(
      {
        error: err.message || "Failed to generate PDF via Chrome engine",
      },
      { status: 500 }
    );
  }
}
