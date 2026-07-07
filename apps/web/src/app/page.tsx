import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
