import Link from "next/link";
import {
  CheckCircle2,
  FileCheck2,
  Plug,
  ShieldCheck,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { createAuthClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "FieldCert | Electrical certificates that cannot go out wrong",
  description:
    "EICR software with a built-in BS 7671 validation engine. Errors are caught as you type, and a certificate with outstanding errors cannot be issued.",
};

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Validation that cannot be switched off",
    body: "Every certificate is checked against BS 7671 rules as you type: Zs limits, RCD times, insulation resistance, observation codes. A certificate with errors cannot be issued. By anyone.",
  },
  {
    icon: Zap,
    title: "Fast on site",
    body: "Live checks as you enter test results, autosave on every keystroke, and clear prompts for anything missing. Finish the certificate at the board, not back at the office.",
  },
  {
    icon: Users,
    title: "Built for teams",
    body: "Invite engineers in seconds with passwordless sign-in. Add QS approval so nothing goes to a client unreviewed. Office staff and admins are always free.",
  },
  {
    icon: Plug,
    title: "Connects to your job software",
    body: "FieldCert is API-first. Job, customer and address data flows straight from your field service platform, so nothing is retyped and retyping errors disappear.",
  },
];

export default async function HomePage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <FileCheck2 className="text-primary size-6" />
            <span className="text-lg font-semibold">FieldCert</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" render={<Link href="/login" />}>Log in</Button>
                <Button render={<Link href="/login" />}>Start free</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-6 py-20 text-center">
          <Badge variant="outline" className="mb-4">
            Built on the BS 7671 18th Edition rules
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl text-balance">
            Electrical certificates that cannot go out wrong
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            FieldCert checks every EICR against BS 7671 as you type. Wrong Zs for the breaker?
            Slow RCD? C1 on a satisfactory report? It gets caught on site, not in an audit.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/login" />}>Start free</Button>
            <Button size="lg" variant="outline" render={<Link href="#pricing" />}>See pricing</Button>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            No password needed. Sign in with a one-time email code.
          </p>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-16 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <f.icon className="text-primary size-6 shrink-0" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">{f.body}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <div className="bg-primary/5 border-primary/20 flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
            <Smartphone className="text-primary size-8" />
            <h2 className="text-xl font-semibold">iOS and Android app coming soon</h2>
            <p className="text-muted-foreground max-w-xl text-sm">
              Fully offline certificate completion for plant rooms and basements with no signal,
              with the same validation engine built in. Until then, FieldCert works in the browser
              on any phone, tablet or laptop.
            </p>
          </div>
        </section>

        <section id="pricing" className="border-t">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
            <p className="text-muted-foreground mt-2 text-center">
              Unlimited certificates on every plan. No per-certificate fees, no contracts.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Individual</CardTitle>
                  <p className="text-3xl font-bold tabular-nums">
                    £14.99<span className="text-muted-foreground text-sm font-normal">/month + VAT</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {["One user", "Unlimited certificates", "Full validation engine", "Branded PDF certificates", "30-day client share links"].map((line) => (
                    <span key={line} className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> {line}
                    </span>
                  ))}
                  <Button className="mt-4" render={<Link href="/login" />}>Start free</Button>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-lg">Business</CardTitle>
                  <p className="text-3xl font-bold tabular-nums">
                    £12<span className="text-muted-foreground text-sm font-normal">/engineer/month + VAT</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {["Everything in Individual", "Office staff and admins free", "Team invites in seconds", "QS approval workflow", "Company-wide certificate register"].map((line) => (
                    <span key={line} className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> {line}
                    </span>
                  ))}
                  <Button className="mt-4" render={<Link href="/login" />}>Start free</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-sm">
          <span className="flex items-center gap-2">
            <FileCheck2 className="size-4" /> FieldCert
          </span>
          <span>Made for UK electricians. Gas certificates coming next.</span>
        </div>
      </footer>
    </div>
  );
}
