import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyEnArgentina } from "@/lib/semana";
import { estadoEfectivo } from "@/lib/partidas";
import { restarMeses, nombreMes } from "@/lib/socios";
import { CalendarioAdmin, type ItemDia } from "./calendario-admin";

export const dynamic = "force-dynamic";

const MES_RE = /^\d{4}-\d{2}$/;

function rangoMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number);
  const desde = `${y}-${String(m).padStart(2, "0")}-01`;
  const sigY = m === 12 ? y + 1 : y;
  const sigM = m === 12 ? 1 : m + 1;
  const hasta = `${sigY}-${String(sigM).padStart(2, "0")}-01`;
  return { desde, hasta };
}

export default async function CalendarioAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const hoy = hoyEnArgentina();
  const mesActual = hoy.slice(0, 7);
  const mes = mesParam && MES_RE.test(mesParam) ? mesParam : mesActual;
  const { desde, hasta } = rangoMes(mes);

  const supabase = await createClient();

  const [{ data: partidas }, { data: solicitudes }] = await Promise.all([
    supabase
      .from("partidas")
      .select(
        "id, titulo, fecha, hora_inicio, duracion_min, modalidad, cupo_max, visibilidad, estado, private_token, organizador_id, notas, inscripciones(count)",
      )
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha")
      .order("hora_inicio"),
    supabase
      .from("solicitudes_privada")
      .select(
        "id, user_id, fecha_propuesta, hora_inicio, duracion_min, cupo_estimado, modalidad, notas, created_at",
      )
      .gte("fecha_propuesta", desde)
      .lt("fecha_propuesta", hasta)
      .eq("estado", "pendiente")
      .order("fecha_propuesta")
      .order("hora_inicio"),
  ]);

  const userIds = [...new Set((solicitudes ?? []).map((s) => s.user_id))];
  const { data: perfiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, nombre, apellido, celular")
        .in("id", userIds)
    : {
        data: [] as {
          id: string;
          nombre: string;
          apellido: string;
          celular: string;
        }[],
      };
  const perfilById = new Map((perfiles ?? []).map((p) => [p.id, p] as const));

  const items: ItemDia[] = [];
  for (const p of partidas ?? []) {
    items.push({
      tipo: "partida",
      id: p.id,
      fecha: p.fecha,
      hora: p.hora_inicio,
      titulo: p.titulo,
      modalidad: p.modalidad,
      visibilidad: p.visibilidad,
      estado: p.estado,
      estadoFx: estadoEfectivo({
        fecha: p.fecha,
        hora_inicio: p.hora_inicio,
        duracion_min: p.duracion_min,
        estado: p.estado,
      }),
      cupoMax: p.cupo_max,
      inscriptos: Array.isArray(p.inscripciones)
        ? (p.inscripciones[0]?.count ?? 0)
        : 0,
      duracionMin: p.duracion_min,
      privateToken: p.private_token,
      organizadorId: p.organizador_id,
      notas: p.notas,
    });
  }
  for (const s of solicitudes ?? []) {
    const perfil = perfilById.get(s.user_id);
    items.push({
      tipo: "solicitud",
      id: s.id,
      fecha: s.fecha_propuesta,
      hora: s.hora_inicio,
      modalidad: s.modalidad,
      cupoEstimado: s.cupo_estimado,
      duracionMin: s.duracion_min,
      notas: s.notas,
      createdAt: s.created_at,
      solicitante: perfil
        ? `${perfil.nombre ?? ""} ${perfil.apellido ?? ""}`.trim() || "—"
        : "—",
      celular: perfil?.celular ?? null,
    });
  }

  const mesPrev = restarMeses(mes, 1);
  const mesNext = restarMeses(mes, -1);
  const anio = mes.split("-")[0];
  const titulo = `${nombreMes(mes)} ${anio}`;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="sect-label mb-2">Admin · agenda</p>
          <h1 className="sect-title fluid-3xl">Calendario</h1>
        </div>
        <Link
          href="/admin/partidas"
          className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold self-center"
        >
          Lista de partidas →
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/admin/calendario?mes=${mesPrev}`}
          className="btn-ghost px-3 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold shrink-0"
        >
          ← <span className="hidden sm:inline">{nombreMes(mesPrev)}</span>
          <span className="sm:hidden">Ant</span>
        </Link>
        <div className="text-center min-w-0">
          <h2 className="sect-title fluid-xl capitalize leading-none">{titulo}</h2>
          {mes !== mesActual && (
            <Link
              href="/admin/calendario"
              className="mt-1 inline-block font-mono fluid-xs uppercase tracking-[.2em] text-orange hover:underline"
            >
              Volver a hoy
            </Link>
          )}
        </div>
        <Link
          href={`/admin/calendario?mes=${mesNext}`}
          className="btn-ghost px-3 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold shrink-0"
        >
          <span className="hidden sm:inline">{nombreMes(mesNext)}</span>
          <span className="sm:hidden">Sig</span> →
        </Link>
      </div>

      <CalendarioAdmin items={items} mes={mes} hoy={hoy} />
    </div>
  );
}
