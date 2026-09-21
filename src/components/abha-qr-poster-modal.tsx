"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { fetchFromLaravel, getStoredUser } from "@/lib/api-client";

interface AbhaQrPosterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbhaQrPosterModal({ open, onOpenChange }: AbhaQrPosterModalProps) {
  const [lab, setLab] = useState<any>(null);

  useEffect(() => {
    if (open) {
      const user = getStoredUser();
      fetchFromLaravel("/lab")
        .then((res) => {
          if (res) {
            setLab(res);
          } else if (user?.lab) {
            setLab(user.lab);
          }
        })
        .catch(() => {
          if (user?.lab) setLab(user.lab);
        });
    }
  }, [open]);

  const labName =
    lab?.centreName ||
    lab?.centre_name ||
    lab?.name ||
    getStoredUser()?.labName ||
    getStoredUser()?.lab_name ||
    "OnePath Diagnostic Centre";

  // Official National Health Authority (NHA) Ayushman Bharat Registration Portal
  const abhaRegistrationUrl = "https://abha.abdm.gov.in/abha/v3/register";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] sm:max-w-md w-[92vw] p-5 sm:p-7 rounded-2xl bg-card border border-border/80 shadow-2xl text-center space-y-4">
        {/* Lab Name & Subtitle */}
        <DialogHeader className="space-y-1 text-center sm:text-center">
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {labName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium">
            Scan to Create Ayushman Bharat (ABHA) ID
          </p>
        </DialogHeader>

        {/* Crisp, Centered QR Code */}
        <div className="flex justify-center my-1">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-center">
            <QRCodeSVG
              value={abhaRegistrationUrl}
              size={210}
              level="H"
              includeMargin={false}
              fgColor="#0f172a"
            />
          </div>
        </div>

        {/* Short & Clean Instructions */}
        <div className="space-y-2 text-left bg-muted/40 border border-border/60 rounded-xl p-3 sm:p-3.5 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span className="leading-snug">
              Scan this QR using your phone camera or any UPI app (GPay, PhonePe, Paytm).
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span className="leading-snug">
              Enter your Aadhaar number &amp; OTP on the official portal to create your 14-digit ABHA.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <span className="leading-snug">
              Share your ABHA address at the reception desk for instant registration.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
