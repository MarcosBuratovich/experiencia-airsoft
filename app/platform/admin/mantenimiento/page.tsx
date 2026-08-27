import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MigrarLogosBoton } from "./migrar-logos-boton";

export default async function MantenimientoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/mantenimiento");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    redirect("/admin/partidas");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/admin/partidas"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Admin
      </Link>

      <div className="mt-4 mb-8">
        <p className="sect-label mb-2">Admin · mantenimiento</p>
        <h1 className="sect-title fluid-3xl">Tareas one-shot</h1>
        <p className="mt-3 text-ash fluid-sm">
          Acciones puntuales de mantenimiento. Se pueden ejecutar varias veces
          sin riesgo — son idempotentes.
        </p>
      </div>

      <section className="border border-rail/60 bg-carbon clip-notch p-5 sm:p-6 mb-6">
        <p className="sect-label mb-2">// Migrar logos de clanes</p>
        <h2 className="font-display fluid-xl uppercase tracking-wider text-bone mb-3">
          Mover logos de pending/ a carpeta del clan
        </h2>
        <p className="font-sans fluid-sm text-ash leading-relaxed mb-4">
          Los clanes creados antes del fix subían su logo a una carpeta
          común <code className="font-mono text-orange">pending/</code> en
          Storage. Ahora cada clan tiene su propia carpeta. Este botón mueve
          los archivos viejos a la carpeta del slug correspondiente y
          actualiza la URL en la base de datos.
        </p>
        <p className="font-mono fluid-xs text-smoke mb-4">
          Idempotente: si ya están en su lugar, no hace nada.
        </p>
        <MigrarLogosBoton />
      </section>
    </div>
  );
}
