import Link from "next/link";
import { Logo } from "@/components/logo";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-6">
          <Link href="/" aria-label="FieldCert home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">Contact us</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Questions, feedback, or a platform integration to discuss: send it over and a human
          replies, usually the same working day. Or email{" "}
          <a className="text-primary underline underline-offset-4" href="mailto:hello@fieldcert.co.uk">
            hello@fieldcert.co.uk
          </a>{" "}
          directly.
        </p>
        <div className="mt-8 max-w-xl">
          <ContactForm />
        </div>
      </main>
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5 text-xs">
          <span>© 2026 FieldCert. All rights reserved.</span>
          <span className="flex gap-4">
            <Link className="hover:text-foreground" href="/terms">Terms</Link>
            <Link className="hover:text-foreground" href="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
