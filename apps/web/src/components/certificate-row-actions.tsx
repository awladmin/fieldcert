"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteCertificate } from "@/actions/certificates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Delete for unissued certificates; issued ones are permanent legal records. */
export function CertificateRowActions({ id, reference }: { id: string; reference: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteCertificate(id);
      if (result.error) toast.error(result.error);
      else toast.success(`${reference} deleted`);
      setConfirming(false);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${reference}`}
        onClick={(e) => {
          e.preventDefault();
          setConfirming(true);
        }}
      >
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {reference}?</AlertDialogTitle>
            <AlertDialogDescription>
              The draft and any files archived with it are removed permanently. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting" : "Delete certificate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
