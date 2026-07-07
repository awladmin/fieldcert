"use client";

import type { ValidationResult } from "@fieldcert/rules-engine";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ValidationPanel({ result }: { result: ValidationResult }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Validation</CardTitle>
        {result.issuable ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" /> Ready to issue
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
            <XCircle className="size-3.5" /> {result.errorCount} error{result.errorCount === 1 ? "" : "s"}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {result.issues.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            All statutory checks pass. This certificate can be issued.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {result.issues.map((issue) => (
              <li key={`${issue.rule}-${issue.field}-${issue.message}`} className="flex items-start gap-2 text-sm">
                {issue.severity === "error" ? (
                  <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                )}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
