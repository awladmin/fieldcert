import { cn } from "@/lib/utils";

/**
 * FieldCert logo: a certificate tile with a bold tick and a live-wire notch.
 * One SVG, drawn in currentColor accents so it sits on any surface.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-8", className)} aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="11" fill="#157A55" />
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#fc-sheen)" />
      <path
        d="M27.5 8.5 19 26h6.5L21 39.5 33.5 20h-7l5-11.5z"
        fill="#F5B841"
        stroke="#F5B841"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.25"
        transform="translate(6 0)"
      />
      <path
        d="M14 24.5l7 7L34 17"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="fc-sheen" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
      </defs>
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
