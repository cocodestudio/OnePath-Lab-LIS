"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Check,
  CreditCard,
  Loader2,
  ArrowRight,
  Lock
} from "lucide-react";
import { submitPayuForm } from "@/lib/payu";

export default function SubscriptionGate() {
  const pathname = usePathname();
  const [isLocked, setIsLocked] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [labData, setLabData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<"6month" | "1year">("1year");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

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

          if (status === "suspended") {
            setIsSuspended(true);
            setIsLocked(true);
            return;
          }

          if (status === "expired") {
            setIsLocked(true);
            return;
          }

          if (expiresAtStr) {
            const expDate = new Date(expiresAtStr).getTime();
            // If expiration date is in the past
            if (Date.now() > expDate) {
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

  // Allow interacting directly on Lab Account subscription page if needed
  const isAccountPage = pathname?.includes("/dashboard/account/lab");

  if (!isLocked) return null;

  // If user is currently on the Lab Account page, minimize lock so they can view settings/invoices
  if (isAccountPage && !isSuspended) {
    return null;
  }

  const upiId = "9045757272@upi";
  const supportPhone = "+91 9045757272";
  const labName = labData?.name || "My Laboratory";

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const isCentreSaved = Boolean(
    (labData?.centreName || labData?.centre_name || labData?.name) &&
    labData?.phone &&
    labData?.address
  );

  const handlePayuCheckout = async () => {
    if (!isCentreSaved) {
      alert("Please complete and save your Diagnostic Centre details (Centre Name, Phone, and Address) under Centre & GST Profile first before purchasing a subscription plan.");
      window.location.href = "/dashboard/account/lab?tab=centre";
      return;
    }

    try {
      setInitiatingPayment(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      
      const res = await fetch(`${API_URL}/payments/initiate-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          plan_type: selectedPlan,
          lab_id: labData?.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.action_url && data.params) {
        submitPayuForm(data.action_url, data.params);
      } else {
        alert(data.error || data.message || "Failed to start PayU checkout.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to initiate payment session with PayU.");
    } finally {
      setInitiatingPayment(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hi OnePath Team,\nI would like to activate/renew my laboratory subscription.\n\n` +
    `• Lab Name: ${labName}\n` +
    `• Plan Selected: ${selectedPlan === "1year" ? "1 Year Enterprise (₹4,999)" : "6 Months Professional (₹2,499)"}\n` +
    `• Phone: ${supportPhone}\n\n` +
    `Please assist me with instant activation.`
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-card border border-border/90 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Gradient Announcement Bar */}
        <div className={`p-4 sm:p-5 text-white flex flex-wrap items-center justify-between gap-3 ${
          isSuspended 
            ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600" 
            : "bg-gradient-to-r from-amber-500 via-rose-500 to-primary"
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              {isSuspended ? <Lock className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-extrabold text-amber-200">
                {isSuspended ? "Account Suspended by Admin" : "Action Required · Free Trial / Subscription Expired"}
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                {isSuspended ? "Contact Admin or Renew to Reactivate Lab" : "Activate or Renew Subscription to Resume Operations"}
              </h2>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>Encrypted Diagnostic Cloud</span>
          </div>
        </div>

        {/* Modal Main Content Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Subtitle / Lab Context */}
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-foreground font-display">
              Choose a Subscription Plan for <span className="text-primary">{labName}</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your patient database, test rate list, and historic reports are securely preserved. Select a plan below and pay with PayU to instantly unlock all features.
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
                    <p className="text-xs text-muted-foreground">Ideal for growing clinics &amp; pathology labs</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "6month" ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                  }`}>
                    {selectedPlan === "6month" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">₹2,949</span>
                    <span className="text-xs text-muted-foreground font-semibold">/ 180 Days (incl. 18% GST)</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹2,499 Base + ₹449.82 GST
                  </span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs text-foreground/90">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Unlimited Patient Registrations &amp; Barcodes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Smart Pathology Reports &amp; Letterhead Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Automatic WhatsApp &amp; SMS Report Dispatch</span>
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
                    <p className="text-xs text-muted-foreground">Complete peace of mind &amp; machine integration</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "1year" ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                  }`}>
                    {selectedPlan === "1year" && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">₹5,899</span>
                    <span className="text-xs text-muted-foreground font-semibold">/ 365 Days (incl. 18% GST)</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹4,999 Base + ₹899.82 GST
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
                    <span>24/7 Priority WhatsApp &amp; Phone Support</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Primary Action: Instant PayU Payment Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handlePayuCheckout}
              disabled={initiatingPayment}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-primary to-emerald-600 hover:opacity-95 text-white font-extrabold text-base shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-50"
            >
              {initiatingPayment ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Connecting to PayU...</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  <span>
                    Pay ₹{selectedPlan === "1year" ? "5,899" : "2,949"} with PayU (Instant Activation)
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-muted-foreground">Prefer to manage plans from settings?</span>
              <Link
                href="/dashboard/account/lab?tab=subscription"
                className="font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Go to Lab Account &amp; Subscription Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Direct UPI / WhatsApp Assistance Backup Box */}
          <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-primary" />
                  <span>Direct UPI / Bank Transfer Backup</span>
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  UPI ID: <span className="font-mono font-bold text-foreground">{upiId}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?phone=919045757272&text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center gap-1"
                >
                  <span>💬 WhatsApp Support</span>
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}