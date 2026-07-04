"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  FlaskConical, ArrowLeft, Loader2, CheckCircle2, AlertTriangle,
  User, AlertCircle, TrendingUp, History, ExternalLink, ClipboardList, Plus, Trash2,
  Search, ChevronDown, ChevronRight, FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TipTapEditor } from "@/components/tiptap-editor";

interface Test { 
  id: string; name: string; category: string; price: number;  unit: string | null;
  interpretation?: string | null; fieldType?: string;
  genderRefType?: string; refRangeMin: number; refRangeMax: number; 
  refRangeMinMale?: number | null; refRangeMaxMale?: number | null; 
  refRangeMinFemale?: number | null; refRangeMaxFemale?: number | null;
  refRangeMinChild?: number | null; refRangeMaxChild?: number | null;
  refRangeMinNewborn?: number | null; refRangeMaxNewborn?: number | null;
  valueType?: string; customOptions?: string | null;
  subTests?: Test[];
  parent?: { id: string; name: string; interpretation?: string; parent?: { id: string; name: string; interpretation?: string } }; 
}
interface ReportTest { id: string; resultValue: string | null; isAbnormal: boolean; test: Test; }
interface Report {
  id: string; customId: string; status: string; createdAt: string; patientId: string;
  patient: { name: string; age: number; gender: string; phone: string; refDoctor: string; customId: string };
  bill: { customId: string; total: number; status: string };
  results: ReportTest[];
}

export default function ResultEntryPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const toast = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<Report[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printedInterpretations, setPrintedInterpretations] = useState<string[]>([]);
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [modifyingTest, setModifyingTest] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  useEffect(() => { 
    if (reportId) {
      fetchReport();
      fetchAvailableTests();
    }
  }, [reportId]);

  const fetchAvailableTests = async () => {
    try {
      const res = await fetch("/api/tests");
      if (res.ok) {
        const data = await res.json();
        // Only keep group/main tests
        setAvailableTests(data.filter((t: any) => t.fieldType === "Group" || !t.parent));
      }
    } catch {}
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const data: Report = await res.json();
        setReport(data);
        const initial: Record<string, string> = {};
        data.results.forEach((r) => { 
          if (!r.resultValue && r.test.fieldType === "Custom Editor" && r.test.interpretation) {
            initial[r.id] = r.test.interpretation;
          } else {
            initial[r.id] = r.resultValue || ""; 
          }
        });
        setValues(initial);
        if (data.patientId) fetchHistory(data.patientId);
        
        if ((data as any).printedInterpretations) {
          try {
            const parsed = JSON.parse((data as any).printedInterpretations);
            setPrintedInterpretations(Array.isArray(parsed) ? parsed : []);
          } catch(e) {}
        }
      } else setError("Failed to retrieve report data.");
    } catch {
      setError("A network error occurred while loading the report.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (patientId: string) => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data: Report[] = await res.json();
        setHistory(data.filter((r) => r.patientId === patientId && r.id !== reportId));
      }
    } catch (err) {
      console.error("Error fetching patient history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleValueChange = (id: string, val: string) => setValues((prev) => ({ ...prev, [id]: val }));

  const getRefRange = (test: Test, patientGender: string, patientAge: number) => {
    if (test.genderRefType === "AGE_AND_GENDER_SPECIFIC") {
      if (patientAge < 1 && (test.refRangeMinNewborn !== null || test.refRangeMaxNewborn !== null)) {
        return {
          min: test.refRangeMinNewborn ?? test.refRangeMin,
          max: test.refRangeMaxNewborn ?? test.refRangeMax
        };
      }
      if (patientAge < 18 && (test.refRangeMinChild !== null || test.refRangeMaxChild !== null)) {
        return {
          min: test.refRangeMinChild ?? test.refRangeMin,
          max: test.refRangeMaxChild ?? test.refRangeMax
        };
      }
      if (patientGender.toLowerCase() === "female") {
        return {
          min: test.refRangeMinFemale ?? test.refRangeMin,
          max: test.refRangeMaxFemale ?? test.refRangeMax
        };
      } else {
        return {
          min: test.refRangeMinMale ?? test.refRangeMin,
          max: test.refRangeMaxMale ?? test.refRangeMax
        };
      }
    }
    if (test.genderRefType === "GENDER_SPECIFIC") {
      if (patientGender.toLowerCase() === "female") {
        return {
          min: test.refRangeMinFemale ?? test.refRangeMin,
          max: test.refRangeMaxFemale ?? test.refRangeMax
        };
      } else {
        return {
          min: test.refRangeMinMale ?? test.refRangeMin,
          max: test.refRangeMaxMale ?? test.refRangeMax
        };
      }
    }
    return { min: test.refRangeMin, max: test.refRangeMax };
  };

  const isValueAbnormal = (test: Test, currentVal: string) => {
    if (test.valueType === "Custom") return { abnormal: false, flag: "NORMAL" };
    if (!currentVal || currentVal.trim() === "") return { abnormal: false, flag: "NORMAL" };
    const num = parseFloat(currentVal);
    if (isNaN(num)) return { abnormal: false, flag: "NORMAL" };
    const range = getRefRange(test, report?.patient.gender || "Male", report?.patient.age || 30);
    if (num < range.min) return { abnormal: true, flag: "LOW" };
    if (num > range.max) return { abnormal: true, flag: "HIGH" };
    return { abnormal: false, flag: "NORMAL" };
  };

  const toggleInterpretation = (testId: string) => {
    setPrintedInterpretations(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  const handleAddTest = async (testId: string) => {
    // legacy support if needed
  };

  const handleAddSelectedTests = async () => {
    if (selectedTests.length === 0) return;
    setModifyingTest(true);
    let successCount = 0;
    
    for (const testId of selectedTests) {
      try {
        const res = await fetch(`/api/reports/${reportId}/tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId })
        });
        if (res.ok) successCount++;
      } catch {}
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} test(s) added successfully.`);
      await fetchReport();
    } else {
      toast.error("Failed to add tests.");
    }
    setIsTestModalOpen(false);
    setSelectedTests([]);
    setModifyingTest(false);
  };

  const handleToggleTest = (testId: string) => {
    setSelectedTests((prev) => prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]);
  };

  const groupedTests: Record<string, Test[]> = {};
  availableTests.forEach((test) => {
    // Only show tests that are not already in the report
    const isInReport = report?.results.some(r => {
      const mt = r.test.parent?.parent ? r.test.parent.parent : (r.test.parent ? r.test.parent : r.test);
      return mt.id === test.id;
    });
    if (!isInReport) {
      (groupedTests[test.category] ||= []).push(test);
    }
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

  const handleRemoveTest = async (mainTestId: string) => {
    if (!confirm("Are you sure you want to remove this test from the report?")) return;
    setModifyingTest(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/tests?mainTestId=${mainTestId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Test removed successfully.");
        await fetchReport();
      } else {
        const data = await res.json();
        toast.error("Error", data.error || "Failed to remove test");
      }
    } catch {
      toast.error("Error", "Network error occurred.");
    } finally {
      setModifyingTest(false);
    }
  };

  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = Object.entries(values).map(([id, resultValue]) => ({ id, resultValue: resultValue.trim() }));
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: payload, printedInterpretations }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Diagnostic results saved successfully.");
        setTimeout(() => { router.push(`/dashboard/reports`); router.refresh(); }, 900);
      } else { setError(data.error || "Failed to update results."); setSaving(false); }
    } catch {
      setError("A network error occurred while updating.");
      setSaving(false);
    }
  };

  const getClinicalInsight = () => {
    if (!report) return null;
    const abnormals = report.results.filter((r) => isValueAbnormal(r.test, values[r.id]).abnormal);
    if (abnormals.length === 0) return "All entered parameters are within standard reference ranges.";
    return `Flagged for: ${abnormals.map((r) => r.test.name).join(", ")}. Recommend correlation with clinical presentation.`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 max-w-lg mx-auto text-center p-8 rounded-xl mt-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <div><h2 className="font-display text-lg font-semibold text-foreground">Retrieval Error</h2><p className="text-sm text-muted-foreground mt-1">{error}</p></div>
        <Link href="/dashboard/reports"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to Reports</Button></Link>
      </div>
    );
  }
  if (!report) return null;

  const groupedResults: Record<string, { [paramName: string]: ReportTest[] }> = {};
  report.results.forEach((item) => {
    let mainTestName = item.test.name;
    let paramName = "_default";

    if (item.test.parent) {
      if (item.test.parent.parent) {
        // Multiple field: item is sub-param, parent is param, parent.parent is main test
        mainTestName = item.test.parent.parent.name;
        paramName = item.test.parent.name;
      } else {
        // Single field: item is param, parent is main test
        mainTestName = item.test.parent.name;
        // Keep paramName as "_default" so they render flat
      }
    }
    
    if (!groupedResults[mainTestName]) groupedResults[mainTestName] = {};
    if (!groupedResults[mainTestName][paramName]) groupedResults[mainTestName][paramName] = [];
    groupedResults[mainTestName][paramName].push(item);
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Main */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports"><Button variant="outline" size="sm" className="h-9"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button></Link>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Enter Results</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Enter test values below.</p>
          </div>
        </div>

        {/* Patient ribbon */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-primary"><User className="h-6 w-6" /></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-semibold text-foreground leading-none">{report.patient.name}</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase">{report.patient.gender}, {report.patient.age}y</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="font-mono text-primary bg-accent px-1.5 py-0.5 rounded">{report.patient.customId}</span>
                <span>Ref: {report.patient.refDoctor}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button onClick={handleSaveResults} disabled={saving} className="h-11">
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : (<><CheckCircle2 className="h-4 w-4" /> Save Results</>)}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSaveResults} className="space-y-6">
          {error && <div className="flex items-center gap-3 rounded-xl bg-destructive/8 border border-destructive/20 p-4 text-sm text-destructive font-medium"><AlertCircle className="h-5 w-5 shrink-0" /><p>{error}</p></div>}
          {success && <div className="flex items-center gap-3 rounded-xl bg-accent border border-primary/20 p-4 text-sm text-primary font-medium"><CheckCircle2 className="h-5 w-5 shrink-0" /><p>{success}</p></div>}

          <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-sm">
            <div className="bg-primary/10 p-2 rounded-lg text-primary"><Plus className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Add Additional Test</h3>
              <p className="text-xs text-muted-foreground">Select a test from the catalog to add it to this report.</p>
            </div>
            <div className="w-[280px]">
              <Button type="button" onClick={() => setIsTestModalOpen(true)} disabled={modifyingTest} className="w-full">
                Browse Test Catalog
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedResults).map(([mainTestName, paramsObj]) => {
              const firstParamKey = Object.keys(paramsObj)[0];
              const firstTestObj = paramsObj[firstParamKey][0].test;
              const mainTestObj = firstTestObj.parent?.parent ? firstTestObj.parent.parent : (firstTestObj.parent ? firstTestObj.parent : firstTestObj);
              const hasInterpretation = !!mainTestObj.interpretation && mainTestObj.interpretation.trim() !== '' && mainTestObj.interpretation !== '<p><br></p>';
              const mainTestId = mainTestObj.id;
              
              const allCustomEditor = Object.values(paramsObj).flat().every(item => item.test.fieldType === "Custom Editor");
              const hasAnyNumeric = Object.values(paramsObj).flat().some(item => item.test.fieldType !== "Custom Editor" && item.test.valueType !== "Custom");
              
              return (
              <div key={mainTestName} className="bg-card border border-border/70 rounded-xl shadow-card overflow-hidden">
                <div className="bg-muted/30 px-6 py-3.5 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FlaskConical className="h-[18px] w-[18px] text-primary shrink-0" />
                    <h3 className="text-sm font-bold tracking-wider uppercase text-foreground">{mainTestName}</h3>
                  </div>
                  <div className="flex items-center space-x-4">
                    {hasInterpretation && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`interp-${mainTestId}`} 
                          checked={printedInterpretations.includes(mainTestId)} 
                          onCheckedChange={() => toggleInterpretation(mainTestId)} 
                        />
                        <Label htmlFor={`interp-${mainTestId}`} className="text-xs text-muted-foreground font-normal">Add Interpretation</Label>
                      </div>
                    )}
                    <button type="button" onClick={() => handleRemoveTest(mainTestId)} disabled={modifyingTest} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Remove test">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    {!allCustomEditor && (
                      <thead>
                        <tr className="bg-muted/15 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground border-b border-border/60">
                          <th className="px-6 py-3 w-2/5">Parameter</th><th className="px-6 py-3">Value</th>
                          {hasAnyNumeric && (
                            <>
                              <th className="px-6 py-3">Unit</th><th className="px-6 py-3">Reference</th><th className="px-6 py-3 text-right">Flag</th>
                            </>
                          )}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {Object.entries(paramsObj).map(([paramName, items]) => (
                        <React.Fragment key={paramName}>
                          {paramName !== "_default" && paramName !== "Report Template" && (
                            <tr className="bg-muted/5 border-b border-border/30">
                              <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-zinc-50">{paramName}</td>
                            </tr>
                          )}
                          {items.map((item) => {
                            const val = values[item.id] || "";
                            const { abnormal, flag } = isValueAbnormal(item.test, val);
                            const isCustomEditor = item.test.fieldType === "Custom Editor";

                            if (isCustomEditor) {
                              return (
                                <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/15 transition-colors">
                                  <td colSpan={hasAnyNumeric ? 5 : 2} className="px-6 py-4">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-foreground">
                                        {item.test.name !== "Report Template" ? item.test.name : ""}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">Custom Layout</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 border border-border/60 rounded-xl overflow-hidden shadow-sm">
                                      <TipTapEditor 
                                        value={val} 
                                        onChange={(html) => handleValueChange(item.id, html)}
                                        hideHeader
                                        hideFooter
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={item.id} className={`border-b border-border/30 last:border-0 transition-colors ${abnormal ? "bg-destructive/[0.04]" : "hover:bg-muted/15"}`}>
                                <td className="px-6 py-3.5">
                                  <span className={`text-sm ${paramName !== "_default" ? "pl-4" : ""} font-semibold ${abnormal ? "text-destructive" : "text-foreground"}`}>{item.test.name}</span>
                                </td>
                                {item.test.valueType === "Custom" ? (
                                  <td className="px-6 py-3.5" colSpan={hasAnyNumeric ? 4 : 1}>
                                    <div className="max-w-md">
                                      <Input 
                                        list={`options-${item.id}`} 
                                        placeholder="Select or enter result..." 
                                        value={val} 
                                        onChange={(e) => handleValueChange(item.id, e.target.value)} 
                                        disabled={saving}
                                        className={`w-full h-9 font-medium text-sm ${abnormal ? "text-destructive border-destructive/50 bg-destructive/8 font-bold focus:ring-destructive/20 focus:border-destructive" : ""}`} 
                                      />
                                      {item.test.customOptions && (
                                        <datalist id={`options-${item.id}`}>
                                          {JSON.parse(item.test.customOptions).map((opt: string, i: number) => (
                                            <option key={i} value={opt} />
                                          ))}
                                        </datalist>
                                      )}
                                    </div>
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-6 py-3.5">
                                      <Input placeholder="—" value={val} onChange={(e) => handleValueChange(item.id, e.target.value)} disabled={saving}
                                        className={`w-28 h-9 font-mono text-sm ${abnormal ? "text-destructive border-destructive/50 bg-destructive/8 font-bold focus:ring-destructive/20 focus:border-destructive" : ""}`} />
                                    </td>
                                    <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">{item.test.unit}</td>
                                    <td className="px-6 py-3.5 text-xs font-mono text-muted-foreground">
                                      {item.test.genderRefType === "AGE_AND_GENDER_SPECIFIC" ? 
                                        ((report?.patient.age || 30) < 1 && (item.test.refRangeMinNewborn !== null || item.test.refRangeMaxNewborn !== null) ? `${item.test.refRangeMinNewborn ?? item.test.refRangeMin} – ${item.test.refRangeMaxNewborn ?? item.test.refRangeMax}` :
                                        (report?.patient.age || 30) < 18 && (item.test.refRangeMinChild !== null || item.test.refRangeMaxChild !== null) ? `${item.test.refRangeMinChild ?? item.test.refRangeMin} – ${item.test.refRangeMaxChild ?? item.test.refRangeMax}` :
                                        report?.patient.gender.toLowerCase() === "female" ? `${item.test.refRangeMinFemale ?? item.test.refRangeMin} – ${item.test.refRangeMaxFemale ?? item.test.refRangeMax}` : `${item.test.refRangeMinMale ?? item.test.refRangeMin} – ${item.test.refRangeMaxMale ?? item.test.refRangeMax}`)
                                        : item.test.genderRefType === "GENDER_SPECIFIC" ? 
                                        (report?.patient.gender.toLowerCase() === "female" ? `${item.test.refRangeMinFemale ?? item.test.refRangeMin} – ${item.test.refRangeMaxFemale ?? item.test.refRangeMax}` : `${item.test.refRangeMinMale ?? item.test.refRangeMin} – ${item.test.refRangeMaxMale ?? item.test.refRangeMax}`)
                                        : `${item.test.refRangeMin} – ${item.test.refRangeMax}`}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                      {abnormal ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-destructive text-destructive-foreground">{flag}</span>
                                      ) : val ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">NORMAL</span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground/45 italic">Pending</span>
                                      )}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )})}
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Link href="/dashboard/reports"><Button type="button" variant="outline" disabled={saving}>Cancel</Button></Link>
            <Button type="submit" disabled={saving}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Compiling…</>) : (<><CheckCircle2 className="h-4 w-4" /> Save & Authorize</>)}
            </Button>
          </div>
        </form>
      </div>

      {/* Add Test Modal */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">Add Tests</DialogTitle>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 shrink-0 bg-muted/30">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">Select Tests</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Add more tests to the report.
              </p>
            </div>
          </div>

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
                <p className="text-xs font-semibold">No available tests match your search.</p>
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
                            className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer select-none transition-all ${
                              selected ? "bg-accent border-primary/50" : "bg-card border-border hover:border-primary/30"
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
                                <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedTests(prev => ({...prev, [test.id]: !prev[test.id]})) }} className="p-1 rounded hover:bg-muted text-muted-foreground">
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
                                    className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer ${
                                      subSelected ? "bg-accent/50 border-primary/30" : "bg-card border-transparent hover:border-border"
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

          <div className="border-t border-border/60 px-6 py-4 shrink-0 bg-muted/40 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{selectedTests.length} Tests Selected</p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleAddSelectedTests} disabled={selectedTests.length === 0 || modifyingTest}>
                {modifyingTest ? "Adding..." : "Add Selected Tests"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
