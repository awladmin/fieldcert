import { createServiceClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = "23505";

/**
 * POST /api/newsletter
 * Body: { "email": "...", "company_website": "" }
 * Public endpoint behind a honeypot; stores launch-list signups.
 */
export async function POST(request: Request) {
  let body: { email?: string; company_website?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  // Honeypot: humans never see this field, bots fill it. Pretend success.
  if (body.company_website) return Response.json({ ok: true });

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Enter a valid email address" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("newsletter_signups").insert({ email });
  // Already subscribed reads as success; the endpoint never leaks who is on the list.
  if (error && error.code !== UNIQUE_VIOLATION) {
    console.error("newsletter signup failed", { code: error.code, message: error.message });
    return Response.json({ error: "Something went wrong. Try again" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
