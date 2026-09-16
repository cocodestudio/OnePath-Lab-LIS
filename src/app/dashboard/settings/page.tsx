"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
  Upload, X, Loader2, Save, Eye,
  Sliders, CheckCircle2, Trash2, RefreshCw,
  Layers, ZoomIn, ZoomOut, RotateCcw, Check,
  FileText, Layout, Type, ListOrdered, Palette,
  AlignLeft, AlignCenter, AlignRight, ShieldCheck,
  Tag, Sparkles, ArrowLeftRight, Columns, MessageSquare,
  Pilcrow, MoveHorizontal, Receipt, QrCode, PlusCircle,
  CreditCard, PenTool, Image as ImageIcon, ClipboardList,
  CheckSquare, Stethoscope, User, Shield, Lock, Asterisk,
  Cpu, Radio, Activity, HardDrive, Terminal, Building2,
  GripVertical, FlaskConical, Plus
} from "lucide-react";
import { ReportSheet, type PrintSettings, type ReportSheetData } from "@/components/report-sheet";
import { InvoiceSheet, type InvoiceData } from "@/components/invoice-sheet";
import { CollectionCentersTab } from "@/components/collection-centers-tab";
import { PaymentGatewayTab } from "@/components/payment-gateway-tab";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchFromLaravel, getCleanLetterheadUrl, clearApiCache } from "@/lib/api-client";
import {
  ALL_DESIGNATIONS,
  ALL_ORDERING_FIELDS,
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_DEPARTMENT_ORDER,
  type IntakeFieldConfig,
  type ReportLayoutSettings,
  type DoctorSignatureConfig,
  defaultReportLayoutSettings,
  normalizeReportSettings,
} from "@/lib/report-settings";
import {
  ALL_BILL_ORDERING_FIELDS,
  type BillLayoutSettings,
  type BillSignature,
  defaultBillLayoutSettings,
  normalizeBillSettings,
} from "@/lib/bill-settings";
import { processSignatureImage } from "@/lib/signature-processor";

interface ExtendedPrintSettings extends PrintSettings {
  printWithLetterhead?: boolean;
}

const defaultPrintSettings: ExtendedPrintSettings = {
  bgImage: null,
  headerHeight: 40,
  footerHeight: 40,
  marginLeft: 40,
  marginRight: 40,
  printWithLetterhead: false,
};

function getDummyReportWithSettings(layoutSettings: ReportLayoutSettings, printSettings: ExtendedPrintSettings): ReportSheetData {
  return {
    id: "dummy-rep-01",
    customId: "REP-2026-9999",
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    reportDate: new Date().toISOString(),
    healthPackage: {
      id: "pkg-01",
      name: "Comprehensive Health Checkup",
    },
    patient: {
      name: "Rajesh Kumar",
      age: 42,
      gender: "Male",
      phone: "+91 98765 43210",
      refDoctor: "Dr. Ananya Sharma",
      customId: "PID-2026-8888",
      address: "45 MG Road, Connaught Place, New Delhi",
      email: "rajesh.kumar@example.com",
      aadhaarNo: "XXXX-XXXX-1234",
      insuranceNo: "HDFC-ERGO-9921",
      uhid: "UHID-882109",
      hfr_id: "HFR-DEL-4019",
      height: "175 cm",
      weight: "72 kg",
      sampleCollectedAt: new Date().toISOString(),
      sampleReceivedAt: new Date().toISOString(),
      sampleReportedAt: new Date().toISOString(),
      secondRefDoctor: "Dr. R. K. Gupta",
      sampleCollectedBy: "Amit Singh (Phlebotomist)",
      collectionCenter: "Central Diagnostic Hub",
      vialBarcode: "890123456789",
      meta: {
        uhid: "UHID-882109",
        hfr_id: "HFR-DEL-4019",
        height: "175 cm",
        weight: "72 kg",
        aadhaar_no: "XXXX-XXXX-1234",
        insurance_no: "HDFC-ERGO-9921",
        second_ref_doctor: "Dr. R. K. Gupta",
        sample_collected_by: "Amit Singh (Phlebotomist)",
        collection_center: "Central Diagnostic Hub",
        vial_barcode: "890123456789",
      },
    },
    lab: {
      name: "OnePath Pathology Laboratory",
      email: "support@onepathlab.com",
      address: "Street No 04, Tibba Road, Near HDFC Bank ATM, Ludhiana 141007",
      phone: "+91 98123 45678",
      logoUrl: "/onepath-logo.png",
      printBgImage: printSettings.bgImage,
      printHeaderHeight: printSettings.headerHeight,
      printFooterHeight: printSettings.footerHeight,
      printMarginLeft: printSettings.marginLeft,
      printMarginRight: printSettings.marginRight,
      report_settings: layoutSettings,
      reportSettings: layoutSettings,
      default_designation: layoutSettings.defaultDesignation,
    },
    results: [
      {
        id: "r1",
        resultValue: "14.5",
        isAbnormal: false,
        test: {
          id: "t1",
          name: "Hemoglobin (Hb)",
          category: "Haematology",
          price: 0,
          unit: "g/dL",
          refRangeMin: 13.0,
          refRangeMax: 17.0,
          method: "Photometric Cyanmethemoglobin",
        },
      },
      {
        id: "r2",
        resultValue: "12,400",
        isAbnormal: true,
        test: {
          id: "t2",
          name: "Total Leucocyte Count (TLC)",
          category: "Haematology",
          price: 0,
          unit: "cells/cumm",
          refRangeMin: 4000,
          refRangeMax: 11000,
          method: "Automated Flow Cytometry",
        },
      },
      {
        id: "r3",
        resultValue: "1.2",
        isAbnormal: true,
        test: {
          id: "t3",
          name: "Platelet Count",
          category: "Haematology",
          price: 0,
          unit: "Lakhs/cumm",
          refRangeMin: 1.5,
          refRangeMax: 4.5,
          method: "Impedance Method",
          interpretation: "<p>Mild thrombocytopenia observed. Advised clinical correlation and peripheral smear review if indicated.</p>",
        },
      },
      {
        id: "r4",
        resultValue: "165",
        isAbnormal: true,
        test: {
          id: "t4",
          name: "Fast Blood Sugar (Glucose)",
          category: "Biochemistry",
          price: 0,
          unit: "mg/dL",
          refRangeMin: 70,
          refRangeMax: 100,
          method: "GOD-POD",
        },
      },
      {
        id: "r4b",
        resultValue: "0.9",
        isAbnormal: false,
        test: {
          id: "t4b",
          name: "Serum Creatinine",
          category: "Biochemistry",
          price: 0,
          unit: "mg/dL",
          refRangeMin: 0.7,
          refRangeMax: 1.3,
          method: "Modified Jaffe's Method",
        },
      },
      {
        id: "r5",
        resultValue: "NEGATIVE",
        isAbnormal: false,
        test: {
          id: "t5",
          name: "Widal Slide Agglutination",
          category: "Serology & Immunology",
          price: 0,
          unit: "Titre",
          refRangeMin: 0,
          refRangeMax: 0,
          textRefRange: "Negative (< 1:80)",
          rangeType: "TEXT",
          method: "Slide Agglutination",
        },
      },
    ],
  };
}

function getDummyInvoiceWithSettings(billSettings: BillLayoutSettings): InvoiceData {
  return {
    customId: "INV-2026-8801",
    createdAt: new Date().toISOString(),
    total: 1450,
    discount: 150,
    paidAmount: 1000,
    status: "PARTIAL",
    paymentMode: "UPI / ONLINE",
    dayWiseId: "D-042",
    billedBy: "Kavita (Billing Desk)",
    sampleCollectedBy: "Rahul (Phlebotomist)",
    collectionCenter: "City Center Branch",
    reportId: "REP-2026-9999",
    patient: {
      customId: "PID-2026-8888",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      age: 42,
      gender: "Male",
      refDoctor: "Dr. Ananya Sharma",
      address: "45 MG Road, Connaught Place, New Delhi",
      aadhaarNo: "XXXX-XXXX-1234",
      insuranceNo: "HDFC-ERGO-9921",
    },
    lab: {
      name: "OnePath Pathology Laboratory",
      email: "support@onepathlab.com",
      address: "Street No 04, Tibba Road, Near HDFC Bank ATM, Ludhiana 141007",
      phone: "+91 98123 45678",
      logoUrl: "/onepath-logo.png",
      pincode: "141007",
      city: "Ludhiana",
      state: "Punjab",
      gstin: billSettings.gst.number || "09EHMPM7306G1Z0",
      bill_settings: billSettings,
    },
    tests: [
      { id: "t1", name: "Complete Blood Count (CBC)", code: "CBC-01", price: 350, category: "Haematology" },
      { id: "t2", name: "Lipid Profile Comprehensive", code: "LIP-02", price: 650, category: "Biochemistry" },
      { id: "t3", name: "Fast Blood Sugar (Glucose)", code: "FBS-03", price: 100, category: "Biochemistry" },
      { id: "t4", name: "Thyroid Stimulating Hormone (TSH)", code: "TSH-04", price: 350, category: "Serology" },
    ],
  };
}

function optimizeLetterheadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Standard A4 aspect ratio at crisp resolution (1240 x 1754 px at 150 DPI)
        const MAX_WIDTH = 1240;
        const MAX_HEIGHT = 1754;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        // Fill solid white background so transparent PNGs don't render black in JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Always compress as high quality JPEG (crisp, small size ~150-250KB)
        let quality = 0.82;
        let compressed = canvas.toDataURL("image/jpeg", quality);

        // Keep decreasing quality slightly if still above 400KB to guarantee Nginx 1MB body limit is never exceeded
        while (compressed.length > 420 * 1024 && quality > 0.45) {
          quality -= 0.1;
          compressed = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(compressed);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function SettingsContent() {
  const [activeTab, setActiveTab] = useState<"letterhead" | "report-layout" | "bills-layout" | "machine-integration" | "collection-centers" | "payment-gateway" | "whatsapp-gateway">("letterhead");
  const [settings, setSettings] = useState<ExtendedPrintSettings>(defaultPrintSettings);
  const [layoutSettings, setLayoutSettings] = useState<ReportLayoutSettings>(defaultReportLayoutSettings);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(defaultBillLayoutSettings);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showWithLetterheadPreview, setShowWithLetterheadPreview] = useState(true);
  const [activePreset, setActivePreset] = useState<"standard" | "compact" | "preprinted" | "custom">("standard");
  const [previewScale, setPreviewScale] = useState<number>(0.55);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setPreviewScale(0.38);
    }
  }, []);

  // New Signature Modal state
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [newSigName, setNewSigName] = useState("");
  const [newSigDesig, setNewSigDesig] = useState("");

  // Doctor Digital Signature processing state (per-doctor indexing)
  const [processingSigIdx, setProcessingSigIdx] = useState<number | null>(null);
  const [sigSensitivityMap, setSigSensitivityMap] = useState<Record<number, number>>({});
  const [rawUploadedSigMap, setRawUploadedSigMap] = useState<Record<number, string>>({});

  const rawUploadedSig = rawUploadedSigMap[0] || null;
  const setRawUploadedSig = (val: string | null) => {
    setRawUploadedSigMap(prev => ({ ...prev, 0: val || "" }));
  };
  const sigSensitivity = sigSensitivityMap[0] ?? 210;
  const isProcessingSig = processingSigIdx !== null;

  const handleDoctorSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>, sigIndex: number = 0) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessingSigIdx(sigIndex);
      setToast({ text: `Processing Dr. #${sigIndex + 1} signature & removing white paper background...`, type: "success" });

      const reader = new FileReader();
      reader.onload = async (re) => {
        try {
          const rawUrl = re.target?.result as string;
          setRawUploadedSigMap(prev => ({ ...prev, [sigIndex]: rawUrl }));
          const sens = sigSensitivityMap[sigIndex] ?? 210;

          const transparentPng = await processSignatureImage(rawUrl, {
            removeBackground: true,
            threshold: sens,
            cropWhitespace: true,
          });

          setLayoutSettings(prev => {
            const list = Array.isArray(prev.doctorSignatures) && prev.doctorSignatures.length > 0
              ? prev.doctorSignatures.map(item => ({ ...item }))
              : [{ ...prev.doctorSignature }];

            while (list.length <= sigIndex) {
              list.push({
                id: `sig-${Date.now()}-${list.length}`,
                enabled: true,
                imageUrl: null,
                name: `Dr. Pathologist ${list.length + 1}`,
                designation: "Consultant Pathologist, MD",
                registrationNo: "",
                alignment: list.length % 2 === 1 ? "right" : "left",
                width: 130,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
              });
            }

            list[sigIndex] = {
              ...list[sigIndex],
              enabled: true,
              imageUrl: transparentPng,
            };

            return {
              ...prev,
              doctorSignature: list[0] ? { ...list[0] } : prev.doctorSignature,
              doctorSignatures: list,
            };
          });

          setToast({ text: `Dr. #${sigIndex + 1} signature background removed cleanly! Check live preview.`, type: "success" });
          setTimeout(() => setToast(null), 3500);
        } catch (err) {
          console.error("Signature processing error:", err);
          setToast({ text: "Failed to process signature image.", type: "error" });
        } finally {
          setProcessingSigIdx(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Signature upload error:", err);
      setProcessingSigIdx(null);
      setToast({ text: "Failed to upload signature file.", type: "error" });
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleReprocessSignature = async (newThreshold: number, sigIndex: number = 0) => {
    setSigSensitivityMap(prev => ({ ...prev, [sigIndex]: newThreshold }));
    const rawUrl = rawUploadedSigMap[sigIndex];
    if (!rawUrl) return;
    try {
      setProcessingSigIdx(sigIndex);
      const transparentPng = await processSignatureImage(rawUrl, {
        removeBackground: true,
        threshold: newThreshold,
        cropWhitespace: true,
      });

      setLayoutSettings(prev => {
        const list = Array.isArray(prev.doctorSignatures) && prev.doctorSignatures.length > 0
          ? prev.doctorSignatures.map(item => ({ ...item }))
          : [{ ...prev.doctorSignature }];

        if (list[sigIndex]) {
          list[sigIndex] = {
            ...list[sigIndex],
            imageUrl: transparentPng,
          };
        }

        return {
          ...prev,
          doctorSignature: list[0] ? { ...list[0] } : prev.doctorSignature,
          doctorSignatures: list,
        };
      });
    } catch (err) {
      console.error("Reprocess error:", err);
    } finally {
      setProcessingSigIdx(null);
    }
  };

  const handleUpdateDoctorSig = (sigIndex: number, updates: Partial<DoctorSignatureConfig>) => {
    setLayoutSettings(prev => {
      const list = Array.isArray(prev.doctorSignatures) && prev.doctorSignatures.length > 0
        ? prev.doctorSignatures.map(item => ({ ...item }))
        : [{ ...prev.doctorSignature }];

      if (list[sigIndex]) {
        list[sigIndex] = { ...list[sigIndex], ...updates };
      }

      return {
        ...prev,
        doctorSignature: list[0] ? { ...list[0] } : prev.doctorSignature,
        doctorSignatures: list,
      };
    });
  };

  const handleAddDoctorSig = () => {
    setLayoutSettings(prev => {
      const list = Array.isArray(prev.doctorSignatures) && prev.doctorSignatures.length > 0
        ? prev.doctorSignatures.map(item => ({ ...item }))
        : [{ ...prev.doctorSignature }];

      const newIdx = list.length + 1;
      const newSig: DoctorSignatureConfig = {
        id: `sig-${Date.now()}`,
        enabled: true,
        imageUrl: null,
        name: `Dr. Pathologist ${newIdx}`,
        designation: "Consultant Pathologist, MD",
        registrationNo: "",
        alignment: newIdx % 2 === 0 ? "right" : "left",
        width: 130,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      };

      const updatedList = [...list, newSig];
      return {
        ...prev,
        doctorSignature: updatedList[0],
        doctorSignatures: updatedList,
      };
    });
    setToast({ text: "Added another doctor signature. Configure details below.", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemoveDoctorSig = (sigIndex: number) => {
    setLayoutSettings(prev => {
      const list = Array.isArray(prev.doctorSignatures) && prev.doctorSignatures.length > 0
        ? prev.doctorSignatures.map(item => ({ ...item }))
        : [{ ...prev.doctorSignature }];

      if (list.length <= 1) {
        return prev;
      }

      const updatedList = list.filter((_, i) => i !== sigIndex);
      return {
        ...prev,
        doctorSignature: updatedList[0],
        doctorSignatures: updatedList,
      };
    });
    setToast({ text: `Removed Doctor #${sigIndex + 1} signature.`, type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const lab = await fetchFromLaravel("/lab");
      if (lab) {
        let rawBg = lab.printBgImage || lab.print_bg_image || null;
        if (!rawBg) {
          try {
            rawBg = localStorage.getItem("lis_cached_letterhead");
          } catch {}
        }
        const cleanBg = getCleanLetterheadUrl(rawBg);
        if (cleanBg) {
          try {
            localStorage.setItem("lis_cached_letterhead", cleanBg);
          } catch {}
        }
        setSettings({
          bgImage: cleanBg,
          headerHeight: lab.printHeaderHeight ?? lab.print_header_height ?? 40,
          footerHeight: lab.printFooterHeight ?? lab.print_footer_height ?? 40,
          marginLeft: lab.printMarginLeft ?? lab.print_margin_left ?? 40,
          marginRight: lab.printMarginRight ?? lab.print_margin_right ?? 40,
          printWithLetterhead: lab.printWithLetterhead ?? lab.print_with_letterhead ?? (cleanBg ? true : false),
        });

        const parsedLayout = normalizeReportSettings(lab.report_settings || lab.reportSettings);
        if (lab.default_designation || lab.defaultDesignation) {
          parsedLayout.defaultDesignation = lab.default_designation || lab.defaultDesignation;
        }
        setLayoutSettings(parsedLayout);

        const parsedBill = normalizeBillSettings(lab.bill_settings || lab.billSettings);
        setBillSettings(parsedBill);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setToast({ text: "File size exceeds 25MB. Please choose a smaller image.", type: "error" });
      return;
    }

    setIsUploadingLetterhead(true);
    setToast({ text: "Optimizing & saving letterhead to database...", type: "success" });

    try {
      const base64Url = await optimizeLetterheadImage(file);
      setSettings(prev => ({ ...prev, bgImage: base64Url, printWithLetterhead: true }));
      setShowWithLetterheadPreview(true);

      let updatedLab: any;
      try {
        updatedLab = await fetchFromLaravel("/lab/letterhead", {
          method: "POST",
          body: JSON.stringify({
            print_bg_image: base64Url,
            print_header_height: settings.headerHeight,
            print_footer_height: settings.footerHeight,
            print_margin_left: settings.marginLeft,
            print_margin_right: settings.marginRight,
            print_with_letterhead: true,
            default_designation: layoutSettings.defaultDesignation || "MR.",
            report_settings: layoutSettings,
            bill_settings: billSettings,
          }),
        });
      } catch (jsonErr: any) {
        console.warn("JSON letterhead upload failed, trying FormData:", jsonErr);
        const formData = new FormData();
        formData.append("letterhead", file);
        formData.append("print_bg_image", base64Url);
        formData.append("print_header_height", String(settings.headerHeight));
        formData.append("print_footer_height", String(settings.footerHeight));
        formData.append("print_margin_left", String(settings.marginLeft));
        formData.append("print_margin_right", String(settings.marginRight));
        formData.append("print_with_letterhead", "1");
        formData.append("default_designation", layoutSettings.defaultDesignation || "MR.");
        formData.append("report_settings", JSON.stringify(layoutSettings));
        formData.append("bill_settings", JSON.stringify(billSettings));

        updatedLab = await fetchFromLaravel("/lab/letterhead", {
          method: "POST",
          body: formData,
        });
      }

      const serverBg = updatedLab?.printBgImage ?? updatedLab?.print_bg_image ?? base64Url;
      const cleanUrl = getCleanLetterheadUrl(serverBg) || base64Url;

      setSettings(prev => ({
        ...prev,
        bgImage: cleanUrl,
        printWithLetterhead: true,
      }));

      try {
        localStorage.setItem("lis_cached_letterhead", cleanUrl);
      } catch {}

      setToast({ text: "Letterhead uploaded & saved permanently in database!", type: "success" });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error("Auto upload letterhead error:", err);
      setToast({ text: err.message || "Failed to save letterhead to server. Please try again.", type: "error" });
    } finally {
      setIsUploadingLetterhead(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const [isDeletingLetterhead, setIsDeletingLetterhead] = useState(false);

  const handleDeleteLetterhead = async () => {
    if (!confirm("Are you sure you want to delete and remove your custom letterhead from the server? Reports will revert to the standard layout.")) {
      return;
    }

    setIsDeletingLetterhead(true);
    setToast({ text: "Deleting letterhead from server...", type: "success" });

    try {
      await fetchFromLaravel("/lab/letterhead", {
        method: "POST",
        body: JSON.stringify({
          delete_letterhead: true,
          print_bg_image: "DELETE",
          print_header_height: settings.headerHeight,
          print_footer_height: settings.footerHeight,
          print_margin_left: settings.marginLeft,
          print_margin_right: settings.marginRight,
          print_with_letterhead: false,
          default_designation: layoutSettings.defaultDesignation,
          report_settings: layoutSettings,
          bill_settings: billSettings,
        }),
      });

      try {
        localStorage.removeItem("lis_cached_letterhead");
      } catch {}

      setSettings(prev => ({
        ...prev,
        bgImage: null,
        printWithLetterhead: false,
      }));
      setToast({ text: "Letterhead removed successfully!", type: "success" });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error("Delete letterhead error:", err);
      setToast({ text: err.message || "Failed to delete letterhead. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsDeletingLetterhead(false);
    }
  };

  // Bill Header & Footer Image upload handlers
  const handleBillHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64Url = await optimizeLetterheadImage(file);
      setBillSettings(prev => ({ ...prev, headerImage: base64Url }));
      setToast({ text: "Bill Header uploaded! Click Save to confirm.", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ text: "Failed to process image.", type: "error" });
    }
  };

  const handleBillFooterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64Url = await optimizeLetterheadImage(file);
      setBillSettings(prev => ({ ...prev, footerImage: base64Url }));
      setToast({ text: "Bill Footer uploaded! Click Save to confirm.", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ text: "Failed to process image.", type: "error" });
    }
  };

  const handleAddSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSigName.trim()) return;
    const newSig: BillSignature = {
      id: `sig-${Date.now()}`,
      name: newSigName.trim(),
      designation: newSigDesig.trim() || "Authorized Signatory",
    };
    setBillSettings(prev => ({
      ...prev,
      signatures: [...(prev.signatures || []), newSig],
    }));
    setNewSigName("");
    setNewSigDesig("");
    setIsSigModalOpen(false);
  };

  const handleRemoveSignature = (id: string) => {
    setBillSettings(prev => ({
      ...prev,
      signatures: prev.signatures.filter(s => s.id !== id),
    }));
  };

  const applyPreset = (preset: "standard" | "compact" | "preprinted") => {
    setActivePreset(preset);
    if (preset === "standard") {
      setSettings(prev => ({
        ...prev,
        headerHeight: 40,
        footerHeight: 40,
        marginLeft: 40,
        marginRight: 40,
        printWithLetterhead: false,
      }));
    } else if (preset === "compact") {
      setSettings(prev => ({
        ...prev,
        headerHeight: 25,
        footerHeight: 25,
        marginLeft: 25,
        marginRight: 25,
        printWithLetterhead: false,
      }));
    } else if (preset === "preprinted") {
      setSettings(prev => ({
        ...prev,
        headerHeight: 185,
        footerHeight: 95,
        marginLeft: 32,
        marginRight: 32,
        printWithLetterhead: true,
      }));
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setToast(null);
    try {
      const updatedLab = await fetchFromLaravel("/lab/letterhead", {
        method: "POST",
        body: JSON.stringify({
          print_bg_image: settings.bgImage,
          print_header_height: settings.headerHeight,
          print_footer_height: settings.footerHeight,
          print_margin_left: settings.marginLeft,
          print_margin_right: settings.marginRight,
          print_with_letterhead: settings.printWithLetterhead,
          default_designation: layoutSettings.defaultDesignation,
          report_settings: layoutSettings,
          bill_settings: billSettings,
        }),
      });

      const returnedBg = updatedLab.printBgImage ?? updatedLab.print_bg_image ?? settings.bgImage;
      const saved: ExtendedPrintSettings = {
        bgImage: getCleanLetterheadUrl(returnedBg),
        headerHeight: updatedLab.printHeaderHeight ?? updatedLab.print_header_height ?? settings.headerHeight,
        footerHeight: updatedLab.printFooterHeight ?? updatedLab.print_footer_height ?? settings.footerHeight,
        marginLeft: updatedLab.printMarginLeft ?? updatedLab.print_margin_left ?? settings.marginLeft,
        marginRight: updatedLab.printMarginRight ?? updatedLab.print_margin_right ?? settings.marginRight,
        printWithLetterhead: updatedLab.printWithLetterhead ?? updatedLab.print_with_letterhead ?? settings.printWithLetterhead,
      };
      setSettings(saved);

      // Invalidate API cache so all open pages/reports immediately get fresh lab settings
      clearApiCache();
      try {
        localStorage.setItem("lis_cached_report_settings", JSON.stringify(layoutSettings));
        window.dispatchEvent(new Event("lis_settings_updated"));
      } catch {}

      setToast({ text: "All Lab, Report & Bill settings saved permanently!", type: "success" });
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      console.error("Save settings error:", e);
      setToast({ text: e.message || "Failed to save settings. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOrderingField = (fieldName: string) => {
    setLayoutSettings(prev => {
      const currentList = [...prev.patientDetailsOrder];
      const index = currentList.indexOf(fieldName);
      if (index >= 0) {
        currentList.splice(index, 1);
      } else {
        currentList.push(fieldName);
      }
      return {
        ...prev,
        patientDetailsOrder: currentList,
      };
    });
  };

  const handleClearAllOrdering = () => {
    setLayoutSettings(prev => ({
      ...prev,
      patientDetailsOrder: [],
    }));
  };

  const handleResetDefaultOrdering = () => {
    setLayoutSettings(prev => ({
      ...prev,
      patientDetailsOrder: [...defaultReportLayoutSettings.patientDetailsOrder],
    }));
  };

  // Department Sequence & Priority handlers (Drag & Drop)
  const currentDeptOrder = layoutSettings.departmentOrder && layoutSettings.departmentOrder.length > 0
    ? layoutSettings.departmentOrder
    : [...DEFAULT_DEPARTMENT_ORDER];

  const [draggedDeptIdx, setDraggedDeptIdx] = useState<number | null>(null);
  const [dragOverDeptIdx, setDragOverDeptIdx] = useState<number | null>(null);

  const handleDeptDragStart = (e: React.DragEvent, index: number) => {
    setDraggedDeptIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDeptDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDeptIdx !== index) {
      setDragOverDeptIdx(index);
    }
  };

  const handleDeptDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDeptDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDeptIdx === null || draggedDeptIdx === targetIndex) {
      setDraggedDeptIdx(null);
      setDragOverDeptIdx(null);
      return;
    }

    const nextOrder = [...currentDeptOrder];
    const [moved] = nextOrder.splice(draggedDeptIdx, 1);
    nextOrder.splice(targetIndex, 0, moved);

    setLayoutSettings(prev => ({
      ...prev,
      departmentOrder: nextOrder,
    }));
    setDraggedDeptIdx(null);
    setDragOverDeptIdx(null);
  };

  const handleDeptDragEnd = () => {
    setDraggedDeptIdx(null);
    setDragOverDeptIdx(null);
  };

  const handleResetDefaultDeptOrder = () => {
    setLayoutSettings(prev => ({
      ...prev,
      departmentOrder: [...DEFAULT_DEPARTMENT_ORDER],
    }));
  };

  const [newCustomDept, setNewCustomDept] = useState("");

  const handleAddCustomDept = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomDept.trim();
    if (!trimmed) return;
    if (!currentDeptOrder.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      setLayoutSettings(prev => ({
        ...prev,
        departmentOrder: [...currentDeptOrder, trimmed],
      }));
    }
    setNewCustomDept("");
  };

  const handleRemoveDept = (deptName: string) => {
    setLayoutSettings(prev => ({
      ...prev,
      departmentOrder: currentDeptOrder.filter(d => d !== deptName),
    }));
  };

  const [intakeCategoryFilter, setIntakeCategoryFilter] = useState<string>("ALL");

  const handleToggleIntakeField = (key: string, property: "enabled" | "required" | "showOnReport") => {
    setLayoutSettings(prev => {
      const currentList = prev.intakeFields && prev.intakeFields.length > 0 ? prev.intakeFields : DEFAULT_INTAKE_FIELDS;
      let nextOrdering = [...prev.patientDetailsOrder];

      const updated = currentList.map(item => {
        if (item.key !== key) return item;
        const newVal = !item[property];
        const nextItem = { ...item, [property]: newVal };
        if (property === "enabled" && !newVal) {
          nextItem.required = false;
        }

        if (property === "showOnReport") {
          const ordName = item.orderingName || item.label;
          if (newVal) {
            if (ordName && !nextOrdering.includes(ordName)) {
              nextOrdering.push(ordName);
            }
          } else {
            if (ordName) {
              nextOrdering = nextOrdering.filter(o => o !== ordName && o !== item.label && o !== item.key);
            }
          }
        }

        return nextItem;
      });

      return {
        ...prev,
        intakeFields: updated,
        patientDetailsOrder: nextOrdering,
      };
    });
  };

  const handleResetDefaultIntakeFields = () => {
    setLayoutSettings(prev => ({
      ...prev,
      intakeFields: DEFAULT_INTAKE_FIELDS.map(f => ({ ...f })),
    }));
  };

  const handleEnableAllIntakeFields = () => {
    setLayoutSettings(prev => {
      const currentList = prev.intakeFields && prev.intakeFields.length > 0 ? prev.intakeFields : DEFAULT_INTAKE_FIELDS;
      return {
        ...prev,
        intakeFields: currentList.map(f => ({ ...f, enabled: true })),
      };
    });
  };

  // Bill Ordering helpers
  const handleToggleBillOrderingField = (fieldName: string) => {
    setBillSettings(prev => {
      const currentList = [...(prev.fieldOrdering || [])];
      const index = currentList.indexOf(fieldName);
      if (index >= 0) {
        currentList.splice(index, 1);
      } else {
        currentList.push(fieldName);
      }
      return {
        ...prev,
        fieldOrdering: currentList,
      };
    });
  };

  const handleClearAllBillOrdering = () => {
    setBillSettings(prev => ({
      ...prev,
      fieldOrdering: [],
    }));
  };


  const handleUpiQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX = 600;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const b64 = canvas.toDataURL("image/png", 0.95);
          setBillSettings(prev => ({
            ...prev,
            upi: {
              ...prev.upi,
              qrImageUrl: b64,
            },
          }));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const activePreviewSettings: PrintSettings = React.useMemo(() => ({
    ...settings,
    bgImage: showWithLetterheadPreview ? settings.bgImage : null,
  }), [settings, showWithLetterheadPreview]);

  const previewReportData = React.useMemo(
    () => getDummyReportWithSettings(layoutSettings, settings),
    [layoutSettings, settings]
  );
  const previewInvoiceData = React.useMemo(
    () => getDummyInvoiceWithSettings(billSettings),
    [billSettings]
  );

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold">Loading Lab, Report & Bill Designer...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[999999] px-5 py-3.5 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30"
              : "bg-destructive text-white border-destructive shadow-destructive/30"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Sticky Header Bar with Sub-Tabs and Save Button */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pb-4 pt-1 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Lab & Stationery Settings
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary uppercase tracking-wider">
              LIS Pro
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fine-tune letterhead margins, medical report layouts, and invoice-cum-receipt billing templates with instant preview.
          </p>

          {/* Top Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 mt-3 bg-muted/60 p-1 rounded-xl w-full sm:w-fit overflow-x-auto border border-border/60 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("letterhead")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "letterhead"
                  ? "bg-background text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Letterhead</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("report-layout")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "report-layout"
                  ? "bg-background text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layout className="h-3.5 w-3.5" />
              <span>Report Layout</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bills-layout")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "bills-layout"
                  ? "bg-background text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Bills Layout</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("collection-centers")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "collection-centers"
                  ? "bg-background text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Role-Based Access Control: B2B Partners & Collection Centers"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>RBAC</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payment-gateway")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "payment-gateway"
                  ? "bg-background text-primary shadow-xs font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Payment Gateway & UPI Bank Settlement"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Payment Gateway</span>
            </button>
          </div>
        </div>

        {activeTab !== "collection-centers" && activeTab !== "payment-gateway" && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-105 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 ring-inset-top"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: LETTERHEAD DESIGNER */}
      {activeTab === "letterhead" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Left Side: Controls & Sliders */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-card border border-border/90 rounded-xl shadow-xs space-y-6">
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">Interactive Margin Controls</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Adjust printable boundaries. Changes reflect live on the real-time canvas sheet.
                </p>
              </div>

              {/* Slider 1: Top Margin / Header Height */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Top Margin (Header Spacing)</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                    {settings.headerHeight} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={settings.headerHeight}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setSettings(prev => ({ ...prev, headerHeight: Number(e.target.value) }));
                  }}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0 px</span>
                  <span>150 px</span>
                  <span>300 px</span>
                </div>
              </div>

              {/* Slider 2: Bottom Margin / Footer Height */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Bottom Margin (Footer Spacing)</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                    {settings.footerHeight} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={settings.footerHeight}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setSettings(prev => ({ ...prev, footerHeight: Number(e.target.value) }));
                  }}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0 px</span>
                  <span>150 px</span>
                  <span>300 px</span>
                </div>
              </div>

              {/* Slider 3: Left Margin */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Left Margin</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                    {settings.marginLeft} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.marginLeft}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setSettings(prev => ({ ...prev, marginLeft: Number(e.target.value) }));
                  }}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Slider 4: Right Margin */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Right Margin</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                    {settings.marginRight} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.marginRight}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setSettings(prev => ({ ...prev, marginRight: Number(e.target.value) }));
                  }}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Quick Layout Presets */}
              <div className="pt-2 border-t border-border/80">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Quick Layout Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("standard")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                      activePreset === "standard"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("compact")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                      activePreset === "compact"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("preprinted")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                      activePreset === "preprinted"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    Stationery
                  </button>
                </div>
              </div>
            </div>

            {/* Letterhead Upload Box */}
            <div className="p-6 bg-card border border-border/90 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground">Letterhead Background Image</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Upload your official clinic or hospital stationery pad (PNG / JPG).
                  </p>
                </div>
                {settings.bgImage && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>

              {settings.bgImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-border overflow-hidden bg-muted/40 p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-11 rounded border border-border/80 bg-white overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                        <img
                          src={settings.bgImage}
                          alt="Uploaded Letterhead"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">Custom Letterhead Uploaded</p>
                        <p className="text-[11px] text-muted-foreground">Stored on server & database</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <span>Change</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploadingLetterhead}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDeleteLetterhead}
                        disabled={isDeletingLetterhead}
                        className="px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        {isDeletingLetterhead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/60">
                    <input
                      type="checkbox"
                      id="printWithLetterheadCheck"
                      checked={settings.printWithLetterhead}
                      onChange={(e) => setSettings(prev => ({ ...prev, printWithLetterhead: e.target.checked }))}
                      className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                    />
                    <label htmlFor="printWithLetterheadCheck" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Apply Letterhead Background automatically by default during report generation
                    </label>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border/90 hover:border-primary/60 hover:bg-primary/5 transition-all rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group space-y-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    {isUploadingLetterhead ? (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {isUploadingLetterhead ? "Uploading & Compressing..." : "Click or drag letterhead image to upload"}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Recommended A4 image (up to 25MB). Auto-optimized to crisp resolution for instant loading.
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingLetterhead}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Right Side: Live Interactive ReportSheet Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/80 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground">Interactive Live Preview</span>
                <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground font-mono font-bold">
                    A4 Canvas ({Math.round(previewScale * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {settings.bgImage && (
                  <button
                    type="button"
                    onClick={() => setShowWithLetterheadPreview(!showWithLetterheadPreview)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      showWithLetterheadPreview
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {showWithLetterheadPreview ? "Letterhead: ON" : "Letterhead: OFF"}
                  </button>
                )}

                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setPreviewScale(prev => Math.max(0.35, prev - 0.05))}
                    className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScale(0.55)}
                    className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScale(prev => Math.min(0.85, prev + 0.05))}
                    className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 border border-border/80 rounded-2xl p-2 sm:p-6 flex justify-center overflow-auto sheet-pan-canvas min-h-[640px]">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top center",
                  width: "794px",
                  height: "1123px",
                  marginBottom: `-${1123 * (1 - previewScale)}px`,
                  marginRight: `-${794 * (1 - previewScale) / 2}px`,
                  marginLeft: `-${794 * (1 - previewScale) / 2}px`,
                }}
                className="shadow-2xl ring-1 ring-border bg-white rounded-sm shrink-0 transition-transform duration-200"
              >
                <ReportSheet
                  report={previewReportData}
                  settings={activePreviewSettings}
                  showMarginGuides={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORT LAYOUT */}
      {activeTab === "report-layout" && (
        <div className="space-y-8 animate-fade-in">
          {/* SECTION 1: DEFAULT DESIGNATION */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span>Default Designation</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select which title / salutation will be selected by default on the patient registration form.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
                Selected: {layoutSettings.defaultDesignation}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2">
              {ALL_DESIGNATIONS.map((title) => {
                const isSelected = layoutSettings.defaultDesignation === title;
                return (
                  <label
                    key={title}
                    onClick={() => setLayoutSettings(prev => ({ ...prev, defaultDesignation: title }))}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-extrabold ring-2 ring-primary/20"
                        : "bg-background border-border/80 text-foreground hover:bg-muted/60 hover:border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="defaultDesignation"
                      checked={isSelected}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-white bg-white text-primary" : "border-muted-foreground/40 bg-transparent"
                    }`}>
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <span className="truncate">{title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: REPORT SETTING & FLAGS */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div className="border-b border-border/80 pb-3">
              <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span>Report Setting</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure visible columns, abnormal flag highlights, and color pickers.
              </p>
            </div>

            {/* Fields to Show */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fields to Show
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "testMethod", label: "Test Method" },
                  { key: "interpretation", label: "Interpretation" },
                  { key: "phoneNumber", label: "Phone Number" },
                  { key: "departmentName", label: "Department Name" },
                ].map(({ key, label }) => {
                  const val = (layoutSettings.fieldsToShow as any)[key] ?? false;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 transition-colors cursor-pointer select-none text-xs font-semibold text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setLayoutSettings(prev => ({
                            ...prev,
                            fieldsToShow: {
                              ...prev.fieldsToShow,
                              [key]: checked,
                            },
                          }));
                        }}
                        className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Low and High Flag Indication & Color Pickers */}
            <div className="pt-4 border-t border-border/80 space-y-4">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="flagIndicationCheck"
                  checked={layoutSettings.flags.enabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLayoutSettings(prev => ({
                      ...prev,
                      flags: { ...prev.flags, enabled: checked },
                    }));
                  }}
                  className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                />
                <label htmlFor="flagIndicationCheck" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  Low and High Flag Indication
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-6 bg-muted/40 p-4 rounded-xl border border-border/60">
                {/* Low Color Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Low:</span>
                  <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 shadow-2xs">
                    <input
                      type="color"
                      value={layoutSettings.flags.lowColor || "#000000"}
                      onChange={(e) => {
                        const color = e.target.value;
                        setLayoutSettings(prev => ({
                          ...prev,
                          flags: { ...prev.flags, lowColor: color },
                        }));
                      }}
                      className="h-5 w-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-xs font-mono font-bold text-foreground uppercase">
                      {layoutSettings.flags.lowColor || "#000000"}
                    </span>
                  </div>
                </div>

                {/* High Color Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">High:</span>
                  <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 shadow-2xs">
                    <input
                      type="color"
                      value={layoutSettings.flags.highColor || "#000000"}
                      onChange={(e) => {
                        const color = e.target.value;
                        setLayoutSettings(prev => ({
                          ...prev,
                          flags: { ...prev.flags, highColor: color },
                        }));
                      }}
                      className="h-5 w-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-xs font-mono font-bold text-foreground uppercase">
                      {layoutSettings.flags.highColor || "#000000"}
                    </span>
                  </div>
                </div>

                {/* Bold only Result and Flag Column */}
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={layoutSettings.flags.boldOnlyResultAndFlag}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLayoutSettings(prev => ({
                        ...prev,
                        flags: { ...prev.flags, boldOnlyResultAndFlag: checked },
                      }));
                    }}
                    className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                  />
                  <span>Bold only Result and Flag Column</span>
                </label>

                {/* Show high and low arrows */}
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={layoutSettings.flags.showArrows}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLayoutSettings(prev => ({
                        ...prev,
                        flags: { ...prev.flags, showArrows: checked },
                      }));
                    }}
                    className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                  />
                  <span>Show high and low arrows (▲ / ▼)</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: PATIENT INTAKE & REGISTRATION FIELDS (FORM RULES) */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-bold text-foreground">
                    Patient Intake Fields & Form Rules
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                    Registration & Report Sync
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose which fields appear on the patient intake/registration page, set mandatory validation rules, and configure whether they print on the diagnostic report header.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleEnableAllIntakeFields}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  <span>Enable All</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultIntakeFields}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: "ALL", label: "All Fields", count: (layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS).length },
                { id: "Demographics", label: "Demographics", count: (layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS).filter(f => f.category === "Demographics").length },
                { id: "Clinical & Referral", label: "Clinical & Referral", count: (layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS).filter(f => f.category === "Clinical & Referral").length },
                { id: "Identification & Documents", label: "Identification & ID", count: (layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS).filter(f => f.category === "Identification & Documents").length },
                { id: "Logistics & Physical", label: "Logistics & Physical", count: (layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS).filter(f => f.category === "Logistics & Physical").length },
                { id: "Veterinary", label: "Veterinary", count: (layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS).filter(f => f.category === "Veterinary").length },
              ].map(cat => {
                const isActive = intakeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setIntakeCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border inline-flex items-center gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-extrabold ring-1 ring-primary/20"
                        : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Intake Fields Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {(layoutSettings.intakeFields || DEFAULT_INTAKE_FIELDS)
                .filter(field => intakeCategoryFilter === "ALL" || field.category === intakeCategoryFilter)
                .map(field => {
                  return (
                    <div
                      key={field.key}
                      className={`p-4 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                        field.enabled
                          ? "bg-card border-primary/40 ring-1 ring-primary/10"
                          : "bg-muted/20 border-border/70 opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="text-rose-500 font-extrabold text-sm" title="Mandatory Field">*</span>
                            )}
                          </p>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            Tag: {field.orderingName}
                          </span>
                        </div>
                        <span className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          field.enabled
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}>
                          {field.enabled ? "Active on Form" : "Disabled"}
                        </span>
                      </div>

                      {/* 3 Interactive Option Checkboxes */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px]">
                        {/* 1. Show on Registration Form */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={() => handleToggleIntakeField(field.key, "enabled")}
                            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                          />
                          <span className="truncate">Form</span>
                        </label>

                        {/* 2. Mandatory Validation */}
                        <label className={`flex items-center gap-1.5 select-none font-semibold ${
                          field.enabled ? "cursor-pointer text-foreground" : "cursor-not-allowed text-muted-foreground opacity-50"
                        }`}>
                          <input
                            type="checkbox"
                            disabled={!field.enabled}
                            checked={field.required}
                            onChange={() => handleToggleIntakeField(field.key, "required")}
                            className="h-3.5 w-3.5 rounded border-border text-rose-600 accent-rose-600 cursor-pointer shrink-0"
                          />
                          <span className="truncate text-rose-600 dark:text-rose-400 font-bold">Required*</span>
                        </label>

                        {/* 3. Show on Report Header */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={field.showOnReport}
                            onChange={() => handleToggleIntakeField(field.key, "showOnReport")}
                            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                          />
                          <span className="truncate">On Report</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* SECTION 4: REPORT ORDERING */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  <span>Report Ordering (Patient Details Box)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click fields to select and sequence what appears in the patient information header on the report.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAllOrdering}
                  className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultOrdering}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {ALL_ORDERING_FIELDS.map((fieldName) => {
                const seqIndex = layoutSettings.patientDetailsOrder.indexOf(fieldName);
                const isSelected = seqIndex >= 0;

                return (
                  <button
                    key={fieldName}
                    type="button"
                    onClick={() => handleToggleOrderingField(fieldName)}
                    className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all border inline-flex items-center gap-2 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/20 pr-7"
                        : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <span>{fieldName}</span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                        {seqIndex + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION: DEPARTMENT SEQUENCE & GROUPING PRIORITY */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-base font-bold text-foreground">
                    Department Sequence & Grouping Priority
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    layoutSettings.groupByDepartment
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}>
                    {layoutSettings.groupByDepartment ? "Active (Department-wise)" : "Default (Medical Priority)"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure whether reports group investigations by department, and drag-and-drop departments to set their display priority.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetDefaultDeptOrder}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Reset to default medical sequence (Haematology, Biochemistry, Serology, etc.)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Default Order</span>
                </button>
              </div>
            </div>

            {/* Department-Wise Grouping Checkbox / Toggle */}
            <label className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!layoutSettings.groupByDepartment}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLayoutSettings(prev => ({
                    ...prev,
                    groupByDepartment: checked,
                  }));
                }}
                className="h-5 w-5 rounded border-border text-primary accent-primary cursor-pointer shrink-0 mt-0.5 sm:mt-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-foreground">
                    Show Reports Department-Wise (Group by Department)
                  </span>
                  {layoutSettings.groupByDepartment && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3" /> Enabled
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When enabled, all tests of each department stay grouped together in the priority sequence set below. When disabled, the report uses default clinical priority layout.
                </p>
              </div>
            </label>

            {/* Department Drag & Drop Reorder List */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between px-1">
                <span>Drag &amp; Drop to Reorder Priority ({currentDeptOrder.length} Departments)</span>
                <span className="text-[10px] text-primary font-medium">Hold &amp; Drag cards to change sequence</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentDeptOrder.map((deptName, idx) => {
                  const isDragging = draggedDeptIdx === idx;
                  const isOver = dragOverDeptIdx === idx && draggedDeptIdx !== idx;

                  return (
                    <div
                      key={deptName}
                      draggable
                      onDragStart={(e) => handleDeptDragStart(e, idx)}
                      onDragOver={(e) => handleDeptDragOver(e, idx)}
                      onDragLeave={handleDeptDragLeave}
                      onDrop={(e) => handleDeptDrop(e, idx)}
                      onDragEnd={handleDeptDragEnd}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none shadow-2xs group ${
                        isDragging
                          ? "opacity-30 border-dashed border-primary bg-primary/10 scale-[0.98]"
                          : isOver
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5 scale-[1.01]"
                          : "border-border/80 bg-background hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Drag Handle */}
                        <div className="p-1 text-muted-foreground/60 group-hover:text-foreground shrink-0 rounded transition-colors">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Order Badge */}
                        <span className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                          idx === 0
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : idx === 1
                            ? "bg-primary/20 text-primary font-extrabold"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </span>

                        <div className="flex items-center gap-2 min-w-0">
                          <FlaskConical className="h-4 w-4 text-primary shrink-0 opacity-70" />
                          <span className="font-bold text-xs text-foreground truncate">{deptName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDept(deptName);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Remove from list"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Department Input */}
            <form onSubmit={handleAddCustomDept} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add another department (e.g. Molecular Biology, Allergy, Cytology)…"
                value={newCustomDept}
                onChange={(e) => setNewCustomDept(e.target.value)}
                className="flex-1 bg-background border border-border/80 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary font-medium"
              />
              <button
                type="submit"
                disabled={!newCustomDept.trim()}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-xl shadow-xs hover:-translate-y-px transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Department</span>
              </button>
            </form>
          </div>

          {/* SECTION 4: TESTS TYPOGRAPHY */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div className="border-b border-border/80 pb-3">
              <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <span>Tests (Typography & Layout)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize font sizes, spacing, lines, and alignments for investigation headers and parameter rows.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Department font size</label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={layoutSettings.typography.departmentFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      typography: { ...prev.typography, departmentFontSize: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Column Heading font size</label>
                <input
                  type="number"
                  min="8"
                  max="20"
                  value={layoutSettings.typography.columnHeadingFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      typography: { ...prev.typography, columnHeadingFontSize: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Name font size</label>
                <input
                  type="number"
                  min="8"
                  max="24"
                  value={layoutSettings.typography.testNameFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      typography: { ...prev.typography, testNameFontSize: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Parameter comment font size</label>
                <input
                  type="number"
                  min="7"
                  max="18"
                  value={layoutSettings.typography.parameterCommentFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      typography: { ...prev.typography, parameterCommentFontSize: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Parameter font size</label>
                <input
                  type="number"
                  min="8"
                  max="20"
                  value={layoutSettings.typography.testParameterFontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      typography: { ...prev.typography, testParameterFontSize: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Method font size and color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="6"
                    max="16"
                    value={layoutSettings.typography.testMethodFontSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLayoutSettings(prev => ({
                        ...prev,
                        typography: { ...prev.typography, testMethodFontSize: val },
                      }));
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                  />
                  <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-2 shadow-2xs shrink-0">
                    <input
                      type="color"
                      value={layoutSettings.typography.testMethodColor || "#71717a"}
                      onChange={(e) => {
                        const color = e.target.value;
                        setLayoutSettings(prev => ({
                          ...prev,
                          typography: { ...prev.typography, testMethodColor: color },
                        }));
                      }}
                      className="h-5 w-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-xs font-mono font-bold text-foreground uppercase">
                      {layoutSettings.typography.testMethodColor || "#71717a"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes Row */}
            <div className="pt-3 border-t border-border/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "showBarcode", label: "Barcode on Report" },
                { key: "removeLineAtEndOfTest", label: "Remove line at the end of test" },
                { key: "lineBelowEachParameterRow", label: "Line below each parameter row" },
                { key: "leftAlignSubParameters", label: "Left align sub-parameters" },
                { key: "boldMultiTypeParameter", label: "Bold multi-type parameter" },
                { key: "properCaseTestNames", label: "Proper case test names" },
              ].map(({ key, label }) => {
                const val = (layoutSettings.typography as any)[key] ?? false;
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 transition-colors cursor-pointer select-none text-xs font-semibold text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLayoutSettings(prev => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            [key]: checked,
                          },
                        }));
                      }}
                      className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>

            {/* Alignments Sub-grid */}
            <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Department Name Alignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Department Alignment</label>
                <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                  {(["Left", "Center", "Right"] as const).map((align) => {
                    const current = layoutSettings.typography.departmentNameAlignment || "Center";
                    const isSelected = current.toLowerCase() === align.toLowerCase();
                    return (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setLayoutSettings(prev => ({
                          ...prev,
                          typography: { ...prev.typography, departmentNameAlignment: align }
                        }))}
                        className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {align}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Test Name Alignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Title Alignment</label>
                <div className="grid grid-cols-2 gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                  {(["Left", "Middle"] as const).map((align) => {
                    const current = layoutSettings.typography.testNameAlignment || "Left";
                    const isSelected = current.toLowerCase() === align.toLowerCase();
                    return (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setLayoutSettings(prev => ({
                          ...prev,
                          typography: { ...prev.typography, testNameAlignment: align }
                        }))}
                        className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {align === "Middle" ? "Center" : "Left"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row Vertical Alignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Row Vertical Alignment</label>
                <div className="grid grid-cols-2 gap-1 bg-muted/50 p-1 rounded-xl border border-border">
                  {(["Middle", "Top"] as const).map((align) => {
                    const current = layoutSettings.typography.rowAlignment || "Middle";
                    const isSelected = current.toLowerCase() === align.toLowerCase();
                    return (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setLayoutSettings(prev => ({
                          ...prev,
                          typography: { ...prev.typography, rowAlignment: align }
                        }))}
                        className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          isSelected ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {align}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: SPACING & INTERCHANGE COLUMNS */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div className="border-b border-border/80 pb-3">
              <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <MoveHorizontal className="h-4 w-4 text-primary" />
                <span>Spacing & Column Placement</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fine-tune vertical spacing across investigation sections and toggle column order.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Department</label>
                <input
                  type="number"
                  value={layoutSettings.spacing.department}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      spacing: { ...prev.spacing, department: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Name</label>
                <input
                  type="number"
                  value={layoutSettings.spacing.testName}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      spacing: { ...prev.spacing, testName: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Column Header</label>
                <input
                  type="number"
                  value={layoutSettings.spacing.columnHeader}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      spacing: { ...prev.spacing, columnHeader: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Parameters</label>
                <input
                  type="number"
                  value={layoutSettings.spacing.testParameters}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      spacing: { ...prev.spacing, testParameters: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Parameter comment</label>
                <input
                  type="number"
                  value={layoutSettings.spacing.parameterComment}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      spacing: { ...prev.spacing, parameterComment: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Test Method</label>
                <input
                  type="number"
                  value={layoutSettings.spacing.testMethod}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLayoutSettings(prev => ({
                      ...prev,
                      spacing: { ...prev.spacing, testMethod: val },
                    }));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/80 space-y-2">
              <label className="text-xs font-bold text-foreground block">Interchange Columns</label>
              <button
                type="button"
                onClick={() => {
                  setLayoutSettings(prev => ({
                    ...prev,
                    spacing: {
                      ...prev.spacing,
                      interchangeColumns: !prev.spacing.interchangeColumns,
                    },
                  }));
                }}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all inline-flex items-center gap-2.5 cursor-pointer shadow-xs ${
                  layoutSettings.spacing.interchangeColumns
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
              >
                <span>Ref. Range</span>
                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary-foreground">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-current" />
                </div>
                <span>Unit</span>
                {layoutSettings.spacing.interchangeColumns && (
                  <span className="ml-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    (Swapped)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 6: COLUMN WIDTH & LABELS */}
          <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div className="border-b border-border/80 pb-3">
              <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Columns className="h-4 w-4 text-primary" />
                <span>Column Width & Labelling</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize column width percentages and header display labels for table investigations.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Column Width (%)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {([
                  { key: "testDescription", label: "Test Description (%)" },
                  { key: "result", label: "Result (%)" },
                  { key: "flag", label: "Flag (%)" },
                  { key: "refRange", label: "Ref. Range (%)" },
                  { key: "unit", label: "Unit (%)" },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">{label}</label>
                    <input
                      type="number"
                      value={(layoutSettings.columnWidth as any)[key]}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLayoutSettings(prev => ({
                          ...prev,
                          columnWidth: { ...prev.columnWidth, [key]: val },
                        }));
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Column Labelling
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {([
                  { key: "testDescription", label: "Test Description" },
                  { key: "result", label: "Result" },
                  { key: "flag", label: "Flag" },
                  { key: "refRange", label: "Ref. Range" },
                  { key: "unit", label: "Unit" },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">{label}</label>
                    <input
                      type="text"
                      value={(layoutSettings.columnLabels as any)[key]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLayoutSettings(prev => ({
                          ...prev,
                          columnLabels: { ...prev.columnLabels, [key]: val },
                        }));
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

            {/* SECTION 7: DOCTOR DIGITAL SIGNATURE & AUTHENTICATION */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-base font-bold text-foreground">
                      Doctor Digital Signatures
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {(layoutSettings.doctorSignatures || [layoutSettings.doctorSignature]).length} Doctor{(layoutSettings.doctorSignatures || [layoutSettings.doctorSignature]).length > 1 ? "s" : ""} Added
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload and manage official doctor/pathologist signatures. You can add multiple doctors to appear on reports simultaneously (e.g. Consultant Pathologist, Lab Director, Biochemist). White paper backgrounds are auto-removed to clean transparent PNGs.
                  </p>
                </div>
              </div>

              {/* Signature Display & Printing Rules */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Signature Printing & Display Options
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Print on every page */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 cursor-pointer transition-all select-none group">
                    <input
                      type="checkbox"
                      checked={Boolean(layoutSettings.signatureSettings?.printOnEveryPage || layoutSettings.signaturePrintOnEveryPage)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLayoutSettings(prev => ({
                          ...prev,
                          signatureSettings: {
                            ...prev.signatureSettings,
                            printOnEveryPage: checked,
                          },
                          signaturePrintOnEveryPage: checked,
                        }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                        Signature Print on Every Page
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        When ticked, signatures appear at the bottom of <strong>every page</strong>. When unticked (default), signatures appear only on the <strong>last page</strong>.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Show signature image only */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 cursor-pointer transition-all select-none group">
                    <input
                      type="checkbox"
                      checked={Boolean(layoutSettings.signatureSettings?.showSignatureOnly || layoutSettings.showSignatureOnly)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLayoutSettings(prev => ({
                          ...prev,
                          signatureSettings: {
                            ...prev.signatureSettings,
                            showSignatureOnly: checked,
                          },
                          showSignatureOnly: checked,
                        }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                        Show Signature Image Only
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        When ticked, only the <strong>signature image</strong> is printed on reports. Doctor name, degree/designation, and council registration number are hidden.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Static Fixed vs Dynamic Flow Mode */}
                <div className="pt-3 border-t border-border/70 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">
                      Canvas Positioning Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLayoutSettings(prev => ({
                            ...prev,
                            signatureSettings: {
                              ...prev.signatureSettings,
                              positionMode: "fixed",
                            },
                          }));
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer select-none ${
                          (layoutSettings.signatureSettings?.positionMode ?? "fixed") === "fixed"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                            : "bg-background border-border text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-extrabold">📌 Static Fixed Position</span>
                        <span className={`text-[10px] font-normal ${
                          (layoutSettings.signatureSettings?.positionMode ?? "fixed") === "fixed" ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}>
                          Locked coordinates on canvas, unaffected by table row counts
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLayoutSettings(prev => ({
                            ...prev,
                            signatureSettings: {
                              ...prev.signatureSettings,
                              positionMode: "flow",
                            },
                          }));
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer select-none ${
                          (layoutSettings.signatureSettings?.positionMode ?? "fixed") === "flow"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                            : "bg-background border-border text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="font-extrabold">🌊 Dynamic Flow</span>
                        <span className={`text-[10px] font-normal ${
                          (layoutSettings.signatureSettings?.positionMode ?? "fixed") === "flow" ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}>
                          Appears immediately following report table content
                        </span>
                      </button>
                    </div>
                  </div>

                  {(layoutSettings.signatureSettings?.positionMode ?? "fixed") === "fixed" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      {/* Slider: Distance from Bottom */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">Vertical Distance from Bottom</span>
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                            {layoutSettings.signatureSettings?.bottomOffset ?? 45} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="300"
                          value={layoutSettings.signatureSettings?.bottomOffset ?? 45}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLayoutSettings(prev => ({
                              ...prev,
                              signatureSettings: {
                                ...prev.signatureSettings,
                                bottomOffset: val,
                              },
                            }));
                          }}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0 px</span>
                          <span>150 px</span>
                          <span>300 px</span>
                        </div>
                      </div>

                      {/* Horizontal Alignment */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground block">
                          Horizontal Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-background p-1 rounded-xl border border-border">
                          {(["left", "center", "right"] as const).map((align) => {
                            const currentAlign = layoutSettings.signatureSettings?.horizontalAlign ?? "right";
                            const isSel = currentAlign === align;
                            return (
                              <button
                                key={align}
                                type="button"
                                onClick={() => {
                                  setLayoutSettings(prev => ({
                                    ...prev,
                                    signatureSettings: {
                                      ...prev.signatureSettings,
                                      horizontalAlign: align,
                                    },
                                  }));
                                }}
                                className={`py-1 text-xs font-bold capitalize rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                                  isSel
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {align === "left" && <AlignLeft className="h-3 w-3" />}
                                {align === "center" && <AlignCenter className="h-3 w-3" />}
                                {align === "right" && <AlignRight className="h-3 w-3" />}
                                <span>{align}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Horizontal Offset */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">Horizontal Offset (From Edge)</span>
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                            {layoutSettings.signatureSettings?.horizontalOffset ?? 36} px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="300"
                          value={layoutSettings.signatureSettings?.horizontalOffset ?? 36}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLayoutSettings(prev => ({
                              ...prev,
                              signatureSettings: {
                                ...prev.signatureSettings,
                                horizontalOffset: val,
                              },
                            }));
                          }}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0 px</span>
                          <span>150 px</span>
                          <span>300 px</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* List of Doctor Signatures */}
              <div className="space-y-6">
                {(layoutSettings.doctorSignatures && layoutSettings.doctorSignatures.length > 0 ? layoutSettings.doctorSignatures : [layoutSettings.doctorSignature]).map((sig, sigIndex) => {
                  const rawSig = rawUploadedSigMap[sigIndex] || null;
                  const sens = sigSensitivityMap[sigIndex] ?? 210;
                  const isProcessingThisSig = processingSigIdx === sigIndex;
                  const totalSigs = (layoutSettings.doctorSignatures && layoutSettings.doctorSignatures.length > 0 ? layoutSettings.doctorSignatures : [layoutSettings.doctorSignature]).length;

                  return (
                    <div 
                      key={sig.id || `doc-sig-${sigIndex}`}
                      className="p-5 rounded-2xl border border-border bg-card/60 shadow-xs space-y-5"
                    >
                      {/* Doctor Card Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                            {sigIndex + 1}
                          </span>
                          <span className="font-bold text-sm text-foreground">
                            {sig.name || `Doctor #${sigIndex + 1}`}
                          </span>
                          {sig.designation && (
                            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                              • {sig.designation}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted/40 cursor-pointer text-xs font-bold select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(sig.enabled)}
                              onChange={(e) => handleUpdateDoctorSig(sigIndex, { enabled: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer"
                            />
                            <span>Show on Report</span>
                          </label>

                          {totalSigs > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDoctorSig(sigIndex)}
                              className="p-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Delete this Doctor Signature"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {!sig.enabled && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                          <span>⚠️ Signature is currently unticked (OFF). Tick &quot;Show on Report&quot; above when you want this signature to appear on reports.</span>
                        </div>
                      )}

                      <div className="space-y-6 animate-fade-in">
                          {/* Doctor Signature Details & Upload */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            {/* Image Upload / Cutout Preview */}
                            <div className="md:col-span-5 space-y-3">
                              <label className="text-xs font-bold text-foreground block">
                                Signature Image (.png, .jpg)
                              </label>

                              {sig.imageUrl ? (
                                <div className="space-y-3">
                                  <div 
                                    className="relative rounded-xl border-2 border-dashed border-primary/40 p-4 flex items-center justify-center min-h-[120px] overflow-hidden"
                                    style={{
                                      backgroundImage: `
                                        linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
                                        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
                                        linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
                                        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
                                      `,
                                      backgroundSize: '16px 16px',
                                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                      backgroundColor: '#ffffff'
                                    }}
                                  >
                                    <img
                                      src={sig.imageUrl}
                                      alt={sig.name || `Doctor #${sigIndex + 1}`}
                                      className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
                                    />

                                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                                        Transparent PNG
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRawUploadedSigMap(prev => ({ ...prev, [sigIndex]: "" }));
                                          handleUpdateDoctorSig(sigIndex, { imageUrl: null });
                                        }}
                                        className="p-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs"
                                        title="Delete Signature"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Sensitivity Slider */}
                                  {rawSig && (
                                    <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-foreground flex items-center gap-1.5">
                                          <Sliders className="h-3.5 w-3.5 text-primary" />
                                          <span>Auto Background Removal</span>
                                        </span>
                                        <span className="font-mono font-bold text-primary">{sens}</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="140"
                                        max="245"
                                        value={sens}
                                        disabled={isProcessingThisSig}
                                        onChange={(e) => handleReprocessSignature(Number(e.target.value), sigIndex)}
                                        className="w-full accent-primary cursor-pointer"
                                      />
                                      <p className="text-[10px] text-muted-foreground">
                                        Slide right if paper tone remains; slide left if ink lines appear faint.
                                      </p>
                                    </div>
                                  )}

                                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-muted/40 cursor-pointer transition-colors">
                                    <Upload className="h-3.5 w-3.5 text-primary" />
                                    <span>Replace Signature File</span>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      onChange={(e) => handleDoctorSignatureUpload(e, sigIndex)}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/90 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 rounded-2xl p-6 text-center cursor-pointer transition-all group">
                                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                    {isProcessingThisSig ? (
                                      <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                      <Upload className="h-6 w-6" />
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-foreground">
                                    {isProcessingThisSig ? "Removing background..." : "Upload Signature Image"}
                                  </span>
                                  <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                                    Upload PNG or photo on white paper. Background will be removed automatically to transparent.
                                  </p>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    disabled={isProcessingThisSig}
                                    onChange={(e) => handleDoctorSignatureUpload(e, sigIndex)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>

                            {/* Doctor Metadata (Name, Designation, Reg No, Alignment) */}
                            <div className="md:col-span-7 space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Doctor Full Name</label>
                                <input
                                  type="text"
                                  value={sig.name}
                                  onChange={(e) => handleUpdateDoctorSig(sigIndex, { name: e.target.value })}
                                  placeholder="Dr. S. K. Mukherjee"
                                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-foreground">Designation & Degree</label>
                                  <input
                                    type="text"
                                    value={sig.designation}
                                    onChange={(e) => handleUpdateDoctorSig(sigIndex, { designation: e.target.value })}
                                    placeholder="Consultant Pathologist, MD"
                                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-foreground">Medical Council Reg. No</label>
                                  <input
                                    type="text"
                                    value={sig.registrationNo || ""}
                                    onChange={(e) => handleUpdateDoctorSig(sigIndex, { registrationNo: e.target.value })}
                                    placeholder="Reg. No: 48291/MCI"
                                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                                  />
                                </div>
                              </div>

                              {/* Alignment Row */}
                              <div className="space-y-1.5 pt-1">
                                <label className="text-xs font-bold text-foreground block">
                                  Signature Alignment / Position on Page
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(["left", "center", "right"] as const).map((align) => {
                                    const isSel = (sig.alignment || (sigIndex % 2 === 0 ? "left" : "right")) === align;
                                    return (
                                      <button
                                        key={align}
                                        type="button"
                                        onClick={() => handleUpdateDoctorSig(sigIndex, { alignment: align })}
                                        className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                                          isSel
                                            ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                                            : "bg-background border-border text-foreground hover:bg-muted/40"
                                        }`}
                                      >
                                        {align === "left" && <AlignLeft className="h-3.5 w-3.5" />}
                                        {align === "center" && <AlignCenter className="h-3.5 w-3.5" />}
                                        {align === "right" && <AlignRight className="h-3.5 w-3.5" />}
                                        <span>{align}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Margins & Size Sliders Box */}
                          <div className="p-4 rounded-xl bg-muted/20 border border-border/80 space-y-4">
                            <div className="flex flex-wrap items-center justify-between border-b border-border/80 pb-2.5 gap-2">
                              <div className="flex items-center gap-2">
                                <Sliders className="h-3.5 w-3.5 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                  Doctor #{sigIndex + 1} Size & Margin Sliders
                                </h3>
                              </div>

                              {/* Quick Placement Presets & Reset */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDoctorSig(sigIndex, {
                                    marginTop: 450,
                                    marginBottom: 0,
                                  })}
                                  className="px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-[10.5px] font-bold text-primary transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Slide signature all the way down to touch the letterhead footer"
                                >
                                  <span>👇 Push to Footer</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDoctorSig(sigIndex, {
                                    marginTop: 16,
                                    marginBottom: 0,
                                  })}
                                  className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-[10.5px] font-bold text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Position right below the test tables"
                                >
                                  <span>📄 Below Tests</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDoctorSig(sigIndex, {
                                    marginTop: -10,
                                    marginBottom: 0,
                                  })}
                                  className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-[10.5px] font-bold text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Pull signature upwards towards test content"
                                >
                                  <span>⬆️ Compact</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDoctorSig(sigIndex, {
                                    width: 130,
                                    marginTop: 0,
                                    marginBottom: 0,
                                    marginLeft: 0,
                                    marginRight: 0,
                                  })}
                                  className="px-2 py-1 rounded-lg border border-border bg-background hover:bg-muted text-[10.5px] font-bold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Reset all margins to default"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Reset</span>
                                </button>
                              </div>
                            </div>

                            {/* Width Slider + Numeric Input */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs font-bold text-foreground">
                                <span>Signature Width / Scale</span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="50"
                                    max="320"
                                    step="5"
                                    value={sig.width || 130}
                                    onChange={(e) => handleUpdateDoctorSig(sigIndex, { width: Number(e.target.value) })}
                                    className="w-16 px-2 py-0.5 text-right font-mono text-xs rounded-md bg-background border border-border text-primary font-bold focus:border-primary outline-none"
                                  />
                                  <span className="text-[11px] text-muted-foreground">px</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="50"
                                max="320"
                                step="5"
                                value={sig.width || 130}
                                onChange={(e) => handleUpdateDoctorSig(sigIndex, { width: Number(e.target.value) })}
                                className="w-full accent-primary cursor-pointer"
                              />
                            </div>

                            {/* 4-Direction Margins Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                              {/* Top Margin */}
                              <div className="space-y-1.5 p-2.5 rounded-xl bg-background border border-border/80 hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-center text-[11px] font-bold text-foreground">
                                  <span className="flex items-center gap-1">Top Margin <span className="text-[9px] text-muted-foreground">(to footer)</span></span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="-60"
                                      max="750"
                                      step="2"
                                      value={sig.marginTop || 0}
                                      onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginTop: Number(e.target.value) })}
                                      className="w-16 px-1.5 py-0.5 text-right font-mono text-[11px] rounded bg-muted/40 border border-border text-primary font-bold focus:border-primary outline-none"
                                    />
                                    <span className="text-[10px] text-muted-foreground">px</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="-60"
                                  max="750"
                                  step="2"
                                  value={sig.marginTop || 0}
                                  onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginTop: Number(e.target.value) })}
                                  className="w-full accent-primary cursor-pointer"
                                />
                                <p className="text-[9.5px] text-muted-foreground leading-tight">
                                  Slide right to push signature all the way down to footer.
                                </p>
                              </div>

                              {/* Bottom Margin */}
                              <div className="space-y-1.5 p-2.5 rounded-xl bg-background border border-border/80 hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-center text-[11px] font-bold text-foreground">
                                  <span>Bottom Margin</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="-60"
                                      max="400"
                                      step="2"
                                      value={sig.marginBottom || 0}
                                      onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginBottom: Number(e.target.value) })}
                                      className="w-16 px-1.5 py-0.5 text-right font-mono text-[11px] rounded bg-muted/40 border border-border text-primary font-bold focus:border-primary outline-none"
                                    />
                                    <span className="text-[10px] text-muted-foreground">px</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="-60"
                                  max="400"
                                  step="2"
                                  value={sig.marginBottom || 0}
                                  onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginBottom: Number(e.target.value) })}
                                  className="w-full accent-primary cursor-pointer"
                                />
                                <p className="text-[9.5px] text-muted-foreground leading-tight">
                                  Spacing below signature before footer.
                                </p>
                              </div>

                              {/* Left Margin */}
                              <div className="space-y-1.5 p-2.5 rounded-xl bg-background border border-border/80 hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-center text-[11px] font-bold text-foreground">
                                  <span>Left Margin</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="-60"
                                      max="350"
                                      step="2"
                                      value={sig.marginLeft || 0}
                                      onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginLeft: Number(e.target.value) })}
                                      className="w-16 px-1.5 py-0.5 text-right font-mono text-[11px] rounded bg-muted/40 border border-border text-primary font-bold focus:border-primary outline-none"
                                    />
                                    <span className="text-[10px] text-muted-foreground">px</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="-60"
                                  max="350"
                                  step="2"
                                  value={sig.marginLeft || 0}
                                  onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginLeft: Number(e.target.value) })}
                                  className="w-full accent-primary cursor-pointer"
                                />
                                <p className="text-[9.5px] text-muted-foreground leading-tight">
                                  Horizontal offset from left edge.
                                </p>
                              </div>

                              {/* Right Margin */}
                              <div className="space-y-1.5 p-2.5 rounded-xl bg-background border border-border/80 hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-center text-[11px] font-bold text-foreground">
                                  <span>Right Margin</span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="-60"
                                      max="350"
                                      step="2"
                                      value={sig.marginRight || 0}
                                      onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginRight: Number(e.target.value) })}
                                      className="w-16 px-1.5 py-0.5 text-right font-mono text-[11px] rounded bg-muted/40 border border-border text-primary font-bold focus:border-primary outline-none"
                                    />
                                    <span className="text-[10px] text-muted-foreground">px</span>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="-60"
                                  max="350"
                                  step="2"
                                  value={sig.marginRight || 0}
                                  onChange={(e) => handleUpdateDoctorSig(sigIndex, { marginRight: Number(e.target.value) })}
                                  className="w-full accent-primary cursor-pointer"
                                />
                                <p className="text-[9.5px] text-muted-foreground leading-tight">
                                  Horizontal offset from right edge.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                })}

                {/* Button to add another doctor signature */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAddDoctorSig}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>+ Add Another Doctor / Pathologist Signature</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 8: END OF REPORT TEXT */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-4">
              <div className="border-b border-border/80 pb-3">
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Asterisk className="h-4 w-4 text-primary" />
                  <span>End of Report Footer Text</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize the closing line text and font size displayed at the end of report findings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Closing Text</label>
                  <input
                    type="text"
                    value={layoutSettings.endingLine?.text ?? "*** End Of Report ***"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLayoutSettings(prev => ({
                        ...prev,
                        endingLine: {
                          ...(prev.endingLine || { fontSize: 10 }),
                          text: val,
                        },
                      }));
                    }}
                    placeholder="*** End Of Report ***"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Font Size (px)</label>
                  <input
                    type="number"
                    min="7"
                    max="18"
                    value={layoutSettings.endingLine?.fontSize ?? 10}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLayoutSettings(prev => ({
                        ...prev,
                        endingLine: {
                          ...(prev.endingLine || { text: "*** End Of Report ***" }),
                          fontSize: val,
                        },
                      }));
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      {/* TAB 3: BILLS LAYOUT */}
      {activeTab === "bills-layout" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Left Side: Controls & Customization */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. Bill Heading & Header/Footer Graphics (Image 1) */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-5">
              <div className="border-b border-border/80 pb-3">
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Bill Branding & Header / Footer Graphics</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure the invoice title and upload official stationery headers/footers.
                </p>
              </div>

              {/* Bill Heading */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Bill Heading</label>
                <input
                  type="text"
                  value={billSettings.heading}
                  onChange={(e) => setBillSettings(prev => ({ ...prev, heading: e.target.value }))}
                  placeholder="Invoice-cum-receipt"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                />
              </div>

              {/* Header & Footer Upload Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Bill Header Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Bill Header</label>
                  {billSettings.headerImage ? (
                    <div className="relative rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-3">
                      <div className="h-10 w-16 rounded overflow-hidden bg-white border border-border/80 shrink-0">
                        <img src={billSettings.headerImage} alt="Header" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-xs font-semibold text-foreground truncate">Bill Header</span>
                      <button
                        type="button"
                        onClick={() => setBillSettings(prev => ({ ...prev, headerImage: null }))}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                        title="Remove Header"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-border hover:border-primary/60 bg-background hover:bg-muted/40 transition-all rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-foreground cursor-pointer shadow-2xs">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={handleBillHeaderUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Bill Footer Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Bill Footer</label>
                  {billSettings.footerImage ? (
                    <div className="relative rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-3">
                      <div className="h-10 w-16 rounded overflow-hidden bg-white border border-border/80 shrink-0">
                        <img src={billSettings.footerImage} alt="Footer" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-xs font-semibold text-foreground truncate">Bill Footer</span>
                      <button
                        type="button"
                        onClick={() => setBillSettings(prev => ({ ...prev, footerImage: null }))}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                        title="Remove Footer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-border hover:border-primary/60 bg-background hover:bg-muted/40 transition-all rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-foreground cursor-pointer shadow-2xs">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={handleBillFooterUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Bill Size & Header/Footer Height */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/80 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Bill Size</label>
                  <div className="flex items-center gap-4 pt-1">
                    {(["A4", "A5"] as const).map(s => (
                      <label key={s} className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="billSize"
                          checked={billSettings.size === s}
                          onChange={() => setBillSettings(prev => ({ ...prev, size: s }))}
                          className="text-primary accent-primary h-4 w-4 cursor-pointer"
                        />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Header Height</label>
                  <input
                    type="number"
                    value={billSettings.headerHeight}
                    onChange={(e) => setBillSettings(prev => ({ ...prev, headerHeight: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Footer Height</label>
                  <input
                    type="number"
                    value={billSettings.footerHeight}
                    onChange={(e) => setBillSettings(prev => ({ ...prev, footerHeight: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Checkboxes Grid (Image 1) */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-4">
              <div className="border-b border-border/80 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bill Field Visibility Options
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "showBarcode", label: "Show Barcode On Bill" },
                  { key: "showPhone", label: "Show patient Phone number on bill" },
                  { key: "showPackageTests", label: "Show package tests in bill" },
                  { key: "showB2BModal", label: "Show B2B bill modal" },
                  { key: "showQrCode", label: "QR code to download report" },
                  { key: "showBilledBy", label: "Show Billed By" },
                  { key: "showPaymentBreakdown", label: "Show Payment Breakdown" },
                  { key: "showSampleColumn", label: "Show sample column" },
                  { key: "showSampleCollectedBy", label: "Show sample collected by" },
                  { key: "showPincode", label: "Show Pincode On Bill" },
                  { key: "showDistrict", label: "Show District On Bill" },
                  { key: "showTown", label: "Show Town On Bill" },
                  { key: "showCollectionCenter", label: "Show Collection Center On Bill" },
                  { key: "showSecondReferral", label: "Show Second Referral" },
                  { key: "showHfrId", label: "Show HFR ID on Bill" },
                  { key: "showTestCode", label: "Show Test Code on Bill" },
                ].map(({ key, label }) => {
                  const val = (billSettings as any)[key] ?? false;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-border/80 bg-background hover:bg-muted/40 transition-colors cursor-pointer select-none text-xs font-semibold text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setBillSettings(prev => ({
                            ...prev,
                            [key]: checked,
                          }));
                        }}
                        className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Bill Margins (Image 1) */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-4">
              <div className="border-b border-border/80 pb-3">
                <h3 className="font-display font-bold text-sm text-foreground">Bill Margins</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Left Margin */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Bill Left Margin</span>
                    <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                      {billSettings.margins.left} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={billSettings.margins.left}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBillSettings(prev => ({ ...prev, margins: { ...prev.margins, left: val } }));
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Right Margin */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Bill Right Margin</span>
                    <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                      {billSettings.margins.right} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={billSettings.margins.right}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBillSettings(prev => ({ ...prev, margins: { ...prev.margins, right: val } }));
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                {/* Patient Details Bottom Spacing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Patient Details Spacing</span>
                    <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                      {billSettings.margins.patientDetailsBottomSpacing} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={billSettings.margins.patientDetailsBottomSpacing}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBillSettings(prev => ({ ...prev, margins: { ...prev.margins, patientDetailsBottomSpacing: val } }));
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* 4. Bill Field Ordering (Image 2) */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground">Bill Field Ordering</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Click fields to select and sequence what appears in the patient/bill header box.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllBillOrdering}
                  className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {ALL_BILL_ORDERING_FIELDS.map((fieldName) => {
                  const seqIndex = (billSettings.fieldOrdering || []).indexOf(fieldName);
                  const isSelected = seqIndex >= 0;

                  return (
                    <button
                      key={fieldName}
                      type="button"
                      onClick={() => handleToggleBillOrderingField(fieldName)}
                      className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all border inline-flex items-center gap-2 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/20 pr-7"
                          : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <span>{fieldName}</span>
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                          {seqIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. GST Details & UPI QR for Bill (Image 2) */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-5">
              {/* GST Number */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">GST Details</span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billSettings.gst.show}
                      onChange={(e) => setBillSettings(prev => ({ ...prev, gst: { ...prev.gst, show: e.target.checked } }))}
                      className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                    />
                    <span>Show GST Details in Bill</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">GST Number</label>
                  <input
                    type="text"
                    value={billSettings.gst.number}
                    onChange={(e) => setBillSettings(prev => ({ ...prev, gst: { ...prev.gst, number: e.target.value } }))}
                    placeholder="09EHMPM7306G1Z0"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold font-mono uppercase focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* UPI QR for Bill */}
              <div className="space-y-4 pt-3 border-t border-border/80">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-primary" />
                    <span>UPI QR for Bill</span>
                  </span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billSettings.upi.show}
                      onChange={(e) => setBillSettings(prev => ({ ...prev, upi: { ...prev.upi, show: e.target.checked } }))}
                      className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                    />
                    <span>Show UPI QR on Bill</span>
                  </label>
                </div>

                {/* Custom UPI QR Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">
                    Upload Custom UPI Payment QR Code (PhonePe / GPay / Paytm / BharatPe / Bank QR)
                  </label>
                  {billSettings.upi.qrImageUrl ? (
                    <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-white border border-border shrink-0 flex items-center justify-center p-1 shadow-2xs">
                          <img src={billSettings.upi.qrImageUrl} alt="Custom UPI QR" className="h-full w-full object-contain" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Custom UPI QR Active</p>
                          <p className="text-[10.5px] text-muted-foreground">Will be printed on invoices with outstanding dues</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                          <Upload className="h-3 w-3 text-primary" />
                          <span>Change</span>
                          <input type="file" accept="image/*" onChange={handleUpiQrUpload} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => setBillSettings(prev => ({ ...prev, upi: { ...prev.upi, qrImageUrl: null } }))}
                          className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border hover:border-primary/60 bg-background hover:bg-primary/5 transition-all rounded-xl p-4 flex items-center gap-3 cursor-pointer shadow-2xs">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Click to Upload Custom UPI QR Code</p>
                        <p className="text-[10px] text-muted-foreground">Upload PhonePe, Google Pay, Paytm, BharatPe, or Bank QR image (PNG/JPG)</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handleUpiQrUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">UPI ID (Optional if QR Image uploaded)</label>
                    <input
                      type="text"
                      value={billSettings.upi.upiId}
                      onChange={(e) => setBillSettings(prev => ({ ...prev, upi: { ...prev.upi, upiId: e.target.value } }))}
                      placeholder="e.g. lab@upi"
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">QR Width (px)</label>
                    <input
                      type="number"
                      value={billSettings.upi.qrWidth}
                      onChange={(e) => setBillSettings(prev => ({ ...prev, upi: { ...prev.upi, qrWidth: Number(e.target.value) } }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">QR Height (px)</label>
                    <input
                      type="number"
                      value={billSettings.upi.qrHeight}
                      onChange={(e) => setBillSettings(prev => ({ ...prev, upi: { ...prev.upi, qrHeight: Number(e.target.value) } }))}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Terms and conditions & Signatures (Image 3) */}
            <div className="p-6 bg-card border border-border/90 rounded-2xl shadow-xs space-y-5">
              <div className="border-b border-border/80 pb-3">
                <h3 className="font-display font-bold text-sm text-foreground">Terms and conditions & Signatures</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Set terms & conditions text and customize authorized signatories printed at the footer.
                </p>
              </div>

              {/* Terms and conditions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Terms and conditions</label>
                <textarea
                  rows={4}
                  value={billSettings.termsAndConditions}
                  onChange={(e) => setBillSettings(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                  placeholder="Enter invoice terms and conditions..."
                  className="w-full p-3.5 rounded-xl bg-background border border-border text-xs font-medium focus:border-primary outline-none"
                />
              </div>

              {/* Signatures List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Authorized Signatures</label>
                  <button
                    type="button"
                    onClick={() => setIsSigModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>+ Add Signature</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(billSettings.signatures || []).map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                      <div>
                        <p className="text-xs font-bold text-foreground">{sig.name}</p>
                        <p className="text-[10px] text-muted-foreground">{sig.designation}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSignature(sig.id)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Side: Live Interactive Invoice Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/80 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground">Interactive Bill Canvas</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary">
                  {billSettings.size} ({Math.round(previewScale * 100)}%)
                </span>
              </div>

              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewScale(prev => Math.max(0.35, prev - 0.05))}
                  className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.55)}
                  className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(prev => Math.min(0.85, prev + 0.05))}
                  className="p-1 hover:bg-card rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-muted/40 border border-border/80 rounded-2xl p-2 sm:p-6 flex justify-center overflow-auto sheet-pan-canvas min-h-[640px]">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top center",
                  width: billSettings.size === "A5" ? "559px" : "794px",
                  height: billSettings.size === "A5" ? "794px" : "1123px",
                  marginBottom: `-${(billSettings.size === "A5" ? 794 : 1123) * (1 - previewScale)}px`,
                  marginRight: `-${(billSettings.size === "A5" ? 559 : 794) * (1 - previewScale) / 2}px`,
                  marginLeft: `-${(billSettings.size === "A5" ? 559 : 794) * (1 - previewScale) / 2}px`,
                }}
                className="shadow-2xl ring-1 ring-border bg-white rounded-sm shrink-0 transition-transform duration-200"
              >
                <InvoiceSheet invoice={previewInvoiceData} settings={billSettings} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: COLLECTION CENTERS & B2B FRANCHISES */}
      {activeTab === "collection-centers" && (
        <CollectionCentersTab />
      )}

      {/* TAB: PAYMENT GATEWAY & BANK SETTLEMENT */}
      {activeTab === "payment-gateway" && (
        <PaymentGatewayTab />
      )}

      {/* Add Signature Dialog Modal */}
      <Dialog open={isSigModalOpen} onOpenChange={setIsSigModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground">Add Authorized Signatory</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSignature} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Signatory Name *</label>
              <input
                type="text"
                required
                value={newSigName}
                onChange={(e) => setNewSigName(e.target.value)}
                placeholder="e.g. Authorized Signatory / Dr. A. Sharma"
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Designation / Role</label>
              <input
                type="text"
                value={newSigDesig}
                onChange={(e) => setNewSigDesig(e.target.value)}
                placeholder="e.g. Cashier / Accounts Manager"
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-xl shadow-xs cursor-pointer hover:brightness-105 transition-all"
              >
                Save Signatory
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold">Loading Settings...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
