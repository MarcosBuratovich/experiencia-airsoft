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

export type ResultadoConocimiento =
  | { ok: true; entradas: EntradaConocimiento[] }
  | { ok: false };

type ClienteLectura = Pick<SupabaseClient, "from">;

/**
 * Consulta la base de conocimiento expuesta a través de un tipo discriminado.
 *
 * `ok: false` SOLO cuando la consulta SQL falla — es el único caso donde un bot
 * sin base de conocimiento contesta cualquier cosa con total seguridad, sin saber
 * nada del negocio. Quien llame a esta función TIENE QUE escalar ante `ok: false`,
 * en vez de usar `formatearConocimiento([])` que se vería igual a una tabla vacía.
 *
 * Una tabla realmente vacía es `ok: true` con `entradas: []` — son casos
 * **distintos** y esa es toda la gracia.
 */
export async function getConocimientoResultado(
  supabase: ClienteLectura,
): Promise<ResultadoConocimiento> {
  const { data, error } = await supabase
    .from("bot_conocimiento")
    .select("id, titulo, contenido, orden")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    console.error("[bot] conocimiento: consulta falló", error);
    return { ok: false };
  }

  return { ok: true, entradas: (data as EntradaConocimiento[]) ?? [] };
}

/**
 * Envoltorio delgado sobre `getConocimientoResultado`: firma y comportamiento
 * IDÉNTICOS a antes (si falla, cae a []). No romper esto — los call-sites
 * existentes dependen de que nunca rechace y siempre devuelva un array utilizable.
 */
export async function getConocimiento(
  supabase: ClienteLectura,
): Promise<EntradaConocimiento[]> {
  const resultado = await getConocimientoResultado(supabase);
  return resultado.ok ? resultado.entradas : [];
}

/**
 * Formatea entradas para inyección en prompt.
 *
 * H2: Filtra entradas con contenido en blanco (no emite encabezado huérfano).
 * H3: Normaliza espacios en blanco en títulos para no fabricar encabezados falsos.
 */
export function formatearConocimiento(
  entradas: EntradaConocimiento[],
): string {
  if (!entradas.length) {
    return "(Base de conocimiento sin entradas cargadas todavía.)";
  }

  // Filtrar entradas con contenido en blanco (H2)
  const validas = entradas.filter((e) => e.contenido.trim().length > 0);

  if (!validas.length) {
    return "(Base de conocimiento sin entradas cargadas todavía.)";
  }

  return validas
    .map((e) => {
      // Normalizar espacios en blanco en título (H3): cualquier whitespace → espacio simple
      const tituloNormalizado = e.titulo.replace(/\s+/g, " ");
      return `## ${tituloNormalizado}\n${e.contenido.trim()}`;
    })
    .join("\n\n");
}
