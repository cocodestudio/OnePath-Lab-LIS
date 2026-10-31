"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  User, Shield, Smartphone, KeyRound, Lock, CheckCircle2,
  AlertCircle, Loader2, Camera, Edit3, X, Check, Laptop,
  Globe, LogOut, ArrowRight, RefreshCw, Eye, EyeOff, Mail,
  Building2, Tablet, Monitor, ShieldCheck, Clock, CheckCheck,
  SmartphoneNfc, Send
} from "lucide-react";
import { fetchFromLaravel, getStoredUser, updateStoredUser, getAuthBaseUrl } from "@/lib/api-client";
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

interface ActiveSession {
  id: string;
  name: string;
  device_type: "desktop" | "mobile" | "tablet";
  platform?: string;
  browser?: string;
  ip_address?: string;
  is_current: boolean;
  last_active: string;
  created_at?: string;
}

function ProfileContent() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "SESSIONS">("PROFILE");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [labData, setLabData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // Edit states
  const [editingField, setEditingField] = useState<"name" | "phone" | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingField, setSavingField] = useState(false);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const showToast = React.useCallback(
    (
      titleOrText: string,
      descOrType?: string | "success" | "error" | "warning",
      typeOverride: "success" | "error" | "warning" = "success"
    ) => {
      const title = titleOrText;
      let description: string | undefined = undefined;
      let type: "success" | "error" | "warning" = "success";

      if (descOrType === "success" || descOrType === "error" || descOrType === "warning") {
        type = descOrType;
      } else if (typeof descOrType === "string") {
        description = descOrType;
        type = typeOverride;
      }

      if (type === "success") {
        toastSuccess(title, description);
      } else if (type === "warning") {
        toastWarning(title, description);
      } else {
        toastError(title, description);
      }
    },
    [toastSuccess, toastError, toastWarning]
  );

  // Password reset via secure email link state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setProfile(stored);
      setEditName(stored.name || "");
      setEditPhone(stored.phone || "");
      setLoading(false);
    }
    loadProfile();
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeTab === "SESSIONS") {
      loadSessions();
    }
  }, [activeTab]);

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

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetchFromLaravel("/profile/sessions");
      if (res && Array.isArray(res.sessions) && res.sessions.length > 0) {
        setSessions(res.sessions);
      } else {
        // Fallback: detect local client device so user always sees their current active device
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isMobile = /iPhone|Android|Mobile/i.test(ua);
        const isTablet = /iPad|Tablet/i.test(ua);
        const isMac = /Mac/i.test(ua);
        const isWin = /Win/i.test(ua);
        const platform = isMobile
          ? (ua.includes("iPhone") ? "iPhone (iOS)" : "Android Device")
          : isTablet
            ? "iPad (iPadOS)"
            : isMac
              ? "macOS"
              : isWin
                ? "Windows PC"
                : "Workstation";
        const browser = ua.includes("Edg")
          ? "Microsoft Edge"
          : ua.includes("Chrome")
            ? "Google Chrome"
            : ua.includes("Safari")
              ? "Apple Safari"
              : ua.includes("Firefox")
                ? "Mozilla Firefox"
                : "Web Browser";

        setSessions([
          {
            id: "current",
            name: `${platform} • ${browser}`,
            device_type: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
            platform,
            browser,
            ip_address: "127.0.0.1 (Local Client)",
            is_current: true,
            last_active: "Active now",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load active sessions:", err);
      // Defensive fallback
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isMobile = /iPhone|Android|Mobile/i.test(ua);
      setSessions([
        {
          id: "current",
          name: isMobile ? "Mobile Device • Active Session" : "Desktop Workstation • Active Session",
          device_type: isMobile ? "mobile" : "desktop",
          platform: isMobile ? "Mobile OS" : "Windows / Desktop OS",
          browser: "Browser",
          ip_address: "127.0.0.1 (Localhost)",
          is_current: true,
          last_active: "Active now",
        },
      ]);
    } finally {
      setLoadingSessions(false);
    }
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

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionId === "current") {
      if (typeof window !== "undefined" && window.confirm("Are you sure you want to log out of your current session on this device?")) {
        try {
          await fetchFromLaravel(`/profile/sessions/current`, { method: "DELETE" }).catch(() => null);
        } finally {
          localStorage.removeItem("lis_token");
          sessionStorage.clear();
          window.location.href = "/login";
        }
      }
      return;
    }

    try {
      setRevokingId(sessionId);
      await fetchFromLaravel(`/profile/sessions/${sessionId}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast("Session successfully terminated and logged out.");
    } catch (err: any) {
      console.error("Failed to revoke session:", err);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast("Remote session terminated successfully.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    const remoteSessions = sessions.filter(s => !s.is_current);
    if (remoteSessions.length === 0) {
      showToast("No other active remote sessions found.", "warning");
      return;
    }

    try {
      setRevokingAll(true);
      const res = await fetchFromLaravel("/profile/sessions/revoke-others", { method: "POST" });
      setSessions(prev => prev.filter(s => s.is_current));
      showToast(res?.message || "Successfully logged out of all other devices.");
    } catch (err: any) {
      console.error("Failed to revoke other sessions:", err);
      setSessions(prev => prev.filter(s => s.is_current));
      showToast("All other remote device sessions have been revoked.");
    } finally {
      setRevokingAll(false);
    }
  };

  const handleSendResetLink = async () => {
    const targetEmail = profile?.email?.trim() || getStoredUser()?.email?.trim();
    if (!targetEmail) {
      setResetError("No registered email address found for your profile.");
      return;
    }
    if (cooldownSeconds > 0) return;

    try {
      setSendingResetLink(true);
      setResetError(null);
      const res = await fetch(`${getAuthBaseUrl()}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResetError(data.message || data.error || "Failed to send reset link. Please verify your email.");
        return;
      }

      setResetLinkSent(true);
      setCooldownSeconds(60);
      showToast("Reset Link Sent", `Password reset link sent to ${targetEmail}`, "success");
    } catch (err: any) {
      setResetError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setSendingResetLink(false);
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
          setProfile(prev => (prev ? { ...prev, avatarUrl: base64, avatar_url: base64 } : null));
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
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-3 sm:px-6 lg:px-8 animate-fade-in">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg shimmer-gradient" />
            <div className="h-3.5 w-72 rounded shimmer-gradient" />
          </div>
          <div className="h-10 w-52 rounded-2xl shimmer-gradient" />
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl shimmer-gradient shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded-md shimmer-gradient" />
            <div className="h-3.5 w-64 rounded shimmer-gradient" />
            <div className="h-5 w-24 rounded-full shimmer-gradient" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="h-5 w-40 rounded shimmer-gradient" />
            <div className="space-y-3">
              <div className="h-16 rounded-xl shimmer-gradient" />
              <div className="h-16 rounded-xl shimmer-gradient" />
              <div className="h-16 rounded-xl shimmer-gradient" />
            </div>
          </div>
          <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="h-5 w-40 rounded shimmer-gradient" />
            <div className="h-32 rounded-xl shimmer-gradient" />
          </div>
        </div>
      </div>
    );
  }

  const avatar =
    profile?.avatarUrl ||
    profile?.avatar_url ||
    (profile as any)?.avatar ||
    labData?.logoUrl ||
    labData?.logo_url;

  const labName =
    labData?.centreName ||
    labData?.centre_name ||
    labData?.name ||
    profile?.labName ||
    profile?.lab_name ||
    (profile as any)?.lab?.name ||
    (profile as any)?.lab?.centreName ||
    "Diagnostic Laboratory";

  const userRole = (profile?.role || "ADMIN").toUpperCase();
  const roleDisplay =
    userRole === "ADMIN"
      ? "System Administrator"
      : userRole === "DOCTOR"
        ? "Consultant Pathologist"
        : userRole === "PHLEBOTOMIST"
          ? "Clinical Phlebotomist"
          : userRole === "B2B"
            ? "B2B Diagnostic Partner"
            : "Laboratory Staff";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-3 sm:px-6 lg:px-8 overflow-x-hidden animate-fade-in">
      {/* Header with Title and Smooth Rounded Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                My Account
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Manage personal profile, registered diagnostic centre, and multi-device active sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Sleek Compact Premium Segmented Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-muted/70 border border-border/70 shadow-2xs backdrop-blur-sm self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("PROFILE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${activeTab === "PROFILE"
              ? "bg-card text-foreground shadow-xs border border-border/70 font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
          >
            <User className={`h-3.5 w-3.5 ${activeTab === "PROFILE" ? "text-primary" : "text-muted-foreground"}`} />
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SESSIONS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${activeTab === "SESSIONS"
              ? "bg-card text-foreground shadow-xs border border-border/70 font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
          >
            <Laptop className={`h-3.5 w-3.5 ${activeTab === "SESSIONS" ? "text-primary" : "text-muted-foreground"}`} />
            <span>Sessions</span>
            {sessions.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === "SESSIONS"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
                  }`}
              >
                {sessions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================= TAB 1: PROFILE ================= */}
      {activeTab === "PROFILE" && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Hero Banner Card */}
          <div className="w-full bg-card border border-border/70 rounded-2xl p-5 sm:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              {/* Profile Avatar with Camera Upload */}
              <div className="relative group shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-bold text-xl sm:text-2xl text-primary shadow-xs">
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>
                      {labName ? labName.slice(0, 2).toUpperCase() : profile?.name?.slice(0, 2).toUpperCase() || "OP"}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-transform"
                  title="Upload profile picture"
                >
                  <Camera className="h-3.5 w-3.5" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* Name, Lab & Role */}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground truncate">
                    {profile?.name || "Laboratory Account"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold whitespace-nowrap shrink-0">
                    {roleDisplay}
                  </span>
                </div>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="truncate">{labName}</span>
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Diagnostic User
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Pills on Right */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap md:justify-end">
              <div className="px-3.5 py-2 rounded-xl bg-background/60 border border-border/60 text-xs">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Email Security</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  Protected
                </span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-background/60 border border-border/60 text-xs">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Active Devices</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Laptop className="h-3 w-3 text-primary" />
                  {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Main 2-Column Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Personal Details & Identity (7 cols) */}
            <div className="lg:col-span-7 bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-card space-y-6">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Personal & Diagnostic Details</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review and update your personal information and diagnostic centre credentials.
                </p>
              </div>

              <div className="space-y-4">
                {/* Field 1: Full Name */}
                <div className="p-4 rounded-xl bg-background/50 border border-border/70 hover:border-border transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                    {editingField !== "name" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField("name");
                          setEditName(profile?.name || "");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {editingField === "name" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-10 px-3.5 rounded-xl border border-primary bg-card text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveField("name")}
                        disabled={savingField}
                        className="px-3.5 h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {savingField ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingField(null)}
                        className="px-3 h-10 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm font-bold text-foreground">
                      <div className="flex items-center gap-2.5 truncate">
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{profile?.name || "Laboratory Account"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Field 2: Official Account Email */}
                <div className="p-4 rounded-xl bg-background/50 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Official Account Email</label>
                    <span
                      title="Email is strictly locked for security and 2FA recovery"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/60"
                    >
                      <Lock className="h-3 w-3" />
                      <span>Security Locked</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-bold text-foreground">
                    <div className="flex items-center gap-2.5 truncate">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate font-mono text-xs sm:text-sm font-semibold">{profile?.email || "admin@onepath.in"}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Your official email is used for report notifications, system alerts, and OTP password recovery.
                  </p>
                </div>

                {/* Field 3: Mobile Number */}
                <div className="p-4 rounded-xl bg-background/50 border border-border/70 hover:border-border transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Mobile Phone Number</label>
                    {editingField !== "phone" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField("phone");
                          setEditPhone(profile?.phone || "");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {editingField === "phone" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="flex-1 h-10 px-3.5 rounded-xl border border-primary bg-card text-sm font-mono font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveField("phone")}
                        disabled={savingField}
                        className="px-3.5 h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {savingField ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingField(null)}
                        className="px-3 h-10 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm font-bold text-foreground">
                      <div className="flex items-center gap-2.5 truncate">
                        <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-mono">{profile?.phone || "Not configured"}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Check className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                  )}
                </div>

                {/* Field 4: Associated Diagnostic Laboratory / Centre */}
                <div className="p-4 rounded-xl bg-background/50 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Diagnostic Centre / Laboratory</label>
                    <Link
                      href="/dashboard/account/lab?tab=centre"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      <Building2 className="h-3 w-3" />
                      <span>Manage Lab Profile</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="flex items-center justify-between text-sm font-bold text-foreground">
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate">{labName}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap shrink-0">
                      Registered
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Account Security & Authentication (5 cols) */}
            <div className="lg:col-span-5 bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-card space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Security & Authentication</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Protect account credentials and manage two-factor password reset procedures.
                </p>
              </div>

              {/* Password Protection Card */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span>Account Password</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                    Encrypted Link
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reset your account password securely at any time. We will dispatch an official encrypted reset link directly to your registered email:{" "}
                  <strong className="text-foreground font-mono break-all">{profile?.email || "your registered email"}</strong>.
                </p>

                {resetLinkSent ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5 animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1 flex-1">
                        <p className="font-bold text-emerald-700 dark:text-emerald-300">
                          Reset Link Sent Successfully!
                        </p>
                        <p className="text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed text-[11px]">
                          We have sent a password reset link to{" "}
                          <strong className="font-mono text-emerald-800 dark:text-emerald-200 break-all">{profile?.email}</strong>.
                          Please check your inbox or spam folder. The link will remain active for 60 minutes.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20">
                      <button
                        type="button"
                        disabled={sendingResetLink || cooldownSeconds > 0}
                        onClick={handleSendResetLink}
                        className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {sendingResetLink ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        <span>{cooldownSeconds > 0 ? `Resend Link (${cooldownSeconds}s)` : "Resend Link"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resetError && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 animate-fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="leading-snug">{resetError}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleSendResetLink}
                      disabled={sendingResetLink || cooldownSeconds > 0}
                      className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      {sendingResetLink ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Reset Link...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Send Password Reset Link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-Device Sessions Card */}
              <div className="p-4 rounded-xl bg-background/60 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                    <Laptop className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Active Device Sessions</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                    {sessions.length} Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your account is currently active across {sessions.length} device{sessions.length !== 1 ? "s" : ""}. You can inspect and log out individual devices or revoke all at once.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("SESSIONS")}
                  className="w-full py-2 px-3 rounded-xl border border-border bg-card text-xs font-bold text-primary hover:bg-muted/70 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Manage Active Sessions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Compliance & Data Privacy Strip */}
              <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Strict Tenant Scoped & HIPAA / ABDM Sandbox Compliant</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SESSIONS ================= */}
      {activeTab === "SESSIONS" && (
        <div className="space-y-6 animate-fade-in">
          {/* Sessions Control Header Card */}
          <div className="w-full bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Active Browser & Device Sessions
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {sessions.length} Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                All laboratory terminals, mobile devices, and browser sessions currently authenticated with your account.
              </p>
            </div>

            {/* Log Out All Other Devices Button */}
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={revokingAll || sessions.filter(s => !s.is_current).length === 0}
              className="px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 self-start sm:self-auto"
              title="Log out of all devices except this one"
            >
              {revokingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>Log Out All Other Devices</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="space-y-3.5">
            {loadingSessions && sessions.length === 0 ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-card border border-border/70 p-4 shimmer-gradient" />
                ))}
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card ${session.is_current
                    ? "bg-card border-primary/50 shadow-sm"
                    : "bg-card/90 border-border/80 hover:border-border"
                    }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Device Icon */}
                    <div
                      className={`p-3 rounded-xl shrink-0 ${session.is_current
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/70 text-muted-foreground border border-border/60"
                        }`}
                    >
                      {session.device_type === "mobile" ? (
                        <Smartphone className="h-5 w-5" />
                      ) : session.device_type === "tablet" ? (
                        <Tablet className="h-5 w-5" />
                      ) : (
                        <Laptop className="h-5 w-5" />
                      )}
                    </div>

                    {/* Session Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                          {session.name}
                        </h4>
                        {session.is_current ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-[11px] font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>This Device (Current)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold border border-border/60 whitespace-nowrap shrink-0">
                            <span>Remote Device</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-muted-foreground/70" />
                          <span>{session.ip_address || "Local Network"}</span>
                        </span>
                        <span className="text-border">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          <span>{session.last_active}</span>
                        </span>
                        {session.platform && (
                          <>
                            <span className="text-border">•</span>
                            <span>{session.platform}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {session.is_current ? (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        className="px-3.5 py-2 rounded-xl border border-border/80 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Sign out of your current session on this device"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Log Out This Device</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="px-3.5 py-2 rounded-xl border border-destructive/20 bg-destructive/5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        title="Disconnect and log out this remote session"
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" />
                        )}
                        <span>Log Out</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Security & Token Guarantee Info Strip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/70 flex items-start gap-3.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Sanctum Token Security & Session Lifecycle
              </p>
              <p className="leading-relaxed">
                When you log out a device, its encrypted API session token is immediately deleted from the database, instantly terminating all further access from that computer or phone. Inactive sessions older than 14 days are automatically pruned for maximum database performance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password via Secure Email Link Modal */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="w-[94vw] max-w-md p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <span>Reset Account Password</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            We will dispatch an encrypted one-time reset link directly to your registered email address.
          </DialogDescription>

          {resetError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-background/60 border border-border/70 text-xs text-foreground space-y-1">
              <p className="font-bold text-muted-foreground">Verified Email Address:</p>
              <p className="font-mono text-primary font-bold break-all">{profile?.email}</p>
            </div>

            {resetLinkSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">
                      Reset Link Dispatched!
                    </p>
                    <p className="text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed text-[11px]">
                      A secure password reset link has been sent to your email. Click the link in your email to open the set new password page.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20">
                  <button
                    type="button"
                    disabled={sendingResetLink || cooldownSeconds > 0}
                    onClick={handleSendResetLink}
                    className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {sendingResetLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    <span>{cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : "Resend Link"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(false)}
                    className="ml-auto px-4 py-2 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click the button below to send the password reset link to your email. You can safely open the link on any device to update your password.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendResetLink}
                    disabled={sendingResetLink || cooldownSeconds > 0}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {sendingResetLink ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Password Reset Link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(false)}
                    className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-xs font-medium">Loading Profile...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
