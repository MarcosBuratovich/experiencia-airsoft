import type { createClient } from "./supabase/server";
import { formatFechaHora } from "./format";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Autoría de una partida privada: quién está detrás y desde cuándo.
 *
 * Hay dos formas de que exista una privada y el "dueño" no es el mismo:
 *
 *  - Nace de una SOLICITUD de un jugador → `organizador_id` es quien la pidió
 *    (el cumpleañero, la empresa) y `creado_por` es el admin que la aprobó.
 *    La persona que importa es el organizador.
 *  - La crea un ADMIN directo desde el calendario → no hay organizador y la
 *    persona que importa es el admin que la cargó.
 *
 * Se calcula en vivo desde `profiles` en vez de guardarse en el título: así
 * aplica también a las privadas que ya existían y el nombre sigue siendo el
 * actual si la persona lo edita.
 */
export type AutoriaPartida = {
  /** Nombre de la persona detrás de la privada. */
  nombre: string;
  /** true si salió de una solicitud (nombre = organizador, no el admin). */
  desdeSolicitud: boolean;
  /** Fecha y hora en que se creó la partida, ya formateada. */
  creadaEl: string;
  /** Línea lista para mostrar. */
  label: string;
};

export type PartidaAutoriaInput = {
  id: string;
  visibilidad: string;
  creado_por: string | null;
  organizador_id: string | null;
  created_at: string;
};

/**
 * Resuelve la autoría de varias partidas en una sola consulta.
 * Devuelve un Map por id de partida; las públicas quedan afuera.
 */
export async function getAutoriaPorPartida(
  supabase: ServerSupabase,
  partidas: PartidaAutoriaInput[],
): Promise<Map<string, AutoriaPartida>> {
  const out = new Map<string, AutoriaPartida>();
  const privadas = partidas.filter((p) => p.visibilidad === "privada");
  if (!privadas.length) return out;

  // Para una privada de solicitud mostramos al organizador; para una creada
  // por el admin, al admin.
  const idsNecesarios = [
    ...new Set(
      privadas
        .map((p) => p.organizador_id ?? p.creado_por)
        .filter((id): id is string => !!id),
    ),
  ];
  if (!idsNecesarios.length) return out;

  // profiles_publicos: vista sin datos sensibles, legible por cualquier
  // usuario autenticado (la RLS de profiles solo deja ver el propio perfil).
  const { data } = await supabase
    .from("profiles_publicos")
    .select("id, nombre, apellido, alias")
    .in("id", idsNecesarios);

  const nombrePorId = new Map<string, string>();
  for (const p of (data ?? []) as {
    id: string;
    nombre: string | null;
    apellido: string | null;
    alias: string | null;
  }[]) {
    const completo = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim();
    nombrePorId.set(p.id, completo || p.alias?.trim() || "—");
  }

  for (const p of privadas) {
    const desdeSolicitud = !!p.organizador_id;
    const quienId = p.organizador_id ?? p.creado_por;
    const nombre = (quienId && nombrePorId.get(quienId)) || "—";
    const creadaEl = formatFechaHora(p.created_at);
    out.set(p.id, {
      nombre,
      desdeSolicitud,
      creadaEl,
      label: `${desdeSolicitud ? "Solicitada por" : "Creada por"} ${nombre} · ${creadaEl}`,
    });
  }

  return out;
}
