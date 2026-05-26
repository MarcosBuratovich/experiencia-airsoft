import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import { SITE_URL } from "../../_components/site-constants";
import { BLOG_POSTS, formatBlogDate } from "./_posts";

const PAGE_URL = `${SITE_URL}/blog`;
const TITLE = "Blog de airsoft: guías y consejos";
const DESCRIPTION =
  "Artículos sobre airsoft en Argentina: qué es, equipamiento, reglas, seguridad y guías para principiantes. Material práctico de quienes operan el campo todos los días.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "website",
    locale: "es_AR",
  },
};

const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Blog · Experiencia Airsoft",
  url: PAGE_URL,
  description: DESCRIPTION,
  inLanguage: "es-AR",
  publisher: {
    "@type": "Organization",
    name: "Experiencia Airsoft",
    url: SITE_URL,
  },
  blogPost: BLOG_POSTS.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    url: `${SITE_URL}/blog/${p.slug}`,
    datePublished: p.date,
    dateModified: p.date,
    author: {
      "@type": "Organization",
      name: "Experiencia Airsoft",
    },
  })),
};

export default function BlogIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <MarketingHeader activeHref="/blog" />

      <main className="bg-ink text-bone">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-20 relative">
            <p className="sect-label mb-4">[ Blog · operación ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Material táctico
              <br />
              <span className="text-orange">para entender airsoft</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Guías cortas y honestas para quien recién empieza, quiere entender
              el deporte o decide si probarlo. Escrito por gente que opera el
              campo, no por marketing.
            </p>
          </div>
        </section>

        {/* LISTA DE POSTS */}
        <section>
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <ul className="grid md:grid-cols-2 gap-6">
              {BLOG_POSTS.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block border border-bone/15 hover:border-orange bg-carbon hover:bg-orange/5 clip-notch p-6 sm:p-7 h-full transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                      <span className="text-orange">{post.tag}</span>
                      <span>
                        {formatBlogDate(post.date)} · {post.readingTime}
                      </span>
                    </div>
                    <h2 className="font-display fluid-xl uppercase text-bone leading-tight mb-3 group-hover:text-orange transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-ash fluid-sm leading-relaxed">
                      {post.description}
                    </p>
                    <p className="mt-5 font-mono fluid-xs uppercase tracking-[.22em] text-bone group-hover:text-orange transition-colors">
                      Leer artículo →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14 text-center">
            <h2 className="font-display uppercase fluid-3xl text-bone leading-[.95] mb-4">
              ¿Listo para jugar?
            </h2>
            <p className="text-ash fluid-base mb-6 max-w-[50ch] mx-auto leading-relaxed">
              Reservas se confirman por WhatsApp. Si nunca jugaste, arrancá por
              la guía de primera vez.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              <Link href="/primera-vez" className="hover:text-bone transition">
                Soy principiante →
              </Link>
              <Link href="/precios" className="hover:text-bone transition">
                Ver precios →
              </Link>
              <Link href="/buenos-aires" className="hover:text-bone transition">
                Cómo llegar →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
