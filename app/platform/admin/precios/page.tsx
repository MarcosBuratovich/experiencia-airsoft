import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPreciosConfig,
  PRECIOS_KEYS_ORDER,
  PRECIOS_LABELS,
} from "@/lib/precios";
import { PreciosForm } from "./precios-form";

export default async function PreciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/precios");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") {
    redirect("/admin/partidas");
  }

  // getPreciosConfig ya resuelve dual + fallback si falta la migración.
  const precios = await getPreciosConfig(supabase);
  const { data: metaRows } = await supabase
    .from("precios_config")
    .select("key, updated_at");
  const updatedAt = new Map<string, string>();
  for (const row of (metaRows ?? []) as { key: string; updated_at: string }[]) {
    updatedAt.set(row.key, row.updated_at);
  }

  const items = PRECIOS_KEYS_ORDER.map((key) => ({
    key,
    efectivo: precios[key].efectivo,
    transferencia: precios[key].transferencia,
    updated_at: updatedAt.get(key) ?? null,
    titulo: PRECIOS_LABELS[key].titulo,
    descripcion: PRECIOS_LABELS[key].descripcion,
  }));

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · super</p>
        <h1 className="sect-title fluid-3xl">Precios</h1>
      </div>

      <div className="mb-6 border border-orange/40 bg-orange/5 clip-notch fluid-card">
        <p className="font-mono fluid-xs uppercase tracking-[.25em] text-orange mb-1">Aviso</p>
        <p className="text-ash fluid-sm">
          Los cambios aplican sólo a inscripciones nuevas. Los jugadores ya
          anotados mantienen el precio que tenían al momento de anotarse.
        </p>
      </div>

      <PreciosForm items={items} />
    </div>
  );
}
