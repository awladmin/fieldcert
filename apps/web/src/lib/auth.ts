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

export interface OrgContext {
  orgId: string;
  role: "admin" | "qs" | "engineer" | "office";
  orgName: string;
}

/** Loads the user's org membership; sends them to onboarding if they have none. */
export const requireOrg = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, orgs(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  const org: OrgContext = {
    orgId: membership.org_id,
    role: membership.role,
    orgName: (membership.orgs as { name: string } | null)?.name ?? "",
  };
  return { supabase, user, org };
});
