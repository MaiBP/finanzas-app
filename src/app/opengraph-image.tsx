import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Miti-Miti · Finanzas en pareja fáciles con IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#3b2722",
          color: "#f2ebd0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 90,
              height: 90,
              borderRadius: "50%",
              backgroundColor: "#ffca50",
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            ½
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, textTransform: "uppercase" }}>Miti-Miti</div>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 900, lineHeight: 1.1, maxWidth: 900 }}>
          Finanzas en pareja, tan fáciles como enviar un mensaje
        </div>
      </div>
    ),
    { ...size },
  );
}
