"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportSheet, type ReportSheetData, type PrintSettings } from "@/components/report-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, AlertCircle, Printer } from "lucide-react";
import { PrintPreviewDialog } from "@/components/print-preview-dialog";
import { fetchFromLaravel, getCleanLetterheadUrl } from "@/lib/api-client";

const defaultPrintSettings: PrintSettings = {
  bgImage: null, headerHeight: 185, footerHeight: 95, marginLeft: 32, marginRight: 32
};

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const [report, setReport] = useState<ReportSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [sheetScale, setSheetScale] = useState<number>(1);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 840) {
          const targetScale = Math.min(1, (window.innerWidth - 32) / 826);
          setSheetScale(Math.max(0.4, Number(targetScale.toFixed(2))));
        } else {
          setSheetScale(1);
        }
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => { 
    if (reportId) fetchReport(); 
    const handleFocus = () => {
      if (reportId) fetchReport();
    };
    const handleSettingsUpdated = () => {
      if (reportId) fetchReport();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("lis_settings_updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("lis_settings_updated", handleSettingsUpdated);
    };
  }, [reportId]);

  const triggerPrint = () => {
    setShowPrintOptions(true);
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel(`/reports/${reportId}`, { skipCache: true });
      setReport({
        ...data,
        lab: data.lab ? {
          ...data.lab,
          printBgImage: getCleanLetterheadUrl(data.lab.printBgImage || data.lab.print_bg_image),
        } : { name: "OnePath Lab Main", email: "info@onepathlab.com", address: "123 Healthcare Blvd, Medical District, Delhi", logoUrl: "/onepath-logo.png", printBgImage: null },
      });
      if (data.lab) {
        setPrintSettings({
          bgImage: getCleanLetterheadUrl(data.lab.printBgImage || data.lab.print_bg_image),
          headerHeight: data.lab.printHeaderHeight ?? data.lab.print_header_height ?? 185,
          footerHeight: data.lab.printFooterHeight ?? data.lab.print_footer_height ?? 95,
          marginLeft: data.lab.printMarginLeft ?? data.lab.print_margin_left ?? 32,
          marginRight: data.lab.printMarginRight ?? data.lab.print_margin_right ?? 32,
        });
      }
    } catch {
      setError("Failed to retrieve report data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in p-6">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[600px] w-full max-w-4xl mx-auto rounded-xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 max-w-lg mx-auto text-center p-8 mt-10">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">Retrieval Error</h2>
        <p className="text-sm text-muted-foreground mb-5">{error || "Report not found."}</p>
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/dashboard/reports");
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/70 no-print shadow-card">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 cursor-pointer"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard/reports");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground leading-tight truncate">{report.patient.name}</h2>
            <p className="text-xs text-muted-foreground truncate">File {report.customId} · {report.status}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/reports/${report.id}/edit`}>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer text-xs font-semibold">
              <Edit className="h-3.5 w-3.5" /> Edit Results
            </Button>
          </Link>
          <Button onClick={triggerPrint} size="sm" className="h-9 gap-1.5 cursor-pointer gradient-primary text-primary-foreground text-xs font-bold shadow-xs">
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Mobile Zoom & Fit Controls */}
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground sm:hidden">
        <span>Touch or drag to pan report sheet</span>
        <div className="flex items-center gap-1.5 bg-card border border-border/80 px-2 py-1 rounded-lg">
          <button
            type="button"
            onClick={() => setSheetScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
            className="px-2 py-0.5 font-bold hover:text-foreground cursor-pointer"
          >
            -
          </button>
          <span className="font-mono font-bold text-foreground">{Math.round(sheetScale * 100)}%</span>
          <button
            type="button"
            onClick={() => setSheetScale((s) => Math.min(1.5, Number((s + 0.1).toFixed(1))))}
            className="px-2 py-0.5 font-bold hover:text-foreground cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              const targetScale = Math.min(1, (window.innerWidth - 32) / 826);
              setSheetScale(Math.max(0.4, Number(targetScale.toFixed(2))));
            }}
            className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded cursor-pointer"
          >
            Fit
          </button>
        </div>
      </div>

      {/* A4 sheet preview with 4-way pan and scaling */}
      <div className="bg-white dark:bg-zinc-950 border border-border/70 rounded-xl shadow-card p-2 sm:p-4 overflow-auto sheet-pan-canvas flex justify-center custom-scrollbar">
        {report && (
          <ReportSheet
            ref={reportRef}
            report={report}
            settings={printSettings}
            scale={sheetScale}
          />
        )}
      </div>

      <PrintPreviewDialog 
        open={showPrintOptions} 
        onOpenChange={setShowPrintOptions} 
        report={report} 
      />
    </div>
  );
}
