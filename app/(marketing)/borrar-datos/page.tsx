import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/borrar-datos`;
const TITLE = "Cómo borrar tus datos";
const DESCRIPTION =
  "Paso a paso para pedirle a Experiencia Airsoft que borre tus datos personales: tu cuenta, tu historial y las conversaciones por Instagram o Messenger.";

/** Se toca a mano cuando cambia el texto. Ver nota en /privacidad. */
const ACTUALIZADA = "30 de julio de 2026";

/**
 * URL de instrucciones de borrado que se declara en la app de Meta.
 * Meta acepta esta página en lugar de un callback firmado; si algún día se
 * implementa el callback, este texto tiene que seguir existiendo igual.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/borrar-datos" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "article",
    locale: "es_AR",
  },
};

function Paso({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-5 flex gap-4">
      <span className="font-mono fluid-lg text-orange shrink-0">{n}</span>
      <div>
        <h3 className="font-display fluid-base uppercase text-bone mb-2">
          {titulo}
        </h3>
        <div className="space-y-2 font-sans fluid-sm text-ash">{children}</div>
      </div>
    </li>
  );
}

export default function BorrarDatosPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20">
        <p className="sect-label mb-2">Legal</p>
        <h1 className="sect-title fluid-3xl mb-3">Cómo borrar tus datos</h1>
        <p className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
          Última actualización: {ACTUALIZADA}
        </p>

        <p className="mt-8 font-sans fluid-base text-bone max-w-[70ch]">
          Podés pedirnos que borremos tus datos cuando quieras, sin dar
          explicaciones y sin costo. Acá está cómo, y qué pasa después.
        </p>

        <h2 className="sect-title fluid-xl mt-12 mb-4">El pedido</h2>
        <ol className="flex flex-col gap-3">
          <Paso n={1} titulo="Escribinos por WhatsApp">
            <p>
              Al{" "}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="text-orange hover:underline"
              >
                {WHATSAPP_NUMBER}
              </a>
              , diciendo que querés que borremos tus datos.
            </p>
          </Paso>

          <Paso n={2} titulo="Decinos cómo encontrarte">
            <p>
              <b>Si tenés cuenta:</b> el correo con el que la creaste.
            </p>
            <p>
              <b>Si solo nos escribiste por Instagram o Messenger:</b> el
              usuario desde el que lo hiciste. Con eso ubicamos la conversación.
            </p>
            <p className="text-smoke">
              Te lo pedimos para no borrar los datos de otra persona por error.
            </p>
          </Paso>

          <Paso n={3} titulo="Listo">
            <p>
              Lo procesamos dentro de los <b>30 días</b> y te confirmamos cuando
              esté hecho.
            </p>
          </Paso>
        </ol>

        <h2 className="sect-title fluid-xl mt-14 mb-4">Qué se borra</h2>
        <div className="space-y-4 font-sans fluid-sm text-ash max-w-[70ch]">
          <ul className="list-disc pl-5 space-y-2">
            <li>Tu cuenta: nombre, apellido, DNI, celular, correo y alias.</li>
            <li>Tu historial de inscripciones y asistencia a partidas.</li>
            <li>
              Las conversaciones que hayas tenido con nosotros por Instagram o
              Messenger, incluidas las que respondió el asistente automático.
            </li>
            <li>Tus solicitudes de partidas privadas.</li>
          </ul>
        </div>

        <h2 className="sect-title fluid-xl mt-12 mb-4">Qué no podemos borrar</h2>
        <div className="space-y-4 font-sans fluid-sm text-ash max-w-[70ch]">
          <p>
            <b>Los registros de operaciones que ya se cobraron.</b> La normativa
            contable e impositiva nos obliga a conservarlos por un plazo
            determinado. Quedan solo como registro de la operación, no se usan
            para contactarte ni para publicidad.
          </p>
          <p>
            <b>Los datos que ya tienen Meta o Google por su cuenta.</b> Si
            querés que Instagram o Google borren lo que ellos guardaron sobre
            tu actividad, eso se pide directamente en la configuración de cada
            plataforma — nosotros no tenemos acceso a esos registros.
          </p>
        </div>

        <div className="mt-12 border-l-4 border-orange bg-orange-300/5 p-5">
          <p className="font-sans fluid-sm text-bone max-w-[70ch]">
            <b>Ojo:</b> si borrás tu cuenta perdés el historial de partidas, tu
            número de jugador y, si sos socio, la antigüedad acumulada. No es
            reversible. Si lo que querés es solo dejar de recibir mensajes,
            decínoslo y lo damos de baja sin borrar nada.
          </p>
        </div>

        <p className="mt-10 font-sans fluid-sm text-ash max-w-[70ch]">
          Para el detalle de qué datos guardamos y por qué, mirá la{" "}
          <Link href="/privacidad" className="text-orange hover:underline">
            política de privacidad
          </Link>
          .
        </p>

        <div className="mt-14 border-t border-rail/40 pt-6">
          <Link
            href="/"
            className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition"
          >
            ← Volver al inicio
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
