"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  User, Shield, Smartphone, KeyRound, Lock, CheckCircle2,
  AlertCircle, Loader2, Camera, Edit3, X, Check, Laptop,
  Globe, LogOut, ArrowRight, RefreshCw, Eye, EyeOff, Mail,
  Building2
} from "lucide-react";
import { fetchFromLaravel, getStoredUser, updateStoredUser } from "@/lib/api-client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatar_url?: string;
  role?: string;
  labName?: string;
  lab_name?: string;
  createdAt?: string;
  created_at?: string;
}

function ProfileContent() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "SESSIONS">("PROFILE");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [labData, setLabData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingField, setEditingField] = useState<"name" | "phone" | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingField, setSavingField] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const setToastMessage = React.useCallback((input: { text: string; type: "success" | "error" } | null) => {
    if (!input) return;
    if (input.type === "success") {
      toastSuccess(input.text);
    } else {
      toastError(input.text);
    }
  }, [toastSuccess, toastError]);

  // Password reset OTP modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resettingPass, setResettingPass] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);



  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setProfile(stored);
      setEditName(stored.name || "");
      setEditPhone(stored.phone || "");
      setLoading(false);
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [data, labRes] = await Promise.all([
        fetchFromLaravel("/profile"),
        fetchFromLaravel("/lab").catch(() => null),
      ]);
      setProfile(data);
      if (labRes) setLabData(labRes);
      setEditName(data.name || "");
      setEditPhone(data.phone || "");
    } catch (err) {
      console.error("Failed to load profile:", err);
      // Fallback to local stored user
      const stored = getStoredUser();
      if (stored) {
        setProfile(stored);
        setEditName(stored.name || "");
        setEditPhone(stored.phone || "");
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveField = async (field: "name" | "phone") => {
    try {
      setSavingField(true);
      const payload = field === "name" ? { name: editName } : { phone: editPhone };
      const res = await fetchFromLaravel("/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res && res.user) {
        setProfile(res.user);
        updateStoredUser(res.user);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user-updated"));
        }
      }
      setEditingField(null);
      showToast(`${field === "name" ? "Name" : "Phone number"} updated successfully!`);
    } catch (err) {
      console.error("Failed to update profile field:", err);
      showToast("Failed to save changes. Please try again.", "error");
    } finally {
      setSavingField(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      setResetError(null);
      const res = await fetchFromLaravel("/profile/send-otp", { method: "POST" });
      if (res && res.status === "success") {
        setOtpStep("VERIFY");
        if (res.otp_demo) {
          setDemoOtp(res.otp_demo);
        }
        showToast(`OTP sent to ${profile?.email}`);
      }
    } catch (err: any) {
      setResetError(err.message || "Failed to send verification OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setResettingPass(true);
      setResetError(null);
      const res = await fetchFromLaravel("/profile/reset-password", {
        method: "POST",
        body: JSON.stringify({
          otp: otpCode,
          new_password: newPassword,
        }),
      });

      if (res && res.status === "success") {
        setIsResetOpen(false);
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpStep("REQUEST");
        showToast("Your password has been reset successfully!");
      } else {
        setResetError(res.message || "Invalid OTP code.");
      }
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password. Check your OTP.");
    } finally {
      setResettingPass(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          await fetchFromLaravel("/profile", {
            method: "PUT",
            body: JSON.stringify({ avatar_url: base64 }),
          });
          setProfile(prev => prev ? ({ ...prev, avatarUrl: base64, avatar_url: base64 }) : null);
          updateStoredUser({ avatarUrl: base64, avatar_url: base64 });
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("user-updated"));
          }
          showToast("Profile photo updated!");
        } catch (err) {
          console.error("Failed to upload avatar:", err);
          showToast("Failed to upload photo. Please try again.", "error");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading && !profile) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 px-4 sm:px-6 animate-fade-in">
        <div className="flex items-center gap-8 border-b border-border pb-3.5">
          <div className="h-6 w-24 rounded-lg shimmer-gradient" />
          <div className="h-6 w-24 rounded-lg shimmer-gradient" />
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex items-center gap-5">
          <div className="w-20 h-20 rounded-full shimmer-gradient shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded-md shimmer-gradient" />
            <div className="h-3.5 w-64 rounded shimmer-gradient" />
            <div className="h-5 w-20 rounded-full shimmer-gradient" />
          </div>
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="h-5 w-36 rounded-md shimmer-gradient" />
          <div className="space-y-3">
            <div className="h-10 rounded-xl shimmer-gradient" />
            <div className="h-10 rounded-xl shimmer-gradient" />
          </div>
        </div>
      </div>
    );
  }

  const avatar = profile?.avatarUrl || profile?.avatar_url || (profile as any)?.avatar || labData?.logoUrl || labData?.logo_url;
  const labName = labData?.centreName || labData?.centre_name || labData?.name || profile?.labName || profile?.lab_name || (profile as any)?.lab?.name || (profile as any)?.lab?.centreName || "Diagnostic Laboratory";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 px-4 sm:px-6 overflow-x-hidden animate-fade-in">

      {/* Header Tabs */}
      <div className="flex items-center gap-8 border-b border-border text-sm font-semibold">
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`flex items-center gap-2 pb-3.5 relative transition-colors ${
            activeTab === "PROFILE" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
          {activeTab === "PROFILE" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-fade-in" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("SESSIONS")}
          className={`flex items-center gap-2 pb-3.5 relative transition-colors ${
            activeTab === "SESSIONS" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Laptop className="h-4 w-4" />
          <span>Sessions</span>
          {activeTab === "SESSIONS" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {/* ================= TAB 1: PROFILE ================= */}
      {activeTab === "PROFILE" && (
        <div className="bg-card border border-border/90 rounded-2xl p-5 sm:p-12 shadow-sm space-y-8 animate-fade-in max-w-2xl mx-auto">
          {/* Avatar & Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
              <p className="text-xs font-semibold text-primary mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{labName}</span>
              </p>
            </div>
            
            {/* Profile Avatar with Camera Upload Button */}
            <div className="relative group">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-bold text-xl text-primary shadow-xs">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{labName ? labName.slice(0, 2).toUpperCase() : (profile?.name?.slice(0, 2).toUpperCase() || "MA")}</span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform"
                title="Change profile picture"
              >
                <Camera className="h-3 w-3" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Field 0: Diagnostic Laboratory Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Diagnostic Laboratory / Centre Name</label>
                <Link
                  href="/dashboard/account/lab?tab=centre"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Building2 className="h-3 w-3" />
                  <span>Manage in Lab Profile</span>
                </Link>
              </div>

              <div className="h-11 px-4 rounded-xl bg-muted/50 border border-border/80 flex items-center justify-between text-sm font-bold text-foreground">
                <div className="flex items-center gap-2.5 truncate">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{labName}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                  Registered Centre
                </span>
              </div>
            </div>
            {/* Field 1: Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Name</label>
                {editingField !== "name" && (
                  <button
                    onClick={() => {
                      setEditingField("name");
                      setEditName(profile?.name || "");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {editingField === "name" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-11 px-4 rounded-xl border border-primary bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("name")}
                    disabled={savingField}
                    className="px-4 h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingField ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 h-11 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="h-11 px-4 rounded-xl bg-muted/50 border border-border/80 flex items-center text-sm font-medium text-foreground">
                  {profile?.name || "Moh Abuzar"}
                </div>
              )}
            </div>

            {/* Field 2: Email (Locked for security per requirement) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Email</label>
                <span
                  title="Official account email is locked for security"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground cursor-not-allowed opacity-70"
                >
                  <Lock className="h-3 w-3" />
                  <span>Locked</span>
                </span>
              </div>

              <div className="h-11 px-4 rounded-xl bg-muted/50 border border-border/80 flex items-center justify-between text-sm font-medium text-foreground">
                <span>{profile?.email || "mohabuzar.net@gmail.com"}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            </div>

            {/* Field 3: Mobile Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Mobile Number</label>
                {editingField !== "phone" && (
                  <button
                    onClick={() => {
                      setEditingField("phone");
                      setEditPhone(profile?.phone || "");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {editingField === "phone" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="flex-1 h-11 px-4 rounded-xl border border-primary bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField("phone")}
                    disabled={savingField}
                    className="px-4 h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingField ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 h-11 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="h-11 px-4 rounded-xl bg-muted/50 border border-border/80 flex items-center justify-between text-sm font-medium text-foreground">
                  <span className="font-mono">{profile?.phone || "9045757272"}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
              )}

              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                <Check className="h-3.5 w-3.5" />
                <span>Your mobile number is verified</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SESSIONS ================= */}
      {activeTab === "SESSIONS" && (
        <div className="bg-card border border-border/90 rounded-2xl p-8 shadow-sm space-y-6 animate-fade-in max-w-2xl mx-auto">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Active Browser Sessions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage and log out your active sessions on other browsers and devices.</p>
          </div>

          <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-background">
              <div className="flex items-center gap-3">
                <Laptop className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-foreground">Windows — Chrome Browser</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      Current session
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">IP: 127.0.0.1 • Localhost • Active now</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => showToast("All other remote sessions have been revoked.")}
            className="px-4 py-2 rounded-lg border border-border bg-muted/40 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            Log Out Other Browser Sessions
          </button>
        </div>
      )}

      {/* Reset Password with OTP Modal */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="w-[94vw] max-w-md p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <span>Reset Account Password</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {otpStep === "REQUEST"
              ? `We will send a 6-digit OTP verification code to your registered email: ${profile?.email}`
              : `Enter the 6-digit OTP and set your new account password.`}
          </DialogDescription>

          {resetError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {otpStep === "REQUEST" ? (
            <div className="space-y-4 pt-3">
              <div className="p-4 rounded-xl bg-background/60 border border-border/70 text-xs text-foreground space-y-1">
                <p className="font-bold">Verified Email:</p>
                <p className="font-mono text-primary">{profile?.email}</p>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="w-full py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                <span>Send 6-Digit OTP to Email</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-3 text-xs">
              {demoOtp && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-xs">
                  Development OTP: <strong>{demoOtp}</strong>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-foreground">6-Digit Verification OTP *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-mono text-center tracking-widest text-base font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">New Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Confirm New Password *</label>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={resettingPass}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {resettingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Update Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOtpStep("REQUEST")}
                  className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Resend
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-xs font-medium">Loading Profile...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
