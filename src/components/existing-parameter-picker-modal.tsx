"use client";

import React, { useMemo, useState } from "react";
import { Search, Plus, Check, Layers, X, FlaskConical } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ExistingParameterItem {
  key: string;
  name: string;
  sourceTestName: string;
  category: string;
  unit: string;
  method: string;
  rangeSummary: string;
  subTestState: any;
}

interface ExistingParameterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: any[];
  onImport: (items: any[]) => void;
  title?: string;
}

function toSubTestState(raw: any): any {
  const safeVal = (v: any) => (v !== null && v !== undefined ? String(v) : "");
  const nestedRaw = Array.isArray(raw.subTests) ? raw.subTests : Array.isArray(raw.sub_tests) ? raw.sub_tests : [];
  const rawAgeRanges = raw.ageRanges ?? raw.age_ranges;
  const ageRanges = Array.isArray(rawAgeRanges) ? JSON.parse(JSON.stringify(rawAgeRanges)) : [];
  const rawCustomOpts = raw.customOptions ?? raw.custom_options;
  const customOptions = Array.isArray(rawCustomOpts) ? [...rawCustomOpts] : [];

  return {
    name: String(raw.name || "").trim(),
    method: String(raw.method || "").trim(),
    unit: String(raw.unit || "").trim(),
    genderRefType: raw.genderRefType || raw.gender_ref_type || "BOTH",
    rangeType: (raw.rangeType || raw.range_type || "numeric").toLowerCase() === "text" ? "text" : "numeric",
    textRefRange: String(raw.textRefRange || raw.text_ref_range || ""),
    refRangeMin: safeVal(raw.refRangeMin ?? raw.ref_range_min),
    refRangeMax: safeVal(raw.refRangeMax ?? raw.ref_range_max),
    refRangeMinMale: safeVal(raw.refRangeMinMale ?? raw.ref_range_min_male),
    refRangeMaxMale: safeVal(raw.refRangeMaxMale ?? raw.ref_range_max_male),
    refRangeMinFemale: safeVal(raw.refRangeMinFemale ?? raw.ref_range_min_female),
    refRangeMaxFemale: safeVal(raw.refRangeMaxFemale ?? raw.ref_range_max_female),
    refRangeMinChild: safeVal(raw.refRangeMinChild ?? raw.ref_range_min_child),
    refRangeMaxChild: safeVal(raw.refRangeMaxChild ?? raw.ref_range_max_child),
    refRangeMinNewborn: safeVal(raw.refRangeMinNewborn ?? raw.ref_range_min_newborn),
    refRangeMaxNewborn: safeVal(raw.refRangeMaxNewborn ?? raw.ref_range_max_newborn),
    ageRanges,
    fieldType: nestedRaw.length > 0 ? "Multiple Field" : "Single Field",
    valueType: raw.valueType || raw.value_type || "Numeric",
    customOptions,
    subTests: nestedRaw.map((child: any) => toSubTestState(child)),
  };
}

function summarizeRange(raw: any): string {
  const rt = String(raw.rangeType || raw.range_type || "").toLowerCase();
  if (rt === "text" && (raw.textRefRange || raw.text_ref_range)) {
    return String(raw.textRefRange || raw.text_ref_range).slice(0, 40);
  }
  const ageRanges = raw.ageRanges ?? raw.age_ranges;
  if (Array.isArray(ageRanges) && ageRanges.length > 0) {
    return `${ageRanges.length} Age Intervals`;
  }
  const gType = String(raw.genderRefType || raw.gender_ref_type || "").toUpperCase();
  if (gType === "GENDER_SPECIFIC") {
    const mMin = raw.refRangeMinMale ?? raw.ref_range_min_male ?? "";
    const mMax = raw.refRangeMaxMale ?? raw.ref_range_max_male ?? "";
    const fMin = raw.refRangeMinFemale ?? raw.ref_range_min_female ?? "";
    const fMax = raw.refRangeMaxFemale ?? raw.ref_range_max_female ?? "";
    return `M: ${mMin}-${mMax} | F: ${fMin}-${fMax}`;
  }
  const min = raw.refRangeMin ?? raw.ref_range_min;
  const max = raw.refRangeMax ?? raw.ref_range_max;
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${min} - ${max}`;
  }
  return "Default / Custom";
}

/**
 * Extracts deduplicated reusable parameters from all preloaded and custom catalog tests.
 */
export function buildExistingParametersCatalog(tests: any[]): ExistingParameterItem[] {
  if (!Array.isArray(tests)) return [];
  const items: ExistingParameterItem[] = [];
  const seen = new Set<string>();

  const pushCandidate = (raw: any, sourceTestName: string, category: string) => {
    const name = String(raw?.name || "").trim();
    if (!name) return;
    const unit = String(raw?.unit || "").trim();
    const rangeSummary = summarizeRange(raw);
    const dedupKey = `${name.toLowerCase()}||${unit.toLowerCase()}||${rangeSummary.toLowerCase()}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);

    items.push({
      key: `${dedupKey}||${items.length}`,
      name,
      sourceTestName,
      category: category || "General",
      unit,
      method: String(raw?.method || "").trim(),
      rangeSummary,
      subTestState: toSubTestState(raw),
    });
  };

  tests.forEach((t) => {
    if (!t || !t.name) return;
    const cat = String(t.category || "General");
    const subs = Array.isArray(t.subTests) ? t.subTests : Array.isArray(t.sub_tests) ? t.sub_tests : [];

    if (subs.length === 0) {
      // Skip pure Custom Editor rich-text reports
      const ft = String(t.fieldType || t.field_type || "");
      if (ft !== "Custom Editor") {
        pushCandidate(t, "Single Test", cat);
      }
      return;
    }

    subs.forEach((sub: any) => {
      pushCandidate(sub, t.name, cat);
      const nested = Array.isArray(sub.subTests) ? sub.subTests : Array.isArray(sub.sub_tests) ? sub.sub_tests : [];
      nested.forEach((ns: any) => {
        pushCandidate(ns, `${t.name} › ${sub.name}`, cat);
      });
    });
  });

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function ExistingParameterPickerModal({
  isOpen,
  onClose,
  tests,
  onImport,
  title = "Select Preloaded / Existing Parameters",
}: ExistingParameterPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const allParams = useMemo(() => buildExistingParametersCatalog(tests), [tests]);

  const filteredParams = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allParams.slice(0, 120);
    return allParams
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sourceTestName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.unit.toLowerCase().includes(q)
      )
      .slice(0, 150);
  }, [allParams, search]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleConfirmImport = () => {
    if (selectedKeys.length === 0) return;
    const selectedItems = allParams
      .filter((p) => selectedKeys.includes(p.key))
      .map((p) => JSON.parse(JSON.stringify(p.subTestState)));
    onImport(selectedItems);
    setSelectedKeys([]);
    setSearch("");
    onClose();
  };

  const handleSingleQuickAdd = (param: ExistingParameterItem) => {
    onImport([JSON.parse(JSON.stringify(param.subTestState))]);
    setSelectedKeys((prev) => prev.filter((k) => k !== param.key));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedKeys([]);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-card" hideClose>
        <div className="p-4 sm:px-6 border-b border-border/80 bg-card flex items-center justify-between">
          <div>
            <DialogTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>{title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Pick existing parameters from your preloaded &amp; custom catalog with saved units, methods, and normal ranges.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted transition-colors cursor-pointer border border-border/70"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parameter (e.g. Creatinine, Urea, Alkaline Phosphatase, SGOT, Hemoglobin)..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
            <span>
              Showing {filteredParams.length} of {allParams.length} preloaded &amp; existing parameters
            </span>
            {selectedKeys.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedKeys([])}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Clear {selectedKeys.length} selected
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto divide-y divide-border/50 px-2 sm:px-4">
          {filteredParams.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1.5">
              <FlaskConical className="h-7 w-7 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No matching parameter found</p>
              <p>Close this picker and click &quot;+ Add Parameter&quot; to create a custom parameter.</p>
            </div>
          ) : (
            filteredParams.map((param) => {
              const isSelected = selectedKeys.includes(param.key);
              return (
                <div
                  key={param.key}
                  onClick={() => toggleKey(param.key)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl my-1 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="notranslate font-semibold text-sm text-foreground truncate" translate="no">
                          {param.name}
                        </span>
                        {param.unit && (
                          <span className="notranslate px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground" translate="no">
                            {param.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>From: <strong className="text-foreground/80">{param.sourceTestName}</strong></span>
                        <span>·</span>
                        <span className="font-mono">{param.rangeSummary}</span>
                        {param.method && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[180px]">{param.method}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSingleQuickAdd(param);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                    title="Add this parameter immediately"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 sm:px-6 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {selectedKeys.length > 0
              ? `${selectedKeys.length} parameter(s) ready to add`
              : "Click checkboxes to multi-select, or click Add for 1-click import"}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-lg px-4 text-xs font-semibold">
              Done
            </Button>
            {selectedKeys.length > 0 && (
              <Button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-lg px-5 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                Add Selected ({selectedKeys.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
