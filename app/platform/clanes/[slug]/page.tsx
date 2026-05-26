import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClanStats } from "@/lib/ranking";
import { SolicitarUnirseButton } from "./solicitar-unirse-button";

export default async function ClanDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clan } = await supabase
    .from("clanes")
    .select("id, slug, nombre, descripcion, color_hex, logo_url, capitan_id, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!clan) notFound();

  // Miembros del clan via la junction (con fallback al modelo viejo).
  const { data: membershipRows } = await supabase
    .from("profile_clanes")
    .select("profile_id, profiles!inner(id, nombre, apellido)")
    .eq("clan_id", clan.id);
  const miembros = (membershipRows ?? [])
    .map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return p ? { id: p.id, nombre: p.nombre, apellido: p.apellido } : null;
    })
    .filter((m): m is { id: string; nombre: string; apellido: string } => !!m)
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  const { data: misClanes } = await supabase
    .from("profile_clanes")
    .select("clan_id")
    .eq("profile_id", user.id);
  const misClanIds = new Set((misClanes ?? []).map((r) => r.clan_id));

  const { data: misSolicitudes } = await supabase
    .from("clan_requests")
    .select("id, estado, clan_id")
    .eq("user_id", user.id)
    .eq("estado", "pendiente");
  const misPendingClanIds = new Set(
    (misSolicitudes ?? []).map((r) => r.clan_id),
  );

  const soyMiembro = misClanIds.has(clan.id);
  const soyCapitan = clan.capitan_id === user.id;
  const llenoDeClanes = misClanIds.size >= 3;
  const yaSoliciteAqui = misPendingClanIds.has(clan.id);

  const capitan = miembros?.find((m) => m.id === clan.capitan_id) ?? null;
  const stats = await getClanStats(supabase, clan.id);

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/clanes"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Clanes
      </Link>

      <div className="mt-4 mb-6 flex items-center gap-4">
        <span
          className="inline-block w-10 h-10 rounded-full border border-rail/60"
          style={{ backgroundColor: clan.color_hex ?? "#666" }}
          aria-hidden
        />
        <div>
          <p className="sect-label mb-1">Clan</p>
          <h1 className="sect-title fluid-3xl">{clan.nombre}</h1>
        </div>
      </div>

      {clan.descripcion && (
        <div className="mb-6 border border-rail/60 bg-carbon clip-notch p-4 md:p-5">
          <p className="text-ash fluid-base leading-relaxed whitespace-pre-wrap">
            {clan.descripcion}
          </p>
        </div>
      )}

      <div className="mb-8 flex items-center gap-3 flex-wrap">
        {soyMiembro ? (
          <Link
            href="/mi-clan"
            className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold inline-block"
          >
            {soyCapitan ? "Gestionar clan →" : "Mis clanes →"}
          </Link>
        ) : llenoDeClanes ? (
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em]">
            Ya estás en 3 clanes (máximo). Salí de uno para unirte a éste.
          </p>
        ) : yaSoliciteAqui ? (
          <p className="font-mono fluid-xs text-orange uppercase tracking-[.2em]">
            Solicitud enviada · esperando al capitán
          </p>
        ) : (
          <SolicitarUnirseButton clanId={clan.id} />
        )}
        {soyCapitan && (
          <Link
            href={`/clanes/${clan.slug}/editar`}
            className="font-mono fluid-xs uppercase tracking-[.22em] text-orange hover:underline"
          >
            Editar clan ✎
          </Link>
        )}
      </div>

      {stats && stats.score !== 0 && (
        <section className="mb-8">
          <div className="flex items-end justify-between mb-3">
            <h2 className="sect-label">Estadísticas del clan</h2>
            <Link
              href="/clanes/ranking"
              className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.2em]"
            >
              Ver ranking →
            </Link>
          </div>
          <div className="border border-rail/60 bg-carbon clip-notch p-4 sm:p-5">
            <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="sect-label mb-1">Score</p>
                <p className="font-display fluid-3xl text-orange leading-none">
                  {stats.score}
                </p>
              </div>
              <p className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
                {stats.partidas_jugadas}{" "}
                {stats.partidas_jugadas === 1 ? "partida" : "partidas"} ·{" "}
                {stats.miembros_activos}{" "}
                {stats.miembros_activos === 1 ? "miembro activo" : "miembros activos"}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-rail/40 text-center">
              <ClanStat label="Capt." value={stats.capturas} />
              <ClanStat label="Reanim." value={stats.reanimaciones} />
              <ClanStat label="Plant." value={stats.plantos} />
              <ClanStat label="Elim." value={stats.eliminaciones} muted />
            </div>
          </div>
        </section>
      )}

      <div>
        <h2 className="sect-label mb-3">
          Miembros ({miembros?.length ?? 0})
        </h2>
        <ul className="space-y-1 font-mono fluid-xs uppercase tracking-[.18em] text-ash">
          {(miembros ?? []).map((m) => (
            <li
              key={m.id}
              className="border-b border-rail/40 py-1.5 flex items-center gap-2"
            >
              <span>
                {m.nombre} {m.apellido}
              </span>
              {m.id === clan.capitan_id && (
                <span className="px-1.5 py-0.5 bg-orange text-ink fluid-xs tracking-[.15em]">
                  Capitán
                </span>
              )}
            </li>
          ))}
          {!miembros?.length && <li className="text-smoke">Sin miembros todavía.</li>}
        </ul>
      </div>

      {capitan && !soyMiembro && (
        <p className="mt-6 font-mono fluid-xs text-smoke">
          Capitán: {capitan.nombre} {capitan.apellido}
        </p>
      )}
    </div>
  );
}

function ClanStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="sect-label mb-0.5">{label}</p>
      <p className={`font-display fluid-lg ${muted ? "text-smoke" : "text-bone"}`}>
        {value}
      </p>
    </div>
  );
}
