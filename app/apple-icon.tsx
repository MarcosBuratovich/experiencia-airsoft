import { ImageResponse } from "next/og";

// Apple-touch-icon. Apple sugiere 180x180. Mantenemos el mismo diseño que
// el icon principal — fondo negro, EA naranja, brackets tácticos.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "Impact, 'Arial Black', Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,107,26,0.08) 0 2px, transparent 2px 24px)",
          }}
        />
        <div
          style={{
            fontSize: 112,
            fontWeight: 900,
            color: "#f5f5f0",
            letterSpacing: -3,
            lineHeight: 1,
            display: "flex",
            position: "relative",
            zIndex: 1,
          }}
        >
          E<span style={{ color: "#ff6b1a", marginLeft: -7 }}>A</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 18,
            background: "#ff6b1a",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            width: 22,
            height: 22,
            borderTop: "3px solid #ff6b1a",
            borderLeft: "3px solid #ff6b1a",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 22,
            height: 22,
            borderTop: "3px solid #ff6b1a",
            borderRight: "3px solid #ff6b1a",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
