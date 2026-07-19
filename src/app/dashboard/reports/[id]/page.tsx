"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportSheet, type ReportSheetData, type PrintSettings } from "@/components/report-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, AlertCircle, Printer } from "lucide-react";
import { PrintPreviewDialog } from "@/components/print-preview-dialog";
import { fetchFromLaravel } from "@/lib/api-client";

const defaultPrintSettings: PrintSettings = {
  bgImage: null, headerHeight: 40, footerHeight: 40, marginLeft: 40, marginRight: 40
};

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [report, setReport] = useState<ReportSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  useEffect(() => { 
    if (reportId) fetchReport(); 
    const handleFocus = () => {
      if (reportId) fetchReport();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [reportId]);

  const triggerPrint = () => {
    setShowPrintOptions(true);
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel(`/reports/${reportId}`);
      setReport({
        ...data,
        lab: data.lab || { name: "OnePath Lab Main", email: "info@onepathlab.com", address: "123 Healthcare Blvd, Medical District, Delhi", logoUrl: "/onepath-logo.png" },
      });
      if (data.lab) {
        setPrintSettings({
          bgImage: data.lab.printBgImage || null,
          headerHeight: data.lab.printHeaderHeight ?? 40,
          footerHeight: data.lab.printFooterHeight ?? 40,
          marginLeft: data.lab.printMarginLeft ?? 40,
          marginRight: data.lab.printMarginRight ?? 40,
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
        <Link href="/dashboard/reports"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Reports</Button></Link>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/70 no-print shadow-card">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports"><Button variant="outline" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground leading-tight">{report.patient.name}</h2>
            <p className="text-xs text-muted-foreground">File {report.customId} · {report.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/reports/${report.id}/edit`}><Button variant="outline" size="sm" className="h-9"><Edit className="h-4 w-4" /> Edit Results</Button></Link>
          <Button onClick={triggerPrint} size="sm" className="h-9"><Printer className="h-4 w-4" /> Print / PDF</Button>
        </div>
      </div>

      {/* A4 sheet */}
      <div className="bg-white border border-border/70 rounded-xl shadow-card p-2 overflow-x-auto flex justify-center">
        {report && <ReportSheet ref={reportRef} report={report} settings={printSettings} />}
      </div>

      <PrintPreviewDialog 
        open={showPrintOptions} 
        onOpenChange={setShowPrintOptions} 
        report={report} 
      />
    </div>
  );
}
