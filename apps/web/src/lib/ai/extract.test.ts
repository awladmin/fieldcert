import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanBoard } from "./extract";

/**
 * Live test against the Anthropic API using a real panel photograph.
 * Runs only when ANTHROPIC_API_KEY is set: pnpm vitest run extract
 */
const enabled = Boolean(process.env.ANTHROPIC_API_KEY);

describe("scanBoard (live)", () => {
  it.skipIf(!enabled)(
    "reads a real electrical panel photo without inventing data",
    async () => {
      const image = readFileSync(join(__dirname, "../../../public/images/pexels-257736.jpg"));
      const scan = await scanBoard(image.toString("base64"), "image/jpeg");

      expect(Array.isArray(scan.circuits)).toBe(true);
      for (const circuit of scan.circuits) {
        expect(typeof circuit.circuitNumber).toBe("string");
        if (circuit.curve !== null) expect(["B", "C", "D"]).toContain(circuit.curve);
        if (circuit.ratingA !== null) expect(circuit.ratingA).toBeGreaterThan(0);
      }
    },
    120_000
  );
});
