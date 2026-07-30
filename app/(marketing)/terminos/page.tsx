import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "../../_components/marketing-header";
import { MarketingFooter } from "../../_components/marketing-footer";
import {
  ADDRESS_CITY,
  ADDRESS_POSTAL,
  ADDRESS_STREET,
  SITE_URL,
  TIENDA_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../_components/site-constants";

const PAGE_URL = `${SITE_URL}/terminos`;
const TITLE = "Condiciones del servicio";
const DESCRIPTION =
  "Condiciones para usar la plataforma de Experiencia Airsoft y participar de las partidas: quién puede jugar, cómo son las reservas, los pagos y las normas del predio.";

/** Se toca a mano cuando cambia el texto. Ver nota en /privacidad. */
const ACTUALIZADA = "30 de julio de 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terminos" },
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

export default function TerminosPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20">
        <p className="sect-label mb-2">Legal</p>
        <h1 className="sect-title fluid-3xl mb-3">Condiciones del servicio</h1>
        <p className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
          Última actualización: {ACTUALIZADA}
        </p>

        <p className="mt-8 font-sans fluid-base text-bone max-w-[70ch]">
          Estas condiciones aplican al uso del sitio, de la plataforma de
          reservas y a la participación en las partidas. Al reservar o entrar al
          predio, las aceptás.
        </p>

        <Seccion n="01" titulo="Quiénes somos">
          <p>
            <b>Experiencia Airsoft</b>, centro de airsoft CQB indoor en{" "}
            {ADDRESS_STREET}, {ADDRESS_POSTAL}, {ADDRESS_CITY}. Contacto:{" "}
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

        <Seccion n="02" titulo="Quién puede jugar">
          <p>
            <b>Personas mayores de 18 años</b>, con documento que lo acredite al
            momento del ingreso. Es un requisito normativo por la apariencia
            realista de las marcadoras: <b>no hacemos excepciones</b>, ni siquiera
            con autorización de una persona adulta.
          </p>
          <p>
            No hace falta experiencia previa ni equipo propio.
          </p>
        </Seccion>

        <Seccion n="03" titulo="Tu cuenta">
          <p>
            Para reservar necesitás una cuenta con datos reales: los usamos para
            el control de acceso y para contactarte por tu reserva. Sos
            responsable de lo que se haga desde tu cuenta, así que cuidá tu
            contraseña.
          </p>
          <p>
            Podemos suspender o dar de baja una cuenta con datos falsos, o de
            alguien que haya incumplido las normas del predio.
          </p>
        </Seccion>

        <Seccion n="04" titulo="Reservas">
          <p>
            <b>Trabajamos 100% bajo reserva previa.</b> No se puede venir sin
            haber reservado.
          </p>
          <p>
            Los lugares son limitados y se asignan por orden de inscripción. Si
            una partida se llena, podés quedar en lista de espera.
          </p>
          <p>
            Podemos reprogramar o cancelar una partida por motivos de fuerza
            mayor o de seguridad. Si eso pasa, te avisamos y podés reprogramar o
            recuperar lo que hayas pagado.
          </p>
        </Seccion>

        <Seccion n="05" titulo="Precios y pagos">
          <p>
            Los precios vigentes son los que figuran en la plataforma al momento
            de reservar. <b>El precio puede variar según el medio de pago</b>{" "}
            (efectivo o transferencia), y esa diferencia se muestra siempre antes
            de confirmar.
          </p>
          <p>
            Los alquileres de equipo y las recargas durante la partida se cobran
            aparte de la entrada.
          </p>
          <p>
            Podemos actualizar los precios cuando sea necesario. Una reserva ya
            confirmada mantiene el precio con el que se confirmó.
          </p>
        </Seccion>

        <Seccion n="06" titulo="Cancelaciones y señas">
          <p>
            Las partidas privadas y los eventos de grupo pueden requerir{" "}
            <b>una seña para asegurar la fecha</b>. El monto, el plazo para
            pagarla y las condiciones de devolución se te informan al confirmar
            la reserva, y son los que rigen para esa reserva en particular.
          </p>
          <p>
            Como regla general, la seña asegura el bloqueo de una fecha que
            dejamos de ofrecer a otros grupos, así que{" "}
            <b>no se devuelve si la cancelación es del lado del cliente</b>. Si
            la cancelación es nuestra, se devuelve completa.
          </p>
          <p>
            Para las partidas públicas, la política de cancelación vigente se
            informa al momento de anotarse. Si tenés dudas antes de reservar,
            escribinos y te la confirmamos.
          </p>
        </Seccion>

        <Seccion n="07" titulo="Normas del predio">
          <p>Son innegociables porque de ellas depende que nadie se lastime:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Protección facial obligatoria</b> en todo momento dentro del
              área de juego.
            </li>
            <li>
              <b>Potencia máxima 330 FPS.</b> Todo equipo, propio o alquilado, se
              controla antes de jugar.
            </li>
            <li>
              Se siguen las indicaciones del staff, que arbitra durante toda la
              partida.
            </li>
            <li>
              <b>Nadie juega bajo efectos de alcohol o drogas.</b> Tampoco se
              consumen durante la actividad.
            </li>
            <li>
              Las marcadoras se transportan y manipulan según las normas
              vigentes, dentro y fuera del predio.
            </li>
          </ul>
          <p>
            Quien incumpla estas normas queda excluido de la actividad{" "}
            <b>sin derecho a devolución</b>, y podemos impedirle el ingreso en
            adelante.
          </p>
        </Seccion>

        <Seccion n="08" titulo="Riesgos de la actividad">
          <p>
            El airsoft es un deporte de contacto con proyectiles. Aun cumpliendo
            todas las normas, existe riesgo de golpes, marcas, raspones y
            torceduras. Al participar declarás conocer y aceptar ese riesgo, y
            que estás en condiciones físicas de hacerlo.
          </p>
          <p>
            Si tenés una condición de salud que pueda verse afectada, avisanos
            antes de jugar.
          </p>
          <p>
            No respondemos por daños derivados del incumplimiento de las normas
            de seguridad o de las indicaciones del staff.
          </p>
        </Seccion>

        <Seccion n="09" titulo="Socios">
          <p>
            La condición de socio se mantiene con el pago de la cuota mensual y
            da acceso a los beneficios vigentes en cada momento. El monto de la
            cuota, su fecha de vencimiento y los recargos por pago fuera de
            término son los informados en la plataforma.
          </p>
          <p>
            Podés dar de baja tu condición de socio cuando quieras. Las cuotas ya
            abonadas no se devuelven.
          </p>
        </Seccion>

        <Seccion n="10" titulo="El asistente automático">
          <p>
            Nuestros canales de mensajería pueden ser respondidos por un
            asistente automático. Sus respuestas son orientativas: consulta los
            precios y la disponibilidad de nuestro sistema, pero{" "}
            <b>no confirma reservas ni compromete cupos</b>.
          </p>
          <p>
            Una reserva solo existe cuando queda registrada en la plataforma. Si
            algo es importante para tu decisión, pedí hablar con una persona del
            equipo y te confirmamos.
          </p>
        </Seccion>

        <Seccion n="11" titulo="La tienda">
          <p>
            Las compras en{" "}
            <a
              href={TIENDA_URL}
              target="_blank"
              rel="noopener"
              className="text-orange hover:underline"
            >
              nuestra tienda online
            </a>{" "}
            se rigen además por las condiciones de la plataforma que la aloja,
            incluidas las de pago, envío y devolución.
          </p>
        </Seccion>

        <Seccion n="12" titulo="Contenido del sitio">
          <p>
            Las marcas, textos, fotos y videos del sitio son nuestros o los
            usamos con permiso. Podés compartirlos citando la fuente, pero no
            usarlos comercialmente sin autorización.
          </p>
          <p>
            En el predio tomamos fotos y videos de la actividad. Si no querés
            aparecer, avisanos y lo respetamos.
          </p>
        </Seccion>

        <Seccion n="13" titulo="Cambios">
          <p>
            Podemos actualizar estas condiciones. La fecha del encabezado indica
            la última versión, y las reservas ya confirmadas se rigen por las
            condiciones vigentes al momento de confirmarlas.
          </p>
        </Seccion>

        <Seccion n="14" titulo="Ley aplicable">
          <p>
            Estas condiciones se rigen por las leyes de la República Argentina.
            Ante cualquier controversia se aplican los tribunales ordinarios de
            la Ciudad Autónoma de Buenos Aires, sin perjuicio de los derechos que
            la normativa de defensa del consumidor reconoce a los consumidores.
          </p>
          <p>
            Para el tratamiento de tus datos personales, mirá la{" "}
            <Link href="/privacidad" className="text-orange hover:underline">
              política de privacidad
            </Link>
            .
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
