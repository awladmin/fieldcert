import { requireAdmin } from "@/lib/auth";
import { TeamManager } from "@/components/team-manager";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const { supabase, user, org } = await requireAdmin();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("org_members")
      .select("user_id, role, profiles(full_name, email)")
      .eq("org_id", org.orgId)
      .order("created_at"),
    supabase
      .from("invites")
      .select("id, email, role, created_at")
      .eq("org_id", org.orgId)
      .is("accepted_at", null)
      .order("created_at"),
  ]);

  const engineerCount = (members ?? []).filter((m) => m.role === "engineer" || m.role === "qs").length;

  return (
    <TeamManager
      currentUserId={user.id}
      seats={org.seats}
      engineerCount={engineerCount}
      accountType={org.accountType}
      members={(members ?? []).map((m) => ({
        userId: m.user_id,
        role: m.role,
        name: m.profiles?.full_name || "(no name yet)",
        email: m.profiles?.email ?? "",
      }))}
      invites={(invites ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role }))}
    />
  );
}
