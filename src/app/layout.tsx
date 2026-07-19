import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import localFont from "next/font/local";
// Ignore missing type declarations for side-effect CSS import
// @ts-ignore
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/ui/toast";

// Editorial display serif — gives the "clinical apothecary" character
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

// Clean grotesque body (local variable font already shipped with the project)
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
  title: "OnePath Lab — Laboratory Information Management System",
  description:
    "Secure, modern, and multi-tenant lab reporting, patient registration, billing, and clinical analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geist.variable} ${fraunces.variable} ${geistMono.variable} font-sans h-full bg-background text-foreground antialiased overflow-x-hidden`}
      >
        <SessionProvider>
          <ThemeProvider defaultTheme="light" storageKey="onepath-theme">
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
