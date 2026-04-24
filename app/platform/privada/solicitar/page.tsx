import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HORARIOS_RECURRENTES } from "@/lib/horarios";
import { SolicitarPrivadaForm } from "./solicitar-privada-form";

export default async function SolicitarPrivadaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pendiente } = await supabase
    .from("solicitudes_privada")
    .select("id")
    .eq("user_id", user.id)
    .eq("estado", "pendiente")
    .maybeSingle();

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/mis-solicitudes"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Mis solicitudes
      </Link>
      <div className="mt-4 mb-6">
        <p className="sect-label mb-2">Privada · solicitud</p>
        <h1 className="sect-title fluid-3xl">Pedir partida privada</h1>
        <p className="mt-3 text-ash fluid-sm">
          Si querés organizar una partida con tu grupo fuera de los horarios
          regulares, pedilo acá. Un admin la aprueba y te pasamos el link para
          que la compartas con tus amigos.
        </p>
      </div>

      <div className="mb-6 border border-rail/60 bg-carbon clip-notch p-4">
        <p className="sect-label mb-2">Horarios que NO se pueden pedir</p>
        <ul className="font-mono fluid-xs text-ash space-y-1">
          {HORARIOS_RECURRENTES.map((s) => (
            <li key={s.label}>· {s.label}</li>
          ))}
        </ul>
        <p className="mt-3 font-mono fluid-xs text-smoke">
          Estos slots están reservados para las partidas públicas regulares.
        </p>
      </div>

      {pendiente ? (
        <div className="border border-orange/40 bg-orange/5 clip-notch p-4">
          <p className="font-mono fluid-xs uppercase tracking-[.25em] text-orange mb-2">
            Ya tenés una solicitud pendiente
          </p>
          <p className="text-ash fluid-sm">
            Esperá que un admin la resuelva antes de mandar otra.
          </p>
          <Link
            href="/mis-solicitudes"
            className="btn-ghost mt-4 inline-block px-4 py-2 clip-tag uppercase tracking-wider fluid-xs"
          >
            Ver mis solicitudes →
          </Link>
        </div>
      ) : (
        <SolicitarPrivadaForm />
      )}
    </div>
  );
}
