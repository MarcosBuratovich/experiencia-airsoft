import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PRECIOS_DEFAULT,
  PRECIOS_KEYS_ORDER,
  PRECIOS_LABELS,
  type PreciosConfig,
  type PreciosKey,
} from "@/lib/precios";
import { PreciosForm } from "./precios-form";

export default async function PreciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") {
    redirect("/admin/partidas");
  }

  const { data: rows } = await supabase
    .from("precios_config")
    .select("key, valor, updated_at");

  const precios: PreciosConfig = { ...PRECIOS_DEFAULT };
  const updatedAt: Partial<Record<PreciosKey, string>> = {};
  for (const row of (rows ?? []) as { key: string; valor: number; updated_at: string }[]) {
    if (row.key in precios) {
      precios[row.key as PreciosKey] = row.valor;
      updatedAt[row.key as PreciosKey] = row.updated_at;
    }
  }

  const items = PRECIOS_KEYS_ORDER.map((key) => ({
    key,
    valor: precios[key],
    updated_at: updatedAt[key] ?? null,
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
