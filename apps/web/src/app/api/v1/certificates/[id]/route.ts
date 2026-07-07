import { apiError, authenticateApiKey } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/v1/certificates/:id
 * Returns status, validation snapshot and a fresh 30-day PDF URL when issued.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApiKey(request);
  if (!ctx) return apiError(401, "Missing or invalid API key");

  const { id } = await params;
  const supabase = createServiceClient();
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, org_id, kind, status, reference, validation, issued_at, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!cert || cert.org_id !== ctx.orgId) return apiError(404, "Certificate not found");

  let pdfUrl: string | null = null;
  if (cert.status === "issued" && cert.pdf_path) {
    const { data: signed } = await supabase.storage
      .from("fieldcert")
      .createSignedUrl(cert.pdf_path, 60 * 60 * 24 * 30, { download: true });
    pdfUrl = signed?.signedUrl ?? null;
  }

  return Response.json({
    id: cert.id,
    kind: cert.kind,
    status: cert.status,
    reference: cert.reference,
    issuedAt: cert.issued_at,
    validation: cert.validation,
    pdfUrl,
  });
}
