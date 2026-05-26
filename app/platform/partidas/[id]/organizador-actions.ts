"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function assertOrganizadorOAdmin(partidaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, organizador_id, cupo_max, estado, visibilidad")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return { error: "Partida no encontrada" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";
  const isOrg = partida.organizador_id === user.id;
  if (!isOrg && !isAdmin) return { error: "No autorizado" as const };

  return { supabase, user, partida, isAdmin };
}

const addGuestSchema = z.object({
  partidaId: z.uuid(),
  nombre: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
});

export async function addGuestAction(input: z.infer<typeof addGuestSchema>) {
  const parsed = addGuestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const ctx = await assertOrganizadorOAdmin(parsed.data.partidaId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, user, partida } = ctx;

  if (partida.estado === "cancelada") {
    return { error: "La partida está cancelada" };
  }

  // Calcular si entra como confirmado o waitlist según cupo.
  const { count } = await supabase
    .from("inscripciones")
    .select("*", { count: "exact", head: true })
    .eq("partida_id", partida.id)
    .eq("estado", "confirmado");

  const estado = (count ?? 0) >= partida.cupo_max ? "waitlist" : "confirmado";
  let posicion_waitlist: number | null = null;
  if (estado === "waitlist") {
    const { count: wlCount } = await supabase
      .from("inscripciones")
      .select("*", { count: "exact", head: true })
      .eq("partida_id", partida.id)
      .eq("estado", "waitlist");
    posicion_waitlist = (wlCount ?? 0) + 1;
  }

  const { error } = await supabase.from("inscripciones").insert({
    partida_id: partida.id,
    user_id: null,
    guest_nombre: parsed.data.nombre,
    agregado_por: user.id,
    estado,
    posicion_waitlist,
    tipo_jugador: "byop",
    alquila_marcadora: false,
    alquila_chaleco: false,
    precio_entrada: 0,
    precio_alquiler: 0,
  });
  if (error) return { error: error.message };

  revalidatePath(`/partidas/${partida.id}`);
  return { ok: true, estado };
}

const removeSchema = z.object({
  inscripcionId: z.uuid(),
});

export async function quitarInscripcionAction(input: z.infer<typeof removeSchema>) {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { error: "ID inválido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id, partida_id, user_id, partidas!inner(organizador_id)")
    .eq("id", parsed.data.inscripcionId)
    .maybeSingle();
  if (!insc) return { error: "Inscripción no encontrada" };

  const partidaInfo = Array.isArray(insc.partidas)
    ? insc.partidas[0]
    : insc.partidas;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";
  const isOrg = partidaInfo?.organizador_id === user.id;

  if (!isAdmin && !isOrg) return { error: "No autorizado" };

  const { error } = await supabase
    .from("inscripciones")
    .delete()
    .eq("id", parsed.data.inscripcionId);
  if (error) return { error: error.message };

  revalidatePath(`/partidas/${insc.partida_id}`);
  return { ok: true };
}
