import { describe, expect, it } from "vitest";
import { distributionBoard, eicr, emptyEicr } from "./eicr";

describe("eicr schema", () => {
  it("emptyEicr fills every collection default", () => {
    const cert = emptyEicr();
    expect(cert.kind).toBe("EICR");
    expect(cert.observations).toEqual([]);
    expect(cert.boards).toEqual([]);
    expect(cert.inspectionSchedule).toEqual({});
    expect(cert.customScheduleItems).toEqual([]);
  });

  it("parses certificates saved before the schedule existed", () => {
    // A pre-Phase-3 shape: no inspectionSchedule, no customScheduleItems, lean board
    const legacy = {
      kind: "EICR",
      client: { name: "A Landlord" },
      boards: [{ id: "db1", designation: "DB1", circuits: [], testResults: [] }],
      observations: [],
    };
    const parsed = eicr.parse(legacy);
    expect(parsed.inspectionSchedule).toEqual({});
    expect(parsed.customScheduleItems).toEqual([]);
    expect(parsed.boards[0]?.designation).toBe("DB1");
  });

  it("round-trips a fully specified board", () => {
    const board = distributionBoard.parse({
      id: "db1",
      designation: "DB1",
      location: "Hallway",
      manufacturer: "Hager",
      suppliedFrom: "Origin",
      numberOfPhases: 1,
      supplyPolarityConfirmed: "pass",
      phaseSequenceConfirmed: "na",
      zDbOhms: 0.35,
      prospectiveFaultCurrentKa: 1.2,
      mainSwitch: { bsStandard: "BS EN 60947-3", voltageV: 230, ratingA: 100, rcdIDeltaNMa: 30, rcdTripTimeMs: 28 },
      spd: { type: "Type 2", statusConfirmed: "pass" },
      notes: "Tight but accessible",
      done: true,
      circuits: [],
      testResults: [],
    });
    expect(board.mainSwitch?.rcdTripTimeMs).toBe(28);
    expect(board.spd?.statusConfirmed).toBe("pass");
    expect(board.done).toBe(true);
  });

  it("rejects invalid confirmation outcomes on boards", () => {
    const result = distributionBoard.safeParse({
      id: "db1",
      supplyPolarityConfirmed: "PASS",
      circuits: [],
      testResults: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid schedule outcomes on the certificate", () => {
    const result = eicr.safeParse({ kind: "EICR", inspectionSchedule: { "4.1": "maybe" } });
    expect(result.success).toBe(false);
  });

  it("rejects malformed dates", () => {
    const result = eicr.safeParse({ kind: "EICR", inspectionDate: "07/07/2026" });
    expect(result.success).toBe(false);
  });
});
