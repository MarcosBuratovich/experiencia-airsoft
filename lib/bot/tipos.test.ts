import { describe, expect, it } from "vitest";
import { esClasificacionValida, INTENCIONES, DUDAS } from "./tipos";

describe("esClasificacionValida", () => {
  it("acepta una clasificación completa", () => {
    expect(
      esClasificacionValida({
        intencion: "privada_cumple",
        grupo_tam: 20,
        fecha_tentativa: "2026-08-16",
        duda_principal: "precio",
        primera_vez: "si",
      }),
    ).toBe(true);
  });

  it("acepta nulos en los campos opcionales", () => {
    expect(
      esClasificacionValida({
        intencion: "otro",
        grupo_tam: null,
        fecha_tentativa: null,
        duda_principal: "otro",
        primera_vez: "desconocido",
      }),
    ).toBe(true);
  });

  it("rechaza una intención que no existe", () => {
    expect(
      esClasificacionValida({
        intencion: "reclamo",
        grupo_tam: null,
        fecha_tentativa: null,
        duda_principal: "otro",
        primera_vez: "desconocido",
      }),
    ).toBe(false);
  });

  it("rechaza un grupo de tamaño absurdo", () => {
    expect(
      esClasificacionValida({
        intencion: "privada_corp",
        grupo_tam: 5000,
        fecha_tentativa: null,
        duda_principal: "otro",
        primera_vez: "no",
      }),
    ).toBe(false);
  });

  it("expone las listas para armar los schemas", () => {
    expect(INTENCIONES).toContain("partida_abierta");
    expect(DUDAS).toContain("dolor");
  });

  // --- Revisión final antes de merge: límites de grupo_tam -----------------
  // La lógica ya estaba bien (confirmado por el revisor de la tarea 1 contra
  // 17 casos límite fuera de proceso), pero el suite shipeado no cubría los
  // límites — quedaba correcta "por suerte", sin un test que reprobara si
  // alguien la rompía. GRUPO_MAX = 500.

  describe("límites de grupo_tam", () => {
    const base = {
      intencion: "otro",
      fecha_tentativa: null,
      duda_principal: "otro",
      primera_vez: "desconocido",
    };

    it("rechaza grupo_tam = 0 (no es un tamaño de grupo real — 'no sé' es null, no 0)", () => {
      expect(esClasificacionValida({ ...base, grupo_tam: 0 })).toBe(false);
    });

    it("acepta grupo_tam = 1 (el mínimo real)", () => {
      expect(esClasificacionValida({ ...base, grupo_tam: 1 })).toBe(true);
    });

    it("acepta grupo_tam = 500 (el máximo permitido, GRUPO_MAX)", () => {
      expect(esClasificacionValida({ ...base, grupo_tam: 500 })).toBe(true);
    });

    it("rechaza grupo_tam = 501 (uno por encima del máximo)", () => {
      expect(esClasificacionValida({ ...base, grupo_tam: 501 })).toBe(false);
    });

    it("rechaza grupo_tam no entero (250.5), un valor claramente dentro del rango [1, 500]", () => {
      // El chequeo de Number.isInteger corre ANTES que el de rango en
      // esClasificacionValida, así que un no-entero por encima del máximo
      // (p.ej. 500.5) también rechazaría — pero no probaría qué chequeo lo
      // agarró. 250.5 aísla el caso: solo puede fallar por no ser entero.
      expect(esClasificacionValida({ ...base, grupo_tam: 250.5 })).toBe(false);
    });
  });

  // --- Campos ausentes (undefined) vs null explícito ------------------------
  // grupo_tam y fecha_tentativa aceptan `null` (ya cubierto arriba en "acepta
  // nulos en los campos opcionales"), pero un campo AUSENTE del objeto
  // (undefined, no null) es una forma distinta de estar mal formado y tiene
  // que rechazarse igual — nunca debe tratarse como equivalente a null.

  describe("campos ausentes (undefined) vs null explícito", () => {
    it("rechaza si grupo_tam está ausente en vez de null", () => {
      const c: Record<string, unknown> = {
        intencion: "otro",
        fecha_tentativa: null,
        duda_principal: "otro",
        primera_vez: "desconocido",
      };
      expect("grupo_tam" in c).toBe(false);
      expect(esClasificacionValida(c)).toBe(false);
    });

    it("rechaza si fecha_tentativa está ausente en vez de null", () => {
      const c: Record<string, unknown> = {
        intencion: "otro",
        grupo_tam: null,
        duda_principal: "otro",
        primera_vez: "desconocido",
      };
      expect("fecha_tentativa" in c).toBe(false);
      expect(esClasificacionValida(c)).toBe(false);
    });

    it("rechaza si falta intencion (no tiene default null — es un campo requerido)", () => {
      const c: Record<string, unknown> = {
        grupo_tam: null,
        fecha_tentativa: null,
        duda_principal: "otro",
        primera_vez: "desconocido",
      };
      expect(esClasificacionValida(c)).toBe(false);
    });

    it("rechaza si falta duda_principal", () => {
      const c: Record<string, unknown> = {
        intencion: "otro",
        grupo_tam: null,
        fecha_tentativa: null,
        primera_vez: "desconocido",
      };
      expect(esClasificacionValida(c)).toBe(false);
    });

    it("rechaza si falta primera_vez", () => {
      const c: Record<string, unknown> = {
        intencion: "otro",
        grupo_tam: null,
        fecha_tentativa: null,
        duda_principal: "otro",
      };
      expect(esClasificacionValida(c)).toBe(false);
    });
  });

  // --- fecha_tentativa mal formada ------------------------------------------
  // El regex exige exactamente 'YYYY-MM-DD'. No cubre validez de calendario
  // (eso queda anotado como deuda conocida, no se toca acá) — esto prueba
  // solo el FORMATO.

  describe("fecha_tentativa mal formada", () => {
    const base = {
      intencion: "otro",
      grupo_tam: null,
      duda_principal: "otro",
      primera_vez: "desconocido",
    };

    it("rechaza una fecha con separadores '/' en vez de '-'", () => {
      expect(
        esClasificacionValida({ ...base, fecha_tentativa: "2026/08/16" }),
      ).toBe(false);
    });

    it("rechaza una fecha en formato DD-MM-YYYY", () => {
      expect(
        esClasificacionValida({ ...base, fecha_tentativa: "16-08-2026" }),
      ).toBe(false);
    });

    it("rechaza una fecha sin ceros a la izquierda (2026-8-1)", () => {
      expect(
        esClasificacionValida({ ...base, fecha_tentativa: "2026-8-1" }),
      ).toBe(false);
    });

    it("rechaza un string que no es una fecha en absoluto", () => {
      expect(
        esClasificacionValida({ ...base, fecha_tentativa: "el sábado que viene" }),
      ).toBe(false);
    });

    it("rechaza una fecha-hora ISO completa (con hora pegada)", () => {
      expect(
        esClasificacionValida({
          ...base,
          fecha_tentativa: "2026-08-16T00:00:00Z",
        }),
      ).toBe(false);
    });
  });
});
