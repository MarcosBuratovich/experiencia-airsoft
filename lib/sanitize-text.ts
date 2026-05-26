/**
 * Helpers de validación de contenido para inputs públicos (nombres de
 * clan, alias, descripciones, etc.). NO previenen XSS — React ya escapa
 * todo — previenen ABUSE de input: markdown injection, URLs en nombres,
 * spam de emojis, paredes de chars repetidos. Lo que ve un usuario no
 * sea horrible.
 *
 * Todas son funciones puras, server + client safe.
 */

/**
 * Cuenta grafemas (emojis cuentan como 1 unidad visual). Usar para
 * cualquier límite de longitud "humano".
 */
export function graphemeLen(s: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

/**
 * Cuenta cuántos grafemas son emojis / pictogramas.
 * Usado para limitar emoji-spam.
 */
export function countEmojis(s: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    let count = 0;
    for (const { segment } of seg.segment(s)) {
      if (/\p{Extended_Pictographic}/u.test(segment)) count++;
    }
    return count;
  }
  return (s.match(/\p{Extended_Pictographic}/gu) ?? []).length;
}

/**
 * True si el string tiene el mismo grafema repetido más de `maxRun` veces
 * seguidas. Atrapa spam visual tipo "💃💃💃💃💃💃💃...".
 */
export function hasExcessiveRepeat(s: string, maxRun = 5): boolean {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    const segs = Array.from(seg.segment(s), (x) => x.segment);
    let run = 1;
    for (let i = 1; i < segs.length; i++) {
      if (segs[i] === segs[i - 1]) {
        run++;
        if (run > maxRun) return true;
      } else {
        run = 1;
      }
    }
    return false;
  }
  return new RegExp(`(.)\\1{${maxRun},}`, "u").test(s);
}

/**
 * Patrones que NO queremos en nombres / aliases / descripciones públicas.
 * No por seguridad (React escapa todo) sino por estética y para evitar
 * que alguien "vandalice" un nombre con HTML/markdown que se vea raro.
 */
const BAD_PATTERNS: { re: RegExp; reason: string }[] = [
  // Markdown link: [text](url) — sale como texto literal y se ve mal
  { re: /\[[^\]]*\]\s*\([^)]*\)/, reason: "No uses formato markdown ([text](url))" },
  // HTML tags
  { re: /<[a-z!\/]/i, reason: "No uses etiquetas HTML" },
  // javascript: data: vbscript: URIs
  {
    re: /(?:javascript|data|vbscript):/i,
    reason: "URLs javascript: / data: no están permitidas",
  },
  // URLs completas
  { re: /https?:\/\/|www\./i, reason: "No incluyas URLs" },
  // Caracteres de control
  // eslint-disable-next-line no-control-regex
  { re: /[\x00-\x1f\x7f]/, reason: "Caracteres de control no permitidos" },
];

/**
 * Devuelve el primer patrón "feo" detectado en el string, o null si
 * está limpio. Usar en zod .refine().
 */
export function detectBadPattern(s: string): string | null {
  for (const { re, reason } of BAD_PATTERNS) {
    if (re.test(s)) return reason;
  }
  return null;
}

/** Versión booleana de detectBadPattern. */
export function isCleanText(s: string): boolean {
  return detectBadPattern(s) === null;
}
