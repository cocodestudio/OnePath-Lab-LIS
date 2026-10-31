"use client";

import React from "react";
import { MonthlyExpensesRegister } from "@/components/monthly-expenses-register";

export default function MonthlyExpensesPage() {
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 pb-12 animate-fade-in text-foreground">
      {/* ── Top Header ── */}
      <div className="border-b border-border/80 pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Monthly Business Report
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select month and year to view daily breakdown of UPI, Cash, Dues, and Grand Totals.
        </p>
      </div>

      {/* ── Main Monthly Register Engine ── */}
      <MonthlyExpensesRegister />
    </div>
  );
}
