"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";

export interface ClientAddress {
  line1?: string;
  line2?: string;
  town?: string;
  postcode?: string;
}

export interface ClientResult {
  error?: string;
  ok?: boolean;
  clientId?: string;
  clientName?: string;
  /** True when the client was given an address, so the UI can offer "add as installation" */
  hasAddress?: boolean;
}

function addressFromForm(formData: FormData): ClientAddress {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    line1: field("line1") || undefined,
    line2: field("line2") || undefined,
    town: field("town") || undefined,
    postcode: field("postcode") || undefined,
  };
}

/** Creates or (when id is present) updates a client record. */
export async function saveClient(_prev: ClientResult, formData: FormData): Promise<ClientResult> {
  const { supabase, org } = await requireOrg();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the client a name" };
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = addressFromForm(formData);

  const row = { name, email, phone, address: address as Json };
  if (id) {
    const { error } = await supabase.from("customers").update(row).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/clients");
    return { ok: true, clientId: id, clientName: name, hasAddress: Boolean(address.line1) };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ org_id: org.orgId, ...row })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { ok: true, clientId: data.id, clientName: name, hasAddress: Boolean(address.line1) };
}

/**
 * One-tap follow-up after creating a client: adds an installation at the
 * client's own address (the homeowner-inspecting-their-own-home case).
 */
export async function addClientAsInstallation(clientId: string): Promise<ClientResult> {
  const { supabase, org } = await requireOrg();

  const { data: client, error } = await supabase
    .from("customers")
    .select("id, name, address")
    .eq("id", clientId)
    .single();
  if (error) return { error: error.message };

  const address = (client.address ?? {}) as ClientAddress;
  if (!address.line1) return { error: "The client has no address to copy" };

  const { error: insertError } = await supabase.from("properties").insert({
    org_id: org.orgId,
    customer_id: client.id,
    address: address as Json,
    postcode: address.postcode ?? null,
  });
  if (insertError) return { error: insertError.message };

  revalidatePath("/installations");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ClientResult> {
  const { supabase } = await requireOrg();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/installations");
  return { ok: true };
}
