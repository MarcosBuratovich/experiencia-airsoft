import type { Metadata } from "next";
import Image from "next/image";
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
        <div className="fluid-gutter-x flex items-center justify-between gap-3 py-3 sm:py-4">
          <Link
            href="/"
            aria-label="Experiencia Airsoft — inicio"
            className="flex items-center shrink-0"
          >
            <Image
              src="/img/00_logo_cropped.png"
              alt="Logo Experiencia Airsoft"
              width={840}
              height={240}
              priority
              className="h-8 sm:h-9 w-auto"
            />
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
      <main className="fluid-gutter-x py-6 sm:py-10">{children}</main>
    </div>
  );
}
