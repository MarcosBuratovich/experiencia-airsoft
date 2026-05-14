import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/primera-vez`;
const TITLE = "Primera vez jugando airsoft — Guía para principiantes";
const DESCRIPTION =
  "Todo lo que tenés que saber antes de tu primera partida de airsoft en Buenos Aires. Qué llevar, qué esperar, normas de seguridad y cómo reservar. Pensado para quien nunca jugó.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/primera-vez" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "article",
    locale: "es_AR",
  },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Cómo prepararte para tu primera partida de airsoft",
  description:
    "Guía paso a paso para llegar al campo de Experiencia Airsoft, equiparte y jugar tu primera partida sin haber jugado nunca.",
  totalTime: "PT3H",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Reservá tu lugar por WhatsApp",
      text: "Mandá un mensaje al +54 9 11 3868-9783 con el día y horario que querés jugar. Te confirmamos cupo y precio.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Llegá 15 minutos antes",
      text: "Vení a Gral. Conesa 1858, CABA. Te esperamos 15 minutos antes del horario para hacer el papeleo, ajustar equipo y empezar a tiempo.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Briefing de seguridad",
      text: "Antes de jugar te explicamos todas las reglas: zonas seguras, cómo se sabe que estás eliminado, cuándo se grita 'hit' y todo el resto. Es la parte que más importa.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Jugá las misiones",
      text: "Vas a jugar 5-6 escenarios distintos a lo largo de 2-3 horas. El staff coordina cada misión y arbitra. Vas mejorando partida a partida.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Pagás al final y volvés",
      text: "Después de jugar pagás el total (efectivo o transferencia). Si alquilaste, te devuelven la seña. La próxima vez ya sos veterano.",
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Hace falta saber algo antes de venir?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nada. Recibimos jugadores que nunca jugaron en su vida. El briefing de seguridad y las primeras misiones están pensadas para que aprendas mientras jugás. La mitad de la gente que viene un sábado es primera vez.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué ropa me pongo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Algo cómodo y que no te importe ensuciar: pantalón largo (jean o jogger), calzado deportivo cerrado y una remera de manga larga si querés más cobertura. Evitá ropa demasiado holgada.",
      },
    },
    {
      "@type": "Question",
      name: "¿Duele cuando te dan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Se siente, no te vamos a mentir. Es como un pellizco rápido. Pero trabajamos con 330 FPS máximos (la categoría más baja permitida) justamente para que sea controlado. Con el chaleco y ropa larga lo notás menos. La mayoría dice 'menos de lo que pensaba'.",
      },
    },
    {
      "@type": "Question",
      name: "¿Es peligroso?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Si seguís las normas, no. Es uno de los deportes recreativos más seguros del país: protección facial obligatoria, potencia limitada, staff arbitrando todo el tiempo y zonas seguras claramente marcadas. Nunca tuvimos accidentes serios.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo ir solo si no conozco a nadie?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. En las partidas públicas armamos equipos en el momento. La mitad de la gente viene sola y se va con WhatsApps nuevos. Es deporte de equipo: en 5 minutos ya estás coordinando estrategias con desconocidos.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué edad mínima?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "18 años cumplidos con DNI en mano al ingresar. No hacemos excepciones — es por seguros y normativa.",
      },
    },
  ],
};

function StepCard({
  num,
  titulo,
  body,
}: {
  num: string;
  titulo: string;
  body: string;
}) {
  return (
    <article className="border border-bone/15 bg-carbon clip-notch p-6 sm:p-7 flex gap-5">
      <span
        className="font-display fluid-5xl text-orange shrink-0 leading-none"
        aria-hidden
      >
        {num}
      </span>
      <div>
        <h3 className="font-display fluid-xl uppercase text-bone tracking-wide mb-2">
          {titulo}
        </h3>
        <p className="text-ash fluid-base leading-relaxed">{body}</p>
      </div>
    </article>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="text-orange shrink-0 mt-1" aria-hidden>
        ✓
      </span>
      <span className="text-ash fluid-base">{children}</span>
    </li>
  );
}

export default function PrimeraVezPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <MarketingHeader activeHref="/primera-vez" />

      <main className="bg-ink text-bone">
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-24 relative">
            <p className="sect-label mb-4">[ Primera vez · briefing ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Tu primera partida
              <br />
              <span className="text-orange">de airsoft</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Nunca jugaste, no tenés equipo, no conocés a nadie y querés
              venir. Es la situación más común. Te contamos exactamente cómo
              funciona, qué llevar y qué esperar.
            </p>
          </div>
        </section>

        {/* QUÉ ES */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Contexto ]</p>
            <h2 className="sect-title fluid-2xl mb-6 text-bone">
              ¿Qué es el airsoft (en serio)?
            </h2>
            <p className="text-ash fluid-md leading-relaxed mb-4">
              Es un deporte recreativo donde dos equipos juegan misiones en un
              predio cerrado, marcadores que disparan bolitas de plástico
              biodegradable de 6mm (las famosas "bbs"). No usás balas reales,
              no hay armas funcionales — son réplicas con sistema de aire
              comprimido limitadas a baja potencia (330 FPS máximo en
              nuestro caso, la categoría más baja).
            </p>
            <p className="text-ash fluid-md leading-relaxed mb-4">
              La gracia es la <strong className="text-bone">táctica</strong>:
              moverse en grupo, cubrirse, coordinarse, lograr objetivos. No es
              "matar a todos lo más rápido posible". Es planificar, comunicar y
              ejecutar.
            </p>
            <p className="text-ash fluid-md leading-relaxed">
              CQB (close-quarters-battle) es nuestra especialidad: combate en
              espacios cerrados, distancias cortas, múltiples niveles. Es la
              modalidad más cinematográfica del airsoft.
            </p>
          </div>
        </section>

        {/* QUÉ LLEVAR */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14 grid md:grid-cols-2 gap-10">
            <div>
              <p className="sect-label mb-3">[ Checklist ]</p>
              <h2 className="sect-title fluid-2xl mb-6 text-bone">
                Qué llevar
              </h2>
              <ul className="space-y-3">
                <CheckItem>
                  <strong className="text-bone">DNI</strong> — obligatorio para
                  entrar (somos +18).
                </CheckItem>
                <CheckItem>
                  Ropa larga y cómoda (jean o jogger + remera manga larga).
                </CheckItem>
                <CheckItem>
                  Zapatillas cerradas. Nada de sandalias ni Crocs.
                </CheckItem>
                <CheckItem>
                  Agua o algo para hidratarte.
                </CheckItem>
                <CheckItem>
                  Plata o medio de pago. Aceptamos efectivo y transferencia.
                </CheckItem>
                <CheckItem>Ganas de mancharte un poco. Es indoor pero
                  igual te transpirás.
                </CheckItem>
              </ul>
            </div>

            <div>
              <p className="sect-label mb-3">[ No hace falta traer ]</p>
              <h2 className="sect-title fluid-2xl mb-6 text-bone">
                Qué NO necesitás
              </h2>
              <ul className="space-y-3">
                <CheckItem>
                  Marcadora — la alquilás acá ($40k simple, $50k avanzada).
                </CheckItem>
                <CheckItem>
                  Anteojos de protección — vienen incluidos en el alquiler.
                </CheckItem>
                <CheckItem>
                  Munición — viene incluida; si necesitás más, recargás en el
                  momento.
                </CheckItem>
                <CheckItem>
                  Camuflado o ropa táctica — está bueno pero no obligatorio.
                </CheckItem>
                <CheckItem>
                  Experiencia previa — todo se explica en el briefing.
                </CheckItem>
              </ul>
            </div>
          </div>
        </section>

        {/* PASO A PASO */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Operación · paso a paso ]</p>
            <h2 className="sect-title fluid-3xl mb-8 text-bone">
              Cómo es tu día
            </h2>

            <div className="grid gap-4">
              <StepCard
                num="01"
                titulo="Reservás por WhatsApp"
                body="Mandás mensaje, te confirmamos cupo, día y horario. No se acepta cuenta del momento — siempre con reserva previa."
              />
              <StepCard
                num="02"
                titulo="Llegás 15 minutos antes"
                body="Te recibimos, hacés papeleo rápido (DNI, ficha de firma de seguridad), te asignan equipo si alquilás y dejás tus cosas en la zona segura."
              />
              <StepCard
                num="03"
                titulo="Briefing de seguridad"
                body="20 minutos donde el staff te explica todo: cómo se usa la marcadora, las normas (cuándo gritar 'hit', dónde está la zona segura, qué pasa si te dan), las modalidades del día y los equipos."
              />
              <StepCard
                num="04"
                titulo="A jugar"
                body="5-6 misiones a lo largo de 2-3 horas. Vas a probar distintos formatos: Team Deathmatch, Search & Destroy, Captura la bandera, Dominación. El staff arbitra todo."
              />
              <StepCard
                num="05"
                titulo="Cierre"
                body="Después del último round se hace un debrief, devolvés el equipo, pagás (efectivo o transfer) y se descuenta la seña. La mayoría se queda charlando un rato — la comunidad es buena."
              />
            </div>
          </div>
        </section>

        {/* SEGURIDAD */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Seguridad · serio ]</p>
            <h2 className="sect-title fluid-2xl mb-6 text-bone">
              Reglas que no se rompen
            </h2>
            <ul className="space-y-3">
              <CheckItem>
                <strong className="text-bone">Protección facial siempre puesta</strong>{" "}
                dentro de la zona de juego. No se levanta nunca, ni para tomar
                agua. Hay una zona segura específica para eso.
              </CheckItem>
              <CheckItem>
                <strong className="text-bone">Si te dan, gritás "hit"</strong>{" "}
                fuerte para que todos te escuchen y levantás la mano. Volvés a
                la zona de respawn caminando, no corriendo.
              </CheckItem>
              <CheckItem>
                <strong className="text-bone">Cero contacto físico.</strong> No
                se empuja, no se agarra. Es deporte táctico, no contacto.
              </CheckItem>
              <CheckItem>
                <strong className="text-bone">Cero alcohol o drogas</strong>{" "}
                antes o durante. Quien viene en ese estado no juega.
              </CheckItem>
              <CheckItem>
                <strong className="text-bone">Marcadora en seguro</strong>{" "}
                cuando no estás jugando o estás en zona segura.
              </CheckItem>
            </ul>
            <p className="mt-6 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              El staff arbitra todas las reglas. Si alguien las rompe, se va.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ FAQ · primerizos ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Lo que todos preguntan
            </h2>
            <dl className="space-y-7">
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Duele cuando te dan?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Se siente. Es como un pellizco rápido. Pero trabajamos con
                  330 FPS máximos (la categoría más baja permitida) justamente
                  para que sea controlado. Con chaleco y ropa larga lo notás
                  menos. La mayoría dice "menos de lo que pensaba".
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Puedo ir solo si no conozco a nadie?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Sí. En las partidas públicas armamos equipos en el momento.
                  La mitad de la gente viene sola. En 5 minutos ya estás
                  coordinando estrategias con desconocidos.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  Soy zurdo / uso anteojos / soy bajito / nunca hice deporte
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  No importa. Recibimos jugadores de toda forma y edad
                  (siempre mayores de 18). El equipo se adapta. La técnica
                  pesa más que la condición física.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Y si no me gusta o me asusto?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Si en algún momento querés parar, te vas a la zona segura y
                  el staff te acompaña. Nadie te obliga a nada. Pero pasa muy
                  rara vez — el formato es muy progresivo.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Para grupos de cumpleaños o despedidas?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Sí, mucho. Coordinás por WhatsApp con anticipación. Si son
                  10+ personas armamos partida privada solo para ustedes.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 text-center">
            <h2 className="font-display uppercase fluid-4xl text-bone leading-[.95] mb-6">
              Ya sabés todo
            </h2>
            <p className="text-ash fluid-md mb-8 max-w-[50ch] mx-auto leading-relaxed">
              No hay mucho más que prepararte. Reservás por WhatsApp y venís.
              Te ocupás del resto cuando llegues.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-wa inline-flex items-center gap-3 px-7 py-4 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
            >
              Reservar mi primera partida
              <span aria-hidden>→</span>
            </a>
            <p className="mt-5 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              {WHATSAPP_NUMBER}
            </p>
            <div className="mt-10 flex items-center justify-center gap-6 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
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
