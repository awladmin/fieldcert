# FieldCert backlog

Tickets we've deferred deliberately, with enough context to pick up cold.

## Certificate types beyond EICR

The "Select certificate type" picker (`apps/web/src/components/new-certificate-dialog.tsx`,
`CERT_TYPES`) already lists these as greyed "Coming soon". The `certificate_kind` enum
in the database already has `EIC` and `MEIWC`. Each needs a full build: schema, editor,
validation rules, and PDF laid out to its own model form.

- **Minor Works (MEIWC)** — recommended next. Single page, one circuit, no boards
  structure, no full schedule. Reuses the test-result fields we already model (Zs, IR,
  RCD, polarity), just a fraction of them. The everyday domestic alteration certificate,
  so highest use for least build.
  - `packages/cert-schemas`: add a `meiwc` schema.
  - `packages/rules-engine`: validation for the single-circuit case.
  - `apps/web/src/components/meiwc/`: editor (mirror the EICR builder, far smaller).
  - `apps/web/src/lib/pdf/`: a Minor Works PDF to the model form.
  - Flip `live: true` on the MEIWC entry in `CERT_TYPES`.

- **EIC (Electrical Installation Certificate)** — after Minor Works. Closer to the EICR
  in complexity (full schedule, boards, test results) but for new work: different
  declaration (designer/constructor/inspector), no observations/codes section.
  - Same four workstreams as above.
  - Flip `live: true` on the EIC entry in `CERT_TYPES`.

- **Other trades (EV charge point, emergency lighting, fire alarm)** — much later. These
  are separate compliance domains, not BS 7671 electrical installation certs. Alongside
  the "gas certificates coming next" idea.
