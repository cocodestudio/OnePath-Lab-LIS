"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Receipt, LogOut, Menu, X,
  FlaskConical, Settings, HelpCircle, LifeBuoy, Clock, TrendingUp,
  Briefcase, ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStoredUser, logout } from "@/lib/api-client";

interface NavChild {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt },
  {
    name: "Tests",
    icon: FlaskConical,
    children: [
      { name: "Tests", href: "/dashboard/tests" },
      { name: "Packages", href: "/dashboard/tests/packages" },
      { name: "Rate List", href: "/dashboard/ratelist" },
    ],
  },
  { name: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setUser(getStoredUser());
    update();
    window.addEventListener("user-updated", update);
    return () => window.removeEventListener("user-updated", update);
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
    const isCurrentlyOpen = Boolean(expandedItems[itemName]) || hoveredItem === itemName;
    if (isCurrentlyOpen) {
      setExpandedItems((prev) => ({ ...prev, [itemName]: false }));
      setHoveredItem(null);
    } else {
      setExpandedItems((prev) => ({ ...prev, [itemName]: true }));
    }
  };

  const getInitials = (name: string) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "US";

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/patients") return pathname === "/dashboard/patients";
    if (href === "/dashboard/today-samples") return pathname === "/dashboard/today-samples";
    if (href === "/dashboard/reports") return pathname === "/dashboard/reports";
    if (href === "/dashboard/revenue") return pathname === "/dashboard/revenue";
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  };

  const isB2B = user?.role === "B2B";
  const isCollectionCenter = user?.role === "COLLECTION_CENTER";

  const collectionNav: NavItem[] = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Today Samples", href: "/dashboard/today-samples", icon: Clock },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Billing", href: "/dashboard/billing", icon: Receipt },
    { name: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
  ];

  const b2bNav: NavItem[] = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/dashboard/patients", icon: Users },
    { name: "Today Samples", href: "/dashboard/today-samples", icon: Clock },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
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

  const visibleNav = isB2B ? b2bNav : isCollectionCenter ? collectionNav : navigation;

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
        <Link
          href="/dashboard/patients/register"
          onClick={() => setIsOpen(false)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold text-xs shadow-md ring-inset-top hover:-translate-y-px active:scale-[0.98] transition-all"
        >
          <span className="text-base leading-none font-bold">+</span>
          <span>{isB2B ? "New Requisition" : isCollectionCenter ? "Sample Entry" : "Add Patient"}</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3.5 py-3 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
          {isB2B ? "B2B Partner Portal" : isCollectionCenter ? "Terminal Portal" : "Navigation"}
        </p>
        {visibleNav.map((item) => {
          if (item.children) {
            const isChildActive = item.children.some((c) => isActive(c.href));
            const isExpanded = Boolean(expandedItems[item.name]) || hoveredItem === item.name;

            return (
              <div
                key={item.name}
                className="space-y-1"
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item.name)}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200 cursor-pointer ${
                    isChildActive
                      ? "bg-accent/70 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                        isChildActive ? "text-primary" : ""
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out ${
                      isExpanded ? "rotate-180 text-foreground" : "rotate-0"
                    }`}
                  />
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
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
                              childActive
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                childActive ? "bg-primary" : "bg-muted-foreground/40"
                              }`}
                            />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href!}
              onClick={() => setIsOpen(false)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full gradient-primary" />
              )}
              <item.icon
                className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                  active ? "text-primary" : ""
                }`}
              />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3.5 space-y-2.5 border-t border-border/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
          <Avatar className="h-9 w-9 shrink-0">
            {userAvatar && <AvatarImage src={userAvatar} alt={labDisplayName} className="object-cover" />}
            <AvatarFallback className="gradient-primary text-primary-foreground text-[11px] font-bold">
              {labDisplayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate" title={labDisplayName}>{labDisplayName}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {isB2B ? "B2B Partner Lab" : isCollectionCenter ? "Collection Center" : (user?.role || "Staff")}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
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