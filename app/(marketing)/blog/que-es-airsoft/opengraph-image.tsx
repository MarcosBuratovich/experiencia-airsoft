import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../../_components/og-template";

export const alt =
  "¿Qué es el airsoft? Guía completa para entender el deporte — Experiencia Airsoft";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Blog · Fundamentos",
    title: "¿Qué es el airsoft?",
    subtitle:
      "Cómo funciona, diferencias con paintball y por qué crece en Argentina. Guía para entender el deporte.",
  });
}
