"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // When route changes, complete the progress bar
    if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const isExternal = target.getAttribute("target") === "_blank" || target.getAttribute("rel")?.includes("external");
      const isAnchor = href?.startsWith("#");
      const isSamePath = href === window.location.pathname + window.location.search;

      if (href && !isExternal && !isAnchor && !isSamePath && href.startsWith("/")) {
        setVisible(true);
        setProgress(25);

        const t1 = setTimeout(() => setProgress(55), 100);
        const t2 = setTimeout(() => setProgress(80), 300);
        const t3 = setTimeout(() => setProgress(92), 700);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => document.removeEventListener("click", handleAnchorClick, true);
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* The glowing progress line */}
      <div
        className="h-[3px] sm:h-[3.5px] transition-all duration-300 ease-out shadow-sm"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
          boxShadow: "0 0 14px rgba(16, 185, 129, 0.9), 0 0 6px rgba(6, 182, 212, 0.7)",
        }}
      />
      {/* Trailing glowing head */}
      <div
        className="absolute top-0 right-0 h-[3.5px] w-24 bg-white/60 blur-[1px] -translate-y-[0.5px]"
        style={{
          boxShadow: "0 0 10px #fff, 0 0 20px #10b981",
        }}
      />
    </div>
  );
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarContent />
    </Suspense>
  );
}
