"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Stethoscope, MapPin, Phone, User, Hash, FlaskConical, CheckCircle2,
  Loader2, Printer, FileText, AlertCircle, ArrowRight, Search, BookOpen, Settings,
  ChevronDown, ChevronRight, PlusCircle, Edit2, Trash2, UserCheck, Building, Sparkles,
  Percent, DollarSign, Receipt, RefreshCw, X, Check,
  Mail, Shield, CreditCard, Building2, Calendar, CheckSquare, RotateCcw,
  ClipboardList, Asterisk, Activity, Scale, Ruler, HeartPulse, ShieldCheck, Tag
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import { fetchFromLaravel } from "@/lib/api-client";
import {
  ALL_DESIGNATIONS,
  DEFAULT_INTAKE_FIELDS,
  type IntakeFieldConfig,
  normalizeReportSettings
} from "@/lib/report-settings";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { printInvoiceElement } from "@/lib/print-invoice";

interface Test {
  id: string; name: string; category: string; price: number;
  unit: string | null; refRangeMin: number | null; refRangeMax: number | null;
  subTests?: Test[];
}
interface Patient {
  id: string; customId: string; name: string; age: number;
  gender: string; phone: string; refDoctor: string; address?: string; collectedAt?: string;
  [key: string]: any;
}

const defaultDoctors = ["Self", "Dr. Rajesh Sharma", "Dr. Amit Verma", "Dr. Anjali Gupta", "Dr. S. K. Roy"];
const defaultCollectionPoints = ["Main Lab", "Home Collection", "Hospital OPD", "Branch 1 - City Center"];
const defaultPhlebotomists = ["Self / Lab Staff", "Rahul Phlebotomist", "Pooja Sharma (Tech)", "Vikram Collector"];

export default function RegisterPatientPage() {
  // Dynamic Intake Field Rules State
  const [intakeFields, setIntakeFields] = useState<IntakeFieldConfig[]>(DEFAULT_INTAKE_FIELDS);
  const [tempIntakeFields, setTempIntakeFields] = useState<IntakeFieldConfig[]>(DEFAULT_INTAKE_FIELDS);
  const [intakeCategoryTab, setIntakeCategoryTab] = useState<string>("ALL");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingIntakeRules, setSavingIntakeRules] = useState(false);

  // Demographics
  const [designation, setDesignation] = useState("Mr.");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [ageDays, setAgeDays] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");

  // Referrals & Logistics
  const [doctorsList, setDoctorsList] = useState<string[]>(defaultDoctors);
  const [refDoctorSelect, setRefDoctorSelect] = useState("Self");
  const [secondReferral, setSecondReferral] = useState("");
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

  // Identification & Corporate
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [insuranceNo, setInsuranceNo] = useState("");
  const [tpa, setTpa] = useState("");
  const [hfrId, setHfrId] = useState("");
  const [uhid, setUhid] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [corporatePlan, setCorporatePlan] = useState("");
  const [govPanel, setGovPanel] = useState("");

  // Physical Metrics & Veterinary
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [breed, setBreed] = useState("");
  const [species, setSpecies] = useState("");

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [labInfo, setLabInfo] = useState<any>(null);
  const registerPrintRef = useRef<HTMLDivElement>(null);

  // Booking & Test Selection State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Patient | null>(null);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    patientCustomId: string;
    billCustomId: string;
    reportId: string;
    billId: string;
    total: number;
    discount: number;
    paidAmount: number;
    balanceDue: number;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    patientPhone?: string;
    patientAddress?: string;
    refDoctor?: string;
    collectedAt?: string;
    tests?: Array<{ id: string; name: string; category: string; price: number }>;
  } | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const isFieldEnabled = (key: string) => {
    const f = intakeFields.find(item => item.key === key);
    return f ? f.enabled : false;
  };

  const isFieldRequired = (key: string) => {
    const f = intakeFields.find(item => item.key === key);
    return f ? f.enabled && f.required : false;
  };

  const handleToggleTempIntakeField = (key: string, property: "enabled" | "required" | "showOnReport") => {
    setTempIntakeFields(prev => {
      return prev.map(item => {
        if (item.key !== key) return item;
        const newVal = !item[property];
        const nextItem = { ...item, [property]: newVal };
        if (property === "enabled" && !newVal) {
          nextItem.required = false;
        }
        return nextItem;
      });
    });
  };

  const handleSaveIntakeRulesModal = async () => {
    try {
      setSavingIntakeRules(true);
      setIntakeFields(tempIntakeFields);
      localStorage.setItem("lis_intake_fields", JSON.stringify(tempIntakeFields));

      if (labInfo) {
        const currentReportSettings = labInfo.report_settings || labInfo.reportSettings || {};
        const updatedReportSettings = {
          ...currentReportSettings,
          intakeFields: tempIntakeFields,
        };
        await fetchFromLaravel("/lab", {
          method: "PUT",
          body: JSON.stringify({
            report_settings: updatedReportSettings,
          }),
        });
      }
      setIsSettingsOpen(false);
    } catch (e) {
      console.error("Error saving intake rules:", e);
      setIsSettingsOpen(false);
    } finally {
      setSavingIntakeRules(false);
    }
  };

  useEffect(() => {
    const savedIntake = localStorage.getItem("lis_intake_fields");
    if (savedIntake) {
      try {
        const parsed = JSON.parse(savedIntake);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIntakeFields(parsed);
          setTempIntakeFields(parsed);
        }
      } catch (e) { }
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
        const data = await fetchFromLaravel("/tests");
        const list = Array.isArray(data) ? data : (data?.data || []);
        setAvailableTests(list);
      } catch (err) { console.error("Error fetching tests:", err); }

      try {
        const lab = await fetchFromLaravel("/lab");
        if (lab) {
          setLabInfo(lab);
          const rawSettings = lab?.report_settings || lab?.reportSettings;
          if (rawSettings) {
            const normalized = normalizeReportSettings(rawSettings);
            if (normalized.intakeFields && normalized.intakeFields.length > 0) {
              setIntakeFields(normalized.intakeFields);
              setTempIntakeFields(normalized.intakeFields);
            }
            if (normalized.defaultDesignation) {
              setDesignation(normalized.defaultDesignation);
            }
          }
        }
      } catch (err) { console.error("Error fetching lab defaults:", err); }
    })();
  }, []);

  // Doctor Helpers
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

    const missing: string[] = [];
    if (isFieldRequired("name") && !firstName.trim()) missing.push("First Name");
    if (isFieldRequired("ageGender") && (!ageYears && !ageMonths && !ageDays)) missing.push("Age");
    if (isFieldRequired("phone") && !phone.trim()) missing.push("Phone Number");
    if (isFieldRequired("email") && !email.trim()) missing.push("Email Address");
    if (isFieldRequired("address") && !address.trim()) missing.push("Residential Address");
    if (isFieldRequired("pincode") && !pincode.trim()) missing.push("Pincode");
    if (isFieldRequired("city") && !city.trim()) missing.push("City / Town");
    if (isFieldRequired("district") && !district.trim()) missing.push("District");
    if (isFieldRequired("refDoctor") && !refDoctorSelect) missing.push("Referred By");
    if (isFieldRequired("secondReferral") && !secondReferral.trim()) missing.push("Second Referral");
    if (isFieldRequired("collectedAt") && !collectedAtSelect) missing.push("Collection Center");
    if (isFieldRequired("collectedBy") && !collectedBySelect) missing.push("Sample Collected By");
    if (isFieldRequired("aadhaarNo") && !aadhaarNo.trim()) missing.push("Aadhaar No.");
    if (isFieldRequired("insuranceNo") && !insuranceNo.trim()) missing.push("Insurance Policy No.");
    if (isFieldRequired("tpa") && !tpa.trim()) missing.push("TPA / Insurance Desk");
    if (isFieldRequired("hfrId") && !hfrId.trim()) missing.push("HFR / ABHA Health ID");
    if (isFieldRequired("uhid") && !uhid.trim()) missing.push("UHID");
    if (isFieldRequired("passportNumber") && !passportNumber.trim()) missing.push("Passport Number");
    if (isFieldRequired("corporateName") && !corporateName.trim()) missing.push("Corporate Client");
    if (isFieldRequired("corporatePlan") && !corporatePlan.trim()) missing.push("Corporate Plan");
    if (isFieldRequired("govPanel") && !govPanel.trim()) missing.push("Government Panel");
    if (isFieldRequired("height") && !height.trim()) missing.push("Height");
    if (isFieldRequired("weight") && !weight.trim()) missing.push("Weight");
    if (isFieldRequired("ownerName") && !ownerName.trim()) missing.push("Owner Name");
    if (isFieldRequired("breed") && !breed.trim()) missing.push("Breed");
    if (isFieldRequired("species") && !species.trim()) missing.push("Species");

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
          phone: phone.trim() || "N/A",
          email: email.trim() || null,
          refDoctor: refDoctorSelect || "Self",
          secondReferral: secondReferral.trim() || null,
          address: address.trim() || "N/A",
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          collectedAt: `${collectedAtSelect} (${collectedBySelect})`,
          collectedBy: collectedBySelect || null,
          aadhaarNo: aadhaarNo.trim() || null,
          insuranceNo: insuranceNo.trim() || null,
          tpa: tpa.trim() || null,
          hfrId: hfrId.trim() || null,
          uhid: uhid.trim() || null,
          passportNumber: passportNumber.trim() || null,
          corporateName: corporateName.trim() || null,
          corporatePlan: corporatePlan.trim() || null,
          govPanel: govPanel.trim() || null,
          height: height.trim() || null,
          weight: weight.trim() || null,
          ownerName: ownerName.trim() || null,
          breed: breed.trim() || null,
          species: species.trim() || null,
        }),
      });

      const patientObj: Patient = {
        id: data.id,
        customId: data.customId || data.custom_id || data.customID || "",
        name: data.name || fullName,
        age: calculatedAge,
        gender,
        phone: phone.trim() || "N/A",
        email: email.trim() || undefined,
        refDoctor: refDoctorSelect || "Self",
        secondReferral: secondReferral.trim() || undefined,
        address: address.trim() || "N/A",
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        pincode: pincode.trim() || undefined,
        collectedAt: `${collectedAtSelect} (${collectedBySelect})`,
        collectedBy: collectedBySelect || undefined,
        aadhaarNo: aadhaarNo.trim() || undefined,
        insuranceNo: insuranceNo.trim() || undefined,
        hfrId: hfrId.trim() || undefined,
        corporateName: corporateName.trim() || undefined,
      };

      setNewPatient(patientObj);
      setRegistering(false);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setRegisterError(err.message || "Failed to register patient. Please verify your details.");
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

  const subtotal = selectedTestObjects.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  const parsedDiscount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const grandTotal = Math.max(0, subtotal - parsedDiscount);
  const parsedPaid = Math.min(grandTotal, Math.max(0, parseFloat(paidAmount) || 0));
  const balanceDue = Math.max(0, grandTotal - parsedPaid);

  const handleConfirmBooking = async () => {
    if (!newPatient) return;
    setBookingError(null);
    setBooking(true);
    try {
      const computedStatus = parsedPaid >= grandTotal ? "PAID" : (parsedPaid > 0 ? "PARTIAL" : "UNPAID");

      const report = await fetchFromLaravel("/reports", {
        method: "POST",
        body: JSON.stringify({
          patientId: newPatient.id,
          testIds: selectedTests,
          total: grandTotal,
          discount: parsedDiscount,
          paidAmount: parsedPaid,
          paymentStatus: computedStatus
        }),
      });

      const assignedBillCustomId = report.bill?.customId || report.bill?.custom_id || report.customId || report.custom_id || "INV-CONFIRMED";
      const assignedPatientCustomId = newPatient.customId || (newPatient as any).custom_id || "";

      setBookingSuccess(true);
      setSuccessDetails({
        patientCustomId: assignedPatientCustomId,
        billCustomId: assignedBillCustomId,
        reportId: report.id,
        billId: report.bill?.id || report.id,
        total: grandTotal,
        discount: parsedDiscount,
        paidAmount: parsedPaid,
        balanceDue: balanceDue,
        patientName: newPatient.name,
        patientAge: newPatient.age,
        patientGender: newPatient.gender,
        patientPhone: newPatient.phone,
        patientAddress: newPatient.address,
        refDoctor: newPatient.refDoctor,
        collectedAt: newPatient.collectedAt,
        tests: selectedTestObjects.map(t => ({ id: t.id, name: t.name, category: t.category, price: Number(t.price) || 0 })),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Booking error:", err);
      setBookingError(err.message || "Failed to complete booking and create invoice.");
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
    setPaidAmount("0");
    setPaymentStatus("UNPAID");
    setBookingSuccess(false);
    setSuccessDetails(null);
    setIsPrintModalOpen(false);
  };

  // Grouping & Filtering Tests
  const normalizeCat = (cat?: string) => {
    if (!cat) return "General Pathology";
    const trimmed = cat.trim();
    if (/^haematology$/i.test(trimmed) || /^hematology$/i.test(trimmed)) return "Hematology";
    return trimmed;
  };

  const categories = Array.from(new Set(availableTests.map((t) => normalizeCat(t.category)).filter(Boolean)));
  const groupedTests: Record<string, Test[]> = {};
  availableTests.forEach((test) => {
    const cat = normalizeCat(test.category);
    (groupedTests[cat] ||= []).push(test);
  });

  const getFilteredGroupedTests = () => {
    const term = testSearch.toLowerCase().trim();
    const filtered: Record<string, Test[]> = {};
    Object.entries(groupedTests).forEach(([category, tests]) => {
      if (activeCategory !== "ALL" && normalizeCat(category) !== normalizeCat(activeCategory)) return;
      const matches = tests.filter((t) =>
        !term || t.name.toLowerCase().includes(term) || (t.category && t.category.toLowerCase().includes(term))
      );
      if (matches.length > 0) filtered[category] = matches;
    });
    return filtered;
  };
  const filteredGroups = getFilteredGroupedTests();

  const steps = [
    { n: 1, label: "Patient Intake", done: true },
    { n: 2, label: "Test Directory", done: !!newPatient },
    { n: 3, label: "Invoice & Barcode", done: bookingSuccess },
  ];

  return (
    <div className="w-full space-y-7 pb-12 animate-fade-in text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Diagnostic Intake Flow</p>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Register Patient & Clinical Investigations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Capture demographics, assign pathology investigations, apply concessions, and issue billing receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTempIntakeFields(intakeFields.map(f => ({ ...f })));
              setIsSettingsOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/90 bg-card hover:bg-accent text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
          >
            <Settings className="h-4 w-4 text-primary" />
            <span>Intake Field Rules</span>
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
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    s.done ? "gradient-primary text-primary-foreground shadow-md ring-2 ring-primary/20" : "bg-muted text-muted-foreground border border-border/90"
                  }`}>
                    {s.done && s.n !== (newPatient && !bookingSuccess ? 2 : s.n) ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <span className={`text-[11px] font-bold ${s.done ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-3 mb-5 rounded transition-colors ${steps[i + 1].done ? "bg-primary" : "bg-border/90"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Main Full-Width Intake Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Cols: High-Contrast Seamless Form */}
            <div className="lg:col-span-8 space-y-6">
              
              {registerError && (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive font-medium shadow-sm animate-fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p>{registerError}</p>
                </div>
              )}

              {newPatient && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/30 text-foreground animate-fade-in shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Patient Active in Intake Buffer</p>
                      <p className="text-sm font-bold text-foreground">{newPatient.name} <span className="font-mono text-xs text-muted-foreground font-semibold">({newPatient.customId})</span></p>
                    </div>
                  </div>
                  <button onClick={handleResetFlow} className="text-xs font-bold text-primary hover:underline">
                    Reset / Register Fresh
                  </button>
                </div>
              )}

              <form onSubmit={handleRegisterPatient} className="space-y-6 bg-card/80 p-6 sm:p-7 rounded-2xl border border-border/90 shadow-sm">
                
                {/* Section 1: Demographics */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <User className="h-4 w-4 text-primary" />
                      <span>Patient Identity & Demographics</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                      Step 1
                    </span>
                  </div>

                  {/* Title, First Name, Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Title <span className="text-primary">*</span>
                      </label>
                      <Select value={designation} onValueChange={setDesignation} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {ALL_DESIGNATIONS.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        First Name {isFieldRequired("name") && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                          placeholder="Enter First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={registering || !!newPatient}
                          required={isFieldRequired("name")}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                        placeholder="Enter Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={registering || !!newPatient}
                      />
                    </div>
                  </div>

                  {/* Age (Y/M/D) & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    
                    {/* Age Breakdown */}
                    <div className="sm:col-span-7 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Age (Years / Months / Days) {isFieldRequired("ageGender") && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            placeholder="Years"
                            className="w-full text-center h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-bold shadow-2xs"
                            value={ageYears}
                            onChange={(e) => setAgeYears(e.target.value)}
                            disabled={registering || !!newPatient}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">Y</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="11"
                            placeholder="Months"
                            className="w-full text-center h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-bold shadow-2xs"
                            value={ageMonths}
                            onChange={(e) => setAgeMonths(e.target.value)}
                            disabled={registering || !!newPatient}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">M</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            placeholder="Days"
                            className="w-full text-center h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-bold shadow-2xs"
                            value={ageDays}
                            onChange={(e) => setAgeDays(e.target.value)}
                            disabled={registering || !!newPatient}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none">D</span>
                        </div>
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="sm:col-span-5 space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Gender {isFieldRequired("ageGender") && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <Select value={gender} onValueChange={setGender} disabled={registering || !!newPatient}>
                        <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
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

                  {/* Phone & Email (if enabled) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {isFieldEnabled("phone") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Phone Number {isFieldRequired("phone") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="tel"
                            className="w-full pl-10 pr-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter 10-digit Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("phone")}
                          />
                        </div>
                      </div>
                    )}

                    {isFieldEnabled("email") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Email ID {isFieldRequired("email") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="email"
                            className="w-full pl-10 pr-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="patient@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("email")}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address (if enabled) */}
                  {isFieldEnabled("address") && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Residential Address {isFieldRequired("address") && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <textarea
                          rows={2}
                          className="w-full pl-10 pr-4 py-2.5 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs resize-none"
                          placeholder="Enter Complete Residential Address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={registering || !!newPatient}
                          required={isFieldRequired("address")}
                        />
                      </div>
                    </div>
                  )}

                  {/* City, District, Pincode (if enabled) */}
                  {(isFieldEnabled("city") || isFieldEnabled("district") || isFieldEnabled("pincode")) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {isFieldEnabled("city") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Town / City {isFieldRequired("city") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter Town/City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("city")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("district") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            District {isFieldRequired("district") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter District"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("district")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("pincode") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Pincode {isFieldRequired("pincode") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="6-digit PIN"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("pincode")}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Clinical Referrals & Sample Collection Logistics */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <span>Referral & Sample Collection Protocol</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                      Step 2
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Doctor Referral */}
                    {isFieldEnabled("refDoctor") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Referred By {isFieldRequired("refDoctor") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <Select value={refDoctorSelect} onValueChange={setRefDoctorSelect} disabled={registering || !!newPatient}>
                          <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
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
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-0.5"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Manage Doctors</span>
                        </button>
                      </div>
                    )}

                    {/* Second Referral */}
                    {isFieldEnabled("secondReferral") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Second Referral {isFieldRequired("secondReferral") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                          placeholder="Secondary Doctor / Clinic"
                          value={secondReferral}
                          onChange={(e) => setSecondReferral(e.target.value)}
                          disabled={registering || !!newPatient}
                          required={isFieldRequired("secondReferral")}
                        />
                      </div>
                    )}

                    {/* Collection Center */}
                    {isFieldEnabled("collectedAt") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Collection Center {isFieldRequired("collectedAt") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <Select value={collectedAtSelect} onValueChange={setCollectedAtSelect} disabled={registering || !!newPatient}>
                          <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
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
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-0.5"
                        >
                          <Building className="h-3.5 w-3.5" />
                          <span>Manage Points</span>
                        </button>
                      </div>
                    )}

                    {/* Phlebotomist / Collector */}
                    {isFieldEnabled("collectedBy") && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                          Collected By {isFieldRequired("collectedBy") && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <Select value={collectedBySelect} onValueChange={setCollectedBySelect} disabled={registering || !!newPatient}>
                          <SelectTrigger className="h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl font-medium text-foreground focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white shadow-2xs">
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
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline pt-0.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Manage Staff</span>
                        </button>
                      </div>
                    )}

                  </div>
                </div>

                {/* Section 3: Identification, Insurance & Corporate Accounts (if enabled) */}
                {(isFieldEnabled("aadhaarNo") || isFieldEnabled("insuranceNo") || isFieldEnabled("tpa") || isFieldEnabled("hfrId") || isFieldEnabled("uhid") || isFieldEnabled("passportNumber") || isFieldEnabled("corporateName") || isFieldEnabled("corporatePlan") || isFieldEnabled("govPanel")) && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Identification, Insurance & Corporate Accounts</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                        Step 3
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {isFieldEnabled("aadhaarNo") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Aadhaar No. {isFieldRequired("aadhaarNo") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            maxLength={16}
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter 12-digit Aadhaar / ID"
                            value={aadhaarNo}
                            onChange={(e) => setAadhaarNo(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("aadhaarNo")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("insuranceNo") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Insurance Policy No. {isFieldRequired("insuranceNo") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter Policy / Card Number"
                            value={insuranceNo}
                            onChange={(e) => setInsuranceNo(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("insuranceNo")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("tpa") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            TPA / Insurance Desk {isFieldRequired("tpa") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter TPA Name"
                            value={tpa}
                            onChange={(e) => setTpa(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("tpa")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("hfrId") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            HFR / ABHA Health ID {isFieldRequired("hfrId") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Enter HFR ID / ABHA"
                            value={hfrId}
                            onChange={(e) => setHfrId(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("hfrId")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("uhid") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            UHID (Hospital ID) {isFieldRequired("uhid") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Unique Hospital ID"
                            value={uhid}
                            onChange={(e) => setUhid(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("uhid")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("passportNumber") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Passport Number {isFieldRequired("passportNumber") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Passport Number"
                            value={passportNumber}
                            onChange={(e) => setPassportNumber(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("passportNumber")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("corporateName") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Corporate Client {isFieldRequired("corporateName") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Company / Corporate Name"
                            value={corporateName}
                            onChange={(e) => setCorporateName(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("corporateName")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("corporatePlan") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Corporate Plan {isFieldRequired("corporatePlan") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Corporate Plan Type"
                            value={corporatePlan}
                            onChange={(e) => setCorporatePlan(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("corporatePlan")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("govPanel") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Government Panel {isFieldRequired("govPanel") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="CGHS / ECHS / State Panel"
                            value={govPanel}
                            onChange={(e) => setGovPanel(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("govPanel")}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4: Physical Metrics & Veterinary Records (if enabled) */}
                {(isFieldEnabled("height") || isFieldEnabled("weight") || isFieldEnabled("ownerName") || isFieldEnabled("breed") || isFieldEnabled("species")) && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Activity className="h-4 w-4 text-primary" />
                        <span>Physical Metrics & Veterinary Details</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                        Step 4
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {isFieldEnabled("height") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Height (cm / ft) {isFieldRequired("height") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="e.g. 175 cm"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("height")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("weight") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Weight (kg) {isFieldRequired("weight") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="e.g. 70 kg"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("weight")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("ownerName") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Owner Name (Vet) {isFieldRequired("ownerName") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Pet / Animal Owner"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("ownerName")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("breed") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Breed {isFieldRequired("breed") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="e.g. Labrador / Persian"
                            value={breed}
                            onChange={(e) => setBreed(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("breed")}
                          />
                        </div>
                      )}

                      {isFieldEnabled("species") && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                            Species {isFieldRequired("species") && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 h-11 bg-background border border-zinc-400 dark:border-zinc-600 rounded-xl text-sm placeholder:text-muted-foreground/50 focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none text-foreground font-medium transition-all shadow-2xs"
                            placeholder="Canine / Feline / Bovine"
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                            disabled={registering || !!newPatient}
                            required={isFieldRequired("species")}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Action CTA */}
                {!newPatient && (
                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-border/80">
                    <button
                      type="submit"
                      disabled={registering}
                      className="gradient-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl ring-inset-top transition-all hover:-translate-y-px hover:shadow-lg active:scale-[0.99] flex items-center gap-2 disabled:opacity-60 text-sm shadow-md cursor-pointer"
                    >
                      {registering ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving Demographics…</span>
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
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  newPatient
                    ? "bg-accent/60 border-primary cursor-pointer shadow-md hover:bg-accent/80"
                    : "bg-muted/30 border-dashed border-border/80 opacity-70 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 p-3.5 shadow-sm ${
                    newPatient ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                  }`}>
                    <FlaskConical className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">Diagnostic Investigation Catalog</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {newPatient
                        ? `${selectedTestObjects.length} investigations linked. Click here to add, search or modify panels.`
                        : "Save the patient intake form above to unlock full test investigations."}
                    </p>
                  </div>
                </div>

                {newPatient && (
                  <span className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-xs shrink-0 shadow-sm flex items-center gap-2">
                    <span>Manage Tests ({selectedTestObjects.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

            </div>

            {/* Right 4 Cols: Real-Time Billing & Invoicing Panel */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">
              
              <div className="rounded-2xl border border-border/90 bg-card shadow-sm overflow-hidden">
                <div className="bg-muted/60 px-5 py-4 border-b border-border/80 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Real-time Invoice Summary</span>
                  </h3>
                  {selectedTestObjects.length > 0 && (
                    <span className="text-[11px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      {selectedTestObjects.length} Tests
                    </span>
                  )}
                </div>

                {/* Selected Tests Breakdown */}
                <div className="p-4 min-h-[160px] max-h-[260px] overflow-y-auto space-y-2">
                  {selectedTestObjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                      <FlaskConical className="h-9 w-9 opacity-30 mb-2" />
                      <p className="text-xs font-semibold">No tests added yet.</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Save patient to select from directory</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {selectedTestObjects.map((test) => (
                        <li key={test.id} className="py-2.5 flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                            <p className="text-[10px] text-muted-foreground">{test.category || "Pathology"}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-foreground">₹{Number(test.price).toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Totals & Quick Pay */}
                <div className="p-5 bg-muted/40 border-t border-border/80 space-y-3.5">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>Gross Subtotal</span>
                      <span className="font-mono font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {parsedDiscount > 0 && (
                      <div className="flex justify-between text-destructive font-semibold">
                        <span>Discount Concession</span>
                        <span className="font-mono">-₹{parsedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-border/80">
                    <span className="font-bold text-sm text-foreground">Net Payable</span>
                    <span className="font-display text-2xl font-bold text-primary font-mono">₹{grandTotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={selectedTests.length === 0 || booking || !newPatient}
                    className="w-full gradient-primary text-primary-foreground py-3.5 rounded-xl font-bold text-xs ring-inset-top hover:-translate-y-px active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 shadow-md"
                  >
                    {booking ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating Invoice & Barcode…</span>
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

              <div className="p-4 rounded-xl border border-border/80 bg-card/60 text-xs text-muted-foreground space-y-1.5">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Clinical Protocol
                </p>
                <p className="leading-relaxed">
                  Upon invoice generation, a unique Barcode and Lab ID will be printed on the patient intake receipt.
                </p>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* Booking Confirmed State (Horizontal Full-Width Premium UI/UX Deck) */
        <div className="max-w-6xl w-full mx-auto space-y-6 animate-fade-in text-foreground pb-8">
          
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary/10 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 text-center sm:text-left">
              <div className="h-16 w-16 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg ring-4 ring-primary/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Registration & Billing Finalized
                  </span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Patient Intake & Diagnostic Order Confirmed
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Patient record and billing receipt successfully created in LIS. Ready for sample processing.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-card border border-border/80 text-right shadow-2xs">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoice / Bill ID</p>
                <p className="font-mono text-base font-bold text-primary">{successDetails?.billCustomId}</p>
              </div>
            </div>
          </div>

          {/* 3-Column Landscape Information Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Column 1: Patient Identity (4 cols) */}
            <div className="lg:col-span-4 bg-card border border-border/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">Patient Profile</h3>
                  <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 bg-muted rounded">
                    {successDetails?.patientCustomId}
                  </span>
                </div>

                <div className="pt-4 space-y-3.5 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</p>
                    <p className="font-bold text-base text-foreground mt-0.5">{successDetails?.patientName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Age & Gender</p>
                      <p className="font-bold text-foreground mt-0.5">
                        {successDetails?.patientAge !== undefined ? `${successDetails.patientAge} Y` : "N/A"} · {successDetails?.patientGender || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone</p>
                      <p className="font-mono font-bold text-foreground mt-0.5">{successDetails?.patientPhone || "N/A"}</p>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Referred By</p>
                    <p className="font-bold text-foreground mt-0.5">{successDetails?.refDoctor || "Self"}</p>
                  </div>

                  <div className="pt-1 border-t border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Collection Point</p>
                    <p className="font-bold text-foreground mt-0.5">{successDetails?.collectedAt || "Main Lab"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Diagnostic Investigations & Financials (4 cols) */}
            <div className="lg:col-span-4 bg-card border border-border/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-foreground">Assigned Investigations</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                    {successDetails?.tests?.length || 0} Tests
                  </span>
                </div>

                {/* Tests List */}
                <div className="pt-3 max-h-[140px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {successDetails?.tests && successDetails.tests.length > 0 ? (
                    successDetails.tests.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-foreground truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.category}</p>
                        </div>
                        <span className="font-mono font-bold text-foreground shrink-0">₹{t.price}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Standard clinical investigation panel</p>
                  )}
                </div>
              </div>

              {/* Financial Tally */}
              <div className="pt-3 border-t border-border/80 space-y-1.5 text-xs bg-muted/20 p-3 rounded-xl">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Total</span>
                  <span className="font-mono">₹{((successDetails?.total || 0) + (successDetails?.discount || 0)).toFixed(2)}</span>
                </div>
                {(successDetails?.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Concession / Discount</span>
                    <span className="font-mono">-₹{(successDetails?.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/60">
                  <span>Net Payable</span>
                  <span className="font-mono text-primary font-extrabold">₹{(successDetails?.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Paid: <strong className="text-foreground font-mono">₹{(successDetails?.paidAmount || 0).toFixed(2)}</strong>
                    {(successDetails?.balanceDue || 0) > 0 && (
                      <span className="text-rose-500 font-bold ml-1.5">(Due: ₹{(successDetails?.balanceDue || 0).toFixed(2)})</span>
                    )}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    (successDetails?.balanceDue || 0) <= 0
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : (successDetails?.paidAmount || 0) > 0
                      ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                      : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                  }`}>
                    {(successDetails?.balanceDue || 0) <= 0 ? "PAID FULL" : (successDetails?.paidAmount || 0) > 0 ? "PARTIAL" : "UNPAID"}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: High-Priority Next Actions (4 cols) */}
            <div className="lg:col-span-4 bg-gradient-to-b from-card to-muted/30 border border-border/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 border-b border-border/80 pb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">Clinical Next Actions</h3>
                </div>

                <div className="pt-4 space-y-3">
                  {/* Action 1: Print Invoice */}
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="w-full p-3.5 rounded-xl border-2 border-primary/40 bg-card hover:bg-primary/5 hover:border-primary text-foreground transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Printer className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Print / Download Invoice</p>
                        <p className="text-[10px] text-muted-foreground">Receipt #{successDetails?.billCustomId}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Action 2: Enter Diagnostic Results */}
                  <Link href={`/dashboard/reports/${successDetails?.reportId}/edit`} className="block">
                    <button
                      type="button"
                      className="w-full p-3.5 rounded-xl gradient-primary text-primary-foreground transition-all flex items-center justify-between group shadow-md hover:-translate-y-0.5 cursor-pointer ring-inset-top"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="h-10 w-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Enter Test Results</p>
                          <p className="text-[10px] text-white/80">Input test values & authorize report</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Bottom Quick Links */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResetFlow}
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Register Fresh</span>
                </button>
                <div className="flex items-center gap-3">
                  <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground font-semibold">
                    Reports List
                  </Link>
                  <span className="text-muted-foreground/40">·</span>
                  <Link href="/dashboard/patients" className="text-muted-foreground hover:text-foreground font-semibold">
                    Patients
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. Test Selection Catalog Modal (Horizontal Landscape) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Diagnostic Test Directory</DialogTitle>
          
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/80 shrink-0 bg-card">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">Pathology Investigation Catalog</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Patient: <strong className="text-foreground">{newPatient?.name}</strong> · <span className="font-mono">{newPatient?.customId}</span>
              </p>
            </div>
          </div>

          {bookingError && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs font-semibold text-destructive shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{bookingError}</p>
            </div>
          )}

          {/* Search & Category Chips */}
          <div className="p-4 border-b border-border/80 shrink-0 space-y-3 bg-card/60">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/90 rounded-lg text-xs placeholder:text-muted-foreground/60 focus:border-primary outline-none text-foreground font-medium"
                placeholder="Search investigation name, profile, or category…"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 ${
                  activeCategory === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full font-bold text-[11px] transition-all shrink-0 ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tests Grid (3 Columns Landscape) */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-background">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <FlaskConical className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-xs font-bold text-foreground">No clinical investigations match your filter.</p>
                <p className="text-[11px]">Try clearing your search query or selecting another category.</p>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([category, tests]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{category}</span>
                    <div className="h-px flex-1 bg-border/80" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tests.map((test) => {
                      const selected = selectedTests.includes(test.id);
                      const paramCount = test.subTests?.reduce((acc: number, st: any) => acc + (st.subTests && st.subTests.length > 0 ? st.subTests.length : 1), 0) ?? (test.subTests?.length || 0);
                      return (
                        <div key={test.id} className="flex flex-col gap-1">
                          <div
                            onClick={() => handleToggleTest(test.id)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                              selected
                                ? "bg-accent/80 border-primary shadow-sm ring-1 ring-primary/30"
                                : "bg-card border-border/90 hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox checked={selected} onCheckedChange={() => handleToggleTest(test.id)} onClick={(e) => e.stopPropagation()} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{test.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {paramCount > 0 ? `${paramCount} Parameters Included` : `Ref ${test.refRangeMin ?? "N/A"}–${test.refRangeMax ?? "N/A"}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground shrink-0">₹{Number(test.price).toFixed(0)}</span>
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
                                      <span className="font-medium">{sub.name}</span>
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

          {/* Pricing & Concession Bottom Bar */}
          <div className="border-t border-border/80 px-6 py-4 shrink-0 bg-muted/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discount Concession (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  placeholder="0"
                  className="h-9 w-28 text-xs font-mono font-bold border border-border/90 rounded-lg px-2.5 bg-background text-foreground focus:border-primary outline-none"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  disabled={booking}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Advance Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  placeholder="0"
                  className="h-9 w-28 text-xs font-mono font-bold border border-border/90 rounded-lg px-2.5 bg-background text-foreground focus:border-primary outline-none"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  disabled={booking}
                />
              </div>
            </div>

            <div className="flex items-center gap-5 justify-between w-full sm:w-auto sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Grand Total</p>
                <p className="font-display text-2xl font-bold text-primary font-mono">₹{grandTotal.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md"
              >
                Done ({selectedTestObjects.length})
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Direct Medical Invoice Print Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:p-0 print:m-0">
          <DialogTitle className="sr-only">Print Invoice</DialogTitle>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Invoice {successDetails?.billCustomId}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Patient: <strong className="text-foreground">{successDetails?.patientName}</strong> ({successDetails?.patientCustomId})
                </p>
              </div>
            </div>
            <button
              onClick={() => printInvoiceElement(registerPrintRef.current, `Invoice_${successDetails?.billCustomId || "Receipt"}`)}
              className="gradient-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:-translate-y-px transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download PDF</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center custom-scrollbar print:p-0 print:m-0 print:bg-white print:overflow-visible">
            <div ref={registerPrintRef} className="shadow-2xl ring-1 ring-border rounded-lg shrink-0 bg-white max-w-full print:shadow-none print:ring-0 print:border-none print:p-0 print:m-0 print:w-full">
              <InvoiceSheet
                invoice={{
                  id: successDetails?.billId,
                  customId: successDetails?.billCustomId || "INV-001",
                  createdAt: new Date().toISOString(),
                  total: grandTotal,
                  discount: parsedDiscount,
                  paidAmount: parsedPaid,
                  status: balanceDue <= 0 ? "PAID" : (parsedPaid > 0 ? "PARTIAL" : "UNPAID"),
                  paymentMode: "CASH / UPI",
                  billedBy: "Billing / Reception Desk",
                  reportId: successDetails?.reportId,
                  patient: {
                    customId: successDetails?.patientCustomId || newPatient?.customId || "",
                    name: successDetails?.patientName || newPatient?.name || "",
                    phone: phone || newPatient?.phone || "",
                    age: Number(ageYears) || newPatient?.age || 0,
                    gender: gender || newPatient?.gender || "Male",
                    refDoctor: refDoctorSelect || newPatient?.refDoctor || "Self",
                    address: address || newPatient?.address || "",
                  },
                  lab: {
                    name: labInfo?.name || labInfo?.centre_name || labInfo?.centreName || "OnePath Pathology Laboratory",
                    email: labInfo?.email || "support@onepathlab.com",
                    address: labInfo?.address || "Medical Diagnostic Center",
                    phone: labInfo?.phone || "",
                    logoUrl: labInfo?.logo_url || labInfo?.logoUrl || "/onepath-logo.png",
                    pincode: labInfo?.pincode || "",
                    city: labInfo?.city || "",
                    district: labInfo?.district || labInfo?.city || "",
                    state: labInfo?.state || "",
                    gstin: labInfo?.gstin || "",
                    bill_settings: labInfo?.bill_settings || labInfo?.billSettings,
                  },
                  tests: selectedTestObjects.map(t => ({
                    id: t.id,
                    name: t.name,
                    code: (t as any).testCode || (t as any).test_code || (t as any).code || `T-${(t.name || "").substring(0, 3).toUpperCase()}`,
                    price: Number(t.price || 0),
                    category: t.category,
                  })),
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Manage Referring Doctors Modal */}
      <Dialog open={isDoctorModalOpen} onOpenChange={setIsDoctorModalOpen}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="sr-only">Manage Referring Doctors</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Manage Referring Doctors</h3>
                <p className="text-xs text-muted-foreground">Add, edit, or remove referring doctors.</p>
              </div>
            </div>

            <form onSubmit={handleAddDoctor} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Doctor Name (e.g. Dr. Name)"
                value={newDoctorInput}
                onChange={(e) => setNewDoctorInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-background border border-border/90 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newDoctorInput.trim()}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {doctorsList.map((doc) => (
                <div key={doc} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card">
                  {editingDoctor?.oldName === doc ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingDoctor.newName}
                        onChange={(e) => setEditingDoctor({ ...editingDoctor, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditDoctor} className="text-xs font-bold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingDoctor(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">{doc}</span>
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

            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Manage Collection Points Modal */}
      <Dialog open={isCollectionModalOpen} onOpenChange={setIsCollectionModalOpen}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="sr-only">Manage Collection Points</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Manage Collection Centers</h3>
                <p className="text-xs text-muted-foreground">Add or modify sample collection points.</p>
              </div>
            </div>

            <form onSubmit={handleAddCollectionPoint} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Collection Point Name"
                value={newCollectionInput}
                onChange={(e) => setNewCollectionInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-background border border-border/90 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newCollectionInput.trim()}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {collectionPoints.map((point) => (
                <div key={point} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card">
                  {editingCollectionPoint?.oldName === point ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingCollectionPoint.newName}
                        onChange={(e) => setEditingCollectionPoint({ ...editingCollectionPoint, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditCollectionPoint} className="text-xs font-bold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingCollectionPoint(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">{point}</span>
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

            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsCollectionModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Manage Phlebotomists Modal */}
      <Dialog open={isPhleboModalOpen} onOpenChange={setIsPhleboModalOpen}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="sr-only">Manage Phlebotomists</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Manage Phlebotomists & Staff</h3>
                <p className="text-xs text-muted-foreground">Add or modify sample collectors & lab technicians.</p>
              </div>
            </div>

            <form onSubmit={handleAddPhlebo} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Phlebotomist / Staff Name"
                value={newPhleboInput}
                onChange={(e) => setNewPhleboInput(e.target.value)}
                className="flex-1 px-3 h-10 bg-background border border-border/90 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={!newPhleboInput.trim()}
                className="gradient-primary text-primary-foreground font-bold text-xs px-4 h-10 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
              {phlebotomists.map((phlebo) => (
                <div key={phlebo} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card">
                  {editingPhlebo?.oldName === phlebo ? (
                    <div className="flex-1 flex gap-2 mr-2">
                      <input
                        type="text"
                        value={editingPhlebo.newName}
                        onChange={(e) => setEditingPhlebo({ ...editingPhlebo, newName: e.target.value })}
                        className="flex-1 px-2 h-8 bg-background border border-border rounded text-xs outline-none"
                      />
                      <button onClick={handleSaveEditPhlebo} className="text-xs font-bold text-primary px-2 bg-primary/10 rounded">Save</button>
                      <button onClick={() => setEditingPhlebo(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-foreground">{phlebo}</span>
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

            <div className="flex justify-end pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsPhleboModalOpen(false)}
                className="gradient-primary text-primary-foreground font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Form Fields Configuration Modal (Horizontal Wide Landscape) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-5xl w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Patient Intake Field Rules</DialogTitle>
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border/80 bg-card shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Patient Intake Fields & Form Rules
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                  Dynamic Fields ({tempIntakeFields.length})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable fields to capture during intake, mark mandatory fields, and toggle report header visibility.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTempIntakeFields(prev => prev.map(f => ({ ...f, enabled: true })))}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                <span>Enable All</span>
              </button>
              <button
                type="button"
                onClick={() => setTempIntakeFields(DEFAULT_INTAKE_FIELDS.map(f => ({ ...f })))}
                className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-border/60 bg-muted/20 shrink-0">
            {[
              { id: "ALL", label: "All Fields", count: tempIntakeFields.length },
              { id: "Demographics", label: "Demographics", count: tempIntakeFields.filter(f => f.category === "Demographics").length },
              { id: "Clinical & Referral", label: "Clinical & Referral", count: tempIntakeFields.filter(f => f.category === "Clinical & Referral").length },
              { id: "Identification & Documents", label: "Identification & ID", count: tempIntakeFields.filter(f => f.category === "Identification & Documents").length },
              { id: "Logistics & Physical", label: "Logistics & Physical", count: tempIntakeFields.filter(f => f.category === "Logistics & Physical").length },
              { id: "Veterinary", label: "Veterinary", count: tempIntakeFields.filter(f => f.category === "Veterinary").length },
            ].map(cat => {
              const isActive = intakeCategoryTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setIntakeCategoryTab(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border inline-flex items-center gap-1.5 cursor-pointer select-none ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-extrabold ring-1 ring-primary/20"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Fields Grid */}
          <div className="flex-1 overflow-y-auto p-6 max-h-[58vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {tempIntakeFields
                .filter(field => intakeCategoryTab === "ALL" || field.category === intakeCategoryTab)
                .map(field => {
                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all space-y-2.5 shadow-2xs ${
                        field.enabled
                          ? "bg-card border-primary/40 ring-1 ring-primary/10"
                          : "bg-muted/20 border-border/70 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-foreground flex items-center gap-1">
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="text-rose-500 font-extrabold text-sm" title="Mandatory Field">*</span>
                            )}
                          </p>
                          <span className="text-[9.5px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            Tag: {field.orderingName}
                          </span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          field.enabled
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}>
                          {field.enabled ? "Active" : "Disabled"}
                        </span>
                      </div>

                      {/* 3 Checkboxes */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px]">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={() => handleToggleTempIntakeField(field.key, "enabled")}
                            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                          />
                          <span className="truncate">Form</span>
                        </label>

                        <label className={`flex items-center gap-1.5 select-none font-semibold ${
                          field.enabled ? "cursor-pointer text-foreground" : "cursor-not-allowed text-muted-foreground opacity-50"
                        }`}>
                          <input
                            type="checkbox"
                            disabled={!field.enabled}
                            checked={field.required}
                            onChange={() => handleToggleTempIntakeField(field.key, "required")}
                            className="h-3.5 w-3.5 rounded border-border text-rose-600 accent-rose-600 cursor-pointer shrink-0"
                          />
                          <span className="truncate text-rose-600 dark:text-rose-400 font-bold">Required*</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={field.showOnReport}
                            onChange={() => handleToggleTempIntakeField(field.key, "showOnReport")}
                            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
                          />
                          <span className="truncate">On Report</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/80 bg-card shrink-0">
            <p className="text-xs text-muted-foreground font-medium">
              Enabled fields: <strong className="text-foreground">{tempIntakeFields.filter(f => f.enabled).length}</strong> of {tempIntakeFields.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveIntakeRulesModal}
                disabled={savingIntakeRules}
                className="gradient-primary text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl ring-inset-top hover:-translate-y-px transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {savingIntakeRules ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Rules…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Intake Rules</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
