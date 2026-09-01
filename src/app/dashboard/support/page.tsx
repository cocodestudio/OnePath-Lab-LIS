"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LifeBuoy, Bug, MessageSquare, Lightbulb, HelpCircle,
  Phone, Mail, Clock, ArrowRight, CheckCircle2, AlertCircle, Loader2,
  Paperclip, Upload, ChevronRight, X, Sparkles, RefreshCw, Send,
  ShieldCheck, ExternalLink, Calendar, User, MessageCircle, AlertTriangle,
  FileText, ArrowLeft, Headphones
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";

const TIMING_OPTIONS = [
  "Morning (10:00 AM – 01:00 PM)",
  "Afternoon (01:00 PM – 04:00 PM)",
  "Evening (04:00 PM – 07:00 PM)",
  "Anytime (10:30 AM – 05:30 PM)",
];

type SupportView = "HUB" | "ISSUE" | "FEEDBACK" | "FEATURE" | "HISTORY";

interface Ticket {
  id: string;
  customId?: string;
  custom_id?: string;
  category: "ISSUE" | "FEEDBACK" | "FEATURE_REQUEST" | "GENERAL_SUPPORT";
  subject: string;
  description: string;
  mobile: string;
  preferredTiming?: string;
  preferred_timing?: string;
  tags?: string[];
  priority: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  adminReply?: string;
  admin_reply?: string;
  repliedAt?: string;
  replied_at?: string;
  repliedBy?: string;
  replied_by?: string;
  createdAt?: string;
  created_at?: string;
}

const formatSafeDate = (dateVal?: string, full: boolean = false) => {
  if (!dateVal) return "Recently";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Recently";
  return full
    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function SupportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<SupportView>("HUB");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>("ALL");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Form states
  const [mobileNumber, setMobileNumber] = useState("+91 9045757272");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [preferredTiming, setPreferredTiming] = useState("Morning (10:00 AM – 01:00 PM)");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync view with query param (?view=issue / feedback / feature / history / hub)
  useEffect(() => {
    const viewParam = searchParams.get("view")?.toLowerCase();
    if (viewParam === "issue") {
      setActiveView("ISSUE");
    } else if (viewParam === "feedback") {
      setActiveView("FEEDBACK");
    } else if (viewParam === "feature") {
      setActiveView("FEATURE");
    } else if (viewParam === "history") {
      setActiveView("HISTORY");
    } else if (viewParam === "hub") {
      setActiveView("HUB");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTickets();
    const user = getStoredUser();
    if (user && user.phone) {
      setMobileNumber(user.phone);
    }
  }, []);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await fetchFromLaravel("/support/tickets");
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTickets(list);
    } catch (err) {
      console.error("Failed to fetch support tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleBackSmart = () => {
    if (activeView !== "HUB") {
      setActiveView("HUB");
    } else {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/dashboard");
      }
    }
  };

  const handleSubmitTicket = async (category: "ISSUE" | "FEEDBACK" | "FEATURE_REQUEST" | "GENERAL_SUPPORT") => {
    if (!description.trim() && !summary.trim()) {
      setSubmitError("Please provide a summary or description of your request.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = {
        category,
        subject: summary.trim() || (selectedTags.length > 0 ? selectedTags.join(", ") : "Customer Support Query"),
        description: description.trim() || summary.trim(),
        mobile: mobileNumber.trim(),
        preferred_timing: preferredTiming.trim(),
        tags: selectedTags,
        priority: category === "ISSUE" ? "HIGH" : "MEDIUM",
      };

      const res = await fetchFromLaravel("/support/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSubmitSuccess(`Your ticket ${res.customId || res.custom_id || ""} has been submitted successfully!`);
      setSummary("");
      setDescription("");
      setSelectedTags([]);
      await fetchTickets();

      setTimeout(() => {
        setSubmitSuccess(null);
        setActiveView("HISTORY");
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit support ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const issueCount = tickets.filter(t => t.category === "ISSUE").length;
  const feedbackCount = tickets.filter(t => t.category === "FEEDBACK").length;
  const featureCount = tickets.filter(t => t.category === "FEATURE_REQUEST").length;

  const quickPillTags = [
    "Add a new test", "Upload letterhead", "Upload signature",
    "Add interpretation", "Update normal value", "Barcode Issue", "Billing query", "Other"
  ];

  return (
    <div className="w-full space-y-7 pb-16 animate-fade-in text-foreground">
      {/* Top Header */}
      <div className="border-b border-border/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={handleBackSmart}
              className="mt-1 p-2 rounded-xl border border-border/90 bg-card hover:bg-accent text-foreground transition-all shadow-sm"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Customer Success & Helpdesk</p>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
                Customer Support
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                Free telephonic & remote assistance is included with your OnePath LIS subscription. Support is available from <strong>Mon-Fri, 10:30 AM to 05:30 PM</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeView !== "HUB" && (
              <button
                onClick={() => setActiveView("HUB")}
                className="px-3.5 py-2 rounded-lg border border-border/90 bg-card hover:bg-accent text-xs font-bold text-foreground transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>← Support Hub</span>
              </button>
            )}
            <button
              onClick={() => {
                setHistoryCategoryFilter("ALL");
                setActiveView("HISTORY");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                activeView === "HISTORY"
                  ? "gradient-primary text-primary-foreground"
                  : "border border-border/90 bg-card hover:bg-accent text-foreground"
              }`}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span>Ticket History ({tickets.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Success / Error Banners */}
      {submitSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold animate-fade-in shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {submitError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold animate-fade-in shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ================= VIEW 1: MAIN HUB ================= */}
      {activeView === "HUB" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Quick Raise Support Ticket Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card/90 rounded-2xl border border-border/90 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground uppercase tracking-wide">
                    Raise a Support Ticket
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Ticket is mandatory to receive priority support
                  </p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  <Send className="h-4 w-4" />
                </div>
              </div>

              {/* Mobile No */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Mobile Number</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Our support executive will reach you on this number.</p>
              </div>

              {/* Query Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">What support do you need?</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Apko kya support chahiye yahan batayein (Describe your issue or request)..."
                  className="w-full p-3.5 bg-background border border-border/90 rounded-xl text-xs text-foreground outline-none focus:border-primary resize-none placeholder:text-muted-foreground/50"
                  maxLength={500}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Be specific for faster resolution</span>
                  <span>{500 - description.length} chars left</span>
                </div>
              </div>

              {/* Quick Tags Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Category Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickPillTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Call timings */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Preferred call timings</label>
                <Select value={preferredTiming} onValueChange={setPreferredTiming}>
                  <SelectTrigger className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground">
                    <SelectValue placeholder="Select preferred timing" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMING_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={() => handleSubmitTicket("GENERAL_SUPPORT")}
                disabled={submitting || !description.trim()}
                className="w-full gradient-primary text-primary-foreground font-bold text-xs py-3 rounded-xl ring-inset-top hover:-translate-y-px active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Submit Support Ticket →</span>
              </button>

              <div className="pt-2 border-t border-border/70 text-center text-[10px] text-muted-foreground">
                <p>Support timings: Mon - Fri, 10:30 AM to 05:30 PM (Except public holidays)</p>
              </div>
            </div>
          </div>

          {/* Right Column: 3 Category Hub Cards & Helpdesk info */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* The 3 Main Interactive Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Card 1: Issues */}
              <div className="p-5 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent flex flex-col justify-between space-y-4 hover:border-red-500/40 transition-all shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                        <Bug className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-foreground">Issues</span>
                    </div>
                    <span className="font-mono font-bold text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                      {issueCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    If something isn&apos;t working right or making it difficult to run your business smoothly.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <button
                    onClick={() => setActiveView("ISSUE")}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                  >
                    <span>Report an issue</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setHistoryCategoryFilter("ISSUE");
                      setActiveView("HISTORY");
                    }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Card 2: Feedbacks */}
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-foreground">Feedbacks</span>
                    </div>
                    <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                      {feedbackCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    Share your experience about the product, features, support or service to help us improve.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <button
                    onClick={() => setActiveView("FEEDBACK")}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Share feedback</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setHistoryCategoryFilter("FEEDBACK");
                      setActiveView("HISTORY");
                    }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Card 3: Feature Requests */}
              <div className="p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-all shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-foreground">Feature requests</span>
                    </div>
                    <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                      {featureCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    If you need a new feature to manage your diagnostic business better, let our engineers know.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <button
                    onClick={() => setActiveView("FEATURE")}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Request feature</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setHistoryCategoryFilter("FEATURE_REQUEST");
                      setActiveView("HISTORY");
                    }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    History
                  </button>
                </div>
              </div>

            </div>

            {/* Support Priority & Direct Contact Helpbox */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Direct Support Contacts */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/70 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Dedicated Lab Helpline</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Call our diagnostic software support specialists during working hours for immediate assistance.
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/60 border border-border/60 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+91 9045757272</span>
                </div>
              </div>

              {/* Direct Escalation Box */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/70 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Mail className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Direct Email Escalation</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We address all urgent queries with highest priority. Write directly to our support engineering desk:
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/60 border border-border/60 font-mono text-xs font-bold text-primary">
                  <Mail className="h-3.5 w-3.5" />
                  <span>support@onepathlab.com</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= VIEW 2: REPORT AN ISSUE ================= */}
      {activeView === "ISSUE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-7 bg-card/90 rounded-2xl border border-border/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest">Customer Support &gt; Issues</p>
              <h2 className="font-display text-2xl font-bold text-foreground mt-1">Report an Issue</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium font-mono text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Summary</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Type your summary here (e.g. Barcode printer alignment offset)..."
                className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Describe your Issue</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail. What happened, and what was expected?"
                className="w-full p-3.5 bg-background border border-border/90 rounded-xl text-xs text-foreground outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Preferred call timings</label>
              <Select value={preferredTiming} onValueChange={setPreferredTiming}>
                <SelectTrigger className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground">
                  <SelectValue placeholder="Select preferred timing" />
                </SelectTrigger>
                <SelectContent>
                  {TIMING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackSmart}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel / Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmitTicket("ISSUE")}
                disabled={submitting}
                className="gradient-primary text-primary-foreground font-bold text-xs px-8 py-3 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                <span>Report Issue</span>
              </button>
            </div>
          </div>

          {/* Right Guidance */}
          <div className="lg:col-span-5 space-y-6 pt-2">
            <h3 className="font-display text-xl font-bold text-foreground">When to report an issue?</h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                  <Bug className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Bugs</h4>
                  <p className="text-muted-foreground mt-0.5">When a feature in the software is not working as expected.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Necessary feature improvements</h4>
                  <p className="text-muted-foreground mt-0.5">Problems which can be addressed by improving existing features.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Pressing concerns</h4>
                  <p className="text-muted-foreground mt-0.5">Business problems you think can be solved by software but aren&apos;t addressed.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">User experience issues</h4>
                  <p className="text-muted-foreground mt-0.5">Improper flows, confusing data interpretation, or missing info.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: SHARE FEEDBACK ================= */}
      {activeView === "FEEDBACK" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-7 bg-card/90 rounded-2xl border border-border/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Customer Support &gt; Share your feedback</p>
              <h2 className="font-display text-2xl font-bold text-foreground mt-1">Share your feedback</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium font-mono text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">What is your feedback about?</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Eg: Referral business, report aesthetics, speed..."
                className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Write your feedback</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your experience here..."
                className="w-full p-3.5 bg-background border border-border/90 rounded-xl text-xs text-foreground outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Preferred call timings</label>
              <Select value={preferredTiming} onValueChange={setPreferredTiming}>
                <SelectTrigger className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground">
                  <SelectValue placeholder="Select preferred timing" />
                </SelectTrigger>
                <SelectContent>
                  {TIMING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackSmart}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel / Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmitTicket("FEEDBACK")}
                disabled={submitting}
                className="gradient-primary text-primary-foreground font-bold text-xs px-8 py-3 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                <span>Share your feedback</span>
              </button>
            </div>
          </div>

          {/* Right Guidance */}
          <div className="lg:col-span-5 space-y-6 pt-2">
            <h3 className="font-display text-xl font-bold text-foreground">You can share feedback about:</h3>
            
            <div className="space-y-4 text-xs">
              <div className="border-l-2 border-primary pl-3 space-y-1">
                <h4 className="font-bold text-foreground">Overall product</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Tell us how the software works for you. Is it easy to use? Does it meet your diagnostic workflow needs?
                </p>
              </div>

              <div className="border-l-2 border-primary pl-3 space-y-1">
                <h4 className="font-bold text-foreground">Specific features</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Share your feedback about any particular feature you use (e.g. Result entry, Sub-tests calculation, Barcodes).
                </p>
              </div>

              <div className="border-l-2 border-primary pl-3 space-y-1">
                <h4 className="font-bold text-foreground">Our service (Support, Sales, Training)</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Share your experience with our technical team. Let us know how responsive and helpful we were.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-300 font-semibold leading-relaxed">
                Your feedback is <strong className="font-bold">highly valued!</strong> It helps us continuously improve to provide you a better product and service.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: REQUEST A FEATURE ================= */}
      {activeView === "FEATURE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Form */}
          <div className="lg:col-span-7 bg-card/90 rounded-2xl border border-border/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Customer Support &gt; Feature request</p>
              <h2 className="font-display text-2xl font-bold text-foreground mt-1">Request a feature</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium font-mono text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Summary</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Eg: WhatsApp automated PDF delivery, Multi-branch sync..."
                className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Why is this feature needed?</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe how this feature will save your time or improve lab operations..."
                className="w-full p-3.5 bg-background border border-border/90 rounded-xl text-xs text-foreground outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Preferred call timings</label>
              <Select value={preferredTiming} onValueChange={setPreferredTiming}>
                <SelectTrigger className="w-full h-10 px-3.5 bg-background border border-border/90 rounded-xl text-xs font-medium text-foreground">
                  <SelectValue placeholder="Select preferred timing" />
                </SelectTrigger>
                <SelectContent>
                  {TIMING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackSmart}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel / Back</span>
              </button>
              <button
                type="button"
                onClick={() => handleSubmitTicket("FEATURE_REQUEST")}
                disabled={submitting}
                className="gradient-primary text-primary-foreground font-bold text-xs px-8 py-3 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                <span>Request a new feature</span>
              </button>
            </div>
          </div>

          {/* Right Guidance */}
          <div className="lg:col-span-5 space-y-6 pt-2">
            <h3 className="font-display text-xl font-bold text-foreground">We can build the right feature, if you:</h3>
            
            <div className="space-y-4 text-xs">
              <div className="border-l-2 border-blue-500 pl-3 space-y-1">
                <h4 className="font-bold text-foreground">Elaborate the feature</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Elaborating the details helps us understand your requirement clearly and in turn build the right feature to solve your problem.
                </p>
              </div>

              <div className="border-l-2 border-blue-500 pl-3 space-y-1">
                <h4 className="font-bold text-foreground">Provide your personal time if needed</h4>
                <p className="text-muted-foreground leading-relaxed">
                  We will call you if we need to know more about the feature you requested. Please spare some time so we understand your need clearly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold leading-relaxed">
                Your feature request is <strong className="font-bold">highly appreciated!</strong> We carefully consider all requests and we put our best efforts to make it happen.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: TICKET HISTORY & REPLIES ================= */}
      {activeView === "HISTORY" && (
        <div className="space-y-5 animate-fade-in">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card/70 p-4 rounded-2xl border border-border/80 shadow-sm">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border text-xs">
              {["ALL", "ISSUE", "FEEDBACK", "FEATURE_REQUEST", "GENERAL_SUPPORT"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setHistoryCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                    historyCategoryFilter === cat
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "ALL" ? "All Tickets" : cat === "FEATURE_REQUEST" ? "Features" : cat}
                </button>
              ))}
            </div>

            <button
              onClick={fetchTickets}
              disabled={loadingTickets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingTickets ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Tickets List */}
          <div className="rounded-2xl border border-border/90 bg-card/80 overflow-hidden shadow-sm">
            {loadingTickets ? (
              <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold">Loading ticket logs & admin replies…</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-3">
                <LifeBuoy className="h-12 w-12 mx-auto opacity-30" />
                <p className="text-sm font-bold text-foreground">No support tickets found</p>
                <p className="text-xs text-muted-foreground">You have not submitted any tickets under this category yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {tickets
                  .filter(t => historyCategoryFilter === "ALL" || t.category === historyCategoryFilter)
                  .map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="p-5 hover:bg-muted/30 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                            {ticket.customId || ticket.custom_id}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {ticket.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              ticket.status === "RESOLVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : ticket.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-foreground">{ticket.subject}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                        
                        {(ticket.adminReply || ticket.admin_reply) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Admin Replied: {(ticket.adminReply || ticket.admin_reply)?.slice(0, 80)}...</span>
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-[11px] text-muted-foreground">
                          {formatSafeDate(ticket.createdAt || ticket.created_at)}
                        </p>
                        <span className="text-xs font-bold text-primary flex items-center gap-1 mt-1 justify-end">
                          <span>View Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Details & Discussion Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Support Ticket Details</DialogTitle>
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {selectedTicket?.customId || selectedTicket?.custom_id}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">{selectedTicket?.subject}</p>
              </div>
            </div>
          </div>

          {selectedTicket && (
            <div className="p-6 space-y-5 bg-card text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background/60 p-4 rounded-xl border border-border/70">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Category</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                  <p className="font-bold text-primary mt-0.5">{selectedTicket.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Contact Mobile</p>
                  <p className="font-mono font-medium text-foreground mt-0.5">{selectedTicket.mobile || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Submitted Date</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatSafeDate(selectedTicket.createdAt || selectedTicket.created_at, true)}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Your Detailed Description</p>
                <div className="p-4 rounded-xl bg-card border border-border/80 text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Admin Reply */}
              <div className="space-y-1.5 pt-2">
                <p className="font-bold text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Official Response from OnePath Engineering Team
                </p>
                {(selectedTicket.adminReply || selectedTicket.admin_reply) ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-foreground leading-relaxed space-y-2">
                    <p className="font-medium">{selectedTicket.adminReply || selectedTicket.admin_reply}</p>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t border-emerald-500/20">
                      <span>Replied By: <strong>{selectedTicket.repliedBy || selectedTicket.replied_by || "Support Specialist"}</strong></span>
                      {(selectedTicket.repliedAt || selectedTicket.replied_at) && (
                        <span>{formatSafeDate(selectedTicket.repliedAt || selectedTicket.replied_at, true)}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground text-center">
                    <Clock className="h-5 w-5 mx-auto mb-1 opacity-50" />
                    <span>Your ticket is currently under review by our support team. We will update you here and notify you via notification bell.</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border/80">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-5 py-2 rounded-lg bg-muted text-xs font-bold text-foreground hover:bg-accent border border-border"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-xs font-medium">Loading Support Desk...</p>
      </div>
    }>
      <SupportContent />
    </Suspense>
  );
}
