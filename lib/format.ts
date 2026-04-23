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

export function modalidadLabel(m: string) {
  if (m === "tacsim") return "TacSim";
  if (m === "speedsoft") return "Speedsoft";
  return "Dinámica";
}
