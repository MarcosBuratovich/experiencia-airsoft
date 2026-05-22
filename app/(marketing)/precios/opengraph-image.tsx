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
      "Alquiler $60.000 · BYOP $25.000 · 10% off pagando en efectivo. Recargas y socios.",
  });
}
