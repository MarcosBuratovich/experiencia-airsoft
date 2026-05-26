import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClanesDirectorio() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: miCantClanes } = await supabase
    .from("profile_clanes")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const { data: clanes } = await supabase
    .from("clanes")
    .select("id, slug, nombre, descripcion, color_hex, logo_url, capitan_id")
    .order("created_at", { ascending: false });

  const clanIds = (clanes ?? []).map((c) => c.id);
  const memberCounts = new Map<string, number>();
  if (clanIds.length) {
    const { data: counts } = await supabase
      .from("profile_clanes")
      .select("clan_id")
      .in("clan_id", clanIds);
    for (const row of counts ?? []) {
      memberCounts.set(row.clan_id, (memberCounts.get(row.clan_id) ?? 0) + 1);
    }
  }
  const tengoAlgunClan = (miCantClanes ?? 0) > 0;
  const llenoDeClanes = (miCantClanes ?? 0) >= 3;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="sect-label mb-2">Comunidad</p>
          <h1 className="sect-title fluid-3xl">Clanes</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/clanes/ranking"
            className="font-mono fluid-xs uppercase tracking-[.22em] text-orange hover:underline"
          >
            Ranking →
          </Link>
          {tengoAlgunClan && (
            <Link
              href="/mi-clan"
              className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold cursor-pointer"
            >
              Mis clanes →
            </Link>
          )}
          {!llenoDeClanes && (
            <Link
              href="/clanes/nuevo"
              className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold cursor-pointer"
            >
              + Crear clan
            </Link>
          )}
        </div>
      </div>

      {!clanes?.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Todavía no hay clanes. Creá el primero.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clanes.map((c) => {
            const count = memberCounts.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/clanes/${c.slug}`}
                className="border border-rail/60 bg-carbon clip-notch p-5 hover:border-orange transition flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <Image
                      src={c.logo_url}
                      alt={c.nombre}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border border-rail/60 shrink-0"
                    />
                  ) : (
                    <span
                      className="inline-block w-10 h-10 rounded-full border border-rail/60 shrink-0"
                      style={{ backgroundColor: c.color_hex ?? "#666" }}
                      aria-hidden
                    />
                  )}
                  <span className="font-display text-bone uppercase tracking-wider">{c.nombre}</span>
                </div>
                {c.descripcion && (
                  <p className="text-ash fluid-sm line-clamp-2">{c.descripcion}</p>
                )}
                <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em] mt-auto">
                  {count} {count === 1 ? "miembro" : "miembros"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
