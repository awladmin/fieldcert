import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { suggestCompanyFromEmail } from "@/lib/companies-house";
import { OnboardingWizard, type OnboardingStep } from "@/components/onboarding-wizard";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  // Invited users join their team automatically on first login.
  await supabase.rpc("claim_invites");

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("org_members")
      .select("role, orgs(name, account_type, subscription_status, seats, trial_ends_at)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const orgRow = membership?.orgs;
  const trialValid =
    orgRow?.subscription_status === "trialing" &&
    orgRow.trial_ends_at !== null &&
    new Date(orgRow.trial_ends_at) > new Date();
  if (orgRow?.subscription_status === "active" || trialValid) redirect("/dashboard");

  // New users always start at the profile step: even with the name known from
  // signup it holds the individual-or-business choice. Prefilled, so it is quick.
  const step: OnboardingStep = orgRow ? "billing" : "profile";

  // The Companies House trick: suggest the registered company from the email
  // domain. Needs COMPANIES_HOUSE_API_KEY; silently absent otherwise.
  const companySuggestion = orgRow ? null : await suggestCompanyFromEmail(user.email ?? "");

  return (
    <OnboardingWizard
      initialStep={step}
      companySuggestion={companySuggestion}
      initialName={profile?.full_name ?? ""}
      orgAccountType={orgRow?.account_type === "individual" ? "individual" : "business"}
      isAdmin={!membership || membership.role === "admin"}
      orgName={orgRow?.name ?? ""}
      trialExpired={orgRow?.subscription_status === "trialing" && !trialValid}
    />
  );
}
