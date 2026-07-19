"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, MapPin, ArrowRight, Loader2, AlertCircle, FlaskConical, ShieldCheck } from "lucide-react";
import { fetchFromLaravel, getStoredUser, updateStoredUser } from "@/lib/api-client";

export default function OnboardingPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const user = getStoredUser();
        if (!user) {
            router.replace("/login");
            return;
        }
        if (user.lab_id) {
            // Lab already set up — no need to be here
            router.replace("/dashboard");
            return;
        }
        setEmail(user.email || "");
        setName(user.lab_name || "");
        setChecking(false);
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim() || !email.trim() || !address.trim()) {
            setError("Please fill in all fields to continue.");
            return;
        }

        setLoading(true);
        try {
            const lab = await fetchFromLaravel("/lab", {
                method: "POST",
                body: JSON.stringify({ name: name.trim(), email: email.trim(), address: address.trim() }),
            });

            updateStoredUser({ lab_id: lab.id, lab_name: lab.name });
            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Failed to set up your lab. Please try again.");
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-apothecary">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-apothecary p-6">
            <div className="w-full max-w-lg">
                <div className="bg-card border border-border rounded-2xl shadow-elevated overflow-hidden">
                    <div className="gradient-primary px-8 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm mb-4">
                            <FlaskConical className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="font-display text-2xl font-semibold text-white">Set Up Your Laboratory</h1>
                        <p className="text-white/70 text-sm mt-2 max-w-sm mx-auto">
                            One last step before you can start managing patients, reports, and billing.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-5">
                        {error && (
                            <div className="flex items-center gap-3 rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-foreground/80">Laboratory Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                                <input
                                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                                    disabled={loading} required placeholder="e.g. Apex Diagnostics Lab"
                                    className="flex h-11 w-full rounded-lg border border-border bg-card/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-card"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-foreground/80">Lab Contact Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                                <input
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading} required placeholder="lab@example.com"
                                    className="flex h-11 w-full rounded-lg border border-border bg-card/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-card"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-foreground/80">Laboratory Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                                <textarea
                                    value={address} onChange={(e) => setAddress(e.target.value)}
                                    disabled={loading} required rows={3} placeholder="Full address of your lab"
                                    className="flex w-full rounded-lg border border-border bg-card/60 pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-card resize-none"
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full h-11 gradient-primary text-primary-foreground font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-px active:scale-[0.99] disabled:opacity-60">
                            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</>) : (<>Complete Setup <ArrowRight className="h-4 w-4" /></>)}
                        </button>

                        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/50 border border-border/60">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                This is a one-time step. Once completed, a starter test catalog (CBC, LFT, KFT, Thyroid, and more) will be added automatically for your lab.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}