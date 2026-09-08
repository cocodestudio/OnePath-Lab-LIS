import { getStoredUser } from "./api-client";

/**
 * Subscription Status & Lockdown Utilities for OnePath LIS
 */

export function isSubscriptionExpired(lab: any, user?: any): boolean {
  const currentUser = user || (typeof window !== "undefined" ? getStoredUser() : null);
  if (!lab && !currentUser) return false;

  // B2B Partners and Collection Centers use pre-paid wallet balance, not software subscription
  const role = (currentUser?.role || "").toUpperCase();
  if (role === "B2B" || role === "COLLECTION_CENTER") {
    return false;
  }

  // 1. Explicit plan status check
  const planStatus = (lab?.planStatus || lab?.plan_status || "").toLowerCase();
  if (planStatus === "suspended" || planStatus === "expired") {
    return true;
  }

  // 2. Plan expiration date check (e.g. 7-day trial or annual plan expired)
  const expiresAtStr = lab?.planExpiresAt || lab?.plan_expires_at;
  if (expiresAtStr) {
    const expDate = new Date(expiresAtStr);
    if (!isNaN(expDate.getTime())) {
      // Set to end of the expiration day
      expDate.setHours(23, 59, 59, 999);
      if (Date.now() > expDate.getTime()) {
        return true;
      }
    }
  }

  // 3. User trial check if plan is trial or pending
  const trialEndsAtStr = currentUser?.trialEndsAt || currentUser?.trial_ends_at;
  const isTrial = 
    (lab?.planName || lab?.plan_name || "").toLowerCase().includes("trial") ||
    (lab?.planPeriod || lab?.plan_period || "").toLowerCase().includes("trial") ||
    planStatus === "trial" ||
    planStatus === "pending";

  if (isTrial) {
    const checkDateStr = expiresAtStr || trialEndsAtStr;
    if (checkDateStr) {
      const expDate = new Date(checkDateStr);
      if (!isNaN(expDate.getTime())) {
        expDate.setHours(23, 59, 59, 999);
        if (Date.now() > expDate.getTime()) {
          return true;
        }
      }
    }
  }

  // 4. Also check user trialEndsAt directly if exists
  if (trialEndsAtStr) {
    const trialDate = new Date(trialEndsAtStr).getTime();
    if (!isNaN(trialDate) && Date.now() > trialDate && (!planStatus || planStatus === "trial" || isTrial)) {
      return true;
    }
  }

  return false;
}

export function getDaysRemaining(lab: any): number | null {
  const expiresAtStr = lab?.planExpiresAt || lab?.plan_expires_at;
  if (!expiresAtStr) return null;

  const expDate = new Date(expiresAtStr);
  if (isNaN(expDate.getTime())) return null;

  expDate.setHours(23, 59, 59, 999);
  const diffMs = expDate.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
