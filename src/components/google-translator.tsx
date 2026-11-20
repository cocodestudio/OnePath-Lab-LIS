"use client";

import React, { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

// Ensure client-side safety: patch Node removeChild and insertBefore to prevent React crashes from translation mutations
if (typeof window !== "undefined" && typeof Node !== "undefined" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

/**
 * Universal language switcher helper:
 * 1. Persists selection in localStorage ('onepath_user_language').
 * 2. Sets or clears 'googtrans' cookie (/en/{langCode}) across path and domain.
 * 3. Safely reloads the page to guarantee clean React hydration without DOM reconciliation errors.
 */
export function changeLanguage(newLang: string) {
  try {
    const lang = newLang || "en";
    localStorage.setItem("onepath_user_language", lang);

    const hostname = typeof window !== "undefined" ? window.location.hostname : "";

    if (lang === "en") {
      // Revert to English: clear googtrans cookies across root domain and current host
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      if (hostname.includes(".")) {
        const rootDomain = "." + hostname.split(".").slice(-2).join(".");
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${rootDomain};`;
      }
      window.location.reload();
      return;
    }

    // Set googtrans cookie for target language
    const cookieVal = `/en/${lang}`;
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
    if (hostname.includes(".")) {
      const rootDomain = "." + hostname.split(".").slice(-2).join(".");
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain};`;
    }

    // Reload page to hydrate with the target language cleanly without DOM mismatches
    window.location.reload();
  } catch (err) {
    console.error("Failed to switch language:", err);
  }
}

export function GoogleTranslator() {
  useEffect(() => {
    try {
      // Synchronize initial cookie from localStorage if set
      const savedLang = localStorage.getItem("onepath_user_language") || "en";
      const hostname = window.location.hostname;
      if (savedLang && savedLang !== "en") {
        const cookieVal = `/en/${savedLang}`;
        document.cookie = `googtrans=${cookieVal}; path=/;`;
        document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
        if (hostname.includes(".")) {
          const rootDomain = "." + hostname.split(".").slice(-2).join(".");
          document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain};`;
        }
      }
    } catch {}

    // Callback invoked when Google Translate script is loaded
    window.googleTranslateElementInit = () => {
      try {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              autoDisplay: false,
              includedLanguages:
                "en,hi,bn,ur,mr,te,ta,gu,pa,kn,ml,or,as,ar,fr,es,ru,de,pt,zh-CN,ja,ko,tr,it,fa,id,vi,th,nl,pl,uk",
              layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE,
            },
            "google_translate_element"
          );
        }
      } catch (err) {
        console.warn("Google Translate initialization warning:", err);
      }
    };

    // Inject Google Translate script if not present
    const SCRIPT_ID = "google-translate-script";
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.type = "text/javascript";
      script.async = true;
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div
      id="google_translate_element"
      className="hidden notranslate pointer-events-none select-none"
      style={{
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        visibility: "hidden",
      }}
      aria-hidden="true"
    />
  );
}
