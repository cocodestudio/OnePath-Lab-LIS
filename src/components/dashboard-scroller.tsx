"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function DashboardScroller({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    // Skip on small mobile phone screens (< 768px) where native touch scrolling is ideal
    if (window.innerWidth < 768) return;

    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      lerp: 0.1,
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      syncTouch: false,
      autoResize: true,
      allowNestedScroll: true,
      prevent: (node) => {
        if (!node) return false;
        const el = node as HTMLElement;
        // Allow modals and dialogs to scroll natively
        if (
          el.closest?.(
            "[data-lenis-prevent], [data-lenis-prevent-wheel], [role='dialog'], [aria-modal='true']"
          )
        ) {
          return true;
        }
        // Allow child elements with their own internal scrollbar to scroll natively
        if (el !== wrapper && el !== content && el.scrollHeight > el.clientHeight + 2) {
          const style = window.getComputedStyle(el);
          if (style.overflowY === "auto" || style.overflowY === "scroll") {
            return true;
          }
        }
        return false;
      },
    });

    lenisRef.current = lenis;

    // Instant ResizeObserver without debounce lag to capture dynamic data updates
    const ro = new ResizeObserver(() => {
      lenis.resize();
    });
    ro.observe(wrapper);
    ro.observe(content);

    // MutationObserver to capture DOM node additions (tables, accordions, settings tabs)
    const mo = new MutationObserver(() => {
      lenis.resize();
    });
    mo.observe(content, { childList: true, subtree: true });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    const t1 = setTimeout(() => lenis.resize(), 100);
    const t2 = setTimeout(() => lenis.resize(), 500);
    const t3 = setTimeout(() => lenis.resize(), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Instant scroll-to-top on route change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      lenisRef.current.resize();
    }
    if (wrapperRef.current) {
      wrapperRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Global custom event to scroll to top programmatically (e.g., patient intake invoice generation)
  useEffect(() => {
    const handleScrollToTop = (e: Event) => {
      const customEvent = e as CustomEvent<{ immediate?: boolean }>;
      const immediate = customEvent.detail?.immediate ?? false;
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate });
        lenisRef.current.resize();
      }
      if (wrapperRef.current) {
        if (immediate) {
          wrapperRef.current.scrollTop = 0;
        } else {
          wrapperRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      if (immediate) {
        window.scrollTo({ top: 0, left: 0 });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("dashboard-scroll-top", handleScrollToTop);
    return () => {
      window.removeEventListener("dashboard-scroll-top", handleScrollToTop);
    };
  }, []);

  return (
    <main
      ref={wrapperRef}
      id="main-content"
      className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        ref={contentRef}
        className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8 py-4 sm:py-7 min-h-full safe-pb"
      >
        {children}
      </div>
    </main>
  );
}
