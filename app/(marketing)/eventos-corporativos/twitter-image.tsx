import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Eventos corporativos y team building con airsoft en Buenos Aires — Experiencia Airsoft";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Empresas · Team building",
    title: "Eventos corporativos",
    subtitle:
      "Team building con airsoft indoor para empresas en CABA. 10 a 40 personas, equipo incluido, facturación A/B.",
  });
}
