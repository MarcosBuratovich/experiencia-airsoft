"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pasaContrasteInk } from "@/lib/clanes";
import {
  countEmojis,
  detectBadPattern,
  graphemeLen,
  hasExcessiveRepeat,
  isCleanText,
} from "@/lib/sanitize-text";

const aliasLen = graphemeLen;

const ALIAS_MAX = 10;

const aliasSchema = z
  .string()
  .trim()
  .refine((s) => s.length === 0 || aliasLen(s) >= 1, "Alias no puede estar vacío")
  .refine(
    (s) => aliasLen(s) <= ALIAS_MAX,
    `Máximo ${ALIAS_MAX} caracteres (emojis cuentan como 1)`,
  )
  .refine(
    (s) => isCleanText(s),
    "Contenido no permitido (HTML, URLs, markdown o caracteres de control)",
  )
  .refine(
    (s) => countEmojis(s) <= 3,
    "Máximo 3 emojis en el alias",
  )
  .refine(
    (s) => !hasExcessiveRepeat(s, 4),
    "No repitas el mismo caracter más de 4 veces",
  );

const nombreSchema = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(40, "Máximo 40 caracteres")
  .refine(
    (s) => isCleanText(s),
    "Contenido no permitido (HTML, URLs, markdown o caracteres de control)",
  )
  .refine(
    (s) => countEmojis(s) <= 2,
    "Máximo 2 emojis en el nombre",
  )
  .refine(
    (s) => !hasExcessiveRepeat(s, 4),
    "No repitas el mismo caracter más de 4 veces",
  );

const descripcionSchema = z
  .string()
  .trim()
  .max(500, "Máximo 500 caracteres")
  .refine(
    (s) => !s || isCleanText(s),
    "Contenido no permitido (HTML, URLs, markdown o caracteres de control)",
  )
  .refine(
    (s) => !s || countEmojis(s) <= 15,
    "Máximo 15 emojis en la descripción",
  )
  .refine(
    (s) => !s || !hasExcessiveRepeat(s, 5),
    "No repitas el mismo caracter más de 5 veces seguidas",
  )
  .optional();

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Formato #RRGGBB")
  .refine(
    (v) => pasaContrasteInk(v),
    "Color muy oscuro: no se va a leer sobre el fondo de la app. Elegí un color más claro.",
  );

const displayModeSchema = z.enum(["alias", "logo"]).default("alias");

// Validación de URLs sociales: solo aceptamos https + dominio oficial.
// El constraint en la DB (phase-14) replica esto como defense-in-depth.
const youtubeUrlSchema = z
  .string()
  .trim()
  .max(300, "URL muy larga (máx 300 caracteres)")
  .regex(
    /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//,
    "Tiene que ser un link de youtube.com, youtu.be o m.youtube.com (con https)",
  )
  .optional()
  .or(z.literal(""));

const instagramUrlSchema = z
  .string()
  .trim()
  .max(300, "URL muy larga (máx 300 caracteres)")
  .regex(
    /^https:\/\/(www\.)?instagram\.com\//,
    "Tiene que ser un link de instagram.com (con https)",
  )
  .optional()
  .or(z.literal(""));

const crearSchema = z
  .object({
    nombre: nombreSchema,
    alias: aliasSchema,
    display_mode: displayModeSchema,
    descripcion: descripcionSchema,
    color_hex: colorSchema,
    logo_url: z.url("URL inválida").optional().or(z.literal("")),
    youtube_url: youtubeUrlSchema,
    instagram_url: instagramUrlSchema,
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

/** ¿Ya existe un clan con ese nombre (case-insensitive)? */
async function clanNombreOcupado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nombre: string,
  exceptId?: string,
): Promise<boolean> {
  const query = supabase
    .from("clanes")
    .select("id")
    .ilike("nombre", nombre.trim())
    .limit(1);
  if (exceptId) query.neq("id", exceptId);
  const { data } = await query.maybeSingle();
  return !!data;
}

/** ¿Ya existe un clan con ese alias (case-insensitive)? */
async function clanAliasOcupado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alias: string,
  exceptId?: string,
): Promise<boolean> {
  const query = supabase
    .from("clanes")
    .select("id")
    .ilike("alias", alias.trim())
    .limit(1);
  if (exceptId) query.neq("id", exceptId);
  const { data } = await query.maybeSingle();
  return !!data;
}

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
  const inputRaw = {
    nombre: formData.get("nombre"),
    alias: formData.get("alias") ?? "",
    display_mode: formData.get("display_mode") ?? "alias",
    descripcion: formData.get("descripcion") || undefined,
    color_hex: formData.get("color_hex") || "",
    logo_url: formData.get("logo_url") || undefined,
    youtube_url: formData.get("youtube_url") || "",
    instagram_url: formData.get("instagram_url") || "",
  };
  const parsed = crearSchema.safeParse(inputRaw);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    console.warn("[crearClanAction] validación falló:", {
      input: { nombre: inputRaw.nombre, alias: inputRaw.alias },
      errors: fieldErrors,
    });
    return { errors: fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado" };

  // Validar que no esté ya en 3 clanes
  const { count: cuantos } = await supabase
    .from("profile_clanes")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);
  if ((cuantos ?? 0) >= 3) {
    return { message: "Ya estás en 3 clanes. Salí de uno antes de crear." };
  }

  const base = slugify(parsed.data.nombre);
  if (!base) return { errors: { nombre: ["Nombre inválido"] } };

  // Nombre único (case-insensitive)
  const nombreOcupado = await clanNombreOcupado(supabase, parsed.data.nombre);
  if (nombreOcupado) {
    return {
      errors: { nombre: ["Ya existe un clan con ese nombre. Elegí otro."] },
    };
  }

  // Alias único (case-insensitive, solo si no es vacío)
  if (parsed.data.alias) {
    const aliasOcupado = await clanAliasOcupado(supabase, parsed.data.alias);
    if (aliasOcupado) {
      return {
        errors: { alias: ["Ese alias ya está en uso por otro clan."] },
      };
    }
  }

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
      alias: parsed.data.alias || null,
      display_mode: parsed.data.display_mode,
      descripcion: parsed.data.descripcion || null,
      color_hex: parsed.data.color_hex,
      logo_url: parsed.data.logo_url || null,
      youtube_url: parsed.data.youtube_url || null,
      instagram_url: parsed.data.instagram_url || null,
      capitan_id: user.id,
    })
    .select("id, slug")
    .single();
  if (insertError || !clan) {
    console.error("[crearClanAction] insert falló:", {
      userId: user.id,
      nombre: parsed.data.nombre,
      slug,
      pgError: insertError,
    });
    // Mensajes específicos para los errores de unique index (race
    // condition con el check de arriba o si la migración hizo crash).
    if (insertError?.code === "23505") {
      if (insertError.message.includes("nombre")) {
        return { errors: { nombre: ["Ya existe un clan con ese nombre."] } };
      }
      if (insertError.message.includes("alias")) {
        return { errors: { alias: ["Ese alias ya está en uso por otro clan."] } };
      }
    }
    return {
      message:
        insertError?.message ??
        "No se pudo crear el clan (error desconocido — escribime por WhatsApp si pasa de nuevo)",
    };
  }

  // Si el logo se subió a pending/ (caso default al crear, porque al
  // momento del upload el clan todavía no existe), lo movemos a la
  // carpeta del slug. Así los assets quedan organizados.
  if (parsed.data.logo_url) {
    const moved = await moverLogoPendingASlug(
      supabase,
      parsed.data.logo_url,
      clan.slug,
    );
    if (moved && moved !== parsed.data.logo_url) {
      await supabase
        .from("clanes")
        .update({ logo_url: moved })
        .eq("id", clan.id);
    }
  }

  await addMemberToClan(supabase, user.id, clan.id);

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  redirect(`/clanes/${clan.slug}`);
}

/**
 * Si `logoUrl` apunta a `clan-logos/pending/<file>`, mueve el archivo a
 * `clan-logos/<slug>/<file>` y devuelve la nueva public URL. Si no es
 * un upload pending o falla el move, devuelve la URL original (la app
 * sigue funcionando, solo queda el archivo en pending/ — orgánicamente
 * lo levanta el cleanup del LogoUploader en el próximo upload).
 */
async function moverLogoPendingASlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  logoUrl: string,
  slug: string,
): Promise<string | null> {
  const match = logoUrl.match(/\/clan-logos\/pending\/([^/?]+)/);
  if (!match) return logoUrl;
  const filename = match[1];
  const oldPath = `pending/${filename}`;
  const newPath = `${slug}/${filename}`;

  const { error: moveErr } = await supabase.storage
    .from("clan-logos")
    .move(oldPath, newPath);
  if (moveErr) {
    console.warn("[crearClanAction] move logo falló:", moveErr.message);
    return logoUrl;
  }

  const { data: pub } = supabase.storage
    .from("clan-logos")
    .getPublicUrl(newPath);
  return pub.publicUrl;
}

const MAX_CLANES_POR_USER = 3;

/**
 * Inserta (user, clan) en profile_clanes en la próxima posición libre.
 */
async function addMemberToClan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clanId: string,
): Promise<{ error?: string }> {
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
  return {};
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

const editarSchema = z
  .object({
    id: z.uuid(),
    nombre: nombreSchema,
    alias: aliasSchema,
    display_mode: displayModeSchema,
    descripcion: descripcionSchema,
    color_hex: colorSchema,
    logo_url: z.url("URL inválida").optional().or(z.literal("")),
    youtube_url: youtubeUrlSchema,
    instagram_url: instagramUrlSchema,
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

export type EditarClanState =
  | { errors?: Partial<Record<keyof z.infer<typeof editarSchema>, string[]>>; message?: string; ok?: boolean }
  | undefined;

export async function editarClanAction(
  _prev: EditarClanState,
  formData: FormData,
): Promise<EditarClanState> {
  const parsed = editarSchema.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    alias: formData.get("alias") ?? "",
    display_mode: formData.get("display_mode") ?? "alias",
    descripcion: formData.get("descripcion") || undefined,
    color_hex: formData.get("color_hex") || "",
    logo_url: formData.get("logo_url") || undefined,
    youtube_url: formData.get("youtube_url") || "",
    instagram_url: formData.get("instagram_url") || "",
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado" };

  const { data: clan } = await supabase
    .from("clanes")
    .select("id, capitan_id, slug")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!clan || clan.capitan_id !== user.id) {
    return { message: "No sos capitán de ese clan" };
  }

  // Nombre único (case-insensitive, excluyendo el propio clan)
  const nombreOcupado = await clanNombreOcupado(
    supabase,
    parsed.data.nombre,
    clan.id,
  );
  if (nombreOcupado) {
    return {
      errors: { nombre: ["Ya existe otro clan con ese nombre."] },
    };
  }

  // Alias único (case-insensitive, excluyendo el propio clan)
  if (parsed.data.alias) {
    const aliasOcupado = await clanAliasOcupado(
      supabase,
      parsed.data.alias,
      clan.id,
    );
    if (aliasOcupado) {
      return {
        errors: { alias: ["Ese alias ya está en uso por otro clan."] },
      };
    }
  }

  const { error } = await supabase
    .from("clanes")
    .update({
      nombre: parsed.data.nombre,
      alias: parsed.data.alias || null,
      display_mode: parsed.data.display_mode,
      descripcion: parsed.data.descripcion || null,
      color_hex: parsed.data.color_hex,
      logo_url: parsed.data.logo_url || null,
      youtube_url: parsed.data.youtube_url || null,
      instagram_url: parsed.data.instagram_url || null,
    })
    .eq("id", clan.id);
  if (error) return { message: error.message };

  revalidatePath("/clanes");
  revalidatePath(`/clanes/${clan.slug}`);
  revalidatePath("/mi-clan");
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

  // ON DELETE CASCADE en profile_clanes limpia las membresías automaticamente.
  const { error } = await supabase.from("clanes").delete().eq("id", clan.id);
  if (error) return { error: error.message };

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true };
}

// =========================================================================
// Migración one-shot: mover logos viejos de pending/ a {slug}/
// =========================================================================

export type MigrarLogosResult =
  | { error: string }
  | {
      ok: true;
      total: number;
      movidos: number;
      yaOk: number;
      fallidos: { slug: string; error: string }[];
    };

/**
 * Recorre todos los clanes con logo_url apuntando a /clan-logos/pending/,
 * mueve el archivo a /clan-logos/{slug}/ y actualiza la URL en DB.
 * Admin-only. Idempotente: si ya está movido, no hace nada.
 */
export async function migrarLogosPendientesAction(): Promise<MigrarLogosResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { error: "No autorizado" };
  }

  const { data: clanes, error: qErr } = await supabase
    .from("clanes")
    .select("id, slug, logo_url");
  if (qErr) return { error: qErr.message };

  let movidos = 0;
  let yaOk = 0;
  const fallidos: { slug: string; error: string }[] = [];

  for (const clan of clanes ?? []) {
    if (!clan.logo_url) {
      yaOk++;
      continue;
    }
    const match = clan.logo_url.match(/\/clan-logos\/pending\/([^/?]+)/);
    if (!match) {
      // Logo no está en pending — ya está OK.
      yaOk++;
      continue;
    }
    const filename = match[1];
    const oldPath = `pending/${filename}`;
    const newPath = `${clan.slug}/${filename}`;

    const { error: moveErr } = await supabase.storage
      .from("clan-logos")
      .move(oldPath, newPath);
    if (moveErr) {
      fallidos.push({ slug: clan.slug, error: moveErr.message });
      continue;
    }

    const { data: pub } = supabase.storage
      .from("clan-logos")
      .getPublicUrl(newPath);
    const { error: updErr } = await supabase
      .from("clanes")
      .update({ logo_url: pub.publicUrl })
      .eq("id", clan.id);
    if (updErr) {
      fallidos.push({ slug: clan.slug, error: updErr.message });
      continue;
    }

    movidos++;
  }

  revalidatePath("/clanes");
  revalidatePath("/mi-clan");
  return { ok: true, total: clanes?.length ?? 0, movidos, yaOk, fallidos };
}
