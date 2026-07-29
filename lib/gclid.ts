import { cookies } from "next/headers";

/**
 * Identificador del clic en un anuncio de Google (gclid).
 *
 * Con el auto-etiquetado activado, Google agrega `?gclid=...` a la URL del
 * anuncio y el tag lo guarda en la cookie `_gcl_aw`, con formato:
 *
 *     GCL.<timestamp>.<gclid>
 *
 * La cookie vive en el dominio raíz (.experienciaairsoft.com), así que
 * sobrevive el salto de www a app: alguien puede llegar por un anuncio a la
 * web de marketing y solicitar la privada desde la plataforma.
 *
 * Sirve para devolverle a Google Ads la venta que se cerró por WhatsApp
 * (conversión offline), que es lo que le permite optimizar hacia gente que
 * contrata y no hacia gente que solo consulta.
 */
export async function leerGclid(): Promise<string | null> {
  try {
    const c = await cookies();
    const raw = c.get("_gcl_aw")?.value;
    if (!raw) return null;
    // GCL.<ts>.<gclid> — el gclid puede contener puntos, así que se toma
    // todo lo que sigue al segundo separador.
    const partes = raw.split(".");
    if (partes.length < 3) return null;
    const gclid = partes.slice(2).join(".").trim();
    // Sanity check: los gclid son alfanuméricos con - y _, y largos.
    if (!gclid || gclid.length > 512 || !/^[\w-]+$/.test(gclid)) return null;
    return gclid;
  } catch {
    return null;
  }
}
