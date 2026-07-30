import { describe, expect, it } from "vitest";
import { construirSistema, ESQUEMA_RESPONDER } from "./prompt";

describe("construirSistema", () => {
  it("separa instrucciones y conocimiento en bloques distintos", () => {
    const bloques = construirSistema("## ¿Duele?\nPica.");
    expect(bloques.length).toBe(2);
    expect(bloques[1].text).toContain("Pica.");
  });

  it("marca ambos bloques para caché", () => {
    const bloques = construirSistema("x");
    expect(bloques).toHaveLength(2);
    expect(bloques[0].cache_control).toBeDefined();
    expect(bloques[1].cache_control).toBeDefined();
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

  it("incluye reglas anti-repetición explícitas", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    // Una plantilla fija es la causa principal de que un bot suene mecánico.
    // Verificar que están las reglas específicas que lo evitan:
    expect(txt).toMatch(/no.*repita.*frase.*ya dijiste/i);
    expect(txt).toMatch(/si.*ya saludaste.*no vuelvas.*saludar/i);
    expect(txt).toMatch(/si.*ya pasaste.*link.*no.*vuelvas.*pasar/i);
    expect(txt).toMatch(/no.*estructura fija/i);
    expect(txt).toMatch(/no existe.*frase.*no te entendí/i);
  });

  // --- Revisión tarea 10: dos zonas grises resueltas explícitamente --------

  it("el alta de socio escala (compromiso de pago recurrente)", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/dar(se)? de alta.*socio.*compromiso.*pago recurrente/i);
  });

  it("preguntar por un servicio que no se ofrece NO escala", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/no escala.*algo que no ofrecemos/i);
    expect(txt).toMatch(/paintball/i);
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
