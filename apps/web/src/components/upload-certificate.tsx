"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { uploadLegacyCertificate } from "@/actions/certificates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadCertificate() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await uploadLegacyCertificate(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Certificate added to your register");
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" /> Upload existing
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload an existing certificate</DialogTitle>
          <DialogDescription>
            Bring certificates from your old system into the register. Files are stored privately
            and only shared through time-limited links you create.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cert-file">Certificate file (PDF or photo, up to 25MB)</Label>
            <Input id="cert-file" name="file" type="file" accept=".pdf,image/*" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cert-ref">Reference (optional)</Label>
            <Input id="cert-ref" name="reference" placeholder="e.g. EICR 12 High Street 2024" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading" : "Add to register"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
