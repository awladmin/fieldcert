"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { saveBranding } from "@/actions/branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESETS = ["#157A55", "#1d4ed8", "#b91c1c", "#c2410c", "#7c3aed", "#0e7490", "#111827"];

export interface BrandingValues {
  color: string;
  enrolmentNumber: string;
  address: string;
  phone: string;
  website: string;
  logoUrl: string | null;
  schemeLogoUrl: string | null;
}

/** Certificate branding: everything here prints on every certificate issued. */
export function BrandingCard({ initial }: { initial: BrandingValues }) {
  const [color, setColor] = useState(initial.color || "#157A55");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("color", color);
    startTransition(async () => {
      const result = await saveBranding(formData);
      if (result.error) toast.error(result.error);
      else toast.success("Branding saved. It prints on every certificate from now on");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="text-primary size-4" /> Certificate branding
        </CardTitle>
        <CardDescription>
          Your logo, scheme badge, brand colour and company details, printed on every certificate
          your organisation issues, exactly where the big providers put theirs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Brand colour (section bars and headings)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Use ${preset}`}
                  onClick={() => setColor(preset)}
                  className={cn(
                    "size-9 rounded-lg border-2 transition-transform",
                    color === preset ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: preset }}
                />
              ))}
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-28 font-mono text-sm"
                aria-label="Brand colour hex value"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-enrolment">Scheme enrolment number</Label>
              <Input id="b-enrolment" name="enrolmentNumber" defaultValue={initial.enrolmentNumber} placeholder="e.g. 003293/000" className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-phone">Telephone</Label>
              <Input id="b-phone" name="phone" defaultValue={initial.phone} className="h-11" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="b-address">Company address (printed in the declaration)</Label>
              <Input id="b-address" name="address" defaultValue={initial.address} placeholder="e.g. 1 High Street, Amersham, HP7 0AA" className="h-11" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="b-website">Website</Label>
              <Input id="b-website" name="website" defaultValue={initial.website} className="h-11" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-logo">Company logo (PNG or JPEG, ideally 600x200)</Label>
              {initial.logoUrl && (
                <div className="bg-background w-fit rounded-lg border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={initial.logoUrl} alt="Current company logo" className="h-10 object-contain" />
                </div>
              )}
              <Input id="b-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-scheme">Scheme badge (e.g. NICEIC, NAPIT)</Label>
              {initial.schemeLogoUrl && (
                <div className="bg-background w-fit rounded-lg border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={initial.schemeLogoUrl} alt="Current scheme badge" className="h-10 object-contain" />
                </div>
              )}
              <Input id="b-scheme" name="schemeLogo" type="file" accept="image/png,image/jpeg,image/webp" />
              <p className="text-muted-foreground text-xs">
                Upload the badge your scheme provides you as a member; their logo use rules apply.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Saving" : "Save branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
