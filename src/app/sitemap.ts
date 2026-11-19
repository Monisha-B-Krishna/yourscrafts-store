import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

/** /sitemap.xml: every shop page Google should index (private pages are left out). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, collections } = await getSitemapData();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "daily"),
    page("/shop", 0.9, "daily"),
    page("/artist", 0.8, "monthly"),
    ...categories.map((slug) => page(`/shop?category=${slug}`, 0.8)),
    ...collections.map((slug) => page(`/shop?collection=${slug}`, 0.7)),
    ...products.map((p) => ({ ...page(`/product/${p.slug}`, 0.7), lastModified: new Date(p.updated_at) })),
    ...["/contact", "/shipping", "/returns", "/privacy", "/terms"].map((path) => page(path, 0.3, "monthly")),
  ];
}
