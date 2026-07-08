import { cn } from "@/lib/utils";

/**
 * The certificate type tile. Deliberately not brand green: green is the
 * action/success colour, type tiles are wayfinding. EICR blue, future kinds
 * get their own hues, uploaded records stay muted.
 */
const KIND_STYLES: Record<string, string> = {
  EICR: "bg-blue-600 text-white dark:bg-blue-500",
  EIC: "bg-violet-600 text-white dark:bg-violet-500",
  MEIWC: "bg-teal-600 text-white dark:bg-teal-500",
  UPLOADED: "bg-muted text-muted-foreground",
};

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
        KIND_STYLES[kind] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {kind === "UPLOADED" ? "PDF" : kind}
    </span>
  );
}
