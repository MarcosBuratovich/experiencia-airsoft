"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const crearSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(40, "Máximo 40 caracteres"),
  descripcion: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  color_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Formato #RRGGBB")
    .optional()
    .or(z.literal("")),
  logo_url: z.url("URL inválida").optional().or(z.literal("")),
});

export type CrearClanState =
  | { errors?: Partial<Record<keyof z.infer<typeof crearSchema>, string[]>>; message?: string }
  | undefined;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function crearClanAction(
  _prev: CrearClanState,
  formData: FormData,
): Promise<CrearClanState> {
  const parsed = crearSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    color_hex: formData.get("color_hex") || undefined,
    logo_url: formData.get("logo_url") || undefined,
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.clan_id) {
    return { message: "Ya pertenecés a un clan. Salí antes de crear uno nuevo." };
  }

  const base = slugify(parsed.data.nombre);
  if (!base) return { errors: { nombre: ["Nombre inválido"] } };

  let slug = base;
  for (let i = 2; i < 20; i++) {
    const { data: existing } = await supabase
      .from("clanes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }

  const { data: clan, error: insertError } = await supabase
    .from("clanes")
    .insert({
      slug,
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion || null,
      color_hex: parsed.data.color_hex || null,
      logo_url: parsed.data.logo_url || null,
      capitan_id: user.id,
    })
    .select("id, slug")
    .single();
  if (insertError || !clan) {
    return { message: insertError?.message ?? "No se pudo crear el clan" };
  }

  // el capitán pasa a ser miembro del clan que acaba de crear
  await supabase.from("profiles").update({ clan_id: clan.id }).eq("id", user.id);

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  redirect(`/clanes/${clan.slug}`);
}

export async function solicitarUnirseAction(clanId: string, mensaje?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.clan_id) return { error: "Ya pertenecés a un clan" };

  const { data: existing } = await supabase
    .from("clan_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (existing) return { error: "Ya tenés una solicitud pendiente" };

  const { error } = await supabase.from("clan_requests").insert({
    clan_id: clanId,
    user_id: user.id,
    mensaje: mensaje?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath(`/clanes`);
  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function cancelarSolicitudAction(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("clan_requests")
    .update({ estado: "cancelado", resolved_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("estado", "pendiente");
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}

async function esCapitanDeSolicitud(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestId: string,
): Promise<{ clanId: string; requesterId: string } | null> {
  const { data } = await supabase
    .from("clan_requests")
    .select("id, user_id, clan_id, clanes!inner(capitan_id)")
    .eq("id", requestId)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!data) return null;
  const capitan = Array.isArray(data.clanes) ? data.clanes[0] : data.clanes;
  if (capitan?.capitan_id !== userId) return null;
  return { clanId: data.clan_id, requesterId: data.user_id };
}

export async function aprobarSolicitudAction(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const ctx = await esCapitanDeSolicitud(supabase, user.id, requestId);
  if (!ctx) return { error: "No autorizado o solicitud no encontrada" };

  // verificar que el solicitante sigue sin clan
  const { data: requester } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", ctx.requesterId)
    .maybeSingle();
  if (requester?.clan_id) return { error: "El usuario ya está en otro clan" };

  const { error: upErr } = await supabase
    .from("clan_requests")
    .update({
      estado: "aprobado",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (upErr) return { error: upErr.message };

  const { error: profErr } = await supabase
    .from("profiles")
    .update({ clan_id: ctx.clanId })
    .eq("id", ctx.requesterId);
  if (profErr) return { error: profErr.message };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function rechazarSolicitudAction(requestId: string, respuesta?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const ctx = await esCapitanDeSolicitud(supabase, user.id, requestId);
  if (!ctx) return { error: "No autorizado o solicitud no encontrada" };

  const { error } = await supabase
    .from("clan_requests")
    .update({
      estado: "rechazado",
      respuesta: respuesta?.trim() || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) return { error: error.message };

  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function expulsarMiembroAction(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (userId === user.id) return { error: "No podés expulsarte a vos mismo" };

  // encontrar clan del capitán
  const { data: miClan } = await supabase
    .from("clanes")
    .select("id")
    .eq("capitan_id", user.id)
    .maybeSingle();
  if (!miClan) return { error: "No sos capitán de ningún clan" };

  // validar que el user está en ese clan
  const { data: target } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", userId)
    .maybeSingle();
  if (target?.clan_id !== miClan.id) return { error: "Ese usuario no está en tu clan" };

  const { error } = await supabase
    .from("profiles")
    .update({ clan_id: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function salirDelClanAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.clan_id) return { error: "No pertenecés a ningún clan" };

  const { data: clan } = await supabase
    .from("clanes")
    .select("capitan_id")
    .eq("id", profile.clan_id)
    .maybeSingle();
  if (clan?.capitan_id === user.id) {
    return {
      error: "Sos el capitán: transferí la capitanía a otro miembro o eliminá el clan antes de salir",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ clan_id: null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function transferirCapitaniaAction(nuevoCapitanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: miClan } = await supabase
    .from("clanes")
    .select("id")
    .eq("capitan_id", user.id)
    .maybeSingle();
  if (!miClan) return { error: "No sos capitán de ningún clan" };

  const { data: target } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", nuevoCapitanId)
    .maybeSingle();
  if (target?.clan_id !== miClan.id) return { error: "Ese usuario no está en tu clan" };

  const { error } = await supabase
    .from("clanes")
    .update({ capitan_id: nuevoCapitanId })
    .eq("id", miClan.id);
  if (error) return { error: error.message };

  revalidatePath("/mi-clan");
  revalidatePath("/clanes");
  return { ok: true };
}

export async function eliminarClanAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: miClan } = await supabase
    .from("clanes")
    .select("id")
    .eq("capitan_id", user.id)
    .maybeSingle();
  if (!miClan) return { error: "No sos capitán de ningún clan" };

  // ON DELETE SET NULL en profiles.clan_id limpia a los miembros automaticamente
  const { error } = await supabase.from("clanes").delete().eq("id", miClan.id);
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}
