"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Sparkles,
  FlaskConical,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Clock,
  Check,
  X,
  Package,
  ArrowRight,
  Info,
  Loader2
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TestItem {
  id: string;
  name: string;
  test_code?: string;
  category?: string;
  price?: number;
  parent_id?: string | null;
}

interface InventoryCatalogItem {
  id: string;
  name: string;
  code?: string;
  category: string;
  uom: string;
  totalStock?: number;
}

interface MappingRow {
  id?: string;
  item_id: string;
  item_name?: string;
  category?: string;
  quantity: number;
  unit: string;
  trigger_stage: "verification" | "booking";
  notes?: string;
  isAiSuggested?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTestId?: string | null;
  onSaved?: () => void;
}

export function InventoryTestMappingModal({
  open,
  onOpenChange,
  initialTestId,
  onSaved
}: Props) {
  const toast = useToast();

  const [tests, setTests] = useState<TestItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryCatalogItem[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [testSearch, setTestSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Mappings for currently selected test
  const [currentMappings, setCurrentMappings] = useState<MappingRow[]>([]);
  const [allLabMappings, setAllLabMappings] = useState<Record<string, MappingRow[]>>({});

  // 1. Load Tests Catalog, Inventory Items, and Existing Mappings
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [testsRes, inventoryRes, mappingsRes] = await Promise.all([
        fetchFromLaravel("/tests", { skipCache: false, timeoutMs: 15000 }),
        fetchFromLaravel("/inventory", { skipCache: true, timeoutMs: 15000 }),
        fetchFromLaravel("/inventory/test-mappings", { skipCache: true, timeoutMs: 15000 }),
      ]);

      // Normalize tests list
      const rawTests = Array.isArray(testsRes)
        ? testsRes
        : testsRes?.data || testsRes?.tests || [];
      const cleanTests = rawTests.filter((t: any) => !t.parent_id); // Pick root panels/tests
      setTests(cleanTests);

      // Normalize inventory items
      const rawItems = inventoryRes?.data?.items || [];
      setInventoryItems(
        rawItems.map((itm: any) => ({
          id: itm.id,
          name: itm.name,
          code: itm.code,
          category: itm.category,
          uom: itm.uom,
          totalStock: itm.total_stock ?? itm.totalStock ?? 0,
        }))
      );

      // Group existing mappings by test_id
      const rawMappings = mappingsRes?.data || [];
      const grouped: Record<string, MappingRow[]> = {};
      rawMappings.forEach((m: any) => {
        const tid = m.test_id || m.testId;
        if (!grouped[tid]) grouped[tid] = [];
        grouped[tid].push({
          id: m.id,
          item_id: m.item_id || m.itemId,
          item_name: m.item?.name || "",
          category: m.item?.category || "",
          quantity: Number(m.quantity || 1),
          unit: m.unit || m.item?.uom || "Units",
          trigger_stage: m.trigger_stage || m.triggerStage || "verification",
          notes: m.notes || "",
        });
      });
      setAllLabMappings(grouped);

      // Set initial selected test
      if (initialTestId) {
        setSelectedTestId(initialTestId);
      } else if (cleanTests.length > 0 && !selectedTestId) {
        setSelectedTestId(cleanTests[0].id);
      }
    } catch (e) {
      toast.error("Failed to load tests or inventory catalog.");
    } finally {
      setLoading(false);
    }
  }, [initialTestId, selectedTestId, toast]);

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, loadInitialData]);

  // Sync current mappings when selectedTestId changes
  useEffect(() => {
    if (selectedTestId) {
      setCurrentMappings(allLabMappings[selectedTestId] || []);
    }
  }, [selectedTestId, allLabMappings]);

  const selectedTest = useMemo(() => {
    return tests.find((t) => t.id === selectedTestId);
  }, [tests, selectedTestId]);

  // Filtered test catalog for sidebar list
  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return tests;
    const q = testSearch.toLowerCase().trim();
    return tests.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.test_code?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [tests, testSearch]);

  // 2. Add an empty mapping row
  const handleAddRow = () => {
    if (inventoryItems.length === 0) {
      toast.warning("Please create at least 1 item in Inventory before adding to recipe.");
      return;
    }
    const firstItem = inventoryItems[0];
    setCurrentMappings((prev) => [
      ...prev,
      {
        item_id: firstItem.id,
        item_name: firstItem.name,
        category: firstItem.category,
        quantity: 1,
        unit: firstItem.uom || "Units",
        trigger_stage: "verification",
      },
    ]);
  };

  // 3. Update an individual mapping row field
  const handleUpdateRow = (index: number, field: keyof MappingRow, value: any) => {
    setCurrentMappings((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      if (field === "item_id") {
        const itemObj = inventoryItems.find((i) => i.id === value);
        if (itemObj) {
          target.item_name = itemObj.name;
          target.category = itemObj.category;
          target.unit = itemObj.uom;
        }
      }

      copy[index] = target;
      return copy;
    });
  };

  // 4. Remove a row
  const handleRemoveRow = (index: number) => {
    setCurrentMappings((prev) => prev.filter((_, i) => i !== index));
  };

  // 5. AI Auto-Suggest Recipe (Groq + Gemini failover)
  const handleAiSuggestRecipe = async () => {
    if (!selectedTest) return;
    setAiLoading(true);

    try {
      const res = await fetchFromLaravel("/inventory/ai-suggest-recipe", {
        method: "POST",
        body: JSON.stringify({
          test_id: selectedTest.id,
          test_name: selectedTest.name,
          category: selectedTest.category,
        }),
      });

      if (res && res.status === "success" && res.data?.suggested_items) {
        const suggestions = res.data.suggested_items;
        if (suggestions.length === 0) {
          toast.info("AI could not detect standard consumables for this test.");
          return;
        }

        // Map AI suggestions to existing lab items
        const newRows: MappingRow[] = suggestions.map((sug: any) => {
          let matchedItem = inventoryItems.find((i) => i.id === sug.matched_item_id);
          if (!matchedItem) {
            const sugLower = sug.item_name.toLowerCase();
            matchedItem = inventoryItems.find(
              (i) =>
                i.name.toLowerCase().includes(sugLower) ||
                sugLower.includes(i.name.toLowerCase())
            );
          }

          return {
            item_id: matchedItem?.id || (inventoryItems[0]?.id ?? ""),
            item_name: matchedItem?.name || sug.item_name,
            category: sug.category || matchedItem?.category || "Reagent",
            quantity: Number(sug.quantity || 1),
            unit: sug.unit || matchedItem?.uom || "Units",
            trigger_stage: sug.trigger_stage === "booking" ? "booking" : "verification",
            isAiSuggested: true,
          };
        });

        setCurrentMappings(newRows);
        toast.success(
          `✨ AI suggested ${newRows.length} standard consumables for ${selectedTest.name}!`
        );
      } else {
        toast.error("AI service could not generate suggestions. Try again.");
      }
    } catch (e: any) {
      toast.error("AI auto-suggest failed: " + (e?.message || "Network error"));
    } finally {
      setAiLoading(false);
    }
  };

  // 6. Save Recipe Mappings
  const handleSaveRecipe = async () => {
    if (!selectedTestId) return;

    // Validate rows
    for (const row of currentMappings) {
      if (!row.item_id) {
        toast.warning("Please select an item for all recipe rows.");
        return;
      }
      if (!row.quantity || Number(row.quantity) <= 0) {
        toast.warning("Quantity must be greater than 0 for all items.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        test_id: selectedTestId,
        mappings: currentMappings.map((m) => ({
          item_id: m.item_id,
          quantity: Number(m.quantity),
          unit: m.unit,
          trigger_stage: m.trigger_stage,
          notes: m.notes || null,
        })),
      };

      const res = await fetchFromLaravel("/inventory/test-mappings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status === "success") {
        toast.success("✅ Reagent auto-deduction recipe saved successfully!");
        setAllLabMappings((prev) => ({
          ...prev,
          [selectedTestId]: currentMappings,
        }));
        if (onSaved) onSaved();
      } else {
        toast.error(res?.message || "Failed to save recipe.");
      }
    } catch (e: any) {
      toast.error("Failed to save recipe: " + (e?.message || "Network error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden sm:max-h-[90vh] flex flex-col bg-card">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-card to-primary/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Test Reagent Recipes & Auto-Deduction Engine
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Link clinical tests with consumables/reagents for automatic (+ / -) inventory sync & AI forecasting.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body: Left Sidebar (Tests) + Right Area (Recipe Config) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border/60">
          {/* Left Column: Search & Select Test */}
          <div className="md:col-span-4 flex flex-col h-[320px] md:h-[520px] bg-muted/20">
            <div className="p-3 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search test panel..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              {filteredTests.map((t) => {
                const isSelected = t.id === selectedTestId;
                const mappingCount = allLabMappings[t.id]?.length || 0;

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTestId(t.id)}
                    className={`w-full text-left p-3 flex items-start justify-between gap-2 transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-l-primary text-foreground font-medium"
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {t.category || "General"} {t.test_code ? `• ${t.test_code}` : ""}
                      </div>
                    </div>

                    {mappingCount > 0 ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {mappingCount} {mappingCount === 1 ? "Item" : "Items"}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-muted-foreground/60 italic">
                        Unmapped
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Recipe Items Configuration */}
          <div className="md:col-span-8 flex flex-col h-[400px] md:h-[520px] p-4 overflow-y-auto">
            {selectedTest ? (
              <div className="flex flex-col h-full">
                {/* Active Test Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 p-3 shadow-2xs">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {selectedTest.name}
                      {selectedTest.test_code && (
                        <span className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                          {selectedTest.test_code}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Category: {selectedTest.category || "General"}
                    </p>
                  </div>

                  {/* AI Suggest Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiSuggestRecipe}
                    disabled={aiLoading}
                    className="h-8 gap-1.5 text-xs font-semibold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 shadow-2xs"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                    ✨ AI Auto-Suggest Recipe
                  </Button>
                </div>

                {/* Recipe Items Table / List */}
                <div className="flex-1 mt-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Consumed Consumables & Reagents ({currentMappings.length})
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddRow}
                      className="h-7 gap-1 text-xs text-primary font-medium hover:bg-primary/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>

                  {currentMappings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/10">
                      <Package className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">No reagents mapped to this test yet.</p>
                      <p className="max-w-xs text-muted-foreground">
                        Click <strong className="text-primary font-semibold">"✨ AI Auto-Suggest Recipe"</strong> above to auto-detect required tubes and reagents, or add items manually.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {currentMappings.map((row, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border p-3 flex flex-col gap-2.5 transition-all ${
                            row.isAiSuggested
                              ? "border-indigo-500/40 bg-indigo-500/5 shadow-2xs"
                              : "border-border/80 bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              Item #{idx + 1}
                              {row.isAiSuggested && (
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                                  <Sparkles className="h-2.5 w-2.5" /> AI Recommended
                                </span>
                              )}
                            </span>

                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                            {/* Inventory Item Picker */}
                            <div className="sm:col-span-5">
                              <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                                Inventory Item
                              </label>
                              <select
                                value={row.item_id}
                                onChange={(e) => handleUpdateRow(idx, "item_id", e.target.value)}
                                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                              >
                                {inventoryItems.map((itm) => (
                                  <option key={itm.id} value={itm.id}>
                                    {itm.name} ({itm.category}) - Stock: {itm.totalStock} {itm.uom}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity */}
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                                Qty per Test
                              </label>
                              <Input
                                type="number"
                                step="any"
                                min="0.001"
                                value={row.quantity}
                                onChange={(e) =>
                                  handleUpdateRow(idx, "quantity", parseFloat(e.target.value) || 0)
                                }
                                className="h-8 text-xs font-semibold"
                              />
                            </div>

                            {/* Unit */}
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                                Unit
                              </label>
                              <Input
                                type="text"
                                value={row.unit}
                                onChange={(e) => handleUpdateRow(idx, "unit", e.target.value)}
                                placeholder="mL / Tube"
                                className="h-8 text-xs"
                              />
                            </div>

                            {/* Trigger Stage */}
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                                Deduct When?
                              </label>
                              <select
                                value={row.trigger_stage}
                                onChange={(e) =>
                                  handleUpdateRow(
                                    idx,
                                    "trigger_stage",
                                    e.target.value as "verification" | "booking"
                                  )
                                }
                                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-[11px] font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                              >
                                <option value="verification">On Report Verify (Reagent/Kit)</option>
                                <option value="booking">On Booking (Tube/Syringe)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Save Area */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-muted-foreground">
                    Items will auto-deduct via <strong>FEFO (First-Expired, First-Out)</strong> on patient reports.
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveRecipe}
                      disabled={saving}
                      className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" /> Save Recipe
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs">
                Select a test from the left sidebar to view or edit its recipe.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
