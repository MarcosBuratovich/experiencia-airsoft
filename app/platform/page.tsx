import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SOPORTE_WHATSAPP_NUMBER,
  SOPORTE_WHATSAPP_URL,
} from "@/app/_components/site-constants";

const APP_URL = "https://app.experienciaairsoft.com";
const TITLE =
  "Plataforma de reservas · Experiencia Airsoft";
const DESCRIPTION =
  "Plataforma online para reservar partidas de airsoft en Buenos Aires. Inscripción a partidas públicas y privadas, gestión de clanes, perfil de jugador, alquileres.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: APP_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: APP_URL,
    siteName: "Experiencia Airsoft",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const featuresJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Experiencia Airsoft — Plataforma",
  url: APP_URL,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  inLanguage: "es-AR",
  description: DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Experiencia Airsoft",
    url: "https://www.experienciaairsoft.com",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "ARS",
    description: "Crear cuenta y reservar es gratis. Pagás en el local.",
  },
  featureList: [
    "Reservar partidas públicas",
    "Pedir partidas privadas",
    "Agregar alquileres",
    "Crear y unirte a clanes",
    "Perfil con alias",
    "Notificaciones por email",
  ],
};

export default async function PlatformHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si está logueado: directo a partidas.
  if (user) redirect("/partidas");

  // Anónimo: landing pública (indexable por Google).
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresJsonLd) }}
      />

      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center sm:text-left">
          <p className="sect-label mb-2 text-orange">// Plataforma</p>
          <h1 className="font-display fluid-4xl uppercase leading-[.95] text-bone tracking-wider">
            Reservá tu lugar
            <br />
            <span className="text-orange">en segundos</span>
          </h1>
          <p className="mt-5 text-ash fluid-md leading-relaxed max-w-[55ch]">
            Esta es la plataforma online de Experiencia Airsoft. Creás tu
            cuenta una vez, ves las partidas de la semana y te anotás. Pagás
            cuando llegás al local.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link
            href="/signup"
            className="btn-wa clip-tag inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold uppercase tracking-wider fluid-xs"
          >
            Crear cuenta
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/login"
            className="btn-ghost clip-tag inline-flex items-center justify-center gap-2 px-6 py-3 uppercase tracking-wider fluid-xs"
          >
            Ya tengo cuenta · Ingresar
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="sect-label mb-4">// Qué podés hacer</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            <Feature
              title="Reservar partidas públicas"
              desc="Mirá las partidas semanales, anotate y pagás en el local."
            />
            <Feature
              title="Pedir partidas privadas"
              desc="Slot exclusivo de 4 hs para cumpleaños o grupo cerrado."
            />
            <Feature
              title="Agregar alquileres"
              desc="Sumá amigos que vienen sin cuenta a la lista bajo tu nombre."
            />
            <Feature
              title="Crear y unirte a clanes"
              desc="Hasta 3 clanes por usuario, con logo y color propio."
            />
            <Feature
              title="Perfil con alias"
              desc="Tu apodo (emojis incluidos) aparece en cada partida."
            />
            <Feature
              title="Notificaciones por email"
              desc="Confirmaciones, recordatorios de cuota, respuestas a solicitudes."
            />
          </ul>
        </section>

        <section className="mb-10 border border-orange/30 bg-orange/5 clip-notch p-5">
          <p className="sect-label text-orange mb-1">// ¿Sos nuevo?</p>
          <p className="text-ash fluid-sm leading-relaxed">
            Si nunca viniste a Experiencia Airsoft, podés leer{" "}
            <a
              href="https://www.experienciaairsoft.com/primera-vez"
              className="text-orange hover:underline"
            >
              cómo es la primera vez
            </a>
            ,{" "}
            <a
              href="https://www.experienciaairsoft.com/precios"
              className="text-orange hover:underline"
            >
              cuánto sale
            </a>{" "}
            o{" "}
            <a
              href="https://www.experienciaairsoft.com/buenos-aires"
              className="text-orange hover:underline"
            >
              cómo llegar al local
            </a>
            . Después volvés y creás tu cuenta para reservar.
          </p>
        </section>

        <section className="border border-rail/60 bg-carbon clip-notch p-4 sm:p-5">
          <p className="sect-label mb-2">// Soporte técnico</p>
          <p className="font-sans fluid-sm text-ash leading-relaxed">
            ¿Algo no anda? Escribime por WhatsApp:
          </p>
          <a
            href={SOPORTE_WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.22em] text-orange hover:underline"
          >
            → {SOPORTE_WHATSAPP_NUMBER}
          </a>
        </section>
      </div>
    </>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-4">
      <p className="font-display fluid-base uppercase tracking-wider text-bone">
        {title}
      </p>
      <p className="mt-1 font-sans fluid-sm text-ash leading-relaxed">
        {desc}
      </p>
    </li>
  );
}
