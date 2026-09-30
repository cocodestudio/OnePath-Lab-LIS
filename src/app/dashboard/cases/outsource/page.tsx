"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Building2, Calendar, ChevronLeft, ChevronRight, Loader2, Clock,
  RefreshCw, X, Eye, Receipt, Stethoscope, CheckCircle2, AlertCircle,
  FileText, ArrowRight, PlusCircle, Paperclip, Upload, Trash2, ExternalLink,
  Search, Plus, Check, User, Phone, DollarSign, Printer, ChevronDown,
  Boxes, FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { InvoiceSheet, type InvoiceData } from "@/components/invoice-sheet";
import { type BillLayoutSettings, defaultBillLayoutSettings, normalizeBillSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";
import { getStoredPackages, type LabPackage, resolvePackageTestIds } from "@/lib/packages";

interface OutsourceCase {
  id: string;
  reg_no: string;
  date: string;
  created_at: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    custom_id: string;
    designation?: string;
  };
  doctor: string;
  partner_lab?: string;
  notes?: string;
  investigations: string;
  tests: Array<{
    id?: string;
    name: string;
    code?: string;
    price?: number;
    category?: string;
  }>;
  bill?: {
    id?: string;
    custom_id?: string;
    total: number;
    paid_amount: number;
    discount?: number;
    due: number;
    status: string;
    payment_mode?: string;
  } | null;
  status: string;
  is_due: boolean;
  due_amount: number;
  has_attached_report?: boolean;
  attached_report_url?: string | null;
  attached_report_filename?: string | null;
  attached_report_filesize?: number | null;
  attached_report_at?: string | null;
  is_report_sent?: boolean;
}

const PARTNER_LABS = [
  "Dr. Lal PathLabs",
  "SRL Diagnostics",
  "Metropolis Healthcare",
  "Thyrocare Technologies",
  "Redcliffe Labs",
  "Pathkind Labs",
  "Max Healthcare Labs",
  "Apollo Diagnostics",
  "Other Partner Lab",
];

function getStorageFileUrl(path?: string | null): string {
  if (!path) return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const urlObj = new URL(baseUrl);
    baseUrl = urlObj.origin;
  } catch {
    baseUrl = baseUrl.replace(/\/api(\/lis)?\/?$/, "");
  }
  
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export default function OutsourceCasesPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<OutsourceCase[]>([]);
  const [doctorStats, setDoctorStats] = useState<Record<string, number>>({});
  const [selectedDoctor, setSelectedDoctor] = useState("ALL");
  const [dateFilterMode, setDateFilterMode] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS" | "CUSTOM">("30DAYS");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPage, setPerPage] = useState(15);

  // Lab Info & Bill Settings for official medical invoice printing
  const [labInfo, setLabInfo] = useState<any>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(() => defaultBillLayoutSettings);

  // Official Medical Invoice Sheet Modal State
  const [selectedBillCase, setSelectedBillCase] = useState<OutsourceCase | null>(null);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  // PDF Upload state
  const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadCaseId, setTargetUploadCaseId] = useState<string | null>(null);

  // ═════════════════════════════════════════════════════════════════════
  // NEW OUTSOURCE PATIENT ENTRY MODAL (Landscape Dual-Column)
  // ═════════════════════════════════════════════════════════════════════
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [availableCatalogTests, setAvailableCatalogTests] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<LabPackage[]>([]);
  const [catalogMode, setCatalogMode] = useState<"TESTS" | "PACKAGES">("TESTS");
  const [selectedPackage, setSelectedPackage] = useState<LabPackage | null>(null);
  const [doctorsList, setDoctorsList] = useState<string[]>(["Self"]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  // Form Fields
  const [patDesignation, setPatDesignation] = useState("Mr.");
  const [patName, setPatName] = useState("");
  const [patAge, setPatAge] = useState("");
  const [patAgeType, setPatAgeType] = useState<"Y" | "M" | "D">("Y");
  const [patGender, setPatGender] = useState("Male");
  const [patPhone, setPatPhone] = useState("");
  const [patDoctor, setPatDoctor] = useState("Self");
  const [patDoctorCustom, setPatDoctorCustom] = useState("");
  const [partnerLab, setPartnerLab] = useState(PARTNER_LABS[0]);
  const [partnerLabCustom, setPartnerLabCustom] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Tests Selected for Outsource
  const [selectedTests, setSelectedTests] = useState<
    Array<{ id?: string; name: string; code?: string; price: number; category?: string }>
  >([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");

  // Custom Test Add State
  const [customTestName, setCustomTestName] = useState("");
  const [customTestPrice, setCustomTestPrice] = useState("");
  const [isAddingCustomTest, setIsAddingCustomTest] = useState(false);

  // Financials
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "NET_BANKING">("CASH");

  // Load available tests, doctors, lab settings for official bill & invoice
  useEffect(() => {
    // 1. Instant test list from cache for 0ms registration latency (matches Add Patient)
    try {
      const cached = localStorage.getItem("lis_cached_tests");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableCatalogTests(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh tests, packages, doctors, and lab settings
    (async () => {
      // Tests
      try {
        const testsRes = await fetchFromLaravel("/tests", { skipCache: true });
        const list = Array.isArray(testsRes) ? testsRes : (testsRes?.data || []);
        if (Array.isArray(list) && list.length > 0) {
          setAvailableCatalogTests(list);
          try { localStorage.setItem("lis_cached_tests", JSON.stringify(list)); } catch {}
        }
      } catch (err) {
        console.error("Error fetching catalog tests:", err);
      }

      // Packages
      try {
        setAvailablePackages(getStoredPackages());
      } catch {}

      // Doctors
      try {
        const docRes = await fetchFromLaravel("/doctors?filter=all", { skipCache: true });
        if (docRes && docRes.doctors && Array.isArray(docRes.doctors)) {
          const apiDocs = docRes.doctors.map((d: any) => d.name).filter(Boolean);
          setDoctorsList(Array.from(new Set(["Self", ...apiDocs])));
        }
      } catch (err) {
        console.error("Error fetching doctors:", err);
      }

      // Lab Info & Bill Settings
      try {
        const lab = await fetchFromLaravel("/lab?include_letterhead=1", { skipCache: true });
        if (lab) {
          setLabInfo(lab);
          const rawBill = lab?.bill_settings || lab?.billSettings;
          if (rawBill) {
            setBillSettings(normalizeBillSettings(rawBill));
          }
        }
      } catch (err) {
        console.error("Error fetching lab details:", err);
      }
    })();
  }, []);

  // Fetch Outsource Cases
  const fetchCases = async (skipCache = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", String(perPage));
      if (selectedDoctor !== "ALL") params.set("doctor", selectedDoctor);

      if (dateFilterMode !== "ALL") {
        if (fromDate) params.set("from_date", fromDate);
        if (toDate) params.set("to_date", toDate);
      }

      const res = await fetchFromLaravel(`/outsource-cases?${params.toString()}`, { skipCache });
      if (res) {
        setCases(Array.isArray(res.data) ? res.data : []);
        setTotalRecords(res.total || 0);
        if (res.doctor_stats) setDoctorStats(res.doctor_stats);
      }
    } catch (err: any) {
      console.error("Error fetching outsource cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [currentPage, perPage, selectedDoctor, fromDate, toDate, dateFilterMode]);

  // Handle Preset Date Filter
  const handleDatePreset = (mode: "ALL" | "TODAY" | "7DAYS" | "30DAYS") => {
    setDateFilterMode(mode);
    const today = new Date().toISOString().split("T")[0];
    if (mode === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (mode === "7DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else if (mode === "30DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else {
      setFromDate("");
      setToDate("");
    }
    setIsDatePickerOpen(false);
    setCurrentPage(1);
  };

  // Formatted display date range
  const dateRangeLabel = useMemo(() => {
    if (dateFilterMode === "ALL" || (!fromDate && !toDate)) return "All Dates";
    if (fromDate && toDate) {
      const f = fromDate.split("-").reverse().join("/");
      const t = toDate.split("-").reverse().join("/");
      return `${f} - ${t}`;
    }
    return fromDate ? `From ${fromDate}` : `To ${toDate}`;
  }, [dateFilterMode, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));

  // ═════════════════════════════════════════════════════════════════════
  // ATTACH REPORT PDF FLOW
  // ═════════════════════════════════════════════════════════════════════
  const triggerReportUpload = (caseId: string) => {
    setTargetUploadCaseId(caseId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadCaseId) return;

    // Validate PDF format strictly
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "Invalid Document",
        description: "Please select a PDF report only (.pdf format).",
        type: "error",
      });
      return;
    }

    setUploadingCaseId(targetUploadCaseId);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetchFromLaravel(
        `/outsource-cases/${targetUploadCaseId}/attach-report`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res && res.success) {
        const uploadedUrl = res.report_url || res.meta?.outsource_report_url || null;
        const uploadedFilename = res.filename || res.meta?.outsource_report_filename || file.name;

        // Immediately update cases state so UI reflects the uploaded report in 0ms without waiting or refreshing!
        setCases((prevCases) =>
          prevCases.map((c) =>
            c.id === targetUploadCaseId
              ? {
                  ...c,
                  has_attached_report: true,
                  attached_report_url: uploadedUrl,
                  attached_report_filename: uploadedFilename,
                  attached_report_filesize: file.size,
                  attached_report_at: new Date().toISOString(),
                }
              : c
          )
        );

        toast({
          title: "Report Attached",
          description: `PDF report attached successfully for this patient.`,
          type: "success",
        });

        fetchCases(true);
      } else {
        throw new Error(res?.message || "Failed to attach report.");
      }
    } catch (err: any) {
      console.error("Error attaching report:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Could not upload the PDF report. Please try again.",
        type: "error",
      });
    } finally {
      setUploadingCaseId(null);
      setTargetUploadCaseId(null);
    }
  };

  const handleDetachReport = async (caseId: string) => {
    if (!confirm("Are you sure you want to remove this attached report?")) return;
    try {
      const res = await fetchFromLaravel(`/outsource-cases/${caseId}/detach-report`, {
        method: "DELETE",
      });
      if (res && res.success) {
        // Immediately update cases state so UI reflects detachment in 0ms without refreshing!
        setCases((prevCases) =>
          prevCases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  has_attached_report: false,
                  attached_report_url: null,
                  attached_report_filename: null,
                  attached_report_filesize: null,
                  attached_report_at: null,
                }
              : c
          )
        );

        toast({
          title: "Report Removed",
          description: "Attached PDF has been detached.",
          type: "success",
        });
        fetchCases(true);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove attached report.",
        type: "error",
      });
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // EXACT TEST CATALOG MATCHING ADD PATIENT (register/page.tsx)
  // ═════════════════════════════════════════════════════════════════════
  const normalizeCat = (cat?: string) => {
    if (!cat) return "General Pathology";
    const trimmed = cat.trim();
    if (/^haematology$/i.test(trimmed) || /^hematology$/i.test(trimmed)) return "Hematology";
    return trimmed;
  };

  const categories = useMemo(() => {
    return Array.from(
      new Set(availableCatalogTests.map((t) => normalizeCat(t.category)).filter(Boolean))
    );
  }, [availableCatalogTests]);

  const groupedTests = useMemo(() => {
    const map: Record<string, any[]> = {};
    availableCatalogTests.forEach((test) => {
      const cat = normalizeCat(test.category);
      (map[cat] ||= []).push(test);
    });
    return map;
  }, [availableCatalogTests]);

  const filteredGroups = useMemo(() => {
    const term = testSearchQuery.toLowerCase().trim();
    const filtered: Record<string, any[]> = {};
    Object.entries(groupedTests).forEach(([category, tests]) => {
      if (activeCategory !== "ALL" && normalizeCat(category) !== normalizeCat(activeCategory)) return;
      const matches = tests.filter((t) => {
        if (!term) return true;
        const name = (t.name || "").toLowerCase();
        const code = ((t as any).testCode || (t as any).code || (t as any).test_code || (t as any).id || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return name.includes(term) || code.includes(term) || cat.includes(term);
      });
      if (matches.length > 0) filtered[category] = matches;
    });
    return filtered;
  }, [groupedTests, activeCategory, testSearchQuery]);

  const filteredPackagesForCatalog = useMemo(() => {
    const term = testSearchQuery.toLowerCase().trim();
    if (!term) return availablePackages;
    return availablePackages.filter(
      (p) => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
    );
  }, [availablePackages, testSearchQuery]);

  const handleTogglePackage = (pkg: LabPackage) => {
    if (selectedPackage?.id === pkg.id) {
      const resolved = resolvePackageTestIds(pkg, availableCatalogTests);
      setSelectedTests((prev) => prev.filter((t) => !resolved.includes(t.id || "")));
      setSelectedPackage(null);
    } else {
      let baseTests = selectedTests;
      if (selectedPackage) {
        const prevResolved = resolvePackageTestIds(selectedPackage, availableCatalogTests);
        baseTests = baseTests.filter((t) => !prevResolved.includes(t.id || ""));
      }
      setSelectedPackage(pkg);
      const newResolvedIds = resolvePackageTestIds(pkg, availableCatalogTests);
      const newAdditions = availableCatalogTests
        .filter((t) => newResolvedIds.includes(t.id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          code: t.testCode || t.test_code || t.code || "",
          price: Number(t.price) || 0,
          category: normalizeCat(t.category),
        }));

      const existingIds = new Set(baseTests.map((t) => t.id).filter(Boolean));
      const combined = [...baseTests];
      newAdditions.forEach((t) => {
        if (!existingIds.has(t.id)) combined.push(t);
      });
      setSelectedTests(combined);
    }
  };

  const handleToggleTest = (test: any) => {
    const exists = selectedTests.some(
      (st) => (st.id && st.id === test.id) || st.name.toLowerCase() === test.name.toLowerCase()
    );

    if (exists) {
      setSelectedTests((prev) =>
        prev.filter((st) => (st.id ? st.id !== test.id : st.name.toLowerCase() !== test.name.toLowerCase()))
      );
    } else {
      setSelectedTests((prev) => [
        ...prev,
        {
          id: test.id,
          name: test.name,
          code: test.testCode || test.test_code || test.code || "",
          price: Number(test.price) || 0,
          category: normalizeCat(test.category),
        },
      ]);
    }
  };

  const handleAddCustomTest = () => {
    const trimmed = customTestName.trim();
    if (!trimmed) {
      toast({ title: "Name Required", description: "Please enter the investigation name.", type: "error" });
      return;
    }
    const price = Math.max(0, parseFloat(customTestPrice) || 0);
    setSelectedTests((prev) => [
      ...prev,
      {
        name: trimmed,
        code: "CUST",
        price,
        category: "Outsource Custom",
      },
    ]);
    setCustomTestName("");
    setCustomTestPrice("");
    setIsAddingCustomTest(false);
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return selectedTests.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  }, [selectedTests]);

  const parsedDiscount = Math.max(0, parseFloat(discountAmount) || 0);
  const netTotal = Math.max(0, subtotal - parsedDiscount);
  const parsedPaid = Math.max(0, parseFloat(paidAmount) || 0);
  const dueAmount = Math.max(0, netTotal - parsedPaid);

  // Submit New Outsource Patient Registration
  const handleCreateOutsourceCase = async () => {
    if (!patName.trim()) {
      toast({ title: "Validation Error", description: "Patient name is required.", type: "error" });
      return;
    }
    if (!patAge || isNaN(Number(patAge))) {
      toast({ title: "Validation Error", description: "Valid patient age is required.", type: "error" });
      return;
    }
    if (selectedTests.length === 0) {
      toast({ title: "Investigations Required", description: "Please select at least one test to outsource.", type: "error" });
      return;
    }

    setCreateSubmitting(true);
    try {
      const finalDoc =
        patDoctor === "Other" && patDoctorCustom.trim()
          ? patDoctorCustom.trim()
          : patDoctor;
      const finalPartnerLab =
        partnerLab === "Other Partner Lab" && partnerLabCustom.trim()
          ? partnerLabCustom.trim()
          : partnerLab;

      const payload = {
        name: patName.trim(),
        designation: patDesignation,
        age: parseFloat(patAge),
        age_type: patAgeType,
        gender: patGender,
        phone: patPhone.trim(),
        ref_doctor: finalDoc,
        partner_lab: finalPartnerLab,
        notes: clinicalNotes.trim(),
        tests: selectedTests,
        total: subtotal,
        discount: parsedDiscount,
        paid_amount: parsedPaid,
        payment_mode: paymentMode,
      };

      const res = await fetchFromLaravel("/outsource-cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && (res.success || res.case)) {
        toast({
          title: "Outsource Case Created",
          description: `Case ${res.case?.reg_no || "saved"} registered successfully!`,
          type: "success",
        });

        // Reset Form
        setPatName("");
        setPatAge("");
        setPatPhone("");
        setSelectedTests([]);
        setSelectedPackage(null);
        setDiscountAmount("0");
        setPaidAmount("0");
        setClinicalNotes("");
        setIsCreateModalOpen(false);

        fetchCases();
      } else {
        throw new Error(res?.message || "Failed to create outsource case.");
      }
    } catch (err: any) {
      console.error("Error creating outsource case:", err);
      toast({
        title: "Creation Failed",
        description: err.message || "Failed to create outsource case. Please check your inputs.",
        type: "error",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // OFFICIAL INVOICE BUILDER (Matches main reports & billing engine)
  // ═════════════════════════════════════════════════════════════════════
  const buildInvoiceData = (c: OutsourceCase): InvoiceData => {
    const testsList = (c.tests && c.tests.length > 0)
      ? c.tests.map((t, idx) => ({
          id: t.id || `out-t-${idx}`,
          name: t.name,
          price: Number(t.price || 0),
          code: t.code || "OUT",
          category: t.category || "Outsource",
        }))
      : (c.investigations || "Outsource Investigation").split(",").map((s, idx) => ({
          id: `out-t-${idx}`,
          name: s.trim(),
          price: Number(c.bill?.total || 0) / Math.max(1, (c.investigations || "1").split(",").length),
          code: "OUT",
          category: "Outsource",
        }));

    return {
      id: c.id,
      customId: c.bill?.custom_id || `INV-${c.reg_no}`,
      createdAt: c.created_at || c.date || new Date().toISOString(),
      total: Number(c.bill?.total || 0),
      discount: Number(c.bill?.discount || 0),
      paidAmount: c.bill?.status === "PAID"
        ? Number(c.bill?.total || 0)
        : Number(c.bill?.paid_amount ?? 0),
      status: c.bill?.status || (c.is_due ? "UNPAID" : "PAID"),
      paymentMode: c.bill?.payment_mode || "CASH / UPI",
      billedBy: "Accounts / Outsource Desk",
      packageName: c.partner_lab ? `Outsourced to: ${c.partner_lab}` : null,
      patient: {
        customId: c.reg_no,
        name: c.patient?.name || "",
        phone: c.patient?.phone || "",
        age: c.patient?.age || 0,
        gender: c.patient?.gender || "",
        refDoctor: c.doctor || "Self",
      },
      lab: {
        name: labInfo?.name || labInfo?.centre_name || "OnePath Pathology Laboratory",
        email: labInfo?.email || "support@onepathlab.com",
        address: labInfo?.address || "Main Laboratory Diagnostic Center",
        phone: labInfo?.phone || "",
        logoUrl: billSettings.logoImage || labInfo?.logo_url || labInfo?.logoUrl || "/onepath-logo.png",
        pincode: labInfo?.pincode,
        city: labInfo?.city,
        district: labInfo?.district || labInfo?.city,
        state: labInfo?.state,
        gstin: billSettings.gst?.number || labInfo?.gstin,
        bill_settings: billSettings,
      },
      tests: testsList,
    };
  };

  const handlePrintInvoice = () => {
    if (invoicePrintRef.current && selectedBillCase) {
      printInvoiceElement(
        invoicePrintRef.current,
        `Invoice_${selectedBillCase.bill?.custom_id || selectedBillCase.reg_no}`
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Hidden file input for report attachment (PDF Only) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        className="hidden"
      />

      {/* ═══════════════════════════════════════════════════════════════
          PAGE HEADER (Full Edge-to-edge width & Responsive Layout)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              External Diagnostic Dispatch
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mt-1">
            Outsource Cases
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage outsourced patient investigations, dispatch to partner labs, and view generated bills.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs gap-2 cursor-pointer shadow-md hover:-translate-y-px transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Outsource Patient</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILTER CONTROLS BAR (Date Range Box + Doctor Referral Filter)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* 1. Date Range Picker Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer shadow-2xs"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <span>{dateRangeLabel}</span>
              </button>

              {/* Date Filter Dropdown Popover */}
              {isDatePickerOpen && (
                <div className="absolute left-0 top-12 z-30 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 animate-scale-in">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Select Date Window</span>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDatePreset("TODAY")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "TODAY" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("7DAYS")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "7DAYS" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("30DAYS")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "30DAYS" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("ALL")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      All Time
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Custom Date Range</span>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setDateFilterMode("CUSTOM");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setDateFilterMode("CUSTOM");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDatePickerOpen(false);
                      setCurrentPage(1);
                      fetchCases();
                    }}
                    className="w-full h-8 text-xs rounded-xl gradient-primary text-primary-foreground font-bold cursor-pointer"
                  >
                    Apply Range
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDatePreset("TODAY")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "TODAY"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("7DAYS")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "7DAYS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("30DAYS")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "30DAYS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("ALL")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* 2. Referral Doctor Filter */}
          <div className="w-full lg:w-auto min-w-[240px]">
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:border-primary outline-none cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Referral Doctors ({totalRecords} samples)</option>
              {Object.entries(doctorStats).map(([doc, count]) => (
                <option key={doc} value={doc}>
                  {doc} ({count} {count === 1 ? "sample" : "samples"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TABLE DISPLAY (Edge-to-edge, responsive patient list)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/70 rounded-2xl shadow-card overflow-hidden w-full">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Reg no.
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Date
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Investigations & Lab
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Attached Report
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    <td className="px-6 py-4"><div className="h-4 w-16 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="h-4 w-32 rounded shimmer-gradient" />
                      <div className="h-3 w-16 rounded shimmer-gradient" />
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-48 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-7 w-28 rounded-xl shimmer-gradient mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 w-20 rounded-full shimmer-gradient mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-20 rounded-xl shimmer-gradient ml-auto" /></td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto opacity-30 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">No Outsource Cases Found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Click &quot;New Outsource Patient&quot; above to register an outsource case with external lab dispatch, billing, and attached PDF reports.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-4 h-9 px-4 rounded-xl gradient-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Register First Outsource Patient</span>
                    </Button>
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const patName = c.patient?.name || "Patient";
                  const patAge = c.patient?.age ? `${c.patient.age} YRS` : "";
                  const patGender = c.patient?.gender ? c.patient.gender.slice(0, 1).toUpperCase() : "";
                  const patSubtitle = [patAge, patGender].filter(Boolean).join("/");

                  const investigationsList = c.investigations
                    ? c.investigations.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];

                  const isUploadingThis = uploadingCaseId === c.id;
                  const reportFileUrl = getStorageFileUrl(c.attached_report_url);
                  const reportFileName = c.attached_report_filename || `Report_${c.reg_no}.pdf`;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                    >
                      {/* 1. Reg no. */}
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                        {c.reg_no}
                      </td>

                      {/* 2. Date */}
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {c.date}
                      </td>

                      {/* 3. Patient */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sm text-foreground">{patName}</p>
                        <p className="text-xs text-muted-foreground">
                          {patSubtitle || "N/A"}{c.patient?.phone ? ` · ${c.patient.phone}` : ""}
                        </p>
                      </td>

                      {/* 4. Outsourced Investigations & Partner Lab */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-md">
                          <div className="flex flex-wrap gap-1.5">
                            {investigationsList.slice(0, 3).map((testName, i) => (
                              <span
                                key={i}
                                className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              >
                                {testName}
                              </span>
                            ))}
                            {investigationsList.length > 3 && (
                              <span className="text-[11px] text-muted-foreground font-semibold px-1 py-0.5">
                                +{investigationsList.length - 3} more
                              </span>
                            )}
                          </div>
                          {c.partner_lab && (
                            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-purple-500 shrink-0" />
                              <span>{c.partner_lab}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. Attached Report (PDF Only - Direct Open in New Tab & Download, No dialogbox!) */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {isUploadingThis ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading PDF…</span>
                          </div>
                        ) : c.has_attached_report && c.attached_report_url ? (
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                            {/* Direct Open in New Tab (View Report) */}
                            <a
                              href={reportFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-2xs cursor-pointer select-none"
                              title="Click to view attached PDF report in a new tab"
                            >
                              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>View Report</span>
                              <ExternalLink className="h-3 w-3 opacity-70 shrink-0" />
                            </a>

                            {/* Replace attached PDF */}
                            <button
                              type="button"
                              onClick={() => triggerReportUpload(c.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Replace attached PDF"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>

                            {/* Detach PDF */}
                            <button
                              type="button"
                              onClick={() => handleDetachReport(c.id)}
                              className="p-1.5 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Remove attached PDF"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => triggerReportUpload(c.id)}
                            className="h-8 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground border-border/80 gap-1.5 cursor-pointer shadow-2xs hover:bg-muted/50"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-primary" />
                            <span>Attach Report</span>
                          </Button>
                        )}
                      </td>

                      {/* 6. Status (No due / Due: Rs.X) */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {c.is_due ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            {c.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            No due
                          </span>
                        )}
                      </td>

                      {/* 7. Action: View bill (Exact Official Invoice Sheet Engine) */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBillCase(c)}
                          className="h-8 px-3 rounded-xl text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 cursor-pointer transition-colors"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>View bill</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PAGINATION BAR
        ═══════════════════════════════════════════════════════════════ */}
        {totalRecords > 0 && (
          <div className="border-t border-border/80 px-6 py-3.5 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Showing{" "}
              <strong className="text-foreground">
                {Math.min(totalRecords, (currentPage - 1) * perPage + 1)}–
                {Math.min(totalRecords, currentPage * perPage)}
              </strong>{" "}
              of <strong className="text-foreground">{totalRecords}</strong> cases
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-mono font-semibold text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          NEW OUTSOURCE PATIENT ENTRY MODAL (Horizontal Landscape Layout)
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-7xl w-[98vw] max-h-[94vh] h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-3xl bg-card border border-border/80 shadow-2xl animate-scale-in">
          <DialogTitle className="sr-only">Register Outsource Patient Case</DialogTitle>

          {/* Modal Header: single clean close button native to DialogContent */}
          <div className="flex items-center justify-between px-6 py-4 pr-16 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  New Outsource Patient Entry
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Record patient intake details and select investigations for external partner laboratory dispatch.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body: Two-Column Horizontal Landscape */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* ── LEFT PANEL: Patient Demographics & Financial Settlement (5 cols) ── */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-border/80 flex flex-col justify-between overflow-y-auto p-5 space-y-4 custom-scrollbar bg-card/60">
              <div className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    1. Patient Demographics & Referral
                  </h3>
                </div>

                {/* Patient Name with Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Patient Name <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={patDesignation}
                      onChange={(e) => setPatDesignation(e.target.value)}
                      className="w-24 h-9 px-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary"
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Shri">Shri</option>
                      <option value="Smt.">Smt.</option>
                      <option value="Master">Master</option>
                      <option value="Baby">Baby</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={patName}
                      onChange={(e) => setPatName(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Age & Gender (Neat 2-Column Row) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Age <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        required
                        min="0"
                        max="150"
                        placeholder="Age"
                        value={patAge}
                        onChange={(e) => setPatAge(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary font-mono"
                      />
                      <select
                        value={patAgeType}
                        onChange={(e) => setPatAgeType(e.target.value as any)}
                        className="w-16 h-9 px-1 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary"
                      >
                        <option value="Y">Yrs</option>
                        <option value="M">Mos</option>
                        <option value="D">Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Gender</label>
                    <select
                      value={patGender}
                      onChange={(e) => setPatGender(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Phone & Referring Doctor (Side-by-Side Row) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Mobile Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Optional 10-digit number"
                      value={patPhone}
                      onChange={(e) => setPatPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Referring Doctor</label>
                    <select
                      value={patDoctor}
                      onChange={(e) => setPatDoctor(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary"
                    >
                      {doctorsList.map((doc) => (
                        <option key={doc} value={doc}>
                          {doc}
                        </option>
                      ))}
                      <option value="Other">+ Other Doctor</option>
                    </select>
                  </div>
                </div>

                {patDoctor === "Other" && (
                  <div className="space-y-1 animate-scale-in">
                    <label className="text-[11px] font-semibold text-muted-foreground">Enter Doctor Name</label>
                    <input
                      type="text"
                      placeholder="Doctor Name & Qualification"
                      value={patDoctorCustom}
                      onChange={(e) => setPatDoctorCustom(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                )}

                {/* Outsource Partner Lab & Notes (Side-by-Side Row) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Partner Lab
                    </label>
                    <select
                      value={partnerLab}
                      onChange={(e) => setPartnerLab(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary"
                    >
                      {PARTNER_LABS.map((lab) => (
                        <option key={lab} value={lab}>
                          {lab}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Sample / Dispatch Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Courier dispatch"
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {partnerLab === "Other Partner Lab" && (
                  <div className="space-y-1 animate-scale-in">
                    <label className="text-[11px] font-semibold text-muted-foreground">Enter Partner Lab Name</label>
                    <input
                      type="text"
                      placeholder="Enter Partner Lab Name"
                      value={partnerLabCustom}
                      onChange={(e) => setPartnerLabCustom(e.target.value)}
                      className="w-full h-8 px-3 rounded-xl border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Settlement & Financial Breakdown Box */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3 pt-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Financial Settlement & Payment
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-card border border-border/70">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Gross Total</span>
                    <p className="font-mono text-base font-bold text-foreground">₹{subtotal.toFixed(2)}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/70">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Discount (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-full font-mono text-sm font-bold text-destructive bg-transparent outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/70">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Paid (₹)</span>
                      <button
                        type="button"
                        onClick={() => setPaidAmount(String(netTotal))}
                        className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        title="Set 100% paid"
                      >
                        100% Full
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-transparent outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/70">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Balance Due</span>
                    <p className={`font-mono text-base font-black ${dueAmount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      ₹{dueAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="CASH">Cash Settlement</option>
                    <option value="UPI">UPI / QR Payment</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL: Investigation Catalog (7 cols, Identical to Add Patient) ── */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-card/40">
              {/* Catalog Search & Category Filters Bar */}
              <div className="p-4 border-b border-border/80 shrink-0 space-y-2.5 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-purple-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      2. Investigation Catalog
                    </h3>
                  </div>

                  {/* Mode Tabs: Diagnostic Tests vs Packages (Matches Add Patient!) */}
                  <div className="flex items-center gap-1 p-0.5 bg-muted/80 rounded-lg border border-border/80">
                    <button
                      type="button"
                      onClick={() => setCatalogMode("TESTS")}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        catalogMode === "TESTS"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Tests ({selectedTests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogMode("PACKAGES")}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        catalogMode === "PACKAGES"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Packages
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingCustomTest(!isAddingCustomTest)}
                    className="h-7 text-xs text-primary font-semibold gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isAddingCustomTest ? "Cancel Custom Test" : "+ Add Custom Test"}</span>
                  </Button>
                </div>

                {/* Custom Test Inline Box (If open) */}
                {isAddingCustomTest && (
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2 animate-scale-in">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                      Add Non-Catalog Investigation
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Hepatitis B DNA Viral Load"
                        value={customTestName}
                        onChange={(e) => setCustomTestName(e.target.value)}
                        className="flex-1 h-8 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        placeholder="Price (₹)"
                        value={customTestPrice}
                        onChange={(e) => setCustomTestPrice(e.target.value)}
                        className="w-24 h-8 px-3 rounded-xl border border-border bg-background text-xs outline-none focus:border-primary font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCustomTest}
                        className="h-8 px-3.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold cursor-pointer"
                      >
                        Add Test
                      </Button>
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={
                      catalogMode === "TESTS"
                        ? "Search test name or code (e.g. CBC, LFT, KFT, Glucose, Vitamin D)…"
                        : "Search health packages (e.g. Full Body, Cardiac)…"
                    }
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-background border border-border/90 rounded-xl text-xs placeholder:text-muted-foreground/60 focus:border-primary outline-none text-foreground font-medium shadow-2xs"
                  />
                  {testSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTestSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Chips Bar (For Tests Mode) */}
                {catalogMode === "TESTS" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setActiveCategory("ALL")}
                      className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 cursor-pointer ${
                        activeCategory === "ALL"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 cursor-pointer ${
                          activeCategory === cat
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grouped Test Cards Scroll Area (Matches Add Patient!) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {catalogMode === "PACKAGES" ? (
                  filteredPackagesForCatalog.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground space-y-2">
                      <Boxes className="h-10 w-10 mx-auto opacity-30 text-primary" />
                      <p className="text-xs font-bold text-foreground">No health packages found.</p>
                      <p className="text-[11px]">Switch to Diagnostic Tests above to select individual investigations.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredPackagesForCatalog.map((pkg) => {
                        const isSelected = selectedPackage?.id === pkg.id;
                        const testCount = pkg.tests?.length || pkg.testIds?.length || 0;
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => handleTogglePackage(pkg)}
                            className={`p-3.5 rounded-2xl border text-xs cursor-pointer select-none transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                              isSelected
                                ? "bg-purple-500/10 border-purple-500/40 shadow-xs ring-1 ring-purple-500/30"
                                : "bg-card border-border/90 hover:border-primary/50"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  {pkg.code}
                                </span>
                                <span className="font-mono text-xs font-extrabold text-primary">
                                  ₹{pkg.price.toFixed(2)}
                                </span>
                              </div>
                              <h4 className="font-bold text-foreground text-xs">{pkg.name}</h4>
                              {pkg.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                  {pkg.description}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground font-semibold">Includes {testCount} tests</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isSelected
                                    ? "bg-purple-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isSelected ? "Selected" : "Select Package"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : Object.keys(filteredGroups).length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground space-y-2">
                    <FlaskConical className="h-10 w-10 mx-auto opacity-30 text-purple-600" />
                    <p className="text-xs font-bold text-foreground">No clinical investigations match your filter.</p>
                    <p className="text-[11px]">Try clearing your search query or use &quot;+ Add Custom Test&quot; above.</p>
                  </div>
                ) : (
                  Object.entries(filteredGroups).map(([category, tests]) => (
                    <div key={category} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{category}</span>
                        <div className="h-px flex-1 bg-border/80" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {tests.map((test) => {
                          const selected = selectedTests.some(
                            (st) => (st.id && st.id === test.id) || st.name.toLowerCase() === test.name.toLowerCase()
                          );
                          const paramCount =
                            test.subTests?.reduce(
                              (acc: number, st: any) =>
                                acc + (st.subTests && st.subTests.length > 0 ? st.subTests.length : 1),
                              0
                            ) ?? (test.subTests?.length || 0);

                          return (
                            <div key={test.id} className="flex flex-col gap-1">
                              <div
                                onClick={() => handleToggleTest(test)}
                                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                                  selected
                                    ? "bg-purple-500/10 border-purple-500/40 shadow-xs ring-1 ring-purple-500/30"
                                    : "bg-card border-border/90 hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={() => handleToggleTest(test)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                                      {selected && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-600 text-white uppercase shrink-0">
                                          Selected
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {paramCount > 0
                                        ? `${paramCount} Parameters Included`
                                        : `Ref ${test.refRangeMin ?? "N/A"}–${test.refRangeMax ?? "N/A"}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-xs font-bold text-foreground shrink-0">
                                    ₹{Number(test.price).toFixed(0)}
                                  </span>
                                  {test.subTests && test.subTests.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedTests((prev) => ({ ...prev, [test.id]: !prev[test.id] }));
                                      }}
                                      className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                                    >
                                      {expandedTests[test.id] ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Expanded sub-tests */}
                              {expandedTests[test.id] && test.subTests && test.subTests.length > 0 && (
                                <div className="pl-6 pr-2 py-1 space-y-1">
                                  {test.subTests.map((sub: any) => (
                                    <div
                                      key={sub.id}
                                      className="flex items-center justify-between p-1.5 rounded-md border text-[11px] bg-card border-border/60"
                                    >
                                      <span className="font-medium text-foreground">{sub.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Modal Bottom Full-Width Summary Bar */}
          <div className="border-t border-border/80 px-6 py-4 shrink-0 bg-muted/40 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
              <div className="px-3.5 py-1.5 rounded-xl bg-card border border-border flex items-center gap-2 shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-muted-foreground font-semibold">Selected Investigations:</span>
                <span className="font-bold text-foreground font-mono">
                  {selectedTests.length} {selectedTests.length === 1 ? "Test" : "Tests"}
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  (₹{subtotal.toFixed(0)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5 justify-between w-full sm:w-auto sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Total</p>
                <p className="font-display text-2xl font-bold text-primary font-mono">₹{subtotal.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={createSubmitting}
                  onClick={handleCreateOutsourceCase}
                  className="h-10 px-6 rounded-xl gradient-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer shadow-md"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Case…</span>
                    </>
                  ) : (
                    <span>Register Outsource Case</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          OFFICIAL INVOICE MODAL (Exact Same Medical Invoice Sheet Engine)
      ═══════════════════════════════════════════════════════════════ */}
      {selectedBillCase && (
        <Dialog open={Boolean(selectedBillCase)} onOpenChange={() => setSelectedBillCase(null)}>
          <DialogContent className="max-w-4xl w-[96vw] sm:w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
            <DialogTitle className="sr-only">Print Invoice</DialogTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border/80 bg-card shrink-0 gap-3 print:hidden">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                      Tax Invoice Preview
                    </h3>
                    <span className="font-mono bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {selectedBillCase.bill?.custom_id || `INV-${selectedBillCase.reg_no}`}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                    Patient: <strong className="text-foreground">{selectedBillCase.patient?.name}</strong> · Reg No:{" "}
                    <span className="font-mono">{selectedBillCase.reg_no}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="gradient-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-px transition-all cursor-pointer w-full sm:w-auto mr-0 sm:mr-6"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Download PDF</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
              <div
                ref={invoicePrintRef}
                className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full"
              >
                <InvoiceSheet
                  settings={billSettings}
                  invoice={buildInvoiceData(selectedBillCase)}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
