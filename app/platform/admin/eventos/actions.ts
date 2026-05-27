"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_EVENTO } from "@/lib/match-events";
import { inicioPartida } from "@/lib/partidas";

import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return ERR("No autorizado");
  }
  return { supabase, userId: user.id };
}

export async function reasignarEventoAction(
  eventoId: string,
  partidaId: string,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  // Validar que la partida existe
  const { data: partida } = await supabase
    .from("partidas")
    .select("id")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return ERR("Partida no encontrada");

  // Si el evento tenía user_id null (player_number desconocido), no se puede
  // reasignar — esa info ya se perdió. Solo reasignamos si tenía user_id pero
  // no encontró partida activa.
  const { data: evento } = await supabase
    .from("match_events")
    .select("user_id")
    .eq("id", eventoId)
    .maybeSingle();
  if (!evento) return ERR("Evento no encontrado");
  if (!evento.user_id) {
    return {
      error:
        "El evento no tiene jugador resuelto (player_number desconocido). Borralo o asigná el número primero.",
    };
  }

  const { error } = await supabase
    .from("match_events")
    .update({
      partida_id: partidaId,
      status: "aceptado",
      reason: null,
    })
    .eq("id", eventoId);
  if (error) return ERR(error);

  revalidatePath("/admin/eventos");
  revalidatePath("/ranking");
  revalidatePath(`/partidas/${partidaId}/scoreboard`);
  return { ok: true };
}

export async function descartarEventoAction(eventoId: string) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const { error } = await supabase
    .from("match_events")
    .delete()
    .eq("id", eventoId);
  if (error) return ERR(error);

  revalidatePath("/admin/eventos");
  revalidatePath("/ranking");
  return { ok: true };
}

const carga = z.object({
  partida_id: z.uuid(),
  eventos: z
    .array(
      z.object({
        user_id: z.uuid(),
        player_number: z.string().regex(/^\d{6}$/),
        tipo: z.enum(TIPOS_EVENTO),
        count: z.number().int().min(0).max(99),
      }),
    )
    .min(1),
});

export type CargaEventosInput = z.infer<typeof carga>;

export async function cargarEventosManualesAction(input: CargaEventosInput) {
  const parsed = carga.safeParse(input);
  if (!parsed.success) {
    return ERR(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio")
    .eq("id", parsed.data.partida_id)
    .maybeSingle();
  if (!partida) return ERR("Partida no encontrada");

  // Generamos un evento por cada count > 0. local_event_id sintético con
  // prefijo `manual-` para distinguirlos del feed real.
  const occurred_at = inicioPartida(partida.fecha, partida.hora_inicio).toISOString();
  const filas: Array<{
    partida_id: string;
    user_id: string;
    player_number: string;
    tipo: string;
    local_event_id: string;
    occurred_at: string;
    status: string;
    raw: { manual: true };
  }> = [];

  for (const e of parsed.data.eventos) {
    for (let i = 0; i < e.count; i++) {
      filas.push({
        partida_id: parsed.data.partida_id,
        user_id: e.user_id,
        player_number: e.player_number,
        tipo: e.tipo,
        local_event_id: `manual-${parsed.data.partida_id}-${e.user_id}-${e.tipo}-${i}-${crypto.randomUUID().slice(0, 8)}`,
        occurred_at,
        status: "aceptado",
        raw: { manual: true },
      });
    }
  }

  if (filas.length === 0) {
    return { ok: true, insertados: 0 };
  }

  const { error } = await supabase.from("match_events").insert(filas);
  if (error) return ERR(error);

  revalidatePath("/admin/eventos");
  revalidatePath("/ranking");
  revalidatePath(`/partidas/${parsed.data.partida_id}/scoreboard`);
  return { ok: true, insertados: filas.length };
}
