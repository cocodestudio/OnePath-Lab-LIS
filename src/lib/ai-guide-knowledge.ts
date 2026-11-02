/**
 * OnePath Lab LIS — AI Assistant & Interactive Knowledge Engine
 * Location: src/lib/ai-guide-knowledge.ts
 *
 * Provides accurate, role-isolated step-by-step guidance for all 4 user roles:
 *  1. ADMIN / PATHOLOGIST / SUPER_ADMIN
 *  2. RECEPTIONIST (Front Desk)
 *  3. COLLECTION_CENTER (Collection Centre / Phlebotomy Centre)
 *  4. B2B (B2B Partner / Franchise)
 *
 * Pure utility module with ZERO UI dependencies — safe for Next.js and unit tests.
 */

export type UserPortalRole = "ADMIN" | "RECEPTIONIST" | "COLLECTION_CENTER" | "B2B";

/**
 * Strictly normalizes incoming user role string to one of the 4 canonical roles.
 */
export function normalizeAiRole(role?: string | null): UserPortalRole {
  const r = (role || "").toUpperCase().trim();
  if (r === "COLLECTION_CENTRE" || r === "COLLECTION_CENTER") {
    return "COLLECTION_CENTER";
  }
  if (r === "RECEPTIONIST" || r === "FRONT_DESK") {
    return "RECEPTIONIST";
  }
  if (r === "B2B" || r === "B2B_PARTNER") {
    return "B2B";
  }
  // ADMIN, SUPER_ADMIN, PATHOLOGIST, LAB_ADMIN, or default fallback
  return "ADMIN";
}

/**
 * Returns role-tailored greeting and initial guidance message.
 */
export function getRoleWelcomeMessage(role?: string | null): string {
  const normalized = normalizeAiRole(role);
  if (normalized === "COLLECTION_CENTER") {
    return "👋 **Welcome to Collection Centre Assistant**\n\nMain aapko Collection Centre portal ke features (Today's Samples intake, physical tube barcodes tag karna, status update karna, reports print karna, due reports, billing receipts, aur monthly business report) me step-by-step guide karne ke liye trained hoon.\n\nNeeche diye options chunein ya apna sawal poochhein:";
  }
  if (normalized === "RECEPTIONIST") {
    return "👋 **Welcome to Front Desk Assistant**\n\nMain aapko Front Desk Receptionist portal ke features (Patient Registration & barcodes, Patient History, Today's Samples intake, Track Samples 4-stage live tracking, Reports print, Billing Desk & Due Reports, aur ABHA ID poster) me step-by-step guide karne ke liye trained hoon.\n\nNeeche diye options chunein ya apna sawal poochhein:";
  }
  if (normalized === "B2B") {
    return "👋 **Welcome to B2B Partner Assistant**\n\nMain aapko B2B Partner portal ke features (B2B patient booking at contracted rates, Patient History, Today's Samples dispatch tracking, Reports download, prepaid wallet recharge, Billing, Revenue & Ledger, aur Rate List) me step-by-step guide karne ke liye trained hoon.\n\nNeeche diye options chunein ya apna sawal poochhein:";
  }
  return "👋 **Welcome to OnePath LIS Assistant**\n\nI can guide you step-by-step through every feature, route, and setting in OnePath LIS (Patients, Reports, Due Reports, Billing, Monthly Business, Cases, B2B & Centers, Tests Master & Catalog, Inventory, Smart Report AI, Settings, Refer & Earn, and Support).\n\nSelect a quick topic below or type your question in English or Hindi:";
}

/**
 * Detects whether the query is written in Hindi/Hinglish or English.
 */
function isHindiQuery(q: string): boolean {
  const hasDevanagari = /[\u0900-\u097F]/.test(q);
  const hindiWords = /\b(kaise|kare|karein|karna|karo|karu|karega|karegi|karenge|kaha|kahan|kya|kyu|kyun|kyon|kis|kisko|kisme|kisse|kaun|kon|kaunsa|konsa|hai|hain|hoga|hogi|hoge|hua|hue|liya|diya|batao|batayein|bata|dikhao|bhai|bhaiya|namaste|mariz|mareez|parinam|parchi|rasid|chahiye|mera|meri|mere|apna|apni|apne|wala|wali|wale|shuru|kijiye|suno|nahi|haan|alag|chupaye|chupana|lagaye|lagana|jode|jodna|baki|baaki|udhar|kharcha|badle|badalna|jana)\b/i;
  return hasDevanagari || hindiWords.test(q);
}

/**
 * Detects navigation, page switching, or tab change intent.
 */
function isNavigationOrSwitchQuery(q: string): boolean {
  if (
    q.includes("1 test per page") ||
    q.includes("per page") ||
    q.includes("single page") ||
    q.includes("multi page") ||
    q.includes("test separation")
  ) {
    return false;
  }
  return (
    q.includes("switch") || q.includes("navigate") || q.includes("badle") ||
    q.includes("badal") || q.includes("kaha jana") || q.includes("kahan jana") ||
    q.includes("routes") || q.includes("route") ||
    /\b(page|tab)\s+(kaise\s+(badle|switch|change)|switch|badle|change)\b/i.test(q) ||
    q.includes("tab change") || q.includes("page change") ||
    q.includes("kaha milega") || q.includes("kahan milega") || q.includes("menu") ||
    q.includes("options kya") || q.includes("kahan set hai") || q.includes("kaha set hai") ||
    q.includes("all routes") || q.includes("kaha se hoga") || q.includes("kahan se hoga")
  );
}

/**
 * Main AI Knowledge engine providing accurate, role-specific navigation and workflow guidance.
 */
export function getClientFallbackAnswer(query: string, role: string = "ADMIN"): string {
  const q = (query || "").trim().toLowerCase();
  const normalizedRole = normalizeAiRole(role);
  const isHindi = isHindiQuery(q);

  // --------------------------------------------------------------------------
  // 0. Confidential Architecture & Off-topic Shields
  // --------------------------------------------------------------------------
  const techRegexes = [
    /\b(tech stack|technology stack|framework|frameworks)\b/i,
    /\b(laravel|next\.?js|react\.?js|vue|angular)\b/i,
    /\b(php|python|nodejs|javascript|typescript)\b/i,
    /\b(mysql|sqlite|postgres|postgresql)\b/i,
    /\b(backend|frontend|source code|codebase|architecture)\b/i,
    /\b(github|gitlab|api key|system prompt|groq|gemini)\b/i,
    /\b(kis se bana|kaise bana hai|kaise banaya gaya|kis technology|kis framework|kon sa framework|kon si technology|kya technology|kisme bana|kisse bana|backend me kya|kon si language|kis language)\b/i,
    /\b(repo|repositories|repository)\b/i,
    /\b(database|database schema)\b/i,
  ];
  for (const tr of techRegexes) {
    if (tr.test(q)) {
      return isHindi
        ? "OnePath LIS ek proprietary aur secure enterprise laboratory information system hai. Iska internal codebase, architecture aur backend technology details confidential hain.\n\nMain sirf OnePath LIS ke software features aur portal operations me aapki madad kar sakta hoon. Apne portal se juda koi sawal ho to batayein!"
        : "OnePath LIS is a proprietary, secure enterprise laboratory information system. Internal engineering, codebase, and backend architecture details are confidential.\n\nI am here strictly to assist you with using OnePath LIS portal features. How can I assist you with your operations today?";
    }
  }

  const unrelated = ["cricket", "movie", "song", "joke", "cooking", "weather", "football", "politics", "recipe", "khana", "biryani", "film", "gaana"];
  for (const w of unrelated) {
    if (q.includes(w)) {
      return isHindi
        ? "Main OnePath LIS Assistant hoon aur sirf aapke portal ke features, workflows aur lab operations me aapki madad kar sakta hoon. Apne portal se juda koi sawal ho to batayein!"
        : "I am the OnePath LIS Assistant and can only help with your portal features, workflows, and lab operations. How can I assist you with the portal today?";
    }
  }

  // --------------------------------------------------------------------------
  // 0.5 Universal Security & Two-Factor Authentication (2FA) Guidance
  // Available to all 4 roles at /dashboard/account/profile -> Tab '2FA'
  // --------------------------------------------------------------------------
  if (
    q.includes("2fa") ||
    q.includes("two factor") ||
    q.includes("two-factor") ||
    q.includes("twofactor") ||
    q.includes("authenticator") ||
    q.includes("totp") ||
    q.includes("login otp") ||
    q.includes("whatsapp otp") ||
    q.includes("email otp") ||
    (q.includes("security") && (q.includes("tab") || q.includes("enable") || q.includes("account") || q.includes("setup")))
  ) {
    return isHindi
      ? "🔒 **Two-Factor Authentication (2FA) Setup Karne Ka Tareeka:**\n\nOnePath LIS me sabhi roles (Admin, Receptionist, Collection Centre aur B2B) ke liye 2FA uplabdh hai:\n\n1. **[My Account / Profile](/dashboard/account/profile)** par jayein (Top right avatar ya navigation se).\n2. Top tabs me se **`2FA`** tab par click karein.\n3. Koi bhi **1 authentication method** chunein:\n   - **Google Authenticator (TOTP)** *(Recommended)*: Phone me Google Authenticator / Microsoft Authenticator app se QR code scan karein aur 6-digit code daal kar activate karein.\n   - **Email OTP**: Har login par registered email par 6-digit verification code receive hoga.\n   - **WhatsApp OTP**: Har login par WhatsApp par OTP aayega (iske liye profile me mobile number add hona zaroori hai).\n4. Test code verify karne ke baad **2FA active** ho jayega.\n5. Agli baar jab aap login karenge, to password daalne ke theek baad 6-digit code ka field aayega jisme code daal kar aap login kar sakenge.\n6. 2FA band karne ke liye My Account > 2FA me jakar **'Disable 2FA'** par click karein."
      : "🔒 **How to Setup Two-Factor Authentication (2FA):**\n\nTwo-Factor Authentication is supported across all roles (Admin, Receptionist, Collection Centre, and B2B Partners):\n\n1. Navigate to **[My Account / Profile](/dashboard/account/profile)** from the top-right profile avatar.\n2. Click on the **`2FA`** tab in the segmented switcher.\n3. Choose your preferred authentication method (mutually exclusive):\n   - **Google Authenticator (TOTP)** *(Recommended)*: Scan the QR code using Google Authenticator, Microsoft Authenticator, or Authy, and enter the 6-digit code.\n   - **Email OTP**: Receive a 6-digit code at your registered email on every sign-in.\n   - **WhatsApp OTP**: Receive a 6-digit code directly on WhatsApp (requires a valid mobile number saved in your Profile).\n4. Click **'Verify & Activate'** to finalize 2FA protection.\n5. During future sign-ins, after entering your password, enter the 6-digit code to complete authentication.\n6. To turn it off at any time, return to My Account > 2FA and click **'Disable 2FA'**.";
  }

  // ==========================================================================
  // ROLE 1: COLLECTION_CENTER PORTAL
  // Authorized Routes:
  // - Overview: /dashboard
  // - Today Samples: /dashboard/today-samples
  // - Patients: /dashboard/patients
  // - Reports: /dashboard/reports
  // - Financial Analytics:
  //    - Due Reports: /dashboard/billing/dues
  //    - Billing: /dashboard/billing
  //    - Monthly Business Report: /dashboard/billing/monthly-expenses
  // - Support: /dashboard/support
  // ==========================================================================
  if (normalizedRole === "COLLECTION_CENTER") {
    // 1.1 Out of Scope: Result entry, doctor signs, report approvals, formulas
    if (
      q.includes("result") || q.includes("parinam") || q.includes("enter result") ||
      q.includes("doctor sign") || q.includes("signature") || q.includes("approve report") ||
      q.includes("approval") || q.includes("ai suggestion") || q.includes("formula")
    ) {
      return isHindi
        ? "Yeh feature Collection Centre portal me uplabdh nahi hai. Test result daalna, clinical remarks, doctor digital signatures aur report approval Central Laboratory / Pathologist dwara manage kiye jaate hain.\n\nCollection Centre portal me aapke authorized features ye hain:\n1. **[Today's Samples](/dashboard/today-samples)** – Aaj ke samples intake karna aur physical tube barcodes tag karna\n2. **Status Update** – Sample stage ko 'Collected' aur 'Central Hub' (In Transit) mark karna\n3. **[Reports](/dashboard/reports)** – Final approved reports check aur print karna\n4. **[Due Reports](/dashboard/billing/dues)** – Center ke pending patient dues check karna\n5. **[Billing Desk](/dashboard/billing)** – Payment receipts print karna\n6. **[Monthly Business Report](/dashboard/billing/monthly-expenses)** – Monthly intake summary check karna"
        : "This feature is not available in the Collection Centre portal. Entering test results, doctor digital signatures, clinical AI remarks, and approving reports are managed exclusively by the Central Laboratory / Pathologists.\n\nIn your Collection Centre portal, you can:\n1. Intake today's specimens & tag tube barcodes in [Open Today's Samples](/dashboard/today-samples)\n2. Update sample stage to 'Collected' and 'Central Hub' (In Transit)\n3. View & print verified reports in [Open Reports](/dashboard/reports)\n4. Track pending receivables in [Open Due Reports](/dashboard/billing/dues)\n5. Print patient payment receipts in [Open Billing Desk](/dashboard/billing)\n6. Review monthly volume in [Open Monthly Business Report](/dashboard/billing/monthly-expenses).";
    }

    // 1.2 Out of Scope: Settings, Letterhead, Layout, RBAC, Gateways, Machines, Inventory, Catalog, Cases, B2B Wallet
    if (
      q.includes("setting") || q.includes("letterhead") || q.includes("rbac") ||
      q.includes("machine") || q.includes("analyzer") || q.includes("inventory") ||
      q.includes("catalog") || q.includes("test master") || q.includes("add test") ||
      q.includes("cases") || q.includes("outsource") || q.includes("smart report") ||
      (q.includes("wallet") && !q.includes("due") && !q.includes("bill"))
    ) {
      return isHindi
        ? "Yeh feature Collection Centre portal ke scope me nahi hai. Lab settings (Letterhead, Layout, RBAC, Analyzer Interfacing), Test Catalog Master, Inventory, aur Cases strictly Central Lab Administrator dwara manage kiye jaate hain.\n\nAap apne portal ke sidebar se **[Today's Samples](/dashboard/today-samples)**, **[Patients](/dashboard/patients)**, **[Reports](/dashboard/reports)** aur **[Billing](/dashboard/billing)** access kar sakte hain."
        : "This feature is not accessible in the Collection Centre portal. Laboratory configuration (Letterhead, Layouts, RBAC, Analyzer Bridges), Test Catalog Master, Inventory, and Clinical Cases are restricted exclusively to the Central Lab Administrator.\n\nFrom your portal sidebar, you can access [Open Today's Samples](/dashboard/today-samples), [Open Patients](/dashboard/patients), [Open Reports](/dashboard/reports), and [Open Billing Desk](/dashboard/billing).";
    }

    // 1.3 Step-by-Step Page & Tab Navigation Guidance
    if (isNavigationOrSwitchQuery(q)) {
      return isHindi
        ? "Collection Centre portal me pages aur tabs switch karne ke steps:\n\n"
          + "1. **Overview** (`/dashboard`): [Open Dashboard Overview](/dashboard) – Aaj ke intake metrics aur collection count summary.\n"
          + "2. **Today Samples** (`/dashboard/today-samples`): [Open Today's Samples](/dashboard/today-samples) – Aaj ke samples intake karein, 'Status / Barcodes' par click karke EDTA, SST, Fluoride tube barcodes tag karein aur status 'Collected' ya 'Central Hub' mark karein.\n"
          + "3. **Patients** (`/dashboard/patients`): [Open Patients](/dashboard/patients) – Center ke registered marizon ki list aur PID search karein.\n"
          + "4. **Reports** (`/dashboard/reports`): [Open Reports Management](/dashboard/reports) – Specimen testing status monitor karein aur approved final reports print karein.\n"
          + "5. **Financial Analytics** (Sidebar accordion se sub-tabs switch karein):\n"
          + "   - **Due Reports**: [Open Due Reports](/dashboard/billing/dues) – Center ke pending patient dues check karein aur settlement accept karein.\n"
          + "   - **Billing**: [Open Billing Desk](/dashboard/billing) – Patient billing records review karein aur receipts print karein.\n"
          + "   - **Monthly Business Report**: [Open Monthly Business Report](/dashboard/billing/monthly-expenses) – Center ki monthly business performance track karein.\n"
          + "6. **Support**: [Open Help & Support](/dashboard/support) – Technical assistance ticket raise karein.\n\n"
          + "*Note: Result Entry aur Master Settings Central Laboratory dwara manage kiye jaate hain.*"
        : "Step-by-step page and navigation guide for Collection Centre portal:\n\n"
          + "1. **Overview**: Go to [Open Dashboard Overview](/dashboard) for daily intake totals.\n"
          + "2. **Today Samples**: Go to [Open Today's Samples](/dashboard/today-samples) to intake arrivals, tag color vacutainer barcodes (EDTA, SST, etc.), and update status to Collected or Central Hub.\n"
          + "3. **Patients**: Go to [Open Patients](/dashboard/patients) to search center patient records.\n"
          + "4. **Reports**: Go to [Open Reports Management](/dashboard/reports) to view status and print finalized reports.\n"
          + "5. **Financial Analytics** (click in sidebar to expand):\n"
          + "   - **Due Reports**: [Open Due Reports](/dashboard/billing/dues) to view pending balances.\n"
          + "   - **Billing**: [Open Billing Desk](/dashboard/billing) to print receipts.\n"
          + "   - **Monthly Business Report**: [Open Monthly Business Report](/dashboard/billing/monthly-expenses) for monthly performance.\n"
          + "6. **Support**: Go to [Open Help & Support](/dashboard/support) for technical assistance.";
    }

    // 1.4 Vacutainer Tube Barcodes & Status Update
    if (
      q.includes("barcode") || q.includes("tube") || q.includes("vial") ||
      q.includes("color") || q.includes("edta") || q.includes("sst") ||
      q.includes("fluoride") || q.includes("citrate") || q.includes("status") ||
      q.includes("collected") || q.includes("hub") || q.includes("transit")
    ) {
      return isHindi
        ? "Vacutainer Tube Barcodes tag aur status update karne ke steps:\n\n"
          + "1. Sidebar me **'Today Samples'** par jayein: [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Patient row ke aage **'Status / Barcodes'** button par click karein.\n"
          + "3. Popup window me prescribed tests ke hisab se required color-coded tubes dikhengi:\n"
          + "   - **EDTA (Purple)**: Whole Blood / CBC / HbA1c\n"
          + "   - **SST (Gold / Yellow)**: Serum Clot Activator / LFT / KFT / Lipid / Thyroid\n"
          + "   - **Fluoride (Grey)**: Blood Sugar / Glucose (FBS, PPBS)\n"
          + "   - **Citrate (Light Blue)**: PT / INR / Coagulation\n"
          + "   - **Urine (Yellow Container)** / **Stool (Brown Container)**\n"
          + "4. Har tube ke samne physical barcode sticker ka number type ya barcode scanner se scan karein.\n"
          + "5. Sample status dropdown se select karein:\n"
          + "   - **Collected**: Phlebotomy sample center par collect ho gaya hai.\n"
          + "   - **Central Hub**: Sample batch banakar main central lab bhej diya gaya hai (In Transit).\n"
          + "6. **'Save Status & Barcodes'** par click karein.\n\n"
          + "*Dhyan dein: Jab report Central Lab se Final Approve ho jati hai, to barcodes lock ho jate hain.*"
        : "Steps to tag vacutainer tube barcodes and advance sample stages:\n\n"
          + "1. Go to [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Click **'Status / Barcodes'** on the patient's row.\n"
          + "3. The popup displays color-coded badges for prescribed tests:\n"
          + "   - **EDTA (Purple)**: Whole Blood / CBC / HbA1c\n"
          + "   - **SST (Gold)**: Serum Clot Activator / LFT / KFT / Lipid / Thyroid\n"
          + "   - **Fluoride (Grey)**: Blood Glucose / FBS / PPBS\n"
          + "   - **Citrate (Blue)**: PT / INR / Coagulation\n"
          + "   - **Urine (Yellow)** / **Stool (Brown)**\n"
          + "4. Scan or type the physical barcode sticker for each required vial.\n"
          + "5. Update the sample stage dropdown:\n"
          + "   - **Collected**: Specimen collected at center\n"
          + "   - **Central Hub**: Dispatched in transit to main laboratory\n"
          + "6. Click **'Save Status & Barcodes'**.\n\n"
          + "*Note: Once the central pathologist finalizes and approves the report, barcodes are locked.*";
    }

    // 1.5 Today's Samples Intake
    if (q.includes("today") || q.includes("aaj") || q.includes("sample") || q.includes("intake")) {
      return isHindi
        ? "Today's Samples intake karne ke steps:\n\n"
          + "1. Sidebar se **'Today Samples'** par click karein ya direct jayein: [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Yahan sirf aaj ke registered samples dikhenge.\n"
          + "3. Patient details aur tests verify karein, fir **'Status / Barcodes'** dabakar tubes tag karein aur status ko 'Collected' ya 'Central Hub' mark karein."
        : "Steps for Today's Samples intake:\n\n"
          + "1. Click **'Today Samples'** in the sidebar or go directly to [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Review all specimens registered today under your collection center.\n"
          + "3. Click **'Status / Barcodes'** to tag color-coded vials and update status to Collected or Central Hub (In Transit).";
    }

    // 1.6 Due Reports & Receivables
    if (q.includes("due") || q.includes("pending payment") || q.includes("baki") || q.includes("baaki") || q.includes("udhar")) {
      return isHindi
        ? "Collection Center ke pending dues dekhne ke steps:\n\n"
          + "1. Sidebar se **Financial Analytics > Due Reports** me jayein: [Open Due Reports](/dashboard/billing/dues).\n"
          + "2. Patient Name, Mobile number ya PID se pending due invoices search karein.\n"
          + "3. Outstanding balance review karein aur clear payment accept karein."
        : "To view and manage pending dues in Collection Centre portal:\n\n"
          + "1. Go to **Financial Analytics > Due Reports**: [Open Due Reports](/dashboard/billing/dues).\n"
          + "2. Search pending bills by Patient Name, Phone number, or PID.\n"
          + "3. Review outstanding balances and accept due clearances.";
    }

    // 1.7 Billing Desk & Payment Receipts
    if (q.includes("bill") || q.includes("payment") || q.includes("receipt") || q.includes("rasid") || q.includes("print bill")) {
      return isHindi
        ? "Billing receipt print karne ke steps:\n\n"
          + "1. Sidebar se **Financial Analytics > Billing** me jayein: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Patient ka Total, Paid amount aur Balance Due check karein.\n"
          + "3. Receipt print karne ke liye row me **'Print'** button par click karein.\n\n"
          + "*Note: Collection Centre portal me bills edit ya delete karna restricted hai, sirf receipts print ki ja sakti hain.*"
        : "To print billing receipts:\n\n"
          + "1. Go to **Financial Analytics > Billing**: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Review patient total, paid amount, and outstanding due balance.\n"
          + "3. Click **'Print'** on the invoice row to generate thermal or A4 receipts.\n\n"
          + "*Note: Editing invoice amounts or deleting bills is restricted to Lab Administrators.*";
    }

    // 1.8 Monthly Business Report
    if (q.includes("monthly") || q.includes("business") || q.includes("month sales") || q.includes("monthly expense") || q.includes("p&l")) {
      return isHindi
        ? "Monthly Business Report dekhne ke steps:\n\n"
          + "1. Sidebar se **Financial Analytics > Monthly Business Report** me jayein: [Open Monthly Business Report](/dashboard/billing/monthly-expenses).\n"
          + "2. Current month ka total intake, volume aur revenue summary review karein."
        : "To view Monthly Business Report:\n\n"
          + "1. Go to **Financial Analytics > Monthly Business Report**: [Open Monthly Business Report](/dashboard/billing/monthly-expenses).\n"
          + "2. Track your collection center's monthly intake, volume, and revenue summary.";
    }

    // 1.9 Reports Tracking & Printing
    if (q.includes("report") || q.includes("download") || q.includes("pdf") || q.includes("final report")) {
      return isHindi
        ? "Approved reports dekhne aur print karne ke steps:\n\n"
          + "1. Sidebar se **'Reports'** me jayein: [Open Reports Management](/dashboard/reports).\n"
          + "2. Yahan aapke center ke samples ka live status (Registered, Collected, Testing, Approved) dikhega.\n"
          + "3. Status **'Approved'** hone par patient ke aage **'Print'** ya **'PDF'** button par click karke final vector report print karein."
        : "To view and print patient reports:\n\n"
          + "1. Go to [Open Reports Management](/dashboard/reports).\n"
          + "2. Monitor specimen testing progress (Registered, Collected, Testing, Approved).\n"
          + "3. Once status is marked **'Approved'**, click **'Print'** or **'PDF'** to print the verified clinical report.";
    }

    // 1.10 Center Patients Directory
    if (q.includes("patient") || q.includes("mariz") || q.includes("mareez") || q.includes("directory") || q.includes("list")) {
      return isHindi
        ? "Collection Centre ke registered mariz dekhne ke steps:\n\n"
          + "1. Sidebar se **'Patients'** me jayein: [Open Patients](/dashboard/patients).\n"
          + "2. Yahan aapke center ke sabhi registered marizon ki list dikhegi.\n"
          + "3. Name, Phone ya PID se search kar sakte hain."
        : "To view patient records in Collection Centre portal:\n\n"
          + "1. Go to [Open Patients](/dashboard/patients).\n"
          + "2. Search registered patients under your center by Name, Mobile number, or PID.";
    }

    // 1.11 Support & Help
    if (q.includes("support") || q.includes("help") || q.includes("ticket") || q.includes("complaint") || q.includes("madad")) {
      return isHindi
        ? "Support ticket raise karne ke steps:\n\n"
          + "1. Sidebar se **'Help & Support'** me jayein: [Open Help & Support](/dashboard/support).\n"
          + "2. Issue category select karein aur ticket submit karein. 'Ticket History' tab me resolution status track kar sakte hain."
        : "To contact technical support:\n\n"
          + "1. Go to [Open Help & Support](/dashboard/support).\n"
          + "2. Submit a support ticket and track resolution status in the 'Ticket History' tab.";
    }

    // 1.12 Overview / Dashboard
    if (q.includes("overview") || q.includes("dashboard") || q.includes("home")) {
      return isHindi
        ? "Collection Centre Overview Dashboard:\n\n"
          + "1. Sidebar se **'Overview'** par click karein: [Open Dashboard Overview](/dashboard).\n"
          + "2. Yahan aaj ke total samples, pending collections, aur dispatch summary dekh sakte hain."
        : "Collection Centre Overview Dashboard:\n\n"
          + "1. Go to [Open Dashboard Overview](/dashboard).\n"
          + "2. Review today's intake metrics, pending collections, and dispatch status.";
    }

    // 1.13 Default CC fallback
    return isHindi
      ? "Main **OnePath Collection Centre Assistant** hoon! Main aapko Collection Centre portal ke features me guide kar sakta hoon:\n\n"
        + "- [Open Today's Samples](/dashboard/today-samples) – Aaj ke samples intake karna aur vacutainer barcodes tag karna\n"
        + "- **Status Update** – Sample stage ko 'Collected' aur 'Central Hub' mark karna\n"
        + "- [Open Reports Management](/dashboard/reports) – Final approved reports check aur print karna\n"
        + "- [Open Due Reports](/dashboard/billing/dues) – Center ke pending patient dues check karna\n"
        + "- [Open Billing Desk](/dashboard/billing) – Payment receipts print karna\n"
        + "- [Open Monthly Business Report](/dashboard/billing/monthly-expenses) – Monthly intake summary check karna\n"
        + "- [Open Patients](/dashboard/patients) – Center ke mariz dekhna\n"
        + "- [Open Help & Support](/dashboard/support) – Technical support lena\n\n"
        + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
      : "Welcome to the **OnePath Collection Centre Assistant**! I can guide you through all features in your Collection Centre portal:\n\n"
        + "- [Open Today's Samples](/dashboard/today-samples): Today's sample intake & tag vacutainer barcodes\n"
        + "- **Status / Barcodes**: Tag EDTA, SST, Fluoride tube barcodes and advance stage to Collected or Central Hub\n"
        + "- [Open Reports Management](/dashboard/reports): View status and print approved reports\n"
        + "- [Open Due Reports](/dashboard/billing/dues): Review pending patient dues\n"
        + "- [Open Billing Desk](/dashboard/billing): Print patient payment receipts\n"
        + "- [Open Monthly Business Report](/dashboard/billing/monthly-expenses): Track monthly center performance\n"
        + "- [Open Patients](/dashboard/patients): Search patients registered under this center\n"
        + "- [Open Help & Support](/dashboard/support): Submit technical assistance tickets.";
  }

  // ==========================================================================
  // ROLE 2: RECEPTIONIST (FRONT DESK) PORTAL
  // Authorized Routes:
  // - Overview: /dashboard
  // - Patients: /dashboard/patients (Register: /dashboard/patients/register, History: /dashboard/patients/[id])
  // - Today Samples: /dashboard/today-samples
  // - Track Samples: /dashboard/track-samples (4-step tracker, explicit search, print report)
  // - Reports: /dashboard/reports (view & print approved reports)
  // - Billing: /dashboard/billing
  // - Support: /dashboard/support
  // - ABHA ID: Top navbar "Create ABHA ID" QR poster
  //
  // Strictly Blocked / Out-of-Scope:
  // - Cases (/dashboard/cases, /dashboard/doctors) -> Admin only
  // - Settings & RBAC (/dashboard/settings) -> Admin only
  // - Test Catalog Master (/dashboard/tests) -> Admin only
  // - Inventory (/dashboard/inventory) -> Admin only
  // - Smart Report AI (/dashboard/smart-report) -> Admin only
  // - Result Entry (/dashboard/reports/[id]/edit) -> Central Lab / Pathologist only
  // - Doctor Digital Signatures & Approvals -> Central Lab / Pathologist only
  // ==========================================================================
  if (normalizedRole === "RECEPTIONIST") {
    // 2.1 Out of Scope: Result entry, doctor signs, report approvals, formulas
    if (
      q.includes("result") || q.includes("parinam") || q.includes("enter result") ||
      q.includes("doctor sign") || q.includes("signature") || q.includes("approve report") ||
      q.includes("ai suggestion") || q.includes("formula")
    ) {
      return isHindi
        ? "Yeh feature Front Desk Receptionist portal ke scope me nahi hai. Test result daalna, clinical remarks, doctor digital signatures aur report approval Lab Technicians aur Pathologists dwara manage kiye jaate hain.\n\nFront Desk Receptionist portal me aap:\n1. **[Patient Registration](/dashboard/patients/register)** – Naye mariz register karna aur barcode print karna\n2. **[Track Samples](/dashboard/track-samples)** – Sample ka 4-step live progress track karna aur approved reports print karna\n3. **[Today's Samples](/dashboard/today-samples)** – Aaj ke booked samples ka status monitor karna\n4. **[Billing Desk](/dashboard/billing)** – Cash/UPI payment lena aur print receipts nikalna\n5. **[Reports](/dashboard/reports)** – Final verified reports print karna\nkar sakte hain."
        : "This feature is not part of the Front Desk Receptionist portal. Entering test results, doctor digital signatures, clinical AI remarks, and approving reports are strictly handled by Lab Technicians and Pathologists.\n\nIn the Receptionist portal, you can:\n1. Register walk-ins & print vial barcodes in [Open Patient Registration](/dashboard/patients/register)\n2. Track 4-stage live progress and print reports in [Open Track Samples](/dashboard/track-samples)\n3. Review today's queue in [Open Today's Samples](/dashboard/today-samples)\n4. Collect cash/UPI payments in [Open Billing Desk](/dashboard/billing)\n5. Print verified approved reports in [Open Reports](/dashboard/reports).";
    }

    // 2.2 Out of Scope: Cases, Doctor Referrals, Commissions
    if (q.includes("cases") || q.includes("outsource") || q.includes("doctor portal") || q.includes("referral manage") || q.includes("commission")) {
      return isHindi
        ? "Cases aur Doctor Referral Management Front Desk Receptionist portal me uplabdh nahi hai. Yeh module strictly Laboratory Administrator ke liye reserved hai.\n\nAgar aapko patient registration ke dauran referring doctor chunna hai, to aap **[Patient Registration](/dashboard/patients/register)** me 'Referring Doctor' dropdown se doctor select kar sakte hain."
        : "Cases and Doctor Referral Commission management are not available in the Front Desk Receptionist portal. This module is strictly reserved for the Laboratory Administrator.\n\nIf you need to assign a referring doctor during patient intake, you can select the doctor from the 'Referring Doctor' dropdown in [Open Patient Registration](/dashboard/patients/register).";
    }

    // 2.3 Out of Scope: Settings, Letterhead, Layouts, RBAC, Payment Gateways, Machines, Inventory, Catalog, B2B Wallets
    if (
      q.includes("setting") || q.includes("letterhead") || q.includes("rbac") ||
      q.includes("machine") || q.includes("analyzer") || q.includes("inventory") ||
      q.includes("catalog") || q.includes("test master") || q.includes("add test") ||
      q.includes("smart report") || (q.includes("wallet") && !q.includes("due") && !q.includes("bill"))
    ) {
      return isHindi
        ? "Yeh configuration settings Front Desk Receptionist portal me uplabdh nahi hain. Lab settings (Letterhead, Layouts, RBAC, Machine Interfacing), Test Catalog Master, Inventory, aur Smart Report AI strictly Laboratory Administrator ke dwara manage hote hain.\n\nAap front-desk operations ke liye **[Patient Registration](/dashboard/patients/register)**, **[Track Samples](/dashboard/track-samples)**, **[Today's Samples](/dashboard/today-samples)** aur **[Billing Desk](/dashboard/billing)** use kar sakte hain."
        : "These configuration settings are not available in the Front Desk Receptionist portal. System settings (Letterhead, Layouts, RBAC, Machine Bridges), Test Catalog Master, Inventory, and Smart Report AI are strictly managed by the Laboratory Administrator.\n\nFor front desk operations, you can access [Open Patient Registration](/dashboard/patients/register), [Open Track Samples](/dashboard/track-samples), [Open Today's Samples](/dashboard/today-samples), and [Open Billing Desk](/dashboard/billing).";
    }

    // 2.4 Step-by-Step Page & Tab Navigation Guidance
    if (isNavigationOrSwitchQuery(q)) {
      return isHindi
        ? "Front Desk Receptionist portal me pages aur options switch karne ke steps:\n\n"
          + "1. **Overview** (`/dashboard`): [Open Dashboard Overview](/dashboard) – Walk-in marizon aur daily front-desk summary ka live overview.\n"
          + "2. **Patients** (`/dashboard/patients`): [Open Patients](/dashboard/patients) – Registered marizon ka record dhoondein. Kisi mariz ke pichle visits aur history dekhne ke liye row me **'View Patient History'** dabayein jo `/dashboard/patients/[id]` open karega. Naye mariz add karne ke liye **'+ Add Patient'** se [Open Patient Registration](/dashboard/patients/register) par jayein.\n"
          + "3. **Today Samples** (`/dashboard/today-samples`): [Open Today's Samples](/dashboard/today-samples) – Aaj ke sabhi booked samples ka status monitor karein.\n"
          + "4. **Track Samples** (`/dashboard/track-samples`): [Open Track Samples](/dashboard/track-samples) – Name/Phone/PID/Barcode se search karein aur 4-stage live progress (Registered -> Collected -> Testing -> Approved) track karein. Approved hone par direct report print karein.\n"
          + "5. **Reports** (`/dashboard/reports`): [Open Reports Management](/dashboard/reports) – Approved test reports search aur print karein.\n"
          + "6. **Financial Analytics** (Sidebar accordion toggle karein):\n"
          + "   - **Due Reports**: [Open Due Reports](/dashboard/billing/dues) – Pending patient dues check aur settle karein.\n"
          + "   - **Billing**: [Open Billing Desk](/dashboard/billing) – Cash ya UPI se payment collect karein aur thermal/A4 receipt print karein.\n"
          + "   - **Monthly Business Report**: [Open Monthly Business Report](/dashboard/billing/monthly-expenses) – Monthly intake summary check karein.\n"
          + "7. **Support**: [Open Help & Support](/dashboard/support) – Technical assistance ticket submit karein.\n"
          + "8. **ABHA ID Poster**: Top navbar me **'Create ABHA ID'** button dabakar patient QR scanner open karein.\n\n"
          + "*Note: Cases aur Settings/RBAC strictly Lab Administrator dwara manage hote hain aur Receptionist menu me uplabdh nahi hain.*"
        : "Step-by-step page and navigation guide for Front Desk Receptionist portal:\n\n"
          + "1. **Overview**: Go to [Open Dashboard Overview](/dashboard) for desk metrics.\n"
          + "2. **Patients**: Go to [Open Patients](/dashboard/patients). Click '+ Add Patient' to register new walk-ins at [Open Patient Registration](/dashboard/patients/register), or click 'View Patient History' on any patient row to navigate to detailed visit records at `/dashboard/patients/[id]`.\n"
          + "3. **Today Samples**: Go to [Open Today's Samples](/dashboard/today-samples) to monitor today's intake queue.\n"
          + "4. **Track Samples**: Go to [Open Track Samples](/dashboard/track-samples) to search by PID/Phone/Barcode and track 4-stage pipeline (Registered -> Collected -> Testing -> Approved) and print reports.\n"
          + "5. **Reports**: Go to [Open Reports Management](/dashboard/reports) to view and print finalized reports.\n"
          + "6. **Financial Analytics** (expandable menu):\n"
          + "   - **Due Reports**: [Open Due Reports](/dashboard/billing/dues) to view and collect pending dues.\n"
          + "   - **Billing**: [Open Billing Desk](/dashboard/billing) to collect cash/UPI and print receipts.\n"
          + "   - **Monthly Business Report**: [Open Monthly Business Report](/dashboard/billing/monthly-expenses) for intake statements.\n"
          + "7. **Support**: Go to [Open Help & Support](/dashboard/support) for technical assistance.\n\n"
          + "*Note: Cases and Settings/RBAC are strictly Admin only and not available in the Receptionist portal.*";
    }

    // 2.5 Track Samples (4-step tracker, explicit search, print report)
    if (
      q.includes("track") || q.includes("track sample") || q.includes("progress") ||
      q.includes("stage") || q.includes("kaha tak") || q.includes("testing") ||
      q.includes("search sample")
    ) {
      return isHindi
        ? "Track Samples use karne ke steps:\n\n"
          + "1. Sidebar me **'Track Samples'** par click karein ya direct jayein: [Open Track Samples](/dashboard/track-samples).\n"
          + "2. Search criteria dropdown se select karein:\n"
          + "   - **Name**: Patient ka naam\n"
          + "   - **Phone**: Mobile number\n"
          + "   - **Patient ID (PID)**\n"
          + "   - **Report ID**\n"
          + "   - **Barcode No**\n"
          + "   - **ABHA ID**\n"
          + "3. Search button dabayein. Tracking card me live details dikhengi:\n"
          + "   - **4-Stage Animated Stepper**: Registered ➔ Collected ➔ Testing ➔ Approved\n"
          + "   - **Vacutainer Tube Badges**: EDTA Purple, SST Gold, etc.\n"
          + "   - **Print Report Button**: Jab sample Approved ho jata hai, direct **'Print Report'** button active ho jata hai jisse report print kar sakte hain."
        : "Steps to track samples and print verified reports:\n\n"
          + "1. Go to **Dashboard > Track Samples**: [Open Track Samples](/dashboard/track-samples).\n"
          + "2. Select search criteria from dropdown:\n"
          + "   - **Name**: Patient name\n"
          + "   - **Phone**: Mobile number\n"
          + "   - **Patient ID (PID)**\n"
          + "   - **Report ID**\n"
          + "   - **Barcode No**\n"
          + "   - **ABHA ID**\n"
          + "3. Click Search. The tracking card displays:\n"
          + "   - **4-Stage Animated Progress Bar**: Registered ➔ Collected ➔ Testing ➔ Approved\n"
          + "   - **Color-Coded Tube Barcodes**: EDTA purple, SST gold, etc.\n"
          + "   - **Print Report Button**: Once status is Approved, click 'Print Report' to print directly.";
    }

    // 2.6 Patient Registration & Barcodes
    if (
      q.includes("register") || q.includes("add patient") || q.includes("booking") ||
      q.includes("mariz") || q.includes("mareez") || q.includes("new patient") ||
      q.includes("barcode") || q.includes("sticker") || q.includes("jode")
    ) {
      return isHindi
        ? "Naye patient ko register karne aur barcode nikalne ke steps:\n\n"
          + "1. Sidebar me **'+ Add Patient'** dabayein ya direct jayein: [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Patient demographics bharein (Name, Age, Gender, Mobile Number, Referring Doctor).\n"
          + "3. Search karke prescribed Tests ya Health Packages select karein (rate apne aap calculate hoga).\n"
          + "4. Advance payment details confirm karein aur **'Register & Save'** dabayein.\n"
          + "5. Save hote hi unique Lab PID aur vial barcode sticker generate ho jayega jise aap print karke collection tubes par laga sakte hain."
        : "To register a patient and print vial barcodes:\n\n"
          + "1. Click **'+ Add Patient'** in the sidebar or go to [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Fill in patient demographics (Name, Age, Gender, Phone, Referring Doctor).\n"
          + "3. Select prescribed Tests or Health Packages from the searchable list.\n"
          + "4. Review billing details, record advance payment if any, and click **'Register & Save'**.\n"
          + "5. A unique Lab PID and barcode sticker will be generated ready for printing.";
    }

    // 2.7 Patients Directory & Patient History (/dashboard/patients/[id])
    if (q.includes("patient history") || q.includes("past visit") || q.includes("old record") || q.includes("directory") || q.includes("patients")) {
      return isHindi
        ? "Registered marizon ka record aur history dekhne ke steps:\n\n"
          + "1. Sidebar se **'Patients'** me jayein: [Open Patients](/dashboard/patients).\n"
          + "2. Patient Name, Mobile Number ya PID se search karein.\n"
          + "3. Row me **'View Patient History'** button par click karein. Yeh mariz ka detailed history page (`/dashboard/patients/[id]`) open karega jahan pichle visits, reports aur payments available hain."
        : "To view patient records and visit history:\n\n"
          + "1. Go to [Open Patients](/dashboard/patients).\n"
          + "2. Search by Name, Mobile number, or PID.\n"
          + "3. Click **'View Patient History'** on the patient row to navigate to detailed history at `/dashboard/patients/[id]`.";
    }

    // 2.8 Today's Samples
    if (q.includes("today") || q.includes("aaj ke sample")) {
      return isHindi
        ? "Today's Samples check karne ke steps:\n\n"
          + "1. Sidebar se **'Today Samples'** par jayein: [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Aaj ke sabhi registered patients aur unke sample stages ka live overview check karein."
        : "To view Today's Samples in Receptionist portal:\n\n"
          + "1. Go to [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Review all patients registered today and their sample intake stages.";
    }

    // 2.9 Due Reports & Pending Collections
    if (q.includes("due") || q.includes("pending payment") || q.includes("baki") || q.includes("baaki") || q.includes("udhar")) {
      return isHindi
        ? "Pending Dues dekhne aur payment clear karne ke steps:\n\n"
          + "1. Sidebar se **Financial Analytics > Due Reports** me jayein: [Open Due Reports](/dashboard/billing/dues).\n"
          + "2. Patient Name, Mobile number ya PID se overdue bills search karein.\n"
          + "3. Row me **'Accept Payment'** par click karke cash ya UPI se balance payment collect karein aur due settlement receipt print karein."
        : "To view and manage pending dues in Receptionist portal:\n\n"
          + "1. Go to **Financial Analytics > Due Reports**: [Open Due Reports](/dashboard/billing/dues).\n"
          + "2. Search for pending invoices by Patient Name, Phone, or PID.\n"
          + "3. Click **'Accept Payment'** to collect remaining balance via cash/UPI and print settlement receipts.";
    }

    // 2.10 Billing Desk & Cash/UPI Collections
    if (q.includes("bill") || q.includes("payment") || q.includes("receipt") || q.includes("rasid") || q.includes("cash") || q.includes("upi")) {
      return isHindi
        ? "Billing Desk se payments collect karne aur receipt nikalne ke steps:\n\n"
          + "1. Sidebar se **'Billing'** me jayein: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Patient invoice summary aur pending balance check karein.\n"
          + "3. Cash ya UPI se payment receive karein aur thermal ya A4 format me receipt print karein."
        : "To manage Billing Desk and print receipts:\n\n"
          + "1. Go to **Dashboard > Billing**: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Review patient invoice amount, discounts, and outstanding balance.\n"
          + "3. Record cash or UPI payments and print thermal or A4 receipts.";
    }

    // 2.10 Reports Management & Final Report Print
    if (q.includes("report") || q.includes("download") || q.includes("pdf") || q.includes("final report")) {
      return isHindi
        ? "Reports dekhne aur print karne ke steps:\n\n"
          + "1. Sidebar se **'Reports'** me jayein: [Open Reports Management](/dashboard/reports).\n"
          + "2. Patient search karein. Jab status **'Approved'** ho jaye, to **'Print'** par click karein.\n"
          + "3. Ya phir direct [Open Track Samples](/dashboard/track-samples) se bhi patient search karke 1 click me report print kar sakte hain."
        : "To view and print patient reports:\n\n"
          + "1. Go to [Open Reports Management](/dashboard/reports).\n"
          + "2. Locate the patient. Once status shows **'Approved'**, click **'Print'**.\n"
          + "3. Alternatively, search in [Open Track Samples](/dashboard/track-samples) and click 'Print Report' directly.";
    }

    // 2.11 ABHA ID & ABDM Integration
    if (q.includes("abha") || q.includes("abdm") || q.includes("ayushman") || q.includes("health id") || q.includes("qr poster")) {
      return isHindi
        ? "ABHA ID QR Poster dikhane aur record link karne ke steps:\n\n"
          + "1. Top navbar me **'Create ABHA ID'** button dabayein – patient ke scan karne ke liye official QR poster open ho jayega.\n"
          + "2. Patient mobile se scan karke apna official 14-digit Ayushman Bharat Health Account (ABHA ID) bana sakte hain.\n"
          + "3. Patient Registration me **'Link via ABHA'** se Aadhaar OTP verify karke record link kar sakte hain."
        : "To use ABHA ID & ABDM in Receptionist portal:\n\n"
          + "1. In the top navbar, click **'Create ABHA ID'** to display the official QR poster for patient mobile scan.\n"
          + "2. Patients scan the QR code to create their 14-digit ABHA health account.\n"
          + "3. In Patient Registration, click **'Link via ABHA'** to verify with Aadhaar OTP.";
    }

    // 2.12 Support & Help
    if (q.includes("support") || q.includes("help") || q.includes("ticket") || q.includes("complaint") || q.includes("madad")) {
      return isHindi
        ? "Support ticket raise karne ke steps:\n\n"
          + "1. Sidebar se **'Help & Support'** me jayein: [Open Help & Support](/dashboard/support).\n"
          + "2. Ticket submit karein aur 'Ticket History' me resolution status check karein."
        : "To submit a technical support ticket:\n\n"
          + "1. Go to [Open Help & Support](/dashboard/support).\n"
          + "2. Submit a support ticket and monitor resolution updates in 'Ticket History'.";
    }

    // 2.13 Overview / Dashboard
    if (q.includes("overview") || q.includes("dashboard") || q.includes("home")) {
      return isHindi
        ? "Front Desk Overview Dashboard:\n\n"
          + "1. Sidebar se **'Overview'** par click karein: [Open Dashboard Overview](/dashboard).\n"
          + "2. Yahan aaj ke walk-in mariz, pending samples, aur daily desk summary dekh sakte hain."
        : "Front Desk Overview Dashboard:\n\n"
          + "1. Go to [Open Dashboard Overview](/dashboard).\n"
          + "2. Review today's front-desk intake metrics, pending samples, and desk summary.";
    }

    // 2.14 Default Receptionist fallback
    return isHindi
      ? "Main **OnePath Front Desk Receptionist Assistant** hoon! Main aapko in features me guide kar sakta hoon:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register) – Naye mariz register karna aur barcodes nikalna\n"
        + "- [Open Patients](/dashboard/patients) – Registered marizon ka record aur history (`/dashboard/patients/[id]`)\n"
        + "- [Open Today's Samples](/dashboard/today-samples) – Aaj ke booked samples ka status monitor karna\n"
        + "- [Open Track Samples](/dashboard/track-samples) – Sample ka 4-stage live progress track karna aur report print karna\n"
        + "- [Open Billing Desk](/dashboard/billing) – Cash/UPI payment lena aur receipts print karna\n"
        + "- [Open Reports Management](/dashboard/reports) – Approved test reports print karna\n"
        + "- **Create ABHA ID** – Top navbar se patient QR poster open karna\n"
        + "- [Open Help & Support](/dashboard/support) – Technical assistance lena\n\n"
        + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
      : "Welcome to the **OnePath Receptionist Assistant**! I can guide you through all Front Desk features:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register): Register patients and print vial barcodes\n"
        + "- [Open Patients](/dashboard/patients): Search registered patient directory and history (`/dashboard/patients/[id]`)\n"
        + "- [Open Today's Samples](/dashboard/today-samples): Monitor today's sample queue\n"
        + "- [Open Track Samples](/dashboard/track-samples): Track 4-stage progress and print approved reports\n"
        + "- [Open Billing Desk](/dashboard/billing): Collect cash/UPI payments and print receipts\n"
        + "- [Open Reports Management](/dashboard/reports): View & print verified diagnostic reports\n"
        + "- **Create ABHA ID**: Open QR poster from the top navbar\n"
        + "- [Open Help & Support](/dashboard/support): Submit support tickets.";
  }

  // ==========================================================================
  // ROLE 3: B2B PARTNER PORTAL
  // Authorized Routes:
  // - Overview: /dashboard
  // - Patients: /dashboard/patients (Register: /dashboard/patients/register, History: /dashboard/patients/[id])
  // - Today Samples: /dashboard/today-samples (monitor dispatched specimens)
  // - Reports: /dashboard/reports (download approved reports, wallet balance lock)
  // - Wallet & Payments: /dashboard/wallet (PayU recharge, balance, transaction ledger/audit passbook)
  // - Finance & Rates:
  //    - Billing: /dashboard/billing
  //    - Revenue & Ledger: /dashboard/revenue
  //    - Rate List: /dashboard/ratelist (contracted rates)
  // - Support: /dashboard/support
  //
  // Strictly Blocked / Out-of-Scope:
  // - Due Reports (/dashboard/billing/dues) -> Removed from B2B sidebar (B2B works on prepaid wallet)
  // - Monthly Business Report (/dashboard/billing/monthly-expenses) -> Removed from B2B sidebar
  // - Cases (/dashboard/cases, /dashboard/doctors) -> Admin only
  // - Settings (/dashboard/settings) -> Admin only
  // - Test Catalog Master editing (/dashboard/tests) -> Admin only (B2B views rates at /dashboard/ratelist)
  // - Result Entry (/dashboard/reports/[id]/edit) -> Central Lab / Pathologist only
  // - Doctor Digital Signatures & Approvals -> Central Lab / Pathologist only
  // - Inventory & Smart Report AI -> Admin only
  // ==========================================================================
  if (normalizedRole === "B2B") {
    // 3.1 Out of Scope: Due Reports (Removed from B2B)
    if (q.includes("due report") || (q.includes("dues") && !q.includes("wallet") && !q.includes("lock"))) {
      return isHindi
        ? "Due Reports option B2B Partner portal me uplabdh nahi hai. B2B accounts prepaid wallet model par kaam karte hain jahan har booking wallet balance se deduct hoti hai.\n\nApna live balance check karne aur balance recharge karne ke liye: [Open B2B Wallet](/dashboard/wallet) me jayein. Daily revenue aur deduction ledger ke liye: [Open Revenue & Ledger](/dashboard/revenue) me jayein."
        : "Due Reports are not applicable to B2B Partner portals. B2B accounts operate on a prepaid wallet model where patient bookings are settled against your wallet balance.\n\nTo check your balance and recharge online, go to [Open B2B Wallet](/dashboard/wallet). For sample deduction statements, visit [Open Revenue & Ledger](/dashboard/revenue).";
    }

    // 3.2 Out of Scope: Monthly Business Report / Expenses Register (Removed from B2B)
    if (q.includes("monthly business") || q.includes("monthly expense") || q.includes("kharcha") || q.includes("overhead")) {
      return isHindi
        ? "Monthly Business Expense register B2B Partner portal ke menu me uplabdh nahi hai. Central lab ke operational expenses sirf Lab Admin manage karte hain.\n\nAap apna B2B financial summary aur sales ledger dekhne ke liye: [Open Revenue & Ledger](/dashboard/revenue) par jayein."
        : "The Monthly Business Expense register is not part of the B2B Partner portal. Laboratory overheads are managed strictly by the Central Lab Administrator.\n\nTo review your B2B sales revenue, partner deductions, and passbook transactions, navigate to [Open Revenue & Ledger](/dashboard/revenue).";
    }

    // 3.3 Out of Scope: Result entry, doctor signs, report approvals, formulas
    if (
      q.includes("result") || q.includes("parinam") || q.includes("enter result") ||
      q.includes("doctor sign") || q.includes("signature") || q.includes("approve report") ||
      q.includes("ai suggestion") || q.includes("formula")
    ) {
      return isHindi
        ? "Yeh feature B2B Partner portal ke scope me nahi hai. Test result entry, clinical remarks, doctor digital signatures aur report approval Central Laboratory / Pathologist dwara manage kiye jaate hain.\n\nB2B portal me aap:\n1. **[Patient Registration](/dashboard/patients/register)** – Contracted B2B rate par referral patient book karna\n2. **[Today's Samples](/dashboard/today-samples)** – Bheje gaye samples track karna\n3. **[Reports](/dashboard/reports)** – Approved reports vector PDF download karna\n4. **[B2B Wallet](/dashboard/wallet)** – Prepaid wallet balance recharge karna\n5. **[Rate List](/dashboard/ratelist)** – Apne contracted rates dekhna\nkar sakte hain."
        : "This feature is not part of the B2B Partner portal. Entering test results, doctor signatures, clinical AI remarks, and approving reports are managed exclusively by the Central Laboratory / Pathologists.\n\nIn the B2B portal, you can:\n1. Book referral patients at B2B rates in [Open Patient Registration](/dashboard/patients/register)\n2. Monitor dispatched specimens in [Open Today's Samples](/dashboard/today-samples)\n3. Download finalized reports in [Open Reports Management](/dashboard/reports)\n4. Check balance & recharge in [Open B2B Wallet](/dashboard/wallet)\n5. Review contracted pricing in [Open Rate List](/dashboard/ratelist).";
    }

    // 3.4 Out of Scope: Settings, Letterhead, Layouts, RBAC, Payment Gateways, Machines, Inventory, Catalog, Cases
    if (
      q.includes("setting") || q.includes("letterhead") || q.includes("rbac") ||
      q.includes("machine") || q.includes("analyzer") || q.includes("inventory") ||
      q.includes("test master") || q.includes("add test") || q.includes("cases") ||
      q.includes("outsource") || q.includes("smart report")
    ) {
      return isHindi
        ? "Yeh feature B2B Partner portal me uplabdh nahi hai. Central lab settings (Letterhead, Layouts, RBAC, Machine Bridges), Test Master editing, Inventory, aur Cases strictly Central Lab Administrator dwara manage kiye jaate hain.\n\nAgar aapko agreed test prices dekhne hain, to aap **[Rate List](/dashboard/ratelist)** me check kar sakte hain."
        : "This feature is not available in the B2B Partner portal. Central laboratory settings (Letterhead, Layouts, RBAC, Machine Interfacing), Test Catalog editing, Inventory, and Clinical Cases are managed exclusively by the Central Laboratory.\n\nTo review your agreed test pricing, you can access [Open Rate List](/dashboard/ratelist).";
    }

    // 3.5 Step-by-Step Page & Tab Navigation Guidance
    if (isNavigationOrSwitchQuery(q)) {
      return isHindi
        ? "B2B Partner portal me pages aur tabs switch karne ke steps:\n\n"
          + "1. **Overview** (`/dashboard`): [Open Dashboard Overview](/dashboard) – Booking count, live wallet balance, aur dispatch status.\n"
          + "2. **Patients** (`/dashboard/patients`): [Open Patients](/dashboard/patients) – Referral marizon ki directory. Mariz ki past visits aur reports dekhne ke liye 'View Patient History' par click karein (`/dashboard/patients/[id]`). Contracted rates par naya referral patient book karne ke liye: [Open Patient Registration](/dashboard/patients/register).\n"
          + "3. **Today Samples** (`/dashboard/today-samples`): [Open Today's Samples](/dashboard/today-samples) – Central lab bheje gaye samples ka intake status monitor karein.\n"
          + "4. **Reports** (`/dashboard/reports`): [Open Reports Management](/dashboard/reports) – Approved test reports vector PDF download karein. (Agar wallet balance negative ho, to [Open B2B Wallet](/dashboard/wallet) se recharge karke unlock karein).\n"
          + "5. **Wallet & Payments** (`/dashboard/wallet`): [Open B2B Wallet](/dashboard/wallet) – Prepaid balance dekhein, PayU/UPI se instant recharge karein, aur audit passbook check karein.\n"
          + "6. **Finance & Rates** (Sidebar accordion se sub-tabs switch karein):\n"
          + "   - **Billing**: [Open Billing Desk](/dashboard/billing) – Referral patients ke generated bills check karein.\n"
          + "   - **Revenue & Ledger**: [Open Revenue & Ledger](/dashboard/revenue) – Daily sales revenue aur sample-wise wallet deduction ledger dekhein.\n"
          + "   - **Rate List**: [Open Rate List](/dashboard/ratelist) – Apne contracted test prices aur packages check karein.\n"
          + "7. **Support**: [Open Help & Support](/dashboard/support) – Technical assistance ticket raise karein.\n\n"
          + "*Note: Due Reports aur Monthly Business Report B2B portal se removed hain kyunki B2B accounts prepaid wallet model par run hote hain.*"
        : "Step-by-step page and navigation guide for B2B Partner portal:\n\n"
          + "1. **Overview**: Go to [Open Dashboard Overview](/dashboard) for partner metrics and live wallet balance.\n"
          + "2. **Patients**: Go to [Open Patients](/dashboard/patients) to review patients and visit history at `/dashboard/patients/[id]`. Click '+ Add Patient' to book at contracted rates at [Open Patient Registration](/dashboard/patients/register).\n"
          + "3. **Today Samples**: Go to [Open Today's Samples](/dashboard/today-samples) to track specimens dispatched to the main lab.\n"
          + "4. **Reports**: Go to [Open Reports Management](/dashboard/reports) to download verified PDF reports.\n"
          + "5. **Wallet & Payments**: Go to [Open B2B Wallet](/dashboard/wallet) for instant PayU/UPI recharge and audit passbook.\n"
          + "6. **Finance & Rates** (expandable menu):\n"
          + "   - **Billing**: [Open Billing Desk](/dashboard/billing) to view patient invoices.\n"
          + "   - **Revenue & Ledger**: [Open Revenue & Ledger](/dashboard/revenue) for revenue and deductions.\n"
          + "   - **Rate List**: [Open Rate List](/dashboard/ratelist) to inspect your contracted pricing.\n"
          + "7. **Support**: Go to [Open Help & Support](/dashboard/support) for technical assistance.\n\n"
          + "*Note: Dues and Monthly Business Report are removed from the B2B sidebar as B2B accounts operate on a prepaid wallet.*";
    }

    // 3.6 Wallet Balance Report Lock Policy & How to Unlock
    if (
      q.includes("lock") || q.includes("unpaid") || q.includes("negative") ||
      q.includes("locked") || q.includes("kyu nahi khul rahi") || q.includes("download nahi")
    ) {
      return isHindi
        ? "Report Lock hone ka karan aur solution:\n\n"
          + "OnePath LIS me B2B policy ke mutabik jab aapka wallet balance negative ya unpaid hota hai, to final reports par **'Locked due to unpaid balance'** lag jata hai aur PDF download ruk jata hai.\n\n"
          + "**Solution (Unlock Kaise Karein)**:\n"
          + "1. Direct jayein: [Open B2B Wallet](/dashboard/wallet).\n"
          + "2. PayU ya UPI se wallet recharge karein.\n"
          + "3. Recharge confirm hote hi sabhi approved reports instantly unlock ho jayengi aur aap unhe download kar sakenge!"
        : "Why report downloads are locked and how to unlock:\n\n"
          + "In accordance with B2B policy, if your prepaid wallet balance falls into the negative or has pending dues, report downloads are locked with 'Locked due to unpaid balance'.\n\n"
          + "**Solution to Unlock**:\n"
          + "1. Navigate directly to [Open B2B Wallet](/dashboard/wallet).\n"
          + "2. Complete a quick online recharge via PayU or UPI.\n"
          + "3. Once payment is confirmed, all reports unlock automatically for instant PDF download!";
    }

    // 3.7 B2B Prepaid Wallet & Online Recharge
    if (q.includes("wallet") || q.includes("recharge") || q.includes("balance") || q.includes("payu") || q.includes("top up")) {
      return isHindi
        ? "B2B Wallet recharge karne ke steps:\n\n"
          + "1. Sidebar se **'Wallet & Payments'** me jayein: [Open B2B Wallet](/dashboard/wallet).\n"
          + "2. Yahan aapka live prepaid balance aur transaction passbook dikhegi.\n"
          + "3. **'Recharge Wallet'** par click karein aur quick chip (₹500, ₹1000, ₹2000, ₹5000) chunein ya custom amount enter karein.\n"
          + "4. PayU ya UPI se secure online payment complete karein. Payment hote hi balance turant update ho jayega!"
        : "To recharge your B2B prepaid wallet:\n\n"
          + "1. Go to **Dashboard > Wallet & Payments**: [Open B2B Wallet](/dashboard/wallet).\n"
          + "2. Review your current balance and transaction passbook.\n"
          + "3. Click **'Recharge Wallet'** and select a quick chip (₹500, ₹1000, ₹2000, ₹5000) or enter a custom amount.\n"
          + "4. Complete online payment via PayU or UPI. Your balance reflects immediately!";
    }

    // 3.8 B2B Patient Booking (Contracted Rates)
    if (
      q.includes("patient") || q.includes("mariz") || q.includes("mareez") ||
      q.includes("booking") || q.includes("register") || q.includes("add patient")
    ) {
      return isHindi
        ? "B2B Patient booking ke steps:\n\n"
          + "1. Sidebar se **'+ Add Patient'** dabayein ya jayein: [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Patient demographics bharein (Name, Age, Gender, Mobile Number).\n"
          + "3. Prescribed Tests ya Packages select karein. B2B portal me rates automatically contracted discount par calculate hote hain.\n"
          + "4. Save karke vial barcode stickers print karein aur sample central lab dispatch karein."
        : "To book a referral patient under contracted B2B rates:\n\n"
          + "1. Click **'+ Add Patient'** or go to [Open Patient Registration](/dashboard/patients/register).\n"
          + "2. Enter patient demographics (Name, Age, Gender, Phone).\n"
          + "3. Select prescribed tests or packages. Contracted B2B rates apply automatically.\n"
          + "4. Save to generate barcode stickers and dispatch specimen to the central laboratory.";
    }

    // 3.9 Patients Directory & History (/dashboard/patients/[id])
    if (q.includes("patient list") || q.includes("directory") || q.includes("patient history") || q.includes("past visit")) {
      return isHindi
        ? "B2B registered marizon ki list aur history dekhne ke steps:\n\n"
          + "1. Sidebar se **'Patients'** me jayein: [Open Patients](/dashboard/patients).\n"
          + "2. Patient Name, Phone ya PID se search karein.\n"
          + "3. Row me **'View Patient History'** par click karke mariz ke sabhi past visits aur reports check karein (`/dashboard/patients/[id]`)."
        : "To view your referral patient directory:\n\n"
          + "1. Go to [Open Patients](/dashboard/patients).\n"
          + "2. Search by Name, Mobile number, or PID.\n"
          + "3. Click **'View Patient History'** to inspect all visit records and past reports at `/dashboard/patients/[id]`.";
    }

    // 3.10 Today's Samples (Dispatched Specimens)
    if (q.includes("today") || q.includes("today sample") || q.includes("aaj ke sample") || q.includes("dispatch")) {
      return isHindi
        ? "Dispatched samples track karne ke steps:\n\n"
          + "1. Sidebar se **'Today Samples'** me jayein: [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Aaj central lab bheje gaye sabhi samples ka intake status monitor karein."
        : "To track dispatched samples:\n\n"
          + "1. Go to [Open Today's Samples](/dashboard/today-samples).\n"
          + "2. Monitor all specimens dispatched today to the central laboratory.";
    }

    // 3.11 Reports Management & PDF Download
    if (q.includes("report") || q.includes("download") || q.includes("pdf") || q.includes("print")) {
      return isHindi
        ? "Final approved reports download karne ke steps:\n\n"
          + "1. Sidebar se **'Reports'** me jayein: [Open Reports Management](/dashboard/reports).\n"
          + "2. Jab report status **'Approved'** dikhe, to row me **'PDF'** ya **'Print'** par click karein.\n"
          + "3. Clear vector PDF report download ho jayegi.\n\n"
          + "*Dhyan dein: Agar wallet balance negative ho, to [Open B2B Wallet](/dashboard/wallet) se recharge karke report unlock karein.*"
        : "To download finalized reports in B2B portal:\n\n"
          + "1. Go to [Open Reports Management](/dashboard/reports).\n"
          + "2. Locate the patient. Once status shows **'Approved'**, click **'PDF'** or **'Print'**.\n"
          + "3. Download the official clinical vector PDF report.\n\n"
          + "*Note: If report is locked, recharge your wallet at [Open B2B Wallet](/dashboard/wallet) to unlock.*";
    }

    // 3.12 Finance & Rates: Rate List (Contracted Rates)
    if (q.includes("rate") || q.includes("ratelist") || q.includes("rate list") || q.includes("price") || q.includes("contract")) {
      return isHindi
        ? "Contracted B2B Rate List dekhne ke steps:\n\n"
          + "1. Sidebar me **Finance & Rates > Rate List** par jayein: [Open Rate List](/dashboard/ratelist).\n"
          + "2. Yahan aapke B2B agreement ke mutabik sabhi tests aur combo health packages ke agreed rates dikhenge."
        : "To view your contracted B2B rate list:\n\n"
          + "1. Go to **Finance & Rates > Rate List**: [Open Rate List](/dashboard/ratelist).\n"
          + "2. Review agreed contracted prices for all lab tests and combo packages.";
    }

    // 3.13 Finance & Rates: Revenue & Ledger
    if (q.includes("revenue") || q.includes("ledger") || q.includes("audit") || q.includes("passbook") || q.includes("statement")) {
      return isHindi
        ? "Revenue & Ledger dekhne ke steps:\n\n"
          + "1. Sidebar me **Finance & Rates > Revenue & Ledger** par jayein: [Open Revenue & Ledger](/dashboard/revenue).\n"
          + "2. Daily sales revenue, patient-wise bill deductions, aur wallet ledger breakdown check karein."
        : "To view Revenue & Ledger statements:\n\n"
          + "1. Go to **Finance & Rates > Revenue & Ledger**: [Open Revenue & Ledger](/dashboard/revenue).\n"
          + "2. Review daily revenue, sample deductions, wallet debits, and patient-wise ledger entries.";
    }

    // 3.14 Finance & Rates: Billing Desk
    if (q.includes("bill") || q.includes("billing") || q.includes("payment") || q.includes("receipt") || q.includes("rasid")) {
      return isHindi
        ? "B2B Billing dekhne ke steps:\n\n"
          + "1. Sidebar me **Finance & Rates > Billing** me jayein: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Apne referral patients ke generated invoices aur payment receipts check karein."
        : "To view B2B Billing invoices:\n\n"
          + "1. Go to **Finance & Rates > Billing**: [Open Billing Desk](/dashboard/billing).\n"
          + "2. Review generated invoices and payment receipts for your referral patients.";
    }

    // 3.15 Support & Help
    if (q.includes("support") || q.includes("help") || q.includes("ticket") || q.includes("complaint") || q.includes("madad")) {
      return isHindi
        ? "Support ticket submit karne ke steps:\n\n"
          + "1. Sidebar se **'Help & Support'** me jayein: [Open Help & Support](/dashboard/support).\n"
          + "2. Apni query ya issue submit karein aur resolution updates track karein."
        : "To contact technical support:\n\n"
          + "1. Go to [Open Help & Support](/dashboard/support).\n"
          + "2. Submit a support ticket and track resolution progress in 'Ticket History'.";
    }

    // 3.16 Overview / Dashboard
    if (q.includes("overview") || q.includes("dashboard") || q.includes("home")) {
      return isHindi
        ? "B2B Partner Overview Dashboard:\n\n"
          + "1. Sidebar se **'Overview'** par click karein: [Open Dashboard Overview](/dashboard).\n"
          + "2. Yahan aaj ke total bookings, live wallet balance, aur sample dispatch status check karein."
        : "B2B Partner Overview Dashboard:\n\n"
          + "1. Go to [Open Dashboard Overview](/dashboard).\n"
          + "2. Review today's bookings, live wallet balance, and dispatched sample stages.";
    }

    // 3.17 Default B2B fallback
    return isHindi
      ? "Main **OnePath B2B Partner Assistant** hoon! Main aapko in features me guide kar sakta hoon:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register) – B2B rate par referral patient book karna\n"
        + "- [Open Patients](/dashboard/patients) – Referral marizon ka record aur history (`/dashboard/patients/[id]`)\n"
        + "- [Open B2B Wallet](/dashboard/wallet) – Prepaid wallet balance dekhna aur online recharge karna\n"
        + "- [Open Today's Samples](/dashboard/today-samples) – Dispatched samples track karna\n"
        + "- [Open Reports Management](/dashboard/reports) – Approved test reports download karna\n"
        + "- [Open Rate List](/dashboard/ratelist) – Contracted rate list check karna\n"
        + "- [Open Revenue & Ledger](/dashboard/revenue) – Daily revenue aur deduction ledger dekhna\n"
        + "- [Open Billing Desk](/dashboard/billing) – B2B bills dekhna\n"
        + "- [Open Help & Support](/dashboard/support) – Technical assistance lena\n\n"
        + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
      : "Welcome to the **OnePath B2B Partner Assistant**! I can guide you through all B2B features:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register): Book referral patients at contracted B2B rates\n"
        + "- [Open Patients](/dashboard/patients): Review patients and visit history (`/dashboard/patients/[id]`)\n"
        + "- [Open B2B Wallet](/dashboard/wallet): Check balance and recharge via PayU or UPI\n"
        + "- [Open Today's Samples](/dashboard/today-samples): Monitor dispatched specimens\n"
        + "- [Open Reports Management](/dashboard/reports): Download approved test reports\n"
        + "- [Open Rate List](/dashboard/ratelist): Check contracted B2B test prices\n"
        + "- [Open Revenue & Ledger](/dashboard/revenue): Review sales revenue & transaction ledger\n"
        + "- [Open Billing Desk](/dashboard/billing): View B2B invoices\n"
        + "- [Open Help & Support](/dashboard/support): Submit support tickets.";
  }

  // ==========================================================================
  // ROLE 4: ADMIN / PATHOLOGIST / SUPER_ADMIN PORTAL
  // Comprehensive guide covering all 17 clinical, financial, diagnostic,
  // operational, and administrative modules.
  // ==========================================================================

  // 4.0 Step-by-Step Page & Settings Tab Navigation Guidance (Admin)
  if (isNavigationOrSwitchQuery(q)) {
    return isHindi
      ? "Admin portal me pages aur settings tabs switch karne ke steps:\n\n"
        + "A. **Main Sidebar Modules Switch Karna**:\n"
        + "1. **Overview**: [Open Dashboard Overview](/dashboard) – Lab operations summary, live revenue, aur turnaround time (TAT).\n"
        + "2. **Patients**: [Open Patients](/dashboard/patients) – Patient records search karein aur visit history dekhein (`/dashboard/patients/[id]`). Naya mariz book karne ke liye: [Open Patient Registration](/dashboard/patients/register).\n"
        + "3. **Reports**: [Open Reports Management](/dashboard/reports) – Reports review karein. Result entry ke liye row me 'Enter Result' (Edit) dabayein jo direct `/dashboard/reports/[id]/edit` open karega. Bulk print ke liye: [Open Batch Print](/dashboard/reports/batch-print).\n"
        + "4. **Financial Analytics** (Accordion toggle karein):\n"
        + "   - **Due Reports**: [Open Due Reports](/dashboard/billing/dues) – Pending dues collection aur due settlement.\n"
        + "   - **Billing**: [Open Billing Desk](/dashboard/billing) – Sabhi bills review aur thermal/A4 print karein.\n"
        + "   - **Monthly Business Report**: [Open Monthly Expenses](/dashboard/billing/monthly-expenses) – Reagents/salaries overheads aur net P&L track karein.\n"
        + "5. **Cases**: [Open Cases](/dashboard/cases) – Referring doctors directory ([Open View Referral](/dashboard/doctors)), commission manage ([Open Referral Manage](/dashboard/doctors/manage)), doctor online portal ([Open Doctor Portal](/dashboard/doctors/portal)), aur outsource lab tracking ([Open Outsourced Cases](/dashboard/cases/outsource)).\n"
        + "6. **B2B & Centers**: [Open Collection Centers](/dashboard/collection-centers) – Partner sales analytics ([Open B2B Sales](/dashboard/b2b)), partner wallets ([Open B2B Wallets](/dashboard/b2b/wallets)), aur center logins ([Open RBAC Settings](/dashboard/settings?tab=collection-centers)).\n"
        + "7. **Tests Catalog & Master**: [Open Test Master](/dashboard/tests) – 500+ tests, rates, reference ranges; Worksheet ([Open Worksheet](/dashboard/tests/worksheet)), Packages ([Open Health Packages](/dashboard/tests/packages)), Workload ([Open Tests Count](/dashboard/tests/count)), aur Rate List ([Open Rate List](/dashboard/ratelist)).\n"
        + "8. **Inventory**: [Open View Inventory](/dashboard/inventory) – Reagents stock aur 30-day expiry alerts; stock intake ke liye: [Open Manage Inventory](/dashboard/inventory/manage).\n"
        + "9. **Smart Report AI**: [Open AI Smart Reports](/dashboard/smart-report) – 4-page visual organ wellness dossier.\n"
        + "10. **Refer & Earn**: [Open Refer & Earn](/dashboard/referral) – Labs invite karein aur subscription discounts payein.\n"
        + "11. **Support**: [Open Help & Support](/dashboard/support) – Priority technical assistance.\n\n"
        + "B. **Settings Hub Sub-Tabs Switch Karna** (`/dashboard/settings`):\n"
        + "- **Letterhead Tab**: [Open Letterhead Settings](/dashboard/settings?tab=letterhead) – Image upload & margins\n"
        + "- **Report Layout Tab**: [Open Report Layout Settings](/dashboard/settings?tab=report-layout) – 1-Test-Per-Page & doctor signatures\n"
        + "- **Bills Layout Tab**: [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout) – Receipt height & GSTIN\n"
        + "- **RBAC Tab**: [Open RBAC Settings](/dashboard/settings?tab=collection-centers) (ya `?tab=rbac`) – Staff accounts & permissions\n"
        + "- **Payment Gateway Tab**: [Open Payment Gateway Settings](/dashboard/settings?tab=payment-gateway) – PayU credentials\n"
        + "- **Machine Interfacing Tab**: [Open Machine Integration](/dashboard/settings?tab=machine-integration) – ASTM/HL7 analyzer bridge"
      : "Step-by-step page and tab switching guide for Laboratory Administrator:\n\n"
        + "A. **Main Sidebar Modules**:\n"
        + "1. **Overview**: Go to [Open Dashboard Overview](/dashboard) for executive metrics.\n"
        + "2. **Patients**: Go to [Open Patients](/dashboard/patients) (Register: [Open Patient Registration](/dashboard/patients/register), History: `/dashboard/patients/[id]`).\n"
        + "3. **Reports**: Go to [Open Reports Management](/dashboard/reports) (Result Entry: `/dashboard/reports/[id]/edit`, Batch Print: [Open Batch Print](/dashboard/reports/batch-print)).\n"
        + "4. **Financial Analytics**:\n"
        + "   - **Due Reports**: [Open Due Reports](/dashboard/billing/dues)\n"
        + "   - **Billing**: [Open Billing Desk](/dashboard/billing)\n"
        + "   - **Monthly Business Report**: [Open Monthly Expenses](/dashboard/billing/monthly-expenses)\n"
        + "5. **Cases**: Go to [Open Cases](/dashboard/cases) (Referral doctors: [Open View Referral](/dashboard/doctors), Commissions: [Open Referral Manage](/dashboard/doctors/manage), Doctor Portal: [Open Doctor Portal](/dashboard/doctors/portal), Outsource: [Open Outsourced Cases](/dashboard/cases/outsource)).\n"
        + "6. **B2B & Centers**: Go to [Open Collection Centers](/dashboard/collection-centers) (Sales: [Open B2B Sales](/dashboard/b2b), Wallets: [Open B2B Wallets](/dashboard/b2b/wallets)).\n"
        + "7. **Tests Catalog & Master**: Go to [Open Test Master](/dashboard/tests) (Worksheet: [Open Worksheet](/dashboard/tests/worksheet), Packages: [Open Health Packages](/dashboard/tests/packages), Count: [Open Tests Count](/dashboard/tests/count), Rate List: [Open Rate List](/dashboard/ratelist)).\n"
        + "8. **Inventory**: Go to [Open View Inventory](/dashboard/inventory) and [Open Manage Inventory](/dashboard/inventory/manage).\n"
        + "9. **Smart Report AI**: Go to [Open AI Smart Reports](/dashboard/smart-report).\n"
        + "10. **Refer & Earn**: Go to [Open Refer & Earn](/dashboard/referral).\n"
        + "11. **Support**: Go to [Open Help & Support](/dashboard/support).\n\n"
        + "B. **Settings Hub Sub-Tabs** (`/dashboard/settings`):\n"
        + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Letterhead upload & margins\n"
        + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout): 1-Test-Per-Page separation & doctor signatures\n"
        + "- [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout): Invoice layout, GSTIN & terms\n"
        + "- [Open RBAC Settings](/dashboard/settings?tab=collection-centers): Staff accounts & permissions\n"
        + "- [Open Payment Gateway Settings](/dashboard/settings?tab=payment-gateway): PayU merchant credentials\n"
        + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): ASTM/HL7 analyzer bridge.";
  }

  // 4.1 Specific Settings Sub-Tabs
  // 4.1.1 Letterhead Settings
  if (
    q.includes("letterhead") || q.includes("header margin") || q.includes("footer margin") ||
    q.includes("pad") || q.includes("plain paper")
  ) {
    return isHindi
      ? "Letterhead upload aur print margins set karne ke steps:\n\n"
        + "1. Sidebar se **Settings > Letterhead** par jayein: [Open Letterhead Settings](/dashboard/settings?tab=letterhead).\n"
        + "2. Apni high-resolution Letterhead image (JPEG ya PNG) upload karein.\n"
        + "3. Sliders se **Header Margin** aur **Footer Margin** adjust karein taaki text pre-printed paper par overlap na ho.\n"
        + "4. Right side me live A4 preview dekhein aur **'Save Letterhead Settings'** dabayein.\n"
        + "5. Print dialog me plain paper ke liye 'Print with Header & Footer' tick rakhein, ya printed pad ke liye uncheck karein."
      : "To configure letterhead and print margins:\n\n"
        + "1. Go to **Dashboard > Settings > Letterhead**: [Open Letterhead Settings](/dashboard/settings?tab=letterhead).\n"
        + "2. Upload your high-resolution Letterhead image (JPEG/PNG).\n"
        + "3. Use the visual sliders to adjust **Header Margin** and **Footer Margin**.\n"
        + "4. Check the live A4 preview on the right and click **'Save Letterhead Settings'**.\n"
        + "5. In print dialogs, check 'Print with Header & Footer' for plain paper or uncheck it for pre-printed stationery.";
  }

  // 4.1.2 Report Layout & 1-Test-Per-Page & Doctor Signatures
  if (
    q.includes("report layout") || q.includes("1 test per page") || q.includes("single page") ||
    q.includes("multi page") || q.includes("test separation") || q.includes("doctor sign") ||
    q.includes("signature") || q.includes("sign") || q.includes("font size")
  ) {
    return isHindi
      ? "Report Layout, 1 Test Per Page aur Doctor Signatures set karne ke steps:\n\n"
        + "1. Sidebar se **Settings > Report Layout** par jayein: [Open Report Layout Settings](/dashboard/settings?tab=report-layout).\n"
        + "2. **1 Test Per Page**: Section 2 me **'Multi-Page Test Separation (1 Test Per Page)'** option ko tick karein. Isse har test (CBC, LFT, KFT) naye page par shuru hoga.\n"
        + "3. **Doctor Digital Signatures**: Doctor photo/signature upload karein aur background transparency threshold slider adjust karein.\n"
        + "4. **Font & Design**: Typography font, size, aur department header order customize karein.\n"
        + "5. **'Save Report Layout'** par click karein."
      : "To configure Report Layout, 1 Test Per Page, and Doctor Signatures:\n\n"
        + "1. Go to **Dashboard > Settings > Report Layout**: [Open Report Layout Settings](/dashboard/settings?tab=report-layout).\n"
        + "2. **Multi-Page Test Separation**: Enable the **'Multi-Page Test Separation (1 Test Per Page)'** checkbox so each test (CBC, LFT, KFT) starts cleanly on its own page.\n"
        + "3. **Doctor Digital Signatures**: Upload signature PNG/JPEG and adjust the background transparency threshold slider.\n"
        + "4. **Typography & Structure**: Select report fonts, font sizing, and department display order.\n"
        + "5. Click **'Save Report Layout'** to commit changes.";
  }

  // 4.1.3 Bills Layout Settings
  if (
    q.includes("bill layout") || q.includes("bills layout") || q.includes("bill setting") ||
    q.includes("invoice layout") || q.includes("receipt layout") || q.includes("thermal") ||
    q.includes("gstin")
  ) {
    return isHindi
      ? "Bills Layout aur Invoice Settings configure karne ke steps:\n\n"
        + "1. Sidebar se **Settings > Bills Layout** par jayein: [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout).\n"
        + "2. Header Height aur Footer Height adjust karein (Thermal POS 80mm vs A4 format).\n"
        + "3. Toggles se decide karein: Show Barcode, Show Payment Breakdown, Show Referral Doctor, Show Cashier Signature.\n"
        + "4. Lab ka GSTIN number aur Invoice Terms & Conditions daalein.\n"
        + "5. Right side me live receipt preview dekhein aur **'Save Bill Settings'** dabayein."
      : "To configure Bills Layout and Invoice Settings:\n\n"
        + "1. Go to **Dashboard > Settings > Bills Layout**: [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout).\n"
        + "2. Adjust header and footer heights for Thermal POS (80mm) or A4 paper.\n"
        + "3. Toggle invoice fields: Show Barcode, Show Payment Breakdown, Show Referral Doctor, Show Cashier Signature.\n"
        + "4. Set laboratory GSTIN number and invoice Terms & Conditions.\n"
        + "5. Review the live bill preview and click **'Save Bill Settings'**.";
  }

  // 4.1.4 RBAC & Staff Terminals / Collection Centers Tab
  if (
    q.includes("rbac") || q.includes("staff login") || q.includes("staff permission") ||
    q.includes("terminal") || q.includes("role permission") || q.includes("operator") ||
    q.includes("collection center") || q.includes("add center")
  ) {
    return isHindi
      ? "RBAC, Staff Terminals aur Collection Centers configure karne ke steps:\n\n"
        + "1. Sidebar se **Settings > RBAC & Collection Centers** tab par jayein: [Open RBAC Settings](/dashboard/settings?tab=collection-centers) (ya direct `/dashboard/settings?tab=rbac`).\n"
        + "2. **Staff Terminals Create Karein**: Receptionist, Collection Center, B2B Partner, Phlebotomist, ya Technician ke liye login credentials banayein.\n"
        + "3. **Granular Module Permissions**: Toggle switches se decide karein ki kon sa staff member Patient Register kar sakta hai, Billing manage kar sakta hai, ya Result Entry kar sakta hai.\n"
        + "4. **Collection Center Commission**: Center code aur commission % set karein."
      : "To configure RBAC, Staff Terminals, and Collection Centers:\n\n"
        + "1. Go to **Dashboard > Settings > RBAC**: [Open RBAC Settings](/dashboard/settings?tab=collection-centers) (or direct `/dashboard/settings?tab=rbac`).\n"
        + "2. **Create Staff Accounts**: Establish dedicated logins for Receptionists, Collection Centers, B2B Partners, Phlebotomists, and Technicians.\n"
        + "3. **Granular Module Permissions**: Toggle switches for Patient Booking, Billing, Barcodes, Result Entry, and Settings independently.\n"
        + "4. **Center Commission**: Set center code and commission percentages.";
  }

  // 4.1.5 Payment Gateway Settings (PayU)
  if (
    q.includes("payment gateway") || q.includes("payu") || q.includes("merchant key") ||
    q.includes("gateway") || q.includes("salt")
  ) {
    return isHindi
      ? "PayU Payment Gateway integrate karne ke steps:\n\n"
        + "1. Sidebar se **Settings > Payment Gateway** par jayein: [Open Payment Gateway Settings](/dashboard/settings?tab=payment-gateway).\n"
        + "2. Apna PayU Merchant Key aur Merchant Salt enter karein.\n"
        + "3. Test Mode / Production Mode toggle karein aur **'Save Gateway Settings'** dabayein.\n"
        + "4. Save hote hi patient UPI payment link aur B2B online wallet recharge active ho jayega!"
      : "To configure PayU Payment Gateway:\n\n"
        + "1. Go to **Dashboard > Settings > Payment Gateway**: [Open Payment Gateway Settings](/dashboard/settings?tab=payment-gateway).\n"
        + "2. Enter your PayU Merchant Key and Merchant Salt.\n"
        + "3. Toggle Test / Production environment and click **'Save Gateway Settings'**.\n"
        + "4. Online patient UPI payments and B2B wallet instant recharges will activate immediately.";
  }

  // 4.1.6 Analyzer Machine Bridge (ASTM / HL7)
  if (
    q.includes("machine") || q.includes("analyzer") || q.includes("cell counter") ||
    q.includes("sysmex") || q.includes("mindray") || q.includes("erba") ||
    q.includes("astm") || q.includes("hl7") || q.includes("bridge")
  ) {
    return isHindi
      ? "Automated Cell Counter ya Biochemistry Analyzer connect karne ke steps:\n\n"
        + "1. Sidebar se **Settings > Machine Integration** me jayein: [Open Machine Integration](/dashboard/settings?tab=machine-integration).\n"
        + "2. Machine ko PC se Serial RS232 cable ya LAN network (TCP/IP) se jodein.\n"
        + "3. **'+ Add Machine'** dabayein, machine name, model aur ASTM/HL7 protocol select karein.\n"
        + "4. Lab computer par **OnePath Machine Bridge** (`START_MACHINE_BRIDGE.bat`) run karein.\n"
        + "5. Analyzer par sample run karte hi readings apne aap LIS me Result Entry par aa jayengi!"
      : "To connect automated laboratory analyzers:\n\n"
        + "1. Go to **Dashboard > Settings > Machine Integration**: [Open Machine Integration](/dashboard/settings?tab=machine-integration).\n"
        + "2. Connect the analyzer to your PC via Serial RS232 or LAN (TCP/IP).\n"
        + "3. Click **'+ Add Machine'**, enter model and protocol (ASTM/HL7).\n"
        + "4. Run **OnePath Machine Bridge** (`START_MACHINE_BRIDGE.bat`) on your lab PC.\n"
        + "5. Analyzer readings will stream automatically into Result Entry!";
  }

  // 4.2 Result Entry & AI Suggestions (Admin & Pathologist)
  if (
    q.includes("result") || q.includes("parinam") || q.includes("enter result") ||
    q.includes("formula") || q.includes("ai suggestion") || q.includes("approve")
  ) {
    return isHindi
      ? "Test result daalne aur AI suggestion use karne ke steps:\n\n"
        + "1. Sidebar se **'Reports'** me jayein: [Open Reports Management](/dashboard/reports).\n"
        + "2. Patient ke aage **'Enter Result'** (Edit icon) par click karein. Yeh Result Entry page open karega: `/dashboard/reports/[id]/edit`.\n"
        + "3. Parameter values type karein. Formulas (MCV, MCH, A:G Ratio, eGFR) apne aap calculate honge aur abnormal values red flag ho jayengi.\n"
        + "4. Remarks / Advices me **'✨ AI Suggestion'** button dabayein instant clinical summary ke liye.\n"
        + "5. Sab check karke **'Save & Complete Report'** ya **'Approve'** par click karein."
      : "To enter results and use AI clinical suggestions:\n\n"
        + "1. Go to **Dashboard > Reports**: [Open Reports Management](/dashboard/reports).\n"
        + "2. Click **'Enter Result'** next to the patient's record to access `/dashboard/reports/[id]/edit`.\n"
        + "3. Type values. Formulas (MCV, MCH, A:G Ratio, eGFR) auto-calculate, and abnormals are flagged in red.\n"
        + "4. In Remarks or Advices, click **'✨ AI Suggestion'** for an automated doctor clinical impression.\n"
        + "5. Click **'Save & Complete Report'** or **'Approve'** to finalize.";
  }

  // 4.3 Batch Report Printing
  if (q.includes("batch print") || q.includes("bulk print") || q.includes("multiple print")) {
    return isHindi
      ? "Batch Report Printing ke steps:\n\n"
        + "1. Sidebar me **Reports > Batch Print** par jayein: [Open Batch Print](/dashboard/reports/batch-print).\n"
        + "2. Date range, department (Biochemistry, Hematology) aur status filter karein.\n"
        + "3. Reports select karein aur **'Print Selected Reports'** dabakar 50+ reports ek sath single click me print karein."
      : "To batch-print multiple reports:\n\n"
        + "1. Go to **Dashboard > Reports > Batch Print**: [Open Batch Print](/dashboard/reports/batch-print).\n"
        + "2. Filter by date, collection status, and department.\n"
        + "3. Select reports and click **'Print Selected'** to batch-print dozens of patient reports in a single operation.";
  }

  // 4.4 Due Reports & Outstanding Balance
  if (
    q.includes("due") || q.includes("dues") || q.includes("pending payment") ||
    q.includes("accept payment") || q.includes("clear due") || q.includes("baki") ||
    q.includes("baaki") || q.includes("udhar")
  ) {
    return isHindi
      ? "Dues dekhne aur balance payment accept karne ke steps:\n\n"
        + "1. Sidebar me **Financial Analytics > Due Reports** me jayein: [Open Due Reports](/dashboard/billing/dues).\n"
        + "2. Patient Name, Mobile number ya PID se pending due bills search karein.\n"
        + "3. Patient ke aage **'Accept Payment'** button dabayein. Modal me pending balance dikhega.\n"
        + "4. Full payment ya Partial amount enter karein, payment mode (Cash, Card, UPI, PayU) select karein aur confirm karein.\n"
        + "5. Instant settlement receipt print karein; patient balance zero ho jayega."
      : "To manage pending receivables and collect due payments:\n\n"
        + "1. Go to **Dashboard > Financial Analytics > Due Reports**: [Open Due Reports](/dashboard/billing/dues).\n"
        + "2. Search pending invoices by Patient Name, Phone, or PID.\n"
        + "3. Click **'Accept Payment'** on any overdue patient row.\n"
        + "4. Enter full or partial payment amount, choose payment method (Cash, Card, UPI, PayU), and submit.\n"
        + "5. An instant settlement receipt is generated and the patient's balance updates immediately.";
  }

  // 4.5 Monthly Business Report & Lab Expenses (P&L)
  if (
    q.includes("monthly business") || q.includes("monthly expense") || q.includes("expense") ||
    q.includes("kharcha") || q.includes("profit") || q.includes("p&l") || q.includes("loss") ||
    q.includes("net profit")
  ) {
    return isHindi
      ? "Monthly Business aur Lab Expenses track karne ke steps:\n\n"
        + "1. Sidebar me **Financial Analytics > Monthly Business Report** me jayein: [Open Monthly Expenses](/dashboard/billing/monthly-expenses).\n"
        + "2. **Expense Log Karein**: **'+ Add Expense'** dabakar category select karein (Reagents, Laboratory Rent, Staff Salaries, Electricity, Disposables, Maintenance) aur amount enter karein.\n"
        + "3. **Live Profit & Loss**: Page ke top summary cards par Total Revenue, Total Expenses, aur Net Operating Profit/Loss live calculate hota hai.\n"
        + "4. **Audit Export**: Monthly financial statement ko 1 click me official CSV spreadsheet me export karein."
      : "To track Monthly Business Revenue and Lab Expenses:\n\n"
        + "1. Go to **Financial Analytics > Monthly Business Report**: [Open Monthly Expenses](/dashboard/billing/monthly-expenses).\n"
        + "2. **Log Expenses**: Click **'+ Add Expense'** to record lab overheads (Reagents, Facility Rent, Staff Payroll, Utilities, Disposables, Maintenance).\n"
        + "3. **Real-Time P&L Summary**: Summary cards display gross revenue, total operational expenditures, and Net Profit/Loss.\n"
        + "4. **CSV Export**: Click **'Export CSV'** to generate a complete monthly financial audit ledger.";
  }

  // 4.6 Billing Desk
  if (
    (q.includes("billing") || q.includes("bill") || q.includes("receipt") || q.includes("rasid") || q.includes("invoice")) &&
    !q.includes("quota") && !q.includes("gst invoice") && !q.includes("tax invoice") && !q.includes("subscription")
  ) {
    return isHindi
      ? "Billing Desk manage karne ke steps:\n\n"
        + "1. Sidebar se **Financial Analytics > Billing** me jayein: [Open Billing Desk](/dashboard/billing).\n"
        + "2. Sabhi patient invoices, paid amounts, aur dues review karein.\n"
        + "3. Thermal POS ya A4 format me payment receipts print karein."
      : "To manage laboratory invoices in Billing Desk:\n\n"
        + "1. Go to **Financial Analytics > Billing**: [Open Billing Desk](/dashboard/billing).\n"
        + "2. Review all patient invoices, payment breakdowns, and discount logs.\n"
        + "3. Print tax invoices in thermal POS or A4 format.";
  }

  // 4.7 Cases: Referral Doctors, Commission Manage & Doctor Portal
  if (
    q.includes("referral") || q.includes("doctor") || q.includes("commission") ||
    q.includes("cut settlement") || q.includes("doctor portal") || q.includes("cases")
  ) {
    if (q.includes("outsource")) {
      return isHindi
        ? "Outsourced Cases manage karne ke steps:\n\n"
          + "1. Sidebar se **Cases > Outsource Cases** me jayein: [Open Outsourced Cases](/dashboard/cases/outsource).\n"
          + "2. External reference labs (Thyrocare, Dr Lal, SRL) ko bheje gaye samples, airway bill numbers, aur TAT track karein."
        : "To manage Outsourced Cases:\n\n"
          + "1. Go to **Cases > Outsource Cases**: [Open Outsourced Cases](/dashboard/cases/outsource).\n"
          + "2. Log specimens dispatched to external reference laboratories, record airway bills, and monitor turnaround times.";
    }
    return isHindi
      ? "Doctor Referral aur Cases manage karne ke steps:\n\n"
        + "1. **Cases Hub**: Sidebar se **Cases** me jayein: [Open Cases](/dashboard/cases).\n"
        + "2. **Doctor Directory**: [Open View Referral](/dashboard/doctors) – naye doctors add karein aur unke contact details dekhein.\n"
        + "3. **Commission & Settlement**: [Open Referral Manage](/dashboard/doctors/manage) – doctor-wise referral commission % set karein aur cut settlement ledger check karein.\n"
        + "4. **Doctor Portal**: [Open Doctor Portal](/dashboard/doctors/portal) – doctor ko online reports review karne ke liye secure token access dein.\n"
        + "5. **Outsource Cases**: [Open Outsourced Cases](/dashboard/cases/outsource) – external reference lab tracking."
      : "To manage Referral Doctors and Cases:\n\n"
        + "1. **Cases Hub**: Access via [Open Cases](/dashboard/cases).\n"
        + "2. **Doctor Directory**: Go to [Open View Referral](/dashboard/doctors) to add referring doctors and view contact details.\n"
        + "3. **Commission Ledger**: Go to [Open Referral Manage](/dashboard/doctors/manage) to configure doctor commission rates and cut settlements.\n"
        + "4. **Doctor Portal**: Provide doctors with token access to review reports online at [Open Doctor Portal](/dashboard/doctors/portal).\n"
        + "5. **Outsourced Cases**: Track external reference lab dispatches at [Open Outsourced Cases](/dashboard/cases/outsource).";
  }

  // 4.8 B2B & Centers: Sales & Wallets
  if (q.includes("b2b") || q.includes("b2b sales") || q.includes("partner wallet") || q.includes("b2b wallet") || q.includes("collection center")) {
    return isHindi
      ? "B2B Partners aur Centers manage karne ke steps:\n\n"
        + "1. **B2B & Centers Hub**: Sidebar se [Open Collection Centers](/dashboard/collection-centers) me jayein.\n"
        + "2. **B2B Sales**: Sidebar se **B2B & Centers > Sales** me jayein: [Open B2B Sales](/dashboard/b2b) – partner-wise test volume aur sales track karein.\n"
        + "3. **B2B Wallets**: Sidebar se **B2B & Centers > Wallet** me jayein: [Open B2B Wallets](/dashboard/b2b/wallets) – partner prepaid wallets check karein aur credit balance add karein.\n"
        + "4. **Centers Login & RBAC**: Naye center credentials create karne ke liye: [Open RBAC Settings](/dashboard/settings?tab=collection-centers)."
      : "To manage B2B Partners and Collection Centers:\n\n"
        + "1. **B2B & Centers Hub**: Access via [Open Collection Centers](/dashboard/collection-centers).\n"
        + "2. **B2B Sales**: Go to **B2B & Centers > Sales**: [Open B2B Sales](/dashboard/b2b) to monitor partner testing volume and sales trends.\n"
        + "3. **B2B Wallets**: Go to **B2B & Centers > Wallet**: [Open B2B Wallets](/dashboard/b2b/wallets) to review partner balances and issue manual credits.\n"
        + "4. **Center Logins & RBAC**: Configure center credentials and permissions in [Open RBAC Settings](/dashboard/settings?tab=collection-centers).";
  }

  // 4.9 Tests Catalog & Test Master
  if (
    q.includes("test catalog") || q.includes("test master") || q.includes("add test") ||
    q.includes("edit test") || q.includes("reference range") || q.includes("interpretation")
  ) {
    return isHindi
      ? "Tests Catalog aur Test Master manage karne ke steps:\n\n"
        + "1. Sidebar me **Tests > Tests Catalog** par jayein: [Open Test Master](/dashboard/tests).\n"
        + "2. Naya test add karein ya existing test edit karein.\n"
        + "3. Parameters, units, method, aur age/gender-based reference ranges set karein.\n"
        + "4. **'Interpretation'** tab me **'✨ AI Generate Interpretation'** se automated clinical table generate karein.\n"
        + "5. Save karke catalog publish karein."
      : "To manage the Test Catalog and Master database:\n\n"
        + "1. Go to **Dashboard > Tests > Tests Catalog**: [Open Test Master](/dashboard/tests).\n"
        + "2. Click **'+ Add Test'** or edit an existing diagnostic analyte.\n"
        + "3. Configure parameters, units, methodology, and age/gender reference ranges.\n"
        + "4. In the **'Interpretation'** tab, click **'✨ AI Generate Interpretation'** for automated clinical tables.\n"
        + "5. Save changes to update the laboratory catalog.";
  }

  // 4.10 Tests Count / Workload Analytics
  if (q.includes("tests count") || q.includes("test count") || q.includes("workload")) {
    return isHindi
      ? "Tests Count aur Workload Analytics dekhne ke steps:\n\n"
        + "1. Sidebar me **Tests > Tests Count** par jayein: [Open Tests Count](/dashboard/tests/count).\n"
        + "2. Department-wise aur test-wise daily/monthly workload analytics review karein."
      : "To view Test Workload Analytics:\n\n"
        + "1. Go to **Dashboard > Tests > Tests Count**: [Open Tests Count](/dashboard/tests/count).\n"
        + "2. Review department-wise and analyte-wise testing volume analytics.";
  }

  // 4.11 Manual Laboratory Bench Worksheet
  if (q.includes("worksheet") || q.includes("bench sheet") || q.includes("manual sheet") || q.includes("bench")) {
    return isHindi
      ? "Manual Laboratory Worksheet download karne ke steps:\n\n"
        + "1. Sidebar se **Tests > Worksheet** me jayein: [Open Worksheet](/dashboard/tests/worksheet).\n"
        + "2. Date filter chuney (Today, Yesterday, Last 7 Days) aur Department select karein (Biochemistry, Hematology, Immunology).\n"
        + "3. Patient table me PID, barcode aur required analytes dikhenge.\n"
        + "4. **'Print Worksheet'** par click karein taaki bench technician manual reading aur optical density likh kar batch testing kar sakein."
      : "To generate and print a Manual Laboratory Worksheet:\n\n"
        + "1. Go to **Dashboard > Tests > Worksheet**: [Open Worksheet](/dashboard/tests/worksheet).\n"
        + "2. Select date preset and department filter (e.g. Biochemistry, Hematology).\n"
        + "3. Review the batch patient roster displaying PIDs, barcodes, and prescribed analytes.\n"
        + "4. Click **'Print Worksheet'** to produce a clean physical bench worksheet for technicians.";
  }

  // 4.12 Diagnostic Health Packages
  if (q.includes("package") || q.includes("health package") || q.includes("combo") || q.includes("bundle")) {
    return isHindi
      ? "Diagnostic Health Packages manage karne ke steps:\n\n"
        + "1. Sidebar me **Tests > Packages** me jayein: [Open Health Packages](/dashboard/tests/packages).\n"
        + "2. **'+ New Package'** dabayein, Package Name (e.g. Executive Full Body Checkup) aur price bharein.\n"
        + "3. Constituent tests select karein. Screen par live telemetry total test sum, savings amount (₹), aur discount % auto-calculate karti hai.\n"
        + "4. Save hote hi package Patient Registration me 1-click booking ke liye available ho jata hai."
      : "To manage Diagnostic Health Packages:\n\n"
        + "1. Go to **Dashboard > Tests > Packages**: [Open Health Packages](/dashboard/tests/packages).\n"
        + "2. Click **'+ New Package'**, enter package name (e.g. Comprehensive Wellness), code, and discounted price.\n"
        + "3. Select constituent tests. Live telemetry automatically calculates regular test sum, patient savings (₹), and savings %.\n"
        + "4. Save to make the package immediately available in Patient Registration.";
  }

  // 4.13 Rate List Master & Agreements
  if (q.includes("rate list") || q.includes("ratelist") || q.includes("agreement") || q.includes("discount preset") || q.includes("1-click discount")) {
    return isHindi
      ? "Rate List Master aur 1-Click Discount configure karne ke steps:\n\n"
        + "1. Sidebar se **Tests > Rate List** par jayein: [Open Rate List](/dashboard/ratelist).\n"
        + "2. Standard base test prices review karein.\n"
        + "3. **'+ Create Rate List'** dabakar specific B2B partner ya clinic ke liye custom tier banayein.\n"
        + "4. **'1-Click % Discount'** button se sabhi tests par ek sath bulk markup ya discount (+10%, -20%) apply karein.\n"
        + "5. Partner Assignment tab se rate list ko related B2B partners ko map karein."
      : "To configure Rate Lists and B2B Client Agreements:\n\n"
        + "1. Go to **Dashboard > Tests > Rate List**: [Open Rate List](/dashboard/ratelist).\n"
        + "2. Review and maintain baseline standard retail prices for all tests.\n"
        + "3. Click **'+ Create Rate List'** to establish dedicated pricing tiers for B2B clients.\n"
        + "4. Use the **'1-Click % Discount'** tool to apply global markup/discount percentages in bulk.\n"
        + "5. In the Partner Assignment tab, map rate cards to specific B2B partners.";
  }

  // 4.14 Inventory Management (Reagents & Consumables)
  if (q.includes("inventory") || q.includes("reagent") || q.includes("stock") || q.includes("expiry") || q.includes("consumption")) {
    return isHindi
      ? "Laboratory Inventory aur Reagents manage karne ke steps:\n\n"
        + "1. **View Stocks**: Sidebar se **Inventory > View Inventory** me jayein: [Open View Inventory](/dashboard/inventory) – yahan sabhi reagents, batch numbers, current stock levels, aur expiry alerts dekhein.\n"
        + "2. **Manage Stock**: Sidebar se **Inventory > Manage Inventory** me jayein: [Open Manage Inventory](/dashboard/inventory/manage) – yahan naya stock intake log karein, consumption update karein, aur vendor purchase orders banayein."
      : "To manage Laboratory Inventory and Reagents:\n\n"
        + "1. **View Stock**: Go to **Inventory > View Inventory**: [Open View Inventory](/dashboard/inventory) to monitor reagent levels, batch numbers, and expiry alerts.\n"
        + "2. **Manage Stock**: Go to **Inventory > Manage Inventory**: [Open Manage Inventory](/dashboard/inventory/manage) to record stock intake, track daily consumption, and create supplier orders.";
  }

  // 4.15 Smart Report AI Studio
  if (q.includes("smart report") || q.includes("organ wellness") || q.includes("spider chart") || q.includes("radar chart") || q.includes("health dossier")) {
    return isHindi
      ? "AI Smart Clinical Report generate aur configure karne ke steps:\n\n"
        + "1. Sidebar se **Smart Report** me jayein: [Open AI Smart Reports](/dashboard/smart-report) ya verified report me 'AI Smart Report' button dabayein.\n"
        + "2. AI engine parameters ko correlate karta hai aur Organ Wellness Scores (Liver, Kidney, Lipid, Bone, Hematology) calculate karta hai.\n"
        + "3. 6 modern cover themes (Classic, Modern, Tech, Wellness, Gradient, Minimal) chun sakte hain.\n"
        + "4. 4-page visual PDF dossier download karein ya 1 click me patient WhatsApp par dispatch karein."
      : "To generate and customize AI Smart Clinical Reports:\n\n"
        + "1. Go to **Dashboard > Smart Report**: [Open AI Smart Reports](/dashboard/smart-report) or click 'AI Smart Report' on any verified report.\n"
        + "2. The AI engine correlates biomarkers, computes Organ Wellness Scores (Liver, Kidney, Cardiac, Bone, Blood health), and plots radar/spider charts.\n"
        + "3. Select from 6 cover designs (Classic, Modern, Tech, Wellness, Gradient, Minimal).\n"
        + "4. Download a 4-page visual PDF dossier or deliver directly to patient WhatsApp in 1 click.";
  }

  // 4.16 Sample Rejection & Recollection
  if (q.includes("reject") || q.includes("rejection") || q.includes("recollect") || q.includes("clotted") || q.includes("hemolysis") || q.includes("kharab")) {
    return isHindi
      ? "Sample Rejection aur Recollection log karne ke steps:\n\n"
        + "1. [Open Track Samples](/dashboard/track-samples) ya [Open Today's Samples](/dashboard/today-samples) me patient locate karein.\n"
        + "2. Action menu se **'Reject Sample'** par click karein.\n"
        + "3. Rejection reason chunein (Hemolyzed, Clotted, Insufficient Volume QNS, Lipemic, Wrong Tube).\n"
        + "4. Confirm karein. System status ko 'REJECTED' mark karta hai aur phlebotomist ko fresh recollection alert bhejta hai."
      : "To log Sample Rejection and request a recollection:\n\n"
        + "1. Locate patient in [Open Track Samples](/dashboard/track-samples) or [Open Today's Samples](/dashboard/today-samples).\n"
        + "2. Click **'Reject Sample'** from the action menu.\n"
        + "3. Select clinical rejection criteria (Hemolysis, Clotted, QNS Insufficient Volume, Lipemic, Wrong Tube).\n"
        + "4. Submit to update status to 'REJECTED' and trigger a recollection notification.";
  }

  // 4.17 Custom Editor & Narrative Histopathology / Biopsy Reports
  if (q.includes("custom editor") || q.includes("biopsy") || q.includes("histopathology") || q.includes("cytology") || q.includes("narrative") || q.includes("rich text")) {
    return isHindi
      ? "Custom Editor aur Narrative Biopsy/Histopathology reports banane ke steps:\n\n"
        + "1. [Open Test Master](/dashboard/tests) me test format ko **'Custom Editor (Rich Text)'** select karein.\n"
        + "2. [Open Reports Management](/dashboard/reports) me Enter Result par jayein. Rich text clinical editor open hoga.\n"
        + "3. Clinical history, gross examination, microscopic findings aur diagnosis likhein.\n"
        + "4. Official letterhead aur doctor signature layout me report beautifully render hoti hai."
      : "To create narrative Biopsy, Cytology, or Histopathology reports:\n\n"
        + "1. In [Open Test Master](/dashboard/tests), set test format to **'Custom Editor (Rich Text)'**.\n"
        + "2. Go to **Dashboard > Reports > Enter Result**: [Open Reports Management](/dashboard/reports).\n"
        + "3. Use the integrated rich-text table builder to record clinical history, gross findings, microscopic description, and impressions.\n"
        + "4. The narrative report formats seamlessly on letterhead with doctor digital signatures.";
  }

  // 4.18 Refer & Earn Program
  if (q.includes("refer") || q.includes("referral program") || q.includes("invite lab") || q.includes("earn")) {
    return isHindi
      ? "Refer & Earn program use karne ke steps:\n\n"
        + "1. Sidebar se **'Refer & Earn'** par jayein: [Open Refer & Earn](/dashboard/referral).\n"
        + "2. Apna unique referral code aur invite link copy karein.\n"
        + "3. Dusri diagnostic labs ko invite karein aur subscription discount credits earn karein."
      : "To access the Refer & Earn program:\n\n"
        + "1. Go to **Dashboard > Refer & Earn**: [Open Refer & Earn](/dashboard/referral).\n"
        + "2. Copy your unique laboratory invitation link and referral code.\n"
        + "3. Invite neighboring diagnostic centers and earn subscription credit rewards.";
  }

  // 4.19 Lab Account, Subscriptions & Official GST Invoices
  if (
    q.includes("subscription") || q.includes("plan") || q.includes("quota") ||
    q.includes("whatsapp credit") || q.includes("gst invoice") || q.includes("tax invoice") ||
    q.includes("sac code") || q.includes("lab account")
  ) {
    return isHindi
      ? "Lab Account, Subscription Plans aur GST Invoices manage karne ke steps:\n\n"
        + "1. Sidebar se **Lab Account** par jayein: [Open Lab Account](/dashboard/account/lab).\n"
        + "2. **Subscription Plans**: Professional vs Enterprise licenses renew karein.\n"
        + "3. **Daily Patient Quota**: Har plan me 50 patient reports rozana bilkul **FREE** hain (excess 30-50 paise/bill annual settlement).\n"
        + "4. **WhatsApp Message Credits**: 3,500 complimentary WhatsApp messages milte hain (excess ₹0.30/msg).\n"
        + "5. **Official GST Invoices**: 'Invoices' tab me sabhi payments ke official GST tax invoices (SAC: 998314) PDF download karein.\n"
        + "6. **Centre Profile**: Lab Name, Address, GSTIN aur Logo upload karein."
      : "To manage Lab Account, Software Subscriptions, and GST Invoices:\n\n"
        + "1. Go to **Dashboard > Lab Account**: [Open Lab Account](/dashboard/account/lab).\n"
        + "2. **Subscription Plans**: Review or renew Professional or Enterprise licenses via PayU.\n"
        + "3. **Daily Quota**: 1–50 patient reports/day are included **FREE** (excess reports tracked at 30–50 paise/bill).\n"
        + "4. **WhatsApp Message Credits**: Includes 3,500 complimentary WhatsApp messages (excess billed at ₹0.30/msg).\n"
        + "5. **Official GST Invoices**: Download official tax invoices (SAC 998314) under the 'Invoices' tab.\n"
        + "6. **Diagnostic Centre Profile**: Update lab address, GSTIN, and letterhead logos under 'Centre & GST Profile'.";
  }

  // 4.20 Patient Registration & Barcodes (Admin)
  if (
    q.includes("patient") || q.includes("mariz") || q.includes("mareez") ||
    q.includes("register") || q.includes("booking") || q.includes("barcode") ||
    q.includes("sticker") || q.includes("add patient")
  ) {
    return isHindi
      ? "Naye patient ka registration aur barcode nikalne ke steps:\n\n"
        + "1. Sidebar me **'+ Add Patient'** dabayein ya direct jayein: [Open Patient Registration](/dashboard/patients/register).\n"
        + "2. Mariz ka Name, Age, Gender, Mobile Number, aur Ref Doctor bharein.\n"
        + "3. Search karke required Tests ya Health Packages select karein (rate auto-calculate hoga).\n"
        + "4. Billing details confirm karein aur **'Register & Save'** dabayein.\n"
        + "5. Save hote hi unique Lab PID aur vial barcode sticker generate ho jayega jise aap print kar sakte hain."
      : "To register a patient and print vial barcodes:\n\n"
        + "1. Click **'+ Add Patient'** in the sidebar or go to [Open Patient Registration](/dashboard/patients/register).\n"
        + "2. Fill in patient demographics (Name, Age, Gender, Phone, Referring Doctor).\n"
        + "3. Select prescribed Tests or Health Packages from the searchable list.\n"
        + "4. Review billing details and click **'Register & Save'**.\n"
        + "5. A unique Lab PID and barcode sticker will be generated ready for printing.";
  }

  // 4.21 Patients Directory & History (Admin)
  if (q.includes("patient list") || q.includes("directory") || q.includes("patients") || q.includes("patient history")) {
    return isHindi
      ? "Patients Directory aur History dekhne ke steps:\n\n"
        + "1. Sidebar se **'Patients'** me jayein: [Open Patients](/dashboard/patients).\n"
        + "2. Name, Phone, ya PID se search karein aur patient history (`/dashboard/patients/[id]`) check karein."
      : "To search and view patient records:\n\n"
        + "1. Go to [Open Patients](/dashboard/patients).\n"
        + "2. Search by Patient Name, Phone, or PID to review patient profile and visit history at `/dashboard/patients/[id]`.";
  }

  // 4.22 Reports Management (Admin)
  if (q.includes("report") || q.includes("download") || q.includes("pdf") || q.includes("print")) {
    return isHindi
      ? "Reports Management ke steps:\n\n"
        + "1. Sidebar se **'Reports'** me jayein: [Open Reports Management](/dashboard/reports).\n"
        + "2. Result daalne ke liye 'Enter Result' dabayein (`/dashboard/reports/[id]/edit`) ya final report print/PDF download karein.\n"
        + "3. Bulk print ke liye: [Open Batch Print](/dashboard/reports/batch-print) use karein."
      : "To manage and print diagnostic reports:\n\n"
        + "1. Go to [Open Reports Management](/dashboard/reports).\n"
        + "2. Click 'Enter Result' to input findings at `/dashboard/reports/[id]/edit`, or click 'Print'/'PDF' to download approved reports.\n"
        + "3. For bulk printing, visit [Open Batch Print](/dashboard/reports/batch-print).";
  }

  // 4.23 Settings Hub (General)
  if (q.includes("setting") || q.includes("settings") || q.includes("config")) {
    return isHindi
      ? "OnePath LIS Settings Hub Tabs:\n\n"
        + "1. **[Letterhead Settings](/dashboard/settings?tab=letterhead)** – Letterhead upload aur margin sliders\n"
        + "2. **[Report Layout Settings](/dashboard/settings?tab=report-layout)** – 1-Test-Per-Page aur doctor signatures\n"
        + "3. **[Bills Layout Settings](/dashboard/settings?tab=bills-layout)** – Invoice header/footer, GSTIN aur terms\n"
        + "4. **[RBAC & Collection Centers](/dashboard/settings?tab=collection-centers)** (ya `/dashboard/settings?tab=rbac`) – Staff logins aur module permissions\n"
        + "5. **[Payment Gateway](/dashboard/settings?tab=payment-gateway)** – PayU merchant key & salt\n"
        + "6. **[Machine Integration](/dashboard/settings?tab=machine-integration)** – Automated analyzer bridge (ASTM/HL7)"
      : "OnePath LIS Settings Hub Tabs:\n\n"
        + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Upload letterhead image & margin sliders\n"
        + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout): 1-Test-Per-Page separation & doctor signatures\n"
        + "- [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout): Invoice heights, GSTIN & terms\n"
        + "- [Open RBAC Settings](/dashboard/settings?tab=collection-centers): Staff logins & role permissions\n"
        + "- [Open Payment Gateway Settings](/dashboard/settings?tab=payment-gateway): PayU merchant key & salt\n"
        + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): Connect automated analyzers via ASTM/HL7.";
  }

  // 4.24 ABHA ID & ABDM Integration (Admin)
  if (q.includes("abha") || q.includes("abdm") || q.includes("ayushman") || q.includes("health id")) {
    return isHindi
      ? "ABHA ID aur ABDM Integration ke steps:\n\n"
        + "1. Top navbar me **'Create ABHA ID'** button dabayein – patient ke scan karne ke liye QR poster open ho jayega.\n"
        + "2. Patient mobile se scan karke apna official ABHA card generate kar sakte hain.\n"
        + "3. Patient Registration me **'Link via ABHA'** se Aadhaar OTP verify karke record link kar sakte hain."
      : "To use ABHA ID & ABDM Integration:\n\n"
        + "1. In top navbar, click **'Create ABHA ID'** to display the official QR poster for patient mobile scan.\n"
        + "2. Patients scan the QR code to generate their official 14-digit ABHA card.\n"
        + "3. In Patient Registration, click **'Link via ABHA'** to verify with Aadhaar OTP.";
  }

  // 4.25 Support & Help (Admin)
  if (q.includes("support") || q.includes("help") || q.includes("ticket") || q.includes("complaint") || q.includes("madad")) {
    return isHindi
      ? "OnePath Technical Support se contact karne ke steps:\n\n"
        + "1. Sidebar se **Help & Support** me jayein: [Open Help & Support](/dashboard/support).\n"
        + "2. Ticket submit karein (Issue Report, Feedback, ya Feature Request).\n"
        + "3. 'Ticket History' tab me live status track karein."
      : "To contact OnePath Technical Support:\n\n"
        + "1. Go to [Open Help & Support](/dashboard/support).\n"
        + "2. Submit a support ticket (Report an Issue, Product Feedback, Feature Request).\n"
        + "3. Track updates in the 'Ticket History' tab.";
  }

  // 4.26 Greetings & Identity
  if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("who are you") || q.includes("kya kar sakte") || q.includes("namaste") || q.includes("hello") || q.includes("hi") || q.includes("suno")) {
    return isHindi
      ? "Namaste! Main **OnePath AI Guide** hoon – OnePath Laboratory Information System ka official assistant.\n\n"
        + "Main aapko LIS ke sabhi modules me step-by-step guide kar sakta hoon:\n\n"
        + "1. **[Patient Registration](/dashboard/patients/register)** – Naye mariz book karna aur barcode nikalna\n"
        + "2. **[Report Result Entry](/dashboard/reports)** – Test result daalna (`/dashboard/reports/[id]/edit`) aur '✨ AI Suggestion' clinical remarks\n"
        + "3. **[Report Layout Settings](/dashboard/settings?tab=report-layout)** – 1-Test-Per-Page separation aur doctor signatures\n"
        + "4. **[Letterhead Settings](/dashboard/settings?tab=letterhead)** – Letterhead upload aur margin sliders\n"
        + "5. **[Bills Layout Settings](/dashboard/settings?tab=bills-layout)** – Receipt print layout aur GSTIN\n"
        + "6. **[Test Master](/dashboard/tests)** – Naye tests, rates aur AI clinical interpretation\n"
        + "7. **[Machine Integration](/dashboard/settings?tab=machine-integration)** – Cell counters aur analyzers connect karna\n"
        + "8. **[Due Reports](/dashboard/billing/dues)** – Pending receivables aur partial/full settlement\n"
        + "9. **[Monthly Business Report](/dashboard/billing/monthly-expenses)** – Operational expenses aur live P&L\n"
        + "10. **[Cases & Referrals](/dashboard/cases)** – Referral doctors aur commission manage karna\n\n"
        + "Aap Hindi, Hinglish ya English me koi bhi sawal pooch sakte hain!"
      : "Hello! I am the **OnePath AI Guide** – your official assistant for OnePath Laboratory Information System.\n\n"
        + "I can help you step-by-step with:\n\n"
        + "- [Open Patient Registration](/dashboard/patients/register): Register patients & print vial barcodes\n"
        + "- [Open Reports Management](/dashboard/reports): Enter test results at `/dashboard/reports/[id]/edit` & AI clinical impressions\n"
        + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout): Multi-page test separation & doctor signatures\n"
        + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Upload letterhead image & margin sliders\n"
        + "- [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout): Configure receipt layout & GSTIN\n"
        + "- [Open Test Master](/dashboard/tests): Manage test database, prices & AI interpretations\n"
        + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): Connect analyzers via ASTM/HL7\n"
        + "- [Open Due Reports](/dashboard/billing/dues): Manage pending receivables & settlements\n"
        + "- [Open Monthly Expenses](/dashboard/billing/monthly-expenses): Track operational expenses & live P&L\n"
        + "- [Open Cases](/dashboard/cases): Manage referral doctors & commissions.";
  }

  // 4.27 Overview / Dashboard
  if (q.includes("overview") || q.includes("dashboard") || q.includes("home")) {
    return isHindi
      ? "Admin Overview Dashboard:\n\n"
        + "1. Sidebar se **'Overview'** par jayein: [Open Dashboard Overview](/dashboard).\n"
        + "2. Yahan daily revenue, test count, TAT, urgent alerts, aur monthly sales live track karein."
      : "Admin Overview Dashboard:\n\n"
        + "1. Go to [Open Dashboard Overview](/dashboard).\n"
        + "2. Monitor daily revenue, test volume, turnaround time (TAT), and urgent diagnostic alerts.";
  }

  // 4.28 General Default Admin Fallback
  return isHindi
    ? "Main OnePath LIS Assistant hoon! Main aapko laboratory information system ke kisi bhi module me guide kar sakta hoon:\n\n"
      + "- [Open Patient Registration](/dashboard/patients/register) – Naye mariz aur barcode booking\n"
      + "- [Open Reports Management](/dashboard/reports) – Result entry (`/dashboard/reports/[id]/edit`) aur report print\n"
      + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout) – 1-Test-Per-Page aur doctor signatures\n"
      + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead) – Letterhead aur print margins\n"
      + "- [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout) – Invoice layout aur GSTIN\n"
      + "- [Open Test Master](/dashboard/tests) – Test database aur rates\n"
      + "- [Open Due Reports](/dashboard/billing/dues) – Pending dues collection\n"
      + "- [Open Monthly Expenses](/dashboard/billing/monthly-expenses) – Operational expenses aur P&L\n"
      + "- [Open Cases](/dashboard/cases) – Doctor referral aur commission\n"
      + "- [Open Collection Centers](/dashboard/collection-centers) – B2B sales aur center wallets\n"
      + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration) – Analyzer connect karna\n"
      + "- [Open Refer & Earn](/dashboard/referral) – Refer karke credits earn karna\n\n"
      + "Aap Hindi ya English me koi bhi sawal pooch sakte hain!"
    : "Welcome to the OnePath LIS Assistant! I can guide you step-by-step through any feature in OnePath LIS:\n\n"
      + "- [Open Patient Registration](/dashboard/patients/register): Register patients and print barcodes\n"
      + "- [Open Reports Management](/dashboard/reports): Enter test results at `/dashboard/reports/[id]/edit` and print reports\n"
      + "- [Open Report Layout Settings](/dashboard/settings?tab=report-layout): Multi-page test separation & signatures\n"
      + "- [Open Letterhead Settings](/dashboard/settings?tab=letterhead): Letterhead upload and margins\n"
      + "- [Open Bills Layout Settings](/dashboard/settings?tab=bills-layout): Invoice layout and GSTIN\n"
      + "- [Open Test Master](/dashboard/tests): Configure tests, prices, and reference ranges\n"
      + "- [Open Due Reports](/dashboard/billing/dues): Manage pending dues and settlements\n"
      + "- [Open Monthly Expenses](/dashboard/billing/monthly-expenses): Track expenses and live P&L\n"
      + "- [Open Cases](/dashboard/cases): Manage doctor referrals and commissions\n"
      + "- [Open Collection Centers](/dashboard/collection-centers): Manage B2B sales and center wallets\n"
      + "- [Open Machine Integration](/dashboard/settings?tab=machine-integration): Connect automated analyzers\n"
      + "- [Open Refer & Earn](/dashboard/referral): Refer labs and earn subscription credits.";
}
