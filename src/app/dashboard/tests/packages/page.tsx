"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Boxes, Plus, Search, Check, Edit2, Trash2, Tag, IndianRupee,
  FlaskConical, CheckCircle2, AlertCircle, X, ChevronRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, RefreshCw, Sparkles,
  Layers, FileSpreadsheet, Percent, Info
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import {
  LabPackage,
  PackageTestItem,
  getStoredPackages,
  addPackage,
  updatePackage,
  deletePackage
} from "@/lib/packages";

export default function PackagesPage() {
  const toast = useToast();
  const [packages, setPackages] = useState<LabPackage[]>([]);
  const [allTests, setAllTests] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [search, setSearch] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inline Form State (NO DIALOG / MODAL)
  const [isInlineFormOpen, setIsInlineFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Form Fields
  const [packageName, setPackageName] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageDesc, setPackageDesc] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // Test Selection Filter in Form
  const [testSearch, setTestSearch] = useState("");
  const [testCategoryFilter, setTestCategoryFilter] = useState("ALL");

  useEffect(() => {
    loadPackages();
    loadTests();
  }, []);

  const loadPackages = () => {
    const list = getStoredPackages();
    setPackages(list);
  };

  const loadTests = async () => {
    try {
      setLoadingTests(true);
      const data = await fetchFromLaravel("/tests");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setAllTests(list);
    } catch (err) {
      console.error("Error loading tests for packages:", err);
    } finally {
      setLoadingTests(false);
    }
  };

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  // Handle open inline form for creating
  const handleOpenCreate = () => {
    setEditingPackageId(null);
    setPackageName("");
    setPackageCode(`PKG-${Math.floor(100 + Math.random() * 900)}`);
    setPackagePrice("");
    setPackageDesc("");
    setSelectedTestIds([]);
    setTestSearch("");
    setTestCategoryFilter("ALL");
    setIsInlineFormOpen(true);
  };

  // Handle open inline form for editing
  const handleOpenEdit = (pkg: LabPackage) => {
    setEditingPackageId(pkg.id);
    setPackageName(pkg.name);
    setPackageCode(pkg.code);
    setPackagePrice(String(pkg.price));
    setPackageDesc(pkg.description || "");
    setSelectedTestIds(pkg.testIds || pkg.tests.map(t => t.id));
    setTestSearch("");
    setTestCategoryFilter("ALL");
    setIsInlineFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle close inline form
  const handleCancelForm = () => {
    setIsInlineFormOpen(false);
    setEditingPackageId(null);
  };

  // Toggle test in selection
  const handleToggleTest = (testId: string) => {
    setSelectedTestIds(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  // Select all visible tests
  const handleSelectAllVisible = (visibleTestIds: string[]) => {
    const allSelected = visibleTestIds.every(id => selectedTestIds.includes(id));
    if (allSelected) {
      setSelectedTestIds(prev => prev.filter(id => !visibleTestIds.includes(id)));
    } else {
      setSelectedTestIds(prev => Array.from(new Set([...prev, ...visibleTestIds])));
    }
  };

  // Calculate sum of individual tests
  const selectedTestObjects: PackageTestItem[] = useMemo(() => {
    return allTests
      .filter(t => selectedTestIds.includes(t.id))
      .map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        price: Number(t.price || 0),
        code: t.code || t.testCode || t.test_code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`,
      }));
  }, [allTests, selectedTestIds]);

  const regularSumTotal = useMemo(() => {
    return selectedTestObjects.reduce((sum, t) => sum + (t.price || 0), 0);
  }, [selectedTestObjects]);

  const parsedPackagePrice = parseFloat(packagePrice) || 0;
  const savingsAmount = Math.max(0, regularSumTotal - parsedPackagePrice);
  const savingsPercent = regularSumTotal > 0 ? Math.round((savingsAmount / regularSumTotal) * 100) : 0;

  // Categories for test selector
  const testCategories = useMemo(() => {
    const cats = Array.from(new Set(allTests.map(t => t.category).filter(Boolean)));
    return ["ALL", ...cats];
  }, [allTests]);

  // Filtered tests in inline form
  const filteredTestsForSelection = useMemo(() => {
    const q = testSearch.toLowerCase().trim();
    return allTests.filter(t => {
      const matchCat = testCategoryFilter === "ALL" || (t.category || "").toLowerCase() === testCategoryFilter.toLowerCase();
      const code = (t.code || t.testCode || t.test_code || "").toLowerCase();
      const name = (t.name || "").toLowerCase();
      const matchSearch = !q || name.includes(q) || code.includes(q) || (t.category || "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allTests, testSearch, testCategoryFilter]);

  // Save or Update Package
  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) {
      toast.error("Validation Error", "Please enter a valid package name.");
      return;
    }
    if (!packageCode.trim()) {
      toast.error("Validation Error", "Please enter a package code.");
      return;
    }
    if (!parsedPackagePrice || parsedPackagePrice <= 0) {
      toast.error("Validation Error", "Please specify a positive package price.");
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error("Validation Error", "Please select at least one laboratory test for this package.");
      return;
    }

    if (editingPackageId) {
      updatePackage(editingPackageId, {
        name: packageName.trim(),
        code: packageCode.trim().toUpperCase(),
        price: parsedPackagePrice,
        description: packageDesc.trim(),
        testIds: selectedTestIds,
        tests: selectedTestObjects,
      });
      toast.success("Updated", `Package ${packageName} updated successfully.`);
    } else {
      addPackage({
        name: packageName.trim(),
        code: packageCode.trim().toUpperCase(),
        price: parsedPackagePrice,
        description: packageDesc.trim(),
        testIds: selectedTestIds,
        tests: selectedTestObjects,
      });
      toast.success("Created", `Package ${packageName} created successfully.`);
    }

    loadPackages();
    setIsInlineFormOpen(false);
    setEditingPackageId(null);
  };

  // Delete Package
  const handleDeletePackage = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the package "${name}"?`)) {
      deletePackage(id);
      toast.success("Deleted", `Package ${name} was removed.`);
      loadPackages();
    }
  };

  // Filtered packages for display table
  const filteredPackages = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return packages;
    return packages.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [packages, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedPackages = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredPackages.slice(start, start + pageSize);
  }, [filteredPackages, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-foreground">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Clinical Bundles & Profiles
            </p>
          </div>
          <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Boxes className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
            <span>Diagnostic Packages</span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {packages.length} Configured
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create and manage comprehensive diagnostic health packages, bundle multiple laboratory investigations, and define special tariff rates.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadPackages}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-primary" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={isInlineFormOpen ? handleCancelForm : handleOpenCreate}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-md hover:-translate-y-px transition-all cursor-pointer ring-inset-top"
          >
            {isInlineFormOpen ? (
              <>
                <X className="h-4 w-4" />
                <span>Close Panel</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>New Package</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Inline Create / Edit Package Panel (NO DIALOG MODAL) ── */}
      {isInlineFormOpen && (
        <div className="bg-card border-2 border-primary/40 rounded-2xl p-4 sm:p-7 shadow-lg space-y-5 sm:space-y-6 animate-fade-in ring-4 ring-primary/5">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {editingPackageId ? "Edit Diagnostic Package" : "Create New Diagnostic Package"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Define package details, price, and select the constituent laboratory tests.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSavePackage} className="space-y-6">
            {/* Top 3 Primary Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Name */}
              <div className="sm:col-span-6 space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                  <span>Package Name</span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Citizen Health Profile, Comprehensive Full Body"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium transition-all shadow-2xs"
                />
              </div>

              {/* Code */}
              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                  <span>Package Code</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="PKG-101"
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value.toUpperCase())}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none uppercase transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Price */}
              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                  <span>Package Price (₹)</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="1499"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm font-mono font-bold text-primary placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-12 space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Description / Clinical Indication (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief note about target patients or clinical evaluation covered by this package…"
                  value={packageDesc}
                  onChange={(e) => setPackageDesc(e.target.value)}
                  className="w-full h-10 px-4 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary outline-none font-medium transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Price Telemetry Banner */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Selected Tests: </span>
                  <strong className="text-foreground font-mono">{selectedTestIds.length}</strong>
                </div>
                <span className="text-muted-foreground/40">|</span>
                <div>
                  <span className="text-muted-foreground">Sum of Retail MRP: </span>
                  <strong className="text-foreground font-mono">₹{regularSumTotal.toFixed(2)}</strong>
                </div>
                <span className="text-muted-foreground/40">|</span>
                <div>
                  <span className="text-muted-foreground">Package Tariff: </span>
                  <strong className="text-primary font-mono font-bold">₹{parsedPackagePrice.toFixed(2)}</strong>
                </div>
              </div>

              {savingsAmount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Percent className="h-3.5 w-3.5" />
                  <span>Patient Savings: ₹{savingsAmount.toFixed(0)} ({savingsPercent}% OFF)</span>
                </div>
              )}
            </div>

            {/* Test Selection Area */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <span>Select Constituent Laboratory Tests</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Check the tests to include in this package bundle.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectAllVisible(filteredTestsForSelection.map(t => t.id))}
                  className="text-xs font-bold text-primary hover:underline self-start sm:self-auto cursor-pointer"
                >
                  {filteredTestsForSelection.every(t => selectedTestIds.includes(t.id)) && filteredTestsForSelection.length > 0
                    ? "Deselect All Visible"
                    : "Select All Visible"}
                </button>
              </div>

              {/* Filter / Search for Tests */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search test name or test code…"
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-xs focus:border-primary outline-none"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 text-xs custom-scrollbar">
                  {testCategories.slice(0, 6).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTestCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                        testCategoryFilter === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Tests Grid */}
              <div className="max-h-80 overflow-y-auto border border-border/80 rounded-xl p-3 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 custom-scrollbar">
                {filteredTestsForSelection.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-muted-foreground text-xs">
                    No laboratory tests matched your filter.
                  </div>
                ) : (
                  filteredTestsForSelection.map(t => {
                    const isSelected = selectedTestIds.includes(t.id);
                    const code = t.code || t.testCode || t.test_code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTest(t.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition-all flex items-start justify-between gap-2 shadow-2xs ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/20"
                            : "bg-card border-border/80 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{t.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{t.category || "Pathology"}</p>
                            <span className="font-mono text-[9.5px] text-primary/80 font-semibold">{code}</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-foreground text-xs shrink-0">
                          ₹{Number(t.price || 0).toFixed(0)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md hover:-translate-y-px transition-all cursor-pointer ring-inset-top"
              >
                {editingPackageId ? "Update Package" : "Save Package"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search & Filter Ribbon for Packages Table ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/80 p-3 sm:p-3.5 rounded-xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search packages by package name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 h-9 bg-background border border-border rounded-lg text-xs placeholder:text-muted-foreground/60 focus:border-primary outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-medium shrink-0 flex items-center justify-between sm:justify-end">
          <span>Showing <strong className="text-foreground">{filteredPackages.length}</strong> packages</span>
        </div>
      </div>

      {/* ── Packages Data Container: Responsive Cards on Mobile & Data Table on Desktop ── */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
        
        {/* 1. Mobile & Tablet Card Grid View (< 768px) */}
        <div className="block md:hidden p-3 sm:p-4 bg-card">
          {paginatedPackages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Boxes className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-bold text-foreground text-sm">No diagnostic packages found</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs mx-auto">
                {search ? `No packages matching "${search}"` : "Click 'New Package' above to create your first package."}
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-3 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-md cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Package</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {paginatedPackages.map((pkg) => {
                const regularSum = (pkg.tests || []).reduce((acc, t) => acc + (t.price || 0), 0);
                const discount = Math.max(0, regularSum - pkg.price);
                const discountPct = regularSum > 0 ? Math.round((discount / regularSum) * 100) : 0;
                const testCount = pkg.tests?.length || pkg.testIds?.length || 0;

                return (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-xl border border-border/90 bg-card hover:border-primary/50 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      {/* Top Row: Code, Discount & Quick Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-md">
                            {pkg.code}
                          </span>
                          {discountPct > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {discountPct}% OFF
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">Standard</span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pkg)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Edit Package"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Delete Package"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Package Name & Description */}
                      <h3 className="font-bold text-foreground text-sm leading-snug">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {pkg.description}
                        </p>
                      )}
                    </div>

                    {/* Pricing Pill Banner */}
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Package Rate</p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="font-mono text-base font-extrabold text-primary">
                            ₹{pkg.price.toFixed(0)}
                          </span>
                          {regularSum > 0 && regularSum > pkg.price && (
                            <span className="font-mono text-xs text-muted-foreground line-through">
                              ₹{regularSum.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {discount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          Save ₹{discount.toFixed(0)}
                        </span>
                      )}
                    </div>

                    {/* Included Tests Summary & Badges */}
                    <div className="pt-2 border-t border-border/60 text-xs">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 text-muted-foreground">
                        <span className="font-semibold">Included Tests:</span>
                        <span className="font-bold text-foreground">{testCount} Tests</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(pkg.tests || []).slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[9.5px] font-medium bg-muted text-foreground/85 px-2 py-0.5 rounded truncate max-w-[130px]"
                          >
                            {t.name}
                          </span>
                        ))}
                        {testCount > 3 && (
                          <span className="text-[9.5px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            +{testCount - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Desktop Data Table (>= 768px) */}
        <div className="hidden md:block table-responsive-container">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-5 whitespace-nowrap">Package Code</th>
                <th className="py-3.5 px-4">Package Name</th>
                <th className="py-3.5 px-4">Included Tests</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Regular MRP</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Package Tariff</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Discount</th>
                <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {paginatedPackages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <Boxes className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground text-sm">No diagnostic packages found</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                      {search ? `No packages matching "${search}"` : "Click 'New Package' above to create your first package."}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer ring-inset-top"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create First Package</span>
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((pkg) => {
                  const regularSum = (pkg.tests || []).reduce((acc, t) => acc + (t.price || 0), 0);
                  const discount = Math.max(0, regularSum - pkg.price);
                  const discountPct = regularSum > 0 ? Math.round((discount / regularSum) * 100) : 0;

                  return (
                    <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
                          {pkg.code}
                        </span>
                      </td>

                      {/* Name & Desc */}
                      <td className="py-4 px-4">
                        <p className="font-bold text-foreground text-sm">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</p>
                        )}
                      </td>

                      {/* Included Tests */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(pkg.tests || []).slice(0, 3).map((t, idx) => (
                            <span key={idx} className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-foreground truncate max-w-[140px]">
                              {t.name}
                            </span>
                          ))}
                          {(pkg.tests?.length || 0) > 3 && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              +{(pkg.tests?.length || 0) - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Regular MRP */}
                      <td className="py-4 px-4 font-mono text-muted-foreground line-through whitespace-nowrap">
                        ₹{regularSum > 0 ? regularSum.toFixed(2) : "—"}
                      </td>

                      {/* Package Tariff */}
                      <td className="py-4 px-4 font-mono font-bold text-primary text-sm whitespace-nowrap">
                        ₹{pkg.price.toFixed(2)}
                      </td>

                      {/* Discount % */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {discountPct > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {discountPct}% OFF
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Standard</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pkg)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Edit Package"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Delete Package"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Responsive Pagination Bar ── */}
        {filteredPackages.length > 0 && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-center sm:text-left">
              <span>Showing</span>
              <span className="font-bold text-foreground">
                {(safeCurrentPage - 1) * pageSize + 1}
              </span>
              <span>to</span>
              <span className="font-bold text-foreground">
                {Math.min(safeCurrentPage * pageSize, filteredPackages.length)}
              </span>
              <span>of</span>
              <span className="font-bold text-foreground">{filteredPackages.length}</span>
              <span>packages</span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 rounded-lg bg-card border border-border text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-8 px-2 sm:px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1 px-0.5 sm:px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && safeCurrentPage > 3) {
                      pageNum = safeCurrentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                          safeCurrentPage === pageNum
                            ? "gradient-primary text-primary-foreground shadow-xs ring-1 ring-primary/30"
                            : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 px-2 sm:px-2.5 rounded-lg border border-border bg-card text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
