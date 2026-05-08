import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardClanes } from "@/lib/ranking";

export default async function ClanesRankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows = await getLeaderboardClanes(supabase);

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/clanes"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Clanes
      </Link>

      <div className="mt-4 mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="sect-label mb-2">Comunidad · all-time</p>
          <h1 className="sect-title fluid-3xl">Ranking de clanes</h1>
        </div>
        <Link
          href="/ranking"
          className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs"
        >
          Ranking individual →
        </Link>
      </div>

      {!rows.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Todavía ningún clan tiene stats. Cuando los miembros de un clan
            empiecen a sumar eventos, el clan aparece acá.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c, i) => (
            <li
              key={c.clan_id}
              className={`border ${
                i < 3 && c.score > 0
                  ? "border-orange/60 bg-orange/5"
                  : "border-rail/60 bg-carbon"
              } clip-notch p-4 sm:p-5`}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="font-display fluid-2xl text-smoke shrink-0 w-10">
                  #{i + 1}
                </span>
                <span
                  className="inline-block w-8 h-8 rounded-full border border-rail/60 shrink-0"
                  style={{ backgroundColor: c.color_hex ?? "#666" }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/clanes/${c.slug}`}
                    className="font-display fluid-xl uppercase tracking-wider text-bone hover:text-orange transition truncate block"
                  >
                    {c.clan_nombre}
                  </Link>
                  <p className="font-mono fluid-xs text-smoke uppercase tracking-[.18em] mt-0.5">
                    {c.miembros_activos}{" "}
                    {c.miembros_activos === 1 ? "miembro activo" : "miembros activos"}{" "}
                    · {c.partidas_jugadas}{" "}
                    {c.partidas_jugadas === 1 ? "partida" : "partidas"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="sect-label mb-1">Score</p>
                  <p className="font-display fluid-2xl text-orange leading-none">
                    {c.score}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-rail/40 grid grid-cols-4 gap-2 text-center">
                <Mini label="Capt." value={c.capturas} />
                <Mini label="Reanim." value={c.reanimaciones} />
                <Mini label="Plant." value={c.plantos} />
                <Mini label="Muertes" value={c.muertes} muted />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 font-mono fluid-xs text-smoke uppercase tracking-[.22em]">
        // Score = capturas×3 + reanimaciones×2 + plantos×5 − muertes
      </p>
    </div>
  );
}

function Mini({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="sect-label mb-0.5">{label}</p>
      <p className={`font-display fluid-lg ${muted ? "text-smoke" : "text-bone"}`}>
        {value}
      </p>
    </div>
  );
}
