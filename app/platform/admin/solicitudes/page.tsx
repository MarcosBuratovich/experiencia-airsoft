import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { SolicitudAdminCard } from "./solicitud-admin-card";

export default async function AdminSolicitudesPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("solicitudes_privada")
    .select(
      "id, user_id, fecha_propuesta, hora_inicio, duracion_min, cupo_estimado, modalidad, notas, estado, respuesta_admin, created_at, resolved_at, partida_id",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
  const profilesById = new Map<
    string,
    { nombre: string; apellido: string; celular: string; email: string }
  >();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nombre, apellido, celular, email")
      .in("id", userIds);
    for (const p of profs ?? []) {
      profilesById.set(p.id, {
        nombre: p.nombre,
        apellido: p.apellido,
        celular: p.celular,
        email: p.email,
      });
    }
  }

  const partidaIds = (rows ?? [])
    .map((r) => r.partida_id)
    .filter((v): v is string => !!v);
  const tokensById = new Map<string, string>();
  if (partidaIds.length) {
    const { data: partidas } = await supabase
      .from("partidas")
      .select("id, private_token")
      .in("id", partidaIds);
    for (const p of partidas ?? []) {
      if (p.private_token) tokensById.set(p.id, p.private_token);
    }
  }

  const pendientes = (rows ?? []).filter((r) => r.estado === "pendiente");
  const resueltas = (rows ?? []).filter((r) => r.estado !== "pendiente");

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · privadas</p>
        <h1 className="sect-title fluid-3xl">Solicitudes</h1>
      </div>

      <section className="mb-10">
        <h2 className="sect-label mb-3">Pendientes ({pendientes.length})</h2>
        {!pendientes.length ? (
          <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
            <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
              No hay solicitudes pendientes.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendientes.map((s) => (
              <SolicitudAdminCard
                key={s.id}
                solicitud={buildProps(s, profilesById, tokensById)}
              />
            ))}
          </ul>
        )}
      </section>

      {resueltas.length > 0 && (
        <section>
          <h2 className="sect-label mb-3">Historial ({resueltas.length})</h2>
          <ul className="space-y-3">
            {resueltas.map((s) => (
              <SolicitudAdminCard
                key={s.id}
                solicitud={buildProps(s, profilesById, tokensById)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  type Row = NonNullable<typeof rows>[number];

  function buildProps(
    s: Row,
    profs: typeof profilesById,
    tokens: typeof tokensById,
  ) {
    const p = profs.get(s.user_id);
    return {
      id: s.id,
      estado: s.estado,
      fecha: formatFechaLarga(s.fecha_propuesta),
      hora: formatHora(s.hora_inicio),
      modalidad: modalidadLabel(s.modalidad),
      duracion: s.duracion_min,
      cupo: s.cupo_estimado,
      notas: s.notas,
      respuesta: s.respuesta_admin,
      created_at: s.created_at,
      resolved_at: s.resolved_at,
      partidaId: s.partida_id,
      privadaToken: s.partida_id ? tokens.get(s.partida_id) ?? null : null,
      user: p
        ? {
            nombre: `${p.nombre} ${p.apellido}`,
            celular: p.celular,
            email: p.email,
          }
        : { nombre: "—", celular: "", email: "" },
    };
  }
}
