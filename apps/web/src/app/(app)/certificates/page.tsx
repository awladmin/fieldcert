import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { UploadCertificate } from "@/components/upload-certificate";
import {
  NewCertificateDialog,
  type ClientOption,
  type InstallationOption,
  type MemberOption,
} from "@/components/new-certificate-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Certificates | FieldCert" };

interface StoredAddress {
  line1?: string;
  town?: string;
  postcode?: string;
}

interface CertData {
  installationAddress?: StoredAddress;
  client?: { name?: string };
}

interface Filters {
  q?: string;
  mine?: string;
  qs?: string;
  status?: string;
  recent?: string;
}

/** Builds a chip link that toggles one filter param while keeping the rest. */
function chipHref(current: Filters, toggle: keyof Filters, value: string): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(current)) {
    if (val && key !== toggle) params.set(key, val);
  }
  if (current[toggle] !== value) params.set(toggle, value);
  const qs = params.toString();
  return qs ? `/certificates?${qs}` : "/certificates";
}

function withinLastSevenDays(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function FilterChip({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<Filters & { new?: string }>;
}) {
  const filters = await searchParams;
  const { supabase, user, org } = await requireOrg();

  const [{ data: certs }, { data: customers }, { data: properties }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("certificates")
        .select("id, kind, status, reference, job_number, assigned_to, qs_member, updated_at, data, validation")
        .eq("org_id", org.orgId)
        .order("updated_at", { ascending: false }),
      supabase.from("customers").select("id, name, address").eq("org_id", org.orgId).order("name"),
      supabase.from("properties").select("id, address, customer_id").eq("org_id", org.orgId),
      supabase
        .from("org_members")
        .select("user_id, role, profiles(full_name, email)")
        .eq("org_id", org.orgId),
    ]);

  const clients: ClientOption[] = (customers ?? []).map((c) => ({
    id: c.id,
    label: c.name,
    hasAddress: Boolean((c.address as StoredAddress | null)?.line1),
  }));
  const installations: InstallationOption[] = (properties ?? []).map((p) => {
    const address = (p.address ?? {}) as StoredAddress;
    return {
      id: p.id,
      label: [address.line1, address.town, address.postcode].filter(Boolean).join(", ") || "(no address)",
      customerId: p.customer_id,
    };
  });
  const members: MemberOption[] = (memberRows ?? []).map((m) => ({
    id: m.user_id,
    name: m.profiles?.full_name || m.profiles?.email || "(no name yet)",
    role: m.role,
  }));

  const query = (filters.q ?? "").trim().toLowerCase();
  const rows = (certs ?? []).filter((c) => {
    const data = c.data as CertData | null;
    if (filters.mine === "1" && c.assigned_to !== user.id) return false;
    if (filters.qs === "1" && !(c.status === "pending_approval" && c.qs_member === user.id)) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.recent === "1" && !withinLastSevenDays(c.updated_at)) return false;
    if (query) {
      const haystack = [
        c.reference,
        c.job_number,
        data?.client?.name,
        data?.installationAddress?.line1,
        data?.installationAddress?.postcode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const isFiltered = Boolean(query || filters.mine || filters.qs || filters.status || filters.recent);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Certificates</h1>
        <div className="flex items-center gap-2">
          <UploadCertificate />
          <NewCertificateDialog
            clients={clients}
            installations={installations}
            members={members}
            currentUserId={user.id}
            qsApprovalRequired={org.qsApprovalRequired}
            defaultOpen={filters.new === "1"}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action="/certificates" className="w-full max-w-xs">
          <Input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search number, client, address..."
            aria-label="Search certificates"
            className="h-10"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={filters.mine === "1"} href={chipHref(filters, "mine", "1")}>
            Assigned to me
          </FilterChip>
          {org.qsApprovalRequired && (
            <FilterChip active={filters.qs === "1"} href={chipHref(filters, "qs", "1")}>
              Awaiting my QS
            </FilterChip>
          )}
          <FilterChip active={filters.status === "draft"} href={chipHref(filters, "status", "draft")}>
            Drafts
          </FilterChip>
          <FilterChip active={filters.status === "issued"} href={chipHref(filters, "status", "issued")}>
            Issued
          </FilterChip>
          <FilterChip active={filters.recent === "1"} href={chipHref(filters, "recent", "1")}>
            Last 7 days
          </FilterChip>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Certificate</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Installation</TableHead>
            <TableHead>Job no</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Validation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => {
            const data = c.data as CertData | null;
            const validation = c.validation as { errorCount?: number; warningCount?: number } | null;
            const addr = data?.installationAddress;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link className="font-medium underline-offset-4 hover:underline" href={`/certificates/${c.id}`}>
                    {c.reference ?? c.kind}
                  </Link>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {c.kind === "UPLOADED" ? "Uploaded" : c.kind}
                  </span>
                </TableCell>
                <TableCell>{data?.client?.name ?? "-"}</TableCell>
                <TableCell>
                  {addr?.line1 ? `${addr.line1}${addr.postcode ? `, ${addr.postcode}` : ""}` : "-"}
                </TableCell>
                <TableCell>{c.job_number ?? "-"}</TableCell>
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
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                {isFiltered ? "Nothing matches those filters." : "No certificates yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
