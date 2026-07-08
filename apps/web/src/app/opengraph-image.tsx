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
          background: "linear-gradient(135deg, #0d5c40 0%, #157A55 55%, #1d8f65 100%)",
          color: "#ffffff",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg viewBox="0 0 48 48" width="88" height="88">
            <rect x="2" y="2" width="44" height="44" rx="11" fill="#ffffff" fillOpacity="0.14" />
            <rect
              x="2"
              y="2"
              width="44"
              height="44"
              rx="11"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
            <path
              d="M14 24.5l7 7L34 17"
              fill="none"
              stroke="#fff"
              strokeWidth="5"
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
