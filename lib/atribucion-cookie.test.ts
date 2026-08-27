import { describe, expect, it } from "vitest";
import {
  armarDatosAtribucion,
  MAX_LARGO,
  MAX_LARGO_FBCLID,
} from "./atribucion-cookie";

const AHORA = new Date("2026-08-26T10:00:00.000Z");

describe("armarDatosAtribucion", () => {
  it("arma la cookie con utms, fbclid, referrer y landing path", () => {
    const q = new URLSearchParams({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "reels-agosto",
      fbclid: "IwAR0abc-DEF_123",
    });
    const datos = armarDatosAtribucion({
      searchParams: q,
      refererHeader: "https://l.instagram.com/algo",
      pathname: "/precios",
      ahora: AHORA,
    });
    expect(datos).toEqual({
      s: "instagram",
      m: "social",
      c: "reels-agosto",
      f: "IwAR0abc-DEF_123",
      r: "l.instagram.com",
      l: "/precios",
      t: "2026-08-26T10:00:00.000Z",
    });
  });

  it("cuando no hay ningun query param ni referrer, solo queda el timestamp y el landing path", () => {
    const datos = armarDatosAtribucion({
      searchParams: new URLSearchParams(),
      refererHeader: null,
      pathname: "/",
      ahora: AHORA,
    });
    expect(datos).toEqual({ l: "/", t: "2026-08-26T10:00:00.000Z" });
  });

  it("descarta el referrer si su host es de produccion (navegacion interna)", () => {
    const datos = armarDatosAtribucion({
      searchParams: new URLSearchParams(),
      refererHeader: "https://www.experienciaairsoft.com/otra-pagina",
      pathname: "/precios",
      ahora: AHORA,
    });
    expect(datos.r).toBeUndefined();

    const desdeApp = armarDatosAtribucion({
      searchParams: new URLSearchParams(),
      refererHeader: "https://app.experienciaairsoft.com/partidas",
      pathname: "/precios",
      ahora: AHORA,
    });
    expect(desdeApp.r).toBeUndefined();
  });

  it("no explota si el referer no es una URL valida", () => {
    expect(() =>
      armarDatosAtribucion({
        searchParams: new URLSearchParams(),
        refererHeader: "no-es-una-url",
        pathname: "/",
        ahora: AHORA,
      }),
    ).not.toThrow();

    const datos = armarDatosAtribucion({
      searchParams: new URLSearchParams(),
      refererHeader: "no-es-una-url",
      pathname: "/",
      ahora: AHORA,
    });
    expect(datos.r).toBeUndefined();
  });

  it("trunca valores muy largos en vez de descartarlos", () => {
    const q = new URLSearchParams({
      utm_source: "a".repeat(500),
      fbclid: "b".repeat(500),
    });
    const datos = armarDatosAtribucion({
      searchParams: q,
      refererHeader: null,
      pathname: "/",
      ahora: AHORA,
    });
    expect(datos.s).toHaveLength(MAX_LARGO);
    expect(datos.f).toHaveLength(MAX_LARGO_FBCLID);
  });

  it("descarta un intento de inyeccion en un campo sin invalidar el resto", () => {
    const q = new URLSearchParams({
      utm_source: "instagram",
      utm_campaign: "<script>alert(1)</script>",
    });
    const datos = armarDatosAtribucion({
      searchParams: q,
      refererHeader: null,
      pathname: "/",
      ahora: AHORA,
    });
    expect(datos.s).toBe("instagram");
    expect(datos.c).toBeUndefined();
  });

  it("acepta nombres de campana en espanol, con espacio y tilde", () => {
    const q = new URLSearchParams({ utm_campaign: "Promoción Agosto" });
    const datos = armarDatosAtribucion({
      searchParams: q,
      refererHeader: null,
      pathname: "/",
      ahora: AHORA,
    });
    expect(datos.c).toBe("Promoción Agosto");
  });

  it("usa la fecha actual cuando no se inyecta 'ahora'", () => {
    const antes = Date.now();
    const datos = armarDatosAtribucion({
      searchParams: new URLSearchParams(),
      refererHeader: null,
      pathname: "/",
    });
    const despues = Date.now();
    const t = new Date(datos.t).getTime();
    expect(t).toBeGreaterThanOrEqual(antes);
    expect(t).toBeLessThanOrEqual(despues);
  });
});
