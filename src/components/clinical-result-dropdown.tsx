"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown, Check, Plus, Search, X, Trash2, Pipette
} from "lucide-react";
import {
  getCompleteParameterOptions,
  saveCustomOption,
  deleteCustomOption,
  getSavedCustomOptions
} from "@/lib/clinical-options";

interface ClinicalResultDropdownProps {
  itemId: string;
  paramName: string;
  testName?: string;
  category?: string;
  customDbOptions?: string | null;
  value: string;
  onChange: (newValue: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  isCalculated?: boolean;
  isForcedAbnormal?: boolean;
  abnormal?: boolean;
  className?: string;
  isTextOnlyTable?: boolean;
}

// Visual color swatches for urine / fluid color options
const COLOR_SWATCHES: Record<string, string> = {
  "pale yellow": "#fef08a",
  "yellow": "#facc15",
  "dark yellow": "#eab308",
  "straw": "#fef9c3",
  "amber": "#d97706",
  "reddish": "#f87171",
  "brown": "#78350f",
  "orange": "#fb923c",
  "clear yellow": "#fde047",
  "cloudy red": "#ef4444",
  "colorless": "#f1f5f9",
  "greenish": "#86efac",
  "smoky brown": "#92400e",
  "greyish white": "#e2e8f0",
  "pearly white": "#f8fafc",
  "reddish brown": "#991b1b",
};

export function ClinicalResultDropdown({
  itemId,
  paramName,
  testName,
  category,
  customDbOptions,
  value,
  onChange,
  onKeyDown,
  disabled = false,
  isCalculated = false,
  isForcedAbnormal = false,
  abnormal = false,
  className = "",
  isTextOnlyTable = false,
}: ClinicalResultDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [customVersion, setCustomVersion] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Floating coordinates for Portal positioning
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Retrieve complete options for this parameter
  const { options, key: paramKey, isColorParam, hasDropdown } = useMemo(() => {
    return getCompleteParameterOptions(paramName, testName, category, customDbOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramName, testName, category, customDbOptions, customVersion]);

  // Saved user custom options for this parameter (for deletion support)
  const savedCustomList = useMemo(() => {
    return paramKey ? getSavedCustomOptions(paramKey) : [];
  }, [paramKey, customVersion]);

  // Determine if this test is simple/binary (Reactive/Non-Reactive, Positive/Negative, etc.)
  const isBinaryOrShortList = useMemo(() => {
    if (options.length <= 4) return true;
    if (options.some((o) => /reactive/i.test(o))) return true;
    return false;
  }, [options]);

  // Only show search bar if there are 6 or more options and it's not a simple binary test
  const showSearchBar = options.length > 5 && !isBinaryOrShortList;

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!showSearchBar || !searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, searchTerm, showSearchBar]);

  // Check if current search term is already an existing option
  const isSearchTermUnique = useMemo(() => {
    const term = (isAddingNew ? newOptionInput : searchTerm).trim().toLowerCase();
    if (!term) return false;
    return !options.some((opt) => opt.toLowerCase() === term);
  }, [options, searchTerm, newOptionInput, isAddingNew]);

  // Update floating popover position relative to viewport
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 260;
    const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    // Minimum width of 240px, or match container width if larger
    const width = Math.max(rect.width, isBinaryOrShortList ? 200 : 250);
    // Align with input, but keep within viewport bounds
    const maxLeft = window.innerWidth - width - 12;
    const left = Math.max(12, Math.min(rect.left, maxLeft));

    setCoords({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      openUp,
    });
  }, [isBinaryOrShortList]);

  // Reposition on open, scroll, or resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsAddingNew(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens (if search bar is shown)
  useEffect(() => {
    if (isOpen && showSearchBar) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, showSearchBar]);

  // Auto-Save manual typed value when user types custom text and blurs / hits Enter
  const handleAutoSaveManualInput = useCallback(
    (valToSave: string) => {
      const trimmed = (valToSave || "").trim();
      if (!trimmed || !paramKey) return;
      // Check if it already exists in options (case insensitive)
      const alreadyExists = options.some(
        (opt) => opt.toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists) {
        saveCustomOption(paramKey, trimmed);
        setCustomVersion((v) => v + 1);
      }
    },
    [paramKey, options]
  );

  const handleSelectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setIsAddingNew(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    // Refocus text input
    textInputRef.current?.focus();
  };

  const handleAddNewOption = (customVal?: string) => {
    const valToAdd = (customVal || newOptionInput || searchTerm).trim();
    if (!valToAdd) return;

    if (paramKey) {
      saveCustomOption(paramKey, valToAdd);
      setCustomVersion((v) => v + 1);
    }
    handleSelectOption(valToAdd);
    setNewOptionInput("");
    setIsAddingNew(false);
  };

  const handleDeleteCustomOption = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    if (paramKey) {
      deleteCustomOption(paramKey, opt);
      setCustomVersion((v) => v + 1);
    }
  };

  // If this parameter doesn't qualify for standard dropdown options, render regular Input
  if (!hasDropdown || options.length === 0) {
    return (
      <input
        ref={textInputRef}
        type="text"
        placeholder={isCalculated ? "Auto" : "—"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        data-result-input="true"
        data-result-id={itemId}
        data-is-calculated={isCalculated ? "true" : "false"}
        disabled={disabled}
        className={`${isTextOnlyTable ? "w-full" : "w-32"} h-9 font-mono text-sm text-foreground rounded-lg border border-border/80 bg-background px-3 transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 ${
          isCalculated
            ? "bg-primary/5 border-primary/30 font-bold text-primary cursor-text"
            : isForcedAbnormal || abnormal
              ? "font-extrabold border-border/90 bg-muted/20"
              : "font-semibold"
        } ${className}`}
      />
    );
  }

  // Determine color dot swatch if it's a color field
  const activeColorSwatch = isColorParam && value ? COLOR_SWATCHES[value.toLowerCase().trim()] : null;

  return (
    <div ref={containerRef} className={`relative inline-block ${isTextOnlyTable ? "w-full max-w-sm" : "w-44"}`}>
      {/* Visual Combobox Input & Dropdown Toggle */}
      <div className="relative flex items-center">
        {/* Color Preview Pill if applicable */}
        {activeColorSwatch && (
          <span
            className="absolute left-2.5 w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs shrink-0 z-10 pointer-events-none"
            style={{ backgroundColor: activeColorSwatch }}
            title={`Color preview: ${value}`}
          />
        )}

        <input
          ref={textInputRef}
          type="text"
          value={value || ""}
          placeholder={isCalculated ? "Auto" : `Select or type...`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => handleAutoSaveManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !isOpen) {
              e.preventDefault();
              setIsOpen(true);
            } else if (e.key === "Enter") {
              handleAutoSaveManualInput(value);
              if (isOpen) {
                setIsOpen(false);
              }
              if (onKeyDown) {
                onKeyDown(e);
              }
            } else if (onKeyDown) {
              onKeyDown(e);
            }
          }}
          data-result-input="true"
          data-result-id={itemId}
          data-is-calculated={isCalculated ? "true" : "false"}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              updatePosition();
              setIsOpen(!isOpen);
            }
          }}
          className={`w-full h-9 text-xs font-semibold rounded-xl border transition-all outline-none ${
            activeColorSwatch ? "pl-8 pr-14" : "pl-3 pr-14"
          } ${
            isOpen
              ? "border-primary ring-2 ring-primary/20 bg-background"
              : "border-border/80 bg-background hover:border-primary/50"
          } ${
            isCalculated
              ? "bg-primary/5 border-primary/30 font-bold text-primary"
              : isForcedAbnormal || abnormal
                ? "font-extrabold border-border/90 bg-muted/20 text-foreground"
                : "text-foreground"
          } ${className}`}
        />

        {/* Right side controls: Clear (X) + Dropdown Chevron */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                textInputRef.current?.focus();
              }}
              className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title="Clear result"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                updatePosition();
                setIsOpen(!isOpen);
              }
            }}
            disabled={disabled}
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-transform cursor-pointer ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
            title="Click to view options"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── State of the Art Portal Dropdown (Rendered on document.body, ZERO clipping or table scrolling) ── */}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUp ? "translateY(-100%)" : "none",
              zIndex: 99999,
            }}
            className="rounded-2xl bg-card/98 backdrop-blur-xl border border-border/90 shadow-2xl overflow-hidden animate-scale-in"
          >
            {/* Popover Header: Parameter Name & Options Count */}
            <div className="p-2.5 border-b border-border/60 bg-muted/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                <span className="truncate flex items-center gap-1.5">
                  {isColorParam && <Pipette className="h-3 w-3 text-amber-500 shrink-0" />}
                  <span className="truncate">{paramName}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                  {filteredOptions.length} items
                </span>
              </div>

              {/* Search Bar: Only shown when > 5 options and NOT a simple binary test */}
              {showSearchBar && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Type to filter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredOptions.length > 0) {
                        e.preventDefault();
                        handleSelectOption(filteredOptions[0]);
                      } else if (e.key === "Enter" && searchTerm.trim() && isSearchTermUnique) {
                        e.preventDefault();
                        handleAddNewOption(searchTerm.trim());
                      } else if (e.key === "Escape") {
                        setIsOpen(false);
                      }
                    }}
                    className="w-full h-8 pl-8 pr-7 text-xs bg-background rounded-lg border border-border/80 outline-none focus:border-primary text-foreground font-medium"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Options Scrollable List */}
            <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar space-y-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = value === opt;
                  const swatch = isColorParam ? COLOR_SWATCHES[opt.toLowerCase().trim()] : null;
                  const isCustom = savedCustomList.includes(opt);

                  return (
                    <div
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : highlightedIndex === idx
                            ? "bg-muted text-foreground"
                            : "text-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {/* Color Dot if color option */}
                        {swatch && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
                            style={{ backgroundColor: swatch }}
                          />
                        )}
                        <span className="truncate">{opt}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {isCustom && !isSelected && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomOption(e, opt)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                            title="Delete custom option"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground shrink-0" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                  No matching option found for &ldquo;{searchTerm}&rdquo;
                </div>
              )}
            </div>

            {/* Footer: Quick Add New Custom Option Action */}
            <div className="p-2 border-t border-border/60 bg-muted/20">
              {isAddingNew ? (
                <div className="space-y-1.5 animate-fade-in">
                  <input
                    type="text"
                    placeholder={`Type custom ${paramName}...`}
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddNewOption();
                      } else if (e.key === "Escape") {
                        setIsAddingNew(false);
                      }
                    }}
                    autoFocus
                    className="w-full h-8 px-2.5 text-xs bg-background rounded-lg border border-primary outline-none text-foreground font-medium"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewOptionInput("");
                      }}
                      className="px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNewOption()}
                      disabled={!newOptionInput.trim()}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      Save &amp; Select
                    </button>
                  </div>
                </div>
              ) : searchTerm.trim() && isSearchTermUnique ? (
                <button
                  type="button"
                  onClick={() => handleAddNewOption(searchTerm.trim())}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add &ldquo;{searchTerm.trim()}&rdquo;</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(true);
                    setNewOptionInput(searchTerm);
                  }}
                  className="w-full py-1.5 px-2 rounded-xl border border-dashed border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3 w-3 text-primary" />
                  <span>+ Add Custom Option</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
