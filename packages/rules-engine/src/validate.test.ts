import { describe, expect, it } from "vitest";
import { emptyEicr, type Eicr } from "@fieldcert/cert-schemas";
import { validateEicr } from "./validate";
import { maxZsOhms } from "./tables/zs";

const TODAY = "2026-07-07";

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

describe("validateEicr: Zs limits (BS 7671 Table 41.3)", () => {
  it("computes tabulated max Zs for a B32", () => {
    const max = maxZsOhms({ id: "c1", ocpd: { curve: "B", ratingA: 32 } });
    expect(max).toBeCloseTo(1.37, 2);
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
