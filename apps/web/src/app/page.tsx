import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Plug,
  ScanLine,
  ShieldCheck,
  Star,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { createAuthClient } from "@/lib/supabase/server";
import { Logo, LogoMark } from "@/components/logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { AppStoreBadge, GooglePlayBadge } from "@/components/store-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: { absolute: "FieldCert | Electrical certificates that cannot go out wrong" },
  description:
    "EICR software with a built-in BS 7671 validation engine and an API that pre-fills certificates from your job software. Errors are caught as you type, and a certificate with outstanding errors cannot be issued.",
  alternates: { canonical: "https://www.fieldcert.co.uk" },
};

const API_EXAMPLE = `POST /api/v1/certificates/prefill
{
  "kind": "EICR",
  "data": { ...property, client and job data from your system... }
}

201 Created
{
  "id": "cert_8f21...",
  "status": "draft",
  "editorUrl": "https://www.fieldcert.co.uk/certificates/cert_8f21...",
  "prefilled": ["client", "installationAddress", "reference"]
}`;

export default async function HomePage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Pre-launch mode until flipped: sign-up actions are replaced by the
  // launch list, and the September 2026 date is shown. Set
  // NEXT_PUBLIC_LAUNCHED=true to go live.
  const launched = process.env.NEXT_PUBLIC_LAUNCHED === "true";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FieldCert",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Electrical certificate software for UK electricians with a built-in BS 7671 validation engine, AI board scanner and job-software integration.",
    url: "https://www.fieldcert.co.uk",
    offers: {
      "@type": "Offer",
      price: "14.99",
      priceCurrency: "GBP",
      description: "Individual plan, per month plus VAT, with a 30-day free trial",
    },
    publisher: {
      "@type": "Organization",
      name: "FieldCert",
      url: "https://www.fieldcert.co.uk",
      email: "hello@fieldcert.co.uk",
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
            ) : launched ? (
              <>
                <Button variant="ghost" render={<Link href="/login" />}>Log in</Button>
                <Button render={<Link href="/signup" />}>Try it free</Button>
              </>
            ) : (
              <Button render={<a href="#notify" />}>Get early access</Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: the product is the certificate */}
        <section className="relative overflow-hidden">
          <div className="from-primary/10 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-24">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/40 text-primary font-semibold">
                  Built on the BS 7671 18th Edition rules
                </Badge>
                {!launched && (
                  <Badge className="bg-amber-500 font-semibold text-white">
                    Launching September 2026
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
                Electrical certificates.
                <br />
                <span className="text-primary">Filled by AI.</span> Checked by rules.
              </h1>
              <p className="text-muted-foreground mt-5 max-w-md text-lg">
                Photograph the board and the schedule fills itself. Every value is validated
                against BS 7671 as you type. A certificate with errors cannot be issued.
              </p>
              {launched ? (
                <>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button size="lg" className="h-12 px-7 text-base" render={<Link href="/signup" />}>
                      Start your 30-day free trial
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-4 text-sm font-medium">
                    No card needed. Full product, free for 30 days.
                  </p>
                </>
              ) : (
                <div className="mt-8">
                  <NewsletterForm />
                  <p className="text-muted-foreground mt-4 text-sm font-medium">
                    FieldCert launches September 2026. Join the list and be first in, with a 30-day
                    free trial waiting. No spam, just the launch.
                  </p>
                </div>
              )}
            </div>

            {/* Product mock: a live certificate being validated */}
            <div className="relative">
              <div className="bg-card rounded-2xl border shadow-2xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <LogoMark className="size-8" />
                    <div>
                      <p className="text-sm font-bold">Electrical Installation Condition Report</p>
                      <p className="text-muted-foreground text-xs">12 High Street, Amersham · FC-2481A</p>
                    </div>
                  </div>
                  <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-semibold">
                    Draft
                  </span>
                </div>
                <div className="flex flex-col px-5 py-4">
                  <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-x-6 pb-2 text-[11px] font-semibold tracking-wide uppercase">
                    <span>Circuit</span>
                    <span>Device</span>
                    <span>Zs</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-t py-2.5 text-sm">
                    <span>1 · Kitchen ring</span>
                    <span className="font-mono text-xs">B32</span>
                    <span className="text-primary flex items-center gap-1 font-mono text-xs">
                      0.61 <CheckCircle2 className="size-3.5" />
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-t py-2.5 text-sm">
                    <span>2 · Garage sockets</span>
                    <span className="font-mono text-xs">B32</span>
                    <span className="text-destructive flex items-center gap-1 font-mono text-xs">
                      1.52 <XCircle className="size-3.5" />
                    </span>
                  </div>
                  <p className="text-destructive pb-1 text-xs font-medium">
                    Zs 1.52 exceeds the 1.37 maximum for a B32 device (BS 7671 Table 41.3)
                  </p>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-t py-2.5 text-sm">
                    <span>3 · Lighting ground floor</span>
                    <span className="font-mono text-xs">B6</span>
                    <span className="text-primary flex items-center gap-1 font-mono text-xs">
                      1.94 <CheckCircle2 className="size-3.5" />
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t px-5 py-4">
                  <span className="text-destructive flex items-center gap-1.5 text-sm font-semibold">
                    <AlertTriangle className="size-4" /> 1 to fix before issue
                  </span>
                  <span className="bg-muted text-muted-foreground rounded-lg px-4 py-2 text-sm font-semibold">
                    Issue certificate
                  </span>
                </div>
              </div>
              <div className="bg-card absolute -top-5 -right-3 flex items-center gap-2 rounded-xl border px-3.5 py-2 shadow-xl sm:-right-6">
                <ScanLine className="text-primary size-4" />
                <span className="text-xs font-semibold">12 circuits read from one photo</span>
              </div>
              <div className="bg-card absolute -bottom-5 -left-3 flex items-center gap-2 rounded-xl border px-3.5 py-2 shadow-xl sm:-left-6">
                <ShieldCheck className="text-primary size-4" />
                <span className="text-xs font-semibold">Validation cannot be switched off</span>
              </div>
            </div>
          </div>
        </section>

        {/* What it does, in three moves */}
        <section className="border-y">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-12 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <ScanLine className="size-6" />
              </span>
              <div>
                <p className="font-bold">Snap the board</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  AI reads the photo and fills the circuit schedule in seconds.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <ShieldCheck className="size-6" />
              </span>
              <div>
                <p className="font-bold">Validated as you type</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Every value checked against BS 7671, on the spot. Wrong ones cannot be issued.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <FileCheck2 className="size-6" />
              </span>
              <div>
                <p className="font-bold">Issue and go</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Branded PDF, client share link, everything in your register. Done on site.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI board scanner — headline feature */}
        <section id="scanner" className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10">
                <Image
                  src="/images/board-scanner.jpg"
                  alt="Photographing a consumer unit with the FieldCert board scanner"
                  width={1536}
                  height={1024}
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
              <Badge className="mb-4 bg-white/10 text-white">Business plan integration</Badge>
              <h2 className="text-3xl font-bold text-balance">
                Certificates that start half filled in from your job software
              </h2>
              <p className="mt-4 text-white/75">
                Connect your field service, job management or landlord system. When a job is booked,
                FieldCert pre-fills the certificate with the property, client and job details, so
                your engineer opens it already populated, runs the tests, and issues. Every field
                still passes through the validation engine, and the finished certificate pushes back
                to your system automatically.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                {[
                  "POST /api/v1/certificates/prefill: start a certificate from your job data",
                  "POST /api/v1/validate: run the BS 7671 rules engine over any data",
                  "GET /api/v1/certificates/:id: pull the issued certificate and PDF back",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#4CC38A]" />
                    <code className="text-white/90">{line}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm font-semibold text-white/90">Included with the Business plan. <a className="underline underline-offset-4" href="mailto:hello@fieldcert.co.uk?subject=FieldCert%20integration">Talk to us about connecting your system</a></p>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-black/40 p-6 text-xs leading-relaxed text-emerald-100/90 ring-1 ring-white/10">
              {API_EXAMPLE}
            </pre>
          </div>
        </section>

        {/* Any device + mobile app */}
        <section className="from-primary/15 via-primary/5 border-y bg-gradient-to-br to-transparent">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10">
              <Image
                src="/images/any-device.jpg"
                alt="FieldCert running on a phone and tablet in a work van"
                width={1536}
                height={1024}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col items-start gap-5">
              <h2 className="text-3xl font-bold">Works on any device. Today.</h2>
              <p className="text-muted-foreground">
                Phone, tablet, laptop, the Windows PC in the office: FieldCert runs in the browser
                with one login and everything in sync. Native iOS and Android apps are coming, with
                fully offline certificates for plant rooms and basements with no signal.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <AppStoreBadge />
                <GooglePlayBadge />
              </div>
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
            {launched
              ? "Every plan starts with a 30-day free trial, no card needed. No contracts, cancel any time."
              : "From September 2026. Every plan starts with a 30-day free trial, no card needed. No contracts, cancel any time."}
          </p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
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
                  "One signing engineer",
                  "Unlimited certificates",
                  "Full BS 7671 validation engine",
                  "AI board scanner and photo tools",
                  "Branded PDF certificates",
                  "Public verification and 30-day share links",
                  "Import your existing certificates",
                ].map((line) => (
                  <span key={line} className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary size-4 shrink-0" /> {line}
                  </span>
                ))}
                {launched ? (
                  <Button className="mt-4 h-11" variant="outline" render={<Link href="/signup" />}>
                    Start your free trial
                  </Button>
                ) : (
                  <Button className="mt-4 h-11" variant="outline" render={<a href="#notify" />}>
                    Join the waiting list
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card className="border-primary border-2 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Business</CardTitle>
                  <Badge className="bg-primary text-primary-foreground font-semibold">
                    Recommended
                  </Badge>
                </div>
                <p className="text-4xl font-extrabold tabular-nums">
                  £12
                  <span className="text-muted-foreground text-sm font-normal">/engineer/month + VAT</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-sm">
                {[
                  "Everything in Individual",
                  "Office staff and admins free",
                  "Team invites, roles and QS approval",
                  "Per-engineer signatures and scheme numbers",
                  "Company-wide certificate register",
                  "API to pre-fill certificates from your job software",
                ].map((line) => (
                  <span key={line} className="flex items-center gap-2">
                    <CheckCircle2 className="text-primary size-4 shrink-0" /> {line}
                  </span>
                ))}
                {launched ? (
                  <Button className="mt-4 h-11" render={<Link href="/signup" />}>
                    Start your free trial
                  </Button>
                ) : (
                  <Button className="mt-4 h-11" render={<a href="#notify" />}>
                    Join the waiting list
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-center text-sm">
            Run your own job or field service software? The Business plan includes an API that
            pre-fills certificates from your system.{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="#api"
            >
              See how the integration works
            </a>
            .
          </p>
        </section>

        {/* Pre-launch: the launch list, the one place every early-access action lands */}
        {!launched && (
          <section id="notify" className="scroll-mt-16 border-t">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-20 text-center">
              <Badge className="bg-amber-500 font-semibold text-white">Launching September 2026</Badge>
              <h2 className="mt-5 text-3xl font-bold text-balance">Be first in when FieldCert launches</h2>
              <p className="text-muted-foreground mt-3 max-w-xl">
                Leave your email and we will send you one message on launch day, with your 30-day
                free trial ready to go. No spam, no chasing.
              </p>
              <NewsletterForm className="mt-8 items-center" />
            </div>
          </section>
        )}
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
              <li><Link className="hover:text-foreground" href="/guides/eicr">What is an EICR?</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Company</p>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li><Link className="hover:text-foreground" href="/contact">Contact</Link></li>
              {launched && (
                <li><Link className="hover:text-foreground" href="/login">Log in</Link></li>
              )}
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
            <span>Made for UK electricians.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
