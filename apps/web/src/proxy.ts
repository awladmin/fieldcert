import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  // Canonicalise the bare apex onto www so the site has one address for SEO.
  // Only the exact apex host is redirected; preview URLs and localhost are left alone.
  if (request.headers.get("host") === "fieldcert.co.uk") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "www.fieldcert.co.uk";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, the PWA manifest and SEO files
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)",
  ],
};
