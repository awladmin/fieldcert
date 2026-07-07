"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOrgSettings } from "@/actions/orgs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrgSettings({
  orgName,
  qsApprovalRequired,
  plan,
  seats,
  accountType,
  subscriptionStatus,
  trialEndsAt = null,
}: {
  orgName: string;
  qsApprovalRequired: boolean;
  plan: string | null;
  seats: number;
  accountType: "individual" | "business";
  subscriptionStatus: string;
  trialEndsAt?: string | null;
}) {
  const [name, setName] = useState(orgName);
  const [qsRequired, setQsRequired] = useState(qsApprovalRequired);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateOrgSettings({ name, qsApprovalRequired: qsRequired });
      if (result.error) toast.error(result.error);
      else toast.success("Settings saved");
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisation</CardTitle>
          <CardDescription>The name that appears on your certificates and PDFs.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="qs-approval"
              checked={qsRequired}
              onCheckedChange={(checked) => setQsRequired(checked === true)}
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="qs-approval">Require QS approval before issue</Label>
              <p className="text-muted-foreground text-xs">
                When on, engineers submit certificates for approval and a QS or admin issues them.
                Statutory validation applies either way and cannot be turned off.
              </p>
            </div>
          </div>
          <Button onClick={save} disabled={pending || !name.trim()} className="self-start">
            {pending ? "Saving" : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan and billing</CardTitle>
          <CardDescription>Billing is in test mode. Stripe goes live at launch.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium capitalize">{plan ?? "none"}</span>
          </div>
          {accountType === "business" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Engineer seats</span>
              <span className="font-medium tabular-nums">{seats}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
              {subscriptionStatus === "trialing" ? "Free trial" : subscriptionStatus}
            </Badge>
          </div>
          {subscriptionStatus === "trialing" && trialEndsAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trial ends</span>
              <span className="font-medium">{new Date(trialEndsAt).toLocaleDateString("en-GB")}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monthly total</span>
            <span className="font-medium tabular-nums">
              £{(accountType === "individual" ? 14.99 : seats * 12).toFixed(2)} + VAT
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
