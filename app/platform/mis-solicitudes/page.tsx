import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { MiSolicitudRow } from "./mi-solicitud-row";

export default async function MisSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mis-solicitudes");

  const { data: solicitudes } = await supabase
    .from("solicitudes_privada")
    .select(
      "id, fecha_propuesta, hora_inicio, duracion_min, cupo_estimado, modalidad, notas, estado, respuesta_admin, created_at, resolved_at, partida_id",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Al abrir esta pantalla, las solicitudes resueltas dejan de ser "novedad"
  // (limpia el badge del nav). Idempotente; si falta la migración fase-16 no
  // rompe (la update falla en silencio).
  await supabase
    .from("solicitudes_privada")
    .update({ resuelto_visto: true })
    .eq("user_id", user.id)
    .in("estado", ["aprobada", "rechazada"])
    .eq("resuelto_visto", false);

  const partidaIds = (solicitudes ?? [])
    .map((s) => s.partida_id)
    .filter((v): v is string => !!v);

  const partidasPrivadas = new Map<string, string>();
  if (partidaIds.length) {
    const { data: partidas } = await supabase
      .from("partidas")
      .select("id, private_token")
      .in("id", partidaIds);
    for (const p of partidas ?? []) {
      if (p.private_token) partidasPrivadas.set(p.id, p.private_token);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="sect-label mb-2">Privadas</p>
          <h1 className="sect-title fluid-3xl">Mis solicitudes</h1>
        </div>
        <Link
          href="/privada/solicitar"
          className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold"
        >
          + Nueva solicitud
        </Link>
      </div>

      {ok && (
        <div className="mb-6 border border-green-500/40 bg-green-500/5 clip-notch p-3">
          <p className="font-mono fluid-xs text-green-400 uppercase tracking-[.25em]">
            Solicitud enviada · esperando aprobación
          </p>
        </div>
      )}

      {!solicitudes?.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            No enviaste ninguna solicitud todavía.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {solicitudes.map((s) => (
            <MiSolicitudRow
              key={s.id}
              solicitud={{
                id: s.id,
                fecha: formatFechaLarga(s.fecha_propuesta),
                hora: formatHora(s.hora_inicio),
                modalidad: modalidadLabel(s.modalidad),
                cupo: s.cupo_estimado,
                duracion: s.duracion_min,
                notas: s.notas,
                estado: s.estado,
                respuesta: s.respuesta_admin,
                created_at: s.created_at,
                resolved_at: s.resolved_at,
                partidaId: s.partida_id,
                privadaToken: s.partida_id ? partidasPrivadas.get(s.partida_id) ?? null : null,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
