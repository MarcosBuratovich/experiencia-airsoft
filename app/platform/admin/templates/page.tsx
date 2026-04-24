import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateRow } from "./template-row";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") {
    redirect("/admin/partidas");
  }

  const { data: templates } = await supabase
    .from("partida_templates")
    .select("id, dia_semana, hora_inicio, duracion_min, modalidad, cupo_max, activo")
    .order("dia_semana")
    .order("hora_inicio");

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · super</p>
        <h1 className="sect-title fluid-3xl">Templates</h1>
        <p className="mt-3 text-ash fluid-sm">
          Partidas recurrentes que se generan cada semana con el botón
          &ldquo;Generar semana&rdquo; en el listado admin. Dejá un template
          inactivo para suspenderlo sin borrarlo.
        </p>
      </div>

      <div className="space-y-3">
        {(templates ?? []).map((t) => (
          <TemplateRow
            key={t.id}
            template={{
              id: t.id,
              dia_semana: t.dia_semana,
              hora_inicio: t.hora_inicio.slice(0, 5),
              duracion_min: t.duracion_min,
              modalidad: t.modalidad,
              cupo_max: t.cupo_max,
              activo: t.activo,
            }}
          />
        ))}
        {!templates?.length && (
          <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
            <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
              No hay templates. Corré la migración 3F para cargar los 4 por defecto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
