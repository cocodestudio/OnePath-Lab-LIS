import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { TopProgressBar } from "@/components/top-progress-bar";
import { SmoothScrolling } from "@/components/smooth-scrolling";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lis.onepathlab.com"),
  title: {
    default: "OnePath Lab LIS — #1 AI-Powered Pathology Laboratory Information System",
    template: "%s | OnePath Lab LIS",
  },
  description:
    "OnePath Lab is India's leading Cloud Laboratory Information System (LIS) for pathology laboratories, diagnostic centers, and hospital chains. Automated accession, machine interfacing (ASTM/HL7), NABL ISO 15189 compliance, delta checks, digital signatures, instant WhatsApp reports, and multi-branch MIS analytics.",
  keywords: [
    "OnePath Lab LIS",
    "Pathology Lab Software",
    "Laboratory Information System India",
    "LIS Software India",
    "Pathology Management Software",
    "NABL Lab Software",
    "Cloud LIS Software",
    "Diagnostic Lab Software",
    "Hematology Analyzer Interfacing",
    "Biochemistry Machine Interfacing",
    "Doctor Digital Signature Pathology",
    "WhatsApp Lab Report Software",
    "Medical Lab Billing Software",
    "Multi-Branch Diagnostic Management",
    "Patient QR Report Verification",
  ],
  authors: [{ name: "OnePath Lab Technologies", url: "https://onepathlab.com" }],
  creator: "OnePath Lab Technologies",
  publisher: "OnePath Lab Technologies",
  applicationName: "OnePath Lab LIS",
  category: "Medical Software",
  classification: "Laboratory Information System",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://lis.onepathlab.com",
  },
  openGraph: {
    title: "OnePath Lab LIS — #1 AI-Powered Pathology Laboratory Information System",
    description:
      "Enterprise Cloud LIS for pathology and diagnostic centers. Automated analyzer interfacing, NABL compliance, digital signatures, and WhatsApp reports.",
    url: "https://lis.onepathlab.com",
    siteName: "OnePath Lab LIS",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://onepathlab.com/logo.png",
        width: 1200,
        height: 630,
        alt: "OnePath Lab LIS Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OnePath Lab LIS — Laboratory Information System Software",
    description:
      "Automated diagnostic workflows, analyzer interfacing, and instant WhatsApp reports for pathology laboratories.",
    images: ["https://onepathlab.com/logo.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/onepath-logo.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://lis.onepathlab.com/#software",
      name: "OnePath Lab LIS",
      url: "https://lis.onepathlab.com",
      applicationCategory: "HealthApplication, BusinessApplication",
      operatingSystem: "Web-based, Cloud, Windows, macOS, Linux, iOS, Android",
      softwareVersion: "3.4.0",
      description:
        "India's premier Cloud Laboratory Information System (LIS) for clinical pathology laboratories, hospital networks, and diagnostic centers with ASTM/HL7 analyzer interfacing and NABL ISO 15189 compliance.",
      offers: {
        "@type": "Offer",
        price: "2499",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "412",
        bestRating: "5",
      },
      publisher: {
        "@type": "Organization",
        name: "OnePath Lab Technologies",
        url: "https://onepathlab.com",
        logo: "https://onepathlab.com/logo.png",
      },
    },
    {
      "@type": "MedicalOrganization",
      "@id": "https://lis.onepathlab.com/#organization",
      name: "OnePath Lab Diagnostics & LIS",
      url: "https://lis.onepathlab.com",
      logo: "https://onepathlab.com/logo.png",
      description:
        "Enterprise-grade Laboratory Information System (LIS) and diagnostic reporting software.",
      telephone: "+91-9045757272",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
      },
      sameAs: ["https://onepathlab.com"],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geist.variable} ${geistMono.variable} font-sans h-full bg-background text-foreground antialiased overflow-x-hidden`}
      >
        <TopProgressBar />
        <ThemeProvider defaultTheme="light" storageKey="onepath-theme">
          <ToastProvider>
            <SmoothScrolling>
              {children}
            </SmoothScrolling>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}