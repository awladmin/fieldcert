import { notFound } from "next/navigation";
import { eicr, emptyEicr } from "@fieldcert/cert-schemas";
import { requireOrg } from "@/lib/auth";
import { EicrBuilder } from "@/components/eicr/eicr-builder";
import { UploadedCertificateView } from "@/components/uploaded-certificate-view";

export const metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireOrg();
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, kind, status, data, reference, job_number, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!cert) notFound();

  if (cert.kind === "UPLOADED") {
    return (
      <UploadedCertificateView
        id={cert.id}
        reference={cert.reference ?? "Uploaded certificate"}
        uploadedAt={cert.created_at}
      />
    );
  }

  const parsed = eicr.safeParse(cert.data);
  const initialData = parsed.success ? parsed.data : emptyEicr();

  return (
    <EicrBuilder
      id={cert.id}
      status={cert.status}
      initialData={initialData}
      jobNumber={cert.job_number}
      role={org.role}
      qsApprovalRequired={org.qsApprovalRequired}
    />
  );
}
