"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, CircleUser, Lock, ShieldCheck } from "lucide-react";
import { activateSubscription, createOrg, saveProfileName } from "@/actions/orgs";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type OnboardingStep = "profile" | "org" | "billing";
type AccountType = "individual" | "business";

const STEPS: OnboardingStep[] = ["profile", "org", "billing"];

/**
 * Continues the signup wizard's journey (which ends at 75%): signup-path users
 * land straight on billing at 90%. Login-path users without an org walk all
 * three steps.
 */
const PROGRESS: Record<OnboardingStep, number> = { profile: 30, org: 60, billing: 90 };

export function OnboardingWizard({
  initialStep,
  initialName,
  orgAccountType,
  isAdmin,
  orgName,
}: {
  initialStep: OnboardingStep;
  initialName: string;
  orgAccountType: AccountType;
  isAdmin: boolean;
  orgName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [name, setName] = useState(initialName);
  const [accountType, setAccountType] = useState<AccountType>(orgAccountType);
  const [companyName, setCompanyName] = useState(orgName);
  const [seats, setSeats] = useState(3);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);

  function submitProfile() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveProfileName(name);
      if (result.error) return setError(result.error);
      if (accountType === "individual" && name.trim()) setCompanyName((c) => c || name.trim());
      setStep("org");
    });
  }

  function submitOrg() {
    setError(undefined);
    startTransition(async () => {
      const result = await createOrg(companyName, accountType);
      if (result.error) return setError(result.error);
      setStep("billing");
    });
  }

  function submitBilling() {
    setError(undefined);
    startTransition(async () => {
      const result = await activateSubscription(accountType === "individual" ? 1 : seats);
      if (result.error) return setError(result.error);
      router.push("/dashboard");
    });
  }

  const monthlyTotal = accountType === "individual" ? 14.99 : seats * 12;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-3 flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>
                Step {stepIndex + 1} of {STEPS.length}
              </span>
              <span className="text-primary">{PROGRESS[step]}% there</span>
            </div>
            <Progress value={PROGRESS[step]} className="h-2" />
          </div>
          <CardTitle>
            {step === "profile" && "Welcome to FieldCert"}
            {step === "org" && (accountType === "individual" ? "Your trading name" : "Your business")}
            {step === "billing" && "Choose your plan"}
          </CardTitle>
          <CardDescription>
            {step === "profile" && "Tell us who you are and how you work."}
            {step === "org" && "Certificates are issued under this name."}
            {step === "billing" && "Payments are in test mode. No card will be charged."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === "profile" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dan Jordan" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>How do you work?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType("individual")}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                      accountType === "individual" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <CircleUser className="text-primary size-5" />
                    <span className="text-sm font-medium">Just me</span>
                    <span className="text-muted-foreground text-xs">Sole trader. One login, all certificates.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("business")}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                      accountType === "business" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <Building2 className="text-primary size-5" />
                    <span className="text-sm font-medium">My business</span>
                    <span className="text-muted-foreground text-xs">
                      Invite engineers. Office staff and admins are free.
                    </span>
                  </button>
                </div>
              </div>
              <Button onClick={submitProfile} disabled={pending || !name.trim()}>
                {pending ? "Saving" : "Continue"}
              </Button>
            </>
          )}

          {step === "org" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyName">
                  {accountType === "individual" ? "Trading name" : "Company name"}
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={accountType === "individual" ? "e.g. Dan Jordan Electrical" : "e.g. Jordan Electrical Ltd"}
                />
                <p className="text-muted-foreground text-xs">
                  This appears on every certificate you issue. You can change it later in Settings.
                </p>
              </div>
              <Button onClick={submitOrg} disabled={pending || !companyName.trim()}>
                {pending ? "Creating" : "Continue"}
              </Button>
            </>
          )}

          {step === "billing" && !isAdmin && (
            <Alert>
              <AlertDescription>
                Your organisation&apos;s subscription is not active yet. Ask your admin to complete
                billing, then sign in again.
              </AlertDescription>
            </Alert>
          )}

          {step === "billing" && isAdmin && (
            <>
              <div className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {accountType === "individual" ? "Individual plan" : "Business plan"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {accountType === "individual"
                        ? "One user, unlimited certificates"
                        : "Per engineer seat, unlimited certificates. Office staff and admins free."}
                    </p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">
                    £{monthlyTotal.toFixed(2)}
                    <span className="text-muted-foreground text-xs font-normal">/mo + VAT</span>
                  </p>
                </div>
                {accountType === "business" && (
                  <div className="mt-3 flex items-center gap-3">
                    <Label htmlFor="seats" className="text-xs">
                      Engineer seats
                    </Label>
                    <Input
                      id="seats"
                      type="number"
                      min={1}
                      max={200}
                      value={seats}
                      onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20"
                    />
                    <span className="text-muted-foreground text-xs">£12 per seat per month</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="card">Card number</Label>
                  <Input id="card" placeholder="4242 4242 4242 4242" inputMode="numeric" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="expiry">Expiry</Label>
                    <Input id="expiry" placeholder="12/28" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" placeholder="123" inputMode="numeric" />
                  </div>
                </div>
                <Alert>
                  <ShieldCheck className="size-4" />
                  <AlertDescription>
                    Test mode: any card details work and nothing is charged. Stripe goes live at launch.
                  </AlertDescription>
                </Alert>
              </div>

              <Button onClick={submitBilling} disabled={pending}>
                <Lock className="size-4" />
                {pending ? "Activating" : `Subscribe for £${monthlyTotal.toFixed(2)}/mo`}
              </Button>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
