"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Gift, Copy, Check, Sparkles, Clock, CheckCircle2,
  Calendar, ShieldAlert, ArrowRight, RefreshCw,
  Users, Award, X
} from "lucide-react";
import { getStoredUser, fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

interface ReferralStats {
  total_referred: number;
  pending_count: number;
  completed_count: number;
  total_validity_earned_days: number;
  available_vouchers_count: number;
}

interface VoucherItem {
  id: string;
  code: string;
  validity_days: number;
  validity_months: number;
  status: "available" | "redeemed";
  unlocked_from: string;
  redeemed_at: string | null;
  created_at: string | null;
}

interface ReferralHistoryItem {
  id: string;
  lab_name: string;
  status: "pending" | "completed" | "cancelled";
  registered_at: string | null;
  plan_purchased_at: string | null;
  reward_unlocked: boolean;
  reward_description: string;
}

interface ReferralDashboardData {
  referral_code: string;
  referral_url: string;
  stats: ReferralStats;
  lab_plan: {
    plan_name: string;
    plan_status: string;
    plan_expires_at: string | null;
    expires_formatted: string;
  };
  vouchers: VoucherItem[];
  history: ReferralHistoryItem[];
}

function ReferShimmerSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* 1. Header Banner Shimmer */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl flex-1">
            <div className="h-6 w-52 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-9 w-4/5 rounded-lg bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
              <div className="h-4 w-11/12 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
            </div>
            <div className="h-7 w-64 rounded-lg bg-slate-200 dark:bg-zinc-800 animate-pulse pt-1" />
          </div>
          <div className="shrink-0 w-full md:w-52 h-28 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 p-4 flex flex-col items-center justify-center space-y-2 animate-pulse">
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-zinc-700" />
            <div className="h-8 w-24 rounded bg-slate-200 dark:bg-zinc-700" />
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-zinc-700" />
          </div>
        </div>
      </div>

      {/* 2. Credentials & Stats Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-5">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3.5 w-72 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="h-24 w-full rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-between animate-pulse">
            <div className="space-y-2">
              <div className="h-3 w-36 rounded bg-slate-200 dark:bg-zinc-800" />
              <div className="h-9 w-40 rounded bg-slate-200 dark:bg-zinc-800" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-zinc-800" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-60 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 animate-pulse" />
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between h-[126px] animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-zinc-800" />
              </div>
              <div>
                <div className="h-8 w-16 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="h-3 w-28 rounded bg-slate-200/80 dark:bg-zinc-800/80 mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 3-Step Process Shimmer */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-6">
        <div className="space-y-1.5">
          <div className="h-6 w-56 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3.5 w-80 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3 animate-pulse"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800" />
              <div className="h-4 w-36 rounded bg-slate-200 dark:bg-zinc-800" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-slate-200/80 dark:bg-zinc-800/80" />
                <div className="h-3 w-4/5 rounded bg-slate-200/80 dark:bg-zinc-800/80" />
              </div>
              <div className="h-3 w-24 rounded bg-slate-200/60 dark:bg-zinc-800/60 pt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Vouchers Shimmer */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="space-y-1.5">
            <div className="h-6 w-60 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3.5 w-96 rounded bg-slate-200/80 dark:bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800" />
                  <div className="space-y-1">
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-zinc-800" />
                    <div className="h-2.5 w-16 rounded bg-slate-200/80 dark:bg-zinc-800/80" />
                  </div>
                </div>
                <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-zinc-800" />
              </div>
              <div className="h-10 w-full rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-800">
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="h-8 w-28 rounded-lg bg-slate-200 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReferAndEarnPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralDashboardData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [redeemingVoucherId, setRedeemingVoucherId] = useState<string | null>(null);
  const [confirmVoucher, setConfirmVoucher] = useState<VoucherItem | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Load referral dashboard info
  const loadReferralInfo = async () => {
    try {
      setLoading(true);
      const res = await fetchFromLaravel("/referrals/info", { skipCache: true });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load referral data:", err);
      error("Error Loading Referrals", err.message || "Failed to load referral dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Strictly visible ONLY to Admin role; block B2B and Collection Center
    if (user.role === "B2B" || user.role === "COLLECTION_CENTER") {
      setIsUnauthorized(true);
      setLoading(false);
      return;
    }

    loadReferralInfo();
  }, [router]);

  const handleCopyCode = () => {
    if (!data?.referral_code) return;
    navigator.clipboard.writeText(data.referral_code);
    setCopiedCode(true);
    success("Referral Code Copied!", `Code ${data.referral_code} copied to your clipboard.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!data?.referral_url) return;
    navigator.clipboard.writeText(data.referral_url);
    setCopiedLink(true);
    success("Referral Link Copied!", "Registration link copied with your pre-filled referral code.");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRedeemVoucher = async (voucher: VoucherItem) => {
    if (redeemingVoucherId || voucher.status !== "available") return;

    try {
      setRedeemingVoucherId(voucher.id);
      const res = await fetchFromLaravel("/referrals/redeem-voucher", {
        method: "POST",
        body: JSON.stringify({ voucher_id: voucher.id }),
      });

      if (res?.status === "success") {
        success(
          "Plan Validity Extended!",
          `Voucher ${voucher.code} redeemed! Your plan validity has been extended by strictly 3 Months until ${res.data?.expires_formatted}.`
        );
        setConfirmVoucher(null);
        await loadReferralInfo();
      } else {
        throw new Error(res?.message || "Failed to redeem voucher.");
      }
    } catch (err: any) {
      console.error("Redemption error:", err);
      error("Redemption Failed", err.message || "Unable to redeem voucher. Please contact support.");
    } finally {
      setRedeemingVoucherId(null);
    }
  };

  if (isUnauthorized) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center mt-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          The Refer &amp; Earn program is exclusively available to Laboratory Administrators.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return <ReferShimmerSkeleton />;
  }

  return (
    <div className="w-full space-y-6">
      {/* =========================================================================
          1. CLEAN PROFESSIONAL HERO BANNER (HIGH CONTRAST & CLEAR READABILITY)
      ========================================================================= */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Gift className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Referral Program &bull; Unlimited Plan Extensions</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Invite Pathology Labs &amp; Earn{" "}
              <span className="text-blue-600 dark:text-blue-400">3 Months Free Validity</span>
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Share your referral code or registration link with fellow diagnostic laboratory owners.
              When they sign up and purchase any subscription plan, you automatically receive a{" "}
              <strong className="text-slate-900 dark:text-white font-semibold">+90 Days (3 Months) Free Plan Extension Voucher</strong>.
              You can refer unlimited labs and stack your free validity anytime.
            </p>

            {data?.lab_plan?.expires_formatted && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Current Plan:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {data.lab_plan.plan_name || "Active License"}
                  </strong>{" "}
                  &bull; Expires:{" "}
                  <strong className="text-blue-700 dark:text-blue-300 font-semibold">
                    {data.lab_plan.expires_formatted}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Clean Reward Callout Box */}
          <div className="shrink-0 p-5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-center md:min-w-[210px]">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Reward Per Referral
            </span>
            <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">
              +90 Days
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 block mt-1 font-medium">
              3 Months Free Validity
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SHAREABLE REFERRAL CREDENTIALS (NO QUICK SHARE - CLEAN & FAST)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Referral Code & Link */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Your Referral Credentials</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Share your 6-character code or direct registration link with diagnostic laboratories.
            </p>
          </div>

          {/* 6-Digit Code Box */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your 6-Character Referral Code
              </span>
              <div className="mt-1 flex items-center justify-center sm:justify-start gap-3">
                <span className="text-3xl sm:text-4xl font-mono font-black tracking-wider text-blue-700 dark:text-blue-400">
                  {loading ? "••••••" : data?.referral_code || "OPXXXX"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase">
                  Active
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              disabled={loading || !data?.referral_code}
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? "Copied Code!" : "Copy Code"}</span>
            </button>
          </div>

          {/* Full Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Direct Referral Link (Autofills your code on registration page)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={data?.referral_url || ""}
                placeholder="https://onepathlab.com/trial?ref=..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-800 dark:text-zinc-200 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={loading || !data?.referral_url}
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Key Stat Metrics Cards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Referrals</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {loading ? "-" : data?.stats?.total_referred || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Labs joined with your code</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Paid Conversions</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {loading ? "-" : data?.stats?.completed_count || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Subscribed labs (+90 days each)</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Validity Earned</span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {loading ? "-" : `+${data?.stats?.total_validity_earned_days || 0}d`}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {Math.round((data?.stats?.total_validity_earned_days || 0) / 30)} Months total free
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/60 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
              <span className="text-xs font-semibold">Available Vouchers</span>
              <Gift className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-300">
                {loading ? "-" : data?.stats?.available_vouchers_count || 0}
              </div>
              <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">Ready to redeem</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. 3-STEP PROCESS TIMELINE (CLEAN, PROFESSIONAL & NON-LAGGY)
      ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            How The Referral Process Works
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Simple 3-step lifecycle for earning free validity extensions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Share Your Link or Code</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Send your unique 6-character referral code or registration link to any pathology lab director.
            </p>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 pt-1">
              <span>Auto-filled on website</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">They Register in LIS</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              They sign up on onepathlab.com/trial and receive a 7-Day Free Trial. Their lab appears as{" "}
              <strong className="text-amber-600 dark:text-amber-400">Pending</strong> in your tracking list.
            </p>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 pt-1">
              <span>Trial period active</span>
              <Clock className="w-3 h-3" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Buy Plan &rarr; Voucher Unlocked</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              As soon as they purchase any paid plan, a{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">+90 Days (3 Months) Free Voucher</strong> is
              immediately credited to your account.
            </p>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1">
              <span>Unlimited vouchers stack</span>
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. "MY VOUCHERS" COLLECTION & REDEEM
      ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              <span>My Validity Extension Vouchers</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click &lsquo;Redeem Voucher&rsquo; on any available voucher to immediately extend your lab&rsquo;s subscription by +90 days.
            </p>
          </div>

          <button
            type="button"
            onClick={loadReferralInfo}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors self-start sm:self-auto cursor-pointer"
            title="Refresh vouchers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!data?.vouchers || data.vouchers.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-zinc-950 border border-dashed border-slate-200 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-1">No Vouchers Earned Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Once a referred laboratory registers with your code and activates a subscription plan, your 3-month free
              extension voucher will appear here ready to redeem!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.vouchers.map((voucher) => {
              const isAvailable = voucher.status === "available";
              const isRedeeming = redeemingVoucherId === voucher.id;

              return (
                <div
                  key={voucher.id}
                  className={`rounded-2xl p-5 border transition-colors ${
                    isAvailable
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs"
                      : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isAvailable
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 dark:bg-zinc-800 text-slate-500"
                        }`}
                      >
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">
                          {voucher.code}
                        </span>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                          From: {voucher.unlocked_from}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {isAvailable ? "Ready to Redeem" : "Redeemed"}
                    </span>
                  </div>

                  <div className="my-3 py-2 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] text-slate-500">Validity Reward:</span>
                      <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
                        +3 Months Free ({voucher.validity_days} Days)
                      </div>
                    </div>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500">
                      {isAvailable
                        ? "Can be applied anytime"
                        : `Redeemed on ${new Date(voucher.redeemed_at || "").toLocaleDateString()}`}
                    </span>

                    {isAvailable && (
                      <button
                        type="button"
                        onClick={() => setConfirmVoucher(voucher)}
                        disabled={Boolean(redeemingVoucherId)}
                        className="h-8 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>Redeem Voucher</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          5. REFERRED LABORATORIES TRACKING TABLE
      ========================================================================= */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Referred Laboratories Tracking</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track laboratories that joined using your referral credentials and their current subscription status.
          </p>
        </div>

        {!data?.history || data.history.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No laboratories have registered with your code yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Share your referral code or link above to start earning vouchers!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Laboratory Name</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Reward Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {data.history.map((item) => {
                  const isCompleted = item.status === "completed";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-zinc-950/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                        {item.lab_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {item.registered_at ? new Date(item.registered_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Plan Purchased</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Plan Purchase</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCompleted ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>3-Month Voucher Unlocked!</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unlocks after subscription purchase</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          6. VOUCHER REDEMPTION CONFIRMATION MODAL
      ========================================================================= */}
      {confirmVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-voucher-title"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="confirm-voucher-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                    Confirm Voucher Redemption
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extend your laboratory subscription validity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !redeemingVoucherId && setConfirmVoucher(null)}
                disabled={Boolean(redeemingVoucherId)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-900 dark:text-amber-300 font-medium">Voucher Code</span>
                <span className="font-mono font-bold text-sm text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-800">
                  {confirmVoucher.code}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/60 dark:border-amber-900/40">
                <span className="text-amber-900 dark:text-amber-300">Free Validity Reward</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  +3 Months (+90 Days) Free Extension
                </span>
              </div>

              {data?.lab_plan?.expires_formatted && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-amber-900 dark:text-amber-300">Current Plan Expiry</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    {data.lab_plan.expires_formatted}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to apply this voucher? Your active subscription plan will be extended by <strong>strictly 3 months</strong>. Once redeemed, this voucher cannot be used again.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmVoucher(null)}
                disabled={Boolean(redeemingVoucherId)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRedeemVoucher(confirmVoucher)}
                disabled={Boolean(redeemingVoucherId)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {redeemingVoucherId === confirmVoucher.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying Voucher...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Extend Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
