"use client";

import React, { useState, useEffect } from "react";
import {
  Building2, PlusCircle, RefreshCw, Trash2, KeyRound, Eye, EyeOff,
  Copy, Check, ShieldCheck, Phone, Mail, Calendar, AlertCircle,
  Loader2, Sparkles, MapPin, CheckCircle2, UserCheck, ArrowLeft,
  X, Lock, Shield, Sliders
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";

interface CollectionCenter {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "suspended";
  role?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

export function CollectionCentersTab() {
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // In-Page View Mode: "LIST" | "ADD" | "EDIT" (NO dialog modals!)
  const [viewMode, setViewMode] = useState<"LIST" | "ADD" | "EDIT">("LIST");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Add Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [showPassword, setShowPassword] = useState(false);

  // Edit Form State
  const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadCenters = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel("/collection-centers");
      const list = Array.isArray(data) ? data : (data?.data || []);
      setCenters(list);
    } catch (err: any) {
      console.error("Failed to load collection centers:", err);
      setToast({ text: "Failed to load collection centers", type: "error" });
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
        }),
      });

      setToast({ text: res?.message || "Collection Center created successfully!", type: "success" });
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setStatus("active");
      setShowPassword(false);
      setViewMode("LIST");
      loadCenters();
    } catch (err: any) {
      setToast({ text: err?.message || "Error creating collection center", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditView = (c: CollectionCenter) => {
    setEditingCenter(c);
    setEditName(c.name || "");
    setEditPhone(c.phone || "");
    setEditStatus(c.status || "active");
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
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetchFromLaravel(`/collection-centers/${editingCenter.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setToast({ text: res?.message || "Collection Center updated successfully", type: "success" });
      setViewMode("LIST");
      setEditingCenter(null);
      loadCenters();
    } catch (err: any) {
      setToast({ text: err?.message || "Error updating collection center", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCenter = async (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"? This center's staff will no longer be able to log in.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await fetchFromLaravel(`/collection-centers/${id}`, {
        method: "DELETE",
      });
      setToast({ text: "Collection center removed successfully", type: "success" });
      setCenters((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setToast({ text: err?.message || "Failed to remove collection center", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const copyCredentials = (c: CollectionCenter) => {
    const text = `OnePath LIS Collection Center Login:\nURL: ${window.location.origin}/login\nUser ID / Email: ${c.email}\nStatus: ${c.status.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2500);
    setToast({ text: `Login details for "${c.name}" copied to clipboard!`, type: "success" });
  };

  const activeCount = centers.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: FULL-WIDTH IN-PAGE "ADD COLLECTION CENTER" FORM (NO DIALOG MODAL) */}
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
                title="Back to Centers List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>Register New Collection Center</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create a dedicated terminal login for remote sample collection staff or hospital franchises.
                </p>
              </div>
            </div>
          </div>

          {/* Full-width Form Body */}
          <form onSubmit={handleCreateCenter} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Center Information */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Center & Contact Details</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Name of the branch or franchise collection unit.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Center / Franchise Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Diagnostic Center - North Branch"
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
              </div>

              {/* Card 2: Login Credentials */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span>Terminal Login Credentials</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Staff uses these credentials on the LIS Login page.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Staff Login User ID (Email) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. apex.north@onepathlab.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground">This will be the unique login username for this collection center.</p>
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
                    Staff will select <strong className="text-foreground">"Collection Center"</strong> on the LIS login page and enter these credentials to start registering patient samples.
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
                <span>Create Collection Center</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================== */}
      {/* VIEW 2: FULL-WIDTH IN-PAGE "EDIT COLLECTION CENTER" FORM (NO DIALOG MODAL) */}
      {/* ========================================================================== */}
      {viewMode === "EDIT" && editingCenter && (
        <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden animate-fade-in">
          {/* Header with Back Button */}
          <div className="p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setViewMode("LIST"); setEditingCenter(null); }}
                className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Back to Centers List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <span>Edit Collection Center: {editingCenter.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update branch contact information or reset staff password.
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
              {/* Card 1: Details */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Center Information</span>
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Center Name *</label>
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
                  <label className="text-xs font-bold text-foreground">Terminal Operational Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "active" | "suspended")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                  >
                    <option value="active">Active (Access allowed)</option>
                    <option value="suspended">Suspended (Access blocked)</option>
                  </select>
                </div>
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
      {/* VIEW 3: MAIN LIST VIEW (ONLY ONE PROMINENT "+ ADD CENTER" BUTTON)          */}
      {/* ========================================================================= */}
      {viewMode === "LIST" && (
        <>
          {/* Clean Metric Stats Cards (No redundant button inside!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Collection Centers</p>
                <p className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">{centers.length}</p>
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
            {/* Table Header: EXACTLY ONE "ADD COLLECTION CENTER" BUTTON */}
            <div className="p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Collection Centers & Staff Terminals</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                    {centers.length} Centers
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Remote collection centers and hospital franchises can log in using their credentials to register patient samples.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs cursor-pointer"
                  title="Refresh Center List"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                </button>

                {/* THE ONLY ONE "ADD COLLECTION CENTER" BUTTON */}
                <button
                  type="button"
                  onClick={() => setViewMode("ADD")}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Collection Center</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">Loading collection centers...</p>
              </div>
            ) : centers.length === 0 ? (
              /* Empty State */
              <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-4">
                  <Building2 className="h-8 w-8 text-primary/70" />
                </div>
                <h4 className="text-base font-bold text-foreground">No Collection Centers Added Yet</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                  Click the <strong>"Add Collection Center"</strong> button above to create login credentials for your satellite collection points or franchise clinics.
                </p>
              </div>
            ) : (
              /* Table of Centers */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-5">Center / Franchise Name</th>
                      <th className="py-3 px-4">Login User ID (Email)</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Terminal Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs font-medium">
                    {centers.map((c) => {
                      const createdDate = c.created_at || c.createdAt;
                      const dateStr = createdDate
                        ? new Date(createdDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—";
                      const isActive = c.status === "active";

                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-sm leading-tight">{c.name}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                  <MapPin className="h-3 w-3" /> Branch / Client Terminal
                                </span>
                              </div>
                            </div>
                          </td>

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

                          <td className="py-4 px-4 text-foreground font-medium">
                            {c.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-muted-foreground" /> {c.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Not provided</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                              {isActive ? "Active Terminal" : "Suspended"}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-muted-foreground text-[11px]">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {dateStr}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditView(c)}
                                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Edit Center / Change Password"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCenter(c.id, c.name)}
                                disabled={deletingId === c.id}
                                className="p-1.5 rounded-lg border border-border bg-card text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                title="Remove Center"
                              >
                                {deletingId === c.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
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
