"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { getStoredUser, logout } from "@/lib/api-client";

function titleForPath(pathname: string): { eyebrow: string; title: string } {
  if (pathname === "/dashboard") return { eyebrow: "Dashboard", title: "Overview" };
  if (pathname.startsWith("/dashboard/patients/register")) return { eyebrow: "Patients", title: "Register Patient" };
  if (pathname.startsWith("/dashboard/patients")) return { eyebrow: "Directory", title: "Patients" };
  if (pathname.match(/\/dashboard\/reports\/[^/]+\/edit/)) return { eyebrow: "Reports", title: "Result Entry" };
  if (pathname.match(/\/dashboard\/reports\/[^/]+$/)) return { eyebrow: "Reports", title: "Report Details" };
  if (pathname.startsWith("/dashboard/reports")) return { eyebrow: "Diagnostics", title: "Reports" };
  if (pathname.startsWith("/dashboard/billing")) return { eyebrow: "Finance", title: "Billing" };
  if (pathname.startsWith("/dashboard/tests")) return { eyebrow: "Catalog", title: "Tests" };
  return { eyebrow: "OnePath", title: "Lab" };
}

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { eyebrow, title } = titleForPath(pathname);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const name = user?.name || "User";
  const role = user?.role || "Staff";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="flex h-[68px] items-center justify-between px-6 lg:px-8 glass border-b border-border/60 shrink-0 sticky top-0 z-30">
      {/* Page context */}
      <div className="pl-12 md:pl-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80 leading-none">{eyebrow}</p>
        <h1 className="font-display text-lg font-semibold tracking-tight text-foreground leading-tight mt-1">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/60">
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

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="gradient-primary text-primary-foreground text-[11px] font-bold">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-left leading-none">
              <span className="block text-[13px] font-semibold text-foreground">{name}</span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{role}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2.5 pb-2 pt-0.5">
              <p className="text-sm font-semibold text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive [&>svg]:text-destructive" onSelect={logout}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}