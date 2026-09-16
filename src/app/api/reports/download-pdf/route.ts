import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

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

function getLocalStaticCss(): string {
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
        if (combined.trim().length > 0) return combined;
      }
    }
  } catch (e) {
    console.warn("Could not read local static CSS directory:", e);
  }
  return "";
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let browser: any = null;

  try {
    const body = await req.json();
    const { html, filename } = body;

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "Missing required 'html' in request body" },
        { status: 400 }
      );
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

    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: launchArgs,
    });

    const page = await browser.newPage();

    // Emulate crisp high-DPI A4 screen viewport
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });

    // Load full HTML content with network stabilization
    try {
      await page.setContent(html, {
        waitUntil: ["domcontentloaded", "networkidle0"],
        timeout: 25000,
      });
    } catch {
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
    }

    // Ensure all compiled Next.js styles from local server disk are injected
    const localCss = getLocalStaticCss();
    if (localCss) {
      await page.addStyleTag({ content: localCss });
    }

    // Wait for web fonts and all pending images to complete layout paint
    await page.evaluate(async () => {
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {}
      }
      const imgs = Array.from(document.images);
      if (imgs.length > 0) {
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 3000);
            });
          })
        );
      }
      await new Promise((r) => setTimeout(r, 60));
    });

    // Export pure vector PDF matching A4 exactly (210mm x 297mm)
    const pdfBuffer = await page.pdf({
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

    await browser.close();
    browser = null;

    const safeFilename = (filename || "LabReport.pdf").replace(/[^a-zA-Z0-9_.-]/g, "_");

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Puppeteer PDF generation error:", err);

    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    return NextResponse.json(
      {
        error: err.message || "Failed to generate PDF via Chrome engine",
      },
      { status: 500 }
    );
  }
}
