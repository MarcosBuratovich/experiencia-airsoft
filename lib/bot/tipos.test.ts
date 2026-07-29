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
});
