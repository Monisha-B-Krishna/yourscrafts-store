import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
});
// Inter's ₹ sign on its own (1 KB) — the full extra character set is 80 KB.
// It holds no other letters, so it's listed first and everything else falls through to Inter.
const rupee = localFont({
  variable: "--font-rupee",
  src: "../assets/fonts/inter-rupee.woff2",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
  fallback: [],
  declarations: [{ prop: "unicode-range", value: "U+20B9" }],
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Yours Crafts Woman — Handmade gifts & original art",
    template: "%s · Yours Crafts Woman",
  },
  description:
    "Handmade chocolate bouquets, gift hampers, decor, personalised gifts and original paintings by Monisha. Shipped across India.",
  applicationName: "Yours Crafts Woman",
  openGraph: {
    type: "website",
    siteName: "Yours Crafts Woman",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FFF9F4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${playfair.variable} ${rupee.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
