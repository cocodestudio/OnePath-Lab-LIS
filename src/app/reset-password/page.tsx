"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Check, X
} from "lucide-react";
import { getAuthBaseUrl } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isMinLength = password.length >= 8;
  const isMatching = password && passwordConfirmation && password === passwordConfirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      setError("Invalid password reset link. Missing token or email. Please request a new link.");
      return;
    }

    if (!isMinLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!isMatching) {
      setError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${getAuthBaseUrl()}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Failed to reset password. The link may have expired.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[540px] xl:max-w-[560px] mx-auto space-y-6 animate-fade-in relative z-10 py-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3.5 mb-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-sm p-2 transition-transform duration-300 hover:scale-105">
          <Image
            src="/onepath-logo.png"
            alt="OnePath Lab Logo"
            width={40}
            height={40}
            priority
            className="object-contain"
          />
        </div>
        <div className="leading-tight">
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">OnePath Lab</h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 font-bold mt-0.5">
            Laboratory Information System
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.08)] p-8 sm:p-10 xl:p-12 space-y-6 relative overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500" />

        {success ? (
          /* Success State */
          <div className="space-y-6 text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Password Updated!
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your password has been changed successfully. You can now sign in to your diagnostic terminal.
              </p>
              <p className="text-xs text-emerald-700 font-medium pt-1">
                Redirecting to login in 3 seconds...
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="w-full h-12 sm:h-[50px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span>Go to Login Now</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Form State */
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Set New Password
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Choose a new security password for account{" "}
                <span className="font-semibold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                  {email || "your account"}
                </span>
                .
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm text-red-700 animate-fade-in">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            {!token && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                <p className="font-bold">Missing Reset Token</p>
                <p>This password reset link is invalid or incomplete. Please request a new link from the login page.</p>
                <Link
                  href="/login"
                  className="inline-block font-bold text-emerald-700 hover:underline pt-1"
                >
                  &larr; Back to Login Page
                </Link>
              </div>
            )}

            {token && (
              <form onSubmit={handleSubmit} className="space-y-5 pt-1">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-xs sm:text-sm font-bold text-slate-800">
                    New Security Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-emerald-700 transition-colors pointer-events-none" />
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      placeholder="At least 8 characters"
                      className="flex h-12 sm:h-[50px] w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-11 pr-12 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-3 focus:ring-emerald-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1.5 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs sm:text-sm font-bold text-slate-800">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-emerald-700 transition-colors pointer-events-none" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      disabled={loading}
                      required
                      placeholder="Re-enter your new password"
                      className="flex h-12 sm:h-[50px] w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-11 pr-12 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-3 focus:ring-emerald-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1.5 cursor-pointer"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Validation Hints */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    {isMinLength ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1" />
                    )}
                    <span className={isMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMatching ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1" />
                    )}
                    <span className={isMatching ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      Both passwords match
                    </span>
                  </div>
                </div>

                {/* Submit Button (Comfortable Height, Proper Elevation) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-[52px] rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-300 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer group mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password & Sign In</span>
                      <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="flex items-center justify-center pt-2">
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                &larr; Remember your password? Sign in
              </Link>
            </div>
          </div>
        )}

        {/* Minimal SSL Security Seal */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 pt-2 border-t border-slate-100">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>256-bit SSL Encrypted · Authenticated Session</span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-gradient-to-br from-[#ffffff] via-[#fbf9f5] to-[#f4f0e6] text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-800 antialiased font-sans relative">
      {/* Architectural Dot Matrix Across Entire Screen */}
      <div
        className="absolute inset-0 opacity-[0.38] pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1.5px 1.5px, #94a3b8 1.2px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Lightweight GPU-Accelerated Aurora Glow Orbs */}
      <div className="absolute -top-24 -right-20 w-[550px] h-[550px] rounded-full bg-emerald-400/[0.08] blur-[100px] pointer-events-none animate-aurora-drift z-0" />
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-teal-300/[0.07] blur-[100px] pointer-events-none animate-pulse-soft z-0" />
      <div className="absolute -bottom-28 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-300/[0.07] blur-[100px] pointer-events-none animate-float-delayed z-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center gap-3 p-12 bg-white rounded-3xl border border-slate-200 shadow-lg">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
              <p className="text-xs font-semibold text-slate-600">Loading Secure Verification...</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>

      {/* Fixed Bottom Footer */}
      <footer className="shrink-0 w-full py-3.5 px-6 sm:px-10 lg:px-16 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">OnePath LIS</span>
          <span className="text-slate-300">·</span>
          <span>Laboratory Information System</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] sm:text-xs font-medium text-slate-500">
          <Link href="/login" className="hover:text-emerald-700 transition-colors">Sign In</Link>
          <a
            href="https://onepathlab.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 transition-colors font-medium"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
