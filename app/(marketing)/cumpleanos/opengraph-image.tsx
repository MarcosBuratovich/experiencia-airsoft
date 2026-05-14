import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Cumpleaños de airsoft en Buenos Aires — Experiencia Airsoft, mayores de 18";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Cumpleaños · +18",
    title: "Festejá con airsoft",
    subtitle:
      "8 a 25 personas. Equipo incluido, partidas tácticas y espacio para torta. CABA.",
  });
}
