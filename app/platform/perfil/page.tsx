import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClanesPorProfileIds } from "@/lib/clanes";
import { PerfilForm } from "./perfil-form";
import { CambiarContrasenaSection } from "./cambiar-contrasena";
import { BorrarCuentaSection } from "./borrar-cuenta";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, nombre, apellido, alias, dni, celular, email, role, socio, player_number",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const clanesMap = await getClanesPorProfileIds(supabase, [user.id]);
  const misClanes = clanesMap.get(user.id) ?? [];

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
        <SpecRow label="DNI" value={profile.dni} />
        <SpecRow label="Email" value={profile.email} />
        <SpecRow label="Rol" value={profile.role} />
        {profile.socio && <SpecRow label="Socio" value="Sí" highlight />}
        {misClanes.length > 0 && (
          <SpecRow
            label={misClanes.length === 1 ? "Clan" : `Clanes (${misClanes.length})`}
            value={misClanes.map((c) => c.nombre).join(" · ")}
          />
        )}
      </div>

      <PerfilForm
        nombre={profile.nombre}
        apellido={profile.apellido}
        celular={profile.celular}
        playerNumber={profile.player_number}
        alias={profile.alias ?? null}
      />

      <p className="mt-6 font-mono fluid-xs text-smoke">
        Para cambiar tu DNI o email, hablá con un admin.
      </p>

      <div className="mt-8 pt-6 border-t border-rail/40">
        <Link
          href={misClanes.length ? "/mi-clan" : "/clanes"}
          className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition"
        >
          {misClanes.length ? "Mis clanes →" : "Buscar clanes →"}
        </Link>
      </div>

      <CambiarContrasenaSection />
      <BorrarCuentaSection email={profile.email} />
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
