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
  Search, UserPlus, User, Eye, Edit2, Trash2, Loader2, AlertCircle, Users, X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";

interface Patient {
  id: string; customId: string; name: string; age: number; gender: string;
  phone: string; refDoctor: string; address: string | null; createdAt: string;
}

export default function PatientsPage() {
  const toast = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editPhone, setEditPhone] = useState("");
  const [editRefDoctor, setEditRefDoctor] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel("/patients");
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.customId.toLowerCase().includes(search.toLowerCase());

    // Using string matching for YYYY-MM-DD
    const matchesDate = filterDate ? p.createdAt.startsWith(filterDate) : true;

    return matchesSearch && matchesDate;
  });

  const handleOpenEdit = (patient: Patient) => {
    setEditPatient(patient);
    setEditName(patient.name);
    setEditAge(patient.age.toString());
    setEditGender(patient.gender);
    setEditPhone(patient.phone);
    setEditRefDoctor(patient.refDoctor);
    setEditAddress(patient.address || "");
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    setSaving(true);
    setEditError(null);
    try {
      await fetchFromLaravel(`/patients/${editPatient.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName, age: parseInt(editAge), gender: editGender, phone: editPhone, refDoctor: editRefDoctor, address: editAddress }),
      });
      setEditPatient(null);
      fetchPatients();
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
      setDeletePatient(null);
      fetchPatients();
      toast.success("Patient deleted", `${deletePatient.name}'s record was removed.`);
    } catch {
      toast.error("Delete failed", "The patient could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Directory</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your patient database.</p>
        </div>
        <Link href="/dashboard/patients/register">
          <Button><UserPlus className="h-4 w-4" /> Add Patient</Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <Input placeholder="Search by name, phone, or ID…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="date"
            className="w-full sm:w-[150px]"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <Button
              onClick={() => setFilterDate("")}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              title="Clear date"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-card rounded-xl border border-border/70 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Users className="h-9 w-9 opacity-25" />
              <p className="text-sm">No patients found.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {["Patient", "ID", "Age / Gender", "Phone", "Referred By", "Registered", ""].map((h, i) => (
                    <th key={h + i} className={`px-5 py-3.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] ${i === 2 ? "hidden md:table-cell" : ""} ${i === 3 || i === 4 ? "hidden lg:table-cell" : ""} ${i === 5 ? "hidden xl:table-cell" : ""} ${i === 6 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-accent text-primary text-[11px] font-bold shrink-0">{initials(p.name)}</span>
                        <p className="font-semibold text-foreground text-sm">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">{p.customId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{p.age}Y · {p.gender}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell font-mono">{p.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{p.refDoctor}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden xl:table-cell">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewPatient(p)} title="View" className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-all"><Eye className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleOpenEdit(p)} title="Edit" className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-all"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeletePatient(p)} title="Delete" className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View dialog */}
      <Dialog open={!!viewPatient} onOpenChange={() => setViewPatient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription className="font-mono">{viewPatient?.customId}</DialogDescription>
          </DialogHeader>
          {viewPatient && (
            <div className="grid grid-cols-2 gap-4 py-1">
              {[
                ["Name", viewPatient.name],
                ["Age / Gender", `${viewPatient.age}Y · ${viewPatient.gender}`],
                ["Phone", viewPatient.phone],
                ["Referred By", viewPatient.refDoctor],
                ["Address", viewPatient.address || "—"],
                ["Registered", new Date(viewPatient.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })],
              ].map(([label, val], i) => (
                <div key={label} className={i >= 4 ? "col-span-2" : ""}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{val}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPatient(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editPatient} onOpenChange={() => setEditPatient(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
              <DialogDescription className="font-mono">{editPatient?.customId}</DialogDescription>
            </DialogHeader>
            {editError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/8 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /><p className="font-medium">{editError}</p>
              </div>
            )}
            <div className="grid gap-4 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>Age</Label><Input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} required /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={editGender} onValueChange={setEditGender}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Referred By</Label><Input value={editRefDoctor} onChange={(e) => setEditRefDoctor(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Address</Label><Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPatient(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deletePatient} onOpenChange={() => setDeletePatient(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              Delete <strong className="text-foreground">{deletePatient?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePatient(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
