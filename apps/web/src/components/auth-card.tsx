"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  devSignIn,
  requestLoginCode,
  verifyLoginCode,
  type OtpFormState,
} from "@/actions/auth";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

export function AuthCard() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "link";

  const [requestState, requestAction, requesting] = useActionState<OtpFormState, FormData>(
    requestLoginCode,
    {}
  );
  const [verifyState, verifyAction, verifying] = useActionState<OtpFormState, FormData>(
    verifyLoginCode,
    {}
  );

  const email = verifyState.email ?? requestState.email;
  const sent = requestState.sent || verifyState.sent;
  const error = verifyState.error ?? requestState.error;

  return (
    <main className="from-primary/15 flex min-h-screen items-center justify-center bg-gradient-to-b to-transparent p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <Link href="/" aria-label="FieldCert home" className="mx-auto mb-2 w-fit">
            <Logo />
          </Link>
          <CardTitle>Sign in to FieldCert</CardTitle>
          <CardDescription>Certificates, validated before they&apos;re issued.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {linkError && (
            <Alert variant="destructive">
              <AlertDescription>
                That sign-in link didn&apos;t work. It may have expired. Request a new code below.
              </AlertDescription>
            </Alert>
          )}

          {!sent ? (
            <form action={requestAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp-email">Email</Label>
                <Input id="otp-email" name="email" type="email" autoComplete="email" required />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={requesting}>
                {requesting ? "Sending…" : "Email me a sign-in code"}
              </Button>
              <p className="text-muted-foreground text-xs">
                No password needed: we email you a one-time code. New here? This also creates
                your account.
              </p>
            </form>
          ) : (
            <form action={verifyAction} className="flex flex-col gap-4">
              <input type="hidden" name="email" value={email ?? ""} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp-code">Enter the 6-digit code sent to {email}</Label>
                <InputOTP maxLength={6} name="token" id="otp-code" containerClassName="justify-center">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-muted-foreground text-xs">
                You can also just click the link in the email. Both work.
              </p>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={verifying}>
                {verifying ? "Checking…" : "Verify code"}
              </Button>
            </form>
          )}

          {process.env.NODE_ENV === "development" && (
            <form action={devSignIn}>
              <Button type="submit" variant="secondary" className="w-full">
                ⚡ Dev login (development only)
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
