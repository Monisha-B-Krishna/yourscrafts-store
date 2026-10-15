import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Yours Crafts Woman — Handmade gifts & original art",
    template: "%s · Yours Crafts Woman",
  },
  description:
    "Handmade chocolate bouquets, gift hampers, decor, personalised gifts and original paintings by Monisha. Shipped across India.",
};

export const viewport: Viewport = {
  themeColor: "#FFF9F4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
