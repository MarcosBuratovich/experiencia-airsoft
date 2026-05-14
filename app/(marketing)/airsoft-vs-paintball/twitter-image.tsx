import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Airsoft vs paintball: comparativa honesta de costos, dolor y realismo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Comparativa · honesta",
    title: "Airsoft vs paintball",
    subtitle:
      "Diferencias reales en costo, dolor, realismo y dinámica. Cuál te conviene según qué buscás.",
  });
}
