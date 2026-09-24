"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard, ShieldCheck, QrCode, Save, Loader2,
  Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw,
  Sparkles, IndianRupee, ArrowRight, Building, Smartphone,
  Check
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export function PaymentGatewayTab() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const setToast = React.useCallback((input: { text: string; type: "success" | "error" } | null) => {
    if (!input) return;
    if (input.type === "success") {
      toastSuccess(input.text);
    } else {
      toastError(input.text);
    }
  }, [toastSuccess, toastError]);

  // Form State
  const [isEnabled, setIsEnabled] = useState(false);
  const [payuMode, setPayuMode] = useState<"production" | "test">("production");
  const [payuKey, setPayuKey] = useState("");
  const [payuSalt, setPayuSalt] = useState("");
  const [showSalt, setShowSalt] = useState(false);
  const [minRechargeAmount, setMinRechargeAmount] = useState<number>(500);

  useEffect(() => {
    loadSettings();
  }, []);



  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchFromLaravel("/lab/payment-gateway");
      if (res && res.settings) {
        const s = res.settings;
        setIsEnabled(Boolean(s.is_enabled ?? false));
        setPayuMode(s.payu_mode === "test" || s.payu_mode === "sandbox" ? "test" : "production");
        setPayuKey(s.payu_merchant_key || "");
        setPayuSalt(s.payu_merchant_salt || "");
        setMinRechargeAmount(s.min_recharge_amount ?? 500);
      }
    } catch (err) {
      console.error("Failed to load payment gateway settings:", err);
      setToast({ text: "Could not fetch current payment gateway settings.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEnabled && (!payuKey.trim() || !payuSalt.trim())) {
      setToast({
        text: "Please enter both PayU Merchant Key and Salt before enabling online payments.",
        type: "error",
      });
      return;
    }

    try {
      setIsSaving(true);
      await fetchFromLaravel("/lab/payment-gateway", {
        method: "POST",
        body: JSON.stringify({
          is_enabled: isEnabled,
          payu_mode: payuMode,
          payu_merchant_key: payuKey.trim(),
          payu_merchant_salt: payuSalt.trim(),
          min_recharge_amount: Number(minRechargeAmount) || 500,
        }),
      });

      setToast({
        text: `Payment gateway credentials saved successfully in ${payuMode.toUpperCase()} mode!`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Save error:", err);
      setToast({ text: err.message || "Failed to save payment gateway settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Payment Gateway Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">PayU Payment Gateway & Bank Settlement</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> 100% Direct Bank Settlement
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  payuMode === "test"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {payuMode === "test" ? "Sandbox Test Mode" : "Live Production Mode"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Configure your own PayU Merchant Key & Salt. When your B2B partners recharge via PayU (UPI QR, Cards, or NetBanking), 100% of the funds are deposited directly into your laboratory's verified bank account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadSettings}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background hover:bg-accent text-xs font-semibold text-foreground transition-all cursor-pointer"
              title="Refresh credentials from server"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Master Toggle & Mode Selection */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Enable Online B2B Wallet Recharge</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow B2B franchisees & collection centers to recharge their wallet balance online via PayU.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
            {/* Gateway Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">PayU Environment Mode</label>
              <select
                value={payuMode}
                onChange={(e: any) => setPayuMode(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:border-primary outline-none"
              >
                <option value="production">Live Mode (Production - https://secure.payu.in)</option>
                <option value="test">Test Mode (Sandbox - https://test.payu.in)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                {payuMode === "test"
                  ? "Test mode enables end-to-end checkout simulation without real money deduction."
                  : "Production mode connects to real bank settlements."}
              </p>
            </div>

            {/* Minimum Recharge Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Minimum Recharge Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={minRechargeAmount}
                  onChange={(e) => setMinRechargeAmount(Number(e.target.value))}
                  placeholder="500"
                  className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:border-primary outline-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Minimum amount B2B client can recharge in one transaction</p>
            </div>
          </div>
        </div>

        {/* Section: PayU Credentials */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">PayU Merchant API Credentials</h3>
                <p className="text-xs text-muted-foreground">
                  Found in your PayU Dashboard under <strong>Settings &gt; API Keys</strong>.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
              SHA-512 Hash
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Merchant Key *</label>
              <input
                type="text"
                value={payuKey}
                onChange={(e) => setPayuKey(e.target.value)}
                placeholder="e.g. APWZ1b / 7rnFly"
                className="w-full h-10 px-3.5 rounded-xl bg-background border border-border text-xs font-mono font-medium text-foreground focus:border-primary outline-none"
              />
              <p className="text-[11px] text-muted-foreground">6-character merchant key identifier from your PayU dashboard</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Merchant Salt *</label>
              <div className="relative">
                <input
                  type={showSalt ? "text" : "password"}
                  value={payuSalt}
                  onChange={(e) => setPayuSalt(e.target.value)}
                  placeholder="e.g. b540a83e6027a7830b42f9... (32-character Salt)"
                  className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-background border border-border text-xs font-mono font-medium text-foreground focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSalt(!showSalt)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showSalt ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Used for cryptographic payment verification</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              PayU automatically handles <strong>Dynamic UPI QR (PhonePe, GPay, Paytm)</strong>, <strong>Credit/Debit Cards</strong>, and <strong>NetBanking</strong>. Once paid, PayU notifies your LIS server instantly, and the B2B wallet credits with zero manual steps!
            </span>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md hover:-translate-y-px active:scale-[0.98] transition-all cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? "Saving Settings..." : "Save Payment Gateway Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
