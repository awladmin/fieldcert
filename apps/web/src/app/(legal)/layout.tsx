import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
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
        <article className="prose-headings:font-semibold prose-headings:mt-8 prose-headings:mb-3 prose-p:mb-4 prose-p:leading-relaxed text-[15px] [&_h1]:text-3xl [&_h2]:text-xl [&_li]:mb-1.5 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </article>
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
