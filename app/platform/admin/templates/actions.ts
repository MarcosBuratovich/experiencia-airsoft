"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { modalidadLabel } from "@/lib/format";
import { diaSemanaDe, fechasSemanaProxima } from "@/lib/semana";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { error: "No autorizado" as const };
  }
  return { supabase, userId: user.id };
}

export async function generarSemanaProximaAction() {
  const ctx = await assertAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, userId } = ctx;

  const { data: templates, error: tplErr } = await supabase
    .from("partida_templates")
    .select("id, dia_semana, hora_inicio, duracion_min, modalidad, cupo_max, activo")
    .eq("activo", true);
  if (tplErr) return { error: tplErr.message };
  if (!templates?.length) return { ok: true, creadas: 0, omitidas: 0 };

  const fechas = fechasSemanaProxima();
  let creadas = 0;
  let omitidas = 0;

  for (const fecha of fechas) {
    const dow = diaSemanaDe(fecha);
    const hoyTemplates = templates.filter((t) => t.dia_semana === dow);
    for (const tpl of hoyTemplates) {
      // Normalizar hora a formato 'HH:MM:SS'
      const hora = tpl.hora_inicio.length === 5 ? `${tpl.hora_inicio}:00` : tpl.hora_inicio;

      const { data: existing } = await supabase
        .from("partidas")
        .select("id")
        .eq("fecha", fecha)
        .eq("hora_inicio", hora)
        .eq("modalidad", tpl.modalidad)
        .maybeSingle();

      if (existing) {
        omitidas++;
        continue;
      }

      const { error: insErr } = await supabase.from("partidas").insert({
        titulo: modalidadLabel(tpl.modalidad),
        fecha,
        hora_inicio: hora,
        duracion_min: tpl.duracion_min,
        modalidad: tpl.modalidad,
        cupo_max: tpl.cupo_max,
        visibilidad: "publica",
        precio: 0,
        creado_por: userId,
      });
      if (insErr) return { error: insErr.message, creadas, omitidas };
      creadas++;
    }
  }

  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  return { ok: true, creadas, omitidas };
}

const updateSchema = z.object({
  id: z.uuid(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duracion_min: z.coerce.number().int().min(60).max(480),
  modalidad: z.enum(["dinamica", "tacsim", "speedsoft"]),
  cupo_max: z.coerce.number().int().min(1).max(60),
  activo: z.boolean(),
});

export async function actualizarTemplateAction(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const ctx = await assertAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { error } = await supabase
    .from("partida_templates")
    .update({
      hora_inicio: `${parsed.data.hora_inicio}:00`,
      duracion_min: parsed.data.duracion_min,
      modalidad: parsed.data.modalidad,
      cupo_max: parsed.data.cupo_max,
      activo: parsed.data.activo,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/templates");
  return { ok: true };
}
