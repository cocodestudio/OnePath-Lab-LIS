"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2, Calendar, ChevronLeft, ChevronRight, Loader2, Clock,
  RefreshCw, X, Eye, Receipt, Stethoscope, CheckCircle2, AlertCircle,
  FileText, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface OutsourceCase {
  id: string;
  reg_no: string;
  date: string;
  created_at: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    custom_id: string;
    designation?: string;
  };
  doctor: string;
  investigations: string;
  tests: any[];
  bill?: {
    id: string;
    custom_id: string;
    total: number;
    paid_amount: number;
    discount?: number;
    due: number;
    status: string;
  } | null;
  status: string;
  is_due: boolean;
  due_amount: number;
}

export default function OutsourceCasesPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<OutsourceCase[]>([]);
  const [doctorStats, setDoctorStats] = useState<Record<string, number>>({});
  const [selectedDoctor, setSelectedDoctor] = useState("ALL");
  const [dateFilterMode, setDateFilterMode] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS" | "CUSTOM">("30DAYS");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPage, setPerPage] = useState(15);

  // Bill Modal
  const [selectedBillCase, setSelectedBillCase] = useState<OutsourceCase | null>(null);

  // Fetch Outsource Cases
  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", String(perPage));
      if (selectedDoctor !== "ALL") params.set("doctor", selectedDoctor);

      if (dateFilterMode !== "ALL") {
        if (fromDate) params.set("from_date", fromDate);
        if (toDate) params.set("to_date", toDate);
      }

      const res = await fetchFromLaravel(`/outsource-cases?${params.toString()}`);
      if (res) {
        setCases(Array.isArray(res.data) ? res.data : []);
        setTotalRecords(res.total || 0);
        if (res.doctor_stats) setDoctorStats(res.doctor_stats);
      }
    } catch (err: any) {
      console.error("Error fetching outsource cases:", err);
      // Fallback: search patients with outsource tests from local cache or /patients
      try {
        const fallbackRes = await fetchFromLaravel("/patients?per_page=50");
        if (fallbackRes && Array.isArray(fallbackRes.data)) {
          const filtered = fallbackRes.data
            .filter((p: any) => p.meta?.outsource_tests || p.meta?.has_outsource)
            .map((p: any) => ({
              id: p.id,
              reg_no: p.custom_id || p.customId || "REG",
              date: p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "Today",
              created_at: p.created_at,
              patient: {
                id: p.id,
                name: p.name,
                age: p.age,
                gender: p.gender,
                phone: p.phone,
                custom_id: p.custom_id || p.customId,
              },
              doctor: p.ref_doctor || p.refDoctor || "Self",
              investigations: Array.isArray(p.meta?.outsource_tests)
                ? p.meta.outsource_tests.map((t: any) => t.name || t).join(", ")
                : "Outsource Panel",
              tests: p.meta?.outsource_tests || [],
              status: "No due",
              is_due: false,
              due_amount: 0,
            }));
          setCases(filtered);
          setTotalRecords(filtered.length);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [currentPage, perPage, selectedDoctor, fromDate, toDate, dateFilterMode]);

  const handleDatePreset = (mode: "ALL" | "TODAY" | "7DAYS" | "30DAYS") => {
    setDateFilterMode(mode);
    const today = new Date().toISOString().split("T")[0];
    if (mode === "TODAY") {
      setFromDate(today);
      setToDate(today);
    } else if (mode === "7DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else if (mode === "30DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().split("T")[0]);
      setToDate(today);
    } else {
      setFromDate("");
      setToDate("");
    }
    setIsDatePickerOpen(false);
    setCurrentPage(1);
  };

  // Formatted display date range
  const dateRangeLabel = useMemo(() => {
    if (dateFilterMode === "ALL" || (!fromDate && !toDate)) return "All Dates";
    if (fromDate && toDate) {
      const f = fromDate.split("-").reverse().join("/");
      const t = toDate.split("-").reverse().join("/");
      return `${f} - ${t}`;
    }
    return fromDate ? `From ${fromDate}` : `To ${toDate}`;
  }, [dateFilterMode, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER BAR (Full-width edge-to-edge layout)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">
            Case Management
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Outsource Cases
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track diagnostic samples referred to external partner laboratories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCases}
            className="h-10 px-3.5 rounded-xl border-border text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILTER CONTROLS BAR (Date Range Box + Doctor Referral Filter)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* 1. Date Range Picker Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer shadow-2xs"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <span>{dateRangeLabel}</span>
              </button>

              {/* Date Filter Dropdown Popover */}
              {isDatePickerOpen && (
                <div className="absolute left-0 top-12 z-30 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 animate-scale-in">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Select Date Window</span>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDatePreset("TODAY")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "TODAY" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("7DAYS")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "7DAYS" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("30DAYS")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "30DAYS" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDatePreset("ALL")}
                      className={`p-2 rounded-lg text-left font-semibold transition-colors cursor-pointer ${
                        dateFilterMode === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
                      }`}
                    >
                      All Time
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Custom Date Range</span>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">From Date</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          setDateFilterMode("CUSTOM");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">To Date</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                          setToDate(e.target.value);
                          setDateFilterMode("CUSTOM");
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDatePickerOpen(false);
                      setCurrentPage(1);
                      fetchCases();
                    }}
                    className="w-full h-8 text-xs rounded-xl gradient-primary text-primary-foreground font-bold cursor-pointer"
                  >
                    Apply Range
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDatePreset("TODAY")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "TODAY"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("7DAYS")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "7DAYS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("30DAYS")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "30DAYS"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("ALL")}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dateFilterMode === "ALL"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* 2. Referral Doctor Filter */}
          <div className="w-full sm:w-auto min-w-[240px]">
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:border-primary outline-none cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Referral Doctors ({totalRecords} samples)</option>
              {Object.entries(doctorStats).map(([doc, count]) => (
                <option key={doc} value={doc}>
                  {doc} ({count} {count === 1 ? "sample" : "samples"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TABLE DISPLAY (Edge-to-edge, ultra-stable patient list)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/70 rounded-2xl shadow-card overflow-hidden w-full">
        <div className="table-responsive-container">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Reg no.
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Date
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Patient
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outsourced Investigations
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    <td className="px-6 py-4"><div className="h-4 w-16 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="h-4 w-32 rounded shimmer-gradient" />
                      <div className="h-3 w-16 rounded shimmer-gradient" />
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-48 rounded shimmer-gradient" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 w-20 rounded-full shimmer-gradient mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-20 rounded-xl shimmer-gradient ml-auto" /></td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto opacity-30 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">No Outsource Cases Found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      When patients are registered with tests selected under the &quot;Outsource Lab&quot; tab, they will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const patName = c.patient?.name || "Patient";
                  const patAge = c.patient?.age ? `${c.patient.age} YRS` : "";
                  const patGender = c.patient?.gender ? c.patient.gender.slice(0, 1).toUpperCase() : "";
                  const patSubtitle = [patAge, patGender].filter(Boolean).join("/");

                  // Parse individual tests to show chips
                  const investigationsList = c.investigations
                    ? c.investigations.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                    >
                      {/* 1. Reg no. */}
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                        {c.reg_no}
                      </td>

                      {/* 2. Date */}
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {c.date}
                      </td>

                      {/* 3. Patient */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sm text-foreground">{patName}</p>
                        <p className="text-xs text-muted-foreground">
                          {patSubtitle || "N/A"}{c.patient?.phone ? ` · ${c.patient.phone}` : ""}
                        </p>
                      </td>

                      {/* 5. Outsourced Investigations */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {investigationsList.slice(0, 3).map((testName, i) => (
                            <span
                              key={i}
                              className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                            >
                              {testName}
                            </span>
                          ))}
                          {investigationsList.length > 3 && (
                            <span className="text-[11px] text-muted-foreground font-semibold px-1 py-0.5">
                              +{investigationsList.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Status (No due / Due: Rs.X) */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {c.is_due ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            {c.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            No due
                          </span>
                        )}
                      </td>

                      {/* 7. Action: View bill ONLY */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBillCase(c)}
                          className="h-8 px-3 rounded-xl text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 cursor-pointer transition-colors"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>View bill</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PAGINATION BAR
        ═══════════════════════════════════════════════════════════════ */}
        {totalRecords > 0 && (
          <div className="border-t border-border/80 px-6 py-3.5 bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Showing{" "}
              <strong className="text-foreground">
                {Math.min(totalRecords, (currentPage - 1) * perPage + 1)}–
                {Math.min(totalRecords, currentPage * perPage)}
              </strong>{" "}
              of <strong className="text-foreground">{totalRecords}</strong> cases
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 font-mono font-semibold text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW BILL MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {selectedBillCase && (
        <Dialog open={Boolean(selectedBillCase)} onOpenChange={() => setSelectedBillCase(null)}>
          <DialogContent className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span>Patient Bill & Dues</span>
              </div>
              <span className="font-mono text-xs text-primary font-bold">
                {selectedBillCase.bill?.custom_id || selectedBillCase.reg_no}
              </span>
            </DialogTitle>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-bold text-foreground">{selectedBillCase.patient.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reg No / Date:</span>
                <span className="font-mono text-foreground">{selectedBillCase.reg_no} · {selectedBillCase.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Referring Doctor:</span>
                <span className="font-medium text-foreground">{selectedBillCase.doctor}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-muted-foreground">Total Bill Amount:</span>
                <span className="font-mono font-bold text-foreground">
                  ₹{Number(selectedBillCase.bill?.total || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid Amount:</span>
                <span className="font-mono font-bold text-emerald-600">
                  ₹{Number(selectedBillCase.bill?.paid_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Balance Due:</span>
                <span className={`font-mono font-black ${selectedBillCase.is_due ? "text-amber-600" : "text-emerald-600"}`}>
                  ₹{Number(selectedBillCase.due_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Outsourced Investigations
              </span>
              <p className="text-xs p-3 rounded-xl bg-background border border-border font-medium text-foreground leading-relaxed">
                {selectedBillCase.investigations}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedBillCase(null)}
                className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </Button>
              <Link href={`/dashboard/billing?search=${encodeURIComponent(selectedBillCase.reg_no)}`}>
                <Button
                  size="sm"
                  className="h-9 px-4 rounded-xl gradient-primary text-primary-foreground font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Open in Billing</span>
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
