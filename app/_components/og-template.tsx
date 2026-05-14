import { ImageResponse } from "next/og";

// Template compartido para las OG images programaticas.
// Lo usan tanto opengraph-image.tsx como twitter-image.tsx en cada ruta.
//
// Diseno: fondo negro tactico con stripe diagonal sutil, brackets en las
// esquinas, eyebrow chico en naranja, titulo grande en bone, bloque inferior
// con la marca + dato de ubicacion. Mismo lenguaje visual que el favicon.

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

type OgImageProps = {
  eyebrow: string; // texto chico arriba ("PRECIOS", "PRIMERA VEZ", etc.)
  title: string; // titulo principal
  subtitle?: string; // sub linea opcional
  accent?: string; // override del color naranja default
};

export function createOgImage({
  eyebrow,
  title,
  subtitle,
  accent = "#ff6b1a",
}: OgImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          position: "relative",
          fontFamily: "Impact, 'Arial Black', Helvetica, sans-serif",
        }}
      >
        {/* Stripes diagonales sutiles */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(135deg, ${accent}14 0 4px, transparent 4px 80px)`,
          }}
        />

        {/* Brackets superiores */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            width: 64,
            height: 64,
            borderTop: `8px solid ${accent}`,
            borderLeft: `8px solid ${accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            width: 64,
            height: 64,
            borderTop: `8px solid ${accent}`,
            borderRight: `8px solid ${accent}`,
          }}
        />
        {/* Brackets inferiores */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            width: 64,
            height: 64,
            borderBottom: `8px solid ${accent}`,
            borderLeft: `8px solid ${accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            width: 64,
            height: 64,
            borderBottom: `8px solid ${accent}`,
            borderRight: `8px solid ${accent}`,
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            color: accent,
            fontSize: 32,
            letterSpacing: 12,
            textTransform: "uppercase",
            fontFamily: "'Courier New', Courier, monospace",
            display: "flex",
            position: "relative",
            zIndex: 1,
          }}
        >
          {eyebrow}
        </div>

        {/* Bloque central: titulo + subtitulo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: "#f5f5f0",
              fontSize: title.length > 50 ? 80 : 108,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 0.95,
              textTransform: "uppercase",
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                color: "#9c9c95",
                fontSize: 32,
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 400,
                lineHeight: 1.3,
                display: "flex",
                maxWidth: 950,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Bloque inferior: marca + lugar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0a0a0a",
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: -2,
              }}
            >
              EA
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  color: "#f5f5f0",
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: -1,
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                Experiencia Airsoft
              </div>
              <div
                style={{
                  color: "#9c9c95",
                  fontSize: 20,
                  fontFamily: "'Courier New', Courier, monospace",
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                CQB indoor · CABA
              </div>
            </div>
          </div>
          <div
            style={{
              color: accent,
              fontSize: 20,
              fontFamily: "'Courier New', Courier, monospace",
              letterSpacing: 4,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            experienciaairsoft.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
