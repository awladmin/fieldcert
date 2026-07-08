import { notFound } from "next/navigation";
import { Ban, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Verify a certificate",
  description: "Check that a FieldCert certificate is genuine and unaltered.",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Public verification: anyone holding a FieldCert PDF can confirm it is
 * genuine, when it was issued and by whom, and that it has not been voided.
 * No test data or personal details are exposed.
 */
export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const supabase = createServiceClient();
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, kind, status, reference, issued_at, pdf_sha256, orgs(name)")
    .eq("id", id)
    .maybeSingle();

  const found = cert && (cert.status === "issued" || cert.status === "void");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-6">
          <Link href="/" aria-label="FieldCert home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <p className="text-primary flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
          <ShieldCheck className="size-4" /> Certificate verification
        </p>
        {!found ? (
          <>
            <h1 className="mt-3 text-3xl font-bold">No certificate found</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Nothing matches this verification link. If you were given this link on a certificate,
              the document may not be genuine. Check the address was copied completely, or contact
              the contractor who issued it.
            </p>
          </>
        ) : cert.status === "void" ? (
          <>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-red-500/10 p-6 text-red-700 dark:text-red-300">
              <Ban className="size-8 shrink-0" />
              <div>
                <h1 className="text-2xl font-bold">This certificate has been voided</h1>
                <p className="text-sm">
                  {cert.reference} was issued by {cert.orgs?.name} and later voided. It should not
                  be relied upon. A corrected certificate may exist; ask the contractor.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-6 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-8 shrink-0" />
              <div>
                <h1 className="text-2xl font-bold">Genuine certificate</h1>
                <p className="text-sm">
                  This certificate was issued through FieldCert and has not been altered since. Issued
                  certificates cannot be modified by anyone, including us.
                </p>
              </div>
            </div>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <dt className="text-muted-foreground text-xs font-semibold uppercase">Certificate number</dt>
                <dd className="mt-1 font-mono font-semibold">{cert.reference}</dd>
              </div>
              <div className="rounded-xl border p-4">
                <dt className="text-muted-foreground text-xs font-semibold uppercase">Type</dt>
                <dd className="mt-1 font-semibold">
                  {cert.kind === "EICR" ? "Electrical Installation Condition Report" : cert.kind}
                </dd>
              </div>
              <div className="rounded-xl border p-4">
                <dt className="text-muted-foreground text-xs font-semibold uppercase">Issued by</dt>
                <dd className="mt-1 font-semibold">{cert.orgs?.name}</dd>
              </div>
              <div className="rounded-xl border p-4">
                <dt className="text-muted-foreground text-xs font-semibold uppercase">Issued on</dt>
                <dd className="mt-1 font-semibold">{formatDate(cert.issued_at)}</dd>
              </div>
              {cert.pdf_sha256 && (
                <div className="rounded-xl border p-4 sm:col-span-2">
                  <dt className="text-muted-foreground text-xs font-semibold uppercase">
                    Document fingerprint (SHA-256)
                  </dt>
                  <dd className="mt-1 font-mono text-xs break-all">{cert.pdf_sha256}</dd>
                  <p className="text-muted-foreground mt-2 text-xs">
                    The fingerprint of the PDF exactly as issued. A technically minded reader can
                    hash their copy and compare; any difference means the document was changed
                    after issue.
                  </p>
                </div>
              )}
            </dl>
          </>
        )}
      </main>
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-3xl px-6 py-8 text-sm">
          FieldCert verifies its own certificates only. © 2026 FieldCert.
        </div>
      </footer>
    </div>
  );
}
