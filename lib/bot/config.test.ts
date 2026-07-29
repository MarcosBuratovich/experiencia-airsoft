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
});
