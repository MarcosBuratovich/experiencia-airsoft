import { createClient } from "@/lib/supabase/server";
import { UsuariosList } from "./usuarios-list";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(
      "id, nombre, apellido, email, dni, celular, player_number, role, socio, socio_desde, cuota_mensual, created_at",
    )
    .order("apellido");

  if (q.trim()) {
    const needle = q.trim();
    query = query.or(
      `nombre.ilike.%${needle}%,apellido.ilike.%${needle}%,dni.ilike.%${needle}%,email.ilike.%${needle}%,player_number.eq.${needle}`,
    );
  }

  const { data: usuarios } = await query.limit(200);

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · gente</p>
        <h1 className="sect-title fluid-3xl">Usuarios</h1>
      </div>

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, DNI, email o número…"
          className="w-full sm:max-w-md bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none"
        />
      </form>

      <UsuariosList usuarios={usuarios ?? []} />
    </div>
  );
}
