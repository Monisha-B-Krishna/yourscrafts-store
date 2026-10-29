import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files, images and the analytics/search APIs (they don't need a session refresh).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|images/|placeholders/|api/events|api/search|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
