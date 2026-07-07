import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

export function generateApiKey() {
  const key = `fc_live_${randomBytes(24).toString("hex")}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 12) };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export interface ApiContext {
  orgId: string;
  orgName: string;
  keyId: string;
  createdBy: string;
}

/**
 * Authenticates a public API request via `Authorization: Bearer fc_live_...`
 * or `x-api-key`. Returns null when the key is missing, unknown or revoked.
 */
export async function authenticateApiKey(request: Request): Promise<ApiContext | null> {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const key = bearer || request.headers.get("x-api-key")?.trim() || "";
  if (!key.startsWith("fc_")) return null;

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("api_keys")
    .select("id, org_id, created_by, revoked_at, orgs(name)")
    .eq("key_hash", hashApiKey(key))
    .maybeSingle();
  if (!row || row.revoked_at) return null;

  // Fire and forget; a failed timestamp update must not fail the request.
  void supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);

  return {
    orgId: row.org_id,
    orgName: row.orgs?.name ?? "",
    keyId: row.id,
    createdBy: row.created_by,
  };
}

export function apiError(status: number, message: string, extra?: Record<string, unknown>) {
  return Response.json({ error: { message, ...extra } }, { status });
}
