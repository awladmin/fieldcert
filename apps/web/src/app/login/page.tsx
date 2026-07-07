import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";

export const metadata = { title: "Sign in | FieldCert" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard />
    </Suspense>
  );
}
