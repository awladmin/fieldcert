"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { ScanLine, Sparkles } from "lucide-react";
import type { BoardScan, ObservationDraft } from "@/lib/ai/extract";
import { draftObservationAction, scanBoardAction } from "@/actions/ai";
import { Button } from "@/components/ui/button";

/** Camera-first file input wired to an AI action. */
function usePhotoAction(onFile: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      capture="environment"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFile(file);
        e.target.value = "";
      }}
    />
  );
  return { input, open: () => inputRef.current?.click() };
}

export function ScanBoardButton({
  onScan,
  disabled,
}: {
  onScan: (scan: BoardScan) => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const { input, open } = usePhotoAction((file) => {
    startTransition(async () => {
      toast.info("Reading the board. This takes a few seconds");
      const formData = new FormData();
      formData.set("image", file);
      const result = await scanBoardAction(formData);
      if (result.scan) {
        onScan(result.scan);
        const n = result.scan.circuits.length;
        toast.success(
          `${n} circuit${n === 1 ? "" : "s"} read from the board. Every value still runs through validation`
        );
        if (result.scan.notes) toast.message("Scanner note", { description: result.scan.notes });
      } else {
        toast.error(result.error ?? "Scan failed");
      }
    });
  });

  return (
    <>
      {input}
      <Button type="button" onClick={open} disabled={disabled || pending}>
        <ScanLine className="size-4" />
        {pending ? "Scanning" : "Scan board"}
      </Button>
    </>
  );
}

export function DraftObservationButton({
  onDraft,
  disabled,
}: {
  onDraft: (draft: ObservationDraft) => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const { input, open } = usePhotoAction((file) => {
    startTransition(async () => {
      toast.info("Drafting the observation");
      const formData = new FormData();
      formData.set("image", file);
      const result = await draftObservationAction(formData);
      if (result.draft) {
        onDraft(result.draft);
        toast.success(`Observation drafted with code ${result.draft.code}`, {
          description: result.draft.reasoning,
        });
      } else {
        toast.error(result.error ?? "Drafting failed");
      }
    });
  });

  return (
    <>
      {input}
      <Button type="button" variant="outline" onClick={open} disabled={disabled || pending}>
        <Sparkles className="size-4" />
        {pending ? "Drafting" : "From photo"}
      </Button>
    </>
  );
}
