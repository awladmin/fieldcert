"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-auth";

export interface CreateKeyResult {
  error?: string;
  /** The full key. Shown exactly once; only its hash is stored. */
  key?: string;
}

export async function createApiKey(name: string): Promise<CreateKeyResult> {
  const keyName = name.trim();
  if (!keyName) return { error: "Give the key a name, e.g. the platform it connects" };

  const { supabase, user, org } = await requireAdmin();
  const { key, hash, prefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    org_id: org.orgId,
    name: keyName,
    key_hash: hash,
    prefix,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/developers");
  return { key };
}

export async function revokeApiKey(id: string): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, org } = await requireAdmin();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", org.orgId);
  if (error) return { error: error.message };
  revalidatePath("/developers");
  return { ok: true };
}
