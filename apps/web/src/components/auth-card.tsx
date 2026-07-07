"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  devSignIn,
  requestLoginCode,
  signIn,
  signUp,
  verifyLoginCode,
  type AuthFormState,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function OtpLogin() {
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

  if (!sent) {
    return (
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
          No password needed — we email you a one-time code. New here? This also creates your
          account.
        </p>
      </form>
    );
  }

  return (
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
        You can also just click the link in the email — both work.
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
  );
}

function PasswordForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});

  return (
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
  );
}

export function AuthCard({ mode }: { mode: "signin" | "signup" }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const linkError = searchParams.get("error") === "link";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign in to FieldCert" : "Create your FieldCert account"}</CardTitle>
          <CardDescription>Certificates, validated before they&apos;re issued.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {linkError && (
            <Alert variant="destructive">
              <AlertDescription>
                That sign-in link didn&apos;t work — it may have expired. Request a new code below.
              </AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="otp">
            <TabsList className="w-full">
              <TabsTrigger value="otp" className="flex-1">
                Email code
              </TabsTrigger>
              <TabsTrigger value="password" className="flex-1">
                Password
              </TabsTrigger>
            </TabsList>
            <TabsContent value="otp" className="pt-2">
              <OtpLogin />
            </TabsContent>
            <TabsContent value="password" className="pt-2">
              <PasswordForm mode={mode} next={next} />
            </TabsContent>
          </Tabs>
          <p className="text-muted-foreground text-center text-sm">
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
