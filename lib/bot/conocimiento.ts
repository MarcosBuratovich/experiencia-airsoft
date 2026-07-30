import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Base de conocimiento curada: lo que está en la cabeza del dueño y no en
 * ninguna tabla. Si duele, qué llevar, edad mínima, estacionamiento, lluvia.
 *
 * Se INYECTA en el prompt en vez de consultarse por herramienta. Con prompt
 * caching el prefijo estable se cobra ~10% en las lecturas siguientes,
 * mientras que una herramienta cuesta un round trip completo de inferencia
 * por uso. Al tamaño esperado (unos pocos miles de tokens) inyectar sale más
 * barato. Si la base crece por encima de ~10k tokens, migrar a búsqueda.
 */

export type EntradaConocimiento = {
  id: string;
  titulo: string;
  contenido: string;
  orden: number;
};

type ClienteLectura = Pick<SupabaseClient, "from">;

export async function getConocimiento(
  supabase: ClienteLectura,
): Promise<EntradaConocimiento[]> {
  const { data, error } = await supabase
    .from("bot_conocimiento")
    .select("id, titulo, contenido, orden")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error || !data) return [];
  return data as EntradaConocimiento[];
}

export function formatearConocimiento(
  entradas: EntradaConocimiento[],
): string {
  if (!entradas.length) {
    return "(Base de conocimiento sin entradas cargadas todavía.)";
  }
  return entradas
    .map((e) => `## ${e.titulo}\n${e.contenido.trim()}`)
    .join("\n\n");
}
