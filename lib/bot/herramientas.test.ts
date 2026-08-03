import { describe, expect, it } from "vitest";
import { ESQUEMAS_HERRAMIENTAS, ejecutarHerramienta } from "./herramientas";

describe("ESQUEMAS_HERRAMIENTAS", () => {
  it("declara exactamente las dos herramientas de lectura", () => {
    // agenda_privadas se sacó: la política de escalado manda escalar apenas
    // alguien menciona privadas/cumpleaños/corporativos, así que el modelo
    // nunca llegaba a usarla (decisión de producto, no un defecto).
    expect(ESQUEMAS_HERRAMIENTAS.map((h) => h.name).sort()).toEqual([
      "precios",
      "proximas_partidas",
    ]);
  });

  // --- Revisión final antes de merge: lista negra → allowlist -------------
  // El test viejo ("ninguna herramienta puede escribir") era una lista negra
  // de 6 palabras (anotar/crear/cobrar/cancelar/actualizar/borrar) que NO
  // agarraría nombres de escritura igual de reales: inscribir, reservar,
  // pagar, anular, eliminar. Una lista negra es, por construcción, una
  // apuesta a anticipar todas las palabras peligrosas — y ya se demostró que
  // pierde. La garantía real que importa es la allowlist: el despachador
  // (ejecutarHerramienta) NUNCA ejecuta nada que no sea EXACTAMENTE uno de
  // los dos nombres declarados, sin importar qué tan "de escritura" suene el
  // nombre pedido.

  it("el despachador rechaza cualquier nombre fuera de la allowlist, incluidos verbos de escritura reales que la lista negra vieja no agarraba", async () => {
    const nombresSospechosos = [
      // Los 5 que la lista negra vieja dejaba pasar (citados en la revisión):
      "inscribir",
      "reservar",
      "pagar",
      "anular",
      "eliminar",
      // Las 6 palabras de la lista negra vieja, para no perder esa cobertura:
      "anotar",
      "crear",
      "cobrar",
      "cancelar",
      "actualizar",
      "borrar",
      // Otros verbos de escritura plausibles, para no depender de una lista
      // cerrada de "palabras peligrosas" tampoco en el test nuevo — lo que
      // se afirma es la propiedad general (dispatcher = allowlist), no una
      // lista más larga de sospechosos.
      "modificar",
      "registrar",
      "confirmar_inscripcion",
      "cobrar_entrada",
    ];

    for (const nombre of nombresSospechosos) {
      const r = await ejecutarHerramienta({} as never, nombre, {});
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/no existe/i);
    }
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

    // Sin reloj fijo a propósito: acá falla la consulta de partidas, así que
    // no hay filtro por fecha que pueda alterar el resultado.
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
    // Reloj fijo: sin esto el test se pudre solo. La partida del fixture pasó
    // a ser pasado el 2026-08-01, inscripcionAbierta la filtró, y la consulta
    // de ocupación que este test necesita que falle dejó de ejecutarse — el
    // test pasaba a verde por el motivo equivocado.
    const ahora = new Date("2026-08-01T10:00:00-03:00");
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

    const r = await ejecutarHerramienta(supabase, "proximas_partidas", {}, ahora);
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

  it("IMPORTANTE (revisión final): la herramienta precios también escala ante una lectura vacía sin error (RLS filtrando en silencio), no publica PRECIOS_DEFAULT como si fuera vigente", async () => {
    // precios_config exige `auth.uid() is not null`: un cliente sin sesión
    // no rompe la consulta, PostgREST responde 200 con `data: [], error:
    // null`. Antes del fix esto pasaba como ok:true con los defaults sin
    // tocar — entrada 25.000 cuando son 20.000, chaleco/recargas/cuota en $0
    // contra sus precios reales. Con el fix, una lectura vacía es ok:false
    // igual que una lectura que falla del todo.
    const supabase = {
      from: () => ({
        select: () => ({ data: [], error: null }),
      }),
    } as never;

    const r = await ejecutarHerramienta(supabase, "precios", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no pude ver los precios/i);
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

  // --- Revisión final antes de merge: privacidad por SALIDA, no por args --
  // El test viejo ("nunca pide partidas privadas") solo grababa qué filtros
  // recibió la query (`filtros.visibilidad === "publica"`) — quedaría en
  // verde aunque el filtro dejara de aplicarse de verdad (p.ej. un `.or()`
  // mal armado que reintroduce las privadas, o directamente sacar el
  // `.eq(visibilidad, publica)` del código pero dejarlo en un comentario).
  // Con service role obligatorio (fix de esta misma revisión en topes.ts) el
  // único control real sobre 9 eventos privados existentes pasa a ser este
  // filtro — no RLS, que queda bypasseado a propósito. El fake de abajo
  // SIMULA el filtrado real de Postgres a partir de los mismos argumentos
  // que recibe (igual que haría la base), así que si el código de
  // `proximasPartidas` alguna vez deja de mandar el filtro de visibilidad,
  // este test empieza a fallar por la SALIDA (aparece una partida privada en
  // `datos.partidas`), no solo por los argumentos.
  it("filtra partidas privadas de una mezcla pública/privada — asevera sobre lo que SALE, no sobre los argumentos de la query", async () => {
    const TODAS = [
      {
        id: "pub1",
        fecha: "2026-08-01",
        hora_inicio: "19:00:00",
        duracion_min: 180,
        modalidad: "dinamica",
        cupo_max: 30,
        estado: "abierta",
        visibilidad: "publica",
      },
      {
        id: "priv1",
        // El cumpleaños de alguien: nunca debe salir en `datos.partidas`.
        fecha: "2026-08-02",
        hora_inicio: "10:00:00",
        duracion_min: 240,
        modalidad: "dinamica",
        cupo_max: 40,
        estado: "abierta",
        visibilidad: "privada",
      },
      {
        id: "pub2",
        fecha: "2026-08-03",
        hora_inicio: "19:00:00",
        duracion_min: 180,
        modalidad: "tacsim",
        cupo_max: 20,
        estado: "abierta",
        visibilidad: "publica",
      },
      {
        id: "priv2",
        fecha: "2026-08-04",
        hora_inicio: "16:00:00",
        duracion_min: 180,
        modalidad: "dinamica",
        cupo_max: 50,
        estado: "abierta",
        visibilidad: "privada",
      },
    ];

    const filtros: Record<string, string> = {};
    let filtroFecha: string | undefined;
    const cadena = {
      gte: (_col: string, val: string) => {
        filtroFecha = val;
        return cadena;
      },
      eq: (col: string, val: string) => {
        filtros[col] = val;
        return cadena;
      },
      order: () => cadena,
      limit: async () => {
        // Simula el filtrado real que haría Postgres con los criterios que
        // el código efectivamente mandó — si `proximasPartidas` deja de
        // mandar `.eq("visibilidad", "publica")`, `filtros.visibilidad`
        // queda undefined y las privadas dejan de filtrarse acá también,
        // tal como pasaría contra una base real.
        const filtradas = TODAS.filter((p) => {
          if (filtros.estado && p.estado !== filtros.estado) return false;
          if (filtros.visibilidad && p.visibilidad !== filtros.visibilidad) {
            return false;
          }
          if (filtroFecha && p.fecha < filtroFecha) return false;
          return true;
        });
        return { data: filtradas, error: null };
      },
    };
    const supabase = {
      from: (tabla: string) => {
        if (tabla === "partidas") return { select: () => cadena };
        // "inscripciones": nadie anotado, para simplificar — no es lo que
        // este test verifica.
        return {
          select: () => ({
            in: () => ({ eq: async () => ({ data: [], error: null }) }),
          }),
        };
      },
    } as never;

    const ahora = new Date("2026-07-29T12:00:00-03:00");
    const r = await ejecutarHerramienta(supabase, "proximas_partidas", {}, ahora);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const datos = r.datos as { partidas: { fecha: string }[] };

    // Las 2 públicas salen, ninguna privada — verificado sobre lo que
    // efectivamente devuelve la herramienta.
    expect(datos.partidas.map((p) => p.fecha).sort()).toEqual([
      "2026-08-01",
      "2026-08-03",
    ]);
    expect(datos.partidas).toHaveLength(2);
  });
});
