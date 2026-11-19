import { ImageResponse } from "next/og";
import { BrandCard, OG_SIZE, ogFonts } from "@/lib/og";

export const alt = "Yours Crafts Woman: handmade gifts and original art";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview shown when the shop's link is shared on WhatsApp, Instagram, etc. */
export default async function Image() {
  return new ImageResponse(
    (
      <BrandCard>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: "Playfair", fontSize: 84, lineHeight: 1.08, maxWidth: 960 }}>
            Handmade gifts, made to be remembered.
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#6B6B6B" }}>
            Chocolate bouquets · Hampers · Decor · Original paintings
          </div>
        </div>
      </BrandCard>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
