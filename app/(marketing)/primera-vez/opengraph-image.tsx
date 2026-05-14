import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createOgImage,
} from "../../_components/og-template";

export const alt =
  "Primera vez jugando airsoft — guía completa para principiantes en Buenos Aires";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return createOgImage({
    eyebrow: "Guía · Principiantes",
    title: "Primera vez en airsoft",
    subtitle:
      "Qué llevar, qué esperar, reglas de seguridad y cómo reservar. Pensado para quien nunca jugó.",
  });
}
