import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../../_components/og-template";

export const alt =
  "Equipamiento básico de airsoft para tu primera partida — Experiencia Airsoft";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Blog · Equipamiento",
    title: "Equipo básico para tu primera vez",
    subtitle:
      "Qué llevar, qué NO traer y qué viene incluido en el alquiler. Checklist completo.",
  });
}
