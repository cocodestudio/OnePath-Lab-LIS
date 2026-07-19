"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function SubscriptionGate() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const handler = () => setExpired(true);
    window.addEventListener("subscription-expired", handler);
    return () => window.removeEventListener("subscription-expired", handler);
  }, []);

  if (!expired) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-2">Subscription Expired</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your OnePath LIS subscription has expired. Please renew your plan to continue accessing patient records, reports, and billing.
        </p>
        <a
          href="mailto:support@onepathlab.com"
          className="inline-flex items-center justify-center w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-lg"
        >
          Contact Support to Renew
        </a>
      </div>
    </div>
  );
}