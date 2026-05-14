import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "./_components/og-template";

export const alt =
  "Experiencia Airsoft — centro de airsoft CQB indoor en Buenos Aires";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "CQB indoor · Buenos Aires",
    title: "Experiencia Airsoft",
    subtitle:
      "Centro de airsoft indoor. Partidas curadas, equipo incluido, ambientación cinematográfica.",
  });
}
