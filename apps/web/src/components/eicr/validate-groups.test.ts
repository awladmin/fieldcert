import { describe, expect, it } from "vitest";
import type { ValidationIssue } from "@fieldcert/rules-engine";
import { groupIssues } from "./validate-groups";

function issue(field: string): ValidationIssue {
  return { rule: "test", field, severity: "error", message: field, layer: "statutory" };
}

describe("groupIssues", () => {
  it("routes every known field family to its editor part", () => {
    const groups = groupIssues([
      issue("client.name"),
      issue("installationAddress.postcode"),
      issue("inspectionDate"),
      issue("supply.earthing"),
      issue("boards[0].testResults[2].zsOhms"),
      issue("inspectionSchedule.4.10"),
      issue("inspectionSchedule.section5"),
      issue("customScheduleItems[0].outcome"),
      issue("observations[1].code"),
      issue("overallAssessment"),
      issue("inspector.name"),
    ]);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.issues.map((i) => i.field)]));
    expect(byKey.client).toEqual(["client.name", "installationAddress.postcode", "inspectionDate"]);
    expect(byKey.supply).toEqual(["supply.earthing"]);
    expect(byKey.boards).toEqual(["boards[0].testResults[2].zsOhms"]);
    expect(byKey.schedule).toEqual([
      "inspectionSchedule.4.10",
      "inspectionSchedule.section5",
      "customScheduleItems[0].outcome",
    ]);
    expect(byKey.observations).toEqual(["observations[1].code"]);
    expect(byKey.summary).toEqual(["overallAssessment", "inspector.name"]);
  });

  it("unknown fields land in the summary catch-all, never lost", () => {
    const groups = groupIssues([issue("someFutureField")]);
    expect(groups.find((g) => g.key === "summary")?.issues).toHaveLength(1);
    const total = groups.reduce((n, g) => n + g.issues.length, 0);
    expect(total).toBe(1);
  });

  it("returns all six groups with anchors even when clean", () => {
    const groups = groupIssues([]);
    expect(groups).toHaveLength(6);
    expect(groups.map((g) => g.anchor)).toEqual([
      "part-1",
      "part-2",
      "part-3",
      "part-4",
      "part-5",
      "part-6",
    ]);
    expect(groups.every((g) => g.issues.length === 0)).toBe(true);
  });

  it("does not confuse prefixes: 'inspectorSignedAt' is summary, not part 1's 'inspectionDate'", () => {
    const groups = groupIssues([issue("inspectorSignedAt")]);
    expect(groups.find((g) => g.key === "summary")?.issues).toHaveLength(1);
    expect(groups.find((g) => g.key === "client")?.issues).toHaveLength(0);
  });
});
