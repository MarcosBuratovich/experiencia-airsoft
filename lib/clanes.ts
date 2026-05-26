import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type ClanDisplayMode = "alias" | "logo";

export type ClanChip = {
  id: string;
  slug: string;
  nombre: string;
  alias: string | null;
  color_hex: string | null;
  logo_url: string | null;
  display_mode: ClanDisplayMode;
};

/**
 * Carga los clanes (hasta 3, ordenados por posicion) de cada profile.
 * Fallback silencioso: si la tabla profile_clanes no existe todavía
 * (migración 6 no aplicada), devuelve un Map vacío y la app sigue
 * funcionando con el modelo viejo de profiles.clan_id.
 */
export async function getClanesPorProfileIds(
  supabase: ServerSupabase,
  profileIds: string[],
): Promise<Map<string, ClanChip[]>> {
  const map = new Map<string, ClanChip[]>();
  if (!profileIds.length) return map;

  const ids = [...new Set(profileIds)];
  const { data, error } = await supabase
    .from("profile_clanes")
    .select(
      "profile_id, posicion, clanes!inner(id, slug, nombre, alias, color_hex, logo_url, display_mode)",
    )
    .in("profile_id", ids)
    .order("posicion", { ascending: true });
  if (error || !data) return map;

  for (const row of data) {
    const clan = Array.isArray(row.clanes) ? row.clanes[0] : row.clanes;
    if (!clan) continue;
    const list = map.get(row.profile_id) ?? [];
    list.push({
      id: clan.id,
      slug: clan.slug,
      nombre: clan.nombre,
      alias: clan.alias ?? null,
      color_hex: clan.color_hex ?? null,
      logo_url: clan.logo_url ?? null,
      display_mode: (clan.display_mode as ClanDisplayMode) ?? "alias",
    });
    map.set(row.profile_id, list);
  }
  return map;
}

// =========================================================================
// Contraste WCAG sobre el fondo oscuro de la app (ink #0a0a0a)
// =========================================================================

const INK_HEX = "#0a0a0a";
const BONE_HEX = "#f5f5f0";
/** Umbral mínimo para texto normal (WCAG AA). Aceptamos 4.5:1. */
export const CONTRAST_MIN = 4.5;

function relLuminance(hex: string): number {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const l1 = relLuminance(a);
  const l2 = relLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ratio de contraste de `hex` contra el fondo oscuro de la app. */
export function contrasteSobreInk(hex: string): number {
  return contrastRatio(hex, INK_HEX);
}

/** True si `hex` es legible sobre el fondo oscuro (≥ 4.5:1). */
export function pasaContrasteInk(hex: string | null | undefined): boolean {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  return contrasteSobreInk(hex) >= CONTRAST_MIN;
}

/**
 * Devuelve el color recibido si es legible sobre el fondo oscuro de la app;
 * sino cae a bone para que el chip se vea sí o sí. Usar al pintar el alias
 * de un clan o cualquier label coloreada por el usuario.
 */
export function colorLeibleSobreInk(hex: string | null | undefined): string {
  return pasaContrasteInk(hex) ? (hex as string) : BONE_HEX;
}
