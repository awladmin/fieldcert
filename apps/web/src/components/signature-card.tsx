"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Eraser, PenLine, Trash2, Upload } from "lucide-react";
import { deleteSignature, saveSignature } from "@/actions/branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Draw-or-upload signature capture. The image prints in the signature boxes
 * of every certificate this user signs.
 */
export function SignatureCard({ currentSignatureUrl }: { currentSignatureUrl: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [pending, startTransition] = useTransition();

  function ctx() {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#1a1d40";
    return context;
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const { x, y } = pos(e);
    const c = ctx();
    c.beginPath();
    c.moveTo(x, y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const c = ctx();
    c.lineTo(x, y);
    c.stroke();
    setHasInk(true);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function save() {
    canvasRef.current!.toBlob((blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.set("signature", new File([blob], "signature.png", { type: "image/png" }));
      startTransition(async () => {
        const result = await saveSignature(formData);
        if (result.error) toast.error(result.error);
        else {
          toast.success("Signature saved. It prints on certificates you sign");
          clear();
        }
      });
    }, "image/png");
  }

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("signature", file);
    startTransition(async () => {
      const result = await saveSignature(formData);
      if (result.error) toast.error(result.error);
      else toast.success("Signature saved. It prints on certificates you sign");
    });
    e.target.value = "";
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteSignature();
      if (result.error) toast.error(result.error);
      else toast.success("Signature removed");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="text-primary size-4" /> Your signature
        </CardTitle>
        <CardDescription>
          Draw it below or upload an image. It prints in the signature boxes of certificates you
          inspect or authorise. Until you add one, your typed name is used.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {currentSignatureUrl && (
          <div className="flex items-center gap-4">
            <div className="bg-background rounded-lg border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentSignatureUrl} alt="Your current signature" className="h-12 object-contain" />
            </div>
            <Button variant="ghost" onClick={remove} disabled={pending}>
              <Trash2 className="size-4" /> Remove
            </Button>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={640}
          height={180}
          className="h-32 w-full max-w-lg cursor-crosshair touch-none rounded-lg border bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={pending || !hasInk}>
            {pending ? "Saving" : "Save signature"}
          </Button>
          <Button variant="outline" onClick={clear} disabled={pending}>
            <Eraser className="size-4" /> Clear
          </Button>
          <label className="border-input hover:bg-muted flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-5 text-[0.95rem] font-medium transition-colors">
            <Upload className="size-4" /> Upload instead
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
