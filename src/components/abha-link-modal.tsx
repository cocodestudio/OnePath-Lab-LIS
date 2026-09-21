"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Smartphone,
  CreditCard,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Lock,
  Copy,
  Check,
  Fingerprint,
  ScanFace,
  X,
  ExternalLink
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";

export interface AbhaVerifiedPatient {
  name: string;
  designation: string;
  gender: string;
  dob?: string;
  age: number;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  aadhaar_no: string;
  abha_number: string;
  abha_address: string;
  abha_profile_photo?: string | null;
  txn_id?: string;
}

interface AbhaLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (patient: AbhaVerifiedPatient) => void;
  defaultPhone?: string;
}

export function AbhaLinkModal({ open, onOpenChange, onVerified, defaultPhone }: AbhaLinkModalProps) {
  // Wizard steps: 1 = Input, 2 = OTP, 3 = Verified Card
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Mode: AADHAAR or MOBILE
  const [authType, setAuthType] = useState<"AADHAAR" | "MOBILE">("AADHAAR");

  // Auth Method: OTP, FACE_AUTH, BIOMETRIC
  const [authMethod, setAuthMethod] = useState<"OTP" | "FACE_AUTH" | "BIOMETRIC">("OTP");

  // Input states
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [part3, setPart3] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);
  const input3Ref = useRef<HTMLInputElement>(null);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Verified Data
  const [verifiedPatient, setVerifiedPatient] = useState<AbhaVerifiedPatient | null>(null);
  const [copiedAbha, setCopiedAbha] = useState(false);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setPart1("");
      setPart2("");
      setPart3("");
      setMobileNumber(defaultPhone ? defaultPhone.replace(/\D/g, "").slice(-10) : "");
      setOtp(["", "", "", "", "", ""]);
      setVerifiedPatient(null);
      setIsSandbox(false);
      setTimeout(() => input1Ref.current?.focus(), 150);
    }
  }, [open, defaultPhone]);

  // Resend Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const fullAadhaar = `${part1}${part2}${part3}`;

  // Handle 4-digit auto-advance
  const handlePartChange = (
    val: string,
    setVal: (v: string) => void,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    setVal(cleaned);
    setError(null);
    if (cleaned.length === 4 && nextRef && nextRef.current) {
      nextRef.current.focus();
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError(null);

    const cleanPhone = mobileNumber.replace(/\D/g, "") || defaultPhone?.replace(/\D/g, "") || "";

    if (authType === "AADHAAR") {
      if (fullAadhaar.length !== 12) {
        setError("Please enter a valid 12-digit Aadhaar number.");
        return;
      }
      if (cleanPhone.length !== 10) {
        setError("Please enter the patient's 10-digit mobile number to link with ABHA.");
        return;
      }
    } else {
      if (cleanPhone.length !== 10) {
        setError("Please enter a valid 10-digit mobile number.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        aadhaar_number: authType === "AADHAAR" ? fullAadhaar : `9999${cleanPhone.slice(-8)}`,
        auth_mode: authMethod === "OTP" ? "AADHAAR_OTP" : authMethod,
      };

      const res = await fetchFromLaravel("/abha/generate-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.txn_id) {
        setTxnId(res.txn_id);
        setMaskedMobile(res.masked_mobile || "your registered mobile");
        setIsSandbox(Boolean(res.is_sandbox));
        setStep(2);
        setResendTimer(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 200);
      } else {
        setError(res?.message || "Failed to initiate ABHA verification. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Error connecting to ABDM Gateway.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP change
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError(null);

    // Focus next box
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    if (!txnId) {
      setError("Session expired. Please restart the verification.");
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const effectiveMobile = mobileNumber.replace(/\D/g, "") || defaultPhone?.replace(/\D/g, "") || "";
      const res = await fetchFromLaravel("/abha/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          txn_id: txnId,
          otp: fullOtp,
          mobile: effectiveMobile || undefined,
        }),
      });

      if (res && res.is_verified && res.patient_data) {
        setVerifiedPatient(res.patient_data);
        setIsSandbox(Boolean(res.is_sandbox));
        setStep(3);
      } else {
        setError(res?.message || "Invalid OTP entered. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Error verifying OTP with ABDM.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || !txnId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchFromLaravel("/abha/resend-otp", {
        method: "POST",
        body: JSON.stringify({ txn_id: txnId }),
      });

      setResendTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Complete & Autofill Registration Form
  const handleCompleteAutofill = () => {
    if (verifiedPatient) {
      onVerified(verifiedPatient);
      onOpenChange(false);
    }
  };

  const copyAbhaToClipboard = () => {
    if (verifiedPatient?.abha_number) {
      navigator.clipboard.writeText(verifiedPatient.abha_number);
      setCopiedAbha(true);
      setTimeout(() => setCopiedAbha(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[490px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Link Patient ABHA</DialogTitle>
          <DialogDescription>Ayushman Bharat Health Account Registration</DialogDescription>
        </DialogHeader>

        {/* Top Header Bar with Government ABDM Emblem */}
        <div className="p-4 px-5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Ayushman Bharat Circular Emblem */}
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-2xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-none">
                Link Patient ABHA
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Ayushman Bharat Digital Mission (ABDM)
              </p>
            </div>
          </div>

          {/* Stepper Dots (1 -> 2 -> 3) */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 1
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
              }`}
            >
              1
            </div>
            <div className={`w-3 h-0.5 ${step >= 2 ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`} />
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step >= 2
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
              }`}
            >
              2
            </div>
            <div className={`w-3 h-0.5 ${step >= 3 ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-800"}`} />
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 3
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-slate-400"
              }`}
            >
              ✓
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* =========================================================================
              STEP 1: AADHAAR INPUT & AUTH SELECTOR
          ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-1">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Add Patient via ABHA
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Enter patient's Aadhaar or Mobile to fetch government verified details.
                </p>
              </div>

              {/* Mode Selector Tabs (Aadhaar vs Mobile) */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAuthType("AADHAAR")}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authType === "AADHAAR"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span>Aadhaar</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold">
                    Recommended
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthType("MOBILE")}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    authType === "MOBILE"
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Aadhaar Triple Box Input (XXXX - XXXX - XXXX) */}
              {authType === "AADHAAR" ? (
                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block text-center">
                      12-Digit Aadhaar Number
                    </label>
                    <div className="flex items-center justify-center gap-2.5">
                      <input
                        ref={input1Ref}
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={part1}
                        onChange={(e) => handlePartChange(e.target.value, setPart1, input2Ref)}
                        placeholder="XXXX"
                        className="w-24 h-11 text-center font-mono font-bold text-base tracking-widest rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        ref={input2Ref}
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={part2}
                        onChange={(e) => handlePartChange(e.target.value, setPart2, input3Ref)}
                        placeholder="XXXX"
                        className="w-24 h-11 text-center font-mono font-bold text-base tracking-widest rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        ref={input3Ref}
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={part3}
                        onChange={(e) => handlePartChange(e.target.value, setPart3)}
                        placeholder="XXXX"
                        className="w-24 h-11 text-center font-mono font-bold text-base tracking-widest rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10.5px] text-slate-400 text-center">
                      Aadhaar details are securely verified via UIDAI / ABDM Gateway.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Communication Mobile Number <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Max 6 ABHAs per SIM</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile number"
                        className="w-full h-9 pl-11 pr-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Required by NHA: A mobile number can be linked to a maximum of 6 ABHA profiles.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Patient Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="98765 43210"
                      className="w-full h-11 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Authentication Selector (OTP / Face Auth / Biometric) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block text-center uppercase tracking-wider">
                  Authenticate using:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMethod("OTP")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      authMethod === "OTP"
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/15"
                        : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span className="text-[11px] font-bold">OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod("FACE_AUTH")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                      authMethod === "FACE_AUTH"
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/15"
                        : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <ScanFace className="h-4 w-4" />
                    <span className="text-[11px] font-bold">Face Auth</span>
                    <span className="absolute -top-1.5 px-1 py-0.1 rounded-full bg-amber-500 text-white text-[8px] font-bold">
                      ⚡ No OTP
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod("BIOMETRIC")}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      authMethod === "BIOMETRIC"
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/15"
                        : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Fingerprint className="h-4 w-4" />
                    <span className="text-[11px] font-bold">Biometric</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || (authType === "AADHAAR" && fullAadhaar.length !== 12)}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending OTP to Aadhaar Linked Mobile...</span>
                    </>
                  ) : (
                    <>
                      <span>Next: Send OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                  By proceeding, you agree to NHA ABDM voluntary terms &amp; conditions.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: OTP VERIFICATION
          ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-1">
                  <Lock className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Enter 6-Digit OTP
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  OTP sent to patient's Aadhaar-linked mobile:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{maskedMobile}</strong>
                </p>
                {isSandbox && (
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                    Sandbox Demo Mode: Test OTP <strong>123456</strong>
                  </div>
                )}
              </div>

              {/* 6 Digit OTP Inputs */}
              <div className="flex items-center justify-center gap-2 py-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center font-mono font-bold text-lg rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-2xs"
                  />
                ))}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {error.toLowerCase().includes("6 abha") && (
                    <div className="pl-6 text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-zinc-900/70 p-2 rounded-lg border border-red-100 dark:border-red-900/30 space-y-1">
                      <p>
                        <strong>NHA Regulatory Cap:</strong> A single mobile number can only be linked with up to 6 ABHA accounts across India.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Enter an alternate family mobile number &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Resend OTP Row */}
              <div className="flex items-center justify-between px-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
                >
                  ← Change Number
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}</span>
                </button>
              </div>

              {/* Verify Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying with ABDM Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verify &amp; Link ABHA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 3: VERIFIED ABHA HEALTH CARD PREVIEW
          ========================================================================= */}
          {step === 3 && verifiedPatient && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  ABHA Linked Successfully!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Government verified demographics retrieved from NHA registry.
                </p>
              </div>

              {/* Ayushman Bharat Digital Card */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent border border-emerald-500/30 space-y-3 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      Official ABHA Identity
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[9px]">
                    VERIFIED
                  </span>
                </div>

                <div className="flex items-start gap-3.5">
                  {/* Photo or Initials */}
                  <div className="w-14 h-16 rounded-xl bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-500 font-bold text-lg">
                    {verifiedPatient.abha_profile_photo ? (
                      <img
                        src={`data:image/jpeg;base64,${verifiedPatient.abha_profile_photo}`}
                        alt={verifiedPatient.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      verifiedPatient.name.charAt(0)
                    )}
                  </div>

                  {/* Demographics details */}
                  <div className="flex-1 space-y-1 text-xs">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {verifiedPatient.designation} {verifiedPatient.name}
                    </h5>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                      <span>{verifiedPatient.gender}</span>
                      <span>•</span>
                      <span>{verifiedPatient.age} Years</span>
                      {verifiedPatient.dob && (
                        <>
                          <span>•</span>
                          <span>DOB: {verifiedPatient.dob}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {verifiedPatient.address || "Address verified from UIDAI"}
                    </p>
                  </div>
                </div>

                {/* ABHA Number Bar */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">
                      14-Digit ABHA Number:
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      {verifiedPatient.abha_number}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={copyAbhaToClipboard}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Copy ABHA Number"
                  >
                    {copiedAbha ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {verifiedPatient.abha_address && (
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>ABHA Address:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {verifiedPatient.abha_address}
                    </strong>
                  </div>
                )}
              </div>

              {/* Complete & Autofill Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCompleteAutofill}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <span>Autofill Form &amp; Continue Registration</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
