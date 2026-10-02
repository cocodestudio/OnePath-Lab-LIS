"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Boxes, Plus, Search, Check, Edit2, Trash2, Tag, IndianRupee,
  FlaskConical, CheckCircle2, AlertCircle, X, ChevronRight,
  ChevronLeft, RefreshCw, Sparkles, Layers, FileSpreadsheet,
  ArrowDownLeft, ArrowUpRight, History, Sliders, Warehouse,
  Truck, Building2, Phone, Mail, FileText, ArrowLeft,
  Calendar, ThermometerSnowflake, ShieldCheck, AlertTriangle, Package,
  Settings2, PlusCircle
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  status: string;
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
  stockStatus: string;
  batches?: InventoryBatch[];
}

interface InventoryVendor {
  id: string;
  companyName: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
}

const DEFAULT_CATEGORIES = [
  "Reagent",
  "Rapid Kit",
  "Vacutainer / Blood Tube",
  "Consumable",
  "Glassware",
  "Controls / Calibrator",
  "Chemical / Stain",
  "Safety / PPE",
  "Culture Media / Microbiology",
  "Molecular Diagnostics",
];

const DEFAULT_STORAGE_TEMPS = [
  "2°C - 8°C (Cold Chain / Refrigerator)",
  "15°C - 25°C (Controlled Room Temp)",
  "-20°C (Deep Freezer)",
  "-80°C (Ultra Deep Freezer)",
  "Ambient / Dry Storage (Below 30°C)",
];

const DEFAULT_COMMON_UOMS = [
  "Units",
  "Pcs",
  "Vial (5ml)",
  "Vial (10ml)",
  "Bottle (100ml)",
  "Bottle (500ml)",
  "Bottle (1000ml)",
  "Box (50 Pcs)",
  "Box (100 Pcs)",
  "Kit (50 Tests)",
  "Kit (100 Tests)",
  "Can (20 Liters)",
  "Canister (100 Strips)",
  "Pack of 25",
  "Pack of 50",
  "Pack of 100",
  "Tubes (Pack of 100)",
];

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

const ADJUSTMENT_REASONS = [
  "Physical audit count reconciliation",
  "Damaged / Broken container write-off",
  "Expired batch quarantine & disposal",
  "Spillage / Evaporation loss",
  "Inward count correction",
  "Other / Custom Reason",
];

export default function ManageInventoryPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams?.get("item");

  // Removed audit ledger tab as requested
  const [activeTab, setActiveTab] = useState<"stock_in" | "stock_out" | "adjustment" | "items" | "vendors">("stock_in");

  // Master Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<InventoryVendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Custom Options (Categories, UOMs, Storage Temps) with localStorage persistence
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customUoms, setCustomUoms] = useState<string[]>([]);
  const [customTemps, setCustomTemps] = useState<string[]>([]);

  // Modal for adding custom Category, UOM, or Storage Temp
  const [isCustomOptionModalOpen, setIsCustomOptionModalOpen] = useState(false);
  const [customOptionType, setCustomOptionType] = useState<"category" | "uom" | "temp">("category");
  const [customOptionInput, setCustomOptionInput] = useState("");

  // Load custom options from localStorage on mount
  useEffect(() => {
    try {
      const savedCats = localStorage.getItem("lis_custom_inventory_categories");
      if (savedCats) setCustomCategories(JSON.parse(savedCats));

      const savedUoms = localStorage.getItem("lis_custom_inventory_uoms");
      if (savedUoms) setCustomUoms(JSON.parse(savedUoms));

      const savedTemps = localStorage.getItem("lis_custom_inventory_temps");
      if (savedTemps) setCustomTemps(JSON.parse(savedTemps));
    } catch (e) {
      console.error("Failed to load custom inventory options from localStorage", e);
    }
  }, []);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories]));
  }, [customCategories]);

  const allUoms = useMemo(() => {
    return Array.from(new Set([...DEFAULT_COMMON_UOMS, ...customUoms]));
  }, [customUoms]);

  const allStorageTemps = useMemo(() => {
    return Array.from(new Set([...DEFAULT_STORAGE_TEMPS, ...customTemps]));
  }, [customTemps]);

  // Open Quick Add Modal for Category / UOM / Temp
  const handleOpenAddCustom = (type: "category" | "uom" | "temp") => {
    setCustomOptionType(type);
    setCustomOptionInput("");
    setIsCustomOptionModalOpen(true);
  };

  const handleSaveCustomOption = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customOptionInput.trim();
    if (!val) {
      toast.error("Please enter a valid name");
      return;
    }

    try {
      if (customOptionType === "category") {
        if (!allCategories.includes(val)) {
          const updated = [...customCategories, val];
          setCustomCategories(updated);
          localStorage.setItem("lis_custom_inventory_categories", JSON.stringify(updated));
        }
        setItemCategory(val);
        toast.success(`Category "${val}" added & selected!`);
      } else if (customOptionType === "uom") {
        if (!allUoms.includes(val)) {
          const updated = [...customUoms, val];
          setCustomUoms(updated);
          localStorage.setItem("lis_custom_inventory_uoms", JSON.stringify(updated));
        }
        setItemUom(val);
        toast.success(`Unit of measure "${val}" added & selected!`);
      } else if (customOptionType === "temp") {
        if (!allStorageTemps.includes(val)) {
          const updated = [...customTemps, val];
          setCustomTemps(updated);
          localStorage.setItem("lis_custom_inventory_temps", JSON.stringify(updated));
        }
        setItemStorageTemp(val);
        toast.success(`Storage temperature "${val}" added & selected!`);
      }
      setIsCustomOptionModalOpen(false);
      setCustomOptionInput("");
    } catch (e) {
      toast.error("Failed to save custom option");
    }
  };

  // 1. Stock In Form State
  const [inItemId, setInItemId] = useState("");
  const [inBatchNo, setInBatchNo] = useState("");
  const [inQuantity, setInQuantity] = useState("");
  const [inPrice, setInPrice] = useState("");
  const [inExpiry, setInExpiry] = useState("");
  const [inVendorName, setInVendorName] = useState("");
  const [inInvoiceNo, setInInvoiceNo] = useState("");
  const [inShelf, setInShelf] = useState("");
  const [inNotes, setInNotes] = useState("");
  const [submittingIn, setSubmittingIn] = useState(false);

  // 2. Stock Out Form State
  const [outItemId, setOutItemId] = useState("");
  const [outBatchId, setOutBatchId] = useState("");
  const [outQuantity, setOutQuantity] = useState("");
  const [outReason, setOutReason] = useState(CONSUMPTION_REASONS[0]);
  const [outCustomReason, setOutCustomReason] = useState("");
  const [outNotes, setOutNotes] = useState("");
  const [submittingOut, setSubmittingOut] = useState(false);

  // 3. Adjustment Form State
  const [adjItemId, setAdjItemId] = useState("");
  const [adjBatchId, setAdjBatchId] = useState("");
  const [adjNewQty, setAdjNewQty] = useState("");
  const [adjReason, setAdjReason] = useState(ADJUSTMENT_REASONS[0]);
  const [adjCustomReason, setAdjCustomReason] = useState("");
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // 4. Item Master Form State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemCategory, setItemCategory] = useState("Reagent");
  const [itemBrand, setItemBrand] = useState("");
  const [itemUom, setItemUom] = useState("Units");
  const [itemMinStock, setItemMinStock] = useState("5");
  const [itemStorageTemp, setItemStorageTemp] = useState("15°C - 25°C (Controlled Room Temp)");
  const [itemShelf, setItemShelf] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [submittingItem, setSubmittingItem] = useState(false);

  // 5. Vendor Form State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorCompany, setVendorCompany] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [submittingVendor, setSubmittingVendor] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [invRes, vndRes] = await Promise.all([
        fetchFromLaravel("/inventory"),
        fetchFromLaravel("/inventory/vendors"),
      ]);

      if (invRes && invRes.status === "success") {
        const loadedItems = invRes.data.items || [];
        setItems(loadedItems);

        // Preselect item if query param was passed
        if (preselectedItemId) {
          const match = loadedItems.find((i: any) => i.id === preselectedItemId);
          if (match) {
            setInItemId(match.id);
            setOutItemId(match.id);
            setAdjItemId(match.id);
          }
        } else if (loadedItems.length > 0 && !inItemId) {
          setInItemId(loadedItems[0].id);
          setOutItemId(loadedItems[0].id);
          setAdjItemId(loadedItems[0].id);
        }
      }

      if (vndRes && vndRes.status === "success") {
        setVendors(vndRes.data || []);
      }
    } catch (err: any) {
      console.error("Error loading manage inventory data:", err);
      toast.error("Failed to load inventory management data");
    } finally {
      setLoading(false);
    }
  };

  // Selected Item details for stock in
  const selectedInItem = useMemo(() => {
    return items.find((i) => i.id === inItemId);
  }, [items, inItemId]);

  // Selected Item details for stock out
  const selectedOutItem = useMemo(() => {
    return items.find((i) => i.id === outItemId);
  }, [items, outItemId]);

  // Selected Item details for adjustment
  const selectedAdjItem = useMemo(() => {
    return items.find((i) => i.id === adjItemId);
  }, [items, adjItemId]);

  // Auto-fill shelf for stock-in when item changes
  useEffect(() => {
    if (selectedInItem?.locationShelf && !inShelf) {
      setInShelf(selectedInItem.locationShelf);
    }
  }, [selectedInItem]);

  // Auto-select batch for stock-out
  useEffect(() => {
    if (selectedOutItem?.batches && selectedOutItem.batches.length > 0) {
      setOutBatchId(selectedOutItem.batches[0].id);
    } else {
      setOutBatchId("");
    }
  }, [selectedOutItem]);

  // Auto-select batch for adjustment
  useEffect(() => {
    if (selectedAdjItem?.batches && selectedAdjItem.batches.length > 0) {
      setAdjBatchId(selectedAdjItem.batches[0].id);
      setAdjNewQty(String(selectedAdjItem.batches[0].quantityAvailable));
    } else {
      setAdjBatchId("");
      setAdjNewQty("0");
    }
  }, [selectedAdjItem]);

  // Update adjustment quantity input when batch selection changes
  const handleAdjBatchChange = (batchId: string) => {
    setAdjBatchId(batchId);
    const b = selectedAdjItem?.batches?.find((x) => x.id === batchId);
    if (b) {
      setAdjNewQty(String(b.quantityAvailable));
    }
  };

  // Selected Batch for Adjustment Details
  const selectedAdjBatch = useMemo(() => {
    if (!selectedAdjItem || !adjBatchId) return null;
    return selectedAdjItem.batches?.find((b) => b.id === adjBatchId) || null;
  }, [selectedAdjItem, adjBatchId]);

  // Calculated Variance for Adjustment
  const adjustmentVariance = useMemo(() => {
    if (!selectedAdjBatch) return null;
    const current = selectedAdjBatch.quantityAvailable || 0;
    const entered = parseInt(adjNewQty, 10);
    if (isNaN(entered)) return null;
    return entered - current;
  }, [selectedAdjBatch, adjNewQty]);

  // 1. Submit Stock In
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inItemId) {
      toast.error("Please select an item");
      return;
    }
    if (!inBatchNo.trim()) {
      toast.error("Please enter a Batch / LOT number");
      return;
    }
    const qty = parseInt(inQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    setSubmittingIn(true);
    try {
      const payload = {
        itemId: inItemId,
        item_id: inItemId,
        batchNo: inBatchNo.trim(),
        batch_no: inBatchNo.trim(),
        quantity: qty,
        unitPurchasePrice: inPrice ? parseFloat(inPrice) : 0,
        unit_purchase_price: inPrice ? parseFloat(inPrice) : 0,
        expiryDate: inExpiry || null,
        expiry_date: inExpiry || null,
        vendorName: inVendorName || null,
        vendor_name: inVendorName || null,
        invoiceNo: inInvoiceNo.trim() || null,
        invoice_no: inInvoiceNo.trim() || null,
        locationShelf: inShelf.trim() || null,
        location_shelf: inShelf.trim() || null,
        notes: inNotes.trim() || null,
      };

      const res = await fetchFromLaravel("/inventory/stock-in", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status === "success") {
        toast.success(res.message || "Stock entered successfully!");
        setInBatchNo("");
        setInQuantity("");
        setInPrice("");
        setInInvoiceNo("");
        setInNotes("");
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to stock in");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmittingIn(false);
    }
  };

  // 2. Submit Stock Out
  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outItemId) {
      toast.error("Please select an item");
      return;
    }
    const qty = parseInt(outQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const finalReason = outReason === "Other / Custom Reason"
      ? (outCustomReason.trim() || "Lab Consumption")
      : outReason;

    setSubmittingOut(true);
    try {
      const payload = {
        itemId: outItemId,
        item_id: outItemId,
        batchId: outBatchId || null,
        batch_id: outBatchId || null,
        quantity: qty,
        reason: finalReason,
        notes: outNotes.trim() || null,
      };

      const res = await fetchFromLaravel("/inventory/stock-out", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status === "success") {
        toast.success(res.message || "Stock consumed successfully");
        setOutQuantity("");
        setOutNotes("");
        setOutCustomReason("");
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to consume stock");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmittingOut(false);
    }
  };

  // 3. Submit Adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjItemId || !adjBatchId) {
      toast.error("Please select an item and batch to adjust");
      return;
    }
    const newQty = parseInt(adjNewQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      toast.error("Please enter a valid quantity (0 or greater)");
      return;
    }

    const finalReason = adjReason === "Other / Custom Reason"
      ? (adjCustomReason.trim() || "Physical audit reconciliation")
      : adjReason;

    setSubmittingAdj(true);
    try {
      const payload = {
        itemId: adjItemId,
        item_id: adjItemId,
        batchId: adjBatchId,
        batch_id: adjBatchId,
        newQuantity: newQty,
        new_quantity: newQty,
        reason: finalReason,
      };

      const res = await fetchFromLaravel("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status === "success") {
        toast.success(res.message || "Stock adjusted successfully");
        setAdjCustomReason("");
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to adjust stock");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmittingAdj(false);
    }
  };

  // 4. Open Item Modal
  const openCreateItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemCode("");
    setItemCategory(allCategories[0] || "Reagent");
    setItemBrand("");
    setItemUom(allUoms[0] || "Units");
    setItemMinStock("5");
    setItemStorageTemp(allStorageTemps[0] || "15°C - 25°C (Controlled Room Temp)");
    setItemShelf("");
    setItemNotes("");
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCode(item.code || "");
    setItemCategory(item.category);
    setItemBrand(item.brand || "");
    setItemUom(item.uom);
    setItemMinStock(String(item.minStockAlert));
    setItemStorageTemp(item.storageTemp || allStorageTemps[0]);
    setItemShelf(item.locationShelf || "");
    setItemNotes(item.notes || "");
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }

    setSubmittingItem(true);
    try {
      const payload = {
        name: itemName.trim(),
        code: itemCode.trim() || undefined,
        category: itemCategory,
        brand: itemBrand.trim() || null,
        uom: itemUom,
        minStockAlert: parseInt(itemMinStock, 10) || 5,
        min_stock_alert: parseInt(itemMinStock, 10) || 5,
        storageTemp: itemStorageTemp,
        storage_temp: itemStorageTemp,
        locationShelf: itemShelf.trim() || null,
        location_shelf: itemShelf.trim() || null,
        notes: itemNotes.trim() || null,
      };

      let res;
      if (editingItem) {
        res = await fetchFromLaravel(`/inventory/items/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchFromLaravel("/inventory/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (res && res.status === "success") {
        toast.success(res.message || "Item saved successfully");
        setIsItemModalOpen(false);
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to save item");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to deactivate/delete "${item.name}"?`)) {
      return;
    }
    try {
      const res = await fetchFromLaravel(`/inventory/items/${item.id}`, {
        method: "DELETE",
      });
      if (res && res.status === "success") {
        toast.success("Item removed successfully");
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to remove item");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    }
  };

  // 5. Vendor Handlers
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorCompany.trim() || !vendorContact.trim()) {
      toast.error("Company name and contact person are required");
      return;
    }

    setSubmittingVendor(true);
    try {
      const payload = {
        companyName: vendorCompany.trim(),
        company_name: vendorCompany.trim(),
        name: vendorContact.trim(),
        phone: vendorPhone.trim() || null,
        email: vendorEmail.trim() || null,
        gstin: vendorGstin.trim() || null,
        address: vendorAddress.trim() || null,
      };

      const res = await fetchFromLaravel("/inventory/vendors", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status === "success") {
        toast.success("Vendor registered successfully");
        setIsVendorModalOpen(false);
        setVendorCompany("");
        setVendorContact("");
        setVendorPhone("");
        setVendorEmail("");
        setVendorGstin("");
        setVendorAddress("");
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to register vendor");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmittingVendor(false);
    }
  };

  const handleDeleteVendor = async (vendor: InventoryVendor) => {
    if (!confirm(`Are you sure you want to delete vendor "${vendor.companyName}"?`)) {
      return;
    }
    try {
      const res = await fetchFromLaravel(`/inventory/vendors/${vendor.id}`, {
        method: "DELETE",
      });
      if (res && res.status === "success") {
        toast.success("Vendor deleted successfully");
        loadAllData();
      } else {
        toast.error(res?.message || "Failed to delete vendor");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    }
  };

  // Filtered items in master catalog
  const filteredCatalogItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code?.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  return (
    <div className="w-full min-w-0 space-y-5 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb (Full Width Edge-to-Edge) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
            <Link href="/dashboard/inventory" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Back to View Inventory</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Stock Operations &amp; Management</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Manage Laboratory Inventory
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Purchase inward entries, consumption logging, physical count reconciliation &amp; vendor catalog
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Link href="/dashboard/inventory">
            <Button variant="outline" size="sm" className="h-9 sm:h-10 text-xs font-semibold gap-1.5 border-border/80">
              <Boxes className="h-4 w-4" />
              <span>View Stock Overview</span>
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={openCreateItem}
            className="h-9 sm:h-10 text-xs font-bold gap-1.5 gradient-primary shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Item</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (5 Tabs - Audit Ledger Removed, Edge-to-Edge Responsive) */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/70 pb-2 scrollbar-none w-full">
        <button
          onClick={() => setActiveTab("stock_in")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "stock_in"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          <span>1. Stock In (Purchase Entry)</span>
        </button>

        <button
          onClick={() => setActiveTab("stock_out")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "stock_out"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-4 w-4 text-amber-400" />
          <span>2. Stock Out (Consumption)</span>
        </button>

        <button
          onClick={() => setActiveTab("adjustment")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "adjustment"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <Sliders className="h-4 w-4 text-sky-400" />
          <span>3. Physical Audit Adjustment</span>
        </button>

        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "items"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <Package className="h-4 w-4 text-violet-400" />
          <span>4. Catalog Master ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("vendors")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "vendors"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <Truck className="h-4 w-4 text-cyan-400" />
          <span>5. Vendors &amp; Suppliers ({vendors.length})</span>
        </button>
      </div>

      {/* TAB 1: STOCK IN (PURCHASE ENTRY) - EDGE TO EDGE FULL WIDTH */}
      {activeTab === "stock_in" && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <Card className="xl:col-span-8 border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
            <CardHeader className="pb-4 sm:pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground font-bold">
                    <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                    <span>Purchase Stock Inward Entry</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    Record new batch delivery received from supplier or manufacturer
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openCreateItem}
                  className="h-8 text-xs font-semibold gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Item</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStockInSubmit} className="space-y-4">
                {/* Item Selection */}
                <div>
                  <label className="text-xs font-bold text-foreground">Select Pathology Item *</label>
                  <select
                    value={inItemId}
                    onChange={(e) => setInItemId(e.target.value)}
                    required
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="">-- Select Item from Master Catalog --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.code || i.category}) · Available Stock: {i.totalStock} {i.uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Batch / LOT No */}
                  <div>
                    <label className="text-xs font-bold text-foreground">Batch / LOT Number *</label>
                    <Input
                      type="text"
                      required
                      value={inBatchNo}
                      onChange={(e) => setInBatchNo(e.target.value)}
                      placeholder="Enter LOT or Batch number"
                      className="mt-1.5 h-10 font-mono uppercase text-xs sm:text-sm bg-card"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="text-xs font-bold text-foreground">Expiry Date</label>
                    <Input
                      type="date"
                      value={inExpiry}
                      onChange={(e) => setInExpiry(e.target.value)}
                      className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Quantity Inward ({selectedInItem?.uom || "Units"}) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={inQuantity}
                      onChange={(e) => setInQuantity(e.target.value)}
                      placeholder="Enter received quantity"
                      className="mt-1.5 h-10 text-xs sm:text-sm font-bold bg-card"
                    />
                  </div>

                  {/* Unit Purchase Price */}
                  <div>
                    <label className="text-xs font-bold text-foreground">Unit Purchase Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inPrice}
                      onChange={(e) => setInPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>

                  {/* Calculated Total Inward Value */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">Total Inward Value</label>
                    <div className="mt-1.5 h-10 px-3 rounded-lg border border-border/60 bg-muted/40 flex items-center text-xs sm:text-sm font-bold text-foreground">
                      ₹{" "}
                      {Number(
                        (parseInt(inQuantity, 10) || 0) * (parseFloat(inPrice) || 0)
                      ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vendor / Supplier */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Supplier / Vendor</label>
                      <button
                        type="button"
                        onClick={() => setIsVendorModalOpen(true)}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        + Register Vendor
                      </button>
                    </div>
                    <select
                      value={inVendorName}
                      onChange={(e) => setInVendorName(e.target.value)}
                      className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                    >
                      <option value="">-- Select Supplier / Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.companyName}>
                          {v.companyName} ({v.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Purchase Invoice / DC No */}
                  <div>
                    <label className="text-xs font-bold text-foreground">Invoice / Challan Number</label>
                    <Input
                      type="text"
                      value={inInvoiceNo}
                      onChange={(e) => setInInvoiceNo(e.target.value)}
                      placeholder="Enter invoice or challan number"
                      className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>
                </div>

                {/* Storage Location */}
                <div>
                  <label className="text-xs font-bold text-foreground">Storage Location / Shelf / Fridge Compartment</label>
                  <Input
                    type="text"
                    value={inShelf}
                    onChange={(e) => setInShelf(e.target.value)}
                    placeholder="Enter shelf, rack, or fridge compartment"
                    className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-foreground">Remarks / Delivery Notes</label>
                  <Input
                    type="text"
                    value={inNotes}
                    onChange={(e) => setInNotes(e.target.value)}
                    placeholder="Enter remarks or delivery notes (optional)"
                    className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submittingIn}
                    className="text-xs sm:text-sm font-bold gradient-primary shadow-sm h-10 sm:h-11 px-7 gap-2 w-full sm:w-auto"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>{submittingIn ? "Recording Inward..." : "Save Stock Inward Entry"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Side Helper Card (Full Height & Full Width in Column) */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Item Summary &amp; Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                {selectedInItem ? (
                  <>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                      <div className="font-extrabold text-foreground text-sm sm:text-base">{selectedInItem.name}</div>
                      <div className="text-muted-foreground flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
                          {selectedInItem.category}
                        </span>
                        {selectedInItem.brand && <span>· Brand: {selectedInItem.brand}</span>}
                        {selectedInItem.code && <span className="font-mono">({selectedInItem.code})</span>}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="font-semibold text-foreground">
                          Current Stock: {selectedInItem.totalStock} {selectedInItem.uom}
                        </span>
                        <span className="text-muted-foreground text-[11px]">(Min: {selectedInItem.minStockAlert})</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-border/40 text-muted-foreground">
                        <span>Storage Temp:</span>
                        <span className="font-semibold text-foreground">
                          {selectedInItem.storageTemp || "Ambient Storage"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/40 text-muted-foreground">
                        <span>Default Shelf:</span>
                        <span className="font-semibold text-foreground">
                          {selectedInItem.locationShelf || "General Lab Rack"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 text-muted-foreground">
                        <span>Active Batches on Shelf:</span>
                        <span className="font-bold text-foreground">
                          {selectedInItem.batches?.length || 0}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-muted-foreground italic text-xs">
                    Select an item from the catalog on the left to see its storage specifications and live stock levels.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>LIS Quality Compliance</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11.5px]">
                  Entering the exact manufacturer LOT number and expiry date ensures 100% traceability for pathology analyzer runs and audit inspections.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK OUT (CONSUMPTION LOGGING) - EDGE TO EDGE FULL WIDTH */}
      {activeTab === "stock_out" && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <Card className="xl:col-span-8 border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
            <CardHeader className="pb-4 sm:pb-5">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground font-bold">
                <ArrowUpRight className="h-5 w-5 text-amber-500" />
                <span>Daily Consumption &amp; Usage Logging</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Log reagent usage, test run deductions, QC controls, or damaged disposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStockOutSubmit} className="space-y-4">
                {/* Item Selection */}
                <div>
                  <label className="text-xs font-bold text-foreground">Select Pathology Item *</label>
                  <select
                    value={outItemId}
                    onChange={(e) => setOutItemId(e.target.value)}
                    required
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="">-- Select Item from Master Catalog --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} · Available Stock: {i.totalStock} {i.uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Batch Selection */}
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Batch / LOT (FIFO Recommended) *
                    </label>
                    <select
                      value={outBatchId}
                      onChange={(e) => setOutBatchId(e.target.value)}
                      className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium font-mono"
                    >
                      {selectedOutItem?.batches && selectedOutItem.batches.length > 0 ? (
                        selectedOutItem.batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            LOT: {b.batchNo} ({b.quantityAvailable} left · Exp: {b.expiryDate || "No Expiry"})
                          </option>
                        ))
                      ) : (
                        <option value="">No active batches with available stock</option>
                      )}
                    </select>
                  </div>

                  {/* Quantity to Deduct */}
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Quantity Consumed ({selectedOutItem?.uom || "Units"}) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedOutItem?.totalStock || 99999}
                      required
                      value={outQuantity}
                      onChange={(e) => setOutQuantity(e.target.value)}
                      placeholder="Enter quantity to deduct"
                      className="mt-1.5 h-10 text-xs sm:text-sm font-bold bg-card"
                    />
                  </div>
                </div>

                {/* Consumption Reason */}
                <div>
                  <label className="text-xs font-bold text-foreground">Reason / Department *</label>
                  <select
                    value={outReason}
                    onChange={(e) => setOutReason(e.target.value)}
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    {CONSUMPTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Other / Custom Reason selected */}
                {outReason === "Other / Custom Reason" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-foreground">Specify Custom Reason *</label>
                    <Input
                      type="text"
                      required
                      value={outCustomReason}
                      onChange={(e) => setOutCustomReason(e.target.value)}
                      placeholder="Enter custom consumption reason"
                      className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-foreground">Reference Notes / Analyzer Batch</label>
                  <Input
                    type="text"
                    value={outNotes}
                    onChange={(e) => setOutNotes(e.target.value)}
                    placeholder="Enter reference notes or analyzer test run (optional)"
                    className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submittingOut || !selectedOutItem || selectedOutItem.totalStock <= 0}
                    className="text-xs sm:text-sm font-bold gradient-primary shadow-sm h-10 sm:h-11 px-7 gap-2 w-full sm:w-auto"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>{submittingOut ? "Deducting Stock..." : "Log Stock Outward"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Balance Preview Card (Full Width in Column) */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Warehouse className="h-4 w-4 text-primary" />
                  <span>Stock Balance Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                {selectedOutItem ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Current Stock in Lab:</span>
                      <span className="font-extrabold text-foreground text-sm">
                        {selectedOutItem.totalStock} {selectedOutItem.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-border/50 text-amber-600 dark:text-amber-400">
                      <span className="font-medium">Deducting Now:</span>
                      <span className="font-bold">
                        - {parseInt(outQuantity, 10) || 0} {selectedOutItem.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 bg-muted/40 px-3.5 rounded-xl border border-border/60">
                      <span className="font-bold text-foreground">Estimated Balance After:</span>
                      <span
                        className={`font-black text-base ${
                          selectedOutItem.totalStock - (parseInt(outQuantity, 10) || 0) <= selectedOutItem.minStockAlert
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {Math.max(0, selectedOutItem.totalStock - (parseInt(outQuantity, 10) || 0))}{" "}
                        {selectedOutItem.uom}
                      </span>
                    </div>

                    {selectedOutItem.totalStock - (parseInt(outQuantity, 10) || 0) <= selectedOutItem.minStockAlert && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="text-[11.5px] leading-tight font-medium">
                          Alert: Item will reach or fall below minimum reorder alert level ({selectedOutItem.minStockAlert} {selectedOutItem.uom}).
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-muted-foreground italic text-xs">
                    Select an item on the left to preview consumption impact on lab balance.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL AUDIT ADJUSTMENT - FULL WIDTH EDGE-TO-EDGE */}
      {activeTab === "adjustment" && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <Card className="xl:col-span-8 border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
            <CardHeader className="pb-4 sm:pb-5">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground font-bold">
                <Sliders className="h-5 w-5 text-sky-500" />
                <span>Physical Stock Audit Reconciliation</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Reconcile system balance to match verified physical shelf counts during routine lab audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground">Select Pathology Item to Reconcile *</label>
                  <select
                    value={adjItemId}
                    onChange={(e) => setAdjItemId(e.target.value)}
                    required
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="">-- Select Item from Catalog --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Total System Stock: {i.totalStock} {i.uom})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground">Select Batch / LOT to Adjust *</label>
                    <select
                      value={adjBatchId}
                      onChange={(e) => handleAdjBatchChange(e.target.value)}
                      required
                      className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium font-mono"
                    >
                      <option value="">-- Select Batch / LOT --</option>
                      {selectedAdjItem?.batches?.map((b) => (
                        <option key={b.id} value={b.id}>
                          LOT: {b.batchNo} · System Count: {b.quantityAvailable} {selectedAdjItem.uom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Physical Counted Quantity ({selectedAdjItem?.uom || "Units"}) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={adjNewQty}
                      onChange={(e) => setAdjNewQty(e.target.value)}
                      placeholder="Enter physical count verified on shelf"
                      className="mt-1.5 h-10 text-xs sm:text-sm font-bold bg-card"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">Discrepancy Reason *</label>
                  <select
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    {ADJUSTMENT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {adjReason === "Other / Custom Reason" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-foreground">Specify Audit Explanation *</label>
                    <Input
                      type="text"
                      required
                      value={adjCustomReason}
                      onChange={(e) => setAdjCustomReason(e.target.value)}
                      placeholder="Enter specific audit explanation"
                      className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                    />
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submittingAdj || !adjItemId || !adjBatchId}
                    className="text-xs sm:text-sm font-bold gradient-primary shadow-sm h-10 sm:h-11 px-7 gap-2 w-full sm:w-auto"
                  >
                    <Check className="h-4 w-4" />
                    <span>{submittingAdj ? "Reconciling..." : "Reconcile Stock Count"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Real-time Variance Preview Card */}
          <div className="xl:col-span-4 space-y-4">
            <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>Audit Variance Calculator</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                {selectedAdjBatch ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">System Recorded Count:</span>
                      <span className="font-extrabold text-foreground text-sm">
                        {selectedAdjBatch.quantityAvailable} {selectedAdjItem?.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Physical Shelf Count:</span>
                      <span className="font-extrabold text-foreground text-sm">
                        {parseInt(adjNewQty, 10) || 0} {selectedAdjItem?.uom}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 bg-muted/40 px-3.5 rounded-xl border border-border/60">
                      <span className="font-bold text-foreground">Variance Difference:</span>
                      {adjustmentVariance !== null && (
                        <span
                          className={`font-black text-base ${
                            adjustmentVariance === 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : adjustmentVariance > 0
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {adjustmentVariance > 0 ? `+${adjustmentVariance}` : adjustmentVariance}{" "}
                          {selectedAdjItem?.uom}
                        </span>
                      )}
                    </div>

                    {adjustmentVariance !== null && adjustmentVariance !== 0 && (
                      <div className="p-3 rounded-xl bg-muted/60 border border-border/60 text-foreground text-[11.5px] leading-relaxed">
                        {adjustmentVariance < 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            Shortage of {Math.abs(adjustmentVariance)} {selectedAdjItem?.uom}. A discrepancy entry will be recorded to adjust system count.
                          </span>
                        ) : (
                          <span className="text-sky-600 dark:text-sky-400 font-medium">
                            Surplus of {adjustmentVariance} {selectedAdjItem?.uom} found on shelf.
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-muted-foreground italic text-xs">
                    Select an item and batch to calculate variance between physical shelf stock and system count.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: ITEM MASTER CATALOG - FULL WIDTH EDGE-TO-EDGE */}
      {activeTab === "items" && (
        <div className="w-full space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search catalog items by name, item code, brand, or category..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-9 h-10 text-xs sm:text-sm bg-card border-border/80 w-full"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddCustom("category")}
                className="h-10 text-xs font-semibold gap-1.5 border-border/80"
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                <span>+ Custom Category</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAddCustom("uom")}
                className="h-10 text-xs font-semibold gap-1.5 border-border/80"
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                <span>+ Custom Unit</span>
              </Button>
              <Button
                size="sm"
                onClick={openCreateItem}
                className="h-10 text-xs font-bold gap-1.5 gradient-primary shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Item to Master</span>
              </Button>
            </div>
          </div>

          <Card className="border-border/70 shadow-xs overflow-hidden bg-card/60 backdrop-blur-xs w-full">
            <div className="table-responsive-container w-full">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[950px]">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-[28%] min-w-[220px]">Item &amp; Code</th>
                    <th className="py-3.5 px-3 w-[12%] min-w-[110px]">Category</th>
                    <th className="py-3.5 px-3 w-[12%] min-w-[100px]">Brand</th>
                    <th className="py-3.5 px-3 w-[10%] min-w-[80px]">UOM</th>
                    <th className="py-3.5 px-3 text-right w-[10%] min-w-[90px]">Min Stock</th>
                    <th className="py-3.5 px-3 w-[14%] min-w-[120px]">Storage Temp</th>
                    <th className="py-3.5 px-3 w-[12%] min-w-[100px]">Shelf</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCatalogItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground text-xs">
                        No items found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="text-sm font-bold text-foreground leading-snug">{item.name}</div>
                          {item.code && (
                            <div className="mt-1">
                              <span className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted border border-border/60 text-foreground">
                                {item.code}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted border border-border/50 text-foreground whitespace-nowrap">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-muted-foreground font-medium">{item.brand || "—"}</td>
                        <td className="py-3.5 px-3 font-semibold text-foreground">{item.uom}</td>
                        <td className="py-3.5 px-3 text-right font-extrabold text-foreground">{item.minStockAlert}</td>
                        <td className="py-3.5 px-3 text-xs text-muted-foreground font-medium">{item.storageTemp || "Ambient"}</td>
                        <td className="py-3.5 px-3 text-xs text-muted-foreground font-medium">{item.locationShelf || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditItem(item)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit Item"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item)}
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Deactivate / Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: VENDORS MASTER - FULL WIDTH EDGE-TO-EDGE */}
      {activeTab === "vendors" && (
        <div className="w-full space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Authorized Diagnostic Suppliers &amp; Vendors</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage distributor contacts, GST details, and order channels
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsVendorModalOpen(true)}
              className="h-10 text-xs font-bold gap-1.5 gradient-primary shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>+ Register Vendor</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {vendors.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground text-xs sm:text-sm bg-card/60 rounded-xl border border-border/70 p-6">
                No vendors registered yet. Click &quot;+ Register Vendor&quot; to add laboratory suppliers.
              </div>
            ) : (
              vendors.map((vendor) => (
                <Card key={vendor.id} className="border-border/70 shadow-xs bg-card/60 backdrop-blur-xs flex flex-col justify-between">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-foreground text-sm sm:text-base leading-snug">
                          {vendor.companyName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Contact: {vendor.name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVendor(vendor)}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Delete Vendor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      {vendor.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/75" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/75" />
                          <span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                      {vendor.gstin && (
                        <div className="font-mono text-[11px] text-foreground font-semibold">
                          GSTIN: {vendor.gstin}
                        </div>
                      )}
                      {vendor.address && (
                        <div className="text-[11px] text-muted-foreground leading-tight pt-0.5">
                          📍 {vendor.address}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT ITEM MODAL WITH INLINE CUSTOM CATEGORY/UOM/TEMP ADD */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-xl bg-card border border-border/80 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>{editingItem ? "Edit Catalog Item" : "Create New Catalog Item"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-1">
            Define reagent or consumable specifications in the lab master list
          </DialogDescription>

          <form onSubmit={handleSaveItem} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground">Item Name *</label>
              <Input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name (e.g. EDTA Vacutainer 2ml, Biochemistry Reagent)"
                className="mt-1.5 h-10 text-xs sm:text-sm font-semibold bg-card"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground">Item Code / SKU</label>
                <Input
                  type="text"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="Enter unique item code (optional)"
                  className="mt-1.5 h-10 text-xs sm:text-sm font-mono uppercase bg-card"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Category *</label>
                  <button
                    type="button"
                    onClick={() => handleOpenAddCustom("category")}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    + Add New
                  </button>
                </div>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground font-medium"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground">Manufacturer / Brand</label>
                <Input
                  type="text"
                  value={itemBrand}
                  onChange={(e) => setItemBrand(e.target.value)}
                  placeholder="Enter manufacturer or brand name"
                  className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Unit of Measure (UOM) *</label>
                  <button
                    type="button"
                    onClick={() => handleOpenAddCustom("uom")}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    + Add New
                  </button>
                </div>
                <select
                  value={itemUom}
                  onChange={(e) => setItemUom(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground font-medium"
                >
                  {allUoms.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground">Min Stock Alert Level *</label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={itemMinStock}
                  onChange={(e) => setItemMinStock(e.target.value)}
                  placeholder="5"
                  className="mt-1.5 h-10 text-xs sm:text-sm bg-card font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Storage Temperature</label>
                  <button
                    type="button"
                    onClick={() => handleOpenAddCustom("temp")}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    + Add New
                  </button>
                </div>
                <select
                  value={itemStorageTemp}
                  onChange={(e) => setItemStorageTemp(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground font-medium"
                >
                  {allStorageTemps.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Default Shelf / Rack Location</label>
              <Input
                type="text"
                value={itemShelf}
                onChange={(e) => setItemShelf(e.target.value)}
                placeholder="Enter default storage rack or fridge shelf"
                className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Notes / Handling Instructions</label>
              <Input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Enter handling instructions or storage notes (optional)"
                className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsItemModalOpen(false)}
                className="text-xs h-9 sm:h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingItem}
                className="text-xs font-bold gradient-primary h-9 sm:h-10 px-6"
              >
                {submittingItem ? "Saving..." : "Save Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DYNAMIC CUSTOM OPTION (CATEGORY / UOM / TEMP) MODAL */}
      <Dialog open={isCustomOptionModalOpen} onOpenChange={setIsCustomOptionModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border/80 shadow-2xl p-5 sm:p-6">
          <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <span>
              {customOptionType === "category" && "Add New Item Category"}
              {customOptionType === "uom" && "Add New Unit of Measure (UOM)"}
              {customOptionType === "temp" && "Add New Storage Temperature"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-1">
            This option will be saved and permanently available in your inventory dropdowns.
          </DialogDescription>

          <form onSubmit={handleSaveCustomOption} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground">
                {customOptionType === "category" && "Category Name *"}
                {customOptionType === "uom" && "Unit of Measure (UOM) *"}
                {customOptionType === "temp" && "Storage Condition / Temp *"}
              </label>
              <Input
                type="text"
                required
                autoFocus
                value={customOptionInput}
                onChange={(e) => setCustomOptionInput(e.target.value)}
                placeholder={
                  customOptionType === "category"
                    ? "e.g. Microbiology Media, Blood Bags, Molecular Reagents"
                    : customOptionType === "uom"
                    ? "e.g. Pack of 200, Cartridge, Strip (25 Tests)"
                    : "e.g. -70°C Cryo Freezer, Dark Room Storage"
                }
                className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomOptionModalOpen(false)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-bold gradient-primary h-9 px-5 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add &amp; Select</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* VENDOR MODAL */}
      <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border/80 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Register Vendor / Supplier</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-1">
            Add diagnostic distributor contact information for purchase orders
          </DialogDescription>

          <form onSubmit={handleSaveVendor} className="mt-4 space-y-3.5">
            <div>
              <label className="text-xs font-bold text-foreground">Company Name *</label>
              <Input
                type="text"
                required
                value={vendorCompany}
                onChange={(e) => setVendorCompany(e.target.value)}
                placeholder="Enter supplier or company name"
                className="mt-1.5 h-10 text-xs sm:text-sm font-semibold bg-card"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Contact Person / Rep Name *</label>
              <Input
                type="text"
                required
                value={vendorContact}
                onChange={(e) => setVendorContact(e.target.value)}
                placeholder="Enter contact person name"
                className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground">Phone Number</label>
                <Input
                  type="text"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Email</label>
                <Input
                  type="email"
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                  placeholder="Enter vendor email address"
                  className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">GSTIN (Optional)</label>
              <Input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value)}
                placeholder="Enter 15-digit GSTIN"
                className="mt-1.5 h-10 text-xs sm:text-sm font-mono uppercase bg-card"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Address</label>
              <Input
                type="text"
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
                placeholder="Enter full supplier address"
                className="mt-1.5 h-10 text-xs sm:text-sm bg-card"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsVendorModalOpen(false)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingVendor}
                className="text-xs font-bold gradient-primary h-9 px-6"
              >
                {submittingVendor ? "Saving..." : "Save Vendor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

