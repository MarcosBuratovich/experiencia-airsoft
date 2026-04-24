export type Bando = "rojo" | "amarillo";

export type InscriptoInput = {
  user_id: string;
  clan_id: string | null;
};

export type BandoAssignment = {
  user_id: string;
  bando: Bando;
};

/**
 * Auto-balance de bandos respetando la regla "todo un clan al mismo bando".
 *
 * Algoritmo greedy:
 *  1. Separamos inscriptos en grupos (uno por clan) + individuales (sin clan).
 *  2. Ordenamos grupos por tamaño descendente.
 *  3. Asignamos cada grupo al bando con menor cantidad actual (tie-break: rojo).
 *  4. Individuales se distribuyen al final 1×1 al bando mas chico.
 *
 * No es el problema de particion perfecto (NP) pero para 20-30 jugadores con
 * ~2-4 clanes da balance muy bueno en la practica, y es determinista si el
 * orden de entrada es determinista. El admin puede override manualmente.
 */
export function balancearBandos(inscriptos: InscriptoInput[]): BandoAssignment[] {
  // Agrupar por clan
  const clanesMap = new Map<string, InscriptoInput[]>();
  const individuales: InscriptoInput[] = [];
  for (const i of inscriptos) {
    if (i.clan_id) {
      const arr = clanesMap.get(i.clan_id);
      if (arr) arr.push(i);
      else clanesMap.set(i.clan_id, [i]);
    } else {
      individuales.push(i);
    }
  }

  const grupos = Array.from(clanesMap.values()).sort((a, b) => b.length - a.length);

  const rojo: InscriptoInput[] = [];
  const amarillo: InscriptoInput[] = [];

  const pushTo = (target: "rojo" | "amarillo", items: InscriptoInput[]) => {
    (target === "rojo" ? rojo : amarillo).push(...items);
  };

  for (const grupo of grupos) {
    const destino: Bando = amarillo.length < rojo.length ? "amarillo" : "rojo";
    pushTo(destino, grupo);
  }

  for (const ind of individuales) {
    const destino: Bando = amarillo.length < rojo.length ? "amarillo" : "rojo";
    pushTo(destino, [ind]);
  }

  const out: BandoAssignment[] = [];
  for (const i of rojo) out.push({ user_id: i.user_id, bando: "rojo" });
  for (const i of amarillo) out.push({ user_id: i.user_id, bando: "amarillo" });
  return out;
}

export const BANDO_COLOR: Record<Bando, string> = {
  rojo: "#dc2626",
  amarillo: "#eab308",
};

export const BANDO_LABEL: Record<Bando, string> = {
  rojo: "Rojo",
  amarillo: "Amarillo",
};
