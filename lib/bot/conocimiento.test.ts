import { describe, expect, it } from "vitest";
import { formatearConocimiento } from "./conocimiento";

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
});
