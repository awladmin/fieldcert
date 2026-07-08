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

const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const UNIQUE_VIOLATION = "23505";

interface StoredAddress {
  line1?: string;
  line2?: string;
  town?: string;
  postcode?: string;
}

export interface CreateCertificateState {
  error?: string;
}

/**
 * Creates a certificate from the new-certificate dialog: number assigned at
 * creation, optional job number, client and installation either picked from
 * records or created inline, and engineer/QS assignment. Record details are
 * copied into the certificate data so the editor starts pre-filled.
 */
export async function createCertificate(
  _prev: CreateCertificateState,
  formData: FormData
): Promise<CreateCertificateState> {
  const { supabase, user, org } = await requireOrg();
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const reference = field("reference");
  if (!reference) return { error: "The certificate needs a number" };
  if (!REFERENCE_PATTERN.test(reference)) {
    return { error: "Certificate numbers can only have letters, numbers, hyphens and underscores" };
  }
  const jobNumber = field("jobNumber") || null;

  // Client: an existing record, a new one created inline, or none.
  let customerId: string | null = null;
  let clientPerson: { name?: string; email?: string; phone?: string; address?: StoredAddress } | undefined;
  const clientMode = field("clientMode");
  if (clientMode === "existing" && field("customerId")) {
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, name, email, phone, address")
      .eq("id", field("customerId"))
      .single();
    if (error) return { error: "Could not load the selected client" };
    customerId = customer.id;
    clientPerson = {
      name: customer.name,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      address: (customer.address ?? undefined) as StoredAddress | undefined,
    };
  } else if (clientMode === "new") {
    const name = field("clientName");
    if (!name) return { error: "Give the new client a name" };
    const address: StoredAddress = {
      line1: field("clientLine1") || undefined,
      town: field("clientTown") || undefined,
      postcode: field("clientPostcode") || undefined,
    };
    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        org_id: org.orgId,
        name,
        email: field("clientEmail") || null,
        phone: field("clientPhone") || null,
        address: toJson(address),
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = created.id;
    clientPerson = {
      name,
      email: field("clientEmail") || undefined,
      phone: field("clientPhone") || undefined,
      address: address.line1 ? address : undefined,
    };
  }

  // Installation: an existing record, a new one, or the client's own address.
  let propertyId: string | null = null;
  let installationAddress: StoredAddress | undefined;
  const installationMode = field("installationMode");
  if (installationMode === "existing" && field("propertyId")) {
    const { data: property, error } = await supabase
      .from("properties")
      .select("id, address")
      .eq("id", field("propertyId"))
      .single();
    if (error) return { error: "Could not load the selected installation" };
    propertyId = property.id;
    installationAddress = (property.address ?? undefined) as StoredAddress | undefined;
  } else if (installationMode === "new") {
    const address: StoredAddress = {
      line1: field("instLine1") || undefined,
      line2: field("instLine2") || undefined,
      town: field("instTown") || undefined,
      postcode: field("instPostcode") || undefined,
    };
    if (!address.line1) return { error: "Give the new installation an address" };
    const { data: created, error } = await supabase
      .from("properties")
      .insert({
        org_id: org.orgId,
        customer_id: customerId,
        address: toJson(address),
        postcode: address.postcode ?? null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    propertyId = created.id;
    installationAddress = address;
  } else if (installationMode === "client-address") {
    if (!clientPerson?.address?.line1) {
      return { error: "The client has no address to use for the installation" };
    }
    const { data: created, error } = await supabase
      .from("properties")
      .insert({
        org_id: org.orgId,
        customer_id: customerId,
        address: toJson(clientPerson.address),
        postcode: clientPerson.address.postcode ?? null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    propertyId = created.id;
    installationAddress = clientPerson.address;
  }

  const data = {
    ...emptyEicr(),
    reference,
    ...(clientPerson ? { client: clientPerson } : {}),
    ...(installationAddress ? { installationAddress } : {}),
  };

  const { data: cert, error } = await supabase
    .from("certificates")
    .insert({
      org_id: org.orgId,
      kind: "EICR" as const,
      reference,
      job_number: jobNumber,
      customer_id: customerId,
      property_id: propertyId,
      assigned_to: field("assignedTo") || user.id,
      qs_member: field("qsMember") || null,
      data: toJson(data),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `Certificate number ${reference} is already in use. Regenerate or pick another` };
    }
    return { error: error.message };
  }
  redirect(`/certificates/${cert.id}`);
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
    .select("data, status, created_by, reference, job_number")
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
  issuedAtIso: string,
  reference: string,
  jobNumber: string | null
): Promise<{ pdfPath?: string; error?: string }> {
  const buffer = await renderEicrPdfBuffer({
    cert,
    orgName: org.orgName,
    reference,
    issuedAt: issuedAtIso.slice(0, 10),
    jobNumber,
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

  // Certificates created through the dialog carry their number from creation;
  // the FC- fallback only covers rows that predate that flow.
  const reference = row.reference ?? certReference(id);
  const issuedAt = new Date().toISOString();
  const pdf = await renderAndStorePdf(supabase, org, id, cert, issuedAt, reference, row.job_number);
  if (pdf.error) return { error: pdf.error };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "issued" as const,
      issued_at: issuedAt,
      approved_by: user.id,
      reference,
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

const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];

/**
 * Brings certificates from previous systems into the register. Files live in
 * the private org-scoped bucket; access is only ever via time-limited signed URLs.
 */
export async function uploadLegacyCertificate(formData: FormData): Promise<FlowResult> {
  const { supabase, user, org } = await requireOrg();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload" };
  if (file.size > UPLOAD_MAX_BYTES) return { error: "Files are limited to 25MB" };
  if (!UPLOAD_TYPES.includes(file.type)) return { error: "Upload a PDF or a photo (JPEG, PNG, HEIC, WebP)" };

  const reference = String(formData.get("reference") ?? "").trim() || file.name.replace(/\.[^.]+$/, "");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${org.orgId}/uploads/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("fieldcert")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("certificates").insert({
    org_id: org.orgId,
    kind: "UPLOADED" as const,
    status: "issued" as const,
    reference,
    data: toJson({ kind: "UPLOADED", fileName: file.name }),
    created_by: user.id,
    issued_at: new Date().toISOString(),
    pdf_path: path,
  });
  if (error) {
    await supabase.storage.from("fieldcert").remove([path]);
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `A certificate with the reference ${reference} already exists` };
    }
    return { error: error.message };
  }

  revalidatePath("/certificates");
  return { ok: true };
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
