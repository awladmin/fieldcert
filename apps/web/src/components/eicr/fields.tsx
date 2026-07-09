"use client";

import { CheckCircle2 } from "lucide-react";
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

/** Green tick beside a label the moment a field holds a valid value. */
function FieldTick({ show }: { show: boolean }) {
  if (!show) return null;
  return <CheckCircle2 className="text-primary inline size-3.5" aria-label="Complete" />;
}

function isClean(issues: ValidationIssue[]) {
  return !issues.some((i) => i.severity === "error");
}

export function FieldIssues({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {issues.map((issue) => (
        <p
          key={`${issue.rule}-${issue.field}-${issue.message}`}
          className={cn(
            "text-sm font-medium",
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

const chunkyInput = "h-12 text-base";

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  issues = [],
  className,
}: BaseProps & {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        {label} <FieldTick show={Boolean(value) && isClean(issues)} />
      </Label>
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        className={chunkyInput}
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
  unit,
  issues = [],
  className,
}: BaseProps & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: string;
  unit?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <span>
          {label}
          {unit ? <span className="text-muted-foreground font-normal"> ({unit})</span> : null}
        </span>
        <FieldTick show={value !== undefined && isClean(issues)} />
      </Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        value={value ?? ""}
        className={chunkyInput}
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

/**
 * Segmented single-choice chips: the fastest way to record an outcome with a
 * thumb on site. Clicking the active chip clears it.
 */
export function ChipGroup({
  label,
  value,
  onChange,
  options,
  issues = [],
  className,
  size = "md",
}: BaseProps & {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string; tone?: "danger" | "warn" | "ok" }>;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? undefined : opt.value)}
              className={cn(
                "rounded-md border font-semibold transition-colors",
                size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
                active
                  ? opt.tone === "danger"
                    ? "border-destructive bg-destructive text-white"
                    : opt.tone === "warn"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <FieldIssues issues={issues} />
    </div>
  );
}

/** Segmented multi-choice chips, e.g. which services are bonded. */
export function ChipMultiGroup({
  label,
  values,
  onChange,
  options,
  className,
}: {
  label?: string;
  values: string[];
  onChange: (next: string[]) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  const selected = new Set(values);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const next = new Set(selected);
                if (active) next.delete(opt.value);
                else next.add(opt.value);
                // Keep option order stable rather than click order.
                onChange(options.filter((o) => next.has(o.value)).map((o) => o.value));
              }}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One-tap common values shown under an input, e.g. 230 V or Copper. */
export function ValueChips({
  values,
  onPick,
}: {
  values: Array<{ label: string; value: string | number }>;
  onPick: (value: string | number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <button
          key={v.label}
          type="button"
          onClick={() => onPick(v.value)}
          className="border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
        >
          {v.label}
        </button>
      ))}
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
    <div className={cn("flex flex-col gap-2", className)}>
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        {label} <FieldTick show={Boolean(value) && isClean(issues)} />
      </Label>
      <Select items={options} value={value ?? ""} onValueChange={(v) => onChange(v || undefined)}>
        <SelectTrigger
          className="!h-12 w-full text-base"
          aria-invalid={issues.some((i) => i.severity === "error") || undefined}
        >
          <SelectValue placeholder={placeholder ?? "Select"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-base">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldIssues issues={issues} />
    </div>
  );
}
