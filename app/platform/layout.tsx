import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlatformNav } from "./platform-nav";

export const metadata: Metadata = {
  title: "Experiencia Airsoft — Plataforma",
  description: "Reservas, listas semanales y gestión interna.",
  robots: { index: false, follow: false },
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { nombre: string; apellido: string; role: string } | null = null;
  let solicitudesPendientes = 0;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nombre, apellido, role")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;

    if (profile?.role === "admin" || profile?.role === "super_admin") {
      const { count } = await supabase
        .from("solicitudes_privada")
        .select("*", { count: "exact", head: true })
        .eq("estado", "pendiente");
      solicitudesPendientes = count ?? 0;
    }
  }

  return (
    <div className="min-h-dvh bg-ink text-bone">
      <header className="sticky top-0 z-40 border-b border-rail/60 bg-carbon/85 backdrop-blur">
        <div className="fluid-gutter-x flex items-center justify-between py-4">
          <Link href="/" className="font-display fluid-lg uppercase tracking-wider text-bone">
            Experiencia <span className="text-orange">Airsoft</span>
          </Link>
          <PlatformNav
            isAuthed={!!user}
            isAdmin={profile?.role === "admin" || profile?.role === "super_admin"}
            isSuperAdmin={profile?.role === "super_admin"}
            userLabel={profile ? `${profile.nombre} ${profile.apellido}` : null}
            solicitudesPendientes={solicitudesPendientes}
          />
        </div>
      </header>
      <main className="fluid-gutter-x py-10">{children}</main>
    </div>
  );
}
