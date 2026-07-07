"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, Link2, Plus, Trash2, XCircle } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { BoardScan, ObservationDraft } from "@/lib/ai/extract";
import { DraftObservationButton, ScanBoardButton } from "./ai-buttons";
import { NumberField, SelectField, TextField, FieldIssues } from "./fields";

const OBSERVATION_CODES = [
  { value: "C1", label: "C1: Danger present" },
  { value: "C2", label: "C2: Potentially dangerous" },
  { value: "C3", label: "C3: Improvement recommended" },
  { value: "FI", label: "FI: Further investigation" },
];

const EARTHING = ["TN-S", "TN-C-S", "TT", "IT"].map((v) => ({ value: v, label: v }));

/** Rules that only make sense once the engineer tries to issue. Hidden inline until then. */
const ISSUE_STAGE_RULES = new Set(["eicr.completeness", "eicr.polarity.confirmed"]);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function Section({
  part,
  title,
  description,
  action,
  children,
}: {
  part: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <p className="text-primary text-xs font-bold tracking-widest uppercase">{part}</p>
          <CardTitle className="mt-1 text-lg">{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
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
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [busy, startAction] = useTransition();
  const readOnly = status !== "draft";

  const engineerMustSubmit = qsApprovalRequired && role === "engineer";
  const canApprove = role === "qs" || role === "admin";

  // The same statutory engine the server runs at issue time, live on every keystroke.
  const validation = useMemo(
    () => validateEicr(cert, { today: todayIso(), stage: "issue" }),
    [cert]
  );

  const issuesFor = useCallback(
    (field: string): ValidationIssue[] =>
      validation.issues.filter(
        (i) => i.field === field && (showAllIssues || !ISSUE_STAGE_RULES.has(i.rule))
      ),
    [validation, showAllIssues]
  );

  const update = useCallback((mutate: (draft: Eicr) => void) => {
    setCert((current) => {
      const draft = structuredClone(current);
      mutate(draft);
      return draft;
    });
  }, []);

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

  function guardedAction(fn: () => Promise<{ ok?: boolean; error?: string }>, success: string) {
    if (!validation.issuable) {
      setShowAllIssues(true);
      toast.error(
        `Fix ${validation.errorCount} highlighted issue${validation.errorCount === 1 ? "" : "s"} first`
      );
      return;
    }
    startAction(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        setShowAllIssues(true);
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  function plainAction(fn: () => Promise<{ ok?: boolean; error?: string; url?: string }>, success?: string) {
    startAction(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else if (success) {
        toast.success(success);
        router.refresh();
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

  function applyBoardScan(scan: BoardScan) {
    update((d) => {
      if (d.boards.length === 0) {
        d.boards.push({ id: crypto.randomUUID(), designation: "DB1", circuits: [], testResults: [] });
      }
      const board = d.boards[0]!;
      if (scan.boardDesignation) board.designation = scan.boardDesignation;
      for (const c of scan.circuits) {
        const circuitId = crypto.randomUUID();
        board.circuits.push({
          id: circuitId,
          circuitNumber: c.circuitNumber || String(board.circuits.length + 1),
          description: c.description || undefined,
          ocpd: {
            curve: c.curve ?? undefined,
            ratingA: c.ratingA ?? undefined,
          },
        });
        board.testResults.push({ circuitId });
      }
    });
  }

  function applyObservationDraft(draft: ObservationDraft) {
    update((d) => {
      d.observations.push({
        id: crypto.randomUUID(),
        description: draft.description,
        code: draft.code,
      });
    });
  }

  const board = cert.boards[0];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Sticky summary bar: state, live validation counts, actions */}
      <div className="bg-background/95 sticky top-0 z-10 -mx-2 rounded-xl border px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">EICR</h1>
            <StatusBadge status={status} />
            {!readOnly && (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  validation.issuable ? "text-primary" : "text-destructive"
                )}
              >
                {validation.issuable ? (
                  <>
                    <CheckCircle2 className="size-4" /> All checks pass
                  </>
                ) : (
                  <>
                    <XCircle className="size-4" /> {validation.errorCount} to fix
                  </>
                )}
                {validation.warningCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-4" /> {validation.warningCount}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {!readOnly && (
              <span className="text-muted-foreground text-xs">
                {saveState === "saving" ? "Saving" : saveState === "error" ? "Save failed" : "Saved"}
              </span>
            )}
            {status === "draft" && engineerMustSubmit && (
              <Button size="lg" onClick={() => guardedAction(() => submitForApproval(id), "Submitted for approval")} disabled={busy}>
                {busy ? "Submitting" : "Submit for approval"}
              </Button>
            )}
            {status === "draft" && !engineerMustSubmit && (
              <Button size="lg" onClick={() => guardedAction(() => issueCertificate(id), "Certificate issued")} disabled={busy}>
                {busy ? "Issuing" : "Issue certificate"}
              </Button>
            )}
            {status === "pending_approval" && canApprove && (
              <>
                <Button variant="outline" onClick={() => plainAction(() => returnToDraft(id), "Returned to draft")} disabled={busy}>
                  Return to draft
                </Button>
                <Button size="lg" onClick={() => guardedAction(() => issueCertificate(id), "Certificate issued")} disabled={busy}>
                  {busy ? "Issuing" : "Approve and issue"}
                </Button>
              </>
            )}
            {status === "issued" && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    startAction(async () => {
                      const result = await createShareLink(id);
                      if (result.url) window.open(result.url, "_blank");
                      else toast.error(result.error ?? "Could not fetch the PDF");
                    })
                  }
                  disabled={busy}
                >
                  <Download className="size-4" /> Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    startAction(async () => {
                      const result = await createShareLink(id);
                      if (result.url) {
                        await navigator.clipboard.writeText(result.url);
                        toast.success("Share link copied. Valid for 30 days");
                      } else {
                        toast.error(result.error ?? "Could not create a share link");
                      }
                    })
                  }
                  disabled={busy}
                >
                  <Link2 className="size-4" /> Copy share link
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <fieldset disabled={readOnly} className="flex flex-col gap-6">
        <Section part="Part 1" title="Client and installation" description="Who the report is for and where the installation is.">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Client name"
              placeholder="e.g. A Landlord Ltd"
              value={cert.client?.name}
              issues={issuesFor("client.name")}
              onChange={(v) => update((d) => { d.client = { ...d.client, name: v }; })}
            />
            <TextField
              label="Occupier"
              placeholder="e.g. Tenant"
              value={cert.occupier}
              onChange={(v) => update((d) => { d.occupier = v; })}
            />
            <TextField
              label="Installation address"
              placeholder="e.g. 12 High Street"
              value={cert.installationAddress?.line1}
              issues={issuesFor("installationAddress.line1")}
              onChange={(v) => update((d) => { d.installationAddress = { ...d.installationAddress, line1: v }; })}
            />
            <TextField
              label="Postcode"
              placeholder="e.g. HP7 0AA"
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
              placeholder="e.g. Whole installation"
              className="sm:col-span-2"
              value={cert.extentOfInstallationCovered}
              issues={issuesFor("extentOfInstallationCovered")}
              onChange={(v) => update((d) => { d.extentOfInstallationCovered = v; })}
            />
          </div>
        </Section>

        <Section part="Part 2" title="Supply characteristics" description="Details of the incoming supply and earthing.">
          <div className="grid gap-5 sm:grid-cols-3">
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
              label="Nominal voltage U0"
              unit="V"
              value={cert.supply?.nominalVoltageU0}
              onChange={(v) => update((d) => { d.supply = { ...d.supply, nominalVoltageU0: v }; })}
            />
            <NumberField
              label="Ze"
              unit="ohms"
              value={cert.supply?.zeOhms}
              onChange={(v) => update((d) => { d.supply = { ...d.supply, zeOhms: v }; })}
            />
          </div>
        </Section>

        <Section
          part="Part 3"
          title={`Circuits${board?.designation ? ` (${board.designation})` : ""}`}
          description="Each circuit with its protective device and test results. Zs is checked live against BS 7671 Table 41.3."
          action={
            <div className="flex items-center gap-2">
              <ScanBoardButton onScan={applyBoardScan} disabled={readOnly} />
              <Button type="button" variant="outline" onClick={addCircuit}>
                <Plus className="size-4" /> Add circuit
              </Button>
            </div>
          }
        >
          {!board || board.circuits.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No circuits yet. Photograph the board with Scan board, or add circuits by hand.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {board.circuits.map((circuit, ci) => {
                const ti = board.testResults.findIndex((t) => t.circuitId === circuit.id);
                const tr = ti >= 0 ? board.testResults[ti] : undefined;
                const zsIssues = issuesFor(`boards[0].testResults[${ti}].zsOhms`);
                const irIssues = issuesFor(`boards[0].testResults[${ti}].insulationResistance.liveEarthMohm`);
                const rcdIssues = issuesFor(`boards[0].testResults[${ti}].rcdOperatingTimeMs`);
                const polarityIssues = issuesFor(`boards[0].testResults[${ti}].polarityConfirmed`);
                return (
                  <div key={circuit.id} className="rounded-xl border p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg text-sm font-bold">
                          {circuit.circuitNumber || ci + 1}
                        </span>
                        <input
                          className="border-input h-11 w-full min-w-40 rounded-lg border bg-transparent px-3 text-base"
                          value={circuit.description ?? ""}
                          placeholder="Circuit description, e.g. Kitchen sockets"
                          onChange={(e) =>
                            update((d) => { d.boards[0]!.circuits[ci]!.description = e.target.value || undefined; })
                          }
                        />
                      </div>
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
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <SelectField
                        label="Breaker type"
                        value={circuit.ocpd?.curve}
                        options={[
                          { value: "B", label: "Type B" },
                          { value: "C", label: "Type C" },
                          { value: "D", label: "Type D" },
                        ]}
                        onChange={(v) =>
                          update((d) => {
                            const c = d.boards[0]!.circuits[ci]!;
                            c.ocpd = { ...c.ocpd, curve: v as "B" | "C" | "D" | undefined };
                          })
                        }
                      />
                      <NumberField
                        label="Rating"
                        unit="A"
                        value={circuit.ocpd?.ratingA}
                        onChange={(v) =>
                          update((d) => {
                            const c = d.boards[0]!.circuits[ci]!;
                            c.ocpd = { ...c.ocpd, ratingA: v };
                          })
                        }
                      />
                      <NumberField
                        label="Zs"
                        unit="ohms"
                        step="0.01"
                        value={tr?.zsOhms}
                        issues={zsIssues}
                        onChange={(v) => update((d) => { d.boards[0]!.testResults[ti]!.zsOhms = v; })}
                      />
                      <NumberField
                        label="IR live to earth"
                        unit="Mohm"
                        step="0.1"
                        value={tr?.insulationResistance?.liveEarthMohm}
                        issues={irIssues}
                        onChange={(v) =>
                          update((d) => {
                            const t = d.boards[0]!.testResults[ti]!;
                            t.insulationResistance = { ...t.insulationResistance, liveEarthMohm: v };
                          })
                        }
                      />
                      <NumberField
                        label="RCD trip time"
                        unit="ms"
                        value={tr?.rcdOperatingTimeMs}
                        issues={rcdIssues}
                        onChange={(v) => update((d) => { d.boards[0]!.testResults[ti]!.rcdOperatingTimeMs = v; })}
                      />
                    </div>
                    <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
                      <Checkbox
                        checked={tr?.polarityConfirmed ?? false}
                        onCheckedChange={(checked) =>
                          update((d) => { d.boards[0]!.testResults[ti]!.polarityConfirmed = checked === true ? true : undefined; })
                        }
                      />
                      <span className="text-sm font-medium">Polarity confirmed</span>
                    </label>
                    <FieldIssues issues={polarityIssues} />
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          part="Part 4"
          title="Observations"
          description="Defects and departures found during the inspection, each with its classification code."
          action={
            <div className="flex items-center gap-2">
              <DraftObservationButton onDraft={applyObservationDraft} disabled={readOnly} />
              <Button type="button" variant="outline" onClick={addObservation}>
                <Plus className="size-4" /> Add observation
              </Button>
            </div>
          }
        >
          {cert.observations.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No observations recorded. A clean installation can be issued without any.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {cert.observations.map((obs, oi) => (
                <div key={obs.id} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[1fr_230px_auto]">
                  <TextField
                    label="Observation"
                    placeholder="e.g. No RCD protection on socket circuits"
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
            </div>
          )}
        </Section>

        <Section part="Part 5" title="Summary and declaration" description="The overall verdict and who is signing it off.">
          <div className="grid gap-5 sm:grid-cols-2">
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
              placeholder="e.g. Dan Jordan"
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
          </div>
        </Section>
      </fieldset>
    </div>
  );
}
