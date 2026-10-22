"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react";
import { clearApiCache } from "@/lib/api-client";

export function NetworkStatusBanner() {
  const [status, setStatus] = useState<"idle" | "offline" | "restored">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const statusRef = useRef<"idle" | "offline" | "restored">("idle");

  // Keep ref synchronized with status for event listener callbacks
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    clearApiCache();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lis_online_sync"));
    }
    setTimeout(() => {
      setIsRetrying(false);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setStatus("restored");
        setTimeout(() => setStatus("idle"), 2500);
      }
    }, 800);
  }, []);

  useEffect(() => {
    // Only trigger offline on mount if genuinely disconnected
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      setErrorMessage("Please connect to Wi-Fi or check your network cable. LIS is in offline mode.");
    }

    const handleOffline = () => {
      // ONLY trigger when browser reports genuine offline state
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        setErrorMessage("Internet connection lost. You can continue viewing loaded data offline.");
      }
    };

    const handleOnline = () => {
      // ONLY show restored banner if the user was genuinely in the offline state
      if (statusRef.current === "offline") {
        setStatus("restored");
        setErrorMessage("");
        clearApiCache();
        window.dispatchEvent(new CustomEvent("lis_online_sync"));

        const timer = setTimeout(() => {
          setStatus("idle");
        }, 3000);

        return () => clearTimeout(timer);
      }
    };

    const handleNetworkError = () => {
      // STRICT: ONLY show banner if internet is completely disconnected
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        setErrorMessage("Internet connection lost. You can continue viewing loaded data offline.");
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("lis_network_error", handleNetworkError);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("lis_network_error", handleNetworkError);
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
      {/* 1. Complete Offline State (Triggered ONLY when internet is completely lost) */}
      {status === "offline" && (
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive text-destructive-foreground shadow-2xl border border-destructive-foreground/20 backdrop-blur-md w-full">
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
              {errorMessage || "Please connect to Wi-Fi or check your network cable."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Restored State */}
      {status === "restored" && (
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600 dark:bg-emerald-700 text-white shadow-2xl border border-emerald-400/30 backdrop-blur-md w-full">
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
              Syncing latest diagnostic data automatically with server...
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
