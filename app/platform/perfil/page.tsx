import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PerfilForm } from "./perfil-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, nombre, apellido, dni, celular, email, role, socio, player_number, clan_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  let clanNombre: string | null = null;
  if (profile.clan_id) {
    const { data } = await supabase
      .from("clanes")
      .select("nombre, slug")
      .eq("id", profile.clan_id)
      .maybeSingle();
    clanNombre = data?.nombre ?? null;
  }

  const sinNumero = !profile.player_number;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <p className="sect-label mb-2">Mi cuenta</p>
        <h1 className="sect-title fluid-3xl">Perfil</h1>
      </div>

      {sinNumero && (
        <div className="mb-6 border-l-2 border-orange bg-orange/5 clip-notch p-4 sm:p-5">
          <p className="sect-label mb-1 text-orange">// Falta tu número</p>
          <p className="font-sans fluid-sm text-ash">
            Necesitás un número de jugador de 6 dígitos para aparecer en el
            leaderboard y que el sistema de cancha registre tus stats. Es único
            por jugador — elegí algo memorable.
          </p>
        </div>
      )}

      <div className="mb-6 border border-rail/60 bg-carbon clip-notch p-4 sm:p-5 space-y-1">
        <SpecRow label="Nombre" value={`${profile.nombre} ${profile.apellido}`} />
        <SpecRow label="DNI" value={profile.dni} />
        <SpecRow label="Email" value={profile.email} />
        <SpecRow label="Rol" value={profile.role} />
        {profile.socio && <SpecRow label="Socio" value="Sí" highlight />}
        {clanNombre && <SpecRow label="Clan" value={clanNombre} />}
      </div>

      <PerfilForm
        celular={profile.celular}
        playerNumber={profile.player_number}
      />

      <p className="mt-6 font-mono fluid-xs text-smoke">
        Para cambiar nombre, apellido, DNI o email, hablá con un admin.
      </p>

      <div className="mt-8 pt-6 border-t border-rail/40">
        <Link
          href="/clanes"
          className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition"
        >
          Ver mi clan →
        </Link>
      </div>
    </div>
  );
}

function SpecRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="spec-row">
      <span className="k">{label}</span>
      <span className={`v ${highlight ? "text-orange" : ""}`}>{value}</span>
    </div>
  );
}
