import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { BandosBoard } from "./bandos-board";

export default async function BandosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, titulo, fecha, hora_inicio, modalidad, cupo_max, estado")
    .eq("id", id)
    .maybeSingle();
  if (!partida) notFound();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select(
      "id, user_id, estado, bando, profiles!inner(id, nombre, apellido, clan_id, clanes(id, nombre, color_hex))",
    )
    .eq("partida_id", id)
    .eq("estado", "confirmado")
    .order("created_at");

  type Row = {
    id: string;
    user_id: string;
    nombre: string;
    clan_id: string | null;
    clan_nombre: string | null;
    clan_color: string | null;
    bando: "rojo" | "amarillo" | null;
  };

  const rows: Row[] = (inscripciones ?? []).map((i) => {
    const p = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
    const clan = p?.clanes
      ? Array.isArray(p.clanes)
        ? p.clanes[0]
        : p.clanes
      : null;
    return {
      id: i.id,
      user_id: i.user_id,
      nombre: `${p?.nombre ?? ""} ${p?.apellido ?? ""}`.trim(),
      clan_id: p?.clan_id ?? null,
      clan_nombre: clan?.nombre ?? null,
      clan_color: clan?.color_hex ?? null,
      bando: (i.bando as "rojo" | "amarillo" | null) ?? null,
    };
  });

  return (
    <div>
      <Link
        href={`/admin/partidas/${partida.id}/checkin`}
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Check-in
      </Link>

      <div className="mt-4 mb-6">
        <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
        <h1 className="sect-title fluid-3xl mt-3">Bandos · {partida.titulo}</h1>
        <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
          {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)} ·{" "}
          {rows.length} confirmados
        </p>
      </div>

      <BandosBoard partidaId={partida.id} inscripciones={rows} />
    </div>
  );
}
