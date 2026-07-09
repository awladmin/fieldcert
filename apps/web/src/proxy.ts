import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// The apex -> www redirect is handled at the Vercel domain level (www set as the
// primary domain), not here, to avoid an edge/app redirect loop.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, the PWA manifest and SEO files
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)",
  ],
};
