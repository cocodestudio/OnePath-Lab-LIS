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
  const [isPaused, setIsPaused] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const remainingTimeRef = React.useRef<number>(duration);

  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.icon;

  const triggerClose = React.useCallback(() => {
    setIsDismissing(true);
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

  // Mobile Touch Swipe Handling (Swipe down or swipe sideways like Chrome/Android)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setIsDragging(true);
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    // Resistance when swiping upwards (toast is already at the bottom)
    const effectiveY = deltaY < 0 ? deltaY * 0.25 : deltaY;

    setDragOffset({
      x: deltaX,
      y: effectiveY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPaused(false);

    // If swiped down by > 35px or sideways by > 65px, dismiss
    if (dragOffset.y > 35 || Math.abs(dragOffset.x) > 65) {
      setIsDismissing(true);
      setTimeout(() => {
        onClose();
      }, 200);
    } else {
      // Spring back to neutral
      setDragOffset({ x: 0, y: 0 });
    }
    touchStartRef.current = null;
  };

  // Compute transform & opacity for drag gestures
  const dragStyle: React.CSSProperties = {
    transform: isDismissing
      ? "translate3d(0, 40px, 0) scale(0.95)"
      : isDragging
      ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`
      : "translate3d(0, 0, 0)",
    opacity: isDismissing
      ? 0
      : isDragging
      ? Math.max(0.2, 1 - (Math.abs(dragOffset.y) * 1.5 + Math.abs(dragOffset.x)) / 220)
      : mounted
      ? 1
      : 0,
    transition: isDragging
      ? "none"
      : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out",
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
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-card/95 backdrop-blur-xl p-3.5 sm:p-4 text-card-foreground shadow-2xl transition-all duration-300 ease-out select-none sm:select-auto ${
        config.cardBorder
      } ${config.glow} ${
        mounted && !isDismissing
          ? "translate-y-0 sm:translate-x-0 scale-100"
          : "translate-y-8 sm:translate-y-0 sm:translate-x-12 scale-95"
      }`}
    >
      {/* Mobile Swipe Grab Handle (Chrome Mobile Bottom Sheet Style) */}
      <div className="flex sm:hidden justify-center pb-1 -mt-1 cursor-grab active:cursor-grabbing">
        <div className="h-1 w-10 rounded-full bg-muted-foreground/35" />
      </div>

      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-105 ${config.iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content Body */}
        <div className="min-w-0 flex-1 pt-0.5 pr-6 space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-foreground leading-snug tracking-tight">
            {title}
          </p>
          {description && (
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {description}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={triggerClose}
          type="button"
          aria-label="Dismiss notification"
          className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:scale-95"
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
          - Mobile: Bottom-center fixed, full-width with padding, like Chrome bottom sheet / snackbar
          - Desktop (sm:): Bottom-right fixed with max-w-[380px]
      */}
      <div
        className="pointer-events-none fixed z-[999999] bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] max-w-full flex flex-col gap-2.5 transition-all"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} {...t} onClose={() => remove(t.id)} />
        ))}
      </div>
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
