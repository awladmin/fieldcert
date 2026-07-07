"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  XCircle,
} from "lucide-react";
import type { ValidationResult } from "@fieldcert/rules-engine";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { groupIssues } from "./validate-groups";

/**
 * The pre-flight view: every issue the statutory engine would raise at issue
 * time, grouped by editor part, with jump-to-section. Unlike Tradecert's
 * equivalent there is deliberately no way to dismiss anything from here.
 */
export function ValidatePanel({
  validation,
  onJump,
}: {
  validation: ValidationResult;
  onJump: (anchor: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = groupIssues(validation.issues);
  const total = validation.issues.length;

  function jump(anchor: string) {
    setOpen(false);
    onJump(anchor);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <ClipboardCheck className="size-4" />
        Validate
        {total > 0 && (
          <span
            className={cn(
              "ml-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              validation.errorCount > 0
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            {total}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Validate
            {total === 0 ? (
              <span className="text-primary flex items-center gap-1 text-sm font-medium">
                <CheckCircle2 className="size-4" /> Ready to issue
              </span>
            ) : (
              <span className="text-muted-foreground text-sm font-medium tabular-nums">
                {validation.errorCount} error{validation.errorCount === 1 ? "" : "s"},{" "}
                {validation.warningCount} warning{validation.warningCount === 1 ? "" : "s"}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Everything the statutory engine checks before this certificate can be issued. Statutory
            checks cannot be dismissed.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {groups.map((group) => (
            <div key={group.key} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                onClick={() => jump(group.anchor)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {group.issues.length === 0 ? (
                    <CheckCircle2 className="text-primary size-4" />
                  ) : group.issues.some((i) => i.severity === "error") ? (
                    <XCircle className="text-destructive size-4" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500" />
                  )}
                  {group.title}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
                  {group.issues.length > 0 && `(${group.issues.length})`}
                  <ChevronRight className="size-4" />
                </span>
              </button>
              {group.issues.length > 0 && (
                <div className="flex flex-col divide-y border-t">
                  {group.issues.map((issue, i) => (
                    <button
                      key={`${issue.rule}-${issue.field}-${i}`}
                      type="button"
                      onClick={() => jump(group.anchor)}
                      className="hover:bg-muted/50 flex items-start gap-2 px-3 py-2 text-left"
                    >
                      {issue.severity === "error" ? (
                        <XCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      )}
                      <span className="text-sm">{issue.message}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
