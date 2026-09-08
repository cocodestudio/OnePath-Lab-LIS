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

  // 1. Explicit user status check
  const userStatus = (currentUser?.status || "").toLowerCase();
  if (userStatus === "suspended" || userStatus === "expired") {
    return true;
  }

  // 2. Explicit plan status check
  const planStatus = (lab?.planStatus || lab?.plan_status || "").toLowerCase();
  if (planStatus === "suspended" || planStatus === "expired") {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3. Plan expiration date check (calendar day boundary)
  const expiresAtStr = lab?.planExpiresAt || lab?.plan_expires_at;
  if (expiresAtStr) {
    const expDate = new Date(expiresAtStr);
    if (!isNaN(expDate.getTime())) {
      const exp = new Date(expDate);
      exp.setHours(0, 0, 0, 0);
      if (exp.getTime() <= today.getTime()) {
        return true;
      }
    }
  }

  // 4. User trial check if plan is trial or pending
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
        const exp = new Date(expDate);
        exp.setHours(0, 0, 0, 0);
        if (exp.getTime() <= today.getTime()) {
          return true;
        }
      }
    }
  }

  // 5. Also check user trialEndsAt directly if exists
  if (trialEndsAtStr) {
    const trialDate = new Date(trialEndsAtStr);
    if (!isNaN(trialDate.getTime())) {
      const trial = new Date(trialDate);
      trial.setHours(0, 0, 0, 0);
      if (trial.getTime() <= today.getTime() && (!planStatus || planStatus === "trial" || isTrial)) {
        return true;
      }
    }
  }

  return false;
}

export function getDaysRemaining(lab: any): number | null {
  const expiresAtStr = lab?.planExpiresAt || lab?.plan_expires_at;
  if (!expiresAtStr) return null;

  const expDate = new Date(expiresAtStr);
  if (isNaN(expDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expDate);
  exp.setHours(0, 0, 0, 0);

  const diffMs = exp.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days <= 0 ? 0 : days;
}
