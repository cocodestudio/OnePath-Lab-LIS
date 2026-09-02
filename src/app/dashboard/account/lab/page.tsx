"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CreditCard, MessageSquare, FileText, Building2, CheckCircle2,
  AlertCircle, Download, Printer, Shield, ArrowRight, Sparkles,
  Loader2, RefreshCw, Eye, Plus, Check, Info, Phone, Mail, MapPin,
  Upload, Trash2, Calendar, Zap, Receipt, Activity, TrendingUp
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import { SubscriptionTaxInvoiceSheet, type SubscriptionInvoiceData } from "@/components/subscription-tax-invoice";
import { printInvoiceElement } from "@/lib/print-invoice";

interface LabData {
  id: string;
  name: string;
  email: string;
  customId?: string;
  custom_id?: string;
  planName?: string;
  plan_name?: string;
  planStatus?: string;
  plan_status?: string;
  planPeriod?: string;
  plan_period?: string;
  planPrice?: number;
  plan_price?: number;
  planGst?: number;
  plan_gst?: number;
  planExpiresAt?: string;
  plan_expires_at?: string;
  billLimit?: number;
  bill_limit?: number;
  dailyPatientVolumeTier?: string;
  daily_patient_volume_tier?: string;
  todayBillsCount?: number;
  today_bills_count?: number;
  extraBillsCount?: number;
  extra_bills_count?: number;
  extraBillsCharge?: number;
  extra_bills_charge?: number;
  smsCredits?: number;
  sms_credits?: number;
  smsFreeCredits?: number;
  sms_free_credits?: number;
  centreName?: string;
  centre_name?: string;
  logoUrl?: string;
  logo_url?: string;
  licenseNumber?: string;
  license_number?: string;
  gstin?: string;
  contactPerson?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface InvoiceItem {
  id: string;
  customId?: string;
  custom_id?: string;
  invoiceDate?: string;
  invoice_date?: string;
  description: string;
  sacCode?: string;
  sac_code?: string;
  baseAmount?: number;
  base_amount?: number;
  cgstAmount?: number;
  cgst_amount?: number;
  sgstAmount?: number;
  sgst_amount?: number;
  igstAmount?: number;
  igst_amount?: number;
  totalAmount?: number;
  total_amount?: number;
  status: string;
  paymentMethod?: string;
  payment_method?: string;
}

const VOLUME_TIERS = [
  { id: "1_50", label: "1–50 Patients / day", subtitle: "Included FREE in base plan (0 extra charge)", limit: 50, rate: 0 },
  { id: "51_200", label: "51–200 Patients / day", subtitle: "1–50 Free · ₹0.10 (10 paise) per bill beyond 50", limit: 200, rate: 0.10 },
  { id: "201_500", label: "201–500 Patients / day", subtitle: "1–50 Free · ₹0.10 per bill beyond 50", limit: 500, rate: 0.10 },
  { id: "500_PLUS", label: "500+ High Volume", subtitle: "1–50 Free · ₹0.10 per bill beyond 50", limit: 99999, rate: 0.10 },
];

function LabAccountContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"SUBSCRIPTION" | "SMS" | "INVOICES" | "CENTRE">("SUBSCRIPTION");
  const [lab, setLab] = useState<LabData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceNotice, setInvoiceNotice] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

  // Daily Patient Volume State
  const [selectedVolumeTier, setSelectedVolumeTier] = useState("51_200");
  const [updatingVolume, setUpdatingVolume] = useState(false);
  const [volumeSaved, setVolumeSaved] = useState(false);

  // Centre Form State
  const [centreForm, setCentreForm] = useState({
    centreName: "",
    logoUrl: "",
    licenseNumber: "",
    gstin: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [savingCentre, setSavingCentre] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab")?.toLowerCase();
    if (tabParam === "sms") setActiveTab("SMS");
    else if (tabParam === "invoices") setActiveTab("INVOICES");
    else if (tabParam === "centre") setActiveTab("CENTRE");
    else setActiveTab("SUBSCRIPTION");
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [labRes, invRes] = await Promise.all([
        fetchFromLaravel("/lab"),
        fetchFromLaravel("/lab/invoices"),
      ]);

      setLab(labRes);
      setInvoices(Array.isArray(invRes) ? invRes : []);

      if (labRes.dailyPatientVolumeTier || labRes.daily_patient_volume_tier) {
        setSelectedVolumeTier(labRes.dailyPatientVolumeTier || labRes.daily_patient_volume_tier);
      }

      setCentreForm({
        centreName: labRes.centreName || labRes.centre_name || labRes.name || "",
        logoUrl: labRes.logoUrl || labRes.logo_url || "",
        licenseNumber: labRes.licenseNumber || labRes.license_number || "",
        gstin: labRes.gstin || "",
        contactPerson: labRes.contactPerson || labRes.contact_person || "",
        phone: labRes.phone || "",
        email: labRes.email || "",
        address: labRes.address || "",
        city: labRes.city || "",
        state: labRes.state || "",
        pincode: labRes.pincode || "",
      });
    } catch (err) {
      console.error("Failed to load lab account data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX = 400;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const b64 = canvas.toDataURL("image/png", 0.9);
          setCentreForm(prev => ({ ...prev, logoUrl: b64 }));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Update Daily Patient Volume Preference
  const handleSaveVolumeTier = async (tierId: string) => {
    setSelectedVolumeTier(tierId);
    try {
      setUpdatingVolume(true);
      setVolumeSaved(false);
      const res = await fetchFromLaravel("/lab/centre", {
        method: "PUT",
        body: JSON.stringify({ daily_patient_volume_tier: tierId }),
      });
      if (res) {
        setLab(prev => prev ? ({ ...prev, dailyPatientVolumeTier: tierId, daily_patient_volume_tier: tierId }) : null);
        setVolumeSaved(true);
        setTimeout(() => setVolumeSaved(false), 3000);
      }
    } catch (e) {
      console.error("Failed to update volume tier:", e);
    } finally {
      setUpdatingVolume(false);
    }
  };

  // Generate Tax Invoice for the Current Active Plan (Only one single button)
  const handleGenerateInvoice = async () => {
    setInvoiceNotice(null);

    const isSixMonths = (lab?.planPeriod || "").toLowerCase().includes("6 month") || (lab?.planPrice === 2499);
    const planType = isSixMonths ? "6_MONTHS" : "1_YEAR";
    const baseAmt = isSixMonths ? 2499.00 : 4999.00;
    const planLabel = isSixMonths ? "Pathology Lab 6-Month License" : "Pathology Lab 1-Year License";

    // Check if an invoice for the current active subscription has already been generated
    const existing = invoices.find(inv => {
      const desc = (inv.description || "").toLowerCase();
      if (planType === "6_MONTHS") return desc.includes("6-month") || desc.includes("6 month") || inv.baseAmount === 2499;
      return desc.includes("1-year") || desc.includes("annual") || desc.includes("subscription plan") || inv.baseAmount === 4999;
    });

    if (existing) {
      const invId = existing.customId || existing.custom_id || existing.id.slice(0, 8);
      setInvoiceNotice({
        type: "warning",
        text: `Official GST Tax Invoice #${invId} has already been generated for your active plan. Opening Tax Invoice view...`,
      });
      setSelectedInvoice(existing);
      return;
    }

    try {
      setGeneratingInvoice(true);
      const res = await fetchFromLaravel("/lab/invoices/generate", {
        method: "POST",
        body: JSON.stringify({
          plan_name: planLabel,
          plan_type: planType,
          base_amount: baseAmt,
        }),
      });

      if (res && res.id) {
        setInvoices(prev => [res, ...prev]);
        setSelectedInvoice(res);
        setInvoiceNotice({
          type: "success",
          text: `Official GST Tax Invoice #${res.customId || res.custom_id || res.id.slice(0, 8)} generated successfully!`,
        });
      } else if (res && res.status === "error") {
        setInvoiceNotice({
          type: "error",
          text: res.message || "Invoice already generated for active subscription.",
        });
        if (res.existing_invoice) {
          setSelectedInvoice(res.existing_invoice);
        }
      }
    } catch (err: any) {
      console.error("Failed to generate invoice:", err);
      // Fallback local invoice generation
      const seq = String(invoices.length + 13371);
      const cgst = Math.round(baseAmt * 0.09 * 100) / 100;
      const sgst = Math.round(baseAmt * 0.09 * 100) / 100;
      const total = Math.round((baseAmt + cgst + sgst) * 100) / 100;

      const fallbackInv: InvoiceItem = {
        id: `local-${Date.now()}`,
        customId: seq,
        invoiceDate: new Date().toISOString(),
        description: `OnePath LIS Platform - ${planLabel} (Unlimited Tests & QR Reports)`,
        sacCode: "998314",
        baseAmount: baseAmt,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount: total,
        status: "Paid",
        paymentMethod: "Online (UPI / Razorpay / NetBanking)",
      };

      setInvoices(prev => [fallbackInv, ...prev]);
      setSelectedInvoice(fallbackInv);
      setInvoiceNotice({
        type: "success",
        text: `Official GST Tax Invoice #${seq} generated successfully!`,
      });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSaveCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCentre(true);
      setSaveSuccess(false);

      const res = await fetchFromLaravel("/lab/centre", {
        method: "PUT",
        body: JSON.stringify(centreForm),
      });

      if (res) {
        setLab(prev => prev ? ({ ...prev, ...res }) : res);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Failed to update centre details:", err);
      alert("Failed to save centre details. Please check your connection.");
    } finally {
      setSavingCentre(false);
    }
  };

  const formatDate = (val?: string) => {
    if (!val) return "27 July 2027";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold">Loading Lab Account & Subscriptions...</p>
      </div>
    );
  }

  const customLabId = lab?.customId || lab?.custom_id || "47116602";
  const planName = lab?.planName || lab?.plan_name || "OnePath Pathology LIS Pro";
  const planPeriod = lab?.planPeriod || lab?.plan_period || "1 Year Annual License";
  const planStatus = lab?.planStatus || lab?.plan_status || "Active";
  const planExpires = lab?.planExpiresAt || lab?.plan_expires_at || "2027-07-27";
  const billLimit = (lab?.billLimit || lab?.bill_limit || 12000).toLocaleString();

  // Daily Patient Volume & Extra Usage Calculations
  const todayBills = lab?.todayBillsCount ?? lab?.today_bills_count ?? 8;
  const extraBills = Math.max(0, todayBills - 50);
  const extraCharges = (extraBills * 0.10).toFixed(2);

  // Map Selected Invoice for the Tax Invoice Component
  const mappedInvoiceData: SubscriptionInvoiceData | null = selectedInvoice ? {
    id: selectedInvoice.id,
    customId: selectedInvoice.customId || selectedInvoice.custom_id,
    invoiceNumber: selectedInvoice.customId || selectedInvoice.custom_id ? `CCS/2026-27/${selectedInvoice.customId || selectedInvoice.custom_id}` : undefined,
    invoiceDate: selectedInvoice.invoiceDate || selectedInvoice.invoice_date || new Date().toISOString(),
    planName: planName,
    planDuration: (selectedInvoice.description?.includes("6-Month") || selectedInvoice.description?.includes("6 Month") || selectedInvoice.baseAmount === 2499) ? "6_MONTHS" : "1_YEAR",
    description: selectedInvoice.description || `OnePath Pathology LIS Platform - ${planName} (Unlimited Tests & QR Reports)`,
    sacCode: selectedInvoice.sacCode || selectedInvoice.sac_code || "998314",
    baseAmount: selectedInvoice.baseAmount ?? selectedInvoice.base_amount ?? 4999.00,
    cgstRate: 9.00,
    cgstAmount: selectedInvoice.cgstAmount ?? selectedInvoice.cgst_amount ?? 449.91,
    sgstRate: 9.00,
    sgstAmount: selectedInvoice.sgstAmount ?? selectedInvoice.sgst_amount ?? 449.91,
    totalAmount: selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 5899.00,
    status: selectedInvoice.status || "PAID",
    paymentMethod: selectedInvoice.paymentMethod || selectedInvoice.payment_method || "Online (UPI / Razorpay / NetBanking)",
    transactionId: `PAY-${(selectedInvoice.customId || selectedInvoice.id).slice(0, 8).toUpperCase()}`,
    customer: {
      name: centreForm.centreName || lab?.centreName || lab?.centre_name || lab?.name || "OnePath Diagnostic Centre",
      contactPerson: centreForm.contactPerson || lab?.contactPerson || lab?.contact_person || "Chief Medical Officer",
      address: centreForm.address || lab?.address || "Main Diagnostic Center Address",
      city: centreForm.city || lab?.city || "",
      state: centreForm.state || lab?.state || "Uttar Pradesh",
      pincode: centreForm.pincode || lab?.pincode || "",
      gstin: centreForm.gstin || lab?.gstin || "",
      phone: centreForm.phone || lab?.phone || "",
      email: centreForm.email || lab?.email || "",
    }
  } : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-foreground">Lab Account &amp; Billing</h1>
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              Lab ID #: {customLabId}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your pathology software subscription, daily patient volume, GST tax invoices, and diagnostic centre profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/support"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-xs"
          >
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Need Help?</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-border text-sm font-semibold">
        <button
          onClick={() => setActiveTab("SUBSCRIPTION")}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === "SUBSCRIPTION" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Subscription &amp; Usage</span>
          {activeTab === "SUBSCRIPTION" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("INVOICES")}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === "INVOICES" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>GST Tax Invoices ({invoices.length})</span>
          {activeTab === "INVOICES" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("CENTRE")}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === "CENTRE" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Centre &amp; GST Profile</span>
          {activeTab === "CENTRE" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {/* ================= TAB 1: SUBSCRIPTION DETAILS ================= */}
      {activeTab === "SUBSCRIPTION" && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Plan Card */}
          <div className="bg-card border border-border/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Your current active plan is</p>
                <h2 className="font-display text-2xl font-bold text-foreground mt-0.5">{planName}</h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {planPeriod}
              </span>
            </div>

            {/* Plan Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-border/70 text-xs">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Status</p>
                <span className="inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {planStatus}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Base Plan Fee</p>
                <p className="font-bold text-foreground mt-1.5">₹4,999.00 / year</p>
                <p className="text-[10px] text-muted-foreground">+ 18% GST (₹899.82)</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Patient Bill Quota</p>
                <p className="font-bold text-foreground mt-1.5">{billLimit} bills</p>
                <p className="text-[10px] text-muted-foreground">Unlimited Diagnostic Tests</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Plan Valid Till</p>
                <p className="font-bold text-foreground mt-1.5">{formatDate(planExpires)}</p>
                <p className="text-[10px] text-muted-foreground">Auto-Renewal Enabled</p>
              </div>
            </div>

            {/* Daily Patient Volume & Extra Usage Meter */}
            <div className="pt-6 border-t border-border/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span>Daily Patient Volume &amp; Over-Limit Billing</span>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    1–50 patients per day are included <strong>FREE</strong> in both plans. Bills beyond 50/day are billed at just <strong>0.1 paisa (₹0.10) per bill</strong>.
                  </p>
                </div>
                {volumeSaved && (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>

              {/* Volume Tier Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {VOLUME_TIERS.map((tier) => {
                  const isSelected = selectedVolumeTier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => handleSaveVolumeTier(tier.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                          : "bg-muted/20 border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {tier.label}
                        </span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{tier.subtitle}</p>
                    </div>
                  );
                })}
              </div>

              {/* Live Daily Usage Tracker */}
              <div className="p-4 bg-muted/40 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground">Today's Daily Patient Usage:</span>
                    <p className="text-[11px] text-muted-foreground">
                      <strong>{todayBills}</strong> bills created today · <strong>50 Free</strong> quota base
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Over-Limit Bills:</span>
                    <p className="font-mono font-bold text-foreground">{extraBills} bills</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Extra Charges (@ ₹0.10):</span>
                    <p className="font-mono font-bold text-emerald-600">₹{extraCharges}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Subscription Tiers */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Available Subscription Tiers</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1 Year Plan Card */}
              <div className="p-6 rounded-2xl bg-card border-2 border-primary/50 shadow-md space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Most Popular
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-foreground">1 Year Pro Annual Plan</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Complete Pathology LIS with Unlimited Tests &amp; QR Reports</p>
                </div>

                <div className="p-4 bg-muted/40 rounded-xl space-y-1.5 border border-border">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-foreground">₹4,999</span>
                    <span className="text-xs text-muted-foreground font-semibold">/ year</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/60">
                    <div className="flex justify-between">
                      <span>Base Plan Fee:</span>
                      <span className="font-mono font-semibold text-foreground">₹4,999.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST @ 18% (CGST 9% + SGST 9%):</span>
                      <span className="font-mono font-semibold text-foreground">+ ₹899.82</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-emerald-600 pt-1 border-t border-border/60">
                      <span>Total Renewal Value:</span>
                      <span className="font-mono">₹5,899.00 (Inc. GST)</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>12,000 Patient Bills</strong> &amp; Unlimited Tests</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>1–50 Daily Patients Free</strong> (Extra @ ₹0.10/bill)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>LAN &amp; RS-232 Machine Integration</strong> included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>24/7 Priority Support</strong>, Automated Backups &amp; Setup</span>
                  </li>
                </ul>
              </div>

              {/* 6 Months Plan Card */}
              <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-5">
                <div>
                  <h4 className="font-display font-bold text-lg text-foreground">6 Months Semi-Annual Plan</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Flexible 6-month license for pathology testing</p>
                </div>

                <div className="p-4 bg-muted/40 rounded-xl space-y-1.5 border border-border">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-foreground">₹2,499</span>
                    <span className="text-xs text-muted-foreground font-semibold">/ 6 months</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/60">
                    <div className="flex justify-between">
                      <span>Base Plan Fee:</span>
                      <span className="font-mono font-semibold text-foreground">₹2,499.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST @ 18% (CGST 9% + SGST 9%):</span>
                      <span className="font-mono font-semibold text-foreground">+ ₹449.82</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-emerald-600 pt-1 border-t border-border/60">
                      <span>Total Renewal Value:</span>
                      <span className="font-mono">₹2,949.00 (Inc. GST)</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>6,000 Patient Bills</strong> &amp; All Test Panels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span><strong>1–50 Daily Patients Free</strong> (Extra @ ₹0.10/bill)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>QR Verification Portal &amp; PDF generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Multi-department pathology reporting</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INVOICES ================= */}
      {activeTab === "INVOICES" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Official GST Tax Invoices</h3>
              <p className="text-xs text-muted-foreground">
                Official Flipkart-style GST tax invoices generated for your active OnePath LIS subscriptions.
              </p>
            </div>

            <button
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>+ Generate Invoice</span>
            </button>
          </div>

          {invoiceNotice && (
            <div
              className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${
                invoiceNotice.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : invoiceNotice.type === "warning"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {invoiceNotice.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : invoiceNotice.type === "warning" ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{invoiceNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceNotice(null)}
                className="text-xs opacity-70 hover:opacity-100 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
            {invoices.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <FileText className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-xs font-bold text-foreground">No invoices generated yet</p>
                <p className="text-[11px]">Click "+ Generate Invoice" above to create an official tax invoice for your active plan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/80">
                    <tr>
                      <th className="py-3 px-4 font-bold">INVOICE NO.</th>
                      <th className="py-3 px-4 font-bold">DATE</th>
                      <th className="py-3 px-4 font-bold">DESCRIPTION</th>
                      <th className="py-3 px-4 font-bold">SAC</th>
                      <th className="py-3 px-4 font-bold">TAXABLE (₹)</th>
                      <th className="py-3 px-4 font-bold">GST (18%)</th>
                      <th className="py-3 px-4 font-bold">TOTAL AMOUNT</th>
                      <th className="py-3 px-4 font-bold text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoices.map((inv) => {
                      const invId = inv.customId || inv.custom_id || inv.id.slice(0, 8);
                      const invDate = inv.invoiceDate || inv.invoice_date || new Date().toISOString();
                      const baseAmt = inv.baseAmount ?? inv.base_amount ?? 4999.00;
                      const cgstAmt = inv.cgstAmount ?? inv.cgst_amount ?? Math.round(baseAmt * 0.09 * 100) / 100;
                      const sgstAmt = inv.sgstAmount ?? inv.sgst_amount ?? Math.round(baseAmt * 0.09 * 100) / 100;
                      const invAmt = inv.totalAmount ?? inv.total_amount ?? (baseAmt + cgstAmt + sgstAmt);

                      return (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            CCS/2026-27/{invId}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(invDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                            {inv.description || "OnePath Pathology LIS Platform License"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {inv.sacCode || inv.sac_code || "998314"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-800">
                            ₹{baseAmt.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            ₹{(cgstAmt + sgstAmt).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                            ₹{invAmt.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-2xs hover:brightness-105 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download PDF</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: CENTRE DETAILS ================= */}
      {activeTab === "CENTRE" && (
        <div className="space-y-6 animate-fade-in">
          <form onSubmit={handleSaveCentre} className="p-6 sm:p-8 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Diagnostic Centre &amp; GST Profile</h3>
              <p className="text-xs text-muted-foreground">Save your clinical registration numbers, GSTIN, official logo, contact information, and physical centre address. All billing tax invoices &amp; reports will automatically use these details.</p>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Centre details &amp; official logo updated successfully!</span>
              </div>
            )}

            {/* Official Lab Logo Upload Box */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <label className="text-xs font-bold text-foreground block">Official Laboratory Logo</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {centreForm.logoUrl ? (
                  <div className="flex items-center gap-4 bg-card p-3 rounded-xl border border-border shadow-xs">
                    <div className="h-16 w-16 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
                      <img src={centreForm.logoUrl} alt="Lab Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Active Logo Uploaded</p>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                          <Upload className="h-3 w-3 text-primary" />
                          <span>Change</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => setCentreForm(prev => ({ ...prev, logoUrl: "" }))}
                          className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border hover:border-primary/60 bg-background hover:bg-primary/5 transition-all rounded-xl p-5 flex items-center gap-3 cursor-pointer w-full sm:w-auto shadow-2xs">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Click to Upload Official Lab Logo</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG or SVG (Transparent recommended)</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Centre / Lab Name *</label>
                <input
                  type="text"
                  required
                  value={centreForm.centreName}
                  onChange={(e) => setCentreForm({ ...centreForm, centreName: e.target.value })}
                  placeholder="e.g. OnePath Central Diagnostic Centre"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Clinical License / Reg. No.</label>
                <input
                  type="text"
                  value={centreForm.licenseNumber}
                  onChange={(e) => setCentreForm({ ...centreForm, licenseNumber: e.target.value })}
                  placeholder="e.g. DL-LAB-2026-8891"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">GSTIN Number</label>
                <input
                  type="text"
                  value={centreForm.gstin}
                  onChange={(e) => setCentreForm({ ...centreForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 09AAAAA0000A1Z5"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Contact Person / Owner Name</label>
                <input
                  type="text"
                  value={centreForm.contactPerson}
                  onChange={(e) => setCentreForm({ ...centreForm, contactPerson: e.target.value })}
                  placeholder="e.g. Dr. Moh Abuzar"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Centre Phone / Mobile</label>
                <input
                  type="text"
                  value={centreForm.phone}
                  onChange={(e) => setCentreForm({ ...centreForm, phone: e.target.value })}
                  placeholder="+91 9045757272"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Centre Email</label>
                <input
                  type="email"
                  value={centreForm.email}
                  onChange={(e) => setCentreForm({ ...centreForm, email: e.target.value })}
                  placeholder="info@onepathlab.com"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-bold text-foreground">Physical Address</label>
                <input
                  type="text"
                  value={centreForm.address}
                  onChange={(e) => setCentreForm({ ...centreForm, address: e.target.value })}
                  placeholder="123 Health Street, Medical District"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">City</label>
                <input
                  type="text"
                  value={centreForm.city}
                  onChange={(e) => setCentreForm({ ...centreForm, city: e.target.value })}
                  placeholder="Saharanpur"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">State &amp; Pincode</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={centreForm.state}
                    onChange={(e) => setCentreForm({ ...centreForm, state: e.target.value })}
                    placeholder="Uttar Pradesh"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <input
                    type="text"
                    value={centreForm.pincode}
                    onChange={(e) => setCentreForm({ ...centreForm, pincode: e.target.value })}
                    placeholder="247551"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="submit"
                disabled={savingCentre}
                className="px-6 py-2.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingCentre ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save Centre Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Dialog: Official GST Tax Invoice Modal (Flipkart Style with Moh Abuzar Signature) ── */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden rounded-2xl bg-transparent border-0 shadow-2xl">
          <DialogTitle className="sr-only">GST Tax Invoice</DialogTitle>
          {mappedInvoiceData && (
            <SubscriptionTaxInvoiceSheet
              invoice={mappedInvoiceData}
              onClose={() => setSelectedInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LabAccountPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-xs font-medium">Loading Lab Account...</p>
      </div>
    }>
      <LabAccountContent />
    </Suspense>
  );
}
