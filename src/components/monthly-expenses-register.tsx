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

  // Available year list: current year ± 3 years
  const availableYears = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Load monthly register from backend
  const fetchRegister = async (m = selectedMonth, y = selectedYear) => {
    try {
      setLoading(true);
      const res = await fetchFromLaravel(
        `/finance/monthly-expenses?year=${y}&month=${m}`,
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
    fetchRegister(selectedMonth, selectedYear);
    fetchFromLaravel("/lab").then((res) => {
      if (res) setLabInfo(res);
    }).catch(() => {});
  }, []);

  const handleShowClick = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegister(selectedMonth, selectedYear);
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
      escapeCsv("UPI (INR)"),
      escapeCsv("Cash (INR)"),
      escapeCsv("Dues (INR)"),
      escapeCsv("Total (INR)"),
    ].join(","));

    (data.rows || []).forEach((r: any) => {
      const fullDate = `${r.formatted_date || r.date}${r.day_name ? ` (${r.day_name.slice(0, 3)})` : ""}`;
      csvRows.push([
        escapeCsv(fullDate),
        escapeCsv(Number(r.upi || 0).toFixed(2)),
        escapeCsv(Number(r.cash || 0).toFixed(2)),
        escapeCsv(Number(r.dues || 0).toFixed(2)),
        escapeCsv(Number(r.total || 0).toFixed(2)),
      ].join(","));
    });

    // Final Total Row at bottom
    csvRows.push([
      escapeCsv(`SUB TOTAL / FINAL TOTAL (${data.month_name || "Month"} ${data.year || ""})`),
      escapeCsv(Number(data.summary?.total_upi || 0).toFixed(2)),
      escapeCsv(Number(data.summary?.total_cash || 0).toFixed(2)),
      escapeCsv(Number(data.summary?.total_dues || 0).toFixed(2)),
      escapeCsv(Number(data.summary?.final_total || 0).toFixed(2)),
    ].join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Monthly_Expenses_${data.month_name || selectedMonth}_${data.year || selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV Downloaded", "Monthly register exported successfully.");
  };

  // Isolated print of only the statement and table
  const handlePrint = () => {
    if (printableRef.current) {
      printInvoiceElement(
        printableRef.current,
        `Monthly_Expenses_${data?.month_name || selectedMonth}_${data?.year || selectedYear}`
      );
    } else {
      window.print();
    }
  };

  const selectedMonthName = MONTHS.find((m) => m.value === selectedMonth)?.label || "Selected Month";

  return (
    <div className="space-y-4 animate-fade-in text-foreground">
      {/* ── Collection Centre Scoping Pill ── */}
      {isCollectionCenter && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Collection Centre Business: <strong className="font-bold">{currentUser?.name || "Your Centre"}</strong></span>
        </div>
      )}

      {/* ── Compact Month & Year Selector Toolbar (Responsive Sequence on Mobile) ── */}
      <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-4 shadow-xs">
        <form onSubmit={handleShowClick} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Month & Year Selectors: 50/50 Grid on Mobile */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 w-full sm:w-auto">
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

          {/* Action Buttons in clean sequence: Show -> Print -> Export CSV */}
          <div className={`${hasFetched && data ? 'grid grid-cols-3' : 'flex'} gap-2 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto shrink-0`}>
            {/* Show Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-3 sm:px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all w-full sm:w-auto whitespace-nowrap"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span className="truncate">Loading...</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Show</span>
                </>
              )}
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

      {/* ── Lightweight Summary Metric Cards (Black, Green, Red) ── */}
      {hasFetched && data?.summary && (
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
      )}

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
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Monthly Expenses &amp; Sales Register</h3>
              <p className="text-xs text-gray-800 font-semibold">Period: {data?.month_name || selectedMonthName} {data?.year || selectedYear}</p>
              <p className="text-[10px] text-gray-600">Generated on: {new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* ── Daily Sales Register Table ── */}
        {loading ? (
          <div className="bg-card border border-border/80 rounded-xl p-10 text-center shadow-xs">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground">Compiling Monthly Register...</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Loading data for {selectedMonthName} {selectedYear}
            </p>
          </div>
        ) : hasFetched && data?.rows && data.rows.length > 0 ? (
          <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
            {/* Mobile / Tablet Horizontal Scroller Wrapper: strictly prevents line-wrapping */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap min-w-[130px]">Date</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">UPI (₹)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap min-w-[100px]">Cash (₹)</th>
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
                      {formatINR(data?.summary?.total_upi)}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatINR(data?.summary?.total_cash)}
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
