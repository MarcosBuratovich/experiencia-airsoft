import { describe, expect, it, vi } from "vitest";
import { formatearConocimiento, getConocimiento, getConocimientoResultado } from "./conocimiento";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("formatearConocimiento", () => {
  it("arma un bloque legible por entrada", () => {
    const txt = formatearConocimiento([
      { id: "1", titulo: "¿Duele?", contenido: "Pica un poco.", orden: 0 },
      { id: "2", titulo: "Edad mínima", contenido: "Desde 14.", orden: 1 },
    ]);
    expect(txt).toContain("## ¿Duele?");
    expect(txt).toContain("Pica un poco.");
    expect(txt).toContain("## Edad mínima");
  });

  it("respeta el orden recibido, no reordena", () => {
    const txt = formatearConocimiento([
      { id: "1", titulo: "Segunda", contenido: "b", orden: 1 },
      { id: "2", titulo: "Primera", contenido: "a", orden: 0 },
    ]);
    expect(txt.indexOf("Segunda")).toBeLessThan(txt.indexOf("Primera"));
  });

  it("con la base vacía deja claro que no hay nada cargado", () => {
    expect(formatearConocimiento([])).toMatch(/sin entradas/i);
  });

  it("no emite entradas con contenido en blanco", () => {
    const txt = formatearConocimiento([
      { id: "1", titulo: "Con contenido", contenido: "Algo.", orden: 0 },
      { id: "2", titulo: "Vacío", contenido: "   ", orden: 1 },
      { id: "3", titulo: "Otro con contenido", contenido: "Más.", orden: 2 },
    ]);
    expect(txt).toContain("Con contenido");
    expect(txt).not.toContain("## Vacío");
    expect(txt).toContain("Otro con contenido");
  });

  it("normaliza espacios en blanco en título para no fabricar encabezados falsos", () => {
    const txt = formatearConocimiento([
      { id: "1", titulo: "Título\ncon\nsaltos", contenido: "Contenido.", orden: 0 },
    ]);
    // Debe estar normalizado a un espacio
    expect(txt).toContain("## Título con saltos");
    // No debe haber literal \n en el título
    expect(txt).not.toContain("Título\ncon\nsaltos");
  });
});

describe("getConocimientoResultado", () => {
  it("retorna ok: false cuando la consulta falla", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              error: new Error("Consulta rota"),
              data: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const resultado = await getConocimientoResultado(mockSupabase);
    expect(resultado.ok).toBe(false);
  });

  it("retorna ok: true con entradas vacías cuando la tabla está vacía", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              error: null,
              data: [],
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const resultado = await getConocimientoResultado(mockSupabase);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.entradas).toEqual([]);
    }
  });
});

describe("getConocimiento", () => {
  it("devuelve [] cuando la consulta falla (protección de regresión)", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              error: new Error("Consulta rota"),
              data: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const entradas = await getConocimiento(mockSupabase);
    expect(entradas).toEqual([]);
  });
});
