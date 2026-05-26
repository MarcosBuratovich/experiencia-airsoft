import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClanesRankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/clanes"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Clanes
      </Link>

      <div className="mt-4 mb-6">
        <p className="sect-label mb-2">Comunidad · all-time</p>
        <h1 className="sect-title fluid-3xl">Ranking de clanes</h1>
      </div>

      <div className="border border-orange/40 bg-orange/5 clip-notch p-6 sm:p-8 text-center">
        <p className="sect-label mb-2 text-orange">// En desarrollo</p>
        <h2 className="font-display fluid-2xl uppercase tracking-wider text-bone mb-3">
          Próximamente
        </h2>
        <p className="text-ash fluid-sm leading-relaxed max-w-md mx-auto">
          Estamos terminando el sistema interno de scoring de la cancha.
          Cuando esté listo, vas a ver acá el leaderboard de clanes con sus
          stats acumuladas.
        </p>
      </div>
    </div>
  );
}
