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
  localStorage.removeItem("lis_token");
  localStorage.removeItem("lis_user");
  document.cookie = "lis_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure;";
  window.location.href = "/login";
}

export async function fetchFromLaravel(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  if (!token) throw new Error("Unauthorized");

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Authorization": `Bearer ${token}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  const apiBase = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
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

  return data;
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
  if (trimmed.startsWith("/storage/")) {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || "https://api.onepathlab.com/api";
    const origin = rawApi.replace(/\/api.*$/, "");
    return `${origin}${trimmed}`;
  }
  return trimmed;
}