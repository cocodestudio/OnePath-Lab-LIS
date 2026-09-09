"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertCircle, RefreshCw, Smartphone, QrCode,
  ShieldCheck, Send, Loader2, LogOut, Check, Sparkles, MessageSquare
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export function WhatsAppGatewayTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);

  // Fetch connection status
  const checkStatus = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetchFromLaravel("/whatsapp/status", { skipCache: true });
      setStatusData(res);

      // If not connected, fetch the QR code
      if (!res?.is_connected) {
        const qrRes = await fetchFromLaravel("/whatsapp/qr", { skipCache: true });
        if (qrRes?.qr) {
          setQrCodeData(qrRes.qr);
        }
      } else {
        setQrCodeData(null);
      }
    } catch (err: any) {
      console.error("Failed to check WhatsApp status:", err);
      if (!silent) {
        toast.error("Connection Error", "Unable to connect to WhatsApp Gateway service.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto polling while waiting for QR scan
  useEffect(() => {
    if (statusData?.is_connected) return;

    const interval = setInterval(() => {
      setAutoRefreshCount((c) => c + 1);
      checkStatus(true);
    }, 6000);

    return () => clearInterval(interval);
  }, [statusData?.is_connected, checkStatus]);

  const isConnected = !!statusData?.is_connected;
  const rawStatus = (statusData?.status || "UNKNOWN").toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Automated WhatsApp Integration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              OnePath Official WhatsApp Gateway
            </h2>
            <p className="text-emerald-100/90 text-sm max-w-xl leading-relaxed">
              Connect your laboratory WhatsApp account to automatically deliver diagnostic test reports in PDF format directly to patient phone numbers with a single click.
            </p>
          </div>

          {/* Status Capsule */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
            <div className={`h-3.5 w-3.5 rounded-full animate-pulse ${isConnected ? "bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" : "bg-amber-300 shadow-[0_0_12px_#fcd34d]"}`} />
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold block">Gateway Status</span>
              <span className="text-base font-black tracking-wide">
                {isConnected ? "Connected & Ready" : rawStatus === "QR_READY" ? "Pairing Required" : rawStatus}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => checkStatus(false)}
              disabled={refreshing}
              className="ml-2 h-9 w-9 p-0 rounded-xl bg-white/20 hover:bg-white/30 border-white/20 text-white cursor-pointer"
              title="Refresh Status"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: QR Pairing or Connected Info */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: QR Code or Device Details (7 cols) */}
        <div className="md:col-span-7 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Checking WhatsApp gateway connection...</p>
            </div>
          ) : isConnected ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">WhatsApp Account Active</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your account is linked and ready to deliver diagnostic reports automatically.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Linked Number</span>
                  <span className="text-base font-mono font-extrabold text-foreground mt-1 block">
                    {statusData?.phone ? `+${statusData.phone}` : "Linked Device"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Device Push Name</span>
                  <span className="text-base font-extrabold text-foreground mt-1 block truncate">
                    {statusData?.pushName || "OnePath Lab Device"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Gateway Session</span>
                  <span className="text-base font-mono font-bold text-foreground mt-1 block truncate">
                    {statusData?.session_name || "default"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Engine Architecture</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    OpenWA / Baileys WS
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Need to switch to another WhatsApp account?</span>
                  <span className="text-[11px] text-muted-foreground block">
                    You can disconnect this session and pair a different phone anytime.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!confirm("Are you sure you want to disconnect WhatsApp? You will need to scan the QR code again.")) return;
                    setRefreshing(true);
                    try {
                      await fetchFromLaravel("/whatsapp/status", { method: "DELETE" }).catch(() => {});
                      toast.info("Logged Out", "WhatsApp session reset. Please scan QR to reconnect.");
                      checkStatus();
                    } catch {
                      checkStatus();
                    }
                  }}
                  className="gap-2 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Unlink Phone</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Scan to Connect</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">Pair Your WhatsApp Account</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Open WhatsApp on your mobile phone and scan the QR code below to authorize report dispatch.
                </p>
              </div>

              {/* QR Container */}
              <div className="relative p-4 bg-white rounded-3xl shadow-xl border-4 border-emerald-500/30">
                {qrCodeData ? (
                  <img
                    src={qrCodeData}
                    alt="WhatsApp Pairing QR Code"
                    className="w-56 h-56 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">Generating QR Code...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => checkStatus(false)}
                  disabled={refreshing}
                  className="gap-2 rounded-xl text-xs font-bold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  <span>Refresh QR Code</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Step-by-Step Instructions (5 cols) */}
        <div className="md:col-span-5 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              <span>How to Link WhatsApp</span>
            </h4>

            <div className="space-y-3.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                  1
                </span>
                <p className="mt-0.5 leading-relaxed">
                  Open <strong className="text-foreground">WhatsApp</strong> on your mobile phone.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                  2
                </span>
                <p className="mt-0.5 leading-relaxed">
                  Tap <strong className="text-foreground">Menu (⋮)</strong> on Android or <strong className="text-foreground">Settings</strong> on iPhone.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                  3
                </span>
                <p className="mt-0.5 leading-relaxed">
                  Select <strong className="text-foreground">Linked Devices</strong> and then tap <strong className="text-foreground">Link a Device</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                  4
                </span>
                <p className="mt-0.5 leading-relaxed">
                  Point your phone camera to this screen to scan the QR code. The system connects automatically within seconds!
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Direct PDF Delivery</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-700/90 dark:text-emerald-400/90">
              Once linked, when your staff clicks <strong>&quot;Send WhatsApp Report&quot;</strong> in any report view, the official diagnostic PDF report is automatically sent to the patient&apos;s phone with zero manual effort.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
