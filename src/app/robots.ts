import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/** /robots.txt: search engines may crawl the shop, but not private or personal pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/account",
        "/checkout",
        "/cart",
        "/saved",
        "/orders/",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/auth/",
        "/search?",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
