"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Lock, Mail, Loader2, FlaskConical, ShieldCheck,
  Eye, EyeOff, ArrowRight, Microscope, Activity, Beaker,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError(null);
    setLoading(true);

    try {
      const apiURL = process.env.NEXT_PUBLIC_API_URL || "https://api.onepathlab.com/api/lis";
      const loginURL = apiURL.replace(/\/api\/lis\/?$/, "/api/auth/login");

      const res = await fetch(loginURL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials.");
        setLoading(false);
        return;
      }

      const token = data.access_token || data.token;
      const user = data.user;

      localStorage.setItem("lis_token", token);
      localStorage.setItem("lis_user", JSON.stringify(user));
      document.cookie = `lis_token=${token}; path=/; max-age=86400; SameSite=Lax; Secure`;

      router.push("/dashboard");
      router.refresh();

      if (!user.lab_id) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden w-full">
      {/* ── Left: editorial brand panel ───────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-14 gradient-primary">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-28 -right-24 w-[420px] h-[420px] rounded-full bg-[hsl(40_78%_60%/0.18)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/12 border border-white/20 backdrop-blur-sm">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div className="leading-none">
            <p className="font-display text-xl font-semibold text-white tracking-tight">OnePath</p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/55 mt-1">Laboratory</p>
          </div>
        </div>

        <div className="relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-[11px] font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(40_80%_62%)]" />
            All diagnostic nodes operational
          </div>
          <h1 className="font-display text-[2.9rem] leading-[1.05] font-light text-white">
            Precision diagnostics,<br />
            <span className="italic text-[hsl(40_80%_72%)]">elegantly</span> orchestrated.
          </h1>
          <p className="text-white/55 text-[15px] leading-relaxed max-w-md">
            Patient intake, result authoring, billing and clinical analytics — one refined workspace for the modern pathology lab.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            {[
              { icon: Microscope, label: "Result Authoring" },
              { icon: Activity, label: "Live Analytics" },
              { icon: Beaker, label: "Multi-panel Tests" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/8 border border-white/10 text-white/75 text-xs font-medium">
                <Icon className="h-3.5 w-3.5 text-[hsl(40_80%_70%)]" /> {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-white/40 text-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          HIPAA compliant · Multi-tenant · End-to-end encrypted
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-apothecary">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[400px] animate-fade-in">
            <div className="flex lg:hidden items-center gap-3 mb-10">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground tracking-tight">OnePath Lab</span>
            </div>

            <div className="mb-8">
              <h2 className="font-display text-[2rem] font-normal text-foreground leading-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Sign in to your laboratory workspace</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-[13px] font-semibold text-foreground/80">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    disabled={loading} required placeholder="pathologist@lab.org"
                    className="flex h-11 w-full rounded-lg border border-border bg-card/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-card hover:border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-[13px] font-semibold text-foreground/80">Password</label>
                  <a href="#" className="text-xs font-medium text-primary hover:text-secondary transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                  <input
                    id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={loading} required placeholder="••••••••••"
                    className="flex h-11 w-full rounded-lg border border-border bg-card/60 pl-10 pr-11 text-sm placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-card hover:border-border"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 accent-[hsl(160_58%_27%)]" />
                <span className="text-xs text-muted-foreground">Remember this device for 30 days</span>
              </label>

              <button type="submit" disabled={loading}
                className="w-full h-11 gradient-primary text-primary-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all duration-200 ring-inset-top hover:-translate-y-px hover:shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)] active:scale-[0.99] disabled:opacity-60">
                {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>) : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>

            <div className="mt-7 flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/60">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Authorized medical personnel only. Session activity is monitored for HIPAA compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="px-10 py-5 flex items-center justify-between text-xs text-muted-foreground/60">
          <span className="font-mono">v1.0.4</span>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}