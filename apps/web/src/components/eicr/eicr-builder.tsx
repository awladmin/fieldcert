"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Link2, Plus, Trash2 } from "lucide-react";
import type { Eicr } from "@fieldcert/cert-schemas";
import { validateEicr, type ValidationIssue } from "@fieldcert/rules-engine";
import {
  createShareLink,
  issueCertificate,
  returnToDraft,
  saveCertificate,
  submitForApproval,
} from "@/actions/certificates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { NumberField, SelectField, TextField, FieldIssues } from "./fields";
import { ValidationPanel } from "./validation-panel";

const OBSERVATION_CODES = [
  { value: "C1", label: "C1: Danger present" },
  { value: "C2", label: "C2: Potentially dangerous" },
  { value: "C3", label: "C3: Improvement recommended" },
  { value: "FI", label: "FI: Further investigation" },
];

const EARTHING = ["TN-S", "TN-C-S", "TT", "IT"].map((v) => ({ value: v, label: v }));
const CURVES = ["B", "C", "D"].map((v) => ({ value: v, label: `Type ${v}` }));

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EicrBuilder({
  id,
  status,
  initialData,
  role,
  qsApprovalRequired,
}: {
  id: string;
  status: string;
  initialData: Eicr;
  role: "admin" | "qs" | "engineer" | "office";
  qsApprovalRequired: boolean;
}) {
  const router = useRouter();
  const [cert, setCert] = useState<Eicr>(initialData);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [issuing, startIssuing] = useTransition();
  const readOnly = status !== "draft";

  const engineerMustSubmit = qsApprovalRequired && role === "engineer";
  const canApprove = role === "qs" || role === "admin";

  // Live statutory validation — the same engine the server runs at issue time.
  const validation = useMemo(
    () => validateEicr(cert, { today: todayIso(), stage: "issue" }),
    [cert]
  );

  const issuesFor = useCallback(
    (field: string): ValidationIssue[] => validation.issues.filter((i) => i.field === field),
    [validation]
  );

  const update = useCallback((mutate: (draft: Eicr) => void) => {
    setCert((current) => {
      const draft = structuredClone(current);
      mutate(draft);
      return draft;
    });
  }, []);

  // Debounced autosave
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (readOnly) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(async () => {
      const result = await saveCertificate(id, cert);
      setSaveState(result.error ? "error" : "saved");
      if (result.error) toast.error(`Save failed: ${result.error}`);
    }, 800);
    return () => clearTimeout(timer);
  }, [cert, id, readOnly]);

  function onIssue() {
    startIssuing(async () => {
      const result = await issueCertificate(id);
      if (result.ok) {
        toast.success("Certificate issued");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not issue certificate");
      }
    });
  }

  function onSubmitForApproval() {
    startIssuing(async () => {
      const result = await submitForApproval(id);
      if (result.ok) {
        toast.success("Submitted for approval");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not submit certificate");
      }
    });
  }

  function onReturnToDraft() {
    startIssuing(async () => {
      const result = await returnToDraft(id);
      if (result.ok) {
        toast.success("Returned to draft");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not return certificate");
      }
    });
  }

  function onDownloadPdf() {
    startIssuing(async () => {
      const result = await createShareLink(id);
      if (result.url) window.open(result.url, "_blank");
      else toast.error(result.error ?? "Could not fetch the PDF");
    });
  }

  function onCopyShareLink() {
    startIssuing(async () => {
      const result = await createShareLink(id);
      if (result.url) {
        await navigator.clipboard.writeText(result.url);
        toast.success("Share link copied. It stays valid for 30 days");
      } else {
        toast.error(result.error ?? "Could not create a share link");
      }
    });
  }

  function addObservation() {
    update((d) => {
      d.observations.push({ id: crypto.randomUUID() });
    });
  }

  function addCircuit() {
    update((d) => {
      if (d.boards.length === 0) {
        d.boards.push({ id: crypto.randomUUID(), designation: "DB1", circuits: [], testResults: [] });
      }
      const board = d.boards[0]!;
      const circuitId = crypto.randomUUID();
      board.circuits.push({ id: circuitId, circuitNumber: String(board.circuits.length + 1) });
      board.testResults.push({ circuitId });
    });
  }

  const board = cert.boards[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">EICR</h1>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-3">
            {!readOnly && (
              <span className="text-muted-foreground text-xs">
                {saveState === "saving" ? "Saving" : saveState === "error" ? "Save failed" : "Saved"}
              </span>
            )}
            {status === "draft" && engineerMustSubmit && (
              <Button onClick={onSubmitForApproval} disabled={!validation.issuable || issuing}>
                {issuing ? "Submitting" : "Submit for approval"}
              </Button>
            )}
            {status === "draft" && !engineerMustSubmit && (
              <Button onClick={onIssue} disabled={!validation.issuable || issuing}>
                {issuing ? "Issuing" : "Issue certificate"}
              </Button>
            )}
            {status === "pending_approval" && canApprove && (
              <>
                <Button variant="outline" onClick={onReturnToDraft} disabled={issuing}>
                  Return to draft
                </Button>
                <Button onClick={onIssue} disabled={issuing}>
                  {issuing ? "Issuing" : "Approve and issue"}
                </Button>
              </>
            )}
            {status === "issued" && (
              <>
                <Button variant="outline" onClick={onDownloadPdf} disabled={issuing}>
                  <Download className="size-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={onCopyShareLink} disabled={issuing}>
                  <Link2 className="size-4" />
                  Copy share link
                </Button>
              </>
            )}
          </div>
        </div>

        <fieldset disabled={readOnly} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details of the client and installation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Client name"
                value={cert.client?.name}
                issues={issuesFor("client.name")}
                onChange={(v) => update((d) => { d.client = { ...d.client, name: v }; })}
              />
              <TextField
                label="Occupier"
                value={cert.occupier}
                onChange={(v) => update((d) => { d.occupier = v; })}
              />
              <TextField
                label="Installation address"
                value={cert.installationAddress?.line1}
                issues={issuesFor("installationAddress.line1")}
                onChange={(v) => update((d) => { d.installationAddress = { ...d.installationAddress, line1: v }; })}
              />
              <TextField
                label="Postcode"
                value={cert.installationAddress?.postcode}
                issues={issuesFor("installationAddress.postcode")}
                onChange={(v) => update((d) => { d.installationAddress = { ...d.installationAddress, postcode: v }; })}
              />
              <TextField
                label="Inspection date"
                type="date"
                value={cert.inspectionDate}
                issues={issuesFor("inspectionDate")}
                onChange={(v) => update((d) => { d.inspectionDate = v; })}
              />
              <TextField
                label="Next inspection due"
                type="date"
                value={cert.nextInspectionDue}
                issues={issuesFor("nextInspectionDue")}
                onChange={(v) => update((d) => { d.nextInspectionDue = v; })}
              />
              <TextField
                label="Extent of installation covered"
                className="sm:col-span-2"
                value={cert.extentOfInstallationCovered}
                issues={issuesFor("extentOfInstallationCovered")}
                onChange={(v) => update((d) => { d.extentOfInstallationCovered = v; })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supply characteristics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <SelectField
                label="Earthing arrangement"
                value={cert.supply?.earthing}
                options={EARTHING}
                issues={issuesFor("supply.earthing")}
                onChange={(v) =>
                  update((d) => {
                    d.supply = { ...d.supply, earthing: v as "TN-S" | "TN-C-S" | "TT" | "IT" | undefined };
                  })
                }
              />
              <NumberField
                label="Nominal voltage U₀ (V)"
                value={cert.supply?.nominalVoltageU0}
                onChange={(v) => update((d) => { d.supply = { ...d.supply, nominalVoltageU0: v }; })}
              />
              <NumberField
                label="Ze (Ω)"
                value={cert.supply?.zeOhms}
                onChange={(v) => update((d) => { d.supply = { ...d.supply, zeOhms: v }; })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Circuits {board?.designation ? `(${board.designation})` : ""}
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addCircuit}>
                <Plus className="size-4" /> Add circuit
              </Button>
            </CardHeader>
            <CardContent>
              {!board || board.circuits.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No circuits yet. Add each circuit with its protective device and test results. Zs is
                  checked live against BS 7671 Table 41.3.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">No.</TableHead>
                        <TableHead className="min-w-40">Description</TableHead>
                        <TableHead className="w-28">Curve</TableHead>
                        <TableHead className="w-24">Rating (A)</TableHead>
                        <TableHead className="w-28">Zs (Ω)</TableHead>
                        <TableHead className="w-28">IR L-E (MΩ)</TableHead>
                        <TableHead className="w-28">RCD (ms)</TableHead>
                        <TableHead className="w-20">Polarity</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {board.circuits.map((circuit, ci) => {
                        const tr = board.testResults.find((t) => t.circuitId === circuit.id);
                        const ti = board.testResults.findIndex((t) => t.circuitId === circuit.id);
                        const zsIssues = issuesFor(`boards[0].testResults[${ti}].zsOhms`);
                        const irIssues = issuesFor(`boards[0].testResults[${ti}].insulationResistance.liveEarthMohm`);
                        const rcdIssues = issuesFor(`boards[0].testResults[${ti}].rcdOperatingTimeMs`);
                        const polarityIssues = issuesFor(`boards[0].testResults[${ti}].polarityConfirmed`);
                        return (
                          <TableRow key={circuit.id} className="align-top">
                            <TableCell>
                              <input
                                className="border-input w-12 rounded border bg-transparent px-1.5 py-1 text-sm"
                                value={circuit.circuitNumber ?? ""}
                                onChange={(e) =>
                                  update((d) => { d.boards[0]!.circuits[ci]!.circuitNumber = e.target.value || undefined; })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                className="border-input w-full min-w-36 rounded border bg-transparent px-1.5 py-1 text-sm"
                                value={circuit.description ?? ""}
                                placeholder="e.g. Kitchen sockets"
                                onChange={(e) =>
                                  update((d) => { d.boards[0]!.circuits[ci]!.description = e.target.value || undefined; })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <select
                                className="border-input w-full rounded border bg-transparent px-1.5 py-1 text-sm"
                                value={circuit.ocpd?.curve ?? ""}
                                onChange={(e) =>
                                  update((d) => {
                                    const c = d.boards[0]!.circuits[ci]!;
                                    c.ocpd = { ...c.ocpd, curve: (e.target.value || undefined) as "B" | "C" | "D" | undefined };
                                  })
                                }
                              >
                                <option value="">-</option>
                                {CURVES.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                className="border-input w-20 rounded border bg-transparent px-1.5 py-1 text-sm"
                                value={circuit.ocpd?.ratingA ?? ""}
                                onChange={(e) =>
                                  update((d) => {
                                    const c = d.boards[0]!.circuits[ci]!;
                                    c.ocpd = { ...c.ocpd, ratingA: e.target.value === "" ? undefined : Number(e.target.value) };
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                step="0.01"
                                className={`border-input w-24 rounded border bg-transparent px-1.5 py-1 text-sm ${zsIssues.some((i) => i.severity === "error") ? "border-destructive" : ""}`}
                                value={tr?.zsOhms ?? ""}
                                onChange={(e) =>
                                  update((d) => { d.boards[0]!.testResults[ti]!.zsOhms = e.target.value === "" ? undefined : Number(e.target.value); })
                                }
                              />
                              <FieldIssues issues={zsIssues} />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                step="0.1"
                                className={`border-input w-24 rounded border bg-transparent px-1.5 py-1 text-sm ${irIssues.some((i) => i.severity === "error") ? "border-destructive" : ""}`}
                                value={tr?.insulationResistance?.liveEarthMohm ?? ""}
                                onChange={(e) =>
                                  update((d) => {
                                    const t = d.boards[0]!.testResults[ti]!;
                                    t.insulationResistance = {
                                      ...t.insulationResistance,
                                      liveEarthMohm: e.target.value === "" ? undefined : Number(e.target.value),
                                    };
                                  })
                                }
                              />
                              <FieldIssues issues={irIssues} />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                className={`border-input w-24 rounded border bg-transparent px-1.5 py-1 text-sm ${rcdIssues.some((i) => i.severity === "error") ? "border-destructive" : ""}`}
                                value={tr?.rcdOperatingTimeMs ?? ""}
                                onChange={(e) =>
                                  update((d) => { d.boards[0]!.testResults[ti]!.rcdOperatingTimeMs = e.target.value === "" ? undefined : Number(e.target.value); })
                                }
                              />
                              <FieldIssues issues={rcdIssues} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-center gap-1 pt-1.5">
                                <Checkbox
                                  checked={tr?.polarityConfirmed ?? false}
                                  onCheckedChange={(checked) =>
                                    update((d) => { d.boards[0]!.testResults[ti]!.polarityConfirmed = checked === true ? true : undefined; })
                                  }
                                />
                                <FieldIssues issues={polarityIssues} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove circuit"
                                onClick={() =>
                                  update((d) => {
                                    const b = d.boards[0]!;
                                    b.circuits = b.circuits.filter((c) => c.id !== circuit.id);
                                    b.testResults = b.testResults.filter((t) => t.circuitId !== circuit.id);
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Observations</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addObservation}>
                <Plus className="size-4" /> Add observation
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {cert.observations.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No observations recorded. If the installation has defects, record each one with a
                  classification code.
                </p>
              )}
              {cert.observations.map((obs, oi) => (
                <div key={obs.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_220px_auto]">
                  <TextField
                    label="Observation"
                    value={obs.description}
                    issues={issuesFor(`observations[${oi}].description`)}
                    onChange={(v) => update((d) => { d.observations[oi]!.description = v; })}
                  />
                  <SelectField
                    label="Code"
                    value={obs.code}
                    options={OBSERVATION_CODES}
                    issues={issuesFor(`observations[${oi}].code`)}
                    onChange={(v) =>
                      update((d) => { d.observations[oi]!.code = v as "C1" | "C2" | "C3" | "FI" | undefined; })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label="Remove observation"
                    onClick={() => update((d) => { d.observations = d.observations.filter((o) => o.id !== obs.id); })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary and declaration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Overall assessment"
                value={cert.overallAssessment}
                options={[
                  { value: "satisfactory", label: "Satisfactory" },
                  { value: "unsatisfactory", label: "Unsatisfactory" },
                ]}
                issues={issuesFor("overallAssessment")}
                onChange={(v) =>
                  update((d) => { d.overallAssessment = v as "satisfactory" | "unsatisfactory" | undefined; })
                }
              />
              <div />
              <TextField
                label="Inspector name"
                value={cert.inspector?.name}
                issues={issuesFor("inspector.name")}
                onChange={(v) => update((d) => { d.inspector = { ...d.inspector, name: v }; })}
              />
              <TextField
                label="Signed date"
                type="date"
                value={cert.inspectorSignedAt}
                issues={issuesFor("inspectorSignedAt")}
                onChange={(v) => update((d) => { d.inspectorSignedAt = v; })}
              />
            </CardContent>
          </Card>
        </fieldset>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <ValidationPanel result={validation} />
      </div>
    </div>
  );
}
