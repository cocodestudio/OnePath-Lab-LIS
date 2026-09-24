"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Activity, CheckCircle2, ShieldCheck } from "lucide-react";

interface AiReportGenerationModalProps {
  isOpen: boolean;
  patientName?: string;
  customId?: string;
  onComplete: () => void;
}

const GENERATION_STEPS = [
  { progress: 15, text: "Extracting Biochemical Parameters & Quantitative Results..." },
  { progress: 42, text: "Correlating Age & Gender Biological Reference Intervals..." },
  { progress: 70, text: "Synthesizing 6 Vital Organ Health Scores & Risk Matrix..." },
  { progress: 90, text: "Formulating Clinical Impressions & Visual Range Graphs..." },
  { progress: 100, text: "Finalizing Smart Report Dossier · Opening..." },
];

export function AiReportGenerationModal({
  isOpen,
  patientName,
  customId,
  onComplete,
}: AiReportGenerationModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setProgress(10);
      return;
    }

    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgress(42);
    }, 380);

    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgress(70);
    }, 780);

    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgress(90);
    }, 1200);

    const t4 = setTimeout(() => {
      setCurrentStepIndex(4);
      setProgress(100);
    }, 1550);

    const t5 = setTimeout(() => {
      onComplete();
    }, 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const currentStep = GENERATION_STEPS[currentStepIndex] || GENERATION_STEPS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Glow backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-600/30 to-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[460px] p-7 sm:p-8 rounded-3xl bg-zinc-900/95 border border-indigo-500/40 shadow-2xl text-center flex flex-col items-center overflow-hidden">
        {/* Top Shimmer Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500" />

        {/* AI Glowing Orb Animation */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Pulsing Ring */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/25 via-indigo-500/20 to-purple-500/25 animate-ping opacity-60 pointer-events-none" />
          
          {/* Rotating Gradient Spinner */}
          <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 border-t-cyan-400 border-r-indigo-400 animate-spin" />
          
          {/* Inner Glowing Core */}
          <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Sparkles className="h-7 w-7 text-amber-300 animate-pulse" />
          </div>
        </div>

        {/* Heading & Details */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>OnePath AI Clinical Intelligence</span>
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight pt-1">
            Synthesizing Smart Report
          </h3>

          <p className="text-xs text-zinc-400">
            {patientName ? (
              <span>
                Generating patient dossier for <strong className="text-zinc-200">{patientName}</strong>
                {customId ? ` (${customId})` : ""}
              </span>
            ) : (
              "Synthesizing high-precision multi-page visual lab dossier..."
            )}
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold">
            <span className="text-zinc-400">Processing Biomarkers</span>
            <span className="text-cyan-400">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/60 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 transition-all duration-300 shadow-sm shadow-cyan-400/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Live Step */}
        <div className="w-full px-3 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center gap-2.5 text-left text-xs text-zinc-300 shadow-inner">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="truncate font-medium">{currentStep.text}</span>
        </div>

        {/* Trust Badge */}
        <div className="mt-5 flex items-center gap-1.5 text-[10.5px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Clinical Correlation · Zero Data Loss · Vector Precision</span>
        </div>
      </div>
    </div>
  );
}
