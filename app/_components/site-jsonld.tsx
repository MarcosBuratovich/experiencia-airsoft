import {
  INSTAGRAM_URL,
  SITE_URL,
  YOUTUBE_URL,
} from "./site-constants";

// ──────────────────────────────────────────────────────────────────────
// Entidad de marca CANÓNICA, emitida site-wide desde app/layout.tsx.
//
// Antes, Organization y WebSite vivían SOLO en la home (app/page.tsx), así que
// las subpáginas (precios, eventos, etc.) que referencian estos @id apuntaban a
// nodos ausentes (referencias colgantes que Google no resuelve dentro de la
// página). Acá los emitimos en TODAS las páginas de www.
//
// @id estables, compartidos con los otros hosts (app.* y tienda.*) para que
// Google trate "Experiencia Airsoft" como UNA sola entidad — prerequisito del
// Knowledge Panel y de los sitelinks. El LocalBusiness/#business físico y los
// Event siguen viviendo solo en la home (son específicos de esa página).
//
// NO incluye sitelinks "SearchAction": el Sitelinks Search Box fue deprecado
// por Google (nov-2024) y el anterior apuntaba a /blog?q= que no busca nada.
// ──────────────────────────────────────────────────────────────────────

export const ORG_ID = `${SITE_URL}/#organization`;
export const BUSINESS_ID = `${SITE_URL}/#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

// Teléfono único en formato E.164 (con el "9" de móvil), consistente con
// WHATSAPP_URL (wa.me/5491138689783) y con el JSON-LD de la tienda.
export const TELEPHONE_E164 = "+5491138689783";

// Logo canónico de la marca: MISMA URL en los 3 hosts (la tienda referencia
// este mismo archivo) para que el nodo Organization merge sin conflicto.
export const ORG_LOGO_URL = `${SITE_URL}/img/00_logo_principal.png`;

const organizationJsonLd = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Experiencia Airsoft",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: ORG_LOGO_URL,
    width: 1920,
    height: 1920,
  },
  image: `${SITE_URL}/img/07_zona_fria_hero.jpg`,
  sameAs: [INSTAGRAM_URL, YOUTUBE_URL],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Reservas",
    telephone: TELEPHONE_E164,
    availableLanguage: ["Spanish"],
    contactOption: "WhatsApp",
  },
};

const websiteJsonLd = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: "Experiencia Airsoft",
  alternateName: ["Experiencia Airsoft CABA", "Airsoft CQB Buenos Aires"],
  inLanguage: "es-AR",
  publisher: { "@id": ORG_ID },
};

export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd, websiteJsonLd],
  };
  return (
    <script
      type="application/ld+json"
      // .replace(/</g, "\\u003c") sanitiza contra XSS (doc Next 16 para JSON-LD).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
