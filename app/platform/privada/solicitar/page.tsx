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
        {isAdmin ? (
          <p className="mt-3 text-ash fluid-sm">
            Click en cualquier slot para crear una partida directa o liberar
            un slot reservado para que un usuario pueda pedirlo.
          </p>
        ) : (
          <div className="mt-4 border border-orange/40 bg-orange/5 clip-notch p-4 sm:p-5">
            <p className="sect-label mb-2 text-orange">
              // Antes de elegir un horario
            </p>
            <p className="font-sans fluid-sm text-bone leading-relaxed">
              Las privadas son para grupos de{" "}
              <span className="text-orange font-semibold">10 personas o más</span>
              {" "}— cumpleaños, despedidas, eventos corporativos, juntas de
              clan. Duran 4 horas en cancha exclusiva.
            </p>
            <ol className="mt-3 space-y-1.5 font-mono fluid-xs text-ash">
              <li>
                <span className="text-orange mr-2">1.</span>
                Elegí día y horario libre en el calendario de abajo.
              </li>
              <li>
                <span className="text-orange mr-2">2.</span>
                Decinos cuántos van a venir y de qué se trata.
              </li>
              <li>
                <span className="text-orange mr-2">3.</span>
                Te abrimos <span className="text-bone">WhatsApp con el mensaje listo</span>{" "}
                para confirmar todo con el dueño.
              </li>
              <li>
                <span className="text-orange mr-2">4.</span>
                Mientras coordinamos, el slot queda reservado para vos.
              </li>
            </ol>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono fluid-xs uppercase tracking-[.15em]">
        <LegendItem
          cls="bg-green-500/5 border-green-500/50 text-green-400"
          label="Libre"
        />
        <LegendItem
          cls="bg-orange/15 border-orange/60 text-orange"
          label="Pendiente"
        />
        <LegendItem
          cls="bg-amber-500/5 border-dashed border-amber-500/60 text-amber-400"
          label="Reservado"
        />
        <LegendItem
          cls="bg-red-500/10 border-red-400/50 text-red-300"
          label="Pública"
        />
        <LegendItem
          cls="bg-orange/30 border-orange text-bone"
          label="Tomado"
        />
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
