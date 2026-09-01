"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Crown, 
  Phone, 
  QrCode, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Building2,
  Copy,
  Check
} from "lucide-react";

export default function SubscriptionGate() {
  const [isLocked, setIsLocked] = useState(false);
  const [labData, setLabData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<"6month" | "1year">("1year");
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    // 1. Listen for global event trigger
    const expiredHandler = () => setIsLocked(true);
    window.addEventListener("subscription-expired", expiredHandler);

    // 2. Proactive check on mount
    const checkSubscription = async () => {
      try {
        const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
        const res = await fetch(`${API_URL}/lis/lab`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          setLabData(data);

          const status = (data.planStatus || data.plan_status || "Active").toLowerCase();
          const expiresAtStr = data.planExpiresAt || data.plan_expires_at;

          if (status === "suspended" || status === "expired") {
            setIsLocked(true);
            return;
          }

          if (expiresAtStr) {
            const expDate = new Date(expiresAtStr).getTime();
            // If expiration date is in the past
            if (Date.now() > expDate && status !== "active") {
              setIsLocked(true);
            }
          }
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    };

    checkSubscription();

    return () => {
      window.removeEventListener("subscription-expired", expiredHandler);
    };
  }, []);

  if (!isLocked) return null;

  const upiId = "9045757272@upi";
  const supportPhone = "+91 9045757272";
  const labName = labData?.name || "My Laboratory";

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `Hi OnePath Team,\nI have transferred the payment for my laboratory subscription.\n\n` +
    `• Lab Name: ${labName}\n` +
    `• Plan Selected: ${selectedPlan === "1year" ? "1 Year Enterprise (₹4,999)" : "6 Months Professional (₹2,999)"}\n` +
    `• Phone: ${supportPhone}\n\n` +
    `Please verify and activate my subscription.`
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-card border border-border/90 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Gradient Announcement Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-primary p-4 sm:p-5 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-extrabold text-amber-200">
                Action Required · 7-Day Free Trial Ended
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Activate Subscription to Resume Lab Operations
              </h2>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>Encrypted Diagnostic Cloud</span>
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Subtitle / Lab Context */}
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-foreground font-display">
              Choose a Subscription Plan for <span className="text-primary">{labName}</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your patient data, customized test catalog, and previous reports are safely preserved. Select a plan below to immediately unlock all LIS features.
            </p>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Plan 1: 6 Months */}
            <div 
              onClick={() => setSelectedPlan("6month")}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedPlan === "6month"
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                  : "border-border/80 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wider">
                      Standard Plan
                    </span>
                    <h4 className="text-lg font-bold text-foreground mt-2">6 Months Professional</h4>
                    <p className="text-xs text-muted-foreground">Ideal for growing clinics & pathology labs</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "6month" ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                  }`}>
                    {selectedPlan === "6month" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">₹2,999</span>
                    <span className="text-xs text-muted-foreground font-semibold">/ 180 Days</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Effective ₹500/month
                  </span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs text-foreground/90">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Unlimited Patient Registrations & Barcodes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Smart Pathology Reports & Letterhead Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Automatic WhatsApp & SMS Report Dispatch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Doctor Digital Signatures & Normal Ranges</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan 2: 1 Year Enterprise */}
            <div 
              onClick={() => setSelectedPlan("1year")}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedPlan === "1year"
                  ? "border-primary bg-gradient-to-b from-primary/10 to-primary/5 shadow-xl ring-4 ring-primary/20"
                  : "border-border/80 hover:border-border hover:bg-muted/30"
              }`}
            >
              {/* Badge */}
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>MOST POPULAR · SAVE 20%</span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary/20 text-primary uppercase tracking-wider">
                      Full Year Value
                    </span>
                    <h4 className="text-lg font-bold text-foreground mt-2 flex items-center gap-1.5">
                      <span>1 Year Enterprise</span>
                      <Crown className="h-4 w-4 text-amber-500" />
                    </h4>
                    <p className="text-xs text-muted-foreground">Complete peace of mind & machine integration</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "1year" ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                  }`}>
                    {selectedPlan === "1year" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">₹4,999</span>
                    <span className="text-xs text-muted-foreground font-semibold">/ 365 Days</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Effective ₹416/month (Best Price)
                  </span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs text-foreground/90">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold">Everything in 6 Months Plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Free Automated Machine Interfacing Setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Multi-User & Technician Permissions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>24/7 Priority WhatsApp & Phone Support</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Payment Details & Activation Box */}
          <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span>Direct UPI & QR Payment Details</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transfer amount via GPay, PhonePe, Paytm, or BHIM to the official UPI ID below:
                </p>
              </div>

              {/* UPI Copy Box */}
              <div className="flex items-center gap-2 bg-background border border-border px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-foreground">
                <span>{upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-1 hover:text-primary transition-colors cursor-pointer"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Account activated within 5 minutes after verification.</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href={`tel:${supportPhone}`}
                  className="px-4 py-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                >
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  <span>Call {supportPhone}</span>
                </a>

                <a
                  href={`https://api.whatsapp.com/send?phone=919045757272&text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                >
                  <span>💬 Send Screenshot on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}