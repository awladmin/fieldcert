import type { Eicr } from "@fieldcert/cert-schemas";
import { eicrStatutoryRules, runEicrRules } from "./rules/eicr";
import type { EicrRule, RuleContext, ValidationResult } from "./types";

export interface ValidateOptions {
  stage?: RuleContext["stage"];
  /** YYYY-MM-DD; injected for determinism */
  today: string;
  /**
   * Org-level policy rules layered on top of the statutory set.
   * Statutory rules always run and cannot be removed.
   */
  policyRules?: EicrRule[];
}

export function validateEicr(cert: Eicr, opts: ValidateOptions): ValidationResult {
  const ctx: RuleContext = { stage: opts.stage ?? "draft", today: opts.today };
  const issues = runEicrRules(cert, ctx, [...eicrStatutoryRules, ...(opts.policyRules ?? [])]);
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  return { issues, errorCount, warningCount, issuable: errorCount === 0 };
}
