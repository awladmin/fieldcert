import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { createEicr } from "@/actions/certificates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Dashboard — FieldCert" };

export default async function DashboardPage() {
  const { supabase, org } = await requireOrg();
  const { data: certs } = await supabase
    .from("certificates")
    .select("id, kind, status, reference, updated_at, data")
    .eq("org_id", org.orgId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const counts = { draft: 0, issued: 0 };
  const { data: allStatuses } = await supabase
    .from("certificates")
    .select("status")
    .eq("org_id", org.orgId);
  for (const row of allStatuses ?? []) {
    if (row.status === "draft") counts.draft++;
    if (row.status === "issued") counts.issued++;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={createEicr}>
          <Button type="submit">New EICR</Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Draft certificates</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{counts.draft}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Issued certificates</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{counts.issued}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {certs && certs.length > 0 ? (
            <ul className="flex flex-col divide-y">
              {certs.map((c) => {
                const data = c.data as { installationAddress?: { line1?: string; postcode?: string } } | null;
                const addr = data?.installationAddress;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/certificates/${c.id}`}
                      className="hover:bg-muted/50 flex items-center justify-between gap-3 rounded px-2 py-2.5"
                    >
                      <span className="text-sm">
                        {c.kind}
                        {addr?.line1 ? ` — ${addr.line1}${addr.postcode ? `, ${addr.postcode}` : ""}` : " — no address yet"}
                      </span>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No certificates yet — create your first EICR to see the validation engine in action.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
