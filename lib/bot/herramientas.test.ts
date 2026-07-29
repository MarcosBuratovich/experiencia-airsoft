import { describe, expect, it } from "vitest";
import { ESQUEMAS_HERRAMIENTAS, ejecutarHerramienta } from "./herramientas";

describe("ESQUEMAS_HERRAMIENTAS", () => {
  it("declara exactamente las tres herramientas de lectura", () => {
    expect(ESQUEMAS_HERRAMIENTAS.map((h) => h.name).sort()).toEqual([
      "agenda_privadas",
      "precios",
      "proximas_partidas",
    ]);
  });

  it("ninguna herramienta puede escribir", () => {
    const sospechosas = ESQUEMAS_HERRAMIENTAS.filter((h) =>
      /anotar|crear|cobrar|cancelar|actualizar|borrar/i.test(
        h.name + JSON.stringify(h.description),
      ),
    );
    expect(sospechosas).toEqual([]);
  });

  it("cada herramienta describe para qué sirve", () => {
    for (const h of ESQUEMAS_HERRAMIENTAS) {
      expect(h.description!.length).toBeGreaterThan(30);
    }
  });
});

describe("ejecutarHerramienta", () => {
  it("devuelve un error legible si la herramienta no existe", async () => {
    const r = await ejecutarHerramienta({} as never, "anotar_jugador", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no existe/i);
  });

  it("propaga la falla de la base como error, sin inventar el dato", async () => {
    // La cadena real es .select().gte().eq(estado).eq(visibilidad).order().limit()
    const supabase = {
      from: () => ({
        select: () => ({
          gte: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: null, error: { message: "boom" } }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never;

    const r = await ejecutarHerramienta(supabase, "proximas_partidas", {});
    expect(r.ok).toBe(false);
  });

  it("nunca pide partidas privadas", async () => {
    // Una partida privada es el cumpleaños de alguien. El bot no la menciona.
    const filtros: Record<string, string> = {};
    const cadena = {
      gte: () => cadena,
      eq: (col: string, val: string) => {
        filtros[col] = val;
        return cadena;
      },
      order: () => cadena,
      limit: async () => ({ data: [], error: null }),
    };
    const supabase = { from: () => ({ select: () => cadena }) } as never;

    await ejecutarHerramienta(supabase, "proximas_partidas", {});
    expect(filtros.visibilidad).toBe("publica");
    expect(filtros.estado).toBe("abierta");
  });
});
