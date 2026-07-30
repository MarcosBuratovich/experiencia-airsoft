import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  SITE_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/privacidad`;
const TITLE = "Política de privacidad";
const DESCRIPTION =
  "Qué datos guarda Experiencia Airsoft, para qué los usa, con quién los comparte, cuánto tiempo los conserva y cómo pedir que se borren.";

/**
 * Última actualización real del texto. Se toca a mano cuando cambia el
 * contenido — no con `new Date()`, que mentiría sobre la vigencia justo en
 * la página donde la fecha importa.
 */
const ACTUALIZADA = "30 de julio de 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacidad" },
  openGraph: {
    title: `${TITLE} · Experiencia Airsoft`,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "article",
    locale: "es_AR",
  },
};

function Seccion({
  n,
  titulo,
  children,
}: {
  n: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="font-mono fluid-xs text-orange">{n}</span>
        <h2 className="sect-title fluid-xl">{titulo}</h2>
      </div>
      <div className="space-y-4 font-sans fluid-sm text-ash max-w-[70ch]">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20">
        <p className="sect-label mb-2">Legal</p>
        <h1 className="sect-title fluid-3xl mb-3">Política de privacidad</h1>
        <p className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
          Última actualización: {ACTUALIZADA}
        </p>

        <p className="mt-8 font-sans fluid-base text-bone max-w-[70ch]">
          Esta página explica qué datos tuyos guardamos, para qué, con quién los
          compartimos y cómo pedir que los borremos. Está escrita para que se
          entienda, no para cubrirnos.
        </p>

        <Seccion n="01" titulo="Quién es responsable">
          <p>
            <b>Experiencia Airsoft</b>, con predio en Gral. Conesa 1858, Ciudad
            Autónoma de Buenos Aires, Argentina. Para cualquier consulta sobre
            tus datos podés escribirnos por WhatsApp al{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="text-orange hover:underline"
            >
              {WHATSAPP_NUMBER}
            </a>
            .
          </p>
        </Seccion>

        <Seccion n="02" titulo="Qué datos guardamos">
          <p>
            <b>Si te creás una cuenta:</b> nombre y apellido, DNI, celular,
            correo electrónico, y opcionalmente un alias y un número de jugador.
            El DNI y el celular se piden porque hacen falta para el control de
            acceso al predio y para poder contactarte por una reserva.
          </p>
          <p>
            <b>Tu actividad en la cancha:</b> a qué partidas te anotaste, si
            asististe, qué equipo alquilaste, qué pagaste y cómo, y si sos
            socio, el estado de tu cuota.
          </p>
          <p>
            <b>Si pedís una partida privada:</b> la fecha, la cantidad estimada
            de personas y, si llegaste desde un anuncio, el identificador de ese
            clic — sirve para saber qué publicidad funciona, no identifica a
            nadie por sí solo.
          </p>
          <p>
            <b>Si nos escribís por Instagram o Messenger:</b> el texto de los
            mensajes, tu nombre de perfil y un identificador interno que nos da
            Meta. Ese identificador solo sirve dentro de nuestra cuenta: no es
            tu usuario de Instagram ni permite encontrarte fuera de ahí. Meta no
            nos entrega tu teléfono ni tu correo por esa vía.
          </p>
          <p>
            <b>Tu navegación por el sitio:</b> páginas visitadas, desde dónde
            llegaste y qué botones tocaste, mediante Google Analytics, el píxel
            de Meta y Google Ads. Sirve para entender qué contenido es útil y
            para medir la publicidad.
          </p>
          <p className="text-smoke">
            No pedimos ni guardamos datos de tarjetas. Los pagos se registran a
            mano indicando el medio (efectivo o transferencia) y el monto.
          </p>
        </Seccion>

        <Seccion n="03" titulo="Para qué los usamos">
          <p>
            Para gestionar tu reserva y el ingreso al predio, para contactarte
            por algo relacionado con una partida, para contestar tus consultas,
            para llevar la administración del negocio (cobros, cuotas de socio),
            y para medir y mejorar nuestra publicidad.
          </p>
          <p>
            <b>No vendemos tus datos</b> ni los cedemos a terceros para que te
            ofrezcan sus productos.
          </p>
        </Seccion>

        <Seccion n="04" titulo="El asistente que responde mensajes">
          <p>
            Cuando escribís por Instagram o Messenger puede contestarte un
            asistente automático. Cuando lo hace, el texto de la conversación se
            procesa con un modelo de inteligencia artificial de{" "}
            <b>Anthropic</b> para generar la respuesta.
          </p>
          <p>
            El asistente <b>solo puede leer</b> información del negocio —
            precios y qué partidas hay— y no accede a los datos de tu cuenta ni
            a los de ningún otro jugador. No puede anotarte, cobrarte ni
            modificar nada.
          </p>
          <p>
            Si preferís hablar con una persona, pedilo y la conversación pasa a
            alguien del equipo.
          </p>
        </Seccion>

        <Seccion n="05" titulo="Con quién los compartimos">
          <p>
            Usamos servicios de terceros para que todo esto funcione. Cada uno
            accede únicamente a lo que necesita:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Supabase</b> — guarda la base de datos (cuentas, reservas,
              conversaciones).
            </li>
            <li>
              <b>Vercel</b> — aloja el sitio y la aplicación.
            </li>
            <li>
              <b>Anthropic</b> — procesa el texto de los mensajes para que el
              asistente pueda responder.
            </li>
            <li>
              <b>Meta</b> (Instagram, Facebook) — mensajería y medición de
              publicidad.
            </li>
            <li>
              <b>Google</b> — Analytics y Ads, para medición de publicidad.
            </li>
            <li>
              <b>Resend</b> — envío de los correos de la cuenta (confirmación,
              recuperar contraseña).
            </li>
            <li>
              <b>Tiendanube</b> — la tienda online, si comprás ahí.
            </li>
          </ul>
          <p className="text-smoke">
            Algunos de estos servicios están fuera de la Argentina, así que tus
            datos pueden almacenarse o procesarse en otros países.
          </p>
        </Seccion>

        <Seccion n="06" titulo="Cuánto tiempo los guardamos">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Datos de tu cuenta y tu historial de partidas:</b> mientras
              tengas la cuenta activa. Si pedís que la borremos, se elimina.
            </li>
            <li>
              <b>Conversaciones de Instagram y Messenger:</b> 12 meses, y
              después se eliminan automáticamente.
            </li>
            <li>
              <b>Datos de navegación y publicidad:</b> 14 meses, según la
              configuración de Google Analytics.
            </li>
            <li>
              <b>Registros de operaciones cobradas:</b> se conservan el tiempo
              que exija la normativa contable e impositiva, aunque borres tu
              cuenta.
            </li>
          </ul>
        </Seccion>

        <Seccion n="07" titulo="Tus derechos">
          <p>
            Podés pedirnos en cualquier momento que te digamos qué datos tuyos
            tenemos, que corrijamos los que estén mal, o que los borremos.
          </p>
          <p>
            La forma más rápida es escribirnos por WhatsApp al{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="text-orange hover:underline"
            >
              {WHATSAPP_NUMBER}
            </a>
            . Si lo que querés es que borremos tus datos, en{" "}
            <Link href="/borrar-datos" className="text-orange hover:underline">
              esta página
            </Link>{" "}
            está el paso a paso.
          </p>
          <p className="text-smoke fluid-xs">
            El titular de los datos personales tiene la facultad de ejercer el
            derecho de acceso a los mismos en forma gratuita a intervalos no
            inferiores a seis meses, salvo que se acredite un interés legítimo
            al efecto, conforme lo establecido en el artículo 14, inciso 3 de la
            Ley N.º 25.326. La Agencia de Acceso a la Información Pública, en su
            carácter de órgano de control de la Ley N.º 25.326, tiene la
            atribución de atender las denuncias y reclamos que se interpongan
            con relación al incumplimiento de las normas sobre protección de
            datos personales.
          </p>
        </Seccion>

        <Seccion n="08" titulo="Menores de edad">
          <p>
            El acceso al predio y el uso de la plataforma tienen restricciones
            de edad. Si sos menor, necesitás la autorización de una persona
            adulta responsable, que es también quien puede ejercer los derechos
            sobre tus datos.
          </p>
        </Seccion>

        <Seccion n="09" titulo="Cookies">
          <p>
            Usamos cookies propias para mantener tu sesión iniciada, y cookies
            de Google y Meta para medición y publicidad. Podés bloquearlas desde
            la configuración de tu navegador; si bloqueás las nuestras, no vas a
            poder mantener la sesión abierta.
          </p>
        </Seccion>

        <Seccion n="10" titulo="Cambios">
          <p>
            Si cambiamos esta política, actualizamos la fecha del encabezado. Si
            el cambio es importante, lo avisamos por nuestros canales.
          </p>
        </Seccion>

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
