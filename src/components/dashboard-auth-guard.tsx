"use client";

import { useEffect, useRef } from "react";
import { getStoredToken, handleLogout, fetchFromLaravel } from "@/lib/api-client";

export function DashboardAuthGuard() {
  const lastCheckTimeRef = useRef<number>(Date.now());
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    // 1. Immediate mount check
    if (!getStoredToken()) {
      handleLogout("normal");
      return;
    }

    // 2. Realtime token validity check against backend Sanctum store
    const verifyActiveSession = async () => {
      if (isCheckingRef.current) return;
      if (!getStoredToken()) {
        handleLogout("normal");
        return;
      }

      isCheckingRef.current = true;
      lastCheckTimeRef.current = Date.now();
      try {
        await fetchFromLaravel("/profile/sessions/status", { skipCache: true });
      } catch (err: any) {
        // If token has been revoked remotely or session ended, immediately redirect to login
        if (err?.message?.includes("Authentication") || err?.message?.includes("Unauthorized") || err?.status === 401) {
          handleLogout("normal");
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Verify immediately on mount
    verifyActiveSession();

    // 3. Heartbeat check every 12 seconds
    const heartbeatInterval = setInterval(() => {
      verifyActiveSession();
    }, 12000);

    // 4. On window focus / tab visibility change
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastCheckTimeRef.current > 5000) {
          verifyActiveSession();
        }
      }
    };

    // 5. On user click anywhere on page: verify session if > 8s since last check
    const handleDocumentClick = () => {
      if (Date.now() - lastCheckTimeRef.current > 8000) {
        verifyActiveSession();
      }
    };

    // 6. Listen for 401 unauthorized event from api-client
    const handleUnauthorizedEvent = () => {
      handleLogout("normal");
    };

    // 7. Prevent bfcache from serving protected pages after logout
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !getStoredToken()) {
        if (!getStoredToken()) {
          handleLogout("normal");
        } else {
          verifyActiveSession();
        }
      }
    };

    // 8. Prevent browser back navigation from exiting authenticated session
    const handlePopState = () => {
      if (!getStoredToken()) {
        handleLogout("normal");
      } else if (window.location.pathname === "/dashboard") {
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
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("lis_auth_unauthorized", handleUnauthorizedEvent);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    document.addEventListener("click", handleDocumentClick, { passive: true });

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("lis_auth_unauthorized", handleUnauthorizedEvent);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return null;
}
