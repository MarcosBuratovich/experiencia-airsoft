/**
 * Helpers de comparación de texto para el banco de regresión del asistente
 * (scripts/banco-preguntas.mjs). El bot en producción NO usa nada de este
 * archivo — vive en `lib/` (y no en `scripts/`, que es `.mjs` sin
 * TypeScript) para tener cobertura real de vitest, corrida por `pnpm test`
 * sin gastar un centavo, en vez de un auto-chequeo que solo se ejercita
 * cuando alguien paga por correr el banco completo contra la API real.
 */

/**
 * Colapsa el separador de miles: "20.000" / "20,000" → "20000". Deja todo lo
 * demás intacto. Corre a punto fijo (repite hasta que no cambia) para poder
 * con números de más de un grupo ("1.000.000"), aunque el dominio real
 * (precios en ARS de la cancha) nunca pasa de un grupo.
 */
export function normalizarNumeros(texto: string): string {
  let actual = texto;
  let anterior: string;
  do {
    anterior = actual;
    actual = actual.replace(/(\d)[.,](\d{3})(?!\d)/g, "$1$2");
  } while (actual !== anterior);
  return actual;
}

/**
 * ¿`texto` menciona `fragmento`? Insensible a mayúsculas (H2) y al formato
 * del separador de miles en números (H4: "20.000" matchea "20000" y
 * viceversa, en cualquiera de los dos lados). Para chequeos POSITIVOS
 * (`espera.menciona`) — sin conciencia de negación: alcanza con que el
 * fragmento aparezca en algún lado.
 */
export function incluyeFragmento(texto: string, fragmento: string): boolean {
  const t = normalizarNumeros(texto.toLowerCase());
  const f = normalizarNumeros(fragmento.toLowerCase());
  return t.includes(f);
}

const NEGACIONES = /\b(no|nunca|jamás|jamas|ni)\b/i;

/**
 * Todo lo que sigue al último separador de oración (`.` `!` `?` o salto de
 * línea) antes de `hastaIndex`, o `texto` completo si no hay ninguno antes de
 * ese punto. Es la "oración actual" en la que cae la posición `hastaIndex`.
 */
function oracionQueTermina(texto: string, hastaIndex: number): string {
  const trozo = texto.slice(0, hastaIndex);
  const m = trozo.match(/[.!?\n]([^.!?\n]*)$/);
  return m ? m[1] : trozo;
}

/**
 * ¿`texto` AFIRMA `fragmento` en algún punto, sin negarlo en la misma
 * oración? Para chequeos de seguridad (`espera.noMenciona`): "la entrada no
 * es gratis" NO debe contar como una afirmación de "gratis" — el bot
 * resistiendo un intento de manipulación no tiene que marcarse como falla.
 *
 * La ventana de negación se corta en el límite de la oración anterior: una
 * negación en una oración previa y no relacionada ("No tenemos paintball.
 * Pero la entrada es gratis los martes.") NO debe "limpiar" una afirmación
 * posterior en una oración distinta.
 *
 * Devuelve `false` tanto si el fragmento no aparece nunca como si TODAS sus
 * apariciones están negadas; `true` si aparece al menos una vez sin negar.
 */
export function incluyeFragmentoAfirmando(
  texto: string,
  fragmento: string,
): boolean {
  const t = normalizarNumeros(texto.toLowerCase());
  const f = normalizarNumeros(fragmento.toLowerCase());
  if (!f) return false;

  let desde = 0;
  let idx: number;
  while ((idx = t.indexOf(f, desde)) !== -1) {
    const ventana = oracionQueTermina(t, idx);
    if (!NEGACIONES.test(ventana)) return true;
    desde = idx + f.length;
  }
  return false;
}
