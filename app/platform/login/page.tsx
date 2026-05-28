import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SOPORTE_WHATSAPP_NUMBER,
  SOPORTE_WHATSAPP_URL,
} from "@/app/_components/site-constants";
import { LoginForm } from "./login-form";

const APP_URL = "https://app.experienciaairsoft.com";

export const metadata: Metadata = {
  title: "Ingresar a la plataforma",
  description:
    "Ingresá a tu cuenta de Experiencia Airsoft para reservar partidas, gestionar clanes y tu perfil de jugador.",
  alternates: { canonical: `${APP_URL}/login` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: `${APP_URL}/login`,
    siteName: "Experiencia Airsoft",
    title: "Ingresar a la plataforma · Experiencia Airsoft",
    description:
      "Accedé a tu cuenta o creá una nueva para reservar tu lugar en una partida.",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    signup?: string;
    error?: string;
    reset?: string;
    deleted?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { signup, error, reset, deleted } = await searchParams;

  // Si vino del signup, mostramos un takeover grande explicando que tiene
  // que verificar el mail. El mail abre en otra pestaña, así que el botón
  // "Ingresar" abajo es el camino de vuelta para cuando ya verificó.
  if (signup === "ok") {
    return (
      <div className="max-w-xl mx-auto">
        <div className="border border-orange/60 bg-orange/5 clip-notch p-6 sm:p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-6 border-2 border-orange rounded-full text-orange">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-8 h-8 sm:w-10 sm:h-10"
              aria-hidden
            >
              <path d="M5 12l5 5L20 7" strokeLinecap="square" />
            </svg>
          </div>

          <p className="sect-label text-orange mb-3">// Cuenta creada</p>
          <h1 className="font-display fluid-4xl uppercase leading-[.95] text-bone tracking-wider">
            ¡Listo!
            <br />
            <span className="text-orange">Verificá tu mail</span>
          </h1>

          <p className="mt-6 text-ash fluid-md leading-relaxed max-w-[40ch] mx-auto">
            Te mandamos un correo de confirmación. Hacé click en el link para
            activar tu cuenta y después volvé acá para iniciar sesión.
          </p>
          <p className="mt-3 text-smoke font-mono fluid-xs uppercase tracking-[.22em]">
            ¿No te llega? Revisá la carpeta de spam.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="btn-wa clip-tag inline-flex items-center gap-2 px-6 py-3 uppercase tracking-wider font-semibold fluid-sm"
            >
              Iniciar sesión
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/auth/forgot-password"
              className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke hover:text-orange transition"
            >
              ¿Problemas con el mail?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center font-mono fluid-xs text-smoke">
          ¿Algo no anda con el email? Escribí por{" "}
          <a
            href="https://wa.me/5491166652698"
            target="_blank"
            rel="noopener"
            className="text-orange hover:underline"
          >
            WhatsApp de soporte
          </a>{" "}
          y te ayudo.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Banner para usuarios nuevos — primera cosa que ven */}
      <div className="mb-6 border border-orange/60 bg-orange/5 clip-notch p-4 sm:p-5">
        <p className="sect-label mb-1 text-orange">// Primera vez acá</p>
        <p className="font-sans fluid-sm text-bone leading-relaxed">
          Si sos nuevo y querés reservar tu lugar en una partida,{" "}
          <span className="text-orange">tenés que crear una cuenta</span>.
        </p>
        <Link
          href="/signup"
          className="btn-wa mt-4 inline-flex items-center gap-2 px-5 py-2.5 clip-tag uppercase tracking-wider font-semibold fluid-xs"
        >
          Crear cuenta
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="mb-6">
        <p className="sect-label mb-2">Ingreso · plataforma</p>
        <h1 className="sect-title fluid-3xl">¿Ya tenés cuenta?</h1>
      </div>

      {deleted === "ok" && (
        <div className="mb-6 border border-orange-300/60 bg-orange/5 px-4 py-3 clip-tag">
          <p className="font-mono fluid-xs text-orange-300">
            Tu cuenta fue eliminada. Si querés volver, podés crear una nueva.
          </p>
        </div>
      )}

      {reset === "ok" && (
        <div className="mb-6 border border-orange/50 bg-orange/10 px-4 py-3 clip-tag">
          <p className="font-mono fluid-xs text-orange">
            Contraseña actualizada. Ingresá con la nueva.
          </p>
        </div>
      )}

      {error === "expired" && (
        <div className="mb-6 border border-orange-300/60 bg-orange/5 px-4 py-3 clip-tag">
          <p className="font-mono fluid-xs text-orange-300">
            El link expiró. Pedí uno nuevo abajo.
          </p>
        </div>
      )}

      {error === "verify_failed" && (
        <div className="mb-6 border border-orange-300/60 bg-orange/5 px-4 py-3 clip-tag">
          <p className="font-mono fluid-xs text-orange-300">
            No pudimos validar el link. Pedí uno nuevo o iniciá sesión.
          </p>
        </div>
      )}

      {error === "invalid_link" && (
        <div className="mb-6 border border-orange-300/60 bg-orange/5 px-4 py-3 clip-tag">
          <p className="font-mono fluid-xs text-orange-300">
            El link no es válido. Pedí uno nuevo.
          </p>
        </div>
      )}

      <LoginForm />

      <div className="mt-6 flex items-center justify-between font-mono fluid-xs text-smoke">
        <Link href="/auth/forgot-password" className="text-orange hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/signup" className="text-orange hover:underline">
          Creá tu cuenta →
        </Link>
      </div>

      {/* Features de la app */}
      <section className="mt-12 border-t border-rail/40 pt-8">
        <p className="sect-label mb-4">// Qué podés hacer con tu cuenta</p>
        <ul className="space-y-3">
          <FeatureItem
            title="Reservar partidas públicas"
            desc="Mirá las partidas de la semana, anotate en un click y pagás en el local."
          />
          <FeatureItem
            title="Pedir partidas privadas"
            desc="Reservá un slot exclusivo de 4 horas (cumpleaños, grupo cerrado, evento) desde el calendario."
          />
          <FeatureItem
            title="Agregar alquileres a tu nombre"
            desc="Sumá amigos que vienen sin cuenta — quedan en la lista bajo tu nombre y se les cobra como alquiler."
          />
          <FeatureItem
            title="Crear y unirte a clanes"
            desc="Hasta 3 clanes por usuario. Logo circular, alias con color, ranking comunitario."
          />
          <FeatureItem
            title="Tu perfil con alias"
            desc="Elegí un alias (puede ser con emojis) que aparece al lado de tu nombre en partidas."
          />
          <FeatureItem
            title="Notificaciones por email"
            desc="Confirmaciones, recordatorios de cuota y respuestas a tus solicitudes te llegan automático."
          />
        </ul>
      </section>

      {/* Soporte técnico */}
      <section className="mt-8 border border-rail/60 bg-carbon clip-notch p-4 sm:p-5">
        <p className="sect-label mb-2">// Soporte técnico</p>
        <p className="font-sans fluid-sm text-ash leading-relaxed">
          Si tenés algún error técnico (no podés ingresar, no te llega el
          mail, una reserva no aparece, etc.), escribime por WhatsApp:
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
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <span className="font-mono fluid-xs text-orange shrink-0 mt-0.5">
        →
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display fluid-base text-bone uppercase tracking-wider">
          {title}
        </p>
        <p className="font-sans fluid-sm text-ash leading-relaxed mt-0.5">
          {desc}
        </p>
      </div>
    </li>
  );
}
