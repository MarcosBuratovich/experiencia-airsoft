import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/platform/", "/login", "/signup", "/admin/", "/partidas", "/auth/"],
      },
    ],
    sitemap: "https://experienciaairsoft.com/sitemap.xml",
  };
}
