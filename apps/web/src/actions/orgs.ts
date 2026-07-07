"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";

export interface StepResult {
  error?: string;
  ok?: boolean;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function saveProfileName(fullName: string): Promise<StepResult> {
  const name = fullName.trim();
  if (!name) return { error: "Enter your name" };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: name, email: user.email });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function createOrg(
  name: string,
  accountType: "individual" | "business"
): Promise<StepResult> {
  const orgName = name.trim();
  if (!orgName) return { error: "Enter a company or trading name" };

  const { supabase } = await requireUser();
  const base = slugify(orgName) || "org";

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.floor(Math.random() * 10000)}`;
    const { error } = await supabase.rpc("create_org", {
      org_name: orgName,
      org_slug: slug,
      org_account_type: accountType,
    });
    if (!error) return { ok: true };
    if (!error.message.includes("duplicate key")) return { error: error.message };
  }
  return { error: "Could not create the organisation. Try a different name" };
}

/** Starts the 30-day free trial: full product, no card. */
export async function startTrial(seats: number): Promise<StepResult> {
  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, orgs(account_type)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "admin") return { error: "Only an admin can start the trial" };

  const accountType = membership.orgs?.account_type ?? "business";
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  const { error } = await supabase
    .from("orgs")
    .update({
      plan: accountType === "individual" ? "individual" : "business",
      subscription_status: "trialing",
      trial_ends_at: trialEnd.toISOString(),
      seats: accountType === "individual" ? 1 : Math.max(1, Math.min(200, Math.round(seats))),
    })
    .eq("id", membership.org_id);
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Mock checkout: records the chosen plan and marks the subscription active.
 * Swap for a real Stripe Checkout session when billing goes live.
 */
export async function activateSubscription(seats: number): Promise<StepResult> {
  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, orgs(account_type)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "admin") return { error: "Only an admin can set up billing" };

  const accountType = membership.orgs?.account_type ?? "business";
  const plan = accountType === "individual" ? "individual" : "business";
  const seatCount = accountType === "individual" ? 1 : Math.max(1, Math.min(200, Math.round(seats)));

  const { error } = await supabase
    .from("orgs")
    .update({ plan, subscription_status: "active", seats: seatCount })
    .eq("id", membership.org_id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateOrgSettings(input: {
  name?: string;
  qsApprovalRequired?: boolean;
}): Promise<StepResult> {
  const { supabase, org } = await requireAdmin();
  const patch: { name?: string; qs_approval_required?: boolean } = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { error: "Organisation name cannot be empty" };
    patch.name = input.name.trim();
  }
  if (input.qsApprovalRequired !== undefined) patch.qs_approval_required = input.qsApprovalRequired;
  const { error } = await supabase.from("orgs").update(patch).eq("id", org.orgId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
