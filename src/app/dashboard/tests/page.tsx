"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Edit2, Trash2, FlaskConical, AlertTriangle,
  CheckCircle2, Loader2, Layers, IndianRupee, ChevronDown, ChevronRight, FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TipTapEditor } from "@/components/tiptap-editor";
import { useToast } from "@/components/ui/toast";
import { fetchFromLaravel } from "@/lib/api-client";

const PREDEFINED_UNITS = [
  "g/dL", "mg/dL", "µg/dL", "U/L", "IU/L", "mEq/L", "mmol/L", "µmol/L", "pmol/L",
  "%", "/cumm", "/µL", "x10^6/µL", "x10^3/µL", "/HPF", "cells/cumm", "mg/24h",
  "mL/min", "fl", "pg", "ng/mL", "ng/dL", "mIU/mL", "nmol/L", "Sec", "Min", "Ratio"
];

interface Test {
  id: string; name: string; testCode?: string; category: string; fieldType: string; type: string; price: number;
  interpretation?: string;
  unit: string | null; genderRefType: string; refRangeMin: number | null; refRangeMax: number | null;
  refRangeMinMale: number | null; refRangeMaxMale: number | null;
  refRangeMinFemale: number | null; refRangeMaxFemale: number | null;
  refRangeMinChild?: number | null; refRangeMaxChild?: number | null;
  refRangeMinNewborn?: number | null; refRangeMaxNewborn?: number | null;
  valueType?: string; customOptions?: string;
  subTests?: Test[];
}

interface SubTestState {
  id?: string;
  testCode?: string;
  name: string;
  unit: string;
  genderRefType: string;
  refRangeMin: string;
  refRangeMax: string;
  refRangeMinMale: string;
  refRangeMaxMale: string;
  refRangeMinFemale: string;
  refRangeMaxFemale: string;
  refRangeMinChild: string;
  refRangeMaxChild: string;
  refRangeMinNewborn: string;
  refRangeMaxNewborn: string;
  subTests?: SubTestState[];
  fieldType?: string;
  interpretation?: string;
  valueType?: string;
  customOptions?: string[];
}

export default function TestMasterPage() {
  const toast = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [name, setName] = useState("");
  const [testCode, setTestCode] = useState("");
  const [category, setCategory] = useState("CBC");
  const [customCategory, setCustomCategory] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [interpretationModalOpen, setInterpretationModalOpen] = useState(false);
  const [customEditorActiveSubIndex, setCustomEditorActiveSubIndex] = useState<number | null>(null);

  // Custom Options Modal State
  const [customOptionsModalOpen, setCustomOptionsModalOpen] = useState(false);
  const [activeCustomOptionsSubIndex, setActiveCustomOptionsSubIndex] = useState<number | null>(null);
  const [activeCustomOptionsSubSubIndex, setActiveCustomOptionsSubSubIndex] = useState<number | null>(null);
  const [tempCustomOptions, setTempCustomOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");

  const [type, setType] = useState("Pathology");
  const [price, setPrice] = useState("");

  const [subTests, setSubTests] = useState<SubTestState[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const subtestsEndRef = useRef<HTMLDivElement>(null);

  const dynamicCategories = Array.from(new Set(tests.map(t => t.category).filter(Boolean)));
  const standardCategories = Array.from(new Set([
    ...dynamicCategories,
    "Haematology",
    "Biochemistry",
    "Clinical Chemistry",
    "Clinical Pathology",
    "Routine",
    "Serology",
    "Immunology",
    "Microbiology",
    "Histopathology",
    "Biopsy",
    "Cytology",
    "Endocrinology",
    "Hormones",
    "Immunohaematology",
    "Blood Bank",
    "Andrology",
    "Molecular Biology",
    "PCR",
    "Parasitology",
    "Toxicology",
    "Genetics",
    "Cytogenetics",
    "Flow Cytometry",
    "Radiology",
    "Imaging",
    "Phlebotomy",
    "Sample Collection",
    "Reference",
    "Outside Lab",
    "Quality Control (QC)",
    "Report Dispatch",
    "MIS",
    "Other"
  ]));
  const standardTypes = ["Pathology", "Radiology", "Cardiology", "Other"];

  useEffect(() => { fetchTests(); }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await fetchFromLaravel("/tests");
      setTests(data);
    } catch (err) {
      console.error("Failed to fetch tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingTest(null);
    setName(""); setTestCode(""); setCategory(standardCategories[0]); setCustomCategory(""); setType("Pathology");
    setPrice("");
    setInterpretation("");
    setSubTests([{
      name: "", unit: "", genderRefType: "BOTH", refRangeMin: "", refRangeMax: "",
      refRangeMinMale: "", refRangeMaxMale: "", refRangeMinFemale: "", refRangeMaxFemale: "",
      refRangeMinChild: "", refRangeMaxChild: "", refRangeMinNewborn: "", refRangeMaxNewborn: "",
      fieldType: "Single Field",
      valueType: "Numeric", customOptions: []
    }]);
    setError(null); setSuccess(null); setDialogOpen(true);
  };

  const handleOpenEditDialog = (test: Test) => {
    setEditingTest(test);
    setName(test.name);
    setTestCode(test.testCode || "");
    setCategory(standardCategories.includes(test.category) ? test.category : "Other");
    setCustomCategory(standardCategories.includes(test.category) ? "" : test.category);
    setType(test.type || "Pathology");
    setPrice(test.price.toString());
    setInterpretation(test.interpretation || "");

    if (test.subTests && test.subTests.length > 0) {
      setSubTests(test.subTests.map(sub => ({
        id: sub.id,
        testCode: sub.testCode || "",
        name: sub.name,
        unit: sub.unit || "",
        genderRefType: sub.genderRefType || "BOTH",
        refRangeMin: sub.refRangeMin?.toString() || "",
        refRangeMax: sub.refRangeMax?.toString() || "",
        refRangeMinMale: sub.refRangeMinMale?.toString() || "",
        refRangeMaxMale: sub.refRangeMaxMale?.toString() || "",
        refRangeMinFemale: sub.refRangeMinFemale?.toString() || "",
        refRangeMaxFemale: sub.refRangeMaxFemale?.toString() || "",
        refRangeMinChild: sub.refRangeMinChild?.toString() || "",
        refRangeMaxChild: sub.refRangeMaxChild?.toString() || "",
        refRangeMinNewborn: sub.refRangeMinNewborn?.toString() || "",
        refRangeMaxNewborn: sub.refRangeMaxNewborn?.toString() || "",
        fieldType: sub.fieldType || "Single Field",
        interpretation: sub.interpretation || "",
        valueType: sub.valueType || "Numeric",
        customOptions: sub.customOptions ? JSON.parse(sub.customOptions) : [],
        subTests: sub.subTests ? sub.subTests.map(subsub => ({
          id: subsub.id,
          testCode: subsub.testCode || "",
          name: subsub.name,
          unit: subsub.unit || "",
          genderRefType: subsub.genderRefType || "BOTH",
          refRangeMin: subsub.refRangeMin?.toString() || "",
          refRangeMax: subsub.refRangeMax?.toString() || "",
          refRangeMinMale: subsub.refRangeMinMale?.toString() || "",
          refRangeMaxMale: subsub.refRangeMaxMale?.toString() || "",
          refRangeMinFemale: subsub.refRangeMinFemale?.toString() || "",
          refRangeMaxFemale: subsub.refRangeMaxFemale?.toString() || "",
          refRangeMinChild: subsub.refRangeMinChild?.toString() || "",
          refRangeMaxChild: subsub.refRangeMaxChild?.toString() || "",
          refRangeMinNewborn: subsub.refRangeMinNewborn?.toString() || "",
          refRangeMaxNewborn: subsub.refRangeMaxNewborn?.toString() || "",
          valueType: subsub.valueType || "Numeric",
          customOptions: subsub.customOptions ? JSON.parse(subsub.customOptions) : [],
        })) : []
      })));
    } else {
      setSubTests([{
        testCode: "",
        name: test.name,
        unit: test.unit || "",
        genderRefType: test.genderRefType || "BOTH",
        refRangeMin: test.refRangeMin?.toString() || "",
        refRangeMax: test.refRangeMax?.toString() || "",
        refRangeMinMale: test.refRangeMinMale?.toString() || "",
        refRangeMaxMale: test.refRangeMaxMale?.toString() || "",
        refRangeMinFemale: test.refRangeMinFemale?.toString() || "",
        refRangeMaxFemale: test.refRangeMaxFemale?.toString() || "",
        refRangeMinChild: test.refRangeMinChild?.toString() || "",
        refRangeMaxChild: test.refRangeMaxChild?.toString() || "",
        refRangeMinNewborn: test.refRangeMinNewborn?.toString() || "",
        refRangeMaxNewborn: test.refRangeMaxNewborn?.toString() || "",
        valueType: test.valueType || "Numeric",
        customOptions: test.customOptions ? JSON.parse(test.customOptions) : [],
      }]);
    }

    setError(null); setSuccess(null); setDialogOpen(true);
  };

  const handleAddSubTest = () => {
    setSubTests([...subTests, {
      name: "", unit: "", genderRefType: "BOTH", refRangeMin: "", refRangeMax: "",
      refRangeMinMale: "", refRangeMaxMale: "", refRangeMinFemale: "", refRangeMaxFemale: "",
      refRangeMinChild: "", refRangeMaxChild: "", refRangeMinNewborn: "", refRangeMaxNewborn: "",
      valueType: "Numeric", customOptions: []
    }]);
    setTimeout(() => {
      subtestsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleRemoveSubTest = (index: number) => {
    setSubTests(subTests.filter((_, i) => i !== index));
  };

  const updateSubTest = (index: number, field: keyof SubTestState, value: any) => {
    const updated = [...subTests];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "fieldType" && value === "Custom Editor" && !updated[index].name) {
      updated[index].name = "Report Template";
    }

    setSubTests(updated);
  };


  const handleAddSubSubTest = (index: number) => {
    const updated = [...subTests];
    if (!updated[index].subTests) updated[index].subTests = [];
    updated[index].subTests!.push({
      name: "", unit: "", genderRefType: "BOTH", refRangeMin: "", refRangeMax: "",
      refRangeMinMale: "", refRangeMaxMale: "", refRangeMinFemale: "", refRangeMaxFemale: "",
      refRangeMinChild: "", refRangeMaxChild: "", refRangeMinNewborn: "", refRangeMaxNewborn: "",
      valueType: "Numeric", customOptions: []
    });
    setSubTests(updated);
  };

  const handleRemoveSubSubTest = (index: number, subIndex: number) => {
    const updated = [...subTests];
    updated[index].subTests = updated[index].subTests!.filter((_, i) => i !== subIndex);
    setSubTests(updated);
  };

  const updateSubSubTest = (index: number, subIndex: number, field: keyof SubTestState, value: any) => {
    const updated = [...subTests];
    updated[index].subTests![subIndex] = { ...updated[index].subTests![subIndex], [field]: value };
    setSubTests(updated);
  };

  const openCustomOptionsModal = (index: number, subIndex: number | null = null) => {
    setActiveCustomOptionsSubIndex(index);
    setActiveCustomOptionsSubSubIndex(subIndex);
    const sub = subIndex === null ? subTests[index] : subTests[index].subTests![subIndex];
    setTempCustomOptions([...(sub.customOptions || [])]);
    setNewOptionInput("");
    setCustomOptionsModalOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setSaving(true);
    const finalCategory = category === "Other" ? customCategory.trim() : category;

    if (!name || !finalCategory || price === "") {
      setError("Please fill in main test details."); setSaving(false); return;
    }
    if (subTests.length === 0) {
      setError("Please add at least one parameter/sub-test."); setSaving(false); return;
    }
    for (const sub of subTests) {
      if (!sub.name) {
        setError("Please fill in the name for all parameters."); setSaving(false); return;
      }
    }

    try {
      const url = editingTest ? `/tests/${editingTest.id}` : "/tests";
      const method = editingTest ? "PUT" : "POST";
      await fetchFromLaravel(url, {
        method,
        body: JSON.stringify({
          testCode: testCode.trim() || undefined,
          name: name.trim(), category: finalCategory, fieldType: "Group", type, price: parseFloat(price), interpretation,
          subTests: subTests.map(sub => ({
            id: sub.id,
            testCode: sub.testCode || undefined,
            name: sub.name.trim(),
            unit: sub.unit.trim(),
            genderRefType: sub.genderRefType,
            refRangeMin: sub.refRangeMin,
            refRangeMax: sub.refRangeMax,
            refRangeMinMale: sub.refRangeMinMale,
            refRangeMaxMale: sub.refRangeMaxMale,
            refRangeMinFemale: sub.refRangeMinFemale,
            refRangeMaxFemale: sub.refRangeMaxFemale,
            refRangeMinChild: sub.refRangeMinChild,
            refRangeMaxChild: sub.refRangeMaxChild,
            refRangeMinNewborn: sub.refRangeMinNewborn,
            refRangeMaxNewborn: sub.refRangeMaxNewborn,
            valueType: sub.valueType || "Numeric",
            customOptions: sub.customOptions || [],
            fieldType: sub.fieldType || "Single Field",
            interpretation: sub.interpretation || null,
            subTests: sub.fieldType === "Multiple Field" && sub.subTests ? sub.subTests.map(ss => ({
              id: ss.id,
              testCode: ss.testCode || undefined,
              name: ss.name.trim(),
              unit: ss.unit.trim(),
              genderRefType: ss.genderRefType,
              refRangeMin: ss.refRangeMin,
              refRangeMax: ss.refRangeMax,
              refRangeMinMale: ss.refRangeMinMale,
              refRangeMaxMale: ss.refRangeMaxMale,
              refRangeMinFemale: ss.refRangeMinFemale,
              refRangeMaxFemale: ss.refRangeMaxFemale,
              refRangeMinChild: ss.refRangeMinChild,
              refRangeMaxChild: ss.refRangeMaxChild,
              refRangeMinNewborn: ss.refRangeMinNewborn,
              refRangeMaxNewborn: ss.refRangeMaxNewborn,
              valueType: ss.valueType || "Numeric",
              customOptions: ss.customOptions || [],
            })) : undefined
          }))
        }),
      });
      setSuccess("Test saved successfully.");
      fetchTests();
      setTimeout(() => setDialogOpen(false), 800);
    } catch (err: any) {
      setError(err.message || "Failed to save test.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteTest = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchFromLaravel(`/tests/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Test deleted", `"${deleteTarget.name}" was removed from the catalog.`);
      setDeleteTarget(null);
      fetchTests();
    } catch {
      toast.error("Delete failed", "The test could not be deleted. It may be in use by a report.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTests = tests.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(tests.map((t) => t.category)));
  const avgCost = tests.length ? tests.reduce((a, t) => a + t.price, 0) / tests.length : 0;

  const getCategoryColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case "CBC": case "HEMATOLOGY": return "bg-primary/10 text-primary";
      case "LFT": case "BIOCHEMISTRY": return "bg-gold/12 text-gold";
      case "KFT": return "bg-secondary/15 text-secondary";
      case "THYROID": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <datalist id="units-list">
        {PREDEFINED_UNITS.map(unit => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-1.5">Catalog</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Tests & Packages</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage lab tests, their parameters, and pricing.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenAddDialog} size="sm" className="h-10"><Plus className="h-4 w-4" /> New Test Package</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card flex items-center justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Main Tests</p><p className="font-display text-3xl font-semibold text-foreground mt-1 tnum">{tests.length}</p></div>
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-accent text-primary"><FlaskConical className="h-5 w-5" /></span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card flex items-center justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</p><p className="font-display text-3xl font-semibold text-foreground mt-1 tnum">{categories.length}</p></div>
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-secondary/15 text-secondary"><Layers className="h-5 w-5" /></span>
        </div>
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card flex items-center justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Average Price</p><p className="font-display text-3xl font-semibold text-gold mt-1 tnum">₹{avgCost.toFixed(0)}</p></div>
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-gold/12 text-gold"><IndianRupee className="h-5 w-5" /></span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-all ${selectedCategory === "ALL" ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border text-foreground hover:border-primary/40"}`}>All</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-all ${selectedCategory === cat ? "gradient-primary text-primary-foreground border-transparent" : "bg-card border-border text-foreground hover:border-primary/40"}`}>{cat}</button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input placeholder="Search tests…" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground"><FlaskConical className="h-9 w-9 mx-auto mb-2 opacity-25" /><p className="text-xs font-medium">No tests match your selection.</p></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60">
                  <th className="px-6 py-3.5 w-10"></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => (
                  <React.Fragment key={test.id}>
                    <tr className={`border-b border-border/30 last:border-0 hover:bg-muted/25 transition-colors group cursor-pointer ${expandedRows[test.id] ? "bg-muted/20" : ""}`} onClick={() => toggleRow(test.id)}>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {test.subTests && test.subTests.length > 0 && (
                          expandedRows[test.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">{test.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{test.subTests?.length || 0} parameters</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-mono px-2 py-1 bg-muted rounded-md inline-flex text-muted-foreground">
                          {test.testCode || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(test.category)}`}>{test.category}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm font-semibold text-foreground">₹{test.price.toFixed(0)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(test); }} className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-all" title="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(test); }} className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows[test.id] && test.subTests && test.subTests.length > 0 && (
                      <tr className="bg-muted/10 border-b border-border/30">
                        <td></td>
                        <td colSpan={5} className="p-0">
                          <div className="pl-6 pr-4 py-3">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-border/40 text-muted-foreground">
                                  <th className="pb-2 font-medium">Parameter Name</th>
                                  <th className="pb-2 font-medium">Code</th>
                                  <th className="pb-2 font-medium text-center">Unit</th>
                                  <th className="pb-2 font-medium text-right">Details / Range</th>
                                </tr>
                              </thead>
                              <tbody>
                                {test.subTests.map(sub => (
                                  <React.Fragment key={sub.id}>
                                    <tr className="border-b border-border/20 last:border-0">
                                      <td className="py-2.5 font-medium text-foreground">{sub.name}</td>
                                      <td className="py-2.5 font-mono text-muted-foreground">{sub.testCode || "-"}</td>
                                      <td className="py-2.5 text-center text-muted-foreground">
                                        {sub.fieldType !== "Multiple Field" && sub.fieldType !== "Custom Editor" && sub.valueType !== "Custom" ? sub.unit || "-" : "-"}
                                      </td>
                                      <td className="py-2.5 text-right font-mono text-muted-foreground">
                                        {sub.fieldType === "Custom Editor" ? (
                                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-sans font-semibold">Custom Editor Template</span>
                                        ) : sub.fieldType === "Multiple Field" ? (
                                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-sans font-semibold">Group Parameter</span>
                                        ) : sub.valueType === "Custom" ? (
                                          <span className="text-[10px] text-muted-foreground font-sans truncate max-w-[150px] inline-block" title={sub.customOptions}>
                                            {(() => {
                                              try {
                                                const arr = JSON.parse(sub.customOptions || "[]");
                                                return arr.length > 0 ? "Options: " + arr.join(", ") : "Custom Text (No Suggestions)";
                                              } catch { return "Custom Text"; }
                                            })()}
                                          </span>
                                        ) : (
                                          sub.genderRefType === "GENDER_SPECIFIC" ? "Gender Specific" : sub.genderRefType === "CHILDREN" ? "Children" : sub.genderRefType === "NEWBORN" ? "Newborn" : `${sub.refRangeMin ?? 0} – ${sub.refRangeMax ?? 0}`
                                        )}
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-full w-screen h-screen max-h-screen p-0 m-0 border-0 rounded-none overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground"><FlaskConical className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-lg">{editingTest ? "Edit Test Package" : "New Diagnostic Package"}</DialogTitle>
                <DialogDescription>Create a main test and define its parameters.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form id="test-form" onSubmit={handleSaveTest} className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Section: Main Test */}
            <div className="w-full md:w-[320px] shrink-0 p-6 border-b md:border-b-0 md:border-r border-border/60 bg-muted/5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
              {error && <div className="flex items-center gap-2 rounded-lg bg-destructive/8 border border-destructive/20 p-3 text-xs text-destructive font-medium"><AlertTriangle className="h-4 w-4 shrink-0" /><p>{error}</p></div>}
              {success && <div className="flex items-center gap-2 rounded-lg bg-accent border border-primary/20 p-3 text-xs text-primary font-medium"><CheckCircle2 className="h-4 w-4 shrink-0" /><p>{success}</p></div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Test Name</Label>
                  <Input placeholder="e.g. Complete Blood Count" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Test Code</Label>
                  <Input placeholder="Leave blank to auto-generate" value={testCode} onChange={(e) => setTestCode(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-sm">Package Price (₹)</Label><Input type="number" step="0.01" placeholder="e.g. 500" value={price} onChange={(e) => setPrice(e.target.value)} className="font-mono" required /></div>

              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} className="max-h-[300px]">
                    {standardCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {category === "Other" && (
                <div className="space-y-1.5"><Label className="text-sm">Custom Category</Label><Input placeholder="e.g. Serology" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} required /></div>
              )}

              <div className="pt-2">
                <Button type="button" variant="outline" onClick={() => setInterpretationModalOpen(true)} className="gap-2 w-full justify-start text-muted-foreground hover:text-foreground">
                  <FileText className="h-4 w-4" />
                  {interpretation ? "Edit Interpretation" : "Add Interpretation"}
                </Button>
              </div>
            </div>

            {/* Right Section: Sub Tests */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/60">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Test Parameters</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Define the parameters and values for this test package.</p>
                </div>
                <Button type="button" size="sm" onClick={handleAddSubTest} className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" /> Add Parameter
                </Button>
              </div>

              <div className="space-y-5">
                {subTests.map((sub, index) => (
                  <div key={index} className="bg-card border border-border/70 shadow-sm rounded-xl p-5 relative group">
                    {subTests.length > 1 && (
                      <button type="button" onClick={() => handleRemoveSubTest(index)} className="absolute right-3 top-3 p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <div className="grid grid-cols-12 gap-3 mb-4 pr-8">
                      <div className="col-span-5 space-y-1.5">
                        <Label className="text-xs">Parameter Name</Label>
                        <Input placeholder="e.g. Hemoglobin" value={sub.name} onChange={(e) => updateSubTest(index, "name", e.target.value)} className="h-8 text-sm bg-background font-medium" />
                      </div>
                      <div className="col-span-4 space-y-1.5">
                        <Label className="text-xs">Parameter Code</Label>
                        <Input placeholder="Auto-generate" value={sub.testCode || ""} onChange={(e) => updateSubTest(index, "testCode", e.target.value)} className="h-8 text-sm font-mono bg-background" />
                      </div>
                      {sub.fieldType !== "Multiple Field" && sub.fieldType !== "Custom Editor" && sub.valueType !== "Custom" && (
                        <div className="col-span-3 space-y-1.5">
                          <Label className="text-xs">Unit</Label>
                          <Input list="units-list" placeholder="e.g. g/dL" value={sub.unit} onChange={(e) => updateSubTest(index, "unit", e.target.value)} className="h-8 text-sm bg-background" />
                        </div>
                      )}
                      <div className={sub.fieldType === "Custom Editor" ? "col-span-12 space-y-1.5" : "col-span-12 space-y-1.5"}>
                        <Label className="text-xs">Field Type</Label>
                        <Select value={sub.fieldType || "Single Field"} onValueChange={(val) => updateSubTest(index, "fieldType", val)}>
                          <SelectTrigger className="h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Single Field">Single Field</SelectItem>
                            <SelectItem value="Multiple Field">Multiple Field</SelectItem>
                            <SelectItem value="Custom Editor">Custom Editor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(!sub.fieldType || sub.fieldType === "Single Field") ? (
                      <div className="bg-background rounded-lg border border-border/50 p-3">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Value Type</Label>
                            <Select value={sub.valueType || "Numeric"} onValueChange={(val) => updateSubTest(index, "valueType", val)}>
                              <SelectTrigger className="h-7 text-xs w-[130px] border-border"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Numeric">Numeric</SelectItem>
                                <SelectItem value="Custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(!sub.valueType || sub.valueType === "Numeric") && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Reference Range</Label>
                              <Select value={sub.genderRefType} onValueChange={(val) => updateSubTest(index, "genderRefType", val)}>
                                <SelectTrigger className="h-7 text-xs w-[130px] border-border"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BOTH">Universal</SelectItem>
                                  <SelectItem value="GENDER_SPECIFIC">Gender Specific</SelectItem>
                                  <SelectItem value="CHILDREN">Children</SelectItem>
                                  <SelectItem value="NEWBORN">Newborn</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {(!sub.valueType || sub.valueType === "Numeric") ? (
                          sub.genderRefType === "BOTH" ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1"><Label className="text-[10px]">Min</Label><Input type="number" step="0.0001" placeholder="12.0" value={sub.refRangeMin} onChange={(e) => updateSubTest(index, "refRangeMin", e.target.value)} className="h-7 text-xs font-mono" /></div>
                              <div className="space-y-1"><Label className="text-[10px]">Max</Label><Input type="number" step="0.0001" placeholder="16.0" value={sub.refRangeMax} onChange={(e) => updateSubTest(index, "refRangeMax", e.target.value)} className="h-7 text-xs font-mono" /></div>
                            </div>
                          ) : sub.genderRefType === "GENDER_SPECIFIC" ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><Label className="text-[10px] text-blue-500">Male Min</Label><Input type="number" step="0.0001" value={sub.refRangeMinMale} onChange={(e) => updateSubTest(index, "refRangeMinMale", e.target.value)} className="h-7 text-xs font-mono" /></div>
                                <div className="space-y-1"><Label className="text-[10px] text-blue-500">Male Max</Label><Input type="number" step="0.0001" value={sub.refRangeMaxMale} onChange={(e) => updateSubTest(index, "refRangeMaxMale", e.target.value)} className="h-7 text-xs font-mono" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><Label className="text-[10px] text-pink-500">Female Min</Label><Input type="number" step="0.0001" value={sub.refRangeMinFemale} onChange={(e) => updateSubTest(index, "refRangeMinFemale", e.target.value)} className="h-7 text-xs font-mono" /></div>
                                <div className="space-y-1"><Label className="text-[10px] text-pink-500">Female Max</Label><Input type="number" step="0.0001" value={sub.refRangeMaxFemale} onChange={(e) => updateSubTest(index, "refRangeMaxFemale", e.target.value)} className="h-7 text-xs font-mono" /></div>
                              </div>
                            </div>
                          ) : sub.genderRefType === "CHILDREN" ? (
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div className="space-y-1"><Label className="text-[10px] text-purple-500">Child Min</Label><Input type="number" step="0.0001" value={sub.refRangeMinChild} onChange={(e) => updateSubTest(index, "refRangeMinChild", e.target.value)} className="h-7 text-xs font-mono" /></div>
                              <div className="space-y-1"><Label className="text-[10px] text-purple-500">Child Max</Label><Input type="number" step="0.0001" value={sub.refRangeMaxChild} onChange={(e) => updateSubTest(index, "refRangeMaxChild", e.target.value)} className="h-7 text-xs font-mono" /></div>
                            </div>
                          ) : sub.genderRefType === "NEWBORN" ? (
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div className="space-y-1"><Label className="text-[10px] text-emerald-500">Newborn Min</Label><Input type="number" step="0.0001" value={sub.refRangeMinNewborn} onChange={(e) => updateSubTest(index, "refRangeMinNewborn", e.target.value)} className="h-7 text-xs font-mono" /></div>
                              <div className="space-y-1"><Label className="text-[10px] text-emerald-500">Newborn Max</Label><Input type="number" step="0.0001" value={sub.refRangeMaxNewborn} onChange={(e) => updateSubTest(index, "refRangeMaxNewborn", e.target.value)} className="h-7 text-xs font-mono" /></div>
                            </div>
                          ) : null
                        ) : (
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <Label className="text-xs font-medium text-foreground">Custom Options / Suggestions</Label>
                            <div className="flex flex-wrap gap-2 items-center">
                              {(sub.customOptions || []).map((opt, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                                  {opt}
                                </span>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={() => openCustomOptionsModal(index)} className="h-7 px-2 border-primary/20 hover:bg-primary/5 text-primary">
                                <Plus className="h-3 w-3 mr-1" /> Add Option
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : sub.fieldType === "Custom Editor" ? (
                      <div className="bg-background rounded-lg border border-border/50 p-3 mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-xs text-muted-foreground font-semibold">Custom Editor Template</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomEditorActiveSubIndex(index)}
                            className="h-7 text-[10px] px-3 font-semibold border-primary/20 text-primary hover:bg-primary/5"
                          >
                            <FileText className="h-3 w-3 mr-1.5" />
                            Open Editor
                          </Button>
                        </div>
                        <div
                          className="min-h-[100px] max-h-[150px] overflow-hidden border border-border/60 rounded-md bg-card/50 p-3 text-xs text-muted-foreground relative"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/90 pointer-events-none" />
                          {sub.interpretation ? (
                            <div dangerouslySetInnerHTML={{ __html: sub.interpretation }} className="opacity-70 scale-90 origin-top-left" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground/50 italic pt-6">No template designed yet</div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Design the layout exactly how you want it to appear in the report. This template will be loaded automatically when entering results.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 border-t border-border/50 pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <Label className="text-xs font-semibold text-muted-foreground">Sub-Parameters</Label>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleAddSubSubTest(index)} className="h-6 text-[10px] px-2"><Plus className="h-3 w-3 mr-1" /> Add Sub-Parameter</Button>
                        </div>
                        <div className="space-y-3">
                          {sub.subTests && sub.subTests.map((subsub, sIdx) => (
                            <div key={sIdx} className="bg-background rounded-lg border border-border/50 p-3 relative group/sub">
                              <button type="button" onClick={() => handleRemoveSubSubTest(index, sIdx)} className="absolute right-2 top-2 p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-all"><Trash2 className="h-3 w-3" /></button>
                              <div className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-4 space-y-1.5">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Name</Label>
                                  <Input placeholder="e.g. Neutrophils" value={subsub.name} onChange={(e) => updateSubSubTest(index, sIdx, "name", e.target.value)} className="h-7 text-xs font-medium" />
                                </div>
                                <div className="col-span-3 space-y-1.5">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Code</Label>
                                  <Input placeholder="Auto-gen" value={subsub.testCode || ""} onChange={(e) => updateSubSubTest(index, sIdx, "testCode", e.target.value)} className="h-7 text-xs font-mono" />
                                </div>
                                {subsub.valueType !== "Custom" && (
                                  <div className="col-span-4 space-y-1.5"><Label className="text-[10px]">Unit</Label><Input list="units-list" placeholder="Unit" value={subsub.unit} onChange={(e) => updateSubSubTest(index, sIdx, "unit", e.target.value)} className="h-7 text-xs" /></div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mb-2 mt-2 border-t border-border/30 pt-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-muted-foreground">Value Type</Label>
                                  <Select value={subsub.valueType || "Numeric"} onValueChange={(val) => updateSubSubTest(index, sIdx, "valueType", val)}>
                                    <SelectTrigger className="h-6 text-[10px] w-[90px] border-border"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Numeric">Numeric</SelectItem>
                                      <SelectItem value="Custom">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(!subsub.valueType || subsub.valueType === "Numeric") && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Ref Range</Label>
                                    <Select value={subsub.genderRefType} onValueChange={(val) => updateSubSubTest(index, sIdx, "genderRefType", val)}>
                                      <SelectTrigger className="h-6 text-[10px] w-[90px] border-border"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="BOTH">Universal</SelectItem>
                                        <SelectItem value="GENDER_SPECIFIC">Gender</SelectItem>
                                        <SelectItem value="CHILDREN">Children</SelectItem>
                                        <SelectItem value="NEWBORN">Newborn</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                              {(!subsub.valueType || subsub.valueType === "Numeric") ? (
                                subsub.genderRefType === "BOTH" ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px]">Min</Label><Input type="number" step="0.0001" value={subsub.refRangeMin} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMin", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                    <div className="space-y-1"><Label className="text-[10px]">Max</Label><Input type="number" step="0.0001" value={subsub.refRangeMax} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMax", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                  </div>
                                ) : subsub.genderRefType === "GENDER_SPECIFIC" ? (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1"><Label className="text-[10px] text-blue-500">Male Min</Label><Input type="number" step="0.0001" value={subsub.refRangeMinMale} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMinMale", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                      <div className="space-y-1"><Label className="text-[10px] text-blue-500">Male Max</Label><Input type="number" step="0.0001" value={subsub.refRangeMaxMale} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMaxMale", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1"><Label className="text-[10px] text-pink-500">Fem Min</Label><Input type="number" step="0.0001" value={subsub.refRangeMinFemale} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMinFemale", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                      <div className="space-y-1"><Label className="text-[10px] text-pink-500">Fem Max</Label><Input type="number" step="0.0001" value={subsub.refRangeMaxFemale} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMaxFemale", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                    </div>
                                  </div>
                                ) : subsub.genderRefType === "CHILDREN" ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] text-purple-500">Child Min</Label><Input type="number" step="0.0001" value={subsub.refRangeMinChild} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMinChild", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                    <div className="space-y-1"><Label className="text-[10px] text-purple-500">Child Max</Label><Input type="number" step="0.0001" value={subsub.refRangeMaxChild} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMaxChild", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                  </div>
                                ) : subsub.genderRefType === "NEWBORN" ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[10px] text-emerald-500">Newborn Min</Label><Input type="number" step="0.0001" value={subsub.refRangeMinNewborn} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMinNewborn", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                    <div className="space-y-1"><Label className="text-[10px] text-emerald-500">Newborn Max</Label><Input type="number" step="0.0001" value={subsub.refRangeMaxNewborn} onChange={(e) => updateSubSubTest(index, sIdx, "refRangeMaxNewborn", e.target.value)} className="h-6 text-xs font-mono" /></div>
                                  </div>
                                ) : null
                              ) : (
                                <div className="space-y-2 pt-2 border-t border-border/40">
                                  <Label className="text-[10px] font-medium text-foreground">Custom Options</Label>
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {(subsub.customOptions || []).map((opt, i) => (
                                      <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px] font-medium">
                                        {opt}
                                      </span>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => openCustomOptionsModal(index, sIdx)} className="h-5 px-1.5 py-0 text-[10px] border-primary/20 hover:bg-primary/5 text-primary">
                                      <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={subtestsEndRef} />
              </div>
            </div>
          </form>
          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 shrink-0 mt-auto">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="test-form" disabled={saving}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</>) : editingTest ? "Update Package" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Options Modal */}
      <Dialog open={customOptionsModalOpen} onOpenChange={(o) => {
        if (!o) {
          setCustomOptionsModalOpen(false);
          setActiveCustomOptionsSubIndex(null);
          setActiveCustomOptionsSubSubIndex(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Options / Suggestions</DialogTitle>
            <DialogDescription>
              Add suggestions that the user can pick from when entering results for this custom field.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Reactive, Positive, Detected..."
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newOptionInput.trim() && !tempCustomOptions.includes(newOptionInput.trim())) {
                      setTempCustomOptions([...tempCustomOptions, newOptionInput.trim()]);
                      setNewOptionInput("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  if (newOptionInput.trim() && !tempCustomOptions.includes(newOptionInput.trim())) {
                    setTempCustomOptions([...tempCustomOptions, newOptionInput.trim()]);
                    setNewOptionInput("");
                  }
                }}
              >
                Add
              </Button>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-lg p-3 min-h-[100px] flex flex-wrap gap-2 items-start content-start">
              {tempCustomOptions.length === 0 ? (
                <span className="text-xs text-muted-foreground w-full text-center py-4">No options added yet.</span>
              ) : (
                tempCustomOptions.map((opt, i) => (
                  <span key={i} className="inline-flex items-center pl-2 pr-1 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium border border-border/40">
                    {opt}
                    <button
                      type="button"
                      onClick={() => setTempCustomOptions(tempCustomOptions.filter((_, idx) => idx !== i))}
                      className="ml-1 p-0.5 rounded-sm hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOptionsModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => {
              if (activeCustomOptionsSubIndex !== null) {
                if (activeCustomOptionsSubSubIndex !== null) {
                  updateSubSubTest(activeCustomOptionsSubIndex, activeCustomOptionsSubSubIndex, "customOptions", tempCustomOptions);
                } else {
                  updateSubTest(activeCustomOptionsSubIndex, "customOptions", tempCustomOptions);
                }
              }
              setCustomOptionsModalOpen(false);
            }}>Save Options</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Test Package</DialogTitle>
            <DialogDescription>
              Delete <strong className="text-foreground">{deleteTarget?.name}</strong> and all its parameters from the catalog? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTest} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Interpretation Modal */}
      <Dialog open={interpretationModalOpen} onOpenChange={setInterpretationModalOpen}>
        <DialogContent hideClose className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Interpretation Editor</DialogTitle>
          <TipTapEditor
            value={interpretation}
            onChange={newContent => setInterpretation(newContent)}
            onSave={() => setInterpretationModalOpen(false)}
            onClose={() => setInterpretationModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Custom Editor Dialog */}
      <Dialog open={customEditorActiveSubIndex !== null} onOpenChange={(o) => !o && setCustomEditorActiveSubIndex(null)}>
        <DialogContent hideClose className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Custom Editor</DialogTitle>
          {customEditorActiveSubIndex !== null && (
            <TipTapEditor
              title="Custom Editor"
              value={subTests[customEditorActiveSubIndex].interpretation || ""}
              onChange={(html) => updateSubTest(customEditorActiveSubIndex, "interpretation", html)}
              onSave={() => setCustomEditorActiveSubIndex(null)}
              onClose={() => setCustomEditorActiveSubIndex(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
