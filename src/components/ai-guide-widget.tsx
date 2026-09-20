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
    label: "Patient & Sample Registration",
    query: "How do I register a new patient, add tests, and print barcodes?",
  },
  {
    icon: FileText,
    label: "Result Entry, Formulas & AI Suggestions",
    query: "How do I enter test results, use automated formulas, and generate AI clinical suggestions?",
  },
  {
    icon: Settings,
    label: "Letterhead Upload & Print Margins",
    query: "How do I upload lab letterhead and adjust header and footer print margins?",
  },
  {
    icon: Cpu,
    label: "Analyzer & Machine Integration",
    query: "How do I connect an automated cell counter or biochemistry analyzer to LIS?",
  },
  {
    icon: FlaskConical,
    label: "Test Master & Rate Modification",
    query: "How do I add a new test, change test rates, and set clinical interpretations?",
  },
  {
    icon: Layers,
    label: "Collection Centers & B2B Branches",
    query: "How do I create collection centers, set B2B commission, and manage prepaid wallets?",
  },
  {
    icon: Receipt,
    label: "UPI / QR Payment Gateway",
    query: "How do I set up UPI QR code payment gateway on patient bills?",
  },
];

export function AiGuideWidget() {
  const router = useRouter();
  const pathname = usePathname();

  // Show only on: Overview, Patients, Reports (not enter result edit page), Billing, Settings, Lab Account, My Account
  const shouldShowGuide = useMemo(() => {
    if (!pathname) return false;
    const path = pathname.replace(/\/$/, "");

    // 1. Overview (/dashboard)
    if (path === "/dashboard") return true;

    // 2. Patients (/dashboard/patients, /dashboard/patients/register, etc.)
    if (path === "/dashboard/patients" || path.startsWith("/dashboard/patients/")) return true;

    // 3. Reports (/dashboard/reports), but EXCLUDE enter result page (/dashboard/reports/.../edit)
    if (path === "/dashboard/reports" || path.startsWith("/dashboard/reports/")) {
      if (path.includes("/edit")) {
        return false; // Specifically hide on Enter Result page
      }
      return true;
    }

    // 4. Billing (/dashboard/billing)
    if (path === "/dashboard/billing" || path.startsWith("/dashboard/billing/")) return true;

    // 5. Setting (/dashboard/settings)
    if (path === "/dashboard/settings" || path.startsWith("/dashboard/settings/")) return true;

    // 6. Lab Account (/dashboard/account/lab)
    if (path === "/dashboard/account/lab" || path.startsWith("/dashboard/account/lab/")) return true;

    // 7. My Account (/dashboard/account/profile)
    if (path === "/dashboard/account/profile" || path.startsWith("/dashboard/account/profile/")) return true;

    // Hide everywhere else (e.g. tests, ratelist, support, b2b, today-samples, wallet, revenue)
    return false;
  }, [pathname]);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "👋 **Welcome to OnePath LIS Guide!**\n\nI can help you navigate, configure, and operate any feature across OnePath LIS (Sample Booking, Result Entry, Letterhead Margins, Machine Connection, Rates, and B2B).\n\nSelect a topic below or type your question in English or Hindi:",
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
          "👋 **Welcome to OnePath LIS Guide!**\n\nI can help you navigate, configure, and operate any feature across OnePath LIS (Sample Booking, Result Entry, Letterhead Margins, Machine Connection, Rates, and B2B).\n\nSelect a topic below or type your question:",
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
              placeholder="Ask about any LIS feature, setting, or workflow..."
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

// Client-side fallback knowledge generator in English
function getClientFallbackAnswer(query: string): string {
  const q = query.toLowerCase();

  const unrelated = ['cricket', 'movie', 'song', 'joke', 'cooking', 'weather', 'football', 'politics'];
  for (const w of unrelated) {
    if (q.includes(w)) {
      return "I am the OnePath LIS Assistant and can only help with OnePath Laboratory Information System features, settings, workflows, B2B, and lab operations. How can I assist you with the LIS today?";
    }
  }

  if (q.includes("patient") || q.includes("sample") || q.includes("register") || q.includes("booking")) {
    return "To register a new patient or sample in OnePath LIS:\n\n"
      + "1. Click **'+ Add Patient'** in the sidebar or go directly to [Open Patient Registration](/dashboard/patients/register).\n"
      + "2. Fill in the patient demographics (Name, Age, Gender, Mobile, Referring Doctor).\n"
      + "3. Select the required Tests or Health Packages from the searchable list.\n"
      + "4. Confirm billing details, discounts, and initial payment.\n"
      + "5. Click **'Register & Save'**. A unique PID and barcode are automatically created for sample tube printing.";
  }

  if (q.includes("result") || q.includes("enter") || q.includes("formula") || q.includes("suggestion") || q.includes("verify")) {
    return "To enter test results and use AI suggestions in OnePath LIS:\n\n"
      + "1. Go to **Dashboard > Reports**: [Open Reports Management](/dashboard/reports).\n"
      + "2. Click **'Enter Result'** on the patient's report.\n"
      + "3. Enter parameter values. Automated formulas (MCV, MCH, A:G Ratio, EGFR, etc.) calculate automatically, and abnormal values are flagged.\n"
      + "4. In the Remarks, Advices, or Notes boxes, click the **'✨ AI Suggestion'** button for an instant clinical pathologist summary.\n"
      + "5. Review and click **'Save & Complete Report'** to finalize.";
  }

  if (q.includes("letterhead") || q.includes("margin") || q.includes("header") || q.includes("footer")) {
    return "To configure your lab letterhead and print margins:\n\n"
      + "1. Go to **Dashboard > Settings > Letterhead**: [Open Letterhead Settings](/dashboard/settings?tab=letterhead).\n"
      + "2. Upload your high-resolution Letterhead image (JPEG or PNG).\n"
      + "3. Adjust the **Header Margin** and **Footer Margin** sliders so report text does not overlap with your pre-printed stationery.\n"
      + "4. Check the live A4 preview on the right, then click **'Save Letterhead Settings'**.";
  }

  if (q.includes("machine") || q.includes("analyzer") || q.includes("connect") || q.includes("cell counter")) {
    return "To connect an automated laboratory analyzer or cell counter:\n\n"
      + "1. Go to **Dashboard > Settings > Machine Integration**: [Open Machine Integration](/dashboard/settings?tab=machine-integration).\n"
      + "2. Connect your analyzer to the PC via Serial RS232 cable or LAN (TCP/IP).\n"
      + "3. Click **'+ Add Machine'**, enter the machine name, model, and communication protocol (ASTM/HL7).\n"
      + "4. Launch the **OnePath Machine Bridge** (`START_MACHINE_BRIDGE.bat`) on your lab PC.\n"
      + "5. Run tests on the analyzer using the patient PID/Barcode. Readings will stream automatically into Result Entry!";
  }

  if (q.includes("test") || q.includes("rate") || q.includes("price") || q.includes("interpretation")) {
    return "To manage tests, rates, and clinical interpretations:\n\n"
      + "1. Go to **Dashboard > Tests**: [Open Test Master](/dashboard/tests).\n"
      + "2. Click **'+ Add Test'** to create a test, or click the **Edit (Pencil)** icon to modify an existing test.\n"
      + "3. Update the test price, units, and reference ranges.\n"
      + "4. Click **'Interpretation'** at the bottom to use **'✨ AI Generate Interpretation'** for automated clinical reference tables.\n"
      + "5. For health packages, visit [Open Health Packages](/dashboard/tests/packages), and for B2B pricing, visit [Open Rate List](/dashboard/ratelist).";
  }

  if (q.includes("b2b") || q.includes("center") || q.includes("branch") || q.includes("wallet")) {
    return "To manage Collection Centers and B2B Branches:\n\n"
      + "1. Go to **Settings > Collection Centers**: [Open Collection Centers](/dashboard/settings?tab=collection-centers).\n"
      + "2. Create a collection branch, set their commission percentage, and assign login credentials.\n"
      + "3. Collection centers can log in and register samples for their center.\n"
      + "4. View B2B sales in [Open B2B Sales](/dashboard/b2b) and manage prepaid balances in [Open B2B Wallets](/dashboard/b2b/wallets).";
  }

  return "Welcome to the OnePath LIS Assistant! I can guide you step-by-step through any feature or setting in OnePath LIS:\n\n"
    + "- [Open Patient Registration](/dashboard/patients/register): Register patients and book samples\n"
    + "- [Open Reports Management](/dashboard/reports): Enter test results and print reports\n"
    + "- [Open Test Master](/dashboard/tests): Configure tests, prices, and interpretations\n"
    + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Upload letterhead and set print margins\n"
    + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): Connect automated analyzers";
}
