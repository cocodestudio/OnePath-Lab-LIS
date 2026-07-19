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
import { PrintPreviewDialog } from "@/components/print-preview-dialog";
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
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);

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
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
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

  const categories = Array.from(new Set(reports.flatMap((r) => r.results.map((res) => res.test.category)))).filter(Boolean);

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      r.patient.customId.toLowerCase().includes(search.toLowerCase()) ||
      r.customId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || r.results.some((res) => res.test.category === categoryFilter);
    const matchesAbnormal = !abnormalOnly || r.results.some((res) => res.isAbnormal);
    const matchesDate = filterDate ? r.createdAt.startsWith(filterDate) : true;
    return matchesSearch && matchesStatus && matchesCategory && matchesAbnormal && matchesDate;
  });

  const totalRows = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredReports.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, categoryFilter, abnormalOnly, filterDate]);

  const clearFilters = () => { setSearch(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); setAbnormalOnly(false); setFilterDate(""); };
  const hasFilters = search || statusFilter !== "ALL" || categoryFilter !== "ALL" || abnormalOnly || filterDate;

  const selectClass = "w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Diagnostics</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter test results and generate patient reports.</p>
        </div>
        <Link href="/dashboard/patients/register">
          <Button size="sm" className="h-10"><Plus className="h-4 w-4" /> New Patient</Button>
        </Link>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                className="w-full sm:w-[150px]"
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
              />

            </div>
          </div>


          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => setAbnormalOnly(!abnormalOnly)} variant={abnormalOnly ? "destructive" : "outline"} className="h-10 flex-1 sm:flex-none">
              <AlertTriangle className="h-4 w-4" /> Abnormal
            </Button>
            {hasFilters && (
              <Button onClick={clearFilters} variant="ghost" size="icon" className="h-10 w-10 shrink-0" title="Clear filters"><X className="h-4 w-4" /></Button>
            )}
          </div>
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
                {currentRows.map((rep) => {
                  const abnormalCount = rep.results.filter((r) => r.isAbnormal).length;
                  return (
                    <tr key={rep.id} className="border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{rep.customId}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground text-sm">{rep.patient.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rep.patient.customId} · {rep.patient.age}y/{rep.patient.gender}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs hidden lg:table-cell whitespace-nowrap">
                        {new Date(rep.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                          {rep.results.slice(0, 4).map((r) => {
                            const name = r.test.fieldType === "Custom Editor" && r.test.name === "Report Template" && r.test.parent ? r.test.parent.name : r.test.name;
                            return (
                              <span key={r.id} className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${r.isAbnormal ? "bg-destructive/8 text-destructive border-destructive/20" : "bg-accent text-accent-foreground border-transparent"}`}>{name}</span>
                            );
                          })}
                          {rep.results.length > 4 && <span className="text-[10px] text-muted-foreground font-medium px-1 py-0.5">+{rep.results.length - 4}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rep.status === "COMPLETED" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rep.status === "COMPLETED" ? "bg-primary" : "bg-gold"}`} />{rep.status}
                          </span>
                          {rep.status === "COMPLETED" && abnormalCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[9px] font-bold text-destructive uppercase tracking-wide whitespace-nowrap"><AlertTriangle className="h-3 w-3" /> {abnormalCount} abnormal</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {rep.status === "PENDING" ? (
                            <Link href={`/dashboard/reports/${rep.id}/edit`}>
                              <Button size="sm" className="h-8"><Edit3 className="h-3.5 w-3.5" /> Enter Results</Button>
                            </Link>
                          ) : (
                            <>
                              <Link href={`/dashboard/reports/${rep.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Edit report"><Edit3 className="h-3.5 w-3.5" /></Button>
                              </Link>
                              <Button variant="outline" size="sm" className="h-8" onClick={() => triggerPrint(rep.id)} disabled={printingId === rep.id} title="Print report">
                                {printingId === rep.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Print
                              </Button>
                            </>
                          )}
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

      <PrintPreviewDialog 
        open={showPrintOptions} 
        onOpenChange={setShowPrintOptions} 
        report={printReport} 
      />
    </div>
  );
}
