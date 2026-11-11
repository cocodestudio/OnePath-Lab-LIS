"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Stethoscope, Smartphone, Send, CheckCircle2,
  AlertCircle, Search, Phone, ShieldCheck, Check,
  X, UserPlus, Building2, GraduationCap, ChevronRight,
  MessageCircle, Loader2, Edit3, Trash2, ExternalLink, Copy, AlertTriangle,
  Mail
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DoctorPortalItem {
  id: string | null;
  name: string;
  degree?: string | null;
  specialty?: string | null;
  clinic_hospital?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active: boolean;
  portal_token?: string | null;
  portal_is_enabled: boolean;
  portal_url?: string | null;
  whatsapp_link?: string | null;
  total_referred_patients: number;
  is_registered: boolean;
}

export default function DoctorPortalManagementPage() {
  const toast = useToast();
  const [doctors, setDoctors] = useState<DoctorPortalItem[]>([]);
  const [labInfo, setLabInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">("ALL");

  // Comprehensive Portal Access & Credentials Modal State
  const [accessModalDoctor, setAccessModalDoctor] = useState<DoctorPortalItem | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [degreeInput, setDegreeInput] = useState<string>("");
  const [clinicInput, setClinicInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("onepathlab");
  const [portalEnabled, setPortalEnabled] = useState<boolean>(true);
  const [isSavingAccess, setIsSavingAccess] = useState<boolean>(false);

  // Loading state for single doctor generation & WhatsApp dispatch
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

  // Fallback WhatsApp Web modal state
  const [fallbackModalData, setFallbackModalData] = useState<{
    isOpen: boolean;
    doctorName: string;
    phone: string;
    waLink: string;
    portalUrl: string;
    message: string;
    notice?: string;
  } | null>(null);
  const [hasCopiedLink, setHasCopiedLink] = useState<boolean>(false);

  const fetchDirectory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchFromLaravel("/doctors/portal-directory");
      if (res && res.success) {
        setDoctors(res.doctors || []);
        setLabInfo(res.lab || null);
      } else {
        throw new Error(res?.message || "Failed to load doctor portal directory.");
      }
    } catch (err: any) {
      console.error("Portal directory error:", err);
      toast.error("Error", err?.message || "Could not load doctor portal directory.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Open Portal Access & Credentials Modal
  const handleOpenAccessModal = (doc: DoctorPortalItem) => {
    setAccessModalDoctor(doc);
    setPhoneInput(doc.phone || "");
    setEmailInput(doc.email || "");
    setDegreeInput(doc.degree || "");
    setClinicInput(doc.clinic_hospital || "");
    setPasswordInput("onepathlab");
    setPortalEnabled(doc.portal_is_enabled !== false);
  };

  // Generate or save portal access & credentials
  const handleSavePortalAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessModalDoctor) return;

    setIsSavingAccess(true);
    try {
      const targetId = accessModalDoctor.id || encodeURIComponent(accessModalDoctor.name);
      const res = await fetchFromLaravel(`/doctors/${targetId}/portal-token`, {
        method: "POST",
        body: JSON.stringify({
          name: accessModalDoctor.name,
          phone: phoneInput.trim() || undefined,
          email: emailInput.trim() || undefined,
          degree: degreeInput.trim() || undefined,
          clinic_hospital: clinicInput.trim() || undefined,
          password: "onepathlab",
          portal_is_enabled: true,
        }),
      });

      if (res && res.success) {
        toast.success(
          "Portal Access Configured",
          `Portal access & credentials updated for ${accessModalDoctor.name} (Default Password: onepathlab).`
        );
        setAccessModalDoctor(null);
        await fetchDirectory();
      } else {
        throw new Error(res?.message || "Failed to update doctor portal access.");
      }
    } catch (err: any) {
      console.error("Save portal access error:", err);
      toast.error("Error", err?.message || "Could not save doctor portal access.");
    } finally {
      setIsSavingAccess(false);
    }
  };

  // Direct WhatsApp Send via Meta Official Cloud API with credentials included
  const handleSendWhatsApp = async (doc: DoctorPortalItem) => {
    if (!doc.phone || doc.phone.trim().length < 8) {
      handleOpenAccessModal(doc);
      return;
    }

    const cleanP = (doc.phone || "").replace(/[^0-9]/g, "").replace(/^0+/, "");
    const finalPhone = cleanP.length === 10 ? `91${cleanP}` : cleanP;
    const docNameClean = doc.name.replace(/^(dr\.?|doctor)\s+/i, "").trim() || "Doctor";
    const defaultPortalUrl = "https://doctor.onepathlab.com";
    const labName = labInfo?.name || "OnePath Diagnostic Lab";
    const defaultFallbackMsg = `Dear Dr. ${docNameClean},\n\nYour digital Doctor Portal access from ${labName} is ready:\n👉 Portal Link: https://doctor.onepathlab.com\n\nPlease visit the link and login with your mobile number (+${finalPhone}) via OTP to view and download diagnostic reports for all your referred patients online.\n\nThank you,\nRegards, ${labName} Team.`;
    const defaultWaLink = doc.whatsapp_link || (finalPhone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(defaultFallbackMsg)}` : "");

    try {
      setSendingWhatsAppId(doc.id || doc.name);
      const targetId = doc.id || encodeURIComponent(doc.name);
      const res = await fetchFromLaravel(`/doctors/${targetId}/send-portal-whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          name: doc.name,
          phone: doc.phone,
        }),
      });

      const waLink = res?.whatsapp_link || defaultWaLink;
      const portalUrl = res?.portal_url || defaultPortalUrl;

      if (res && res.success && res.api_dispatched) {
        toast.success(
          "WhatsApp Delivered",
          res.message || `Doctor Portal link & credentials sent directly to Dr. ${doc.name} on WhatsApp (+${doc.phone})!`
        );
        await fetchDirectory();
      } else {
        const noticeMessage = res?.message || "Meta Cloud API delivery notice. Click below to send via WhatsApp Web / App.";

        setFallbackModalData({
          isOpen: true,
          doctorName: doc.name,
          phone: doc.phone || "",
          waLink: waLink || "",
          portalUrl: portalUrl || "",
          message: noticeMessage,
          notice: res?.notice || res?.message,
        });
        await fetchDirectory();
      }
    } catch (err: any) {
      console.error("Send WhatsApp error:", err);
      setFallbackModalData({
        isOpen: true,
        doctorName: doc.name,
        phone: doc.phone || "",
        waLink: defaultWaLink || "",
        portalUrl: defaultPortalUrl || "",
        message: err?.message || "WhatsApp gateway connection notice. Please share via WhatsApp Web below.",
      });
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  // Revoke or suspend portal access
  const handleRevokeAccess = async (doc: DoctorPortalItem) => {
    if (!doc.id) return;
    if (!confirm(`Are you sure you want to suspend/revoke portal access for ${doc.name}? They will no longer be able to log in.`)) {
      return;
    }

    try {
      setGeneratingId(doc.id);
      const res = await fetchFromLaravel(`/doctors/${doc.id}/portal-token`, {
        method: "DELETE",
      });

      if (res && res.success) {
        toast.success("Access Revoked", `Portal access revoked for ${doc.name}.`);
        await fetchDirectory();
      } else {
        throw new Error(res?.message || "Failed to revoke access.");
      }
    } catch (err: any) {
      console.error("Revoke error:", err);
      toast.error("Error", err?.message || "Could not revoke portal access.");
    } finally {
      setGeneratingId(null);
    }
  };

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        (doc.phone && doc.phone.includes(q)) ||
        (doc.email && doc.email.toLowerCase().includes(q)) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(q)) ||
        (doc.clinic_hospital && doc.clinic_hospital.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") {
        return !!doc.portal_token && doc.portal_is_enabled;
      }
      if (statusFilter === "PENDING") {
        return !doc.portal_token || !doc.portal_is_enabled;
      }

      return true;
    });
  }, [doctors, search, statusFilter]);

  // Metrics (Clean 2-card stats)
  const totalDoctors = doctors.length;
  const activeTokensCount = doctors.filter((d) => d.portal_token && d.portal_is_enabled).length;

  return (
    <div className="space-y-6 w-full pb-20">
      {/* ── Page Header ── */}
      <div className="border-b border-border/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-3.5 h-3.5" />
          </span>
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Referral Doctors Digital Network
          </p>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
          Doctor Portal Access & WhatsApp Links
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Assign, manage, and revoke doctor portal access with email/phone credentials (default password: <code className="font-mono font-bold text-primary">onepathlab</code>) and 1-click WhatsApp delivery.
        </p>
      </div>

      {/* ── Top Metric KPI Cards (2 Cleanly Aligned Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Referral Doctors</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Stethoscope className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground mt-2">{totalDoctors}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Associated clinicians in your laboratory database</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Doctor Portals</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {activeTokensCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeTokensCount === totalDoctors
              ? "All referral doctors have active portal access"
              : `${totalDoctors - activeTokensCount} doctors pending setup / inactive`}
          </p>
        </div>
      </div>

      {/* ── Toolbar: Search & Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/80 bg-card">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctor name, phone, email, hospital..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60 self-start sm:self-auto">
          {[
            { id: "ALL", label: `All (${doctors.length})` },
            { id: "ACTIVE", label: `Active (${activeTokensCount})` },
            { id: "PENDING", label: `Needs Setup (${doctors.length - activeTokensCount})` },
          ].map((chip) => {
            const isSelected = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Doctors Directory List ── */}
      {isLoading ? (
        <div className="p-12 text-center border border-border/80 rounded-2xl bg-card">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground font-medium mt-3">Loading referral doctors directory...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl bg-card">
          <Stethoscope className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-foreground mt-3">No Referral Doctors Found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? `No doctors match the search term "${search}". Try clearing filters.`
              : "No referral doctors found in your database. Add doctors during patient registration or referral management."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDoctors.map((doc) => {
            const isGenerating = generatingId === (doc.id || doc.name);
            const isSendingWhatsApp = sendingWhatsAppId === (doc.id || doc.name);
            const hasActiveLink = !!doc.portal_token && doc.portal_is_enabled;
            const hasPhone = !!doc.phone && doc.phone.trim().length >= 8;

            return (
              <div
                key={doc.id || doc.name}
                className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-border transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* ── Left: Doctor Identity & Demographics ── */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-sm shadow-xs border border-emerald-500/15">
                    {doc.name.replace(/^(dr\.?|doctor)\s+/i, "").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-1">
                    {/* Doctor Name & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                        {doc.name}
                      </h3>
                      {doc.degree && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {doc.degree}
                        </span>
                      )}
                      {doc.specialty && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                          {doc.specialty}
                        </span>
                      )}
                      {hasActiveLink ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Portal</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Setup Needed
                        </span>
                      )}
                    </div>

                    {/* Sub-details: Clinic, Phone, Email */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {doc.clinic_hospital && (
                        <span className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{doc.clinic_hospital}</span>
                        </span>
                      )}

                      {hasPhone && (
                        <span className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{doc.phone}</span>
                        </span>
                      )}

                      {doc.email && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                          <span className="truncate max-w-[180px]">{doc.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Right: Cleanly Managed Actions ── */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 w-full lg:w-auto shrink-0">
                  {!hasActiveLink ? (
                    /* When portal access is NOT set up yet ("Setup Needed"): Show ONLY Setup Access */
                    <button
                      type="button"
                      onClick={() => handleOpenAccessModal(doc)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      title="Setup Doctor Portal Access & Credentials"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Setup Access</span>
                    </button>
                  ) : (
                    /* Once setup is completed / active: Show Send WhatsApp, Manage Access, and Revoke */
                    <>
                      {/* WhatsApp Direct Action */}
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(doc)}
                        disabled={isSendingWhatsApp || isGenerating}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title="Send Portal credentials & link to doctor's WhatsApp"
                      >
                        {isSendingWhatsApp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{isSendingWhatsApp ? "Sending..." : "Send WhatsApp"}</span>
                      </button>

                      {/* Manage Access Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAccessModal(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shrink-0"
                        title="Manage Portal Credentials & Contact Details"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Manage Access</span>
                      </button>

                      {/* Direct Revoke / Suspend Access Button */}
                      {doc.id && (
                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(doc)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          title="Revoke / Suspend Doctor Portal Access"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Revoke</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Dialog: Comprehensive Portal Access & Credentials ── */}
      <Dialog open={!!accessModalDoctor} onOpenChange={(open) => !open && setAccessModalDoctor(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {accessModalDoctor?.portal_token && accessModalDoctor?.portal_is_enabled
                ? "Manage Doctor Portal Access"
                : "Setup Doctor Portal Access"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {accessModalDoctor?.portal_token && accessModalDoctor?.portal_is_enabled
                ? `Update contact details and credentials for ${accessModalDoctor?.name}.`
                : `Configure portal access and contact details to enable digital portal for ${accessModalDoctor?.name}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePortalAccess} className="space-y-4 pt-2">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Doctor Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="doctor@onepathlab.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1">
                Doctor can log in using this email address and the portal password.
              </p>
            </div>

            {/* Mobile / WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                WhatsApp Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  +91
                </span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1">
                Used for phone number login, WhatsApp OTP, and 1-click report links.
              </p>
            </div>

            {/* Degree & Hospital Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Degree / Qualification
                </label>
                <input
                  type="text"
                  value={degreeInput}
                  onChange={(e) => setDegreeInput(e.target.value)}
                  placeholder="e.g. MBBS, MD"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Clinic / Hospital
                </label>
                <input
                  type="text"
                  value={clinicInput}
                  onChange={(e) => setClinicInput(e.target.value)}
                  placeholder="e.g. City Hospital"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Default Password Info Notice */}
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Default Password: <strong className="font-mono text-foreground">onepathlab</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                Auto Assigned
              </span>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setAccessModalDoctor(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingAccess}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingAccess ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  {accessModalDoctor?.portal_token && accessModalDoctor?.portal_is_enabled
                    ? "Save Changes"
                    : "Save & Grant Access"}
                </span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal Dialog: WhatsApp Web / Direct Link Fallback ── */}
      <Dialog
        open={!!fallbackModalData?.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFallbackModalData(null);
            setHasCopiedLink(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <MessageCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Share Portal on WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send access link & credentials to <span className="font-semibold text-foreground">{fallbackModalData?.doctorName}</span> (+91 {fallbackModalData?.phone}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {fallbackModalData?.notice && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">WhatsApp Delivery Notice:</p>
                  <p className="text-[11px] leading-relaxed opacity-90">{fallbackModalData.notice}</p>
                </div>
              </div>
            )}

            {fallbackModalData?.waLink ? (
              <a
                href={fallbackModalData.waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  toast.success("WhatsApp Opening", "Launching WhatsApp Web / App...");
                }}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Open in WhatsApp Web / App</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}

            {/* Direct Link Copy */}
            <div className="p-3.5 rounded-2xl border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Direct Doctor Portal URL</span>
                <button
                  type="button"
                  onClick={() => {
                    if (fallbackModalData?.portalUrl) {
                      navigator.clipboard.writeText(fallbackModalData.portalUrl);
                      setHasCopiedLink(true);
                      toast.success("Copied", "Portal link copied to clipboard.");
                      setTimeout(() => setHasCopiedLink(false), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {hasCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedLink ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground break-all bg-background p-2 rounded-xl border border-border/60">
                {fallbackModalData?.portalUrl || "Generating..."}
              </p>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setFallbackModalData(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Close
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
