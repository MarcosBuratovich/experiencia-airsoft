"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isAuthed: boolean;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  userLabel: string | null;
  solicitudesPendientes?: number;
};

type AdminLink = { href: string; label: string; subtitle?: string; badge?: number };

export function PlatformNav({
  isAuthed,
  isAdmin,
  isSuperAdmin,
  userLabel,
  solicitudesPendientes,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const adminBtnRef = useRef<HTMLButtonElement>(null);
  const adminPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar dropdowns al navegar
  useEffect(() => {
    setMobileOpen(false);
    setAdminOpen(false);
  }, [pathname]);

  // Click fuera / Esc → cerrar dropdown admin
  useEffect(() => {
    if (!adminOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        adminBtnRef.current &&
        !adminBtnRef.current.contains(t) &&
        adminPanelRef.current &&
        !adminPanelRef.current.contains(t)
      ) {
        setAdminOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAdminOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [adminOpen]);

  // Prevent body scroll cuando el drawer mobile esta abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    // Hard navigation: garantiza que el proxy se ejecute con cookies
    // limpias y que ningun Server Component cacheado del area autenticada
    // siga visible. router.push no fuerza esa request HTTP fresca.
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    } else {
      router.replace("/login");
    }
  };

  const pending = solicitudesPendientes ?? 0;

  const adminLinks: AdminLink[] = [
    { href: "/admin/partidas", label: "Partidas", subtitle: "Listas y check-in" },
    { href: "/admin/socios", label: "Socios", subtitle: "Cuotas y pagos" },
    { href: "/admin/usuarios", label: "Usuarios", subtitle: "Roles y búsqueda" },
    {
      href: "/admin/solicitudes",
      label: "Solicitudes",
      subtitle: "Partidas privadas",
      badge: pending,
    },
    { href: "/admin/eventos", label: "Eventos", subtitle: "Diagnóstico y carga manual" },
  ];
  const superLinks: AdminLink[] = isSuperAdmin
    ? [
        { href: "/admin/precios", label: "Precios", subtitle: "Config de entrada y alquiler" },
        { href: "/admin/templates", label: "Templates", subtitle: "Slots recurrentes" },
      ]
    : [];

  if (!isAuthed) {
    return (
      <nav className="flex items-center gap-4 font-mono fluid-xs uppercase tracking-[.2em]">
        <Link href="/login" className="text-bone hover:text-orange transition">
          Ingresar
        </Link>
        <Link href="/signup" className="btn-wa px-4 py-2 clip-tag text-ink">
          Crear cuenta
        </Link>
      </nav>
    );
  }

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-5 font-mono fluid-xs uppercase tracking-[.2em]">
        <NavLink href="/partidas" active={isSectionActive(pathname, "/partidas")} primary>
          Partidas
        </NavLink>
        <NavLink href="/ranking" active={isSectionActive(pathname, "/ranking")} primary>
          Ranking
        </NavLink>
        <NavLink href="/clanes" active={isSectionActive(pathname, "/clanes") || pathname === "/mi-clan"} primary>
          Clanes
        </NavLink>
        <NavLink href="/mis-solicitudes" active={isSectionActive(pathname, "/mis-solicitudes") || isSectionActive(pathname, "/privada")} primary>
          Privadas
        </NavLink>
        <NavLink href="/perfil" active={isSectionActive(pathname, "/perfil")} primary>
          Perfil
        </NavLink>

        {isAdmin && (
          <div className="relative">
            <button
              ref={adminBtnRef}
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={adminOpen}
              className={`flex items-center gap-2 transition cursor-pointer ${
                isSectionActive(pathname, "/admin")
                  ? "text-orange"
                  : "text-orange/85 hover:text-orange"
              }`}
            >
              <span>Admin</span>
              {pending > 0 && (
                <span className="min-w-[1.25rem] px-1.5 py-0.5 bg-orange text-ink font-mono text-[10px] leading-none tracking-normal rounded-sm">
                  {pending}
                </span>
              )}
              <svg
                width="10"
                height="7"
                viewBox="0 0 10 7"
                aria-hidden
                className={`transition-transform ${adminOpen ? "rotate-180" : ""}`}
              >
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square" />
              </svg>
            </button>

            {adminOpen && (
              <div
                ref={adminPanelRef}
                role="menu"
                className="absolute right-0 top-full mt-3 w-[300px] bg-carbon border border-orange/40 clip-notch shadow-[0_24px_70px_-20px_rgba(255,107,26,0.45)] z-50"
              >
                <div className="diag-lines-faint p-5">
                  <p className="sect-label mb-3">Operación</p>
                  <ul className="space-y-1">
                    {adminLinks.map((l) => (
                      <AdminMenuItem key={l.href} link={l} active={pathname === l.href || pathname.startsWith(l.href + "/")} />
                    ))}
                  </ul>
                  {superLinks.length > 0 && (
                    <>
                      <div className="my-4 h-px bg-rail/60" />
                      <p className="sect-label mb-3">Super · config</p>
                      <ul className="space-y-1">
                        {superLinks.map((l) => (
                          <AdminMenuItem key={l.href} link={l} active={pathname === l.href} />
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {userLabel && (
          <span className="text-smoke hidden lg:inline normal-case tracking-normal font-sans">
            {userLabel}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="text-smoke hover:text-orange transition cursor-pointer"
        >
          Salir
        </button>
      </nav>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-2 text-bone cursor-pointer"
        aria-label="Abrir menú"
      >
        {pending > 0 && (
          <span className="min-w-[1.25rem] px-1.5 py-0.5 bg-orange text-ink font-mono text-[10px] leading-none rounded-sm">
            {pending}
          </span>
        )}
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
          <rect width="22" height="2" fill="currentColor" />
          <rect y="6" width="22" height="2" fill="currentColor" />
          <rect y="12" width="22" height="2" fill="currentColor" />
        </svg>
      </button>

      {/* Mobile drawer — via portal a document.body para escapar al
          backdrop-blur del header que crea un containing block y atrapa
          el fixed positioning. */}
      {mobileOpen &&
        mounted &&
        createPortal(
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[min(22rem,90vw)] bg-carbon border-l border-orange/30 overflow-y-auto diag-lines-faint">
            <div className="p-5 flex items-center justify-between border-b border-rail/60">
              <span className="sect-label">Menú</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar"
                className="text-ash hover:text-orange transition cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-6">
              {userLabel && (
                <div>
                  <p className="sect-label mb-1">Sesión</p>
                  <p className="font-display fluid-base text-bone uppercase tracking-wider">
                    {userLabel}
                  </p>
                </div>
              )}

              <div>
                <p className="sect-label mb-2">Jugador</p>
                <ul className="space-y-1">
                  <MobileLink href="/partidas" label="Partidas" active={isSectionActive(pathname, "/partidas")} onNavigate={closeMobile} />
                  <MobileLink href="/ranking" label="Ranking" active={isSectionActive(pathname, "/ranking")} onNavigate={closeMobile} />
                  <MobileLink href="/clanes" label="Clanes" active={isSectionActive(pathname, "/clanes") || pathname === "/mi-clan"} onNavigate={closeMobile} />
                  <MobileLink
                    href="/mis-solicitudes"
                    label="Privadas"
                    active={isSectionActive(pathname, "/mis-solicitudes") || isSectionActive(pathname, "/privada")}
                    onNavigate={closeMobile}
                  />
                  <MobileLink
                    href="/perfil"
                    label="Perfil"
                    active={isSectionActive(pathname, "/perfil")}
                    onNavigate={closeMobile}
                  />
                </ul>
              </div>

              {isAdmin && (
                <div>
                  <p className="sect-label mb-2">Admin</p>
                  <ul className="space-y-1">
                    {adminLinks.map((l) => (
                      <MobileLink
                        key={l.href}
                        href={l.href}
                        label={l.label}
                        active={pathname === l.href || pathname.startsWith(l.href + "/")}
                        badge={l.badge}
                        onNavigate={closeMobile}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {superLinks.length > 0 && (
                <div>
                  <p className="sect-label mb-2">Super</p>
                  <ul className="space-y-1">
                    {superLinks.map((l) => (
                      <MobileLink
                        key={l.href}
                        href={l.href}
                        label={l.label}
                        active={pathname === l.href}
                        onNavigate={closeMobile}
                      />
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-rail/60">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left font-mono fluid-xs uppercase tracking-[.22em] text-smoke hover:text-orange transition cursor-pointer py-2"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}

function NavLink({
  href,
  children,
  active,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  primary?: boolean;
}) {
  const base = primary ? "text-bone hover:text-orange" : "text-orange hover:text-bone";
  return (
    <Link href={href} className={`transition ${active ? "text-orange" : base}`}>
      {children}
    </Link>
  );
}

function AdminMenuItem({ link, active }: { link: AdminLink; active: boolean }) {
  return (
    <li>
      <Link
        href={link.href}
        role="menuitem"
        className={`group flex items-center justify-between gap-3 px-3 py-2 transition ${
          active
            ? "bg-orange/10 border-l-2 border-orange text-bone"
            : "border-l-2 border-transparent hover:border-orange/60 hover:bg-ink/40"
        }`}
      >
        <div className="min-w-0">
          <p
            className={`font-display uppercase tracking-wider text-[0.95rem] ${
              active ? "text-orange" : "text-bone group-hover:text-orange"
            }`}
          >
            {link.label}
          </p>
          {link.subtitle && (
            <p className="font-mono text-[10px] text-smoke uppercase tracking-[.2em] mt-0.5">
              {link.subtitle}
            </p>
          )}
        </div>
        {!!link.badge && link.badge > 0 && (
          <span className="min-w-[1.5rem] px-2 py-0.5 bg-orange text-ink font-mono text-[10px] tracking-normal rounded-sm">
            {link.badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function MobileLink({
  href,
  label,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  /** Se llama en cada click, incluso si el href apunta a la página actual.
   * Sirve para cerrar el drawer cuando el usuario clickea la tab activa
   * (clickear el mismo href no dispara el useEffect de pathname). */
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center justify-between py-2 px-3 border-l-2 transition ${
          active
            ? "border-orange bg-orange/10 text-orange"
            : "border-transparent text-bone hover:border-orange/60 hover:text-orange"
        }`}
      >
        <span className="font-display uppercase tracking-wider text-[1.05rem]">{label}</span>
        {!!badge && badge > 0 && (
          <span className="min-w-[1.5rem] px-2 py-0.5 bg-orange text-ink font-mono text-[10px] tracking-normal rounded-sm">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function isSectionActive(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}
