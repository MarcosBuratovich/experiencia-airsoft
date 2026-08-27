import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateRow } from "./template-row";
import { NuevoTemplateForm } from "./nuevo-template-form";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/templates");

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
          Partidas recurrentes que aparecen en el preview de &ldquo;Generar
          semana&rdquo;. Podés tener varios templates en el mismo día (ej. dos
          horarios distintos) y combinarlos por modalidad. Dejá un template
          inactivo para suspenderlo sin borrarlo.
        </p>
      </div>

      <div className="mb-4">
        <NuevoTemplateForm />
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
              No hay templates todavía. Creá el primero con &ldquo;Nuevo
              template&rdquo;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
