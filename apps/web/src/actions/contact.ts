"use server";

export interface ContactFormState {
  error?: string;
  sent?: boolean;
}

export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Honeypot: real users never fill this hidden field
  const company = String(formData.get("company_website") ?? "").trim();

  if (company) return { sent: true };
  if (!name) return { error: "Tell us your name" };
  if (!email || !email.includes("@")) return { error: "Enter a valid email so we can reply" };
  if (!message || message.length < 10) return { error: "Tell us a little more in the message" };
  if (message.length > 5000) return { error: "Keep the message under 5,000 characters" };

  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: "The contact form is not configured yet. Email hello@fieldcert.co.uk instead" };

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "FieldCert Contact <hello@fieldcert.co.uk>",
      to: ["hello@fieldcert.co.uk"],
      reply_to: email,
      subject: `Contact form: ${name}`,
      html: `<p><strong>${escape(name)}</strong> (${escape(email)}) wrote:</p><p>${escape(message).replace(/\n/g, "<br/>")}</p>`,
    }),
  });

  if (!response.ok) {
    return { error: "Sending failed. Email hello@fieldcert.co.uk instead" };
  }
  return { sent: true };
}
