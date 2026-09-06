"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp, Calendar, DollarSign, IndianRupee, ArrowDownRight,
  ArrowUpRight, Printer, Download, RefreshCw, FileText, CheckCircle2,
  Clock, AlertCircle, Filter, ChevronDown, Layers, Building2,
  Percent, ArrowLeft, Search, Eye, Sparkles, X, ShieldCheck
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type DateFilterType = "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export default function B2BRevenuePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [labInfo, setLabInfo] = useState<any>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>("MONTHLY");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Statement / Tax Invoice Modal
  const [showStatementModal, setShowStatementModal] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Configurable Wholesale Discount Margin (Standard B2B discount: 30% margin for partner, 70% wholesale cost)
  const [marginPercent, setMarginPercent] = useState<number>(30);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsRes, labRes] = await Promise.all([
        fetchFromLaravel("/reports").catch(() => []),
        fetchFromLaravel("/lab").catch(() => null),
      ]);
      const repList = Array.isArray(reportsRes) ? reportsRes : (reportsRes?.data || []);
      setReports(repList);
      if (labRes) setLabInfo(labRes);
    } catch (err) {
      console.error("Failed to load revenue telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  // Date filtering logic
  const filteredReports = useMemo(() => {
    const now = new Date();
    return reports.filter((r) => {
      const rawDate = r.created_at || r.createdAt;
      if (!rawDate) return false;
      const repDate = new Date(rawDate);

      // Period filter
      if (dateFilter === "WEEKLY") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (repDate < weekAgo) return false;
      } else if (dateFilter === "MONTHLY") {
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        if (repDate < monthAgo) return false;
      } else if (dateFilter === "YEARLY") {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        if (repDate < yearAgo) return false;
      } else if (dateFilter === "CUSTOM") {
        if (customStartDate && new Date(customStartDate) > repDate) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (repDate > end) return false;
        }
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const customId = (r.custom_id || r.customId || "").toLowerCase();
        const patName = (r.patient?.name || "").toLowerCase();
        const patId = (r.patient?.custom_id || r.patient?.customId || "").toLowerCase();
        if (!customId.includes(q) && !patName.includes(q) && !patId.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (r.status !== statusFilter) return false;
      }

      return true;
    });
  }, [reports, dateFilter, customStartDate, customEndDate, searchTerm, statusFilter]);

  // Aggregate Financial Calculations
  const grossB2BVolume = useMemo(() => {
    return filteredReports.reduce((sum, r) => sum + (Number(r.bill?.total || r.bill?.totalAmount) || 0), 0);
  }, [filteredReports]);

  const totalPaid = useMemo(() => {
    return filteredReports.reduce((sum, r) => sum + (Number(r.bill?.paid_amount || r.bill?.paidAmount) || 0), 0);
  }, [filteredReports]);

  const totalDue = Math.max(0, grossB2BVolume - totalPaid);

  // Wholesale vs Margin split
  const partnerMarginTotal = Math.round((grossB2BVolume * marginPercent) / 100);
  const wholesaleCostTotal = grossB2BVolume - partnerMarginTotal;

  // Print Statement Handler
  const handlePrintStatement = () => {
    window.print();
  };

  // Date range display string
  const periodLabel = useMemo(() => {
    if (dateFilter === "WEEKLY") return "Last 7 Days (Weekly)";
    if (dateFilter === "MONTHLY") return "Last 30 Days (Monthly)";
    if (dateFilter === "YEARLY") return "Past 1 Year (Annual)";
    return `${customStartDate || "Start"} to ${customEndDate || "End"}`;
  }, [dateFilter, customStartDate, customEndDate]);

  const invoiceNumber = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const suffix = String(filteredReports.length).padStart(4, "0");
    return `B2B-INV-${yr}${mo}-${suffix}`;
  }, [filteredReports.length]);

  return (
    <div className="space-y-7 animate-fade-in pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span>B2B Commercial Ledger & Settlements</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Revenue & Financial Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time audit of B2B diagnostic volume, wholesale processing costs, and partner commission margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-xs hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            <span>Sync Ledger</span>
          </button>

          <Button
            onClick={() => setShowStatementModal(true)}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md gap-2 cursor-pointer hover:-translate-y-px active:scale-[0.98] transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Generate B2B Statement / Tax Invoice</span>
          </Button>
        </div>
      </div>

      {/* ── Period Filter Selector Toolbar ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Date Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 self-start">
            <button
              type="button"
              onClick={() => setDateFilter("WEEKLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "WEEKLY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly (7d)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "MONTHLY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly (30d)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("YEARLY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "YEARLY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly (12m)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("CUSTOM")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilter === "CUSTOM"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom Date Range
            </button>
          </div>

          {/* Partner Margin Share Rate Slider/Input */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-semibold">Partner Margin Share:</span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted border border-border/70 font-bold">
              <input
                type="number"
                min="0"
                max="100"
                value={marginPercent}
                onChange={(e) => setMarginPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-12 bg-transparent text-right font-mono font-bold text-foreground outline-none"
              />
              <span className="text-purple-600">%</span>
            </div>
          </div>
        </div>

        {/* Custom Date Pickers (Shown when CUSTOM is selected) */}
        {dateFilter === "CUSTOM" && (
          <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background font-mono text-xs text-foreground focus:border-purple-600 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background font-mono text-xs text-foreground focus:border-purple-600 outline-none"
              />
            </div>
            <span className="text-muted-foreground text-[11px] italic">
              Filtered to {filteredReports.length} requisitions
            </span>
          </div>
        )}
      </div>

      {/* ── Financial KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross B2B Volume (MRP) */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gross B2B Volume</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
            ₹{grossB2BVolume.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Requisitions:</span>
            <span className="font-bold text-foreground">{filteredReports.length} orders</span>
          </div>
        </div>

        {/* Card 2: Central Lab Wholesale Cost */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wholesale Lab Cost</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
            ₹{wholesaleCostTotal.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Wholesale Base Rate:</span>
            <span className="font-bold text-blue-600">{100 - marginPercent}%</span>
          </div>
        </div>

        {/* Card 3: Partner Net Margin */}
        <div className="bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-200 dark:border-purple-900/50 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Partner Margin Share</span>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 mt-3 tracking-tight">
            ₹{partnerMarginTotal.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Commission Margin:</span>
            <span className="font-bold text-purple-600">{marginPercent}% Share</span>
          </div>
        </div>

        {/* Card 4: Outstanding Due vs Paid */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Settlement Balance</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              totalDue > 0
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200/60 dark:border-amber-800/40"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40"
            }`}>
              {totalDue > 0 ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
          </div>
          <p className={`text-3xl font-extrabold mt-3 tracking-tight ${totalDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            ₹{totalDue.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Collected / Paid:</span>
            <span className="font-bold text-emerald-600">₹{totalPaid.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* ── Search & Status Filters for Ledger Table ── */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Requisition ID or Patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground outline-none focus:border-purple-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="FINAL">Final</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="IN_TRANSIT">In Transit</option>
          </select>
        </div>
      </div>

      {/* ── Requisition Ledger Table ── */}
      <div className="bg-card border border-border/70 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">B2B Requisition Financial Ledger</h3>
            <p className="text-xs text-muted-foreground">Showing {filteredReports.length} records for {periodLabel}</p>
          </div>
          <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full">
            Ledger Active
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredReports.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <FileText className="h-10 w-10 mx-auto opacity-30 text-purple-500" />
              <p className="text-xs font-semibold">No requisitions match the selected criteria.</p>
              <button
                onClick={() => { setDateFilter("YEARLY"); setSearchTerm(""); setStatusFilter("ALL"); }}
                className="text-xs font-bold text-purple-600 underline"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60 text-muted-foreground">
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Requisition ID</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Patient</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Tests</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px] text-right">Gross Total</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px] text-right">Wholesale Cost</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px] text-right">Partner Margin</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Payment</th>
                  <th className="px-6 py-3.5 font-semibold uppercase tracking-wider text-[10px]">Report Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredReports.map((r) => {
                  const gross = Number(r.bill?.total || r.bill?.totalAmount) || 0;
                  const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount) || 0;
                  const margin = Math.round((gross * marginPercent) / 100);
                  const wholesale = gross - margin;
                  const isPaid = paid >= gross && gross > 0;
                  const isFinal = r.status === "FINAL" || r.status === "APPROVED" || r.status === "COMPLETED";

                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-purple-600">
                        {r.custom_id || r.customId || "REQ"}
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                        {r.created_at || r.createdAt ? new Date(r.created_at || r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-foreground">{r.patient?.name || "Patient"}</p>
                        <p className="text-[11px] text-muted-foreground">{r.patient?.custom_id || r.patient?.customId || "ID: N/A"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-foreground">
                          {Array.isArray(r.results) ? `${r.results.length} tests` : "Standard Panel"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-foreground">
                        ₹{gross.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-muted-foreground">
                        ₹{wholesale.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-purple-600">
                        ₹{margin.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : paid > 0
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}>
                          {isPaid ? "Paid" : paid > 0 ? "Partial" : "Due"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isFinal
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isFinal ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {r.status || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── B2B Consolidated Statement & Tax Invoice Modal ── */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-in">
            {/* Modal Control Header (Hidden when printing) */}
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">B2B Partner Consolidated Statement & Tax Invoice</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrintStatement}
                  className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save as PDF</span>
                </Button>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable A4 Sheet Body */}
            <div ref={printAreaRef} className="p-8 sm:p-10 space-y-6 bg-white text-slate-900">
              {/* Header: Reference Central Lab Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {labInfo?.name || "OnePath Diagnostic Pathology Laboratory"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-md">
                    {labInfo?.address || "Medical District, Central Diagnostics Tower, New Delhi - 110001"}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2 font-mono">
                    <span>Phone: {labInfo?.phone || "+91 98765 43210"}</span>
                    <span>·</span>
                    <span>Email: {labInfo?.email || "billing@onepathlab.com"}</span>
                    {labInfo?.gstin && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-slate-900">GSTIN: {labInfo.gstin}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold uppercase rounded-md tracking-wider">
                    Tax Invoice / B2B Statement
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-900 mt-1.5">{invoiceNumber}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>

              {/* Bill To Partner & Billing Period Cards */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Billed Partner Lab</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{currentUser?.name || "B2B Partner Laboratory"}</p>
                  <p className="text-slate-600 mt-0.5">Contact: {currentUser?.email || "partner@b2blab.com"}</p>
                  <p className="text-slate-600">Account Type: Authorized B2B Partner Terminal</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Statement Period</p>
                  <p className="text-sm font-bold text-purple-700 mt-1">{periodLabel}</p>
                  <p className="text-slate-600 mt-0.5">Total Requisitions: {filteredReports.length}</p>
                  <p className="text-slate-600">Partner Margin Share: {marginPercent}%</p>
                </div>
              </div>

              {/* Itemized Requisition Breakdown */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900">
                      <th className="py-2.5 font-bold uppercase text-[10px]">#</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Date</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Requisition ID</th>
                      <th className="py-2.5 font-bold uppercase text-[10px]">Patient Name</th>
                      <th className="py-2.5 font-bold uppercase text-[10px] text-right">Gross (MRP)</th>
                      <th className="py-2.5 font-bold uppercase text-[10px] text-right">Wholesale Rate</th>
                      <th className="py-2.5 font-bold uppercase text-[10px] text-right">Partner Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredReports.slice(0, 30).map((r, i) => {
                      const gross = Number(r.bill?.total || r.bill?.totalAmount) || 0;
                      const margin = Math.round((gross * marginPercent) / 100);
                      const wholesale = gross - margin;
                      return (
                        <tr key={r.id}>
                          <td className="py-2 font-mono text-slate-500">{i + 1}</td>
                          <td className="py-2 text-slate-600 whitespace-nowrap">
                            {r.created_at || r.createdAt ? new Date(r.created_at || r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "N/A"}
                          </td>
                          <td className="py-2 font-mono font-bold text-slate-900">{r.custom_id || r.customId || "REQ"}</td>
                          <td className="py-2 text-slate-800">{r.patient?.name || "Patient"}</td>
                          <td className="py-2 text-right font-mono text-slate-900">₹{gross.toLocaleString("en-IN")}</td>
                          <td className="py-2 text-right font-mono text-slate-600">₹{wholesale.toLocaleString("en-IN")}</td>
                          <td className="py-2 text-right font-mono font-bold text-purple-700">₹{margin.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredReports.length > 30 && (
                  <p className="text-[11px] text-slate-500 italic text-center mt-2">
                    ...and {filteredReports.length - 30} additional requisitions included in total settlement.
                  </p>
                )}
              </div>

              {/* Settlement Summary Box */}
              <div className="flex justify-end pt-4 border-t-2 border-slate-900">
                <div className="w-80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Gross Diagnostic Volume:</span>
                    <span className="font-mono font-bold text-slate-900">₹{grossB2BVolume.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-purple-700 font-semibold">
                    <span>Less: Partner Margin Share ({marginPercent}%):</span>
                    <span className="font-mono font-bold">- ₹{partnerMarginTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span className="font-bold">Net Wholesale Cost to Central Lab:</span>
                    <span className="font-mono font-bold text-slate-900">₹{wholesaleCostTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Already Paid / Settled:</span>
                    <span className="font-mono font-bold">₹{totalPaid.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 text-sm font-extrabold pt-2 border-t-2 border-slate-900">
                    <span>Balance Due / Payable:</span>
                    <span className="font-mono text-purple-700">₹{totalDue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Bank Transfer Details */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
                <div>
                  <p className="font-bold uppercase text-[10px] text-slate-500 mb-1">Settlement Bank Details</p>
                  <p className="font-mono">Bank: HDFC Bank Ltd.</p>
                  <p className="font-mono">A/C Name: OnePath Healthcare Pvt. Ltd.</p>
                  <p className="font-mono">A/C No: 50200012345678</p>
                  <p className="font-mono">IFSC Code: HDFC0000123</p>
                </div>
                <div className="flex flex-col justify-end items-end text-right">
                  <div className="w-44 border-b border-slate-400 pb-1 mb-1" />
                  <p className="font-bold text-slate-900">Authorized Signatory</p>
                  <p className="text-[10px] text-slate-500">OnePath Central Diagnostics Lab</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center pt-2">
                This is a computer generated commercial diagnostic B2B statement and tax invoice. Generated on {new Date().toLocaleString("en-IN")}.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
