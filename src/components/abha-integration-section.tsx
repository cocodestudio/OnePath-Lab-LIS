"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  TrendingUp,
  FileText,
  RefreshCw,
  Sparkles,
  Unlink,
  Copy,
  Check,
  HelpCircle,
  Info,
  Calendar,
  ArrowUpRight,
  Shield,
  Layers,
  Edit3,
  UserCheck,
  Smartphone,
  Lock,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  MapPin,
  Fingerprint,
  Upload,
  Image as ImageIcon,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchFromLaravel } from "@/lib/api-client";

export interface AbhaDhisMetrics {
  current_month_linked_reports: number;
  total_linked_reports: number;
  current_month_abha_patients: number;
  total_abha_patients: number;
  dhis_rate_per_report: number;
  dhis_monthly_threshold: number;
  threshold_progress_percent: number;
  current_month_incentive_inr: number;
  total_incentive_inr: number;
  dhis_qualification_status: "QUALIFIED" | "ACCUMULATING";
}

export interface AbhaRecentReport {
  id: string;
  patient_id?: string;
  custom_id: string;
  package_name?: string;
  abdm_status: string;
  abdm_care_context_id?: string;
  abdm_synced_at?: string;
  abdm_error?: string;
  created_at: string;
  patient?: {
    id: string;
    name: string;
    custom_id?: string;
    abha_number?: string;
    abha_address?: string;
    phone?: string;
  };
}

export interface AbhaDhisSummaryResponse {
  lab_id: string;
  lab_name: string;
  hfr_id?: string | null;
  hpr_id?: string | null;
  hpr_name?: string | null;
  hfr_facility_name?: string | null;
  abdm_settings?: any;
  is_hfr_linked: boolean;
  is_onboarded: boolean;
  current_month_name: string;
  metrics: AbhaDhisMetrics;
  recent_reports: AbhaRecentReport[];
}

interface AbhaIntegrationSectionProps {
  onHfrUpdated?: (hfrId: string | null, facilityName: string | null) => void;
}

export function AbhaIntegrationSection({ onHfrUpdated }: AbhaIntegrationSectionProps) {
  const [summary, setSummary] = useState<AbhaDhisSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLinkExistingModalOpen, setIsLinkExistingModalOpen] = useState(false);

  // -------------------------------------------------------------------
  // ABDM HEALTH FACILITY REGISTRY (HFR) ONBOARDING STATE
  // Step 1: In-Charge Aadhaar e-KYC Auth
  // Step 2: OTP Verification
  // Step 3: Add Facility Details & Verification Photos
  // Step 4: Official HFR ID Generated & Linked (Slide 13)
  // -------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [facilitySubTab, setFacilitySubTab] = useState<"create" | "list">("create");

  // Step 1: Aadhaar (3 boxes of 4 digits)
  const [aadhaarBox1, setAadhaarBox1] = useState("");
  const [aadhaarBox2, setAadhaarBox2] = useState("");
  const [aadhaarBox3, setAadhaarBox3] = useState("");
  const [aadhaarAgreed, setAadhaarAgreed] = useState(true);
  const [isSendingAadhaarOtp, setIsSendingAadhaarOtp] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);

  // Step 2: OTP Verification
  const [otpBoxes, setOtpBoxes] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState<number>(42);
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("******4129");
  const [txnId, setTxnId] = useState<string>("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // In-charge representation
  const [fullName, setFullName] = useState("");
  const [hprUsername, setHprUsername] = useState("");
  const [practiceType, setPracticeType] = useState("Modern Medicine");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingHpr, setIsCreatingHpr] = useState(false);
  const [registeredHprId, setRegisteredHprId] = useState("");

  // Step 3: Facility Photos
  const [buildingPhoto, setBuildingPhoto] = useState<string | null>(null);
  const [boardPhoto, setBoardPhoto] = useState<string | null>(null);

  // Step 3: Facility Details
  const [facilityName, setFacilityName] = useState("");
  const [facilityPincode, setFacilityPincode] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityMedicineType, setFacilityMedicineType] = useState("Modern Medicine(Allopathy)");
  const [facilityType, setFacilityType] = useState("Diagnostic Laboratory");
  const [isSubmittingFacility, setIsSubmittingFacility] = useState(false);
  const [registeredHfrId, setRegisteredHfrId] = useState("");

  // -------------------------------------------------------------------
  // LINK EXISTING HFR VIA AADHAAR AUTH STATE
  // Step 1: In-Charge Aadhaar Auth (12 digits)
  // Step 2: OTP Verification & Search on ABDM Registry
  // Step 3_found: Display Registered Facility & Link button
  // Step 3_not_found: Alert "No Registered Facility Found" with prompt to Onboard
  // -------------------------------------------------------------------
  const [linkStep, setLinkStep] = useState<"1" | "2" | "3_found" | "3_not_found">("1");
  const [linkAadhaar1, setLinkAadhaar1] = useState("");
  const [linkAadhaar2, setLinkAadhaar2] = useState("");
  const [linkAadhaar3, setLinkAadhaar3] = useState("");
  const [linkOtpBoxes, setLinkOtpBoxes] = useState<string[]>(["", "", "", "", "", ""]);
  const [linkTxnId, setLinkTxnId] = useState("");
  const [linkMaskedPhone, setLinkMaskedPhone] = useState("");
  const [linkResendTimer, setLinkResendTimer] = useState(45);
  const [isSendingLinkOtp, setIsSendingLinkOtp] = useState(false);
  const [isSearchingFacilities, setIsSearchingFacilities] = useState(false);
  const [isLinkingFacility, setIsLinkingFacility] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [discoveredFacilities, setDiscoveredFacilities] = useState<any[]>([]);
  const [verifiedOwnerName, setVerifiedOwnerName] = useState("");

  // Copy helper
  const [copiedHfr, setCopiedHfr] = useState(false);

  // Timer for Onboarding OTP resend
  useEffect(() => {
    let timer: any;
    if (isOnboardModalOpen && currentStep === 2 && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOnboardModalOpen, currentStep, resendTimer]);

  // Timer for Link Existing HFR OTP resend
  useEffect(() => {
    let timer: any;
    if (isLinkExistingModalOpen && linkStep === "2" && linkResendTimer > 0) {
      timer = setInterval(() => setLinkResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isLinkExistingModalOpen, linkStep, linkResendTimer]);

  useEffect(() => {
    loadDhisSummary();
  }, []);

  const loadDhisSummary = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await fetchFromLaravel<AbhaDhisSummaryResponse>("/abha/dhis-summary");
      if (res) {
        setSummary(res);
        setFacilityName(res.lab_name || "Diagnostic Laboratory");
        if (res.hpr_id) {
          setRegisteredHprId(res.hpr_id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load ABDM DHIS summary:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Start Onboard wizard (Step 2: Enter Aadhaar as per Slide 5)
  const handleStartOnboarding = () => {
    setStepError(null);
    setCurrentStep(2); // STEP 2 OF 8
    setFacilitySubTab("create");
    setAadhaarBox1("");
    setAadhaarBox2("");
    setAadhaarBox3("");
    setOtpBoxes(["", "", "", "", "", ""]);
    setResendTimer(45);
    setIsSandboxMode(false);
    setIsOnboardModalOpen(true);
  };

  // STEP 2 -> STEP 3: Send Aadhaar OTP (Slide 5 -> Slide 6)
  const handleSendAadhaarOtp = async () => {
    setStepError(null);
    const fullAadhaar = `${aadhaarBox1}${aadhaarBox2}${aadhaarBox3}`.replace(/\D/g, "");
    if (fullAadhaar.length !== 12) {
      setStepError("Please enter a valid 12-digit Aadhaar number across the 3 boxes.");
      return;
    }

    try {
      setIsSendingAadhaarOtp(true);
      const res = await fetchFromLaravel<any>("/abha/generate-otp", {
        method: "POST",
        body: JSON.stringify({
          aadhaar_number: fullAadhaar,
          auth_mode: "AADHAAR_OTP",
        }),
      });

      if (res && res.txn_id) {
        setTxnId(res.txn_id);
        if (res.masked_mobile) {
          setMaskedPhone(res.masked_mobile);
        }
        if (res.is_sandbox || String(res.txn_id).startsWith("SANDBOX_TXN_")) {
          setIsSandboxMode(true);
        }
        setResendTimer(45);
        setCurrentStep(3); // Go to STEP 3 OF 8: Verify OTP
      } else {
        setStepError(res?.message || "Failed to dispatch Aadhaar OTP.");
      }
    } catch (err: any) {
      setStepError(err?.message || "Error communicating with ABDM Gateway.");
    } finally {
      setIsSendingAadhaarOtp(false);
    }
  };

  // STEP 3 -> STEP 4: Verify OTP & Proceed to HPR ID Setup (Slide 6 -> Slide 7)
  const handleVerifyOtp = async () => {
    setStepError(null);
    const enteredOtp = otpBoxes.join("").trim();
    if (enteredOtp.length < 4) {
      setStepError("Please enter the complete 6-digit OTP received on mobile.");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      const res = await fetchFromLaravel<any>("/abha/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          txn_id: txnId,
          otp: enteredOtp,
          mobile: phoneInput.trim() || undefined,
        }),
      });

      if (res && (res.is_verified || res.status === "success")) {
        const pData = res.patient_data || {};
        const name = pData.name || summary?.lab_name || "Shivam";
        setFullName(name);
        const cleanUser = name.toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(1000 + Math.random() * 9000);
        setHprUsername(cleanUser);
        const autoHpr = cleanUser + "@hpr.abdm";
        setRegisteredHprId(autoHpr);
        if (pData.email) setEmailInput(pData.email);
        else setEmailInput(`${cleanUser}@gmail.com`);
        if (pData.pincode && !facilityPincode) setFacilityPincode(pData.pincode);
        if (pData.address && !facilityAddress) setFacilityAddress(pData.address);

        if (!facilityName && summary?.lab_name) {
          setFacilityName(summary.lab_name);
        }

        setCurrentStep(4); // Go to STEP 4 OF 8: Setup your HPR ID
      } else {
        setStepError(res?.message || "Invalid OTP. Please enter the 6-digit OTP received on your mobile.");
      }
    } catch (err: any) {
      setStepError(err?.message || "Verification failed on ABDM Gateway.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // STEP 4 -> STEP 5: Create HPR ID (Slide 7 -> Slide 8)
  const handleCreateHpr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStepError(null);

    if (!fullName.trim()) {
      setStepError("Please enter your Full Name.");
      return;
    }
    if (!hprUsername.trim()) {
      setStepError("Please select an available HPR ID.");
      return;
    }

    const cleanUsername = hprUsername.trim().replace(/@hpr\.abdm$/, "");
    const fullHprId = `${cleanUsername}@hpr.abdm`;

    try {
      setIsCreatingHpr(true);
      const res = await fetchFromLaravel<any>("/abha/hpr/create", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          hpr_id: fullHprId,
          practice_type: practiceType,
          email: emailInput.trim() || `${cleanUsername}@domain.com`,
          password: passwordInput.trim() || "Abdm@Pass2026",
          txn_id: txnId,
        }),
      });

      if (res && (res.status === "success" || res.hpr_id)) {
        setRegisteredHprId(res.hpr_id || fullHprId);
        setCurrentStep(5); // Go to STEP 5 OF 8: HPR ID created
      } else {
        setStepError(res?.message || "Failed to create HPR ID on ABDM Gateway.");
      }
    } catch (err: any) {
      setStepError(err?.message || "Gateway error during HPR creation.");
    } finally {
      setIsCreatingHpr(false);
    }
  };

  // STEP 5 -> STEP 6: Continue to HFR (Slide 8 -> Slide 10)
  const handleContinueToHfr = () => {
    setStepError(null);
    setCurrentStep(6); // Go to STEP 6 OF 8: Add facility & photos
  };

  // STEP 6 -> STEP 7: Photos uploaded -> Enter facility details (Slide 10 -> Slide 11)
  const handleContinueToFacilityDetails = () => {
    setStepError(null);
    setCurrentStep(7); // Go to STEP 7 OF 8: Enter facility details
  };

  // STEP 7 -> STEP 8: Facility details entered -> Select facility type (Slide 11 -> Slide 12)
  const handleContinueToFacilityType = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStepError(null);

    if (!facilityName.trim()) {
      setStepError("Please enter your Facility Name.");
      return;
    }
    if (!facilityPincode.trim() || facilityPincode.replace(/\D/g, "").length !== 6) {
      setStepError("Please enter a valid 6-digit Facility Pincode.");
      return;
    }
    if (!facilityAddress.trim()) {
      setStepError("Please enter your lab's full Facility Address.");
      return;
    }

    setCurrentStep(8); // Go to STEP 8 OF 8: Select facility type
  };

  // Upload file helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "building" | "board") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStepError("File size must be under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (type === "building") setBuildingPhoto(b64);
      else setBoardPhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  // STEP 8 -> STEP 9: Complete Facility Onboarding on ABDM Gateway (Slide 12 -> Slide 13)
  const handleCompleteFacilityOnboarding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStepError(null);

    if (!facilityName.trim()) {
      setStepError("Please enter your Diagnostic Laboratory / Facility Name.");
      return;
    }
    if (!facilityPincode.trim() || facilityPincode.replace(/\D/g, "").length !== 6) {
      setStepError("Please enter a valid 6-digit Facility Pincode.");
      return;
    }
    if (!facilityAddress.trim()) {
      setStepError("Please enter your Lab's full Facility Address.");
      return;
    }

    try {
      setIsSubmittingFacility(true);
      const res = await fetchFromLaravel<any>("/abha/onboard-facility", {
        method: "POST",
        body: JSON.stringify({
          facility_name: facilityName.trim(),
          facility_pincode: facilityPincode.trim(),
          facility_address: facilityAddress.trim(),
          facility_medicine_type: facilityMedicineType,
          facility_type: facilityType,
          hpr_id: registeredHprId,
          hpr_name: fullName,
          building_image: buildingPhoto || undefined,
          board_image: boardPhoto || undefined,
          txn_id: txnId,
        }),
      });

      if (res && res.status === "success") {
        setRegisteredHfrId(res.hfr_id);
        setCurrentStep(9); // Show official Slide 13 "You're Onboarded" screen!
        await loadDhisSummary();
        onHfrUpdated?.(res.hfr_id, facilityName.trim());
      } else {
        setStepError(res?.message || "Failed to register health facility on ABDM.");
      }
    } catch (err: any) {
      setStepError(err?.message || "Server error registering facility on ABDM.");
    } finally {
      setIsSubmittingFacility(false);
    }
  };

  // Open Link Existing HFR modal
  const handleOpenLinkModal = () => {
    setLinkStep("1");
    setLinkAadhaar1("");
    setLinkAadhaar2("");
    setLinkAadhaar3("");
    setLinkOtpBoxes(["", "", "", "", "", ""]);
    setLinkTxnId("");
    setLinkMaskedPhone("");
    setLinkResendTimer(45);
    setLinkError(null);
    setDiscoveredFacilities([]);
    setVerifiedOwnerName("");
    setIsLinkExistingModalOpen(true);
  };

  // Step 1 -> Step 2: Send Aadhaar OTP for Facility Link Verification
  const handleSendLinkOtp = async () => {
    setLinkError(null);
    const fullAadhaar = `${linkAadhaar1}${linkAadhaar2}${linkAadhaar3}`.replace(/\D/g, "");
    if (fullAadhaar.length !== 12) {
      setLinkError("Please enter a valid 12-digit Aadhaar number across the 3 boxes.");
      return;
    }

    try {
      setIsSendingLinkOtp(true);
      const res = await fetchFromLaravel<any>("/abha/generate-otp", {
        method: "POST",
        body: JSON.stringify({
          aadhaar_number: fullAadhaar,
          auth_mode: "AADHAAR_OTP",
        }),
      });

      if (res && res.txn_id) {
        setLinkTxnId(res.txn_id);
        if (res.masked_mobile) {
          setLinkMaskedPhone(res.masked_mobile);
        }
        setLinkResendTimer(45);
        setLinkStep("2");
      } else {
        setLinkError(res?.message || "Failed to dispatch Aadhaar OTP.");
      }
    } catch (err: any) {
      setLinkError(err?.message || "Error communicating with ABDM Gateway.");
    } finally {
      setIsSendingLinkOtp(false);
    }
  };

  // Step 2 -> Step 3: Verify OTP & Search ABDM Registry for Registered Facilities
  const handleVerifyAndSearchFacilities = async () => {
    setLinkError(null);
    const enteredOtp = linkOtpBoxes.join("").trim();
    if (enteredOtp.length < 4) {
      setLinkError("Please enter the 6-digit OTP received on your mobile.");
      return;
    }

    try {
      setIsSearchingFacilities(true);
      const res = await fetchFromLaravel<any>("/abha/search-registered-facilities", {
        method: "POST",
        body: JSON.stringify({
          txn_id: linkTxnId,
          otp: enteredOtp,
        }),
      });

      if (res && res.found && res.facilities && res.facilities.length > 0) {
        setDiscoveredFacilities(res.facilities);
        setVerifiedOwnerName(res.verified_name || "Authorized Representative");
        setLinkStep("3_found");
      } else {
        setVerifiedOwnerName(res?.verified_name || "Authorized Representative");
        setDiscoveredFacilities([]);
        setLinkStep("3_not_found");
      }
    } catch (err: any) {
      setLinkError(err?.message || "Failed to query ABDM registry for registered facilities.");
    } finally {
      setIsSearchingFacilities(false);
    }
  };

  // Step 3_found: Link verified facility to LIS
  const handleLinkDiscoveredFacility = async (fac: any) => {
    try {
      setIsLinkingFacility(true);
      const res = await fetchFromLaravel<any>("/abha/link-hfr", {
        method: "POST",
        body: JSON.stringify({
          hfr_id: fac.hfr_id,
          hpr_id: fac.hpr_id || undefined,
          hfr_facility_name: fac.facility_name || undefined,
        }),
      });

      if (res && res.status === "success") {
        showToast(`Facility "${fac.facility_name || fac.hfr_id}" linked successfully!`);
        setIsLinkExistingModalOpen(false);
        await loadDhisSummary();
        onHfrUpdated?.(fac.hfr_id, fac.facility_name);
      } else {
        setLinkError(res?.message || "Failed to link facility.");
      }
    } catch (err: any) {
      setLinkError(err?.message || "Error linking facility to LIS.");
    } finally {
      setIsLinkingFacility(false);
    }
  };

  // Step 3_not_found: Switch seamlessly to 8-step Onboarding with Aadhaar pre-filled
  const handleSwitchToOnboardFromLink = () => {
    setIsLinkExistingModalOpen(false);
    setAadhaarBox1(linkAadhaar1);
    setAadhaarBox2(linkAadhaar2);
    setAadhaarBox3(linkAadhaar3);
    setCurrentStep(2);
    setFacilitySubTab("create");
    setOtpBoxes(["", "", "", "", "", ""]);
    setResendTimer(45);
    setIsSandboxMode(false);
    setIsOnboardModalOpen(true);
  };

  // Unlink
  const handleUnlink = async () => {
    if (!confirm("Are you sure you want to unlink your ABDM HFR/HPR configuration?")) return;
    try {
      setIsLoading(true);
      await fetchFromLaravel("/abha/unlink-hfr", { method: "POST" });
      showToast("Unlinked ABDM configuration successfully.");
      await loadDhisSummary();
      onHfrUpdated?.(null, null);
    } catch (err: any) {
      alert("Failed to unlink: " + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isCompleteOnboarded = Boolean(summary?.is_onboarded && summary?.hfr_id);

  return (
    <div className="w-full bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 1. FLABS STYLE SETTINGS BANNER (Slide 4 & Slide 13)                    */}
      {/* ======================================================================= */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="text-xs font-bold text-foreground flex items-center gap-1">
            <span>ABHA / ABDM Integration</span>
            <span
              className="text-muted-foreground hover:text-foreground cursor-help"
              title="Onboard your diagnostics center to the Ayushman Bharat Digital Mission (NHA)"
            >
              ⓘ
            </span>
          </span>

          {isCompleteOnboarded ? (
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="h-3.5 w-3.5" />
                <span>Onboarded</span>
              </span>

              <div className="text-xs font-mono font-bold text-foreground bg-muted/70 px-3 py-1 rounded-xl border border-border/70 flex items-center gap-2">
                <span>HFR ID: <strong className="text-emerald-600 dark:text-emerald-400">{summary?.hfr_id}</strong></span>
                {summary?.hpr_id && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span>HPR ID: <strong className="text-primary">{summary.hpr_id}</strong></span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              Your lab is not yet onboarded to ABDM.
            </span>
          )}
        </div>

        {/* Buttons on the right */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isCompleteOnboarded ? (
            <>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Manage on ABDM</span>
              </button>

              <button
                type="button"
                onClick={handleUnlink}
                className="p-2 rounded-xl border border-border hover:bg-muted text-red-500 transition-all cursor-pointer"
                title="Unlink from ABDM"
              >
                <Unlink className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartOnboarding}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Onboard Health Facility (HFR)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenLinkModal}
                className="px-3.5 py-2 rounded-xl border border-border/80 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                Link Existing HFR
              </button>
            </>
          )}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. ABDM HEALTH FACILITY REGISTRY (HFR) ONBOARDING MODAL                 */}
      {/* ======================================================================= */}
      <Dialog open={isOnboardModalOpen} onOpenChange={setIsOnboardModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-6 rounded-3xl scrollbar-none border border-border/90 shadow-2xl bg-card">
          {/* Top 3-Step Stepper (Slide 5-13 of FLabs PDF: 1. HPR -> 2. HFR -> 3. DONE) */}
          <div className="border-b border-border/80 pb-4 mb-2">
            <div className="flex items-center justify-between max-w-sm mx-auto text-xs font-bold px-2">
              {/* Stepper 1: HPR */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    currentStep >= 2 && currentStep <= 5
                      ? "bg-blue-600 text-white shadow-xs ring-4 ring-blue-500/20"
                      : currentStep > 5
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > 5 ? <Check className="h-4 w-4 stroke-[3]" /> : "1"}
                </div>
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    currentStep >= 2 && currentStep <= 5
                      ? "text-blue-600 dark:text-blue-400"
                      : currentStep > 5
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  HPR
                </span>
              </div>

              {/* Connecting line 1 */}
              <div
                className={`h-0.5 flex-1 mx-3 transition-colors ${
                  currentStep > 5 ? "bg-emerald-500" : "bg-muted"
                }`}
              />

              {/* Stepper 2: HFR */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    currentStep >= 6 && currentStep <= 8
                      ? "bg-blue-600 text-white shadow-xs ring-4 ring-blue-500/20"
                      : currentStep >= 9
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep >= 9 ? <Check className="h-4 w-4 stroke-[3]" /> : "2"}
                </div>
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    currentStep >= 6 && currentStep <= 8
                      ? "text-blue-600 dark:text-blue-400"
                      : currentStep >= 9
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  HFR
                </span>
              </div>

              {/* Connecting line 2 */}
              <div
                className={`h-0.5 flex-1 mx-3 transition-colors ${
                  currentStep >= 9 ? "bg-emerald-500" : "bg-muted"
                }`}
              />

              {/* Stepper 3: DONE */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    currentStep >= 9
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-xs"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep >= 9 ? <Check className="h-4 w-4 stroke-[3]" /> : "3"}
                </div>
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    currentStep >= 9
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  DONE
                </span>
              </div>
            </div>
          </div>

          {/* Error display */}
          {stepError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 2 OF 8: ENTER YOUR AADHAAR (Slide 5 of FLabs PDF)        */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 2 && (
            <div className="space-y-5 pt-1 text-center animate-fade-in">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                Step 2 of 8
              </span>

              {/* National Emblem & Title */}
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-500/15 via-blue-500/15 to-emerald-500/15 border border-border flex items-center justify-center text-2xl shadow-2xs">
                  🏥
                </div>
                <h3 className="text-lg font-black text-foreground font-display">
                  Create your Healthcare Professional ID
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  The Healthcare Professional ID will connect you to the India's Digital Health Ecosystem
                </p>
              </div>

              {/* Aadhaar Tab */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-muted text-xs font-bold text-foreground border border-border/80 shadow-2xs">
                <span>🪪</span>
                <span>Aadhaar</span>
              </div>

              {/* 3 boxes for Aadhaar: [XXXX] [XXXX] [XXXX] */}
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    maxLength={4}
                    value={aadhaarBox1}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAadhaarBox1(val);
                      if (val.length === 4) {
                        const next = document.getElementById("aadhaar-box-2");
                        next?.focus();
                      }
                    }}
                    placeholder="XXXX"
                    className="w-full h-11 rounded-xl bg-background border border-border text-center font-mono font-black text-sm tracking-widest focus:border-blue-600 outline-none"
                  />
                  <input
                    id="aadhaar-box-2"
                    type="text"
                    maxLength={4}
                    value={aadhaarBox2}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAadhaarBox2(val);
                      if (val.length === 4) {
                        const next = document.getElementById("aadhaar-box-3");
                        next?.focus();
                      }
                    }}
                    placeholder="XXXX"
                    className="w-full h-11 rounded-xl bg-background border border-border text-center font-mono font-black text-sm tracking-widest focus:border-blue-600 outline-none"
                  />
                  <input
                    id="aadhaar-box-3"
                    type="text"
                    maxLength={4}
                    value={aadhaarBox3}
                    onChange={(e) => setAadhaarBox3(e.target.value.replace(/\D/g, ""))}
                    placeholder="XXXX"
                    className="w-full h-11 rounded-xl bg-background border border-border text-center font-mono font-black text-sm tracking-widest focus:border-blue-600 outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-left">
                  ⓘ The OTP is sent to the mobile number linked to this Aadhaar — keep that SIM with you.
                </p>

                {/* Official ABDM Gateway Connected banner */}
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 text-left flex items-start gap-2">
                  <span className="text-sm leading-none">🛡️</span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px] text-blue-900 dark:text-blue-200">
                      Official ABDM Gateway Connected
                    </p>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                      National Health Authority (NHA) certified bridge. An OTP will be dispatched to your Aadhaar-registered mobile number.
                    </p>
                  </div>
                </div>
              </div>

              {/* T&C Notice */}
              <div className="text-[11px] text-muted-foreground">
                By proceeding, you agree to <span className="underline font-bold text-foreground cursor-pointer">T&C</span>
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleSendAadhaarOtp}
                disabled={isSendingAadhaarOtp || (aadhaarBox1.length + aadhaarBox2.length + aadhaarBox3.length) !== 12}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingAadhaarOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{isSendingAadhaarOtp ? "Sending OTP via Gateway..." : "Continue"}</span>
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 3 OF 8: VERIFY THE OTP (Slide 6 of FLabs PDF)           */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 3 && (
            <div className="space-y-5 pt-1 animate-fade-in">
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 3 of 8
                </span>
              </div>

              <div className="space-y-1 text-center">
                <h3 className="text-lg font-black text-foreground font-display">
                  Verify OTP
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Enter the OTP received on your phone number - <strong className="text-foreground">{maskedPhone}</strong>
                </p>
              </div>

              {/* 6 OTP Boxes */}
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
                  {otpBoxes.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-box-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const newBoxes = [...otpBoxes];
                        newBoxes[idx] = val;
                        setOtpBoxes(newBoxes);
                        if (val && idx < 5) {
                          document.getElementById(`otp-box-${idx + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otpBoxes[idx] && idx > 0) {
                          document.getElementById(`otp-box-${idx - 1}`)?.focus();
                        }
                      }}
                      className="w-full h-12 rounded-xl bg-background border border-border text-center font-mono font-black text-base focus:border-blue-600 outline-none"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground max-w-xs mx-auto pt-1">
                  <span>
                    {resendTimer > 0 ? (
                      `Resend in 00:${resendTimer < 10 ? "0" : ""}${resendTimer}`
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendAadhaarOtp}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground text-center max-w-xs mx-auto pt-1">
                  ⓘ OTP will be recieved on the phone number linked with your Aadhaar - {maskedPhone}
                </p>
              </div>

              {/* Phone number confirmation (Slide 6) */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/40 border border-border/80 text-left max-w-xs mx-auto w-full">
                <label className="text-xs font-bold text-foreground">
                  Enter your phone number
                </label>
                <div className="flex items-center rounded-xl bg-background border border-border overflow-hidden px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground mr-2">+91</span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Mobile linked with Aadhaar"
                    className="w-full bg-transparent text-xs font-mono font-bold outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  ⓘ Use the phone number linked with your Aadhaar- {maskedPhone}
                </p>
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpBoxes.join("").length < 4}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{isVerifyingOtp ? "Verifying..." : "Continue"}</span>
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 4 OF 8: SET UP YOUR HPR ID (Slide 7 of FLabs PDF)        */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 4 && (
            <div className="space-y-5 pt-1 text-left animate-fade-in">
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 4 of 8
                </span>
              </div>

              <div className="space-y-1 text-center">
                <h3 className="text-lg font-black text-foreground font-display">
                  Setup your HPR ID
                </h3>
                <p className="text-xs text-muted-foreground">
                  Create your permanent healthcare professional address on ABDM.
                </p>
              </div>

              <form onSubmit={handleCreateHpr} className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Full Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Shivam"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none"
                  />
                </div>

                {/* Select HPR ID with @hpr.abdm */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Select HPR ID*
                  </label>
                  <div className="flex items-center rounded-xl bg-background border border-border overflow-hidden focus-within:border-blue-600">
                    <input
                      type="text"
                      required
                      value={hprUsername}
                      onChange={(e) => setHprUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      placeholder="shivam1112002"
                      className="flex-1 px-3.5 py-2.5 bg-transparent text-xs font-mono font-bold outline-none"
                    />
                    <span className="px-3 py-2.5 bg-muted text-xs font-mono font-bold text-muted-foreground border-l border-border">
                      @hpr.abdm
                    </span>
                  </div>
                  {hprUsername && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>HPR ID available</span>
                      <span className="text-muted-foreground font-mono">({hprUsername}@hpr.abdm)</span>
                    </div>
                  )}
                </div>

                {/* Practice Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Practice type*
                  </label>
                  <select
                    value={practiceType}
                    onChange={(e) => setPracticeType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="Modern Medicine">Modern Medicine</option>
                    <option value="Pathology & Laboratory Medicine">Pathology & Laboratory Medicine</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Homeopathy">Homeopathy</option>
                  </select>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Enter your email*
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="eg: example@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none"
                  />
                </div>

                {/* Password with eye toggle */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Enter Password*
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
                  ⓘ Note down your HPR ID (e.g. <strong>{hprUsername ? `${hprUsername}@hpr.abdm` : "shivam1112002@hpr.abdm"}</strong>) — it's your permanent address on ABDM.
                </div>

                <button
                  type="submit"
                  disabled={isCreatingHpr || !fullName.trim() || !hprUsername.trim()}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingHpr ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{isCreatingHpr ? "Registering HPR ID..." : "Continue"}</span>
                </button>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 5 OF 8: HPR ID CREATED (Slide 8 of FLabs PDF)            */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 5 && (
            <div className="space-y-6 pt-3 text-center animate-fade-in">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/20">
                Step 5 of 8
              </span>

              {/* Big Green Tick Circle */}
              <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                <Check className="h-9 w-9 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground font-display">
                  You have successfully registered your HPR ID
                </h3>
              </div>

              {/* Pill with HPR ID */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-mono font-black text-sm">
                <span>✳</span>
                <span>{registeredHprId || `${hprUsername}@hpr.abdm`}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium max-w-sm mx-auto">
                ☑ Part 1 done — your professional identity is now on ABDM.
              </div>

              <button
                type="button"
                onClick={handleContinueToHfr}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to HFR</span>
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 6 OF 8: ADD FACILITY & PHOTOS (Slide 10 of FLabs PDF)    */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 6 && (
            <div className="space-y-5 pt-1 animate-fade-in text-left">
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 6 of 8
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground font-display">
                  Verify your facility details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Under Verify your facility details, tap Create New. Upload a clear photo of your facility building and your name board.
                </p>
              </div>

              {/* Subtabs: Your Facilities (0) vs Create New */}
              <div className="flex items-center gap-2 border-b border-border/80 pb-2">
                <button
                  type="button"
                  onClick={() => setFacilitySubTab("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    facilitySubTab === "list"
                      ? "bg-muted text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Your Facilities (0)
                </button>
                <button
                  type="button"
                  onClick={() => setFacilitySubTab("create")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    facilitySubTab === "create"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create New
                </button>
              </div>

              {facilitySubTab === "list" ? (
                <div className="p-8 text-center space-y-3 bg-muted/20 border border-border/70 rounded-2xl">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-xl">
                    🏥
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">No Registered Facilities Found</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      No prior diagnostic facilities are linked with this identity on the ABDM gateway.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFacilitySubTab("create")}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Create New Facility
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upload 1: Building image */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-foreground block">
                      Upload facility building image*
                    </span>
                    <label
                      className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center ${
                        buildingPhoto
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : "border-border/80 hover:border-blue-600 bg-muted/20 hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={(e) => handleFileUpload(e, "building")}
                        className="sr-only"
                      />
                      {buildingPhoto ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                          <span>Facility building image attached</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">
                            Click to upload or drag and drop
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            png/jpeg/jpg/pdf format (max 5mb)
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Upload 2: Board image */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-foreground block">
                      Upload facility board image*
                    </span>
                    <label
                      className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center ${
                        boardPhoto
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : "border-border/80 hover:border-blue-600 bg-muted/20 hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={(e) => handleFileUpload(e, "board")}
                        className="sr-only"
                      />
                      {boardPhoto ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                          <span>Facility board image attached</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">
                            Click to upload or drag and drop
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            png/jpeg/jpg/pdf format (max 5mb)
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    ⓘ Each file must be png, jpeg, jpg or pdf and under 5 MB.
                  </p>

                  <button
                    type="button"
                    onClick={handleContinueToFacilityDetails}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 7 OF 8: ENTER FACILITY DETAILS (Slide 11 of FLabs PDF)   */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 7 && (
            <div className="space-y-4 pt-1 animate-fade-in text-left">
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 7 of 8
                </span>
              </div>

              {/* Uploaded Thumbnail banner (as in Slide 11) */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold">Image uploaded successfully</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground font-display">
                  Enter facility details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Fill in the Facility Name, Pincode, and full Address, then choose the Facility Medicine Type (e.g. Modern Medicine / Allopathy).
                </p>
              </div>

              <form onSubmit={handleContinueToFacilityType} className="space-y-3">
                {/* Facility Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Facility Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="Dr. Shivam Kanchole"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none"
                  />
                </div>

                {/* Facility Pincode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Facility Pincode*
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={facilityPincode}
                    onChange={(e) => setFacilityPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="249408"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none"
                  />
                </div>

                {/* Facility address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Facility address*
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityAddress}
                    onChange={(e) => setFacilityAddress(e.target.value)}
                    placeholder="Noida, sector 4 , sector 4"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none"
                  />
                </div>

                {/* Facility Medicine Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Facility Medicine Type*
                  </label>
                  <select
                    value={facilityMedicineType}
                    onChange={(e) => setFacilityMedicineType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs font-semibold focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="Modern Medicine(Allopathy)">Modern Medicine(Allopathy)</option>
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Homeopathy">Homeopathy</option>
                    <option value="Dentistry">Dentistry</option>
                  </select>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  ⓘ Enter the pincode and address exactly as on your lab's registration documents.
                </p>

                <button
                  type="submit"
                  disabled={!facilityName.trim() || facilityPincode.length !== 6 || !facilityAddress.trim()}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Continue</span>
                </button>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 8 OF 8: SELECT FACILITY TYPE (Slide 12 of FLabs PDF)     */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 8 && (
            <div className="space-y-4 pt-1 animate-fade-in text-left">
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 8 of 8
                </span>
              </div>

              {/* Uploaded Thumbnail banner */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold">Image uploaded successfully</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground font-display">
                  Select facility type
                </h3>
                <p className="text-xs text-muted-foreground">
                  Open Facility Type and choose Diagnostic Laboratory, then tap Continue.
                </p>
              </div>

              <form onSubmit={handleCompleteFacilityOnboarding} className="space-y-3.5">
                {/* Pre-filled Facility Summary Card */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Facility Name:</span>{" "}
                    <strong className="text-foreground">{facilityName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pincode:</span>{" "}
                    <strong className="text-foreground">{facilityPincode}</strong> |{" "}
                    <span className="text-muted-foreground">Medicine:</span>{" "}
                    <strong className="text-foreground">{facilityMedicineType}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>{" "}
                    <span className="text-foreground">{facilityAddress}</span>
                  </div>
                </div>

                {/* Facility Type dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Facility Type*</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      (₹20 DHIS Qualified)
                    </span>
                  </label>
                  <select
                    value={facilityType}
                    onChange={(e) => setFacilityType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border-2 border-blue-600 text-xs font-black text-foreground focus:border-blue-700 outline-none cursor-pointer"
                  >
                    <option value="Diagnostic Laboratory">Diagnostic Laboratory</option>
                    <option value="Cath Laboratory">Cath Laboratory</option>
                    <option value="Imaging Center">Imaging Center</option>
                    <option value="Blood Bank">Blood Bank</option>
                    <option value="Dialysis Center">Dialysis Center</option>
                    <option value="Sanatorium">Sanatorium</option>
                  </select>
                </div>

                {/* Warning Callout (from Slide 12 of FLabs PDF) */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <p className="text-[11px] leading-relaxed">
                    <strong>For a diagnostics center, always pick Diagnostic Laboratory</strong> — not Imaging Center or any other type.
                  </p>
                </div>

                {/* DHIS Benefit Notice */}
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <p className="text-[11px] leading-relaxed">
                    Selecting <strong>Diagnostic Laboratory</strong> qualifies your lab for the direct <strong>₹20 per linked report</strong> DBT incentive under the Digital Health Incentive Scheme (DHIS).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingFacility}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingFacility ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{isSubmittingFacility ? "Registering Facility on ABDM Gateway..." : "Complete Registration & Generate HFR ID"}</span>
                </button>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 9: YOU'RE ONBOARDED! (Slide 13 of FLabs PDF)             */}
          {/* ------------------------------------------------------------- */}
          {currentStep === 9 && (
            <div className="space-y-6 pt-3 text-center animate-fade-in">
              {/* Big Celebration Icon */}
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-sm">
                🎉
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground font-display">
                  You're Onboarded on ABDM!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Your laboratory has been registered on the National Health Facility Registry (HFR) and linked to OnePath LIS.
                </p>
              </div>

              {/* Official HFR Certificate Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-card to-muted/30 border border-emerald-500/30 text-left space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Health Facility Registry ID (HFR ID)
                    </span>
                    <div className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <span>{registeredHfrId || "IN0510011316"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(registeredHfrId || "IN0510011316");
                          setCopiedHfr(true);
                          setTimeout(() => setCopiedHfr(false), 2000);
                        }}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        title="Copy HFR ID"
                      >
                        {copiedHfr ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active on Registry</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Facility Name</span>
                    <span className="font-bold text-foreground">{facilityName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Facility Type</span>
                    <span className="font-bold text-foreground">{facilityType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">System of Medicine</span>
                    <span className="font-bold text-foreground">{facilityMedicineType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Authorized In-Charge</span>
                    <span className="font-bold text-foreground">{fullName || "Dr. Shivam Kanchole"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground block">Linked HPR ID</span>
                    <span className="font-mono font-bold text-primary">{registeredHprId || `${hprUsername}@hpr.abdm`}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>DHIS ₹20 / Report DBT Incentive Active</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    LIS Status: LINKED
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-border/80 hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer"
                >
                  Done & Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOnboardModalOpen(false);
                    setIsManageModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Manage on ABDM</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* 3. LINK PRE-REGISTERED HFR MODAL (VIA AADHAAR E-KYC AUTH)               */}
      {/* ======================================================================= */}
      <Dialog open={isLinkExistingModalOpen} onOpenChange={setIsLinkExistingModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-3xl bg-card border border-border/90 shadow-2xl">
          <DialogHeader className="text-left space-y-1.5 border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Link Registered ABDM Health Facility
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Aadhaar e-KYC Verification &amp; ABDM HFR Registry Discovery
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Error Banner */}
          {linkError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2 mt-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{linkError}</span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 1: ENTER AADHAAR                                         */}
          {/* ------------------------------------------------------------- */}
          {linkStep === "1" && (
            <div className="space-y-4 pt-2 text-center animate-fade-in">
              <div className="space-y-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 1 of 2: Aadhaar e-KYC
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Enter In-Charge / Owner's Aadhaar
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Enter the 12-digit Aadhaar of the authorized representative who registered the facility on ABDM.
                </p>
              </div>

              {/* 3 boxes for Aadhaar: [XXXX] [XXXX] [XXXX] */}
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    maxLength={4}
                    value={linkAadhaar1}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setLinkAadhaar1(val);
                      if (val.length === 4) {
                        document.getElementById("link-aadhaar-box-2")?.focus();
                      }
                    }}
                    placeholder="XXXX"
                    className="w-full h-11 rounded-xl bg-background border border-border text-center font-mono font-black text-sm tracking-widest focus:border-blue-600 outline-none"
                  />
                  <input
                    id="link-aadhaar-box-2"
                    type="text"
                    maxLength={4}
                    value={linkAadhaar2}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setLinkAadhaar2(val);
                      if (val.length === 4) {
                        document.getElementById("link-aadhaar-box-3")?.focus();
                      }
                    }}
                    placeholder="XXXX"
                    className="w-full h-11 rounded-xl bg-background border border-border text-center font-mono font-black text-sm tracking-widest focus:border-blue-600 outline-none"
                  />
                  <input
                    id="link-aadhaar-box-3"
                    type="text"
                    maxLength={4}
                    value={linkAadhaar3}
                    onChange={(e) => setLinkAadhaar3(e.target.value.replace(/\D/g, ""))}
                    placeholder="XXXX"
                    className="w-full h-11 rounded-xl bg-background border border-border text-center font-mono font-black text-sm tracking-widest focus:border-blue-600 outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-left">
                  ⓘ The OTP will be sent to the mobile number registered with this Aadhaar.
                </p>
              </div>

              {/* Official info badge */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-left text-xs text-muted-foreground flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground text-[11px] block">
                    Secure ABDM Authentication
                  </span>
                  <span className="text-[11px] leading-relaxed block">
                    Manual ID entry is disabled to prevent mismatched health records. Your facility is verified directly against the National Health Authority (NHA) registry.
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkExistingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendLinkOtp}
                  disabled={isSendingLinkOtp || (linkAadhaar1.length + linkAadhaar2.length + linkAadhaar3.length) !== 12}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingLinkOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  <span>{isSendingLinkOtp ? "Sending OTP..." : "Send Aadhaar OTP"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 2: VERIFY OTP & DISCOVER FACILITY                         */}
          {/* ------------------------------------------------------------- */}
          {linkStep === "2" && (
            <div className="space-y-4 pt-2 text-center animate-fade-in">
              <div className="space-y-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider border border-blue-500/20">
                  Step 2 of 2: Verify &amp; Search
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Enter 6-Digit OTP
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Enter the OTP received on mobile number linked with Aadhaar: <strong className="text-foreground">{linkMaskedPhone || "******"}</strong>
                </p>
              </div>

              {/* 6 OTP Boxes */}
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
                  {linkOtpBoxes.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`link-otp-box-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const newBoxes = [...linkOtpBoxes];
                        newBoxes[idx] = val;
                        setLinkOtpBoxes(newBoxes);
                        if (val && idx < 5) {
                          document.getElementById(`link-otp-box-${idx + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !linkOtpBoxes[idx] && idx > 0) {
                          document.getElementById(`link-otp-box-${idx - 1}`)?.focus();
                        }
                      }}
                      className="w-full h-12 rounded-xl bg-background border border-border text-center font-mono font-black text-base focus:border-blue-600 outline-none"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground max-w-xs mx-auto pt-1">
                  <span>
                    {linkResendTimer > 0 ? (
                      `Resend in 00:${linkResendTimer < 10 ? "0" : ""}${linkResendTimer}`
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendLinkOtp}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinkStep("1")}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Change Aadhaar
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setLinkStep("1")}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndSearchFacilities}
                  disabled={isSearchingFacilities || linkOtpBoxes.join("").length < 4}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingFacilities ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>{isSearchingFacilities ? "Searching ABDM Registry..." : "Verify & Search Facilities"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 3_FOUND: REGISTERED FACILITY FOUND                        */}
          {/* ------------------------------------------------------------- */}
          {linkStep === "3_found" && (
            <div className="space-y-4 pt-1 animate-fade-in text-left">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block text-emerald-950 dark:text-emerald-200">
                    Registered Facility Found!
                  </span>
                  <span className="text-[11px] opacity-90">
                    Aadhaar authenticated for <strong>{verifiedOwnerName}</strong>. Found {discoveredFacilities.length} registered health facility on ABDM.
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {discoveredFacilities.map((fac, idx) => (
                  <div
                    key={fac.hfr_id || idx}
                    className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 hover:border-blue-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-foreground">
                          {fac.facility_name || "Diagnostic Laboratory"}
                        </h4>
                        <span className="text-xs text-muted-foreground block">
                          {fac.facility_type || "Diagnostic Laboratory"} • {fac.system_of_medicine || "Modern Medicine"}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        Active on HFR
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">HFR ID (Facility ID)</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {fac.hfr_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">In-Charge (HPR)</span>
                        <span className="font-semibold text-foreground truncate block">
                          {fac.hpr_name || verifiedOwnerName}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block">Registered Address</span>
                        <span className="text-foreground text-[11px] truncate block">
                          {fac.address || "Main Diagnostic Center"}, Pincode: {fac.pincode || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border/60">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Eligible for ₹20 / Report DHIS DBT</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleLinkDiscoveredFacility(fac)}
                        disabled={isLinkingFacility}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLinkingFacility ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        <span>{isLinkingFacility ? "Linking..." : "Link Facility to LIS"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsLinkExistingModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 3_NOT_FOUND: NO REGISTERED FACILITY FOUND (POPUP ALERT)  */}
          {/* ------------------------------------------------------------- */}
          {linkStep === "3_not_found" && (
            <div className="space-y-4 pt-1 animate-fade-in text-center">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto text-2xl">
                ⚠️
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-black text-foreground">
                  No Registered Health Facility (HFR) Found
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No active Health Facility is registered on the National ABDM Registry under the Aadhaar identity of{" "}
                  <strong className="text-foreground">{verifiedOwnerName || "this representative"}</strong>.
                </p>
              </div>

              {/* Requirement notice */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>ABDM Registration Required</span>
                </span>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90 pl-5.5">
                  Under National Health Authority rules, you cannot link an unregistered facility. Please onboard your facility on ABDM first to generate your official HFR ID.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkStep("1")}
                  className="w-full sm:flex-1 py-2.5 rounded-xl border border-border/80 text-xs font-bold hover:bg-muted text-foreground transition-all cursor-pointer"
                >
                  Try Another Aadhaar
                </button>

                <button
                  type="button"
                  onClick={handleSwitchToOnboardFromLink}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Onboard Facility Now</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* 4. MANAGE ON ABDM MODAL (DHIS Incentives & Reports Log)                 */}
      {/* ======================================================================= */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-card border border-border/90 scrollbar-none">
          <DialogHeader className="text-left border-b border-border/80 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Manage on ABDM</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Live Onboarded
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  HFR ID: <strong className="text-foreground">{summary?.hfr_id}</strong>
                  {summary?.hpr_id && <> | HPR ID: <strong className="text-foreground">{summary.hpr_id}</strong></>}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="https://dhis.abdm.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-border/80 hover:bg-muted text-xs font-bold text-foreground transition-all flex items-center gap-1.5"
                >
                  <span>NHA DHIS Portal</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>
            </div>
          </DialogHeader>

          {summary && (
            <div className="space-y-6 pt-3">
              {/* 4 Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">
                    {summary.current_month_name} Reports
                  </span>
                  <div className="text-2xl font-black text-foreground">
                    {summary.metrics.current_month_linked_reports}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{summary.metrics.total_linked_reports} all-time</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                    Estimated Incentive
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{summary.metrics.current_month_incentive_inr.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">@ ₹20 / Report DBT</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">
                    ABHA Patients
                  </span>
                  <div className="text-2xl font-black text-primary">
                    {summary.metrics.current_month_abha_patients}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{summary.metrics.total_abha_patients} total</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">
                    Total Earnings
                  </span>
                  <div className="text-2xl font-black text-foreground">
                    ₹{summary.metrics.total_incentive_inr.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Cumulative DBT</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    Monthly DBT Qualification ({summary.metrics.current_month_linked_reports} / {summary.metrics.dhis_monthly_threshold} reports)
                  </span>
                  <span className="font-mono font-bold text-primary">{summary.metrics.threshold_progress_percent}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${summary.metrics.threshold_progress_percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  NHA releases DBT directly via PFMS to the facility bank account on file.
                </p>
              </div>

              {/* Recent Reports */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Recent ABDM Transmissions</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => loadDhisSummary(true)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {summary.recent_reports?.length > 0 ? (
                  <div className="border border-border/80 rounded-2xl overflow-hidden bg-background divide-y divide-border/60 max-h-48 overflow-y-auto">
                    {summary.recent_reports.map((rep) => (
                      <div key={rep.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-bold text-foreground block">{rep.patient?.name || "Patient"}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{rep.patient?.abha_address || rep.patient?.abha_number || "No ABHA"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 uppercase">
                          {rep.abdm_status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border rounded-xl">
                    No ABDM synced reports yet. Reports approved for ABHA patients will reflect here.
                  </p>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
