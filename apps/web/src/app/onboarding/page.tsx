import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata = { title: "Set up your organisation — FieldCert" };

export default async function OnboardingPage() {
  await requireUser();
  return <OnboardingForm />;
}
