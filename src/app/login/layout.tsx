import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab Portal Login | OnePath Lab LIS",
  description:
    "Secure login to OnePath Lab Information System. Access patient registration, test authoring, analyzer interfacing, billing, and report dispatch.",
  alternates: {
    canonical: "https://lis.onepathlab.com/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
