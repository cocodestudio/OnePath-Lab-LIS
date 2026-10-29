"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu, Radio, Activity, HardDrive, Terminal, Laptop,
  CheckCircle2, RefreshCw, PlusCircle, Trash2, Sliders,
  Play, Download, Eye, AlertCircle, ArrowRight, Check,
  Zap, FileText, ChevronRight, Layers, Lock, ShieldCheck,
  Server, Shield, Loader2, Sparkles, ExternalLink, Cable, Plus
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

export function MachineIntegrationTab() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Machine Form State
  const [newDevice, setNewDevice] = useState({
    name: "",
    model: "",
    category: "Haematology",
    protocol: "ASTM / TCP-IP",
    connection_type: "TCP_IP",
    ip_address: "192.168.1.100",
    port: 5100,
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

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* ── Top Status Banner: Active LAN / TCP & Serial Cable Listener ── */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Machine Auto-Communication & Interfacing Hub</span>
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px] font-bold shrink-0 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                LAN (PORT 5100) & SERIAL (RS-232) READY
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Connect your <strong>Aveacon Cell Counter</strong>, <strong>Nihon Kohden MEK-1305</strong>, <strong>Beacon B200</strong>, <strong>Mindray</strong>, or <strong>Sysmex</strong> analyzers via <strong>LAN Ethernet Cable (TCP/IP)</strong> or <strong>RS-232 Serial Cable (USB-to-DB9)</strong>. Results stream directly into patient reports when entering test results!
            </p>
          </div>

          {/* Quick Action Button: Download Windows Bridge */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <a
              href="/START_MACHINE_BRIDGE.bat"
              download="START_MACHINE_BRIDGE.bat"
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              title="Download 1-Click Windows Starter"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>Download Windows Bridge (.bat)</span>
            </a>
          </div>
        </div>

        {/* Dual Mode Connection Options Box */}
        <div className="mt-6 pt-5 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Mode 1: LAN / TCP-IP */}
          <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 sm:p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Server className="h-4 w-4 shrink-0" />
              <span>Option A: LAN Ethernet Cable / Wi-Fi (Aveacon / Beacon)</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              1. In machine screen (LIS Tab), enter <strong className="text-foreground">LIS IP: 192.168.1.6</strong> and <strong className="text-foreground">Port: 5100</strong>.<br/>
              2. Check <strong className="text-foreground">[✔] Auto Communication</strong> and press Save. Tests stream automatically over LAN!
            </p>
          </div>

          {/* Mode 2: RS-232 Serial Cable */}
          <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 sm:p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Cable className="h-4 w-4 shrink-0" />
              <span>Option B: RS-232 Serial Cable (Nihon Kohden / Mindray / Erba)</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              1. Connect DB9 Serial to USB cable into PC (e.g. COM1 or COM3).<br/>
              2. Set machine Baud Rate: <strong className="text-foreground">9600</strong>, Protocol: <strong className="text-foreground">ASTM E1394</strong>, 8-N-1. Data auto-captures on test!
            </p>
          </div>
        </div>
      </div>

      {/* ── Active Configured Analyzers ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary shrink-0" />
              <span>Configured Analyzers ({instruments.length})</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Readings stream directly to your reports when clicking &quot;Fetch from Machine&quot; in Enter Results.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:brightness-105 active:scale-98 transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Analyzer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instruments.map((inst) => (
            <div
              key={inst.id}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                inst.is_active
                  ? "bg-card border-border/90 shadow-xs"
                  : "bg-muted/40 border-border/50 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      inst.category === "Haematology"
                        ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    }`}
                  >
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-foreground truncate">{inst.name}</h4>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                          inst.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-500"
                        }`}
                      >
                        {inst.is_active ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {inst.model || inst.category} · <span className="font-mono text-foreground font-semibold">{inst.protocol}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-2 font-mono">
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
                  className="text-muted-foreground hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  title="Remove Machine"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Toggles Footer */}
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs flex-wrap sm:flex-nowrap">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inst.auto_apply}
                    onChange={() => handleToggleAutoApply(inst)}
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-medium text-foreground">Auto-fill matching report</span>
                </label>

                <button
                  onClick={() => handleToggleActive(inst)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
                >
                  {inst.is_active ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dialog: Add New Machine (TCP/IP or Serial RS-232) ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-2xl">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <option value="COM3 (USB-Serial)">COM3 (USB-Serial)</option>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-xl shadow-xs cursor-pointer hover:brightness-105 text-center"
              >
                Save Machine
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
