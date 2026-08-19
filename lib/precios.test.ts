import { describe, expect, it } from "vitest";
import {
  PRECIOS_DEFAULT,
  calcularPrecioInscripcion,
  getPreciosConfig,
  getPreciosConfigResultado,
  type PreciosConfig,
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

/**
 * Precios de prueba con los cuatro ítems que participan del cálculo, todos
 * distintos entre sí y con efectivo ≠ transferencia, para que un cruce de
 * ítems o de medio de pago se note en el número.
 */
const P: PreciosConfig = {
  ...PRECIOS_DEFAULT,
  entrada_byop: { efectivo: 20000, transferencia: 25000 },
  entrada_socio: { efectivo: 0, transferencia: 0 },
  alquiler_marcadora: { efectivo: 54000, transferencia: 60000 },
  alquiler_premium: { efectivo: 72000, transferencia: 80000 },
  alquiler_chaleco: { efectivo: 4500, transferencia: 5000 },
};

const sinAlquiler = { marcadora: false, premium: false, chaleco: false };

describe("calcularPrecioInscripcion", () => {
  it("BYOP paga solo la entrada", () => {
    const r = calcularPrecioInscripcion(
      { tipo_jugador: "byop", socio: false, alquila: sinAlquiler, precios: P },
      "transferencia",
    );
    expect(r).toEqual({ entrada: 25000, alquiler: 0, total: 25000 });
  });

  it("el alquiler ya incluye la entrada: no se cobra aparte", () => {
    const r = calcularPrecioInscripcion(
      {
        tipo_jugador: "alquiler",
        socio: false,
        alquila: { ...sinAlquiler, marcadora: true },
        precios: P,
      },
      "transferencia",
    );
    expect(r).toEqual({ entrada: 0, alquiler: 60000, total: 60000 });
  });

  it("el chaleco suma sobre el alquiler", () => {
    const r = calcularPrecioInscripcion(
      {
        tipo_jugador: "alquiler",
        socio: false,
        alquila: { marcadora: false, premium: true, chaleco: true },
        precios: P,
      },
      "efectivo",
    );
    expect(r).toEqual({ entrada: 0, alquiler: 76500, total: 76500 });
  });

  // --- Chaleco suelto -----------------------------------------------------
  // Un BYOP trae marcadora y protección facial propias, pero no siempre
  // chaleco. Antes el chaleco se ignoraba fuera del alquiler: se lo entregaban
  // y no se lo cobraban.

  it("un BYOP con chaleco paga entrada + chaleco", () => {
    const r = calcularPrecioInscripcion(
      {
        tipo_jugador: "byop",
        socio: false,
        alquila: { ...sinAlquiler, chaleco: true },
        precios: P,
      },
      "transferencia",
    );
    expect(r).toEqual({ entrada: 25000, alquiler: 5000, total: 30000 });
  });

  it("un socio con chaleco paga el chaleco aunque la entrada sea 0", () => {
    const r = calcularPrecioInscripcion(
      {
        tipo_jugador: "byop",
        socio: true,
        alquila: { ...sinAlquiler, chaleco: true },
        precios: P,
      },
      "efectivo",
    );
    expect(r).toEqual({ entrada: 0, alquiler: 4500, total: 4500 });
  });

  it("sin chaleco, un BYOP sigue pagando exactamente la entrada", () => {
    // Regresión del cambio de arriba: agregar el chaleco al camino BYOP no
    // tiene que mover el precio de quien no lo pide.
    for (const socio of [true, false]) {
      const r = calcularPrecioInscripcion(
        { tipo_jugador: "byop", socio, alquila: sinAlquiler, precios: P },
        "transferencia",
      );
      const esperado = socio ? 0 : 25000;
      expect(r).toEqual({ entrada: esperado, alquiler: 0, total: esperado });
    }
  });
});
