import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

/** Link-preview images (1200×630) in the shop's colours and fonts. */
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = join(process.cwd(), "src/assets/fonts");
  const [serif, sans, sansExt] = await Promise.all([
    readFile(join(dir, "PlayfairDisplay-SemiBold.woff")),
    readFile(join(dir, "Inter-Medium.woff")),
    readFile(join(dir, "Inter-Medium-LatinExt.woff")), // has the ₹ sign
  ]);
  return [
    { name: "Playfair", data: serif, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: sans, weight: 500 as const, style: "normal" as const },
    { name: "InterExt", data: sansExt, weight: 500 as const, style: "normal" as const },
  ];
}

/** Cream card with the wordmark at the top and a peach band at the bottom. */
export function BrandCard({ children, footer }: { children: ReactNode; footer?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#FFF9F4", fontFamily: "Inter, InterExt", color: "#111111" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "56px 72px 0" }}>
        <div style={{ fontFamily: "Playfair", fontSize: 40 }}>Yours Crafts Woman</div>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#F4A27A" }} />
      </div>
      <div style={{ flex: 1, display: "flex", padding: "0 72px" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4A27A", padding: "22px 72px", fontSize: 26 }}>
        <span>{footer ?? "Handmade with love · Shipped across India"}</span>
        <span>@yours.craftswoman</span>
      </div>
    </div>
  );
}
