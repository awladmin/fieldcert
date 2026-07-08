import {
  Document,
  Font,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { FORM_FONT_BOLD, FORM_FONT_ITALIC, FORM_FONT_REGULAR } from "./fonts/fonts-data";

Font.register({
  family: "Form",
  fonts: [
    { src: FORM_FONT_REGULAR },
    { src: FORM_FONT_BOLD, fontWeight: "bold" },
    { src: FORM_FONT_ITALIC, fontStyle: "italic" },
  ],
});
// The model form fills every field; word-splitting long values reads wrong on a certificate.
Font.registerHyphenationCallback((word) => [word]);
import {
  INSPECTION_SCHEDULE,
  type CircuitDetails,
  type CircuitTestResults,
  type DistributionBoard,
  type Eicr,
} from "@fieldcert/cert-schemas";
import { maxZsOhms } from "@fieldcert/rules-engine";

/**
 * Faithful reproduction of the BS 7671 (IET) EICR model form: the report
 * (Sections A-H), supply characteristics and observations (Sections I-K),
 * landscape schedules of circuit details and test results per board, and the
 * condition report inspection schedule. Layout, wording and section lettering
 * follow the published model form; the IET permits reproduction of the forms
 * for electrical contracting use (their logo is not used).
 */

export interface EicrPdfProps {
  cert: Eicr;
  orgName: string;
  reference: string;
  issuedAt: string;
  jobNumber?: string | null;
}

export async function renderEicrPdfBuffer(props: EicrPdfProps): Promise<Buffer> {
  return renderToBuffer(<EicrPdf {...props} />);
}

const INK = "#111111";
const RULE = "#444444";

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 42, paddingHorizontal: 28, fontSize: 7.5, fontFamily: "Form", color: INK },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  docTitle: { fontSize: 12.5, fontWeight: "bold" },
  reportNo: { fontSize: 9, fontWeight: "bold" },
  section: { borderWidth: 1, borderColor: INK, marginBottom: 5 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 3,
  },
  sectionBody: { paddingHorizontal: 5, paddingBottom: 4 },
  lineRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 3 },
  lineLabel: { paddingRight: 4 },
  lineValue: {
    flex: 1,
    fontWeight: "bold",
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    borderBottomStyle: "dotted",
    paddingBottom: 1,
    minHeight: 9,
  },
  small: { fontSize: 6.5, color: "#222222" },
  para: { marginBottom: 3, lineHeight: 1.25 },
  bold: { fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#333333",
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 4,
  },
  // schedule tables
  th: { fontWeight: "bold", fontSize: 6, textAlign: "center" },
  td: { fontSize: 6.5, textAlign: "center" },
  cell: { borderRightWidth: 0.5, borderRightColor: RULE, paddingVertical: 2, paddingHorizontal: 1, justifyContent: "flex-end" },
  headRow: { flexDirection: "row", borderWidth: 1, borderColor: INK, borderBottomWidth: 1, backgroundColor: "#efefef" },
  bodyRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 0.5, borderColor: INK },
});

function fmt(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value);
}

/** Label + dotted-underlined value, the model form's field idiom. */
function Line({ label, value, flex }: { label: string; value?: string | number | boolean | null; flex?: number }) {
  return (
    <View style={[s.lineRow, flex !== undefined ? { flex } : {}]}>
      <Text style={s.lineLabel}>{label}</Text>
      <Text style={s.lineValue}>{fmt(value)}</Text>
    </View>
  );
}

function CheckBox({ checked, label }: { checked: boolean; label?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
      {label ? <Text style={{ marginRight: 2 }}>{label}</Text> : null}
      <Svg width={8} height={8} viewBox="0 0 10 10">
        <Path d="M0.5 0.5 H9.5 V9.5 H0.5 Z" stroke={INK} strokeWidth={1} fill="none" />
        {checked ? <Path d="M2 2 L8 8 M8 2 L2 8" stroke={INK} strokeWidth={1.2} fill="none" /> : null}
      </Svg>
    </View>
  );
}

/** A genuine tick, drawn as vector so no font glyph is needed. */
function Tick({ size = 7 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d="M1.5 5.5 L4 8 L8.5 2" stroke={INK} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

function Section({ letter, title, children }: { letter?: string; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionTitle}>
        {letter ? `SECTION ${letter}. ` : ""}
        {title}
      </Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Footer({ reference, orgName, jobNumber }: { reference: string; orgName: string; jobNumber?: string | null }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        Report No: {reference}
        {jobNumber ? `   Job No: ${jobNumber}` : ""}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      <Text>
        {orgName} · Generated with FieldCert
      </Text>
    </View>
  );
}

function ReportNoRight({ reference }: { reference: string }) {
  return <Text style={s.reportNo}>Report No: {reference}</Text>;
}

const CONCEALED_CABLES =
  "It should be noted that cables concealed within trunking and conduits, under floors, in roof spaces, and generally within the fabric of the building or underground, have not been inspected unless specifically agreed between the client and inspector prior to the inspection. An inspection should be made within an accessible roof space housing other electrical equipment.";

const DECLARATION =
  "I/We, being the person(s) responsible for the inspection and testing of the electrical installation (as indicated by my/our signatures below), particulars of which are described above, having exercised reasonable skill and care when carrying out the inspection and testing, hereby declare that the information in this report, including the observations and the attached schedules, provides an accurate assessment of the condition of the electrical installation taking into account the stated extent and limitations in section D of this report.";

const RECOMMENDATIONS_TEXT =
  "Where the overall assessment of the suitability of the installation for continued use above is stated as UNSATISFACTORY, I/we recommend that any observations classified as 'Danger present' (code C1) or 'Potentially dangerous' (code C2) are acted upon as a matter of urgency. Investigation without delay is recommended for observations identified as 'Further investigation required' (code FI). Observations classified as 'Improvement recommended' (code C3) should be given due consideration.";

function DeclarationColumn({
  heading,
  name,
  date,
  orgName,
}: {
  heading: string;
  name?: string;
  date?: string;
  orgName: string;
}) {
  return (
    <View style={{ flex: 1, padding: 4 }}>
      <Text style={[s.bold, { marginBottom: 3 }]}>{heading}</Text>
      <Line label="Name (Capitals)" value={name?.toUpperCase()} />
      <View style={s.lineRow}>
        <Text style={s.lineLabel}>Signature</Text>
        <Text style={[s.lineValue, { fontStyle: "italic" }]}>{name ?? ""}</Text>
      </View>
      <Line label="For/on behalf of" value={orgName} />
      <Line label="Position" value="" />
      <Line label="Date" value={date} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Landscape schedules                                                  */
/* ------------------------------------------------------------------ */

interface Col {
  n: number | null;
  label: string;
  width: number | null; // null = flex
  value: (c: CircuitDetails, t: CircuitTestResults | undefined) => string;
}

const CIRCUIT_COLS: Col[] = [
  { n: 1, label: "Circuit number", width: 30, value: (c) => fmt(c.circuitNumber) },
  { n: 2, label: "Circuit description", width: null, value: (c) => fmt(c.description) },
  { n: 3, label: "Type of wiring", width: 34, value: (c) => fmt(c.wiringType) },
  { n: 4, label: "Reference method", width: 38, value: (c) => fmt(c.referenceMethod) },
  { n: 5, label: "Number of points served", width: 38, value: (c) => fmt(c.numberOfPoints) },
  { n: 6, label: "Live (mm²)", width: 34, value: (c) => fmt(c.liveCsaMm2) },
  { n: 7, label: "cpc (mm²)", width: 34, value: (c) => fmt(c.cpcCsaMm2) },
  { n: 8, label: "BS (EN)", width: 56, value: (c) => fmt(c.ocpd?.standard) },
  { n: 9, label: "Type", width: 28, value: (c) => fmt(c.ocpd?.curve) },
  { n: 10, label: "Rating (A)", width: 32, value: (c) => fmt(c.ocpd?.ratingA) },
  { n: 11, label: "Breaking capacity (kA)", width: 40, value: (c) => fmt(c.ocpd?.breakingCapacityKa) },
  {
    n: 12,
    label: "Maximum permitted Zs (Ω)",
    width: 44,
    value: (c) => {
      const max = maxZsOhms(c);
      return max === null ? "" : max.toFixed(2);
    },
  },
  { n: 13, label: "BS (EN)", width: 46, value: (c) => (c.rcd ? "BS EN 61008/9" : "") },
  { n: 14, label: "Type", width: 28, value: (c) => fmt(c.rcd?.type) },
  { n: 15, label: "IΔn (mA)", width: 32, value: (c) => fmt(c.rcd?.iDeltaNMa) },
  { n: 16, label: "Rating (A)", width: 32, value: (c) => fmt(c.rcd?.ratingA) },
];

const TEST_COLS: Col[] = [
  { n: 17, label: "Circuit number", width: 30, value: (c) => fmt(c.circuitNumber) },
  { n: 18, label: "r1 (line) (Ω)", width: 36, value: (_, t) => fmt(t?.ringContinuity?.rLineOhms) },
  { n: 19, label: "rn (neutral) (Ω)", width: 36, value: (_, t) => fmt(t?.ringContinuity?.rNeutralOhms) },
  { n: 20, label: "r2 (cpc) (Ω)", width: 36, value: (_, t) => fmt(t?.ringContinuity?.rCpcOhms) },
  { n: 21, label: "(R1 + R2) (Ω)", width: 38, value: (_, t) => fmt(t?.r1PlusR2Ohms) },
  { n: 22, label: "R2 (Ω)", width: 32, value: (_, t) => fmt(t?.r2Ohms) },
  { n: 23, label: "Test voltage (V)", width: 36, value: (_, t) => fmt(t?.insulationResistance?.testVoltageV) },
  { n: 24, label: "Live-Live (MΩ)", width: 38, value: (_, t) => fmt(t?.insulationResistance?.liveLiveMohm) },
  { n: 25, label: "Live-Earth (MΩ)", width: 38, value: (_, t) => fmt(t?.insulationResistance?.liveEarthMohm) },
  { n: 26, label: "Polarity", width: 32, value: (_, t) => (t?.polarityConfirmed ? "OK" : "") },
  { n: 27, label: "Maximum measured Zs (Ω)", width: 44, value: (_, t) => fmt(t?.zsOhms) },
  { n: 28, label: "RCD disconnection time (ms)", width: 46, value: (_, t) => fmt(t?.rcdOperatingTimeMs) },
  { n: 29, label: "Test button operation", width: 38, value: (_, t) => (t?.rcdTestButtonOk ? "OK" : "") },
  { n: 30, label: "AFDD manual test", width: 36, value: (_, t) => (t?.afddTestOk ? "OK" : "") },
  { n: 31, label: "Remarks", width: null, value: (_, t) => fmt(t?.remarks) },
];

function ScheduleGrid({ board, cols }: { board: DistributionBoard; cols: Col[] }) {
  return (
    <View>
      <View style={s.headRow}>
        {cols.map((col) => (
          <View key={col.label + col.n} style={[s.cell, col.width ? { width: col.width } : { flex: 1 }]}>
            <Text style={[s.th, { marginBottom: 2 }]}>{col.n}</Text>
            <Text style={s.th}>{col.label}</Text>
          </View>
        ))}
      </View>
      {board.circuits.map((circuit) => {
        const tr = board.testResults.find((t) => t.circuitId === circuit.id);
        return (
          <View key={circuit.id} style={s.bodyRow} wrap={false}>
            {cols.map((col) => (
              <View key={col.label + col.n} style={[s.cell, col.width ? { width: col.width } : { flex: 1 }]}>
                <Text style={[s.td, col.n === 2 || col.n === 31 ? { textAlign: "left" } : {}]}>
                  {col.value(circuit, tr)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function BoardHeaderLine({ board, cert }: { board: DistributionBoard; cert: Eicr }) {
  return (
    <View style={{ borderWidth: 1, borderColor: INK, padding: 4, marginBottom: 4 }}>
      <Text style={[s.bold, { marginBottom: 3 }]}>Distribution board details</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Line label="DB reference:" value={board.designation} flex={1.1} />
        <Line label="Location:" value={board.location} flex={1.3} />
        <Line label="Supplied from:" value={board.suppliedFrom} flex={1.3} />
        <Line label="Zdb (Ω):" value={board.zDbOhms ?? cert.supply?.zeOhms} flex={0.8} />
        <Line label="Ipf (kA):" value={board.prospectiveFaultCurrentKa ?? cert.supply?.prospectiveFaultCurrentKa} flex={0.8} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 2, alignItems: "center" }}>
        <Line label="Main switch BS (EN):" value={board.mainSwitch?.bsStandard} flex={1.4} />
        <Line label="Rating (A):" value={board.mainSwitch?.ratingA} flex={0.7} />
        <Line label="Voltage (V):" value={board.mainSwitch?.voltageV} flex={0.7} />
        <Line label="SPD type(s):" value={board.spd?.type} flex={0.9} />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ marginRight: 3 }}>Correct polarity confirmed</Text>
          <CheckBox checked={board.supplyPolarityConfirmed === "pass"} />
          <Text style={{ marginRight: 3 }}>Phase sequence confirmed</Text>
          <CheckBox checked={board.phaseSequenceConfirmed === "pass"} />
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Document                                                             */
/* ------------------------------------------------------------------ */

export function EicrPdf({ cert, orgName, reference, issuedAt, jobNumber }: EicrPdfProps) {
  const outcomes = cert.inspectionSchedule ?? {};
  const satisfactory = cert.overallAssessment === "satisfactory";
  const premises = cert.descriptionOfPremises;
  const supply = cert.supply;
  const particulars = cert.particulars;
  const liveConductors = supply?.liveConductors ?? "";
  const bonded = new Set((particulars?.bondedServices ?? []).map((b) => b.toLowerCase()));
  const scheduleCount = Math.max(1, cert.boards.length);

  const footer = <Footer reference={reference} orgName={orgName} jobNumber={jobNumber} />;

  return (
    <Document title={`EICR ${reference}`} author={orgName} creator="FieldCert">
      {/* ---------------- Page 1: Sections A-H ---------------- */}
      <Page size="A4" style={s.page}>
        <View style={s.titleRow}>
          <Text style={s.docTitle}>ELECTRICAL INSTALLATION CONDITION REPORT</Text>
          <ReportNoRight reference={reference} />
        </View>

        <Section letter="A" title="DETAILS OF THE PERSON ORDERING THE REPORT">
          <Line label="Name" value={cert.client?.name ?? cert.client?.companyName} />
          <Line
            label="Address"
            value={[
              cert.client?.address?.line1,
              cert.client?.address?.town,
              cert.client?.address?.postcode,
            ]
              .filter(Boolean)
              .join(", ")}
          />
        </Section>

        <Section letter="B" title="REASON FOR PRODUCING THIS REPORT">
          <Line label="" value={cert.purposeOfReport} />
          <Line label="Date(s) on which inspection and testing was carried out" value={cert.inspectionDate} />
        </Section>

        <Section letter="C" title="DETAILS OF THE INSTALLATION WHICH IS THE SUBJECT OF THIS REPORT">
          <Line label="Occupier" value={cert.occupier} />
          <Line
            label="Address"
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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
            <Text style={{ marginRight: 6 }}>Description of premises</Text>
            <CheckBox label="Residential" checked={premises === "domestic"} />
            <CheckBox label="Commercial" checked={premises === "commercial"} />
            <CheckBox label="Industrial" checked={premises === "industrial"} />
            <CheckBox label="Other" checked={premises === "other"} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Line label="Estimated age of wiring system" value={cert.estimatedAgeYears !== undefined ? `${cert.estimatedAgeYears} years` : ""} flex={1} />
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1.4 }}>
              <Text style={{ marginRight: 4 }}>Evidence of additions / alterations?</Text>
              <CheckBox label="Yes" checked={cert.evidenceOfAlterations === true} />
              <CheckBox label="No" checked={cert.evidenceOfAlterations === false} />
              <CheckBox label="Not apparent" checked={false} />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text>Installation records available? (Regulation 651.1)</Text>
            <CheckBox label="Yes" checked={cert.installationRecordsAvailable === true} />
            <CheckBox label="No" checked={cert.installationRecordsAvailable === false} />
            <Line label="Date of last inspection" value={cert.dateOfLastInspection} flex={1} />
          </View>
        </Section>

        <Section letter="D" title="EXTENT AND LIMITATIONS OF INSPECTION AND TESTING">
          <Line label="Extent of the electrical installation covered by this report" value={cert.extentOfInstallationCovered} />
          <Line label="Agreed limitations including the reasons (see Regulation 653.2)" value={cert.limitations} />
          <Line label="Agreed with:" value={cert.agreedWith} />
          <Line label="Operational limitations including the reasons" value={cert.operationalLimitations} />
          <Text style={s.para}>
            The inspection and testing detailed in this report and accompanying schedules have been carried out in
            accordance with BS 7671:2018 as amended to <Text style={s.bold}>A3:2024</Text>.
          </Text>
          <Text style={[s.para, s.small]}>{CONCEALED_CABLES}</Text>
        </Section>

        <Section letter="E" title="SUMMARY OF THE CONDITION OF THE INSTALLATION">
          <Line label="General condition of the installation (in terms of electrical safety)" value={cert.generalCondition} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 2 }}>
            <Text>Overall assessment of the installation in terms of its suitability for continued use: </Text>
            <Text style={[s.bold, { fontSize: 9 }, satisfactory ? {} : { color: "#b00000" }]}>
              {satisfactory ? "SATISFACTORY" : "UNSATISFACTORY"}
            </Text>
          </View>
          <Text style={s.small}>
            *An unsatisfactory assessment indicates that dangerous (code C1) and/or potentially dangerous (code C2)
            conditions have been identified.
          </Text>
        </Section>

        <Section letter="F" title="RECOMMENDATIONS">
          <Text style={[s.para, s.small]}>{RECOMMENDATIONS_TEXT}</Text>
          <Line
            label="Subject to the necessary remedial action being taken, I/We recommend that the installation is further inspected and tested by"
            value={cert.nextInspectionDue}
          />
        </Section>

        <Section letter="G" title="DECLARATION">
          <Text style={[s.para, s.small, s.bold]}>{DECLARATION}</Text>
          <View style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: RULE }}>
            <DeclarationColumn
              heading="Inspected and tested by:"
              name={cert.inspector?.name}
              date={cert.inspectorSignedAt}
              orgName={orgName}
            />
            <View style={{ width: 0.5, backgroundColor: RULE }} />
            <DeclarationColumn
              heading="Report authorised for issue by:"
              name={cert.qsReviewer?.name ?? cert.inspector?.name}
              date={cert.qsSignedAt ?? cert.inspectorSignedAt ?? issuedAt.slice(0, 10)}
              orgName={orgName}
            />
          </View>
        </Section>

        <Section letter="H" title="SCHEDULE(S)">
          <Text>
            <Text style={s.bold}>1</Text> Inspection Schedule(s) and <Text style={s.bold}>{scheduleCount}</Text>{" "}
            Schedule(s) of Circuit Details and Test Results are attached.
          </Text>
          <Text>
            The attached schedule(s) are part of this document and this report is valid only when they are attached to
            it.
          </Text>
        </Section>

        {footer}
      </Page>

      {/* ---------------- Page 2: Sections I-K ---------------- */}
      <Page size="A4" style={s.page}>
        <View style={{ alignItems: "flex-end", marginBottom: 4 }}>
          <ReportNoRight reference={reference} />
        </View>

        <Section letter="I" title="SUPPLY CHARACTERISTICS AND EARTHING ARRANGEMENTS">
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: 92, borderRightWidth: 0.5, borderRightColor: RULE, paddingRight: 4 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Earthing arrangements</Text>
              {(["TN-C", "TN-S", "TN-C-S", "TT", "IT"] as const).map((sys) => (
                <View key={sys} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 }}>
                  <Text>{sys}</Text>
                  <CheckBox checked={supply?.earthing === sys} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1.2, borderRightWidth: 0.5, borderRightColor: RULE, paddingHorizontal: 4 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Number and Type of Live Conductors</Text>
              {["1-phase, 2-wire", "1-phase, 3-wire", "2-phase, 3-wire", "3-phase, 3-wire", "3-phase, 4-wire"].map(
                (label) => (
                  <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 }}>
                    <Text>AC  {label}</Text>
                    <CheckBox checked={liveConductors.toLowerCase().startsWith(label.slice(0, 7).toLowerCase())} />
                  </View>
                )
              )}
            </View>
            <View style={{ flex: 1.5, borderRightWidth: 0.5, borderRightColor: RULE, paddingHorizontal: 4 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Nature of Supply Parameters</Text>
              <Line
                label="Nominal voltage, U / U0"
                value={
                  supply?.nominalVoltageU !== undefined || supply?.nominalVoltageU0 !== undefined
                    ? `${[supply?.nominalVoltageU, supply?.nominalVoltageU0].filter((v) => v !== undefined).join(" / ")} V`
                    : ""
                }
              />
              <Line label="Nominal frequency, f" value={supply?.frequencyHz !== undefined ? `${supply.frequencyHz} Hz` : ""} />
              <Line label="Prospective fault current, Ipf" value={supply?.prospectiveFaultCurrentKa !== undefined ? `${supply.prospectiveFaultCurrentKa} kA` : ""} />
              <Line label="External earth fault loop impedance, Ze" value={supply?.zeOhms !== undefined ? `${supply.zeOhms} Ω` : ""} />
              <Text style={s.small}>(Note: (1) by enquiry (2) by enquiry or by measurement)</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 4 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Supply Protective Device</Text>
              <Line label="BS (EN)" value={supply?.supplyProtectiveDevice?.standard} />
              <Line label="Type" value={supply?.supplyProtectiveDevice?.type} />
              <Line label="Rated current" value={supply?.supplyProtectiveDevice?.ratingA !== undefined ? `${supply.supplyProtectiveDevice.ratingA} A` : ""} />
            </View>
          </View>
        </Section>

        <Section letter="J" title="PARTICULARS OF INSTALLATION REFERRED TO IN THE REPORT">
          <View style={{ flexDirection: "row", marginBottom: 3 }}>
            <View style={{ width: 150, borderRightWidth: 0.5, borderRightColor: RULE, paddingRight: 4 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Means of Earthing</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 }}>
                <Text>Distributor&apos;s facility</Text>
                <CheckBox checked={particulars?.meansOfEarthing === "distributor"} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text>Installation earth electrode</Text>
                <CheckBox checked={particulars?.meansOfEarthing === "installation-electrode"} />
              </View>
            </View>
            <View style={{ flex: 1, paddingLeft: 4 }}>
              <Text style={[s.bold, { marginBottom: 2 }]}>Details of Installation Earth Electrode (where applicable)</Text>
              <Line label="Type (e.g. rod(s), tape etc)" value={particulars?.earthElectrode?.type} />
              <Line label="Location" value={particulars?.earthElectrode?.location} />
              <Line label="Electrode resistance to Earth" value={particulars?.earthElectrode?.resistanceOhms !== undefined ? `${particulars.earthElectrode.resistanceOhms} Ω` : ""} />
            </View>
          </View>
          <Text style={[s.bold, { marginBottom: 2 }]}>Main Protective Conductors</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Line label="Earthing conductor: Material" value={particulars?.earthingConductor?.material} flex={1.2} />
            <Line label="csa" value={particulars?.earthingConductor?.csaMm2 !== undefined ? `${particulars.earthingConductor.csaMm2} mm²` : ""} flex={0.7} />
            <Line label="Main protective bonding: Material" value={particulars?.mainBondingConductor?.material} flex={1.2} />
            <Line label="csa" value={particulars?.mainBondingConductor?.csaMm2 !== undefined ? `${particulars.mainBondingConductor.csaMm2} mm²` : ""} flex={0.7} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 3, flexWrap: "wrap" }}>
            <CheckBox label="To water installation pipes" checked={bonded.has("water")} />
            <CheckBox label="To gas installation pipes" checked={bonded.has("gas")} />
            <CheckBox label="To oil installation pipes" checked={bonded.has("oil")} />
            <CheckBox label="To structural steel" checked={bonded.has("structural steel") || bonded.has("steel")} />
            <CheckBox label="To lightning protection" checked={bonded.has("lightning")} />
          </View>
          <Text style={[s.bold, { marginBottom: 2 }]}>Main switch / Switch-fuse / Circuit-breaker / RCD</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Line label="Location" value={particulars?.mainSwitch?.location} flex={1.4} />
            <Line label="BS (EN)" value={particulars?.mainSwitch?.bsStandard} flex={1} />
            <Line label="No of poles" value={particulars?.mainSwitch?.poles} flex={0.6} />
            <Line label="Current rating" value={particulars?.mainSwitch?.ratingA !== undefined ? `${particulars.mainSwitch.ratingA} A` : ""} flex={0.8} />
          </View>
        </Section>

        <Section letter="K" title="OBSERVATIONS">
          <Text style={{ marginBottom: 2 }}>
            Referring to the attached inspection schedule(s) and schedule(s) of circuit details and test results:
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <CheckBox label="No remedial action is required" checked={cert.observations.length === 0} />
            <CheckBox label="The following observations are made (see below)" checked={cert.observations.length > 0} />
          </View>
          <View style={{ borderWidth: 0.8, borderColor: INK }}>
            <View style={{ flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: INK, backgroundColor: "#efefef" }}>
              <Text style={[s.bold, { flex: 1, padding: 3 }]}>OBSERVATION(S) Include schedule reference, as appropriate</Text>
              <Text style={[s.bold, { width: 80, padding: 3, borderLeftWidth: 0.8, borderLeftColor: INK, textAlign: "center" }]}>
                Classification code
              </Text>
            </View>
            {cert.observations.length === 0 ? (
              <Text style={{ padding: 4, color: "#555555" }}>None.</Text>
            ) : (
              cert.observations.map((obs) => (
                <View key={obs.id} style={{ flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: RULE }}>
                  <Text style={{ flex: 1, padding: 3 }}>
                    {obs.itemNumber ? `[Item ${obs.itemNumber}] ` : ""}
                    {obs.description ?? ""}
                    {obs.location ? ` (${obs.location})` : ""}
                  </Text>
                  <Text
                    style={[
                      s.bold,
                      { width: 80, padding: 3, borderLeftWidth: 0.4, borderLeftColor: RULE, textAlign: "center" },
                    ]}
                  >
                    {obs.code ?? ""}
                  </Text>
                </View>
              ))
            )}
          </View>
          <View style={{ marginTop: 3 }}>
            <Text style={s.small}>
              One of the following codes, as appropriate, has been allocated to each of the observations made above to
              indicate to the person(s) responsible for the installation the degree of urgency for remedial action.
            </Text>
            <Text style={s.small}>C1 - Danger present. Risk of injury. Immediate remedial action required</Text>
            <Text style={s.small}>C2 - Potentially dangerous - urgent remedial action required</Text>
            <Text style={s.small}>C3 - Improvement recommended</Text>
            <Text style={s.small}>FI - Further investigation required without delay</Text>
          </View>
        </Section>

        {footer}
      </Page>

      {/* ---------------- Landscape schedules per board ---------------- */}
      {cert.boards.map((board) => (
        <Page key={board.id} size="A4" orientation="landscape" style={s.page}>
          <View style={s.titleRow}>
            <Text style={s.docTitle}>GENERIC SCHEDULE OF CIRCUIT DETAILS</Text>
            <ReportNoRight reference={reference} />
          </View>
          <BoardHeaderLine board={board} cert={cert} />
          <View style={{ flexDirection: "row", marginBottom: 1 }}>
            <Text style={[s.th, { flex: 1, textAlign: "center" }]}>CIRCUIT DETAILS</Text>
          </View>
          <ScheduleGrid board={board} cols={CIRCUIT_COLS} />

          <View style={[s.titleRow, { marginTop: 12 }]}>
            <Text style={s.docTitle}>GENERIC SCHEDULE OF TEST RESULTS</Text>
          </View>
          <ScheduleGrid board={board} cols={TEST_COLS} />
          <View style={{ flexDirection: "row", gap: 14, marginTop: 6 }}>
            <Line label="Tested by name (Capitals):" value={cert.inspector?.name?.toUpperCase()} flex={1.4} />
            <View style={[s.lineRow, { flex: 1 }]}>
              <Text style={s.lineLabel}>Signature:</Text>
              <Text style={[s.lineValue, { fontStyle: "italic" }]}>{cert.inspector?.name ?? ""}</Text>
            </View>
            <Line label="Date:" value={cert.inspectionDate} flex={0.7} />
          </View>
          {footer}
        </Page>
      ))}

      {/* ---------------- Condition report inspection schedule ---------------- */}
      <Page size="A4" style={s.page}>
        <View style={s.titleRow}>
          <View style={{ maxWidth: 380 }}>
            <Text style={[s.docTitle, { fontSize: 10.5 }]}>
              CONDITION REPORT INSPECTION SCHEDULE FOR RESIDENTIAL AND SIMILAR PREMISES WITH UP TO 100 A SUPPLY
            </Text>
          </View>
          <ReportNoRight reference={reference} />
        </View>

        {/* Outcomes legend, as on the model form */}
        <View style={{ flexDirection: "row", borderWidth: 1, borderColor: INK, marginBottom: 5 }}>
          {[
            ["Acceptable condition", "TICK"],
            ["Unacceptable condition", "C1 or C2"],
            ["Improvement recommended", "C3"],
            ["Further investigation", "FI"],
            ["Not verified", "N/V"],
            ["Limitation", "LIM"],
            ["Not applicable", "N/A"],
          ].map(([label, code], i) => (
            <View
              key={label}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 3,
                paddingHorizontal: 2,
                borderLeftWidth: i === 0 ? 0 : 0.5,
                borderLeftColor: RULE,
              }}
            >
              <Text style={[s.small, { textAlign: "center", marginBottom: 2 }]}>{label}</Text>
              {code === "TICK" ? <Tick /> : <Text style={[s.bold, { fontSize: 6.5 }]}>{code}</Text>}
            </View>
          ))}
        </View>

        {INSPECTION_SCHEDULE.map((section) => (
          <View key={section.number} style={{ marginBottom: 4 }}>
            <View
              style={{
                flexDirection: "row",
                borderWidth: 0.8,
                borderColor: INK,
                backgroundColor: "#e8e8e8",
              }}
              wrap={false}
            >
              <Text style={[s.bold, { width: 30, padding: 2.5, borderRightWidth: 0.5, borderRightColor: RULE }]}>
                {section.number}.0
              </Text>
              <Text style={[s.bold, { flex: 1, padding: 2.5 }]}>
                {section.title.toUpperCase()}
                {section.ref ? ` (${section.ref})` : ""}
              </Text>
              <View style={{ width: 54, borderLeftWidth: 0.5, borderLeftColor: RULE }} />
            </View>
            {section.items.map((item) => {
              const outcome = outcomes[item.id];
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    borderLeftWidth: 0.8,
                    borderRightWidth: 0.8,
                    borderBottomWidth: 0.4,
                    borderColor: INK,
                  }}
                  wrap={false}
                >
                  <Text style={{ width: 30, padding: 2.5, borderRightWidth: 0.4, borderRightColor: RULE }}>
                    {item.id}
                  </Text>
                  <Text style={{ flex: 1, padding: 2.5 }}>
                    {item.text}
                    {item.ref ? ` (${item.ref})` : ""}
                  </Text>
                  <View
                    style={{
                      width: 54,
                      padding: 2.5,
                      borderLeftWidth: 0.4,
                      borderLeftColor: RULE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {outcome === "ok" ? (
                      <Tick />
                    ) : (
                      <Text style={s.bold}>{outcome === "NV" ? "N/V" : outcome === "NA" ? "N/A" : (outcome ?? "")}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {cert.customScheduleItems.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: "row", borderWidth: 0.8, borderColor: INK, backgroundColor: "#e8e8e8" }} wrap={false}>
              <Text style={[s.bold, { width: 30, padding: 2.5, borderRightWidth: 0.5, borderRightColor: RULE }]}>8.0</Text>
              <Text style={[s.bold, { flex: 1, padding: 2.5 }]}>
                PROSUMER&apos;S LOW VOLTAGE ELECTRICAL INSTALLATION(S) (Chapter 82)
              </Text>
              <View style={{ width: 54, borderLeftWidth: 0.5, borderLeftColor: RULE }} />
            </View>
            {cert.customScheduleItems.map((item, i) => (
              <View
                key={item.id}
                style={{ flexDirection: "row", borderLeftWidth: 0.8, borderRightWidth: 0.8, borderBottomWidth: 0.4, borderColor: INK }}
                wrap={false}
              >
                <Text style={{ width: 30, padding: 2.5, borderRightWidth: 0.4, borderRightColor: RULE }}>8.{i + 1}</Text>
                <Text style={{ flex: 1, padding: 2.5 }}>{item.description ?? ""}</Text>
                <View style={{ width: 54, padding: 2.5, borderLeftWidth: 0.4, borderLeftColor: RULE, alignItems: "center", justifyContent: "center" }}>
                  {item.outcome === "ok" ? (
                    <Tick />
                  ) : (
                    <Text style={s.bold}>{item.outcome === "NV" ? "N/V" : item.outcome === "NA" ? "N/A" : (item.outcome ?? "")}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {footer}
      </Page>
    </Document>
  );
}
