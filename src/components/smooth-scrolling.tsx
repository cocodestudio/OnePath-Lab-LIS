"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function RouteScrollReset() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    // Instant scroll to top on every navigation
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (lenis) {
      try {
        lenis.scrollTo(0, { immediate: true });
      } catch {}
    }
  }, [pathname, lenis]);

  return null;
}

export function SmoothScrolling({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  // Instant scroll on navigation even if mobile or before mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  // On mobile, before mount, or inside dashboard (which has its own dedicated scroller): skip root Lenis
  const isDashboard = Boolean(pathname?.startsWith("/dashboard"));
  if (!mounted || isMobile || isDashboard) {
    return (
      <>
        <RouteScrollReset />
        {children}
      </>
    );
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1.1,
        infinite: false,
        // syncTouch DISABLED on desktop too — it was causing scroll-linked
        // Framer Motion animations to desync on trackpads.
        syncTouch: false,
      }}
    >
      <RouteScrollReset />
      {children}
    </ReactLenis>
  );
}
