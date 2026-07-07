"use server";

import { requireOrg } from "@/lib/auth";
import {
  draftObservation,
  scanBoard,
  type BoardScan,
  type ObservationDraft,
  type ScanMediaType,
} from "@/lib/ai/extract";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES: ScanMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

async function readImage(formData: FormData): Promise<
  { base64: string; mediaType: ScanMediaType } | { error: string }
> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Photos are limited to 20MB" };
  if (!IMAGE_TYPES.includes(file.type as ScanMediaType)) {
    return { error: "Use a JPEG, PNG or WebP photo. iPhone HEIC photos: share as JPEG" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { base64: buffer.toString("base64"), mediaType: file.type as ScanMediaType };
}

export async function scanBoardAction(
  formData: FormData
): Promise<{ error?: string; scan?: BoardScan }> {
  await requireOrg();
  const image = await readImage(formData);
  if ("error" in image) return { error: image.error };

  try {
    const scan = await scanBoard(image.base64, image.mediaType);
    if (scan.circuits.length === 0) {
      return { error: "No circuits could be read from this photo. Try a closer, straight-on shot of the board" };
    }
    return { scan };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The scanner hit a problem. Try again" };
  }
}

export async function draftObservationAction(
  formData: FormData
): Promise<{ error?: string; draft?: ObservationDraft }> {
  await requireOrg();
  const image = await readImage(formData);
  if ("error" in image) return { error: image.error };
  const hint = String(formData.get("hint") ?? "").trim() || undefined;

  try {
    const draft = await draftObservation(image.base64, image.mediaType, hint);
    return { draft };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not draft the observation. Try again" };
  }
}
