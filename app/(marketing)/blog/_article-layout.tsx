import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";
import { BLOG_POSTS, formatBlogDate, getPostBySlug } from "./_posts";

// Wrapper compartido para los posts del blog. Cada post pasa su slug + el
// contenido (children). Aca generamos el JSON-LD (BlogPosting + Breadcrumb),
// el hero del articulo, el footer con CTA y los links a posts relacionados.

export function BlogArticleLayout({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const post = getPostBySlug(slug);
  if (!post) {
    throw new Error(`Blog post no registrado en _posts.ts: ${slug}`);
  }
  const url = `${SITE_URL}/blog/${post.slug}`;
  const ogUrl = `${url}/opengraph-image`;

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    mainEntityOfPage: url,
    url,
    image: ogUrl,
    inLanguage: "es-AR",
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "Experiencia Airsoft",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Experiencia Airsoft",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon`,
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: url,
      },
    ],
  };

  // Posts relacionados: los otros 2 del listado
  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <MarketingHeader activeHref="/blog" />

      <main className="bg-ink text-bone">
        {/* Breadcrumbs visibles */}
        <nav
          aria-label="Breadcrumb"
          className="border-b border-bone/10 bg-carbon/30"
        >
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-3">
            <ol className="flex items-center flex-wrap gap-x-2 gap-y-1 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              <li>
                <Link href="/" className="hover:text-bone transition">
                  Inicio
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/blog" className="hover:text-bone transition">
                  Blog
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-bone normal-case tracking-normal">
                {post.tag}
              </li>
            </ol>
          </div>
        </nav>

        {/* HERO del articulo */}
        <header className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14 sm:py-20 relative">
            <p className="sect-label mb-4">
              [ {post.tag} · {formatBlogDate(post.date)} · {post.readingTime} ]
            </p>
            <h1 className="font-display uppercase text-bone fluid-4xl leading-[0.98]">
              {post.title}
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              {post.description}
            </p>
          </div>
        </header>

        {/* Contenido */}
        <article className="border-b border-bone/10">
          <div className="max-w-[760px] mx-auto fluid-gutter-x py-14 space-y-6 text-ash fluid-base leading-relaxed [&_h2]:font-display [&_h2]:uppercase [&_h2]:text-bone [&_h2]:fluid-2xl [&_h2]:leading-tight [&_h2]:mt-12 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:uppercase [&_h3]:text-bone [&_h3]:fluid-lg [&_h3]:leading-tight [&_h3]:mt-8 [&_h3]:mb-2 [&_strong]:text-bone [&_a]:text-orange [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-bone [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-orange [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:marker:text-orange [&_blockquote]:border-l-2 [&_blockquote]:border-orange [&_blockquote]:pl-5 [&_blockquote]:text-bone [&_blockquote]:italic">
            {children}
          </div>
        </article>

        {/* Posts relacionados */}
        {related.length > 0 ? (
          <section className="border-b border-bone/10">
            <div className="max-w-[1000px] mx-auto fluid-gutter-x py-12">
              <p className="sect-label mb-5">[ Seguí leyendo ]</p>
              <ul className="grid md:grid-cols-2 gap-5">
                {related.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group block border border-bone/15 hover:border-orange bg-carbon hover:bg-orange/5 clip-notch p-5 transition-colors"
                    >
                      <p className="font-mono fluid-xs uppercase tracking-[.22em] text-orange mb-2">
                        {p.tag}
                      </p>
                      <h3 className="font-display fluid-lg uppercase text-bone leading-tight mb-2 group-hover:text-orange transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-ash fluid-sm leading-relaxed">
                        {p.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* CTA cierre */}
        <section>
          <div className="max-w-[1000px] mx-auto fluid-gutter-x py-14 text-center">
            <h2 className="font-display uppercase fluid-3xl text-bone leading-[.95] mb-4">
              Probalo en cancha
            </h2>
            <p className="text-ash fluid-base mb-6 max-w-[50ch] mx-auto leading-relaxed">
              Reservá una partida en Experiencia Airsoft. Todo lo que leíste
              acá lo vivís en una sola tarde.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-wa inline-flex items-center gap-3 px-7 py-4 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
            >
              Reservar por WhatsApp
              <span aria-hidden>→</span>
            </a>
            <p className="mt-4 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              {WHATSAPP_NUMBER}
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
