"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { balancearBandos, type Bando } from "@/lib/bandos";
import { guardarBandosAction, limpiarBandosAction } from "./actions";

type Row = {
  id: string;
  user_id: string;
  nombre: string;
  clan_id: string | null;
  clan_nombre: string | null;
  clan_color: string | null;
  bando: Bando | null;
};

type Estado = Record<string, Bando | null>;

export function BandosBoard({
  partidaId,
  inscripciones,
}: {
  partidaId: string;
  inscripciones: Row[];
}) {
  const [estado, setEstado] = useState<Estado>(() => {
    const init: Estado = {};
    for (const r of inscripciones) init[r.user_id] = r.bando;
    return init;
  });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const counts = useMemo(() => {
    let rojo = 0,
      amarillo = 0,
      sin = 0;
    for (const r of inscripciones) {
      const b = estado[r.user_id];
      if (b === "rojo") rojo++;
      else if (b === "amarillo") amarillo++;
      else sin++;
    }
    return { rojo, amarillo, sin };
  }, [estado, inscripciones]);

  const clanesPresentes = useMemo(() => {
    const map = new Map<
      string,
      { nombre: string; color: string | null; members: string[] }
    >();
    for (const r of inscripciones) {
      if (!r.clan_id) continue;
      const existing = map.get(r.clan_id);
      if (existing) existing.members.push(r.user_id);
      else
        map.set(r.clan_id, {
          nombre: r.clan_nombre ?? "Clan",
          color: r.clan_color,
          members: [r.user_id],
        });
    }
    return map;
  }, [inscripciones]);

  const autoBalance = () => {
    const res = balancearBandos(
      inscripciones.map((r) => ({ user_id: r.user_id, clan_id: r.clan_id })),
    );
    const next: Estado = { ...estado };
    for (const a of res) next[a.user_id] = a.bando;
    setEstado(next);
    setDirty(true);
    setSaved(null);
  };

  const limpiarLocal = () => {
    const next: Estado = {};
    for (const r of inscripciones) next[r.user_id] = null;
    setEstado(next);
    setDirty(true);
    setSaved(null);
  };

  const moveOne = (userId: string, destino: Bando | null) => {
    setEstado((prev) => ({ ...prev, [userId]: destino }));
    setDirty(true);
    setSaved(null);
  };

  const moveClan = (clanId: string, destino: Bando | null) => {
    const clan = clanesPresentes.get(clanId);
    if (!clan) return;
    if (
      !confirm(
        `Mover todo el clan "${clan.nombre}" (${clan.members.length} jugadores) a ${
          destino ? destino : "sin asignar"
        }?`,
      )
    )
      return;
    setEstado((prev) => {
      const next: Estado = { ...prev };
      for (const u of clan.members) next[u] = destino;
      return next;
    });
    setDirty(true);
    setSaved(null);
  };

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      const payload = Object.entries(estado).map(([user_id, bando]) => ({
        user_id,
        bando,
      }));
      const res = await guardarBandosAction(partidaId, payload);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setDirty(false);
        setSaved(new Date());
        router.refresh();
      }
    });
  };

  const limpiarServer = () => {
    if (!confirm("Limpiar los bandos de todos los inscriptos en la DB?")) return;
    setError(null);
    startTransition(async () => {
      const res = await limpiarBandosAction(partidaId);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        limpiarLocal();
        setDirty(false);
        router.refresh();
      }
    });
  };

  const sinAsignar = inscripciones.filter((r) => !estado[r.user_id]);
  const rojoList = inscripciones.filter((r) => estado[r.user_id] === "rojo");
  const amarilloList = inscripciones.filter((r) => estado[r.user_id] === "amarillo");

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <button
          type="button"
          onClick={autoBalance}
          disabled={pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
        >
          Auto-balance
        </button>
        <button
          type="button"
          onClick={limpiarLocal}
          disabled={pending}
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
        >
          Limpiar (local)
        </button>
        <button
          type="button"
          onClick={limpiarServer}
          disabled={pending}
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
        >
          Limpiar en DB
        </button>
        <div className="flex-1" />
        {saved && !dirty && !pending && (
          <span className="font-mono fluid-xs text-green-400 uppercase tracking-[.2em]">
            Guardado
          </span>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={!dirty || pending}
          className="btn-wa px-5 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "..." : "Guardar"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Counter label="Rojo" value={counts.rojo} color="#dc2626" />
        <Counter label="Amarillo" value={counts.amarillo} color="#eab308" />
        <Counter label="Sin asignar" value={counts.sin} muted />
      </div>

      {error && (
        <p className="mb-3 font-mono fluid-xs text-orange-300">{error}</p>
      )}

      {sinAsignar.length > 0 && (
        <section className="mb-5 border border-rail/60 bg-carbon clip-notch p-4">
          <h3 className="sect-label mb-3">Sin asignar ({sinAsignar.length})</h3>
          <div className="flex flex-wrap gap-2">
            {sinAsignar.map((r) => (
              <PlayerChip
                key={r.user_id}
                row={r}
                estado={null}
                onMove={(destino) =>
                  r.clan_id ? moveClan(r.clan_id, destino) : moveOne(r.user_id, destino)
                }
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <BandoColumn
          titulo="Rojo"
          color="#dc2626"
          players={rojoList}
          estado={estado}
          onMoveOne={moveOne}
          onMoveClan={moveClan}
        />
        <BandoColumn
          titulo="Amarillo"
          color="#eab308"
          players={amarilloList}
          estado={estado}
          onMoveOne={moveOne}
          onMoveClan={moveClan}
        />
      </div>

      <p className="mt-4 font-mono fluid-xs text-smoke">
        Tip: click en un jugador para moverlo al otro bando. Si es parte de un
        clan se mueve el clan completo (con confirmación).
      </p>
    </div>
  );
}

function BandoColumn({
  titulo,
  color,
  players,
  estado,
  onMoveOne,
  onMoveClan,
}: {
  titulo: string;
  color: string;
  players: Row[];
  estado: Estado;
  onMoveOne: (userId: string, destino: Bando | null) => void;
  onMoveClan: (clanId: string, destino: Bando | null) => void;
}) {
  const actual: Bando = titulo === "Rojo" ? "rojo" : "amarillo";
  const otro: Bando = actual === "rojo" ? "amarillo" : "rojo";

  // Agrupar por clan dentro de la columna
  const clanGroups = new Map<string, Row[]>();
  const solos: Row[] = [];
  for (const p of players) {
    if (p.clan_id) {
      const arr = clanGroups.get(p.clan_id);
      if (arr) arr.push(p);
      else clanGroups.set(p.clan_id, [p]);
    } else {
      solos.push(p);
    }
  }

  return (
    <div className="border-2 clip-notch p-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className="font-display fluid-xl text-bone uppercase tracking-wider">{titulo}</span>
        </div>
        <span className="font-mono fluid-xs text-ash">{players.length}</span>
      </div>

      <div className="space-y-3">
        {Array.from(clanGroups.entries()).map(([clanId, members]) => {
          const first = members[0];
          return (
            <div
              key={clanId}
              className="border border-rail/60 bg-ink/40 clip-notch p-3"
              style={{ borderColor: first.clan_color ?? undefined }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono fluid-xs uppercase tracking-[.2em] text-bone">
                  {first.clan_nombre} ({members.length})
                </span>
                <button
                  type="button"
                  onClick={() => onMoveClan(clanId, otro)}
                  className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer"
                >
                  Mover todo →
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {members.map((r) => (
                  <PlayerChip
                    key={r.user_id}
                    row={r}
                    estado={estado[r.user_id]}
                    compact
                    onMove={(destino) => onMoveClan(clanId, destino)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {solos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {solos.map((r) => (
              <PlayerChip
                key={r.user_id}
                row={r}
                estado={estado[r.user_id]}
                onMove={(destino) => onMoveOne(r.user_id, destino)}
              />
            ))}
          </div>
        )}

        {!players.length && (
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em]">
            Vacío
          </p>
        )}
      </div>
    </div>
  );
}

function PlayerChip({
  row,
  estado: _estado,
  onMove,
  compact,
}: {
  row: Row;
  estado: Bando | null;
  onMove: (destino: Bando | null) => void;
  compact?: boolean;
}) {
  const apellido = row.nombre.split(" ").slice(-1)[0] ?? row.nombre;
  const nombre = row.nombre.split(" ").slice(0, -1).join(" ") || apellido;
  const label = compact ? apellido : `${nombre} ${apellido}`.trim();

  const toggle = () => {
    // click sobre sin-asignar → rojo, sobre rojo → amarillo, sobre amarillo → sin
    // para simplicidad lo dejamos: sobre rojo → amarillo, sobre amarillo → rojo,
    // sobre sin-asignar → rojo.
    const cur = _estado;
    const next: Bando | null = cur === "rojo" ? "amarillo" : "rojo";
    onMove(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`px-2 py-1 border font-mono fluid-xs uppercase tracking-[.15em] cursor-pointer transition ${
        compact
          ? "bg-carbon border-rail/40 hover:border-orange"
          : "bg-carbon border-rail/60 hover:border-orange"
      }`}
      style={row.clan_color ? { borderLeftColor: row.clan_color, borderLeftWidth: 3 } : undefined}
      title={row.clan_nombre ? `${row.nombre} · ${row.clan_nombre}` : row.nombre}
    >
      {label}
    </button>
  );
}

function Counter({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: number;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`border clip-notch p-3 text-center ${muted ? "border-rail/40 bg-ink/40" : "border-rail/60 bg-carbon"}`}
      style={color ? { borderColor: color } : undefined}
    >
      <div className="sect-label mb-1" style={color ? { color } : undefined}>
        {label}
      </div>
      <div className="font-display fluid-2xl text-bone">{value}</div>
    </div>
  );
}
