"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2, IndianRupee, Banknote, QrCode,
  Calendar, AlertCircle, Loader2
} from "lucide-react";
import { fetchFromLaravel, markApiCacheStale } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { getTodayStr } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AcceptDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onSuccess: (updatedBill: any) => void;
}

export function AcceptDueModal({ isOpen, onClose, bill, onSuccess }: AcceptDueModalProps) {
  const toast = useToast();
  const [amount, setAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [paymentDate, setPaymentDate] = useState<string>(getTodayStr());
  const [settleAsPaid, setSettleAsPaid] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const total = Number(bill?.total || 0);
  const discount = Number(bill?.discount || 0);
  const netTotal = Math.max(0, total - discount);
  const paidAmount = Number(bill?.paid_amount ?? bill?.paidAmount ?? 0);
  const dueAmount = Math.max(0, netTotal - paidAmount);

  useEffect(() => {
    if (isOpen && bill) {
      setAmount(dueAmount > 0 ? String(dueAmount) : "");
      setSettleAsPaid(true);
      setPaymentMode("CASH");
      setPaymentDate(getTodayStr());
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, bill, dueAmount]);

  if (!isOpen || !bill) return null;

  const patientName =
    bill.patient?.name ||
    bill.patientName ||
    "Patient";
  const regNo =
    bill.patient?.custom_id ||
    bill.patient?.customId ||
    bill.custom_id ||
    bill.customId ||
    "N/A";
  const doctorName =
    bill.patient?.ref_doctor ||
    bill.patient?.refDoctor ||
    "Self";

  const collectNum = parseFloat(amount || "0");
  const isPartial = collectNum > 0 && collectNum < dueAmount - 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(collectNum) || collectNum <= 0) {
      setError("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (collectNum > dueAmount + 0.01) {
      setError(`Amount cannot exceed the total outstanding due of ₹${dueAmount.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const shouldSettle = !isPartial ? true : settleAsPaid;

    try {
      const res = await fetchFromLaravel(`/bills/${bill.id}/collect-due`, {
        method: "POST",
        body: JSON.stringify({
          amount: collectNum,
          payment_mode: paymentMode,
          payment_date: paymentDate,
          settle_as_paid: shouldSettle,
        }),
      });

      if (res && (res.status === "success" || res.bill || res.id)) {
        const waivedAmount = Number(res.waived_amount || 0);
        const waivedMsg = waivedAmount > 0 ? ` (₹${waivedAmount.toFixed(2)} waived as discount waiver)` : "";
        toast.success(
          shouldSettle ? "Invoice Settled & Paid" : "Payment Received",
          `Due payment of ₹${collectNum.toFixed(2)} recorded for ${patientName}${waivedMsg}.`
        );
        markApiCacheStale("/bills");
        onSuccess(res.bill || res);
        onClose();
      } else {
        throw new Error(res?.message || "Failed to record payment.");
      }
    } catch (err: any) {
      console.error("Collect due error:", err);
      setError(err?.message || "Failed to record due payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4.5 border-b border-border/80 bg-muted/20 pr-12">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <IndianRupee className="w-4 h-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Accept Due Payment
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Collect outstanding balance and update invoice settlement
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Patient Card Summary */}
          <div className="p-4 rounded-xl border border-border/70 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{patientName}</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                  Reg: {regNo}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Ref By: {doctorName}</p>
            </div>
            <div className="text-left sm:text-right sm:border-l sm:border-border/60 sm:pl-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">
                Outstanding Due
              </p>
              <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                ₹{dueAmount.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Total ₹{netTotal.toFixed(2)} · Paid ₹{paidAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="collect-amount" className="text-xs font-semibold text-foreground">
                Amount to Collect (₹) <span className="text-destructive">*</span>
              </label>
              {dueAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(String(dueAmount));
                    setSettleAsPaid(true);
                  }}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Pay Full (₹{dueAmount.toFixed(2)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold">
                ₹
              </span>
              <input
                id="collect-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={dueAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Settle As Paid Settlement Toggle for Custom / Partial Amounts */}
            {isPartial && (
              <div className="mt-2.5 flex items-start gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 transition-all">
                <input
                  type="checkbox"
                  id="settle-as-paid"
                  checked={settleAsPaid}
                  onChange={(e) => setSettleAsPaid(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <label htmlFor="settle-as-paid" className="text-xs select-none cursor-pointer space-y-0.5">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                    Settle Bill as Fully Paid (Remove from Dues)
                  </span>
                  <span className="text-[11px] text-muted-foreground block leading-normal">
                    {settleAsPaid
                      ? `Accept ₹${collectNum.toFixed(2)} as final payment. Remaining ₹${(dueAmount - collectNum).toFixed(2)} will be settled as discount waiver and bill marked as PAID.`
                      : `Keep remaining ₹${(dueAmount - collectNum).toFixed(2)} pending as partial due.`}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Payment Mode Selection (Cash & UPI only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "CASH", label: "Cash", icon: Banknote },
                { id: "UPI", label: "UPI", icon: QrCode },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = paymentMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMode(id)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <label htmlFor="payment-date" className="text-xs font-semibold text-foreground">
              Payment Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || dueAmount <= 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {!isPartial || settleAsPaid
                      ? `Accept ₹${Number(amount || 0).toFixed(2)} & Settle Paid`
                      : `Accept Partial ₹${Number(amount || 0).toFixed(2)}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
