"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2, PlusCircle, RefreshCw, Trash2, KeyRound, Eye, EyeOff,
  Copy, Check, ShieldCheck, Phone, Mail, Calendar, AlertCircle,
  Loader2, Sparkles, MapPin, CheckCircle2, UserCheck, ArrowLeft,
  X, Lock, Shield, Sliders, Briefcase, Filter, Layers, Users,
  ClipboardList, CheckSquare, Square, FileText, Receipt, Barcode,
  Activity, Settings, MoreVertical, Ban, CheckCircle
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
  rate_list_id?: number | null;
  rate_list_name?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

interface CustomRateList {
  id: number;
  name: string;
  description?: string;
  is_default?: boolean;
  items_count?: number;
}

export function CollectionCentersTab() {
  const [centers, setCenters] = useState<CollectionCenter[]>([]);
  const [customRateLists, setCustomRateLists] = useState<CustomRateList[]>([]);
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
  const [rateTier, setRateTier] = useState<string>("HIGH");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State for adding RBAC Account
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Edit Form State
  const [editingCenter, setEditingCenter] = useState<CollectionCenter | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editRole, setEditRole] = useState<"RECEPTIONIST" | "COLLECTION_CENTER" | "B2B">("RECEPTIONIST");
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [editRateTier, setEditRateTier] = useState<string>("HIGH");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete & Status Action State
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-rbac-menu]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      setLoading(true);
      const [centersRes, rateListsRes] = await Promise.allSettled([
        fetchFromLaravel("/collection-centers"),
        fetchFromLaravel("/rate-lists"),
      ]);

      if (centersRes.status === "fulfilled") {
        const list = Array.isArray(centersRes.value) ? centersRes.value : (centersRes.value?.data || []);
        setCenters(list);
      }
      if (rateListsRes.status === "fulfilled") {
        const rlData = rateListsRes.value?.data || rateListsRes.value || [];
        setCustomRateLists(Array.isArray(rlData) ? rlData : []);
      }
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

  const handleRequestOtp = async (isResend = false) => {
    if (!name.trim()) {
      setToast({ text: "Please enter staff / branch name", type: "error" });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setToast({ text: "Please enter a valid email address", type: "error" });
      return;
    }
    if (!password || password.length < 6) {
      setToast({ text: "Password must be at least 6 characters", type: "error" });
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await fetchFromLaravel("/collection-centers/send-otp", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      setIsOtpSent(true);
      setShowOtpModal(false);
      setResendCooldown(30);
      setToast({
        text: isResend
          ? `New verification code resent to ${email.trim()}`
          : res?.message || `6-digit verification code sent to ${email.trim()}`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Failed to send OTP:", err);
      const rawMsg = err?.message || "";
      if (rawMsg.toLowerCase().includes("too many attempts") || rawMsg.includes("429")) {
        setToast({ text: "Too many attempts. Please wait a moment before requesting another code.", type: "error" });
      } else {
        setToast({ text: rawMsg || "Failed to send verification code to staff email", type: "error" });
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtpSent) {
      await handleRequestOtp(false);
    } else {
      await handleVerifyAndCreateCenter();
    }
  };

  const handleVerifyAndCreateCenter = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setToast({ text: "Please enter the 6-digit verification code", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      let selectedRateTier = "HIGH";
      let selectedRateListId: number | null = null;
      if (rateTier.startsWith("RATELIST_")) {
        selectedRateListId = parseInt(rateTier.replace("RATELIST_", ""), 10);
        selectedRateTier = "HIGH";
      } else {
        selectedRateTier = rateTier;
        selectedRateListId = null;
      }

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
          rate_tier: selectedRateTier,
          rate_list_id: selectedRateListId,
          otp: otpCode.trim(),
        }),
      });

      const roleLabel =
        role === "B2B" ? "B2B Partner" : role === "RECEPTIONIST" ? "Receptionist" : "Collection Center";
      setToast({ text: res?.message || `${roleLabel} created successfully!`, type: "success" });

      // Reset form & OTP states
      setIsOtpSent(false);
      setShowOtpModal(false);
      setOtpCode("");
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
      const rawMsg = err?.message || "";
      if (rawMsg.toLowerCase().includes("too many attempts") || rawMsg.includes("429")) {
        setToast({ text: "Too many attempts. Please wait a moment before trying again.", type: "error" });
      } else {
        setToast({ text: rawMsg || "Error creating account", type: "error" });
      }
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

    if (c.rate_list_id) {
      setEditRateTier(`RATELIST_${c.rate_list_id}`);
    } else {
      const rawTier = c.rate_tier || c.rateTier || "HIGH";
      setEditRateTier(rawTier.toUpperCase() === "LOW" ? "LOW" : rawTier.toUpperCase() === "MEDIUM" ? "MEDIUM" : "HIGH");
    }
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
        if (editRateTier.startsWith("RATELIST_")) {
          payload.rate_list_id = parseInt(editRateTier.replace("RATELIST_", ""), 10);
          payload.rate_tier = "HIGH";
        } else {
          payload.rate_tier = editRateTier;
          payload.rate_list_id = null;
        }
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

  const handleToggleStatus = async (c: CollectionCenter) => {
    const isCurrentlyActive = c.status === "active";
    const newStatus = isCurrentlyActive ? "suspended" : "active";
    const actionLabel = isCurrentlyActive ? "suspend" : "unsuspend";

    try {
      setTogglingStatusId(c.id);
      await fetchFromLaravel(`/collection-centers/${c.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      // Optimistically update centers in state
      setCenters((prev) =>
        prev.map((item) =>
          item.id === c.id ? { ...item, status: newStatus } : item
        )
      );

      setToast({
        text: isCurrentlyActive
          ? `Account "${c.name}" suspended. Active sessions revoked.`
          : `Account "${c.name}" reactivated successfully.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      setToast({
        text: err?.message || `Failed to ${actionLabel} account`,
        type: "error",
      });
    } finally {
      setTogglingStatusId(null);
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
          <div className="p-4 sm:p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                title="Back to Accounts List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                  <span>Create New RBAC Staff / Partner Account</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure role-based access for Front-Desk Receptionists, Phlebotomy Collection Centers, or B2B Partner Labs.
                </p>
              </div>
            </div>
          </div>

          {/* Full-width Form Body */}
          <form onSubmit={handleCreateCenter} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
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
                      onChange={(e) => setRateTier(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                    >
                      <optgroup label="Standard Base Wholesale Tiers">
                        <option value="HIGH">High Tier Rate List (Default wholesale rate)</option>
                        <option value="MEDIUM">Medium Tier Rate List (Moderate concession rate)</option>
                        <option value="LOW">Low Tier Rate List (Lowest wholesale concession)</option>
                      </optgroup>
                      {customRateLists && customRateLists.length > 0 && (
                        <optgroup label="Custom Rate Lists (Rate List Master)">
                          {customRateLists.map((rl) => (
                            <option key={rl.id} value={`RATELIST_${rl.id}`}>
                              {rl.name} {rl.items_count ? `(${rl.items_count} custom test rates)` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}
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
                      disabled={isOtpSent}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === "RECEPTIONIST" ? "receptionist@lab.com" : role === "B2B" ? "partner@clinic.com" : "branch@lab.com"}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors disabled:opacity-85 disabled:bg-muted/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Password (Min 6 characters) *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={isOtpSent}
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pr-11 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors disabled:opacity-85 disabled:bg-muted/30"
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

                  {/* Inline Email Verification OTP Section when isOtpSent is TRUE */}
                  {isOtpSent && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-primary/5 border-2 border-primary/40 space-y-3 animate-fade-in shadow-xs">
                      <div className="flex items-start justify-between gap-2 border-b border-primary/20 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                            <Mail className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-foreground block leading-tight truncate">
                              Staff Email Authorization
                            </span>
                            <span className="text-[10.5px] text-muted-foreground block truncate">
                              6-digit OTP code sent to <strong className="text-primary">{email}</strong>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setShowOtpModal(false);
                            setOtpCode("");
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                          title="Change Email or Password"
                        >
                          Change
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                          <span>Enter 6-Digit Verification Code *</span>
                          <span className="text-[10px] text-muted-foreground font-mono">10 min expiry</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          maxLength={6}
                          autoFocus
                          placeholder="• • • • • •"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full px-4 py-2.5 rounded-xl bg-background border-2 border-primary focus:border-primary text-center text-xl font-mono font-bold tracking-[8px] outline-none transition-all shadow-inner text-foreground"
                        />
                        <div className="flex items-center justify-between text-[11px] pt-1 px-0.5">
                          <span className="text-muted-foreground text-[10.5px]">Didn't get code?</span>
                          {resendCooldown > 0 ? (
                            <span className="text-muted-foreground font-mono font-semibold text-[10.5px]">
                              Resend in {resendCooldown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isSendingOtp}
                              onClick={() => handleRequestOtp(true)}
                              className="text-primary hover:underline font-bold text-[10.5px] cursor-pointer disabled:opacity-50"
                            >
                              {isSendingOtp ? "Resending..." : "Resend Code"}
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting || otpCode.trim().length !== 6}
                        onClick={handleVerifyAndCreateCenter}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Verify & Create Account</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    User will log in from the main portal login page using these credentials. Their terminal UI will be automatically tailored to their granted permissions.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewMode("LIST");
                  setIsOtpSent(false);
                  setShowOtpModal(false);
                  setOtpCode("");
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSendingOtp || (isOtpSent && otpCode.trim().length !== 6)}
                className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 text-center"
              >
                {isSubmitting || isSendingOtp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isOtpSent ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span>
                  {isSendingOtp
                    ? "Sending Verification OTP..."
                    : isSubmitting
                    ? "Verifying & Creating..."
                    : isOtpSent
                    ? "Verify & Create Account"
                    : `Send OTP & Create ${role === "RECEPTIONIST" ? "Receptionist" : role === "B2B" ? "B2B Partner" : "Collection Center"}`}
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
          <div className="p-4 sm:p-6 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => { setViewMode("LIST"); setEditingCenter(null); }}
                className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                title="Back to Accounts List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                  <KeyRound className="h-5 w-5 text-primary shrink-0" />
                  <span>Edit Account: {editingCenter.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update role permissions, operational privileges, contact info, or reset password.
                </p>
              </div>
            </div>
          </div>

          {/* Full-width Form Body */}
          <form onSubmit={handleUpdateCenter} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
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
                      onChange={(e) => setEditRateTier(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:border-primary outline-none transition-colors cursor-pointer"
                    >
                      <optgroup label="Standard Base Wholesale Tiers">
                        <option value="HIGH">High Tier Rate List (Default wholesale rate)</option>
                        <option value="MEDIUM">Medium Tier Rate List (Moderate concession rate)</option>
                        <option value="LOW">Low Tier Rate List (Lowest wholesale concession)</option>
                      </optgroup>
                      {customRateLists && customRateLists.length > 0 && (
                        <optgroup label="Custom Rate Lists (Rate List Master)">
                          {customRateLists.map((rl) => (
                            <option key={rl.id} value={`RATELIST_${rl.id}`}>
                              {rl.name} {rl.items_count ? `(${rl.items_count} custom test rates)` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}
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

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => { setViewMode("LIST"); setEditingCenter(null); }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 text-center"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Accounts</p>
                <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-0.5">{centers.length}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Receptionists</p>
                <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5">{receptionistCount}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Collection Centers</p>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight mt-0.5">{ccCount}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">B2B Partner Labs</p>
                <p className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight mt-0.5">{b2bCount}</p>
              </div>
            </div>
          </div>

          {/* Main Container */}
          <div className="rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden">
            {/* Table Header: Title, Filter Pills, and Add Button */}
            <div className="p-4 sm:p-5 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
                  <span>RBAC Staff &amp; Partner Roles</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary shrink-0 whitespace-nowrap">
                    {filteredCenters.length} Accounts
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage role-based logins and granular module privileges for Receptionists, Phlebotomy Collection Centers, and B2B Client Labs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between sm:justify-start">
                {/* Filter Pills */}
                <div className="p-1 bg-background rounded-xl border border-border flex items-center gap-1 overflow-x-auto max-w-full scrollbar-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setRoleFilter("ALL")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      roleFilter === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({centers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("RECEPTIONIST")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      roleFilter === "RECEPTIONIST" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Receptionists ({receptionistCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("COLLECTION_CENTER")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      roleFilter === "COLLECTION_CENTER" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Collection ({ccCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("B2B")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      roleFilter === "B2B" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    B2B ({b2bCount})
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs cursor-pointer shrink-0"
                    title="Refresh Accounts"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("ADD")}
                    className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4 shrink-0" />
                    <span>Add Role / Terminal</span>
                  </button>
                </div>
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
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-5">Staff / Partner Name</th>
                      <th className="py-3 px-4">Role & Terminal</th>
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
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  <Briefcase className="h-3 w-3" />
                                  <span>B2B Partner</span>
                                </span>
                                <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                  <Sliders className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[130px]" title={c.rate_list_name ? `Rate List: ${c.rate_list_name}` : `Tier ${c.rate_tier || c.rateTier || "HIGH"}`}>
                                    {c.rate_list_name ? c.rate_list_name : `Tier ${c.rate_tier || c.rateTier || "HIGH"}`}
                                  </span>
                                </div>
                              </div>
                            )}
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

                          {/* Actions: 3-Dots Dropdown Menu */}
                          <td className="py-4 px-5 text-right">
                            <div className="relative inline-block" data-rbac-menu>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === c.id ? null : c.id);
                                }}
                                className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shadow-2xs"
                                title="Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {openMenuId === c.id && (
                                <div className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl bg-card border border-border shadow-xl p-1.5 space-y-1 animate-scale-in text-left">
                                  {/* Edit Account */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      openEditView(c);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer text-left"
                                  >
                                    <Sliders className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span>Edit Details</span>
                                  </button>

                                  {/* Suspend / Unsuspend Account */}
                                  <button
                                    type="button"
                                    disabled={togglingStatusId === c.id}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleToggleStatus(c);
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer text-left ${
                                      isActive
                                        ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                    }`}
                                  >
                                    {togglingStatusId === c.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                    ) : isActive ? (
                                      <Ban className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span>{isActive ? "Suspend Account" : "Unsuspend Account"}</span>
                                  </button>

                                  <div className="border-t border-border/60 my-1" />

                                  {/* Delete Account */}
                                  <button
                                    type="button"
                                    disabled={deletingId === c.id}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDeleteCenter(c.id, c.name);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>Delete Account</span>
                                  </button>
                                </div>
                              )}
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
