import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { OnboardingWizard, type OnboardingStep } from "@/components/onboarding-wizard";

export const metadata = { title: "Get started | FieldCert" };

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  // Invited users join their team automatically on first login.
  await supabase.rpc("claim_invites");

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("org_members")
      .select("role, orgs(name, account_type, subscription_status, seats)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (membership?.orgs?.subscription_status === "active") redirect("/dashboard");

  let step: OnboardingStep = "profile";
  if (membership?.orgs) {
    step = "billing";
  } else if (profile?.full_name) {
    step = "org";
  }

  return (
    <OnboardingWizard
      initialStep={step}
      initialName={profile?.full_name ?? ""}
      orgAccountType={membership?.orgs?.account_type === "individual" ? "individual" : "business"}
      isAdmin={!membership || membership.role === "admin"}
      orgName={membership?.orgs?.name ?? ""}
    />
  );
}
