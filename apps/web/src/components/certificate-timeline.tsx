import {
  Ban,
  CheckCircle2,
  FileInput,
  FilePlus2,
  Link2,
  Send,
  Undo2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineEvent {
  id: string;
  event: string;
  actorName: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

const EVENT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  created: { label: "Created", icon: FilePlus2, tone: "text-sky-600 dark:text-sky-400" },
  imported: { label: "Imported", icon: FileInput, tone: "text-sky-600 dark:text-sky-400" },
  submitted: { label: "Submitted for approval", icon: Send, tone: "text-amber-600 dark:text-amber-400" },
  returned: { label: "Returned to draft", icon: Undo2, tone: "text-amber-600 dark:text-amber-400" },
  issued: { label: "Issued", icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400" },
  voided: { label: "Voided", icon: Ban, tone: "text-red-600 dark:text-red-400" },
  share_link_created: { label: "Share link created", icon: Link2, tone: "text-muted-foreground" },
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detailLine(event: string, detail: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (detail.via === "api") parts.push("via the API");
  if (typeof detail.fileName === "string") parts.push(detail.fileName);
  if (typeof detail.reissuedFrom === "string") parts.push(`corrected reissue of ${detail.reissuedFrom}`);
  if (typeof detail.reason === "string") parts.push(`"${detail.reason}"`);
  if (event === "share_link_created") parts.push("valid 30 days");
  return parts.length ? parts.join(" · ") : null;
}

/** The certificate's whole life, append-only, oldest first. */
export function CertificateTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Audit trail</CardTitle>
        <CardDescription>
          Every action on this certificate, recorded permanently. Entries cannot be edited or
          removed, by anyone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {events.map((e, i) => {
            const meta = EVENT_META[e.event] ?? {
              label: e.event,
              icon: FilePlus2,
              tone: "text-muted-foreground",
            };
            const Icon = meta.icon;
            const extra = detailLine(e.event, e.detail);
            return (
              <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                {i < events.length - 1 && (
                  <span className="bg-border absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px" aria-hidden="true" />
                )}
                <span className={`bg-background flex size-8 shrink-0 items-center justify-center rounded-full border ${meta.tone}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-semibold">
                    {meta.label}
                    <span className="text-muted-foreground font-normal"> · {e.actorName}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">{formatWhen(e.createdAt)}</p>
                  {extra && <p className="mt-0.5 text-sm">{extra}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
