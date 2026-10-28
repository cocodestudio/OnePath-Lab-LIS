"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

export type ToastInput = 
  | string 
  | {
      title?: string;
      description?: string;
      variant?: ToastVariant;
      text?: string;
      type?: "success" | "error" | "warning" | "info";
      duration?: number;
    };

export interface ToastContextValue {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id?: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const variantConfig: Record<
  ToastVariant,
  {
    icon: React.ElementType;
    iconWrap: string;
    progressBar: string;
    cardBorder: string;
    badgeText: string;
    glow: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
    progressBar: "bg-emerald-500",
    cardBorder: "border-emerald-500/30 hover:border-emerald-500/50",
    badgeText: "Success",
    glow: "shadow-[0_12px_30px_-5px_rgba(16,185,129,0.22)]",
  },
  error: {
    icon: AlertCircle,
    iconWrap: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25",
    progressBar: "bg-rose-500",
    cardBorder: "border-rose-500/30 hover:border-rose-500/50",
    badgeText: "Error",
    glow: "shadow-[0_12px_30px_-5px_rgba(244,63,94,0.22)]",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25",
    progressBar: "bg-amber-500",
    cardBorder: "border-amber-500/30 hover:border-amber-500/50",
    badgeText: "Attention",
    glow: "shadow-[0_12px_30px_-5px_rgba(245,158,11,0.22)]",
  },
  info: {
    icon: Info,
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25",
    progressBar: "bg-sky-500",
    cardBorder: "border-sky-500/30 hover:border-sky-500/50",
    badgeText: "Notice",
    glow: "shadow-[0_12px_30px_-5px_rgba(14,165,233,0.22)]",
  },
};

function ToastCard({
  id,
  title,
  description,
  variant,
  duration = 4200,
  onClose,
}: ToastItem & { onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const [isDismissing, setIsDismissing] = React.useState(false);
  const [dismissDirection, setDismissDirection] = React.useState<"left" | "right" | "none">("none");
  const [isPaused, setIsPaused] = React.useState(false);
  const [dragX, setDragX] = React.useState<number>(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const dragDirectionLockedRef = React.useRef<"horizontal" | "vertical" | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const remainingTimeRef = React.useRef<number>(duration);

  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.icon;

  const triggerClose = React.useCallback(() => {
    setIsDismissing(true);
    setDismissDirection("none");
    setTimeout(() => {
      onClose();
    }, 240);
  }, [onClose]);

  // Mount animation trigger
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss timer with pause on hover
  React.useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      triggerClose();
    }, remainingTimeRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, triggerClose]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(800, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  // Mobile Touch Swipe Handling (Strictly horizontal swipe-to-dismiss like Chrome browser notifications)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    dragDirectionLockedRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    // Detect gesture intent: if user starts scrolling vertically, don't hijack as horizontal drag
    if (!dragDirectionLockedRef.current) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        dragDirectionLockedRef.current = "vertical";
        return;
      }
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) >= Math.abs(deltaY)) {
        dragDirectionLockedRef.current = "horizontal";
        setIsDragging(true);
      }
    }

    // Strictly horizontal dragging only (NO vertical dragging)
    if (dragDirectionLockedRef.current === "horizontal") {
      setDragX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) {
      setIsDragging(false);
      setIsPaused(false);
      return;
    }

    const elapsed = Math.max(1, Date.now() - touchStartRef.current.time);
    const velocityX = Math.abs(dragX) / elapsed; // px per ms

    setIsDragging(false);
    setIsPaused(false);

    // Chrome-like swipe-to-dismiss: either swiped > 65px or high-velocity flick (> 0.35px/ms with > 25px travel)
    const isFlick = velocityX > 0.35 && Math.abs(dragX) > 25;
    const isDistancePast = Math.abs(dragX) > 65;

    if (isDistancePast || isFlick) {
      const direction = dragX > 0 ? "right" : "left";
      setDismissDirection(direction);
      setIsDismissing(true);
      setTimeout(() => {
        onClose();
      }, 220);
    } else {
      // Smooth spring back to neutral position
      setDragX(0);
      setDismissDirection("none");
    }

    touchStartRef.current = null;
    dragDirectionLockedRef.current = null;
  };

  // Compute transform & opacity for Chrome-like horizontal drag gestures
  const dragStyle: React.CSSProperties = {
    transform: isDismissing
      ? dismissDirection === "left"
        ? "translate3d(-120%, 0, 0)"
        : dismissDirection === "right"
        ? "translate3d(120%, 0, 0)"
        : "translate3d(0, -35px, 0) scale(0.95)"
      : isDragging
      ? `translate3d(${dragX}px, 0, 0)`
      : "translate3d(0, 0, 0)",
    opacity: isDismissing
      ? 0
      : isDragging
      ? Math.max(0.15, 1 - Math.abs(dragX) / 220)
      : mounted
      ? 1
      : 0,
    transition: isDragging
      ? "none"
      : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease-out",
    touchAction: "pan-y",
    willChange: "transform, opacity",
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={dragStyle}
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto relative overflow-hidden rounded-xl sm:rounded-2xl border bg-card/95 backdrop-blur-xl p-3 sm:p-4 text-card-foreground shadow-xl sm:shadow-2xl select-none sm:select-auto w-full ${
        isDragging ? "" : "transition-all duration-300 ease-out"
      } ${config.cardBorder} ${config.glow} ${
        mounted && !isDismissing
          ? "translate-y-0 sm:translate-x-0 scale-100 opacity-100"
          : "-translate-y-6 sm:translate-y-0 sm:translate-x-8 scale-95 opacity-0"
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Status Icon */}
        <div
          className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-105 ${config.iconWrap}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        {/* Content Body */}
        <div className="min-w-0 flex-1 pt-0.5 pr-6 sm:pr-7 space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-foreground leading-snug tracking-tight break-words">
            {title}
          </p>
          {description && (
            <div className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-h-28 overflow-y-auto overscroll-contain pr-1 break-words scrollbar-thin">
              {description}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={triggerClose}
          type="button"
          aria-label="Dismiss notification"
          className="absolute right-2 top-2 sm:right-3 sm:top-3 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Auto-dismiss Animated Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-muted/30 overflow-hidden">
        <div
          className={`h-full ${config.progressBar}`}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      let title = "";
      let description: string | undefined = undefined;
      let variant: ToastVariant = "info";
      let duration: number | undefined = undefined;

      if (typeof input === "string") {
        title = input;
      } else if (typeof input === "object" && input !== null) {
        title = input.title || input.text || "";
        description = input.description;
        variant = input.variant || input.type || "info";
        duration = input.duration;
      }

      const item: ToastItem = {
        id,
        title,
        description,
        variant,
        duration,
      };

      // Limit stack to max 4 active toasts (remove oldest if full)
      setToasts((prev) => [...prev.slice(-3), item]);
    },
    []
  );

  const success = React.useCallback(
    (title: string, description?: string) => {
      toast({ title, description, variant: "success" });
    },
    [toast]
  );

  const error = React.useCallback(
    (title: string, description?: string) => {
      toast({ title, description, variant: "error" });
    },
    [toast]
  );

  const warning = React.useCallback(
    (title: string, description?: string) => {
      toast({ title, description, variant: "warning" });
    },
    [toast]
  );

  const info = React.useCallback(
    (title: string, description?: string) => {
      toast({ title, description, variant: "info" });
    },
    [toast]
  );

  const dismiss = React.useCallback(
    (id?: number) => {
      if (typeof id === "number") {
        remove(id);
      } else {
        setToasts([]);
      }
    },
    [remove]
  );

  // Global event listener so any page or function can trigger toast anywhere
  React.useEffect(() => {
    const handleCustomToast = (e: any) => {
      if (e?.detail) {
        toast(e.detail);
      }
    };

    window.addEventListener("lis:show-toast", handleCustomToast);
    (window as any).showLisToast = (
      input: ToastInput,
      variantOverride?: ToastVariant
    ) => {
      if (typeof input === "string") {
        toast({ title: input, variant: variantOverride || "info" });
      } else {
        toast(input);
      }
    };

    return () => {
      window.removeEventListener("lis:show-toast", handleCustomToast);
    };
  }, [toast]);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success,
      error,
      warning,
      info,
      dismiss,
    }),
    [toast, success, error, warning, info, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Container:
          - Mobile: Top-center fixed, responsive with safe-area top inset & smooth stack scrolling
          - Desktop (sm:): Bottom-right fixed with max-w-[380px]
      */}
      <div
        className="toast-floating-container pointer-events-none fixed z-[999999] left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] max-w-[calc(100vw-1.5rem)] sm:max-w-[380px] mx-auto sm:mx-0 flex flex-col gap-2 transition-all max-h-[85vh] overflow-y-auto overscroll-contain no-scrollbar p-0.5"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} {...t} onClose={() => remove(t.id)} />
        ))}
      </div>

      <style jsx>{`
        .toast-floating-container {
          top: max(0.75rem, env(safe-area-inset-top, 0.75rem));
          bottom: auto;
        }
        @media (min-width: 640px) {
          .toast-floating-container {
            top: auto;
            bottom: 1.5rem;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// Global standalone helper
export const showLisToast = (
  input: ToastInput,
  variant: ToastVariant = "info"
) => {
  if (typeof window !== "undefined") {
    if (typeof (window as any).showLisToast === "function") {
      (window as any).showLisToast(input, variant);
    } else {
      const detail =
        typeof input === "string"
          ? { title: input, variant }
          : {
              title: input.title || (input as any).text || "",
              description: input.description,
              variant: input.variant || (input as any).type || variant,
            };
      window.dispatchEvent(new CustomEvent("lis:show-toast", { detail }));
    }
  }
};
