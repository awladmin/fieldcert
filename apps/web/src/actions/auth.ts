"use server";

import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

const DEV_EMAIL = "danny+dev@amershamwebsites.co.uk";
const DEV_PASSWORD = "fieldcert-dev-only";

/** Dev-only instant login. The button only renders in dev; this guard makes it impossible in prod regardless. */
export async function devSignIn() {
  if (process.env.NODE_ENV !== "development") throw new Error("Dev login is development-only");

  const supabase = await createAuthClient();
  let { error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
  if (error) {
    const admin = createServiceClient();
    await admin.auth.admin.createUser({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Dev User" },
    });
    ({ error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD }));
    if (error) throw new Error(error.message);
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export interface OtpFormState {
  error?: string;
  sent?: boolean;
  email?: string;
}

export async function requestLoginCode(_prev: OtpFormState, formData: FormData): Promise<OtpFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address" };
  // Signup collects the name up front; it lands in user metadata so the
  // profile trigger fills it in and onboarding starts pre-populated.
  const fullName = String(formData.get("fullName") ?? "").trim();

  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`;

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/confirm`,
      ...(fullName ? { data: { full_name: fullName } } : {}),
    },
  });
  if (error) return { error: error.message };
  return { sent: true, email };
}

export async function verifyLoginCode(_prev: OtpFormState, formData: FormData): Promise<OtpFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  if (!email || token.length !== 6) return { sent: true, email, error: "Enter the 6-digit code from the email" };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { sent: true, email, error: error.message };

  redirect("/dashboard");
}

/**
 * Final step of the signup wizard: verifies the code, then applies everything
 * collected in the earlier steps (name, account type, company) so the user
 * lands directly on the billing step with their organisation already created.
 */
export async function verifySignupCode(_prev: OtpFormState, formData: FormData): Promise<OtpFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const accountType = formData.get("accountType") === "individual" ? "individual" : "business";
  const companyName = String(formData.get("companyName") ?? "").trim();
  if (!email || token.length !== 6) return { sent: true, email, error: "Enter the 6-digit code from the email" };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { sent: true, email, error: error.message };

  const { saveProfileName, createOrg } = await import("@/actions/orgs");
  if (fullName) await saveProfileName(fullName);

  // Invited users may already belong to an org; do not create a duplicate.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();
  if (!membership && companyName) {
    const result = await createOrg(companyName, accountType);
    if (result.error) return { sent: true, email, error: result.error };
  }

  redirect("/onboarding");
}
