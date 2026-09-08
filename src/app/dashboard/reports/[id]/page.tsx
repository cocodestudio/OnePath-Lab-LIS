"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportSheet, type ReportSheetData, type PrintSettings } from "@/components/report-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, AlertCircle, Printer, AlertTriangle, Wallet, Loader2 } from "lucide-react";
import { PrintPreviewDialog } from "@/components/print-preview-dialog";
import { fetchFromLaravel, getCleanLetterheadUrl, getStoredUser } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

const defaultPrintSettings: PrintSettings = {
  bgImage: null, headerHeight: 185, footerHeight: 95, marginLeft: 32, marginRight: 32
};

type ExtendedReportData = ReportSheetData & {
  isB2bPaid?: boolean;
  is_b2b_paid?: boolean;
  b2bPrice?: number;
  b2b_price?: number;
};

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const reportId = params.id as string;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [report, setReport] = useState<ExtendedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isB2B = currentUser?.role === "B2B";
  const isCollectionCenter = currentUser?.role === "COLLECTION_CENTER";
  const isPartnerOrCC = isCollectionCenter || isB2B;

  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [sheetScale, setSheetScale] = useState<number>(1);
  const [insufficientBalanceModal, setInsufficientBalanceModal] = useState<{
    open: boolean;
    cost?: number;
    balance?: number;
    deficit?: number;
    repCode?: string;
  } | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

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

  const triggerPrint = async () => {
    if (isPartnerOrCC) {
      try {
        setIsDeducting(true);
        const authRes = await fetchFromLaravel(`/b2b/reports/${reportId}/deduct-and-print`, {
          method: "POST"
        });

        if (authRes && authRes.deducted) {
          toast({
            variant: "success",
            title: "Report Unlocked",
            description: `₹${Number(authRes.amount_deducted).toLocaleString("en-IN", { minimumFractionDigits: 2 })} debited from B2B wallet.`
          });
          setReport((prev: any) => prev ? { ...prev, isB2bPaid: true, is_b2b_paid: true } : prev);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("b2b_wallet_updated", { detail: authRes }));
          }
        }
      } catch (authErr: any) {
        console.error("B2B print deduction failed:", authErr);
        const errorMsg = authErr.message || authErr.error || "Print authorization failed";
        const isInsufficient = authErr.error_code === "INSUFFICIENT_BALANCE" || errorMsg.toLowerCase().includes("insufficient");

        if (isInsufficient) {
          setInsufficientBalanceModal({
            open: true,
            cost: authErr.report_cost || 0,
            balance: authErr.current_balance ?? 0,
            deficit: authErr.deficit ?? Math.max(0, (authErr.report_cost || 0) - (authErr.current_balance || 0)),
            repCode: report?.customId || reportId,
          });
          setIsDeducting(false);
          return;
        }

        toast({
          variant: "error",
          title: "Print Locked",
          description: errorMsg,
        });
        setIsDeducting(false);
        return;
      } finally {
        setIsDeducting(false);
      }
    }

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
          {!isPartnerOrCC && (
            <Link href={`/dashboard/reports/${report.id}/edit`}>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer text-xs font-semibold">
                <Edit className="h-3.5 w-3.5" /> Edit Results
              </Button>
            </Link>
          )}
          <Button
            onClick={triggerPrint}
            disabled={isDeducting}
            size="sm"
            className="h-9 gap-1.5 cursor-pointer gradient-primary text-primary-foreground text-xs font-bold shadow-xs"
          >
            {isDeducting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            <span>
              {isPartnerOrCC && !report.isB2bPaid && !report.is_b2b_paid && (report.status === "FINAL" || report.status === "APPROVED" || report.status === "COMPLETED")
                ? `Print (₹${Number(report.b2bPrice ?? report.b2b_price ?? 0).toLocaleString("en-IN")})`
                : "Print / PDF"}
            </span>
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

      {/* Insufficient Wallet Balance Modal */}
      {insufficientBalanceModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-destructive/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Insufficient Wallet Balance</h3>
                <p className="text-xs text-muted-foreground">Recharge required to print patient report</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Report ID:</span>
                <span className="font-mono font-bold text-foreground">{insufficientBalanceModal.repCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Report Fee:</span>
                <span className="font-bold text-foreground">
                  ₹{Number(insufficientBalanceModal.cost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-bold text-destructive">
                  ₹{Number(insufficientBalanceModal.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="font-bold text-foreground">Minimum Recharge Needed:</span>
                <span className="font-black text-purple-600 text-sm">
                  ₹{Number(insufficientBalanceModal.deficit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              As per laboratory policy, report printing is debited directly from your B2B wallet balance. Please add funds to unlock this report.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInsufficientBalanceModal(null)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </Button>
              <Link href="/dashboard/wallet">
                <Button
                  size="sm"
                  className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md gap-2 cursor-pointer"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Recharge Wallet</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
