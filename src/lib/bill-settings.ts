export const ALL_BILL_ORDERING_FIELDS = [
  "Bill ID",
  "Day wise ID",
  "Bill Date",
  "Patient ID",
  "Name",
  "Age/Gender",
  "Owner Name",
  "Contact No.",
  "Aadhaar no.",
  "Insurance no.",
  "Address",
  "HFR ID",
  "Pincode",
  "District",
  "Town",
  "Referred By",
  "Second Referral",
  "Corporate Name",
  "GSTIN",
  "Payment Mode",
  "Collection Center",
] as const;

export interface BillSignature {
  id: string;
  name: string;
  designation: string;
  imageUrl?: string | null;
}

export interface BillLayoutSettings {
  heading: string;
  headerImage: string | null;
  footerImage: string | null;
  size: "A4" | "A5";
  headerHeight: number;
  footerHeight: number;
  showBarcode: boolean;
  showPhone: boolean;
  showPackageTests: boolean;
  showB2BModal: boolean;
  showQrCode: boolean;
  showBilledBy: boolean;
  showPaymentBreakdown: boolean;
  showSampleColumn: boolean;
  showSampleCollectedBy: boolean;
  showPincode: boolean;
  showDistrict: boolean;
  showTown: boolean;
  showCollectionCenter: boolean;
  showSecondReferral: boolean;
  showHfrId: boolean;
  showTestCode: boolean;
  margins: {
    left: number;
    right: number;
    patientDetailsBottomSpacing: number;
  };
  fieldOrdering: string[];
  gst: {
    number: string;
    show: boolean;
  };
  upi: {
    show: boolean;
    upiId: string;
    qrImageUrl: string | null;
    qrWidth: number;
    qrHeight: number;
  };
  termsAndConditions: string;
  signatures: BillSignature[];
}

export const defaultBillLayoutSettings: BillLayoutSettings = {
  heading: "Invoice-cum-receipt",
  headerImage: null,
  footerImage: null,
  size: "A4",
  headerHeight: 100,
  footerHeight: 60,
  showBarcode: true,
  showPhone: true,
  showPackageTests: false,
  showB2BModal: false,
  showQrCode: true,
  showBilledBy: true,
  showPaymentBreakdown: true,
  showSampleColumn: false,
  showSampleCollectedBy: false,
  showPincode: false,
  showDistrict: false,
  showTown: false,
  showCollectionCenter: false,
  showSecondReferral: false,
  showHfrId: false,
  showTestCode: true,
  margins: {
    left: 20,
    right: 20,
    patientDetailsBottomSpacing: 8,
  },
  fieldOrdering: [
    "Bill ID",
    "Bill Date",
    "Patient ID",
    "Name",
    "Age/Gender",
    "Contact No.",
    "Referred By",
    "Payment Mode",
  ],
  gst: {
    number: "",
    show: false,
  },
  upi: {
    show: false,
    upiId: "",
    qrImageUrl: null,
    qrWidth: 90,
    qrHeight: 90,
  },
  termsAndConditions: "1. All disputes are subject to local jurisdiction only.\n2. Please collect medical investigation reports on time.\n3. Keep this invoice/receipt safe for test verification and report collection.",
  signatures: [
    {
      id: "sig-1",
      name: "Authorized Signatory",
      designation: "Accounts / Billing Desk",
    },
  ],
};

export function normalizeBillSettings(raw: any): BillLayoutSettings {
  if (!raw || typeof raw !== "object") return { ...defaultBillLayoutSettings };

  const res: BillLayoutSettings = {
    ...defaultBillLayoutSettings,
    margins: { ...defaultBillLayoutSettings.margins },
    gst: { ...defaultBillLayoutSettings.gst },
    upi: { ...defaultBillLayoutSettings.upi },
    signatures: [...defaultBillLayoutSettings.signatures],
  };

  if (raw.heading) res.heading = raw.heading;
  const hImg = raw.headerImage ?? raw.header_image;
  if (hImg !== undefined) res.headerImage = hImg || null;

  const fImg = raw.footerImage ?? raw.footer_image;
  if (fImg !== undefined) res.footerImage = fImg || null;

  if (raw.size) res.size = raw.size;
  const hHeight = raw.headerHeight ?? raw.header_height;
  if (hHeight !== undefined && hHeight !== null && hHeight !== "") res.headerHeight = Number(hHeight);

  const fHeight = raw.footerHeight ?? raw.footer_height;
  if (fHeight !== undefined && fHeight !== null && fHeight !== "") res.footerHeight = Number(fHeight);

  const showBarcode = raw.showBarcode ?? raw.show_barcode;
  if (showBarcode !== undefined) res.showBarcode = Boolean(showBarcode);

  const showPhone = raw.showPhone ?? raw.show_phone;
  if (showPhone !== undefined) res.showPhone = Boolean(showPhone);

  const showPackageTests = raw.showPackageTests ?? raw.show_package_tests;
  if (showPackageTests !== undefined) res.showPackageTests = Boolean(showPackageTests);

  const showB2BModal = raw.showB2BModal ?? raw.show_b2b_modal;
  if (showB2BModal !== undefined) res.showB2BModal = Boolean(showB2BModal);

  const showQrCode = raw.showQrCode ?? raw.show_qr_code;
  if (showQrCode !== undefined) res.showQrCode = Boolean(showQrCode);

  const showBilledBy = raw.showBilledBy ?? raw.show_billed_by;
  if (showBilledBy !== undefined) res.showBilledBy = Boolean(showBilledBy);

  const showPaymentBreakdown = raw.showPaymentBreakdown ?? raw.show_payment_breakdown;
  if (showPaymentBreakdown !== undefined) res.showPaymentBreakdown = Boolean(showPaymentBreakdown);

  const showSampleColumn = raw.showSampleColumn ?? raw.show_sample_column;
  if (showSampleColumn !== undefined) res.showSampleColumn = Boolean(showSampleColumn);

  const showSampleCollectedBy = raw.showSampleCollectedBy ?? raw.show_sample_collected_by;
  if (showSampleCollectedBy !== undefined) res.showSampleCollectedBy = Boolean(showSampleCollectedBy);

  const showPincode = raw.showPincode ?? raw.show_pincode;
  if (showPincode !== undefined) res.showPincode = Boolean(showPincode);

  const showDistrict = raw.showDistrict ?? raw.show_district;
  if (showDistrict !== undefined) res.showDistrict = Boolean(showDistrict);

  const showTown = raw.showTown ?? raw.show_town;
  if (showTown !== undefined) res.showTown = Boolean(showTown);

  const showCollectionCenter = raw.showCollectionCenter ?? raw.show_collection_center;
  if (showCollectionCenter !== undefined) res.showCollectionCenter = Boolean(showCollectionCenter);

  const showSecondReferral = raw.showSecondReferral ?? raw.show_second_referral;
  if (showSecondReferral !== undefined) res.showSecondReferral = Boolean(showSecondReferral);

  const showHfrId = raw.showHfrId ?? raw.show_hfr_id;
  if (showHfrId !== undefined) res.showHfrId = Boolean(showHfrId);

  const showTestCode = raw.showTestCode ?? raw.show_test_code;
  if (showTestCode !== undefined) res.showTestCode = Boolean(showTestCode);

  if (raw.margins) {
    res.margins = {
      ...res.margins,
      ...raw.margins,
    };
  }

  if (Array.isArray(raw.fieldOrdering || raw.field_ordering)) {
    const list = raw.fieldOrdering || raw.field_ordering;
    if (list.length > 0) {
      res.fieldOrdering = list;
    }
  }

  if (raw.gst) {
    res.gst = {
      ...res.gst,
      ...raw.gst,
    };
  }

  if (raw.upi) {
    res.upi = {
      ...res.upi,
      ...raw.upi,
    };
  }

  const tc = raw.termsAndConditions ?? raw.terms_and_conditions;
  if (tc !== undefined) {
    res.termsAndConditions = tc ?? "";
  }

  if (Array.isArray(raw.signatures)) {
    res.signatures = raw.signatures;
  }

  return res;
}
