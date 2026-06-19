import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/eventos-corporativos`;
const TITLE = "Eventos corporativos de airsoft";
const DESCRIPTION =
  "Organizamos eventos corporativos y team building con airsoft indoor en CABA. Grupos de 10 a 40 personas, equipo incluido, facturación A/B, fotos profesionales opcionales. Reservas por WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/eventos-corporativos" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    // card grande; title/description se derivan del title/description
    // de esta misma página (no del layout root).
    card: "summary_large_image",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Team building corporativo con airsoft",
  name: "Eventos corporativos · Experiencia Airsoft",
  description:
    "Jornadas de team building con airsoft CQB indoor para empresas. Grupos de 10 a 40 personas, todo el equipo incluido, briefing inicial, partidas guiadas y fotos profesionales opcionales.",
  provider: { "@id": `${SITE_URL}/#organization` },
  areaServed: { "@type": "City", name: "Buenos Aires" },
  audience: {
    "@type": "BusinessAudience",
    name: "Empresas, startups, agencias y equipos de trabajo",
  },
  offers: {
    "@type": "Offer",
    priceCurrency: "ARS",
    availability: "https://schema.org/InStock",
    url: PAGE_URL,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Modalidades de evento corporativo",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Half-day · 3 horas",
        description:
          "Bloque de 3 horas: briefing, 2-3 misiones tácticas, debrief. Hasta 24 personas.",
      },
      {
        "@type": "Offer",
        name: "Full-day · 6 horas",
        description:
          "Jornada completa con almuerzo opcional, hasta 6 misiones distintas, fotografía profesional. Hasta 40 personas.",
      },
      {
        "@type": "Offer",
        name: "Partida exclusiva privada",
        description:
          "Reservás el campo completo solo para tu equipo, sin compartir con otros grupos.",
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
      name: "¿Hacen team building con airsoft para empresas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Organizamos jornadas de team building con airsoft indoor para empresas, agencias y startups en Buenos Aires. Recibimos grupos desde 10 hasta 40 personas, con todo el equipo incluido, briefing táctico y staff dedicado.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hacen factura A?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí, facturamos A y B para empresas. Pedimos los datos fiscales por WhatsApp y la enviamos por mail después del evento.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuántas personas entran en un evento corporativo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El campo recibe cómodamente grupos de 10 a 40 personas. Para grupos más grandes podemos organizar partidas escalonadas en distintos turnos del día.",
      },
    },
    {
      "@type": "Question",
      name: "¿Necesitan experiencia previa los empleados?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. La mayoría de las personas que vienen a un team building corporativo nunca jugó airsoft. El briefing inicial cubre todo lo necesario y el staff supervisa la seguridad durante la jornada.",
      },
    },
    {
      "@type": "Question",
      name: "¿Sirve para grupos con poco fitness o que no son deportivos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. El airsoft CQB indoor no requiere correr maratones — es estrategia, comunicación y coordinación de equipo. La dinámica permite distintos niveles de intensidad. Es seguro para edades entre 18 y 70 años.",
      },
    },
    {
      "@type": "Question",
      name: "¿Pueden organizar comida o catering?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí, en jornadas full-day coordinamos un servicio de catering externo de confianza. Lo armamos según el menú y la cantidad que necesite tu equipo.",
      },
    },
    {
      "@type": "Question",
      name: "¿Sacan fotos del evento?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tenemos un servicio opcional de fotografía y video profesional durante la jornada. Lo entregamos editado en 5-7 días por WeTransfer.",
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

function ModalidadCard({
  titulo,
  duracion,
  capacidad,
  detalle,
  highlight,
}: {
  titulo: string;
  duracion: string;
  capacidad: string;
  detalle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border ${
        highlight ? "border-orange bg-orange/5" : "border-bone/15 bg-carbon"
      } clip-notch p-6 sm:p-7 flex flex-col gap-3`}
    >
      <p className="sect-label">{titulo}</p>
      <p className="font-display fluid-2xl text-bone leading-none">{duracion}</p>
      <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
        {capacidad}
      </p>
      <p className="text-ash fluid-sm leading-relaxed mt-2">{detalle}</p>
    </div>
  );
}

export default function EventosCorporativosPage() {
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

      <MarketingHeader activeHref="/eventos-corporativos" />

      <main className="bg-ink text-bone">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-24 relative">
            <p className="sect-label mb-4">[ Empresas · team building ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Eventos corporativos
              <br />
              <span className="text-orange">con airsoft en Buenos Aires</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Sacá a tu equipo de la oficina y metelos en una dinámica táctica
              real. Comunicación bajo presión, decisiones rápidas y trabajo en
              equipo — sin necesidad de ser deportistas. Organizamos jornadas
              completas para empresas en CABA.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="btn-wa inline-flex items-center gap-2 px-6 py-3 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
              >
                Cotizar evento por WhatsApp
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
              Más que jugar — desarrollo de equipo real
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              <FeatureCard
                numero="01"
                titulo="Comunicación bajo presión"
                descripcion="No hay manera de ganar una partida sin hablar con tu equipo. Las decisiones se toman en segundos, los líderes emergen solos."
              />
              <FeatureCard
                numero="02"
                titulo="Cero barrera de entrada"
                descripcion="No hace falta experiencia ni estar en forma. El briefing inicial cubre todo, el equipo y la protección los pone Experiencia Airsoft."
              />
              <FeatureCard
                numero="03"
                titulo="Indoor — todo el año"
                descripcion="Llueva o haga 38°, el campo es cubierto. No dependés del clima para cerrar la fecha del evento."
              />
              <FeatureCard
                numero="04"
                titulo="Ambientación cinematográfica"
                descripcion="No es un galpón con paredes pintadas. El campo está construido con set design real: pasillos, puertas, ventanas, niveles de altura."
              />
              <FeatureCard
                numero="05"
                titulo="Facturación A o B"
                descripcion="Para empresas que necesitan facturación corporativa. Tu contadora puede pasarlo como capacitación o gasto de bienestar."
              />
              <FeatureCard
                numero="06"
                titulo="Memorable de verdad"
                descripcion="Las fotos y videos circulan en los chats de Slack durante semanas. Es un evento que el equipo va a referenciar después."
              />
            </div>
          </div>
        </section>

        {/* MODALIDADES */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Modalidades ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Tres formatos de jornada
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              <ModalidadCard
                titulo="Half-day"
                duracion="3 horas"
                capacidad="Hasta 24 personas"
                detalle="Briefing + 2-3 misiones tácticas + debrief. Ideal para after office o cierre de semana de trabajo."
              />
              <ModalidadCard
                titulo="Full-day"
                duracion="6 horas"
                capacidad="Hasta 40 personas"
                detalle="Jornada completa con almuerzo opcional, 5-6 misiones distintas, fotografía profesional incluida."
                highlight
              />
              <ModalidadCard
                titulo="Exclusiva privada"
                duracion="Coordinable"
                capacidad="Tu equipo solo"
                detalle="Reservás el campo entero para tu empresa, sin compartir con otros grupos. Ideal para off-sites."
              />
            </div>
            <p className="mt-6 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              Los precios varían según cantidad de personas, día y servicios
              adicionales. Cotizamos por WhatsApp con respuesta el mismo día.
            </p>
          </div>
        </section>

        {/* COMO ARMAMOS EL EVENTO */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Proceso ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Cómo armamos tu evento
            </h2>
            <ol className="space-y-6">
              <li className="border-l-2 border-orange pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-orange mb-2">
                  Paso 01
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  Reservás el slot online
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Entrás a la app, elegís día y horario libre del calendario
                  de privadas. Para eventos corporativos necesitás un grupo
                  de{" "}
                  <span className="text-bone">10 personas o más</span>. Al
                  confirmar te abrimos WhatsApp con un mensaje listo —
                  empezás el diálogo con todos los datos.
                </p>
              </li>
              <li className="border-l-2 border-bone/30 pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke mb-2">
                  Paso 02
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  Cerramos cotización y factura por WhatsApp
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Vemos half-day o full-day, datos fiscales para factura A/B,
                  catering. Anticipo del 30% para confirmar y el saldo se
                  abona al final del evento. El slot queda bloqueado mientras
                  coordinamos.
                </p>
              </li>
              <li className="border-l-2 border-bone/30 pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke mb-2">
                  Paso 03
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  Coordinamos detalles 7 días antes
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Confirmamos cantidad final, alergias o limitaciones físicas,
                  catering si va, hora de llegada y de cierre. Te mandamos
                  un mensaje con instrucciones para tu equipo.
                </p>
              </li>
              <li className="border-l-2 border-bone/30 pl-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke mb-2">
                  Paso 04
                </p>
                <h3 className="font-display fluid-lg uppercase text-bone mb-2">
                  El día del evento, nos encargamos de todo
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Tu equipo llega y nosotros nos ocupamos: registración,
                  briefing, equipamiento, partidas, agua, debrief. Vos disfrutás
                  con tu equipo.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* INCLUYE */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14 grid md:grid-cols-2 gap-10">
            <div>
              <p className="sect-label mb-3">[ Qué incluye ]</p>
              <h2 className="sect-title fluid-2xl mb-6 text-bone">
                Todo incluido en la cotización
              </h2>
              <ul className="space-y-3 text-ash fluid-base leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-orange shrink-0">●</span>
                  Marcadora + munición para cada participante
                </li>
                <li className="flex gap-3">
                  <span className="text-orange shrink-0">●</span>
                  Protección facial reglamentaria
                </li>
                <li className="flex gap-3">
                  <span className="text-orange shrink-0">●</span>
                  Staff táctico que arbitra y supervisa seguridad
                </li>
                <li className="flex gap-3">
                  <span className="text-orange shrink-0">●</span>
                  Briefing inicial + debrief de cierre
                </li>
                <li className="flex gap-3">
                  <span className="text-orange shrink-0">●</span>
                  Agua y vestuarios
                </li>
              </ul>
            </div>

            <div>
              <p className="sect-label mb-3">[ Opcional ]</p>
              <h2 className="sect-title fluid-2xl mb-6 text-bone">
                Adicionales que podés sumar
              </h2>
              <ul className="space-y-3 text-ash fluid-base leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-bone/50 shrink-0">+</span>
                  Fotografía y video profesional editado
                </li>
                <li className="flex gap-3">
                  <span className="text-bone/50 shrink-0">+</span>
                  Catering / almuerzo coordinado con proveedor
                </li>
                <li className="flex gap-3">
                  <span className="text-bone/50 shrink-0">+</span>
                  Chalecos tácticos profesionales
                </li>
                <li className="flex gap-3">
                  <span className="text-bone/50 shrink-0">+</span>
                  Marcadoras avanzadas con trazador
                </li>
                <li className="flex gap-3">
                  <span className="text-bone/50 shrink-0">+</span>
                  Branding del evento (banner con tu logo)
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ FAQ · empresas ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Preguntas frecuentes
            </h2>
            <dl className="space-y-7">
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Cuánto cuesta el evento corporativo?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Varía según cantidad de personas, modalidad (half/full day),
                  si querés exclusividad y los adicionales. La forma más rápida
                  es mandarnos un WhatsApp con la info básica y te pasamos un
                  presupuesto detallado el mismo día.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Cuánto tiempo de aviso necesitan?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Ideal 2-3 semanas antes para asegurar el día que necesitás,
                  sobre todo viernes y sábados. Para grupos chicos a veces
                  podemos resolver en 5-7 días.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Y si llueve o hay tormenta?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  No afecta — el campo es indoor cubierto. Es uno de los
                  motivos por los que las empresas eligen airsoft sobre otras
                  actividades outdoor en Buenos Aires.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Cuál es la edad mínima?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  18 años. Pedimos DNI a todos los participantes el día del
                  evento.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="relative">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 text-center">
            <h2 className="font-display uppercase fluid-4xl text-bone leading-[.95] mb-6">
              Pedinos la propuesta para tu equipo
            </h2>
            <p className="text-ash fluid-md mb-8 max-w-[55ch] mx-auto leading-relaxed">
              Te respondemos el mismo día con presupuesto, fechas disponibles y
              cualquier detalle que quieras coordinar.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-wa inline-flex items-center gap-3 px-7 py-4 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
            >
              Cotizar por WhatsApp
              <span aria-hidden>→</span>
            </a>
            <p className="mt-5 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              {WHATSAPP_NUMBER}
            </p>
            <div className="mt-10 flex items-center justify-center flex-wrap gap-x-6 gap-y-3 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              <Link href="/precios" className="hover:text-bone transition">
                Ver precios →
              </Link>
              <Link href="/cumpleanos" className="hover:text-bone transition">
                Cumpleaños →
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
