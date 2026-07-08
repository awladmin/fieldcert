"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";

export interface InstallationResult {
  error?: string;
  ok?: boolean;
  installationId?: string;
}

/** Creates or (when id is present) updates an installation (property) record. */
export async function saveInstallation(
  _prev: InstallationResult,
  formData: FormData
): Promise<InstallationResult> {
  const { supabase, org } = await requireOrg();

  const id = String(formData.get("id") ?? "").trim();
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const address = {
    line1: field("line1") || undefined,
    line2: field("line2") || undefined,
    town: field("town") || undefined,
    postcode: field("postcode") || undefined,
  };
  if (!address.line1) return { error: "Give the installation an address" };
  const customerId = field("customerId") || null;

  const row = {
    address: address as Json,
    postcode: address.postcode ?? null,
    customer_id: customerId,
    uprn: field("uprn") || null,
  };
  if (id) {
    const { error } = await supabase.from("properties").update(row).eq("id", id);
    if (error) {
      if (error.code === "23505") return { error: "Another installation already has that UPRN" };
      return { error: error.message };
    }
    revalidatePath("/installations");
    return { ok: true, installationId: id };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({ org_id: org.orgId, ...row })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Another installation already has that UPRN" };
    return { error: error.message };
  }
  revalidatePath("/installations");
  return { ok: true, installationId: data.id };
}

export async function deleteInstallation(id: string): Promise<InstallationResult> {
  const { supabase } = await requireOrg();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/installations");
  return { ok: true };
}
