"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eicr, emptyEicr, type Eicr } from "@fieldcert/cert-schemas";
import { validateEicr, type ValidationResult } from "@fieldcert/rules-engine";
import { requireOrg, type OrgContext } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";
import { renderBoardSchedulePdfBuffer, renderEicrPdfBuffer } from "@/lib/pdf/eicr-pdf";
import { loadAppendixPhotos, loadCertificateBranding } from "@/lib/pdf/branding";
import { createHash } from "node:crypto";

const SITE_URL = "https://fieldcert.co.uk";

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

/**
 * Appends to the certificate's audit trail. Never fatal: the business action
 * has already succeeded, so a failed log line is reported, not thrown.
 */
async function recordEvent(
  supabase: Awaited<ReturnType<typeof requireOrg>>["supabase"],
  orgId: string,
  certificateId: string,
  event: string,
  actor: string,
  detail: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("certificate_events").insert({
    org_id: orgId,
    certificate_id: certificateId,
    event,
    actor,
    detail: detail as Json,
  });
  if (error) console.error("audit event failed", { certificateId, event, message: error.message });
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
  await recordEvent(supabase, org.orgId, cert.id, "created", user.id, {
    reference,
    ...(jobNumber ? { jobNumber } : {}),
  });
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
  /** Set when the flow produced a certificate worth navigating to */
  certificateId?: string;
  /** Human summary of an import, for the success toast */
  summary?: string;
}

async function loadDraft(supabase: Awaited<ReturnType<typeof requireOrg>>["supabase"], id: string) {
  const { data: row, error } = await supabase
    .from("certificates")
    .select("data, status, created_by, reference, job_number, assigned_to")
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
  jobNumber: string | null,
  inspectorUserId: string | null,
  qsUserId: string | null
): Promise<{ pdfPath?: string; sha256?: string; error?: string }> {
  const [branding, appendixPhotoData] = await Promise.all([
    loadCertificateBranding(org.orgId, inspectorUserId, qsUserId),
    loadAppendixPhotos(cert.appendixPhotos.map((p) => p.storagePath)),
  ]);
  const buffer = await renderEicrPdfBuffer({
    cert,
    orgName: org.orgName,
    reference,
    issuedAt: issuedAtIso.slice(0, 10),
    jobNumber,
    branding,
    appendixPhotoData,
    verifyUrl: `${SITE_URL}/verify/${id}`,
  });
  const path = `${org.orgId}/certificates/${id}.pdf`;
  const { error } = await supabase.storage
    .from("fieldcert")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (error) return { error: `PDF upload failed: ${error.message}` };
  return { pdfPath: path, sha256: createHash("sha256").update(buffer).digest("hex") };
}

/** Engineers submit for approval when the org requires QS sign-off. */
export async function submitForApproval(id: string): Promise<FlowResult> {
  const { supabase, user, org } = await requireOrg();
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

  await recordEvent(supabase, org.orgId, id, "submitted", user.id);
  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { ok: true };
}

/** QS or admin sends a submitted certificate back for changes. */
export async function returnToDraft(id: string): Promise<FlowResult> {
  const { supabase, user, org } = await requireOrg();
  if (org.role !== "qs" && org.role !== "admin") return { error: "Only a QS or admin can return certificates" };

  const { error } = await supabase
    .from("certificates")
    .update({ status: "draft" as const })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) return { error: error.message };

  await recordEvent(supabase, org.orgId, id, "returned", user.id);
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
  const inspectorUserId = row.assigned_to ?? row.created_by;
  const qsUserId = fromStatus === "pending_approval" ? user.id : inspectorUserId;
  const pdf = await renderAndStorePdf(supabase, org, id, cert, issuedAt, reference, row.job_number, inspectorUserId, qsUserId);
  if (pdf.error) return { error: pdf.error };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "issued" as const,
      issued_at: issuedAt,
      approved_by: user.id,
      reference,
      pdf_path: pdf.pdfPath,
      pdf_sha256: pdf.sha256,
      validation: toJson(gate.validation),
    })
    .eq("id", id)
    .eq("status", fromStatus);
  if (error) return { error: error.message };

  await recordEvent(supabase, org.orgId, id, "issued", user.id, {
    reference,
    ...(fromStatus === "pending_approval" ? { approvedFromSubmission: true } : {}),
  });
  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { ok: true, validation: gate.validation };
}

const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];

/**
 * EasyCert import: parses the .easycert bundle into a draft EICR the engineer
 * can review, complete and issue, and archives the original file beside it.
 */
async function importEasycert(
  supabase: Awaited<ReturnType<typeof requireOrg>>["supabase"],
  org: OrgContext,
  userId: string,
  file: File
): Promise<FlowResult> {
  const { parseEasycert } = await import("@/lib/easycert/parse");
  const parsed = parseEasycert(new Uint8Array(await file.arrayBuffer()));
  if (!parsed.ok) return { error: parsed.error };

  const reference =
    parsed.reference && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(parsed.reference)
      ? parsed.reference
      : `EICR-IMPORT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const data = { ...parsed.data, reference };
  const validation = validateEicr(data, { today: todayIso(), stage: "draft" });

  const { data: cert, error } = await supabase
    .from("certificates")
    .insert({
      org_id: org.orgId,
      kind: "EICR" as const,
      reference,
      data: toJson(data),
      validation: toJson(validation),
      created_by: userId,
      assigned_to: userId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `A certificate with the reference ${reference} already exists` };
    }
    return { error: error.message };
  }

  // Archive the original bundle beside the draft; nothing from the old system is lost.
  const originalPath = `${org.orgId}/uploads/${cert.id}-original.easycert`;
  const { error: uploadError } = await supabase.storage
    .from("fieldcert")
    .upload(originalPath, file, { contentType: "application/zip" });
  if (!uploadError) {
    await supabase.from("evidence").insert({
      org_id: org.orgId,
      certificate_id: cert.id,
      storage_path: originalPath,
      kind: "easycert-original",
      created_by: userId,
    });
  }

  await recordEvent(supabase, org.orgId, cert.id, "imported", userId, {
    source: "easycert",
    fileName: file.name,
    reference,
  });
  revalidatePath("/certificates");
  const summaryParts = [parsed.clientName, parsed.addressLabel, parsed.inspectionDate].filter(Boolean);
  return {
    ok: true,
    certificateId: cert.id,
    summary: summaryParts.length ? summaryParts.join(" · ") : reference,
  };
}

/**
 * Brings certificates from previous systems into the register. EasyCert
 * bundles import as editable draft EICRs; PDFs and photos file into the
 * register as-is. Files live in the private org-scoped bucket; access is only
 * ever via time-limited signed URLs.
 */
export async function uploadLegacyCertificate(formData: FormData): Promise<FlowResult> {
  const { supabase, user, org } = await requireOrg();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload" };
  if (file.size > UPLOAD_MAX_BYTES) return { error: "Files are limited to 25MB" };
  if (file.name.toLowerCase().endsWith(".easycert")) {
    return importEasycert(supabase, org, user.id, file);
  }
  if (!UPLOAD_TYPES.includes(file.type)) {
    return { error: "Upload a PDF, a photo (JPEG, PNG, HEIC, WebP) or an .easycert file" };
  }

  const reference = String(formData.get("reference") ?? "").trim() || file.name.replace(/\.[^.]+$/, "");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${org.orgId}/uploads/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("fieldcert")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: uploaded, error } = await supabase
    .from("certificates")
    .insert({
      org_id: org.orgId,
      kind: "UPLOADED" as const,
      status: "issued" as const,
      reference,
      data: toJson({ kind: "UPLOADED", fileName: file.name }),
      created_by: user.id,
      issued_at: new Date().toISOString(),
      pdf_path: path,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("fieldcert").remove([path]);
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `A certificate with the reference ${reference} already exists` };
    }
    return { error: error.message };
  }

  await recordEvent(supabase, org.orgId, uploaded.id, "imported", user.id, {
    source: "upload",
    fileName: file.name,
  });
  revalidatePath("/certificates");
  return { ok: true };
}

/**
 * Deletes a certificate that has not been issued. Issued certificates are
 * legal records and stay in the register permanently; there is no path to
 * delete one, only (later) to void it.
 */
export async function deleteCertificate(id: string): Promise<FlowResult> {
  const { supabase } = await requireOrg();

  const { data: cert, error: loadError } = await supabase
    .from("certificates")
    .select("id, kind, status, reference, pdf_path, data")
    .eq("id", id)
    .single();
  if (loadError) return { error: loadError.message };
  // Uploaded records are archived copies from other systems, so removable;
  // certificates we issued, including voided ones, are permanent (the
  // database trigger backs this up even if the check were bypassed).
  if ((cert.status === "issued" || cert.status === "void") && cert.kind !== "UPLOADED") {
    return { error: "Issued and voided certificates are legal records and cannot be deleted" };
  }

  // Archived files (imported .easycert originals, uploaded PDFs) go with it.
  const { data: evidence } = await supabase
    .from("evidence")
    .select("storage_path")
    .eq("certificate_id", id);
  const paths = (evidence ?? []).map((e) => e.storage_path);
  if (cert.pdf_path) paths.push(cert.pdf_path);
  const parsedForCleanup = eicr.safeParse(cert.data);
  if (parsedForCleanup.success) {
    paths.push(...parsedForCleanup.data.appendixPhotos.map((p) => p.storagePath));
  }
  if (paths.length > 0) await supabase.storage.from("fieldcert").remove(paths);

  const { error } = await supabase.from("certificates").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/certificates");
  revalidatePath(`/certificates/${id}`);
  return { ok: true, summary: cert.reference ?? undefined };
}

/** Time-limited share link for the issued PDF (clients, landlords, agents). */
export async function createShareLink(id: string): Promise<{ error?: string; url?: string }> {
  const { supabase, user, org } = await requireOrg();
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

  await recordEvent(supabase, org.orgId, id, "share_link_created", user.id, {
    expiresInDays: 30,
  });
  return { url: signed.signedUrl };
}

export interface VoidResult {
  error?: string;
  ok?: boolean;
  /** The corrected draft, when reissue was requested */
  newCertificateId?: string;
}

/**
 * Voids an issued certificate, the only change the database permits, and
 * optionally opens a corrected draft carrying the same data. The voided
 * record stays in the register permanently with its reason on the audit
 * trail.
 */
export async function voidCertificate(
  id: string,
  reason: string,
  reissue: boolean
): Promise<VoidResult> {
  const { supabase, user, org } = await requireOrg();
  if (org.role !== "qs" && org.role !== "admin") {
    return { error: "Only a QS or admin can void an issued certificate" };
  }
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "Give the reason for voiding; it goes on the permanent record" };

  const { data: row, error: loadError } = await supabase
    .from("certificates")
    .select("id, status, kind, reference, job_number, customer_id, property_id, data")
    .eq("id", id)
    .single();
  if (loadError) return { error: loadError.message };
  if (row.status !== "issued" || row.kind === "UPLOADED") {
    return { error: "Only issued certificates can be voided" };
  }

  const { error: voidError } = await supabase
    .from("certificates")
    .update({ status: "void" as const })
    .eq("id", id)
    .eq("status", "issued");
  if (voidError) return { error: voidError.message };

  let newCertificateId: string | undefined;
  if (reissue) {
    const parsed = eicr.safeParse(row.data);
    if (parsed.success) {
      const now = new Date();
      const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      let suffix = "";
      for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
      const newReference = `EICR-${date}-${suffix}`;
      const data = { ...parsed.data, reference: newReference };
      const { data: draft, error: draftError } = await supabase
        .from("certificates")
        .insert({
          org_id: org.orgId,
          kind: "EICR" as const,
          reference: newReference,
          job_number: row.job_number,
          customer_id: row.customer_id,
          property_id: row.property_id,
          data: toJson(data),
          validation: toJson(validateEicr(data, { today: todayIso(), stage: "draft" })),
          created_by: user.id,
          assigned_to: user.id,
        })
        .select("id")
        .single();
      if (!draftError) {
        newCertificateId = draft.id;
        await recordEvent(supabase, org.orgId, draft.id, "created", user.id, {
          reference: newReference,
          reissuedFrom: row.reference,
        });
      }
    }
  }

  await recordEvent(supabase, org.orgId, id, "voided", user.id, {
    reason: trimmedReason,
    ...(newCertificateId ? { reissuedTo: newCertificateId } : {}),
  });
  revalidatePath(`/certificates/${id}`);
  revalidatePath("/certificates");
  return { ok: true, newCertificateId };
}

/**
 * Renders the current draft as a PDF with a NOT VALID FOR ISSUE watermark,
 * exactly what the client would receive minus the right to rely on it.
 * Returned as base64; nothing is stored.
 */
export async function previewCertificatePdf(id: string): Promise<{ error?: string; base64?: string }> {
  const { supabase, org } = await requireOrg();
  const { data: row, error } = await supabase
    .from("certificates")
    .select("data, status, reference, job_number, assigned_to, created_by")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };

  const parsed = eicr.safeParse(row.data);
  if (!parsed.success) return { error: "Certificate data failed schema validation" };

  const inspectorUserId = row.assigned_to ?? row.created_by;
  const [branding, appendixPhotoData] = await Promise.all([
    loadCertificateBranding(org.orgId, inspectorUserId, inspectorUserId),
    loadAppendixPhotos(parsed.data.appendixPhotos.map((p) => p.storagePath)),
  ]);
  const buffer = await renderEicrPdfBuffer({
    cert: parsed.data,
    orgName: org.orgName,
    reference: row.reference ?? "DRAFT",
    issuedAt: todayIso(),
    jobNumber: row.job_number,
    branding,
    appendixPhotoData,
    watermark: row.status === "issued" ? undefined : "NOT VALID FOR ISSUE",
  });
  return { base64: buffer.toString("base64") };
}

/** A single board's circuit and test schedule as its own printable PDF. */
export async function printBoardSchedule(
  id: string,
  boardId: string
): Promise<{ error?: string; base64?: string }> {
  const { supabase, org } = await requireOrg();
  const { data: row, error } = await supabase
    .from("certificates")
    .select("data, reference")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };

  const parsed = eicr.safeParse(row.data);
  if (!parsed.success) return { error: "Certificate data failed schema validation" };
  const board = parsed.data.boards.find((b) => b.id === boardId);
  if (!board) return { error: "Board not found on this certificate" };

  const branding = await loadCertificateBranding(org.orgId);
  const buffer = await renderBoardSchedulePdfBuffer({
    board,
    orgName: org.orgName,
    reference: row.reference ?? "DRAFT",
    branding,
  });
  return { base64: buffer.toString("base64") };
}

const APPENDIX_TYPES = ["image/jpeg", "image/png", "image/webp"];
const APPENDIX_MAX_BYTES = 10 * 1024 * 1024;

/** Uploads an appendix photo; the editor links it into the certificate data. */
export async function addAppendixPhoto(
  certificateId: string,
  formData: FormData
): Promise<{ error?: string; storagePath?: string }> {
  const { supabase, org } = await requireOrg();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload" };
  if (file.size > APPENDIX_MAX_BYTES) return { error: "Photos are limited to 10MB" };
  if (!APPENDIX_TYPES.includes(file.type)) return { error: "Upload a JPEG, PNG or WebP photo" };

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${org.orgId}/appendix/${certificateId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("fieldcert")
    .upload(storagePath, file, { contentType: file.type });
  if (error) return { error: error.message };
  return { storagePath };
}

/** Best-effort removal of an appendix photo file after it leaves the data. */
export async function removeAppendixPhoto(storagePath: string): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, org } = await requireOrg();
  if (!storagePath.startsWith(`${org.orgId}/appendix/`)) return { error: "Not an appendix photo" };
  await supabase.storage.from("fieldcert").remove([storagePath]);
  return { ok: true };
}
