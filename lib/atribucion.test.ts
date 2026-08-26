import { describe, expect, it } from "vitest";
import { aColumnas, parsearAtribucion } from "./atribucion";

/** Cookie válida, con las claves cortas que escribe el cliente. */
const COMPLETA = JSON.stringify({
  s: "instagram",
  m: "social",
  c: "reels-agosto",
  f: "IwAR0abc-DEF_123",
  r: "instagram.com",
  l: "/precios",
  t: "2026-08-26T10:00:00.000Z",
});

describe("parsearAtribucion", () => {
  it("parsea una cookie completa", () => {
    expect(parsearAtribucion(COMPLETA)).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "reels-agosto",
      fbclid: "IwAR0abc-DEF_123",
      referrer_host: "instagram.com",
      landing_path: "/precios",
      first_seen_at: "2026-08-26T10:00:00.000Z",
    });
  });

  it("devuelve null si no hay cookie", () => {
    expect(parsearAtribucion(undefined)).toBeNull();
    expect(parsearAtribucion(null)).toBeNull();
    expect(parsearAtribucion("")).toBeNull();
  });

  it("devuelve null si el JSON está corrupto", () => {
    expect(parsearAtribucion("{no es json")).toBeNull();
    expect(parsearAtribucion("[1,2,3]")).toBeNull();
    expect(parsearAtribucion('"un string"')).toBeNull();
  });

  it("parsea la cookie tal como la escribe el cliente (URL-encoded)", () => {
    // El componente escribe encodeURIComponent(JSON.stringify(...)). Según
    // quién lea la cookie puede llegar codificada o no; las dos tienen que
    // funcionar o la atribución se pierde entera y en silencio.
    expect(parsearAtribucion(encodeURIComponent(COMPLETA))).toEqual(
      parsearAtribucion(COMPLETA),
    );
  });

  it("devuelve null si falta el timestamp o es inválido", () => {
    expect(parsearAtribucion(JSON.stringify({ s: "google" }))).toBeNull();
    expect(parsearAtribucion(JSON.stringify({ s: "google", t: "ayer" }))).toBeNull();
  });

  it("acepta una cookie que solo tiene timestamp (tráfico directo)", () => {
    const solo = JSON.stringify({ t: "2026-08-26T10:00:00.000Z" });
    expect(parsearAtribucion(solo)).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      fbclid: null,
      referrer_host: null,
      landing_path: null,
      first_seen_at: "2026-08-26T10:00:00.000Z",
    });
  });

  it("descarta campos sucios sin invalidar el resto", () => {
    const sucio = JSON.stringify({
      s: "instagram",
      m: "<script>alert(1)</script>",
      r: "instagram.com",
      t: "2026-08-26T10:00:00.000Z",
    });
    const r = parsearAtribucion(sucio);
    expect(r?.utm_source).toBe("instagram");
    expect(r?.utm_medium).toBeNull();
    expect(r?.referrer_host).toBe("instagram.com");
  });

  it("descarta campos que no son string", () => {
    const raro = JSON.stringify({ s: 42, m: { a: 1 }, t: "2026-08-26T10:00:00.000Z" });
    const r = parsearAtribucion(raro);
    expect(r?.utm_source).toBeNull();
    expect(r?.utm_medium).toBeNull();
  });

  it("trunca valores muy largos en vez de descartarlos", () => {
    const largo = JSON.stringify({ s: "a".repeat(500), t: "2026-08-26T10:00:00.000Z" });
    expect(parsearAtribucion(largo)?.utm_source).toHaveLength(100);
  });

  it("permite los caracteres reales de un landing path", () => {
    const p = JSON.stringify({ l: "/blog/que-es-airsoft", t: "2026-08-26T10:00:00.000Z" });
    expect(parsearAtribucion(p)?.landing_path).toBe("/blog/que-es-airsoft");
  });

  it("normaliza una fecha con forma valida pero dia inexistente", () => {
    // Postgres rechazaria "2026-02-30"; Date lo rueda al 2 de marzo.
    const raro = JSON.stringify({ s: "google", t: "2026-02-30T00:00:00.000Z" });
    expect(parsearAtribucion(raro)?.first_seen_at).toBe("2026-03-02T00:00:00.000Z");
  });

  it("devuelve null si la fecha no se puede parsear ni rodando", () => {
    const imposible = JSON.stringify({ s: "google", t: "2026-13-45T99:99:99.000Z" });
    expect(parsearAtribucion(imposible)).toBeNull();
  });

  it("no explota con una cookie que rompe decodeURIComponent", () => {
    // decodeURIComponent("%") tira URIError. El catch interno tiene que
    // contenerlo: parsearAtribucion nunca puede propagar una excepcion.
    expect(() => parsearAtribucion("%")).not.toThrow();
    expect(parsearAtribucion("%")).toBeNull();
  });
});

describe("aColumnas", () => {
  it("mapea first_seen_at a la columna atribucion_first_seen_at", () => {
    const attr = parsearAtribucion(COMPLETA)!;
    expect(aColumnas(attr)).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "reels-agosto",
      fbclid: "IwAR0abc-DEF_123",
      referrer_host: "instagram.com",
      landing_path: "/precios",
      atribucion_first_seen_at: "2026-08-26T10:00:00.000Z",
    });
  });

  it("no deja ninguna clave que no sea columna real", () => {
    const attr = parsearAtribucion(COMPLETA)!;
    expect(Object.keys(aColumnas(attr))).not.toContain("first_seen_at");
  });
});
