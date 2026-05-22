// Metadata centralizada de los posts del blog.
// Cada post tiene su propio archivo page.tsx con contenido, pero re-usa
// el title/description/date desde aca para mantener consistencia entre
// el indice, la metadata, los JSON-LD y las OG images.

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO 8601 YYYY-MM-DD
  readingTime: string; // "5 min"
  tag: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "que-es-airsoft",
    title: "¿Qué es el airsoft? Guía completa para entender el deporte",
    description:
      "Qué es airsoft, cómo funciona, en qué se diferencia del paintball y por qué crece tanto en Argentina. Guía para entender el deporte antes de probarlo.",
    date: "2026-05-05",
    readingTime: "6 min",
    tag: "Fundamentos",
  },
  {
    slug: "equipamiento-principiantes",
    title: "Equipamiento básico de airsoft para tu primera partida",
    description:
      "Qué necesitás llevar (y qué NO) a tu primera partida de airsoft en Buenos Aires. Marcadora, protección, ropa y accesorios desde el punto de vista de quien nunca jugó.",
    date: "2026-05-19",
    readingTime: "7 min",
    tag: "Equipamiento",
  },
  {
    slug: "reglas-y-seguridad",
    title: "Reglas básicas y seguridad en airsoft: lo que tenés que saber",
    description:
      "Las reglas universales del airsoft, el límite de FPS, el honor system, qué pasa cuando te dan y por qué la seguridad es obligatoria. Explicado simple.",
    date: "2026-05-12",
    readingTime: "5 min",
    tag: "Seguridad",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

// Formato visible: "12 may 2026"
export function formatBlogDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00-03:00`);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
