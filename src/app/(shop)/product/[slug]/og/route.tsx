import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/catalog";
import { BrandCard, OG_SIZE, ogFonts } from "@/lib/og";
import { compareAtPrice, formatINR, fromPrice } from "@/lib/pricing";

export const revalidate = 3600;

/** Link preview for a product whose photos can't be used directly (e.g. SVG placeholders). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) return new Response("Not found", { status: 404 });
  const price = fromPrice(product);
  const was = product.variants.length ? null : compareAtPrice(product);
  const label = product.type === "original_art" ? "Original painting" : product.type === "print" ? "Art print" : product.category?.name ?? "Handmade";

  return new ImageResponse(
    (
      <BrandCard footer={label}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: "Playfair", fontSize: product.name.length > 34 ? 68 : 84, lineHeight: 1.08, maxWidth: 1040 }}>
            {product.name}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 30 }}>
            <span style={{ fontSize: 48 }}>
              {product.variants.length ? "From " : ""}
              {formatINR(price)}
            </span>
            {was && <span style={{ fontSize: 34, color: "#6B6B6B", textDecoration: "line-through" }}>{formatINR(was)}</span>}
          </div>
        </div>
      </BrandCard>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
