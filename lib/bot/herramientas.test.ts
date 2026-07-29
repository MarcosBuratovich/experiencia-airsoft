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

  it("si la partida se pudo leer pero falla el cálculo de ocupación, no inventa lugares_disponibles", async () => {
    // La partida se lee bien, pero la segunda consulta (inscripciones, para
    // saber cuántos lugares quedan) falla. Devolver la partida con ocupación
    // 0 acá sería inventar "lugares_disponibles": el bot diría que sobran
    // lugares en una partida que puede estar llena.
    const partida = {
      id: "p1",
      fecha: "2026-08-01",
      hora_inicio: "19:00:00",
      modalidad: "dinamica",
      cupo_max: 50,
    };
    const supabase = {
      from: (tabla: string) => {
        if (tabla === "partidas") {
          return {
            select: () => ({
              gte: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: async () => ({ data: [partida], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        // "inscripciones": falla al calcular la ocupación real.
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: null, error: { message: "boom" } }),
            }),
          }),
        };
      },
    } as never;

    const r = await ejecutarHerramienta(supabase, "proximas_partidas", {});
    expect(r.ok).toBe(false);
  });

  it("la herramienta precios escala si getPreciosConfigResultado falla del todo, no inventa un precio", async () => {
    // Ambas consultas de precios_config fallan (columnas nuevas y legacy):
    // no hay forma de saber el precio real. Devolver PRECIOS_DEFAULT acá
    // sería inventar un precio — y puede regalar cosas que se cobran o
    // sobrecotizar otras.
    const supabase = {
      from: () => ({
        select: () => ({ data: null, error: { message: "boom" } }),
      }),
    } as never;

    const r = await ejecutarHerramienta(supabase, "precios", {});
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
