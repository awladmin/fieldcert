"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export interface OrgFormState {
  error?: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createOrg(_prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter your company or trading name" };

  const { supabase } = await requireUser();
  const base = slugify(name) || "org";

  // Retry with a numeric suffix if the slug is taken.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.floor(Math.random() * 10000)}`;
    const { error } = await supabase.rpc("create_org", { org_name: name, org_slug: slug });
    if (!error) redirect("/dashboard");
    if (!error.message.includes("duplicate key")) return { error: error.message };
  }
  return { error: "Could not create the organisation — try a different name" };
}
