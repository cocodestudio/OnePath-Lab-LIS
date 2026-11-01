/**
 * In-App Browser & WhatsApp Breakout Utility
 * 
 * Detects sandboxed in-app WebViews (specifically WhatsApp, Facebook, Instagram, etc.)
 * and provides seamless breakout into external browsers (Google Chrome, Samsung Internet, Safari).
 * Fixes PDF download blocking, isolated storage, and rendering bugs inside WhatsApp.
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  isWhatsApp: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  browserName: string;
}

export function detectInAppBrowser(customUa?: string): InAppBrowserInfo {
  if (typeof window === "undefined" && !customUa) {
    return {
      isInApp: false,
      isWhatsApp: false,
      isAndroid: false,
      isIOS: false,
      browserName: "unknown",
    };
  }

  const ua = customUa ?? (typeof navigator !== "undefined" ? navigator.userAgent || navigator.vendor || "" : "");
  
  const isWhatsApp = /WhatsApp/i.test(ua);
  const isFacebook = /FBAN|FBAV/i.test(ua);
  const isInstagram = /Instagram/i.test(ua);
  const isLine = /Line\//i.test(ua);
  const isTwitter = /Twitter/i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);
  const isTikTok = /musical_ly|ByteLocale/i.test(ua);
  
  // Generic Android WebView token
  const isAndroidWebView = /Android.*Version\/[0-9.]+\s+(?:Chrome\/[0-9.]+\s+)?(?:Mobile\s+)?/i.test(ua) && /wv|\.0\.0\.0/i.test(ua);

  const isInApp = isWhatsApp || isFacebook || isInstagram || isLine || isTwitter || isWeChat || isTikTok || isAndroidWebView;
  
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let browserName = "Standard Browser";
  if (isWhatsApp) browserName = "WhatsApp";
  else if (isInstagram) browserName = "Instagram";
  else if (isFacebook) browserName = "Facebook";
  else if (isLine) browserName = "Line";
  else if (isInApp) browserName = "In-App Browser";

  return {
    isInApp,
    isWhatsApp,
    isAndroid,
    isIOS,
    browserName,
  };
}

/**
 * Builds standard Android Intent URL to force open Google Chrome or default system browser
 */
export function buildAndroidChromeIntent(targetUrl: string): string {
  const cleanUrl = targetUrl.replace(/^https?:\/\//i, "");
  return `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end;`;
}

/**
 * Builds generic Android Intent URL to open any installed browser without locking to Chrome
 */
export function buildAndroidGenericIntent(targetUrl: string): string {
  const cleanUrl = targetUrl.replace(/^https?:\/\//i, "");
  return `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
}

/**
 * Break out of WhatsApp or in-app browser and open in external Chrome/Safari
 */
export function openInExternalBrowser(targetUrl?: string): void {
  if (typeof window === "undefined") return;

  const url = targetUrl || window.location.href;
  const { isAndroid, isIOS } = detectInAppBrowser();

  if (isAndroid) {
    const chromeIntent = buildAndroidChromeIntent(url);
    const genericIntent = buildAndroidGenericIntent(url);

    try {
      window.location.href = chromeIntent;
      // Fallback to generic intent if Chrome package is not present
      setTimeout(() => {
        try {
          window.location.href = genericIntent;
        } catch (_) {
          window.open(url, "_system");
        }
      }, 600);
    } catch (_) {
      window.location.href = genericIntent;
    }
  } else if (isIOS) {
    // On iOS, attempt Chrome URI scheme or Safari
    const cleanUrl = url.replace(/^https?:\/\//i, "");
    const chromeUrl = `googlechromes://${cleanUrl}`;
    
    try {
      window.location.href = chromeUrl;
      setTimeout(() => {
        window.open(url, "_blank");
      }, 500);
    } catch (_) {
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
}

/**
 * Automatically triggers breakout on page mount (once per browser session)
 */
export function triggerAutoBreakout(targetUrl?: string): boolean {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return false;

  const { isWhatsApp, isAndroid, isInApp } = detectInAppBrowser();

  // Only auto-attempt on Android where intent protocol reliably breaks out of WhatsApp WebViews
  if ((isWhatsApp || isInApp) && isAndroid) {
    try {
      const key = "op_auto_breakout_done";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        openInExternalBrowser(targetUrl);
        return true;
      }
    } catch (_) {
      // Ignore private mode sessionStorage restrictions
    }
  }
  return false;
}

