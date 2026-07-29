import { describe, expect, it } from "vitest";
import { CONFIG_DEFAULT, getBotConfig } from "./config";

/** Doble mínimo de Supabase: solo lo que usa getBotConfig. */
function supabaseFake(resultado: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        maybeSingle: async () => resultado,
      }),
    }),
  } as never;
}

describe("getBotConfig", () => {
  it("lee la fila de configuración", async () => {
    const cfg = await getBotConfig(
      supabaseFake({
        data: {
          encendido: true,
          modelo: "claude-opus-5",
          tope_diario_usd: "5.50",
          max_mensajes_conversacion: 12,
        },
        error: null,
      }),
    );
    expect(cfg.encendido).toBe(true);
    expect(cfg.modelo).toBe("claude-opus-5");
    expect(cfg.topeDiarioUsd).toBe(5.5);
    expect(cfg.maxMensajesConversacion).toBe(12);
  });

  it("cae a los defaults si la tabla todavía no existe", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: null, error: { code: "42P01" } }),
    );
    expect(cfg).toEqual(CONFIG_DEFAULT);
  });

  it("queda apagado por defecto", () => {
    expect(CONFIG_DEFAULT.encendido).toBe(false);
  });

  it("completa campos faltantes con el default en vez de dejar undefined", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { encendido: true }, error: null }),
    );
    expect(cfg.encendido).toBe(true);
    expect(cfg.modelo).toBe(CONFIG_DEFAULT.modelo);
    expect(cfg.topeDiarioUsd).toBe(CONFIG_DEFAULT.topeDiarioUsd);
  });

  // topeDiarioUsd edge cases: Number() puede devolver NaN, 0 o Infinity
  it("rechaza tope_diario_usd inválido ('abc') y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { tope_diario_usd: "abc" }, error: null }),
    );
    expect(cfg.topeDiarioUsd).toBe(CONFIG_DEFAULT.topeDiarioUsd);
  });

  it("rechaza tope_diario_usd vacío ('') y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { tope_diario_usd: "" }, error: null }),
    );
    expect(cfg.topeDiarioUsd).toBe(CONFIG_DEFAULT.topeDiarioUsd);
  });

  it("rechaza tope_diario_usd literal 'NaN' y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { tope_diario_usd: "NaN" }, error: null }),
    );
    expect(cfg.topeDiarioUsd).toBe(CONFIG_DEFAULT.topeDiarioUsd);
  });

  it("rechaza tope_diario_usd negativo y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { tope_diario_usd: "-5" }, error: null }),
    );
    expect(cfg.topeDiarioUsd).toBe(CONFIG_DEFAULT.topeDiarioUsd);
  });

  // maxMensajesConversacion edge cases: must be integer >= 1
  it("rechaza maxMensajesConversacion=NaN y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { max_mensajes_conversacion: NaN }, error: null }),
    );
    expect(cfg.maxMensajesConversacion).toBe(CONFIG_DEFAULT.maxMensajesConversacion);
  });

  it("rechaza maxMensajesConversacion=0 (no es >= 1) y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { max_mensajes_conversacion: 0 }, error: null }),
    );
    expect(cfg.maxMensajesConversacion).toBe(CONFIG_DEFAULT.maxMensajesConversacion);
  });

  it("rechaza maxMensajesConversacion negativo y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { max_mensajes_conversacion: -3 }, error: null }),
    );
    expect(cfg.maxMensajesConversacion).toBe(CONFIG_DEFAULT.maxMensajesConversacion);
  });

  it("rechaza maxMensajesConversacion no-entero (2.5) y usa el default", async () => {
    const cfg = await getBotConfig(
      supabaseFake({ data: { max_mensajes_conversacion: 2.5 }, error: null }),
    );
    expect(cfg.maxMensajesConversacion).toBe(CONFIG_DEFAULT.maxMensajesConversacion);
  });
});
