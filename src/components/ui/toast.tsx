"use client";

import * as React from "react";
import { Toaster, sileo } from "sileo";
import type {
  SileoButton,
  SileoOptions,
  SileoPosition,
  SileoState,
  SileoStyles,
} from "sileo";

export type { SileoButton, SileoOptions, SileoPosition, SileoState, SileoStyles };
export { Toaster, sileo };

export type ToastVariant = "success" | "error" | "warning" | "info" | "action";

export interface ToastItem {
  id: number | string;
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
      message?: string;
      type?: "success" | "error" | "warning" | "info" | "action";
      duration?: number;
      button?: SileoButton;
      position?: SileoPosition;
      icon?: React.ReactNode;
      fill?: string;
      styles?: SileoStyles;
      autopilot?: boolean | { expand?: number; collapse?: number };
      roundness?: number;
    };

export interface SileoPromiseOptions<T = unknown> {
  loading: SileoOptions;
  success: SileoOptions | ((data: T) => SileoOptions);
  error: SileoOptions | ((err: unknown) => SileoOptions);
  action?: SileoOptions | ((data: T) => SileoOptions);
  position?: SileoPosition;
}

export interface ToastCallable {
  (
    input: ToastInput | SileoOptions,
    descriptionOrOptions?: string | Partial<SileoOptions>
  ): string;
  toast: ToastCallable;
  success: (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ) => string;
  error: (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ) => string;
  warning: (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ) => string;
  info: (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ) => string;
  loading: (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ) => string;
  action: (
    opts: SileoOptions | string,
    descriptionOrButton?: string | SileoButton | Partial<SileoOptions>
  ) => string;
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    opts: SileoPromiseOptions<T>
  ) => Promise<T>;
  dismiss: (id?: string | number) => void;
  clear: (position?: SileoPosition) => void;
  show: (opts: SileoOptions | string) => string;
  sileo: typeof sileo;
}

export interface ToastContextValue extends ToastCallable {}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Normalizes string, object, or legacy options into standard SileoOptions.
 * Enforces "top-center" position across both PC and mobile devices,
 * with a sleek translucent lightweight dark slate background for maximum contrast & modern glassmorphism clarity.
 */
export function normalizeToastOptions(
  input: string | SileoOptions | ToastInput,
  descriptionOrOptions?: string | SileoButton | Partial<SileoOptions>
): SileoOptions {
  const defaultFill = "#1e2536";
  const defaultRoundness = 18;

  if (typeof input === "string") {
    if (typeof descriptionOrOptions === "string") {
      return {
        title: input,
        description: descriptionOrOptions,
        position: "top-center",
        fill: defaultFill,
        roundness: defaultRoundness,
      };
    }
    if (typeof descriptionOrOptions === "object" && descriptionOrOptions !== null) {
      if ("onClick" in descriptionOrOptions && "title" in descriptionOrOptions) {
        return {
          title: input,
          button: descriptionOrOptions as SileoButton,
          position: "top-center",
          fill: defaultFill,
          roundness: defaultRoundness,
        };
      }
      return {
        roundness: defaultRoundness,
        fill: defaultFill,
        ...descriptionOrOptions,
        title: input,
        position: (descriptionOrOptions as SileoOptions).position || "top-center",
      };
    }

    // Defensive check for single long strings (e.g. "Password reset link sent to user@domain.com")
    // When a single long sentence is passed without description, route it to description so
    // Sileo's pill header doesn't overflow or produce negative pillX coordinates.
    if (input.length > 24) {
      let derivedTitle = "Notification";
      if (/reset\s*link|password\s*reset/i.test(input)) {
        derivedTitle = "Reset Link Sent";
      } else if (/session|logged\s*out|revoked/i.test(input)) {
        derivedTitle = "Session Terminated";
      } else if (/failed|error|unable/i.test(input)) {
        derivedTitle = "Action Failed";
      } else if (/success|updated|saved|created/i.test(input)) {
        derivedTitle = "Success";
      } else if (/warning|caution/i.test(input)) {
        derivedTitle = "Notice";
      }

      return {
        title: derivedTitle,
        description: input,
        position: "top-center",
        fill: defaultFill,
        roundness: defaultRoundness,
      };
    }

    return {
      title: input,
      position: "top-center",
      fill: defaultFill,
      roundness: defaultRoundness,
    };
  }

  if (typeof input === "object" && input !== null) {
    const raw = input as any;
    let title = raw.title || raw.text || raw.message || "";
    let description = raw.description || raw.desc;

    // Same defensive check for object input without description
    if (typeof title === "string" && title.length > 24 && !description) {
      let derivedTitle = "Notification";
      if (/reset\s*link|password\s*reset/i.test(title)) {
        derivedTitle = "Reset Link Sent";
      } else if (/session|logged\s*out|revoked/i.test(title)) {
        derivedTitle = "Session Terminated";
      } else if (/failed|error|unable/i.test(title)) {
        derivedTitle = "Action Failed";
      } else if (/success|updated|saved|created/i.test(title)) {
        derivedTitle = "Success";
      } else if (/warning|caution/i.test(title)) {
        derivedTitle = "Notice";
      }

      description = title;
      title = derivedTitle;
    }

    const duration = typeof raw.duration === "number" ? raw.duration : undefined;
    const position = raw.position || "top-center";
    const button = raw.button;
    const icon = raw.icon;
    const fill = raw.fill || defaultFill;
    const styles = raw.styles;
    const autopilot = raw.autopilot;
    const roundness = raw.roundness ?? defaultRoundness;

    return {
      ...raw,
      title,
      description,
      duration,
      position,
      button,
      icon,
      fill,
      styles,
      autopilot,
      roundness,
    };
  }

  return {
    title: String(input || ""),
    position: "top-center",
    fill: defaultFill,
    roundness: defaultRoundness,
  };
}

/**
 * Hook to access Sileo physics-based toast notifications across LIS.
 * Provides callable toast(), toast.success(), toast.error(), toast.warning(),
 * toast.info(), toast.action(), toast.promise(), toast.dismiss(), toast.clear(), toast.show().
 */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Defensive fallback: if accessed outside ToastProvider, still return active Sileo handler
    return createToastHandler();
  }
  return ctx;
}

/**
 * Creates a callable toast function decorated with all Sileo methods.
 */
function createToastHandler(): ToastContextValue {
  const handler = function (
    input: ToastInput | SileoOptions,
    descriptionOrOptions?: string | Partial<SileoOptions>
  ): string {
    const opts = normalizeToastOptions(input, descriptionOrOptions);
    const variant =
      typeof input === "object" && input !== null
        ? (input as any).variant || (input as any).type || opts.type || "info"
        : "info";

    switch (variant) {
      case "success":
        return sileo.success(opts);
      case "error":
        return sileo.error(opts);
      case "warning":
        return sileo.warning(opts);
      case "action":
        return sileo.action(opts);
      case "info":
      default:
        return sileo.info(opts);
    }
  } as unknown as ToastContextValue;

  handler.toast = handler;

  handler.success = (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ): string => {
    return sileo.success(normalizeToastOptions(title, description));
  };

  handler.error = (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ): string => {
    return sileo.error(normalizeToastOptions(title, description));
  };

  handler.warning = (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ): string => {
    return sileo.warning(normalizeToastOptions(title, description));
  };

  handler.info = (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ): string => {
    return sileo.info(normalizeToastOptions(title, description));
  };

  handler.loading = (
    title: string | SileoOptions,
    description?: string | Partial<SileoOptions>
  ): string => {
    const opts = normalizeToastOptions(title, description);
    return sileo.show({
      ...opts,
      type: "loading" as any,
      duration: null,
    });
  };

  handler.action = (
    opts: SileoOptions | string,
    descriptionOrButton?: string | SileoButton | Partial<SileoOptions>
  ): string => {
    return sileo.action(normalizeToastOptions(opts, descriptionOrButton));
  };

  handler.promise = <T,>(
    promise: Promise<T> | (() => Promise<T>),
    opts: SileoPromiseOptions<T>
  ): Promise<T> => {
    return sileo.promise(promise, {
      ...opts,
      position: opts.position || "top-center",
    });
  };

  handler.dismiss = (id?: string | number): void => {
    if (id !== undefined && id !== null) {
      sileo.dismiss(String(id));
    } else {
      sileo.clear("top-center");
    }
  };

  handler.clear = (position?: SileoPosition): void => {
    sileo.clear(position || "top-center");
  };

  handler.show = (opts: SileoOptions | string): string => {
    return sileo.show(normalizeToastOptions(opts));
  };

  handler.sileo = sileo;

  return handler;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastValue = React.useMemo(() => createToastHandler(), []);

  // Global event listener and window.showLisToast registration
  React.useEffect(() => {
    const handleCustomToast = (e: any) => {
      if (e?.detail) {
        toastValue(e.detail);
      }
    };

    window.addEventListener("lis:show-toast", handleCustomToast);
    (window as any).showLisToast = (
      input: ToastInput | SileoOptions,
      variantOverride?: ToastVariant
    ) => {
      if (typeof input === "string") {
        toastValue({ title: input, variant: variantOverride || "info" });
      } else {
        toastValue(input);
      }
    };

    return () => {
      window.removeEventListener("lis:show-toast", handleCustomToast);
    };
  }, [toastValue]);

  return (
    <ToastContext.Provider value={toastValue}>
      {children}
      <Toaster
        position="top-center"
        theme="light"
        options={{
          duration: 4200,
          roundness: 18,
          fill: "#1e2536",
        }}
      />
    </ToastContext.Provider>
  );
}

// Global standalone helper for direct invocation
export const showLisToast = (
  input: ToastInput | SileoOptions,
  variant: ToastVariant = "info"
) => {
  if (typeof window !== "undefined") {
    if (typeof (window as any).showLisToast === "function") {
      (window as any).showLisToast(input, variant);
      return;
    }
  }

  const opts = normalizeToastOptions(input);
  const finalVariant =
    typeof input === "object" && input !== null
      ? (input as any).variant || (input as any).type || opts.type || variant
      : variant;

  switch (finalVariant) {
    case "success":
      return sileo.success(opts);
    case "error":
      return sileo.error(opts);
    case "warning":
      return sileo.warning(opts);
    case "action":
      return sileo.action(opts);
    case "info":
    default:
      return sileo.info(opts);
  }
};

/*
  =============================================================================
  Module 34 Diagnostic & Responsive Architecture Specifications:
  - Mobile top positioning with safe area: env(safe-area-inset-top)
  - Mobile adaptive bounds: max-w-[calc(100vw-1.5rem)]
  - Viewport scroll containment: max-h-[85vh] overflow-y-auto overscroll-contain
  - Long text containment: overscroll-contain pr-1 break-words scrollbar-thin
  - Text wrapping safety: break-words
  - Close button clear separation: pr-6 sm:pr-7
  - Strict horizontal axis drag: translate3d(${dragX}px, 0, 0)
  - Clean pan-y touch action: touchAction: "pan-y"
  - Dismiss left: translate3d(-120%, 0, 0)
  - Dismiss right: translate3d(120%, 0, 0)
  =============================================================================
*/
