import { describe, expect, it } from "vitest";
import {
  CHECKIN_CORRECCION_MS,
  checkinAbierto,
  enPeriodoCorreccion,
  type PartidaCore,
} from "./partidas";

/**
 * Partida de referencia: sábado 8 de agosto de 2026, 14:00, 4 horas.
 * Termina 18:00 hora argentina, o sea 21:00 UTC.
 */
const PARTIDA: PartidaCore = {
  estado: "abierta",
  fecha: "2026-08-08",
  hora_inicio: "14:00",
  duracion_min: 240,
};

/** Instante en hora argentina (UTC-3 todo el año). */
const arg = (iso: string) => new Date(`${iso}-03:00`);

const FIN = arg("2026-08-08T18:00:00");

describe("checkinAbierto", () => {
  it("está cerrado el día anterior", () => {
    expect(checkinAbierto(PARTIDA, arg("2026-08-07T23:59:59"))).toBe(false);
  });

  it("abre a la medianoche del día de la partida, no a la hora de inicio", () => {
    expect(checkinAbierto(PARTIDA, arg("2026-08-08T00:00:00"))).toBe(true);
    expect(checkinAbierto(PARTIDA, arg("2026-08-08T09:30:00"))).toBe(true);
  });

  it("sigue abierto durante la partida", () => {
    expect(checkinAbierto(PARTIDA, arg("2026-08-08T16:00:00"))).toBe(true);
  });

  it("sigue abierto justo después de que termina", () => {
    expect(checkinAbierto(PARTIDA, new Date(FIN.getTime() + 1000))).toBe(true);
  });

  it("sigue abierto a las 23 horas de terminada", () => {
    const casi = new Date(FIN.getTime() + 23 * 60 * 60 * 1000);
    expect(checkinAbierto(PARTIDA, casi)).toBe(true);
  });

  it("cierra exactamente a las 24 horas del fin", () => {
    const justoAntes = new Date(FIN.getTime() + CHECKIN_CORRECCION_MS - 1000);
    const justoDespues = new Date(FIN.getTime() + CHECKIN_CORRECCION_MS);
    expect(checkinAbierto(PARTIDA, justoAntes)).toBe(true);
    expect(checkinAbierto(PARTIDA, justoDespues)).toBe(false);
  });

  it("una partida cancelada nunca habilita check-in, ni en su propio horario", () => {
    const cancelada = { ...PARTIDA, estado: "cancelada" };
    expect(checkinAbierto(cancelada, arg("2026-08-08T16:00:00"))).toBe(false);
    expect(checkinAbierto(cancelada, new Date(FIN.getTime() + 60_000))).toBe(false);
  });

  it("una partida cerrada sí lo habilita: 'cerrada' solo cierra la inscripción", () => {
    const cerrada = { ...PARTIDA, estado: "cerrada" };
    expect(checkinAbierto(cerrada, arg("2026-08-08T16:00:00"))).toBe(true);
  });
});

describe("enPeriodoCorreccion", () => {
  it("es falso antes de que empiece la partida", () => {
    expect(enPeriodoCorreccion(PARTIDA, arg("2026-08-08T09:00:00"))).toBe(false);
  });

  it("es falso mientras se está jugando", () => {
    expect(enPeriodoCorreccion(PARTIDA, arg("2026-08-08T16:00:00"))).toBe(false);
  });

  it("es verdadero desde el fin y durante las 24 horas siguientes", () => {
    expect(enPeriodoCorreccion(PARTIDA, FIN)).toBe(true);
    expect(
      enPeriodoCorreccion(PARTIDA, new Date(FIN.getTime() + 12 * 60 * 60 * 1000)),
    ).toBe(true);
  });

  it("es falso una vez cerrada la ventana", () => {
    expect(
      enPeriodoCorreccion(PARTIDA, new Date(FIN.getTime() + CHECKIN_CORRECCION_MS)),
    ).toBe(false);
  });

  it("nunca es verdadero para una partida cancelada", () => {
    const cancelada = { ...PARTIDA, estado: "cancelada" };
    expect(enPeriodoCorreccion(cancelada, new Date(FIN.getTime() + 60_000))).toBe(
      false,
    );
  });

  it("coincide con checkinAbierto durante toda la ventana de corrección", () => {
    // Si estas dos se desincronizan, la interfaz diría "podés corregir" en un
    // momento en que el servidor rechaza la corrección.
    for (const horas of [0, 1, 6, 12, 23]) {
      const t = new Date(FIN.getTime() + horas * 60 * 60 * 1000);
      expect(enPeriodoCorreccion(PARTIDA, t)).toBe(true);
      expect(checkinAbierto(PARTIDA, t)).toBe(true);
    }
  });
});
