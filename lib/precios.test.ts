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
});
