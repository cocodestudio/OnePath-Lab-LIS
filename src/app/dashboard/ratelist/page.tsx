"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, RefreshCw, IndianRupee, Filter,
  ChevronLeft, ChevronRight, Edit3, ArrowUpDown,
  Layers, X, CheckCircle2, Percent, Sparkles,
  Briefcase, Building2
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
  b2b_price_high?: number;
  b2bPriceHigh?: number;
  b2b_price_medium?: number;
  b2bPriceMedium?: number;
  b2b_price_low?: number;
  b2bPriceLow?: number;
  type?: string;
  method?: string;
  sort_order?: number;
}

interface B2BPartner {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  rate_tier?: string;
  rateTier?: string;
}

type TierFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";

export default function RateListPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<RateTest[]>([]);
  const [user, setUser] = useState<any>(null);

  // B2B Partner Selection (Admin only)
  const [partners, setPartners] = useState<B2BPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("ALL");
  const [updatingPartnerTier, setUpdatingPartnerTier] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedTier, setSelectedTier] = useState<TierFilter>("ALL");
  const [sortField, setSortField] = useState<"name" | "price" | "b2bLow" | "b2bMed" | "b2bHigh">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Admin Edit Modal
  const [editingTest, setEditingTest] = useState<RateTest | null>(null);
  const [editMrp, setEditMrp] = useState<string>("");
  const [editB2bLow, setEditB2bLow] = useState<string>("");
  const [editB2bMed, setEditB2bMed] = useState<string>("");
  const [editB2bHigh, setEditB2bHigh] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    loadTests();

    // If Admin/Staff, load B2B partner accounts
    if (u?.role !== "B2B") {
      fetchFromLaravel("/collection-centers")
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.data || []);
          const b2bList = list.filter((c: any) => c.role === "B2B");
          setPartners(b2bList);
        })
        .catch(() => {});
    }
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
      } else if (sortField === "b2bLow") {
        valA = Number(a.b2b_price_low ?? a.b2bPriceLow ?? 0);
        valB = Number(b.b2b_price_low ?? b.b2bPriceLow ?? 0);
      } else if (sortField === "b2bMed") {
        valA = Number(a.b2b_price_medium ?? a.b2bPriceMedium ?? a.b2b_price ?? a.b2bPrice ?? 0);
        valB = Number(b.b2b_price_medium ?? b.b2bPriceMedium ?? b.b2b_price ?? b.b2bPrice ?? 0);
      } else if (sortField === "b2bHigh") {
        valA = Number(a.b2b_price_high ?? a.b2bPriceHigh ?? 0);
        valB = Number(b.b2b_price_high ?? b.b2bPriceHigh ?? 0);
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

  // Open Edit Modal
  const handleOpenEdit = (test: RateTest) => {
    if (!isAdmin) return;
    setEditingTest(test);
    setEditMrp((test.price ?? 0).toString());

    // Low
    const low = test.b2b_price_low ?? test.b2bPriceLow;
    setEditB2bLow(low !== undefined && low !== null ? low.toString() : "");

    // Medium (fall back to b2b_price if medium not explicitly set)
    const med = test.b2b_price_medium ?? test.b2bPriceMedium ?? test.b2b_price ?? test.b2bPrice;
    setEditB2bMed(med !== undefined && med !== null ? med.toString() : "");

    // High
    const high = test.b2b_price_high ?? test.b2bPriceHigh;
    setEditB2bHigh(high !== undefined && high !== null ? high.toString() : "");
  };

  // 1-Click Multi-Tier Presets (sets Low, Medium, High at once)
  const handleApplyMultiPreset = (lowPct: number, medPct: number, highPct: number) => {
    const mrpNum = parseFloat(editMrp) || 0;
    if (mrpNum <= 0) return;
    setEditB2bLow(Math.round((mrpNum * lowPct) / 100).toString());
    setEditB2bMed(Math.round((mrpNum * medPct) / 100).toString());
    setEditB2bHigh(Math.round((mrpNum * highPct) / 100).toString());
  };

  // Save Rate Update (Admin only)
  const handleSaveRate = async () => {
    if (!editingTest) return;
    const mrpNum = parseFloat(editMrp);
    const lowNum = editB2bLow.trim() === "" ? null : parseFloat(editB2bLow);
    const medNum = editB2bMed.trim() === "" ? null : parseFloat(editB2bMed);
    const highNum = editB2bHigh.trim() === "" ? null : parseFloat(editB2bHigh);

    if (isNaN(mrpNum) || mrpNum < 0) {
      toast.error("Invalid MRP", "Please enter a valid MRP price greater than or equal to 0.");
      return;
    }

    if (lowNum !== null && (isNaN(lowNum) || lowNum < 0)) {
      toast.error("Invalid Low Rate", "Low tier rate must be a non-negative number.");
      return;
    }
    if (medNum !== null && (isNaN(medNum) || medNum < 0)) {
      toast.error("Invalid Medium Rate", "Medium tier rate must be a non-negative number.");
      return;
    }
    if (highNum !== null && (isNaN(highNum) || highNum < 0)) {
      toast.error("Invalid High Rate", "High tier rate must be a non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const testIdentifier = editingTest.id || editingTest.test_code || editingTest.testCode;
      await fetchFromLaravel(`/tests/${testIdentifier}`, {
        method: "PUT",
        body: JSON.stringify({
          price: mrpNum,
          b2b_price: medNum,
          b2bPrice: medNum,
          b2b_price_low: lowNum,
          b2bPriceLow: lowNum,
          b2b_price_medium: medNum,
          b2bPriceMedium: medNum,
          b2b_price_high: highNum,
          b2bPriceHigh: highNum,
        }),
      });

      // Update local state
      setTests((prev) =>
        prev.map((t) =>
          t.id === editingTest.id
            ? {
                ...t,
                price: mrpNum,
                b2b_price: medNum ?? undefined,
                b2bPrice: medNum ?? undefined,
                b2b_price_low: lowNum ?? undefined,
                b2bPriceLow: lowNum ?? undefined,
                b2b_price_medium: medNum ?? undefined,
                b2bPriceMedium: medNum ?? undefined,
                b2b_price_high: highNum ?? undefined,
                b2bPriceHigh: highNum ?? undefined,
              }
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

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id.toString() === selectedPartnerId),
    [partners, selectedPartnerId]
  );
  const activePartnerTier = (selectedPartner?.rate_tier || selectedPartner?.rateTier || "HIGH").toUpperCase() as "HIGH" | "MEDIUM" | "LOW";

  const handleUpdatePartnerTier = async (partnerId: string | number, newTier: "HIGH" | "MEDIUM" | "LOW") => {
    setUpdatingPartnerTier(true);
    try {
      await fetchFromLaravel(`/collection-centers/${partnerId}`, {
        method: "PUT",
        body: JSON.stringify({ rate_tier: newTier }),
      });
      setPartners((prev) =>
        prev.map((p) =>
          p.id === partnerId ? { ...p, rate_tier: newTier, rateTier: newTier } : p
        )
      );
      toast.success("Rate Tier Updated", `Assigned ${newTier} Tier to ${selectedPartner?.name || "partner"}.`);
    } catch (err: any) {
      toast.error("Update Failed", err.message || "Failed to update partner rate tier.");
    } finally {
      setUpdatingPartnerTier(false);
    }
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
          <p className="text-xs text-muted-foreground mt-0.5">
            {isB2B
              ? "Official wholesale diagnostic tariffs assigned to your registered partner terminal."
              : "Manage retail MRP and configure High, Medium, and Low B2B wholesale rates across your catalogue."}
          </p>
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

      {/* ── Admin Only: B2B Partner Rate Tier Management Bar ── */}
      {isAdmin && partners.length > 0 && (
        <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">B2B Partner Tariff Assignment</p>
              <p className="text-[11px] text-muted-foreground">Select a B2B partner center to assign their rate tier or inspect what they see.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Partner Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Partner:</span>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer max-w-[240px]"
              >
                <option value="ALL">All Partners (Master View)</option>
                {partners.map((p) => {
                  const t = (p.rate_tier || p.rateTier || "HIGH").toUpperCase();
                  return (
                    <option key={p.id} value={p.id.toString()}>
                      {p.name} ({t} Tier)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 1-Click Tier Switcher when a partner is selected */}
            {selectedPartner && (
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80">
                <span className="text-[10px] font-bold text-muted-foreground uppercase px-1.5">Assign Tier:</span>
                {(["HIGH", "MEDIUM", "LOW"] as const).map((tierKey) => {
                  const isCurrent = activePartnerTier === tierKey;
                  return (
                    <button
                      key={tierKey}
                      type="button"
                      disabled={updatingPartnerTier}
                      onClick={() => handleUpdatePartnerTier(selectedPartner.id, tierKey)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? tierKey === "HIGH"
                            ? "bg-purple-600 text-white shadow-xs"
                            : tierKey === "MEDIUM"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-emerald-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {tierKey === "HIGH" ? "High" : tierKey === "MEDIUM" ? "Medium" : "Low"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tier Switcher & Filter Controls ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Admin: Master 3-Tier Selector Pills (only when All Partners is selected) */}
        {isAdmin && selectedPartnerId === "ALL" && (
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTier("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTier === "ALL"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All 3 Tiers
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier("LOW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTier === "LOW"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              <span>Low Tier</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier("MEDIUM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTier === "MEDIUM"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
              <span>Medium Tier</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier("HIGH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTier === "HIGH"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-400 inline-block" />
              <span>High Tier</span>
            </button>
          </div>
        )}

        {/* Admin: Specific Partner Active Banner */}
        {isAdmin && selectedPartner && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-muted/40 border border-border shrink-0">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Showing Tariff for:</span>
            <span className="text-xs font-extrabold text-primary">{selectedPartner.name}</span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                activePartnerTier === "HIGH"
                  ? "bg-purple-500/10 text-purple-600"
                  : activePartnerTier === "MEDIUM"
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {activePartnerTier} Tier Rate
            </span>
          </div>
        )}

        {/* B2B Partner Login: Confidential Wholesale Tariff Badge */}
        {isB2B && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold">Wholesale Diagnostic Tariff</span>
          </div>
        )}

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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 shrink-0">
            <Filter className="h-3 w-3" /> Category:
          </span>
          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
                  <th className="py-3.5 px-5 w-14">#</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground"
                    onClick={() => {
                      if (sortField === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else { setSortField("name"); setSortOrder("asc"); }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Test Investigation</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Category</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground text-right"
                    onClick={() => {
                      if (sortField === "price") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else { setSortField("price"); setSortOrder("asc"); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>MRP (₹)</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>

                  {/* 1. B2B Client Portal: ONLY single Wholesale Rate column */}
                  {isB2B && (
                    <th className="py-3.5 px-4 text-right font-extrabold text-primary">
                      <span>B2B Wholesale Rate (₹)</span>
                    </th>
                  )}

                  {/* 2. Admin viewing a specific B2B Partner */}
                  {isAdmin && selectedPartner && (
                    <th className="py-3.5 px-4 text-right font-extrabold text-purple-600 dark:text-purple-400">
                      <span>{selectedPartner.name}'s Rate ({activePartnerTier}) (₹)</span>
                    </th>
                  )}

                  {/* 3. Admin Master View: Dynamic 3 Tier Columns */}
                  {isAdmin && !selectedPartner && (selectedTier === "ALL" || selectedTier === "LOW") && (
                    <th
                      className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground text-right"
                      onClick={() => {
                        if (sortField === "b2bLow") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else { setSortField("b2bLow"); setSortOrder("asc"); }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold">
                        <span>Low Tier (₹)</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  )}

                  {isAdmin && !selectedPartner && (selectedTier === "ALL" || selectedTier === "MEDIUM") && (
                    <th
                      className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground text-right"
                      onClick={() => {
                        if (sortField === "b2bMed") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else { setSortField("b2bMed"); setSortOrder("asc"); }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5 text-blue-600 dark:text-blue-400 font-extrabold">
                        <span>Medium Tier (₹)</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  )}

                  {isAdmin && !selectedPartner && (selectedTier === "ALL" || selectedTier === "HIGH") && (
                    <th
                      className="py-3.5 px-4 cursor-pointer select-none hover:text-foreground text-right"
                      onClick={() => {
                        if (sortField === "b2bHigh") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else { setSortField("b2bHigh"); setSortOrder("asc"); }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5 text-purple-600 dark:text-purple-400 font-extrabold">
                        <span>High Tier (₹)</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  )}

                  {/* Discount Column (always for B2B or single partner view or single tier view) */}
                  {(isB2B || selectedPartner || selectedTier !== "ALL") && (
                    <th className="py-3.5 px-4 text-center">Discount %</th>
                  )}

                  {isAdmin && <th className="py-3.5 px-5 text-right print:hidden">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRows.map((t, idx) => {
                  const mrp = Number(t.price || 0);
                  const low = Number(t.b2b_price_low ?? t.b2bPriceLow ?? 0);
                  const med = Number(t.b2b_price_medium ?? t.b2bPriceMedium ?? t.b2b_price ?? t.b2bPrice ?? 0);
                  const high = Number(t.b2b_price_high ?? t.b2bPriceHigh ?? 0);
                  const b2bOnlyPrice = Number(t.b2b_price ?? t.b2bPrice ?? mrp);

                  // Partner or single-tier calculation
                  let effectiveRate = b2bOnlyPrice;
                  if (isAdmin && selectedPartner) {
                    effectiveRate = activePartnerTier === "LOW" ? (low > 0 ? low : mrp) : activePartnerTier === "MEDIUM" ? (med > 0 ? med : mrp) : (high > 0 ? high : mrp);
                  } else if (isAdmin && selectedTier !== "ALL") {
                    effectiveRate = selectedTier === "LOW" ? low : selectedTier === "MEDIUM" ? med : high;
                  }

                  const activeDiscount =
                    mrp > 0 && effectiveRate > 0 && mrp >= effectiveRate
                      ? Math.round(((mrp - effectiveRate) / mrp) * 100)
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
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                          {t.category || "General"}
                        </span>
                      </td>

                      {/* MRP */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-foreground text-sm">
                        ₹{mrp.toLocaleString("en-IN")}
                      </td>

                      {/* 1. B2B Client Wholesale Rate */}
                      {isB2B && (
                        <td className="py-4 px-4 text-right">
                          {b2bOnlyPrice > 0 ? (
                            <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 inline-block">
                              ₹{b2bOnlyPrice.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* 2. Admin Viewing Specific Partner */}
                      {isAdmin && selectedPartner && (
                        <td className="py-4 px-4 text-right">
                          {effectiveRate > 0 ? (
                            <span
                              className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border inline-block ${
                                activePartnerTier === "HIGH"
                                  ? "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20"
                                  : activePartnerTier === "MEDIUM"
                                  ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
                                  : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              }`}
                            >
                              ₹{effectiveRate.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* 3. Admin Master View: Low Tier Column */}
                      {isAdmin && !selectedPartner && (selectedTier === "ALL" || selectedTier === "LOW") && (
                        <td className="py-4 px-4 text-right">
                          {low > 0 ? (
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 inline-block">
                              ₹{low.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* 3. Admin Master View: Medium Tier Column */}
                      {isAdmin && !selectedPartner && (selectedTier === "ALL" || selectedTier === "MEDIUM") && (
                        <td className="py-4 px-4 text-right">
                          {med > 0 ? (
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 inline-block">
                              ₹{med.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* 3. Admin Master View: High Tier Column */}
                      {isAdmin && !selectedPartner && (selectedTier === "ALL" || selectedTier === "HIGH") && (
                        <td className="py-4 px-4 text-right">
                          {high > 0 ? (
                            <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20 inline-block">
                              ₹{high.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Discount % Column */}
                      {(isB2B || selectedPartner || selectedTier !== "ALL") && (
                        <td className="py-4 px-4 text-center">
                          {activeDiscount !== null ? (
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              {activeDiscount}% Off
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      )}

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
                            <span>Edit Rates</span>
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

      {/* ── Admin Edit Multi-Tier Rates Dialog ── */}
      <Dialog open={!!editingTest} onOpenChange={(open) => { if (!open) setEditingTest(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border-border p-6 rounded-2xl shadow-elevated">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20">
                Multi-Tier B2B Pricing
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {editingTest?.test_code || editingTest?.testCode || "TEST"}
              </span>
            </div>
            <DialogTitle className="text-lg font-extrabold text-foreground">
              {editingTest?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set standard patient MRP and separate B2B wholesale rates for Low, Medium, and High partner tiers.
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

            {/* 1-Click Multi-Tier Presets */}
            <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> 1-Click Multi-Tier Presets (% of MRP):
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyMultiPreset(30, 40, 50)}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted text-xs font-mono font-bold border border-border text-foreground transition-colors cursor-pointer"
                >
                  30% · 40% · 50%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMultiPreset(35, 45, 55)}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted text-xs font-mono font-bold border border-border text-foreground transition-colors cursor-pointer"
                >
                  35% · 45% · 55%
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMultiPreset(40, 50, 60)}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted text-xs font-mono font-bold border border-border text-foreground transition-colors cursor-pointer"
                >
                  40% · 50% · 60%
                </button>
              </div>
            </div>

            {/* Three Tiers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Low Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>🟢 Low Tier (₹)</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editB2bLow}
                    onChange={(e) => setEditB2bLow(e.target.value)}
                    placeholder="e.g. 150"
                    className="pl-8 font-mono font-bold text-xs h-10 rounded-xl border-emerald-500/40 focus:border-emerald-500"
                  />
                </div>
                {parseFloat(editMrp) > 0 && parseFloat(editB2bLow) > 0 && (
                  <p className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round(((parseFloat(editMrp) - parseFloat(editB2bLow)) / parseFloat(editMrp)) * 100)}% discount
                  </p>
                )}
              </div>

              {/* Medium Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                  <span>🔵 Medium Tier (₹)</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editB2bMed}
                    onChange={(e) => setEditB2bMed(e.target.value)}
                    placeholder="e.g. 200"
                    className="pl-8 font-mono font-bold text-xs h-10 rounded-xl border-blue-500/40 focus:border-blue-500"
                  />
                </div>
                {parseFloat(editMrp) > 0 && parseFloat(editB2bMed) > 0 && (
                  <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(((parseFloat(editMrp) - parseFloat(editB2bMed)) / parseFloat(editMrp)) * 100)}% discount
                  </p>
                )}
              </div>

              {/* High Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                  <span>🟣 High Tier (₹)</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editB2bHigh}
                    onChange={(e) => setEditB2bHigh(e.target.value)}
                    placeholder="e.g. 250"
                    className="pl-8 font-mono font-bold text-xs h-10 rounded-xl border-purple-500/40 focus:border-purple-500"
                  />
                </div>
                {parseFloat(editMrp) > 0 && parseFloat(editB2bHigh) > 0 && (
                  <p className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    {Math.round(((parseFloat(editMrp) - parseFloat(editB2bHigh)) / parseFloat(editMrp)) * 100)}% discount
                  </p>
                )}
              </div>
            </div>
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
              {saving ? "Saving..." : "Save Tier Rates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
