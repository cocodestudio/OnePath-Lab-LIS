export const ALL_BILL_ORDERING_FIELDS = [
  "Bill ID",
  "Day wise ID",
  "Bill Date",
  "Patient ID",
  "UHID",
  "Name",
  "Age/Gender",
  "Contact No.",
  "ABHA ID",
  "Vial Barcode",
  "Referred By",
  "Second Referral",
  "Address",
  "Pincode",
  "District",
  "Town",
  "Payment Mode",
  "Collection Center",
  "Corporate / Panel",
  "HFR ID",
  "Aadhaar no.",
  "Insurance no.",
  "GSTIN",
  "Owner Name",
] as const;

export interface BillSignature {
  id: string;
  name: string;
  designation: string;
  imageUrl?: string | null;
}

export interface BillLayoutSettings {
  heading: string;
  logoImage: string | null;
  showLogo: boolean;
  showLabAddress: boolean;
  logoWidth: number;
  headerImage: string | null;
  footerImage: string | null;
  bgImage: string | null;
  headerPlacement: "background" | "inline";
  size: "A4" | "A5";
  headerHeight: number;
  footerHeight: number;
  showBarcode: boolean;
  showVialBarcode: boolean;
  showAbhaId: boolean;
  showUhid: boolean;
  showPackageName: boolean;
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
    top: number;
    bottom: number;
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
  logoImage: null,
  showLogo: true,
  showLabAddress: true,
  logoWidth: 64,
  headerImage: null,
  footerImage: null,
  bgImage: null,
  headerPlacement: "background",
  size: "A4",
  headerHeight: 110,
  footerHeight: 70,
  showBarcode: true,
  showVialBarcode: true,
  showAbhaId: true,
  showUhid: false,
  showPackageName: true,
  showPhone: true,
  showPackageTests: false,
  showB2BModal: false,
  showQrCode: true,
  showBilledBy: true,
  showPaymentBreakdown: true,
  showSampleColumn: true,
  showSampleCollectedBy: false,
  showPincode: false,
  showDistrict: false,
  showTown: false,
  showCollectionCenter: false,
  showSecondReferral: false,
  showHfrId: false,
  showTestCode: true,
  margins: {
    top: 16,
    bottom: 16,
    left: 24,
    right: 24,
    patientDetailsBottomSpacing: 8,
  },
  fieldOrdering: [
    "Bill ID",
    "Bill Date",
    "Patient ID",
    "Name",
    "Age/Gender",
    "Contact No.",
    "ABHA ID",
    "Vial Barcode",
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
  const logo = raw.logoImage ?? raw.logo_image;
  if (logo !== undefined) res.logoImage = logo || null;

  const showLogo = raw.showLogo ?? raw.show_logo;
  if (showLogo !== undefined) res.showLogo = Boolean(showLogo);

  const showLabAddr = raw.showLabAddress ?? raw.show_lab_address;
  if (showLabAddr !== undefined) res.showLabAddress = Boolean(showLabAddr);

  const lWidth = raw.logoWidth ?? raw.logo_width;
  if (lWidth !== undefined && lWidth !== null && lWidth !== "") res.logoWidth = Number(lWidth);

  const hImg = raw.headerImage ?? raw.header_image;
  if (hImg !== undefined) res.headerImage = hImg || null;

  const fImg = raw.footerImage ?? raw.footer_image;
  if (fImg !== undefined) res.footerImage = fImg || null;

  const bgImg = raw.bgImage ?? raw.bg_image;
  if (bgImg !== undefined) res.bgImage = bgImg || null;

  const hPlacement = raw.headerPlacement ?? raw.header_placement;
  if (hPlacement === "inline" || hPlacement === "background") res.headerPlacement = hPlacement;

  if (raw.size) res.size = raw.size;
  const hHeight = raw.headerHeight ?? raw.header_height;
  if (hHeight !== undefined && hHeight !== null && hHeight !== "") res.headerHeight = Number(hHeight);

  const fHeight = raw.footerHeight ?? raw.footer_height;
  if (fHeight !== undefined && fHeight !== null && fHeight !== "") res.footerHeight = Number(fHeight);

  const showBarcode = raw.showBarcode ?? raw.show_barcode;
  if (showBarcode !== undefined) res.showBarcode = Boolean(showBarcode);

  const showVialBarcode = raw.showVialBarcode ?? raw.show_vial_barcode;
  if (showVialBarcode !== undefined) res.showVialBarcode = Boolean(showVialBarcode);

  const showAbhaId = raw.showAbhaId ?? raw.show_abha_id;
  if (showAbhaId !== undefined) res.showAbhaId = Boolean(showAbhaId);

  const showUhid = raw.showUhid ?? raw.show_uhid;
  if (showUhid !== undefined) res.showUhid = Boolean(showUhid);

  const showPackageName = raw.showPackageName ?? raw.show_package_name;
  if (showPackageName !== undefined) res.showPackageName = Boolean(showPackageName);

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
