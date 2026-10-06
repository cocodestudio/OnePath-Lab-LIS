"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Layers,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Calendar,
  X,
  Zap,
  Clock,
  User,
  CheckSquare,
  Square,
  Users
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { WorksheetSheet, type WorksheetData } from "@/components/worksheet-sheet";
import { downloadNativePdf } from "@/lib/pdf-report-downloader";
import { printInvoiceElement } from "@/lib/print-invoice";
import { useToast } from "@/components/ui/toast";
import { getTodayStr, getYesterdayStr } from "@/lib/date-utils";

const STANDARD_DEPARTMENTS = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Clinical Pathology",
  "Serology & Immunology",
  "Cytology",
  "Endocrinology",
];

export default function WorksheetPage() {
  const toast = useToast();
  
  // Date Mode State: "today" | "yesterday" | "date"
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "date">("today");
  const [specificDate, setSpecificDate] = useState<string>(getTodayStr());

  // Department Filters
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(STANDARD_DEPARTMENTS);

  // Search & Patient Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());

  // Generation / Download state
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);
  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);
  const [labProfile, setLabProfile] = useState<any>(null);

  // Hidden print container ref (preview is strictly hidden from screen)
  const worksheetPrintRef = useRef<HTMLDivElement>(null);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  // Close department dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch Lab profile for worksheet branding
  useEffect(() => {
    fetchFromLaravel("/lab")
      .then((res) => {
        if (res?.data) setLabProfile(res.data);
        else if (res?.name) setLabProfile(res);
      })
      .catch(() => {});
  }, []);

  // Fetch Patients List based on selected Date
  const loadPatientsForDate = useCallback(async (mode: "today" | "yesterday" | "date", dateVal?: string) => {
    setIsLoadingPatients(true);
    try {
      const params = new URLSearchParams();
      if (mode === "today") {
        params.append("date", "today");
      } else if (mode === "yesterday") {
        params.append("date", "yesterday");
      } else if (mode === "date") {
        params.append("date", dateVal || specificDate || getTodayStr());
      }
      params.append("limit", "200");

      const res = await fetchFromLaravel(`/reports?${params.toString()}`, { skipCache: true });
      const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

      setPatientsList(list);

      // By default unselected (user requested default unselected)
      setSelectedReportIds(new Set());

      // Extract unique categories for department picker
      const detectedCats = new Set<string>();
      list.forEach((r) => {
        if (Array.isArray(r.results)) {
          r.results.forEach((resItem: any) => {
            const cat = resItem.test?.category || resItem.test?.parent?.category;
            if (cat) detectedCats.add(cat);
          });
        }
      });
      if (detectedCats.size > 0) {
        setAvailableDepartments(Array.from(new Set([...STANDARD_DEPARTMENTS, ...Array.from(detectedCats)])));
      }
    } catch (err: any) {
      console.error("Failed to load patients for date:", err);
      toast.error("Error", "Could not fetch patient records for the selected date.");
      setPatientsList([]);
      setSelectedReportIds(new Set());
    } finally {
      setIsLoadingPatients(false);
    }
  }, [specificDate, toast]);

  // Initial load: Fetch Today's patients
  useEffect(() => {
    loadPatientsForDate(dateMode, specificDate);
  }, [dateMode, specificDate, loadPatientsForDate]);

  // Filtered patients based on search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patientsList;
    const q = searchQuery.toLowerCase().trim();
    return patientsList.filter((r) => {
      const patName = (r.patient?.name || "").toLowerCase();
      const patId = (r.patient?.customId || r.patient?.custom_id || "").toLowerCase();
      const repId = (r.customId || r.custom_id || "").toLowerCase();
      const phone = (r.patient?.phone || "").toLowerCase();
      return patName.includes(q) || patId.includes(q) || repId.includes(q) || phone.includes(q);
    });
  }, [patientsList, searchQuery]);

  // Toggle single patient selection
  const toggleSelectPatient = (id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all / Deselect all
  const isAllSelected = filteredPatients.length > 0 && filteredPatients.every((r) => selectedReportIds.has(r.id));
  const isSomeSelected = filteredPatients.some((r) => selectedReportIds.has(r.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered
      setSelectedReportIds((prev) => {
        const next = new Set(prev);
        filteredPatients.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedReportIds((prev) => {
        const next = new Set(prev);
        filteredPatients.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleSelectAllDepartments = () => {
    setSelectedDepartments([]);
  };

  // Helper to fetch worksheet data from backend
  const fetchWorksheetPayload = async () => {
    const targetIds = Array.from(selectedReportIds);
    if (targetIds.length === 0) {
      toast.warning("No Patients Selected", "Please select at least one patient to generate the worksheet.");
      return null;
    }

    const params = new URLSearchParams();
    params.append("report_ids", targetIds.join(","));

    if (dateMode === "today") params.append("date", "today");
    else if (dateMode === "yesterday") params.append("date", "yesterday");
    else if (dateMode === "date" && specificDate) params.append("date", specificDate);

    if (selectedDepartments.length > 0) {
      params.append("departments", selectedDepartments.join(","));
    }

    const res = await fetchFromLaravel(`/reports/worksheet?${params.toString()}`, { skipCache: true });

    if (!res || res.status !== "success" || !res.patients) {
      toast.error("Worksheet Generation Failed", res?.message || "Could not retrieve worksheet records.");
      return null;
    }

    const enriched: WorksheetData = {
      generated_at: res.generated_at || new Date().toLocaleString("en-IN"),
      total_patients: res.total_patients || res.patients.length || 0,
      patients: res.patients || [],
      lab_name: labProfile?.name || labProfile?.centre_name || "OnePath Diagnostic Laboratory",
    };

    return enriched;
  };

  // Direct 1-Click PDF Download (Zero Preview on screen)
  const handleDownloadWorksheet = async () => {
    if (selectedReportIds.size === 0) {
      toast.warning("No Patients Selected", "Please select at least one patient to download the worksheet.");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const payload = await fetchWorksheetPayload();
      if (!payload) return;

      if (payload.total_patients === 0) {
        toast.warning("No Tests Found", "No tests found for the selected patients and departments.");
        return;
      }

      setWorksheetData(payload);

      // Allow hidden DOM container to update
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!worksheetPrintRef.current) {
        toast.error("Download Error", "Print template not ready. Please try again.");
        return;
      }

      const dateTag = dateMode === "today" ? "Today" : dateMode === "yesterday" ? "Yesterday" : specificDate;
      const filename = `Worksheet_${dateTag}_${payload.total_patients}Patients_${new Date().toISOString().slice(0, 10)}.pdf`;

      await downloadNativePdf({
        printContainer: worksheetPrintRef.current,
        filename,
      });

      toast.success(
        "Worksheet Downloaded!",
        `Successfully generated vector worksheet PDF for ${payload.total_patients} patients.`
      );
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast.error("Download Error", err?.message || "Failed to download vector PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct 1-Click Physical Browser Print (Zero Preview on screen)
  const handleDirectPrint = async () => {
    if (selectedReportIds.size === 0) {
      toast.warning("No Patients Selected", "Please select at least one patient to print the worksheet.");
      return;
    }

    setIsDirectPrinting(true);
    try {
      const payload = await fetchWorksheetPayload();
      if (!payload) return;

      setWorksheetData(payload);
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (worksheetPrintRef.current) {
        const dateTag = dateMode === "today" ? "Today" : dateMode === "yesterday" ? "Yesterday" : specificDate;
        printInvoiceElement(worksheetPrintRef.current, `Lab_Worksheet_${dateTag}`);
      }
    } catch (err: any) {
      console.error("Direct print failed:", err);
      toast.error("Print Error", err?.message || "Failed to print worksheet.");
    } finally {
      setIsDirectPrinting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
              <span>Manual Laboratory Worksheet</span>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                1-Click Download
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Select registered patients by date, choose departments, and directly download clean vector bench sheets.
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDirectPrint}
            disabled={isDirectPrinting || isDownloadingPdf || selectedReportIds.size === 0}
            className="h-10 px-3 sm:px-4 text-xs font-bold gap-1.5 cursor-pointer rounded-xl bg-card border-border/80 hover:bg-muted justify-center flex-1 sm:flex-none"
          >
            {isDirectPrinting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">Print ({selectedReportIds.size})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadWorksheet}
            disabled={isDownloadingPdf || isDirectPrinting || selectedReportIds.size === 0}
            className="h-10 px-3 sm:px-5 text-xs font-bold gap-1.5 sm:gap-2 gradient-primary text-primary-foreground cursor-pointer rounded-xl shadow-md hover:opacity-95 justify-center flex-1 sm:flex-none"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{isDownloadingPdf ? "Downloading..." : `Download (${selectedReportIds.size})`}</span>
          </Button>
        </div>
      </div>

      {/* ── Filter Controls Card ───────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
          {/* Date Selector Tabs */}
          <div className="space-y-1.5 w-full lg:w-auto">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Select Registration Date:</span>
            </label>
            <div className="grid grid-cols-3 sm:inline-flex p-1 bg-muted/70 rounded-xl border border-border/70 shadow-xs gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDateMode("today")}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateMode === "today"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Today</span>
              </button>

              <button
                type="button"
                onClick={() => setDateMode("yesterday")}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateMode === "yesterday"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>Yesterday</span>
              </button>

              <button
                type="button"
                onClick={() => setDateMode("date")}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateMode === "date"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Specific</span>
              </button>
            </div>
          </div>

          {/* Specific Date Picker (Visible when "Specific Date" is selected) */}
          {dateMode === "date" && (
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-xs font-bold text-foreground">
                Choose Specific Date
              </label>
              <Input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="h-10 rounded-xl text-xs bg-background border-border/90 shadow-xs"
              />
            </div>
          )}

          {/* Department Filter Dropdown */}
          <div className="space-y-1.5 min-w-[240px]" ref={deptDropdownRef}>
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Department Filter
              </span>
              {selectedDepartments.length > 0 ? (
                <span className="text-[10.5px] font-mono text-primary font-bold">
                  {selectedDepartments.length} Selected
                </span>
              ) : (
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                  All Departments
                </span>
              )}
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/90 bg-background text-xs font-semibold text-foreground flex items-center justify-between shadow-xs hover:border-primary/50 transition-colors cursor-pointer text-left"
              >
                <div className="truncate">
                  {selectedDepartments.length === 0 ? (
                    <span className="text-foreground font-semibold">All Departments (Show All)</span>
                  ) : (
                    <span>{selectedDepartments.join(", ")}</span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown with Checkboxes */}
              {isDeptDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 p-2 rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-2xl space-y-1 animate-fade-in max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/70 text-[11px]">
                    <span className="font-bold text-muted-foreground">Select Departments</span>
                    <button
                      type="button"
                      onClick={handleSelectAllDepartments}
                      className="text-primary hover:underline font-bold cursor-pointer"
                    >
                      Reset to All
                    </button>
                  </div>

                  <label
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      selectedDepartments.length === 0 ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepartments.length === 0}
                      onChange={handleSelectAllDepartments}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <span className="flex-1 truncate font-bold">All Departments (Recommended)</span>
                  </label>

                  {availableDepartments.map((dept) => {
                    const isChecked = selectedDepartments.includes(dept);
                    return (
                      <label
                        key={dept}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDepartment(dept)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <span className="flex-1 truncate">{dept}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar & Quick Counters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search patients by name, PID, report ID, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Selected: <strong className="text-foreground">{selectedReportIds.size}</strong> of {filteredPatients.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectAll}
                className="h-8 sm:h-9 text-xs font-bold text-primary hover:text-primary cursor-pointer px-2 sm:px-3"
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadPatientsForDate(dateMode, specificDate)}
                disabled={isLoadingPatients}
                className="h-8 sm:h-9 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl px-2 sm:px-3"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingPatients ? "animate-spin text-primary" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Patient Selection Table ────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoadingPatients ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Loading patients for selected date...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground px-4 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-1" />
              <p className="text-sm font-bold text-foreground">
                No patients found for {dateMode === "today" ? "Today" : dateMode === "yesterday" ? "Yesterday" : specificDate}.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                No patient investigations were registered on this date. Switch to another date or register new patients from the Registration page.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground whitespace-nowrap">
                  <th className="w-10 px-2 sm:px-3 py-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="cursor-pointer text-foreground flex items-center justify-center mx-auto"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : isSomeSelected ? (
                        <div className="h-4 w-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-primary rounded-xs" />
                        </div>
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                  <th className="px-2.5 sm:px-3.5 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">Patient</th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap hidden sm:table-cell">PID</th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap hidden md:table-cell">Report ID</th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap hidden sm:table-cell">Age/Gen</th>
                  <th className="px-2.5 sm:px-3 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">Tests</th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap hidden lg:table-cell">Time</th>
                  <th className="px-2.5 sm:px-3.5 py-3 font-bold uppercase tracking-wider text-[10px] text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredPatients.map((rep, idx) => {
                  const isChecked = selectedReportIds.has(rep.id);
                  const patName = rep.patient?.name || "Patient";
                  const patId = rep.patient?.customId || rep.patient?.custom_id || "PAT";
                  const repId = rep.customId || rep.custom_id || "OPL";
                  const patAge = rep.patient?.age ? `${rep.patient?.age}Y` : "—";
                  const patGender = (rep.patient?.gender || "—").slice(0, 1).toUpperCase();
                  const regTime = rep.createdAt || rep.created_at
                    ? new Date(rep.createdAt || rep.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  // Extract distinct test names
                  const testNames: string[] = [];
                  if (Array.isArray(rep.results)) {
                    rep.results.forEach((r: any) => {
                      const root = r.test?.parent?.parent || r.test?.parent || r.test;
                      if (root?.name && !testNames.includes(root.name)) {
                        testNames.push(root.name);
                      }
                    });
                  }

                  const getShortTestName = (name: string): string => {
                    if (!name) return "";
                    const clean = name.trim();
                    const parenMatch = clean.match(/\(([A-Za-z0-9\-_]{2,6})\)/);
                    if (parenMatch) return parenMatch[1];
                    return clean.length > 9 ? clean.slice(0, 8) + ".." : clean;
                  };

                  const displayedTests = testNames.slice(0, 1);
                  const remainingCount = testNames.length - displayedTests.length;

                  return (
                    <tr
                      key={rep.id || idx}
                      onClick={() => toggleSelectPatient(rep.id)}
                      className={`transition-colors cursor-pointer whitespace-nowrap ${
                        isChecked
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="w-10 px-2 sm:px-3 py-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelectPatient(rep.id)}
                          aria-label={`Select patient ${patName}`}
                        />
                      </td>

                      <td className="px-2.5 sm:px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2 max-w-[170px] sm:max-w-[200px]">
                          <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <User className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground text-xs truncate block" title={patName}>
                              {patName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:hidden">
                              <span className="font-mono">{patId}</span>
                              <span>·</span>
                              <span>{patAge}/{patGender}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 font-mono text-muted-foreground font-semibold text-[11px] whitespace-nowrap hidden sm:table-cell">
                        {patId}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap hidden md:table-cell">
                        <span className="font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                          {repId}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-muted-foreground text-[11px] whitespace-nowrap hidden sm:table-cell">
                        {patAge} / {patGender}
                      </td>

                      <td className="px-2.5 sm:px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {displayedTests.map((tn, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] sm:text-[10.5px] font-semibold bg-muted/90 text-foreground px-1.5 sm:px-2 py-0.5 rounded border border-border/70 whitespace-nowrap max-w-[90px] sm:max-w-none truncate"
                              title={tn}
                            >
                              {getShortTestName(tn)}
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <span
                              className="text-[9.5px] sm:text-[10px] font-bold text-primary bg-primary/10 px-1 sm:px-1.5 py-0.5 rounded border border-primary/20 whitespace-nowrap"
                              title={`${remainingCount} more tests`}
                            >
                              +{remainingCount}
                            </span>
                          )}
                          {testNames.length === 0 && (
                            <span className="text-muted-foreground text-[10px]">No tests</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-[11px] whitespace-nowrap hidden lg:table-cell">
                        {regTime}
                      </td>

                      <td className="px-2.5 sm:px-3.5 py-2.5 text-right whitespace-nowrap">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap ${
                            rep.status === "APPROVED" || rep.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {rep.status || "NEW"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer Bottom Sticky Action Bar */}
        {filteredPatients.length > 0 && (
          <div className="p-4 px-6 bg-muted/30 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{selectedReportIds.size}</span>
              <span>of {filteredPatients.length} patients ready for manual laboratory worksheet generation.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDirectPrint}
                disabled={isDirectPrinting || isDownloadingPdf || selectedReportIds.size === 0}
                className="h-10 px-4 text-xs font-bold gap-1.5 cursor-pointer rounded-xl bg-background flex-1 sm:flex-none"
              >
                {isDirectPrinting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>Print Selected</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleDownloadWorksheet}
                disabled={isDownloadingPdf || isDirectPrinting || selectedReportIds.size === 0}
                className="h-10 px-6 text-xs font-bold gap-2 gradient-primary text-primary-foreground cursor-pointer rounded-xl shadow-md flex-1 sm:flex-none hover:opacity-95"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isDownloadingPdf ? "Downloading..." : `Download Worksheet (${selectedReportIds.size})`}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Invisible Print Container (Zero Preview on screen, pure vector engine) ── */}
      <div
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: "850px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -100,
        }}
      >
        <div ref={worksheetPrintRef}>
          {worksheetData && <WorksheetSheet data={worksheetData} />}
        </div>
      </div>
    </div>
  );
}
