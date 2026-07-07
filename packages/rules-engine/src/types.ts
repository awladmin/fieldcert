import type { Eicr } from "@fieldcert/cert-schemas";

export type Severity = "error" | "warning" | "info";

/** Which layer a rule belongs to. Statutory rules can never be disabled. */
export type RuleLayer = "statutory" | "policy";

export interface ValidationIssue {
  /** Stable rule identifier, e.g. "eicr.zs.max-exceeded" */
  rule: string;
  /** Dot/bracket path into the certificate data, e.g. "boards[0].testResults[2].zsOhms" */
  field: string;
  severity: Severity;
  /** Human-readable, engineer-facing message */
  message: string;
  layer: RuleLayer;
}

export interface RuleContext {
  /** "draft" runs everything as it stands; "issue" is the gate before a certificate is issued */
  stage: "draft" | "issue";
  /** Injected so the engine stays deterministic and testable */
  today: string; // YYYY-MM-DD
}

export interface EicrRule {
  id: string;
  layer: RuleLayer;
  check(cert: Eicr, ctx: RuleContext): ValidationIssue[];
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** True when there are no error-severity issues; the certificate may be issued */
  issuable: boolean;
}
