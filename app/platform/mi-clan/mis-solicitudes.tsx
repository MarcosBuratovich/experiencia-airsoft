"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarSolicitudAction } from "../clanes/actions";

type Solicitud = {
  id: string;
  estado: string;
  mensaje: string | null;
  respuesta: string | null;
  created_at: string;
  resolved_at: string | null;
  clan: { slug: string; nombre: string; color_hex: string | null };
};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

const BADGE: Record<string, string> = {
  pendiente: "bg-orange text-ink",
  aprobado: "bg-green-500 text-ink",
  rechazado: "bg-red-500 text-bone",
  cancelado: "bg-smoke/40 text-ash",
};

export function MisSolicitudes({ solicitudes }: { solicitudes: Solicitud[] }) {
  if (!solicitudes.length) return null;

  return (
    <div>
      <h2 className="sect-label mb-3">Mis solicitudes</h2>
      <ul className="space-y-2">
        {solicitudes.map((s) => (
          <SolicitudRow key={s.id} s={s} />
        ))}
      </ul>
    </div>
  );
}

function SolicitudRow({ s }: { s: Solicitud }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-4 flex flex-wrap items-center gap-3">
      <span
        className="inline-block w-4 h-4 rounded-full border border-rail/60"
        style={{ backgroundColor: s.clan.color_hex ?? "#666" }}
        aria-hidden
      />
      <Link
        href={`/clanes/${s.clan.slug}`}
        className="font-display text-bone uppercase tracking-wider hover:text-orange transition"
      >
        {s.clan.nombre}
      </Link>
      <span
        className={`px-2 py-0.5 font-mono fluid-xs uppercase tracking-[.15em] ${BADGE[s.estado] ?? ""}`}
      >
        {s.estado}
      </span>
      <span className="font-mono fluid-xs text-smoke ml-auto">
        {fechaCorta(s.resolved_at ?? s.created_at)}
      </span>
      {s.respuesta && (
        <p className="w-full pl-6 font-mono fluid-xs text-ash italic">
          Respuesta: “{s.respuesta}”
        </p>
      )}
      {s.estado === "pendiente" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await cancelarSolicitudAction(s.id);
              router.refresh();
            })
          }
          className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer disabled:opacity-50"
        >
          {pending ? "..." : "Cancelar"}
        </button>
      )}
    </li>
  );
}
