"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Cpu, Radio, Activity, HardDrive, Terminal, Laptop,
  CheckCircle2, RefreshCw, PlusCircle, Trash2, Sliders,
  Play, Download, Eye, AlertCircle, ArrowRight, Check,
  Zap, FileText, ChevronRight, Layers, Lock, ShieldCheck,
  Server, Shield, Loader2, Sparkles, ExternalLink, Cable, Plus,
  Search, CheckCircle, X, Copy
} from "lucide-react";
import { fetchFromLaravel, getStoredUser, getStoredToken } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  ANALYZER_CATALOG,
  ANALYZER_CATEGORIES,
  searchAnalyzers,
  getAnalyzerById,
  AnalyzerModel
} from "@/lib/analyzer-catalog";
import {
  generateVirtualPacketForAnalyzer,
  parseSimulatorPacket,
  SimulatorParsedResult
} from "@/lib/virtual-analyzer-simulator";

/**
 * Backwards-compatible analyzer preset list for legacy callers & test harness.
 * Primary catalog: ANALYZER_CATALOG (200+ models in src/lib/analyzer-catalog.ts).
 * Popular Machine Preset (1-Click Auto-Fill)
 */
export const PRESET_ANALYZERS = [
  {
    label: "Beacon UNIKON 230 / B200 (Biochemistry - ASTM TCP/IP Port 5100)",
    name: "Beacon UNIKON 230 Automated Chemistry",
    model: "Beacon UNIKON 230 / B AUTO 200",
    category: "Biochemistry",
    protocol: "ASTM / TCP-IP",
    connection_type: "TCP_IP",
    port: 5100,
    baud_rate: 9600,
    com_port: "COM3",
  },
  {
    label: "Aveacon 3-Part Cell Counter (Haematology - TCP/IP Port 5100)",
    name: "Aveacon 3-Part Cell Counter",
    model: "Aveacon V1.4.1 Series",
    category: "Haematology",
    protocol: "ASTM / TCP-IP",
    connection_type: "TCP_IP",
    port: 5100,
    baud_rate: 9600,
    com_port: "COM3",
  },
  {
    label: "Mindray BC-5000 / BC-3000 (Haematology - HL7/ASTM TCP Port 5100)",
    name: "Mindray 5-Part Hematology",
    model: "Mindray BC-5000 Series",
    category: "Haematology",
    protocol: "HL7 v2.x",
    connection_type: "TCP_IP",
    port: 5100,
    baud_rate: 9600,
    com_port: "COM3",
  },
  {
    label: "Erba Chem 5X / 7 / XL-200 (Biochemistry - RS-232 COM3 @ 9600)",
    name: "Erba Biochemistry Analyzer",
    model: "Erba Chem 5X / 7 / XL-200",
    category: "Biochemistry",
    protocol: "ASTM / TCP-IP",
    connection_type: "SERIAL_RS232",
    port: 5100,
    baud_rate: 9600,
    com_port: "COM3",
  },
  {
    label: "Sysmex XP-100 / XN Series (Haematology - ASTM TCP Port 5100)",
    name: "Sysmex Hematology Analyzer",
    model: "Sysmex XP-100 / XN-350 / XN-550",
    category: "Haematology",
    protocol: "ASTM / TCP-IP",
    connection_type: "TCP_IP",
    port: 5100,
    baud_rate: 9600,
    com_port: "COM3",
  },
];

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
  parameter_mappings?: Record<string, string>;
  unmapped_codes?: string[];
}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case "Haematology":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "Biochemistry":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Immunology":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "Electrolytes":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Coagulation":
      return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
    case "Urinalysis":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export function MachineIntegrationTab() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const [copiedId, setCopiedId] = useState(false);

  const currentUser = typeof window !== "undefined" ? getStoredUser() : null;
  const currentLabId = currentUser?.lab_id || currentUser?.labId || "";
  const currentLabName = currentUser?.lab_name || currentUser?.labName || currentUser?.name || "Active Lab";
  const currentToken = typeof window !== "undefined" ? getStoredToken() : "";

  const handleCopyLabId = () => {
    if (typeof navigator !== "undefined" && currentLabId) {
      navigator.clipboard.writeText(currentLabId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toastSuccess("Copied", "Lab ID copied to clipboard!");
    }
  };

  const handleDownloadBridgeConfig = () => {
    const config = {
      TCP_PORT: 5100,
      COM_PORT: "COM3",
      BAUD_RATE: 9600,
      LIS_API_URL: "https://api.onepathlab.com/api/lis/instruments/webhook",
      LAB_ID: currentLabId,
      LIS_TOKEN: currentToken || ""
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bridge-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastSuccess("Config Downloaded", "bridge-config.json downloaded! Place it in the same folder as OnePath-Bridge.exe.");
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Machine Form State
  const [newDevice, setNewDevice] = useState<{
    name: string;
    model: string;
    category: string;
    protocol: string;
    connection_type: string;
    ip_address: string;
    port: number;
    com_port: string;
    baud_rate: number;
    is_active: boolean;
    auto_apply: boolean;
    parameter_mappings?: Record<string, string>;
  }>({
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

  // Machine Catalog Filter & Selection State
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("ALL");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [isBrowsingCatalog, setIsBrowsingCatalog] = useState(false);

  const filteredAnalyzers = useMemo(() => {
    return searchAnalyzers(catalogSearch, catalogCategory);
  }, [catalogSearch, catalogCategory]);

  const selectedPreset = useMemo(() => {
    return selectedPresetId ? getAnalyzerById(selectedPresetId) : undefined;
  }, [selectedPresetId]);

  const handleSelectPreset = (analyzerId: string) => {
    setSelectedPresetId(analyzerId);
    if (!analyzerId) {
      setIsBrowsingCatalog(true);
      return;
    }
    const a = getAnalyzerById(analyzerId);
    if (a) {
      setNewDevice((prev) => ({
        ...prev,
        name: `${a.brand} ${a.model}`,
        model: a.model,
        category: a.category,
        protocol: a.protocol,
        connection_type: a.connection_type,
        port: a.port ?? 5100,
        baud_rate: a.baud_rate ?? 9600,
        com_port: a.com_port ?? "COM3",
        parameter_mappings: a.parameter_mappings,
      }));
      setIsBrowsingCatalog(false);
    }
  };

  // Virtual Analyzer Test Studio State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simAnalyzerId, setSimAnalyzerId] = useState("beacon-unikon-230");
  const [simSampleId, setSimSampleId] = useState("SMP-9021");
  const [simIsControl, setSimIsControl] = useState(false);
  const [simResult, setSimResult] = useState<SimulatorParsedResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simIngestStatus, setSimIngestStatus] = useState<string | null>(null);

  const handleOpenSimulator = (inst?: Instrument) => {
    if (inst) {
      const matched = ANALYZER_CATALOG.find(
        (a) => a.id === inst.id || a.model.toLowerCase() === (inst.model || "").toLowerCase()
      );
      if (matched) setSimAnalyzerId(matched.id);
    }
    setIsSimulatorOpen(true);
  };

  const handleRunSimulation = async () => {
    setSimLoading(true);
    setSimIngestStatus(null);
    try {
      const analyzer = getAnalyzerById(simAnalyzerId) || ANALYZER_CATALOG[0];
      const effectiveSampleId = simIsControl
        ? (simSampleId.startsWith("QC-") ? simSampleId : "QC-" + simSampleId)
        : simSampleId;

      const rawPacket = generateVirtualPacketForAnalyzer(analyzer, effectiveSampleId);
      const parsed = parseSimulatorPacket(rawPacket, analyzer.id);
      setSimResult(parsed);

      // Ingest test into LIS backend
      const res = await fetchFromLaravel("/instruments/ingest", {
        method: "POST",
        body: JSON.stringify({
          instrument_name: parsed.analyzerName,
          category: parsed.category,
          connection_type: parsed.connectionType,
          sample_id: parsed.sampleId,
          parameters: parsed.parameters,
          histograms: parsed.histograms,
          raw_data: parsed.rawPacket,
          is_control: parsed.isControl,
        }),
      });

      if (res && res.status === "success") {
        setSimIngestStatus(
          "Successfully processed! " + (res.matched_report ? "Matched with Patient Report: " + res.matched_report.barcode : "Stored in LIS machine buffer")
        );
        showToast("Simulation packet processed successfully!", "success");
      } else {
        setSimIngestStatus("Packet parsed & verified locally!");
      }
    } catch (err: any) {
      setSimIngestStatus("Parsed locally: " + (err.message || "LIS backend idle"));
    } finally {
      setSimLoading(false);
    }
  };

  // Visual Parameter Mapper Drawer State
  const [isMappingDrawerOpen, setIsMappingDrawerOpen] = useState(false);
  const [selectedMappingInstrument, setSelectedMappingInstrument] = useState<Instrument | null>(null);
  const [localMappings, setLocalMappings] = useState<Array<{ key: string; target: string }>>([]);
  const [unmappedList, setUnmappedList] = useState<string[]>([]);
  const [newMappingKey, setNewMappingKey] = useState("");
  const [newMappingTarget, setNewMappingTarget] = useState("");
  const [isSavingMappings, setIsSavingMappings] = useState(false);

  const handleOpenMappingDrawer = (inst: Instrument) => {
    setSelectedMappingInstrument(inst);
    const mappingsObj = inst.parameter_mappings || {};
    const rows: Array<{ key: string; target: string }> = [];
    for (const [k, v] of Object.entries(mappingsObj)) {
      if (k !== "_unmapped") {
        rows.push({ key: k, target: String(v) });
      }
    }
    setLocalMappings(rows);
    setUnmappedList(inst.unmapped_codes || (mappingsObj as any)["_unmapped"] || []);
    setNewMappingKey("");
    setNewMappingTarget("");
    setIsMappingDrawerOpen(true);
  };

  const handleAddMappingRow = () => {
    if (!newMappingKey.trim() || !newMappingTarget.trim()) {
      showToast("Please enter both Machine Code and LIS Test Name", "error");
      return;
    }
    const cleanKey = newMappingKey.trim().toUpperCase();
    const cleanTarget = newMappingTarget.trim();

    setLocalMappings((prev) => {
      const filtered = prev.filter((r) => r.key !== cleanKey);
      return [...filtered, { key: cleanKey, target: cleanTarget }];
    });
    setUnmappedList((prev) => prev.filter((code) => code.toUpperCase() !== cleanKey));
    setNewMappingKey("");
    setNewMappingTarget("");
  };

  const handleRemoveMappingRow = (keyToRemove: string) => {
    setLocalMappings((prev) => prev.filter((r) => r.key !== keyToRemove));
  };

  const handleLoadModelDefaults = () => {
    if (!selectedMappingInstrument) return;
    const catModel = ANALYZER_CATALOG.find(
      (a) =>
        a.id === selectedMappingInstrument.id ||
        a.model.toLowerCase() === (selectedMappingInstrument.model || "").toLowerCase()
    );
    if (catModel && catModel.parameter_mappings) {
      const rows = Object.entries(catModel.parameter_mappings).map(([k, v]) => ({
        key: k,
        target: v,
      }));
      setLocalMappings(rows);
      showToast(`Loaded ${rows.length} standard defaults for ${catModel.model}`, "success");
    } else {
      showToast("No catalog presets found for this model.", "error");
    }
  };

  const handleSaveMappings = async () => {
    if (!selectedMappingInstrument) return;
    setIsSavingMappings(true);
    try {
      const mappingsObj: Record<string, string> = {};
      for (const row of localMappings) {
        if (row.key.trim() && row.target.trim()) {
          mappingsObj[row.key.trim().toUpperCase()] = row.target.trim();
        }
      }
      if (unmappedList.length > 0) {
        (mappingsObj as any)["_unmapped"] = unmappedList;
      }

      await fetchFromLaravel(`/instruments/${selectedMappingInstrument.id}`, {
        method: "PUT",
        body: JSON.stringify({ parameter_mappings: mappingsObj }),
      });

      setInstruments((prev) =>
        prev.map((i) =>
          i.id === selectedMappingInstrument.id
            ? { ...i, parameter_mappings: mappingsObj, unmapped_codes: unmappedList }
            : i
        )
      );

      setIsMappingDrawerOpen(false);
      showToast("Custom parameter mappings saved successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save parameter mappings.", "error");
    } finally {
      setIsSavingMappings(false);
    }
  };

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
      await fetchFromLaravel("/instruments/" + inst.id, {
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
      await fetchFromLaravel("/instruments/" + inst.id, {
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
      await fetchFromLaravel("/instruments/" + id, { method: "DELETE" });
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
              Connect your <strong>Beacon UNIKON 230</strong>, <strong>Aveacon Cell Counter</strong>, <strong>Nihon Kohden MEK-1305</strong>, <strong>Beacon B200</strong>, <strong>Mindray</strong>, or <strong>Sysmex</strong> analyzers via <strong>LAN Ethernet Cable (TCP/IP)</strong> or <strong>RS-232 Serial Cable (USB-to-DB9)</strong>. Results stream directly into patient reports when entering test results!
            </p>
          </div>

          {/* Quick Action Button: Download Standalone Windows .exe & Batch Starter */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleOpenSimulator()}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              title="Open Virtual Analyzer Test Studio to test & simulate any machine"
            >
              <Play className="h-4 w-4" />
              <span>Virtual Test Studio</span>
            </button>
            <a
              href="/OnePath-Bridge.exe"
              download="OnePath-Bridge.exe"
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold transition-all shadow-md cursor-pointer hover:brightness-105 active:scale-98"
              title="Download Standalone Windows Machine Bridge (.exe) - No Node.js Required"
            >
              <Download className="h-4 w-4" />
              <span>Download OnePath-Bridge.exe</span>
            </a>
            <a
              href="/START_MACHINE_BRIDGE.bat"
              download="START_MACHINE_BRIDGE.bat"
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              title="Download 1-Click Windows Starter (.bat)"
            >
              <Terminal className="h-4 w-4 text-primary" />
              <span>Starter (.bat)</span>
            </a>
            <button
              type="button"
              onClick={handleDownloadBridgeConfig}
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              title="Download pre-configured bridge-config.json for your lab"
            >
              <Download className="h-4 w-4" />
              <span>Download Config (.json)</span>
            </button>
          </div>
        </div>

        {/* Lab Bridge Credentials & Quick Setup Banner */}
        <div className="mt-5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Lab Bridge Authentication ({currentLabName})</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Put <code className="font-mono text-primary font-bold">bridge-config.json</code> in the same folder as <code className="font-mono text-primary font-bold">OnePath-Bridge.exe</code> on the machine PC.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-[11px] pt-0.5">
              <span>
                Tenant LAB ID: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold select-all">{currentLabId || "Default Tenant"}</code>
              </span>
              <span>
                API Token: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active & Linked</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {currentLabId && (
              <button
                type="button"
                onClick={handleCopyLabId}
                className="flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[11px] font-semibold text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                title="Copy Lab Tenant ID"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{copiedId ? "Copied!" : "Copy Lab ID"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadBridgeConfig}
              className="flex-1 sm:flex-none justify-center px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              title="Download bridge-config.json ready for OnePath-Bridge.exe"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download bridge-config.json</span>
            </button>
          </div>
        </div>

        {/* Dual Mode Connection Options Box */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Visual Parameter Mapper Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenMappingDrawer(inst)}
                    className={`text-[11px] font-bold hover:underline cursor-pointer shrink-0 flex items-center gap-1 ${
                      (inst.unmapped_codes?.length || 0) > 0
                        ? "text-amber-600 dark:text-amber-400 font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Open Visual Parameter Mapping"
                  >
                    <Sliders className="h-3 w-3" />
                    <span>Mapping</span>
                    {(inst.unmapped_codes?.length || 0) > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-mono animate-pulse">
                        {inst.unmapped_codes!.length} unmapped
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSimulator(inst)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0 flex items-center gap-1"
                    title="Simulate test packet for this analyzer"
                  >
                    <Play className="h-3 w-3" />
                    <span>Test Packet</span>
                  </button>

                  <button
                    onClick={() => handleToggleActive(inst)}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
                  >
                    {inst.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dialog: Add New Machine (TCP/IP or Serial RS-232) ── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[96vw] md:w-[94vw] lg:max-w-4xl xl:max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-card border border-border rounded-2xl p-4 sm:p-6 lg:p-7 shadow-2xl">
          <DialogHeader className="pr-10 sm:pr-12 text-left w-full max-w-full min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-display font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary shrink-0" />
                <span>Configure Laboratory Instrument</span>
              </DialogTitle>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Sparkles className="h-3 w-3" />
                {ANALYZER_CATALOG.length}+ Models Catalog
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your analyzer from 200+ pre-mapped diagnostic presets or customize LAN/Serial communication.
            </p>
          </DialogHeader>

          <form onSubmit={handleAddInstrument} className="space-y-4 pt-1 w-full max-w-full min-w-0">
            {/* ── Step 1: 200+ Clinical Analyzers Catalog Picker ── */}
            <div className="space-y-3 bg-primary/5 p-3.5 sm:p-4 rounded-xl border border-primary/20 w-full max-w-full min-w-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 w-full">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Step 1: Choose Analyzer Model (200+ Master Presets)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Showing {filteredAnalyzers.length} of {ANALYZER_CATALOG.length} models
                  </span>
                  {selectedPreset && (
                    <button
                      type="button"
                      onClick={() => setIsBrowsingCatalog((prev) => !prev)}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>{isBrowsingCatalog ? "Hide Catalog List" : "Browse All Models"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Preset Details & Parameter Mappings Badge Preview Card */}
              {selectedPreset && !isBrowsingCatalog && !catalogSearch.trim() && (
                <div className="p-3.5 rounded-xl bg-background border border-primary/30 space-y-2.5 text-xs shadow-xs w-full max-w-full min-w-0 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-bold text-foreground text-sm truncate">{selectedPreset.brand} {selectedPreset.model}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getCategoryBadgeClass(selectedPreset.category)}`}>
                          {selectedPreset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground break-words">{selectedPreset.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsBrowsingCatalog(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      Change Model
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                      Protocol: {selectedPreset.protocol}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                      {selectedPreset.connection_type === "TCP_IP"
                        ? `Port ${selectedPreset.port} (LAN TCP)`
                        : `${selectedPreset.com_port || "COM3"} @ ${selectedPreset.baud_rate} baud`}
                    </span>
                    {selectedPreset.parameter_mappings && Object.keys(selectedPreset.parameter_mappings).length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ✓ {Object.keys(selectedPreset.parameter_mappings).length} Parameters Pre-Mapped
                      </span>
                    )}
                  </div>

                  {selectedPreset.parameter_mappings && Object.keys(selectedPreset.parameter_mappings).length > 0 && (
                    <div className="space-y-1 pt-1 w-full max-w-full min-w-0 overflow-hidden">
                      <div className="text-[10px] font-semibold text-muted-foreground">Auto-Mapped Parameters:</div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-muted/30 border border-border/40 scrollbar-thin w-full max-w-full">
                        {Object.entries(selectedPreset.parameter_mappings).map(([rawCode, mappedName]) => (
                          <span
                            key={rawCode}
                            className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono text-foreground border border-border/60 shadow-2xs break-all"
                            title={`Machine code: ${rawCode} ➔ Report parameter: ${mappedName}`}
                          >
                            <span className="font-bold text-primary">{rawCode}</span>: {mappedName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Searchable Catalog Browser (Visible if not selected, browsing, or searching) */}
              {(!selectedPreset || isBrowsingCatalog || catalogSearch.trim().length > 0) && (
                <div className="space-y-2.5 w-full max-w-full min-w-0">
                  {/* Category Filter Pills (Scrolls internally without overflowing modal) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin w-full max-w-full min-w-0">
                    {ANALYZER_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCatalogCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                          catalogCategory === cat.id
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-background/90 text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full max-w-full min-w-0">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        if (!isBrowsingCatalog) setIsBrowsingCatalog(true);
                      }}
                      placeholder="Search 200+ machines (e.g. UNIKON, Mindray, Sysmex, Erba, Maglumi, Sensa Core)..."
                      className="w-full h-9 pl-9 pr-8 rounded-xl bg-background border border-border text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch("")}
                        className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Responsive Scrollable Model Card Grid (2-Column on Tablet/Desktop, 1-Column on Mobile) */}
                  <div className="max-h-60 sm:max-h-72 overflow-y-auto p-1.5 rounded-xl bg-background/80 border border-border/80 shadow-inner scrollbar-thin w-full max-w-full min-w-0">
                    {filteredAnalyzers.length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground space-y-1">
                        <p className="text-xs font-bold">No analyzer preset matches &quot;{catalogSearch}&quot;</p>
                        <p className="text-[10px]">You can still configure your machine manually in Step 2 below.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-full min-w-0">
                        {filteredAnalyzers.map((a) => {
                          const isCurrent = selectedPresetId === a.id;
                          const mappedCount = Object.keys(a.parameter_mappings || {}).length;
                          return (
                            <div
                              key={a.id}
                              onClick={() => handleSelectPreset(a.id)}
                              className={`p-2.5 sm:p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 min-w-0 w-full overflow-hidden ${
                                isCurrent
                                  ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                                  : "bg-card border-border/60 hover:border-primary/40 hover:bg-primary/5"
                              }`}
                            >
                              <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-foreground text-xs truncate max-w-[180px] sm:max-w-[220px]" title={a.model}>
                                    {a.model}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">({a.brand})</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${getCategoryBadgeClass(a.category)}`}>
                                    {a.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border/50">
                                  {a.connection_type === "TCP_IP" ? `Port ${a.port}` : `${a.com_port || "COM3"}`}
                                </span>
                                {mappedCount > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    ✓ {mappedCount}
                                  </span>
                                )}
                                {isCurrent && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Accessible Fallback Selector for Keyboard / Test Parity */}
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full max-w-full truncate h-8 px-2.5 rounded-lg bg-background border border-border/60 text-[11px] font-semibold text-muted-foreground focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="">
                      {filteredAnalyzers.length > 0
                        ? `Or select from dropdown list (${filteredAnalyzers.length} available)...`
                        : "No analyzer found matching your search"}
                    </option>
                    {filteredAnalyzers.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.brand}] {a.model} — {a.category} ({a.connection_type === "TCP_IP" ? "LAN TCP" : "Serial RS232"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* ── Step 2: Instrument Details & Network Settings (Horizontally Balanced 2-Column Grid) ── */}
            <div className="space-y-3 pt-1 w-full max-w-full min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Step 2: Instrument Details & Network Parameters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full min-w-0">
                {/* Machine Name */}
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span>Machine Name</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="e.g. Beacon UNIKON 230 Automated Chemistry"
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-bold text-foreground">Diagnostic Category</label>
                  <select
                    value={newDevice.category}
                    onChange={(e) => setNewDevice({ ...newDevice, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer transition-all"
                  >
                    <option value="Haematology">Haematology (CBC Cell Counter)</option>
                    <option value="Biochemistry">Biochemistry / Chemistry</option>
                    <option value="Immunology">Immunology / Hormones / CLIA</option>
                    <option value="Coagulation">Coagulation (PT/INR)</option>
                    <option value="Electrolytes">Electrolytes (ISE)</option>
                    <option value="Urinalysis">Urinalysis</option>
                  </select>
                </div>

                {/* Connection Type */}
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-bold text-foreground">Connection Mode</label>
                  <select
                    value={newDevice.connection_type}
                    onChange={(e) => setNewDevice({ ...newDevice, connection_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer transition-all"
                  >
                    <option value="TCP_IP">LAN Ethernet Cable (TCP/IP)</option>
                    <option value="SERIAL_RS232">Serial Cable (RS-232 / USB DB9)</option>
                  </select>
                </div>

                {/* Protocol */}
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-bold text-foreground">Communication Protocol</label>
                  <select
                    value={newDevice.protocol}
                    onChange={(e) => setNewDevice({ ...newDevice, protocol: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer transition-all"
                  >
                    <option value="ASTM / TCP-IP">ASTM (E1381 / E1394 Standard)</option>
                    <option value="HL7 v2.x">HL7 v2.x (MLLP / TCP)</option>
                    <option value="ASTM (RS-232)">ASTM (RS-232 Serial)</option>
                    <option value="JSON / Webhook">JSON / Webhook</option>
                  </select>
                </div>

                {/* Dynamic Connection Settings Row */}
                {newDevice.connection_type === "TCP_IP" ? (
                  <>
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>TCP Listener Port</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Standard: 5100</span>
                      </label>
                      <input
                        type="number"
                        value={newDevice.port}
                        onChange={(e) => setNewDevice({ ...newDevice, port: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Analyzer Local IP (LAN)</span>
                        <span className="text-[10px] text-muted-foreground font-mono">e.g. 192.168.1.100</span>
                      </label>
                      <input
                        type="text"
                        value={newDevice.ip_address}
                        onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono font-semibold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground">COM Port (Serial / USB)</label>
                      <select
                        value={newDevice.com_port}
                        onChange={(e) => setNewDevice({ ...newDevice, com_port: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer transition-all"
                      >
                        <option value="COM1">COM1</option>
                        <option value="COM2">COM2</option>
                        <option value="COM3">COM3 (USB-Serial Converter)</option>
                        <option value="COM4">COM4</option>
                        <option value="COM5">COM5</option>
                        <option value="COM6">COM6</option>
                        <option value="COM7">COM7</option>
                        <option value="COM8">COM8</option>
                      </select>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Baud Rate</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Standard: 9600</span>
                      </label>
                      <select
                        value={newDevice.baud_rate}
                        onChange={(e) => setNewDevice({ ...newDevice, baud_rate: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono font-bold focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer transition-all"
                      >
                        <option value={9600}>9600 baud (Standard ASTM)</option>
                        <option value={19200}>19200 baud</option>
                        <option value={38400}>38400 baud</option>
                        <option value={57600}>57600 baud</option>
                        <option value={115200}>115200 baud</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Serial Parity Notice (if RS232) */}
              {newDevice.connection_type === "SERIAL_RS232" && (
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono text-muted-foreground w-full max-w-full min-w-0">
                  <span className="text-[11px] font-sans font-semibold text-foreground">Serial Data Framing:</span>
                  <span className="px-2 py-0.5 rounded-md bg-background text-foreground font-bold border border-border/60 shrink-0">
                    8 Data Bits · None Parity · 1 Stop Bit (8-N-1)
                  </span>
                </div>
              )}

              {/* Auto-fill Toggle Card */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 w-full max-w-full min-w-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <label htmlFor="modal-auto-apply" className="text-xs font-bold text-foreground cursor-pointer">
                    Auto-Fill Patient Reports
                  </label>
                  <p className="text-[11px] text-muted-foreground break-words">
                    Automatically insert incoming test readings into patient reports matching the sample barcode or SID.
                  </p>
                </div>
                <input
                  id="modal-auto-apply"
                  type="checkbox"
                  checked={newDevice.auto_apply}
                  onChange={(e) => setNewDevice({ ...newDevice, auto_apply: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer shrink-0"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-2.5 pt-3 border-t border-border/60 w-full max-w-full">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted text-center cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto h-10 gradient-primary text-primary-foreground font-bold text-xs px-7 rounded-xl shadow-xs cursor-pointer hover:brightness-105 active:scale-98 transition-all text-center flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Save Machine Configuration</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Virtual Analyzer Test Studio ── */}
      <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[96vw] md:w-[94vw] lg:max-w-3xl xl:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-2xl">
          <DialogHeader className="pr-10 sm:pr-12 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-display font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                <Play className="h-5 w-5 text-primary shrink-0" />
                <span>Virtual Analyzer Test Studio</span>
              </DialogTitle>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                Hardware-Free Simulation
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate realistic ASTM & HL7 data streams to verify analyzer connectivity without physical hardware.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Machine & Sample Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/80">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Select Analyzer Model</label>
                <select
                  value={simAnalyzerId}
                  onChange={(e) => setSimAnalyzerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:border-primary outline-none cursor-pointer"
                >
                  {ANALYZER_CATALOG.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.brand} {a.model} ({a.category} - {a.protocol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                  <span>Sample Barcode / SID</span>
                  <button
                    type="button"
                    onClick={() => setSimSampleId(`SMP-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                  >
                    🎲 Random
                  </button>
                </label>
                <input
                  type="text"
                  value={simSampleId}
                  onChange={(e) => setSimSampleId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono font-semibold text-foreground focus:border-primary outline-none"
                  placeholder="e.g. SMP-9021"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simIsControl}
                    onChange={(e) => setSimIsControl(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-foreground">
                    Simulate as Quality Control / Calibrator (QC Shield Test)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={simLoading}
                  className="w-full sm:w-auto h-10 gradient-primary text-primary-foreground font-bold text-xs px-5 rounded-xl shadow-xs cursor-pointer hover:brightness-105 active:scale-98 flex items-center justify-center gap-1.5"
                >
                  {simLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  <span>{simLoading ? "Simulating..." : "⚡ Fire Test Packet"}</span>
                </button>
              </div>
            </div>

            {/* Ingest Status Banner */}
            {simIngestStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{simIngestStatus}</span>
              </div>
            )}

            {/* Simulation Results View */}
            {simResult && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Extracted Clinical Parameters ({Object.keys(simResult.parameters).length}):</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Category: {simResult.category} | Sample: {simResult.sampleId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {Object.entries(simResult.parameters).map(([key, val]) => (
                    <div key={key} className="p-2 rounded-lg bg-background border border-border shadow-2xs space-y-0.5">
                      <div className="text-[10px] font-bold text-primary font-mono">{key}</div>
                      <div className="text-xs font-bold text-foreground font-mono">
                        {val.value} <span className="text-[10px] font-normal text-muted-foreground">{val.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Raw Stream Preview */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-foreground">Raw Machine Stream (ASCII):</div>
                  <pre className="p-2.5 rounded-xl bg-muted font-mono text-[10px] text-foreground max-h-28 overflow-y-auto whitespace-pre-wrap select-all border border-border/60">
                    {simResult.rawPacket}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Visual Parameter Mapping Drawer (Self-Learning) ── */}
      <Dialog open={isMappingDrawerOpen} onOpenChange={setIsMappingDrawerOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[96vw] md:w-[94vw] lg:max-w-3xl xl:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-2xl">
          <DialogHeader className="pr-10 sm:pr-12 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-display font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary shrink-0" />
                <span>Parameter Mapping: {selectedMappingInstrument?.name}</span>
              </DialogTitle>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                {localMappings.length} Active Mappings
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Link machine-specific test codes sent by your analyzer (e.g. <strong className="text-foreground">SUGAR_F</strong>, <strong className="text-foreground">ALT_1</strong>, or <strong className="text-foreground">CR_SERUM</strong>) to your official OnePath Lab report parameters.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Self-Learning Alert: Unmapped codes detected */}
            {unmappedList.length > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Self-Learning Alert: {unmappedList.length} Unmapped Code(s) Detected</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Click a code chip to map it instantly</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unmappedList.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setNewMappingKey(code);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-background border border-amber-500/40 text-xs font-mono font-bold text-foreground hover:bg-amber-500/10 cursor-pointer transition-all flex items-center gap-1"
                      title={`Click to map ${code}`}
                    >
                      <Plus className="h-3 w-3 text-amber-600" />
                      <span>{code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Custom Mapping Form (Horizontally Balanced Grid) */}
            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/80 space-y-2">
              <label className="text-[11px] font-bold text-foreground">Add Custom Test Mapping</label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5 items-center">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Machine Code (e.g. SUGAR_F)"
                    value={newMappingKey}
                    onChange={(e) => setNewMappingKey(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>
                <div className="hidden sm:flex sm:col-span-1 justify-center text-muted-foreground font-bold text-sm">➔</div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="LIS Parameter Name (e.g. Blood Glucose)"
                    value={newMappingTarget}
                    onChange={(e) => setNewMappingTarget(e.target.value)}
                    list="standard-lis-tests"
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddMappingRow}
                    className="w-full h-10 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 active:scale-98 transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Map</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Standard parameter recommendations datalist */}
            <datalist id="standard-lis-tests">
              <option value="Blood Glucose (Fasting)" />
              <option value="Blood Glucose (Post Prandial)" />
              <option value="Blood Glucose (Random)" />
              <option value="Alanine Aminotransferase (SGPT)" />
              <option value="Aspartate Aminotransferase (SGOT)" />
              <option value="Serum Creatinine" />
              <option value="Blood Urea" />
              <option value="Bilirubin Total" />
              <option value="Bilirubin Direct" />
              <option value="Total Cholesterol" />
              <option value="Triglycerides" />
              <option value="HDL Cholesterol" />
              <option value="LDL Cholesterol" />
              <option value="Alkaline Phosphatase (ALP)" />
              <option value="Uric Acid" />
              <option value="Calcium" />
              <option value="White Blood Cells (WBC)" />
              <option value="Hemoglobin" />
              <option value="Platelet Count" />
              <option value="Red Blood Cells (RBC)" />
              <option value="Neutrophils" />
              <option value="Lymphocytes" />
              <option value="Sodium" />
              <option value="Potassium" />
              <option value="Chloride" />
              <option value="TSH" />
              <option value="Vitamin D (25-OH)" />
              <option value="Vitamin B12" />
            </datalist>

            {/* Active Parameter Mappings Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs">Configured Parameters ({localMappings.length})</span>
                <button
                  type="button"
                  onClick={handleLoadModelDefaults}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Load {selectedMappingInstrument?.model || "Model"} Defaults</span>
                </button>
              </div>

              {localMappings.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-muted-foreground">
                  <p className="text-xs">No custom parameter mappings defined yet.</p>
                  <p className="text-[10px] mt-1">Click &quot;Load Defaults&quot; above to import standard mappings from the catalog.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 border border-border/60 rounded-xl bg-background/50 scrollbar-thin">
                  {localMappings.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border/80 text-xs shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[11px]">
                          {row.key}
                        </span>
                        <span className="text-muted-foreground font-sans">➔</span>
                        <span className="font-sans font-semibold text-foreground text-xs">
                          {row.target}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMappingRow(row.key)}
                        className="text-muted-foreground hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
                        title="Remove mapping"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsMappingDrawerOpen(false)}
                className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMappings}
                disabled={isSavingMappings}
                className="w-full sm:w-auto h-10 gradient-primary text-primary-foreground font-bold text-xs px-6 rounded-xl shadow-xs cursor-pointer hover:brightness-105 active:scale-98 flex items-center justify-center gap-1.5 transition-all text-center"
              >
                {isSavingMappings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>{isSavingMappings ? "Saving..." : "Save Parameter Mappings"}</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
