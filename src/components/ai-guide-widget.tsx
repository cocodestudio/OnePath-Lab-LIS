"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles, Bot, X, Send, RotateCcw,
  ArrowRight, ExternalLink, HelpCircle,
  FlaskConical, Users, FileText, Settings,
  Cpu, Receipt, Layers, Compass, Loader2,
  Clock, Activity, Wallet, Boxes
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// 1. Collection Center Portal Options
const CC_FAQ_SUGGESTIONS = [
  {
    icon: Clock,
    label: "Today's Samples Intake",
    query: "How do I take in today's samples and check registered patients?",
  },
  {
    icon: Layers,
    label: "Tag Vacutainer Tube Barcodes",
    query: "How to enter or scan barcodes for EDTA, SST, Fluoride, Citrate tubes?",
  },
  {
    icon: Compass,
    label: "Update Status to Collected / Hub",
    query: "How do I change sample status to Collected and In Transit to Central Hub?",
  },
  {
    icon: Users,
    label: "View Center Patients",
    query: "How to view registered patients for my collection center?",
  },
  {
    icon: Receipt,
    label: "Print Billing Receipts",
    query: "How to print patient payment receipts and check due balances?",
  },
  {
    icon: HelpCircle,
    label: "Why Can't I Edit Test Results?",
    query: "Can I enter test results or approve reports from Collection Centre portal?",
  },
];

// 2. Receptionist Portal Options
const RECEPTIONIST_FAQ_SUGGESTIONS = [
  {
    icon: Users,
    label: "Patient Registration & Barcode",
    query: "How do I register a new patient and print vial barcodes?",
  },
  {
    icon: Activity,
    label: "Track Samples (4-Step Progress)",
    query: "How do I search and track sample progress (Registered -> Collected -> Testing -> Approved)?",
  },
  {
    icon: Receipt,
    label: "Billing Desk & Payments",
    query: "How to collect cash or UPI payments and print patient receipts?",
  },
  {
    icon: Sparkles,
    label: "ABHA ID QR Poster",
    query: "How to open the ABHA ID QR poster for patient mobile scan?",
  },
  {
    icon: Users,
    label: "View Registered Patients",
    query: "How to search and view patient records in the directory?",
  },
  {
    icon: HelpCircle,
    label: "Can Receptionist Enter Test Results?",
    query: "Can receptionists enter lab test results or doctor signatures?",
  },
];

// 3. B2B Partner Portal Options
const B2B_FAQ_SUGGESTIONS = [
  {
    icon: Users,
    label: "B2B Patient Booking",
    query: "How do I register a referral patient at B2B contracted rates?",
  },
  {
    icon: Wallet,
    label: "Prepaid Wallet Recharge",
    query: "How to check wallet balance and recharge via PayU or UPI?",
  },
  {
    icon: HelpCircle,
    label: "Wallet Lock on Reports",
    query: "Why is my report download locked when wallet balance is negative?",
  },
  {
    icon: Clock,
    label: "Track B2B Samples",
    query: "How to monitor samples dispatched to the central lab?",
  },
  {
    icon: FileText,
    label: "Download Final Reports",
    query: "How to download and print approved test reports for my patients?",
  },
  {
    icon: Layers,
    label: "B2B Contracted Rate List",
    query: "How to view the contracted B2B test price list?",
  },
];

// 4. Lab Administrator / Pathologist / Super Admin Options
const ADMIN_FAQ_SUGGESTIONS = [
  {
    icon: Users,
    label: "Patient Registration",
    query: "How do I register a new patient and print vial barcodes?",
  },
  {
    icon: Layers,
    label: "1-Test-Per-Page Print",
    query: "How to print each test on a separate page in reports?",
  },
  {
    icon: FileText,
    label: "Result Entry & AI Remarks",
    query: "How to enter test results and generate AI clinical impressions?",
  },
  {
    icon: Settings,
    label: "Letterhead & Margins",
    query: "How to upload letterhead and configure print margins?",
  },
  {
    icon: FlaskConical,
    label: "Test Master & Rates",
    query: "How to add a new test and configure pricing in rate list?",
  },
  {
    icon: Cpu,
    label: "Analyzer Machine Bridge",
    query: "How to connect automated cell counter or analyzer to LIS?",
  },
  {
    icon: Layers,
    label: "Collection Centers & B2B",
    query: "How to add collection centers and manage B2B wallets?",
  },
  {
    icon: Receipt,
    label: "ABHA ID & ABDM Poster",
    query: "How to create ABHA ID and use the QR poster?",
  },
  {
    icon: Boxes,
    label: "Inventory & Reagents",
    query: "How to manage pathology inventory, stock in new lots, and log daily consumption?",
  },
];

function getWelcomeMessage(role: string): string {
  if (role === "COLLECTION_CENTER") {
    return "👋 **Welcome to Collection Centre Assistant**\n\nMain aapko Collection Centre portal ke features (Today's Samples intake, physical tube barcodes tag karna, status update karna, aur receipts print karna) me guide karne ke liye trained hoon.\n\nNeeche diye options chunein ya apna sawal poochhein:";
  }
  if (role === "RECEPTIONIST") {
    return "👋 **Welcome to Front Desk Assistant**\n\nMain aapko Receptionist portal ke features (Patient Registration, Track Samples 4-stage tracking, Billing Desk aur ABHA ID poster) me guide karne ke liye trained hoon.\n\nNeeche diye options chunein ya apna sawal poochhein:";
  }
  if (role === "B2B") {
    return "👋 **Welcome to B2B Partner Assistant**\n\nMain aapko B2B Partner portal ke features (B2B patient booking, prepaid wallet recharge, report tracking aur downloads) me guide karne ke liye trained hoon.\n\nNeeche diye options chunein ya apna sawal poochhein:";
  }
  return "👋 **Welcome to OnePath LIS Assistant**\n\nI can guide you step-by-step through any feature, workflow, or configuration in OnePath LIS.\n\nSelect a quick topic below or type your question in English or Hindi:";
}

export function AiGuideWidget() {
  const router = useRouter();
  const pathname = usePathname();

  // Show everywhere on dashboard, EXCLUDING enter result edit page
  const shouldShowGuide = useMemo(() => {
    if (!pathname) return false;
    if (!pathname.startsWith("/dashboard")) return false;
    if (pathname.includes("/reports/") && pathname.endsWith("/edit")) {
      return false; // Hide on Enter Result page to prevent covering result fields
    }
    return true;
  }, [pathname]);

  const getInitialRole = () => {
    if (typeof window !== "undefined") {
      try {
        const stored = getStoredUser();
        let r = (stored?.role || "").toUpperCase().trim();
        if (r === "COLLECTION_CENTRE") r = "COLLECTION_CENTER";
        if (r) return r;
        const roleMatch = document.cookie.match(/(?:^|;\s*)lis_role=([^;]+)/);
        if (roleMatch && roleMatch[1]) {
          let cr = decodeURIComponent(roleMatch[1]).toUpperCase().trim();
          if (cr === "COLLECTION_CENTRE") cr = "COLLECTION_CENTER";
          if (cr) return cr;
        }
      } catch {
        return "ADMIN";
      }
    }
    return "ADMIN";
  };

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>(getInitialRole);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-1",
      role: "assistant",
      content: getWelcomeMessage(getInitialRole()),
      timestamp: "",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-resize textarea according to content & sync role
  useEffect(() => {
    setMounted(true);
    const stored = getStoredUser();
    let r = (stored?.role || "ADMIN").toUpperCase().trim();
    if (r === "COLLECTION_CENTRE") r = "COLLECTION_CENTER";
    setUserRole(r);

    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content: getWelcomeMessage(r),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(46, Math.min(textareaRef.current.scrollHeight, 120)) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredUser();
      let r = (stored?.role || "ADMIN").toUpperCase().trim();
      if (r === "COLLECTION_CENTRE") r = "COLLECTION_CENTER";
      if (r !== userRole) {
        setUserRole(r);
      }
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 220);
    }
  }, [isOpen]);

  // Contextual information based on current active portal role
  const portalInfo = useMemo(() => {
    if (userRole === "COLLECTION_CENTER") {
      return {
        title: "Collection Centre Guide",
        badge: "CC Portal",
        subtitle: "Intake, Vacutainer Barcodes & Receipts",
        placeholder: "Ask about Today's Samples, Tube Barcodes, Status...",
        footer: "Collection Centre Portal",
      };
    }
    if (userRole === "RECEPTIONIST") {
      return {
        title: "Front Desk Guide",
        badge: "Receptionist",
        subtitle: "Patient Booking, Track Samples & Billing",
        placeholder: "Ask about Patient Registration, Track Samples, Billing...",
        footer: "Front Desk Receptionist Portal",
      };
    }
    if (userRole === "B2B") {
      return {
        title: "B2B Partner Guide",
        badge: "B2B Partner",
        subtitle: "Patient Booking, Wallet Recharge & Reports",
        placeholder: "Ask about B2B Booking, Wallet Recharge, Reports...",
        footer: "B2B Partner Portal",
      };
    }
    return {
      title: "OnePath LIS Guide",
      badge: "Active",
      subtitle: "Interactive Lab Assistant & Navigator",
      placeholder: "Ask anything about OnePath LIS (Patients, Reports, Tests)...",
      footer: "LIS Admin & Lab Operations",
    };
  }, [userRole]);

  // Dynamic FAQs based on current active portal role
  const activeFaqs = useMemo(() => {
    if (userRole === "COLLECTION_CENTER") return CC_FAQ_SUGGESTIONS;
    if (userRole === "RECEPTIONIST") return RECEPTIONIST_FAQ_SUGGESTIONS;
    if (userRole === "B2B") return B2B_FAQ_SUGGESTIONS;
    return ADMIN_FAQ_SUGGESTIONS;
  }, [userRole]);

  // Listen for custom trigger events from the sidebar
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener("toggle-ai-guide", handleToggle);
    window.addEventListener("open-ai-guide", handleOpen);
    window.addEventListener("close-ai-guide", handleClose);

    return () => {
      window.removeEventListener("toggle-ai-guide", handleToggle);
      window.removeEventListener("open-ai-guide", handleOpen);
      window.removeEventListener("close-ai-guide", handleClose);
    };
  }, []);

  // Broadcast open/close state to sidebar
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-guide-state-changed", { detail: { isOpen } })
      );
    }
  }, [isOpen]);

  const handleNavigate = (url: string) => {
    if (url && url.startsWith("/")) {
      router.push(url);
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsOpen(false);
      }
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input.trim();
    if (!textToSend || loading) return;

    const userMessageId = "msg-" + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!customText) setInput("");
    setLoading(true);

    try {
      // Prepare conversation history
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetchFromLaravel("/ai/guide", {
        method: "POST",
        body: JSON.stringify({
          query: textToSend,
          history: historyPayload,
          role: userRole,
        }),
      });

      const assistantReply =
        res?.answer ||
        "I am currently unable to generate a response. Please select one of the direct navigation links below or try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          role: "assistant",
          content: assistantReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      const fallbackAnswer = getClientFallbackAnswer(textToSend, userRole);
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          role: "assistant",
          content: fallbackAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: getWelcomeMessage(userRole),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper to extract and render markdown links [Label](/dashboard/...)
  const renderMessageContent = (content: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const actionButtons: { label: string; url: string }[] = [];

    while ((match = linkRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      const label = match[1];
      const url = match[2];

      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      if (url.startsWith("/dashboard")) {
        actionButtons.push({ label, url });
      }

      // Inline styled clickable anchor
      parts.push(
        <button
          key={`link-${matchIndex}`}
          type="button"
          onClick={() => handleNavigate(url)}
          className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mx-1 cursor-pointer"
        >
          <span>{label}</span>
          <ExternalLink className="h-3 w-3 inline opacity-70" />
        </button>
      );

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return (
      <div className="space-y-2.5">
        <div className="whitespace-pre-wrap leading-relaxed text-[12px] sm:text-[12.5px]">
          {parts.map((part, idx) => {
            if (typeof part === "string") {
              const boldFormatted = part.split(/(\*\*[^*]+\*\*)/g).map((sub, i) => {
                if (sub.startsWith("**") && sub.endsWith("**")) {
                  return (
                    <strong key={i} className="font-semibold text-foreground">
                      {sub.slice(2, -2)}
                    </strong>
                  );
                }
                return sub;
              });
              return <React.Fragment key={idx}>{boldFormatted}</React.Fragment>;
            }
            return part;
          })}
        </div>

        {/* Highlighted Direct Action Navigation Buttons */}
        {actionButtons.length > 0 && (
          <div className="pt-2 border-t border-border/60 flex flex-wrap gap-2">
            {actionButtons.map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleNavigate(btn.url)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <span>{btn.label}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!mounted || !shouldShowGuide) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
        className={`sm:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-2xs transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* =========================================================================
          FLOATING CHATBOX WINDOW (Positioned at bottom-left adjacent to sidebar)
      ========================================================================= */}
      <div
        className={`fixed bottom-4 sm:bottom-6 left-3 md:left-[268px] z-50 w-[calc(100vw-24px)] sm:w-[460px] md:w-[480px] max-w-[500px] h-[calc(100dvh-80px)] sm:h-[620px] max-h-[740px] flex flex-col rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden origin-bottom-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 px-4 bg-slate-50/90 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{portalInfo.title}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-[9px] border border-emerald-200 dark:border-emerald-800">
                  {portalInfo.badge}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                {portalInfo.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/40 dark:bg-zinc-950/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`relative max-w-[88%] rounded-xl p-3 shadow-2xs ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-xs font-medium text-xs"
                    : "bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-xs"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
                <span
                  suppressHydrationWarning
                  className={`block text-[9px] mt-1.5 text-right ${
                    msg.role === "user" ? "text-emerald-100/70" : "text-slate-400"
                  }`}
                >
                  {msg.timestamp || "Just now"}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Loader */}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="px-3 py-2 rounded-xl rounded-tl-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 shadow-2xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>OnePath AI is finding the guide...</span>
              </div>
            </div>
          )}

          {/* Quick FAQ Suggestion Cards */}
          {messages.length <= 2 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                <Compass className="h-3.5 w-3.5 text-emerald-600" />
                <span>Common Help Topics:</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {activeFaqs.map((faq, idx) => {
                  const Icon = faq.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(faq.query)}
                      className="w-full flex items-center justify-between p-2.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-emerald-50/50 dark:hover:bg-zinc-800/70 hover:border-emerald-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        <span>{faq.label}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Chat Input Form (Upgraded, Professional Textarea Container) */}
        <div className="p-3 bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
          <div className="relative flex flex-col rounded-xl border border-slate-200 dark:border-zinc-750 bg-slate-50/80 dark:bg-zinc-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={portalInfo.placeholder}
              disabled={loading}
              className="w-full resize-none bg-transparent px-3.5 pt-2.5 pb-2 text-xs sm:text-[13px] leading-5 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 min-h-[46px] max-h-[120px]"
            />
            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                <span className="font-medium text-slate-500 dark:text-slate-400">OnePath AI</span>
              </div>
              <div className="flex items-center gap-1.5">
                {input.trim() && (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Clear input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
                  className="h-7.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                  title="Send message (Enter ↵)"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1 text-[9.5px] text-slate-400">
            <span>{portalInfo.footer}</span>
            <span>Press <strong>Enter ↵</strong> to send</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Client-side fallback knowledge generator (Bilingual Hindi/Hinglish & English)
function getClientFallbackAnswer(query: string, role: string = "ADMIN"): string {
  const q = (query || "").trim().toLowerCase();
  const normalizedRole = (role || "ADMIN").toUpperCase().trim() === "COLLECTION_CENTRE"
    ? "COLLECTION_CENTER"
    : (role || "ADMIN").toUpperCase().trim();

  // Accurately check for Hindi without false positives on English words (like 'me', 'se', 'ho', 'par')
  const hasDevanagari = /[\u0900-\u097F]/.test(q);
  const hindiRegex = /\b(kaise|kare|karein|karna|karo|karu|karega|karegi|karenge|kaha|kahan|kya|kyu|kyun|kyon|kis|kisko|kisme|kisse|kaun|kon|kaunsa|konsa|hai|hain|hoga|hogi|hoge|hua|hue|liya|diya|batao|batayein|bata|dikhao|bhai|bhaiya|namaste|mariz|mareez|parinam|parchi|rasid|chahiye|mera|meri|mere|apna|apni|apne|wala|wali|wale|shuru|kijiye|suno|nahi|haan|alag|chupaye|chupana|lagaye|lagana|jode|jodna)\b/i;
  const isHindi = hasDevanagari || hindiRegex.test(q);

  // 0. Confidential Tech Stack & Architecture Shield
  const techKeywords = [
    "technology", "technologies", "tech stack", "framework", "frameworks",
    "laravel", "nextjs", "next.js", "react", "reactjs", "vue", "angular",
    "php", "python", "node", "nodejs", "javascript", "typescript",
    "mysql", "sql", "sqlite", "postgres", "postgresql", "database", "db",
    "backend", "frontend", "source code", "codebase", "architecture",
    "github", "gitlab", "repo", "api key", "system prompt", "groq", "gemini",
    "kis se bana", "kaise bana", "kaise banaya", "kis technology", "kis framework",
    "kon sa framework", "kon si technology", "kya technology", "kisme bana",
    "kisse bana", "backend me kya", "kon si language", "kis language"
  ];
  for (const tk of techKeywords) {
    if (q.includes(tk)) {
      return isHindi
        ? "OnePath LIS ek proprietary aur secure enterprise laboratory information system hai. Iska internal codebase, architecture aur backend technology details confidential hain.\n\nMain sirf OnePath LIS ke software features aur portal operations me aapki madad kar sakta hoon. Portal features se juda koi sawal ho to batayein!"
        : "OnePath LIS is a proprietary, secure enterprise laboratory information system. Internal engineering, codebase, and backend architecture details are confidential.\n\nI am here strictly to assist you with using OnePath LIS portal features. How can I assist you with your operations today?";
    }
  }

  const unrelated = ["cricket", "movie", "song", "joke", "cooking", "weather", "football", "politics", "recipe", "khana", "biryani", "film", "gaana"];
  for (const w of unrelated) {
    if (q.includes(w)) {
      return isHindi
        ? "Main OnePath LIS Assistant hoon aur sirf aapke portal ke features, workflows aur lab operations me aapki madad kar sakta hoon. Apne portal se juda koi sawal ho to batayein!"
        : "I am the OnePath LIS Assistant and can only help with your portal features, workflows, and lab operations. How can I assist you with the portal today?";
    }
  }

  // ==========================================
  // ROLE 1: COLLECTION CENTER (CC) PORTAL
  // ==========================================
  if (normalizedRole === "COLLECTION_CENTER") {
    // Out of scope for CC: Result entry, doctor signs, machine bridge, test master
    if (q.includes("result") || q.includes("parinam") || q.includes("enter result") || q.includes("doctor sign") || q.includes("signature") || q.includes("machine") || q.includes("analyzer") || q.includes("sysmex") || q.includes("mindray") || q.includes("test master") || q.includes("approve report") || q.includes("ai suggestion")) {
      return isHindi
        ? "Yeh feature Collection Centre portal me uplabdh nahi hai. Test result entry, clinical interpretation remarks, report approval, doctor digital signatures aur analyzer machines Central Laboratory / Pathologist dwara manage kiye jaate hain.\n\nCollection Centre portal me aap sirf:\n1. **[Today's Samples](/dashboard/today-samples)** me aaj ke samples intake karna\n2. Color-coded vacutainer tube barcodes (EDTA, SST, Fluoride, Citrate) tag karna\n3. Sample status ko 'Collected' aur 'Central Hub' update karna\n4. **[Billing Desk](/dashboard/billing)** se payment receipts print karna\nkar sakte hain."
        : "This feature is not available in the Collection Centre portal. Entering test results, doctor signatures, clinical AI remarks, report approvals, and analyzer machine interfacing are managed exclusively by the Central Laboratory / Pathologists.\n\nIn your Collection Centre portal, you can:\n1. Intake today's specimens in [Open Today's Samples](/dashboard/today-samples)\n2. Tag color-coded vacutainer tube barcodes (EDTA purple, SST gold, etc.)\n3. Advance sample stage from Registered -> Collected -> Central Hub\n4. Print patient payment receipts in [Open Billing Desk](/dashboard/billing).";
    }

    // Greetings & Identity for CC
    if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("kya kar sakte") || q.includes("help") || q.includes("namaste") || q.includes("hello") || q.includes("hi") || q.includes("suno")) {
      return isHindi
        ? "Namaste! Main **OnePath Collection Centre Assistant** hoon. Main Collection Centre portal me aapki madad ke liye trained hoon:\n\n"
          + "1. **[Today's Samples](/dashboard/today-samples)** – Aaj ke registered patients ka intake aur sample list check karna.\n"
          + "2. **Status / Tube Barcodes** – Vials par physical barcode sticker scan/enter karna (EDTA Purple, SST Gold, Fluoride Grey, Citrate Blue, Urine Yellow, Stool Brown).\n"
          + "3. **Sample Stage Update** – Status ko Registered se badal kar **Collected** aur **Central Hub (In Transit)** mark karna.\n"
          + "4. **[Patients List](/dashboard/patients)** – Apne center ke sabhi registered marizon ki list dekhna.\n"
          + "5. **[Billing Desk](/dashboard/billing)** – Patient payment status (Paid / Due) dekhna aur print receipt nikalna.\n\n"
          + "*Note: Test result entry aur report approval Central Lab dwara handle kiye jaate hain.*"
        : "Hello! I am the **OnePath Collection Centre Assistant**. I am dedicated strictly to helping you navigate the Collection Centre portal:\n\n"
          + "- [Open Today's Samples](/dashboard/today-samples): Review today's patient arrivals and intake specimens\n"
          + "- **Tag Tube Barcodes**: Click 'Status / Barcodes' to scan/type physical barcodes for required color vacutainers (EDTA purple, SST gold, Fluoride grey, Citrate blue, Urine yellow, Stool brown)\n"
          + "- **Update Sample Stage**: Transition status from Registered -> Collected -> Central Hub (In Transit)\n"
          + "- [Open Patients](/dashboard/patients): Search and view patients registered under this collection center\n"
          + "- [Open Billing Desk](/dashboard/billing): View patient payment dues and print billing receipts\n\n"
          + "*Note: Entering test results, doctor signatures, and machine interfacing are restricted to the Central Laboratory / Pathologist.*";
    }

    // Barcodes, Vacutainer Tubes & Status Update
    if (q.includes("barcode") || q.includes("tube") || q.includes("vial") || q.includes("color") || q.includes("edta") || q.includes("sst") || q.includes("fluoride") || q.includes("citrate") || q.includes("status") || q.includes("collected") || q.includes("hub") || q.includes("transit")) {
      return isHindi
        ? "Vacutainer Tube Barcodes tag aur status update karne ke steps:\n\n"
          + "1. **[Today's Samples](/dashboard/today-samples)** me patient ke aage **'Status / Barcodes'** par click karein.\n"
          + "2. Popup window me prescribed tests ke hisab se required tubes aur unke standard colors dikhenge:\n"
          + "   - **EDTA (Purple)**: Whole Blood / CBC / HbA1c\n"
          + "   - **SST (Gold / Yellow)**: Serum Clot Activator / LFT / KFT / Lipid\n"
          + "   - **Fluoride (Grey)**: Blood Sugar / Glucose\n"
          + "   - **Citrate (Light Blue)**: PT / INR / Coagulation\n"
          + "   - **Urine (Yellow Container)** / **Stool (Brown Container)**\n"
          + "3. Har tube ke samne physical barcode sticker ka number type ya scan karein.\n"
          + "4. Dropdown se Status update karein:\n"
          + "   - **Collected**: Phlebotomy complete ho gayi hai.\n"
          + "   - **Central Hub**: Sample batch banakar main lab bhej diya gaya hai (In Transit).\n"
          + "5. **'Save Status & Barcodes'** dabayein.\n\n"
          + "*Dhyan dein: Agar report Central Lab se Final Approve ho chuki hai, to status update locked ho jata hai.*"
        : "Steps to tag vacutainer barcodes and advance sample stage:\n\n"
          + "1. In [Open Today's Samples](/dashboard/today-samples), click **'Status / Barcodes'** on the patient row.\n"
          + "2. The popup lists required vials with color-coded badges:\n"
          + "   - **EDTA (Purple)**: Whole Blood / CBC / HbA1c\n"
          + "   - **SST (Gold)**: Serum Clot Activator / LFT / KFT / Lipid\n"
          + "   - **Fluoride (Grey)**: Blood Sugar / Glucose\n"
          + "   - **Citrate (Blue)**: Coagulation / PT / INR\n"
          + "   - **Urine (Yellow)** / **Stool (Brown)**\n"
          + "3. Scan or enter the barcode sticker for each required tube.\n"
          + "4. Set the sample stage dropdown:\n"
          + "   - **Collected**: Phlebotomy completed at center\n"
          + "   - **Central Hub**: Dispatched in transit to main laboratory\n"
          + "5. Click **'Save Status & Barcodes'**.\n\n"
          + "*Note: If the report has already been Approved by the central pathologist, status updating is locked.*";
    }

    // Today's Samples Intake
    if (q.includes("today") || q.includes("aaj") || q.includes("sample") || q.includes("intake")) {
      return isHindi
        ? "Today's Samples intake karne ke steps:\n\n"
          + "1. Sidebar me **'Today Samples'** par click karein ya direct jayein: [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Yahan sirf aaj ke registered samples dikhenge.\n"
          + "3. Patient details aur tests verify karein, fir **'Status / Barcodes'** dabakar tubes tag karein aur sample ko 'Collected' ya 'Central Hub' mark karein."
        : "Steps to intake today's specimens:\n\n"
          + "1. Click **'Today Samples'** in the sidebar or go to [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Only specimens registered today are shown in this view.\n"
          + "3. Verify patient demographics and tests, then click **'Status / Barcodes'** to tag vials and move to Collected or Central Hub.";
    }

    // Billing & Receipts for CC
    if (q.includes("bill") || q.includes("payment") || q.includes("receipt") || q.includes("rasid") || q.includes("due") || q.includes("print")) {
      return isHindi
        ? "Billing receipt print karne ke steps:\n\n"
          + "1. Sidebar se **'Billing'** me jayein: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Patient ka Total, Paid aur Balance Due check karein.\n"
          + "3. Receipt print karne ke liye **'Print'** button par click karein.\n\n"
          + "*Note: Collection Centre portal me bills edit karna allowed nahi hai, sirf receipts print ki ja sakti hain.*"
        : "To print billing receipts:\n\n"
          + "1. Go to **Dashboard > Billing**: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Review patient total, paid amount, and outstanding due balance.\n"
          + "3. Click the **'Print'** action to print the receipt on thermal or A4.\n\n"
          + "*Note: Editing invoice amounts or granting discounts is restricted to Admin.*";
    }

    // Patients list for CC
    if (q.includes("patient") || q.includes("mariz") || q.includes("mareez")) {
      return isHindi
        ? "Collection Centre ke patients dekhne ke steps:\n\n"
          + "1. Sidebar se **'Patients'** me jayein: [Open Patients](/dashboard/patients).\n"
          + "2. Yahan aapke center ke sabhi registered marizon ki list dikhegi.\n"
          + "3. Name, Phone ya PID se search kar sakte hain.\n"
          + "*Note: Patient demographic details edit karna Admin dwara manage hota hai.*"
        : "To view patient records in Collection Centre portal:\n\n"
          + "1. Go to **Dashboard > Patients**: [Open Patients](/dashboard/patients).\n"
          + "2. View all patients registered under your center.\n"
          + "3. Search by Name, Mobile number, or PID.";
    }

    // Default CC response
    return isHindi
      ? "Main OnePath Collection Centre Assistant hoon! Main aapko Collection Centre portal ke features me guide kar sakta hoon:\n\n"
        + "- [Open Today's Samples](/dashboard/today-samples) – Aaj ke samples intake karna\n"
        + "- **Status / Barcodes** – EDTA, SST, Fluoride tube barcodes tag karna\n"
        + "- **Sample Status** – Collected aur Central Hub status update karna\n"
        + "- [Open Billing Desk](/dashboard/billing) – Payment receipt print karna\n"
        + "- [Open Patients](/dashboard/patients) – Center ke mariz dekhna\n\n"
        + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
      : "Welcome to the OnePath Collection Centre Assistant! I can guide you through all features in your Collection Centre portal:\n\n"
        + "- [Open Today's Samples](/dashboard/today-samples): Today's sample intake\n"
        + "- **Status / Barcodes**: Tag EDTA, SST, Fluoride tube barcodes\n"
        + "- **Sample Stages**: Update status to Collected or Central Hub (In Transit)\n"
        + "- [Open Billing Desk](/dashboard/billing): Print patient billing receipts\n"
        + "- [Open Patients](/dashboard/patients): View patients registered at this center.";
  }

  // ==========================================
  // ROLE 2: RECEPTIONIST (FRONT DESK) PORTAL
  // ==========================================
  if (normalizedRole === "RECEPTIONIST") {
    // Out of scope for Receptionist: Result entry, doctor signs, machine bridge, test master
    if (q.includes("result") || q.includes("parinam") || q.includes("doctor sign") || q.includes("signature") || q.includes("machine") || q.includes("analyzer") || q.includes("sysmex") || q.includes("mindray") || q.includes("test master") || q.includes("formula") || q.includes("ai suggestion")) {
      return isHindi
        ? "Yeh feature Front Desk Receptionist portal ke scope me nahi hai. Test result daalna, clinical remarks, doctor digital signatures aur analyzer machines Central Laboratory / Pathologist dwara handle kiye jaate hain.\n\nReceptionist portal me aap:\n1. **[Patient Registration](/dashboard/patients/register)** – Naye mariz register aur barcode print\n2. **[Track Samples](/dashboard/track-samples)** – Sample status search & 4-step progress track karna\n3. **[Billing Desk](/dashboard/billing)** – Cash/UPI payment lena aur receipt print karna\n4. Final Approved reports print karna\n5. ABHA ID QR poster display karna\nkar sakte hain."
        : "This feature is not part of the Front Desk Receptionist portal. Entering test results, doctor signatures, clinical AI remarks, and analyzer machine interfacing are handled by Lab Technicians and Pathologists.\n\nIn the Receptionist portal, you can:\n1. Register walk-ins & print barcodes in [Open Patient Registration](/dashboard/patients/register)\n2. Track 4-step sample progress in [Open Track Samples](/dashboard/track-samples)\n3. Collect cash/UPI payments in [Open Billing Desk](/dashboard/billing)\n4. Print verified approved reports\n5. Display ABHA ID QR posters for patients.";
    }

    // Greetings & Identity for Receptionist
    if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("kya kar sakte") || q.includes("help") || q.includes("namaste") || q.includes("hello") || q.includes("hi") || q.includes("suno")) {
      return isHindi
        ? "Namaste! Main **OnePath Receptionist Assistant** hoon. Main Front Desk Receptionist portal me aapki madad ke liye trained hoon:\n\n"
          + "1. **[Patient Registration](/dashboard/patients/register)** – Naye mariz book karna, test select karna aur barcode nikalna.\n"
          + "2. **[Track Samples](/dashboard/track-samples)** – Search criteria se sample dhoondna aur 4-step live progress (Registered -> Collected -> Testing -> Approved) track karna.\n"
          + "3. **[Billing Desk](/dashboard/billing)** – Cash/UPI payments receive karna aur print receipts nikalna.\n"
          + "4. **ABHA ID QR Poster** – Top navbar me 'Create ABHA ID' se patient ke liye QR poster open karna.\n"
          + "5. **[Patients Directory](/dashboard/patients)** – Registered marizon ka record dhoondna.\n\n"
          + "*Note: Test result entry aur doctor signatures Central Lab / Pathologist dwara manage hote hain.*"
        : "Hello! I am the **OnePath Receptionist Assistant**. I am dedicated strictly to helping you navigate the Front Desk Receptionist portal:\n\n"
          + "- [Open Patient Registration](/dashboard/patients/register): Register walk-in patients, select tests, and print vial barcodes\n"
          + "- [Open Track Samples](/dashboard/track-samples): Search and track live 4-step progress (Registered -> Collected -> Testing -> Approved) and print approved reports\n"
          + "- [Open Billing Desk](/dashboard/billing): Collect cash or UPI payments and print thermal/A4 receipts\n"
          + "- **ABHA ID Poster**: Open patient QR scan poster from the top navbar button\n"
          + "- [Open Patients Directory](/dashboard/patients): Search and view registered patient history\n\n"
          + "*Note: Entering test results, doctor digital signatures, and machine interfacing are handled by Lab Technicians / Pathologists.*";
    }

    // Track Samples (4-step progress, search dropdown, approved reports)
    if (q.includes("track") || q.includes("progress") || q.includes("stage") || q.includes("kaha tak") || q.includes("approved") || q.includes("testing") || q.includes("search sample")) {
      return isHindi
        ? "Track Samples use karne ke steps:\n\n"
          + "1. Sidebar me **'Track Samples'** par click karein ya direct jayein: [Open Track Samples](/dashboard/track-samples).\n"
          + "2. Search Dropdown se select karein ki kis zariye search karna hai:\n"
          + "   - **Name**: Patient ka naam\n"
          + "   - **Phone**: Mobile number\n"
          + "   - **Patient ID (PID)**\n"
          + "   - **Report ID**\n"
          + "   - **Barcode No**\n"
          + "   - **ABHA ID**\n"
          + "3. Value daal kar Search dabayein. Search hone par patient ki live details aayengi:\n"
          + "   - **4-Step Animated Progress Bar**: Registered ➔ Collected ➔ Testing ➔ Approved.\n"
          + "   - **Vacutainer Tube Barcodes**: EDTA, SST, etc. ke colored badges.\n"
          + "   - **Print Report Button**: Report finalize hone par 'Print Report' button active ho jayega jisse direct vector print nikal sakte hain."
        : "Steps to track samples and print verified reports:\n\n"
          + "1. Go to **Dashboard > Track Samples**: [Open Track Samples](/dashboard/track-samples).\n"
          + "2. Select your search criteria from the dropdown:\n"
          + "   - **Name**: Patient name\n"
          + "   - **Phone**: Mobile number\n"
          + "   - **Patient ID (PID)**\n"
          + "   - **Report ID**\n"
          + "   - **Barcode No**\n"
          + "   - **ABHA ID**\n"
          + "3. Enter the value and click Search. The tracking card displays:\n"
          + "   - **4-Stage Animated Progress Bar**: Registered ➔ Collected ➔ Testing ➔ Approved\n"
          + "   - **Color-Coded Tube Barcodes**: EDTA purple, SST gold, etc.\n"
          + "   - **Print Report Button**: Once status is Approved, click 'Print Report' to print directly.";
    }

    // Patient Registration & Barcodes for Receptionist
    if (q.includes("patient") || q.includes("mariz") || q.includes("mareez") || q.includes("register") || q.includes("booking") || q.includes("barcode") || q.includes("sticker") || q.includes("jode")) {
      return isHindi
        ? "Naye patient ko register karne aur barcode nikalne ke steps:\n\n"
          + "1. Sidebar me **'+ Add Patient'** dabayein ya jayein: [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Patient ka Name, Age, Gender, Mobile Number, aur Ref Doctor select karein.\n"
          + "3. Prescribed Tests ya Health Packages select karein (rate apne aap calculate hoga).\n"
          + "4. Billing details confirm karein aur **'Register & Save'** dabayein.\n"
          + "5. Save hote hi unique Lab PID aur vial barcode sticker generate ho jayega jise aap print karke collection tubes par laga sakte hain."
        : "To register a patient and print vial barcodes:\n\n"
          + "1. Click **'+ Add Patient'** in the sidebar or go to [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Fill in patient demographics (Name, Age, Gender, Phone, Referring Doctor).\n"
          + "3. Select prescribed Tests or Health Packages from the searchable list.\n"
          + "4. Review billing details and click **'Register & Save'**.\n"
          + "5. A unique Lab PID and barcode sticker will be generated ready for printing.";
    }

    // Billing Desk & Payments for Receptionist
    if (q.includes("bill") || q.includes("payment") || q.includes("receipt") || q.includes("rasid") || q.includes("cash") || q.includes("upi")) {
      return isHindi
        ? "Billing Desk se payments collect karne ke steps:\n\n"
          + "1. Sidebar se **'Billing'** me jayein: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Patient ka pending balance check karein.\n"
          + "3. Cash ya UPI se payment receive karein aur receipt print karein (Thermal ya A4 format me)."
        : "To manage Billing and collect payments:\n\n"
          + "1. Go to **Dashboard > Billing**: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Review patient invoice and outstanding due balance.\n"
          + "3. Record cash or UPI payment and print thermal or A4 receipts.";
    }

    // ABHA ID & ABDM for Receptionist
    if (q.includes("abha") || q.includes("abdm") || q.includes("ayushman") || q.includes("health id")) {
      return isHindi
        ? "ABHA ID QR Poster dikhane ke steps:\n\n"
          + "1. Top navbar me **'Create ABHA ID'** button dabayein – patient ke scan karne ke liye QR poster open ho jayega.\n"
          + "2. Patient mobile se scan karke apna official Ayushman Bharat Health Account (ABHA ID) bana sakte hain.\n"
          + "3. Patient Registration me **'Link via ABHA'** se Aadhaar OTP verify karke record link kar sakte hain."
        : "To use ABHA ID & ABDM in Receptionist portal:\n\n"
          + "1. In the top navbar, click **'Create ABHA ID'** to display the QR poster for patient mobile scan.\n"
          + "2. Patients scan the QR code to create their official ABHA health account.\n"
          + "3. In Patient Registration, click **'Link via ABHA'** to verify with Aadhaar OTP.";
    }

    // Default Receptionist response
    return isHindi
      ? "Main OnePath Front Desk Receptionist Assistant hoon! Main aapko in features me guide kar sakta hoon:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register) – Naye mariz aur sample booking\n"
        + "- [Open Track Samples](/dashboard/track-samples) – Sample ka 4-step progress track karna aur report print karna\n"
        + "- [Open Billing Desk](/dashboard/billing) – Cash/UPI payment lena aur receipts nikalna\n"
        + "- [Open Patients](/dashboard/patients) – Registered marizon ka record dekhna\n"
        + "- **Create ABHA ID** – Top navbar se patient QR poster dikhana\n\n"
        + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
      : "Welcome to the OnePath Receptionist Assistant! I can guide you through all Front Desk features:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register): Register patients and print barcodes\n"
        + "- [Open Track Samples](/dashboard/track-samples): Track 4-stage progress and print approved reports\n"
        + "- [Open Billing Desk](/dashboard/billing): Collect cash/UPI payments and print receipts\n"
        + "- [Open Patients](/dashboard/patients): Search registered patients\n"
        + "- **Create ABHA ID**: Open QR poster from the top navbar.";
  }

  // ==========================================
  // ROLE 3: B2B PARTNER PORTAL
  // ==========================================
  if (normalizedRole === "B2B") {
    // Out of scope for B2B: Central lab settings, doctor signs, test master editing, machine bridge
    if (q.includes("result") || q.includes("parinam") || q.includes("doctor sign") || q.includes("signature") || q.includes("machine") || q.includes("analyzer") || q.includes("test master") || q.includes("add test") || q.includes("letterhead")) {
      return isHindi
        ? "Yeh feature B2B Partner portal ke scope me nahi hai. Central lab settings, doctor signatures, test master editing aur machine interfacing Central Laboratory dwara manage kiye jaate hain.\n\nB2B portal me aap sirf:\n1. Apne referral patients ki booking karna\n2. Prepaid wallet balance check aur recharge karna\n3. Final approved reports download aur print karna\n4. Contracted rate list dekhna\nkar sakte hain."
        : "This feature is not available in the B2B Partner portal. Central laboratory settings, doctor signatures, test master editing, and analyzer machine interfacing are managed exclusively by the Central Laboratory.\n\nIn the B2B Portal, you can:\n1. Book referral patients at B2B rates\n2. Check and recharge your prepaid wallet in [Open B2B Wallet](/dashboard/wallet)\n3. Download finalized PDF reports in [Open Reports](/dashboard/reports)\n4. View your contracted rate list in [Open Rate List](/dashboard/ratelist).";
    }

    // Greetings & Identity for B2B
    if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("kya kar sakte") || q.includes("help") || q.includes("namaste") || q.includes("hello") || q.includes("hi") || q.includes("suno")) {
      return isHindi
        ? "Namaste! Main **OnePath B2B Partner Assistant** hoon. Main B2B Portal me aapki madad ke liye trained hoon:\n\n"
          + "1. **[B2B Patient Booking](/dashboard/patients/register)** – Apne referral patients ko contracted B2B rate par book karna.\n"
          + "2. **[B2B Wallet & Payments](/dashboard/wallet)** – Apna prepaid wallet balance dekhna, transactions track karna aur PayU/UPI se online recharge karna.\n"
          + "3. **Wallet Balance Lock Rule** – Agar wallet balance negative ya unpaid hota hai, to final reports download hona ruk jata hai jab tak recharge na ho.\n"
          + "4. **[Today's Samples](/dashboard/today-samples) & [Reports](/dashboard/reports)** – Main lab bheje gaye samples track karna aur approved reports download karna.\n"
          + "5. **[Contracted Rate List](/dashboard/ratelist)** – B2B ke liye agreed test prices check karna.\n\n"
          + "*Note: Doctor signatures aur test master settings Central Laboratory dwara manage hoti hain.*"
        : "Hello! I am the **OnePath B2B Partner Assistant**. I am dedicated strictly to helping you navigate the B2B Partner Portal:\n\n"
          + "- [Open Patient Registration](/dashboard/patients/register): Book referral patients at contracted B2B rates\n"
          + "- [Open B2B Wallet & Payments](/dashboard/wallet): Check current balance, view transaction ledger, and recharge via PayU or UPI\n"
          + "- **Report Download Lock**: If your wallet has an unpaid negative balance, final report downloads are locked until wallet recharge\n"
          + "- [Open Today's Samples](/dashboard/today-samples) & [Open Reports](/dashboard/reports): Monitor dispatched specimens and download approved PDF reports\n"
          + "- [Open Rate List](/dashboard/ratelist): Check your contracted test pricing\n\n"
          + "*Note: Doctor digital signatures and test master configuration are not part of the B2B portal.*";
    }

    // B2B Wallet & Recharge
    if (q.includes("wallet") || q.includes("recharge") || q.includes("balance") || q.includes("payu") || q.includes("ledger")) {
      return isHindi
        ? "B2B Wallet recharge karne ke steps:\n\n"
          + "1. Sidebar se **'Wallet & Payments'** me jayein: [Open B2B Wallet](/dashboard/wallet).\n"
          + "2. Yahan aapka current balance aur transaction history dikhegi.\n"
          + "3. **'Recharge Wallet'** par click karein aur amount enter karein.\n"
          + "4. PayU ya UPI se secure online payment complete karein. Payment hote hi balance turant update ho jayega!"
        : "To recharge your B2B prepaid wallet:\n\n"
          + "1. Go to **Dashboard > Wallet & Payments**: [Open B2B Wallet](/dashboard/wallet).\n"
          + "2. Review your balance and transaction history.\n"
          + "3. Click **'Recharge Wallet'** and enter the desired amount.\n"
          + "4. Complete the online payment via PayU or UPI. Your balance reflects immediately.";
    }

    // Report Lock Rule for B2B
    if (q.includes("lock") || q.includes("unpaid") || q.includes("negative") || q.includes("kyu nahi khul rahi") || q.includes("download nahi")) {
      return isHindi
        ? "Report Lock hone ka karan aur solution:\n\n"
          + "OnePath LIS me B2B policy ke mutabik agar aapka wallet balance negative ho jata hai ya koi due payment bacha hota hai, to reports par **'Locked due to unpaid balance'** lag jata hai aur PDF download nahi hoti.\n\n"
          + "**Solution**: Turant [Open B2B Wallet](/dashboard/wallet) me jakar online recharge karein. Recharge complete hote hi sabhi reports instantly unlock ho jayengi!"
        : "Why is report access locked and how to resolve it:\n\n"
          + "In accordance with B2B credit policies, if your wallet balance falls into the negative or has pending dues, report downloads are locked.\n\n"
          + "**Solution**: Go to [Open B2B Wallet](/dashboard/wallet) and complete a quick online wallet recharge via PayU or UPI. Once payment is confirmed, all reports unlock automatically.";
    }

    // B2B Reports & Download
    if (q.includes("report") || q.includes("download") || q.includes("pdf") || q.includes("print")) {
      return isHindi
        ? "B2B Reports download karne ke steps:\n\n"
          + "1. Sidebar se **'Reports'** me jayein: [Open Reports Management](/dashboard/reports).\n"
          + "2. Jab report status **'Approved'** ho jaye, to **'PDF'** ya **'Print'** par click karein.\n"
          + "3. Clean letterhead ya plain paper format me report download ho jayegi."
        : "To download finalized reports in B2B portal:\n\n"
          + "1. Go to [Open Reports Management](/dashboard/reports).\n"
          + "2. Locate the patient. Once the status shows **'Approved'**, click **'PDF'** or **'Print'**.\n"
          + "3. Download the verified vector PDF report.";
    }

    // B2B Patient Booking
    if (q.includes("patient") || q.includes("mariz") || q.includes("booking") || q.includes("register")) {
      return isHindi
        ? "B2B Patient booking ke steps:\n\n"
          + "1. Sidebar se **'+ Add Patient'** dabayein: [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Patient details enter karein aur tests select karein. B2B portal me rates automatically contracted discount par calculate hote hain.\n"
          + "3. Save karke barcode print karein aur sample central lab dispatch karein."
        : "To book a patient under B2B rate card:\n\n"
          + "1. Click **'+ Add Patient'** or go to [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Enter patient demographics and select prescribed tests. B2B contracted rates apply automatically.\n"
          + "3. Save to generate barcode and dispatch specimen to central laboratory.";
    }

    // Contracted Rates for B2B
    if (q.includes("rate") || q.includes("price") || q.includes("khrcha")) {
      return isHindi
        ? "Contracted B2B Rate List dekhne ke liye:\n\n"
          + "1. Sidebar se **'Finance & Rates > Rate List'** me jayein: [Open Rate List](/dashboard/ratelist).\n"
          + "2. Yahan aapko aapke B2B agreement ke mutabik sabhi tests aur packages ke contracted rates dikhenge."
        : "To view your contracted B2B rate list:\n\n"
          + "1. Go to **Dashboard > Finance & Rates > Rate List**: [Open Rate List](/dashboard/ratelist).\n"
          + "2. Review agreed prices for all tests and health packages.";
    }

    // Default B2B response
    return isHindi
      ? "Main OnePath B2B Partner Assistant hoon! Main aapko in features me guide kar sakta hoon:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register) – B2B rate par referral mariz book karna\n"
        + "- [Open B2B Wallet](/dashboard/wallet) – Prepaid wallet balance dekhna aur online recharge karna\n"
        + "- [Open Reports Management](/dashboard/reports) – Approved test reports download karna\n"
        + "- [Open Rate List](/dashboard/ratelist) – Contracted rate list check karna\n\n"
        + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
      : "Welcome to the OnePath B2B Partner Assistant! I can guide you through all B2B features:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register): Book patients at B2B rates\n"
        + "- [Open B2B Wallet](/dashboard/wallet): Check balance and recharge via PayU/UPI\n"
        + "- [Open Reports Management](/dashboard/reports): Download approved test reports\n"
        + "- [Open Rate List](/dashboard/ratelist): Check contracted B2B rate list.";
  }

  // ==========================================
  // ROLE 4: ADMIN / PATHOLOGIST / SUPER ADMIN
  // ==========================================
  // Greetings & Identity
  if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("kya kar sakte") || q.includes("namaste") || q.includes("hello") || q.includes("hi") || q.includes("suno")) {
    return isHindi
      ? "Namaste! Main **OnePath AI Guide** hoon – OnePath Lab LIS ka official assistant.\n\n"
        + "Main aapko LIS ke sabhi features chalane me step-by-step madad kar sakta hoon:\n\n"
        + "1. **[Patient Registration](/dashboard/patients/register)** – Naye mariz add karna, test select karna aur barcode nikalna.\n"
        + "2. **[Report Result Entry](/dashboard/reports)** – Test result daalna aur '✨ AI Suggestion' se clinical remarks banana.\n"
        + "3. **[Report Layout Settings](/dashboard/settings?tab=report-layout)** – 1 Test Per Page separation aur doctor signatures lagana.\n"
        + "4. **[Letterhead Settings](/dashboard/settings?tab=letterhead)** – Letterhead upload karna aur header/footer margins set karna.\n"
        + "5. **[Test Master & Rates](/dashboard/tests)** – Naye tests add karna, rates badalna aur AI clinical interpretation banana.\n"
        + "6. **[Machine Integration](/dashboard/settings?tab=machine-integration)** – Automated cell counter / analyzer connect karna.\n"
        + "7. **[Collection Centers & B2B](/dashboard/settings?tab=collection-centers)** – B2B branches aur prepaid wallet manage karna.\n\n"
        + "Aap LIS se juda koi bhi sawal pooch sakte hain!"
      : "Hello! I am the **OnePath AI Guide** – your official assistant for OnePath Laboratory Information System.\n\n"
        + "I can help you step-by-step with:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register): Register patients & print barcodes\n"
        + "- [Open Reports Management](/dashboard/reports): Enter results & generate AI clinical impressions\n"
        + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout): Multi-page test separation & doctor signatures\n"
        + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Upload letterhead & configure margins\n"
        + "- [Open Test Master](/dashboard/tests): Manage tests, prices & AI interpretations\n"
        + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): Connect automated analyzers via ASTM/HL7\n"
        + "- [Open Collection Centers](/dashboard/settings?tab=collection-centers): B2B partner portals & wallet balances";
  }

  // 1 Test Per Page
  if (q.includes("separate") || q.includes("alag") || q.includes("single page") || q.includes("1 test") || q.includes("multi page") || q.includes("har test")) {
    return isHindi
      ? "Har test ko alag-alag page (1 Test Per Page) par print karne ke liye ye karein:\n\n"
        + "1. **Dashboard > Settings > Report Layout** me jayein: [Open Report Layout Settings](/dashboard/settings?tab=report-layout).\n"
        + "2. Section 2 me **'Multi-Page Test Separation (1 Test Per Page)'** option dhoondein.\n"
        + "3. Uske checkbox ko **Tick (Check)** karein aur **'Save Report Layout'** par click karein.\n"
        + "4. Ab har test (CBC, LFT, KFT) naye clean page par shuru hoga! Agar kisi test ka interpretation lamba ho to agle page par naturally flow karega."
      : "To enable 1 Test Per Page (Multi-Page Test Separation):\n\n"
        + "1. Go to **Dashboard > Settings > Report Layout**: [Open Report Layout Settings](/dashboard/settings?tab=report-layout).\n"
        + "2. In Section 2, locate **'Multi-Page Test Separation (1 Test Per Page)'**.\n"
        + "3. Check the box and click **'Save Report Layout'**.\n"
        + "4. Each test (CBC, LFT, KFT) will start cleanly on its own separate page. Lengthy interpretations flow to page 2 naturally.";
  }

  // Patient Registration & Barcode
  if (q.includes("patient") || q.includes("mariz") || q.includes("mareez") || q.includes("sample") || q.includes("register") || q.includes("booking") || q.includes("barcode") || q.includes("sticker") || q.includes("jode") || q.includes("entry")) {
    return isHindi
      ? "Naye patient ka registration aur barcode nikalne ke steps:\n\n"
        + "1. Sidebar me **'+ Add Patient'** dabayein ya direct jayein: [Open Patient Registration](/dashboard/patients/register).\n"
        + "2. Mariz ka Name, Age, Gender, Mobile Number, aur Ref Doctor bharein.\n"
        + "3. Search karke required Tests ya Health Packages select karein (rate apne aap calculate hoga).\n"
        + "4. Billing details confirm karein aur **'Register & Save'** dabayein.\n"
        + "5. Save hote hi unique Lab PID aur vial barcode sticker generate ho jayega jise aap print kar sakte hain."
      : "To register a patient and print vial barcodes:\n\n"
        + "1. Click **'+ Add Patient'** in the sidebar or go to [Open Patient Registration](/dashboard/patients/register).\n"
        + "2. Fill in patient demographics (Name, Age, Gender, Phone, Referring Doctor).\n"
        + "3. Select prescribed Tests or Health Packages from the searchable list.\n"
        + "4. Review billing details and click **'Register & Save'**.\n"
        + "5. A unique Lab PID and barcode sticker will be generated ready for printing.";
  }

  // Result Entry & AI Suggestions
  if (q.includes("result") || q.includes("parinam") || q.includes("enter") || q.includes("formula") || q.includes("suggestion") || q.includes("verify") || q.includes("approve")) {
    return isHindi
      ? "Test result daalne aur AI suggestion use karne ke steps:\n\n"
        + "1. **Dashboard > Reports** me jayein: [Open Reports Management](/dashboard/reports).\n"
        + "2. Patient ke aage **'Enter Result'** (Edit icon) par click karein.\n"
        + "3. Parameter values type karein. MCV, MCH, A:G Ratio, EGFR jaise formulas apne aap calculate honge aur abnormal values red flag ho jayengi.\n"
        + "4. Remarks / Advices me **'✨ AI Suggestion'** button dabayein instant clinical summary ke liye.\n"
        + "5. Sab check karke **'Save & Complete Report'** ya **'Approve'** par click karein."
      : "To enter results and use AI clinical suggestions:\n\n"
        + "1. Go to **Dashboard > Reports**: [Open Reports Management](/dashboard/reports).\n"
        + "2. Click **'Enter Result'** next to the patient's record.\n"
        + "3. Type values. Formulas (MCV, MCH, A:G Ratio, EGFR) auto-calculate, and abnormals are flagged in red.\n"
        + "4. In Remarks or Advices, click **'✨ AI Suggestion'** for an automated doctor clinical impression.\n"
        + "5. Click **'Save & Complete Report'** to finalize.";
  }

  // Letterhead & Margins
  if (q.includes("letterhead") || q.includes("margin") || q.includes("header") || q.includes("footer") || q.includes("plain paper") || q.includes("pad")) {
    return isHindi
      ? "Letterhead upload aur print margins set karne ke steps:\n\n"
        + "1. **Dashboard > Settings > Letterhead** par jayein: [Open Letterhead Settings](/dashboard/settings?tab=letterhead).\n"
        + "2. Apni Letterhead image (JPEG ya PNG) upload karein.\n"
        + "3. Sliders se **Header Margin** aur **Footer Margin** adjust karein taaki text pre-printed paper par na chhape.\n"
        + "4. Right side me live A4 preview dekhein aur **'Save Letterhead Settings'** dabayein.\n"
        + "5. Print dialog me plain paper ke liye 'Print with Header & Footer' tick rakhein, ya printed pad ke liye uncheck karein."
      : "To configure letterhead and print margins:\n\n"
        + "1. Go to **Dashboard > Settings > Letterhead**: [Open Letterhead Settings](/dashboard/settings?tab=letterhead).\n"
        + "2. Upload your high-resolution Letterhead image (JPEG/PNG).\n"
        + "3. Use the visual sliders to adjust **Header Margin** and **Footer Margin**.\n"
        + "4. Check the live A4 preview on the right and click **'Save Letterhead Settings'**.\n"
        + "5. In print dialogs, check 'Print with Header & Footer' for plain paper or uncheck it for pre-printed letterhead.";
  }

  // Machine Integration
  if (q.includes("machine") || q.includes("analyzer") || q.includes("counter") || q.includes("sysmex") || q.includes("mindray") || q.includes("erba") || q.includes("bridge")) {
    return isHindi
      ? "Automated Cell Counter ya Biochemistry Analyzer connect karne ke steps:\n\n"
        + "1. **Dashboard > Settings > Machine Integration** me jayein: [Open Machine Integration](/dashboard/settings?tab=machine-integration).\n"
        + "2. Machine ko PC se Serial RS232 cable ya LAN network (TCP/IP) se jodein.\n"
        + "3. **'+ Add Machine'** dabayein, machine name, model aur ASTM/HL7 protocol select karein.\n"
        + "4. Lab computer par **OnePath Machine Bridge** (`START_MACHINE_BRIDGE.bat`) run karein.\n"
        + "5. Analyzer par sample run karte hi readings apne aap LIS me Result Entry par aa jayengi!"
      : "To connect automated laboratory analyzers:\n\n"
        + "1. Go to **Dashboard > Settings > Machine Integration**: [Open Machine Integration](/dashboard/settings?tab=machine-integration).\n"
        + "2. Connect the analyzer to your PC via Serial RS232 or LAN (TCP/IP).\n"
        + "3. Click **'+ Add Machine'**, enter model and protocol (ASTM/HL7).\n"
        + "4. Run **OnePath Machine Bridge** (`START_MACHINE_BRIDGE.bat`) on your lab PC.\n"
        + "5. Analyzer readings will stream automatically into Result Entry!";
  }

  // Tests, Rates & Packages
  if (q.includes("test") || q.includes("rate") || q.includes("price") || q.includes("khrcha") || q.includes("package") || q.includes("interpretation")) {
    return isHindi
      ? "Tests, Rates aur Packages manage karne ke steps:\n\n"
        + "1. **Dashboard > Tests**: [Open Test Master](/dashboard/tests) – yahan naye tests add kar sakte hain aur price badal sakte hain.\n"
        + "2. Test edit karke **'Interpretation'** dabayein aur **'✨ AI Generate Interpretation'** se automated clinical table banayein.\n"
        + "3. Combo Health Packages banane ke liye: [Open Health Packages](/dashboard/tests/packages).\n"
        + "4. B2B partners ke alag custom rates set karne ke liye: [Open Rate List](/dashboard/ratelist)."
      : "To manage Tests, Rates, and Packages:\n\n"
        + "1. Go to **Dashboard > Tests**: [Open Test Master](/dashboard/tests) to add/edit tests, prices, and reference ranges.\n"
        + "2. In any test, click **'Interpretation'** and use **'✨ AI Generate Interpretation'** for automated clinical tables.\n"
        + "3. For health packages, configure them in [Open Health Packages](/dashboard/tests/packages).\n"
        + "4. For B2B client rate lists, manage them in [Open Rate List](/dashboard/ratelist).";
  }

  // Collection Centers & B2B
  if (q.includes("center") || q.includes("b2b") || q.includes("branch") || q.includes("wallet") || q.includes("commission") || q.includes("recharge")) {
    return isHindi
      ? "Collection Centers aur B2B Partners manage karne ke steps:\n\n"
        + "1. **Settings > Collection Centers** me jayein: [Open Collection Centers](/dashboard/settings?tab=collection-centers).\n"
        + "2. **'+ Add Center'** dabayein, center ka name, code, aur commission percentage set karein.\n"
        + "3. Unko login credentials dein taaki wo apne portal se sample book kar sakein.\n"
        + "4. B2B sales track karein: [Open B2B Sales](/dashboard/b2b) aur prepaid wallet recharge manage karein: [Open B2B Wallets](/dashboard/b2b/wallets)."
      : "To manage Collection Centers and B2B Branches:\n\n"
        + "1. Go to **Settings > Collection Centers**: [Open Collection Centers](/dashboard/settings?tab=collection-centers).\n"
        + "2. Click **'+ Add Center'**, enter center name, code, and commission rate.\n"
        + "3. Provide login credentials so they can register samples from their center.\n"
        + "4. Monitor sales in [Open B2B Sales](/dashboard/b2b) and manage prepaid wallets in [Open B2B Wallets](/dashboard/b2b/wallets).";
  }

  // ABHA ID & ABDM
  if (q.includes("abha") || q.includes("abdm") || q.includes("ayushman") || q.includes("health id")) {
    return isHindi
      ? "ABHA ID aur ABDM Integration ke steps:\n\n"
        + "1. Top navbar me **'Create ABHA ID'** button dabayein – patient ke scan karne ke liye QR poster open ho jayega.\n"
        + "2. Patient mobile se scan karke apna ABHA account create kar sakte hain.\n"
        + "3. Top navbar ke search bar me ABHA address search karke patient dhoond sakte hain.\n"
        + "4. Patient Registration me **'Link via ABHA'** se Aadhaar OTP verify karke record link kar sakte hain."
      : "To use ABHA ID & ABDM Integration:\n\n"
        + "1. In the top navbar, click **'Create ABHA ID'** to display a QR poster for patient mobile scan.\n"
        + "2. Patients can scan the QR code to create their official ABHA card.\n"
        + "3. Search patients by ABHA address in the top search bar.\n"
        + "4. In Patient Registration, click **'Link via ABHA'** to verify with Aadhaar OTP.";
  }

  return isHindi
    ? "Main OnePath LIS Assistant hoon! Main aapko OnePath Laboratory Information System ke kisi bhi feature me guide kar sakta hoon:\n\n"
      + "- [Open Patient Registration](/dashboard/patients/register) – Naye mariz aur sample booking\n"
      + "- [Open Reports Management](/dashboard/reports) – Result entry aur AI remarks\n"
      + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout) – 1-Test-Per-Page aur doctor sign\n"
      + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead) – Letterhead aur print margin set karna\n"
      + "- [Open Test Master](/dashboard/tests) – Test rate aur AI interpretation\n"
      + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration) – Analyzer connect karna\n\n"
      + "Aap Hindi, Hinglish ya English me kuch bhi pooch sakte hain!"
    : "Welcome to the OnePath LIS Assistant! I can guide you step-by-step through any feature or setting in OnePath LIS:\n\n"
      + "- [Open Patient Registration](/dashboard/patients/register): Register patients and book samples\n"
      + "- [Open Reports Management](/dashboard/reports): Enter test results and print reports\n"
      + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout): Multi-page test separation & signatures\n"
      + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Upload letterhead and set print margins\n"
      + "- [Open Test Master](/dashboard/tests): Configure tests, prices, and interpretations\n"
      + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): Connect automated analyzers";
}
