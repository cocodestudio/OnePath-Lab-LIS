"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase, Users, TrendingUp, FlaskConical, Search, RefreshCw,
  Calendar, Clock, Check, Copy, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Building, Phone, Mail, Wallet,
  ShieldCheck, ArrowRight, X, Filter, Sparkles, PlusCircle
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

interface PatientRecord {
  id: string;
  custom_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  vial_barcode?: string;
  b2b_user?: {
    id: number | string;
    name: string;
    lab_name: string;
    phone?: string;
    rate_tier: string;
    rate_list_id?: number | null;
    rate_list_name?: string | null;
  };
  tests: string[];
  tests_count: number;
  bill_amount: number;
  paid_amount: number;
  payment_status: string;
  sample_status: string;
  rejection_reason?: string;
  created_at: string;
}

export default function B2bSalesPage() {
  const [clients, setClients] = useState<B2bClient[]>([]);
  const [selectedB2bId, setSelectedB2bId] = useState<string>("");
  const [period, setPeriod] = useState<"all" | "today" | "this_month" | "custom">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);

  const [summary, setSummary] = useState({
    total_sales: 0,
    total_patients: 0,
    total_tests: 0,
  });
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15,
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch B2B clients belonging to this LIS Diagnostic Lab
  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true);
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
      setIsLoadingClients(false);
    }
  }, []);

  // Fetch sales records & summary metrics
  const fetchSales = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const params = new URLSearchParams({
        period,
        page: String(page),
        per_page: String(perPage),
      });

      if (selectedB2bId) params.append("b2b_user_id", selectedB2bId);
      if (period === "custom") {
        if (fromDate) params.append("from_date", fromDate);
        if (toDate) params.append("to_date", toDate);
      }
      if (search.trim()) params.append("search", search.trim());

      const res = await fetchFromLaravel(`/b2b/sales?${params.toString()}`, { skipCache: true });
      if (res && res.status === "success") {
        setSummary(res.summary || { total_sales: 0, total_patients: 0, total_tests: 0 });
        if (res.patients) {
          setPatients(res.patients.data || []);
          setPagination({
            current_page: res.patients.current_page || 1,
            last_page: res.patients.last_page || 1,
            total: res.patients.total || 0,
            per_page: res.patients.per_page || perPage,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch B2B sales:", err);
    } finally {
      setIsLoadingSales(false);
    }
  }, [selectedB2bId, period, fromDate, toDate, search, page, perPage]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePeriodChange = (newPeriod: "all" | "today" | "this_month" | "custom") => {
    setPeriod(newPeriod);
    setPage(1);
    if (newPeriod === "today") {
      const today = new Date().toISOString().split("T")[0];
      setFromDate(today);
      setToDate(today);
    } else if (newPeriod === "this_month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(today);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
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

  const selectedClient = clients.find((c) => String(c.id) === String(selectedB2bId));

  const totalAllSales = clients.reduce((acc, c) => acc + (Number(c.total_sales) || 0), 0);
  const totalAllTodaySales = clients.reduce((acc, c) => acc + (Number(c.today_sales) || 0), 0);
  const totalAllPatients = clients.reduce((acc, c) => acc + (Number(c.total_patients) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Briefcase className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              B2B Clients &amp; Sales
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Overview of all your registered B2B clients, assigned rate tiers, today's and monthly sales volumes, and patient investigations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/b2b/wallets">
            <Button
              size="sm"
              className="gap-2 text-xs font-bold gradient-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>B2B Wallets &amp; Top-up</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchClients();
              fetchSales();
            }}
            disabled={isLoadingSales || isLoadingClients}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSales || isLoadingClients ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total B2B Sales */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {selectedClient ? `${selectedClient.lab_name || selectedClient.name} Sales` : "Total All B2B Sales"} ({period === "all" ? "All Time" : period === "today" ? "Today" : period === "this_month" ? "This Month" : "Custom"})
            </span>
            {isLoadingSales ? (
              <div className="h-8 w-32 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {formatCurrency(summary.total_sales)}
              </div>
            )}
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3" />
              <span>{selectedClient ? `Tier: ${selectedClient.rate_tier || "HIGH"} Rate Applied` : "Assigned B2B rates realized"}</span>
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Total Patients */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {selectedClient ? "Client's Patients" : "Total Patients Intake"}
            </span>
            {isLoadingSales ? (
              <div className="h-8 w-16 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {summary.total_patients}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {selectedClient ? `Registered by ${selectedClient.lab_name || selectedClient.name}` : "Registered by B2B clients"}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Total Tests Investigated */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Clinical Tests Ordered
            </span>
            {isLoadingSales ? (
              <div className="h-8 w-16 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {summary.total_tests}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Across all diagnostic panels
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FlaskConical className="h-5 w-5" />
          </div>
        </div>

        {/* Active B2B Partners */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active B2B Partners
            </span>
            {isLoadingClients ? (
              <div className="h-8 w-14 rounded-lg shimmer-gradient mt-1 mb-0.5" />
            ) : (
              <div className="font-display text-2xl font-bold text-foreground">
                {clients.length}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Associated with your lab
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Building className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── B2B Client Selector Carousel / Strip ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-primary" />
            <span>Select B2B Partner to Inspect Sales:</span>
          </h3>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {isLoadingClients ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="min-w-[240px] max-w-[280px] p-3.5 rounded-2xl border border-border/80 bg-card shimmer-card-pulse flex flex-col justify-between shrink-0 min-h-[175px]"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-20 rounded-full shimmer-gradient" />
                    <div className="h-4 w-16 rounded-full shimmer-gradient" />
                  </div>
                  <div className="h-4 w-36 rounded shimmer-gradient mt-2.5" />
                  <div className="h-3 w-24 rounded shimmer-gradient" />
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded shimmer-gradient" />
                    <div className="h-3 w-16 rounded shimmer-gradient" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-18 rounded shimmer-gradient" />
                    <div className="h-3 w-14 rounded shimmer-gradient" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded shimmer-gradient" />
                    <div className="h-3 w-8 rounded shimmer-gradient" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {/* All Partners Card */}
              <button
                onClick={() => {
                  setSelectedB2bId("");
                  setPage(1);
                }}
                className={`min-w-[240px] max-w-[280px] text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shrink-0 ${
                  selectedB2bId === ""
                    ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-card border-border/80 hover:bg-muted/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      All Partners
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      {clients.length} Clients
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-2">
                    All B2B Combined
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Consolidated sales &amp; patients
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Total Sales:</span>
                    <span className="font-bold text-foreground font-mono">
                      {formatCurrency(totalAllSales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Today Sales:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(totalAllTodaySales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Total Patients:</span>
                    <span className="font-semibold text-foreground">{totalAllPatients}</span>
                  </div>
                </div>
              </button>

              {/* Individual B2B Client Cards */}
              {clients.map((c) => {
                const isSelected = String(c.id) === String(selectedB2bId);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedB2bId(String(c.id));
                      setPage(1);
                    }}
                    className={`min-w-[240px] max-w-[280px] text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shrink-0 ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20"
                        : "bg-card border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          c.rate_list_name
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : c.rate_tier === "LOW"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : c.rate_tier === "MEDIUM"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        }`}>
                          {c.rate_list_name ? c.rate_list_name : `Tier: ${c.rate_tier || "HIGH"}`}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                          ₹{c.today_sales || 0} today
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-foreground mt-2 truncate" title={c.lab_name || c.name}>
                        {c.lab_name || c.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.name} {c.phone ? `· ${c.phone}` : ""}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/60 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-semibold">Wallet Balance:</span>
                        <span className={`font-bold font-mono ${
                          Number(c.wallet_balance) <= 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {formatCurrency(c.wallet_balance || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-semibold">Total Sales:</span>
                        <span className="font-bold text-foreground font-mono">{formatCurrency(c.total_sales || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Month Sales:</span>
                        <span className="font-bold text-foreground font-mono">{formatCurrency(c.month_sales || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Total Patients:</span>
                        <span className="font-semibold text-foreground">{c.total_patients || 0}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Filters & Search Deck ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Period:
            </span>
            <Button
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("all")}
              className="text-xs h-8 px-3"
            >
              All Time
            </Button>
            <Button
              variant={period === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("today")}
              className="text-xs h-8 px-3"
            >
              Today
            </Button>
            <Button
              variant={period === "this_month" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("this_month")}
              className="text-xs h-8 px-3"
            >
              This Month
            </Button>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("custom")}
              className="text-xs h-8 px-3"
            >
              Custom Range
            </Button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search patient, phone, barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {period === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/60 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs w-36"
              />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                className="h-8 text-xs text-muted-foreground"
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Patient Investigations & Sales Table ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              B2B Patient Bills &amp; Investigations
            </h3>
            {selectedClient && (
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">
                {selectedClient.lab_name || selectedClient.name}
              </span>
            )}
            <span className="text-xs bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full font-mono">
              {pagination.total} Records
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing rates calculated per partner rate tier
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                <th className="py-3 px-4">Patient Demographics</th>
                <th className="py-3 px-4">Patient ID &amp; Barcode</th>
                <th className="py-3 px-4">B2B Partner &amp; Tier</th>
                <th className="py-3 px-4">Test Parameters Ordered</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4 text-right">B2B Bill Rate</th>
                <th className="py-3 px-4 text-center">Payment &amp; Sample Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoadingSales ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-fade-in">
                    {/* Patient Info */}
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-28 rounded shimmer-gradient mb-1.5" />
                      <div className="h-3 w-20 rounded shimmer-gradient" />
                    </td>
                    {/* Custom ID & Barcode */}
                    <td className="py-3.5 px-4">
                      <div className="h-6 w-24 rounded shimmer-gradient" />
                    </td>
                    {/* Partner & Tier */}
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-24 rounded shimmer-gradient mb-1.5" />
                      <div className="h-4 w-14 rounded-full shimmer-gradient" />
                    </td>
                    {/* Test Ordered */}
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-36 rounded shimmer-gradient mb-1" />
                      <div className="h-2.5 w-16 rounded shimmer-gradient" />
                    </td>
                    {/* Registration Date */}
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-24 rounded shimmer-gradient" />
                    </td>
                    {/* B2B Bill Rate */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-16 rounded shimmer-gradient ml-auto" />
                    </td>
                    {/* Payment & Sample Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="h-5 w-14 rounded-full shimmer-gradient" />
                        <div className="h-5 w-16 rounded-full shimmer-gradient" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">No B2B patient investigations found</p>
                    <p className="text-[11px] mt-0.5">
                      {search ? "Try adjusting your search criteria" : "When B2B clients register patients, they will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const isRejected = p.sample_status === "REJECTED";

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      {/* Patient Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-xs">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.gender} · {p.age}y {p.phone ? `· ${p.phone}` : ""}
                        </div>
                      </td>

                      {/* ID & Barcode */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/80">
                            {p.custom_id}
                          </span>
                          {p.vial_barcode && p.vial_barcode !== p.custom_id && (
                            <button
                              type="button"
                              onClick={() => handleCopy(p.vial_barcode!)}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded cursor-pointer"
                              title="Copy barcode"
                            >
                              {copiedCode === p.vial_barcode ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>{p.vial_barcode}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* B2B Partner */}
                      <td className="py-3 px-4">
                        {p.b2b_user ? (
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="truncate max-w-[160px]" title={p.b2b_user.lab_name || p.b2b_user.name}>
                                {p.b2b_user.lab_name || p.b2b_user.name}
                              </span>
                            </div>
                            <span className="inline-block text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground mt-0.5">
                              {p.b2b_user.rate_tier || "HIGH"} Tier
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Direct Registration</span>
                        )}
                      </td>

                      {/* Tests */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {p.tests && p.tests.length > 0 ? (
                            p.tests.slice(0, 3).map((testName, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium text-foreground truncate max-w-[140px]"
                                title={testName}
                              >
                                {testName}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic">Standard Profile</span>
                          )}
                          {p.tests && p.tests.length > 3 && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-muted/70 text-[10px] font-bold text-muted-foreground">
                              +{p.tests.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {formatDate(p.created_at)}
                      </td>

                      {/* B2B Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-foreground font-mono text-sm">
                          ₹{Number(p.bill_amount || 0).toFixed(0)}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          B2B Rate
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isRejected ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              title={p.rejection_reason || "Sample Rejected"}
                            >
                              <AlertCircle className="h-3 w-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Sample OK
                            </span>
                          )}

                          <span className={`text-[9.5px] font-bold uppercase ${
                            p.payment_status === "PAID"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {p.payment_status || "PENDING"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Deck ── */}
        {pagination.total > 0 && (
          <div className="p-3.5 px-4 bg-muted/20 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              Showing{" "}
              <strong className="text-foreground">
                {(pagination.current_page - 1) * pagination.per_page + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.total}</strong> B2B patients
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.current_page <= 1 || isLoadingSales}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <span className="text-xs font-semibold px-2">
                Page {pagination.current_page} of {pagination.last_page}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={pagination.current_page >= pagination.last_page || isLoadingSales}
                className="h-8 gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
