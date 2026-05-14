import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/cumpleanos`;
const TITLE = "Cumpleaños de airsoft en Buenos Aires (mayores de 18)";
const DESCRIPTION =
  "Festejá tu cumpleaños jugando airsoft indoor en CABA. Grupos de 8 a 25 personas, equipo incluido, partidas temáticas. Reservas por WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/cumpleanos" },
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
  serviceType: "Cumpleaños con airsoft indoor",
  name: "Cumpleaños · Experiencia Airsoft",
  description:
    "Festejos de cumpleaños con airsoft CQB indoor en Buenos Aires. Grupos de 8 a 25 personas, equipo de alquiler incluido, partidas con dinámicas tácticas.",
  provider: { "@id": `${SITE_URL}/#business` },
  areaServed: { "@type": "City", name: "Buenos Aires" },
  audience: {
    "@type": "PeopleAudience",
    suggestedMinAge: 18,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Hacen cumpleaños de airsoft en Buenos Aires?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Recibimos grupos de cumpleaños desde 8 hasta 25 personas, con todo el equipo de alquiler incluido y partidas guiadas por staff. Hay que tener 18 años cumplidos para todos los participantes.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es la edad mínima?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "18 años cumplidos para todos los jugadores. Pedimos DNI el día de la partida. No recibimos menores aunque vayan con un adulto.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuántas personas entran en un cumpleaños?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lo más cómodo es 8 a 16 personas para un bloque de 2 horas. Grupos más grandes los manejamos en bloques separados o reservando el campo en exclusiva.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto sale festejar el cumpleaños?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Se calcula como una partida normal: $40.000 por persona con marcadora simple, $50.000 con avanzada o $20.000 si traen su equipo. Para grupos de más de 12 ofrecemos descuento al cumpleañero. Cotizamos por WhatsApp.",
      },
    },
    {
      "@type": "Question",
      name: "¿Se puede traer torta o picada?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí, pueden traer torta, picada y bebida. Tenemos un espacio para que pongan todo antes y festejen al cierre de la partida. Coordinamos por WhatsApp si necesitan heladera o mesa armada.",
      },
    },
    {
      "@type": "Question",
      name: "¿Sacan fotos del cumpleaños?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tenemos fotografía profesional opcional. La entregamos editada en 5-7 días y la podés compartir con todos los invitados. Pedila al reservar.",
      },
    },
    {
      "@type": "Question",
      name: "¿Conviene cumpleaños de viernes o sábado?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Los viernes a la noche son los más pedidos. Sábados al mediodía o a la tarde también funcionan muy bien. Reservá con 10-15 días de anticipación para asegurar el horario.",
      },
    },
  ],
};

function FeatureCard({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="border border-bone/15 bg-carbon clip-notch p-6 sm:p-7 flex flex-col gap-3">
      <span className="font-mono fluid-xs uppercase tracking-[.22em] text-orange">
        {numero}
      </span>
      <h3 className="font-display fluid-lg uppercase text-bone leading-tight">
        {titulo}
      </h3>
      <p className="text-ash fluid-sm leading-relaxed">{descripcion}</p>
    </div>
  );
}

export default function CumpleanosPage() {
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

      <MarketingHeader activeHref="/cumpleanos" />

      <main className="bg-ink text-bone">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-24 relative">
            <p className="sect-label mb-4">[ Cumpleaños · +18 ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Festejá tu cumpleaños
              <br />
              <span className="text-orange">jugando airsoft</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Un cumpleaños distinto al de siempre — el bar y el boliche pueden
              esperar. Vení con tus amigos a una partida táctica indoor en
              CABA. Equipo incluido, partidas guiadas, espacio para torta y
              previa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="btn-wa inline-flex items-center gap-2 px-6 py-3 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
              >
                Reservar cumpleaños
                <span aria-hidden>→</span>
              </a>
              <span className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                {WHATSAPP_NUMBER}
              </span>
            </div>
          </div>
        </section>

        {/* POR QUE FUNCIONA */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Por qué funciona ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Por qué tu cumpleaños va a ser memorable
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              <FeatureCard
                numero="01"
                titulo="No hay alcohol antes — hay después"
                descripcion="Primero jugás 2 horas tácticas. Después, en el área de relax, sale la torta, la picada y lo que traigan. La previa es la partida."
              />
              <FeatureCard
                numero="02"
                titulo="Todos juegan, sepan o no"
                descripcion="Briefing simple, equipo incluido. Tus amigos que nunca jugaron entran cómodos. Tus amigos que ya jugaron van a disfrutarlo igual."
              />
              <FeatureCard
                numero="03"
                titulo="Foto del grupo que va a durar"
                descripcion="Las fotos con la marcadora, el chaleco y los anteojos quedan increíbles. Y son foto de perfil seguro durante semanas."
              />
              <FeatureCard
                numero="04"
                titulo="Indoor — sin clima"
                descripcion="No te cancela la fecha porque llueva o haga calor. Confirmás el cumpleaños y va sí o sí."
              />
              <FeatureCard
                numero="05"
                titulo="Tenemos servicio de comidas y bebidas"
                descripcion="Disfrutá de nuestras hamburguesas, empanadas, panchos y muchas opciones más. Además, contamos con una gran variedad de bebidas para acompañar cada momento. ¡Todo lo que necesitás en un solo lugar!"
                />
              <FeatureCard
                numero="06"
                titulo="Sin sorpresas en el precio"
                descripcion="Cotizamos por WhatsApp y queda cerrado. Pueden anotarse a recargas opcionales el día si quieren más munición."
              />
            </div>
          </div>
        </section>

        {/* CÓMO ARMAR */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Cómo armarlo ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Tres pasos para tu cumple
            </h2>
            <ol className="space-y-6">
              <li className="border-l-2 border-orange pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-orange mb-2">
                  Paso 01
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  Mandanos un WhatsApp
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Decinos cuántos son, qué día querés, si van a traer torta o
                  necesitan mesa armada. Te respondemos con la cotización el
                  mismo día.
                </p>
              </li>
              <li className="border-l-2 border-bone/30 pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke mb-2">
                  Paso 02
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  Reservás con seña
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Para asegurar el día dejás una seña por transferencia. El
                  saldo se abona el día de la partida según cuántos vinieron.
                </p>
              </li>
              <li className="border-l-2 border-bone/30 pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke mb-2">
                  Paso 03
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  El día, llegan 15 min antes
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Con DNI cada uno. Hacemos el papeleo, ajustamos equipo,
                  briefing y a jugar. Después, cierre con torta + festejo.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ FAQ · cumpleaños ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Preguntas frecuentes
            </h2>
            <dl className="space-y-7">
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Cuántas personas como mínimo?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Lo ideal son 8 personas para que la partida tenga buen ritmo.
                  Menos también, pero las dinámicas son más limitadas. Si son
                  6-7 los sumamos a una partida abierta del día y festejás el
                  cumple al cierre.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Y si invité a 15 y caen 10?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Solo pagás por los que vinieron. La seña se descuenta del
                  total final. Avisanos cuántos confirmaron 24h antes para
                  preparar el equipo correcto.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Hay descuento para el cumpleañero?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Sí. Para grupos de 12 personas o más, el cumpleañero no paga.
                  Es nuestro regalo. Confirmá la cantidad para activar el
                  descuento.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Pueden tomar alcohol antes?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  No. Por seguridad de todos, no se entra a la partida con
                  alcohol. Si alguien aparece visiblemente alcoholizado no
                  juega — pero puede estar en el área social y festejar al
                  cierre.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Necesitamos algo en particular para festejar después?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Pueden traer lo que quieran: torta, picada, gaseosa, vasos
                  descartables. Si necesitan heladera, encendedor, mesa o
                  toma-corriente — coordinamos.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="relative">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 text-center">
            <h2 className="font-display uppercase fluid-4xl text-bone leading-[.95] mb-6">
              ¿Cumplís pronto?
            </h2>
            <p className="text-ash fluid-md mb-8 max-w-[55ch] mx-auto leading-relaxed">
              Mandanos un WhatsApp con la fecha que tenés en mente y armamos el
              festejo.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-wa inline-flex items-center gap-3 px-7 py-4 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
            >
              Reservar cumpleaños
              <span aria-hidden>→</span>
            </a>
            <p className="mt-5 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              {WHATSAPP_NUMBER}
            </p>
            <div className="mt-10 flex items-center justify-center flex-wrap gap-x-6 gap-y-3 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              <Link href="/precios" className="hover:text-bone transition">
                Ver precios →
              </Link>
              <Link
                href="/eventos-corporativos"
                className="hover:text-bone transition"
              >
                Eventos corporativos →
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
