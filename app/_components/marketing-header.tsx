import Link from "next/link";
import { WHATSAPP_URL } from "./site-constants";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/", label: "Inicio" },
  { href: "/precios", label: "Precios" },
  { href: "/buenos-aires", label: "Buenos Aires" },
  { href: "/primera-vez", label: "Primera vez" },
];

export function MarketingHeader({ activeHref }: { activeHref?: string }) {
  return (
    <header className="sticky top-0 z-50 bg-ink/85 backdrop-blur border-b border-bone/10">
      <div className="max-w-[1400px] mx-auto fluid-gutter-x flex items-center justify-between gap-4 py-3">
        <Link
          href="/"
          aria-label="Experiencia Airsoft — inicio"
          className="flex items-center gap-3 shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/00_logo_cropped.png"
            alt="Logo Experiencia Airsoft"
            width={840}
            height={240}
            className="h-9 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 font-mono fluid-xs tracking-[.22em] uppercase text-ash">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-bone ${
                activeHref === item.href ? "text-orange" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener"
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider font-semibold text-ink fluid-xs"
        >
          Reservar
        </a>
      </div>

      <nav className="md:hidden border-t border-bone/10">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x flex items-center gap-4 overflow-x-auto py-2 font-mono fluid-xs tracking-[.22em] uppercase text-ash whitespace-nowrap">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-bone shrink-0 ${
                activeHref === item.href ? "text-orange" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
