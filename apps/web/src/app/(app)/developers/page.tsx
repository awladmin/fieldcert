import { requireAdmin } from "@/lib/auth";
import { ApiKeysManager } from "@/components/api-keys-manager";

export const metadata = { title: "API" };

export default async function DevelopersPage() {
  const { supabase, org } = await requireAdmin();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at, revoked_at")
    .eq("org_id", org.orgId)
    .order("created_at", { ascending: false });

  return (
    <ApiKeysManager
      keys={(keys ?? []).map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at,
      }))}
    />
  );
}
