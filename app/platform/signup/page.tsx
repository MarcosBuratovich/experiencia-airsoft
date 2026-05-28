import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactosWhatsapp } from "@/app/_components/contactos-whatsapp";
import { SignupForm } from "./signup-form";

const APP_URL = "https://app.experienciaairsoft.com";

export const metadata: Metadata = {
  title: "Crear cuenta de jugador",
  description:
    "Creá tu cuenta gratis para reservar partidas de airsoft en Experiencia Airsoft (CABA). Te lleva un minuto: nombre, DNI, celular y email.",
  alternates: { canonical: `${APP_URL}/signup` },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: `${APP_URL}/signup`,
    siteName: "Experiencia Airsoft",
    title: "Crear cuenta · Experiencia Airsoft",
    description:
      "Creá tu cuenta gratis y reservá tu lugar en una partida.",
  },
};

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Registro · jugador</p>
        <h1 className="sect-title fluid-3xl">Crear cuenta</h1>
        <p className="mt-3 text-ash fluid-sm leading-relaxed">
          Con tu cuenta vas a poder reservar partidas públicas, pedir privadas
          (cumpleaños, eventos), agregar alquileres a tu nombre y unirte a
          clanes.
        </p>
      </div>
      <SignupForm />
      <p className="mt-6 font-mono fluid-xs text-smoke">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-orange hover:underline">
          Ingresá acá
        </Link>
      </p>

      <div className="mt-8">
        <ContactosWhatsapp />
      </div>
    </div>
  );
}
