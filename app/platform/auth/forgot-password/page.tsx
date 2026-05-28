import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = {
  title: "Recuperar contraseña",
};

export default async function ForgotPasswordPage() {
  // Si ya tiene sesion, no tiene sentido el flow.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Acceso · recuperación</p>
        <h1 className="sect-title fluid-3xl">Recuperar contraseña</h1>
        <p className="mt-3 text-ash fluid-sm leading-relaxed">
          Ingresá el email de tu cuenta. Si existe, te mandamos un link para
          crear una nueva contraseña.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 font-mono fluid-xs text-smoke">
        ¿Te acordaste?{" "}
        <Link href="/login" className="text-orange hover:underline">
          Volver al ingreso
        </Link>
      </p>
    </div>
  );
}
