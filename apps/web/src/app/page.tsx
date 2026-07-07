import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Plug,
  ScanLine,
  ShieldCheck,
  Star,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { createAuthClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { AppStoreBadge, GooglePlayBadge } from "@/components/store-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "FieldCert | Electrical certificates that cannot go out wrong",
  description:
    "EICR software with a built-in BS 7671 validation engine and an API for field service platforms. Errors are caught as you type, and a certificate with outstanding errors cannot be issued.",
};

const API_EXAMPLE = `POST /api/v1/certificates
{
  "kind": "EICR",
  "issue": true,
  "data": { ...job data from your platform... }
}

422 Unprocessable Entity
{
  "error": { "message": "Cannot issue: 2 validation errors outstanding" },
  "issues": [
    {
      "field": "boards[0].testResults[0].zsOhms",
      "severity": "error",
      "message": "Zs 1.5 exceeds the maximum 1.37 for a B32 device (BS 7671 Table 41.3)"
    }
  ]
}`;

export default async function HomePage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="FieldCert home">
            <Logo />
          </Link>
          <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
            <Link className="hover:text-foreground" href="#scanner">Board scanner</Link>
            <Link className="hover:text-foreground" href="#features">Features</Link>
            <Link className="hover:text-foreground" href="#api">API</Link>
            <Link className="hover:text-foreground" href="#reviews">Reviews</Link>
            <Link className="hover:text-foreground" href="#pricing">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" render={<Link href="/login" />}>Log in</Button>
                <Button render={<Link href="/signup" />}>Start free</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <Badge variant="outline" className="border-primary/40 text-primary mb-5 font-semibold">
                Built on the BS 7671 18th Edition rules
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
                Electrical certificates that cannot go out wrong
              </h1>
              <p className="text-muted-foreground mt-5 max-w-xl text-lg">
                Paperwork is the worst part of the job, and a rejected certificate is the worst
                part of the paperwork. FieldCert reads the board straight off a photo, then checks
                every EICR against BS 7671 as you type: wrong Zs, slow RCD, C1 on a satisfactory
                report, all caught on site, not in an audit.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" className="h-12 px-7 text-base" render={<Link href="/signup" />}>
                  Start free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 text-base"
                  render={<a href="/sample-eicr.pdf" target="_blank" />}
                >
                  See a sample certificate
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                No password needed. You sign in with a one-time email code.
              </p>
              <p className="mt-6 text-sm font-medium">
                Building job management or field service software?{" "}
                <Link className="text-primary underline underline-offset-4" href="#api">
                  FieldCert is API-first: embed validated certificates in your platform
                </Link>
              </p>
            </div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10">
                <Image
                  src="/images/pexels-257736.jpg"
                  alt="Electrician working on a consumer unit"
                  width={800}
                  height={533}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-card absolute -bottom-6 -left-4 flex flex-col gap-2 rounded-xl border p-4 shadow-xl sm:-left-8">
                <span className="text-destructive flex items-center gap-2 text-sm font-semibold">
                  <XCircle className="size-4" />
                  Zs 1.52 exceeds the 1.37 maximum for a B32
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                  <AlertTriangle className="size-4" />
                  RCD trip time missing on circuit 4
                </span>
                <span className="text-primary flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4" />
                  Fixed. Ready to issue
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 text-center sm:grid-cols-3">
            <div>
              <p className="text-primary text-3xl font-extrabold">8+</p>
              <p className="text-muted-foreground text-sm">statutory rule groups checked live</p>
            </div>
            <div>
              <p className="text-primary text-3xl font-extrabold">0</p>
              <p className="text-muted-foreground text-sm">certificates issued with outstanding errors</p>
            </div>
            <div>
              <p className="text-primary text-3xl font-extrabold">Unlimited</p>
              <p className="text-muted-foreground text-sm">certificates on Individual and Business plans</p>
            </div>
          </div>
        </section>

        {/* AI board scanner — headline feature */}
        <section id="scanner" className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10">
                <Image
                  src="/images/pexels-17842832.jpg"
                  alt="Engineer inspecting an electrical panel"
                  width={800}
                  height={533}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-card absolute -top-4 -right-3 flex items-center gap-2 rounded-xl border px-4 py-2.5 shadow-xl">
                <ScanLine className="text-primary size-5" />
                <span className="text-sm font-semibold">Board scanned: 12 circuits found</span>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge className="bg-primary text-primary-foreground mb-4 font-semibold">
                The big one
              </Badge>
              <h2 className="text-3xl font-bold text-balance">
                Photograph the board. The schedule types itself.
              </h2>
              <div className="mt-5 flex flex-col gap-5">
                <div>
                  <h3 className="text-lg font-semibold">AI board scanner</h3>
                  <p className="text-muted-foreground mt-1">
                    Point your phone at the consumer unit and hit Scan board. Circuits, breaker
                    types, ratings: read straight off the photo into the schedule. Twenty minutes
                    of typing per board, gone.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">AI observations</h3>
                  <p className="text-muted-foreground mt-1">
                    Snap the defect and get professional observation wording with a suggested
                    classification code, ready to edit or accept.
                  </p>
                </div>
                <p className="text-sm font-medium">
                  And the FieldCert difference: every AI suggestion passes through the validation
                  engine before it touches your certificate. Speed without the risk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold">Built to take the pain out of certificates</h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center">
            Less time on paperwork, and no certificate ever goes out wrong. Clear, chunky forms
            built for the job, a validation engine that has your back, and it connects to the
            software you already run your jobs on.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                title: "Validation that cannot be switched off",
                body: "Zs limits per device, RCD trip times, insulation resistance minimums, observation codes against the overall verdict. Checked as you type. A certificate with errors cannot be issued, by anyone.",
              },
              {
                icon: Zap,
                title: "Fast on site",
                body: "Big, clear fields you can hit with a thumb. Autosave on every keystroke. Problems show up right where you typed them, not in a report you read later.",
              },
              {
                icon: Users,
                title: "Built for teams",
                body: "Invite an engineer with just their email; they sign in with a one-time code and they are in. Optional QS approval so nothing reaches a client unreviewed. Office staff and admins free.",
              },
              {
                icon: Plug,
                title: "API-first: connects to your job software",
                body: "Job, customer and address data flows straight from your field service platform into the certificate. Nothing retyped. Retyping errors gone.",
              },
            ].map((f) => (
              <Card key={f.title} className="border-l-primary border-l-4">
                <CardHeader className="flex flex-row items-center gap-3">
                  <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <f.icon className="size-6" />
                  </span>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">{f.body}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* API section */}
        <section id="api" className="bg-[oklch(0.24_0.03_165)] text-white">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
            <div>
              <Badge className="mb-4 bg-white/10 text-white">For platforms and developers</Badge>
              <h2 className="text-3xl font-bold text-balance">
                Put validated certificates inside your own software
              </h2>
              <p className="mt-4 text-white/75">
                Field service platforms, landlord systems and job management tools integrate
                FieldCert with three endpoints. Send your job data, get back a validated, branded
                PDF certificate. If the data fails the statutory checks, you get every issue listed
                and nothing is issued.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                {[
                  "POST /api/v1/validate: run the rules engine over any certificate data",
                  "POST /api/v1/certificates: create and issue with a generated PDF",
                  "GET /api/v1/certificates/:id: status, validation and a fresh PDF link",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#4CC38A]" />
                    <code className="text-white/90">{line}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm font-semibold text-white/90">From 99p per issued certificate, with unlimited validation calls. <a className="underline underline-offset-4" href="mailto:hello@fieldcert.co.uk?subject=FieldCert%20Platform%20API">Talk to us</a></p>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-black/40 p-6 text-xs leading-relaxed text-emerald-100/90 ring-1 ring-white/10">
              {API_EXAMPLE}
            </pre>
          </div>
        </section>

        {/* Any device + mobile app */}
        <section className="from-primary/15 via-primary/5 border-y bg-gradient-to-br to-transparent">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="text-3xl font-bold">Works on any device. Today.</h2>
            <p className="text-muted-foreground max-w-xl">
              Phone, tablet, laptop, the Windows PC in the office: FieldCert runs in the browser
              with one login and everything in sync. Native iOS and Android apps are coming, with
              fully offline certificates for plant rooms and basements with no signal.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section id="reviews" className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold">What early users say</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote:
                  "It flagged a Zs I'd fat-fingered before I'd even left the board. That one catch paid for the year.",
                name: "Mark T.",
                role: "Sole trader, Buckinghamshire",
              },
              {
                quote:
                  "We turned on QS approval and our returns from the scheme assessor stopped. Simple as that.",
                name: "Sarah D.",
                role: "Director, electrical contractor, Kent",
              },
              {
                quote:
                  "Invited my apprentice by email and he was doing test results on his phone the same afternoon. No passwords, no setup.",
                name: "James O.",
                role: "NICEIC approved contractor",
              },
              {
                quote:
                  "Uploaded five years of old certificates in an evening. Everything is finally in one place.",
                name: "Priya K.",
                role: "Office manager, building services firm",
              },
              {
                quote:
                  "The certificates look proper. Clients notice, letting agents notice, and the share link saves me chasing paper.",
                name: "Dave W.",
                role: "Domestic electrician, Manchester",
              },
              {
                quote:
                  "We plugged our job system into the API and certificates now start half filled in. Retyping mistakes just went away.",
                name: "Tom H.",
                role: "Operations lead, field service company",
              },
            ].map((r) => (
              <Card key={r.name}>
                <CardContent className="flex h-full flex-col gap-4 pt-6">
                  <div className="flex gap-0.5 text-amber-500" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm">&quot;{r.quote}&quot;</p>
                  <div className="mt-auto">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-muted-foreground text-xs">{r.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
          <p className="text-muted-foreground mt-3 text-center">
            Unlimited certificates for electricians, per-certificate pricing for platforms. No contracts, cancel any time.
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Individual</CardTitle>
                <p className="text-4xl font-extrabold tabular-nums">
                  £14.99
                  <span className="text-muted-foreground text-sm font-normal">/month + VAT</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-sm">
                {[
                  "One user",
                  "Unlimited certificates",
                  "Full validation engine",
                  "Branded PDF certificates",
                  "30 day client share links",
                  "Upload your old certificates",
                ].map((line) => (
                  <span key={line} className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary size-4 shrink-0" /> {line}
                  </span>
                ))}
                <Button className="mt-4 h-11" variant="outline" render={<Link href="/signup" />}>
                  Start free
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary relative border-2 shadow-lg">
              <Badge className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 font-semibold">
                Recommended
              </Badge>
              <CardHeader>
                <CardTitle className="text-lg">Business</CardTitle>
                <p className="text-4xl font-extrabold tabular-nums">
                  £12
                  <span className="text-muted-foreground text-sm font-normal">/engineer/month + VAT</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-sm">
                {[
                  "Everything in Individual",
                  "Office staff and admins free",
                  "Team invites in seconds",
                  "QS approval workflow",
                  "Company-wide certificate register",
                  "API access to connect your own systems",
                ].map((line) => (
                  <span key={line} className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary size-4 shrink-0" /> {line}
                  </span>
                ))}
                <Button className="mt-4 h-11" render={<Link href="/signup" />}>
                  Start free
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform API</CardTitle>
                <p className="text-4xl font-extrabold tabular-nums">
                  99p
                  <span className="text-muted-foreground text-sm font-normal">/issued certificate + VAT</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-sm">
                {[
                  "Embed certificates in your own software",
                  "Unlimited validation calls",
                  "Certificates branded for your customers",
                  "PDF generation and share links built in",
                  "Volume discounts from 1,000 certificates",
                  "Integration support from our team",
                ].map((line) => (
                  <span key={line} className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary size-4 shrink-0" /> {line}
                  </span>
                ))}
                <Button
                  className="mt-4 h-11"
                  variant="outline"
                  render={<a href="mailto:hello@fieldcert.co.uk?subject=FieldCert%20Platform%20API" />}
                >
                  Talk to us
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="text-muted-foreground text-sm">
              Electrical certificates with a validation engine that has your back. Made for UK
              electricians. Gas certificates coming next.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Product</p>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li><Link className="hover:text-foreground" href="#features">Features</Link></li>
              <li><Link className="hover:text-foreground" href="#pricing">Pricing</Link></li>
              <li><Link className="hover:text-foreground" href="#api">API</Link></li>
              <li><a className="hover:text-foreground" href="/sample-eicr.pdf" target="_blank">Sample certificate</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Company</p>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li><a className="hover:text-foreground" href="mailto:hello@fieldcert.co.uk">Contact</a></li>
              <li><Link className="hover:text-foreground" href="/login">Log in</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Legal</p>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li><Link className="hover:text-foreground" href="/terms">Terms of service</Link></li>
              <li><Link className="hover:text-foreground" href="/privacy">Privacy policy</Link></li>
            </ul>
            <div className="mt-4 flex items-center gap-3">
              <a href="https://x.com/fieldcert" aria-label="FieldCert on X" className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="size-5 fill-current"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" /></svg>
              </a>
              <a href="https://www.linkedin.com/company/fieldcert" aria-label="FieldCert on LinkedIn" className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="size-5 fill-current"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" /></svg>
              </a>
              <a href="https://www.facebook.com/fieldcert" aria-label="FieldCert on Facebook" className="text-muted-foreground hover:text-foreground">
                <svg viewBox="0 0 24 24" className="size-5 fill-current"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.09 24 12.07z" /></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t">
          <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs">
            <span>© 2026 FieldCert. All rights reserved.</span>
            <span>
              Photos by{" "}
              <a className="underline hover:no-underline" href="https://www.pexels.com" target="_blank" rel="noreferrer">
                Pexels
              </a>{" "}
              photographers, used under the Pexels licence.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
