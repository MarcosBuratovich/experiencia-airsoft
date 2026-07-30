import { describe, expect, it } from "vitest";
import {
  PRECIOS_DEFAULT,
  getPreciosConfig,
  getPreciosConfigResultado,
} from "./precios";

/**
 * Doble mínimo de Supabase para `precios_config`: la cadena real es
 * `.from("precios_config").select(cols)`, awaited directo (sin más
 * chaining). `getPreciosConfigResultado` intenta primero las columnas
 * nuevas (dual) y, si esa consulta falla, cae a la consulta legacy
 * (`key, valor`) — la secuencia de resultados simula eso en orden de
 * llamada.
 */
function supabaseSecuencia(resultados: { data: unknown; error: unknown }[]) {
  let i = 0;
  return {
    from: () => ({
      select: () => resultados[i++],
    }),
  } as never;
}

describe("getPreciosConfigResultado", () => {
  it("devuelve ok:false cuando fallan las dos consultas (columnas nuevas y legacy)", async () => {
    const supabase = supabaseSecuencia([
      { data: null, error: { message: "no existe la columna" } },
      { data: null, error: { message: "caída de red" } },
    ]);

    const r = await getPreciosConfigResultado(supabase);
    expect(r.ok).toBe(false);
  });

  it("devuelve ok:true (vía legacy) cuando solo falla la consulta de columnas nuevas — caso pre-migración fase-17", async () => {
    const supabase = supabaseSecuencia([
      { data: null, error: { message: "no existe la columna valor_efectivo" } },
      { data: [{ key: "entrada_byop", valor: 20000 }], error: null },
    ]);

    const r = await getPreciosConfigResultado(supabase);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.entrada_byop).toEqual({
        efectivo: 20000,
        transferencia: 20000,
      });
    }
  });

  // --- IMPORTANTE (revisión final antes de merge) --------------------------
  // La policy real de precios_config es `for select using (auth.uid() is
  // not null)`: un cliente sin sesión no rompe la consulta, PostgREST
  // responde 200 con `data: [], error: null` — mismo shape que una tabla
  // legítimamente vacía. Antes del fix, `!dual.error` por sí solo aceptaba
  // ese `data: []` como un éxito con CERO precios cargados (`ok:true` con
  // `out` = los defaults sin tocar), indistinguible para quien llama de un
  // precio real. Estos dos tests fallarían con el código viejo.

  it("devuelve ok:false cuando la consulta de columnas nuevas 'tiene éxito' pero devuelve 0 filas (lectura vacía = fallo, no default)", async () => {
    const supabase = supabaseSecuencia([
      { data: [], error: null },
    ]);

    const r = await getPreciosConfigResultado(supabase);
    expect(r.ok).toBe(false);
  });

  it("devuelve ok:false cuando la consulta legacy 'tiene éxito' pero devuelve 0 filas, incluso habiendo fallado antes la de columnas nuevas", async () => {
    const supabase = supabaseSecuencia([
      { data: null, error: { message: "no existe la columna valor_efectivo" } },
      { data: [], error: null },
    ]);

    const r = await getPreciosConfigResultado(supabase);
    expect(r.ok).toBe(false);
  });

  it("data:null sin error (shape defensivo) también cuenta como lectura vacía, no como éxito", async () => {
    // Mismo caso que data:[] pero con el otro valor "vacío" posible que
    // puede llegar a devolver un cliente real.
    const supabase = supabaseSecuencia([{ data: null, error: null }]);

    const r = await getPreciosConfigResultado(supabase);
    expect(r.ok).toBe(false);
  });
});

describe("getPreciosConfig (envoltorio sobre getPreciosConfigResultado)", () => {
  it("sigue devolviendo PRECIOS_DEFAULT ante una falla total, igual que antes — protege a los call-sites existentes", async () => {
    const supabase = supabaseSecuencia([
      { data: null, error: { message: "no existe la columna" } },
      { data: null, error: { message: "caída de red" } },
    ]);

    const cfg = await getPreciosConfig(supabase);
    expect(cfg).toEqual(PRECIOS_DEFAULT);
  });

  it("también degrada a PRECIOS_DEFAULT ante una lectura vacía (nuevo caso de ok:false) — el fix de la revisión final no le cambia el comportamiento a las ~10 pantallas existentes", async () => {
    const supabase = supabaseSecuencia([{ data: [], error: null }]);

    const cfg = await getPreciosConfig(supabase);
    expect(cfg).toEqual(PRECIOS_DEFAULT);
  });
});
