"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eicr, emptyEicr } from "@fieldcert/cert-schemas";
import { validateEicr, type ValidationResult } from "@fieldcert/rules-engine";
import { requireOrg } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Zod-validated certificate data / validation results are plain JSON by construction. */
function toJson(value: unknown): Json {
  return value as Json;
}

export async function createEicr() {
  const { supabase, user, org } = await requireOrg();
  const { data, error } = await supabase
    .from("certificates")
    .insert({ org_id: org.orgId, kind: "EICR" as const, data: toJson(emptyEicr()), created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/certificates/${data.id}`);
}

export interface SaveResult {
  error?: string;
  validation?: ValidationResult;
}

export async function saveCertificate(id: string, raw: unknown): Promise<SaveResult> {
  const { supabase } = await requireOrg();
  const parsed = eicr.safeParse(raw);
  if (!parsed.success) return { error: "Certificate data failed schema validation" };

  const validation = validateEicr(parsed.data, { today: todayIso(), stage: "draft" });
  const { error } = await supabase
    .from("certificates")
    .update({ data: toJson(parsed.data), validation: toJson(validation) })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { error: error.message };
  return { validation };
}

export interface IssueResult {
  error?: string;
  validation?: ValidationResult;
  issued?: boolean;
}

export async function issueCertificate(id: string): Promise<IssueResult> {
  const { supabase, user } = await requireOrg();
  const { data: row, error } = await supabase
    .from("certificates")
    .select("data, status")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };
  if (row.status !== "draft") return { error: "Only draft certificates can be issued" };

  const parsed = eicr.safeParse(row.data);
  if (!parsed.success) return { error: "Certificate data failed schema validation" };

  // The statutory gate: issue-stage validation must pass with zero errors.
  const validation = validateEicr(parsed.data, { today: todayIso(), stage: "issue" });
  if (!validation.issuable) {
    return { error: `Cannot issue: ${validation.errorCount} validation error(s) outstanding`, validation };
  }

  const { error: updateError } = await supabase
    .from("certificates")
    .update({
      status: "issued" as const,
      issued_at: new Date().toISOString(),
      approved_by: user.id,
      validation: toJson(validation),
    })
    .eq("id", id)
    .eq("status", "draft");
  if (updateError) return { error: updateError.message };

  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { issued: true, validation };
}
