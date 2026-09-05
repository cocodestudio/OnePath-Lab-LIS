"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock, FlaskConical, Search, PlusCircle, RefreshCw, CheckCircle2,
  Copy, Check, FileText, ArrowRight, ShieldCheck, IndianRupee,
  Filter, AlertCircle, ChevronRight, User
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";

export default function TodaySamplesPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"ALL" | "COLLECTED" | "TRANSIT" | "READY" | "PAID" | "DUE">("ALL");
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    try {
      if (isForce || reports.length === 0) {
        setLoading(true);
      }
      const res = await fetchFromLaravel("/reports", { skipCache: isForce }).catch(() => []);
      const repList = Array.isArray(res) ? res : (res?.data || []);
      setReports(repList);
    } catch (err) {
      console.error("Error loading today's samples:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyBarcode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBarcode(code);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // Counts
  const totalCount = reports.length;
  const readyCount = reports.filter((r) => r.status === "COMPLETED" || r.status === "READY").length;
  const transitCount = reports.filter((r) => r.status === "IN_TRANSIT" || r.status === "PROCESSING").length;
  const collectedCount = reports.filter((r) => r.status !== "COMPLETED" && r.status !== "READY" && r.status !== "IN_TRANSIT" && r.status !== "PROCESSING").length;
  const paidCount = reports.filter((r) => {
    const total = Number(r.bill?.total || r.bill?.totalAmount || 0);
    const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount || 0);
    return total > 0 && paid >= total;
  }).length;
  const dueCount = reports.filter((r) => {
    const total = Number(r.bill?.total || r.bill?.totalAmount || 0);
    const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount || 0);
    return (total - paid) > 0;
  }).length;

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return reports.filter((r) => {
      const pName = r.patient?.name || "";
      const phone = r.patient?.phone || "";
      const id = r.custom_id || r.customId || "";
      const query = search.toLowerCase();
      const matchesSearch = pName.toLowerCase().includes(query) || phone.toLowerCase().includes(query) || id.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      const total = Number(r.bill?.total || r.bill?.totalAmount || 0);
      const paid = Number(r.bill?.paid_amount || r.bill?.paidAmount || 0);
      const isPaid = total > 0 && paid >= total;

      if (stageFilter === "READY") return r.status === "COMPLETED" || r.status === "READY";
      if (stageFilter === "TRANSIT") return r.status === "IN_TRANSIT" || r.status === "PROCESSING";
      if (stageFilter === "COLLECTED") return r.status !== "COMPLETED" && r.status !== "READY" && r.status !== "IN_TRANSIT" && r.status !== "PROCESSING";
      if (stageFilter === "PAID") return isPaid;
      if (stageFilter === "DUE") return !isPaid;
      return true;
    });
  }, [reports, search, stageFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ── Header Deck ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Sample Intake Log
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <span>Today's Samples</span>
            <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
              {totalCount}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete list of all patient vials, barcodes, clinical test stages and payment clearance status.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-bold shadow-xs hover:bg-muted/60 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/dashboard/patients/register"
            className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 ring-inset-top"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Sample Entry</span>
          </Link>
        </div>
      </div>

      {/* ── Filter Pills & Search Row ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          <button
            type="button"
            onClick={() => setStageFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("COLLECTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "COLLECTED"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Collected ({collectedCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("TRANSIT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "TRANSIT"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Central Hub ({transitCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("READY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "READY"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Approved / Ready ({readyCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("PAID")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "PAID"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Paid ({paidCount})
          </button>

          <button
            type="button"
            onClick={() => setStageFilter("DUE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              stageFilter === "DUE"
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Due ({dueCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, barcode, phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-xs focus:border-primary outline-none shadow-xs"
          />
        </div>
      </div>

      {/* ── Samples Table ── */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-5">Vial Barcode / ID</th>
                <th className="py-3.5 px-4">Patient Demographics</th>
                <th className="py-3.5 px-4">Tests Booked</th>
                <th className="py-3.5 px-4">Collection Time</th>
                <th className="py-3.5 px-4">Processing Stage</th>
                <th className="py-3.5 px-4">Payment Clearance</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs font-medium">
              {filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <FlaskConical className="h-9 w-9 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-bold text-foreground text-sm">No samples found</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                      {search ? `No samples matching "${search}"` : "No samples have been registered yet today."}
                    </p>
                    <Link
                      href="/dashboard/patients/register"
                      className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer ring-inset-top"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Intake First Sample</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredSamples.map((item: any, idx: number) => {
                  const sampleBarcode = item.custom_id || item.customId || `OP-${item.id.slice(0, 8)}`;
                  const p = item.patient || {};
                  const testsStr = item.tests || (Array.isArray(item.results) ? item.results.map((r: any) => r.test?.name).filter(Boolean).join(", ") : "Diagnostic Test Panel");
                  const stage = item.status || "IN_TRANSIT";
                  const isApproved = stage === "COMPLETED" || stage === "READY";
                  const isTransit = stage === "IN_TRANSIT" || stage === "PROCESSING";

                  const billTotal = Number(item.bill?.total || item.bill?.totalAmount || 0);
                  const billPaid = Number(item.bill?.paid_amount || item.bill?.paidAmount || 0);
                  const billDue = Math.max(0, billTotal - billPaid);
                  const isPaid = billDue <= 0 && billTotal > 0;

                  const colTime = item.created_at || item.createdAt
                    ? new Date(item.created_at || item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "Just now";

                  return (
                    <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                      {/* Barcode & ID */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-muted/60 px-2.5 py-1 rounded-lg border border-border text-foreground">
                            {sampleBarcode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyBarcode(sampleBarcode)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copy Barcode"
                          >
                            {copiedBarcode === sampleBarcode ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-4 px-4">
                        <p className="font-bold text-foreground">{p.name || "Patient"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.age ? `${p.age}y` : ""} {p.gender ? `· ${p.gender}` : ""} {p.phone ? `· ${p.phone}` : ""}
                        </p>
                      </td>

                      {/* Tests */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-medium text-foreground truncate">{testsStr || "General Panel"}</p>
                        <span className="text-[10px] text-muted-foreground">Standard Investigation</span>
                      </td>

                      {/* Collection Time */}
                      <td className="py-4 px-4 text-muted-foreground text-[11px]">
                        {colTime}
                      </td>

                      {/* Sample Stage Badge */}
                      <td className="py-4 px-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Report Ready
                          </span>
                        ) : isTransit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Clock className="h-3 w-3" /> Central Hub
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <FlaskConical className="h-3 w-3" /> Collected
                          </span>
                        )}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-4 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            ₹{billTotal} PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" title="Report Locked for PayU">
                            ₹{billDue} DUE 🔒
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/patients`}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="View Patient Profile"
                          >
                            <User className="h-3.5 w-3.5" />
                          </Link>
                          {isApproved && (
                            <Link
                              href={`/dashboard/reports/${item.id}`}
                              className="p-1.5 rounded-lg border border-border bg-card text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="View Report"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
