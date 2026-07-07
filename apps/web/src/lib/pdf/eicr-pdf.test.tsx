import { describe, expect, it } from "vitest";
import { emptyEicr, INSPECTION_SCHEDULE, type Eicr } from "@fieldcert/cert-schemas";
import { renderEicrPdfBuffer } from "./eicr-pdf";

function pageCount(buffer: Buffer): number {
  return (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

function sampleCert(): Eicr {
  return {
    ...emptyEicr(),
    client: { name: "A Landlord" },
    installationAddress: { line1: "1 Test Street", town: "Amersham", postcode: "HP7 0AA" },
    inspectionDate: "2026-07-01",
    nextInspectionDue: "2031-07-01",
    extentOfInstallationCovered: "Whole installation",
    supply: { earthing: "TN-C-S", nominalVoltageU0: 230, zeOhms: 0.3 },
    overallAssessment: "satisfactory",
    inspector: { name: "Dan Jordan" },
    inspectorSignedAt: "2026-07-01",
    observations: [{ id: "o1", description: "No RCD labels at board", code: "C3" }],
    boards: [
      {
        id: "db1",
        designation: "DB1",
        circuits: [
          { id: "c1", circuitNumber: "1", description: "Kitchen sockets", ocpd: { curve: "B", ratingA: 32 } },
        ],
        testResults: [
          {
            circuitId: "c1",
            zsOhms: 0.8,
            insulationResistance: { liveEarthMohm: 200 },
            rcdOperatingTimeMs: 22,
            polarityConfirmed: true,
          },
        ],
      },
    ],
  };
}

describe("renderEicrPdfBuffer", () => {
  it("produces a valid PDF document", async () => {
    const buffer = await renderEicrPdfBuffer({
      cert: sampleCert(),
      orgName: "Jordan Electrical Ltd",
      reference: "FC-TEST0001",
      issuedAt: "2026-07-07",
    });
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders an empty draft without crashing", async () => {
    const buffer = await renderEicrPdfBuffer({
      cert: emptyEicr(),
      orgName: "Test Org",
      reference: "FC-EMPTY001",
      issuedAt: "2026-07-07",
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders report, board schedules and inspection schedule as separate pages", async () => {
    const cert: Eicr = {
      ...sampleCert(),
      inspectionSchedule: Object.fromEntries(
        INSPECTION_SCHEDULE.flatMap((s) => s.items.map((i) => [i.id, "ok" as const]))
      ),
      customScheduleItems: [{ id: "x1", description: "Battery isolation", outcome: "NA" }],
      boards: [
        ...sampleCert().boards,
        { id: "db2", designation: "DB2", location: "Garage", circuits: [], testResults: [] },
      ],
    };
    const buffer = await renderEicrPdfBuffer({
      cert,
      orgName: "Jordan Electrical Ltd",
      reference: "FC-TEST0002",
      issuedAt: "2026-07-07",
    });
    // Page 1 report, 1+ board pages, 2+ schedule pages (92 items span pages)
    expect(pageCount(buffer)).toBeGreaterThanOrEqual(4);
  });

  it("an empty draft has no board page but always carries the schedule", async () => {
    const buffer = await renderEicrPdfBuffer({
      cert: emptyEicr(),
      orgName: "Test Org",
      reference: "FC-EMPTY002",
      issuedAt: "2026-07-07",
    });
    expect(pageCount(buffer)).toBeGreaterThanOrEqual(3);
  });
});
