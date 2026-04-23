import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/partidas");

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Registro · jugador</p>
        <h1 className="sect-title fluid-3xl">Crear cuenta</h1>
      </div>
      <SignupForm />
      <p className="mt-6 font-mono fluid-xs text-smoke">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-orange hover:underline">
          Ingresá acá
        </Link>
      </p>
    </div>
  );
}
