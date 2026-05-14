import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Airsoft en Buenos Aires — Experiencia Airsoft, Gral. Conesa 1858, CABA";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Buenos Aires · CABA",
    title: "Airsoft indoor en BA",
    subtitle:
      "Gral. Conesa 1858 · martes a domingo · equipo incluido · máx. 330 FPS.",
  });
}
