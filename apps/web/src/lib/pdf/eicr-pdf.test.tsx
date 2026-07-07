import { describe, expect, it } from "vitest";
import { emptyEicr, type Eicr } from "@fieldcert/cert-schemas";
import { renderEicrPdfBuffer } from "./eicr-pdf";

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
});
