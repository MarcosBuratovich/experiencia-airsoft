import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ranking");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="sect-label mb-2">Comunidad</p>
        <h1 className="sect-title fluid-3xl">Ranking individual</h1>
      </div>

      <div className="border border-orange/40 bg-orange/5 clip-notch p-6 sm:p-8 text-center">
        <p className="sect-label mb-2 text-orange">// En desarrollo</p>
        <h2 className="font-display fluid-2xl uppercase tracking-wider text-bone mb-3">
          Próximamente
        </h2>
        <p className="text-ash fluid-sm leading-relaxed max-w-md mx-auto">
          Estamos terminando el sistema interno de scoring de la cancha.
          Cuando esté listo, vas a ver acá las stats de cada jugador (capturas,
          reanimaciones, plantos, eliminaciones) y el leaderboard en tiempo
          real.
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/partidas"
          className="font-mono fluid-xs uppercase tracking-[.25em] text-smoke hover:text-orange transition"
        >
          ← Volver a partidas
        </Link>
      </div>
    </div>
  );
}
