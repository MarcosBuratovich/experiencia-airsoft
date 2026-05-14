import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_URL,
  WHATSAPP_NUMBER,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/precios`;
const TITLE = "Precios de partidas de airsoft en Buenos Aires";
const DESCRIPTION =
  "Cuánto cuesta jugar airsoft en Experiencia Airsoft (CABA). Alquiler simple $40.000, avanzada con tracer $50.000, BYOP $20.000, recargas, chaleco y socios. Reservas por WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/precios" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "website",
    locale: "es_AR",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Partida de airsoft CQB indoor",
  provider: { "@id": `${SITE_URL}/#business` },
  areaServed: { "@type": "City", name: "Buenos Aires" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Precios Experiencia Airsoft",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Alquiler de marcadora simple",
        description:
          "Marcadora estándar + protección básica + entrada a la partida.",
        price: "40000",
        priceCurrency: "ARS",
      },
      {
        "@type": "Offer",
        name: "Alquiler de marcadora avanzada",
        description:
          "Marcadora con trazador + bbs tracer + protección + entrada a la partida.",
        price: "50000",
        priceCurrency: "ARS",
      },
      {
        "@type": "Offer",
        name: "Entrada BYOP",
        description: "Jugador con equipo propio. Solo entrada a la partida.",
        price: "20000",
        priceCurrency: "ARS",
      },
      {
        "@type": "Offer",
        name: "Chaleco táctico",
        description: "Protección extra opcional, se suma al alquiler.",
        price: "10000",
        priceCurrency: "ARS",
      },
      {
        "@type": "Offer",
        name: "Recarga 100 bbs tracer",
        price: "3000",
        priceCurrency: "ARS",
      },
      {
        "@type": "Offer",
        name: "Recarga 200 bbs convencional",
        price: "3000",
        priceCurrency: "ARS",
      },
      {
        "@type": "Offer",
        name: "Recarga 400 bbs convencional",
        price: "6000",
        priceCurrency: "ARS",
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cuánto cuesta una partida de airsoft en Buenos Aires?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Si alquilás marcadora simple sale $40.000 e incluye entrada + protección básica. La marcadora avanzada con tracer sale $50.000. Si traés tu propio equipo (BYOP), la entrada es $20.000. Las recargas de munición y el chaleco son opcionales y se suman aparte.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué incluye el precio del alquiler?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Incluye marcadora, protección facial básica, entrada a la partida (briefing + 2-3 horas de juego) y staff supervisando la seguridad. La marcadora avanzada suma trazador y bbs tracer. El chaleco es opcional aparte.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hay que dejar seña?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Quien alquila marcadora deja una seña de $5.000 el día de la partida. Se descuenta del total al pagar.",
      },
    },
    {
      "@type": "Question",
      name: "¿Aceptan transferencia o solo efectivo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aceptamos efectivo y transferencia bancaria.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cómo funciona ser socio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Los socios pagan una cuota mensual y no abonan entrada por partida (sí pagan alquiler si lo eligen). La cuota se abona del día 1 al 8 de cada mes. Hablá con un admin para sumarte.",
      },
    },
  ],
};

function PrecioCard({
  titulo,
  precio,
  descripcion,
  highlight,
}: {
  titulo: string;
  precio: string;
  descripcion: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border ${
        highlight ? "border-orange bg-orange/5" : "border-bone/15 bg-carbon"
      } clip-notch p-6 sm:p-7 flex flex-col`}
    >
      <p className="sect-label mb-2">{titulo}</p>
      <p className="font-display fluid-3xl text-bone mb-3 leading-none">
        ${precio}
      </p>
      <p className="text-ash fluid-sm leading-relaxed">{descripcion}</p>
    </div>
  );
}

function MiniRow({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-bone/10 last:border-b-0">
      <span className="text-ash fluid-base">{label}</span>
      <span className="font-mono text-bone fluid-base whitespace-nowrap">
        {valor}
      </span>
    </div>
  );
}

export default function PreciosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <MarketingHeader activeHref="/precios" />

      <main className="bg-ink text-bone">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-24 relative">
            <p className="sect-label mb-4">[ Precios · operación ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Cuánto cuesta jugar airsoft
              <br />
              <span className="text-orange">en Buenos Aires</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Precios claros, sin sorpresas. Todo lo que necesitás para venir
              está acá: alquiler, recargas, chaleco y la opción BYOP si traés
              tu propio equipo. Las reservas se confirman por WhatsApp.
            </p>
          </div>
        </section>

        {/* PLANES PRINCIPALES */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Tres formas de entrar
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              <PrecioCard
                titulo="Marcadora simple"
                precio="40.000"
                descripcion="Marcadora estándar + protección básica (anteojos) + entrada a la partida. Lo más pedido para quien nunca jugó."
              />
              <PrecioCard
                titulo="Marcadora avanzada"
                precio="50.000"
                descripcion="Marcadora con trazador + 100 bbs tracer incluidas + protección + entrada. Pensado para partidas nocturnas y experiencia más inmersiva."
                highlight
              />
              <PrecioCard
                titulo="BYOP · equipo propio"
                precio="20.000"
                descripcion="Si traés tu propia marcadora, protección y munición. Solo pagás la entrada al campo."
              />
            </div>
            <p className="mt-6 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              * Quien alquila deja $5.000 de seña el día de la partida — se
              descuenta del total.
            </p>
          </div>
        </section>

        {/* EXTRAS */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="sect-title fluid-2xl mb-2 text-bone">Recargas</h2>
              <p className="text-ash fluid-sm mb-6 leading-relaxed max-w-[40ch]">
                Bbs adicionales para cuando te quedes sin munición en plena
                partida. Las marca el staff cuando las pedís y se cobran al
                final.
              </p>
              <div className="border border-bone/15 bg-carbon clip-notch p-5">
                <MiniRow label="100 bbs tracer" valor="$3.000" />
                <MiniRow label="200 bbs convencional" valor="$3.000" />
                <MiniRow label="400 bbs convencional" valor="$6.000" />
              </div>
            </div>

            <div>
              <h2 className="sect-title fluid-2xl mb-2 text-bone">Extras</h2>
              <p className="text-ash fluid-sm mb-6 leading-relaxed max-w-[40ch]">
                Opciones para sumar protección o personalizar la experiencia.
              </p>
              <div className="border border-bone/15 bg-carbon clip-notch p-5">
                <MiniRow label="Chaleco táctico" valor="$10.000" />
                <MiniRow
                  label="Cuota socio · mensual"
                  valor="consultar"
                />
              </div>
              <p className="mt-4 font-mono fluid-xs text-smoke uppercase tracking-[.18em]">
                Los socios no pagan entrada y tienen tarifa preferencial.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ FAQ · precios ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Preguntas frecuentes
            </h2>
            <dl className="space-y-7">
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Por qué hay distintos precios de marcadora?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  La simple es ideal para quien recién empieza — pesa menos,
                  responde rápido y es fácil de usar. La avanzada suma trazador
                  (las bbs se iluminan con luz UV) y munición especial: ves los
                  proyectiles en el aire, da otra dimensión al juego, sobre
                  todo de noche.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Cuánto dura una partida?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Entre 2 y 3 horas con la dinámica completa: briefing de
                  seguridad, calibración del equipo, 5-6 misiones distintas y
                  debrief. No es "jugar 30 minutos y se acabó".
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Tengo que comprar las recargas al anotarme?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  No. Te anotás con el alquiler base y, si en medio de la
                  partida necesitás más munición, el staff te la entrega en el
                  momento. Se suman al monto a cobrar al final.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Hacen factura?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Sí. Para eventos corporativos y empresas tenemos facturación
                  A y B. Coordiná por WhatsApp antes de la fecha.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="relative">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 text-center">
            <h2 className="font-display uppercase fluid-4xl text-bone leading-[.95] mb-6">
              ¿Listo para anotarte?
            </h2>
            <p className="text-ash fluid-md mb-8 max-w-[50ch] mx-auto leading-relaxed">
              Las reservas se confirman 100% por WhatsApp. Trabajamos siempre
              con reserva previa.
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
              <Link href="/buenos-aires" className="hover:text-bone transition">
                Cómo llegar →
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
