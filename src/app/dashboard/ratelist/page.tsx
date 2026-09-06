"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search, RefreshCw, IndianRupee, Tag, Check, Filter,
  ChevronLeft, ChevronRight, Edit3, ArrowUpDown, ShieldCheck,
  Building2, Layers, AlertCircle, Printer, Sparkles, X, CheckCircle2,
  Lock, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";

interface RateTest {
  id: string;
  test_code?: string;
  testCode?: string;
  name: string;
  category?: string;
  price?: number;
  b2b_price?: number;
  b2bPrice?: number;
  type?: string;
  method?: string;
  sort_order?: number;
}

export default function RateListPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<RateTest[]>([]);
  const [user, setUser] = useState<any>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortField, setSortField] = useState<"name" | "price" | "b2bPrice">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Admin Edit Modal
  const [editingTest, setEditingTest] = useState<RateTest | null>(null);
  const [editMrp, setEditMrp] = useState<string>("");
  const [editB2b, setEditB2b] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    loadTests();
  }, []);

  const isB2B = user?.role === "B2B";
  const isAdmin = !isB2B; // Admin, Pathologist, Operator, Super Admin

  const loadTests = async (forceRefresh?: boolean) => {
    setLoading(true);
    try {
      const res = await fetchFromLaravel("/tests", { skipCache: forceRefresh === true }).catch(() => []);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTests(list);
    } catch (err) {
      console.error("Failed to load test rates:", err);
      toast.error("Load Error", "Could not fetch laboratory rate list.");
    } finally {
      setLoading(false);
    }
  };

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.category && t.category.trim() !== "") {
        set.add(t.category.trim());
      }
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [tests]);

  // Filter & Sort
  const filteredTests = useMemo(() => {
    const list = tests.filter((t) => {
      const q = search.toLowerCase();
      const code = (t.test_code || t.testCode || "").toLowerCase();
      const name = (t.name || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      const matchesQuery = !search || code.includes(q) || name.includes(q) || cat.includes(q);
      const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });

    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortField === "price") {
        valA = Number(a.price || 0);
        valB = Number(b.price || 0);
      } else if (sortField === "b2bPrice") {
        valA = Number(a.b2b_price ?? a.b2bPrice ?? 0);
        valB = Number(b.b2b_price ?? b.b2bPrice ?? 0);
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [tests, search, selectedCategory, sortField, sortOrder]);

  // Pagination slice
  const totalItems = filteredTests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  // Overall Stats
  const testsWithB2B = useMemo(() => {
    return tests.filter((t) => {
      const b2b = Number(t.b2b_price ?? t.b2bPrice ?? 0);
      return b2b > 0;
    }).length;
  }, [tests]);

  const avgDiscount = useMemo(() => {
    let totalDisc = 0;
    let count = 0;
    tests.forEach((t) => {
      const mrp = Number(t.price || 0);
      const b2b = Number(t.b2b_price ?? t.b2bPrice ?? 0);
      if (mrp > 0 && b2b > 0 && mrp >= b2b) {
        totalDisc += ((mrp - b2b) / mrp) * 100;
        count++;
      }
    });
    return count > 0 ? Math.round(totalDisc / count) : 0;
  }, [tests]);

  // Open Edit Modal
  const handleOpenEdit = (test: RateTest) => {
    if (!isAdmin) return;
    setEditingTest(test);
    setEditMrp((test.price ?? 0).toString());
    const existingB2b = test.b2b_price ?? test.b2bPrice;
    setEditB2b(existingB2b !== undefined && existingB2b !== null ? existingB2b.toString() : "");
  };

  // Quick Preset Handlers
  const handleApplyPreset = (percentOfMrp: number) => {
    const mrpNum = parseFloat(editMrp) || 0;
    if (mrpNum <= 0) return;
    const calc = Math.round((mrpNum * percentOfMrp) / 100);
    setEditB2b(calc.toString());
  };

  // Save Rate Update (Admin only)
  const handleSaveRate = async () => {
    if (!editingTest) return;
    const mrpNum = parseFloat(editMrp);
    const b2bNum = editB2b.trim() === "" ? null : parseFloat(editB2b);

    if (isNaN(mrpNum) || mrpNum < 0) {
      toast.error("Invalid MRP", "Please enter a valid MRP price greater than or equal to 0.");
      return;
    }

    if (b2bNum !== null && (isNaN(b2bNum) || b2bNum < 0)) {
      toast.error("Invalid B2B Price", "B2B rate must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const testIdentifier = editingTest.id || editingTest.test_code || editingTest.testCode;
      await fetchFromLaravel(`/tests/${testIdentifier}`, {
        method: "PUT",
        body: JSON.stringify({
          price: mrpNum,
          b2b_price: b2bNum,
          b2bPrice: b2bNum,
        }),
      });

      // Update local state
      setTests((prev) =>
        prev.map((t) =>
          t.id === editingTest.id
            ? { ...t, price: mrpNum, b2b_price: b2bNum ?? undefined, b2bPrice: b2bNum ?? undefined }
            : t
        )
      );

      toast.success("Rates Updated", `Pricing for ${editingTest.name} has been updated successfully.`);
      setEditingTest(null);
    } catch (err: any) {
      console.error("Save rate error:", err);
      toast.error("Update Failed", err.message || "Failed to update test rates. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTariff = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Page Header (Clean, No Card) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-primary" />
            <span>Rate List</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
              {totalItems} Tests
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => loadTests(true)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-2xs hover:bg-muted/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh Rate List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Stat Highlights (Admin only) ── */}
      {!isB2B && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Total Catalogue Tests</p>
              <p className="text-2xl font-extrabold text-foreground font-mono mt-0.5">{tests.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Tests with B2B Rates</p>
              <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{testsWithB2B}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Avg. Wholesale Margin</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{avgDiscount}%</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Percent className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* ── Controls Deck (Search, Category Filter, Page Size) ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search test by name, code or category..."
            className="pl-10 h-10 rounded-xl bg-card border-border/80 text-xs font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 shrink-0">
            <Filter className="h-3 w-3" /> Category:
          </span>
          {categories.slice(0, 7).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : paginatedRows.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Layers className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No matching tests found.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No diagnostic investigation matched your search query "{search}".
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-5 w-16">#</th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground" onClick={() => {
                    if (sortField === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortField("name"); setSortOrder("asc"); }
                  }}>
                    <div className="flex items-center gap-1.5">
                      <span>Test Investigation</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground text-right" onClick={() => {
                    if (sortField === "price") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortField("price"); setSortOrder("asc"); }
                  }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>MRP Rate (₹)</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground text-right" onClick={() => {
                    if (sortField === "b2bPrice") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortField("b2bPrice"); setSortOrder("asc"); }
                  }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-purple-600 dark:text-purple-400 font-extrabold">B2B Rate (₹)</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">B2B Margin %</th>
                  {isAdmin && <th className="py-3.5 px-5 text-right print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRows.map((t, idx) => {
                  const mrp = Number(t.price || 0);
                  const b2b = Number(t.b2b_price ?? t.b2bPrice ?? 0);
                  const hasB2B = b2b > 0;
                  const discountPct = mrp > 0 && b2b > 0 && mrp >= b2b
                    ? Math.round(((mrp - b2b) / mrp) * 100)
                    : null;
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={t.id || idx} className="hover:bg-muted/20 transition-colors">
                      {/* # Number */}
                      <td className="py-4 px-5 text-muted-foreground font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      {/* Test Name & Code */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="font-bold text-foreground text-[13px]">{t.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {t.test_code || t.testCode || "TEST-AUTO"}
                              </span>
                              {t.method && (
                                <span className="text-[10px] text-muted-foreground/80 italic">
                                  · {t.method}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                          {t.category || "General"}
                        </span>
                      </td>

                      {/* MRP */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-foreground text-sm">
                        ₹{mrp.toLocaleString("en-IN")}
                      </td>

                      {/* B2B Price */}
                      <td className="py-4 px-4 text-right">
                        {hasB2B ? (
                          <span className="font-mono font-extrabold text-sm text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 inline-block">
                            ₹{b2b.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            {isB2B ? "Standard MRP" : "Not Set"}
                          </span>
                        )}
                      </td>

                      {/* B2B Margin */}
                      <td className="py-4 px-4 text-center">
                        {discountPct !== null ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {discountPct}% Off
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Admin Action */}
                      {isAdmin && (
                        <td className="py-4 px-5 text-right print:hidden">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(t)}
                            className="h-8 px-2.5 rounded-lg text-primary hover:bg-primary/10 font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit Rate</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination Footer ── */}
        <div className="p-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground print:hidden">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-muted border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>of {totalItems} total tests</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 rounded-lg cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Edit Rate Dialog ── */}
      <Dialog open={!!editingTest} onOpenChange={(open) => { if (!open) setEditingTest(null); }}>
        <DialogContent className="sm:max-w-md bg-card border-border p-6 rounded-2xl shadow-elevated">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20">
                Rate Configuration
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {editingTest?.test_code || editingTest?.testCode || "TEST"}
              </span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-foreground">
              {editingTest?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set patient retail MRP and contracted B2B wholesale rate for this diagnostic test.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* MRP Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Standard MRP Rate (₹)</span>
                <span className="text-[10px] text-muted-foreground">Retail Patient Price</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editMrp}
                  onChange={(e) => setEditMrp(e.target.value)}
                  placeholder="e.g. 500"
                  className="pl-10 font-mono font-bold text-sm h-11 rounded-xl"
                />
              </div>
            </div>

            {/* B2B Price Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                <span>B2B Partner Wholesale Rate (₹)</span>
                <span className="text-[10px] text-purple-600/80">Contracted Rate</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editB2b}
                  onChange={(e) => setEditB2b(e.target.value)}
                  placeholder="e.g. 200 (Leave empty for standard MRP)"
                  className="pl-10 font-mono font-bold text-sm h-11 rounded-xl border-purple-500/40 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Quick B2B Margin Preset Chips */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Wholesale Presets (% of MRP):
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[30, 40, 50, 60].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyPreset(pct)}
                    className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-mono font-bold border border-border transition-colors cursor-pointer"
                  >
                    {pct}% of MRP
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Calculation Preview */}
            {parseFloat(editMrp) > 0 && parseFloat(editB2b) > 0 && (
              <div className="p-3 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Partner Discount / Margin:</span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                  {Math.round(((parseFloat(editMrp) - parseFloat(editB2b)) / parseFloat(editMrp)) * 100)}% Discount
                  (₹{(parseFloat(editMrp) - parseFloat(editB2b)).toFixed(0)} savings)
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingTest(null)}
              disabled={saving}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRate}
              disabled={saving}
              className="rounded-xl gradient-primary text-primary-foreground font-bold text-xs ring-inset-top"
            >
              {saving ? "Saving..." : "Save Rates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
