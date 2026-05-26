import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Experiencia Airsoft",
    short_name: "EA",
    description:
      "Centro de airsoft CQB indoor en Buenos Aires. Reservás partidas, gestionás tu cuenta y tus clanes.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#ff6b1a",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["sports", "entertainment", "lifestyle"],
    lang: "es-AR",
  };
}
