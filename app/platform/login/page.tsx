import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/partidas");

  const { signup } = await searchParams;

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Ingreso · plataforma</p>
        <h1 className="sect-title fluid-3xl">Ingresar</h1>
      </div>

      {signup === "ok" && (
        <div className="mb-6 border border-orange/50 bg-orange/10 px-4 py-3 clip-tag">
          <p className="font-mono fluid-xs text-orange">
            ¡Cuenta creada! Revisá tu email para confirmar y después ingresá.
          </p>
        </div>
      )}

      <LoginForm />

      <p className="mt-6 font-mono fluid-xs text-smoke">
        ¿Sos nuevo?{" "}
        <Link href="/signup" className="text-orange hover:underline">
          Creá tu cuenta
        </Link>
      </p>
    </div>
  );
}
