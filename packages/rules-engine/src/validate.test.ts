import { describe, expect, it } from "vitest";
import {
  emptyEicr,
  INSPECTION_SCHEDULE,
  type Eicr,
  type ScheduleOutcome,
} from "@fieldcert/cert-schemas";
import { validateEicr } from "./validate";
import { maxZsOhms } from "./tables/zs";

const TODAY = "2026-07-07";

/** Every fixed schedule item marked with the same outcome. */
function fullSchedule(outcome: ScheduleOutcome = "ok"): Record<string, ScheduleOutcome> {
  return Object.fromEntries(
    INSPECTION_SCHEDULE.flatMap((s) => s.items.map((item) => [item.id, outcome]))
  );
}

function baseCert(): Eicr {
  return {
    ...emptyEicr(),
    installationAddress: { line1: "1 Test Street", postcode: "HP7 0AA" },
    client: { name: "A Landlord" },
    inspectionDate: "2026-07-01",
    nextInspectionDue: "2031-07-01",
    extentOfInstallationCovered: "Whole installation",
    supply: { earthing: "TN-C-S" },
    overallAssessment: "satisfactory",
    inspector: { name: "Dan Jordan" },
    inspectorSignedAt: "2026-07-01",
    inspectionSchedule: fullSchedule(),
  };
}

describe("validateEicr: completeness", () => {
  it("an empty draft has no completeness errors at draft stage", () => {
    const result = validateEicr(emptyEicr(), { today: TODAY, stage: "draft" });
    expect(result.issues.filter((i) => i.rule === "eicr.completeness")).toHaveLength(0);
  });

  it("an empty certificate cannot be issued", () => {
    const result = validateEicr(emptyEicr(), { today: TODAY, stage: "issue" });
    expect(result.issuable).toBe(false);
    expect(result.errorCount).toBeGreaterThanOrEqual(8);
  });

  it("a complete certificate is issuable", () => {
    const result = validateEicr(baseCert(), { today: TODAY, stage: "issue" });
    expect(result.issues).toEqual([]);
    expect(result.issuable).toBe(true);
  });
});

describe("validateEicr: assessment consistency", () => {
  it("rejects satisfactory verdict when a C1 observation exists", () => {
    const cert: Eicr = {
      ...baseCert(),
      observations: [{ id: "o1", description: "Exposed live busbar", code: "C1" }],
    };
    const result = validateEicr(cert, { today: TODAY });
    const found = result.issues.find((i) => i.rule === "eicr.assessment.consistency");
    expect(found?.severity).toBe("error");
    expect(found?.field).toBe("overallAssessment");
  });

  it("warns on unsatisfactory verdict with only C3 observations", () => {
    const cert: Eicr = {
      ...baseCert(),
      overallAssessment: "unsatisfactory",
      observations: [{ id: "o1", description: "No RCD labels", code: "C3" }],
    };
    const result = validateEicr(cert, { today: TODAY });
    const found = result.issues.find((i) => i.rule === "eicr.assessment.consistency");
    expect(found?.severity).toBe("warning");
  });

  it("flags observations missing code or description", () => {
    const cert: Eicr = {
      ...baseCert(),
      overallAssessment: undefined,
      observations: [{ id: "o1" }],
    };
    const result = validateEicr(cert, { today: TODAY });
    const rules = result.issues.map((i) => i.rule);
    expect(rules.filter((r) => r === "eicr.observations.complete")).toHaveLength(2);
  });
});

describe("validateEicr: inspection schedule", () => {
  it("an empty schedule blocks issue with one error per section", () => {
    const cert: Eicr = { ...baseCert(), inspectionSchedule: {} };
    const result = validateEicr(cert, { today: TODAY, stage: "issue" });
    const found = result.issues.filter((i) => i.rule === "eicr.schedule.complete");
    expect(found).toHaveLength(INSPECTION_SCHEDULE.length);
    expect(result.issuable).toBe(false);
  });

  it("does not demand schedule completion at draft stage", () => {
    const cert: Eicr = { ...baseCert(), inspectionSchedule: {} };
    const result = validateEicr(cert, { today: TODAY, stage: "draft" });
    expect(result.issues.filter((i) => i.rule === "eicr.schedule.complete")).toHaveLength(0);
  });

  it("rejects satisfactory verdict when a schedule item is C2", () => {
    const cert: Eicr = {
      ...baseCert(),
      inspectionSchedule: { ...fullSchedule(), "4.10": "C2" },
    };
    const result = validateEicr(cert, { today: TODAY });
    const found = result.issues.find((i) => i.rule === "eicr.assessment.consistency");
    expect(found?.severity).toBe("error");
    expect(found?.message).toContain("4.10");
  });

  it("requires an observation for every adverse schedule item", () => {
    const cert: Eicr = {
      ...baseCert(),
      overallAssessment: "unsatisfactory",
      inspectionSchedule: { ...fullSchedule(), "4.10": "C2" },
    };
    const unlinked = validateEicr(cert, { today: TODAY });
    expect(
      unlinked.issues.some((i) => i.rule === "eicr.schedule.observation-link" && i.field === "inspectionSchedule.4.10")
    ).toBe(true);

    const linked = validateEicr(
      {
        ...cert,
        observations: [{ id: "o1", description: "No RCD test notice", code: "C2", itemNumber: "4.10" }],
      },
      { today: TODAY }
    );
    expect(linked.issues.filter((i) => i.rule === "eicr.schedule.observation-link")).toHaveLength(0);
  });

  it("a fully marked schedule with NA outcomes is issuable", () => {
    const cert: Eicr = { ...baseCert(), inspectionSchedule: fullSchedule("NA") };
    const result = validateEicr(cert, { today: TODAY, stage: "issue" });
    expect(result.issues).toEqual([]);
  });

  it("custom schedule items need an outcome once described", () => {
    const cert: Eicr = {
      ...baseCert(),
      customScheduleItems: [{ id: "x1", description: "Battery storage isolation" }],
    };
    const result = validateEicr(cert, { today: TODAY, stage: "issue" });
    expect(
      result.issues.some((i) => i.rule === "eicr.schedule.complete" && i.field === "customScheduleItems[0].outcome")
    ).toBe(true);
  });
});

describe("validateEicr: Zs limits (BS 7671 Table 41.3)", () => {
  it("computes tabulated max Zs for a B32", () => {
    const max = maxZsOhms({ id: "c1", ocpd: { curve: "B", ratingA: 32 } });
    expect(max).toBeCloseTo(1.37, 2);
  });

  it("computes limits across curves: Zs halves from B to C and again to D", () => {
    // Zs = 230 x 0.95 / (k x In) with k = 5 / 10 / 20 for B / C / D
    const b16 = maxZsOhms({ id: "c", ocpd: { curve: "B", ratingA: 16 } });
    const c16 = maxZsOhms({ id: "c", ocpd: { curve: "C", ratingA: 16 } });
    const d16 = maxZsOhms({ id: "c", ocpd: { curve: "D", ratingA: 16 } });
    expect(b16).toBeCloseTo(2.73, 2);
    expect(c16).toBeCloseTo(1.37, 2);
    expect(d16).toBeCloseTo(0.68, 2);
  });

  it("returns null when the device is not fully specified", () => {
    expect(maxZsOhms({ id: "c" })).toBeNull();
    expect(maxZsOhms({ id: "c", ocpd: { curve: "B" } })).toBeNull();
    expect(maxZsOhms({ id: "c", ocpd: { ratingA: 32 } })).toBeNull();
  });

  function certWithZs(zsOhms: number): Eicr {
    return {
      ...baseCert(),
      boards: [
        {
          id: "db1",
          circuits: [{ id: "c1", circuitNumber: "1", ocpd: { curve: "B", ratingA: 32 } }],
          testResults: [{ circuitId: "c1", zsOhms }],
        },
      ],
    };
  }

  it("errors when Zs exceeds the tabulated maximum", () => {
    const result = validateEicr(certWithZs(1.5), { today: TODAY });
    const found = result.issues.find((i) => i.rule === "eicr.zs.max");
    expect(found?.severity).toBe("error");
  });

  it("warns between 80% and 100% of the maximum", () => {
    const result = validateEicr(certWithZs(1.2), { today: TODAY });
    const found = result.issues.find((i) => i.rule === "eicr.zs.max");
    expect(found?.severity).toBe("warning");
  });

  it("passes below 80% of the maximum", () => {
    const result = validateEicr(certWithZs(0.8), { today: TODAY });
    expect(result.issues.filter((i) => i.rule === "eicr.zs.max")).toHaveLength(0);
  });
});

describe("validateEicr: RCD, IR, polarity, dates", () => {
  it("errors when a general RCD takes longer than 300ms", () => {
    const cert: Eicr = {
      ...baseCert(),
      boards: [
        {
          id: "db1",
          circuits: [{ id: "c1", rcd: { type: "A", iDeltaNMa: 30 } }],
          testResults: [{ circuitId: "c1", rcdOperatingTimeMs: 350, polarityConfirmed: true }],
        },
      ],
    };
    const result = validateEicr(cert, { today: TODAY });
    expect(result.issues.some((i) => i.rule === "eicr.rcd.operating-time" && i.severity === "error")).toBe(true);
  });

  it("allows an S-type RCD up to 500ms", () => {
    const cert: Eicr = {
      ...baseCert(),
      boards: [
        {
          id: "db1",
          circuits: [{ id: "c1", rcd: { type: "S", iDeltaNMa: 100 } }],
          testResults: [{ circuitId: "c1", rcdOperatingTimeMs: 350 }],
        },
      ],
    };
    const result = validateEicr(cert, { today: TODAY });
    expect(result.issues.filter((i) => i.rule === "eicr.rcd.operating-time")).toHaveLength(0);
  });

  it("errors below 1MΩ insulation resistance and warns below 2MΩ", () => {
    const cert: Eicr = {
      ...baseCert(),
      boards: [
        {
          id: "db1",
          circuits: [{ id: "c1" }],
          testResults: [
            { circuitId: "c1", insulationResistance: { liveEarthMohm: 0.5 } },
            { circuitId: "c1", insulationResistance: { liveEarthMohm: 1.5 } },
          ],
        },
      ],
    };
    const result = validateEicr(cert, { today: TODAY });
    const ir = result.issues.filter((i) => i.rule === "eicr.insulation-resistance.min");
    expect(ir.map((i) => i.severity).sort()).toEqual(["error", "warning"]);
  });

  it("requires polarity confirmation at issue stage only", () => {
    const cert: Eicr = {
      ...baseCert(),
      boards: [{ id: "db1", circuits: [{ id: "c1" }], testResults: [{ circuitId: "c1" }] }],
    };
    expect(
      validateEicr(cert, { today: TODAY, stage: "draft" }).issues.filter((i) => i.rule === "eicr.polarity.confirmed")
    ).toHaveLength(0);
    expect(
      validateEicr(cert, { today: TODAY, stage: "issue" }).issues.filter((i) => i.rule === "eicr.polarity.confirmed")
    ).toHaveLength(1);
  });

  it("rejects future inspection dates and next-due before inspection", () => {
    const cert: Eicr = { ...baseCert(), inspectionDate: "2027-01-01", nextInspectionDue: "2026-01-01" };
    const result = validateEicr(cert, { today: TODAY });
    expect(result.issues.filter((i) => i.rule === "eicr.dates")).toHaveLength(2);
  });
});
