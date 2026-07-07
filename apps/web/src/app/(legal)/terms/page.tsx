export const metadata = { title: "Terms of service | FieldCert" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>
      <p>Last updated: 7 July 2026</p>

      <h2>1. Who we are</h2>
      <p>
        FieldCert provides software for creating, validating, storing and sharing electrical
        compliance certificates. These terms govern your use of the FieldCert web application and
        API (the &quot;Service&quot;).
      </p>

      <h2>2. Your account</h2>
      <p>
        You sign in with a one-time code sent to your email address. You are responsible for
        keeping access to that email address secure, and for all activity under your account.
        Organisation admins are responsible for who they invite and the roles they grant.
      </p>

      <h2>3. Your responsibilities as a professional</h2>
      <p>
        FieldCert validates certificate data against rules derived from BS 7671 and related
        guidance. This validation is an aid, not a substitute for professional judgement. The
        person named as inspector remains solely responsible for the inspection, the test results
        and the conclusions recorded. FieldCert checks the consistency and completeness of the
        data you enter; it does not and cannot verify the physical installation.
      </p>

      <h2>4. Your data</h2>
      <p>
        Certificates, photographs and uploaded documents belong to you or your organisation. We
        store them so the Service can work, and we do not sell them. You can export your
        certificates at any time. Share links you create are time limited and can be treated as
        confidential URLs; anyone holding a valid link can view the shared document until it
        expires.
      </p>

      <h2>5. Subscriptions and billing</h2>
      <p>
        Plans are billed monthly per the pricing shown at purchase, plus VAT. You can cancel at
        any time and your plan runs to the end of the paid period. If a subscription lapses, you
        keep read access to your issued certificates.
      </p>

      <h2>6. API use</h2>
      <p>
        API keys identify your organisation and must be kept secret. You may not use the API to
        build a service that resells certificate generation to third parties without a written
        agreement with us. We may apply fair-use rate limits.
      </p>

      <h2>7. Acceptable use</h2>
      <ul>
        <li>Do not use the Service to produce fraudulent or misleading certificates.</li>
        <li>Do not attempt to access other organisations&apos; data.</li>
        <li>Do not interfere with the operation or security of the Service.</li>
      </ul>

      <h2>8. Availability and liability</h2>
      <p>
        We work to keep the Service available and your data safe, but the Service is provided
        &quot;as is&quot;. To the maximum extent permitted by law, our total liability arising out
        of the Service is limited to the amount you paid us in the twelve months before the claim.
        Nothing in these terms limits liability that cannot be limited under law.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms as the Service evolves. If a change is material we will notify
        account holders by email before it takes effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:hello@fieldcert.co.uk">hello@fieldcert.co.uk</a>
      </p>
    </>
  );
}
