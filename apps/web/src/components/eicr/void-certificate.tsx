"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { voidCertificate } from "@/actions/certificates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/**
 * The only thing that can ever happen to an issued certificate: voiding it,
 * with a reason on the permanent record, and optionally a corrected draft.
 */
export function VoidCertificate({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reissue, setReissue] = useState(true);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await voidCertificate(id, reason, reissue);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      if (result.newCertificateId) {
        toast.success(`${reference} voided. This is the corrected draft`);
        router.push(`/certificates/${result.newCertificateId}`);
      } else {
        toast.success(`${reference} voided`);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Ban className="size-4" /> Void
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void {reference}?</DialogTitle>
          <DialogDescription>
            The certificate stays in the register permanently, marked void, with your reason on the
            audit trail. It can no longer be shared or downloaded. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="void-reason">Reason for voiding</Label>
            <textarea
              id="void-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wrong installation address; readings entered against the wrong circuit"
              className="border-input focus-visible:ring-ring w-full rounded-lg border bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
            <Checkbox checked={reissue} onCheckedChange={(v) => setReissue(v === true)} />
            <span className="text-sm font-medium">
              Open a corrected draft with the same details, ready to fix and reissue
            </span>
          </label>
          <Button variant="destructive" onClick={submit} disabled={pending || !reason.trim()}>
            {pending ? "Voiding" : "Void certificate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
