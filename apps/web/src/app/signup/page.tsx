import { redirect } from "next/navigation";

// OTP sign-in doubles as signup: one flow for both.
export default function SignupPage() {
  redirect("/login");
}
