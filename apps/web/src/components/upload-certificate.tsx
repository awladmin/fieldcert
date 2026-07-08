"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileCheck2, Upload, UploadCloud } from "lucide-react";
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
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,image/*,.easycert";

function accepted(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.type.startsWith("image/") ||
    file.name.toLowerCase().endsWith(".easycert")
  );
}

export function UploadCertificate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function upload(chosen: File, reference: string) {
    const formData = new FormData();
    formData.set("file", chosen);
    if (reference) formData.set("reference", reference);
    startTransition(async () => {
      const result = await uploadLegacyCertificate(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      formRef.current?.reset();
      setFile(null);
      setOpen(false);
      if (result.certificateId) {
        toast.success(`Imported${result.summary ? `: ${result.summary}` : ""}. Review the draft and complete it`);
        router.push(`/certificates/${result.certificateId}`);
      } else {
        toast.success("Certificate added to your register");
      }
    });
  }

  function submit(formData: FormData) {
    if (!file) {
      toast.error("Choose or drop a file to upload");
      return;
    }
    upload(file, String(formData.get("reference") ?? "").trim());
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!accepted(dropped)) {
      toast.error("Drop a PDF, a photo, or an .easycert file");
      return;
    }
    setFile(dropped);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFile(null); }}>
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
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-input hover:border-foreground/30 hover:bg-muted/40",
              file && "border-primary/50 bg-primary/5"
            )}
          >
            {file ? (
              <>
                <FileCheck2 className="text-primary size-8" />
                <p className="font-medium">{file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · click to choose a different file
                </p>
              </>
            ) : (
              <>
                <UploadCloud className={cn("size-8", dragging ? "text-primary" : "text-muted-foreground")} />
                <p className="font-medium">Drag a file here, or click to browse</p>
                <p className="text-muted-foreground text-xs">PDF, photo or .easycert, up to 25MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                if (chosen) setFile(chosen);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cert-ref">Reference (optional, PDFs and photos only)</Label>
            <Input id="cert-ref" name="reference" placeholder="e.g. EICR 12 High Street 2024" />
          </div>
          <Button type="submit" disabled={pending || !file}>
            {pending ? "Uploading" : "Add to register"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
