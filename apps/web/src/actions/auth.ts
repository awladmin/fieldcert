"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password" };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const next = String(formData.get("next") ?? "") || "/dashboard";
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) return { error: "Enter your name" };
  if (!email || !password) return { error: "Enter your email and a password" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // Create the profile row (RLS allows inserting your own).
  if (data.user) {
    await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName });
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
