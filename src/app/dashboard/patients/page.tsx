"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, UserPlus, User, Eye, Edit2, Trash2, Loader2, AlertCircle, Users, X,
  MapPin, Phone, Stethoscope, Building, UserCheck, CheckCircle2, RefreshCw,
  ChevronLeft, ChevronRight, Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";
import { ALL_DESIGNATIONS } from "@/lib/report-settings";

interface Patient {
  id: string;
  custom_id?: string;
  customId?: string;
  name: string;
  designation?: string;
  age: number;
  gender: string;
  phone: string;
  email?: string | null;
  ref_doctor?: string;
  refDoctor?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  collected_at?: string;
  collectedAt?: string;
  collected_by?: string;
  collectedBy?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
}

const defaultDoctors = [
  "Self",
  "Dr. A. K. Verma, MD",
  "Dr. Rajesh Gupta, MBBS",
  "Dr. Priya Sharma, MS",
  "Dr. Suresh Nair, MD",
  "Dr. Ananya Roy, DGO",
];

const defaultCollectionPoints = [
  "Main Lab",
  "City Collection Center",
  "North Wing Clinic",
  "Home Collection",
  "Emergency OPD",
];

const defaultPhlebotomists = [
  "Self / Lab Staff",
  "Rahul Kumar (Phlebo)",
  "Amit Sharma (Phlebo)",
  "Sunita Patel (Nurse)",
  "Vikram Singh (Staff)",
];

export default function PatientsPage() {
  const toast = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const setPreset = (preset: "today" | "yesterday" | "all") => {
    if (preset === "all") { setFilterDate(""); return; }
    const d = new Date();
    if (preset === "yesterday") d.setDate(d.getDate() - 1);
    setFilterDate(d.toISOString().split("T")[0]);
  };

  // Referral & Collection Dropdown Lists
  const [doctorsList, setDoctorsList] = useState<string[]>(defaultDoctors);
  const [collectionPoints, setCollectionPoints] = useState<string[]>(defaultCollectionPoints);
  const [phlebotomists, setPhlebotomists] = useState<string[]>(defaultPhlebotomists);

  const shiftDate = (days: number) => {
    const base = filterDate ? new Date(filterDate) : new Date();
    base.setDate(base.getDate() + days);
    setFilterDate(base.toISOString().split("T")[0]);
  };

  // View dialog state
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);

  // Edit dialog state (Full Demographics)
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editDesignation, setEditDesignation] = useState("Mr.");
  const [editName, setEditName] = useState("");
  const [editAgeYears, setEditAgeYears] = useState("");
  const [editAgeMonths, setEditAgeMonths] = useState("");
  const [editAgeDays, setEditAgeDays] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editPhone, setEditPhone] = useState("");
  const [editRefDoctor, setEditRefDoctor] = useState("Self");
  const [editCollectedAt, setEditCollectedAt] = useState("Main Lab");
  const [editCollectedBy, setEditCollectedBy] = useState("Self / Lab Staff");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete dialog state
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPatients();

    try {
      const savedDocs = localStorage.getItem("lis_referral_doctors");
      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        if (Array.isArray(parsed) && parsed.length > 0) setDoctorsList(parsed);
      }

      const savedPoints = localStorage.getItem("lis_collection_points");
      if (savedPoints) {
        const parsed = JSON.parse(savedPoints);
        if (Array.isArray(parsed) && parsed.length > 0) setCollectionPoints(parsed);
      }

      const savedPhlebo = localStorage.getItem("lis_phlebotomists");
      if (savedPhlebo) {
        const parsed = JSON.parse(savedPhlebo);
        if (Array.isArray(parsed) && parsed.length > 0) setPhlebotomists(parsed);
      }
    } catch (e) {}
  }, []);

  const fetchPatients = async (forceRefresh?: boolean | any) => {
    const isForce = forceRefresh === true;
    try {
      if (isForce || patients.length === 0) {
        setLoading(true);
      }
      const data = await fetchFromLaravel("/patients", { skipCache: isForce });
      const list = Array.isArray(data) ? data : (data?.data || []);
      setPatients(list);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
      if (patients.length === 0) setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const safePatients = Array.isArray(patients) ? patients : [];

  const filteredPatients = safePatients.filter((p: any) => {
    if (!p) return false;
    const patName = p.name || "";
    const patPhone = p.phone || "";
    const patId = p.custom_id || p.customId || "";
    const patDate = (p.created_at || p.createdAt || "").slice(0, 10);

    const matchesSearch =
      patName.toLowerCase().includes(search.toLowerCase()) ||
      patPhone.includes(search) ||
      patId.toLowerCase().includes(search.toLowerCase());

    const matchesDate = filterDate ? patDate === filterDate : true;

    return matchesSearch && matchesDate;
  });

  const handleOpenEdit = (patient: any) => {
    setEditPatient(patient);
    setEditDesignation(patient.designation || "Mr.");
    setEditName(patient.name || "");
    setEditAgeYears((patient.age || 0).toString());
    setEditAgeMonths("0");
    setEditAgeDays("0");
    setEditGender(patient.gender || "Male");
    setEditPhone(patient.phone || "");
    
    const doc = patient.ref_doctor || patient.refDoctor || "Self";
    setEditRefDoctor(doc);
    if (doc && !doctorsList.includes(doc)) {
      setDoctorsList((prev) => [doc, ...prev]);
    }
    
    const coll = patient.collected_at || patient.collectedAt || "Main Lab (Self / Lab Staff)";
    const match = coll.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    const point = match && match[1] ? match[1].trim() : "Main Lab";
    const phlebo = match && match[2] ? match[2].trim() : "Self / Lab Staff";
    
    setEditCollectedAt(point);
    if (point && !collectionPoints.includes(point)) {
      setCollectionPoints((prev) => [point, ...prev]);
    }
    
    setEditCollectedBy(phlebo);
    if (phlebo && !phlebotomists.includes(phlebo)) {
      setPhlebotomists((prev) => [phlebo, ...prev]);
    }
    
    setEditAddress(patient.address || "");
    setEditError(null);
    setEditSuccess(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    setSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const calculatedAge = parseInt(editAgeYears) || (parseInt(editAgeMonths) > 0 ? 1 : 0) || 0;
      await fetchFromLaravel(`/patients/${editPatient.id}`, {
        method: "PUT",
        body: JSON.stringify({
          designation: editDesignation,
          name: editName.trim(),
          age: calculatedAge,
          gender: editGender,
          phone: editPhone.trim(),
          ref_doctor: editRefDoctor.trim() || "Self",
          address: editAddress.trim(),
          collected_at: `${editCollectedAt} (${editCollectedBy})`,
        }),
      });

      setEditSuccess("Patient record updated successfully.");
      await fetchPatients();
      setTimeout(() => setEditPatient(null), 800);
    } catch (err: any) {
      setEditError(err.message || "Failed to update patient.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePatient) return;
    setDeleting(true);
    try {
      await fetchFromLaravel(`/patients/${deletePatient.id}`, { method: "DELETE" });
      toast.success("Patient record deleted successfully");
      setPatients(prev => prev.filter(p => p.id !== deletePatient.id));
      setDeletePatient(null);
    } catch (err: any) {
      console.error("Delete patient error:", err);
      toast.error(err.message || "Failed to delete patient");
    } finally {
      setDeleting(false);
    }
  };

  const totalRows = filteredPatients.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredPatients.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Patients Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Directory of all registered laboratory patients & demographics.</p>
        </div>
      </div>

      {/* Filter / Search Ribbon */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card border border-border/80 p-3.5 rounded-xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, PID, or phone number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-9 text-xs bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Date Filters */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPreset("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterDate === new Date().toISOString().split("T")[0]
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPreset("yesterday")}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all cursor-pointer"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setPreset("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !filterDate
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            All Time
          </button>

          <div className="flex items-center gap-1 border border-border rounded-lg px-2 h-9 bg-background ml-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-foreground outline-none font-mono"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchPatients}
            disabled={loading}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Patients Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : currentRows.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No registered patients found.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No patient records matched your active search query or date filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">PID / ID</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Referred By</th>
                  <th className="px-5 py-3.5">Collection Point</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {currentRows.map((patient) => {
                  const patId = patient.custom_id || patient.customId || "N/A";
                  const patName = patient.name;
                  const patGender = patient.gender || "Male";
                  const patAge = patient.age;
                  const patPhone = patient.phone || "—";
                  const patRef = patient.ref_doctor || patient.refDoctor || "Self";
                  const patColl = patient.collected_at || patient.collectedAt || "Main Lab";
                  const regDate = patient.created_at || patient.createdAt;

                  return (
                    <tr key={patient.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {patName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{patName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {patGender} · {patAge} Yrs
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-primary">
                        {patId}
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-mono">
                        {patPhone}
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-medium">
                        Dr. {patRef}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {patColl}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                        {regDate ? new Date(regDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setViewPatient(patient)}
                            title="View Patient Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Link href={`/dashboard/patients/register?edit=${patient.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer"
                              title="Edit Patient Details & Tests"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => setDeletePatient(patient)}
                            title="Delete Patient"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalRows > 0 && (
          <div className="bg-muted/20 px-5 py-3 border-t border-border/60 flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{indexOfFirstRow + 1}</strong>–<strong className="text-foreground">{Math.min(indexOfLastRow, totalRows)}</strong> of <strong className="text-foreground">{totalRows}</strong> patients
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-semibold px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 2. COMPREHENSIVE VIEW PATIENT DETAILS MODAL */}
      <Dialog open={!!viewPatient} onOpenChange={() => setViewPatient(null)}>
        <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-card border border-border/80 shadow-2xl">
          <DialogTitle className="sr-only">Patient Full Profile</DialogTitle>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-7 py-4 border-b border-border/80 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
                {viewPatient?.name ? viewPatient.name.slice(0, 2).toUpperCase() : <User className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {viewPatient?.designation ? `${viewPatient.designation} ` : ""}{viewPatient?.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    VERIFIED PATIENT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Patient ID: <strong className="text-primary font-bold">{viewPatient?.custom_id || viewPatient?.customId}</strong>
                </p>
              </div>
            </div>
          </div>

          {viewPatient && (
            <div className="p-6 sm:p-7 space-y-6 text-xs bg-card">
              {/* Section 1: Demographics & Identity */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <User className="h-4 w-4 text-primary" />
                  <span>Demographics & Personal Details</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-border/70 bg-background/60">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient ID (PID)</p>
                    <p className="font-mono font-bold text-primary text-sm mt-0.5">{viewPatient.custom_id || viewPatient.customId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {viewPatient.designation ? `${viewPatient.designation} ` : ""}{viewPatient.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Age / Gender</p>
                    <p className="font-bold text-foreground mt-0.5">{viewPatient.age} Yrs · {viewPatient.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Phone Number</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{viewPatient.phone || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Clinical & Sample Logistics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <span>Clinical Referral & Logistics</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border/70 bg-background/60">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Referring Doctor</p>
                    <p className="font-bold text-foreground mt-0.5">Dr. {viewPatient.ref_doctor || viewPatient.refDoctor || "Self"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Collection Point / Center</p>
                    <p className="font-semibold text-foreground mt-0.5">{viewPatient.collected_at || viewPatient.collectedAt || "Main Lab"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Intake Registration Date</p>
                    <p className="font-medium text-foreground mt-0.5">
                      {(viewPatient.created_at || viewPatient.createdAt)
                        ? new Date((viewPatient.created_at || viewPatient.createdAt) as string).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Residential Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Residential Address</span>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-background/60">
                  <p className="text-foreground text-xs leading-relaxed font-medium">
                    {viewPatient.address && viewPatient.address.trim() !== ""
                      ? viewPatient.address
                      : "No physical residential address recorded for this patient."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. DELETE PATIENT MODAL */}
      <Dialog open={!!deletePatient} onOpenChange={() => setDeletePatient(null)}>
        <DialogContent className="max-w-md w-full rounded-2xl">
          <DialogTitle className="sr-only">Delete Patient</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border/80 pb-3 text-destructive">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Delete Patient Record</h3>
                <p className="text-xs text-muted-foreground">Are you sure you want to permanently delete this profile?</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Patient: <strong className="text-foreground">{deletePatient?.name}</strong> ({deletePatient?.custom_id || deletePatient?.customId})
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setDeletePatient(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
