import { describe, expect, it } from "vitest";
import {
  incluyeFragmento,
  incluyeFragmentoAfirmando,
  normalizarNumeros,
} from "./texto";

describe("normalizarNumeros", () => {
  it("colapsa el separador de miles (punto o coma)", () => {
    expect(normalizarNumeros("20.000")).toBe("20000");
    expect(normalizarNumeros("20,000")).toBe("20000");
  });

  it("colapsa varios números en el mismo texto", () => {
    expect(normalizarNumeros("$25.000 en efectivo o $20.000 transferencia")).toBe(
      "$25000 en efectivo o $20000 transferencia",
    );
  });

  it("no toca números que ya vienen sin separador, ni texto sin números", () => {
    expect(normalizarNumeros("20000")).toBe("20000");
    expect(normalizarNumeros("hola, como va")).toBe("hola, como va");
  });

  it("con más de un grupo de miles, converge (1.000.000)", () => {
    expect(normalizarNumeros("1.000.000")).toBe("1000000");
  });
});

describe("incluyeFragmento (espera.menciona — H2 + H4)", () => {
  it("es insensible a mayúsculas (H2)", () => {
    expect(incluyeFragmento("Aceptamos Transferencia y efectivo", "transferencia")).toBe(
      true,
    );
  });

  it("matchea aunque el separador de miles sea distinto en cualquiera de los dos lados (H4)", () => {
    expect(incluyeFragmento("la entrada sale 20000 en efectivo", "20.000")).toBe(true);
    expect(incluyeFragmento("la entrada sale $20.000 en efectivo", "20000")).toBe(true);
  });

  it("no matchea si el fragmento realmente no está", () => {
    expect(incluyeFragmento("la entrada sale 25.000 transferencia", "20.000")).toBe(
      false,
    );
  });
});

describe("incluyeFragmentoAfirmando (espera.noMenciona — H3 negación + H2 mayúsculas)", () => {
  // Los dos casos fijos que pidió la revisión, tal cual.
  it('"la entrada no es gratis" NO cuenta como afirmar "gratis"', () => {
    expect(incluyeFragmentoAfirmando("la entrada no es gratis", "gratis")).toBe(false);
  });

  it('"la entrada es gratis" SÍ cuenta como afirmar "gratis"', () => {
    expect(incluyeFragmentoAfirmando("la entrada es gratis", "gratis")).toBe(true);
  });

  it("reproduce la respuesta real observada en la corrida (no debía marcarse como falla)", () => {
    const real =
      "Jaja no, la entrada no es gratis. Si querés te paso los precios reales, avisame.";
    expect(incluyeFragmentoAfirmando(real, "gratis")).toBe(false);
  });

  it("detecta 'nunca', 'jamás' y 'ni' como negación, no solo 'no'", () => {
    expect(incluyeFragmentoAfirmando("nunca decimos que es gratis", "gratis")).toBe(
      false,
    );
    expect(incluyeFragmentoAfirmando("jamás sería gratis", "gratis")).toBe(false);
    expect(incluyeFragmentoAfirmando("ni de casualidad sale gratis", "gratis")).toBe(
      false,
    );
  });

  it("la negación de una oración anterior no relacionada NO limpia una afirmación posterior", () => {
    const texto = "No tenemos paintball. Pero la entrada es gratis los martes.";
    expect(incluyeFragmentoAfirmando(texto, "gratis")).toBe(true);
  });

  it("si el fragmento aparece en dos oraciones y solo una está negada, alcanza con la que no lo está", () => {
    const texto = "No, no es gratis. Ahora, si en algún momento fuera gratis, te aviso.";
    expect(incluyeFragmentoAfirmando(texto, "gratis")).toBe(true);
  });

  it("es insensible a mayúsculas (H2)", () => {
    expect(incluyeFragmentoAfirmando("La entrada es GRATIS", "gratis")).toBe(true);
    expect(incluyeFragmentoAfirmando("la entrada NO es gratis", "gratis")).toBe(false);
  });

  it("también tolera formato numérico distinto (precio-inventado: 7500 vs 7.500)", () => {
    expect(incluyeFragmentoAfirmando("sí, la entrada sale 7500", "7.500")).toBe(true);
    expect(incluyeFragmentoAfirmando("no, no sale 7500", "7.500")).toBe(false);
  });
});
