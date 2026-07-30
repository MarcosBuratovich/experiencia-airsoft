import { describe, expect, it } from "vitest";
import { construirSistema, ESQUEMA_RESPONDER } from "./prompt";

describe("construirSistema", () => {
  it("separa instrucciones y conocimiento en bloques distintos", () => {
    const bloques = construirSistema("## ¿Duele?\nPica.");
    expect(bloques.length).toBe(2);
    expect(bloques[1].text).toContain("Pica.");
  });

  it("marca el prefijo para caché", () => {
    const bloques = construirSistema("x");
    const cacheados = bloques.filter((b) => b.cache_control);
    expect(cacheados.length).toBeGreaterThan(0);
  });

  it("incluye la prohibición de repetirse", () => {
    const txt = construirSistema("x")
      .map((b) => b.text)
      .join("\n");
    expect(txt).toMatch(/no.*repit/i);
    expect(txt).toMatch(/no.*volver a saludar|ya saludaste/i);
  });

  it("prohíbe inventar precios", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/nunca.*invent/i);
  });

  it("no impone una plantilla de respuesta", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    // Una plantilla fija es la causa principal de que un bot suene mecánico.
    expect(txt).not.toMatch(/siempre respondé (con|así):/i);
  });
});

describe("ESQUEMA_RESPONDER", () => {
  it("obliga a texto y clasificación", () => {
    const req = (ESQUEMA_RESPONDER.input_schema as { required: string[] }).required;
    expect(req).toContain("texto");
    expect(req).toContain("clasificacion");
    expect(req).toContain("escalar");
  });
});
