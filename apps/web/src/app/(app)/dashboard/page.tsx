import Link from "next/link";
import {
  BookUser,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FilePlus2,
  FileText,
  ScrollText,
  Upload,
  XCircle,
} from "lucide-react";
import { requireOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

/** A coloured, clickable stat tile: number, label, icon. */
function StatTile({
  href,
  label,
  value,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "green" | "amber" | "violet" | "red" | "sky" | "teal";
}) {
  const tones = {
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  } as const;
  return (
    <Link
      href={href}
      className="hover:border-primary/40 group flex items-center gap-4 rounded-2xl border p-5 transition-colors"
    >
      <span className={cn("flex size-13 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        <span className="text-muted-foreground truncate text-sm font-medium">{label}</span>
      </span>
      <ChevronRight className="text-muted-foreground ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

/** A big tappable quick-action tile. */
function ActionTile({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="hover:border-primary/40 hover:bg-muted/40 flex items-center gap-4 rounded-2xl border p-5 transition-colors"
    >
      <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground truncate text-sm">{subtitle}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const { supabase, org } = await requireOrg();

  const [{ data: recent }, { data: allCerts }, { count: clientCount }, { count: installationCount }] =
    await Promise.all([
      supabase
        .from("certificates")
        .select("id, kind, status, reference, updated_at, data")
        .eq("org_id", org.orgId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase.from("certificates").select("status, validation").eq("org_id", org.orgId),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("org_id", org.orgId),
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("org_id", org.orgId),
    ]);

  const counts = { draft: 0, pending: 0, issued: 0 };
  let openIssues = 0;
  for (const row of allCerts ?? []) {
    if (row.status === "draft") {
      counts.draft++;
      const v = row.validation as { errorCount?: number } | null;
      openIssues += v?.errorCount ?? 0;
    }
    if (row.status === "pending_approval") counts.pending++;
    if (row.status === "issued") counts.issued++;
  }
  const showApprovals = org.qsApprovalRequired || counts.pending > 0;

  const trialDaysLeft =
    org.subscriptionStatus === "trialing" && org.trialEndsAt ? daysUntil(org.trialEndsAt) : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{org.orgName}</p>
        </div>
        <div className="flex items-center gap-3">
          {trialDaysLeft !== null && (
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400"
            >
              <Clock className="size-4" />
              {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left of your trial
            </Link>
          )}
          <Button render={<Link href="/certificates?new=1" />}>
            <FilePlus2 className="size-4" /> New certificate
          </Button>
        </div>
      </div>

      {/* The state of the register at a glance */}
      <div className={cn("grid gap-4 sm:grid-cols-2", showApprovals ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        <StatTile
          href="/certificates?status=draft"
          label="Draft certificates"
          value={counts.draft}
          icon={FileText}
          tone="amber"
        />
        {showApprovals && (
          <StatTile
            href="/certificates?qs=1"
            label="Awaiting approval"
            value={counts.pending}
            icon={ClipboardCheck}
            tone="violet"
          />
        )}
        <StatTile
          href="/certificates?status=issued"
          label="Issued certificates"
          value={counts.issued}
          icon={CheckCircle2}
          tone="green"
        />
        <StatTile
          href="/certificates?status=draft"
          label="Validation issues open"
          value={openIssues}
          icon={XCircle}
          tone={openIssues > 0 ? "red" : "green"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile
          href="/certificates?new=1"
          title="New certificate"
          subtitle="Start an EICR"
          icon={FilePlus2}
        />
        <ActionTile
          href="/certificates"
          title="Upload existing"
          subtitle="PDFs or .easycert files"
          icon={Upload}
        />
        <ActionTile
          href="/clients"
          title={`Clients (${clientCount ?? 0})`}
          subtitle="Who orders the reports"
          icon={BookUser}
        />
        <ActionTile
          href="/installations"
          title={`Installations (${installationCount ?? 0})`}
          subtitle="The properties you inspect"
          icon={Building2}
        />
      </div>

      {/* Recent activity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent certificates</h2>
          <Button variant="ghost" size="sm" render={<Link href="/certificates" />}>
            View all <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {(recent ?? []).map((c) => {
            const data = c.data as { client?: { name?: string }; installationAddress?: { line1?: string } } | null;
            return (
              <Link
                key={c.id}
                href={`/certificates/${c.id}`}
                className="hover:border-primary/40 flex items-center gap-4 rounded-xl border p-4 transition-colors"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    c.kind === "UPLOADED" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  {c.kind === "UPLOADED" ? "PDF" : c.kind}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{c.reference ?? c.kind}</span>
                  <span className="text-muted-foreground truncate text-sm">
                    {[data?.client?.name, data?.installationAddress?.line1].filter(Boolean).join(" · ") ||
                      "No details yet"}
                  </span>
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-3">
                  <span className="text-muted-foreground hidden text-xs sm:block">
                    {formatDate(c.updated_at)}
                  </span>
                  <StatusBadge status={c.status} />
                </span>
              </Link>
            );
          })}
          {(recent ?? []).length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
              <ScrollText className="size-8" />
              <p>No certificates yet. Create your first or upload existing ones.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
