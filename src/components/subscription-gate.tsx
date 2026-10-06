"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock, Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import { fetchFromLaravel, getStoredUser, getStoredToken, logout, updateStoredUser } from "@/lib/api-client";
import { isSubscriptionExpired } from "@/lib/subscription";

export default function SubscriptionGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const [labData, setLabData] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 1. Listen for global event triggers
    const expiredHandler = () => {
      setIsLocked(true);
      sessionStorage.setItem("lis_subscription_locked", "true");
      window.dispatchEvent(new CustomEvent("subscription-locked", { detail: { isLocked: true } }));
    };

    window.addEventListener("subscription-expired", expiredHandler);

    // 2. Proactive check using fetchFromLaravel
    const checkSubscription = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          setChecking(false);
          return;
        }

        const user = getStoredUser();
        // Check if user itself is suspended
        if (user && (user.status || "").toLowerCase() === "suspended") {
          logout("suspended");
          return;
        }

        // Skip for B2B or Collection Center
        const role = (user?.role || "").toUpperCase();
        if (role === "B2B" || role === "COLLECTION_CENTER") {
          setIsLocked(false);
          sessionStorage.removeItem("lis_subscription_locked");
          setChecking(false);
          return;
        }

        const data = await fetchFromLaravel("/lab", { cacheTtlMs: 30000 });
        if (data) {
          setLabData(data);
          const status = (data.planStatus || data.plan_status || "").toLowerCase();
          
          // Immediate logout if admin suspended the account
          if (status === "suspended") {
            logout("suspended");
            return;
          }

          const expired = isSubscriptionExpired(data, user);

          if (expired) {
            setIsLocked(true);
            sessionStorage.setItem("lis_subscription_locked", "true");
            window.dispatchEvent(new CustomEvent("subscription-locked", { detail: { isLocked: true, lab: data } }));
          } else {
            setIsLocked(false);
            sessionStorage.removeItem("lis_subscription_locked");
            if (user && (user.status || "").toLowerCase() === "expired") {
              updateStoredUser({ status: "active" });
              window.dispatchEvent(new CustomEvent("user-updated"));
            }
            if (data.authUser || data.auth_user) {
              updateStoredUser(data.authUser || data.auth_user);
              window.dispatchEvent(new CustomEvent("user-updated"));
            }
            window.dispatchEvent(new CustomEvent("subscription-locked", { detail: { isLocked: false, lab: data } }));
          }
        }
      } catch (err: any) {
        if (err?.status === 403 && err?.message?.toLowerCase().includes("suspended")) {
          logout("suspended");
          return;
        }
        // Fallback check against stored user trial date if offline
        const user = getStoredUser();
        if (user && (user.status || "").toLowerCase() === "suspended") {
          logout("suspended");
          return;
        }
        if (isSubscriptionExpired(null, user)) {
          setIsLocked(true);
          sessionStorage.setItem("lis_subscription_locked", "true");
        }
      } finally {
        setChecking(false);
      }
    };

    checkSubscription();

    // 3. Background heartbeat (every 2 mins) to verify subscription without exhausting network/CPU
    const heartbeatInterval = setInterval(() => {
      checkSubscription();
    }, 120000);

    return () => {
      window.removeEventListener("subscription-expired", expiredHandler);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Handle redirect if locked and not on the subscription management page
  const isAccountLabPage = pathname === "/dashboard/account/lab" || pathname?.startsWith("/dashboard/account/lab");

  useEffect(() => {
    if (isLocked && !isAccountLabPage) {
      router.replace("/dashboard/account/lab?tab=subscription");
    }
  }, [isLocked, isAccountLabPage, router]);

  // If not locked, or if currently on the lab account page (where user must choose a plan and pay with PayU), don't block
  if (!isLocked) {
    return null;
  }

  if (isAccountLabPage) {
    // Let user view the subscription screen on /dashboard/account/lab
    return null;
  }

  // Full-screen locking splash while redirecting away from protected routes
  return (
    <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl text-white p-6 text-center animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-card border border-rose-500/30 rounded-3xl p-8 shadow-2xl space-y-6 text-foreground">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Action Required · Access Locked</span>
          </div>
          <h2 className="text-xl font-bold font-display text-foreground">
            Trial or Subscription Expired
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your 7-day free trial or software subscription for <strong>{labData?.name || "your laboratory"}</strong> has ended. All features are locked until a subscription plan is activated.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard/account/lab?tab=subscription";
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <span>Go to Lab Subscription &amp; Plans</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Redirecting to subscription screen...</span>
        </div>
      </div>
    </div>
  );
}