import { ImageResponse } from "next/og";

// Next 16: file convention. Genera /icon dinámicamente con un ImageResponse
// — fondo negro + iniciales "EA" en naranja con stripe táctica abajo.
// Reemplaza el PNG anterior que tenía texto blanco sobre fondo blanco.
// El día que tengamos un logo cuadrado bien diseñado (fondo oscuro + marca
// visible a tamaño favicon), reemplazamos este archivo por un `icon.png`
// y Next sirve ese.

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
        {/* Diagonal stripes background sutil */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,107,26,0.08) 0 4px, transparent 4px 60px)",
          }}
        />

        {/* Iniciales EA centradas */}
        <div
          style={{
            fontSize: 320,
            fontWeight: 900,
            color: "#f5f5f0",
            letterSpacing: -10,
            lineHeight: 1,
            display: "flex",
            position: "relative",
            zIndex: 1,
          }}
        >
          E<span style={{ color: "#ff6b1a", marginLeft: -20 }}>A</span>
        </div>

        {/* Stripe naranja inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            background: "#ff6b1a",
          }}
        />

        {/* Esquina superior izquierda — bracket táctico */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            width: 56,
            height: 56,
            borderTop: "8px solid #ff6b1a",
            borderLeft: "8px solid #ff6b1a",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 28,
            width: 56,
            height: 56,
            borderTop: "8px solid #ff6b1a",
            borderRight: "8px solid #ff6b1a",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
