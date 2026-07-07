import { z } from "zod";
import {
  address,
  deviceCurve,
  earthingArrangement,
  isoDate,
  observationCode,
  ocpdStandard,
  person,
  rcdType,
} from "./common";

/**
 * Electrical Installation Condition Report — modelled on the BS 7671
 * (IET model forms) EICR structure.
 */

export const supplyCharacteristics = z.object({
  earthing: earthingArrangement.optional(),
  /** e.g. "1-phase 2-wire", "3-phase 4-wire" */
  liveConductors: z.string().optional(),
  nominalVoltageU0: z.number().optional(),
  nominalVoltageU: z.number().optional(),
  frequencyHz: z.number().optional(),
  /** Prospective fault current, kA */
  prospectiveFaultCurrentKa: z.number().optional(),
  /** External earth fault loop impedance Ze, ohms */
  zeOhms: z.number().optional(),
  supplyProtectiveDevice: z
    .object({
      standard: z.string().optional(),
      type: z.string().optional(),
      ratingA: z.number().optional(),
    })
    .optional(),
});
export type SupplyCharacteristics = z.infer<typeof supplyCharacteristics>;

export const installationParticulars = z.object({
  /** "distributor" | "installation electrode" */
  meansOfEarthing: z.enum(["distributor", "installation-electrode"]).optional(),
  earthElectrode: z
    .object({
      type: z.string().optional(),
      location: z.string().optional(),
      resistanceOhms: z.number().optional(),
    })
    .optional(),
  earthingConductor: z
    .object({ material: z.string().optional(), csaMm2: z.number().optional() })
    .optional(),
  mainBondingConductor: z
    .object({ material: z.string().optional(), csaMm2: z.number().optional() })
    .optional(),
  bondedServices: z.array(z.string()).optional(),
  mainSwitch: z
    .object({
      location: z.string().optional(),
      bsStandard: z.string().optional(),
      ratingA: z.number().optional(),
      poles: z.number().optional(),
    })
    .optional(),
});
export type InstallationParticulars = z.infer<typeof installationParticulars>;

export const observation = z.object({
  id: z.string(),
  itemNumber: z.string().optional(),
  description: z.string().optional(),
  code: observationCode.optional(),
  location: z.string().optional(),
  photoAssetIds: z.array(z.string()).optional(),
});
export type Observation = z.infer<typeof observation>;

export const circuitDetails = z.object({
  id: z.string(),
  circuitNumber: z.string().optional(),
  description: z.string().optional(),
  /** BS 7671 reference method, e.g. "A", "B", "C", "100", "102" */
  referenceMethod: z.string().optional(),
  wiringType: z.string().optional(),
  numberOfPoints: z.number().optional(),
  liveCsaMm2: z.number().optional(),
  cpcCsaMm2: z.number().optional(),
  /** Maximum permitted disconnection time, seconds */
  maxDisconnectionTimeS: z.number().optional(),
  ocpd: z
    .object({
      standard: ocpdStandard.optional(),
      curve: deviceCurve.optional(),
      ratingA: z.number().optional(),
      breakingCapacityKa: z.number().optional(),
    })
    .optional(),
  rcd: z
    .object({
      type: rcdType.optional(),
      ratingA: z.number().optional(),
      /** Residual operating current IΔn, mA */
      iDeltaNMa: z.number().optional(),
    })
    .optional(),
});
export type CircuitDetails = z.infer<typeof circuitDetails>;

export const circuitTestResults = z.object({
  circuitId: z.string(),
  /** Continuity R1+R2, ohms */
  r1PlusR2Ohms: z.number().optional(),
  /** Or R2 alone where measured */
  r2Ohms: z.number().optional(),
  ringContinuity: z
    .object({
      rLineOhms: z.number().optional(),
      rNeutralOhms: z.number().optional(),
      rCpcOhms: z.number().optional(),
    })
    .optional(),
  insulationResistance: z
    .object({
      testVoltageV: z.number().optional(),
      liveLiveMohm: z.number().optional(),
      liveEarthMohm: z.number().optional(),
    })
    .optional(),
  polarityConfirmed: z.boolean().optional(),
  /** Measured earth fault loop impedance Zs, ohms */
  zsOhms: z.number().optional(),
  rcdOperatingTimeMs: z.number().optional(),
  rcdTestButtonOk: z.boolean().optional(),
  afddTestOk: z.boolean().optional(),
  remarks: z.string().optional(),
});
export type CircuitTestResults = z.infer<typeof circuitTestResults>;

export const distributionBoard = z.object({
  id: z.string(),
  designation: z.string().optional(),
  location: z.string().optional(),
  /** Measured Zdb at the board, ohms */
  zDbOhms: z.number().optional(),
  prospectiveFaultCurrentKa: z.number().optional(),
  circuits: z.array(circuitDetails).default([]),
  testResults: z.array(circuitTestResults).default([]),
});
export type DistributionBoard = z.infer<typeof distributionBoard>;

export const eicr = z.object({
  kind: z.literal("EICR"),
  reference: z.string().optional(),

  client: person.optional(),
  installationAddress: address.optional(),
  occupier: z.string().optional(),
  descriptionOfPremises: z
    .enum(["domestic", "commercial", "industrial", "other"])
    .optional(),
  estimatedAgeYears: z.number().optional(),
  evidenceOfAlterations: z.boolean().optional(),
  purposeOfReport: z.string().optional(),

  inspectionDate: isoDate.optional(),
  nextInspectionDue: isoDate.optional(),
  /** Agreed limitations on the inspection */
  limitations: z.string().optional(),
  extentOfInstallationCovered: z.string().optional(),

  supply: supplyCharacteristics.optional(),
  particulars: installationParticulars.optional(),

  observations: z.array(observation).default([]),
  boards: z.array(distributionBoard).default([]),

  overallAssessment: z.enum(["satisfactory", "unsatisfactory"]).optional(),

  inspector: person.optional(),
  inspectorSignedAt: isoDate.optional(),
  qsReviewer: person.optional(),
  qsSignedAt: isoDate.optional(),
});
export type Eicr = z.infer<typeof eicr>;

/** A new, empty EICR draft */
export function emptyEicr(): Eicr {
  return eicr.parse({ kind: "EICR" });
}
