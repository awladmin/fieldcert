import { eicr, emptyEicr } from "@fieldcert/cert-schemas";
import { validateEicr } from "@fieldcert/rules-engine";
import { apiError, authenticateApiKey, type ApiContext } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { renderEicrPdfBuffer } from "@/lib/pdf/eicr-pdf";
import { loadAppendixPhotos, loadCertificateBranding } from "@/lib/pdf/branding";
import { createHash } from "node:crypto";

const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const UNIQUE_VIOLATION = "23505";

interface AddressInput {
  line1?: string;
  line2?: string;
  town?: string;
  county?: string;
  postcode?: string;
}

interface ClientInput {
  /** Your platform's id for this client; the upsert key */
  ref?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: AddressInput;
}

interface InstallationInput {
  /** Unique Property Reference Number; the preferred upsert key */
  uprn?: string;
  /** Your platform's id for this property; alternative upsert key */
  ref?: string;
  address?: AddressInput;
}

function generateReference(now: Date): string {
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `EICR-${date}-${suffix}`;
}

type Service = ReturnType<typeof createServiceClient>;

/**
 * Upserts the client record by external ref. Without a ref no record is
 * touched: inline data stays inline, so repeated calls never create
 * duplicates.
 */
async function resolveClient(
  supabase: Service,
  ctx: ApiContext,
  input: ClientInput
): Promise<{ id: string | null; error?: string; record?: { name: string; email: string | null; phone: string | null; address: Json } }> {
  if (!input.ref) return { id: null };

  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, email, phone, address")
    .eq("org_id", ctx.orgId)
    .eq("external_ref", input.ref)
    .maybeSingle();

  if (existing) {
    const patch: { name?: string; email?: string | null; phone?: string | null; address?: Json } = {};
    if (input.name) patch.name = input.name;
    if (input.email !== undefined) patch.email = input.email || null;
    if (input.phone !== undefined) patch.phone = input.phone || null;
    if (input.address) patch.address = input.address as Json;
    if (Object.keys(patch).length > 0) {
      await supabase.from("customers").update(patch).eq("id", existing.id);
    }
    return {
      id: existing.id,
      record: {
        name: input.name || existing.name,
        email: input.email ?? existing.email,
        phone: input.phone ?? existing.phone,
        address: (input.address as Json) ?? existing.address,
      },
    };
  }

  if (!input.name) return { id: null, error: `client.name is required to create client ${input.ref}` };
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      org_id: ctx.orgId,
      external_ref: input.ref,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      address: (input.address ?? {}) as Json,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return {
    id: created.id,
    record: {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: (input.address ?? {}) as Json,
    },
  };
}

/** Upserts the installation by UPRN or external ref (UPRN wins). */
async function resolveInstallation(
  supabase: Service,
  ctx: ApiContext,
  input: InstallationInput,
  customerId: string | null
): Promise<{ id: string | null; error?: string; address?: AddressInput }> {
  if (!input.uprn && !input.ref) return { id: null };

  let query = supabase
    .from("properties")
    .select("id, address, uprn, external_ref")
    .eq("org_id", ctx.orgId);
  query = input.uprn ? query.eq("uprn", input.uprn) : query.eq("external_ref", input.ref!);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const patch: {
      address?: Json;
      postcode?: string | null;
      uprn?: string;
      external_ref?: string;
      customer_id?: string;
    } = {};
    if (input.address) {
      patch.address = input.address as Json;
      patch.postcode = input.address.postcode ?? null;
    }
    if (input.uprn && !existing.uprn) patch.uprn = input.uprn;
    if (input.ref && !existing.external_ref) patch.external_ref = input.ref;
    if (customerId) patch.customer_id = customerId;
    if (Object.keys(patch).length > 0) {
      await supabase.from("properties").update(patch).eq("id", existing.id);
    }
    return { id: existing.id, address: input.address ?? (existing.address as AddressInput) };
  }

  if (!input.address?.line1) {
    return {
      id: null,
      error: `installation.address.line1 is required to create installation ${input.uprn ?? input.ref}`,
    };
  }
  const { data: created, error } = await supabase
    .from("properties")
    .insert({
      org_id: ctx.orgId,
      uprn: input.uprn ?? null,
      external_ref: input.ref ?? null,
      customer_id: customerId,
      address: input.address as Json,
      postcode: input.address.postcode ?? null,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: created.id, address: input.address };
}

/**
 * POST /api/v1/certificates
 * Body: {
 *   "kind": "EICR",
 *   "issue": boolean,
 *   "reference": "optional certificate number",
 *   "jobNumber": "your job id, shown on the PDF footer",
 *   "client": { "ref", "name", "email", "phone", "address" },
 *   "installation": { "uprn", "ref", "address" },
 *   "data": { ...certificate fields... }
 * }
 *
 * Creates a certificate from your platform's data, validated against BS 7671.
 * client.ref and installation.uprn/ref upsert and link FieldCert records, so
 * every certificate builds the property's compliance history. With
 * "issue": true the statutory gate runs; on success the branded PDF is
 * generated and a 30-day download URL is returned. On failure you get the
 * full list of validation issues and nothing is issued.
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiKey(request);
  if (!ctx) return apiError(401, "Missing or invalid API key");

  let body: {
    kind?: string;
    data?: unknown;
    issue?: boolean;
    reference?: string;
    jobNumber?: string;
    client?: ClientInput;
    installation?: InstallationInput;
  };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Body must be JSON");
  }
  if (body.kind !== "EICR") return apiError(422, "Unsupported certificate kind. Supported: EICR");

  const reference = body.reference?.trim() || generateReference(new Date());
  if (!REFERENCE_PATTERN.test(reference)) {
    return apiError(422, "reference can only have letters, numbers, hyphens and underscores");
  }
  const jobNumber = body.jobNumber?.trim() || null;

  const supabase = createServiceClient();

  const client = await resolveClient(supabase, ctx, body.client ?? {});
  if (client.error) return apiError(422, client.error);
  const installation = await resolveInstallation(supabase, ctx, body.installation ?? {}, client.id);
  if (installation.error) return apiError(422, installation.error);

  // Linked records prefill the certificate; inline data always wins.
  const raw = (body.data ?? {}) as Record<string, unknown>;
  const merged = {
    ...emptyEicr(),
    reference,
    ...(client.record
      ? {
          client: {
            name: client.record.name,
            email: client.record.email ?? undefined,
            phone: client.record.phone ?? undefined,
            address: (client.record.address ?? undefined) as AddressInput | undefined,
          },
        }
      : {}),
    ...(installation.address ? { installationAddress: installation.address } : {}),
    ...raw,
    kind: "EICR" as const,
  };

  const parsed = eicr.safeParse(merged);
  if (!parsed.success) {
    return apiError(422, "Certificate data failed schema validation", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const today = new Date().toISOString().slice(0, 10);
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
      reference,
      job_number: jobNumber,
      customer_id: client.id,
      property_id: installation.id,
      data: parsed.data as unknown as Json,
      validation: validation as unknown as Json,
      created_by: ctx.createdBy,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return apiError(409, `Certificate reference ${reference} is already in use`);
    }
    console.error("api certificate insert failed", { org: ctx.orgId, code: error.code, message: error.message });
    return apiError(500, error.message);
  }

  const base = {
    id: cert.id,
    reference,
    jobNumber,
    clientId: client.id,
    installationId: installation.id,
  };

  // Audit trail: API-created certificates carry the key owner's identity.
  const logEvent = async (event: string, detail: Record<string, unknown>) => {
    const { error: eventError } = await supabase.from("certificate_events").insert({
      org_id: ctx.orgId,
      certificate_id: cert.id,
      event,
      actor: ctx.createdBy,
      detail: detail as Json,
    });
    if (eventError) console.error("api audit event failed", { cert: cert.id, event, message: eventError.message });
  };
  await logEvent("created", { via: "api", reference, ...(jobNumber ? { jobNumber } : {}) });

  if (!body.issue) {
    return Response.json(
      { ...base, status: "draft", issuable: validation.issuable, validation },
      { status: 201 }
    );
  }

  const issuedAt = new Date().toISOString();
  const [branding, appendixPhotoData] = await Promise.all([
    loadCertificateBranding(ctx.orgId, ctx.createdBy, ctx.createdBy),
    loadAppendixPhotos(parsed.data.appendixPhotos.map((p) => p.storagePath)),
  ]);
  const buffer = await renderEicrPdfBuffer({
    cert: parsed.data,
    orgName: ctx.orgName,
    reference,
    issuedAt: issuedAt.slice(0, 10),
    jobNumber,
    branding,
    appendixPhotoData,
    verifyUrl: `https://www.fieldcert.co.uk/verify/${cert.id}`,
  });
  const pdfPath = `${ctx.orgId}/certificates/${cert.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("fieldcert")
    .upload(pdfPath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("api pdf upload failed", { org: ctx.orgId, cert: cert.id, message: uploadError.message });
    return apiError(500, `PDF upload failed: ${uploadError.message}`);
  }

  await supabase
    .from("certificates")
    .update({
      status: "issued" as const,
      issued_at: issuedAt,
      pdf_path: pdfPath,
      pdf_sha256: createHash("sha256").update(buffer).digest("hex"),
    })
    .eq("id", cert.id);
  await logEvent("issued", { via: "api", reference });

  const { data: signed } = await supabase.storage
    .from("fieldcert")
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 30, { download: true });

  return Response.json(
    {
      ...base,
      status: "issued",
      issuable: true,
      validation,
      pdfUrl: signed?.signedUrl ?? null,
    },
    { status: 201 }
  );
}

/**
 * GET /api/v1/certificates?uprn=...&ref=...&jobNumber=...&status=...&limit=...
 * The compliance history: certificates filtered by installation (UPRN or your
 * ref) or job number, newest first.
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiKey(request);
  if (!ctx) return apiError(401, "Missing or invalid API key");

  const url = new URL(request.url);
  const uprn = url.searchParams.get("uprn");
  const ref = url.searchParams.get("ref");
  const jobNumber = url.searchParams.get("jobNumber");
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);

  const supabase = createServiceClient();

  let propertyId: string | null = null;
  if (uprn || ref) {
    let propertyQuery = supabase.from("properties").select("id").eq("org_id", ctx.orgId);
    propertyQuery = uprn ? propertyQuery.eq("uprn", uprn) : propertyQuery.eq("external_ref", ref!);
    const { data: property } = await propertyQuery.maybeSingle();
    if (!property) return Response.json({ certificates: [] });
    propertyId = property.id;
  }

  let query = supabase
    .from("certificates")
    .select("id, kind, status, reference, job_number, issued_at, updated_at")
    .eq("org_id", ctx.orgId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (propertyId) query = query.eq("property_id", propertyId);
  if (jobNumber) query = query.eq("job_number", jobNumber);
  if (status === "draft" || status === "pending_approval" || status === "issued" || status === "void") {
    query = query.eq("status", status);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("api certificate list failed", { org: ctx.orgId, message: error.message });
    return apiError(500, error.message);
  }

  return Response.json({
    certificates: (rows ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      status: c.status,
      reference: c.reference,
      jobNumber: c.job_number,
      issuedAt: c.issued_at,
      updatedAt: c.updated_at,
    })),
  });
}
