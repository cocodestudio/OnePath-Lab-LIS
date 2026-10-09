"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, CalendarRange } from "lucide-react";
import { getTodayStr, getYesterdayStr, getDaysAgoStr, getStartOfMonthStr } from "@/lib/date-utils";

export interface DateFilterRibbonProps {
  dateMode: "single" | "range";
  onDateModeChange: (mode: "single" | "range") => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onShiftSingleDate?: (days: number) => void;
  label?: string;
  className?: string;
}

export function DateFilterRibbon({
  dateMode,
  onDateModeChange,
  singleDate,
  onSingleDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onShiftSingleDate,
  label = "Filter Date",
  className = "",
}: DateFilterRibbonProps) {
  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  const handleRangePreset = (preset: "today" | "7days" | "30days" | "thisMonth" | "all") => {
    if (preset === "today") {
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (preset === "7days") {
      onStartDateChange(getDaysAgoStr(6));
      onEndDateChange(todayStr);
    } else if (preset === "30days") {
      onStartDateChange(getDaysAgoStr(29));
      onEndDateChange(todayStr);
    } else if (preset === "thisMonth") {
      onStartDateChange(getStartOfMonthStr());
      onEndDateChange(todayStr);
    } else if (preset === "all") {
      onStartDateChange("");
      onEndDateChange("");
    }
  };

  const isRange7Days = startDate === getDaysAgoStr(6) && endDate === todayStr;
  const isRange30Days = startDate === getDaysAgoStr(29) && endDate === todayStr;
  const isRangeThisMonth = startDate === getStartOfMonthStr() && endDate === todayStr;
  const isRangeToday = startDate === todayStr && endDate === todayStr;
  const isRangeAll = !startDate && !endDate;

  return (
    <div className={`space-y-1.5 w-full sm:w-auto ${className}`}>
      {/* Top Label & Mode Switcher Pill */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>{label}</span>
        </label>

        {/* Segmented Pill: Single Date vs Date Range */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/70 shrink-0">
          <button
            type="button"
            onClick={() => onDateModeChange("single")}
            className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              dateMode === "single"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Filter by single specific date"
          >
            <span>Single</span>
          </button>
          <button
            type="button"
            onClick={() => onDateModeChange("range")}
            className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              dateMode === "range"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Filter by custom date range (From Date to To Date)"
          >
            <CalendarRange className="h-3 w-3" />
            <span>Range</span>
          </button>
        </div>
      </div>

      {/* Date Controls Ribbon (Responsive for PC & Mobile) */}
      {dateMode === "single" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Single Date Picker with Previous / Next Arrows */}
          <div className="flex items-center bg-background border border-border/90 rounded-xl p-0.5 shadow-xs shrink-0">
            {onShiftSingleDate && (
              <button
                type="button"
                onClick={() => onShiftSingleDate(-1)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <input
              type="date"
              value={singleDate}
              onChange={(e) => onSingleDateChange(e.target.value)}
              className="h-8 px-2 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
            />

            {onShiftSingleDate && (
              <button
                type="button"
                onClick={() => onShiftSingleDate(1)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Presets for Single Date */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSingleDateChange(todayStr)}
              className={`h-9 px-2.5 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                singleDate === todayStr
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background"
              }`}
            >
              Today
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSingleDateChange(yesterdayStr)}
              className={`h-9 px-2.5 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                singleDate === yesterdayStr
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background"
              }`}
            >
              Yesterday
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSingleDateChange("")}
              className={`h-9 text-xs px-2.5 cursor-pointer font-bold transition-all rounded-xl ${
                !singleDate
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Dates
            </Button>
          </div>
        </div>
      ) : (
        /* Date Range Mode: From Date to To Date */
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-background border border-border/90 rounded-xl px-2.5 py-0.5 shadow-xs gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-8 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
            />
            <span className="text-muted-foreground/60 hidden sm:inline">→</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-8 bg-transparent text-xs text-foreground outline-none font-semibold cursor-pointer"
            />
          </div>

          {/* Range Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRangePreset("today")}
              className={`h-9 px-2.5 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                isRangeToday
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background"
              }`}
            >
              Today
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRangePreset("7days")}
              className={`h-9 px-2.5 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                isRange7Days
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background"
              }`}
            >
              Last 7D
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRangePreset("thisMonth")}
              className={`h-9 px-2.5 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                isRangeThisMonth
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background"
              }`}
            >
              This Month
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRangePreset("30days")}
              className={`h-9 px-2.5 text-xs font-bold cursor-pointer transition-all rounded-xl ${
                isRange30Days
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background"
              }`}
            >
              Last 30D
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRangePreset("all")}
              className={`h-9 text-xs px-2.5 cursor-pointer font-bold transition-all rounded-xl ${
                isRangeAll
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Dates
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
