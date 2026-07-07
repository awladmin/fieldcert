import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  issued: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  void: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  approved: "Approved",
  issued: "Issued",
  void: "Void",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={STYLES[status] ?? ""}>{LABELS[status] ?? status}</Badge>;
}
