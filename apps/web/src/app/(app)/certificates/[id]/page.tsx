import { notFound } from "next/navigation";
import { eicr, emptyEicr } from "@fieldcert/cert-schemas";
import { requireOrg } from "@/lib/auth";
import { EicrBuilder } from "@/components/eicr/eicr-builder";
import { CertificateTimeline, type TimelineEvent } from "@/components/certificate-timeline";
import { UploadedCertificateView } from "@/components/uploaded-certificate-view";

export const metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, org } = await requireOrg();
  const [{ data: cert }, { data: eventRows }, { data: equipmentRows }] = await Promise.all([
    supabase
      .from("certificates")
      .select("id, kind, status, data, reference, job_number, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("certificate_events")
      .select("id, event, actor, detail, created_at, profiles(full_name, email)")
      .eq("certificate_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("org_equipment").select("kind, name, serial").eq("org_id", org.orgId).order("kind"),
  ]);
  if (!cert) notFound();

  const events: TimelineEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    event: e.event,
    actorName: e.profiles?.full_name || e.profiles?.email || "System",
    detail: (e.detail ?? {}) as Record<string, unknown>,
    createdAt: e.created_at,
  }));
  const voidedEvent = events.find((e) => e.event === "voided");
  const voidReason = typeof voidedEvent?.detail.reason === "string" ? voidedEvent.detail.reason : null;

  if (cert.kind === "UPLOADED") {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <UploadedCertificateView
          id={cert.id}
          reference={cert.reference ?? "Uploaded certificate"}
          uploadedAt={cert.created_at}
        />
        <CertificateTimeline events={events} />
      </div>
    );
  }

  const parsed = eicr.safeParse(cert.data);
  const initialData = parsed.success ? parsed.data : emptyEicr();

  return (
    <div className="flex flex-col gap-6">
      <EicrBuilder
        id={cert.id}
        status={cert.status}
        initialData={initialData}
        jobNumber={cert.job_number}
        voidReason={voidReason}
        equipment={equipmentRows ?? []}
        role={org.role}
        qsApprovalRequired={org.qsApprovalRequired}
      />
      <div className="mx-auto w-full max-w-4xl">
        <CertificateTimeline events={events} />
      </div>
    </div>
  );
}
