import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSlotsEstado,
  rangoDeFechasAhora,
  SLOTS_PRIVADA,
} from "@/lib/slots-privada";
import { HORARIOS_RECURRENTES } from "@/lib/horarios";
import { CalendarioPrivada } from "./calendario-privada";

export const dynamic = "force-dynamic";

const VENTANA_DIAS = 28; // 4 semanas

export default async function SolicitarPrivadaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const fechas = rangoDeFechasAhora(VENTANA_DIAS);
  const estados = await getSlotsEstado(supabase, fechas);

  // Plano de slots [{ fecha, hora, estado }] para pasar al cliente.
  const slots = fechas.flatMap((fecha) =>
    SLOTS_PRIVADA.map(({ hora, label }) => ({
      fecha,
      hora,
      label,
      estado: estados.get(`${fecha}|${hora}`) ?? "disponible",
    })),
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={isAdmin ? "/admin/partidas" : "/mis-solicitudes"}
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← {isAdmin ? "Admin partidas" : "Mis solicitudes"}
      </Link>
      <div className="mt-4 mb-6">
        <p className="sect-label mb-2">
          {isAdmin ? "Admin · calendario privadas" : "Privada · reservar"}
        </p>
        <h1 className="sect-title fluid-3xl">
          {isAdmin ? "Calendario de privadas" : "Reservar partida privada"}
        </h1>
        <p className="mt-3 text-ash fluid-sm">
          {isAdmin
            ? "Click en cualquier slot para crear una partida directa o liberar un slot reservado para que un usuario pueda pedirlo."
            : "Cada partida dura 4 horas. Elegí un slot libre y un admin la confirma. Mientras tu solicitud está pendiente, ese slot queda bloqueado para los demás."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono fluid-xs uppercase tracking-[.15em]">
        <LegendItem cls="bg-carbon border-rail/60 text-bone" label="Libre" />
        <LegendItem cls="bg-orange/15 border-orange/50 text-orange" label="Pendiente" />
        <LegendItem cls="bg-ink/40 border-rail/40 text-smoke" label="Reservado" />
        <LegendItem cls="bg-ink/40 border-rail/40 text-smoke" label="Pública" />
        <LegendItem cls="bg-ink/40 border-rail/40 text-smoke" label="Tomado" />
      </div>

      <CalendarioPrivada slots={slots} isAdmin={isAdmin} />

      <div className="mt-8 border border-rail/60 bg-carbon clip-notch p-4">
        <p className="sect-label mb-2">Slots reservados para públicas</p>
        <ul className="font-mono fluid-xs text-ash space-y-1">
          {HORARIOS_RECURRENTES.map((s) => (
            <li key={s.label}>· {s.label}</li>
          ))}
        </ul>
        <p className="mt-3 font-mono fluid-xs text-smoke">
          Aparecen como &ldquo;reservado&rdquo; en el calendario. Si necesitás
          uno de estos, pedile a un admin que lo habilite.
        </p>
      </div>
    </div>
  );
}

function LegendItem({ cls, label }: { cls: string; label: string }) {
  return (
    <div className={`border px-2 py-1 clip-notch ${cls} text-center`}>
      {label}
    </div>
  );
}
