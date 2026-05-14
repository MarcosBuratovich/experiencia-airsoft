import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../../_components/og-template";

export const alt =
  "Reglas básicas y seguridad en airsoft — Experiencia Airsoft, Buenos Aires";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Blog · Seguridad",
    title: "Reglas básicas de airsoft",
    subtitle:
      "Protección facial, límite de FPS, honor system, MED y todo lo que tenés que saber antes de jugar.",
  });
}
