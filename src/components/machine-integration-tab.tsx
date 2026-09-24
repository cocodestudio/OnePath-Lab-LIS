"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu, Radio, Activity, HardDrive, Terminal, Laptop,
  CheckCircle2, RefreshCw, PlusCircle, Trash2, Sliders,
  Play, Download, Eye, AlertCircle, ArrowRight, Check,
  Zap, FileText, ChevronRight, Layers, Lock, ShieldCheck,
  Server, Shield, Loader2, Sparkles, ExternalLink, Cable
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface Instrument {
  id: string;
  name: string;
  model?: string;
  category: string;
  protocol: string;
  connection_type: string;
  ip_address?: string;
  port: number;
  com_port?: string;
  baud_rate: number;
  is_active: boolean;
  auto_apply: boolean;
  last_sync_at?: string;
}

interface InstrumentResult {
  id: string;
  sample_id: string;
  barcode?: string;
  status: "PENDING" | "APPLIED" | "DISCARDED";
  instrument_name?: string;
  category: string;
  parsed_parameters: Record<string, any>;
  raw_data?: string;
  tested_at?: string;
  created_at: string;
  patient?: {
    id: string;
    name: string;
    custom_id?: string;
    age?: number;
    gender?: string;
  };
  report?: {
    id: string;
    custom_id?: string;
    status: string;
  };
}

export function MachineIntegrationTab() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [results, setResults] = useState<InstrumentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  // Modals
  const [selectedResult, setSelectedResult] = useState<InstrumentResult | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assignModalResult, setAssignModalResult] = useState<InstrumentResult | null>(null);
  const [customSampleId, setCustomSampleId] = useState("");

  // New Machine Form State
  const [newDevice, setNewDevice] = useState({
    name: "",
    model: "",
    category: "Haematology",
    protocol: "ASTM / TCP-IP",
    connection_type: "TCP_IP",
    ip_address: "192.168.1.100",
    port: 8080,
    com_port: "COM3",
    baud_rate: 9600,
    is_active: true,
    auto_apply: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel("/instruments");
      if (data) {
        setInstruments(data.instruments || []);
        setResults(data.recent_results || []);
      }
    } catch (err: any) {
      console.error("Failed to load instruments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    if (type === "success") {
      toastSuccess(text);
    } else {
      toastError(text);
    }
  };

  const handleSimulate = async (type: "HAEMATOLOGY" | "BIOCHEMISTRY") => {
    setIsSimulating(true);
    try {
      const sampleCode = customSampleId.trim() || undefined;
      const res = await fetchFromLaravel("/instruments/simulate", {
        method: "POST",
        body: JSON.stringify({ type, sample_id: sampleCode }),
      });

      if (res && res.result) {
        setResults((prev) => [res.result, ...prev]);
        showToast(
          res.auto_applied
            ? `⚡ Sample ${res.result.sample_id} auto-applied to patient report!`
            : `✅ New ${type === "HAEMATOLOGY" ? "Aveacon CBC" : "Biochemistry"} result received in queue!`,
          "success"
        );
        setCustomSampleId("");
      }
    } catch (err: any) {
      showToast(err.message || "Simulation failed.", "error");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleAutoApply = async (inst: Instrument) => {
    try {
      await fetchFromLaravel(`/instruments/${inst.id}`, {
        method: "PUT",
        body: JSON.stringify({ auto_apply: !inst.auto_apply }),
      });
      setInstruments((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, auto_apply: !inst.auto_apply } : i))
      );
      showToast("Auto-apply setting updated!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update instrument.", "error");
    }
  };

  const handleToggleActive = async (inst: Instrument) => {
    try {
      await fetchFromLaravel(`/instruments/${inst.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !inst.is_active }),
      });
      setInstruments((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, is_active: !inst.is_active } : i))
      );
      showToast("Machine status toggled!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update status.", "error");
    }
  };

  const handleDeleteInstrument = async (id: string) => {
    if (!confirm("Are you sure you want to remove this machine configuration?")) return;
    try {
      await fetchFromLaravel(`/instruments/${id}`, { method: "DELETE" });
      setInstruments((prev) => prev.filter((i) => i.id !== id));
      showToast("Machine removed.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete machine.", "error");
    }
  };

  const handleAddInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchFromLaravel("/instruments", {
        method: "POST",
        body: JSON.stringify(newDevice),
      });
      if (res && res.instrument) {
        setInstruments((prev) => [...prev, res.instrument]);
        setIsAddModalOpen(false);
        showToast("New machine configured successfully!", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add machine.", "error");
    }
  };

  const handleApplyToPatient = async (resultId: string, sampleOrReportId: string) => {
    try {
      const res = await fetchFromLaravel(`/instruments/results/${resultId}/apply`, {
        method: "POST",
        body: JSON.stringify({ custom_id: sampleOrReportId }),
      });
      if (res && res.result) {
        setResults((prev) =>
          prev.map((r) => (r.id === resultId ? res.result : r))
        );
        setAssignModalResult(null);
        showToast("Results successfully applied to patient report!", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to apply result.", "error");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* ── Top Status Banner: Active LAN / TCP & Serial Cable Listener ── */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Machine Auto-Communication & Interfacing Hub</span>
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                LAN (PORT 8080) & SERIAL (RS-232) READY
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Connect your <strong>Aveacon Cell Counter</strong>, <strong>Nihon Kohden MEK-1305</strong>, <strong>Beacon B200</strong>, <strong>Mindray</strong>, or <strong>Sysmex</strong> analyzers via <strong>LAN Ethernet Cable (TCP/IP)</strong> or <strong>RS-232 Serial Cable (USB-to-DB9)</strong>. Results automatically ingest, match barcodes, and fill patient reports!
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="/START_MACHINE_BRIDGE.bat"
              download="START_MACHINE_BRIDGE.bat"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Download 1-Click Windows Starter"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Download Windows Bridge (.bat)</span>
            </a>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Add Analyzer</span>
            </button>
          </div>
        </div>

        {/* Dual Mode Connection Options Box */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Mode 1: LAN / TCP-IP */}
          <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Server className="h-4 w-4" />
              <span>Option A: LAN Ethernet Cable / Wi-Fi (Aveacon / Beacon)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              1. In machine screen (LIS Tab), enter <strong>LIS IP: Your Lab PC's IPv4</strong> and <strong>Port: 8080</strong>.<br/>
              2. Check <strong>[✔] Auto Communication</strong> and press Save. Tests stream automatically over LAN!
            </p>
          </div>

          {/* Mode 2: RS-232 Serial Cable */}
          <div className="bg-slate-900/80 border border-blue-500/20 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <Cable className="h-4 w-4" />
              <span>Option B: RS-232 Serial Cable (Nihon Kohden / Mindray / Erba)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              1. Connect DB9 Serial to USB cable into PC (e.g. COM1 or COM3).<br/>
              2. Set machine Baud Rate: <strong>9600</strong>, Protocol: <strong>ASTM E1394</strong>, 8-N-1. Data auto-captures on test!
            </p>
          </div>
        </div>
      </div>

      {/* ── Simulator / Test Runner Bar ── */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Instant Machine Simulator & Test Tool</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate an instant live test run to verify CBC or Biochemistry auto-population in patient reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Custom Sample ID (Optional)"
              value={customSampleId}
              onChange={(e) => setCustomSampleId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:border-primary outline-none w-48"
            />
            <button
              onClick={() => handleSimulate("HAEMATOLOGY")}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:brightness-105 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              <span>Simulate Aveacon CBC Run</span>
            </button>
            <button
              onClick={() => handleSimulate("BIOCHEMISTRY")}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-accent text-xs font-bold shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span>Simulate Beacon Biochem</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2 Columns: Configured Analyzers & Live Incoming Results Queue ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Machine Profiles (5 Cols) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span>Configured Analyzers ({instruments.length})</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">Auto-match enabled</span>
          </div>

          <div className="space-y-3">
            {instruments.map((inst) => (
              <div
                key={inst.id}
                className={`p-4 rounded-xl border transition-all ${
                  inst.is_active
                    ? "bg-card border-border/90 shadow-xs"
                    : "bg-muted/40 border-border/50 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        inst.category === "Haematology"
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      }`}
                    >
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-foreground">{inst.name}</h4>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            inst.is_active
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          {inst.is_active ? "ACTIVE" : "PAUSED"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {inst.model || inst.category} · <span className="font-mono text-foreground font-semibold">{inst.protocol}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2 font-mono">
                        {inst.connection_type === "TCP_IP" ? (
                          <span>Port: <strong className="text-foreground">{inst.port} (TCP)</strong></span>
                        ) : (
                          <span>Port: <strong className="text-foreground">{inst.com_port || "COM3"} @ {inst.baud_rate} baud</strong></span>
                        )}
                        <span>Mode: <strong className="text-foreground">{inst.connection_type === "TCP_IP" ? "LAN / TCP" : "RS-232 Cable"}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteInstrument(inst.id)}
                    className="text-muted-foreground hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove Machine"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Toggles Footer */}
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inst.auto_apply}
                      onChange={() => handleToggleAutoApply(inst)}
                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-foreground">Auto-fill matching report</span>
                  </label>

                  <button
                    onClick={() => handleToggleActive(inst)}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {inst.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Ingestion Queue (7 Cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>Live Incoming Test Queue ({results.length})</span>
              </h3>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center bg-card border border-border rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Waiting for First Machine Test...</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                  As soon as you run a test on your Aveacon cell counter or click "Simulate", results will stream here in real-time.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res) => {
                const paramKeys = Object.keys(res.parsed_parameters || {});
                const isApplied = res.status === "APPLIED";

                return (
                  <div
                    key={res.id}
                    className="p-4 bg-card border border-border/90 rounded-xl shadow-xs hover:border-border transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                            {res.sample_id}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isApplied
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}
                          >
                            {isApplied ? "APPLIED TO REPORT" : "READY IN QUEUE"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {res.instrument_name || "Aveacon Cell Counter"}
                          </span>
                        </div>

                        {res.patient ? (
                          <p className="text-xs font-semibold text-foreground mt-1.5 flex items-center gap-1.5">
                            <span>Patient: <strong>{res.patient.name}</strong></span>
                            <span className="text-muted-foreground font-normal">({res.patient.custom_id || res.patient.id})</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            Unmatched sample barcode · Click apply to assign to patient.
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {new Date(res.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Parameter Pills Preview (e.g. WBC: 7.4, HGB: 14.2, PLT: 245) */}
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {paramKeys.slice(0, 7).map((k) => {
                        const p = res.parsed_parameters[k];
                        const val = typeof p === "object" ? p.value : p;
                        return (
                          <span
                            key={k}
                            className="bg-muted/70 text-foreground px-2 py-0.5 rounded-md font-mono border border-border/40"
                          >
                            <strong>{k}:</strong> {val}
                          </span>
                        );
                      })}
                      {paramKeys.length > 7 && (
                        <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                          +{paramKeys.length - 7} more
                        </span>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setSelectedResult(res)}
                        className="text-primary hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect All Parameters</span>
                      </button>

                      {!isApplied && (
                        <button
                          onClick={() => setAssignModalResult(res)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          ⚡ Apply to Patient
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialog: Parameter Inspector Modal ── */}
      <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground flex items-center justify-between">
              <span>Sample Parameters & Values: {selectedResult?.sample_id}</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                {selectedResult?.instrument_name}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {Object.entries(selectedResult.parsed_parameters || {}).map(([k, p]: [string, any]) => {
                  const val = typeof p === "object" ? p.value : p;
                  const unit = typeof p === "object" ? p.unit : "";
                  return (
                    <div key={k} className="p-3 bg-muted/50 border border-border/80 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">{k}</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-extrabold text-foreground font-mono">{val}</span>
                        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedResult.raw_data && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Raw Machine Log</span>
                  <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-28">
                    {selectedResult.raw_data}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add New Machine (TCP/IP or Serial RS-232) ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground">Configure New Instrument</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddInstrument} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Machine Name *</label>
              <input
                type="text"
                required
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                placeholder="e.g. Nihon Kohden MEK-1305 / Aveacon"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Category</label>
                <select
                  value={newDevice.category}
                  onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none"
                >
                  <option value="Haematology">Haematology (CBC)</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Immunology">Immunology / Hormones</option>
                  <option value="Coagulation">Coagulation (PT/INR)</option>
                  <option value="Electrolytes">Electrolytes (ISE)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Connection Type</label>
                <select
                  value={newDevice.connection_type}
                  onChange={(e) => setNewDevice({ ...newDevice, connection_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none"
                >
                  <option value="TCP_IP">LAN Ethernet Cable (TCP/IP)</option>
                  <option value="SERIAL_RS232">Serial Cable (RS-232 / USB)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Protocol</label>
                <select
                  value={newDevice.protocol}
                  onChange={(e) => setNewDevice({ ...newDevice, protocol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none"
                >
                  <option value="ASTM / TCP-IP">ASTM (E1381 / E1394)</option>
                  <option value="HL7 v2.x">HL7 v2.x</option>
                  <option value="JSON / Webhook">JSON / Webhook</option>
                </select>
              </div>

              {newDevice.connection_type === "TCP_IP" ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">TCP Port</label>
                  <input
                    type="number"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">COM Port</label>
                  <select
                    value={newDevice.com_port}
                    onChange={(e) => setNewDevice({ ...newDevice, com_port: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none font-mono"
                  >
                    <option value="COM1">COM1</option>
                    <option value="COM2">COM2</option>
                    <option value="COM3">COM3 (USB-Serial)</option>
                    <option value="COM4">COM4</option>
                    <option value="COM5">COM5</option>
                    <option value="COM6">COM6</option>
                    <option value="COM7">COM7</option>
                    <option value="COM8">COM8</option>
                  </select>
                </div>
              )}
            </div>

            {newDevice.connection_type === "SERIAL_RS232" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Baud Rate</label>
                  <select
                    value={newDevice.baud_rate}
                    onChange={(e) => setNewDevice({ ...newDevice, baud_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary outline-none font-mono"
                  >
                    <option value={9600}>9600 baud</option>
                    <option value={19200}>19200 baud</option>
                    <option value={38400}>38400 baud</option>
                    <option value={57600}>57600 baud</option>
                    <option value={115200}>115200 baud</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Data/Parity/Stop</label>
                  <div className="w-full px-3 py-2 rounded-xl bg-muted text-xs font-mono text-muted-foreground">
                    8 - None - 1
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-xl shadow-xs cursor-pointer hover:brightness-105"
              >
                Save Machine
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Manual Apply To Patient Report ── */}
      <Dialog open={!!assignModalResult} onOpenChange={(open) => !open && setAssignModalResult(null)}>
        <DialogContent className="max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground">Assign to Patient Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Enter the Patient Custom ID or Report ID to auto-populate all {Object.keys(assignModalResult?.parsed_parameters || {}).length} test parameters from this run.
            </p>

            <input
              type="text"
              placeholder="e.g. PAT-1002 or REP-2026-0001"
              id="assign-target-id"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalResult(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("assign-target-id") as HTMLInputElement;
                  if (assignModalResult && input?.value) {
                    handleApplyToPatient(assignModalResult.id, input.value.trim());
                  }
                }}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer hover:brightness-105"
              >
                Apply Parameters Now
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
