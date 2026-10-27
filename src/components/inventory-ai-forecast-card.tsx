"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  CalendarClock,
  RefreshCw,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface StockoutAlert {
  item_id: string;
  item_name: string;
  category: string;
  current_stock: number;
  uom: string;
  daily_burn: number;
  days_remaining: number;
  urgency: "CRITICAL_OUT_OF_STOCK" | "HIGH_STOCKOUT_RISK" | "MEDIUM_STOCKOUT_RISK";
  recommended_reorder: number;
  message: string;
}

interface ExpiryAlert {
  item_id: string;
  item_name: string;
  batch_no: string;
  quantity: number;
  uom: string;
  expiry_date: string;
  days_left?: number;
  projected_waste?: number;
  status: "EXPIRED" | "EXPIRING_SOON";
  message: string;
}

interface ForecastSummary {
  active_recipes_count: number;
  tests_tracked_count: number;
  stockout_alerts_count: number;
  expiry_risk_count: number;
  sampled_reports_count: number;
  sampling_period_days: number;
}

interface Props {
  onOpenRecipeModal?: () => void;
}

export function InventoryAiForecastCard({ onOpenRecipeModal }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [stockouts, setStockouts] = useState<StockoutAlert[]>([]);
  const [expiries, setExpiries] = useState<ExpiryAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"stockout" | "expiry">("stockout");

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFromLaravel("/inventory/ai-predictive-insights", {
        skipCache: true,
      });
      if (res && res.status === "success" && res.data) {
        setSummary(res.data.summary);
        setStockouts(res.data.stockout_alerts || []);
        setExpiries(res.data.expiry_alerts || []);
        // Auto-expand if there are critical alerts
        if (
          (res.data.stockout_alerts?.length > 0 || res.data.expiry_alerts?.length > 0) &&
          !isExpanded
        ) {
          setIsExpanded(true);
        }
      }
    } catch (e) {
      // Silently handle error, fail safe
    } finally {
      setLoading(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const totalAlerts = (stockouts.length || 0) + (expiries.length || 0);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-4 shadow-sm transition-all hover:border-primary/30">
      {/* Decorative top accent glow */}
      <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-tight text-foreground sm:text-base">
                AI Inventory & Reagent Forecast
              </h3>
              {totalAlerts > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="h-3 w-3" />
                  {totalAlerts} Actionable {totalAlerts === 1 ? "Alert" : "Alerts"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Healthy Stock
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Predictive burn-rate analysis based on real test volumes & FEFO expiry schedules.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenRecipeModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenRecipeModal}
              className="h-8 gap-1.5 text-xs font-medium border-primary/30 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              Configure Test Recipes
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={loadForecast}
            disabled={loading}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh AI Forecast"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                Hide Details <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                View Details <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 pt-3 border-t border-border/50 text-xs">
        <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2 border border-border/40">
          <Layers className="h-4 w-4 text-indigo-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Test Recipes
            </div>
            <div className="font-semibold text-foreground">
              {summary?.active_recipes_count ?? 0} mapped
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2 border border-border/40">
          <Flame className="h-4 w-4 text-orange-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Tests Analyzed
            </div>
            <div className="font-semibold text-foreground">
              {summary?.sampled_reports_count ?? 0} (30 days)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2 border border-border/40">
          <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Stockout Risks
            </div>
            <div className="font-semibold text-foreground">
              {stockouts.length} items
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2 border border-border/40">
          <CalendarClock className="h-4 w-4 text-amber-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Expiry Alerts
            </div>
            <div className="font-semibold text-foreground">
              {expiries.length} batches
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Forecast Details */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border/60">
          {/* Sub-tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setActiveTab("stockout")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "stockout"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Stockout Depletion ({stockouts.length})
            </button>

            <button
              onClick={() => setActiveTab("expiry")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "expiry"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Expiry & Waste Risk ({expiries.length})
            </button>
          </div>

          {/* Tab 1: Stockout Depletion Content */}
          {activeTab === "stockout" && (
            <div className="space-y-2">
              {stockouts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>All mapped reagents & consumables have sufficient stock for the next 14+ days.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {stockouts.map((stk) => (
                    <div
                      key={stk.item_id}
                      className="flex flex-col justify-between rounded-lg border border-border/70 bg-card p-3 shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-foreground">
                              {stk.item_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">({stk.category})</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{stk.message}</p>
                        </div>

                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            stk.urgency === "CRITICAL_OUT_OF_STOCK"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {stk.days_remaining === 0 ? "0 Days" : `~${stk.days_remaining}d Left`}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                        <span className="text-muted-foreground">
                          Burn Rate: <strong className="text-foreground">{stk.daily_burn} {stk.uom}/day</strong>
                        </span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Reorder Rec: +{stk.recommended_reorder} {stk.uom}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Expiry & Waste Prevention Content */}
          {activeTab === "expiry" && (
            <div className="space-y-2">
              {expiries.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>No active batches are expiring within the next 30 days. FEFO sequence is optimal.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {expiries.map((exp, idx) => (
                    <div
                      key={`${exp.item_id}-${exp.batch_no}-${idx}`}
                      className="flex flex-col justify-between rounded-lg border border-border/70 bg-card p-3 shadow-2xs hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-foreground">
                              {exp.item_name}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{exp.batch_no}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{exp.message}</p>
                        </div>

                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            exp.status === "EXPIRED"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {exp.status === "EXPIRED" ? "EXPIRED" : `${exp.days_left}d Left`}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                        <span className="text-muted-foreground">
                          Batch Stock: <strong className="text-foreground">{exp.quantity} {exp.uom}</strong>
                        </span>
                        {exp.projected_waste !== undefined && exp.projected_waste > 0 && (
                          <span className="font-semibold text-red-500">
                            Risk Waste: {exp.projected_waste} {exp.uom}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
