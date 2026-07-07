"use client";

import { CheckCircle2, Copy, Plus, Trash2, Undo2 } from "lucide-react";
import type { ConfirmOutcome, DistributionBoard, Eicr } from "@fieldcert/cert-schemas";
import type { ValidationIssue } from "@fieldcert/rules-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { BoardScan } from "@/lib/ai/extract";
import { ScanBoardButton } from "./ai-buttons";
import { ChipGroup, FieldIssues, NumberField, SelectField, TextField, ValueChips } from "./fields";

const CONFIRM_OPTIONS: Array<{ value: ConfirmOutcome; label: string; tone?: "danger" }> = [
  { value: "pass", label: "PASS" },
  { value: "fail", label: "FAIL", tone: "danger" },
  { value: "lim", label: "LIM" },
  { value: "na", label: "N/A" },
];

const MAIN_SWITCH_STANDARDS = [
  "BS EN 60947-3",
  "BS EN 60898",
  "BS EN 61008",
  "BS EN 61009",
  "BS 5419",
  "Other",
].map((v) => ({ value: v, label: v }));

const SPD_TYPES = ["Type 1", "Type 2", "Type 1+2", "Type 2+3", "Type 3"].map((v) => ({
  value: v,
  label: v,
}));

type Update = (mutate: (draft: Eicr) => void) => void;

function nextDesignation(boards: DistributionBoard[]): string {
  return `DB${boards.length + 1}`;
}

export function newBoard(designation: string): DistributionBoard {
  return { id: crypto.randomUUID(), designation, circuits: [], testResults: [] };
}

export function BoardsSection({
  cert,
  update,
  issuesFor,
  readOnly,
}: {
  cert: Eicr;
  update: Update;
  issuesFor: (field: string) => ValidationIssue[];
  readOnly: boolean;
}) {
  function addBoard() {
    update((d) => {
      d.boards.push(newBoard(nextDesignation(d.boards)));
    });
  }

  function copyBoard(bi: number) {
    update((d) => {
      const source = d.boards[bi]!;
      const clone = structuredClone(source);
      clone.id = crypto.randomUUID();
      clone.designation = nextDesignation(d.boards);
      clone.done = undefined;
      // Circuit layout carries over; measured results never do.
      clone.circuits = clone.circuits.map((c) => {
        const id = crypto.randomUUID();
        return { ...c, id };
      });
      clone.testResults = clone.circuits.map((c) => ({ circuitId: c.id }));
      d.boards.push(clone);
    });
  }

  function addCircuit(bi: number) {
    update((d) => {
      const board = d.boards[bi]!;
      const circuitId = crypto.randomUUID();
      board.circuits.push({ id: circuitId, circuitNumber: String(board.circuits.length + 1) });
      board.testResults.push({ circuitId });
    });
  }

  function applyScan(bi: number, scan: BoardScan) {
    update((d) => {
      const board = d.boards[bi]!;
      if (scan.boardDesignation) board.designation = scan.boardDesignation;
      for (const c of scan.circuits) {
        const circuitId = crypto.randomUUID();
        board.circuits.push({
          id: circuitId,
          circuitNumber: c.circuitNumber || String(board.circuits.length + 1),
          description: c.description || undefined,
          ocpd: { curve: c.curve ?? undefined, ratingA: c.ratingA ?? undefined },
        });
        board.testResults.push({ circuitId });
      }
    });
  }

  if (cert.boards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-muted-foreground text-center">
          No boards yet. Every installation has at least one consumer unit or distribution board.
        </p>
        <Button type="button" onClick={addBoard}>
          <Plus className="size-4" /> Add the first board
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {cert.boards.map((board, bi) => {
        const tested = board.testResults.filter(
          (t) => t.zsOhms !== undefined || t.insulationResistance !== undefined || t.rcdOperatingTimeMs !== undefined
        ).length;
        return (
          <div key={board.id} className={cn("rounded-xl border", board.done && "border-primary/50")}>
            {/* Board header */}
            <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  className="border-input h-10 w-28 rounded-lg border bg-transparent px-3 text-base font-bold"
                  value={board.designation ?? ""}
                  placeholder={`DB${bi + 1}`}
                  aria-label="Board designation"
                  onChange={(e) =>
                    update((d) => {
                      d.boards[bi]!.designation = e.target.value || undefined;
                    })
                  }
                />
                <span className="text-muted-foreground text-sm tabular-nums">
                  {board.circuits.length} circuit{board.circuits.length === 1 ? "" : "s"} ({tested} tested)
                </span>
                {board.done && (
                  <Badge className="gap-1">
                    <CheckCircle2 className="size-3" /> Done
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <ScanBoardButton onScan={(scan) => applyScan(bi, scan)} disabled={readOnly} />
                <Button type="button" variant="ghost" size="sm" onClick={() => copyBoard(bi)}>
                  <Copy className="size-4" /> Copy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    update((d) => {
                      d.boards[bi]!.done = d.boards[bi]!.done ? undefined : true;
                    })
                  }
                >
                  {board.done ? (
                    <>
                      <Undo2 className="size-4" /> Reopen
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Mark done
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete board ${board.designation ?? bi + 1}`}
                  onClick={() =>
                    update((d) => {
                      d.boards = d.boards.filter((b) => b.id !== board.id);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-4">
              {/* Board details */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TextField
                  label="Location"
                  placeholder="e.g. Hallway cupboard"
                  value={board.location}
                  onChange={(v) => update((d) => { d.boards[bi]!.location = v; })}
                />
                <TextField
                  label="Manufacturer"
                  placeholder="e.g. Hager"
                  value={board.manufacturer}
                  onChange={(v) => update((d) => { d.boards[bi]!.manufacturer = v; })}
                />
                <TextField
                  label="Supplied from"
                  placeholder="e.g. Origin"
                  value={board.suppliedFrom}
                  onChange={(v) => update((d) => { d.boards[bi]!.suppliedFrom = v; })}
                />
                <div className="flex flex-col gap-2">
                  <NumberField
                    label="Phases"
                    value={board.numberOfPhases}
                    onChange={(v) => update((d) => { d.boards[bi]!.numberOfPhases = v; })}
                  />
                  <ValueChips
                    values={[{ label: "1", value: 1 }, { label: "3", value: 3 }]}
                    onPick={(v) => update((d) => { d.boards[bi]!.numberOfPhases = Number(v); })}
                  />
                </div>
                <ChipGroup
                  label="Supply polarity confirmed"
                  value={board.supplyPolarityConfirmed}
                  options={CONFIRM_OPTIONS}
                  onChange={(v) =>
                    update((d) => { d.boards[bi]!.supplyPolarityConfirmed = v as ConfirmOutcome | undefined; })
                  }
                />
                <ChipGroup
                  label="Phase sequence confirmed"
                  value={board.phaseSequenceConfirmed}
                  options={CONFIRM_OPTIONS}
                  onChange={(v) =>
                    update((d) => { d.boards[bi]!.phaseSequenceConfirmed = v as ConfirmOutcome | undefined; })
                  }
                />
                <div className="flex flex-col gap-1">
                  <NumberField
                    label="Zs at board"
                    unit="ohms"
                    step="0.01"
                    value={board.zDbOhms}
                    onChange={(v) => update((d) => { d.boards[bi]!.zDbOhms = v; })}
                  />
                  <p className="text-muted-foreground text-xs">
                    Supply Ze: {cert.supply?.zeOhms !== undefined ? `${cert.supply.zeOhms} ohms` : "not recorded"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <NumberField
                    label="Ipf at board"
                    unit="kA"
                    step="0.1"
                    value={board.prospectiveFaultCurrentKa}
                    onChange={(v) => update((d) => { d.boards[bi]!.prospectiveFaultCurrentKa = v; })}
                  />
                  <p className="text-muted-foreground text-xs">
                    Supply Ipf:{" "}
                    {cert.supply?.prospectiveFaultCurrentKa !== undefined
                      ? `${cert.supply.prospectiveFaultCurrentKa} kA`
                      : "not recorded"}
                  </p>
                </div>
              </div>

              {/* Main switch */}
              <div className="rounded-lg border p-3">
                <p className="text-primary mb-3 text-xs font-bold tracking-widest uppercase">Main switch</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <SelectField
                    label="BS (EN)"
                    value={board.mainSwitch?.bsStandard}
                    options={MAIN_SWITCH_STANDARDS}
                    onChange={(v) =>
                      update((d) => {
                        const b = d.boards[bi]!;
                        b.mainSwitch = { ...b.mainSwitch, bsStandard: v };
                      })
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <NumberField
                      label="Voltage"
                      unit="V"
                      value={board.mainSwitch?.voltageV}
                      onChange={(v) =>
                        update((d) => {
                          const b = d.boards[bi]!;
                          b.mainSwitch = { ...b.mainSwitch, voltageV: v };
                        })
                      }
                    />
                    <ValueChips
                      values={[{ label: "230 V", value: 230 }, { label: "400 V", value: 400 }]}
                      onPick={(v) =>
                        update((d) => {
                          const b = d.boards[bi]!;
                          b.mainSwitch = { ...b.mainSwitch, voltageV: Number(v) };
                        })
                      }
                    />
                  </div>
                  <NumberField
                    label="Rated current"
                    unit="A"
                    value={board.mainSwitch?.ratingA}
                    onChange={(v) =>
                      update((d) => {
                        const b = d.boards[bi]!;
                        b.mainSwitch = { ...b.mainSwitch, ratingA: v };
                      })
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <NumberField
                      label="RCD rating"
                      unit="mA"
                      value={board.mainSwitch?.rcdIDeltaNMa}
                      onChange={(v) =>
                        update((d) => {
                          const b = d.boards[bi]!;
                          b.mainSwitch = { ...b.mainSwitch, rcdIDeltaNMa: v };
                        })
                      }
                    />
                    <ValueChips
                      values={[
                        { label: "30", value: 30 },
                        { label: "100", value: 100 },
                        { label: "300", value: 300 },
                      ]}
                      onPick={(v) =>
                        update((d) => {
                          const b = d.boards[bi]!;
                          b.mainSwitch = { ...b.mainSwitch, rcdIDeltaNMa: Number(v) };
                        })
                      }
                    />
                  </div>
                  <NumberField
                    label="RCD trip time"
                    unit="ms"
                    value={board.mainSwitch?.rcdTripTimeMs}
                    onChange={(v) =>
                      update((d) => {
                        const b = d.boards[bi]!;
                        b.mainSwitch = { ...b.mainSwitch, rcdTripTimeMs: v };
                      })
                    }
                  />
                </div>
              </div>

              {/* SPD */}
              <div className="rounded-lg border p-3">
                <p className="text-primary mb-3 text-xs font-bold tracking-widest uppercase">SPD details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="SPD type"
                    value={board.spd?.type}
                    options={SPD_TYPES}
                    onChange={(v) =>
                      update((d) => {
                        const b = d.boards[bi]!;
                        b.spd = { ...b.spd, type: v };
                      })
                    }
                  />
                  <ChipGroup
                    label="Operation status confirmed"
                    value={board.spd?.statusConfirmed}
                    options={CONFIRM_OPTIONS}
                    onChange={(v) =>
                      update((d) => {
                        const b = d.boards[bi]!;
                        b.spd = { ...b.spd, statusConfirmed: v as ConfirmOutcome | undefined };
                      })
                    }
                  />
                </div>
              </div>

              {/* Circuits */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-primary text-xs font-bold tracking-widest uppercase">Circuits</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => addCircuit(bi)}>
                    <Plus className="size-4" /> Add circuit
                  </Button>
                </div>
                {board.circuits.length === 0 ? (
                  <p className="text-muted-foreground py-3 text-center text-sm">
                    No circuits yet. Photograph the board with Scan board, or add circuits by hand.
                  </p>
                ) : (
                  board.circuits.map((circuit, ci) => {
                    const ti = board.testResults.findIndex((t) => t.circuitId === circuit.id);
                    const tr = ti >= 0 ? board.testResults[ti] : undefined;
                    const prefix = `boards[${bi}].testResults[${ti}]`;
                    return (
                      <div key={circuit.id} className="rounded-xl border p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex w-full items-center gap-3">
                            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                              {circuit.circuitNumber || ci + 1}
                            </span>
                            <input
                              className="border-input h-11 w-full min-w-40 rounded-lg border bg-transparent px-3 text-base"
                              value={circuit.description ?? ""}
                              placeholder="Circuit description, e.g. Kitchen sockets"
                              onChange={(e) =>
                                update((d) => {
                                  d.boards[bi]!.circuits[ci]!.description = e.target.value || undefined;
                                })
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
                                const b = d.boards[bi]!;
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
                                const c = d.boards[bi]!.circuits[ci]!;
                                c.ocpd = { ...c.ocpd, curve: v as "B" | "C" | "D" | undefined };
                              })
                            }
                          />
                          <div className="flex flex-col gap-2">
                            <NumberField
                              label="Rating"
                              unit="A"
                              value={circuit.ocpd?.ratingA}
                              onChange={(v) =>
                                update((d) => {
                                  const c = d.boards[bi]!.circuits[ci]!;
                                  c.ocpd = { ...c.ocpd, ratingA: v };
                                })
                              }
                            />
                            <ValueChips
                              values={[6, 16, 32, 40].map((n) => ({ label: `${n}A`, value: n }))}
                              onPick={(v) =>
                                update((d) => {
                                  const c = d.boards[bi]!.circuits[ci]!;
                                  c.ocpd = { ...c.ocpd, ratingA: Number(v) };
                                })
                              }
                            />
                          </div>
                          <NumberField
                            label="Zs"
                            unit="ohms"
                            step="0.01"
                            value={tr?.zsOhms}
                            issues={issuesFor(`${prefix}.zsOhms`)}
                            onChange={(v) => update((d) => { d.boards[bi]!.testResults[ti]!.zsOhms = v; })}
                          />
                          <NumberField
                            label="IR live to earth"
                            unit="Mohm"
                            step="0.1"
                            value={tr?.insulationResistance?.liveEarthMohm}
                            issues={issuesFor(`${prefix}.insulationResistance.liveEarthMohm`)}
                            onChange={(v) =>
                              update((d) => {
                                const t = d.boards[bi]!.testResults[ti]!;
                                t.insulationResistance = { ...t.insulationResistance, liveEarthMohm: v };
                              })
                            }
                          />
                          <NumberField
                            label="RCD trip time"
                            unit="ms"
                            value={tr?.rcdOperatingTimeMs}
                            issues={issuesFor(`${prefix}.rcdOperatingTimeMs`)}
                            onChange={(v) =>
                              update((d) => { d.boards[bi]!.testResults[ti]!.rcdOperatingTimeMs = v; })
                            }
                          />
                        </div>
                        <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
                          <Checkbox
                            checked={tr?.polarityConfirmed ?? false}
                            onCheckedChange={(checked) =>
                              update((d) => {
                                d.boards[bi]!.testResults[ti]!.polarityConfirmed =
                                  checked === true ? true : undefined;
                              })
                            }
                          />
                          <span className="text-sm font-medium">Polarity confirmed</span>
                        </label>
                        <FieldIssues issues={issuesFor(`${prefix}.polarityConfirmed`)} />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Notes</p>
                <textarea
                  rows={2}
                  className="border-input focus-visible:ring-ring w-full rounded-lg border bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
                  placeholder="Any additional information about this board..."
                  value={board.notes ?? ""}
                  onChange={(e) =>
                    update((d) => { d.boards[bi]!.notes = e.target.value || undefined; })
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" className="self-start" onClick={addBoard}>
        <Plus className="size-4" /> Add another board
      </Button>
    </div>
  );
}
