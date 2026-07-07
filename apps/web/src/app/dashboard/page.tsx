import { createAuthClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard — FieldCert" };

export default async function DashboardPage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>
      <p className="text-muted-foreground">
        Signed in as {user?.email}. The certificate list and EICR builder land here next.
      </p>
    </main>
  );
}
