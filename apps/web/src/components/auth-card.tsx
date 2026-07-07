"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthFormState } from "@/actions/auth";
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

export function AuthCard({ mode }: { mode: "signin" | "signup" }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in to FieldCert" : "Create your FieldCert account"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Certificates, validated before they're issued."
              : "Start issuing validated certificates in minutes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName">Your name</Label>
                <Input id="fullName" name="fullName" autoComplete="name" required />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
              />
            </div>
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            {mode === "signin" ? (
              <>
                No account? <Link className="underline" href="/signup">Create one</Link>
              </>
            ) : (
              <>
                Already registered? <Link className="underline" href="/login">Sign in</Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
