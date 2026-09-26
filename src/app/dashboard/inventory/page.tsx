"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Boxes, Plus, Search, Filter, AlertTriangle, ArrowUpDown,
  RefreshCw, Download, Calendar, ThermometerSnowflake,
  ShieldCheck, ShieldAlert, Sparkles, ChevronRight, X,
  Layers, Package, CheckCircle2, Clock, IndianRupee,
  MinusCircle, PlusCircle, Warehouse, Truck,
  FileSpreadsheet, ExternalLink, Info, AlertCircle, ArrowLeft
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface InventoryBatch {
  id: string;
  itemId: string;
  batchNo: string;
  expiryDate?: string | null;
  unitPurchasePrice: number;
  quantityReceived: number;
  quantityAvailable: number;
  vendorName?: string | null;
  invoiceNo?: string | null;
  locationShelf?: string | null;
  daysToExpiry?: number | null;
  expiryStatus: "safe" | "expiring_soon" | "expired" | "no_expiry";
}

interface InventoryItem {
  id: string;
  name: string;
  code: string;
  category: string;
  brand?: string | null;
  uom: string;
  minStockAlert: number;
  storageTemp?: string | null;
  locationShelf?: string | null;
  isActive: boolean;
  notes?: string | null;
  totalStock: number;
  totalValuation: number;
  stockStatus: "adequate" | "low_stock" | "out_of_stock";
  nearestExpiry?: string | null;
  batches?: InventoryBatch[];
}

interface InventoryMetrics {
  totalItems: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
}

const CONSUMPTION_REASONS = [
  "Daily Routine Testing Run",
  "Hematology Analyzer Processing",
  "Biochemistry Analyzer Run",
  "QC & Calibration Control Consumption",
  "Rapid Antigen / Dengue / Malaria Testing",
  "Accidental Spillage / Broken Vial",
  "Expired Lot Quarantine & Disposal",
  "Transfer to Branch Collection Center",
  "Other / Custom Reason",
];

export default function ViewInventoryPage() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalItems: 0,
    totalValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [coldStorageOnly, setColdStorageOnly] = useState(false);

  // Batch Detail Modal
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<InventoryItem | null>(null);

  // Quick Action Modal (Quick In or Quick Out)
  const [quickActionType, setQuickActionType] = useState<"in" | "out" | null>(null);
  const [quickActionItem, setQuickActionItem] = useState<InventoryItem | null>(null);
  const [quickQuantity, setQuickQuantity] = useState("");
  const [quickBatchNo, setQuickBatchNo] = useState("");
  const [quickExpiry, setQuickExpiry] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickReason, setQuickReason] = useState(CONSUMPTION_REASONS[0]);
  const [quickCustomReason, setQuickCustomReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetchFromLaravel("/inventory");
      if (res && res.status === "success" && res.data) {
        setItems(res.data.items || []);
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
        if (res.data.categories) {
          setCategories(res.data.categories);
        }
      }
    } catch (err: any) {
      console.error("Error loading inventory:", err);
      toast.error("Failed to load inventory data from server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.batches && item.batches.some((b) => b.batchNo.toLowerCase().includes(q)));

      const matchCategory = selectedCategory === "ALL" || item.category === selectedCategory;

      let matchStatus = true;
      if (selectedStatus === "adequate") matchStatus = item.stockStatus === "adequate";
      else if (selectedStatus === "low_stock") matchStatus = item.stockStatus === "low_stock";
      else if (selectedStatus === "out_of_stock") matchStatus = item.stockStatus === "out_of_stock";
      else if (selectedStatus === "expiring_soon") {
        matchStatus = Boolean(
          item.batches && item.batches.some((b) => b.expiryStatus === "expiring_soon")
        );
      }

      const matchCold = !coldStorageOnly || (item.storageTemp && item.storageTemp.includes("2°C"));

      return matchSearch && matchCategory && matchStatus && matchCold;
    });
  }, [items, search, selectedCategory, selectedStatus, coldStorageOnly]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      toast.error("No inventory data to export");
      return;
    }

    const headers = [
      "Item Code",
      "Item Name",
      "Category",
      "Brand",
      "Available Stock",
      "Unit (UOM)",
      "Min Alert Level",
      "Stock Status",
      "Storage Temp",
      "Shelf Location",
      "Est. Valuation (INR)",
      "Earliest Expiry",
    ];

    const rows = filteredItems.map((item) => [
      item.code || "",
      `"${item.name.replace(/"/g, '""')}"`,
      item.category,
      item.brand || "",
      item.totalStock,
      item.uom,
      item.minStockAlert,
      item.stockStatus,
      item.storageTemp || "Ambient",
      item.locationShelf || "",
      item.totalValuation.toFixed(2),
      item.nearestExpiry || "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `onepath_lab_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Inventory stock report exported successfully");
  };

  // Quick Action Handler (Clean empty defaults, no dummy values)
  const openQuickAction = (type: "in" | "out", item: InventoryItem) => {
    setQuickActionType(type);
    setQuickActionItem(item);
    setQuickQuantity("");
    setQuickBatchNo("");
    setQuickExpiry("");
    setQuickPrice("");
    setQuickReason(CONSUMPTION_REASONS[0]);
    setQuickCustomReason("");
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickActionItem || !quickActionType) return;

    const qty = parseInt(quickQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    setSubmittingAction(true);
    try {
      if (quickActionType === "in") {
        if (!quickBatchNo.trim()) {
          toast.error("Please enter a Batch / LOT number");
          setSubmittingAction(false);
          return;
        }

        const payload = {
          itemId: quickActionItem.id,
          item_id: quickActionItem.id,
          batchNo: quickBatchNo.trim(),
          batch_no: quickBatchNo.trim(),
          quantity: qty,
          expiryDate: quickExpiry || null,
          expiry_date: quickExpiry || null,
          unitPurchasePrice: quickPrice ? parseFloat(quickPrice) : 0,
          unit_purchase_price: quickPrice ? parseFloat(quickPrice) : 0,
          locationShelf: quickActionItem.locationShelf || null,
          location_shelf: quickActionItem.locationShelf || null,
        };

        const res = await fetchFromLaravel("/inventory/stock-in", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (res && res.status === "success") {
          toast.success(res.message || "Stock entered successfully");
          setQuickActionType(null);
          loadInventoryData(true);
        } else {
          toast.error(res?.message || "Failed to stock in");
        }
      } else {
        const finalReason = quickReason === "Other / Custom Reason"
          ? (quickCustomReason.trim() || "Daily Lab Consumption")
          : quickReason;

        const payload = {
          itemId: quickActionItem.id,
          item_id: quickActionItem.id,
          quantity: qty,
          reason: finalReason,
        };

        const res = await fetchFromLaravel("/inventory/stock-out", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (res && res.status === "success") {
          toast.success(res.message || "Stock consumed successfully");
          setQuickActionType(null);
          loadInventoryData(true);
        } else {
          toast.error(res?.message || "Failed to consume stock");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during stock update");
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-5 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Quick Actions (Full Width Edge-to-Edge) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5 w-full">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Pathology Stock &amp; Inventory
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Real-time stock balance, expiry monitoring, reagent lot tracking &amp; cold storage
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInventoryData(true)}
            disabled={refreshing || loading}
            className="h-9 sm:h-10 text-xs font-semibold gap-1.5 border-border/80"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 sm:h-10 text-xs font-semibold gap-1.5 border-border/80"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/dashboard/inventory/manage">
            <Button size="sm" className="h-9 sm:h-10 text-xs font-bold gap-1.5 gradient-primary shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Stock In &amp; Manage</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 KPI Metric Cards (Full Width Edge-to-Edge Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Items */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Catalog Items
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                  {loading ? "..." : metrics.totalItems}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active Pathology Stock
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Warehouse className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Valuation */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock Valuation
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 flex items-baseline">
                  <span className="text-lg font-bold text-muted-foreground mr-0.5">₹</span>
                  {loading
                    ? "..."
                    : Number(metrics.totalValuation || 0).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  At Purchase Cost
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card
          onClick={() => setSelectedStatus(selectedStatus === "low_stock" ? "ALL" : "low_stock")}
          className={`border-border/70 shadow-xs relative overflow-hidden cursor-pointer transition-all ${
            metrics.lowStockCount > 0
              ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30"
              : "bg-card/60"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Low Stock Reorder
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 flex items-center gap-2">
                  <span>{loading ? "..." : metrics.lowStockCount}</span>
                  {metrics.lowStockCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      Need PO
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      metrics.lowStockCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {metrics.outOfStockCount > 0 ? `${metrics.outOfStockCount} Out of Stock` : "At or below min threshold"}
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon (<30 Days) */}
        <Card
          onClick={() => setSelectedStatus(selectedStatus === "expiring_soon" ? "ALL" : "expiring_soon")}
          className={`border-border/70 shadow-xs relative overflow-hidden cursor-pointer transition-all ${
            metrics.expiringSoonCount > 0
              ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30"
              : "bg-card/60"
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Expiring Soon (30d)
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 flex items-center gap-2">
                  <span>{loading ? "..." : metrics.expiringSoonCount}</span>
                  {metrics.expiredCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {metrics.expiredCount} Expired
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      metrics.expiringSoonCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  Critical for Reagent Quality
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar (Full Width Responsive) */}
      <div className="space-y-3 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by reagent name, code, brand, batch LOT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs sm:text-sm bg-card border-border/80 focus-visible:ring-primary/40 w-full"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="adequate">🟢 Adequate Stock</option>
              <option value="low_stock">🟡 Low Stock Warning</option>
              <option value="out_of_stock">🔴 Out of Stock</option>
              <option value="expiring_soon">⏰ Expiring in 30 Days</option>
            </select>

            {/* Cold Chain Toggle */}
            <Button
              type="button"
              variant={coldStorageOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setColdStorageOnly(!coldStorageOnly)}
              className={`h-10 text-xs font-semibold gap-1.5 ${
                coldStorageOnly
                  ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600"
                  : "border-border/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ThermometerSnowflake className="h-4 w-4" />
              <span>Cold Chain (2-8°C)</span>
            </Button>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
              }`}
            >
              All Categories ({items.length})
            </button>
            {categories.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock Items Display (Desktop Spacious Table + Mobile/Tablet Card Layout) */}
      <div className="w-full space-y-4">
        {/* DESKTOP VIEW (Visible on screens >= 1024px) */}
        <Card className="border-border/70 shadow-xs overflow-hidden bg-card/60 backdrop-blur-xs w-full hidden lg:block">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[1150px]">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 w-[24%] min-w-[230px]">Item &amp; Specifications</th>
                  <th className="py-3.5 px-3 w-[10%] min-w-[100px]">Category</th>
                  <th className="py-3.5 px-3 w-[15%] min-w-[150px]">Storage / Location</th>
                  <th className="py-3.5 px-3 w-[11%] min-w-[110px] text-right">Available Stock</th>
                  <th className="py-3.5 px-3 w-[11%] min-w-[110px] text-center">Status</th>
                  <th className="py-3.5 px-3 w-[17%] min-w-[170px]">Active Batches (LOT)</th>
                  <th className="py-3.5 px-3 w-[9%] min-w-[90px] text-right">Valuation</th>
                  <th className="py-3.5 px-4 min-w-[180px] text-center">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs font-medium">Loading pathology inventory stock...</p>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  /* Clean Empty State */
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto p-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                          <Boxes className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-foreground">Laboratory Inventory is Empty</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            No reagents, test kits, or consumables have been added yet. Start by creating catalog items and recording stock inward entries.
                          </p>
                        </div>
                        <Link href="/dashboard/inventory/manage">
                          <Button size="sm" className="mt-2 text-xs font-bold gradient-primary shadow-xs gap-1.5 h-10 px-5">
                            <Plus className="h-4 w-4" />
                            <span>+ Add First Item / Stock In</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  /* Filter result empty */
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Boxes className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-semibold text-foreground">No stock items match your search</p>
                        <p className="text-xs text-muted-foreground">
                          Try resetting your search filters or clear the active query.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setSelectedCategory("ALL");
                            setSelectedStatus("ALL");
                            setColdStorageOnly(false);
                          }}
                          className="mt-2 text-xs"
                        >
                          Reset All Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isCold = item.storageTemp?.includes("2°C");
                    const activeBatchesCount = item.batches ? item.batches.length : 0;

                    return (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors group">
                        {/* Item & Specifications */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground text-sm leading-snug">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {item.code && (
                                  <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-muted border border-border/70 text-foreground">
                                    {item.code}
                                  </span>
                                )}
                                {item.brand && (
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    · {item.brand}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-foreground border border-border/60 whitespace-nowrap">
                            {item.category}
                          </span>
                        </td>

                        {/* Storage / Location */}
                        <td className="py-3.5 px-3 text-xs">
                          <div className="space-y-1">
                            {isCold ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 whitespace-nowrap">
                                <ThermometerSnowflake className="h-3 w-3 shrink-0" />
                                <span>2°C - 8°C (Cold Chain)</span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                                {item.storageTemp || "Ambient (15-25°C)"}
                              </div>
                            )}
                            {item.locationShelf && (
                              <div className="text-[11px] text-muted-foreground/90 font-medium flex items-center gap-1">
                                <span>📍</span>
                                <span className="truncate max-w-[130px]">{item.locationShelf}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Available Stock */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-extrabold text-base text-foreground leading-none">
                            {item.totalStock}{" "}
                            <span className="text-xs font-semibold text-muted-foreground">{item.uom}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground/80 mt-1 font-medium">
                            Min Alert: {item.minStockAlert}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          {item.stockStatus === "adequate" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Adequate
                            </span>
                          )}
                          {item.stockStatus === "low_stock" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                              <AlertTriangle className="h-3 w-3" />
                              Low Stock
                            </span>
                          )}
                          {item.stockStatus === "out_of_stock" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
                              <MinusCircle className="h-3 w-3" />
                              Out of Stock
                            </span>
                          )}
                        </td>

                        {/* Active Batches (LOT) */}
                        <td className="py-3.5 px-3 text-xs">
                          {item.batches && item.batches.length > 0 ? (
                            <div className="space-y-1.5">
                              {item.batches.slice(0, 2).map((batch) => (
                                <div key={batch.id} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-muted/80 border border-border/70 text-foreground whitespace-nowrap">
                                    LOT: {batch.batchNo}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                                    ({batch.quantityAvailable} left)
                                  </span>
                                  {batch.expiryStatus === "expiring_soon" && (
                                    <span className="text-[9.5px] font-sans font-extrabold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap">
                                      Expiring
                                    </span>
                                  )}
                                </div>
                              ))}
                              {activeBatchesCount > 2 && (
                                <button
                                  onClick={() => setSelectedItemForDetails(item)}
                                  className="text-[11px] text-primary hover:underline font-semibold"
                                >
                                  +{activeBatchesCount - 2} more lots...
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/75 italic">No active lots</span>
                          )}
                        </td>

                        {/* Valuation */}
                        <td className="py-3.5 px-3 text-right text-xs">
                          <div className="font-black text-sm text-foreground">
                            ₹{Number(item.totalValuation || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </div>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openQuickAction("in", item)}
                              title="Quick Stock In"
                              className="h-8 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 gap-1 shadow-2xs"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>+In</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={item.totalStock <= 0}
                              onClick={() => openQuickAction("out", item)}
                              title="Quick Stock Out (Consume)"
                              className="h-8 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30 gap-1 shadow-2xs disabled:opacity-40"
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                              <span>-Out</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedItemForDetails(item)}
                              title="View all batches & details"
                              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Info className="h-3.5 w-3.5 mr-1" />
                              <span>Lots ({activeBatchesCount})</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* MOBILE & TABLET CARD VIEW (Visible on screens < 1024px) */}
        <div className="block lg:hidden space-y-3.5 w-full">
          {loading ? (
            <Card className="p-8 text-center border-border/70 bg-card/60">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading pathology inventory stock...</p>
            </Card>
          ) : items.length === 0 ? (
            <Card className="p-8 text-center border-border/70 bg-card/60">
              <Boxes className="h-10 w-10 text-primary/60 mx-auto mb-2" />
              <h3 className="font-bold text-foreground text-sm">Laboratory Inventory is Empty</h3>
              <p className="text-xs text-muted-foreground mt-1">Start by adding your first reagent or consumable.</p>
              <Link href="/dashboard/inventory/manage">
                <Button size="sm" className="mt-3 text-xs font-bold gradient-primary">
                  + Add First Item / Stock In
                </Button>
              </Link>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="p-8 text-center border-border/70 bg-card/60">
              <Boxes className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">No stock items match your search</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("ALL");
                  setSelectedStatus("ALL");
                  setColdStorageOnly(false);
                }}
                className="mt-2 text-xs"
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            filteredItems.map((item) => {
              const isCold = item.storageTemp?.includes("2°C");
              const activeBatchesCount = item.batches ? item.batches.length : 0;

              return (
                <Card key={item.id} className="border-border/70 shadow-xs bg-card/60 backdrop-blur-xs overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header Row: Icon, Name, Code, Brand, Category, Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-foreground text-sm leading-snug">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {item.code && (
                              <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-muted border border-border/60 text-foreground">
                                {item.code}
                              </span>
                            )}
                            {item.brand && (
                              <span className="text-[11px] text-muted-foreground font-medium">
                                · {item.brand}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-muted text-foreground border border-border/60">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {item.stockStatus === "adequate" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Adequate
                          </span>
                        )}
                        {item.stockStatus === "low_stock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </span>
                        )}
                        {item.stockStatus === "out_of_stock" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
                            <MinusCircle className="h-3 w-3" />
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics 4-Column Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-border/50 text-xs">
                      {/* Available Stock */}
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Available Stock
                        </span>
                        <span className="font-black text-base text-foreground mt-0.5 block leading-tight">
                          {item.totalStock}{" "}
                          <span className="text-xs font-semibold text-muted-foreground">{item.uom}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                          Min Alert: {item.minStockAlert}
                        </span>
                      </div>

                      {/* Storage / Shelf */}
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Storage / Shelf
                        </span>
                        <div className="mt-1">
                          {isCold ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                              <ThermometerSnowflake className="h-2.5 w-2.5" />
                              2-8°C Cold Chain
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-foreground">
                              {item.storageTemp || "Ambient"}
                            </span>
                          )}
                          {item.locationShelf && (
                            <span className="text-[10.5px] text-muted-foreground block truncate mt-0.5 font-medium">
                              📍 {item.locationShelf}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Batches */}
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Active LOT (Batches)
                        </span>
                        <div className="mt-1">
                          {item.batches && item.batches.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-mono text-[10.5px] font-bold text-foreground">
                                  {item.batches[0].batchNo}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({item.batches[0].quantityAvailable} left)
                                </span>
                              </div>
                              {activeBatchesCount > 1 && (
                                <button
                                  onClick={() => setSelectedItemForDetails(item)}
                                  className="text-[10.5px] text-primary hover:underline font-semibold block"
                                >
                                  +{activeBatchesCount - 1} more lots
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">No lots</span>
                          )}
                        </div>
                      </div>

                      {/* Valuation */}
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Est. Valuation
                        </span>
                        <span className="font-black text-base text-foreground mt-0.5 block leading-tight">
                          ₹{Number(item.totalValuation || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                          {activeBatchesCount} batch(es)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQuickAction("in", item)}
                        className="flex-1 h-9 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 gap-1.5"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>+ Stock In</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={item.totalStock <= 0}
                        onClick={() => openQuickAction("out", item)}
                        className="flex-1 h-9 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30 gap-1.5 disabled:opacity-40"
                      >
                        <MinusCircle className="h-4 w-4" />
                        <span>- Consume</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItemForDetails(item)}
                        className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="View LOT details"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer info */}
        {items.length > 0 && (
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 w-full">
            <div>
              Showing <span className="font-bold text-foreground">{filteredItems.length}</span> of{" "}
              <span className="font-bold text-foreground">{items.length}</span> items
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Adequate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Low Stock
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Expiring / Out
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      <Dialog
        open={Boolean(selectedItemForDetails)}
        onOpenChange={(open) => {
          if (!open) setSelectedItemForDetails(null);
        }}
      >
        <DialogContent className="max-w-2xl w-full bg-card border border-border/80 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <span>{selectedItemForDetails?.name}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-1">
            Category: {selectedItemForDetails?.category} · Code: {selectedItemForDetails?.code || "N/A"} · Total Available:{" "}
            <strong className="text-foreground">
              {selectedItemForDetails?.totalStock} {selectedItemForDetails?.uom}
            </strong>
          </DialogDescription>

          <div className="mt-4 space-y-4">
            <div className="border border-border/70 rounded-xl overflow-hidden">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                  <thead className="bg-muted/60 sticky top-0 border-b border-border/70 font-bold text-muted-foreground uppercase text-[10.5px]">
                    <tr>
                      <th className="py-2.5 px-3">Batch / LOT No</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3">Vendor / Invoice</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {selectedItemForDetails?.batches && selectedItemForDetails.batches.length > 0 ? (
                      selectedItemForDetails.batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                            {batch.batchNo}
                          </td>
                          <td className="py-2.5 px-3">
                            {batch.expiryDate ? (
                              <div className="space-y-0.5">
                                <div>{batch.expiryDate}</div>
                                {batch.daysToExpiry !== null && batch.daysToExpiry !== undefined && (
                                  <div
                                    className={`text-[10px] font-bold ${
                                      batch.daysToExpiry < 0
                                        ? "text-rose-600"
                                        : batch.daysToExpiry <= 30
                                        ? "text-amber-600"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {batch.daysToExpiry < 0
                                      ? "Expired"
                                      : `${batch.daysToExpiry} days remaining`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">No expiry</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                            {batch.quantityAvailable} {selectedItemForDetails.uom}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            ₹{Number(batch.unitPurchasePrice || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            <div>{batch.vendorName || "—"}</div>
                            {batch.invoiceNo && (
                              <div className="text-[10px] font-mono text-muted-foreground/75">
                                Inv: {batch.invoiceNo}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {batch.expiryStatus === "expired" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                Expired
                              </span>
                            ) : batch.expiryStatus === "expiring_soon" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                Expiring
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                          No active batches for this item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link href={`/dashboard/inventory/manage?item=${selectedItemForDetails?.id}`}>
                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1 h-9">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in Stock Management</span>
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedItemForDetails(null)}
                className="text-xs font-semibold h-9"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Action Modal (Quick In or Out with Clean User Placeholders) */}
      <Dialog
        open={Boolean(quickActionType && quickActionItem)}
        onOpenChange={(open) => {
          if (!open) setQuickActionType(null);
        }}
      >
        <DialogContent className="max-w-md w-full bg-card border border-border/80 shadow-2xl p-5 sm:p-6">
          <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2">
            {quickActionType === "in" ? (
              <>
                <PlusCircle className="h-5 w-5 text-primary" />
                <span>Quick Stock Inward Entry</span>
              </>
            ) : (
              <>
                <MinusCircle className="h-5 w-5 text-amber-600" />
                <span>Quick Stock Consumption</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-1">
            Item: <strong className="text-foreground">{quickActionItem?.name}</strong> · Available:{" "}
            <strong>
              {quickActionItem?.totalStock} {quickActionItem?.uom}
            </strong>
          </DialogDescription>

          <form onSubmit={handleQuickSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="text-xs font-bold text-foreground">
                Quantity ({quickActionItem?.uom}) *
              </label>
              <Input
                type="number"
                min="1"
                required
                value={quickQuantity}
                onChange={(e) => setQuickQuantity(e.target.value)}
                className="mt-1 h-10 text-xs sm:text-sm font-bold bg-card"
                placeholder={quickActionType === "in" ? "Enter received quantity" : "Enter quantity to deduct"}
              />
            </div>

            {quickActionType === "in" ? (
              <>
                <div>
                  <label className="text-xs font-bold text-foreground">Batch / LOT Number *</label>
                  <Input
                    type="text"
                    required
                    value={quickBatchNo}
                    onChange={(e) => setQuickBatchNo(e.target.value)}
                    className="mt-1 h-10 text-xs sm:text-sm font-mono uppercase bg-card"
                    placeholder="Enter LOT or Batch number"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">Expiry Date</label>
                    <Input
                      type="date"
                      value={quickExpiry}
                      onChange={(e) => setQuickExpiry(e.target.value)}
                      className="mt-1 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Unit Purchase Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quickPrice}
                      onChange={(e) => setQuickPrice(e.target.value)}
                      className="mt-1 h-10 text-xs sm:text-sm bg-card"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-foreground">Consumption Reason *</label>
                  <select
                    value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    {CONSUMPTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {quickReason === "Other / Custom Reason" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-foreground">Specify Reason *</label>
                    <Input
                      type="text"
                      required
                      value={quickCustomReason}
                      onChange={(e) => setQuickCustomReason(e.target.value)}
                      placeholder="Enter custom consumption reason"
                      className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuickActionType(null)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingAction}
                className="text-xs font-bold gradient-primary h-9 px-5"
              >
                {submittingAction
                  ? "Processing..."
                  : quickActionType === "in"
                  ? "Save Stock In"
                  : "Deduct Stock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

