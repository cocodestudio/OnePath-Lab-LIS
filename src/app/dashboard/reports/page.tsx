"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ReportSheet, type ReportSheetData } from "@/components/report-sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Printer, ChevronLeft, ChevronRight, Edit3, AlertTriangle,
  Filter, X, Eye, Plus, Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FullscreenPrintReportModal } from "@/components/fullscreen-print-report-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchFromLaravel } from "@/lib/api-client";

interface Test { 
  name: string; 
  category: string; 
  fieldType?: string;
  parentId?: string | null;
  parent?: Test | null;
}
interface ReportTest { id: string; resultValue: string | null; isAbnormal: boolean; test: Test; }
interface Report {
  id: string; customId: string; status: string; createdAt: string;
  patient: { name: string; customId: string; phone: string; age: number; gender: string };
  bill: { customId: string; total: number; status: string };
  results: ReportTest[];
}

const DEFAULT_LAB = { name: "OnePath Lab Main", email: "info@onepathlab.com", address: "123 Healthcare Blvd, Medical District, Delhi", logoUrl: "/onepath-logo.png" };

export default function ReportsListPage() {
  const { error: toastError } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);

  const shiftDate = (days: number) => {
    const base = filterDate ? new Date(filterDate) : new Date();
    base.setDate(base.getDate() + days);
    setFilterDate(base.toISOString().split("T")[0]);
  };

  const [printReport, setPrintReport] = useState<any | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel("/reports");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setReports(list);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerPrint = async (id: string) => {
    try {
      setPrintingId(id);
      const data = await fetchFromLaravel(`/reports/${id}`);
      setPrintReport({ ...data, lab: data.lab || DEFAULT_LAB });
      setShowPrintOptions(true);
    } catch {
      toastError("Could not load report", "Failed to fetch report data for printing.");
    } finally {
      setPrintingId(null);
    }
  };

  const safeReports = Array.isArray(reports) ? reports : [];

  const categories = Array.from(
    new Set(
      safeReports.flatMap((r: any) =>
        Array.isArray(r.results)
          ? r.results.map((res: any) => res.test?.category).filter(Boolean)
          : []
      )
    )
  );

  const filteredReports = safeReports.filter((r: any) => {
    if (!r) return false;
    const patName = r.patient?.name || "";
    const patId = r.patient?.custom_id || r.patient?.customId || "";
    const repId = r.custom_id || r.customId || "";
    const repDate = r.created_at || r.createdAt || "";

    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      patId.toLowerCase().includes(search.toLowerCase()) ||
      repId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      r.status === statusFilter ||
      (statusFilter === "APPROVED" && (r.status === "COMPLETED" || r.status === "APPROVED"));
    const resultsList = Array.isArray(r.results) ? r.results : [];
    const matchesCategory =
      categoryFilter === "ALL" ||
      resultsList.some((res: any) => res.test?.category === categoryFilter);
    const matchesDate = filterDate && repDate ? repDate.startsWith(filterDate) : true;

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  const totalRows = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredReports.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, categoryFilter, filterDate]);

  const clearFilters = () => { setSearch(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); setFilterDate(""); };
  const hasFilters = search || statusFilter !== "ALL" || categoryFilter !== "ALL" || filterDate;

  const selectClass = "w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Diagnostics</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter test results, review findings, and issue diagnostic patient reports.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card">
        <div className="flex flex-col sm:flex-row flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input placeholder="Patient, ID, report…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          
          <div className="space-y-1.5 w-full sm:w-auto">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filter Date</label>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-background border border-border/90 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <input 
                  type="date" 
                  className="h-8 px-2 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)} 
                />

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilterDate(new Date().toISOString().split("T")[0])}
                className={`h-10 px-3 text-xs font-bold ${
                  filterDate === new Date().toISOString().split("T")[0]
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground"
                }`}
              >
                Today
              </Button>

              {filterDate && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterDate("")} 
                  className="h-10 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                >
                  All Dates
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 w-full sm:w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="FINAL">Final</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>

          <div className="space-y-1.5 w-full sm:w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</label>
            <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={clearFilters} variant="outline" className="h-10 text-xs gap-1.5">
                <X className="h-4 w-4" /> Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
              <Filter className="h-10 w-10 opacity-25" />
              <p className="text-sm font-medium">No reports match your criteria.</p>
              <p className="text-xs text-muted-foreground/70">Try clearing filters or starting a new registration.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60">
                  {["Report ID", "Patient", "Received", "Tests", "Status", ""].map((h, i) => (
                    <th key={h + i} className={`px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap ${i === 2 || i === 3 ? "hidden lg:table-cell" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((rep: any) => {
                  const resultsList = Array.isArray(rep.results) ? rep.results : [];
                  const abnormalCount = resultsList.filter((r: any) => r.isAbnormal || r.is_abnormal).length;
                  const patName = rep.patient?.name || "Patient";
                  const patId = rep.patient?.custom_id || rep.patient?.customId || "N/A";
                  const patAge = rep.patient?.age || "N/A";
                  const patGender = rep.patient?.gender || "N/A";
                  const repId = rep.custom_id || rep.customId || "REP";
                  const repDate = rep.created_at || rep.createdAt;

                  return (
                    <tr key={rep.id} className="border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{repId}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground text-sm">{patName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{patId} · {patAge}y/{patGender}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs hidden lg:table-cell whitespace-nowrap">
                        {repDate ? new Date(repDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                          {resultsList.slice(0, 4).map((r: any) => {
                            const testObj = r.test || {};
                            const name = testObj.fieldType === "Custom Editor" && testObj.name === "Report Template" && testObj.parent ? testObj.parent.name : (testObj.name || "Test");
                            const isAbn = r.isAbnormal || r.is_abnormal;
                            return (
                              <span key={r.id} className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isAbn ? "bg-destructive/8 text-destructive border-destructive/20" : "bg-accent text-accent-foreground border-transparent"}`}>{name}</span>
                            );
                          })}
                          {resultsList.length > 4 && <span className="text-[10px] text-muted-foreground font-medium px-1 py-0.5">+{resultsList.length - 4}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {rep.status === "APPROVED" || rep.status === "COMPLETED" ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              APPROVED
                            </span>
                          ) : rep.status === "FINAL" ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              FINAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              PENDING
                            </span>
                          )}
                          {(rep.status === "APPROVED" || rep.status === "COMPLETED" || rep.status === "FINAL") && abnormalCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[9px] font-bold text-destructive uppercase tracking-wide whitespace-nowrap">
                              <AlertTriangle className="h-3 w-3" /> {abnormalCount} abnormal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1.5 min-w-[125px]">
                          <Link href={`/dashboard/reports/${rep.id}/edit`} className="w-full">
                            <Button size="sm" className="h-8 gap-1.5 w-full font-bold text-xs">
                              <Edit3 className="h-3.5 w-3.5" /> Enter Results
                            </Button>
                          </Link>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            onClick={() => triggerPrint(rep.id)} 
                            disabled={printingId === rep.id}
                            className="h-8 gap-1.5 w-full font-bold text-xs rounded-xl border border-border/80 hover:bg-muted text-foreground cursor-pointer"
                            title="Print report"
                          >
                            {printingId === rep.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5 text-primary" />}
                            <span>Print Report</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalRows > 0 && (
          <div className="bg-muted/20 px-6 py-3.5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{indexOfFirstRow + 1}</span>–<span className="font-semibold text-foreground">{Math.min(indexOfLastRow, totalRows)}</span> of <span className="font-semibold text-foreground">{totalRows}</span> reports
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows:</span>
                <Select value={rowsPerPage.toString()} onValueChange={(val) => { setRowsPerPage(Number(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs font-semibold w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs font-semibold text-foreground px-2">{currentPage} / {totalPages}</span>
                <Button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FullscreenPrintReportModal 
        open={showPrintOptions} 
        onOpenChange={(open) => {
          setShowPrintOptions(open);
          if (!open) fetchReports();
        }} 
        report={printReport} 
      />
    </div>
  );
}
