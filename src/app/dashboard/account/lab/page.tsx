"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CreditCard, MessageSquare, FileText, Building2, CheckCircle2,
  AlertCircle, Download, Printer, Shield, ArrowRight, Sparkles,
  Loader2, RefreshCw, Eye, Plus, Check, Info, Phone, Mail, MapPin,
  Upload, Trash2
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
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
  smsCredits?: number;
  sms_credits?: number;
  smsFreeCredits?: number;
  sms_free_credits?: number;
  centreName?: string;
  centre_name?: string;
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
  totalAmount?: number;
  total_amount?: number;
  status: string;
  paymentMethod?: string;
  payment_method?: string;
}

const SMS_BUNDLES = [
  { credits: 1000, price: 238, label: "Buy 1000 Credits (Rs. 238.0/-)" },
  { credits: 2500, price: 590, label: "Buy 2500 Credits (Rs. 590.0/-)" },
  { credits: 5000, price: 1180, label: "Buy 5000 Credits (Rs. 1,180.0/-)" },
  { credits: 10000, price: 2360, label: "Buy 10000 Credits (Rs. 2,360.0/-)" },
];

function LabAccountContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"SUBSCRIPTION" | "SMS" | "INVOICES" | "CENTRE">("SUBSCRIPTION");
  const [lab, setLab] = useState<LabData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState(1000);
  const [buyingSms, setBuyingSms] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceNotice, setInvoiceNotice] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);
  const labInvoicePrintRef = useRef<HTMLDivElement>(null);

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

  const handlePurchaseSms = async () => {
    try {
      setBuyingSms(true);
      const res = await fetchFromLaravel("/lab/sms-credits/buy", {
        method: "POST",
        body: JSON.stringify({ credits: selectedBundle }),
      });

      if (res && res.status === "success") {
        setLab(prev => prev ? ({ ...prev, smsCredits: res.sms_credits, sms_credits: res.sms_credits }) : null);
        if (res.invoice) {
          setInvoices(prev => [res.invoice, ...prev]);
        }
        alert(`Success: ${selectedBundle} SMS Credits added to your account!`);
      }
    } catch (err) {
      console.error("Failed to buy SMS credits:", err);
      alert("Failed to complete SMS credit transaction. Please try again.");
    } finally {
      setBuyingSms(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setInvoiceNotice(null);

    // Check if subscription invoice already exists locally
    const existing = invoices.find(inv =>
      inv.description?.toLowerCase().includes("subscription plan") ||
      inv.description?.toLowerCase().includes("pathology lab")
    );

    if (existing) {
      const invId = existing.customId || existing.custom_id || existing.id.slice(0, 8);
      setInvoiceNotice({
        type: "warning",
        text: `Invoice #${invId} has already been generated for your active subscription plan. Duplicate invoice creation is not permitted.`,
      });
      setSelectedInvoice(existing);
      return;
    }

    try {
      setGeneratingInvoice(true);
      const res = await fetchFromLaravel("/lab/invoices/generate", {
        method: "POST",
        body: JSON.stringify({
          plan_name: lab?.planName || lab?.plan_name || "Pathology Lab Basic",
          base_amount: lab?.planPrice || lab?.plan_price || 4999.00,
        }),
      });

      if (res && res.id) {
        setInvoices(prev => [res, ...prev]);
        setSelectedInvoice(res);
        setInvoiceNotice({
          type: "success",
          text: `Official Tax Invoice #${res.customId || res.custom_id || res.id.slice(0, 8)} generated successfully!`,
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
      setInvoiceNotice({
        type: "error",
        text: err.message || "Invoice has already been generated for your active subscription.",
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
      const res = await fetchFromLaravel("/lab", {
        method: "PUT",
        body: JSON.stringify({
          name: centreForm.centreName,
          centre_name: centreForm.centreName,
          logo_url: centreForm.logoUrl,
          license_number: centreForm.licenseNumber,
          gstin: centreForm.gstin,
          contact_person: centreForm.contactPerson,
          phone: centreForm.phone,
          email: centreForm.email,
          address: centreForm.address,
          city: centreForm.city,
          state: centreForm.state,
          pincode: centreForm.pincode,
        }),
      });

      setLab(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save centre details:", err);
    } finally {
      setSavingCentre(false);
    }
  };

  const formatDate = (val?: string) => {
    if (!val) return "27 July 2027";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
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
  const planName = lab?.planName || lab?.plan_name || "Pathology Lab Basic";
  const planPeriod = lab?.planPeriod || lab?.plan_period || "Annual Subscription";
  const planStatus = lab?.planStatus || lab?.plan_status || "Active";
  const planExpires = lab?.planExpiresAt || lab?.plan_expires_at || "2027-07-27";
  const billLimit = (lab?.billLimit || lab?.bill_limit || 12000).toLocaleString();
  const smsRemaining = lab?.smsCredits ?? lab?.sms_credits ?? 97;
  const smsFree = lab?.smsFreeCredits ?? lab?.sms_free_credits ?? 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-foreground">Lab account</h1>
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              Lab ID #: {customLabId}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your pathology software subscription, official GST invoices, and diagnostic centre details.
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

      {/* Navigation Tabs (matching exact LabsMart references) */}
      <div className="flex items-center gap-6 border-b border-border text-sm font-semibold">
        <button
          onClick={() => setActiveTab("SUBSCRIPTION")}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === "SUBSCRIPTION" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Subscription details</span>
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
          <span>Invoices ({invoices.length})</span>
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
          <span>Centre details</span>
          {activeTab === "CENTRE" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {/* ================= TAB 1: SUBSCRIPTION DETAILS ================= */}
      {activeTab === "SUBSCRIPTION" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
            {/* Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Your current plan is</p>
                <h2 className="font-display text-2xl font-bold text-foreground mt-0.5">{planName}</h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-md bg-pink-500/10 text-pink-600 border border-pink-500/20">
                {planPeriod}
              </span>
            </div>

            {/* Plan Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 pt-4 border-t border-border/70 text-xs">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Status</p>
                <span className="inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {planStatus}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Price</p>
                <p className="font-bold text-foreground mt-1.5">Rs. 4,999 + 18% GST (Rs. 5,899)</p>
                <p className="text-[10px] text-muted-foreground">Every 12 months.</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Addons</p>
                <p className="font-bold text-foreground mt-1.5">No addons subscribed</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Total renewal price</p>
                <p className="font-bold text-foreground mt-1.5">Rs. 5,899 (Inc. GST)</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Bill limit</p>
                <p className="font-bold text-foreground mt-1.5">{billLimit} bills</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Expires on</p>
                <p className="font-bold text-foreground mt-1.5">{formatDate(planExpires)}</p>
              </div>
            </div>

            {/* Total summary notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border/70 text-xs">
              <p className="text-muted-foreground italic">
                Renewal option will be available 30 days before expiry.
              </p>
              <div className="text-right">
                <span className="font-bold text-sm text-foreground">Amount to be paid: Rs. 5,899 (Inc. GST)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/support?view=feature"
              className="px-4 py-2 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Request Plan Upgrade / Addons</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INVOICES ================= */}
      {activeTab === "INVOICES" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Tax Invoices</h3>
              <p className="text-xs text-muted-foreground">Official GST tax invoices generated for your OnePath subscriptions & SMS top-ups.</p>
            </div>

            <button
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {generatingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>+ Generate Subscription Invoice</span>
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
                <p className="text-[11px]">Click "Generate Subscription Invoice" above to create an official GST invoice.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/80">
                    <tr>
                      <th className="py-3 px-4 font-bold">INVOICE NO.</th>
                      <th className="py-3 px-4 font-bold">DATE</th>
                      <th className="py-3 px-4 font-bold">STATUS</th>
                      <th className="py-3 px-4 font-bold">AMOUNT</th>
                      <th className="py-3 px-4 font-bold text-right">VIEW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoices.map((inv) => {
                      const invId = inv.customId || inv.custom_id || inv.id.slice(0, 8);
                      const invDate = inv.invoiceDate || inv.invoice_date || "25/07/2026";
                      const invAmt = inv.totalAmount ?? inv.total_amount ?? 5899.00;

                      return (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">{invId}</td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(invDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {inv.status || "Paid"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-foreground font-mono">
                            INR {invAmt.toFixed(1)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
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

      {/* ================= TAB 4: CENTRE DETAILS ================= */}
      {activeTab === "CENTRE" && (
        <div className="space-y-6 animate-fade-in">
          <form onSubmit={handleSaveCentre} className="p-6 sm:p-8 bg-card border border-border/90 rounded-2xl shadow-xs space-y-6">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Diagnostic Centre Profile</h3>
              <p className="text-xs text-muted-foreground">Save your clinical registration numbers, GSTIN, official logo, contact information, and physical centre address. All billing invoices & reports will automatically use these details.</p>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Centre details & official logo updated successfully!</span>
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
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Contact Person Name</label>
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
                  placeholder="New Delhi"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">State & Pincode</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={centreForm.state}
                    onChange={(e) => setCentreForm({ ...centreForm, state: e.target.value })}
                    placeholder="Delhi"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <input
                    type="text"
                    value={centreForm.pincode}
                    onChange={(e) => setCentreForm({ ...centreForm, pincode: e.target.value })}
                    placeholder="110001"
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
                <span>Save Centre Details</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official Tax Invoice Modal with Print & Download */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Tax Invoice</DialogTitle>
          {selectedInvoice && (
            <div>
              {/* Actions Header */}
              <div className="flex items-center justify-between p-4 px-6 bg-card border-b border-border/80 print:hidden">
                <span className="font-mono text-xs font-bold text-primary">
                  TAX INVOICE #{selectedInvoice.customId || selectedInvoice.custom_id || "13370"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printInvoiceElement(labInvoicePrintRef.current, `Tax_Invoice_${selectedInvoice.customId || selectedInvoice.custom_id || "Receipt"}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:bg-accent cursor-pointer shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    onClick={() => printInvoiceElement(labInvoicePrintRef.current, `Tax_Invoice_${selectedInvoice.customId || selectedInvoice.custom_id || "Receipt"}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable Invoice Body */}
              <div ref={labInvoicePrintRef} className="p-8 bg-white text-slate-900 space-y-6 text-xs font-sans">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                        +
                      </div>
                      <span className="font-extrabold text-lg text-slate-900 tracking-tight">OnePath Lab</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">OnePath Software Solutions Pvt. Ltd.</p>
                    <p className="text-[11px] text-slate-500">GSTIN: 07AABCO8899Z1ZQ</p>
                    <p className="text-[11px] text-slate-500">Connaught Place, New Delhi 110001</p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider font-mono">
                      PAID TAX INVOICE
                    </span>
                    <p className="font-mono font-bold text-sm text-slate-900 mt-2">
                      INV-{selectedInvoice.customId || selectedInvoice.custom_id || "13370"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Date: {new Date(selectedInvoice.invoiceDate || selectedInvoice.invoice_date || Date.now()).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">BILLED TO (LAB):</p>
                    <p className="font-bold text-slate-900 mt-1">{lab?.centreName || lab?.centre_name || lab?.name || "OnePath Demo Lab"}</p>
                    <p className="text-slate-600 mt-0.5">{lab?.address || "123 Health Street, Medical District"}</p>
                    <p className="text-slate-600">GSTIN: {lab?.gstin || "Unregistered"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">PAYMENT DETAILS:</p>
                    <p className="font-semibold text-slate-800 mt-1">Status: <strong className="text-emerald-700">PAID</strong></p>
                    <p className="text-slate-600 mt-0.5">Mode: {selectedInvoice.paymentMethod || selectedInvoice.payment_method || "Online (UPI / Razorpay)"}</p>
                    <p className="text-slate-600">SAC Code: 998313 (Software Services)</p>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[11px] text-slate-600 font-bold uppercase">
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-center">SAC</th>
                      <th className="py-2.5 text-right">Taxable Value</th>
                      <th className="py-2.5 text-right">GST (18%)</th>
                      <th className="py-2.5 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-3 font-semibold text-slate-800">
                        {selectedInvoice.description}
                      </td>
                      <td className="py-3 text-center text-slate-600 font-mono">998313</td>
                      <td className="py-3 text-right font-mono font-medium">
                        {(selectedInvoice.baseAmount ?? selectedInvoice.base_amount ?? 4999.00).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-medium">
                        {((selectedInvoice.cgstAmount ?? selectedInvoice.cgst_amount ?? 449.91) + (selectedInvoice.sgstAmount ?? selectedInvoice.sgst_amount ?? 449.91)).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {(selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 5899.00).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-slate-900 text-sm">
                      <td colSpan={4} className="py-3 text-right">Total Amount (Inc. GST):</td>
                      <td className="py-3 text-right font-mono text-emerald-700">
                        INR {(selectedInvoice.totalAmount ?? selectedInvoice.total_amount ?? 5899.00).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Footer Note */}
                <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-1">
                  <p>This is a computer-generated tax invoice and does not require a physical signature.</p>
                  <p>Thank you for choosing OnePath Lab — India's Premier Pathology LIS Solution.</p>
                </div>
              </div>
            </div>
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
