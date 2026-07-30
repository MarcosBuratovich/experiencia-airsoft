import { describe, expect, it } from "vitest";
import { costoDeUso, debeFrenar, gastoDelDia } from "./topes";

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
    const supabase = {
      from: () => ({
        select: () => ({
          gte: async () => ({
            data: [{ costo_usd: "0.010000" }, { costo_usd: "0.004000" }],
            error: null,
          }),
        }),
      }),
    } as never;
    expect(await gastoDelDia(supabase)).toBeCloseTo(0.014, 6);
  });

  it("si no puede leer el gasto devuelve Infinity para que el bot no siga", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          gte: async () => ({ data: null, error: { message: "boom" } }),
        }),
      }),
    } as never;
    expect(await gastoDelDia(supabase)).toBe(Number.POSITIVE_INFINITY);
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
});
