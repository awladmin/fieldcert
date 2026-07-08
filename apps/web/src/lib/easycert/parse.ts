import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import type { Eicr } from "@fieldcert/cert-schemas";

/**
 * EasyCert (.easycert) import: a .easycert file is a ZIP holding a
 * `certificate.easycert` XML document (ISO-8859-1) plus any attached photos.
 * This parser is ported from the proven Tutaris validator and maps the fields
 * that are consistent across EasyCert's certificate types into an EICR draft.
 *
 * Deliberately conservative: header fields (client, installation address,
 * dates, engineer, registration) are mapped; circuit schedules are not,
 * because their tag names vary by certificate type and guessing them would
 * import wrong data. The original file is archived beside the draft so
 * nothing is ever lost.
 */

const MAX_ZIP_BYTES = 25 * 1024 * 1024;
const MAX_INNER_BYTES = 10 * 1024 * 1024;

export interface EasycertImport {
  ok: true;
  /** Partial EICR draft data mapped from the file */
  data: Eicr;
  /** EasyCert's own reference, when the file carries one */
  reference: string | null;
  clientName: string | null;
  addressLabel: string;
  inspectionDate: string | null;
  /** Names of photo entries bundled inside the file */
  photoEntries: string[];
}

export interface EasycertFailure {
  ok: false;
  error: string;
}

function text(node: unknown): string | null {
  if (node === null || node === undefined) return null;
  const s = String(node).trim();
  return s.length ? s : null;
}

/** EasyCert dates are YYYY-MM-DD already; anything else is dropped, not guessed. */
function isoDateOrNull(value: string | null): string | undefined {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return undefined;
}

export function parseEasycert(buffer: Uint8Array): EasycertImport | EasycertFailure {
  if (buffer.length > MAX_ZIP_BYTES) return { ok: false, error: "File is too large to import" };

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buffer);
  } catch {
    return { ok: false, error: "This is not a readable .easycert file" };
  }

  const names = Object.keys(files);
  const inner =
    names.find((n) => n.toLowerCase().endsWith("certificate.easycert")) ??
    names.find((n) => n.toLowerCase().endsWith(".easycert"));
  if (!inner) return { ok: false, error: "No certificate found inside the file" };
  if (files[inner]!.length > MAX_INNER_BYTES) {
    return { ok: false, error: "The certificate inside the file is too large to import" };
  }

  // The XML declares ISO-8859-1; decode as latin1 so accented names survive.
  const xmlText = Buffer.from(files[inner]!).toString("latin1");
  let parsed: Record<string, unknown>;
  try {
    parsed = new XMLParser({ ignoreAttributes: true, trimValues: true }).parse(xmlText) as Record<
      string,
      unknown
    >;
  } catch {
    return { ok: false, error: "The certificate contents could not be parsed" };
  }

  const data = (parsed.data ?? {}) as Record<string, unknown>;
  const certs = (data.certificates ?? {}) as Record<string, unknown>;
  const main = (data.main ?? {}) as Record<string, unknown>;

  const clientName = text(certs.clientname);
  const installationName = text(certs.installationname);
  const address1 = text(certs.installationaddress1);
  const address2 = text(certs.installationaddress2);
  const address3 = text(certs.installationaddress3);
  const postcode = text(certs.installationpostcode);
  const engineer = text(certs.engineer);
  const registrationNo = text(main.organisation1registrationno);
  const inspectionDate =
    text(main.inspectiondate) ?? text(main.signed1date) ?? text(certs.datecompleted);
  const nextDue = text(certs.datenexttest);
  const reference = text(certs.reference);

  // EasyCert puts the street address in installationname and uses the
  // numbered lines for locality; strip trailing commas it leaves behind.
  const clean = (s: string | null) => s?.replace(/,\s*$/, "") ?? undefined;
  const line1 = clean(installationName) ?? clean(address1);
  const town = clean(address2);
  const county = clean(address3);

  const eicrData: Eicr = {
    kind: "EICR",
    ...(reference ? { reference } : {}),
    ...(clientName ? { client: { name: clientName } } : {}),
    ...(line1 || postcode
      ? {
          installationAddress: {
            line1,
            ...(address1 && line1 !== clean(address1) ? { line2: clean(address1) } : {}),
            town,
            county,
            postcode: postcode ?? undefined,
          },
        }
      : {}),
    ...(isoDateOrNull(inspectionDate) ? { inspectionDate: isoDateOrNull(inspectionDate) } : {}),
    ...(isoDateOrNull(nextDue) ? { nextInspectionDue: isoDateOrNull(nextDue) } : {}),
    ...(engineer
      ? {
          inspector: {
            name: engineer,
            ...(registrationNo ? { registrationNumber: registrationNo } : {}),
          },
        }
      : {}),
    observations: [],
    boards: [],
    inspectionSchedule: {},
    customScheduleItems: [],
    appendixPhotos: [],
  };

  const photoEntries = names.filter((n) => /\.(jpe?g|png|heic|webp)$/i.test(n));
  const addressLabel = [line1, town, postcode].filter(Boolean).join(", ");

  return {
    ok: true,
    data: eicrData,
    reference,
    clientName,
    addressLabel,
    inspectionDate,
    photoEntries,
  };
}
