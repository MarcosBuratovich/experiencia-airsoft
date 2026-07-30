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

  // --- Revisión tarea 10 (ronda 3): "nunca inventes" generalizado ----------
  // El hallazgo más caro del banco: con la regla acotada a precio/fecha/
  // disponibilidad, el modelo "hacía lo que hace un modelo sin instrucción"
  // ante todo lo demás (edad, duchas, estacionamiento) — producía algo
  // plausible en vez de escalar. La regla tiene que cubrir CUALQUIER dato
  // del lugar, con ejemplos, sin ser una lista cerrada que deje huecos.

  it("generaliza la prohibición de inventar a cualquier dato del lugar, no solo precio/fecha/disponibilidad", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/lo único que sabés del lugar.*herramientas/i);
    expect(txt).toMatch(/no lo sabés.*no lo deduzcas.*no lo estimes.*no lo supongas/i);
  });

  it("da ejemplos de datos del lugar (edad, instalaciones, cómo llegar) sin cerrarlos en una lista taxativa", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/edad mínima/i);
    expect(txt).toMatch(/duchas/i);
    expect(txt).toMatch(/cómo llegar/i);
    // Marcado explícitamente como ejemplos, no la lista completa — así no
    // deja huecos para la próxima pregunta no anticipada.
    expect(txt).toMatch(/son ejemplos.*no.*lista cerrada/i);
  });

  it("una respuesta plausible pero falsa es peor que escalar", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/plausible.*peor que escalar/i);
  });

  it("sigue prohibiendo inventar precio/fecha/disponibilidad (no lo perdió al generalizar)", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/nunca inventes un precio.*fecha.*lugar disponible/i);
  });

  // Regresión encontrada en la corrida real: la primera generalización era
  // TAN amplia que el bot empezó a escalar hasta "puedo ir en short?" (5/5),
  // un dato universal del deporte (las bolitas pegan) que antes contestaba
  // bien sin ayuda. Hace falta la distinción explícita, sin reabrir la
  // puerta a inventar reglas puntuales del juego.
  it("puede responder sobre ropa/calzado sin escalar (física del deporte, no dato de este lugar en particular)", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/igual en cualquier cancha de airsoft.*razón física/i);
    expect(txt).toMatch(/ropa que cubra.*calzado cerrado/i);
  });

  it("pero las reglas puntuales del juego siguen siendo dato del lugar (no reabre la puerta a inventarlas)", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/reglas puntuales del juego.*siguen siendo dato del lugar/i);
  });

  // --- Revisión tarea 10 (ronda 3): regresión encontrada al generalizar ----
  // Con la regla de "Datos" más extensa, el modelo empezó a resolver pedidos
  // de descuento el mismo (contestaba el precio real de la herramienta y
  // decía que no hay descuento, sin escalar — 5/5 en la corrida real). No
  // estaba "negociando" en sentido estricto, así que técnicamente cumplía la
  // regla vieja. Este test cierra ese hueco explícitamente.
  it("un pedido de descuento escala aunque el precio real ya se sepa por la herramienta (no alcanza con decir que no hay)", () => {
    const txt = construirSistema("x").map((b) => b.text).join("\n");
    expect(txt).toMatch(/descuento.*no negociás.*ni siquiera para decir que no hay/i);
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
