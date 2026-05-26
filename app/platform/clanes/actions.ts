"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pasaContrasteInk } from "@/lib/clanes";

/** Cuenta grafemas (emojis cuentan como 1, no como N code points). */
function aliasLen(s: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

const ALIAS_MAX = 10;

const aliasSchema = z
  .string()
  .trim()
  .refine((s) => s.length === 0 || aliasLen(s) >= 1, "Alias no puede estar vacío")
  .refine(
    (s) => aliasLen(s) <= ALIAS_MAX,
    `Máximo ${ALIAS_MAX} caracteres (emojis cuentan como 1)`,
  );

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Formato #RRGGBB")
  .refine(
    (v) => pasaContrasteInk(v),
    "Color muy oscuro: no se va a leer sobre el fondo de la app. Elegí un color más claro.",
  );

const displayModeSchema = z.enum(["alias", "logo"]).default("alias");

const crearSchema = z
  .object({
    nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(40, "Máximo 40 caracteres"),
    alias: aliasSchema,
    display_mode: displayModeSchema,
    descripcion: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
    color_hex: colorSchema,
    logo_url: z.url("URL inválida").optional().or(z.literal("")),
  })
  .refine(
    (data) => data.display_mode !== "alias" || aliasLen(data.alias) >= 1,
    {
      message: "El alias es obligatorio si elegís mostrarlo como texto",
      path: ["alias"],
    },
  )
  .refine(
    (data) => data.display_mode !== "logo" || !!(data.logo_url && data.logo_url.length > 0),
    {
      message: "Subí o cargá una URL de logo si elegís mostrar imagen",
      path: ["logo_url"],
    },
  );

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
    alias: formData.get("alias") ?? "",
    display_mode: formData.get("display_mode") ?? "alias",
    descripcion: formData.get("descripcion") || undefined,
    color_hex: formData.get("color_hex") || "",
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

  // Validar que no esté ya en 3 clanes
  const { count: cuantos } = await supabase
    .from("profile_clanes")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);
  if ((cuantos ?? 0) >= 3) {
    return { message: "Ya estás en 3 clanes. Salí de uno antes de crear." };
  }

  const { data: clan, error: insertError } = await supabase
    .from("clanes")
    .insert({
      slug,
      nombre: parsed.data.nombre,
      alias: parsed.data.alias || null,
      display_mode: parsed.data.display_mode,
      descripcion: parsed.data.descripcion || null,
      color_hex: parsed.data.color_hex,
      logo_url: parsed.data.logo_url || null,
      capitan_id: user.id,
    })
    .select("id, slug")
    .single();
  if (insertError || !clan) {
    return { message: insertError?.message ?? "No se pudo crear el clan" };
  }

  await addMemberToClan(supabase, user.id, clan.id);

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  redirect(`/clanes/${clan.slug}`);
}

const MAX_CLANES_POR_USER = 3;

/**
 * Inserta (user, clan) en profile_clanes en la próxima posición libre y
 * mantiene profiles.clan_id en sync (apunta al primer clan del usuario)
 * para compat con código que todavía lee la columna vieja.
 */
async function addMemberToClan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clanId: string,
): Promise<{ error?: string }> {
  // Buscar posiciones ocupadas
  const { data: actuales } = await supabase
    .from("profile_clanes")
    .select("clan_id, posicion")
    .eq("profile_id", userId)
    .order("posicion");

  if ((actuales ?? []).some((r) => r.clan_id === clanId)) {
    return { error: "Ya sos miembro de ese clan" };
  }
  if ((actuales ?? []).length >= MAX_CLANES_POR_USER) {
    return { error: `Máximo ${MAX_CLANES_POR_USER} clanes por usuario` };
  }

  const ocupadas = new Set((actuales ?? []).map((r) => r.posicion));
  let posicion = 1;
  while (ocupadas.has(posicion)) posicion++;

  const { error } = await supabase.from("profile_clanes").insert({
    profile_id: userId,
    clan_id: clanId,
    posicion,
  });
  if (error) return { error: error.message };

  await syncProfileClanIdLegacy(supabase, userId);
  return {};
}

async function removeMemberFromClan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clanId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("profile_clanes")
    .delete()
    .eq("profile_id", userId)
    .eq("clan_id", clanId);
  if (error) return { error: error.message };

  await syncProfileClanIdLegacy(supabase, userId);
  return {};
}

/** Mantiene profiles.clan_id apuntando al clan de menor posicion (o null). */
async function syncProfileClanIdLegacy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("profile_clanes")
    .select("clan_id")
    .eq("profile_id", userId)
    .order("posicion")
    .limit(1)
    .maybeSingle();
  await supabase
    .from("profiles")
    .update({ clan_id: data?.clan_id ?? null })
    .eq("id", userId);
}

export async function solicitarUnirseAction(clanId: string, mensaje?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: actuales, count } = await supabase
    .from("profile_clanes")
    .select("clan_id", { count: "exact" })
    .eq("profile_id", user.id);
  if ((count ?? 0) >= MAX_CLANES_POR_USER) {
    return { error: `Ya pertenecés a ${MAX_CLANES_POR_USER} clanes. Salí de uno antes.` };
  }
  if ((actuales ?? []).some((r) => r.clan_id === clanId)) {
    return { error: "Ya sos miembro de ese clan" };
  }

  // Una solicitud pendiente por (user, clan).
  const { data: existing } = await supabase
    .from("clan_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("clan_id", clanId)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (existing) return { error: "Ya tenés una solicitud pendiente a este clan" };

  const { error } = await supabase.from("clan_requests").insert({
    clan_id: clanId,
    user_id: user.id,
    mensaje: mensaje?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath(`/clanes/[slug]`, "page");
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

  // verificar que el solicitante todavía tiene espacio
  const { data: actuales, count } = await supabase
    .from("profile_clanes")
    .select("clan_id", { count: "exact" })
    .eq("profile_id", ctx.requesterId);
  if ((count ?? 0) >= MAX_CLANES_POR_USER) {
    return { error: `El usuario ya está en ${MAX_CLANES_POR_USER} clanes.` };
  }
  if ((actuales ?? []).some((r) => r.clan_id === ctx.clanId)) {
    return { error: "El usuario ya es miembro de tu clan" };
  }

  const { error: upErr } = await supabase
    .from("clan_requests")
    .update({
      estado: "aprobado",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (upErr) return { error: upErr.message };

  const addRes = await addMemberToClan(supabase, ctx.requesterId, ctx.clanId);
  if (addRes.error) return { error: addRes.error };

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

export async function expulsarMiembroAction(userId: string, clanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (userId === user.id) return { error: "No podés expulsarte a vos mismo" };

  const { data: clan } = await supabase
    .from("clanes")
    .select("id, capitan_id")
    .eq("id", clanId)
    .maybeSingle();
  if (!clan || clan.capitan_id !== user.id) {
    return { error: "No sos capitán de ese clan" };
  }

  const { data: membership } = await supabase
    .from("profile_clanes")
    .select("profile_id")
    .eq("profile_id", userId)
    .eq("clan_id", clanId)
    .maybeSingle();
  if (!membership) return { error: "Ese usuario no está en tu clan" };

  const res = await removeMemberFromClan(supabase, userId, clanId);
  if (res.error) return { error: res.error };

  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function salirDelClanAction(clanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("profile_clanes")
    .select("profile_id")
    .eq("profile_id", user.id)
    .eq("clan_id", clanId)
    .maybeSingle();
  if (!membership) return { error: "No pertenecés a ese clan" };

  const { data: clan } = await supabase
    .from("clanes")
    .select("capitan_id")
    .eq("id", clanId)
    .maybeSingle();
  if (clan?.capitan_id === user.id) {
    return {
      error: "Sos el capitán: transferí la capitanía o eliminá el clan antes de salir",
    };
  }

  const res = await removeMemberFromClan(supabase, user.id, clanId);
  if (res.error) return { error: res.error };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}

export async function transferirCapitaniaAction(
  nuevoCapitanId: string,
  clanId: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: clan } = await supabase
    .from("clanes")
    .select("id, capitan_id")
    .eq("id", clanId)
    .maybeSingle();
  if (!clan || clan.capitan_id !== user.id) {
    return { error: "No sos capitán de ese clan" };
  }

  const { data: membership } = await supabase
    .from("profile_clanes")
    .select("profile_id")
    .eq("profile_id", nuevoCapitanId)
    .eq("clan_id", clanId)
    .maybeSingle();
  if (!membership) return { error: "Ese usuario no está en tu clan" };

  const { error } = await supabase
    .from("clanes")
    .update({ capitan_id: nuevoCapitanId })
    .eq("id", clanId);
  if (error) return { error: error.message };

  revalidatePath("/mi-clan");
  revalidatePath("/clanes");
  return { ok: true };
}

export async function eliminarClanAction(clanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: clan } = await supabase
    .from("clanes")
    .select("id, capitan_id")
    .eq("id", clanId)
    .maybeSingle();
  if (!clan || clan.capitan_id !== user.id) {
    return { error: "No sos capitán de ese clan" };
  }

  // ON DELETE CASCADE en profile_clanes y SET NULL en profiles.clan_id
  // limpian las membresías automaticamente.
  const { error } = await supabase.from("clanes").delete().eq("id", clan.id);
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}
