import { z } from "zod";

/**
 * Schemas describe the SHAPE of certificate data. Most fields are optional
 * because a draft certificate is legitimately incomplete; what must be
 * present (and consistent) at issue time is decided by @fieldcert/rules-engine,
 * which layers completeness/consistency/compliance rules over these types.
 */

export const address = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  town: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
});
export type Address = z.infer<typeof address>;

export const person = z.object({
  name: z.string().optional(),
  companyName: z.string().optional(),
  address: address.optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  /** Scheme registration number, e.g. NICEIC/NAPIT enrolment */
  registrationNumber: z.string().optional(),
});
export type Person = z.infer<typeof person>;

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const earthingArrangement = z.enum(["TN-S", "TN-C-S", "TT", "IT"]);
export type EarthingArrangement = z.infer<typeof earthingArrangement>;

/** BS 7671 observation classification codes */
export const observationCode = z.enum(["C1", "C2", "C3", "FI"]);
export type ObservationCode = z.infer<typeof observationCode>;

export const rcdType = z.enum(["AC", "A", "F", "B", "S"]);
export type RcdType = z.infer<typeof rcdType>;

/** Common OCPD device standards found on UK boards */
export const ocpdStandard = z.enum([
  "BS EN 60898",
  "BS EN 61009", // RCBO
  "BS EN 60947-2",
  "BS 88",
  "BS 3036",
  "BS 1361",
  "Other",
]);
export type OcpdStandard = z.infer<typeof ocpdStandard>;

/** Curve/type letter for MCBs/RCBOs (B/C/D per BS EN 60898/61009) */
export const deviceCurve = z.enum(["B", "C", "D"]);
export type DeviceCurve = z.infer<typeof deviceCurve>;
