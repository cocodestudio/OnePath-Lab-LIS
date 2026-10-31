"use client";

import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const STORAGE_KEY = "onepath_lims_pwa_dismissed";

export function LimsInstallPill() {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if user permanently closed/dismissed the install button or is on mobile/tablet
    try {
      const isMobileOrTablet =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(navigator.userAgent) ||
        (typeof window !== "undefined" && window.innerWidth < 1024);
      if (isMobileOrTablet) {
        setIsVisible(false);
        return;
      }

      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === "true") {
        return;
      }
    } catch (_) {}

    // 2. Check if already installed (standalone mode)
    const checkIsStandalone = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      if (isStandalone) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkIsStandalone()) {
      return;
    }

    // 3. Register service worker for PWA installability criteria
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.debug("Service worker registration:", err));
    }

    // 4. Capture native beforeinstallprompt event
    // Check if globally pre-captured
    if ((window as any).__pwaInstallPrompt) {
      setDeferredPrompt((window as any).__pwaInstallPrompt);
      setIsVisible(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5. When app is installed, auto-hide and save dismissed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch (_) {}
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. If first-time user hasn't dismissed and not installed, show pill
    const timer = setTimeout(() => {
      if (!checkIsStandalone()) {
        try {
          const dismissed = localStorage.getItem(STORAGE_KEY);
          if (dismissed !== "true") {
            setIsVisible(true);
          }
        } catch (_) {}
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Close / Dismiss permanently (never show again)
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (_) {}
  };

  // Trigger the native browser install popup directly
  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== "undefined" ? (window as any).__pwaInstallPrompt : null);

    if (promptEvent && typeof promptEvent.prompt === "function") {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsVisible(false);
          try {
            localStorage.setItem(STORAGE_KEY, "true");
          } catch (_) {}
        }
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
      } catch (err) {
        console.error("Native install prompt error:", err);
      }
    }
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in pointer-events-auto">
      <div className="inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-card/95 hover:bg-card border border-border/90 shadow-xl backdrop-blur-md text-xs sm:text-sm font-semibold text-foreground transition-all duration-200 hover:shadow-2xl">
        
        {/* Native Browser Install Action */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors cursor-pointer select-none"
          title="Install OnePath Lab LIMS on Desktop"
        >
          <Download className="h-4 w-4 text-primary shrink-0" />
          <span className="whitespace-nowrap font-medium text-xs sm:text-[13px]">
            Install OnePath Lab
          </span>
        </button>

        {/* Divider */}
        <span className="h-4 w-px bg-border/80 mx-0.5" />

        {/* Close (x) Button - Permanently Dismisses */}
        <button
          type="button"
          onClick={handleDismiss}
          className="h-5 w-5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
          title="Don't show again"
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </button>

      </div>
    </div>
  );
}
