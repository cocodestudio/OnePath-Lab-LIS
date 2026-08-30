"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope, MapPin, Phone, User, Hash, FlaskConical, CheckCircle2,
  Loader2, Printer, FileText, AlertCircle, ArrowRight, Search, BookOpen, Settings,
  ChevronDown, ChevronRight, PlusCircle, Edit2, Trash2, UserCheck, Building, Sparkles
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import { fetchFromLaravel } from "@/lib/api-client";

interface Test {
  id: string; name: string; category: string; price: number;
  unit: string | null; refRangeMin: number | null; refRangeMax: number | null;
  subTests?: Test[];
}
interface Patient {
  id: string; customId: string; name: string; age: number;
  gender: string; phone: string; refDoctor: string; address?: string; collectedAt?: string;
}

const defaultRequiredFields = {
  firstName: true, age: true, gender: true, phone: true,
  refDoctorSelect: false, collectedAtSelect: false, collectedBySelect: false, address: false,
};

const defaultDoctors = ["Self", "Dr. Rajesh Sharma", "Dr. Amit Verma", "Dr. Anjali Gupta", "Dr. S. K. Roy"];
const defaultCollectionPoints = ["Main Lab", "Home Collection", "Hospital OPD", "Branch 1 - City Center"];
const defaultPhlebotomists = ["Self / Lab Staff", "Rahul Phlebotomist", "Pooja Sharma (Tech)", "Vikram Collector"];

export default function RegisterPatientPage() {
  const [requiredFields, setRequiredFields] = useState<Record<string, boolean>>(defaultRequiredFields);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempRequiredFields, setTempRequiredFields] = useState<Record<string, boolean>>(defaultRequiredFields);

  // Name & Salutation
  const [designation, setDesignation] = useState("Mr.");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Age Breakdown (Years, Months, Days)
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [ageDays, setAgeDays] = useState("");

  // Other Demographics
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Referrals & Logistics
  const [doctorsList, setDoctorsList] = useState<string[]>(defaultDoctors);
  const [refDoctorSelect, setRefDoctorSelect] = useState("Self");
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [newDoctorInput, setNewDoctorInput] = useState("");
  const [editingDoctor, setEditingDoctor] = useState<{ oldName: string; newName: string } | null>(null);

  const [collectionPoints, setCollectionPoints] = useState<string[]>(defaultCollectionPoints);
  const [collectedAtSelect, setCollectedAtSelect] = useState("Main Lab");
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [newCollectionInput, setNewCollectionInput] = useState("");
  const [editingCollectionPoint, setEditingCollectionPoint] = useState<{ oldName: string; newName: string } | null>(null);

  const [phlebotomists, setPhlebotomists] = useState<string[]>(defaultPhlebotomists);
  const [collectedBySelect, setCollectedBySelect] = useState("Self / Lab Staff");
  const [isPhleboModalOpen, setIsPhleboModalOpen] = useState(false);
  const [newPhleboInput, setNewPhleboInput] = useState("");
  const [editingPhlebo, setEditingPhlebo] = useState<{ oldName: string; newName: string } | null>(null);

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Booking & Test Selection State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Patient | null>(null);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState("");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ patientCustomId: string; billCustomId: string; reportId: string; billId: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("patientFormRequiredFields");
    if (saved) {
      try { setRequiredFields(JSON.parse(saved)); } catch (e) { }
    }

    const savedDocs = localStorage.getItem("lis_referral_doctors");
    if (savedDocs) {
      try { setDoctorsList(JSON.parse(savedDocs)); } catch (e) { }
    }

    const savedPoints = localStorage.getItem("lis_collection_points");
    if (savedPoints) {
      try { setCollectionPoints(JSON.parse(savedPoints)); } catch (e) { }
    }

    const savedPhlebo = localStorage.getItem("lis_phlebotomists");
    if (savedPhlebo) {
      try { setPhlebotomists(JSON.parse(savedPhlebo)); } catch (e) { }
    }

    (async () => {
      try {
        const tests = await fetchFromLaravel("/tests");
        setAvailableTests(tests);
      } catch (err) { console.error("Error fetching tests:", err); }
    })();
  }, []);

  // Doctor Management Helpers
  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDoctorInput.trim();
    if (!trimmed) return;
    if (!doctorsList.includes(trimmed)) {
      const updated = [...doctorsList, trimmed];
      setDoctorsList(updated);
      localStorage.setItem("lis_referral_doctors", JSON.stringify(updated));
    }
    setRefDoctorSelect(trimmed);
    setNewDoctorInput("");
  };

  const handleSaveEditDoctor = () => {
    if (!editingDoctor || !editingDoctor.newName.trim()) return;
    const updated = doctorsList.map(d => d === editingDoctor.oldName ? editingDoctor.newName.trim() : d);
    setDoctorsList(updated);
    localStorage.setItem("lis_referral_doctors", JSON.stringify(updated));
    if (refDoctorSelect === editingDoctor.oldName) {
      setRefDoctorSelect(editingDoctor.newName.trim());
    }
    setEditingDoctor(null);
  };

  const handleDeleteDoctor = (name: string) => {
    if (name === "Self") return;
    const updated = doctorsList.filter(d => d !== name);
    setDoctorsList(updated);
    localStorage.setItem("lis_referral_doctors", JSON.stringify(updated));
    if (refDoctorSelect === name) setRefDoctorSelect("Self");
  };

  // Collection Point Helpers
  const handleAddCollectionPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCollectionInput.trim();
    if (!trimmed) return;
    if (!collectionPoints.includes(trimmed)) {
      const updated = [...collectionPoints, trimmed];
      setCollectionPoints(updated);
      localStorage.setItem("lis_collection_points", JSON.stringify(updated));
    }
    setCollectedAtSelect(trimmed);
    setNewCollectionInput("");
  };

  const handleSaveEditCollectionPoint = () => {
    if (!editingCollectionPoint || !editingCollectionPoint.newName.trim()) return;
    const updated = collectionPoints.map(c => c === editingCollectionPoint.oldName ? editingCollectionPoint.newName.trim() : c);
    setCollectionPoints(updated);
    localStorage.setItem("lis_collection_points", JSON.stringify(updated));
    if (collectedAtSelect === editingCollectionPoint.oldName) {
      setCollectedAtSelect(editingCollectionPoint.newName.trim());
    }
    setEditingCollectionPoint(null);
  };

  const handleDeleteCollectionPoint = (name: string) => {
    if (name === "Main Lab") return;
    const updated = collectionPoints.filter(c => c !== name);
    setCollectionPoints(updated);
    localStorage.setItem("lis_collection_points", JSON.stringify(updated));
    if (collectedAtSelect === name) setCollectedAtSelect("Main Lab");
  };

  // Phlebotomist Helpers
  const handleAddPhlebo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPhleboInput.trim();
    if (!trimmed) return;
    if (!phlebotomists.includes(trimmed)) {
      const updated = [...phlebotomists, trimmed];
      setPhlebotomists(updated);
      localStorage.setItem("lis_phlebotomists", JSON.stringify(updated));
    }
    setCollectedBySelect(trimmed);
    setNewPhleboInput("");
  };

  const handleSaveEditPhlebo = () => {
    if (!editingPhlebo || !editingPhlebo.newName.trim()) return;
    const updated = phlebotomists.map(p => p === editingPhlebo.oldName ? editingPhlebo.newName.trim() : p);
    setPhlebotomists(updated);
    localStorage.setItem("lis_phlebotomists", JSON.stringify(updated));
    if (collectedBySelect === editingPhlebo.oldName) {
      setCollectedBySelect(editingPhlebo.newName.trim());
    }
    setEditingPhlebo(null);
  };

  const handleDeletePhlebo = (name: string) => {
    if (name === "Self / Lab Staff") return;
    const updated = phlebotomists.filter(p => p !== name);
    setPhlebotomists(updated);
    localStorage.setItem("lis_phlebotomists", JSON.stringify(updated));
    if (collectedBySelect === name) setCollectedBySelect("Self / Lab Staff");
  };

  // Patient Registration Submit
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegistering(true);

    const missing = [];
    if (requiredFields.firstName && !firstName.trim()) missing.push("First Name");
    if (requiredFields.age && !ageYears && !ageMonths && !ageDays) missing.push("Age");
    if (requiredFields.gender && !gender) missing.push("Gender");
    if (requiredFields.phone && !phone.trim()) missing.push("Phone Number");
    if (requiredFields.refDoctorSelect && !refDoctorSelect) missing.push("Referred By");
    if (requiredFields.collectedAtSelect && !collectedAtSelect) missing.push("Collected At");
    if (requiredFields.address && !address.trim()) missing.push("Residential Address");

    if (missing.length > 0) {
      setRegisterError(`Please fill in the required fields: ${missing.join(", ")}`);
      setRegistering(false);
      return;
    }

    try {
      const fullName = `${designation} ${firstName.trim()} ${lastName.trim()}`.trim();
      const calculatedAge = parseInt(ageYears) || (parseInt(ageMonths) > 0 ? 1 : 0) || 0;

      const data = await fetchFromLaravel("/patients", {
        method: "POST",
        body: JSON.stringify({
          designation,
          name: fullName,
          age: calculatedAge,
          gender,
          phone: phone.trim(),
          refDoctor: refDoctorSelect || "Self",
          address: address.trim(),
          collectedAt: `${collectedAtSelect} (${collectedBySelect})`,
        }),
      });

      setNewPatient(data);
      setRegistering(false);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setRegisterError(err.message || "Failed to register patient. Please verify your connection.");
      setRegistering(false);
    }
  };

  const handleToggleTest = (testId: string) =>
    setSelectedTests((prev) => prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]);

  const selectedTestObjects = availableTests.flatMap((t) => {
    let shouldChargeParent = selectedTests.includes(t.id);
    if (!shouldChargeParent && t.subTests) {
      if (t.subTests.some(sub => selectedTests.includes(sub.id))) {
        shouldChargeParent = true;
      }
    }
    const list = [];
    if (shouldChargeParent) {
      list.push(t);
    }
    return list;
  });

  const subtotal = selectedTestObjects.reduce((sum, t) => sum + t.price, 0);
  const parsedDiscount = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subtotal - parsedDiscount);

  const handleConfirmBooking = async () => {
    if (!newPatient) return;
    setBookingError(null);
    setBooking(true);
    try {
      const report = await fetchFromLaravel("/reports", {
        method: "POST",
        body: JSON.stringify({
          patientId: newPatient.id,
          testIds: selectedTests,
          total: grandTotal,
          discount: parsedDiscount,
          paymentStatus
        }),
      });
      setBookingSuccess(true);
      setSuccessDetails({
        patientCustomId: newPatient.customId,
        billCustomId: report.bill?.custom_id || "BILL-PENDING",
        reportId: report.id,
        billId: report.bill?.id || report.id
      });
    } catch (err: any) {
      setBookingError(err.message || "Failed to complete booking and generate invoice.");
    } finally {
      setBooking(false);
    }
  };

  const handleResetFlow = () => {
    setDesignation("Mr.");
    setFirstName("");
    setLastName("");
    setAgeYears("");
    setAgeMonths("");
    setAgeDays("");
    setGender("Male");
    setPhone("");
    setRefDoctorSelect("Self");
    setAddress("");
    setCollectedAtSelect("Main Lab");
    setCollectedBySelect("Self / Lab Staff");
    setRegistering(false);
    setRegisterError(null);
    setNewPatient(null);
    setSelectedTests([]);
    setDiscount("0");
    setPaymentStatus("UNPAID");
    setBookingSuccess(false);
    setSuccessDetails(null);
  };

  const groupedTests: Record<string, Test[]> = {};
  availableTests.forEach((test) => {
    (groupedTests[test.category] ||= []).push(test);
  });
  const getFilteredGroupedTests = () => {
    if (!testSearch.trim()) return groupedTests;
    const term = testSearch.toLowerCase();
    const filtered: Record<string, Test[]> = {};
    Object.entries(groupedTests).forEach(([category, tests]) => {
      const matches = tests.filter((t) => t.name.toLowerCase().includes(term) || t.category.toLowerCase().includes(term));
      if (matches.length > 0) filtered[category] = matches;
    });
    return filtered;
  };
  const filteredGroups = getFilteredGroupedTests();

  const steps = [
    { n: 1, label: "Patient Details", done: true },
    { n: 2, label: "Test Selection", done: !!newPatient },
    { n: 3, label: "Review & Billing", done: bookingSuccess },
  ];

  return (
    <div className="w-full space-y-7 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">LIS Intake Portal</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            New Patient Registration
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Fill in patient details, assign diagnostic investigations, and generate immediate billing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setTempRequiredFields(requiredFields); setIsSettingsOpen(true); }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card/70 hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-sm"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Form Fields</span>
          </button>
        </div>
      </div>

      {!bookingSuccess ? (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex items-center justify-between max-w-xl mx-auto px-4">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
                    s.done ? "gradient-primary text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.4)]" : "bg-muted text-muted-foreground border border-border"
                  }`}>
                    {s.done && s.n !== (newPatient && !bookingSuccess ? 2 : s.n) ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <span className={`text-[11px] font-semibold ${s.done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-3 mb-5 rounded transition-colors ${steps[i + 1].done ? "bg-primary" : "bg-border/80"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Main Full-Width Form Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Cols: Seamless Form Inputs */}
            <div className="lg:col-span-8 space-y-6">
              
              {registerError && (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/25 p-4 text-sm text-destructive animate-fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{registerError}</p>
                </div>
              )}

              {newPatient && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Patient Registered Successfully</p>
                      <p className="text-sm font-bold text-foreground">{newPatient.name} <span className="font-mono text-xs text-muted-foreground">({newPatient.customId})</span></p>
                    </div>
                  </div>
                  <button onClick={handleResetFlow} className="text-xs font-semibold text-primary hover:underline">
                    Edit / Register New
                  </button>
                </div>
              )}

              <form onSubmit={handleRegisterPatient} className="space-y-6">
                
                {/* Section 1: Demographics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/50 pb-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Personal Demographics</span>
                  </div>

                  {/* Title, First Name, Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Title <span className="text-primary">*</span>
                      </label>
                      <Select value={designation} onValueChange={setDesignation} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-card/60 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                          <SelectItem value="Miss">Miss</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                          <SelectItem value="Master">Master</SelectItem>
                          <SelectItem value="Baby">Baby</SelectItem>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                          <SelectItem value="Prof.">Prof.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        First Name {requiredFields.firstName && <span className="text-primary">*</span>}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground transition-all"
                          placeholder="Enter First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={registering || !!newPatient}
                          required={requiredFields.firstName}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground transition-all"
                        placeholder="Enter Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={registering || !!newPatient}
                      />
                    </div>
                  </div>

                  {/* Age (Y/M/D) and Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    
                    {/* Age Breakdown */}
                    <div className="sm:col-span-7 space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Age (Years / Months / Days) {requiredFields.age && <span className="text-primary">*</span>}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            placeholder="Years"
                            className="w-full text-center h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-semibold"
                            value={ageYears}
                            onChange={(e) => setAgeYears(e.target.value)}
                            disabled={registering || !!newPatient}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60 pointer-events-none">Y</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="11"
                            placeholder="Months"
                            className="w-full text-center h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-semibold"
                            value={ageMonths}
                            onChange={(e) => setAgeMonths(e.target.value)}
                            disabled={registering || !!newPatient}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60 pointer-events-none">M</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            placeholder="Days"
                            className="w-full text-center h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-semibold"
                            value={ageDays}
                            onChange={(e) => setAgeDays(e.target.value)}
                            disabled={registering || !!newPatient}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60 pointer-events-none">D</span>
                        </div>
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Gender {requiredFields.gender && <span className="text-primary">*</span>}
                      </label>
                      <Select value={gender} onValueChange={setGender} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-card/60 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  </div>

                  {/* Phone & Residential Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Phone Number {requiredFields.phone && <span className="text-primary">*</span>}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <input
                          type="tel"
                          className="w-full pl-10 pr-4 h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground transition-all"
                          placeholder="Enter 10-digit Phone Number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={registering || !!newPatient}
                          required={requiredFields.phone}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Residential Address {requiredFields.address && <span className="text-primary">*</span>}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 h-11 bg-card/60 border border-border rounded-lg text-sm placeholder:text-muted-foreground/45 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground transition-all"
                          placeholder="Enter Residential Address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={registering || !!newPatient}
                          required={requiredFields.address}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Clinical Logistics & Referrals */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border/50 pb-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    <span>Referral & Sample Collection Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Doctor Referral */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Referred By {requiredFields.refDoctorSelect && <span className="text-primary">*</span>}
                        </label>
                      </div>
                      <Select value={refDoctorSelect} onValueChange={setRefDoctorSelect} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-card/60 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {doctorsList.map((doc) => (
                            <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setIsDoctorModalOpen(true)}
                        disabled={registering || !!newPatient}
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pt-0.5"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Manage Doctors</span>
                      </button>
                    </div>

                    {/* Collection Center */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Collection At {requiredFields.collectedAtSelect && <span className="text-primary">*</span>}
                        </label>
                      </div>
                      <Select value={collectedAtSelect} onValueChange={setCollectedAtSelect} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-card/60 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {collectionPoints.map((point) => (
                            <SelectItem key={point} value={point}>{point}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setIsCollectionModalOpen(true)}
                        disabled={registering || !!newPatient}
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pt-0.5"
                      >
                        <Building className="h-3.5 w-3.5" />
                        <span>Manage Points</span>
                      </button>
                    </div>

                    {/* Phlebotomist / Collector */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Collected By {requiredFields.collectedBySelect && <span className="text-primary">*</span>}
                        </label>
                      </div>
                      <Select value={collectedBySelect} onValueChange={setCollectedBySelect} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-card/60 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {phlebotomists.map((phlebo) => (
                            <SelectItem key={phlebo} value={phlebo}>{phlebo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setIsPhleboModalOpen(true)}
                        disabled={registering || !!newPatient}
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline pt-0.5"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Manage Staff</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Form Action CTA */}
                {!newPatient && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                    <button
                      type="submit"
                      disabled={registering}
                      className="gradient-primary text-primary-foreground font-semibold px-7 py-3 rounded-lg ring-inset-top transition-all hover:-translate-y-px hover:shadow-lg active:scale-[0.99] flex items-center gap-2 disabled:opacity-60 text-sm"
                    >
                      {registering ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving Patient Details…</span>
                        </>
                      ) : (
                        <>
                          <span>Save & Select Clinical Tests</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>

              {/* Interactive Test Catalog Banner */}
              <div
                onClick={() => newPatient && setIsModalOpen(true)}
                className={`p-6 rounded-xl border-2 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
                  newPatient ? "bg-accent/40 border-primary/40 hover:bg-accent/60 cursor-pointer shadow-sm" : "bg-muted/10 border-border/70 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                    newPatient ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                  }`}>
                    <FlaskConical className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Assigned Clinical Tests</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {newPatient
                        ? `${selectedTestObjects.length} investigations added to invoice. Click to edit test catalog.`
                        : "Save patient demographic details above to open the pathology test catalog."}
                    </p>
                  </div>
                </div>

                {newPatient && (
                  <span className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-xs shrink-0 shadow-sm">
                    Open Catalog ({selectedTestObjects.length})
                  </span>
                )}
              </div>

            </div>

            {/* Right 4 Cols: Dynamic Invoice & Billing Sidebar */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">
              
              <div className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="bg-muted/50 px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Real-time Invoice Summary</span>
                  </h3>
                  {selectedTestObjects.length > 0 && (
                    <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      {selectedTestObjects.length} Tests
                    </span>
                  )}
                </div>

                {/* Selected Tests List */}
                <div className="p-4 min-h-[160px] max-h-[260px] overflow-y-auto space-y-2.5">
                  {selectedTestObjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                      <FlaskConical className="h-9 w-9 opacity-25 mb-2" />
                      <p className="text-xs">No diagnostic tests added yet.</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">Save patient to select from directory</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {selectedTestObjects.map((test) => (
                        <li key={test.id} className="py-2 flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{test.name}</p>
                            <p className="text-[10px] text-muted-foreground">{test.category}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-foreground">₹{test.price.toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Totals & Actions */}
                <div className="p-5 bg-muted/40 border-t border-border/60 space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {parsedDiscount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Discount Applied</span>
                        <span className="font-mono font-semibold">-₹{parsedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-border/60">
                    <span className="font-semibold text-sm text-foreground">Total Amount</span>
                    <span className="font-display text-2xl font-bold text-primary font-mono">₹{grandTotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={selectedTests.length === 0 || booking || !newPatient}
                    className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold text-xs ring-inset-top hover:-translate-y-px active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 shadow-sm"
                  >
                    {booking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating Invoice…</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Invoice & Barcode</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-card/40 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Quick Protocol
                </p>
                <p className="leading-relaxed">
                  Upon invoice generation, a unique Barcode and Lab ID will be printed on the patient intake receipt.
                </p>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* Booking Confirmed State */
        <div className="border border-border/80 bg-card/60 backdrop-blur-md text-center p-8 sm:p-12 max-w-xl mx-auto rounded-2xl shadow-lg animate-fade-in space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Patient Booking Confirmed</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
              The patient profile and diagnostic file have been successfully logged.
            </p>
          </div>

          <div className="bg-muted/50 border border-border/60 rounded-xl p-5 grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Patient ID</p>
              <p className="text-sm font-bold text-foreground font-mono">{successDetails?.patientCustomId}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Invoice Number</p>
              <p className="text-sm font-bold text-foreground font-mono">{successDetails?.billCustomId}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard/billing">
              <button className="w-full sm:w-auto h-11 px-6 border border-border bg-card hover:bg-accent hover:text-accent-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all text-foreground shadow-sm">
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </button>
            </Link>
            <Link href={`/dashboard/reports/${successDetails?.reportId}/edit`}>
              <button className="w-full sm:w-auto h-11 px-6 gradient-primary text-primary-foreground text-xs font-semibold rounded-lg ring-inset-top flex items-center justify-center gap-2 transition-all hover:-translate-y-px shadow-sm">
                <FileText className="h-4 w-4" />
                <span>Enter Test Results</span>
              </button>
            </Link>
          </div>

          <div>
            <button
              className="text-xs text-primary font-semibold hover:underline"
              onClick={handleResetFlow}
            >
              + Register Another Patient
            </button>
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. Test Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">Select Tests</DialogTitle>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 shrink-0 bg-muted/30">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Select Clinical Tests</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Patient: <strong className="text-foreground">{newPatient?.name}</strong> · {newPatient?.customId}
              </p>
            </div>
          </div>

          {bookingError && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg bg-destructive/8 border border-destructive/20 p-3 text-sm text-destructive shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-medium">{bookingError}</p>
            </div>
          )}

          <div className="p-4 border-b border-border/60 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                placeholder="Search by test name or category…"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FlaskConical className="h-8 w-8 mx-auto mb-3 opacity-25" />
                <p className="text-xs font-semibold">No tests match your search.</p>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([category, tests]) => (
                <div key={category}>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2">
                    <span>{category}</span>
                    <div className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tests.map((test) => {
                      const selected = selectedTests.includes(test.id);
                      return (
                        <div key={test.id} className="flex flex-col gap-1">
                          <div
                            onClick={() => handleToggleTest(test.id)}
                            className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer select-none transition-all ${
                              selected ? "bg-accent border-primary/50" : "bg-card border-border hover:border-primary/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox checked={selected} onCheckedChange={() => handleToggleTest(test.id)} onClick={(e) => e.stopPropagation()} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{test.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {test.subTests?.length ? `${test.subTests.length} Parameters` : `Ref ${test.refRangeMin ?? "N/A"}–${test.refRangeMax ?? "N/A"}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-foreground shrink-0">₹{test.price.toFixed(0)}</span>
                              {test.subTests && test.subTests.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setExpandedTests(prev => ({ ...prev, [test.id]: !prev[test.id] })) }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                                >
                                  {expandedTests[test.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                          {expandedTests[test.id] && test.subTests && test.subTests.length > 0 && (
                            <div className="pl-6 pr-2 py-1 space-y-1">
                              {test.subTests.map(sub => {
                                const subSelected = selectedTests.includes(sub.id) || selected;
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => { if (!selected) handleToggleTest(sub.id) }}
                                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer ${
                                      subSelected ? "bg-accent/50 border-primary/30" : "bg-card border-transparent hover:border-border"
                                    } ${selected ? "opacity-60 cursor-not-allowed" : ""}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox checked={subSelected} disabled={selected} onCheckedChange={() => { if (!selected) handleToggleTest(sub.id) }} onClick={(e) => e.stopPropagation()} />
                                      <span>{sub.name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border/60 px-6 py-4 shrink-0 bg-muted/40 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 flex-grow w-full sm:w-auto">
              <div className="space-y-1">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Discount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter Discount"
                  className="h-9 w-28 text-xs border border-border rounded-lg px-2.5 bg-background text-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  disabled={booking}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Payment</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus} disabled={booking}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-between w-full sm:w-auto sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grand Total</p>
                <p className="font-display text-xl font-semibold text-primary tnum">₹{grandTotal.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2.5 rounded-lg ring-inset-top hover:-translate-y-px transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Manage Referring Doctors Modal */}
      <Dialog open={isDoctorModalOpen} onOpenChange={setIsDoctorModalOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Manage Referring Doctors</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Manage Referring Doctors</h3>
                <p className="text-xs text-muted-foreground">Add, edit, or remove referring doctors.</p>
              </div>
            </div>

            {/* Add New Doctor Form */}
            <form onSubmit={handleAddDoctor} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Doctor Name (e.g. Dr. Name)"
                value={newDoctorInput}
                onChange={(e) => setNewDoctorInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newDoctorInput.trim()}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Doctors List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {doctorsList.map((doc) => (
                <div key={doc} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/60">
                  {editingDoctor?.oldName === doc ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingDoctor.newName}
                        onChange={(e) => setEditingDoctor({ ...editingDoctor, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditDoctor} className="text-xs font-semibold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingDoctor(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-foreground">{doc}</span>
                  )}

                  {doc !== "Self" && !editingDoctor && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingDoctor({ oldName: doc, newName: doc })}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoctor(doc)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(false)}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Manage Collection Points Modal */}
      <Dialog open={isCollectionModalOpen} onOpenChange={setIsCollectionModalOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Manage Collection Points</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Manage Collection Centers</h3>
                <p className="text-xs text-muted-foreground">Add or modify sample collection points.</p>
              </div>
            </div>

            <form onSubmit={handleAddCollectionPoint} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Collection Point Name"
                value={newCollectionInput}
                onChange={(e) => setNewCollectionInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newCollectionInput.trim()}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {collectionPoints.map((point) => (
                <div key={point} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/60">
                  {editingCollectionPoint?.oldName === point ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingCollectionPoint.newName}
                        onChange={(e) => setEditingCollectionPoint({ ...editingCollectionPoint, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditCollectionPoint} className="text-xs font-semibold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingCollectionPoint(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-foreground">{point}</span>
                  )}

                  {point !== "Main Lab" && !editingCollectionPoint && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCollectionPoint({ oldName: point, newName: point })}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollectionPoint(point)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsCollectionModalOpen(false)}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Manage Phlebotomists Modal */}
      <Dialog open={isPhleboModalOpen} onOpenChange={setIsPhleboModalOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Manage Phlebotomists</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Manage Phlebotomists & Staff</h3>
                <p className="text-xs text-muted-foreground">Add or modify sample collectors & lab technicians.</p>
              </div>
            </div>

            <form onSubmit={handleAddPhlebo} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Phlebotomist / Staff Name"
                value={newPhleboInput}
                onChange={(e) => setNewPhleboInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newPhleboInput.trim()}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {phlebotomists.map((phlebo) => (
                <div key={phlebo} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/60">
                  {editingPhlebo?.oldName === phlebo ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingPhlebo.newName}
                        onChange={(e) => setEditingPhlebo({ ...editingPhlebo, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditPhlebo} className="text-xs font-semibold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingPhlebo(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-foreground">{phlebo}</span>
                  )}

                  {phlebo !== "Self / Lab Staff" && !editingPhlebo && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingPhlebo({ oldName: phlebo, newName: phlebo })}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhlebo(phlebo)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsPhleboModalOpen(false)}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Form Fields Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Form Settings</DialogTitle>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> Form Fields Configuration
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Select which input fields are mandatory for your lab intake flow.</p>
            </div>

            <div className="space-y-2.5 py-2">
              {[
                { id: 'firstName', label: 'First Name' },
                { id: 'age', label: 'Age (Years / Months / Days)' },
                { id: 'gender', label: 'Gender' },
                { id: 'phone', label: 'Phone Number' },
                { id: 'refDoctorSelect', label: 'Referred By (Doctor)' },
                { id: 'collectedAtSelect', label: 'Collected At (Center)' },
                { id: 'collectedBySelect', label: 'Collected By (Phlebotomist)' },
                { id: 'address', label: 'Residential Address' },
              ].map(field => (
                <div key={field.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <span className="text-xs font-medium">{field.label}</span>
                  <Checkbox
                    checked={tempRequiredFields[field.id]}
                    onCheckedChange={(checked) => setTempRequiredFields(prev => ({ ...prev, [field.id]: checked === true }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button
                onClick={() => {
                  setRequiredFields(tempRequiredFields);
                  localStorage.setItem("patientFormRequiredFields", JSON.stringify(tempRequiredFields));
                  setIsSettingsOpen(false);
                }}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2 rounded-lg ring-inset-top hover:-translate-y-px transition-all shadow-sm"
              >
                Save Settings
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
