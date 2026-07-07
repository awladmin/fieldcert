"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eicr, emptyEicr, type Eicr } from "@fieldcert/cert-schemas";
import { validateEicr, type ValidationResult } from "@fieldcert/rules-engine";
import { requireOrg, type OrgContext } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";
import { renderEicrPdfBuffer } from "@/lib/pdf/eicr-pdf";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Zod-validated certificate data / validation results are plain JSON by construction. */
function toJson(value: unknown): Json {
  return value as Json;
}

function certReference(id: string) {
  return `FC-${id.slice(0, 8).toUpperCase()}`;
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

export interface FlowResult {
  error?: string;
  validation?: ValidationResult;
  ok?: boolean;
}

async function loadDraft(supabase: Awaited<ReturnType<typeof requireOrg>>["supabase"], id: string) {
  const { data: row, error } = await supabase
    .from("certificates")
    .select("data, status, created_by")
    .eq("id", id)
    .single();
  if (error) return { error: error.message } as const;
  const parsed = eicr.safeParse(row.data);
  if (!parsed.success) return { error: "Certificate data failed schema validation" } as const;
  return { row, cert: parsed.data } as const;
}

/** The statutory gate. Every path to an issued certificate goes through this. */
function issueGate(cert: Eicr): { validation: ValidationResult; error?: string } {
  const validation = validateEicr(cert, { today: todayIso(), stage: "issue" });
  if (!validation.issuable) {
    return {
      validation,
      error: `Cannot proceed: ${validation.errorCount} validation error${validation.errorCount === 1 ? "" : "s"} outstanding`,
    };
  }
  return { validation };
}

async function renderAndStorePdf(
  supabase: Awaited<ReturnType<typeof requireOrg>>["supabase"],
  org: OrgContext,
  id: string,
  cert: Eicr,
  issuedAtIso: string
): Promise<{ pdfPath?: string; error?: string }> {
  const buffer = await renderEicrPdfBuffer({
    cert,
    orgName: org.orgName,
    reference: certReference(id),
    issuedAt: issuedAtIso.slice(0, 10),
  });
  const path = `${org.orgId}/certificates/${id}.pdf`;
  const { error } = await supabase.storage
    .from("fieldcert")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (error) return { error: `PDF upload failed: ${error.message}` };
  return { pdfPath: path };
}

/** Engineers submit for approval when the org requires QS sign-off. */
export async function submitForApproval(id: string): Promise<FlowResult> {
  const { supabase, org } = await requireOrg();
  if (!org.qsApprovalRequired) return { error: "This organisation issues directly; approval is not required" };

  const loaded = await loadDraft(supabase, id);
  if ("error" in loaded) return { error: loaded.error };
  if (loaded.row.status !== "draft") return { error: "Only draft certificates can be submitted" };

  const gate = issueGate(loaded.cert);
  if (gate.error) return { error: gate.error, validation: gate.validation };

  const { error } = await supabase
    .from("certificates")
    .update({ status: "pending_approval" as const, validation: toJson(gate.validation) })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { error: error.message };

  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { ok: true };
}

/** QS or admin sends a submitted certificate back for changes. */
export async function returnToDraft(id: string): Promise<FlowResult> {
  const { supabase, org } = await requireOrg();
  if (org.role !== "qs" && org.role !== "admin") return { error: "Only a QS or admin can return certificates" };

  const { error } = await supabase
    .from("certificates")
    .update({ status: "draft" as const })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) return { error: error.message };

  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { ok: true };
}

export async function issueCertificate(id: string): Promise<FlowResult> {
  const { supabase, user, org } = await requireOrg();

  const loaded = await loadDraft(supabase, id);
  if ("error" in loaded) return { error: loaded.error };
  const { row, cert } = loaded;

  const fromStatus = row.status;
  if (fromStatus === "draft") {
    if (org.qsApprovalRequired && org.role === "engineer") {
      return { error: "Your organisation requires QS approval. Submit the certificate for approval instead" };
    }
  } else if (fromStatus === "pending_approval") {
    if (org.role !== "qs" && org.role !== "admin") {
      return { error: "Only a QS or admin can approve and issue this certificate" };
    }
  } else {
    return { error: "This certificate has already been issued" };
  }

  const gate = issueGate(cert);
  if (gate.error) return { error: gate.error, validation: gate.validation };

  const issuedAt = new Date().toISOString();
  const pdf = await renderAndStorePdf(supabase, org, id, cert, issuedAt);
  if (pdf.error) return { error: pdf.error };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "issued" as const,
      issued_at: issuedAt,
      approved_by: user.id,
      reference: certReference(id),
      pdf_path: pdf.pdfPath,
      validation: toJson(gate.validation),
    })
    .eq("id", id)
    .eq("status", fromStatus);
  if (error) return { error: error.message };

  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { ok: true, validation: gate.validation };
}

/** Time-limited share link for the issued PDF (clients, landlords, agents). */
export async function createShareLink(id: string): Promise<{ error?: string; url?: string }> {
  const { supabase } = await requireOrg();
  const { data: row, error } = await supabase
    .from("certificates")
    .select("pdf_path, status")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };
  if (row.status !== "issued" || !row.pdf_path) return { error: "Only issued certificates can be shared" };

  const THIRTY_DAYS = 60 * 60 * 24 * 30;
  const { data: signed, error: signError } = await supabase.storage
    .from("fieldcert")
    .createSignedUrl(row.pdf_path, THIRTY_DAYS, { download: true });
  if (signError) return { error: signError.message };
  return { url: signed.signedUrl };
}
