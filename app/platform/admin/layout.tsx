import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Role = "admin" | "super_admin";

const NAV_ITEMS: { href: string; label: string; superOnly?: boolean }[] = [
  { href: "/admin/partidas", label: "Partidas" },
  { href: "/admin/socios", label: "Socios" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/precios", label: "Precios", superOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/partidas");
  }

  const role = profile.role as Role;
  const visibleItems = NAV_ITEMS.filter((i) => !i.superOnly || role === "super_admin");

  return (
    <div className="max-w-5xl mx-auto">
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-rail/40 pb-3">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="font-mono fluid-xs uppercase tracking-[.25em] px-3 py-1.5 text-ash hover:text-orange transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
