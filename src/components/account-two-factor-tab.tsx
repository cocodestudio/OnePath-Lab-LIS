"use client";

import React, { useState, useEffect } from "react";
import {
  Shield, ShieldCheck, Smartphone, Mail, KeyRound, CheckCircle2,
  AlertCircle, Loader2, Copy, Check, RefreshCw, X, ArrowRight,
  ShieldAlert, Lock, SmartphoneNfc
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { fetchFromLaravel } from "@/lib/api-client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

export interface TwoFaStatus {
  status: string;
  method: "NONE" | "EMAIL_OTP" | "WHATSAPP_OTP" | "GOOGLE_AUTHENTICATOR";
  is_enabled: boolean;
  enabled_at: string | null;
  email: string;
  email_masked?: string;
  phone?: string;
  phone_masked?: string;
  has_phone: boolean;
}

interface AccountTwoFactorTabProps {
  userEmail: string;
  userPhone?: string;
  onSwitchToProfileTabAndEditPhone: () => void;
  showToast: (title: string, descOrType?: string, type?: "success" | "error" | "warning") => void;
}

export function AccountTwoFactorTab({
  userEmail,
  userPhone,
  onSwitchToProfileTabAndEditPhone,
  showToast,
}: AccountTwoFactorTabProps) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [twoFaStatus, setTwoFaStatus] = useState<TwoFaStatus | null>(null);

  // Setup modal state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupMethod, setSetupMethod] = useState<"EMAIL_OTP" | "WHATSAPP_OTP" | "GOOGLE_AUTHENTICATOR" | null>(null);
  const [initiatingSetup, setInitiatingSetup] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret?: string;
    otpauth_url?: string;
    destination_masked?: string;
  } | null>(null);

  // Verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Resend timer state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Disable modal state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Load 2FA status
  const loadStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await fetchFromLaravel<TwoFaStatus>("/profile/2fa/status", { skipCache: true });
      if (res && res.status === "success") {
        setTwoFaStatus(res);
      }
    } catch (err) {
      console.error("Failed to load 2FA status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Start setup flow for selected method
  const handleInitiateSetup = async (method: "EMAIL_OTP" | "WHATSAPP_OTP" | "GOOGLE_AUTHENTICATOR") => {
    if (method === "WHATSAPP_OTP" && (!userPhone || userPhone.trim().length < 10)) {
      onSwitchToProfileTabAndEditPhone();
      showToast("Phone number required", "Please add and save your registered mobile number first.", "warning");
      return;
    }

    setSetupMethod(method);
    setVerifyCode("");
    setVerifyError(null);
    setSetupData(null);
    setInitiatingSetup(true);
    setSetupModalOpen(true);

    try {
      const res = await fetchFromLaravel<any>("/profile/2fa/setup", {
        method: "POST",
        body: JSON.stringify({ method }),
        skipCache: true,
      });

      if (res && res.status === "success") {
        setSetupData(res);
        setResendCooldown(30);
      } else {
        if (res?.error_code === "PHONE_REQUIRED") {
          setSetupModalOpen(false);
          onSwitchToProfileTabAndEditPhone();
          showToast("Phone number required", res.message || "Please add your mobile number in your profile first.", "warning");
          return;
        }
        setVerifyError(res?.message || "Failed to initialize 2FA setup.");
      }
    } catch (err: any) {
      console.error("Error initiating 2FA setup:", err);
      setVerifyError(err.message || "Network error while initializing 2FA.");
    } finally {
      setInitiatingSetup(false);
    }
  };

  // Resend code for Email/WhatsApp setup
  const handleResendSetupCode = async () => {
    if (!setupMethod || resendCooldown > 0 || resending) return;
    setResending(true);
    setVerifyError(null);
    try {
      const res = await fetchFromLaravel<any>("/profile/2fa/setup", {
        method: "POST",
        body: JSON.stringify({ method: setupMethod }),
        skipCache: true,
      });
      if (res && res.status === "success") {
        setSetupData(res);
        setResendCooldown(30);
        showToast("New code sent!", "A fresh 6-digit verification code has been dispatched.", "success");
      } else {
        setVerifyError(res?.message || "Failed to resend code.");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  // Submit code to verify and activate 2FA
  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupMethod || !verifyCode.trim() || verifyCode.trim().length !== 6) {
      setVerifyError("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetchFromLaravel<any>("/profile/2fa/confirm", {
        method: "POST",
        body: JSON.stringify({ method: setupMethod, code: verifyCode.trim() }),
        skipCache: true,
      });

      if (res && res.status === "success") {
        showToast("2FA Activated Successfully!", res.message, "success");
        setSetupModalOpen(false);
        await loadStatus();
      } else {
        setVerifyError(res?.message || "Invalid code. Please verify and try again.");
      }
    } catch (err: any) {
      console.error("Error confirming 2FA setup:", err);
      setVerifyError(err.message || "Verification failed. Please check the code.");
    } finally {
      setVerifying(false);
    }
  };

  // Disable 2FA
  const handleDisable2Fa = async () => {
    setDisabling(true);
    try {
      const res = await fetchFromLaravel<any>("/profile/2fa/disable", {
        method: "POST",
        skipCache: true,
      });

      if (res && res.status === "success") {
        showToast("2FA Disabled", "Two-factor authentication has been turned off for your account.", "success");
        setDisableModalOpen(false);
        await loadStatus();
      } else {
        showToast("Error", res?.message || "Failed to disable 2FA.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message || "Network error disabling 2FA.", "error");
    } finally {
      setDisabling(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      showToast("Key Copied!", "Secret key copied to clipboard.");
    }
  };

  const currentMethod = twoFaStatus?.method || "NONE";
  const is2FaActive = twoFaStatus?.is_enabled ?? false;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================= 2FA STATUS HERO BANNER ================= */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 ${
          is2FaActive
            ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30"
            : "bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent border-border"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                is2FaActive
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {is2FaActive ? <ShieldCheck className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Two-Factor Authentication (2FA)
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                    is2FaActive
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {is2FaActive ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active: {currentMethod.replace("_", " ")}
                    </>
                  ) : (
                    "Disabled"
                  )}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-4xl leading-relaxed">
                {is2FaActive
                  ? `Your account is fortified with two-factor verification. When signing in to the LIS portal, you will be prompted to enter a verification code after your password.`
                  : "Add an extra layer of defense to your diagnostic account. Even if someone discovers your password, they cannot access your laboratory data without your 2FA verification code."}
              </p>
              {is2FaActive && twoFaStatus?.enabled_at && (
                <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                  <span>Activated on:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(twoFaStatus.enabled_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Action button in hero banner */}
          {is2FaActive && (
            <button
              type="button"
              onClick={() => setDisableModalOpen(true)}
              className="self-start sm:self-center px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              Disable 2FA
            </button>
          )}
        </div>
      </div>

      {/* ================= METHOD SELECTION CARDS ================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h4 className="text-sm font-bold text-foreground">Authentication Methods</h4>
            <p className="text-xs text-muted-foreground">
              {is2FaActive
                ? "🔒 One 2FA method is currently active and protecting your account. To switch to a different authentication method, please disable 2FA first."
                : "Select one authentication method to protect your account. Only one method can be active at a time."}
            </p>
          </div>
          {is2FaActive && (
            <button
              type="button"
              onClick={() => setDisableModalOpen(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer self-start sm:self-auto inline-flex items-center gap-1"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Unlock all methods (Disable 2FA)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {/* METHOD 1: GOOGLE AUTHENTICATOR */}
          {(() => {
            const isThisMethodActive = is2FaActive && currentMethod === "GOOGLE_AUTHENTICATOR";
            const isThisMethodLocked = is2FaActive && !isThisMethodActive;

            return (
              <div
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isThisMethodActive
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                    : isThisMethodLocked
                    ? "bg-muted/15 border-border/60 opacity-60 grayscale-[35%] cursor-not-allowed"
                    : "bg-card border-border hover:border-border/80 shadow-2xs"
                }`}
              >
                {/* Top Accent Pill */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Recommended
                  </span>
                  {isThisMethodActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Active
                    </span>
                  ) : isThisMethodLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/70">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 mb-5">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      isThisMethodActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h5 className="text-sm font-bold text-foreground">Google Authenticator (TOTP)</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Generate 6-digit codes on your phone using Google Authenticator, Microsoft Authenticator, or Authy.
                    Works completely offline without network or cellular reception.
                  </p>
                </div>

                {isThisMethodActive ? (
                  <div className="space-y-1.5">
                    <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 cursor-default select-none shadow-2xs">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Active & Protected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisableModalOpen(true)}
                      className="w-full text-center text-[11px] font-semibold text-muted-foreground hover:text-rose-600 cursor-pointer pt-0.5 transition-colors"
                    >
                      Disable 2FA to switch method
                    </button>
                  </div>
                ) : isThisMethodLocked ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-muted/60 text-muted-foreground cursor-not-allowed border border-border/50 flex items-center justify-center gap-1.5"
                    title="Disable active 2FA first to switch to this method"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Locked (Disable 2FA First)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiateSetup("GOOGLE_AUTHENTICATOR")}
                    disabled={statusLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:opacity-90 shadow-sm cursor-pointer"
                  >
                    <span>Setup Google Auth</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* METHOD 2: EMAIL OTP */}
          {(() => {
            const isThisMethodActive = is2FaActive && currentMethod === "EMAIL_OTP";
            const isThisMethodLocked = is2FaActive && !isThisMethodActive;

            return (
              <div
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isThisMethodActive
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                    : isThisMethodLocked
                    ? "bg-muted/15 border-border/60 opacity-60 grayscale-[35%] cursor-not-allowed"
                    : "bg-card border-border hover:border-border/80 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    Email Delivery
                  </span>
                  {isThisMethodActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Active
                    </span>
                  ) : isThisMethodLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/70">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 mb-5">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      isThisMethodActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    <Mail className="h-5 w-5" />
                  </div>
                  <h5 className="text-sm font-bold text-foreground">Email OTP</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Receive an instant 6-digit one-time code to your registered email address upon every login.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate pt-0.5" title={userEmail}>
                    Destination: <span className="font-semibold text-foreground">{userEmail}</span>
                  </p>
                </div>

                {isThisMethodActive ? (
                  <div className="space-y-1.5">
                    <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 cursor-default select-none shadow-2xs">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Active & Protected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisableModalOpen(true)}
                      className="w-full text-center text-[11px] font-semibold text-muted-foreground hover:text-rose-600 cursor-pointer pt-0.5 transition-colors"
                    >
                      Disable 2FA to switch method
                    </button>
                  </div>
                ) : isThisMethodLocked ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-muted/60 text-muted-foreground cursor-not-allowed border border-border/50 flex items-center justify-center gap-1.5"
                    title="Disable active 2FA first to switch to this method"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Locked (Disable 2FA First)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiateSetup("EMAIL_OTP")}
                    disabled={statusLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:opacity-90 shadow-sm cursor-pointer"
                  >
                    <span>Setup Email OTP</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* METHOD 3: WHATSAPP OTP */}
          {(() => {
            const isThisMethodActive = is2FaActive && currentMethod === "WHATSAPP_OTP";
            const isThisMethodLocked = is2FaActive && !isThisMethodActive;

            return (
              <div
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                  isThisMethodActive
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                    : isThisMethodLocked
                    ? "bg-muted/15 border-border/60 opacity-60 grayscale-[35%] cursor-not-allowed"
                    : "bg-card border-border hover:border-border/80 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Meta WhatsApp
                  </span>
                  {isThisMethodActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Active
                    </span>
                  ) : isThisMethodLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/70">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 mb-5">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      isThisMethodActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <SmartphoneNfc className="h-5 w-5" />
                  </div>
                  <h5 className="text-sm font-bold text-foreground">WhatsApp OTP</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Receive an instant 6-digit one-time code directly on WhatsApp with one-tap copy button support.
                  </p>
                  {userPhone && userPhone.trim().length >= 10 ? (
                    <p className="text-[11px] font-mono text-muted-foreground truncate pt-0.5">
                      Destination: <span className="font-semibold text-foreground">{userPhone}</span>
                    </p>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-snug">
                      Mobile number missing. Click below to add your phone number in Profile.
                    </div>
                  )}
                </div>

                {isThisMethodActive ? (
                  <div className="space-y-1.5">
                    <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 cursor-default select-none shadow-2xs">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Active & Protected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisableModalOpen(true)}
                      className="w-full text-center text-[11px] font-semibold text-muted-foreground hover:text-rose-600 cursor-pointer pt-0.5 transition-colors"
                    >
                      Disable 2FA to switch method
                    </button>
                  </div>
                ) : isThisMethodLocked ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-muted/60 text-muted-foreground cursor-not-allowed border border-border/50 flex items-center justify-center gap-1.5"
                    title="Disable active 2FA first to switch to this method"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Locked (Disable 2FA First)</span>
                  </button>
                ) : userPhone && userPhone.trim().length >= 10 ? (
                  <button
                    type="button"
                    onClick={() => handleInitiateSetup("WHATSAPP_OTP")}
                    disabled={statusLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:opacity-90 shadow-sm cursor-pointer"
                  >
                    <span>Setup WhatsApp OTP</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSwitchToProfileTabAndEditPhone}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm"
                  >
                    <span>Add Mobile Number in Profile</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ================= SETUP MODAL ================= */}
      <Dialog open={setupModalOpen} onOpenChange={(open) => !verifying && setSetupModalOpen(open)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>
                {setupMethod === "GOOGLE_AUTHENTICATOR"
                  ? "Setup Google Authenticator"
                  : setupMethod === "EMAIL_OTP"
                  ? "Setup Email OTP"
                  : "Setup WhatsApp OTP"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {setupMethod === "GOOGLE_AUTHENTICATOR"
                ? "Scan the QR code in your Authenticator app and enter the verification code below."
                : setupMethod === "EMAIL_OTP"
                ? `Enter the 6-digit code sent to ${setupData?.destination_masked || userEmail}.`
                : `Enter the 6-digit code sent to WhatsApp ${setupData?.destination_masked || userPhone}.`}
            </DialogDescription>
          </DialogHeader>

          {initiatingSetup ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Initializing secure authentication channel...</p>
            </div>
          ) : (
            <form onSubmit={handleConfirmSetup} className="space-y-5 pt-2">
              {/* GOOGLE AUTHENTICATOR SPECIFIC: QR CODE & SECRET */}
              {setupMethod === "GOOGLE_AUTHENTICATOR" && setupData?.otpauth_url && (
                <div className="space-y-4">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <QRCodeSVG
                      value={setupData.otpauth_url}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                    <p className="text-[11px] font-semibold text-slate-500 pt-2 text-center">
                      Scan with Google Authenticator or Microsoft Authenticator
                    </p>
                  </div>

                  {/* Manual Key Box */}
                  {setupData.secret && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Can't scan the QR code? Enter this secret key manually:
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-xl bg-muted font-mono text-xs font-bold text-foreground tracking-wider select-all overflow-x-auto">
                          {setupData.secret}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedKey ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VERIFICATION CODE INPUT */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Enter 6-Digit Code</span>
                  {(setupMethod === "EMAIL_OTP" || setupMethod === "WHATSAPP_OTP") && (
                    <button
                      type="button"
                      onClick={handleResendSetupCode}
                      disabled={resendCooldown > 0 || resending}
                      className="text-[11px] font-semibold text-primary hover:underline disabled:text-muted-foreground cursor-pointer disabled:cursor-not-allowed"
                    >
                      {resending ? (
                        "Sending..."
                      ) : resendCooldown > 0 ? (
                        `Resend code in ${resendCooldown}s`
                      ) : (
                        "Resend code"
                      )}
                    </button>
                  )}
                </label>

                <input
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold h-12 rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
                />

                {verifyError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSetupModalOpen(false)}
                  disabled={verifying}
                  className="flex-1 py-2.5 rounded-xl border border-border bg-muted/60 text-xs font-semibold hover:bg-muted text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || verifyCode.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= DISABLE CONFIRMATION MODAL ================= */}
      <Dialog open={disableModalOpen} onOpenChange={(open) => !disabling && setDisableModalOpen(open)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-lg font-bold">
              <ShieldAlert className="h-5 w-5" />
              <span>Disable Two-Factor Authentication?</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1 leading-relaxed">
              Disabling 2FA will remove the extra security check when logging in. Anyone who knows your password will
              be able to sign into your OnePath account directly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setDisableModalOpen(false)}
              disabled={disabling}
              className="flex-1 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted"
            >
              Keep 2FA Enabled
            </button>
            <button
              type="button"
              onClick={handleDisable2Fa}
              disabled={disabling}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {disabling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Disabling...</span>
                </>
              ) : (
                <span>Confirm Disable</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

