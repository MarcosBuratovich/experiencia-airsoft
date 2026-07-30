import { describe, expect, it } from "vitest";
import {
  costoDeUso,
  debeFrenar,
  gastoDelDia,
  PRECIOS_MODELO,
  verificarAccesoAdmin,
} from "./topes";

/**
 * Doble de Supabase para `gastoDelDia`: `bot_config` (la tabla canario del
 * chequeo de acceso admin) responde con la fila singleton de siempre —así
 * el canario pasa y se llega a ejercitar la lectura real de `bot_mensajes`,
 * que es lo que cada test de abajo quiere probar—, y `bot_mensajes` responde
 * lo que le pida cada test.
 */
function supabaseGasto(resultadoMensajes: { data: unknown; error: unknown }) {
  return {
    from: (tabla: string) => {
      if (tabla === "bot_config") {
        return {
          select: () => ({
            limit: async () => ({ data: [{ id: true }], error: null }),
          }),
        };
      }
      return { select: () => ({ gte: async () => resultadoMensajes }) };
    },
  } as never;
}

describe("costoDeUso", () => {
  it("cobra entrada y salida al precio del modelo", () => {
    // sonnet 5: 2 USD/MTok entrada, 10 USD/MTok salida (precio de lanzamiento)
    const c = costoDeUso("claude-sonnet-5", {
      entrada: 1_000_000,
      salida: 0,
      cacheLectura: 0,
      cacheEscritura: 0,
    });
    expect(c).toBeCloseTo(2, 6);
  });

  it("cobra las lecturas de caché a una décima parte", () => {
    const c = costoDeUso("claude-sonnet-5", {
      entrada: 0,
      salida: 0,
      cacheLectura: 1_000_000,
      cacheEscritura: 0,
    });
    expect(c).toBeCloseTo(0.2, 6);
  });

  it("cobra las escrituras de caché con recargo", () => {
    const c = costoDeUso("claude-sonnet-5", {
      entrada: 0,
      salida: 0,
      cacheLectura: 0,
      cacheEscritura: 1_000_000,
    });
    expect(c).toBeCloseTo(2.5, 6);
  });

  it("ante un modelo desconocido cobra la tarifa más cara conocida", () => {
    const desconocido = costoDeUso("modelo-nuevo", {
      entrada: 1_000_000,
      salida: 0,
      cacheLectura: 0,
      cacheEscritura: 0,
    });
    const opus = costoDeUso("claude-opus-5", {
      entrada: 1_000_000,
      salida: 0,
      cacheLectura: 0,
      cacheEscritura: 0,
    });
    expect(desconocido).toBe(opus);
  });
});

describe("gastoDelDia", () => {
  it("suma los costos del día", async () => {
    const supabase = supabaseGasto({
      data: [{ costo_usd: "0.010000" }, { costo_usd: "0.004000" }],
      error: null,
    });
    expect(await gastoDelDia(supabase)).toBeCloseTo(0.014, 6);
  });

  it("si no puede leer el gasto devuelve Infinity para que el bot no siga", async () => {
    const supabase = supabaseGasto({ data: null, error: { message: "boom" } });
    expect(await gastoDelDia(supabase)).toBe(Number.POSITIVE_INFINITY);
  });

  // --- IMPORTANTE (revisión final antes de merge): fail-open por RLS -------
  // Las 5 tablas de fase-19 (incluida bot_mensajes) son `for all using
  // (public.is_admin())`. Un cliente anónimo o de usuario común no ve NADA
  // ahí, y eso NO es un error para PostgREST: `data: [], error: null`,
  // idéntico a "hoy todavía no se gastó nada". Sin el canario, gastoDelDia
  // devolvía 0 en ese caso — el tope diario nunca se cumplía porque
  // `gastoHoy >= topeDiarioUsd` jamás daba cierto. Estos tests fallarían
  // (esperarían Infinity/rechazo y recibirían 0) contra el código viejo.

  it("RECHAZA (no devuelve 0 ni Infinity en silencio) si el cliente no tiene acceso admin — bot_config filtrado a 0 filas por RLS", async () => {
    const supabase = {
      from: (tabla: string) => {
        if (tabla === "bot_config") {
          // RLS filtrando en silencio: 0 filas, sin error. Mismo shape que
          // vería un cliente anónimo o un usuario autenticado no-admin.
          return { select: () => ({ limit: async () => ({ data: [], error: null }) }) };
        }
        // Si el canario funcionara mal y esto se llegara a consultar de
        // todos modos, que NO parezca "0 gastado" — así el test no puede
        // pasar por accidente por la razón equivocada.
        return {
          select: () => ({
            gte: async () => ({
              data: [{ costo_usd: "999" }],
              error: null,
            }),
          }),
        };
      },
    } as never;

    await expect(gastoDelDia(supabase)).rejects.toThrow(/acceso admin/i);
  });

  it("RECHAZA si bot_config responde con un error (p.ej. la migración de fase-19 no corrió)", async () => {
    const supabase = {
      from: (tabla: string) => {
        if (tabla === "bot_config") {
          return {
            select: () => ({
              limit: async () => ({ data: null, error: { code: "PGRST205", message: "no existe" } }),
            }),
          };
        }
        return { select: () => ({ gte: async () => ({ data: [], error: null }) }) };
      },
    } as never;

    await expect(gastoDelDia(supabase)).rejects.toThrow();
  });
});

describe("verificarAccesoAdmin", () => {
  it("no lanza cuando el cliente ve la fila singleton de bot_config", async () => {
    const supabase = {
      from: () => ({ select: () => ({ limit: async () => ({ data: [{ id: true }], error: null }) }) }),
    } as never;
    await expect(verificarAccesoAdmin(supabase)).resolves.toBeUndefined();
  });

  it("lanza con un mensaje accionable cuando bot_config devuelve 0 filas", async () => {
    const supabase = {
      from: () => ({ select: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    } as never;
    await expect(verificarAccesoAdmin(supabase)).rejects.toThrow(
      /service role|bot_config/i,
    );
  });

  it("lanza cuando bot_config devuelve un error", async () => {
    const supabase = {
      from: () => ({
        select: () => ({ limit: async () => ({ data: null, error: { message: "boom" } }) }),
      }),
    } as never;
    await expect(verificarAccesoAdmin(supabase)).rejects.toThrow();
  });

  it("lanza cuando data no es un array (shape defensivo)", async () => {
    const supabase = {
      from: () => ({ select: () => ({ limit: async () => ({ data: null, error: null }) }) }),
    } as never;
    await expect(verificarAccesoAdmin(supabase)).rejects.toThrow();
  });
});

describe("debeFrenar", () => {
  const config = {
    encendido: true,
    modelo: "claude-sonnet-5",
    topeDiarioUsd: 3,
    maxMensajesConversacion: 8,
  };

  it("deja pasar cuando está todo en orden", () => {
    expect(debeFrenar(config, { gastoHoy: 0.5, mensajesDelBot: 2 }).frenar).toBe(
      false,
    );
  });

  it("frena y apaga el bot al llegar al tope diario", () => {
    const f = debeFrenar(config, { gastoHoy: 3, mensajesDelBot: 1 });
    expect(f.frenar).toBe(true);
    if (f.frenar) {
      expect(f.apagarBot).toBe(true);
      expect(f.motivo).toMatch(/diario/i);
    }
  });

  it("escala la conversación al pasarse de mensajes, sin apagar el bot", () => {
    const f = debeFrenar(config, { gastoHoy: 0.1, mensajesDelBot: 8 });
    expect(f.frenar).toBe(true);
    // Esta charla se le pasa a un humano; las demás siguen atendidas.
    if (f.frenar) expect(f.apagarBot).toBe(false);
  });

  it("frena si el bot está apagado en la configuración", () => {
    const f = debeFrenar({ ...config, encendido: false }, {
      gastoHoy: 0,
      mensajesDelBot: 0,
    });
    expect(f.frenar).toBe(true);
  });

  it("frena cuando el gasto es incalculable (Infinity)", () => {
    const f = debeFrenar(config, {
      gastoHoy: Number.POSITIVE_INFINITY,
      mensajesDelBot: 0,
    });
    expect(f.frenar).toBe(true);
  });

  it("frena si el tope configurado no es un número válido", () => {
    // Un límite de seguridad tiene que fallar cerrado: con NaN, la comparación
    // gastoHoy >= tope sería siempre falsa y el bot gastaría sin techo.
    for (const tope of [Number.NaN, 0, -5]) {
      const f = debeFrenar({ ...config, topeDiarioUsd: tope }, {
        gastoHoy: 0.01,
        mensajesDelBot: 0,
      });
      expect(f.frenar).toBe(true);
      if (f.frenar) expect(f.apagarBot).toBe(true);
    }
  });

  it("frena si maxMensajesConversacion no es un entero válido", () => {
    // NaN >= N es siempre false; mismo riesgo de fallo abierto que topeDiarioUsd.
    for (const max of [Number.NaN, 0, -3, 2.5]) {
      const f = debeFrenar({ ...config, maxMensajesConversacion: max }, {
        gastoHoy: 0.1,
        mensajesDelBot: 0,
      });
      expect(f.frenar).toBe(true);
      if (f.frenar) {
        expect(f.apagarBot).toBe(true);
        expect(f.motivo).toMatch(/configurad/i);
      }
    }
  });

  it("frena si mensajesDelBot es NaN (número incalculable)", () => {
    const f = debeFrenar(config, {
      gastoHoy: 0.1,
      mensajesDelBot: Number.NaN,
    });
    expect(f.frenar).toBe(true);
    if (f.frenar) expect(f.apagarBot).toBe(true);
  });
});

describe("costoDeUso — tarifa de respaldo", () => {
  it("sobrestima entrada y salida máximas por separado al cobrar modelo desconocido", () => {
    // La tarifa de respaldo debe dominar en AMBAS columnas, no solo una.
    // Este test verifica que un modelo desconocido nunca cuesta menos que
    // cualquier modelo conocido, incluso tras agregar más modelos.
    const desconocido = costoDeUso("modelo-futuro-desconocido", {
      entrada: 1_000_000,
      salida: 1_000_000,
      cacheLectura: 0,
      cacheEscritura: 0,
    });

    const conocidos = [
      costoDeUso("claude-opus-5", {
        entrada: 1_000_000,
        salida: 1_000_000,
        cacheLectura: 0,
        cacheEscritura: 0,
      }),
      costoDeUso("claude-sonnet-5", {
        entrada: 1_000_000,
        salida: 1_000_000,
        cacheLectura: 0,
        cacheEscritura: 0,
      }),
      costoDeUso("claude-haiku-4-5", {
        entrada: 1_000_000,
        salida: 1_000_000,
        cacheLectura: 0,
        cacheEscritura: 0,
      }),
    ];

    for (const costo of conocidos) {
      expect(desconocido).toBeGreaterThanOrEqual(costo);
    }
  });

  it("detecta fallo de tarifaDe cuando columnas divergen (entrada baja, salida alta)", () => {
    // El código viejo ("máximo por entrada, adopto su par") fallaría aquí.
    // Guardar estado original
    const estadoOriginal = { ...PRECIOS_MODELO };

    try {
      // Agregar modelo hipotético con entrada baja, salida extremadamente alta
      PRECIOS_MODELO["modelo-salida-alta"] = { entrada: 0.1, salida: 999 };

      // Con el código viejo:
      //   tarifaDe("desconocido") busca máx entrada → encuentra 5 (opus)
      //   → adopta {entrada: 5, salida: 25} ← SUBVALOR la salida del modelo nuevo
      //
      // Con el código nuevo:
      //   tarifaDe("desconocido") busca máx entrada (5) y máx salida (999)
      //   → devuelve {entrada: 5, salida: 999} ← correctamente sobrestima ambas

      const desconocido = costoDeUso("modelo-desconocido-nuevo", {
        entrada: 1_000_000,
        salida: 1_000_000,
        cacheLectura: 0,
        cacheEscritura: 0,
      });

      // Costo esperado con código nuevo: (1_000_000 / 1e6) * 5 + (1_000_000 / 1e6) * 999
      //   = 5 + 999 = 1004
      // Costo si modelo-salida-alta: (1_000_000 / 1e6) * 0.1 + (1_000_000 / 1e6) * 999
      //   = 0.1 + 999 = 999.1
      // Con el código viejo fallaría: devolvería 5 + 25 = 30, menor que 999.1

      const modeloAltaSalida = costoDeUso("modelo-salida-alta", {
        entrada: 1_000_000,
        salida: 1_000_000,
        cacheLectura: 0,
        cacheEscritura: 0,
      });

      expect(desconocido).toBeGreaterThanOrEqual(modeloAltaSalida);
    } finally {
      // Restaurar estado original, limpiando la mutación
      Object.keys(PRECIOS_MODELO).forEach((k) => {
        if (!estadoOriginal.hasOwnProperty(k)) {
          delete PRECIOS_MODELO[k];
        }
      });
      Object.assign(PRECIOS_MODELO, estadoOriginal);
    }
  });
});
