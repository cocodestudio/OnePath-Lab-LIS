export interface PackageTestItem {
  id: string;
  name: string;
  category?: string;
  price?: number;
  code?: string;
}

export interface LabPackage {
  id: string;
  name: string;
  code: string;
  price: number;
  testIds: string[];
  tests: PackageTestItem[];
  description?: string;
  createdAt: string;
}

const STORAGE_KEY = "lis_custom_packages";

export const DEFAULT_PACKAGES: LabPackage[] = [
  {
    id: "pkg-fbh-01",
    name: "Full Body Health Checkup - Comprehensive",
    code: "PKG-FBH01",
    price: 1499,
    testIds: [
      "01a05d66-d6b9-708d-bf17-f48c6fd53f64", // Complete Blood Count (CBC)
      "01a05d88-410c-72a8-a58c-52cc4e33246d", // Liver Function Test (LFT)
      "01a05d88-4133-727c-a07a-15a444017170", // Kidney Function Test (KFT)
      "01a05d88-415a-7021-94f5-aa0167dc483d", // Lipid Profile
      "01a05d88-3f99-715b-b4b6-1724dfe875b3", // Urine Routine Examination
    ],
    tests: [
      { id: "01a05d66-d6b9-708d-bf17-f48c6fd53f64", name: "Complete Blood Count (CBC)", category: "Hematology", price: 250, code: "CBC-01" },
      { id: "01a05d88-410c-72a8-a58c-52cc4e33246d", name: "Liver Function Test (LFT)", category: "Biochemistry", price: 500, code: "LFT-01" },
      { id: "01a05d88-4133-727c-a07a-15a444017170", name: "Kidney Function Test (KFT)", category: "Biochemistry", price: 500, code: "KFT-01" },
      { id: "01a05d88-415a-7021-94f5-aa0167dc483d", name: "Lipid Profile", category: "Biochemistry", price: 450, code: "LIP-01" },
      { id: "01a05d88-3f99-715b-b4b6-1724dfe875b3", name: "Urine Routine Examination", category: "Clinical Pathology", price: 150, code: "URN-01" },
    ],
    description: "Complete vital screening panel covering hemogram, liver, renal and cardiac lipid metrics.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "pkg-car-02",
    name: "Executive Cardiac & Lipid Profile",
    code: "PKG-CAR02",
    price: 899,
    testIds: [
      "01a05d88-415a-7021-94f5-aa0167dc483d", // Lipid Profile
      "01a05d66-d6b9-708d-bf17-f48c6fd53f64", // Complete Blood Count (CBC)
      "01a05d88-4133-727c-a07a-15a444017170", // Kidney Function Test (KFT)
    ],
    tests: [
      { id: "01a05d88-415a-7021-94f5-aa0167dc483d", name: "Lipid Profile", category: "Biochemistry", price: 450, code: "LIP-01" },
      { id: "01a05d66-d6b9-708d-bf17-f48c6fd53f64", name: "Complete Blood Count (CBC)", category: "Hematology", price: 250, code: "CBC-01" },
      { id: "01a05d88-4133-727c-a07a-15a444017170", name: "Kidney Function Test (KFT)", category: "Biochemistry", price: 500, code: "KFT-01" },
    ],
    description: "Evaluation of cardiovascular risk markers, circulating lipids and systemic hemogram.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "pkg-dia-03",
    name: "Complete Diabetic Screening Panel",
    code: "PKG-DIA03",
    price: 699,
    testIds: [
      "01a05d88-4199-7253-a5da-ea1389dd07bd", // HbA1c
      "01a05d88-4133-727c-a07a-15a444017170", // KFT
      "01a05d88-3f99-715b-b4b6-1724dfe875b3", // Urine Routine
    ],
    tests: [
      { id: "01a05d88-4199-7253-a5da-ea1389dd07bd", name: "HbA1c (Glycosylated Hemoglobin)", category: "Biochemistry", price: 400, code: "HBA-01" },
      { id: "01a05d88-4133-727c-a07a-15a444017170", name: "Kidney Function Test (KFT)", category: "Biochemistry", price: 500, code: "KFT-01" },
      { id: "01a05d88-3f99-715b-b4b6-1724dfe875b3", name: "Urine Routine Examination", category: "Clinical Pathology", price: 150, code: "URN-01" },
    ],
    description: "Glycemic control telemetry including 3-month average HbA1c, renal clearance and urine microscopy.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "pkg-thy-04",
    name: "Comprehensive Thyroid Care Package",
    code: "PKG-THY04",
    price: 799,
    testIds: [
      "01a05d88-4179-71f1-959d-c3cfaea799e7", // Thyroid Profile
      "01a05d66-d6b9-708d-bf17-f48c6fd53f64", // CBC
    ],
    tests: [
      { id: "01a05d88-4179-71f1-959d-c3cfaea799e7", name: "Thyroid Profile (Total T3, Total T4, TSH)", category: "Endocrinology", price: 400, code: "THY-01" },
      { id: "01a05d66-d6b9-708d-bf17-f48c6fd53f64", name: "Complete Blood Count (CBC)", category: "Hematology", price: 250, code: "CBC-01" },
    ],
    description: "Complete tri-hormonal thyroid axis assessment (T3, T4, TSH) combined with hemogram index.",
    createdAt: new Date().toISOString(),
  },
];

/**
 * Resolves all constituent test IDs from a package to valid database UUIDs.
 * Matches against availableTests by exact ID, test code, or test name.
 */
export function resolvePackageTestIds(pkg: LabPackage, availableTests: any[] = []): string[] {
  const resolvedIds: string[] = [];
  const rawIds = pkg.testIds && pkg.testIds.length > 0 ? pkg.testIds : (pkg.tests?.map((t: any) => t.id) || []);
  const pkgTestNames = (pkg.tests || []).map((t: any) => (t.name || "").toLowerCase().trim()).filter(Boolean);
  const pkgTestCodes = (pkg.tests || []).map((t: any) => (t.testCode || t.test_code || t.code || "").toLowerCase().trim()).filter(Boolean);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (Array.isArray(availableTests) && availableTests.length > 0) {
    // 1. Direct ID match
    for (const tid of rawIds) {
      const matched = availableTests.find(at => at.id === tid);
      if (matched && !resolvedIds.includes(matched.id)) {
        resolvedIds.push(matched.id);
      }
    }

    // 2. Code match
    for (const tid of rawIds) {
      const matched = availableTests.find(at => {
        const code = (at.testCode || at.test_code || at.code || "").toLowerCase().trim();
        return code && (code === tid.toLowerCase().trim() || tid.toLowerCase().includes(code));
      });
      if (matched && !resolvedIds.includes(matched.id)) {
        resolvedIds.push(matched.id);
      }
    }
    for (const code of pkgTestCodes) {
      if (!code) continue;
      const matched = availableTests.find(at => {
        const atCode = (at.testCode || at.test_code || at.code || "").toLowerCase().trim();
        return atCode && atCode === code;
      });
      if (matched && !resolvedIds.includes(matched.id)) {
        resolvedIds.push(matched.id);
      }
    }

    // 3. Name match (exact or substring)
    for (const testName of pkgTestNames) {
      if (!testName) continue;
      let matched = availableTests.find(at => (at.name || "").toLowerCase().trim() === testName);
      if (!matched) {
        matched = availableTests.find(at => {
          const atName = (at.name || "").toLowerCase().trim();
          return atName.includes(testName) || testName.includes(atName);
        });
      }
      if (matched && !resolvedIds.includes(matched.id)) {
        resolvedIds.push(matched.id);
      }
    }
  }

  // 4. Any raw IDs that are already valid UUID format
  for (const tid of rawIds) {
    if (uuidRegex.test(tid) && !resolvedIds.includes(tid)) {
      resolvedIds.push(tid);
    }
  }

  return resolvedIds;
}

import { fetchFromLaravel } from "@/lib/api-client";

export function normalizePackage(p: any): LabPackage {
  const testIds = Array.isArray(p.testIds)
    ? p.testIds
    : Array.isArray(p.test_ids)
    ? p.test_ids
    : [];
  const tests = Array.isArray(p.tests) ? p.tests : [];
  return {
    id: String(p.id),
    name: p.name || "",
    code: p.code || p.test_code || `PKG-${String(p.id).substring(0, 5).toUpperCase()}`,
    price: Number(p.price || 0),
    testIds: testIds.length > 0 ? testIds : tests.map((t: any) => t.id).filter(Boolean),
    tests: tests,
    description: p.description || "",
    createdAt: p.createdAt || p.created_at || new Date().toISOString(),
  };
}

export function getStoredPackages(): LabPackage[] {
  if (typeof window === "undefined") return DEFAULT_PACKAGES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PACKAGES));
      return DEFAULT_PACKAGES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      // Auto-migrate corrupted or mock test IDs in existing localStorage
      const hasCorruptIds = parsed.some(p =>
        (p.testIds && p.testIds.some((tid: string) => !uuidRegex.test(tid))) ||
        (p.tests && p.tests.some((t: any) => t.id && !uuidRegex.test(t.id)))
      );
      if (hasCorruptIds) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PACKAGES));
        return DEFAULT_PACKAGES;
      }
      return parsed;
    }
    return DEFAULT_PACKAGES;
  } catch (err) {
    console.error("Error reading stored packages:", err);
    return DEFAULT_PACKAGES;
  }
}

export function saveStoredPackages(packages: LabPackage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
  } catch (err) {
    console.error("Error saving stored packages:", err);
  }
}

export async function fetchPackagesFromApi(): Promise<LabPackage[]> {
  try {
    const res = await fetchFromLaravel("/packages", { skipCache: true });
    if (res && res.status === "success" && Array.isArray(res.data)) {
      const normalized = res.data.map(normalizePackage);
      if (normalized.length > 0) {
        saveStoredPackages(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch packages from API:", err);
  }
  return getStoredPackages();
}

export async function syncLocalPackagesWithBackend(): Promise<LabPackage[]> {
  const localPackages = getStoredPackages();
  try {
    const res = await fetchFromLaravel("/packages/sync", {
      method: "POST",
      body: JSON.stringify({ packages: localPackages }),
      skipCache: true,
    });
    if (res && res.status === "success" && Array.isArray(res.data)) {
      const normalized = res.data.map(normalizePackage);
      saveStoredPackages(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn("Failed to sync packages with backend:", err);
  }
  return localPackages;
}

export function addPackage(pkg: Omit<LabPackage, "id" | "createdAt">): LabPackage {
  const current = getStoredPackages();
  const newPkg: LabPackage = {
    ...pkg,
    id: `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newPkg, ...current];
  saveStoredPackages(updated);

  // Background server persistence
  fetchFromLaravel("/packages", {
    method: "POST",
    body: JSON.stringify(newPkg),
  }).catch((err) => {
    console.warn("Background package create sync failed:", err);
  });

  return newPkg;
}

export function updatePackage(id: string, updates: Partial<LabPackage>): LabPackage | null {
  const current = getStoredPackages();
  let updatedItem: LabPackage | null = null;
  const updated = current.map((p) => {
    if (p.id === id) {
      updatedItem = { ...p, ...updates };
      return updatedItem;
    }
    return p;
  });
  saveStoredPackages(updated);

  // Background server persistence
  if (updatedItem) {
    fetchFromLaravel("/packages", {
      method: "POST",
      body: JSON.stringify({ id, ...updates }),
    }).catch((err) => {
      console.warn("Background package update sync failed:", err);
    });
  }

  return updatedItem;
}

export function deletePackage(id: string): boolean {
  const current = getStoredPackages();
  const filtered = current.filter((p) => p.id !== id);
  saveStoredPackages(filtered);

  // Background server persistence
  fetchFromLaravel(`/packages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch((err) => {
    console.warn("Background package delete sync failed:", err);
  });

  return true;
}

const REPORT_PACKAGE_MAP_KEY = "lis_report_package_map";

export function saveReportPackage(reportIdOrCustomId: string, packageName: string, additionalKey?: string) {
  if (typeof window === "undefined" || !reportIdOrCustomId || !packageName) return;
  try {
    const raw = localStorage.getItem(REPORT_PACKAGE_MAP_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[reportIdOrCustomId] = packageName;
    if (additionalKey) {
      map[additionalKey] = packageName;
    }
    localStorage.setItem(REPORT_PACKAGE_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Error saving report package map:", e);
  }
}

export function getReportPackage(reportIdOrCustomId?: string | null): string | null {
  if (typeof window === "undefined" || !reportIdOrCustomId) return null;
  try {
    const raw = localStorage.getItem(REPORT_PACKAGE_MAP_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[reportIdOrCustomId] || null;
  } catch {
    return null;
  }
}
