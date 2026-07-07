import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createAuthClient } from "@/lib/supabase/server";

/**
 * Handles sign-in links from Supabase emails:
 * - PKCE flow: ?code=... exchanged for a session
 * - token_hash flow (custom email templates): ?token_hash=...&type=email
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createAuthClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
