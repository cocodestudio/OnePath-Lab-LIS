"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2, PlusCircle, RefreshCw, Trash2, KeyRound, Eye, EyeOff,
  Copy, Check, ShieldCheck, Phone, Mail, Calendar, AlertCircle,
  Loader2, Sparkles, MapPin, CheckCircle2, UserCheck, ArrowLeft,
  X, Lock, Shield, Sliders, Briefcase, Filter, Layers, Users
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

interface CollectionCenter {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "suspended";
  role?: "COLLECTION_CENTER" | "B2B" | string;
  rate_tier?: "HIGH" | "MEDIUM" | "LOW" | string;
  rateTier?: "HIGH" | "MEDIUM" | "LOW" | string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export function CollectionCentersTab() {
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();
  const setToast = React.useCallback((input: { text: string; type: "success" | "error" } | null) => {
    if (!input) return;
    if (input.type === "success") {
      toastSuccess(input.text);
    } else {
      toastError(input.text);
    }
  }, [toastSuccess, toastError]);

  // In-Page View Mode: "LIST" | "ADD" | "EDIT"
  const [viewMode, setViewMode] = useState<"LIST" | "ADD" | "EDIT">("LIST");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Filter: ALL | B2B | COLLECTION_CENTER
  const [roleFilter, setRoleFilter] = useState<"ALL" | "B2B" | "COLLECTION_CENTER">("ALL");

  // Add Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [role, setRole] = useState<"COLLECTION_CENTER" | "B2B">("B2B");
  const [rateTier, setRateTier] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [showPassword, setShowPassword] = useState(false);

  // Edit Form State
  const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editRole, setEditRole] = useState<"COLLECTION_CENTER" | "B2B">("B2B");
  const [editRateTier, setEditRateTier] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    loadCenters();
  }, []);



  const loadCenters = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel("/collection-centers");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setCenters(list);
    } catch (err: any) {
      console.error("Failed to load accounts:", err);
      setToast({ text: "Failed to load RBAC partner accounts", type: "error" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCenters();
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setToast({ text: "Please fill in all required fields", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetchFromLaravel("/collection-centers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          status,
          role,
          rate_tier: rateTier,
        }),
      });

      const roleLabel = role === "B2B" ? "B2B Partner" : "Collection Center";
      setToast({ text: res?.message || `${roleLabel} created successfully!`, type: "success" });
      
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setStatus("active");
      setRole("B2B");
      setRateTier("HIGH");
      setShowPassword(false);
      setViewMode("LIST");
      loadCenters();
    } catch (err: any) {
      setToast({ text: err?.message || "Error creating account", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditView = (c: CollectionCenter) => {
    setEditingCenter(c);
    setEditName(c.name || "");
    setEditPhone(c.phone || "");
    setEditStatus(c.status || "active");
    setEditRole((c.role as any) === "B2B" ? "B2B" : "COLLECTION_CENTER");
    const rawTier = c.rate_tier || c.rateTier || "HIGH";
    setEditRateTier(rawTier.toUpperCase() === "LOW" ? "LOW" : rawTier.toUpperCase() === "MEDIUM" ? "MEDIUM" : "HIGH");
    setEditPassword("");
    setShowEditPassword(false);
    setViewMode("EDIT");
  };

  const handleUpdateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCenter) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: editName.trim(),
        phone: editPhone.trim(),
        status: editStatus,
        role: editRole,
        rate_tier: editRateTier,
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetchFromLaravel(`/collection-centers/${editingCenter.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const roleLabel = editRole === "B2B" ? "B2B Partner" : "Collection Center";
      setToast({ text: res?.message || `${roleLabel} updated successfully`, type: "success" });
      setViewMode("LIST");
      setEditingCenter(null);
      loadCenters();
    } catch (err: any) {
      setToast({ text: err?.message || "Error updating account details", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCenter = async (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"? This user will no longer be able to log in.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await fetchFromLaravel(`/collection-centers/${id}`, {
        method: "DELETE",
      });
      setToast({ text: "Account removed successfully", type: "success" });
      setCenters((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setToast({ text: err?.message || "Failed to remove account", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const copyCredentials = (c: CollectionCenter) => {
    const isB2B = c.role === "B2B";
    const roleLabel = isB2B ? "B2B Partner" : "Collection Center";
    const tabName = isB2B ? "B2B" : "Collection Center";
    const text = `OnePath LIS ${roleLabel} Login:\nURL: ${window.location.origin}/login\nSelect Tab: ${tabName}\nUser ID / Email: ${c.email}\nStatus: ${c.status.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2500);
    setToast({ text: `Login credentials for "${c.name}" copied!`, type: "success" });
  };

  const activeCount = centers.filter((c) => c.status === "active").length;
  const b2bCount = centers.filter((c) => c.role === "B2B").length;
  const ccCount = centers.filter((c) => c.role === "COLLECTION_CENTER" || !c.role).length;

  const filteredCenters = useMemo(() => {
    return centers.filter((c) => {
      if (roleFilter === "ALL") return true;
      if (roleFilter === "B2B") return c.role === "B2B";
      if (roleFilter === "COLLECTION_CENTER") return c.role === "COLLECTION_CENTER" || !c.role;
      return true;
    });
  }, [centers, roleFilter]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ========================================================================= */}
      {/* VIEW 1: FULL-WIDTH IN-PAGE "ADD PARTNER / USER" FORM                      */}
      {/* ========================================================================= */}
      {viewMode === "ADD" && (
        <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden animate-fade-in">
          {/* Header with Back Button */}
          <div className="p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Back to Accounts List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Register New RBAC Account (B2B / Collection Center)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create role-based login credentials for B2B client labs, doctors, clinics, or internal phlebotomy centers.
                </p>
              </div>
            </div>
          </div>

          {/* Full-width Form Body */}
          <form onSubmit={handleCreateCenter} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Account Information & Role Selection */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Organization & Role Configuration</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Define entity identity and permission level.</p>
                </div>

                {/* Role Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Role / Access Type *</span>
                    <span className="text-[10px] font-mono text-primary font-bold">RBAC PRIVILEGE</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "COLLECTION_CENTER" | "B2B")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-bold focus:border-primary outline-none transition-colors cursor-pointer text-foreground"
                  >
                    <option value="B2B">B2B Partner (Client Lab / Clinic / Doctor)</option>
                    <option value="COLLECTION_CENTER">Collection Center (Phlebotomy Branch)</option>
                  </select>
                  <div className="p-2.5 rounded-lg bg-background border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
                    {role === "B2B" ? (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        ✦ <strong>B2B Partner:</strong> Access to patient sample booking, live diagnostic tracking, reports download, and dedicated B2B sales/margin revenue module.
                      </span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        ✦ <strong>Collection Center:</strong> Access to sample accessioning, phlebotomy tracking, and authorized patient report printing.
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {role === "B2B" ? "B2B Lab / Clinic Name *" : "Collection Center Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === "B2B" ? "e.g. Apex Diagnostics & Polyclinic" : "e.g. Metro Phlebotomy Hub - North"}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Operational Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "suspended")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                  >
                    <option value="active">Active (Full terminal access granted)</option>
                    <option value="suspended">Suspended (Access temporarily blocked)</option>
                  </select>
                </div>

                {role === "B2B" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Assigned Rate Tier</span>
                      <span className="text-[10.5px] text-purple-600 dark:text-purple-400 font-bold">Confidential Tariff</span>
                    </label>
                    <select
                      value={rateTier}
                      onChange={(e) => setRateTier(e.target.value as "HIGH" | "MEDIUM" | "LOW")}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                    >
                      <option value="HIGH">High Tier Rate List (Default wholesale rate)</option>
                      <option value="MEDIUM">Medium Tier Rate List (Moderate concession rate)</option>
                      <option value="LOW">Low Tier Rate List (Lowest wholesale concession)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      This partner will only see and be charged their assigned tier rates in their B2B portal.
                    </p>
                  </div>
                )}
              </div>

              {/* Card 2: Security & Login Credentials */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span>Security & Login Credentials</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">User will log in using these credentials.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Login User ID (Email) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. partner@apexdiagnostics.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground">Unique login username for this account.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Assign Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    User will select <strong className="text-foreground">"{role === "B2B" ? "B2B" : "Collection Center"}"</strong> tab on the LIS Login page and enter these credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className="px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Create {role === "B2B" ? "B2B Partner" : "Collection Center"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FULL-WIDTH IN-PAGE "EDIT PARTNER / USER" FORM                      */}
      {/* ========================================================================= */}
      {viewMode === "EDIT" && editingCenter && (
        <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden animate-fade-in">
          {/* Header with Back Button */}
          <div className="p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setViewMode("LIST"); setEditingCenter(null); }}
                className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Back to Accounts List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <span>Edit Account: {editingCenter.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update role permissions, contact information, or reset password.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setViewMode("LIST"); setEditingCenter(null); }}
              className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer self-start sm:self-auto"
            >
              Cancel
            </button>
          </div>

          {/* Full-width Form Body */}
          <form onSubmit={handleUpdateCenter} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Details & Role */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Account & Role Details</span>
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Role / Access Level *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "COLLECTION_CENTER" | "B2B")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-bold focus:border-primary outline-none transition-colors cursor-pointer text-foreground"
                  >
                    <option value="B2B">B2B Partner (Client Lab / Clinic / Doctor)</option>
                    <option value="COLLECTION_CENTER">Collection Center (Phlebotomy Branch)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Organization / Partner Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Operational Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "active" | "suspended")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                  >
                    <option value="active">Active (Access allowed)</option>
                    <option value="suspended">Suspended (Access blocked)</option>
                  </select>
                </div>

                {editRole === "B2B" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Assigned Rate Tier</span>
                      <span className="text-[10.5px] text-purple-600 dark:text-purple-400 font-bold">Confidential Tariff</span>
                    </label>
                    <select
                      value={editRateTier}
                      onChange={(e) => setEditRateTier(e.target.value as "HIGH" | "MEDIUM" | "LOW")}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                    >
                      <option value="HIGH">High Tier Rate List (Default wholesale rate)</option>
                      <option value="MEDIUM">Medium Tier Rate List (Moderate concession rate)</option>
                      <option value="LOW">Low Tier Rate List (Lowest wholesale concession)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      This partner will strictly see ONLY their assigned tier's rates in their B2B portal.
                    </p>
                  </div>
                )}
              </div>

              {/* Card 2: Login & Password Reset */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span>Login & Password Reset</span>
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Login User ID (Email)</label>
                  <input
                    type="text"
                    disabled
                    value={editingCenter.email}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/60 border border-border text-sm font-semibold text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">User ID cannot be changed once created.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Change Password (Leave blank to keep existing)</label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      minLength={6}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Enter new password to reset"
                      className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/70 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setViewMode("LIST"); setEditingCenter(null); }}
                className="px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MAIN LIST VIEW (METRICS, FILTER TABS & ACCOUNTS TABLE)            */}
      {/* ========================================================================= */}
      {viewMode === "LIST" && (
        <>
          {/* Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total RBAC Accounts</p>
                <p className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">{centers.length}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">B2B Partner Labs</p>
                <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight mt-0.5">{b2bCount}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Collection Centers</p>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight mt-0.5">{ccCount}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Terminals</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">{activeCount}</p>
              </div>
            </div>
          </div>

          {/* Main Container */}
          <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
            {/* Table Header: Title, Filter Pills, and Add Button */}
            <div className="p-5 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>RBAC & Partner Hub</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                    {filteredCenters.length} Accounts
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage role-based logins for B2B client diagnostic centers, clinics, and phlebotomy collection branches.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter Pills */}
                <div className="p-1 bg-background rounded-xl border border-border flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRoleFilter("ALL")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({centers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("B2B")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === "B2B" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    B2B ({b2bCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("COLLECTION_CENTER")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === "COLLECTION_CENTER" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Collection Centers ({ccCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs cursor-pointer"
                  title="Refresh Accounts"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("ADD")}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Partner / Terminal</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">Loading RBAC partner accounts...</p>
              </div>
            ) : filteredCenters.length === 0 ? (
              /* Empty State */
              <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-4">
                  <Shield className="h-8 w-8 text-primary/70" />
                </div>
                <h4 className="text-base font-bold text-foreground">No Accounts Found</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                  Click the <strong>"Add Partner / Terminal"</strong> button above to register B2B client labs or branch collection centers.
                </p>
              </div>
            ) : (
              /* Table of Accounts */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-5">Organization / Partner</th>
                      <th className="py-3 px-4">Role / Access</th>
                      <th className="py-3 px-4">Rate Tier</th>
                      <th className="py-3 px-4">Login User ID (Email)</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs font-medium">
                    {filteredCenters.map((c) => {
                      const createdDate = c.created_at || c.createdAt;
                      const dateStr = createdDate
                        ? new Date(createdDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—";
                      const isActive = c.status === "active";
                      const isB2B = c.role === "B2B";

                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                          {/* Name */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                isB2B ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}>
                                {isB2B ? <Briefcase className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-sm leading-tight">{c.name}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                  <MapPin className="h-3 w-3" /> {isB2B ? "B2B Client Lab / Partner" : "Phlebotomy Collection Point"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-4 px-4">
                            {isB2B ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                <Briefcase className="h-3 w-3" />
                                <span>B2B Partner</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <Building2 className="h-3 w-3" />
                                <span>Collection Center</span>
                              </span>
                            )}
                          </td>

                          {/* Rate Tier Badge */}
                          <td className="py-4 px-4">
                            {isB2B ? (
                              (() => {
                                const t = (c.rate_tier || c.rateTier || "HIGH").toUpperCase();
                                if (t === "LOW") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      <span>Low Tier</span>
                                    </span>
                                  );
                                }
                                if (t === "MEDIUM") {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                      <span>Medium Tier</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                    <span>High Tier</span>
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">—</span>
                            )}
                          </td>

                          {/* User ID / Email */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted/60 px-2.5 py-1 rounded-lg border border-border/80 text-foreground font-semibold">
                                {c.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyCredentials(c)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Copy Login Details"
                              >
                                {copiedId === c.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-4 px-4 text-foreground font-medium">
                            {c.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-muted-foreground" /> {c.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Not provided</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                              <span>{isActive ? "Active" : "Suspended"}</span>
                            </span>
                          </td>

                          {/* Registered Date */}
                          <td className="py-4 px-4 text-muted-foreground">
                            {dateStr}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditView(c)}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:bg-muted/70 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCenter(c.id, c.name)}
                                disabled={deletingId === c.id}
                                className="p-1.5 rounded-lg border border-border/80 bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Remove Account"
                              >
                                {deletingId === c.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
