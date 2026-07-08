import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, ScrollText, XCircle } from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KindBadge } from "@/components/kind-badge";
import { StatusBadge } from "@/components/status-badge";
import { UploadCertificate } from "@/components/upload-certificate";
import { CertificateRowActions } from "@/components/certificate-row-actions";
import {
  NewCertificateDialog,
  type ClientOption,
  type InstallationOption,
  type MemberOption,
} from "@/components/new-certificate-dialog";
import { cn } from "@/lib/utils";

export const metadata = { title: "Certificates" };

const PAGE_SIZE = 20;

interface StoredAddress {
  line1?: string;
  town?: string;
  postcode?: string;
}

interface CertData {
  installationAddress?: StoredAddress;
  client?: { name?: string };
  inspectionDate?: string;
}

interface Filters {
  q?: string;
  mine?: string;
  qs?: string;
  status?: string;
  recent?: string;
  page?: string;
}

/** Builds a link that changes one param while keeping the rest (page resets). */
function paramHref(current: Filters, changes: Partial<Filters>): string {
  const params = new URLSearchParams();
  const merged: Filters = { ...current, page: undefined, ...changes };
  for (const [key, val] of Object.entries(merged)) {
    if (val) params.set(key, val);
  }
  const qs = params.toString();
  return qs ? `/certificates?${qs}` : "/certificates";
}

function chipHref(current: Filters, toggle: keyof Filters, value: string): string {
  return paramHref(current, { [toggle]: current[toggle] === value ? undefined : value });
}

function withinLastSevenDays(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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


function ValidationChip({
  status,
  issuedAt,
  errorCount,
  warningCount,
}: {
  status: string;
  issuedAt: string | null;
  errorCount: number;
  warningCount: number;
}) {
  if (status === "issued") {
    return (
      <span className="text-primary flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
        <CheckCircle2 className="size-3.5" /> Issued {formatDate(issuedAt)}
      </span>
    );
  }
  if (errorCount > 0) {
    return (
      <span className="text-destructive flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
        <XCircle className="size-3.5" /> {errorCount} to fix
      </span>
    );
  }
  if (warningCount > 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3.5" /> {warningCount} warning{warningCount === 1 ? "" : "s"}
      </span>
    );
  }
  return (
    <span className="text-primary flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
      <CheckCircle2 className="size-3.5" /> Checks pass
    </span>
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
        .select(
          "id, kind, status, reference, job_number, assigned_to, qs_member, issued_at, updated_at, data, validation"
        )
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
  const memberNames = new Map(members.map((m) => [m.id, m.name]));

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
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(filters.page ?? 1) || 1), pageCount);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <ScrollText className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Certificates</h1>
            <p className="text-muted-foreground text-sm tabular-nums">
              {rows.length} certificate{rows.length === 1 ? "" : "s"}
              {isFiltered ? " matching" : ""}
            </p>
          </div>
        </div>
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

      <div className="flex flex-col gap-2.5">
        {pageRows.map((c) => {
          const data = c.data as CertData | null;
          const validation = c.validation as { errorCount?: number; warningCount?: number } | null;
          const addr = data?.installationAddress;
          const addressLabel = addr?.line1
            ? `${addr.line1}${addr.postcode ? `, ${addr.postcode}` : ""}`
            : null;
          const metadata = [
            c.job_number ? `Job No: ${c.job_number}` : null,
            c.assigned_to ? memberNames.get(c.assigned_to) : null,
            data?.inspectionDate ? `Inspected ${formatDate(data.inspectionDate)}` : null,
            `Updated ${formatDate(c.updated_at)}`,
          ].filter(Boolean);
          return (
            <div
              key={c.id}
              className="hover:border-primary/40 group relative flex items-center gap-4 rounded-xl border p-4 transition-colors"
            >
              <KindBadge kind={c.kind} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/certificates/${c.id}`}
                    className="text-base font-semibold underline-offset-4 group-hover:underline"
                  >
                    {c.reference ?? c.kind}
                    {/* Row-sized click target */}
                    <span className="absolute inset-0" aria-hidden="true" />
                  </Link>
                  <StatusBadge status={c.status} />
                  {c.kind === "UPLOADED" && <Badge variant="outline">Uploaded record</Badge>}
                </div>
                <p className="truncate text-sm">
                  {[data?.client?.name, addressLabel].filter(Boolean).join(" · ") || (
                    <span className="text-muted-foreground">No client or address yet</span>
                  )}
                </p>
                <p className="text-muted-foreground truncate text-xs">{metadata.join(" · ")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {c.kind !== "UPLOADED" && (
                  <ValidationChip
                    status={c.status}
                    issuedAt={c.issued_at}
                    errorCount={validation?.errorCount ?? 0}
                    warningCount={validation?.warningCount ?? 0}
                  />
                )}
                {((c.status !== "issued" && c.status !== "void") || c.kind === "UPLOADED") && (
                  <span className="relative">
                    <CertificateRowActions id={c.id} reference={c.reference ?? "this certificate"} />
                  </span>
                )}
                <ChevronRight className="text-muted-foreground size-4" />
              </div>
            </div>
          );
        })}
        {pageRows.length === 0 && (
          <div className="text-muted-foreground rounded-xl border border-dashed py-14 text-center">
            {isFiltered ? "Nothing matches those filters." : "No certificates yet. Create your first or upload existing ones."}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Button variant="outline" render={<Link href={paramHref(filters, { page: String(page - 1) })} />}>
              Previous
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Previous
            </Button>
          )}
          <span className="text-muted-foreground text-sm tabular-nums">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Button variant="outline" render={<Link href={paramHref(filters, { page: String(page + 1) })} />}>
              Next
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
