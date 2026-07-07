import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * AI extraction for the board scanner and observation drafting.
 * Every result from these functions is subsequently checked by the
 * statutory rules engine before it can reach an issued certificate.
 */

const MODEL = "claude-opus-4-8";

export type ScanMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const scannedCircuit = z.object({
  circuitNumber: z.string().describe("Way/circuit number as labelled, e.g. '1' or '2A'"),
  description: z
    .string()
    .describe("What the circuit serves, from the board schedule label, e.g. 'Kitchen sockets'"),
  curve: z
    .enum(["B", "C", "D"])
    .nullable()
    .describe("MCB/RCBO curve letter if visible on the device, otherwise null"),
  ratingA: z
    .number()
    .nullable()
    .describe("Device rating in amps if visible, e.g. 32, otherwise null"),
});

const boardScan = z.object({
  boardDesignation: z
    .string()
    .nullable()
    .describe("Board name/designation if visible, e.g. 'DB1', otherwise null"),
  circuits: z.array(scannedCircuit).describe("One entry per way on the board, in order"),
  notes: z
    .string()
    .nullable()
    .describe("Anything ambiguous or unreadable the engineer should verify, otherwise null"),
});
export type BoardScan = z.infer<typeof boardScan>;

const observationDraft = z.object({
  description: z
    .string()
    .describe(
      "Professional EICR observation wording for the defect shown, as an inspector would write it"
    ),
  code: z
    .enum(["C1", "C2", "C3", "FI"])
    .describe(
      "Suggested BS 7671 classification: C1 danger present, C2 potentially dangerous, C3 improvement recommended, FI further investigation"
    ),
  reasoning: z.string().describe("One sentence on why this code fits, for the engineer to review"),
});
export type ObservationDraft = z.infer<typeof observationDraft>;

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("AI is not configured yet: ANTHROPIC_API_KEY is missing");
  }
  return new Anthropic();
}

export async function scanBoard(imageBase64: string, mediaType: ScanMediaType): Promise<BoardScan> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system:
      "You read UK electrical consumer units and distribution boards from photographs for EICR certificates. " +
      "Extract only what is actually legible: never invent circuit details. " +
      "If a label or device marking is unreadable, omit the uncertain field (null) and mention it in notes.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Extract the circuit schedule from this board photograph.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(boardScan) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The scanner could not process this image");
  }
  if (!response.parsed_output) {
    throw new Error("The scanner could not read this image. Try a closer, straight-on photo");
  }
  return response.parsed_output;
}

export async function draftObservation(
  imageBase64: string,
  mediaType: ScanMediaType,
  hint?: string
): Promise<ObservationDraft> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system:
      "You are an experienced UK electrical inspector writing EICR observations. " +
      "Given a photograph of a defect, write the observation as it should appear on the certificate: " +
      "factual, specific, professional, one or two sentences. Suggest the appropriate BS 7671 " +
      "classification code. If the photo does not clearly show an electrical defect, say what you " +
      "see and suggest FI.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: hint
              ? `Draft the observation for this defect. Engineer's note: ${hint}`
              : "Draft the observation for this defect.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(observationDraft) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The assistant could not process this image");
  }
  if (!response.parsed_output) {
    throw new Error("Could not draft an observation from this image. Try a clearer photo");
  }
  return response.parsed_output;
}
