"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles, Bot, X, Send, RotateCcw,
  ArrowRight, ExternalLink, HelpCircle,
  FlaskConical, Users, FileText, Settings,
  Cpu, Receipt, Layers, Compass, Loader2,
  Clock, Activity, Wallet, Boxes, FileSpreadsheet, Shield, AlertTriangle,
  Stethoscope, Gift
} from "lucide-react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";
import {
  getClientFallbackAnswer,
  getRoleWelcomeMessage,
  normalizeAiRole,
  type UserPortalRole
} from "@/lib/ai-guide-knowledge";

/**
 * Frontend Fallback Knowledge Catalog & Core Navigation Coverage:
 * 14. AI Smart Clinical Reports
 * 15. Manual Laboratory Worksheet
 * 16. Diagnostic Health Packages
 * 17. Rate List Master & Agreements
 * 18. Dues Management & Outstanding Balance
 * 19. Monthly Business & Expenses Register
 * 20. Sample Rejection & Recollection
 * 21. Lab Account, Subscriptions & GST Invoices
 * 22. Role-Based Access Control (RBAC) & Terminal Accounts
 * 23. Custom Editor & Narrative Histopathology Reports
 * 24. Outsourced Cases & Batch Printing
 * 25. Help & Technical Support System
 *
 * System Architecture Shields: "laravel", "source code"
 * "OnePath LIS is a proprietary, secure enterprise laboratory information system"
 */

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
    label: "Print Billing Receipts & Dues",
    query: "How to print patient payment receipts and check due balances?",
  },
  {
    icon: Activity,
    label: "Monthly Business Report",
    query: "How to track monthly business performance and intake volume?",
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
    icon: Clock,
    label: "Today's Samples Queue",
    query: "How do I check today's booked samples queue?",
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
    label: "View Registered Patients & History",
    query: "How to search and view patient records and history in the directory?",
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
    label: "Track Dispatched Samples",
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
    icon: Sparkles,
    label: "AI Smart Clinical Report",
    query: "How to generate and customize 4-page visual AI Smart Reports with organ wellness scores?",
  },
  {
    icon: FileSpreadsheet,
    label: "Manual Batch Worksheet",
    query: "How to generate and download batch worksheets for laboratory bench testing?",
  },
  {
    icon: Boxes,
    label: "Diagnostic Health Packages",
    query: "How to create bundled health checkup packages and calculate patient savings?",
  },
  {
    icon: Layers,
    label: "Rate List & 1-Click % Discount",
    query: "How to configure B2B custom rate agreements and 1-click % discount presets?",
  },
  {
    icon: Receipt,
    label: "Dues & Balance Collection",
    query: "How to track pending patient dues and accept partial or full payments?",
  },
  {
    icon: Activity,
    label: "Monthly Expenses & P&L",
    query: "How to log operational lab expenses and track monthly revenue and net profit?",
  },
  {
    icon: Stethoscope,
    label: "Cases & Doctor Commissions",
    query: "How to manage referral doctors, cases, and commission settlements?",
  },
  {
    icon: AlertTriangle,
    label: "Sample Rejection & Recollection",
    query: "How to reject hemolyzed or clotted samples and request recollection?",
  },
  {
    icon: Shield,
    label: "Lab Account & Daily Quota",
    query: "How to check daily free patient quota, WhatsApp credits, and GST tax invoices?",
  },
  {
    icon: Shield,
    label: "RBAC & Staff Terminals",
    query: "How to create role-based staff logins and set granular module permissions?",
  },
  {
    icon: Cpu,
    label: "Analyzer Machine Bridge",
    query: "How to connect automated cell counter or analyzer to LIS via ASTM or HL7?",
  },
  {
    icon: FileText,
    label: "Result Entry & AI Remarks",
    query: "How to enter test results and generate AI clinical impressions?",
  },
  {
    icon: Users,
    label: "Patient Registration & Barcode",
    query: "How do I register a new patient and print vial barcodes?",
  },
  {
    icon: Gift,
    label: "Refer & Earn Program",
    query: "How to invite diagnostic labs and earn subscription credits?",
  },
];


function getWelcomeMessage(role: string): string {
  return getRoleWelcomeMessage(role);
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

  const getInitialRole = (): UserPortalRole => {
    if (typeof window !== "undefined") {
      try {
        const stored = getStoredUser();
        const r = normalizeAiRole(stored?.role);
        if (stored?.role) return r;
        const roleMatch = document.cookie.match(/(?:^|;\s*)lis_role=([^;]+)/);
        if (roleMatch && roleMatch[1]) {
          return normalizeAiRole(decodeURIComponent(roleMatch[1]));
        }
      } catch {
        return "ADMIN";
      }
    }
    return "ADMIN";
  };

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserPortalRole>(getInitialRole);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-1",
      role: "assistant",
      content: getRoleWelcomeMessage(getInitialRole()),
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
    const r = normalizeAiRole(stored?.role);
    setUserRole(r);

    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content: getRoleWelcomeMessage(r),
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
      const r = normalizeAiRole(stored?.role);
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

  // Check if any user message has been sent in the active conversation
  const hasUserMessage = useMemo(() => {
    return messages.some((m) => m.role === "user");
  }, [messages]);

  // Auto-scroll to latest message on new message or loading state change
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

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

    let assistantReply: string | null = null;
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

      if (res && typeof res.answer === "string" && res.answer.trim().length > 0) {
        assistantReply = res.answer;
      }
    } catch {
      // Backend guide endpoint unavailable, fallback immediately
    }

    if (!assistantReply) {
      assistantReply = getClientFallbackAnswer(textToSend, userRole);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: "bot-" + Date.now(),
        role: "assistant",
        content: assistantReply!,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setLoading(false);
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
          FLOATING CHATBOX WINDOW (Responsive on PC, Tablets and Mobile)
      ========================================================================= */}
      <div
        className={`fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-6 sm:left-4 md:left-[268px] z-50 w-auto sm:w-[460px] md:w-[480px] max-w-[calc(100vw-16px)] sm:max-w-[500px] h-[calc(100dvh-16px)] sm:h-[620px] max-h-[calc(100dvh-16px)] sm:max-h-[740px] flex flex-col rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden origin-bottom-left transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="p-3 sm:p-3.5 px-3.5 sm:px-4 bg-slate-50/90 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{portalInfo.title}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-[9px] border border-emerald-200 dark:border-emerald-800 shrink-0 whitespace-nowrap">
                  {portalInfo.badge}
                </span>
              </div>
              <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                {portalInfo.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              className="min-h-[30px] min-w-[30px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-[30px] min-w-[30px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-3.5 space-y-3 bg-slate-50/40 dark:bg-zinc-950/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-1.5 sm:gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
              )}

              <div
                className={`relative max-w-[90%] sm:max-w-[85%] rounded-xl p-2.5 sm:p-3 shadow-2xs text-xs sm:text-[13px] ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-xs font-medium"
                    : "bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-xs"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
                <span
                  suppressHydrationWarning
                  className={`block text-[8.5px] sm:text-[9px] mt-1.5 text-right ${
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
            <div className="flex gap-1.5 sm:gap-2 items-center">
              <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <div className="px-3 py-2 rounded-xl rounded-tl-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 shadow-2xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0" />
                <span className="truncate">OnePath AI is finding the guide...</span>
              </div>
            </div>
          )}

          {/* Quick FAQ Suggestion Cards (Shown ONLY before user enters any prompt - removes immediately upon sending) */}
          {!hasUserMessage && !loading && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                <Compass className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
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
                      className="w-full flex items-center justify-between p-2.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-emerald-50/50 dark:hover:bg-zinc-800/70 hover:border-emerald-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer shadow-2xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 min-w-0 pr-2">
                        <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                        <span className="truncate">{faq.label}</span>
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

        {/* Bottom Chat Input Form (Upgraded, Professional Textarea Container & Responsive Send Button) */}
        <div className="shrink-0 sticky bottom-0 z-10 p-2.5 sm:p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
          <div className="relative flex flex-col rounded-xl border border-slate-200 dark:border-zinc-750 bg-slate-50/80 dark:bg-zinc-950/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={portalInfo.placeholder}
              disabled={loading}
              className="w-full resize-none bg-transparent px-3 sm:px-3.5 pt-2 sm:pt-2.5 pb-1.5 sm:pb-2 text-xs sm:text-[13px] leading-5 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 min-h-[42px] sm:min-h-[46px] max-h-[100px] sm:max-h-[120px]"
            />
            <div className="flex items-center justify-between px-2.5 sm:px-3 pb-2 pt-1 border-t border-slate-100 dark:border-zinc-800/60 gap-2">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-slate-400 shrink-0">
                <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">OnePath AI</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {input.trim() && (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    title="Clear input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
                  className="min-h-[32px] sm:h-7.5 px-3 sm:px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                  title="Send message (Enter ↵)"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] sm:text-[9.5px] text-slate-400">
            <span className="truncate max-w-[60%]">{portalInfo.footer}</span>
            <span className="shrink-0 text-right">
              <span className="hidden sm:inline">Press <strong>Enter ↵</strong> to send</span>
              <span className="sm:hidden">Tap <strong>Send</strong></span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// Re-export pure knowledge engine functions for direct consumers and test runners
export { getClientFallbackAnswer, getRoleWelcomeMessage, normalizeAiRole };

