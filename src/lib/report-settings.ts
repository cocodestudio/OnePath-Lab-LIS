export const ALL_DESIGNATIONS = [
  "MR.",
  "MRS.",
  "SHRI.",
  "MS.",
  "MASTER.",
  "MISS.",
  "SMT.",
  "W/O",
  "DR.",
  "KUMAR.",
  "KUMARI.",
  "MOHD.",
  "BABY OR JUST BORN (B/O)",
  "BABY",
  "BABY OF",
  "PET OF",
  "S/O",
  "D/O",
  "C/O",
  "M/O",
  "BLANK",
  "SK",
  "MD.",
  "BABA",
  "JUNIOR",
  "Null",
] as const;

export const ALL_ORDERING_FIELDS = [
  "Name",
  "Age/Gender",
  "Referred By",
  "Email ID",
  "Insurance No.",
  "Report ID",
  "Report Date",
  "Registration Date",
  "Phone No.",
  "Aadhaar No.",
  "Patient ID",
  "Address",
  "Collected At",
  "UHID",
  "Passport Number",
  "Owner Name",
  "Breed",
  "Species",
  "Referring Lab",
  "Received Date",
  "Company",
  "Report Status",
  "Barcode",
  "Referring Hospital",
  "Second Referral",
  "Government Panel",
  "Collection Date",
  "B2B Address",
  "Custom ID",
  "B2B Phone Number",
  "B2B Email",
  "TPA",
  "Corporate Client",
  "Corporate Plan",
  "Processed At",
  "Pincode",
  "District",
  "Town",
  "Collection Center",
  "HFR ID",
  "Investigation",
  "Height",
  "Weight",
] as const;

export interface IntakeFieldConfig {
  key: string;
  label: string;
  orderingName: string;
  category: "Demographics" | "Clinical & Referral" | "Identification & Documents" | "Logistics & Physical" | "Veterinary";
  enabled: boolean;
  required: boolean;
  showOnReport: boolean;
}

export const DEFAULT_INTAKE_FIELDS: IntakeFieldConfig[] = [
  { key: "name", label: "Patient Full Name", orderingName: "Name", category: "Demographics", enabled: true, required: true, showOnReport: true },
  { key: "ageGender", label: "Age & Gender", orderingName: "Age/Gender", category: "Demographics", enabled: true, required: true, showOnReport: true },
  { key: "phone", label: "Phone Number", orderingName: "Phone No.", category: "Demographics", enabled: true, required: true, showOnReport: true },
  { key: "email", label: "Email ID", orderingName: "Email ID", category: "Demographics", enabled: false, required: false, showOnReport: true },
  { key: "address", label: "Street / Residential Address", orderingName: "Address", category: "Demographics", enabled: true, required: false, showOnReport: true },
  { key: "pincode", label: "Pincode", orderingName: "Pincode", category: "Demographics", enabled: false, required: false, showOnReport: false },
  { key: "city", label: "City / Town", orderingName: "Town", category: "Demographics", enabled: false, required: false, showOnReport: false },
  { key: "district", label: "District", orderingName: "District", category: "Demographics", enabled: false, required: false, showOnReport: false },

  { key: "refDoctor", label: "Referred By (Doctor)", orderingName: "Referred By", category: "Clinical & Referral", enabled: true, required: false, showOnReport: true },
  { key: "secondReferral", label: "Second Referral", orderingName: "Second Referral", category: "Clinical & Referral", enabled: false, required: false, showOnReport: false },
  { key: "collectedAt", label: "Collection Center / Branch", orderingName: "Collection Center", category: "Clinical & Referral", enabled: true, required: false, showOnReport: true },
  { key: "collectedBy", label: "Sample Collected By", orderingName: "Collected At", category: "Clinical & Referral", enabled: true, required: false, showOnReport: false },

  { key: "aadhaarNo", label: "Aadhaar / National ID", orderingName: "Aadhaar No.", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "insuranceNo", label: "Insurance Policy No.", orderingName: "Insurance No.", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "tpa", label: "TPA / Insurance Desk", orderingName: "TPA", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "hfrId", label: "HFR / ABHA Health ID", orderingName: "HFR ID", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "uhid", label: "UHID (Hospital ID)", orderingName: "UHID", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "passportNumber", label: "Passport Number", orderingName: "Passport Number", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "corporateName", label: "Corporate Client", orderingName: "Corporate Client", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "corporatePlan", label: "Corporate Plan", orderingName: "Corporate Plan", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },
  { key: "govPanel", label: "Government Panel", orderingName: "Government Panel", category: "Identification & Documents", enabled: false, required: false, showOnReport: false },

  { key: "vialBarcode", label: "Vial Barcode / Sample ID", orderingName: "Barcode", category: "Logistics & Physical", enabled: true, required: false, showOnReport: true },
  { key: "height", label: "Patient Height", orderingName: "Height", category: "Logistics & Physical", enabled: false, required: false, showOnReport: false },
  { key: "weight", label: "Patient Weight", orderingName: "Weight", category: "Logistics & Physical", enabled: false, required: false, showOnReport: false },

  { key: "ownerName", label: "Owner Name (Vet)", orderingName: "Owner Name", category: "Veterinary", enabled: false, required: false, showOnReport: false },
  { key: "breed", label: "Breed (Vet)", orderingName: "Breed", category: "Veterinary", enabled: false, required: false, showOnReport: false },
  { key: "species", label: "Species (Vet)", orderingName: "Species", category: "Veterinary", enabled: false, required: false, showOnReport: false },
];

export interface DoctorSignatureConfig {
  id?: string;
  enabled: boolean;
  imageUrl: string | null;
  name: string;
  designation: string;
  registrationNo?: string;
  alignment?: "left" | "center" | "right";
  position?: "left" | "right";
  width: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showSignatureOnly?: boolean;
}

export function resolveSignatureUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL 
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/lis\/?$/, "").replace(/\/api\/?$/, "")
    : (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "https://api.onepathlab.com");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${apiOrigin}${cleanPath}`;
}

export interface ReportLayoutSettings {
  defaultDesignation: string;
  flags: {
    enabled: boolean;
    lowColor: string;
    highColor: string;
    boldOnlyResultAndFlag: boolean;
    showArrows: boolean;
  };
  fieldsToShow: {
    testMethod: boolean;
    interpretation: boolean;
    phoneNumber: boolean;
    departmentName: boolean;
  };
  patientDetailsOrder: string[];
  intakeFields?: IntakeFieldConfig[];
  typography: {
    departmentFontSize: number;
    columnHeadingFontSize: number;
    testNameFontSize: number;
    parameterCommentFontSize: number;
    testParameterFontSize: number;
    testMethodFontSize: number;
    testMethodColor: string;
    sampleTypeFontSize: number;
    showSampleType: boolean;
    spacingBetweenTests: number;
    showBarcode: boolean;
    removeLineAtEndOfTest: boolean;
    lineBelowEachParameterRow: boolean;
    leftAlignSubParameters: boolean;
    boldMultiTypeParameter: boolean;
    properCaseTestNames: boolean;
    departmentNameAlignment: "Left" | "Middle" | "Center" | "Right";
    testNameAlignment: "Left" | "Middle" | "Center";
    testBodyImageAlignment: "Left" | "Center" | "Right";
    rowAlignment: "Top" | "Center" | "Middle";
  };
  spacing: {
    department: number;
    testName: number;
    columnHeader: number;
    testParameters: number;
    parameterComment: number;
    testMethod: number;
    interchangeColumns: boolean;
  };
  interpretation: {
    headingFontSize: number;
    contentFontSize: number;
    boldHeading: boolean;
  };
  noteComment: {
    headingFontSize: number;
    contentFontSize: number;
  };
  columnWidth: {
    testDescription: number;
    result: number;
    flag: number;
    refRange: number;
    unit: number;
  };
  columnLabels: {
    testDescription: string;
    result: string;
    flag: string;
    refRange: string;
    unit: string;
  };
  endingLine: {
    text: string;
    fontSize: number;
  };
  doctorSignature: DoctorSignatureConfig;
  doctorSignatures: DoctorSignatureConfig[];
  signatureSettings: {
    printOnEveryPage: boolean;
    showSignatureOnly: boolean;
    positionMode?: "flow" | "fixed";
    bottomOffset?: number;
    horizontalAlign?: "left" | "center" | "right";
    horizontalOffset?: number;
  };
  signaturePrintOnEveryPage?: boolean;
  showSignatureOnly?: boolean;
  groupByDepartment?: boolean;
  departmentOrder?: string[];
}

export const DEFAULT_DEPARTMENT_ORDER = [
  "Haematology",
  "Biochemistry",
  "Serology & Immunology",
  "Clinical Pathology",
  "Microbiology",
  "Endocrinology & Hormones",
  "Molecular Biology",
  "Histopathology & Cytology",
  "Other / General",
] as const;

export const defaultReportLayoutSettings: ReportLayoutSettings = {
  defaultDesignation: "MR.",
  flags: {
    enabled: true,
    lowColor: "#000000",
    highColor: "#000000",
    boldOnlyResultAndFlag: false,
    showArrows: true,
  },
  fieldsToShow: {
    testMethod: true,
    interpretation: true,
    phoneNumber: true,
    departmentName: true,
  },
  patientDetailsOrder: [
    "Name",
    "Age/Gender",
    "Referred By",
    "Report Date",
    "Phone No.",
    "Report Status",
  ],
  groupByDepartment: true,
  departmentOrder: [...DEFAULT_DEPARTMENT_ORDER],
  intakeFields: DEFAULT_INTAKE_FIELDS,
  typography: {
    departmentFontSize: 13,
    columnHeadingFontSize: 10,
    testNameFontSize: 12,
    parameterCommentFontSize: 10,
    testParameterFontSize: 13,
    testMethodFontSize: 8,
    testMethodColor: "#71717a",
    sampleTypeFontSize: 8,
    showSampleType: false,
    spacingBetweenTests: 6,
    showBarcode: true,
    removeLineAtEndOfTest: false,
    lineBelowEachParameterRow: true,
    leftAlignSubParameters: false,
    boldMultiTypeParameter: false,
    properCaseTestNames: false,
    departmentNameAlignment: "Middle",
    testNameAlignment: "Left",
    testBodyImageAlignment: "Center",
    rowAlignment: "Center",
  },
  spacing: {
    department: 2,
    testName: 7,
    columnHeader: 4,
    testParameters: 2,
    parameterComment: 0,
    testMethod: -2,
    interchangeColumns: false,
  },
  interpretation: {
    headingFontSize: 10,
    contentFontSize: 10,
    boldHeading: true,
  },
  noteComment: {
    headingFontSize: 10,
    contentFontSize: 10,
  },
  columnWidth: {
    testDescription: 38,
    result: 14,
    flag: 7,
    refRange: 27,
    unit: 14,
  },
  columnLabels: {
    testDescription: "TEST",
    result: "VALUE",
    flag: "FLAG",
    refRange: "REFERENCE",
    unit: "UNIT",
  },
  endingLine: {
    text: "*** END OF REPORT ***",
    fontSize: 9,
  },
  doctorSignature: {
    id: "sig-1",
    enabled: false,
    imageUrl: null,
    name: "Dr. S. K. Mukherjee",
    designation: "Consultant Pathologist, MD (Pathology)",
    registrationNo: "MCI-48291",
    alignment: "left",
    width: 130,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  doctorSignatures: [
    {
      id: "sig-1",
      enabled: false,
      imageUrl: null,
      name: "Dr. S. K. Mukherjee",
      designation: "Consultant Pathologist, MD (Pathology)",
      registrationNo: "MCI-48291",
      alignment: "left",
      width: 130,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      showSignatureOnly: false,
    }
  ],
  signatureSettings: {
    printOnEveryPage: false,
    showSignatureOnly: false,
    positionMode: "fixed",
    bottomOffset: 45,
    horizontalAlign: "right",
    horizontalOffset: 35,
  },
  signaturePrintOnEveryPage: false,
  showSignatureOnly: false,
};

export function normalizeReportSettings(raw: any): ReportLayoutSettings {
  if (!raw || typeof raw !== "object") return { ...defaultReportLayoutSettings };

  const res = {
    ...defaultReportLayoutSettings,
    flags: { ...defaultReportLayoutSettings.flags },
    fieldsToShow: { ...defaultReportLayoutSettings.fieldsToShow },
    typography: { ...defaultReportLayoutSettings.typography },
    spacing: { ...defaultReportLayoutSettings.spacing },
    interpretation: { ...defaultReportLayoutSettings.interpretation },
    noteComment: { ...defaultReportLayoutSettings.noteComment },
    columnWidth: { ...defaultReportLayoutSettings.columnWidth },
    columnLabels: { ...defaultReportLayoutSettings.columnLabels },
    endingLine: { ...defaultReportLayoutSettings.endingLine },
    doctorSignature: { ...defaultReportLayoutSettings.doctorSignature },
    doctorSignatures: defaultReportLayoutSettings.doctorSignatures.map(s => ({ ...s })),
    signatureSettings: { ...defaultReportLayoutSettings.signatureSettings },
  };

  if (raw.defaultDesignation || raw.default_designation) {
    res.defaultDesignation = raw.defaultDesignation || raw.default_designation;
  }

  if (raw.flags) {
    res.flags = {
      ...res.flags,
      ...raw.flags,
    };
  }

  if (raw.fieldsToShow || raw.fields_to_show) {
    res.fieldsToShow = {
      ...res.fieldsToShow,
      ...(raw.fieldsToShow || raw.fields_to_show),
    };
  }

  if (Array.isArray(raw.patientDetailsOrder || raw.patient_details_order)) {
    const list = raw.patientDetailsOrder || raw.patient_details_order;
    if (list.length > 0) {
      res.patientDetailsOrder = list;
    }
  }

  if (Array.isArray(raw.intakeFields || raw.intake_fields)) {
    const list = raw.intakeFields || raw.intake_fields;
    res.intakeFields = DEFAULT_INTAKE_FIELDS.map(def => {
      const match = list.find((item: any) => item.key === def.key || item.orderingName === def.orderingName);
      if (!match) return { ...def };
      return {
        ...def,
        enabled: match.enabled !== undefined ? !!match.enabled : def.enabled,
        required: match.required !== undefined ? !!match.required : def.required,
        showOnReport: match.showOnReport !== undefined ? !!match.showOnReport : def.showOnReport,
      };
    });
  }

  if (raw.typography) {
    res.typography = {
      ...res.typography,
      ...raw.typography,
    };
  }

  if (raw.spacing) {
    res.spacing = {
      ...res.spacing,
      ...raw.spacing,
    };
  }

  if (raw.interpretation) {
    res.interpretation = {
      ...res.interpretation,
      ...raw.interpretation,
    };
  }

  if (raw.noteComment || raw.note_comment) {
    res.noteComment = {
      ...res.noteComment,
      ...(raw.noteComment || raw.note_comment),
    };
  }

  if (raw.columnWidth || raw.column_width) {
    res.columnWidth = {
      ...res.columnWidth,
      ...(raw.columnWidth || raw.column_width),
    };
  }

  if (raw.columnLabels || raw.column_labels) {
    res.columnLabels = {
      ...res.columnLabels,
      ...(raw.columnLabels || raw.column_labels),
    };
  }

  if (raw.endingLine || raw.ending_line) {
    res.endingLine = {
      ...res.endingLine,
      ...(raw.endingLine || raw.ending_line),
    };
  }

  const normalizeSingleSig = (rawSig: any, index = 0): DoctorSignatureConfig => {
    return {
      id: rawSig.id || `sig-${index + 1}`,
      enabled: rawSig.enabled !== undefined ? !!rawSig.enabled : false,
      imageUrl: rawSig.imageUrl || rawSig.image_url || null,
      name: rawSig.name || `Dr. ${index === 0 ? "S. K. Mukherjee" : "Authorized Pathologist"}`,
      designation: rawSig.designation || "Consultant Pathologist, MD",
      registrationNo: rawSig.registrationNo || rawSig.registration_no || "",
      alignment: rawSig.alignment || (index % 2 === 0 ? "left" : "right"),
      position: rawSig.position || (index % 2 === 0 ? "left" : "right"),
      width: typeof rawSig.width === 'number' ? rawSig.width : 130,
      marginTop: typeof rawSig.marginTop === 'number' ? rawSig.marginTop : (typeof rawSig.margin_top === 'number' ? rawSig.margin_top : 0),
      marginBottom: typeof rawSig.marginBottom === 'number' ? rawSig.marginBottom : (typeof rawSig.margin_bottom === 'number' ? rawSig.margin_bottom : 0),
      marginLeft: typeof rawSig.marginLeft === 'number' ? rawSig.marginLeft : (typeof rawSig.margin_left === 'number' ? rawSig.margin_left : 0),
      marginRight: typeof rawSig.marginRight === 'number' ? rawSig.marginRight : (typeof rawSig.margin_right === 'number' ? rawSig.margin_right : 0),
      showSignatureOnly: rawSig.showSignatureOnly !== undefined 
        ? !!rawSig.showSignatureOnly 
        : (rawSig.show_signature_only !== undefined ? !!rawSig.show_signature_only : false),
    };
  };

  const rawSignaturesArray = raw.doctorSignatures || raw.doctor_signatures;
  if (Array.isArray(rawSignaturesArray) && rawSignaturesArray.length > 0) {
    res.doctorSignatures = rawSignaturesArray.map((sig, idx) => normalizeSingleSig(sig, idx));
    res.doctorSignature = res.doctorSignatures[0];
  } else if (raw.doctorSignature || raw.doctor_signature) {
    const single = normalizeSingleSig(raw.doctorSignature || raw.doctor_signature, 0);
    res.doctorSignature = single;
    res.doctorSignatures = [single];
  }

  const rawSigSettings = raw.signatureSettings || raw.signature_settings || {};
  const printOnEveryPage = rawSigSettings.printOnEveryPage !== undefined
    ? !!rawSigSettings.printOnEveryPage
    : (raw.signaturePrintOnEveryPage !== undefined
        ? !!raw.signaturePrintOnEveryPage
        : (raw.signature_print_on_every_page !== undefined ? !!raw.signature_print_on_every_page : false));

  const showSignatureOnly = rawSigSettings.showSignatureOnly !== undefined
    ? !!rawSigSettings.showSignatureOnly
    : (raw.showSignatureOnly !== undefined
        ? !!raw.showSignatureOnly
        : (raw.show_signature_only !== undefined ? !!raw.show_signature_only : false));

  const positionMode: "flow" | "fixed" = rawSigSettings.positionMode || rawSigSettings.position_mode || raw.signaturePositionMode || "fixed";
  const bottomOffset = typeof rawSigSettings.bottomOffset === "number"
    ? rawSigSettings.bottomOffset
    : (typeof rawSigSettings.bottom_offset === "number"
        ? rawSigSettings.bottom_offset
        : (typeof raw.signatureBottomOffset === "number" ? raw.signatureBottomOffset : 45));
  const horizontalAlign: "left" | "center" | "right" = rawSigSettings.horizontalAlign || rawSigSettings.horizontal_align || raw.signatureHorizontalAlign || "right";
  const horizontalOffset = typeof rawSigSettings.horizontalOffset === "number"
    ? rawSigSettings.horizontalOffset
    : (typeof rawSigSettings.horizontal_offset === "number"
        ? rawSigSettings.horizontal_offset
        : (typeof raw.signatureHorizontalOffset === "number" ? raw.signatureHorizontalOffset : 35));

  res.signatureSettings = {
    printOnEveryPage,
    showSignatureOnly,
    positionMode,
    bottomOffset,
    horizontalAlign,
    horizontalOffset,
  };
  res.signaturePrintOnEveryPage = printOnEveryPage;
  res.showSignatureOnly = showSignatureOnly;

  res.groupByDepartment = raw.groupByDepartment !== undefined 
    ? !!raw.groupByDepartment 
    : (raw.group_by_department !== undefined ? !!raw.group_by_department : true);

  const rawDeptOrder = raw.departmentOrder || raw.department_order;
  if (Array.isArray(rawDeptOrder) && rawDeptOrder.length > 0) {
    res.departmentOrder = rawDeptOrder;
  } else {
    res.departmentOrder = [...DEFAULT_DEPARTMENT_ORDER];
  }

  return res;
}
