import { eicr } from "@fieldcert/cert-schemas";
import { validateEicr } from "@fieldcert/rules-engine";
import { apiError, authenticateApiKey } from "@/lib/api-auth";

/**
 * POST /api/v1/validate
 * Body: { "kind": "EICR", "data": { ...certificate data... }, "stage": "draft" | "issue" }
 * Returns the statutory validation result without storing anything.
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiKey(request);
  if (!ctx) return apiError(401, "Missing or invalid API key");

  let body: { kind?: string; data?: unknown; stage?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Body must be JSON");
  }

  if (body.kind !== "EICR") return apiError(422, "Unsupported certificate kind. Supported: EICR");

  const parsed = eicr.safeParse({ ...(body.data as object), kind: "EICR" });
  if (!parsed.success) {
    return apiError(422, "Certificate data failed schema validation", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const stage = body.stage === "draft" ? "draft" : "issue";
  const validation = validateEicr(parsed.data, {
    today: new Date().toISOString().slice(0, 10),
    stage,
  });

  return Response.json({
    kind: "EICR",
    stage,
    issuable: validation.issuable,
    errorCount: validation.errorCount,
    warningCount: validation.warningCount,
    issues: validation.issues,
  });
}
