"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, RefreshCw, IndianRupee, ChevronLeft, ChevronRight,
  Edit3, ArrowUpDown, Layers, X, CheckCircle2, Percent, Sparkles,
  Briefcase, Building2, Plus, Copy, Trash2, Check,
  Filter, AlertCircle, TrendingUp, Settings2,
  SlidersHorizontal, ShieldCheck, Tag, FlaskConical, Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { getStoredPackages, syncLocalPackagesWithBackend } from "@/lib/packages";

// Interfaces
interface CustomRateList {
  id: number;
  name: string;
  description?: string;
  is_default?: boolean;
  items_count?: number;
  partners_count?: number;
  users?: Array<{
    id: number | string;
    name: string;
    lab_name?: string;
    email: string;
    phone?: string;
    rate_tier?: string;
    rate_list_id?: number;
  }>;
  created_at?: string;
  updated_at?: string;
}

interface TestRateItem {
  id: string;
  name: string;
  test_code?: string;
  category?: string;
  mrp: number;
  b2b_price_default: number;
  b2b_price_high?: number | null;
  b2b_price_medium?: number | null;
  b2b_price_low?: number | null;
  custom_price: number | null;
  effective_price: number;
  is_overridden: boolean;
  method?: string;
}

interface PackageRateItem {
  id: string;
  name: string;
  test_code?: string;
  category?: string;
  description?: string;
  tests_count?: number;
  mrp: number;
  b2b_price_default: number;
  custom_price: number | null;
  effective_price: number;
  is_overridden: boolean;
}

interface B2BPartner {
  id: string | number;
  name: string;
  lab_name?: string;
  labName?: string;
  email: string;
  phone?: string;
  role?: string;
  rate_tier?: string;
  rateTier?: string;
  rate_list_id?: number | null;
  rateListId?: number | null;
  rate_list_name?: string | null;
  rateListName?: string | null;
}

export default function RateListPage() {
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab for Admin Workspace
  const [activeTab, setActiveTab] = useState<"MASTER" | "RATES" | "PARTNERS">("MASTER");

  // Rate Lists Master State
  const [rateLists, setRateLists] = useState<CustomRateList[]>([]);
  const [selectedRateListId, setSelectedRateListId] = useState<number | null>(null);

  // Rate Matrix State (Tests & Packages under selected rate list)
  const [testRates, setTestRates] = useState<TestRateItem[]>([]);
  const [packageRates, setPackageRates] = useState<PackageRateItem[]>([]);
  const [ratesSubTab, setRatesSubTab] = useState<"TESTS" | "PACKAGES">("TESTS");
  const [b2bSubTab, setB2bSubTab] = useState<"TESTS" | "PACKAGES">("TESTS");
  const [editedRates, setEditedRates] = useState<Record<string, string>>({}); // test_id / pkg_id => custom price string
  const [isSavingRates, setIsSavingRates] = useState(false);

  // B2B Partner Directory State
  const [partners, setPartners] = useState<B2BPartner[]>([]);
  const [assigningPartnerId, setAssigningPartnerId] = useState<string | number | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [overrideFilter, setOverrideFilter] = useState<"ALL" | "OVERRIDDEN_ONLY" | "DEFAULT_ONLY">("ALL");
  const [sortField, setSortField] = useState<"name" | "mrp" | "custom_price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListCloneSource, setNewListCloneSource] = useState<string>("TIER_HIGH");
  const [isCreatingList, setIsCreatingList] = useState(false);

  const [cloningList, setCloningList] = useState<CustomRateList | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [isSubmittingClone, setIsSubmittingClone] = useState(false);

  const [renamingList, setRenamingList] = useState<CustomRateList | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  const [deletingList, setDeletingList] = useState<CustomRateList | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [isBulkDiscountModalOpen, setIsBulkDiscountModalOpen] = useState(false);
  const [bulkDiscountPct, setBulkDiscountPct] = useState<string>("35");

  // B2B Client View State
  const [b2bClientData, setB2bClientData] = useState<{
    rate_list_name: string;
    rate_list_description?: string;
    rate_tier: string;
    tests: Array<{
      id: string;
      name: string;
      test_code?: string;
      category?: string;
      mrp: number;
      b2b_price: number;
      wholesale_margin: number;
      discount_percent: number;
      pricing_source: string;
      method?: string;
    }>;
    packages?: Array<{
      id: string;
      name: string;
      test_code?: string;
      category?: string;
      description?: string;
      tests_count?: number;
      mrp: number;
      b2b_price: number;
      wholesale_margin: number;
      discount_percent: number;
      pricing_source: string;
    }>;
  } | null>(null);

  const isB2B = user?.role === "B2B";
  const isAdmin = !isB2B;

  // 1. Initial Load
  useEffect(() => {
    const u = getStoredUser();
    setUser(u);

    if (u?.role === "B2B") {
      loadB2bClientRateList();
    } else {
      loadAdminRateLists();
      loadPartners();
    }
  }, []);

  // Fetch B2B Client Dedicated Rate List
  const loadB2bClientRateList = async () => {
    setLoading(true);
    try {
      const res = await fetchFromLaravel("/rate-lists/my-rate-list", { skipCache: true });
      if (res && res.status === "success" && res.data) {
        setB2bClientData(res.data);
      }
    } catch (err) {
      console.error("Failed to load client rate list:", err);
      toast.error("Load Error", "Could not fetch your assigned rate list.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Admin Rate Lists
  const loadAdminRateLists = useCallback(async (selectFirstIfNoneSelected = true) => {
    setLoading(true);
    try {
      const res = await fetchFromLaravel("/rate-lists", { skipCache: true });
      if (res && res.status === "success" && Array.isArray(res.data)) {
        setRateLists(res.data);
        if (selectFirstIfNoneSelected && res.data.length > 0 && selectedRateListId === null) {
          setSelectedRateListId(res.data[0].id);
          loadRateListDetails(res.data[0].id);
        } else if (res.data.length === 0) {
          setSelectedRateListId(null);
          setTestRates([]);
          setPackageRates([]);
        }
      }
    } catch (err) {
      console.error("Failed to load rate lists:", err);
      toast.error("Load Error", "Could not fetch laboratory rate lists.");
    } finally {
      setLoading(false);
    }
  }, [selectedRateListId]);

  // Fetch Partners
  const loadPartners = async () => {
    try {
      const data = await fetchFromLaravel("/collection-centers", { skipCache: true });
      const list = Array.isArray(data) ? data : (data?.data || []);
      const b2bList = list
        .filter((c: any) => c.role === "B2B" || c.role === "COLLECTION_CENTER")
        .map((c: any) => {
          const rlId = c.rate_list_id ?? c.rateListId ?? c.rateList?.id ?? null;
          return {
            ...c,
            rate_list_id: rlId ? Number(rlId) : null,
            rateListId: rlId ? Number(rlId) : null,
            rate_tier: c.rate_tier ?? c.rateTier ?? "HIGH",
            rateTier: c.rate_tier ?? c.rateTier ?? "HIGH",
            rate_list_name: c.rate_list_name ?? c.rateListName ?? c.rateList?.name ?? null,
            lab_name: c.lab_name ?? c.labName ?? c.name,
          };
        });
      setPartners(b2bList);
    } catch (e) {
      console.error("Failed to load partners:", e);
    }
  };

  // Fetch Rate List Details & Tests Matrix
  const loadRateListDetails = async (id: number) => {
    try {
      // Sync any local packages with backend
      syncLocalPackagesWithBackend().catch(() => {});

      const res = await fetchFromLaravel(`/rate-lists/${id}`, { skipCache: true });
      if (res && res.status === "success" && res.data) {
        setTestRates(res.data.tests || []);
        
        // Merge backend packages with any locally stored packages as optimistic fallback
        const backendPkgs: PackageRateItem[] = res.data.packages || [];
        const localPkgs = getStoredPackages();
        const map = new Map<string, PackageRateItem>();

        backendPkgs.forEach((p) => {
          map.set(p.id, p);
        });

        localPkgs.forEach((lp) => {
          if (!map.has(lp.id)) {
            const mrp = Number(lp.price || 0);
            const defaultB2b = Math.round(mrp * 0.70);
            map.set(lp.id, {
              id: lp.id,
              name: lp.name,
              test_code: lp.code,
              category: "Health Package",
              description: lp.description,
              tests_count: lp.tests?.length || lp.testIds?.length || 0,
              mrp: mrp,
              b2b_price_default: defaultB2b,
              custom_price: null,
              effective_price: defaultB2b,
              is_overridden: false,
            });
          }
        });

        setPackageRates(Array.from(map.values()));
        setEditedRates({});
      }
    } catch (err) {
      console.error("Failed to load rate list details:", err);
      toast.error("Error", "Could not load test rates for this list.");
    }
  };

  // Select a Rate List
  const handleSelectRateList = (id: number) => {
    setSelectedRateListId(id);
    loadRateListDetails(id);
    setActiveTab("RATES");
  };

  // Create Rate List
  const handleCreateRateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setIsCreatingList(true);
    try {
      const payload: any = {
        name: newListName.trim(),
        description: newListDesc.trim() || null,
      };

      if (newListCloneSource.startsWith("TIER_")) {
        payload.clone_from_tier = newListCloneSource.replace("TIER_", "");
      } else if (newListCloneSource !== "NONE") {
        payload.clone_from_id = Number(newListCloneSource);
      }

      const res = await fetchFromLaravel("/rate-lists", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status === "success") {
        toast.success("Created", res.message || "New Rate List created.");
        setIsCreateModalOpen(false);
        setNewListName("");
        setNewListDesc("");
        setNewListCloneSource("TIER_HIGH");

        // Reload lists and select the new one
        await loadAdminRateLists(false);
        if (res.data?.id) {
          setSelectedRateListId(res.data.id);
          loadRateListDetails(res.data.id);
          setActiveTab("RATES");
        }
      } else {
        toast.error("Error", res?.message || "Failed to create rate list.");
      }
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to create rate list.");
    } finally {
      setIsCreatingList(false);
    }
  };

  // Clone Rate List
  const handleCloneRateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloningList || !cloneName.trim()) return;

    setIsSubmittingClone(true);
    try {
      const res = await fetchFromLaravel(`/rate-lists/${cloningList.id}/clone`, {
        method: "POST",
        body: JSON.stringify({ name: cloneName.trim() }),
      });

      if (res && res.status === "success") {
        toast.success("Cloned", res.message || "Rate List duplicated.");
        setCloningList(null);
        setCloneName("");
        await loadAdminRateLists(false);
        if (res.data?.id) {
          setSelectedRateListId(res.data.id);
          loadRateListDetails(res.data.id);
          setActiveTab("RATES");
        }
      } else {
        toast.error("Error", res?.message || "Failed to duplicate rate list.");
      }
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to duplicate rate list.");
    } finally {
      setIsSubmittingClone(false);
    }
  };

  // Rename Rate List
  const handleRenameRateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingList || !renameValue.trim()) return;

    setIsSubmittingRename(true);
    try {
      const res = await fetchFromLaravel(`/rate-lists/${renamingList.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (res && res.status === "success") {
        toast.success("Updated", "Rate List renamed successfully.");
        setRenamingList(null);
        setRenameValue("");
        loadAdminRateLists(false);
      } else {
        toast.error("Error", res?.message || "Failed to rename rate list.");
      }
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to rename rate list.");
    } finally {
      setIsSubmittingRename(false);
    }
  };

  // Delete Rate List
  const handleDeleteRateList = async () => {
    if (!deletingList) return;

    setIsSubmittingDelete(true);
    try {
      const res = await fetchFromLaravel(`/rate-lists/${deletingList.id}`, {
        method: "DELETE",
      });

      if (res && res.status === "success") {
        toast.success("Deleted", res.message || "Rate List deleted.");
        setDeletingList(null);
        if (selectedRateListId === deletingList.id) {
          setSelectedRateListId(null);
          setTestRates([]);
          setActiveTab("MASTER");
        }
        loadAdminRateLists();
        loadPartners();
      } else {
        toast.error("Error", res?.message || "Failed to delete rate list.");
      }
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to delete rate list.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Inline Rate Change Handler
  const handleRateInputChange = (testId: string, value: string) => {
    setEditedRates((prev) => ({
      ...prev,
      [testId]: value,
    }));
  };

  // Save Modified Rates
  const handleSaveAllModifiedRates = async () => {
    if (!selectedRateListId) return;

    const modifiedEntries = Object.entries(editedRates);
    if (modifiedEntries.length === 0) {
      toast.info("No Changes", "No test rates have been modified yet.");
      return;
    }

    setIsSavingRates(true);
    try {
      const ratesPayload = modifiedEntries.map(([testId, priceStr]) => ({
        test_id: testId,
        b2b_price: priceStr.trim() === "" ? null : parseFloat(priceStr),
      }));

      const res = await fetchFromLaravel(`/rate-lists/${selectedRateListId}/rates`, {
        method: "POST",
        body: JSON.stringify({ rates: ratesPayload }),
      });

      if (res && res.status === "success") {
        toast.success("Rates Saved", res.message || "Custom test rates updated.");
        setEditedRates({});
        loadRateListDetails(selectedRateListId);
        loadAdminRateLists(false);
      } else {
        toast.error("Error", res?.message || "Failed to update rates.");
      }
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to save rates.");
    } finally {
      setIsSavingRates(false);
    }
  };

  // Bulk % Discount Applier (Supports both Individual Tests and Health Packages depending on active sub-tab)
  const handleApplyBulkDiscount = () => {
    const pct = parseFloat(bulkDiscountPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Invalid Percentage", "Please enter a valid percentage between 0 and 100.");
      return;
    }

    const newEdits: Record<string, string> = { ...editedRates };
    let count = 0;

    if (ratesSubTab === "PACKAGES") {
      filteredPackages.forEach((pkg) => {
        const mrp = Number(pkg.mrp || 0);
        if (mrp > 0) {
          const discounted = Math.round(mrp * (1 - pct / 100));
          newEdits[pkg.id] = String(discounted);
          count++;
        }
      });
      setEditedRates(newEdits);
      setIsBulkDiscountModalOpen(false);
      toast.success("Preset Applied", `Applied ${pct}% off MRP on ${count} packages. Click 'Save Changes' to persist.`);
    } else {
      filteredTests.forEach((t) => {
        const mrp = Number(t.mrp || 0);
        if (mrp > 0) {
          const discounted = Math.round(mrp * (1 - pct / 100));
          newEdits[t.id] = String(discounted);
          count++;
        }
      });
      setEditedRates(newEdits);
      setIsBulkDiscountModalOpen(false);
      toast.success("Preset Applied", `Applied ${pct}% off MRP on ${count} tests. Click 'Save Changes' to persist.`);
    }
  };

  // Assign Partner to Rate List
  const handleAssignPartner = async (partnerId: string | number, rateListId: number | null) => {
    setAssigningPartnerId(partnerId);

    // Optimistically update partner in local state immediately
    setPartners((prev) =>
      prev.map((p) => {
        if (String(p.id) === String(partnerId)) {
          const selectedRl = rateLists.find((r) => Number(r.id) === Number(rateListId));
          return {
            ...p,
            rate_list_id: rateListId,
            rateListId: rateListId,
            rate_list_name: selectedRl?.name ?? null,
            rateListName: selectedRl?.name ?? null,
          };
        }
        return p;
      })
    );

    try {
      const res = await fetchFromLaravel("/rate-lists/assign-partner", {
        method: "POST",
        body: JSON.stringify({
          b2b_user_id: partnerId,
          rate_list_id: rateListId,
        }),
      });

      if (res && res.status === "success") {
        toast.success("Assigned", res.message || "Partner rate list updated.");
        await loadPartners();
        await loadAdminRateLists(false);
      } else {
        toast.error("Error", res?.message || "Failed to assign partner.");
        await loadPartners();
      }
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to assign partner.");
      await loadPartners();
    } finally {
      setAssigningPartnerId(null);
    }
  };

  // Unique categories for filtering
  const categories = useMemo(() => {
    const source = isB2B ? (b2bClientData?.tests || []) : testRates;
    const cats = new Set<string>();
    source.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return ["ALL", ...Array.from(cats).sort()];
  }, [isB2B, b2bClientData, testRates]);

  // Filtered & Sorted Tests for Admin
  const filteredTests = useMemo(() => {
    const list = testRates.filter((t) => {
      const q = search.toLowerCase();
      const code = (t.test_code || "").toLowerCase();
      const name = (t.name || "").toLowerCase();
      const matchesQuery = !search || code.includes(q) || name.includes(q);
      const matchesCat = selectedCategory === "ALL" || t.category === selectedCategory;

      let matchesOverride = true;
      const isOverridden = t.is_overridden || editedRates[t.id] !== undefined;
      if (overrideFilter === "OVERRIDDEN_ONLY") matchesOverride = isOverridden;
      else if (overrideFilter === "DEFAULT_ONLY") matchesOverride = !isOverridden;

      return matchesQuery && matchesCat && matchesOverride;
    });

    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortField === "mrp") {
        valA = Number(a.mrp || 0);
        valB = Number(b.mrp || 0);
      } else if (sortField === "custom_price") {
        valA = editedRates[a.id] !== undefined ? Number(editedRates[a.id]) : Number(a.effective_price || 0);
        valB = editedRates[b.id] !== undefined ? Number(editedRates[b.id]) : Number(b.effective_price || 0);
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [testRates, search, selectedCategory, overrideFilter, sortField, sortOrder, editedRates]);

  // Paginated Rows for Admin
  const totalItems = filteredTests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  // B2B Client Portal Pagination State
  const [b2bPage, setB2bPage] = useState(1);
  const [b2bPageSize, setB2bPageSize] = useState(15);

  // Reset B2B pagination when filters change
  useEffect(() => {
    setB2bPage(1);
  }, [search, selectedCategory, b2bSubTab]);

  // Filtered Tests for B2B Client Portal
  const filteredB2bTests = useMemo(() => {
    if (!b2bClientData?.tests) return [];
    return b2bClientData.tests.filter((t) => {
      const q = search.toLowerCase();
      const code = (t.test_code || "").toLowerCase();
      const name = (t.name || "").toLowerCase();
      const matchesQuery = !search || code.includes(q) || name.includes(q);
      const matchesCat = selectedCategory === "ALL" || t.category === selectedCategory;
      return matchesQuery && matchesCat;
    });
  }, [b2bClientData, search, selectedCategory]);

  const totalB2bTests = filteredB2bTests.length;
  const totalB2bTestPages = Math.max(1, Math.ceil(totalB2bTests / b2bPageSize));
  const safeB2bTestPage = Math.min(Math.max(1, b2bPage), totalB2bTestPages);

  const paginatedB2bTests = useMemo(() => {
    const start = (safeB2bTestPage - 1) * b2bPageSize;
    return filteredB2bTests.slice(start, start + b2bPageSize);
  }, [filteredB2bTests, safeB2bTestPage, b2bPageSize]);

  // Filtered Packages for B2B Client Portal
  const filteredB2bPackages = useMemo(() => {
    if (!b2bClientData?.packages) return [];
    return b2bClientData.packages.filter((p) => {
      const q = search.toLowerCase();
      const code = (p.test_code || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return !search || code.includes(q) || name.includes(q);
    });
  }, [b2bClientData, search]);

  const totalB2bPackages = filteredB2bPackages.length;
  const totalB2bPackagePages = Math.max(1, Math.ceil(totalB2bPackages / b2bPageSize));
  const safeB2bPackagePage = Math.min(Math.max(1, b2bPage), totalB2bPackagePages);

  const paginatedB2bPackages = useMemo(() => {
    const start = (safeB2bPackagePage - 1) * b2bPageSize;
    return filteredB2bPackages.slice(start, start + b2bPageSize);
  }, [filteredB2bPackages, safeB2bPackagePage, b2bPageSize]);

  // Filtered Packages for Admin Rate Matrix
  const filteredPackages = useMemo(() => {
    return packageRates.filter((p) => {
      const q = search.toLowerCase();
      const code = (p.test_code || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      const matchesQuery = !search || code.includes(q) || name.includes(q);
      const isOverridden = editedRates[p.id] !== undefined ? editedRates[p.id] !== "" : p.is_overridden;
      const matchesOverride =
        overrideFilter === "ALL" ||
        (overrideFilter === "OVERRIDDEN_ONLY" && isOverridden) ||
        (overrideFilter === "DEFAULT_ONLY" && !isOverridden);
      return matchesQuery && matchesOverride;
    });
  }, [packageRates, search, overrideFilter, editedRates]);

  const selectedRateList = rateLists.find((rl) => rl.id === selectedRateListId);
  const pendingEditsCount = Object.keys(editedRates).length;

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW MODE 1: B2B CLIENT PORTAL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (isB2B) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* ── Client Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  B2B Wholesale Rate List
                </h1>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Exclusively negotiated B2B test investigation rates applicable to your diagnostic account.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadB2bClientRateList}
              disabled={loading}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── Assigned Rate List Banner ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/30">
                Your Assigned Agreement
              </span>
              <h2 className="font-bold text-lg text-foreground mt-0.5">
                {b2bClientData?.rate_list_name || "Standard Diagnostic Rates"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Rates apply automatically on patient intake &amp; billing calculations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <div className="bg-card px-3.5 py-2 rounded-xl border border-border/80 text-center">
              <span className="text-[10px] text-muted-foreground block font-sans">Available Tests</span>
              <strong className="text-foreground text-sm">{filteredB2bTests.length}</strong>
            </div>
            <div className="bg-card px-3.5 py-2 rounded-xl border border-border/80 text-center">
              <span className="text-[10px] text-muted-foreground block font-sans">Health Packages</span>
              <strong className="text-foreground text-sm">{filteredB2bPackages.length}</strong>
            </div>
          </div>
        </div>

        {/* ── Sub-tab Switcher: Individual Tests vs Health Packages ── */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-2">
          <button
            type="button"
            onClick={() => {
              setB2bSubTab("TESTS");
              setSearch("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              b2bSubTab === "TESTS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>Individual Tests ({filteredB2bTests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setB2bSubTab("PACKAGES");
              setSearch("");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              b2bSubTab === "PACKAGES"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Health Packages ({filteredB2bPackages.length})</span>
          </button>
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap print:hidden">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={b2bSubTab === "TESTS" ? "Search test name or code..." : "Search health package..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {b2bSubTab === "TESTS" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-primary" /> Dept:
              </span>
              {categories.slice(0, 7).map((c) => (
                <Button
                  key={c}
                  variant={selectedCategory === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(c)}
                  className="text-xs h-8 px-2.5 shrink-0"
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* ── Client Rate Sheet Table ── */}
        {b2bSubTab === "TESTS" ? (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="table-responsive-container">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Test Investigation</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Standard MRP</th>
                    <th className="py-3 px-4 text-right">Your Agreed B2B Rate</th>
                    <th className="py-3 px-4 text-center">Your Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <tr key={idx} className="animate-fade-in">
                        <td className="py-3.5 px-4"><div className="h-4 w-6 rounded shimmer-gradient" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-40 rounded shimmer-gradient mb-1" /><div className="h-3 w-20 rounded shimmer-gradient" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-24 rounded shimmer-gradient" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 rounded shimmer-gradient ml-auto" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-5 w-20 rounded shimmer-gradient ml-auto" /></td>
                        <td className="py-3.5 px-4 text-center"><div className="h-5 w-16 rounded-full shimmer-gradient mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredB2bTests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="font-semibold text-foreground">No test investigations found</p>
                        <p className="text-[11px] mt-0.5">Try searching with a different test name or code</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedB2bTests.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{(safeB2bTestPage - 1) * b2bPageSize + idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground text-xs">{t.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/70">
                              {t.test_code || "TEST-CODE"}
                            </span>
                            {t.method && <span className="text-[10px] text-muted-foreground italic">· {t.method}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                            {t.category || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-muted-foreground">
                          ₹{Number(t.mrp || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 inline-block">
                            ₹{Number(t.b2b_price || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 inline-block font-mono">
                            Save ₹{Number(t.wholesale_margin || 0).toLocaleString("en-IN")} ({t.discount_percent}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* B2B Tests Pagination Controls */}
            {totalB2bTests > 0 && (
              <div className="p-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {(safeB2bTestPage - 1) * b2bPageSize + 1}–{Math.min(safeB2bTestPage * b2bPageSize, totalB2bTests)} of {totalB2bTests} investigations
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">Per page:</span>
                    <select
                      value={b2bPageSize}
                      onChange={(e) => {
                        setB2bPageSize(Number(e.target.value));
                        setB2bPage(1);
                      }}
                      className="px-2 py-1 rounded-lg bg-background border border-border text-xs text-foreground font-semibold focus:outline-none"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeB2bTestPage === 1}
                    onClick={() => setB2bPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    <span>Previous</span>
                  </Button>
                  <span className="px-2.5 font-mono font-bold text-foreground">
                    Page {safeB2bTestPage} of {totalB2bTestPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeB2bTestPage >= totalB2bTestPages}
                    onClick={() => setB2bPage((p) => Math.min(totalB2bTestPages, p + 1))}
                    className="h-8 px-2.5 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Health Packages Table for B2B Client */
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="table-responsive-container">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Health Package</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Standard MRP</th>
                    <th className="py-3 px-4 text-right">Your Agreed B2B Rate</th>
                    <th className="py-3 px-4 text-center">Your Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx} className="animate-fade-in">
                        <td className="py-3.5 px-4"><div className="h-4 w-6 rounded shimmer-gradient" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-48 rounded shimmer-gradient mb-1" /><div className="h-3 w-28 rounded shimmer-gradient" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-24 rounded shimmer-gradient" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 rounded shimmer-gradient ml-auto" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-5 w-20 rounded shimmer-gradient ml-auto" /></td>
                        <td className="py-3.5 px-4 text-center"><div className="h-5 w-16 rounded-full shimmer-gradient mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredB2bPackages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="font-semibold text-foreground">No health packages found</p>
                        <p className="text-[11px] mt-0.5">Try searching with a different package name or code</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedB2bPackages.map((pkg, idx) => (
                      <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{(safeB2bPackagePage - 1) * b2bPageSize + idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground text-xs flex items-center gap-2">
                            <span>{pkg.name}</span>
                            {pkg.tests_count && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                {pkg.tests_count} Tests Bundled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/70">
                              {pkg.test_code || "PKG-CODE"}
                            </span>
                            {pkg.description && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-sm">
                                {pkg.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                            {pkg.category || "Health Package"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-muted-foreground">
                          ₹{Number(pkg.mrp || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 inline-block">
                            ₹{Number(pkg.b2b_price || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 inline-block font-mono">
                            Save ₹{Number(pkg.wholesale_margin || 0).toLocaleString("en-IN")} ({pkg.discount_percent}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* B2B Packages Pagination Controls */}
            {totalB2bPackages > 0 && (
              <div className="p-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
                <div className="flex items-center gap-3">
                  <span>
                    Showing {(safeB2bPackagePage - 1) * b2bPageSize + 1}–{Math.min(safeB2bPackagePage * b2bPageSize, totalB2bPackages)} of {totalB2bPackages} health packages
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">Per page:</span>
                    <select
                      value={b2bPageSize}
                      onChange={(e) => {
                        setB2bPageSize(Number(e.target.value));
                        setB2bPage(1);
                      }}
                      className="px-2 py-1 rounded-lg bg-background border border-border text-xs text-foreground font-semibold focus:outline-none"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeB2bPackagePage === 1}
                    onClick={() => setB2bPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    <span>Previous</span>
                  </Button>
                  <span className="px-2.5 font-mono font-bold text-foreground">
                    Page {safeB2bPackagePage} of {totalB2bPackagePages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeB2bPackagePage >= totalB2bPackagePages}
                    onClick={() => setB2bPage((p) => Math.min(totalB2bPackagePages, p + 1))}
                    className="h-8 px-2.5 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW MODE 2: ADMIN RATE LIST MASTER WORKSPACE
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-full overflow-hidden">
      {/* ── Admin Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Rate List Master
              </h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create unlimited custom named rate lists (e.g. SPECIAL TAJ, SARA CLINIC), customize per-test prices, and assign them directly to B2B partners.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs font-bold gradient-primary text-primary-foreground shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Create Rate List</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadAdminRateLists();
              loadPartners();
            }}
            disabled={loading}
            className="gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Navigation Workspace Tabs (Master, Rates Editor, Partners) ── */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("MASTER")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "MASTER"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Rate Lists Master ({rateLists.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("RATES")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "RATES"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>
            Test Rates Editor {selectedRateList ? `(${selectedRateList.name})` : ""}
          </span>
          {pendingEditsCount > 0 && (
            <span className="h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center">
              {pendingEditsCount} unsaved
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PARTNERS")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "PARTNERS"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>B2B Partner Assignments ({partners.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: RATE LIST MASTER OVERVIEW & CARDS CAROUSEL */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "MASTER" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Available Rate Lists ({rateLists.length}):</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              Click &quot;Edit Rates&quot; to configure pricing for any rate list
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl border border-border/70 bg-card shimmer-card-pulse space-y-3 h-[180px]">
                  <div className="flex justify-between"><div className="h-5 w-32 rounded shimmer-gradient" /><div className="h-4 w-16 rounded-full shimmer-gradient" /></div>
                  <div className="h-3 w-48 rounded shimmer-gradient mt-4" />
                  <div className="pt-4 border-t border-border/50 flex justify-between"><div className="h-7 w-20 rounded shimmer-gradient" /><div className="h-7 w-20 rounded shimmer-gradient" /></div>
                </div>
              ))}
            </div>
          ) : rateLists.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-border/80 bg-card/60 space-y-3">
              <SlidersHorizontal className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <h4 className="font-bold text-base text-foreground">No Custom Rate Lists Created Yet</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Create your first custom rate list (e.g. &quot;SPECIAL TAJ&quot; or &quot;SPECIAL CLINIC&quot;) to give personalized rates to your B2B partners.
              </p>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-1.5 text-xs font-bold gradient-primary text-primary-foreground shadow-xs cursor-pointer mt-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Rate List</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rateLists.map((rl) => {
                const isSelected = selectedRateListId === rl.id;

                return (
                  <div
                    key={rl.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-border/80 bg-card hover:border-border"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {rl.items_count || 0} Custom Rates
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{rl.partners_count || 0} Partners</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-foreground mt-1 truncate" title={rl.name}>
                        {rl.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {rl.description || "Custom negotiated pricing list for assigned partners."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleSelectRateList(rl.id)}
                        className={`text-xs font-bold h-8 px-3 gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "gradient-primary text-primary-foreground shadow-2xs hover:opacity-90"
                        }`}
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Set / Edit Rates</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCloningList(rl);
                            setCloneName(`${rl.name} (Copy)`);
                          }}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Duplicate this Rate List"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRenamingList(rl);
                            setRenameValue(rl.name);
                          }}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingList(rl)}
                          className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: TEST RATES MATRIX EDITOR FOR SELECTED RATE LIST */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "RATES" && (
        <div className="space-y-4">
          {/* Rate List Selector & Action Bar */}
          <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Editing Rate List:</span>
                  <select
                    value={selectedRateListId || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) handleSelectRateList(id);
                    }}
                    className="h-8 px-2.5 rounded-lg bg-background border border-border/80 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    {rateLists.map((rl) => (
                      <option key={rl.id} value={rl.id}>
                        {rl.name} ({rl.partners_count || 0} partners)
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Type any custom rate in the &quot;Custom Rate&quot; box. Unset rates fall back to standard lab rate.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDiscountModalOpen(true)}
                className="text-xs h-9 px-3 gap-1.5 font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 cursor-pointer"
              >
                <Percent className="h-3.5 w-3.5" />
                <span>
                  1-Click % Discount ({ratesSubTab === "PACKAGES" ? "Packages" : "Tests"})
                </span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAllModifiedRates}
                disabled={isSavingRates || pendingEditsCount === 0}
                className={`text-xs h-9 px-4 font-bold gap-1.5 cursor-pointer shadow-sm ${
                  pendingEditsCount > 0
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                    : "gradient-primary text-primary-foreground"
                }`}
              >
                {isSavingRates ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Changes {pendingEditsCount > 0 ? `(${pendingEditsCount})` : ""}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sub-tab Switcher: Individual Tests vs Health Packages */}
          <div className="flex items-center gap-2 border-b border-border/70 pb-2">
            <button
              type="button"
              onClick={() => {
                setRatesSubTab("TESTS");
                setSearch("");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ratesSubTab === "TESTS"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Individual Tests ({testRates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRatesSubTab("PACKAGES");
                setSearch("");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ratesSubTab === "PACKAGES"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Health Packages ({packageRates.length})</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 space-y-3 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={ratesSubTab === "TESTS" ? "Search test name or code..." : "Search health package..."}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-8 h-9 text-xs"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Override Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-muted-foreground mr-1">Show:</span>
                <Button
                  variant={overrideFilter === "ALL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOverrideFilter("ALL");
                    setCurrentPage(1);
                  }}
                  className="text-xs h-8 px-2.5"
                >
                  All ({ratesSubTab === "TESTS" ? testRates.length : packageRates.length})
                </Button>
                <Button
                  variant={overrideFilter === "OVERRIDDEN_ONLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOverrideFilter("OVERRIDDEN_ONLY");
                    setCurrentPage(1);
                  }}
                  className="text-xs h-8 px-2.5 text-emerald-600 dark:text-emerald-400"
                >
                  Custom Overrides Only
                </Button>
                <Button
                  variant={overrideFilter === "DEFAULT_ONLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOverrideFilter("DEFAULT_ONLY");
                    setCurrentPage(1);
                  }}
                  className="text-xs h-8 px-2.5"
                >
                  Standard Rates Only
                </Button>
              </div>

              {/* Category Dropdown (Only for Tests) */}
              {ratesSubTab === "TESTS" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">Dept:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 rounded-lg bg-background border border-border/80 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Rates Table: Tests vs Packages */}
          {ratesSubTab === "PACKAGES" ? (
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="table-responsive-container">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                      <th className="py-3 px-3.5 w-12">#</th>
                      <th className="py-3 px-4">Health Package Details</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3.5 text-right">Standard MRP</th>
                      <th className="py-3 px-3.5 text-right">Base B2B</th>
                      <th className="py-3 px-4 text-right font-extrabold text-primary min-w-[150px]">
                        Custom Rate for {selectedRateList?.name || "List"} (₹)
                      </th>
                      <th className="py-3 px-3.5 text-center">Wholesale Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-fade-in">
                          <td className="py-3 px-3.5"><div className="h-4 w-6 rounded shimmer-gradient" /></td>
                          <td className="py-3 px-4"><div className="h-4 w-48 rounded shimmer-gradient mb-1" /><div className="h-3 w-28 rounded shimmer-gradient" /></td>
                          <td className="py-3 px-3"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                          <td className="py-3 px-3.5 text-right"><div className="h-4 w-14 rounded shimmer-gradient ml-auto" /></td>
                          <td className="py-3 px-3.5 text-right"><div className="h-4 w-14 rounded shimmer-gradient ml-auto" /></td>
                          <td className="py-3 px-4 text-right"><div className="h-7 w-24 rounded shimmer-gradient ml-auto" /></td>
                          <td className="py-3 px-3.5 text-center"><div className="h-5 w-16 rounded-full shimmer-gradient mx-auto" /></td>
                        </tr>
                      ))
                    ) : filteredPackages.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                          <p className="font-semibold text-foreground">No health packages match current filters</p>
                          <p className="text-[11px] mt-0.5">Try changing your search query or reset filter</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPackages.map((pkg, idx) => {
                        const hasPendingEdit = editedRates[pkg.id] !== undefined;
                        const currentVal = hasPendingEdit
                          ? editedRates[pkg.id]
                          : pkg.custom_price !== null
                          ? String(pkg.custom_price)
                          : "";
                        const effectiveVal = hasPendingEdit
                          ? (currentVal === "" ? pkg.b2b_price_default : parseFloat(currentVal) || 0)
                          : pkg.effective_price;
                        const mrp = pkg.mrp || 0;
                        const marginPct = mrp > 0 && mrp >= effectiveVal ? Math.round(((mrp - effectiveVal) / mrp) * 100) : 0;

                        return (
                          <tr
                            key={pkg.id}
                            className={`transition-colors ${
                              hasPendingEdit
                                ? "bg-primary/5 font-medium"
                                : pkg.is_overridden
                                ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <td className="py-3.5 px-3.5 font-mono text-[11px] text-muted-foreground">{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground text-xs flex items-center gap-2">
                                <span>{pkg.name}</span>
                                {pkg.tests_count && (
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                    {pkg.tests_count} Tests Bundled
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/70">
                                  {pkg.test_code || "PKG-CODE"}
                                </span>
                                {pkg.description && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-sm">
                                    {pkg.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                {pkg.category || "Health Package"}
                              </span>
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono text-muted-foreground">
                              ₹{mrp.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-3.5 text-right font-mono text-muted-foreground text-[11px]">
                              ₹{pkg.b2b_price_default.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-muted-foreground text-xs">₹</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder={String(pkg.b2b_price_default)}
                                    value={currentVal}
                                    onChange={(e) => handleRateInputChange(pkg.id, e.target.value)}
                                    className={`h-8 pl-6 pr-2 text-right font-mono text-xs font-bold rounded-lg ${
                                      hasPendingEdit
                                        ? "border-primary ring-1 ring-primary bg-primary/10"
                                        : pkg.is_overridden
                                        ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                        : "border-border/80"
                                    }`}
                                  />
                                </div>
                                {currentVal !== "" && (
                                  <button
                                    type="button"
                                    onClick={() => handleRateInputChange(pkg.id, "")}
                                    className="text-[10px] text-muted-foreground hover:text-rose-600 p-1 rounded hover:bg-muted"
                                    title="Reset to default rate"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3.5 text-center">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                                {marginPct}% off MRP
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="table-responsive-container">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                      <th className="py-3 px-3.5 w-12">#</th>
                      <th className="py-3 px-4">Test Details</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3.5 text-right">Standard MRP</th>
                      <th className="py-3 px-3.5 text-right">Base B2B</th>
                      <th className="py-3 px-4 text-right font-extrabold text-primary min-w-[150px]">
                        Custom Rate for {selectedRateList?.name || "List"} (₹)
                      </th>
                      <th className="py-3 px-3.5 text-center">Wholesale Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <tr key={idx} className="animate-fade-in">
                          <td className="py-3 px-3.5"><div className="h-4 w-6 rounded shimmer-gradient" /></td>
                          <td className="py-3 px-4"><div className="h-4 w-36 rounded shimmer-gradient mb-1" /><div className="h-3 w-20 rounded shimmer-gradient" /></td>
                          <td className="py-3 px-3"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                          <td className="py-3 px-3.5 text-right"><div className="h-4 w-14 rounded shimmer-gradient ml-auto" /></td>
                          <td className="py-3 px-3.5 text-right"><div className="h-4 w-14 rounded shimmer-gradient ml-auto" /></td>
                          <td className="py-3 px-4 text-right"><div className="h-7 w-24 rounded shimmer-gradient ml-auto" /></td>
                          <td className="py-3 px-3.5 text-center"><div className="h-5 w-16 rounded-full shimmer-gradient mx-auto" /></td>
                        </tr>
                      ))
                    ) : paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                          <p className="font-semibold text-foreground">No tests match current filters</p>
                          <p className="text-[11px] mt-0.5">Try changing your search query or department filter</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((t, idx) => {
                        const rowNum = (currentPage - 1) * pageSize + idx + 1;
                        const hasPendingEdit = editedRates[t.id] !== undefined;
                        const currentVal = hasPendingEdit
                          ? editedRates[t.id]
                          : t.custom_price !== null
                          ? String(t.custom_price)
                          : "";
                        const effectiveVal = hasPendingEdit
                          ? (currentVal === "" ? t.b2b_price_default : parseFloat(currentVal) || 0)
                          : t.effective_price;
                        const mrp = t.mrp || 0;
                        const marginPct = mrp > 0 && mrp >= effectiveVal ? Math.round(((mrp - effectiveVal) / mrp) * 100) : 0;

                        return (
                          <tr
                            key={t.id}
                            className={`transition-colors ${
                              hasPendingEdit
                                ? "bg-primary/5 font-medium"
                                : t.is_overridden
                                ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <td className="py-3 px-3.5 font-mono text-[11px] text-muted-foreground">{rowNum}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground text-xs">{t.name}</div>
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/70">
                                {t.test_code || "TEST-CODE"}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                {t.category || "General"}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-muted-foreground">
                              ₹{mrp.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-muted-foreground text-[11px]">
                              ₹{t.b2b_price_default.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-muted-foreground text-xs">₹</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder={String(t.b2b_price_default)}
                                    value={currentVal}
                                    onChange={(e) => handleRateInputChange(t.id, e.target.value)}
                                    className={`h-8 pl-6 pr-2 text-right font-mono text-xs font-bold rounded-lg ${
                                      hasPendingEdit
                                        ? "border-primary ring-1 ring-primary bg-primary/10"
                                        : t.is_overridden
                                        ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                        : "border-border/80"
                                    }`}
                                  />
                                </div>
                                {currentVal !== "" && (
                                  <button
                                    type="button"
                                    onClick={() => handleRateInputChange(t.id, "")}
                                    className="text-[10px] text-muted-foreground hover:text-rose-600 p-1 rounded hover:bg-muted"
                                    title="Reset to default rate"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                                {marginPct}% off MRP
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} tests
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="px-2 font-mono font-bold text-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 px-2 text-xs"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: B2B PARTNER ASSIGNMENTS DIRECTORY */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "PARTNERS" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Assign Custom Rate Lists to B2B Partners
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each B2B client will automatically see and bill using the rate list assigned here.
              </p>
            </div>
            <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full border border-primary/20">
              {partners.length} B2B Accounts
            </span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="table-responsive-container">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    <th className="py-3 px-4">Partner Details</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Legacy Tier</th>
                    <th className="py-3 px-4">Assigned Rate List</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="font-semibold text-foreground">No B2B partner accounts registered yet</p>
                        <p className="text-[11px] mt-0.5">Create B2B partners in the Collection Centers tab</p>
                      </td>
                    </tr>
                  ) : (
                    partners.map((p) => {
                      const isAssigning = assigningPartnerId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-xs">{p.lab_name || p.name}</div>
                            <div className="text-[11px] text-muted-foreground">{p.name}</div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            <div>{p.phone || "—"}</div>
                            <div className="text-[10px] truncate max-w-[150px]">{p.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/70">
                              Tier {p.rate_tier || "HIGH"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const currentRateListId = p.rate_list_id ?? p.rateListId ?? "";
                                return (
                                  <select
                                    value={currentRateListId ? String(currentRateListId) : ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? null : Number(e.target.value);
                                      handleAssignPartner(p.id, val);
                                    }}
                                    disabled={isAssigning}
                                    className="h-8 px-2.5 rounded-xl bg-background border border-border/80 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary outline-none min-w-[200px]"
                                  >
                                    <option value="">Standard (Tier {p.rate_tier || p.rateTier || "HIGH"})</option>
                                    {rateLists.map((rl) => (
                                      <option key={rl.id} value={String(rl.id)}>
                                        {rl.name} ({rl.items_count || 0} custom rates)
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                              {isAssigning && <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {(p.rate_list_id || p.rateListId) ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                Custom List Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                Default Tier
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CREATE NEW RATE LIST */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateRateList}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Plus className="h-4 w-4 text-primary" />
                <span>Create New Custom Rate List</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create a named rate list to offer personalized pricing to one or more B2B clients.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Rate List Name: <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. SPECIAL TAJ, SARA CLINIC B2B"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  required
                  className="h-9 text-xs font-bold"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Description / Remarks:
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Special negotiated rate for Taj Hospital branch"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Initialize Starting Rates From:
                </label>
                <select
                  value={newListCloneSource}
                  onChange={(e) => setNewListCloneSource(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl bg-background border border-border/80 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="TIER_HIGH">High Tier (Standard High Rates)</option>
                  <option value="TIER_MEDIUM">Medium Tier (Standard Medium Rates)</option>
                  <option value="TIER_LOW">Low Tier (Standard Low Rates)</option>
                  <option value="TIER_MRP">Standard MRP (Full Price)</option>
                  <option value="NONE">Start Empty (Override on demand)</option>
                  {rateLists.map((rl) => (
                    <option key={rl.id} value={String(rl.id)}>
                      Copy From Existing: {rl.name} ({rl.items_count || 0} rates)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingList}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingList || !newListName.trim()}
                className="text-xs font-bold gradient-primary text-primary-foreground gap-1.5 shadow-sm"
              >
                {isCreatingList ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Create Rate List</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: 1-CLICK CLONE / DUPLICATE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!cloningList} onOpenChange={(open) => !open && setCloningList(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleCloneRateList}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Copy className="h-4 w-4 text-primary" />
                <span>Duplicate Rate List</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Creates a new rate list copying all custom test rates from &quot;{cloningList?.name}&quot;.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                New Rate List Name: <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                required
                className="h-9 text-xs font-bold"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCloningList(null)}
                disabled={isSubmittingClone}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingClone || !cloneName.trim()}
                className="text-xs font-bold gradient-primary text-primary-foreground gap-1.5 shadow-sm"
              >
                {isSubmittingClone ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Clone Now</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: RENAME RATE LIST */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!renamingList} onOpenChange={(open) => !open && setRenamingList(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleRenameRateList}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Edit3 className="h-4 w-4 text-primary" />
                <span>Rename Rate List</span>
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Name:
              </label>
              <Input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                required
                className="h-9 text-xs font-bold"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRenamingList(null)}
                disabled={isSubmittingRename}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingRename || !renameValue.trim()}
                className="text-xs font-bold gradient-primary text-primary-foreground gap-1.5 shadow-sm"
              >
                {isSubmittingRename ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save Name</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: DELETE CONFIRMATION */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!deletingList} onOpenChange={(open) => !open && setDeletingList(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <Trash2 className="h-4 w-4 text-rose-600" />
              <span>Delete Rate List?</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete &quot;{deletingList?.name}&quot;? Assigned B2B partners will safely revert to their standard default tier.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingList(null)}
              disabled={isSubmittingDelete}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteRateList}
              disabled={isSubmittingDelete}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              {isSubmittingDelete ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Confirm Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: BULK % DISCOUNT PRESET */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isBulkDiscountModalOpen} onOpenChange={setIsBulkDiscountModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Percent className="h-4 w-4 text-primary" />
              <span>
                Apply Bulk % Discount ({ratesSubTab === "PACKAGES" ? "Health Packages" : "Individual Tests"})
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sets a percentage discount off standard MRP for all{" "}
              {ratesSubTab === "PACKAGES"
                ? `${filteredPackages.length} health packages`
                : `${filteredTests.length} tests`}{" "}
              currently filtered.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Discount Percentage (% off MRP):
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={bulkDiscountPct}
                  onChange={(e) => setBulkDiscountPct(e.target.value)}
                  className="h-9 pr-8 text-xs font-bold font-mono"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground text-xs">%</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[25, 35, 40, 50, 60].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setBulkDiscountPct(String(pct))}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border/70 cursor-pointer"
                >
                  {pct}% Off
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDiscountModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyBulkDiscount}
              className="text-xs font-bold gradient-primary text-primary-foreground gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>
                Apply to {ratesSubTab === "PACKAGES" ? `${filteredPackages.length} Packages` : `${filteredTests.length} Tests`}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
