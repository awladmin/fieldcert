"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  CircleUser,
  Clock,
  FileCheck2,
  MailWarning,
  Pencil,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Step = "welcome" | "type" | "name" | "company" | "email" | "review" | "code";
type AccountType = "individual" | "business";

/** Form steps for the progress bar; the welcome pitch screen sits before them. */
const STEPS: Exclude<Step, "welcome">[] = ["type", "name", "company", "email", "review", "code"];
/** Progress moves from the very first tap; the account comes last. */
const PROGRESS: Record<Exclude<Step, "welcome">, number> = {
  type: 15,
  name: 30,
  company: 45,
  email: 55,
  review: 70,
  code: 85,
};

const COPY: Record<Exclude<Step, "welcome">, { title: string; description: string }> = {
  type: { title: "How do you work?", description: "One tap. We shape everything else around this." },
  name: { title: "What should we call you?", description: "This goes on your certificates as the inspector name." },
  company: { title: "Your business name", description: "This appears on every certificate you issue." },
  email: { title: "What is your email?", description: "No password. We send you a 6-digit sign-in code instead." },
  review: { title: "Review your details", description: "Check everything is right, then create your account." },
  code: { title: "Verify your email address", description: "Enter the code and your account is ready." },
};

const BENEFITS = [
  { icon: ShieldCheck, text: "Validation built on BS 7671. A certificate with errors cannot be issued." },
  { icon: ScanLine, text: "Photograph the board and the AI fills the circuit schedule for you." },
  { icon: Sparkles, text: "AI drafts observation wording and suggests the classification code." },
  { icon: FileCheck2, text: "Branded PDF certificates with share links your clients can open." },
  { icon: Clock, text: "30 days free with everything included. No card needed." },
];

const RESEND_COOLDOWN_S = 45;

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
      <button
        type="button"
        aria-label={`Edit ${label.toLowerCase()}`}
        className="text-primary hover:bg-primary/10 rounded-lg p-2"
        onClick={onEdit}
      >
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

export function SignupWizard() {
  const [step, setStep] = useState<Step>("welcome");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const stepIndex = step === "welcome" ? -1 : STEPS.indexOf(step);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

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
    if (!email.trim() || !email.includes("@")) return setError("Enter a valid email address");
    setError(undefined);
    setStep("review");
  }

  function sendCode() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("fullName", name);
      const result: OtpFormState = await requestLoginCode({}, formData);
      if (result.error) return setError(result.error);
      setResendIn(RESEND_COOLDOWN_S);
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
      formData.set("termsAccepted", String(termsAccepted));
      formData.set("marketingOptIn", String(marketingOptIn));
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
          {step === "welcome" ? (
            <>
              <CardTitle className="text-center text-2xl text-balance">
                The certificate app that has your back
              </CardTitle>
              <CardDescription className="text-center">
                Less paperwork, no comebacks. Here is what FieldCert does for you:
              </CardDescription>
            </>
          ) : (
            <>
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
            </>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "welcome" && (
            <>
              <ul className="flex flex-col gap-2.5">
                {BENEFITS.map((b) => (
                  <li key={b.text} className="bg-muted/50 flex items-start gap-3 rounded-xl p-3.5">
                    <b.icon className="text-primary mt-0.5 size-5 shrink-0" />
                    <span className="text-sm">{b.text}</span>
                  </li>
                ))}
              </ul>
              <p className="text-center text-sm font-semibold">Less paperwork. No comebacks.</p>
              <Button className="h-12 text-base" onClick={() => setStep("type")}>
                Let&apos;s get started <ArrowRight className="size-4" />
              </Button>
            </>
          )}

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
              <Button type="submit" className="h-12 text-base">Continue</Button>
            </form>
          )}

          {step === "review" && (
            <>
              <div className="rounded-xl border px-4">
                <ReviewRow label="Name" value={name} onEdit={() => { setError(undefined); setStep("name"); }} />
                <ReviewRow
                  label={accountType === "individual" ? "Trading name" : "Company"}
                  value={companyName}
                  onEdit={() => { setError(undefined); setStep("company"); }}
                />
                <ReviewRow label="Email" value={email} onEdit={() => { setError(undefined); setStep("email"); }} />
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={marketingOptIn}
                  onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  Send me helpful tips and product updates
                  <span className="text-muted-foreground block text-xs">
                    Only relevant content, unsubscribe any time.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  I agree to the{" "}
                  <Link className="text-primary underline underline-offset-4" href="/terms" target="_blank">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link className="text-primary underline underline-offset-4" href="/privacy" target="_blank">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <Button
                className="h-12 text-base"
                onClick={sendCode}
                disabled={pending || !termsAccepted}
              >
                {pending ? "Sending your code" : "Create account"}
              </Button>
              <p className="text-muted-foreground text-center text-xs">
                <Link className="hover:text-foreground underline underline-offset-4" href="/terms" target="_blank">
                  Terms of Service
                </Link>
                {" · "}
                <Link className="hover:text-foreground underline underline-offset-4" href="/privacy" target="_blank">
                  Privacy Policy
                </Link>
              </p>
            </>
          )}

          {step === "code" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitCode();
              }}
            >
              <p className="text-sm">
                A verification code has been sent to <span className="font-semibold">{email}</span>.
              </p>
              <InputOTP maxLength={6} value={code} onChange={setCode} containerClassName="justify-center">
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <div className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
                {resendIn > 0 ? (
                  <p>You can request another code in {resendIn} seconds.</p>
                ) : (
                  <button
                    type="button"
                    className="text-primary font-medium underline underline-offset-4"
                    onClick={sendCode}
                    disabled={pending}
                  >
                    Resend the code
                  </button>
                )}
                <p className="flex items-center justify-center gap-1.5">
                  <MailWarning className="size-3.5 shrink-0 text-amber-500" />
                  <span>
                    <span className="font-semibold">Did not get the email?</span> Check your junk or
                    spam folder, or click the link inside it instead.
                  </span>
                </p>
              </div>

              <Button type="submit" className="h-12 text-base" disabled={pending || code.length !== 6}>
                {pending ? "Creating your account" : "Verify and finish"}
              </Button>
            </form>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stepIndex > 0 && step !== "code" && step !== "review" && (
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
