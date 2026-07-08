"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireOrg } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";
import type { OrgBranding } from "@/lib/pdf/branding";
import { EQUIPMENT_KINDS } from "@/lib/equipment";

export interface BrandingResult {
  error?: string;
  ok?: boolean;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

async function uploadImage(
  supabase: Awaited<ReturnType<typeof requireOrg>>["supabase"],
  orgId: string,
  file: File,
  name: string
): Promise<{ path?: string; error?: string }> {
  if (file.size > IMAGE_MAX_BYTES) return { error: "Images are limited to 2MB" };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Upload a PNG, JPEG or WebP image" };
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${orgId}/branding/${name}.${extension}`;
  const { error } = await supabase.storage
    .from("fieldcert")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: error.message };
  return { path };
}

/**
 * Saves certificate branding: colour, company details and logo images. All of
 * it prints on every certificate the organisation issues.
 */
export async function saveBranding(formData: FormData): Promise<BrandingResult> {
  const { supabase, org } = await requireAdmin();

  const { data: row, error: loadError } = await supabase
    .from("orgs")
    .select("branding")
    .eq("id", org.orgId)
    .single();
  if (loadError) return { error: loadError.message };
  const branding = { ...((row.branding ?? {}) as OrgBranding) };

  const color = String(formData.get("color") ?? "").trim();
  if (color && !HEX_PATTERN.test(color)) return { error: "Brand colour must be a hex value like #157a49" };
  branding.color = color || undefined;
  branding.enrolmentNumber = String(formData.get("enrolmentNumber") ?? "").trim() || undefined;
  branding.address = String(formData.get("address") ?? "").trim() || undefined;
  branding.phone = String(formData.get("phone") ?? "").trim() || undefined;
  branding.website = String(formData.get("website") ?? "").trim() || undefined;

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const result = await uploadImage(supabase, org.orgId, logo, "logo");
    if (result.error) return { error: result.error };
    branding.logoPath = result.path;
  }
  const schemeLogo = formData.get("schemeLogo");
  if (schemeLogo instanceof File && schemeLogo.size > 0) {
    const result = await uploadImage(supabase, org.orgId, schemeLogo, "scheme-logo");
    if (result.error) return { error: result.error };
    branding.schemeLogoPath = result.path;
  }

  const { error } = await supabase
    .from("orgs")
    .update({ branding: branding as Json })
    .eq("id", org.orgId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Saves the signed-in user's signature image (drawn on canvas or uploaded).
 * It prints in the signature boxes of certificates they sign.
 */
export async function saveSignature(formData: FormData): Promise<BrandingResult> {
  const { supabase, user, org } = await requireOrg();

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) return { error: "Draw or choose a signature first" };
  if (file.size > IMAGE_MAX_BYTES) return { error: "Images are limited to 2MB" };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Upload a PNG, JPEG or WebP image" };

  const path = `${org.orgId}/signatures/${user.id}.png`;
  const { error: uploadError } = await supabase.storage
    .from("fieldcert")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("profiles").update({ signature_path: path }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteSignature(): Promise<BrandingResult> {
  const { supabase, user } = await requireOrg();
  const { data: profile } = await supabase
    .from("profiles")
    .select("signature_path")
    .eq("id", user.id)
    .single();
  if (profile?.signature_path) {
    await supabase.storage.from("fieldcert").remove([profile.signature_path]);
  }
  const { error } = await supabase.from("profiles").update({ signature_path: null }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/** Adds an instrument to the organisation's test equipment register. */
export async function addEquipment(formData: FormData): Promise<BrandingResult> {
  const { supabase, org } = await requireOrg();

  const kind = String(formData.get("kind") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const serial = String(formData.get("serial") ?? "").trim();
  const calibrationDue = String(formData.get("calibrationDue") ?? "").trim();
  if (!(EQUIPMENT_KINDS as readonly string[]).includes(kind)) return { error: "Pick the instrument type" };
  if (!name) return { error: "Give the instrument a name" };
  if (!serial) return { error: "The serial or asset number is what prints on certificates" };

  const { error } = await supabase.from("org_equipment").insert({
    org_id: org.orgId,
    kind,
    name,
    serial,
    calibration_due: calibrationDue || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteEquipment(id: string): Promise<BrandingResult> {
  const { supabase } = await requireOrg();
  const { error } = await supabase.from("org_equipment").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
