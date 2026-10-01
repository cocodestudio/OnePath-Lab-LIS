import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, Server, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | OnePath Lab LIS",
  description: "Official Privacy Policy and Data Protection standards for OnePath Diagnostic Laboratory Information System.",
};

export default function PrivacyPolicyPage() {
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
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                OnePath Lab Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Last Updated: October 2026 · Compliant with Digital Personal Data Protection (DPDP) Act &amp; HIPAA Guidelines
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-8 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600" /> 1. Information We Process
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              OnePath Lab operates as a secure Clinical Laboratory Information System (LIS). We collect and process diagnostic test results, patient demographic identifiers (name, age, gender, mobile phone number), and doctor referral data exclusively to generate diagnostic medical reports and deliver them via official channels (including WhatsApp Business Cloud API and Email).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-600" /> 2. WhatsApp Report Delivery &amp; Data Transmission
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              When a laboratory technician or pathologist dispatches an approved diagnostic report to a patient’s WhatsApp number, the encrypted PDF file and phone number are securely transmitted through the official Meta WhatsApp Cloud API. We never sell, rent, or monetize patient contact information with any commercial third-party advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" /> 3. Data Protection &amp; Security Standards
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              All clinical records and transmissions are encrypted end-to-end using TLS 1.3 in transit and AES-256 at rest. Access to clinical records is strictly limited to authorized laboratory personnel, pathologists, and authenticated users with role-based access control (RBAC).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> 4. Patient Rights &amp; Data Deletion
            </h2>
            <p className="text-slate-600 dark:text-zinc-300">
              Patients and diagnostic centers have the right to request access to, correction of, or permanent deletion of their diagnostic history and profile data. Deletion requests can be initiated by contacting our Data Protection Officer at:
            </p>
            <div className="bg-slate-100 dark:bg-zinc-800 p-4 rounded-xl font-mono text-xs text-slate-800 dark:text-zinc-200">
              Email: support@onepathlab.com<br />
              Website: https://onepathlab.com
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-center text-xs text-slate-500 dark:text-zinc-400">
          © {new Date().getFullYear()} OnePath Diagnostics Healthcare System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
