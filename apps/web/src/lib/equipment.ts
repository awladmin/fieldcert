/** Instrument categories, matching the certificate's test instruments block. */
export const EQUIPMENT_KINDS = [
  "multifunction",
  "continuity",
  "insulationResistance",
  "earthFaultLoop",
  "rcd",
  "earthElectrode",
] as const;

export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export const EQUIPMENT_KIND_LABELS: Record<EquipmentKind, string> = {
  multifunction: "Multifunction",
  continuity: "Continuity",
  insulationResistance: "Insulation resistance",
  earthFaultLoop: "Earth fault loop",
  rcd: "RCD",
  earthElectrode: "Earth electrode",
};
