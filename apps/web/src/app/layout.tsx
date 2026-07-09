import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fieldcert.co.uk"),
  title: {
    default: "FieldCert | Electrical certificate software with BS 7671 validation",
    template: "%s | FieldCert",
  },
  description:
    "Electrical certificates with built-in BS 7671 validation. Errors are caught as you type, and a certificate with outstanding errors cannot be issued.",
  applicationName: "FieldCert",
  keywords: [
    "EICR software",
    "electrical certificate software",
    "BS 7671",
    "electrical installation condition report",
    "certificate validation",
    "UK electrician software",
  ],
  openGraph: {
    type: "website",
    siteName: "FieldCert",
    locale: "en_GB",
    url: "https://www.fieldcert.co.uk",
    title: "FieldCert | Electrical certificates that cannot go out wrong",
    description:
      "EICR software with a built-in BS 7671 validation engine, an AI board scanner and an API that pre-fills certificates from your job software.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FieldCert | Electrical certificates that cannot go out wrong",
    description:
      "EICR software with a built-in BS 7671 validation engine, an AI board scanner and an API that pre-fills certificates from your job software.",
  },
  alternates: { canonical: "https://www.fieldcert.co.uk" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
