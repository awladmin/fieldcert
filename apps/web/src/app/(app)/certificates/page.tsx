import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createEicr } from "@/actions/certificates";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { UploadCertificate } from "@/components/upload-certificate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Certificates | FieldCert" };

export default async function CertificatesPage() {
  const { supabase, org } = await requireOrg();
  const { data: certs } = await supabase
    .from("certificates")
    .select("id, kind, status, reference, updated_at, data, validation")
    .eq("org_id", org.orgId)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Certificates</h1>
        <div className="flex items-center gap-2">
          <UploadCertificate />
          <form action={createEicr}>
            <Button type="submit">New EICR</Button>
          </form>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Installation address</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Validation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(certs ?? []).map((c) => {
            const data = c.data as {
              installationAddress?: { line1?: string; postcode?: string };
              client?: { name?: string };
            } | null;
            const validation = c.validation as { errorCount?: number; warningCount?: number } | null;
            const addr = data?.installationAddress;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link className="font-medium underline-offset-4 hover:underline" href={`/certificates/${c.id}`}>
                    {c.kind === "UPLOADED" ? (c.reference ?? "Uploaded") : c.kind}
                  </Link>
                  {c.kind === "UPLOADED" && (
                    <span className="text-muted-foreground ml-2 text-xs">Uploaded</span>
                  )}
                </TableCell>
                <TableCell>
                  {addr?.line1 ? `${addr.line1}${addr.postcode ? `, ${addr.postcode}` : ""}` : "-"}
                </TableCell>
                <TableCell>{data?.client?.name ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {validation
                    ? `${validation.errorCount ?? 0} errors · ${validation.warningCount ?? 0} warnings`
                    : "-"}
                </TableCell>
              </TableRow>
            );
          })}
          {(certs ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                No certificates yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
