"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function evaluateLabSetupProgress(lab: any): {
  percentage: number;
  isComplete: boolean;
} {
  if (!lab) {
    return { percentage: 0, isComplete: false };
  }

  const isSet = (val: any) => typeof val === "string" && val.trim().length > 0;

  // Core required fields (Reg No, Logo, and GSTIN are optional as requested)
  const requiredFields = [
    isSet(lab.centreName || lab.centre_name || lab.name),
    isSet(lab.contactPerson || lab.contact_person),
    isSet(lab.phone),
    isSet(lab.email),
    isSet(lab.address),
    isSet(lab.city),
    isSet(lab.state),
    isSet(lab.pincode),
  ];

  const total = requiredFields.length; // 8 fields
  const filled = requiredFields.filter(Boolean).length;
  const percentage = Math.round((filled / total) * 100);
  const isComplete = percentage >= 100;

  return { percentage, isComplete };
}

export function LabSetupProgress({
  lab,
}: {
  lab: any;
  onRefresh?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { percentage, isComplete } = useMemo(() => {
    if (!lab) {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("lis_cached_lab");
          if (cached) {
            return evaluateLabSetupProgress(JSON.parse(cached));
          }
        } catch {}
      }
      return { percentage: 100, isComplete: true }; // Default to hidden while loading to avoid glitch
    }
    const result = evaluateLabSetupProgress(lab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("lis_lab_setup_complete", String(result.isComplete));
        localStorage.setItem("lis_cached_lab", JSON.stringify(lab));
      } catch {}
    }
    return result;
  }, [lab]);

  // If not mounted on client yet, or 100% complete, hide completely from UI
  if (!mounted || isComplete) {
    return null;
  }

  // SVG circle math: radius = 17, circumference ≈ 106.8
  const circumference = 106.8;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <Link
      href="/dashboard/account/lab?tab=centre"
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-accent/30 transition-all duration-200 shadow-xs"
    >
      {/* Left side: Setup Complete label & progress bar */}
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Setup Complete
            </h4>
            <span className="text-xs text-muted-foreground">
              • Complete your centre profile ({percentage}% completed)
            </span>
          </div>
          <span className="text-xs font-bold text-primary sm:hidden">
            {percentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.max(4, percentage)}%` }}
          />
        </div>
      </div>

      {/* Right side: Circular progress ring & Arrow */}
      <div className="hidden sm:flex items-center gap-3 shrink-0 pl-3 border-l border-border/60">
        <div className="relative flex items-center justify-center h-11 w-11 shrink-0">
          <svg className="h-11 w-11 -rotate-90 transform" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r="17"
              className="stroke-muted/80"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="22"
              cy="22"
              r="17"
              className="stroke-primary transition-all duration-500"
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-foreground">
            {percentage}%
          </span>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
