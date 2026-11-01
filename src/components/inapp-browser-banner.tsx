"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, X, Globe, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectInAppBrowser, openInExternalBrowser, triggerAutoBreakout } from "@/lib/inapp-browser";

interface InAppBrowserBannerProps {
  title?: string;
  description?: string;
}

export function InAppBrowserBanner({
  title = "Open in Chrome / External Browser",
  description = "WhatsApp's in-app browser blocks PDF downloads and limits features. Open in Chrome or Safari for the best experience.",
}: InAppBrowserBannerProps) {
  const [inAppInfo, setInAppInfo] = useState<{
    isInApp: boolean;
    isWhatsApp: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    browserName: string;
  } | null>(null);

  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const info = detectInAppBrowser();
    setInAppInfo(info);

    if (info.isInApp) {
      // Attempt silent auto-breakout to Chrome/system browser on Android
      triggerAutoBreakout();
    }
  }, []);

  if (!inAppInfo || !inAppInfo.isInApp || isDismissed) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (_) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md border-b border-emerald-500/40 relative z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="max-w-6xl mx-auto px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Info Section */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white drop-shadow-xs">
                  {title}
                </span>
                <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/25">
                  {inAppInfo.isWhatsApp ? "WhatsApp Detected" : inAppInfo.browserName}
                </span>
              </div>
              <p className="text-[11px] text-white/90 leading-tight mt-0.5 line-clamp-2">
                {description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Button
              size="sm"
              onClick={() => openInExternalBrowser()}
              className="flex-1 sm:flex-initial h-8 px-3.5 text-xs font-bold bg-white text-emerald-800 hover:bg-white/90 rounded-lg shadow-xs cursor-pointer gap-1.5 transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              <span>{inAppInfo.isAndroid ? "Open in Chrome" : "Open in Browser"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 px-2.5 text-xs font-semibold bg-emerald-700/60 hover:bg-emerald-700 text-white border-white/30 rounded-lg cursor-pointer gap-1 transition-all"
              title="Copy page URL"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
              title="Dismiss notice"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pro Tip on WhatsApp ⋮ menu */}
        <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px] text-white/85">
          <span className="truncate">
            💡 <strong>Quick Fix:</strong> Tap the <strong>⋮ (three dots)</strong> in top-right corner of WhatsApp and select <strong>&quot;Open in Chrome&quot;</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}

