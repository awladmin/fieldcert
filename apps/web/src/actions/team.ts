"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type OrgRole } from "@/lib/auth";

export interface TeamActionResult {
  error?: string;
  ok?: boolean;
}

const VALID_ROLES: OrgRole[] = ["admin", "qs", "engineer", "office"];

export async function inviteMember(email: string, role: OrgRole): Promise<TeamActionResult> {
  const address = email.trim().toLowerCase();
  if (!address || !address.includes("@")) return { error: "Enter a valid email address" };
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role" };

  const { supabase, user, org } = await requireAdmin();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", address)
    .maybeSingle();
  if (existing) {
    const { data: member } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", org.orgId)
      .eq("user_id", existing.id)
      .maybeSingle();
    if (member) return { error: "That person is already in your team" };
  }

  const { error } = await supabase.from("invites").insert({
    org_id: org.orgId,
    email: address,
    role,
    created_by: user.id,
  });
  if (error) {
    if (error.message.includes("duplicate key")) return { error: "That email already has a pending invite" };
    return { error: error.message };
  }
  revalidatePath("/team");
  return { ok: true };
}

export async function cancelInvite(inviteId: string): Promise<TeamActionResult> {
  const { supabase, org } = await requireAdmin();
  const { error } = await supabase.from("invites").delete().eq("id", inviteId).eq("org_id", org.orgId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}

export async function updateMemberRole(userId: string, role: OrgRole): Promise<TeamActionResult> {
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role" };
  const { supabase, user, org } = await requireAdmin();
  if (userId === user.id) return { error: "You cannot change your own role" };
  const { error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", org.orgId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<TeamActionResult> {
  const { supabase, user, org } = await requireAdmin();
  if (userId === user.id) return { error: "You cannot remove yourself" };
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", org.orgId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}
