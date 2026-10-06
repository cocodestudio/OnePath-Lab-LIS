"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  BarChart3,
  FileSpreadsheet,
  Boxes,
  Tag
} from "lucide-react";

interface TestsNavTabsProps {
  className?: string;
}

export function TestsNavTabs({ className = "" }: TestsNavTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Test Catalog",
      href: "/dashboard/tests",
      icon: FlaskConical,
      exact: true,
    },
    {
      name: "Tests Count",
      href: "/dashboard/tests/count",
      icon: BarChart3,
      badge: "Analytics",
    },
    {
      name: "Worksheet",
      href: "/dashboard/tests/worksheet",
      icon: FileSpreadsheet,
      badge: "Print PDF",
    },
    {
      name: "Health Packages",
      href: "/dashboard/tests/packages",
      icon: Boxes,
    },
    {
      name: "Rate List",
      href: "/dashboard/ratelist",
      icon: Tag,
    },
  ];

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-muted/50 border border-border/80 rounded-xl overflow-x-auto custom-scrollbar shrink-0 shadow-xs ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? "bg-background text-foreground shadow-xs border border-border/90"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <span>{tab.name}</span>
            {tab.badge && (
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
