"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { clearApiCache } from "@/lib/api-client";

export function NetworkStatusBanner() {
  const [status, setStatus] = useState<"idle" | "offline" | "restored">("idle");

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined" && !navigator.onLine) {
      setStatus("offline");
    }

    const handleOffline = () => {
      setStatus("offline");
    };

    const handleOnline = () => {
      setStatus("restored");
      // Clear in-memory API cache to ensure fresh network requests
      clearApiCache();
      // Notify all pages and components across the entire LIS to auto-sync silently
      window.dispatchEvent(new CustomEvent("lis_online_sync"));

      // Auto dismiss restored banner after 3.5 seconds
      const timer = setTimeout(() => {
        setStatus("idle");
      }, 3500);

      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (status === "idle") {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center justify-center max-w-lg w-[calc(100%-2rem)] px-2 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      {status === "offline" && (
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive text-destructive-foreground shadow-2xl border border-destructive-foreground/20 backdrop-blur-md">
          <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-destructive-foreground/15 shrink-0">
            <WifiOff className="h-5 w-5 animate-pulse text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs font-bold leading-tight tracking-wide text-white">
              No Internet Connection
            </p>
            <p className="text-[11px] text-white/90 leading-tight mt-0.5 line-clamp-1">
              Please connect to Wi-Fi or check your network cable. LIS is in offline mode.
            </p>
          </div>
        </div>
      )}

      {status === "restored" && (
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600 dark:bg-emerald-700 text-white shadow-2xl border border-emerald-400/30 backdrop-blur-md">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/20 shrink-0">
            <Wifi className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold leading-tight tracking-wide text-white">
                Internet Connection Restored
              </p>
              <RefreshCw className="h-3 w-3 animate-spin text-white/80" />
            </div>
            <p className="text-[11px] text-white/90 leading-tight mt-0.5">
              Syncing latest data automatically with server...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
