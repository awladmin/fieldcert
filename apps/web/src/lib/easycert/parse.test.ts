import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { eicr } from "@fieldcert/cert-schemas";
import { parseEasycert } from "./parse";

const fixture = readFileSync(join(__dirname, "__fixtures__/sample-eicr.easycert"));

describe("parseEasycert", () => {
  it("maps the fixture into an EICR draft", () => {
    const result = parseEasycert(fixture);
    if (!result.ok) throw new Error(result.error);

    expect(result.clientName).toBe("Sample Housing");
    expect(result.data.client?.name).toBe("Sample Housing");
    expect(result.data.installationAddress?.line1).toBe("10 Sample Street");
    expect(result.data.installationAddress?.town).toBe("Testford");
    expect(result.data.installationAddress?.county).toBe("Testshire");
    expect(result.data.installationAddress?.postcode).toBe("AB12 3CD");
    expect(result.data.inspectionDate).toBe("2026-06-01");
    expect(result.data.nextInspectionDue).toBe("2031-06-01");
    expect(result.data.inspector?.name).toBe("Jane Tester");
    expect(result.data.inspector?.registrationNumber).toBe("000000/000");
    expect(result.photoEntries).toHaveLength(1);
    expect(result.addressLabel).toBe("10 Sample Street, Testford, AB12 3CD");
  });

  it("mapped data passes our schema so the editor can open it", () => {
    const result = parseEasycert(fixture);
    if (!result.ok) throw new Error(result.error);
    const parsed = eicr.safeParse(result.data);
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-zip buffer with a plain message", () => {
    const result = parseEasycert(strToU8("not a zip at all"));
    expect(result).toEqual({ ok: false, error: "This is not a readable .easycert file" });
  });

  it("rejects a zip without a certificate inside", () => {
    const zip = zipSync({ "photo.jpeg": strToU8("fake") });
    const result = parseEasycert(zip);
    expect(result).toEqual({ ok: false, error: "No certificate found inside the file" });
  });

  it("survives missing tags without inventing values", () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?><data><certificates><clientname>Bare Client</clientname></certificates></data>`;
    const zip = zipSync({ "certificate.easycert": strToU8(xml) });
    const result = parseEasycert(zip);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.client?.name).toBe("Bare Client");
    expect(result.data.installationAddress).toBeUndefined();
    expect(result.data.inspectionDate).toBeUndefined();
    expect(result.data.inspector).toBeUndefined();
  });

  it("drops malformed dates rather than guessing", () => {
    const xml = `<?xml version="1.0"?><data><main><inspectiondate>01/06/2026</inspectiondate></main></data>`;
    const zip = zipSync({ "certificate.easycert": strToU8(xml) });
    const result = parseEasycert(zip);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.inspectionDate).toBeUndefined();
  });
});
