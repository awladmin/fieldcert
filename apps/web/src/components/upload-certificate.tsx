"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await uploadLegacyCertificate(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
      if (result.certificateId) {
        toast.success(`Imported${result.summary ? `: ${result.summary}` : ""}. Review the draft and complete it`);
        router.push(`/certificates/${result.certificateId}`);
      } else {
        toast.success("Certificate added to your register");
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
            Bring certificates from your old system into the register. PDFs and photos file as
            they are. EasyCert (.easycert) files import as editable drafts with the client,
            address and dates already filled in, and the original file is archived alongside.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cert-file">Certificate file (PDF, photo or .easycert, up to 25MB)</Label>
            <Input id="cert-file" name="file" type="file" accept=".pdf,image/*,.easycert" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cert-ref">Reference (optional, PDFs and photos only)</Label>
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
