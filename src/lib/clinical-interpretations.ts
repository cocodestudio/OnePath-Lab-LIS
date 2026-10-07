/**
 * Standard Clinical Interpretations Catalog
 * Fallbacks and default medical interpretation templates for common pathology investigations
 */

export const DEFAULT_INTERPRETATIONS: Record<string, string> = {
  CBC: `<div class="clinical-interpretation space-y-2">
<table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:4px; font-size:10px; border:1px solid #71717a;" cellpadding="3" cellspacing="0">
<thead style="background-color:#f4f4f5; text-align:left;">
<tr>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Parameter</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Normal Reference Range</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Clinical Significance &amp; Remarks</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Hemoglobin (Hb)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">13.0 - 17.0 g/dL (M) / 12.0 - 15.0 g/dL (F)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Screens for anemia severity, polycythemia, and oxygenation capacity.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Total TLC (WBC)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">4,000 - 11,000 /cumm</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Elevated in bacterial infections/inflammation; decreased in viral fever or bone marrow suppression.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Platelet Count</td>
<td style="border:1px solid #71717a; padding:3px 6px;">1.50 - 4.50 Lakhs/cumm</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Evaluates primary hemostasis; critical for Dengue and bleeding risk monitoring.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">PCV / Hematocrit</td>
<td style="border:1px solid #71717a; padding:3px 6px;">40 - 50 % (M) / 36 - 46 % (F)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Indicator of red cell volume; dynamic changes guide fluid therapy.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">MCV / MCH / MCHC</td>
<td style="border:1px solid #71717a; padding:3px 6px;">83-101 fL / 27-32 pg / 31.5-34.5 g/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Morphological differentiation of Microcytic (Iron def.) vs Macrocytic (B12/Folate) anemias.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">DLC (Differential)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Neu: 40-70%, Lym: 20-40%, Eos: 1-6%</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Neutrophilia in acute infections; Eosinophilia in allergic / parasitic conditions.</td>
</tr>
</tbody>
</table>
<p style="font-size:10px; line-height:1.4; color:#52525b; margin-top:3px;">
<strong>Clinical Remarks:</strong> Complete Blood Count (CBC) is an automated quantitative analysis. Advised correlation with peripheral blood smear examination, clinical findings, and history for comprehensive evaluation.
</p>
</div>`,

  ESR: `<div class="clinical-interpretation space-y-2">
<table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:4px; font-size:10px; border:1px solid #71717a;" cellpadding="3" cellspacing="0">
<thead style="background-color:#f4f4f5; text-align:left;">
<tr>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">ESR Range (mm/1st hr)</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Clinical Interpretation</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px;">0 - 15 (Male) / 0 - 20 (Female)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Normal baseline sedimentation rate.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px;">20 - 50 mm/hr</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Mild to moderate systemic inflammation, pregnancy, mild anemia.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px;">50 - 100 mm/hr</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Active inflammatory disease, rheumatoid arthritis, tuberculosis, chronic infections.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px;">&gt; 100 mm/hr (Markedly Elevated)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Critical: Multiple Myeloma, Temporal Arteritis, Systemic Vasculitis, occult malignancy.</td>
</tr>
</tbody>
</table>
</div>`,

  LIPID: `<div class="clinical-interpretation space-y-2">
<table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:4px; font-size:10px; border:1px solid #71717a;" cellpadding="3" cellspacing="0">
<thead style="background-color:#f4f4f5; text-align:left;">
<tr>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Lipid Parameter</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Desirable / Optimal</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Borderline</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">High Risk</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Total Cholesterol</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&lt; 200 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">200 - 239 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 240 mg/dL</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Triglycerides</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&lt; 150 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">150 - 199 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 200 mg/dL</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">HDL (Good Cholesterol)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 40 mg/dL (M) / &ge; 50 (F)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">35 - 39 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&lt; 35 mg/dL</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">LDL (Bad Cholesterol)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&lt; 100 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">100 - 129 mg/dL</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 130 mg/dL</td>
</tr>
</tbody>
</table>
</div>`,

  LFT: `<div class="clinical-interpretation space-y-2">
<p style="font-size:10px; line-height:1.4; color:#52525b;">
<strong>Clinical Remarks:</strong> Serum Bilirubin evaluates hepatobiliary clearance and hemolysis. Transaminases (SGOT/SGPT) are sensitive markers for hepatocellular injury. Alkaline Phosphatase (ALP) elevation indicates biliary obstruction or osteoblastic bone activity. Correlate with clinical findings.
</p>
</div>`,

  KFT: `<div class="clinical-interpretation space-y-2">
<p style="font-size:10px; line-height:1.4; color:#52525b;">
<strong>Clinical Remarks:</strong> Serum Creatinine and Blood Urea are key indices of glomerular filtration rate (GFR). Elevated levels indicate acute kidney injury (AKI), chronic renal impairment, or prerenal azotemia. Serum Uric Acid is useful in evaluating hyperuricemia and gouty arthritis.
</p>
</div>`,

  SUGAR: `<div class="clinical-interpretation space-y-2">
<table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:4px; font-size:10px; border:1px solid #71717a;" cellpadding="3" cellspacing="0">
<thead style="background-color:#f4f4f5; text-align:left;">
<tr>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Category</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Fasting Glucose (mg/dL)</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Post-Prandial (mg/dL)</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">HbA1c (%)</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Normal</td>
<td style="border:1px solid #71717a; padding:3px 6px;">70 - 99</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&lt; 140</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&lt; 5.7 %</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Prediabetes / IFG / IGT</td>
<td style="border:1px solid #71717a; padding:3px 6px;">100 - 125</td>
<td style="border:1px solid #71717a; padding:3px 6px;">140 - 199</td>
<td style="border:1px solid #71717a; padding:3px 6px;">5.7 - 6.4 %</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">Diabetes Mellitus</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 126</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 200</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 6.5 %</td>
</tr>
</tbody>
</table>
</div>`,

  WIDAL: `<div class="clinical-interpretation space-y-2">
<p style="font-size:11px; font-weight:bold; color:#18181b; margin-bottom:4px;">Diagnostic Titers &amp; Clinical Significance:</p>
<table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:4px; font-size:10px; border:1px solid #71717a;" cellpadding="3" cellspacing="0">
<thead style="background-color:#f4f4f5; text-align:left;">
<tr>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Antigen</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Significant Diagnostic Titer Cut-off</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Clinical Significance</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">S. typhi &quot;O&quot; (Somatic)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 1:80 / 1:160</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Indicates active or recent acute Enteric (Typhoid) Fever.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">S. typhi &quot;H&quot; (Flagellar)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 1:160</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Indicates past exposure, late typhoid infection, or prior TAB vaccination.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600;">S. paratyphi &quot;AH&quot; / &quot;BH&quot;</td>
<td style="border:1px solid #71717a; padding:3px 6px;">&ge; 1:80 / 1:160</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Indicates Paratyphoid infection.</td>
</tr>
</tbody>
</table>
<p style="font-size:10px; line-height:1.4; color:#52525b; margin-top:3px;">
<strong>Clinical Remarks:</strong> A single Widal test has limited diagnostic value in endemic zones. A 4-fold rise in paired sera titer collected 7-10 days apart is diagnostic of Salmonella enterica infection. Advised correlation with blood culture for definitive confirmation.
</p>
</div>`,

  CULTURE: `<div class="clinical-interpretation space-y-2">
<p style="font-size:11px; font-weight:bold; color:#18181b; margin-bottom:4px;">Antimicrobial Susceptibility Testing (CLSI / EUCAST Guidelines):</p>
<table style="width:100%; border-collapse:collapse; margin-top:4px; margin-bottom:4px; font-size:10px; border:1px solid #71717a;" cellpadding="3" cellspacing="0">
<thead style="background-color:#f4f4f5; text-align:left;">
<tr>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b; width:22%;">Category</th>
<th style="border:1px solid #71717a; padding:4px 6px; font-weight:bold; color:#18181b;">Clinical Definition &amp; Therapy Guidance</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600; color:#15803d;">Sensitive (S)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Pathogen is inhibited by attainable concentrations of antimicrobial agent when standard dosage is administered. Favorable clinical response expected.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600; color:#b45309;">Intermediate (I)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Higher dosages or physiological concentration at infection site (e.g. urinary tract) may be clinically effective. Buffer zone to prevent minor technical discrepancies.</td>
</tr>
<tr>
<td style="border:1px solid #71717a; padding:3px 6px; font-weight:600; color:#b91c1c;">Resistant (R)</td>
<td style="border:1px solid #71717a; padding:3px 6px;">Pathogen is not inhibited by reachable therapeutic concentrations of the drug; clinical failure likely. Alternate therapeutic agent required.</td>
</tr>
</tbody>
</table>
<p style="font-size:10px; line-height:1.4; color:#52525b; margin-top:3px;">
<strong>Clinical Remarks:</strong> In vitro antimicrobial susceptibility does not guarantee in vivo clinical efficacy. Choice of antibiotic should consider site of infection, patient age, renal/hepatic function, host defense, and pharmacokinetic factors.
</p>
</div>`,

  BIOPSY: `<div class="clinical-interpretation space-y-2">
<p style="font-size:10px; line-height:1.4; color:#52525b;">
<strong>Histopathological Guidelines &amp; Clinical Correlation:</strong><br>
Histopathological impression is based solely on the microscopic examination of the tissue sections submitted. The final diagnosis must be clinically correlated with patient's radiological, laboratory, and intraoperative findings. In case of discrepancies with clinical suspicion, repeat tissue sampling or immunohistochemistry (IHC) is recommended.
</p>
</div>`
};

/**
 * Returns clinical interpretation string for a given test name or test object
 */
export function getClinicalInterpretation(
  testName: string, 
  customInterpretation?: string | null,
  category?: string | null
): string | null {
  const isLeakedResultTable = customInterpretation && (
    customInterpretation.includes("Sensitivity (S / I / R)") ||
    (customInterpretation.includes("1/20") && customInterpretation.includes("1/40") && customInterpretation.includes("S. TYPHI")) ||
    (customInterpretation.includes("GROSS EXAMINATION:") && customInterpretation.includes("MICROSCOPIC EXAMINATION:"))
  );

  if (customInterpretation && customInterpretation.trim() !== '' && customInterpretation !== '<p><br></p>' && !isLeakedResultTable) {
    return customInterpretation;
  }

  const normalized = (testName || '').toUpperCase();
  const catNormalized = (category || '').toUpperCase();

  if (
    normalized.includes('CBC') || 
    normalized.includes('COMPLETE BLOOD') || 
    normalized.includes('HAEMATOLOGY') || 
    normalized.includes('CELL COUNTER') ||
    catNormalized.includes('HAEMATOLOGY') ||
    catNormalized.includes('HEMATOLOGY')
  ) {
    return DEFAULT_INTERPRETATIONS.CBC;
  }

  if (normalized.includes('ESR') || normalized.includes('ERYTHROCYTE SEDIMENTATION')) {
    return DEFAULT_INTERPRETATIONS.ESR;
  }

  if (normalized.includes('LIPID') || normalized.includes('CHOLESTEROL') || normalized.includes('LIPID PROFILE')) {
    return DEFAULT_INTERPRETATIONS.LIPID;
  }

  if (
    normalized.includes('LFT') || 
    normalized.includes('LIVER FUNCTION') || 
    normalized.includes('HEPATOLOGY') ||
    catNormalized.includes('HEPATOLOGY') ||
    catNormalized.includes('LIVER')
  ) {
    return DEFAULT_INTERPRETATIONS.LFT;
  }

  if (normalized.includes('KFT') || normalized.includes('RFT') || normalized.includes('KIDNEY FUNCTION') || normalized.includes('RENAL FUNCTION')) {
    return DEFAULT_INTERPRETATIONS.KFT;
  }

  if (normalized.includes('GLUCOSE') || normalized.includes('SUGAR') || normalized.includes('HBA1C') || normalized.includes('DIABETES')) {
    return DEFAULT_INTERPRETATIONS.SUGAR;
  }

  if (normalized.includes('WIDAL')) {
    return DEFAULT_INTERPRETATIONS.WIDAL;
  }

  if (normalized.includes('CULTURE')) {
    return DEFAULT_INTERPRETATIONS.CULTURE;
  }

  if (normalized.includes('BIOPSY') || catNormalized.includes('HISTOPATH') || catNormalized.includes('CYTOPATH')) {
    return DEFAULT_INTERPRETATIONS.BIOPSY;
  }

  return null;
}
