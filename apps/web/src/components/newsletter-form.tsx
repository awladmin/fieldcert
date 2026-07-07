"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Pre-launch email capture; posts to /api/newsletter. */
export function NewsletterForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string>();

  async function subscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(undefined);
    const honeypot = (e.currentTarget.elements.namedItem("company_website") as HTMLInputElement)?.value;
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company_website: honeypot ?? "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState("error");
        setError(json.error ?? "Something went wrong. Try again");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("Something went wrong. Try again");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("text-primary flex items-center gap-2 font-medium", className)}>
        <CheckCircle2 className="size-5" />
        You are on the list. We will email you when FieldCert launches.
      </p>
    );
  }

  return (
    <form onSubmit={subscribe} className={cn("flex w-full max-w-md flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.co.uk"
          aria-label="Email address"
          className="h-12 text-base"
        />
        <Button type="submit" size="lg" className="h-12 shrink-0 px-6" disabled={state === "sending"}>
          {state === "sending" ? "Joining" : "Get early access"}
        </Button>
      </div>
      {/* Honeypot: hidden from humans, bots fill it */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      {error && <p className="text-destructive text-sm font-medium">{error}</p>}
    </form>
  );
}
