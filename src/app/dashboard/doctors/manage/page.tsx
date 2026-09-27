"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Stethoscope, Users, SlidersHorizontal, Plus, Search,
  Save, RefreshCw, Trash2, Edit2, Check, X, Percent,
  IndianRupee, ArrowLeft, CheckCircle2, AlertCircle, Building2,
  Phone, Mail, MapPin, Sparkles, Filter, Layers, HelpCircle,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

interface Doctor {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  clinic_hospital?: string | null;
  address?: string | null;
  default_commission_percent: number;
  custom_commission_percent?: number | null;
  is_using_global_rate?: boolean;
  test_commissions?: Record<string, number>;
  is_active: boolean;
  is_registered?: boolean;
}

interface DiagnosticTest {
  id: string;
  name: string;
  test_code?: string;
  category?: string;
  price?: number;
}

export default function ManageDoctorsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const preselectedDoctorName = searchParams.get("selected_doctor");

  // Active top tab: "matrix" (Test Discount Rules) vs "directory" (Doctor Directory)
  const [activeTab, setActiveTab] = useState<"matrix" | "directory">("matrix");

  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Selected Target for Commission Matrix: "GLOBAL" or doctor id
  const [selectedTarget, setSelectedTarget] = useState<string>("GLOBAL");

  // Global settings state
  const [globalDefaultRate, setGlobalDefaultRate] = useState<number>(0);
  const [globalTestCommissions, setGlobalTestCommissions] = useState<Record<string, number>>({});

  // Doctor-specific commission state (when a specific doctor is selected)
  const [doctorTestCommissions, setDoctorTestCommissions] = useState<Record<string, number>>({});
  const [doctorDefaultRate, setDoctorDefaultRate] = useState<number>(0);

  // Filter & Search inside Test Matrix
  const [testSearch, setTestSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [bulkPercentInput, setBulkPercentInput] = useState<string>("");

  // Pagination for Test Matrix
  const [matrixPage, setMatrixPage] = useState<number>(1);
  const [matrixPageSize, setMatrixPageSize] = useState<number>(25);

  // Directory Search & Filter
  const [doctorSearch, setDoctorSearch] = useState<string>("");

  // Directory Add/Edit Modal
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState<boolean>(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorForm, setDoctorForm] = useState({
    name: "",
    phone: "",
    email: "",
    specialty: "",
    clinic_hospital: "",
    address: "",
    default_commission_percent: "0",
  });

  // Fetch initial data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch settings & tests
      const settingsRes = await fetchFromLaravel("/doctors/settings", { skipCache: true });
      if (settingsRes && settingsRes.success) {
        setTests(settingsRes.tests || []);
        const s = settingsRes.settings || {};
        const globRate = Number(s.default_commission_percent || 0);
        setGlobalDefaultRate(globRate);
        setGlobalTestCommissions(s.global_test_commissions || {});
      }

      // 2. Fetch doctors list
      const doctorsRes = await fetchFromLaravel("/doctors?filter=all", { skipCache: true });
      if (doctorsRes && doctorsRes.success) {
        const docList: Doctor[] = doctorsRes.doctors || [];
        setDoctors(docList);

        // Sync with localStorage so Add Patient referral dropdown has all doctors immediately
        try {
          const names = docList.map((d) => d.name).filter(Boolean);
          const combined = Array.from(new Set(["Self", ...names]));
          localStorage.setItem("lis_referral_doctors", JSON.stringify(combined));
        } catch {}

        // Preselect if query param provided
        if (preselectedDoctorName) {
          const matched = docList.find(
            (d) => d.name.toLowerCase() === preselectedDoctorName.toLowerCase()
          );
          if (matched) {
            setSelectedTarget(matched.id);
            setDoctorDefaultRate(matched.default_commission_percent || 0);
            setDoctorTestCommissions(matched.test_commissions || {});
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load doctor settings:", err);
      toast.error("Load Error", err.message || "Could not fetch configuration data.");
    } finally {
      setIsLoading(false);
    }
  }, [preselectedDoctorName, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When target changes (GLOBAL vs Doctor)
  const handleTargetChange = (targetId: string) => {
    setSelectedTarget(targetId);
    setMatrixPage(1);
    if (targetId === "GLOBAL") {
      // Handled by global state
    } else {
      const doc = doctors.find((d) => d.id === targetId);
      if (doc) {
        setDoctorDefaultRate(doc.default_commission_percent || 0);
        setDoctorTestCommissions(doc.test_commissions || {});
      }
    }
  };

  // Distinct Test Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.category && t.category.trim()) {
        set.add(t.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [tests]);

  // Filtered Tests
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchCat =
        selectedCategory === "ALL" ||
        (t.category && t.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchSearch =
        !testSearch.trim() ||
        t.name.toLowerCase().includes(testSearch.toLowerCase().trim()) ||
        (t.test_code && t.test_code.toLowerCase().includes(testSearch.toLowerCase().trim()));
      return matchCat && matchSearch;
    });
  }, [tests, selectedCategory, testSearch]);

  // Paginated Tests for performance
  const totalMatrixPages = Math.max(1, Math.ceil(filteredTests.length / matrixPageSize));
  const paginatedTests = useMemo(() => {
    const start = (matrixPage - 1) * matrixPageSize;
    return filteredTests.slice(start, start + matrixPageSize);
  }, [filteredTests, matrixPage, matrixPageSize]);

  // Filtered Doctors for Directory Tab
  const filteredDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return doctors;
    const q = doctorSearch.toLowerCase().trim();
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.specialty && d.specialty.toLowerCase().includes(q)) ||
        (d.clinic_hospital && d.clinic_hospital.toLowerCase().includes(q)) ||
        (d.phone && d.phone.includes(q))
    );
  }, [doctors, doctorSearch]);

  // Active matrix values based on whether Global or Doctor is chosen
  const activeCommissions = useMemo(() => {
    return selectedTarget === "GLOBAL" ? globalTestCommissions : doctorTestCommissions;
  }, [selectedTarget, globalTestCommissions, doctorTestCommissions]);

  // Update commission for a single test
  const handleTestCommissionChange = (testId: string, val: string) => {
    const num = Math.min(100, Math.max(0, parseFloat(val) || 0));
    if (selectedTarget === "GLOBAL") {
      setGlobalTestCommissions((prev) => ({
        ...prev,
        [testId]: num,
      }));
    } else {
      setDoctorTestCommissions((prev) => ({
        ...prev,
        [testId]: num,
      }));
    }
  };

  // Clear commission override for a single test
  const handleClearTestCommission = (testId: string) => {
    if (selectedTarget === "GLOBAL") {
      setGlobalTestCommissions((prev) => {
        const copy = { ...prev };
        delete copy[testId];
        return copy;
      });
    } else {
      setDoctorTestCommissions((prev) => {
        const copy = { ...prev };
        delete copy[testId];
        return copy;
      });
    }
  };

  // Save Commission Matrix to backend database
  const saveCommissions = async (
    target: string,
    baseRate: number,
    commissions: Record<string, number>
  ) => {
    setIsSaving(true);
    try {
      if (target === "GLOBAL") {
        const res = await fetchFromLaravel("/doctors/settings", {
          method: "PUT",
          body: JSON.stringify({
            default_commission_percent: baseRate,
            global_test_commissions: commissions,
          }),
        });

        if (res && res.success) {
          toast.success("Saved Successfully!", "Global doctor commission & test matrix updated.");
          loadInitialData();
        } else {
          toast.error("Save Error", res?.message || "Failed to update global settings.");
        }
      } else {
        const doc = doctors.find((d) => d.id === target);
        if (!doc) throw new Error("Doctor not found");

        if (doc.is_registered) {
          const res = await fetchFromLaravel(`/doctors/${doc.id}`, {
            method: "PUT",
            body: JSON.stringify({
              default_commission_percent: baseRate,
              test_commissions: commissions,
            }),
          });
          if (res && res.success) {
            toast.success("Saved Successfully!", `Custom commissions for ${doc.name} updated.`);
            loadInitialData();
          } else {
            toast.error("Save Error", res?.message || "Could not update doctor commissions.");
          }
        } else {
          const res = await fetchFromLaravel("/doctors", {
            method: "POST",
            body: JSON.stringify({
              name: doc.name,
              default_commission_percent: baseRate,
              test_commissions: commissions,
            }),
          });
          if (res && res.success) {
            toast.success("Registered & Saved!", `${doc.name} saved to directory with custom rates.`);
            loadInitialData();
          } else {
            toast.error("Save Error", res?.message || "Could not save doctor.");
          }
        }
      }
    } catch (err: any) {
      console.error("Save commission error:", err);
      toast.error("Error", err.message || "Failed to save commission matrix.");
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Apply Percent to all visible filtered tests & AUTO-SAVE directly to database
  const handleBulkApply = async () => {
    const target = selectedTarget;
    const baseRate = target === "GLOBAL" ? globalDefaultRate : doctorDefaultRate;
    const currentComms = target === "GLOBAL" ? globalTestCommissions : doctorTestCommissions;

    let mergedCommissions = { ...currentComms };

    if (bulkPercentInput.trim() !== "") {
      const num = parseFloat(bulkPercentInput);
      if (isNaN(num) || num < 0 || num > 100) {
        toast.error("Invalid Input", "Please enter a valid percentage between 0 and 100.");
        return;
      }

      const updates: Record<string, number> = {};
      filteredTests.forEach((t) => {
        updates[t.id] = num;
      });

      mergedCommissions = { ...currentComms, ...updates };

      if (target === "GLOBAL") {
        setGlobalTestCommissions(mergedCommissions);
      } else {
        setDoctorTestCommissions(mergedCommissions);
      }

      setBulkPercentInput("");
    }

    await saveCommissions(target, baseRate, mergedCommissions);
  };

  // Open Add/Edit Doctor Modal
  const handleOpenDoctorModal = (doc?: Doctor) => {
    if (doc) {
      setEditingDoctor(doc);
      setDoctorForm({
        name: doc.name,
        phone: doc.phone || "",
        email: doc.email || "",
        specialty: doc.specialty || "",
        clinic_hospital: doc.clinic_hospital || "",
        address: doc.address || "",
        default_commission_percent: doc.default_commission_percent.toString(),
      });
    } else {
      setEditingDoctor(null);
      setDoctorForm({
        name: "",
        phone: "",
        email: "",
        specialty: "",
        clinic_hospital: "",
        address: "",
        default_commission_percent: globalDefaultRate > 0 ? globalDefaultRate.toString() : "0",
      });
    }
    setIsDoctorModalOpen(true);
  };

  // Submit Doctor Form
  const handleSaveDoctorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name.trim()) {
      toast.error("Missing Name", "Doctor name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: doctorForm.name.trim(),
        phone: doctorForm.phone.trim() || null,
        email: doctorForm.email.trim() || null,
        specialty: doctorForm.specialty.trim() || null,
        clinic_hospital: doctorForm.clinic_hospital.trim() || null,
        address: doctorForm.address.trim() || null,
        default_commission_percent: parseFloat(doctorForm.default_commission_percent) || 0,
      };

      if (editingDoctor && editingDoctor.is_registered) {
        const res = await fetchFromLaravel(`/doctors/${editingDoctor.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (res && res.success) {
          toast.success("Updated", "Doctor profile updated successfully.");
          setIsDoctorModalOpen(false);
          loadInitialData();
        } else {
          toast.error("Error", res?.message || "Failed to update doctor.");
        }
      } else {
        const res = await fetchFromLaravel("/doctors", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res && res.success) {
          toast.success("Created", "Doctor registered successfully.");
          setIsDoctorModalOpen(false);
          loadInitialData();
        } else {
          toast.error("Error", res?.message || "Failed to create doctor.");
        }
      }
    } catch (err: any) {
      console.error("Save doctor error:", err);
      toast.error("Error", err.message || "Failed to save doctor.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete doctor
  const handleDeleteDoctor = async (doc: Doctor) => {
    if (!doc.is_registered) {
      toast.info("Historical Record", "This doctor was auto-detected from past patient records and cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${doc.name} from the registered directory?`)) {
      return;
    }

    try {
      const res = await fetchFromLaravel(`/doctors/${doc.id}`, {
        method: "DELETE",
      });
      if (res && res.success) {
        toast.success("Removed", `${doc.name} removed from doctor directory.`);
        loadInitialData();
      } else {
        toast.error("Error", res?.message || "Failed to remove doctor.");
      }
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to delete doctor.");
    }
  };

  const selectedDoctorObj = useMemo(() => {
    return doctors.find((d) => d.id === selectedTarget) || null;
  }, [doctors, selectedTarget]);

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-fade-in pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3.5">
          <Link href="/dashboard/doctors">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border hover:bg-muted/80 shrink-0 cursor-pointer"
              title="Back to Overview"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Manage Doctors & Discounts
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Commission Matrix
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Set global commission rules or customize test-wise discounts per clinician
            </p>
          </div>
        </div>

        {/* Tab Switcher & SINGLE Add Doctor Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/80">
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Test Commission Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Doctor Directory ({doctors.length})
            </button>
          </div>

          {/* ONLY ONE Single Add Doctor Button on the page */}
          <Button
            size="sm"
            onClick={() => handleOpenDoctorModal()}
            className="gap-1.5 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Doctor</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: TEST COMMISSION & DISCOUNT MATRIX
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Target Selector Banner */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Select Target Clinician
                </Label>
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <select
                    value={selectedTarget}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="bg-background border border-border/80 rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary shadow-xs min-w-[280px] cursor-pointer"
                  >
                    <option value="GLOBAL">🌐 All Doctors (Global Base Rate)</option>
                    <optgroup label="Specific Doctors (Custom Overrides)">
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.clinic_hospital ? `(${d.clinic_hospital})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {selectedTarget === "GLOBAL"
                      ? "Setting baseline rules applied to all clinicians across your laboratory."
                      : `Setting custom rates specifically for ${selectedDoctorObj?.name}.`}
                  </span>
                </div>
              </div>

              {/* Base Default Commission Input */}
              <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/70 shrink-0 flex-wrap sm:flex-nowrap">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-foreground block">
                    {selectedTarget === "GLOBAL" ? "Global Default Rate" : "Doctor Base Rate"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Applied on tests without specific overrides
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-20 sm:w-24">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={selectedTarget === "GLOBAL" ? globalDefaultRate : doctorDefaultRate}
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        if (selectedTarget === "GLOBAL") setGlobalDefaultRate(v);
                        else setDoctorDefaultRate(v);
                      }}
                      className="h-9 pr-6 text-right font-mono font-bold text-xs bg-background border-border/80 rounded-xl"
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveCommissions(selectedTarget, selectedTarget === "GLOBAL" ? globalDefaultRate : doctorDefaultRate, activeCommissions)}
                    disabled={isSaving}
                    className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer shrink-0 shadow-xs"
                    title="Save base rate"
                  >
                    Save Rate
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Matrix Toolbar */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setMatrixPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All Departments ({tests.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setMatrixPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search and Bulk Apply */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search test by name or code (e.g. CBC, Lipid, Blood Sugar)..."
                  value={testSearch}
                  onChange={(e) => {
                    setTestSearch(e.target.value);
                    setMatrixPage(1);
                  }}
                  className="pl-8.5 pr-8 h-9 text-xs rounded-xl bg-background border-border/80"
                />
                {testSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setTestSearch("");
                      setMatrixPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Bulk Quick Apply */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-muted-foreground hidden md:inline shrink-0">
                  Bulk apply:
                </span>
                <div className="relative w-20 sm:w-24 shrink-0">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="%"
                    value={bulkPercentInput}
                    onChange={(e) => setBulkPercentInput(e.target.value)}
                    className="h-9 pr-6 text-right text-xs font-mono font-bold bg-background border-border/80 rounded-xl"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkApply}
                  disabled={isSaving}
                  className="h-9 px-3.5 sm:px-4 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap transition-all flex-1 sm:flex-initial"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Apply to Visible ({filteredTests.length})</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Test Matrix Table */}
          <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Diagnostic Tests & Commission Rate
                </h3>
                <p className="text-xs text-muted-foreground">
                  Enter custom percentages to override baseline rates for individual tests
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Per page:</span>
                <select
                  value={matrixPageSize}
                  onChange={(e) => {
                    setMatrixPageSize(Number(e.target.value));
                    setMatrixPage(1);
                  }}
                  className="bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-semibold text-foreground outline-none cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="text-xs font-mono font-semibold text-muted-foreground">
                  Total {filteredTests.length} Tests
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4 sm:px-6">Test Code & Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Standard Price</th>
                    <th className="py-2.5 px-4 text-center w-36">Commission / Disc. %</th>
                    <th className="py-2.5 px-3 text-right">Doctor Cut</th>
                    <th className="py-2.5 px-3 text-right">Lab Share</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-4 sm:px-6">
                          <Skeleton className="h-4 w-40 rounded mb-1" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <Skeleton className="h-4 w-24 rounded" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Skeleton className="h-4 w-16 rounded ml-auto" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Skeleton className="h-7 w-24 rounded mx-auto" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Skeleton className="h-4 w-14 rounded ml-auto" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Skeleton className="h-4 w-14 rounded ml-auto" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Skeleton className="h-6 w-12 rounded mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedTests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Layers className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-sm">No tests match your filter</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTests.map((test) => {
                      const hasOverride = activeCommissions[test.id] !== undefined;
                      const baseRate = selectedTarget === "GLOBAL" ? globalDefaultRate : doctorDefaultRate;
                      const effectiveRate = hasOverride ? activeCommissions[test.id] : baseRate;
                      const price = test.price || 0;
                      const doctorCut = round((price * effectiveRate) / 100);
                      const labShare = round(price - doctorCut);

                      return (
                        <tr
                          key={test.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            hasOverride ? "bg-primary/[0.02]" : ""
                          }`}
                        >
                          {/* Test Code & Name */}
                          <td className="py-3 px-4 sm:px-6">
                            <span className="font-bold text-foreground block">{test.name}</span>
                            {test.test_code && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Code: {test.test_code}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-muted text-muted-foreground">
                              {test.category || "General"}
                            </span>
                          </td>

                          {/* Standard Price */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                            ₹{price.toFixed(2)}
                          </td>

                          {/* Commission Rate Input */}
                          <td className="py-3 px-4 text-center">
                            <div className="relative inline-block w-28">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                placeholder={`${baseRate}% (default)`}
                                value={hasOverride ? activeCommissions[test.id] : ""}
                                onChange={(e) => handleTestCommissionChange(test.id, e.target.value)}
                                className={`h-8 text-right pr-6 font-mono font-bold text-xs rounded-lg ${
                                  hasOverride
                                    ? "border-primary/60 bg-primary/5 text-primary"
                                    : "border-border/70 bg-background text-muted-foreground"
                                }`}
                              />
                              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            </div>
                          </td>

                          {/* Doctor Cut */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            ₹{doctorCut.toFixed(2)}
                          </td>

                          {/* Lab Share */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{labShare.toFixed(2)}
                          </td>

                          {/* Clear action */}
                          <td className="py-3 px-3 text-center">
                            {hasOverride ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleClearTestCommission(test.id)}
                                className="h-7 px-2 text-[10.5px] text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md cursor-pointer"
                                title="Reset to base rate"
                              >
                                Reset
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic">Default</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Tests */}
            {!isLoading && filteredTests.length > 0 && (
              <div className="p-3.5 px-4 sm:px-6 border-t border-border/70 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{(matrixPage - 1) * matrixPageSize + 1}</span> to{" "}
                  <span className="font-bold text-foreground">
                    {Math.min(matrixPage * matrixPageSize, filteredTests.length)}
                  </span>{" "}
                  of <span className="font-bold text-foreground">{filteredTests.length}</span> tests
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                    disabled={matrixPage <= 1}
                    className="h-8 px-2.5 rounded-lg border-border text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>

                  <div className="px-2 text-xs font-mono font-bold text-foreground">
                    {matrixPage} / {totalMatrixPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMatrixPage((p) => Math.min(totalMatrixPages, p + 1))}
                    disabled={matrixPage >= totalMatrixPages}
                    className="h-8 px-2.5 rounded-lg border-border text-xs cursor-pointer"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: DOCTOR DIRECTORY
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Clean Card Header WITHOUT duplicate Add Doctor button */}
            <div className="p-4 sm:px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Registered Clinicians & Referral Partners
                </h3>
                <p className="text-xs text-muted-foreground">
                  Manage doctor profiles, clinic details, and default percentage splits
                </p>
              </div>

              {/* Dedicated Search bar for Doctor Directory */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search doctor by name, clinic, specialty..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pl-8.5 pr-8 h-8.5 text-xs rounded-xl bg-background border-border/80"
                />
                {doctorSearch && (
                  <button
                    type="button"
                    onClick={() => setDoctorSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4 sm:px-6">Doctor Name</th>
                    <th className="py-2.5 px-3">Specialty</th>
                    <th className="py-2.5 px-3">Clinic / Hospital</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3 text-center">Base Comm. %</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-4 sm:px-6">
                          <Skeleton className="h-4 w-36 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <Skeleton className="h-4 w-28 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <Skeleton className="h-4 w-24 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <Skeleton className="h-4 w-20 rounded" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Skeleton className="h-5 w-12 rounded mx-auto" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Skeleton className="h-5 w-14 rounded-full mx-auto" />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Skeleton className="h-7 w-24 rounded mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-sm">No doctors match your search</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{doc.name}</span>
                            {!doc.is_registered && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                                Historical
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {doc.specialty || "General Physician"}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {doc.clinic_hospital || "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {doc.phone || "—"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                              {doc.default_commission_percent}%
                            </span>
                            {doc.is_using_global_rate && (
                              <span className="text-[9px] text-muted-foreground mt-0.5">Global</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTarget(doc.id);
                                setDoctorDefaultRate(doc.default_commission_percent);
                                setDoctorTestCommissions(doc.test_commissions || {});
                                setActiveTab("matrix");
                              }}
                              className="h-7 px-2 text-[11px] font-semibold rounded-lg border-border hover:bg-muted cursor-pointer"
                              title="Configure Test Discounts for this Doctor"
                            >
                              <SlidersHorizontal className="h-3 w-3 mr-1 text-primary" />
                              <span>Set Rates</span>
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDoctorModal(doc)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {doc.is_registered && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteDoctor(doc)}
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                title="Delete Doctor"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD / EDIT DOCTOR MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isDoctorModalOpen} onOpenChange={setIsDoctorModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border/80 shadow-2xl p-6 bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <span>{editingDoctor ? "Edit Doctor Profile" : "Register Referring Doctor"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add doctor demographics and baseline commission percentage
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDoctorProfile} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold text-foreground">Doctor Full Name *</Label>
              <Input
                type="text"
                required
                placeholder="e.g. Dr. Rajesh Sharma"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-foreground">Specialty</Label>
                <Input
                  type="text"
                  placeholder="e.g. Cardiologist"
                  value={doctorForm.specialty}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Clinic / Hospital</Label>
                <Input
                  type="text"
                  placeholder="e.g. Apollo Clinic"
                  value={doctorForm.clinic_hospital}
                  onChange={(e) => setDoctorForm({ ...doctorForm, clinic_hospital: e.target.value })}
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-foreground">Phone Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Base Commission %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={doctorForm.default_commission_percent}
                  onChange={(e) => setDoctorForm({ ...doctorForm, default_commission_percent: e.target.value })}
                  className="mt-1 h-9 text-xs rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">Email (Optional)</Label>
              <Input
                type="email"
                placeholder="doctor@example.com"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">Address / Notes</Label>
              <Input
                type="text"
                placeholder="Clinic address or chamber timing"
                value={doctorForm.address}
                onChange={(e) => setDoctorForm({ ...doctorForm, address: e.target.value })}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDoctorModalOpen(false)}
                className="rounded-xl border-border text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save Doctor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function round(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
