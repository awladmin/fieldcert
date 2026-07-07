import { INSPECTION_SCHEDULE, type Eicr } from "@fieldcert/cert-schemas";
import type { EicrRule, RuleContext, ValidationIssue } from "../types";
import { maxZsOhms, MEASURED_ZS_FACTOR } from "../tables/zs";

const ADVERSE_CODES = new Set(["C1", "C2", "FI"]);

/** Every C1/C2/FI recorded anywhere on the report: observations plus schedule. */
function adverseFindings(cert: Eicr): { observations: boolean; scheduleItems: string[] } {
  const scheduleItems = [
    ...Object.entries(cert.inspectionSchedule ?? {})
      .filter(([, outcome]) => ADVERSE_CODES.has(outcome))
      .map(([itemId]) => itemId),
    ...(cert.customScheduleItems ?? [])
      .filter((item) => item.outcome && ADVERSE_CODES.has(item.outcome))
      .map((item) => item.id),
  ];
  return {
    observations: cert.observations.some((o) => o.code && ADVERSE_CODES.has(o.code)),
    scheduleItems,
  };
}

function issue(
  rule: string,
  field: string,
  severity: ValidationIssue["severity"],
  message: string
): ValidationIssue {
  return { rule, field, severity, message, layer: "statutory" };
}

/** Fields that must be present before an EICR can be issued. */
const completeness: EicrRule = {
  id: "eicr.completeness",
  layer: "statutory",
  check(cert, ctx) {
    if (ctx.stage !== "issue") return [];
    const issues: ValidationIssue[] = [];
    const required: Array<[unknown, string, string]> = [
      [cert.installationAddress?.line1, "installationAddress.line1", "Installation address is required"],
      [cert.installationAddress?.postcode, "installationAddress.postcode", "Installation postcode is required"],
      [cert.client?.name ?? cert.client?.companyName, "client.name", "Client name is required"],
      [cert.inspectionDate, "inspectionDate", "Inspection date is required"],
      [cert.nextInspectionDue, "nextInspectionDue", "Recommended date of next inspection is required"],
      [cert.extentOfInstallationCovered, "extentOfInstallationCovered", "Extent of the installation covered must be recorded"],
      [cert.supply?.earthing, "supply.earthing", "Earthing arrangement (TN-S / TN-C-S / TT / IT) is required"],
      [cert.overallAssessment, "overallAssessment", "Overall assessment (satisfactory / unsatisfactory) is required"],
      [cert.inspector?.name, "inspector.name", "Inspector name is required"],
      [cert.inspectorSignedAt, "inspectorSignedAt", "Inspector signature date is required"],
    ];
    for (const [value, field, message] of required) {
      if (value === undefined || value === null || value === "") {
        issues.push(issue("eicr.completeness", field, "error", message));
      }
    }
    return issues;
  },
};

/** Every observation needs a description and a classification code. */
const observationsComplete: EicrRule = {
  id: "eicr.observations.complete",
  layer: "statutory",
  check(cert) {
    const issues: ValidationIssue[] = [];
    cert.observations.forEach((obs, i) => {
      if (!obs.description) {
        issues.push(
          issue("eicr.observations.complete", `observations[${i}].description`, "error", "Observation needs a description")
        );
      }
      if (!obs.code) {
        issues.push(
          issue(
            "eicr.observations.complete",
            `observations[${i}].code`,
            "error",
            "Observation needs a classification code (C1, C2, C3 or FI)"
          )
        );
      }
    });
    return issues;
  },
};

/**
 * C1, C2 or FI observations mean the installation cannot be reported as
 * satisfactory; conversely an unsatisfactory verdict with no C1/C2/FI needs
 * checking.
 */
const assessmentConsistency: EicrRule = {
  id: "eicr.assessment.consistency",
  layer: "statutory",
  check(cert) {
    if (!cert.overallAssessment) return [];
    const adverse = adverseFindings(cert);
    const hasDangerous = adverse.observations || adverse.scheduleItems.length > 0;
    if (hasDangerous && cert.overallAssessment === "satisfactory") {
      const source = adverse.observations
        ? "observations"
        : `inspection schedule item${adverse.scheduleItems.length === 1 ? "" : "s"} ${adverse.scheduleItems.join(", ")}`;
      return [
        issue(
          "eicr.assessment.consistency",
          "overallAssessment",
          "error",
          `There are C1, C2 or FI outcomes in the ${source}, so the overall assessment must be Unsatisfactory (BS 7671)`
        ),
      ];
    }
    if (!hasDangerous && cert.overallAssessment === "unsatisfactory") {
      return [
        issue(
          "eicr.assessment.consistency",
          "overallAssessment",
          "warning",
          "Assessment is Unsatisfactory but no C1, C2 or FI outcomes are recorded. Add the observation that justifies it"
        ),
      ];
    }
    return [];
  },
};

/**
 * A C1/C2/FI outcome on a schedule item must be backed by an observation
 * carrying that item number, so the defect is described and coded on the
 * report rather than existing only as a tick in a grid.
 */
const scheduleObservationLink: EicrRule = {
  id: "eicr.schedule.observation-link",
  layer: "statutory",
  check(cert) {
    const adverse = adverseFindings(cert);
    const referenced = new Set(cert.observations.map((o) => o.itemNumber).filter(Boolean));
    return adverse.scheduleItems
      .filter((itemId) => !referenced.has(itemId))
      .map((itemId) =>
        issue(
          "eicr.schedule.observation-link",
          `inspectionSchedule.${itemId}`,
          "error",
          `Schedule item ${itemId} is marked ${cert.inspectionSchedule?.[itemId] ?? "adverse"} but has no observation describing the defect`
        )
      );
  },
};

/** Every fixed schedule item needs an outcome before the report can be issued. */
const scheduleComplete: EicrRule = {
  id: "eicr.schedule.complete",
  layer: "statutory",
  check(cert, ctx) {
    if (ctx.stage !== "issue") return [];
    const issues: ValidationIssue[] = [];
    const outcomes = cert.inspectionSchedule ?? {};
    for (const section of INSPECTION_SCHEDULE) {
      const missing = section.items.filter((item) => !outcomes[item.id]);
      if (missing.length > 0) {
        issues.push(
          issue(
            "eicr.schedule.complete",
            `inspectionSchedule.section${section.number}`,
            "error",
            `Inspection schedule section ${section.number} has ${missing.length} item${missing.length === 1 ? "" : "s"} without an outcome`
          )
        );
      }
    }
    (cert.customScheduleItems ?? []).forEach((item, i) => {
      if (item.description && !item.outcome) {
        issues.push(
          issue(
            "eicr.schedule.complete",
            `customScheduleItems[${i}].outcome`,
            "error",
            "Custom schedule item needs an outcome"
          )
        );
      }
    });
    return issues;
  },
};

/** Measured Zs must not exceed the BS 7671 Table 41.3 maximum for the OCPD. */
const zsWithinLimits: EicrRule = {
  id: "eicr.zs.max",
  layer: "statutory",
  check(cert) {
    const issues: ValidationIssue[] = [];
    cert.boards.forEach((board, b) => {
      board.testResults.forEach((tr, t) => {
        if (tr.zsOhms === undefined) return;
        const circuit = board.circuits.find((c) => c.id === tr.circuitId);
        if (!circuit) return;
        const max = maxZsOhms(circuit);
        if (max === null) return;
        const field = `boards[${b}].testResults[${t}].zsOhms`;
        const device = `${circuit.ocpd?.curve}${circuit.ocpd?.ratingA}`;
        if (tr.zsOhms > max) {
          issues.push(
            issue(
              "eicr.zs.max",
              field,
              "error",
              `Zs ${tr.zsOhms}Ω exceeds the maximum ${max.toFixed(2)}Ω for a ${device} device (BS 7671 Table 41.3)`
            )
          );
        } else if (tr.zsOhms > max * MEASURED_ZS_FACTOR) {
          issues.push(
            issue(
              "eicr.zs.max",
              field,
              "warning",
              `Zs ${tr.zsOhms}Ω exceeds 80% of the ${max.toFixed(2)}Ω maximum for a ${device} device. Verify against the temperature-corrected limit`
            )
          );
        }
      });
    });
    return issues;
  },
};

/** RCD disconnection times per BS EN 61008/61009 at 1x IΔn. */
const rcdTimes: EicrRule = {
  id: "eicr.rcd.operating-time",
  layer: "statutory",
  check(cert) {
    const issues: ValidationIssue[] = [];
    cert.boards.forEach((board, b) => {
      board.testResults.forEach((tr, t) => {
        if (tr.rcdOperatingTimeMs === undefined) return;
        const circuit = board.circuits.find((c) => c.id === tr.circuitId);
        const isSType = circuit?.rcd?.type === "S";
        const limitMs = isSType ? 500 : 300;
        if (tr.rcdOperatingTimeMs > limitMs) {
          issues.push(
            issue(
              "eicr.rcd.operating-time",
              `boards[${b}].testResults[${t}].rcdOperatingTimeMs`,
              "error",
              `RCD operating time ${tr.rcdOperatingTimeMs}ms exceeds the ${limitMs}ms limit at 1×IΔn${isSType ? " for an S-type device" : ""}`
            )
          );
        }
      });
    });
    return issues;
  },
};

/** Insulation resistance minimums per BS 7671 Table 61. */
const insulationResistance: EicrRule = {
  id: "eicr.insulation-resistance.min",
  layer: "statutory",
  check(cert) {
    const issues: ValidationIssue[] = [];
    cert.boards.forEach((board, b) => {
      board.testResults.forEach((tr, t) => {
        const ir = tr.insulationResistance;
        if (!ir) return;
        for (const [key, value] of [
          ["liveLiveMohm", ir.liveLiveMohm],
          ["liveEarthMohm", ir.liveEarthMohm],
        ] as const) {
          if (value === undefined) continue;
          const field = `boards[${b}].testResults[${t}].insulationResistance.${key}`;
          if (value < 1) {
            issues.push(
              issue(
                "eicr.insulation-resistance.min",
                field,
                "error",
                `Insulation resistance ${value}MΩ is below the 1MΩ minimum (BS 7671 Table 61)`
              )
            );
          } else if (value < 2) {
            issues.push(
              issue(
                "eicr.insulation-resistance.min",
                field,
                "warning",
                `Insulation resistance ${value}MΩ is below 2MΩ. Further investigation is recommended (GN3)`
              )
            );
          }
        }
      });
    });
    return issues;
  },
};

/** Polarity must be confirmed on every tested circuit before issue. */
const polarity: EicrRule = {
  id: "eicr.polarity.confirmed",
  layer: "statutory",
  check(cert, ctx) {
    if (ctx.stage !== "issue") return [];
    const issues: ValidationIssue[] = [];
    cert.boards.forEach((board, b) => {
      board.testResults.forEach((tr, t) => {
        if (tr.polarityConfirmed !== true) {
          issues.push(
            issue(
              "eicr.polarity.confirmed",
              `boards[${b}].testResults[${t}].polarityConfirmed`,
              "error",
              "Polarity must be confirmed for every tested circuit"
            )
          );
        }
      });
    });
    return issues;
  },
};

/** Date sanity: inspection not in the future, next inspection after it. */
const dates: EicrRule = {
  id: "eicr.dates",
  layer: "statutory",
  check(cert, ctx) {
    const issues: ValidationIssue[] = [];
    if (cert.inspectionDate && cert.inspectionDate > ctx.today) {
      issues.push(issue("eicr.dates", "inspectionDate", "error", "Inspection date cannot be in the future"));
    }
    if (cert.inspectionDate && cert.nextInspectionDue && cert.nextInspectionDue <= cert.inspectionDate) {
      issues.push(
        issue("eicr.dates", "nextInspectionDue", "error", "Next inspection date must be after the inspection date")
      );
    }
    return issues;
  },
};

export const eicrStatutoryRules: EicrRule[] = [
  completeness,
  observationsComplete,
  assessmentConsistency,
  scheduleObservationLink,
  scheduleComplete,
  zsWithinLimits,
  rcdTimes,
  insulationResistance,
  polarity,
  dates,
];

export function runEicrRules(cert: Eicr, ctx: RuleContext, rules: EicrRule[] = eicrStatutoryRules): ValidationIssue[] {
  return rules.flatMap((rule) => rule.check(cert, ctx));
}
