"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles, Bot, X, Send, RotateCcw,
  ArrowRight, ExternalLink, HelpCircle,
  FlaskConical, Users, FileText, Settings,
  Cpu, Receipt, Layers, Compass, Loader2
} from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const FAQ_SUGGESTIONS = [
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
];

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

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "👋 **Welcome to OnePath LIS Assistant**\n\nI can guide you step-by-step through any feature, workflow, or configuration in OnePath LIS.\n\nSelect a quick topic below or type your question in English or Hindi:",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-resize textarea according to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 220);
    }
  }, [isOpen, messages]);

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
      const fallbackAnswer = getClientFallbackAnswer(textToSend);
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
        content:
          "👋 **Welcome to OnePath LIS Assistant**\n\nI can guide you step-by-step through any feature, workflow, or configuration in OnePath LIS.\n\nSelect a quick topic below or type your question in English or Hindi:",
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
          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline mx-1 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors shadow-2xs cursor-pointer active:scale-95"
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

  if (!shouldShowGuide) {
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
          1. FLOATING BOTTOM-RIGHT TRIGGER BUTTON (Lightweight, Professional Medical UI)
      ========================================================================= */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2.5">
        {/* Helper Pill Banner when closed */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-md text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:border-blue-400/60 transition-all hover:-translate-x-1"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Need help? Ask LIS Guide</span>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </div>
        )}

        {/* Lightweight Professional Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-11 sm:h-12 px-3.5 sm:px-4 rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none active:scale-95 border ${
            isOpen
              ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
              : "bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600"
          }`}
          title="OnePath LIS Guide & Assistant"
        >
          {isOpen ? (
            <>
              <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              <span className="font-semibold text-xs">Close</span>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col items-start text-left leading-none">
                <span className="font-bold text-xs text-slate-900 dark:text-white">LIS Guide</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Assistant</span>
              </div>
            </>
          )}
        </button>
      </div>

      {/* =========================================================================
          2. FLOATING SPLIT CHATBOX WINDOW (Smooth origin-bottom-right animation, fully responsive)
      ========================================================================= */}
      <div
        className={`fixed bottom-20 sm:bottom-22 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[420px] max-w-[440px] h-[calc(100dvh-110px)] sm:h-[580px] max-h-[720px] flex flex-col rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 px-4 bg-slate-50/90 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">OnePath LIS Guide</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-[9px] border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Interactive Lab Assistant &amp; Navigator
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
                <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`relative max-w-[88%] rounded-xl p-3 shadow-2xs ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-xs font-medium text-xs"
                    : "bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-xs"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
                <span
                  className={`block text-[9px] mt-1.5 text-right ${
                    msg.role === "user" ? "text-blue-100/70" : "text-slate-400"
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Loader */}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="px-3 py-2 rounded-xl rounded-tl-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 shadow-2xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span>OnePath AI is finding the guide...</span>
              </div>
            </div>
          )}

          {/* Quick FAQ Suggestion Cards */}
          {messages.length <= 2 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                <Compass className="h-3.5 w-3.5 text-blue-600" />
                <span>Common Help Topics:</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {FAQ_SUGGESTIONS.map((faq, idx) => {
                  const Icon = faq.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(faq.query)}
                      className="w-full flex items-center justify-between p-2.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-blue-50/50 dark:hover:bg-zinc-800/70 hover:border-blue-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                        <span>{faq.label}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
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
          <div className="relative flex flex-col rounded-xl border border-slate-200 dark:border-zinc-750 bg-slate-50/80 dark:bg-zinc-950/70 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about OnePath LIS (e.g. 'How to register a patient', 'Report printing')..."
              disabled={loading}
              className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1.5 text-xs leading-relaxed text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 min-h-[38px] max-h-[110px]"
            />
            <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5 border-t border-slate-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Sparkles className="h-3 w-3 text-blue-500" />
                <span className="font-medium">OnePath AI</span>
              </div>
              <div className="flex items-center gap-1.5">
                {input.trim() && (
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Clear input"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
                  className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
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
            <span>LIS Admin &amp; Lab Operations</span>
            <span>Press <strong>Enter ↵</strong> to send</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Client-side fallback knowledge generator (Bilingual Hindi/Hinglish & English)
function getClientFallbackAnswer(query: string): string {
  const q = (query || "").trim().toLowerCase();

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
        ? "OnePath LIS ek proprietary aur secure enterprise laboratory information system hai. Iska internal codebase, architecture aur backend technology details confidential hain.\n\nMain sirf OnePath LIS ke software features aur lab operations (jaise Patient Registration, Test Master, Report Print, 1-Test-Per-Page, Letterhead Margins aur Billing) me aapki madad kar sakta hoon. LIS features se juda koi sawal ho to batayein!"
        : "OnePath LIS is a proprietary, secure enterprise laboratory information system. Internal engineering, codebase, and backend architecture details are confidential.\n\nI am here strictly to assist you with using OnePath LIS software features—such as Patient Registration, Report Formatting, 1-Test-Per-Page layout, Test Master, Letterhead Margins, and Billing. How can I assist you with your lab operations today?";
    }
  }

  const unrelated = ["cricket", "movie", "song", "joke", "cooking", "weather", "football", "politics", "recipe", "khana", "biryani", "film", "gaana"];
  for (const w of unrelated) {
    if (q.includes(w)) {
      return isHindi
        ? "Main OnePath LIS Assistant hoon aur sirf OnePath Laboratory Information System ke features, settings, reports aur lab operations me aapki madad kar sakta hoon. LIS se juda koi sawal ho to batayein!"
        : "I am the OnePath LIS Assistant and can only help with OnePath Laboratory Information System features, settings, workflows, B2B, and lab operations. How can I assist you with the LIS today?";
    }
  }

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
