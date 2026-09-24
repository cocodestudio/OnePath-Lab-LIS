
const fs = require('fs');
const path = require('path');

const content = `"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Save, Upload, Check, CheckCircle2, Trash2,
  ZoomIn, ZoomOut, RotateCcw, Palette, FileText, Activity,
  HeartPulse, Apple, ShieldAlert, Loader2, Stethoscope,
  Layers, LayoutTemplate, Bold, Italic, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, clearApiCache } from "@/lib/api-client";
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
  { id: "cover-classic",  label: "Classic Medical",    desc: "Stethoscope + Plus Accents",  icon: "🩺" },
  { id: "cover-modern",   label: "Modern Abstract",    desc: "Large Gradient Bubble",        icon: "✨" },
  { id: "cover-tech",     label: "High-Tech Lab",      desc: "Dark Hexagonal Matrix",        icon: "🔬" },
  { id: "cover-wellness", label: "Corporate Wellness", desc: "Dual Accent Health",           icon: "❤️" },
  { id: "cover-gradient", label: "Gradient Cover",     desc: "Full bleed gradient hero",     icon: "🌈" },
  { id: "cover-minimal",  label: "Clean Minimal",      desc: "Ultra minimal typography",     icon: "📋" },
];

const INTERIOR_TEMPLATES = [
  { id: "interior-clean",   label: "Clinical Clean",    desc: "Minimal whitespace focused",    icon: "📄" },
  { id: "interior-premium", label: "Premium Bordered",  desc: "Double-ruled bordered layout",  icon: "📑" },
  { id: "interior-accent",  label: "Accent Sidebar",    desc: "Colored left accent border",    icon: "📌" },
  { id: "interior-card",    label: "Card Layout",       desc: "Rounded card sections",         icon: "🗂️" },
];

const EXTERIOR_TEMPLATES = [
  { id: "exterior-none",     label: "No Back Cover",  desc: "Standard 4-page report",     icon: "🚫" },
  { id: "exterior-gradient", label: "Gradient Outro", desc: "Bold gradient back cover",    icon: "🌅" },
  { id: "exterior-qr",       label: "QR + Contact",   desc: "QR code and contact info",    icon: "📱" },
  { id: "exterior-minimal",  label: "Minimal Footer", desc: "Clean sign-off page",         icon: "📋" },
];

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={\`p-1.5 rounded-md text-xs transition-colors cursor-pointer \${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }\`}
    >
      {children}
    </button>
  );
}

function RichTextEditor({ value, onChange, placeholder }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInit = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInit.current) {
      editorRef.current.innerHTML = value || "";
      isInit.current = true;
    }
  }, [value]);

  const exec = useCallback((cmd: string) => {
    document.execCommand(cmd, false, undefined);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const isActive = (cmd: string) => { try { return document.queryCommandState(cmd); } catch { return false; } };

  return (
    <div className="rounded-xl border border-border/80 overflow-hidden bg-background focus-within:ring-2 focus-within:ring-ring/30">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/60 bg-muted/30">
        <ToolbarBtn onClick={() => exec("bold")} active={isActive("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} active={isActive("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <ToolbarBtn onClick={() => exec("justifyLeft")} active={isActive("justifyLeft")} title="Left"><AlignLeft className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyCenter")} active={isActive("justifyCenter")} title="Center"><AlignCenter className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyRight")} active={isActive("justifyRight")} title="Right"><AlignRight className="h-3.5 w-3.5" /></ToolbarBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullets"><List className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("insertOrderedList")} title="Numbers"><ListOrdered className="h-3.5 w-3.5" /></ToolbarBtn>
        <div className="w-px h-4 bg-border/60 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); if (editorRef.current) { editorRef.current.innerHTML = ""; onChange(""); } }}
          title="Clear All"
          className="p-1.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer text-rose-500 hover:bg-rose-500/10"
        >CLR</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (editorRef.current) onChange(editorRef.current.innerHTML); }}
        data-placeholder={placeholder}
        className="min-h-[160px] max-h-[280px] overflow-y-auto px-4 py-3 text-xs leading-relaxed text-foreground outline-none custom-scrollbar"
        style={{ fontFamily: "inherit" }}
      />
      <style jsx>{\`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          display: block;
        }
        [contenteditable] ul { list-style: disc; padding-left: 1.2rem; margin: 0.25rem 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.2rem; margin: 0.25rem 0; }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] i, [contenteditable] em { font-style: italic; }
      \`}</style>
    </div>
  );
}

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
      if (window.innerWidth < 1280) setPreviewScale(0.58);
      if (window.innerWidth < 768) setPreviewScale(0.44);
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
      clearApiCache();
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
    return (
      <div
        className="w-[794px] bg-white text-zinc-900 shadow-2xl relative flex flex-col justify-between overflow-hidden"
        style={{ fontFamily: "'Inter',sans-serif", height: 1123 }}
      >
        {/* Design Accents */}
        {ss.coverDesign === "cover-classic" && (
          <>
            <div className="absolute top-10 right-10 text-6xl font-black opacity-15 select-none" style={{ color: tc }}>+</div>
            <div className="absolute top-40 left-8 text-5xl font-black opacity-15 select-none" style={{ color: tc }}>+</div>
            <div className="absolute bottom-44 right-14 text-7xl font-black opacity-10 select-none" style={{ color: tc }}>+</div>
          </>
        )}
        {(!ss.coverDesign || ss.coverDesign === "cover-modern") && (
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-bl-full opacity-10" style={{ backgroundColor: tc }} />
        )}
        {ss.coverDesign === "cover-tech" && <div className="absolute top-0 left-0 right-0 h-3" style={{ backgroundColor: tc }} />}
        {ss.coverDesign === "cover-wellness" && <div className="absolute top-0 left-0 right-0 h-24 opacity-10" style={{ background: \`linear-gradient(135deg,\${tc},transparent)\` }} />}
        {ss.coverDesign === "cover-gradient" && <div className="absolute top-0 left-0 right-0 h-72 opacity-15" style={{ background: \`linear-gradient(180deg,\${tc},transparent)\` }} />}
        {ss.coverDesign === "cover-minimal" && <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: tc }} />}

        {/* Header */}
        <div className="pt-10 px-12 flex items-center justify-between z-10">
          {ss.showLogo && ss.logoUrl
            ? <img src={ss.logoUrl} alt="Logo" className="h-14 max-w-[260px] object-contain" />
            : <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: tc }}>+</div>
                <span className="font-extrabold text-base tracking-wide text-zinc-800">{ss.labName || "LABORATORY"}</span>
              </div>
          }
          {ss.showAiTag && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border tracking-wide uppercase"
              style={{ backgroundColor: \`\${tc}12\`, borderColor: \`\${tc}40\`, color: tc }}>
              <Sparkles className="h-3 w-3" /><span>AI Smart Report</span>
            </div>
          )}
        </div>

        {/* Center */}
        <div className="my-auto px-12 text-center flex flex-col items-center z-10 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] block mb-2" style={{ color: tc }}>Comprehensive Health Intelligence</span>
            <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">SMART<br />HEALTH REPORT</h1>
          </div>
          <div className="my-2 relative">
            {(!ss.coverDesign || ss.coverDesign === "cover-classic") && (
              <div className="relative">
                <div className="absolute -inset-4 opacity-15 rounded-3xl" style={{ backgroundColor: tc }} />
                <div className="w-52 h-60 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative shadow-md">
                  <Stethoscope className="h-20 w-20 opacity-25 stroke-[1.5]" style={{ color: tc }} />
                  <div className="absolute bottom-3 bg-white/90 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700">Verified Pathologist Review</div>
                </div>
              </div>
            )}
            {ss.coverDesign === "cover-modern" && (
              <div className="w-52 h-56 mx-auto rounded-3xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-50 to-white">
                <Activity className="h-16 w-16 mb-2" style={{ color: tc }} />
                <span className="text-xs font-bold text-zinc-700">Biomarker Analytics Matrix</span>
              </div>
            )}
            {ss.coverDesign === "cover-tech" && (
              <div className="w-60 h-52 mx-auto rounded-2xl bg-zinc-900 text-white p-5 flex flex-col justify-between text-left shadow-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono tracking-widest text-sky-400">HIGH-TECH DIAGNOSTIC</span>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
                <div><span className="text-xl font-bold block">Biochemical Profiling</span><span className="text-xs text-zinc-400">Cellular Biomarker Evaluation</span></div>
                <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden"><div className="h-full w-4/5 rounded-full" style={{ backgroundColor: tc }} /></div>
              </div>
            )}
            {ss.coverDesign === "cover-wellness" && (
              <div className="w-56 h-52 mx-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-md flex flex-col items-center justify-center text-center">
                <HeartPulse className="h-16 w-16 mb-2" style={{ color: tc }} />
                <span className="text-base font-bold text-zinc-800">Preventive Wellness Index</span>
                <span className="text-xs text-zinc-500 mt-1">Holistic Health Biomarkers</span>
              </div>
            )}
            {ss.coverDesign === "cover-gradient" && (
              <div className="w-60 h-56 mx-auto rounded-2xl flex flex-col items-center justify-center text-white shadow-xl"
                style={{ background: \`linear-gradient(135deg,\${tc},\${tc}88)\` }}>
                <Sparkles className="h-14 w-14 mb-3 opacity-80" />
                <span className="font-extrabold text-lg tracking-wide">Health Intelligence</span>
                <span className="text-xs opacity-70 mt-1">AI-Powered Diagnostics</span>
              </div>
            )}
            {ss.coverDesign === "cover-minimal" && (
              <div className="w-60 h-52 mx-auto rounded-xl border-2 border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                <div className="flex gap-2 items-center">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tc }} />
                  <span className="text-xs font-bold text-zinc-600">Minimal Clean Report</span>
                </div>
                <div className="space-y-2">
                  <div className="h-px bg-zinc-200 w-full" /><div className="h-px bg-zinc-200 w-3/4" /><div className="h-px bg-zinc-200 w-1/2" />
                </div>
                <div className="h-1 w-full rounded-full" style={{ backgroundColor: tc }} />
              </div>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 w-full max-w-md text-left shadow-xs">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block">Patient Name</span><span className="font-extrabold text-zinc-800 text-sm">Mr. Rajesh Kumar</span></div>
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block">File No.</span><span className="font-mono font-bold text-zinc-800">PID-2026-8888</span></div>
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block">Age / Gender</span><span className="font-semibold text-zinc-700">42 Y / Male</span></div>
              <div><span className="text-[10px] uppercase font-bold text-zinc-400 block">Report Date</span><span className="font-semibold text-zinc-700">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/70 text-center text-xs space-y-1 z-10">
          <p className="font-extrabold text-zinc-800 tracking-wide uppercase text-sm">{ss.labName || "ONEPATH LABORATORY"}</p>
          <p className="text-zinc-500 text-[11px] max-w-lg mx-auto">{ss.labAddress || "Main Bazar, Near Central Square, New Delhi"}</p>
          {ss.emailAddress && <p className="font-medium text-[11px]" style={{ color: tc }}>{ss.emailAddress}</p>}
          {ss.footerText && <p className="text-[10px] text-zinc-400 italic pt-1">{ss.footerText}</p>}
        </div>
      </div>
    );
  }

  // ── Interior Page Preview ─────────────────────────────────────────────────
  function InteriorPagePreview() {
    return (
      <div
        className="w-[794px] bg-white text-zinc-900 shadow-2xl relative flex flex-col justify-between"
        style={{ fontFamily: "'Inter',sans-serif", height: 1123, padding: "40px" }}
      >
        <div>
          <div className="flex items-center justify-between border-b-2 pb-4 mb-5" style={{ borderColor: tc }}>
            <div>
              <h2 className="text-xl font-black text-zinc-800 tracking-tight">{ss.labName || "ONEPATH LAB"}</h2>
              <p className="text-[11px] text-zinc-500">{ss.labAddress}</p>
            </div>
            <div className="text-right text-[11px] text-zinc-600">
              <span className="font-bold text-zinc-800 block">AI Smart Health Summary</span>
              <span>{ss.emailAddress}</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs mb-5">
            <div>
              <span className="font-bold text-zinc-800 text-sm">Mr. Rajesh Kumar</span>
              <span className="text-zinc-500 ml-2">42 Y / Male · Ref: Dr. Ananya Sharma</span>
            </div>
            <div className="font-mono text-[11px] font-semibold text-zinc-600">
              ID: PID-2026-8888 · {new Date().toLocaleDateString("en-IN")}
            </div>
          </div>

          {ss.interiorDesign === "interior-accent" && (
            <div className="border-l-4 pl-4 mb-4 py-2" style={{ borderColor: tc }}>
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: tc }}>Clinical Intelligence Report</span>
            </div>
          )}

          {ss.showOrganHealthGauges && (
            <div className="mb-5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" style={{ color: tc }} /><span>Organ Health Analysis</span>
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { name: "Blood & Immunity", score: 88, s: "Normal", c: "#10b981" },
                  { name: "Liver Function",   score: 94, s: "Optimal", c: "#10b981" },
                  { name: "Kidney Health",    score: 85, s: "Normal", c: "#10b981" },
                  { name: "Metabolism",       score: 58, s: "Needs Care", c: "#f59e0b" },
                ].map((org) => (
                  <div key={org.name} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                    <span className="text-[10px] font-bold text-zinc-600 block truncate">{org.name}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-black text-zinc-800">{org.score}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: \`\${org.c}18\`, color: org.c }}>{org.s}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: \`\${org.score}%\`, backgroundColor: org.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ss.showExecutiveSummary && (
            <div className="rounded-xl p-3.5 mb-5 border text-xs" style={{ backgroundColor: \`\${tc}08\`, borderColor: \`\${tc}30\` }}>
              <span className="font-bold block text-sm mb-1" style={{ color: tc }}>✨ Executive Clinical Summary</span>
              <p className="text-zinc-600 leading-relaxed text-[11.5px]">
                Biochemical tests demonstrate healthy liver and renal function. Fasting blood glucose is mildly elevated indicating early impaired glucose tolerance. Hemoglobin is within normal range.
              </p>
            </div>
          )}

          <div className="space-y-2.5 mb-4">
            <div className="border border-rose-200 rounded-xl p-3 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="font-bold text-xs text-zinc-800">Fasting Blood Sugar (Glucose)</span>
                </div>
                <span className="font-bold font-mono text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">128.0 mg/dL · HIGH</span>
              </div>
              <p className="text-[11px] text-zinc-600 pl-4 border-l-2 border-rose-200">
                <strong>Root Causes:</strong> Increased carbohydrate intake, reduced physical activity, or insulin resistance.
              </p>
            </div>
            <div className="border border-emerald-200 rounded-xl p-2.5 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-xs text-zinc-800">Hemoglobin (Hb)</span>
              </div>
              <span className="font-bold font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">14.2 g/dL (Ref: 13-17) · NORMAL</span>
            </div>
          </div>

          {ss.showDietLifestyleTips && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-zinc-700">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                <Apple className="h-3.5 w-3.5 text-emerald-600" /><span>Diet &amp; Lifestyle Guidance</span>
              </span>
              <p className="text-[11px]"><strong className="text-emerald-700">Focus On:</strong> Green leafy vegetables, oats, whole grains, nuts, adequate hydration (2.5L daily).</p>
            </div>
          )}
        </div>

        <div className="border-t pt-3 text-[9.5px] text-zinc-500 flex justify-between items-center">
          <p className="text-zinc-600 font-medium truncate max-w-[70%]">
            {(ss.disclaimerText || "This report is for informational and clinical correlation purposes only.").replace(/<[^>]+>/g, "").slice(0, 100)}...
          </p>
          <span>Page 2 / 4</span>
        </div>
      </div>
    );
  }

  // ── Exterior/Back Cover Preview ───────────────────────────────────────────
  function ExteriorPagePreview() {
    return (
      <div
        className="w-[794px] bg-white text-zinc-900 shadow-2xl relative flex flex-col overflow-hidden"
        style={{ fontFamily: "'Inter',sans-serif", height: 1123 }}
      >
        {ss.exteriorDesign === "exterior-gradient" && (
          <>
            <div className="absolute inset-0" style={{ background: \`linear-gradient(135deg,\${tc}f0,\${tc}60)\` }} />
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-16 gap-6">
              <Sparkles className="h-12 w-12 opacity-80" />
              <h2 className="text-3xl font-extrabold tracking-tight">Thank You</h2>
              <p className="text-lg opacity-80 font-medium">Your Health, Our Priority</p>
              <div className="w-24 h-0.5 bg-white/50 rounded-full" />
              <p className="text-sm opacity-70">{ss.labName || "OnePath Laboratory"}</p>
            </div>
          </>
        )}
        {ss.exteriorDesign === "exterior-qr" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-16 text-center">
            <div className="h-20 w-20 border-2 rounded-xl flex items-center justify-center" style={{ borderColor: tc }}>
              <span className="text-3xl">📱</span>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-800">Scan to Verify Report</h2>
              <p className="text-sm text-zinc-500 mt-1">{ss.labName || "OnePath Laboratory"}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{ss.emailAddress}</p>
            </div>
            {ss.footerText && <p className="text-xs text-zinc-400 italic">{ss.footerText}</p>}
          </div>
        )}
        {ss.exteriorDesign === "exterior-minimal" && (
          <div className="flex flex-col justify-end h-full p-14">
            <div className="h-px mb-6" style={{ backgroundColor: tc }} />
            <p className="font-extrabold text-zinc-800 text-xl tracking-wide uppercase">{ss.labName || "ONEPATH LABORATORY"}</p>
            <p className="text-zinc-500 text-sm mt-1">{ss.labAddress}</p>
            {ss.emailAddress && <p className="text-sm font-medium mt-1" style={{ color: tc }}>{ss.emailAddress}</p>}
          </div>
        )}
        {(!ss.exteriorDesign || ss.exteriorDesign === "exterior-none") && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-300">
            <ShieldAlert className="h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No back cover page selected</p>
            <p className="text-xs text-zinc-400">Report will end after page 4</p>
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
    <div className="max-w-[1680px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">AI Smart Report Settings</h1>
              <span className="bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Customizer</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Personalize cover page, interior layout, back cover, and clinical intelligence sections.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-10 px-5 gap-2 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl cursor-pointer"
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
                    className={\`h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-medium border transition-all cursor-pointer \${
                      isCur ? "border-foreground bg-accent shadow-xs text-foreground font-bold" : "border-border/80 bg-background text-muted-foreground hover:bg-muted/40"
                    }\`}>
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
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 w-fit">
              {(["cover", "interior", "exterior"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setTemplateTab(tab)}
                  className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize \${
                    templateTab === tab ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }\`}>
                  {tab}
                </button>
              ))}
            </div>

            {templateTab === "cover" && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-3">Front cover page design for your AI Smart Report.</p>
                <div className="grid grid-cols-3 gap-3">
                  {COVER_TEMPLATES.map((tpl) => {
                    const isSel = (ss.coverDesign || "cover-classic") === tpl.id;
                    return (
                      <div key={tpl.id} onClick={() => setSs((p) => ({ ...p, coverDesign: tpl.id as any }))}
                        className={\`relative rounded-xl border-2 cursor-pointer transition-all select-none \${
                          isSel ? "border-sky-500 bg-sky-500/5 ring-2 ring-sky-500/20" : "border-border/70 bg-card hover:border-sky-400/50"
                        }\`}>
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-4 w-4 bg-sky-500 rounded-full flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="h-16 w-full rounded-t-[10px] overflow-hidden border-b border-border/40 bg-white flex items-center justify-center">
                          <span className="text-2xl">{tpl.icon}</span>
                        </div>
                        <div className="p-2 text-center">
                          <span className={\`text-[11px] font-bold block \${isSel ? "text-sky-600 dark:text-sky-400" : "text-foreground"}\`}>{tpl.label}</span>
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
                <p className="text-[11px] text-muted-foreground mb-3">Interior layout style for report pages 2–4.</p>
                <div className="grid grid-cols-2 gap-3">
                  {INTERIOR_TEMPLATES.map((tpl) => {
                    const isSel = (ss.interiorDesign || "interior-clean") === tpl.id;
                    return (
                      <div key={tpl.id} onClick={() => setSs((p) => ({ ...p, interiorDesign: tpl.id as any }))}
                        className={\`relative rounded-xl border-2 cursor-pointer transition-all select-none flex gap-3 items-start p-3 \${
                          isSel ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20" : "border-border/70 bg-card hover:border-emerald-400/50"
                        }\`}>
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="h-14 w-14 shrink-0 rounded-md bg-zinc-50 border border-border/60 flex items-center justify-center text-2xl">{tpl.icon}</div>
                        <div>
                          <span className={\`text-[11px] font-bold block \${isSel ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}\`}>{tpl.label}</span>
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
                <p className="text-[11px] text-muted-foreground mb-3">Back cover / final page design (optional, printed last).</p>
                <div className="grid grid-cols-2 gap-3">
                  {EXTERIOR_TEMPLATES.map((tpl) => {
                    const isSel = (ss.exteriorDesign || "exterior-none") === tpl.id;
                    return (
                      <div key={tpl.id} onClick={() => setSs((p) => ({ ...p, exteriorDesign: tpl.id as any }))}
                        className={\`relative rounded-xl border-2 cursor-pointer transition-all select-none flex gap-3 items-start p-3 \${
                          isSel ? "border-violet-500 bg-violet-500/5 ring-2 ring-violet-500/20" : "border-border/70 bg-card hover:border-violet-400/50"
                        }\`}>
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-4 w-4 bg-violet-500 rounded-full flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="h-14 w-14 shrink-0 rounded-md bg-zinc-50 border border-border/60 flex items-center justify-center text-2xl">{tpl.icon}</div>
                        <div>
                          <span className={\`text-[11px] font-bold block \${isSel ? "text-violet-600 dark:text-violet-400" : "text-foreground"}\`}>{tpl.label}</span>
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
            <RichTextEditor
              value={ss.disclaimerText || ss.disclaimer || ""}
              onChange={(html) => setSs((p) => ({ ...p, disclaimerText: html, disclaimer: html }))}
              placeholder="Enter your clinical disclaimer, liability statement, or legal notice here..."
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Live Preview */}
        <div className="lg:col-span-6 sticky top-6 space-y-3">

          {/* Preview Toolbar */}
          <div className="bg-card border border-border/80 p-3 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
              {(["cover", "interior", "exterior"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setPreviewTab(tab)}
                  className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer capitalize \${
                    previewTab === tab ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }\`}>
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

          {/* A4 Canvas */}
          <div
            className="bg-zinc-800/90 dark:bg-zinc-950 p-4 sm:p-5 rounded-2xl overflow-hidden flex justify-center items-start shadow-inner border border-zinc-700/60"
            style={{ minHeight: 600 }}
          >
            <div className="origin-top transition-transform duration-200" style={{ transform: \`scale(\${previewScale})\`, width: 794 }}>
              {previewTab === "cover" && <CoverPagePreview />}
              {previewTab === "interior" && <InteriorPagePreview />}
              {previewTab === "exterior" && <ExteriorPagePreview />}
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
`;

const targetPath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'smart-report', 'page.tsx');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('SUCCESS: Written', content.length, 'bytes to', targetPath);
