import { z } from "zod";

/**
 * The EICR inspection schedule: condition report inspection checklist for
 * domestic and similar premises, modelled on the BS 7671 (IET model forms)
 * schedule of inspections with GN3 item numbering and regulation references.
 *
 * Outcomes follow the model form key:
 *   ok  - acceptable condition
 *   C1  - danger present, immediate action required
 *   C2  - potentially dangerous, urgent remedial action required
 *   C3  - improvement recommended
 *   FI  - further investigation required without delay
 *   LIM - limitation (not inspected; record in extent and limitations)
 *   NV  - not verified
 *   NA  - not applicable
 */
export const scheduleOutcome = z.enum(["ok", "C1", "C2", "C3", "FI", "LIM", "NV", "NA"]);
export type ScheduleOutcome = z.infer<typeof scheduleOutcome>;

export interface ScheduleItem {
  /** Model form item number, e.g. "4.10" or "5.12.1" */
  id: string;
  text: string;
  /** BS 7671 regulation references shown alongside the item */
  ref?: string;
}

export interface ScheduleSection {
  number: number;
  title: string;
  ref?: string;
  items: ScheduleItem[];
}

export const INSPECTION_SCHEDULE: ScheduleSection[] = [
  {
    number: 1,
    title: "External condition of intake equipment (visual inspection only)",
    items: [
      {
        id: "1.0",
        text: "Condition of intake equipment: service cable, service head, earthing arrangement, meter tails, metering equipment, isolator (where present)",
      },
      { id: "1.1", text: "Person ordering work / duty holder notified of inadequacies in the intake equipment" },
      { id: "1.2", text: "Consumer's isolator (where present)" },
      { id: "1.3", text: "Consumer's meter tails" },
    ],
  },
  {
    number: 2,
    title: "Presence of adequate arrangements for other sources such as microgenerators",
    ref: "551.6; 551.7",
    items: [
      {
        id: "2.0",
        text: "Presence of adequate arrangements for other sources such as microgenerators",
        ref: "551.6; 551.7",
      },
    ],
  },
  {
    number: 3,
    title: "Earthing / bonding arrangements",
    ref: "411.3; Chap 54",
    items: [
      {
        id: "3.1",
        text: "Presence and condition of distributor's earthing arrangement",
        ref: "542.1.2.1; 542.1.2.2",
      },
      {
        id: "3.2",
        text: "Presence and condition of earth electrode connection where applicable",
        ref: "542.1.2.3",
      },
      { id: "3.3", text: "Provision of earthing/bonding labels at all appropriate locations", ref: "514.13" },
      { id: "3.4", text: "Confirmation of earthing conductor size", ref: "542.3; 543.1.1" },
      { id: "3.5", text: "Accessibility and condition of earthing conductor at MET", ref: "543.3.2" },
      { id: "3.6", text: "Confirmation of main protective bonding conductor sizes", ref: "544.1" },
      {
        id: "3.7",
        text: "Condition and accessibility of main protective bonding conductor connections",
        ref: "543.3.2; 544.1.2",
      },
      {
        id: "3.8",
        text: "Accessibility and condition of other protective bonding connections",
        ref: "543.3.1; 543.3.2",
      },
    ],
  },
  {
    number: 4,
    title: "Consumer unit(s) / distribution board(s)",
    items: [
      {
        id: "4.1",
        text: "Adequacy of working space / accessibility to consumer unit / distribution board",
        ref: "132.12; 513.1",
      },
      { id: "4.2", text: "Security of fixing", ref: "134.1.1" },
      { id: "4.3", text: "Condition of enclosure(s) in terms of IP rating etc", ref: "416.2" },
      { id: "4.4", text: "Condition of enclosure(s) in terms of fire rating etc", ref: "421.1.201; 526.5" },
      { id: "4.5", text: "Enclosure not damaged/deteriorated so as to impair safety", ref: "651.2" },
      { id: "4.6", text: "Presence of main linked switch (as required by 462.1.201)", ref: "462.1.201" },
      { id: "4.7", text: "Operation of main switch (functional check)", ref: "643.10" },
      {
        id: "4.8",
        text: "Manual operation of circuit breakers and RCDs to prove disconnection",
        ref: "643.10",
      },
      {
        id: "4.9",
        text: "Correct identification of circuit details and protective devices",
        ref: "514.8.1; 514.9.1",
      },
      {
        id: "4.10",
        text: "Presence of RCD six-monthly test notice at or near consumer unit / distribution board",
        ref: "514.12.2",
      },
      {
        id: "4.11",
        text: "Presence of alternative supply warning notice at or near consumer unit / distribution board",
        ref: "514.15",
      },
      { id: "4.12", text: "Presence of other required labelling (please specify)", ref: "Section 514" },
      {
        id: "4.13",
        text: "Compatibility of protective devices, bases and other components; correct type and rating (no signs of unacceptable thermal damage, arcing or overheating)",
        ref: "411.3.2; 411.4; 411.5; 411.6; Sections 432, 433",
      },
      {
        id: "4.14",
        text: "Single-pole switching or protective devices in line conductors only",
        ref: "132.14.1; 530.3.3",
      },
      {
        id: "4.15",
        text: "Protection against mechanical damage where cables enter consumer unit / distribution board",
        ref: "522.8.1; 522.8.5; 522.8.11",
      },
      {
        id: "4.16",
        text: "Protection against electromagnetic effects where cables enter consumer unit / distribution board / enclosures",
        ref: "521.5.1",
      },
      {
        id: "4.17",
        text: "RCD(s) provided for fault protection - includes RCBOs",
        ref: "411.4.204; 411.5.2; 531.2",
      },
      {
        id: "4.18",
        text: "RCD(s) provided for additional protection / requirements - includes RCBOs",
        ref: "411.3.3; 415.1",
      },
      { id: "4.19", text: "Confirmation of indication that SPD is functional", ref: "651.4" },
      {
        id: "4.20",
        text: "Confirmation that ALL conductor connections, including connections to busbars, are correctly located in terminals and are tight and secure",
        ref: "526.1",
      },
      {
        id: "4.21",
        text: "Adequate arrangements where a generating set operates as a switched alternative to the public supply",
        ref: "551.6",
      },
      {
        id: "4.22",
        text: "Adequate arrangements where a generating set operates in parallel with the public supply",
        ref: "551.7",
      },
    ],
  },
  {
    number: 5,
    title: "Final circuits",
    items: [
      { id: "5.1", text: "Identification of conductors", ref: "514.3.1" },
      { id: "5.2", text: "Cables correctly supported throughout their run", ref: "521.10.202; 522.8.5" },
      { id: "5.3", text: "Condition of insulation of live parts", ref: "416.1" },
      {
        id: "5.4",
        text: "Non-sheathed cables protected by enclosure in conduit, ducting or trunking",
        ref: "521.10.1",
      },
      {
        id: "5.4.1",
        text: "To include the integrity of conduit and trunking systems (metal and plastic)",
      },
      {
        id: "5.5",
        text: "Adequacy of cables for current-carrying capacity with regard for the type and nature of installation",
        ref: "Section 523",
      },
      {
        id: "5.6",
        text: "Coordination between conductors and overload protective devices",
        ref: "433.1; 533.2.1",
      },
      {
        id: "5.7",
        text: "Adequacy of protective devices: type and rated current for fault protection",
        ref: "411.3",
      },
      {
        id: "5.8",
        text: "Presence and adequacy of circuit protective conductors",
        ref: "411.3.1; Section 543",
      },
      {
        id: "5.9",
        text: "Wiring system(s) appropriate for the type and nature of the installation and external influences",
        ref: "Section 522",
      },
      {
        id: "5.10",
        text: "Concealed cables installed in prescribed zones (see Extent and limitations)",
        ref: "522.6.202",
      },
      {
        id: "5.11",
        text: "Cables concealed under floors, above ceilings or in walls/partitions, adequately protected against damage (see Extent and limitations)",
        ref: "522.6.204",
      },
      {
        id: "5.12",
        text: "Provision of additional requirements for protection by RCD not exceeding 30 mA",
      },
      {
        id: "5.12.1",
        text: "For all socket-outlets of rating 32A or less, unless an exception is permitted",
        ref: "411.3.3",
      },
      {
        id: "5.12.2",
        text: "For the supply of mobile equipment not exceeding 32A rating for use outdoors",
        ref: "411.3.3",
      },
      {
        id: "5.12.3",
        text: "For cables concealed in walls at a depth of less than 50mm",
        ref: "522.6.202; 522.6.203",
      },
      {
        id: "5.12.4",
        text: "For cables concealed in walls / partitions containing metal parts regardless of depth",
        ref: "522.6.202; 522.6.203",
      },
      {
        id: "5.12.5",
        text: "For final circuits supplying luminaires within domestic (household) premises",
        ref: "411.3.4",
      },
      {
        id: "5.13",
        text: "Provision of fire barriers, sealing arrangements and protection against thermal effects",
        ref: "Section 527",
      },
      { id: "5.14", text: "Band II cables segregated / separated from Band I cables", ref: "528.1" },
      {
        id: "5.15",
        text: "Cables segregated / separated from communications cabling",
        ref: "528.2",
      },
      {
        id: "5.16",
        text: "Cables segregated / separated from non-electrical services",
        ref: "528.3",
      },
      {
        id: "5.17",
        text: "Termination of cables at enclosures - indicate extent of sampling in Extent and Limitations of the report",
        ref: "Section 526",
      },
      { id: "5.17.1", text: "Connections soundly made and under no undue strain", ref: "526.6" },
      {
        id: "5.17.2",
        text: "No basic insulation of a conductor visible outside enclosure",
        ref: "526.8",
      },
      { id: "5.17.3", text: "Connections of live conductors adequately enclosed", ref: "526.5" },
      {
        id: "5.17.4",
        text: "Adequately connected at point of entry to enclosure (glands, bushes etc.)",
        ref: "522.8.5",
      },
      {
        id: "5.18",
        text: "Condition of accessories including socket-outlets, switches and joint boxes",
        ref: "651.2",
      },
      { id: "5.19", text: "Suitability of accessories for external influences", ref: "512.2" },
      {
        id: "5.20",
        text: "Adequacy of working space / accessibility to equipment",
        ref: "132.12; 513.1",
      },
      {
        id: "5.21",
        text: "Single-pole switching or protective devices in line conductors only",
        ref: "132.14.1; 530.3.3",
      },
    ],
  },
  {
    number: 6,
    title: "Location(s) containing a bath or shower",
    items: [
      {
        id: "6.1",
        text: "Additional protection for all low voltage (LV) circuits by RCD not exceeding 30 mA",
        ref: "701.411.3.3",
      },
      {
        id: "6.2",
        text: "Where used as a protective measure, requirements for SELV or PELV met",
        ref: "701.414.4.5",
      },
      {
        id: "6.3",
        text: "Shaver sockets comply with BS EN 61558-2-5 formerly BS 3535",
        ref: "701.512.3",
      },
      {
        id: "6.4",
        text: "Presence of supplementary bonding conductors, unless not required by BS 7671:2018",
        ref: "701.415.2",
      },
      {
        id: "6.5",
        text: "Low voltage (e.g. 230 volt) socket-outlets sited at least 2.5m from zone 1",
        ref: "701.512.3",
      },
      {
        id: "6.6",
        text: "Suitability of equipment for external influences for installed location in terms of IP rating",
        ref: "701.512.2",
      },
      {
        id: "6.7",
        text: "Suitability of accessories and controlgear etc. for a particular zone",
        ref: "701.512.3",
      },
      {
        id: "6.8",
        text: "Suitability of current-using equipment for particular position within the location",
        ref: "701.55",
      },
    ],
  },
  {
    number: 7,
    title: "Other Part 7 special installations or locations",
    items: [
      { id: "7.02", text: "Swimming pools and other basins", ref: "Section 702" },
      { id: "7.03", text: "Rooms and cabins containing sauna heaters", ref: "Section 703" },
      {
        id: "7.04",
        text: "Construction and demolition site installations. (BS 7375 should also be consulted within this special location. Findings which contravene BS 7375 may need to be reported separately.)",
        ref: "Section 704",
      },
      { id: "7.05", text: "Agricultural and horticultural premises", ref: "Section 705" },
      { id: "7.06", text: "Conducting locations with restricted movement", ref: "Section 706" },
      {
        id: "7.08",
        text: "Electrical installations in caravan / camping parks and similar locations",
        ref: "Section 708",
      },
      { id: "7.09", text: "Marinas and similar locations", ref: "Section 709" },
      {
        id: "7.11",
        text: "Exhibitions, shows and stands. (BS 7909 should also be consulted within this special location. Findings which contravene BS 7909 may need to be reported separately.)",
        ref: "Section 711",
      },
      { id: "7.12", text: "Solar photovoltaic (PV) power supply systems", ref: "Section 712" },
      { id: "7.14", text: "Outdoor lighting installations", ref: "Section 714" },
      { id: "7.15", text: "Extra-low voltage lighting installations", ref: "Section 715" },
      { id: "7.17", text: "Mobile or transportable units", ref: "Section 717" },
      {
        id: "7.21",
        text: "Electrical installations in caravans and motor caravans",
        ref: "Section 721",
      },
      { id: "7.22", text: "Electric vehicle charging installations", ref: "Section 722" },
      { id: "7.29", text: "Operating and maintenance gangways", ref: "Section 729" },
      {
        id: "7.30",
        text: "Onshore units of electrical connections for inland navigation vessels",
        ref: "Section 730",
      },
      {
        id: "7.40",
        text: "Temporary electrical installations for structures, amusement devices and booths at fairgrounds, amusement parks and circuses. (BS 7909 should also be consulted within this special location. Findings which contravene BS 7909 may need to be reported separately.)",
        ref: "Section 740",
      },
      { id: "7.53", text: "Heating cables and embedded heating systems", ref: "Section 753" },
    ],
  },
];

/** Flat lookup of every schedule item by id. */
export const SCHEDULE_ITEMS: ReadonlyMap<string, ScheduleItem> = new Map(
  INSPECTION_SCHEDULE.flatMap((section) => section.items.map((item) => [item.id, item]))
);

export function scheduleSectionOf(itemId: string): ScheduleSection | undefined {
  return INSPECTION_SCHEDULE.find((s) => s.items.some((i) => i.id === itemId));
}
