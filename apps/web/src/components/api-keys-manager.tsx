"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Plus } from "lucide-react";
import { createApiKey, revokeApiKey } from "@/actions/api-keys";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

const VALIDATE_EXAMPLE = `curl -X POST https://your-domain.com/api/v1/validate \\
  -H "Authorization: Bearer fc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": "EICR",
    "data": {
      "boards": [{
        "id": "db1",
        "circuits": [{ "id": "c1", "ocpd": { "curve": "B", "ratingA": 32 } }],
        "testResults": [{ "circuitId": "c1", "zsOhms": 1.5 }]
      }]
    },
    "stage": "draft"
  }'`;

const ISSUE_EXAMPLE = `curl -X POST https://your-domain.com/api/v1/certificates \\
  -H "Authorization: Bearer fc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "kind": "EICR",
    "issue": true,
    "jobNumber": "JOB-1042",
    "client": { "ref": "HA-001", "name": "Northfield Housing" },
    "installation": {
      "uprn": "100023336956",
      "address": { "line1": "12 High Street", "postcode": "HP7 0AA" }
    },
    "data": { ...full certificate... }
  }'`;

const HISTORY_EXAMPLE = `curl "https://your-domain.com/api/v1/certificates?uprn=100023336956" \\
  -H "Authorization: Bearer fc_live_..."`;

export function ApiKeysManager({ keys }: { keys: KeyRow[] }) {
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createApiKey(name);
      if (result.error) toast.error(result.error);
      else {
        setFreshKey(result.key ?? null);
        setName("");
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const result = await revokeApiKey(id);
      if (result.error) toast.error(result.error);
      else toast.success("Key revoked");
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">API</h1>
        <p className="text-muted-foreground mt-1">
          Generate and validate certificates from your own software: job management platforms,
          field service tools, landlord systems. Send your job data, get back a validated,
          branded certificate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="text-primary size-4" /> API keys
          </CardTitle>
          <CardDescription>
            Keys are shown once when created and stored hashed. Revoking is immediate.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tutaris production"
              />
            </div>
            <Button onClick={create} disabled={pending || !name.trim()}>
              <Plus className="size-4" /> Create key
            </Button>
          </div>

          {freshKey && (
            <Alert>
              <KeyRound className="size-4" />
              <AlertTitle>Copy this key now. It will not be shown again.</AlertTitle>
              <AlertDescription>
                <div className="mt-2 flex items-center gap-2">
                  <code className="bg-muted rounded px-2 py-1 text-xs break-all">{freshKey}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(freshKey);
                      toast.success("Key copied");
                    }}
                  >
                    <Copy className="size-3.5" /> Copy
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {keys.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{k.prefix}...</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("en-GB") : "Never"}
                    </TableCell>
                    <TableCell>
                      {k.revokedAt ? (
                        <Badge variant="outline">Revoked</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!k.revokedAt && (
                        <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}>
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints</CardTitle>
          <CardDescription>
            Authenticate with <code>Authorization: Bearer fc_live_...</code> on every request.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">POST</Badge>
              <code className="font-semibold">/api/v1/validate</code>
            </div>
            <p className="text-muted-foreground mb-2">
              Run the statutory validation engine over certificate data without storing anything.
              Perfect for inline checks inside your own forms.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{VALIDATE_EXAMPLE}</pre>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">POST</Badge>
              <code className="font-semibold">/api/v1/certificates</code>
            </div>
            <p className="text-muted-foreground mb-2">
              Create a certificate from your data. With <code>&quot;issue&quot;: true</code> the
              gate runs and, on success, the branded PDF is generated with a 30 day download URL.
              A failing certificate returns 422 with every issue listed and nothing is stored as issued.
              Pass <code>client.ref</code> (your client id) and <code>installation.uprn</code> or{" "}
              <code>installation.ref</code> to upsert and link FieldCert records: repeated calls
              reuse the same records, so every certificate builds the property&apos;s compliance
              history. <code>jobNumber</code> shows on the PDF footer and is searchable.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{ISSUE_EXAMPLE}</pre>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">GET</Badge>
              <code className="font-semibold">/api/v1/certificates</code>
            </div>
            <p className="text-muted-foreground mb-2">
              The compliance history: filter by <code>uprn</code>, <code>ref</code>,{" "}
              <code>jobNumber</code> or <code>status</code>, newest first.
            </p>
            <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{HISTORY_EXAMPLE}</pre>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">GET</Badge>
              <code className="font-semibold">/api/v1/certificates/:id</code>
            </div>
            <p className="text-muted-foreground">
              Fetch status, the validation snapshot, and a fresh PDF URL for an issued certificate.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
