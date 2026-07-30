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

  it("H3: no ofrece una partida de hoy si ya cerró la inscripción, aunque 'fecha' siga siendo hoy", async () => {
    // Hoy 29/7 a las 21:00. La partida es hoy a las 19:00 (ya pasó el
    // margen de INSCRIPCION_CIERRE_MIN, 30 min). "fecha >= hoy" no alcanza
    // para filtrarla: hay que mirar si todavía se puede anotar.
    const ahora = new Date("2026-07-29T21:00:00-03:00");
    const partida = {
      id: "p1",
      fecha: "2026-07-29",
      hora_inicio: "19:00:00",
      duracion_min: 180,
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
        // "inscripciones": sin inscriptos. Si esto se llega a consultar
        // para esta partida ya cerrada, algo está mal, pero que no explote.
        return {
          select: () => ({
            in: () => ({ eq: async () => ({ data: [], error: null }) }),
          }),
        };
      },
    } as never;

    const r = await ejecutarHerramienta(supabase, "proximas_partidas", {}, ahora);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const datos = r.datos as { partidas: unknown[] };
      expect(datos.partidas).toEqual([]);
    }
  });

  it("H1: agenda_privadas no trunca en silencio — con dias=21 (default) la última fecha del rango tiene que aparecer", async () => {
    // Con las 3 tablas que usa getSlotsEstado vacías (sin partidas, sin
    // solicitudes, sin overrides), cada día tiene A LO SUMO 1 de sus 4 slots
    // reservado por el horario recurrente de públicas (HORARIOS_RECURRENTES
    // solo pisa Mié/Jue 19:00 y Sáb/Dom 9:00) — el resto queda "disponible".
    // Con dias=21 hay ~70 slots libres. La lista plana vieja los cortaba a
    // 20 y perdía todo lo posterior a los primeros días.
    const vacio = { data: [], error: null };
    const supabase = {
      from: (tabla: string) => {
        if (tabla === "partidas") {
          return {
            select: () => ({
              gte: () => ({ lte: () => ({ neq: async () => vacio }) }),
            }),
          };
        }
        if (tabla === "solicitudes_privada") {
          return {
            select: () => ({
              gte: () => ({ lte: () => ({ eq: async () => vacio }) }),
            }),
          };
        }
        // "slots_privada_overrides"
        return { select: () => ({ gte: () => ({ lte: async () => vacio }) }) };
      },
    } as never;

    const ahora = new Date("2026-07-29T10:00:00-03:00");
    const r = await ejecutarHerramienta(supabase, "agenda_privadas", {}, ahora);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const datos = r.datos as {
      cobertura_hasta: string;
      dias_con_lugar: { fecha: string; horas: string[] }[];
    };

    // La última fecha de un rango de 21 días desde 2026-07-29 es 2026-08-18.
    // Cualquiera sea su día de semana, tiene como mucho 1 slot reservado de
    // 4 — nunca puede faltar de la respuesta.
    const ultimaFecha = "2026-08-18";
    expect(datos.cobertura_hasta).toBe(ultimaFecha);
    const entradaUltimoDia = datos.dias_con_lugar.find(
      (d) => d.fecha === ultimaFecha,
    );
    expect(entradaUltimoDia).toBeDefined();
    expect(entradaUltimoDia!.horas.length).toBeGreaterThanOrEqual(3);
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
