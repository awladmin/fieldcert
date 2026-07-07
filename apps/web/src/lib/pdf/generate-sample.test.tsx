import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { emptyEicr, type Eicr } from "@fieldcert/cert-schemas";
import { renderEicrPdfBuffer } from "./eicr-pdf";

/**
 * Generates public/sample-eicr.pdf (linked from the marketing site).
 * Run with: GENERATE_SAMPLE=1 pnpm vitest run generate-sample
 */
const enabled = process.env.GENERATE_SAMPLE === "1";

function sample(): Eicr {
  return {
    ...emptyEicr(),
    client: { name: "Amersham Lettings Ltd" },
    occupier: "Tenant",
    installationAddress: { line1: "12 High Street", town: "Amersham", county: "Buckinghamshire", postcode: "HP7 0AA" },
    inspectionDate: "2026-06-30",
    nextInspectionDue: "2031-06-30",
    extentOfInstallationCovered: "Whole installation",
    supply: { earthing: "TN-C-S", nominalVoltageU0: 230, zeOhms: 0.21 },
    overallAssessment: "satisfactory",
    inspector: { name: "D. Jordan" },
    inspectorSignedAt: "2026-06-30",
    observations: [
      { id: "o1", description: "No RCD test labels at consumer unit", code: "C3" },
      { id: "o2", description: "Bathroom supplementary bonding not verified at one location", code: "C3" },
    ],
    boards: [
      {
        id: "db1",
        designation: "DB1 (hallway)",
        circuits: [
          { id: "c1", circuitNumber: "1", description: "Kitchen ring", ocpd: { curve: "B", ratingA: 32 } },
          { id: "c2", circuitNumber: "2", description: "Downstairs sockets", ocpd: { curve: "B", ratingA: 32 } },
          { id: "c3", circuitNumber: "3", description: "Lighting ground floor", ocpd: { curve: "B", ratingA: 6 } },
          { id: "c4", circuitNumber: "4", description: "Electric shower", ocpd: { curve: "B", ratingA: 40 } },
        ],
        testResults: [
          { circuitId: "c1", zsOhms: 0.61, insulationResistance: { liveEarthMohm: 200 }, rcdOperatingTimeMs: 24, polarityConfirmed: true },
          { circuitId: "c2", zsOhms: 0.72, insulationResistance: { liveEarthMohm: 200 }, rcdOperatingTimeMs: 26, polarityConfirmed: true },
          { circuitId: "c3", zsOhms: 1.94, insulationResistance: { liveEarthMohm: 150 }, rcdOperatingTimeMs: 22, polarityConfirmed: true },
          { circuitId: "c4", zsOhms: 0.38, insulationResistance: { liveEarthMohm: 200 }, rcdOperatingTimeMs: 19, polarityConfirmed: true },
        ],
      },
    ],
  };
}

describe("sample certificate", () => {
  it.skipIf(!enabled)("writes public/sample-eicr.pdf", async () => {
    const buffer = await renderEicrPdfBuffer({
      cert: sample(),
      orgName: "Jordan Electrical Ltd",
      reference: "FC-SAMPLE01",
      issuedAt: "2026-07-07",
    });
    writeFileSync(join(__dirname, "../../../public/sample-eicr.pdf"), buffer);
  });
});
