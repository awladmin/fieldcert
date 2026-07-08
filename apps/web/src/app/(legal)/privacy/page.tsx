export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>Last updated: 7 July 2026</p>

      <h2>1. What we collect</h2>
      <ul>
        <li>Account details: your name, email address and organisation.</li>
        <li>
          Certificate data: the information you or your organisation enter or upload, which may
          include names and addresses of your clients and the properties you inspect.
        </li>
        <li>Usage data: sign-in events and API request metadata, used for security and support.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        We use your data to provide the Service: creating, validating, storing and sharing
        certificates; managing your team; and billing. We do not sell personal data and we do not
        use your certificate data to advertise to anyone.
      </p>

      <h2>3. Where it lives</h2>
      <p>
        Data is stored with our hosting providers in the United Kingdom and the European Economic
        Area. Uploaded files and generated PDFs are held in private storage and are only reachable
        through your account or the time-limited share links you create.
      </p>

      <h2>4. Legal basis</h2>
      <p>
        We process account and certificate data to perform our contract with you. Where you enter
        details about your clients and their properties, you act as controller of that data and
        FieldCert acts as your processor, handling it only on your instructions through the
        Service.
      </p>

      <h2>5. Retention</h2>
      <p>
        Certificates are compliance records, so we keep them while your account exists. If you
        close your account we delete your data within 90 days, except where we must keep records
        to meet legal obligations.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You can access, correct, export or delete your personal data. Email{" "}
        <a href="mailto:hello@fieldcert.co.uk">hello@fieldcert.co.uk</a> and we will respond within
        one month. You also have the right to complain to the ICO.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use strictly necessary cookies to keep you signed in. No advertising or cross-site
        tracking cookies are set.
      </p>
    </>
  );
}
