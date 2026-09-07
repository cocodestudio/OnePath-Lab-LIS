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
  return localStorage.getItem("lis_token");
}

export function updateStoredUser(updates: Partial<any>) {
  const current = getStoredUser();
  if (!current) return;
  const updated = { ...current, ...updates };
  localStorage.setItem("lis_user", JSON.stringify(updated));
}

export function logout() {
  clearApiCache();
  localStorage.removeItem("lis_token");
  localStorage.removeItem("lis_user");
  document.cookie = "lis_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure;";
  window.location.href = "/login";
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
}

/**
 * Invalidate cached endpoints. If prefix is provided, only matches are cleared.
 */
export function clearApiCache(prefix?: string) {
  if (!prefix) {
    apiMemoryCache.clear();
    return;
  }
  const cleanPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
  apiMemoryCache.forEach((_, key) => {
    if (key.startsWith(cleanPrefix) || key.includes(cleanPrefix)) {
      apiMemoryCache.delete(key);
    }
  });
}

/**
 * Automatically purges related caches on data mutations (POST, PUT, DELETE, PATCH).
 */
function autoInvalidateCache(endpoint: string) {
  const ep = endpoint.toLowerCase();
  if (ep.includes("patient")) {
    clearApiCache("/patients");
    clearApiCache("/analytics");
  }
  if (ep.includes("report")) {
    clearApiCache("/reports");
    clearApiCache("/analytics");
    clearApiCache("/bills");
    clearApiCache("/today-sales");
  }
  if (ep.includes("bill")) {
    clearApiCache("/bills");
    clearApiCache("/analytics");
    clearApiCache("/today-sales");
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

export async function fetchFromLaravel(endpoint: string, options: FetchFromLaravelOptions = {}) {
  const token = getStoredToken();
  if (!token) throw new Error("Unauthorized");

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const defaultTtl = options.cacheTtlMs ?? 60000; // 60s default cache TTL

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
    "Authorization": `Bearer ${token}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  const apiBase = getApiBaseUrl();

  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${apiBase}${cleanEndpoint}`, { ...options, headers });

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }

      if (response.status === 402) {
        window.dispatchEvent(new CustomEvent("subscription-expired"));
        throw new Error("Subscription expired.");
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
    } finally {
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