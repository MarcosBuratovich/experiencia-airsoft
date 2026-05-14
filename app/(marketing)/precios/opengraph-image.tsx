import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Precios de partidas de airsoft en Buenos Aires — Experiencia Airsoft";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Precios · ARS",
    title: "Cuánto cuesta jugar airsoft",
    subtitle:
      "Alquiler simple $40.000 · avanzada con tracer $50.000 · BYOP $20.000. Recargas y socios.",
  });
}
