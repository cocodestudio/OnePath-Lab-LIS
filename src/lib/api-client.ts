const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.onepathlab.com/api/lis";

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("lis_user");
  return raw ? JSON.parse(raw) : null;
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lis_token");
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

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || data.error || "API request failed");
  }

  return data;
}