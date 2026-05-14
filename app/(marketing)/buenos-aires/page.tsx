import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  ADDRESS_CITY,
  ADDRESS_COUNTRY,
  ADDRESS_POSTAL,
  ADDRESS_STREET,
  MAPS_URL,
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/buenos-aires`;
const TITLE = "Airsoft en Buenos Aires — Experiencia Airsoft CABA";
const DESCRIPTION =
  "Centro de airsoft CQB indoor en Buenos Aires. Gral. Conesa 1858, CABA. Partidas martes a domingo, equipo de alquiler incluido, máximo 330 FPS. Cómo llegar, horarios y reservas.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/buenos-aires" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "website",
    locale: "es_AR",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "@id": `${SITE_URL}/#business`,
  name: "Experiencia Airsoft",
  url: SITE_URL,
  telephone: "+541138689783",
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS_STREET,
    addressLocality: ADDRESS_CITY,
    postalCode: ADDRESS_POSTAL,
    addressRegion: "CABA",
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -34.5594,
    longitude: -58.4634,
  },
  hasMap: MAPS_URL,
  areaServed: [
    { "@type": "City", name: "Buenos Aires" },
    { "@type": "City", name: "Ciudad Autónoma de Buenos Aires" },
    { "@type": "AdministrativeArea", name: "AMBA" },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Dónde queda Experiencia Airsoft en Buenos Aires?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "En Gral. Conesa 1858, C1870, Ciudad Autónoma de Buenos Aires. Estamos en un predio cerrado preparado específicamente para airsoft CQB indoor.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cómo llego al campo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Si venís en auto hay estacionamiento en la zona. En transporte público te conviene combinar colectivos hacia la zona. Mandanos un mensaje por WhatsApp y te pasamos la mejor combinación según desde dónde salgas.",
      },
    },
    {
      "@type": "Question",
      name: "¿Atienden a jugadores de Gran Buenos Aires o solo CABA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Recibimos jugadores de toda el AMBA, La Plata, Zona Norte, Oeste y Sur. Tenemos clientes que vienen regularmente desde el Gran Buenos Aires.",
      },
    },
    {
      "@type": "Question",
      name: "¿Tienen partidas en otras zonas de Argentina?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Operamos exclusivamente en CABA. Si organizás un viaje de grupo desde el interior, coordiná con anticipación por WhatsApp.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hay otros centros de airsoft CQB indoor en Buenos Aires?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Somos el centro de airsoft CQB indoor más profesional de la Ciudad: múltiples niveles, zonas diferenciadas, equipamiento incluido y staff capacitado en seguridad. La oferta de CQB indoor en BA es limitada y nosotros nos diferenciamos por la inmersión y la experiencia operativa.",
      },
    },
  ],
};

export default function BuenosAiresPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <MarketingHeader activeHref="/buenos-aires" />

      <main className="bg-ink text-bone">
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-24 relative">
            <p className="sect-label mb-4">[ Ubicación · CABA ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Airsoft CQB indoor
              <br />
              <span className="text-orange">en Buenos Aires</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Estamos en el corazón de la Ciudad Autónoma de Buenos Aires, en
              un predio diseñado específicamente para CQB · cuarto cerrado.
              Múltiples niveles, zonas diferenciadas, escenarios variables y
              todas las normas de seguridad bajo control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener"
                className="btn-wa inline-flex items-center gap-3 px-5 py-3 clip-tag uppercase tracking-wider font-semibold text-ink fluid-xs"
              >
                Cómo llegar (Maps)
                <span aria-hidden>→</span>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="btn-ghost inline-flex items-center gap-3 px-5 py-3 clip-tag uppercase tracking-wider fluid-xs"
              >
                Reservar
              </a>
            </div>
          </div>
        </section>

        {/* DIRECCIÓN */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="sect-title fluid-2xl mb-6 text-bone">Dirección</h2>
              <address className="not-italic space-y-3 font-mono fluid-sm uppercase tracking-[.18em] text-ash">
                <p className="text-bone fluid-xl tracking-normal normal-case font-sans">
                  {ADDRESS_STREET}
                </p>
                <p>
                  {ADDRESS_POSTAL} · {ADDRESS_CITY}
                </p>
                <p>{ADDRESS_COUNTRY}</p>
                <p className="pt-2">
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener"
                    className="text-orange hover:underline tracking-[.22em]"
                  >
                    Abrir en Google Maps →
                  </a>
                </p>
              </address>
            </div>

            <div>
              <h2 className="sect-title fluid-2xl mb-6 text-bone">Horarios</h2>
              <dl className="border border-bone/15 bg-carbon clip-notch divide-y divide-bone/10">
                <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                  <dt className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                    Martes a viernes
                  </dt>
                  <dd className="font-display fluid-lg text-bone">
                    19:00 — 23:00
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                  <dt className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                    Sábados y domingos
                  </dt>
                  <dd className="font-display fluid-lg text-bone">
                    09:00 — 13:00
                  </dd>
                </div>
              </dl>
              <p className="mt-4 font-mono fluid-xs text-smoke uppercase tracking-[.18em]">
                Reservas privadas se coordinan fuera de estos horarios por
                WhatsApp.
              </p>
            </div>
          </div>
        </section>

        {/* CÓMO LLEGAR */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Logística · cómo llegar ]</p>
            <h2 className="sect-title fluid-3xl mb-8 text-bone">
              Cómo llegar al campo
            </h2>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="border border-bone/15 bg-carbon clip-notch p-6">
                <p className="font-display fluid-xl uppercase text-orange mb-3">
                  En auto
                </p>
                <p className="text-ash fluid-sm leading-relaxed">
                  Estacionamiento disponible en la zona. Ingresá por Gral. Conesa
                  1858. La cuadra está en una zona tranquila, sin restricciones
                  de circulación.
                </p>
              </div>
              <div className="border border-bone/15 bg-carbon clip-notch p-6">
                <p className="font-display fluid-xl uppercase text-orange mb-3">
                  En transporte público
                </p>
                <p className="text-ash fluid-sm leading-relaxed">
                  Varias líneas de colectivo llegan a pocas cuadras. Si nos
                  decís desde dónde salís te pasamos la mejor combinación por
                  WhatsApp.
                </p>
              </div>
              <div className="border border-bone/15 bg-carbon clip-notch p-6">
                <p className="font-display fluid-xl uppercase text-orange mb-3">
                  Desde GBA / AMBA
                </p>
                <p className="text-ash fluid-sm leading-relaxed">
                  Recibimos jugadores de todo el AMBA: Zona Norte, Oeste, Sur y
                  La Plata. La mayoría viaja en grupo y combina transporte
                  hasta CABA.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ FAQ · ubicación ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Preguntas frecuentes
            </h2>
            <dl className="space-y-7">
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Atienden todos los días?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Tenemos partidas regulares de martes a domingo en horarios
                  fijos (martes a viernes 19-23, sábados y domingos 9-13). Los
                  lunes son día libre. Privadas fuera de esos horarios se
                  coordinan por WhatsApp.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Es seguro ir solo por la noche?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  La zona del local es tranquila. De todas formas si venís en
                  partida nocturna te recomendamos coordinar volver en grupo
                  con otros jugadores o usar transporte privado.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Tienen sucursal en provincia o en otras ciudades?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  No. Operamos un único predio en CABA. Eso nos permite
                  enfocar todo el cuidado en una sola sede y mantener la
                  calidad de los escenarios.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 text-center">
            <h2 className="font-display uppercase fluid-4xl text-bone leading-[.95] mb-6">
              ¿Ya sabés cuándo venís?
            </h2>
            <p className="text-ash fluid-md mb-8 max-w-[50ch] mx-auto leading-relaxed">
              Reservás por WhatsApp y te confirmamos el día y horario. Cero
              vueltas, cero línea de espera.
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
            <p className="mt-5 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              {WHATSAPP_NUMBER}
            </p>
            <div className="mt-10 flex items-center justify-center gap-6 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              <Link href="/precios" className="hover:text-bone transition">
                Ver precios →
              </Link>
              <Link href="/primera-vez" className="hover:text-bone transition">
                Es mi primera vez →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
