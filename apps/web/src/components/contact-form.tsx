"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { sendContactMessage, type ContactFormState } from "@/actions/contact";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(
    sendContactMessage,
    {}
  );

  if (state.sent) {
    return (
      <Alert>
        <CheckCircle2 className="text-primary size-4" />
        <AlertDescription>
          Message sent. We will get back to you at the email you gave, usually the same working day.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="c-name">Your name</Label>
          <Input id="c-name" name="name" autoComplete="name" required className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" name="email" type="email" autoComplete="email" required className="h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="c-message">Message</Label>
        <textarea
          id="c-message"
          name="message"
          required
          rows={6}
          className="border-input focus-visible:ring-ring w-full rounded-lg border bg-transparent px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none"
          placeholder="What can we help with?"
        />
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
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="h-11 self-start px-6">
        {pending ? "Sending" : "Send message"}
      </Button>
    </form>
  );
}
