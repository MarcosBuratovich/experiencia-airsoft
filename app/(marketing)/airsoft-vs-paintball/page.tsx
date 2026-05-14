import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/airsoft-vs-paintball`;
const TITLE = "Airsoft vs paintball: diferencias, costos y cuál te conviene";
const DESCRIPTION =
  "Comparación honesta entre airsoft y paintball: cuál duele más, cuál es más barato, cuál es más realista. Si dudás entre los dos, este artículo es para vos.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/airsoft-vs-paintball" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "article",
    locale: "es_AR",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: TITLE,
  description: DESCRIPTION,
  mainEntityOfPage: PAGE_URL,
  url: PAGE_URL,
  inLanguage: "es-AR",
  author: {
    "@type": "Organization",
    name: "Experiencia Airsoft",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "Experiencia Airsoft",
    url: SITE_URL,
  },
  datePublished: "2026-05-14",
  dateModified: "2026-05-14",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué duele más, airsoft o paintball?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El paintball duele más por impacto: las bolitas son más grandes (0.68 caliber) y pesadas, y la energía del impacto es mayor. El airsoft suena más y deja más marcas momentáneas (la bbs es chica y rápida) pero el dolor es menor y se va en segundos. Con la ropa adecuada y a 330 FPS, el airsoft es muy tolerable incluso para quien nunca jugó.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es más barato?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Por partida individual, el airsoft suele ser más económico que el paintball. La munición de airsoft es notablemente más barata por tirada, lo que importa porque en una partida típica disparás 200-400 proyectiles. El paintball tiene un costo de munición mucho más alto por bola.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es más realista?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El airsoft, por lejos. Las réplicas son visualmente idénticas a armas reales, el peso es similar, el sonido del disparo es parecido. El paintball tiene marcadoras que no se parecen a ninguna arma real — son tubos coloridos con tolva arriba. Si te atrae la estética táctica y el realismo militar, airsoft es la respuesta clara.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál mancha más?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paintball, sin discusión. Las bolas tienen pintura que se rompe al impactar — te ensucia la ropa y el campo. Después de una partida de paintball tu ropa va a la basura o a un lavado profundo. Airsoft no mancha: las bbs son plástico biodegradable, no dejan rastro. Podés ir y volver con la misma ropa de calle.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál tiene partidas más tácticas?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Airsoft, por la cadencia y precisión de las réplicas. Permite emboscadas reales, fuego de cobertura, comunicación de equipo y dinámicas inspiradas en operaciones militares. Paintball es más arcade — sirve para diversión rápida pero las partidas tácticas largas son difíciles.",
      },
    },
    {
      "@type": "Question",
      name: "¿Pueden jugar adolescentes los dos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Paintball suele aceptar desde 12-14 años. Airsoft requiere mayoría de edad (18+) en Argentina porque las réplicas pueden confundirse con armas reales fuera del campo. Si tu grupo incluye menores, paintball es la única opción.",
      },
    },
  ],
};

function CompareRow({
  feature,
  airsoft,
  paintball,
  winner,
}: {
  feature: string;
  airsoft: string;
  paintball: string;
  winner: "airsoft" | "paintball" | "empate";
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-5 py-5 border-b border-bone/10 last:border-b-0">
      <p className="md:col-span-2 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
        {feature}
      </p>
      <div
        className={`md:col-span-2 ${
          winner === "airsoft"
            ? "text-bone"
            : winner === "paintball"
              ? "text-ash"
              : "text-bone"
        }`}
      >
        <p className="text-orange font-mono fluid-xs uppercase tracking-[.22em] mb-1">
          Airsoft{" "}
          {winner === "airsoft" ? (
            <span className="text-orange">★</span>
          ) : null}
        </p>
        <p className="fluid-sm leading-relaxed">{airsoft}</p>
      </div>
      <div
        className={`md:col-span-2 ${
          winner === "paintball" ? "text-bone" : "text-ash"
        }`}
      >
        <p className="text-bone/70 font-mono fluid-xs uppercase tracking-[.22em] mb-1">
          Paintball{" "}
          {winner === "paintball" ? (
            <span className="text-orange">★</span>
          ) : null}
        </p>
        <p className="fluid-sm leading-relaxed">{paintball}</p>
      </div>
      <div className="md:col-span-1 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
        {winner === "empate" ? "Empate" : `Gana ${winner}`}
      </div>
    </div>
  );
}

export default function AirsoftVsPaintballPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <MarketingHeader />

      <main className="bg-ink text-bone">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-bone/10">
          <div className="absolute inset-0 diag-lines-faint pointer-events-none" />
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 sm:py-24 relative">
            <p className="sect-label mb-4">[ Comparativa · honesta ]</p>
            <h1 className="font-display uppercase text-bone fluid-5xl leading-[0.95]">
              Airsoft vs paintball
              <br />
              <span className="text-orange">cuál te conviene</span>
            </h1>
            <p className="mt-6 text-ash fluid-md max-w-[60ch] leading-relaxed">
              Si estás dudando entre los dos, este artículo te lo aclara sin
              vender humo. Comparamos costos, dolor, realismo, dinámica y a
              quién le sirve cada uno. Spoiler: depende de qué buscás.
            </p>
          </div>
        </section>

        {/* TLDR */}
        <section className="border-b border-bone/10 bg-carbon">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-10">
            <p className="sect-label mb-4">[ TL;DR ]</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-orange/40 bg-orange/5 clip-notch p-6">
                <p className="font-display fluid-xl uppercase text-orange mb-3">
                  Elegí airsoft si...
                </p>
                <ul className="space-y-2 text-bone fluid-sm leading-relaxed">
                  <li>• Te atrae la estética táctica y militar real</li>
                  <li>• Querés partidas con dinámicas estratégicas</li>
                  <li>• No querés terminar lleno de pintura</li>
                  <li>• Buscás algo más económico por partida</li>
                  <li>• Sos mayor de 18 años</li>
                </ul>
              </div>
              <div className="border border-bone/15 bg-ink clip-notch p-6">
                <p className="font-display fluid-xl uppercase text-bone mb-3">
                  Elegí paintball si...
                </p>
                <ul className="space-y-2 text-ash fluid-sm leading-relaxed">
                  <li>• Hay menores en tu grupo (12-17 años)</li>
                  <li>• Buscás un cumpleaños arcade simple</li>
                  <li>• No te molesta ensuciarte mucho</li>
                  <li>• Querés algo más casual / menos serio</li>
                  <li>• El realismo no te importa</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* TABLA COMPARATIVA */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Comparación punto por punto ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Las 8 diferencias que importan
            </h2>
            <div className="border border-bone/15 bg-carbon clip-notch px-6 py-2">
              <CompareRow
                feature="Realismo visual"
                airsoft="Réplicas idénticas a armas reales, peso y mecánica similar. Estética militar completa."
                paintball="Marcadoras tipo arcade, tubos coloridos con tolva. Cero realismo táctico."
                winner="airsoft"
              />
              <CompareRow
                feature="Dolor del impacto"
                airsoft="Bbs livianas a 330 FPS. Sensación punzante pero corta. Tolerable con la ropa adecuada."
                paintball="Bolas grandes (0.68 cal.) y pesadas. Impacto mucho más fuerte. Deja moretones."
                winner="airsoft"
              />
              <CompareRow
                feature="Costo de munición"
                airsoft="Bbs muy baratas. Una partida típica con 300-400 disparos cuesta poco."
                paintball="Bolas de pintura caras por unidad. Disparos limitados, recarga frecuente."
                winner="airsoft"
              />
              <CompareRow
                feature="Mancha la ropa"
                airsoft="No. Bbs de plástico biodegradable, no dejan rastro. Salís limpio."
                paintball="Sí, todo. La pintura se rompe al impacto y mancha todo lo que toca."
                winner="airsoft"
              />
              <CompareRow
                feature="Edad mínima"
                airsoft="18 años. Las réplicas requieren mayoría de edad por normativa."
                paintball="12-14 años en la mayoría de los lugares. Más amigable con grupos jóvenes."
                winner="paintball"
              />
              <CompareRow
                feature="Indicador del disparo"
                airsoft="Honor system: si te dieron, te declarás muerto. Requiere fair play del jugador."
                paintball="La pintura se rompe en tu ropa = prueba visual del impacto. Cero ambigüedad."
                winner="paintball"
              />
              <CompareRow
                feature="Profundidad estratégica"
                airsoft="Partidas largas, objetivos múltiples, comunicación de equipo, dinámicas tipo operación militar."
                paintball="Partidas cortas, dinámicas simples. Más arcade que táctico."
                winner="airsoft"
              />
              <CompareRow
                feature="Curva de aprendizaje"
                airsoft="Mayor (apuntar, controlar retroceso, leer trayectoria). Más recompensante a largo plazo."
                paintball="Menor (disparás y listo). Más accesible para principiantes ocasionales."
                winner="paintball"
              />
            </div>
          </div>
        </section>

        {/* COSTOS */}
        <section className="border-b border-bone/10">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Costos en Buenos Aires ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              ¿Cuál sale más barato?
            </h2>
            <p className="text-ash fluid-base mb-6 leading-relaxed max-w-[70ch]">
              En Buenos Aires los precios varían entre lugares, pero la
              tendencia general es clara: <strong className="text-bone">airsoft suele
              salir más barato por partida</strong> si comparás todo lo que
              incluye (equipo, protección, duración, munición razonable).
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="border border-orange/40 bg-orange/5 clip-notch p-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-orange mb-2">
                  Airsoft típico
                </p>
                <p className="font-display fluid-2xl text-bone mb-3">
                  $40k - $50k
                </p>
                <p className="text-ash fluid-sm leading-relaxed">
                  Incluye marcadora, protección, briefing y 2-3 horas de juego.
                  Las recargas son baratas. Si traés tu equipo, baja a $20k.
                </p>
              </div>
              <div className="border border-bone/15 bg-carbon clip-notch p-6">
                <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke mb-2">
                  Paintball típico
                </p>
                <p className="font-display fluid-2xl text-bone mb-3">
                  Variable
                </p>
                <p className="text-ash fluid-sm leading-relaxed">
                  Suele cobrarse por base + cantidad de bolas adicionales. Si
                  hacés muchas partidas, las recargas se vuelven el grueso del
                  costo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONCLUSION */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ Conclusión honesta ]</p>
            <h2 className="sect-title fluid-2xl mb-6 text-bone">
              ¿Cuál es mejor entonces?
            </h2>
            <div className="space-y-5 text-ash fluid-base leading-relaxed">
              <p>
                No hay "mejor" absoluto — depende de qué buscás. Si tu grupo
                tiene menores y querés algo arcade para festejar un cumpleaños
                rápido, paintball cumple bien.
              </p>
              <p>
                Pero si{" "}
                <strong className="text-bone">
                  buscás una experiencia más realista
                </strong>
                , con réplicas que se sienten reales, dinámicas tácticas que
                premian la estrategia, sin terminar lleno de pintura, y a un
                costo razonable por partida —{" "}
                <strong className="text-orange">airsoft es la respuesta clara</strong>
                .
              </p>
              <p>
                En Experiencia Airsoft nos especializamos en indoor CQB
                (combate cuarto cerrado), que es la modalidad más intensa y
                cinematográfica. Si te late probar, el camino más fácil es
                anotarte a una partida abierta o pedirnos una primera vez
                guiada.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-bone/10">
          <div className="max-w-[900px] mx-auto fluid-gutter-x py-14">
            <p className="sect-label mb-3">[ FAQ ]</p>
            <h2 className="sect-title fluid-2xl mb-8 text-bone">
              Preguntas frecuentes
            </h2>
            <dl className="space-y-7">
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Se puede pasar de paintball a airsoft?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Sí, y muchos lo hacen. La gente que jugó paintball y prueba
                  airsoft suele preferirlo por la profundidad táctica y por no
                  terminar pintado. La curva de adaptación es de una partida.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿En qué se parecen?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Ambos son juegos de equipos donde el objetivo central suele
                  ser eliminar al equipo contrario o cumplir misiones tácticas.
                  Los dos requieren protección facial obligatoria y son
                  legales con la edad mínima del lugar.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Cuál es más popular en Argentina?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Paintball creció primero (años 2000-2010) y todavía tiene
                  muchos jugadores ocasionales. Airsoft creció después pero
                  consolidó una comunidad más activa y dedicada, con clanes
                  organizados y partidas regulares. En CABA hay menos lugares
                  de airsoft serios — Experiencia Airsoft es el principal
                  centro indoor.
                </dd>
              </div>
              <div>
                <dt className="font-display fluid-lg uppercase text-bone tracking-wide mb-2">
                  ¿Las dos son seguras?
                </dt>
                <dd className="text-ash fluid-base leading-relaxed">
                  Sí, ambas con protección reglamentaria. La protección facial
                  es no-negociable en los dos. En airsoft se respeta el límite
                  de 330 FPS para minimizar el dolor del impacto y proteger
                  al jugador.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="relative">
          <div className="max-w-[1100px] mx-auto fluid-gutter-x py-16 text-center">
            <h2 className="font-display uppercase fluid-4xl text-bone leading-[.95] mb-6">
              Probá airsoft con nosotros
            </h2>
            <p className="text-ash fluid-md mb-8 max-w-[55ch] mx-auto leading-relaxed">
              Centro de airsoft CQB indoor en CABA. Si esto te late más que
              paintball, te esperamos a una primera partida.
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
            <div className="mt-10 flex items-center justify-center flex-wrap gap-x-6 gap-y-3 font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
              <Link href="/precios" className="hover:text-bone transition">
                Ver precios →
              </Link>
              <Link href="/primera-vez" className="hover:text-bone transition">
                Soy principiante →
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
