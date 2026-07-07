import type { ValidationIssue } from "@fieldcert/rules-engine";

/**
 * Maps validation issue field paths onto the editor's numbered parts so the
 * Validate panel can group issues and jump to the right section.
 */
export interface IssueGroup {
  key: string;
  title: string;
  /** DOM id of the editor section this group's issues live in */
  anchor: string;
  issues: ValidationIssue[];
}

interface GroupDef {
  key: string;
  title: string;
  anchor: string;
  match: (field: string) => boolean;
}

const PART_1_FIELDS = [
  "client",
  "installationAddress",
  "occupier",
  "descriptionOfPremises",
  "estimatedAgeYears",
  "evidenceOfAlterations",
  "purposeOfReport",
  "inspectionDate",
  "nextInspectionDue",
  "limitations",
  "extentOfInstallationCovered",
];

const GROUP_DEFS: GroupDef[] = [
  {
    key: "client",
    title: "Client and installation",
    anchor: "part-1",
    match: (f) => PART_1_FIELDS.some((p) => f === p || f.startsWith(`${p}.`)),
  },
  {
    key: "supply",
    title: "Supply characteristics",
    anchor: "part-2",
    match: (f) => f.startsWith("supply") || f.startsWith("particulars"),
  },
  {
    key: "boards",
    title: "Boards and circuits",
    anchor: "part-3",
    match: (f) => f.startsWith("boards"),
  },
  {
    key: "schedule",
    title: "Inspection schedule",
    anchor: "part-4",
    match: (f) => f.startsWith("inspectionSchedule") || f.startsWith("customScheduleItems"),
  },
  {
    key: "observations",
    title: "Observations",
    anchor: "part-5",
    match: (f) => f.startsWith("observations"),
  },
  // Catch-all last: overallAssessment, inspector, inspectorSignedAt and anything new.
  { key: "summary", title: "Summary and declaration", anchor: "part-6", match: () => true },
];

export function groupIssues(issues: ValidationIssue[]): IssueGroup[] {
  const groups = GROUP_DEFS.map((def) => ({
    key: def.key,
    title: def.title,
    anchor: def.anchor,
    issues: [] as ValidationIssue[],
  }));
  for (const issue of issues) {
    const index = GROUP_DEFS.findIndex((def) => def.match(issue.field));
    groups[index]!.issues.push(issue);
  }
  return groups;
}
