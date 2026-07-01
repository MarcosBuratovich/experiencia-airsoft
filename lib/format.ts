const FECHA_LARGA = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function formatFechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return FECHA_LARGA.format(new Date(y, m - 1, d));
}

export function formatHora(hhmmss: string) {
  return hhmmss.slice(0, 5);
}

const FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Formatea un timestamp ISO (timestamptz) como fecha+hora en zona Argentina. */
export function formatFechaHora(iso: string) {
  return FECHA_HORA.format(new Date(iso));
}

export function modalidadLabel(m: string) {
  if (m === "tacsim") return "TacSim";
  if (m === "speedsoft") return "Speedsoft";
  return "Dinámica";
}
