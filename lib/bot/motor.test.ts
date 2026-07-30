import { describe, expect, it, vi } from "vitest";
import { generarRespuesta } from "./motor";

const USO = {
  input_tokens: 100,
  output_tokens: 20,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const CLASIF_OK = {
  intencion: "partida_abierta",
  grupo_tam: null,
  fecha_tentativa: null,
  duda_principal: "precio",
  primera_vez: "desconocido",
};

function anthropicFake(respuestas: unknown[]) {
  const create = vi.fn();
  for (const r of respuestas) create.mockResolvedValueOnce(r);
  return { create, cliente: { messages: { create } } as never };
}

const deps = (cliente: never) => ({
  anthropic: cliente,
  supabase: {} as never,
  modelo: "claude-sonnet-5",
});

const entrada = {
  historial: [
    { rol: "usuario" as const, texto: "cuanto sale?", creado_at: "2026-07-29T12:00:00Z" },
  ],
  conocimiento: "## Nada\ntodavía",
};

describe("generarRespuesta", () => {
  it("devuelve el texto cuando el modelo llama a responder", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "La entrada sale $18.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("responder");
    if (r.tipo === "responder") {
      expect(r.texto).toBe("La entrada sale $18.000.");
      expect(r.clasificacion.intencion).toBe("partida_abierta");
      expect(r.uso.entrada).toBe(100);
    }
  });

  it("escala cuando el modelo lo pide, con motivo y resumen", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: {
              texto: "Te contesta alguien del equipo en un rato.",
              escalar: true,
              motivo: "cumpleaños",
              resumen: "Quiere un cumple de 15 para 20 personas.",
              clasificacion: { ...CLASIF_OK, intencion: "privada_cumple" },
            },
          },
        ],
      },
    ]);

    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("escalar");
    if (r.tipo === "escalar") {
      expect(r.resumen).toContain("cumple");
      expect(r.motivo).toBe("cumpleaños");
      // Escalada por política: sí se despide antes de callarse.
      expect(r.texto).toContain("equipo");
    }
  });

  it("no manda texto cuando el modelo no usa la herramienta de respuesta", async () => {
    // B-4: este test se llamaba "...escala por falla técnica" pero el fixture
    // no representa una falla de API (esa está más abajo, con el mock que
    // rechaza) — representa al modelo devolviendo texto suelto en vez de
    // llamar a "responder". Nombre corregido para que diga lo que prueba, y
    // se sacó el duplicado exacto que había más abajo con otro nombre.
    const { cliente } = anthropicFake([
      { stop_reason: "end_turn", usage: USO, content: [{ type: "text", text: "eh" }] },
    ]);
    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("escalar");
    // Un mensaje de error nunca llega al cliente.
    if (r.tipo === "escalar") expect(r.texto).toBeNull();
  });

  it("ejecuta una herramienta y vuelve a preguntar al modelo", async () => {
    const { create, cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: { ...USO, input_tokens: 100 },
        content: [
          { type: "tool_use", id: "h1", name: "precios", input: {} },
        ],
      },
      {
        stop_reason: "tool_use",
        usage: { ...USO, input_tokens: 200 },
        content: [
          {
            type: "tool_use",
            id: "t2",
            name: "responder",
            input: { texto: "Sale $18.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              key: "entrada_byop",
              valor: 20000,
              valor_efectivo: 20000,
              valor_transferencia: 20000,
            },
          ],
          error: null,
        }),
      }),
    } as never;

    const r = await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5" },
      entrada,
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(r.tipo).toBe("responder");
    // B-4: valores DISTINTOS por vuelta (100 + 200). Con 100/100 (como estaba
    // antes) un motor roto que solo tomara la última llamada y la duplicara,
    // o que solo tomara la última sin más, daba el mismo 200 que el
    // resultado correcto — el test no distinguía "suma" de "última x2".
    if (r.tipo === "responder") expect(r.uso.entrada).toBe(300);
  });

  it("escala si la clasificación que devuelve el modelo es inválida", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: {
              texto: "hola",
              escalar: false,
              clasificacion: { ...CLASIF_OK, intencion: "inventada" },
            },
          },
        ],
      },
    ]);

    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("escalar");
  });

  it("reintenta una vez si la API falla, y escala si falla de nuevo", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("503"))
      .mockRejectedValueOnce(new Error("503"));
    const cliente = { messages: { create } } as never;

    const r = await generarRespuesta(deps(cliente), entrada);
    expect(create).toHaveBeenCalledTimes(2);
    expect(r.tipo).toBe("escalar");
    if (r.tipo === "escalar") {
      expect(r.motivo).toMatch(/técnic|api/i);
      // B-4: faltaba la aserción central del criterio 1 en la ÚNICA falla
      // técnica real de API de la suite — nunca un texto de error al cliente.
      expect(r.texto).toBeNull();
    }
  });

  it("corta el bucle de herramientas y escala si el modelo no termina nunca", async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: "tool_use",
      usage: USO,
      content: [{ type: "tool_use", id: "h", name: "precios", input: {} }],
    });
    const cliente = { messages: { create } } as never;
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              key: "entrada_byop",
              valor: 20000,
              valor_efectivo: 20000,
              valor_transferencia: 20000,
            },
          ],
          error: null,
        }),
      }),
    } as never;

    const r = await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5", maxVueltas: 3 },
      entrada,
    );
    expect(r.tipo).toBe("escalar");
    expect(create.mock.calls.length).toBeLessThanOrEqual(4);
  });

  // --- Tests que faltaban (pedidos en revisión) ---------------------------

  it("mapea los tres roles del historial: usuario→user, bot y humano→assistant", async () => {
    const { create, cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "Dale, cualquier cosa avisá.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    const historialTresRoles = [
      { rol: "usuario" as const, texto: "hola, cuanto sale?", creado_at: "2026-07-29T11:00:00Z" },
      { rol: "bot" as const, texto: "Hola! la entrada sale $18.000.", creado_at: "2026-07-29T11:01:00Z" },
      { rol: "humano" as const, texto: "y te confirmo que hay lugar el sábado.", creado_at: "2026-07-29T11:02:00Z" },
      { rol: "usuario" as const, texto: "dale, gracias", creado_at: "2026-07-29T11:03:00Z" },
    ];

    await generarRespuesta(deps(cliente), { ...entrada, historial: historialTresRoles });

    const enviados = create.mock.calls[0][0].messages as { role: string }[];
    expect(enviados.map((m) => m.role)).toEqual(["user", "assistant", "assistant", "user"]);
  });

  it("escala en silencio si el modelo llama a responder con texto vacío", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "   ", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);
    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("escalar");
    if (r.tipo === "escalar") {
      expect(r.texto).toBeNull();
      expect(r.motivo).toMatch(/vac/i);
    }
  });

  it("si el primer intento falla pero el reintento funciona, responde normal (sin escalar)", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "Sale $18.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      });
    const cliente = { messages: { create } } as never;

    const r = await generarRespuesta(deps(cliente), entrada);
    expect(create).toHaveBeenCalledTimes(2);
    expect(r.tipo).toBe("responder");
    if (r.tipo === "responder") expect(r.texto).toBe("Sale $18.000.");
  });

  it("si una herramienta falla, el tool_result que vuelve al modelo trae is_error true", async () => {
    const { create, cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [{ type: "tool_use", id: "h1", name: "precios", input: {} }],
      },
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t2",
            name: "responder",
            input: {
              texto: "Ahora no puedo confirmarte el precio, ya te contesta alguien.",
              escalar: true,
              motivo: "no se pudo consultar precios",
              resumen: "Preguntó precio, la herramienta de precios falló.",
              clasificacion: CLASIF_OK,
            },
          },
        ],
      },
    ]);

    // Mismo fixture de falla que usa herramientas.test.ts para "precios".
    const supabase = {
      from: () => ({ select: () => ({ data: null, error: { message: "boom" } }) }),
    } as never;

    await generarRespuesta({ anthropic: cliente, supabase, modelo: "claude-sonnet-5" }, entrada);

    expect(create).toHaveBeenCalledTimes(2);
    const segundaLlamada = create.mock.calls[1][0] as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const ultimoMensaje = segundaLlamada.messages[segundaLlamada.messages.length - 1];
    const toolResult = (
      ultimoMensaje.content as Array<{ type: string; is_error?: boolean; content?: string }>
    )[0];
    expect(toolResult.is_error).toBe(true);
    expect(typeof toolResult.content).toBe("string");
  });

  // --- B-1: thinking desactivado + max_tokens holgado e inyectable --------

  it("B-1: manda thinking desactivado y sube max_tokens por defecto respecto de los 700 originales", async () => {
    const { create, cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "hola", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    await generarRespuesta(deps(cliente), entrada);

    const params = create.mock.calls[0][0] as { thinking?: unknown; max_tokens: number };
    expect(params.thinking).toEqual({ type: "disabled" });
    expect(params.max_tokens).toBeGreaterThan(700);
  });

  it("B-1/B-10: max_tokens es inyectable por DepsMotor, igual que maxVueltas", async () => {
    const { create, cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "hola", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    await generarRespuesta(
      { anthropic: cliente, supabase: {} as never, modelo: "claude-sonnet-5", maxTokens: 300 },
      entrada,
    );

    const params = create.mock.calls[0][0] as { max_tokens: number };
    expect(params.max_tokens).toBe(300);
  });

  // --- H6 (revisión tarea 10): tool_choice fuerza usar alguna herramienta --

  it("H6: manda tool_choice 'any' — el modelo no puede contestar en texto plano en ningún turno", async () => {
    const { create, cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "hola", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    await generarRespuesta(deps(cliente), entrada);

    // CRÍTICO (revisión final antes de merge): "any" solo no alcanza. Sin
    // disable_parallel_tool_use:true (default `false` en el SDK) el modelo
    // puede emitir en el MISMO turno [tool_use precios, tool_use responder],
    // y "responder" traería un precio escrito sin haber visto el resultado
    // real de "precios" — el bot inventando un dato. Este assert confirma
    // que el request efectivamente lo lleva (no alcanza con el código
    // "pareciendo" correcto).
    const params = create.mock.calls[0][0] as { tool_choice?: unknown };
    expect(params.tool_choice).toEqual({
      type: "any",
      disable_parallel_tool_use: true,
    });
  });

  // --- CRÍTICO (revisión final): el agujero de raíz que tool_choice.any ---
  // ---   sin disable_parallel_tool_use dejaba abierto -----------------------
  //
  // Ninguno de los fixtures de este archivo tenía dos tool_use en el mismo
  // array de `content` — con tool_choice:{type:"any"} (sin el flag) el
  // modelo podía mandar [tool_use precios, tool_use responder] en UN solo
  // turno, y el motor viejo hacía `usos.find(u => u.name === "responder")` y
  // devolvía ESO directo, sin ejecutar nunca la herramienta hermana. Es "el
  // bot inventa un precio": interpretarRespuesta recibe un `input.texto` que
  // el modelo escribió sin haber visto el dato real.
  //
  // Decisión de diseño (pedida explícitamente en la revisión): ante ese
  // turno, el motor NO escala en silencio — ejecuta la herramienta de datos
  // hermana y sigue la conversación (acotado por maxVueltas, que ya escala
  // si nunca converge). Se prefiere esto a escalar de entrada porque: (a) es
  // el mismo criterio que ya usa el resto del motor con fallas recuperables
  // (una herramienta que falla no fuerza escalada; se le da al modelo la
  // chance de decidir con el error en mano — ver el test de
  // "is_error true" más arriba); (b) descartar la vuelta entera tiraría a la
  // basura una herramienta que el modelo pidió de buena fe y que cuesta
  // tokens reales; (c) sigue siendo imposible mandar texto sin el dato,
  // porque la "responder" prematura NUNCA se trata como final — solo cambia
  // si el motor lo intenta resolver una vuelta más o se rinde al agotar
  // maxVueltas (fail closed de cualquier forma).
  it("CRÍTICO: un tool_use de 'responder' junto a otra herramienta en el mismo turno no cierra la respuesta sin haber ejecutado esa herramienta", async () => {
    const { create, cliente } = anthropicFake([
      {
        // El modelo pide precios Y responde EN EL MISMO turno — el caso que
        // tool_choice:any sin disable_parallel_tool_use permitía.
        stop_reason: "tool_use",
        usage: USO,
        content: [
          { type: "tool_use", id: "h1", name: "precios", input: {} },
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: {
              texto: "La entrada sale $999.999 (inventado, sin consultar precios).",
              escalar: false,
              clasificacion: CLASIF_OK,
            },
          },
        ],
      },
      {
        // Segunda vuelta: ahora "responder" llega SOLA, ya informada por el
        // resultado real de "precios".
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t2",
            name: "responder",
            input: { texto: "La entrada sale $20.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              key: "entrada_byop",
              valor: 20000,
              valor_efectivo: 20000,
              valor_transferencia: 20000,
            },
          ],
          error: null,
        }),
      }),
    } as never;

    const r = await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5" },
      entrada,
    );

    // Tuvo que haber una segunda vuelta: la "responder" prematura no cerró sola.
    expect(create).toHaveBeenCalledTimes(2);
    expect(r.tipo).toBe("responder");
    if (r.tipo === "responder") {
      // Se manda el texto de la vuelta que llegó SOLA — nunca el que vino
      // pegado a "precios" sin haber visto su resultado.
      expect(r.texto).toBe("La entrada sale $20.000.");
      expect(r.texto).not.toContain("999.999");
    }

    // La herramienta de datos SÍ se ejecutó en la primera vuelta (no se
    // descartó junto con la "responder" prematura): su tool_result vuelve
    // sin error.
    const segundaLlamada = create.mock.calls[1][0] as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const mensajeConResultados =
      segundaLlamada.messages[segundaLlamada.messages.length - 1];
    const resultados = mensajeConResultados.content as Array<{
      tool_use_id: string;
      is_error?: boolean;
    }>;
    const resultadoPrecios = resultados.find((x) => x.tool_use_id === "h1");
    expect(resultadoPrecios?.is_error).toBe(false);

    // La "responder" prematura también recibió su propio tool_result (la API
    // exige uno por cada tool_use del turno), marcado como error — para que
    // el modelo sepa que esa llamada puntual no valió.
    const resultadoResponderPrematura = resultados.find(
      (x) => x.tool_use_id === "t1",
    );
    expect(resultadoResponderPrematura?.is_error).toBe(true);
  });

  it("CRÍTICO: onVuelta señala la 'responder' prematura sin contarla como herramienta de datos", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          { type: "tool_use", id: "h1", name: "precios", input: {} },
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: { texto: "inventado", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t2",
            name: "responder",
            input: { texto: "Sale $20.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              key: "entrada_byop",
              valor: 20000,
              valor_efectivo: 20000,
              valor_transferencia: 20000,
            },
          ],
          error: null,
        }),
      }),
    } as never;

    const vueltas: { nota: string; herramientas: { nombre: string; ok: boolean }[] }[] = [];
    await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5", onVuelta: (info) => vueltas.push(info) },
      entrada,
    );

    // Solo "precios" cuenta como herramienta de datos de la vuelta 0 — la
    // "responder" prematura no se reporta como si lo fuera.
    expect(vueltas[0].herramientas).toEqual([{ nombre: "precios", ok: true }]);
    expect(vueltas[0].nota).toMatch(/responder.*junto a otra herramienta/i);
  });

  // --- H1 (revisión tarea 10): onVuelta, observabilidad sin efecto ---------

  it("H1: onVuelta se llama una vez por vuelta, con la herramienta de datos y si salió bien", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [{ type: "tool_use", id: "h1", name: "precios", input: {} }],
      },
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t2",
            name: "responder",
            input: { texto: "Sale $18.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              key: "entrada_byop",
              valor: 20000,
              valor_efectivo: 20000,
              valor_transferencia: 20000,
            },
          ],
          error: null,
        }),
      }),
    } as never;

    const vueltas: unknown[] = [];
    await generarRespuesta(
      {
        anthropic: cliente,
        supabase,
        modelo: "claude-sonnet-5",
        onVuelta: (info) => vueltas.push(info),
      },
      entrada,
    );

    expect(vueltas).toEqual([
      { vuelta: 0, nota: "", herramientas: [{ nombre: "precios", ok: true }] },
      { vuelta: 1, nota: "", herramientas: [] },
    ]);
  });

  it("H1: onVuelta reporta la herramienta como ok:false si la herramienta falla", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [{ type: "tool_use", id: "h1", name: "precios", input: {} }],
      },
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t2",
            name: "responder",
            input: {
              texto: "Ahora no puedo confirmarte el precio.",
              escalar: true,
              motivo: "falló precios",
              resumen: "no se pudo consultar",
              clasificacion: CLASIF_OK,
            },
          },
        ],
      },
    ]);
    const supabase = {
      from: () => ({ select: () => ({ data: null, error: { message: "boom" } }) }),
    } as never;

    const vueltas: { herramientas: { nombre: string; ok: boolean }[] }[] = [];
    await generarRespuesta(
      {
        anthropic: cliente,
        supabase,
        modelo: "claude-sonnet-5",
        onVuelta: (info) => vueltas.push(info),
      },
      entrada,
    );

    expect(vueltas[0].herramientas).toEqual([{ nombre: "precios", ok: false }]);
  });

  it("H1: onVuelta trae una nota no vacía cuando la vuelta escala (sin usar ninguna herramienta)", async () => {
    const { cliente } = anthropicFake([
      { stop_reason: "end_turn", usage: USO, content: [{ type: "text", text: "eh" }] },
    ]);
    const vueltas: { nota: string }[] = [];
    await generarRespuesta(
      { ...deps(cliente), onVuelta: (info) => vueltas.push(info) },
      entrada,
    );
    expect(vueltas).toHaveLength(1);
    expect(vueltas[0].nota).not.toBe("");
  });

  // --- B-2: stop_reason nunca se ignora ------------------------------------

  it("B-2: si el turno se corta por max_tokens, escala en silencio aunque venga un tool_use de responder", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "max_tokens",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: {
              // Texto con pinta de cortado a mitad de camino — no debe
              // interpretarse ni mandarse nunca.
              texto: "La entrada sale $18.000 y el alquiler de equipo sa",
              escalar: false,
              clasificacion: CLASIF_OK,
            },
          },
        ],
      },
    ]);
    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("escalar");
    if (r.tipo === "escalar") {
      expect(r.texto).toBeNull();
      expect(r.motivo).toMatch(/token/i);
    }
  });

  // --- B-3: la forma del historial se valida antes de llamar ---------------

  describe("B-3: forma del historial", () => {
    it("historial vacío: escala sin llamar a la API", async () => {
      const { create, cliente } = anthropicFake([]);
      const r = await generarRespuesta(deps(cliente), { ...entrada, historial: [] });
      expect(create).not.toHaveBeenCalled();
      expect(r.tipo).toBe("escalar");
      if (r.tipo === "escalar") expect(r.texto).toBeNull();
    });

    it("termina en un turno del dueño (se reactivó el bot y no hay mensaje nuevo): escala sin llamar", async () => {
      const { create, cliente } = anthropicFake([]);
      const historial = [
        { rol: "usuario" as const, texto: "hola", creado_at: "2026-07-29T11:00:00Z" },
        { rol: "humano" as const, texto: "te contesto en un rato", creado_at: "2026-07-29T11:05:00Z" },
      ];
      const r = await generarRespuesta(deps(cliente), { ...entrada, historial });
      expect(create).not.toHaveBeenCalled();
      expect(r.tipo).toBe("escalar");
    });

    it("arranca con un turno del dueño pero termina con el cliente: igual escala sin llamar (la API exige que el primer turno sea del cliente)", async () => {
      const { create, cliente } = anthropicFake([]);
      const historial = [
        { rol: "bot" as const, texto: "Hola! te contesto por acá.", creado_at: "2026-07-29T11:00:00Z" },
        { rol: "usuario" as const, texto: "hola, cuanto sale?", creado_at: "2026-07-29T11:01:00Z" },
      ];
      const r = await generarRespuesta(deps(cliente), { ...entrada, historial });
      expect(create).not.toHaveBeenCalled();
      expect(r.tipo).toBe("escalar");
    });

    it("descarta mensajes de texto vacío antes de decidir si hay turno de cliente al final", async () => {
      const { create, cliente } = anthropicFake([
        {
          stop_reason: "tool_use",
          usage: USO,
          content: [
            {
              type: "tool_use",
              id: "t1",
              name: "responder",
              input: { texto: "hola!", escalar: false, clasificacion: CLASIF_OK },
            },
          ],
        },
      ]);
      const historial = [
        { rol: "usuario" as const, texto: "hola", creado_at: "2026-07-29T11:00:00Z" },
        // Vacío: se descarta. Sin ese descarte, "termina en bot" haría
        // escalar sin llamar; con el descarte, el historial efectivo termina
        // en el usuario y sí debe llamar.
        { rol: "bot" as const, texto: "  ", creado_at: "2026-07-29T11:01:00Z" },
      ];
      const r = await generarRespuesta(deps(cliente), { ...entrada, historial });
      expect(create).toHaveBeenCalledTimes(1);
      expect(r.tipo).toBe("responder");
    });
  });

  // --- B-5: CLASIF_DESCONOCIDA no se comparte por referencia ---------------

  it("B-5: no contamina entre llamadas — mutar la clasificación de una respuesta no afecta a la siguiente", async () => {
    const { cliente: cliente1 } = anthropicFake([
      { stop_reason: "end_turn", usage: USO, content: [{ type: "text", text: "eh" }] },
    ]);
    const r1 = await generarRespuesta(deps(cliente1), entrada);
    expect(r1.tipo).toBe("escalar");
    // Mutación deliberada, simulando un consumidor descuidado.
    (r1.clasificacion as { intencion: string }).intencion = "mutado";

    const { cliente: cliente2 } = anthropicFake([
      { stop_reason: "end_turn", usage: USO, content: [{ type: "text", text: "eh" }] },
    ]);
    const r2 = await generarRespuesta(deps(cliente2), entrada);
    expect(r2.clasificacion.intencion).toBe("otro");
  });

  // --- B-9: maxVueltas inválido cae al default, no hace 0 llamadas --------

  it("B-9: maxVueltas en NaN cae al default en vez de hacer 0 llamadas a la API", async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: "tool_use",
      usage: USO,
      content: [{ type: "tool_use", id: "h", name: "precios", input: {} }],
    });
    const cliente = { messages: { create } } as never;
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              key: "entrada_byop",
              valor: 20000,
              valor_efectivo: 20000,
              valor_transferencia: 20000,
            },
          ],
          error: null,
        }),
      }),
    } as never;

    const r = await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5", maxVueltas: Number.NaN },
      entrada,
    );
    // Con el bug (`?? default` deja pasar NaN, y `vuelta <= NaN` es siempre
    // false) esto daba 0 llamadas. Con el fix cae al default (6 → 7 vueltas).
    expect(create.mock.calls.length).toBe(7);
    expect(r.tipo).toBe("escalar");
  });

  // --- B-11: la despedida de una escalada de política no se pierde --------

  it("B-11: si escalar es true y el texto es válido, manda la despedida aunque la clasificación venga inválida", async () => {
    const { cliente } = anthropicFake([
      {
        stop_reason: "tool_use",
        usage: USO,
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "responder",
            input: {
              texto: "Te contesta alguien del equipo en un rato.",
              escalar: true,
              motivo: "cumpleaños",
              resumen: "Pregunta por un cumple.",
              clasificacion: { ...CLASIF_OK, intencion: "inventada" }, // inválida
            },
          },
        ],
      },
    ]);
    const r = await generarRespuesta(deps(cliente), entrada);
    expect(r.tipo).toBe("escalar");
    if (r.tipo === "escalar") {
      expect(r.texto).toBe("Te contesta alguien del equipo en un rato.");
      expect(r.motivo).toBe("cumpleaños");
      // La clasificación cae a la de descarte, pero la despedida se manda igual.
      expect(r.clasificacion.intencion).toBe("otro");
    }
  });

  // --- Defensa en el borde (revisión tarea 10): sintaxis interna filtrada -
  // Hallazgo real, no reproducible a demanda: una corrida trajo
  // `</parameter><parameter name="escalar">false` pegado al final de un
  // texto por lo demás normal. Es basura técnica que jamás debe llegar a un
  // cliente real. No se intenta limpiar y mandar el resto — una respuesta
  // parcialmente corrupta es tan mala como una cortada por max_tokens (B-2):
  // se escala en silencio, con un motivo que el panel pueda mostrar.

  describe("defensa contra sintaxis interna filtrada en el texto", () => {
    async function generarConTexto(texto: string, escalar = false) {
      const input = escalar
        ? {
            texto,
            escalar: true,
            motivo: "cumpleaños",
            resumen: "Quiere un cumple de 15.",
            clasificacion: { ...CLASIF_OK, intencion: "privada_cumple" },
          }
        : { texto, escalar: false, clasificacion: CLASIF_OK };

      const { cliente } = anthropicFake([
        {
          stop_reason: "tool_use",
          usage: USO,
          content: [{ type: "tool_use", id: "t1", name: "responder", input }],
        },
      ]);
      return generarRespuesta(deps(cliente), entrada);
    }

    it("detecta el caso real observado: </parameter><parameter name=escalar>false", async () => {
      const r = await generarConTexto(
        '¿Van con equipo o precisan alquilar?</parameter>\n    <parameter name="escalar">false',
      );
      expect(r.tipo).toBe("escalar");
      if (r.tipo === "escalar") {
        expect(r.texto).toBeNull();
        expect(r.motivo).toMatch(/sintaxis interna/i);
      }
    });

    it("detecta <function y <invoke (otra sintaxis de function-calling)", async () => {
      const r = await generarConTexto(
        'Dale, ya te confirmo <function_calls><invoke name="precios">',
      );
      expect(r.tipo).toBe("escalar");
      if (r.tipo === "escalar") expect(r.texto).toBeNull();
    });

    it("detecta <antml", async () => {
      const r = await generarConTexto("El precio es $20.000 <parameter>");
      expect(r.tipo).toBe("escalar");
      if (r.tipo === "escalar") expect(r.texto).toBeNull();
    });

    it('detecta name="clasificacion" aunque no venga la etiqueta <parameter completa', async () => {
      const r = await generarConTexto('Dale, te confirmo. name="clasificacion" listo');
      expect(r.tipo).toBe("escalar");
      if (r.tipo === "escalar") expect(r.texto).toBeNull();
    });

    it("aplica también al camino de escalada de política, no solo al de responder", async () => {
      const r = await generarConTexto("Te paso con el equipo.</parameter>", true);
      expect(r.tipo).toBe("escalar");
      if (r.tipo === "escalar") {
        expect(r.texto).toBeNull();
        expect(r.motivo).toMatch(/sintaxis interna/i);
      }
    });

    it("NO marca por error un texto legítimo que usa el signo de menor (<)", async () => {
      const r = await generarConTexto(
        "Dale, somos más de 10 personas: el grupo va de 8 a <12 según cómo confirmen.",
      );
      expect(r.tipo).toBe("responder");
      if (r.tipo === "responder") {
        expect(r.texto).toContain("<12");
      }
    });
  });
});
