# Audit SEO · Experiencia Airsoft

Estado del SEO técnico de la landing pública (`https://experienciaairsoft.com`).
Las áreas autenticadas (`app.experienciaairsoft.com`) están `noindex` y bloqueadas
por `robots.ts` — no aplica nada de esto a ellas.

## ✅ Aplicado en código

### Metadata (`app/layout.tsx`)

- `metadataBase` con la URL canónica.
- `title` con `template` para sub-páginas (`%s · Experiencia Airsoft`).
- `description` única ≤ 160 caracteres y keyword-rich.
- `keywords` con términos relevantes (airsoft, CQB, Buenos Aires…).
- `openGraph` completo: type, locale `es_AR`, url, siteName, title, description, image 1200x630 con alt.
- `twitter` con card `summary_large_image`.
- `alternates.canonical = "/"`.
- `category: "sports"`.
- `robots.googleBot` con `max-image-preview: large` y `max-snippet: -1`.
- `icons` removido — Next 16 detecta `app/icon.png` y `app/apple-icon.png` automáticamente.

### Favicon (Next 16 file conventions)

- `app/icon.png` (logo cuadrado 1920×1920).
- `app/apple-icon.png` (mismo logo, apple touch icon).
- Next genera `<link rel="icon">` y `<link rel="apple-touch-icon">` con `sizes` automático.

> ⚠️ Google cachea favicons varios días/semanas. El logo viejo (horizontal, ilegible al recortar) puede seguir apareciendo en los resultados hasta que recrawlee. Se puede forzar pidiendo reindexación en Search Console.

### Structured data (JSON-LD) en `app/page.tsx`

- **SportsActivityLocation + LocalBusiness**: nombre, slogan, dirección postal completa, geo coords, telephone, email, openingHours (mar-vie y sa-do), priceRange, paymentAccepted, sport, image array (4 imágenes), logo, sameAs (IG + YT), areaServed (Buenos Aires + AMBA), audience 18+, amenityFeature (equipo incluido, multinivel, 330 FPS), contactPoint con `contactOption: WhatsApp`.
- **WebSite**: identifica el sitio en buscadores.
- **BreadcrumbList**: home como item #1 — se expandirá cuando haya sub-páginas indexables.
- **FAQPage**: 6 preguntas frecuentes para featured snippets.

Validar en: https://search.google.com/test/rich-results

### HTML semántico

- `<html lang="es">` en layout.
- `<header>` para el nav, `<main>` envolviendo todo el contenido entre nav y footer, `<footer>` al final.
- Un único `<h1>` en el hero, con `<span class="sr-only">` para keywords completos.
- `<h2>` por cada sección, `<h3>` para sub-items.
- `<section id="partidas">`, `<section id="aprende">`, `<section id="reservar">` con anchors.
- `<article>` para cards de Visión/Misión y para partidas/reels.

### Imágenes

- Todas las `<img>` con `alt` descriptivo y único (no genérico).
- `width` y `height` para evitar CLS (Cumulative Layout Shift).
- Hero, logos, cards de partidas, banners IG/YT migrados a `next/image` →
  Next sirve automáticamente WebP/AVIF al cliente moderno + srcset con
  `sizes` correctos. Hero usa `priority`, resto carga lazy por default.
- Background images decorativas (con `aria-hidden`) se dejan como `<img>`
  para evitar markup extra.
- Alts contextuales (modalidad + día + lugar) en todas las cards.

### Cluster pages (content cluster, hub & spoke)

- Hub: `/` (pillar page con todo el negocio).
- Spokes:
  - `/precios` — pricing detallado + Service JSON-LD con OfferCatalog +
    FAQPage.
  - `/buenos-aires` — local SEO + SportsActivityLocation con geo coords +
    FAQPage local.
  - `/primera-vez` — guía principiantes + HowTo JSON-LD + FAQPage.
  - `/eventos-corporativos` — B2B / team building + Service +
    OfferCatalog + FAQPage.
  - `/cumpleanos` — festejos +18 + Service + FAQPage.
  - `/airsoft-vs-paintball` — comparativa long-tail + Article JSON-LD +
    FAQPage.
- Componentes compartidos (`app/_components/`): `marketing-header`,
  `marketing-footer`, `site-constants` para mantener consistencia y un
  solo punto de edición de URLs / direcciones.

### Blog

- `/blog` — index listando posts con Blog JSON-LD.
- 3 posts long-form iniciales:
  - `/blog/que-es-airsoft` (fundamentos)
  - `/blog/equipamiento-principiantes` (middle funnel, links a /precios)
  - `/blog/reglas-y-seguridad` (top funnel, safety)
- Cada post tiene `BlogPosting` + `BreadcrumbList` JSON-LD,
  breadcrumbs visibles y bloque de "Seguí leyendo" con posts
  relacionados. Layout compartido en `_article-layout.tsx`.
- Metadata centralizada en `_posts.ts` (single source of truth para
  título, fecha, slug, tag y reading time → re-usado en index, JSON-LD,
  sitemap y OG images).

### OG / Twitter images dinámicas

- `app/_components/og-template.tsx` — helper que arma una `ImageResponse`
  1200×630 con branding consistente (eyebrow, título, subtitle, marca,
  brackets tácticos en esquinas).
- `opengraph-image.tsx` + `twitter-image.tsx` en cada ruta (home + 6
  cluster pages + blog index + 3 posts). Cuando alguien comparte por
  WhatsApp/IG/FB/X, ve un preview específico de cada página.
- Layout sigue declarando `openGraph` / `twitter` (title, description,
  type, locale) pero ya no hardcodea `images` — Next usa la file
  convention.

### `llms.txt` (`public/llms.txt`)

- Resumen rápido + datos clave (dirección, teléfono, edad, FPS).
- Sobre nosotros, modalidades, horarios, costos detallados, FAQ, glosario.
- Bloqueo explícito de áreas privadas.
- Última actualización fechada.

### `robots.ts` + `sitemap.ts`

- `robots.ts` bloquea `/platform/`, `/login`, `/signup`, `/admin/`,
  `/partidas`, `/auth/`. Cluster pages y blog quedan permitidos (allow `/`).
- `sitemap.ts` con home + 6 cluster pages + blog index + posts.
  Prioridades: home 1.0, precios 0.9, otros clusters 0.7-0.8, blog y
  posts 0.6-0.7. `lastModified` real de cada post (no `new Date()`).
- Apuntan al sitemap desde robots.

### Performance

- Fonts cargadas vía `next/font/google` con `display: swap`.
- Imágenes principales servidas vía `next/image` (auto WebP/AVIF,
  srcset, lazy load, preconnect implícito).
- Hero del home con `<Image priority sizes="100vw">` para LCP rápido.
- Background images decorativas con `loading="lazy"` (no priority).
- CSS crítico inline gracias a Next 16 + Tailwind v4.

---

## 🔜 Próximos pasos (off-page)

Estos requieren acción manual fuera del código.

### 1. Google Search Console

- Ingresar a https://search.google.com/search-console
- Add property → "Domain" (no URL prefix) → `experienciaairsoft.com`.
- Google va a pedir un TXT record DNS para verificar el dominio. Se pega tal cual en Wix DNS (o donde esté el DNS).
- Una vez verificado:
  - Sitemap → enviar `https://experienciaairsoft.com/sitemap.xml`.
  - URL Inspection → pegar la home → "Request Indexing" para forzar el primer crawl.
  - URL Inspection con `/icon` → forzar recache del favicon nuevo.

### 2. Google Business Profile

- Crear (o reclamar) perfil en https://business.google.com.
- Dirección, teléfono, fotos, horarios, categoría "Sports Complex" o "Recreation Center".
- Pedir review verification.
- Esto da el panel lateral en Google y aparece en Maps. Crítico para SEO local.

### 3. Bing Webmaster Tools

- https://www.bing.com/webmasters
- Importar desde GSC (Bing acepta export directo).
- Submit sitemap.
- Es 1% del tráfico pero también lo crawlean DuckDuckGo y otros.

### 4. Reseñas

- Pedir a clientes satisfechos que dejen reseñas en Google Maps.
- 10+ reseñas con score >4.5 es la métrica más impactante para SEO local.

### 5. Backlinks orgánicos

- Pedir mención/link en webs de comunidades de airsoft argentinas.
- Submission a directorios de actividades / outdoor BA (TripAdvisor, Civitatis si aplica).
- Notas de prensa local sobre la apertura.

### 6. Búsquedas de IA (LLMO — LLM Optimization)

- **ChatGPT / Perplexity / Claude** consultan páginas vía web. El `llms.txt` les da contexto estructurado.
- **Google AI Overviews / SGE**: usan el JSON-LD + contenido semántico. Ya está cubierto.
- **Bing Copilot**: indexa desde Bing Webmaster — registrarse ahí (paso 3).
- Para sitios listados en datasets de IA, agregar el sitio a https://search.brave.com (si crece, brave bot lo crawlea).
- Mantener el `llms.txt` actualizado con cambios de precios, horarios, modalidades.

### 7. Open Graph debugger

Después de cada deploy importante:
- https://www.opengraph.xyz/url/https%3A%2F%2Fexperienciaairsoft.com → preview real.
- https://developers.facebook.com/tools/debug/ → forzar refresh del cache de FB.
- https://cards-dev.twitter.com/validator → preview Twitter.

### 8. Lighthouse score

Correr periódicamente:
- Chrome DevTools → Lighthouse → Mobile + Desktop.
- Target: Performance 90+, SEO 100, Accessibility 95+, Best Practices 95+.
- Si baja Performance: revisar imágenes pesadas y JS bundle.

### 9. PageSpeed Insights

- https://pagespeed.web.dev/?url=https%3A%2F%2Fexperienciaairsoft.com
- Mirar Core Web Vitals (LCP, INP, CLS).
- Mejorar lo que indique.

---

## 🧪 Tests rápidos post-deploy

```bash
# Verificar metadata y JSON-LD
curl -s https://experienciaairsoft.com | grep -oE '<(meta|link|title|script)[^>]*>' | head -40

# Verificar robots.txt
curl https://experienciaairsoft.com/robots.txt

# Verificar sitemap
curl https://experienciaairsoft.com/sitemap.xml

# Verificar llms.txt
curl https://experienciaairsoft.com/llms.txt | head -20

# Verificar favicon (debería responder 200, no 404)
curl -I https://experienciaairsoft.com/icon
curl -I https://experienciaairsoft.com/apple-icon
```

---

## 📈 Métricas a monitorear

| Métrica | Dónde | Cadencia |
|---|---|---|
| Posición media en búsquedas | Google Search Console | Semanal |
| CTR de búsquedas | Google Search Console | Semanal |
| Reseñas + score | Google Business Profile | Mensual |
| Core Web Vitals | PageSpeed Insights | Mensual |
| Lighthouse SEO | Chrome DevTools | Cada deploy mayor |
| Indexación de páginas | Google Search Console > Coverage | Semanal |

---

## 🗂️ Convenciones a mantener

- **Alts**: nunca poner alt genérico ("imagen", "foto"). Siempre describir + sumar 1-2 keywords contextuales.
- **Titles** (cuando agreguemos más páginas): keyword principal al inicio, marca al final.
- **URLs**: kebab-case, descriptivas (`/eventos/team-building` no `/event/123`).
- **JSON-LD**: validar con el rich results test ante cualquier cambio.
- **`llms.txt`**: actualizar cuando cambien precios, horarios o modalidades.
- **Imágenes nuevas**: nombrarlas semánticamente (`partida-cqb-sabado-9hs.jpg`, no `IMG_4823.jpg`). Convertir a WebP si es posible.
