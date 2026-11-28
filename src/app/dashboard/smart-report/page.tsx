"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Save, Upload, Check, CheckCircle2, Trash2,
  ZoomIn, ZoomOut, RotateCcw, Palette, FileText, Activity,
  HeartPulse, Apple, ShieldAlert, Loader2, Stethoscope,
  Layers, LayoutTemplate, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, clearApiCache } from "@/lib/api-client";
import { TipTapEditor } from "@/components/tiptap-editor";
import {
  type SmartReportSettings,
  type ReportLayoutSettings,
  defaultSmartReportSettings,
  defaultReportLayoutSettings,
  normalizeReportSettings,
} from "@/lib/report-settings";

const PRESET_COLORS = [
  { name: "Cyan Medical", value: "#0284c7" },
  { name: "Teal Emerald", value: "#059669" },
  { name: "Royal Indigo", value: "#4f46e5" },
  { name: "Violet Purple", value: "#7c3aed" },
  { name: "Crimson Rose", value: "#e11d48" },
  { name: "Slate Charcoal", value: "#334155" },
];

const COVER_TEMPLATES = [
  { id: "cover-classic",  label: "Architectural Bar",  desc: "Left vertical accent rail",     tag: "CLS" },
  { id: "cover-modern",   label: "Editorial Top",      desc: "Clean top hairline accent",     tag: "MOD" },
  { id: "cover-tech",     label: "Dark Header Band",   desc: "High-contrast slate top block", tag: "TECH" },
  { id: "cover-wellness", label: "Framed Dossier",     desc: "Double-bordered clinical frame",tag: "WLN" },
  { id: "cover-gradient", label: "Executive Navy",     desc: "Deep slate & brand header",     tag: "EXC" },
  { id: "cover-minimal",  label: "Clean Minimal",      desc: "Quiet typography & bottom bar", tag: "MIN" },
];

const INTERIOR_TEMPLATES = [
  { id: "interior-clean",   label: "Clinical Clean",    desc: "Hairline ledger tables & whitespace", tag: "CLN" },
  { id: "interior-premium", label: "Double Ruled",      desc: "Classic pathology double-ruled bar",  tag: "PRM" },
  { id: "interior-accent",  label: "Side Accent Rail",  desc: "6px left brand rail across pages",    tag: "ACC" },
  { id: "interior-card",    label: "Structured Grid",   desc: "Subtle bordered organ & info blocks", tag: "GRD" },
];

const EXTERIOR_TEMPLATES = [
  { id: "exterior-none",     label: "No Back Cover",   desc: "Standard concise dossier",          tag: "OFF" },
  { id: "exterior-gradient", label: "Executive Sign-off", desc: "Deep slate & brand back cover",  tag: "EXC" },
  { id: "exterior-qr",       label: "QR Verification", desc: "Cryptographic authenticity QR page", tag: "QR" },
  { id: "exterior-minimal",  label: "Contact Sheet",   desc: "Clean lab contact & sign-off page", tag: "MIN" },
];

export default function SmartReportSettingsPage() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fullLayoutSettings, setFullLayoutSettings] = useState<ReportLayoutSettings>(defaultReportLayoutSettings);
  const [ss, setSs] = useState<SmartReportSettings>(defaultSmartReportSettings);
  const [previewTab, setPreviewTab] = useState<"cover" | "interior" | "exterior">("cover");
  const [previewScale, setPreviewScale] = useState<number>(0.70);
  const [templateTab, setTemplateTab] = useState<"cover" | "interior" | "exterior">("cover");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateScale = () => {
        const w = window.innerWidth;
        if (w < 480) setPreviewScale(0.38);
        else if (w < 640) setPreviewScale(0.44);
        else if (w < 768) setPreviewScale(0.50);
        else if (w < 1024) setPreviewScale(0.58);
        else if (w < 1440) setPreviewScale(0.65);
        else setPreviewScale(0.72);
      };
      updateScale();
      window.addEventListener("resize", updateScale);
      return () => window.removeEventListener("resize", updateScale);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("lis_cached_report_settings");
          if (cached) {
            const parsed = normalizeReportSettings(JSON.parse(cached));
            setFullLayoutSettings(parsed);
            if (parsed.smartReport) setSs(parsed.smartReport);
          }
        }
        const lab = await fetchFromLaravel("/lab");
        if (lab) {
          const parsed = normalizeReportSettings(lab.report_settings || lab.reportSettings);
          setFullLayoutSettings(parsed);
          const cur = parsed.smartReport || defaultSmartReportSettings;
          setSs({
            ...cur,
            labName: cur.labName || lab.name || "OnePath Pathology Laboratory",
            labAddress: cur.labAddress || lab.address || "Main Bazar, Near Central Square",
            emailAddress: cur.emailAddress || lab.email || "support@onepathlab.com",
            logoUrl: cur.logoUrl || lab.logoUrl || lab.logo_url || null,
          });
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("File Too Large", "Please select a logo image under 8MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setSs((p) => ({ ...p, logoUrl: b64, showLogo: true }));
      toast.success("Logo Uploaded", "Preview updated. Click Save to persist.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated: ReportLayoutSettings = { ...fullLayoutSettings, smartReport: { ...ss } };
      await fetchFromLaravel("/lab/letterhead", { method: "POST", body: JSON.stringify({ report_settings: updated }) });
      setFullLayoutSettings(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("lis_cached_report_settings", JSON.stringify(updated));
        window.dispatchEvent(new Event("lis_settings_updated"));
      }
      clearApiCache("/lab");
      clearApiCache("/reports");
      setSaveSuccess(true);
      toast.success("Settings Saved!", "AI Smart Report settings updated successfully.");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      toast.error("Save Failed", err?.message || "Failed to save settings.");
    } finally { setIsSaving(false); }
  };

  const tc = ss.themeColor || "#0284c7";

  // ── Cover Page Preview ────────────────────────────────────────────────────
  function CoverPagePreview() {
    const isDarkTop = ss.coverDesign === "cover-tech" || ss.coverDesign === "cover-gradient";
    return (
      <div
        className="w-[794px] bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between overflow-hidden"
        style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", height: 1123 }}
      >
        {(!ss.coverDesign || ss.coverDesign === "cover-classic") && (
          <div className="absolute top-0 bottom-0 left-0 w-2.5" style={{ backgroundColor: tc }} />
        )}
        {ss.coverDesign === "cover-modern" && (
          <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: tc }} />
        )}
        {ss.coverDesign === "cover-tech" && (
          <div className="absolute top-0 left-0 right-0 h-[310px] bg-slate-900" />
        )}
        {ss.coverDesign === "cover-wellness" && (
          <>
            <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: tc }} />
            <div className="absolute inset-5 border border-slate-200 pointer-events-none" />
          </>
        )}
        {ss.coverDesign === "cover-gradient" && (
          <div
            className="absolute top-0 left-0 right-0 h-[280px]"
            style={{ background: `linear-gradient(135deg, #0f172a 0%, ${tc} 100%)` }}
          />
        )}
        {ss.coverDesign === "cover-minimal" && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ backgroundColor: tc }} />
        )}

        {/* Header */}
        <div className={`pt-11 px-14 flex items-start justify-between z-10 ${isDarkTop ? "text-white" : "text-slate-900"}`}>
          {ss.showLogo && ss.logoUrl ? (
            <div className={isDarkTop ? "bg-white px-3 py-1.5 rounded-lg" : ""}>
              <img src={ss.logoUrl} alt="Logo" className="h-12 max-w-[260px] object-contain" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: isDarkTop ? "rgba(255,255,255,0.16)" : tc }}
              >
                +
              </div>
              <div>
                <span className="font-bold text-base tracking-tight block leading-tight">{ss.labName || "OnePath Diagnostic Laboratory"}</span>
                <span className={`text-[11px] block mt-0.5 ${isDarkTop ? "text-slate-300" : "text-slate-500"}`}>
                  Clinical Pathology &amp; Diagnostic Medicine
                </span>
              </div>
            </div>
          )}
          <div className="text-right">
            <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] block ${isDarkTop ? "text-slate-300" : "text-slate-500"}`}>
              Diagnostic Health Dossier
            </span>
            <span className="font-mono text-xs font-bold block mt-0.5">PID-2026-8888</span>
            {ss.showAiTag && (
              <span
                className="inline-block mt-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold border"
                style={{
                  backgroundColor: isDarkTop ? "rgba(255,255,255,0.12)" : `${tc}0f`,
                  borderColor: isDarkTop ? "rgba(255,255,255,0.28)" : `${tc}35`,
                  color: isDarkTop ? "#ffffff" : tc,
                }}
              >
                Clinical Analytics Edition
              </span>
            )}
          </div>
        </div>

        {/* Center Hero & Patient Record */}
        <div className="px-14 z-10 flex-1 flex flex-col justify-center">
          <div className={isDarkTop ? "mb-12" : "mb-10"}>
            <div className="h-0.5 w-14 mb-4" style={{ backgroundColor: isDarkTop ? "#ffffff" : tc }} />
            <h1 className={`text-[36px] font-bold tracking-tight leading-[1.15] max-w-xl ${isDarkTop ? "text-white" : "text-slate-900"}`}>
              Comprehensive Health &amp; Biomarker Report
            </h1>
            <p className={`text-sm mt-3 max-w-lg leading-relaxed ${isDarkTop ? "text-slate-200" : "text-slate-600"}`}>
              Structured clinical evaluation, quantitative laboratory findings, organ system profiling, and dietary guidance prepared for physician review.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs mb-6">
            <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Patient Record Details</span>
              <span className="text-[11px] font-mono text-slate-500">
                Reported: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 text-xs">
              <div className="px-5 py-3.5">
                <span className="text-[10.5px] text-slate-500 block">Patient Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">Mr. Rajesh Kumar</span>
              </div>
              <div className="px-5 py-3.5">
                <span className="text-[10.5px] text-slate-500 block">Patient ID / Lab File</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">PID-2026-8888</span>
              </div>
              <div className="px-5 py-3.5">
                <span className="text-[10.5px] text-slate-500 block">Age / Gender</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">42 Years &middot; Male</span>
              </div>
              <div className="px-5 py-3.5">
                <span className="text-[10.5px] text-slate-500 block">Referring Clinician</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">Dr. Ananya Sharma</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 border border-slate-200 rounded-lg divide-x divide-slate-200 bg-slate-50/70">
            <div className="px-4 py-3">
              <span className="text-[10px] text-slate-500 font-medium block">Biomarkers Tested</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">24</span>
            </div>
            <div className="px-4 py-3">
              <span className="text-[10px] text-slate-500 font-medium block">Within Reference</span>
              <span className="text-lg font-bold text-teal-700 tabular-nums mt-0.5 block">22</span>
            </div>
            <div className="px-4 py-3">
              <span className="text-[10px] text-slate-500 font-medium block">Flagged for Review</span>
              <span className="text-lg font-bold text-rose-700 tabular-nums mt-0.5 block">2</span>
            </div>
            <div className="px-4 py-3">
              <span className="text-[10px] text-slate-500 font-medium block">Health Index</span>
              <span className="text-lg font-bold tabular-nums mt-0.5 block" style={{ color: tc }}>86/100</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-14 py-6 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs z-10">
          <div>
            <p className="font-bold text-slate-900">{ss.labName || "OnePath Diagnostic Laboratory"}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{ss.labAddress || "Main Bazar, Near Central Square, New Delhi"}</p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            {ss.emailAddress && <p className="font-medium text-slate-700">{ss.emailAddress}</p>}
            {ss.footerText && <p className="text-slate-400 mt-0.5">{ss.footerText}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Interior Page Preview ─────────────────────────────────────────────────
  function InteriorPagePreview() {
    const isPremium = ss.interiorDesign === "interior-premium";
    const isAccent = ss.interiorDesign === "interior-accent";
    const isCard = ss.interiorDesign === "interior-card";

    return (
      <div
        className={`w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between overflow-hidden px-11 py-9 ${
          isAccent ? "border-l-[6px]" : ""
        }`}
        style={{
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          borderColor: isAccent ? tc : undefined,
        }}
      >
        <div>
          {/* Header */}
          <div
            className={`flex items-end justify-between pb-3 mb-4 ${
              isPremium ? "border-b-4 border-double" : "border-b-2"
            }`}
            style={{ borderColor: tc }}
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{ss.labName || "OnePath Diagnostic Laboratory"}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{ss.labAddress}</p>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <span className="font-bold text-slate-900 block">Clinical Summary &amp; Organ Profile</span>
              <span>{ss.emailAddress || ss.email}</span>
            </div>
          </div>

          {/* Patient Banner */}
          <div className={`flex justify-between items-center text-xs mb-5 px-3.5 py-2.5 border border-slate-200 ${isCard ? "rounded-lg bg-slate-50/70" : "bg-slate-50/50"}`}>
            <div>
              <span className="font-bold text-slate-900">Mr. Rajesh Kumar</span>
              <span className="text-slate-500 ml-2">42 Y / Male  |  Ref: Dr. Ananya Sharma</span>
            </div>
            <div className="font-mono text-[11px] font-semibold text-slate-700">
              ID: PID-2026-8888 &middot; {new Date().toLocaleDateString("en-IN")}
            </div>
          </div>

          {/* Executive Summary */}
          {ss.showExecutiveSummary && (
            <div className="pl-4 border-l-[3px] mb-6" style={{ borderColor: tc }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-slate-900">Clinical Assessment Summary</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50">Index: 86/100</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11.5px]">
                Hepatic, hematologic, and renal panels are within reference limits. Fasting glucose is mildly elevated, indicating early impaired glucose tolerance requiring dietary moderation.
              </p>
            </div>
          )}

          {/* Organ Systems Profile */}
          {ss.showOrganHealthGauges && (
            <div className="mb-5 space-y-2.5">
              <div className="flex justify-between items-baseline border-b border-slate-200 pb-1.5">
                <span className="text-xs font-bold text-slate-900">Organ Systems Profile</span>
                <span className="text-[10.5px] font-mono text-slate-500">Physiological Score (0–100)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Blood & Immunity", score: 92, s: "Optimal", c: "#0f766e", sub: "5 tested" },
                  { name: "Liver Function", score: 94, s: "Optimal", c: "#0f766e", sub: "4 tested" },
                  { name: "Kidney Health", score: 88, s: "Optimal", c: "#0f766e", sub: "3 tested" },
                  { name: "Metabolism & Glucose", score: 62, s: "Attention", c: "#b45309", sub: "2 tested, 1 flagged" },
                ].map((org) => (
                  <div key={org.name} className={`p-3 border border-slate-200 bg-white ${isCard ? "rounded-lg" : "rounded"}`}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-900">{org.name}</span>
                      <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">{org.score}<span className="text-[10px] text-slate-400">/100</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full my-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${org.score}%`, backgroundColor: org.c }} />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{org.sub}</span>
                      <span className="font-semibold" style={{ color: org.c }}>{org.s}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Flagged Parameter */}
          <div className="p-3.5 bg-white border border-slate-200 border-l-[3px] border-l-rose-700 rounded-r-lg mb-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-bold text-xs text-slate-900">Fasting Blood Sugar (Glucose)</span>
              <span className="font-mono font-bold text-xs text-rose-700">128.0 mg/dL (HIGH)</span>
            </div>
            <p className="text-[11px] text-slate-600">
              <strong className="text-slate-900">Possible Clinical Factors:</strong> High refined carbohydrate intake, reduced physical activity, or insulin resistance.
            </p>
          </div>

          {/* Diet Tips */}
          {ss.showDietLifestyleTips && (
            <div className="border border-slate-200 border-t-[3px] border-t-teal-700 bg-white p-3.5 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-1">Dietary Focus</span>
              <p className="text-[11px]">Prioritize leafy vegetables, whole grains, millets, nuts, and 2.5–3L hydration daily; limit refined sugars.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t border-slate-200 pt-3 text-[9.5px] text-slate-500 flex justify-between items-center ${isPremium ? "border-double border-t-2" : ""}`}>
          <p className="font-medium truncate max-w-[70%]">
            {(ss.disclaimerText || ss.disclaimer || "Clinical correlation required.").replace(/<[^>]+>/g, "").slice(0, 95)}...
          </p>
          <span className="font-mono">Page 2 of {ss.exteriorDesign && ss.exteriorDesign !== "exterior-none" ? 5 : 4}</span>
        </div>
      </div>
    );
  }

  // ── Exterior/Back Cover Preview ───────────────────────────────────────────
  function ExteriorPagePreview() {
    return (
      <div
        className="w-[794px] h-[1123px] bg-white text-slate-900 shadow-2xl relative flex flex-col justify-between overflow-hidden"
        style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
      >
        {ss.exteriorDesign === "exterior-gradient" && (
          <>
            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, #0f172a 0%, ${tc} 140%)` }} />
            <div className="relative z-10 flex flex-col items-start justify-center h-full text-white px-16 gap-5">
              <div className="h-1 w-16 bg-white/70" />
              <h2 className="text-3xl font-bold tracking-tight">Thank You for Trusting Us</h2>
              <p className="text-sm text-slate-200 max-w-md leading-relaxed">
                Precision diagnostic analytics, quality-controlled laboratory methodology, and structured patient health dossiers.
              </p>
              <div className="border-t border-white/20 pt-5 mt-2 space-y-1 text-xs text-slate-200">
                <p className="font-bold text-sm text-white">{ss.labName || "OnePath Diagnostic Laboratory"}</p>
                <p>{ss.labAddress}</p>
                {ss.emailAddress && <p>{ss.emailAddress}</p>}
              </div>
              {ss.footerText && <p className="text-xs text-slate-300 mt-2">{ss.footerText}</p>}
            </div>
            <div className="relative z-10 px-16 py-6 flex justify-between text-xs text-slate-300 border-t border-white/15">
              <span>Official Clinical Report Dossier</span>
              <span className="font-mono">Page 5 of 5</span>
            </div>
          </>
        )}

        {ss.exteriorDesign === "exterior-qr" && (
          <div className="flex flex-col justify-between h-full p-14 text-center">
            <div className="pt-6 border-b border-slate-200 pb-4">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Verified Laboratory Document</span>
              <h2 className="text-2xl font-bold text-slate-900">{ss.labName || "OnePath Diagnostic Laboratory"}</h2>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 my-auto">
              <div className="p-6 bg-white border border-slate-300 rounded-xl flex flex-col items-center gap-3">
                <QrCode className="h-32 w-32 text-slate-900" />
                <span className="text-xs font-semibold text-slate-700">Scan to Verify Report Authenticity</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Each laboratory report carries an encrypted record identifier for digital verification.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-1 text-xs text-slate-500">
              <p className="font-semibold text-slate-800">{ss.labAddress}</p>
              <p>{ss.emailAddress || ss.email}</p>
              {ss.footerText && <p className="text-slate-400 text-[11px] pt-1">{ss.footerText}</p>}
              <p className="text-[10px] text-slate-400 font-mono pt-2">Page 5 of 5</p>
            </div>
          </div>
        )}

        {ss.exteriorDesign === "exterior-minimal" && (
          <div className="flex flex-col justify-between h-full p-14">
            <div className="pt-8">
              <div className="h-1 w-14 mb-5" style={{ backgroundColor: tc }} />
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{ss.labName || "OnePath Diagnostic Laboratory"}</h2>
              <p className="text-xs text-slate-500 mt-1">Clinical Pathology &amp; Preventive Diagnostics</p>
            </div>

            <div className="space-y-4 my-auto max-w-md">
              <p className="text-sm text-slate-700 leading-relaxed">
                Thank you for choosing {ss.labName || "OnePath Diagnostic Laboratory"} for your diagnostic evaluation. For clinical queries or test interpretation, please contact our pathology team.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900 block">Laboratory Contact Details</span>
                <p className="text-slate-600">{ss.labAddress}</p>
                <p className="text-slate-600">{ss.emailAddress || ss.email}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 flex justify-between items-center text-xs text-slate-500">
              <span>{ss.footerText || "OnePath Diagnostic Laboratory"}</span>
              <span className="font-mono">Page 5 of 5</span>
            </div>
          </div>
        )}

        {(!ss.exteriorDesign || ss.exteriorDesign === "exterior-none") && (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center my-auto">
            <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 text-slate-500">
              <ShieldAlert className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Back Cover Page Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              Your Smart Report will conclude cleanly on the Guidance &amp; Disclaimer page. Select a back cover option to append a dedicated sign-off or QR verification sheet.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading AI Smart Report Configuration...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full p-3 sm:p-5 lg:p-6 space-y-5">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">AI Smart Report Settings</h1>
              <span className="bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Customizer</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Personalize cover page, interior layout, back cover, and clinical intelligence sections.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-10 px-5 gap-2 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl cursor-pointer w-full sm:w-auto justify-center"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></>
            : saveSuccess
            ? <><Check className="h-4 w-4 text-emerald-300" /><span>Saved!</span></>
            : <><Save className="h-4 w-4" /><span>Save Changes</span></>
          }
        </Button>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Settings */}
        <div className="lg:col-span-6 space-y-5">

          {/* Card: Lab Branding */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-500" /><span>Lab Branding</span>
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">Logo, name &amp; address</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Lab Logo</span>
                  <span className="text-[11px] font-normal text-muted-foreground">(max 8MB)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}
                    className="h-10 rounded-xl gap-2 text-xs font-semibold cursor-pointer border-border hover:bg-muted/50">
                    <Upload className="h-3.5 w-3.5 text-sky-600" /><span>Upload Logo</span>
                  </Button>
                  {ss.logoUrl && (
                    <Button type="button" variant="ghost" size="icon"
                      onClick={() => setSs((p) => ({ ...p, logoUrl: null }))}
                      className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 rounded-xl">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {ss.logoUrl && (
                  <div className="mt-2 p-2 bg-muted/40 rounded-xl border border-border/60 inline-flex items-center gap-2">
                    <img src={ss.logoUrl} alt="Logo" className="h-8 max-w-[140px] object-contain rounded" />
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Lab Name</label>
                <Input value={ss.labName} onChange={(e) => setSs((p) => ({ ...p, labName: e.target.value }))}
                  placeholder="ONEPATH PATHOLOGY LAB" className="h-10 rounded-xl text-sm font-semibold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Lab Address</label>
              <textarea rows={2} value={ss.labAddress} onChange={(e) => setSs((p) => ({ ...p, labAddress: e.target.value }))}
                placeholder="MAIN BAZAR, NEAR CENTRAL SQUARE, NEW DELHI"
                className="w-full rounded-xl border border-input bg-background text-xs px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Email Address</label>
                <Input value={ss.emailAddress} onChange={(e) => setSs((p) => ({ ...p, emailAddress: e.target.value }))}
                  placeholder="info@yourlab.com" className="h-10 rounded-xl text-xs font-medium" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-foreground">Footer Text</label>
                  <span className="text-[10.5px] font-mono text-muted-foreground">{ss.footerText?.length ?? 0}/80</span>
                </div>
                <Input value={ss.footerText} maxLength={80}
                  onChange={(e) => { if (e.target.value.length <= 80) setSs((p) => ({ ...p, footerText: e.target.value })); }}
                  placeholder="For emergency, call our helpline." className="h-10 rounded-xl text-xs" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-1 border-t border-border/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={ss.showLogo} onCheckedChange={(c) => setSs((p) => ({ ...p, showLogo: Boolean(c) }))} />
                <span className="text-xs font-semibold text-foreground">Show Logo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={ss.showAiTag} onCheckedChange={(c) => setSs((p) => ({ ...p, showAiTag: Boolean(c) }))} />
                <span className="text-xs font-semibold text-foreground">AI Generated Tag</span>
              </label>
            </div>
          </div>

          {/* Card: Theme Color */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-500" /><span>Theme Color</span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((col) => {
                const isCur = ss.themeColor?.toLowerCase() === col.value.toLowerCase();
                return (
                  <button key={col.value} type="button" onClick={() => setSs((p) => ({ ...p, themeColor: col.value }))}
                    className={`h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-medium border transition-all cursor-pointer ${
                      isCur ? "border-foreground bg-accent shadow-xs text-foreground font-bold" : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40"
                    }`}>
                    <span className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: col.value }} />
                    <span>{col.name}</span>
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 pl-2 border-l border-border/70">
                <input type="color" value={ss.themeColor} onChange={(e) => setSs((p) => ({ ...p, themeColor: e.target.value }))}
                  className="h-8 w-8 rounded-lg border border-border cursor-pointer p-0.5 bg-background" />
                <Input value={ss.themeColor} onChange={(e) => setSs((p) => ({ ...p, themeColor: e.target.value }))}
                  className="h-8 w-24 text-xs font-mono font-semibold uppercase" maxLength={7} />
              </div>
            </div>
          </div>

          {/* Card: Templates */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-emerald-500" /><span>Report Templates</span>
              </h2>
            </div>
            {/* Sub-tabs */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 w-full sm:w-fit overflow-x-auto flex-nowrap scrollbar-none">
              {(["cover", "interior", "exterior"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setTemplateTab(tab);
                    setPreviewTab(tab);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    templateTab === tab ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "cover" ? "Cover Design" : tab === "interior" ? "Interior Design" : "Exterior / Back Cover"}
                </button>
              ))}
            </div>

            {templateTab === "cover" && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-3">Front cover page visual template for your AI Smart Report.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {COVER_TEMPLATES.map((tpl) => {
                    const isSel = (ss.coverDesign || "cover-classic") === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSs((p) => ({ ...p, coverDesign: tpl.id as any }));
                          setPreviewTab("cover");
                        }}
                        className={`relative rounded-xl border-2 cursor-pointer transition-all select-none ${
                          isSel ? "border-sky-500 bg-sky-500/5 ring-2 ring-sky-500/20" : "border-border/70 bg-card hover:border-sky-400/50"
                        }`}
                      >
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-4 w-4 bg-sky-500 rounded-full flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="h-14 w-full rounded-t-[10px] overflow-hidden border-b border-border/40 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-center">
                          <span className="font-mono text-[11px] font-bold tracking-widest text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-0.5 rounded">{tpl.tag}</span>
                        </div>
                        <div className="p-2 text-center">
                          <span className={`text-[11px] font-bold block ${isSel ? "text-sky-600 dark:text-sky-400" : "text-foreground"}`}>{tpl.label}</span>
                          <span className="text-[9.5px] text-muted-foreground line-clamp-1">{tpl.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {templateTab === "interior" && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-3">Interior layout styling for clinical findings and analysis (pages 2–4).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {INTERIOR_TEMPLATES.map((tpl) => {
                    const isSel = (ss.interiorDesign || "interior-clean") === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSs((p) => ({ ...p, interiorDesign: tpl.id as any }));
                          setPreviewTab("interior");
                        }}
                        className={`relative rounded-xl border-2 cursor-pointer transition-all select-none flex gap-3 items-start p-3 ${
                          isSel ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20" : "border-border/70 bg-card hover:border-emerald-400/50"
                        }`}
                      >
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="h-12 w-12 shrink-0 rounded-md bg-slate-50 dark:bg-zinc-900 border border-border/60 flex items-center justify-center font-mono text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300">{tpl.tag}</div>
                        <div>
                          <span className={`text-[11px] font-bold block ${isSel ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{tpl.label}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">{tpl.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {templateTab === "exterior" && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-3">Back cover / final page design (optional 5th page).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {EXTERIOR_TEMPLATES.map((tpl) => {
                    const isSel = (ss.exteriorDesign || "exterior-none") === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSs((p) => ({ ...p, exteriorDesign: tpl.id as any }));
                          setPreviewTab("exterior");
                        }}
                        className={`relative rounded-xl border-2 cursor-pointer transition-all select-none flex gap-3 items-start p-3 ${
                          isSel ? "border-violet-500 bg-violet-500/5 ring-2 ring-violet-500/20" : "border-border/70 bg-card hover:border-violet-400/50"
                        }`}
                      >
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-4 w-4 bg-violet-500 rounded-full flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="h-12 w-12 shrink-0 rounded-md bg-slate-50 dark:bg-zinc-900 border border-border/60 flex items-center justify-center font-mono text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300">{tpl.tag}</div>
                        <div>
                          <span className={`text-[11px] font-bold block ${isSel ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>{tpl.label}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">{tpl.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card: Intelligence Sections */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-rose-500" /><span>Intelligence Sections</span>
              </h2>
              <span className="text-[11px] text-muted-foreground">Toggle AI-generated sections</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: "showExecutiveSummary",  label: "Doctor's Summary",     desc: "Plain-language AI health overview" },
                { key: "showOrganHealthGauges", label: "Organ Health Gauges",  desc: "Blood, Liver, Kidney, Metabolism" },
                { key: "showDietLifestyleTips", label: "Diet & Lifestyle Tips",desc: "Foods to include & healthy habits" },
                { key: "showHistoryGraph",       label: "Test History Graph",   desc: "Historical parameter trends" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer select-none transition-colors">
                  <Checkbox
                    checked={!!(ss as any)[item.key]}
                    onCheckedChange={(c) => setSs((p) => ({ ...p, [item.key]: Boolean(c) }))}
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">{item.label}</span>
                    <span className="text-[10.5px] text-muted-foreground">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Card: Disclaimer Rich Text */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" /><span>Disclaimer &amp; Legal Notice</span>
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">Rich text editor</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Clinical correlation and legal liability disclosure printed on the final report page.
              Supports <strong>bold</strong>, <em>italic</em>, bullet lists, and alignment.
            </p>
            <div className="rounded-xl border border-border/80 overflow-hidden bg-background">
              <TipTapEditor
                value={ss.disclaimerText || ss.disclaimer || ""}
                onChange={(html) => setSs((p) => ({ ...p, disclaimerText: html, disclaimer: html }))}
                title="Disclaimer & Legal Notice"
                hideHeader={true}
                hideFooter={true}
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Preview */}
        <div className="lg:col-span-6 sticky top-6 space-y-3">

          {/* Preview Toolbar */}
          <div className="bg-card border border-border/80 p-3 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
              {(["cover", "interior", "exterior"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setPreviewTab(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize ${
                    previewTab === tab ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab === "cover" ? "Cover" : tab === "interior" ? "Interior" : "Back Cover"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPreviewScale((p) => Math.max(0.35, Number((p - 0.05).toFixed(2))))}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono font-bold w-12 text-center text-foreground">{Math.round(previewScale * 100)}%</span>
              <button type="button" onClick={() => setPreviewScale((p) => Math.min(1.2, Number((p + 0.05).toFixed(2))))}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPreviewScale(0.70)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* A4 Canvas Viewport (Document Mat) */}
          <div
            className="bg-slate-200/80 dark:bg-zinc-900/90 p-4 sm:p-6 rounded-2xl overflow-auto flex justify-center items-start border border-border/80 shadow-inner"
            style={{ minHeight: 640 }}
          >
            <div
              className="transition-all duration-200"
              style={{
                width: Math.round(794 * previewScale),
                height: Math.round(1123 * previewScale),
                overflow: "hidden",
                boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: 794,
                  height: 1123,
                }}
              >
                {previewTab === "cover" && <CoverPagePreview />}
                {previewTab === "interior" && <InteriorPagePreview />}
                {previewTab === "exterior" && <ExteriorPagePreview />}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-card border border-border/80 rounded-xl px-4 py-3 text-xs text-muted-foreground flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 font-medium"><span className="h-2 w-2 rounded-full bg-sky-500" />Cover Page</span>
            <span className="flex items-center gap-1.5 font-medium"><span className="h-2 w-2 rounded-full bg-emerald-500" />Interior Pages (2–4)</span>
            <span className="flex items-center gap-1.5 font-medium"><span className="h-2 w-2 rounded-full bg-violet-500" />Back Cover (optional)</span>
          </div>

        </div>
      </div>
    </div>
  );
}
