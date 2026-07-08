import { createServiceClient } from "@/lib/supabase/server";

/**
 * Everything org-specific that prints on a certificate: brand colour, logos,
 * company details and signatures, loaded once per render. Storage images
 * become data URLs because the PDF renderer runs server-side with no fetch
 * access to the private bucket.
 */
export interface CertificateBranding {
  accentColor?: string;
  logoDataUrl?: string;
  schemeLogoDataUrl?: string;
  enrolmentNumber?: string;
  orgAddress?: string;
  orgPhone?: string;
  orgWebsite?: string;
  inspectorSignatureDataUrl?: string;
  qsSignatureDataUrl?: string;
}

export interface OrgBranding {
  color?: string;
  logoPath?: string;
  schemeLogoPath?: string;
  enrolmentNumber?: string;
  address?: string;
  phone?: string;
  website?: string;
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

async function downloadDataUrl(
  supabase: ReturnType<typeof createServiceClient>,
  path: string | undefined
): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from("fieldcert").download(path);
  if (error || !data) return undefined;
  const buffer = Buffer.from(await data.arrayBuffer());
  const mime = path.endsWith(".jpg") || path.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function loadCertificateBranding(
  orgId: string,
  inspectorUserId?: string | null,
  qsUserId?: string | null
): Promise<CertificateBranding> {
  const supabase = createServiceClient();
  const [{ data: org }, { data: profiles }] = await Promise.all([
    supabase.from("orgs").select("branding").eq("id", orgId).single(),
    supabase
      .from("profiles")
      .select("id, signature_path")
      .in("id", [inspectorUserId, qsUserId].filter((v): v is string => Boolean(v))),
  ]);

  const branding = (org?.branding ?? {}) as OrgBranding;
  const signatureOf = (userId?: string | null) =>
    profiles?.find((p) => p.id === userId)?.signature_path ?? undefined;

  const [logoDataUrl, schemeLogoDataUrl, inspectorSignatureDataUrl, qsSignatureDataUrl] =
    await Promise.all([
      downloadDataUrl(supabase, branding.logoPath),
      downloadDataUrl(supabase, branding.schemeLogoPath),
      downloadDataUrl(supabase, signatureOf(inspectorUserId)),
      downloadDataUrl(supabase, signatureOf(qsUserId)),
    ]);

  return {
    accentColor: branding.color && HEX_PATTERN.test(branding.color) ? branding.color : undefined,
    logoDataUrl,
    schemeLogoDataUrl,
    enrolmentNumber: branding.enrolmentNumber,
    orgAddress: branding.address,
    orgPhone: branding.phone,
    orgWebsite: branding.website,
    inspectorSignatureDataUrl,
    qsSignatureDataUrl,
  };
}

/** Appendix photos, downloaded for embedding: storagePath -> data URL. */
export async function loadAppendixPhotos(paths: string[]): Promise<Record<string, string>> {
  const supabase = createServiceClient();
  const entries = await Promise.all(
    paths.map(async (path) => [path, await downloadDataUrl(supabase, path)] as const)
  );
  return Object.fromEntries(entries.filter(([, url]) => url) as Array<[string, string]>);
}
