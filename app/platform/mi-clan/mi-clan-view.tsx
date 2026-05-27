"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aprobarSolicitudAction,
  rechazarSolicitudAction,
  expulsarMiembroAction,
  salirDelClanAction,
  transferirCapitaniaAction,
  eliminarClanAction,
} from "../clanes/actions";

type Clan = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  color_hex: string | null;
  logo_url: string | null;
};

type Miembro = { id: string; nombre: string; flair: string | null };

type Solicitud = {
  id: string;
  mensaje: string | null;
  created_at: string;
  user: { id: string; nombre: string; apellido: string };
};

type Props = {
  clan: Clan;
  userId: string;
  soyCapitan: boolean;
  miembros: Miembro[];
  capitanId: string;
  solicitudes: Solicitud[];
};

export function MiClanView({ clan, userId, soyCapitan, miembros, capitanId, solicitudes }: Props) {
  const [error, setError] = useState<string | null>(null);
  const hayPendientes = soyCapitan && solicitudes.length > 0;

  return (
    <details
      open={hayPendientes}
      className="group border border-rail/60 bg-carbon clip-notch"
    >
      <summary className="list-none cursor-pointer p-4 sm:p-5 flex items-center gap-3 flex-wrap">
        {clan.logo_url ? (
          <Image
            src={clan.logo_url}
            alt={clan.nombre}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border border-rail/60 shrink-0"
          />
        ) : (
          <span
            className="inline-block w-10 h-10 rounded-full border border-rail/60 shrink-0"
            style={{ backgroundColor: clan.color_hex ?? "#666" }}
            aria-hidden
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
            {soyCapitan ? "Capitán" : "Miembro"}
            {hayPendientes && (
              <span className="ml-2 text-orange">
                · {solicitudes.length} pendiente{solicitudes.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
          <h2 className="font-display fluid-xl uppercase tracking-wider text-bone truncate">
            {clan.nombre}
          </h2>
        </div>
        <span className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke shrink-0 group-open:hidden">
          Expandir ↓
        </span>
        <span className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke shrink-0 hidden group-open:inline">
          Colapsar ↑
        </span>
      </summary>

      <div className="px-4 sm:px-5 pb-5 border-t border-rail/40 pt-4 space-y-6">
        <div className="flex items-center gap-3 flex-wrap font-mono fluid-xs uppercase tracking-[.22em]">
          <Link
            href={`/clanes/${clan.slug}`}
            className="text-smoke hover:text-orange"
          >
            Vista pública →
          </Link>
          {soyCapitan && (
            <Link
              href={`/clanes/${clan.slug}/editar`}
              className="text-orange hover:underline"
            >
              Editar clan ✎
            </Link>
          )}
        </div>

        {clan.descripcion && (
          <p className="text-ash fluid-sm leading-relaxed whitespace-pre-wrap">
            {clan.descripcion}
          </p>
        )}

        {error && (
          <div className="border border-orange/40 bg-orange/5 clip-notch p-3">
            <p className="font-mono fluid-xs text-orange-300">{error}</p>
          </div>
        )}

        {hayPendientes && (
          <section>
            <h3 className="sect-label mb-3">
              Solicitudes pendientes ({solicitudes.length})
            </h3>
            <ul className="space-y-2">
              {solicitudes.map((s) => (
                <SolicitudCapitanRow key={s.id} solicitud={s} setError={setError} />
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="sect-label mb-3">Miembros ({miembros.length})</h3>
          <ul className="space-y-1">
            {miembros.map((m) => (
              <MiembroRow
                key={m.id}
                miembro={m}
                clanId={clan.id}
                esCapitan={m.id === capitanId}
                soyCapitan={soyCapitan}
                esYo={m.id === userId}
                setError={setError}
              />
            ))}
          </ul>
        </section>

        <section className="border-t border-rail/40 pt-4">
          <div className="flex gap-3 flex-wrap">
            {soyCapitan ? (
              <EliminarClanButton clanId={clan.id} setError={setError} />
            ) : (
              <SalirClanButton clanId={clan.id} setError={setError} />
            )}
          </div>
        </section>
      </div>
    </details>
  );
}

function SolicitudCapitanRow({
  solicitud,
  setError,
}: {
  solicitud: Solicitud;
  setError: (e: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [respuesta, setRespuesta] = useState("");
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const router = useRouter();

  const aprobar = () => {
    setError(null);
    startTransition(async () => {
      const res = await aprobarSolicitudAction(solicitud.id);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  const rechazar = () => {
    setError(null);
    startTransition(async () => {
      const res = await rechazarSolicitudAction(solicitud.id, respuesta);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-bone">
            {solicitud.user.nombre} {solicitud.user.apellido}
          </p>
          {solicitud.mensaje && (
            <p className="font-mono fluid-xs text-ash mt-1 italic">“{solicitud.mensaje}”</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={aprobar}
            disabled={pending}
            className="btn-wa px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Aprobar
          </button>
          <button
            type="button"
            onClick={() => setMostrarRechazo((v) => !v)}
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Rechazar
          </button>
        </div>
      </div>
      {mostrarRechazo && (
        <div className="mt-3 pt-3 border-t border-rail/40 space-y-2">
          <textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Motivo del rechazo (opcional)"
            className="w-full bg-ink border border-rail/60 px-2 py-1.5 font-sans text-bone focus:border-orange outline-none text-sm"
          />
          <button
            type="button"
            onClick={rechazar}
            disabled={pending}
            className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Confirmar rechazo
          </button>
        </div>
      )}
    </li>
  );
}

function MiembroRow({
  miembro,
  clanId,
  esCapitan,
  soyCapitan,
  esYo,
  setError,
}: {
  miembro: Miembro;
  clanId: string;
  esCapitan: boolean;
  soyCapitan: boolean;
  esYo: boolean;
  setError: (e: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const expulsar = () => {
    if (!confirm(`Expulsar a ${miembro.nombre}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await expulsarMiembroAction(miembro.id, clanId);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  const transferir = () => {
    if (!confirm(`Transferir la capitanía a ${miembro.nombre}? Dejás de ser capitán.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await transferirCapitaniaAction(miembro.id, clanId);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <li className="border-b border-rail/40 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-bone flex-1 min-w-0 truncate">
        <span className={miembro.flair === "glitch" ? "text-glitch" : undefined}>
          {miembro.nombre}
        </span>{" "}
        {esYo && <span className="text-smoke">(vos)</span>}
      </span>
      {esCapitan && (
        <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
          Capitán
        </span>
      )}
      {soyCapitan && !esCapitan && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={transferir}
            disabled={pending}
            className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer disabled:opacity-50"
          >
            Pasar capitanía
          </button>
          <button
            type="button"
            onClick={expulsar}
            disabled={pending}
            className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer disabled:opacity-50"
          >
            Expulsar
          </button>
        </div>
      )}
    </li>
  );
}

function SalirClanButton({
  clanId,
  setError,
}: {
  clanId: string;
  setError: (e: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("¿Salir de este clan?")) return;
        setError(null);
        startTransition(async () => {
          const res = await salirDelClanAction(clanId);
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
      disabled={pending}
      className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
    >
      {pending ? "..." : "Salir del clan"}
    </button>
  );
}

function EliminarClanButton({
  clanId,
  setError,
}: {
  clanId: string;
  setError: (e: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (
          !confirm(
            "¿Eliminar el clan? Todos los miembros quedan sin clan. Esta acción no se puede deshacer.",
          )
        )
          return;
        setError(null);
        startTransition(async () => {
          const res = await eliminarClanAction(clanId);
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
      disabled={pending}
      className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
    >
      {pending ? "..." : "Eliminar clan"}
    </button>
  );
}
