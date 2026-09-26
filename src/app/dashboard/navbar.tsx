"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sun, Moon, LogOut, ChevronDown, Bell, LifeBuoy, HelpCircle,
  MessageSquare, Bug, Lightbulb, CheckCircle2, AlertTriangle,
  Clock, Check, ExternalLink, ShieldCheck, Search, ArrowLeft,
  ArrowRight, Users, FileText, Receipt, X, Loader2, Command, Trash2,
  Copy, Building2, FlaskConical, PlusCircle, Coins, IndianRupee, Mail as MailIcon,
  Sparkles, Gift, User as UserIcon, Lock
} from "lucide-react";
import { getStoredUser, logout, fetchFromLaravel } from "@/lib/api-client";
import { isSubscriptionExpired } from "@/lib/subscription";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
}

const formatNotifTime = (dateVal?: string) => {
  if (!dateVal) return "Just now";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const formatFlabsDate = (dateVal?: string) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `Registered on ${dd}/${mm}/${yy}`;
  } catch {
    return "";
  }
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("lis_user");
        if (raw) return JSON.parse(raw);
        const roleMatch = document.cookie.match(/(?:^|;\s*)lis_role=([^;]+)/);
        if (roleMatch && roleMatch[1]) {
          return { role: decodeURIComponent(roleMatch[1]) };
        }
      } catch {
        return null;
      }
    }
    return null;
  });
  const normalizedRole = (user?.role || "").toUpperCase().trim();
  const isB2B = normalizedRole === "B2B";
  const isCollectionCenter = normalizedRole === "COLLECTION_CENTER" || normalizedRole === "COLLECTION_CENTRE";
  const isReceptionist = normalizedRole === "RECEPTIONIST";
  const isAdmin = normalizedRole === "ADMIN" || normalizedRole === "PATHOLOGIST" || normalizedRole === "SUPER_ADMIN" || normalizedRole === "LAB_ADMIN";

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    patients: any[];
    reports: any[];
    bills: any[];
  }>({ patients: [], reports: [], bills: [] });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Lab and Sales state for profile dropdown
  const [labData, setLabData] = useState<any>(null);
  const [todaySales, setTodaySales] = useState<string>("₹0");
  const [copiedLabId, setCopiedLabId] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("lis_subscription_locked") === "true";
    }
    return false;
  });

  useEffect(() => {
    setUser(getStoredUser());
    fetchNotifications();
    fetchLabAndSales();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchLabAndSales();
    }, 30000);

    const handleUserUpdate = () => {
      setUser(getStoredUser());
      fetchLabAndSales();
    };
    window.addEventListener("user-updated", handleUserUpdate);

    const handleLock = (e: any) => {
      if (typeof e.detail?.isLocked === "boolean") {
        setIsLocked(e.detail.isLocked);
      } else {
        setIsLocked(true);
      }
    };
    window.addEventListener("subscription-locked", handleLock);
    window.addEventListener("subscription-expired", handleLock);

    return () => {
      clearInterval(interval);
      window.removeEventListener("user-updated", handleUserUpdate);
      window.removeEventListener("subscription-locked", handleLock);
      window.removeEventListener("subscription-expired", handleLock);
    };
  }, []);

  const fetchLabAndSales = async () => {
    try {
      const [labRes, salesRes] = await Promise.all([
        fetchFromLaravel("/lab"),
        fetchFromLaravel("/today-sales"),
      ]);
      if (labRes) {
        setLabData(labRes);
        const currentUser = getStoredUser();
        const expired = isSubscriptionExpired(labRes, currentUser);
        setIsLocked(expired);
      }
      if (salesRes) {
        if (salesRes.formatted) {
          setTodaySales(salesRes.formatted);
        } else if (salesRes.amount !== undefined || salesRes.today_total !== undefined) {
          const val = Number(salesRes.amount ?? salesRes.today_total ?? 0);
          setTodaySales(`₹${val.toLocaleString("en-IN")}`);
        }
      }
    } catch (_err) {
      // Silently catch background polling errors to maintain a pristine console
    }
  };

  const actualLabId = labData?.customId || labData?.custom_id || (user as any)?.lab?.custom_id || (user as any)?.lab?.customId || (user as any)?.lab_id || "47116602";

  const labDisplayName =
    labData?.centreName ||
    labData?.centre_name ||
    labData?.name ||
    user?.labName ||
    user?.lab_name ||
    user?.lab?.name ||
    user?.lab?.centreName ||
    user?.name ||
    "Diagnostic Laboratory";

  const userAvatar = user?.avatarUrl || user?.avatar_url || (user as any)?.avatar || labData?.logoUrl || labData?.logo_url;

  const handleCopyLabId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idToCopy = String(actualLabId);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(idToCopy);
    }
    setCopiedLabId(true);
    setTimeout(() => setCopiedLabId(false), 2500);
  };

  // Keyboard shortcut (Ctrl+K or Cmd+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live search query debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ patients: [], reports: [], bills: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [pRes, rRes, bRes] = await Promise.allSettled([
          fetchFromLaravel(`/patients?search=${encodeURIComponent(searchQuery)}`),
          fetchFromLaravel(`/reports?search=${encodeURIComponent(searchQuery)}`),
          fetchFromLaravel(`/bills?search=${encodeURIComponent(searchQuery)}`),
        ]);

        const patients = pRes.status === "fulfilled" ? (Array.isArray(pRes.value) ? pRes.value : pRes.value?.data || []) : [];
        const reports = rRes.status === "fulfilled" ? (Array.isArray(rRes.value) ? rRes.value : rRes.value?.data || []) : [];
        const bills = bRes.status === "fulfilled" ? (Array.isArray(bRes.value) ? bRes.value : bRes.value?.data || []) : [];

        setSearchResults({
          patients: patients.slice(0, 8),
          reports: reports.slice(0, 4),
          bills: bills.slice(0, 3),
        });
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchNotifications = async () => {
    try {
      const res = await fetchFromLaravel("/notifications");
      const list = Array.isArray(res?.notifications)
        ? res.notifications
        : Array.isArray(res)
        ? res
        : [];
      const unread = typeof res?.unreadCount === "number"
        ? res.unreadCount
        : typeof res?.unread_count === "number"
        ? res.unread_count
        : list.filter((n: any) => !(n.isRead ?? n.is_read)).length;

      setNotifications(list);
      setUnreadCount(unread);
    } catch (_err) {
      // Silently catch background polling errors to maintain a pristine console
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetchFromLaravel(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetchFromLaravel("/notifications/read-all", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    const isRead = notif.isRead ?? notif.is_read;
    if (!isRead) {
      markNotificationAsRead(notif.id);
    }
    setIsNotifOpen(false);
    
    // Redirect to notification's link or support history
    const targetLink = notif.link || "/dashboard/support?view=history";
    router.push(targetLink);
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await fetchFromLaravel(`/notifications/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const clearAllNotifications = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      setNotifications([]);
      setUnreadCount(0);
      await fetchFromLaravel("/notifications/clear-all", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleSmartBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  const handleSmartForward = () => {
    if (typeof window !== "undefined") {
      window.history.forward();
    }
  };

  const name = user?.name || "User";
  const role = user?.role || "Staff";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "SUPPORT_REPLY":
        return <LifeBuoy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "ALERT":
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "TICKET_UPDATE":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const hasResults = isCollectionCenter
    ? searchResults.reports.length > 0
    : (searchResults.patients.length > 0 || searchResults.reports.length > 0 || searchResults.bills.length > 0);

  return (
    <header className="flex h-[68px] items-center justify-between pl-16 pr-3 sm:px-6 lg:px-8 glass border-b border-border/60 shrink-0 sticky top-0 z-30 gap-2 sm:gap-6">
      
      {/* Left Navigation Buttons + Full Width Global Search Bar */}
      <div className="flex items-center gap-2.5 flex-1 max-w-2xl min-w-0" ref={searchContainerRef}>
        
        {/* Smart History Back & Forward Buttons */}
        <div className="hidden sm:flex items-center gap-1 bg-card/80 p-1 rounded-xl border border-border/80 shadow-xs shrink-0">
          <button
            type="button"
            onClick={handleSmartBack}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Go back to previous screen (Alt + Left)"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSmartForward}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Go forward"
            aria-label="Forward"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Global Live Search Bar */}
        <div className="relative flex-1 min-w-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 sm:left-3.5 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              disabled={isLocked}
              value={searchQuery}
              onChange={(e) => {
                if (isLocked) return;
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (!isLocked) setIsSearchOpen(true);
              }}
              placeholder={isLocked ? "Search locked (Subscription expired)" : "Search by Phone Number, Name, Patient ID, UHID, ABHA..."}
              className={`w-full h-9 sm:h-10 pl-8 sm:pl-10 pr-7 sm:pr-20 bg-background/90 hover:bg-background focus:bg-background border border-border/90 focus:border-primary rounded-xl text-xs sm:text-sm font-medium text-foreground outline-none transition-all shadow-xs placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/15 truncate ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            />

            <div className="absolute right-2 sm:right-2.5 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults({ patients: [], reports: [], bills: [] });
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground bg-muted border border-border/80 rounded-md">
                  <span className="text-[11px]">⌘</span>K
                </kbd>
              )}
            </div>
          </div>

          {/* Search Dropdown Results Popover */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="fixed inset-x-2 sm:absolute sm:inset-x-0 sm:left-0 sm:right-0 top-[72px] sm:top-12 bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in max-h-[70vh] sm:max-h-[440px] overflow-y-auto">
              
              {isSearching ? (
                <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-xs font-semibold">Searching patient records & reports...</p>
                </div>
              ) : !hasResults ? (
                <div className="py-10 text-center text-muted-foreground space-y-1">
                  <Search className="h-7 w-7 mx-auto opacity-30" />
                  <p className="text-xs font-bold text-foreground">No matches found</p>
                  <p className="text-[11px]">No patient, report or invoice matched &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  
                  {/* Patients Section - Hidden for Collection Center */}
                  {!isCollectionCenter && searchResults.patients.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-primary" />
                          <span>Patients ({searchResults.patients.length})</span>
                        </div>
                        <span className="text-[9.5px] font-normal lowercase text-muted-foreground/75">click to edit patient</span>
                      </div>
                      <div className="divide-y divide-border/40 rounded-xl overflow-hidden bg-card/60">
                        {searchResults.patients.map((p: any) => {
                          const isAbha = Boolean(
                            p.is_abha_verified ||
                            p.isAbhaVerified ||
                            p.abha_address ||
                            p.abhaAddress ||
                            p.abha_number ||
                            p.abhaNumber
                          );
                          const prefix = p.designation || p.title ? `${p.designation || p.title} ` : "";
                          const pName = p.name || p.full_name || p.fullName || "Patient";
                          const gender = p.gender || "Male";
                          const ageStr = p.age ? `${p.age} Year` : "";
                          const demographic = [gender, ageStr].filter(Boolean).join(", ");
                          const regDate = formatFlabsDate(p.created_at || p.createdAt);

                          return (
                            <Link
                              key={p.id}
                              href={`/dashboard/patients/register?edit=${p.id}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="block p-2.5 sm:p-3 hover:bg-muted/70 transition-colors cursor-pointer text-left group"
                            >
                              {/* Line 1: [Govt/ABDM Emblem] Name , Gender, Age */}
                              <div className="flex items-center gap-2">
                                {isAbha && (
                                  <span
                                    className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full overflow-hidden shadow-2xs"
                                    title="ABDM Ayushman Bharat Digital Mission Verified"
                                  >
                                    <svg viewBox="0 0 100 100" className="h-4 w-4">
                                      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
                                      <circle cx="50" cy="50" r="44" fill="#047857" />
                                      <path d="M50 16 L50 84 M16 50 L84 50" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
                                      <circle cx="50" cy="50" r="16" fill="#ffffff" />
                                      <circle cx="50" cy="50" r="8" fill="#f97316" />
                                      <circle cx="50" cy="50" r="3" fill="#ffffff" />
                                    </svg>
                                  </span>
                                )}
                                <p className="font-bold text-foreground text-xs sm:text-[13px] truncate group-hover:text-primary transition-colors">
                                  {prefix}{pName}{demographic ? ` , ${demographic}` : ""}
                                </p>
                              </div>

                              {/* Line 2: Patient ID */}
                              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                #{p.custom_id || p.customId || p.uhid || p.id?.slice(0, 8)}
                              </div>

                              {/* Line 3: ABHA Address on Left & Registration Date on Right */}
                              <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                                {isAbha && (p.abha_address || p.abhaAddress) ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                    {p.abha_address || p.abhaAddress}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/70 text-[10.5px]">
                                    {p.phone && p.phone !== "N/A" ? p.phone : ""}
                                  </span>
                                )}

                                {regDate && (
                                  <span className="text-muted-foreground text-[10.5px] shrink-0 font-medium">
                                    {regDate}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reports Section */}
                  {searchResults.reports.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span>Diagnostic Reports ({searchResults.reports.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.reports.map((r: any) => (
                          <Link
                            key={r.id}
                            href={(isCollectionCenter || isB2B) ? `/dashboard/reports` : `/dashboard/reports/${r.id}/edit`}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-primary">
                                  {r.custom_id || r.customId}
                                </span>
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                  {r.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Patient: {r.patient?.name || r.patient?.full_name || r.patient?.fullName || "Patient"}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                              {(isCollectionCenter || isB2B || isReceptionist) ? "View Reports →" : "Enter Results →"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Billing Invoices Section - Hidden for Collection Center */}
                  {!isCollectionCenter && searchResults.bills.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="h-3 w-3 text-emerald-500" />
                        <span>Invoices ({searchResults.bills.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.bills.map((b: any) => (
                          <Link
                            key={b.id}
                            href={`/dashboard/billing`}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-foreground">
                                {b.custom_id || b.customId}
                              </span>
                              <p className="text-[11px] text-muted-foreground">
                                Total: ₹{Number(b.grand_total || b.grandTotal || 0).toFixed(2)} · Status: {b.payment_status || b.paymentStatus}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              View Invoice →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Right Controls: Help Dropdown, Notification Bell, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Subscription Expired Alert Pill */}
        {isLocked && (
          <Link
            href="/dashboard/account/lab?tab=subscription"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-extrabold text-xs shadow-xs hover:bg-rose-500/25 transition-all animate-pulse"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Plan Expired · Activate</span>
            <span className="sm:hidden">Activate</span>
          </Link>
        )}
        
        {/* Help & Support Button with Direct Action Redirection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 bg-card/80 hover:bg-accent text-foreground text-xs font-bold transition-all shadow-xs ring-inset-top"
              title="Help & Support"
            >
              <LifeBuoy className="h-4 w-4 text-primary" />
              <span className="hidden md:inline">Help</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60 hidden sm:inline" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-border/90">
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1">
              Helpdesk & Assistance
            </DropdownMenuLabel>
            
            <DropdownMenuItem asChild>
              <Link href="/dashboard/support?view=hub" className="flex items-center gap-2 text-xs font-semibold py-2 px-2.5 rounded-xl cursor-pointer">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <span>Customer Support Hub</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/dashboard/support?view=issue" className="flex items-center gap-2 text-xs font-semibold py-2 px-2.5 rounded-xl cursor-pointer text-red-600 dark:text-red-400 hover:text-red-700">
                <Bug className="h-4 w-4 text-red-500" />
                <span>Report an Issue</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/dashboard/support?view=feedback" className="flex items-center gap-2 text-xs font-semibold py-2 px-2.5 rounded-xl cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <span>Share Feedback</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/dashboard/support?view=feature" className="flex items-center gap-2 text-xs font-semibold py-2 px-2.5 rounded-xl cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700">
                <Lightbulb className="h-4 w-4 text-blue-500" />
                <span>Request a Feature</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/dashboard/support?view=history" className="flex items-center gap-2 text-xs font-semibold py-2 px-2.5 rounded-xl cursor-pointer text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Ticket Logs & Replies</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Dropdown */}
        <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-2.5 rounded-xl border border-border/80 bg-card/80 hover:bg-accent text-foreground transition-all shadow-xs outline-none"
              title="System Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-foreground/80" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full gradient-primary text-[9px] font-bold text-primary-foreground animate-pulse shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-[360px] sm:w-96 p-0 rounded-2xl border-border/90 bg-card shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/80 bg-muted/40">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-bold text-xs text-foreground uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <span className="font-mono text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.2 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Bell className="h-8 w-8 mx-auto opacity-20" />
                  <p className="text-xs font-bold text-foreground">No new notifications</p>
                  <p className="text-[11px]">System alerts and support replies will appear here.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = notif.isRead ?? notif.is_read;
                  const timeStr = formatNotifTime(notif.createdAt || notif.created_at);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                        isRead ? "opacity-75 hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-lg bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-xs group-hover:border-primary/40 transition-colors">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              {timeStr}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => deleteNotification(notif.id, e)}
                              title="Delete notification"
                              className="opacity-70 hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-primary group-hover:underline pt-0.5">
                          <span>Open details</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer: Clear Notifications */}
            <div className="p-2.5 px-3 bg-muted/40 border-t border-border/80 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                {notifications.length} notification{notifications.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Notifications</span>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle (Hidden) */}
        <div className="hidden items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/60">
          <button
            onClick={() => setTheme("light")}
            title="Light mode"
            aria-label="Light mode"
            className={`p-1.5 rounded-md transition-all ${theme === "light" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            title="Dark mode"
            aria-label="Dark mode"
            className={`p-1.5 rounded-md transition-all ${theme === "dark" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Moon className="h-4 w-4" />
          </button>
        </div>

        {/* Profile dropdown (matching exact Screenshot 1 reference) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer">
            <Avatar className="h-8 w-8">
              {userAvatar && <AvatarImage src={userAvatar} alt={labDisplayName} className="object-cover" />}
              <AvatarFallback className="gradient-primary text-primary-foreground text-[11px] font-bold">
                {labDisplayName ? labDisplayName.slice(0, 2).toUpperCase() : initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden lg:block text-left leading-none max-w-[170px]">
              <span className="block text-[13px] font-semibold text-foreground truncate">{labDisplayName}</span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{role}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 hidden lg:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-[288px] sm:w-72 p-0 rounded-2xl shadow-2xl border-border/90 bg-card overflow-hidden">
            {/* Header: Lab Name + Account owner badge */}
            <div className="p-4 pb-3 space-y-1 bg-background">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-display font-bold text-sm text-foreground truncate" title={labDisplayName}>
                    {labDisplayName}
                  </h4>
                  {user?.name && user.name !== labDisplayName && (
                    <p className="text-[11px] text-muted-foreground truncate">{user.name}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                  Account owner
                </span>
              </div>

              {/* Lab ID with 1-click Copy */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Lab ID #: <strong className="font-mono text-foreground">{actualLabId}</strong></span>
                <button
                  type="button"
                  onClick={handleCopyLabId}
                  title="Copy Lab ID"
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {copiedLabId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                {copiedLabId && (
                  <span className="text-[10px] font-bold text-emerald-600 animate-fade-in">Copied!</span>
                )}
              </div>
            </div>

            {/* Today's Sales Banner */}
            <div className="bg-amber-500/10 dark:bg-amber-500/15 border-y border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px]">
                  ₹
                </div>
                <span>
                  {isB2B
                    ? "Today's B2B Sale :"
                    : isCollectionCenter
                    ? "Today's Collection :"
                    : isReceptionist
                    ? "Today's Counter :"
                    : "My today's total :"}
                </span>
              </div>
              <div>
                <span className="font-mono">{todaySales}</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-0.5 text-xs">
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/account/profile"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>My account</span>
                </Link>
              </DropdownMenuItem>

              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/account/lab"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
                  >
                    <FlaskConical className="h-4 w-4 text-muted-foreground" />
                    <span>Lab account</span>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/support"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
                >
                  <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                  <span>Help & Support</span>
                </Link>
              </DropdownMenuItem>
            </div>

            {/* Logout */}
            <div className="p-2 border-t border-border/80 bg-muted/20">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  logout();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}