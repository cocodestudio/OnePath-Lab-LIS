"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2, PlusCircle, RefreshCw, Trash2, KeyRound, Eye, EyeOff,
  Copy, Check, ShieldCheck, Phone, Mail, Calendar, AlertCircle,
  Loader2, Sparkles, MapPin, CheckCircle2, UserCheck, ArrowLeft,
  X, Lock, Shield, Sliders, Briefcase, Filter, Layers, Users,
  ClipboardList, CheckSquare, Square, FileText, Receipt, Barcode,
  Activity, Settings
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export type PermissionKey =
  | "can_register_patients"
  | "can_edit_demographics"
  | "can_scan_barcodes"
  | "can_manage_billing"
  | "can_print_reports"
  | "can_enter_results"
  | "can_approve_reports"
  | "can_manage_settings";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  icon: any;
  category: "Intake & Billing" | "Phlebotomy & Samples" | "Laboratory & Medical" | "Master Control";
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "can_register_patients",
    label: "Patient Registration & Test Booking",
    description: "Create new patient records, select diagnostic test panels, and generate TRF.",
    icon: ClipboardList,
    category: "Intake & Billing",
  },
  {
    key: "can_edit_demographics",
    label: "Edit Patient Demographics",
    description: "Modify patient name, age, gender, phone number, and doctor prior to final report sign-off.",
    icon: Users,
    category: "Intake & Billing",
  },
  {
    key: "can_manage_billing",
    label: "Billing, Cashier & Invoices",
    description: "Access billing tab, record cash/online collections, apply discounts, and print tax receipts.",
    icon: Receipt,
    category: "Intake & Billing",
  },
  {
    key: "can_scan_barcodes",
    label: "Scan & Attach Specimen Barcodes",
    description: "Attach primary and secondary vial barcode stickers to patient sample tubes.",
    icon: Barcode,
    category: "Phlebotomy & Samples",
  },
  {
    key: "can_print_reports",
    label: "Print Approved Reports",
    description: "Print and deliver finalized, signed diagnostic reports to patients and doctors.",
    icon: FileText,
    category: "Laboratory & Medical",
  },
  {
    key: "can_enter_results",
    label: "Enter Test Results & Machine Readings",
    description: "Record numeric parameter values, observations, and run instruments on test parameters.",
    icon: Activity,
    category: "Laboratory & Medical",
  },
  {
    key: "can_approve_reports",
    label: "Authorize & Sign-off Reports",
    description: "Pathologist electronic signature release and formal diagnostic report approval.",
    icon: ShieldCheck,
    category: "Laboratory & Medical",
  },
  {
    key: "can_manage_settings",
    label: "Master Lab Administration",
    description: "Manage lab letterhead, instruments, rates, RBAC accounts, and payment gateways.",
    icon: Settings,
    category: "Master Control",
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  RECEPTIONIST: [
    "can_register_patients",
    "can_edit_demographics",
    "can_manage_billing",
    "can_print_reports",
  ],
  COLLECTION_CENTER: [
    "can_scan_barcodes",
    "can_manage_billing",
    "can_print_reports",
  ],
  B2B: [
    "can_register_patients",
    "can_manage_billing",
    "can_print_reports",
  ],
};

interface CollectionCenter {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "suspended";
  role?: "COLLECTION_CENTER" | "B2B" | "RECEPTIONIST" | string;
  permissions?: PermissionKey[] | string[];
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

  // Filter: ALL | RECEPTIONIST | COLLECTION_CENTER | B2B
  const [roleFilter, setRoleFilter] = useState<"ALL" | "RECEPTIONIST" | "COLLECTION_CENTER" | "B2B">("ALL");

  // Add Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [role, setRole] = useState<"RECEPTIONIST" | "COLLECTION_CENTER" | "B2B">("RECEPTIONIST");
  const [permissions, setPermissions] = useState<PermissionKey[]>(ROLE_DEFAULT_PERMISSIONS.RECEPTIONIST);
  const [rateTier, setRateTier] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [showPassword, setShowPassword] = useState(false);

  // Edit Form State
  const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editRole, setEditRole] = useState<"RECEPTIONIST" | "COLLECTION_CENTER" | "B2B">("RECEPTIONIST");
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
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
      setToast({ text: "Failed to load RBAC accounts", type: "error" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCenters();
  };

  const handleRoleChange = (newRole: "RECEPTIONIST" | "COLLECTION_CENTER" | "B2B") => {
    setRole(newRole);
    setPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || []);
  };

  const handleEditRoleChange = (newRole: "RECEPTIONIST" | "COLLECTION_CENTER" | "B2B") => {
    setEditRole(newRole);
    setEditPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || []);
  };

  const togglePermission = (key: PermissionKey, isEdit = false) => {
    if (isEdit) {
      setEditPermissions((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    } else {
      setPermissions((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    }
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
          permissions,
          rate_tier: rateTier,
        }),
      });

      const roleLabel =
        role === "B2B" ? "B2B Partner" : role === "RECEPTIONIST" ? "Receptionist" : "Collection Center";
      setToast({ text: res?.message || `${roleLabel} created successfully!`, type: "success" });

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setStatus("active");
      setRole("RECEPTIONIST");
      setPermissions(ROLE_DEFAULT_PERMISSIONS.RECEPTIONIST);
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
    const activeRole = (c.role === "B2B" ? "B2B" : c.role === "COLLECTION_CENTER" ? "COLLECTION_CENTER" : "RECEPTIONIST");
    setEditRole(activeRole);

    const rawPerms = Array.isArray(c.permissions)
      ? (c.permissions as PermissionKey[])
      : ROLE_DEFAULT_PERMISSIONS[activeRole] || [];
    setEditPermissions(rawPerms);

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
        permissions: editPermissions,
      };

      if (editRole === "B2B") {
        payload.rate_tier = editRateTier;
      }
      if (editPassword) {
        payload.password = editPassword;
      }

      const res = await fetchFromLaravel(`/collection-centers/${editingCenter.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setToast({ text: res?.message || "Account updated successfully!", type: "success" });
      setViewMode("LIST");
      setEditingCenter(null);
      loadCenters();
    } catch (err: any) {
      setToast({ text: err?.message || "Error updating account", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCenter = async (id: string | number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete account "${name}"? Access will be revoked immediately.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await fetchFromLaravel(`/collection-centers/${id}`, {
        method: "DELETE",
      });
      setToast({ text: `Account "${name}" deleted.`, type: "success" });
      loadCenters();
    } catch (err: any) {
      setToast({ text: err?.message || "Failed to delete account", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const copyCredentials = (c: CollectionCenter) => {
    const credText = `OnePath Lab Terminal Credentials:\nName: ${c.name}\nRole: ${c.role}\nLogin Email: ${c.email}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(credText);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered Centers
  const filteredCenters = useMemo(() => {
    if (roleFilter === "ALL") return centers;
    return centers.filter((c) => c.role === roleFilter);
  }, [centers, roleFilter]);

  // Statistics
  const receptionistCount = centers.filter((c) => c.role === "RECEPTIONIST").length;
  const ccCount = centers.filter((c) => c.role === "COLLECTION_CENTER").length;
  const b2bCount = centers.filter((c) => c.role === "B2B").length;
  const activeCount = centers.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* VIEW 1: FULL-WIDTH IN-PAGE "ADD RBAC ACCOUNT" FORM                         */}
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
                  <span>Create New RBAC Staff / Partner Account</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure role-based access for Front-Desk Receptionists, Phlebotomy Collection Centers, or B2B Partner Labs.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer self-start sm:self-auto"
            >
              Cancel
            </button>
          </div>

          {/* Full-width Form Body */}
          <form onSubmit={handleCreateCenter} className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Account Information & Role Selection */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="border-b border-border/60 pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Identity & Role Assignment</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Define account identity, role, and operational access level.</p>
                </div>

                {/* Role Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Role / Access Privilege *</span>
                    <span className="text-[10px] font-mono text-primary font-bold">PRESET AUTO-LOAD</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as "RECEPTIONIST" | "COLLECTION_CENTER" | "B2B")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-bold focus:border-primary outline-none transition-colors cursor-pointer text-foreground"
                  >
                    <option value="RECEPTIONIST">Receptionist (Front-Desk / Intake & Billing)</option>
                    <option value="COLLECTION_CENTER">Collection Center (Phlebotomy / Tube Barcoding)</option>
                    <option value="B2B">B2B Partner (Client Lab / Clinic / Doctor)</option>
                  </select>

                  <div className="p-2.5 rounded-lg bg-background border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
                    {role === "RECEPTIONIST" && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        ✦ <strong>Receptionist Access:</strong> Patient registration, demographic editing, billing collection, invoice print, and printing approved diagnostic reports. (Medical results and signing are restricted).
                      </span>
                    )}
                    {role === "COLLECTION_CENTER" && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        ✦ <strong>Collection Center:</strong> Sample intake, specimen tube barcode attachment, pre-testing demographic verification, and printing authorized reports.
                      </span>
                    )}
                    {role === "B2B" && (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        ✦ <strong>B2B Partner:</strong> Sample booking with dedicated wholesale rate tariff, live order status, wallet management, and reports download.
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {role === "RECEPTIONIST" ? "Receptionist Full Name *" : role === "B2B" ? "B2B Lab / Clinic Name *" : "Collection Center / Branch Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === "RECEPTIONIST" ? "e.g. Pooja Sharma (Front Desk)" : role === "B2B" ? "e.g. Apex Diagnostics & Polyclinic" : "e.g. City Phlebotomy Hub - North"}
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
                    <option value="active">Active (Access Granted)</option>
                    <option value="suspended">Suspended (Access Temporarily Blocked)</option>
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
                  </div>
                )}
              </div>

              {/* Card 2: Login Credentials & Security */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border/70 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      <span>Login Credentials & Authentication</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Assigned terminal login ID and password.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Login User ID (Email) *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === "RECEPTIONIST" ? "receptionist@lab.com" : role === "B2B" ? "partner@clinic.com" : "branch@lab.com"}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Password (Min 6 characters) *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
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
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    User will log in from the main portal login page using these credentials. Their terminal UI will be automatically tailored to their granted permissions.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Granular Permissions Checklist (Give Access) */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Module Privileges & Operational Permissions (Give Access)</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tick or untick specific modules to customize exactly what this staff member or branch is allowed to perform.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPermissions(ROLE_DEFAULT_PERMISSIONS[role] || [])}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                  >
                    Reset to {role} Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissions(ALL_PERMISSIONS.map(p => p.key))}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = permissions.includes(perm.key);
                  const Icon = perm.icon;
                  return (
                    <div
                      key={perm.key}
                      onClick={() => togglePermission(perm.key, false)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isChecked
                          ? "bg-primary/5 border-primary/40 shadow-2xs"
                          : "bg-background border-border/70 opacity-75 hover:opacity-100 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${isChecked ? "text-primary" : "text-muted-foreground"}`}>
                          {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-tight ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>
                            {perm.label}
                          </p>
                          <p className="text-[10.5px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[9.5px] font-mono text-muted-foreground">
                        <span>{perm.category}</span>
                        <span className={`font-bold ${isChecked ? "text-primary" : "text-muted-foreground/60"}`}>
                          {isChecked ? "GRANTED" : "REVOKED"}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                <span>
                  Create {role === "RECEPTIONIST" ? "Receptionist" : role === "B2B" ? "B2B Partner" : "Collection Center"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FULL-WIDTH IN-PAGE "EDIT ACCOUNT" FORM                             */}
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
                  Update role permissions, operational privileges, contact info, or reset password.
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
                    <span>Identity & Role Assignment</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Change role or operational terminal identity.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Role / Access Privilege *</span>
                    <span className="text-[10px] font-mono text-primary font-bold">RBAC PRIVILEGE</span>
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => handleEditRoleChange(e.target.value as "RECEPTIONIST" | "COLLECTION_CENTER" | "B2B")}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-bold focus:border-primary outline-none transition-colors cursor-pointer text-foreground"
                  >
                    <option value="RECEPTIONIST">Receptionist (Front-Desk / Intake & Billing)</option>
                    <option value="COLLECTION_CENTER">Collection Center (Phlebotomy / Tube Barcoding)</option>
                    <option value="B2B">B2B Partner (Client Lab / Clinic / Doctor)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Phone Number</label>
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
                    <option value="active">Active (Access Granted)</option>
                    <option value="suspended">Suspended (Access Temporarily Blocked)</option>
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">Reset terminal access credentials.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Login User ID (Email)</label>
                  <input
                    type="text"
                    disabled
                    value={editingCenter.email}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/60 border border-border text-sm font-semibold text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">User ID email cannot be changed once created.</p>
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

            {/* Card 3: Granular Permissions Checklist (Give Access) */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Module Privileges & Operational Permissions (Give Access)</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tick or untick specific modules to update operational access for this account.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPermissions(ROLE_DEFAULT_PERMISSIONS[editRole] || [])}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                  >
                    Reset to {editRole} Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(ALL_PERMISSIONS.map(p => p.key))}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = editPermissions.includes(perm.key);
                  return (
                    <div
                      key={perm.key}
                      onClick={() => togglePermission(perm.key, true)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isChecked
                          ? "bg-primary/5 border-primary/40 shadow-2xs"
                          : "bg-background border-border/70 opacity-75 hover:opacity-100 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${isChecked ? "text-primary" : "text-muted-foreground"}`}>
                          {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-tight ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>
                            {perm.label}
                          </p>
                          <p className="text-[10.5px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[9.5px] font-mono text-muted-foreground">
                        <span>{perm.category}</span>
                        <span className={`font-bold ${isChecked ? "text-primary" : "text-muted-foreground/60"}`}>
                          {isChecked ? "GRANTED" : "REVOKED"}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">{centers.length}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Receptionists</p>
                <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5">{receptionistCount}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Collection Centers</p>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight mt-0.5">{ccCount}</p>
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
          </div>

          {/* Main Container */}
          <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
            {/* Table Header: Title, Filter Pills, and Add Button */}
            <div className="p-5 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>RBAC Staff & Partner Roles</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                    {filteredCenters.length} Accounts
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage role-based logins and granular module privileges for Receptionists, Phlebotomy Collection Centers, and B2B Client Labs.
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
                    onClick={() => setRoleFilter("RECEPTIONIST")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === "RECEPTIONIST" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Receptionists ({receptionistCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("COLLECTION_CENTER")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === "COLLECTION_CENTER" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Collection ({ccCount})
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
                  <span>Add Role / Terminal</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">Loading RBAC accounts...</p>
              </div>
            ) : filteredCenters.length === 0 ? (
              /* Empty State */
              <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mb-4">
                  <Shield className="h-8 w-8 text-primary/70" />
                </div>
                <h4 className="text-base font-bold text-foreground">No Accounts Found</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                  Click the <strong>"Add Role / Terminal"</strong> button above to register Front-Desk Receptionists, Collection Centers, or B2B partners.
                </p>
              </div>
            ) : (
              /* Table of Accounts */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-5">Staff / Partner Name</th>
                      <th className="py-3 px-4">Role & Terminal</th>
                      <th className="py-3 px-4">Granted Permissions</th>
                      <th className="py-3 px-4">Login User ID (Email)</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered</th>
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
                      const isCC = c.role === "COLLECTION_CENTER";
                      const isReceptionist = c.role === "RECEPTIONIST";

                      const activePermsCount = Array.isArray(c.permissions) && c.permissions.length > 0
                        ? c.permissions.length
                        : (ROLE_DEFAULT_PERMISSIONS[c.role || ""] || []).length;

                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                          {/* Name */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                isReceptionist
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                  : isCC
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              }`}>
                                {isReceptionist ? <Users className="h-4 w-4" /> : isCC ? <Building2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-sm leading-tight">{c.name}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {isReceptionist ? "Front-Desk Reception" : isCC ? "Phlebotomy Collection Center" : "B2B Partner Lab"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-4 px-4">
                            {isReceptionist ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                <Users className="h-3 w-3" />
                                <span>Receptionist</span>
                              </span>
                            ) : isCC ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Building2 className="h-3 w-3" />
                                <span>Collection Center</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                <Briefcase className="h-3 w-3" />
                                <span>B2B Partner</span>
                              </span>
                            )}
                          </td>

                          {/* Granted Permissions Badge */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-muted/60 text-foreground border border-border">
                              <ShieldCheck className="h-3 w-3 text-primary" />
                              <span>{activePermsCount} Modules Active</span>
                            </span>
                          </td>

                          {/* Login Email */}
                          <td className="py-4 px-4 font-mono text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{c.email}</span>
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
