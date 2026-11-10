"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  IndianRupee,
  Eye,
  Download,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Building2
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { printInvoiceElement } from "@/lib/print-invoice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export interface MonthlyExpensesRegisterProps {
  initialMonth?: number;
  initialYear?: number;
}

export function MonthlyExpensesRegister({
  initialMonth,
  initialYear,
}: MonthlyExpensesRegisterProps) {
  const toast = useToast();
  const printableRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || currentYear);
  const [selectedScope, setSelectedScope] = useState<string>("main_lab");
  const [collectionCenters, setCollectionCenters] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [labInfo, setLabInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // User & Role detection
  const [currentUser, setCurrentUser] = useState<any>(() => getStoredUser());
  useEffect(() => {
    const u = getStoredUser();
    if (u) setCurrentUser(u);
  }, []);
  const userRole = String(currentUser?.role || "").toUpperCase();
  const isCollectionCenter = userRole === "COLLECTION_CENTER" || userRole === "COLLECTION_CENTRE";

  // Fetch active collection centres for admin dropdown
  useEffect(() => {
    fetchFromLaravel("/collection-centers")
      .then((res) => {
        if (Array.isArray(res)) {
          const active = res.filter((c: any) => {
            const role = String(c.role || "").toUpperCase();
            const status = String(c.status || "").toLowerCase();
            return (
              (role === "COLLECTION_CENTER" || role === "COLLECTION_CENTRE") &&
              status !== "inactive" &&
              status !== "suspended"
            );
          });
          setCollectionCenters(active);
        }
      })
      .catch((err) => console.warn("Could not fetch collection centers for monthly report:", err));
  }, []);

  const selectedCenterObj = useMemo(() => {
    if (selectedScope === "main_lab") return null;
    const id = selectedScope.startsWith("cc_") ? selectedScope.slice(3) : selectedScope;
    return collectionCenters.find((c) => String(c.id) === String(id)) || null;
  }, [selectedScope, collectionCenters]);

  // Available year list: current year ± 3 years
  const availableYears = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Load monthly register from backend
  const fetchRegister = async (m = selectedMonth, y = selectedYear, sc = selectedScope) => {
    try {
      setLoading(true);
      const res = await fetchFromLaravel(
        `/finance/monthly-expenses?year=${y}&month=${m}&scope=${encodeURIComponent(sc)}`,
        { skipCache: true, timeoutMs: 25000 }
      );

      if (res && (res.status === "success" || Array.isArray(res.rows))) {
        setData(res);
        setHasFetched(true);
      } else {
        toast.error("Failed to load", res?.message || "Could not fetch monthly expenses.");
      }
    } catch (err: any) {
      console.error("Error fetching monthly expenses register:", err);
      toast.error("Error", "Failed to retrieve monthly financial register from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister(selectedMonth, selectedYear, selectedScope);
    fetchFromLaravel("/lab").then((res) => {
      if (res) setLabInfo(res);
    }).catch(() => {});
  }, []);

  const handleScopeChange = (val: string) => {
    setSelectedScope(val);
    fetchRegister(selectedMonth, selectedYear, val);
  };

  const handleShowClick = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegister(selectedMonth, selectedYear, selectedScope);
  };

  // Format currency in Indian numbering system
  const formatINR = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Clean CSV Export
  const handleDownloadCSV = () => {
    if (!data?.rows || data.rows.length === 0) {
      toast.warning("No Data", "No monthly sales data available to export.");
      return;
    }

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows: string[] = [];
    csvRows.push([
      escapeCsv("Date"),
      escapeCsv("Cash (INR)"),
      escapeCsv("UPI (INR)"),
      escapeCsv("Dues (INR)"),
      escapeCsv("Total (INR)"),
    ].join(","));

    (data.rows || []).forEach((r: any) => {
      const fullDate = `${r.formatted_date || r.date}${r.day_name ? ` (${r.day_name.slice(0, 3)})` : ""}`;
      csvRows.push([
        escapeCsv(fullDate),
        escapeCsv(Number(r.cash || 0).toFixed(2)),
        escapeCsv(Number(r.upi || 0).toFixed(2)),
        escapeCsv(Number(r.dues || 0).toFixed(2)),
        escapeCsv(Number(r.total || 0).toFixed(2)),
      ].join(","));
    });

    // Final Total Row at bottom
    csvRows.push([
      escapeCsv(`SUB TOTAL / FINAL TOTAL (${data.month_name || "Month"} ${data.year || ""})`),
      escapeCsv(Number(data.summary?.total_cash || 0).toFixed(2)),
      escapeCsv(Number(data.summary?.total_upi || 0).toFixed(2)),
      escapeCsv(Number(data.summary?.total_dues || 0).toFixed(2)),
      escapeCsv(Number(data.summary?.final_total || 0).toFixed(2)),
    ].join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const scopeSuffix = selectedScope === "main_lab" ? "MainLab" : (selectedCenterObj?.name ? selectedCenterObj.name.replace(/[^a-zA-Z0-9]/g, "_") : selectedScope);
    link.setAttribute("download", `Monthly_Business_${scopeSuffix}_${data.month_name || selectedMonth}_${data.year || selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV Downloaded", "Monthly register exported successfully.");
  };

  // Isolated print of only the statement and table
  const handlePrint = () => {
    if (printableRef.current) {
      const scopeSuffix = selectedScope === "main_lab" ? "MainLab" : (selectedCenterObj?.name ? selectedCenterObj.name.replace(/[^a-zA-Z0-9]/g, "_") : selectedScope);
      printInvoiceElement(
        printableRef.current,
        `Monthly_Business_${scopeSuffix}_${data?.month_name || selectedMonth}_${data?.year || selectedYear}`
      );
    } else {
      window.print();
    }
  };

  const selectedMonthName = MONTHS.find((m) => m.value === selectedMonth)?.label || "Selected Month";

  return (
    <div className="space-y-4 animate-fade-in text-foreground">
      {/* ── Collection Centre Scoping Pill (If logged in as CC) ── */}
      {isCollectionCenter && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Collection Centre Business: <strong className="font-bold">{currentUser?.name || "Your Centre"}</strong></span>
        </div>
      )}

      {/* ── Compact Month, Year & Scope Selector Toolbar ── */}
      <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-xs">
        <form onSubmit={handleShowClick} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Month, Year, and Center Scope Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
              {/* Month Dropdown */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap shrink-0">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full sm:w-auto h-9 px-2 sm:px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs min-w-0"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap shrink-0">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full sm:w-auto h-9 px-2 sm:px-3 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs min-w-0"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scope / Collection Center Selector (Admin & Staff) */}
            {!isCollectionCenter && (
              <div className="flex items-center gap-1.5 w-full sm:w-[220px]">
                <Select value={selectedScope} onValueChange={handleScopeChange}>
                  <SelectTrigger
                    className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none w-full ${
                      selectedScope === "main_lab"
                        ? "bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 border-indigo-400/50 dark:border-indigo-600/50"
                        : "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-400/50 dark:border-emerald-600/50"
                    }`}
                    aria-label="Select Scope: Main Lab or Collection Centre"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm shrink-0">{selectedScope === "main_lab" ? "🔬" : "📍"}</span>
                      <span className="truncate">
                        {selectedScope === "main_lab"
                          ? "Main Lab (In-House)"
                          : selectedCenterObj
                          ? (selectedCenterObj.name || selectedCenterObj.lab_name || "Collection Centre")
                          : "Main Lab (In-House)"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent align="end" className="w-64 max-h-80 p-1.5 rounded-xl border-border shadow-xl">
                    <SelectItem value="main_lab" className="text-xs font-medium cursor-pointer py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>🔬</span>
                        <span className="font-semibold">Main Lab (In-House)</span>
                      </div>
                    </SelectItem>
                    {collectionCenters.length > 0 && (
                      <>
                        <div className="my-1.5 border-t border-border/70 px-2 pt-2 pb-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collection Centres</p>
                        </div>
                        {collectionCenters.map((cc) => (
                          <SelectItem key={String(cc.id)} value={`cc_${cc.id}`} className="text-xs font-medium cursor-pointer py-1.5 rounded-lg">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-xs shrink-0">📍</span>
                              <span className="truncate">{cc.name || cc.lab_name || "Collection Centre"}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Right: Action Buttons in clean sequence: Show -> Print -> Export CSV */}
          <div className={`${hasFetched && data ? 'grid grid-cols-3' : 'flex'} gap-2 sm:flex sm:items-center sm:gap-2 w-full lg:w-auto shrink-0 justify-end`}>
            {/* Show Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-3 sm:px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all w-full sm:w-auto whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{loading ? "Loading..." : "Show"}</span>
            </button>

            {/* Print & Export CSV (Sequenced cleanly) */}
            {hasFetched && data && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="h-9 px-2.5 sm:px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto whitespace-nowrap"
                  title="Print statement"
                >
                  <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="h-9 px-2.5 sm:px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto whitespace-nowrap"
                  title="Export CSV"
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">CSV</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* ── Summary Metric Cards (Loaded or Shimmer) ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs animate-pulse space-y-2.5">
              <div className="h-3 w-24 bg-muted/80 rounded" />
              <div className="h-6 sm:h-7 w-32 bg-muted rounded" />
              <div className="h-2.5 w-16 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
      ) : hasFetched && data?.summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Total Sales */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Month Sales
            </span>
            <div className="text-sm sm:text-lg font-bold font-mono text-foreground mt-1 truncate">
              {formatINR(data.summary.final_total)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {data.month_name || selectedMonthName} {data.year || selectedYear}
            </p>
          </div>

          {/* Cash Collections */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs min-w-0">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Cash Collections
            </span>
            <div className="text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatINR(data.summary.total_cash)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Counter Cash
            </p>
          </div>

          {/* UPI Collections */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs min-w-0">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              UPI Collections
            </span>
            <div className="text-sm sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
              {formatINR(data.summary.total_upi)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Online / QR
            </p>
          </div>

          {/* Outstanding Dues */}
          <div className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs min-w-0">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Total Dues
            </span>
            <div className="text-sm sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 truncate">
              {formatINR(data.summary.total_dues)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Unpaid Balance
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Printable Statement Container ── */}
      <div ref={printableRef} className="space-y-3">
        {/* Print-Only Header (Only visible when printing through printInvoiceElement) */}
        <div className="hidden print:block border-b border-black pb-3 mb-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-black">{labInfo?.name || "OnePath Diagnostic Laboratory"}</h2>
              <p className="text-xs text-gray-700">{labInfo?.address || "Main Diagnostic Center"}</p>
              {labInfo?.phone && <p className="text-xs text-gray-700">Phone: {labInfo.phone}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                Monthly Business Report • {selectedScope === "main_lab" ? "Main Lab" : (selectedCenterObj?.name || "Collection Centre")}
              </h3>
              <p className="text-xs text-gray-800 font-semibold">Period: {data?.month_name || selectedMonthName} {data?.year || selectedYear}</p>
              <p className="text-[10px] text-gray-600">Generated on: {new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* ── Daily Sales Register Table (Loaded or Shimmer) ── */}
        {loading ? (
          <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">Cash (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">UPI (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">Dues (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[110px]">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[...Array(10)].map((_, idx) => (
                    <tr key={idx} className="animate-pulse bg-card">
                      <td className="py-3 px-3 sm:px-4">
                        <div className="h-3.5 w-28 bg-muted/80 rounded" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="h-3.5 w-16 bg-muted/70 rounded ml-auto" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="h-3.5 w-16 bg-muted/70 rounded ml-auto" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="h-3.5 w-16 bg-muted/70 rounded ml-auto" />
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="h-3.5 w-20 bg-muted/90 rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : hasFetched && data?.rows && data.rows.length > 0 ? (
          <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
            {/* Mobile / Tablet Horizontal Scroller Wrapper: strictly prevents line-wrapping */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">Cash (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">UPI (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">Dues (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[110px]">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.rows.map((row: any) => {
                    const hasActivity = row.has_sales || row.total > 0 || row.upi > 0 || row.cash > 0 || row.dues > 0;
                    return (
                      <tr
                        key={row.date || row.day}
                        className={`hover:bg-muted/40 transition-colors ${
                          hasActivity ? "bg-card" : "bg-muted/10 opacity-70"
                        }`}
                      >
                        {/* Date: strictly one single line */}
                        <td className="py-2 px-3 sm:px-4 whitespace-nowrap">
                          <span className="font-semibold text-foreground">
                            {row.formatted_date || row.date}
                          </span>
                          {row.day_name && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                              ({row.day_name.slice(0, 3)})
                            </span>
                          )}
                        </td>

                        {/* Cash (Green if > 0) */}
                        <td className="py-2 px-3 sm:px-4 text-right whitespace-nowrap font-mono font-medium">
                          {row.cash > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatINR(row.cash)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">₹0.00</span>
                          )}
                        </td>

                        {/* UPI (Green if > 0) */}
                        <td className="py-2 px-3 sm:px-4 text-right whitespace-nowrap font-mono font-medium">
                          {row.upi > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatINR(row.upi)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">₹0.00</span>
                          )}
                        </td>

                        {/* Dues (Red if > 0) */}
                        <td className="py-2 px-3 sm:px-4 text-right whitespace-nowrap font-mono font-medium">
                          {row.dues > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              {formatINR(row.dues)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">₹0.00</span>
                          )}
                        </td>

                        {/* Total (Black / Bold) */}
                        <td className="py-2 px-3 sm:px-4 text-right whitespace-nowrap font-mono font-bold text-foreground">
                          {row.total > 0 ? (
                            <span>{formatINR(row.total)}</span>
                          ) : (
                            <span className="text-muted-foreground/50 font-normal">₹0.00</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ── Sub Total / Final Total Footer Row ── */}
                <tfoot>
                  <tr className="bg-muted/70 border-t-2 border-border text-foreground font-black text-xs">
                    <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap uppercase tracking-wider text-[11px]">
                      Sub Total / Final Total
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatINR(data?.summary?.total_cash)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatINR(data?.summary?.total_upi)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {formatINR(data?.summary?.total_dues)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-foreground font-black text-xs sm:text-sm">
                      {formatINR(data?.summary?.final_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : hasFetched ? (
          <div className="bg-card border border-border/80 rounded-xl p-10 text-center shadow-xs">
            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground">No Records Found</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              No sales or payments found for {selectedMonthName} {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border/80 rounded-xl p-10 text-center shadow-xs">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground">Select Month &amp; Year</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a month and year above and click &quot;Show&quot;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
