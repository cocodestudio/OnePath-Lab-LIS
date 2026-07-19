"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope, MapPin, Phone, User, Hash, FlaskConical, CheckCircle2,
  Loader2, Printer, FileText, AlertCircle, ArrowRight, Search, BookOpen, Settings, ChevronDown, ChevronRight
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

const fieldClass =
  "w-full pl-10 bg-background border border-border rounded-lg p-2.5 text-sm transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-card outline-none text-foreground disabled:opacity-60";

const defaultRequiredFields = {
  patientName: true, age: true, gender: true, phone: true,
  refDoctorSelect: false, collectedAtSelect: false, address: false,
};

export default function RegisterPatientPage() {
  const [requiredFields, setRequiredFields] = useState<Record<string, boolean>>(defaultRequiredFields);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempRequiredFields, setTempRequiredFields] = useState<Record<string, boolean>>(defaultRequiredFields);
  const [designation, setDesignation] = useState("Mr.");
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [refDoctorSelect, setRefDoctorSelect] = useState("Self");
  const [customRefDoctor, setCustomRefDoctor] = useState("");
  const [address, setAddress] = useState("");
  const [collectedAtSelect, setCollectedAtSelect] = useState("Lab");
  const [customCollectedAt, setCustomCollectedAt] = useState("");
  const [registering, setRegistering] = useState(false);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [registerError, setRegisterError] = useState<string | null>(null);

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

    (async () => {
      try {
        const tests = await fetchFromLaravel("/tests");
        setAvailableTests(tests);
      } catch (err) { console.error("Error fetching tests:", err); }

      try {
        const patients = await fetchFromLaravel("/patients");
        setPatientsList(patients);
      } catch (err) { console.error("Error fetching patients:", err); }
    })();
  }, []);

  const uniqueDoctors = Array.from(new Set(patientsList.map(p => p.refDoctor).filter((d): d is string => Boolean(d))));
  if (!uniqueDoctors.includes("Self")) uniqueDoctors.unshift("Self");
  const uniqueAddresses = Array.from(new Set(patientsList.map(p => p.collectedAt).filter((a): a is string => Boolean(a))));
  if (!uniqueAddresses.includes("Lab")) uniqueAddresses.unshift("Lab");

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegistering(true);
    const missing = [];
    if (requiredFields.patientName && !patientName) missing.push("Full Name");
    if (requiredFields.age && !age) missing.push("Age");
    if (requiredFields.gender && !gender) missing.push("Gender");
    if (requiredFields.phone && !phone) missing.push("Phone Number");
    if (requiredFields.refDoctorSelect && !refDoctorSelect) missing.push("Referred By (Dr.)");
    if (requiredFields.collectedAtSelect && !collectedAtSelect) missing.push("Collected At");
    if (requiredFields.address && !address) missing.push("Residential Address");

    if (missing.length > 0) {
      setRegisterError(`Please fill out the required fields: ${missing.join(", ")}`);
      setRegistering(false);
      return;
    }
    try {
      const finalRefDoctor = refDoctorSelect === "ADD_NEW" ? customRefDoctor : refDoctorSelect;
      const finalCollectedAt = collectedAtSelect === "ADD_NEW" ? customCollectedAt : collectedAtSelect;

      const data = await fetchFromLaravel("/patients", {
        method: "POST",
        body: JSON.stringify({ designation, name: patientName, age: parseInt(age), gender, phone, refDoctor: finalRefDoctor || "Self", address, collectedAt: finalCollectedAt || "Lab" }),
      });
      setNewPatient(data);
      setRegistering(false);
      setIsModalOpen(true);
    } catch (err: any) {
      setRegisterError(err.message || "Failed to register patient.");
      setRegistering(false);
    }
  };

  const handleToggleTest = (testId: string) =>
    setSelectedTests((prev) => prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]);

  const selectedTestObjects = availableTests.flatMap((t) => {
    // Check if parent is selected directly
    let shouldChargeParent = selectedTests.includes(t.id);
    // Check if any subtest of this parent is selected
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
      const data = await fetchFromLaravel("/reports", {
        method: "POST",
        body: JSON.stringify({ patientId: newPatient.id, testIds: selectedTests, discount: parsedDiscount, paymentStatus }),
      });
      setBookingSuccess(true);
      setSuccessDetails({ patientCustomId: newPatient.customId, billCustomId: data.bill.customId, reportId: data.report.id, billId: data.bill.id });
    } catch (err: any) {
      setBookingError(err.message || "Failed to complete booking.");
    } finally {
      setBooking(false);
    }
  };

  const handleResetFlow = () => {
    setDesignation("Mr."); setPatientName(""); setAge(""); setGender("Male"); setPhone("");
    setRefDoctorSelect("Self"); setCustomRefDoctor(""); setAddress("");
    setCollectedAtSelect("Lab"); setCustomCollectedAt("");
    setRegistering(false); setRegisterError(null); setNewPatient(null); setSelectedTests([]);
    setDiscount("0"); setPaymentStatus("UNPAID"); setBookingSuccess(false); setSuccessDetails(null);
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
    { n: 3, label: "Review & Pay", done: bookingSuccess },
  ];

  return (
    <div className="max-w-[1080px] mx-auto space-y-7 pb-12 animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Registration</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Register Patient</h1>
        <p className="text-sm text-muted-foreground mt-1">Add a new patient and create their bill.</p>
      </div>

      {!bookingSuccess ? (
        <div className="space-y-7">
          {/* Stepper */}
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${s.done ? "gradient-primary text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.4)]" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                    {s.done && s.n !== (newPatient && !bookingSuccess ? 2 : s.n) ? <CheckCircle2 className="h-5 w-5" /> : s.n}
                  </div>
                  <span className={`text-[11px] font-semibold ${s.done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-[2px] mx-3 mb-6 rounded ${steps[i + 1].done ? "bg-primary" : "bg-border"}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left */}
            <div className="md:col-span-8 space-y-6">
              <div className="bg-card p-6 rounded-xl border border-border/70 shadow-card">
                <h3 className="font-display text-lg font-semibold text-foreground mb-5 flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="flex items-center gap-2"><User className="h-[18px] w-[18px] text-primary" /> Patient Details</span>
                  <button type="button" onClick={() => { setTempRequiredFields(requiredFields); setIsSettingsOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50">
                    <Settings className="h-4 w-4" />
                  </button>
                </h3>

                {registerError && (
                  <div className="mb-5 flex items-center gap-3 rounded-lg bg-destructive/8 border border-destructive/20 p-3.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /><p className="font-medium">{registerError}</p>
                  </div>
                )}

                <form onSubmit={handleRegisterPatient} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Full Name {requiredFields.patientName && <span className="text-primary">*</span>}</label>
                    <div className="flex gap-2">
                      <Select value={designation} onValueChange={setDesignation} disabled={registering || !!newPatient}>
                        <SelectTrigger className="w-[85px] h-[42px] border-border bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                          <SelectItem value="Prof.">Prof.</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                        <input className={fieldClass} placeholder="e.g. Adeel Ahmad" value={patientName} onChange={(e) => setPatientName(e.target.value)} disabled={registering || !!newPatient} required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Age {requiredFields.age && <span className="text-primary">*</span>}</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                        <input className={fieldClass} placeholder="21" type="number" value={age} onChange={(e) => setAge(e.target.value)} disabled={registering || !!newPatient} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gender {requiredFields.gender && <span className="text-primary">*</span>}</label>
                      <Select value={gender} onValueChange={setGender} disabled={registering || !!newPatient}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone Number {requiredFields.phone && <span className="text-primary">*</span>}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <input className={fieldClass} placeholder="e.g. +91 98765 43210" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={registering || !!newPatient} required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Referred By (Dr.) {requiredFields.refDoctorSelect && <span className="text-primary">*</span>}</label>
                    <div className="flex flex-col gap-2">
                      <Select value={refDoctorSelect} onValueChange={setRefDoctorSelect} disabled={registering || !!newPatient}>
                        <SelectTrigger className="w-full h-[42px] border-border bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {uniqueDoctors.map(doc => <SelectItem key={doc} value={doc}>{doc}</SelectItem>)}
                          <SelectItem value="ADD_NEW" className="text-primary font-semibold">+ Add New Doctor...</SelectItem>
                        </SelectContent>
                      </Select>
                      {refDoctorSelect === "ADD_NEW" && (
                        <div className="relative">
                          <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                          <input className={fieldClass} placeholder="e.g. Dr. Anvwar" value={customRefDoctor} onChange={(e) => setCustomRefDoctor(e.target.value)} disabled={registering || !!newPatient} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Collected At {requiredFields.collectedAtSelect && <span className="text-primary">*</span>}</label>
                    <div className="flex flex-col gap-2">
                      <Select value={collectedAtSelect} onValueChange={setCollectedAtSelect} disabled={registering || !!newPatient}>
                        <SelectTrigger className="w-full h-[42px] border-border bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {uniqueAddresses.map(addr => <SelectItem key={addr} value={addr}>{addr}</SelectItem>)}
                          <SelectItem value="ADD_NEW" className="text-primary font-semibold">+ Add New Address...</SelectItem>
                        </SelectContent>
                      </Select>
                      {collectedAtSelect === "ADD_NEW" && (
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                          <input className={fieldClass} placeholder="Enter custom address" value={customCollectedAt} onChange={(e) => setCustomCollectedAt(e.target.value)} disabled={registering || !!newPatient} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Residential Address {requiredFields.address && <span className="text-primary">*</span>}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <input className={fieldClass} placeholder="Enter complete patient home address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={registering || !!newPatient} />
                    </div>
                  </div>

                  {!newPatient && (
                    <div className="sm:col-span-2 flex justify-end pt-4 border-t border-border/60">
                      <button type="submit" disabled={registering}
                        className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-lg ring-inset-top transition-all hover:-translate-y-px active:scale-[0.99] flex items-center gap-2 disabled:opacity-60">
                        {registering ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving Patient…</>) : (<>Save & Continue <ArrowRight className="h-4 w-4" /></>)}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Test trigger */}
              <div
                onClick={() => newPatient && setIsModalOpen(true)}
                className={`p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${newPatient ? "bg-card border-primary/40 hover:bg-accent/40 cursor-pointer group" : "bg-muted/20 border-border opacity-60 cursor-not-allowed"
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform ${newPatient ? "bg-accent text-primary group-hover:scale-110" : "bg-muted text-muted-foreground"}`}>
                  <BookOpen className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">Select Clinical Tests</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {newPatient ? "Patient saved. Open the catalog to assign diagnostic investigations." : "Save patient details above to unlock the test catalog."}
                </p>
                {newPatient && (
                  <span className="mt-4 px-5 py-2 border border-primary/40 text-primary rounded-lg font-semibold text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-all">Open Test Catalog</span>
                )}
              </div>
            </div>

            {/* Right: billing summary */}
            <div className="md:col-span-4 space-y-6 md:sticky md:top-4">
              <div className="bg-card rounded-xl border border-border/70 shadow-card flex flex-col overflow-hidden">
                <div className="bg-muted/40 px-4 py-3.5 border-b border-border/60">
                  <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Billing Summary
                  </h3>
                </div>

                <div className="p-4 flex-grow min-h-[160px] max-h-[250px] overflow-y-auto">
                  {selectedTestObjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6 text-muted-foreground">
                      <FlaskConical className="h-10 w-10 opacity-25 mb-2" />
                      <p className="text-xs">No tests selected yet.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {selectedTestObjects.map((test) => (
                        <li key={test.id} className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{test.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{test.category}</p>
                          </div>
                          <span className="font-mono text-xs text-foreground font-semibold">₹{test.price.toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 bg-muted/40 border-t border-border/60">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono font-semibold text-foreground">₹{subtotal.toFixed(2)}</span></div>
                    {parsedDiscount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span className="font-mono font-semibold">-₹{parsedDiscount.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between items-center pt-3 mt-3 border-t border-border/60 mb-4">
                    <span className="font-semibold text-sm text-foreground">Total</span>
                    <span className="font-display text-2xl font-semibold text-primary tnum">₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={handleConfirmBooking} disabled={selectedTests.length === 0 || booking || !newPatient}
                    className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm ring-inset-top hover:-translate-y-px active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                    {booking ? (<><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>) : (<>Register & Create Bill <ArrowRight className="h-4 w-4" /></>)}
                  </button>
                </div>
              </div>

              <div className="bg-gold/8 border border-gold/25 p-4 rounded-xl flex gap-3">
                <AlertCircle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Clinical chemistry reports take 4–6 hours. Ensure the patient is fasting for glucose panels.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Success */
        <div className="bg-card border border-border/70 shadow-card text-center p-10 max-w-xl mx-auto rounded-xl animate-fade-in">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground">Booking Confirmed</h2>
          <p className="text-sm text-muted-foreground mt-2">The diagnostic file and invoice have been created.</p>

          <div className="bg-muted/40 border border-border/60 rounded-lg p-5 grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mt-6">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Patient ID</p>
              <p className="text-sm font-bold text-foreground font-mono">{successDetails?.patientCustomId}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-sm font-bold text-foreground font-mono">{successDetails?.billCustomId}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/dashboard/billing">
              <button className="w-full sm:w-auto h-10 px-5 border border-border bg-card hover:bg-accent hover:text-accent-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all text-foreground">
                <Printer className="h-4 w-4" /> View Invoice
              </button>
            </Link>
            <Link href={`/dashboard/reports/${successDetails?.reportId}/edit`}>
              <button className="w-full sm:w-auto h-10 px-5 gradient-primary text-primary-foreground text-xs font-semibold rounded-lg ring-inset-top flex items-center justify-center gap-2 transition-all hover:-translate-y-px">
                <FileText className="h-4 w-4" /> Enter Results
              </button>
            </Link>
          </div>
          <button className="mt-6 text-xs text-primary font-semibold hover:underline" onClick={handleResetFlow}>Register Another Patient</button>
        </div>
      )}

      {/* Test selection modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">Select Tests</DialogTitle>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 shrink-0 bg-muted/30">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Select Tests</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Patient: <strong className="text-foreground">{newPatient?.name}</strong> · {newPatient?.customId}
              </p>
            </div>
          </div>

          {bookingError && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg bg-destructive/8 border border-destructive/20 p-3 text-sm text-destructive shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" /><p className="font-medium">{bookingError}</p>
            </div>
          )}

          <div className="p-4 border-b border-border/60 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                placeholder="Search by test name or category…" value={testSearch} onChange={(e) => setTestSearch(e.target.value)} />
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
                    <span>{category}</span><div className="h-px flex-1 bg-border" />
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tests.map((test) => {
                      const selected = selectedTests.includes(test.id);
                      return (
                        <div key={test.id} className="flex flex-col gap-1">
                          <div onClick={() => handleToggleTest(test.id)}
                            className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer select-none transition-all ${selected ? "bg-accent border-primary/50" : "bg-card border-border hover:border-primary/30"
                              }`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox checked={selected} onCheckedChange={() => handleToggleTest(test.id)} onClick={(e) => e.stopPropagation()} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{test.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{test.subTests?.length ? `${test.subTests.length} Parameters` : `Ref ${test.refRangeMin}–${test.refRangeMax}`}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-foreground shrink-0">₹{test.price.toFixed(0)}</span>
                              {test.subTests && test.subTests.length > 0 && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedTests(prev => ({ ...prev, [test.id]: !prev[test.id] })) }} className="p-1 rounded hover:bg-muted text-muted-foreground">
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
                                  <div key={sub.id} onClick={() => { if (!selected) handleToggleTest(sub.id) }}
                                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer ${subSelected ? "bg-accent/50 border-primary/30" : "bg-card border-transparent hover:border-border"
                                      } ${selected ? "opacity-60 cursor-not-allowed" : ""}`}>
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
                <input type="number" placeholder="0" className="h-9 w-24 text-xs border border-border rounded-lg px-2.5 bg-background text-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={booking} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Payment</label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus} disabled={booking}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="UNPAID">Unpaid</SelectItem><SelectItem value="PAID">Paid</SelectItem><SelectItem value="PARTIAL">Partial</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-between w-full sm:w-auto sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grand Total</p>
                <p className="font-display text-xl font-semibold text-primary tnum">₹{grandTotal.toFixed(2)}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2.5 rounded-lg ring-inset-top hover:-translate-y-px transition-all">Done</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Form Settings</DialogTitle>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> Form Settings
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Select which fields should be mandatory when registering a patient.</p>
            </div>

            <div className="space-y-3 py-2">
              {[
                { id: 'patientName', label: 'Full Name' },
                { id: 'age', label: 'Age' },
                { id: 'gender', label: 'Gender' },
                { id: 'phone', label: 'Phone Number' },
                { id: 'refDoctorSelect', label: 'Referred By (Dr.)' },
                { id: 'collectedAtSelect', label: 'Collected At' },
                { id: 'address', label: 'Residential Address' },
              ].map(field => (
                <div key={field.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <span className="text-sm font-medium">{field.label}</span>
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
                className="gradient-primary text-primary-foreground font-semibold text-xs px-5 py-2 rounded-lg ring-inset-top hover:-translate-y-px transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
