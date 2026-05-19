import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "./(marketing)/blog/_posts";

const SITE_URL = "https://experienciaairsoft.com";

// Fechas reales de ultima edicion de contenido. Actualizar a mano cuando se
// cambia copy/JSON-LD de una pagina. Google desconfia de sitemaps que mienten
// poniendo `new Date()` y termina ignorando `lastmod` por completo.
const LAST_UPDATED = {
  home: "2026-05-19",
  precios: "2026-05-14",
  buenosAires: "2026-05-14",
  primeraVez: "2026-05-14",
  eventosCorporativos: "2026-05-14",
  cumpleanos: "2026-05-14",
  airsoftVsPaintball: "2026-05-14",
  blogIndex: "2026-05-14",
} as const;

const toDate = (iso: string) => new Date(`${iso}T00:00:00-03:00`);

export default function sitemap(): MetadataRoute.Sitemap {
  const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: toDate(post.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: toDate(LAST_UPDATED.home),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/precios`,
      lastModified: toDate(LAST_UPDATED.precios),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/buenos-aires`,
      lastModified: toDate(LAST_UPDATED.buenosAires),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/primera-vez`,
      lastModified: toDate(LAST_UPDATED.primeraVez),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/eventos-corporativos`,
      lastModified: toDate(LAST_UPDATED.eventosCorporativos),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/cumpleanos`,
      lastModified: toDate(LAST_UPDATED.cumpleanos),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/airsoft-vs-paintball`,
      lastModified: toDate(LAST_UPDATED.airsoftVsPaintball),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: toDate(LAST_UPDATED.blogIndex),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogEntries,
  ];
}
