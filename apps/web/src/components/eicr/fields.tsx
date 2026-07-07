"use client";

import type { ValidationIssue } from "@fieldcert/rules-engine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FieldIssues({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {issues.map((issue) => (
        <p
          key={`${issue.rule}-${issue.field}-${issue.message}`}
          className={cn(
            "text-xs",
            issue.severity === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-400"
          )}
        >
          {issue.message}
        </p>
      ))}
    </div>
  );
}

interface BaseProps {
  label: string;
  issues?: ValidationIssue[];
  className?: string;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  issues = [],
  className,
}: BaseProps & {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  type?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        aria-invalid={issues.some((i) => i.severity === "error") || undefined}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      />
      <FieldIssues issues={issues} />
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step,
  issues = [],
  className,
}: BaseProps & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        value={value ?? ""}
        aria-invalid={issues.some((i) => i.severity === "error") || undefined}
        onChange={(e) => {
          const parsed = e.target.value === "" ? undefined : Number(e.target.value);
          onChange(parsed !== undefined && Number.isNaN(parsed) ? undefined : parsed);
        }}
      />
      <FieldIssues issues={issues} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  issues = [],
  className,
}: BaseProps & {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? ""} onValueChange={(v) => onChange(v || undefined)}>
        <SelectTrigger aria-invalid={issues.some((i) => i.severity === "error") || undefined}>
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldIssues issues={issues} />
    </div>
  );
}
