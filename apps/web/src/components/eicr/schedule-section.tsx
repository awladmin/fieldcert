"use client";

import { toast } from "sonner";
import { CheckCheck, Eraser, MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import {
  INSPECTION_SCHEDULE,
  type Eicr,
  type ScheduleOutcome,
} from "@fieldcert/cert-schemas";
import type { ValidationIssue } from "@fieldcert/rules-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChipGroup, FieldIssues } from "./fields";

const OUTCOME_OPTIONS: Array<{ value: ScheduleOutcome; label: string; tone?: "danger" | "warn" }> = [
  { value: "ok", label: "✓" },
  { value: "C1", label: "C1", tone: "danger" },
  { value: "C2", label: "C2", tone: "danger" },
  { value: "C3", label: "C3", tone: "warn" },
  { value: "FI", label: "FI", tone: "warn" },
  { value: "LIM", label: "LIM" },
  { value: "NV", label: "N/V" },
  { value: "NA", label: "N/A" },
];

const ADVERSE: ReadonlySet<string> = new Set(["C1", "C2", "FI"]);

type Update = (mutate: (draft: Eicr) => void) => void;

export function ScheduleSection({
  cert,
  update,
  issuesFor,
}: {
  cert: Eicr;
  update: Update;
  issuesFor: (field: string) => ValidationIssue[];
}) {
  const outcomes = cert.inspectionSchedule ?? {};

  /**
   * The R button: raises an observation carrying the item number so the
   * defect gets described and coded on the report. Adverse outcomes carry
   * their code across.
   */
  function raiseObservation(itemId: string) {
    const outcome = outcomes[itemId];
    const code = outcome && ADVERSE.has(outcome) ? (outcome as "C1" | "C2" | "FI") : undefined;
    update((d) => {
      d.observations.push({ id: crypto.randomUUID(), itemNumber: itemId, code });
    });
    toast.success(`Observation added for item ${itemId}. Describe the defect in Observations`);
  }

  function setSection(sectionNumber: number, outcome: ScheduleOutcome | undefined) {
    update((d) => {
      const section = INSPECTION_SCHEDULE.find((s) => s.number === sectionNumber)!;
      const next = { ...(d.inspectionSchedule ?? {}) };
      for (const item of section.items) {
        if (outcome === undefined) delete next[item.id];
        else next[item.id] = outcome;
      }
      d.inspectionSchedule = next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {INSPECTION_SCHEDULE.map((section) => {
        const marked = section.items.filter((i) => outcomes[i.id]).length;
        const complete = marked === section.items.length;
        const sectionIssues = issuesFor(`inspectionSchedule.section${section.number}`);
        return (
          <div key={section.number} className="rounded-xl border">
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b px-4 py-3",
                complete ? "bg-primary/5" : "bg-muted/40"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    complete ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  {section.number}
                </span>
                <div>
                  <p className="text-sm font-semibold">{section.title}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {marked} of {section.items.length} marked
                    {section.ref ? ` · ${section.ref}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSection(section.number, "ok")}>
                  <CheckCheck className="size-4" /> Set all ✓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSection(section.number, "NA")}
                >
                  All N/A
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSection(section.number, undefined)}
                >
                  <Eraser className="size-4" /> Clear
                </Button>
              </div>
            </div>
            {sectionIssues.length > 0 && (
              <div className="border-b px-4 py-2">
                <FieldIssues issues={sectionIssues} />
              </div>
            )}
            <div className="divide-y">
              {section.items.map((item) => {
                const sub = item.id.split(".").length > 2;
                const itemIssues = issuesFor(`inspectionSchedule.${item.id}`);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4",
                      sub && "pl-8"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground mr-2 font-mono text-xs font-semibold">
                          {item.id}
                        </span>
                        {item.text}
                      </p>
                      {item.ref && <p className="text-muted-foreground mt-0.5 text-xs">Regs: {item.ref}</p>}
                      <FieldIssues issues={itemIssues} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ChipGroup
                        label=""
                        size="sm"
                        value={outcomes[item.id]}
                        options={OUTCOME_OPTIONS}
                        onChange={(v) =>
                          update((d) => {
                            const next = { ...(d.inspectionSchedule ?? {}) };
                            if (v === undefined) delete next[item.id];
                            else next[item.id] = v as ScheduleOutcome;
                            d.inspectionSchedule = next;
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Raise an observation for item ${item.id}`}
                        title="Raise an observation for this item"
                        onClick={() => raiseObservation(item.id)}
                      >
                        <MessageSquarePlus className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Section 8: prosumer's low voltage installations, free-entry items */}
      <div className="rounded-xl border">
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
              8
            </span>
            <div>
              <p className="text-sm font-semibold">Prosumer&apos;s low voltage electrical installation(s)</p>
              <p className="text-muted-foreground text-xs">
                Chapter 82. Add checklist items where the installation includes additional requirements,
                e.g. battery storage or vehicle-to-grid.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              update((d) => {
                d.customScheduleItems.push({ id: crypto.randomUUID() });
              })
            }
          >
            <Plus className="size-4" /> Add item
          </Button>
        </div>
        {cert.customScheduleItems.length === 0 ? (
          <p className="text-muted-foreground px-4 py-3 text-sm">
            No additional items. Most domestic installations have none.
          </p>
        ) : (
          <div className="divide-y">
            {cert.customScheduleItems.map((item, i) => (
              <div key={item.id} className="flex flex-col gap-2 px-4 py-2.5 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs font-semibold">8.{i + 1}</span>
                  <input
                    className="border-input h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
                    placeholder="Enter description..."
                    value={item.description ?? ""}
                    onChange={(e) =>
                      update((d) => {
                        d.customScheduleItems[i]!.description = e.target.value || undefined;
                      })
                    }
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <ChipGroup
                    label=""
                    size="sm"
                    value={item.outcome}
                    issues={issuesFor(`customScheduleItems[${i}].outcome`)}
                    options={OUTCOME_OPTIONS}
                    onChange={(v) =>
                      update((d) => {
                        d.customScheduleItems[i]!.outcome = v as ScheduleOutcome | undefined;
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove item"
                    onClick={() =>
                      update((d) => {
                        d.customScheduleItems = d.customScheduleItems.filter((c) => c.id !== item.id);
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
