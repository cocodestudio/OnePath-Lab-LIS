// Unit Test: Diagnostic Specimens & Invoice Payment Status Logic
import assert from "node:assert";

// 1. Recreate resolveSampleType logic identical to src/components/invoice-sheet.tsx
function resolveSampleType(testObj) {
  const rawSample = (testObj?.sampleType || testObj?.sample_type || testObj?.specimen || "").toString().trim();
  if (rawSample && !/^blood$/i.test(rawSample) && !/^pathology$/i.test(rawSample)) {
    return rawSample;
  }

  const name = String(testObj?.name || "").toLowerCase();
  const cat = String(testObj?.category || "").toLowerCase();

  // 1. Urine
  if (
    name.includes("urine") || cat.includes("urine") ||
    name.includes("upt") || name.includes("microalbumin") ||
    name.includes("bence jones")
  ) {
    return "Urine";
  }

  // 2. Stool
  if (name.includes("stool") || cat.includes("stool") || name.includes("occult blood")) {
    return "Stool";
  }

  // 3. Sputum / Swab / Semen / Body Fluids / Biopsy / Pap
  if (name.includes("sputum") || cat.includes("sputum")) return "Sputum";
  if (name.includes("semen") || cat.includes("semen") || name.includes("seminal")) return "Semen";
  if (name.includes("swab") || cat.includes("swab") || name.includes("throat") || name.includes("nasal") || name.includes("covid") || name.includes("rt-pcr")) return "Nasopharyngeal Swab";
  if (name.includes("pap") || name.includes("cervical")) return "Cervical Smear";
  if (name.includes("biopsy") || name.includes("histopath") || cat.includes("histopathology")) return "Tissue Specimen";
  if (name.includes("fluid") || cat.includes("csf") || name.includes("csf") || name.includes("ascitic") || name.includes("pleural") || name.includes("synovial") || name.includes("peritoneal")) return "Body Fluid";

  // 4. Citrated Plasma (Coagulation)
  if (
    name.includes("pt/inr") || name.includes("pt-inr") || name.includes("prothrombin") ||
    name.includes("inr") || name.includes("aptt") || name.includes("ptt") ||
    name.includes("d-dimer") || name.includes("ddimer") || name.includes("fibrinogen") ||
    cat.includes("coagulation")
  ) {
    return "Citrated Plasma";
  }

  // 5. Fluoride Plasma (Blood Glucose / Sugar specific)
  if (
    name.includes("fbs") || name.includes("ppbs") || name.includes("rbs") ||
    name.includes("fasting blood sugar") || name.includes("post prandial") ||
    name.includes("glucose tolerance") || name.includes("gtt")
  ) {
    return "Fluoride Plasma / Serum";
  }

  // 6. EDTA Whole Blood (Hematology)
  if (
    name.includes("cbc") || name.includes("hemogram") || name.includes("complete blood") ||
    name.includes("hemoglobin") || name.includes("haemoglobin") || name.startsWith("hb ") || name === "hb" ||
    name.includes("esr") || name.includes("tlc") || name.includes("dlc") ||
    name.includes("platelet") || name.includes("edta") || name.includes("blood group") ||
    name.includes("rh factor") || name.includes("rh typing") || name.includes("abo") ||
    name.includes("peripheral") || name.includes("ps for") || name.includes("blood smear") ||
    name.includes("malaria") || name.includes("mp ") || name.includes("mp card") ||
    name.includes("hba1c") || name.includes("glycated") || name.includes("glycosylated") ||
    name.includes("sickling") || name.includes("reticulocyte") || name.includes("aec") ||
    cat.includes("haematology") || cat.includes("hematology")
  ) {
    return "EDTA Whole Blood";
  }

  // 7. Serum (Biochemistry, Serology, Hormones, Immunology, Liver, Kidney, Lipid, Electrolytes, Vitamins, etc.)
  if (
    cat.includes("biochemistry") || cat.includes("serology") || cat.includes("immunology") ||
    cat.includes("hormone") || cat.includes("endocrinology") || cat.includes("cardiac") ||
    cat.includes("clinical pathology") || cat.includes("microbiology") || cat.includes("special chemistry") ||
    name.includes("lft") || name.includes("liver") || name.includes("bilirubin") ||
    name.includes("sgot") || name.includes("sgpt") || name.includes("alt") || name.includes("ast") ||
    name.includes("alkaline phosphatase") || name.includes("alp") || name.includes("albumin") ||
    name.includes("globulin") || name.includes("ggt") || name.includes("protein") ||
    name.includes("kft") || name.includes("rft") || name.includes("renal") || name.includes("kidney") ||
    name.includes("creatinine") || name.includes("urea") || name.includes("uric") || name.includes("bun") ||
    name.includes("lipid") || name.includes("cholesterol") || name.includes("triglyceride") ||
    name.includes("hdl") || name.includes("ldl") || name.includes("vldl") ||
    name.includes("troponin") || name.includes("ck-mb") || name.includes("cpk") ||
    name.includes("thyroid") || name.includes("tsh") || name.includes("t3") || name.includes("t4") ||
    name.includes("ft3") || name.includes("ft4") || name.includes("beta hcg") || name.includes("hcg") ||
    name.includes("prolactin") || name.includes("testosterone") || name.includes("fsh") ||
    name.includes("lh") || name.includes("estrogen") || name.includes("cortisol") ||
    name.includes("insulin") || name.includes("amh") ||
    name.includes("glucose") || name.includes("sugar") ||
    name.includes("electrolyte") || name.includes("sodium") || name.includes("potassium") ||
    name.includes("chloride") || name.includes("calcium") || name.includes("phosphorus") ||
    name.includes("magnesium") ||
    name.includes("vitamin") || name.includes("vit ") || name.includes("vit-") ||
    name.includes("b12") || name.includes("d3") || name.includes("25-oh") ||
    name.includes("ferritin") || name.includes("iron") || name.includes("tibc") ||
    name.includes("crp") || name.includes("c-reactive") || name.includes("ra factor") ||
    name.includes("rheumatoid") || name.includes("rf") || name.includes("aso") ||
    name.includes("widal") || name.includes("typhoid") || name.includes("typhidot") ||
    name.includes("dengue") || name.includes("ns1") || name.includes("chikungunya") ||
    name.includes("hiv") || name.includes("hbsag") || name.includes("hcv") ||
    name.includes("vdrl") || name.includes("tpha") || name.includes("syphilis") ||
    name.includes("procalcitonin") || name.includes("amylase") || name.includes("lipase")
  ) {
    return "Serum";
  }

  return rawSample || "Serum";
}

// 2. Invoice Sheet Payment Calculation Logic
function calculateInvoiceSheetPayment(invoice) {
  const isPaid = invoice.status === "PAID";
  const effectivePaidAmount = isPaid ? (invoice.total || 0) : (invoice.paidAmount || 0);
  const balance = isPaid ? 0 : Math.max(0, (invoice.total || 0) - (invoice.paidAmount || 0));
  return { isPaid, effectivePaidAmount, balance };
}

// 3. Register Page Direct Print Status Derivation
function deriveRegisterInvoiceStatus(successDetails, grandTotal, parsedDiscount, parsedPaid, balanceDue, selectedPaymentMode) {
  const total = Number(successDetails?.total ?? grandTotal);
  const discount = Number(successDetails?.discount ?? parsedDiscount);
  const paidAmount = Number(
    successDetails?.paymentStatus === "PAID"
      ? (successDetails?.total ?? grandTotal)
      : (successDetails?.paidAmount ?? parsedPaid ?? 0)
  );
  const status = (
    successDetails?.paymentStatus === "PAID" ||
    (Number(successDetails?.balanceDue ?? balanceDue) <= 0 && Number(successDetails?.paidAmount ?? parsedPaid) > 0)
  )
    ? "PAID"
    : (Number(successDetails?.paidAmount ?? parsedPaid) > 0 ? "PARTIAL" : "UNPAID");
  const paymentMode = successDetails?.paymentMode || selectedPaymentMode || "CASH / UPI";

  return { total, discount, paidAmount, status, paymentMode };
}

console.log("=== RUNNING UNIT TESTS ===");

// ── TEST SUITE 1: Specimen Resolution ──
console.log("\n--- Suite 1: Specimen Resolution Tests ---");

const testCases = [
  // Serum tests (Liver, Kidney, Lipids, Thyroid, Hormones, Serology, Electrolytes)
  { test: { name: "Liver Function Test (LFT)", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "LFT Panel", category: "General Pathology" }, expected: "Serum" },
  { test: { name: "Serum Creatinine", category: "Pathology" }, expected: "Serum" },
  { test: { name: "Kidney Function Test (KFT)", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "KFT / RFT", category: "Pathology" }, expected: "Serum" },
  { test: { name: "Lipid Profile", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Serum Bilirubin Total & Direct", category: "Pathology" }, expected: "Serum" },
  { test: { name: "SGOT / AST", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "SGPT / ALT", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Thyroid Profile Total (T3, T4, TSH)", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "TSH Ultra", category: "Hormones" }, expected: "Serum" },
  { test: { name: "Serum Electrolytes (Na, K, Cl)", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Serum Calcium", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Serum Uric Acid", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Vitamin D (25-OH)", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Vitamin B12", category: "Biochemistry" }, expected: "Serum" },
  { test: { name: "Widal Test (Slide Method)", category: "Serology" }, expected: "Serum" },
  { test: { name: "Dengue NS1 Antigen", category: "Serology" }, expected: "Serum" },
  { test: { name: "HIV 1 & 2 Rapid", category: "Serology" }, expected: "Serum" },
  { test: { name: "HBsAg Card", category: "Serology" }, expected: "Serum" },
  { test: { name: "C-Reactive Protein (CRP)", category: "Serology" }, expected: "Serum" },
  { test: { name: "RA Factor (Quantitative)", category: "Serology" }, expected: "Serum" },

  // Whole Blood / EDTA tests
  { test: { name: "Complete Blood Count (CBC)", category: "Hematology" }, expected: "EDTA Whole Blood" },
  { test: { name: "CBC with Automated Differential", category: "Haematology" }, expected: "EDTA Whole Blood" },
  { test: { name: "Hemoglobin (Hb)", category: "Hematology" }, expected: "EDTA Whole Blood" },
  { test: { name: "ESR (Westergren)", category: "Hematology" }, expected: "EDTA Whole Blood" },
  { test: { name: "HbA1c (Glycated Hemoglobin)", category: "Biochemistry" }, expected: "EDTA Whole Blood" },
  { test: { name: "Blood Grouping & Rh Typing", category: "Hematology" }, expected: "EDTA Whole Blood" },
  { test: { name: "Peripheral Blood Smear (PS)", category: "Hematology" }, expected: "EDTA Whole Blood" },
  { test: { name: "Malaria Parasite (MP Card)", category: "Hematology" }, expected: "EDTA Whole Blood" },

  // Urine tests
  { test: { name: "Urine Routine & Microscopic Examination", category: "Clinical Pathology" }, expected: "Urine" },
  { test: { name: "Urine Pregnancy Test (UPT)", category: "Pathology" }, expected: "Urine" },
  { test: { name: "Microalbumin Urine", category: "Biochemistry" }, expected: "Urine" },

  // Citrated Plasma tests
  { test: { name: "Prothrombin Time with INR (PT/INR)", category: "Coagulation" }, expected: "Citrated Plasma" },
  { test: { name: "APTT / PTT", category: "Coagulation" }, expected: "Citrated Plasma" },
  { test: { name: "D-Dimer", category: "Coagulation" }, expected: "Citrated Plasma" },

  // Glucose specific (Fluoride Plasma / Serum)
  { test: { name: "Fasting Blood Sugar (FBS)", category: "Biochemistry" }, expected: "Fluoride Plasma / Serum" },
  { test: { name: "Post Prandial Blood Sugar (PPBS)", category: "Biochemistry" }, expected: "Fluoride Plasma / Serum" },

  // Stool tests
  { test: { name: "Stool Routine & Occult Blood", category: "Clinical Pathology" }, expected: "Stool" },
];

let suite1Passed = 0;
testCases.forEach((tc, idx) => {
  const resolved = resolveSampleType(tc.test);
  assert.strictEqual(
    resolved,
    tc.expected,
    `FAILED: "${tc.test.name}" resolved to "${resolved}", expected "${tc.expected}"`
  );
  suite1Passed++;
  console.log(`  ✓ [${idx + 1}/${testCases.length}] "${tc.test.name}" => ${resolved}`);
});
console.log(`-> Suite 1 Passed: ${suite1Passed}/${testCases.length} tests.\n`);

// ── TEST SUITE 2: Patient Registration Invoice Payment Status ──
console.log("--- Suite 2: Registration Invoice Payment Status Tests ---");

// Case 2.1: Full Payment at Registration (Cash)
const case21 = deriveRegisterInvoiceStatus(
  { total: 500, discount: 0, paidAmount: 500, balanceDue: 0, paymentStatus: "PAID", paymentMode: "CASH" },
  500, 0, 500, 0, "CASH"
);
assert.strictEqual(case21.status, "PAID");
assert.strictEqual(case21.paidAmount, 500);
assert.strictEqual(case21.paymentMode, "CASH");
const invoice21 = calculateInvoiceSheetPayment({ status: case21.status, total: case21.total, paidAmount: case21.paidAmount });
assert.strictEqual(invoice21.isPaid, true);
assert.strictEqual(invoice21.balance, 0);
console.log("  ✓ Case 2.1 (Full Cash at Registration): Status=PAID, Paid=500, Due=0");

// Case 2.2: Payment Applied on Success Screen (User clicked Cash button)
const case22 = deriveRegisterInvoiceStatus(
  { total: 800, discount: 0, paidAmount: 800, balanceDue: 0, paymentStatus: "PAID", paymentMode: "CASH" },
  800, 0, 0, 800, "CASH" // Note: initial form had parsedPaid=0, but successDetails updated to PAID!
);
assert.strictEqual(case22.status, "PAID");
assert.strictEqual(case22.paidAmount, 800);
assert.strictEqual(case22.paymentMode, "CASH");
const invoice22 = calculateInvoiceSheetPayment({ status: case22.status, total: case22.total, paidAmount: case22.paidAmount });
assert.strictEqual(invoice22.isPaid, true);
assert.strictEqual(invoice22.balance, 0);
console.log("  ✓ Case 2.2 (Payment Applied on Success Screen): Status=PAID, Paid=800, Due=0");

// Case 2.3: Payment Applied on Success Screen (UPI)
const case23 = deriveRegisterInvoiceStatus(
  { total: 1200, discount: 200, paidAmount: 1200, balanceDue: 0, paymentStatus: "PAID", paymentMode: "UPI" },
  1200, 200, 0, 1200, "UPI"
);
assert.strictEqual(case23.status, "PAID");
assert.strictEqual(case23.paidAmount, 1200);
assert.strictEqual(case23.paymentMode, "UPI");
const invoice23 = calculateInvoiceSheetPayment({ status: case23.status, total: case23.total, paidAmount: case23.paidAmount });
assert.strictEqual(invoice23.isPaid, true);
assert.strictEqual(invoice23.balance, 0);
console.log("  ✓ Case 2.3 (UPI Payment on Success Screen): Status=PAID, Paid=1200, Due=0");

// Case 2.4: Partial Payment
const case24 = deriveRegisterInvoiceStatus(
  { total: 1000, discount: 0, paidAmount: 400, balanceDue: 600, paymentStatus: "PARTIAL", paymentMode: "CASH" },
  1000, 0, 400, 600, "CASH"
);
assert.strictEqual(case24.status, "PARTIAL");
assert.strictEqual(case24.paidAmount, 400);
const invoice24 = calculateInvoiceSheetPayment({ status: case24.status, total: case24.total, paidAmount: case24.paidAmount });
assert.strictEqual(invoice24.isPaid, false);
assert.strictEqual(invoice24.balance, 600);
console.log("  ✓ Case 2.4 (Partial Payment): Status=PARTIAL, Paid=400, Due=600");

// Case 2.5: Unpaid
const case25 = deriveRegisterInvoiceStatus(
  { total: 600, discount: 0, paidAmount: 0, balanceDue: 600, paymentStatus: "UNPAID", paymentMode: "UNPAID" },
  600, 0, 0, 600, "UNPAID"
);
assert.strictEqual(case25.status, "UNPAID");
assert.strictEqual(case25.paidAmount, 0);
const invoice25 = calculateInvoiceSheetPayment({ status: case25.status, total: case25.total, paidAmount: case25.paidAmount });
assert.strictEqual(invoice25.isPaid, false);
assert.strictEqual(invoice25.balance, 600);
console.log("  ✓ Case 2.5 (Unpaid): Status=UNPAID, Paid=0, Due=600");

console.log("-> Suite 2 Passed: 5/5 payment status derivation tests.\n");

// ── TEST SUITE 3: Bill Invoice Number Resolution Tests ──
console.log("--- Suite 3: Bill Invoice Number Resolution Tests ---");

function getBillInvoiceNo(bill) {
  if (!bill) return "—";
  return (
    bill.custom_id ||
    bill.customId ||
    (bill.id ? `OPL-INV-${String(bill.id).slice(0, 6).toUpperCase()}` : "—")
  );
}

// Case 3.1: Laravel API response with camelCase customId (the exact bug case)
const billCamel = { id: "01a0d8b4-4e9e-724b-aea0-fab002df8c92", customId: "OPL-INV-100055", total: 500 };
assert.strictEqual(getBillInvoiceNo(billCamel), "OPL-INV-100055");
console.log("  ✓ Case 3.1 (Laravel camelCase customId): " + getBillInvoiceNo(billCamel));

// Case 3.2: snake_case custom_id
const billSnake = { id: "01a0d870-875c-70a9-b12d-6c41cf6f4a6f", custom_id: "OPL-INV-100054", total: 800 };
assert.strictEqual(getBillInvoiceNo(billSnake), "OPL-INV-100054");
console.log("  ✓ Case 3.2 (snake_case custom_id): " + getBillInvoiceNo(billSnake));

// Case 3.3: Both fields present
const billBoth = { id: "01a0cee4-1cc3-706a-a79a-4d044ca04127", custom_id: "OPL-INV-100053", customId: "OPL-INV-100053", total: 1200 };
assert.strictEqual(getBillInvoiceNo(billBoth), "OPL-INV-100053");
console.log("  ✓ Case 3.3 (Both custom_id and customId present): " + getBillInvoiceNo(billBoth));

// Case 3.4: Fallback to ID slice if customId is missing
const billOnlyId = { id: "01a0bfec-b1d7-737f-927e-dfb347b89d1d" };
assert.strictEqual(getBillInvoiceNo(billOnlyId), "OPL-INV-01A0BF");
console.log("  ✓ Case 3.4 (Fallback to UUID prefix): " + getBillInvoiceNo(billOnlyId));

// Case 3.5: Null / undefined bill
assert.strictEqual(getBillInvoiceNo(null), "—");
assert.strictEqual(getBillInvoiceNo(undefined), "—");
console.log("  ✓ Case 3.5 (Null/undefined safe fallback): —");

console.log("-> Suite 3 Passed: 5/5 bill invoice number resolution tests.\n");

console.log("=== ALL UNIT TESTS PASSED SUCCESSFULLY! ===");
