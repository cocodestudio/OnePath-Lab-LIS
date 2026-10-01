import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service | OnePath Lab LIS",
  description: "Terms and conditions of service for OnePath Diagnostic Laboratory Information System.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 sm:p-10 border-b border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                OnePath Lab Terms of Service
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Last Updated: October 2026 · Clinical Software Governance
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              By accessing or using the OnePath Laboratory Information System (LIS) and associated diagnostic dispatch services, diagnostic centers and users agree to comply with these terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 2. Diagnostic Accuracy &amp; Authorization
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              All clinical results, reference ranges, and diagnostic interpretations entered into the system are the responsibility of the registered laboratory and its licensed pathologists.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 3. WhatsApp Messaging Compliance
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              Automated notifications sent through Meta WhatsApp Cloud API are intended solely for medical test delivery to consented patients. Diagnostic centers agree not to broadcast unsolicited spam.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-center text-xs text-slate-500 dark:text-zinc-400">
          © {new Date().getFullYear()} OnePath Diagnostics Healthcare System.
        </div>
      </div>
    </div>
  );
}
