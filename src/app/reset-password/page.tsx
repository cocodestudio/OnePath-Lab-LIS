"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight,
  ShieldCheck, Check, Mail, KeyRound, Sparkles
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
  const isMatching = Boolean(password && passwordConfirmation && password === passwordConfirmation);

  // Dynamic Password Strength Assessment
  const getPasswordStrength = (pass: string): { score: number; label: string; color: string } => {
    if (!pass) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-teal-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-600" };
  };

  const strength = getPasswordStrength(password);

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
        setError(data.message || data.error || "Failed to reset password. The link may have expired.");
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
    <div className="w-full max-w-lg mx-auto space-y-5 animate-fade-in relative z-10 py-4 sm:py-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3.5 mb-1 px-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm p-2 transition-transform duration-300 hover:scale-105 shrink-0">
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
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            OnePath Lab
          </h1>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
            Laboratory Information System
          </p>
        </div>
      </div>

      {/* Main Glass Card */}
      <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.08)] p-6 sm:p-9 md:p-10 space-y-6 relative overflow-hidden backdrop-blur-sm">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500" />

        {success ? (
          /* Success State */
          <div className="space-y-6 text-center py-6 animate-fade-in">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-60" />
              <div className="relative w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Password Updated!
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                Your credentials have been updated securely. You can now access your laboratory diagnostic terminal.
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                Redirecting to login terminal in 3 seconds...
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                <span>Go to Login Now</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Form State */
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Set New Password
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose a new security password for account:
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold max-w-full">
                <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate break-all">{email || "diagnostic-user@onepathlab.com"}</span>
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-3 text-xs sm:text-sm text-red-700 dark:text-red-300 animate-fade-in">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600 dark:text-red-400" />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            {!token && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <KeyRound className="h-4 w-4" />
                  <span>Missing or Expired Reset Link</span>
                </div>
                <p className="leading-relaxed">
                  This password reset link is invalid or has expired. For your security, reset links remain active for 60 minutes.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1 cursor-pointer"
                >
                  <span>Return to Sign In Page</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {token && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    New Security Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      placeholder="At least 8 characters"
                      className="flex h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 pl-11 pr-11 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-2 cursor-pointer rounded-lg"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>

                  {/* Real-time Strength Meter Bar */}
                  {password.length > 0 && (
                    <div className="pt-1.5 space-y-1 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Password Strength:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {strength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`rounded-full h-full transition-all duration-300 ${
                              strength.score >= step
                                ? strength.color
                                : "bg-slate-200 dark:bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      disabled={loading}
                      required
                      placeholder="Re-enter your new password"
                      className="flex h-11 sm:h-12 w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 pl-11 pr-11 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-2 cursor-pointer rounded-lg"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Validation Checklist Pills */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    {isMinLength ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1" />
                    )}
                    <span className={isMinLength ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMatching ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1" />
                    )}
                    <span className={isMatching ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}>
                      Both passwords match
                    </span>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-emerald-700/20 hover:shadow-lg active:scale-[0.99] disabled:opacity-60 cursor-pointer group mt-5 whitespace-nowrap shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password & Sign In</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="flex items-center justify-center pt-1">
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                &larr; Remember your password? Sign in
              </Link>
            </div>
          </div>
        )}

        {/* Minimal SSL Security Seal */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>256-bit SSL Encrypted · Authenticated Session</span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-gradient-to-br from-[#ffffff] via-[#fbf9f5] to-[#f4f0e6] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white selection:bg-emerald-500/20 selection:text-emerald-800 antialiased font-sans relative">
      {/* Architectural Dot Matrix Pattern */}
      <div
        className="absolute inset-0 opacity-[0.38] dark:opacity-[0.15] pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1.5px 1.5px, #94a3b8 1.2px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Lightweight GPU-Accelerated Glow Orbs */}
      <div className="absolute -top-24 -right-20 w-[550px] h-[550px] rounded-full bg-emerald-400/[0.08] dark:bg-emerald-500/[0.05] blur-[100px] pointer-events-none animate-aurora-drift z-0" />
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-teal-300/[0.07] dark:bg-teal-500/[0.04] blur-[100px] pointer-events-none animate-pulse-soft z-0" />
      <div className="absolute -bottom-28 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-300/[0.07] dark:bg-amber-500/[0.04] blur-[100px] pointer-events-none animate-float-delayed z-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-10 relative z-10">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center gap-3 p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-700 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Loading Secure Verification...</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>

      {/* Responsive Fixed Bottom Footer */}
      <footer className="shrink-0 w-full py-3.5 px-6 sm:px-10 lg:px-16 border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">OnePath LIS</span>
          <span>·</span>
          <span>Laboratory Information System</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link href="/login" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
            Sign In
          </Link>
          <a
            href="https://onepathlab.com/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors font-medium"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
