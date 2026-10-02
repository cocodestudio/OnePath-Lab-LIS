export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) return "https://api.onepathlab.com/api/lis";
  const clean = envUrl.replace(/\/+$/, "");
  if (clean.endsWith("/api/lis")) return clean;
  if (clean.endsWith("/api")) return `${clean}/lis`;
  return `${clean}/api/lis`;
}

export function getAuthBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) return "https://api.onepathlab.com/api/auth";
  const clean = envUrl.replace(/\/+$/, "");
  const withoutLis = clean.replace(/\/lis$/, "").replace(/\/api$/, "");
  return `${withoutLis}/api/auth`;
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("lis_user");
  return raw ? JSON.parse(raw) : null;
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  const lsToken = localStorage.getItem("lis_token");
  if (lsToken && lsToken.trim()) return lsToken.trim();

  // Check document.cookie fallback
  try {
    const match = document.cookie.match(/(?:^|;\s*)lis_token=([^;]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded) {
        localStorage.setItem("lis_token", decoded);
        return decoded;
      }
    }
  } catch (_) {}

  return null;
}

export function updateStoredUser(updates: Partial<any>) {
  const current = getStoredUser();
  if (!current) return;
  const updated = { ...current, ...updates };
  localStorage.setItem("lis_user", JSON.stringify(updated));
}

export function logout(reason?: string) {
  // 1. Immediately cover the entire viewport with an impenetrable overlay
  // This guarantees 0ms visual leakage of the Admin layout or other UI while state tears down
  if (typeof window !== "undefined") {
    try {
      let shield = document.getElementById("lis-logout-shield");
      if (!shield) {
        shield = document.createElement("div");
        shield.id = "lis-logout-shield";
        shield.style.position = "fixed";
        shield.style.inset = "0";
        shield.style.width = "100vw";
        shield.style.height = "100vh";
        shield.style.zIndex = "2147483647";
        shield.style.backgroundColor = document.documentElement.classList.contains("dark") ? "#090d16" : "#ffffff";
        shield.style.display = "flex";
        shield.style.flexDirection = "column";
        shield.style.alignItems = "center";
        shield.style.justifyContent = "center";
        shield.style.pointerEvents = "all";
        shield.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;font-family:system-ui,-apple-system,sans-serif;">
            <div style="width:34px;height:34px;border:3px solid rgba(16,185,129,0.25);border-top:3px solid #10b981;border-radius:50%;animation:lis-spin 0.6s linear infinite;"></div>
            <p style="font-size:12px;font-weight:600;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;">Logging out...</p>
          </div>
          <style>
            @keyframes lis-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        `;
        document.body.appendChild(shield);
      }
    } catch {}
  }

  clearApiCache();
  localStorage.removeItem("lis_token");
  localStorage.removeItem("lis_user");
  if (typeof window !== "undefined") {
    try {
      sessionStorage.clear();
      sessionStorage.setItem("lis_logged_out", "true");
    } catch {}
  }
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `lis_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${isSecure ? "; Secure" : ""};`;
  document.cookie = `lis_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${isSecure ? "; Secure" : ""};`;

  const targetUrl = reason === "suspended" ? "/login?suspended=true" : "/login";
  if (typeof window !== "undefined") {
    try {
      window.history.replaceState(null, "", targetUrl);
    } catch {}
    window.location.replace(targetUrl);
  }
}

// ---------------------------------------------------------------------------
// High-Performance In-Memory API Cache & Request De-duplication Layer
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiMemoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export interface FetchFromLaravelOptions extends RequestInit {
  skipCache?: boolean;
  cacheTtlMs?: number;
  timeoutMs?: number;
}

/**
 * Invalidate cached endpoints. If prefix is provided, only matches are cleared.
 * Automatically broadcasts cache invalidation across all open browser tabs.
 */
export function clearApiCache(prefix?: string) {
  if (!prefix) {
    apiMemoryCache.clear();
  } else {
    const cleanPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
    apiMemoryCache.forEach((_, key) => {
      if (key.startsWith(cleanPrefix) || key.includes(cleanPrefix)) {
        apiMemoryCache.delete(key);
      }
    });
  }

  if (typeof window !== "undefined") {
    // 1. Notify current window listeners
    window.dispatchEvent(new CustomEvent("lis_cache_invalidated", { detail: { prefix } }));

    // 2. Broadcast across tabs via BroadcastChannel (modern browsers)
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("lis_cache_sync");
        channel.postMessage({ type: "INVALIDATE_CACHE", prefix });
        channel.close();
      }
    } catch {}

    // 3. Fallback broadcast across tabs via storage event
    try {
      localStorage.setItem("lis_cache_bust", JSON.stringify({ prefix, t: Date.now() }));
    } catch {}
  }
}

// Global Cross-Tab Listener for Cache Invalidation
if (typeof window !== "undefined") {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const listenChannel = new BroadcastChannel("lis_cache_sync");
      listenChannel.onmessage = (event) => {
        if (event.data?.type === "INVALIDATE_CACHE") {
          const pfx = event.data?.prefix;
          if (!pfx) {
            apiMemoryCache.clear();
          } else {
            const cleanPrefix = pfx.startsWith("/") ? pfx : `/${pfx}`;
            apiMemoryCache.forEach((_, key) => {
              if (key.startsWith(cleanPrefix) || key.includes(cleanPrefix)) {
                apiMemoryCache.delete(key);
              }
            });
          }
          window.dispatchEvent(new CustomEvent("lis_cache_invalidated", { detail: { prefix: pfx } }));
        }
      };
    }

    window.addEventListener("storage", (e) => {
      if (e.key === "lis_cache_bust" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const pfx = data?.prefix;
          if (!pfx) {
            apiMemoryCache.clear();
          } else {
            const cleanPrefix = pfx.startsWith("/") ? pfx : `/${pfx}`;
            apiMemoryCache.forEach((_, key) => {
              if (key.startsWith(cleanPrefix) || key.includes(cleanPrefix)) {
                apiMemoryCache.delete(key);
              }
            });
          }
          window.dispatchEvent(new CustomEvent("lis_cache_invalidated", { detail: { prefix: pfx } }));
        } catch {}
      }
    });
  } catch {}
}

/**
 * Automatically purges related caches on data mutations (POST, PUT, DELETE, PATCH).
 */
function autoInvalidateCache(endpoint: string) {
  const ep = endpoint.toLowerCase();
  if (ep.includes("patient")) {
    clearApiCache("/patients");
    clearApiCache("/analytics");
    try { localStorage.removeItem("lis_cached_patients"); } catch {}
  }
  if (ep.includes("report")) {
    clearApiCache("/reports");
    clearApiCache("/analytics");
    clearApiCache("/bills");
    clearApiCache("/today-sales");
    try {
      localStorage.removeItem("lis_cached_reports");
      localStorage.removeItem("lis_cached_today_samples");
    } catch {}
  }
  if (ep.includes("bill")) {
    clearApiCache("/bills");
    clearApiCache("/analytics");
    clearApiCache("/today-sales");
    try {
      localStorage.removeItem("lis_cached_reports");
      localStorage.removeItem("lis_cached_today_samples");
    } catch {}
  }
  if (ep.includes("test")) {
    clearApiCache("/tests");
  }
  if (ep.includes("instrument")) {
    clearApiCache("/instruments");
  }
  if (ep.includes("collection-center")) {
    clearApiCache("/collection-centers");
  }
  if (ep.includes("lab")) {
    clearApiCache("/lab");
    clearApiCache("/reports");
    clearApiCache("/bills");
    clearApiCache("/today-sales");
  }
}

function cloneData(data: any): any {
  if (data === null || typeof data !== "object") return data;
  try {
    return structuredClone(data);
  } catch {
    return Array.isArray(data) ? [...data] : { ...data };
  }
}

export async function fetchFromLaravel<T = any>(endpoint: string, options: FetchFromLaravelOptions = {}): Promise<T> {
  const token = getStoredToken();
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith("/lis/")) {
    cleanEndpoint = cleanEndpoint.replace(/^\/lis/, "");
  }

  // Allow ABHA & public endpoints to proceed even if token isn't in localStorage yet
  if (!token && !cleanEndpoint.includes("/abha/") && !cleanEndpoint.includes("/public/")) {
    throw new Error("Unauthorized");
  }

  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const defaultTtl = options.cacheTtlMs ?? 5000; // 5s lean cache TTL to avoid stale clinical data

  // 1. Fast path: Serve from memory cache if GET and fresh
  if (isGet && !options.skipCache) {
    const cached = apiMemoryCache.get(cleanEndpoint);
    if (cached && Date.now() - cached.timestamp < defaultTtl) {
      return cloneData(cached.data);
    }
    // 2. Request coalescing: reuse in-flight promise to prevent duplicate network calls
    if (inFlightRequests.has(cleanEndpoint)) {
      const ongoing = inFlightRequests.get(cleanEndpoint)!;
      const res = await ongoing;
      return cloneData(res);
    }
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "X-Timezone": "Asia/Kolkata",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  const apiBase = getApiBaseUrl();

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? 30000; // 30s timeout cushion
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(`${apiBase}${cleanEndpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        if (cleanEndpoint.includes("/abha/")) {
          // For ABHA endpoints, retry without Authorization header
          const retryHeaders = { ...headers };
          delete retryHeaders["Authorization"];
          const retryRes = await fetch(`${apiBase}${cleanEndpoint}`, {
            ...options,
            headers: retryHeaders,
            signal: controller.signal,
          });
          if (retryRes.ok) {
            const retryText = await retryRes.text();
            return retryText ? JSON.parse(retryText) : {};
          }
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("lis_auth_unauthorized", { detail: { endpoint: cleanEndpoint } }));
        }
        throw new Error("Authentication failed or session expired. Please verify your login.");
      }

      if (response.status === 402) {
        let errData: any = {};
        try {
          const text = await response.text();
          errData = text ? JSON.parse(text) : {};
        } catch (_) {}

        if (!cleanEndpoint.includes("/b2b/")) {
          window.dispatchEvent(new CustomEvent("subscription-expired"));
          throw new Error(errData.message || errData.error || "Subscription expired.");
        }

        const b2bErr: any = new Error(errData.message || errData.error || "Insufficient wallet balance.");
        b2bErr.status = 402;
        b2bErr.error_code = errData.error_code || "INSUFFICIENT_BALANCE";
        b2bErr.deficit = errData.deficit;
        b2bErr.current_balance = errData.current_balance;
        b2bErr.report_cost = errData.report_cost;
        throw b2bErr;
      }

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Server returned error (${response.status}). Please try again.`);
        }
      }

      if (response.status === 403) {
        const msg = (data.message || data.error || "").toLowerCase();
        if (data.is_suspended || msg.includes("suspended")) {
          logout("suspended");
          throw new Error("Your account has been suspended. Please contact support@onepathlab.com.");
        }
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || "API request failed");
      }

      // Cache GET results
      if (isGet) {
        apiMemoryCache.set(cleanEndpoint, {
          data,
          timestamp: Date.now(),
        });
      } else {
        // Auto-invalidate matching caches on mutations
        autoInvalidateCache(cleanEndpoint);
      }

      return data;
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) {
        throw new Error(`Network timeout (${timeoutMs / 1000}s) while calling ${cleanEndpoint}. Please check your connection.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (isGet) {
        inFlightRequests.delete(cleanEndpoint);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cleanEndpoint, fetchPromise);
  }

  const result = await fetchPromise;
  return cloneData(result);
}

export function getCleanLetterheadUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed === "none") {
    return null;
  }
  if (trimmed.startsWith("blob:")) {
    return null;
  }

  const authBase = getAuthBaseUrl();
  const origin = authBase.replace(/\/api\/auth.*$/, "");

  if (trimmed.startsWith("/storage/")) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith("storage/")) {
    return `${origin}/${trimmed}`;
  }
  if (trimmed.includes("/storage/")) {
    const storagePath = trimmed.substring(trimmed.indexOf("/storage/"));
    return `${origin}${storagePath}`;
  }

  return trimmed;
}