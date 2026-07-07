import { notFound } from "next/navigation";
import { eicr, emptyEicr } from "@fieldcert/cert-schemas";
import { requireOrg } from "@/lib/auth";
import { EicrBuilder } from "@/components/eicr/eicr-builder";

export const metadata = { title: "EICR — FieldCert" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireOrg();
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, kind, status, data")
    .eq("id", id)
    .maybeSingle();
  if (!cert) notFound();

  const parsed = eicr.safeParse(cert.data);
  const initialData = parsed.success ? parsed.data : emptyEicr();

  return <EicrBuilder id={cert.id} status={cert.status} initialData={initialData} />;
}
