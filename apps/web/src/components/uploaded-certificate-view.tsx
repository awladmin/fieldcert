"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download, FileText, Link2 } from "lucide-react";
import { createShareLink } from "@/actions/certificates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export function UploadedCertificateView({
  id,
  reference,
  uploadedAt,
}: {
  id: string;
  reference: string;
  uploadedAt: string;
}) {
  const [busy, startAction] = useTransition();

  function open() {
    startAction(async () => {
      const result = await createShareLink(id);
      if (result.url) window.open(result.url, "_blank");
      else toast.error(result.error ?? "Could not open the file");
    });
  }

  function copy() {
    startAction(async () => {
      const result = await createShareLink(id);
      if (result.url) {
        await navigator.clipboard.writeText(result.url);
        toast.success("Share link copied. Valid for 30 days");
      } else {
        toast.error(result.error ?? "Could not create a share link");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
              <FileText className="size-6" />
            </span>
            <div>
              <CardTitle>{reference}</CardTitle>
              <CardDescription>
                Uploaded certificate, added {new Date(uploadedAt).toLocaleDateString("en-GB")}
              </CardDescription>
            </div>
            <div className="ml-auto">
              <StatusBadge status="issued" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={open} disabled={busy}>
            <Download className="size-4" /> View file
          </Button>
          <Button variant="outline" onClick={copy} disabled={busy}>
            <Link2 className="size-4" /> Copy share link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
