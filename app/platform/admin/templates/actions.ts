"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { modalidadLabel } from "@/lib/format";
import {
  diaSemanaDe,
  fechasSemanaActualDesdeHoy,
  fechasSemanaProxima,
} from "@/lib/semana";
import type { PartidaPreviewItem, SemanaSel } from "./types";

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

function normalizarHora(h: string): string {
  return h.length === 5 ? `${h}:00` : h;
}

export async function getPreviewSemanaAction({ semana }: { semana: SemanaSel }) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;

  const { data: templates, error: tplErr } = await supabase
    .from("partida_templates")
    .select("id, dia_semana, hora_inicio, duracion_min, modalidad, cupo_max")
    .eq("activo", true);
  if (tplErr) return { error: tplErr.message };

  const fechas =
    semana === "actual" ? fechasSemanaActualDesdeHoy() : fechasSemanaProxima();

  const base: Omit<PartidaPreviewItem, "yaExiste">[] = [];
  for (const fecha of fechas) {
    const dow = diaSemanaDe(fecha);
    const delDia = (templates ?? []).filter((t) => t.dia_semana === dow);
    for (const tpl of delDia) {
      const hora = normalizarHora(tpl.hora_inicio);
      base.push({
        key: `${fecha}|${tpl.id}`,
        templateId: tpl.id,
        fecha,
        hora_inicio: hora,
        duracion_min: tpl.duracion_min,
        modalidad: tpl.modalidad,
        cupo_max: tpl.cupo_max,
      });
    }
  }

  if (!base.length) return { ok: true, items: [] as PartidaPreviewItem[] };

  const fechasUnicas = [...new Set(base.map((i) => i.fecha))];
  const { data: existentes, error: existErr } = await supabase
    .from("partidas")
    .select("fecha, hora_inicio, modalidad")
    .in("fecha", fechasUnicas);
  if (existErr) return { error: existErr.message };

  const existSet = new Set(
    (existentes ?? []).map(
      (e) => `${e.fecha}|${normalizarHora(e.hora_inicio)}|${e.modalidad}`,
    ),
  );

  const items: PartidaPreviewItem[] = base.map((i) => ({
    ...i,
    yaExiste: existSet.has(`${i.fecha}|${i.hora_inicio}|${i.modalidad}`),
  }));

  return { ok: true, items };
}

const generarSchema = z.object({
  items: z
    .array(
      z.object({
        templateId: z.uuid(),
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      }),
    )
    .min(1, "Sin selección"),
});

export async function generarPartidasSeleccionadasAction(
  input: z.infer<typeof generarSchema>,
) {
  const parsed = generarSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const ctx = await assertAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, userId } = ctx;

  const tplIds = [...new Set(parsed.data.items.map((i) => i.templateId))];
  const { data: templates, error: tplErr } = await supabase
    .from("partida_templates")
    .select("id, hora_inicio, duracion_min, modalidad, cupo_max")
    .in("id", tplIds);
  if (tplErr) return { error: tplErr.message };
  const tplById = new Map((templates ?? []).map((t) => [t.id, t]));

  let creadas = 0;
  let omitidas = 0;

  for (const { fecha, templateId } of parsed.data.items) {
    const tpl = tplById.get(templateId);
    if (!tpl) {
      omitidas++;
      continue;
    }
    const hora = normalizarHora(tpl.hora_inicio);

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
