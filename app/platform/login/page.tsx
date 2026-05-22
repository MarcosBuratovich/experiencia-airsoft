import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string; error?: string; reset?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/partidas");

  const { signup, error, reset } = await searchParams;

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
    </div>
  );
}
