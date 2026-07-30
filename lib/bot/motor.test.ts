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

  it("no manda ningún texto cuando escala por falla técnica", async () => {
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
        usage: USO,
        content: [
          { type: "tool_use", id: "h1", name: "precios", input: {} },
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
            input: { texto: "Sale $18.000.", escalar: false, clasificacion: CLASIF_OK },
          },
        ],
      },
    ]);

    const supabase = {
      from: () => ({ select: async () => ({ data: [], error: null }) }),
    } as never;

    const r = await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5" },
      entrada,
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(r.tipo).toBe("responder");
    // El uso se acumula entre las dos llamadas.
    if (r.tipo === "responder") expect(r.uso.entrada).toBe(200);
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

  it("escala si el modelo nunca llama a responder", async () => {
    const { cliente } = anthropicFake([
      { stop_reason: "end_turn", usage: USO, content: [{ type: "text", text: "eh" }] },
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
    if (r.tipo === "escalar") expect(r.motivo).toMatch(/técnic|api/i);
  });

  it("corta el bucle de herramientas y escala si el modelo no termina nunca", async () => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: "tool_use",
      usage: USO,
      content: [{ type: "tool_use", id: "h", name: "precios", input: {} }],
    });
    const cliente = { messages: { create } } as never;
    const supabase = {
      from: () => ({ select: async () => ({ data: [], error: null }) }),
    } as never;

    const r = await generarRespuesta(
      { anthropic: cliente, supabase, modelo: "claude-sonnet-5", maxVueltas: 3 },
      entrada,
    );
    expect(r.tipo).toBe("escalar");
    expect(create.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
