"use client";

import { useActionState } from "react";
import { createOrg, type OrgFormState } from "@/actions/orgs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OrgFormState, FormData>(createOrg, {});

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set up your organisation</CardTitle>
          <CardDescription>
            Your certificates are issued under this name. You can add engineers to it later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Company or trading name</Label>
              <Input id="name" name="name" placeholder="e.g. Jordan Electrical Ltd" required />
            </div>
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create organisation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
