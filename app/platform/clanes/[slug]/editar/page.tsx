import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditarClanForm } from "./editar-clan-form";

export default async function EditarClanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/clanes/${slug}/editar`);

  const { data: clan } = await supabase
    .from("clanes")
    .select(
      "id, slug, nombre, alias, descripcion, color_hex, logo_url, display_mode, youtube_url, instagram_url, capitan_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!clan) notFound();

  if (clan.capitan_id !== user.id) {
    redirect(`/clanes/${clan.slug}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/clanes/${clan.slug}`}
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Volver
      </Link>

      <div className="mt-4 mb-6">
        <p className="sect-label mb-2">Editar clan</p>
        <h1 className="sect-title fluid-3xl">{clan.nombre}</h1>
      </div>

      <EditarClanForm
        clan={{
          id: clan.id,
          slug: clan.slug,
          nombre: clan.nombre,
          alias: clan.alias ?? "",
          descripcion: clan.descripcion ?? "",
          color_hex: clan.color_hex ?? "#ff6b1a",
          logo_url: clan.logo_url ?? "",
          display_mode: (clan.display_mode as "alias" | "logo") ?? "alias",
          youtube_url: clan.youtube_url ?? "",
          instagram_url: clan.instagram_url ?? "",
        }}
      />
    </div>
  );
}
