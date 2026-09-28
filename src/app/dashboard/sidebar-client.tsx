"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Receipt, Menu, X,
  FlaskConical, Settings, HelpCircle, LifeBuoy, Clock, TrendingUp,
  Briefcase, ChevronDown, Wallet, Lock, Sparkles, ShieldAlert, Gift, Activity, Boxes,
  Stethoscope
} from "lucide-react";
import { getStoredUser, fetchFromLaravel } from "@/lib/api-client";
import { isSubscriptionExpired } from "@/lib/subscription";

interface NavChild {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  badge?: string;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt },
  {
    name: "Doctors",
    icon: Stethoscope,
    children: [
      { name: "View", href: "/dashboard/doctors" },
      { name: "Manage", href: "/dashboard/doctors/manage" },
    ],
  },
  {
    name: "B2B",
    icon: Briefcase,
    children: [
      { name: "Sales", href: "/dashboard/b2b" },
      { name: "Wallet", href: "/dashboard/b2b/wallets" },
    ],
  },
  {
    name: "Tests",
    icon: FlaskConical,
    children: [
      { name: "Tests", href: "/dashboard/tests" },
      { name: "Packages", href: "/dashboard/tests/packages" },
      { name: "Rate List", href: "/dashboard/ratelist" },
    ],
  },
  {
    name: "Inventory",
    icon: Boxes,
    children: [
      { name: "View Inventory", href: "/dashboard/inventory" },
      { name: "Manage Inventory", href: "/dashboard/inventory/manage" },
    ],
  },
  { name: "Smart Report", href: "/dashboard/smart-report", icon: Sparkles, badge: "AI" },
  { name: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Refer & Earn", href: "/dashboard/refer", icon: Gift },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isAiGuideOpen, setIsAiGuideOpen] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const u = getStoredUser();
    if (u) setUser(u);
    try {
      if (typeof window !== "undefined") {
        setIsLocked(sessionStorage.getItem("lis_subscription_locked") === "true");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleState = (e: any) => {
      if (e?.detail?.isOpen !== undefined) {
        setIsAiGuideOpen(e.detail.isOpen);
      }
    };
    window.addEventListener("ai-guide-state-changed", handleState);
    return () => window.removeEventListener("ai-guide-state-changed", handleState);
  }, []);

  useEffect(() => {
    const checkLock = async () => {
      const u = getStoredUser();
      setUser(u);
      if (u?.role === "B2B" || u?.role === "COLLECTION_CENTER") {
        setIsLocked(false);
        return;
      }
      try {
        const labRes = await fetchFromLaravel("/lab", { skipCache: true });
        if (labRes) {
          const expired = isSubscriptionExpired(labRes, u);
          setIsLocked(expired);
          if (expired) {
            sessionStorage.setItem("lis_subscription_locked", "true");
          } else {
            sessionStorage.removeItem("lis_subscription_locked");
          }
        }
      } catch (e) {
        if (isSubscriptionExpired(null, u)) {
          setIsLocked(true);
        }
      }
    };

    checkLock();

    const onLockEvent = (e: any) => {
      if (typeof e.detail?.isLocked === "boolean") {
        setIsLocked(e.detail.isLocked);
      } else {
        setIsLocked(true);
      }
    };

    window.addEventListener("subscription-locked", onLockEvent);
    window.addEventListener("subscription-expired", onLockEvent);
    window.addEventListener("user-updated", checkLock);

    return () => {
      window.removeEventListener("subscription-locked", onLockEvent);
      window.removeEventListener("subscription-expired", onLockEvent);
      window.removeEventListener("user-updated", checkLock);
    };
  }, []);

  const labDisplayName =
    user?.labName ||
    user?.lab_name ||
    user?.lab?.name ||
    user?.lab?.centreName ||
    user?.name ||
    "Diagnostic Laboratory";

  const userAvatar = user?.avatarUrl || user?.avatar_url || (user as any)?.avatar || user?.lab?.logoUrl || user?.lab?.logo_url;

  const handleToggle = (itemName: string) => {
    if (isLocked) {
      router.push("/dashboard/account/lab?tab=subscription");
      return;
    }
    const isCurrentlyOpen = Boolean(expandedItems[itemName]) || hoveredItem === itemName;
    if (isCurrentlyOpen) {
      setExpandedItems((prev) => ({ ...prev, [itemName]: false }));
      setHoveredItem(null);
    } else {
      setExpandedItems((prev) => ({ ...prev, [itemName]: true }));
    }
  };

  const handleLockedNavClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      router.push("/dashboard/account/lab?tab=subscription");
    }
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/patients") return pathname === "/dashboard/patients";
    if (href === "/dashboard/today-samples") return pathname === "/dashboard/today-samples";
    if (href === "/dashboard/track-samples") return pathname === "/dashboard/track-samples";
    if (href === "/dashboard/reports") return pathname === "/dashboard/reports";
    if (href === "/dashboard/b2b") return pathname === "/dashboard/b2b";
    if (href === "/dashboard/wallet") return pathname === "/dashboard/wallet";
    if (href === "/dashboard/revenue") return pathname === "/dashboard/revenue";
    if (href === "/dashboard/inventory") return pathname === "/dashboard/inventory";
    if (href === "/dashboard/inventory/manage") return pathname === "/dashboard/inventory/manage";
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  };

  const role = (user?.role || "").toUpperCase().trim();
  const isB2B = role === "B2B";
  const isCollectionCenter = role === "COLLECTION_CENTER" || role === "COLLECTION_CENTRE";
  const isReceptionist = role === "RECEPTIONIST";
  const isAdmin = role === "ADMIN" || role === "PATHOLOGIST" || role === "SUPER_ADMIN" || role === "LAB_ADMIN";
  const isRoleResolved = isMounted || isB2B || isCollectionCenter || isReceptionist || isAdmin;

  const receptionistNav: NavItem[] = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/dashboard/patients", icon: Users },
    { name: "Track Samples", href: "/dashboard/track-samples", icon: Activity },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Billing", href: "/dashboard/billing", icon: Receipt },
    { name: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
  ];

  const collectionNav: NavItem[] = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Today Samples", href: "/dashboard/today-samples", icon: Clock },
    { name: "Patients", href: "/dashboard/patients", icon: Users },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Billing", href: "/dashboard/billing", icon: Receipt },
    { name: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
  ];

  const b2bNav: NavItem[] = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/dashboard/patients", icon: Users },
    { name: "Today Samples", href: "/dashboard/today-samples", icon: Clock },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Wallet & Payments", href: "/dashboard/wallet", icon: Wallet },
    {
      name: "Finance & Rates",
      icon: TrendingUp,
      children: [
        { name: "Billing", href: "/dashboard/billing" },
        { name: "Revenue & Ledger", href: "/dashboard/revenue" },
        { name: "Rate List", href: "/dashboard/ratelist" },
      ],
    },
    { name: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
  ];

  const visibleNav = isB2B
    ? b2bNav
    : isCollectionCenter
    ? collectionNav
    : isReceptionist
    ? receptionistNav
    : isAdmin
    ? navigation
    : isMounted
    ? navigation
    : [];

  const content = (
    <aside className="flex h-full w-[256px] max-w-[85vw] flex-col bg-card border-r border-border/70">
      {/* Brand */}
      <div className="flex h-[68px] items-center gap-3 px-6 shrink-0 border-b border-border/60">
        <div className="relative h-8 w-8 shrink-0">
          <Image src="/onepath-logo.png" alt="OnePath" fill sizes="32px" className="object-contain" />
        </div>
        <div className="flex items-center tracking-tight leading-none">
          <span className="text-[17.5px] font-extrabold text-foreground tracking-tight">OnePath</span>
          <span className="text-[17.5px] font-bold text-primary ml-1 tracking-tight">Lab</span>
        </div>
      </div>

      {/* Quick Action: Register Patient / Sample Entry */}
      <div className="px-3.5 pt-4 pb-2">
        {isLocked && isAdmin ? (
          <Link
            href="/dashboard/account/lab?tab=subscription"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs shadow-xs hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Plan Expired · Locked</span>
          </Link>
        ) : (
          <Link
            href={isCollectionCenter ? "/dashboard/today-samples" : "/dashboard/patients/register"}
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md ring-inset-top hover:-translate-y-px active:scale-[0.98] transition-all"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span suppressHydrationWarning>
              {isB2B
                ? "New Requisition"
                : isCollectionCenter
                ? "Sample Entry"
                : "Add Patient"}
            </span>
          </Link>
        )}
      </div>

      {/* Subscription Locked Alert Banner in Sidebar */}
      {isLocked && isAdmin && (
        <div className="mx-3.5 my-2 p-3 rounded-2xl bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-transparent border border-rose-500/30 text-xs space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-[12px]">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Operations Locked</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Trial or subscription expired. Please activate a plan to unlock all features.
          </p>
          <Link
            href="/dashboard/account/lab?tab=subscription"
            onClick={() => setIsOpen(false)}
            className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-all block text-center cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            <span>Activate Plan Now →</span>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3.5 py-3 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
          {!isRoleResolved
            ? "Portal"
            : isB2B
            ? "B2B Partner Portal"
            : isCollectionCenter
            ? "Terminal Portal"
            : isReceptionist
            ? "Front Desk Portal"
            : isLocked
            ? "Locked Navigation"
            : "Navigation"}
        </p>

        {isLocked && isAdmin && (
          <Link
            href="/dashboard/account/lab?tab=subscription"
            onClick={() => setIsOpen(false)}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-bold transition-all bg-primary/15 text-primary border border-primary/30 mb-2 shadow-xs"
          >
            <Sparkles className="h-[18px] w-[18px] text-primary shrink-0" />
            <span className="flex-1">Lab Subscription</span>
            <span className="text-[10px] bg-primary text-primary-foreground font-extrabold px-2 py-0.5 rounded-full uppercase">
              Active Screen
            </span>
          </Link>
        )}

        {!isRoleResolved ? (
          <div className="space-y-2 px-1 py-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30">
                <div className="h-4 w-4 rounded-md bg-muted/60 shrink-0" />
                <div className="h-3.5 bg-muted/50 rounded-md" style={{ width: `${55 + (i % 3) * 15}%` }} />
              </div>
            ))}
          </div>
        ) : (
          visibleNav.map((item) => {
          if (item.children) {
            const isChildActive = !isLocked && item.children.some((c) => isActive(c.href));
            const isExpanded = !isLocked && (expandedItems[item.name] !== undefined ? expandedItems[item.name] : (isChildActive || hoveredItem === item.name));

            return (
              <div
                key={item.name}
                className="space-y-1"
                onMouseEnter={() => !isLocked && setHoveredItem(item.name)}
                onMouseLeave={() => !isLocked && setHoveredItem(null)}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item.name)}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer ${
                    isLocked
                      ? "opacity-50 hover:opacity-80 text-muted-foreground hover:bg-muted/40 cursor-not-allowed"
                      : isChildActive
                      ? "bg-accent/70 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`h-[18px] w-[18px] transition-transform duration-200 ${
                        isChildActive ? "text-primary" : ""
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5 text-rose-500/70" />
                  ) : (
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out ${
                        isExpanded ? "rotate-180 text-foreground" : "rotate-0"
                      }`}
                    />
                  )}
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pl-4 pr-1 space-y-1 border-l-2 border-border/70 ml-5 py-1">
                      {item.children.map((child) => {
                        const childActive = !isLocked && isActive(child.href);
                        return (
                          <Link
                            key={child.name}
                            href={isLocked ? "/dashboard/account/lab?tab=subscription" : child.href}
                            onClick={(e) => {
                              if (isLocked) handleLockedNavClick(e);
                              setIsOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
                              isLocked
                                ? "opacity-50 text-muted-foreground hover:opacity-80"
                                : childActive
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                  childActive ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                              />
                              <span>{child.name}</span>
                            </div>
                            {isLocked && <Lock className="h-3 w-3 text-rose-500/70" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const active = !isLocked && isActive(item.href);
          return (
            <Link
              key={item.name}
              href={isLocked ? "/dashboard/account/lab?tab=subscription" : item.href!}
              onClick={(e) => {
                if (isLocked) handleLockedNavClick(e);
                setIsOpen(false);
              }}
              className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
                isLocked
                  ? "opacity-50 hover:opacity-80 text-muted-foreground hover:bg-muted/40 cursor-not-allowed"
                  : active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full gradient-primary" />
                )}
                <item.icon
                  className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                    active ? "text-primary" : ""
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </div>
              {isLocked && <Lock className="h-3.5 w-3.5 text-rose-500/70" />}
            </Link>
          );
        }))}
      </nav>

      {/* Footer */}
      <div className="p-3.5 space-y-2.5 border-t border-border/60">
        {/* LIS AI Assistant Button (Moved from bottom-right to bottom-left sidebar) */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("toggle-ai-guide"));
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setIsOpen(false);
            }
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs group active:scale-[0.98] ${
            isAiGuideOpen
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/25 dark:border-emerald-500/35 text-foreground"
          }`}
          title="OnePath LIS AI Assistant & Guide"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${
                isAiGuideOpen
                  ? "bg-white/20 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col text-left leading-tight min-w-0">
              <span className="text-[12.5px] font-bold truncate">LIS AI Assistant</span>
              <span
                className={`text-[10px] font-medium truncate ${
                  isAiGuideOpen ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}
              >
                {isAiGuideOpen ? "Click to Close" : "Interactive Lab Guide"}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 transition-colors ${
              isAiGuideOpen
                ? "bg-white/20 text-white"
                : "bg-emerald-600 text-white shadow-2xs group-hover:bg-emerald-700"
            }`}
          >
            {isAiGuideOpen ? "Active" : "Ask AI"}
          </span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3.5 left-3.5 z-50 h-10 w-10 flex items-center justify-center rounded-xl bg-card/95 backdrop-blur-md border border-border/90 text-foreground md:hidden shadow-elevated transition-all active:scale-95 cursor-pointer"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="h-5 w-5 text-destructive" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-[hsl(165_30%_6%/0.5)] backdrop-blur-sm md:hidden"
        />
      )}

      <div className="hidden md:flex h-full">{content}</div>

      <div
        className={`fixed inset-y-0 left-0 z-40 flex md:hidden transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </div>
    </>
  );
}