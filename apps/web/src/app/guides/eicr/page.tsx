import Link from "next/link";
import { Logo } from "@/components/logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "What is an EICR report and why do you need one?",
  description:
    "A plain-English guide to Electrical Installation Condition Reports: what an EICR checks, the legal requirements for landlords, how often you need one, and what the C1, C2, C3 and FI codes mean.",
  alternates: { canonical: "https://fieldcert.co.uk/guides/eicr" },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is an EICR report?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An Electrical Installation Condition Report (EICR) is a formal inspection of a building's fixed electrical installation, carried out by a qualified person against BS 7671, the UK wiring regulations. It records the condition of the wiring, consumer unit and circuits, classifies any defects found, and states whether the installation is satisfactory for continued use.",
      },
    },
    {
      "@type": "Question",
      name: "How often do I need an EICR?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rented homes in England must have an EICR at least every 5 years, or more often if the report recommends it. For owner-occupied homes the guideline is every 10 years, and for commercial premises typically every 5 years.",
      },
    },
    {
      "@type": "Question",
      name: "What do the codes C1, C2, C3 and FI mean on an EICR?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "C1 means danger present and immediate action is required. C2 means potentially dangerous and urgent remedial action is required. C3 means improvement is recommended but not required. FI means further investigation is required without delay. Any C1, C2 or FI makes the overall assessment unsatisfactory.",
      },
    },
    {
      "@type": "Question",
      name: "My EICR is unsatisfactory. What do I do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For rented property in England the landlord must complete the remedial work within 28 days, or sooner if the report says so, and obtain written confirmation from an electrician that the work is done. Keep the unsatisfactory report and the confirmation together as evidence of compliance.",
      },
    },
  ],
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-2xl font-bold tracking-tight">{children}</h2>;
}

export default function EicrGuidePage() {
  const launched = process.env.NEXT_PUBLIC_LAUNCHED === "true";

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <header className="bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="FieldCert home">
            <Logo />
          </Link>
          {launched ? (
            <Button render={<Link href="/signup" />}>Try it free</Button>
          ) : (
            <Button render={<Link href="/#notify" />}>Get early access</Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <p className="text-primary text-sm font-bold tracking-wide uppercase">Guides</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-balance">
          What is an EICR report and why do you need one?
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          A plain-English guide to Electrical Installation Condition Reports: what gets inspected,
          what the law requires, what the codes mean, and what to do when a report comes back
          unsatisfactory.
        </p>

        <H2>What an EICR actually is</H2>
        <p className="mb-4">
          An Electrical Installation Condition Report is a formal health check of a building&apos;s
          fixed electrical installation: the consumer unit, the wiring in the walls, the circuits,
          sockets and switches. A qualified inspector tests and inspects the installation against
          BS 7671, the IET Wiring Regulations, then issues a report recording what was found. The
          report ends in one of two verdicts: <strong>satisfactory</strong> or{" "}
          <strong>unsatisfactory</strong>. It covers the installation itself, not portable
          appliances, which are covered by PAT testing.
        </p>
        <p className="mb-4">
          A valid EICR is more than a front page. It must include the schedule of inspections
          (roughly ninety checklist items covering everything from the intake equipment to bathroom
          zones) and the schedule of circuit details and test results, with measured readings for
          every circuit. A certificate without its schedules attached is not valid.
        </p>

        <H2>What hazards does an EICR identify?</H2>
        <p className="mb-4">
          The inspection is designed to catch the faults that cause fires and electric shocks
          before they do: deteriorated or damaged wiring, overloaded circuits, missing earthing and
          bonding, inadequate RCD protection, faulty or outdated consumer units, signs of
          overheating or arcing at connections, and DIY alterations that were never done properly.
          Each finding is recorded as an observation with a classification code and a regulation
          reference.
        </p>

        <H2>The codes: C1, C2, C3 and FI</H2>
        <ul className="mb-4 flex list-disc flex-col gap-2 pl-6">
          <li>
            <strong>C1, danger present.</strong> Risk of injury. Immediate remedial action is
            required; the inspector will usually make it safe on the spot.
          </li>
          <li>
            <strong>C2, potentially dangerous.</strong> Urgent remedial action is required.
          </li>
          <li>
            <strong>C3, improvement recommended.</strong> Not dangerous, but worth doing. C3 is the
            only code that does not fail the report.
          </li>
          <li>
            <strong>FI, further investigation required</strong> without delay.
          </li>
        </ul>
        <p className="mb-4">
          Any C1, C2 or FI makes the overall assessment unsatisfactory. That rule is written into
          the report itself, and it is exactly the kind of consistency check that software should
          enforce rather than leave to memory.
        </p>

        <H2>The legal requirements for landlords</H2>
        <p className="mb-4">
          Since the Electrical Safety Standards in the Private Rented Sector (England) Regulations
          2020, landlords in England must have a valid EICR for every tenancy, renewed at least
          every 5 years. The duties are specific: give the report to existing tenants within 28
          days of the inspection, give it to new tenants before they move in, supply it to the
          local authority within 7 days if they ask, and keep it to hand to the next inspector.
          Councils can fine landlords up to £30,000 per breach.
        </p>
        <p className="mb-4">
          Business premises carry their own duties under the Electricity at Work Regulations 1989,
          where a current EICR is the accepted way to demonstrate the fixed installation is
          maintained safely. Insurers increasingly ask for one too.
        </p>

        <H2>How often is an EICR needed?</H2>
        <ul className="mb-4 flex list-disc flex-col gap-2 pl-6">
          <li>Rented homes in England: at least every 5 years, or as the report recommends.</li>
          <li>Owner-occupied homes: every 10 years is the general guidance, or on change of occupancy.</li>
          <li>Commercial premises: typically every 5 years.</li>
          <li>On buying or selling a property: strongly recommended, whatever the age of the last report.</li>
        </ul>

        <H2>Do I need an EICR for a new installation?</H2>
        <p className="mb-4">
          No. New electrical work is certified differently: a full new installation or rewire gets
          an Electrical Installation Certificate (EIC), and small additions like a new socket get a
          Minor Electrical Installation Works Certificate. The EICR is for assessing an{" "}
          <em>existing</em> installation&apos;s condition. The first EICR typically follows years
          later, at the intervals above.
        </p>

        <H2>My EICR is unsatisfactory. What now?</H2>
        <p className="mb-4">
          An unsatisfactory report is not a disaster; it is a work list. For rented property in
          England the remedial work for C1 and C2 items must be completed within 28 days, or sooner
          if the report says so, and the landlord must then obtain written confirmation from an
          electrician that the work is done, passing that to the tenant and, if they requested the
          report, the local authority. Keep the unsatisfactory report; together with the
          confirmation of remedial work it is the evidence of compliance.
        </p>

        <div className="bg-muted/50 mt-12 rounded-2xl border p-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {launched
              ? "Issue EICRs that cannot go out wrong"
              : "FieldCert launches September 2026"}
          </h2>
          <p className="text-muted-foreground mt-2 mb-5">
            FieldCert is certificate software with the BS 7671 rules built in: every value is
            validated as the engineer types, the schedules cannot be left incomplete, and a
            certificate with errors cannot be issued. Photograph the board and the circuit schedule
            fills itself.
          </p>
          {launched ? (
            <Button size="lg" render={<Link href="/signup" />}>
              Start your 30-day free trial
            </Button>
          ) : (
            <NewsletterForm />
          )}
        </div>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm">
          <span>© 2026 FieldCert. All rights reserved.</span>
          <span className="flex gap-5">
            <Link className="hover:text-foreground" href="/">Home</Link>
            <Link className="hover:text-foreground" href="/contact">Contact</Link>
            <Link className="hover:text-foreground" href="/terms">Terms</Link>
            <Link className="hover:text-foreground" href="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
