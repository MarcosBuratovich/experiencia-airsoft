import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { CheckinList } from "./checkin-list";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, titulo, fecha, hora_inicio, modalidad, cupo_max, precio, estado")
    .eq("id", id)
    .maybeSingle();
  if (!partida) notFound();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("id, estado, user_id, profiles!inner(nombre, apellido, dni, celular, socio), checkins(presente, pago_estado, pago_monto, nota)")
    .eq("partida_id", id)
    .in("estado", ["confirmado", "waitlist"])
    .order("created_at");

  return (
    <div>
      <Link href="/admin/partidas" className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]">
        ← Partidas
      </Link>

      <div className="mt-4 mb-8">
        <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
        <h1 className="sect-title fluid-3xl mt-3">Check-in · {partida.titulo}</h1>
        <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
          {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)} · ${partida.precio.toLocaleString("es-AR")}
        </p>
      </div>

      <CheckinList
        partidaId={partida.id}
        precio={partida.precio}
        inscripciones={(inscripciones ?? []).map((i) => {
          const p = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
          const c = Array.isArray(i.checkins) ? i.checkins[0] : i.checkins;
          return {
            id: i.id,
            nombre: `${p.nombre} ${p.apellido}`,
            dni: p.dni,
            celular: p.celular,
            socio: p.socio,
            estado: i.estado,
            checkin: c ? {
              presente: c.presente,
              pago_estado: c.pago_estado,
              pago_monto: c.pago_monto,
              nota: c.nota,
            } : null,
          };
        })}
      />
    </div>
  );
}
