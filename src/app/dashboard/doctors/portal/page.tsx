"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Stethoscope, Smartphone, Send, CheckCircle2,
  AlertCircle, Search, Phone, ShieldCheck, Check,
  X, UserPlus, Building2, GraduationCap, ChevronRight,
  MessageCircle, Loader2, Edit3, Trash2
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

  // Phone update modal state
  const [phoneModalDoctor, setPhoneModalDoctor] = useState<DoctorPortalItem | null>(null);
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [degreeInput, setDegreeInput] = useState<string>("");
  const [clinicInput, setClinicInput] = useState<string>("");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState<boolean>(false);

  // Loading state for single doctor generation & WhatsApp dispatch
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

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

  // Generate portal token
  const handleGenerateLink = async (doc: DoctorPortalItem) => {
    try {
      setGeneratingId(doc.id || doc.name);
      const targetId = doc.id || encodeURIComponent(doc.name);
      const res = await fetchFromLaravel(`/doctors/${targetId}/portal-token`, {
        method: "POST",
        body: JSON.stringify({
          name: doc.name,
          phone: doc.phone || undefined,
        }),
      });

      if (res && res.success) {
        toast.success(
          "Access Link Ready",
          `Doctor Portal link generated for ${doc.name}.`
        );
        await fetchDirectory();
        return res.portal_url;
      } else {
        throw new Error(res?.message || "Failed to generate access link.");
      }
    } catch (err: any) {
      console.error("Generate token error:", err);
      toast.error("Error", err?.message || "Could not generate doctor portal link.");
      return null;
    } finally {
      setGeneratingId(null);
    }
  };

  // Direct WhatsApp Send via Meta Official Cloud API
  const handleSendWhatsApp = async (doc: DoctorPortalItem) => {
    if (!doc.phone || doc.phone.trim().length < 8) {
      handleOpenPhoneModal(doc);
      return;
    }

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

      if (res && res.success) {
        if (res.api_dispatched) {
          toast.success(
            "WhatsApp Delivered",
            `Doctor Portal link sent directly to Dr. ${doc.name} on WhatsApp (+${doc.phone})!`
          );
        } else {
          toast.success(
            "Link Prepared",
            res.message || "WhatsApp message prepared. Opening WhatsApp..."
          );
          if (res.whatsapp_link) {
            window.open(res.whatsapp_link, "_blank", "noopener,noreferrer");
          }
        }
        await fetchDirectory();
      } else {
        throw new Error(res?.message || "Failed to dispatch WhatsApp message.");
      }
    } catch (err: any) {
      console.error("Send WhatsApp error:", err);
      toast.error("WhatsApp Notice", err?.message || "Could not deliver WhatsApp message.");
      if (doc.whatsapp_link) {
        window.open(doc.whatsapp_link, "_blank", "noopener,noreferrer");
      }
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  // Preview Portal in new tab (auto-generate token if not active yet)
  const handlePreviewPortal = async (doc: DoctorPortalItem) => {
    if (doc.portal_url && doc.portal_is_enabled) {
      window.open(doc.portal_url, "_blank", "noopener,noreferrer");
      return;
    }

    const generatedUrl = await handleGenerateLink(doc);
    if (generatedUrl) {
      window.open(generatedUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Revoke portal access
  const handleRevokeAccess = async (doc: DoctorPortalItem) => {
    if (!doc.id) return;
    if (!confirm(`Are you sure you want to revoke portal access for ${doc.name}? They will no longer be able to open reports with this link.`)) {
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

  // Open modal to update phone / profile
  const handleOpenPhoneModal = (doc: DoctorPortalItem) => {
    setPhoneModalDoctor(doc);
    setPhoneInput(doc.phone || "");
    setDegreeInput(doc.degree || "");
    setClinicInput(doc.clinic_hospital || "");
  };

  // Save phone number and auto-generate WhatsApp link
  const handleSavePhoneAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneModalDoctor) return;

    setIsUpdatingPhone(true);
    try {
      const targetId = phoneModalDoctor.id || encodeURIComponent(phoneModalDoctor.name);
      const res = await fetchFromLaravel(`/doctors/${targetId}/portal-token`, {
        method: "POST",
        body: JSON.stringify({
          name: phoneModalDoctor.name,
          phone: phoneInput.trim(),
          degree: degreeInput.trim() || undefined,
          clinic_hospital: clinicInput.trim() || undefined,
        }),
      });

      if (res && res.success) {
        toast.success(
          "Doctor Details Updated",
          `WhatsApp portal link configured for ${phoneModalDoctor.name}.`
        );
        setPhoneModalDoctor(null);
        await fetchDirectory();
      } else {
        throw new Error(res?.message || "Failed to update doctor details.");
      }
    } catch (err: any) {
      console.error("Save phone error:", err);
      toast.error("Error", err?.message || "Could not save doctor phone number.");
    } finally {
      setIsUpdatingPhone(false);
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

  // Metrics
  const totalDoctors = doctors.length;
  const activeTokensCount = doctors.filter((d) => d.portal_token && d.portal_is_enabled).length;
  const totalReferredPatients = doctors.reduce((acc, d) => acc + (d.total_referred_patients || 0), 0);

  return (
    <div className="space-y-6 w-full pb-20">
      {/* ── Page Header (Clean, Professional & uncluttered) ── */}
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
          Give referral doctors 1-click mobile access to view and download their patient diagnostic reports with your lab letterhead. No passwords required.
        </p>
      </div>

      {/* ── Top Metric KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Referral Doctors</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Stethoscope className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground mt-2">{totalDoctors}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Associated clinicians in your database</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active WhatsApp Portals</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Send className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {activeTokensCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeTokensCount === totalDoctors
              ? "All doctors have active 1-click portal links"
              : `${totalDoctors - activeTokensCount} doctors pending invite`}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Referred Patients</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground mt-2">{totalReferredPatients}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Referred test cases & patient reports</p>
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
            placeholder="Search doctor name, phone, hospital, or specialty..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
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
                {/* ── Left: Doctor Identity & Clean Demographics ── */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-sm shadow-xs border border-emerald-500/15">
                    {doc.name.replace(/^(dr\.?|doctor)\s+/i, "").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-1">
                    {/* Doctor Name & Header Badges */}
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
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Portal</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Setup Needed
                        </span>
                      )}
                    </div>

                    {/* Clean Sub-details: Clinic, Phone, Patients */}
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

                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 mr-0.5" />
                        {doc.total_referred_patients} {doc.total_referred_patients === 1 ? "Patient" : "Patients"} Referred
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Right: Cleanly Aligned Actions ── */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 w-full lg:w-auto shrink-0">
                  {/* WhatsApp Direct Action */}
                  {hasPhone ? (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(doc)}
                      disabled={isSendingWhatsApp || isGenerating}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="Send 1-click Portal access link to doctor's WhatsApp"
                    >
                      {isSendingWhatsApp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MessageCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{isSendingWhatsApp ? "Sending..." : "Send WhatsApp"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPhoneModal(doc)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      title="Add doctor mobile number to enable WhatsApp portal access"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>+ Add Phone & Share</span>
                    </button>
                  )}

                  {/* Quick Edit Demographics (Phone / Degree / Clinic) */}
                  <button
                    type="button"
                    onClick={() => handleOpenPhoneModal(doc)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                    title="Edit Phone / Degree / Hospital"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Revoke Access (if token active) */}
                  {hasActiveLink && doc.id && (
                    <button
                      type="button"
                      onClick={() => handleRevokeAccess(doc)}
                      disabled={isGenerating}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-background hover:bg-rose-500/10 hover:border-rose-500/30 text-muted-foreground hover:text-rose-600 transition-all cursor-pointer shrink-0"
                      title="Revoke / Deactivate Portal Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Dialog: Update Phone, Degree & Profile ── */}
      <Dialog open={!!phoneModalDoctor} onOpenChange={(open) => !open && setPhoneModalDoctor(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <Phone className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Doctor Details & WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure mobile number for <span className="font-semibold text-foreground">{phoneModalDoctor?.name}</span> to enable 1-click WhatsApp portal delivery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePhoneAndGenerate} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Doctor WhatsApp Mobile Number
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
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Enter 10-digit mobile number. WhatsApp invite will be dispatched to this number.
              </p>
            </div>

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

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setPhoneModalDoctor(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingPhone}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isUpdatingPhone ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save & Configure</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
