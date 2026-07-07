import { eicr, emptyEicr } from "@fieldcert/cert-schemas";
import { validateEicr } from "@fieldcert/rules-engine";
import { apiError, authenticateApiKey } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { renderEicrPdfBuffer } from "@/lib/pdf/eicr-pdf";

/**
 * POST /api/v1/certificates
 * Body: { "kind": "EICR", "data": { ... }, "issue": boolean }
 *
 * Creates a certificate from your platform's data, pre-populated and validated.
 * With "issue": true the statutory gate runs; on success the branded PDF is
 * generated and a 30-day download URL is returned. On failure you get the
 * full list of validation issues and nothing is issued.
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiKey(request);
  if (!ctx) return apiError(401, "Missing or invalid API key");

  let body: { kind?: string; data?: unknown; issue?: boolean };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Body must be JSON");
  }
  if (body.kind !== "EICR") return apiError(422, "Unsupported certificate kind. Supported: EICR");

  const parsed = eicr.safeParse({ ...emptyEicr(), ...(body.data as object), kind: "EICR" });
  if (!parsed.success) {
    return apiError(422, "Certificate data failed schema validation", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = createServiceClient();

  const stage = body.issue ? "issue" : "draft";
  const validation = validateEicr(parsed.data, { today, stage });

  if (body.issue && !validation.issuable) {
    return apiError(422, `Cannot issue: ${validation.errorCount} validation error(s) outstanding`, {
      issuable: false,
      issues: validation.issues,
    });
  }

  const { data: cert, error } = await supabase
    .from("certificates")
    .insert({
      org_id: ctx.orgId,
      kind: "EICR" as const,
      data: parsed.data as unknown as Json,
      validation: validation as unknown as Json,
      created_by: ctx.createdBy,
    })
    .select("id")
    .single();
  if (error) return apiError(500, error.message);

  const reference = `FC-${cert.id.slice(0, 8).toUpperCase()}`;

  if (!body.issue) {
    return Response.json(
      { id: cert.id, status: "draft", reference: null, issuable: validation.issuable, validation },
      { status: 201 }
    );
  }

  const issuedAt = new Date().toISOString();
  const buffer = await renderEicrPdfBuffer({
    cert: parsed.data,
    orgName: ctx.orgName,
    reference,
    issuedAt: issuedAt.slice(0, 10),
  });
  const pdfPath = `${ctx.orgId}/certificates/${cert.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("fieldcert")
    .upload(pdfPath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) return apiError(500, `PDF upload failed: ${uploadError.message}`);

  await supabase
    .from("certificates")
    .update({ status: "issued" as const, issued_at: issuedAt, reference, pdf_path: pdfPath })
    .eq("id", cert.id);

  const { data: signed } = await supabase.storage
    .from("fieldcert")
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 30, { download: true });

  return Response.json(
    {
      id: cert.id,
      status: "issued",
      reference,
      issuable: true,
      validation,
      pdfUrl: signed?.signedUrl ?? null,
    },
    { status: 201 }
  );
}
