"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Building2, CircleUser } from "lucide-react";
import { requestLoginCode, verifySignupCode, type OtpFormState } from "@/actions/auth";
import { Logo } from "@/components/logo";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Step = "type" | "name" | "company" | "email" | "code";
type AccountType = "individual" | "business";

const STEPS: Step[] = ["type", "name", "company", "email", "code"];
/** Progress moves from the very first tap; the account comes last. */
const PROGRESS: Record<Step, number> = { type: 15, name: 30, company: 45, email: 60, code: 75 };

const COPY: Record<Step, { title: string; description: string }> = {
  type: { title: "How do you work?", description: "One tap. We shape everything else around this." },
  name: { title: "What should we call you?", description: "This goes on your certificates as the inspector name." },
  company: { title: "Your business name", description: "This appears on every certificate you issue." },
  email: { title: "Where do we send your sign-in code?", description: "No password. We email you a 6-digit code instead." },
  code: { title: "Check your email", description: "Enter the code and your account is ready." },
};

export function SignupWizard() {
  const [step, setStep] = useState<Step>("type");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);

  function chooseType(type: AccountType) {
    setAccountType(type);
    setError(undefined);
    setStep("name");
  }

  function submitName() {
    if (!name.trim()) return setError("Enter your name");
    setError(undefined);
    if (accountType === "individual") setCompanyName((c) => c || name.trim());
    setStep("company");
  }

  function submitCompany() {
    if (!companyName.trim()) return setError("Enter a business or trading name");
    setError(undefined);
    setStep("email");
  }

  function submitEmail() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("fullName", name);
      const result: OtpFormState = await requestLoginCode({}, formData);
      if (result.error) return setError(result.error);
      setStep("code");
    });
  }

  function submitCode() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("token", code);
      formData.set("fullName", name);
      formData.set("accountType", accountType ?? "business");
      formData.set("companyName", companyName);
      const result = await verifySignupCode({}, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="from-primary/15 flex min-h-screen items-center justify-center bg-gradient-to-b to-transparent p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <Link href="/" aria-label="FieldCert home" className="mx-auto mb-4 w-fit">
            <Logo />
          </Link>
          <div className="mb-3 flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>
                Step {stepIndex + 1} of {STEPS.length}
              </span>
              <span className="text-primary">{PROGRESS[step]}% there</span>
            </div>
            <Progress value={PROGRESS[step]} className="h-2" />
          </div>
          <CardTitle>{COPY[step].title}</CardTitle>
          <CardDescription>{COPY[step].description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "type" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseType("individual")}
                className={cn(
                  "hover:border-primary hover:bg-primary/5 flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                  accountType === "individual" && "border-primary bg-primary/5"
                )}
              >
                <CircleUser className="text-primary size-7" />
                <span className="font-semibold">Just me</span>
                <span className="text-muted-foreground text-xs">
                  Sole trader. One login, all your certificates.
                </span>
              </button>
              <button
                type="button"
                onClick={() => chooseType("business")}
                className={cn(
                  "hover:border-primary hover:bg-primary/5 flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                  accountType === "business" && "border-primary bg-primary/5"
                )}
              >
                <Building2 className="text-primary size-7" />
                <span className="font-semibold">My business</span>
                <span className="text-muted-foreground text-xs">
                  Invite engineers. Office staff and admins free.
                </span>
              </button>
            </div>
          )}

          {step === "name" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitName();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="su-name">Your name</Label>
                <Input
                  id="su-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dan Jordan"
                  className="h-12 text-base"
                  autoComplete="name"
                  autoFocus
                />
              </div>
              <Button type="submit" className="h-12 text-base">Continue</Button>
            </form>
          )}

          {step === "company" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitCompany();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="su-company">
                  {accountType === "individual" ? "Trading name" : "Company name"}
                </Label>
                <Input
                  id="su-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={accountType === "individual" ? "e.g. Dan Jordan Electrical" : "e.g. Jordan Electrical Ltd"}
                  className="h-12 text-base"
                  autoFocus
                />
                <p className="text-muted-foreground text-xs">You can change this later in Settings.</p>
              </div>
              <Button type="submit" className="h-12 text-base">Continue</Button>
            </form>
          )}

          {step === "email" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitEmail();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.co.uk"
                  className="h-12 text-base"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="h-12 text-base" disabled={pending}>
                {pending ? "Sending" : "Send my code"}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitCode();
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="su-code">Code sent to {email}</Label>
                <InputOTP maxLength={6} value={code} onChange={setCode} id="su-code" containerClassName="justify-center">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-muted-foreground text-xs">
                  No code in the email? Click its confirmation link instead: that signs you in too, and we finish setup on the next screen.
                </p>
              </div>
              <Button type="submit" className="h-12 text-base" disabled={pending || code.length !== 6}>
                {pending ? "Creating your account" : "Finish signup"}
              </Button>
            </form>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stepIndex > 0 && step !== "code" && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              onClick={() => {
                setError(undefined);
                setStep(STEPS[stepIndex - 1]!);
              }}
            >
              Back
            </button>
          )}

          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link className="text-foreground underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
