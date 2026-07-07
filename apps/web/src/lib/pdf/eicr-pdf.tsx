import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Eicr } from "@fieldcert/cert-schemas";

export interface EicrPdfProps {
  cert: Eicr;
  orgName: string;
  reference: string;
  issuedAt: string;
}

export async function renderEicrPdfBuffer(props: EicrPdfProps): Promise<Buffer> {
  return renderToBuffer(<EicrPdf {...props} />);
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1c2733" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: "#157A55",
    paddingBottom: 8,
    marginBottom: 14,
  },
  orgName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  docTitle: { fontSize: 10, color: "#4a5866" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#157A55",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 150, color: "#4a5866" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1c2733",
    paddingBottom: 2,
    marginBottom: 2,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d8ddd6", paddingVertical: 2 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  td: { fontSize: 8 },
  assessment: {
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#157A55",
    borderRadius: 2,
  },
  assessmentText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#4a5866",
    borderTopWidth: 0.5,
    borderTopColor: "#d8ddd6",
    paddingTop: 6,
  },
});

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value !== undefined && value !== null && value !== "" ? String(value) : "-"}</Text>
    </View>
  );
}

function formatAddress(cert: Eicr) {
  const a = cert.installationAddress;
  if (!a) return "-";
  return [a.line1, a.line2, a.town, a.county, a.postcode].filter(Boolean).join(", ");
}

export function EicrPdf({ cert, orgName, reference, issuedAt }: EicrPdfProps) {
  const board = cert.boards[0];
  return (
    <Document title={`EICR ${reference}`} author={orgName} creator="FieldCert">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.docTitle}>Electrical Installation Condition Report (BS 7671)</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>Certificate ref: {reference}</Text>
            <Text style={styles.docTitle}>Issued: {issuedAt}</Text>
          </View>
        </View>

        <View style={styles.assessment}>
          <Text style={styles.assessmentText}>
            Overall assessment: {cert.overallAssessment === "satisfactory" ? "SATISFACTORY" : "UNSATISFACTORY"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client and installation</Text>
          <Field label="Client" value={cert.client?.name ?? cert.client?.companyName} />
          <Field label="Occupier" value={cert.occupier} />
          <Field label="Installation address" value={formatAddress(cert)} />
          <Field label="Extent of installation covered" value={cert.extentOfInstallationCovered} />
          <Field label="Date of inspection" value={cert.inspectionDate} />
          <Field label="Next inspection recommended by" value={cert.nextInspectionDue} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supply characteristics</Text>
          <Field label="Earthing arrangement" value={cert.supply?.earthing} />
          <Field label="Nominal voltage U0" value={cert.supply?.nominalVoltageU0 ? `${cert.supply.nominalVoltageU0} V` : undefined} />
          <Field label="Ze" value={cert.supply?.zeOhms !== undefined ? `${cert.supply.zeOhms} ohms` : undefined} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observations</Text>
          {cert.observations.length === 0 ? (
            <Text>No observations recorded.</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 30 }]}>Code</Text>
                <Text style={[styles.th, { flex: 1 }]}>Observation</Text>
              </View>
              {cert.observations.map((obs) => (
                <View key={obs.id} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 30, fontFamily: "Helvetica-Bold" }]}>{obs.code ?? "-"}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{obs.description ?? "-"}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {board && board.circuits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Schedule of circuit details and test results {board.designation ? `(${board.designation})` : ""}
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 26 }]}>No.</Text>
              <Text style={[styles.th, { flex: 1 }]}>Description</Text>
              <Text style={[styles.th, { width: 46 }]}>Device</Text>
              <Text style={[styles.th, { width: 46 }]}>Zs (ohms)</Text>
              <Text style={[styles.th, { width: 56 }]}>IR L-E (Mohm)</Text>
              <Text style={[styles.th, { width: 46 }]}>RCD (ms)</Text>
              <Text style={[styles.th, { width: 40 }]}>Polarity</Text>
            </View>
            {board.circuits.map((circuit) => {
              const tr = board.testResults.find((t) => t.circuitId === circuit.id);
              return (
                <View key={circuit.id} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 26 }]}>{circuit.circuitNumber ?? "-"}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{circuit.description ?? "-"}</Text>
                  <Text style={[styles.td, { width: 46 }]}>
                    {circuit.ocpd?.curve && circuit.ocpd?.ratingA ? `${circuit.ocpd.curve}${circuit.ocpd.ratingA}` : "-"}
                  </Text>
                  <Text style={[styles.td, { width: 46 }]}>{tr?.zsOhms ?? "-"}</Text>
                  <Text style={[styles.td, { width: 56 }]}>{tr?.insulationResistance?.liveEarthMohm ?? "-"}</Text>
                  <Text style={[styles.td, { width: 46 }]}>{tr?.rcdOperatingTimeMs ?? "-"}</Text>
                  <Text style={[styles.td, { width: 40 }]}>{tr?.polarityConfirmed ? "Yes" : "-"}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Declaration</Text>
          <Field label="Inspected and reported by" value={cert.inspector?.name} />
          <Field label="Signed (date)" value={cert.inspectorSignedAt} />
          <Text style={{ marginTop: 4, color: "#4a5866" }}>
            This report was checked by the FieldCert validation engine against BS 7671 statutory rules
            before issue. It is an assessment of the electrical installation only.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{orgName}</Text>
          <Text>Generated with FieldCert</Text>
        </View>
      </Page>
    </Document>
  );
}
