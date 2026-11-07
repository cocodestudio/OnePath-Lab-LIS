import catalogData from "./analyzer_catalog.json";

export type AnalyzerCategory =
  | "Haematology"
  | "Biochemistry"
  | "Immunology"
  | "Electrolytes"
  | "Coagulation"
  | "Urinalysis";

export type AnalyzerProtocol =
  | "ASTM / TCP-IP"
  | "HL7 v2.x"
  | "ASTM (RS-232)"
  | "JSON / Webhook";

export type AnalyzerConnectionType = "TCP_IP" | "SERIAL_RS232";

export interface AnalyzerModel {
  id: string;
  brand: string;
  model: string;
  category: AnalyzerCategory;
  protocol: AnalyzerProtocol | string;
  connection_type: AnalyzerConnectionType;
  port: number;
  baud_rate: number;
  com_port?: string;
  description: string;
  parameter_mappings?: Record<string, string>;
}

export const ANALYZER_CATEGORIES: Array<{ id: string; label: string; icon?: string }> = [
  { id: "ALL", label: "All Categories" },
  { id: "Haematology", label: "Haematology (CBC)" },
  { id: "Biochemistry", label: "Biochemistry / Chemistry" },
  { id: "Immunology", label: "Immunology / CLIA" },
  { id: "Electrolytes", label: "Electrolytes / ISE" },
  { id: "Coagulation", label: "Coagulation (PT/INR)" },
  { id: "Urinalysis", label: "Urinalysis" },
];

export const ANALYZER_CATALOG: AnalyzerModel[] = (catalogData as unknown) as AnalyzerModel[];

/**
 * Search analyzer catalog by text query and category filter.
 */
export function searchAnalyzers(query = "", category = "ALL"): AnalyzerModel[] {
  const cleanQuery = (query ?? "").trim().toLowerCase();
  const cleanCategory = (category ?? "ALL").trim();

  return ANALYZER_CATALOG.filter((item) => {
    // Category match
    if (cleanCategory !== "ALL" && cleanCategory !== "" && item.category !== cleanCategory) {
      return false;
    }

    // Query match
    if (!cleanQuery) return true;

    const brandMatch = item.brand?.toLowerCase().includes(cleanQuery) ?? false;
    const modelMatch = item.model?.toLowerCase().includes(cleanQuery) ?? false;
    const descMatch = item.description?.toLowerCase().includes(cleanQuery) ?? false;
    const catMatch = item.category?.toLowerCase().includes(cleanQuery) ?? false;
    const protoMatch = item.protocol?.toLowerCase().includes(cleanQuery) ?? false;

    return brandMatch || modelMatch || descMatch || catMatch || protoMatch;
  });
}

/**
 * Find analyzer by ID.
 */
export function getAnalyzerById(id: string): AnalyzerModel | undefined {
  if (!id) return undefined;
  return ANALYZER_CATALOG.find((item) => item.id.toLowerCase() === id.toLowerCase());
}

/**
 * Filter analyzers strictly by category.
 */
export function getAnalyzersByCategory(category: AnalyzerCategory): AnalyzerModel[] {
  return ANALYZER_CATALOG.filter((item) => item.category === category);
}

/**
 * Key flagship analyzers commonly deployed in Indian and global clinical laboratories.
 */
export function getPopularAnalyzers(): AnalyzerModel[] {
  const popularIds = [
    "beacon-unikon-230",
    "mindray-bc-5000",
    "sysmex-xp-100",
    "erba-chem-7",
    "erba-xl-200",
    "snibe-maglumi-800",
    "sensa-core-st-200",
    "stago-sta-compact",
    "dirui-h-100",
    "mindray-bc-3000-plus",
    "sysmex-xn-350",
    "beacon-b-200",
  ];
  return ANALYZER_CATALOG.filter((item) => popularIds.includes(item.id));
}

