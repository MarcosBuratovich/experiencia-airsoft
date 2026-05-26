import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "./_components/marketing-header";
import { MarketingFooter } from "./_components/marketing-footer";

export const metadata: Metadata = {
  title: "Página no encontrada (404)",
  description:
    "La página que buscás no existe o fue movida. Volvé al inicio o mirá las partidas abiertas de esta semana.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-ink text-bone flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-3xl mx-auto fluid-gutter-x py-20 sm:py-28 text-center">
        <p className="sect-label text-orange mb-3">// Error 404</p>
        <h1 className="font-display fluid-5xl uppercase text-bone leading-[.9] tracking-wider">
          Esta página
          <br />
          <span className="text-orange">no existe</span>
        </h1>
        <p className="mt-8 text-ash fluid-lg leading-relaxed max-w-[40ch] mx-auto">
          Puede que la URL esté mal escrita o que la página haya cambiado de
          lugar. No te preocupes — abajo tenés cómo seguir.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-wa clip-notch inline-flex items-center gap-3 px-7 py-4 fluid-xs tracking-[.22em] uppercase font-semibold text-ink"
          >
            Ir al inicio
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/precios"
            className="btn-ghost clip-notch inline-flex items-center gap-3 px-7 py-4 fluid-xs tracking-[.22em] uppercase"
          >
            Ver precios
          </Link>
        </div>

        <div className="mt-16 pt-10 border-t border-bone/10">
          <p className="sect-label mb-5">// Quizás te interesa</p>
          <ul className="grid sm:grid-cols-2 gap-3 text-left">
            <NotFoundLink
              href="/buenos-aires"
              title="Cómo llegar"
              desc="Dirección, transporte público y estacionamiento."
            />
            <NotFoundLink
              href="/primera-vez"
              title="Es mi primera vez"
              desc="Qué llevar, cómo se juega, reglas básicas."
            />
            <NotFoundLink
              href="/cumpleanos"
              title="Cumpleaños"
              desc="Festejá tu cumple con airsoft."
            />
            <NotFoundLink
              href="/blog"
              title="Blog"
              desc="Guías, equipamiento, reglas."
            />
          </ul>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

function NotFoundLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block border border-bone/10 bg-carbon hover:border-orange transition clip-notch p-4"
      >
        <p className="font-display fluid-base uppercase tracking-wider text-bone">
          {title} →
        </p>
        <p className="mt-1 font-sans fluid-sm text-ash">{desc}</p>
      </Link>
    </li>
  );
}
