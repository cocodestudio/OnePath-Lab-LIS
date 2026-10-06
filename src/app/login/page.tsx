"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Lock, Mail, Loader2, FlaskConical, ShieldCheck,
  Eye, EyeOff, ArrowRight, Microscope, Activity, Building2,
  Sparkles, CheckCircle2, X, Briefcase
} from "lucide-react";
import { getAuthBaseUrl } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"ADMIN" | "COLLECTION_CENTER" | "B2B">("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Check if redirected due to admin suspension and trap back button
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("suspended") === "true") {
        setError("Your account has been suspended. Please contact support@onepathlab.com.");
      }
      try {
        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => {
          window.history.pushState(null, "", window.location.href);
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
      } catch {}
    }
  }, []);

  // Forgot password flow states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleOpenForgotModal = () => {
    setForgotEmail(email.trim());
    setForgotError(null);
    setForgotSuccess(false);
    setShowForgotModal(true);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    setForgotError(null);
    setForgotLoading(true);

    try {
      const res = await fetch(`${getAuthBaseUrl()}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotError(data.message || "Failed to send reset link. Please verify your email.");
        setForgotLoading(false);
        return;
      }

      setForgotSuccess(true);
      setForgotLoading(false);
    } catch (err: any) {
      setForgotError("Network error. Please check your connection and try again.");
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const loginURL = `${getAuthBaseUrl()}/login`;

      const res = await fetch(loginURL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, login_type: loginType }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (
          res.status === 403 &&
          (data.is_suspended || (data.message || "").toLowerCase().includes("suspended"))
        ) {
          setError("Your account has been suspended. Please contact support@onepathlab.com.");
        } else {
          setError(data.message || data.error || "Invalid credentials. Please verify your email and password.");
        }
        setLoading(false);
        return;
      }

      const token = data.access_token || data.token;
      const user = data.user;

      localStorage.setItem("lis_token", token);
      localStorage.setItem("lis_user", JSON.stringify(user || {}));
      localStorage.removeItem("lis_cached_reports");
      localStorage.removeItem("lis_cached_patients");
      localStorage.removeItem("lis_cached_bills");
      localStorage.removeItem("lis_cached_today_samples");
      sessionStorage.removeItem("lis_subscription_locked");
      const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `lis_token=${token}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
      document.cookie = `lis_role=${encodeURIComponent(user?.role || "")}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;

      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Login request failed:", err);
      setError(err?.message || "An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen w-full flex flex-col justify-between overflow-y-auto md:overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/40 text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-800 antialiased font-sans relative">
      {/* ── Main Horizontal Workstation Area (Full Edge-to-Edge) ───────────────────────── */}
      <div className="flex-1 w-full flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden relative z-10">
        {/* ── Left Side: Pure Clinical Showcase (Expansive & Refined) ──────────────────── */}
        <div className="w-full md:w-1/2 xl:w-[50%] relative flex flex-col justify-between px-6 sm:px-12 md:px-14 lg:px-16 xl:px-20 py-8 lg:py-10 border-b md:border-b-0 md:border-r border-slate-200/60">
          {/* Top Brand Identity: Official Logo + Clear Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs p-1.5 transition-transform duration-300 hover:scale-105">
              <Image
                src="/onepath-logo.png"
                alt="OnePath Lab Logo"
                width={38}
                height={38}
                priority
                className="object-contain"
              />
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">OnePath Lab</h1>
              <p className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.2em] text-emerald-700 font-bold mt-0.5">
                Laboratory Information System
              </p>
            </div>
          </div>

          {/* Center Hero Narrative & Diagnostic Showcase */}
          <div className="space-y-6 my-auto py-6 max-w-xl xl:max-w-2xl">
            {/* Subtle Clinical Feature Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Next-Gen Pathology Automation & Interfacing</span>
            </div>

            {/* Editorial Headline & Description */}
            <div className="space-y-2.5">
              <h2 className="font-display text-3xl sm:text-4xl xl:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight">
                Precision Diagnostics,<br />
                <span className="italic font-serif text-emerald-700">Seamlessly</span> Connected.
              </h2>
              <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed font-normal">
                A modern diagnostic platform engineered for clinical laboratories. Real-time bi-directional analyzer interfacing, automated specimen tracking, delta checks, and instant digital QR reporting.
              </p>
            </div>

            {/* Diagnostic Telemetry Feature Cards */}
            <div className="grid grid-cols-1 gap-3 pt-1">
              {/* Card 1: Machine Interfacing */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-500/40 hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 text-emerald-700">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Direct Analyzer Interfacing</p>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      ASTM / HL7
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Bi-directional ingest for Mindray, Sysmex, Roche & Beckman
                  </p>
                </div>
              </div>

              {/* Card 2: Instant QR Reporting */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-500/40 hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0 text-amber-700">
                  <Microscope className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Validated Smart Reporting</p>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      Instant QR
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Automated abnormal flagging, age/gender ranges & tamper-proof QR
                  </p>
                </div>
              </div>

              {/* Card 3: Cryptographic Data Security */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-500/40 hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center shrink-0 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Clinical Data Security</p>
                    <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md">
                      Cloud Secured
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Multi-tenant cloud architecture with 256-bit data encryption
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Side: LIMS Login (Simple, Ultra-Professional & Responsive) ───────────── */}
        <div className="w-full md:w-1/2 xl:w-[50%] flex flex-col justify-center items-center px-4 sm:px-8 md:px-10 lg:px-12 xl:px-16 py-8 lg:py-10">
          <div className="w-full max-w-[420px] sm:max-w-[450px] bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 md:p-9 space-y-6 animate-fade-in">
            {/* Mobile Header with Logo (< md screens only) */}
            <div className="flex md:hidden items-center gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1.5">
                <Image
                  src="/onepath-logo.png"
                  alt="OnePath Lab Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="font-display text-lg font-bold text-slate-900 tracking-tight">OnePath Lab</span>
                <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">
                  LIS Portal
                </p>
              </div>
            </div>

            {/* Title Section */}
            <div className="space-y-1">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                LIMS Login
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 leading-normal">
                {loginType === "ADMIN"
                  ? "Enter your credentials to access your diagnostic terminal."
                  : loginType === "B2B"
                  ? "Enter your credentials to access B2B partner services."
                  : "Enter branch credentials for sample accessioning."}
              </p>
            </div>

            {/* Terminal / Center Switcher Pill Tabs */}
            <div className="p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => { setLoginType("ADMIN"); setError(null); }}
                className={`h-9 sm:h-10 py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginType === "ADMIN"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <FlaskConical className={`h-3.5 w-3.5 shrink-0 transition-colors ${loginType === "ADMIN" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="truncate">Admin / Staff</span>
              </button>
              <button
                type="button"
                onClick={() => { setLoginType("COLLECTION_CENTER"); setError(null); }}
                className={`h-9 sm:h-10 py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginType === "COLLECTION_CENTER"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <Building2 className={`h-3.5 w-3.5 shrink-0 transition-colors ${loginType === "COLLECTION_CENTER" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="truncate">Collection</span>
              </button>
              <button
                type="button"
                onClick={() => { setLoginType("B2B"); setError(null); }}
                className={`h-9 sm:h-10 py-1.5 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginType === "B2B"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <Briefcase className={`h-3.5 w-3.5 shrink-0 transition-colors ${loginType === "B2B" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="truncate">B2B</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className={`flex items-start gap-3 rounded-2xl p-3.5 text-xs animate-in fade-in slide-in-from-top-1 ${
                error.toLowerCase().includes("suspended")
                  ? "bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-xs"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                {error.toLowerCase().includes("suspended") ? (
                  <div className="w-7 h-7 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Lock className="h-4 w-4" />
                  </div>
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold leading-tight">{error}</p>
                  {error.toLowerCase().includes("suspended") && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      Contact support:{" "}
                      <a
                        href="mailto:support@onepathlab.com?subject=Account%20Suspension%20Inquiry"
                        className="font-bold underline hover:text-rose-950 inline-flex items-center gap-1"
                      >
                        <span>support@onepathlab.com</span>
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Login Form with Premium Sizing, Crisp Inputs, and Focus Rings */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-0.5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 tracking-wide">
                  {loginType === "ADMIN" ? "Email Address or Username" : loginType === "B2B" ? "B2B Partner Email" : "Collection Center Email"}
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none flex items-center justify-center">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                    placeholder={loginType === "ADMIN" ? "pathologist@onepathlab.com" : loginType === "B2B" ? "partner@b2blab.com" : "center@onepathlab.com"}
                    className="w-full h-11 sm:h-12 rounded-xl border border-slate-300/90 bg-white hover:border-slate-400/90 focus:bg-white pl-11 pr-4 text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 tracking-wide">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none flex items-center justify-center">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full h-11 sm:h-12 rounded-xl border border-slate-300/90 bg-white hover:border-slate-400/90 focus:bg-white pl-11 pr-11 text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {/* Forgot Password Link - Directly Below Password Field */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500/20 accent-emerald-700 cursor-pointer"
                  />
                  <span>Remember this device for 30 days</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.005] active:scale-[0.99] disabled:opacity-60 cursor-pointer group mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Minimal SSL Security Seal */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>256-bit SSL Encrypted Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Single Unified Fixed Bottom Footer Bar ────────────────────────────────────────── */}
      <footer className="shrink-0 w-full py-3 px-6 sm:px-10 lg:px-16 border-t border-slate-200/70 bg-white/60 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">OnePath LIS</span>
          <span className="text-slate-300">·</span>
          <span>Laboratory Information System</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] sm:text-xs font-medium text-slate-500">
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

      {/* Interactive Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-[94vw] max-w-[500px] rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-10 shadow-2xl relative overflow-hidden space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500" />

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {forgotSuccess ? (
              /* Success State */
              <div className="space-y-6 text-center py-4 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2.5">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Link Sent!</h3>
                  <p className="text-sm text-slate-600 leading-relaxed px-1">
                    We have dispatched a secure password reset link to:
                  </p>
                  <p className="text-sm font-bold text-emerald-800 bg-emerald-50/90 py-2 px-4 rounded-xl inline-block border border-emerald-200 font-mono">
                    {forgotEmail}
                  </p>
                  <p className="text-xs text-slate-500 pt-2 leading-relaxed">
                    Please check your email inbox (and spam folder). The link will expire in <strong>60 minutes</strong>.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide transition-all shadow-md cursor-pointer"
                  >
                    Done & Return to Login
                  </button>
                </div>
              </div>
            ) : (
              /* Form State */
              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Forgot Password?</h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Enter your email to receive a secure reset link.
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Enter the email address registered with your laboratory. We will send you an authenticated link to reset your security credentials.
                </p>

                {forgotError && (
                  <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm text-red-700 animate-fade-in">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />
                    <p className="font-semibold">{forgotError}</p>
                  </div>
                )}

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5 pt-1">
                  <div className="space-y-2">
                    <label htmlFor="forgot-email" className="text-xs sm:text-sm font-bold text-slate-800">
                      Registered Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none flex items-center justify-center">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        required
                        autoFocus
                        placeholder="pathologist@onepathlab.com"
                        className="w-full h-11 sm:h-12 rounded-xl border border-slate-300/90 bg-white hover:border-slate-400/90 focus:bg-white pl-11 pr-4 text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full h-12 sm:h-[50px] rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2.5 transition-all duration-300 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          <span>Sending Reset Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset Link</span>
                          <ArrowRight className="h-4.5 w-4.5" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      disabled={forgotLoading}
                      className="w-full py-2.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer"
                    >
                      Cancel & Return to Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}