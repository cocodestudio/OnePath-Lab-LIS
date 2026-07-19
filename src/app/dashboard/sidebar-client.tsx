"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Receipt, LogOut, Menu, X, FlaskConical, Settings
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getStoredUser, logout } from "@/lib/api-client";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt },
  { name: "Tests", href: "/dashboard/tests", icon: FlaskConical },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const getInitials = (name: string) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "US";

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const content = (
    <aside className="flex h-full w-[256px] flex-col bg-card border-r border-border/70">
      {/* Brand */}
      <div className="flex h-[68px] items-center gap-3 px-6 shrink-0 border-b border-border/60">
        <div className="relative h-8 w-8 shrink-0">
          <Image src="/onepath-logo.png" alt="OnePath" fill sizes="32px" className="object-contain" />
        </div>
        <div className="leading-none">
          <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">OnePath</span>
          <span className="font-display text-[17px] font-light text-muted-foreground ml-1">Lab</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3.5 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
          Navigation
        </p>
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full gradient-primary" />}
              <item.icon className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${active ? "text-primary" : ""}`} />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3.5 space-y-2.5 border-t border-border/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="gradient-primary text-primary-foreground text-[11px] font-bold">
              {getInitials(user?.name || "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{user?.role || "Staff"}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
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
        className="fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-card border border-border text-foreground md:hidden shadow-elevated"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-[hsl(165_30%_6%/0.5)] backdrop-blur-sm md:hidden" />
      )}

      <div className="hidden md:flex h-full">{content}</div>

      <div className={`fixed inset-y-0 left-0 z-40 flex md:hidden transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {content}
      </div>
    </>
  );
}