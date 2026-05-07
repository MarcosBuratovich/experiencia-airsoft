import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NuevoClanForm } from "./nuevo-clan-form";

export default async function NuevoClanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.clan_id) {
    redirect("/mi-clan");
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/clanes"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Clanes
      </Link>
      <div className="mt-4 mb-6">
        <p className="sect-label mb-2">Comunidad · nuevo</p>
        <h1 className="sect-title fluid-3xl">Crear clan</h1>
        <p className="mt-3 text-ash fluid-sm">
          Al crear el clan pasás a ser capitán. Podés aprobar o rechazar
          solicitudes de otros jugadores y mantener el roster.
        </p>
      </div>
      <NuevoClanForm />
    </div>
  );
}
