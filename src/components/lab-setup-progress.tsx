"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface SetupFieldItem {
  id: string;
  label: string;
  isFilled: boolean;
  hint: string;
}

export function evaluateLabSetupProgress(lab: any): {
  percentage: number;
  isComplete: boolean;
  fields: SetupFieldItem[];
  missingCount: number;
} {
  if (!lab) {
    return { percentage: 0, isComplete: false, fields: [], missingCount: 10 };
  }

  const isSet = (val: any) => typeof val === "string" && val.trim().length > 0;

  const fields: SetupFieldItem[] = [
    {
      id: "centreName",
      label: "Centre / Lab Name",
      isFilled: isSet(lab.centreName || lab.centre_name || lab.name),
      hint: "Your official diagnostic centre title",
    },
    {
      id: "contactPerson",
      label: "Contact Person / Director",
      isFilled: isSet(lab.contactPerson || lab.contact_person),
      hint: "Owner or in-charge pathologist name",
    },
    {
      id: "phone",
      label: "Phone / Mobile",
      isFilled: isSet(lab.phone),
      hint: "Official contact phone number",
    },
    {
      id: "email",
      label: "Email Address",
      isFilled: isSet(lab.email),
      hint: "Official laboratory email",
    },
    {
      id: "address",
      label: "Physical Address",
      isFilled: isSet(lab.address),
      hint: "Street address of your diagnostic facility",
    },
    {
      id: "city",
      label: "City",
      isFilled: isSet(lab.city),
      hint: "Operating city",
    },
    {
      id: "state",
      label: "State",
      isFilled: isSet(lab.state),
      hint: "Operating state",
    },
    {
      id: "pincode",
      label: "Pincode",
      isFilled: isSet(lab.pincode),
      hint: "Postal code",
    },
    {
      id: "licenseNumber",
      label: "License / Reg. Number",
      isFilled: isSet(lab.licenseNumber || lab.license_number),
      hint: "Clinical establishment license number",
    },
    {
      id: "logoUrl",
      label: "Official Lab Logo",
      isFilled: isSet(lab.logoUrl || lab.logo_url),
      hint: "Logo for patient test reports & letterhead",
    },
  ];

  const totalFields = fields.length; // 10
  const filledCount = fields.filter((f) => f.isFilled).length;
  const percentage = Math.round((filledCount / totalFields) * 100);
  const isComplete = percentage >= 100;
  const missingCount = totalFields - filledCount;

  return {
    percentage,
    isComplete,
    fields,
    missingCount,
  };
}

export function LabSetupProgress({
  lab,
  onRefresh,
}: {
  lab: any;
  onRefresh?: () => void;
}) {
  const { percentage, isComplete, fields, missingCount } = useMemo(() => {
    return evaluateLabSetupProgress(lab);
  }, [lab]);

  // If 100% complete, disappear completely from the UI
  if (isComplete) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] via-background to-blue-500/[0.05] p-5 sm:p-6 shadow-sm transition-all duration-300">
      {/* Background glowing flare */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative space-y-4">
        {/* Top Header: Title & Percentage Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Setup your Lab
                </h3>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Action Required
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete your Diagnostic Centre details (100%) to fully activate your lab setup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex flex-col items-end">
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
                {percentage}%
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                {missingCount} {missingCount === 1 ? "field" : "fields"} pending
              </span>
            </div>

            <Link
              href="/dashboard/account/lab?tab=centre"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all duration-200 cursor-pointer shrink-0"
            >
              <span>Complete Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Lab Profile Setup Progress</span>
            <span className="font-mono text-foreground font-bold">
              {fields.filter((f) => f.isFilled).length} of {fields.length} completed
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/70 overflow-hidden p-0.5 border border-border/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 shadow-sm transition-all duration-700 ease-out"
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>
        </div>

        {/* Warning Callout Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold leading-tight">
              Lab Details Incomplete ({percentage}%)
            </p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Kripya apne Lab Account ke <strong>Centre Details</strong> me jakar bachi hui jankari (Address, City, State, Pincode, License No, aur Official Logo) ko 100% complete karein. GST Number optional hai.
            </p>
          </div>
        </div>

        {/* Interactive Checklist Pills */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-2">
            <span>Centre Details Checklist:</span>
            <span className="text-[10px] text-muted-foreground/80 font-normal">
              GSTIN is optional
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  field.isFilled
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted/40 border-border/80 text-muted-foreground hover:border-amber-500/40"
                }`}
                title={field.isFilled ? `${field.label}: Completed` : `${field.label}: Pending`}
              >
                {field.isFilled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-amber-500/70 shrink-0 ml-0.5" />
                )}
                <span className="truncate">{field.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
