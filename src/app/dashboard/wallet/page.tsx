"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Wallet, CreditCard, QrCode, ArrowUpRight, ArrowDownLeft,
  RefreshCw, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Search, ShieldCheck, IndianRupee, Clock, ChevronRight, ChevronLeft,
  Receipt, ArrowRight, Smartphone, Copy, Check, Filter, Calendar,
  TrendingUp, Shield, AlertTriangle, CheckCheck, X, FileText,
  ChevronsLeft, ChevronsRight, HelpCircle, Lock
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";

interface Transaction {
  id: number;
  transactionId?: string;
  transaction_id?: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter?: number;
  balance_after?: number;
  paymentMethod?: string;
  payment_method?: string;
  referenceId?: string;
  reference_id?: string;
  description?: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  createdAt?: string;
  created_at?: string;
}

export default function WalletPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sub-Tab selection: "recharge" (Wallet & Add Funds) vs "history" (Wallet History & Passbook)
  const initialTab = searchParams.get("tab") === "history" ? "history" : "recharge";
  const [activeTab, setActiveTab] = useState<"recharge" | "history">(initialTab);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [totalCredited, setTotalCredited] = useState<number>(0);
  const [totalDebited, setTotalDebited] = useState<number>(0);
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);

  // Transactions list & filtering
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7DAYS" | "MONTH">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedTxn, setCopiedTxn] = useState<string | null>(null);

  // Recharge State (Only PayU Instant)
  const [rechargeAmount, setRechargeAmount] = useState<number>(1000);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState(false);

  // Payment Status Banner from URL
  const paymentStatus = searchParams.get("payment");
  const paidTxnId = searchParams.get("txnid");
  const paidAmount = searchParams.get("amount");

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadWalletData();

    // Listen to real-time events across windows / tabs
    const handleWalletUpdated = () => {
      loadWalletData(true);
    };
    const handleFocus = () => {
      loadWalletData(true);
    };

    window.addEventListener("b2b_wallet_updated", handleWalletUpdated);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("b2b_wallet_updated", handleWalletUpdated);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadWalletData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [summaryRes, txnsRes] = await Promise.all([
        fetchFromLaravel("/b2b/wallet/summary", { skipCache: true }),
        fetchFromLaravel("/b2b/wallet/transactions?per_page=100", { skipCache: true }),
      ]);

      if (summaryRes) {
        setWalletBalance(Number(summaryRes.wallet_balance) || 0);
        setCreditLimit(Number(summaryRes.credit_limit) || 0);
        setTotalCredited(Number(summaryRes.total_credited) || 0);
        setTotalDebited(Number(summaryRes.total_debited) || 0);
        setGatewayConfig(summaryRes.gateway_config);
      }

      if (txnsRes) {
        const list = Array.isArray(txnsRes) ? txnsRes : (txnsRes.data || []);
        setTransactions(list);
      }
    } catch (err: any) {
      console.error("Failed to load B2B wallet data:", err);
      if (!silent) {
        setToast({ text: "Could not fetch wallet data. Please check connection.", type: "error" });
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxn(text);
    setTimeout(() => setCopiedTxn(null), 2000);
  };

  const handleQuickAmount = (amount: number) => {
    setRechargeAmount(amount);
  };

  const handleDatePreset = (preset: "ALL" | "TODAY" | "7DAYS" | "MONTH") => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "7DAYS") {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setFromDate(past.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (preset === "MONTH") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstOfMonth.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    }
    setCurrentPage(1);
  };

  const isGatewayEnabled = Boolean(gatewayConfig?.is_enabled);
  const isGatewayConfigured = Boolean(gatewayConfig?.is_configured || gatewayConfig?.has_payu);
  const isRechargeAllowed = isGatewayEnabled && isGatewayConfigured;

  const handleInitiateRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRechargeAllowed) {
      setToast({
        text: !isGatewayEnabled
          ? "Online wallet recharge is disabled by your laboratory administrator."
          : "Payment gateway credentials are not yet configured by the laboratory.",
        type: "error",
      });
      return;
    }
    const min = gatewayConfig?.min_recharge_amount || 100;
    if (rechargeAmount < min) {
      setToast({ text: `Minimum recharge amount is ₹${min.toLocaleString("en-IN")}`, type: "error" });
      return;
    }

    try {
      setIsSubmittingRecharge(true);
      const res = await fetchFromLaravel("/b2b/wallet/recharge", {
        method: "POST",
        body: JSON.stringify({
          amount: rechargeAmount,
          payment_method: "PAYU",
          frontend_origin: typeof window !== "undefined" ? window.location.origin : "",
        }),
      });

      if (res && res.action_url && res.params) {
        // Create and submit POST form to PayU gateway
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.action_url;
        form.style.display = "none";

        Object.entries(res.params).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error(res?.error || "Invalid response from recharge server.");
      }
    } catch (err: any) {
      console.error("Recharge initiation error:", err);
      setToast({ text: err.message || "Failed to initiate recharge. Try again.", type: "error" });
      setIsSubmittingRecharge(false);
    }
  };

  // Filter transactions by type, date range, and search query
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "ALL" && t.type !== typeFilter) return false;

      // Date range filter
      const dateStr = t.createdAt || t.created_at;
      if (dateStr) {
        const itemDate = new Date(dateStr);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (itemDate < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (itemDate > to) return false;
        }
      }

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const tid = (t.transactionId || t.transaction_id || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const ref = (t.referenceId || t.reference_id || "").toLowerCase();
      return tid.includes(q) || desc.includes(q) || ref.includes(q);
    });
  }, [transactions, typeFilter, searchQuery, fromDate, toDate]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, fromDate, toDate, pageSize]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-sm font-semibold text-muted-foreground">Loading B2B Wallet & Payment Ledger...</p>
      </div>
    );
  }

  const isBalanceHealthy = walletBalance > 0;
  const isBalanceNegative = walletBalance < 0;

  return (
    <div className="space-y-7 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl text-xs font-bold transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Payment Result Banners from PayU Callback */}
      {paymentStatus === "success" && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-100">
                Wallet Recharge Successful!
              </h4>
              <p className="text-xs mt-0.5">
                {paidAmount ? `₹${Number(paidAmount).toLocaleString("en-IN")}` : "Payment"}{" "}
                has been verified by PayU and added to your wallet balance. (Ref: {paidTxnId || "PayU"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.history.replaceState({}, "", "/dashboard/wallet");
              window.dispatchEvent(new Event("b2b_wallet_updated"));
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Payment Not Completed</h4>
              <p className="text-xs mt-0.5">
                The transaction was either cancelled or could not be verified by PayU. Please try again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.history.replaceState({}, "", "/dashboard/wallet")}
            className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-[0.2em]">B2B Franchisee Console</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60">
              PayU Automated Ledger
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground mt-1">
            Wallet & Payment Settlement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Instant PayU UPI top-up, prepaid testing balance, automated report print deductions, and audit passbook.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadWalletData(false)}
          disabled={refreshing}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-accent transition-all cursor-pointer shadow-xs shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-purple-600" : ""}`} />
          <span>{refreshing ? "Syncing..." : "Refresh Balance"}</span>
        </button>
      </div>

      {/* ── Sub-Tab Navigation Bar ── */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("recharge")}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === "recharge"
              ? "border-purple-600 text-purple-600 bg-purple-50/50 dark:bg-purple-950/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Wallet & Add Funds</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted text-foreground">
            ₹{walletBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === "history"
              ? "border-purple-600 text-purple-600 bg-purple-50/50 dark:bg-purple-950/30"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Wallet History & Passbook</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
            activeTab === "history" ? "bg-purple-600 text-white" : "bg-muted text-foreground"
          }`}>
            {transactions.length} Txns
          </span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 1: WALLET & ADD FUNDS                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "recharge" && (
        <div className="space-y-7 animate-fade-in">
          {/* Negative Balance Alert */}
          {isBalanceNegative && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Outstanding Wallet Balance Alert</h4>
                <p className="text-xs mt-0.5">
                  Your wallet is currently negative (<strong>-₹{Math.abs(walletBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>). Please recharge your wallet to ensure uninterrupted patient report downloads.
                </p>
              </div>
            </div>
          )}

          {/* ── KPI Stat Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Current Balance */}
            <div className={`border rounded-2xl p-5 shadow-2xs transition-all ${
              isBalanceNegative
                ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
                : "bg-gradient-to-br from-purple-500/10 via-card to-card border-purple-200/80 dark:border-purple-900/50"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Current Balance
                </span>
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className={`text-3xl font-black mt-3 tracking-tight ${isBalanceNegative ? "text-red-600" : "text-foreground"}`}>
                ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <span>Status:</span>
                <span className={`font-bold ${isBalanceHealthy ? "text-emerald-600" : isBalanceNegative ? "text-red-600" : "text-amber-600"}`}>
                  {isBalanceHealthy ? "Active & Healthy" : isBalanceNegative ? "Overdrawn / Low" : "Zero Balance"}
                </span>
              </div>
            </div>

            {/* Card 2: Total Added */}
            <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Added</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
                ₹{totalCredited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <span>Lifetime Credits:</span>
                <span className="font-bold text-emerald-600">+₹{totalCredited.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 3: Total Spent */}
            <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Spent</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center border border-blue-200/60">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
                ₹{totalDebited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <span>Report Deductions:</span>
                <span className="font-bold text-blue-600">-₹{totalDebited.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 4: Credit Facility */}
            <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credit Facility</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-200/60">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground mt-3 tracking-tight">
                ₹{creditLimit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <span>Usable Limit:</span>
                <span className="font-bold text-foreground">₹{(walletBalance + creditLimit).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* ── Add Funds Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Recharge Form (7 Cols) */}
            <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Add Funds to Wallet</h3>
                    <p className="text-xs text-muted-foreground">Powered by PayU Automated Payment Gateway</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  Min: ₹{(gatewayConfig?.min_recharge_amount || 100).toLocaleString("en-IN")}
                </span>
              </div>

              <form onSubmit={handleInitiateRecharge} className="space-y-5">
                {/* Gateway Disabled / Unconfigured Alerts */}
                {!isGatewayEnabled ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-3">
                    <Lock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Online Wallet Recharge Disabled</h4>
                      <p className="text-xs mt-0.5 leading-relaxed">
                        Online balance addition is currently disabled by your laboratory administrator. Please contact lab management directly for manual top-ups or credit facility adjustments.
                      </p>
                    </div>
                  </div>
                ) : !isGatewayConfigured ? (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start gap-3">
                    <Lock className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Payment Gateway Not Configured</h4>
                      <p className="text-xs mt-0.5 leading-relaxed">
                        The laboratory administrator has not configured their PayU merchant credentials yet. Online balance addition will unlock as soon as keys are saved.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Quick Amount Chips */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">Select Recharge Amount</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[500, 1000, 2000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={!isRechargeAllowed}
                        onClick={() => handleQuickAmount(amt)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                          !isRechargeAllowed
                            ? "opacity-50 cursor-not-allowed bg-muted/40 border-border text-muted-foreground"
                            : rechargeAmount === amt
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs cursor-pointer"
                            : "bg-background border-border hover:bg-accent text-foreground cursor-pointer"
                        }`}
                      >
                        ₹{amt.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Custom Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={gatewayConfig?.min_recharge_amount || 100}
                      step="10"
                      value={rechargeAmount}
                      disabled={!isRechargeAllowed}
                      onChange={(e) => setRechargeAmount(Number(e.target.value))}
                      required
                      placeholder="Enter amount"
                      className={`w-full h-12 pl-9 pr-4 rounded-xl bg-background border border-border text-base font-extrabold text-foreground outline-none ${
                        !isRechargeAllowed
                          ? "opacity-50 cursor-not-allowed bg-muted/40"
                          : "focus:border-purple-600"
                      }`}
                    />
                  </div>
                </div>

                {/* Single Payment Method: PayU Instant */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">Payment Method</label>
                  <div className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3 shadow-xs ${
                    !isRechargeAllowed
                      ? "border-border bg-muted/30 opacity-70"
                      : "border-purple-600 bg-purple-50/60 dark:bg-purple-950/30"
                  }`}>
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                        !isRechargeAllowed ? "bg-muted-foreground/50" : "bg-purple-600"
                      }`}>
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">PayU Instant</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            !isRechargeAllowed
                              ? "bg-muted text-muted-foreground border-border"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/60"
                          }`}>
                            Instant Auto-Credit
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Dynamic UPI QR (PhonePe, Google Pay, Paytm), Credit/Debit Cards & NetBanking
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 ${
                      !isRechargeAllowed ? "bg-muted-foreground/50" : "bg-purple-600"
                    }`}>
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                {/* Settlement Banner */}
                <div className="p-3 rounded-xl bg-muted/50 border border-border/70 flex items-center gap-2.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    100% automated verification! PayU verifies payments instantly and credits your wallet in real-time.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!isRechargeAllowed || isSubmittingRecharge}
                  className={`w-full h-12 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    !isRechargeAllowed
                      ? "bg-muted text-muted-foreground border border-border cursor-not-allowed shadow-none"
                      : "bg-purple-600 hover:bg-purple-700 text-white hover:-translate-y-px active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  {!isRechargeAllowed ? (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>
                        {!isGatewayEnabled
                          ? "Recharge Locked (Disabled by Lab)"
                          : "Recharge Locked (Keys Not Configured)"}
                      </span>
                    </>
                  ) : isSubmittingRecharge ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Redirecting to PayU...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Recharge ₹{rechargeAmount.toLocaleString("en-IN")} via PayU Instant</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Automated Flow Guide & Quick Passbook Teaser (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
              {/* How it works */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center border border-purple-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">How PayU Auto-Recharge Works</h4>
                    <p className="text-[11px] text-muted-foreground">Zero manual UTR typing required</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">Select Amount & Proceed</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Choose amount and click Proceed to launch PayU secure window.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">Scan Dynamic QR or Pay with Cards</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Scan on PhonePe/GPay/Paytm or enter card/netbanking details.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Instant Automated Credit</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">PayU confirms instantly, credits wallet balance, and unlocks report downloads immediately.</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Direct Parent Lab Settlement
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    Recharges settle directly into your parent central lab's official merchant account.
                  </p>
                </div>
              </div>

              {/* Passbook Teaser Card */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Ledger Activity</h4>
                    <p className="text-xs font-semibold text-foreground mt-0.5">Latest 3 transactions</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {transactions.slice(0, 3).map((t) => {
                    const isCredit = t.type === "CREDIT";
                    return (
                      <div key={t.id} className="p-2.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-foreground truncate">
                            {t.description || (isCredit ? "Wallet Recharge" : "Report Deduction")}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {t.transactionId || t.transaction_id}
                          </p>
                        </div>
                        <span className={`font-black whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                          {isCredit ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="w-full mt-4 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Open Full Passbook & Audit Trail &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 2: WALLET HISTORY & PASSBOOK                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Metric Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Running Balance</span>
                <p className={`text-2xl font-black mt-1 ${isBalanceNegative ? "text-red-600" : "text-foreground"}`}>
                  ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Lifetime Credits (+)</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  +₹{totalCredited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">Lifetime Deductions (-)</span>
                <p className="text-2xl font-black text-red-600 mt-1">
                  -₹{totalDebited.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center border border-red-200">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Passbook Box */}
          <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-5 border-b border-border/70 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Transaction Audit Passbook</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-muted text-foreground">
                      {filteredTransactions.length} of {transactions.length} records
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Filter by date, search specific patient names or report codes, and audit all debits & credits.
                  </p>
                </div>

                {/* Quick Date Presets */}
                <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => handleDatePreset("ALL")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      datePreset === "ALL" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset("TODAY")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      datePreset === "TODAY" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset("7DAYS")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      datePreset === "7DAYS" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset("MONTH")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      datePreset === "MONTH" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* Second Filter Row: Inputs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50 flex-wrap">
                {/* Date Inputs */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-xl text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground font-semibold text-[11px]">From:</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setDatePreset("ALL");
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-foreground text-xs font-medium outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-xl text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground font-semibold text-[11px]">To:</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setDatePreset("ALL");
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-foreground text-xs font-medium outline-none cursor-pointer"
                    />
                  </div>

                  {(fromDate || toDate) && (
                    <button
                      type="button"
                      onClick={() => handleDatePreset("ALL")}
                      className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
                      title="Reset dates"
                    >
                      <X className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Type & Search */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Type Filter */}
                  <div className="flex items-center p-1 bg-muted rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => { setTypeFilter("ALL"); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        typeFilter === "ALL" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTypeFilter("DEBIT"); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        typeFilter === "DEBIT" ? "bg-card text-red-600 shadow-xs font-bold" : "text-muted-foreground"
                      }`}
                    >
                      Debits (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTypeFilter("CREDIT"); setCurrentPage(1); }}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        typeFilter === "CREDIT" ? "bg-card text-emerald-600 shadow-xs font-bold" : "text-muted-foreground"
                      }`}
                    >
                      Credits (+)
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      placeholder="Search Patient / Report / Txn..."
                      className="h-9 pl-8 pr-8 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:border-purple-600 outline-none w-56 sm:w-64"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Passbook Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Transaction Reference</th>
                    <th className="py-3 px-4">Deduction Purpose / Description</th>
                    <th className="py-3 px-4">Payment Channel</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-muted-foreground">
                        <Receipt className="h-10 w-10 mx-auto mb-2 opacity-35 text-purple-600" />
                        <p className="text-sm font-bold text-foreground">No ledger transactions found</p>
                        <p className="text-xs mt-0.5 max-w-sm mx-auto">
                          {fromDate || toDate || searchQuery || typeFilter !== "ALL"
                            ? "No transactions match your active filters. Try clearing or broadening your search criteria."
                            : "All wallet recharges and diagnostic report print deductions will be tracked here automatically."}
                        </p>
                        {(fromDate || toDate || searchQuery || typeFilter !== "ALL") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setTypeFilter("ALL");
                              handleDatePreset("ALL");
                            }}
                            className="mt-3 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t) => {
                      const isCredit = t.type === "CREDIT";
                      const txnId = t.transactionId || t.transaction_id || `TXN-${t.id}`;
                      const bal = Number(t.balanceAfter ?? t.balance_after) || 0;
                      const method = t.paymentMethod || t.payment_method || "PAYU";
                      const ref = t.referenceId || t.reference_id;
                      const dateStr = t.createdAt || t.created_at || new Date().toISOString();
                      const desc = t.description || (isCredit ? "Wallet Recharge" : "Diagnostic Report Fee");
                      const isReportDeduction = !isCredit && (desc.toLowerCase().includes("report") || desc.toLowerCase().includes("deduction"));

                      return (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                            <div className="font-semibold text-foreground">
                              {new Date(dateStr).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70">
                              {new Date(dateStr).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>

                          {/* Transaction ID & Ref */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-foreground">{txnId}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(txnId)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Copy Txn ID"
                              >
                                {copiedTxn === txnId ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            {ref && (
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                Ref: {ref}
                              </div>
                            )}
                          </td>

                          {/* Description & Purpose */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {isReportDeduction ? (
                                <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60">
                                  <FileText className="h-3.5 w-3.5" />
                                </div>
                              ) : isCredit ? (
                                <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
                                  <Sparkles className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                                  <Receipt className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-foreground leading-tight">{desc}</p>
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                                  isReportDeduction ? "text-blue-600" : isCredit ? "text-emerald-600" : "text-muted-foreground"
                                }`}>
                                  {isReportDeduction ? "Report Unlocked" : isCredit ? "Top-up Credited" : "Wallet Transaction"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Payment Channel */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-muted text-foreground border border-border/70">
                              {method === "PAYU_UPI" ? "UPI Dynamic QR" : method === "WALLET" ? "Prepaid Wallet" : method}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-sm">
                            <span className={isCredit ? "text-emerald-600" : "text-red-600"}>
                              {isCredit ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Balance After */}
                          <td className="py-3.5 px-4 text-right font-bold text-foreground whitespace-nowrap text-xs">
                            ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                t.status === "SUCCESS"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60"
                                  : t.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/60"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div>
                  Showing{" "}
                  <span className="font-bold text-foreground">
                    {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-foreground">
                    {Math.min(currentPage * pageSize, filteredTransactions.length)}
                  </span>{" "}
                  of <span className="font-bold text-foreground">{filteredTransactions.length}</span> records
                </div>

                {/* Page Size Dropdown */}
                <div className="flex items-center gap-1.5 pl-3 border-l border-border/60">
                  <span className="text-[11px]">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-all cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numeric Page Buttons */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                    let pageNum = idx + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) {
                        pageNum = Math.min(totalPages - 4 + idx, Math.max(1, currentPage - 2 + idx));
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-purple-600 text-white shadow-xs"
                            : "border border-border bg-background hover:bg-accent text-foreground"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-all cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
