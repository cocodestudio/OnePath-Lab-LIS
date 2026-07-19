"use client";

import React, { useState, useEffect } from "react";
import { Settings, Upload, X, Loader2, Save, Printer, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSheet, type PrintSettings, type ReportSheetData } from "@/components/report-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchFromLaravel } from "@/lib/api-client";

const defaultPrintSettings: PrintSettings = {
  bgImage: null, headerHeight: 40, footerHeight: 40, marginLeft: 40, marginRight: 40
};

const dummyReport: ReportSheetData = {
  id: "dummy", customId: "REP-2026-9999", status: "COMPLETED", createdAt: new Date().toISOString(),
  patient: { name: "Rajesh Kumar", age: 42, gender: "Male", phone: "+91 98765 43210", refDoctor: "Dr. Ananya Sharma", customId: "LAB-2026-9999", address: "45 MG Road, Connaught Place, New Delhi" },
  lab: { name: "OnePath Lab Main", email: "info@onepathlab.com", address: "123 Healthcare Blvd, Medical District, Delhi", logoUrl: "/onepath-logo.png" },
  results: [
    { id: "r1", resultValue: "14.5", isAbnormal: false, test: { id: "t1", name: "Hemoglobin", category: "Hematology", price: 0, unit: "g/dL", refRangeMin: 13.0, refRangeMax: 17.0 } },
    { id: "r2", resultValue: "5.2", isAbnormal: true, test: { id: "t2", name: "RBC Count", category: "Hematology", price: 0, unit: "mill/µL", refRangeMin: 4.5, refRangeMax: 5.0 } }
  ]
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await fetchFromLaravel("/lab");
      setSettings({
        bgImage: data.printBgImage || null,
        headerHeight: data.printHeaderHeight ?? 40,
        footerHeight: data.printFooterHeight ?? 40,
        marginLeft: data.printMarginLeft ?? 40,
        marginRight: data.printMarginRight ?? 40,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, bgImage: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await fetchFromLaravel("/lab", {
        method: "PUT",
        body: JSON.stringify({
          printBgImage: settings.bgImage,
          printHeaderHeight: settings.headerHeight,
          printFooterHeight: settings.footerHeight,
          printMarginLeft: settings.marginLeft,
          printMarginRight: settings.marginRight,
        }),
      });
      setMessage({ text: "Lab settings saved successfully.", type: "success" });
    } catch (e) {
      setMessage({ text: "A network error occurred.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Configuration</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          Lab Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your lab preferences and report layout.</p>
      </div>

      <div className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60 bg-muted/20 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-elevated">
            <Printer className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground leading-tight">Report Print Layout</h2>
            <p className="text-xs text-muted-foreground">Configure margins and upload a letterhead background for PDF outputs.</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">Background Letterhead</label>
            <p className="text-sm text-muted-foreground mb-4">Upload a full-page image (like a scanned letterhead) to be printed behind the report results. JPG or PNG format.</p>

            {settings.bgImage ? (
              <div className="relative w-full max-w-lg h-64 bg-muted rounded-xl border border-border overflow-hidden group shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.bgImage} className="w-full h-full object-contain" alt="Background Preview" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => setSettings(prev => ({ ...prev, bgImage: null }))} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-elevated hover:bg-destructive/90 flex items-center gap-2 transition-transform active:scale-95">
                    <X className="h-4 w-4" /> Remove Background
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full max-w-lg h-48 border-2 border-dashed border-border/80 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/60 transition-all hover:border-primary/50 group">
                <div className="h-12 w-12 bg-background shadow-sm border border-border rounded-full flex items-center justify-center mb-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-foreground">Click to upload letterhead</span>
                <span className="text-xs text-muted-foreground mt-1.5">Maximum size: 3MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <div className="pt-6 border-t border-border/60">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-4">Print Margins (Pixels)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Top Margin (Header)</label>
                <input type="number" className="w-full bg-background border border-border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 font-mono transition-all" value={settings.headerHeight} onChange={e => setSettings(prev => ({ ...prev, headerHeight: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bottom Margin (Footer)</label>
                <input type="number" className="w-full bg-background border border-border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 font-mono transition-all" value={settings.footerHeight} onChange={e => setSettings(prev => ({ ...prev, footerHeight: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Left Margin</label>
                <input type="number" className="w-full bg-background border border-border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 font-mono transition-all" value={settings.marginLeft} onChange={e => setSettings(prev => ({ ...prev, marginLeft: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Right Margin</label>
                <input type="number" className="w-full bg-background border border-border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 font-mono transition-all" value={settings.marginRight} onChange={e => setSettings(prev => ({ ...prev, marginRight: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 px-6 py-4 border-t border-border/60 flex items-center justify-between">
          <div>
            {message && (
              <span className={`text-sm font-medium ${message.type === 'error' ? 'text-destructive' : 'text-primary'}`}>
                {message.text}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="bg-accent text-accent-foreground font-semibold px-4 py-2.5 rounded-lg border border-border/80 transition-all hover:bg-muted active:scale-[0.99] flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview Layout
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
                  <DialogTitle>Report Layout Preview</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto bg-muted p-4 sm:p-8">
                  <div className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 mx-auto w-[794px] bg-white">
                    <ReportSheet report={dummyReport} settings={settings} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-lg ring-inset-top transition-all hover:-translate-y-px active:scale-[0.99] flex items-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
