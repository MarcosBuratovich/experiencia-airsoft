import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Blog Experiencia Airsoft — guías sobre airsoft, equipamiento, reglas y seguridad";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Blog · Material táctico",
    title: "Guías de airsoft",
    subtitle:
      "Equipamiento, reglas, seguridad y fundamentos. Material práctico escrito por gente del campo.",
  });
}
