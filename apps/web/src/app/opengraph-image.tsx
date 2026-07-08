import { ImageResponse } from "next/og";

export const alt = "FieldCert: electrical certificates, filled by AI, checked by rules";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview card for shares on LinkedIn, Facebook, WhatsApp, X. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0d5c40 0%, #157a49 55%, #1d8f65 100%)",
          color: "#ffffff",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg viewBox="0 0 64 64" width="104" height="104">
            <path
              d="M 32.0 2.0 A 6.91 6.91 0 0 1 43.48 4.28 A 6.91 6.91 0 0 1 53.21 10.79 A 6.91 6.91 0 0 1 59.72 20.52 A 6.91 6.91 0 0 1 62.0 32.0 A 6.91 6.91 0 0 1 59.72 43.48 A 6.91 6.91 0 0 1 53.21 53.21 A 6.91 6.91 0 0 1 43.48 59.72 A 6.91 6.91 0 0 1 32.0 62.0 A 6.91 6.91 0 0 1 20.52 59.72 A 6.91 6.91 0 0 1 10.79 53.21 A 6.91 6.91 0 0 1 4.28 43.48 A 6.91 6.91 0 0 1 2.0 32.0 A 6.91 6.91 0 0 1 4.28 20.52 A 6.91 6.91 0 0 1 10.79 10.79 A 6.91 6.91 0 0 1 20.52 4.28 A 6.91 6.91 0 0 1 32.0 2.0 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
            />
            <path
              d="M 32.0 6.5 A 5.87 5.87 0 0 1 41.76 8.44 A 5.87 5.87 0 0 1 50.03 13.97 A 5.87 5.87 0 0 1 55.56 22.24 A 5.87 5.87 0 0 1 57.5 32.0 A 5.87 5.87 0 0 1 55.56 41.76 A 5.87 5.87 0 0 1 50.03 50.03 A 5.87 5.87 0 0 1 41.76 55.56 A 5.87 5.87 0 0 1 32.0 57.5 A 5.87 5.87 0 0 1 22.24 55.56 A 5.87 5.87 0 0 1 13.97 50.03 A 5.87 5.87 0 0 1 8.44 41.76 A 5.87 5.87 0 0 1 6.5 32.0 A 5.87 5.87 0 0 1 8.44 22.24 A 5.87 5.87 0 0 1 13.97 13.97 A 5.87 5.87 0 0 1 22.24 8.44 A 5.87 5.87 0 0 1 32.0 6.5 Z"
              fill="#ffffff"
            />
            <path
              d="M 21.5 33.5 L 28.5 40.5 L 42.5 24.5"
              fill="none"
              stroke="#157a49"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
            FieldCert
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 56,
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 900,
          }}
        >
          <span>Electrical certificates.</span>
          <span style={{ color: "#a7e3c6" }}>Filled by AI. Checked by rules.</span>
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 28, color: "rgba(255,255,255,0.85)" }}>
          BS 7671 validation built in. A certificate with errors cannot be issued.
        </div>
      </div>
    ),
    size
  );
}
