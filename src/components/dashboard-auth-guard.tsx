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

    // 3. Heartbeat check (60s interval per AGENTS.md Rule 4.5; cross-tab revocation is handled instantly via BroadcastChannel)
    const heartbeatInterval = setInterval(() => {
      verifyActiveSession();
    }, 60000);

    // 4. On window focus / tab visibility change (throttle to max once every 30s)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastCheckTimeRef.current > 30000) {
          verifyActiveSession();
        }
      }
    };

    // 5. Listen for 401 unauthorized event from api-client
    const handleUnauthorizedEvent = () => {
      handleLogout("normal");
    };

    // 6. Instant cross-tab real-time session termination via BroadcastChannel
    let authChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        authChannel = new BroadcastChannel("onepath_auth_channel");
        authChannel.onmessage = (event) => {
          if (event.data?.type === "SESSION_REVOKED" || event.data?.type === "LOGOUT") {
            handleLogout("normal");
          }
        };
      }
    } catch {}

    // 8. Cross-tab storage event listener for instant 0ms session invalidation
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "lis_auth_revoked_at" || event.key === "lis_logged_out" || (event.key === "lis_token" && !event.newValue)) {
        handleLogout("normal");
      }
    };

    // 9. Prevent bfcache from serving protected pages after logout
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !getStoredToken()) {
        if (!getStoredToken()) {
          handleLogout("normal");
        } else {
          verifyActiveSession();
        }
      }
    };

    // 10. Prevent browser back navigation from exiting authenticated session
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
    window.addEventListener("storage", handleStorageEvent);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearInterval(heartbeatInterval);
      if (authChannel) {
        try {
          authChannel.close();
        } catch {}
      }
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("lis_auth_unauthorized", handleUnauthorizedEvent);
      window.removeEventListener("storage", handleStorageEvent);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  return null;
}
