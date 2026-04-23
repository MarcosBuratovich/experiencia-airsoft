"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isAuthed: boolean;
  isAdmin: boolean;
  userLabel: string | null;
};

export function PlatformNav({ isAuthed, isAdmin, userLabel }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <nav className="flex items-center gap-5 font-mono fluid-xs uppercase tracking-[.2em]">
      {isAuthed ? (
        <>
          <Link href="/partidas" className="text-bone hover:text-orange transition">
            Partidas
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin/partidas" className="text-orange hover:text-bone transition">
                Partidas · Admin
              </Link>
              <Link href="/admin/socios" className="text-orange hover:text-bone transition">
                Socios
              </Link>
              <Link href="/admin/usuarios" className="text-orange hover:text-bone transition">
                Usuarios
              </Link>
            </>
          )}
          {userLabel && <span className="text-smoke hidden sm:inline">{userLabel}</span>}
          <button
            type="button"
            onClick={handleLogout}
            className="text-smoke hover:text-orange transition cursor-pointer"
          >
            Salir
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="text-bone hover:text-orange transition">
            Ingresar
          </Link>
          <Link href="/signup" className="btn-wa px-4 py-2 clip-tag text-ink">
            Crear cuenta
          </Link>
        </>
      )}
    </nav>
  );
}
