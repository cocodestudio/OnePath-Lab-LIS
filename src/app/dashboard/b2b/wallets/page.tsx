"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet, Building, Users, AlertCircle, CheckCircle2, TrendingUp,
  Search, RefreshCw, PlusCircle, History, ArrowUpRight, ArrowDownLeft,
  DollarSign, ShieldCheck, Phone, Mail, FileText, ChevronRight,
  X, Check, Sparkles, Filter, CreditCard, ArrowRight
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface B2bClient {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  lab_name: string;
  status: string;
  rate_tier: string;
  rate_list_id?: number | null;
  rate_list_name?: string | null;
  wallet_balance: number;
  credit_limit: number;
  total_patients: number;
  today_patients: number;
  month_patients: number;
  total_sales: number;
  today_sales: number;
  month_sales: number;
  created_at?: string;
}

interface WalletTransaction {
  id: number | string;
  transaction_id?: string;
  transactionId?: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance_after?: number;
  balanceAfter?: number;
  payment_method?: string;
  paymentMethod?: string;
  reference_id?: string;
  referenceId?: string;
  description?: string;
  status: string;
  created_at?: string;
  createdAt?: string;
}

export default function B2bWalletsPage() {
  const [clients, setClients] = useState<B2bClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [balanceFilter, setBalanceFilter] = useState<"ALL" | "HEALTHY" | "LOW" | "DEFICIT">("ALL");

  // In-Page Horizontal Panel State (NO POPUP DIALOG)
  const [activePanel, setActivePanel] = useState<"NONE" | "TOPUP" | "HISTORY">("NONE");
  const [selectedClient, setSelectedClient] = useState<B2bClient | null>(null);

  // Top-Up Form State
  const [topUpType, setTopUpType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [referenceId, setReferenceId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const [topUpMessage, setTopUpMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // History State
  const [historyTransactions, setHistoryTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");

  // Fetch all B2B Clients
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchFromLaravel("/b2b/clients", { skipCache: true });
      if (res && res.status === "success" && Array.isArray(res.data)) {
        setClients(res.data);
      } else if (Array.isArray(res)) {
        setClients(res);
      }
    } catch (err) {
      console.error("Failed to load B2B clients:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fetch history for selected partner
  const fetchPartnerHistory = useCallback(async (partnerId: string | number) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetchFromLaravel(`/b2b/wallet/admin-transactions/${partnerId}`, { skipCache: true });
      if (res && res.status === "success" && res.transactions) {
        setHistoryTransactions(res.transactions.data || []);
      } else {
        setHistoryTransactions([]);
      }
    } catch (err) {
      console.error("Failed to load partner transactions:", err);
      setHistoryTransactions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Format currency
  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // KPIs
  const totalBalance = useMemo(() => {
    return clients.reduce((acc, c) => acc + (Number(c.wallet_balance) || 0), 0);
  }, [clients]);

  const lowBalanceCount = useMemo(() => {
    return clients.filter((c) => (Number(c.wallet_balance) || 0) <= 0).length;
  }, [clients]);

  const totalCreditLimit = useMemo(() => {
    return clients.reduce((acc, c) => acc + (Number(c.credit_limit) || 0), 0);
  }, [clients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.lab_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchesTier = tierFilter === "ALL" || c.rate_tier === tierFilter;

      let matchesBalance = true;
      const bal = Number(c.wallet_balance) || 0;
      if (balanceFilter === "HEALTHY") matchesBalance = bal > 500;
      else if (balanceFilter === "LOW") matchesBalance = bal > 0 && bal <= 500;
      else if (balanceFilter === "DEFICIT") matchesBalance = bal <= 0;

      return matchesSearch && matchesTier && matchesBalance;
    });
  }, [clients, search, tierFilter, balanceFilter]);

  // Open In-Page Horizontal Top-Up Panel
  const handleOpenTopUp = (client: B2bClient) => {
    setSelectedClient(client);
    setActivePanel("TOPUP");
    setTopUpType("CREDIT");
    setTopUpAmount("");
    setPaymentMethod("CASH");
    setReferenceId("");
    setNotes("");
    setTopUpMessage(null);
  };

  // Open In-Page Horizontal History Panel
  const handleOpenHistory = (client: B2bClient) => {
    setSelectedClient(client);
    setActivePanel("HISTORY");
    setHistoryTypeFilter("ALL");
    fetchPartnerHistory(client.id);
  };

  // Switch between TopUp and History in the horizontal panel
  const handleSwitchPanel = (panel: "TOPUP" | "HISTORY") => {
    setActivePanel(panel);
    setTopUpMessage(null);
    if (panel === "HISTORY" && selectedClient) {
      fetchPartnerHistory(selectedClient.id);
    }
  };

  // Close panel and restore full width
  const handleClosePanel = () => {
    setActivePanel("NONE");
    setSelectedClient(null);
    setTopUpMessage(null);
  };

  // Execute Top-Up / Adjustment
  const handleExecuteTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const numAmount = Number(topUpAmount);
    if (!numAmount || numAmount <= 0) {
      setTopUpMessage({ type: "error", text: "Please enter a valid amount greater than ₹0." });
      return;
    }

    setIsSubmittingTopUp(true);
    setTopUpMessage(null);

    try {
      const res = await fetchFromLaravel("/b2b/wallet/manual-adjustment", {
        method: "POST",
        body: JSON.stringify({
          b2b_user_id: selectedClient.id,
          amount: numAmount,
          type: topUpType,
          payment_method: paymentMethod,
          reference_id: referenceId.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (res && res.status === "success") {
        setTopUpMessage({
          type: "success",
          text: res.message || `₹${numAmount} successfully ${topUpType === "CREDIT" ? "credited to" : "debited from"} wallet.`,
        });

        // Optimistically update local client state
        const newBalance = res.b2b_user?.wallet_balance ?? (
          topUpType === "CREDIT"
            ? (Number(selectedClient.wallet_balance) || 0) + numAmount
            : (Number(selectedClient.wallet_balance) || 0) - numAmount
        );

        setSelectedClient((prev) => (prev ? { ...prev, wallet_balance: newBalance } : null));
        setClients((prev) =>
          prev.map((c) => (String(c.id) === String(selectedClient.id) ? { ...c, wallet_balance: newBalance } : c))
        );

        setTopUpAmount("");
        setReferenceId("");
        setNotes("");

        setTimeout(() => {
          setTopUpMessage(null);
          fetchClients();
        }, 3000);
      } else {
        setTopUpMessage({
          type: "error",
          text: res?.error || res?.message || "Failed to process manual wallet adjustment.",
        });
      }
    } catch (err: any) {
      setTopUpMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred while communicating with server.",
      });
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (historyTypeFilter === "ALL") return historyTransactions;
    return historyTransactions.filter((t) => t.type === historyTypeFilter);
  }, [historyTransactions, historyTypeFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-full overflow-hidden">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              B2B Partner Wallets
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time prepaid wallet balances, ledger history, and direct manual deposits for your diagnostic B2B partners.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchClients}
            disabled={isLoading}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh Balances</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wallet Pool */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total B2B Wallet Pool
            </span>
            {isLoading ? (
              <div className="h-8 w-28 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground font-mono">
                {formatCurrency(totalBalance)}
              </div>
            )}
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3" />
              <span>Available liquid funds across partners</span>
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Active Partners */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Registered B2B Clients
            </span>
            {isLoading ? (
              <div className="h-8 w-16 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {clients.length}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Active diagnostic partner accounts
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building className="h-5 w-5" />
          </div>
        </div>

        {/* Low / Zero Balance Alert */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Zero / Low Balances
            </span>
            {isLoading ? (
              <div className="h-8 w-12 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className={`font-display text-2xl font-bold ${lowBalanceCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {lowBalanceCount}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {lowBalanceCount > 0 ? "Clients requiring wallet recharge" : "All partner balances healthy"}
            </p>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
            lowBalanceCount > 0
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}>
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Total Credit Allowed */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Credit Allowed
            </span>
            {isLoading ? (
              <div className="h-8 w-24 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground font-mono">
                {formatCurrency(totalCreditLimit)}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Extended credit limit buffer
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search partner, lab name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Balance Status Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-primary" /> Balance:
            </span>
            <Button
              variant={balanceFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setBalanceFilter("ALL")}
              className="text-xs h-8 px-3"
            >
              All
            </Button>
            <Button
              variant={balanceFilter === "HEALTHY" ? "default" : "outline"}
              size="sm"
              onClick={() => setBalanceFilter("HEALTHY")}
              className="text-xs h-8 px-3"
            >
              Healthy (&gt;₹500)
            </Button>
            <Button
              variant={balanceFilter === "LOW" ? "default" : "outline"}
              size="sm"
              onClick={() => setBalanceFilter("LOW")}
              className="text-xs h-8 px-3"
            >
              Low (₹1–500)
            </Button>
            <Button
              variant={balanceFilter === "DEFICIT" ? "default" : "outline"}
              size="sm"
              onClick={() => setBalanceFilter("DEFICIT")}
              className="text-xs h-8 px-3"
            >
              Zero / Deficit (≤₹0)
            </Button>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1">Rate Tier:</span>
            {["ALL", "LOW", "MEDIUM", "HIGH"].map((t) => (
              <Button
                key={t}
                variant={tierFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTierFilter(t)}
                className="text-xs h-8 px-2.5"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MAIN RESPONSIVE HORIZONTAL SPLIT WORKSPACE (NO DIALOG) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: Partners Ledger Table ── */}
        <div className={`transition-all duration-300 ${activePanel !== "NONE" ? "lg:col-span-7" : "lg:col-span-12"}`}>
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  B2B Partners ({filteredClients.length})
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {activePanel !== "NONE" ? "Selecting another row switches the panel" : "Click + Add Balance or History to open side panel"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    <th className="py-3 px-3.5">Partner Details</th>
                    <th className="py-3 px-3">Tier</th>
                    <th className="py-3 px-3.5 text-right">Wallet Balance</th>
                    {activePanel === "NONE" && (
                      <>
                        <th className="py-3 px-3 text-right">Credit Limit</th>
                        <th className="py-3 px-3.5 text-right">Realized Sales</th>
                        <th className="py-3 px-2.5 text-center">Patients</th>
                      </>
                    )}
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-fade-in">
                        {/* Partner Details */}
                        <td className="py-3.5 px-3.5">
                          <div className="h-4 w-32 rounded shimmer-gradient mb-1.5" />
                          <div className="h-3 w-24 rounded shimmer-gradient" />
                        </td>
                        {/* Tier */}
                        <td className="py-3.5 px-3">
                          <div className="h-5 w-14 rounded-full shimmer-gradient" />
                        </td>
                        {/* Wallet Balance */}
                        <td className="py-3.5 px-3.5 text-right">
                          <div className="h-5 w-20 rounded shimmer-gradient ml-auto" />
                        </td>
                        {/* Optional columns when panel is closed */}
                        {activePanel === "NONE" && (
                          <>
                            <td className="py-3.5 px-3 text-right">
                              <div className="h-4 w-16 rounded shimmer-gradient ml-auto" />
                            </td>
                            <td className="py-3.5 px-3.5 text-right">
                              <div className="h-4 w-20 rounded shimmer-gradient ml-auto" />
                            </td>
                            <td className="py-3.5 px-2.5 text-center">
                              <div className="h-4 w-8 rounded shimmer-gradient mx-auto" />
                            </td>
                          </>
                        )}
                        {/* Actions */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="h-7 w-14 rounded-lg shimmer-gradient" />
                            <div className="h-7 w-16 rounded-lg shimmer-gradient" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={activePanel === "NONE" ? 7 : 4} className="py-12 text-center text-muted-foreground">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
                        <p className="font-semibold text-foreground">No B2B clients matched</p>
                        <p className="text-[11px] mt-0.5">
                          {search ? "Try adjusting your search criteria" : "No B2B clients registered yet for this laboratory"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c) => {
                      const bal = Number(c.wallet_balance) || 0;
                      const isLow = bal <= 0;
                      const isModerate = bal > 0 && bal <= 500;
                      const isRowActive = selectedClient && String(selectedClient.id) === String(c.id);

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${
                            isRowActive
                              ? "bg-primary/10 border-l-4 border-l-primary"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          {/* Partner Info */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-foreground text-xs truncate max-w-[180px]" title={c.lab_name || c.name}>
                              {c.lab_name || c.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {c.name} {c.phone ? `· ${c.phone}` : ""}
                            </div>
                          </td>

                          {/* Tier / Custom Rate List */}
                          <td className="py-3 px-3">
                            <span className={`inline-block text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full truncate max-w-[110px] ${
                              c.rate_list_name
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : c.rate_tier === "LOW"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : c.rate_tier === "MEDIUM"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            }`} title={c.rate_list_name || `Tier: ${c.rate_tier || "HIGH"}`}>
                              {c.rate_list_name ? c.rate_list_name : (c.rate_tier || "HIGH")}
                            </span>
                          </td>

                          {/* Current Balance */}
                          <td className="py-3 px-3.5 text-right">
                            <div className={`font-mono text-sm font-extrabold ${
                              isLow
                                ? "text-rose-600 dark:text-rose-400"
                                : isModerate
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {formatCurrency(bal)}
                            </div>
                          </td>

                          {activePanel === "NONE" && (
                            <>
                              <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground">
                                {formatCurrency(c.credit_limit || 0)}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono font-bold text-foreground">
                                {formatCurrency(c.total_sales || 0)}
                              </td>
                              <td className="py-3 px-2.5 text-center font-semibold text-muted-foreground">
                                {c.total_patients || 0}
                              </td>
                            </>
                          )}

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleOpenTopUp(c)}
                                className={`h-7 px-2 text-[11px] font-bold gap-1 cursor-pointer ${
                                  isRowActive && activePanel === "TOPUP"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "gradient-primary text-primary-foreground shadow-2xs hover:opacity-90"
                                }`}
                              >
                                <PlusCircle className="h-3 w-3" />
                                <span className={activePanel !== "NONE" ? "hidden sm:inline" : "inline"}>+ Add</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenHistory(c)}
                                className={`h-7 px-2 text-[11px] font-semibold gap-1 cursor-pointer ${
                                  isRowActive && activePanel === "HISTORY"
                                    ? "bg-accent text-foreground border-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="View Ledger"
                              >
                                <History className="h-3 w-3" />
                                <span className={activePanel !== "NONE" ? "hidden sm:inline" : "inline"}>History</span>
                              </Button>
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

        {/* ── RIGHT COLUMN: IN-PAGE HORIZONTAL WORKSPACE (OPENS SIDE-BY-SIDE ON THE SAME PAGE) ── */}
        {activePanel !== "NONE" && selectedClient && (
          <div className="lg:col-span-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden shadow-lg">
              {/* Panel Header */}
              <div className="p-4 border-b border-border/80 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {activePanel === "TOPUP" ? <Wallet className="h-4 w-4" /> : <History className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground truncate max-w-[200px]" title={selectedClient.lab_name || selectedClient.name}>
                      {selectedClient.lab_name || selectedClient.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Bal: <strong className="text-foreground">{formatCurrency(selectedClient.wallet_balance || 0)}</strong> · Tier: {selectedClient.rate_tier || "HIGH"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Switch between Topup and History tab */}
                  <div className="flex items-center bg-muted p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => handleSwitchPanel("TOPUP")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        activePanel === "TOPUP" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Top-up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchPanel("HISTORY")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        activePanel === "HISTORY" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Ledger
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClosePanel}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Close Side Panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 1: IN-PAGE TOP-UP FORM */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activePanel === "TOPUP" && (
                <form onSubmit={handleExecuteTopUp} className="p-4 sm:p-5 space-y-4">
                  {/* Adjustment Type Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Adjustment Action:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTopUpType("CREDIT")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          topUpType === "CREDIT"
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                            : "bg-background border-border/80 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        <span>Credit (+ Add)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTopUpType("DEBIT")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          topUpType === "DEBIT"
                            ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20"
                            : "bg-background border-border/80 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <ArrowDownLeft className="h-4 w-4 text-rose-600" />
                        <span>Debit (- Deduct)</span>
                      </button>
                    </div>
                  </div>

                  {/* Amount Input & Preset Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Amount (₹): <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10.5px] text-muted-foreground">Quick Presets:</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground font-mono">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="Enter amount (e.g. 2000)"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        required
                        className="pl-8 h-10 text-base font-bold font-mono"
                        autoFocus
                      />
                    </div>

                    {/* Preset Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {[500, 1000, 2000, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopUpAmount(String(amt))}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border/70 transition-colors cursor-pointer"
                        >
                          +₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method & Reference */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Payment Mode:
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl bg-background border border-border/80 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="CASH">Cash Deposit</option>
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                        <option value="UPI">UPI Direct</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="MANUAL_ADJUSTMENT">Admin Adjustment</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Ref / UTR / Cheque No:
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. UTR123456"
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Remarks / Notes:
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Advance deposit at lab reception"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Real-time Calculation Summary */}
                  {Number(topUpAmount) > 0 && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Balance After:</span>
                      <div className="font-mono font-bold text-foreground text-xs">
                        <span>{formatCurrency(selectedClient.wallet_balance || 0)}</span>
                        <span className="mx-1 text-primary">
                          {topUpType === "CREDIT" ? "+" : "-"} {formatCurrency(topUpAmount)}
                        </span>
                        <span>=</span>
                        <strong className="ml-1 text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(
                            topUpType === "CREDIT"
                              ? (Number(selectedClient.wallet_balance) || 0) + Number(topUpAmount)
                              : (Number(selectedClient.wallet_balance) || 0) - Number(topUpAmount)
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Feedback Toast Banner */}
                  {topUpMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        topUpMessage.type === "success"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      }`}
                    >
                      {topUpMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>{topUpMessage.text}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClosePanel}
                      disabled={isSubmittingTopUp}
                      className="text-xs h-9 px-3"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingTopUp || !Number(topUpAmount)}
                      className="text-xs h-9 px-4 font-bold gradient-primary text-primary-foreground gap-1.5 cursor-pointer shadow-sm"
                    >
                      {isSubmittingTopUp ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Confirm Deposit {Number(topUpAmount) > 0 ? formatCurrency(topUpAmount) : ""}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 2: IN-PAGE TRANSACTION HISTORY LEDGER */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activePanel === "HISTORY" && (
                <div className="p-4 sm:p-5 space-y-3 max-h-[600px] overflow-y-auto">
                  {/* Filter Pills */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">
                      Ledger Log ({filteredHistory.length})
                    </span>
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("ALL")}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          historyTypeFilter === "ALL" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("CREDIT")}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          historyTypeFilter === "CREDIT" ? "bg-emerald-500/15 text-emerald-600 shadow-2xs" : "text-muted-foreground"
                        }`}
                      >
                        Credits
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("DEBIT")}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                          historyTypeFilter === "DEBIT" ? "bg-rose-500/15 text-rose-600 shadow-2xs" : "text-muted-foreground"
                        }`}
                      >
                        Debits
                      </button>
                    </div>
                  </div>

                  {isLoadingHistory ? (
                    <div className="space-y-2.5">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-border/70 bg-card/60 shimmer-card-pulse space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg shimmer-gradient shrink-0" />
                              <div className="space-y-1">
                                <div className="h-3.5 w-24 rounded shimmer-gradient" />
                                <div className="h-2.5 w-16 rounded shimmer-gradient" />
                              </div>
                            </div>
                            <div className="h-5 w-16 rounded shimmer-gradient" />
                          </div>
                          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
                            <div className="h-2.5 w-20 rounded shimmer-gradient" />
                            <div className="h-2.5 w-24 rounded shimmer-gradient" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <AlertCircle className="h-5 w-5 text-muted-foreground/60 mx-auto mb-1.5" />
                      <p className="font-semibold text-xs text-foreground">No transactions recorded</p>
                      <p className="text-[10.5px] mt-0.5">
                        Top-ups and deductions for this partner will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredHistory.map((t) => {
                        const isCredit = t.type === "CREDIT";
                        const txnId = t.transaction_id || t.transactionId || `#${t.id}`;
                        const balAfter = t.balance_after ?? t.balanceAfter;
                        const method = t.payment_method || t.paymentMethod || "WALLET";
                        const date = t.created_at || t.createdAt;

                        return (
                          <div
                            key={t.id}
                            className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isCredit
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                }`}>
                                  {isCredit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                  <span>{t.type}</span>
                                </span>
                                <span className="font-mono text-[10.5px] text-muted-foreground">
                                  {txnId}
                                </span>
                              </div>

                              <div className={`font-mono text-xs font-extrabold ${
                                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              }`}>
                                {isCredit ? "+" : "-"}{formatCurrency(t.amount)}
                              </div>
                            </div>

                            <p className="text-[11px] text-foreground font-medium leading-tight">
                              {t.description || "Wallet Adjustment"}
                            </p>

                            <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-1 border-t border-border/50">
                              <span>{formatDate(date)} · {method}</span>
                              <span className="font-mono">Bal: {balAfter !== undefined ? formatCurrency(balAfter) : "—"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
