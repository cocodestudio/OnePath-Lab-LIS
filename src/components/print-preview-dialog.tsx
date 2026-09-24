"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Printer, FileText, CheckCircle2, ChevronUp, ChevronDown,
  Trash2, Eye, EyeOff, Save, Check, Loader2, Sparkles, Sliders, BookOpen,
  GripVertical, Layers, ChevronRight, Phone, Send, Download
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { ReportSheet, PaginatedReportPreview, type PrintSettings, type ReportTest } from "@/components/report-sheet";
import { WhatsAppQrDialog } from "@/components/whatsapp-qr-dialog";
import { AiReportGenerationModal } from "@/components/ai-report-generation-modal";
import { fetchFromLaravel, getCleanLetterheadUrl } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { downloadNativePdf, getNativePdfBase64 } from "@/lib/pdf-report-downloader";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
  onLayoutSaved?: () => void;
}

interface TopLevelBlock {
  id: string;
  name: string;
  isGroup: boolean;
  unit?: string;
  items: ReportTest[];
}

const A4_W = 794;

export function PrintPreviewDialog({ open, onOpenChange, report, onLayoutSaved }: PrintPreviewDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [useCustomLetterpad, setUseCustomLetterpad] = useState(true);
  const [showInterpretation, setShowInterpretation] = useState(true);
  const [separatePagePerTest, setSeparatePagePerTest] = useState<boolean>(() => {
    const rs = report?.lab?.report_settings || report?.lab?.reportSettings;
    return Boolean(rs?.separatePagePerTest);
  });
  const [excludedMainTests, setExcludedMainTests] = useState<string[]>([]);
  const [previewScale, setPreviewScale] = useState(0.8);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileTab, setMobileTab] = useState<"preview" | "controls">("preview");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setPreviewScale(0.42);
    }
  }, []);

  useEffect(() => {
    if (report?.lab) {
      const rs = report.lab.report_settings || report.lab.reportSettings;
      if (rs && typeof rs.separatePagePerTest === "boolean") {
        setSeparatePagePerTest(rs.separatePagePerTest);
      }
    }
  }, [report]);

  // Top-level Parameter Blocks state (supports standalone parameters & full group blocks like DLC)
  const [blocksList, setBlocksList] = useState<TopLevelBlock[]>([]);
  const [hiddenBlockIds, setHiddenBlockIds] = useState<string[]>([]);
  const [draggedBlockIdx, setDraggedBlockIdx] = useState<number | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [layoutSavedSuccess, setLayoutSavedSuccess] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isPhonePromptOpen, setIsPhonePromptOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [savePhoneToProfile, setSavePhoneToProfile] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollListRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  /* ── Build Top-Level Blocks from results ─────────────────── */
  const buildBlocksFromResults = (results: ReportTest[]): TopLevelBlock[] => {
    if (!Array.isArray(results) || results.length === 0) return [];

    const blocks: TopLevelBlock[] = [];
    const groupMap = new Map<string, TopLevelBlock>();

    results.forEach((item) => {
      // Check if item belongs to a subgroup (e.g. Differential Leukocyte Count)
      if (item.test.parent?.parent) {
        const groupName = item.test.parent.name;
        const groupId = `group-${item.test.parent.id || groupName}`;

        if (!groupMap.has(groupName)) {
          const newGroup: TopLevelBlock = {
            id: groupId,
            name: groupName,
            isGroup: true,
            items: [item],
          };
          groupMap.set(groupName, newGroup);
          blocks.push(newGroup);
        } else {
          groupMap.get(groupName)!.items.push(item);
        }
      } else {
        // Standalone parameter
        blocks.push({
          id: item.id || `res-${item.test.id || item.test.name}`,
          name: item.test.name,
          unit: item.test.unit,
          isGroup: false,
          items: [item],
        });
      }
    });

    // Sort items within each group
    blocks.forEach((b) => {
      if (b.isGroup) {
        b.items.sort((a, b) => {
          const orderA = a.test.sort_order ?? (a.test as any)?.sortOrder ?? 0;
          const orderB = b.test.sort_order ?? (b.test as any)?.sortOrder ?? 0;
          if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
          return 0;
        });
      }
    });

    // Sort blocks by sort_order
    blocks.sort((a, b) => {
      const getBlockOrder = (block: TopLevelBlock) => {
        if (block.isGroup) {
          const pOrder = block.items[0]?.test?.parent?.sort_order ?? (block.items[0]?.test?.parent as any)?.sortOrder ?? 0;
          const minItemOrder = block.items[0]?.test?.sort_order ?? (block.items[0]?.test as any)?.sortOrder ?? 0;
          return minItemOrder || pOrder;
        }
        return block.items[0]?.test?.sort_order ?? (block.items[0]?.test as any)?.sortOrder ?? 0;
      };

      const orderA = getBlockOrder(a);
      const orderB = getBlockOrder(b);
      if (orderA !== orderB && orderA !== 0 && orderB !== 0) return orderA - orderB;
      if (orderA !== 0 && orderB === 0) return -1;
      if (orderA === 0 && orderB !== 0) return 1;
      return 0;
    });

    return blocks;
  };

  /* ── reset & sync on open ─────────────────────────────────── */
  useEffect(() => {
    if (open && report) {
      const rs = report.lab?.report_settings || report.lab?.reportSettings;
      const initialLetterhead = Boolean(report.lab?.printWithLetterhead ?? report.lab?.print_with_letterhead ?? true);
      setUseCustomLetterpad(initialLetterhead);
      setShowInterpretation(true);
      setSeparatePagePerTest(Boolean(rs?.separatePagePerTest));
      setExcludedMainTests([]);
      setHiddenBlockIds([]);
      setLayoutSavedSuccess(false);

      if (Array.isArray(report.results)) {
        const initialBlocks = buildBlocksFromResults(report.results);
        setBlocksList(initialBlocks);
      }
    }
  }, [open, report]);

  /* ── scale to fit preview pane width ───────────────── */
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      if (cw > 0) {
        const availW = Math.max(300, cw - (window.innerWidth < 640 ? 20 : 64));
        setPreviewScale(Math.min(1, Math.max(0.35, availW / A4_W)));
      }
    };

    update();
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(update);
      ro.observe(containerRef.current);
    }

    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open]);

  /* ── Drag & Drop Handlers with Auto-scroll ──────────── */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBlockIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Auto-scroll logic while dragging near list edges
    if (scrollListRef.current) {
      const rect = scrollListRef.current.getBoundingClientRect();
      const offsetTop = e.clientY - rect.top;
      const offsetBottom = rect.bottom - e.clientY;

      if (offsetTop < 40) {
        scrollListRef.current.scrollTop -= 8;
      } else if (offsetBottom < 40) {
        scrollListRef.current.scrollTop += 8;
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedBlockIdx === null || draggedBlockIdx === targetIndex) return;

    setBlocksList(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggedBlockIdx, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedBlockIdx(null);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocksList.length) return;

    setBlocksList(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const toggleBlockVisibility = (blockId: string) => {
    setHiddenBlockIds(prev =>
      prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
    );
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  /* ── Save Layout to Database ────────────────────────── */
  const handleSaveLayout = async () => {
    if (!report?.results || blocksList.length === 0) return;
    setIsSavingLayout(true);
    setLayoutSavedSuccess(false);

    try {
      const firstRes = report.results[0];
      const mainTestId = firstRes?.test?.parent?.parent?.id || firstRes?.test?.parent?.id || firstRes?.test?.id;

      // Flatten blocks into parameter payload
      const parametersPayload: any[] = [];
      let currentOrder = 1;

      blocksList.forEach(block => {
        const isBlockHidden = hiddenBlockIds.includes(block.id);

        if (block.isGroup) {
          // If group is hidden, mark all its items hidden
          const parentSubTestId = block.items[0]?.test?.parent?.id;
          if (parentSubTestId) {
            parametersPayload.push({
              id: parentSubTestId,
              sort_order: currentOrder++,
              is_hidden: isBlockHidden,
            });
          }

          block.items.forEach(item => {
            parametersPayload.push({
              id: item.test.id,
              sort_order: currentOrder++,
              is_hidden: isBlockHidden,
            });
          });
        } else {
          const item = block.items[0];
          if (item?.test?.id) {
            parametersPayload.push({
              id: item.test.id,
              sort_order: currentOrder++,
              is_hidden: isBlockHidden,
            });
          }
        }
      });

      if (mainTestId && !String(mainTestId).startsWith("sample-")) {
        await fetchFromLaravel(`/tests/${mainTestId}/report-layout`, {
          method: "POST",
          body: JSON.stringify({
            parameters: parametersPayload,
            show_interpretation: showInterpretation,
          }),
        });
      }

      setLayoutSavedSuccess(true);
      toast.success("Layout Saved", "Parameter sequence & report preferences saved permanently for this lab!");
      onLayoutSaved?.();
      setTimeout(() => setLayoutSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save layout:", err);
      toast.error("Save Failed", err.message || "Could not save custom layout.");
    } finally {
      setIsSavingLayout(false);
    }
  };

  /* ── Derived active filtered report ──────────────────── */
  const activeReport = useMemo(() => {
    if (!report) return null;

    // Flatten blocksList into results array in exact sequential order
    const orderedResults: ReportTest[] = [];
    blocksList.forEach(block => {
      if (hiddenBlockIds.includes(block.id)) return;
      block.items.forEach(item => {
        let n = item.test.name;
        if (item.test.parent?.parent) n = item.test.parent.parent.name;
        else if (item.test.parent) n = item.test.parent.name;

        if (!excludedMainTests.includes(n)) {
          orderedResults.push(item);
        }
      });
    });

    const labObj = report.lab || {};
    const rawLabSettings = labObj.reportSettings ?? labObj.report_settings;
    let rs: any = {};
    if (typeof rawLabSettings === 'string') {
      try {
        rs = JSON.parse(rawLabSettings || '{}');
      } catch {
        rs = {};
      }
    } else if (rawLabSettings && typeof rawLabSettings === 'object') {
      rs = { ...rawLabSettings };
    }

    if (!rs.doctorSignatures && !rs.doctor_signatures && !rs.doctorSignature && !rs.doctor_signature) {
      try {
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("lis_cached_report_settings");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === "object") {
              rs = { ...parsed, ...rs };
            }
          }
        }
      } catch { }
    }

    return {
      ...report,
      lab: {
        ...labObj,
        report_settings: {
          ...rs,
          separatePagePerTest,
        },
        reportSettings: {
          ...rs,
          separatePagePerTest,
        },
      },
      results: orderedResults,
    };
  }, [report, blocksList, hiddenBlockIds, excludedMainTests, separatePagePerTest]);

  const availableMainTests = useMemo(() => {
    if (!report?.results) return [];
    const names = new Set<string>();
    report.results.forEach((item: any) => {
      let n = item.test.name;
      if (item.test.parent?.parent) n = item.test.parent.parent.name;
      else if (item.test.parent) n = item.test.parent.name;
      names.add(n);
    });
    return Array.from(names);
  }, [report]);

  const printSettings: PrintSettings | undefined = useMemo(() => {
    if (!report) return undefined;
    const lab = (report.lab || {}) as any;
    const rawBg = lab.printBgImage || lab.print_bg_image || null;
    const hasBg = Boolean(rawBg && rawBg !== "null" && rawBg !== "undefined" && rawBg !== "none");
    // Only letterhead image toggles — margins & heights ALWAYS from saved settings
    const bgImage = useCustomLetterpad && hasBg ? getCleanLetterheadUrl(rawBg) : null;

    return {
      bgImage,
      headerHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 185,
      footerHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 95,
      marginLeft: lab.printMarginLeft ?? lab.print_margin_left ?? 32,
      marginRight: lab.printMarginRight ?? lab.print_margin_right ?? 32,
    };
  }, [report, useCustomLetterpad]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: report ? `Report_${report.customId}` : "Report",
  });

  // ── Direct Pixel-Perfect High-Resolution Native Vector PDF Download (Option A) ──────
  const handleDirectDownloadPdf = async () => {
    if (!printRef.current || !activeReport) {
      toast.error("Not Ready", "Report preview is still rendering. Please wait a moment.");
      return;
    }

    setIsDownloadingPdf(true);
    toast.info("Preparing PDF", "Generating exact high-resolution vector PDF...");

    try {
      const pName = (report?.patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const rCode = (report?.customId || report?.id || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `LabReport_${rCode}_${pName}.pdf`;

      await downloadNativePdf({
        printContainer: printRef.current,
        filename,
      });

      toast.success("Downloaded", `${filename} downloaded successfully!`);
    } catch (err: any) {
      console.error("Direct PDF download error:", err);
      toast.error("Download Error", err?.message || "Failed to generate report PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleWhatsApp = async (overridePhone?: string | unknown) => {
    const phone = (typeof overridePhone === "string" ? overridePhone : (report?.patient?.phone || "")).trim();
    if (!phone) {
      setCustomPhone("");
      setIsPhonePromptOpen(true);
      return;
    }

    if (!printRef.current || !activeReport) {
      toast.error("Not Ready", "Report preview is still rendering. Please wait a moment.");
      return;
    }

    setIsSendingWhatsApp(true);
    const displayPhone = phone.replace(/\D/g, "");
    toast.info("Preparing WhatsApp", "Rendering crisp native PDF report...");

    try {
      const pName = (report?.patient?.name || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const rCode = (report?.customId || report?.id || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `LabReport_${rCode}_${pName}.pdf`;

      const pdfBase64 = await getNativePdfBase64({
        printContainer: printRef.current,
        filename,
      });

      toast.info("Sending via WhatsApp...", `Delivering official PDF report to +${displayPhone}...`);

      const res = await fetchFromLaravel(`/reports/${report.id}/send-whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          phone: phone,
          save_phone: savePhoneToProfile,
        }),
      });

      if (res?.status === "success" || res?.success) {
        toast.success("Sent on WhatsApp!", `Official report PDF sent to +${displayPhone} successfully!`);
        if (report?.patient) {
          report.patient.phone = phone;
        }
      } else {
        toast.error("Dispatch Failed", res?.message || "Could not deliver WhatsApp message via Meta Cloud API.");
      }
    } catch (err: any) {
      console.error("WhatsApp dispatch error:", err);
      toast.error("WhatsApp Error", err?.message || "An unexpected error occurred while preparing the report.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!report || !activeReport) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-screen h-screen max-h-screen p-0 m-0 border-0 rounded-none overflow-hidden flex flex-col bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>Print & Layout Preview</DialogTitle>
          <DialogDescription>Customize parameter sequence, interpretation, and letterhead</DialogDescription>
        </DialogHeader>

        {/* ── Hidden print target ── */}
        <div className="sr-only" aria-hidden>
          <div ref={printRef}>
            <ReportSheet report={activeReport} settings={printSettings} hideInterpretation={!showInterpretation} />
          </div>
        </div>

        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3.5 bg-background border-b border-border shadow-xs z-10 shrink-0 gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm sm:text-base leading-none text-foreground">Report Sheet & Parameter Manager</h2>
                <span className="bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Customizer
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPages} page{totalPages > 1 ? "s" : ""} · Drag items/blocks up & down to reorder, toggle interpretation, and save lab layout in real-time.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Mobile Tab Switcher on < md */}
            <div className="flex md:hidden items-center bg-muted/60 p-1 rounded-xl border border-border w-full mb-1">
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${mobileTab === "preview" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                  }`}
              >
                Preview Canvas
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("controls")}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${mobileTab === "controls" ? "bg-background text-primary shadow-xs" : "text-muted-foreground"
                  }`}
              >
                Reorder &amp; Controls
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveLayout}
              disabled={isSavingLayout}
              className="gap-1.5 border-primary/40 hover:bg-primary/10 text-primary font-bold text-xs shadow-xs cursor-pointer flex-1 sm:flex-none"
            >
              {isSavingLayout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : layoutSavedSuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5" />}
              <span>{isSavingLayout ? "Saving..." : layoutSavedSuccess ? "Saved!" : "Save Layout"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
            <Button
              size="sm"
              onClick={() => handleWhatsApp()}
              disabled={isSendingWhatsApp}
              className="gap-1.5 font-bold shadow-xs cursor-pointer flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSendingWhatsApp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>Send WhatsApp</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => handleDirectDownloadPdf()}
              disabled={isDownloadingPdf}
              className="gap-1.5 font-bold shadow-xs cursor-pointer flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => handlePrint()} className="gap-1.5 font-bold shadow-xs cursor-pointer flex-1 sm:flex-none">
              <Printer className="h-4 w-4" /> Print Document
            </Button>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* Sidebar Controls */}
          <div className={`w-full md:w-[350px] shrink-0 bg-card border-b md:border-b-0 md:border-r border-border flex-col overflow-y-auto custom-scrollbar md:max-h-full md:h-full ${mobileTab === "controls" ? "flex flex-1" : "hidden md:flex"}`}>
            <div className="p-5 space-y-6">

              {/* 1. Appearance & Sections */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span>Appearance & Sections</span>
                </h3>

                {/* Letterhead Switch */}
                <label className="flex items-start gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-accent/40 transition-colors bg-background shadow-xs">
                  <Checkbox
                    checked={useCustomLetterpad}
                    onCheckedChange={(v) => setUseCustomLetterpad(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground leading-none">Print with Letterhead</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Render with letterhead background and adjusted top/bottom margins.
                    </p>
                  </div>
                </label>

                {/* Interpretation Switch */}
                <label className="flex items-start gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-accent/40 transition-colors bg-background shadow-xs">
                  <Checkbox
                    checked={showInterpretation}
                    onCheckedChange={(v) => setShowInterpretation(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground leading-none flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      <span>Clinical Interpretation & Notes</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Show detailed medical interpretation table and notes at the end of report.
                    </p>
                  </div>
                </label>

                {/* Separate Page per Test Switch */}
                <label className="flex items-start gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-accent/40 transition-colors bg-background shadow-xs">
                  <Checkbox
                    checked={separatePagePerTest}
                    onCheckedChange={(v) => setSeparatePagePerTest(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground leading-none flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Separate Page per Test</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Starts each test and its medical interpretation cleanly on a separate page.
                    </p>
                  </div>
                </label>
              </div>

              {/* 2. Manage Parameters & Sequence */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Parameters & Blocks ({blocksList.length})</span>
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {blocksList.length - hiddenBlockIds.length} active
                  </span>
                </div>

                <div
                  ref={scrollListRef}
                  className="space-y-2 border border-border rounded-xl bg-background p-2 shadow-xs max-h-[380px] overflow-y-auto custom-scrollbar"
                >
                  {blocksList.map((block, idx) => {
                    const isHidden = hiddenBlockIds.includes(block.id);
                    const isExpanded = expandedGroupIds.includes(block.id);

                    return (
                      <div
                        key={block.id || idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`rounded-lg border text-xs transition-all select-none ${draggedBlockIdx === idx
                            ? "opacity-30 border-dashed border-primary bg-primary/5 scale-[0.98]"
                            : isHidden
                              ? "bg-muted/40 border-dashed border-border/70 opacity-60"
                              : block.isGroup
                                ? "bg-primary/5 border-primary/30 hover:border-primary/60 shadow-xs"
                                : "bg-card border-border/80 hover:border-primary/40 shadow-xs"
                          }`}
                      >
                        {/* Block Header Row */}
                        <div className="flex items-center justify-between gap-2 p-2">
                          {/* Left: Drag Grip Handle, Sequence Badge & Title */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Drag Grip Handle */}
                            <span
                              className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground shrink-0 rounded transition-colors hover:bg-accent/60"
                              title="Hold and drag to reorder"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>

                            <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${isHidden
                                ? "bg-muted text-muted-foreground"
                                : block.isGroup
                                  ? "bg-primary/20 text-primary font-extrabold"
                                  : "bg-primary/10 text-primary"
                              }`}>
                              {idx + 1}
                            </span>

                            <div className="truncate min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {block.isGroup && (
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(block.id)}
                                    className="p-0.5 hover:bg-primary/10 rounded text-primary transition-transform cursor-pointer"
                                    title={isExpanded ? "Collapse sub-parameters" : "Expand sub-parameters"}
                                  >
                                    <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                  </button>
                                )}
                                <p className={`font-bold truncate text-[11.5px] leading-tight ${isHidden
                                    ? "line-through text-muted-foreground"
                                    : block.isGroup
                                      ? "text-primary"
                                      : "text-foreground"
                                  }`} title={block.name}>
                                  {block.name}
                                </p>
                              </div>
                              {block.isGroup ? (
                                <p className="text-[9.5px] text-primary/80 font-medium mt-0.5 flex items-center gap-1">
                                  <Layers className="h-2.5 w-2.5 inline" /> Group Block ({block.items.length} sub-params)
                                </p>
                              ) : block.unit ? (
                                <p className="text-[9.5px] text-muted-foreground leading-none mt-0.5 font-mono">
                                  Unit: {block.unit}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {/* Right: Move Up / Down & Visibility Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {/* Move Up */}
                            <button
                              type="button"
                              onClick={() => moveBlock(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-accent disabled:opacity-20 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              title="Move Up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              onClick={() => moveBlock(idx, "down")}
                              disabled={idx === blocksList.length - 1}
                              className="p-1 rounded hover:bg-accent disabled:opacity-20 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              title="Move Down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>

                            {/* Visibility Toggle / Delete */}
                            <button
                              type="button"
                              onClick={() => toggleBlockVisibility(block.id)}
                              className={`p-1 rounded cursor-pointer transition-colors ${isHidden
                                  ? "text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                }`}
                              title={isHidden ? "Include in Report" : "Remove / Hide from Report"}
                            >
                              {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Group Items Preview */}
                        {block.isGroup && isExpanded && (
                          <div className="px-3 pb-2 pt-1 border-t border-primary/20 bg-background/50 space-y-1">
                            {block.items.map((sub, sIdx) => (
                              <div key={sub.id || sIdx} className="flex items-center justify-between text-[10.5px] text-muted-foreground pl-3 border-l-2 border-primary/30 py-0.5">
                                <span className="truncate">{sub.test.name}</span>
                                {sub.test.unit && <span className="font-mono text-[9px] text-muted-foreground/80">{sub.test.unit}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {blocksList.length === 0 && (
                    <p className="text-xs text-muted-foreground italic p-3 text-center">No parameters found.</p>
                  )}
                </div>

                <p className="text-[10.5px] text-muted-foreground leading-snug px-1 pt-1">
                  💡 <strong>Drag & Drop:</strong> Hold <GripVertical className="inline h-3 w-3 text-foreground" /> icon to drag any parameter or entire group (like DLC) up or down. Click <strong className="text-foreground">"Save Layout to Lab Account"</strong> to keep this permanently for your lab.
                </p>
              </div>

              {/* 3. Include Panels (if multiple panels present) */}
              {availableMainTests.length > 1 && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>Include Panels</span>
                  </h3>
                  <div className="space-y-1 border border-border rounded-xl bg-background shadow-xs overflow-hidden p-1.5">
                    {availableMainTests.map(testName => (
                      <label key={testName} className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-accent/40 transition-colors group">
                        <Checkbox
                          checked={!excludedMainTests.includes(testName)}
                          onCheckedChange={(checked) => {
                            if (checked) setExcludedMainTests(p => p.filter(t => t !== testName));
                            else setExcludedMainTests(p => [...p, testName]);
                          }}
                        />
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate select-none" title={testName}>
                          {testName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ✨ Generate AI Smart Report Button (Bottom Left) */}
            <div className="p-3 border-t border-border bg-background/60 shrink-0">
              <Button
                type="button"
                onClick={() => {
                  if (report?.id) {
                    setIsGeneratingAiReport(true);
                  }
                }}
                disabled={isGeneratingAiReport}
                className="w-full h-11 relative overflow-hidden gap-2 font-bold text-xs bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-700 hover:via-indigo-700 hover:to-purple-700 text-white cursor-pointer shadow-md rounded-xl transition-all group disabled:opacity-75"
              >
                {isGeneratingAiReport ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
                )}
                <span className="tracking-tight">
                  {isGeneratingAiReport ? "Synthesizing AI Smart Report..." : "✨ Generate AI Smart Report"}
                </span>
              </Button>
            </div>
          </div>

          {/* ── Preview Pane ── */}
          <div
            ref={containerRef}
            className={`flex-1 overflow-auto sheet-pan-canvas bg-zinc-200 dark:bg-zinc-900/90 justify-center items-start py-4 sm:py-8 px-2 sm:px-4 custom-scrollbar shadow-inner ${mobileTab === "preview" ? "flex" : "hidden md:flex"}`}
          >
            {printSettings && (
              <PaginatedReportPreview
                report={activeReport}
                settings={printSettings}
                scale={previewScale}
                hideInterpretation={!showInterpretation}
                onPageCount={setTotalPages}
              />
            )}
          </div>

        </div>

        {/* WhatsApp QR Pairing Dialog Modal */}
        <WhatsAppQrDialog
          open={isQrModalOpen}
          onOpenChange={setIsQrModalOpen}
          onConnected={() => handleWhatsApp()}
        />

        {/* WhatsApp Phone Number Input Prompt Dialog */}
        <Dialog open={isPhonePromptOpen} onOpenChange={setIsPhonePromptOpen}>
          <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">WhatsApp Number Required</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Enter patient&apos;s mobile number to send the official PDF report.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-xl border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-semibold">{report?.patient?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report ID:</span>
                  <span className="font-mono font-medium">{report?.customId || report?.id}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Mobile / WhatsApp Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none">+91</span>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="9045757272"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-11 h-11 text-sm font-medium tracking-wide rounded-xl"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Enter 10-digit Indian WhatsApp mobile number</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="savePhonePreview"
                  checked={savePhoneToProfile}
                  onCheckedChange={(c) => setSavePhoneToProfile(!!c)}
                />
                <label htmlFor="savePhonePreview" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Save mobile number to patient profile permanently
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPhonePromptOpen(false)}
                className="rounded-xl h-10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const cleaned = customPhone.replace(/\D/g, "");
                  if (cleaned.length < 10) {
                    toast.error("Invalid Number", "Please enter a valid 10-digit mobile number.");
                    return;
                  }
                  setIsPhonePromptOpen(false);
                  handleWhatsApp(cleaned);
                }}
                disabled={customPhone.replace(/\D/g, "").length < 10 || isSendingWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-semibold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send WhatsApp Report</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>

      <AiReportGenerationModal
        isOpen={isGeneratingAiReport}
        patientName={report?.patient?.name}
        customId={report?.customId || report?.custom_id}
        onComplete={() => {
          router.push(`/dashboard/reports/${report.id}/smart-report`);
        }}
      />
    </Dialog>
  );
}
