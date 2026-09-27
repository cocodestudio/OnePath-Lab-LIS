"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search, Receipt, Edit2, Calendar, User, CheckCircle2, AlertTriangle,
  Loader2, ArrowRight, ChevronLeft, ChevronRight, FileDown, TrendingUp,
  Wallet, X, FileText, Printer, CheckCircle, Clock, AlertCircle, RefreshCw,
  Phone, Eye, Download, Sparkles, Plus, Trash2, PlusCircle, Check, Stethoscope,
  Building2, BadgeCheck, Boxes
} from "lucide-react";
import { getStoredPackages, getReportPackage, type LabPackage } from "@/lib/packages";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { normalizeBillSettings, type BillLayoutSettings } from "@/lib/bill-settings";
import { printInvoiceElement } from "@/lib/print-invoice";

interface Patient {
  name: string;
  custom_id: string;
  phone: string;
  age: number;
  gender: string;
  ref_doctor: string;
  address?: string;
}
interface Test {
  id: string;
  name: string;
  price: number;
  category?: string;
  code?: string;
  testCode?: string;
  test_code?: string;
  parent_id?: string | null;
  parentId?: string | null;
  parent?: any;
}
interface Result {
  id?: string;
  test: Test;
}
interface Report {
  id: string;
  custom_id: string;
  results: Result[];
}
interface Lab {
  name: string;
  email: string;
  address: string;
  logo_url: string | null;
}
interface Bill {
  id: string;
  custom_id: string;
  customId?: string;
  total: number;
  discount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  createdAt?: string;
  patient: Patient;
  reports?: Report[];
  lab?: Lab;
}

// Helper: Extract only distinct Main Diagnostic Panels from a Bill (resolving sub-parameters to top parent)
function getMainBillItems(
  bill: Bill | null,
  allTestsMap?: Map<string, any>
): { id?: string; name: string; code?: string; category?: string; sampleType?: string; price: number; barcode?: string }[] {
  if (!bill) return [];

  const itemsMap = new Map<string, { id?: string; name: string; code?: string; category?: string; sampleType?: string; price: number; barcode?: string }>();

  const billBarcode = (bill.patient as any)?.vial_barcode || (bill.patient as any)?.vialBarcode || (bill.patient as any)?.meta?.vial_barcode || (bill.patient as any)?.meta?.vialBarcode || "";

  if (bill.reports && bill.reports.length > 0) {
    bill.reports.forEach((r) => {
      if (r.results && r.results.length > 0) {
        r.results.forEach((res) => {
          if (res.test) {
            // Resolve top-level parent test
            let testObj = (res.test.id && allTestsMap?.get(res.test.id)) || res.test;

            // Climb up parent hierarchy until top-level main panel is reached
            while (testObj) {
              const parentId = testObj.parentId || testObj.parent_id || testObj.parent?.id;
              if (!parentId) break;
              const parentObj = allTestsMap?.get(parentId) || testObj.parent;
              if (!parentObj) break;
              testObj = parentObj;
            }

            const panelKey = testObj.id || testObj.name;
            if (testObj && !itemsMap.has(panelKey)) {
              itemsMap.set(panelKey, {
                id: testObj.id,
                name: testObj.name,
                code: testObj.code || (testObj as any).testCode || (testObj as any).test_code || `T-${(testObj.name || "").substring(0, 3).toUpperCase()}`,
                category: testObj.category,
                sampleType: (testObj as any).sampleType || (testObj as any).sample_type || (testObj as any).sample || undefined,
                price: Number(testObj.price || 0),
                barcode: billBarcode,
              });
            }
          }
        });
      }
    });
  }

  const list = Array.from(itemsMap.values());
  const grandTotal = Number(bill.total || 0) + Number(bill.discount || 0);

  if (list.length === 0) {
    // Check if package name or stored report package exists
    const pkgName = (bill.reports && (
      (bill.reports[0] as any)?.package_name ||
      (bill.reports[0] as any)?.packageName
    )) || (bill as any)?.packageName || (bill as any)?.package_name || getReportPackage(bill.custom_id) || getReportPackage(bill.id) || null;

    return [{
      id: "T-DEF",
      code: "T-PANEL",
      name: pkgName || "Diagnostic Investigation Panel",
      price: grandTotal > 0 ? grandTotal : Number(bill.total || 0),
      category: "Pathology",
      sampleType: undefined,
      barcode: billBarcode,
    }];
  }

  // If there's only 1 item and its price is 0, assign the grand total
  if (list.length === 1 && list[0].price === 0 && grandTotal > 0) {
    list[0].price = grandTotal;
  }

  return list;
}

function formatBillDate(dStr: string | null | undefined): string {
  try {
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day} ${mon} ${yr}`;
  } catch {
    return dStr || "—";
  }
}

// Helper: Resolve Bill Invoice Number safely across custom_id, customId, or id
function getBillInvoiceNo(bill: Bill | any | null | undefined): string {
  if (!bill) return "—";
  return (
    bill.custom_id ||
    bill.customId ||
    (bill.id ? `OPL-INV-${String(bill.id).slice(0, 6).toUpperCase()}` : "—")
  );
}

function normalizeBillObj(b: any): Bill {
  const invNo = b.custom_id || b.customId || (b.id ? `OPL-INV-${String(b.id).slice(0, 6).toUpperCase()}` : "");
  return {
    ...b,
    custom_id: invNo,
    customId: invNo,
    paid_amount: b.paid_amount ?? b.paidAmount ?? 0,
    created_at: b.created_at || b.createdAt,
    createdAt: b.createdAt || b.created_at,
    patient: b.patient ? {
      ...b.patient,
      custom_id: b.patient.custom_id || b.patient.customId || "",
      customId: b.patient.customId || b.patient.custom_id || "",
      ref_doctor: b.patient.ref_doctor || b.patient.refDoctor || "Self",
    } : b.patient
  };
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [labData, setLabData] = useState<any>(null);
  const [billSettings, setBillSettings] = useState<BillLayoutSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("lis_cached_bill_settings");
        if (cached) return normalizeBillSettings(JSON.parse(cached));
      } catch {}
    }
    return normalizeBillSettings({});
  });
  const [allRawTests, setAllRawTests] = useState<Test[]>([]);
  const [availableMainTests, setAvailableMainTests] = useState<Test[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const shiftDate = (days: number) => {
    const base = filterDate ? new Date(filterDate) : new Date();
    base.setDate(base.getDate() + days);
    setFilterDate(base.toISOString().split("T")[0]);
  };

  // Invoice Preview Modal State (Wide Landscape Layout)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<Bill | null>(null);

  // Edit Bill & Tests Modal State (Spacious Landscape)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [billTests, setBillTests] = useState<Test[]>([]);
  const [testSearchInput, setTestSearchInput] = useState("");
  const [billingItemMode, setBillingItemMode] = useState<"TESTS" | "PACKAGES">("TESTS");
  const [availablePackages, setAvailablePackages] = useState<LabPackage[]>([]);
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [discountVal, setDiscountVal] = useState("0");
  const [paidAmountVal, setPaidAmountVal] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("STAFF");
  const isB2B = currentUserRole === "B2B";
  const isCollectionCenter = currentUserRole === "COLLECTION_CENTER";

  useEffect(() => {
    setIsMounted(true);
    const user = getStoredUser();
    if (user?.role) setCurrentUserRole(user.role);

    // Safely hydrate from localStorage after mount to completely prevent SSR hydration mismatches
    try {
      const cachedLab = localStorage.getItem("lis_cached_lab");
      if (cachedLab) setLabData(JSON.parse(cachedLab));

      const cachedBillSettings = localStorage.getItem("lis_cached_bill_settings");
      if (cachedBillSettings) {
        setBillSettings(normalizeBillSettings(JSON.parse(cachedBillSettings)));
      }

      const cachedTests = localStorage.getItem("lis_cached_tests");
      if (cachedTests) {
        const parsed = JSON.parse(cachedTests);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllRawTests(parsed);
          setAvailableMainTests(parsed.filter((t: any) => !t.parentId && !t.parent_id));
        }
      }

      const cachedBills = localStorage.getItem("lis_cached_bills");
      if (cachedBills) {
        const parsed = JSON.parse(cachedBills);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBills(parsed.map(normalizeBillObj));
          setLoading(false);
        }
      }
    } catch {}

    fetchBills();
    fetchAvailableTests();
    try {
      setAvailablePackages(getStoredPackages());
    } catch (e) {}

    const handleSync = () => {
      fetchBills(true);
      fetchAvailableTests();
    };
    window.addEventListener("lis_online_sync", handleSync);
    return () => window.removeEventListener("lis_online_sync", handleSync);
  }, []);

  const fetchBills = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    try {
      if (isForce && bills.length === 0) {
        setLoading(true);
      }
      const [data, labRes] = await Promise.all([
        fetchFromLaravel("/bills", { skipCache: isForce }),
        !labData ? fetchFromLaravel("/lab").catch(() => null) : Promise.resolve(null),
      ]);
      const rawList = Array.isArray(data) ? data : (data?.data || []);
      const billsList = rawList.map(normalizeBillObj);
      setBills(billsList);
      if (labRes) {
        setLabData(labRes);
        const rawBill = labRes.bill_settings || labRes.billSettings;
        if (rawBill) {
          const parsedBill = normalizeBillSettings(rawBill);
          setBillSettings(parsedBill);
          try {
            localStorage.setItem("lis_cached_bill_settings", JSON.stringify(parsedBill));
          } catch {}
        }
        try {
          localStorage.setItem("lis_cached_lab", JSON.stringify(labRes));
        } catch {}
      }
      try {
        localStorage.setItem("lis_cached_bills", JSON.stringify(billsList));
      } catch {}
    } catch (err) {
      console.error("Error fetching bills:", err);
      if (bills.length === 0) setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTests = async () => {
    try {
      const data = await fetchFromLaravel("/tests");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setAllRawTests(list);
      // Filter ONLY Main / Top-Level tests (no sub-parameters)
      const mainTestsOnly = list.filter((t: any) => !t.parentId && !t.parent_id);
      setAvailableMainTests(mainTestsOnly);
    } catch (err) {
      console.error("Error fetching tests:", err);
    }
  };

  // Map of all tests for rapid hierarchy resolution
  const allTestsMap = useMemo(() => {
    const map = new Map<string, Test>();
    allRawTests.forEach((t) => {
      map.set(t.id, t);
    });
    return map;
  }, [allRawTests]);

  const handleOpenEditDialog = (bill: Bill) => {
    setEditingBill(bill);
    
    // Extract currently attached MAIN tests only (no single sub-parameters)
    const currentTests: Test[] = [];
    const mainItems = getMainBillItems(bill, allTestsMap);
    mainItems.forEach((item) => {
      if (item.id) {
        currentTests.push({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category || "Pathology",
        });
      }
    });

    setBillTests(currentTests);
    setDiscountVal(isB2B ? "0" : (bill.discount?.toString() || "0"));
    setPaidAmountVal(isB2B ? "0" : (bill.paid_amount ? bill.paid_amount.toString() : "0"));
    setPaymentStatus(isB2B ? "UNPAID" : (bill.status || "UNPAID"));
    setError(null);
    setSuccess(null);
    setIsAddingTest(false);
    setTestSearchInput("");
    setIsEditDialogOpen(true);
  };

  const handleRemoveTest = (testId: string) => {
    setBillTests(prev => prev.filter(t => t.id !== testId));
  };

  const handleAddTestToBill = (test: Test) => {
    if (!billTests.some(t => t.id === test.id)) {
      setBillTests(prev => [...prev, test]);
    }
    setIsAddingTest(false);
    setTestSearchInput("");
  };

  const handleAddPackageToBill = (pkg: LabPackage) => {
    const newTests: Test[] = [];
    (pkg.tests || []).forEach(pt => {
      const matched = allRawTests.find(
        at => at.id === pt.id ||
              (pt.code && (at.code || "").toLowerCase() === (pt.code || "").toLowerCase()) ||
              ((at.name || "").toLowerCase().trim() === (pt.name || "").toLowerCase().trim())
      );
      const testToAdd: Test = matched ? {
        id: matched.id,
        name: matched.name,
        category: matched.category || pt.category || "Pathology",
        price: matched.price || pt.price || 0,
        code: matched.code || pt.code,
      } : {
        id: pt.id,
        name: pt.name,
        category: pt.category || "Pathology",
        price: pt.price || 0,
        code: pt.code,
      };

      if (!billTests.some(bt => bt.id === testToAdd.id)) {
        newTests.push(testToAdd);
      }
    });
    if (newTests.length > 0) {
      setBillTests(prev => [...prev, ...newTests]);
    }
    setIsAddingTest(false);
    setTestSearchInput("");
  };

  // Recalculate totals dynamically inside edit dialog
  const editSubtotal = billTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const editDiscount = isB2B ? 0 : Math.min(editSubtotal, Math.max(0, parseFloat(discountVal) || 0));
  const editNetTotal = Math.max(0, editSubtotal - editDiscount);
  const editPaid = isB2B ? 0 : Math.max(0, parseFloat(paidAmountVal) || 0);
  const isFullyPaid = !isB2B && editNetTotal > 0 && editPaid >= editNetTotal;

  // Toggle or auto-fill full cash payment
  const handleTogglePaidFull = (forcePaid?: boolean) => {
    if (isB2B) return;
    const shouldBePaid = forcePaid !== undefined ? forcePaid : !isFullyPaid;
    if (shouldBePaid) {
      setPaidAmountVal(editNetTotal.toFixed(2));
      setPaymentStatus("PAID");
    } else {
      setPaidAmountVal("0");
      setPaymentStatus("UNPAID");
    }
  };

  const [updatingBillId, setUpdatingBillId] = useState<string | null>(null);

  // Quick mark paid directly from table row
  const handleQuickMarkPaid = async (bill: Bill) => {
    if (isB2B) return;
    const fullTotal = Number(bill.total) || 0;
    try {
      setUpdatingBillId(bill.id);
      const res = await fetchFromLaravel(`/bills/${bill.id}`, {
        method: "PUT",
        body: JSON.stringify({
          paid_amount: fullTotal,
          status: "PAID",
        }),
      });
      if (res && (res.id || res.custom_id)) {
        const normalized = normalizeBillObj(res);
        setBills(prev => prev.map(b => (b.id === normalized.id ? normalized : b)));
        try {
          const cachedBills = localStorage.getItem("lis_cached_bills");
          if (cachedBills) {
            const list = JSON.parse(cachedBills);
            const updatedList = list.map((b: any) => (b.id === normalized.id ? normalized : b));
            localStorage.setItem("lis_cached_bills", JSON.stringify(updatedList));
          }
        } catch {}
      }
      fetchBills();
    } catch (err: any) {
      console.error("Failed to mark bill as paid:", err);
    } finally {
      setUpdatingBillId(null);
    }
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const finalPaid = isB2B ? 0 : editPaid;
      const finalStatus = isB2B ? "UNPAID" : (finalPaid >= editNetTotal || paymentStatus === "PAID" ? "PAID" : (finalPaid > 0 ? "PARTIAL" : "UNPAID"));
      const resolvedPaid = isB2B ? 0 : (finalStatus === "PAID" ? Math.max(finalPaid, editNetTotal) : finalPaid);

      const payload: any = {
        discount: isB2B ? 0 : editDiscount,
        total: editNetTotal,
        paid_amount: resolvedPaid,
        status: finalStatus,
      };

      if (billTests.length > 0) {
        payload.test_ids = billTests.map(t => t.id);
      }

      const updatedBill = await fetchFromLaravel(`/bills/${editingBill.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // Instantly update the bill in local state & cache
      if (updatedBill && (updatedBill.id || updatedBill.custom_id)) {
        const normalized = normalizeBillObj(updatedBill);
        setBills(prev => prev.map(b => (b.id === normalized.id ? normalized : b)));
        try {
          const cachedBills = localStorage.getItem("lis_cached_bills");
          if (cachedBills) {
            const list = JSON.parse(cachedBills);
            const updatedList = list.map((b: any) => (b.id === normalized.id ? normalized : b));
            localStorage.setItem("lis_cached_bills", JSON.stringify(updatedList));
          }
        } catch {}
      }

      // Close modal immediately for a snappy, instantaneous experience
      setIsEditDialogOpen(false);
      setSuccess(null);

      // Refresh in background without blocking UI
      fetchBills();
    } catch (err: any) {
      setError(err.message || "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const handleOpenInvoiceModal = (bill: Bill) => {
    setSelectedBillForInvoice(bill);
    setIsInvoiceModalOpen(true);
  };

  const handlePrintWindow = () => {
    if (invoicePrintRef.current) {
      printInvoiceElement(invoicePrintRef.current, `Invoice_${getBillInvoiceNo(selectedBillForInvoice)}`);
    } else {
      window.print();
    }
  };

  // Calculations & Filters
  const safeBills = Array.isArray(bills) ? bills : [];

  const filteredBills = safeBills.filter((b) => {
    if (!b || !b.patient) return false;
    const patName = b.patient.name || "";
    const patId = b.patient.custom_id || (b.patient as any)?.customId || "";
    const billId = getBillInvoiceNo(b);
    const phone = b.patient.phone || "";
    const billDate = (b.createdAt || b.created_at || "").slice(0, 10);

    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      patId.toLowerCase().includes(search.toLowerCase()) ||
      billId.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search);

    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    const matchesDate = filterDate ? billDate.startsWith(filterDate) : true;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalInvoiced = filteredBills.reduce((acc, b) => acc + (Number(b.total) || 0), 0);
  const totalCollected = filteredBills.reduce((acc, b) => acc + (b.status === "PAID" ? (Number(b.total) || 0) : (Number(b.paid_amount) || 0)), 0);
  const totalDue = filteredBills.reduce((acc, b) => acc + (b.status === "PAID" ? 0 : Math.max(0, (Number(b.total) || 0) - (Number(b.paid_amount) || 0))), 0);
  const paidCount = filteredBills.filter((b) => b.status === "PAID").length;
  const unpaidCount = filteredBills.filter((b) => b.status !== "PAID").length;

  const totalRows = filteredBills.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredBills.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, filterDate]);

  const filteredAvailableTests = availableMainTests.filter(t => {
    const q = testSearchInput.toLowerCase().trim();
    if (!q) return true;
    const name = (t.name || "").toLowerCase();
    const code = ((t as any).code || (t as any).testCode || (t as any).test_code || (t as any).id || "").toLowerCase();
    const cat = (t.category || "").toLowerCase();
    return name.includes(q) || code.includes(q) || cat.includes(q);
  });

  const filteredAvailablePackages = useMemo(() => {
    const q = testSearchInput.toLowerCase().trim();
    if (!q) return availablePackages;
    return availablePackages.filter(p =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [availablePackages, testSearchInput]);

  const invoiceMainItems = useMemo(() => {
    return getMainBillItems(selectedBillForInvoice, allTestsMap);
  }, [selectedBillForInvoice, allTestsMap]);

  return (
    <div className="w-full space-y-7 pb-12 animate-fade-in text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Financial Operations</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Billing & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage patient invoices, update diagnostic panels, track payments, and issue medical receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBills(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border/90 bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="p-5 rounded-xl border border-border/90 bg-card/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Billed</span>
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="space-y-2 py-0.5">
                <div className="h-7 w-28 rounded-md shimmer-gradient" />
                <div className="h-3 w-36 rounded shimmer-gradient" />
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-bold text-foreground font-mono">₹{totalInvoiced.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{filteredBills.length} invoices on selected date</p>
              </>
            )}
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-xl border border-border/90 bg-card/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Collected</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="space-y-2 py-0.5">
                <div className="h-7 w-28 rounded-md shimmer-gradient" />
                <div className="h-3 w-32 rounded shimmer-gradient" />
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{totalCollected.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{paidCount} fully paid accounts</p>
              </>
            )}
          </div>
        </div>

        {/* Outstanding Due */}
        <div className="p-5 rounded-xl border border-border/90 bg-card/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Outstanding Balance</span>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="space-y-2 py-0.5">
                <div className="h-7 w-28 rounded-md shimmer-gradient" />
                <div className="h-3 w-36 rounded shimmer-gradient" />
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">₹{totalDue.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{unpaidCount} invoices with balance</p>
              </>
            )}
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="p-5 rounded-xl border border-border/90 bg-card/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Collection Rate</span>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="space-y-2 py-0.5">
                <div className="h-7 w-20 rounded-md shimmer-gradient" />
                <div className="h-3 w-32 rounded shimmer-gradient" />
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-bold text-foreground font-mono">
                  {totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : "100"}%
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Settlement efficiency</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/70 p-4 rounded-xl border border-border/80 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient, phone, PID, or invoice ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border/90 rounded-lg text-xs outline-none focus:border-primary transition-all text-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Date Filter with < > Arrow Buttons */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-background border border-border/90 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-8 px-2 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
              />

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFilterDate(new Date().toISOString().split("T")[0])}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterDate === new Date().toISOString().split("T")[0]
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-background text-muted-foreground hover:text-foreground border-border/90"
              }`}
            >
              Today
            </button>

            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate("")}
                className="px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-background border border-border/90 hover:bg-muted transition-all cursor-pointer"
              >
                All Dates
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
        <div className="table-responsive-container">
          <table className="w-full min-w-[820px] text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-4">Diagnostic Panels</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Due (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-24 rounded shimmer-gradient mb-1" />
                      <div className="h-3 w-16 rounded shimmer-gradient" />
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="h-4 w-36 rounded shimmer-gradient" />
                      <div className="h-3 w-20 rounded shimmer-gradient" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-44 rounded shimmer-gradient" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 rounded shimmer-gradient ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 rounded shimmer-gradient ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 rounded shimmer-gradient ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="h-5 w-16 rounded-full shimmer-gradient mx-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 w-20 rounded-lg shimmer-gradient ml-auto" />
                    </td>
                  </tr>
                ))
              ) : currentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground">
                      {filterDate ? `No invoices found for ${filterDate}` : "No invoices found"}
                    </p>
                    <p className="text-[11px] mt-0.5">Use the &lt; and &gt; date arrows or click &quot;All Dates&quot; above.</p>
                  </td>
                </tr>
              ) : (
                currentRows.map((bill) => {
                  const billDate = formatBillDate((bill.createdAt || bill.created_at) as string);
                  const isBillPaid = bill.status === "PAID";
                  const due = isBillPaid ? 0 : Math.max(0, (Number(bill.total) || 0) - (Number(bill.paid_amount) || 0));
                  const displayPaid = isBillPaid ? (Number(bill.total) || 0) : (Number(bill.paid_amount) || 0);
                  const mainItems = getMainBillItems(bill, allTestsMap);

                  return (
                    <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-foreground block">{getBillInvoiceNo(bill)}</span>
                        <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>{billDate}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{bill.patient?.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{bill.patient?.custom_id}</span>
                          <span>·</span>
                          <span>{bill.patient?.gender?.charAt(0)}/{bill.patient?.age}y</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-[240px] truncate font-medium text-foreground">
                          {mainItems.map(item => item.name).slice(0, 2).join(", ")}
                          {mainItems.length > 2 ? ` +${mainItems.length - 2} more` : ""}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        ₹{(Number(bill.total) || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{displayPaid.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        ₹{due.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          bill.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : bill.status === "PARTIAL"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {bill.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isB2B && bill.status !== "PAID" && (
                            <button
                              type="button"
                              disabled={updatingBillId === bill.id}
                              onClick={() => handleQuickMarkPaid(bill)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] cursor-pointer transition-colors flex items-center gap-1 border border-emerald-500/20 disabled:opacity-50"
                              title="1-Click Mark as Paid (Cash Collected)"
                            >
                              {updatingBillId === bill.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              <span>Pay Cash</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenInvoiceModal(bill)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="Preview / Print Invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {!isCollectionCenter && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditDialog(bill)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                              title="Edit Invoice & Panels"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalRows > rowsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/80 text-xs text-muted-foreground">
            <span>
              Showing <strong>{indexOfFirstRow + 1}</strong> to <strong>{Math.min(indexOfLastRow, totalRows)}</strong> of <strong>{totalRows}</strong> invoices
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-border/90 bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-border/90 bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. High-End Horizontal Landscape Printable Medical Invoice Modal */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-4xl w-[96vw] sm:w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
          <DialogTitle className="sr-only">Medical Invoice Preview</DialogTitle>

          {/* Modal Top Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-7 py-3 sm:py-4 border-b border-border/80 bg-card shrink-0 gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                    Tax Invoice Preview
                  </h3>
                  <span className="font-mono bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {getBillInvoiceNo(selectedBillForInvoice)}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  Patient: <strong className="text-foreground">{selectedBillForInvoice?.patient?.name}</strong> · PID: <span className="font-mono">{selectedBillForInvoice?.patient?.custom_id || (selectedBillForInvoice?.patient as any)?.customId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrintWindow}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:-translate-y-px transition-all cursor-pointer w-full sm:w-auto mr-0 sm:mr-6"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / Download PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Invoice Sheet Body (Rendered via Unified InvoiceSheet Engine) */}
          <div className="flex-1 overflow-auto sheet-pan-canvas p-2 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
            {selectedBillForInvoice && (
              <div ref={invoicePrintRef} className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full">
                <InvoiceSheet
                  settings={billSettings}
                  invoice={{
                    id: selectedBillForInvoice.id,
                    customId: getBillInvoiceNo(selectedBillForInvoice),
                    createdAt: (selectedBillForInvoice.createdAt || selectedBillForInvoice.created_at) as string || new Date().toISOString(),
                    total: Number(selectedBillForInvoice.total || 0),
                    discount: Number(selectedBillForInvoice.discount || 0),
                    paidAmount: selectedBillForInvoice.status === "PAID"
                      ? Number(selectedBillForInvoice.total || 0)
                      : Number(selectedBillForInvoice.paid_amount ?? (selectedBillForInvoice as any).paidAmount ?? 0),
                    status: selectedBillForInvoice.status || "UNPAID",
                    paymentMode: (selectedBillForInvoice as any).payment_mode || (selectedBillForInvoice as any).paymentMode || "CASH / UPI",
                    billedBy: "Accounts / Billing Desk",
                    packageName: (selectedBillForInvoice.reports && (
                      (selectedBillForInvoice.reports[0] as any)?.package_name ||
                      (selectedBillForInvoice.reports[0] as any)?.packageName
                    )) || (selectedBillForInvoice as any)?.packageName || (selectedBillForInvoice as any)?.package_name || getReportPackage(getBillInvoiceNo(selectedBillForInvoice)) || getReportPackage(selectedBillForInvoice.id) || (selectedBillForInvoice.patient?.custom_id ? getReportPackage(selectedBillForInvoice.patient.custom_id) : null) || null,
                    patient: {
                      customId: selectedBillForInvoice.patient?.custom_id || (selectedBillForInvoice.patient as any)?.customId || "",
                      name: selectedBillForInvoice.patient?.name || "",
                      phone: selectedBillForInvoice.patient?.phone || "",
                      age: selectedBillForInvoice.patient?.age || 0,
                      gender: selectedBillForInvoice.patient?.gender || "",
                      refDoctor: selectedBillForInvoice.patient?.ref_doctor || (selectedBillForInvoice.patient as any)?.refDoctor || "Self",
                      secondReferral: (selectedBillForInvoice.patient as any)?.second_referral || (selectedBillForInvoice.patient as any)?.secondReferral || "",
                      address: selectedBillForInvoice.patient?.address || "",
                      aadhaarNo: (selectedBillForInvoice.patient as any)?.aadhaar_no || (selectedBillForInvoice.patient as any)?.aadhaarNo || "",
                      insuranceNo: (selectedBillForInvoice.patient as any)?.insurance_no || (selectedBillForInvoice.patient as any)?.insuranceNo || "",
                      hfrId: (selectedBillForInvoice.patient as any)?.hfr_id || (selectedBillForInvoice.patient as any)?.hfrId || "",
                      uhid: (selectedBillForInvoice.patient as any)?.uhid || (selectedBillForInvoice.patient as any)?.meta?.uhid || "",
                      corporateName: (selectedBillForInvoice.patient as any)?.corporate_name || (selectedBillForInvoice.patient as any)?.corporateName || (selectedBillForInvoice.patient as any)?.gov_panel || (selectedBillForInvoice.patient as any)?.govPanel || "",
                      vialBarcode: (selectedBillForInvoice.patient as any)?.vial_barcode || (selectedBillForInvoice.patient as any)?.vialBarcode || (selectedBillForInvoice.patient as any)?.meta?.vial_barcode || (selectedBillForInvoice.patient as any)?.meta?.vialBarcode || "",
                      abhaNumber: (selectedBillForInvoice.patient as any)?.abha_number || (selectedBillForInvoice.patient as any)?.abhaNumber || (selectedBillForInvoice.patient as any)?.meta?.abha_number || "",
                      abhaAddress: (selectedBillForInvoice.patient as any)?.abha_address || (selectedBillForInvoice.patient as any)?.abhaAddress || (selectedBillForInvoice.patient as any)?.meta?.abha_address || "",
                      ownerName: (selectedBillForInvoice.patient as any)?.owner_name || (selectedBillForInvoice.patient as any)?.ownerName || "",
                    },
                    lab: {
                      name: labData?.name || labData?.centre_name || selectedBillForInvoice.lab?.name || "OnePath Pathology Laboratory",
                      email: labData?.email || selectedBillForInvoice.lab?.email || "support@onepathlab.com",
                      address: labData?.address || selectedBillForInvoice.lab?.address || "Medical Diagnostic Center",
                      phone: labData?.phone || (selectedBillForInvoice.lab as any)?.phone || "",
                      logoUrl: billSettings.logoImage || labData?.logo_url || (selectedBillForInvoice.lab as any)?.logo_url || (selectedBillForInvoice.lab as any)?.logoUrl || "/onepath-logo.png",
                      pincode: labData?.pincode || (selectedBillForInvoice.lab as any)?.pincode || "",
                      city: labData?.city || (selectedBillForInvoice.lab as any)?.city || "",
                      district: labData?.district || labData?.city || "",
                      state: labData?.state || (selectedBillForInvoice.lab as any)?.state || "",
                      gstin: billSettings.gst?.number || labData?.gstin || (selectedBillForInvoice.lab as any)?.gstin || "",
                      bill_settings: billSettings,
                    },
                    tests: invoiceMainItems.map(item => ({
                      id: item.id || item.name,
                      name: item.name,
                      code: (item as any).code || (item as any).testCode || (item as any).test_code || `T-${(item.name || "").substring(0, 3).toUpperCase()}`,
                      price: Number(item.price || 0),
                      category: item.category,
                      sampleType: (item as any).sampleType || (item as any).sample_type || undefined,
                      barcode: (item as any).barcode || (selectedBillForInvoice.patient as any)?.vial_barcode || (selectedBillForInvoice.patient as any)?.vialBarcode || "",
                    })),
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Spacious Horizontal Edit Bill & Tests Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Edit Invoice & Manage Tests</DialogTitle>
          
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-4 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    Edit Invoice & Diagnostic Panels
                  </h3>
                  <span className="font-mono bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {getBillInvoiceNo(editingBill)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient: <strong className="text-foreground">{editingBill?.patient?.name}</strong> · PID: <span className="font-mono">{editingBill?.patient?.custom_id || (editingBill?.patient as any)?.customId}</span> · Ref: Dr. {editingBill?.patient?.ref_doctor || "Self"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-7 space-y-6 bg-background custom-scrollbar">
            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSaveBill} className="grid grid-cols-1 lg:grid-cols-12 gap-7 text-xs">
              
              {/* Left Column: Main Diagnostic Panels Selection & Attached List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <span className="font-bold text-foreground uppercase tracking-wider flex items-center gap-2 text-xs">
                    <FileText className="h-4 w-4 text-primary" />
                    Attached Diagnostic Panels ({billTests.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingTest(!isAddingTest)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary transition-colors cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>{isAddingTest ? "Close Directory" : "+ Add Panel / Test"}</span>
                  </button>
                </div>

                {/* Add Test / Package Search Bar */}
                {isAddingTest && (
                  <div className="p-4 rounded-xl border border-primary/40 bg-accent/30 space-y-3 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          autoFocus
                          placeholder={
                            billingItemMode === "TESTS"
                              ? "Search test by name or test code (e.g. CBC, LFT, Lipid, KFT)…"
                              : "Search package by name or package code (e.g. Full Body, Cardiac)…"
                          }
                          value={testSearchInput}
                          onChange={(e) => setTestSearchInput(e.target.value)}
                          className="w-full pl-9 pr-3 h-9 bg-background border border-border rounded-lg text-xs outline-none focus:border-primary font-medium"
                        />
                      </div>
                      <select
                        value={billingItemMode}
                        onChange={(e) => {
                          setBillingItemMode(e.target.value as "TESTS" | "PACKAGES");
                          setTestSearchInput("");
                        }}
                        className="h-9 px-3 rounded-lg bg-background border border-border text-xs font-bold text-foreground focus:border-primary outline-none cursor-pointer shrink-0"
                      >
                        <option value="TESTS">Tests</option>
                        <option value="PACKAGES">Packages</option>
                      </select>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-border/40 custom-scrollbar pr-1">
                      {billingItemMode === "PACKAGES" ? (
                        filteredAvailablePackages.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No matching diagnostic packages available.</p>
                        ) : (
                          filteredAvailablePackages.map(pkg => (
                            <div key={pkg.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs py-1.5 px-2 hover:bg-card rounded-lg transition-colors">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">{pkg.name}</span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{pkg.code}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Includes {pkg.tests?.length || 0} investigations
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-primary">₹{pkg.price.toFixed(0)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddPackageToBill(pkg)}
                                  className="px-2.5 py-1 rounded-md font-bold text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors cursor-pointer"
                                >
                                  + Add Package
                                </button>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        filteredAvailableTests.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No matching diagnostic tests available.</p>
                        ) : (
                          filteredAvailableTests.map(t => {
                            const isAlreadyAdded = billTests.some(bt => bt.id === t.id);
                            return (
                              <div key={t.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs py-1.5 px-2 hover:bg-card rounded-lg transition-colors">
                                <div>
                                  <span className="font-bold text-foreground">{t.name}</span>
                                  <span className="text-[10px] text-muted-foreground ml-2">({t.category || "General"})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-foreground">₹{Number(t.price || 0).toFixed(0)}</span>
                                  <button
                                    type="button"
                                    disabled={isAlreadyAdded}
                                    onClick={() => handleAddTestToBill(t)}
                                    className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${
                                      isAlreadyAdded
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                                    }`}
                                  >
                                    {isAlreadyAdded ? "Added" : "+ Add Panel"}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Current Bill Tests List */}
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar shadow-xs">
                  {billTests.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-bold text-foreground">No test panels attached to this bill</p>
                      <p className="text-[11px] mt-0.5">Click "+ Add Panel / Test" above to attach investigations.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {billTests.map((test, tIdx) => (
                        <li key={test.id || tIdx} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                              #{tIdx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-foreground text-[12.5px]">{test.name}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">{test.category || "Pathology"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-foreground text-xs">₹{Number(test.price || 0).toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTest(test.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                              title="Remove Panel"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right Column: Financial Breakdown & Payment Adjustments */}
              <div className="lg:col-span-5 space-y-5 bg-card/90 p-5 rounded-2xl border border-border/90 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div className="border-b border-border/80 pb-2.5 flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      Invoice Payment Calculation
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isFullyPaid 
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}>
                      {isFullyPaid ? "PAID" : "UNPAID / DUE"}
                    </span>
                  </div>

                  {/* Cash Payment One-Click Toggle Card */}
                  {isB2B ? (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-foreground">B2B Settlement Status: UNPAID</p>
                        <p className="text-[10px] text-muted-foreground">Invoice payment is cleared upon central laboratory settlement.</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isFullyPaid 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-amber-500/10 border-amber-500/30"
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isFullyPaid ? "bg-emerald-600 text-white" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        }`}>
                          {isFullyPaid ? <CheckCircle2 className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">
                            {isFullyPaid ? "Paid in Full (Cash / Cleared)" : "Pending Balance"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {isFullyPaid ? "Zero dues remaining on bill" : "Click to mark 100% Cash Paid"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePaidFull()}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                          isFullyPaid
                            ? "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        }`}
                      >
                        {isFullyPaid ? (
                          <span>Reset Unpaid</span>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Paid (Cash)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Gross Subtotal */}
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-muted/40">
                      <span className="text-muted-foreground font-semibold">Gross Subtotal ({billTests.length} panels)</span>
                      <span className="font-mono font-bold text-foreground text-sm">₹{editSubtotal.toFixed(2)}</span>
                    </div>

                    {/* Discount Concession */}
                    {!isB2B && (
                      <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-muted/40">
                        <span className="text-destructive font-semibold">Discount Concession (₹)</span>
                        <div className="w-28">
                          <input
                            type="number"
                            min="0"
                            max={editSubtotal}
                            value={discountVal}
                            onChange={(e) => setDiscountVal(e.target.value)}
                            className="w-full font-mono font-bold text-xs text-right text-destructive bg-background px-2.5 py-1.5 rounded-lg border border-border outline-none focus:border-destructive"
                          />
                        </div>
                      </div>
                    )}

                    {/* Net Total Payable */}
                    <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-primary font-bold text-xs uppercase tracking-wide">Net Total Payable</span>
                      <span className="font-mono font-extrabold text-primary text-base">₹{editNetTotal.toFixed(2)}</span>
                    </div>

                    {/* Paid Amount */}
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Amount Paid (₹)</span>
                        {!isB2B && !isFullyPaid && editNetTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => handleTogglePaidFull(true)}
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 cursor-pointer border border-emerald-500/30 transition-colors"
                            title="Auto-fill 100% full amount as cash payment"
                          >
                            + 100% Cash
                          </button>
                        )}
                      </div>
                      <div className="w-28">
                        {isB2B ? (
                          <span className="font-mono font-bold text-xs text-muted-foreground block text-right px-2.5 py-1.5">
                            ₹0.00
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={paidAmountVal}
                            onChange={(e) => {
                              setPaidAmountVal(e.target.value);
                              const val = parseFloat(e.target.value) || 0;
                              setPaymentStatus(val >= editNetTotal ? "PAID" : (val > 0 ? "PARTIAL" : "UNPAID"));
                            }}
                            className="w-full font-mono font-bold text-xs text-right text-emerald-600 dark:text-emerald-400 bg-background px-2.5 py-1.5 rounded-lg border border-border outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    </div>

                    {/* Balance Due */}
                    <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide">Balance Due</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        ₹{(paymentStatus === "PAID" ? 0 : Math.max(0, editNetTotal - editPaid)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/80">
                  <button
                    type="button"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="gradient-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl shadow-md hover:-translate-y-px transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{saving ? "Updating..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}