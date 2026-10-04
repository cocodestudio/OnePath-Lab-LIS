export interface OutsourceLabTest {
  test_id?: string;
  testId?: string;
  test_name?: string;
  testName?: string;
  test_code?: string;
  testCode?: string;
  category?: string;
  default_price?: number;
  defaultPrice?: number;
  outsource_price?: number;
  outsourcePrice?: number;
}

export interface OutsourcePartnerLab {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
  tests: OutsourceLabTest[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export const DEFAULT_PARTNER_LABS: OutsourcePartnerLab[] = [
  { id: "plab_1_drlal", name: "Dr. Lal PathLabs", code: "LAL", tests: [] },
  { id: "plab_2_srl", name: "SRL Diagnostics", code: "SRL", tests: [] },
  { id: "plab_3_metro", name: "Metropolis Healthcare", code: "METRO", tests: [] },
  { id: "plab_4_thyro", name: "Thyrocare Technologies", code: "THYRO", tests: [] },
  { id: "plab_5_red", name: "Redcliffe Labs", code: "RED", tests: [] },
  { id: "plab_6_gd", name: "General Diagnostics", code: "GD", tests: [] },
  { id: "plab_7_apollo", name: "Apollo Diagnostics", code: "APOLLO", tests: [] },
  { id: "plab_8_path", name: "Pathkind Labs", code: "PATH", tests: [] },
  { id: "plab_9_max", name: "Max Healthcare Labs", code: "MAX", tests: [] },
];

const STORAGE_KEY = "lis_cached_outsource_partner_labs";

export function getCachedPartnerLabs(): OutsourcePartnerLab[] {
  if (typeof window === "undefined") return DEFAULT_PARTNER_LABS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading cached partner labs:", e);
  }
  return DEFAULT_PARTNER_LABS;
}

export function setCachedPartnerLabs(labs: OutsourcePartnerLab[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labs));
    window.dispatchEvent(new CustomEvent("outsource_partner_labs_updated", { detail: labs }));
  } catch (e) {
    console.error("Error saving cached partner labs:", e);
  }
}
