"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle2, Smartphone, QrCode } from "lucide-react";
import { fetchFromLaravel } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

interface WhatsAppQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function WhatsAppQrDialog({ open, onOpenChange, onConnected }: WhatsAppQrDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchQr = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await fetchFromLaravel("/whatsapp/status", { skipCache: true });
      if (statusRes?.is_connected) {
        setIsConnected(true);
        setLoading(false);
        if (onConnected) onConnected();
        return;
      }

      const qrRes = await fetchFromLaravel("/whatsapp/qr", { skipCache: true });
      if (qrRes?.qr) {
        setQrCode(qrRes.qr);
      }
    } catch (err) {
      console.error("Failed to load QR code:", err);
      toast.error("Error", "Could not fetch WhatsApp QR code.");
    } finally {
      setLoading(false);
    }
  }, [onConnected, toast]);

  useEffect(() => {
    if (open) {
      setIsConnected(false);
      fetchQr();
    }
  }, [open, fetchQr]);

  // Polling while open to detect connection
  useEffect(() => {
    if (!open || isConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchFromLaravel("/whatsapp/status", { skipCache: true });
        if (res?.is_connected) {
          setIsConnected(true);
          toast.success("Connected!", "WhatsApp successfully linked!");
          if (onConnected) onConnected();
          setTimeout(() => onOpenChange(false), 1500);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [open, isConnected, onConnected, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1 text-center items-center">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
            <QrCode className="h-5 w-5" />
          </div>
          <DialogTitle className="font-bold text-lg text-foreground">Link WhatsApp Account</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Scan with your WhatsApp mobile app to enable instant report dispatch
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          {isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-emerald-600 animate-fade-in">
              <CheckCircle2 className="h-16 w-16" />
              <p className="font-bold text-sm">WhatsApp Linked Successfully!</p>
            </div>
          ) : loading ? (
            <div className="h-52 w-52 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold">Generating QR Code...</span>
            </div>
          ) : qrCode ? (
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-emerald-500/20">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-52 h-52 object-contain" />
            </div>
          ) : (
            <div className="h-52 w-52 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center px-4">
              <p className="text-xs">QR code expired or unavailable.</p>
              <Button size="sm" variant="outline" onClick={fetchQr} className="rounded-xl text-xs">
                Retry
              </Button>
            </div>
          )}

          {!isConnected && (
            <div className="text-center space-y-1 px-4">
              <p className="text-[11.5px] text-muted-foreground leading-snug">
                Go to <strong>WhatsApp &gt; Linked Devices &gt; Link a Device</strong> and scan this code.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchQr}
              disabled={loading || isConnected}
              className="flex-1 rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh QR</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
