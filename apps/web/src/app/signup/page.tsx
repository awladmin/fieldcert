import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";

export const metadata = { title: "Create your account | FieldCert" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthCard mode="signup" />
    </Suspense>
  );
}
