/* eslint-disable jsx-a11y/alt-text -- react-pdf Image, not a DOM element */
import {
  Document,
  Font,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CertificateBranding } from "./branding";
import { FORM_FONT_BOLD, FORM_FONT_ITALIC, FORM_FONT_REGULAR } from "./fonts/fonts-data";
import {
  INSPECTION_SCHEDULE,
  LIVE_CONDUCTOR_TYPES,
  type DistributionBoard,
  type Eicr,
  type ScheduleOutcome,
} from "@fieldcert/cert-schemas";
import { maxZsOhms } from "@fieldcert/rules-engine";

Font.register({
  family: "Form",
  fonts: [
    { src: FORM_FONT_REGULAR },
    { src: FORM_FONT_BOLD, fontWeight: "bold" },
    { src: FORM_FONT_ITALIC, fontStyle: "italic" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

/**
 * The EICR as engineers actually hand it over, built to the design language
 * shared by the real-world outputs we hold (Tysoft EasyCert and iCertifi
 * samples) on top of the BS 7671 Appendix 6 model form content: coloured
 * lettered section bars, grey panels with white value boxes, colour-filled
 * outcome and classification chips, the green/red verdict block, and the
 * combined landscape schedule of circuit details and test results.
 * The accent colour becomes per-organisation in the branding phase.
 */

export interface EicrPdfProps {
  cert: Eicr;
  orgName: string;
  reference: string;
  issuedAt: string;
  jobNumber?: string | null;
  branding?: CertificateBranding;
  /** Diagonal text on every page, e.g. NOT VALID FOR ISSUE on draft previews */
  watermark?: string;
  /** storagePath -> data URL for appendix photos */
  appendixPhotoData?: Record<string, string>;
  /** Public verification URL printed in the footer of issued certificates */
  verifyUrl?: string;
}

export async function renderEicrPdfBuffer(props: EicrPdfProps): Promise<Buffer> {
  return renderToBuffer(<EicrPdf {...props} />);
}

const ACCENT = "#157a49";
const INK = "#111111";
const PANEL = "#ececec";
const BOX_BORDER = "#8f8f8f";
const GREEN = "#27a544";
const RED = "#e02020";
const ORANGE = "#f28c28";
const YELLOW = "#f2e520";
const LAVENDER = "#cfc9ef";
const LIGHT_BLUE = "#bfe0ef";

const s = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 40, paddingHorizontal: 26, fontSize: 7.5, fontFamily: "Form", color: INK },
  bar: {
    backgroundColor: ACCENT,
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 8.5,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  panel: { backgroundColor: PANEL, padding: 5, marginBottom: 6 },
  label: { fontSize: 7 },
  boxValue: {
    backgroundColor: "#ffffff",
    borderWidth: 0.6,
    borderColor: BOX_BORDER,
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontWeight: "bold",
    minHeight: 11,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 3, gap: 4 },
  small: { fontSize: 6.3, lineHeight: 1.25 },
  bold: { fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#333333",
  },
  chip: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 34,
  },
  chipText: { fontWeight: "bold", fontSize: 7 },
  gridCell: { borderRightWidth: 0.5, borderRightColor: BOX_BORDER, paddingVertical: 2, paddingHorizontal: 1, justifyContent: "center" },
  gridHead: { fontWeight: "bold", fontSize: 5.6, textAlign: "center" },
  gridTd: { fontSize: 6.2, textAlign: "center" },
});

function fmt(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value);
}

function SectionBar({ letter, title, accent }: { letter?: string; title: string; accent?: string }) {
  return (
    <Text style={[s.bar, accent ? { backgroundColor: accent } : {}]}>
      {letter ? `${letter}. ` : ""}
      {title.toUpperCase()}
    </Text>
  );
}

function Watermark({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Text
      fixed
      style={{
        position: "absolute",
        top: "42%",
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 52,
        fontWeight: "bold",
        color: "#e02020",
        opacity: 0.16,
        transform: "rotate(-24deg)",
      }}
    >
      {text}
    </Text>
  );
}

/** Label beside a white value box, the field idiom of the real certificates. */
function Field({
  label,
  value,
  flex = 1,
  unit,
}: {
  label: string;
  value?: string | number | boolean | null;
  flex?: number;
  unit?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flex, gap: 3 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.boxValue, { flex: 1 }]}>{fmt(value)}</Text>
      {unit ? <Text style={s.label}>{unit}</Text> : null}
    </View>
  );
}

/** A white box holding a drawn tick, or text such as N/A. */
function MarkBox({ state }: { state: "tick" | "cross" | string }) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderWidth: 0.6,
        borderColor: BOX_BORDER,
        width: 26,
        height: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {state === "tick" ? (
        <Svg width={9} height={9} viewBox="0 0 10 10">
          <Path d="M1.5 5.5 L4 8 L8.5 2" stroke={INK} strokeWidth={1.6} fill="none" />
        </Svg>
      ) : state === "cross" ? (
        <Svg width={8} height={8} viewBox="0 0 10 10">
          <Path d="M2 2 L8 8 M8 2 L2 8" stroke={INK} strokeWidth={1.4} fill="none" />
        </Svg>
      ) : (
        <Text style={{ fontSize: 6.5 }}>{state}</Text>
      )}
    </View>
  );
}

function Choice({ label, state }: { label: string; state: "tick" | string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginRight: 8 }}>
      <Text style={s.label}>{label}</Text>
      <MarkBox state={state} />
    </View>
  );
}

/** Colour-filled outcome chip, exactly as the real schedules print them. */
function OutcomeChip({ outcome }: { outcome?: ScheduleOutcome }) {
  if (!outcome) return <View style={s.chip} />;
  const map: Record<ScheduleOutcome, { bg: string; fg: string; label: string }> = {
    ok: { bg: GREEN, fg: "#ffffff", label: "Pass" },
    C1: { bg: RED, fg: "#ffffff", label: "C1" },
    C2: { bg: RED, fg: "#ffffff", label: "C2" },
    C3: { bg: ORANGE, fg: "#111111", label: "C3" },
    FI: { bg: YELLOW, fg: "#111111", label: "FI" },
    NV: { bg: LAVENDER, fg: "#111111", label: "N/V" },
    LIM: { bg: LIGHT_BLUE, fg: "#111111", label: "LIM" },
    NA: { bg: "#ffffff", fg: "#111111", label: "N/A" },
  };
  const m = map[outcome];
  return (
    <View style={[s.chip, { backgroundColor: m.bg }]}>
      <Text style={[s.chipText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

function CodeChip({ code }: { code?: string }) {
  const bg = code === "C1" || code === "C2" ? RED : code === "C3" ? ORANGE : code === "FI" ? YELLOW : "#ffffff";
  const fg = code === "C1" || code === "C2" ? "#ffffff" : "#111111";
  return (
    <View style={{ backgroundColor: bg, alignItems: "center", justifyContent: "center", flex: 1 }}>
      <Text style={{ color: fg, fontWeight: "bold", fontSize: 7.5 }}>{code ?? ""}</Text>
    </View>
  );
}

function Footer({ reference, verifyUrl }: { reference: string; verifyUrl?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={{ flex: 1, paddingRight: 8 }}>
        This form is based on the model shown in Appendix 6 of BS 7671:2018 (as amended). Produced using FieldCert.
        {verifyUrl ? `  Verify: ${verifyUrl}` : ""}
      </Text>
      <Text
        style={{ width: 130, textAlign: "right" }}
        render={({ pageNumber, totalPages }) => `Ref: ${reference} - Page: ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

const CONCEALED_CABLES =
  "It should be noted that cables concealed within trunking and conduits, under floors, in roof spaces, and generally within the fabric of the building or underground, have not been inspected unless specifically agreed between the client and inspector prior to the inspection. An inspection should be made within an accessible roof space housing other electrical equipment.";

const DECLARATION =
  "I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), particulars of which are described above, having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, including the observations and the attached schedules, provides an accurate assessment of the condition of the electrical installation taking into account the stated extent and limitations in section D of this report.";

const RECOMMENDATIONS_TEXT =
  "Where the overall assessment of the suitability of the installation for continued use above is stated as UNSATISFACTORY, I/we recommend that any observations classified as 'Danger present' (code C1) or 'Potentially dangerous' (code C2) are acted upon as a matter of urgency. Investigation without delay is recommended for observations identified as 'Further investigation required' (code FI). Observations classified as 'Improvement recommended' (code C3) should be given due consideration.";

/* ------------------------------------------------------------------ */
/* Landscape combined schedule                                          */
/* ------------------------------------------------------------------ */

interface ColDef {
  label: string;
  width: number | null;
  group: string;
  value: (board: DistributionBoard, ci: number) => string | { mark: "tick" };
}

function tr(board: DistributionBoard, ci: number) {
  const circuit = board.circuits[ci]!;
  return board.testResults.find((t) => t.circuitId === circuit.id);
}

const COLS: ColDef[] = [
  { label: "Circuit number", width: 24, group: "", value: (b, i) => fmt(b.circuits[i]!.circuitNumber) },
  { label: "Circuit description", width: null, group: "", value: (b, i) => fmt(b.circuits[i]!.description) },
  { label: "Type of wiring", width: 24, group: "Conductor details", value: (b, i) => fmt(b.circuits[i]!.wiringType) },
  { label: "Reference method", width: 26, group: "Conductor details", value: (b, i) => fmt(b.circuits[i]!.referenceMethod) },
  { label: "Number of points served", width: 26, group: "Conductor details", value: (b, i) => fmt(b.circuits[i]!.numberOfPoints) },
  { label: "Live (mm²)", width: 24, group: "Conductor details", value: (b, i) => fmt(b.circuits[i]!.liveCsaMm2) },
  { label: "cpc (mm²)", width: 24, group: "Conductor details", value: (b, i) => fmt(b.circuits[i]!.cpcCsaMm2) },
  { label: "Max disconnect time (s)", width: 28, group: "Conductor details", value: (b, i) => fmt(b.circuits[i]!.maxDisconnectionTimeS) },
  { label: "BS (EN)", width: 38, group: "Overcurrent protective device", value: (b, i) => fmt(b.circuits[i]!.ocpd?.standard) },
  { label: "Type", width: 20, group: "Overcurrent protective device", value: (b, i) => fmt(b.circuits[i]!.ocpd?.curve) },
  { label: "Rating (A)", width: 24, group: "Overcurrent protective device", value: (b, i) => fmt(b.circuits[i]!.ocpd?.ratingA) },
  { label: "Breaking capacity (kA)", width: 28, group: "Overcurrent protective device", value: (b, i) => fmt(b.circuits[i]!.ocpd?.breakingCapacityKa) },
  {
    label: "Maximum permitted Zs (Ω)",
    width: 30,
    group: "Overcurrent protective device",
    value: (b, i) => {
      const max = maxZsOhms(b.circuits[i]!);
      return max === null ? "" : max.toFixed(2);
    },
  },
  { label: "BS (EN)", width: 34, group: "RCD", value: (b, i) => (b.circuits[i]!.rcd ? "61008/9" : "") },
  { label: "Type", width: 20, group: "RCD", value: (b, i) => fmt(b.circuits[i]!.rcd?.type) },
  { label: "IΔn (mA)", width: 24, group: "RCD", value: (b, i) => fmt(b.circuits[i]!.rcd?.iDeltaNMa) },
  { label: "Rating (A)", width: 24, group: "RCD", value: (b, i) => fmt(b.circuits[i]!.rcd?.ratingA) },
  { label: "r1 (line) (Ω)", width: 24, group: "Continuity (Ω)", value: (b, i) => fmt(tr(b, i)?.ringContinuity?.rLineOhms) },
  { label: "rn (neutral) (Ω)", width: 24, group: "Continuity (Ω)", value: (b, i) => fmt(tr(b, i)?.ringContinuity?.rNeutralOhms) },
  { label: "r2 (cpc) (Ω)", width: 24, group: "Continuity (Ω)", value: (b, i) => fmt(tr(b, i)?.ringContinuity?.rCpcOhms) },
  { label: "R1+R2 (Ω)", width: 26, group: "Continuity (Ω)", value: (b, i) => fmt(tr(b, i)?.r1PlusR2Ohms) },
  { label: "R2 (Ω)", width: 22, group: "Continuity (Ω)", value: (b, i) => fmt(tr(b, i)?.r2Ohms) },
  { label: "Test voltage (V)", width: 26, group: "Insulation resistance", value: (b, i) => fmt(tr(b, i)?.insulationResistance?.testVoltageV) },
  { label: "Live-Live (MΩ)", width: 26, group: "Insulation resistance", value: (b, i) => fmt(tr(b, i)?.insulationResistance?.liveLiveMohm) },
  { label: "Live-Earth (MΩ)", width: 26, group: "Insulation resistance", value: (b, i) => fmt(tr(b, i)?.insulationResistance?.liveEarthMohm) },
  { label: "Polarity", width: 22, group: "", value: (b, i) => (tr(b, i)?.polarityConfirmed ? { mark: "tick" } : "") },
  { label: "Maximum measured Zs (Ω)", width: 30, group: "Zs", value: (b, i) => fmt(tr(b, i)?.zsOhms) },
  { label: "Disconnect time (ms)", width: 30, group: "RCD test", value: (b, i) => fmt(tr(b, i)?.rcdOperatingTimeMs) },
  { label: "Test button", width: 26, group: "RCD test", value: (b, i) => (tr(b, i)?.rcdTestButtonOk ? { mark: "tick" } : "") },
  { label: "AFDD test", width: 24, group: "", value: (b, i) => (tr(b, i)?.afddTestOk ? { mark: "tick" } : "") },
];

const MIN_CIRCUIT_ROWS = 10;

function CombinedSchedule({ board }: { board: DistributionBoard }) {
  const rows = Math.max(board.circuits.length, MIN_CIRCUIT_ROWS);
  return (
    <View style={{ borderWidth: 0.8, borderColor: INK }}>
      {/* Group header: circuit details vs test results */}
      <View style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: INK, backgroundColor: "#dddddd" }}>
        <View style={{ flex: 2.9, borderRightWidth: 0.6, borderRightColor: INK, alignItems: "center" }}>
          <Text style={[s.bold, { fontSize: 6.5 }]}>CIRCUIT DETAILS</Text>
        </View>
        <View style={{ flex: 1.55, alignItems: "center" }}>
          <Text style={[s.bold, { fontSize: 6.5 }]}>TEST RESULT DETAILS</Text>
        </View>
      </View>
      {/* Column labels */}
      <View style={{ flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: INK, backgroundColor: PANEL, minHeight: 34 }}>
        {COLS.map((col, i) => (
          <View key={i} style={[s.gridCell, col.width ? { width: col.width } : { flex: 1 }]}>
            <Text style={s.gridHead}>{col.label}</Text>
          </View>
        ))}
      </View>
      {Array.from({ length: rows }, (_, ci) => (
        <View
          key={ci}
          style={{ flexDirection: "row", borderBottomWidth: ci === rows - 1 ? 0 : 0.4, borderBottomColor: BOX_BORDER, minHeight: 13 }}
          wrap={false}
        >
          {COLS.map((col, i) => {
            const value = ci < board.circuits.length ? col.value(board, ci) : "";
            return (
              <View key={i} style={[s.gridCell, col.width ? { width: col.width } : { flex: 1 }, { alignItems: "center" }]}>
                {typeof value === "object" ? (
                  <Svg width={8} height={8} viewBox="0 0 10 10">
                    <Path d="M1.5 5.5 L4 8 L8.5 2" stroke={INK} strokeWidth={1.6} fill="none" />
                  </Svg>
                ) : (
                  <Text style={[s.gridTd, col.width === null ? { textAlign: "left", alignSelf: "stretch", paddingLeft: 2 } : {}]}>
                    {value}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const WIRING_CODES: Array<[string, string]> = [
  ["A", "Thermoplastic insulated/sheathed cables"],
  ["B", "Thermoplastic cables in metallic conduit"],
  ["C", "Thermoplastic cables in nonmetallic conduit"],
  ["D", "Thermoplastic cables in metallic trunking"],
  ["E", "Thermoplastic cables in nonmetallic trunking"],
  ["F", "Thermoplastic /SWA cables"],
  ["G", "Thermosetting /SWA cables"],
  ["H", "Mineral insulated cables"],
  ["O", "Other"],
];

/* ------------------------------------------------------------------ */
/* Document                                                             */
/* ------------------------------------------------------------------ */

const MIN_OBSERVATION_ROWS = 6;

export function EicrPdf({
  cert,
  orgName,
  reference,
  issuedAt,
  branding,
  watermark,
  appendixPhotoData,
  verifyUrl,
}: EicrPdfProps) {
  const accent = branding?.accentColor ?? ACCENT;
  const outcomes = cert.inspectionSchedule ?? {};
  const satisfactory = cert.overallAssessment === "satisfactory";
  const premises = cert.descriptionOfPremises;
  const supply = cert.supply;
  const particulars = cert.particulars;
  const bonded = new Set((particulars?.bondedServices ?? []).map((b) => b.toLowerCase()));

  const itemsByCode = (code: string) =>
    cert.observations
      .map((o, i) => ({ n: i + 1, code: o.code }))
      .filter((o) => o.code === code)
      .map((o) => o.n)
      .join(", ") || "N/A";

  const premisesChoice = (kind: string) => (premises === kind ? "tick" : "N/A");

  return (
    <Document title={`EICR ${reference}`} author={orgName} creator="FieldCert">
      {/* ---------------- Page 1: header + A-F ---------------- */}
      <Page size="A4" style={s.page}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6, marginBottom: 4 }}>
          <Field label="Date" value={issuedAt.slice(0, 10)} flex={0.35} />
          <Field label="Certificate Serial No/Ref:" value={reference} flex={0.5} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {branding?.logoDataUrl ? (
            <Image src={branding.logoDataUrl} style={{ maxHeight: 42, maxWidth: 120, objectFit: "contain" }} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: accent, fontSize: 15, fontWeight: "bold" }}>{orgName}</Text>
            <Text style={{ fontSize: 13.5, fontWeight: "bold", marginBottom: 1 }}>
              Electrical Installation Condition Report
            </Text>
            <Text style={s.small}>
              (Requirements for Electrical Installations - BS 7671 IET Wiring Regulations)
            </Text>
          </View>
          {branding?.schemeLogoDataUrl ? (
            <Image src={branding.schemeLogoDataUrl} style={{ maxHeight: 38, maxWidth: 90, objectFit: "contain" }} />
          ) : null}
        </View>

        <SectionBar accent={accent} letter="A" title="Details of the client or person ordering the work" />
        <View style={s.panel}>
          <View style={s.row}>
            <Field label="Name:" value={cert.client?.name ?? cert.client?.companyName} />
          </View>
          <View style={s.row}>
            <Field
              label="Address:"
              value={[cert.client?.address?.line1, cert.client?.address?.town, cert.client?.address?.postcode]
                .filter(Boolean)
                .join(", ")}
            />
          </View>
        </View>

        <SectionBar accent={accent} letter="B" title="Reason for producing this report" />
        <View style={s.panel}>
          <View style={s.row}>
            <Text style={[s.boxValue, { flex: 1, minHeight: 20 }]}>{fmt(cert.purposeOfReport)}</Text>
          </View>
          <View style={[s.row, { justifyContent: "flex-end" }]}>
            <Field label="Date(s) inspection and testing carried out:" value={cert.inspectionDate} flex={0.6} />
          </View>
        </View>

        <SectionBar accent={accent} letter="C" title="Details of the installation which is the subject of this report" />
        <View style={s.panel}>
          <View style={s.row}>
            <Field label="Occupier:" value={cert.occupier} />
          </View>
          <View style={s.row}>
            <Field
              label="Address:"
              value={[
                cert.installationAddress?.line1,
                cert.installationAddress?.line2,
                cert.installationAddress?.town,
                cert.installationAddress?.county,
                cert.installationAddress?.postcode,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </View>
          <View style={s.row}>
            <Text style={s.label}>Description of premises:</Text>
            <Choice label="Domestic" state={premisesChoice("domestic")} />
            <Choice label="Commercial" state={premisesChoice("commercial")} />
            <Choice label="Industrial" state={premisesChoice("industrial")} />
            <Choice label="Other" state={premisesChoice("other")} />
          </View>
          <View style={s.row}>
            <Field label="Estimated age of the wiring system" value={cert.estimatedAgeYears} flex={0.5} unit="Years" />
            <Text style={s.label}>Evidence of additions or alterations:</Text>
            <Choice label="Yes" state={cert.evidenceOfAlterations === true ? "tick" : "N/A"} />
            <Choice label="No" state={cert.evidenceOfAlterations === false ? "tick" : "N/A"} />
          </View>
          <View style={s.row}>
            <Text style={s.label}>Installation records available? (Regulation 651.1)</Text>
            <Choice label="Yes" state={cert.installationRecordsAvailable === true ? "tick" : "N/A"} />
            <Choice label="No" state={cert.installationRecordsAvailable === false ? "tick" : "N/A"} />
            <Field label="Date of last inspection:" value={cert.dateOfLastInspection ?? "Unknown"} flex={0.6} />
          </View>
        </View>

        <SectionBar accent={accent} letter="D" title="Extent and limitations of inspection and testing" />
        <View style={s.panel}>
          <View style={s.row}>
            <Field label="Extent of the electrical installation covered by this report" value={cert.extentOfInstallationCovered} />
          </View>
          <Text style={[s.label, { marginBottom: 1 }]}>Agreed limitations including the reasons, see Regulation 653.2:</Text>
          <Text style={[s.boxValue, { minHeight: 24, marginBottom: 3 }]}>{fmt(cert.limitations)}</Text>
          <View style={s.row}>
            <Field label="Limitations agreed with" value={cert.agreedWith} />
          </View>
          <Text style={[s.label, { marginBottom: 1 }]}>Operational limitations including the reasons:</Text>
          <Text style={[s.boxValue, { minHeight: 16, marginBottom: 3 }]}>{fmt(cert.operationalLimitations)}</Text>
          <Text style={s.small}>
            The inspection and testing detailed in this report and accompanying schedules have been carried out in
            accordance with BS 7671:2018 (IET Wiring Regulations) as amended to 2024. {CONCEALED_CABLES}
          </Text>
        </View>

        <SectionBar accent={accent} letter="E" title="Summary of the condition of the installation" />
        <View style={s.panel}>
          <Text style={[s.label, { marginBottom: 1 }]}>
            General condition of the installation (in terms of electrical safety):
          </Text>
          <Text style={[s.boxValue, { minHeight: 20, marginBottom: 4 }]}>{fmt(cert.generalCondition)}</Text>
          <Text style={[s.bold, { textAlign: "center", marginBottom: 2 }]}>
            Overall assessment of the installation in terms of its suitability for continued use:
          </Text>
          <View
            style={{
              alignSelf: "center",
              backgroundColor: satisfactory ? GREEN : RED,
              paddingVertical: 4,
              paddingHorizontal: 30,
              marginBottom: 3,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 10 }}>
              {satisfactory ? "SATISFACTORY" : "UNSATISFACTORY"}
            </Text>
          </View>
          <Text style={[s.small, s.bold]}>
            An unsatisfactory assessment indicates that dangerous (code C1) and/or potentially dangerous (code C2)
            conditions have been identified
          </Text>
        </View>

        <SectionBar accent={accent} letter="F" title="Recommendations" />
        <View style={s.panel}>
          <Text style={[s.small, { marginBottom: 3 }]}>{RECOMMENDATIONS_TEXT}</Text>
          <View style={s.row}>
            <Field
              label="Subject to the necessary remedial action being taken, I/we recommend that the installation is further inspected and tested by"
              value={cert.nextInspectionDue}
              flex={1}
            />
          </View>
        </View>

        <Footer reference={reference} verifyUrl={verifyUrl} />
        <Watermark text={watermark} />
      </Page>

      {/* ---------------- Page 2: G observations, H schedules note ---------------- */}
      <Page size="A4" style={s.page}>
        <SectionBar accent={accent} letter="G" title="Observations and recommendations for actions to be taken" />
        <View style={s.panel}>
          <Text style={[s.small, { marginBottom: 2 }]}>
            Referring to the attached schedules of inspection and test results, and subject to the limitations
            specified under &apos;Extent and limitations of inspection and testing&apos;:
          </Text>
          <View style={s.row}>
            <MarkBox state={cert.observations.length === 0 ? "tick" : "N/A"} />
            <Text style={s.label}>There are no items adversely affecting electrical safety</Text>
            <Text style={[s.label, s.bold]}>or</Text>
            <MarkBox state={cert.observations.length > 0 ? "tick" : "N/A"} />
            <Text style={s.label}>The following observations and recommendations are made</Text>
          </View>

          <View style={{ borderWidth: 0.7, borderColor: INK, marginTop: 2 }}>
            <View style={{ flexDirection: "row", backgroundColor: "#dddddd", borderBottomWidth: 0.7, borderBottomColor: INK }}>
              <Text style={[s.bold, { width: 34, padding: 2, textAlign: "center" }]}>Item No</Text>
              <Text style={[s.bold, { flex: 1, padding: 2, textAlign: "center" }]}>Observations</Text>
              <Text style={[s.bold, { width: 60, padding: 2, textAlign: "center" }]}>Classification Code</Text>
            </View>
            {Array.from({ length: Math.max(cert.observations.length, MIN_OBSERVATION_ROWS) }, (_, i) => {
              const obs = cert.observations[i];
              return (
                <View
                  key={obs?.id ?? `blank-${i}`}
                  style={{ flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: BOX_BORDER, minHeight: 16 }}
                  wrap={false}
                >
                  <Text style={{ width: 34, padding: 2, textAlign: "center" }}>{obs ? i + 1 : ""}</Text>
                  <Text style={{ flex: 1, padding: 2, borderLeftWidth: 0.4, borderRightWidth: 0.4, borderColor: BOX_BORDER }}>
                    {obs
                      ? `${obs.itemNumber ? `Inspection Schedule Item ${obs.itemNumber}: ` : ""}${obs.description ?? ""}${obs.location ? ` (${obs.location})` : ""}`
                      : ""}
                  </Text>
                  <View style={{ width: 60 }}>{obs ? <CodeChip code={obs.code} /> : null}</View>
                </View>
              );
            })}
          </View>

          <Text style={[s.small, { marginTop: 3, marginBottom: 2 }]}>
            One of the following codes, as appropriate, has been allocated to each of the observations made above to
            indicate to the person(s) responsible for the installation the degree of urgency for remedial action.
          </Text>
          <View style={[s.row, { gap: 8 }]}>
            {[
              ["C1", "Danger Present. Risk of injury. Immediate remedial action required", RED, "#ffffff"],
              ["C2", "Potentially dangerous. Urgent remedial action required", RED, "#ffffff"],
              ["C3", "Improvement recommended", ORANGE, "#111111"],
              ["FI", "Further investigation required without delay", YELLOW, "#111111"],
            ].map(([code, text, bg, fg]) => (
              <View key={code} style={{ flexDirection: "row", alignItems: "center", gap: 3, flex: 1 }}>
                <View style={{ backgroundColor: bg, paddingHorizontal: 3, paddingVertical: 1 }}>
                  <Text style={{ color: fg, fontWeight: "bold", fontSize: 7 }}>{code}</Text>
                </View>
                <Text style={{ fontSize: 5.8, flex: 1 }}>{text}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 3 }}>
            <View style={s.row}>
              <Field label="Immediate remedial action required for items:" value={itemsByCode("C1")} />
            </View>
            <View style={s.row}>
              <Field label="Urgent remedial action required for items:" value={itemsByCode("C2")} />
            </View>
            <View style={s.row}>
              <Field label="Improvement recommended for items:" value={itemsByCode("C3")} />
            </View>
            <View style={s.row}>
              <Field label="Further investigation required for items:" value={itemsByCode("FI")} />
            </View>
          </View>
        </View>

        <SectionBar accent={accent} letter="H" title="Declaration" />
        <View style={s.panel}>
          <Text style={[s.small, s.bold, { marginBottom: 3 }]}>{DECLARATION}</Text>
          <View style={s.row}>
            <Field label="Trading Title:" value={orgName} />
            <Field
              label="Registration Number (if applicable):"
              value={branding?.enrolmentNumber ?? cert.inspector?.registrationNumber}
            />
          </View>
          <View style={s.row}>
            <Field label="Address:" value={branding?.orgAddress} flex={1.6} />
            <Field label="Telephone:" value={branding?.orgPhone} flex={0.8} />
          </View>
          <Text style={[s.bold, { marginBottom: 2, marginTop: 2 }]}>For the INSPECTION, TESTING AND ASSESSMENT of the report:</Text>
          <View style={s.row}>
            <Field label="Name:" value={cert.inspector?.name} flex={1.1} />
            <Field label="Position:" value={cert.inspector?.position} flex={0.8} />
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 3 }}>
              <Text style={s.label}>Signature:</Text>
              {branding?.inspectorSignatureDataUrl ? (
                <View style={[s.boxValue, { flex: 1, alignItems: "center", paddingVertical: 0 }]}>
                  <Image src={branding.inspectorSignatureDataUrl} style={{ height: 14, objectFit: "contain" }} />
                </View>
              ) : (
                <Text style={[s.boxValue, { flex: 1, fontStyle: "italic", fontWeight: "normal" }]}>
                  {cert.inspector?.name ?? ""}
                </Text>
              )}
            </View>
            <Field label="Date:" value={cert.inspectorSignedAt} flex={0.6} />
          </View>
          <Text style={[s.bold, { marginBottom: 2 }]}>Report reviewed and authorised for issue by:</Text>
          <View style={s.row}>
            <Field label="Name:" value={cert.qsReviewer?.name ?? cert.inspector?.name} flex={1.1} />
            <Field label="Position:" value={cert.qsReviewer?.position ?? cert.inspector?.position} flex={0.8} />
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 3 }}>
              <Text style={s.label}>Signature:</Text>
              {(branding?.qsSignatureDataUrl ?? branding?.inspectorSignatureDataUrl) ? (
                <View style={[s.boxValue, { flex: 1, alignItems: "center", paddingVertical: 0 }]}>
                  <Image
                    src={(branding?.qsSignatureDataUrl ?? branding?.inspectorSignatureDataUrl)!}
                    style={{ height: 14, objectFit: "contain" }}
                  />
                </View>
              ) : (
                <Text style={[s.boxValue, { flex: 1, fontStyle: "italic", fontWeight: "normal" }]}>
                  {cert.qsReviewer?.name ?? cert.inspector?.name ?? ""}
                </Text>
              )}
            </View>
            <Field label="Date:" value={cert.qsSignedAt ?? cert.inspectorSignedAt ?? issuedAt.slice(0, 10)} flex={0.6} />
          </View>
        </View>

        <SectionBar accent={accent} title="Schedules" />
        <View style={s.panel}>
          <Text style={s.small}>
            {Math.max(1, cert.boards.length)} schedule(s) of circuit details and test results and 1 inspection
            schedule are attached. The attached schedules are part of this document and this report is valid only when
            they are attached to it.
          </Text>
        </View>

        <Footer reference={reference} verifyUrl={verifyUrl} />
        <Watermark text={watermark} />
      </Page>

      {/* ---------------- Page 3: I supply, J particulars ---------------- */}
      <Page size="A4" style={s.page}>
        <SectionBar accent={accent} letter="I" title="Supply characteristics and earthing arrangements" />
        <View style={[s.panel, { flexDirection: "row", gap: 6 }]}>
          <View style={{ width: 96 }}>
            <Text style={[s.bold, { marginBottom: 2 }]}>Earthing Arrangements</Text>
            {(["TN-S", "TN-C-S", "TT", "IT", "TN-C"] as const).map((sys) => (
              <View key={sys} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <Text style={s.label}>{sys}:</Text>
                <MarkBox state={supply?.earthing === sys ? "tick" : "N/A"} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1.3 }}>
            <Text style={[s.bold, { marginBottom: 2 }]}>Number and Type of Live Conductors</Text>
            {LIVE_CONDUCTOR_TYPES.map((label) => (
              <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <Text style={s.label}>{label}:</Text>
                <MarkBox state={supply?.liveConductors === label ? "tick" : "N/A"} />
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
              <Text style={s.label}>Confirmation of supply polarity:</Text>
              <MarkBox state={supply?.polarityConfirmed === true ? "tick" : "N/A"} />
            </View>
          </View>
          <View style={{ flex: 1.6 }}>
            <Text style={[s.bold, { marginBottom: 2 }]}>Nature of Supply Parameters</Text>
            <View style={s.row}>
              <Field label="Nominal voltage, U/Uo:" value={supply?.nominalVoltageU0 ?? supply?.nominalVoltageU} unit="V" />
            </View>
            <View style={s.row}>
              <Field label="Nominal frequency, f:" value={supply?.frequencyHz} unit="Hz" />
            </View>
            <View style={s.row}>
              <Field label="Prospective fault current, Ipf:" value={supply?.prospectiveFaultCurrentKa} unit="kA" />
            </View>
            <View style={s.row}>
              <Field label="External earth fault loop impedance, Ze:" value={supply?.zeOhms} unit="Ω" />
            </View>
            <Text style={s.small}>Note: (1) by enquiry (2) by enquiry or by measurement</Text>
          </View>
          <View style={{ flex: 1.1 }}>
            <Text style={[s.bold, { marginBottom: 2 }]}>Supply Protective Device</Text>
            <View style={s.row}>
              <Field label="BS (EN):" value={supply?.supplyProtectiveDevice?.standard} />
            </View>
            <View style={s.row}>
              <Field label="Type:" value={supply?.supplyProtectiveDevice?.type} />
            </View>
            <View style={s.row}>
              <Field label="Rated current:" value={supply?.supplyProtectiveDevice?.ratingA} unit="A" />
            </View>
          </View>
        </View>

        <SectionBar accent={accent} letter="J" title="Particulars of installation referred to in this report" />
        <View style={s.panel}>
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <View style={{ width: 150 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Means of Earthing</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <Text style={s.label}>Distributor&apos;s facility:</Text>
                <MarkBox state={particulars?.meansOfEarthing === "distributor" ? "tick" : "N/A"} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={s.label}>Installation earth electrode:</Text>
                <MarkBox state={particulars?.meansOfEarthing === "installation-electrode" ? "tick" : "N/A"} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Details of Installation Earth Electrode (where applicable)</Text>
              <View style={s.row}>
                <Field label="Type:" value={particulars?.earthElectrode?.type} flex={1} />
                <Field label="Location:" value={particulars?.earthElectrode?.location} flex={1.4} />
              </View>
              <View style={s.row}>
                <Field label="Resistance to Earth:" value={particulars?.earthElectrode?.resistanceOhms} unit="Ω" flex={0.8} />
              </View>
            </View>
          </View>

          <Text style={[s.bold, { marginBottom: 2, marginTop: 2 }]}>Main Switch / Switch-Fuse / Circuit-Breaker / RCD</Text>
          <View style={s.row}>
            <Field label="Location:" value={particulars?.mainSwitch?.location} flex={1.4} />
            <Field label="BS (EN):" value={particulars?.mainSwitch?.bsStandard} flex={1} />
            <Field label="Number of poles:" value={particulars?.mainSwitch?.poles} flex={0.7} />
            <Field label="Current rating:" value={particulars?.mainSwitch?.ratingA} unit="A" flex={0.8} />
          </View>

          <Text style={[s.bold, { marginBottom: 2, marginTop: 2 }]}>Earthing and Protective Bonding Conductors</Text>
          <View style={s.row}>
            <Field label="Earthing conductor material:" value={particulars?.earthingConductor?.material} flex={1.1} />
            <Field label="csa:" value={particulars?.earthingConductor?.csaMm2} unit="mm²" flex={0.6} />
            <Field label="Main bonding material:" value={particulars?.mainBondingConductor?.material} flex={1.1} />
            <Field label="csa:" value={particulars?.mainBondingConductor?.csaMm2} unit="mm²" flex={0.6} />
          </View>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            <Choice label="To water installation pipes" state={bonded.has("water") ? "tick" : "N/A"} />
            <Choice label="To gas installation pipes" state={bonded.has("gas") ? "tick" : "N/A"} />
            <Choice label="To oil installation pipes" state={bonded.has("oil") ? "tick" : "N/A"} />
            <Choice label="To structural steel" state={bonded.has("structural steel") || bonded.has("steel") ? "tick" : "N/A"} />
            <Choice label="To lightning protection" state={bonded.has("lightning") ? "tick" : "N/A"} />
          </View>
        </View>

        <Footer reference={reference} verifyUrl={verifyUrl} />
        <Watermark text={watermark} />
      </Page>

      {/* ---------------- Inspection schedule ---------------- */}
      <Page size="A4" style={s.page}>
        <View fixed>
          <SectionBar accent={accent} title="Inspection schedule for domestic & similar premises with up to 100A supply" />
          <View style={{ flexDirection: "row", backgroundColor: "#dddddd", borderWidth: 0.7, borderColor: INK, borderTopWidth: 0 }}>
            <Text style={[s.bold, { width: 36, padding: 2, textAlign: "center" }]}>Item</Text>
            <Text style={[s.bold, { flex: 1, padding: 2, textAlign: "center" }]}>Description</Text>
            <Text style={[s.bold, { width: 52, padding: 2, textAlign: "center" }]}>Outcome</Text>
          </View>
        </View>

        {INSPECTION_SCHEDULE.map((section) => (
          <View key={section.number}>
            <View
              style={{ flexDirection: "row", borderWidth: 0.7, borderTopWidth: 0, borderColor: INK, backgroundColor: PANEL }}
              wrap={false}
            >
              <Text style={[s.bold, { width: 36, padding: 2.5, textAlign: "center" }]}>{section.number}.0</Text>
              <Text style={[s.bold, { flex: 1, padding: 2.5 }]}>
                {section.title.toUpperCase()}
                {section.ref ? ` (${section.ref})` : ""}
              </Text>
              <View style={{ width: 52 }} />
            </View>
            {section.items.map((item) => (
              <View
                key={item.id}
                style={{ flexDirection: "row", borderWidth: 0.7, borderTopWidth: 0, borderColor: INK, minHeight: 15 }}
                wrap={false}
              >
                <Text style={{ width: 36, padding: 2.5, textAlign: "center", backgroundColor: "#f5f5f5" }}>{item.id}</Text>
                <Text style={{ flex: 1, padding: 2.5, borderLeftWidth: 0.4, borderRightWidth: 0.4, borderColor: BOX_BORDER }}>
                  {item.text}
                  {item.ref ? ` (${item.ref})` : ""}
                </Text>
                <View style={{ width: 52, alignItems: "stretch", justifyContent: "center", padding: 1.5 }}>
                  <OutcomeChip outcome={outcomes[item.id]} />
                </View>
              </View>
            ))}
          </View>
        ))}

        {cert.customScheduleItems.length > 0 && (
          <View>
            <View style={{ flexDirection: "row", borderWidth: 0.7, borderTopWidth: 0, borderColor: INK, backgroundColor: PANEL }} wrap={false}>
              <Text style={[s.bold, { width: 36, padding: 2.5, textAlign: "center" }]}>8.0</Text>
              <Text style={[s.bold, { flex: 1, padding: 2.5 }]}>PROSUMER&apos;S LOW VOLTAGE ELECTRICAL INSTALLATION(S)</Text>
              <View style={{ width: 52 }} />
            </View>
            {cert.customScheduleItems.map((item, i) => (
              <View key={item.id} style={{ flexDirection: "row", borderWidth: 0.7, borderTopWidth: 0, borderColor: INK, minHeight: 15 }} wrap={false}>
                <Text style={{ width: 36, padding: 2.5, textAlign: "center", backgroundColor: "#f5f5f5" }}>8.{i + 1}</Text>
                <Text style={{ flex: 1, padding: 2.5, borderLeftWidth: 0.4, borderRightWidth: 0.4, borderColor: BOX_BORDER }}>
                  {item.description ?? ""}
                </Text>
                <View style={{ width: 52, alignItems: "stretch", justifyContent: "center", padding: 1.5 }}>
                  <OutcomeChip outcome={item.outcome} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Outcomes legend, repeated at the foot of every schedule sheet */}
        <View
          fixed
          style={{
            position: "absolute",
            bottom: 30,
            left: 26,
            right: 26,
            flexDirection: "row",
            borderWidth: 0.7,
            borderColor: INK,
            backgroundColor: "#ffffff",
          }}
        >
          {[
            ["Acceptable condition", GREEN, "#ffffff", "PASS"],
            ["Unacceptable condition", RED, "#ffffff", "C1 or C2"],
            ["Improvement recommended", ORANGE, "#111111", "C3"],
            ["Further investigation", YELLOW, "#111111", "FI"],
            ["Not verified", LAVENDER, "#111111", "N/V"],
            ["Limitation", LIGHT_BLUE, "#111111", "LIM"],
            ["Not applicable", "#ffffff", "#111111", "N/A"],
          ].map(([label, bg, fg, code], i) => (
            <View
              key={label}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                borderLeftWidth: i === 0 ? 0 : 0.4,
                borderLeftColor: BOX_BORDER,
              }}
            >
              <Text style={{ fontSize: 5.4, flex: 1, padding: 1.5 }}>{label}</Text>
              <View style={{ backgroundColor: bg, paddingHorizontal: 3, paddingVertical: 2 }}>
                <Text style={{ color: fg, fontWeight: "bold", fontSize: 6 }}>{code}</Text>
              </View>
            </View>
          ))}
        </View>

        <Footer reference={reference} verifyUrl={verifyUrl} />
        <Watermark text={watermark} />
      </Page>

      {/* ---------------- Landscape combined schedules per board ---------------- */}
      {cert.boards.map((board) => (
        <Page key={board.id} size="A4" orientation="landscape" style={s.page}>
          <SectionBar accent={accent} title="Distribution board details" />
          <View style={[s.panel, { marginBottom: 4 }]}>
            <View style={s.row}>
              <Field label="DB reference:" value={board.designation} flex={1} />
              <Field label="Location:" value={board.location} flex={1.2} />
              <Field label="Supplied from:" value={board.suppliedFrom} flex={1.2} />
              <Field label="No of phases:" value={board.numberOfPhases} flex={0.6} />
            </View>
            <View style={s.row}>
              <Field label="Main switch BS (EN):" value={board.mainSwitch?.bsStandard} flex={1.2} />
              <Field label="Rating:" value={board.mainSwitch?.ratingA} unit="A" flex={0.6} />
              <Field label="Voltage:" value={board.mainSwitch?.voltageV} unit="V" flex={0.6} />
              <Field label="SPD type(s):" value={board.spd?.type} flex={0.8} />
              <Field label="Zs at DB:" value={board.zDbOhms} unit="Ω" flex={0.7} />
              <Field label="Ipf at DB:" value={board.prospectiveFaultCurrentKa} unit="kA" flex={0.7} />
            </View>
            <View style={s.row}>
              <Text style={s.label}>Confirmation of supply polarity</Text>
              <MarkBox state={board.supplyPolarityConfirmed === "pass" ? "tick" : "N/A"} />
              <Text style={s.label}>Confirmation of phase sequence</Text>
              <MarkBox state={board.phaseSequenceConfirmed === "pass" ? "tick" : "N/A"} />
              <Text style={s.label}>SPD status indicator checked</Text>
              <MarkBox state={board.spd?.statusConfirmed === "pass" ? "tick" : "N/A"} />
            </View>
          </View>

          <SectionBar accent={accent} title="Schedule of circuit details and test results" />
          <CombinedSchedule board={board} />

          <View style={{ flexDirection: "row", borderWidth: 0.7, borderTopWidth: 0, borderColor: INK }}>
            <View style={{ width: 60, padding: 2, borderRightWidth: 0.4, borderRightColor: BOX_BORDER }}>
              <Text style={[s.gridHead, { textAlign: "left" }]}>CODES FOR TYPE OF WIRING</Text>
            </View>
            {WIRING_CODES.map(([code, label]) => (
              <View key={code} style={{ flex: 1, padding: 2, borderRightWidth: 0.4, borderRightColor: BOX_BORDER }}>
                <Text style={[s.gridHead]}>{code}</Text>
                <Text style={{ fontSize: 5, textAlign: "center" }}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 4 }}>
            <SectionBar accent={accent} title="Details of test instruments" />
            <View style={[s.panel, { marginBottom: 4 }]}>
              <Text style={[s.small, { marginBottom: 2 }]}>Details of test instruments used (serial and/or asset numbers):</Text>
              <View style={s.row}>
                <Field label="Multi-functional:" value={cert.testInstruments?.multifunction} />
                <Field label="Continuity:" value={cert.testInstruments?.continuity} />
                <Field label="Insulation resistance:" value={cert.testInstruments?.insulationResistance} />
              </View>
              <View style={s.row}>
                <Field label="Earth fault loop impedance:" value={cert.testInstruments?.earthFaultLoop} />
                <Field label="RCD:" value={cert.testInstruments?.rcd} />
                <Field label="Earth electrode resistance:" value={cert.testInstruments?.earthElectrode} />
              </View>
            </View>
          </View>

          <View style={[s.row, { marginTop: 2 }]}>
            <Field label="Tested by name:" value={cert.inspector?.name} flex={1.2} />
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 3 }}>
              <Text style={s.label}>Signature:</Text>
              {branding?.inspectorSignatureDataUrl ? (
                <View style={[s.boxValue, { flex: 1, alignItems: "center", paddingVertical: 0 }]}>
                  <Image src={branding.inspectorSignatureDataUrl} style={{ height: 14, objectFit: "contain" }} />
                </View>
              ) : (
                <Text style={[s.boxValue, { flex: 1, fontStyle: "italic", fontWeight: "normal" }]}>
                  {cert.inspector?.name ?? ""}
                </Text>
              )}
            </View>
            <Field label="Date:" value={cert.inspectionDate} flex={0.6} />
          </View>

          <Footer reference={reference} verifyUrl={verifyUrl} />
        <Watermark text={watermark} />
        </Page>
      ))}

      {(cert.appendixNotes || cert.appendixPhotos.length > 0) && (
        <Page size="A4" style={s.page}>
          <SectionBar accent={accent} title="Appendix" />
          {cert.appendixNotes ? (
            <View style={s.panel}>
              <Text style={[s.label, { marginBottom: 2 }]}>Additional information:</Text>
              <Text style={[s.boxValue, { minHeight: 40, fontWeight: "normal" }]}>{cert.appendixNotes}</Text>
            </View>
          ) : null}
          {cert.appendixPhotos.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {cert.appendixPhotos.map((photo) => {
                const data = appendixPhotoData?.[photo.storagePath];
                if (!data) return null;
                return (
                  <View key={photo.id} style={{ width: 258, marginBottom: 6 }} wrap={false}>
                    <Image src={data} style={{ width: 258, maxHeight: 190, objectFit: "contain", borderWidth: 0.6, borderColor: BOX_BORDER }} />
                    <Text style={[s.small, { textAlign: "center", marginTop: 2, fontWeight: "bold" }]}>
                      {photo.caption ?? ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <Footer reference={reference} verifyUrl={verifyUrl} />
          <Watermark text={watermark} />
        </Page>
      )}
    </Document>
  );
}

/** A single board's schedule as its own document, for Print schedule. */
export function BoardSchedulePdf({
  board,
  orgName,
  reference,
  branding,
}: {
  board: DistributionBoard;
  orgName: string;
  reference: string;
  branding?: CertificateBranding;
}) {
  const accent = branding?.accentColor ?? ACCENT;
  return (
    <Document title={`Schedule ${board.designation ?? ""} ${reference}`} author={orgName} creator="FieldCert">
      <Page size="A4" orientation="landscape" style={s.page}>
        <SectionBar accent={accent} title="Distribution board details" />
        <View style={[s.panel, { marginBottom: 4 }]}>
          <View style={s.row}>
            <Field label="DB reference:" value={board.designation} flex={1} />
            <Field label="Location:" value={board.location} flex={1.2} />
            <Field label="Supplied from:" value={board.suppliedFrom} flex={1.2} />
            <Field label="Certificate:" value={reference} flex={1} />
          </View>
        </View>
        <SectionBar accent={accent} title="Schedule of circuit details and test results" />
        <CombinedSchedule board={board} />
        <Footer reference={reference} />
      </Page>
    </Document>
  );
}

export async function renderBoardSchedulePdfBuffer(props: {
  board: DistributionBoard;
  orgName: string;
  reference: string;
  branding?: CertificateBranding;
}): Promise<Buffer> {
  return renderToBuffer(<BoardSchedulePdf {...props} />);
}
