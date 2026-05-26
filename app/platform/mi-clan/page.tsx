import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClanesPorProfileIds } from "@/lib/clanes";
import { MiClanView } from "./mi-clan-view";
import { MisSolicitudes } from "./mis-solicitudes";

export default async function MiClanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cargo todos los clanes del user (hasta 3) desde la junction.
  const clanesMap = await getClanesPorProfileIds(supabase, [user.id]);
  const misClanes = clanesMap.get(user.id) ?? [];

  // Sin clanes: muestro historial de solicitudes + CTAs
  if (!misClanes.length) {
    const { data: misSolicitudes } = await supabase
      .from("clan_requests")
      .select(
        "id, estado, mensaje, respuesta, created_at, resolved_at, clanes!inner(slug, nombre, color_hex)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="sect-label mb-2">Mis clanes</p>
          <h1 className="sect-title fluid-3xl">Todavía no tenés clan</h1>
          <p className="mt-3 text-ash fluid-sm">
            Uní a un clan existente o creá el tuyo. Podés estar en hasta 3
            clanes a la vez.
          </p>
        </div>
        <div className="flex gap-3 mb-8 flex-wrap">
          <Link
            href="/clanes"
            className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold"
          >
            Ver clanes
          </Link>
          <Link
            href="/clanes/nuevo"
            className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold"
          >
            + Crear clan
          </Link>
        </div>

        <MisSolicitudes
          solicitudes={(misSolicitudes ?? []).map((s) => {
            const c = Array.isArray(s.clanes) ? s.clanes[0] : s.clanes;
            return {
              id: s.id,
              estado: s.estado,
              mensaje: s.mensaje,
              respuesta: s.respuesta,
              created_at: s.created_at,
              resolved_at: s.resolved_at,
              clan: { slug: c?.slug ?? "", nombre: c?.nombre ?? "?", color_hex: c?.color_hex ?? null },
            };
          })}
        />
      </div>
    );
  }

  // Tengo clanes: cargo detalle de cada uno + miembros + solicitudes pendientes
  // si soy capitán.
  const clanIds = misClanes.map((c) => c.id);
  const [{ data: clanesFull }, { data: allMembership }] = await Promise.all([
    supabase
      .from("clanes")
      .select(
        "id, slug, nombre, descripcion, color_hex, logo_url, capitan_id, created_at",
      )
      .in("id", clanIds),
    supabase
      .from("profile_clanes")
      .select("clan_id, profiles!inner(id, nombre, apellido)")
      .in("clan_id", clanIds),
  ]);

  // Miembros agrupados por clan
  const miembrosPorClan = new Map<
    string,
    { id: string; nombre: string }[]
  >();
  for (const row of allMembership ?? []) {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!p) continue;
    const arr = miembrosPorClan.get(row.clan_id) ?? [];
    arr.push({ id: p.id, nombre: `${p.nombre} ${p.apellido}` });
    miembrosPorClan.set(row.clan_id, arr);
  }

  // Solicitudes pendientes para los clanes donde soy capitán
  const clanesDondeSoyCapitan = (clanesFull ?? []).filter(
    (c) => c.capitan_id === user.id,
  );
  const solicitudesPorClan = new Map<
    string,
    {
      id: string;
      mensaje: string | null;
      created_at: string;
      user: { id: string; nombre: string; apellido: string };
    }[]
  >();
  if (clanesDondeSoyCapitan.length) {
    const ids = clanesDondeSoyCapitan.map((c) => c.id);
    const { data: reqs } = await supabase
      .from("clan_requests")
      .select("id, mensaje, created_at, user_id, clan_id")
      .in("clan_id", ids)
      .eq("estado", "pendiente")
      .order("created_at");

    const userIds = (reqs ?? []).map((r) => r.user_id);
    const profilesById = new Map<string, { nombre: string; apellido: string }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nombre, apellido")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profilesById.set(p.id, { nombre: p.nombre, apellido: p.apellido });
      }
    }
    for (const r of reqs ?? []) {
      const list = solicitudesPorClan.get(r.clan_id) ?? [];
      list.push({
        id: r.id,
        mensaje: r.mensaje,
        created_at: r.created_at,
        user: {
          id: r.user_id,
          nombre: profilesById.get(r.user_id)?.nombre ?? "",
          apellido: profilesById.get(r.user_id)?.apellido ?? "",
        },
      });
      solicitudesPorClan.set(r.clan_id, list);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <p className="sect-label mb-2">Mis clanes</p>
        <h1 className="sect-title fluid-3xl">
          {misClanes.length === 1
            ? "Tu clan"
            : `Tus ${misClanes.length} clanes`}
        </h1>
        {misClanes.length < 3 && (
          <p className="mt-2 font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
            Te quedan {3 - misClanes.length}{" "}
            {3 - misClanes.length === 1 ? "lugar" : "lugares"} para más clanes.
          </p>
        )}
      </div>

      {(clanesFull ?? []).map((clan) => {
        const miembros = miembrosPorClan.get(clan.id) ?? [];
        const soyCapitan = clan.capitan_id === user.id;
        const solicitudes = solicitudesPorClan.get(clan.id) ?? [];
        return (
          <MiClanView
            key={clan.id}
            clan={{
              id: clan.id,
              slug: clan.slug,
              nombre: clan.nombre,
              descripcion: clan.descripcion,
              color_hex: clan.color_hex,
            }}
            userId={user.id}
            soyCapitan={soyCapitan}
            miembros={miembros.sort((a, b) => a.nombre.localeCompare(b.nombre))}
            capitanId={clan.capitan_id}
            solicitudes={solicitudes}
          />
        );
      })}
    </div>
  );
}
