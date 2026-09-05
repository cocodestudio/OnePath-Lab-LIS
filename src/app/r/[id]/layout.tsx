import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Diagnostic Report | OnePath Lab",
  description:
    "Official verified digital laboratory test report. Scan QR code to view authentic pathologist-signed test results with digital verification.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportVerificationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
