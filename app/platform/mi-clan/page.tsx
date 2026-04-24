import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MiClanView } from "./mi-clan-view";
import { MisSolicitudes } from "./mis-solicitudes";

export default async function MiClanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clan_id")
    .eq("id", user.id)
    .maybeSingle();

  // Si no tengo clan, muestro historial de solicitudes + CTA para ir al directorio
  if (!profile?.clan_id) {
    const { data: misSolicitudes } = await supabase
      .from("clan_requests")
      .select("id, estado, mensaje, respuesta, created_at, resolved_at, clanes!inner(slug, nombre, color_hex)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="sect-label mb-2">Mi clan</p>
          <h1 className="sect-title fluid-3xl">Todavía no tenés clan</h1>
          <p className="mt-3 text-ash fluid-sm">
            Uní a un clan existente o creá el tuyo. Los clanes siempre juegan
            en el mismo bando (rojo o amarillo) el día de la partida.
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

  // Tengo clan: cargo detalle, miembros, y si soy capitán las solicitudes pendientes
  const { data: clan } = await supabase
    .from("clanes")
    .select("id, slug, nombre, descripcion, color_hex, logo_url, capitan_id, created_at")
    .eq("id", profile.clan_id)
    .maybeSingle();

  if (!clan) redirect("/clanes");

  const { data: miembros } = await supabase
    .from("profiles")
    .select("id, nombre, apellido")
    .eq("clan_id", clan.id)
    .order("apellido");

  const soyCapitan = clan.capitan_id === user.id;

  let solicitudesPendientes: {
    id: string;
    mensaje: string | null;
    created_at: string;
    user: { id: string; nombre: string; apellido: string };
  }[] = [];
  if (soyCapitan) {
    const { data: reqs } = await supabase
      .from("clan_requests")
      .select("id, mensaje, created_at, profiles!clan_requests_user_id_fkey(id, nombre, apellido)")
      .eq("clan_id", clan.id)
      .eq("estado", "pendiente")
      .order("created_at");

    solicitudesPendientes = (reqs ?? []).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id,
        mensaje: r.mensaje,
        created_at: r.created_at,
        user: {
          id: p?.id ?? "",
          nombre: p?.nombre ?? "",
          apellido: p?.apellido ?? "",
        },
      };
    });
  }

  return (
    <MiClanView
      clan={{
        id: clan.id,
        slug: clan.slug,
        nombre: clan.nombre,
        descripcion: clan.descripcion,
        color_hex: clan.color_hex,
      }}
      userId={user.id}
      soyCapitan={soyCapitan}
      miembros={(miembros ?? []).map((m) => ({
        id: m.id,
        nombre: `${m.nombre} ${m.apellido}`,
      }))}
      capitanId={clan.capitan_id}
      solicitudes={solicitudesPendientes}
    />
  );
}
