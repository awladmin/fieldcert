"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, Eye, Link2, Plus, Trash2, XCircle } from "lucide-react";
import type { Eicr } from "@fieldcert/cert-schemas";
import { validateEicr, type ValidationIssue } from "@fieldcert/rules-engine";
import {
  addAppendixPhoto,
  createShareLink,
  issueCertificate,
  previewCertificatePdf,
  removeAppendixPhoto,
  returnToDraft,
  saveCertificate,
  submitForApproval,
} from "@/actions/certificates";
import { openPdfBase64 } from "./open-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { ObservationDraft } from "@/lib/ai/extract";
import { DraftObservationButton } from "./ai-buttons";
import { BoardsSection } from "./boards-section";
import { ScheduleSection } from "./schedule-section";
import { ValidatePanel } from "./validate-panel";
import { VoidCertificate } from "./void-certificate";
import { ChipGroup, ChipMultiGroup, NumberField, SelectField, TextField, ValueChips } from "./fields";
import { LIVE_CONDUCTOR_TYPES } from "@fieldcert/cert-schemas";

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const PREMISES = [
  { value: "domestic", label: "Domestic" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "other", label: "Other" },
];

function boolToChip(value: boolean | undefined): string | undefined {
  return value === true ? "yes" : value === false ? "no" : undefined;
}

function chipToBool(value: string | undefined): boolean | undefined {
  return value === "yes" ? true : value === "no" ? false : undefined;
}

const OBSERVATION_CODES = [
  { value: "C1", label: "C1: Danger present" },
  { value: "C2", label: "C2: Potentially dangerous" },
  { value: "C3", label: "C3: Improvement recommended" },
  { value: "FI", label: "FI: Further investigation" },
];

const EARTHING = ["TN-S", "TN-C-S", "TT", "IT"].map((v) => ({ value: v, label: v }));
const CONDUCTOR_MATERIAL = ["Copper", "Aluminium"].map((v) => ({ value: v, label: v }));
const MEANS_OF_EARTHING = [
  { value: "distributor", label: "Distributor's facility (TN-S / TN-C-S)" },
  { value: "installation-electrode", label: "Installation earth electrode (TT)" },
];
const BONDED_SERVICES = ["Water", "Gas", "Oil", "Structural steel", "Lightning protection", "Other"].map(
  (v) => ({ value: v, label: v })
);

/** Rules that only make sense once the engineer tries to issue. Hidden inline until then. */
const ISSUE_STAGE_RULES = new Set(["eicr.completeness", "eicr.polarity.confirmed", "eicr.schedule.complete"]);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** anchorIso + n years, as YYYY-MM-DD. Runs in event handlers, not render. */
function addYears(anchorIso: string, years: number): string {
  const d = new Date(anchorIso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** A quiet sub-heading dividing a section into labelled groups of fields. */
function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground border-b pb-1 text-xs font-semibold tracking-wide uppercase">
      {children}
    </p>
  );
}

function Section({
  part,
  id,
  title,
  description,
  action,
  children,
}: {
  part: string;
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
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
  jobNumber,
  voidReason,
  equipment = [],
  role,
  qsApprovalRequired,
}: {
  id: string;
  status: string;
  initialData: Eicr;
  jobNumber?: string | null;
  voidReason?: string | null;
  equipment?: Array<{ kind: string; name: string; serial: string }>;
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

  function applyObservationDraft(draft: ObservationDraft) {
    update((d) => {
      d.observations.push({
        id: crypto.randomUUID(),
        description: draft.description,
        code: draft.code,
      });
    });
  }

  /** Jump from the Validate panel: reveal issue-stage rules inline, then scroll. */
  function jumpToSection(anchor: string) {
    setShowAllIssues(true);
    requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {status === "void" && (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 p-4 text-red-700 dark:text-red-300">
          <XCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">This certificate has been voided</p>
            <p className="text-sm">
              {voidReason ?? "See the audit trail below for details."} It remains on the register
              permanently and can no longer be shared or downloaded.
            </p>
          </div>
        </div>
      )}
      {/* Sticky summary bar: state, live validation counts, actions */}
      <div className="bg-background/95 sticky top-0 z-10 -mx-2 rounded-xl border px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{cert.reference ?? "EICR"}</h1>
            {cert.reference && <span className="text-muted-foreground text-sm">EICR</span>}
            {jobNumber && (
              <span className="text-muted-foreground text-sm">Job No: {jobNumber}</span>
            )}
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
            {!readOnly && <ValidatePanel validation={validation} onJump={jumpToSection} />}
            {status !== "issued" && (
              <Button
                variant="outline"
                onClick={() =>
                  startAction(async () => {
                    const result = await previewCertificatePdf(id);
                    if (result.base64) openPdfBase64(result.base64);
                    else toast.error(result.error ?? "Could not render the preview");
                  })
                }
                disabled={busy}
              >
                <Eye className="size-4" /> Preview PDF
              </Button>
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
            {status === "issued" && canApprove && <VoidCertificate id={id} reference={cert.reference ?? "this certificate"} />}
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
        <Section part="Part 1" id="part-1" title="Client and installation" description="Who the report is for and where the installation is.">
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
            <div className="flex flex-col gap-2">
              <TextField
                label="Next inspection due"
                type="date"
                value={cert.nextInspectionDue}
                issues={issuesFor("nextInspectionDue")}
                onChange={(v) => update((d) => { d.nextInspectionDue = v; })}
              />
              <div className="flex flex-wrap items-center gap-1">
                {[1, 3, 5, 10].map((yrs) => (
                  <button
                    key={yrs}
                    type="button"
                    onClick={() =>
                      update((d) => {
                        d.nextInspectionDue = addYears(cert.inspectionDate || todayIso(), yrs);
                      })
                    }
                    className="border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
                  >
                    +{yrs} yr{yrs === 1 ? "" : "s"}
                  </button>
                ))}
                <span className="text-muted-foreground ml-1 text-xs">
                  from {cert.inspectionDate ? "inspection date" : "today"}
                </span>
              </div>
            </div>
            <TextField
              label="Extent of installation covered"
              placeholder="e.g. Whole installation"
              className="sm:col-span-2"
              value={cert.extentOfInstallationCovered}
              issues={issuesFor("extentOfInstallationCovered")}
              onChange={(v) => update((d) => { d.extentOfInstallationCovered = v; })}
            />
            <TextField
              label="Reason for producing this report"
              placeholder="e.g. To ensure the installation is suitable for continued use"
              className="sm:col-span-2"
              value={cert.purposeOfReport}
              onChange={(v) => update((d) => { d.purposeOfReport = v; })}
            />
            <ChipGroup
              label="Description of premises"
              value={cert.descriptionOfPremises}
              options={PREMISES}
              onChange={(v) =>
                update((d) => {
                  d.descriptionOfPremises = v as "domestic" | "commercial" | "industrial" | "other" | undefined;
                })
              }
            />
            <NumberField
              label="Estimated age of wiring"
              unit="years"
              value={cert.estimatedAgeYears}
              onChange={(v) => update((d) => { d.estimatedAgeYears = v; })}
            />
            <ChipGroup
              label="Evidence of additions or alterations"
              value={boolToChip(cert.evidenceOfAlterations)}
              options={YES_NO}
              onChange={(v) => update((d) => { d.evidenceOfAlterations = chipToBool(v); })}
            />
            <div className="grid grid-cols-2 gap-4">
              <ChipGroup
                label="Records available (651.1)"
                value={boolToChip(cert.installationRecordsAvailable)}
                options={YES_NO}
                onChange={(v) => update((d) => { d.installationRecordsAvailable = chipToBool(v); })}
              />
              <TextField
                label="Date of last inspection"
                type="date"
                value={cert.dateOfLastInspection}
                onChange={(v) => update((d) => { d.dateOfLastInspection = v; })}
              />
            </div>
            <TextField
              label="Agreed limitations, with reasons (653.2)"
              placeholder="e.g. 10% sample of accessories removed for inspection"
              className="sm:col-span-2"
              value={cert.limitations}
              onChange={(v) => update((d) => { d.limitations = v; })}
            />
            <TextField
              label="Limitations agreed with"
              placeholder="e.g. Person ordering the report"
              value={cert.agreedWith}
              onChange={(v) => update((d) => { d.agreedWith = v; })}
            />
            <TextField
              label="Operational limitations"
              placeholder="e.g. Wiring inspected where visible"
              value={cert.operationalLimitations}
              onChange={(v) => update((d) => { d.operationalLimitations = v; })}
            />
          </div>
        </Section>

        <Section
          part="Part 2"
          id="part-2"
          title="Supply and installation particulars"
          description="The incoming supply, its earthing arrangement, and the installation's main earthing and bonding (Section J of the report)."
        >
          <div className="flex flex-col gap-8">
            {/* Supply */}
            <div className="flex flex-col gap-4">
              <SubHead>Supply</SubHead>
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
                <SelectField
                  label="Live conductors"
                  value={cert.supply?.liveConductors}
                  options={LIVE_CONDUCTOR_TYPES.map((v) => ({ value: v, label: v }))}
                  onChange={(v) => update((d) => { d.supply = { ...d.supply, liveConductors: v }; })}
                />
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Nominal frequency"
                    unit="Hz"
                    value={cert.supply?.frequencyHz}
                    onChange={(v) => update((d) => { d.supply = { ...d.supply, frequencyHz: v }; })}
                  />
                  <ValueChips
                    values={[{ label: "50 Hz", value: 50 }]}
                    onPick={(v) => update((d) => { d.supply = { ...d.supply, frequencyHz: Number(v) }; })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Nominal voltage U0 (line to earth)"
                    unit="V"
                    value={cert.supply?.nominalVoltageU0}
                    onChange={(v) => update((d) => { d.supply = { ...d.supply, nominalVoltageU0: v }; })}
                  />
                  <ValueChips
                    values={[{ label: "230 V", value: 230 }]}
                    onPick={(v) => update((d) => { d.supply = { ...d.supply, nominalVoltageU0: Number(v) }; })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Nominal voltage U (line to line)"
                    unit="V"
                    value={cert.supply?.nominalVoltageU}
                    onChange={(v) => update((d) => { d.supply = { ...d.supply, nominalVoltageU: v }; })}
                  />
                  <ValueChips
                    values={[
                      { label: "230 V", value: 230 },
                      { label: "400 V", value: 400 },
                    ]}
                    onPick={(v) => update((d) => { d.supply = { ...d.supply, nominalVoltageU: Number(v) }; })}
                  />
                </div>
                <NumberField
                  label="Prospective fault current Ipf"
                  unit="kA"
                  step="0.1"
                  value={cert.supply?.prospectiveFaultCurrentKa}
                  onChange={(v) => update((d) => { d.supply = { ...d.supply, prospectiveFaultCurrentKa: v }; })}
                />
                <NumberField
                  label="External loop impedance Ze"
                  unit="ohms"
                  step="0.01"
                  value={cert.supply?.zeOhms}
                  onChange={(v) => update((d) => { d.supply = { ...d.supply, zeOhms: v }; })}
                />
                <ChipGroup
                  label="Supply polarity confirmed"
                  value={boolToChip(cert.supply?.polarityConfirmed)}
                  options={YES_NO}
                  onChange={(v) => update((d) => { d.supply = { ...d.supply, polarityConfirmed: chipToBool(v) }; })}
                />
              </div>
            </div>

            {/* Supply protective device (cut-out) */}
            <div className="flex flex-col gap-4">
              <SubHead>Supply protective device (cut-out)</SubHead>
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <TextField
                    label="BS (EN)"
                    placeholder="e.g. BS 1361"
                    value={cert.supply?.supplyProtectiveDevice?.standard}
                    onChange={(v) =>
                      update((d) => {
                        d.supply = {
                          ...d.supply,
                          supplyProtectiveDevice: { ...d.supply?.supplyProtectiveDevice, standard: v },
                        };
                      })
                    }
                  />
                  <ValueChips
                    values={["BS 1361", "BS 88-3", "BS 3036"].map((s) => ({ label: s, value: s }))}
                    onPick={(v) =>
                      update((d) => {
                        d.supply = {
                          ...d.supply,
                          supplyProtectiveDevice: { ...d.supply?.supplyProtectiveDevice, standard: String(v) },
                        };
                      })
                    }
                  />
                </div>
                <TextField
                  label="Type"
                  placeholder="e.g. II"
                  value={cert.supply?.supplyProtectiveDevice?.type}
                  onChange={(v) =>
                    update((d) => {
                      d.supply = {
                        ...d.supply,
                        supplyProtectiveDevice: { ...d.supply?.supplyProtectiveDevice, type: v },
                      };
                    })
                  }
                />
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Rated current"
                    unit="A"
                    value={cert.supply?.supplyProtectiveDevice?.ratingA}
                    onChange={(v) =>
                      update((d) => {
                        d.supply = {
                          ...d.supply,
                          supplyProtectiveDevice: { ...d.supply?.supplyProtectiveDevice, ratingA: v },
                        };
                      })
                    }
                  />
                  <ValueChips
                    values={[60, 80, 100].map((n) => ({ label: `${n}A`, value: n }))}
                    onPick={(v) =>
                      update((d) => {
                        d.supply = {
                          ...d.supply,
                          supplyProtectiveDevice: { ...d.supply?.supplyProtectiveDevice, ratingA: Number(v) },
                        };
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section J: earthing and bonding */}
            <div className="flex flex-col gap-4">
              <SubHead>Earthing and main bonding</SubHead>
              <div className="grid gap-5 sm:grid-cols-3">
                <SelectField
                  label="Means of earthing"
                  value={cert.particulars?.meansOfEarthing}
                  options={MEANS_OF_EARTHING}
                  onChange={(v) =>
                    update((d) => {
                      d.particulars = {
                        ...d.particulars,
                        meansOfEarthing: v as "distributor" | "installation-electrode" | undefined,
                      };
                    })
                  }
                />
                <SelectField
                  label="Earthing conductor material"
                  value={cert.particulars?.earthingConductor?.material}
                  options={CONDUCTOR_MATERIAL}
                  onChange={(v) =>
                    update((d) => {
                      d.particulars = {
                        ...d.particulars,
                        earthingConductor: { ...d.particulars?.earthingConductor, material: v },
                      };
                    })
                  }
                />
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Earthing conductor CSA"
                    unit="mm²"
                    value={cert.particulars?.earthingConductor?.csaMm2}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          earthingConductor: { ...d.particulars?.earthingConductor, csaMm2: v },
                        };
                      })
                    }
                  />
                  <ValueChips
                    values={[6, 10, 16, 25].map((n) => ({ label: `${n}`, value: n }))}
                    onPick={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          earthingConductor: { ...d.particulars?.earthingConductor, csaMm2: Number(v) },
                        };
                      })
                    }
                  />
                </div>
                <SelectField
                  label="Main bonding material"
                  value={cert.particulars?.mainBondingConductor?.material}
                  options={CONDUCTOR_MATERIAL}
                  onChange={(v) =>
                    update((d) => {
                      d.particulars = {
                        ...d.particulars,
                        mainBondingConductor: { ...d.particulars?.mainBondingConductor, material: v },
                      };
                    })
                  }
                />
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Main bonding conductor CSA"
                    unit="mm²"
                    value={cert.particulars?.mainBondingConductor?.csaMm2}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          mainBondingConductor: { ...d.particulars?.mainBondingConductor, csaMm2: v },
                        };
                      })
                    }
                  />
                  <ValueChips
                    values={[10, 16, 25].map((n) => ({ label: `${n}`, value: n }))}
                    onPick={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          mainBondingConductor: { ...d.particulars?.mainBondingConductor, csaMm2: Number(v) },
                        };
                      })
                    }
                  />
                </div>
                <ChipMultiGroup
                  label="Main bonding to services"
                  className="sm:col-span-3"
                  values={cert.particulars?.bondedServices ?? []}
                  options={BONDED_SERVICES}
                  onChange={(next) =>
                    update((d) => {
                      d.particulars = { ...d.particulars, bondedServices: next };
                    })
                  }
                />
              </div>
              {(cert.particulars?.meansOfEarthing === "installation-electrode" ||
                cert.supply?.earthing === "TT") && (
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField
                    label="Earth electrode type"
                    placeholder="e.g. Rod"
                    value={cert.particulars?.earthElectrode?.type}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          earthElectrode: { ...d.particulars?.earthElectrode, type: v },
                        };
                      })
                    }
                  />
                  <TextField
                    label="Electrode location"
                    placeholder="e.g. External wall"
                    value={cert.particulars?.earthElectrode?.location}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          earthElectrode: { ...d.particulars?.earthElectrode, location: v },
                        };
                      })
                    }
                  />
                  <NumberField
                    label="Electrode resistance"
                    unit="ohms"
                    value={cert.particulars?.earthElectrode?.resistanceOhms}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          earthElectrode: { ...d.particulars?.earthElectrode, resistanceOhms: v },
                        };
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Main switch / switch-fuse at the origin */}
            <div className="flex flex-col gap-4">
              <SubHead>Main switch / switch-fuse</SubHead>
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField
                  label="Location"
                  placeholder="e.g. Hallway"
                  value={cert.particulars?.mainSwitch?.location}
                  onChange={(v) =>
                    update((d) => {
                      d.particulars = {
                        ...d.particulars,
                        mainSwitch: { ...d.particulars?.mainSwitch, location: v },
                      };
                    })
                  }
                />
                <TextField
                  label="BS (EN)"
                  placeholder="e.g. BS EN 60947-3"
                  value={cert.particulars?.mainSwitch?.bsStandard}
                  onChange={(v) =>
                    update((d) => {
                      d.particulars = {
                        ...d.particulars,
                        mainSwitch: { ...d.particulars?.mainSwitch, bsStandard: v },
                      };
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Rating"
                    unit="A"
                    value={cert.particulars?.mainSwitch?.ratingA}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          mainSwitch: { ...d.particulars?.mainSwitch, ratingA: v },
                        };
                      })
                    }
                  />
                  <NumberField
                    label="Poles"
                    value={cert.particulars?.mainSwitch?.poles}
                    onChange={(v) =>
                      update((d) => {
                        d.particulars = {
                          ...d.particulars,
                          mainSwitch: { ...d.particulars?.mainSwitch, poles: v },
                        };
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          part="Part 3"
          id="part-3"
          title="Boards and circuits"
          description="Each consumer unit or distribution board with its main switch, SPD and circuit test results. Zs is checked live against BS 7671 Table 41.3."
        >
          <BoardsSection certificateId={id} cert={cert} update={update} issuesFor={issuesFor} readOnly={readOnly} />
        </Section>

        <Section
          part="Part 4"
          id="part-4"
          title="Inspection schedule"
          description="The BS 7671 condition report checklist. Every item needs an outcome before the report can be issued; C1, C2 and FI items must be backed by an observation."
        >
          <ScheduleSection cert={cert} update={update} issuesFor={issuesFor} />
        </Section>

        <Section
          part="Part 5"
          id="part-5"
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
                <div key={obs.id} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[110px_1fr_230px_auto]">
                  <TextField
                    label="Item no"
                    placeholder="e.g. 4.10"
                    value={obs.itemNumber}
                    onChange={(v) => update((d) => { d.observations[oi]!.itemNumber = v; })}
                  />
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

        <Section part="Part 6" id="part-6" title="Summary and declaration" description="The overall verdict and who is signing it off.">
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
              label="General condition of the installation"
              placeholder="e.g. Installation is in good condition and wired to current standards"
              className="sm:col-span-2"
              value={cert.generalCondition}
              onChange={(v) => update((d) => { d.generalCondition = v; })}
            />
            <TextField
              label="Inspector name"
              placeholder="e.g. Dan Jordan"
              value={cert.inspector?.name}
              issues={issuesFor("inspector.name")}
              onChange={(v) => update((d) => { d.inspector = { ...d.inspector, name: v }; })}
            />
            <TextField
              label="Inspector position"
              placeholder="e.g. Electrician"
              value={cert.inspector?.position}
              onChange={(v) => update((d) => { d.inspector = { ...d.inspector, position: v }; })}
            />
            <TextField
              label="Scheme registration number"
              placeholder="e.g. 003293/000"
              value={cert.inspector?.registrationNumber}
              onChange={(v) => update((d) => { d.inspector = { ...d.inspector, registrationNumber: v }; })}
            />
            <TextField
              label="Signed date"
              type="date"
              value={cert.inspectorSignedAt}
              issues={issuesFor("inspectorSignedAt")}
              onChange={(v) => update((d) => { d.inspectorSignedAt = v; })}
            />
          </div>
          <div className="mt-5 rounded-lg border p-3">
            <p className="text-primary mb-3 text-xs font-bold tracking-widest uppercase">
              Test instruments used (serial or asset numbers)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["multifunction", "Multifunction"],
                  ["continuity", "Continuity"],
                  ["insulationResistance", "Insulation resistance"],
                  ["earthFaultLoop", "Earth fault loop"],
                  ["rcd", "RCD"],
                  ["earthElectrode", "Earth electrode"],
                ] as const
              ).map(([key, label]) => {
                const registered = equipment.filter((e) => e.kind === key);
                if (registered.length > 0) {
                  return (
                    <SelectField
                      key={key}
                      label={label}
                      value={cert.testInstruments?.[key]}
                      options={registered.map((e) => ({ value: e.serial, label: `${e.name} (${e.serial})` }))}
                      onChange={(v) =>
                        update((d) => {
                          d.testInstruments = { ...d.testInstruments, [key]: v };
                        })
                      }
                    />
                  );
                }
                return (
                  <TextField
                    key={key}
                    label={label}
                    value={cert.testInstruments?.[key]}
                    onChange={(v) =>
                      update((d) => {
                        d.testInstruments = { ...d.testInstruments, [key]: v };
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          part="Part 7"
          id="part-7"
          title="Appendix"
          description="Additional notes and site photos, rendered at the end of the certificate."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Additional information</p>
              <textarea
                rows={3}
                className="border-input focus-visible:ring-ring w-full rounded-lg border bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
                placeholder="Anything the reader of the certificate should know, e.g. smoke alarm replacement dates..."
                value={cert.appendixNotes ?? ""}
                onChange={(e) => update((d) => { d.appendixNotes = e.target.value || undefined; })}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Appendix photos</p>
              <label className="border-input hover:bg-muted flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-5 text-[0.95rem] font-medium transition-colors">
                <Plus className="size-4" /> Add photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.set("file", file);
                    startAction(async () => {
                      const result = await addAppendixPhoto(id, formData);
                      if (result.storagePath) {
                        update((d) => {
                          d.appendixPhotos.push({ id: crypto.randomUUID(), storagePath: result.storagePath! });
                        });
                        toast.success("Photo added to the appendix");
                      } else {
                        toast.error(result.error ?? "Upload failed");
                      }
                    });
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {cert.appendixPhotos.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-sm">
                No photos yet. Board shots, defects and meter positions all belong here.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {cert.appendixPhotos.map((photo, pi) => (
                  <div key={photo.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="text-muted-foreground font-mono text-xs">Photo {pi + 1}</span>
                    <input
                      className="border-input h-10 flex-1 rounded-lg border bg-transparent px-3 text-sm"
                      placeholder="Caption, e.g. Consumer unit, hallway"
                      value={photo.caption ?? ""}
                      onChange={(e) =>
                        update((d) => { d.appendixPhotos[pi]!.caption = e.target.value || undefined; })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove photo"
                      onClick={() => {
                        const path = photo.storagePath;
                        update((d) => {
                          d.appendixPhotos = d.appendixPhotos.filter((p) => p.id !== photo.id);
                        });
                        void removeAppendixPhoto(path);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </fieldset>
    </div>
  );
}
