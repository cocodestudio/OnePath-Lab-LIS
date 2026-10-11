"use client";

import { useEffect } from "react";
import { getStoredToken } from "@/lib/api-client";

export function DashboardAuthGuard() {
  useEffect(() => {
    // 1. Immediate mount check
    if (!getStoredToken()) {
      window.location.replace("/login");
      return;
    }

    // 2. Prevent bfcache (Back/Forward Cache) from serving protected pages after logout
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !getStoredToken()) {
        if (!getStoredToken()) {
          window.location.replace("/login");
        }
      }
    };

    // 3. Prevent browser back navigation from exiting authenticated session
    const handlePopState = () => {
      if (!getStoredToken()) {
        window.location.replace("/login");
      } else if (window.location.pathname === "/dashboard") {
        // Keep active session securely inside workstation
        window.history.pushState(null, "", window.location.href);
      }
    };

    try {
      if (window.location.pathname === "/dashboard") {
        window.history.pushState(null, "", window.location.href);
      }
    } catch {}

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return null;
}
