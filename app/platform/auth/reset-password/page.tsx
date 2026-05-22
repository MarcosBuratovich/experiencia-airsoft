import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-form";

export const metadata = {
  title: "Crear nueva contraseña",
};

export default async function ResetPasswordPage() {
  // Esta page requiere haber pasado por /auth/callback (verifyOtp con
  // type=recovery o invite). Si no hay sesion, el link expiro o no es valido.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=expired");
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Acceso · nueva contraseña</p>
        <h1 className="sect-title fluid-3xl">Crear contraseña</h1>
        <p className="mt-3 text-ash fluid-sm leading-relaxed">
          Elegí una nueva contraseña para tu cuenta{" "}
          <strong className="text-bone">{user.email}</strong>. Después podés
          volver a loguearte con ella.
        </p>
      </div>

      <ResetPasswordForm />

      <p className="mt-6 font-mono fluid-xs text-smoke">
        <Link href="/login" className="text-orange hover:underline">
          Cancelar y volver al ingreso
        </Link>
      </p>
    </div>
  );
}
