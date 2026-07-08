import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard />
    </Suspense>
  );
}
