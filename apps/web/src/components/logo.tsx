import { cn } from "@/lib/utils";

/**
 * FieldCert logo: a validation tick whose downstroke is a lightning bolt,
 * on a green tile. One SVG, fixed brand colours so it reads on any surface.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} role="img" aria-label="FieldCert">
      <rect width="64" height="64" rx="14" fill="#157a49" />
      <path
        d="M24 47 L50 19"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M35 8 L19 34 L28 34 L24 49 L41 25 L31 25 Z" fill="#f5a524" />
    </svg>
  );
}

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-8" />
      <span className={cn("text-xl font-bold tracking-tight", dark ? "text-white" : "text-foreground")}>
        Field<span className="text-[#157A55] dark:text-[#4CC38A]">Cert</span>
      </span>
    </span>
  );
}
