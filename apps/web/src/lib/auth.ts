import { cache } from "react";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

export const requireUser = cache(async () => {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

export type OrgRole = "admin" | "qs" | "engineer" | "office";

export interface OrgContext {
  orgId: string;
  role: OrgRole;
  orgName: string;
  accountType: "individual" | "business";
  plan: string | null;
  subscriptionStatus: string;
  seats: number;
  qsApprovalRequired: boolean;
  trialEndsAt: string | null;
}

/**
 * Loads the user's org membership. No membership sends them to onboarding;
 * an unpaid org sends them back to the billing step.
 */
export const requireOrg = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("org_members")
    .select(
      "org_id, role, orgs(name, account_type, plan, subscription_status, seats, qs_approval_required, trial_ends_at)"
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || !membership.orgs) redirect("/onboarding");

  const o = membership.orgs;
  const org: OrgContext = {
    orgId: membership.org_id,
    role: membership.role,
    orgName: o.name,
    accountType: o.account_type === "individual" ? "individual" : "business",
    plan: o.plan,
    subscriptionStatus: o.subscription_status,
    seats: o.seats,
    qsApprovalRequired: o.qs_approval_required,
    trialEndsAt: o.trial_ends_at,
  };
  const trialValid =
    org.subscriptionStatus === "trialing" &&
    org.trialEndsAt !== null &&
    new Date(org.trialEndsAt) > new Date();
  if (org.subscriptionStatus !== "active" && !trialValid) redirect("/onboarding");
  return { supabase, user, org };
});

/** Same as requireOrg but also requires the admin role. */
export async function requireAdmin() {
  const ctx = await requireOrg();
  if (ctx.org.role !== "admin") redirect("/dashboard");
  return ctx;
}
